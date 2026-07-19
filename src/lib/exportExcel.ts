import * as XLSX from 'xlsx';
import { formatDate, formatDateTime } from '@/lib/dateFormat';

export type Row = Record<string, any>;

function normalize(value: any): any {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return formatDateTime(value);
  if (typeof value === 'object') return JSON.stringify(value);
  return value;
}

export interface ExportOptions {
  filename?: string;
  sheetName?: string;
  columns?: { key: string; label: string; format?: (v: any, row: Row) => any }[];
}

/** Export any array of rows to .xlsx. If columns are omitted, all keys are used. */
export function exportToExcel(rows: Row[], opts: ExportOptions = {}) {
  const { filename = 'export', sheetName = 'Datos', columns } = opts;

  const data = rows.map((row) => {
    if (!columns) {
      const out: Row = {};
      Object.keys(row).forEach((k) => (out[k] = normalize(row[k])));
      return out;
    }
    const out: Row = {};
    columns.forEach(({ key, label, format }) => {
      const raw = key.split('.').reduce<any>((acc, k) => (acc == null ? acc : acc[k]), row);
      out[label] = normalize(format ? format(raw, row) : raw);
    });
    return out;
  });

  const ws = XLSX.utils.json_to_sheet(data);
  // Auto column widths
  const headers = Object.keys(data[0] || {});
  ws['!cols'] = headers.map((h) => ({
    wch: Math.min(
      40,
      Math.max(h.length, ...data.map((r) => String(r[h] ?? '').length)) + 2,
    ),
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));

  const stamp = formatDate(new Date()).replace(/\//g, '-');
  XLSX.writeFile(wb, `${filename}_${stamp}.xlsx`);
}

/** Multi-sheet export for full backups. */
export function exportSheetsToExcel(
  sheets: { name: string; rows: Row[]; columns?: ExportOptions['columns'] }[],
  filename = 'backup',
) {
  const wb = XLSX.utils.book_new();
  sheets.forEach(({ name, rows, columns }) => {
    const data = rows.map((row) => {
      if (!columns) {
        const out: Row = {};
        Object.keys(row).forEach((k) => (out[k] = normalize(row[k])));
        return out;
      }
      const out: Row = {};
      columns.forEach(({ key, label, format }) => {
        const raw = key.split('.').reduce<any>((acc, k) => (acc == null ? acc : acc[k]), row);
        out[label] = normalize(format ? format(raw, row) : raw);
      });
      return out;
    });
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
  });
  const stamp = formatDate(new Date()).replace(/\//g, '-');
  XLSX.writeFile(wb, `${filename}_${stamp}.xlsx`);
}
