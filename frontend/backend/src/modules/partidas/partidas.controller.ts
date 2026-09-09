import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { PartidasService } from './partidas.service';
import { CreatePartidaDto, UpdatePartidaDto } from './partida.dto';

@Controller('partidas')
export class PartidasController {
  constructor(private readonly service: PartidasService) {}

  @Get()
  findAll(@Query('periodId') periodId: string, @Query('licitacionId') licitacionId?: string) {
    return this.service.findAll(periodId, licitacionId);
  }

  @Get('available')
  available(
    @Query('periodId') periodId: string,
    @Query('licitacionId') licitacionId?: string,
    @Query('memoId') memoId?: string,
  ) {
    return this.service.availableForMemo(periodId, licitacionId, memoId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreatePartidaDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePartidaDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
