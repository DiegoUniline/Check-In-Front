import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useScroll, useTransform } from 'framer-motion';
import { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  ArrowRight,
  BarChart3,
  BedDouble,
  Bot,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Hotel,
  Menu,
  MessageSquare,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Users,
  WalletCards,
  X,
  Zap,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import wordmark from '@/assets/vulo-wordmark.png';
import shotTimeline from '@/assets/screens/timeline.webp';
import shotHabitaciones from '@/assets/screens/habitaciones.webp';
import shotClientes from '@/assets/screens/clientes.webp';
import shotChats from '@/assets/screens/chats.webp';
import shotReportes from '@/assets/screens/reportes.webp';
import shotTarifas from '@/assets/screens/tarifas.webp';

const NAVY = '#10233F';
const ORANGE = '#F97316';
const ease = [0.22, 1, 0.36, 1] as const;
const WA_DEMO = 'https://wa.me/523171035768?text=Hola%2C%20quiero%20ver%20una%20demo%20de%20VULO%20con%20los%20datos%20de%20mi%20hotel';

const reveal = {
  hidden: { opacity: 0, y: 26 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: i * 0.06, ease },
  }),
};

const features = [
  { icon: CalendarDays, title: 'Reservas sin enredos', text: 'Disponibilidad, tarifas, anticipos, check-in y check-out dentro del mismo flujo.' },
  { icon: BedDouble, title: 'Habitaciones bajo control', text: 'Ocupación, limpieza, mantenimiento y estatus operativo en tiempo real.' },
  { icon: MessageSquare, title: 'WhatsApp con IA', text: 'Responde dudas, consulta disponibilidad y acompaña al huésped sin saturar recepción.' },
  { icon: WalletCards, title: 'Cobros y cargos claros', text: 'Pagos, consumos, saldos y cargos a habitación con trazabilidad.' },
  { icon: BarChart3, title: 'Reportes que sí explican', text: 'Ocupación, ADR, RevPAR, ingresos y operación con métricas hoteleras consistentes.' },
  { icon: ShieldCheck, title: 'Permisos y auditoría', text: 'Cada usuario ve lo que necesita y las acciones sensibles dejan rastro.' },
];

const benefits = ['Sin instalaciones complicadas', 'Funciona en computadora, tablet y móvil', 'Diseñado para operación hotelera real', 'Acompañamiento en implementación'];

const screens = [
  { src: shotTimeline, label: 'Reservas', text: 'Planea llegadas, salidas y ocupación desde una sola línea de tiempo.' },
  { src: shotHabitaciones, label: 'Habitaciones', text: 'Detecta en segundos qué está libre, ocupado, sucio o en mantenimiento.' },
  { src: shotChats, label: 'WhatsApp', text: 'Centraliza conversaciones y automatiza respuestas frecuentes con IA.' },
  { src: shotReportes, label: 'Reportes', text: 'Mide lo que realmente importa para operar y decidir mejor.' },
  { src: shotClientes, label: 'Huéspedes', text: 'Conserva historial, preferencias y reservas sin perder contexto.' },
  { src: shotTarifas, label: 'Tarifas', text: 'Administra precios y temporadas sin hojas de cálculo dispersas.' },
];

function Nav() {
  const [open, setOpen] = useState(false);
  const links = [['Inicio', '/'], ['Funciones', '/funciones'], ['Precios', '/precios'], ['Empresa', '/empresa'], ['Contacto', '/contacto']];
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/80 backdrop-blur-2xl">
      <div className="mx-auto flex h-16 max-w-[1320px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5">
          <Logo size={32} />
          <img src={wordmark} alt="VULO" className="h-5 w-auto" />
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          {links.map(([label, href]) => <Link key={href} to={href} className="text-sm font-medium text-slate-600 transition hover:text-slate-950">{label}</Link>)}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Link to="/login" className="rounded-full px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">Iniciar sesión</Link>
          <a href={WA_DEMO} target="_blank" rel="noreferrer" className="rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_30px_-10px_rgba(249,115,22,.8)] transition hover:-translate-y-0.5" style={{ background: ORANGE }}>Agendar demo</a>
        </div>
        <button onClick={() => setOpen(true)} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 md:hidden" aria-label="Abrir menú"><Menu className="h-5 w-5" /></button>
      </div>
      <AnimatePresence>
        {open && <>
          <motion.button aria-label="Cerrar menú" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-slate-950/35 backdrop-blur-sm md:hidden" onClick={() => setOpen(false)} />
          <motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ duration: .35, ease }} className="fixed right-0 top-0 z-[70] flex h-dvh w-[88%] max-w-sm flex-col bg-white p-5 shadow-2xl md:hidden">
            <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Logo size={30} /><img src={wordmark} alt="VULO" className="h-4 w-auto" /></div><button onClick={() => setOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-full border"><X className="h-5 w-5" /></button></div>
            <nav className="mt-8 space-y-1">{links.map(([label, href]) => <Link key={href} to={href} onClick={() => setOpen(false)} className="block rounded-xl px-3 py-3 text-lg font-semibold text-slate-900 hover:bg-slate-50">{label}</Link>)}</nav>
            <div className="mt-auto space-y-2"><a href={WA_DEMO} target="_blank" rel="noreferrer" className="flex h-12 items-center justify-center rounded-full font-semibold text-white" style={{ background: ORANGE }}>Agendar demo</a><Link to="/login" className="flex h-12 items-center justify-center rounded-full border font-semibold">Iniciar sesión</Link></div>
          </motion.aside>
        </>}
      </AnimatePresence>
    </header>
  );
}

function AnimatedProduct() {
  return (
    <div className="relative mx-auto w-full max-w-[660px]">
      <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }} className="relative overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-[0_40px_120px_-35px_rgba(15,35,63,.45)]">
        <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-3"><span className="h-2.5 w-2.5 rounded-full bg-slate-300" /><span className="h-2.5 w-2.5 rounded-full bg-slate-300" /><span className="h-2.5 w-2.5 rounded-full bg-slate-300" /><span className="ml-3 text-[11px] font-semibold text-slate-500">VULO · Inicio</span></div>
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:p-5">
          <div className="rounded-2xl bg-slate-950 p-4 text-white sm:col-span-2"><div className="flex items-center justify-between"><div><p className="text-xs text-white/55">Hoy en el hotel</p><p className="mt-1 text-lg font-semibold">Operación bajo control</p></div><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10"><Sparkles className="h-5 w-5" /></div></div><div className="mt-4 grid grid-cols-3 gap-2">{[['Ocupadas','18'],['Disponibles','7'],['Llegadas','5']].map(([a,b]) => <div key={a} className="rounded-xl bg-white/8 p-3"><p className="text-[10px] text-white/50">{a}</p><p className="mt-1 text-xl font-bold">{b}</p></div>)}</div></div>
          <div className="rounded-2xl border p-4"><div className="flex items-center gap-2 text-sm font-semibold"><CalendarDays className="h-4 w-4 text-orange-500" /> Próxima llegada</div><div className="mt-4 rounded-xl bg-slate-50 p-3"><p className="text-sm font-semibold">Mariana Torres</p><p className="mt-1 text-xs text-slate-500">Hab. 204 · 3 noches</p><div className="mt-3 flex items-center gap-2"><span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">Confirmada</span><span className="text-[10px] text-slate-400">14:00</span></div></div></div>
          <div className="rounded-2xl border p-4"><div className="flex items-center gap-2 text-sm font-semibold"><BarChart3 className="h-4 w-4 text-orange-500" /> Ocupación</div><div className="mt-5 flex h-24 items-end gap-2">{[42,58,50,72,64,84,76].map((h,i) => <motion.div key={i} initial={{ height: 0 }} whileInView={{ height: `${h}%` }} viewport={{ once: true }} transition={{ delay: i*.05, duration: .55, ease }} className="flex-1 rounded-t-lg bg-slate-200"><div className="h-full rounded-t-lg bg-orange-500/85" /></motion.div>)}</div></div>
        </div>
      </motion.div>
      <motion.div animate={{ y: [0, 8, 0], rotate: [0, 1, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: .3 }} className="absolute -bottom-7 -left-2 w-[260px] rounded-2xl border bg-white p-4 shadow-2xl sm:-left-10">
        <div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#25D366]"><MessageSquare className="h-4 w-4 text-white" /></span><div><p className="text-xs font-bold text-slate-900">IA VULO</p><p className="text-[10px] text-slate-400">WhatsApp conectado</p></div><span className="ml-auto h-2 w-2 rounded-full bg-emerald-500" /></div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: [0,1,1,1] }} transition={{ duration: 4, repeat: Infinity }} className="mt-3 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-700">Sí tenemos disponibilidad del 12 al 15. Te aparto la habitación ahora mismo.</motion.div>
      </motion.div>
      <motion.div animate={{ x: [0, 6, 0], y: [0, -5, 0] }} transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }} className="absolute -right-2 top-10 hidden rounded-2xl border bg-white px-4 py-3 shadow-xl sm:block"><div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /><div><p className="text-xs font-semibold">Check-in listo</p><p className="text-[10px] text-slate-400">Hab. 108</p></div></div></motion.div>
    </div>
  );
}

function Hero() {
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, .35], [0, 90]);
  return (
    <section className="relative overflow-hidden bg-[#F8FAFC] px-4 pb-24 pt-12 sm:px-6 lg:px-8 lg:pb-32 lg:pt-16">
      <motion.div style={{ y }} aria-hidden className="pointer-events-none absolute left-[-12%] top-[-18%] h-[540px] w-[540px] rounded-full bg-orange-300/25 blur-[120px]" />
      <div aria-hidden className="pointer-events-none absolute right-[-10%] top-[8%] h-[500px] w-[500px] rounded-full bg-sky-200/30 blur-[130px]" />
      <div className="mx-auto grid max-w-[1320px] items-center gap-16 lg:grid-cols-[.95fr_1.05fr]">
        <motion.div initial="hidden" animate="show" className="max-w-2xl">
          <motion.div variants={reveal} custom={0} className="mb-6 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700"><span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-orange-500" /></span>Software hotelero con IA · hecho en México</motion.div>
          <motion.h1 variants={reveal} custom={1} className="text-[44px] font-bold leading-[.98] tracking-[-.045em] text-slate-950 sm:text-[58px] lg:text-[72px]">Menos caos en recepción.<br /><span className="text-slate-400">Más control del hotel.</span></motion.h1>
          <motion.p variants={reveal} custom={2} className="mt-7 max-w-xl text-[17px] leading-8 text-slate-600 sm:text-[19px]">VULO conecta reservas, habitaciones, huéspedes, cobros, operación y WhatsApp con IA en una sola plataforma clara y rápida.</motion.p>
          <motion.div variants={reveal} custom={3} className="mt-9 flex flex-col gap-3 sm:flex-row"><a href={WA_DEMO} target="_blank" rel="noreferrer" className="group inline-flex h-13 items-center justify-center rounded-full px-7 py-3.5 text-sm font-semibold text-white shadow-[0_16px_40px_-14px_rgba(249,115,22,.8)] transition hover:-translate-y-0.5" style={{ background: ORANGE }}>Ver demo con mis datos <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" /></a><Link to="/funciones" className="inline-flex h-13 items-center justify-center rounded-full border border-slate-300 bg-white px-7 py-3.5 text-sm font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50">Explorar funciones <ChevronRight className="ml-1 h-4 w-4" /></Link></motion.div>
          <motion.div variants={reveal} custom={4} className="mt-8 grid max-w-xl gap-3 text-sm text-slate-600 sm:grid-cols-2">{benefits.map(x => <div key={x} className="flex items-center gap-2"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50"><Check className="h-3 w-3 text-emerald-600" /></span>{x}</div>)}</motion.div>
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: .96, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: .9, delay: .15, ease }} className="pb-10 lg:pb-0"><AnimatedProduct /></motion.div>
      </div>
    </section>
  );
}

function TrustStrip() {
  const items = ['Reservas', 'Recepción', 'Habitaciones', 'Cobros', 'Limpieza', 'Mantenimiento', 'WhatsApp IA', 'Reportes'];
  return <section className="overflow-hidden border-y border-slate-200 bg-white py-4"><motion.div animate={{ x: ['0%', '-50%'] }} transition={{ duration: 24, repeat: Infinity, ease: 'linear' }} className="flex w-max items-center">{[...items, ...items].map((item, i) => <div key={`${item}-${i}`} className="flex items-center gap-3 px-7 text-xs font-semibold uppercase tracking-[.14em] text-slate-400"><span className="h-1.5 w-1.5 rounded-full bg-orange-400" />{item}</div>)}</motion.div></section>;
}

function FeatureGrid() {
  return <section className="bg-white px-4 py-24 sm:px-6 lg:px-8 lg:py-32"><div className="mx-auto max-w-[1180px]"><motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: .2 }} className="mx-auto max-w-3xl text-center"><motion.p variants={reveal} className="text-xs font-bold uppercase tracking-[.22em] text-orange-500">Todo conectado</motion.p><motion.h2 variants={reveal} custom={1} className="mt-4 text-4xl font-bold tracking-[-.035em] text-slate-950 sm:text-5xl">Un sistema que se siente más simple de lo que hace.</motion.h2><motion.p variants={reveal} custom={2} className="mt-5 text-lg leading-8 text-slate-600">La operación sigue siendo completa. La interfaz deja de sentirse complicada.</motion.p></motion.div><div className="mt-14 grid gap-3 md:grid-cols-2 lg:grid-cols-3">{features.map((f, i) => <motion.div key={f.title} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .2 }} transition={{ duration: .55, delay: i*.05, ease }} whileHover={{ y: -5 }} className="group rounded-3xl border border-slate-200 bg-slate-50/50 p-6 transition-shadow hover:shadow-[0_25px_70px_-35px_rgba(15,23,42,.35)]"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200"><f.icon className="h-5 w-5 text-orange-500" /></div><h3 className="mt-5 text-lg font-semibold text-slate-950">{f.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{f.text}</p></motion.div>)}</div></div></section>;
}

function ProductShowcase() {
  const [active, setActive] = useState(0);
  const current = screens[active];
  return <section className="overflow-hidden bg-slate-950 px-4 py-24 text-white sm:px-6 lg:px-8 lg:py-32"><div className="mx-auto max-w-[1240px]"><div className="grid items-center gap-12 lg:grid-cols-[.72fr_1.28fr]"><div><p className="text-xs font-bold uppercase tracking-[.22em] text-orange-400">El producto, sin video</p><h2 className="mt-4 text-4xl font-bold tracking-[-.04em] sm:text-5xl">Mira lo que importa.<br /><span className="text-white/40">Sin esperar que cargue nada.</span></h2><p className="mt-5 max-w-lg text-base leading-7 text-white/60">En lugar de un video pesado, la landing muestra las áreas reales del sistema con transiciones instantáneas y control total del usuario.</p><div className="mt-8 space-y-2">{screens.map((s, i) => <button key={s.label} onClick={() => setActive(i)} className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left transition ${i === active ? 'bg-white text-slate-950' : 'text-white/65 hover:bg-white/5 hover:text-white'}`}><span><span className="block text-sm font-semibold">{s.label}</span>{i === active && <span className="mt-1 block text-xs text-slate-500">{s.text}</span>}</span><ChevronRight className="h-4 w-4" /></button>)}</div></div><div className="relative"><div aria-hidden className="absolute -inset-10 rounded-[50%] bg-orange-500/10 blur-3xl" /><AnimatePresence mode="wait"><motion.div key={current.label} initial={{ opacity: 0, scale: .97, x: 24 }} animate={{ opacity: 1, scale: 1, x: 0 }} exit={{ opacity: 0, scale: .98, x: -18 }} transition={{ duration: .45, ease }} className="relative overflow-hidden rounded-[26px] border border-white/10 bg-white p-2 shadow-2xl"><div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2"><span className="h-2.5 w-2.5 rounded-full bg-slate-200" /><span className="h-2.5 w-2.5 rounded-full bg-slate-200" /><span className="h-2.5 w-2.5 rounded-full bg-slate-200" /><span className="ml-2 text-[10px] font-semibold text-slate-400">VULO · {current.label}</span></div><img src={current.src} alt={`Pantalla de ${current.label} en VULO`} className="w-full rounded-b-[18px] object-cover" /></motion.div></AnimatePresence></div></div></div></section>;
}

function Workflow() {
  const steps = [
    { icon: MessageSquare, title: 'El huésped pregunta', text: 'WhatsApp, llamada o recepción.' },
    { icon: Bot, title: 'VULO centraliza', text: 'Disponibilidad, datos y contexto en un solo lugar.' },
    { icon: ScanLine, title: 'Recepción ejecuta', text: 'Reserva, check-in, cobro o seguimiento sin brincar entre sistemas.' },
    { icon: BarChart3, title: 'Gerencia entiende', text: 'Operación y resultados visibles con métricas claras.' },
  ];
  return <section className="bg-[#F8FAFC] px-4 py-24 sm:px-6 lg:px-8 lg:py-32"><div className="mx-auto max-w-[1180px]"><div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[.22em] text-orange-500">Cómo se siente usarlo</p><h2 className="mt-4 text-4xl font-bold tracking-[-.035em] text-slate-950 sm:text-5xl">Todo sigue el flujo del hotel.</h2></div><div className="relative mt-14 grid gap-4 md:grid-cols-4"><div className="absolute left-[12%] right-[12%] top-8 hidden h-px bg-gradient-to-r from-transparent via-orange-300 to-transparent md:block" />{steps.map((s,i) => <motion.div key={s.title} initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i*.08, duration: .55, ease }} className="relative rounded-3xl border border-slate-200 bg-white p-5"><div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg"><s.icon className="h-5 w-5" /></div><p className="mt-6 text-[11px] font-bold uppercase tracking-wider text-orange-500">0{i+1}</p><h3 className="mt-2 font-semibold text-slate-950">{s.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{s.text}</p></motion.div>)}</div></div></section>;
}

function Impact() {
  const stats = useMemo(() => [['1 sistema','para toda la operación'],['24/7','asistencia por WhatsApp'],['100%','web y responsive'],['0 video','más velocidad en la landing']], []);
  return <section className="bg-white px-4 py-20 sm:px-6 lg:px-8"><div className="mx-auto max-w-[1180px] rounded-[32px] border border-slate-200 bg-slate-950 p-6 text-white sm:p-10 lg:p-12"><div className="grid gap-8 lg:grid-cols-[1fr_1.2fr] lg:items-center"><div><div className="inline-flex items-center gap-2 rounded-full bg-orange-500/10 px-3 py-1.5 text-xs font-semibold text-orange-300"><Zap className="h-3.5 w-3.5" />Diseñado para moverse rápido</div><h2 className="mt-5 text-3xl font-bold tracking-[-.035em] sm:text-4xl">Menos fricción para el equipo. Más claridad para quien dirige.</h2></div><div className="grid grid-cols-2 gap-3">{stats.map(([a,b]) => <div key={a} className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-2xl font-bold text-white">{a}</p><p className="mt-1 text-xs leading-5 text-white/50">{b}</p></div>)}</div></div></div></section>;
}

function CTA() {
  return <section className="bg-white px-4 pb-24 pt-10 sm:px-6 lg:px-8 lg:pb-32"><motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: .7, ease }} className="relative mx-auto max-w-[1180px] overflow-hidden rounded-[34px] px-6 py-14 text-center text-white sm:px-10 lg:py-20" style={{ background: NAVY }}><div aria-hidden className="absolute -left-16 -top-16 h-52 w-52 rounded-full bg-orange-500/20 blur-3xl" /><div aria-hidden className="absolute -bottom-20 right-0 h-64 w-64 rounded-full bg-sky-400/10 blur-3xl" /><div className="relative mx-auto max-w-3xl"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10"><Hotel className="h-6 w-6" /></div><h2 className="mt-6 text-4xl font-bold tracking-[-.04em] sm:text-5xl">Tu hotel no necesita más pantallas.<br /><span className="text-white/45">Necesita más claridad.</span></h2><p className="mx-auto mt-5 max-w-xl text-base leading-7 text-white/65">Muéstranos cómo operas hoy y te enseñamos VULO usando un flujo parecido al de tu hotel.</p><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><a href={WA_DEMO} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center rounded-full px-7 py-3.5 text-sm font-semibold text-white transition hover:-translate-y-0.5" style={{ background: ORANGE }}>Quiero ver una demo <ArrowRight className="ml-2 h-4 w-4" /></a><Link to="/precios" className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white hover:bg-white/10">Ver precios</Link></div></div></motion.div></section>;
}

function Footer() {
  return <footer className="border-t border-slate-200 bg-white px-4 py-10 sm:px-6 lg:px-8"><div className="mx-auto flex max-w-[1180px] flex-col gap-6 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2"><Logo size={28} /><img src={wordmark} alt="VULO" className="h-4 w-auto" /></div><div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500"><Link to="/legal/privacidad">Privacidad</Link><Link to="/legal/terminos">Términos</Link><Link to="/contacto">Contacto</Link></div><p className="text-xs text-slate-400">© 2026 VULO · México</p></div></footer>;
}

export default function Landing() {
  return <div className="min-h-screen bg-white text-slate-950 antialiased"><Helmet><title>VULO | Software hotelero con IA</title><meta name="description" content="VULO centraliza reservas, recepción, habitaciones, cobros, reportes y WhatsApp con IA para hoteles." /></Helmet><Nav /><main><Hero /><TrustStrip /><FeatureGrid /><ProductShowcase /><Workflow /><Impact /><CTA /></main><Footer /></div>;
}
