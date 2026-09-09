import { Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../core/api.service';
import { SessionService } from '../core/session.service';
import { ToastService } from '../core/toast.service';
import { Alert } from '../core/models';
import { BadgeComponent } from '../shared/badge.component';

@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [CommonModule, BadgeComponent],
  template: `
    <div class="heading">
      <div>
        <h2>Alertas y pendientes</h2>
        <p>Situaciones que requieren gestión documental o seguimiento con el proveedor.</p>
      </div>
    </div>

    <article class="card">
      <div class="table-wrap">
        <table>
          <thead><tr><th>Prioridad</th><th>Licitación / partida</th><th>Situación detectada</th><th>Acción sugerida</th></tr></thead>
          <tbody>
            <tr *ngFor="let alert of rows()">
              <td><app-badge [label]="alert.priority === 3 ? 'Alta' : 'Media'" [tone]="alert.priority === 3 ? 'red' : 'amber'" /></td>
              <td><strong>{{ alert.ref }}</strong></td>
              <td>{{ alert.issue }}</td>
              <td>{{ alert.action }}</td>
            </tr>
            <tr *ngIf="!rows().length">
              <td colspan="4"><div class="empty-state"><strong>No hay alertas pendientes</strong>La información registrada está completa.</div></td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>
  `,
})
export class AlertsComponent {
  private readonly api = inject(ApiService);
  private readonly toasts = inject(ToastService);
  private readonly session = inject(SessionService);

  readonly rows = signal<Alert[]>([]);

  constructor() {
    effect(() => {
      const periodId = this.session.activePeriodId();
      if (!periodId) return;
      this.api.alerts(periodId).subscribe({
        next: (rows) => this.rows.set(rows),
        error: (error) => this.toasts.error(error),
      });
    });
  }
}
