import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Query, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { DocumentsService } from './documents.service';
import { DocumentEntityType } from '../../entities';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly service: DocumentsService) {}

  @Get()
  findAll(@Query('entity') entity: string, @Query('entityId') entityId: string) {
    if (!entity || !entityId) throw new BadRequestException('entity y entityId son obligatorios.');
    return this.service.findAll(entity as DocumentEntityType, entityId);
  }

  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 16 * 1024 * 1024 } }))
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('entity') entity: string,
    @Body('entityId') entityId: string,
    @Body('name') name?: string,
  ) {
    if (!entity) throw new BadRequestException('entity es obligatorio.');
    return this.service.upload(entity as DocumentEntityType, entityId, file, name);
  }

  @Get(':id/content')
  async content(@Param('id') id: string, @Res() response: Response): Promise<void> {
    const document = await this.service.getContent(id);
    response.setHeader('Content-Type', document.mimeType);
    response.setHeader('Content-Length', String(document.size));
    response.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(document.name)}`);
    response.send(document.data);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ deleted: true }> {
    await this.service.remove(id);
    return { deleted: true };
  }
}
