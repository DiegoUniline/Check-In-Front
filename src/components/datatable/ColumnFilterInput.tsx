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
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn('h-7 text-xs px-2', className)}
      onClick={(e) => e.stopPropagation()}
    />
  );
}