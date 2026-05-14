/**
 * Exporta un array de objetos a CSV y dispara la descarga.
 * - columns: { key, label } describe qué columnas y en qué orden.
 * - Escapa comillas y maneja valores nulos.
 */
export function exportToCsv<T extends Record<string, any>>(
  filename: string,
  rows: T[],
  columns: Array<{ key: keyof T | string; label: string; accessor?: (row: T) => unknown }>
) {
  const escape = (val: unknown): string => {
    if (val == null) return '';
    const s = String(val);
    if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const header = columns.map(c => escape(c.label)).join(',');
  const body = rows
    .map(row =>
      columns
        .map(c => {
          const val = c.accessor ? c.accessor(row) : (row as any)[c.key];
          return escape(val);
        })
        .join(',')
    )
    .join('\n');

  const csv = `${header}\n${body}`;
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}