import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Licitacion } from './licitacion.entity';
import { Warehouse } from './warehouse.entity';
import { MemoAllocation } from './memo-allocation.entity';

export type PartidaResult = 'Adjudicada' | 'Desierta' | 'Pendiente';
export type PartidaUnit = 'Pieza' | 'Kit' | 'Par' | 'Combo' | 'Servicio';
export type GuaranteeStatus = 'Pendiente' | 'Entregada' | 'No aplica';
export type ComplianceStatus = 'Pendiente' | 'Cumplimiento' | 'Incumplimiento' | 'No aplica';

const decimal = { to: (v: number) => v, from: (v: string) => Number(v) };

@Entity('partidas')
@Index(['licitacionId', 'number', 'grupo'], { unique: true })
export class Partida {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  licitacionId: string;

  @ManyToOne(() => Licitacion, (licitacion) => licitacion.partidas, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'licitacionId' })
  licitacion: Licitacion;

  @Column({ length: 40 })
  number: string;

  /** "grupo" en el modelo original: Audio, Video, Informática… */
  @Column({ length: 80, default: '' })
  grupo: string;

  @Column({ length: 400 })
  description: string;

  @Column({ type: 'enum', enum: ['Adjudicada', 'Desierta', 'Pendiente'], default: 'Adjudicada' })
  result: PartidaResult;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ type: 'enum', enum: ['Pieza', 'Kit', 'Par', 'Combo', 'Servicio'], default: 'Pieza' })
  unit: PartidaUnit;

  @Column({ length: 40, nullable: true })
  warehouseId: string | null;

  @ManyToOne(() => Warehouse, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'warehouseId' })
  warehouse: Warehouse | null;

  @Column({ length: 260, default: '' })
  provider: string;

  @Column({ length: 200, default: '' })
  brand: string;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0, transformer: decimal })
  unitPrice: number;

  @Column({ type: 'date', nullable: true })
  fallDate: string | null;

  @Column({ length: 80, default: '' })
  contractNumber: string;

  @Column({ type: 'date', nullable: true })
  contractDate: string | null;

  /** Fecha de recepción real en bodega; sin ella la partida no puede salir en memorándum. */
  @Column({ type: 'date', nullable: true })
  deliveryDate: string | null;

  @Column({ type: 'enum', enum: ['Pendiente', 'Entregada', 'No aplica'], default: 'Pendiente' })
  performanceGuarantee: GuaranteeStatus;

  @Column({ type: 'enum', enum: ['Pendiente', 'Cumplimiento', 'Incumplimiento', 'No aplica'], default: 'Pendiente' })
  complianceStatus: ComplianceStatus;

  @Column({ length: 80, default: '' })
  warranty: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'json', nullable: true })
  attachments: string[];

  @OneToMany(() => MemoAllocation, (allocation) => allocation.partida)
  allocations: MemoAllocation[];
}
