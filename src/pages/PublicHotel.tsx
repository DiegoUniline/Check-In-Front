import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, setHotelCurrency, currencyCode } from '@/lib/currency';
import {
  Hotel as HotelIcon, MapPin, Phone, Mail, Users, BedDouble, CheckCircle2,
  Loader2, Star, Wifi, Wind, Tv, Coffee, Bath, Calendar as CalIcon, ChevronLeft, ChevronRight,
  Images, CalendarCheck, BookOpenCheck, Minus, Plus, ShieldCheck, ArrowDown,
  MessageCircle, Clock3, Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, addDays, differenceInCalendarDays, eachDayOfInterval, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import { resolverPrecioTemporada, loadTemporadas } from '@/lib/temporadas';
import bannerImg from '@/assets/hotel-banner.jpg';
import room1 from '@/assets/room-1.jpg';
import room2 from '@/assets/room-2.jpg';
import room3 from '@/assets/room-3.jpg';
import room4 from '@/assets/room-4.jpg';

const FALLBACK_ROOMS = [room1, room2, room3, room4];
const fallbackRoomFor = (id: string) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return FALLBACK_ROOMS[h % FALLBACK_ROOMS.length];
};

type Hotel = {
  id: string; nombre: string; slug: string; descripcion_publica: string | null;
  ciudad: string | null; estado: string | null; direccion: string | null;
  telefono: string | null; email: string | null; hora_checkin: string | null;
  hora_checkout: string | null; estrellas: number | null; permite_reservas_online: boolean;
  requiere_anticipo: boolean; porcentaje_anticipo: number; logo_url: string | null;
  timezone: string | null;
};
type Tipo = {
  id: string; nombre: string; descripcion: string | null;
  precio_base: number; precio_persona_extra: number;
  capacidad_adultos: number; capacidad_ninos: number; capacidad_maxima: number;
  amenidades: string[] | null; fotos: string[] | null;
};
type Habitacion = {
  id: string; numero: string; piso: number | null;
  tipo_habitacion_id: string | null; fotos: string[] | null;
};

const amenityIcon = (a: string) => {
  const k = a.toLowerCase();
  if (k.includes('wifi')) return Wifi;
  if (k.includes('aire')) return Wind;
  if (k.includes('tv')) return Tv;
  if (k.includes('café') || k.includes('cafe') || k.includes('desayuno')) return Coffee;
  if (k.includes('baño') || k.includes('bano') || k.includes('jacuzzi')) return Bath;
  return CheckCircle2;
};

const localDateForZone = (timezone?: string | null) => {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
};

export default function PublicHotel() {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [tipos, setTipos] = useState<Tipo[]>([]);
  const [habitaciones, setHabitaciones] = useState<Habitacion[]>([]);
  const [reservas, setReservas] = useState<any[]>([]);

  // Filtros
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [range, setRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), 1),
    to: addDays(new Date(), 2),
  });
  const [adultos, setAdultos] = useState(2);
  const [ninos, setNinos] = useState(0);

  // Galería actual por habitación
  const [carruselIdx, setCarruselIdx] = useState<Record<string, number>>({});

  // Modal de reserva
  const [bookingHab, setBookingHab] = useState<Habitacion | null>(null);
  const [bookingRange, setBookingRange] = useState<DateRange | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [confirmacion, setConfirmacion] = useState<{
    numero: string;
    total: number;
    anticipo: number;
    email: string;
    habitacion: string;
    fechas: string;
    noches: number;
  } | null>(null);
  const [form, setForm] = useState({ nombre: '', apellido_paterno: '', email: '', telefono: '', solicitudes: '' });

  // Carga inicial
  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
      const { data: h } = await (supabase as any).from('hotels_publicos').select('*').eq('slug', slug).maybeSingle();
      if (!h) { setNotFound(true); setLoading(false); return; }
      setHotel(h as any);
      const localToday = parseISO(localDateForZone((h as any).timezone));
      setRange({ from: addDays(localToday, 1), to: addDays(localToday, 2) });
      setHotelCurrency({
        codigo: (h as any).moneda_codigo,
        simbolo: (h as any).moneda_simbolo,
        locale: (h as any).moneda_locale,
      });
      const [{ data: tps }, { data: hbs }] = await Promise.all([
        (supabase.from('tipos_habitacion') as any).select('*').eq('hotel_id', h.id).eq('publicar_web', true),
        (supabase.from('habitaciones') as any).select('id, numero, piso, tipo_habitacion_id, fotos, excluida_publica').eq('hotel_id', h.id).eq('excluida_publica', false),
      ]);
      setTipos((tps || []) as any);
      setHabitaciones((hbs || []) as any);
      loadTemporadas(h.id).catch(() => {});
      setLoading(false);
    })();
  }, [slug]);

  // Carga reservas (todas las futuras) para calendario y disponibilidad
  useEffect(() => {
    if (!hotel) return;
    const load = async () => {
      const { data } = await supabase
        .from('reservas')
        .select('id, habitacion_id, tipo_habitacion_id, fecha_checkin, fecha_checkout, estado')
        .eq('hotel_id', hotel.id)
        .in('estado', ['Pendiente', 'Confirmada', 'CheckIn', 'Hospedado'])
        .gt('fecha_checkout', localDateForZone(hotel.timezone));
      setReservas(data || []);
    };
    load();
    const ch = supabase.channel(`pub-hotel-${hotel.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservas', filter: `hotel_id=eq.${hotel.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [hotel]);

  const tipoMap = useMemo(() => Object.fromEntries(tipos.map(t => [t.id, t])), [tipos]);

  // Días ocupados por habitación
  const diasOcupadosPorHab = useMemo(() => {
    const m: Record<string, Set<string>> = {};
    reservas.forEach((r: any) => {
      if (!r.habitacion_id || !r.fecha_checkin || !r.fecha_checkout) return;
      const start = parseISO(r.fecha_checkin);
      const end = addDays(parseISO(r.fecha_checkout), -1);
      if (end < start) return;
      const arr = (m[r.habitacion_id] ||= new Set());
      eachDayOfInterval({ start, end }).forEach(d => arr.add(format(d, 'yyyy-MM-dd')));
    });
    return m;
  }, [reservas]);

  // Habitaciones visibles (filtro tipo + publicación + capacidad + disponibles en rango)
  const habsVisibles = useMemo(() => {
    return habitaciones.filter((h) => {
      const t = h.tipo_habitacion_id ? tipoMap[h.tipo_habitacion_id] : null;
      if (!t) return false; // no publicada
      if (filtroTipo !== 'todos' && h.tipo_habitacion_id !== filtroTipo) return false;
      if ((adultos + ninos) > t.capacidad_maxima) return false;
      return true;
    });
  }, [habitaciones, tipoMap, filtroTipo, adultos, ninos]);

  const isHabDisponibleEnRango = (habId: string, r?: DateRange) => {
    if (!r?.from || !r?.to) return true;
    const ocupados = diasOcupadosPorHab[habId];
    if (!ocupados) return true;
    const end = addDays(r.to, -1);
    if (end < r.from) return true;
    return !eachDayOfInterval({ start: r.from, end }).some(d => ocupados.has(format(d, 'yyyy-MM-dd')));
  };

  const ns = range?.from && range?.to ? Math.max(0, differenceInCalendarDays(range.to, range.from)) : 0;
  const nsBooking = bookingRange?.from && bookingRange?.to ? Math.max(0, differenceInCalendarDays(bookingRange.to, bookingRange.from)) : 0;

  const habitacionesConFotos = (h: Habitacion) => {
    const t = h.tipo_habitacion_id ? tipoMap[h.tipo_habitacion_id] : null;
    const fotos = (h.fotos && h.fotos.length ? h.fotos : (t?.fotos || []));
    return fotos.length ? fotos : [fallbackRoomFor(h.id)];
  };

  const openBooking = (h: Habitacion) => {
    setBookingHab(h);
    setBookingRange(range);
  };

  const handleBookSubmit = async () => {
    if (!hotel || !bookingHab) return;
    if (!bookingRange?.from || !bookingRange?.to || nsBooking < 1) {
      toast({ title: 'Selecciona fechas', description: 'Elige check-in y check-out en el calendario.', variant: 'destructive' }); return;
    }
    if (!isHabDisponibleEnRango(bookingHab.id, bookingRange)) {
      toast({ title: 'Fechas no disponibles', description: 'Esa habitación tiene reservas en ese rango.', variant: 'destructive' }); return;
    }
    if (!form.nombre.trim() || !form.email.trim() || !form.telefono.trim()) {
      toast({ title: 'Faltan datos', description: 'Nombre, email y teléfono son requeridos.', variant: 'destructive' }); return;
    }
    const tipo = bookingHab.tipo_habitacion_id ? tipoMap[bookingHab.tipo_habitacion_id] : null;
    if (!tipo) return;

    setSubmitting(true);
    try {
      const baseTarifa = Number(tipo.precio_base) || 0;
      const fechaIn = format(bookingRange.from, 'yyyy-MM-dd');
      const { precio: tarifa } = resolverPrecioTemporada(baseTarifa, fechaIn, tipo.id, bookingHab.id, hotel.id);
      const personasExtra = Math.max(0, (adultos + ninos) - tipo.capacidad_adultos);
      const cargoExtra = personasExtra * (Number(tipo.precio_persona_extra) || 0);
      const subtotal = tarifa * nsBooking + cargoExtra * nsBooking;
      const total = subtotal;
      const anticipo = hotel.requiere_anticipo
        ? Math.round(total * (Number(hotel.porcentaje_anticipo) || 0)) / 100
        : 0;

      // Cliente y reserva se crean en una sola transacción. El trigger de la DB
      // vuelve a comprobar disponibilidad para cerrar carreras entre dos usuarios.
      const { data: reservaCreada, error: errR } = await (supabase as any).rpc('create_public_reservation', {
        p_hotel_id: hotel.id,
        p_cliente: {
          nombre: form.nombre.trim(),
          apellido_paterno: form.apellido_paterno.trim(),
          email: form.email.trim(),
          telefono: form.telefono.trim(),
        },
        p_reserva: {
          habitacion_id: bookingHab.id,
          tipo_habitacion_id: tipo.id,
          fecha_checkin: format(bookingRange.from, 'yyyy-MM-dd'),
          fecha_checkout: format(bookingRange.to, 'yyyy-MM-dd'),
          adultos,
          ninos,
          tarifa_noche: tarifa,
          personas_extra: personasExtra,
          cargo_persona_extra: Number(tipo.precio_persona_extra) || 0,
          solicitudes_especiales: form.solicitudes || '',
        },
      });
      if (errR) throw errR;

      setConfirmacion({
        numero: reservaCreada?.numero_reserva || '',
        total,
        anticipo,
        email: form.email.trim(),
        habitacion: `${tipo.nombre} · Habitación ${bookingHab.numero}`,
        fechas: `${format(bookingRange.from, 'd MMM', { locale: es })} — ${format(bookingRange.to, 'd MMM yyyy', { locale: es })}`,
        noches: nsBooking,
      });
      setBookingHab(null);
      setForm({ nombre: '', apellido_paterno: '', email: '', telefono: '', solicitudes: '' });
    } catch (e: any) {
      toast({ title: 'No se pudo reservar', description: e.message || 'Intenta de nuevo.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="public-page h-[100dvh] overflow-y-auto flex items-center justify-center bg-stone-50"><Loader2 className="h-6 w-6 animate-spin text-stone-400" /></div>;
  }
  if (notFound || !hotel || !hotel.permite_reservas_online) {
    return (
      <div className="public-page h-[100dvh] overflow-y-auto flex flex-col items-center justify-center p-6 text-center gap-4 bg-stone-50 text-stone-900">
        <HotelIcon className="h-10 w-10 text-stone-400" />
        <h1 className="text-2xl font-serif">Hotel no disponible</h1>
        <p className="text-stone-600 max-w-md">Este hotel no tiene activadas las reservas en línea o el enlace no es correcto.</p>
        <Button asChild variant="outline"><Link to="/">Volver al inicio</Link></Button>
      </div>
    );
  }

  const todayHotel = parseISO(localDateForZone(hotel.timezone));
  const heroImage = habitaciones.length ? habitacionesConFotos(habitaciones[0])[0] : bannerImg;
  const habitacionesOrdenadas = [...habsVisibles].sort((a, b) =>
    Number(isHabDisponibleEnRango(b.id, range)) - Number(isHabDisponibleEnRango(a.id, range)),
  );
  const disponiblesCount = habitacionesOrdenadas.filter((h) => isHabDisponibleEnRango(h.id, range)).length;
  const locationLabel = [hotel.ciudad, hotel.estado].filter(Boolean).join(', ');

  return (
    <div data-scroll-container className="public-page h-[100dvh] overflow-y-auto overscroll-contain bg-[#f7f6f2] text-stone-900 [color-scheme:light] [&_input]:bg-white [&_input]:text-stone-900 [&_input]:border-stone-200 [&_textarea]:bg-white [&_textarea]:text-stone-900 [&_textarea]:border-stone-200 [&_[role=combobox]]:bg-white [&_[role=combobox]]:text-stone-900">
      {/* Hero */}
      <header className="relative min-h-[560px] overflow-hidden text-white md:min-h-[680px]">
        <img
          src={heroImage}
          alt={`Hospédate en ${hotel.nombre}`}
          className="absolute inset-0 h-full w-full object-cover scale-[1.02]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(12,18,16,.92)_0%,rgba(12,18,16,.68)_46%,rgba(12,18,16,.22)_78%,rgba(12,18,16,.42)_100%)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/35" />

        <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
          <div className="flex min-w-0 items-center gap-3">
            {hotel.logo_url ? (
              <img src={hotel.logo_url} alt={hotel.nombre} className="h-11 w-11 rounded-xl bg-white object-cover shadow-lg ring-1 ring-white/40" />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/12 ring-1 ring-white/25 backdrop-blur-md">
                <HotelIcon className="h-5 w-5" />
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-wide sm:text-base">{hotel.nombre}</p>
              {locationLabel && <p className="truncate text-[11px] text-white/65">{locationLabel}</p>}
            </div>
          </div>
          {hotel.telefono && (
            <a href={`tel:${hotel.telefono}`} className="hidden items-center gap-2 rounded-full border border-white/20 bg-black/15 px-4 py-2 text-sm font-medium text-white backdrop-blur-md transition hover:bg-white hover:text-stone-950 sm:flex">
              <Phone className="h-4 w-4" /> Contactar
            </a>
          )}
        </nav>

        <div className="relative z-[1] mx-auto flex max-w-7xl items-center px-5 pb-28 pt-16 sm:px-8 md:pt-24 lg:px-10">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-medium backdrop-blur-md">
              <ShieldCheck className="h-4 w-4 text-emerald-300" /> Reserva directa con el hotel
            </div>
            {hotel.estrellas ? (
              <div className="mb-3 flex gap-1">
                {Array.from({ length: hotel.estrellas }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-amber-300 text-amber-300" />
                ))}
              </div>
            ) : null}
            <h1 className="max-w-3xl font-serif text-4xl font-light leading-[1.04] tracking-[-0.035em] sm:text-6xl md:text-7xl">
              Tu próxima estancia empieza aquí.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/78 sm:text-lg">
              {hotel.descripcion_publica || `Descubre una estancia cómoda y reserva directamente en ${hotel.nombre}.`}
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Button onClick={() => document.getElementById('buscar-estancia')?.scrollIntoView({ behavior: 'smooth' })} className="h-12 rounded-full bg-white px-6 font-semibold text-stone-950 shadow-xl hover:bg-stone-100">
                Consultar disponibilidad <ArrowDown className="ml-2 h-4 w-4" />
              </Button>
              {locationLabel && (
                <span className="flex items-center gap-2 px-1 text-sm text-white/75"><MapPin className="h-4 w-4" />{locationLabel}</span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Filtros */}
      <section id="buscar-estancia" className="relative z-10 mx-auto -mt-14 max-w-7xl scroll-mt-5 px-4 sm:px-8 lg:px-10">
        <div className="rounded-[28px] border border-white/70 bg-white/95 p-3 shadow-[0_24px_70px_-28px_rgba(28,25,23,.42)] backdrop-blur-xl md:p-4">
          <div className="mb-3 flex items-center justify-between px-2 pt-1 md:hidden">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.18em] text-emerald-700">Tu estancia</p>
              <p className="font-serif text-xl">Encuentra tu habitación</p>
            </div>
            {ns > 0 && <Badge className="rounded-full bg-stone-900 px-3 text-white hover:bg-stone-900">{ns} {ns === 1 ? 'noche' : 'noches'}</Badge>}
          </div>
          <div className="grid grid-cols-1 items-center gap-2 md:grid-cols-12">
          <div className="rounded-2xl bg-stone-50 px-4 py-3 md:col-span-3">
            <Label className="text-[10px] font-bold uppercase tracking-[.16em] text-stone-400">Habitación</Label>
            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
              <SelectTrigger className="mt-0.5 h-8 border-0 bg-transparent p-0 text-[15px] font-semibold shadow-none focus:ring-0"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="todos">Todos los tipos</SelectItem>
                {tipos.map(t => <SelectItem key={t.id} value={t.id}>{t.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-2xl bg-stone-50 px-4 py-3 md:col-span-4">
            <Label className="text-[10px] font-bold uppercase tracking-[.16em] text-stone-400">Llegada y salida</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" className={cn("mt-0.5 h-8 w-full justify-start p-0 text-[15px] font-semibold hover:bg-transparent", !range?.from && "text-stone-400")}>
                  <CalIcon className="mr-2 h-4 w-4 text-emerald-700" />
                  {range?.from ? (
                    range.to ? (
                      <>{format(range.from, "d MMM", { locale: es })} <span className="mx-1.5 text-stone-300">—</span> {format(range.to, "d MMM yyyy", { locale: es })}</>
                    ) : format(range.from, "PPP", { locale: es })
                  ) : <span>Selecciona fechas</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-white" align="start">
                <Calendar
                  mode="range"
                  selected={range}
                  onSelect={setRange}
                  numberOfMonths={2}
                  disabled={(d) => d < todayHotel}
                  locale={es}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="rounded-2xl bg-stone-50 px-4 py-3 md:col-span-2">
            <Label className="text-[10px] font-bold uppercase tracking-[.16em] text-stone-400">Adultos</Label>
            <div className="mt-1 flex h-8 items-center justify-between">
              <button type="button" aria-label="Quitar adulto" onClick={() => setAdultos(Math.max(1, adultos - 1))} className="flex h-7 w-7 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-600 transition hover:border-stone-400"><Minus className="h-3.5 w-3.5" /></button>
              <span className="text-base font-semibold">{adultos}</span>
              <button type="button" aria-label="Agregar adulto" onClick={() => setAdultos(adultos + 1)} className="flex h-7 w-7 items-center justify-center rounded-full bg-stone-900 text-white transition hover:bg-emerald-800"><Plus className="h-3.5 w-3.5" /></button>
            </div>
          </div>
          <div className="rounded-2xl bg-stone-50 px-4 py-3 md:col-span-2">
            <Label className="text-[10px] font-bold uppercase tracking-[.16em] text-stone-400">Niños</Label>
            <div className="mt-1 flex h-8 items-center justify-between">
              <button type="button" aria-label="Quitar niño" onClick={() => setNinos(Math.max(0, ninos - 1))} className="flex h-7 w-7 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-600 transition hover:border-stone-400"><Minus className="h-3.5 w-3.5" /></button>
              <span className="text-base font-semibold">{ninos}</span>
              <button type="button" aria-label="Agregar niño" onClick={() => setNinos(ninos + 1)} className="flex h-7 w-7 items-center justify-center rounded-full bg-stone-900 text-white transition hover:bg-emerald-800"><Plus className="h-3.5 w-3.5" /></button>
            </div>
          </div>
          <div className="hidden justify-center md:col-span-1 md:flex">
            <div className="text-center">
              <p className="text-xl font-bold text-stone-900">{ns || '—'}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">{ns === 1 ? 'noche' : 'noches'}</p>
            </div>
          </div>
          </div>
        </div>
      </section>

      {/* Confianza */}
      <section className="mx-auto max-w-7xl px-5 pb-4 pt-8 sm:px-8 lg:px-10">
        <div className="grid gap-3 rounded-3xl border border-stone-200/70 bg-white/60 p-4 sm:grid-cols-3 sm:p-5">
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"><ShieldCheck className="h-5 w-5" /></div>
            <div><p className="text-sm font-semibold">Reserva directa</p><p className="text-xs text-stone-500">Sin intermediarios</p></div>
          </div>
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-700"><MessageCircle className="h-5 w-5" /></div>
            <div><p className="text-sm font-semibold">Atención personal</p><p className="text-xs text-stone-500">Confirmación por el hotel</p></div>
          </div>
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-700"><Clock3 className="h-5 w-5" /></div>
            <div><p className="text-sm font-semibold">Proceso rápido</p><p className="text-xs text-stone-500">Sin cobro en este paso</p></div>
          </div>
        </div>
      </section>

      {/* Habitaciones */}
      <section id="habitaciones" className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:px-10 lg:py-16">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-emerald-700"><Sparkles className="h-3.5 w-3.5" />Tu espacio ideal</div>
            <h2 className="font-serif text-3xl font-light tracking-tight md:text-5xl">Elige cómo quieres descansar</h2>
            <p className="mt-2 max-w-2xl text-sm text-stone-500 md:text-base">Compara espacios, amenidades y tarifas. Tu solicitud se envía directamente al hotel.</p>
          </div>
          <span className="w-fit rounded-full bg-white px-4 py-2 text-sm font-medium text-stone-600 shadow-sm ring-1 ring-stone-200">
            <span className="font-bold text-emerald-700">{disponiblesCount}</span> disponible{disponiblesCount !== 1 ? 's' : ''}
          </span>
        </div>

        {habsVisibles.length === 0 && (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-12 text-center text-stone-500">
            <BedDouble className="h-10 w-10 mx-auto mb-3 text-stone-400" />
            No hay habitaciones que coincidan con tu búsqueda. Prueba con otro tipo o fechas.
          </div>
        )}

        <div className="grid grid-cols-1 gap-7 lg:grid-cols-2">
          {habitacionesOrdenadas.map((h) => {
            const t = h.tipo_habitacion_id ? tipoMap[h.tipo_habitacion_id] : null;
            if (!t) return null;
            const fotos = habitacionesConFotos(h);
            const idx = carruselIdx[h.id] || 0;
            const fotoActual = fotos[idx];
            const disponible = isHabDisponibleEnRango(h.id, range);
            const precioBase = Number(t.precio_base) || 0;
            const fechaRefTarjeta = range?.from ? format(range.from, 'yyyy-MM-dd') : localDateForZone(hotel.timezone);
            const { precio, temporada: tempTarjeta } = resolverPrecioTemporada(precioBase, fechaRefTarjeta, t.id, h.id, hotel?.id);
            const personasExtra = Math.max(0, (adultos + ninos) - t.capacidad_adultos);
            const extraPorNoche = personasExtra * (Number(t.precio_persona_extra) || 0);
            const total = (precio + extraPorNoche) * Math.max(1, ns || 1);
            return (
              <Card key={h.id} className="group flex flex-col overflow-hidden rounded-[28px] border border-stone-200/80 bg-white shadow-[0_18px_55px_-38px_rgba(28,25,23,.7)] transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_28px_70px_-35px_rgba(28,25,23,.45)]">
                <div className="relative aspect-[16/10] cursor-pointer overflow-hidden bg-gradient-to-br from-stone-100 to-stone-200" onClick={() => openBooking(h)}>
                  {fotoActual ? (
                    <img src={fotoActual} alt={`${t.nombre} ${h.numero}`} className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-[1.045]" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><BedDouble className="h-14 w-14 text-stone-300" /></div>
                  )}
                  {fotos.length > 1 && (
                    <>
                      <button onClick={(e) => { e.stopPropagation(); setCarruselIdx({ ...carruselIdx, [h.id]: (idx - 1 + fotos.length) % fotos.length }); }}
                        className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-stone-800 shadow-md backdrop-blur transition hover:bg-white">
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setCarruselIdx({ ...carruselIdx, [h.id]: (idx + 1) % fotos.length }); }}
                        className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-stone-800 shadow-md backdrop-blur transition hover:bg-white">
                        <ChevronRight className="h-5 w-5" />
                      </button>
                      <div className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-stone-950/65 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-md">
                        <Images className="h-3.5 w-3.5" />{fotos.length}
                      </div>
                    </>
                  )}
                  {range?.from && range?.to && !disponible && (
                    <div className="absolute inset-0 flex items-center justify-center bg-stone-950/55 backdrop-blur-[1px]">
                      <Badge className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-stone-900 shadow-xl hover:bg-white">No disponible en estas fechas</Badge>
                    </div>
                  )}
                </div>
                <CardContent className="flex flex-1 flex-col gap-4 p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-serif text-2xl font-medium leading-snug text-stone-900">{t.nombre}</h3>
                      <div className="mt-1 text-xs font-medium uppercase tracking-wider text-stone-400">Habitación {h.numero}{h.piso ? ` · Piso ${h.piso}` : ''}</div>
                    </div>
                    {tempTarjeta && <Badge variant="outline" className="shrink-0 rounded-full border-amber-200 bg-amber-50 text-amber-800">{tempTarjeta.nombre}</Badge>}
                  </div>

                  {t.descripcion && <p className="line-clamp-2 text-sm leading-relaxed text-stone-600">{t.descripcion}</p>}

                  <ul className="flex flex-wrap gap-2 text-xs font-medium text-stone-600">
                    <li className="flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1.5"><Users className="h-3.5 w-3.5 text-emerald-700" />Hasta {t.capacidad_maxima} {t.capacidad_maxima === 1 ? 'persona' : 'personas'}</li>
                    <li className="flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1.5"><BedDouble className="h-3.5 w-3.5 text-emerald-700" />{t.capacidad_adultos} adulto{t.capacidad_adultos !== 1 ? 's' : ''}{t.capacidad_ninos > 0 ? ` + ${t.capacidad_ninos} niño${t.capacidad_ninos !== 1 ? 's' : ''}` : ''}</li>
                    {(t.amenidades || []).slice(0, 3).map((a) => {
                      const Icon = amenityIcon(a);
                      return (
                        <li key={a} className="flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1.5"><Icon className="h-3.5 w-3.5 text-emerald-700" />{a}</li>
                      );
                    })}
                    {(t.amenidades?.length || 0) > 3 && (
                      <li className="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-800">+{(t.amenidades!.length - 3)} más</li>
                    )}
                  </ul>

                  <div className="mt-auto flex items-end justify-between gap-4 border-t border-stone-100 pt-4">
                    <div>
                      <div className="text-[11px] font-medium uppercase tracking-wider text-stone-400">Desde</div>
                      <div className="text-2xl font-bold leading-tight text-stone-900">{formatCurrency(precio)} <span className="text-xs font-semibold text-stone-400">{currencyCode()}</span></div>
                      <div className="text-[11px] text-stone-500">por noche{ns > 0 ? ` · ${formatCurrency(total)} por ${ns} ${ns === 1 ? 'noche' : 'noches'}` : ''}</div>
                    </div>
                    <Button
                      onClick={() => openBooking(h)}
                      className={cn("h-12 shrink-0 rounded-full px-5 font-semibold text-white", disponible ? "bg-stone-900 hover:bg-emerald-800" : "bg-stone-500 hover:bg-stone-600")}
                    >
                      {disponible ? <BookOpenCheck className="mr-2 h-4 w-4" /> : <CalendarCheck className="mr-2 h-4 w-4" />}
                      {disponible ? 'Elegir' : 'Cambiar fechas'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#17201d] text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:grid-cols-2 sm:px-8 lg:grid-cols-3 lg:px-10">
          <div>
            <div className="flex items-center gap-3">
              {hotel.logo_url ? <img src={hotel.logo_url} alt="" className="h-11 w-11 rounded-xl bg-white object-cover" /> : <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10"><HotelIcon className="h-5 w-5" /></div>}
              <div><p className="font-serif text-lg">{hotel.nombre}</p>{locationLabel && <p className="text-xs text-white/55">{locationLabel}</p>}</div>
            </div>
          </div>
          <div className="space-y-2 text-sm text-white/65">
            {hotel.direccion && <p className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />{hotel.direccion}</p>}
            {hotel.telefono && <a href={`tel:${hotel.telefono}`} className="flex gap-2 transition hover:text-white"><Phone className="h-4 w-4 text-emerald-300" />{hotel.telefono}</a>}
            {hotel.email && <a href={`mailto:${hotel.email}`} className="flex gap-2 transition hover:text-white"><Mail className="h-4 w-4 text-emerald-300" />{hotel.email}</a>}
          </div>
          <div className="text-sm text-white/65 lg:text-right">
            {hotel.hora_checkin && <p>Check-in desde {hotel.hora_checkin}</p>}
            {hotel.hora_checkout && <p>Check-out hasta {hotel.hora_checkout}</p>}
            <p className="mt-4 text-xs text-white/35">© {new Date().getFullYear()} {hotel.nombre}</p>
          </div>
        </div>
      </footer>

      {/* Modal de reserva con calendario */}
      <Dialog open={!!bookingHab} onOpenChange={(o) => !o && setBookingHab(null)}>
        <DialogContent className="max-h-[94vh] w-[calc(100%-1.25rem)] max-w-4xl overflow-y-auto rounded-[28px] border-0 bg-white p-0 text-stone-900 shadow-2xl sm:w-full">
          {bookingHab && (() => {
            const t = bookingHab.tipo_habitacion_id ? tipoMap[bookingHab.tipo_habitacion_id] : null;
            if (!t) return null;
            const fotos = habitacionesConFotos(bookingHab);
            const ocupados = diasOcupadosPorHab[bookingHab.id] || new Set();
            const disponible = isHabDisponibleEnRango(bookingHab.id, bookingRange);
            const tarifaBase = Number(t.precio_base) || 0;
            const fechaRef = bookingRange?.from ? format(bookingRange.from, 'yyyy-MM-dd') : localDateForZone(hotel.timezone);
            const { precio: tarifa, temporada: tempReserva } = resolverPrecioTemporada(tarifaBase, fechaRef, t.id, bookingHab.id, hotel?.id);
            const personasExtra = Math.max(0, (adultos + ninos) - t.capacidad_adultos);
            const extraPorNoche = personasExtra * (Number(t.precio_persona_extra) || 0);
            const totalEstim = (tarifa + extraPorNoche) * nsBooking;
            return (
              <>
                <div className="relative aspect-[16/7] min-h-[190px] overflow-hidden bg-stone-100 sm:min-h-0">
                  {fotos[0] && <img src={fotos[0]} alt={t.nombre} className="h-full w-full object-cover" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-7">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-[.16em] text-white/65">Habitación {bookingHab.numero}{bookingHab.piso ? ` · Piso ${bookingHab.piso}` : ''}</p>
                    <DialogTitle className="font-serif text-3xl font-light sm:text-4xl">{t.nombre}</DialogTitle>
                    <DialogDescription className="mt-1 text-white/70">Completa tus datos para enviar la solicitud directamente al hotel.</DialogDescription>
                  </div>
                </div>

                <div className="grid gap-7 p-5 sm:p-7 md:grid-cols-[.92fr_1.08fr]">
                  <div>
                    <div className="mb-3 text-xs font-bold uppercase tracking-[.16em] text-stone-400">Elige tus fechas</div>
                    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-2">
                      <Calendar
                        mode="range"
                        selected={bookingRange}
                        onSelect={setBookingRange}
                        numberOfMonths={1}
                        disabled={[
                          (d) => d < todayHotel,
                          (d) => ocupados.has(format(d, 'yyyy-MM-dd')),
                        ]}
                        modifiers={{ reservado: (d) => ocupados.has(format(d, 'yyyy-MM-dd')) }}
                        modifiersClassNames={{ reservado: 'bg-rose-100 text-rose-700 line-through' }}
                        locale={es}
                        className={cn("p-2 pointer-events-auto")}
                      />
                    </div>
                    <div className="mt-3 flex items-center gap-3 text-xs text-stone-500">
                      <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-rose-100 border border-rose-200" />Reservado</span>
                      <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-stone-900" />Tu selección</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                      <span className="flex items-center gap-2 font-medium"><Users className="h-4 w-4" />{adultos} adulto{adultos !== 1 ? 's' : ''}{ninos ? ` · ${ninos} niño${ninos !== 1 ? 's' : ''}` : ''}</span>
                      <span className="font-semibold">{nsBooking} {nsBooking === 1 ? 'noche' : 'noches'}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs font-semibold">Nombre *</Label>
                        <Input autoComplete="given-name" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="mt-1 h-11 rounded-xl border-stone-200" />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold">Apellido</Label>
                        <Input autoComplete="family-name" value={form.apellido_paterno} onChange={(e) => setForm({ ...form, apellido_paterno: e.target.value })} className="mt-1 h-11 rounded-xl border-stone-200" />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">Correo electrónico *</Label>
                      <Input autoComplete="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1 h-11 rounded-xl border-stone-200" placeholder="nombre@correo.com" />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">Teléfono *</Label>
                      <Input autoComplete="tel" inputMode="tel" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} className="mt-1 h-11 rounded-xl border-stone-200" placeholder="Tu número de contacto" />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">¿Podemos preparar algo especial?</Label>
                      <Textarea rows={2} value={form.solicitudes} onChange={(e) => setForm({ ...form, solicitudes: e.target.value })} className="mt-1 rounded-xl border-stone-200" placeholder="Opcional" />
                    </div>

                    <div className="space-y-1.5 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm">
                      <div className="flex justify-between text-stone-600"><span>Tarifa por noche</span><span className="font-medium text-stone-900">{formatCurrency(tarifa)}</span></div>
                      {tempReserva && (
                        <div className="flex justify-between text-emerald-700 text-xs">
                          <span className="italic">Temporada: {tempReserva.nombre}</span>
                          <span>Tarifa base {formatCurrency(tarifaBase)}</span>
                        </div>
                      )}
                      {extraPorNoche > 0 && <div className="flex justify-between text-stone-600"><span>Personas extra por noche</span><span className="font-medium text-stone-900">{formatCurrency(extraPorNoche)}</span></div>}
                      <div className="flex justify-between text-stone-600"><span>Noches</span><span className="font-medium text-stone-900">{nsBooking}</span></div>
                      <div className="mt-2 flex justify-between border-t border-stone-200 pt-3 font-serif text-xl">
                        <span>Total estimado</span><span>{formatCurrency(totalEstim)}</span>
                      </div>
                      {hotel.requiere_anticipo && nsBooking > 0 && (
                        <div className="flex justify-between text-amber-700 text-xs pt-1">
                          <span>Anticipo ({hotel.porcentaje_anticipo}%)</span>
                          <span>{formatCurrency(Math.round(totalEstim * Number(hotel.porcentaje_anticipo) / 100))}</span>
                        </div>
                      )}
                      {bookingRange?.from && bookingRange?.to && !disponible && (
                        <div className="text-xs text-rose-600 pt-1">Estas fechas chocan con una reserva existente.</div>
                      )}
                    </div>
                  </div>
                </div>

                <DialogFooter className="border-t border-stone-100 bg-stone-50 px-5 py-4 sm:px-7">
                  <Button variant="ghost" onClick={() => setBookingHab(null)} disabled={submitting} className="rounded-full">Cancelar</Button>
                  <Button onClick={handleBookSubmit} disabled={submitting || nsBooking < 1 || !disponible} className="h-12 rounded-full bg-stone-900 px-6 font-semibold text-white hover:bg-emerald-800">
                    {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Enviar solicitud de reserva
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Confirmación */}
      <Dialog open={!!confirmacion} onOpenChange={(o) => !o && setConfirmacion(null)}>
        <DialogContent className="w-[calc(100%-1.25rem)] max-w-md overflow-hidden rounded-[28px] border-0 bg-white p-0 text-stone-900 shadow-2xl sm:w-full">
          <div className="bg-[#17201d] px-6 pb-6 pt-8 text-center text-white">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-400/15 ring-1 ring-emerald-300/30">
              <CheckCircle2 className="h-7 w-7 text-emerald-300" />
            </div>
            <DialogHeader>
            <DialogTitle className="justify-center font-serif text-3xl font-light">
              ¡Solicitud recibida!
            </DialogTitle>
            <DialogDescription className="mt-2 text-white/65">El hotel revisará la solicitud y se pondrá en contacto contigo para confirmarla.</DialogDescription>
          </DialogHeader>
          </div>
          {confirmacion && (
            <div className="space-y-4 p-6 text-sm">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-center">
                <div className="text-[10px] font-bold uppercase tracking-[.18em] text-emerald-700">Número de reserva</div>
                <div className="mt-1 text-2xl font-bold tracking-wider text-emerald-950">{confirmacion.numero}</div>
              </div>
              <div className="space-y-2.5 rounded-2xl border border-stone-200 p-4">
                <p className="font-semibold text-stone-900">{confirmacion.habitacion}</p>
                <div className="flex justify-between text-stone-500"><span>{confirmacion.fechas}</span><span>{confirmacion.noches} {confirmacion.noches === 1 ? 'noche' : 'noches'}</span></div>
                <div className="flex justify-between border-t border-stone-100 pt-2.5"><span className="text-stone-500">Total estimado</span><span className="font-bold">{formatCurrency(confirmacion.total)}</span></div>
              </div>
              {confirmacion.anticipo > 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <div className="font-semibold mb-1 text-amber-900">Anticipo solicitado: {formatCurrency(confirmacion.anticipo)}</div>
                  <p className="text-xs text-amber-800/80">El hotel te contactará para coordinar el método de pago del anticipo y confirmar tu reserva.</p>
                </div>
              )}
              <p className="text-center text-xs leading-relaxed text-stone-500">Guarda tu número de reserva. Correo registrado: <span className="font-medium text-stone-700">{confirmacion.email}</span>.</p>
              <Button onClick={() => setConfirmacion(null)} className="h-12 w-full rounded-full bg-stone-900 font-semibold text-white hover:bg-emerald-800">Listo</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
