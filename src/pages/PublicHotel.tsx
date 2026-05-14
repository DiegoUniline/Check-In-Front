import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Hotel as HotelIcon, MapPin, Phone, Mail, Users, BedDouble, CheckCircle2, Loader2 } from 'lucide-react';

type Hotel = {
  id: string;
  nombre: string;
  slug: string;
  descripcion_publica: string | null;
  ciudad: string | null;
  estado: string | null;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  hora_checkin: string | null;
  hora_checkout: string | null;
  estrellas: number | null;
  permite_reservas_online: boolean;
  requiere_anticipo: boolean;
  porcentaje_anticipo: number;
  logo_url: string | null;
};

type Tipo = {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio_base: number;
  precio_persona_extra: number;
  capacidad_adultos: number;
  capacidad_ninos: number;
  capacidad_maxima: number;
  amenidades: string[] | null;
  fotos: string[] | null;
  publico: boolean;
};

function todayISO(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

function nights(checkin: string, checkout: string) {
  if (!checkin || !checkout) return 0;
  const a = new Date(checkin).getTime();
  const b = new Date(checkout).getTime();
  const n = Math.round((b - a) / (1000 * 60 * 60 * 24));
  return n > 0 ? n : 0;
}

function genReservaNumber() {
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `RES-${year}-${rand}`;
}

export default function PublicHotel() {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [tipos, setTipos] = useState<Tipo[]>([]);
  const [habitacionesByTipo, setHabitacionesByTipo] = useState<Record<string, number>>({});
  const [reservasOcupacion, setReservasOcupacion] = useState<any[]>([]);

  const [checkin, setCheckin] = useState(todayISO(1));
  const [checkout, setCheckout] = useState(todayISO(2));
  const [adultos, setAdultos] = useState(2);
  const [ninos, setNinos] = useState(0);

  // Booking modal
  const [bookingTipo, setBookingTipo] = useState<Tipo | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmacion, setConfirmacion] = useState<{ numero: string; total: number; anticipo: number } | null>(null);
  const [form, setForm] = useState({
    nombre: '', apellido_paterno: '', email: '', telefono: '', solicitudes: '',
  });

  // Load hotel + tipos + habitaciones
  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
      const { data: h } = await supabase.from('hotels').select('*').eq('slug', slug).maybeSingle();
      if (!h) { setNotFound(true); setLoading(false); return; }
      setHotel(h as any);

      const [{ data: tps }, { data: hbs }] = await Promise.all([
        supabase.from('tipos_habitacion').select('*').eq('hotel_id', h.id).eq('publico', true),
        supabase.from('habitaciones').select('id, tipo_habitacion_id, excluida_publica').eq('hotel_id', h.id).eq('excluida_publica', false),
      ]);
      setTipos((tps || []) as any);
      const counts: Record<string, number> = {};
      (hbs || []).forEach((r: any) => {
        if (!r.tipo_habitacion_id) return;
        counts[r.tipo_habitacion_id] = (counts[r.tipo_habitacion_id] || 0) + 1;
      });
      setHabitacionesByTipo(counts);
      setLoading(false);
    })();
  }, [slug]);

  // Load reservations overlapping the chosen window + realtime
  useEffect(() => {
    if (!hotel) return;
    const load = async () => {
      const { data } = await supabase
        .from('reservas')
        .select('id, tipo_habitacion_id, fecha_checkin, fecha_checkout, estado')
        .eq('hotel_id', hotel.id)
        .in('estado', ['Pendiente', 'Confirmada', 'CheckIn'])
        .lt('fecha_checkin', checkout)
        .gt('fecha_checkout', checkin);
      setReservasOcupacion(data || []);
    };
    load();
    const ch = supabase.channel(`public-hotel-${hotel.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservas', filter: `hotel_id=eq.${hotel.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [hotel, checkin, checkout]);

  const ocupadasPorTipo = useMemo(() => {
    const m: Record<string, number> = {};
    reservasOcupacion.forEach((r: any) => {
      if (!r.tipo_habitacion_id) return;
      m[r.tipo_habitacion_id] = (m[r.tipo_habitacion_id] || 0) + 1;
    });
    return m;
  }, [reservasOcupacion]);

  const ns = nights(checkin, checkout);

  const handleBookSubmit = async () => {
    if (!hotel || !bookingTipo) return;
    if (!form.nombre.trim() || !form.email.trim() || !form.telefono.trim()) {
      toast({ title: 'Faltan datos', description: 'Nombre, email y teléfono son requeridos.', variant: 'destructive' });
      return;
    }
    if (ns < 1) {
      toast({ title: 'Fechas inválidas', description: 'El check-out debe ser después del check-in.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      // 1) crear cliente
      const { data: cliente, error: errC } = await supabase.from('clientes').insert({
        hotel_id: hotel.id,
        nombre: form.nombre.trim(),
        apellido_paterno: form.apellido_paterno.trim() || null,
        email: form.email.trim(),
        telefono: form.telefono.trim(),
      }).select().single();
      if (errC) throw errC;

      const tarifa = Number(bookingTipo.precio_base) || 0;
      const personasExtra = Math.max(0, (adultos + ninos) - bookingTipo.capacidad_adultos);
      const cargoExtra = personasExtra * (Number(bookingTipo.precio_persona_extra) || 0);
      const subtotal = tarifa * ns + cargoExtra * ns;
      const total = subtotal;
      const anticipo = hotel.requiere_anticipo
        ? Math.round(total * (Number(hotel.porcentaje_anticipo) || 0)) / 100 * 100
        : 0;
      // proper percentage calc:
      const anticipoFinal = hotel.requiere_anticipo
        ? Math.round(total * (Number(hotel.porcentaje_anticipo) || 0)) / 100
        : 0;

      const numero = genReservaNumber();
      const { error: errR } = await supabase.from('reservas').insert({
        hotel_id: hotel.id,
        numero_reserva: numero,
        cliente_id: cliente.id,
        tipo_habitacion_id: bookingTipo.id,
        fecha_checkin: checkin,
        fecha_checkout: checkout,
        adultos, ninos,
        noches: ns,
        tarifa_noche: tarifa,
        subtotal_hospedaje: subtotal,
        total,
        saldo_pendiente: total,
        estado: 'Pendiente',
        origen: 'Web',
        solicitudes_especiales: form.solicitudes || null,
      });
      if (errR) throw errR;

      setConfirmacion({ numero, total, anticipo: anticipoFinal });
      setBookingTipo(null);
      setForm({ nombre: '', apellido_paterno: '', email: '', telefono: '', solicitudes: '' });
    } catch (e: any) {
      toast({ title: 'No se pudo reservar', description: e.message || 'Intenta de nuevo.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound || !hotel || !hotel.permite_reservas_online) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center gap-4">
        <HotelIcon className="h-10 w-10 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Hotel no disponible</h1>
        <p className="text-muted-foreground max-w-md">
          Este hotel no tiene activadas las reservas en línea o el enlace no es correcto.
        </p>
        <Button asChild variant="outline"><Link to="/">Volver al inicio</Link></Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20">
      {/* Header */}
      <header className="bg-background border-b">
        <div className="container mx-auto px-4 py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            {hotel.logo_url ? (
              <img src={hotel.logo_url} alt={hotel.nombre} className="h-12 w-12 rounded-md object-cover" />
            ) : (
              <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center">
                <HotelIcon className="h-6 w-6 text-primary" />
              </div>
            )}
            <div>
              <h1 className="text-xl md:text-2xl font-bold">{hotel.nombre}</h1>
              <div className="text-sm text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
                {hotel.ciudad && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{hotel.ciudad}{hotel.estado ? `, ${hotel.estado}` : ''}</span>}
                {hotel.telefono && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{hotel.telefono}</span>}
                {hotel.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{hotel.email}</span>}
              </div>
            </div>
          </div>
        </div>
        {hotel.descripcion_publica && (
          <div className="container mx-auto px-4 pb-6 text-muted-foreground">{hotel.descripcion_publica}</div>
        )}
      </header>

      {/* Search */}
      <section className="container mx-auto px-4 py-6">
        <Card>
          <CardContent className="p-4 grid grid-cols-2 md:grid-cols-5 gap-3">
            <div>
              <Label className="text-xs">Check-in</Label>
              <Input type="date" value={checkin} min={todayISO()} onChange={(e) => setCheckin(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Check-out</Label>
              <Input type="date" value={checkout} min={todayISO(1)} onChange={(e) => setCheckout(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Adultos</Label>
              <Input type="number" min={1} value={adultos} onChange={(e) => setAdultos(parseInt(e.target.value) || 1)} />
            </div>
            <div>
              <Label className="text-xs">Niños</Label>
              <Input type="number" min={0} value={ninos} onChange={(e) => setNinos(parseInt(e.target.value) || 0)} />
            </div>
            <div className="flex items-end">
              <div className="text-sm text-muted-foreground">
                {ns > 0 ? <>{ns} {ns === 1 ? 'noche' : 'noches'}</> : 'Selecciona fechas'}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Tipos */}
      <section className="container mx-auto px-4 pb-12 space-y-4">
        {tipos.length === 0 && (
          <Card><CardContent className="p-8 text-center text-muted-foreground">
            Aún no hay habitaciones publicadas para reserva en línea.
          </CardContent></Card>
        )}
        {tipos.map((t) => {
          const totalDelTipo = habitacionesByTipo[t.id] || 0;
          const ocupadas = ocupadasPorTipo[t.id] || 0;
          const disponibles = Math.max(0, totalDelTipo - ocupadas);
          const capacidadOk = adultos + ninos <= t.capacidad_maxima;
          const puedeReservar = ns > 0 && disponibles > 0 && capacidadOk;
          const foto = t.fotos?.[0];
          return (
            <Card key={t.id} className="overflow-hidden">
              <div className="grid md:grid-cols-3 gap-0">
                <div className="md:col-span-1 bg-muted aspect-video md:aspect-auto md:min-h-[180px] flex items-center justify-center overflow-hidden">
                  {foto ? (
                    <img src={foto} alt={t.nombre} className="w-full h-full object-cover" />
                  ) : (
                    <BedDouble className="h-12 w-12 text-muted-foreground" />
                  )}
                </div>
                <div className="md:col-span-2 p-5 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold">{t.nombre}</h3>
                      {t.descripcion && <p className="text-sm text-muted-foreground mt-1">{t.descripcion}</p>}
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">${Number(t.precio_base).toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">por noche</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant="secondary" className="gap-1"><Users className="h-3 w-3" />Hasta {t.capacidad_maxima}</Badge>
                    {(t.amenidades || []).slice(0, 4).map((a) => (
                      <Badge key={a} variant="outline">{a}</Badge>
                    ))}
                    {disponibles > 0 ? (
                      <Badge className="bg-emerald-600 hover:bg-emerald-600">{disponibles} disponible{disponibles !== 1 ? 's' : ''}</Badge>
                    ) : (
                      <Badge variant="destructive">No disponible</Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-auto pt-2">
                    <div className="text-sm text-muted-foreground">
                      {ns > 0 && <>Total: <span className="font-semibold text-foreground">${(Number(t.precio_base) * ns).toLocaleString()}</span> · {ns} {ns === 1 ? 'noche' : 'noches'}</>}
                    </div>
                    <Button disabled={!puedeReservar} onClick={() => setBookingTipo(t)}>
                      {disponibles === 0 ? 'No disponible' : !capacidadOk ? 'Excede capacidad' : 'Reservar'}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </section>

      {/* Booking dialog */}
      <Dialog open={!!bookingTipo} onOpenChange={(o) => !o && setBookingTipo(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Reservar {bookingTipo?.nombre}</DialogTitle>
            <DialogDescription>
              {checkin} → {checkout} · {ns} {ns === 1 ? 'noche' : 'noches'} · {adultos} adulto(s){ninos ? `, ${ninos} niño(s)` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nombre *</Label>
                <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
              </div>
              <div>
                <Label>Apellido</Label>
                <Input value={form.apellido_paterno} onChange={(e) => setForm({ ...form, apellido_paterno: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label>Teléfono *</Label>
              <Input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
            </div>
            <div>
              <Label>Solicitudes especiales</Label>
              <Textarea rows={2} value={form.solicitudes} onChange={(e) => setForm({ ...form, solicitudes: e.target.value })} />
            </div>
            {bookingTipo && (
              <div className="rounded-md border p-3 bg-muted/30 text-sm space-y-1">
                <div className="flex justify-between"><span>Tarifa por noche</span><span>${Number(bookingTipo.precio_base).toLocaleString()}</span></div>
                <div className="flex justify-between"><span>Noches</span><span>{ns}</span></div>
                <div className="flex justify-between font-semibold border-t pt-1">
                  <span>Total</span>
                  <span>${(Number(bookingTipo.precio_base) * ns).toLocaleString()}</span>
                </div>
                {hotel.requiere_anticipo && (
                  <div className="flex justify-between text-primary">
                    <span>Anticipo requerido ({hotel.porcentaje_anticipo}%)</span>
                    <span>${Math.round(Number(bookingTipo.precio_base) * ns * (Number(hotel.porcentaje_anticipo) / 100)).toLocaleString()}</span>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBookingTipo(null)} disabled={submitting}>Cancelar</Button>
            <Button onClick={handleBookSubmit} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar reserva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation dialog */}
      <Dialog open={!!confirmacion} onOpenChange={(o) => !o && setConfirmacion(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              ¡Reserva recibida!
            </DialogTitle>
            <DialogDescription>
              Tu solicitud está pendiente de confirmación por el hotel.
            </DialogDescription>
          </DialogHeader>
          {confirmacion && (
            <div className="space-y-2 text-sm">
              <div className="rounded-md border bg-muted/30 p-3">
                <div className="text-xs text-muted-foreground">Número de reserva</div>
                <div className="text-lg font-bold tracking-wider">{confirmacion.numero}</div>
              </div>
              <div className="flex justify-between"><span className="text-muted-foreground">Total estimado</span><span className="font-semibold">${confirmacion.total.toLocaleString()}</span></div>
              {confirmacion.anticipo > 0 && (
                <div className="rounded-md border border-primary/40 bg-primary/5 p-3 mt-2">
                  <div className="font-semibold mb-1">Anticipo solicitado: ${confirmacion.anticipo.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    El hotel te contactará para coordinar el método de pago del anticipo y confirmar tu reserva.
                  </p>
                </div>
              )}
              <p className="text-xs text-muted-foreground pt-2">
                Guarda tu número de reserva. Recibirás confirmación al correo {form.email || 'registrado'}.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setConfirmacion(null)} className="w-full">Listo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}