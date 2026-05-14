import { useEffect, useMemo, useState } from 'react';

export type SortDir = 'asc' | 'desc' | null;

export type ColumnAccessor<T> = (row: T) => unknown;

/**
 * Hook genérico para tablas con:
 * - Selección múltiple por id.
 * - Ordenamiento por columna (toggling asc -> desc -> none).
 * - Filtros por columna (texto que se busca dentro del valor accesor).
 *
 * No renderiza nada — devuelve estado y datos transformados.
 */
export interface UseDataTableOptions {
  /**
   * Si se provee, persiste filtros y orden en localStorage bajo
   * `dt:<storageKey>` para que sobrevivan navegación y recarga.
   */
  storageKey?: string;
}

type PersistedState = {
  sortKey: string | null;
  sortDir: SortDir;
  filters: Record<string, { text?: string; values?: string[] }>;
};

const STORAGE_PREFIX = 'dt:';

function loadPersisted(storageKey?: string): Partial<PersistedState> {
  if (!storageKey || typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return {
      sortKey: typeof parsed.sortKey === 'string' ? parsed.sortKey : null,
      sortDir: parsed.sortDir === 'asc' || parsed.sortDir === 'desc' ? parsed.sortDir : null,
      filters: parsed.filters && typeof parsed.filters === 'object' ? parsed.filters : {},
    };
  } catch {
    return {};
  }
}

export function useDataTable<T extends { id: string }>(
  rows: T[],
  accessors: Record<string, ColumnAccessor<T>>,
  options: UseDataTableOptions = {}
) {
  const { storageKey } = options;
  const initial = useMemo(() => loadPersisted(storageKey), [storageKey]);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<string | null>(initial.sortKey ?? null);
  const [sortDir, setSortDir] = useState<SortDir>(initial.sortDir ?? null);
  // Filtros: cada columna puede tener `text` (búsqueda libre) y/o `values` (multi-select de valores exactos).
  const [filters, setFilters] = useState<Record<string, { text?: string; values?: string[] }>>(
    initial.filters ?? {}
  );

  // Persistir cambios (sólo si hay storageKey)
  useEffect(() => {
    if (!storageKey || typeof window === 'undefined') return;
    try {
      const payload: PersistedState = { sortKey, sortDir, filters };
      window.localStorage.setItem(STORAGE_PREFIX + storageKey, JSON.stringify(payload));
    } catch {
      /* quota / disabled — ignorar */
    }
  }, [storageKey, sortKey, sortDir, filters]);

  const toggleRow = (id: string) =>
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const setRowsSelected = (ids: string[], checked: boolean) =>
    setSelected(prev => {
      const next = new Set(prev);
      ids.forEach(id => (checked ? next.add(id) : next.delete(id)));
      return next;
    });

  const clearSelection = () => setSelected(new Set());

  const toggleSort = (key: string) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir('asc');
      return;
    }
    if (sortDir === 'asc') setSortDir('desc');
    else if (sortDir === 'desc') {
      setSortKey(null);
      setSortDir(null);
    } else setSortDir('asc');
  };

  const setColumnFilter = (key: string, value: string) =>
    setFilters(prev => ({ ...prev, [key]: { ...prev[key], text: value } }));

  const setColumnFilterValues = (key: string, values: string[]) =>
    setFilters(prev => ({ ...prev, [key]: { ...prev[key], values } }));

  const clearFilters = () => setFilters({});

  const resetPersisted = () => {
    setSortKey(null);
    setSortDir(null);
    setFilters({});
    if (storageKey && typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(STORAGE_PREFIX + storageKey);
      } catch {
        /* ignore */
      }
    }
  };

  const processed = useMemo(() => {
    let out = rows;

    // Filtros por columna (texto + multi-select)
    const activeFilters = Object.entries(filters).filter(([, v]) => {
      if (!v) return false;
      const hasText = v.text && v.text.trim() !== '';
      const hasValues = Array.isArray(v.values) && v.values.length > 0;
      return hasText || hasValues;
    });
    if (activeFilters.length > 0) {
      out = out.filter(row =>
        activeFilters.every(([key, f]) => {
          const acc = accessors[key];
          if (!acc) return true;
          const cell = acc(row);
          const cellStr = cell == null ? '' : String(cell);
          if (f.text && f.text.trim() !== '') {
            if (!cellStr.toLowerCase().includes(f.text.toLowerCase())) return false;
          }
          if (Array.isArray(f.values) && f.values.length > 0) {
            if (!f.values.includes(cellStr.trim())) return false;
          }
          return true;
        })
      );
    }

    // Ordenamiento
    if (sortKey && sortDir && accessors[sortKey]) {
      const acc = accessors[sortKey];
      out = [...out].sort((a, b) => {
        const av = acc(a);
        const bv = acc(b);
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        // numérico si ambos son números
        const an = typeof av === 'number' ? av : parseFloat(String(av));
        const bn = typeof bv === 'number' ? bv : parseFloat(String(bv));
        let cmp: number;
        if (!isNaN(an) && !isNaN(bn) && /^-?\d/.test(String(av)) && /^-?\d/.test(String(bv))) {
          cmp = an - bn;
        } else {
          cmp = String(av).localeCompare(String(bv), 'es', { sensitivity: 'base', numeric: true });
        }
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }

    return out;
  }, [rows, accessors, filters, sortKey, sortDir]);

  const allVisibleSelected =
    processed.length > 0 && processed.every(r => selected.has(r.id));
  const someVisibleSelected =
    processed.some(r => selected.has(r.id)) && !allVisibleSelected;

  const toggleSelectAllVisible = (checked: boolean) =>
    setRowsSelected(processed.map(r => r.id), checked);

  const selectedRows = useMemo(
    () => rows.filter(r => selected.has(r.id)),
    [rows, selected]
  );

  return {
    // datos
    processed,
    // selección
    selected,
    selectedRows,
    selectedCount: selected.size,
    toggleRow,
    toggleSelectAllVisible,
    setRowsSelected,
    clearSelection,
    allVisibleSelected,
    someVisibleSelected,
    // sort
    sortKey,
    sortDir,
    toggleSort,
    // filtros
    filters,
    setColumnFilter,
    setColumnFilterValues,
    clearFilters,
    resetPersisted,
  };
}