import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { DictamenesService } from './dictamenes.service';
import { CreateDictamenDto, UpdateDictamenDto } from './dictamen.dto';

@Controller('dictamenes')
export class DictamenesController {
  constructor(private readonly service: DictamenesService) {}

  @Get()
  findAll(@Query('periodId') periodId: string) {
    return this.service.findAll(periodId);
  }

  @Get('next-folio')
  nextFolio(@Query('periodId') periodId: string) {
    return this.service.nextFolio(periodId).then((folio) => ({ folio }));
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateDictamenDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDictamenDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
