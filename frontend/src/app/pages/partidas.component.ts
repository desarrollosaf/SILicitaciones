import { Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { SessionService } from '../core/session.service';
import { ToastService } from '../core/toast.service';
import { ImportResult, Licitacion, Partida, Warehouse } from '../core/models';
import { MxnPipe, ShortDatePipe } from '../shared/format.pipe';
import { BadgeComponent } from '../shared/badge.component';

const EMPTY: Partial<Partida> = {
  number: '', grupo: '', description: '', result: 'Adjudicada', quantity: 1, unit: 'Pieza',
  provider: '', brand: '', unitPrice: 0, contractNumber: '', warranty: '', notes: '',
  performanceGuarantee: 'Pendiente', complianceStatus: 'Pendiente',
};

@Component({
  selector: 'app-partidas',
  standalone: true,
  imports: [CommonModule, FormsModule, MxnPipe, ShortDatePipe, BadgeComponent],
  template: `
    <div class="heading">
      <div>
        <h2>Control de partidas</h2>
        <p>Cada partida guarda su bodega de recepción, la fecha de entrega real y las existencias comprometidas.</p>
      </div>
      <div class="heading-actions">
        <button class="btn btn-secondary" (click)="file.click()">Cargar partidas CSV</button>
        <input #file type="file" accept=".csv,text/csv" hidden (change)="importCsv($event)">
        <button class="btn btn-primary" [disabled]="!session.isOpen()" (click)="open()">+ Nueva partida</button>
      </div>
    </div>

    <article class="card">
      <div class="filters">
        <div class="field grow"><label>Buscar</label><input class="input" placeholder="Partida, bien o proveedor" [(ngModel)]="search"></div>
        <div class="field">
          <label>Licitación</label>
          <select class="select" [(ngModel)]="licFilter" (ngModelChange)="load()">
            <option value="">Todas</option>
            <option *ngFor="let lic of licitaciones()" [value]="lic.id">{{ lic.number }}</option>
          </select>
        </div>
        <div class="field">
          <label>Resultado</label>
          <select class="select" [(ngModel)]="statusFilter">
            <option value="">Todos</option><option>Adjudicada</option><option>Desierta</option><option>Pendiente</option>
          </select>
        </div>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Partida</th><th>Bien</th><th>Cantidad</th><th>Bodega</th><th>Proveedor</th>
              <th class="num">Importe total</th><th>Fecha compromiso</th><th>Situación</th><th>Resguardos</th><th></th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let partida of filtered()">
              <td class="nowrap"><strong>{{ partida.number }}</strong><div class="muted">{{ partida.grupo }}</div></td>
              <td class="main-cell"><strong>{{ partida.description }}</strong><span>{{ partida.brand || 'Marca pendiente' }}</span></td>
              <td>{{ partida.quantity }} {{ partida.unit }}</td>
              <td>{{ partida.warehouseName || 'No aplica' }}</td>
              <td>{{ partida.provider || '—' }}</td>
              <td class="num nowrap">{{ partida.unitPrice ? (partida.total | mxn) : '—' }}</td>
              <td class="nowrap">{{ partida.dueDate | shortDate }}</td>
              <td><app-badge [label]="partida.delivery.label" [tone]="partida.delivery.tone" /></td>
              <td>{{ partida.committed }}/{{ partida.quantity }}</td>
              <td class="nowrap">
                <button class="btn btn-secondary btn-sm" (click)="open(partida)">Abrir</button>
                <button class="btn btn-danger btn-sm" [disabled]="!session.isOpen()" (click)="remove(partida)">Eliminar</button>
              </td>
            </tr>
            <tr *ngIf="!filtered().length">
              <td colspan="10"><div class="empty-state"><strong>No se encontraron partidas</strong>Ajusta los filtros o registra una nueva.</div></td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>

    <div class="dialog-backdrop" *ngIf="dialogOpen()">
      <div class="dialog">
        <div class="dialog-header">
          <div><h3>{{ form.id ? 'Partida ' + form.number : 'Nueva partida' }}</h3><p>Registra la cantidad y la bodega donde se reciben los bienes.</p></div>
          <button class="close-button" (click)="dialogOpen.set(false)">×</button>
        </div>
        <div class="dialog-body">
          <div class="hint warn" *ngIf="form.id && form.blockedReason">
            Esta partida no puede incluirse todavía en un memorándum: {{ form.blockedReason }}.
          </div>

          <div class="field">
            <label>Licitación</label>
            <select class="select" [(ngModel)]="form.licitacionId">
              <option *ngFor="let lic of licitaciones()" [value]="lic.id">{{ lic.number }}</option>
            </select>
          </div>
          <div class="field"><label>Número de partida</label><input class="input" [(ngModel)]="form.number"></div>
          <div class="field span-2"><label>Bien o concepto</label><input class="input" [(ngModel)]="form.description"></div>
          <div class="field"><label>Grupo</label><input class="input" placeholder="Audio, video, informática…" [(ngModel)]="form.grupo"></div>
          <div class="field">
            <label>Resultado</label>
            <select class="select" [(ngModel)]="form.result"><option>Adjudicada</option><option>Desierta</option><option>Pendiente</option></select>
          </div>
          <div class="field"><label>Cantidad</label><input class="input" type="number" min="1" [(ngModel)]="form.quantity"></div>
          <div class="field">
            <label>Unidad de medida</label>
            <select class="select" [(ngModel)]="form.unit"><option>Pieza</option><option>Kit</option><option>Par</option><option>Combo</option><option>Servicio</option></select>
          </div>
          <div class="field span-2">
            <label>Bodega de recepción</label>
            <select class="select" [(ngModel)]="form.warehouseId">
              <option [ngValue]="null">Selecciona una bodega</option>
              <option *ngFor="let warehouse of warehouses()" [value]="warehouse.id">{{ warehouse.name }}</option>
            </select>
          </div>
          <div class="field span-2"><label>Proveedor adjudicado</label><input class="input" [(ngModel)]="form.provider"></div>
          <div class="field"><label>Marca y modelo</label><input class="input" [(ngModel)]="form.brand"></div>
          <div class="field"><label>Precio unitario sin IVA</label><input class="input" type="number" step="0.01" [(ngModel)]="form.unitPrice"></div>
          <div class="hint">
            Subtotal {{ subtotal() | mxn }} · IVA {{ subtotal() * 0.16 | mxn }} · Total {{ subtotal() * 1.16 | mxn }}
          </div>
          <div class="field"><label>Fecha de fallo</label><input class="input" type="date" [(ngModel)]="form.fallDate"></div>
          <div class="field"><label>Número de contrato</label><input class="input" [(ngModel)]="form.contractNumber"></div>
          <div class="field"><label>Fecha de firma del contrato</label><input class="input" type="date" [(ngModel)]="form.contractDate"></div>
          <div class="field"><label>Fecha de entrega real</label><input class="input" type="date" [(ngModel)]="form.deliveryDate"></div>
          <div class="field">
            <label>Garantía de cumplimiento</label>
            <select class="select" [(ngModel)]="form.performanceGuarantee"><option>Pendiente</option><option>Entregada</option><option>No aplica</option></select>
          </div>
          <div class="field">
            <label>Carta de cumplimiento</label>
            <select class="select" [(ngModel)]="form.complianceStatus"><option>Pendiente</option><option>Cumplimiento</option><option>Incumplimiento</option><option>No aplica</option></select>
          </div>
          <div class="field"><label>Garantía del fabricante</label><input class="input" placeholder="Ej. 3 años" [(ngModel)]="form.warranty"></div>
          <div class="field span-2"><label>Observaciones</label><textarea class="textarea" [(ngModel)]="form.notes"></textarea></div>
        </div>
        <div class="dialog-footer">
          <button class="btn btn-secondary" (click)="dialogOpen.set(false)">Cancelar</button>
          <button class="btn btn-primary" [disabled]="!session.isOpen()" (click)="save()">Guardar partida</button>
        </div>
      </div>
    </div>
  `,
})
export class PartidasComponent {
  private readonly api = inject(ApiService);
  private readonly toasts = inject(ToastService);
  readonly session = inject(SessionService);

  readonly rows = signal<Partida[]>([]);
  readonly licitaciones = signal<Licitacion[]>([]);
  readonly warehouses = signal<Warehouse[]>([]);
  readonly dialogOpen = signal(false);

  search = '';
  /** El filtro se conserva entre recargas; en la versión original se reiniciaba solo. */
  licFilter = '';
  statusFilter = '';
  form: Partial<Partida> = { ...EMPTY };

  constructor() {
    effect(() => { if (this.session.activePeriodId()) this.load(); });
    this.api.warehouses().subscribe({ next: (rows) => this.warehouses.set(rows) });
  }

  filtered(): Partida[] {
    const term = this.search.trim().toLowerCase();
    return this.rows().filter((partida) => {
      const haystack = `${partida.number} ${partida.description} ${partida.provider} ${partida.grupo}`.toLowerCase();
      return (!term || haystack.includes(term)) && (!this.statusFilter || partida.result === this.statusFilter);
    });
  }

  subtotal(): number {
    return Number(this.form.quantity ?? 0) * Number(this.form.unitPrice ?? 0);
  }

  load(): void {
    const periodId = this.session.activePeriodId();
    this.api.partidas(periodId, this.licFilter || undefined).subscribe({
      next: (rows) => this.rows.set(rows),
      error: (error) => this.toasts.error(error),
    });
    this.api.licitaciones(periodId).subscribe({ next: (rows) => this.licitaciones.set(rows) });
  }

  open(partida?: Partida): void {
    if (!partida && !this.licitaciones().length) {
      this.toasts.show('Registra primero un procedimiento de compra; la partida debe pertenecer a uno.', true);
      return;
    }
    this.form = partida ? { ...partida } : { ...EMPTY, licitacionId: this.licitaciones()[0].id };
    this.dialogOpen.set(true);
  }

  save(): void {
    this.api.savePartida(this.form).subscribe({
      next: () => { this.dialogOpen.set(false); this.toasts.show('Partida guardada.'); this.load(); },
      error: (error) => this.toasts.error(error),
    });
  }

  remove(partida: Partida): void {
    if (!confirm(`¿Eliminar la partida ${partida.number} · ${partida.description}?`)) return;
    this.api.deletePartida(partida.id).subscribe({
      next: () => { this.toasts.show('Partida eliminada.'); this.load(); },
      error: (error) => this.toasts.error(error),
    });
  }

  async importCsv(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const csv = await file.text();
    input.value = '';
    this.api.importCsv('partidas', csv, this.session.activePeriodId()).subscribe({
      next: (result: ImportResult) => {
        this.toasts.show(
          `${result.created} agregadas, ${result.updated} actualizadas, ${result.rejected} rechazadas. ${result.notes.slice(0, 2).join(' ')}`,
          result.rejected > 0,
        );
        this.load();
      },
      error: (error) => this.toasts.error(error),
    });
  }
}
