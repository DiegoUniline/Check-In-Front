import { useState, useMemo, useRef } from 'react';
import { format, addDays, isSameDay, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { UserPlus, CircleDollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { getEstadoConfig } from './estadoConfig';
import { formatDate } from '@/lib/dateFormat';

interface TimelineGridProps {
  habitaciones: any[];
  reservas: any[];
  startDate: Date;
  daysToShow: number;
  onReservationClick: (reserva: any) => void;
  onCreateReservation: (habitacion: any, fechaCheckin: Date, fechaCheckout: Date) => void;
}

export function TimelineGrid({
  habitaciones,
  reservas,
  startDate,
  daysToShow,
  onReservationClick,
  onCreateReservation,
}: TimelineGridProps) {
  const [dragStart, setDragStart] = useState<{ roomId: string; dayIndex: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const days = useMemo(() => {
    return Array.from({ length: daysToShow }, (_, i) => addDays(startDate, i));
  }, [startDate, daysToShow]);

  const getReservasForRoom = (habitacionId: string) => {
    return reservas.filter(r => 
      r.habitacion_id === habitacionId &&
      r.estado !== 'CheckOut' &&
      r.estado !== 'Cancelada' &&
      r.estado !== 'NoShow' &&
      r.fecha_checkin && r.fecha_checkout
    );
  };

  const getReservationForCell = (habitacionId: string, dayIndex: number) => {
    const roomReservas = getReservasForRoom(habitacionId);
    const currentDay = days[dayIndex];
    const currentDateStr = format(currentDay, 'yyyy-MM-dd');

    return roomReservas.find(r => {
      if (!r.fecha_checkin || !r.fecha_checkout) return false;
      const checkinStr = r.fecha_checkin.substring(0, 10);
      const checkoutStr = r.fecha_checkout.substring(0, 10);
      return currentDateStr >= checkinStr && currentDateStr <= checkoutStr;
    });
  };

  const getReservationPosition = (reserva: any, dayIndex: number) => {
    if (!reserva.fecha_checkin || !reserva.fecha_checkout) return null;
    
    const currentDateStr = format(days[dayIndex], 'yyyy-MM-dd');
    const checkinStr = reserva.fecha_checkin.substring(0, 10);
    const checkoutStr = reserva.fecha_checkout.substring(0, 10);
    
    const checkinDate = new Date(checkinStr + 'T00:00:00');
    const checkoutDate = new Date(checkoutStr + 'T00:00:00');
    const noches = Math.ceil((checkoutDate.getTime() - checkinDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (currentDateStr === checkinStr) return noches === 1 ? 'start' : 'start';
    if (currentDateStr === checkoutStr) return 'end';
    return 'middle';
  };

  const getStatusClasses = (reserva: any) => getEstadoConfig(reserva.estado).block;

  const handleMouseDown = (habitacionId: string, dayIndex: number) => {
    if (getReservationForCell(habitacionId, dayIndex)) return;
    setDragStart({ roomId: habitacionId, dayIndex });
    setDragEnd(dayIndex);
    setIsDragging(true);
  };

  const handleMouseEnter = (habitacionId: string, dayIndex: number) => {
    if (!isDragging || !dragStart || dragStart.roomId !== habitacionId) return;
    if (getReservationForCell(habitacionId, dayIndex)) return;
    setDragEnd(dayIndex);
  };

  const handleMouseUp = () => {
    if (!isDragging || !dragStart || dragEnd === null) {
      setIsDragging(false);
      setDragStart(null);
      setDragEnd(null);
      return;
    }

    const startIdx = Math.min(dragStart.dayIndex, dragEnd);
    const endIdx = Math.max(dragStart.dayIndex, dragEnd);
    
    let hasConflict = false;
    for (let i = startIdx; i <= endIdx; i++) {
      if (getReservationForCell(dragStart.roomId, i)) {
        hasConflict = true;
        break;
      }
    }

    if (!hasConflict) {
      const habitacion = habitaciones.find(h => h.id === dragStart.roomId);
      const fechaCheckin = days[startIdx];
      const fechaCheckout = days[endIdx];
      onCreateReservation?.(habitacion, fechaCheckin, fechaCheckout);
    }

    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  };

  const isCellInDragSelection = (habitacionId: string, dayIndex: number) => {
    if (!isDragging || !dragStart || dragEnd === null || dragStart.roomId !== habitacionId) {
      return false;
    }
    const start = Math.min(dragStart.dayIndex, dragEnd);
    const end = Math.max(dragStart.dayIndex, dragEnd);
    return dayIndex >= start && dayIndex <= end;
  };

  const today = startOfDay(new Date());
  const isCompact = daysToShow > 14;
  const cellWidth = isCompact ? 'w-10' : daysToShow > 7 ? 'w-16' : 'w-20';
  const cellHeight = isCompact ? 'h-7' : 'h-9';

  return (
    <div className="absolute inset-0 flex flex-col border rounded-lg bg-card overflow-hidden">
      {/* Header fijo */}
      <div className="flex-shrink-0 border-b bg-muted/30 sticky top-0 z-20">
        <div className="flex">
          <div className="w-24 flex-shrink-0 p-2 border-r bg-muted/50 flex items-center justify-center">
            <span className={cn("font-semibold", isCompact ? "text-[10px]" : "text-xs")}>
              Habitación
            </span>
          </div>
          <div className="flex-1 overflow-x-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border" ref={scrollRef}>
            <div className="flex min-w-max">
              {days.map((day, idx) => (
                <div key={idx} className={cn("border-r text-center py-1.5 px-1 flex-shrink-0", cellWidth)}>
                  <div className={cn("font-medium", isCompact ? "text-[7px]" : "text-[9px]")}>
                    {format(day, 'EEE', { locale: es })}
                  </div>
                  <div className={cn("font-bold", isCompact ? "text-[9px]" : "text-xs", isSameDay(day, today) && "text-primary")}>
                    {format(day, 'd')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Grid scrollable */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border">
        <div className="flex">
          {/* Columna de habitaciones */}
          <div className="w-24 flex-shrink-0 border-r bg-muted/30">
            {habitaciones.map((hab) => (
              <div 
                key={hab.id}
                className={cn("border-b px-2 py-1 flex flex-col justify-center", cellHeight)}
              >
                <div className={cn("font-semibold", isCompact ? "text-[10px]" : "text-xs")}>
                  {hab.numero}
                </div>
                <div className={cn("text-muted-foreground truncate", isCompact ? "text-[8px]" : "text-[10px]")}>
                  {hab.tipo_nombre}
                </div>
              </div>
            ))}
          </div>

          {/* Celdas de timeline */}
          <div className="flex-1 overflow-x-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border">
            <div className="min-w-max">
              {habitaciones.map((hab) => (
                <div key={hab.id} className="flex">
                  {days.map((day, dayIndex) => {
                    const reserva = getReservationForCell(hab.id, dayIndex);
                    const position = reserva ? getReservationPosition(reserva, dayIndex) : null;
                    const isSelecting = isCellInDragSelection(hab.id, dayIndex);
                    const isToday = isSameDay(day, today);

                    if (reserva && position) {
                      const estadoCfg = getEstadoConfig(reserva.estado);
                      const EstadoIcon = estadoCfg.icon;
                      const tienesSaldo = parseFloat(reserva.saldo_pendiente) > 0;
                      return (
                        <TooltipProvider key={dayIndex}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={cn(
                                  "border-r border-b cursor-pointer transition-all flex-shrink-0",
                                  cellWidth,
                                  cellHeight,
                                  estadoCfg.block,
                                  position === 'start' && 'rounded-l',
                                  position === 'end' && 'rounded-r',
                                  isToday && "ring-2 ring-primary ring-inset"
                                )}
                                onClick={() => onReservationClick(reserva)}
                                aria-label={`Reserva ${reserva.cliente_nombre || ''} — ${estadoCfg.label}`}
                              >
                                {position === 'start' && (
                                  <div className="h-full flex items-center gap-1 px-1 overflow-hidden">
                                    <EstadoIcon className={cn('flex-shrink-0', isCompact ? 'h-2.5 w-2.5' : 'h-3 w-3')} aria-hidden="true" />
                                    <span className={cn("font-medium truncate flex-1", isCompact ? "text-[8px]" : "text-[10px]")}>
                                      {reserva.cliente_nombre} {reserva.apellido_paterno?.charAt(0)}.
                                    </span>
                                    {tienesSaldo && !isCompact && (
                                      <CircleDollarSign className="h-3 w-3 flex-shrink-0" aria-label="Saldo pendiente" />
                                    )}
                                  </div>
                                )}
                              </div>
                            </TooltipTrigger>
                            {position === 'start' && (
                              <TooltipContent side="top" className="max-w-xs">
                                <div className="space-y-1">
                                  <p className="font-semibold text-sm">{reserva.cliente_nombre} {reserva.apellido_paterno}</p>
                                  <p className="text-xs">
                                    {formatDate(reserva.fecha_checkin)} → {formatDate(reserva.fecha_checkout)}
                                  </p>
                                  <p className="text-xs">
                                    {reserva.adultos} adultos{reserva.ninos > 0 ? ` · ${reserva.ninos} niños` : ''}
                                  </p>
                                  {reserva.total && (
                                    <p className="font-medium text-primary">
                                      {formatCurrency(Number(reserva.total))}
                                    </p>
                                  )}
                                  <div className="flex gap-2 items-center">
                                    <Badge className={cn("mt-1 gap-1", estadoCfg.block)}>
                                      <EstadoIcon className="h-3 w-3" />
                                      {estadoCfg.label}
                                    </Badge>
                                    {tienesSaldo && (
                                      <span className="text-xs text-destructive font-bold">
                                        Debe: {formatCurrency(Number(reserva.saldo_pendiente))}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                      );
                    }

                    return (
                      <div
                        key={dayIndex}
                        className={cn(
                          "border-r border-b cursor-crosshair hover:bg-accent/50 transition-colors flex-shrink-0",
                          cellWidth,
                          cellHeight,
                          isSelecting && "bg-primary/20",
                          isToday && "bg-blue-50 dark:bg-blue-950/20"
                        )}
                        onMouseDown={() => handleMouseDown(hab.id, dayIndex)}
                        onMouseEnter={() => handleMouseEnter(hab.id, dayIndex)}
                        onMouseUp={handleMouseUp}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer fijo */}
      <div className="flex-shrink-0 p-2 bg-muted/30 border-t flex items-center justify-between text-[10px] text-muted-foreground gap-2 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          <span className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-emerald-500"></div> Check-In</span>
          <span className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-sky-500"></div> Confirmada</span>
          <span className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-amber-500"></div> Pendiente</span>
          <span className="flex items-center gap-1"><CircleDollarSign className="h-3 w-3" /> Saldo</span>
        </div>
        <span className="hidden sm:inline">Arrastra para crear reserva</span>
      </div>
    </div>
  );
}
