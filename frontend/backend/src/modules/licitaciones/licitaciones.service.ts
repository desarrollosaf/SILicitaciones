import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dictamen, Licitacion, Memo, Partida } from '../../entities';
import { PeriodsService } from '../periods/periods.service';
import { StockService } from '../stock/stock.service';
import { CreateLicitacionDto, UpdateLicitacionDto } from './licitacion.dto';

@Injectable()
export class LicitacionesService {
  constructor(
    @InjectRepository(Licitacion) private readonly licitaciones: Repository<Licitacion>,
    @InjectRepository(Partida) private readonly partidas: Repository<Partida>,
    @InjectRepository(Dictamen) private readonly dictamenes: Repository<Dictamen>,
    @InjectRepository(Memo) private readonly memos: Repository<Memo>,
    private readonly periods: PeriodsService,
    private readonly stock: StockService,
  ) {}

  /** Lista con el resumen que muestra cada tarjeta de procedimiento. */
  async findAll(periodId: string) {
    const licitaciones = await this.licitaciones.find({ where: { periodId }, relations: { dictamen: true }, order: { number: 'ASC' } });
    const partidas = await this.partidas.find({ where: { licitacion: { periodId } }, relations: { licitacion: true } });

    return licitaciones.map((licitacion) => {
      const own = partidas.filter((partida) => partida.licitacionId === licitacion.id);
      const awarded = own.filter((partida) => partida.result === 'Adjudicada');
      const amount = awarded.reduce((sum, partida) => sum + partida.quantity * partida.unitPrice * 1.16, 0);
      return {
        ...licitacion,
        partidasCount: own.length,
        awardedCount: awarded.length,
        awardedAmount: Number(amount.toFixed(2)),
      };
    });
  }

  async findOne(id: string) {
    const licitacion = await this.licitaciones.findOne({ where: { id }, relations: { dictamen: true } });
    if (!licitacion) throw new NotFoundException('El procedimiento no existe.');
    return licitacion;
  }

  async create(dto: CreateLicitacionDto) {
    await this.periods.assertOpen(dto.periodId);
    const licitacion = this.licitaciones.create({ ...dto, dictamenId: dto.dictamenId || null });
    const saved = await this.licitaciones.save(licitacion);
    await this.markDictamenStarted(saved.dictamenId);
    return saved;
  }

  async update(id: string, dto: UpdateLicitacionDto) {
    const licitacion = await this.findOne(id);
    await this.periods.assertOpen(licitacion.periodId);
    Object.assign(licitacion, dto, { periodId: licitacion.periodId, dictamenId: dto.dictamenId ?? licitacion.dictamenId });
    const saved = await this.licitaciones.save(licitacion);
    await this.markDictamenStarted(saved.dictamenId);
    return saved;
  }

  /**
   * Borra el procedimiento y sus partidas. Se bloquea si alguna partida ya
   * tiene bienes comprometidos en memorándums vigentes.
   */
  async remove(id: string) {
    const licitacion = await this.findOne(id);
    await this.periods.assertOpen(licitacion.periodId);

    const partidas = await this.partidas.find({ where: { licitacionId: id } });
    const committed = await this.stock.committedByPartida(partidas.map((partida) => partida.id));
    const blocked = partidas.filter((partida) => (committed.get(partida.id) ?? 0) > 0);
    if (blocked.length) {
      throw new BadRequestException(
        `No se puede eliminar: ${blocked.length} partida(s) tienen bienes comprometidos en memorándums vigentes.`,
      );
    }

    await this.memos.update({ licitacionId: id }, { licitacionId: null });
    if (licitacion.dictamenId) {
      const dictamen = await this.dictamenes.findOne({ where: { id: licitacion.dictamenId } });
      if (dictamen && dictamen.status === 'Procedimiento iniciado') {
        dictamen.status = 'Enviado a DRM';
        await this.dictamenes.save(dictamen);
      }
    }
    await this.partidas.remove(partidas);
    await this.licitaciones.remove(licitacion);
    return { deleted: true, removedPartidas: partidas.length };
  }

  private async markDictamenStarted(dictamenId: string | null) {
    if (!dictamenId) return;
    const dictamen = await this.dictamenes.findOne({ where: { id: dictamenId } });
    if (dictamen && dictamen.status !== 'Concluido') {
      dictamen.status = 'Procedimiento iniciado';
      await this.dictamenes.save(dictamen);
    }
  }
}
