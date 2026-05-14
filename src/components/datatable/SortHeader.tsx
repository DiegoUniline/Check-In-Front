import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { TableHead } from '@/components/ui/table';
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
}

export function SortHeader({
  label,
  columnKey,
  sortKey,
  sortDir,
  onSort,
  className,
  align = 'left',
}: SortHeaderProps) {
  const active = sortKey === columnKey && sortDir;
  const Icon = active ? (sortDir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <TableHead className={cn('whitespace-nowrap', className)}>
      <button
        type="button"
        onClick={() => onSort(columnKey)}
        className={cn(
          'inline-flex items-center gap-1 font-medium hover:text-foreground transition-colors',
          active ? 'text-foreground' : 'text-muted-foreground',
          align === 'right' && 'flex-row-reverse w-full justify-start',
          align === 'center' && 'justify-center w-full'
        )}
      >
        <span>{label}</span>
        <Icon className={cn('h-3.5 w-3.5', active ? 'opacity-100' : 'opacity-50')} />
      </button>
    </TableHead>
  );
}