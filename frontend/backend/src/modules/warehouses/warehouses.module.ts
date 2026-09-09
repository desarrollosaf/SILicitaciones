import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Warehouse, Partida } from '../../entities';
import { WarehousesService } from './warehouses.service';
import { WarehousesController } from './warehouses.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Warehouse, Partida])],
  providers: [WarehousesService],
  controllers: [WarehousesController],
})
export class WarehousesModule {}
