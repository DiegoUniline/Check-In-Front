import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ArrowLeftRight, BadgeDollarSign, BedDouble, CalendarClock, CalendarDays,
  CheckCircle2, ChevronDown, Clock, History, Loader2, LogIn, LogOut, Plus,
  Receipt, RefreshCcw, Search, ShieldAlert, Split, UserMinus, UserPlus, Wrench,
  XCircle,
} from 'lucide-react';
import api, { todayLocal } from '@/lib/api';
import { canAccess } from '@/lib/permissions';
import { useAuth } from '@/contexts/useAuth';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/currency';
import { formatDate, formatDateTime } from '@/lib/dateFormat';
import { MetodoPagoSelect } from '@/components/MetodoPagoSelect';
import { StayConsumptionPicker, type StayConsumptionItem } from '@/components/reservas/StayConsumptionPicker';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type Props = { reserva: any; habitaciones?: any[]; onUpdate?: () => void | Promise<void>; children?: ReactNode };
type Operation = { id: string; label: string; detail: string; icon: any; sensitive?: boolean };

const groups: { title: string; operations: Operation[] }[] = [
  { title: 'Estancia y fechas', operations: [
    { id: 'extend_stay', label: 'Extender estancia', detail: 'Agrega noches y recalcula el total.', icon: CalendarDays },
    { id: 'early_departure', label: 'Salida anticipada', detail: 'Acorta la estancia y ajusta el saldo.', icon: LogOut },
    { id: 'modify_dates', label: 'Modificar fechas', detail: 'Cambia entrada o salida con disponibilidad.', icon: CalendarClock },
    { id: 'late_checkout', label: 'Late check-out', detail: 'Nueva hora y cargo opcional.', icon: Clock },
    { id: 'early_checkin', label: 'Early check-in', detail: 'Valida habitación limpia y lista.', icon: LogIn },
  ]},
  { title: 'Habitación y huéspedes', operations: [
    { id: 'room_change', label: 'Cambiar habitación', detail: 'Reubica sin perder folio ni pagos.', icon: ArrowLeftRight },
    { id: 'category_change', label: 'Upgrade o downgrade', detail: 'Cambia categoría y tarifa si aplica.', icon: BedDouble, sensitive: true },
    { id: 'add_guest', label: 'Agregar huésped', detail: 'Controla capacidad y cargo adicional.', icon: UserPlus },
    { id: 'room_out_of_service', label: 'Fuera de servicio', detail: 'Reubica y bloquea por mantenimiento.', icon: Wrench, sensitive: true },
    { id: 'consecutive_reservation', label: 'Reserva consecutiva', detail: 'Enlaza la siguiente estancia.', icon: RefreshCcw },
  ]},
  { title: 'Tarifa, cuenta y correcciones', operations: [
    { id: 'rate_change', label: 'Modificar tarifa', detail: 'Recalcula noches, total y saldo.', icon: BadgeDollarSign, sensitive: true },
    { id: 'discount_change', label: 'Descuento o cortesía', detail: 'Monto, porcentaje o cortesía.', icon: BadgeDollarSign, sensitive: true },
    { id: 'add_charge', label: 'Agregar consumo', detail: 'Minibar, restaurante, daños u otro.', icon: Plus },
    { id: 'update_charge', label: 'Corregir cargo', detail: 'Edita sin borrar el registro original.', icon: Receipt, sensitive: true },
    { id: 'cancel_charge', label: 'Cancelar cargo', detail: 'Lo anula conservando trazabilidad.', icon: Receipt, sensitive: true },
    { id: 'restore_charge', label: 'Restaurar cargo', detail: 'Reactiva de forma controlada un cargo cancelado.', icon: RefreshCcw, sensitive: true },
    { id: 'transfer_charge', label: 'Trasladar cargo', detail: 'Mueve un consumo a otro folio.', icon: ArrowLeftRight, sensitive: true },
    { id: 'partial_payment', label: 'Pago parcial', detail: 'Registra un abono al saldo.', icon: BadgeDollarSign },
    { id: 'payment_method_change', label: 'Corregir forma de pago', detail: 'Conserva el importe y audita el cambio.', icon: BadgeDollarSign, sensitive: true },
    { id: 'cancel_payment', label: 'Cancelar pago', detail: 'Anula un pago sin eliminar su historia.', icon: BadgeDollarSign, sensitive: true },
    { id: 'restore_payment', label: 'Restaurar pago', detail: 'Reactiva un pago si no genera sobrepago.', icon: RefreshCcw, sensitive: true },
    { id: 'split_account', label: 'Dividir cuenta', detail: 'Crea subcuenta y asigna movimientos.', icon: Split },
    { id: 'move_to_account', label: 'Mover entre subcuentas', detail: 'Reasigna cargos o pagos a una cuenta.', icon: ArrowLeftRight },
  ]},
  { title: 'Excepciones operativas', operations: [
    { id: 'no_show', label: 'Marcar no-show', detail: 'Libera disponibilidad sin borrar la reserva.', icon: ShieldAlert },
    { id: 'cancel_reservation', label: 'Cancelar reserva', detail: 'Cancela con motivo e historial.', icon: ShieldAlert },
    { id: 'reopen_checkout', label: 'Reabrir check-out', detail: 'Corrige una salida cerrada por error.', icon: RefreshCcw, sensitive: true },
    { id: 'correction_note', label: 'Corrección posterior', detail: 'Deja constancia de una corrección operativa.', icon: History },
  ]},
];

const DATE_OPERATIONS = ['extend_stay', 'early_departure', 'modify_dates'];
const ROOM_OPERATIONS = ['room_change', 'category_change', 'early_checkin', 'room_out_of_service', 'reopen_checkout'];

const dateOnly = (value: any) => String(value || '').slice(0, 10);
const money = (value: any) => Number(value || 0);
const shiftDate = (value: any, days: number) => {
  const [year, month, day] = dateOnly(value).split('-').map(Number);
  if (!year || !month || !day) return '';
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}-${String(shifted.getUTCDate()).padStart(2, '0')}`;
};

export function StayOperationsPanel({ reserva, onUpdate, children }: Props) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selected, setSelected] = useState<Operation | null>(null);
  const [payload, setPayload] = useState<Record<string, any>>({});
  const [reason, setReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [availableRooms, setAvailableRooms] = useState<any[]>([]);
  const [roomSearch, setRoomSearch] = useState('');
  const [roomTypeFilter, setRoomTypeFilter] = useState('all');
  const [roomFloorFilter, setRoomFloorFilter] = useState('all');
  const [checkingRooms, setCheckingRooms] = useState(false);
  const [roomAvailabilityError, setRoomAvailabilityError] = useState('');
  const [dateAvailability, setDateAvailability] = useState<{ status: 'idle' | 'checking' | 'available' | 'unavailable' | 'invalid'; message: string }>({ status: 'idle', message: '' });
  const [movements, setMovements] = useState<any[]>([]);
  const [guests, setGuests] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [reverseMovement, setReverseMovement] = useState<any | null>(null);
  const [reverseReason, setReverseReason] = useState('');

  const activeCharges = useMemo(() => (reserva.cargos || []).filter((c: any) => c.estado !== 'Cancelado'), [reserva.cargos]);
  const activePayments = useMemo(() => (reserva.pagos || []).filter((p: any) => p.estado !== 'Cancelado'), [reserva.pagos]);
  const cancelledCharges = useMemo(() => (reserva.cargos || []).filter((c: any) => c.estado === 'Cancelado'), [reserva.cargos]);
  const cancelledPayments = useMemo(() => (reserva.pagos || []).filter((p: any) => p.estado === 'Cancelado'), [reserva.pagos]);
  const operationApplies = (id: string) => {
    const state = String(reserva.estado || '');
    const active = ['CheckIn', 'Hospedado'].includes(state) && !reserva.checkout_realizado;
    if (['late_checkout', 'add_guest', 'remove_guest'].includes(id)) return active;
    if (id === 'early_checkin') return ['Pendiente', 'Confirmada'].includes(state) && !reserva.checkin_realizado;
    if (id === 'reopen_checkout') return state === 'CheckOut';
    if (id === 'restore_charge') return cancelledCharges.length > 0;
    if (id === 'restore_payment') return cancelledPayments.length > 0;
    if (id === 'move_to_account') return accounts.some((account) => account.estado === 'Abierta');
    if (['no_show', 'cancel_reservation'].includes(id)) return ['Pendiente', 'Confirmada'].includes(state);
    if (['add_charge', 'partial_payment', 'split_account'].includes(id)) return !['Cancelada', 'NoShow', 'CheckOut'].includes(state);
    if (['extend_stay', 'early_departure', 'modify_dates', 'room_change', 'category_change'].includes(id))
      return !['Cancelada', 'NoShow', 'CheckOut'].includes(state);
    return true;
  };

  const quickOperationIds = ['extend_stay', 'room_change', 'add_charge', 'partial_payment'];
  const quickOperations = quickOperationIds
    .map((operationId) => groups.flatMap((group) => group.operations).find((operation) => operation.id === operationId))
    .filter(Boolean) as Operation[];

  const roomTypes = useMemo<{ id: string; name: string }[]>(() => {
    const types = new Map<string, string>();
    availableRooms.forEach((room) => {
      if (room.tipo_habitacion_id) {
        types.set(room.tipo_habitacion_id, room.tipos_habitacion?.nombre || room.tipo_nombre || room.tipo || 'Sin categoría');
      }
    });
    return Array.from(types, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [availableRooms]);
  const roomFloors = useMemo(() => Array.from(new Set(availableRooms.map((room) => String(room.piso || '')).filter(Boolean))).sort(), [availableRooms]);
  const filteredAvailableRooms = useMemo(() => {
    const search = roomSearch.trim().toLowerCase();
    return availableRooms.filter((room) => {
      const roomType = room.tipos_habitacion?.nombre || room.tipo_nombre || room.tipo || '';
      const matchesSearch = !search || `${room.numero} ${roomType} ${room.piso || ''}`.toLowerCase().includes(search);
      const matchesType = roomTypeFilter === 'all' || room.tipo_habitacion_id === roomTypeFilter;
      const matchesFloor = roomFloorFilter === 'all' || String(room.piso || '') === roomFloorFilter;
      return matchesSearch && matchesType && matchesFloor;
    });
  }, [availableRooms, roomFloorFilter, roomSearch, roomTypeFilter]);
  const isActiveStay = ['CheckIn', 'Hospedado'].includes(String(reserva.estado || '')) && !reserva.checkout_realizado;

  const load = async () => {
    setLoading(true);
    try {
      const [moveData, guestData, accountData, reservationData] = await Promise.all([
        api.getStayMovements(reserva.id), api.getStayGuests(reserva.id), api.getStayAccounts(reserva.id),
        api.getReservas(),
      ]);
      setMovements(moveData); setGuests(guestData); setAccounts(accountData);
      setReservations(reservationData || []);
    } catch (error: any) {
      // La migración puede no estar aplicada todavía durante el despliegue.
      toast({ title: 'No se pudieron cargar las operaciones', description: error.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [reserva.id]);

  useEffect(() => {
    if (!selected || !DATE_OPERATIONS.includes(selected.id)) {
      setDateAvailability({ status: 'idle', message: '' });
      return;
    }
    const checkin = dateOnly(payload.new_checkin || reserva.fecha_checkin);
    const checkout = dateOnly(payload.new_checkout || reserva.fecha_checkout);
    const originalCheckout = dateOnly(reserva.fecha_checkout);
    if (!checkin || !checkout || checkout <= checkin) {
      setDateAvailability({ status: 'invalid', message: 'La salida debe ser posterior a la entrada.' });
      return;
    }
    if (selected.id === 'extend_stay' && checkout <= originalCheckout) {
      setDateAvailability({ status: 'invalid', message: `Para extender, selecciona una fecha posterior al ${formatDate(originalCheckout)}.` });
      return;
    }
    if (selected.id === 'early_departure' && checkout >= originalCheckout) {
      setDateAvailability({ status: 'invalid', message: `Para una salida anticipada, selecciona una fecha anterior al ${formatDate(originalCheckout)}.` });
      return;
    }
    if (isActiveStay && checkout < todayLocal()) {
      setDateAvailability({ status: 'invalid', message: 'La salida no puede quedar antes del día operativo actual.' });
      return;
    }
    if (!reserva.habitacion_id) {
      setDateAvailability({ status: 'available', message: 'El rango es válido. La habitación se validará al asignarla.' });
      return;
    }

    let cancelled = false;
    setDateAvailability({ status: 'checking', message: 'Comprobando disponibilidad de la habitación…' });
    const timer = window.setTimeout(async () => {
      try {
        const available = await api.getHabitacionesDisponibles(checkin, checkout, undefined, reserva.id);
        if (cancelled) return;
        const roomIsAvailable = (available || []).some((room: any) => room.id === reserva.habitacion_id);
        setDateAvailability(roomIsAvailable
          ? { status: 'available', message: `Habitación #${reserva.habitacion_numero || ''} disponible para todo el nuevo rango.` }
          : { status: 'unavailable', message: `La habitación #${reserva.habitacion_numero || ''} tiene un conflicto en esas fechas.` });
      } catch (error: any) {
        if (!cancelled) setDateAvailability({ status: 'unavailable', message: error.message || 'No se pudo validar la disponibilidad.' });
      }
    }, 300);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [selected?.id, payload.new_checkin, payload.new_checkout, reserva.fecha_checkin, reserva.fecha_checkout, reserva.habitacion_id, reserva.habitacion_numero, reserva.id, isActiveStay]);

  useEffect(() => {
    if (!selected || !ROOM_OPERATIONS.includes(selected.id)) {
      setCheckingRooms(false);
      setAvailableRooms([]);
      setRoomAvailabilityError('');
      return;
    }
    const reopening = selected.id === 'reopen_checkout';
    const checkin = reopening || isActiveStay ? todayLocal() : dateOnly(reserva.fecha_checkin);
    const checkout = reopening ? dateOnly(payload.new_checkout) : dateOnly(reserva.fecha_checkout);
    if (!checkin || !checkout || checkout <= checkin) {
      setCheckingRooms(false);
      setAvailableRooms([]);
      setRoomAvailabilityError('La estancia no tiene un rango de fechas válido para buscar habitaciones.');
      return;
    }
    const requireReady = selected.id === 'early_checkin' || (isActiveStay && !reopening);
    const excludeCurrentRoom = !['early_checkin', 'reopen_checkout'].includes(selected.id);
    let cancelled = false;
    setCheckingRooms(true);
    setRoomAvailabilityError('');
    setRoomSearch('');
    setRoomTypeFilter('all');
    setRoomFloorFilter('all');
    void api.getHabitacionesDisponibles(checkin, checkout, undefined, reserva.id)
      .then((items) => {
        if (cancelled) return;
        const available = (items || []).filter((room: any) => {
          if (excludeCurrentRoom && room.id === reserva.habitacion_id) return false;
          const maintenanceReady = String(room.estado_mantenimiento || 'OK').toLowerCase() === 'ok';
          if (!maintenanceReady) return false;
          if (!requireReady) return true;
          return room.estado_habitacion === 'Disponible' && String(room.estado_limpieza || 'Limpia').toLowerCase() === 'limpia';
        });
        setAvailableRooms(available);
        setPayload((current) => available.some((room: any) => room.id === current.new_room_id) ? current : { ...current, new_room_id: '' });
      })
      .catch((error: any) => {
        if (!cancelled) {
          setAvailableRooms([]);
          setRoomAvailabilityError(error.message || 'No se pudieron consultar habitaciones disponibles.');
        }
      })
      .finally(() => { if (!cancelled) setCheckingRooms(false); });
    return () => { cancelled = true; };
  }, [selected?.id, payload.new_checkout, reserva.id, reserva.habitacion_id, reserva.fecha_checkin, reserva.fecha_checkout, isActiveStay]);

  const openOperation = (op: Operation) => {
    setSelected(op); setReason('');
    setPayload({
      new_checkin: dateOnly(reserva.fecha_checkin), new_checkout: dateOnly(reserva.fecha_checkout),
      new_room_id: '', new_rate: String(money(reserva.tarifa_noche)), charge_amount: '',
      late_until: `${dateOnly(reserva.fecha_checkout)}T13:00`, payment_method: '',
      quantity: '1', amount: '', tax: '0', discount_type: 'Porcentaje', discount_value: '',
      guest_type: 'Adulto', generates_charge: false, charge_per_night: '0',
      priority: 'Alta', blocked_until: '', charge_ids: [], payment_ids: [],
      items: [],
    });
  };

  const set = (key: string, value: any) => setPayload((current) => ({ ...current, [key]: value }));

  const submit = async () => {
    if (!selected) return;
    if (DATE_OPERATIONS.includes(selected.id) && ['checking', 'unavailable', 'invalid'].includes(dateAvailability.status)) {
      toast({ title: 'Revisa la disponibilidad', description: dateAvailability.message, variant: 'destructive' });
      return;
    }
    if (ROOM_OPERATIONS.includes(selected.id) && !payload.new_room_id) {
      toast({ title: 'Selecciona una habitación disponible', description: 'Usa la búsqueda y los filtros para elegir una opción.', variant: 'destructive' });
      return;
    }
    if (selected.id === 'add_charge' && (!Array.isArray(payload.items) || payload.items.length === 0)) {
      toast({ title: 'Selecciona el consumo', description: 'Agrega por lo menos un producto o servicio del catálogo.', variant: 'destructive' });
      return;
    }
    if (reason.trim().length < 3) {
      toast({ title: 'Escribe el motivo', description: 'La trazabilidad requiere una explicación breve.', variant: 'destructive' });
      return;
    }
    setProcessing(true);
    try {
      const normalizedPayload = { ...payload };
      for (const key of ['late_until', 'blocked_until']) {
        if (normalizedPayload[key]) normalizedPayload[key] = new Date(normalizedPayload[key]).toISOString();
      }
      await api.applyStayOperation(reserva.id, selected.id, normalizedPayload, reason.trim());
      toast({ title: 'Operación completada', description: `${selected.label} se aplicó y quedó en el historial.` });
      setSelected(null); await onUpdate?.(); await load();
    } catch (error: any) {
      toast({ title: 'No se pudo completar', description: error.message, variant: 'destructive' });
    } finally { setProcessing(false); }
  };

  const reverse = async () => {
    if (!reverseMovement || reverseReason.trim().length < 3) return;
    setProcessing(true);
    try {
      await api.reverseStayOperation(reverseMovement.id, reverseReason.trim());
      toast({ title: 'Operación revertida', description: 'Se restauraron los valores anteriores con trazabilidad.' });
      setReverseMovement(null); setReverseReason(''); await onUpdate?.(); await load();
    } catch (error: any) {
      toast({ title: 'No se pudo revertir', description: error.message, variant: 'destructive' });
    } finally { setProcessing(false); }
  };

  const roomSelect = (label = 'Habitación destino') => {
    const reopening = selected?.id === 'reopen_checkout';
    const checkin = reopening || isActiveStay ? todayLocal() : dateOnly(reserva.fecha_checkin);
    const checkout = reopening ? dateOnly(payload.new_checkout) : dateOnly(reserva.fecha_checkout);
    const selectedRoom = availableRooms.find((room) => room.id === payload.new_room_id);
    return <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <Label>{label}</Label>
          <p className="mt-1 text-xs text-muted-foreground">Solo habitaciones libres del {formatDate(checkin)} al {formatDate(checkout)}.</p>
        </div>
        {!checkingRooms && !roomAvailabilityError && <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
          {availableRooms.length} disponible{availableRooms.length === 1 ? '' : 's'}
        </Badge>}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={roomSearch}
          onChange={(event) => setRoomSearch(event.target.value)}
          placeholder="Buscar por número, tipo o piso…"
          className="pl-9"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Select value={roomTypeFilter} onValueChange={setRoomTypeFilter}>
          <SelectTrigger><SelectValue placeholder="Todas las categorías" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {roomTypes.map((type) => <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={roomFloorFilter} onValueChange={setRoomFloorFilter}>
          <SelectTrigger><SelectValue placeholder="Todos los pisos" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los pisos</SelectItem>
            {roomFloors.map((floor) => <SelectItem key={floor} value={floor}>Piso {floor}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {checkingRooms ? <div className="flex min-h-28 items-center justify-center gap-2 rounded-xl border border-dashed text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Buscando habitaciones realmente disponibles…
      </div> : roomAvailabilityError ? <div className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        <XCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{roomAvailabilityError}</span>
      </div> : filteredAvailableRooms.length === 0 ? <div className="rounded-xl border border-dashed p-5 text-center">
        <BedDouble className="mx-auto h-6 w-6 text-muted-foreground" />
        <p className="mt-2 text-sm font-medium text-[#10233F]">No hay habitaciones con estos filtros</p>
        <p className="mt-1 text-xs text-muted-foreground">Cambia la búsqueda o los filtros. Nunca mostraremos una habitación con conflicto.</p>
        {(roomSearch || roomTypeFilter !== 'all' || roomFloorFilter !== 'all') && <Button type="button" variant="link" size="sm" onClick={() => { setRoomSearch(''); setRoomTypeFilter('all'); setRoomFloorFilter('all'); }}>Limpiar filtros</Button>}
      </div> : <div className="max-h-[38dvh] space-y-2 overflow-y-auto pr-1 sm:grid sm:grid-cols-2 sm:gap-2 sm:space-y-0">
        {filteredAvailableRooms.map((room) => {
          const typeName = room.tipos_habitacion?.nombre || room.tipo_nombre || room.tipo || 'Sin categoría';
          const selectedRoomId = payload.new_room_id === room.id;
          return <button
            key={room.id}
            type="button"
            onClick={() => {
              setPayload((current) => {
                const next = { ...current, new_room_id: room.id };
                if (selected?.id === 'category_change' && current.change_type !== 'Cortesia') {
                  next.new_rate = String(money(room.precio_base ?? room.tipos_habitacion?.precio_base));
                }
                return next;
              });
            }}
            className={`flex min-h-20 w-full items-center justify-between gap-3 rounded-xl border p-3 text-left transition-colors ${selectedRoomId ? 'border-[#10233F] bg-[#10233F] text-white' : 'border-[#10233F]/15 bg-white hover:border-[#10233F]/45 hover:bg-[#10233F]/[0.03]'}`}
          >
            <span className="min-w-0">
              <span className="block text-base font-bold">#{room.numero}</span>
              <span className={`block truncate text-xs ${selectedRoomId ? 'text-white/75' : 'text-muted-foreground'}`}>{typeName}{room.piso ? ` · Piso ${room.piso}` : ''}</span>
              <span className={`mt-1 block text-[11px] ${selectedRoomId ? 'text-emerald-200' : 'text-emerald-700'}`}>Limpia y sin conflictos</span>
            </span>
            {selectedRoomId ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <BedDouble className="h-5 w-5 shrink-0 text-[#10233F]/45" />}
          </button>;
        })}
      </div>}

      {selectedRoom && <div className="flex items-center gap-2 rounded-lg bg-[#10233F]/[0.06] px-3 py-2 text-sm text-[#10233F]">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> Seleccionaste la habitación #{selectedRoom.numero}.
      </div>}
      <p className="text-[11px] text-muted-foreground">La disponibilidad se vuelve a comprobar al aplicar el cambio para evitar cruces de último momento.</p>
    </div>;
  };

  const availabilityNotice = () => {
    if (dateAvailability.status === 'idle') return null;
    const available = dateAvailability.status === 'available';
    const checking = dateAvailability.status === 'checking';
    return <div className={`mt-2 flex gap-2 rounded-lg border px-3 py-2 text-xs ${available ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : checking ? 'border-[#10233F]/15 bg-[#10233F]/[0.03] text-[#10233F]' : 'border-red-200 bg-red-50 text-red-700'}`}>
      {checking ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : available ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
      <span>{dateAvailability.message}</span>
    </div>;
  };

  const reservationSelect = (key: string, label: string, sameGuest = false) => (
    <Field label={label}>
      <Select value={payload[key] || ''} onValueChange={(value) => set(key, value)}>
        <SelectTrigger><SelectValue placeholder="Seleccionar reservación" /></SelectTrigger>
        <SelectContent>{reservations.filter((item) => item.id !== reserva.id && (!sameGuest || item.cliente_id === reserva.cliente_id)).map((item) => (
          <SelectItem key={item.id} value={item.id}>#{item.numero_reserva || item.id.slice(0, 6)} · {item.cliente_nombre} · {dateOnly(item.fecha_checkin)}</SelectItem>
        ))}</SelectContent>
      </Select>
    </Field>
  );

  const chargeSelect = (items = activeCharges) => <Field label="Cargo">
    <Select value={payload.charge_id || ''} onValueChange={(value) => {
      const charge = items.find((item: any) => item.id === value);
      setPayload((current) => ({ ...current, charge_id: value, concept: charge?.concepto || '', amount: String(charge?.precio_unitario || ''), quantity: String(charge?.cantidad || 1), tax: String(charge?.impuesto || 0) }));
    }}><SelectTrigger><SelectValue placeholder="Seleccionar cargo" /></SelectTrigger><SelectContent>
      {items.map((charge: any) => <SelectItem key={charge.id} value={charge.id}>{charge.concepto} · {formatCurrency(charge.total ?? charge.subtotal)}</SelectItem>)}
    </SelectContent></Select>
  </Field>;

  const paymentSelect = (items = activePayments) => <Field label="Pago">
    <Select value={payload.payment_id || ''} onValueChange={(value) => set('payment_id', value)}>
      <SelectTrigger><SelectValue placeholder="Seleccionar pago" /></SelectTrigger><SelectContent>
        {items.map((payment: any) => <SelectItem key={payment.id} value={payment.id}>{payment.metodo_pago} · {formatCurrency(payment.monto)}</SelectItem>)}
      </SelectContent>
    </Select>
  </Field>;

  const accountSelect = () => accounts.length > 0 ? <Field label="Aplicar a la cuenta">
    <Select value={payload.account_id || 'main'} onValueChange={(value) => set('account_id', value === 'main' ? '' : value)}>
      <SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="main">Cuenta principal</SelectItem>{accounts.filter((account) => account.estado === 'Abierta').map((account) => <SelectItem key={account.id} value={account.id}>{account.nombre}</SelectItem>)}</SelectContent>
    </Select>
  </Field> : null;

  const renderFields = () => {
    if (!selected) return null;
    switch (selected.id) {
      case 'extend_stay':
        return <div><Field label="Nueva fecha de salida"><Input type="date" min={shiftDate(reserva.fecha_checkout, 1)} value={payload.new_checkout || ''} onChange={(e) => set('new_checkout', e.target.value)} /></Field>{availabilityNotice()}</div>;
      case 'early_departure':
        return <div><Field label="Nueva fecha de salida"><Input type="date" min={isActiveStay ? todayLocal() : shiftDate(reserva.fecha_checkin, 1)} max={shiftDate(reserva.fecha_checkout, -1)} value={payload.new_checkout || ''} onChange={(e) => set('new_checkout', e.target.value)} /></Field>{availabilityNotice()}</div>;
      case 'modify_dates':
        return <div><div className="grid gap-3 sm:grid-cols-2"><Field label="Nueva entrada"><Input type="date" max={shiftDate(payload.new_checkout, -1)} value={payload.new_checkin || ''} onChange={(e) => set('new_checkin', e.target.value)} /></Field><Field label="Nueva salida"><Input type="date" min={shiftDate(payload.new_checkin, 1)} value={payload.new_checkout || ''} onChange={(e) => set('new_checkout', e.target.value)} /></Field></div>{availabilityNotice()}</div>;
      case 'room_change': return roomSelect();
      case 'category_change': return <div className="space-y-3">{roomSelect('Nueva habitación / categoría')}<Field label="Tipo de cambio"><Select value={payload.change_type || 'Upgrade'} onValueChange={(v) => { setPayload((current) => { const room = availableRooms.find((item) => item.id === current.new_room_id); return { ...current, change_type: v, new_rate: v === 'Cortesia' ? '0' : String(money(room?.precio_base ?? room?.tipos_habitacion?.precio_base ?? reserva.tarifa_noche)) }; }); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Upgrade">Upgrade</SelectItem><SelectItem value="Downgrade">Downgrade</SelectItem><SelectItem value="Cortesia">Cortesía</SelectItem><SelectItem value="CambioConCosto">Cambio con costo</SelectItem></SelectContent></Select></Field><Field label="Tarifa resultante por noche"><Input type="number" min="0" value={payload.new_rate || ''} onChange={(e) => set('new_rate', e.target.value)} /><p className="mt-1 text-xs text-muted-foreground">Se propone automáticamente la tarifa base de la categoría. Sólo gerencia puede modificarla.</p></Field></div>;
      case 'late_checkout': return <div className="grid gap-3 sm:grid-cols-2"><Field label="Salida autorizada"><Input type="datetime-local" value={payload.late_until || ''} onChange={(e) => set('late_until', e.target.value)} /></Field><Field label="Cargo adicional"><Input type="number" min="0" value={payload.charge_amount || ''} onChange={(e) => set('charge_amount', e.target.value)} /></Field></div>;
      case 'early_checkin': return <div className="space-y-3">{roomSelect('Habitación limpia y lista')}<Field label="Cargo adicional"><Input type="number" min="0" value={payload.charge_amount || ''} onChange={(e) => set('charge_amount', e.target.value)} /></Field></div>;
      case 'add_guest': return <div className="grid gap-3 sm:grid-cols-2"><Field label="Nombre"><Input value={payload.name || ''} onChange={(e) => set('name', e.target.value)} /></Field><Field label="Apellido"><Input value={payload.last_name || ''} onChange={(e) => set('last_name', e.target.value)} /></Field><Field label="Tipo"><Select value={payload.guest_type} onValueChange={(v) => set('guest_type', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Adulto">Adulto</SelectItem><SelectItem value="Menor">Menor</SelectItem></SelectContent></Select></Field><Field label="Documento"><Input value={payload.document || ''} onChange={(e) => set('document', e.target.value)} /></Field><label className="flex items-center gap-2 text-sm"><Checkbox checked={payload.generates_charge} onCheckedChange={(v) => set('generates_charge', v === true)} />Genera cargo por noche</label>{payload.generates_charge && <Field label="Cargo por noche"><Input type="number" min="0" value={payload.charge_per_night || ''} onChange={(e) => set('charge_per_night', e.target.value)} /></Field>}</div>;
      case 'room_out_of_service': return <div className="space-y-3">{['Pendiente','Confirmada','CheckIn','Hospedado'].includes(reserva.estado) && roomSelect('Reasignar reservación a')}<Field label="Bloqueada hasta (opcional)"><Input type="datetime-local" value={payload.blocked_until || ''} onChange={(e) => set('blocked_until', e.target.value)} /></Field></div>;
      case 'rate_change': return <Field label="Nueva tarifa por noche"><Input type="number" min="0" value={payload.new_rate || ''} onChange={(e) => set('new_rate', e.target.value)} /></Field>;
      case 'discount_change': return <div className="grid gap-3 sm:grid-cols-2"><Field label="Tipo"><Select value={payload.discount_type} onValueChange={(v) => set('discount_type', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Porcentaje">Porcentaje</SelectItem><SelectItem value="Monto">Monto fijo</SelectItem><SelectItem value="Cortesia">Cortesía 100%</SelectItem><SelectItem value="none">Retirar descuento</SelectItem></SelectContent></Select></Field>{!['Cortesia','none'].includes(payload.discount_type) && <Field label="Valor"><Input type="number" min="0" value={payload.discount_value || ''} onChange={(e) => set('discount_value', e.target.value)} /></Field>}</div>;
      case 'add_charge': return <div className="space-y-3"><StayConsumptionPicker value={(payload.items || []) as StayConsumptionItem[]} onChange={(items) => set('items', items)} />{accountSelect()}<Field label="Notas del consumo (opcional)"><Input value={payload.notes || ''} onChange={(e) => set('notes', e.target.value)} placeholder="Ej. Entregar en la habitación" /></Field></div>;
      case 'update_charge': return <div className="space-y-3">{chargeSelect()}<ChargeFields payload={payload} set={set} /></div>;
      case 'cancel_charge': return chargeSelect();
      case 'restore_charge': return chargeSelect(cancelledCharges);
      case 'transfer_charge': return <div className="space-y-3">{chargeSelect()}{reservationSelect('target_reservation_id','Folio destino')}</div>;
      case 'partial_payment': return <div className="grid gap-3 sm:grid-cols-2"><Field label="Importe"><Input type="number" min="0.01" value={payload.amount || ''} onChange={(e) => set('amount', e.target.value)} /></Field><PaymentMethod payload={payload} set={set} /><Field label="Referencia"><Input value={payload.reference || ''} onChange={(e) => set('reference', e.target.value)} /></Field>{accountSelect()}</div>;
      case 'payment_method_change': return <div className="space-y-3">{paymentSelect()}<PaymentMethod payload={payload} set={set} /><Field label="Nueva referencia (opcional)"><Input value={payload.reference || ''} onChange={(e) => set('reference', e.target.value)} /></Field></div>;
      case 'cancel_payment': return paymentSelect();
      case 'restore_payment': return paymentSelect(cancelledPayments);
      case 'split_account': return <div className="space-y-3"><Field label="Nombre de subcuenta"><Input placeholder="Empresa, acompañante…" value={payload.name || ''} onChange={(e) => set('name', e.target.value)} /></Field><Field label="Responsable"><Input value={payload.responsible || ''} onChange={(e) => set('responsible', e.target.value)} /></Field><MovementChecks title="Cargos a separar" items={activeCharges} selected={payload.charge_ids || []} onChange={(ids) => set('charge_ids', ids)} label={(item) => `${item.concepto} · ${formatCurrency(item.total ?? item.subtotal)}`} /><MovementChecks title="Pagos a separar" items={activePayments} selected={payload.payment_ids || []} onChange={(ids) => set('payment_ids', ids)} label={(item) => `${item.metodo_pago} · ${formatCurrency(item.monto)}`} /></div>;
      case 'move_to_account': return <div className="space-y-3"><Field label="Subcuenta destino"><Select value={payload.account_id || 'main'} onValueChange={(v) => set('account_id', v === 'main' ? '' : v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="main">Cuenta principal</SelectItem>{accounts.filter((account) => account.estado === 'Abierta').map((account) => <SelectItem key={account.id} value={account.id}>{account.nombre}</SelectItem>)}</SelectContent></Select></Field><MovementChecks title="Cargos a mover" items={activeCharges} selected={payload.charge_ids || []} onChange={(ids) => set('charge_ids', ids)} label={(item) => `${item.concepto} · ${formatCurrency(item.total ?? item.subtotal)}`} /><MovementChecks title="Pagos a mover" items={activePayments} selected={payload.payment_ids || []} onChange={(ids) => set('payment_ids', ids)} label={(item) => `${item.metodo_pago} · ${formatCurrency(item.monto)}`} /></div>;
      case 'consecutive_reservation': return reservationSelect('next_reservation_id','Siguiente reservación',true);
      case 'reopen_checkout': return <div className="space-y-3"><Field label="Nueva fecha de salida"><Input type="date" min={shiftDate(todayLocal(), 1)} value={payload.new_checkout || ''} onChange={(e) => set('new_checkout', e.target.value)} /></Field>{roomSelect('Habitación para reabrir la estancia')}</div>;
      default: return <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">Esta acción conservará todos los datos históricos y actualizará las vistas relacionadas.</p>;
    }
  };

  const dateOperationBlocked = Boolean(selected && DATE_OPERATIONS.includes(selected.id) && ['checking', 'unavailable', 'invalid'].includes(dateAvailability.status));
  const roomOperationBlocked = Boolean(selected && ROOM_OPERATIONS.includes(selected.id) && (checkingRooms || !payload.new_room_id));
  const consumptionBlocked = Boolean(selected?.id === 'add_charge' && (!Array.isArray(payload.items) || payload.items.length === 0));
  const validatingAvailability = Boolean(selected && (
    (DATE_OPERATIONS.includes(selected.id) && dateAvailability.status === 'checking') ||
    (ROOM_OPERATIONS.includes(selected.id) && checkingRooms)
  ));

  return <div className="space-y-4">
    <section className="rounded-xl border border-[#10233F]/10 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-[#10233F]">Acciones de la reserva</h3>
          <p className="mt-1 text-sm text-muted-foreground">Los cambios validan conflictos y quedan registrados.</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="shrink-0 border-[#10233F]/20 text-[#10233F]">
              Más operaciones <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-[70vh] w-80 overflow-y-auto">
            {groups.map((group, groupIndex) => <div key={group.title}>
              {groupIndex > 0 && <DropdownMenuSeparator />}
              <DropdownMenuLabel className="text-xs uppercase tracking-wide text-muted-foreground">{group.title}</DropdownMenuLabel>
              {group.operations.filter((operation) => !quickOperationIds.includes(operation.id)).map((operation) => {
                const Icon = operation.icon;
                const allowed = canAccess(`reservas.operacion.${operation.id}`, user?.rol);
                const applies = operationApplies(operation.id);
                return <DropdownMenuItem
                  key={operation.id}
                  disabled={loading || !allowed || !applies}
                  onSelect={() => openOperation(operation)}
                  className="items-start gap-3 py-2.5"
                >
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#10233F]" />
                  <span className="min-w-0"><span className="flex items-center gap-2 font-medium">{operation.label}{operation.sensitive && <span className="text-[9px] text-muted-foreground">GERENCIA</span>}</span><span className="block text-xs text-muted-foreground">{operation.detail}</span></span>
                </DropdownMenuItem>;
              })}
            </div>)}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {quickOperations.map((operation) => {
          const Icon = operation.icon;
          const allowed = canAccess(`reservas.operacion.${operation.id}`, user?.rol);
          const applies = operationApplies(operation.id);
          return <Button
            key={operation.id}
            variant="outline"
            onClick={() => openOperation(operation)}
            disabled={loading || !allowed || !applies}
            className="h-auto min-h-16 justify-start gap-3 border-[#10233F]/15 px-3 py-3 text-left hover:border-[#10233F]/35 hover:bg-[#10233F]/[0.03]"
            title={!allowed ? 'Tu rol no tiene permiso para esta acción' : !applies ? 'Esta acción no aplica al estado actual' : undefined}
          >
            <span className="rounded-lg bg-[#10233F]/10 p-2 text-[#10233F]"><Icon className="h-4 w-4" /></span>
            <span className="min-w-0 whitespace-normal"><span className="block text-sm font-semibold text-[#10233F]">{operation.label}</span><span className="hidden text-xs font-normal text-muted-foreground sm:block">{operation.detail}</span></span>
          </Button>;
        })}
      </div>
    </section>

    {children}

    {guests.length > 0 && <section className="space-y-2 rounded-xl border border-[#10233F]/10 bg-white p-4 shadow-sm sm:p-5"><h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Huéspedes adicionales</h4>{guests.map((guest) => <Card key={guest.id} className={guest.activo ? '' : 'opacity-60'}><CardContent className="flex items-center justify-between p-3"><div><p className="text-sm font-medium">{guest.nombre} {guest.apellido_paterno}</p><p className="text-xs text-muted-foreground">{guest.tipo}{guest.genera_cargo ? ` · ${formatCurrency(guest.cargo_por_noche)} por noche` : ''}</p></div>{guest.activo && <Button size="sm" variant="outline" disabled={!operationApplies('remove_guest') || !canAccess('reservas.operacion.remove_guest', user?.rol)} onClick={() => { const op = { id:'remove_guest',label:'Retirar huésped',detail:'',icon:UserMinus,sensitive:true }; openOperation(op); setPayload({ guest_id: guest.id }); }}><UserMinus className="mr-1 h-4 w-4" />Retirar</Button>}</CardContent></Card>)}</section>}

    {accounts.length > 0 && <AccountBreakdown accounts={accounts} charges={reserva.cargos || []} payments={reserva.pagos || []} />}

    <section className="space-y-2 rounded-xl border border-[#10233F]/10 bg-white p-4 shadow-sm sm:p-5"><div className="flex items-center justify-between"><h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Historial de operaciones</h4><Button variant="ghost" size="sm" onClick={load}><RefreshCcw className="h-3.5 w-3.5" /></Button></div>
      {movements.length === 0 ? <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">Aún no hay movimientos operativos.</p> : movements.map((move, index) => <div key={move.id} className="rounded-lg border p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium capitalize">{String(move.operacion).replaceAll('_',' ')}</p><p className="text-xs text-muted-foreground">{move.usuario_nombre || move.usuario_email || 'Usuario'} · {formatDateTime(move.created_at)}</p><p className="mt-1 text-xs">{move.motivo}</p></div>{move.revertido ? <Badge variant="secondary">Revertida</Badge> : move.reversible && index === 0 ? <Button size="sm" variant="outline" onClick={() => setReverseMovement(move)}>Revertir</Button> : null}</div></div>)}
    </section>

    <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}><DialogContent className="h-[100dvh] w-screen max-w-none overflow-y-auto rounded-none sm:h-auto sm:max-h-[90dvh] sm:max-w-2xl sm:rounded-xl"><DialogHeader><DialogTitle>{selected?.label}</DialogTitle><DialogDescription>{selected?.detail} La disponibilidad, cargos y saldos se validarán antes de guardar.</DialogDescription></DialogHeader><div className="space-y-4">{renderFields()}<Separator/><Field label="Motivo obligatorio"><Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Explica por qué se realiza este cambio…" rows={3}/></Field></div><DialogFooter className="gap-2"><Button variant="outline" onClick={() => setSelected(null)}>Cancelar</Button><Button onClick={submit} disabled={processing || reason.trim().length < 3 || dateOperationBlocked || roomOperationBlocked || consumptionBlocked} className="bg-[#10233F] hover:bg-[#10233F]/90">{processing ? 'Procesando…' : validatingAvailability ? 'Validando disponibilidad…' : 'Validar y aplicar'}</Button></DialogFooter></DialogContent></Dialog>

    <Dialog open={Boolean(reverseMovement)} onOpenChange={(open) => !open && setReverseMovement(null)}><DialogContent><DialogHeader><DialogTitle>Revertir operación</DialogTitle><DialogDescription>Se validará nuevamente la disponibilidad y se restaurarán los valores anteriores.</DialogDescription></DialogHeader><Field label="Motivo de reversión"><Textarea value={reverseReason} onChange={(e) => setReverseReason(e.target.value)} /></Field><DialogFooter><Button variant="outline" onClick={() => setReverseMovement(null)}>Cancelar</Button><Button variant="destructive" onClick={reverse} disabled={processing || reverseReason.trim().length < 3}>Revertir con control</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}

function Field({ label, children }: { label: string; children: ReactNode }) { return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>; }
function ChargeFields({ payload, set }: { payload: any; set: (key: string, value: any) => void }) { return <div className="grid gap-3 sm:grid-cols-2"><Field label="Concepto"><Input value={payload.concept || ''} onChange={(e) => set('concept', e.target.value)} /></Field><Field label="Cantidad"><Input type="number" min="0.01" value={payload.quantity || ''} onChange={(e) => set('quantity', e.target.value)} /></Field><Field label="Precio unitario"><Input type="number" min="0" value={payload.amount || ''} onChange={(e) => set('amount', e.target.value)} /></Field><Field label="Impuesto"><Input type="number" min="0" value={payload.tax || ''} onChange={(e) => set('tax', e.target.value)} /></Field><div className="sm:col-span-2"><Field label="Notas"><Input value={payload.notes || ''} onChange={(e) => set('notes', e.target.value)} /></Field></div></div>; }
function PaymentMethod({ payload, set }: { payload: any; set: (key: string, value: any) => void }) { return <Field label="Forma de pago"><MetodoPagoSelect value={payload.payment_method || ''} onChange={(value) => set('payment_method', value)} /></Field>; }
function MovementChecks({ title, items, selected, onChange, label }: { title: string; items: any[]; selected: string[]; onChange: (ids: string[]) => void; label: (item: any) => string }) { return <div className="space-y-2"><Label>{title}</Label><div className="max-h-32 space-y-2 overflow-y-auto rounded-lg border p-2">{items.length === 0 ? <p className="text-xs text-muted-foreground">Sin movimientos disponibles</p> : items.map((item) => <label key={item.id} className="flex items-center gap-2 text-sm"><Checkbox checked={selected.includes(item.id)} onCheckedChange={(checked) => onChange(checked ? [...selected,item.id] : selected.filter((id) => id !== item.id))}/><span>{label(item)}</span></label>)}</div></div>; }

function AccountBreakdown({ accounts, charges, payments }: { accounts: any[]; charges: any[]; payments: any[] }) {
  const rows = [{ id: '', nombre: 'Cuenta principal', responsable: '' }, ...accounts];
  return <section className="space-y-3 rounded-xl border border-[#10233F]/10 bg-white p-4 shadow-sm sm:p-5">
    <div><h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">División de cuenta</h4><p className="mt-1 text-sm text-muted-foreground">Totales, pagos y saldo de cada responsable.</p></div>
    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">{rows.map((account) => {
      const accountCharges = charges.filter((item) => item.estado !== 'Cancelado' && (item.cuenta_estancia_id || '') === account.id);
      const accountPayments = payments.filter((item) => item.estado !== 'Cancelado' && (item.cuenta_estancia_id || '') === account.id);
      const charged = accountCharges.reduce((sum, item) => sum + money(item.total ?? item.subtotal), 0);
      const paid = accountPayments.reduce((sum, item) => sum + money(item.monto), 0);
      return <div key={account.id || 'main'} className="rounded-xl border border-[#10233F]/10 p-3">
        <div className="flex items-start justify-between gap-2"><div><p className="font-semibold text-[#10233F]">{account.nombre}</p><p className="text-xs text-muted-foreground">{account.responsable || (account.id ? 'Sin responsable' : 'Titular de la reserva')}</p></div>{account.estado && <Badge variant="outline">{account.estado}</Badge>}</div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-xs"><div><p className="text-muted-foreground">Cargos</p><p className="font-semibold">{formatCurrency(charged)}</p></div><div><p className="text-muted-foreground">Pagado</p><p className="font-semibold text-emerald-700">{formatCurrency(paid)}</p></div><div><p className="text-muted-foreground">Saldo</p><p className="font-semibold">{formatCurrency(charged - paid)}</p></div></div>
      </div>;
    })}</div>
  </section>;
}
