import { Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { SessionService } from '../core/session.service';
import { ToastService } from '../core/toast.service';
import { Dictamen } from '../core/models';
import { MxnPipe, ShortDatePipe } from '../shared/format.pipe';
import { BadgeComponent } from '../shared/badge.component';

const EMPTY: Partial<Dictamen> = {
  folio: '', date: '', requester: '', area: '', object: '',
  estimatedAmount: 0, procedureType: 'Pendiente de definición', status: 'En elaboración',
};

@Component({
  selector: 'app-dictamenes',
  standalone: true,
  imports: [CommonModule, FormsModule, MxnPipe, ShortDatePipe, BadgeComponent],
  template: `
    <div class="heading">
      <div>
        <h2>Dictámenes técnicos</h2>
        <p>Requerimiento que da origen al procedimiento administrativo de compra.</p>
      </div>
      <div class="heading-actions">
        <button class="btn btn-primary" [disabled]="!session.isOpen()" (click)="open()">+ Nuevo dictamen</button>
      </div>
    </div>

    <article class="card">
      <div class="filters">
        <div class="field grow">
          <label>Buscar</label>
          <input class="input" placeholder="Folio, solicitante, área o concepto" [(ngModel)]="search">
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Folio</th><th>Fecha</th><th>Solicitante</th><th>Objeto</th><th class="num">Monto estimado</th><th>Estado</th><th></th></tr>
          </thead>
          <tbody>
            <tr *ngFor="let item of filtered()">
              <td class="nowrap"><strong>{{ item.folio }}</strong><div class="muted">{{ item.fileName || 'Sin archivo' }}</div></td>
              <td class="nowrap">{{ item.date | shortDate }}</td>
              <td><strong>{{ item.requester }}</strong><div class="muted">{{ item.area }}</div></td>
              <td class="main-cell"><strong>{{ item.object }}</strong></td>
              <td class="num nowrap">{{ item.estimatedAmount | mxn }}</td>
              <td><app-badge [label]="item.status" [tone]="item.status === 'Concluido' ? 'green' : item.status === 'En elaboración' ? 'amber' : 'blue'" /></td>
              <td class="nowrap">
                <button class="btn btn-secondary btn-sm" (click)="open(item)">Abrir</button>
                <button class="btn btn-danger btn-sm" [disabled]="!session.isOpen()" (click)="remove(item)">Eliminar</button>
              </td>
            </tr>
            <tr *ngIf="!filtered().length">
              <td colspan="7"><div class="empty-state"><strong>No hay dictámenes en este periodo</strong>Registra el que dará origen a la compra.</div></td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>

    <div class="dialog-backdrop" *ngIf="dialogOpen()">
      <div class="dialog">
        <div class="dialog-header">
          <div><h3>{{ form.id ? form.folio : 'Nuevo dictamen técnico' }}</h3><p>Datos del requerimiento enviado a la Dirección de Recursos Materiales.</p></div>
          <button class="close-button" (click)="dialogOpen.set(false)">×</button>
        </div>
        <div class="dialog-body">
          <div class="field"><label>Folio</label><input class="input" [(ngModel)]="form.folio"></div>
          <div class="field"><label>Fecha</label><input class="input" type="date" [(ngModel)]="form.date"></div>
          <div class="field"><label>Persona solicitante</label><input class="input" [(ngModel)]="form.requester"></div>
          <div class="field"><label>Área solicitante</label><input class="input" [(ngModel)]="form.area"></div>
          <div class="field span-2"><label>Bienes, servicios o licencias requeridas</label><textarea class="textarea" [(ngModel)]="form.object"></textarea></div>
          <div class="field"><label>Monto estimado</label><input class="input" type="number" [(ngModel)]="form.estimatedAmount"></div>
          <div class="field">
            <label>Procedimiento definido por DRM</label>
            <select class="select" [(ngModel)]="form.procedureType">
              <option>Pendiente de definición</option>
              <option>Licitación pública nacional</option>
              <option>Adjudicación directa</option>
            </select>
          </div>
          <div class="field">
            <label>Estado</label>
            <select class="select" [(ngModel)]="form.status">
              <option>En elaboración</option><option>Emitido</option><option>Enviado a DRM</option>
              <option>Procedimiento iniciado</option><option>Concluido</option>
            </select>
          </div>
          <div class="field"><label>Nombre del archivo</label><input class="input" [(ngModel)]="form.fileName"></div>
        </div>
        <div class="dialog-footer">
          <button class="btn btn-secondary" (click)="dialogOpen.set(false)">Cancelar</button>
          <button class="btn btn-primary" [disabled]="!session.isOpen()" (click)="save()">Guardar dictamen</button>
        </div>
      </div>
    </div>
  `,
})
export class DictamenesComponent {
  private readonly api = inject(ApiService);
  private readonly toasts = inject(ToastService);
  readonly session = inject(SessionService);

  readonly rows = signal<Dictamen[]>([]);
  readonly dialogOpen = signal(false);
  search = '';
  form: Partial<Dictamen> = { ...EMPTY };

  constructor() {
    effect(() => { if (this.session.activePeriodId()) this.load(); });
  }

  filtered(): Dictamen[] {
    const term = this.search.trim().toLowerCase();
    if (!term) return this.rows();
    return this.rows().filter((item) =>
      `${item.folio} ${item.requester} ${item.area} ${item.object}`.toLowerCase().includes(term),
    );
  }

  load(): void {
    this.api.dictamenes(this.session.activePeriodId()).subscribe({
      next: (rows) => this.rows.set(rows),
      error: (error) => this.toasts.error(error),
    });
  }

  open(item?: Dictamen): void {
    if (item) {
      this.form = { ...item };
      this.dialogOpen.set(true);
      return;
    }
    this.api.nextDictamenFolio(this.session.activePeriodId()).subscribe({
      next: ({ folio }) => {
        this.form = { ...EMPTY, folio, date: new Date().toISOString().slice(0, 10), periodId: this.session.activePeriodId() };
        this.dialogOpen.set(true);
      },
      error: (error) => this.toasts.error(error),
    });
  }

  save(): void {
    this.api.saveDictamen({ ...this.form, periodId: this.form.periodId ?? this.session.activePeriodId() }).subscribe({
      next: () => { this.dialogOpen.set(false); this.toasts.show('Dictamen guardado.'); this.load(); },
      error: (error) => this.toasts.error(error),
    });
  }

  remove(item: Dictamen): void {
    if (!confirm(`¿Eliminar el dictamen ${item.folio}? Los procedimientos vinculados se conservan, solo se desvinculan.`)) return;
    this.api.deleteDictamen(item.id).subscribe({
      next: () => { this.toasts.show('Dictamen eliminado.'); this.load(); },
      error: (error) => this.toasts.error(error),
    });
  }
}
