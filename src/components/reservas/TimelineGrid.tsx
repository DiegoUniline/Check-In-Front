import { useState, useMemo, useRef } from 'react';
import { format, addDays, isSameDay, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { UserPlus } from 'lucide-react';

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
    if (position === 'end') {
      if (estado === 'checkin' || estado === 'hospedado') return 'bg-orange-300';
      if (estado === 'confirmada') return 'bg-blue-300';
      if (estado === 'pendiente') return 'bg-yellow-200';
    }
    if (estado === 'cancelada' || estado === 'noshow') return 'bg-red-400 text-white';
    if (estado === 'checkout') return 'bg-slate-400 text-white';
    if (estado === 'checkin' || estado === 'hospedado') return 'bg-orange-500 text-white';
    if (estado === 'confirmada') return 'bg-blue-500 text-white';
    if (estado === 'pendiente') return 'bg-yellow-400';
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

  const cellW = daysToShow <= 7 ? 80 : daysToShow <= 14 ? 60 : 40;
  const roomW = 80;
  const isCompact = daysToShow > 14;

  const getReservationDays = (reserva: any) => {
    if (!reserva.fecha_checkin || !reserva.fecha_checkout) return 0;
    const checkin = new Date(reserva.fecha_checkin.substring(0, 10) + 'T00:00:00');
    const checkout = new Date(reserva.fecha_checkout.substring(0, 10) + 'T00:00:00');
    return Math.ceil((checkout.getTime() - checkin.getTime()) / (1000 * 60 * 60 * 24));
  };

  return (
    <div 
      className="absolute inset-0 border rounded-lg bg-card flex flex-col"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Scroll container */}
      <div ref={scrollRef} className="flex-1 overflow-auto">
        <table className="border-collapse" style={{ width: roomW + (cellW * daysToShow) }}>
          <thead className="sticky top-0 z-20">
            <tr className="bg-muted">
              <th 
                className="sticky left-0 z-30 bg-muted border-r border-b p-1 text-[10px] font-medium text-left"
                style={{ width: roomW, minWidth: roomW }}
              >
                Hab.
              </th>
              {days.map((day, i) => {
                const isToday = isSameDay(day, new Date());
                return (
                  <th
                    key={i}
                    className={cn(
                      "border-r border-b p-0.5 text-center",
                      isToday && "bg-primary/20",
                      (day.getDay() === 0 || day.getDay() === 6) && !isToday && "bg-muted/70"
                    )}
                    style={{ width: cellW, minWidth: cellW }}
                  >
                    <div className={cn("font-medium", isToday && "text-primary", isCompact ? "text-[7px]" : "text-[9px]")}>
                      {format(day, isCompact ? 'EEEEE' : 'EEE', { locale: es })}
                    </div>
                    <div className={cn(isToday && "text-primary font-bold", isCompact ? "text-[8px]" : "text-[9px]")}>
                      {format(day, 'd')}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {habitaciones.map((hab) => (
              <tr key={hab.id} className="hover:bg-muted/10">
                <td 
                  className="sticky left-0 z-10 bg-muted/50 border-r border-b p-1"
                  style={{ width: roomW, minWidth: roomW }}
                >
                  <div className="text-[10px] font-medium truncate">{hab.numero}</div>
                  <div className="text-[8px] text-muted-foreground truncate">{hab.tipo_codigo || hab.tipo_nombre?.slice(0,4)}</div>
                </td>
                {days.map((day, dayIndex) => {
                  const reserva = getReservationForCell(hab.id, dayIndex);
                  const position = reserva ? getReservationPosition(reserva, dayIndex) : null;
                  const isSelected = isDragSelected(hab.id, dayIndex);
                  const isToday = isSameDay(day, new Date());
                  
                  return (
                    <TooltipProvider key={dayIndex}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <td
                            className={cn(
                              "border-r border-b p-0 relative",
                              isToday && "bg-primary/5",
                              (day.getDay() === 0 || day.getDay() === 6) && "bg-muted/10",
                              !reserva && !isSelected && "hover:bg-primary/10 cursor-crosshair",
                              isSelected && "bg-primary/25",
                              reserva && position !== 'end' && "cursor-pointer"
                            )}
                            style={{ width: cellW, minWidth: cellW, height: isCompact ? 28 : 34 }}
                            onMouseDown={() => handleMouseDown(hab.id, dayIndex, reserva, position)}
                            onMouseEnter={() => handleMouseEnter(dayIndex)}
                          >
                            {reserva && position && (
                              <div
                                className={cn(
                                  "absolute inset-y-0.5 flex items-center text-[8px] font-medium overflow-hidden",
                                  getStatusColor(reserva, position),
                                  position === 'start' && "left-0.5 right-0 rounded-l pl-0.5",
                                  position === 'end' && "left-0 right-0.5 rounded-r opacity-50",
                                  position === 'middle' && "left-0 right-0"
                                )}
                              >
                                {position === 'start' && (
                                  <span className="truncate">{reserva.cliente_nombre?.slice(0, isCompact ? 3 : 6) || 'H'}</span>
                                )}
                                {position === 'end' && <span className="w-full text-center text-[7px]">→</span>}
                              </div>
                            )}
                          </td>
                        </TooltipTrigger>
                        {reserva && (
                          <TooltipContent side="top" className="p-2 text-xs z-50">
                            <p className="font-semibold">{reserva.cliente_nombre}</p>
                            <p>{format(new Date(reserva.fecha_checkin), "d MMM", { locale: es })} → {format(new Date(reserva.fecha_checkout), "d MMM", { locale: es })}</p>
                            <p>{getReservationDays(reserva)}n · ${Number(reserva.total || 0).toLocaleString()}</p>
                            <Badge className={cn("text-[8px] mt-1", getStatusColor(reserva))}>{reserva.estado}</Badge>
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
      
      {/* Footer */}
      <div className="shrink-0 px-2 py-1 bg-muted/50 border-t flex items-center justify-between text-[8px] text-muted-foreground">
        <div className="flex gap-2">
          <span className="flex items-center gap-0.5"><span className="w-2 h-2 rounded bg-orange-500"></span>Ocupada</span>
          <span className="flex items-center gap-0.5"><span className="w-2 h-2 rounded bg-blue-500"></span>Confirmada</span>
          <span className="flex items-center gap-0.5"><span className="w-2 h-2 rounded bg-yellow-400"></span>Pendiente</span>
        </div>
        <span>Arrastra para reservar</span>
      </div>
    </div>
  );
}
