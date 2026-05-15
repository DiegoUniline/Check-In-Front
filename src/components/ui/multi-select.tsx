import * as React from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type MultiSelectOption = { value: string; label: string };

interface Props {
  options: MultiSelectOption[];
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  allLabel?: string;
  className?: string;
}

export function MultiSelect({ options, values, onChange, placeholder = 'Seleccionar', allLabel = 'Todos', className }: Props) {
  const allSelected = values.length === 0;
  const toggle = (v: string) => {
    if (values.includes(v)) onChange(values.filter((x) => x !== v));
    else onChange([...values, v]);
  };
  const label = allSelected
    ? allLabel
    : values.length === 1
      ? options.find((o) => o.value === values[0])?.label ?? placeholder
      : `${values.length} seleccionados`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn('justify-between font-normal w-full', className)}>
          <span className="truncate">{label}</span>
          <ChevronDown className="ml-2 h-4 w-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-0" align="start">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <span className="text-xs text-muted-foreground">{values.length} seleccionados</span>
          {values.length > 0 && (
            <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => onChange([])}>
              <X className="h-3 w-3 mr-1" />Limpiar
            </Button>
          )}
        </div>
        <div className="max-h-[260px] overflow-auto py-1">
          {options.length === 0 && (
            <div className="px-3 py-4 text-sm text-muted-foreground text-center">Sin opciones</div>
          )}
          {options.map((o) => {
            const checked = values.includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => toggle(o.value)}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-sm hover:bg-accent text-left"
              >
                <span className={cn('h-4 w-4 border rounded flex items-center justify-center', checked ? 'bg-primary border-primary text-primary-foreground' : 'border-input')}>
                  {checked && <Check className="h-3 w-3" />}
                </span>
                <span className="truncate">{o.label}</span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function MultiSelectChips({ options, values, onRemove }: { options: MultiSelectOption[]; values: string[]; onRemove: (v: string) => void }) {
  if (values.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {values.map((v) => {
        const o = options.find((x) => x.value === v);
        return (
          <Badge key={v} variant="secondary" className="gap-1">
            {o?.label ?? v}
            <button onClick={() => onRemove(v)} className="hover:text-destructive"><X className="h-3 w-3" /></button>
          </Badge>
        );
      })}
    </div>
  );
}