import { Injectable, computed, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import { Period } from './models';

/**
 * Periodo activo y catálogo de periodos. Sustituye al estado global que la
 * versión de archivo único guardaba en localStorage.
 */
@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly api = inject(ApiService);

  readonly periods = signal<Period[]>([]);
  readonly activePeriodId = signal<string>(localStorage.getItem('activePeriodId') ?? '');

  readonly activePeriod = computed(() => this.periods().find((period) => period.id === this.activePeriodId()) ?? null);
  readonly isOpen = computed(() => this.activePeriod()?.status === 'Abierto');

  async refresh(): Promise<void> {
    const periods = await this.load();
    this.periods.set(periods);
    const current = this.activePeriodId();
    if (!periods.some((period) => period.id === current)) {
      const fallback = periods.find((period) => period.status === 'Abierto') ?? periods[0];
      if (fallback) this.select(fallback.id);
    }
  }

  select(id: string): void {
    this.activePeriodId.set(id);
    localStorage.setItem('activePeriodId', id);
  }

  private load(): Promise<Period[]> {
    return new Promise((resolve, reject) => this.api.periods().subscribe({ next: resolve, error: reject }));
  }
}
