export const normalize = (value: unknown): string =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

export const cleanName = (value: unknown): string => String(value ?? '').trim().replace(/\s+/g, ' ');
