import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MemoAllocation, Partida } from '../../entities';
import { StockService } from './stock.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([MemoAllocation, Partida])],
  providers: [StockService],
  exports: [StockService],
})
export class StockModule {}
