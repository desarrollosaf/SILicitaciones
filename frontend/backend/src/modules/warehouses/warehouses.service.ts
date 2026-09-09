import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Partida, Warehouse } from '../../entities';
import { StockService } from '../stock/stock.service';

@Injectable()
export class WarehousesService {
  constructor(
    @InjectRepository(Warehouse) private readonly warehouses: Repository<Warehouse>,
    @InjectRepository(Partida) private readonly partidas: Repository<Partida>,
    private readonly stock: StockService,
  ) {}

  findAll() {
    return this.warehouses.find({ order: { name: 'ASC' } });
  }

  /** Saldo por bodega del periodo: recibido, comprometido y disponible. */
  async balance(periodId: string) {
    const received = await this.partidas.find({
      where: { result: 'Adjudicada', licitacion: { periodId } },
      relations: { licitacion: true, warehouse: true },
    });
    const usable = received.filter((partida) => partida.unit !== 'Servicio' && partida.warehouseId && partida.deliveryDate);
    const committed = await this.stock.committedByPartida(usable.map((partida) => partida.id));

    const rows = usable.map((partida) => {
      const taken = committed.get(partida.id) ?? 0;
      return {
        partidaId: partida.id,
        number: partida.number,
        description: partida.description,
        brand: partida.brand || partida.grupo,
        procedure: partida.licitacion?.number ?? '',
        procedureType: partida.licitacion?.type ?? '',
        warehouseId: partida.warehouseId,
        warehouse: partida.warehouse?.name ?? 'Sin bodega',
        quantity: partida.quantity,
        committed: taken,
        available: Math.max(0, partida.quantity - taken),
      };
    });

    const warehouses = await this.findAll();
    const summary = warehouses.map((warehouse) => {
      const own = rows.filter((row) => row.warehouseId === warehouse.id);
      return {
        ...warehouse,
        partidas: own.length,
        received: own.reduce((sum, row) => sum + row.quantity, 0),
        available: own.reduce((sum, row) => sum + row.available, 0),
      };
    });

    return { summary, rows };
  }
}
