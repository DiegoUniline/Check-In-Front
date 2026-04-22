import { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/lib/api';

interface Props {
  value: string;
  onChange: (nombre: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function MetodoPagoSelect({ value, onChange, placeholder = 'Selecciona método', disabled, className }: Props) {
  const [metodos, setMetodos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api.getMetodosPago({ soloActivos: true })
      .then((data) => { if (alive) setMetodos(data); })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled || loading}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={loading ? 'Cargando...' : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {metodos.length === 0 && !loading && (
          <div className="px-2 py-3 text-xs text-muted-foreground">
            Sin métodos. Crea uno en Catálogos.
          </div>
        )}
        {metodos.map((m) => (
          <SelectItem key={m.id} value={m.nombre}>
            {m.nombre}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}