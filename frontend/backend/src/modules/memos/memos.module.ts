import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Memo, MemoAllocation, Partida } from '../../entities';
import { MemosService } from './memos.service';
import { MemosController } from './memos.controller';
import { PeriodsModule } from '../periods/periods.module';

@Module({
  imports: [TypeOrmModule.forFeature([Memo, MemoAllocation, Partida]), PeriodsModule],
  providers: [MemosService],
  controllers: [MemosController],
  exports: [MemosService],
})
export class MemosModule {}
