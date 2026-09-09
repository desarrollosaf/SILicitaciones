import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { COMMITTED_STATUSES, MemoAllocation, Partida } from '../../entities';

export interface StockSnapshot {
  quantity: number;
  committed: number;
  available: number;
}

/**
 * Fuente de verdad de las existencias. En el modelo original la disponibilidad
 * se recalculaba en el navegador; aquí se deriva siempre de la base de datos.
 */
@Injectable()
export class StockService {
  constructor(
    @InjectRepository(MemoAllocation) private readonly allocations: Repository<MemoAllocation>,
    @InjectRepository(Partida) private readonly partidas: Repository<Partida>,
  ) {}

  /** Cantidad comprometida por partida, ignorando opcionalmente un memorándum en edición. */
  async committedByPartida(partidaIds: string[], omittedMemoId?: string): Promise<Map<string, number>> {
    const result = new Map<string, number>();
    if (!partidaIds.length) return result;

    const query = this.allocations
      .createQueryBuilder('allocation')
      .innerJoin('allocation.memo', 'memo')
      .select('allocation.partidaId', 'partidaId')
      .addSelect('SUM(allocation.quantity)', 'total')
      .where('allocation.partidaId IN (:...partidaIds)', { partidaIds })
      .andWhere('memo.status IN (:...statuses)', { statuses: COMMITTED_STATUSES })
      .groupBy('allocation.partidaId');

    if (omittedMemoId) query.andWhere('memo.id != :omittedMemoId', { omittedMemoId });

    const rows = await query.getRawMany<{ partidaId: string; total: string }>();
    rows.forEach((row) => result.set(row.partidaId, Number(row.total)));
    partidaIds.forEach((id) => { if (!result.has(id)) result.set(id, 0); });
    return result;
  }

  async committed(partidaId: string, omittedMemoId?: string): Promise<number> {
    const map = await this.committedByPartida([partidaId], omittedMemoId);
    return map.get(partidaId) ?? 0;
  }

  async snapshot(partidaId: string, omittedMemoId?: string): Promise<StockSnapshot> {
    const partida = await this.partidas.findOne({ where: { id: partidaId } });
    const quantity = partida?.result === 'Adjudicada' && partida.unit !== 'Servicio' ? Number(partida.quantity ?? 0) : 0;
    const committed = await this.committed(partidaId, omittedMemoId);
    return { quantity, committed, available: Math.max(0, quantity - committed) };
  }

  async available(partidaId: string, omittedMemoId?: string): Promise<number> {
    return (await this.snapshot(partidaId, omittedMemoId)).available;
  }
}
