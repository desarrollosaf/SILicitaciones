import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { Dictamen } from './dictamen.entity';
import { Licitacion } from './licitacion.entity';
import { Memo } from './memo.entity';

export type PeriodStatus = 'Abierto' | 'Cerrado' | 'Planeado';

@Entity('periods')
export class Period {
  /** Identificador legible, p. ej. PER-2026. */
  @PrimaryColumn({ length: 20 })
  id: string;

  @Column({ type: 'int', unique: true })
  year: number;

  @Column({ type: 'enum', enum: ['Abierto', 'Cerrado', 'Planeado'], default: 'Planeado' })
  status: PeriodStatus;

  @Column({ type: 'date' })
  startDate: string;

  @Column({ type: 'date' })
  endDate: string;

  @Column({ type: 'date', nullable: true })
  openedDate: string | null;

  @Column({ type: 'date', nullable: true })
  closedDate: string | null;

  @OneToMany(() => Dictamen, (dictamen) => dictamen.period)
  dictamenes: Dictamen[];

  @OneToMany(() => Licitacion, (licitacion) => licitacion.period)
  licitaciones: Licitacion[];

  @OneToMany(() => Memo, (memo) => memo.period)
  memos: Memo[];
}
