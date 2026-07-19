import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Check, Minus, ArrowRight } from "lucide-react";
import {
  Reveal,
  Section,
  SectionEyebrow,
  DisplayHeading,
  Lede,
} from "@/marketing/components/atoms";
import { cn } from "@/lib/utils";

type Plan = {
  id: string;
  name: string;
  tag: string;
  price: string;
  suffix: string;
  description: string;
  bullets: string[];
  cta: string;
  featured?: boolean;
};

const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    tag: "Hoteles pequeños",
    price: "$1,490",
    suffix: "MXN / mes",
    description: "Para propiedades de hasta 15 habitaciones que quieren dejar Excel atrás.",
    bullets: [
      "Hasta 15 habitaciones",
      "Reservas · check-in · housekeeping",
      "1 canal OTA sincronizado",
      "WhatsApp con plantillas básicas",
      "3 usuarios incluidos",
      "Soporte por correo",
    ],
    cta: "Empezar con Starter",
  },
  {
    id: "professional",
    name: "Professional",
    tag: "El más elegido",
    price: "$2,890",
    suffix: "MXN / mes",
    description: "Para hoteles boutique y resorts que necesitan un motor completo.",
    bullets: [
      "Hasta 60 habitaciones",
      "Todo lo de Starter",
      "OTAs ilimitados + Channel Manager",
      "Motor de reservas en tu sitio",
      "WhatsApp con IA · automatizaciones",
      "POS · restaurante · room service",
      "10 usuarios incluidos",
      "Soporte prioritario (2h)",
    ],
    cta: "Empezar con Professional",
    featured: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tag: "Cadenas",
    price: "A medida",
    suffix: "hablemos",
    description: "Multi-propiedad, integraciones a la medida y acompañamiento dedicado.",
    bullets: [
      "Habitaciones ilimitadas",
      "Multi-hotel con reportes consolidados",
      "Integraciones a la medida (ERP, contabilidad)",
      "SSO · auditoría avanzada",
      "Usuarios ilimitados",
      "Onboarding acompañado",
      "Manager dedicado",
    ],
    cta: "Hablar con ventas",
  },
];

const FEATURES = [
  { label: "Reservas + Timeline", starter: true, pro: true, ent: true },
  { label: "Recepción · Check-in digital", starter: true, pro: true, ent: true },
  { label: "Housekeeping en vivo", starter: true, pro: true, ent: true },
  { label: "Mantenimiento", starter: true, pro: true, ent: true },
  { label: "Canales OTA", starter: "1", pro: "Ilimitados", ent: "Ilimitados" },
  { label: "Motor de reservas propio", starter: false, pro: true, ent: true },
  { label: "Tarifas · Temporadas", starter: "Básico", pro: "Completo", ent: "Completo" },
  { label: "WhatsApp con IA", starter: "Plantillas", pro: "IA + auto", ent: "IA + auto" },
  { label: "POS · Restaurante", starter: false, pro: true, ent: true },
  { label: "Multi-hotel", starter: false, pro: false, ent: true },
  { label: "SSO · SAML", starter: false, pro: false, ent: true },
  { label: "Soporte", starter: "Correo", pro: "2h · WhatsApp", ent: "Manager dedicado" },
];

const FAQ = [
  {
    q: "¿Tengo que firmar contrato largo?",
    a: "No. VULO es mes a mes. Puedes cancelar cuando quieras. Ofrecemos descuento del 15% si pagas anual, pero nunca te forzamos.",
  },
  {
    q: "¿Cuánto tarda el onboarding?",
    a: "Un hotel boutique estándar está operando en menos de una semana. Nosotros migramos tus reservas actuales, tus tarifas y tus datos de huéspedes.",
  },
  {
    q: "¿Qué pasa con mis datos si me voy?",
    a: "Son tuyos. Exportas todo — reservas, huéspedes, pagos, reportes — en CSV o Excel cuando lo decidas. Sin candados.",
  },
  {
    q: "¿Funciona en tablet y celular?",
    a: "Sí. VULO está diseñado mobile-first. Housekeeping y mantenimiento trabajan casi todo desde el celular.",
  },
  {
    q: "¿Cobran comisión por reserva?",
    a: "Nunca. Lo que reservas directo en tu motor es tuyo al 100%.",
  },
  {
    q: "¿Aceptan pago con tarjeta?",
    a: "Sí, y también transferencia SPEI. Facturamos con RFC en México.",
  },
];

export default function Pricing() {
  return (
    <>
      <Helmet>
        <title>Precios — VULO</title>
        <meta name="description" content="Planes claros y sin sorpresas. Starter, Professional y Enterprise. Sin comisión por reserva. Cancela cuando quieras." />
        <link rel="canonical" href="https://vulo.mx/pricing" />
        <meta property="og:title" content="Precios — VULO" />
        <meta property="og:url" content="https://vulo.mx/pricing" />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQ.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          })}
        </script>
      </Helmet>

      <Section className="pt-14 md:pt-24">
        <Reveal className="max-w-3xl">
          <SectionEyebrow>Precios</SectionEyebrow>
          <DisplayHeading as="h1" className="mt-6" size="xl">
            Un precio justo por operar tranquilo.
          </DisplayHeading>
          <Lede className="mt-8">
            Sin letras chiquitas. Sin comisiones por reserva. Sin contratos que
            asfixian. Escoge el plan que se acomode a tu hotel — puedes cambiar
            cuando quieras.
          </Lede>
        </Reveal>
      </Section>

      <Section className="pt-16 md:pt-20">
        <div className="grid gap-6 md:grid-cols-3 md:gap-5">
          {PLANS.map((p, i) => (
            <Reveal
              key={p.id}
              delay={i * 0.06}
              className={cn(
                "flex flex-col rounded-[26px] border p-8 transition-all md:p-9",
                p.featured
                  ? "border-foreground bg-foreground text-background shadow-[0_40px_100px_-40px_rgba(15,23,42,0.55)]"
                  : "border-border/70 bg-card",
              )}
            >
              <div className={cn("text-[11px] font-semibold uppercase tracking-[0.16em]", p.featured ? "text-background/60" : "text-accent")}>
                {p.tag}
              </div>
              <div className="mt-4 text-2xl font-semibold tracking-tight">{p.name}</div>
              <p className={cn("mt-3 text-[14.5px] leading-[1.55]", p.featured ? "text-background/75" : "text-muted-foreground")}>
                {p.description}
              </p>
              <div className="mt-8 flex items-baseline gap-2">
                <span className="text-4xl font-semibold tracking-tight md:text-5xl">{p.price}</span>
                <span className={cn("text-sm", p.featured ? "text-background/60" : "text-muted-foreground")}>{p.suffix}</span>
              </div>
              <ul className="mt-8 space-y-3">
                {p.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2.5 text-[14.5px] leading-[1.5]">
                    <Check className={cn("mt-0.5 h-4 w-4 shrink-0", p.featured ? "text-background" : "text-primary")} />
                    <span className={p.featured ? "text-background/90" : "text-foreground/85"}>{b}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/contact"
                className={cn(
                  "mt-10 inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-[14.5px] font-medium transition-transform hover:scale-[1.02]",
                  p.featured
                    ? "bg-background text-foreground"
                    : "bg-foreground text-background",
                )}
              >
                {p.cta} <ArrowRight className="h-4 w-4" />
              </Link>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* Comparador */}
      <Section className="pt-32 md:pt-40">
        <Reveal className="max-w-3xl">
          <SectionEyebrow>Comparador</SectionEyebrow>
          <DisplayHeading className="mt-5" size="lg">
            Todo lo que incluye cada plan.
          </DisplayHeading>
        </Reveal>

        <Reveal className="mt-14 overflow-hidden rounded-[24px] border border-border/70">
          <div className="grid grid-cols-[1.4fr_repeat(3,1fr)] bg-secondary/60 text-[12.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            <div className="px-6 py-4">Función</div>
            <div className="px-6 py-4 text-center">Starter</div>
            <div className="px-6 py-4 text-center text-foreground">Professional</div>
            <div className="px-6 py-4 text-center">Enterprise</div>
          </div>
          {FEATURES.map((f, i) => (
            <div
              key={f.label}
              className={cn(
                "grid grid-cols-[1.4fr_repeat(3,1fr)] items-center text-[14px]",
                i !== FEATURES.length - 1 && "border-b border-border/60",
              )}
            >
              <div className="px-6 py-4 font-medium text-foreground">{f.label}</div>
              {[f.starter, f.pro, f.ent].map((v, ci) => (
                <div key={ci} className="px-6 py-4 text-center text-foreground/80">
                  {v === true ? (
                    <Check className="mx-auto h-4 w-4 text-primary" />
                  ) : v === false ? (
                    <Minus className="mx-auto h-4 w-4 text-muted-foreground/60" />
                  ) : (
                    <span>{v}</span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </Reveal>
      </Section>

      {/* FAQ */}
      <Section className="pt-32 md:pt-40">
        <div className="grid gap-14 lg:grid-cols-[1fr_1.6fr] lg:gap-20">
          <Reveal>
            <SectionEyebrow>Preguntas</SectionEyebrow>
            <DisplayHeading className="mt-5" size="md">
              Lo que suelen preguntarnos antes de contratar.
            </DisplayHeading>
            <Lede className="mt-6">
              Si no encuentras la respuesta que necesitas, escríbenos. Contestamos
              rápido.
            </Lede>
          </Reveal>
          <div className="divide-y divide-border/70 border-t border-border/70">
            {FAQ.map((f, i) => (
              <Reveal key={f.q} delay={i * 0.04} className="py-7">
                <h3 className="text-[17px] font-semibold text-foreground">{f.q}</h3>
                <p className="mt-2 text-[14.5px] leading-[1.6] text-muted-foreground">{f.a}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </Section>

      <Section className="pt-32">
        <Reveal className="mx-auto flex max-w-2xl flex-col items-center text-center">
          <DisplayHeading size="lg">
            ¿Listo para ver VULO con tus datos?
          </DisplayHeading>
          <Link to="/contact" className="mt-10 inline-flex items-center gap-2 rounded-full bg-foreground px-7 py-4 text-[15px] font-medium text-background">
            Agendar una demo <ArrowRight className="h-4 w-4" />
          </Link>
        </Reveal>
      </Section>
    </>
  );
}