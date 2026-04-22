import { useMemo, useState } from 'react';
import { format, parseISO, differenceInDays, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  BedDouble, User, Clock, AlertCircle, LayoutGrid, List,
  CheckCircle2, CalendarClock, DoorOpen, Wrench, Users as UsersIcon,
  Wallet, MoonStar, ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

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

const ESTADO_META: Record<EstadoCard, {
  label: string;
  short: string;
  dot: string;
  badge: string;
  cardBg: string;
  cardBorder: string;
  cardHover: string;
  iconBg: string;
  iconColor: string;
  textPrimary: string;
  textMuted: string;
  textStrong: string;
  divider: string;
  ctaBg: string;
  icon: typeof CheckCircle2;
}> = {
  libre: {
    label: 'Disponible',
    short: 'Libre',
    dot: 'bg-emerald-500',
    badge: 'bg-white/95 text-emerald-700 border-white/40 shadow-sm',
    cardBg: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
    cardBorder: 'border-emerald-700/40',
    cardHover: 'hover:from-emerald-500 hover:to-emerald-700 hover:shadow-emerald-500/30',
    iconBg: 'bg-white/15',
    iconColor: 'text-white',
    textPrimary: 'text-white',
    textMuted: 'text-emerald-50/80',
    textStrong: 'text-white',
    divider: 'border-white/20',
    ctaBg: 'bg-white/10 hover:bg-white/20',
    icon: CheckCircle2,
  },
  reservada: {
    label: 'Reservada hoy',
    short: 'Reservada',
    dot: 'bg-blue-500',
    badge: 'bg-white/95 text-blue-700 border-white/40 shadow-sm',
    cardBg: 'bg-gradient-to-br from-blue-500 to-blue-600',
    cardBorder: 'border-blue-700/40',
    cardHover: 'hover:from-blue-500 hover:to-blue-700 hover:shadow-blue-500/30',
    iconBg: 'bg-white/15',
    iconColor: 'text-white',
    textPrimary: 'text-white',
    textMuted: 'text-blue-50/80',
    textStrong: 'text-white',
    divider: 'border-white/20',
    ctaBg: 'bg-white/10 hover:bg-white/20',
    icon: CalendarClock,
  },
  ocupada: {
    label: 'Ocupada',
    short: 'Ocupada',
    dot: 'bg-rose-500',
    badge: 'bg-white/95 text-rose-700 border-white/40 shadow-sm',
    cardBg: 'bg-gradient-to-br from-rose-500 to-rose-600',
    cardBorder: 'border-rose-700/40',
    cardHover: 'hover:from-rose-500 hover:to-rose-700 hover:shadow-rose-500/30',
    iconBg: 'bg-white/15',
    iconColor: 'text-white',
    textPrimary: 'text-white',
    textMuted: 'text-rose-50/80',
    textStrong: 'text-white',
    divider: 'border-white/20',
    ctaBg: 'bg-white/10 hover:bg-white/20',
    icon: DoorOpen,
  },
  mantenimiento: {
    label: 'Mantenimiento',
    short: 'Mantto.',
    dot: 'bg-amber-500',
    badge: 'bg-white/95 text-amber-700 border-white/40 shadow-sm',
    cardBg: 'bg-gradient-to-br from-amber-500 to-amber-600',
    cardBorder: 'border-amber-700/40',
    cardHover: '',
    iconBg: 'bg-white/15',
    iconColor: 'text-white',
    textPrimary: 'text-white',
    textMuted: 'text-amber-50/80',
    textStrong: 'text-white',
    divider: 'border-white/20',
    ctaBg: '',
    icon: Wrench,
  },
};

export function RecepcionGrid({
  habitaciones,
  reservas,
  onLibreClick,
  onOcupadaClick,
  onReservadaClick,
}: RecepcionGridProps) {
  const [vista, setVista] = useState<'cards' | 'tabla'>('cards');
  const todayStr = format(startOfDay(new Date()), 'yyyy-MM-dd');

  const items: HabitacionStatus[] = useMemo(() => {
    return habitaciones.map((hab) => {
      if (hab.estado_mantenimiento && hab.estado_mantenimiento !== 'OK') {
        return { habitacion: hab, estado: 'mantenimiento' };
      }
      const ocupada = reservas.find((r) => {
        if (r.habitacion_id !== hab.id) return false;
        if (!['CheckIn', 'Hospedado'].includes(r.estado)) return false;
        if (!r.fecha_checkin || !r.fecha_checkout) return false;
        return todayStr >= r.fecha_checkin.substring(0, 10) && todayStr < r.fecha_checkout.substring(0, 10);
      });
      if (ocupada) return { habitacion: hab, estado: 'ocupada', reservaActiva: ocupada };

      const reservada = reservas.find((r) => {
        if (r.habitacion_id !== hab.id) return false;
        if (!['Pendiente', 'Confirmada'].includes(r.estado)) return false;
        return r.fecha_checkin?.substring(0, 10) === todayStr;
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

  const handleClick = (item: HabitacionStatus) => {
    if (item.estado === 'libre') return onLibreClick(item.habitacion);
    if (item.estado === 'ocupada' && item.reservaActiva) return onOcupadaClick?.(item.reservaActiva);
    if (item.estado === 'reservada' && item.reservaActiva) return onReservadaClick?.(item.reservaActiva);
  };

  return (
    <div className="space-y-3">
      {/* Toolbar: leyenda + toggle vista */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex flex-wrap gap-2">
          {(['libre', 'reservada', 'ocupada', 'mantenimiento'] as EstadoCard[]).map((e) => {
            const count = (stats as any)[e === 'libre' ? 'libres' : e === 'reservada' ? 'reservadas' : e === 'ocupada' ? 'ocupadas' : 'mantenimiento'];
            if (e === 'mantenimiento' && count === 0) return null;
            const meta = ESTADO_META[e];
            return (
              <div
                key={e}
                className="flex items-center gap-2 px-2.5 py-1 rounded-full border bg-card text-xs font-medium"
              >
                <span className={cn('h-2 w-2 rounded-full', meta.dot)} />
                <span className="text-muted-foreground">{meta.label}</span>
                <span className="font-semibold text-foreground tabular-nums">{count}</span>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-1 p-0.5 bg-muted rounded-lg">
          <Button
            variant={vista === 'cards' ? 'default' : 'ghost'}
            size="sm"
            className="h-7 px-2.5"
            onClick={() => setVista('cards')}
          >
            <LayoutGrid className="h-3.5 w-3.5 mr-1" />
            <span className="text-xs">Cards</span>
          </Button>
          <Button
            variant={vista === 'tabla' ? 'default' : 'ghost'}
            size="sm"
            className="h-7 px-2.5"
            onClick={() => setVista('tabla')}
          >
            <List className="h-3.5 w-3.5 mr-1" />
            <span className="text-xs">Tabla</span>
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <Card className="p-12 text-center">
          <BedDouble className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No hay habitaciones para mostrar</p>
        </Card>
      ) : vista === 'cards' ? (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {items.map((item) => (
            <RoomCard key={item.habitacion.id} item={item} onClick={() => handleClick(item)} />
          ))}
        </div>
      ) : (
        <RoomTable items={items} onRowClick={handleClick} />
      )}
    </div>
  );
}

/* ---------------- CARD ---------------- */

function RoomCard({ item, onClick }: { item: HabitacionStatus; onClick: () => void }) {
  const { habitacion, estado, reservaActiva } = item;
  const meta = ESTADO_META[estado];
  const Icon = meta.icon;

  const huesped = reservaActiva
    ? `${reservaActiva.cliente_nombre || ''} ${reservaActiva.apellido_paterno || ''}`.trim()
    : null;
  const saldo = reservaActiva ? Number(reservaActiva.saldo_pendiente) || 0 : 0;
  const personas = reservaActiva
    ? (Number(reservaActiva.adultos) || 0) + (Number(reservaActiva.ninos) || 0)
    : 0;

  let nochesRestantes: number | null = null;
  if (estado === 'ocupada' && reservaActiva?.fecha_checkout) {
    try {
      const out = parseISO(reservaActiva.fecha_checkout.substring(0, 10));
      nochesRestantes = Math.max(0, differenceInDays(out, startOfDay(new Date())));
    } catch {/* ignore */}
  }

  const horaLlegada = estado === 'reservada' ? reservaActiva?.hora_llegada : null;
  const fechaSalida = estado === 'ocupada' && reservaActiva?.fecha_checkout
    ? format(parseISO(reservaActiva.fecha_checkout.substring(0, 10)), 'd MMM', { locale: es })
    : null;

  const isClickable = estado !== 'mantenimiento';

  const handleKey = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && isClickable) {
      e.preventDefault();
      onClick();
    }
  };

  const ctaLabel = estado === 'libre'
    ? 'Check-in directo'
    : estado === 'reservada'
    ? 'Ver reserva'
    : estado === 'ocupada'
    ? 'Ver detalle'
    : 'Bloqueada';

  return (
    <div
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : -1}
      aria-label={`Habitación ${habitacion.numero} - ${meta.label}`}
      onClick={isClickable ? onClick : undefined}
      onKeyDown={handleKey}
      className={cn(
        'group relative overflow-hidden rounded-lg transition-all duration-300 border',
        'aspect-[1.618/1]',
        meta.cardBg,
        meta.cardBorder,
        meta.textPrimary,
        'shadow-md',
        isClickable && 'cursor-pointer hover:shadow-xl hover:-translate-y-1',
        isClickable && meta.cardHover,
        !isClickable && 'cursor-not-allowed',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2'
      )}
    >
      {/* Decoración: número grande de fondo */}
      <div
        aria-hidden
        className={cn(
          'absolute -right-4 -bottom-6 text-[7rem] font-black leading-none select-none pointer-events-none',
          'opacity-10 tracking-tighter'
        )}
      >
        {habitacion.numero}
      </div>

      {/* Brillo decorativo */}
      <div
        aria-hidden
        className="absolute -top-12 -left-12 h-32 w-32 rounded-full bg-white/10 blur-2xl pointer-events-none"
      />

      <div className="relative h-full p-4 flex flex-col justify-between">
        {/* Top row: Hab + Badge */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0', meta.iconBg)}>
              <BedDouble className={cn('h-5 w-5', meta.iconColor)} />
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-1">
                <span className={cn('text-[10px] font-semibold uppercase tracking-wider', meta.textMuted)}>
                  Hab.
                </span>
                <span className={cn('text-xl font-black leading-none tabular-nums', meta.textStrong)}>
                  {habitacion.numero}
                </span>
              </div>
              <p className={cn('text-[11px] mt-0.5 truncate', meta.textMuted)}>
                {habitacion.tipo_nombre || 'Sin tipo'}
                {habitacion.piso != null && ` · P${habitacion.piso}`}
              </p>
            </div>
          </div>

          <Badge variant="outline" className={cn('gap-1 text-[9px] font-bold border px-2 py-0.5 flex-shrink-0', meta.badge)}>
            <Icon className="h-2.5 w-2.5" />
            {meta.short.toUpperCase()}
          </Badge>
        </div>

        {/* Mid: Info huésped o estado vacío */}
        <div className="flex-1 flex flex-col justify-center min-h-0 my-1">
          {huesped ? (
            <div className="space-y-1">
              <p className={cn('text-sm font-bold truncate flex items-center gap-1.5', meta.textStrong)}>
                <User className="h-3.5 w-3.5 opacity-80 flex-shrink-0" />
                <span className="truncate">{huesped}</span>
              </p>
              <div className={cn('flex flex-wrap gap-x-2.5 gap-y-0.5 text-[10px] font-medium', meta.textMuted)}>
                {personas > 0 && (
                  <span className="flex items-center gap-1">
                    <UsersIcon className="h-2.5 w-2.5" />
                    {personas} pax
                  </span>
                )}
                {nochesRestantes !== null && (
                  <span className="flex items-center gap-1">
                    <MoonStar className="h-2.5 w-2.5" />
                    {nochesRestantes}n
                  </span>
                )}
                {horaLlegada && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" />
                    {horaLlegada}
                  </span>
                )}
                {fechaSalida && (
                  <span className="flex items-center gap-1">
                    <ArrowRight className="h-2.5 w-2.5" />
                    {fechaSalida}
                  </span>
                )}
              </div>
              {saldo > 0 && (
                <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/20 backdrop-blur-sm w-fit">
                  <Wallet className="h-2.5 w-2.5" />
                  <span className={cn('text-[10px] font-bold tabular-nums', meta.textStrong)}>
                    Debe ${saldo.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          ) : estado === 'libre' ? (
            <p className={cn('text-xs italic', meta.textMuted)}>
              Lista para recibir huéspedes
            </p>
          ) : estado === 'mantenimiento' ? (
            <div className="flex items-center gap-1.5">
              <AlertCircle className={cn('h-3.5 w-3.5 flex-shrink-0', meta.textPrimary)} />
              <p className={cn('text-xs', meta.textMuted)}>
                Bloqueada por mantenimiento
              </p>
            </div>
          ) : null}
        </div>

        {/* CTA */}
        {isClickable && (
          <div className={cn(
            'flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md transition-colors',
            meta.ctaBg
          )}>
            <span className={cn('text-[11px] font-semibold', meta.textStrong)}>
              {ctaLabel}
            </span>
            <ArrowRight className={cn('h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5', meta.textStrong)} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- TABLA ---------------- */

function RoomTable({ items, onRowClick }: { items: HabitacionStatus[]; onRowClick: (i: HabitacionStatus) => void }) {
  return (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="w-[80px]">Hab.</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Huésped</TableHead>
            <TableHead className="text-center">Pax</TableHead>
            <TableHead>Llegada / Salida</TableHead>
            <TableHead className="text-right">Saldo</TableHead>
            <TableHead className="w-[60px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const { habitacion, estado, reservaActiva } = item;
            const meta = ESTADO_META[estado];
            const Icon = meta.icon;
            const isClickable = estado !== 'mantenimiento';
            const huesped = reservaActiva
              ? `${reservaActiva.cliente_nombre || ''} ${reservaActiva.apellido_paterno || ''}`.trim()
              : '—';
            const personas = reservaActiva
              ? (Number(reservaActiva.adultos) || 0) + (Number(reservaActiva.ninos) || 0)
              : 0;
            const saldo = reservaActiva ? Number(reservaActiva.saldo_pendiente) || 0 : 0;

            const horaLlegada = estado === 'reservada' ? reservaActiva?.hora_llegada : null;
            const fechaSalida = estado === 'ocupada' && reservaActiva?.fecha_checkout
              ? format(parseISO(reservaActiva.fecha_checkout.substring(0, 10)), 'd MMM', { locale: es })
              : null;

            return (
              <TableRow
                key={habitacion.id}
                onClick={isClickable ? () => onRowClick(item) : undefined}
                className={cn(
                  isClickable ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed',
                )}
              >
                <TableCell className="font-bold tabular-nums">{habitacion.numero}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {habitacion.tipo_nombre || 'Sin tipo'}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn('gap-1 text-[10px] font-semibold border', meta.badge)}>
                    <Icon className="h-3 w-3" />
                    {meta.short}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm font-medium max-w-[180px] truncate">
                  {huesped}
                </TableCell>
                <TableCell className="text-center text-sm tabular-nums">
                  {personas > 0 ? personas : '—'}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {horaLlegada ? `Llega ${horaLlegada}` : fechaSalida ? `Sale ${fechaSalida}` : '—'}
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums font-medium">
                  {saldo > 0 ? (
                    <span className="text-rose-600 dark:text-rose-400 font-bold">
                      ${saldo.toLocaleString()}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {isClickable && (
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}