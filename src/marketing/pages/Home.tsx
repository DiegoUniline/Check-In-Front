import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowUpRight, ArrowRight, X, Check } from "lucide-react";
import foxIcon from "@/assets/vulo-fox.png";
import {
  Reveal,
  Section,
  SectionEyebrow,
  DisplayHeading,
  Lede,
  PhotoFrame,
  ScreenshotFrame,
} from "@/marketing/components/atoms";
import {
  ShotReservasTimeline,
  ShotWhatsAppCRM,
  ShotDashboardKPIs,
} from "@/marketing/shots";

/* ────────────────────────────────────────────────────────────
   HOME — 50% dolor, 50% producto.
   Menos texto, más contraste, más capturas.
   ──────────────────────────────────────────────────────────── */

const DOLORES = [
  {
    dolor: "Reservas regadas entre WhatsApp, correo y libretas.",
    consecuencia: "Doble booking. Huésped molesto en recepción.",
    solucion: "Un solo tablero. Toda reserva, todo canal, misma vista.",
  },
  {
    dolor: "Housekeeping y recepción no se entienden.",
    consecuencia: "Habitaciones sucias marcadas como listas. Quejas.",
    solucion: "Estado en vivo. Cuando la camarista termina, recepción lo ve.",
  },
  {
    dolor: "No sabes cuánto ganaste hasta fin de mes.",
    consecuencia: "Decisiones a ciegas. Tarifas que dejan dinero en la mesa.",
    solucion: "Ingresos, ocupación, ADR y RevPAR en tiempo real.",
  },
  {
    dolor: "Contestar WhatsApp roba horas cada día.",
    consecuencia: "Respuestas tarde. Reservas que se van con la competencia.",
    solucion: "IA responde disponibilidad y precios. Tú cierras la venta.",
  },
];

export default function Home() {
  return (
    <>
      <Helmet>
        <title>VULO — Software para hoteles, sin ruido</title>
        <meta name="description" content="Reservas, recepción, housekeeping y WhatsApp en un mismo lugar. Menos fricción, más huéspedes que vuelven." />
        <link rel="canonical" href="https://vulo.mx/" />
        <meta property="og:title" content="VULO — Software para hoteles, sin ruido" />
        <meta property="og:description" content="Un solo lugar para operar tu hotel." />
        <meta property="og:url" content="https://vulo.mx/" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      {/* ─────────────── HERO ─────────────── */}
      <Section className="pt-16 md:pt-28 lg:pt-32">
        <div className="grid gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          <Reveal className="flex flex-col justify-center">
            <img src={foxIcon} alt="" width={44} height={44} className="mb-8 h-11 w-11 object-contain" />
            <DisplayHeading as="h1" size="xl">
              Tu hotel no necesita<br />
              <span className="text-muted-foreground/85">más software.</span><br />
              Necesita menos caos.
            </DisplayHeading>
            <Lede className="mt-6">
              VULO reemplaza las libretas, los WhatsApps sueltos y las hojas de
              Excel con un solo lugar donde tu hotel opera en calma.
            </Lede>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3.5 text-[15px] font-medium text-background transition-transform hover:scale-[1.02]"
              >
                Agendar demo <ArrowUpRight className="h-4 w-4" />
              </Link>
              <Link
                to="/features"
                className="inline-flex items-center gap-1.5 rounded-full px-4 py-3.5 text-[15px] font-medium text-foreground/80 hover:text-foreground"
              >
                Ver el producto <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Reveal>

          <Reveal delay={0.1} className="relative">
            <PhotoFrame
              photo="lobbyBoutique"
              alt="Recepción de un hotel boutique operando en calma"
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

      {/* ─────────────── EL DOLOR ─────────────── */}
      <Section className="pt-40 md:pt-52">
        <Reveal className="max-w-3xl">
          <SectionEyebrow>El problema</SectionEyebrow>
          <DisplayHeading className="mt-5">
            Operar un hotel <span className="text-muted-foreground/80">no debería doler tanto.</span>
          </DisplayHeading>
          <Lede className="mt-6">
            Cuatro cosas rompen la operación todos los días. Las conoces.
          </Lede>
        </Reveal>

        <div className="mt-16 grid gap-px overflow-hidden rounded-[22px] border border-border/70 bg-border/70 md:grid-cols-2">
          {DOLORES.map((d, i) => (
            <Reveal key={i} delay={i * 0.04} className="bg-background p-8 md:p-10">
              <div className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground/5">
                  <X className="h-3.5 w-3.5 text-foreground/50" strokeWidth={2.5} />
                </span>
                <div>
                  <p className="text-[17px] font-semibold leading-snug tracking-tight text-foreground">
                    {d.dolor}
                  </p>
                  <p className="mt-2 text-[14px] leading-[1.55] text-muted-foreground">
                    {d.consecuencia}
                  </p>
                </div>
              </div>
              <div className="mt-6 flex items-start gap-3 border-t border-border/60 pt-6">
                <span className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15">
                  <Check className="h-3.5 w-3.5 text-accent" strokeWidth={2.5} />
                </span>
                <p className="text-[14.5px] leading-[1.55] text-foreground/85">
                  {d.solucion}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ─────────────── LA SOLUCIÓN — PRODUCTO ─────────────── */}
      <Section className="pt-40 md:pt-52">
        <Reveal className="max-w-3xl">
          <SectionEyebrow>La solución</SectionEyebrow>
          <DisplayHeading className="mt-5">
            Todo tu hotel. Una sola pantalla.
          </DisplayHeading>
        </Reveal>

        <div className="mt-16 grid gap-8 lg:grid-cols-5">
          <Reveal className="lg:col-span-3">
            <ScreenshotFrame label="vulo · reservas">
              <ShotReservasTimeline />
            </ScreenshotFrame>
            <p className="mt-4 text-sm text-muted-foreground">
              Timeline en vivo. Arrastra, extiende, reasigna sin salir de la vista.
            </p>
          </Reveal>
          <Reveal delay={0.08} className="lg:col-span-2">
            <ScreenshotFrame label="vulo · whatsapp">
              <ShotWhatsAppCRM />
            </ScreenshotFrame>
            <p className="mt-4 text-sm text-muted-foreground">
              WhatsApp con IA que responde por ti a las 3am.
            </p>
          </Reveal>
        </div>
      </Section>

      {/* ─────────────── ANTES / DESPUÉS ─────────────── */}
      <Section className="pt-40 md:pt-52">
        <Reveal className="max-w-3xl">
          <SectionEyebrow>El cambio</SectionEyebrow>
          <DisplayHeading className="mt-5">
            Antes de VULO, después de VULO.
          </DisplayHeading>
        </Reveal>

        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:gap-8">
          <Reveal className="rounded-[22px] border border-border/70 bg-secondary/40 p-8 md:p-10">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Antes</div>
            <ul className="mt-6 space-y-4 text-[15px] leading-[1.55] text-foreground/75">
              {[
                "3 sistemas abiertos al mismo tiempo",
                "Recepción llama a housekeeping por radio",
                "El gerente arma reportes el domingo en Excel",
                "WhatsApp con 40 mensajes sin contestar",
                "No sabes qué canal te está funcionando",
              ].map((t) => (
                <li key={t} className="flex items-start gap-3">
                  <X className="mt-0.5 h-4 w-4 shrink-0 text-foreground/40" strokeWidth={2.5} />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={0.08} className="rounded-[22px] border border-foreground bg-foreground p-8 text-background md:p-10">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-accent">Con VULO</div>
            <ul className="mt-6 space-y-4 text-[15px] leading-[1.55] text-background/85">
              {[
                "Un solo tablero, una sola verdad",
                "Housekeeping actualiza y recepción lo ve en vivo",
                "Reportes automáticos, cuando los quieras",
                "IA responde WhatsApp con tu tono, 24/7",
                "Cada canal con su ingreso, su ADR y su ocupación",
              ].map((t) => (
                <li key={t} className="flex items-start gap-3">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={2.5} />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </Section>

      {/* ─────────────── TESTIMONIO ÚNICO ─────────────── */}
      <Section className="pt-40 md:pt-52">
        <Reveal className="mx-auto max-w-4xl text-center">
          <blockquote className="text-[28px] font-semibold leading-[1.3] tracking-tight text-foreground [text-wrap:balance] md:text-[38px]">
            “Dejamos de vivir en el WhatsApp del jefe. Por primera vez en tres
            años, cierro el mes sin pelearme con un Excel.”
          </blockquote>
          <div className="mt-8 flex items-center justify-center gap-4">
            <PhotoFrame
              photo="managerPortrait"
              alt="Valeria Ortega"
              aspect="aspect-square"
              rounded="md"
              className="h-14 w-14 shrink-0"
            />
            <div className="text-left">
              <div className="text-[14px] font-semibold text-foreground">Valeria Ortega</div>
              <div className="text-[13px] text-muted-foreground">Gerente General · Hotel Aurora</div>
            </div>
          </div>
        </Reveal>
      </Section>

      {/* ─────────────── CTA FINAL ─────────────── */}
      <Section className="pt-40 pb-24 md:pt-52 md:pb-32">
        <Reveal className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <img src={foxIcon} alt="" width={56} height={56} className="h-14 w-14 object-contain" />
          <DisplayHeading className="mt-8" size="lg">
            Deja de apagar incendios.
          </DisplayHeading>
          <Lede className="mt-6 text-center">
            Te mostramos VULO con datos de tu hotel. 20 minutos. Sin compromiso.
          </Lede>
          <Link
            to="/contact"
            className="mt-10 inline-flex items-center gap-2 rounded-full bg-foreground px-7 py-4 text-[15px] font-medium text-background transition-transform hover:scale-[1.02]"
          >
            Agendar demo <ArrowUpRight className="h-4 w-4" />
          </Link>
        </Reveal>
      </Section>
    </>
  );
}