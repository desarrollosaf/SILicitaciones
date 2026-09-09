import { Body, Controller, Post, Query } from '@nestjs/common';
import { ImportsService } from './imports.service';

interface CsvPayload {
  csv: string;
}

@Controller('imports')
export class ImportsController {
  constructor(private readonly service: ImportsService) {}

  @Post('licitaciones')
  licitaciones(@Query('periodId') periodId: string, @Body() body: CsvPayload) {
    return this.service.importLicitaciones(periodId, body.csv);
  }

  @Post('partidas')
  partidas(@Query('periodId') periodId: string, @Body() body: CsvPayload) {
    return this.service.importPartidas(periodId, body.csv);
  }

  @Post('people')
  people(@Body() body: CsvPayload) {
    return this.service.importPeople(body.csv);
  }
}
