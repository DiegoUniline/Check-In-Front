import { useMemo, useState, useRef, useCallback } from 'react';
import { format, addDays, isSameDay, differenceInDays, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Clock, CheckCircle } from 'lucide-react';

interface DragSelection {
  habitacionId: string;
  startIndex: number;
  endIndex: number;
}

interface TimelineGridProps {
  habitaciones: any[];
  reservas: any[];
  startDate: Date;
  daysToShow: number;
  onReservationClick?: (reserva: any) => void;
  onCreateReservation?: (habitacion: any, fechaCheckin: Date, fechaCheckout: Date) => void;
}

const CELL_WIDTH = 80;
const ROW_HEIGHT = 56;

export function TimelineGrid({
  habitaciones,
  reservas,
  startDate,
  daysToShow,
  onReservationClick,
  onCreateReservation,
}: TimelineGridProps) {
  const today = startOfDay(new Date());
  const [isDragging, setIsDragging] = useState(false);
  const [dragSelection, setDragSelection] = useState<DragSelection | null>(null);
  const dragStartRef = useRef<{ habitacionId: string; index: number } | null>(null);
  
  const dates = useMemo(() => {
    return Array.from({ length: daysToShow }, (_, i) => addDays(startDate, i));
  }, [startDate, daysToShow]);

  const getReservationsForRoom = (habitacionId: string) => {
    return reservas.filter(r => 
      r.habitacion_id === habitacionId &&
      r.estado !== 'Cancelada' &&
      r.estado !== 'NoShow'
    );
  };

  const isCellOccupied = useCallback((habitacionId: string, dateIndex: number) => {
    const date = dates[dateIndex];
    const roomReservations = reservas.filter(r => 
      r.habitacion_id === habitacionId &&
      r.estado !== 'Cancelada' &&
      r.estado !== 'NoShow'
    );
    
    return roomReservations.some(r => {
      const checkin = startOfDay(new Date(r.fecha_checkin));
      const checkout = startOfDay(new Date(r.fecha_checkout));
      return date >= checkin && date < checkout;
    });
  }, [reservas, dates]);

  const handleMouseDown = (habitacionId: string, index: number, e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (isCellOccupied(habitacionId, index)) return;
    if (dates[index] < today) return;
    
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { habitacionId, index };
    setDragSelection({ habitacionId, startIndex: index, endIndex: index });
  };

  const handleMouseMove = (habitacionId: string, index: number) => {
    if (!isDragging || !dragStartRef.current) return;
    if (dragStartRef.current.habitacionId !== habitacionId) return;
    
    const start = Math.min(dragStartRef.current.index, index);
    const end = Math.max(dragStartRef.current.index, index);
    
    let isRangeValid = true;
    for (let i = start; i <= end; i++) {
      if (isCellOccupied(habitacionId, i) || dates[i] < today) {
        isRangeValid = false;
        break;
      }
    }
    
    if (isRangeValid) {
      setDragSelection({ habitacionId, startIndex: start, endIndex: end });
    }
  };

  const handleMouseUp = () => {
    if (isDragging && dragSelection && onCreateReservation) {
      const habitacion = habitaciones.find(h => h.id === dragSelection.habitacionId);
      if (habitacion) {
        const fechaCheckin = dates[dragSelection.startIndex];
        const fechaCheckout = addDays(dates[dragSelection.endIndex], 1);
        onCreateReservation(habitacion, fechaCheckin, fechaCheckout);
      }
    }
    
    setIsDragging(false);
    setDragSelection(null);
    dragStartRef.current = null;
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      setIsDragging(false);
      setDragSelection(null);
      dragStartRef.current = null;
    }
  };

  const getReservationBarStyle = (reserva: any) => {
    const checkin = startOfDay(new Date(reserva.fecha_checkin));
    const checkout = startOfDay(new Date(reserva.fecha_checkout));
    const gridStart = startOfDay(startDate);
    const gridEnd = addDays(gridStart, daysToShow);

    if (checkout < gridStart || checkin >= gridEnd) return null;

    const startOffset = Math.max(0, differenceInDays(checkin, gridStart));
    const left = startOffset * CELL_WIDTH;

    const visibleStart = checkin < gridStart ? gridStart : checkin;
    const visibleEnd = checkout > gridEnd ? gridEnd : checkout;
    const days = differenceInDays(visibleEnd, visibleStart);
    const width = Math.max(days * CELL_WIDTH - 8, CELL_WIDTH - 8);

    return { left: left + 4, width };
  };

  const getStatusColor = (estado: string) => {
    switch (estado) {
      case 'Confirmada': return 'bg-primary hover:bg-primary/90';
      case 'CheckIn': return 'bg-success hover:bg-success/90';
      case 'Pendiente': return 'bg-info hover:bg-info/90';
      case 'CheckOut': return 'bg-muted-foreground/50';
      default: return 'bg-muted';
    }
  };

  const getStatusIcon = (estado: string) => {
    switch (estado) {
      case 'Confirmada': return <CreditCard className="h-3 w-3" />;
      case 'CheckIn': return <CheckCircle className="h-3 w-3" />;
      case 'Pendiente': return <Clock className="h-3 w-3" />;
      default: return null;
    }
  };

  const getRoomStatusColor = (hab: any) => {
    if (hab.estado_mantenimiento !== 'OK') return 'bg-destructive';
    if (hab.estado_limpieza !== 'Limpia') return 'bg-info';
    switch (hab.estado_habitacion) {
      case 'Disponible': return 'bg-success';
      case 'Ocupada': return 'bg-warning';
      case 'Reservada': return 'bg-primary';
      case 'Bloqueada': return 'bg-destructive';
      default: return 'bg-muted';
    }
  };

  const isCellSelected = (habitacionId: string, index: number) => {
    if (!dragSelection || dragSelection.habitacionId !== habitacionId) return false;
    return index >= dragSelection.startIndex && index <= dragSelection.endIndex;
  };

  return (
    <div 
      className="border rounded-lg bg-card overflow-hidden select-none"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex border-b">
        <div className="w-[200px] min-w-[200px] p-3 bg-muted/50 border-r font-medium text-sm">
          Habitaciones
        </div>
        
        <ScrollArea className="flex-1">
          <div className="flex" style={{ width: daysToShow * CELL_WIDTH }}>
            {dates.map((date, i) => {
              const isToday = isSameDay(date, today);
              return (
                <div
                  key={i}
                  className={cn("flex flex-col items-center justify-center border-r p-2", isToday && "bg-primary/10")}
                  style={{ width: CELL_WIDTH, minWidth: CELL_WIDTH }}
                >
                  <span className={cn("text-xs uppercase", isToday ? "text-primary font-bold" : "text-muted-foreground")}>
                    {format(date, 'EEE', { locale: es })}
                  </span>
                  <span className={cn("text-sm font-medium", isToday && "text-primary")}>
                    {format(date, 'd')}
                  </span>
                  {isToday && <Badge variant="default" className="text-[10px] px-1 py-0 mt-0.5">HOY</Badge>}
                </div>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      <ScrollArea className="max-h-[calc(100vh-320px)]">
        {habitaciones.map((hab) => {
          const roomReservations = getReservationsForRoom(hab.id);
          
          return (
            <div key={hab.id} className="flex border-b last:border-b-0 hover:bg-muted/30">
              <div className="w-[200px] min-w-[200px] p-3 border-r bg-card flex items-center gap-3">
                <div className={cn("w-2.5 h-2.5 rounded-full shrink-0", getRoomStatusColor(hab))} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{hab.numero}</span>
                    <Badge variant="outline" className="text-xs">{hab.tipo_codigo}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{hab.estado_habitacion}</p>
                </div>
              </div>

              <ScrollArea className="flex-1">
                <div className="relative" style={{ width: daysToShow * CELL_WIDTH, height: ROW_HEIGHT }}>
                  <div className="absolute inset-0 flex">
                    {dates.map((date, i) => {
                      const isToday = isSameDay(date, today);
                      const isPast = date < today;
                      const isOccupied = isCellOccupied(hab.id, i);
                      const isSelected = isCellSelected(hab.id, i);
                      
                      return (
                        <div
                          key={i}
                          className={cn(
                            "border-r h-full transition-colors",
                            isToday && "bg-primary/5",
                            isPast && "bg-muted/30",
                            !isPast && !isOccupied && "cursor-crosshair hover:bg-primary/10",
                            isSelected && "bg-primary/20"
                          )}
                          style={{ width: CELL_WIDTH, minWidth: CELL_WIDTH }}
                          onMouseDown={(e) => handleMouseDown(hab.id, i, e)}
                          onMouseMove={() => handleMouseMove(hab.id, i)}
                        />
                      );
                    })}
                  </div>

                  {dragSelection && dragSelection.habitacionId === hab.id && (
                    <div
                      className="absolute top-2 h-10 rounded-md bg-primary/30 border-2 border-primary border-dashed flex items-center justify-center text-xs font-medium text-primary pointer-events-none"
                      style={{
                        left: dragSelection.startIndex * CELL_WIDTH + 4,
                        width: (dragSelection.endIndex - dragSelection.startIndex + 1) * CELL_WIDTH - 8,
                      }}
                    >
                      {dragSelection.endIndex - dragSelection.startIndex + 1} noche{dragSelection.endIndex !== dragSelection.startIndex ? 's' : ''}
                    </div>
                  )}

                  {roomReservations.map((reserva) => {
                    const style = getReservationBarStyle(reserva);
                    if (!style) return null;

                    return (
                      <Tooltip key={reserva.id}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => onReservationClick?.(reserva)}
                            className={cn(
                              "absolute top-2 h-10 rounded-md px-2 flex items-center gap-1.5 text-white text-xs font-medium shadow-sm transition-all cursor-pointer z-10",
                              getStatusColor(reserva.estado)
                            )}
                            style={{ left: style.left, width: style.width }}
                          >
                            {getStatusIcon(reserva.estado)}
                            <span className="truncate">
                              {reserva.cliente_nombre} {reserva.cliente_apellido?.charAt(0)}.
                            </span>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[280px]">
                          <div className="space-y-1">
                            <p className="font-semibold">{reserva.cliente_nombre} {reserva.cliente_apellido}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(reserva.fecha_checkin), 'd MMM', { locale: es })} - {format(new Date(reserva.fecha_checkout), 'd MMM', { locale: es })}
                            </p>
                            <div className="flex items-center gap-2 pt-1">
                              <Badge variant="outline" className="text-xs">{reserva.estado}</Badge>
                              <span className="text-xs">${reserva.total?.toLocaleString()}</span>
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

      {!isDragging && (
        <div className="p-2 bg-muted/30 border-t text-center text-xs text-muted-foreground">
          💡 Arrastra sobre las celdas vacías para crear una reserva rápida
        </div>
      )}
    </div>
  );
}
