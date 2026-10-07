import { useEffect, useState } from 'react';
import {
  Banknote, CreditCard, Smartphone, Building2, Wallet,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/currency';

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
  permitirCambioEfectivo?: boolean;
  efectivoRecibido?: number;
  onEfectivoRecibidoChange?: (monto: number) => void;
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

export function PagosMultiplesGrid({
  total,
  pagos,
  onChange,
  permitirCambioEfectivo = false,
  efectivoRecibido = 0,
  onEfectivoRecibidoChange,
}: Props) {
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
  const excedente = Math.max(0, totalPagado - total);
  const pagoEfectivo = pagos
    .filter((p) => p.metodo.toLowerCase().includes('efectivo'))
    .reduce((s, p) => s + (Number(p.monto) || 0), 0);
  const cambio = pagoEfectivo > 0 ? Math.max(0, efectivoRecibido - pagoEfectivo) : 0;
  const faltaEfectivo = pagoEfectivo > 0 && efectivoRecibido > 0 && efectivoRecibido + 0.009 < pagoEfectivo;

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
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(185px, 1fr))' }}
        >
          {metodos.map((m) => {
            const Icono = iconoMetodo(m.nombre);
            const monto = montoPorMetodo(m.nombre);
            const activo = monto > 0;
            return (
              <div
                key={m.id}
                className={cn(
                  'rounded-lg border-2 bg-background p-2.5 transition-all',
                  activo
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/40'
                )}
              >
                <div className={cn(
                  'mb-1.5 flex min-h-[2.25rem] items-start gap-1.5',
                  activo ? 'text-primary' : 'text-muted-foreground'
                )}>
                  <Icono className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span className="break-words text-xs font-semibold leading-snug" title={m.nombre}>{m.nombre}</span>
                </div>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={monto || ''}
                  onChange={(e) => setMontoMetodo(m.nombre, e.target.value)}
                  className={cn(
                    'h-9 w-full text-right tabular-nums font-semibold',
                    activo && 'border-primary'
                  )}
                />
              </div>
            );
          })}
        </div>
      )}

      {permitirCambioEfectivo && pagoEfectivo > 0 && (
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-muted/30 p-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Efectivo recibido</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={efectivoRecibido || ''}
              placeholder={pagoEfectivo.toFixed(2)}
              onChange={(event) => onEfectivoRecibidoChange?.(Number(event.target.value) || 0)}
              className="h-9 text-right font-semibold tabular-nums"
            />
          </div>
          <div className="flex flex-col justify-end rounded-md bg-background px-3 py-2 text-right">
            <span className="text-xs text-muted-foreground">Cambio a entregar</span>
            <span className={cn('font-semibold tabular-nums', faltaEfectivo ? 'text-destructive' : 'text-foreground')}>
              {formatCurrency(cambio)}
            </span>
          </div>
          {faltaEfectivo && (
            <p className="col-span-2 text-xs font-medium text-destructive">
              El efectivo recibido es menor que el importe asignado a efectivo.
            </p>
          )}
        </div>
      )}

      {/* Resumen */}
      <div className="rounded-md bg-muted/40 px-3 py-2 space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Pagado</span>
          <span className="font-semibold tabular-nums">{formatCurrency(totalPagado)}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Saldo</span>
          <span className={cn(
            'font-semibold tabular-nums',
            saldo > 0 ? 'text-amber-600' : 'text-primary'
          )}>
            {formatCurrency(saldo)}
          </span>
        </div>
        {excedente > 0.009 && (
          <p className="text-xs font-medium text-destructive">
            Los pagos superan el saldo por {formatCurrency(excedente)}. Ajusta los montos.
          </p>
        )}
      </div>
    </div>
  );
}