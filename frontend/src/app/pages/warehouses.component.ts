import { Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../core/api.service';
import { SessionService } from '../core/session.service';
import { ToastService } from '../core/toast.service';
import { WarehouseBalance } from '../core/models';
import { BadgeComponent } from '../shared/badge.component';

@Component({
  selector: 'app-warehouses',
  standalone: true,
  imports: [CommonModule, BadgeComponent],
  template: `
    <div class="heading">
      <div>
        <h2>Bodegas</h2>
        <p>Existencias derivadas de las partidas recibidas y de los memorándums vigentes.</p>
      </div>
    </div>

    <div class="card-grid" *ngIf="balance() as data">
      <article class="card" *ngFor="let warehouse of data.summary">
        <div class="card-body">
          <h3>{{ warehouse.name }}</h3>
          <p class="muted">{{ warehouse.description }}</p>
          <p>{{ warehouse.partidas }} partidas · {{ warehouse.received }} recibidos · <strong>{{ warehouse.available }}</strong> disponibles</p>
        </div>
      </article>
    </div>

    <article class="card" *ngIf="balance() as data">
      <div class="card-head"><h3>Saldo por partida</h3></div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Partida</th><th>Procedimiento</th><th>Bien</th><th>Bodega</th><th class="num">Recibido</th><th class="num">Comprometido</th><th class="num">Disponible</th></tr>
          </thead>
          <tbody>
            <tr *ngFor="let row of data.rows">
              <td class="nowrap"><strong>{{ row.number }}</strong></td>
              <td class="main-cell"><strong>{{ row.procedure }}</strong><span>{{ row.procedureType }}</span></td>
              <td class="main-cell"><strong>{{ row.description }}</strong><span>{{ row.brand }}</span></td>
              <td>{{ row.warehouse }}</td>
              <td class="num"><strong>{{ row.quantity }}</strong></td>
              <td class="num"><app-badge [label]="row.committed" [tone]="row.committed ? 'amber' : 'gray'" /></td>
              <td class="num"><app-badge [label]="row.available" [tone]="row.available ? 'green' : 'gray'" /></td>
            </tr>
            <tr *ngIf="!data.rows.length">
              <td colspan="7"><div class="empty-state"><strong>No hay partidas recibidas</strong>Captura la fecha de entrega real para que el bien entre a bodega.</div></td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>
  `,
})
export class WarehousesComponent {
  private readonly api = inject(ApiService);
  private readonly toasts = inject(ToastService);
  private readonly session = inject(SessionService);

  readonly balance = signal<WarehouseBalance | null>(null);

  constructor() {
    effect(() => {
      const periodId = this.session.activePeriodId();
      if (!periodId) return;
      this.api.warehouseBalance(periodId).subscribe({
        next: (data) => this.balance.set(data),
        error: (error) => this.toasts.error(error),
      });
    });
  }
}
