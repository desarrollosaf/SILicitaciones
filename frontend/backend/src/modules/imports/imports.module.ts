import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Dictamen, Licitacion, Partida, Person, Warehouse } from '../../entities';
import { ImportsService } from './imports.service';
import { ImportsController } from './imports.controller';
import { PeriodsModule } from '../periods/periods.module';

@Module({
  imports: [TypeOrmModule.forFeature([Licitacion, Partida, Dictamen, Person, Warehouse]), PeriodsModule],
  providers: [ImportsService],
  controllers: [ImportsController],
})
export class ImportsModule {}
