import { useState, useMemo, useRef } from 'react';
import { format, addDays, isSameDay, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { UserPlus, CalendarPlus } from 'lucide-react';

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

  // Filtrar reservas activas
  const getReservasForRoom = (habitacionId: string) => {
    return reservas.filter(r => 
      r.habitacion_id === habitacionId &&
      r.estado !== 'CheckOut' &&
      r.estado !== 'Cancelada' &&
      r.estado !== 'NoShow' &&
      r.fecha_checkin && r.fecha_checkout
    );
  };

  // Buscar reserva para una celda específica
  const getReservationForCell = (habitacionId: string, dayIndex: number) => {
    const roomReservas = getReservasForRoom(habitacionId);
    const currentDay = days[dayIndex];
    const currentDateStr = format(currentDay, 'yyyy-MM-dd');

    return roomReservas.find(r => {
      if (!r.fecha_checkin || !r.fecha_checkout) return false;
      const checkinStr = r.fecha_checkin.substring(0, 10);
      const checkoutStr = r.fecha_checkout.substring(0, 10);
      return currentDateStr >= checkinStr && currentDateStr < checkoutStr;
    });
  };

  // Determinar posición de la reserva en la celda
  const getReservationPosition = (reserva: any, dayIndex: number) => {
    if (!reserva.fecha_checkin || !reserva.fecha_checkout) return null;
    
    const currentDateStr = format(days[dayIndex], 'yyyy-MM-dd');
    const checkinStr = reserva.fecha_checkin.substring(0, 10);
    const checkoutStr = reserva.fecha_checkout.substring(0, 10);
    
    // Calcular noches
    const checkinDate = new Date(checkinStr + 'T00:00:00');
    const checkoutDate = new Date(checkoutStr + 'T00:00:00');
    const noches = Math.round((checkoutDate.getTime() - checkinDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Reserva de 1 noche: solo tiene 'start'
    if (noches === 1) {
      if (currentDateStr === checkinStr) {
        return 'single'; // Nueva posición para reservas de 1 noche
      }
      return null;
    }
    
    // Primer día
    if (currentDateStr === checkinStr) {
      return 'start';
    }
    
    // Último día ocupado (día anterior al checkout)
    const dayBeforeCheckout = format(addDays(checkoutDate, -1), 'yyyy-MM-dd');
    if (currentDateStr === dayBeforeCheckout) {
      return 'end';
    }
    
    // Días intermedios
    if (currentDateStr > checkinStr && currentDateStr < checkoutStr) {
      return 'middle';
    }
    
    return null;
  };

  // Color por ORIGEN y ESTADO
 // Color por ORIGEN y ESTADO
const getStatusColor = (reserva: any, position?: string) => {
  const estado = reserva.estado?.toLowerCase();
  const esWalkin = reserva.origen === 'Recepcion';
  
  // El día de checkout es más claro (medio día)
  if (position === 'end') {
    if (estado === 'checkin' || estado === 'hospedado') {
      return 'bg-orange-300 text-orange-900';
    }
    if (estado === 'confirmada') {
      return esWalkin
        ? 'bg-amber-300 text-amber-800'
        : 'bg-blue-300 text-blue-800';
    }
    if (estado === 'pendiente') {
      return 'bg-yellow-200 text-yellow-800';
    }
  }
  
  // Cancelada / NoShow
  if (estado === 'cancelada' || estado === 'noshow') {
    return 'bg-red-400 text-white';
  }
  
  // CheckOut completado
  if (estado === 'checkout') {
    return 'bg-slate-400 text-white';
  }
  
  // OCUPADA - CheckIn / Hospedado (naranja fuerte)
  if (estado === 'checkin' || estado === 'hospedado') {
    return esWalkin 
      ? 'bg-orange-500 text-white'    // Walk-in ocupado
      : 'bg-orange-600 text-white';   // Reserva ocupada
  }
  
  // CONFIRMADA - Llegará pronto
  if (estado === 'confirmada') {
    return esWalkin
      ? 'bg-amber-500 text-white'     // Walk-in confirmado (raro pero posible)
      : 'bg-blue-500 text-white';     // Reserva confirmada
  }
  
  // PENDIENTE - Sin confirmar
  if (estado === 'pendiente') {
    return esWalkin
      ? 'bg-yellow-500 text-yellow-900'  // Walk-in pendiente
      : 'bg-yellow-400 text-yellow-900'; // Reserva pendiente
  }
  
  return 'bg-gray-400 text-white';
};

  const handleMouseDown = (habitacionId: string, dayIndex: number, reserva: any) => {
    if (reserva) {
      onReservationClick(reserva);
      return;
    }
    
    const selectedDay = days[dayIndex];
    if (selectedDay < startOfDay(new Date())) return;
    
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
      // Si es 1 sola celda = 1 noche mínimo
      // Si son múltiples celdas, la última ES el checkout
      const fechaCheckout = startIdx === endIdx 
        ? addDays(days[endIdx], 1)  // 1 celda = sale al día siguiente
        : days[endIdx];             // múltiples celdas = última es checkout
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
    if (!reserva.fecha_checkin || !reserva.fecha_checkout) return 0;
    const checkinStr = reserva.fecha_checkin.substring(0, 10);
    const checkoutStr = reserva.fecha_checkout.substring(0, 10);
    const checkin = new Date(checkinStr + 'T00:00:00');
    const checkout = new Date(checkoutStr + 'T00:00:00');
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
              const isPast = day < startOfDay(new Date());
              return (
                <div
                  key={index}
                  className={cn(
                    "flex-shrink-0 px-2 py-2 text-center border-r text-xs",
                    isToday && "bg-primary/10",
                    isWeekend && !isToday && "bg-muted/30",
                    isPast && "bg-muted/40 opacity-60"
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
                {habitacion.estado_mantenimiento !== 'OK' && habitacion.estado_mantenimiento && (
                  <Badge variant="destructive" className="text-[10px] px-1 py-0">🔧</Badge>
                )}
              </div>
              {days.map((day, dayIndex) => {
                const reserva = getReservationForCell(habitacion.id, dayIndex);
                const position = reserva ? getReservationPosition(reserva, dayIndex) : null;
                const isToday = isSameDay(day, new Date());
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                const isSelected = isDragSelected(habitacion.id, dayIndex);
                const isPast = day < startOfDay(new Date());

                return (
                  <TooltipProvider key={dayIndex}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            "flex-shrink-0 h-12 border-r transition-colors relative",
                            isToday && "bg-primary/5",
                            isWeekend && !isToday && "bg-muted/20",
                            isPast && !reserva && "bg-muted/30 cursor-not-allowed",
                            !reserva && !isSelected && !isPast && "hover:bg-primary/10 cursor-crosshair",
                            isSelected && "bg-primary/20",
                            reserva && "cursor-pointer"
                          )}
                          style={{ width: cellWidth }}
                          onMouseDown={() => handleMouseDown(habitacion.id, dayIndex, reserva)}
                          onMouseEnter={() => handleMouseEnter(dayIndex)}
                        >
                          {reserva && position && (
                            <div
                              className={cn(
                                "absolute inset-y-1 flex items-center text-[10px] font-medium overflow-hidden",
                                getStatusColor(reserva),
                                position === 'start' && "left-1 right-0 rounded-l-md pl-1.5",
                                position === 'end' && "left-0 right-1 rounded-r-md justify-end pr-1.5",
                                position === 'middle' && "left-0 right-0 justify-center",
                                position === 'single' && "left-1 right-1 rounded-md pl-1.5" // Reserva de 1 noche
                              )}
                            >
                              {(position === 'start' || position === 'single') && (
                                <div className="flex flex-col leading-tight truncate">
                                  <span className="font-semibold truncate text-[11px] flex items-center gap-1">
                                    {reserva.origen === 'Recepcion' && <UserPlus className="h-3 w-3 flex-shrink-0" />}
                                    {reserva.cliente_nombre || reserva.nombre || 'Huésped'}
                                  </span>
                                  <span className="opacity-80 text-[9px]">
                                    {getReservationDays(reserva)}n · {reserva.estado}
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
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-base">{reserva.cliente_nombre || 'Huésped'} {reserva.apellido_paterno || ''}</p>
                              {reserva.origen === 'Recepcion' ? (
                                <Badge variant="outline" className="text-[10px] border-green-500 text-green-700 bg-green-50">
                                  <UserPlus className="h-3 w-3 mr-1" />Walk-in
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] border-blue-500 text-blue-700 bg-blue-50">
                                  <CalendarPlus className="h-3 w-3 mr-1" />Reserva
                                </Badge>
                              )}
                            </div>
                            {reserva.cliente_telefono && (
                              <p className="text-muted-foreground text-xs">📞 {reserva.cliente_telefono}</p>
                            )}
                            <p className="text-muted-foreground">
                              {format(new Date(reserva.fecha_checkin), "d MMM", { locale: es })} → {format(new Date(reserva.fecha_checkout), "d MMM", { locale: es })}
                            </p>
                            <p className="text-xs">{getReservationDays(reserva)} noches · {reserva.adultos || 1} adultos{reserva.ninos > 0 ? ` · ${reserva.ninos} niños` : ''}</p>
                            {reserva.total && (
                              <p className="font-medium text-primary">${Number(reserva.total).toLocaleString()}</p>
                            )}
                            <div className="flex gap-2 items-center">
                              <Badge className={cn("mt-1", getStatusColor(reserva))}>
                                {reserva.estado}
                              </Badge>
                              {parseFloat(reserva.saldo_pendiente) > 0 && (
                                <span className="text-xs text-destructive">
                                  Debe: ${Number(reserva.saldo_pendiente).toLocaleString()}
                                </span>
                              )}
                            </div>
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
      
      <div className="p-2 bg-muted/30 border-t text-center text-xs text-muted-foreground">
        💡 Arrastra sobre las celdas vacías para crear una nueva entrada
      </div>
    </div>
  );
}
