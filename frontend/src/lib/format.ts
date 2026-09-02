// Display formatting for contract field values. Generated list/detail pages
// call formatValue(value, kind) so dates, booleans, and numbers render
// consistently everywhere without per-page formatting code.

export type FieldKind =
  | 'string'
  | 'text'
  | 'int'
  | 'float'
  | 'boolean'
  | 'datetime'
  | 'date'
  | 'json';

export function formatValue(value: unknown, kind: FieldKind): string {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) {
    return value.length === 0 ? '—' : value.map((item) => formatValue(item, kind)).join(', ');
  }
  switch (kind) {
    case 'boolean':
      return value ? 'Yes' : 'No';
    case 'date': {
      const parsed = new Date(String(value));
      return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleDateString();
    }
    case 'datetime': {
      const parsed = new Date(String(value));
      return Number.isNaN(parsed.getTime())
        ? String(value)
        : parsed.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    }
    case 'float':
      return typeof value === 'number'
        ? value.toLocaleString(undefined, { maximumFractionDigits: 2 })
        : String(value);
    case 'int':
      return typeof value === 'number' ? value.toLocaleString() : String(value);
    case 'json':
      return JSON.stringify(value);
    default:
      return String(value);
  }
}
