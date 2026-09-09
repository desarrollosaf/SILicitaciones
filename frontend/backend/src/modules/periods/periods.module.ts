import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Dictamen, Licitacion, Memo, Period } from '../../entities';
import { PeriodsService } from './periods.service';
import { PeriodsController } from './periods.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Period, Dictamen, Licitacion, Memo])],
  providers: [PeriodsService],
  controllers: [PeriodsController],
  exports: [PeriodsService],
})
export class PeriodsModule {}
