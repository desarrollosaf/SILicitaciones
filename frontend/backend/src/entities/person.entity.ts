import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('people')
@Index(['name', 'dependencyCode'], { unique: true })
export class Person {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  name: string;

  /** CVE-ADSC del catálogo institucional. */
  @Column({ length: 10 })
  dependencyCode: string;

  @Column({ length: 240 })
  area: string;
}
