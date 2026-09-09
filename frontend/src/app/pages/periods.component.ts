import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { SessionService } from '../core/session.service';
import { ToastService } from '../core/toast.service';
import { ShortDatePipe } from '../shared/format.pipe';
import { BadgeComponent } from '../shared/badge.component';

@Component({
  selector: 'app-periods',
  standalone: true,
  imports: [CommonModule, FormsModule, ShortDatePipe, BadgeComponent],
  template: `
    <div class="heading">
      <div>
        <h2>Periodos anuales</h2>
        <p>Solo un periodo permanece abierto para captura; los cerrados quedan disponibles para consulta.</p>
      </div>
      <div class="heading-actions">
        <button class="btn btn-primary" (click)="openDialog()">+ Crear periodo anual</button>
      </div>
    </div>

    <div class="card-grid">
      <article class="card" *ngFor="let period of session.periods()">
        <div class="card-body">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <h3>{{ period.year }}</h3>
            <app-badge [label]="period.status" [tone]="period.status === 'Abierto' ? 'green' : period.status === 'Planeado' ? 'amber' : 'gray'" />
          </div>
          <p class="muted">Inicio {{ period.startDate | shortDate }} · Cierre {{ period.endDate | shortDate }}</p>
          <div class="heading-actions" style="margin-top:14px">
            <button class="btn btn-secondary btn-sm" (click)="session.select(period.id)">Consultar</button>
            <button class="btn btn-sm" [class.btn-danger]="period.status === 'Abierto'" [class.btn-primary]="period.status !== 'Abierto'" (click)="toggle(period.id)">
              {{ period.status === 'Abierto' ? 'Cerrar periodo' : 'Abrir periodo' }}
            </button>
            <button class="btn btn-danger btn-sm" (click)="remove(period.id, period.year)">Eliminar</button>
          </div>
        </div>
      </article>
    </div>

    <div class="dialog-backdrop" *ngIf="dialogOpen()">
      <div class="dialog dialog-narrow">
        <div class="dialog-header">
          <div><h3>Nuevo periodo anual</h3><p>Se cerrará el periodo abierto actual si eliges abrirlo para captura.</p></div>
          <button class="close-button" (click)="dialogOpen.set(false)">×</button>
        </div>
        <div class="dialog-body">
          <div class="field"><label>Ejercicio</label><input class="input" type="number" [(ngModel)]="form.year"></div>
          <div class="field">
            <label>Estado inicial</label>
            <select class="select" [(ngModel)]="form.status">
              <option value="Abierto">Abrir para captura</option>
              <option value="Planeado">Crear como planeado</option>
            </select>
          </div>
          <div class="field"><label>Inicio</label><input class="input" type="date" [(ngModel)]="form.startDate"></div>
          <div class="field"><label>Cierre previsto</label><input class="input" type="date" [(ngModel)]="form.endDate"></div>
        </div>
        <div class="dialog-footer">
          <button class="btn btn-secondary" (click)="dialogOpen.set(false)">Cancelar</button>
          <button class="btn btn-primary" (click)="save()">Guardar periodo</button>
        </div>
      </div>
    </div>
  `,
})
export class PeriodsComponent {
  private readonly api = inject(ApiService);
  private readonly toasts = inject(ToastService);
  readonly session = inject(SessionService);

  readonly dialogOpen = signal(false);
  form = { year: new Date().getFullYear() + 1, status: 'Abierto', startDate: '', endDate: '' };

  openDialog(): void {
    const year = Math.max(new Date().getFullYear(), ...this.session.periods().map((period) => period.year)) + 1;
    this.form = { year, status: 'Abierto', startDate: `${year}-01-01`, endDate: `${year}-12-31` };
    this.dialogOpen.set(true);
  }

  save(): void {
    this.api.createPeriod(this.form as any).subscribe({
      next: () => {
        this.dialogOpen.set(false);
        this.toasts.show(`Periodo ${this.form.year} creado.`);
        this.session.refresh();
      },
      error: (error) => this.toasts.error(error),
    });
  }

  toggle(id: string): void {
    this.api.togglePeriod(id).subscribe({
      next: () => this.session.refresh(),
      error: (error) => this.toasts.error(error),
    });
  }

  remove(id: string, year: number): void {
    if (!confirm(`¿Eliminar el periodo ${year}? Solo procede si está vacío.`)) return;
    this.api.deletePeriod(id).subscribe({
      next: () => { this.toasts.show(`Periodo ${year} eliminado.`); this.session.refresh(); },
      error: (error) => this.toasts.error(error),
    });
  }
}
