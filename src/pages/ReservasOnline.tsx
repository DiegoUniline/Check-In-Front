import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AlertTriangle, Check, ChevronLeft, ChevronRight, Inbox, Loader2, RefreshCw, Search, X } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import api, { todayLocal } from '@/lib/api';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { useShift } from '@/contexts/useShift';
import { formatCurrency } from '@/lib/currency';
import { formatDate, formatDateTime } from '@/lib/dateFormat';
import { filterOnlineReservations, onlineReservationDateError, onlineReservationSnapshot, type OnlineReservationFilters } from '@/lib/onlineReservations';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PoliticasReservaPanel } from '@/components/reservas/PoliticasReservaPanel';
import { canAccess } from '@/lib/permissions';
import { useAuth } from '@/contexts/useAuth';

const initialFilters: OnlineReservationFilters = { search: '', status: 'Pendiente', roomType: 'all', from: '', to: '' };
const pageSize = 20;
const selectClass = 'h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const statusClass: Record<string, string> = {
  Pendiente: 'border-amber-200 bg-amber-50 text-amber-800', Confirmada: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  Cancelada: 'border-red-200 bg-red-50 text-red-700', CheckIn: 'border-blue-200 bg-blue-50 text-blue-800',
};

export default function ReservasOnline() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { viewOnlyMode } = useShift();
  const verPoliticas = canAccess('politicas_reserva', user?.rol);
  const qc = useQueryClient();
  const hotelId = api.getHotelId();
  const [filters, setFilters] = useState(initialFilters);
  const [page, setPage] = useState(1);
  const [review, setReview] = useState<any>(null);
  const [roomId, setRoomId] = useState('');
  const [reject, setReject] = useState<any>(null);
  const [reason, setReason] = useState('');

  const { data: reservations = [], isLoading, error, isFetching, refetch } = useQuery({
    queryKey: ['reservas-online', hotelId], queryFn: () => api.getReservasOnline(),
  });
  const availability = useQuery({
    queryKey: ['reserva-online-disponibilidad', hotelId, review?.id],
    queryFn: () => api.getDisponibilidadReservaOnline(review.id),
    enabled: Boolean(review), retry: false, staleTime: 0,
  });
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['reservas-online'] });
    void qc.invalidateQueries({ queryKey: ['reservas-online-pendientes'] });
    void qc.invalidateQueries({ queryKey: ['reservas-online-count'] });
    void qc.invalidateQueries({ queryKey: ['reserva-online-disponibilidad'] });
    void qc.invalidateQueries({ queryKey: ['reservas'] });
  };
  useRealtimeSync('reservas', refresh);
  useRealtimeSync('habitaciones', () => { void qc.invalidateQueries({ queryKey: ['reserva-online-disponibilidad'] }); });

  const confirm = useMutation({
    mutationFn: ({ id, selectedRoom, snapshot }: { id: string; selectedRoom: string; snapshot: string }) => api.confirmarReservaOnline(id, selectedRoom, snapshot),
    onSuccess: () => {
      toast({ title: 'Reserva aceptada', description: 'La habitación quedó asignada y la reserva confirmada.' });
      setReview(null); refresh();
    },
    onError: () => { refresh(); },
  });
  const rejectMutation = useMutation({
    mutationFn: ({ id, motive }: { id: string; motive: string }) => api.rechazarReservaOnline(id, motive),
    onSuccess: () => { toast({ title: 'Reserva rechazada', description: 'El motivo quedó registrado.' }); setReject(null); refresh(); },
    onError: () => { refresh(); },
  });
  const busy = confirm.isPending || rejectMutation.isPending;
  const invalidRange = Boolean(filters.from && filters.to && filters.from > filters.to);
  const filtered = useMemo(() => invalidRange ? [] : filterOnlineReservations(reservations, filters), [reservations, filters, invalidRange]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const types = useMemo(() => Array.from(new Map<string, string>(reservations.filter((r) => r.tipo_habitacion_id)
    .map((r) => [r.tipo_habitacion_id, r.tipo_nombre || 'Sin nombre'])).entries()).sort((a, b) => a[1].localeCompare(b[1])), [reservations]);
  const pending = reservations.filter((r) => r.estado === 'Pendiente').length;
  const changeFilter = (key: keyof OnlineReservationFilters, value: string) => { setFilters((current) => ({ ...current, [key]: value })); setPage(1); };
  const checkedReservation = availability.data?.reserva;
  const rooms = availability.data?.habitaciones || [];
  const selectedRoomAvailable = rooms.some((room) => room.id === roomId);
  const allowConfirm = Boolean(checkedReservation && selectedRoomAvailable && !availability.isFetching && !availability.error && !busy && !viewOnlyMode);

  return <MainLayout title="Reservas online" subtitle="Revisa las solicitudes, comprueba disponibilidad y confirma su habitación.">
    <Tabs defaultValue="reservas" className="space-y-4">
      <TabsList>
        <TabsTrigger value="reservas">Reservas{pending ? ` · ${pending} pendientes` : ''}</TabsTrigger>
        {verPoliticas && <TabsTrigger value="politicas">Políticas de reserva</TabsTrigger>}
      </TabsList>
      {verPoliticas && <TabsContent value="politicas"><PoliticasReservaPanel /></TabsContent>}
      <TabsContent value="reservas" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-lg font-semibold text-[#10233F]">Solicitudes desde tu página web</h2><p className="text-sm text-muted-foreground">{pending} pendientes de revisión · {reservations.length} reservas en total</p></div>
          <Button variant="outline" onClick={() => { void refetch(); }} disabled={isFetching}><RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />Actualizar</Button>
        </div>
        {viewOnlyMode && <p className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">Abre un turno para aceptar o rechazar solicitudes. Puedes consultar las reservas.</p>}
        <div className="grid gap-3 rounded-lg border bg-white p-4 sm:grid-cols-2 xl:grid-cols-[2fr_1fr_1.3fr_1fr_1fr_auto]">
          <div className="space-y-1.5"><Label htmlFor="online-search">Buscar reserva</Label><div className="relative"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input id="online-search" className="h-10 pl-9" placeholder="Huésped, folio o contacto" value={filters.search} onChange={(event) => changeFilter('search', event.target.value)} /></div></div>
          <div className="space-y-1.5"><Label htmlFor="online-status">Estado</Label><select id="online-status" className={selectClass} value={filters.status} onChange={(event) => changeFilter('status', event.target.value)}>
            <option value="all">Todos</option><option value="Pendiente">Pendientes</option><option value="Confirmada">Confirmadas</option><option value="Cancelada">Canceladas / rechazadas</option><option value="CheckIn">Check-in</option><option value="Hospedado">Hospedadas</option><option value="CheckOut">Check-out</option><option value="NoShow">No-show</option>
          </select></div>
          <div className="space-y-1.5"><Label htmlFor="online-type">Tipo de habitación</Label><select id="online-type" className={selectClass} value={filters.roomType} onChange={(event) => changeFilter('roomType', event.target.value)}><option value="all">Todos los tipos</option>{types.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></div>
          <div className="space-y-1.5"><Label htmlFor="online-from">Entrada desde</Label><Input id="online-from" className="h-10" type="date" value={filters.from} onChange={(event) => changeFilter('from', event.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="online-to">Entrada hasta</Label><Input id="online-to" className="h-10" type="date" min={filters.from || undefined} value={filters.to} onChange={(event) => changeFilter('to', event.target.value)} /></div>
          <Button className="self-end" variant="ghost" onClick={() => { setFilters({ ...initialFilters, status: 'all' }); setPage(1); }}>Limpiar</Button>
        </div>
        {invalidRange && <p role="alert" className="text-sm text-red-700">La fecha “hasta” no puede ser anterior a “desde”.</p>}
        {error ? <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">No se pudieron cargar las reservas. {error.message} <Button variant="outline" size="sm" onClick={() => { void refetch(); }}>Reintentar</Button></div> : <div className="overflow-hidden rounded-lg border bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-sm">
              <caption className="sr-only">Reservas online filtradas por estado, huésped, habitación y fecha de entrada</caption>
              <thead className="border-b bg-slate-50 text-left text-xs text-muted-foreground"><tr>
                {['Reserva / huésped', 'Entrada / salida', 'Habitación', 'Huéspedes', 'Total', 'Estado', 'Revisión', 'Acciones'].map((heading) => <th key={heading} scope="col" className="px-4 py-3 font-medium">{heading}</th>)}
              </tr></thead>
              <tbody>
                {isLoading ? <tr><td colSpan={8} className="p-10 text-center text-muted-foreground"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Cargando reservas…</td></tr> : visible.length === 0 ? <tr><td colSpan={8} className="p-10 text-center text-muted-foreground"><Inbox className="mx-auto mb-2 h-7 w-7" />{reservations.length ? 'No hay reservas que coincidan con los filtros.' : 'Todavía no hay reservas online.'}</td></tr> : visible.map((r) => {
                  const dateError = onlineReservationDateError(r, todayLocal());
                  const isPending = r.estado === 'Pendiente';
                  return <tr key={r.id} className="border-b last:border-0 hover:bg-slate-50/70">
                    <td className="max-w-[240px] px-4 py-3"><Link className="font-semibold text-[#10233F] hover:underline" to={`/reservas/detalle/${r.id}`}>{r.cliente_nombre || 'Sin nombre'}</Link><div className="mt-0.5 text-xs text-muted-foreground">{r.numero_reserva || r.id.slice(0, 8)}</div><div className="mt-1 break-words text-xs text-muted-foreground">{r.cliente_telefono || r.cliente_email || 'Sin contacto'}</div></td>
                    <td className="whitespace-nowrap px-4 py-3"><div>{formatDate(r.fecha_checkin)}</div><div className="text-xs text-muted-foreground">a {formatDate(r.fecha_checkout)}</div></td>
                    <td className="max-w-[190px] px-4 py-3"><div>{r.habitacion_numero ? `Hab. ${r.habitacion_numero}` : 'Sin asignar'}</div><div className="text-xs text-muted-foreground">{r.tipo_nombre || 'Sin tipo'}</div></td>
                    <td className="whitespace-nowrap px-4 py-3">{r.adultos || 0} adultos{r.ninos > 0 && <div className="text-xs text-muted-foreground">{r.ninos} menores</div>}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold">{formatCurrency(Number(r.total || 0))}</td>
                    <td className="px-4 py-3"><Badge variant="outline" className={statusClass[r.estado] || ''}>{r.estado === 'Pendiente' ? 'Por aceptar' : r.estado}</Badge></td>
                    <td className="max-w-[200px] px-4 py-3 text-xs text-muted-foreground">{isPending ? dateError ? <span className="text-amber-700">Fechas por corregir</span> : 'Validar antes de aceptar' : <>{r.confirmada_por_nombre || r.cancelada_por_nombre || 'Procesada'}<div>{formatDateTime(r.revisada_at || r.confirmada_at || r.cancelada_at)}</div></>}</td>
                    <td className="px-4 py-3"><div className="flex justify-end gap-2">
                      {isPending ? <><Button variant="outline" size="sm" disabled={busy || viewOnlyMode} onClick={() => { rejectMutation.reset(); setReject(r); setReason(''); }}>Rechazar</Button><Button size="sm" className="bg-[#10233F] hover:bg-[#10233F]/90" disabled={busy || viewOnlyMode} onClick={() => { confirm.reset(); setRoomId(r.habitacion_id || ''); setReview(r); }}>Revisar</Button></> : <Button asChild variant="outline" size="sm"><Link to={`/reservas/detalle/${r.id}`}>Ver expediente</Link></Button>}
                    </div></td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-xs text-muted-foreground">
            <span>{filtered.length ? `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, filtered.length)} de ${filtered.length}` : '0 resultados'}</span>
            <div className="flex items-center gap-2"><Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} aria-label="Página anterior"><ChevronLeft className="h-4 w-4" /></Button><span>Página {currentPage} de {totalPages}</span><Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)} aria-label="Página siguiente"><ChevronRight className="h-4 w-4" /></Button></div>
          </div>
        </div>}
      </TabsContent>
    </Tabs>

    <Dialog open={Boolean(review)} onOpenChange={(open) => { if (!open && !busy) setReview(null); }}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader><DialogTitle>Revisar y aceptar reserva</DialogTitle><DialogDescription>Comprueba las fechas y elige una habitación libre del tipo solicitado.</DialogDescription></DialogHeader>
        {review && <>
          <div className="rounded-lg border bg-slate-50 p-3"><p className="font-semibold">{checkedReservation?.cliente_nombre || review.cliente_nombre} · {review.numero_reserva}</p><p className="mt-1 text-sm">{formatDate(checkedReservation?.fecha_checkin || review.fecha_checkin)} → {formatDate(checkedReservation?.fecha_checkout || review.fecha_checkout)}</p><p className="mt-1 text-sm text-muted-foreground">{checkedReservation?.tipo_nombre || review.tipo_nombre} · Total {formatCurrency(Number(checkedReservation?.total ?? review.total ?? 0))}</p></div>
          {availability.isFetching ? <p role="status" className="flex items-center gap-2 py-3 text-sm"><Loader2 className="h-4 w-4 animate-spin" />Comprobando fechas y habitaciones…</p> : availability.error ? <p role="alert" className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{availability.error.message}</p> : checkedReservation && <>
            {rooms.length ? <><p className="flex items-center gap-2 text-sm text-emerald-700"><Check className="h-4 w-4" />{rooms.length} habitación{rooms.length === 1 ? '' : 'es'} disponible{rooms.length === 1 ? '' : 's'} para todo el periodo.</p>
              {checkedReservation.habitacion_id && !rooms.some((room) => room.id === checkedReservation.habitacion_id) && <p className="text-sm text-amber-800">La habitación asignada tiene un conflicto o está fuera de servicio. Elige otra libre del mismo tipo.</p>}
              <div className="space-y-1.5"><Label htmlFor="online-room">Habitación a confirmar</Label><select id="online-room" className={selectClass} value={selectedRoomAvailable ? roomId : ''} onChange={(event) => setRoomId(event.target.value)}><option value="">Selecciona una habitación</option>{rooms.map((room) => <option key={room.id} value={room.id}>Hab. {room.numero}{room.id === checkedReservation.habitacion_id ? ' · asignada actualmente' : ''}</option>)}</select></div>
            </> : <p role="alert" className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><AlertTriangle className="h-5 w-5 shrink-0" />No hay habitaciones libres del tipo solicitado para todas las fechas. Edita la reserva o recházala con un motivo.</p>}
          </>}
          {confirm.error && <p role="alert" className="text-sm text-red-700">{confirm.error.message}</p>}
          <p className="text-xs text-muted-foreground">Al aceptar se vuelve a comprobar la disponibilidad. Las fechas y la tarifa se conservan.</p>
          <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" disabled={availability.isFetching || busy} onClick={() => { confirm.reset(); void availability.refetch(); }}><RefreshCw className="mr-2 h-3.5 w-3.5" />Comprobar de nuevo</Button><Button asChild variant="ghost" size="sm" disabled={busy}><Link onClick={(event) => { if (busy) event.preventDefault(); }} to={`/reservas/detalle/${review.id}?editar=1`}>Editar reserva</Link></Button></div>
          <DialogFooter><Button variant="outline" disabled={busy} onClick={() => setReview(null)}>Volver</Button><Button className="bg-[#10233F] hover:bg-[#10233F]/90" disabled={!allowConfirm} onClick={() => { if (allowConfirm) confirm.mutate({ id: review.id, selectedRoom: roomId, snapshot: onlineReservationSnapshot(checkedReservation) }); }}>{confirm.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}Aceptar reserva</Button></DialogFooter>
        </>}
      </DialogContent>
    </Dialog>

    <Dialog open={Boolean(reject)} onOpenChange={(open) => { if (!open && !busy) setReject(null); }}>
      <DialogContent><DialogHeader><DialogTitle>Rechazar reserva online</DialogTitle><DialogDescription>{reject?.cliente_nombre} · {reject?.numero_reserva}. Se conservará el registro y el motivo del rechazo.</DialogDescription></DialogHeader>
        <div className="space-y-1.5"><Label htmlFor="online-reason">Motivo del rechazo</Label><Textarea id="online-reason" rows={3} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Explica por qué se rechaza esta solicitud" disabled={busy} /></div>
        {Number(reject?.total_pagado || 0) > 0 && <p className="text-sm text-amber-800">Tiene pagos registrados. Se conservarán; revisa si corresponde una devolución.</p>}
        {rejectMutation.error && <p role="alert" className="text-sm text-red-700">{rejectMutation.error.message}</p>}
        <DialogFooter><Button variant="outline" disabled={busy} onClick={() => setReject(null)}>Volver</Button><Button variant="destructive" disabled={busy || reason.trim().length < 3 || viewOnlyMode} onClick={() => { if (reject && reason.trim().length >= 3) rejectMutation.mutate({ id: reject.id, motive: reason.trim() }); }}>{rejectMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <X className="mr-2 h-4 w-4" />}Rechazar reserva</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </MainLayout>;
}
