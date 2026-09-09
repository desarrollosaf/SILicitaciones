import { Pipe, PipeTransform } from '@angular/core';

const MXN = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
const DATE = new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

@Pipe({ name: 'mxn', standalone: true })
export class MxnPipe implements PipeTransform {
  transform(value: number | string | null | undefined): string {
    return MXN.format(Number(value ?? 0));
  }
}

@Pipe({ name: 'shortDate', standalone: true })
export class ShortDatePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '—';
    return DATE.format(new Date(`${String(value).slice(0, 10)}T12:00:00`));
  }
}
