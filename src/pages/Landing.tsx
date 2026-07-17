import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Hotel, BedDouble, Calendar, ShieldCheck, Sparkles, ArrowRight,
  Users, Wrench, Sparkle, ShoppingCart, Package, BarChart3,
  ClipboardCheck, DollarSign, Globe, Clock, Check, Star, MessageCircle, Phone,
} from 'lucide-react';
import { Logo, LogoHorizontal } from '@/components/Logo';

/**
 * Landing pública (vista principal en "/")
 * - Hero animado con banner + mockup del dashboard
 * - Sección de funciones (todos los módulos del sistema)
 * - "Capturas" mock del sistema (timeline reservas, POS, limpieza)
 * - Sección de reservas online para huéspedes
 * - CTA final
 */

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const features = [
  { icon: Calendar, title: 'Reservas en tiempo real', desc: 'Timeline visual estilo Gantt con drag & drop. Reservas web aparecen al instante.' },
  { icon: BedDouble, title: 'Habitaciones', desc: 'Estado en vivo: disponible, ocupada, sucia, mantenimiento. Filtros y bulk edit.' },
  { icon: Sparkle, title: 'Limpieza', desc: 'Asigna tareas, checklist por habitación y notificaciones a housekeeping.' },
  { icon: Wrench, title: 'Mantenimiento', desc: 'Tickets, prioridades y bitácora completa por habitación.' },
  { icon: ShoppingCart, title: 'POS integrado', desc: 'Cargos a la habitación o cobro directo. Tickets y métodos múltiples.' },
  { icon: Package, title: 'Inventario y compras', desc: 'Control de stock, mínimos, proveedores y órdenes de compra.' },
  { icon: DollarSign, title: 'Gastos y caja', desc: 'Turnos de caja, arqueos, gastos categorizados y cortes diarios.' },
  { icon: BarChart3, title: 'Reportes', desc: 'Ocupación, ingresos, ADR, RevPAR y exportación a CSV.' },
  { icon: Users, title: 'Usuarios y roles', desc: 'Permisos granulares: Admin, Recepción, Housekeeping, Mantenimiento, Gerente.' },
  { icon: Globe, title: 'Página web del hotel', desc: 'Tu propio link público para que los clientes reserven directo, sin comisiones.' },
  { icon: ClipboardCheck, title: 'Check-in / Check-out', desc: 'Flujo asistido, firma, identificación y cargos automáticos.' },
  { icon: ShieldCheck, title: 'Multi-hotel seguro', desc: 'Cada hotel aislado por permisos y políticas a nivel de base de datos.' },
];

const hotelesReales = [
  {
    img: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=900&q=80&auto=format&fit=crop',
    tag: 'RECEPCIÓN',
    title: 'Check-in en segundos',
    desc: 'Registra huéspedes, escanea identificación y cobra el anticipo desde una sola pantalla.',
  },
  {
    img: 'https://images.unsplash.com/photo-1551632436-cbf8dd35adfa?w=900&q=80&auto=format&fit=crop',
    tag: 'OPERACIÓN',
    title: 'Tu equipo, sincronizado',
    desc: 'Housekeeping ve las habitaciones sucias, mantenimiento recibe los tickets, gerencia mira todo en vivo.',
  },
  {
    img: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=900&q=80&auto=format&fit=crop',
    tag: 'MOVILIDAD',
    title: 'Desde cualquier dispositivo',
    desc: 'Web, tablet o celular. Tu hotel funciona igual estés en recepción, en casa o de viaje.',
  },
];

const testimonios = [
  {
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&q=80&auto=format&fit=crop&crop=faces',
    name: 'María Fernanda R.',
    role: 'Gerente · Hotel Boutique Colima',
    quote: 'Dejamos Excel y tres grupos de WhatsApp. Ahora todo está en HospedApp y las reservas de la web caen solas al sistema.',
  },
  {
    avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&q=80&auto=format&fit=crop&crop=faces',
    name: 'Ricardo Ortega',
    role: 'Dueño · Posada del Sol',
    quote: 'En dos semanas capacitamos a recepción, housekeeping y mantenimiento. La ocupación real por fin es visible.',
  },
  {
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&q=80&auto=format&fit=crop&crop=faces',
    name: 'Ana Lucía Peña',
    role: 'Recepcionista · Hotel Mirador',
    quote: 'El timeline es lo mejor. Arrastro una reserva, cambio de habitación y todo se actualiza en tiempo real.',
  },
];

const galeriaAccion = [
  {
    img: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=1000&q=80&auto=format&fit=crop',
    tag: 'RECEPCIÓN',
    title: 'Huéspedes llegando',
    desc: 'Check-in fluido, sin colas ni papeleos interminables.',
    span: 'md:col-span-2 md:row-span-2',
  },
  {
    img: 'https://images.unsplash.com/photo-1512txmp/photo-1556742044-3c52d6e88c62?w=800&q=80&auto=format&fit=crop',
    tag: 'RESERVAS ONLINE',
    title: 'Reservan desde el celular',
    desc: 'Tu página web recibe reservas 24/7.',
    span: '',
  },
  {
    img: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&q=80&auto=format&fit=crop',
    tag: 'EQUIPO',
    title: 'Coordinación en vivo',
    desc: 'Recepción, housekeeping y gerencia en sincronía.',
    span: '',
  },
  {
    img: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800&q=80&auto=format&fit=crop',
    tag: 'HOUSEKEEPING',
    title: 'Habitaciones listas',
    desc: 'Estados actualizados al instante desde el móvil.',
    span: '',
  },
  {
    img: 'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=1000&q=80&auto=format&fit=crop',
    tag: 'LOBBY',
    title: 'La primera impresión',
    desc: 'Recibe a tus huéspedes sin distracciones operativas.',
    span: 'md:col-span-2',
  },
  {
    img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80&auto=format&fit=crop',
    tag: 'HABITACIÓN',
    title: 'Confort garantizado',
    desc: 'Checklist digital para cada limpieza.',
    span: '',
  },
  {
    img: 'https://images.unsplash.com/photo-1568084680786-a84f91d1153c?w=800&q=80&auto=format&fit=crop',
    tag: 'GERENCIA',
    title: 'Decisiones con datos',
    desc: 'Ocupación, ADR y RevPAR en tiempo real.',
    span: '',
  },
  {
    img: 'https://images.unsplash.com/photo-1522798514-97ceb8c4f1c8?w=800&q=80&auto=format&fit=crop',
    tag: 'CLIENTES',
    title: 'Experiencia memorable',
    desc: 'Menos fricción, más hospitalidad real.',
    span: '',
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden public-page">
      {/* NAV */}
      <header className="border-b bg-background/70 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" aria-label="HospedApp inicio">
            <LogoHorizontal size={40} />
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#funciones" className="hover:text-foreground transition">Funciones</a>
            <a href="#capturas" className="hover:text-foreground transition">Capturas</a>
            <a href="#reservas-web" className="hover:text-foreground transition">Reservas Web</a>
            <a href="#soporte" className="hover:text-foreground transition">Soporte</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild><Link to="/login">Iniciar sesión</Link></Button>
            <Button asChild><Link to="/signup">Crear mi hotel</Link></Button>
          </div>
        </div>
      </header>

      {/* HERO con banner animado */}
      <section className="relative">
        {/* Mesh gradient animado */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-primary/30 blur-3xl animate-pulse" />
          <div className="absolute top-20 -right-20 h-[400px] w-[400px] rounded-full bg-accent/40 blur-3xl animate-pulse [animation-delay:1s]" />
          <div className="absolute bottom-0 left-1/3 h-[400px] w-[400px] rounded-full bg-secondary/40 blur-3xl animate-pulse [animation-delay:2s]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:48px_48px] opacity-20 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)]" />
        </div>

        <div className="container mx-auto px-4 pt-20 pb-12 lg:pt-28">
          <motion.div
            initial="hidden" animate="show" variants={fadeUp}
            className="max-w-3xl mx-auto text-center"
          >
            <motion.div variants={fadeUp} custom={0} className="inline-flex items-center gap-2 rounded-full border bg-card/80 backdrop-blur px-4 py-1.5 text-sm text-muted-foreground mb-6 shadow-sm">
              <Sparkles className="h-4 w-4 text-primary" />
              Sistema completo de gestión hotelera
            </motion.div>
            <motion.h1 variants={fadeUp} custom={1} className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
              Tu hotel, <span className="bg-gradient-to-r from-primary via-primary/80 to-accent-foreground bg-clip-text text-transparent">en piloto automático</span>
            </motion.h1>
            <motion.p variants={fadeUp} custom={2} className="text-lg md:text-xl text-muted-foreground mb-10">
              Reservas, recepción, limpieza, POS, inventario, reportes y página web propia para que tus huéspedes reserven en línea. Todo en tiempo real.
            </motion.p>
            <motion.div variants={fadeUp} custom={3} className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" asChild className="h-12 px-6 text-base">
                <Link to="/signup">Comenzar gratis <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="h-12 px-6 text-base">
                <Link to="/login">Probar demo</Link>
              </Button>
            </motion.div>
            <motion.div variants={fadeUp} custom={4} className="mt-6 text-xs text-muted-foreground flex items-center justify-center gap-4 flex-wrap">
              <span className="flex items-center gap-1"><Check className="h-3 w-3 text-primary" /> Sin tarjeta</span>
              <span className="flex items-center gap-1"><Check className="h-3 w-3 text-primary" /> Setup en 2 minutos</span>
              <span className="flex items-center gap-1"><Check className="h-3 w-3 text-primary" /> Soporte en español</span>
            </motion.div>
          </motion.div>

          {/* Mockup del dashboard */}
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="mt-16 max-w-6xl mx-auto"
          >
            <DashboardMockup />
          </motion.div>
        </div>
      </section>

      {/* MARQUEE estadísticas */}
      <section className="border-y bg-card/40">
        <div className="container mx-auto px-4 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { v: '99.9%', l: 'Uptime' },
            { v: '<100ms', l: 'Reservas en vivo' },
            { v: '12+', l: 'Módulos integrados' },
            { v: '0%', l: 'Comisión por reserva' },
          ].map((s) => (
            <div key={s.l}>
              <div className="text-3xl md:text-4xl font-bold text-primary">{s.v}</div>
              <div className="text-sm text-muted-foreground mt-1">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* HOTELES REALES - fotografía lifestyle */}
      <section className="container mx-auto px-4 py-24">
        <div className="max-w-2xl mx-auto text-center mb-14">
          <div className="text-sm font-semibold text-primary mb-3">HECHO PARA HOTELES REALES</div>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">Diseñado para tu equipo, no para consultores</h2>
          <p className="text-muted-foreground text-lg">Hoteles boutique, posadas, cadenas pequeñas y medianas. Si hospedas, HospedApp está pensado para ti.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {hotelesReales.map((h, i) => (
            <motion.article
              key={h.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="group relative overflow-hidden rounded-3xl border bg-card shadow-sm hover:shadow-xl transition-all"
            >
              <div className="relative aspect-[4/5] overflow-hidden">
                <img
                  src={h.img}
                  alt={h.title}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#04122C]/95 via-[#04122C]/30 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                  <div className="text-xs font-semibold tracking-wider text-primary/90 mb-2">{h.tag}</div>
                  <h3 className="text-xl font-bold mb-2 leading-tight">{h.title}</h3>
                  <p className="text-sm text-white/80 leading-relaxed">{h.desc}</p>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </section>

      {/* FUNCIONES */}
      <section id="funciones" className="container mx-auto px-4 py-24">
        <div className="max-w-2xl mx-auto text-center mb-16">
          <div className="text-sm font-semibold text-primary mb-3">FUNCIONES</div>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">Todo lo que tu hotel necesita</h2>
          <p className="text-muted-foreground text-lg">Doce módulos integrados que se hablan entre sí. Sin Excel, sin WhatsApp, sin caos.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map(({ icon: Icon, title, desc }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.4, delay: (i % 3) * 0.08 }}
              className="group rounded-2xl border bg-card p-6 hover:border-primary/40 hover:shadow-lg transition-all"
            >
              <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold mb-1.5">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CAPTURAS — mockups del sistema */}
      <section id="capturas" className="bg-muted/30 border-y">
        <div className="container mx-auto px-4 py-24 space-y-32">
          <FeatureRow
            tag="Reservas"
            title="Timeline visual de tu hotel"
            desc="Visualiza todas tus reservas en una línea de tiempo tipo Gantt. Arrastra para reasignar, click para detalles, colores por estado."
            mockup={<TimelineMockup />}
            reverse={false}
          />
          <FeatureRow
            tag="POS y cargos"
            title="Cobra en segundos"
            desc="Punto de venta integrado al sistema. Cobra a la habitación o directo, con efectivo, tarjeta o transferencia. Tickets imprimibles."
            mockup={<PosMockup />}
            reverse={true}
          />
          <FeatureRow
            tag="Operación"
            title="Limpieza y mantenimiento al día"
            desc="Asigna habitaciones a housekeeping con checklist. Registra incidencias de mantenimiento con prioridad y bitácora."
            mockup={<HousekeepingMockup />}
            reverse={false}
          />
        </div>
      </section>

      {/* RESERVAS WEB */}
      <section id="reservas-web" className="container mx-auto px-4 py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="text-sm font-semibold text-primary mb-3">PÁGINA WEB INCLUIDA</div>
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Tus huéspedes reservan directo, sin comisiones</h2>
            <p className="text-lg text-muted-foreground mb-8">
              Cada hotel obtiene su propio link público <code className="px-2 py-0.5 rounded bg-muted text-foreground text-sm">hospedapp.com/h/tu-hotel</code>. Los clientes ven disponibilidad real y reservan al instante.
            </p>
            <ul className="space-y-3">
              {[
                'Disponibilidad calculada en tiempo real',
                'Tú eliges qué tipos de habitación se publican',
                'Anticipo opcional configurable',
                'Reserva nueva → aparece al instante en tu sistema',
              ].map((t) => (
                <li key={t} className="flex items-start gap-3">
                  <div className="h-5 w-5 rounded-full bg-primary/15 flex items-center justify-center mt-0.5 shrink-0">
                    <Check className="h-3 w-3 text-primary" />
                  </div>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            <Button size="lg" asChild className="mt-8">
              <Link to="/signup">Crear mi página <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
          <PublicSiteMockup />
        </div>
      </section>

      {/* TESTIMONIOS */}
      <section className="border-y bg-gradient-to-b from-muted/30 to-background">
        <div className="container mx-auto px-4 py-24">
          <div className="max-w-2xl mx-auto text-center mb-14">
            <div className="text-sm font-semibold text-primary mb-3">TESTIMONIOS</div>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Hoteleros que ya duermen mejor</h2>
            <p className="text-muted-foreground text-lg">Recepción, gerencia y dueños usando HospedApp todos los días.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {testimonios.map((t, i) => (
              <motion.figure
                key={t.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="rounded-2xl border bg-card p-8 shadow-sm hover:shadow-lg hover:border-primary/40 transition-all flex flex-col"
              >
                <div className="flex items-center gap-1 text-primary mb-4">
                  {[0, 1, 2, 3, 4].map((n) => (
                    <Star key={n} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <blockquote className="text-base leading-relaxed text-foreground/90 mb-6 flex-1">
                  “{t.quote}”
                </blockquote>
                <figcaption className="flex items-center gap-3 pt-4 border-t">
                  <img
                    src={t.avatar}
                    alt={t.name}
                    loading="lazy"
                    decoding="async"
                    className="h-12 w-12 rounded-full object-cover ring-2 ring-primary/20"
                  />
                  <div>
                    <div className="font-semibold text-sm">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.role}</div>
                  </div>
                </figcaption>
              </motion.figure>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="container mx-auto px-4 py-24">
        <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/10 via-card to-accent/20 p-10 md:p-16 text-center">
          <div className="absolute inset-0 -z-10 opacity-50">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 h-64 w-64 rounded-full bg-primary/30 blur-3xl" />
          </div>
          <Star className="h-8 w-8 text-primary mx-auto mb-4" />
          <h2 className="text-3xl md:text-5xl font-bold mb-4">Empieza hoy. Sin tarjeta.</h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
            Crea tu hotel en menos de 2 minutos y ten tu sistema funcionando con tu página de reservas lista.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" asChild className="h-12 px-6"><Link to="/signup">Crear mi hotel</Link></Button>
            <Button size="lg" variant="outline" asChild className="h-12 px-6"><Link to="/login">Ver demo</Link></Button>
          </div>
        </div>
      </section>

      {/* SOPORTE / CONTACTO */}
      <section id="soporte" className="container mx-auto px-4 pb-24">
        <div className="grid md:grid-cols-2 gap-5">
          <a
            href="https://wa.me/523171035768?text=Hola%2C%20me%20interesa%20contratar%20HospedApp"
            target="_blank" rel="noreferrer"
            className="group rounded-2xl border bg-card p-8 hover:border-primary/40 hover:shadow-lg transition-all flex items-start gap-5"
          >
            <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0 group-hover:bg-emerald-500/20 transition">
              <MessageCircle className="h-6 w-6 text-emerald-500" />
            </div>
            <div>
              <div className="text-sm font-semibold text-emerald-600 mb-1">WHATSAPP · MÉXICO</div>
              <h3 className="text-xl font-bold mb-1">Escríbenos por WhatsApp</h3>
              <p className="text-sm text-muted-foreground mb-3">Soporte y ventas. Respuesta en minutos en horario laboral.</p>
              <div className="text-lg font-semibold text-foreground">+52 317 103 5768</div>
            </div>
          </a>
          <a
            href="tel:+523171035768"
            className="group rounded-2xl border bg-card p-8 hover:border-primary/40 hover:shadow-lg transition-all flex items-start gap-5"
          >
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition">
              <Phone className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="text-sm font-semibold text-primary mb-1">LLAMADA DIRECTA</div>
              <h3 className="text-xl font-bold mb-1">Habla con un asesor</h3>
              <p className="text-sm text-muted-foreground mb-3">Te ayudamos a contratar y configurar tu hotel.</p>
              <div className="text-lg font-semibold text-foreground">+52 317 103 5768</div>
            </div>
          </a>
        </div>
      </section>

      <footer className="border-t">
        <div className="container mx-auto px-4 py-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Logo size={18} />
            © {new Date().getFullYear()} HospedApp · Sistema de gestión hotelera
          </div>
          <div className="flex items-center gap-4">
            <a href="https://wa.me/523171035768" target="_blank" rel="noreferrer" className="hover:text-foreground flex items-center gap-1">
              <MessageCircle className="h-3.5 w-3.5" /> +52 317 103 5768
            </a>
            <Link to="/login" className="hover:text-foreground">Iniciar sesión</Link>
            <Link to="/signup" className="hover:text-foreground">Crear cuenta</Link>
          </div>
        </div>
      </footer>

      {/* Botón flotante WhatsApp */}
      <a
        href="https://wa.me/523171035768?text=Hola%2C%20me%20interesa%20HospedApp"
        target="_blank" rel="noreferrer"
        aria-label="Contactar por WhatsApp"
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-emerald-500 text-white shadow-lg flex items-center justify-center hover:scale-110 hover:bg-emerald-600 transition-transform"
      >
        <MessageCircle className="h-6 w-6" />
        <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-30" />
      </a>
    </div>
  );
}

/* ============== Sub-componentes mockup ============== */

function FeatureRow({ tag, title, desc, mockup, reverse }: {
  tag: string; title: string; desc: string; mockup: React.ReactNode; reverse: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.7 }}
      className={`grid lg:grid-cols-2 gap-10 items-center ${reverse ? 'lg:[&>*:first-child]:order-2' : ''}`}
    >
      <div>
        <div className="text-sm font-semibold text-primary mb-3">{tag.toUpperCase()}</div>
        <h3 className="text-2xl md:text-4xl font-bold mb-4">{title}</h3>
        <p className="text-muted-foreground text-lg">{desc}</p>
      </div>
      <div>{mockup}</div>
    </motion.div>
  );
}

function BrowserFrame({ children, url }: { children: React.ReactNode; url?: string }) {
  return (
    <div className="rounded-xl border bg-card shadow-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/40">
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
          <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
        </div>
        {url && (
          <div className="ml-3 flex-1 text-xs text-muted-foreground bg-background border rounded px-2 py-1 truncate">{url}</div>
        )}
      </div>
      {children}
    </div>
  );
}

function DashboardMockup() {
  return (
    <BrowserFrame url="hospedapp.com/dashboard">
      <div className="flex">
        {/* sidebar */}
        <div className="hidden md:flex w-48 border-r bg-muted/30 p-3 flex-col gap-1 text-xs">
          {['Dashboard', 'Reservas', 'Habitaciones', 'Limpieza', 'POS', 'Inventario', 'Reportes', 'Configuración'].map((it, i) => (
            <div key={it} className={`px-2 py-1.5 rounded ${i === 0 ? 'bg-primary/15 text-primary font-medium' : 'text-muted-foreground'}`}>{it}</div>
          ))}
        </div>
        {/* main */}
        <div className="flex-1 p-4 space-y-4 bg-background">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { l: 'Ocupación', v: '78%', c: 'text-emerald-500' },
              { l: 'Check-ins hoy', v: '12', c: 'text-blue-500' },
              { l: 'Ingresos', v: '$24,800', c: 'text-primary' },
              { l: 'Tareas críticas', v: '3', c: 'text-amber-500' },
            ].map((k) => (
              <div key={k.l} className="rounded-lg border bg-card p-3">
                <div className="text-[10px] text-muted-foreground uppercase">{k.l}</div>
                <div className={`text-xl font-bold ${k.c}`}>{k.v}</div>
              </div>
            ))}
          </div>
          {/* chart */}
          <div className="rounded-lg border bg-card p-3">
            <div className="text-xs font-medium mb-3">Ocupación últimos 7 días</div>
            <div className="flex items-end gap-2 h-28">
              {[40, 65, 50, 80, 70, 90, 78].map((h, i) => (
                <motion.div
                  key={i}
                  initial={{ height: 0 }}
                  animate={{ height: `${h}%` }}
                  transition={{ duration: 0.8, delay: 0.6 + i * 0.08 }}
                  className="flex-1 rounded-t bg-gradient-to-t from-primary/60 to-primary"
                />
              ))}
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="rounded-lg border bg-card p-3">
              <div className="text-xs font-medium mb-2">Próximos check-ins</div>
              {['García López · 14:00', 'Hernández · 15:30', 'Martínez · 16:00'].map((t) => (
                <div key={t} className="text-xs py-1.5 border-b last:border-0 flex justify-between">
                  <span>{t}</span><span className="text-primary">Hab. {Math.floor(Math.random() * 200) + 100}</span>
                </div>
              ))}
            </div>
            <div className="rounded-lg border bg-card p-3">
              <div className="text-xs font-medium mb-2">Tareas críticas</div>
              {['Hab. 204 · Limpieza pendiente', 'Hab. 312 · A/C reportado', 'Inventario: toallas bajas'].map((t) => (
                <div key={t} className="text-xs py-1.5 border-b last:border-0 flex items-center gap-2">
                  <Clock className="h-3 w-3 text-amber-500" />{t}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

function TimelineMockup() {
  const rooms = ['101', '102', '103', '201', '202'];
  const days = Array.from({ length: 10 }, (_, i) => i + 1);
  const reservations = [
    { row: 0, start: 1, len: 3, label: 'García', color: 'bg-emerald-500/80' },
    { row: 1, start: 4, len: 4, label: 'López', color: 'bg-primary/80' },
    { row: 2, start: 2, len: 5, label: 'Hernández', color: 'bg-violet-500/80' },
    { row: 3, start: 6, len: 3, label: 'Sánchez', color: 'bg-amber-500/80' },
    { row: 4, start: 1, len: 2, label: 'Pérez', color: 'bg-rose-500/80' },
    { row: 4, start: 5, len: 4, label: 'Ramírez', color: 'bg-cyan-500/80' },
  ];
  return (
    <BrowserFrame url="hospedapp.com/reservas">
      <div className="p-4 bg-background">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold">Reservas · Mayo 2026</div>
          <div className="flex gap-1">
            <div className="h-6 w-6 rounded bg-muted" />
            <div className="h-6 w-6 rounded bg-muted" />
          </div>
        </div>
        <div className="border rounded-lg overflow-hidden text-xs">
          <div className="grid" style={{ gridTemplateColumns: '60px repeat(10, 1fr)' }}>
            <div className="p-2 border-b border-r bg-muted/40 font-medium">Hab</div>
            {days.map((d) => (
              <div key={d} className="p-2 border-b border-r last:border-r-0 bg-muted/40 text-center text-muted-foreground">{d}</div>
            ))}
            {rooms.map((r, ri) => (
              <Fragment key={r}>
                <div key={`r-${r}`} className="p-2 border-b border-r font-medium">{r}</div>
                {days.map((d) => (
                  <div key={`${r}-${d}`} className="border-b border-r last:border-r-0 h-9 relative" />
                ))}
                {reservations.filter((x) => x.row === ri).map((res, i) => (
                  <motion.div
                    key={i}
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                    style={{
                      gridColumn: `${res.start + 1} / span ${res.len}`,
                      gridRow: ri + 2,
                      transformOrigin: 'left',
                    }}
                    className={`m-1 rounded ${res.color} text-white text-[10px] flex items-center px-2 font-medium shadow-sm`}
                  >
                    {res.label}
                  </motion.div>
                ))}
              </Fragment>
            ))}
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

function PosMockup() {
  const items = [
    { n: 'Cerveza', p: 45 },
    { n: 'Hamburguesa', p: 180 },
    { n: 'Refresco', p: 35 },
    { n: 'Servicio cuarto', p: 250 },
  ];
  return (
    <BrowserFrame url="hospedapp.com/pos">
      <div className="grid md:grid-cols-3 bg-background">
        <div className="md:col-span-2 p-4 border-r">
          <div className="text-sm font-semibold mb-3">Productos</div>
          <div className="grid grid-cols-3 gap-2">
            {['Cerveza', 'Hamburguesa', 'Refresco', 'Pizza', 'Café', 'Agua', 'Vino', 'Postre', 'Servicio'].map((p, i) => (
              <div key={p} className={`aspect-square rounded-lg border p-2 flex flex-col justify-between text-xs ${i % 4 === 0 ? 'bg-primary/10 border-primary/40' : 'bg-card'}`}>
                <ShoppingCart className="h-4 w-4 text-primary" />
                <div>
                  <div className="font-medium">{p}</div>
                  <div className="text-muted-foreground">${30 + i * 25}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="p-4 bg-muted/20">
          <div className="text-sm font-semibold mb-3">Ticket #00482</div>
          <div className="space-y-2 text-xs">
            {items.map((it) => (
              <div key={it.n} className="flex justify-between border-b pb-1.5">
                <span>{it.n}</span><span>${it.p}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold text-base pt-2">
              <span>Total</span><span className="text-primary">$510</span>
            </div>
          </div>
          <button className="mt-4 w-full rounded-md bg-primary text-primary-foreground py-2 text-xs font-medium">Cobrar</button>
        </div>
      </div>
    </BrowserFrame>
  );
}

function HousekeepingMockup() {
  const tasks = [
    { hab: '101', estado: 'Limpia', color: 'bg-emerald-500' },
    { hab: '102', estado: 'Sucia', color: 'bg-rose-500' },
    { hab: '103', estado: 'En proceso', color: 'bg-amber-500' },
    { hab: '201', estado: 'Mantenimiento', color: 'bg-violet-500' },
    { hab: '202', estado: 'Limpia', color: 'bg-emerald-500' },
    { hab: '203', estado: 'Sucia', color: 'bg-rose-500' },
  ];
  return (
    <BrowserFrame url="hospedapp.com/limpieza">
      <div className="p-4 bg-background">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold">Estado de limpieza</div>
          <div className="flex gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500"/>Limpia</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500"/>Sucia</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {tasks.map((t, i) => (
            <motion.div
              key={t.hab}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className="rounded-lg border p-3 bg-card"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold">{t.hab}</span>
                <span className={`h-2 w-2 rounded-full ${t.color}`} />
              </div>
              <div className="text-xs text-muted-foreground mt-1">{t.estado}</div>
              <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
                <div className={`h-full ${t.color}`} style={{ width: `${[100, 0, 60, 30, 100, 0][i]}%` }} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </BrowserFrame>
  );
}

function PublicSiteMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7 }}
    >
      <BrowserFrame url="hospedapp.com/h/hotel-paraiso">
        <div className="bg-background">
          <div className="h-32 bg-gradient-to-br from-primary/30 via-accent/40 to-secondary/30 relative">
            <div className="absolute bottom-3 left-4 text-foreground">
              <div className="text-lg font-bold">Hotel Paraíso</div>
              <div className="text-xs text-muted-foreground">Reserva online · disponibilidad real</div>
            </div>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex gap-2 text-xs">
              <div className="flex-1 border rounded px-2 py-1.5">
                <div className="text-muted-foreground text-[10px]">Llegada</div>
                <div className="font-medium">15 May 2026</div>
              </div>
              <div className="flex-1 border rounded px-2 py-1.5">
                <div className="text-muted-foreground text-[10px]">Salida</div>
                <div className="font-medium">18 May 2026</div>
              </div>
            </div>
            {[
              { t: 'Suite Premium', p: 2400, d: '2 disponibles' },
              { t: 'Estándar Doble', p: 1200, d: '5 disponibles' },
            ].map((r) => (
              <div key={r.t} className="border rounded-lg p-3 flex gap-3">
                <div className="h-16 w-20 rounded bg-gradient-to-br from-muted to-muted-foreground/20 shrink-0" />
                <div className="flex-1">
                  <div className="font-medium text-sm">{r.t}</div>
                  <div className="text-xs text-muted-foreground">{r.d}</div>
                  <div className="flex justify-between items-end mt-1">
                    <div className="text-primary font-bold">${r.p}<span className="text-xs text-muted-foreground font-normal">/noche</span></div>
                    <button className="text-xs rounded bg-primary text-primary-foreground px-2 py-1">Reservar</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </BrowserFrame>
    </motion.div>
  );
}