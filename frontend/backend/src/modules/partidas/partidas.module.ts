import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Holiday, Licitacion, MemoAllocation, Partida } from '../../entities';
import { PartidasService } from './partidas.service';
import { PartidasController } from './partidas.controller';
import { PeriodsModule } from '../periods/periods.module';

@Module({
  imports: [TypeOrmModule.forFeature([Partida, Licitacion, Holiday, MemoAllocation]), PeriodsModule],
  providers: [PartidasService],
  controllers: [PartidasController],
  exports: [PartidasService],
})
export class PartidasModule {}
