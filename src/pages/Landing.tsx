import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Calendar, MessageSquare, Sparkles, Bot, ArrowUpRight, Check,
  BedDouble, Users, BarChart3, Zap,
} from 'lucide-react';
import { Logo } from '@/components/Logo';

/**
 * VULO — Landing pública
 * Filosofía: Apple + Stripe + Linear. Blanco 80%, Navy 15%, Naranja 5%.
 * Vende tranquilidad, no funciones. Muestra, no explica.
 */

const BRAND_NAVY = '#10233F';
const BRAND_ORANGE = '#F97316';

const ease = [0.22, 1, 0.36, 1] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.7, delay: i * 0.06, ease },
  }),
};

/* ────────────────────────────────────────────────────────────────
   NAV
   ────────────────────────────────────────────────────────────── */
function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-transparent bg-white/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-6 lg:px-10">
        <Link to="/" className="flex items-center gap-2.5">
          <Logo size={28} />
          <span className="text-[19px] font-bold tracking-[-0.03em]" style={{ color: BRAND_NAVY }}>
            vulo<span style={{ color: BRAND_ORANGE }}>.</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          {['Producto', 'Reservas', 'IA', 'Precios'].map((l) => (
            <a key={l} href={`#${l.toLowerCase()}`} className="text-[14px] font-medium text-slate-600 transition hover:text-slate-900">
              {l}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link to="/login" className="hidden text-[14px] font-medium text-slate-600 transition hover:text-slate-900 sm:block">
            Iniciar sesión
          </Link>
          <Button asChild size="sm" className="h-10 rounded-full bg-[#F97316] px-5 text-[14px] font-medium text-white shadow-none hover:bg-[#ea6a10]">
            <Link to="/registro">Empezar gratis</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

/* ────────────────────────────────────────────────────────────────
   HERO — pantalla completa, texto enorme, tranquilo
   ────────────────────────────────────────────────────────────── */
function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Halo naranja tenue */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full opacity-[0.06] blur-3xl" style={{ background: BRAND_ORANGE }} />
      <div className="mx-auto max-w-[1440px] px-6 pb-24 pt-20 lg:px-10 lg:pb-32 lg:pt-28">
        <motion.div initial="hidden" animate="show" className="mx-auto max-w-4xl text-center">
          <motion.div variants={fadeUp} custom={0} className="mb-8 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-[13px] font-medium text-slate-700">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: BRAND_ORANGE }} />
            Nuevo · IA para operaciones de hotel
          </motion.div>
          <motion.h1
            variants={fadeUp}
            custom={1}
            className="mx-auto max-w-4xl text-[44px] font-bold leading-[1.02] tracking-[-0.04em] text-slate-900 md:text-[68px] lg:text-[84px]"
          >
            Gestiona tu hotel.
            <br />
            <span className="text-slate-400">Como debería funcionar</span>
            <br />
            <span style={{ color: BRAND_NAVY }}>en 2026.</span>
          </motion.h1>
          <motion.p variants={fadeUp} custom={2} className="mx-auto mt-8 max-w-2xl text-[18px] leading-relaxed text-slate-600 md:text-[20px]">
            Reservas, recepción, IA, WhatsApp. Todo conectado. Todo automático.
            Un solo lugar para operar tu hotel sin ruido.
          </motion.p>
          <motion.div variants={fadeUp} custom={3} className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="h-[52px] rounded-full bg-[#F97316] px-8 text-[15px] font-medium text-white shadow-none hover:bg-[#ea6a10]">
              <Link to="/registro">Empezar gratis <ArrowUpRight className="ml-1 h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-[52px] rounded-full border-slate-200 bg-white px-8 text-[15px] font-medium text-slate-900 hover:bg-slate-50">
              <Link to="/login">Ver demostración</Link>
            </Button>
          </motion.div>
          <motion.p variants={fadeUp} custom={4} className="mt-6 text-[13px] text-slate-500">
            14 días · sin tarjeta · configuración en minutos
          </motion.p>
        </motion.div>

        {/* Mockup dashboard vivo */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 1, ease }}
          className="relative mx-auto mt-20 max-w-6xl"
        >
          <DashboardMockup />
        </motion.div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────
   MOCKUP dashboard — no screenshot, dashboard vivo
   ────────────────────────────────────────────────────────────── */
function DashboardMockup() {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-2 shadow-[0_30px_80px_-20px_rgba(15,23,42,0.15)]">
      <div className="rounded-[18px] bg-slate-50 p-6 md:p-8">
        {/* Header interno */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <span className="h-3 w-3 rounded-full bg-slate-300" />
              <span className="h-3 w-3 rounded-full bg-slate-300" />
              <span className="h-3 w-3 rounded-full bg-slate-300" />
            </div>
            <span className="ml-3 text-[12px] font-medium text-slate-500">vulo.app · Hotel Plaza Real</span>
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <span className="rounded-full bg-white px-3 py-1 text-[11px] font-medium text-slate-600 shadow-sm">Hoy · Lun 20 Jul</span>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: 'Ocupación', value: '87%', delta: '+12%', color: BRAND_ORANGE },
            { label: 'Ingresos hoy', value: '$48,320', delta: '+8%', color: BRAND_NAVY },
            { label: 'Check-ins', value: '14', delta: 'de 16', color: BRAND_NAVY },
            { label: 'ADR', value: '$1,842', delta: 'MXN', color: BRAND_NAVY },
          ].map((k, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, ease }}
              className="rounded-[14px] border border-slate-200 bg-white p-4"
            >
              <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">{k.label}</div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-[22px] font-bold tracking-tight" style={{ color: k.color }}>{k.value}</span>
                <span className="text-[11px] font-medium text-slate-500">{k.delta}</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Timeline reservas */}
        <div className="mt-4 rounded-[14px] border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-[14px] font-semibold text-slate-900">Reservas · Timeline</div>
              <div className="text-[12px] text-slate-500">Semana en curso</div>
            </div>
            <span className="rounded-full px-3 py-1 text-[11px] font-medium text-white" style={{ background: BRAND_ORANGE }}>En vivo</span>
          </div>

          <div className="space-y-2">
            {[
              { room: '101', name: 'García M.', start: 0, len: 3, tone: 'navy' },
              { room: '102', name: 'López R.', start: 1, len: 4, tone: 'navy' },
              { room: '103', name: 'Booking · Kim', start: 2, len: 2, tone: 'orange' },
              { room: '104', name: 'Web · Torres', start: 0, len: 5, tone: 'navy' },
              { room: '105', name: 'Directo · Ruiz', start: 3, len: 2, tone: 'navy' },
            ].map((r, i) => (
              <motion.div
                key={r.room}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 + i * 0.06, ease }}
                className="flex items-center gap-3"
              >
                <span className="w-10 text-[12px] font-medium text-slate-500">{r.room}</span>
                <div className="relative flex-1">
                  <div className="h-8 rounded-lg bg-slate-100" />
                  <div
                    className="absolute top-0 flex h-8 items-center rounded-lg px-3 text-[12px] font-medium text-white"
                    style={{
                      left: `${r.start * 14}%`,
                      width: `${r.len * 14}%`,
                      background: r.tone === 'orange' ? BRAND_ORANGE : BRAND_NAVY,
                    }}
                  >
                    {r.name}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   STORY — cómo entra una reserva y todo se activa solo
   ────────────────────────────────────────────────────────────── */
function Story() {
  const steps = [
    {
      icon: Calendar,
      title: 'Entra una reserva',
      desc: 'Desde tu web, Booking o WhatsApp. Se registra sola. Sin captura manual.',
    },
    {
      icon: BedDouble,
      title: 'Limpieza recibe aviso',
      desc: 'La habitación asignada aparece en la ruta de housekeeping con hora exacta.',
    },
    {
      icon: Users,
      title: 'Recepción está lista',
      desc: 'Perfil del huésped, preferencias y check-in preparado antes de que llegue.',
    },
    {
      icon: MessageSquare,
      title: 'WhatsApp responde',
      desc: 'Confirmación, recordatorio, ubicación. Automático. Con tu marca.',
    },
  ];

  return (
    <section className="border-t border-slate-100 bg-white py-32">
      <div className="mx-auto max-w-[1440px] px-6 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease }}
          className="mx-auto max-w-3xl text-center"
        >
          <div className="mb-6 text-[13px] font-semibold uppercase tracking-[0.2em]" style={{ color: BRAND_ORANGE }}>
            Cómo funciona
          </div>
          <h2 className="text-[36px] font-bold tracking-[-0.03em] text-slate-900 md:text-[56px]">
            Una reserva entra.
            <br />
            <span className="text-slate-400">Todo lo demás se activa solo.</span>
          </h2>
        </motion.div>

        <div className="mt-20 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: i * 0.1, duration: 0.7, ease }}
              className="group relative"
            >
              <div className="mb-6 flex items-baseline gap-3">
                <span className="text-[13px] font-mono font-medium text-slate-400">0{i + 1}</span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>
              <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-[12px] bg-slate-50 transition group-hover:bg-slate-100">
                <s.icon className="h-5 w-5" style={{ color: BRAND_NAVY }} strokeWidth={1.75} />
              </div>
              <h3 className="mb-2 text-[18px] font-semibold tracking-tight text-slate-900">{s.title}</h3>
              <p className="text-[15px] leading-relaxed text-slate-600">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────
   IA — no dice que tiene IA, la muestra
   ────────────────────────────────────────────────────────────── */
function IABlock() {
  return (
    <section id="ia" className="border-t border-slate-100 bg-slate-50 py-32">
      <div className="mx-auto grid max-w-[1440px] gap-16 px-6 lg:grid-cols-2 lg:gap-24 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease }}
          className="flex flex-col justify-center"
        >
          <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[12px] font-medium text-slate-700">
            <Bot className="h-3.5 w-3.5" style={{ color: BRAND_ORANGE }} />
            Inteligencia integrada
          </div>
          <h2 className="text-[36px] font-bold tracking-[-0.03em] text-slate-900 md:text-[52px]">
            Pregúntale a tu hotel.
          </h2>
          <p className="mt-6 max-w-lg text-[17px] leading-relaxed text-slate-600">
            Sin dashboards eternos. Sin reportes que nadie lee.
            Escribe una pregunta. Recibe una respuesta.
          </p>
          <div className="mt-8 space-y-3 text-[15px] text-slate-700">
            {['Predice ocupación con 7 días de antelación', 'Detecta habitaciones subvaluadas', 'Sugiere tarifas por temporada automáticamente'].map((t) => (
              <div key={t} className="flex items-start gap-3">
                <Check className="mt-0.5 h-5 w-5 shrink-0" style={{ color: BRAND_ORANGE }} strokeWidth={2.5} />
                <span>{t}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.9, ease }}
          className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_-20px_rgba(15,23,42,0.15)] md:p-8"
        >
          <div className="mb-6 flex items-center gap-2 border-b border-slate-100 pb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: BRAND_NAVY }}>
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-[13px] font-medium text-slate-900">VULO Assistant</span>
          </div>

          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="flex justify-end"
            >
              <div className="max-w-[85%] rounded-2xl rounded-br-md bg-slate-100 px-4 py-3 text-[14px] text-slate-800">
                ¿Cuánto venderemos mañana?
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.9 }}
              className="flex justify-start"
            >
              <div className="max-w-[90%] rounded-2xl rounded-bl-md border border-slate-100 bg-white px-4 py-3 text-[14px] leading-relaxed text-slate-800">
                Mañana proyecto <b>$52,400 MXN</b>. Ocupación esperada <b>91%</b> (14 llegadas, 3 salidas).
                Recomiendo subir la tarifa de suites <span style={{ color: BRAND_ORANGE }}>+8%</span> · queda alta demanda.
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 1.5 }}
              className="flex items-center gap-2 pt-2 text-[12px] text-slate-400"
            >
              <span className="inline-block h-2 w-2 animate-pulse rounded-full" style={{ background: BRAND_ORANGE }} />
              Analizando reservas históricas...
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────
   WHATSAPP — conversaciones reales
   ────────────────────────────────────────────────────────────── */
function WhatsApp() {
  const msgs = [
    { from: 'bot', text: 'Hola Diego, tu reserva en Hotel Plaza Real está confirmada ✨' },
    { from: 'bot', text: 'Check-in: Vie 24 Jul · 15:00 · Habitación 208' },
    { from: 'user', text: '¿Puedo llegar antes?' },
    { from: 'bot', text: 'Sí, tu habitación estará lista desde las 13:00. Te aviso cuando termine el aseo.' },
    { from: 'user', text: 'Perfecto, gracias 🙌' },
  ];

  return (
    <section className="border-t border-slate-100 bg-white py-32">
      <div className="mx-auto grid max-w-[1440px] gap-16 px-6 lg:grid-cols-2 lg:gap-24 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease }}
          className="order-2 mx-auto w-full max-w-md rounded-[32px] border border-slate-200 bg-slate-50 p-4 shadow-[0_20px_60px_-20px_rgba(15,23,42,0.15)] lg:order-1"
        >
          <div className="mb-4 flex items-center gap-3 border-b border-slate-200 pb-3">
            <div className="h-10 w-10 rounded-full" style={{ background: BRAND_NAVY }} />
            <div>
              <div className="text-[14px] font-semibold text-slate-900">Hotel Plaza Real</div>
              <div className="text-[11px] text-slate-500">en línea · automatizado</div>
            </div>
          </div>
          <div className="space-y-2">
            {msgs.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.25, ease }}
                className={m.from === 'user' ? 'flex justify-end' : 'flex justify-start'}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-[13.5px] leading-snug ${
                    m.from === 'user' ? 'rounded-br-sm bg-[#dcf8c6] text-slate-900' : 'rounded-bl-sm bg-white text-slate-800'
                  }`}
                >
                  {m.text}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease }}
          className="order-1 flex flex-col justify-center lg:order-2"
        >
          <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[12px] font-medium text-slate-700">
            <MessageSquare className="h-3.5 w-3.5" style={{ color: BRAND_ORANGE }} />
            WhatsApp nativo
          </div>
          <h2 className="text-[36px] font-bold tracking-[-0.03em] text-slate-900 md:text-[52px]">
            Tus huéspedes escriben.
            <br />
            <span className="text-slate-400">Tu hotel responde solo.</span>
          </h2>
          <p className="mt-6 max-w-lg text-[17px] leading-relaxed text-slate-600">
            Confirmaciones, recordatorios, check-in y preguntas frecuentes.
            Todo con la voz de tu hotel. Sin robots incómodos.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────
   MÉTRICAS
   ────────────────────────────────────────────────────────────── */
function Metrics() {
  const items = [
    { value: '32 s', label: 'promedio para completar un check-in' },
    { value: '87 %', label: 'de reservas web sin captura manual' },
    { value: '3.4×', label: 'más rápido cerrar el día' },
  ];
  return (
    <section className="border-t border-slate-100 bg-slate-50 py-24">
      <div className="mx-auto max-w-[1440px] px-6 lg:px-10">
        <div className="grid gap-12 md:grid-cols-3">
          {items.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, ease, duration: 0.7 }}
              className="text-center md:text-left"
            >
              <div className="text-[56px] font-bold tracking-[-0.04em] text-slate-900 md:text-[80px]">
                {m.value}
              </div>
              <p className="mt-2 max-w-xs text-[15px] text-slate-600">{m.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────
   FEATURES — grid limpio
   ────────────────────────────────────────────────────────────── */
function Features() {
  const items = [
    { icon: Calendar, title: 'Reservas', desc: 'Timeline visual. Drag & drop. Tiempo real.' },
    { icon: BedDouble, title: 'Habitaciones', desc: 'Estado en vivo por habitación y planta.' },
    { icon: Users, title: 'Recepción', desc: 'Check-in en 30 segundos con firma digital.' },
    { icon: MessageSquare, title: 'WhatsApp', desc: 'Conversaciones automáticas y humanas.' },
    { icon: Bot, title: 'IA', desc: 'Predicción, pricing y respuestas inteligentes.' },
    { icon: BarChart3, title: 'Reportes', desc: 'Ocupación, ADR y RevPAR sin abrir Excel.' },
    { icon: Zap, title: 'POS', desc: 'Cargos a la habitación. Métodos múltiples.' },
    { icon: Sparkles, title: 'Housekeeping', desc: 'Rutas asignadas y checklist digital.' },
  ];
  return (
    <section id="producto" className="border-t border-slate-100 bg-white py-32">
      <div className="mx-auto max-w-[1440px] px-6 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease }}
          className="mx-auto mb-16 max-w-3xl text-center"
        >
          <div className="mb-6 text-[13px] font-semibold uppercase tracking-[0.2em]" style={{ color: BRAND_ORANGE }}>
            Todo en un lugar
          </div>
          <h2 className="text-[36px] font-bold tracking-[-0.03em] text-slate-900 md:text-[52px]">
            Un solo software.
            <br />
            <span className="text-slate-400">Todo tu hotel.</span>
          </h2>
        </motion.div>

        <div className="grid gap-px overflow-hidden rounded-[24px] border border-slate-200 bg-slate-200 md:grid-cols-2 lg:grid-cols-4">
          {items.map((it, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: (i % 4) * 0.06, ease }}
              className="group flex flex-col gap-3 bg-white p-8 transition hover:bg-slate-50"
            >
              <it.icon className="h-6 w-6" style={{ color: BRAND_NAVY }} strokeWidth={1.75} />
              <h3 className="text-[17px] font-semibold tracking-tight text-slate-900">{it.title}</h3>
              <p className="text-[14px] leading-relaxed text-slate-600">{it.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────
   CTA FINAL
   ────────────────────────────────────────────────────────────── */
function FinalCTA() {
  return (
    <section className="border-t border-slate-100 py-32" style={{ background: BRAND_NAVY }}>
      <div className="mx-auto max-w-4xl px-6 text-center lg:px-10">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease }}
          className="text-[40px] font-bold tracking-[-0.03em] text-white md:text-[64px]"
        >
          El próximo estándar
          <br />
          <span className="text-white/50">para hoteles.</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.1, ease }}
          className="mx-auto mt-6 max-w-xl text-[17px] text-white/70"
        >
          Empieza gratis. Sin tarjeta. Configura tu hotel en menos de 10 minutos.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.2, ease }}
          className="mt-10 flex flex-wrap items-center justify-center gap-3"
        >
          <Button asChild size="lg" className="h-[52px] rounded-full bg-[#F97316] px-8 text-[15px] font-medium text-white shadow-none hover:bg-[#ea6a10]">
            <Link to="/registro">Empezar ahora <ArrowUpRight className="ml-1 h-4 w-4" /></Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-[52px] rounded-full border-white/20 bg-transparent px-8 text-[15px] font-medium text-white hover:bg-white/5 hover:text-white">
            <Link to="/login">Ver demostración</Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────
   FOOTER
   ────────────────────────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="border-t border-slate-100 bg-white py-16">
      <div className="mx-auto max-w-[1440px] px-6 lg:px-10">
        <div className="flex flex-wrap items-center justify-between gap-8">
          <div className="flex items-center gap-2.5">
            <Logo size={26} />
            <span className="text-[17px] font-bold tracking-[-0.03em]" style={{ color: BRAND_NAVY }}>
              vulo<span style={{ color: BRAND_ORANGE }}>.</span>
            </span>
          </div>
          <nav className="flex flex-wrap items-center gap-x-8 gap-y-3 text-[13px] text-slate-500">
            <a href="#producto" className="hover:text-slate-900">Producto</a>
            <a href="#ia" className="hover:text-slate-900">IA</a>
            <Link to="/login" className="hover:text-slate-900">Iniciar sesión</Link>
            <Link to="/registro" className="hover:text-slate-900">Empezar gratis</Link>
          </nav>
          <div className="text-[12px] text-slate-400">
            © {new Date().getFullYear()} VULO · Hecho en México
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ────────────────────────────────────────────────────────────────
   PÁGINA
   ────────────────────────────────────────────────────────────── */
export default function Landing() {
  return (
    <div className="min-h-screen bg-white text-slate-900" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <Nav />
      <main>
        <Hero />
        <Story />
        <IABlock />
        <WhatsApp />
        <Metrics />
        <Features />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
