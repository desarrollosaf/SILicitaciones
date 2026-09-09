import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { PeriodsService } from './periods.service';
import { CreatePeriodDto, UpdatePeriodDto } from './period.dto';

@Controller('periods')
export class PeriodsController {
  constructor(private readonly service: PeriodsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreatePeriodDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePeriodDto) {
    return this.service.update(id, dto);
  }

  @Post(':id/toggle')
  toggle(@Param('id') id: string) {
    return this.service.toggle(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
