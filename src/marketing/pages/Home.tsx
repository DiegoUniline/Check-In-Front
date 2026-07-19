import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowUpRight, ArrowRight } from "lucide-react";
import foxIcon from "@/assets/vulo-fox.png";
import {
  Reveal,
  Section,
  SectionEyebrow,
  DisplayHeading,
  Lede,
  QuietStat,
  PhotoFrame,
  ScreenshotFrame,
  HairDivider,
} from "@/marketing/components/atoms";
import {
  ShotReservasTimeline,
  ShotWhatsAppCRM,
  ShotDashboardKPIs,
} from "@/marketing/shots";

const HOTELES = ["Hotel Aurora", "Hotel Costa Azul", "Hotel Vista Mar", "Casa Petra", "Marea Norte", "Río Palma"];

const BENEFICIOS = [
  {
    kicker: "Claridad",
    title: "El día del hotel, en una sola vista.",
    body: "Reservas, habitaciones, cobros y pendientes conviven en un mismo lienzo. Nada de saltar entre pestañas para saber qué está pasando.",
  },
  {
    kicker: "Ritmo",
    title: "El equipo se mueve como si fuera uno solo.",
    body: "Recepción, housekeeping, mantenimiento y gerencia ven la misma verdad, en el mismo instante. Menos radios, menos malentendidos.",
  },
  {
    kicker: "Confianza",
    title: "Decisiones respaldadas por lo que ya ocurrió.",
    body: "Ingresos, ocupación, canales, ADR, RevPAR. No para llenar reportes: para actuar antes de que el mes termine.",
  },
];

const PASOS = [
  {
    n: "01",
    title: "Recibe la reserva desde donde llegue.",
    body: "Booking, Airbnb, Expedia, tu motor propio o un mensaje directo por WhatsApp. Todas caen al mismo tablero, sin dobles capturas.",
    photo: "receptionistWoman" as const,
    alt: "Recepcionista atendiendo a un huésped",
  },
  {
    n: "02",
    title: "El equipo sabe exactamente qué toca hacer.",
    body: "La habitación queda asignada, el camarista recibe su lista, mantenimiento entra si hace falta y recepción prepara la llegada.",
    photo: "housekeeperCart" as const,
    alt: "Housekeeping alistando una habitación",
  },
  {
    n: "03",
    title: "El huésped se va, la reputación se queda.",
    body: "Cobros conciliados, factura lista, reseña pedida en el momento justo. Un cierre limpio que se convierte en un huésped que vuelve.",
    photo: "guestCheckin" as const,
    alt: "Huésped haciendo check-in con tablet",
  },
];

const CASOS = [
  {
    tag: "Boutique urbano",
    photo: "lobbyBoutique" as const,
    title: "Hoteles pequeños que compiten como grandes.",
    body: "12 a 40 habitaciones. Un equipo reducido que necesita orden sin burocracia. VULO sustituye planillas, WhatsApps sueltos y libretas.",
  },
  {
    tag: "Resort de playa",
    photo: "beachResort" as const,
    title: "Alta rotación, huésped exigente, todo bajo ritmo.",
    body: "Cuando el sol pega, todo se acelera. Timeline de reservas, POS de restaurante, room service, housekeeping y canales, sincronizados.",
  },
  {
    tag: "Cadena regional",
    photo: "city" as const,
    title: "Varias propiedades, una sola manera de operar.",
    body: "Multi-hotel real: cada propiedad con su equipo, sus tarifas y sus reportes; la dirección con la foto consolidada en tiempo real.",
  },
];

const INTEGRACIONES = [
  "Booking.com", "Airbnb", "Expedia", "Stripe", "WhatsApp Business",
  "Google Calendar", "Google Maps", "Meta Ads", "Mailgun", "Zapier",
  "Slack", "Notion",
];

const TESTIMONIALS = [
  {
    quote:
      "Antes vivíamos en el WhatsApp, en un Excel y en la cabeza del jefe de recepción. Ahora todo está en el mismo lugar y por primera vez el gerente descansa los domingos.",
    name: "Valeria Ortega",
    role: "Gerente General · Hotel Aurora",
    photo: "managerPortrait" as const,
  },
  {
    quote:
      "Migramos desde una plataforma cara y complicada. En dos semanas todo el equipo lo usaba sin quejas. La curva de aprendizaje casi no existió.",
    name: "Diego Fuentes",
    role: "Director de Operaciones · Costa Azul",
    photo: "laptopWorking" as const,
  },
];

export default function Home() {
  return (
    <>
      <Helmet>
        <title>VULO — Operar un hotel, sin ruido</title>
        <meta name="description" content="La forma tranquila de operar un hotel. Reservas, recepción, housekeeping, tarifas y WhatsApp en un mismo lugar." />
        <link rel="canonical" href="https://vulo.mx/" />
        <meta property="og:title" content="VULO — Operar un hotel, sin ruido" />
        <meta property="og:description" content="La forma tranquila de operar un hotel." />
        <meta property="og:url" content="https://vulo.mx/" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "VULO",
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            offers: { "@type": "Offer", price: "0", priceCurrency: "MXN" },
            url: "https://vulo.mx/",
          })}
        </script>
      </Helmet>

      {/* ─────────────── HERO ─────────────── */}
      <Section className="pt-14 md:pt-24 lg:pt-32">
        <div className="grid gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          <Reveal className="flex flex-col justify-center">
            <img src={foxIcon} alt="" width={44} height={44} className="mb-8 h-10 w-10 object-contain md:h-11 md:w-11" />
            <DisplayHeading as="h1" size="xl">
              Menos fricción.<br />
              <span className="text-muted-foreground/85">Más huéspedes que vuelven.</span>
            </DisplayHeading>
            <Lede className="mt-6">
              VULO reúne todo lo que hace mover un hotel — reservas, recepción,
              habitaciones, cobros y conversaciones — en una experiencia calmada,
              rápida y hecha por personas que entienden la operación.
            </Lede>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                to="/features"
                className="inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3.5 text-[15px] font-medium text-background transition-transform hover:scale-[1.02]"
              >
                Ver el producto <ArrowUpRight className="h-4 w-4" />
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center gap-1.5 rounded-full px-4 py-3.5 text-[15px] font-medium text-foreground/80 hover:text-foreground"
              >
                Hablar con ventas <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-14 grid max-w-md grid-cols-3 gap-8">
              <QuietStat value="87%" label="ocupación promedio" />
              <QuietStat value="3m 40s" label="check-in medio" />
              <QuietStat value="< 2h" label="respuesta soporte" />
            </div>
          </Reveal>

          <Reveal delay={0.1} className="relative">
            <PhotoFrame
              photo="lobbyBoutique"
              alt="Lobby de un hotel boutique iluminado con luz cálida"
              aspect="aspect-[4/5]"
              priority
              className="lg:ml-6"
            />
            <div className="absolute -bottom-8 -left-4 hidden w-[380px] sm:block lg:-left-16">
              <ScreenshotFrame label="vulo · panel">
                <ShotDashboardKPIs />
              </ScreenshotFrame>
            </div>
          </Reveal>
        </div>
      </Section>

      {/* ─────────────── Prueba silenciosa ─────────────── */}
      <Section className="pt-28 md:pt-36">
        <Reveal className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-[13px] font-medium tracking-tight text-muted-foreground">
          <span className="text-xs uppercase tracking-[0.16em] text-foreground/60">Confían en VULO</span>
          {HOTELES.map((h) => (<span key={h}>{h}</span>))}
        </Reveal>
      </Section>

      {/* ─────────────── Beneficios ─────────────── */}
      <Section className="pt-32 md:pt-40">
        <Reveal>
          <SectionEyebrow>Por qué VULO</SectionEyebrow>
          <DisplayHeading className="mt-5 max-w-3xl">
            Un hotel bien llevado se nota. VULO lo hace más obvio.
          </DisplayHeading>
        </Reveal>
        <div className="mt-16 grid gap-x-14 gap-y-14 md:grid-cols-3">
          {BENEFICIOS.map((b, i) => (
            <Reveal key={b.kicker} delay={i * 0.06}>
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-accent">{b.kicker}</div>
              <h3 className="mt-4 text-xl font-semibold tracking-tight text-foreground md:text-[22px]">
                {b.title}
              </h3>
              <p className="mt-3 text-[15px] leading-[1.65] text-muted-foreground">{b.body}</p>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ─────────────── Cómo funciona ─────────────── */}
      <Section className="pt-32 md:pt-40">
        <Reveal>
          <SectionEyebrow>Cómo funciona</SectionEyebrow>
          <DisplayHeading className="mt-5 max-w-3xl">
            Tres momentos que definen si el huésped vuelve.
          </DisplayHeading>
        </Reveal>
        <div className="mt-20 space-y-24 md:space-y-32">
          {PASOS.map((p, i) => (
            <Reveal
              key={p.n}
              className={`grid items-center gap-10 lg:grid-cols-2 lg:gap-20 ${
                i % 2 ? "lg:[&>*:first-child]:order-2" : ""
              }`}
            >
              <PhotoFrame photo={p.photo} alt={p.alt} aspect="aspect-[5/4]" />
              <div>
                <div className="font-mono text-sm text-accent">{p.n}</div>
                <h3 className="mt-4 max-w-md text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                  {p.title}
                </h3>
                <p className="mt-4 max-w-md text-[15.5px] leading-[1.65] text-muted-foreground">
                  {p.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ─────────────── Casos de uso ─────────────── */}
      <Section className="pt-32 md:pt-40">
        <Reveal>
          <SectionEyebrow>Para quién</SectionEyebrow>
          <DisplayHeading className="mt-5 max-w-3xl">
            Distintos hoteles. La misma tranquilidad.
          </DisplayHeading>
        </Reveal>
        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {CASOS.map((c, i) => (
            <Reveal key={c.tag} delay={i * 0.08} className="group">
              <PhotoFrame photo={c.photo} alt={c.title} aspect="aspect-[4/5]" />
              <div className="mt-6 text-xs font-medium uppercase tracking-[0.16em] text-accent">
                {c.tag}
              </div>
              <h3 className="mt-3 text-xl font-semibold tracking-tight text-foreground">
                {c.title}
              </h3>
              <p className="mt-3 text-[14.5px] leading-[1.6] text-muted-foreground">{c.body}</p>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ─────────────── Capturas ─────────────── */}
      <Section className="pt-32 md:pt-40">
        <Reveal>
          <SectionEyebrow>Producto</SectionEyebrow>
          <DisplayHeading className="mt-5 max-w-3xl">
            Diseñado para que dé gusto usarlo, todos los días.
          </DisplayHeading>
          <Lede className="mt-6">
            Cada pantalla existe porque alguien la necesita para trabajar mejor.
            No hay pestañas de adorno.
          </Lede>
        </Reveal>

        <div className="mt-16 grid gap-8 lg:grid-cols-5">
          <Reveal className="lg:col-span-3">
            <ScreenshotFrame label="vulo · reservas">
              <ShotReservasTimeline />
            </ScreenshotFrame>
            <p className="mt-4 text-sm text-muted-foreground">
              Timeline de reservas — Hotel Aurora, semana del 12 al 18 de julio.
            </p>
          </Reveal>
          <Reveal delay={0.08} className="lg:col-span-2">
            <ScreenshotFrame label="vulo · conversaciones">
              <ShotWhatsAppCRM />
            </ScreenshotFrame>
            <p className="mt-4 text-sm text-muted-foreground">
              WhatsApp con CRM y respuesta sugerida por IA.
            </p>
          </Reveal>
        </div>
      </Section>

      {/* ─────────────── Integraciones ─────────────── */}
      <Section className="pt-32 md:pt-40">
        <Reveal className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:items-end">
          <div>
            <SectionEyebrow>Ecosistema</SectionEyebrow>
            <DisplayHeading className="mt-5" size="md">
              Conecta con lo que ya usas.
            </DisplayHeading>
          </div>
          <p className="text-[15.5px] leading-[1.65] text-muted-foreground">
            Canales de venta, pagos, mensajería y automatización. VULO se
            entiende con las herramientas que ya viven en tu hotel — no te obliga
            a mudarte de casa.
          </p>
        </Reveal>
        <Reveal className="mt-12">
          <HairDivider />
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
            {INTEGRACIONES.map((i) => (
              <div
                key={i}
                className="border-b border-r border-border/60 px-4 py-6 text-[14px] font-medium tracking-tight text-foreground/85 last:border-r-0 md:[&:nth-child(4n)]:border-r-0 lg:[&:nth-child(4n)]:border-r lg:[&:nth-child(6n)]:border-r-0"
              >
                {i}
              </div>
            ))}
          </div>
        </Reveal>
      </Section>

      {/* ─────────────── Testimonios ─────────────── */}
      <Section className="pt-32 md:pt-40">
        <div className="grid gap-14 md:grid-cols-2 lg:gap-20">
          {TESTIMONIALS.map((t, i) => (
            <Reveal key={t.name} delay={i * 0.08} className="flex flex-col gap-8">
              <blockquote className="text-2xl font-semibold leading-[1.35] tracking-tight text-foreground [text-wrap:balance] md:text-[28px]">
                “{t.quote}”
              </blockquote>
              <div className="flex items-center gap-4">
                <PhotoFrame
                  photo={t.photo}
                  alt={t.name}
                  aspect="aspect-square"
                  rounded="md"
                  className="h-14 w-14 shrink-0"
                />
                <div>
                  <div className="text-[14px] font-semibold text-foreground">{t.name}</div>
                  <div className="text-[13px] text-muted-foreground">{t.role}</div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ─────────────── CTA final ─────────────── */}
      <Section className="pt-40 md:pt-52">
        <Reveal className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <img src={foxIcon} alt="" width={56} height={56} className="h-12 w-12 object-contain md:h-14 md:w-14" />
          <DisplayHeading className="mt-8" size="lg">
            Un hotel más tranquilo empieza con una conversación.
          </DisplayHeading>
          <Lede className="mt-6 text-center">
            Te mostramos VULO con tus datos, sin compromiso.
          </Lede>
          <Link
            to="/contact"
            className="mt-10 inline-flex items-center gap-2 rounded-full bg-foreground px-7 py-4 text-[15px] font-medium text-background transition-transform hover:scale-[1.02]"
          >
            Agendar una demo <ArrowUpRight className="h-4 w-4" />
          </Link>
        </Reveal>
      </Section>
    </>
  );
}