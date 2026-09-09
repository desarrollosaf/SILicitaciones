import { Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { SessionService } from '../core/session.service';
import { ToastService } from '../core/toast.service';
import { Dictamen, ImportResult, Licitacion } from '../core/models';
import { MxnPipe, ShortDatePipe } from '../shared/format.pipe';

const EMPTY: Partial<Licitacion> = {
  type: 'Licitación pública nacional', number: '', object: '', area: '',
  deliveryDays: 20, dayType: 'business', penaltyPct: 0.1, deliveryPlace: '', dictamenId: null,
};

@Component({
  selector: 'app-licitaciones',
  standalone: true,
  imports: [CommonModule, FormsModule, MxnPipe, ShortDatePipe],
  template: `
    <div class="heading">
      <div>
        <h2>Procedimientos de compra</h2>
        <p>Licitaciones y adjudicaciones directas del periodo, con las reglas que determinan la fecha compromiso.</p>
      </div>
      <div class="heading-actions">
        <button class="btn btn-secondary" (click)="file.click()">Cargar licitaciones CSV</button>
        <input #file type="file" accept=".csv,text/csv" hidden (change)="importCsv($event)">
        <button class="btn btn-primary" [disabled]="!session.isOpen()" (click)="open()">+ Nuevo procedimiento</button>
      </div>
    </div>

    <div class="card-grid">
      <article class="card" *ngFor="let lic of rows()">
        <div class="card-head">
          <h3>{{ lic.number }}</h3>
          <p>{{ lic.object }}</p>
        </div>
        <div class="card-body">
          <p class="muted">Unidad interesada: {{ lic.area || '—' }}</p>
          <p class="muted">Fallo {{ lic.fallDate | shortDate }} · {{ lic.deliveryDays }} días {{ lic.dayType === 'business' ? 'hábiles' : 'naturales' }} · pena {{ lic.penaltyPct }}% diario</p>
          <p><strong>{{ lic.partidasCount }}</strong> partidas · <strong>{{ lic.awardedCount }}</strong> adjudicadas · {{ lic.awardedAmount | mxn }}</p>
          <div class="heading-actions" style="margin-top:12px">
            <button class="btn btn-secondary btn-sm" (click)="open(lic)">Editar</button>
            <button class="btn btn-danger btn-sm" [disabled]="!session.isOpen()" (click)="remove(lic)">Eliminar</button>
          </div>
        </div>
      </article>
      <div *ngIf="!rows().length" class="card"><div class="empty-state"><strong>No hay procedimientos en este periodo</strong>Registra una licitación o adjudicación directa.</div></div>
    </div>

    <div class="dialog-backdrop" *ngIf="dialogOpen()">
      <div class="dialog">
        <div class="dialog-header">
          <div><h3>{{ form.id ? 'Editar procedimiento' : 'Nuevo procedimiento' }}</h3><p>El plazo y el tipo de días determinan la fecha compromiso de cada partida.</p></div>
          <button class="close-button" (click)="dialogOpen.set(false)">×</button>
        </div>
        <div class="dialog-body">
          <div class="field">
            <label>Tipo de procedimiento</label>
            <select class="select" [(ngModel)]="form.type"><option>Licitación pública nacional</option><option>Adjudicación directa</option></select>
          </div>
          <div class="field">
            <label>Dictamen de origen</label>
            <select class="select" [(ngModel)]="form.dictamenId">
              <option [ngValue]="null">Sin vincular</option>
              <option *ngFor="let item of dictamenes()" [ngValue]="item.id">{{ item.folio }} · {{ item.object }}</option>
            </select>
          </div>
          <div class="field span-2"><label>Número de procedimiento</label><input class="input" [(ngModel)]="form.number"></div>
          <div class="field span-2"><label>Objeto</label><textarea class="textarea" [(ngModel)]="form.object"></textarea></div>
          <div class="field span-2"><label>Unidad administrativa interesada</label><input class="input" [(ngModel)]="form.area"></div>
          <div class="field"><label>Fecha de fallo</label><input class="input" type="date" [(ngModel)]="form.fallDate"></div>
          <div class="field"><label>Plazo de entrega</label><input class="input" type="number" min="1" [(ngModel)]="form.deliveryDays"></div>
          <div class="field">
            <label>Tipo de días</label>
            <select class="select" [(ngModel)]="form.dayType"><option value="business">Hábiles</option><option value="calendar">Naturales</option></select>
          </div>
          <div class="field"><label>Pena por día (%)</label><input class="input" type="number" step="0.01" [(ngModel)]="form.penaltyPct"></div>
          <div class="field span-2"><label>Lugar de entrega</label><input class="input" [(ngModel)]="form.deliveryPlace"></div>
        </div>
        <div class="dialog-footer">
          <button class="btn btn-secondary" (click)="dialogOpen.set(false)">Cancelar</button>
          <button class="btn btn-primary" [disabled]="!session.isOpen()" (click)="save()">Guardar procedimiento</button>
        </div>
      </div>
    </div>
  `,
})
export class LicitacionesComponent {
  private readonly api = inject(ApiService);
  private readonly toasts = inject(ToastService);
  readonly session = inject(SessionService);

  readonly rows = signal<Licitacion[]>([]);
  readonly dictamenes = signal<Dictamen[]>([]);
  readonly dialogOpen = signal(false);
  form: Partial<Licitacion> = { ...EMPTY };

  constructor() {
    effect(() => { if (this.session.activePeriodId()) this.load(); });
  }

  load(): void {
    const periodId = this.session.activePeriodId();
    this.api.licitaciones(periodId).subscribe({ next: (rows) => this.rows.set(rows), error: (e) => this.toasts.error(e) });
    this.api.dictamenes(periodId).subscribe({ next: (rows) => this.dictamenes.set(rows) });
  }

  open(lic?: Licitacion): void {
    this.form = lic ? { ...lic } : { ...EMPTY, periodId: this.session.activePeriodId() };
    this.dialogOpen.set(true);
  }

  save(): void {
    this.api.saveLicitacion({ ...this.form, periodId: this.form.periodId ?? this.session.activePeriodId() }).subscribe({
      next: () => { this.dialogOpen.set(false); this.toasts.show('Procedimiento guardado.'); this.load(); },
      error: (error) => this.toasts.error(error),
    });
  }

  remove(lic: Licitacion): void {
    if (!confirm(`¿Eliminar ${lic.number}? También se borrarán sus ${lic.partidasCount ?? 0} partida(s).`)) return;
    this.api.deleteLicitacion(lic.id).subscribe({
      next: () => { this.toasts.show('Procedimiento eliminado.'); this.load(); },
      error: (error) => this.toasts.error(error),
    });
  }

  async importCsv(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const csv = await file.text();
    input.value = '';
    this.api.importCsv('licitaciones', csv, this.session.activePeriodId()).subscribe({
      next: (result: ImportResult) => {
        this.toasts.show(`${result.created} agregadas, ${result.updated} actualizadas, ${result.rejected} rechazadas.`, result.rejected > 0);
        this.load();
      },
      error: (error) => this.toasts.error(error),
    });
  }
}
