import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  MessageSquare,
  Mail,
  Clock,
  MapPin,
  FileText,
  ShieldCheck,
  Scale,
  BookOpen,
  LifeBuoy,
  CreditCard,
} from 'lucide-react';
import { PageShell, SectionTag, NAVY, ORANGE, ease } from './landing/Chrome';
import { LEGAL } from '@/marketing/lib/legal';

const WA = `${LEGAL.whatsapp}?text=Hola%20VULO%2C%20necesito%20soporte`;

const canales = [
  {
    icon: MessageSquare,
    titulo: 'WhatsApp',
    detalle: LEGAL.telefono,
    nota: 'El canal más rápido para dudas de operación.',
    href: WA,
    externo: true,
  },
  {
    icon: Mail,
    titulo: 'Correo',
    detalle: LEGAL.email,
    nota: 'Para facturación, datos personales y reportes formales.',
    href: `mailto:${LEGAL.email}`,
    externo: false,
  },
  {
    icon: Clock,
    titulo: 'Horario de atención',
    detalle: LEGAL.horarioCorto,
    nota: 'Las solicitudes fuera de horario se atienden el siguiente día hábil.',
    href: null,
    externo: false,
  },
];

const temas: Array<{ icon: typeof LifeBuoy; t: string; d: string }> = [
  {
    icon: BookOpen,
    t: 'Asistente dentro del sistema',
    d: 'Cada módulo tiene un botón de ayuda que explica qué hace, cómo se usa y en qué momento del día se ocupa. No necesitas capacitación previa.',
  },
  {
    icon: LifeBuoy,
    t: 'Alta de tu hotel',
    d: 'Te ayudamos a cargar tipos de habitación, habitaciones, tarifas, temporadas, productos y usuarios. Hay plantilla de Excel para carga masiva de habitaciones.',
  },
  {
    icon: CreditCard,
    t: 'Facturación y pagos',
    d: 'La suscripción se paga por transferencia o depósito y emitimos CFDI. Escríbenos con tu constancia de situación fiscal para recibir tu comprobante.',
  },
  {
    icon: FileText,
    t: 'Tu información es tuya',
    d: 'Puedes exportar a Excel cualquier módulo cuando quieras: reservas, clientes, habitaciones, inventarios, compras y reportes.',
  },
];

const legales = [
  { icon: Scale, t: 'Aviso de Privacidad', d: 'Qué datos tratamos y cómo ejercer tus derechos ARCO.', to: '/legal/privacidad' },
  { icon: FileText, t: 'Términos y Condiciones', d: 'Condiciones de contratación, pagos, CFDI y cancelación.', to: '/legal/terminos' },
  { icon: ShieldCheck, t: 'Política de Seguridad', d: 'Medidas técnicas y organizativas que protegen tu información.', to: '/legal/seguridad' },
];

export default function Ayuda() {
  return (
    <PageShell>
      <Helmet>
        <title>Soporte y ayuda · VULO Software para Hoteles</title>
        <meta
          name="description"
          content="Soporte de VULO: WhatsApp, correo y horario de atención. Guías de alta del hotel, facturación con CFDI y documentos legales."
        />
        <link rel="canonical" href="https://vulo.mx/ayuda" />
      </Helmet>

      <section className="mx-auto max-w-[1180px] px-6 pt-16 pb-6 lg:px-10 lg:pt-24">
        <SectionTag>Soporte</SectionTag>
        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
          className="mt-4 max-w-[22ch] text-[34px] font-semibold leading-[1.08] tracking-[-0.02em] sm:text-[46px]"
          style={{ color: NAVY }}
        >
          Aquí te contesta una persona, no un ticket.
        </motion.h1>
        <p className="mt-4 max-w-[60ch] text-[16px] leading-relaxed text-slate-600">
          Somos un equipo mexicano. Si algo no te cuadra en recepción a media tarde, escríbenos por
          WhatsApp y lo resolvemos contigo.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {canales.map((c) => {
            const Inner = (
              <div className="h-full rounded-[18px] border border-slate-200 bg-white p-6 transition-shadow hover:shadow-[0_10px_40px_rgba(15,23,42,.08)]">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-[14px]"
                  style={{ background: 'rgba(249,115,22,.10)' }}
                >
                  <c.icon className="h-5 w-5" style={{ color: ORANGE }} strokeWidth={1.6} />
                </div>
                <div className="mt-4 text-[13px] font-medium uppercase tracking-[0.12em] text-slate-400">
                  {c.titulo}
                </div>
                <div className="mt-1 text-[17px] font-semibold" style={{ color: NAVY }}>
                  {c.detalle}
                </div>
                <p className="mt-2 text-[14px] leading-relaxed text-slate-600">{c.nota}</p>
              </div>
            );
            if (!c.href) return <div key={c.titulo}>{Inner}</div>;
            return (
              <a
                key={c.titulo}
                href={c.href}
                target={c.externo ? '_blank' : undefined}
                rel={c.externo ? 'noreferrer' : undefined}
                className="block"
              >
                {Inner}
              </a>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-[1180px] px-6 py-14 lg:px-10">
        <h2 className="text-[26px] font-semibold tracking-[-0.01em]" style={{ color: NAVY }}>
          Lo que más nos preguntan
        </h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {temas.map((t) => (
            <div key={t.t} className="rounded-[18px] border border-slate-200 bg-white p-6">
              <div className="flex items-start gap-4">
                <t.icon className="mt-0.5 h-5 w-5 shrink-0" style={{ color: ORANGE }} strokeWidth={1.6} />
                <div>
                  <div className="text-[16px] font-semibold" style={{ color: NAVY }}>
                    {t.t}
                  </div>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-slate-600">{t.d}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1180px] px-6 pb-14 lg:px-10">
        <h2 className="text-[26px] font-semibold tracking-[-0.01em]" style={{ color: NAVY }}>
          Documentos legales
        </h2>
        <p className="mt-2 max-w-[60ch] text-[15px] text-slate-600">
          Todo lo que firmas y aceptas al usar VULO, escrito conforme a la legislación mexicana.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {legales.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="rounded-[18px] border border-slate-200 bg-white p-6 transition-shadow hover:shadow-[0_10px_40px_rgba(15,23,42,.08)]"
            >
              <l.icon className="h-5 w-5" style={{ color: ORANGE }} strokeWidth={1.6} />
              <div className="mt-4 text-[16px] font-semibold" style={{ color: NAVY }}>
                {l.t}
              </div>
              <p className="mt-1.5 text-[14px] leading-relaxed text-slate-600">{l.d}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1180px] px-6 pb-24 lg:px-10">
        <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-8 md:p-10">
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <div className="text-[13px] font-medium uppercase tracking-[0.12em] text-slate-400">
                Datos del responsable
              </div>
              <div className="mt-3 text-[17px] font-semibold" style={{ color: NAVY }}>
                {LEGAL.titular}
              </div>
              <p className="mt-1 text-[14px] text-slate-600">RFC {LEGAL.rfc}</p>
              <p className="mt-3 flex items-start gap-2 text-[14px] leading-relaxed text-slate-600">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" style={{ color: ORANGE }} strokeWidth={1.6} />
                {LEGAL.domicilio}
              </p>
            </div>
            <div>
              <div className="text-[13px] font-medium uppercase tracking-[0.12em] text-slate-400">
                Datos personales y ARCO
              </div>
              <p className="mt-3 text-[14px] leading-relaxed text-slate-600">
                Para acceder, rectificar, cancelar u oponerte al tratamiento de tus datos personales,
                escribe a{' '}
                <a href={`mailto:${LEGAL.email}`} className="font-medium underline" style={{ color: NAVY }}>
                  {LEGAL.email}
                </a>
                . Respondemos en un plazo máximo de 20 días conforme a la LFPDPPP. El trámite es
                gratuito.
              </p>
              <a
                href={WA}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex h-[52px] items-center justify-center rounded-full px-7 text-[15px] font-medium text-white"
                style={{ background: ORANGE }}
              >
                Escribir por WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
