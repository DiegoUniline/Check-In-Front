import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface ColumnFilterInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}

export function ColumnFilterInput({
  value,
  onChange,
  placeholder = 'Filtrar...',
  className,
}: ColumnFilterInputProps) {
  return (
    <div className={cn('relative', className)} onClick={(e) => e.stopPropagation()}>
      <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/70" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-8 min-w-[110px] border-border/70 bg-background pl-7 pr-7 text-xs shadow-none focus-visible:ring-1"
        aria-label={placeholder}
      />
      {value && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onChange('');
          }}
          className="absolute right-1.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Limpiar filtro"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
