import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Period } from './period.entity';
import { Dictamen } from './dictamen.entity';
import { Partida } from './partida.entity';

export type DayType = 'business' | 'calendar';

@Entity('licitaciones')
@Index(['periodId', 'number'], { unique: true })
export class Licitacion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 20 })
  periodId: string;

  @ManyToOne(() => Period, (period) => period.licitaciones, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'periodId' })
  period: Period;

  @Column({ type: 'uuid', nullable: true })
  dictamenId: string | null;

  @ManyToOne(() => Dictamen, (dictamen) => dictamen.licitaciones, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'dictamenId' })
  dictamen: Dictamen | null;

  @Column({ length: 80, default: 'Licitación pública nacional' })
  type: string;

  @Column({ length: 120 })
  number: string;

  @Column({ type: 'text' })
  object: string;

  @Column({ length: 220, default: '' })
  area: string;

  @Column({ type: 'date', nullable: true })
  fallDate: string | null;

  @Column({ type: 'int', default: 20 })
  deliveryDays: number;

  @Column({ type: 'enum', enum: ['business', 'calendar'], default: 'business' })
  dayType: DayType;

  @Column({ type: 'decimal', precision: 6, scale: 3, default: 0.1, transformer: { to: (v) => v, from: (v) => Number(v) } })
  penaltyPct: number;

  @Column({ length: 260, default: '' })
  deliveryPlace: string;

  @OneToMany(() => Partida, (partida) => partida.licitacion)
  partidas: Partida[];
}
