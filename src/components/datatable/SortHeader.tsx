import { ArrowDown, ArrowUp, ArrowUpDown, Filter, X } from 'lucide-react';
import { TableHead } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { SortDir } from '@/hooks/useDataTable';

interface SortHeaderProps {
  label: string;
  columnKey: string;
  sortKey: string | null;
  sortDir: SortDir;
  onSort: (key: string) => void;
  className?: string;
  align?: 'left' | 'right' | 'center';
  // Filtro opcional integrado en el header
  filterValue?: string;
  onFilterChange?: (v: string) => void;
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
  filterOptions,
  filterPlaceholder,
}: SortHeaderProps) {
  const active = sortKey === columnKey && sortDir;
  const Icon = active ? (sortDir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
  const hasFilter = !!onFilterChange;
  const filterActive = hasFilter && !!filterValue && filterValue.trim() !== '';

  // Valores únicos para mostrar como chips
  const uniqueValues = hasFilter && filterOptions
    ? Array.from(
        new Set(
          filterOptions
            .map(v => (v == null ? '' : String(v).trim()))
            .filter(v => v !== '')
        )
      ).sort((a, b) => a.localeCompare(b, 'es', { numeric: true })).slice(0, 50)
    : [];

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
                  value={filterValue || ''}
                  onChange={(e) => onFilterChange?.(e.target.value)}
                  placeholder={filterPlaceholder || `Filtrar ${label.toLowerCase()}`}
                  className="h-8 text-xs"
                />
                {filterActive && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => onFilterChange?.('')}
                    aria-label="Limpiar filtro"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              {uniqueValues.length > 0 && (
                <div className="max-h-48 overflow-y-auto space-y-0.5 border-t pt-2">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground px-1 pb-1">
                    Valores
                  </div>
                  {uniqueValues.map(v => {
                    const selected = filterValue === v;
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