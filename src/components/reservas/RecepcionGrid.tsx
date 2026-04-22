import { useMemo } from 'react';
import { format, parseISO, differenceInDays, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { BedDouble, User, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

interface RecepcionGridProps {
  habitaciones: any[];
  reservas: any[];
  onLibreClick: (habitacion: any) => void;
  onOcupadaClick?: (reserva: any) => void;
  onReservadaClick?: (reserva: any) => void;
}

type EstadoCard = 'libre' | 'reservada' | 'ocupada' | 'mantenimiento';

interface HabitacionStatus {
  habitacion: any;
  estado: EstadoCard;
  reservaActiva?: any;
}

export function RecepcionGrid({
  habitaciones,
  reservas,
  onLibreClick,
  onOcupadaClick,
  onReservadaClick,
}: RecepcionGridProps) {
  const today = startOfDay(new Date());
  const todayStr = format(today, 'yyyy-MM-dd');

  const items: HabitacionStatus[] = useMemo(() => {
    return habitaciones.map((hab) => {
      // Mantenimiento bloquea todo
      if (hab.estado_mantenimiento && hab.estado_mantenimiento !== 'OK') {
        return { habitacion: hab, estado: 'mantenimiento' };
      }

      // Buscar reserva ACTIVA hoy (huésped dentro)
      const ocupada = reservas.find((r) => {
        if (r.habitacion_id !== hab.id) return false;
        if (!['CheckIn', 'Hospedado'].includes(r.estado)) return false;
        if (!r.fecha_checkin || !r.fecha_checkout) return false;
        const cin = r.fecha_checkin.substring(0, 10);
        const cout = r.fecha_checkout.substring(0, 10);
        return todayStr >= cin && todayStr < cout;
      });
      if (ocupada) return { habitacion: hab, estado: 'ocupada', reservaActiva: ocupada };

      // Reservada para hoy (llega hoy, no ha hecho check-in)
      const reservada = reservas.find((r) => {
        if (r.habitacion_id !== hab.id) return false;
        if (!['Pendiente', 'Confirmada'].includes(r.estado)) return false;
        if (!r.fecha_checkin) return false;
        return r.fecha_checkin.substring(0, 10) === todayStr;
      });
      if (reservada) return { habitacion: hab, estado: 'reservada', reservaActiva: reservada };

      return { habitacion: hab, estado: 'libre' };
    });
  }, [habitaciones, reservas, todayStr]);

  const stats = useMemo(() => ({
    libres: items.filter((i) => i.estado === 'libre').length,
    ocupadas: items.filter((i) => i.estado === 'ocupada').length,
    reservadas: items.filter((i) => i.estado === 'reservada').length,
    mantenimiento: items.filter((i) => i.estado === 'mantenimiento').length,
  }), [items]);

  return (
    <div className="space-y-3">
      {/* Leyenda compacta */}
      <div className="flex flex-wrap gap-3 text-xs px-1">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-emerald-500" />
          Libre ({stats.libres})
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-blue-500" />
          Reservada hoy ({stats.reservadas})
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-rose-500" />
          Ocupada ({stats.ocupadas})
        </span>
        {stats.mantenimiento > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-amber-500" />
            Mantenimiento ({stats.mantenimiento})
          </span>
        )}
      </div>

      <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {items.map((item) => (
          <RoomCard
            key={item.habitacion.id}
            item={item}
            onLibreClick={onLibreClick}
            onOcupadaClick={onOcupadaClick}
            onReservadaClick={onReservadaClick}
          />
        ))}
        {items.length === 0 && (
          <div className="col-span-full text-center py-8 text-sm text-muted-foreground">
            No hay habitaciones para mostrar
          </div>
        )}
      </div>
    </div>
  );
}

interface RoomCardProps {
  item: HabitacionStatus;
  onLibreClick: (habitacion: any) => void;
  onOcupadaClick?: (reserva: any) => void;
  onReservadaClick?: (reserva: any) => void;
}

function RoomCard({ item, onLibreClick, onOcupadaClick, onReservadaClick }: RoomCardProps) {
  const { habitacion, estado, reservaActiva } = item;

  const handleClick = () => {
    if (estado === 'libre') return onLibreClick(habitacion);
    if (estado === 'ocupada' && reservaActiva) return onOcupadaClick?.(reservaActiva);
    if (estado === 'reservada' && reservaActiva) return onReservadaClick?.(reservaActiva);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  const styles: Record<EstadoCard, string> = {
    libre: 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-600',
    reservada: 'bg-blue-500 hover:bg-blue-600 text-white border-blue-600',
    ocupada: 'bg-rose-500 hover:bg-rose-600 text-white border-rose-600',
    mantenimiento: 'bg-amber-500 text-white border-amber-600 cursor-not-allowed opacity-80',
  };

  const labels: Record<EstadoCard, string> = {
    libre: 'DISPONIBLE',
    reservada: 'RESERVADA',
    ocupada: 'OCUPADA',
    mantenimiento: 'MANTENIMIENTO',
  };

  // Datos del huésped
  const huesped = reservaActiva
    ? `${reservaActiva.cliente_nombre || ''} ${reservaActiva.apellido_paterno || ''}`.trim()
    : null;

  const saldo = reservaActiva ? Number(reservaActiva.saldo_pendiente) || 0 : 0;
  const personas = reservaActiva
    ? (Number(reservaActiva.adultos) || 0) + (Number(reservaActiva.ninos) || 0)
    : 0;

  // Noches restantes (solo ocupadas)
  let nochesRestantes: number | null = null;
  if (estado === 'ocupada' && reservaActiva?.fecha_checkout) {
    try {
      const out = parseISO(reservaActiva.fecha_checkout.substring(0, 10));
      nochesRestantes = Math.max(0, differenceInDays(out, startOfDay(new Date())));
    } catch {/* ignore */}
  }

  // Hora de llegada (reservadas)
  const horaLlegada = estado === 'reservada' ? reservaActiva?.hora_llegada : null;
  // Hora de checkout (ocupadas)
  const horaCheckout = estado === 'ocupada' && reservaActiva?.fecha_checkout
    ? format(parseISO(reservaActiva.fecha_checkout.substring(0, 10)), 'd MMM', { locale: es })
    : null;

  const isClickable = estado !== 'mantenimiento';

  return (
    <Card
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : -1}
      aria-label={`Habitación ${habitacion.numero} - ${labels[estado]}`}
      onClick={isClickable ? handleClick : undefined}
      onKeyDown={isClickable ? handleKey : undefined}
      className={cn(
        'p-2.5 border-2 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ring focus-visible:outline-none',
        styles[estado]
      )}
    >
      <div className="flex items-start justify-between mb-1">
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold leading-none">Nro: {habitacion.numero}</p>
          <p className="text-[10px] opacity-90 mt-0.5 truncate">
            {habitacion.tipo_nombre || 'Sin tipo'}
          </p>
        </div>
        {estado === 'mantenimiento' ? (
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
        ) : (
          <BedDouble className="h-4 w-4 flex-shrink-0 opacity-90" />
        )}
      </div>

      {/* Info del huésped (ocupada o reservada) */}
      {huesped && (
        <div className="mt-1.5 pt-1.5 border-t border-white/30 space-y-0.5">
          <p className="text-[11px] font-medium truncate flex items-center gap-1">
            <User className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{huesped}</span>
          </p>
          {personas > 0 && (
            <p className="text-[10px] opacity-90">{personas} pax</p>
          )}
          {horaLlegada && (
            <p className="text-[10px] opacity-90 flex items-center gap-1">
              <Clock className="h-2.5 w-2.5" /> Llega {horaLlegada}
            </p>
          )}
          {horaCheckout && nochesRestantes !== null && (
            <p className="text-[10px] opacity-90">
              Sale {horaCheckout} · {nochesRestantes}n
            </p>
          )}
          {saldo > 0 && (
            <p className="text-[10px] font-bold bg-white/20 rounded px-1 py-0.5 inline-block">
              Debe ${saldo.toLocaleString()}
            </p>
          )}
        </div>
      )}

      <div className="mt-1.5 pt-1 border-t border-white/30">
        <p className="text-[9px] font-bold tracking-wide opacity-95">{labels[estado]}</p>
      </div>
    </Card>
  );
}