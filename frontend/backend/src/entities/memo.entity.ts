import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Period } from './period.entity';
import { Licitacion } from './licitacion.entity';
import { MemoAllocation } from './memo-allocation.entity';

export type MemoStatus = 'Borrador' | 'Enviado' | 'Atendido' | 'Entregado' | 'Cancelado';

/** Estados que reservan existencia en bodega. */
export const COMMITTED_STATUSES: MemoStatus[] = ['Enviado', 'Atendido', 'Entregado'];

@Entity('memos')
@Index(['periodId', 'folio'], { unique: true })
export class Memo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 20 })
  periodId: string;

  @ManyToOne(() => Period, (period) => period.memos, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'periodId' })
  period: Period;

  @Column({ type: 'uuid', nullable: true })
  licitacionId: string | null;

  @ManyToOne(() => Licitacion, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'licitacionId' })
  licitacion: Licitacion | null;

  @Column({ length: 30 })
  folio: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ length: 200, default: 'Martha Maldonado Vilchis' })
  recipient: string;

  @Column({ length: 300, default: 'Entrega de bienes informáticos a personas servidoras públicas' })
  subject: string;

  @Column({ type: 'enum', enum: ['Borrador', 'Enviado', 'Atendido', 'Entregado', 'Cancelado'], default: 'Enviado' })
  status: MemoStatus;

  @OneToMany(() => MemoAllocation, (allocation) => allocation.memo, { cascade: true, eager: true })
  allocations: MemoAllocation[];
}
