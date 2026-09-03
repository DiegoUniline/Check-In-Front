import { useState, useEffect, useRef, type KeyboardEvent, type ReactNode, type RefObject } from 'react';
import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  CalendarDays, BedDouble, Check, ChevronLeft, CalendarPlus, UserPlus, Clock, Percent,
  DollarSign, Plus, Minus, Trash2, Receipt, Phone, Mail, CreditCard, X, ArrowLeft,
  Users, StickyNote, AlertTriangle, RefreshCw,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import api, { todayLocal } from '@/lib/api';
import { ComboboxCreatable } from '@/components/ui/combobox-creatable';
import { resolveImpuestosDefault } from '@/lib/impuestosDefault';
import { resolverPrecioTemporada, describirAjuste, loadTemporadas } from '@/lib/temporadas';
import { enviarWhatsAppReserva, MENSAJES_DEFAULT } from '@/lib/whatsappSend';
import { formatDate } from '@/lib/dateFormat';

export interface ReservationPreload {
  habitacion?: any;
  fechaCheckin?: Date;
  fechaCheckout?: Date;
  origen?: 'Reserva' | 'Recepcion';
}

interface NuevaReservaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preload?: ReservationPreload;
  onSuccess?: (reserva?: any) => void;
  pageMode?: boolean;
}

function ReservationSurface({
  pageMode,
  open,
  onClose,
  surfaceRef,
  onKeyDown,
  children,
}: {
  pageMode: boolean;
  open: boolean;
  onClose: () => void;
  surfaceRef: RefObject<HTMLDivElement>;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  children: ReactNode;
}) {
  if (pageMode) {
    return <div className="h-full min-h-0 overflow-y-auto bg-background xl:overflow-hidden">
      <div ref={surfaceRef} onKeyDown={onKeyDown} className="flex w-full flex-col px-3 pb-3 pt-2 sm:px-4 lg:px-5 xl:h-full xl:min-h-0">
        {children}
      </div>
    </div>;
  }


  return <Dialog open={open} onOpenChange={onClose}>
    <DialogContent ref={surfaceRef} onKeyDown={onKeyDown} className="flex h-[100dvh] w-screen max-w-none max-h-none flex-col overflow-hidden rounded-none border-0 p-3 sm:h-[94vh] sm:w-[calc(100vw-2rem)] sm:max-w-none sm:rounded-xl sm:border sm:p-4">
      {children}
    </DialogContent>
  </Dialog>;
}

interface CargoTemp {
  id: string;
  concepto_id: string;
  concepto_nombre: string;
  cantidad: number;
  precio_unitario: number;
  aplica_iva: boolean;
  subtotal: number;
  impuesto: number;
  total: number;
  notas: string;
}

interface PagoTemp {
  id: string;
  monto: number;
  metodo_pago: string;
  concepto: string;
}

interface ImpuestoTemp {
  id: string;
  nombre: string;
  tasa: number; // porcentaje
}

// Catálogo de impuestos típicos en México aplicables a hospedaje.
const IMPUESTOS_MEXICO_SUGERIDOS: { nombre: string; tasa: number; descripcion: string }[] = [
  { nombre: 'IVA 16%', tasa: 16, descripcion: 'Impuesto al Valor Agregado general' },
  { nombre: 'IVA Frontera 8%', tasa: 8, descripcion: 'IVA región fronteriza norte/sur' },
  { nombre: 'ISH 3%', tasa: 3, descripcion: 'Impuesto Sobre Hospedaje (promedio)' },
  { nombre: 'ISH 2%', tasa: 2, descripcion: 'ISH tasa baja (algunos estados)' },
  { nombre: 'ISH 5%', tasa: 5, descripcion: 'ISH tasa alta (algunos estados)' },
  { nombre: 'Cuota turística', tasa: 1, descripcion: 'Aporte / cuota turística local' },
];

interface FormData {
  fechaCheckin: Date;
  fechaCheckout: Date;
  horaLlegada: string;
  adultos: number;
  ninos: number;
  personasExtra: number;
  cargoPersonaExtra: number;
  tipoHabitacion: string;
  habitacionId: string;
  clienteId: string;
  clienteData: any;
  nuevoCliente: {
    nombre: string;
    apellido_paterno: string;
    apellido_materno: string;
    email: string;
    telefono: string;
    tipo_documento: string;
    numero_documento: string;
  };
  solicitudesEspeciales: string;
  notasInternas: string;
  descuentoTipo: 'none' | 'Monto' | 'Porcentaje';
  descuentoValor: number;
  impuestos: ImpuestoTemp[];
  entregablesSeleccionados: string[];
  cargos: CargoTemp[];
  pagos: PagoTemp[];
}

const hotelToday = () => parseISO(todayLocal());

const createInitialFormData = (preload?: ReservationPreload): FormData => {
  const today = hotelToday();
  return {
    fechaCheckin: preload?.fechaCheckin || today,
    fechaCheckout: preload?.fechaCheckout || addDays(today, 1),
    horaLlegada: '15:00',
    adultos: 2,
    ninos: 0,
    personasExtra: 0,
    cargoPersonaExtra: 0,
    tipoHabitacion: preload?.habitacion?.tipo_habitacion_id || preload?.habitacion?.tipo_id || '',
    habitacionId: preload?.habitacion?.id || '',
    clienteId: '',
    clienteData: null,
    nuevoCliente: {
      nombre: '',
      apellido_paterno: '',
      apellido_materno: '',
      email: '',
      telefono: '',
      tipo_documento: 'INE',
      numero_documento: '',
    },
    solicitudesEspeciales: '',
    notasInternas: '',
    descuentoTipo: 'none',
    descuentoValor: 0,
    impuestos: [],
    entregablesSeleccionados: [],
    cargos: [],
    pagos: [],
  };
};

export function NuevaReservaModal({ open, onOpenChange, preload, onSuccess, pageMode = false }: NuevaReservaModalProps) {
  const [formData, setFormData] = useState<FormData>(createInitialFormData());
  const [crearNuevoCliente, setCrearNuevoCliente] = useState(false);
  const [loading, setLoading] = useState(false);
  const [origen, setOrigen] = useState<'Reserva' | 'Recepcion'>('Reserva');
  const { toast } = useToast();

  const [tiposHabitacion, setTiposHabitacion] = useState<any[]>([]);
  const [habitacionesDisponibles, setHabitacionesDisponibles] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [entregables, setEntregables] = useState<any[]>([]);
  const [conceptosCargo, setConceptosCargo] = useState<any[]>([]);

  const [cargoConcepto, setCargoConcepto] = useState('');
  const [cargoCantidad, setCargoCantidad] = useState('1');
  const [cargoMonto, setCargoMonto] = useState('');

  const [pagoMonto, setPagoMonto] = useState('');
  const [pagoMetodo, setPagoMetodo] = useState('');
  const [metodosPago, setMetodosPago] = useState<any[]>([]);
  const [mostrarSelectorHabitacion, setMostrarSelectorHabitacion] = useState(false);
  const [filtroTipoHabitacion, setFiltroTipoHabitacion] = useState('all');
  const [availabilityStatus, setAvailabilityStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const surfaceRef = useRef<HTMLDivElement>(null);
  const availabilityRequestRef = useRef(0);

  useEffect(() => {
    if (open) {
      cargarDatos();
      loadTemporadas().catch(() => {});
      setOrigen(preload?.origen || 'Reserva');
      setCrearNuevoCliente(false);
      setMostrarSelectorHabitacion(!preload?.habitacion?.id);
      setFiltroTipoHabitacion('all');
      setAvailabilityStatus('idle');
      setPagoMonto('');
      setFormData(createInitialFormData(preload));
    }
  }, [open, preload]);

  useEffect(() => {
    if (!formData.habitacionId) setMostrarSelectorHabitacion(true);
  }, [formData.habitacionId]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      surfaceRef.current?.querySelector<HTMLElement>('[data-reservation-focus="checkin"]:not([disabled]), [data-reservation-focus="checkout"]')?.focus();
    }, 80);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    // El costo por persona extra viene de `tipos_habitacion.precio_persona_extra`.
    if (!open) return;
    const tipoId = formData.tipoHabitacion;
    if (!tipoId) return;

    const tipo = tiposHabitacion.find((t) => t.id === tipoId);
    if (!tipo) return;

    const precioPersonaExtra = Number(tipo.precio_persona_extra) || 0;
    setFormData((prev) => {
      if (prev.tipoHabitacion !== tipoId) return prev;
      if (prev.cargoPersonaExtra === precioPersonaExtra) return prev;
      return { ...prev, cargoPersonaExtra: precioPersonaExtra };
    });
  }, [open, formData.tipoHabitacion, tiposHabitacion]);

  // Prellena los impuestos configurados por defecto (habitación → tipo → hotel).
  useEffect(() => {
    if (!open) return;
    const defaults = resolveImpuestosDefault(
      formData.tipoHabitacion,
      formData.habitacionId,
    );
    setFormData((prev) => ({
      ...prev,
      impuestos: defaults.map((d, i) => ({
        id: `def-${Date.now()}-${i}`,
        nombre: d.nombre,
        tasa: Number(d.tasa) || 0,
      })),
    }));
  }, [open, formData.tipoHabitacion, formData.habitacionId]);

  const cargarDatos = async () => {
    try {
      const [tiposData, entregablesData, conceptosData, clientesData, metodosData] = await Promise.all([
        api.getTiposHabitacion(),
        api.getEntregables?.() || Promise.resolve([]),
        api.getConceptosCargo?.() || Promise.resolve([]),
        api.getClientes?.() || Promise.resolve([]),
        api.getMetodosPago({ soloActivos: true }).catch(() => []),
      ]);
      setTiposHabitacion(tiposData);
      setEntregables(entregablesData);
      setConceptosCargo(conceptosData);
      setClientes(Array.isArray(clientesData) ? clientesData : []);
      const paymentMethods = Array.isArray(metodosData) ? metodosData : [];
      setMetodosPago(paymentMethods);
      setPagoMetodo((current) => paymentMethods.some((method: any) => method.nombre === current)
        ? current
        : paymentMethods[0]?.nombre || '');
    } catch (error) {
      console.error('Error cargando datos:', error);
    }
  };

  const buscarHabitaciones = async () => {
    const requestId = ++availabilityRequestRef.current;
    setAvailabilityStatus('loading');
    const applyAvailability = (rooms: any[]) => {
      if (requestId !== availabilityRequestRef.current) return;
      const availableRooms = (Array.isArray(rooms) ? rooms : []).filter((room: any) => {
        if (origen !== 'Recepcion') return true;
        const cleaning = String(room.estado_limpieza || 'Limpia').toLowerCase();
        const maintenance = String(room.estado_mantenimiento || 'OK').toLowerCase();
        return room.estado_habitacion === 'Disponible' && cleaning === 'limpia' && maintenance === 'ok';
      });
      setHabitacionesDisponibles(availableRooms);
      setAvailabilityStatus('ready');
      setFormData((prev) => (
        prev.habitacionId && !availableRooms.some((room) => room.id === prev.habitacionId)
          ? { ...prev, habitacionId: '' }
          : prev
      ));
    };
    try {
      const checkin = format(formData.fechaCheckin, 'yyyy-MM-dd');
      const checkout = format(formData.fechaCheckout, 'yyyy-MM-dd');
      const data = await api.getHabitacionesDisponibles(checkin, checkout);
      applyAvailability(data);
    } catch (error) {
      if (requestId !== availabilityRequestRef.current) return;
      console.error('No se pudo validar la disponibilidad:', error);
      setHabitacionesDisponibles([]);
      setAvailabilityStatus('error');
    }
  };

  useEffect(() => {
    if (!open || differenceInCalendarDays(formData.fechaCheckout, formData.fechaCheckin) < 1) return;
    const timer = window.setTimeout(() => {
      void buscarHabitaciones();
    }, 180);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, origen, formData.fechaCheckin, formData.fechaCheckout]);

  const handleSelectCliente = (cliente: any) => {
    setFormData({ ...formData, clienteId: cliente.id, clienteData: cliente });
  };

  const handleSelectRoom = (habitacion: any) => {
    setFormData({
      ...formData,
      habitacionId: habitacion.id,
      tipoHabitacion: habitacion.tipo_habitacion_id || habitacion.tipo_id || formData.tipoHabitacion,
    });
  };

  const handleClearCliente = () => {
    setFormData({ ...formData, clienteId: '', clienteData: null });
  };

  // Cálculos
  const noches = Math.max(0, differenceInCalendarDays(formData.fechaCheckout, formData.fechaCheckin));
  const nuevoClienteValido = Boolean(
    formData.nuevoCliente.nombre.trim()
    && formData.nuevoCliente.apellido_paterno.trim()
    && formData.nuevoCliente.telefono.trim(),
  );
  const selectedHabitacion = habitacionesDisponibles.find(h => h.id === formData.habitacionId) ||
    (preload?.habitacion?.id === formData.habitacionId ? preload.habitacion : null);
  const selectedTipo = tiposHabitacion.find(t => t.id === formData.tipoHabitacion) ||
    selectedHabitacion?.tipos_habitacion ||
    (selectedHabitacion ? { precio_base: selectedHabitacion.precio_base, nombre: selectedHabitacion.tipo_nombre } : null);

  const tarifaNoche = selectedTipo?.precio_base || 0;
  const tarifasNocturnas = Array.from({ length: noches }, (_, index) => {
    const fecha = format(addDays(formData.fechaCheckin, index), 'yyyy-MM-dd');
    const resolved = resolverPrecioTemporada(
      tarifaNoche,
      fecha,
      formData.tipoHabitacion,
      formData.habitacionId,
    );
    return { fecha, precio: resolved.precio, temporada: resolved.temporada };
  });
  const subtotalHospedaje = tarifasNocturnas.reduce((sum, night) => sum + night.precio, 0);
  // La base actual conserva una tarifa unitaria; el promedio permite que el
  // recálculo transaccional mantenga el total exacto cuando hay varias temporadas.
  const tarifaEfectiva = noches > 0 ? subtotalHospedaje / noches : tarifaNoche;
  const tramosTarifa = tarifasNocturnas.reduce<Array<{
    desde: string;
    hasta: string;
    precio: number;
    noches: number;
    temporada: (typeof tarifasNocturnas)[number]['temporada'];
  }>>((groups, night) => {
    const previous = groups[groups.length - 1];
    if (previous && previous.precio === night.precio && previous.temporada?.id === night.temporada?.id) {
      previous.hasta = night.fecha;
      previous.noches += 1;
      return groups;
    }
    groups.push({ desde: night.fecha, hasta: night.fecha, precio: night.precio, noches: 1, temporada: night.temporada });
    return groups;
  }, []);
  const totalPersonaExtra = formData.personasExtra * formData.cargoPersonaExtra * noches;
  const totalCargosExtras = formData.cargos.reduce((sum, c) => sum + c.total, 0);
  const subtotal = subtotalHospedaje + totalPersonaExtra + totalCargosExtras;

  const impuestosCalculados = formData.impuestos.map((imp) => ({
    ...imp,
    monto: subtotal * ((imp.tasa || 0) / 100),
  }));
  const totalImpuestos = impuestosCalculados.reduce((s, i) => s + i.monto, 0);
  const totalBruto = subtotal + totalImpuestos;

  let descuentoMonto = 0;
  if (formData.descuentoTipo === 'Monto') descuentoMonto = formData.descuentoValor;
  else if (formData.descuentoTipo === 'Porcentaje') descuentoMonto = totalBruto * (formData.descuentoValor / 100);

  const total = Math.max(0, totalBruto - descuentoMonto);
  const totalPagado = formData.pagos.reduce((sum, p) => sum + p.monto, 0);
  const saldoPendiente = total - totalPagado;

  const ocupacionTotal = formData.adultos + formData.ninos;
  const adultosTotales = formData.adultos;
  const tipoDeHabitacion = (room: any) => room?.tipos_habitacion
    || tiposHabitacion.find((item) => item.id === (room?.tipo_habitacion_id || room?.tipo_id));
  const roomReadyForArrival = (room: any) => {
    const cleaning = String(room?.estado_limpieza || 'Limpia').toLowerCase();
    const maintenance = String(room?.estado_mantenimiento || 'OK').toLowerCase();
    return room?.estado_habitacion === 'Disponible' && cleaning === 'limpia' && maintenance === 'ok';
  };
  const roomFitsOccupancy = (room: any) => {
    const type = tipoDeHabitacion(room);
    if (!type) return true;
    const maximum = Number(type.capacidad_maxima) || 0;
    const adults = Number(type.capacidad_adultos) || 0;
    const children = Number(type.capacidad_ninos) || 0;
    return (!maximum || ocupacionTotal <= maximum)
      && (!adults || adultosTotales <= adults)
      && (!children || formData.ninos <= children);
  };
  const habitacionesCompatibles = habitacionesDisponibles.filter((room) => {
    const typeId = room.tipo_habitacion_id || room.tipo_id;
    return (filtroTipoHabitacion === 'all' || typeId === filtroTipoHabitacion) && roomFitsOccupancy(room);
  });
  const selectedRoomFits = !selectedHabitacion || roomFitsOccupancy(selectedHabitacion);
  const capacidadSeleccionada = selectedHabitacion ? tipoDeHabitacion(selectedHabitacion) : selectedTipo;
  const extraGuestError = formData.personasExtra > ocupacionTotal
    ? 'Los huéspedes con recargo no pueden superar la ocupación total'
    : '';
  const capacityError = extraGuestError || (selectedRoomFits ? '' : `La habitación admite máximo ${capacidadSeleccionada?.capacidad_maxima || 'menos'} huésped(es)`);

  const fmt = (n: number) => formatCurrency(n);

  const handleOrigenChange = (nuevoOrigen: 'Reserva' | 'Recepcion') => {
    setOrigen(nuevoOrigen);
    if (nuevoOrigen === 'Recepcion') {
      const hoy = hotelToday();
      const checkoutActual = formData.fechaCheckout;
      const nuevoCheckout = checkoutActual <= hoy ? addDays(hoy, 1) : checkoutActual;
      setFormData({ ...formData, fechaCheckin: hoy, fechaCheckout: nuevoCheckout });
    }
  };

  const handleAgregarCargo = () => {
    if (!cargoConcepto || !cargoMonto) return;
    const concepto = conceptosCargo.find(c => c.id === cargoConcepto);
    const cantidad = parseFloat(cargoCantidad) || 1;
    const precioUnitario = parseFloat(cargoMonto);
    const subtotalCargo = cantidad * precioUnitario;
    const aplicaIva = false;
    const impuestoCargo = 0;

    setFormData(prev => ({
      ...prev,
      cargos: [...prev.cargos, {
        id: `temp-${Date.now()}`,
        concepto_id: cargoConcepto,
        concepto_nombre: concepto?.nombre || 'Cargo',
        cantidad, precio_unitario: precioUnitario, aplica_iva: aplicaIva,
        subtotal: subtotalCargo, impuesto: impuestoCargo, total: subtotalCargo + impuestoCargo,
        notas: '',
      }]
    }));
    setCargoConcepto(''); setCargoCantidad('1'); setCargoMonto('');
  };

  const handleCrearConcepto = async (nombre: string) => {
    try {
      const nuevo = await api.createConceptoCargo({ nombre, precio: 0 });
      setConceptosCargo(prev => [...prev, nuevo]);
      toast({ title: '✅ Concepto creado', description: nombre });
      return { value: nuevo.id, label: nuevo.nombre };
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'No se pudo crear el concepto', variant: 'destructive' });
    }
  };

  const handleAgregarPago = () => {
    const monto = Number(pagoMonto.replace(/[$,\s]/g, ''));
    if (!monto || monto <= 0) {
      toast({ title: 'Importe inválido', description: 'Captura un pago mayor a cero.', variant: 'destructive' });
      return;
    }
    if (!pagoMetodo) {
      toast({ title: 'Falta la forma de pago', description: 'Selecciona un método configurado por el hotel.', variant: 'destructive' });
      return;
    }
    if (monto > saldoPendiente + 0.009) {
      toast({ title: 'El pago supera el saldo', description: `El máximo que puedes registrar es ${formatCurrency(Math.max(0, saldoPendiente))}.`, variant: 'destructive' });
      return;
    }

    setFormData(prev => ({
      ...prev,
      pagos: [...prev.pagos, {
        id: `pago-${Date.now()}`,
        monto,
        metodo_pago: pagoMetodo,
        concepto: origen === 'Recepcion' ? 'Pago check-in' : 'Anticipo',
      }]
    }));
    setPagoMonto('');
  };

  const setPagoRapido = (target: 'half' | 'full') => {
    const amount = target === 'full'
      ? Math.max(0, saldoPendiente)
      : Math.max(0, (total * 0.5) - totalPagado);
    setPagoMonto(amount > 0 ? amount.toFixed(2) : '');
  };

  const clearAdvancePayment = () => {
    setPagoMonto('');
    setFormData((prev) => ({ ...prev, pagos: [] }));
  };

  const handleEliminarPago = (pagoId: string) => {
    setFormData(prev => ({ ...prev, pagos: prev.pagos.filter(p => p.id !== pagoId) }));
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      if (!formData.habitacionId) {
        toast({ title: 'Falta la habitación', description: 'Selecciona una habitación disponible para continuar.', variant: 'destructive' });
        return;
      }
      if (!formData.clienteId && !nuevoClienteValido) {
        toast({
          title: 'Datos incompletos',
          description: 'Nombre, apellido paterno y teléfono son obligatorios para un cliente nuevo.',
          variant: 'destructive',
        });
        return;
      }
      if (noches < 1) {
        toast({ title: 'Fechas inválidas', description: 'El check-out debe ser posterior al check-in.', variant: 'destructive' });
        return;
      }
      if (availabilityStatus === 'error') {
        toast({ title: 'No se confirmó la disponibilidad', description: 'Vuelve a consultar antes de crear la reserva.', variant: 'destructive' });
        return;
      }
      if (capacityError) {
        toast({ title: 'Capacidad excedida', description: capacityError, variant: 'destructive' });
        return;
      }
      if (totalPagado > total + 0.009) {
        toast({ title: 'Revisa los pagos', description: 'Los anticipos no pueden superar el total de la reserva.', variant: 'destructive' });
        return;
      }

      // Última comprobación inmediatamente antes de guardar. El trigger de la
      // base repetirá este candado para cubrir otra reserva creada al mismo tiempo.
      const freshRooms = await api.getHabitacionesDisponibles(
        format(formData.fechaCheckin, 'yyyy-MM-dd'),
        format(formData.fechaCheckout, 'yyyy-MM-dd'),
      );
      const freshRoom = (freshRooms || []).find((room: any) => room.id === formData.habitacionId);
      if (!freshRoom) {
        setFormData((prev) => ({ ...prev, habitacionId: '' }));
        setMostrarSelectorHabitacion(true);
        void buscarHabitaciones();
        toast({ title: 'La habitación acaba de ocuparse', description: 'Elige otra opción disponible; no se creó la reserva.', variant: 'destructive' });
        return;
      }
      if (origen === 'Recepcion' && !roomReadyForArrival(freshRoom)) {
        void buscarHabitaciones();
        toast({ title: 'La habitación ya no está lista', description: 'Revisa limpieza o mantenimiento y elige una habitación disponible.', variant: 'destructive' });
        return;
      }
      if (!roomFitsOccupancy(freshRoom)) {
        toast({ title: 'La ocupación excede la capacidad', description: 'Elige una habitación con mayor capacidad.', variant: 'destructive' });
        return;
      }
      const notasCombinadas = [formData.solicitudesEspeciales, formData.notasInternas]
        .filter(Boolean)
        .join('\n---\n');
      const reservaData = {
        cliente_id: formData.clienteId || null,
        habitacion_id: formData.habitacionId || null,
        tipo_habitacion_id: formData.tipoHabitacion || null,
        fecha_checkin: format(formData.fechaCheckin, 'yyyy-MM-dd'),
        fecha_checkout: format(formData.fechaCheckout, 'yyyy-MM-dd'),
        hora_llegada: formData.horaLlegada || null,
        adultos: formData.adultos,
        ninos: formData.ninos,
        noches,
        tarifa_noche: tarifaEfectiva,
        personas_extra: formData.personasExtra,
        cargo_persona_extra: formData.cargoPersonaExtra,
        descuento: descuentoMonto,
        descuento_tipo: formData.descuentoTipo === 'none' ? '' : formData.descuentoTipo,
        descuento_valor: formData.descuentoTipo === 'none' ? 0 : Number(formData.descuentoValor) || 0,
        total_impuestos: totalImpuestos,
        solicitudes_especiales: formData.solicitudesEspeciales,
        notas: notasCombinadas || null,
        notas_internas: formData.notasInternas || null,
        origen,
      };

      const reserva = await api.createReservationBundle({
        reserva: reservaData,
        cliente: formData.clienteId ? undefined : formData.nuevoCliente,
        cargos: formData.cargos.map((cargo) => ({
          concepto_id: cargo.concepto_id,
          concepto: cargo.concepto_nombre,
          cantidad: cargo.cantidad,
          precio_unitario: cargo.precio_unitario,
          impuesto: cargo.impuesto,
          notas: cargo.notas,
        })),
        pagos: formData.pagos.map((pago) => ({
          monto: pago.monto,
          metodo_pago: pago.metodo_pago,
          concepto: pago.concepto,
        })),
        entregables: formData.entregablesSeleccionados.map((entregableId) => ({
          entregable_id: entregableId,
          cantidad: 1,
        })),
        checkin: origen === 'Recepcion',
      });

      toast({
        title: origen === 'Recepcion' ? '✅ Check-in completado' : '✅ Reserva creada',
        description: `Habitación ${selectedHabitacion?.numero} - ${formData.clienteData?.nombre || formData.nuevoCliente.nombre}`,
      });

      try {
        const telefono = formData.clienteData?.telefono || formData.nuevoCliente.telefono;
        const nombreCli = formData.clienteData?.nombre || formData.nuevoCliente.nombre || '';
        const isCheckin = origen === 'Recepcion';
        await enviarWhatsAppReserva({
          hotel_id: reserva.hotel_id,
          telefono,
          reserva_id: reserva.id,
          template_key: isCheckin ? 'bienvenida_checkin' : 'confirmacion_reserva',
          mensajeFallback: isCheckin ? MENSAJES_DEFAULT.bienvenida_checkin : MENSAJES_DEFAULT.confirmacion_reserva,
          vars: {
            nombre: nombreCli,
            numero_reserva: reserva.numero_reserva || '',
            tipo_habitacion: selectedHabitacion?.tipo_habitacion?.nombre || '',
            habitacion: selectedHabitacion?.numero || '',
            fecha_checkin: formatDate(formData.fechaCheckin),
            fecha_checkout: formatDate(formData.fechaCheckout),
            noches,
            total: formatCurrency(total),
          },
        });
      } catch (err) {
        console.warn('WhatsApp confirmación falló:', err);
      }

      if (!pageMode) onOpenChange(false);
      onSuccess?.(reserva);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const toggleEntregable = (id: string) => {
    setFormData(prev => ({
      ...prev,
      entregablesSeleccionados: prev.entregablesSeleccionados.includes(id)
        ? prev.entregablesSeleccionados.filter(e => e !== id)
        : [...prev.entregablesSeleccionados, id]
    }));
  };

  const handleSurfaceKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.defaultPrevented || event.nativeEvent.isComposing) return;
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      if (puedeGuardar) void handleConfirm();
    }
  };

  const validationIssues = [
    noches < 1 ? { key: 'dates', label: 'Corrige las fechas' } : null,
    availabilityStatus === 'error'
      ? { key: 'room', label: 'Reintenta disponibilidad' }
      : !formData.habitacionId ? { key: 'room', label: 'Elige habitación' } : null,
    capacityError ? { key: 'occupancy', label: 'Corrige la ocupación' } : null,
    !formData.clienteId && !nuevoClienteValido ? { key: 'guest', label: 'Completa el huésped' } : null,
  ].filter((issue): issue is { key: string; label: string } => Boolean(issue));
  const puedeGuardar = !loading && availabilityStatus === 'ready' && validationIssues.length === 0;

  const focusReservationField = (key: string) => {
    const target = surfaceRef.current?.querySelector<HTMLElement>(`[data-reservation-field="${key}"]`);
    if (!target) return;
    if (key === 'room' && availabilityStatus === 'error') void buscarHabitaciones();
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => {
      target.querySelector<HTMLElement>('input:not([disabled]), button:not([disabled]), textarea:not([disabled]), [role="combobox"]')?.focus();
    }, 250);
  };

  const rateOf = (hab: any) => {
    const tipo = tiposHabitacion.find((item) => item.id === (hab.tipo_habitacion_id || hab.tipo_id));
    const roomRate = Number(hab.precio_base) || 0;
    return roomRate > 0 ? roomRate : Number(tipo?.precio_base) || 0;
  };

  return (
    <ReservationSurface pageMode={pageMode} open={open} onClose={() => onOpenChange(false)} surfaceRef={surfaceRef} onKeyDown={handleSurfaceKeyDown}>
      {!pageMode && (
        <DialogHeader className="sr-only">
          <DialogTitle>{origen === 'Recepcion' ? 'Nueva entrada' : 'Nueva reserva'}</DialogTitle>
          <DialogDescription>Captura completa en una sola vista</DialogDescription>
        </DialogHeader>
      )}

      {/* ENCABEZADO COMPACTO */}
      <header className="flex shrink-0 items-center justify-between gap-2 pb-2">
        <div className="flex min-w-0 items-center gap-2">
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => onOpenChange(false)} aria-label="Cerrar">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <p className="truncate text-[11px] text-muted-foreground">
            {noches > 0 ? `${noches} noche${noches === 1 ? '' : 's'} · ${formatDate(formData.fechaCheckin)} → ${formatDate(formData.fechaCheckout)}` : 'Selecciona fechas'}
            {selectedHabitacion ? ` · Hab. #${selectedHabitacion.numero}` : ''}
            {` · ${formData.adultos + formData.ninos} huésped(es)`}
            {total > 0 ? ` · ${fmt(total)}` : ''}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1 rounded-full bg-muted p-0.5">
          {([['Reserva', CalendarPlus], ['Recepcion', UserPlus]] as const).map(([value, Icon]) => (
              <button
                key={value}
                type="button"
                aria-label={value === 'Reserva' ? 'Crear reserva futura' : 'Registrar entrada hoy'}
                data-step-focus={value === 'Reserva' ? 'dates' : undefined}
              onClick={() => handleOrigenChange(value)}
              className={cn(
                'flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors',
                origen === value ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="h-3 w-3" />
                <span className="hidden sm:inline">{value === 'Reserva' ? 'Reserva futura' : 'Entrada hoy'}</span>
            </button>
          ))}
        </div>
      </header>

      {/* LAYOUT A TODO EL ANCHO */}
      <div className="grid items-start gap-3 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:grid-cols-[minmax(0,1fr)_minmax(300px,340px)]">

        <div className="grid min-w-0 content-start gap-x-8 gap-y-5 rounded-xl border border-border bg-card p-4 shadow-sm lg:grid-cols-2 lg:p-5">



        {/* COLUMNA 1 — Estancia, ocupación y habitación */}
        <div className="min-w-0 space-y-5">
          <FormSection fieldKey="dates" icon={CalendarDays} title="Estancia" hint="Fechas y hora de llegada.">
            {origen === 'Recepcion' && (
              <div className="rounded-lg border border-[#FDBA74] bg-[#FFF7ED] px-2.5 py-1.5 text-[11px] text-[#9A3412]">
                Check-in automático: la habitación queda ocupada hoy.
              </div>
            )}
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_140px]">
              <Field label="Check-in">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button data-reservation-focus="checkin" variant="outline" className="h-9 w-full justify-start px-2.5 text-xs font-normal" disabled={origen === 'Recepcion'}>
                      <CalendarDays className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                      {formatDate(formData.fechaCheckin)}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" locale={es} selected={formData.fechaCheckin} onSelect={(d) => d && setFormData({ ...formData, fechaCheckin: d, fechaCheckout: d >= formData.fechaCheckout ? addDays(d, 1) : formData.fechaCheckout })} disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))} />
                  </PopoverContent>
                </Popover>
              </Field>
              <Field label="Check-out">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button data-reservation-focus="checkout" variant="outline" className="h-9 w-full justify-start px-2.5 text-xs font-normal">
                      <CalendarDays className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                      {formatDate(formData.fechaCheckout)}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" locale={es} selected={formData.fechaCheckout} onSelect={(d) => d && setFormData({ ...formData, fechaCheckout: d })} disabled={(d) => d <= formData.fechaCheckin} />
                  </PopoverContent>
                </Popover>
              </Field>
              <Field label="Hora">
                <div className="relative">
                  <Clock className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input type="time" className="h-9 w-full pl-8 pr-1 text-xs" value={formData.horaLlegada} onChange={(e) => setFormData({ ...formData, horaLlegada: e.target.value })} />
                </div>
              </Field>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[1, 2, 3, 7].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setFormData({ ...formData, fechaCheckout: addDays(formData.fechaCheckin, n) })}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-[11px] transition-colors',
                    noches === n ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:border-primary/40',
                  )}
                >
                  {n} noche{n === 1 ? '' : 's'}
                </button>
              ))}
            </div>
          </FormSection>

          <FormSection fieldKey="occupancy" icon={Users} title="Ocupación" hint="Adultos y niños son el total; “con recargo” sólo define a quién se cobra extra.">
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <Field label="Adultos">
                <Stepper min={1} value={formData.adultos} onChange={(v) => setFormData({ ...formData, adultos: v })} />
              </Field>
              <Field label="Niños">
                <Stepper min={0} value={formData.ninos} onChange={(v) => setFormData({ ...formData, ninos: v })} />
              </Field>
              <Field label="Con recargo">
                <Stepper min={0} value={formData.personasExtra} onChange={(v) => setFormData({ ...formData, personasExtra: v })} />
              </Field>
              <Field label="Cargo p/extra" hint={formData.personasExtra > 0 ? `${fmt(totalPersonaExtra)} por ${noches} noche(s)` : 'Por persona, por noche'}>
                <div className="relative">
                  <DollarSign className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input type="number" min={0} inputMode="decimal" className="h-9 pl-8 text-xs" value={formData.cargoPersonaExtra} onChange={(e) => setFormData({ ...formData, cargoPersonaExtra: parseFloat(e.target.value) || 0 })} disabled={formData.personasExtra === 0} />
                </div>
              </Field>
            </div>
          </FormSection>

          <FormSection fieldKey="room" icon={BedDouble} title="Habitación" hint={mostrarSelectorHabitacion ? `${habitacionesCompatibles.length} compatibles y libres en el rango.` : 'Habitación asignada a esta reserva.'}>
            {!mostrarSelectorHabitacion && selectedHabitacion ? (
              <div className="flex items-center gap-3 rounded-lg border border-border bg-muted p-2.5">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
                  <BedDouble className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">#{selectedHabitacion.numero}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {selectedHabitacion.tipo_nombre || tiposHabitacion.find((item) => item.id === (selectedHabitacion.tipo_habitacion_id || selectedHabitacion.tipo_id))?.nombre || 'Sin categoría'}
                    {' · '}{fmt(rateOf(selectedHabitacion))}/noche
                    {capacidadSeleccionada?.capacidad_maxima ? ` · ${ocupacionTotal}/${capacidadSeleccionada.capacidad_maxima} huéspedes` : ''}
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" className="h-8 shrink-0 px-2.5 text-xs" onClick={() => setMostrarSelectorHabitacion(true)}>
                  Cambiar
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid gap-2 sm:grid-cols-[170px_minmax(0,1fr)]">
                  <Select value={filtroTipoHabitacion} onValueChange={setFiltroTipoHabitacion}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las categorías</SelectItem>
                      {tiposHabitacion.map((type) => <SelectItem key={type.id} value={type.id}>{type.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {availabilityStatus === 'loading' ? (
                    <div className="flex h-9 items-center gap-2 rounded-md border border-input px-3 text-xs text-muted-foreground"><RefreshCw className="h-3.5 w-3.5 animate-spin" />Validando disponibilidad…</div>
                  ) : availabilityStatus === 'error' ? (
                    <Button type="button" variant="outline" className="h-9 justify-start border-amber-300 text-xs text-amber-800 dark:border-amber-700 dark:text-amber-300" onClick={() => void buscarHabitaciones()}>
                      <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />No se pudo validar · Reintentar
                    </Button>
                  ) : (
                    <ComboboxCreatable
                      options={habitacionesCompatibles.map((hab) => {
                        const type = tipoDeHabitacion(hab);
                        const floor = hab.piso ? ` · Piso ${hab.piso}` : '';
                        return { value: hab.id, label: `#${hab.numero} · ${type?.nombre || hab.tipo_nombre || 'Sin categoría'}${floor} · ${fmt(rateOf(hab))}/noche` };
                      })}
                      value={formData.habitacionId}
                      onValueChange={(value) => {
                        const room = habitacionesDisponibles.find((item) => item.id === value);
                        if (room) { handleSelectRoom(room); setMostrarSelectorHabitacion(false); }
                      }}
                      placeholder={habitacionesCompatibles.length ? 'Buscar y elegir habitación…' : 'Sin habitaciones compatibles'}
                      searchPlaceholder="Número, categoría, piso o precio…"
                      emptyMessage="No hay habitaciones libres con esa capacidad."
                      disabled={habitacionesCompatibles.length === 0}
                      autoOpenOnFocus
                      className="h-9 justify-start overflow-hidden px-2.5 text-left text-xs font-normal"
                    />
                  )}
                </div>

                {availabilityStatus === 'ready' && habitacionesCompatibles.length === 0 && (
                  <p className="rounded-lg border border-dashed border-amber-300 bg-amber-50 px-3 py-2 text-[11px] text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                    {habitacionesDisponibles.length === 0
                      ? 'No hay habitaciones libres en esas fechas.'
                      : `No hay habitaciones con capacidad para ${ocupacionTotal} huésped(es).`}
                  </p>
                )}
              </div>
            )}
            {capacityError && <p className="flex items-center gap-1.5 text-[11px] font-medium text-destructive"><AlertTriangle className="h-3.5 w-3.5" />{capacityError}</p>}
            {selectedHabitacion && tramosTarifa.length > 1 && (
              <Badge variant="outline" className="h-5 w-fit px-1.5 text-[10px]">{tramosTarifa.length} tarifas durante la estancia</Badge>
            )}
          </FormSection>
        </div>

        {/* COLUMNA 2 — Huésped, cargos, notas e impuestos */}
        <div className="min-w-0 space-y-5 border-t border-border pt-5 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
          <FormSection fieldKey="guest" icon={UserPlus} title="Huésped" hint="Busca existente o captura uno nuevo.">
            {!crearNuevoCliente ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <ComboboxCreatable
                    options={clientes.map((cliente) => ({
                      value: cliente.id,
                      label: `${cliente.nombre || ''} ${cliente.apellido_paterno || ''} ${cliente.apellido_materno || ''}${cliente.telefono ? ` · ${cliente.telefono}` : cliente.email ? ` · ${cliente.email}` : ''}`.trim(),
                    }))}
                    value={formData.clienteId}
                    onValueChange={(value) => {
                      const client = clientes.find((item) => item.id === value);
                      if (client) handleSelectCliente(client);
                    }}
                    placeholder="Buscar huésped…"
                    searchPlaceholder="Nombre, teléfono, correo o documento…"
                    emptyMessage="No se encontró ningún huésped."
                    autoOpenOnFocus
                    className="h-9 min-w-0 flex-1 justify-start overflow-hidden px-2.5 text-left text-xs font-normal"
                  />
                  {formData.clienteData ? (
                    <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={handleClearCliente} aria-label="Quitar huésped"><X className="h-4 w-4" /></Button>
                  ) : (
                    <Button type="button" variant="outline" className="h-9 shrink-0 px-2.5 text-xs" onClick={() => setCrearNuevoCliente(true)}><UserPlus className="mr-1 h-3.5 w-3.5" />Nuevo</Button>
                  )}
                </div>
                {formData.clienteData && (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-muted px-2.5 py-1.5 text-[11px] text-muted-foreground">
                    <span className="font-medium text-foreground">{formData.clienteData.nombre} {formData.clienteData.apellido_paterno || ''}</span>
                    {formData.clienteData.telefono && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{formData.clienteData.telefono}</span>}
                    {formData.clienteData.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{formData.clienteData.email}</span>}
                    {formData.clienteData.es_vip && <Badge className="h-4 px-1 text-[10px]">VIP</Badge>}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Button variant="ghost" size="sm" className="-ml-2 h-7 text-xs" onClick={() => setCrearNuevoCliente(false)}>
                  <ChevronLeft className="mr-1 h-3.5 w-3.5" /> Buscar existente
                </Button>
                <div className="grid gap-2 sm:grid-cols-3">
                  <Field label="Nombre" required>
                    <Input data-new-client-name className="h-9 text-xs" value={formData.nuevoCliente.nombre} onChange={(e) => setFormData({ ...formData, nuevoCliente: { ...formData.nuevoCliente, nombre: e.target.value } })} />
                  </Field>
                  <Field label="Apellido paterno" required>
                    <Input className="h-9 text-xs" value={formData.nuevoCliente.apellido_paterno} onChange={(e) => setFormData({ ...formData, nuevoCliente: { ...formData.nuevoCliente, apellido_paterno: e.target.value } })} />
                  </Field>
                  <Field label="Apellido materno">
                    <Input className="h-9 text-xs" value={formData.nuevoCliente.apellido_materno} onChange={(e) => setFormData({ ...formData, nuevoCliente: { ...formData.nuevoCliente, apellido_materno: e.target.value } })} />
                  </Field>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Field label="Teléfono" required>
                    <div className="relative">
                      <Phone className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input className="h-9 pl-8 text-xs" inputMode="tel" value={formData.nuevoCliente.telefono} onChange={(e) => setFormData({ ...formData, nuevoCliente: { ...formData.nuevoCliente, telefono: e.target.value } })} />
                    </div>
                  </Field>
                  <Field label="Correo">
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input type="email" className="h-9 pl-8 text-xs" value={formData.nuevoCliente.email} onChange={(e) => setFormData({ ...formData, nuevoCliente: { ...formData.nuevoCliente, email: e.target.value } })} />
                    </div>
                  </Field>
                </div>
                <details className="group rounded-lg border border-dashed border-border px-2.5 py-1.5">
                  <summary className="cursor-pointer list-none text-[11px] font-medium text-muted-foreground group-open:mb-2">+ Documento de identidad (opcional)</summary>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Field label="Documento">
                      <Select value={formData.nuevoCliente.tipo_documento} onValueChange={(v) => setFormData({ ...formData, nuevoCliente: { ...formData.nuevoCliente, tipo_documento: v } })}>
                        <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="INE">INE</SelectItem>
                          <SelectItem value="Pasaporte">Pasaporte</SelectItem>
                          <SelectItem value="Licencia">Licencia</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Número">
                      <Input className="h-9 text-xs" value={formData.nuevoCliente.numero_documento} onChange={(e) => setFormData({ ...formData, nuevoCliente: { ...formData.nuevoCliente, numero_documento: e.target.value } })} />
                    </Field>
                  </div>
                </details>
              </div>
            )}
          </FormSection>

          <FormSection icon={Receipt} title="Cargos adicionales" hint="Consumos o servicios anticipados.">
            <div className="grid grid-cols-[minmax(120px,1fr)_64px_100px_36px] gap-1.5">
              <ComboboxCreatable
                options={conceptosCargo.map(c => ({ value: c.id, label: c.nombre }))}
                value={cargoConcepto}
                onValueChange={(v) => {
                  setCargoConcepto(v);
                  const c = conceptosCargo.find(x => x.id === v);
                  if (c?.precio) setCargoMonto(c.precio.toString());
                }}
                onCreate={handleCrearConcepto}
                placeholder="Concepto…"
                searchPlaceholder="Buscar o crear concepto…"
                createLabel="Crear"
                className="h-9 justify-start px-2.5 text-left text-xs font-normal"
              />
              <Input className="h-9 px-1.5 text-center text-xs" type="number" min={1} inputMode="numeric" placeholder="Cant" value={cargoCantidad} onChange={(e) => setCargoCantidad(e.target.value)} />
              <Input className="h-9 px-1.5 text-right text-xs" type="number" inputMode="decimal" placeholder="$0" value={cargoMonto} onChange={(e) => setCargoMonto(e.target.value)} />
              <Button type="button" className="h-9 w-9 px-0" onClick={handleAgregarCargo} disabled={!cargoConcepto} aria-label="Agregar cargo"><Plus className="h-4 w-4" /></Button>
            </div>
            {formData.cargos.length > 0 && (
              <div className="divide-y rounded-lg border">
                {formData.cargos.map(c => (
                  <div key={c.id} className="flex items-center justify-between gap-2 px-2.5 py-1.5 text-xs">
                    <span className="min-w-0 truncate">{c.concepto_nombre} <span className="text-muted-foreground">×{c.cantidad}</span></span>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span className="font-medium tabular-nums">{formatCurrency(c.total)}</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setFormData(p => ({ ...p, cargos: p.cargos.filter(x => x.id !== c.id) }))}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </FormSection>

        </div>

        <div className="border-t border-border pt-4 lg:col-span-2">
          <FormSection icon={StickyNote} title="Opcionales" hint="Notas, impuestos y entregables en una sola franja compacta.">
            <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(280px,0.9fr)]">
              <Field label="Solicitudes del huésped">
                <Textarea rows={2} className="h-12 min-h-12 resize-none text-xs" value={formData.solicitudesEspeciales} onChange={(e) => setFormData({ ...formData, solicitudesEspeciales: e.target.value })} placeholder="Cuna, piso alto, llegada tarde…" />
              </Field>
              <Field label="Notas internas">
                <Textarea rows={2} className="h-12 min-h-12 resize-none text-xs" value={formData.notasInternas} onChange={(e) => setFormData({ ...formData, notasInternas: e.target.value })} placeholder="Solo visible para el equipo…" />
              </Field>
              <div className="space-y-1.5 rounded-lg border border-border bg-muted/30 p-2">
                <div className="flex items-center justify-between gap-2">
                  <Label className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground"><Percent className="h-3 w-3" />Impuestos</Label>
                  <span className="text-[11px] font-semibold tabular-nums">{fmt(totalImpuestos)}</span>
                </div>
                <Select value="" onValueChange={(value) => {
                  const sugerido = IMPUESTOS_MEXICO_SUGERIDOS.find((item) => item.nombre === value);
                  const nuevo = sugerido
                    ? { id: `imp-${Date.now()}`, nombre: sugerido.nombre, tasa: sugerido.tasa }
                    : { id: `imp-${Date.now()}`, nombre: 'Impuesto', tasa: 0 };
                  setFormData((p) => ({ ...p, impuestos: [...p.impuestos, nuevo] }));
                }}>
                  <SelectTrigger className="h-8 bg-background text-xs"><SelectValue placeholder="+ Agregar impuesto" /></SelectTrigger>
                  <SelectContent>
                    {IMPUESTOS_MEXICO_SUGERIDOS.filter((s) => !formData.impuestos.some((i) => i.nombre === s.nombre)).map((sug) => (
                      <SelectItem key={sug.nombre} value={sug.nombre}>{sug.nombre}</SelectItem>
                    ))}
                    <SelectItem value="__custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
                {formData.impuestos.map((imp) => (
                  <div key={imp.id} className="grid grid-cols-[minmax(0,1fr)_64px_28px] items-center gap-1">
                    <Input className="h-7 min-w-0 px-2 text-[11px]" value={imp.nombre} onChange={(e) => setFormData((p) => ({ ...p, impuestos: p.impuestos.map((x) => x.id === imp.id ? { ...x, nombre: e.target.value } : x) }))} />
                    <div className="relative">
                      <Input type="number" min="0" step="0.01" className="h-7 pr-5 text-right text-[11px]" value={imp.tasa} onChange={(e) => setFormData((p) => ({ ...p, impuestos: p.impuestos.map((x) => x.id === imp.id ? { ...x, tasa: parseFloat(e.target.value) || 0 } : x) }))} />
                      <Percent className="pointer-events-none absolute right-1.5 top-1/2 h-2.5 w-2.5 -translate-y-1/2 text-muted-foreground" />
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setFormData((p) => ({ ...p, impuestos: p.impuestos.filter((x) => x.id !== imp.id) }))}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                  </div>
                ))}
                {formData.impuestos.length === 0 && <p className="text-center text-[10px] text-muted-foreground">Sin impuestos aplicados</p>}
              </div>
            </div>
            {origen === 'Recepcion' && entregables.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-muted-foreground">Entregables al huésped</Label>
                <div className="flex flex-wrap gap-1.5">
                  {entregables.map(ent => {
                    const activo = formData.entregablesSeleccionados.includes(ent.id);
                    return (
                      <button key={ent.id} type="button" onClick={() => toggleEntregable(ent.id)} className={cn('flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-colors', activo ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:border-primary/40')}>
                        {activo && <Check className="h-3 w-3" />}{ent.nombre}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </FormSection>
        </div>
        </div>

        {/* RESUMEN DE CUENTA */}
        <aside className="min-w-0 xl:sticky xl:top-0 xl:self-start">
          <div className="overflow-hidden rounded-xl bg-[#10233F] text-white shadow-lg">
            <div className="space-y-2 p-3">
              <p className="text-xs font-semibold">Resumen de cuenta</p>

              <div className="space-y-1 text-xs">
                <Line label={`Hospedaje · ${noches || 0} noche${noches === 1 ? '' : 's'}`} value={fmt(subtotalHospedaje)} />
                {tramosTarifa.map((rate, index) => (rate.temporada || tramosTarifa.length > 1) && (
                  <Line
                    key={`${rate.desde}-${rate.precio}-${index}`}
                    small
                    label={`${format(parseISO(rate.desde), 'd MMM', { locale: es })}${rate.noches > 1 ? `–${format(parseISO(rate.hasta), 'd MMM', { locale: es })}` : ''}${rate.temporada ? ` · ${rate.temporada.nombre} (${describirAjuste(rate.temporada)})` : ''}`}
                    value={`${rate.noches} × ${fmt(rate.precio)}`}
                  />
                ))}
                {totalPersonaExtra > 0 && <Line label={`Personas extra (${formData.personasExtra})`} value={fmt(totalPersonaExtra)} />}
                {totalCargosExtras > 0 && <Line label={`Cargos extras (${formData.cargos.length})`} value={fmt(totalCargosExtras)} />}
                {impuestosCalculados.map((imp) => imp.monto > 0 && <Line key={imp.id} label={`${imp.nombre} (${imp.tasa}%)`} value={fmt(imp.monto)} />)}
                {descuentoMonto > 0 && <Line accent label={`Descuento${formData.descuentoTipo === 'Porcentaje' ? ` (${formData.descuentoValor}%)` : ''}`} value={`−${fmt(descuentoMonto)}`} />}
              </div>

              <Separator className="bg-white/20" />

              <div className="space-y-1.5 rounded-lg bg-white/10 p-2.5">
                <Label className="flex items-center gap-1.5 text-[11px] text-white/80"><Percent className="h-3 w-3" />Descuento</Label>
                <div className="flex gap-1.5">
                  <Select value={formData.descuentoTipo} onValueChange={(v) => setFormData({ ...formData, descuentoTipo: v as 'none' | 'Monto' | 'Porcentaje', descuentoValor: 0 })}>
                    <SelectTrigger className="h-9 w-28 border-input bg-background text-xs text-foreground"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Ninguno</SelectItem>
                      <SelectItem value="Monto">Monto</SelectItem>
                      <SelectItem value="Porcentaje">%</SelectItem>
                    </SelectContent>
                  </Select>
                  {formData.descuentoTipo !== 'none' && (
                    <div className="relative flex-1">
                      {formData.descuentoTipo === 'Porcentaje'
                        ? <Percent className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        : <DollarSign className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />}
                      <Input type="number" className="h-9 border-input bg-background pl-8 text-xs text-foreground" value={formData.descuentoValor} onChange={(e) => setFormData({ ...formData, descuentoValor: parseFloat(e.target.value) || 0 })} />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-end justify-between">
                <span className="text-xs font-medium">Total</span>
                <span className="text-xl font-bold tabular-nums">{fmt(total)}</span>
              </div>

              <Separator className="bg-white/20" />

              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label className="flex items-center gap-1.5 text-[11px] text-white/80"><CreditCard className="h-3 w-3" />Anticipo</Label>
                  <div className="flex items-center gap-1">
                    <button type="button" className="rounded px-1.5 py-0.5 text-[10px] text-white/70 hover:bg-white/10 hover:text-white" onClick={clearAdvancePayment}>Sin anticipo</button>
                    <button type="button" className="rounded px-1.5 py-0.5 text-[10px] text-white/70 hover:bg-white/10 hover:text-white" onClick={() => setPagoRapido('half')}>50%</button>
                    <button type="button" className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white hover:bg-white/20" onClick={() => setPagoRapido('full')}>Liquidar</button>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <div className="relative min-w-0 flex-1">
                    <DollarSign className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="text"
                      inputMode="decimal"
                      aria-label="Importe del anticipo"
                      placeholder={saldoPendiente > 0 ? saldoPendiente.toFixed(2) : '0.00'}
                      className="h-9 border-input bg-background pl-8 text-right text-xs tabular-nums text-foreground"
                      value={pagoMonto}
                      onChange={(e) => {
                        const value = e.target.value.replace(',', '.').replace(/[^0-9.]/g, '');
                        if (/^\d*(\.\d{0,2})?$/.test(value)) setPagoMonto(value);
                      }}
                      onBlur={() => { if (pagoMonto) setPagoMonto(Number(pagoMonto).toFixed(2)); }}
                    />
                  </div>
                  <Select value={pagoMetodo} onValueChange={setPagoMetodo}>
                    <SelectTrigger className="h-9 w-28 border-input bg-background text-xs text-foreground" disabled={metodosPago.length === 0}><SelectValue placeholder="Método" /></SelectTrigger>
                    <SelectContent>
                      {metodosPago.map((method) => <SelectItem key={method.id} value={method.nombre}>{method.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="secondary" className="h-9 w-9 px-0" onClick={handleAgregarPago} disabled={!pagoMonto || !pagoMetodo} aria-label="Agregar anticipo"><Plus className="h-4 w-4" /></Button>
                </div>
                {metodosPago.length === 0 && <p className="text-[10px] text-amber-200">Configura al menos una forma de pago en Catálogos.</p>}
                {formData.pagos.length > 0 && (
                  <div className="space-y-1">
                    {formData.pagos.map(p => (
                      <div key={p.id} className="flex items-center justify-between rounded-lg bg-white/10 px-2.5 py-1.5 text-xs">
                        <span>{p.metodo_pago}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium tabular-nums">{formatCurrency(p.monto)}</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-white/20" onClick={() => handleEliminarPago(p.id)}><X className="h-3 w-3" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className={cn('rounded-lg p-2 text-center', saldoPendiente > 0.01 ? 'bg-[#F97316]/25' : 'bg-emerald-500/20')}>
                  <p className="text-[10px] text-white/75">{saldoPendiente < -0.01 ? 'Saldo a favor' : 'Saldo pendiente'}</p>
                  <p className="text-lg font-bold tabular-nums">{fmt(Math.abs(saldoPendiente))}</p>
                  <p className="text-[10px] text-white/70">{fmt(totalPagado)} pagado</p>
                </div>
              </div>

              <Separator className="bg-white/20" />

              {validationIssues.length > 0 && (
                <div className="rounded-lg border border-white/15 bg-white/[0.07] p-2">
                  <p className="mb-1.5 text-[10px] font-medium text-white/70">Falta para continuar</p>
                  <div className="flex flex-wrap gap-1">
                    {validationIssues.map((issue) => (
                      <button key={`${issue.key}-${issue.label}`} type="button" onClick={() => focusReservationField(issue.key)} className="rounded-full bg-white/10 px-2 py-1 text-[10px] text-white transition-colors hover:bg-white/20">
                        {issue.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <Button
                data-confirm-reservation
                type="button"
                onClick={handleConfirm}
                disabled={!puedeGuardar}
                className={cn(
                  'h-11 w-full bg-white font-semibold text-[#10233F] shadow-sm hover:bg-white/90 disabled:bg-white/35 disabled:text-white/60',
                  origen === 'Recepcion' && 'bg-emerald-500 text-white hover:bg-emerald-600 disabled:bg-emerald-500/35',
                )}
              >
                {loading ? 'Procesando…' : <><Check className="mr-1.5 h-4 w-4" />{origen === 'Recepcion' ? 'Completar check-in' : 'Crear reserva'}</>}
              </Button>
              <p className="text-center text-[10px] text-white/65">
                {availabilityStatus === 'loading' ? 'Comprobando disponibilidad…' : puedeGuardar ? 'Todo listo · ⌘/Ctrl + Enter' : 'Presiona lo pendiente para ir al campo'}
              </p>
            </div>
          </div>
        </aside>
      </div>
    </ReservationSurface>
  );
}

function Stepper({ value, onChange, min = 0, max = 99 }: { value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  return (
    <div className="flex h-9 items-center overflow-hidden rounded-lg border border-input bg-background">
      <button
        type="button"
        aria-label="Restar"
        onClick={() => onChange(clamp(value - 1))}
        disabled={value <= min}
        className="grid h-full w-8 shrink-0 place-items-center text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === '') { onChange(min); return; }
          onChange(clamp(parseInt(raw, 10) || min));
        }}
        className="h-full w-full min-w-0 border-0 bg-transparent text-center text-xs font-medium tabular-nums text-foreground outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button
        type="button"
        aria-label="Sumar"
        onClick={() => onChange(clamp(value + 1))}
        disabled={value >= max}
        className="grid h-full w-8 shrink-0 place-items-center text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function FormSection({ icon: Icon, title, hint, fieldKey, children }: { icon: typeof CalendarDays; title: string; hint?: string; fieldKey?: string; children: ReactNode }) {
  return <section data-reservation-field={fieldKey} className="space-y-2 bg-card">
    <div className="flex min-w-0 items-center gap-2 border-b border-border pb-1.5">
      <Icon className="h-4 w-4 shrink-0 text-[#F97316]" />
      <div className="min-w-0">
        <h3 className="truncate text-[13px] font-semibold text-foreground">{title}</h3>
        {hint && <p className="truncate text-[10px] text-muted-foreground">{hint}</p>}
      </div>
    </div>
    {children}
  </section>;
}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: ReactNode }) {
  return <div className="min-w-0 space-y-0.5">
    <Label className="text-[11px] font-medium text-muted-foreground">{label}{required && <span className="ml-0.5 text-[#F97316]">*</span>}</Label>
    {children}
    {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
  </div>;
}

function Line({ label, value, accent, small }: { label: string; value: string; accent?: boolean; small?: boolean }) {
  return <div className={cn('flex justify-between gap-3', small && 'text-[11px]')}>
    <span className={cn('min-w-0 truncate', accent ? 'text-emerald-300' : 'text-white/70')}>{label}</span>
    <span className={cn('shrink-0 tabular-nums', accent && 'text-emerald-300')}>{value}</span>
  </div>;
}
