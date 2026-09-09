import { Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { SessionService } from '../core/session.service';
import { ToastService } from '../core/toast.service';
import { Licitacion, Memo, MemoAllocation, Partida, Person } from '../core/models';
import { ShortDatePipe } from '../shared/format.pipe';
import { BadgeComponent } from '../shared/badge.component';

@Component({
  selector: 'app-memos',
  standalone: true,
  imports: [CommonModule, FormsModule, ShortDatePipe, BadgeComponent],
  template: `
    <div class="heading">
      <div>
        <h2>Memorándums de salida</h2>
        <p>Solicitud a Recursos Materiales para entregar bienes ya recibidos en bodega.</p>
      </div>
      <div class="heading-actions">
        <button class="btn btn-primary" [disabled]="!session.isOpen()" (click)="open()">+ Generar memorándum</button>
      </div>
    </div>

    <article class="card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Folio</th><th>Fecha</th><th>Procedimiento</th><th>Partidas</th><th>Cantidad</th><th>Estado</th><th></th></tr>
          </thead>
          <tbody>
            <tr *ngFor="let memo of rows()">
              <td class="nowrap"><strong>{{ memo.folio }}</strong><div class="muted">{{ memo.subject }}</div></td>
              <td class="nowrap">{{ memo.date | shortDate }}</td>
              <td class="main-cell"><strong>{{ memo.licitacion?.number || '—' }}</strong><span>{{ memo.licitacion?.type }}</span></td>
              <td>{{ memo.partidasCount }}</td>
              <td><strong>{{ memo.quantity }}</strong> bienes</td>
              <td><app-badge [label]="memo.status" [tone]="tone(memo.status)" /></td>
              <td class="nowrap">
                <button class="btn btn-secondary btn-sm" (click)="print(memo)">Ver memo</button>
                <button class="btn btn-secondary btn-sm" (click)="open(memo)">Seguimiento</button>
                <button class="btn btn-danger btn-sm" [disabled]="!session.isOpen()" (click)="remove(memo)">Eliminar</button>
              </td>
            </tr>
            <tr *ngIf="!rows().length">
              <td colspan="7"><div class="empty-state"><strong>No hay memorándums en este periodo</strong>Genera el primero para solicitar la preparación de bienes.</div></td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>

    <div class="dialog-backdrop" *ngIf="dialogOpen()">
      <div class="dialog">
        <div class="dialog-header">
          <div><h3>{{ form.id ? 'Seguimiento ' + form.folio : 'Generar memorándum de salida' }}</h3><p>Agrega la partida, la persona resguardataria y la cantidad que recibirá.</p></div>
          <button class="close-button" (click)="dialogOpen.set(false)">×</button>
        </div>

        <div class="dialog-body">
          <div class="field"><label>Folio único</label><input class="input" [(ngModel)]="form.folio" readonly></div>
          <div class="field"><label>Fecha</label><input class="input" type="date" [(ngModel)]="form.date"></div>
          <div class="field span-2"><label>Destinataria</label><input class="input" [(ngModel)]="form.recipient"></div>
          <div class="field">
            <label>Estado del memorándum</label>
            <select class="select" [(ngModel)]="form.status">
              <option>Borrador</option><option>Enviado</option><option>Atendido</option><option>Entregado</option><option>Cancelado</option>
            </select>
          </div>
          <div class="field">
            <label>Procedimiento de compra</label>
            <select class="select" [(ngModel)]="form.licitacionId" (ngModelChange)="loadAvailable()">
              <option value="">Selecciona un procedimiento</option>
              <option *ngFor="let lic of licitaciones()" [value]="lic.id">{{ lic.number }}</option>
            </select>
          </div>

          <div class="hint" [class.warn]="!available().length">
            <ng-container *ngIf="available().length; else blocked">
              {{ available().length }} partida(s) con existencia disponible en bodega.
            </ng-container>
            <ng-template #blocked>
              Ninguna partida de este procedimiento puede salir todavía. Motivos detectados: {{ blockedSummary() || 'no hay partidas registradas' }}.
            </ng-template>
          </div>

          <div class="field">
            <label>Partida</label>
            <select class="select" [(ngModel)]="draft.partidaId">
              <option value="">Selecciona una partida</option>
              <option *ngFor="let partida of available()" [value]="partida.id">
                Partida {{ partida.number }} · {{ partida.description }} · {{ partida.available }} disponibles
              </option>
            </select>
          </div>
          <div class="field">
            <label>Persona resguardataria</label>
            <select class="select" [(ngModel)]="draft.personId">
              <option value="">Selecciona una persona</option>
              <option *ngFor="let person of people()" [value]="person.id">{{ person.name }} · {{ person.area }}</option>
            </select>
          </div>
          <div class="field"><label>Cantidad</label><input class="input" type="number" min="1" [(ngModel)]="draft.quantity"></div>
          <div class="field" style="align-self:end"><button class="btn btn-primary" (click)="addAllocation()">Agregar</button></div>

          <div class="field span-2">
            <div class="table-wrap">
              <table>
                <thead><tr><th>Partida</th><th>Persona</th><th class="num">Cantidad</th><th></th></tr></thead>
                <tbody>
                  <tr *ngFor="let item of allocations(); let index = index">
                    <td>{{ label(item) }}</td>
                    <td>{{ personName(item.personId) }}</td>
                    <td class="num">{{ item.quantity }}</td>
                    <td><button class="btn btn-danger btn-sm" (click)="removeAllocation(index)">Quitar</button></td>
                  </tr>
                  <tr *ngIf="!allocations().length">
                    <td colspan="4"><div class="empty-state"><strong>No hay partidas agregadas</strong>Selecciona partida, persona y cantidad.</div></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="dialog-footer">
          <button class="btn btn-secondary" (click)="dialogOpen.set(false)">Cancelar</button>
          <button class="btn btn-primary" [disabled]="!session.isOpen()" (click)="save()">Guardar memorándum</button>
        </div>
      </div>
    </div>
  `,
})
export class MemosComponent {
  private readonly api = inject(ApiService);
  private readonly toasts = inject(ToastService);
  readonly session = inject(SessionService);

  readonly rows = signal<Memo[]>([]);
  readonly licitaciones = signal<Licitacion[]>([]);
  readonly people = signal<Person[]>([]);
  readonly available = signal<Partida[]>([]);
  readonly allPartidas = signal<Partida[]>([]);
  readonly allocations = signal<MemoAllocation[]>([]);
  readonly dialogOpen = signal(false);

  form: Partial<Memo> = {};
  draft = { partidaId: '', personId: '', quantity: 1 };

  constructor() {
    effect(() => { if (this.session.activePeriodId()) this.load(); });
  }

  tone(status: string): 'green' | 'gray' | 'amber' | 'blue' {
    if (status === 'Entregado') return 'green';
    if (status === 'Cancelado') return 'gray';
    if (status === 'Borrador') return 'amber';
    return 'blue';
  }

  load(): void {
    const periodId = this.session.activePeriodId();
    this.api.memos(periodId).subscribe({ next: (rows) => this.rows.set(rows), error: (e) => this.toasts.error(e) });
    this.api.licitaciones(periodId).subscribe({ next: (rows) => this.licitaciones.set(rows) });
    this.api.people().subscribe({ next: (rows) => this.people.set(rows) });
    this.api.partidas(periodId).subscribe({ next: (rows) => this.allPartidas.set(rows) });
  }

  open(memo?: Memo): void {
    if (memo) {
      this.form = { ...memo };
      this.allocations.set(memo.allocations.map((item) => ({ ...item })));
      this.dialogOpen.set(true);
      this.loadAvailable();
      return;
    }
    this.api.nextMemoFolio(this.session.activePeriodId()).subscribe({
      next: ({ folio }) => {
        this.form = {
          folio,
          date: new Date().toISOString().slice(0, 10),
          recipient: 'Martha Maldonado Vilchis',
          status: 'Enviado',
          licitacionId: '',
        };
        this.allocations.set([]);
        this.available.set([]);
        this.dialogOpen.set(true);
      },
      error: (error) => this.toasts.error(error),
    });
  }

  /** Pide al backend las partidas que sí pueden salir del procedimiento elegido. */
  loadAvailable(): void {
    const licitacionId = this.form.licitacionId ?? '';
    if (!licitacionId) { this.available.set([]); return; }
    this.api.availablePartidas(this.session.activePeriodId(), licitacionId, this.form.id).subscribe({
      next: (rows) => this.available.set(rows),
      error: (error) => this.toasts.error(error),
    });
  }

  /** Explica por qué las partidas del procedimiento no aparecen en la lista. */
  blockedSummary(): string {
    const licitacionId = this.form.licitacionId;
    const reasons = this.allPartidas()
      .filter((partida) => partida.licitacionId === licitacionId && partida.blockedReason)
      .reduce((map, partida) => map.set(partida.blockedReason, (map.get(partida.blockedReason) ?? 0) + 1), new Map<string, number>());
    return [...reasons.entries()].map(([reason, count]) => `${count} ${reason}`).join(' · ');
  }

  label(item: MemoAllocation): string {
    const partida = this.allPartidas().find((row) => row.id === item.partidaId);
    return partida ? `Partida ${partida.number} · ${partida.description}` : 'Partida no disponible';
  }

  personName(id: string): string {
    return this.people().find((person) => person.id === id)?.name ?? 'Persona no disponible';
  }

  addAllocation(): void {
    const { partidaId, personId, quantity } = this.draft;
    if (!partidaId || !personId || quantity < 1) {
      this.toasts.show('Selecciona partida, persona y una cantidad válida.', true);
      return;
    }
    const partida = this.available().find((row) => row.id === partidaId);
    const already = this.allocations().filter((item) => item.partidaId === partidaId).reduce((sum, item) => sum + item.quantity, 0);
    if (partida && already + quantity > partida.available) {
      this.toasts.show(`La partida solo tiene ${Math.max(0, partida.available - already)} unidad(es) disponibles.`, true);
      return;
    }
    const existing = this.allocations().find((item) => item.partidaId === partidaId && item.personId === personId);
    this.allocations.update((items) =>
      existing
        ? items.map((item) => (item === existing ? { ...item, quantity: item.quantity + quantity } : item))
        : [...items, { partidaId, personId, quantity }],
    );
    this.draft = { partidaId: '', personId: '', quantity: 1 };
  }

  removeAllocation(index: number): void {
    this.allocations.update((items) => items.filter((_, position) => position !== index));
  }

  save(): void {
    const payload = {
      id: this.form.id,
      periodId: this.session.activePeriodId(),
      licitacionId: this.form.licitacionId,
      folio: this.form.folio,
      date: this.form.date,
      recipient: this.form.recipient,
      status: this.form.status,
      allocations: this.allocations().map((item) => ({ partidaId: item.partidaId, personId: item.personId, quantity: item.quantity })),
    };
    this.api.saveMemo(payload).subscribe({
      next: () => { this.dialogOpen.set(false); this.toasts.show('Memorándum guardado.'); this.load(); },
      error: (error) => this.toasts.error(error),
    });
  }

  remove(memo: Memo): void {
    if (!confirm(`¿Eliminar el memorándum ${memo.folio}? Se liberarán ${memo.quantity} bien(es).`)) return;
    this.api.deleteMemo(memo.id).subscribe({
      next: () => { this.toasts.show('Memorándum eliminado; las cantidades regresaron a disponibilidad.'); this.load(); },
      error: (error) => this.toasts.error(error),
    });
  }

  /** Abre una ventana con el formato oficial listo para imprimir o guardar en PDF. */
  print(memo: Memo): void {
    this.api.printableMemo(memo.id).subscribe({
      next: (data) => {
        const popup = window.open('', '_blank', 'width=900,height=900');
        if (!popup) { this.toasts.show('El navegador bloqueó la ventana de impresión.', true); return; }
        const rows = data.rows
          .map(
            (row: any) => `<tr><td class="num">${row.quantity}</td><td><strong>${row.description}</strong><div>${row.brand ?? ''}</div></td>
              <td>${row.people.map((person: any) => `<div><strong>${person.name} (${person.quantity})</strong><span>${person.area}</span></div>`).join('')}</td></tr>`,
          )
          .join('');
        popup.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8">
          <title>Memorándum ${data.memo.folio}</title>
          <style>body{font-family:Arial,sans-serif;padding:34px;color:#20242a}
          table{width:100%;border-collapse:collapse;margin:20px 0}
          th,td{border:1px solid #222;padding:7px;font-size:12px;vertical-align:top}
          th{background:#d2d2d2}.num{text-align:center;width:12%}
          span{display:block;font-size:10px;color:#444}
          .meta{text-align:right;line-height:1.45}.sign{margin-top:48px;text-align:center}
          @page{size:letter;margin:16mm}</style></head><body>
          <div class="meta">Toluca, Estado de México; ${data.memo.date}<br><strong>Memorándum núm. ${data.memo.folio}</strong></div>
          <p><strong>LICENCIADA<br>${(data.memo.recipient ?? '').toUpperCase()}<br>DIRECTORA DE RECURSOS MATERIALES<br>PRESENTE</strong></p>
          <p>Por medio del presente, solicito se entreguen los bienes a las personas servidoras públicas de acuerdo con la siguiente relación:</p>
          <table><thead><tr><th>Cantidad</th><th>Descripción</th><th>Persona resguardataria</th></tr></thead><tbody>${rows}</tbody></table>
          <p>Sin otro particular por el momento, reciba un cordial saludo.</p>
          <div class="sign"><strong>ATENTAMENTE</strong><br><br><br><strong>DIRECCIÓN DE INFORMÁTICA</strong></div>
          </body></html>`);
        popup.document.close();
        popup.focus();
        setTimeout(() => popup.print(), 250);
      },
      error: (error) => this.toasts.error(error),
    });
  }
}
