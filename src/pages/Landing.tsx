import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import {
  ArrowRight, ChevronDown, Check, Calendar, ClipboardList, Sparkles,
  Wallet, FileText, MessageSquare, BarChart3, Building2, ShieldCheck,
  Users, LifeBuoy, CreditCard, Globe, Receipt, Send,
  Bot, ScanLine, Phone, MapPin, Menu, X,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import wordmark from '@/assets/vulo-wordmark.png';
import foxIsotype from '@/assets/vulo-fox.png';
import shotTimeline from '@/assets/screens/timeline.png';
import shotHabitaciones from '@/assets/screens/habitaciones.png';
import shotClientes from '@/assets/screens/clientes.png';
import shotChats from '@/assets/screens/chats.png';
import shotReportes from '@/assets/screens/reportes.png';
import shotTarifas from '@/assets/screens/tarifas.png';

/**
 * VULO — Landing (ES-MX)
 * Rediseño 2026-07: hero muestra el producto, no la mascota.
 */

const NAVY = '#10233F';
const ORANGE = '#F97316';
const ease = [0.22, 1, 0.36, 1] as const;
const WA_DEMO = 'https://wa.me/523171035768?text=Hola%2C%20quiero%20ver%20una%20demo%20de%20VULO%20con%20los%20datos%20de%20mi%20hotel';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.7, delay: i * 0.05, ease } }),
};

function SectionTag({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-6 text-[12px] font-semibold uppercase tracking-[0.24em]" style={{ color: ORANGE }}>
      {children}
    </div>
  );
}

function BrowserFrame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_30px_80px_-30px_rgba(15,23,42,0.25)]">
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        <span className="ml-3 text-[11px] font-medium text-slate-500">{title}</span>
      </div>
      <div className="p-5 md:p-6">{children}</div>
    </div>
  );
}

/* ── hooks utilitarios ── */
function useReducedMotion() {
  const [r, setR] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setR(mq.matches);
    const h = (e: MediaQueryListEvent) => setR(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);
  return r;
}
function usePageVisible() {
  const [v, setV] = useState(true);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const h = () => setV(!document.hidden);
    document.addEventListener('visibilitychange', h);
    return () => document.removeEventListener('visibilitychange', h);
  }, []);
  return v;
}

/* ══════════════════ NAV ══════════════════ */
function Nav() {
  const [openMobile, setOpenMobile] = useState(false);
  useEffect(() => {
    if (openMobile) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [openMobile]);

  const LINKS: Array<[string, string]> = [
    ['Inicio', '/'],
    ['Funciones', '/funciones'],
    ['Precios', '/precios'],
    ['Empresa', '/empresa'],
    ['Contacto', '/contacto'],
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-2 px-4 sm:px-6 lg:px-10">
        <Link to="/" className="flex shrink-0 items-center gap-2 sm:gap-2.5">
          <Logo size={32} />
          <img src={wordmark} alt="VULO" className="h-4 w-auto object-contain sm:h-5 md:h-6" />
        </Link>
        <nav className="hidden items-center gap-9 md:flex">
          {LINKS.map(([label, href]) => (
            <Link key={href} to={href} className="text-[14px] font-medium text-slate-600 transition hover:text-slate-900">{label}</Link>
          ))}
        </nav>
        <div className="hidden shrink-0 items-center gap-2 md:flex">
          <Link
            to="/login"
            className="inline-flex h-10 items-center whitespace-nowrap rounded-full px-4 text-[13.5px] font-semibold text-white shadow-sm transition hover:opacity-95"
            style={{ background: ORANGE }}
          >
            Iniciar sesión
          </Link>
          <a
            href={WA_DEMO}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center whitespace-nowrap rounded-full border-[1.5px] px-4 text-[13.5px] font-semibold transition hover:bg-orange-50"
            style={{ borderColor: ORANGE, color: ORANGE }}
          >
            Agendar demo
          </a>
        </div>
        <button
          type="button"
          aria-label="Abrir menú"
          onClick={() => setOpenMobile(true)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-700 md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Drawer mobile */}
      <AnimatePresence>
        {openMobile && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm md:hidden"
              onClick={() => setOpenMobile(false)}
            />
            <motion.aside
              key="drawer"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.35, ease }}
              className="fixed right-0 top-0 z-[70] flex h-full w-[86%] max-w-[360px] flex-col bg-white shadow-2xl md:hidden"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div className="flex items-center gap-2">
                  <Logo size={30} />
                  <img src={wordmark} alt="VULO" className="h-4 w-auto object-contain" />
                </div>
                <button
                  type="button"
                  aria-label="Cerrar menú"
                  onClick={() => setOpenMobile(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto px-5 py-6">
                <ul className="space-y-1">
                  {LINKS.map(([label, href]) => (
                    <li key={href}>
                      <Link
                        to={href}
                        onClick={() => setOpenMobile(false)}
                        className="block rounded-xl px-3 py-3 text-[18px] font-semibold text-slate-900 transition hover:bg-slate-50"
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
              <div className="space-y-2.5 border-t border-slate-100 px-5 py-5">
                <a
                  href={WA_DEMO}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-12 w-full items-center justify-center rounded-full border-[1.5px] text-[15px] font-semibold"
                  style={{ borderColor: ORANGE, color: ORANGE }}
                >
                  Agendar demo
                </a>
                <Link
                  to="/login"
                  onClick={() => setOpenMobile(false)}
                  className="flex h-12 w-full items-center justify-center rounded-full text-[15px] font-semibold text-white"
                  style={{ background: ORANGE }}
                >
                  Iniciar sesión
                </Link>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}

/* ══════════════════ 1. HERO ══════════════════ */
function Hero() {
  const scrollTo = (id: string) => {
    if (typeof document === 'undefined') return;
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  return (
    <section className="relative overflow-hidden bg-white">
      <div className="mx-auto grid max-w-[1280px] gap-14 px-6 pb-20 pt-14 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:px-10 lg:pb-28 lg:pt-24">
        <motion.div initial="hidden" animate="show" className="flex flex-col justify-center">
          <motion.div variants={fadeUp} custom={0}><SectionTag>Software para hoteles · con IA</SectionTag></motion.div>
          <motion.h1
            variants={fadeUp}
            custom={1}
            className="text-[38px] font-bold leading-[1.04] tracking-[-0.035em] text-slate-900 md:text-[56px] lg:text-[64px]"
          >
            Mira cómo VULO atiende tu hotel
            <br />
            <span className="text-slate-400">mientras tú duermes.</span>
          </motion.h1>
          <motion.p variants={fadeUp} custom={2} className="mt-6 max-w-xl text-[16.5px] leading-relaxed text-slate-600 md:text-[18px]">
            Reservas, recepción, habitaciones, cobros y WhatsApp con IA — un solo sistema
            que trabaja 24/7. Esto que ves a la derecha está pasando en tiempo real.
          </motion.p>
          <motion.div variants={fadeUp} custom={3} className="mt-8 flex flex-wrap items-center gap-3">
            <Button
              asChild
              size="lg"
              className="h-[52px] rounded-full px-7 text-[15px] font-medium text-white shadow-none hover:opacity-95"
              style={{ background: ORANGE }}
            >
              <a href={WA_DEMO} target="_blank" rel="noreferrer">
                Ver demo con mis datos <ArrowRight className="ml-1 h-4 w-4" />
              </a>
            </Button>
            <button
              type="button"
              onClick={() => scrollTo('como-funciona')}
              className="inline-flex h-[52px] items-center gap-1.5 rounded-full border-[1.5px] px-6 text-[15px] font-medium transition hover:bg-slate-50"
              style={{ borderColor: NAVY, color: NAVY }}
            >
              Cómo funciona <ChevronDown className="h-4 w-4" />
            </button>
          </motion.div>
          <motion.div variants={fadeUp} custom={4} className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-slate-500">
            <span>Responde en segundos</span>
            <span aria-hidden>·</span>
            <span>Crea la reserva sola</span>
            <span aria-hidden>·</span>
            <span>Hecho en México <span aria-hidden>🇲🇽</span></span>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease, delay: 0.15 }}
          className="relative"
        >
          <HeroDemo />
        </motion.div>
      </div>
    </section>
  );
}

/* Hero interactive demo: WhatsApp animation + Timeline peeking behind */
function HeroDemo() {
  const reduced = useReducedMotion();
  const visible = usePageVisible();

  const msgs: Array<{ from: 'g' | 'ia'; t: string; time: string }> = [
    { from: 'g', t: 'Hola, ¿tienen habitación para hoy? Somos 2.', time: '02:14' },
    { from: 'ia', t: 'Hola 👋 Sí, tenemos disponibilidad. ¿Solo esta noche o incluyes mañana?', time: '02:14' },
    { from: 'g', t: 'Solo esta noche.', time: '02:15' },
    { from: 'ia', t: 'Perfecto. Doble Estándar $1,290 MXN c/desayuno. ¿La aparto a nombre de López?', time: '02:15' },
    { from: 'g', t: 'Sí, apártala por favor.', time: '02:16' },
    { from: 'ia', t: 'Listo ✅ Reserva RES-2026-1042 · Hab. 204. Te esperamos.', time: '02:16' },
  ];
  const TOTAL = msgs.length;
  // step semantics: 0..TOTAL-1 typing / TOTAL success shown, TOTAL+1 fading out
  const [step, setStep] = useState(reduced ? TOTAL : 0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (reduced || !visible) return;
    if (step < TOTAL) {
      const t = setTimeout(() => setStep((s) => s + 1), 1200);
      return () => clearTimeout(t);
    }
    // step === TOTAL: mostrar chip éxito, esperar 3s, luego fade out
    const tFade = setTimeout(() => setFading(true), 3000);
    const tReset = setTimeout(() => {
      setFading(false);
      setStep(0);
    }, 3800);
    return () => {
      clearTimeout(tFade);
      clearTimeout(tReset);
    };
  }, [step, reduced, visible, TOTAL]);

  const reservationCreated = step >= TOTAL;

  return (
    <div className="relative mx-auto w-full max-w-[520px]">
      {/* Halo naranja */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-70 blur-3xl"
        style={{ background: 'radial-gradient(closest-side, rgba(249,115,22,0.22), transparent 70%)' }}
      />

      {/* Timeline peek detrás */}
      <div
        className="pointer-events-none absolute -right-4 -top-6 z-0 w-[280px] rotate-[3deg] sm:-right-8 sm:-top-10 sm:w-[320px] md:w-[360px]"
        style={{ transformOrigin: 'top right' }}
      >
        <BrowserFrame title="vulo · calendario">
          <HeroMatrixPeek highlight={reservationCreated} />
        </BrowserFrame>
      </div>

      {/* WhatsApp al frente */}
      <motion.div
        animate={{ opacity: fading ? 0 : 1, y: fading ? -6 : 0 }}
        transition={{ duration: 0.6, ease }}
        className="relative z-10 mt-16 max-h-[400px] sm:mt-24 sm:max-h-none"
      >
        <BrowserFrame title="WhatsApp · Huésped nuevo">
          <div className="flex flex-col" style={{ background: '#EFE8DE' }}>
            <div className="flex items-center gap-3 border-b border-black/5 bg-[#f5efe6] px-4 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-semibold text-white" style={{ background: NAVY }}>H</div>
              <div className="flex-1">
                <div className="text-[13px] font-semibold text-slate-900">Huésped · +52 331 428 90…</div>
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  IA respondiendo · 02:14 a.m.
                </div>
              </div>
              <div className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white" style={{ background: ORANGE }}>IA</div>
            </div>
            <div className="flex min-h-[260px] flex-col gap-2 px-4 py-4 sm:min-h-[320px]">
              <AnimatePresence initial={false}>
                {msgs.slice(0, step).map((m, i) => (
                  <motion.div
                    key={`${step}-${i}`}
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.3, ease }}
                    className={`max-w-[82%] rounded-[14px] px-3 py-2 text-[12.5px] leading-snug shadow-sm ${
                      m.from === 'g' ? 'self-start bg-white text-slate-900' : 'self-end text-slate-900'
                    }`}
                    style={m.from === 'ia' ? { background: '#D9FDD3' } : undefined}
                  >
                    <div>{m.t}</div>
                    <div className="mt-0.5 text-right text-[9.5px] text-slate-400">{m.time}</div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {reservationCreated && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease }}
                  className="mt-2 self-center inline-flex items-center gap-2 rounded-full bg-emerald-500 px-3 py-1.5 text-[11px] font-semibold text-white shadow"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  Reserva creada en el sistema ✓
                </motion.div>
              )}
            </div>
            <div className="flex items-center gap-2 border-t border-black/5 bg-[#f5efe6] px-3 py-2.5">
              <div className="flex-1 rounded-full bg-white px-3 py-1.5 text-[11.5px] text-slate-400">Escribe un mensaje…</div>
              <div className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: NAVY }}>
                <Send className="h-3 w-3 text-white" />
              </div>
            </div>
          </div>
        </BrowserFrame>
      </motion.div>
    </div>
  );
}

/* Matriz de reservas compacta para el hero — con barra "López" que aparece al confirmarse la reserva */
function HeroMatrixPeek({ highlight }: { highlight: boolean }) {
  const rooms = [
    { h: '201', bars: [{ s: 0, l: 3, c: NAVY, label: 'García' }] },
    { h: '202', bars: [{ s: 2, l: 3, c: '#0F766E', label: 'Kim' }] },
    { h: '203', bars: [{ s: 1, l: 2, c: NAVY, label: 'Torres' }] },
    { h: '204', bars: [] as Array<{ s: number; l: number; c: string; label: string }> },
    { h: '208', bars: [{ s: 3, l: 3, c: NAVY, label: 'Ruiz' }] },
  ];
  return (
    <div>
      <div className="mb-1.5 grid grid-cols-[28px_repeat(7,1fr)] gap-1 text-[8.5px] font-medium text-slate-400">
        <span />
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
          <span key={i} className="text-center">{d}</span>
        ))}
      </div>
      {rooms.map((r) => (
        <div key={r.h} className="mb-1 grid grid-cols-[28px_1fr] items-center gap-1">
          <span className="text-[9px] font-semibold text-slate-500">{r.h}</span>
          <div className="relative h-4 rounded bg-slate-50">
            {r.bars.map((b, i) => (
              <div
                key={i}
                className="absolute top-0 h-4 rounded px-1 text-[8.5px] font-medium leading-4 text-white"
                style={{ left: `${(b.s / 7) * 100}%`, width: `${(b.l / 7) * 100}%`, background: b.c }}
              >
                {b.label}
              </div>
            ))}
            {r.h === '204' && (
              <AnimatePresence>
                {highlight && (
                  <motion.div
                    initial={{ opacity: 0, scaleX: 0.4 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5, ease }}
                    className="absolute top-0 h-4 origin-left rounded px-1 text-[8.5px] font-semibold leading-4 text-white ring-2 ring-orange-300"
                    style={{ left: `${(1 / 7) * 100}%`, width: `${(2 / 7) * 100}%`, background: ORANGE }}
                  >
                    López · IA
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>
        </div>
      ))}
      <div className="mt-1 text-right text-[9px] font-medium text-slate-400">Ocupación 78%</div>
    </div>
  );
}

/* ══════════════════ 2. DOLORES (comprimido) ══════════════════ */
function Pains() {
  const items = [
    'La reserva llegó por WhatsApp… y nadie la capturó.',
    'Recepción no sabe qué habitaciones están listas.',
    'El corte de caja nunca cuadra a la primera.',
    'Los reportes se hacen a mano el día 30.',
  ];
  return (
    <section className="border-t border-slate-100 bg-white py-16">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }}>
          <motion.div variants={fadeUp}><SectionTag>Te suena</SectionTag></motion.div>
          <motion.h2 variants={fadeUp} custom={1} className="max-w-3xl text-[30px] font-bold tracking-[-0.03em] text-slate-900 md:text-[44px]">
            Así se ve un hotel operando sin sistema.
          </motion.h2>
        </motion.div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: (i % 4) * 0.06, duration: 0.6, ease }}
              className="rounded-[18px] border border-slate-200 bg-white p-5"
            >
              <div className="mb-3 inline-flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-semibold" style={{ background: '#FFF3EB', color: ORANGE }}>
                {i + 1}
              </div>
              <h3 className="text-[15px] font-semibold leading-snug tracking-tight text-slate-900">{t}</h3>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease }}
          className="mx-auto mt-12 max-w-3xl text-center text-[22px] font-semibold leading-snug tracking-[-0.02em] text-slate-900 md:text-[28px]"
        >
          Nada de esto es culpa de tu equipo.
          <br />
          <span className="text-slate-400">Es culpa de operar con herramientas sueltas.</span>
        </motion.p>
      </div>
    </section>
  );
}

/* ══════════════════ 3. CÓMO FUNCIONA ══════════════════ */
function HowItWorks() {
  const blocks = [
    {
      n: '01',
      title: 'La reserva entra sola, venga de donde venga.',
      body: 'Canales conectados y reservas directas caen al mismo tablero, sin capturas dobles ni overbooking.',
      mockup: <MockInbox />,
    },
    {
      n: '02',
      title: 'El equipo sabe exactamente qué toca hacer.',
      body: 'Al confirmar la reserva se asigna habitación, housekeeping recibe su lista del día y recepción ve la llegada preparada. Todos ven lo mismo, al mismo tiempo.',
      mockup: <MockHousekeeping />,
    },
    {
      n: '03',
      title: 'El cierre cuadra y queda registrado.',
      body: 'Cobros registrados por método de pago, cuenta del huésped clara al hacer check-out, y corte del día que cuadra sin perseguir papelitos.',
      mockup: <MockCheckout />,
    },
  ];
  return (
    <section id="como-funciona" className="border-t border-slate-100 bg-slate-50/60 py-28 scroll-mt-24">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        <div className="mx-auto max-w-3xl text-center">
          <SectionTag>Cómo funciona</SectionTag>
          <h2 className="text-[34px] font-bold tracking-[-0.03em] text-slate-900 md:text-[52px]">
            Tres momentos que definen
            <br />
            <span className="text-slate-400">si el huésped vuelve.</span>
          </h2>
        </div>

        <div className="mt-20 space-y-24">
          {blocks.map((b, i) => (
            <motion.div
              key={b.n}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.8, ease }}
              className={`grid items-center gap-10 lg:grid-cols-2 lg:gap-16 ${i % 2 === 1 ? 'lg:[&>*:first-child]:order-2' : ''}`}
            >
              <div>
                <div className="mb-4 text-[13px] font-mono font-semibold" style={{ color: ORANGE }}>{b.n}</div>
                <h3 className="text-[26px] font-bold tracking-[-0.025em] text-slate-900 md:text-[34px]">{b.title}</h3>
                <p className="mt-4 max-w-lg text-[16px] leading-relaxed text-slate-600 md:text-[17px]">{b.body}</p>
              </div>
              <div>{b.mockup}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function MockInbox() {
  const script: Array<{ from: 'g' | 'ia'; text: string }> = [
    { from: 'g', text: 'Hola! Tienen habitación para 2 personas del 22 al 25 de julio?' },
    { from: 'ia', text: '¡Hola! Sí, tenemos disponibilidad. Doble con vista al mar $2,400/noche 🌊' },
    { from: 'g', text: 'Perfecto, la aparto a nombre de Ricardo López' },
    { from: 'ia', text: 'Listo Ricardo ✅ Reserva RES-2026-1042 creada. Te comparto link de pago…' },
  ];
  const reduced = useReducedMotion();
  const visible = usePageVisible();
  const [step, setStep] = useState(reduced ? script.length : 0);
  useEffect(() => {
    if (reduced || !visible) return;
    if (step >= script.length) {
      const r = setTimeout(() => setStep(0), 4200);
      return () => clearTimeout(r);
    }
    const t = setTimeout(() => setStep(step + 1), 1400);
    return () => clearTimeout(t);
  }, [step, reduced, visible]);

  return (
    <div className="grid gap-5 lg:grid-cols-[1.05fr_1fr]">
      <div className="mx-auto w-full max-w-[360px] overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_30px_80px_-30px_rgba(15,23,42,0.35)]">
        <div className="flex items-center gap-3 bg-[#075E54] px-4 py-3 text-white">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-[13px] font-semibold">RL</div>
          <div className="flex-1">
            <div className="text-[13.5px] font-semibold leading-tight">Ricardo López</div>
            <div className="text-[10.5px] text-white/70">en línea · WhatsApp</div>
          </div>
          <MessageSquare className="h-4 w-4 opacity-80" />
        </div>
        <div className="min-h-[320px] space-y-2 bg-[#ECE5DD] px-3 py-4">
          <AnimatePresence>
            {script.slice(0, step).map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.35, ease }}
                className={`flex ${m.from === 'ia' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-[12.5px] leading-snug shadow-sm ${m.from === 'ia' ? 'bg-[#DCF8C6] text-slate-800' : 'bg-white text-slate-800'}`}>
                  {m.text}
                </div>
              </motion.div>
            ))}
            {step < script.length && (
              <motion.div
                key="typing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`flex ${step % 2 === 0 ? 'justify-start' : 'justify-end'}`}
              >
                <div className={`flex items-center gap-1 rounded-2xl px-3 py-2 shadow-sm ${step % 2 === 0 ? 'bg-white' : 'bg-[#DCF8C6]'}`}>
                  {[0, 1, 2].map((d) => (
                    <motion.span
                      key={d}
                      className="h-1.5 w-1.5 rounded-full bg-slate-400"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1, repeat: Infinity, delay: d * 0.2 }}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="flex items-center gap-2 border-t border-slate-100 bg-white px-3 py-2.5">
          <div className="flex-1 rounded-full bg-slate-100 px-3 py-1.5 text-[11.5px] text-slate-400">Mensaje…</div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: '#25D366' }}>
            <Send className="h-3.5 w-3.5 text-white" />
          </div>
        </div>
      </div>

      <div className="flex items-center">
        <AnimatePresence mode="wait">
          {step >= script.length ? (
            <motion.div
              key="card"
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5, ease }}
              className="w-full rounded-[18px] border border-slate-200 bg-white p-5 shadow-[0_20px_50px_-25px_rgba(15,23,42,0.3)]"
            >
              <div className="mb-3 flex items-center gap-2">
                <span className="inline-flex h-6 items-center gap-1.5 rounded-full px-2 text-[10.5px] font-semibold text-white" style={{ background: ORANGE }}>
                  <Sparkles className="h-3 w-3" /> creada por IA
                </span>
                <span className="text-[10.5px] font-medium text-slate-400">hace 2s</span>
              </div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Reserva</div>
              <div className="text-[18px] font-bold tracking-tight text-slate-900">RES-2026-1042</div>
              <div className="mt-3 space-y-1.5 text-[12.5px]">
                <div className="flex justify-between"><span className="text-slate-500">Huésped</span><span className="font-medium text-slate-900">Ricardo López</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Fechas</span><span className="font-medium text-slate-900">22 – 25 Jul</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Habitación</span><span className="font-medium text-slate-900">Doble · 102</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Origen</span><span className="font-medium" style={{ color: ORANGE }}>WhatsApp</span></div>
              </div>
              <div className="mt-4 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <span className="text-[11px] text-slate-500">Total</span>
                <span className="text-[15px] font-bold" style={{ color: NAVY }}>$7,200 MXN</span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="waiting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full rounded-[18px] border border-dashed border-slate-200 bg-slate-50/60 p-8 text-center"
            >
              <div className="mx-auto mb-3 h-10 w-10 rounded-full border-2 border-dashed border-slate-300" />
              <div className="text-[13px] font-medium text-slate-500">Esperando la conversación…</div>
              <div className="mt-1 text-[11.5px] text-slate-400">VULO detectará la intención y creará la reserva sola.</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function MockHousekeeping() {
  const rooms = [
    { h: '101', s: 'Limpia', c: '#059669' },
    { h: '102', s: 'En proceso', c: ORANGE },
    { h: '103', s: 'Por revisar', c: '#64748B' },
    { h: '104', s: 'Limpia', c: '#059669' },
    { h: '208', s: 'En proceso', c: ORANGE },
    { h: '209', s: 'Por revisar', c: '#64748B' },
  ];
  const tasks = [
    { camarista: 'María', hab: '102', tarea: 'Cambio de ropa de cama' },
    { camarista: 'María', hab: '208', tarea: 'Limpieza salida + amenities' },
    { camarista: 'Luis', hab: '209', tarea: 'Revisión post-check-out' },
  ];
  return (
    <BrowserFrame title="vulo · housekeeping">
      <div className="grid grid-cols-3 gap-2">
        {rooms.map((r) => (
          <div key={r.h} className="rounded-lg border border-slate-100 p-2.5">
            <div className="text-[11px] font-medium text-slate-500">Hab. {r.h}</div>
            <div className="mt-1.5 inline-flex items-center gap-1.5 text-[11.5px] font-semibold" style={{ color: r.c }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: r.c }} />{r.s}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-lg border border-slate-100">
        <div className="border-b border-slate-100 px-3 py-2 text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">Tareas asignadas</div>
        {tasks.map((t, i) => (
          <div key={i} className="flex items-center justify-between border-b border-slate-100 px-3 py-2 text-[12px] last:border-b-0">
            <span className="font-medium text-slate-900">{t.camarista}</span>
            <span className="text-slate-600">Hab. {t.hab} · {t.tarea}</span>
          </div>
        ))}
      </div>
    </BrowserFrame>
  );
}

function MockCheckout() {
  const cargos = [
    { d: 'Hospedaje · 2 noches Hab. 208', v: '$2,400' },
    { d: 'Consumo restaurante', v: '$495' },
    { d: 'Lavandería', v: '$120' },
  ];
  const corte = [
    { m: 'Efectivo', v: '$3,850' },
    { m: 'Tarjeta', v: '$6,200' },
    { m: 'Transferencia', v: '$2,400' },
  ];
  return (
    <BrowserFrame title="vulo · check-out">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-[13px] font-semibold text-slate-900">Cuenta · Ruiz, D.</div>
          <div className="text-[11px] text-slate-500">Hab. 208 · check-out 12:00</div>
        </div>
        <span className="rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold text-white" style={{ background: NAVY }}>Por cobrar</span>
      </div>
      <div className="rounded-lg border border-slate-100">
        {cargos.map((c, i) => (
          <div key={i} className="flex items-center justify-between border-b border-slate-100 px-3 py-2 text-[12.5px] last:border-b-0">
            <span className="text-slate-700">{c.d}</span>
            <span className="font-medium text-slate-900">{c.v}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
        <span className="text-[11px] uppercase tracking-wider text-slate-500">Total cuenta</span>
        <span className="text-[15px] font-bold" style={{ color: NAVY }}>$3,015 MXN</span>
      </div>
      <div className="mt-4 rounded-lg bg-slate-50 p-3">
        <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">Corte del día · por método</div>
        <div className="grid grid-cols-3 gap-2">
          {corte.map((c) => (
            <div key={c.m} className="rounded-md bg-white p-2 text-center">
              <div className="text-[10.5px] text-slate-500">{c.m}</div>
              <div className="text-[13px] font-bold" style={{ color: NAVY }}>{c.v}</div>
            </div>
          ))}
        </div>
      </div>
    </BrowserFrame>
  );
}

/* ══════════════════ 4. FRICTION BAND ══════════════════ */
function FrictionBand() {
  return (
    <section className="border-t border-slate-100 py-24" style={{ background: NAVY }}>
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease }}
            className="text-[36px] font-bold tracking-[-0.03em] text-white md:text-[54px]"
          >
            Menos fricción.
            <br />
            <span style={{ color: ORANGE }}>Más huéspedes que vuelven.</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease, delay: 0.1 }}
            className="max-w-lg text-[17px] leading-relaxed text-white/70 md:text-[19px]"
          >
            Un hotel bien llevado se nota. VULO lo hace más obvio — desde la primera reserva
            hasta el corte del día, sin pasos que sobren.
          </motion.p>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════ 5. FUNCIONES ══════════════════ */
function Features() {
  const items = [
    { icon: Calendar, t: 'Reservas y calendario', d: 'Timeline visual por habitación, arrastrar y soltar, bloqueos y tarifas por temporada.' },
    { icon: Users, t: 'Recepción · check-in/out', d: 'Llegadas del día, asignación de habitación y cuenta del huésped en un solo lugar.' },
    { icon: Sparkles, t: 'Housekeeping', d: 'Estados de habitación en tiempo real y tareas por camarista.' },
    { icon: Wallet, t: 'Cobros y caja', d: 'Pagos por efectivo, tarjeta o transferencia; corte de caja diario por método.' },
    { icon: FileText, t: 'Facturación CFDI', d: 'Factura al huésped que la pida, timbrada desde el sistema.' },
    { icon: MessageSquare, t: 'WhatsApp integrado', d: 'Conversaciones con huéspedes ligadas a su reserva, sin salir del sistema.' },
    { icon: BarChart3, t: 'Reportes', d: 'Ocupación, ADR, RevPAR e ingresos por periodo, sin armar Excel a mano.' },
    { icon: Building2, t: 'Multi-propiedad', d: 'Varias propiedades, un solo acceso, reportes consolidados.' },
  ];
  return (
    <section className="border-t border-slate-100 bg-white py-28">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        <div className="mx-auto max-w-3xl text-center">
          <SectionTag>Funciones</SectionTag>
          <h2 className="text-[34px] font-bold tracking-[-0.03em] text-slate-900 md:text-[52px]">
            Todo lo que mueve tu hotel,
            <br />
            <span className="text-slate-400">en un solo sistema.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-[15.5px] leading-relaxed text-slate-500">
            Diseñado para que dé gusto usarlo, todos los días. Cada pantalla existe porque alguien la necesita
            para trabajar mejor. No hay pestañas de adorno.
          </p>
        </div>

        <div className="mt-16 grid gap-px overflow-hidden rounded-[22px] border border-slate-200 bg-slate-200 md:grid-cols-2 lg:grid-cols-4">
          {items.map((it, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: (i % 4) * 0.06, duration: 0.6, ease }}
              className="flex flex-col gap-3 bg-white p-7 transition hover:bg-slate-50"
            >
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-[10px]" style={{ background: '#FFF3EB' }}>
                <it.icon className="h-5 w-5" style={{ color: ORANGE }} strokeWidth={1.75} />
              </div>
              <h3 className="text-[16px] font-semibold tracking-tight text-slate-900">{it.t}</h3>
              <p className="text-[13.5px] leading-relaxed text-slate-600">{it.d}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════ 6. HIGHLIGHTS ══════════════════ */
function Highlights() {
  return (
    <section className="border-t border-slate-100 bg-slate-50/60 py-28">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        <div className="mx-auto max-w-3xl text-center">
          <SectionTag>Lo que nos hace distintos</SectionTag>
          <h2 className="text-[34px] font-bold tracking-[-0.03em] text-slate-900 md:text-[52px]">
            IA que atiende WhatsApp
            <br />
            <span className="text-slate-400">y punto de venta integrado.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-slate-500">
            Dos cosas que otros sistemas cobran aparte — o simplemente no tienen.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          {/* IA card */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7, ease }}
            className="overflow-hidden rounded-[22px] border border-slate-200 bg-white p-8 md:p-10"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-[12px]" style={{ background: '#FFF3EB' }}>
                <Bot className="h-5 w-5" style={{ color: ORANGE }} strokeWidth={1.75} />
              </div>
              <span className="rounded-full px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-wider" style={{ background: '#FFF3EB', color: ORANGE }}>
                Incluido
              </span>
            </div>
            <h3 className="mt-6 text-[24px] font-bold tracking-tight text-slate-900 md:text-[28px]">
              Un asistente que responde por ti a las 3 AM.
            </h3>
            <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
              La IA lee cada conversación de WhatsApp, entiende la intención, responde con la información real de tu hotel
              (disponibilidad, tarifas, ubicación) y crea la reserva sola. Tu recepcionista solo interviene cuando importa.
            </p>
            <ul className="mt-5 space-y-2.5 text-[14px] text-slate-700">
              {[
                'Responde 24/7 en segundos, en el mismo tono del hotel',
                'Crea la reserva directo en el sistema, sin capturas manuales',
                'Escala a tu equipo cuando hace falta, con la conversación resumida',
              ].map((t) => (
                <li key={t} className="flex items-start gap-2.5">
                  <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: ORANGE }} strokeWidth={2.5} />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* POS card */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7, ease, delay: 0.1 }}
            className="overflow-hidden rounded-[22px] p-8 text-white md:p-10"
            style={{ background: NAVY }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-white/10">
                <ScanLine className="h-5 w-5 text-white" strokeWidth={1.75} />
              </div>
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-wider text-white/80">
                Punto de venta
              </span>
            </div>
            <h3 className="mt-6 text-[24px] font-bold tracking-tight text-white md:text-[28px]">
              Restaurante, bar o tienda: todo carga al huésped.
            </h3>
            <p className="mt-3 text-[15px] leading-relaxed text-white/70">
              POS táctil para consumos, productos y servicios. Cada venta se puede cobrar al momento o cargar a la habitación,
              y aparece en la cuenta del huésped al hacer check-out. Corte de caja unificado.
            </p>
            <div className="mt-6 rounded-[14px] bg-white/5 p-4">
              <div className="flex items-center justify-between text-[11.5px] text-white/60">
                <span>Ticket · Hab. 208</span>
                <span>19:42</span>
              </div>
              {[
                ['2× Cerveza artesanal', '$180'],
                ['1× Enchiladas suizas', '$220'],
                ['1× Postre del día', '$95'],
              ].map(([l, v]) => (
                <div key={l} className="mt-2 flex items-center justify-between text-[12.5px]">
                  <span className="text-white/80">{l}</span>
                  <span className="font-medium text-white">{v}</span>
                </div>
              ))}
              <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
                <span className="text-[11.5px] uppercase tracking-wider text-white/60">Cargar a habitación</span>
                <span className="text-[15px] font-bold" style={{ color: ORANGE }}>$495 MXN</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════ 7. GALERÍA ══════════════════ */
function Gallery() {
  const tiles: Array<{
    tag: string;
    title: string;
    body: string;
    render: React.ReactNode;
    span?: string;
  }> = [
    { tag: 'Reservas', title: 'Matriz visual por fechas.', body: 'Arrastra, extiende y bloquea. Sin planillas, sin dobles capturas.', span: 'lg:col-span-2', render: <TileMatrix /> },
    { tag: 'IA · WhatsApp', title: 'Conversaciones que se vuelven reservas.', body: 'La IA responde y crea la reserva en el mismo hilo.', render: <TileWA /> },
    { tag: 'Punto de venta', title: 'POS táctil, cuenta al huésped.', body: 'Cobros al momento o cargados a la habitación.', render: <TilePOS /> },
    { tag: 'Housekeeping', title: 'Piso a piso, en tiempo real.', body: 'Recepción ve al instante qué está listo.', span: 'lg:col-span-2', render: <TileHK /> },
  ];
  return (
    <section className="border-t border-slate-100 bg-white py-28">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        <div className="mx-auto max-w-3xl text-center">
          <SectionTag>Por dentro</SectionTag>
          <h2 className="text-[34px] font-bold tracking-[-0.03em] text-slate-900 md:text-[52px]">
            Todo lo que mueve tu hotel,
            <br />
            <span className="text-slate-400">visto en pantalla.</span>
          </h2>
        </div>

        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {tiles.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ delay: (i % 3) * 0.08, duration: 0.7, ease }}
              className={`group overflow-hidden rounded-[20px] border border-slate-200 bg-white p-6 transition hover:shadow-[0_25px_60px_-30px_rgba(15,23,42,0.28)] ${t.span ?? ''}`}
            >
              <div className="flex items-center gap-2">
                <span className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider" style={{ background: '#FFF3EB', color: ORANGE }}>
                  {t.tag}
                </span>
              </div>
              <h3 className="mt-3 text-[18px] font-semibold tracking-tight text-slate-900">{t.title}</h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-slate-500">{t.body}</p>
              <div className="mt-5 overflow-hidden rounded-[12px] border border-slate-100 bg-slate-50/70 p-3">{t.render}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TileMatrix() {
  const rooms = ['101', '102', '103', '104', '208'];
  const bars: Array<{ row: number; start: number; len: number; c: string; label: string }> = [
    { row: 0, start: 0, len: 3, c: NAVY, label: 'García' },
    { row: 1, start: 1, len: 4, c: ORANGE, label: 'López' },
    { row: 2, start: 2, len: 2, c: '#0F766E', label: 'Kim' },
    { row: 3, start: 0, len: 5, c: NAVY, label: 'Torres' },
    { row: 4, start: 3, len: 2, c: ORANGE, label: 'Ruiz' },
  ];
  return (
    <div>
      <div className="mb-2 grid grid-cols-[36px_repeat(7,1fr)] gap-1 text-[9.5px] font-medium text-slate-400">
        <span />
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
          <span key={i} className="text-center">{d}</span>
        ))}
      </div>
      {rooms.map((h, r) => (
        <div key={h} className="mb-1 grid grid-cols-[36px_1fr] items-center gap-1">
          <span className="text-[10px] font-semibold text-slate-500">{h}</span>
          <div className="relative h-5 rounded bg-white">
            {bars.filter((b) => b.row === r).map((b, i) => (
              <div key={i} className="absolute top-0 h-5 rounded px-1.5 text-[9.5px] font-medium leading-5 text-white" style={{ left: `${(b.start / 7) * 100}%`, width: `${(b.len / 7) * 100}%`, background: b.c }}>
                {b.label}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TileWA() {
  return (
    <div className="rounded-lg bg-[#ECE5DD] p-2">
      <div className="mb-1.5 flex justify-start">
        <div className="max-w-[85%] rounded-lg bg-white px-2 py-1.5 text-[10.5px] text-slate-800 shadow-sm">¿Tienen habitación este viernes?</div>
      </div>
      <div className="mb-1.5 flex justify-end">
        <div className="max-w-[85%] rounded-lg bg-[#DCF8C6] px-2 py-1.5 text-[10.5px] text-slate-800 shadow-sm">¡Sí! Doble $2,400 · 22–25 Jul 🌊</div>
      </div>
      <div className="flex justify-end">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-white px-2 py-1 text-[9.5px] font-semibold shadow-sm" style={{ color: ORANGE }}>
          <Sparkles className="h-3 w-3" /> RES-2026-1042 creada
        </div>
      </div>
    </div>
  );
}

function TilePOS() {
  return (
    <div>
      <div className="grid grid-cols-3 gap-1.5">
        {['Café', 'Cerveza', 'Snack', 'Desayuno', 'Comida', 'Postre'].map((p, i) => (
          <div key={p} className="rounded-md border border-slate-100 bg-white p-1.5 text-center text-[10px] font-medium text-slate-700" style={i === 1 ? { background: '#FFF3EB', color: ORANGE, borderColor: '#FED7AA' } : undefined}>
            {p}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between rounded-md bg-white px-2 py-1.5">
        <span className="text-[10px] text-slate-500">Cargar a Hab. 208</span>
        <span className="text-[11px] font-bold" style={{ color: NAVY }}>$495</span>
      </div>
    </div>
  );
}

function TileHK() {
  const rooms = [
    { h: '101', s: 'Limpia', c: '#059669' },
    { h: '102', s: 'En proceso', c: ORANGE },
    { h: '103', s: 'Por revisar', c: '#64748B' },
    { h: '104', s: 'Limpia', c: '#059669' },
    { h: '208', s: 'En proceso', c: ORANGE },
    { h: '209', s: 'Por revisar', c: '#64748B' },
    { h: '210', s: 'Limpia', c: '#059669' },
    { h: '301', s: 'En proceso', c: ORANGE },
  ];
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {rooms.map((r) => (
        <div key={r.h} className="rounded-md bg-white p-2">
          <div className="text-[10px] font-medium text-slate-500">Hab. {r.h}</div>
          <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold" style={{ color: r.c }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: r.c }} />{r.s}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════ 8. PARA QUIÉN ══════════════════ */
function ForWho() {
  const items = [
    { icon: Building2, t: 'Hotel boutique / independiente', d: 'Un equipo chico que necesita orden sin burocracia. El sistema sustituye planillas, WhatsApps sueltos y libretas.' },
    { icon: ClipboardList, t: 'Hotel de paso / alta rotación', d: 'Muchas entradas y salidas al día. Check-in rápido, limpieza al ritmo y caja que cuadra.' },
    { icon: BarChart3, t: 'Grupo con varias propiedades', d: 'Cada propiedad con su equipo y sus tarifas; la dirección con la foto consolidada.' },
  ];
  return (
    <section className="border-t border-slate-100 bg-slate-50/60 py-28">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        <div className="mx-auto max-w-3xl text-center">
          <SectionTag>Para quién</SectionTag>
          <h2 className="text-[34px] font-bold tracking-[-0.03em] text-slate-900 md:text-[52px]">
            Distintos hoteles.
            <br />
            <span className="text-slate-400">La misma tranquilidad.</span>
          </h2>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {items.map((it, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: i * 0.08, duration: 0.7, ease }}
              className="rounded-[20px] border border-slate-200 bg-white p-7"
            >
              <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-[12px]" style={{ background: NAVY }}>
                <it.icon className="h-5 w-5 text-white" strokeWidth={1.75} />
              </div>
              <h3 className="text-[19px] font-semibold tracking-tight text-slate-900">{it.t}</h3>
              <p className="mt-3 text-[14.5px] leading-relaxed text-slate-600">{it.d}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════ 9. INTEGRACIONES ══════════════════ */
function Integrations() {
  const live = [
    { name: 'Booking.com', icon: Globe, color: '#003580' },
    { name: 'WhatsApp Business', icon: MessageSquare, color: '#25D366' },
    { name: 'Stripe', icon: CreditCard, color: '#635BFF' },
    { name: 'SAT · CFDI 4.0', icon: Receipt, color: '#B91C1C' },
  ];
  const soon = [
    { name: 'Airbnb', color: '#FF5A5F' },
    { name: 'Expedia', color: '#FFC72C' },
    { name: 'Google Hotel Ads', color: '#4285F4' },
  ];
  return (
    <section id="integraciones" className="border-t border-slate-100 bg-white py-28 scroll-mt-24">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        <div className="mx-auto max-w-3xl text-center">
          <SectionTag>Ecosistema</SectionTag>
          <h2 className="text-[34px] font-bold tracking-[-0.03em] text-slate-900 md:text-[52px]">
            Conecta con lo que ya usas.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-slate-500">
            Los canales, cobros y facturación que ya operan tu hotel — hablando entre sí, sin dobles capturas.
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-4xl">
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            {live.map((it, i) => (
              <motion.div
                key={it.name}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07, duration: 0.6, ease }}
                whileHover={{ y: -4 }}
                className="group flex flex-col items-center gap-3 rounded-[16px] border border-slate-200 bg-white p-5 text-center transition hover:shadow-[0_20px_50px_-25px_rgba(15,23,42,0.25)]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-[12px]" style={{ background: `${it.color}14` }}>
                  <it.icon className="h-5 w-5" style={{ color: it.color }} strokeWidth={1.75} />
                </div>
                <div className="text-[13.5px] font-semibold text-slate-800">{it.name}</div>
                <div className="inline-flex items-center gap-1 text-[10.5px] font-medium text-emerald-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> conectado
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-8">
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Próximamente</div>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {soon.map((it) => (
                <div key={it.name} className="flex items-center justify-center gap-2 rounded-[14px] border border-dashed border-slate-200 bg-slate-50 p-4 text-[13px] font-medium text-slate-500">
                  <span className="h-2 w-2 rounded-full" style={{ background: it.color }} />
                  {it.name}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════ 10. CONFIANZA ══════════════════ */
function Trust() {
  const items = [
    { icon: Sparkles, t: 'Te lo mostramos con tus datos', d: 'La demo se hace cargando habitaciones y tarifas reales del hotel interesado. Nada de ejemplos abstractos.' },
    { icon: ShieldCheck, t: 'Seguridad', d: 'Respaldos automáticos y accesos por rol: recepción no ve lo que ve gerencia.' },
    { icon: LifeBuoy, t: 'Acompañamiento', d: 'Implementación guiada y soporte por WhatsApp con humano real.' },
  ];
  return (
    <section className="border-t border-slate-100 bg-slate-50/60 py-28">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        <div className="mx-auto max-w-3xl text-center">
          <SectionTag>Confianza</SectionTag>
          <h2 className="text-[34px] font-bold tracking-[-0.03em] text-slate-900 md:text-[52px]">
            Sin testimonios inventados.
            <br />
            <span className="text-slate-400">Solo lo que sí podemos probar.</span>
          </h2>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {items.map((it, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: i * 0.06, duration: 0.7, ease }}
              className="rounded-[18px] border border-slate-200 bg-white p-6"
            >
              <it.icon className="mb-4 h-6 w-6" style={{ color: ORANGE }} strokeWidth={1.75} />
              <h3 className="text-[16px] font-semibold tracking-tight text-slate-900">{it.t}</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-slate-600">{it.d}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════ 11. FAQ ══════════════════ */
function FAQ() {
  const qs = [
    { q: '¿Cuánto tarda la implementación?', a: 'Un hotel boutique suele quedar operando en menos de una semana; grupos multi-propiedad, en dos a tres semanas.' },
    { q: '¿Qué pasa con mis datos si me quiero ir?', a: 'Son tuyos. Exportas tu información (reservas, huéspedes, historial de cobros) en formatos estándar cuando lo pidas. Sin candado.' },
    { q: '¿Funciona en celular y tablet en recepción?', a: 'Sí. La interfaz está pensada para escritorio, tablet y celular. Recepción puede operar desde una tablet sin problema.' },
    { q: '¿Necesito internet todo el tiempo?', a: 'Sí, es un sistema en la nube. Con una conexión estable en recepción es suficiente.' },
    { q: '¿Cómo se cobra?', a: 'Una mensualidad fija por propiedad que incluye todos los módulos, la IA de WhatsApp y el soporte. Sin costos por usuario ni sorpresas. Escríbenos y te cotizamos según el tamaño de tu hotel.' },
    { q: '¿Migran mi información actual?', a: 'Sí. Si vienes de otro sistema o de hojas de cálculo, te ayudamos a subir habitaciones, tarifas, huéspedes y reservas activas en la implementación.' },
  ];
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="border-t border-slate-100 bg-white py-28">
      <div className="mx-auto max-w-[880px] px-6 lg:px-10">
        <div className="text-center">
          <SectionTag>Preguntas frecuentes</SectionTag>
          <h2 className="text-[34px] font-bold tracking-[-0.03em] text-slate-900 md:text-[52px]">
            Lo que suelen preguntarnos.
          </h2>
        </div>

        <div className="mt-12 divide-y divide-slate-200 rounded-[20px] border border-slate-200 bg-white">
          {qs.map((it, i) => {
            const isOpen = open === i;
            return (
              <div key={i}>
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-6 px-6 py-5 text-left transition hover:bg-slate-50"
                >
                  <span className="text-[16px] font-semibold text-slate-900 md:text-[17px]">{it.q}</span>
                  <ChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && <div className="px-6 pb-6 text-[15px] leading-relaxed text-slate-600">{it.a}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════ 12. CTA FINAL ══════════════════ */
function FinalCTA() {
  return (
    <section className="border-t border-slate-100 py-32" style={{ background: NAVY }}>
      <div className="mx-auto max-w-3xl px-6 text-center lg:px-10">
        {/* Chip decorativo — cerrando el loop del hero */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-emerald-500 px-3 py-1.5 text-[11.5px] font-semibold text-white shadow">
          <span className="h-1.5 w-1.5 rounded-full bg-white" />
          Reserva creada en el sistema ✓
        </div>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease }}
          className="text-[38px] font-bold tracking-[-0.03em] text-white md:text-[60px]"
        >
          Un hotel más tranquilo
          <br />
          <span className="text-white/50">empieza con una conversación.</span>
        </motion.h2>
        <p className="mx-auto mt-6 max-w-xl text-[17px] leading-relaxed text-white/70">
          Te mostramos VULO con tus datos, sin compromiso.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg" className="h-[52px] rounded-full px-8 text-[15px] font-medium text-white shadow-none hover:opacity-95" style={{ background: ORANGE }}>
            <a href={WA_DEMO} target="_blank" rel="noreferrer">
              Agendar demo por WhatsApp <ArrowRight className="ml-1 h-4 w-4" />
            </a>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-[52px] rounded-full border-white/25 bg-transparent px-7 text-[15px] font-medium text-white hover:bg-white/10 hover:text-white">
            <a href="mailto:hola@vulo.mx?subject=Agendar%20demo%20VULO">Escríbenos por correo</a>
          </Button>
        </div>
        <div className="mt-8 inline-flex items-center gap-2 text-[13px] text-white/60">
          <MapPin className="h-4 w-4" /> Autlán de Navarro, Jalisco · México
        </div>
      </div>
    </section>
  );
}

/* ══════════════════ FOOTER ══════════════════ */
function Footer() {
  const cols: Array<{ t: string; l: Array<[string, string]> }> = [
    { t: 'Producto', l: [['Funciones', '/funciones'], ['Precios', '/precios'], ['Integraciones', '#integraciones']] },
    { t: 'Empresa', l: [['Sobre VULO', '/empresa'], ['Contacto', '/contacto']] },
    {
      t: 'Contacto',
      l: [
        ['WhatsApp 317 103 5768', 'https://wa.me/523171035768'],
        ['hola@vulo.mx', 'mailto:hola@vulo.mx'],
        ['Autlán de Navarro, Jalisco', '/contacto'],
      ],
    },
    { t: 'Legal', l: [['Términos', '#'], ['Privacidad', '#']] },
  ];
  return (
    <footer className="border-t border-slate-100 bg-white py-16">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div>
            <div className="flex items-center gap-3">
              <img src={foxIsotype} alt="" width={40} height={40} className="h-10 w-10 object-contain" />
              <img src={wordmark} alt="VULO" className="h-5 w-auto object-contain" />
            </div>
            <p className="mt-4 max-w-xs text-[13.5px] leading-relaxed text-slate-500">
              Software para hoteles. Hecho en Autlán de Navarro, Jalisco.
            </p>
            <div className="mt-4 space-y-1.5 text-[13px] text-slate-600">
              <a href="https://wa.me/523171035768" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 hover:text-slate-900">
                <Phone className="h-3.5 w-3.5" /> 317 103 5768
              </a>
              <div className="inline-flex items-center gap-2 text-slate-500">
                <MapPin className="h-3.5 w-3.5" /> Autlán de Navarro, Jalisco
              </div>
            </div>
          </div>
          {cols.map((c) => (
            <div key={c.t}>
              <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">{c.t}</div>
              <ul className="space-y-2">
                {c.l.map(([label, href]) => {
                  const external = href.startsWith('http') || href.startsWith('mailto:');
                  const anchor = href.startsWith('#');
                  if (external || anchor) {
                    return (
                      <li key={label}>
                        <a href={href} className="text-[13.5px] text-slate-600 hover:text-slate-900">{label}</a>
                      </li>
                    );
                  }
                  return (
                    <li key={label}>
                      <Link to={href} className="text-[13.5px] text-slate-600 hover:text-slate-900">{label}</Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-6 text-[12px] text-slate-400">
          <div>© {new Date().getFullYear()} VULO · Autlán de Navarro, Jalisco, México</div>
          <div className="inline-flex items-center gap-2">
            <span>Desarrollado por</span>
            <span className="font-semibold text-slate-700">Uniline</span>
            <span className="text-slate-400">· Innovación en la nube</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ══════════════════ PÁGINA ══════════════════ */
export default function Landing() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'VULO',
    description:
      'El sistema hotelero que atiende WhatsApp con IA, crea reservas solo y cuadra tu caja. Recepción, housekeeping, cobros y reportes en un solo lugar.',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    url: 'https://vulo.mx/',
    author: { '@type': 'Organization', name: 'Uniline · Innovación en la nube' },
    provider: {
      '@type': 'Organization',
      name: 'VULO',
      telephone: '+52-317-103-5768',
      address: { '@type': 'PostalAddress', addressLocality: 'Autlán de Navarro', addressRegion: 'Jalisco', addressCountry: 'MX' },
    },
    offers: { '@type': 'Offer', priceCurrency: 'MXN', price: '0', availability: 'https://schema.org/InStock', description: 'Agenda una demo · precios por propiedad.' },
  };

  return (
    <div className="min-h-screen bg-white text-slate-900" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <Helmet>
        <html lang="es-MX" />
        <title>Software para Hoteles con IA en WhatsApp | VULO</title>
        <meta
          name="description"
          content="El sistema que atiende WhatsApp, crea reservas solo y cuadra tu caja. Reservas, recepción, housekeeping y cobros para hoteles en México. Demo con tus datos."
        />
        <link rel="canonical" href="https://vulo.mx/" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://vulo.mx/" />
        <meta property="og:title" content="Software para Hoteles con IA en WhatsApp | VULO" />
        <meta property="og:description" content="El sistema que atiende WhatsApp, crea reservas solo y cuadra tu caja. Demo con tus datos." />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Software para Hoteles con IA en WhatsApp | VULO" />
        <meta name="twitter:description" content="El sistema que atiende WhatsApp, crea reservas solo y cuadra tu caja. Demo con tus datos." />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <Nav />
      <Hero />
      <Pains />
      <HowItWorks />
      <SystemPreview />
      <FrictionBand />
      <Features />
      <Highlights />
      <Gallery />
      <ForWho />
      <Integrations />
      <Trust />
      <FAQ />
      <FinalCTA />
      <Footer />
    </div>
  );
}
