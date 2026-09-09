import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Dictamen, Licitacion, Memo, Partida } from '../../entities';
import { LicitacionesService } from './licitaciones.service';
import { LicitacionesController } from './licitaciones.controller';
import { PeriodsModule } from '../periods/periods.module';

@Module({
  imports: [TypeOrmModule.forFeature([Licitacion, Partida, Dictamen, Memo]), PeriodsModule],
  providers: [LicitacionesService],
  controllers: [LicitacionesController],
  exports: [LicitacionesService],
})
export class LicitacionesModule {}
