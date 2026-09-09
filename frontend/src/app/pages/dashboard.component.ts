import { Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../core/api.service';
import { SessionService } from '../core/session.service';
import { ToastService } from '../core/toast.service';
import { DashboardSummary } from '../core/models';
import { MxnPipe, ShortDatePipe } from '../shared/format.pipe';
import { BadgeComponent } from '../shared/badge.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MxnPipe, ShortDatePipe, BadgeComponent],
  template: `
    <ng-container *ngIf="summary() as data">
      <div class="kpi-grid">
        <article class="kpi">
          <div class="kpi-label">Partidas adjudicadas</div>
          <div class="kpi-value">{{ data.awardedCount }}</div>
          <div class="kpi-note">{{ data.desertCount }} desiertas</div>
        </article>
        <article class="kpi">
          <div class="kpi-label">Unidades individualizadas</div>
          <div class="kpi-value">{{ data.units }}</div>
          <div class="kpi-note">Bienes que requieren control</div>
        </article>
        <article class="kpi good">
          <div class="kpi-label">Con resguardatario</div>
          <div class="kpi-value">{{ data.assigned }}</div>
          <div class="kpi-note">{{ data.units ? (data.assigned / data.units * 100 | number: '1.0-0') : 0 }}% del total</div>
        </article>
        <article class="kpi warn">
          <div class="kpi-label">Pendientes de resguardo</div>
          <div class="kpi-value">{{ data.pending }}</div>
          <div class="kpi-note">Requieren persona responsable</div>
        </article>
        <article class="kpi" [class.danger]="data.overdue" [class.good]="!data.overdue">
          <div class="kpi-label">Importe adjudicado</div>
          <div class="kpi-value">{{ data.amount | mxn }}</div>
          <div class="kpi-note">{{ data.delivered }} entregadas · {{ data.overdue }} vencidas</div>
        </article>
      </div>

      <div class="grid-2">
        <div>
          <article class="card">
            <div class="card-head"><h3>Avance de asignación</h3><p>Bienes con resguardatario frente al total recibido.</p></div>
            <div class="card-body">
              <div *ngFor="let row of data.progress" class="progress-row">
                <div>
                  <strong>{{ row.description }}</strong>
                  <div class="muted">Partida {{ row.number }} · {{ row.procedure }}</div>
                </div>
                <div class="progress-track"><div class="progress-fill" [style.width.%]="row.pct"></div></div>
                <div class="progress-number">{{ row.assigned }}/{{ row.total }}</div>
              </div>
              <div *ngIf="!data.progress.length" class="empty-state">
                <strong>No hay bienes individualizados</strong>Registra una partida adjudicada para comenzar.
              </div>
            </div>
          </article>

          <article class="card">
            <div class="card-head"><h3>Partidas que requieren atención</h3></div>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr><th>Partida</th><th>Bien</th><th>Situación</th><th>Fecha compromiso</th></tr>
                </thead>
                <tbody>
                  <tr *ngFor="let partida of data.priority">
                    <td class="nowrap"><strong>{{ partida.number }}</strong><div class="muted">{{ partida.grupo }}</div></td>
                    <td class="main-cell"><strong>{{ partida.description }}</strong><span>{{ partida.provider }}</span></td>
                    <td><app-badge [label]="partida.delivery.label" [tone]="partida.delivery.tone" /></td>
                    <td class="nowrap">{{ partida.dueDate | shortDate }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </article>
        </div>

        <article class="card">
          <div class="card-head"><h3>Distribución por proveedor</h3></div>
          <div class="card-body">
            <div *ngFor="let provider of data.providers" class="progress-row">
              <div><strong>{{ provider.name }}</strong></div>
              <div class="progress-track">
                <div class="progress-fill" [style.width.%]="provider.count / maxProvider(data) * 100"></div>
              </div>
              <div class="progress-number">{{ provider.count }}</div>
            </div>
          </div>
        </article>
      </div>
    </ng-container>
  `,
})
export class DashboardComponent {
  private readonly api = inject(ApiService);
  private readonly session = inject(SessionService);
  private readonly toasts = inject(ToastService);

  readonly summary = signal<DashboardSummary | null>(null);

  constructor() {
    effect(() => {
      const periodId = this.session.activePeriodId();
      if (!periodId) return;
      this.api.summary(periodId).subscribe({
        next: (data) => this.summary.set(data),
        error: (error) => this.toasts.error(error),
      });
    });
  }

  maxProvider(data: DashboardSummary): number {
    return Math.max(1, ...data.providers.map((provider) => provider.count));
  }
}
