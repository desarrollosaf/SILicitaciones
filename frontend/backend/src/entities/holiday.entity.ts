import { Column, Entity, PrimaryColumn } from 'typeorm';

/** Días inhábiles usados para calcular plazos de entrega. */
@Entity('holidays')
export class Holiday {
  @PrimaryColumn({ type: 'date' })
  date: string;

  @Column({ length: 160, default: '' })
  description: string;
}
