import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('warehouses')
export class Warehouse {
  @PrimaryColumn({ length: 40 })
  id: string;

  @Column({ length: 160 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;
}
