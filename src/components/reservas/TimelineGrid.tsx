import { useEffect, useState, useMemo, useRef } from 'react';
import { format, addDays, isSameDay, startOfDay, differenceInCalendarDays, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  ArrowLeftRight, BedDouble, CalendarPlus, CircleDollarSign, Clock3,
  CreditCard, DoorOpen, Eye, LogOut, Receipt, UserPlus, Wrench,
} from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { getEstadoConfig } from './estadoConfig';
import { formatDate } from '@/lib/dateFormat';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export type TimelineReservationAction =
  | 'view'
  | 'checkin'
  | 'checkout'
  | 'extend_stay'
  | 'early_departure'
  | 'room_change'
  | 'add_charge'
  | 'partial_payment';

interface TimelineGridProps {
  habitaciones: any[];
  reservas: any[];
  startDate: Date;
  daysToShow: number;
  onReservationClick: (reserva: any) => void;
  onCreateReservation: (habitacion: any, fechaCheckin: Date, fechaCheckout: Date) => void;
  onReservationAction?: (reserva: any, action: TimelineReservationAction, params?: Record<string, string>) => void;
  focusReservationId?: string | null;
  canCreate?: boolean;
}

export function TimelineGrid({
  habitaciones,
  reservas,
  startDate,
  daysToShow,
  onReservationClick,
  onCreateReservation,
  onReservationAction,
  focusReservationId,
  canCreate = true,
}: TimelineGridProps) {
  const [dragStart, setDragStart] = useState<{ roomId: string; dayIndex: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedReservation, setDraggedReservation] = useState<any | null>(null);
  const [dropTarget, setDropTarget] = useState<{ roomId: string; valid: boolean } | null>(null);
  const [resizePreview, setResizePreview] = useState<{
    reservationId: string;
    checkout: string;
    delta: number;
    valid: boolean;
  } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<{ reserva: any; startX: number; originalCheckout: Date } | null>(null);

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
      return currentDateStr >= checkinStr && currentDateStr < checkoutStr;
    });
  };

  const getReservationPosition = (reserva: any, dayIndex: number) => {
    if (!reserva.fecha_checkin || !reserva.fecha_checkout) return null;
    
    const currentDateStr = format(days[dayIndex], 'yyyy-MM-dd');
    const checkinStr = reserva.fecha_checkin.substring(0, 10);
    const checkoutStr = reserva.fecha_checkout.substring(0, 10);
    const noches = differenceInCalendarDays(parseISO(checkoutStr), parseISO(checkinStr));
    const ultimaNoche = format(addDays(parseISO(checkoutStr), -1), 'yyyy-MM-dd');

    if (noches === 1 && currentDateStr === checkinStr) return 'single';
    if (currentDateStr === checkinStr) return 'start';
    if (currentDateStr === ultimaNoche) return 'end';
    return 'middle';
  };

  const getStatusClasses = (reserva: any) => getEstadoConfig(reserva.estado).block;

  const handleMouseDown = (habitacionId: string, dayIndex: number) => {
    if (!canCreate) return;
    if (getReservationForCell(habitacionId, dayIndex)) return;
    setDragStart({ roomId: habitacionId, dayIndex });
    setDragEnd(dayIndex);
    setIsDragging(true);
  };

  const handleMouseEnter = (habitacionId: string, dayIndex: number) => {
    if (!canCreate) return;
    if (!isDragging || !dragStart || dragStart.roomId !== habitacionId) return;
    if (getReservationForCell(habitacionId, dayIndex)) return;
    setDragEnd(dayIndex);
  };

  const handleMouseUp = () => {
    if (!canCreate) return;
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
      const fechaCheckout = addDays(days[endIdx], 1);
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
  const cellWidthPx = isCompact ? 40 : daysToShow > 7 ? 64 : 80;
  const cellHeight = isCompact ? 'h-7' : 'h-9';

  const fullName = (reserva: any) => [
    reserva.clientes?.nombre,
    reserva.clientes?.apellido_paterno,
    reserva.clientes?.apellido_materno,
  ].filter(Boolean).join(' ') || reserva.cliente_nombre || 'Sin nombre';

  const isRoomAvailableFor = (room: any, reserva: any, checkout = reserva.fecha_checkout) => {
    const maintenance = String(room.estado_mantenimiento || 'OK').toLowerCase();
    if (maintenance !== 'ok' || String(room.estado_habitacion || '').toLowerCase().includes('mantenimiento')) return false;
    const activeStay = ['CheckIn', 'Hospedado'].includes(String(reserva.estado || '')) && !reserva.checkout_realizado;
    if (activeStay) {
      const cleaning = String(room.estado_limpieza || 'Limpia').toLowerCase();
      if (String(room.estado_habitacion || '') !== 'Disponible' || (!cleaning.includes('limpia') && !cleaning.includes('lista'))) return false;
    }
    const checkin = activeStay ? format(today, 'yyyy-MM-dd') : String(reserva.fecha_checkin || '').slice(0, 10);
    const nextCheckout = String(checkout || '').slice(0, 10);
    return !reservas.some((other) => {
      if (other.id === reserva.id || other.habitacion_id !== room.id) return false;
      if (['Cancelada', 'NoShow', 'CheckOut'].includes(String(other.estado || ''))) return false;
      const otherCheckin = String(other.fecha_checkin || '').slice(0, 10);
      const otherCheckout = String(other.fecha_checkout || '').slice(0, 10);
      return checkin < otherCheckout && nextCheckout > otherCheckin;
    });
  };

  const dispatchAction = (
    reserva: any,
    action: TimelineReservationAction,
    params?: Record<string, string>,
  ) => {
    if (action === 'view' || !onReservationAction) onReservationClick(reserva);
    else onReservationAction(reserva, action, params);
  };

  const roomStatus = (room: any) => {
    const maintenance = String(room.estado_mantenimiento || 'OK').toLowerCase();
    const cleaning = String(room.estado_limpieza || '').toLowerCase();
    const state = String(room.estado_habitacion || '').toLowerCase();
    if (maintenance !== 'ok' || state.includes('mantenimiento')) return { label: 'Mantenimiento', dot: 'bg-zinc-500', icon: Wrench };
    if (cleaning && !cleaning.includes('limpia') && !cleaning.includes('lista')) return { label: room.estado_limpieza, dot: 'bg-violet-500', icon: Wrench };
    if (state.includes('ocup')) return { label: 'Ocupada', dot: 'bg-emerald-500', icon: BedDouble };
    if (state.includes('reserv')) return { label: 'Reservada', dot: 'bg-sky-500', icon: BedDouble };
    return { label: room.estado_limpieza || 'Disponible', dot: 'bg-emerald-400', icon: BedDouble };
  };

  useEffect(() => {
    if (!focusReservationId) return;
    const timer = window.setTimeout(() => {
      scrollRef.current
        ?.querySelector<HTMLElement>(`[data-reservation-id="${focusReservationId}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [focusReservationId, days, habitaciones]);

  useEffect(() => {
    const move = (event: PointerEvent) => {
      const resizing = resizeRef.current;
      if (!resizing) return;
      const delta = Math.round((event.clientX - resizing.startX) / cellWidthPx);
      const minimumDelta = 1 - differenceInCalendarDays(resizing.originalCheckout, parseISO(resizing.reserva.fecha_checkin));
      const safeDelta = Math.max(minimumDelta, delta);
      const checkoutDate = addDays(resizing.originalCheckout, safeDelta);
      const checkout = format(checkoutDate, 'yyyy-MM-dd');
      const room = habitaciones.find((item) => item.id === resizing.reserva.habitacion_id);
      setResizePreview({
        reservationId: resizing.reserva.id,
        checkout,
        delta: safeDelta,
        valid: Boolean(room && isRoomAvailableFor(room, resizing.reserva, checkout)),
      });
    };
    const up = () => {
      const resizing = resizeRef.current;
      const preview = resizePreview;
      resizeRef.current = null;
      if (resizing && preview?.reservationId === resizing.reserva.id && preview.delta !== 0 && preview.valid) {
        dispatchAction(resizing.reserva, preview.delta > 0 ? 'extend_stay' : 'early_departure', { checkout: preview.checkout });
      }
      setResizePreview(null);
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
    return () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
    };
  }, [cellWidthPx, habitaciones, onReservationAction, resizePreview, reservas]);

  return (
    <div className="absolute inset-0 flex flex-col border rounded-lg bg-card overflow-hidden">
      {/* Scroller único: sincroniza cabecera de fechas + columna de habitaciones + celdas */}
      <div
        className="flex-1 overflow-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border"
        ref={scrollRef}
      >
        <div className="min-w-max">
          {/* Fila cabecera: sticky top, se mueve con el scroll horizontal */}
          <div className="flex sticky top-0 z-20 bg-card border-b">
            <div className={cn(
              "flex-shrink-0 p-2 border-r bg-card flex items-center justify-center sticky left-0 z-30",
              isCompact ? "w-28" : "w-40"
            )}>
              <span className={cn("font-semibold", isCompact ? "text-[10px]" : "text-xs")}>
                Habitación
              </span>
            </div>
            {days.map((day, idx) => (
              <div key={idx} className={cn(
                "relative border-r text-center py-1.5 px-1 flex-shrink-0 bg-card",
                cellWidth,
                isSameDay(day, today) && 'bg-[#10233F]/[0.06] after:absolute after:inset-x-1 after:bottom-0 after:h-0.5 after:rounded-full after:bg-[#10233F]',
              )}>
                <div className={cn("font-medium", isCompact ? "text-[7px]" : "text-[9px]")}>
                  {format(day, 'EEE', { locale: es })}
                </div>
                <div className={cn("font-bold", isCompact ? "text-[9px]" : "text-xs", isSameDay(day, today) && "text-primary")}>
                  {format(day, 'd')}
                </div>
              </div>
            ))}
          </div>

          {/* Filas por habitación */}
          {habitaciones.map((hab) => {
            const status = roomStatus(hab);
            const dropActive = dropTarget?.roomId === hab.id;
            return (
            <div
              key={hab.id}
              className={cn('flex transition-colors', dropActive && (dropTarget.valid ? 'bg-emerald-50' : 'bg-red-50'))}
              onDragOver={(event) => {
                if (!canCreate || !draggedReservation) return;
                event.preventDefault();
                setDropTarget({ roomId: hab.id, valid: hab.id !== draggedReservation.habitacion_id && isRoomAvailableFor(hab, draggedReservation) });
              }}
              onDrop={(event) => {
                event.preventDefault();
                if (draggedReservation && dropTarget?.roomId === hab.id && dropTarget.valid) {
                  dispatchAction(draggedReservation, 'room_change', { roomId: hab.id });
                }
                setDraggedReservation(null);
                setDropTarget(null);
              }}
            >
              {/* Columna sticky de habitación */}
              <div
                className={cn(
                  "flex-shrink-0 border-r border-b bg-card px-2 py-1 flex items-center gap-1.5 sticky left-0 z-10 min-w-0",
                  isCompact ? "w-28" : "w-40",
                  cellHeight
                )}
              >
                <span className={cn('h-2 w-2 shrink-0 rounded-full', status.dot)} title={status.label} />
                <span className={cn("font-semibold flex-shrink-0", isCompact ? "text-[11px]" : "text-sm")}>{hab.numero}</span>
                <span className={cn("min-w-0 truncate text-muted-foreground", isCompact ? "text-[9px]" : "text-[11px]")} title={`${hab.tipo_nombre || 'Sin categoría'} · ${status.label}`}>
                  {hab.tipo_nombre || status.label}
                </span>
              </div>
                  {days.map((day, dayIndex) => {
                    const reserva = getReservationForCell(hab.id, dayIndex);
                    const position = reserva ? getReservationPosition(reserva, dayIndex) : null;
                    const isSelecting = isCellInDragSelection(hab.id, dayIndex);
                    const isToday = isSameDay(day, today);

                    if (reserva && position) {
                      const estadoCfg = getEstadoConfig(reserva.estado);
                      // Cada noche sigue siendo una celda para conservar el cálculo y los clics,
                      // pero la reserva debe percibirse como una sola barra continua.
                      const solidStatusClasses = estadoCfg.block
                        .split(' ')
                        .filter((className) => !className.startsWith('hover:'))
                        .join(' ');
                      const EstadoIcon = estadoCfg.icon;
                      const tienesSaldo = parseFloat(reserva.saldo_pendiente) > 0;
                      const previousReservation = dayIndex > 0 ? getReservationForCell(hab.id, dayIndex - 1) : null;
                      const isLabelCell = !previousReservation || previousReservation.id !== reserva.id;
                      let visibleSpan = 1;
                      while (
                        dayIndex + visibleSpan < days.length
                        && getReservationForCell(hab.id, dayIndex + visibleSpan)?.id === reserva.id
                      ) visibleSpan += 1;
                      const guestFullName = fullName(reserva);
                      const total = Number(reserva.total || 0);
                      const paid = Number(reserva.total_pagado || 0);
                      const balance = Number(reserva.saldo_pendiente ?? Math.max(0, total - paid));
                      const canCheckin = ['Pendiente', 'Confirmada'].includes(String(reserva.estado || '')) && !reserva.checkin_realizado;
                      const activeStay = ['CheckIn', 'Hospedado'].includes(String(reserva.estado || '')) && !reserva.checkout_realizado;
                      const resizing = resizePreview?.reservationId === reserva.id && (position === 'end' || position === 'single');
                      return (
                        <Popover key={dayIndex}>
                          <TooltipProvider delayDuration={450}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <PopoverTrigger asChild>
                                  <div
                                    data-reservation-id={reserva.id}
                                    draggable={canCreate}
                                    onDragStart={(event) => {
                                      if (!canCreate) return;
                                      event.dataTransfer.effectAllowed = 'move';
                                      setDraggedReservation(reserva);
                                    }}
                                    onDragEnd={() => { setDraggedReservation(null); setDropTarget(null); }}
                                    className={cn(
                                      "relative border-b cursor-pointer flex-shrink-0 select-none",
                                      cellWidth,
                                      cellHeight,
                                      solidStatusClasses,
                                      isLabelCell ? 'z-[2]' : 'z-0',
                                      (position === 'end' || position === 'single') && 'border-r',
                                      (position === 'start' || position === 'single') && 'rounded-l',
                                      (position === 'end' || position === 'single') && 'rounded-r',
                                      focusReservationId === reserva.id && 'ring-2 ring-[#10233F] ring-offset-1',
                                      resizing && !resizePreview?.valid && 'ring-2 ring-red-500 ring-inset',
                                    )}
                                    aria-label={`Reserva ${guestFullName} — ${estadoCfg.label}`}
                                  >
                                    {isLabelCell && (
                                      <div
                                        className="pointer-events-none relative z-10 flex h-full items-center gap-1 overflow-hidden px-1.5"
                                        style={{ width: `${visibleSpan * cellWidthPx}px` }}
                                        title={guestFullName}
                                      >
                                        <EstadoIcon className={cn('flex-shrink-0', isCompact ? 'h-2.5 w-2.5' : 'h-3 w-3')} aria-hidden="true" />
                                        <span className={cn("min-w-0 flex-1 truncate font-semibold", isCompact ? "text-[8px]" : "text-[10px]")}>
                                          {guestFullName}
                                        </span>
                                        {String(reserva.origen || '').toLowerCase() === 'web' && !isCompact && <CalendarPlus className="h-3 w-3 shrink-0" aria-label="Reserva en línea" />}
                                        {reserva.solicitudes_especiales && !isCompact && <Clock3 className="h-3 w-3 shrink-0" aria-label="Solicitud especial" />}
                                        {tienesSaldo && !isCompact && <CircleDollarSign className="h-3 w-3 shrink-0" aria-label="Saldo pendiente" />}
                                      </div>
                                    )}
                                    {canCreate && (position === 'end' || position === 'single') && (
                                      <button
                                        type="button"
                                        className="absolute inset-y-1 right-0 z-20 w-2 cursor-ew-resize rounded-full bg-white/0 transition-colors hover:bg-white/50"
                                        aria-label="Ajustar fecha de salida"
                                        onClick={(event) => event.stopPropagation()}
                                        onPointerDown={(event) => {
                                          event.preventDefault();
                                          event.stopPropagation();
                                          resizeRef.current = {
                                            reserva,
                                            startX: event.clientX,
                                            originalCheckout: parseISO(String(reserva.fecha_checkout).slice(0, 10)),
                                          };
                                          setResizePreview({ reservationId: reserva.id, checkout: String(reserva.fecha_checkout).slice(0, 10), delta: 0, valid: true });
                                        }}
                                      />
                                    )}
                                    {resizing && resizePreview && (
                                      <div className={cn(
                                        'pointer-events-none absolute bottom-full right-0 z-50 mb-2 w-max rounded-lg px-2.5 py-1.5 text-[10px] font-semibold shadow-lg',
                                        resizePreview.valid ? 'bg-[#10233F] text-white' : 'bg-red-600 text-white',
                                      )}>
                                        {resizePreview.valid
                                          ? `${resizePreview.delta > 0 ? '+' : ''}${resizePreview.delta} noche${Math.abs(resizePreview.delta) === 1 ? '' : 's'} · ${resizePreview.delta >= 0 ? '+' : '−'}${formatCurrency(Math.abs(resizePreview.delta * Number(reserva.tarifa_noche || 0)))} estimado`
                                          : 'Conflicto con otra reserva'}
                                      </div>
                                    )}
                                  </div>
                                </PopoverTrigger>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="w-72 p-3">
                                <div className="space-y-2">
                                  <div className="flex items-start justify-between gap-2">
                                    <div><p className="font-semibold">{guestFullName}</p><p className="text-xs text-muted-foreground">Hab. {reserva.habitacion_numero || hab.numero} · {reserva.numero_reserva || 'Sin folio'}</p></div>
                                    <Badge className={cn('gap-1', solidStatusClasses)}><EstadoIcon className="h-3 w-3" />{estadoCfg.label}</Badge>
                                  </div>
                                  <p className="text-xs">{formatDate(reserva.fecha_checkin)} → {formatDate(reserva.fecha_checkout)} · {reserva.noches || differenceInCalendarDays(parseISO(reserva.fecha_checkout), parseISO(reserva.fecha_checkin))} noches</p>
                                  <p className="text-xs">{reserva.adultos || 0} adultos{Number(reserva.ninos || 0) > 0 ? ` · ${reserva.ninos} menores` : ''}{reserva.origen ? ` · ${reserva.origen}` : ''}</p>
                                  <div className="grid grid-cols-3 gap-2 rounded-md bg-muted/60 p-2 text-[10px]"><span>Total<br/><strong>{formatCurrency(total)}</strong></span><span>Pagado<br/><strong className="text-emerald-700">{formatCurrency(paid)}</strong></span><span>Saldo<br/><strong className={balance > 0 ? 'text-red-600' : ''}>{formatCurrency(balance)}</strong></span></div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          <PopoverContent align="start" className="w-[min(22rem,calc(100vw-2rem))] p-0">
                            <div className="border-b p-4">
                              <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-bold text-[#10233F]">{guestFullName}</p><p className="mt-0.5 text-xs text-muted-foreground">Hab. {reserva.habitacion_numero || hab.numero} · {formatDate(reserva.fecha_checkin)} → {formatDate(reserva.fecha_checkout)}</p></div><Badge variant="outline" className={estadoCfg.badge}>{estadoCfg.label}</Badge></div>
                              <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-[#10233F]/[0.04] p-2.5 text-xs"><div><p className="text-muted-foreground">Total</p><p className="font-bold">{formatCurrency(total)}</p></div><div><p className="text-muted-foreground">Pagado</p><p className="font-bold text-emerald-700">{formatCurrency(paid)}</p></div><div><p className="text-muted-foreground">Saldo</p><p className={cn('font-bold', balance > 0 && 'text-red-600')}>{formatCurrency(balance)}</p></div></div>
                            </div>
                            <div className="space-y-3 p-3">
                              <Button className="w-full bg-[#10233F] hover:bg-[#10233F]/90" onClick={() => dispatchAction(reserva, 'view')}><Eye className="mr-2 h-4 w-4" />Ver expediente completo</Button>
                              {canCreate ? <>
                                {(canCheckin || activeStay) && <Button variant="outline" className="w-full" onClick={() => dispatchAction(reserva, canCheckin ? 'checkin' : 'checkout')}>{canCheckin ? <DoorOpen className="mr-2 h-4 w-4 text-emerald-600" /> : <LogOut className="mr-2 h-4 w-4 text-orange-600" />}{canCheckin ? 'Realizar check-in' : 'Realizar check-out'}</Button>}
                                <div className="grid grid-cols-2 gap-2">
                                  <QuickAction icon={CalendarPlus} label="Extender" onClick={() => dispatchAction(reserva, 'extend_stay')} />
                                  <QuickAction icon={ArrowLeftRight} label="Cambiar habitación" onClick={() => dispatchAction(reserva, 'room_change')} />
                                  <QuickAction icon={Receipt} label="Consumo" onClick={() => dispatchAction(reserva, 'add_charge')} />
                                  <QuickAction icon={CreditCard} label="Registrar pago" onClick={() => dispatchAction(reserva, 'partial_payment')} />
                                </div>
                              </> : <p className="rounded-lg bg-blue-50 p-2.5 text-center text-xs text-blue-800">Modo sólo consulta. Abre un turno para realizar operaciones.</p>}
                            </div>
                          </PopoverContent>
                        </Popover>
                      );
                    }

                    return (
                      <div
                        key={dayIndex}
                        className={cn(
                          "border-r border-b transition-colors flex-shrink-0",
                          canCreate ? "cursor-crosshair hover:bg-accent/50" : "cursor-default bg-muted/10",
                          cellWidth,
                          cellHeight,
                          isSelecting && "bg-primary/20",
                          isToday && "border-l-2 border-l-[#10233F] bg-[#10233F]/[0.03]"
                        )}
                        onMouseDown={canCreate ? () => handleMouseDown(hab.id, dayIndex) : undefined}
                        onMouseEnter={canCreate ? () => handleMouseEnter(hab.id, dayIndex) : undefined}
                        onMouseUp={canCreate ? handleMouseUp : undefined}
                      />
                    );
                  })}
            </div>
          );})}
        </div>
      </div>

      {draggedReservation && (
        <div className={cn(
          'pointer-events-none absolute bottom-11 left-1/2 z-50 -translate-x-1/2 rounded-full px-4 py-2 text-xs font-semibold shadow-xl',
          !dropTarget ? 'bg-[#10233F] text-white' : dropTarget.valid ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white',
        )}>
          {!dropTarget ? 'Suelta sobre otra habitación' : dropTarget.valid ? 'Habitación disponible · suelta para continuar' : 'Habitación no disponible para estas fechas'}
        </div>
      )}

      {/* Footer fijo */}
      <div className="flex-shrink-0 p-2 bg-muted/30 border-t flex items-center justify-between text-[10px] text-muted-foreground gap-2 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          <span className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-emerald-500"></div> Check-In</span>
          <span className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-sky-500"></div> Confirmada</span>
          <span className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-amber-500"></div> Pendiente</span>
          <span className="flex items-center gap-1"><CircleDollarSign className="h-3 w-3" /> Saldo</span>
        </div>
        <span className="hidden sm:inline">{canCreate ? 'Arrastra un espacio para reservar · mueve una barra para cambiar habitación · ajusta su extremo para cambiar la salida' : 'Modo sólo consulta'}</span>
      </div>
    </div>
  );
}

function QuickAction({ icon: Icon, label, onClick }: { icon: typeof Eye; label: string; onClick: () => void }) {
  return <Button type="button" variant="outline" className="h-auto min-h-14 justify-start gap-2 px-3 py-2 text-left" onClick={onClick}>
    <Icon className="h-4 w-4 shrink-0 text-[#10233F]" />
    <span className="whitespace-normal text-xs font-medium">{label}</span>
  </Button>;
}
