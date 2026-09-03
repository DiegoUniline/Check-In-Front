import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, BedDouble, CalendarDays, Clock, CreditCard, DoorOpen,
  LogOut, Mail, Phone, Receipt, RefreshCw,
  Users, WalletCards,
} from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency';
import { formatDate, formatDateTime } from '@/lib/dateFormat';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { MainLayout } from '@/components/layout/MainLayout';
import { StayOperationsPanel } from '@/components/reservas/StayOperationsPanel';
import { StayDeliverables } from '@/components/reservas/StayDeliverables';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';

const statusStyles: Record<string, string> = {
  Pendiente: 'border-amber-200 bg-amber-50 text-amber-800',
  Confirmada: 'border-blue-200 bg-blue-50 text-blue-800',
  CheckIn: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  Hospedado: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  CheckOut: 'border-slate-200 bg-slate-100 text-slate-700',
  Cancelada: 'border-red-200 bg-red-50 text-red-700',
  NoShow: 'border-orange-200 bg-orange-50 text-orange-800',
};

const number = (value: unknown) => Number(value || 0);

export default function ReservaDetalle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [reserva, setReserva] = useState<any>(null);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async (silent = false) => {
    if (!id) return;
    if (!silent) setLoading(true);
    try {
      const [reservationData, roomData] = await Promise.all([api.getReserva(id), api.getHabitaciones()]);
      if (!reservationData) throw new Error('La reservación no existe o no pertenece al hotel activo');
      setReserva(reservationData);
      setRooms(roomData || []);
    } catch (error: any) {
      toast({ title: 'No se pudo abrir la reservación', description: error.message, variant: 'destructive' });
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [id]);
  useRealtimeSync('reservas', () => void load(true), { enabled: Boolean(id) });
  useRealtimeSync('cargos', () => void load(true), { enabled: Boolean(id) });
  useRealtimeSync('pagos', () => void load(true), { enabled: Boolean(id) });
  useRealtimeSync('habitaciones', () => void load(true), { enabled: Boolean(id) });

  const activeCharges = useMemo(() => (reserva?.cargos || []).filter((item: any) => item.estado !== 'Cancelado'), [reserva]);
  const activePayments = useMemo(() => (reserva?.pagos || []).filter((item: any) => item.estado !== 'Cancelado'), [reserva]);

  if (loading) return <MainLayout><div className="flex min-h-[60vh] items-center justify-center"><div className="text-center"><RefreshCw className="mx-auto h-7 w-7 animate-spin text-[#10233F]" /><p className="mt-3 text-sm text-muted-foreground">Abriendo expediente…</p></div></div></MainLayout>;
  if (!reserva) return <MainLayout><div className="mx-auto max-w-xl py-20 text-center"><h1 className="text-xl font-semibold">Reservación no encontrada</h1><Button className="mt-4" onClick={() => navigate('/reservas')}>Volver a reservaciones</Button></div></MainLayout>;

  const total = number(reserva.total);
  const paid = number(reserva.total_pagado);
  const balance = number(reserva.saldo_pendiente ?? total - paid);
  const paidPercentage = total > 0 ? Math.min(100, Math.max(0, (paid / total) * 100)) : 0;
  const activeStay = ['CheckIn', 'Hospedado'].includes(reserva.estado) && !reserva.checkout_realizado;
  const canCheckin = ['Pendiente', 'Confirmada'].includes(reserva.estado) && !reserva.checkin_realizado;

  const refreshAll = async () => { await load(true); };

  return <MainLayout>
    <div className="min-h-[calc(100dvh-4rem)] bg-[#F7F9FC] pb-24 lg:pb-8">
      <header className="sticky top-0 z-20 border-b border-[#10233F]/10 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1680px] items-center justify-between gap-3 px-3 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Volver"><ArrowLeft className="h-5 w-5" /></Button>
            <div className="min-w-0 py-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-lg font-bold text-[#10233F] sm:text-2xl">{reserva.cliente_nombre || 'Huésped sin nombre'}</h1>
                <Badge variant="outline" className={cn('border', statusStyles[reserva.estado])}>{reserva.estado}</Badge>
              </div>
              <p className="truncate text-xs text-muted-foreground sm:text-sm">Habitación {reserva.habitacion_numero || 'sin asignar'} · {formatDate(reserva.fecha_checkin)} → {formatDate(reserva.fecha_checkout)}</p>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                {reserva.cliente_telefono || reserva.cliente?.telefono ? <a className="flex items-center gap-1 text-[#10233F] hover:underline" href={`tel:${reserva.cliente_telefono || reserva.cliente?.telefono}`}><Phone className="h-3 w-3" />{reserva.cliente_telefono || reserva.cliente?.telefono}</a> : <span className="text-muted-foreground">Sin teléfono</span>}
                {reserva.cliente_email || reserva.cliente?.email ? <a className="flex min-w-0 items-center gap-1 text-[#10233F] hover:underline" href={`mailto:${reserva.cliente_email || reserva.cliente?.email}`}><Mail className="h-3 w-3 shrink-0" /><span className="truncate">{reserva.cliente_email || reserva.cliente?.email}</span></a> : <span className="text-muted-foreground">Sin correo</span>}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <div className="max-w-[118px] text-right sm:max-w-none">
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:text-[10px]">Reserva</p>
              <p className="truncate text-xs font-bold text-[#10233F] sm:text-sm">#{reserva.numero_reserva || reserva.id.slice(0, 8)}</p>
            </div>
            <div className="hidden items-center gap-2 xl:flex">
              <Button variant="outline" onClick={() => void load(true)}><RefreshCw className="mr-2 h-4 w-4" />Actualizar</Button>
              <Button variant="outline" onClick={() => document.getElementById('operaciones')?.scrollIntoView({ behavior: 'smooth' })}>Editar estancia</Button>
              {canCheckin && <Button onClick={() => navigate(`/checkin/${reserva.id}`)} className="bg-emerald-600 hover:bg-emerald-700"><DoorOpen className="mr-2 h-4 w-4" />Check-in</Button>}
              {activeStay && <Button onClick={() => navigate(`/checkout/${reserva.id}`)} className="bg-[#10233F] hover:bg-[#10233F]/90"><LogOut className="mr-2 h-4 w-4" />Check-out</Button>}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1680px] space-y-4 px-3 py-4 sm:px-6 lg:px-8">
        <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <Summary label="Estancia" value={`${reserva.noches || 1} noche${number(reserva.noches) === 1 ? '' : 's'}`} detail={`${formatDate(reserva.fecha_checkin)} → ${formatDate(reserva.fecha_checkout)}`} icon={CalendarDays} />
          <Summary label="Habitación" value={reserva.habitacion_numero ? `#${reserva.habitacion_numero}` : 'Sin asignar'} detail={reserva.tipo_habitacion?.nombre || reserva.tipo_habitacion_nombre || 'Sin categoría'} icon={BedDouble} />
          <Summary label="Huéspedes" value={`${number(reserva.adultos)} adultos`} detail={`${number(reserva.ninos)} menores · ${number(reserva.personas_extra)} adicionales`} icon={Users} />
          <Summary label={balance < -0.01 ? 'A favor' : 'Saldo pendiente'} value={formatCurrency(Math.abs(balance))} detail={`${formatCurrency(paid)} pagado de ${formatCurrency(total)}`} icon={WalletCards} danger={balance > 0.01} />
        </section>

        <section id="operaciones" className="scroll-mt-24">
          <StayOperationsPanel
            reserva={reserva}
            habitaciones={rooms}
            onUpdate={refreshAll}
            initialOperationId={searchParams.get('operation')}
            initialCheckout={searchParams.get('checkout')}
            initialRoomId={searchParams.get('roomId')}
          >
          <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-4">
            <section className="grid gap-4 lg:grid-cols-2">
              <DetailSection title="Estancia" icon={CalendarDays}>
                <InfoGrid items={[
                  ['Entrada', formatDate(reserva.fecha_checkin)], ['Hora prevista', reserva.hora_llegada || 'Sin definir'],
                  ['Salida', formatDate(reserva.fecha_checkout)], ['Hora de salida', reserva.hora_checkout || reserva.hotel?.hora_checkout || 'Según política'],
                  ['Noches', String(reserva.noches || 1)], ['Origen', reserva.origen || 'Recepción'],
                ]} />
                {(reserva.early_checkin_at || reserva.late_checkout_until) && <div className="mt-4 flex flex-wrap gap-2">{reserva.early_checkin_at && <Badge variant="outline">Early check-in · {formatDateTime(reserva.early_checkin_at)}</Badge>}{reserva.late_checkout_until && <Badge variant="outline">Late check-out · {formatDateTime(reserva.late_checkout_until)}</Badge>}</div>}
              </DetailSection>
              <DetailSection title="Habitación" icon={BedDouble}>
                <div className="flex items-start justify-between gap-4"><div><p className="text-3xl font-bold text-[#10233F]">{reserva.habitacion_numero ? `#${reserva.habitacion_numero}` : '—'}</p><p className="mt-1 text-sm text-muted-foreground">{reserva.tipo_habitacion?.nombre || reserva.tipo_habitacion_nombre || 'Sin categoría'}</p></div><Badge variant="outline">{reserva.habitacion?.estado_habitacion || 'Sin estado'}</Badge></div>
                <Separator className="my-4" />
                <InfoGrid items={[["Tarifa por noche", formatCurrency(reserva.tarifa_noche)], ["Limpieza", reserva.habitacion?.estado_limpieza || '—'], ["Mantenimiento", reserva.habitacion?.estado_mantenimiento || '—'], ["Piso", String(reserva.habitacion?.piso || '—')]]} />
              </DetailSection>
            </section>

            {(reserva.solicitudes_especiales || reserva.notas_internas) && <section className="grid gap-4 lg:grid-cols-2">{reserva.solicitudes_especiales && <Note title="Solicitudes especiales" text={reserva.solicitudes_especiales} />}{reserva.notas_internas && <Note title="Notas internas" text={reserva.notas_internas} />}</section>}

            <section id="cuenta" className="scroll-mt-24 rounded-xl border border-[#10233F]/10 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-5 flex items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 font-semibold text-[#10233F]"><WalletCards className="h-4 w-4" />Cuenta completa</h2><p className="mt-1 text-sm text-muted-foreground">Cargos y pagos visibles en el mismo expediente.</p></div><Button variant="outline" size="sm" onClick={() => document.getElementById('operaciones')?.scrollIntoView({ behavior: 'smooth' })}>Corregir cuenta</Button></div>
              <div className="grid gap-6 lg:grid-cols-2">
                <Ledger title="Cargos y consumos" icon={Receipt} empty="Sin cargos adicionales" items={reserva.cargos || []} render={(item) => <><div><p className="font-medium">{item.concepto || 'Cargo'}</p><p className="text-xs text-muted-foreground">{number(item.cantidad)} × {formatCurrency(item.precio_unitario)}{item.notas ? ` · ${item.notas}` : ''}</p></div><div className="text-right"><p className="font-semibold">{formatCurrency(item.total ?? item.subtotal)}</p>{item.estado === 'Cancelado' && <Badge variant="outline">Cancelado</Badge>}</div></>} />
                <Ledger title="Pagos" icon={CreditCard} empty="Sin pagos registrados" items={reserva.pagos || []} render={(item) => <><div><p className="font-medium">{item.metodo_pago || 'Pago'}</p><p className="text-xs text-muted-foreground">{item.concepto || 'Abono'} · {item.created_at ? formatDateTime(item.created_at) : ''}</p></div><div className="text-right"><p className="font-semibold text-emerald-700">{formatCurrency(item.monto)}</p>{item.estado === 'Cancelado' && <Badge variant="outline">Cancelado</Badge>}</div></>} />
              </div>
            </section>

            <StayDeliverables reservaId={reserva.id} active={activeStay || canCheckin} />
          </div>

          <aside className="order-first space-y-4 xl:order-none xl:sticky xl:top-24">
            <Card className="overflow-hidden border-0 bg-[#10233F] text-white shadow-lg">
              <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><WalletCards className="h-4 w-4" />Estado de cuenta</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <AccountLine label={`Hospedaje · ${reserva.noches || 1} noches`} value={formatCurrency(reserva.subtotal_hospedaje)} />
                {activeCharges.length>0 && <AccountLine label={`${activeCharges.length} cargos adicionales`} value={formatCurrency(activeCharges.reduce((sum: number,item: any)=>sum+number(item.total ?? item.subtotal),0))} />}
                {number(reserva.total_impuestos)>0 && <AccountLine label="Impuestos" value={formatCurrency(reserva.total_impuestos)} />}
                {number(reserva.descuento)>0 && <AccountLine label="Descuento" value={`−${formatCurrency(reserva.descuento)}`} accent />}
                <Separator className="bg-white/20" />
                <div className="flex items-end justify-between"><span className="font-medium">Total</span><span className="text-2xl font-bold">{formatCurrency(total)}</span></div>
                <div className="rounded-xl bg-white/10 p-3"><div className="mb-2 flex justify-between text-xs"><span>Pagado</span><span>{formatCurrency(paid)}</span></div><Progress value={paidPercentage} className="h-2 bg-white/15" /></div>
                <div className={cn('rounded-xl p-4 text-center', balance > 0.01 ? 'bg-[#F97316]/25' : 'bg-emerald-500/20')}><p className="text-xs text-white/75">{balance < -0.01 ? 'Saldo a favor' : 'Saldo pendiente'}</p><p className="mt-1 text-2xl font-bold">{formatCurrency(Math.abs(balance))}</p></div>
              </CardContent>
            </Card>
            <Card className="hidden xl:block"><CardContent className="space-y-2 p-4"><Button className="w-full bg-[#10233F] hover:bg-[#10233F]/90" onClick={() => document.getElementById('operaciones')?.scrollIntoView({ behavior: 'smooth' })}>Ver operaciones</Button>{canCheckin && <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => navigate(`/checkin/${reserva.id}`)}><DoorOpen className="mr-2 h-4 w-4" />Hacer check-in</Button>}{activeStay && <Button className="w-full" variant="outline" onClick={() => navigate(`/checkout/${reserva.id}`)}><LogOut className="mr-2 h-4 w-4" />Hacer check-out</Button>}</CardContent></Card>
          </aside>
          </div>
          </StayOperationsPanel>
        </section>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-white p-2 pb-[max(.5rem,env(safe-area-inset-bottom))] sm:hidden">
        <div className="grid grid-cols-2 gap-2"><Button variant="outline" onClick={() => document.getElementById('operaciones')?.scrollIntoView({ behavior: 'smooth' })}>Operaciones</Button>{canCheckin ? <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => navigate(`/checkin/${reserva.id}`)}>Check-in</Button> : activeStay ? <Button className="bg-[#10233F] hover:bg-[#10233F]/90" onClick={() => navigate(`/checkout/${reserva.id}`)}>Check-out</Button> : <Button onClick={() => document.getElementById('cuenta')?.scrollIntoView({ behavior: 'smooth' })}>Ver cuenta</Button>}</div>
      </div>
    </div>
  </MainLayout>;
}

function Summary({ label, value, detail, icon: Icon, danger }: any) { return <Card className="border-[#10233F]/10 shadow-none"><CardContent className="flex min-h-24 items-start gap-3 p-3 sm:p-4"><span className={cn('rounded-lg p-2',danger?'bg-red-50 text-red-600':'bg-[#10233F]/[0.07] text-[#10233F]')}><Icon className="h-4 w-4" /></span><div className="min-w-0"><p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p><p className={cn('truncate text-base font-bold sm:text-lg',danger?'text-red-700':'text-[#10233F]')}>{value}</p><p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{detail}</p></div></CardContent></Card>; }
function DetailSection({ title, icon: Icon, children }: any) { return <section className="rounded-xl border border-[#10233F]/10 bg-white p-4 sm:p-5"><h2 className="mb-4 flex items-center gap-2 font-semibold text-[#10233F]"><Icon className="h-4 w-4" />{title}</h2>{children}</section>; }
function InfoGrid({ items }: { items: string[][] }) { return <div className="grid grid-cols-2 gap-x-5 gap-y-4">{items.map(([label,value])=><div key={label}><p className="text-xs text-muted-foreground">{label}</p><p className="mt-0.5 text-sm font-medium">{value}</p></div>)}</div>; }
function Note({ title, text }: { title: string; text: string }) { return <section className="rounded-xl border border-amber-200 bg-amber-50/60 p-4"><h3 className="font-medium text-amber-900">{title}</h3><p className="mt-1 whitespace-pre-wrap text-sm text-amber-900/75">{text}</p></section>; }
function Ledger({ title, icon: Icon, empty, items, render }: any) { return <section><h2 className="mb-3 flex items-center gap-2 font-semibold text-[#10233F]"><Icon className="h-4 w-4" />{title}</h2>{items.length===0?<p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">{empty}</p>:<div className="divide-y rounded-xl border">{items.map((item:any)=><div key={item.id} className={cn('flex items-center justify-between gap-4 p-3 sm:p-4',item.estado==='Cancelado'&&'opacity-50')}>{render(item)}</div>)}</div>}</section>; }
function AccountLine({ label, value, accent }: { label: string; value: string; accent?: boolean }) { return <div className="flex justify-between gap-3 text-sm"><span className="text-white/70">{label}</span><span className={accent?'text-emerald-300':''}>{value}</span></div>; }
