import { useMemo, useState } from 'react';
import { format, parseISO, differenceInDays, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  BedDouble, User, Clock, AlertCircle, LayoutGrid, List,
  CheckCircle2, CalendarClock, DoorOpen, Wrench, Users as UsersIcon,
  Wallet, MoonStar, ArrowRight, Plus,
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
  accent: string;
  accentText: string;
  divider: string;
  icon: typeof CheckCircle2;
}> = {
  libre: {
    label: 'Disponible',
    short: 'Libre',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    cardBg: 'bg-card',
    cardBorder: 'border-border',
    cardHover: 'hover:border-emerald-400 hover:shadow-md hover:shadow-emerald-500/5',
    accent: 'bg-emerald-500',
    accentText: 'text-emerald-600 dark:text-emerald-400',
    divider: 'border-border',
    icon: CheckCircle2,
  },
  reservada: {
    label: 'Reservada hoy',
    short: 'Reservada',
    dot: 'bg-blue-500',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    cardBg: 'bg-blue-50/40 dark:bg-blue-950/20',
    cardBorder: 'border-blue-200 dark:border-blue-900',
    cardHover: 'hover:border-blue-400 hover:shadow-md hover:shadow-blue-500/5',
    accent: 'bg-blue-500',
    accentText: 'text-blue-600 dark:text-blue-400',
    divider: 'border-blue-100 dark:border-blue-900',
    icon: CalendarClock,
  },
  ocupada: {
    label: 'Ocupada',
    short: 'Ocupada',
    dot: 'bg-amber-500',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    cardBg: 'bg-amber-50/50 dark:bg-amber-950/20',
    cardBorder: 'border-amber-200 dark:border-amber-900',
    cardHover: 'hover:border-amber-400 hover:shadow-md hover:shadow-amber-500/5',
    accent: 'bg-amber-500',
    accentText: 'text-amber-700 dark:text-amber-400',
    divider: 'border-amber-100 dark:border-amber-900',
    icon: DoorOpen,
  },
  mantenimiento: {
    label: 'Mantenimiento',
    short: 'Mantto.',
    dot: 'bg-rose-500',
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    cardBg: 'bg-muted/40',
    cardBorder: 'border-dashed border-border',
    cardHover: '',
    accent: 'bg-rose-500',
    accentText: 'text-rose-600 dark:text-rose-400',
    divider: 'border-border',
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
        <FloorGroups items={items} onClick={handleClick} />
      ) : (
        <RoomTable items={items} onRowClick={handleClick} />
      )}
    </div>
  );
}

/* ---------------- AGRUPACIÓN POR PISO ---------------- */

function FloorGroups({
  items,
  onClick,
}: {
  items: HabitacionStatus[];
  onClick: (i: HabitacionStatus) => void;
}) {
  const grupos = useMemo(() => {
    const map = new Map<number, HabitacionStatus[]>();
    items.forEach((item) => {
      const piso = Number(item.habitacion.piso) || 0;
      if (!map.has(piso)) map.set(piso, []);
      map.get(piso)!.push(item);
    });
    // ordenar habitaciones dentro de cada piso por número
    map.forEach((arr) =>
      arr.sort((a, b) =>
        String(a.habitacion.numero).localeCompare(String(b.habitacion.numero), undefined, { numeric: true })
      )
    );
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [items]);

  return (
    <div className="space-y-7">
      {grupos.map(([piso, hab]) => {
        const libres = hab.filter((h) => h.estado === 'libre').length;
        return (
          <section key={piso}>
            <header className="mb-3 flex items-baseline justify-between">
              <div className="flex items-baseline gap-3">
                <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold">
                  {piso === 0 ? 'Sin piso' : `Piso ${piso}`}
                </span>
                <span className="text-[10px] text-muted-foreground/70">
                  · {hab.length} habitaciones
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground">
                <span className="font-semibold text-foreground tabular-nums">{libres}</span> disponibles
              </span>
            </header>
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {hab.map((item) => (
                <RoomCard key={item.habitacion.id} item={item} onClick={() => onClick(item)} />
              ))}
            </div>
          </section>
        );
      })}
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
        'group relative rounded-xl border transition-all duration-200',
        'p-4 min-h-[128px] flex flex-col',
        meta.cardBg,
        meta.cardBorder,
        isClickable && 'cursor-pointer ' + meta.cardHover,
        !isClickable && 'cursor-not-allowed opacity-70',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
      )}
    >
      {/* Estado: punto + texto pequeño en la esquina superior */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <span className={cn('h-1.5 w-1.5 rounded-full', meta.accent)} />
          <span className={cn('text-[10px] uppercase tracking-wider font-semibold', meta.accentText)}>
            {meta.label}
          </span>
        </div>
        {saldo > 0 && (
          <span className="text-[10px] font-bold tabular-nums text-rose-600 dark:text-rose-400">
            ${saldo.toLocaleString()}
          </span>
        )}
      </div>

      {/* Número de habitación: protagonista, peso ligero */}
      <div className="flex items-baseline gap-2">
        <h3 className="text-3xl font-light leading-none tracking-tight tabular-nums text-foreground">
          {habitacion.numero}
        </h3>
        {isClickable && (
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity ml-auto self-center" />
        )}
      </div>

      {/* Tipo de habitación */}
      <p className="text-xs text-muted-foreground mt-1.5 truncate">
        {habitacion.tipo_nombre || 'Sin tipo'}
      </p>

      {/* Información del huésped (solo si aplica) */}
      {huesped ? (
        <div className={cn('mt-auto pt-3 border-t', meta.divider)}>
          <p className="text-xs font-medium text-foreground truncate flex items-center gap-1.5">
            <User className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            <span className="truncate">{huesped}</span>
          </p>
          <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground mt-1">
            {personas > 0 && (
              <span className="flex items-center gap-0.5">
                <UsersIcon className="h-2.5 w-2.5" />
                {personas} pax
              </span>
            )}
            {nochesRestantes !== null && (
              <span className="flex items-center gap-0.5">
                <MoonStar className="h-2.5 w-2.5" />
                {nochesRestantes}n rest.
              </span>
            )}
            {horaLlegada && (
              <span className="flex items-center gap-0.5">
                <Clock className="h-2.5 w-2.5" />
                {horaLlegada}
              </span>
            )}
            {fechaSalida && (
              <span className="flex items-center gap-0.5">
                Sale {fechaSalida}
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-auto" />
      )}
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