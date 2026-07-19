import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import {
  ArrowRight, ChevronDown, Check, Calendar, ClipboardList, Sparkles,
  Wallet, FileText, MessageSquare, BarChart3, Building2, ShieldCheck,
  Wifi, Smartphone, Users, LifeBuoy,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import wordmark from '@/assets/vulo-wordmark.png';

/**
 * VULO — Landing (ES-MX)
 * Regla de oro: solo se afirma lo que el sistema hace. Datos por verificar → [DATO REAL].
 * Sin fotos de stock. Mockups en HTML/CSS puros.
 */

const NAVY = '#10233F';
const ORANGE = '#F97316';
const ease = [0.22, 1, 0.36, 1] as const;

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

/* ══════════════════ NAV ══════════════════ */
function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-6 lg:px-10">
        <Link to="/" className="flex items-center gap-2.5">
          <Logo size={36} />
          <img src={wordmark} alt="VULO" className="h-5 w-auto object-contain md:h-6" />
        </Link>
        <nav className="hidden items-center gap-9 md:flex">
          <a href="#funciones" className="text-[14px] font-medium text-slate-600 transition hover:text-slate-900">Funciones</a>
          <a href="#precios" className="text-[14px] font-medium text-slate-600 transition hover:text-slate-900">Precios</a>
          <a href="#contacto" className="text-[14px] font-medium text-slate-600 transition hover:text-slate-900">Contacto</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link to="/login" className="hidden text-[14px] font-medium text-slate-600 transition hover:text-slate-900 sm:block">Iniciar sesión</Link>
          <Button asChild size="sm" className="h-10 rounded-full px-5 text-[14px] font-medium text-white shadow-none hover:opacity-95" style={{ background: NAVY }}>
            <a href="#contacto">Agendar demo</a>
          </Button>
        </div>
      </div>
    </header>
  );
}

/* ══════════════════ 1. HERO ══════════════════ */
function Hero() {
  return (
    <section className="relative overflow-hidden bg-white">
      <div className="mx-auto grid max-w-[1280px] gap-14 px-6 pb-20 pt-16 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:px-10 lg:pb-28 lg:pt-24">
        <motion.div initial="hidden" animate="show" className="flex flex-col justify-center">
          <motion.div variants={fadeUp} custom={0}><SectionTag>Software para hoteles</SectionTag></motion.div>
          <motion.h1
            variants={fadeUp}
            custom={1}
            className="text-[40px] font-bold leading-[1.03] tracking-[-0.035em] text-slate-900 md:text-[60px] lg:text-[68px]"
          >
            Tu hotel no necesita más apps.
            <br />
            <span className="text-slate-400">Necesita una sola que sí funcione.</span>
          </motion.h1>
          <motion.p variants={fadeUp} custom={2} className="mt-7 max-w-xl text-[17px] leading-relaxed text-slate-600 md:text-[19px]">
            Reservas, recepción, habitaciones, cobros y WhatsApp en un mismo lugar.
            Deja de perseguir la información: que la información te encuentre a ti.
          </motion.p>
          <motion.div variants={fadeUp} custom={3} className="mt-9 flex flex-wrap items-center gap-4">
            <Button asChild size="lg" className="h-[52px] rounded-full px-7 text-[15px] font-medium text-white shadow-none hover:opacity-95" style={{ background: NAVY }}>
              <a href="#contacto">Agendar una demo <ArrowRight className="ml-1 h-4 w-4" /></a>
            </Button>
            <a href="#funciones" className="group inline-flex items-center gap-1.5 text-[15px] font-medium text-slate-700 hover:text-slate-900">
              Ver funciones <ChevronDown className="h-4 w-4 transition group-hover:translate-y-0.5" />
            </a>
          </motion.div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease, delay: 0.2 }}>
          <HeroMockup />
        </motion.div>
      </div>
    </section>
  );
}

function HeroMockup() {
  const rows = [
    { room: '101', name: 'García M.', start: 0, len: 3, state: 'Confirmada' },
    { room: '102', name: 'López R.', start: 1, len: 4, state: 'Check-in' },
    { room: '103', name: 'Kim J.', start: 2, len: 2, state: 'Pendiente' },
    { room: '104', name: 'Torres A.', start: 0, len: 5, state: 'Confirmada' },
    { room: '208', name: 'Ruiz D.', start: 3, len: 2, state: 'Check-in' },
  ];
  const stateColor = (s: string) =>
    s === 'Check-in' ? ORANGE : s === 'Pendiente' ? '#94A3B8' : NAVY;

  return (
    <BrowserFrame title="vulo · panel">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-[13px] font-semibold text-slate-900">Reservas · esta semana</div>
          <div className="text-[11px] text-slate-500">Lun 20 — Dom 26 Jul</div>
        </div>
        <span className="rounded-full px-2.5 py-0.5 text-[10px] font-medium text-white" style={{ background: ORANGE }}>Live</span>
      </div>

      <div className="space-y-1.5">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="w-8 text-[11px] font-medium text-slate-500">{r.room}</span>
            <div className="relative h-7 flex-1 rounded-md bg-slate-100">
              <div
                className="absolute top-0 flex h-7 items-center rounded-md px-2.5 text-[11px] font-medium text-white"
                style={{ left: `${r.start * 14}%`, width: `${r.len * 14}%`, background: stateColor(r.state) }}
              >
                {r.name}
              </div>
            </div>
            <span className="hidden w-20 text-right text-[10.5px] font-medium md:inline" style={{ color: stateColor(r.state) }}>
              {r.state}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2.5">
        {[
          { l: 'Ocupación', v: '—', h: '[DATO REAL]' },
          { l: 'ADR', v: '—', h: '[DATO REAL]' },
          { l: 'Ingresos semana', v: '—', h: '[DATO REAL]' },
        ].map((m) => (
          <div key={m.l} className="rounded-[10px] border border-slate-100 bg-slate-50 p-3">
            <div className="text-[9.5px] font-semibold uppercase tracking-wider text-slate-500">{m.l}</div>
            <div className="mt-1 text-[18px] font-bold tracking-tight" style={{ color: NAVY }}>{m.v}</div>
            <div className="text-[9.5px] text-slate-400">{m.h}</div>
          </div>
        ))}
      </div>
    </BrowserFrame>
  );
}

/* ══════════════════ 2. DOLORES ══════════════════ */
function Pains() {
  const items = [
    {
      t: 'La reserva llegó por WhatsApp… y nadie la capturó.',
      d: 'Booking en una pestaña, Airbnb en otra, mensajes directos en el celular del dueño. Una reserva perdida es una habitación vacía — o peor, un overbooking.',
    },
    {
      t: 'Recepción no sabe qué habitaciones están listas.',
      d: 'Housekeeping avisa por radio o por mensajito. El huésped espera en el lobby mientras alguien va a revisar el piso.',
    },
    {
      t: 'El corte de caja nunca cuadra a la primera.',
      d: 'Cobros en efectivo, tarjeta y transferencia anotados en tres lugares distintos. Conciliar toma horas y siempre hay un faltante misterioso.',
    },
    {
      t: 'Los reportes se hacen a mano el día 30.',
      d: 'Nadie sabe la ocupación real ni el ADR hasta que ya no se puede hacer nada al respecto.',
    },
  ];
  return (
    <section className="border-t border-slate-100 bg-white py-28">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }}>
          <motion.div variants={fadeUp}><SectionTag>Te suena</SectionTag></motion.div>
          <motion.h2 variants={fadeUp} custom={1} className="max-w-3xl text-[34px] font-bold tracking-[-0.03em] text-slate-900 md:text-[52px]">
            Así se ve un hotel operando sin sistema.
          </motion.h2>
        </motion.div>

        <div className="mt-14 grid gap-5 md:grid-cols-2">
          {items.map((it, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: (i % 2) * 0.08, duration: 0.7, ease }}
              className="rounded-[20px] border border-slate-200 bg-white p-7 md:p-8"
            >
              <div className="mb-4 inline-flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-semibold" style={{ background: '#FFF3EB', color: ORANGE }}>
                {i + 1}
              </div>
              <h3 className="text-[19px] font-semibold tracking-tight text-slate-900 md:text-[21px]">{it.t}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-slate-600">{it.d}</p>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease }}
          className="mx-auto mt-16 max-w-3xl text-center text-[24px] font-semibold leading-snug tracking-[-0.02em] text-slate-900 md:text-[32px]"
        >
          Nada de esto es culpa de tu equipo.
          <br />
          <span className="text-slate-400">Es culpa de operar con herramientas sueltas.</span>
        </motion.p>
      </div>
    </section>
  );
}

/* ══════════════════ 3. CÓMO FUNCIONA (3 momentos) ══════════════════ */
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
    <section id="funciones" className="border-t border-slate-100 bg-slate-50/60 py-28">
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
  const rows = [
    { origen: 'Booking', badge: NAVY, huesped: 'Kim, J.', fechas: '24 – 26 Jul', hab: '103', estado: 'Confirmada' },
    { origen: 'WhatsApp', badge: ORANGE, huesped: 'López, R.', fechas: '22 – 25 Jul', hab: '102', estado: 'Nueva' },
    { origen: 'Directa', badge: '#0F766E', huesped: 'Torres, A.', fechas: '20 – 25 Jul', hab: '104', estado: 'Confirmada' },
    { origen: 'Airbnb', badge: '#B91C1C', huesped: 'Ruiz, D.', fechas: '23 – 24 Jul', hab: '208', estado: 'Confirmada' },
    { origen: 'WhatsApp', badge: ORANGE, huesped: 'García, M.', fechas: '20 – 23 Jul', hab: '101', estado: 'Pendiente' },
  ];
  return (
    <BrowserFrame title="vulo · reservas / bandeja">
      <div className="overflow-hidden rounded-lg border border-slate-100">
        <div className="grid grid-cols-[80px_1fr_90px_50px_90px] gap-3 border-b border-slate-100 bg-slate-50 px-3 py-2 text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">
          <div>Origen</div><div>Huésped</div><div>Fechas</div><div>Hab.</div><div>Estado</div>
        </div>
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-[80px_1fr_90px_50px_90px] items-center gap-3 border-b border-slate-100 px-3 py-2.5 text-[12px] last:border-b-0">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-700">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: r.badge }} />{r.origen}
            </span>
            <span className="font-medium text-slate-900">{r.huesped}</span>
            <span className="text-slate-600">{r.fechas}</span>
            <span className="text-slate-600">{r.hab}</span>
            <span className={r.estado === 'Nueva' ? 'font-semibold' : 'text-slate-500'} style={r.estado === 'Nueva' ? { color: ORANGE } : undefined}>
              {r.estado}
            </span>
          </div>
        ))}
      </div>
    </BrowserFrame>
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
    { d: '2 noches · Hab. 208', v: '[DATO REAL]' },
    { d: 'Consumo restaurante', v: '[DATO REAL]' },
    { d: 'Lavandería', v: '[DATO REAL]' },
  ];
  const corte = [
    { m: 'Efectivo', v: '[DATO REAL]' },
    { m: 'Tarjeta', v: '[DATO REAL]' },
    { m: 'Transferencia', v: '[DATO REAL]' },
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
            <span className="font-medium text-slate-500">{c.v}</span>
          </div>
        ))}
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

/* ══════════════════ 4. FUNCIONES ══════════════════ */
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

/* ══════════════════ 5. PARA QUIÉN ══════════════════ */
function ForWho() {
  const items = [
    {
      icon: Building2,
      t: 'Hotel boutique / independiente',
      d: 'Un equipo chico que necesita orden sin burocracia. El sistema sustituye planillas, WhatsApps sueltos y libretas.',
    },
    {
      icon: ClipboardList,
      t: 'Hotel de paso / alta rotación',
      d: 'Muchas entradas y salidas al día. Check-in rápido, limpieza al ritmo y caja que cuadra.',
    },
    {
      icon: BarChart3,
      t: 'Grupo con varias propiedades',
      d: 'Cada propiedad con su equipo y sus tarifas; la dirección con la foto consolidada.',
    },
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

/* ══════════════════ 6. INTEGRACIONES ══════════════════ */
function Integrations() {
  const live = ['Booking.com', 'WhatsApp Business', 'Stripe', 'SAT · CFDI 4.0'];
  const soon = ['Airbnb', 'Expedia', 'Google Hotel Ads'];
  return (
    <section className="border-t border-slate-100 bg-white py-28">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        <div className="mx-auto max-w-3xl text-center">
          <SectionTag>Ecosistema</SectionTag>
          <h2 className="text-[34px] font-bold tracking-[-0.03em] text-slate-900 md:text-[52px]">
            Conecta con lo que ya usas.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[14px] text-slate-500">
            [LISTA REAL — verificar y ajustar antes de publicar]
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-4xl">
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            {live.map((name) => (
              <div key={name} className="rounded-[14px] border border-slate-200 bg-white p-4 text-center text-[13.5px] font-semibold text-slate-800">
                {name}
              </div>
            ))}
          </div>

          <div className="mt-8">
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Próximamente</div>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {soon.map((name) => (
                <div key={name} className="rounded-[14px] border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-[13px] font-medium text-slate-500">
                  {name}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════ 7. CONFIANZA ══════════════════ */
function Trust() {
  const items = [
    {
      icon: Sparkles,
      t: 'Te lo mostramos con tus datos',
      d: 'La demo se hace cargando habitaciones y tarifas reales del hotel interesado. Nada de ejemplos abstractos.',
    },
    {
      icon: BarChart3,
      t: 'Datos del producto',
      d: '[DATO REAL: hoteles operando · habitaciones gestionadas · reservas procesadas]',
    },
    {
      icon: ShieldCheck,
      t: 'Seguridad',
      d: 'Respaldos automáticos y accesos por rol: recepción no ve lo que ve gerencia.',
    },
    {
      icon: LifeBuoy,
      t: 'Acompañamiento',
      d: 'Implementación guiada y soporte por WhatsApp con humano real. [Ajustar canal]',
    },
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

        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
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

/* ══════════════════ 8. FAQ ══════════════════ */
function FAQ() {
  const qs = [
    { q: '¿Cuánto tarda la implementación?', a: 'Depende del tamaño del hotel. Un hotel boutique suele quedar operando en cuestión de días; grupos multi-propiedad pueden llevar un par de semanas. [DATO REAL: rango típico]' },
    { q: '¿Qué pasa con mis datos si me quiero ir?', a: 'Son tuyos. Exportas tu información (reservas, huéspedes, historial de cobros) en formatos estándar cuando lo pidas. Sin candado.' },
    { q: '¿Funciona en celular y tablet en recepción?', a: 'Sí. La interfaz está pensada para escritorio, tablet y celular. Recepción puede operar desde una tablet sin problema.' },
    { q: '¿Necesito internet todo el tiempo?', a: 'Sí, es un sistema en la nube. Con una conexión estable en recepción es suficiente. [Ajustar si existe modo offline]' },
    { q: '¿Cómo se cobra?', a: '[MODELO REAL: mensualidad por propiedad o por habitación activa. Definir antes de publicar.]' },
    { q: '¿Migran mi información actual?', a: 'Sí. Si vienes de otro sistema o de hojas de cálculo, te ayudamos a subir habitaciones, tarifas, huéspedes y reservas activas en la implementación.' },
  ];
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="precios" className="border-t border-slate-100 bg-white py-28">
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
                {isOpen && (
                  <div className="px-6 pb-6 text-[15px] leading-relaxed text-slate-600">{it.a}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════ 9. CTA FINAL ══════════════════ */
function FinalCTA() {
  return (
    <section id="contacto" className="border-t border-slate-100 py-32" style={{ background: NAVY }}>
      <div className="mx-auto max-w-3xl px-6 text-center lg:px-10">
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
          Te mostramos el sistema con tus habitaciones y tus tarifas. Sin compromiso.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg" className="h-[52px] rounded-full px-8 text-[15px] font-medium text-white shadow-none hover:opacity-95" style={{ background: ORANGE }}>
            <a href="mailto:hola@vulo.mx?subject=Agendar%20demo%20VULO">Agendar una demo <ArrowRight className="ml-1 h-4 w-4" /></a>
          </Button>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════ FOOTER ══════════════════ */
function Footer() {
  const cols = [
    { t: 'Producto', l: [['Funciones', '#funciones'], ['Precios', '#precios'], ['Integraciones', '#funciones']] },
    { t: 'Empresa', l: [['Sobre VULO', '#'], ['Contacto', '#contacto']] },
    { t: 'Recursos', l: [['Centro de ayuda', '#'], ['Estado del sistema', '#']] },
    { t: 'Legal', l: [['Términos', '#'], ['Privacidad', '#']] },
  ];
  return (
    <footer className="border-t border-slate-100 bg-white py-16">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div>
            <div className="flex items-center gap-2.5">
              <Logo size={36} />
              <img src={wordmark} alt="VULO" className="h-5 w-auto object-contain" />
            </div>
            <p className="mt-4 max-w-xs text-[13.5px] leading-relaxed text-slate-500">
              Software para hoteles. Hecho en México.
            </p>
          </div>
          {cols.map((c) => (
            <div key={c.t}>
              <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">{c.t}</div>
              <ul className="space-y-2">
                {c.l.map(([label, href]) => (
                  <li key={label}><a href={href} className="text-[13.5px] text-slate-600 hover:text-slate-900">{label}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-6 text-[12px] text-slate-400">
          <div>© {new Date().getFullYear()} VULO · CDMX, México</div>
          <div className="inline-flex items-center gap-2"><span>Idioma:</span> <span className="font-medium text-slate-600">Español (México)</span></div>
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
      'Sistema de gestión hotelera todo-en-uno: reservas, check-in, housekeeping, cobros y reportes. Hecho para hoteles en México.',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    url: 'https://vulo.mx/',
    offers: {
      '@type': 'Offer',
      priceCurrency: 'MXN',
      price: '0',
      availability: 'https://schema.org/InStock',
      description: 'Agenda una demo · precios por propiedad.',
    },
  };

  return (
    <div className="min-h-screen bg-white text-slate-900" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <Helmet>
        <html lang="es-MX" />
        <title>Software para Hoteles en México | VULO — Reservas, Recepción y Cobros</title>
        <meta
          name="description"
          content="Sistema de gestión hotelera: reservas, check-in, housekeeping, cobros y reportes en un solo lugar. Hecho para hoteles en México. Agenda una demo."
        />
        <link rel="canonical" href="https://vulo.mx/" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://vulo.mx/" />
        <meta property="og:title" content="Software para Hoteles en México | VULO" />
        <meta property="og:description" content="Reservas, recepción, housekeeping, cobros y reportes en un solo lugar." />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <Nav />
      <main>
        <Hero />
        <Pains />
        <HowItWorks />
        <Features />
        <ForWho />
        <Integrations />
        <Trust />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}

// Unused import guards (kept intentionally minimal to avoid stray icon imports)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _unused = { Check, Wifi, Smartphone };