import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from './data-source';
import { PeriodsModule } from './modules/periods/periods.module';
import { WarehousesModule } from './modules/warehouses/warehouses.module';
import { DictamenesModule } from './modules/dictamenes/dictamenes.module';
import { LicitacionesModule } from './modules/licitaciones/licitaciones.module';
import { PartidasModule } from './modules/partidas/partidas.module';
import { PeopleModule } from './modules/people/people.module';
import { MemosModule } from './modules/memos/memos.module';
import { StockModule } from './modules/stock/stock.module';
import { ImportsModule } from './modules/imports/imports.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(databaseConfig),
    StockModule,
    PeriodsModule,
    WarehousesModule,
    DictamenesModule,
    LicitacionesModule,
    PartidasModule,
    PeopleModule,
    MemosModule,
    ImportsModule,
    DashboardModule,
  ],
})
export class AppModule {}
