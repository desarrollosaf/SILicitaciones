import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Dictamen, Licitacion } from '../../entities';
import { DictamenesService } from './dictamenes.service';
import { DictamenesController } from './dictamenes.controller';
import { PeriodsModule } from '../periods/periods.module';

@Module({
  imports: [TypeOrmModule.forFeature([Dictamen, Licitacion]), PeriodsModule],
  providers: [DictamenesService],
  controllers: [DictamenesController],
  exports: [DictamenesService],
})
export class DictamenesModule {}
