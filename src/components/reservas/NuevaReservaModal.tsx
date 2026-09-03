import { useState, useEffect, useRef, type KeyboardEvent, type ReactNode, type RefObject } from 'react';
import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  CalendarDays, BedDouble, Check, ChevronLeft,
  CalendarPlus, UserPlus, Clock, Percent, DollarSign, Package, Plus, Trash2, 
  Receipt, Phone, Mail, CreditCard, X, ArrowLeft
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
import { Card, CardContent } from '@/components/ui/card';
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
    return <div className="min-h-[calc(100dvh-4rem)] bg-[#F7F9FC] pb-24 lg:pb-8">
      <div ref={surfaceRef} onKeyDown={onKeyDown} className="mx-auto max-w-[1680px] space-y-4 px-3 py-4 sm:px-6 lg:px-8">
        {children}
      </div>
    </div>;
  }

  return <Dialog open={open} onOpenChange={onClose}>
    <DialogContent ref={surfaceRef} onKeyDown={onKeyDown} className="h-[100dvh] w-screen max-w-none max-h-none overflow-y-auto rounded-none border-0 p-3 sm:h-auto sm:w-[calc(100%-1rem)] sm:max-w-6xl sm:max-h-[92vh] sm:rounded-xl sm:border sm:p-5">
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
// El usuario puede agregar/quitar/editar libremente.
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
    // Relacionado con `check-in-back/src/routes/tiposHabitacion.js`:
    // El costo por persona extra debe venir de `tipos_habitacion.precio_persona_extra`,
    // no debe estar hardcodeado. Se autocompleta cuando el usuario selecciona el tipo.
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
  const surfaceRef = useRef<HTMLDivElement>(null);
  const availabilityRequestRef = useRef(0);

  useEffect(() => {
    if (open) {
      cargarDatos();
      loadTemporadas().catch(() => {});
      setOrigen(preload?.origen || 'Reserva');
      setCrearNuevoCliente(false);
      setFormData(createInitialFormData(preload));
    }
  }, [open, preload]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      surfaceRef.current?.querySelector<HTMLElement>('[data-step-focus="dates"]')?.focus();
    }, 80);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    // Relacionado con `check-in-back/src/routes/tiposHabitacion.js` (GET `/tipos-habitacion`):
    // Cuando cambia el tipo de habitación, autocompletamos el cargo por persona extra usando
    // `precio_persona_extra` del tipo. Esto corrige el bug donde se ponía $250 fijo.
    // Nota UX: el input sigue siendo editable; solo se “resetea” automáticamente al cambiar tipo.
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

  // Prellena los impuestos configurados por defecto para la habitación/tipo/hotel
  // cuando el usuario selecciona un tipo o una habitación. Genera IDs efímeros para
  // que el editor pueda manipular la lista libremente.
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
      // Cargamos TODOS los clientes una sola vez al abrir el modal y filtramos en memoria.
      // Así el campo "Buscar cliente" muestra resultados desde la primera letra sin esperar al backend.
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
    // En la captura completa la disponibilidad se actualiza al cambiar rango o categoría.
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

  // Impuestos configurables manualmente (tabla editable, 0 por default)
  // Cada impuesto se calcula sobre el subtotal y se suman en `totalImpuestos`.
  const impuestosCalculados = formData.impuestos.map((imp) => ({
    ...imp,
    monto: subtotal * ((imp.tasa || 0) / 100),
  }));
  const totalImpuestos = impuestosCalculados.reduce((s, i) => s + i.monto, 0);
  const totalBruto = subtotal + totalImpuestos;

  // Descuento se aplica sobre el total con los impuestos seleccionados.
  let descuentoMonto = 0;
  if (formData.descuentoTipo === 'Monto') descuentoMonto = formData.descuentoValor;
  else if (formData.descuentoTipo === 'Porcentaje') descuentoMonto = totalBruto * (formData.descuentoValor / 100);

  const total = Math.max(0, totalBruto - descuentoMonto);
  const totalPagado = formData.pagos.reduce((sum, p) => sum + p.monto, 0);
  const saldoPendiente = total - totalPagado;

  const fmt = (n: number) => formatCurrency(n);

  // FIX: Solo cambiar checkin a hoy, mantener checkout seleccionado
  const handleOrigenChange = (nuevoOrigen: 'Reserva' | 'Recepcion') => {
    setOrigen(nuevoOrigen);
    if (nuevoOrigen === 'Recepcion') {
      const hoy = hotelToday();
      const checkoutActual = formData.fechaCheckout;
      // Si el checkout es menor o igual a hoy, ajustarlo a mañana
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
    // IVA de cargos extras: NO automático, se incluye en el IVA global configurable
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

      // Envío de confirmación por WhatsApp (no bloquea la UI si falla)
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
  const nombreHuesped = (formData.clienteData?.nombre || formData.nuevoCliente.nombre || '').trim();

  return (
    <ReservationSurface pageMode={pageMode} open={open} onClose={() => onOpenChange(false)} surfaceRef={surfaceRef} onKeyDown={handleSurfaceKeyDown}>
      {!pageMode && (
        <DialogHeader className="sr-only">
          <DialogTitle>{origen === 'Recepcion' ? 'Nueva entrada' : 'Nueva reserva'}</DialogTitle>
          <DialogDescription>Captura completa en una sola vista</DialogDescription>
        </DialogHeader>
      )}

      {/* ENCABEZADO */}
      <header className={cn(
        'sticky top-0 z-30 border-b border-[#10233F]/10 bg-white/95 backdrop-blur',
        pageMode
          ? '-mx-3 -mt-4 px-3 py-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8'
          : '-mx-3 -mt-3 px-3 py-3 sm:-mx-5 sm:-mt-5 sm:px-5 sm:rounded-t-xl',
      )}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={() => onOpenChange(false)} aria-label="Cerrar">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-[#10233F] sm:text-xl">
                {origen === 'Recepcion' ? 'Nueva entrada · Check-in' : 'Nueva reserva'}
              </h2>
              <p className="truncate text-[11px] text-muted-foreground sm:text-xs">
                {noches > 0 ? `${noches} noche${noches === 1 ? '' : 's'} · ${formatDate(formData.fechaCheckin)} → ${formatDate(formData.fechaCheckout)}` : 'Selecciona el rango de fechas'}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1 rounded-full bg-[#F1F5F9] p-1">
            {([['Reserva', CalendarPlus], ['Recepcion', UserPlus]] as const).map(([value, Icon]) => (
              <button
                key={value}
                type="button"
                data-step-focus={value === 'Reserva' ? 'dates' : undefined}
                onClick={() => handleOrigenChange(value)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                  origen === value ? 'bg-[#10233F] text-white shadow-sm' : 'text-[#475569] hover:text-[#10233F]',
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{value === 'Reserva' ? 'Reserva' : 'Recepción'}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* RESUMEN RÁPIDO */}
      <section className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
        <MiniSummary icon={CalendarDays} label="Estancia" value={`${noches || 0} noche${noches === 1 ? '' : 's'}`} detail={`${formatDate(formData.fechaCheckin)} → ${formatDate(formData.fechaCheckout)}`} />
        <MiniSummary icon={BedDouble} label="Habitación" value={selectedHabitacion ? `#${selectedHabitacion.numero}` : 'Por elegir'} detail={selectedTipo?.nombre || 'Sin categoría'} />
        <MiniSummary icon={UserPlus} label="Huésped" value={nombreHuesped || 'Por elegir'} detail={formData.clienteData?.telefono || formData.nuevoCliente.telefono || 'Sin teléfono'} />
        <MiniSummary icon={CreditCard} label="Total" value={fmt(total)} detail={`${fmt(totalPagado)} pagado · ${fmt(saldoPendiente)} pendiente`} danger={saldoPendiente > 0.01} />
      </section>

      <div className="mt-3 grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-3">
          {/* 1. ESTANCIA + HABITACIÓN */}
          <FormSection icon={CalendarDays} title="Estancia y habitación" hint="Solo se listan habitaciones libres en todo el rango.">
            {origen === 'Recepcion' && (
              <div className="rounded-[10px] border border-[#FDBA74] bg-[#FFF7ED] px-3 py-2 text-xs text-[#9A3412]">
                Check-in automático al confirmar: la habitación queda ocupada hoy.
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Check-in">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-11 w-full justify-start font-normal" disabled={origen === 'Recepcion'}>
                      <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
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
                    <Button variant="outline" className="h-11 w-full justify-start font-normal">
                      <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
                      {formatDate(formData.fechaCheckout)}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" locale={es} selected={formData.fechaCheckout} onSelect={(d) => d && setFormData({ ...formData, fechaCheckout: d })} disabled={(d) => d <= formData.fechaCheckin} />
                  </PopoverContent>
                </Popover>
              </Field>
              <Field label="Hora de llegada">
                <div className="relative">
                  <Clock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input type="time" className="h-11 pl-9" value={formData.horaLlegada} onChange={(e) => setFormData({ ...formData, horaLlegada: e.target.value })} />
                </div>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Field label="Adultos">
                <Select value={formData.adultos.toString()} onValueChange={(v) => setFormData({ ...formData, adultos: parseInt(v) })}>
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>{[1, 2, 3, 4, 5, 6].map(n => <SelectItem key={n} value={n.toString()}>{n}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Niños">
                <Select value={formData.ninos.toString()} onValueChange={(v) => setFormData({ ...formData, ninos: parseInt(v) })}>
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>{[0, 1, 2, 3, 4].map(n => <SelectItem key={n} value={n.toString()}>{n}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Personas extra">
                <Select value={formData.personasExtra.toString()} onValueChange={(v) => setFormData({ ...formData, personasExtra: parseInt(v) })}>
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>{[0, 1, 2, 3].map(n => <SelectItem key={n} value={n.toString()}>{n}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Cargo por extra" hint={formData.personasExtra === 0 ? 'Sin extras' : 'Por noche'}>
                <div className="relative">
                  <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input type="number" inputMode="decimal" className="h-11 pl-9" value={formData.cargoPersonaExtra} onChange={(e) => setFormData({ ...formData, cargoPersonaExtra: parseFloat(e.target.value) || 0 })} disabled={formData.personasExtra === 0} />
                </div>
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Categoría">
                <ComboboxCreatable
                  options={tiposHabitacion.map(t => ({ value: t.id, label: `${t.nombre} · ${formatCurrency(t.precio_base)}/noche` }))}
                  value={formData.tipoHabitacion}
                  onValueChange={(v) => setFormData({ ...formData, tipoHabitacion: v, habitacionId: '' })}
                  onCreate={async (nombre) => {
                    const newTipo = await api.createTipoHabitacion({ nombre, precio_base: 1000 });
                    setTiposHabitacion([...tiposHabitacion, newTipo]);
                    return { value: newTipo.id, label: `${newTipo.nombre} · ${formatCurrency(1000)}/noche` };
                  }}
                  placeholder="Todas las categorías"
                  searchPlaceholder="Buscar categoría…"
                  createLabel="Crear"
                  className="h-11 justify-start text-left font-normal"
                />
              </Field>
              <Field label="Habitación" hint={`${habitacionesDisponibles.length} disponibles en el rango`}>
                <ComboboxCreatable
                  options={habitacionesDisponibles.map((hab) => {
                    const tipo = tiposHabitacion.find((item) => item.id === (hab.tipo_habitacion_id || hab.tipo_id));
                    const roomRate = Number(hab.precio_base) || 0;
                    const rate = roomRate > 0 ? roomRate : Number(tipo?.precio_base) || 0;
                    return { value: hab.id, label: `Hab. ${hab.numero} · ${hab.tipo_nombre || tipo?.nombre || 'Sin categoría'} · ${fmt(rate)}/noche` };
                  })}
                  value={formData.habitacionId}
                  onValueChange={(value) => {
                    const room = habitacionesDisponibles.find((item) => item.id === value);
                    if (room) handleSelectRoom(room);
                  }}
                  placeholder={habitacionesDisponibles.length ? 'Elegir habitación…' : 'Sin disponibilidad'}
                  searchPlaceholder="Número, categoría o precio…"
                  emptyMessage="No hay coincidencias disponibles."
                  disabled={habitacionesDisponibles.length === 0}
                  className="h-11 justify-start text-left font-normal"
                />
              </Field>
            </div>

            {selectedHabitacion && (
              <div className="flex flex-wrap items-center gap-2 rounded-[10px] bg-[#F8FAFC] px-3 py-2 text-xs text-[#475569]">
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                Hab. {selectedHabitacion.numero} disponible · {fmt(tarifaEfectiva)}/noche
                {temporadaAplicable && <Badge variant="outline" className="h-5 px-1.5 text-[10px]">{temporadaAplicable.nombre}</Badge>}
              </div>
            )}
          </FormSection>

          {/* 2. HUÉSPED */}
          <FormSection icon={UserPlus} title="Huésped" hint="Busca uno existente o captúralo aquí mismo.">
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
                    placeholder="Buscar huésped por nombre o teléfono…"
                    searchPlaceholder="Nombre, teléfono, correo o documento…"
                    emptyMessage="No se encontró ningún huésped."
                    className="h-11 min-w-0 flex-1 justify-start overflow-hidden text-left font-normal"
                  />
                  {formData.clienteData ? (
                    <Button type="button" variant="outline" size="icon" className="h-11 w-11 shrink-0" onClick={handleClearCliente} aria-label="Quitar huésped"><X className="h-4 w-4" /></Button>
                  ) : (
                    <Button type="button" variant="outline" className="h-11 shrink-0" onClick={() => setCrearNuevoCliente(true)}><UserPlus className="mr-1.5 h-4 w-4" />Nuevo</Button>
                  )}
                </div>
                {formData.clienteData && (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[10px] bg-[#F8FAFC] px-3 py-2 text-xs text-[#475569]">
                    <span className="font-medium text-[#10233F]">{formData.clienteData.nombre} {formData.clienteData.apellido_paterno || ''}</span>
                    {formData.clienteData.telefono && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{formData.clienteData.telefono}</span>}
                    {formData.clienteData.email && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{formData.clienteData.email}</span>}
                    {formData.clienteData.es_vip && <Badge className="h-5 px-1.5 text-[10px]">VIP</Badge>}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <Button variant="ghost" size="sm" className="-ml-2 h-8" onClick={() => setCrearNuevoCliente(false)}>
                  <ChevronLeft className="mr-1 h-4 w-4" /> Buscar existente
                </Button>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Nombre" required>
                    <Input data-new-client-name className="h-11" value={formData.nuevoCliente.nombre} onChange={(e) => setFormData({ ...formData, nuevoCliente: { ...formData.nuevoCliente, nombre: e.target.value } })} />
                  </Field>
                  <Field label="Apellido paterno" required>
                    <Input className="h-11" value={formData.nuevoCliente.apellido_paterno} onChange={(e) => setFormData({ ...formData, nuevoCliente: { ...formData.nuevoCliente, apellido_paterno: e.target.value } })} />
                  </Field>
                  <Field label="Apellido materno">
                    <Input className="h-11" value={formData.nuevoCliente.apellido_materno} onChange={(e) => setFormData({ ...formData, nuevoCliente: { ...formData.nuevoCliente, apellido_materno: e.target.value } })} />
                  </Field>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Teléfono" required>
                    <div className="relative">
                      <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input className="h-11 pl-9" inputMode="tel" value={formData.nuevoCliente.telefono} onChange={(e) => setFormData({ ...formData, nuevoCliente: { ...formData.nuevoCliente, telefono: e.target.value } })} />
                    </div>
                  </Field>
                  <Field label="Correo">
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input type="email" className="h-11 pl-9" value={formData.nuevoCliente.email} onChange={(e) => setFormData({ ...formData, nuevoCliente: { ...formData.nuevoCliente, email: e.target.value } })} />
                    </div>
                  </Field>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Tipo de documento">
                    <Select value={formData.nuevoCliente.tipo_documento} onValueChange={(v) => setFormData({ ...formData, nuevoCliente: { ...formData.nuevoCliente, tipo_documento: v } })}>
                      <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INE">INE</SelectItem>
                        <SelectItem value="Pasaporte">Pasaporte</SelectItem>
                        <SelectItem value="Licencia">Licencia</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Número de documento">
                    <Input className="h-11" value={formData.nuevoCliente.numero_documento} onChange={(e) => setFormData({ ...formData, nuevoCliente: { ...formData.nuevoCliente, numero_documento: e.target.value } })} />
                  </Field>
                </div>
              </div>
            )}
          </FormSection>

          {/* 3. NOTAS Y ENTREGABLES */}
          <FormSection icon={Package} title="Notas y entregables" hint="Opcional. Todo lo que recepción necesita saber.">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Solicitudes del huésped">
                <Textarea rows={2} value={formData.solicitudesEspeciales} onChange={(e) => setFormData({ ...formData, solicitudesEspeciales: e.target.value })} placeholder="Cuna, piso alto, llegada tarde…" />
              </Field>
              <Field label="Notas internas">
                <Textarea rows={2} value={formData.notasInternas} onChange={(e) => setFormData({ ...formData, notasInternas: e.target.value })} placeholder="Solo visible para el equipo…" />
              </Field>
            </div>
            {origen === 'Recepcion' && entregables.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs font-medium text-[#475569]">Entregables al huésped</Label>
                <div className="flex flex-wrap gap-2">
                  {entregables.map(ent => {
                    const activo = formData.entregablesSeleccionados.includes(ent.id);
                    return (
                      <button key={ent.id} type="button" onClick={() => toggleEntregable(ent.id)} className={cn('flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors', activo ? 'border-[#10233F] bg-[#10233F] text-white' : 'border-[#CBD5E1] text-[#475569] hover:border-[#10233F]/40')}>
                        {activo && <Check className="h-3.5 w-3.5" />}{ent.nombre}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </FormSection>

          {/* 4. CARGOS E IMPUESTOS */}
          <FormSection icon={Receipt} title="Cargos e impuestos" hint="Consumos anticipados e impuestos aplicables.">
            <div className="grid grid-cols-[minmax(0,1fr)_68px_104px_44px] gap-2">
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
                className="h-11 justify-start text-left font-normal"
              />
              <Input className="h-11 px-2 text-center" type="number" inputMode="numeric" placeholder="Cant" value={cargoCantidad} onChange={(e) => setCargoCantidad(e.target.value)} />
              <Input className="h-11 px-2 text-right" type="number" inputMode="decimal" placeholder="$0.00" value={cargoMonto} onChange={(e) => setCargoMonto(e.target.value)} />
              <Button type="button" className="h-11 w-11 px-0" onClick={handleAgregarCargo} disabled={!cargoConcepto} aria-label="Agregar cargo"><Plus className="h-4 w-4" /></Button>
            </div>
            {formData.cargos.length > 0 && (
              <div className="divide-y rounded-[10px] border">
                {formData.cargos.map(c => (
                  <div key={c.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <span className="min-w-0 truncate">{c.concepto_nombre} <span className="text-muted-foreground">×{c.cantidad}</span></span>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="font-medium tabular-nums">{formatCurrency(c.total)}</span>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setFormData(p => ({ ...p, cargos: p.cargos.filter(x => x.id !== c.id) }))}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Separator />

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-xs font-medium text-[#475569]"><Percent className="h-3.5 w-3.5" />Impuestos</Label>
              {formData.impuestos.length === 0 && <p className="text-xs text-muted-foreground">Sin impuestos. Agrega uno con un toque.</p>}
              {formData.impuestos.map((imp) => (
                <div key={imp.id} className="grid grid-cols-[minmax(0,1fr)_86px_96px_40px] items-center gap-2">
                  <Input
                    className="h-10 w-full min-w-0"
                    placeholder="Nombre del impuesto"
                    value={imp.nombre}
                    onChange={(e) => setFormData((p) => ({ ...p, impuestos: p.impuestos.map((x) => x.id === imp.id ? { ...x, nombre: e.target.value } : x) }))}
                  />
                  <div className="relative">
                    <Input
                      type="number" min="0" step="0.01"
                      className="h-10 pr-7 text-right"
                      value={imp.tasa}
                      onChange={(e) => setFormData((p) => ({ ...p, impuestos: p.impuestos.map((x) => x.id === imp.id ? { ...x, tasa: parseFloat(e.target.value) || 0 } : x) }))}
                    />
                    <Percent className="absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  </div>
                  <span className="text-right text-xs tabular-nums text-muted-foreground">{fmt(subtotal * (imp.tasa / 100))}</span>
                  <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setFormData((p) => ({ ...p, impuestos: p.impuestos.filter((x) => x.id !== imp.id) }))}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              ))}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {IMPUESTOS_MEXICO_SUGERIDOS.filter((s) => !formData.impuestos.some((i) => i.nombre === s.nombre)).map((sug) => (
                  <button key={sug.nombre} type="button" title={sug.descripcion}
                    className="rounded-full border border-dashed border-[#CBD5E1] px-2.5 py-1 text-xs text-[#475569] transition-colors hover:border-[#10233F]/40 hover:text-[#10233F]"
                    onClick={() => setFormData((p) => ({ ...p, impuestos: [...p.impuestos, { id: `imp-${Date.now()}`, nombre: sug.nombre, tasa: sug.tasa }] }))}>
                    + {sug.nombre}
                  </button>
                ))}
                <button type="button"
                  className="rounded-full border border-dashed border-[#F97316]/50 px-2.5 py-1 text-xs text-[#C2410C] transition-colors hover:bg-[#FFF7ED]"
                  onClick={() => setFormData((p) => ({ ...p, impuestos: [...p.impuestos, { id: `imp-${Date.now()}`, nombre: 'Impuesto', tasa: 0 }] }))}>
                  + Personalizado
                </button>
              </div>
            </div>
          </FormSection>
        </div>

        {/* RESUMEN DE CUENTA */}
        <aside className="min-w-0 xl:sticky xl:top-24">
          <Card className="overflow-hidden border-0 bg-[#10233F] text-white shadow-lg">
            <CardContent className="space-y-3 p-4">
              <p className="text-sm font-semibold">Resumen de cuenta</p>

              <div className="space-y-1.5 text-sm">
                <Line label={`Hospedaje · ${noches || 0} noche${noches === 1 ? '' : 's'}`} value={fmt(subtotalHospedaje)} />
                {temporadaAplicable && <Line small label={`Temporada ${temporadaAplicable.nombre} (${describirAjuste(temporadaAplicable)})`} value={`${fmt(tarifaEfectiva)}/noche`} />}
                {totalPersonaExtra > 0 && <Line label={`Personas extra (${formData.personasExtra})`} value={fmt(totalPersonaExtra)} />}
                {totalCargosExtras > 0 && <Line label={`Cargos extras (${formData.cargos.length})`} value={fmt(totalCargosExtras)} />}
                {impuestosCalculados.map((imp) => imp.monto > 0 && <Line key={imp.id} label={`${imp.nombre} (${imp.tasa}%)`} value={fmt(imp.monto)} />)}
                {descuentoMonto > 0 && <Line accent label={`Descuento${formData.descuentoTipo === 'Porcentaje' ? ` (${formData.descuentoValor}%)` : ''}`} value={`−${fmt(descuentoMonto)}`} />}
              </div>

              <Separator className="bg-white/20" />

              <div className="space-y-2 rounded-[10px] bg-white/10 p-3">
                <Label className="flex items-center gap-2 text-xs text-white/80"><Percent className="h-3.5 w-3.5" />Descuento sobre el total</Label>
                <div className="flex gap-2">
                  <Select value={formData.descuentoTipo} onValueChange={(v) => setFormData({ ...formData, descuentoTipo: v as 'none' | 'Monto' | 'Porcentaje', descuentoValor: 0 })}>
                    <SelectTrigger className="h-10 w-32 border-input bg-background text-foreground"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Ninguno</SelectItem>
                      <SelectItem value="Monto">Monto</SelectItem>
                      <SelectItem value="Porcentaje">Porcentaje</SelectItem>
                    </SelectContent>
                  </Select>
                  {formData.descuentoTipo !== 'none' && (
                    <div className="relative flex-1">
                      {formData.descuentoTipo === 'Porcentaje'
                        ? <Percent className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        : <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />}
                      <Input type="number" className="h-10 border-input bg-background pl-9 text-foreground" value={formData.descuentoValor} onChange={(e) => setFormData({ ...formData, descuentoValor: parseFloat(e.target.value) || 0 })} />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-end justify-between">
                <span className="text-sm font-medium">Total</span>
                <span className="text-2xl font-bold tabular-nums">{fmt(total)}</span>
              </div>

              <Separator className="bg-white/20" />

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-xs text-white/80"><CreditCard className="h-3.5 w-3.5" />Registrar pago</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder={saldoPendiente > 0 ? fmt(saldoPendiente) : 'Monto'}
                    className="h-10 flex-1 border-input bg-background text-foreground"
                    value={pagoMonto}
                    onFocus={() => { if (!pagoMonto && saldoPendiente > 0) setPagoMonto(saldoPendiente.toFixed(2)); }}
                    onChange={(e) => setPagoMonto(e.target.value)}
                  />
                  <Select value={pagoMetodo} onValueChange={setPagoMetodo}>
                    <SelectTrigger className="h-10 w-28 border-input bg-background text-foreground"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Efectivo">Efectivo</SelectItem>
                      <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                      <SelectItem value="Transferencia">Transfer.</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="secondary" className="h-10 w-10 px-0" onClick={handleAgregarPago} aria-label="Agregar pago"><Plus className="h-4 w-4" /></Button>
                </div>
                {formData.pagos.length > 0 && (
                  <div className="space-y-1.5">
                    {formData.pagos.map(p => (
                      <div key={p.id} className="flex items-center justify-between rounded-[10px] bg-white/10 px-3 py-2 text-sm">
                        <span>{p.metodo_pago}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium tabular-nums">{formatCurrency(p.monto)}</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-white/20" onClick={() => handleEliminarPago(p.id)}><X className="h-3 w-3" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className={cn('rounded-[10px] p-3 text-center', saldoPendiente > 0.01 ? 'bg-[#F97316]/25' : 'bg-emerald-500/20')}>
                  <p className="text-[11px] text-white/75">{saldoPendiente < -0.01 ? 'Saldo a favor' : 'Saldo pendiente'}</p>
                  <p className="mt-0.5 text-xl font-bold tabular-nums">{fmt(Math.abs(saldoPendiente))}</p>
                  <p className="mt-0.5 text-[11px] text-white/70">{fmt(totalPagado)} pagado</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>

      {/* ACCIONES */}
      <div className={cn(
        'sticky bottom-0 z-20 -mx-3 mt-3 flex items-center gap-2 border-t bg-background/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur',
        pageMode ? 'sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8' : 'sm:-mx-5 sm:px-5',
      )}>
        <Button type="button" className="h-11 flex-1 sm:flex-none" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
        <span className="hidden flex-1 text-center text-xs text-muted-foreground md:block">
          {puedeGuardar ? 'Todo listo · ⌘/Ctrl + Enter para guardar' : 'Completa fechas, habitación y huésped'}
        </span>
        <Button
          data-confirm-reservation
          type="button"
          onClick={handleConfirm}
          disabled={!puedeGuardar}
          className={cn('h-11 flex-1 sm:min-w-52 sm:flex-none', origen === 'Recepcion' && 'bg-emerald-600 hover:bg-emerald-700')}
        >
          {loading ? 'Procesando…' : <><Check className="mr-2 h-4 w-4" />{origen === 'Recepcion' ? 'Completar check-in' : 'Crear reserva'}</>}
        </Button>
      </div>
    </ReservationSurface>
  );
}

function FormSection({ icon: Icon, title, hint, children }: { icon: typeof CalendarDays; title: string; hint?: string; children: ReactNode }) {
  return <section className="space-y-3 rounded-[14px] border border-[#10233F]/10 bg-white p-4 shadow-sm">
    <div className="flex items-start gap-2.5">
      <span className="rounded-[10px] bg-[#10233F]/[0.07] p-2 text-[#10233F]"><Icon className="h-4 w-4" /></span>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-[#10233F]">{title}</h3>
        {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      </div>
    </div>
    {children}
  </section>;
}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: ReactNode }) {
  return <div className="min-w-0 space-y-1.5">
    <Label className="text-xs font-medium text-[#475569]">{label}{required && <span className="ml-0.5 text-[#F97316]">*</span>}</Label>
    {children}
    {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
  </div>;
}

function Line({ label, value, accent, small }: { label: string; value: string; accent?: boolean; small?: boolean }) {
  return <div className={cn('flex justify-between gap-3', small && 'text-xs')}>
    <span className={cn('min-w-0 truncate', accent ? 'text-emerald-300' : 'text-white/70')}>{label}</span>
    <span className={cn('shrink-0 tabular-nums', accent && 'text-emerald-300')}>{value}</span>
  </div>;
}


function MiniSummary({
  icon: Icon,
  label,
  value,
  detail,
  danger = false,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string;
  detail: string;
  danger?: boolean;
}) {
  return <Card className="border-[#10233F]/10 shadow-none">
    <CardContent className="flex min-h-[76px] items-start gap-2.5 p-3">
      <span className={cn('rounded-lg p-1.5', danger ? 'bg-orange-50 text-orange-600' : 'bg-[#10233F]/[0.07] text-[#10233F]')}><Icon className="h-4 w-4" /></span>
      <div className="min-w-0"><p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className="truncate text-base font-bold text-[#10233F]">{value}</p><p className="mt-0.5 truncate text-[10px] text-muted-foreground">{detail}</p></div>
    </CardContent>
  </Card>;
}
