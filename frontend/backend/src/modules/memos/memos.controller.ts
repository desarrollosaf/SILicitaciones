import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { MemosService } from './memos.service';
import { CreateMemoDto, UpdateMemoDto } from './memo.dto';

@Controller('memos')
export class MemosController {
  constructor(private readonly service: MemosService) {}

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

  @Get(':id/printable')
  printable(@Param('id') id: string) {
    return this.service.printable(id);
  }

  @Post()
  create(@Body() dto: CreateMemoDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMemoDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
