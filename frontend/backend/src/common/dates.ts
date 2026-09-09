/** Utilidades de fecha en formato ISO corto (AAAA-MM-DD), sin zona horaria. */

export const todayISO = (): string => new Date().toISOString().slice(0, 10);

export function isoFromParts(year: number, month: number, day: number): string {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return '';
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2200) return '';
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return '';
  return date.toISOString().slice(0, 10);
}

/** Acepta AAAA-MM-DD, DD/MM/AAAA, DD-MM-AA y seriales de Excel. */
export function parseFlexibleDate(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const iso = raw.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (iso) return isoFromParts(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  const dmy = raw.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (dmy) {
    const year = Number(dmy[3]) < 100 ? 2000 + Number(dmy[3]) : Number(dmy[3]);
    return isoFromParts(year, Number(dmy[2]), Number(dmy[1]));
  }
  const serial = Number(raw.replace(/,/g, ''));
  if (Number.isFinite(serial) && serial >= 20000 && serial <= 80000) {
    return new Date(Date.UTC(1899, 11, 30) + Math.round(serial) * 86400000).toISOString().slice(0, 10);
  }
  return '';
}

const asDate = (value: string) => new Date(`${value}T12:00:00Z`);
const isWeekend = (date: Date) => date.getUTCDay() === 0 || date.getUTCDay() === 6;

/** Suma días hábiles o naturales a partir de una fecha. */
export function addDays(from: string, count: number, business: boolean, holidays: Set<string>): string {
  if (!from) return '';
  const date = asDate(from);
  let remaining = Number(count || 0);
  while (remaining > 0) {
    date.setUTCDate(date.getUTCDate() + 1);
    const iso = date.toISOString().slice(0, 10);
    if (!business || (!isWeekend(date) && !holidays.has(iso))) remaining -= 1;
  }
  return date.toISOString().slice(0, 10);
}

/** Días hábiles transcurridos entre dos fechas. */
export function businessDistance(from: string, to: string, holidays: Set<string>): number {
  if (!from || !to) return 0;
  const cursor = asDate(from);
  const end = asDate(to);
  let count = 0;
  while (cursor < end) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    const iso = cursor.toISOString().slice(0, 10);
    if (!isWeekend(cursor) && !holidays.has(iso)) count += 1;
  }
  return count;
}
