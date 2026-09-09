import { Controller, Get, Query } from '@nestjs/common';
import { WarehousesService } from './warehouses.service';

@Controller('warehouses')
export class WarehousesController {
  constructor(private readonly service: WarehousesService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get('balance')
  balance(@Query('periodId') periodId: string) {
    return this.service.balance(periodId);
  }
}
