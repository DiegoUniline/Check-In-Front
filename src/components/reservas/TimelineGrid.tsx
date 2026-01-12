import { useMemo, useRef } from 'react';
import { format, addDays, isSameDay, isWithinInterval, differenceInDays, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Habitacion, Reserva } from '@/data/mockData';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { User, CreditCard, Clock, CheckCircle } from 'lucide-react';

interface TimelineGridProps {
  habitaciones: Habitacion[];
  reservas: Reserva[];
  startDate: Date;
  daysToShow: number;
  onReservationClick?: (reserva: Reserva) => void;
}

const CELL_WIDTH = 80;
const ROW_HEIGHT = 56;

export function TimelineGrid({
  habitaciones,
  reservas,
  startDate,
  daysToShow,
  onReservationClick,
}: TimelineGridProps) {
  const today = startOfDay(new Date());
  
  // Generate array of dates
  const dates = useMemo(() => {
    return Array.from({ length: daysToShow }, (_, i) => addDays(startDate, i));
  }, [startDate, daysToShow]);

  // Get reservations for a specific room
  const getReservationsForRoom = (habitacionId: string) => {
    return reservas.filter(r => 
      r.habitacionId === habitacionId &&
      r.estado !== 'Cancelada' &&
      r.estado !== 'NoShow'
    );
  };

  // Calculate position and width for a reservation bar
  const getReservationBarStyle = (reserva: Reserva) => {
    const checkin = startOfDay(new Date(reserva.fechaCheckin));
    const checkout = startOfDay(new Date(reserva.fechaCheckout));
    const gridStart = startOfDay(startDate);
    const gridEnd = addDays(gridStart, daysToShow);

    // Skip if reservation is completely outside the visible range
    if (checkout < gridStart || checkin >= gridEnd) {
      return null;
    }

    // Calculate left position
    const startOffset = Math.max(0, differenceInDays(checkin, gridStart));
    const left = startOffset * CELL_WIDTH;

    // Calculate width
    const visibleStart = checkin < gridStart ? gridStart : checkin;
    const visibleEnd = checkout > gridEnd ? gridEnd : checkout;
    const days = differenceInDays(visibleEnd, visibleStart);
    const width = Math.max(days * CELL_WIDTH - 8, CELL_WIDTH - 8);

    return { left: left + 4, width };
  };

  // Get status color for reservation bar
  const getStatusColor = (estado: Reserva['estado']) => {
    switch (estado) {
      case 'Confirmada':
        return 'bg-primary hover:bg-primary/90';
      case 'CheckIn':
        return 'bg-success hover:bg-success/90';
      case 'Pendiente':
        return 'bg-info hover:bg-info/90';
      case 'CheckOut':
        return 'bg-muted-foreground/50';
      default:
        return 'bg-muted';
    }
  };

  // Get status icon
  const getStatusIcon = (estado: Reserva['estado']) => {
    switch (estado) {
      case 'Confirmada':
        return <CreditCard className="h-3 w-3" />;
      case 'CheckIn':
        return <CheckCircle className="h-3 w-3" />;
      case 'Pendiente':
        return <Clock className="h-3 w-3" />;
      default:
        return null;
    }
  };

  // Get room status dot color
  const getRoomStatusColor = (hab: Habitacion) => {
    if (hab.estadoMantenimiento !== 'OK') return 'bg-destructive';
    if (hab.estadoLimpieza !== 'Limpia') return 'bg-info';
    switch (hab.estadoHabitacion) {
      case 'Disponible': return 'bg-success';
      case 'Ocupada': return 'bg-warning';
      case 'Reservada': return 'bg-primary';
      case 'Bloqueada': return 'bg-destructive';
      default: return 'bg-muted';
    }
  };

  return (
    <div className="border rounded-lg bg-card overflow-hidden">
      {/* Header row with dates */}
      <div className="flex border-b">
        {/* Fixed room column header */}
        <div className="w-[200px] min-w-[200px] p-3 bg-muted/50 border-r font-medium text-sm">
          Habitaciones
        </div>
        
        {/* Scrollable date headers */}
        <ScrollArea className="flex-1">
          <div className="flex" style={{ width: daysToShow * CELL_WIDTH }}>
            {dates.map((date, i) => {
              const isToday = isSameDay(date, today);
              return (
                <div
                  key={i}
                  className={cn(
                    "flex flex-col items-center justify-center border-r p-2",
                    isToday && "bg-primary/10"
                  )}
                  style={{ width: CELL_WIDTH, minWidth: CELL_WIDTH }}
                >
                  <span className={cn(
                    "text-xs uppercase",
                    isToday ? "text-primary font-bold" : "text-muted-foreground"
                  )}>
                    {format(date, 'EEE', { locale: es })}
                  </span>
                  <span className={cn(
                    "text-sm font-medium",
                    isToday && "text-primary"
                  )}>
                    {format(date, 'd')}
                  </span>
                  {isToday && (
                    <Badge variant="default" className="text-[10px] px-1 py-0 mt-0.5">
                      HOY
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* Room rows with reservation bars */}
      <ScrollArea className="max-h-[calc(100vh-320px)]">
        {habitaciones.map((hab) => {
          const roomReservations = getReservationsForRoom(hab.id);
          
          return (
            <div key={hab.id} className="flex border-b last:border-b-0 hover:bg-muted/30">
              {/* Fixed room info column */}
              <div className="w-[200px] min-w-[200px] p-3 border-r bg-card flex items-center gap-3">
                <div className={cn("w-2.5 h-2.5 rounded-full shrink-0", getRoomStatusColor(hab))} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{hab.numero}</span>
                    <Badge variant="outline" className="text-xs">
                      {hab.tipo.codigo}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {hab.estadoHabitacion}
                  </p>
                </div>
              </div>

              {/* Scrollable timeline cells */}
              <ScrollArea className="flex-1">
                <div 
                  className="relative"
                  style={{ 
                    width: daysToShow * CELL_WIDTH, 
                    height: ROW_HEIGHT,
                  }}
                >
                  {/* Grid cells */}
                  <div className="absolute inset-0 flex">
                    {dates.map((date, i) => {
                      const isToday = isSameDay(date, today);
                      return (
                        <div
                          key={i}
                          className={cn(
                            "border-r h-full",
                            isToday && "bg-primary/5"
                          )}
                          style={{ width: CELL_WIDTH, minWidth: CELL_WIDTH }}
                        />
                      );
                    })}
                  </div>

                  {/* Reservation bars */}
                  {roomReservations.map((reserva) => {
                    const style = getReservationBarStyle(reserva);
                    if (!style) return null;

                    return (
                      <Tooltip key={reserva.id}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => onReservationClick?.(reserva)}
                            className={cn(
                              "absolute top-2 h-10 rounded-md px-2 flex items-center gap-1.5 text-white text-xs font-medium shadow-sm transition-all cursor-pointer",
                              getStatusColor(reserva.estado)
                            )}
                            style={{
                              left: style.left,
                              width: style.width,
                            }}
                          >
                            {getStatusIcon(reserva.estado)}
                            <span className="truncate">
                              {reserva.cliente.nombre} {reserva.cliente.apellidoPaterno.charAt(0)}.
                            </span>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[280px]">
                          <div className="space-y-1">
                            <p className="font-semibold">
                              {reserva.cliente.nombre} {reserva.cliente.apellidoPaterno}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(reserva.fechaCheckin), 'd MMM', { locale: es })} - {format(new Date(reserva.fechaCheckout), 'd MMM', { locale: es })}
                              {' '}({reserva.noches} {reserva.noches === 1 ? 'noche' : 'noches'})
                            </p>
                            <div className="flex items-center gap-2 pt-1">
                              <Badge variant="outline" className="text-xs">
                                {reserva.estado}
                              </Badge>
                              <span className="text-xs">
                                ${reserva.total.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>
          );
        })}
      </ScrollArea>
    </div>
  );
}