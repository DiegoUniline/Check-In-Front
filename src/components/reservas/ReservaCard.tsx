import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { BedDouble, Users, ArrowRight, MoreVertical, CalendarDays } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';
import { getEstadoConfig } from './estadoConfig';

interface ReservaCardProps {
  reserva: any;
  onClick?: (reserva: any) => void;
  onMoreActions?: (reserva: any) => void;
  compact?: boolean;
}

export function ReservaCard({ reserva: r, onClick, onMoreActions, compact }: ReservaCardProps) {
  const cliente = r.cliente_nombre
    || `${r.clientes?.nombre || ''} ${r.clientes?.apellido_paterno || ''}`.trim()
    || 'Sin nombre';
  const habNum = r.habitacion_numero || r.habitaciones?.numero;
  const total = Number(r.total || 0);
  const pagado = Number(r.total_pagado || 0);
  const saldo = Number(r.saldo_pendiente ?? Math.max(0, total - pagado));
  const pax = (Number(r.adultos) || 0) + (Number(r.ninos) || 0);
  const estado = getEstadoConfig(r.estado);
  const EstadoIcon = estado.icon;

  const initials = cliente
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s: string) => s[0]?.toUpperCase())
    .join('') || '?';

  const fmt = (d: string | undefined) =>
    d ? format(new Date(d), 'd MMM', { locale: es }) : '—';

  return (
    <Card
      className={cn(
        'p-3 hover:shadow-md active:scale-[0.99] transition-all cursor-pointer border-l-4 group',
        estado.borderLeft
      )}
      role="button"
      tabIndex={0}
      onClick={() => onClick?.(r)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.(r);
        }
      }}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          'h-10 w-10 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0',
          estado.avatarBg,
          estado.avatarText,
        )}>
          {initials}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate leading-tight">{cliente}</p>
              <p className="text-[11px] font-mono text-muted-foreground mt-0.5 truncate">
                {r.numero_reserva || r.id?.slice(0, 8)}
              </p>
            </div>
            <Badge
              variant="secondary"
              className={cn('flex items-center gap-1 flex-shrink-0 text-[10px] px-1.5 py-0.5', estado.badge)}
            >
              <EstadoIcon className="h-3 w-3" aria-hidden="true" />
              <span>{estado.label}</span>
            </Badge>
          </div>

          {!compact && (
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <BedDouble className="h-3 w-3" />
                {habNum ? `Hab. ${habNum}` : 'Sin asignar'}
              </span>
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                {fmt(r.fecha_checkin)} → {fmt(r.fecha_checkout)}
              </span>
              {pax > 0 && (
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {pax}
                </span>
              )}
              {r.noches ? <span>{r.noches}n</span> : null}
            </div>
          )}

          <div className="flex items-center justify-between gap-2 mt-2">
            <div className="flex items-baseline gap-2 min-w-0">
              <span className="text-sm font-semibold tabular-nums">{formatCurrency(total)}</span>
              {saldo > 0 ? (
                <span className="text-[11px] font-medium text-destructive tabular-nums truncate">
                  Saldo {formatCurrency(saldo)}
                </span>
              ) : total > 0 ? (
                <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  Pagado
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-0.5 flex-shrink-0">
              {onMoreActions && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label="Más acciones"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoreActions(r);
                  }}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              )}
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}