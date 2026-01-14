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

  // Filtrar reservas activas (NO incluir checkout completado ni canceladas)
  const getReservasForRoom = (habitacionId: string) => {
    return reservas.filter(r => 
      r.habitacion_id === habitacionId &&
      r.estado !== 'CheckOut' &&
      r.estado !== 'Cancelada' &&
      r.estado !== 'NoShow' &&
      r.fecha_checkin && r.fecha_checkout
    );
  };

  // Buscar reserva para una celda - INCLUYE día de checkout para visualización
  const getReservationForCell = (habitacionId: string, dayIndex: number) => {
    const roomReservas = getReservasForRoom(habitacionId);
    const currentDay = days[dayIndex];
    const currentDateStr = format(currentDay, 'yyyy-MM-dd');

    return roomReservas.find(r => {
      if (!r.fecha_checkin || !r.fecha_checkout) return false;
      const checkinStr = r.fecha_checkin.substring(0, 10);
      const checkoutStr = r.fecha_checkout.substring(0, 10);
      // Pinta desde checkin hasta checkout (inclusive para mostrar salida)
      return currentDateStr >= checkinStr && currentDateStr <= checkoutStr;
    });
  };

  // Verificar si una celda está disponible para NUEVA reserva
  // El día de checkout SÍ está disponible para nuevas reservas
  const isCellAvailableForNewReservation = (habitacionId: string, dayIndex: number) => {
    const roomReservas = getReservasForRoom(habitacionId);
    const currentDay = days[dayIndex];
    const currentDateStr = format(currentDay, 'yyyy-MM-dd');

    // Verificar que no haya reserva activa (excepto si es su día de checkout)
    const conflicto = roomReservas.find(r => {
      if (!r.fecha_checkin || !r.fecha_checkout) return false;
      const checkinStr = r.fecha_checkin.substring(0, 10);
      const checkoutStr = r.fecha_checkout.substring(0, 10);
      // Conflicto si está entre checkin y checkout (excluyendo checkout)
      return currentDateStr >= checkinStr && currentDateStr < checkoutStr;
    });

    return !conflicto;
  };

  // Determinar posición de la reserva en la celda
  const getReservationPosition = (reserva: any, dayIndex: number) => {
    if (!reserva.fecha_checkin || !reserva.fecha_checkout) return null;
    
    const currentDateStr = format(days[dayIndex], 'yyyy-MM-dd');
    const checkinStr = reserva.fecha_checkin.substring(0, 10);
    const checkoutStr = reserva.fecha_checkout.substring(0, 10);
    
    // Día de checkout = 'end' (medio día, salida)
    if (currentDateStr === checkoutStr) {
      return 'end';
    }
    
    // Primer día = 'start'
    if (currentDateStr === checkinStr) {
      return 'start';
    }
    
    // Días intermedios
    if (currentDateStr > checkinStr && currentDateStr < checkoutStr) {
      return 'middle';
    }
    
    return null;
  };

  // Color por ESTADO - OCUPADA = NARANJA
  const getStatusColor = (reserva: any, position?: string) => {
    const estado = reserva.estado?.toLowerCase();
    const esWalkin = reserva.origen === 'Recepcion';
    
    // El día de checkout es más claro (medio día)
    if (position === 'end') {
      if (estado === 'checkin' || estado === 'hospedado') {
        return 'bg-orange-300 text-orange-900';
      }
      if (estado === 'confirmada') {
        return esWalkin ? 'bg-amber-300 text-amber-800' : 'bg-blue-300 text-blue-800';
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
    
    // OCUPADA - CheckIn / Hospedado (NARANJA)
    if (estado === 'checkin' || estado === 'hospedado') {
      return esWalkin 
        ? 'bg-orange-500 text-white'    // Walk-in ocupado
        : 'bg-orange-600 text-white';   // Reserva ocupada
    }
    
    // CONFIRMADA - Llegará pronto (AZUL)
    if (estado === 'confirmada') {
      return esWalkin
        ? 'bg-amber-500 text-white'     // Walk-in confirmado
        : 'bg-blue-500 text-white';     // Reserva confirmada
    }
    
    // PENDIENTE - Sin confirmar (AMARILLO)
    if (estado === 'pendiente') {
      return esWalkin
        ? 'bg-yellow-500 text-yellow-900'
        : 'bg-yellow-400 text-yellow-900';
    }
    
    return 'bg-gray-400 text-white';
  };

  const handleMouseDown = (habitacionId: string, dayIndex: number, reserva: any, position: string | null) => {
    // Si hay reserva y NO es día de checkout, abrir detalle
    if (reserva && position !== 'end') {
      onReservationClick(reserva);
      return;
    }
    
    // Si es día de checkout, permitir iniciar drag para nueva reserva
    // O si no hay reserva
    const selectedDay = days[dayIndex];
    if (selectedDay < startOfDay(new Date())) return;
    
    // Verificar disponibilidad para nueva reserva
    if (!isCellAvailableForNewReservation(habitacionId, dayIndex)) {
      // Si no está disponible y hay reserva, mostrar detalle
      if (reserva) {
        onReservationClick(reserva);
      }
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
        // La última celda seleccionada ES el día de checkout
        const fechaCheckout = days[endIdx];
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
                const isAvailableForNew = isCellAvailableForNewReservation(habitacion.id, dayIndex);

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
                            // Día de checkout: fondo rayado para indicar que se puede reservar
                            position === 'end' && !isPast && "cursor-crosshair",
                            isSelected && "bg-primary/20",
                            reserva && position !== 'end' && "cursor-pointer"
                          )}
                          style={{ width: cellWidth }}
                          onMouseDown={() => handleMouseDown(habitacion.id, dayIndex, reserva, position)}
                          onMouseEnter={() => handleMouseEnter(dayIndex)}
                        >
                          {reserva && position && (
                            <div
                              className={cn(
                                "absolute inset-y-1 flex items-center text-[10px] font-medium overflow-hidden",
                                getStatusColor(reserva, position),
                                position === 'start' && "left-1 right-0 rounded-l-md pl-1.5",
                                position === 'end' && "left-0 right-1 rounded-r-md opacity-70",
                                position === 'middle' && "left-0 right-0"
                              )}
                            >
                              {position === 'start' && (
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
                                <span className="opacity-60 w-full text-center">─</span>
                              )}
                              {position === 'end' && (
                                <span className="opacity-70 text-[9px] w-full text-center">salida</span>
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
                                <Badge variant="outline" className="text-[10px] border-orange-500 text-orange-700 bg-orange-50">
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
                            {position === 'end' && (
                              <p className="text-xs text-green-600 mt-1">
                                ✓ Disponible para nueva reserva
                              </p>
                            )}
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
      
      {/* Leyenda */}
      <div className="p-2 bg-muted/30 border-t flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex gap-4">
          <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-orange-500"></div> Ocupada</span>
          <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-blue-500"></div> Confirmada</span>
          <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-yellow-400"></div> Pendiente</span>
          <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-slate-400"></div> Checkout</span>
        </div>
        <span>💡 Arrastra sobre las celdas vacías para crear una nueva reserva</span>
      </div>
    </div>
  );
}
