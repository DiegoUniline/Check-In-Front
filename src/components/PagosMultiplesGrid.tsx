import { useEffect, useState } from 'react';
import {
  Banknote, CreditCard, Smartphone, Building2, Wallet,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

export interface PagoItem {
  id: string;
  metodo: string;
  monto: number;
  referencia?: string;
}

interface Props {
  total: number;
  pagos: PagoItem[];
  onChange: (pagos: PagoItem[]) => void;
}

function iconoMetodo(nombre: string) {
  const n = nombre.toLowerCase();
  if (n.includes('efectivo') || n.includes('cash')) return Banknote;
  if (n.includes('transfer')) return Building2;
  if (n.includes('débito') || n.includes('debito')) return Wallet;
  if (n.includes('crédito') || n.includes('credito') || n.includes('tarjeta')) return CreditCard;
  if (n.includes('stripe') || n.includes('pago') || n.includes('app') || n.includes('qr')) return Smartphone;
  return CreditCard;
}

export function PagosMultiplesGrid({ total, pagos, onChange }: Props) {
  const [metodos, setMetodos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api.getMetodosPago({ soloActivos: true })
      .then((data) => { if (alive) setMetodos(data || []); })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  // Mapa por método: monto actual ingresado para ese método.
  const montoPorMetodo = (nombre: string): number =>
    pagos
      .filter((p) => p.metodo === nombre)
      .reduce((s, p) => s + (Number(p.monto) || 0), 0);

  const totalPagado = pagos.reduce((s, p) => s + (Number(p.monto) || 0), 0);
  const saldo = Math.max(0, total - totalPagado);

  const setMontoMetodo = (nombre: string, valor: string) => {
    const monto = parseFloat(valor) || 0;
    const existente = pagos.find((p) => p.metodo === nombre);
    if (monto <= 0) {
      // Si lo dejan en 0 o vacío, eliminamos el registro de ese método.
      onChange(pagos.filter((p) => p.metodo !== nombre));
      return;
    }
    if (existente) {
      onChange(pagos.map((p) => (p.metodo === nombre ? { ...p, monto } : p)));
    } else {
      onChange([
        ...pagos,
        { id: crypto.randomUUID(), metodo: nombre, monto },
      ]);
    }
  };

  return (
    <div className="space-y-3">
      {loading ? (
        <div className="text-xs text-muted-foreground py-4 text-center">
          Cargando métodos...
        </div>
      ) : metodos.length === 0 ? (
        <div className="text-xs text-muted-foreground py-4 text-center">
          Sin métodos activos. Crea uno en Catálogos.
        </div>
      ) : (
        <div className="space-y-2">
          {metodos.map((m) => {
            const Icono = iconoMetodo(m.nombre);
            const monto = montoPorMetodo(m.nombre);
            const activo = monto > 0;
            return (
              <div
                key={m.id}
                className={cn(
                  'flex items-center gap-3 rounded-lg border-2 bg-background px-3 py-2.5 transition-all',
                  activo
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/40'
                )}
              >
                <div className={cn(
                  'flex items-center gap-2 flex-1 min-w-0',
                  activo ? 'text-primary' : 'text-foreground'
                )}>
                  <Icono className="h-4 w-4 shrink-0" />
                  <span className="text-sm font-medium truncate">{m.nombre}</span>
                </div>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={monto || ''}
                  onChange={(e) => setMontoMetodo(m.nombre, e.target.value)}
                  className={cn(
                    'h-9 w-32 text-right tabular-nums font-semibold',
                    activo && 'border-primary'
                  )}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Resumen */}
      <div className="rounded-md bg-muted/40 px-3 py-2 space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Pagado</span>
          <span className="font-semibold tabular-nums">${totalPagado.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Saldo</span>
          <span className={cn(
            'font-semibold tabular-nums',
            saldo > 0 ? 'text-amber-600' : 'text-primary'
          )}>
            ${saldo.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}