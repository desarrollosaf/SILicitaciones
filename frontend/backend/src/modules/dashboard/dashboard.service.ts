import { Injectable } from '@nestjs/common';
import { PartidasService, PartidaView } from '../partidas/partidas.service';

export interface Alert {
  priority: 2 | 3;
  ref: string;
  partidaId: string;
  issue: string;
  action: string;
}

@Injectable()
export class DashboardService {
  constructor(private readonly partidas: PartidasService) {}

  async summary(periodId: string) {
    const rows = await this.partidas.findAll(periodId);
    const awarded = rows.filter((row) => row.result === 'Adjudicada');
    const units = awarded.reduce((sum, row) => sum + (row.unit === 'Servicio' ? 0 : row.quantity), 0);
    const assigned = awarded.reduce((sum, row) => sum + row.committed, 0);

    return {
      awardedCount: awarded.length,
      desertCount: rows.filter((row) => row.result === 'Desierta').length,
      units,
      assigned,
      pending: units - assigned,
      delivered: awarded.filter((row) => row.deliveryDate).length,
      overdue: awarded.filter((row) => row.delivery.rank === 3).length,
      amount: Number(awarded.reduce((sum, row) => sum + row.total, 0).toFixed(2)),
      progress: awarded
        .filter((row) => row.unit !== 'Servicio' && row.quantity)
        .map((row) => ({
          partidaId: row.id,
          description: row.description,
          number: row.number,
          procedure: row.procedureNumber,
          assigned: row.committed,
          total: row.quantity,
          pct: row.quantity ? Math.round((row.committed / row.quantity) * 100) : 0,
        }))
        .sort((a, b) => b.total - b.assigned - (a.total - a.assigned)),
      priority: [...awarded].sort((a, b) => b.delivery.rank - a.delivery.rank).slice(0, 5),
      providers: this.providerDistribution(awarded),
    };
  }

  async alerts(periodId: string): Promise<Alert[]> {
    const rows = await this.partidas.findAll(periodId);
    const alerts: Alert[] = [];

    rows.forEach((row) => {
      const ref = `${row.procedureNumber} · partida ${row.number}`;
      const push = (priority: 2 | 3, issue: string, action: string) => alerts.push({ priority, ref, partidaId: row.id, issue, action });

      if (row.delivery.rank === 3) push(3, row.delivery.label, 'Validar entrega, requerimiento al proveedor y pena convencional.');
      if (row.result === 'Adjudicada' && row.performanceGuarantee === 'Pendiente') push(3, 'Garantía de cumplimiento pendiente', 'Solicitar y registrar la garantía correspondiente.');
      if (row.deliveryDate && row.complianceStatus === 'Pendiente') push(2, 'Carta de cumplimiento pendiente', 'Registrar la carta y anexar el archivo.');
      if (row.complianceStatus === 'Incumplimiento') push(3, 'Incumplimiento documentado', 'Dar seguimiento a las medidas contractuales.');
      if (row.deliveryDate && row.available > 0) push(2, `${row.available} unidad(es) sin resguardatario`, 'Completar la asignación individual de los bienes recibidos.');
      if (row.result === 'Adjudicada' && !row.unitPrice) push(2, 'Precio unitario no capturado', 'Registrar el monto adjudicado para calcular totales y penas.');
    });

    return alerts.sort((a, b) => b.priority - a.priority || a.ref.localeCompare(b.ref));
  }

  private providerDistribution(rows: PartidaView[]) {
    const counts = new Map<string, number>();
    rows.forEach((row) => {
      const key = row.provider || 'Sin proveedor';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return [...counts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }
}
