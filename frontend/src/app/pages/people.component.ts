import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { ToastService } from '../core/toast.service';
import { ImportResult, Person } from '../core/models';

@Component({
  selector: 'app-people',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="heading">
      <div>
        <h2>Resguardatarios</h2>
        <p>Personas que pueden recibir bienes, con su clave y unidad administrativa.</p>
      </div>
      <div class="heading-actions">
        <button class="btn btn-secondary" (click)="file.click()">Cargar CSV</button>
        <input #file type="file" accept=".csv,text/csv" hidden (change)="importCsv($event)">
        <button class="btn btn-primary" (click)="dialogOpen.set(true)">+ Agregar persona</button>
      </div>
    </div>

    <article class="card">
      <div class="filters">
        <div class="field grow">
          <label>Buscar</label>
          <input class="input" placeholder="Nombre, clave o unidad administrativa" [(ngModel)]="search" (ngModelChange)="load()">
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Nombre</th><th>Clave</th><th>Unidad administrativa</th><th class="num">Bienes</th><th></th></tr></thead>
          <tbody>
            <tr *ngFor="let person of rows()">
              <td><strong>{{ person.name }}</strong></td>
              <td>{{ person.dependencyCode }}</td>
              <td>{{ person.area }}</td>
              <td class="num">{{ person.assignedCount }}</td>
              <td><button class="btn btn-danger btn-sm" (click)="remove(person)">Eliminar</button></td>
            </tr>
            <tr *ngIf="!rows().length">
              <td colspan="5"><div class="empty-state"><strong>No se encontraron personas</strong>Agrega un resguardatario o carga el catálogo CSV.</div></td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>

    <div class="dialog-backdrop" *ngIf="dialogOpen()">
      <div class="dialog dialog-narrow">
        <div class="dialog-header">
          <div><h3>Nuevo resguardatario</h3><p>La clave corresponde a la CVE-ADSC del catálogo institucional.</p></div>
          <button class="close-button" (click)="dialogOpen.set(false)">×</button>
        </div>
        <div class="dialog-body">
          <div class="field span-2"><label>Nombre completo</label><input class="input" [(ngModel)]="form.name"></div>
          <div class="field"><label>Clave (CVE-ADSC)</label><input class="input" [(ngModel)]="form.dependencyCode"></div>
          <div class="field"><label>Unidad administrativa</label><input class="input" [(ngModel)]="form.area"></div>
        </div>
        <div class="dialog-footer">
          <button class="btn btn-secondary" (click)="dialogOpen.set(false)">Cancelar</button>
          <button class="btn btn-primary" (click)="save()">Guardar persona</button>
        </div>
      </div>
    </div>
  `,
})
export class PeopleComponent {
  private readonly api = inject(ApiService);
  private readonly toasts = inject(ToastService);

  readonly rows = signal<Person[]>([]);
  readonly dialogOpen = signal(false);
  search = '';
  form: Partial<Person> = { name: '', dependencyCode: '', area: '' };

  constructor() {
    this.load();
  }

  load(): void {
    this.api.people(this.search).subscribe({ next: (rows) => this.rows.set(rows), error: (e) => this.toasts.error(e) });
  }

  save(): void {
    this.api.savePerson(this.form).subscribe({
      next: () => {
        this.dialogOpen.set(false);
        this.form = { name: '', dependencyCode: '', area: '' };
        this.toasts.show('Resguardatario agregado.');
        this.load();
      },
      error: (error) => this.toasts.error(error),
    });
  }

  remove(person: Person): void {
    if (!confirm(`¿Eliminar a ${person.name} del catálogo?`)) return;
    this.api.deletePerson(person.id).subscribe({
      next: () => { this.toasts.show('Resguardatario eliminado.'); this.load(); },
      error: (error) => this.toasts.error(error),
    });
  }

  async importCsv(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const csv = await file.text();
    input.value = '';
    this.api.importCsv('people', csv).subscribe({
      next: (result: ImportResult) => {
        this.toasts.show(`${result.created} agregadas, ${result.updated} actualizadas, ${result.rejected} rechazadas.`, result.rejected > 0);
        this.load();
      },
      error: (error) => this.toasts.error(error),
    });
  }
}
