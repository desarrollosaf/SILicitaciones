import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { COMMITTED_STATUSES, MemoAllocation, Person } from '../../entities';
import { cleanName, normalize } from '../../common/text';
import { CreatePersonDto, UpdatePersonDto } from './person.dto';

@Injectable()
export class PeopleService {
  constructor(
    @InjectRepository(Person) private readonly people: Repository<Person>,
    @InjectRepository(MemoAllocation) private readonly allocations: Repository<MemoAllocation>,
  ) {}

  /** Incluye cuántos bienes tiene cada persona bajo resguardo vigente. */
  async findAll(search = '') {
    const people = await this.people.find({ order: { name: 'ASC' } });
    const rows = await this.allocations
      .createQueryBuilder('allocation')
      .innerJoin('allocation.memo', 'memo')
      .select('allocation.personId', 'personId')
      .addSelect('SUM(allocation.quantity)', 'total')
      .where('memo.status IN (:...statuses)', { statuses: COMMITTED_STATUSES })
      .groupBy('allocation.personId')
      .getRawMany<{ personId: string; total: string }>();
    const counts = new Map(rows.map((row) => [row.personId, Number(row.total)]));

    const term = normalize(search);
    return people
      .filter((person) => !term || normalize(`${person.name} ${person.dependencyCode} ${person.area}`).includes(term))
      .map((person) => ({ ...person, assignedCount: counts.get(person.id) ?? 0 }));
  }

  async create(dto: CreatePersonDto) {
    const name = cleanName(dto.name);
    const duplicate = await this.people.findOne({ where: { name, dependencyCode: dto.dependencyCode } });
    if (duplicate) throw new ConflictException('La persona ya está registrada en esa dependencia.');
    return this.people.save(this.people.create({ ...dto, name, area: dto.area ?? '' }));
  }

  async update(id: string, dto: UpdatePersonDto) {
    const person = await this.people.findOne({ where: { id } });
    if (!person) throw new NotFoundException('La persona no existe.');
    Object.assign(person, dto, { name: dto.name ? cleanName(dto.name) : person.name });
    return this.people.save(person);
  }

  /** No se elimina a quien tiene bienes bajo resguardo vigente. */
  async remove(id: string) {
    const person = await this.people.findOne({ where: { id } });
    if (!person) throw new NotFoundException('La persona no existe.');
    const row = await this.allocations
      .createQueryBuilder('allocation')
      .innerJoin('allocation.memo', 'memo')
      .select('SUM(allocation.quantity)', 'total')
      .where('allocation.personId = :id', { id })
      .andWhere('memo.status IN (:...statuses)', { statuses: COMMITTED_STATUSES })
      .getRawOne<{ total: string }>();
    const assigned = Number(row?.total ?? 0);
    if (assigned) {
      throw new BadRequestException(`No se puede eliminar: ${person.name} tiene ${assigned} bien(es) bajo resguardo vigente.`);
    }
    await this.allocations.delete({ personId: id });
    await this.people.remove(person);
    return { deleted: true };
  }
}
