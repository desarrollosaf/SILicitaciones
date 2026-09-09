import { Module } from '@nestjs/common';
import { PartidasModule } from '../partidas/partidas.module';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';

@Module({
  imports: [PartidasModule],
  providers: [DashboardService],
  controllers: [DashboardController],
})
export class DashboardModule {}
