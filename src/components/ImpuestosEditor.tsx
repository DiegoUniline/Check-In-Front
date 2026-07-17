import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { IMPUESTOS_SUGERIDOS, type ImpuestoDefault } from '@/lib/impuestosDefault';

interface Props {
  value: ImpuestoDefault[];
  onChange: (list: ImpuestoDefault[]) => void;
  title?: string;
  hint?: string;
}

export function ImpuestosEditor({ value, onChange, title = 'Impuestos por defecto', hint }: Props) {
  const add = (imp: ImpuestoDefault) => {
    if (value.some((x) => x.nombre.toLowerCase() === imp.nombre.toLowerCase())) return;
    onChange([...value, imp]);
  };
  const remove = (idx: number) => onChange(value.filter((_, i) => i !== idx));
  const update = (idx: number, patch: Partial<ImpuestoDefault>) =>
    onChange(value.map((x, i) => (i === idx ? { ...x, ...patch } : x)));

  return (
    <div className="rounded-md border p-3 space-y-3 bg-muted/20">
      <div>
        <Label className="font-semibold">{title}</Label>
        {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
      </div>

      {value.length === 0 && (
        <p className="text-xs text-muted-foreground italic">
          Sin impuestos. Al crear una reserva no se aplicará ningún impuesto automáticamente.
        </p>
      )}

      {value.map((imp, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <Input
            className="flex-1"
            placeholder="Nombre (ej. IVA)"
            value={imp.nombre}
            onChange={(e) => update(idx, { nombre: e.target.value })}
          />
          <Input
            className="w-24"
            type="number"
            step="0.01"
            min="0"
            placeholder="%"
            value={imp.tasa}
            onChange={(e) => update(idx, { tasa: parseFloat(e.target.value) || 0 })}
          />
          <Button type="button" variant="ghost" size="icon" onClick={() => remove(idx)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}

      <div className="flex flex-wrap gap-2 pt-1">
        {IMPUESTOS_SUGERIDOS.filter(
          (s) => !value.some((v) => v.nombre.toLowerCase() === s.nombre.toLowerCase()),
        ).map((s) => (
          <Badge
            key={s.nombre}
            variant="outline"
            className="cursor-pointer hover:bg-primary/10"
            onClick={() => add(s)}
          >
            <Plus className="h-3 w-3 mr-1" />
            {s.nombre}
          </Badge>
        ))}
        <Badge
          variant="outline"
          className="cursor-pointer hover:bg-primary/10"
          onClick={() => add({ nombre: 'Impuesto', tasa: 0 })}
        >
          <Plus className="h-3 w-3 mr-1" />
          Personalizado
        </Badge>
      </div>
    </div>
  );
}