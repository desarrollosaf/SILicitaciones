import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Memo, MemoAllocation, Partida } from '../../entities';
import { PeriodsService } from '../periods/periods.service';
import { StockService } from '../stock/stock.service';
import { CreateMemoDto, UpdateMemoDto } from './memo.dto';

@Injectable()
export class MemosService {
  constructor(
    @InjectRepository(Memo) private readonly memos: Repository<Memo>,
    @InjectRepository(Partida) private readonly partidas: Repository<Partida>,
    private readonly periods: PeriodsService,
    private readonly stock: StockService,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(periodId: string) {
    const memos = await this.memos.find({
      where: { periodId },
      relations: { licitacion: true },
      order: { date: 'DESC' },
    });
    return memos.map((memo) => this.decorate(memo));
  }

  async findOne(id: string) {
    const memo = await this.memos.findOne({ where: { id }, relations: { licitacion: true } });
    if (!memo) throw new NotFoundException('El memorándum no existe.');
    return this.decorate(memo);
  }

  /**
   * Folio consecutivo por periodo. Se calcula dentro de una transacción para
   * que dos capturas simultáneas no obtengan el mismo número.
   */
  async nextFolio(periodId: string) {
    const period = await this.periods.findOne(periodId);
    const rows = await this.memos.find({ where: { periodId }, select: { folio: true } });
    const numbers = rows.map((row) => Number(String(row.folio).match(/^(\d+)\//)?.[1] ?? 0));
    const next = Math.max(0, ...numbers) + 1;
    return `${String(next).padStart(3, '0')}/${period.year}`;
  }

  async create(dto: CreateMemoDto) {
    await this.periods.assertOpen(dto.periodId);
    await this.validate(dto);

    return this.dataSource.transaction(async (manager) => {
      const memo = manager.create(Memo, {
        periodId: dto.periodId,
        licitacionId: dto.licitacionId,
        folio: dto.folio?.trim() || (await this.nextFolio(dto.periodId)),
        date: dto.date,
        recipient: dto.recipient ?? 'Martha Maldonado Vilchis',
        status: dto.status ?? 'Enviado',
        allocations: dto.allocations.map((allocation) => manager.create(MemoAllocation, allocation)),
      });
      const saved = await manager.save(memo);
      return this.findOne(saved.id);
    });
  }

  async update(id: string, dto: UpdateMemoDto) {
    const memo = await this.memos.findOne({ where: { id } });
    if (!memo) throw new NotFoundException('El memorándum no existe.');
    await this.periods.assertOpen(memo.periodId);
    if (memo.status === 'Entregado') {
      throw new BadRequestException('Un memorándum entregado ya no puede modificarse.');
    }
    await this.validate({ ...dto, periodId: memo.periodId, licitacionId: dto.licitacionId ?? memo.licitacionId }, id);

    return this.dataSource.transaction(async (manager) => {
      await manager.delete(MemoAllocation, { memoId: id });
      Object.assign(memo, {
        licitacionId: dto.licitacionId ?? memo.licitacionId,
        date: dto.date ?? memo.date,
        recipient: dto.recipient ?? memo.recipient,
        status: dto.status ?? memo.status,
        allocations: dto.allocations.map((allocation) => manager.create(MemoAllocation, { ...allocation, memoId: id })),
      });
      await manager.save(memo);
      return this.findOne(id);
    });
  }

  /** Al borrar, las cantidades vuelven a estar disponibles en bodega. */
  async remove(id: string) {
    const memo = await this.memos.findOne({ where: { id } });
    if (!memo) throw new NotFoundException('El memorándum no existe.');
    await this.periods.assertOpen(memo.periodId);
    const released = (memo.allocations ?? []).reduce((sum, allocation) => sum + allocation.quantity, 0);
    await this.memos.remove(memo);
    return { deleted: true, released };
  }

  /** Estructura lista para imprimir: una fila por partida con sus resguardatarios. */
  async printable(id: string) {
    const memo = await this.findOne(id);
    const grouped = new Map<string, { partidaId: string; description: string; brand: string; quantity: number; people: { name: string; area: string; quantity: number }[] }>();
    memo.allocations.forEach((allocation) => {
      const key = allocation.partidaId;
      const row = grouped.get(key) ?? {
        partidaId: key,
        description: allocation.partida?.description ?? 'Partida no disponible',
        brand: allocation.partida?.brand ?? '',
        quantity: 0,
        people: [],
      };
      row.quantity += allocation.quantity;
      row.people.push({ name: allocation.person?.name ?? '', area: allocation.person?.area ?? '', quantity: allocation.quantity });
      grouped.set(key, row);
    });
    const areas = [...new Set(memo.allocations.map((allocation) => allocation.person?.area).filter(Boolean))];
    return { memo, rows: [...grouped.values()], areas };
  }

  private async validate(dto: Partial<CreateMemoDto>, omittedMemoId?: string) {
    const allocations = dto.allocations ?? [];
    if (!allocations.length) throw new BadRequestException('Agrega al menos una partida y una persona resguardataria.');

    const partidaIds = [...new Set(allocations.map((allocation) => allocation.partidaId))];
    const partidas = await this.partidas.find({ where: partidaIds.map((id) => ({ id })) });
    const byId = new Map<string, Partida>(partidas.map((partida) => [partida.id, partida]));

    for (const id of partidaIds) {
      const partida = byId.get(id);
      if (!partida) throw new BadRequestException('Una de las partidas seleccionadas ya no existe.');
      if (partida.licitacionId !== dto.licitacionId) {
        throw new BadRequestException('Todas las partidas deben pertenecer al procedimiento seleccionado.');
      }
      if (partida.result !== 'Adjudicada' || partida.unit === 'Servicio' || !partida.warehouseId || !partida.deliveryDate) {
        throw new BadRequestException(
          `La partida ${partida.number} aún no puede salir de bodega: revisa resultado, unidad, bodega y fecha de entrega real.`,
        );
      }
    }

    if (dto.status === 'Cancelado' || dto.status === 'Borrador') return;

    const committed = await this.stock.committedByPartida(partidaIds, omittedMemoId);
    for (const id of partidaIds) {
      const partida = byId.get(id);
      const requested = allocations.filter((allocation) => allocation.partidaId === id).reduce((sum, allocation) => sum + allocation.quantity, 0);
      const available = Math.max(0, partida.quantity - (committed.get(id) ?? 0));
      if (requested > available) {
        throw new BadRequestException(`La partida ${partida.number} solo tiene ${available} unidad(es) disponibles.`);
      }
    }
  }

  private decorate(memo: Memo) {
    const allocations = memo.allocations ?? [];
    return {
      ...memo,
      partidasCount: new Set(allocations.map((allocation) => allocation.partidaId)).size,
      quantity: allocations.reduce((sum, allocation) => sum + allocation.quantity, 0),
    };
  }
}
