import { useState, useMemo, useRef } from 'react';
import { format, addDays, isSameDay, isWithinInterval, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

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
  const gridRef = useRef<HTMLDivElement>(null);

  const days = useMemo(() => {
    return Array.from({ length: daysToShow }, (_, i) => addDays(startDate, i));
  }, [startDate, daysToShow]);

  const getReservasForRoom = (habitacionId: string) => {
    return reservas.filter(r => r.habitacion_id === habitacionId);
  };

  const getReservationPosition = (reserva: any, dayIndex: number) => {
    const checkin = startOfDay(new Date(reserva.fecha_checkin));
    const checkout = startOfDay(new Date(reserva.fecha_checkout));
    const currentDay = startOfDay(days[dayIndex]);

    if (isSameDay(currentDay, checkin)) {
      return 'start';
    }
    if (isSameDay(addDays(currentDay, 1), checkout)) {
      return 'end';
    }
    if (isWithinInterval(currentDay, { start: checkin, end: addDays(checkout, -1) })) {
      return 'middle';
    }
    return null;
  };

  const getReservationForCell = (habitacionId: string, dayIndex: number) => {
    const roomReservas = getReservasForRoom(habitacionId);
    const currentDay = startOfDay(days[dayIndex]);

    return roomReservas.find(r => {
      const checkin = startOfDay(new Date(r.fecha_checkin));
      const checkout = startOfDay(new Date(r.fecha_checkout));
      return isWithinInterval(currentDay, { start: checkin, end: addDays(checkout, -1) });
    });
  };

  const getStatusColor = (estado: string) => {
    switch (estado?.toLowerCase()) {
      case 'confirmada':
        return 'bg-primary text-primary-foreground';
      case 'pendiente':
        return 'bg-warning text-warning-foreground';
      case 'checkin':
      case 'hospedado':
        return 'bg-success text-success-foreground';
      case 'checkout':
        return 'bg-info text-info-foreground';
      case 'cancelada':
        return 'bg-destructive text-destructive-foreground';
      case 'noshow':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };

  const handleMouseDown = (habitacionId: string, dayIndex: number, reserva: any) => {
    if (reserva) {
      onReservationClick(reserva);
      return;
    }
    setDragStart({ roomId: habitacionId, dayIndex });
    setDragEnd(dayIndex);
    setIsDragging(true);
  };

  const handleMouseEnter = (dayIndex: number) => {
    if (isDragging && dragStart) {
      setDragEnd(dayIndex);
    }
  };

  const handleMouseUp = () => {
    if (isDragging && dragStart && dragEnd !== null) {
      const habitacion = habitaciones.find(h => h.id === dragStart.roomId);
      if (habitacion) {
        const startIdx = Math.min(dragStart.dayIndex, dragEnd);
        const endIdx = Math.max(dragStart.dayIndex, dragEnd);
        const fechaCheckin = days[startIdx];
        const fechaCheckout = addDays(days[endIdx], 1);
        onCreateReservation(habitacion, fechaCheckin, fechaCheckout);
      }
    }
    setDragStart(null);
    setDragEnd(null);
    setIsDragging(false);
  };

  const isDragSelected = (roomId: string, dayIndex: number) => {
    if (!isDragging || !dragStart || dragEnd === null) return false;
    if (dragStart.roomId !== roomId) return false;
    const minIdx = Math.min(dragStart.dayIndex, dragEnd);
    const maxIdx = Math.max(dragStart.dayIndex, dragEnd);
    return dayIndex >= minIdx && dayIndex <= maxIdx;
  };

  const cellWidth = 90;
  const roomColumnWidth = 120;

  const getReservationDays = (reserva: any) => {
    const checkin = startOfDay(new Date(reserva.fecha_checkin));
    const checkout = startOfDay(new Date(reserva.fecha_checkout));
    const diffTime = checkout.getTime() - checkin.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <div 
      className="border rounded-lg overflow-hidden bg-card w-full max-w-full"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <ScrollArea className="w-full max-w-full">
        <div className="min-w-max" ref={gridRef}>
          {/* Header */}
          <div className="flex border-b bg-muted/30 sticky top-0 z-10">
            <div 
              className="flex-shrink-0 px-3 py-2 font-medium text-sm border-r bg-muted/50"
              style={{ width: roomColumnWidth }}
            >
              Habitación
            </div>
            {days.map((day, index) => {
              const isToday = isSameDay(day, new Date());
              const isWeekend = day.getDay() === 0 || day.getDay() === 6;
              return (
                <div
                  key={index}
                  className={cn(
                    "flex-shrink-0 px-2 py-2 text-center border-r text-xs",
                    isToday && "bg-primary/10",
                    isWeekend && "bg-muted/30"
                  )}
                  style={{ width: cellWidth }}
                >
                  <div className={cn("font-medium", isToday && "text-primary")}>
                    {format(day, 'EEE', { locale: es })}
                  </div>
                  <div className={cn("text-muted-foreground", isToday && "text-primary font-semibold")}>
                    {format(day, 'd MMM', { locale: es })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Rows */}
          {habitaciones.map((habitacion) => (
            <div key={habitacion.id} className="flex border-b hover:bg-muted/10">
              <div 
                className="flex-shrink-0 px-3 py-2 border-r bg-muted/20 flex items-center gap-2"
                style={{ width: roomColumnWidth }}
              >
                <div className="flex flex-col">
                  <span className="font-medium text-sm">{habitacion.numero}</span>
                  <span className="text-xs text-muted-foreground">{habitacion.tipo_codigo || habitacion.tipo_nombre}</span>
                </div>
                {habitacion.estado_limpieza === 'Sucia' && (
                  <Badge variant="outline" className="text-[10px] px-1 py-0">🧹</Badge>
                )}
              </div>
              {days.map((day, dayIndex) => {
                const reserva = getReservationForCell(habitacion.id, dayIndex);
                const position = reserva ? getReservationPosition(reserva, dayIndex) : null;
                const isToday = isSameDay(day, new Date());
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                const isSelected = isDragSelected(habitacion.id, dayIndex);

                return (
                  <TooltipProvider key={dayIndex}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            "flex-shrink-0 h-12 border-r cursor-pointer transition-colors relative",
                            isToday && "bg-primary/5",
                            isWeekend && !isToday && "bg-muted/20",
                            !reserva && !isSelected && "hover:bg-primary/10",
                            isSelected && "bg-primary/20"
                          )}
                          style={{ width: cellWidth }}
                          onMouseDown={() => handleMouseDown(habitacion.id, dayIndex, reserva)}
                          onMouseEnter={() => handleMouseEnter(dayIndex)}
                        >
                          {reserva && position && (
                            <div
                              className={cn(
                                "absolute inset-y-1 flex items-center text-[10px] font-medium overflow-hidden",
                                getStatusColor(reserva.estado),
                                position === 'start' && "left-1 right-0 rounded-l-md pl-1.5",
                                position === 'end' && "left-0 right-1 rounded-r-md justify-end pr-1.5",
                                position === 'middle' && "left-0 right-0 justify-center"
                              )}
                            >
                              {position === 'start' && (
                                <div className="flex flex-col leading-tight truncate">
                                  <span className="font-semibold truncate text-[11px]">
                                    {reserva.cliente_nombre || 'Huésped'}
                                  </span>
                                  <span className="opacity-80 text-[9px]">
                                    {getReservationDays(reserva)} noches
                                  </span>
                                </div>
                              )}
                              {position === 'middle' && (
                                <span className="opacity-60">─</span>
                              )}
                            </div>
                          )}
                        </div>
                      </TooltipTrigger>
                      {reserva && (
                        <TooltipContent side="top" className="max-w-xs">
                          <div className="text-sm space-y-1">
                            <p className="font-semibold text-base">{reserva.cliente_nombre || 'Huésped'}</p>
                            {reserva.cliente_email && (
                              <p className="text-muted-foreground text-xs">{reserva.cliente_email}</p>
                            )}
                            <p className="text-muted-foreground">
                              {format(new Date(reserva.fecha_checkin), "d MMM yyyy", { locale: es })} → {format(new Date(reserva.fecha_checkout), "d MMM yyyy", { locale: es })}
                            </p>
                            <p className="text-xs">{getReservationDays(reserva)} noches · {reserva.adultos || 1} adultos{reserva.ninos > 0 ? ` · ${reserva.ninos} niños` : ''}</p>
                            {reserva.total && (
                              <p className="font-medium text-primary">${Number(reserva.total).toLocaleString()}</p>
                            )}
                            <Badge className={cn("mt-1", getStatusColor(reserva.estado))}>
                              {reserva.estado}
                            </Badge>
                          </div>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </div>
          ))}

          {habitaciones.length === 0 && (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              No hay habitaciones para mostrar
            </div>
          )}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
