import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dictamen, Licitacion, Memo, Period } from '../../entities';
import { todayISO } from '../../common/dates';
import { CreatePeriodDto, UpdatePeriodDto } from './period.dto';

@Injectable()
export class PeriodsService {
  constructor(
    @InjectRepository(Period) private readonly periods: Repository<Period>,
    @InjectRepository(Dictamen) private readonly dictamenes: Repository<Dictamen>,
    @InjectRepository(Licitacion) private readonly licitaciones: Repository<Licitacion>,
    @InjectRepository(Memo) private readonly memos: Repository<Memo>,
  ) {}

  findAll() {
    return this.periods.find({ order: { year: 'DESC' } });
  }

  async findOne(id: string) {
    const period = await this.periods.findOne({ where: { id } });
    if (!period) throw new NotFoundException(`No existe el periodo ${id}.`);
    return period;
  }

  /** Lanza si el periodo está cerrado; se usa antes de cualquier alta o cambio. */
  async assertOpen(id: string) {
    const period = await this.findOne(id);
    if (period.status !== 'Abierto') {
      throw new BadRequestException(`El periodo ${period.year} está cerrado para captura.`);
    }
    return period;
  }

  async create(dto: CreatePeriodDto) {
    const existing = await this.periods.findOne({ where: { year: dto.year } });
    if (existing) throw new ConflictException(`Ya existe un periodo para el ejercicio ${dto.year}.`);
    if (dto.status === 'Abierto') await this.closeAll();
    const period = this.periods.create({
      id: `PER-${dto.year}`,
      year: dto.year,
      status: dto.status,
      startDate: dto.startDate,
      endDate: dto.endDate,
      openedDate: dto.status === 'Abierto' ? todayISO() : null,
      closedDate: null,
    });
    return this.periods.save(period);
  }

  async update(id: string, dto: UpdatePeriodDto) {
    const period = await this.findOne(id);
    Object.assign(period, dto);
    return this.periods.save(period);
  }

  /** Abre o cierra un periodo; solo uno puede estar abierto a la vez. */
  async toggle(id: string) {
    const period = await this.findOne(id);
    if (period.status === 'Abierto') {
      period.status = 'Cerrado';
      period.closedDate = todayISO();
    } else {
      await this.closeAll();
      period.status = 'Abierto';
      period.openedDate = todayISO();
      period.closedDate = null;
    }
    return this.periods.save(period);
  }

  async remove(id: string) {
    const period = await this.findOne(id);
    const total = await this.periods.count();
    if (total <= 1) throw new BadRequestException('Debe existir al menos un periodo anual.');
    const used =
      (await this.dictamenes.count({ where: { periodId: id } })) +
      (await this.licitaciones.count({ where: { periodId: id } })) +
      (await this.memos.count({ where: { periodId: id } }));
    if (used) {
      throw new BadRequestException(`No se puede eliminar el periodo ${period.year}: tiene ${used} registro(s) asociados.`);
    }
    await this.periods.remove(period);
    return { deleted: true };
  }

  private async closeAll() {
    const open = await this.periods.find({ where: { status: 'Abierto' } });
    for (const item of open) {
      item.status = 'Cerrado';
      item.closedDate = todayISO();
    }
    if (open.length) await this.periods.save(open);
  }
}
