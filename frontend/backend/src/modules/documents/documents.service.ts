import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentEntityType, StoredDocument } from '../../entities';

const ALLOWED_ENTITIES: DocumentEntityType[] = ['dictamen', 'partida'];

export interface DocumentMetadata {
  id: string;
  entity: DocumentEntityType;
  entityId: string;
  name: string;
  mimeType: string;
  size: number;
  createdAt: Date;
}

@Injectable()
export class DocumentsService {
  constructor(@InjectRepository(StoredDocument) private readonly repo: Repository<StoredDocument>) {}

  async findAll(entity: DocumentEntityType, entityId: string): Promise<DocumentMetadata[]> {
    this.assertEntity(entity);
    const documents = await this.repo.find({ where: { entity, entityId }, order: { createdAt: 'ASC' } });
    return documents.map((document) => this.toMetadata(document));
  }

  async upload(
    entity: DocumentEntityType,
    entityId: string,
    file: Express.Multer.File | undefined,
    name?: string,
  ): Promise<DocumentMetadata> {
    this.assertEntity(entity);
    if (!entityId) throw new BadRequestException('entityId es obligatorio.');
    if (!file) throw new BadRequestException('Se requiere un archivo.');

    const document = this.repo.create({
      entity,
      entityId,
      name: (name || file.originalname || 'documento').slice(0, 260),
      mimeType: (file.mimetype || 'application/octet-stream').slice(0, 150),
      size: file.size,
      data: file.buffer,
    });
    return this.toMetadata(await this.repo.save(document));
  }

  async getContent(id: string): Promise<StoredDocument> {
    const document = await this.repo
      .createQueryBuilder('document')
      .addSelect('document.data')
      .where('document.id = :id', { id })
      .getOne();
    if (!document) throw new NotFoundException('Documento no encontrado.');
    return document;
  }

  async remove(id: string): Promise<void> {
    const result = await this.repo.delete({ id });
    if (!result.affected) throw new NotFoundException('Documento no encontrado.');
  }

  private assertEntity(entity: DocumentEntityType): void {
    if (!ALLOWED_ENTITIES.includes(entity)) throw new BadRequestException('Tipo de entidad inválido.');
  }

  private toMetadata(document: StoredDocument): DocumentMetadata {
    return {
      id: document.id,
      entity: document.entity,
      entityId: document.entityId,
      name: document.name,
      mimeType: document.mimeType,
      size: Number(document.size),
      createdAt: document.createdAt,
    };
  }
}
