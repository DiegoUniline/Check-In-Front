import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Check, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageShell, SectionTag, NAVY, ORANGE, ease } from './landing/Chrome';

const plans = [
  {
    name: 'Starter',
    tagline: 'Para hoteles boutique que empiezan a ordenar la operación.',
    price: 'Desde',
    priceNote: 'Cotización según habitaciones',
    features: [
      'Hasta 20 habitaciones',
      'Reservas y calendario',
      'Recepción · check-in/out',
      'Housekeeping en tiempo real',
      'Cobros y corte de caja',
      'Reportes básicos',
      'Soporte por WhatsApp',
    ],
  },
  {
    name: 'Pro',
    tagline: 'La configuración recomendada para hoteles activos.',
    price: 'Recomendado',
    priceNote: 'Todo lo importante, incluido',
    highlighted: true,
    features: [
      'Habitaciones ilimitadas',
      'Todo lo de Starter',
      'IA para WhatsApp (agente)',
      'Motor de reservas online',
      'Punto de venta + inventario',
      'Facturación CFDI 4.0',
      'Reportes avanzados y auditoría',
      'Soporte prioritario',
    ],
  },
  {
    name: 'Enterprise',
    tagline: 'Grupos con varias propiedades y reportería consolidada.',
    price: 'A la medida',
    priceNote: 'Implementación acompañada',
    features: [
      'Multi-propiedad ilimitada',
      'Todo lo de Pro',
      'Roles y permisos avanzados',
      'Reportería consolidada',
      'Integraciones dedicadas',
      'Onboarding con equipo Uniline',
      'SLA y soporte dedicado',
    ],
  },
];

const faq = [
  { q: '¿Cómo se cobra VULO?', a: 'Mensualidad por propiedad, ajustada al tamaño del hotel. Sin cargos por usuario. La cotización se define en la demo, con tus datos reales.' },
  { q: '¿Hay contrato forzoso?', a: 'No. Es mes a mes. Si decides irte, exportas toda tu información (reservas, huéspedes, cobros) en formatos estándar.' },
  { q: '¿La implementación tiene costo?', a: 'La implementación acompañada varía según tamaño y complejidad. En la demo definimos alcance y tiempos exactos.' },
  { q: '¿Puedo empezar sin conectar canales?', a: 'Sí. Puedes operar solo con reservas directas y WhatsApp, y sumar canales (Booking, Airbnb) cuando quieras.' },
];

export default function Precios() {
  return (
    <PageShell>
      <Helmet>
        <title>Precios | VULO — Software para hoteles</title>
        <meta name="description" content="Planes de VULO ajustados al tamaño de tu hotel. Sin cargos por usuario. Agenda una demo para tu cotización exacta." />
        <link rel="canonical" href="https://vulo.mx/precios" />
      </Helmet>

      <section className="bg-white">
        <div className="mx-auto max-w-[1280px] px-6 pb-14 pt-20 lg:px-10 lg:pb-20 lg:pt-28">
          <SectionTag>Precios</SectionTag>
          <h1 className="max-w-3xl text-[40px] font-bold leading-[1.05] tracking-[-0.035em] text-slate-900 md:text-[60px]">
            Un precio justo,
            <br />
            <span className="text-slate-400">al tamaño de tu hotel.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-[17px] leading-relaxed text-slate-600 md:text-[19px]">
            La cotización se hace con tus habitaciones, tus tarifas y tu operación. Sin letras chiquitas.
          </p>
        </div>
      </section>

      <section className="border-t border-slate-100 bg-slate-50/60 py-20">
        <div className="mx-auto grid max-w-[1280px] gap-5 px-6 lg:grid-cols-3 lg:px-10">
          {plans.map((p, i) => (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.7, ease, delay: i * 0.08 }}
              className={`flex flex-col rounded-[22px] border p-8 ${p.highlighted ? 'text-white' : 'border-slate-200 bg-white text-slate-900'}`}
              style={p.highlighted ? { background: NAVY, borderColor: NAVY } : undefined}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-[22px] font-bold tracking-tight">{p.name}</h2>
                {p.highlighted && (
                  <span className="rounded-full px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-wider text-white" style={{ background: ORANGE }}>
                    Popular
                  </span>
                )}
              </div>
              <p className={`mt-2 text-[13.5px] leading-relaxed ${p.highlighted ? 'text-white/70' : 'text-slate-500'}`}>
                {p.tagline}
              </p>
              <div className="mt-6">
                <div className={`text-[28px] font-bold ${p.highlighted ? 'text-white' : ''}`} style={!p.highlighted ? { color: NAVY } : undefined}>
                  {p.price}
                </div>
                <div className={`text-[12.5px] ${p.highlighted ? 'text-white/60' : 'text-slate-500'}`}>
                  {p.priceNote}
                </div>
              </div>
              <ul className="mt-6 flex-1 space-y-2.5 text-[14px]">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: ORANGE }} strokeWidth={2.5} />
                    <span className={p.highlighted ? 'text-white/85' : 'text-slate-700'}>{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                asChild
                className={`mt-8 h-[48px] rounded-full text-[14px] font-medium shadow-none hover:opacity-95 ${p.highlighted ? 'text-white' : 'text-white'}`}
                style={{ background: p.highlighted ? ORANGE : NAVY }}
              >
                <Link to="/contacto">Agendar demo <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
            </motion.div>
          ))}
        </div>

        <p className="mx-auto mt-10 max-w-2xl px-6 text-center text-[13.5px] leading-relaxed text-slate-500">
          Todos los planes incluyen respaldos automáticos, actualizaciones y soporte por WhatsApp con humano real.
        </p>
      </section>

      <section className="border-t border-slate-100 bg-white py-24">
        <div className="mx-auto max-w-[880px] px-6 lg:px-10">
          <div className="text-center">
            <SectionTag>Preguntas frecuentes</SectionTag>
            <h2 className="text-[30px] font-bold tracking-[-0.03em] text-slate-900 md:text-[44px]">
              Sobre precios y contrato.
            </h2>
          </div>
          <div className="mt-10 divide-y divide-slate-200 rounded-[20px] border border-slate-200 bg-white">
            {faq.map((it) => (
              <div key={it.q} className="px-6 py-5">
                <div className="text-[16px] font-semibold text-slate-900">{it.q}</div>
                <p className="mt-2 text-[14.5px] leading-relaxed text-slate-600">{it.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PageShell>
  );
}