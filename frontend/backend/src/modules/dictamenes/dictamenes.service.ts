import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dictamen, Licitacion } from '../../entities';
import { PeriodsService } from '../periods/periods.service';
import { CreateDictamenDto, UpdateDictamenDto } from './dictamen.dto';

@Injectable()
export class DictamenesService {
  constructor(
    @InjectRepository(Dictamen) private readonly dictamenes: Repository<Dictamen>,
    @InjectRepository(Licitacion) private readonly licitaciones: Repository<Licitacion>,
    private readonly periods: PeriodsService,
  ) {}

  findAll(periodId: string) {
    return this.dictamenes.find({ where: { periodId }, order: { folio: 'ASC' } });
  }

  async findOne(id: string) {
    const dictamen = await this.dictamenes.findOne({ where: { id } });
    if (!dictamen) throw new NotFoundException('El dictamen no existe.');
    return dictamen;
  }

  /**
   * Folio consecutivo por periodo. Se calcula a partir del número más alto ya
   * usado, no del conteo, para que borrar un dictamen no genere duplicados.
   */
  async nextFolio(periodId: string) {
    const period = await this.periods.findOne(periodId);
    const rows = await this.dictamenes.find({ where: { periodId }, select: { folio: true } });
    const numbers = rows.map((row) => Number(row.folio.match(/(\d+)\/\d{4}$/)?.[1] ?? 0));
    const next = Math.max(0, ...numbers) + 1;
    return `DI/DT/${String(next).padStart(3, '0')}/${period.year}`;
  }

  async create(dto: CreateDictamenDto) {
    await this.periods.assertOpen(dto.periodId);
    const dictamen = this.dictamenes.create({
      ...dto,
      folio: dto.folio?.trim() || (await this.nextFolio(dto.periodId)),
    });
    return this.dictamenes.save(dictamen);
  }

  async update(id: string, dto: UpdateDictamenDto) {
    const dictamen = await this.findOne(id);
    await this.periods.assertOpen(dictamen.periodId);
    Object.assign(dictamen, dto, { periodId: dictamen.periodId });
    return this.dictamenes.save(dictamen);
  }

  /** Al borrar se desvinculan los procedimientos, pero no se eliminan. */
  async remove(id: string) {
    const dictamen = await this.findOne(id);
    await this.periods.assertOpen(dictamen.periodId);
    const linked = await this.licitaciones.find({ where: { dictamenId: id } });
    if (linked.length) {
      await this.licitaciones.save(linked.map((licitacion) => ({ ...licitacion, dictamenId: null })));
    }
    await this.dictamenes.remove(dictamen);
    return { deleted: true, unlinkedProcedures: linked.length };
  }
}
