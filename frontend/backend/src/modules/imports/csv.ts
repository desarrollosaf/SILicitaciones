import { normalize } from '../../common/text';

/** Lector de CSV tolerante a comillas, saltos de línea y punto y coma. */
export function parseDelimitedRows(text: string): string[][] {
  const clean = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const delimiter = (clean.split('\n')[0].match(/;/g)?.length ?? 0) > (clean.split('\n')[0].match(/,/g)?.length ?? 0) ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < clean.length; index += 1) {
    const char = clean[index];
    if (quoted) {
      if (char === '"' && clean[index + 1] === '"') { cell += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else cell += char;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === delimiter) { row.push(cell); cell = ''; }
    else if (char === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += char;
  }
  row.push(cell);
  rows.push(row);
  return rows.filter((item) => item.some((value) => value.trim() !== ''));
}

/** Convierte el CSV en objetos con encabezados normalizados a snake_case. */
export function parseCsv(text: string): Record<string, string>[] {
  const rows = parseDelimitedRows(text);
  if (!rows.length) return [];
  const headers = rows.shift().map((header) => normalize(header).replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''));
  return rows.map((cells) => Object.fromEntries(headers.map((header, index) => [header, (cells[index] ?? '').trim()])));
}

export function missingColumns(rows: Record<string, string>[], required: string[]): string[] {
  const headers = rows[0] ? Object.keys(rows[0]) : [];
  return required.filter((column) => !headers.includes(column));
}

export function parseNumber(value: unknown): number | null {
  let text = String(value ?? '').trim().replace(/[$%\s]/g, '');
  if (!text) return null;
  text = text.includes(',') && !text.includes('.') ? text.replace(',', '.') : text.replace(/,/g, '');
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}
