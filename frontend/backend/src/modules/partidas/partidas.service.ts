import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Holiday, Licitacion, MemoAllocation, Partida } from '../../entities';
import { PeriodsService } from '../periods/periods.service';
import { StockService } from '../stock/stock.service';
import { addDays, businessDistance, todayISO } from '../../common/dates';
import { CreatePartidaDto, UpdatePartidaDto } from './partida.dto';

export interface DeliveryState {
  label: string;
  tone: 'gray' | 'green' | 'amber' | 'red' | 'blue';
  rank: number;
}

export interface PartidaView extends Partida {
  procedureNumber: string;
  warehouseName: string;
  dueDate: string;
  delivery: DeliveryState;
  committed: number;
  available: number;
  subtotal: number;
  total: number;
  /** Motivo por el que la partida no puede incluirse en un memorándum. */
  blockedReason: string;
}

@Injectable()
export class PartidasService {
  constructor(
    @InjectRepository(Partida) private readonly partidas: Repository<Partida>,
    @InjectRepository(Licitacion) private readonly licitaciones: Repository<Licitacion>,
    @InjectRepository(Holiday) private readonly holidays: Repository<Holiday>,
    @InjectRepository(MemoAllocation) private readonly allocations: Repository<MemoAllocation>,
    private readonly periods: PeriodsService,
    private readonly stock: StockService,
  ) {}

  private async holidaySet() {
    const rows = await this.holidays.find();
    return new Set<string>(rows.map((row) => String(row.date).slice(0, 10)));
  }

  /** Listado enriquecido: fecha compromiso, semáforo y existencias. */
  async findAll(periodId: string, licitacionId?: string): Promise<PartidaView[]> {
    const where: any = { licitacion: { periodId } };
    if (licitacionId) where.licitacionId = licitacionId;
    const partidas = await this.partidas.find({ where, relations: { licitacion: true, warehouse: true }, order: { number: 'ASC' } });
    const holidays = await this.holidaySet();
    const committed = await this.stock.committedByPartida(partidas.map((partida) => partida.id));

    return partidas.map((partida) => this.decorate(partida, committed.get(partida.id) ?? 0, holidays));
  }

  async findOne(id: string) {
    const partida = await this.partidas.findOne({ where: { id }, relations: { licitacion: true, warehouse: true } });
    if (!partida) throw new NotFoundException('La partida no existe.');
    const holidays = await this.holidaySet();
    return this.decorate(partida, await this.stock.committed(id), holidays);
  }

  /** Partidas que sí pueden salir de bodega, para el formulario de memorándum. */
  async availableForMemo(periodId: string, licitacionId?: string, omittedMemoId?: string) {
    const rows = await this.findAll(periodId, licitacionId);
    if (omittedMemoId) {
      const committed = await this.stock.committedByPartida(rows.map((row) => row.id), omittedMemoId);
      const holidays = await this.holidaySet();
      const recalculated = rows.map((row) => this.decorate(row, committed.get(row.id) ?? 0, holidays));
      return recalculated.filter((row) => !row.blockedReason);
    }
    return rows.filter((row) => !row.blockedReason);
  }

  async create(dto: CreatePartidaDto) {
    const licitacion = await this.requireLicitacion(dto.licitacionId);
    await this.periods.assertOpen(licitacion.periodId);
    const partida = this.partidas.create({
      ...dto,
      fallDate: dto.fallDate ?? licitacion.fallDate,
      attachments: dto.attachments ?? [],
    });
    return this.partidas.save(partida);
  }

  async update(id: string, dto: UpdatePartidaDto) {
    const partida = await this.partidas.findOne({ where: { id }, relations: { licitacion: true } });
    if (!partida) throw new NotFoundException('La partida no existe.');
    await this.periods.assertOpen(partida.licitacion.periodId);

    const committed = await this.stock.committed(id);
    const next = { ...partida, ...dto };
    if (committed) {
      if (next.result !== 'Adjudicada' || next.unit === 'Servicio' || next.quantity < committed || !next.deliveryDate) {
        throw new BadRequestException(
          `La partida tiene ${committed} bien(es) comprometidos en memorándums vigentes. Conserva una cantidad igual o mayor, la fecha de recepción y el resultado adjudicado.`,
        );
      }
      if (next.licitacionId !== partida.licitacionId || next.warehouseId !== partida.warehouseId) {
        throw new BadRequestException('No se puede cambiar el procedimiento ni la bodega de una partida comprometida.');
      }
    }

    Object.assign(partida, dto);
    await this.partidas.save(partida);
    return this.findOne(id);
  }

  async remove(id: string) {
    const partida = await this.partidas.findOne({ where: { id }, relations: { licitacion: true } });
    if (!partida) throw new NotFoundException('La partida no existe.');
    await this.periods.assertOpen(partida.licitacion.periodId);

    const committed = await this.stock.committed(id);
    if (committed) {
      throw new BadRequestException(
        `No se puede eliminar: la partida tiene ${committed} bien(es) comprometidos en memorándums vigentes.`,
      );
    }
    await this.allocations.delete({ partidaId: id });
    await this.partidas.remove(partida);
    return { deleted: true };
  }

  private async requireLicitacion(id: string) {
    const licitacion = await this.licitaciones.findOne({ where: { id } });
    if (!licitacion) throw new BadRequestException('El procedimiento indicado no existe.');
    return licitacion;
  }

  private decorate(partida: Partida & Partial<PartidaView>, committed: number, holidays: Set<string>): PartidaView {
    const licitacion = partida.licitacion;
    const dueDate =
      partida.result === 'Adjudicada' && partida.contractDate
        ? addDays(String(partida.contractDate).slice(0, 10), licitacion?.deliveryDays ?? 0, licitacion?.dayType === 'business', holidays)
        : '';
    const quantity = partida.result === 'Adjudicada' && partida.unit !== 'Servicio' ? partida.quantity : 0;
    const available = Math.max(0, quantity - committed);
    const subtotal = partida.quantity * partida.unitPrice;

    return {
      ...partida,
      procedureNumber: licitacion?.number ?? '',
      warehouseName: partida.warehouse?.name ?? '',
      dueDate,
      delivery: this.deliveryState(partida, dueDate, holidays),
      committed,
      available,
      subtotal,
      total: Number((subtotal * 1.16).toFixed(2)),
      blockedReason: this.blockedReason(partida, available),
    } as PartidaView;
  }

  private deliveryState(partida: Partida, dueDate: string, holidays: Set<string>): DeliveryState {
    if (partida.result === 'Desierta') return { label: 'No aplica', tone: 'gray', rank: 0 };
    if (partida.result !== 'Adjudicada') return { label: 'Pendiente de fallo', tone: 'amber', rank: 2 };
    const delivered = partida.deliveryDate ? String(partida.deliveryDate).slice(0, 10) : '';
    if (delivered) {
      const late = Boolean(dueDate) && delivered > dueDate;
      return late
        ? { label: 'Entregada con atraso', tone: 'amber', rank: 2 }
        : { label: 'Entregada', tone: 'green', rank: 0 };
    }
    if (!dueDate) return { label: 'Sin contrato', tone: 'amber', rank: 2 };
    const today = todayISO();
    if (today > dueDate) {
      return { label: `Vencida · ${businessDistance(dueDate, today, holidays)} días hábiles`, tone: 'red', rank: 3 };
    }
    return { label: `En plazo · vence ${dueDate}`, tone: 'blue', rank: 1 };
  }

  /** Mismo criterio que el formulario original, pero explicando el motivo. */
  private blockedReason(partida: Partida, available: number): string {
    if (partida.result !== 'Adjudicada') return `resultado "${partida.result}"`;
    if (partida.unit === 'Servicio') return 'unidad de medida Servicio';
    if (!partida.warehouseId) return 'sin bodega de recepción';
    if (!partida.deliveryDate) return 'sin fecha de entrega real';
    if (available <= 0) return 'sin existencia disponible';
    return '';
  }
}
