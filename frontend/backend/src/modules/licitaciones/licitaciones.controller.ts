import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { LicitacionesService } from './licitaciones.service';
import { CreateLicitacionDto, UpdateLicitacionDto } from './licitacion.dto';

@Controller('licitaciones')
export class LicitacionesController {
  constructor(private readonly service: LicitacionesService) {}

  @Get()
  findAll(@Query('periodId') periodId: string) {
    return this.service.findAll(periodId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateLicitacionDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateLicitacionDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
