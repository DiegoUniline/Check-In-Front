import { useState, useEffect, useRef, type KeyboardEvent, type ReactNode, type RefObject } from 'react';
import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  CalendarDays, BedDouble, Check, ChevronLeft, CalendarPlus, UserPlus, Clock, Percent,
  DollarSign, Package, Plus, Minus, Trash2, Receipt, Phone, Mail, CreditCard, X, ArrowLeft,
  Users, StickyNote,
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
  const [pagoMetodo, setPagoMetodo] = useState('Efectivo');
  const [mostrarSelectorHabitacion, setMostrarSelectorHabitacion] = useState(false);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const availabilityRequestRef = useRef(0);

  useEffect(() => {
    if (open) {
      cargarDatos();
      loadTemporadas().catch(() => {});
      setOrigen(preload?.origen || 'Reserva');
      setCrearNuevoCliente(false);
      setMostrarSelectorHabitacion(!preload?.habitacion?.id);
      setFormData(createInitialFormData(preload));
    }
  }, [open, preload]);

  useEffect(() => {
    if (!formData.habitacionId) setMostrarSelectorHabitacion(true);
  }, [formData.habitacionId]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      surfaceRef.current?.querySelector<HTMLElement>('[data-step-focus="dates"]')?.focus();
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
      const [tiposData, entregablesData, conceptosData, clientesData] = await Promise.all([
        api.getTiposHabitacion(),
        api.getEntregables?.() || Promise.resolve([]),
        api.getConceptosCargo?.() || Promise.resolve([]),
        api.getClientes?.() || Promise.resolve([]),
      ]);
      setTiposHabitacion(tiposData);
      setEntregables(entregablesData);
      setConceptosCargo(conceptosData);
      setClientes(Array.isArray(clientesData) ? clientesData : []);
    } catch (error) {
      console.error('Error cargando datos:', error);
    }
  };

  const buscarHabitaciones = async () => {
    const requestId = ++availabilityRequestRef.current;
    const applyAvailability = (rooms: any[]) => {
      if (requestId !== availabilityRequestRef.current) return;
      const availableRooms = Array.isArray(rooms) ? rooms : [];
      setHabitacionesDisponibles(availableRooms);
      setFormData((prev) => (
        prev.habitacionId && !availableRooms.some((room) => room.id === prev.habitacionId)
          ? { ...prev, habitacionId: '' }
          : prev
      ));
    };
    try {
      const checkin = format(formData.fechaCheckin, 'yyyy-MM-dd');
      const checkout = format(formData.fechaCheckout, 'yyyy-MM-dd');
      const data = await api.getHabitacionesDisponibles(checkin, checkout, formData.tipoHabitacion || undefined);
      applyAvailability(data);
    } catch (error) {
      try {
        const data = await api.getHabitaciones({ estado_habitacion: 'Disponible' });
        applyAvailability(data.filter((h: any) =>
          !formData.tipoHabitacion || (h.tipo_habitacion_id || h.tipo_id) === formData.tipoHabitacion
        ));
      } catch (e) {
        console.error('Error:', e);
      }
    }
  };

  useEffect(() => {
    if (!open || differenceInCalendarDays(formData.fechaCheckout, formData.fechaCheckin) < 1) return;
    const timer = window.setTimeout(() => {
      void buscarHabitaciones();
    }, 180);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, formData.fechaCheckin, formData.fechaCheckout, formData.tipoHabitacion]);

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
    (selectedHabitacion ? { precio_base: selectedHabitacion.precio_base, nombre: selectedHabitacion.tipo_nombre } : null);

  const tarifaNoche = selectedTipo?.precio_base || 0;
  const { precio: tarifaTemporada, temporada: temporadaAplicable } = resolverPrecioTemporada(
    tarifaNoche,
    format(formData.fechaCheckin, 'yyyy-MM-dd'),
    formData.tipoHabitacion,
    formData.habitacionId,
  );
  const tarifaEfectiva = temporadaAplicable ? tarifaTemporada : tarifaNoche;
  const subtotalHospedaje = tarifaEfectiva * noches;
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
    const monto = parseFloat(pagoMonto);
    if (!monto || monto <= 0) return;

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
      if (!loading && noches > 0 && formData.habitacionId && (formData.clienteId || nuevoClienteValido)) void handleConfirm();
    }
  };

  const puedeGuardar = !loading && noches > 0 && Boolean(formData.habitacionId) && (Boolean(formData.clienteId) || nuevoClienteValido);

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
            {` · ${formData.adultos + formData.ninos + formData.personasExtra} huésped(es)`}
            {total > 0 ? ` · ${fmt(total)}` : ''}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1 rounded-full bg-muted p-0.5">
          {([['Reserva', CalendarPlus], ['Recepcion', UserPlus]] as const).map(([value, Icon]) => (
            <button
              key={value}
              type="button"
              data-step-focus={value === 'Reserva' ? 'dates' : undefined}
              onClick={() => handleOrigenChange(value)}
              className={cn(
                'flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors',
                origen === value ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="h-3 w-3" />
              <span className="hidden sm:inline">{value === 'Reserva' ? 'Reserva' : 'Recepción'}</span>
            </button>
          ))}
        </div>
      </header>

      {/* LAYOUT A TODO EL ANCHO */}
      <div className="grid items-stretch gap-3 xl:min-h-0 xl:flex-1 xl:overflow-hidden xl:grid-cols-[minmax(0,1fr)_minmax(300px,340px)]">

        <div className="grid min-w-0 content-start gap-x-8 gap-y-5 rounded-xl xl:min-h-0 xl:overflow-y-auto border border-border bg-card p-4 shadow-sm lg:grid-cols-2 lg:p-5">



        {/* COLUMNA 1 — Estancia, ocupación y habitación */}
        <div className="min-w-0 space-y-5">
          <FormSection icon={CalendarDays} title="Estancia" hint="Fechas y hora de llegada.">
            {origen === 'Recepcion' && (
              <div className="rounded-lg border border-[#FDBA74] bg-[#FFF7ED] px-2.5 py-1.5 text-[11px] text-[#9A3412]">
                Check-in automático: la habitación queda ocupada hoy.
              </div>
            )}
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_140px]">
              <Field label="Check-in">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-9 w-full justify-start px-2.5 text-xs font-normal" disabled={origen === 'Recepcion'}>
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
                    <Button variant="outline" className="h-9 w-full justify-start px-2.5 text-xs font-normal">
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

          <FormSection icon={Users} title="Ocupación" hint="Cantidades libres, sin límite de lista.">
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <Field label="Adultos">
                <Stepper min={1} value={formData.adultos} onChange={(v) => setFormData({ ...formData, adultos: v })} />
              </Field>
              <Field label="Niños">
                <Stepper min={0} value={formData.ninos} onChange={(v) => setFormData({ ...formData, ninos: v })} />
              </Field>
              <Field label="Personas extra">
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

          <FormSection icon={BedDouble} title="Habitación" hint={mostrarSelectorHabitacion ? `${habitacionesDisponibles.length} libres en el rango seleccionado.` : 'Habitación asignada a esta reserva.'}>
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
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" className="h-8 shrink-0 px-2.5 text-xs" onClick={() => setMostrarSelectorHabitacion(true)}>
                  Cambiar
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, tipoHabitacion: '', habitacionId: '' })}
                    className={cn(
                      'rounded-full border px-2.5 py-1 text-[11px] transition-colors',
                      !formData.tipoHabitacion ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:border-primary/40',
                    )}
                  >
                    Todas
                  </button>
                  {tiposHabitacion.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, tipoHabitacion: t.id, habitacionId: '' })}
                      className={cn(
                        'rounded-full border px-2.5 py-1 text-[11px] transition-colors',
                        formData.tipoHabitacion === t.id ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:border-primary/40',
                      )}
                    >
                      {t.nombre} · {formatCurrency(t.precio_base)}
                    </button>
                  ))}
                </div>

                {habitacionesDisponibles.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border py-4 text-center text-[11px] text-muted-foreground">
                    Sin disponibilidad para este rango. Ajusta fechas o categoría.
                  </p>
                ) : (
                  <div className="grid max-h-[280px] grid-cols-2 gap-1.5 overflow-y-auto pr-0.5 sm:grid-cols-3 xl:grid-cols-4">
                    {habitacionesDisponibles.map((hab) => {
                      const activo = formData.habitacionId === hab.id;
                      const tipo = tiposHabitacion.find((item) => item.id === (hab.tipo_habitacion_id || hab.tipo_id));
                      return (
                        <button
                          key={hab.id}
                          type="button"
                          onClick={() => { handleSelectRoom(hab); setMostrarSelectorHabitacion(false); }}
                          className={cn(
                            'rounded-lg border p-2 text-left transition-colors',
                            activo ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card hover:border-primary/40',
                          )}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-sm font-semibold">#{hab.numero}</span>
                            {activo && <Check className="h-3.5 w-3.5" />}
                          </div>
                          <p className={cn('truncate text-[10px]', activo ? 'text-white/75' : 'text-muted-foreground')}>
                            {hab.tipo_nombre || tipo?.nombre || 'Sin categoría'}
                          </p>
                          <p className={cn('text-[11px] font-medium tabular-nums', activo ? 'text-primary-foreground' : 'text-foreground')}>
                            {fmt(rateOf(hab))}/noche
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            {selectedHabitacion && temporadaAplicable && (
              <Badge variant="outline" className="h-5 w-fit px-1.5 text-[10px]">Tarifa temporada: {temporadaAplicable.nombre}</Badge>
            )}
          </FormSection>
        </div>

        {/* COLUMNA 2 — Huésped, cargos, notas e impuestos */}
        <div className="min-w-0 space-y-5 border-t border-border pt-5 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
          <FormSection icon={UserPlus} title="Huésped" hint="Busca existente o captura uno nuevo.">
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

          <FormSection icon={Percent} title="Impuestos" hint="Se calculan sobre el subtotal de la estancia.">
            <div className="flex items-center justify-between gap-2">
              <Select value="" onValueChange={(value) => {
                const sugerido = IMPUESTOS_MEXICO_SUGERIDOS.find((item) => item.nombre === value);
                const nuevo = sugerido
                  ? { id: `imp-${Date.now()}`, nombre: sugerido.nombre, tasa: sugerido.tasa }
                  : { id: `imp-${Date.now()}`, nombre: 'Impuesto', tasa: 0 };
                setFormData((p) => ({ ...p, impuestos: [...p.impuestos, nuevo] }));
              }}>
                <SelectTrigger className="h-9 flex-1 text-xs"><SelectValue placeholder="+ Agregar impuesto" /></SelectTrigger>
                <SelectContent>
                  {IMPUESTOS_MEXICO_SUGERIDOS.filter((s) => !formData.impuestos.some((i) => i.nombre === s.nombre)).map((sug) => (
                    <SelectItem key={sug.nombre} value={sug.nombre}>{sug.nombre}</SelectItem>
                  ))}
                  <SelectItem value="__custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
              <span className="shrink-0 text-xs font-semibold tabular-nums text-foreground">{fmt(totalImpuestos)}</span>
            </div>
            {formData.impuestos.length === 0 ? (
              <p className="text-[10px] text-muted-foreground">Sin impuestos aplicados.</p>
            ) : (
              <div className="space-y-1">
                {formData.impuestos.map((imp) => (
                  <div key={imp.id} className="grid grid-cols-[minmax(0,1fr)_76px_32px] items-center gap-1.5">
                    <Input className="h-8 min-w-0 px-2 text-[11px]" value={imp.nombre} onChange={(e) => setFormData((p) => ({ ...p, impuestos: p.impuestos.map((x) => x.id === imp.id ? { ...x, nombre: e.target.value } : x) }))} />
                    <div className="relative">
                      <Input type="number" min="0" step="0.01" className="h-8 pr-5 text-right text-[11px]" value={imp.tasa} onChange={(e) => setFormData((p) => ({ ...p, impuestos: p.impuestos.map((x) => x.id === imp.id ? { ...x, tasa: parseFloat(e.target.value) || 0 } : x) }))} />
                      <Percent className="pointer-events-none absolute right-1.5 top-1/2 h-2.5 w-2.5 -translate-y-1/2 text-muted-foreground" />
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setFormData((p) => ({ ...p, impuestos: p.impuestos.filter((x) => x.id !== imp.id) }))}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                  </div>
                ))}
              </div>
            )}
          </FormSection>

          <FormSection icon={StickyNote} title="Notas y entregables" hint="Opcional.">
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="Solicitudes del huésped">
                <Textarea rows={2} className="min-h-[52px] resize-none text-xs" value={formData.solicitudesEspeciales} onChange={(e) => setFormData({ ...formData, solicitudesEspeciales: e.target.value })} placeholder="Cuna, piso alto, llegada tarde…" />
              </Field>
              <Field label="Notas internas">
                <Textarea rows={2} className="min-h-[52px] resize-none text-xs" value={formData.notasInternas} onChange={(e) => setFormData({ ...formData, notasInternas: e.target.value })} placeholder="Solo visible para el equipo…" />
              </Field>
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
        <aside className="min-w-0 xl:min-h-0 xl:overflow-y-auto">
          <div className="overflow-hidden rounded-xl bg-[#10233F] text-white shadow-lg">
            <div className="space-y-2 p-3">
              <p className="text-xs font-semibold">Resumen de cuenta</p>

              <div className="space-y-1 text-xs">
                <Line label={`Hospedaje · ${noches || 0} noche${noches === 1 ? '' : 's'}`} value={fmt(subtotalHospedaje)} />
                {temporadaAplicable && <Line small label={`Temporada ${temporadaAplicable.nombre} (${describirAjuste(temporadaAplicable)})`} value={`${fmt(tarifaEfectiva)}/noche`} />}
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
                <Label className="flex items-center gap-1.5 text-[11px] text-white/80"><CreditCard className="h-3 w-3" />Registrar pago</Label>
                <div className="flex gap-1.5">
                  <Input
                    type="number"
                    placeholder={saldoPendiente > 0 ? fmt(saldoPendiente) : 'Monto'}
                    className="h-9 flex-1 border-input bg-background text-xs text-foreground"
                    value={pagoMonto}
                    onFocus={() => { if (!pagoMonto && saldoPendiente > 0) setPagoMonto(saldoPendiente.toFixed(2)); }}
                    onChange={(e) => setPagoMonto(e.target.value)}
                  />
                  <Select value={pagoMetodo} onValueChange={setPagoMetodo}>
                    <SelectTrigger className="h-9 w-24 border-input bg-background text-xs text-foreground"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Efectivo">Efectivo</SelectItem>
                      <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                      <SelectItem value="Transferencia">Transf.</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="secondary" className="h-9 w-9 px-0" onClick={handleAgregarPago} aria-label="Agregar pago"><Plus className="h-4 w-4" /></Button>
                </div>
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
                {puedeGuardar ? 'Todo listo · ⌘/Ctrl + Enter' : 'Completa fechas, habitación y huésped'}
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

function FormSection({ icon: Icon, title, hint, children }: { icon: typeof CalendarDays; title: string; hint?: string; children: ReactNode }) {
  return <section className="space-y-2 bg-card">
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
