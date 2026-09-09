import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('summary')
  summary(@Query('periodId') periodId: string) {
    return this.service.summary(periodId);
  }

  @Get('alerts')
  alerts(@Query('periodId') periodId: string) {
    return this.service.alerts(periodId);
  }
}
