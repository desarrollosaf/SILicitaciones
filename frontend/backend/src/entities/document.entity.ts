import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type DocumentEntityType = 'dictamen' | 'partida';

/** Archivo binario real asociado a un dictamen o partida (sustituye guardar solo el nombre). */
@Entity('documents')
@Index(['entity', 'entityId'])
export class StoredDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 20 })
  entity: DocumentEntityType;

  @Column({ type: 'uuid' })
  entityId: string;

  @Column({ length: 260 })
  name: string;

  @Column({ length: 150, default: 'application/octet-stream' })
  mimeType: string;

  @Column({ type: 'int', unsigned: true, default: 0 })
  size: number;

  @Column({ type: 'longblob', select: false })
  data: Buffer;

  @CreateDateColumn()
  createdAt: Date;
}
