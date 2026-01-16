import { useState, useMemo, useRef } from 'react';
import { format, addDays, isSameDay, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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

  const isCellAvailableForNewReservation = (habitacionId: string, dayIndex: number) => {
    const roomReservas = getReservasForRoom(habitacionId);
    const currentDay = days[dayIndex];
    const currentDateStr = format(currentDay, 'yyyy-MM-dd');

    const conflicto = roomReservas.find(r => {
      if (!r.fecha_checkin || !r.fecha_checkout) return false;
      const checkinStr = r.fecha_checkin.substring(0, 10);
      const checkoutStr = r.fecha_checkout.substring(0, 10);
      return currentDateStr >= checkinStr && currentDateStr < checkoutStr;
    });

    return !conflicto;
  };

  const getReservationPosition = (reserva: any, dayIndex: number) => {
    if (!reserva.fecha_checkin || !reserva.fecha_checkout) return null;
    const currentDateStr = format(days[dayIndex], 'yyyy-MM-dd');
    const checkinStr = reserva.fecha_checkin.substring(0, 10);
    const checkoutStr = reserva.fecha_checkout.substring(0, 10);

    if (currentDateStr === checkoutStr) return 'end';
    if (currentDateStr === checkinStr) return 'start';
    if (currentDateStr > checkinStr && currentDateStr < checkoutStr) return 'middle';
    return null;
  };

  const getStatusColor = (reserva: any, position?: string) => {
    const estado = reserva.estado?.toLowerCase();
    const esWalkin = reserva.origen === 'Recepcion';
    
    if (position === 'end') {
      if (estado === 'checkin' || estado === 'hospedado') return 'bg-orange-300 text-orange-900';
      if (estado === 'confirmada') return esWalkin ? 'bg-amber-300 text-amber-800' : 'bg-blue-300 text-blue-800';
      if (estado === 'pendiente') return 'bg-yellow-200 text-yellow-800';
    }
    
    if (estado === 'cancelada' || estado === 'noshow') return 'bg-red-400 text-white';
    if (estado === 'checkout') return 'bg-slate-400 text-white';
    
    if (estado === 'checkin' || estado === 'hospedado') {
      return esWalkin ? 'bg-orange-500 text-white' : 'bg-orange-600 text-white';
    }
    
    if (estado === 'confirmada') {
      return esWalkin ? 'bg-amber-500 text-white' : 'bg-blue-500 text-white';
    }
    
    if (estado === 'pendiente') {
      return esWalkin ? 'bg-yellow-500 text-yellow-900' : 'bg-yellow-400 text-yellow-900';
    }
    
    return 'bg-gray-400 text-white';
  };

  const handleMouseDown = (habitacionId: string, dayIndex: number, reserva: any, position: string | null) => {
    if (reserva && position !== 'end') {
      onReservationClick(reserva);
      return;
    }

    const selectedDay = days[dayIndex];
    if (selectedDay < startOfDay(new Date())) return;

    if (!isCellAvailableForNewReservation(habitacionId, dayIndex)) {
      if (reserva) onReservationClick(reserva);
      return;
    }

    setDragStart({ roomId: habitacionId, dayIndex });
    setDragEnd(dayIndex);
    setIsDragging(true);
  };

  const handleMouseEnter = (dayIndex: number) => {
    if (isDragging && dragStart) setDragEnd(dayIndex);
  };

  const handleMouseUp = () => {
    if (isDragging && dragStart && dragEnd !== null) {
      const habitacion = habitaciones.find(h => h.id === dragStart.roomId);
      if (habitacion) {
        const startIdx = Math.min(dragStart.dayIndex, dragEnd);
        const endIdx = Math.max(dragStart.dayIndex, dragEnd);
        onCreateReservation(habitacion, days[startIdx], days[endIdx]);
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

  // Ancho dinámico según días
  const cellWidth = daysToShow <= 7 ? 90 : daysToShow <= 14 ? 70 : 50;
  const roomColumnWidth = 100;

  const getReservationDays = (reserva: any) => {
    if (!reserva.fecha_checkin || !reserva.fecha_checkout) return 0;
    const checkin = new Date(reserva.fecha_checkin.substring(0, 10) + 'T00:00:00');
    const checkout = new Date(reserva.fecha_checkout.substring(0, 10) + 'T00:00:00');
    return Math.ceil((checkout.getTime() - checkin.getTime()) / (1000 * 60 * 60 * 24));
  };

  const isCompact = daysToShow > 14;

  return (
    <div 
      className="border rounded-lg overflow-hidden bg-card flex flex-col h-full"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="flex-1 overflow-auto" ref={gridRef}>
        <table className="border-collapse" style={{ minWidth: roomColumnWidth + (cellWidth * daysToShow) }}>
          <thead className="sticky top-0 z-20">
            <tr className="bg-muted/50">
              <th 
                className="sticky left-0 z-30 bg-muted/80 border-r border-b px-2 py-2 text-left text-xs font-medium"
                style={{ width: roomColumnWidth, minWidth: roomColumnWidth }}
              >
                Habitación
              </th>
              {days.map((day, index) => {
                const isToday = isSameDay(day, new Date());
                return (
                  <th
                    key={index}
                    className={cn(
                      "border-r border-b px-1 py-1 text-center",
                      isToday && "bg-primary/20",
                      (day.getDay() === 0 || day.getDay() === 6) && !isToday && "bg-muted/30",
                      day < startOfDay(new Date()) && "bg-muted/40 opacity-60"
                    )}
                    style={{ width: cellWidth, minWidth: cellWidth }}
                  >
                    <div className={cn("font-medium", isToday && "text-primary", isCompact ? "text-[9px]" : "text-xs")}>
                      {format(day, isCompact ? 'EEEEE' : 'EEE', { locale: es })}
                    </div>
                    <div className={cn("text-muted-foreground", isToday && "text-primary font-semibold", isCompact ? "text-[9px]" : "text-xs")}>
                      {format(day, 'd', { locale: es })}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {habitaciones.map((habitacion) => (
              <tr key={habitacion.id} className="hover:bg-muted/10 group">
                <td 
                  className="sticky left-0 z-10 bg-muted/30 group-hover:bg-muted/50 border-r border-b px-2 py-1"
                  style={{ width: roomColumnWidth, minWidth: roomColumnWidth }}
                >
                  <div className="flex items-center gap-1">
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium text-xs truncate">{habitacion.numero}</span>
                      <span className="text-[9px] text-muted-foreground truncate">
                        {habitacion.tipo_codigo || habitacion.tipo_nombre?.substring(0, 6)}
                      </span>
                    </div>
                    {habitacion.estado_limpieza === 'Sucia' && <span className="text-[9px]">🧹</span>}
                    {habitacion.estado_mantenimiento !== 'OK' && habitacion.estado_mantenimiento && <span className="text-[9px]">🔧</span>}
                  </div>
                </td>
                
                {days.map((day, dayIndex) => {
                  const reserva = getReservationForCell(habitacion.id, dayIndex);
                  const position = reserva ? getReservationPosition(reserva, dayIndex) : null;
                  const isSelected = isDragSelected(habitacion.id, dayIndex);
                  return (
                    <TooltipProvider key={dayIndex}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <td
                            className={cn(
                              "border-r border-b relative p-0",
                              isSameDay(day, new Date()) && "bg-primary/5",
                              (day.getDay() === 0 || day.getDay() === 6) && "bg-muted/5",
                              !reserva && !isSelected && "hover:bg-primary/10 cursor-crosshair",
                              isSelected && "bg-primary/20",
                              reserva && position !== 'end' && "cursor-pointer"
                            )}
                            style={{ width: cellWidth, minWidth: cellWidth, height: isCompact ? 36 : 42 }}
                            onMouseDown={() => handleMouseDown(habitacion.id, dayIndex, reserva, position)}
                            onMouseEnter={() => handleMouseEnter(dayIndex)}
                          >
                            {reserva && position && (
                              <div
                                className={cn(
                                  "absolute inset-y-0.5 flex items-center font-medium overflow-hidden",
                                  getStatusColor(reserva, position),
                                  position === 'start' && "left-0.5 right-0 rounded-l pl-1",
                                  position === 'end' && "left-0 right-0.5 rounded-r opacity-70",
                                  position === 'middle' && "left-0 right-0",
                                  isCompact ? "text-[8px]" : "text-[10px]"
                                )}
                              >
                                {position === 'start' && (
                                  <div className="flex flex-col leading-tight truncate">
                                    <span className="font-semibold truncate flex items-center gap-0.5">
                                      {reserva.origen === 'Recepcion' && <UserPlus className="h-2 w-2 flex-shrink-0" />}
                                      {isCompact 
                                        ? (reserva.cliente_nombre?.substring(0, 4) || 'H')
                                        : (reserva.cliente_nombre?.substring(0, 8) || 'Huésped')
                                      }
                                    </span>
                                    {!isCompact && <span className="opacity-80 text-[8px]">{getReservationDays(reserva)}n</span>}
                                  </div>
                                )}
                                {position === 'middle' && <span className="opacity-50 w-full text-center">{isCompact ? '' : '─'}</span>}
                                {position === 'end' && <span className="opacity-70 w-full text-center text-[8px]">→</span>}
                              </div>
                            )}
                          </td>
                        </TooltipTrigger>
                        
                        {reserva && (
                          <TooltipContent side="top" className="max-w-xs p-3 z-50">
                            <div className="text-sm space-y-1">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold">{reserva.cliente_nombre || 'Huésped'} {reserva.apellido_paterno || ''}</p>
                                {reserva.origen === 'Recepcion' ? (
                                  <Badge variant="outline" className="text-[10px] border-orange-500 text-orange-700 bg-orange-50">Walk-in</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[10px] border-blue-500 text-blue-700 bg-blue-50">Reserva</Badge>
                                )}
                              </div>
                              {reserva.cliente_telefono && <p className="text-muted-foreground text-xs">📞 {reserva.cliente_telefono}</p>}
                              <p className="text-muted-foreground text-xs">
                                {format(new Date(reserva.fecha_checkin), "d MMM", { locale: es })} → {format(new Date(reserva.fecha_checkout), "d MMM", { locale: es })}
                              </p>
                              <p className="text-xs">{getReservationDays(reserva)}n · {reserva.adultos || 1} adultos</p>
                              {reserva.total && <p className="font-medium text-primary">${Number(reserva.total).toLocaleString()}</p>}
                              <Badge className={cn("text-[10px]", getStatusColor(reserva))}>{reserva.estado}</Badge>
                            </div>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="p-2 bg-muted/30 border-t flex items-center justify-between text-[10px] text-muted-foreground flex-shrink-0">
        <div className="flex gap-3 flex-wrap">
          <span className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-orange-500"></div> Ocupada</span>
          <span className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-blue-500"></div> Confirmada</span>
          <span className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-yellow-400"></div> Pendiente</span>
        </div>
        <span className="hidden sm:inline">Arrastra para reservar</span>
      </div>
    </div>
  );
}
