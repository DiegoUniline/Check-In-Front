import { useEffect, useState } from 'react';
import {
  Banknote, CreditCard, Smartphone, Building2, Wallet,
  Trash2, Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

  const totalPagado = pagos.reduce((s, p) => s + (Number(p.monto) || 0), 0);
  const saldo = Math.max(0, total - totalPagado);

  const handleAgregarMetodo = (nombre: string) => {
    // Si es el primer pago, toma todo el saldo restante.
    // Si ya hay otros, agrega con 0 para que el usuario edite.
    const monto = pagos.length === 0 ? total : saldo;
    const nuevo: PagoItem = {
      id: crypto.randomUUID(),
      metodo: nombre,
      monto: monto > 0 ? monto : 0,
    };
    onChange([...pagos, nuevo]);
  };

  const handleEditarMonto = (id: string, valor: string) => {
    const monto = parseFloat(valor) || 0;
    onChange(pagos.map(p => p.id === id ? { ...p, monto } : p));
  };

  const handleEditarReferencia = (id: string, valor: string) => {
    onChange(pagos.map(p => p.id === id ? { ...p, referencia: valor } : p));
  };

  const handleEliminar = (id: string) => {
    onChange(pagos.filter(p => p.id !== id));
  };

  const metodosDisponibles = metodos; // Permite seleccionar el mismo método varias veces

  return (
    <div className="space-y-4">
      {/* Pagos agregados */}
      {pagos.length > 0 && (
        <div className="space-y-2">
          {pagos.map((p) => {
            const Icono = iconoMetodo(p.metodo);
            return (
              <div
                key={p.id}
                className="rounded-lg border bg-background p-3 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <Icono className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-sm font-medium flex-1 truncate">{p.metodo}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => handleEliminar(p.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder="Monto"
                    value={p.monto || ''}
                    onChange={(e) => handleEditarMonto(p.id, e.target.value)}
                    className="h-9"
                  />
                  <Input
                    placeholder="Referencia"
                    value={p.referencia || ''}
                    onChange={(e) => handleEditarReferencia(p.id, e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>
            );
          })}

          <div className="flex items-center justify-between text-xs px-1 pt-1">
            <span className="text-muted-foreground">Pagado</span>
            <span className="font-semibold tabular-nums">${totalPagado.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-xs px-1">
            <span className="text-muted-foreground">Saldo</span>
            <span className={cn(
              'font-semibold tabular-nums',
              saldo > 0 ? 'text-amber-600' : 'text-primary'
            )}>
              ${saldo.toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* Grid de métodos disponibles */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
          <Plus className="h-3 w-3" />
          {pagos.length === 0 ? 'Selecciona método de pago' : 'Agregar otro método'}
        </Label>
        {loading ? (
          <div className="text-xs text-muted-foreground py-2">Cargando métodos...</div>
        ) : metodosDisponibles.length === 0 ? (
          <div className="text-xs text-muted-foreground py-2">
            Sin métodos activos. Crea uno en Catálogos → Métodos de Pago.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {metodosDisponibles.map((m) => {
              const Icono = iconoMetodo(m.nombre);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleAgregarMetodo(m.nombre)}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed bg-background',
                    'px-3 py-3 text-xs font-medium transition-all',
                    'hover:border-primary hover:bg-primary/5 hover:text-primary',
                    'active:scale-95'
                  )}
                >
                  <Icono className="h-5 w-5" />
                  <span className="text-center leading-tight">{m.nombre}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}