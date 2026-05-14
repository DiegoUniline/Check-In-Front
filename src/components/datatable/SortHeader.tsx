import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Filter, X } from 'lucide-react';
import { TableHead } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type { SortDir } from '@/hooks/useDataTable';

export type ColumnFilterValue = { text?: string; values?: string[] } | undefined;

interface SortHeaderProps {
  label: string;
  columnKey: string;
  sortKey: string | null;
  sortDir: SortDir;
  onSort: (key: string) => void;
  className?: string;
  align?: 'left' | 'right' | 'center';
  // Filtro opcional integrado en el header
  filterValue?: ColumnFilterValue;
  onFilterChange?: (v: string) => void;
  onValuesChange?: (values: string[]) => void;
  filterOptions?: Array<string | number | null | undefined>;
  filterPlaceholder?: string;
}

export function SortHeader({
  label,
  columnKey,
  sortKey,
  sortDir,
  onSort,
  className,
  align = 'left',
  filterValue,
  onFilterChange,
  onValuesChange,
  filterOptions,
  filterPlaceholder,
}: SortHeaderProps) {
  const active = sortKey === columnKey && sortDir;
  const Icon = active ? (sortDir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
  const hasFilter = !!onFilterChange || !!onValuesChange;
  const textVal = filterValue?.text || '';
  const selectedValues = filterValue?.values || [];
  const filterActive =
    hasFilter && ((textVal.trim() !== '') || selectedValues.length > 0);

  const [search, setSearch] = useState('');

  // Valores únicos
  const uniqueValues = useMemo(() => {
    if (!filterOptions) return [] as string[];
    return Array.from(
      new Set(
        filterOptions
          .map(v => (v == null ? '' : String(v).trim()))
          .filter(v => v !== '')
      )
    ).sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
  }, [filterOptions]);

  const visibleValues = useMemo(() => {
    if (!search.trim()) return uniqueValues;
    const q = search.toLowerCase();
    return uniqueValues.filter(v => v.toLowerCase().includes(q));
  }, [uniqueValues, search]);

  const supportsMulti = !!onValuesChange;
  const allSelected =
    supportsMulti && uniqueValues.length > 0 && uniqueValues.every(v => selectedValues.includes(v));
  const someSelected = supportsMulti && selectedValues.length > 0 && !allSelected;

  const toggleValue = (v: string) => {
    if (!onValuesChange) return;
    if (selectedValues.includes(v)) {
      onValuesChange(selectedValues.filter(x => x !== v));
    } else {
      onValuesChange([...selectedValues, v]);
    }
  };

  const toggleAll = () => {
    if (!onValuesChange) return;
    onValuesChange(allSelected ? [] : uniqueValues);
  };

  const clearAll = () => {
    onFilterChange?.('');
    onValuesChange?.([]);
    setSearch('');
  };

  return (
    <TableHead className={cn('whitespace-nowrap', className)}>
      <div
        className={cn(
          'inline-flex items-center gap-1',
          align === 'right' && 'flex-row-reverse w-full justify-start',
          align === 'center' && 'justify-center w-full'
        )}
      >
        <button
          type="button"
          onClick={() => onSort(columnKey)}
          className={cn(
            'inline-flex items-center gap-1 font-medium hover:text-foreground transition-colors',
            active ? 'text-foreground' : 'text-muted-foreground'
          )}
        >
          <span>{label}</span>
          <Icon className={cn('h-3.5 w-3.5', active ? 'opacity-100' : 'opacity-50')} />
        </button>
        {hasFilter && (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  'relative inline-flex h-5 w-5 items-center justify-center rounded hover:bg-muted transition-colors',
                  filterActive ? 'text-primary' : 'text-muted-foreground/60 hover:text-foreground'
                )}
                aria-label={`Filtrar ${label}`}
              >
                <Filter className="h-3 w-3" />
                {filterActive && (
                  <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-primary" />
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-64 p-2 space-y-2">
              <div className="flex items-center gap-1">
                <Input
                  autoFocus
                  value={supportsMulti ? search : textVal}
                  onChange={(e) => {
                    if (supportsMulti) setSearch(e.target.value);
                    else onFilterChange?.(e.target.value);
                  }}
                  placeholder={
                    filterPlaceholder ||
                    (supportsMulti ? `Buscar ${label.toLowerCase()}` : `Filtrar ${label.toLowerCase()}`)
                  }
                  className="h-8 text-xs"
                />
                {filterActive && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={clearAll}
                    aria-label="Limpiar filtro"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              {supportsMulti && uniqueValues.length > 0 && (
                <div className="border-t pt-2 space-y-1">
                  <label className="flex items-center gap-2 px-1 py-1 rounded hover:bg-muted cursor-pointer">
                    <Checkbox
                      checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                      onCheckedChange={toggleAll}
                    />
                    <span className="text-xs font-medium">
                      {allSelected ? 'Quitar todos' : 'Seleccionar todos'}
                    </span>
                    <span className="ml-auto text-[10px] text-muted-foreground">
                      {selectedValues.length}/{uniqueValues.length}
                    </span>
                  </label>
                  <div className="max-h-56 overflow-y-auto space-y-0.5">
                    {visibleValues.map(v => {
                      const checked = selectedValues.includes(v);
                      return (
                        <label
                          key={v}
                          className={cn(
                            'flex items-center gap-2 px-1 py-1 rounded text-xs cursor-pointer hover:bg-muted',
                            checked && 'bg-primary/5'
                          )}
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggleValue(v)}
                          />
                          <span className="truncate">{v}</span>
                        </label>
                      );
                    })}
                    {visibleValues.length === 0 && (
                      <div className="text-xs text-muted-foreground px-1 py-2 text-center">
                        Sin coincidencias
                      </div>
                    )}
                  </div>
                </div>
              )}
              {!supportsMulti && uniqueValues.length > 0 && (
                <div className="max-h-48 overflow-y-auto space-y-0.5 border-t pt-2">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground px-1 pb-1">
                    Valores
                  </div>
                  {uniqueValues.slice(0, 50).map(v => {
                    const selected = textVal === v;
                    return (
                      <button
                        key={v}
                        type="button"
                        onClick={() => onFilterChange?.(selected ? '' : v)}
                        className={cn(
                          'w-full text-left px-2 py-1 rounded text-xs hover:bg-muted transition-colors truncate',
                          selected && 'bg-primary/10 text-primary font-medium'
                        )}
                      >
                        {v}
                      </button>
                    );
                  })}
                </div>
              )}
            </PopoverContent>
          </Popover>
        )}
      </div>
    </TableHead>
  );
}