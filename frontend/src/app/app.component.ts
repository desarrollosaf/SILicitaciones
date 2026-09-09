import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SessionService } from './core/session.service';
import { ToastService } from './core/toast.service';

const NAV = [
  { path: 'dashboard', label: 'Resumen operativo' },
  { path: 'periodos', label: 'Periodos anuales' },
  { path: 'dictamenes', label: 'Dictámenes técnicos' },
  { path: 'licitaciones', label: 'Procedimientos' },
  { path: 'partidas', label: 'Control de partidas' },
  { path: 'bodegas', label: 'Bodegas' },
  { path: 'memorandums', label: 'Memorándums' },
  { path: 'personas', label: 'Resguardatarios' },
  { path: 'alertas', label: 'Alertas' },
];

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="shell">
      <aside class="sidebar">
        <div class="brand">
          Control de licitaciones
          <span>Dirección de Informática · Recursos Materiales</span>
        </div>
        <a *ngFor="let item of nav"
           class="nav-button"
           [routerLink]="item.path"
           routerLinkActive="active">{{ item.label }}</a>
      </aside>

      <div>
        <header class="topbar">
          <div>
            <h1>Seguimiento de adquisiciones</h1>
            <div class="topbar-sub">Del dictamen técnico a la entrega del bien resguardado</div>
          </div>
          <div class="topbar-actions">
            <div>
              <label for="period">Periodo</label>
              <select id="period" class="select" [value]="session.activePeriodId()" (change)="changePeriod($event)">
                <option *ngFor="let period of session.periods()" [value]="period.id">
                  {{ period.year }} · {{ period.status }}
                </option>
              </select>
            </div>
          </div>
        </header>

        <main>
          <router-outlet />
        </main>
      </div>
    </div>

    <div class="toast-stack">
      <div *ngFor="let toast of toasts.toasts()" class="toast" [class.error]="toast.error">{{ toast.message }}</div>
    </div>
  `,
})
export class AppComponent implements OnInit {
  readonly session = inject(SessionService);
  readonly toasts = inject(ToastService);
  readonly nav = NAV;

  ngOnInit(): void {
    this.session.refresh().catch(() => this.toasts.show('No se pudo conectar con la API.', true));
  }

  changePeriod(event: Event): void {
    this.session.select((event.target as HTMLSelectElement).value);
  }
}
