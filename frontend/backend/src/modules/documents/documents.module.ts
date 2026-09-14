import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StoredDocument } from '../../entities';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';

@Module({
  imports: [TypeOrmModule.forFeature([StoredDocument])],
  providers: [DocumentsService],
  controllers: [DocumentsController],
})
export class DocumentsModule {}
