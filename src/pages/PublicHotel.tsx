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
  Maximize2, Images, Info,
  CalendarCheck, BookOpenCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, addDays, differenceInCalendarDays, eachDayOfInterval, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
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
  const [confirmacion, setConfirmacion] = useState<{ numero: string; total: number; anticipo: number } | null>(null);
  const [form, setForm] = useState({ nombre: '', apellido_paterno: '', email: '', telefono: '', solicitudes: '' });

  // Carga inicial
  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
      const { data: h } = await (supabase.from('hotels') as any).select('*').eq('slug', slug).maybeSingle();
      if (!h) { setNotFound(true); setLoading(false); return; }
      setHotel(h as any);
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
        .in('estado', ['Pendiente', 'Confirmada', 'CheckIn'])
        .gte('fecha_checkout', new Date().toISOString().slice(0, 10));
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
      const { data: cliente, error: errC } = await supabase.from('clientes').insert({
        hotel_id: hotel.id,
        nombre: form.nombre.trim(),
        apellido_paterno: form.apellido_paterno.trim() || null,
        email: form.email.trim(),
        telefono: form.telefono.trim(),
      }).select().single();
      if (errC) throw errC;

      const tarifa = Number(tipo.precio_base) || 0;
      const personasExtra = Math.max(0, (adultos + ninos) - tipo.capacidad_adultos);
      const cargoExtra = personasExtra * (Number(tipo.precio_persona_extra) || 0);
      const subtotal = tarifa * nsBooking + cargoExtra * nsBooking;
      const total = subtotal;
      const anticipo = hotel.requiere_anticipo
        ? Math.round(total * (Number(hotel.porcentaje_anticipo) || 0)) / 100
        : 0;

      // El numero_reserva lo asigna un trigger BEFORE INSERT en la DB
      // (RES-AAAA-XXXX con secuencia por hotel/año)
      const { error: errR } = await supabase.from('reservas').insert({
        hotel_id: hotel.id,
        cliente_id: cliente.id,
        habitacion_id: bookingHab.id,
        tipo_habitacion_id: tipo.id,
        fecha_checkin: format(bookingRange.from, 'yyyy-MM-dd'),
        fecha_checkout: format(bookingRange.to, 'yyyy-MM-dd'),
        adultos, ninos,
        noches: nsBooking,
        tarifa_noche: tarifa,
        subtotal_hospedaje: subtotal,
        total,
        saldo_pendiente: total,
        estado: 'Pendiente',
        origen: 'Web',
        solicitudes_especiales: form.solicitudes || null,
      });
      if (errR) throw errR;

      setConfirmacion({ numero, total, anticipo });
      setBookingHab(null);
      setForm({ nombre: '', apellido_paterno: '', email: '', telefono: '', solicitudes: '' });
    } catch (e: any) {
      toast({ title: 'No se pudo reservar', description: e.message || 'Intenta de nuevo.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-stone-50 public-page"><Loader2 className="h-6 w-6 animate-spin text-stone-400" /></div>;
  }
  if (notFound || !hotel || !hotel.permite_reservas_online) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center gap-4 bg-stone-50 text-stone-900">
        <HotelIcon className="h-10 w-10 text-stone-400" />
        <h1 className="text-2xl font-serif">Hotel no disponible</h1>
        <p className="text-stone-600 max-w-md">Este hotel no tiene activadas las reservas en línea o el enlace no es correcto.</p>
        <Button asChild variant="outline"><Link to="/">Volver al inicio</Link></Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 [color-scheme:light] [&_input]:bg-white [&_input]:text-stone-900 [&_input]:border-stone-200 [&_textarea]:bg-white [&_textarea]:text-stone-900 [&_textarea]:border-stone-200 [&_[role=combobox]]:bg-white [&_[role=combobox]]:text-stone-900">
      {/* Hero */}
      <header className="relative overflow-hidden text-stone-50">
        <img
          src={bannerImg}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-stone-950/70 via-stone-900/55 to-stone-950/80" />
        <div className="container mx-auto px-6 py-12 md:py-20 relative">
          <div className="flex items-start gap-5">
            {hotel.logo_url ? (
              <img src={hotel.logo_url} alt={hotel.nombre} className="h-16 w-16 md:h-20 md:w-20 rounded-2xl object-cover ring-2 ring-stone-50/20 shadow-2xl" />
            ) : (
              <div className="h-16 w-16 md:h-20 md:w-20 rounded-2xl bg-stone-50/10 flex items-center justify-center ring-2 ring-stone-50/20">
                <HotelIcon className="h-8 w-8 text-stone-50" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              {hotel.estrellas ? (
                <div className="flex gap-0.5 mb-2">
                  {Array.from({ length: hotel.estrellas }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
                  ))}
                </div>
              ) : null}
              <h1 className="font-serif text-3xl md:text-5xl font-light tracking-tight">{hotel.nombre}</h1>
              <div className="text-stone-300 mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
                {(hotel.ciudad || hotel.estado) && (
                  <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{[hotel.ciudad, hotel.estado].filter(Boolean).join(', ')}</span>
                )}
                {hotel.telefono && <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{hotel.telefono}</span>}
                {hotel.email && <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{hotel.email}</span>}
              </div>
            </div>
          </div>
          {hotel.descripcion_publica && (
            <p className="mt-6 max-w-3xl text-stone-200/90 leading-relaxed">{hotel.descripcion_publica}</p>
          )}
        </div>
      </header>

      {/* Filtros */}
      <section className="container mx-auto px-6 -mt-8 relative z-10">
        <div className="bg-white rounded-2xl shadow-xl border border-stone-200/70 p-4 md:p-5 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-3">
            <Label className="text-[11px] uppercase tracking-wider text-stone-500 font-medium">Tipo</Label>
            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
              <SelectTrigger className="mt-1 h-11 border-stone-200"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="todos">Todos los tipos</SelectItem>
                {tipos.map(t => <SelectItem key={t.id} value={t.id}>{t.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-4">
            <Label className="text-[11px] uppercase tracking-wider text-stone-500 font-medium">Fechas</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("mt-1 h-11 w-full justify-start font-normal border-stone-200", !range?.from && "text-stone-400")}>
                  <CalIcon className="h-4 w-4 mr-2" />
                  {range?.from ? (
                    range.to ? (
                      <>{format(range.from, "d MMM", { locale: es })} → {format(range.to, "d MMM yyyy", { locale: es })}</>
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
                  disabled={(d) => d < addDays(new Date(), -1)}
                  locale={es}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="md:col-span-2">
            <Label className="text-[11px] uppercase tracking-wider text-stone-500 font-medium">Adultos</Label>
            <Input type="number" min={1} value={adultos} onChange={(e) => setAdultos(parseInt(e.target.value) || 1)} className="mt-1 h-11 border-stone-200" />
          </div>
          <div className="md:col-span-2">
            <Label className="text-[11px] uppercase tracking-wider text-stone-500 font-medium">Niños</Label>
            <Input type="number" min={0} value={ninos} onChange={(e) => setNinos(parseInt(e.target.value) || 0)} className="mt-1 h-11 border-stone-200" />
          </div>
          <div className="md:col-span-1 flex md:justify-end">
            <div className="text-sm text-stone-500 text-right md:pb-2.5">
              {ns > 0 ? <><span className="font-semibold text-stone-800">{ns}</span> {ns === 1 ? 'noche' : 'noches'}</> : '—'}
            </div>
          </div>
        </div>
      </section>

      {/* Habitaciones */}
      <section className="container mx-auto px-6 py-12">
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="font-serif text-2xl md:text-3xl font-light">Habitaciones disponibles</h2>
          <span className="text-sm text-stone-500">{habsVisibles.length} habitación{habsVisibles.length !== 1 ? 'es' : ''}</span>
        </div>

        {habsVisibles.length === 0 && (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-12 text-center text-stone-500">
            <BedDouble className="h-10 w-10 mx-auto mb-3 text-stone-400" />
            No hay habitaciones que coincidan con tu búsqueda. Prueba con otro tipo o fechas.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {habsVisibles.map((h) => {
            const t = h.tipo_habitacion_id ? tipoMap[h.tipo_habitacion_id] : null;
            if (!t) return null;
            const fotos = habitacionesConFotos(h);
            const idx = carruselIdx[h.id] || 0;
            const fotoActual = fotos[idx];
            const disponible = isHabDisponibleEnRango(h.id, range);
            const precio = Number(t.precio_base) || 0;
            const precioOriginal = Math.round(precio * 1.18);
            const total = precio * Math.max(1, ns || 1);
            return (
              <Card key={h.id} className="group flex flex-col overflow-hidden border border-stone-200 bg-white rounded-xl hover:shadow-2xl transition-all duration-300">
                <div className="relative aspect-[4/3] bg-gradient-to-br from-stone-100 to-stone-200 overflow-hidden cursor-pointer" onClick={() => openBooking(h)}>
                  {fotoActual ? (
                    <img src={fotoActual} alt={`${t.nombre} ${h.numero}`} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><BedDouble className="h-14 w-14 text-stone-300" /></div>
                  )}
                  {fotos.length > 1 && (
                    <>
                      <button onClick={(e) => { e.stopPropagation(); setCarruselIdx({ ...carruselIdx, [h.id]: (idx - 1 + fotos.length) % fotos.length }); }}
                        className="absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/95 hover:bg-white flex items-center justify-center shadow-md text-blue-700 transition">
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setCarruselIdx({ ...carruselIdx, [h.id]: (idx + 1) % fotos.length }); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/95 hover:bg-white flex items-center justify-center shadow-md text-blue-700 transition">
                        <ChevronRight className="h-5 w-5" />
                      </button>
                      <div className="absolute bottom-3 right-3 inline-flex items-center gap-1 bg-stone-900/75 text-white text-xs font-medium rounded-md px-2 py-1">
                        <Images className="h-3.5 w-3.5" />{fotos.length}
                      </div>
                    </>
                  )}
                  {range?.from && range?.to && !disponible && (
                    <div className="absolute inset-0 bg-stone-900/55 flex items-center justify-center">
                      <Badge variant="destructive" className="text-sm px-3 py-1.5 shadow-lg">Reservada en estas fechas</Badge>
                    </div>
                  )}
                </div>
                <CardContent className="p-5 flex-1 flex flex-col gap-3">
                  <div>
                    <h3 className="text-[17px] font-semibold text-stone-900 leading-snug">{t.nombre}</h3>
                    <div className="text-xs text-stone-500 mt-0.5">Habitación {h.numero}{h.piso ? ` · Piso ${h.piso}` : ''}</div>
                  </div>

                  <ul className="text-[13px] text-stone-700 space-y-1.5">
                    <li className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-stone-500 shrink-0" />
                      Hasta {t.capacidad_maxima} {t.capacidad_maxima === 1 ? 'persona' : 'personas'}
                    </li>
                    <li className="flex items-center gap-2">
                      <BedDouble className="h-4 w-4 text-stone-500 shrink-0" />
                      {t.capacidad_adultos} adulto{t.capacidad_adultos !== 1 ? 's' : ''}
                      {t.capacidad_ninos > 0 ? ` + ${t.capacidad_ninos} niño${t.capacidad_ninos !== 1 ? 's' : ''}` : ''}
                    </li>
                    {(t.amenidades || []).slice(0, 3).map((a) => {
                      const Icon = amenityIcon(a);
                      return (
                        <li key={a} className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-stone-500 shrink-0" />{a}
                        </li>
                      );
                    })}
                    {(t.amenidades?.length || 0) > 3 && (
                      <li className="text-xs text-blue-700 font-medium pl-6">+{(t.amenidades!.length - 3)} amenidades más</li>
                    )}
                  </ul>

                  <div className="text-[12px] text-emerald-700 font-medium flex items-center gap-1">
                    100% reembolsable <Info className="h-3 w-3" />
                  </div>

                  <div className="mt-auto pt-3 border-t border-stone-100 text-right">
                    <div className="inline-block bg-emerald-700 text-white text-[11px] font-semibold rounded px-1.5 py-0.5 mb-1">15% de descuento</div>
                    <div className="text-xs text-stone-400 line-through">{formatCurrency(precioOriginal)} {currencyCode()}</div>
                    <div className="text-2xl font-bold text-stone-900 leading-tight">{formatCurrency(precio)} <span className="text-sm font-medium text-stone-500">{currencyCode()}</span></div>
                    <div className="text-[11px] text-stone-500">por noche{ns > 1 ? ` · ${formatCurrency(total)} total` : ''}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <Button
                      onClick={() => openBooking(h)}
                      variant="outline"
                      className="h-11 border-blue-600 text-blue-700 hover:bg-blue-50 hover:text-blue-800 font-semibold rounded-md text-[14px]"
                    >
                      <CalendarCheck className="h-4 w-4 mr-1.5" />
                      Ver disponibilidad
                    </Button>
                    <Button
                      onClick={() => openBooking(h)}
                      disabled={range?.from && range?.to ? !disponible : false}
                      className="h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md text-[14px] disabled:opacity-60"
                    >
                      <BookOpenCheck className="h-4 w-4 mr-1.5" />
                      Reservar
                    </Button>
                  </div>
                  <div className="text-[11px] text-stone-500 text-center -mt-1">
                    Elige fechas para confirmar disponibilidad. Aún no se te cobrará nada.
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white">
        <div className="container mx-auto px-6 py-6 text-xs text-stone-500 flex flex-wrap justify-between gap-3">
          <span>© {new Date().getFullYear()} {hotel.nombre}</span>
          {hotel.hora_checkin && hotel.hora_checkout && (
            <span>Check-in {hotel.hora_checkin} · Check-out {hotel.hora_checkout}</span>
          )}
        </div>
      </footer>

      {/* Modal de reserva con calendario */}
      <Dialog open={!!bookingHab} onOpenChange={(o) => !o && setBookingHab(null)}>
        <DialogContent className="max-w-3xl bg-white text-stone-900 max-h-[92vh] overflow-y-auto">
          {bookingHab && (() => {
            const t = bookingHab.tipo_habitacion_id ? tipoMap[bookingHab.tipo_habitacion_id] : null;
            if (!t) return null;
            const fotos = habitacionesConFotos(bookingHab);
            const ocupados = diasOcupadosPorHab[bookingHab.id] || new Set();
            const disponible = isHabDisponibleEnRango(bookingHab.id, bookingRange);
            const tarifa = Number(t.precio_base) || 0;
            const totalEstim = tarifa * nsBooking;
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="font-serif text-2xl font-light">
                    {t.nombre} · Habitación {bookingHab.numero}
                  </DialogTitle>
                  <DialogDescription>
                    Selecciona tus fechas en el calendario. Los días en rojo no están disponibles.
                  </DialogDescription>
                </DialogHeader>

                {fotos[0] && (
                  <div className="rounded-xl overflow-hidden aspect-[16/7] bg-stone-100">
                    <img src={fotos[0]} alt={t.nombre} className="w-full h-full object-cover" />
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-6 mt-2">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-stone-500 font-semibold mb-2">Calendario de la habitación</div>
                    <div className="rounded-xl border border-stone-200 p-2 bg-stone-50">
                      <Calendar
                        mode="range"
                        selected={bookingRange}
                        onSelect={setBookingRange}
                        numberOfMonths={1}
                        disabled={[
                          (d) => d < addDays(new Date(), -1),
                          (d) => ocupados.has(format(d, 'yyyy-MM-dd')),
                        ]}
                        modifiers={{ reservado: (d) => ocupados.has(format(d, 'yyyy-MM-dd')) }}
                        modifiersClassNames={{ reservado: 'bg-rose-100 text-rose-700 line-through' }}
                        locale={es}
                        className={cn("p-2 pointer-events-auto")}
                      />
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-stone-500">
                      <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-rose-100 border border-rose-200" />Reservado</span>
                      <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-stone-900" />Tu selección</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Nombre *</Label>
                        <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="border-stone-200" />
                      </div>
                      <div>
                        <Label className="text-xs">Apellido</Label>
                        <Input value={form.apellido_paterno} onChange={(e) => setForm({ ...form, apellido_paterno: e.target.value })} className="border-stone-200" />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Email *</Label>
                      <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="border-stone-200" />
                    </div>
                    <div>
                      <Label className="text-xs">Teléfono *</Label>
                      <Input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} className="border-stone-200" />
                    </div>
                    <div>
                      <Label className="text-xs">Solicitudes especiales</Label>
                      <Textarea rows={2} value={form.solicitudes} onChange={(e) => setForm({ ...form, solicitudes: e.target.value })} className="border-stone-200" />
                    </div>

                    <div className="rounded-xl border border-stone-200 p-3 bg-stone-50 text-sm space-y-1">
                      <div className="flex justify-between text-stone-600"><span>Tarifa por noche</span><span className="font-medium text-stone-900">{formatCurrency(tarifa)}</span></div>
                      <div className="flex justify-between text-stone-600"><span>Noches</span><span className="font-medium text-stone-900">{nsBooking}</span></div>
                      <div className="flex justify-between font-serif text-base border-t border-stone-200 pt-2 mt-1">
                        <span>Total</span><span>{formatCurrency(totalEstim)}</span>
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

                <DialogFooter>
                  <Button variant="outline" onClick={() => setBookingHab(null)} disabled={submitting}>Cancelar</Button>
                  <Button onClick={handleBookSubmit} disabled={submitting || nsBooking < 1 || !disponible} className="bg-stone-900 hover:bg-stone-800 text-stone-50">
                    {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Confirmar reserva
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Confirmación */}
      <Dialog open={!!confirmacion} onOpenChange={(o) => !o && setConfirmacion(null)}>
        <DialogContent className="max-w-md bg-white text-stone-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-serif font-light text-2xl">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              ¡Reserva recibida!
            </DialogTitle>
            <DialogDescription>Tu solicitud está pendiente de confirmación por el hotel.</DialogDescription>
          </DialogHeader>
          {confirmacion && (
            <div className="space-y-2 text-sm">
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                <div className="text-xs text-stone-500">Número de reserva</div>
                <div className="text-xl font-bold tracking-wider">{confirmacion.numero}</div>
              </div>
              <div className="flex justify-between"><span className="text-stone-500">Total estimado</span><span className="font-semibold">{formatCurrency(confirmacion.total)}</span></div>
              {confirmacion.anticipo > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 mt-2">
                  <div className="font-semibold mb-1 text-amber-900">Anticipo solicitado: {formatCurrency(confirmacion.anticipo)}</div>
                  <p className="text-xs text-amber-800/80">El hotel te contactará para coordinar el método de pago del anticipo y confirmar tu reserva.</p>
                </div>
              )}
              <p className="text-xs text-stone-500 pt-2">Guarda tu número de reserva. Recibirás confirmación al correo {form.email || 'registrado'}.</p>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setConfirmacion(null)} className="w-full bg-stone-900 hover:bg-stone-800 text-stone-50">Listo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
