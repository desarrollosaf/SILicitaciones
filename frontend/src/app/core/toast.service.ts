import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  message: string;
  error: boolean;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);
  private counter = 0;

  show(message: string, error = false): void {
    const toast: Toast = { id: (this.counter += 1), message, error };
    this.toasts.update((items) => [...items, toast]);
    setTimeout(() => this.toasts.update((items) => items.filter((item) => item.id !== toast.id)), 4500);
  }

  /** Traduce el error de la API al mensaje que ya devuelve el backend. */
  error(error: unknown): void {
    const message = (error as any)?.error?.message;
    this.show(Array.isArray(message) ? message.join(' ') : message ?? 'Ocurrió un error inesperado.', true);
  }
}
