import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BedDouble, CalendarDays, Loader2, Pencil, Search, StickyNote, User, BadgeDollarSign, AlertTriangle } from 'lucide-react';
import api from '@/lib/api';
import { canAccess } from '@/lib/permissions';
import { useAuth } from '@/contexts/useAuth';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/currency';
import { formatDate } from '@/lib/dateFormat';
import { calculateReservationFinancialSnapshot } from '@/lib/reservationFinancials';
import { ClienteFormDialog } from '@/components/clientes/ClienteFormDialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reserva: any;
  onSaved?: () => void | Promise<void>;
};

type DescuentoTipo = 'none' | 'Porcentaje' | 'Monto' | 'Cortesia';

const d = (v: any) => String(v || '').slice(0, 10);
const n = (v: any) => Number(v || 0);
const hora = (v: any) => String(v || '').slice(0, 5);
const nombreCliente = (c: any) => [c?.nombre, c?.apellido_paterno, c?.apellido_materno].filter(Boolean).join(' ');

const descuentoInicial = (r: any): { tipo: DescuentoTipo; valor: string } => {
  const tipo = String(r?.descuento_tipo || '');
  const valor = n(r?.descuento_valor);
  if (!tipo || valor <= 0) return { tipo: 'none', valor: '' };
  if (tipo === 'Porcentaje' && valor >= 100) return { tipo: 'Cortesia', valor: '100' };
  return { tipo: tipo === 'Monto' ? 'Monto' : 'Porcentaje', valor: String(valor) };
};

export function EditarReservaDialog({ open, onOpenChange, reserva, onSaved }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const rol = user?.rol;
  const estado = String(reserva?.estado || '');
  const cerrada = ['Cancelada', 'NoShow', 'CheckOut'].includes(estado);
  const activa = Boolean(reserva?.checkin_realizado) && !reserva?.checkout_realizado;
  const esGerencia = ['Admin', 'Gerente', 'SuperAdmin'].includes(String(rol || ''));

  const puedeDatos = canAccess('reservas.operacion.reservation_correction', rol);
  const puedeFechas = puedeDatos && !cerrada;
  const puedeTarifa = canAccess('reservas.operacion.rate_change', rol) && !cerrada;
  const puedeDescuento = canAccess('reservas.operacion.discount_change', rol) && !cerrada;

  const [tab, setTab] = useState('huesped');
  const [paso, setPaso] = useState<'editar' | 'revisar'>('editar');
  const [guardando, setGuardando] = useState(false);
  const [motivo, setMotivo] = useState('');

  const [cliente, setCliente] = useState<any>(null);
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState<any[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [clienteDialog, setClienteDialog] = useState(false);

  const [checkin, setCheckin] = useState('');
  const [checkout, setCheckout] = useState('');
  const [habitacionId, setHabitacionId] = useState('');
  const [habitaciones, setHabitaciones] = useState<any[]>([]);
  const [cargandoHab, setCargandoHab] = useState(false);
  const [adultos, setAdultos] = useState(1);
  const [ninos, setNinos] = useState(0);
  const [horaLlegada, setHoraLlegada] = useState('');

  const [tarifa, setTarifa] = useState('');
  const [descTipo, setDescTipo] = useState<DescuentoTipo>('none');
  const [descValor, setDescValor] = useState('');

  const [solicitudes, setSolicitudes] = useState('');
  const [notas, setNotas] = useState('');

  useEffect(() => {
    if (!open || !reserva) return;
    const desc = descuentoInicial(reserva);
    setTab(cerrada ? 'notas' : 'huesped');
    setPaso('editar');
    setMotivo('');
    setCliente(reserva.cliente || (reserva.cliente_id ? { id: reserva.cliente_id, nombre: reserva.cliente_nombre } : null));
    setBusqueda(''); setResultados([]);
    setCheckin(d(reserva.fecha_checkin));
    setCheckout(d(reserva.fecha_checkout));
    setHabitacionId(reserva.habitacion_id || '');
    setAdultos(Math.max(1, n(reserva.adultos) || 1));
    setNinos(n(reserva.ninos));
    setHoraLlegada(hora(reserva.hora_llegada));
    setTarifa(String(n(reserva.tarifa_noche)));
    setDescTipo(desc.tipo); setDescValor(desc.valor);
    setSolicitudes(reserva.solicitudes_especiales || '');
    setNotas(reserva.notas_internas || '');
  }, [open, reserva?.id]);

  // Búsqueda de huésped
  useEffect(() => {
    const q = busqueda.trim();
    if (!open || q.length < 2) { setResultados([]); return; }
    let cancel = false;
    setBuscando(true);
    const t = window.setTimeout(async () => {
      try {
        const lista = await api.getClientes({ search: q });
        if (!cancel) setResultados((Array.isArray(lista) ? lista : lista?.data || []).slice(0, 8));
      } catch { if (!cancel) setResultados([]); }
      finally { if (!cancel) setBuscando(false); }
    }, 250);
    return () => { cancel = true; window.clearTimeout(t); };
  }, [busqueda, open]);

  // Habitaciones libres para las fechas elegidas
  useEffect(() => {
    if (!open || !puedeFechas || !checkin || !checkout || checkout < checkin) { setHabitaciones([]); return; }
    let cancel = false;
    setCargandoHab(true);
    api.getHabitacionesDisponibles(checkin, checkout, undefined, reserva.id)
      .then((lista: any[]) => { if (!cancel) setHabitaciones(lista || []); })
      .catch(() => { if (!cancel) setHabitaciones([]); })
      .finally(() => { if (!cancel) setCargandoHab(false); });
    return () => { cancel = true; };
  }, [open, checkin, checkout, reserva?.id, puedeFechas]);

  const habitacionLibre = habitaciones.some((h) => h.id === habitacionId);
  const habitacionActual = habitaciones.find((h) => h.id === habitacionId);

  const descNormal = useMemo(() => descTipo === 'Cortesia'
    ? { tipo: 'Porcentaje', valor: 100 }
    : descTipo === 'none' ? { tipo: null, valor: 0 } : { tipo: descTipo, valor: n(descValor) }, [descTipo, descValor]);
  const descOriginal = descuentoInicial(reserva);

  const cambios = useMemo(() => {
    if (!reserva) return [] as { grupo: string; campo: string; antes: string; despues: string }[];
    const list: { grupo: string; campo: string; antes: string; despues: string }[] = [];
    const add = (grupo: string, campo: string, antes: string, despues: string) => { if (antes !== despues) list.push({ grupo, campo, antes, despues }); };
    if ((cliente?.id || '') !== (reserva.cliente_id || '')) {
      list.push({ grupo: 'datos', campo: 'Huésped', antes: reserva.cliente_nombre || nombreCliente(reserva.cliente) || '—', despues: cliente ? nombreCliente(cliente) || cliente.nombre || '—' : '—' });
    }
    add('datos', 'Adultos', String(n(reserva.adultos) || 1), String(adultos));
    add('datos', 'Menores', String(n(reserva.ninos)), String(ninos));
    add('datos', 'Hora de llegada', hora(reserva.hora_llegada) || '—', horaLlegada || '—');
    add('datos', 'Solicitudes especiales', (reserva.solicitudes_especiales || '').trim() || '—', solicitudes.trim() || '—');
    add('datos', 'Notas internas', (reserva.notas_internas || '').trim() || '—', notas.trim() || '—');
    add('fechas', 'Entrada', formatDate(d(reserva.fecha_checkin)), formatDate(checkin));
    add('fechas', 'Salida', formatDate(d(reserva.fecha_checkout)), formatDate(checkout));
    add('fechas', 'Habitación', `#${reserva.habitacion_numero || reserva.habitacion?.numero || '—'}`,
      habitacionId === reserva.habitacion_id ? `#${reserva.habitacion_numero || reserva.habitacion?.numero || '—'}` : `#${habitacionActual?.numero || '—'}`);
    add('tarifa', 'Tarifa por noche', formatCurrency(n(reserva.tarifa_noche)), formatCurrency(n(tarifa)));
    const dText = (t: DescuentoTipo, v: string) => t === 'none' ? 'Sin descuento' : t === 'Cortesia' ? 'Cortesía (100%)' : t === 'Porcentaje' ? `${n(v)}%` : formatCurrency(n(v));
    add('descuento', 'Descuento', dText(descOriginal.tipo, descOriginal.valor), dText(descTipo, descValor));
    return list;
  }, [reserva, cliente, adultos, ninos, horaLlegada, solicitudes, notas, checkin, checkout, habitacionId, habitacionActual, tarifa, descTipo, descValor]);

  const hay = (grupo: string) => cambios.some((c) => c.grupo === grupo);
  const requiereMotivo = hay('fechas') || hay('tarifa') || hay('descuento');

  const preview = useMemo(() => {
    if (!reserva) return null;
    const actual = calculateReservationFinancialSnapshot(reserva);
    const nuevo = calculateReservationFinancialSnapshot(reserva, {
      checkin, checkout, nightlyRate: n(tarifa), discountType: descNormal.tipo, discountValue: descNormal.valor,
    });
    return { actual, nuevo };
  }, [reserva, checkin, checkout, tarifa, descNormal]);

  const validar = (): string | null => {
    if (cambios.length === 0) return 'No hay cambios por guardar.';
    if (hay('fechas')) {
      if (!checkin || !checkout || checkout < checkin) return 'La salida no puede ser anterior a la entrada.';
      if (cargandoHab) return 'Espera a que termine la búsqueda de habitaciones.';
      if (!habitacionLibre) return 'La habitación no está libre en esas fechas; elige otra en la pestaña Estancia.';
    }
    if (hay('tarifa') && (!Number.isFinite(n(tarifa)) || n(tarifa) < 0)) return 'Escribe una tarifa válida.';
    if (hay('descuento') && descTipo === 'Porcentaje' && n(descValor) > 100) return 'El descuento no puede superar el 100%.';
    if (hay('descuento') && ['Porcentaje', 'Monto'].includes(descTipo) && n(descValor) <= 0) return 'Escribe el valor del descuento.';
    if (adultos < 1) return 'Debe haber al menos un adulto.';
    return null;
  };

  const revisar = () => {
    const error = validar();
    if (error) { toast({ title: 'Revisa los datos', description: error, variant: 'destructive' }); return; }
    setPaso('revisar');
  };

  const guardar = async () => {
    if (requiereMotivo && motivo.trim().length < 3) {
      toast({ title: 'Escribe el motivo', description: 'Los cambios de fechas, habitación o precio quedan en el historial con su motivo.', variant: 'destructive' });
      return;
    }
    setGuardando(true);
    const hechos: string[] = [];
    try {
      const razon = motivo.trim();
      if (hay('datos')) {
        const datos: Record<string, any> = {};
        if ((cliente?.id || '') !== (reserva.cliente_id || '') && cliente?.id) datos.cliente_id = cliente.id;
        if (adultos !== (n(reserva.adultos) || 1)) datos.adultos = adultos;
        if (ninos !== n(reserva.ninos)) datos.ninos = ninos;
        if (horaLlegada !== hora(reserva.hora_llegada)) datos.hora_llegada = horaLlegada;
        if (solicitudes.trim() !== (reserva.solicitudes_especiales || '').trim()) datos.solicitudes_especiales = solicitudes;
        if (notas.trim() !== (reserva.notas_internas || '').trim()) datos.notas_internas = notas;
        await api.editarDatosReserva(reserva.id, datos, razon);
        hechos.push('datos');
      }
      if (hay('fechas')) {
        await api.applyStayOperation(reserva.id, 'reservation_correction', {
          new_checkin: checkin,
          new_checkout: checkout,
          new_room_id: habitacionId !== reserva.habitacion_id ? habitacionId : '',
        }, razon);
        hechos.push('fechas');
      }
      if (hay('tarifa')) {
        await api.applyStayOperation(reserva.id, 'rate_change', { new_rate: String(n(tarifa)) }, razon);
        hechos.push('tarifa');
      }
      if (hay('descuento')) {
        await api.applyStayOperation(reserva.id, 'discount_change', {
          discount_type: descTipo, discount_value: descTipo === 'Cortesia' ? '100' : descTipo === 'none' ? '0' : String(n(descValor)),
        }, razon);
        hechos.push('descuento');
      }
      toast({ title: 'Reserva actualizada', description: 'Los cambios quedaron guardados en el historial.' });
      onOpenChange(false);
      await onSaved?.();
    } catch (error: any) {
      toast({
        title: hechos.length ? 'Se guardó sólo una parte' : 'No se pudo guardar',
        description: `${error.message || 'Intenta de nuevo'}${hechos.length ? ` (ya guardado: ${hechos.join(', ')})` : ''}`,
        variant: 'destructive',
      });
      if (hechos.length) await onSaved?.();
    } finally {
      setGuardando(false);
    }
  };

  if (!reserva) return null;

  const numero = (label: string, value: number, set: (v: number) => void, min: number, disabled: boolean) => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-1">
        <Button type="button" variant="outline" size="sm" className="h-9 w-9 px-0" disabled={disabled || value <= min} onClick={() => set(value - 1)}>−</Button>
        <Input type="number" className="h-9 w-16 text-center" value={value} disabled={disabled} onChange={(e) => set(Math.max(min, Math.floor(Number(e.target.value) || min)))} />
        <Button type="button" variant="outline" size="sm" className="h-9 w-9 px-0" disabled={disabled} onClick={() => set(value + 1)}>+</Button>
      </div>
    </div>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!guardando) onOpenChange(v); }}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-3xl" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Pencil className="h-4 w-4" />Editar reserva #{reserva.numero_reserva || String(reserva.id).slice(0, 8)}</DialogTitle>
            <DialogDescription>
              {paso === 'editar'
                ? cerrada ? 'La reservación está cerrada: sólo puedes editar sus notas.' : 'Cambia lo que necesites y revisa el resumen antes de guardar.'
                : 'Revisa los cambios antes de guardar.'}
            </DialogDescription>
          </DialogHeader>

          {paso === 'editar' ? (
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="huesped" disabled={cerrada}><User className="mr-1.5 h-3.5 w-3.5" />Huésped</TabsTrigger>
                <TabsTrigger value="estancia" disabled={cerrada}><CalendarDays className="mr-1.5 h-3.5 w-3.5" />Estancia</TabsTrigger>
                <TabsTrigger value="precio" disabled={!puedeTarifa && !puedeDescuento}><BadgeDollarSign className="mr-1.5 h-3.5 w-3.5" />Precio</TabsTrigger>
                <TabsTrigger value="notas"><StickyNote className="mr-1.5 h-3.5 w-3.5" />Notas</TabsTrigger>
              </TabsList>

              <TabsContent value="huesped" className="space-y-4 pt-3">
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-slate-50 p-3">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Huésped titular</p>
                    <p className="truncate font-semibold text-[#10233F]">{cliente ? nombreCliente(cliente) || cliente.nombre : 'Sin huésped'}</p>
                    {cliente?.telefono && <p className="text-xs text-muted-foreground">{cliente.telefono}{cliente.email ? ` · ${cliente.email}` : ''}</p>}
                  </div>
                  {cliente?.id && <Button type="button" variant="outline" size="sm" onClick={() => setClienteDialog(true)}>
                    <Pencil className="mr-1.5 h-3.5 w-3.5" />Editar datos del huésped
                  </Button>}
                </div>
                <div className="space-y-1.5">
                  <Label>Cambiar huésped</Label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input className="pl-9" placeholder="Buscar por nombre…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
                  </div>
                  {buscando && <p className="text-xs text-muted-foreground">Buscando…</p>}
                  {resultados.length > 0 && <div className="max-h-48 divide-y overflow-y-auto rounded-md border">
                    {resultados.map((c) => (
                      <button key={c.id} type="button" onClick={() => { setCliente(c); setBusqueda(''); setResultados([]); }}
                        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50">
                        <span className="truncate">{nombreCliente(c)}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">{c.telefono || c.email || ''}</span>
                      </button>
                    ))}
                  </div>}
                </div>
                <div className="flex flex-wrap items-end gap-4">
                  {numero('Adultos', adultos, setAdultos, 1, activa)}
                  {numero('Menores', ninos, setNinos, 0, activa)}
                  <div className="space-y-1.5">
                    <Label>Hora de llegada</Label>
                    <Input type="time" className="h-9 w-32" value={horaLlegada} onChange={(e) => setHoraLlegada(e.target.value)} />
                  </div>
                </div>
                {activa && <p className="text-xs text-muted-foreground">La estancia ya inició: para cambiar huéspedes usa “Agregar huésped” o “Retirar huésped” en Más.</p>}
              </TabsContent>

              <TabsContent value="estancia" className="space-y-4 pt-3">
                {!puedeFechas ? <p className="text-sm text-muted-foreground">Tu rol no puede cambiar fechas ni habitación.</p> : <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Entrada</Label>
                      <Input type="date" value={checkin} max={checkout || undefined} disabled={activa && !esGerencia} onChange={(e) => setCheckin(e.target.value)} />
                      {activa && !esGerencia && <p className="text-[11px] text-muted-foreground">Sólo gerencia corrige la entrada después del check-in.</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label>Salida</Label>
                      <Input type="date" value={checkout} min={checkin || undefined} onChange={(e) => setCheckout(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5"><BedDouble className="h-3.5 w-3.5" />Habitación</Label>
                    {cargandoHab ? <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Buscando habitaciones libres…</p> : (
                      <Select value={habitacionLibre ? habitacionId : ''} onValueChange={setHabitacionId}>
                        <SelectTrigger><SelectValue placeholder="Elige una habitación libre" /></SelectTrigger>
                        <SelectContent>
                          {habitaciones.map((h) => (
                            <SelectItem key={h.id} value={h.id}>
                              #{h.numero} · {h.tipos_habitacion?.nombre || h.tipo_nombre || 'Sin tipo'}{h.id === reserva.habitacion_id ? ' (actual)' : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {!cargandoHab && !habitacionLibre && <p className="flex items-center gap-1.5 text-xs text-red-600"><AlertTriangle className="h-3.5 w-3.5" />La habitación actual no está libre en esas fechas; elige otra.</p>}
                  </div>
                  {preview && hay('fechas') && <p className="text-xs text-muted-foreground">Noches: {preview.actual.nights} → <strong>{preview.nuevo.nights}</strong></p>}
                </>}
              </TabsContent>

              <TabsContent value="precio" className="space-y-4 pt-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Tarifa por noche</Label>
                    <Input type="number" min={0} step="0.01" value={tarifa} disabled={!puedeTarifa} onChange={(e) => setTarifa(e.target.value)} />
                    {!puedeTarifa && <p className="text-[11px] text-muted-foreground">Sólo gerencia cambia la tarifa.</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Descuento</Label>
                    <div className="flex gap-2">
                      <Select value={descTipo} onValueChange={(v) => setDescTipo(v as DescuentoTipo)} disabled={!puedeDescuento}>
                        <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin descuento</SelectItem>
                          <SelectItem value="Porcentaje">Porcentaje</SelectItem>
                          <SelectItem value="Monto">Monto</SelectItem>
                          <SelectItem value="Cortesia">Cortesía</SelectItem>
                        </SelectContent>
                      </Select>
                      {['Porcentaje', 'Monto'].includes(descTipo) && <Input type="number" min={0} value={descValor} disabled={!puedeDescuento} onChange={(e) => setDescValor(e.target.value)} placeholder={descTipo === 'Porcentaje' ? '%' : '$'} />}
                    </div>
                  </div>
                </div>
                {preview && <ResumenDinero actual={preview.actual} nuevo={preview.nuevo} />}
              </TabsContent>

              <TabsContent value="notas" className="space-y-4 pt-3">
                <div className="space-y-1.5">
                  <Label>Solicitudes especiales del huésped</Label>
                  <Textarea rows={3} value={solicitudes} onChange={(e) => setSolicitudes(e.target.value)} placeholder="Cuna, piso alto, llegada tarde…" />
                </div>
                <div className="space-y-1.5">
                  <Label>Notas internas</Label>
                  <Textarea rows={4} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Sólo las ve el personal." />
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-md border">
                {cambios.map((c) => (
                  <div key={c.campo} className="grid grid-cols-[140px_minmax(0,1fr)] gap-2 border-b px-3 py-2 text-sm last:border-b-0">
                    <span className="text-muted-foreground">{c.campo}</span>
                    <span className="flex min-w-0 flex-wrap items-center gap-1.5">
                      <span className="truncate text-muted-foreground line-through">{c.antes}</span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate font-semibold text-[#10233F]">{c.despues}</span>
                    </span>
                  </div>
                ))}
              </div>
              {preview && (hay('fechas') || hay('tarifa') || hay('descuento')) && <ResumenDinero actual={preview.actual} nuevo={preview.nuevo} />}
              <div className="space-y-1.5">
                <Label>Motivo {requiereMotivo ? '(obligatorio)' : '(opcional)'}</Label>
                <Textarea rows={2} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="¿Por qué se hace este cambio?" />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            {paso === 'editar' ? <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
              <Button className="bg-[#10233F] hover:bg-[#10233F]/90" onClick={revisar} disabled={cambios.length === 0}>
                Revisar cambios{cambios.length ? ` (${cambios.length})` : ''}
              </Button>
            </> : <>
              <Button variant="outline" onClick={() => setPaso('editar')} disabled={guardando}>Volver a editar</Button>
              <Button className="bg-[#10233F] hover:bg-[#10233F]/90" onClick={guardar} disabled={guardando}>
                {guardando ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando…</> : 'Guardar cambios'}
              </Button>
            </>}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {cliente?.id && <ClienteFormDialog
        open={clienteDialog}
        onOpenChange={setClienteDialog}
        cliente={cliente}
        onSaved={(guardado) => { setCliente(guardado); void onSaved?.(); }}
      />}
    </>
  );
}

function ResumenDinero({ actual, nuevo }: { actual: any; nuevo: any }) {
  const fila = (label: string, a: number, b: number, strong = false) => (
    <div className={`flex items-center justify-between gap-2 text-sm ${strong ? 'font-semibold text-[#10233F]' : ''}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1.5">
        {Math.abs(a - b) > 0.009 && <><span className="text-muted-foreground line-through">{formatCurrency(a)}</span><ArrowRight className="h-3 w-3 text-muted-foreground" /></>}
        <span>{formatCurrency(b)}</span>
      </span>
    </div>
  );
  const diff = nuevo.total - actual.total;
  return (
    <div className="space-y-1 rounded-md border bg-slate-50 p-3">
      {fila('Hospedaje', actual.lodging, nuevo.lodging)}
      {fila('Descuento', actual.discount, nuevo.discount)}
      {fila('Impuestos', actual.taxes, nuevo.taxes)}
      {fila('Total', actual.total, nuevo.total, true)}
      {fila('Saldo pendiente', actual.balance, nuevo.balance, true)}
      {Math.abs(diff) > 0.009 && <p className={`pt-1 text-xs font-medium ${diff > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
        {diff > 0 ? `El huésped pagará ${formatCurrency(diff)} más.` : `El total baja ${formatCurrency(-diff)}.`}
      </p>}
    </div>
  );
}
