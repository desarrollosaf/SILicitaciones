import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, Index } from 'typeorm';
import { Period } from './period.entity';
import { Licitacion } from './licitacion.entity';

export type DictamenStatus =
  | 'En elaboración'
  | 'Emitido'
  | 'Enviado a DRM'
  | 'Procedimiento iniciado'
  | 'Concluido';

@Entity('dictamenes')
@Index(['periodId', 'folio'], { unique: true })
export class Dictamen {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 20 })
  periodId: string;

  @ManyToOne(() => Period, (period) => period.dictamenes, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'periodId' })
  period: Period;

  @Column({ length: 60 })
  folio: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ length: 200 })
  requester: string;

  @Column({ length: 200 })
  area: string;

  @Column({ type: 'text' })
  object: string;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0, transformer: { to: (v) => v, from: (v) => Number(v) } })
  estimatedAmount: number;

  @Column({ length: 80, default: 'Pendiente de definición' })
  procedureType: string;

  @Column({ type: 'enum', enum: ['En elaboración', 'Emitido', 'Enviado a DRM', 'Procedimiento iniciado', 'Concluido'], default: 'En elaboración' })
  status: DictamenStatus;

  @Column({ length: 260, default: '' })
  fileName: string;

  @OneToMany(() => Licitacion, (licitacion) => licitacion.dictamen)
  licitaciones: Licitacion[];
}
