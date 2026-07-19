import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import foxIcon from "@/assets/vulo-fox.png";
import {
  Reveal,
  Section,
  SectionEyebrow,
  DisplayHeading,
  Lede,
  PhotoFrame,
  QuietStat,
} from "@/marketing/components/atoms";

const PRINCIPIOS = [
  {
    n: "01",
    title: "Silencioso, no ruidoso.",
    body: "Un buen software no llama la atención. Cede el protagonismo a la persona que lo usa y al huésped que la recibe.",
  },
  {
    n: "02",
    title: "Menos, mejor hecho.",
    body: "Preferimos pulir una función durante meses antes que lanzar diez a medias. La operación de un hotel no perdona lo improvisado.",
  },
  {
    n: "03",
    title: "Cerca del huésped.",
    body: "Cada decisión de producto se pone a prueba con una pregunta: ¿esto le va a llegar al huésped? Si no, no vale la pena.",
  },
  {
    n: "04",
    title: "Con dueño, no con jefe.",
    body: "Diseñamos VULO como si fuera nuestra propia propiedad. Con el cuidado y la impaciencia de quien firma la nómina.",
  },
];

const EQUIPO = [
  { name: "Andrés Vidal", role: "Fundador · Producto", photo: "managerPortrait" as const },
  { name: "Camila Reyes", role: "Diseño · Marca", photo: "receptionistWoman" as const },
  { name: "Rodrigo Núñez", role: "Ingeniería", photo: "laptopWorking" as const },
  { name: "Sofía Marín", role: "Éxito de cliente", photo: "tabletHands" as const },
];

const TIMELINE = [
  { year: "2022", title: "Un hotel, una hoja de cálculo", body: "VULO nació como un dashboard interno para un hotel boutique en Puerto Vallarta. Cambió la manera de operar en una temporada." },
  { year: "2023", title: "Primeros diez hoteles", body: "Boutique, resort, urbano. Diferentes tamaños, mismos dolores. Empezamos a ver el patrón." },
  { year: "2024", title: "Motor propio + WhatsApp con IA", body: "El motor de reservas sin comisión y la bandeja compartida con IA marcaron el cambio. Los hoteles empezaron a vender más directo." },
  { year: "2025", title: "Multi-hotel para cadenas", body: "Grupos hoteleros pidieron una sola vista. Lo construimos con ellos." },
  { year: "2026", title: "80+ hoteles operando", body: "Desde Ensenada hasta Tulum. Un mismo equipo, cerca, en el mismo idioma." },
];

export default function About() {
  return (
    <>
      <Helmet>
        <title>Quiénes somos — VULO</title>
        <meta name="description" content="Somos un equipo obsesionado con la operación hotelera. VULO se construyó dentro de un hotel, no en un pizarrón." />
        <link rel="canonical" href="https://vulo.mx/about" />
        <meta property="og:title" content="Quiénes somos — VULO" />
        <meta property="og:url" content="https://vulo.mx/about" />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "VULO",
            url: "https://vulo.mx",
            foundingDate: "2022",
            description: "Plataforma de operación hotelera diseñada para hoteles boutique, resorts y cadenas regionales.",
          })}
        </script>
      </Helmet>

      <Section className="pt-14 md:pt-24">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
          <Reveal>
            <img src={foxIcon} alt="" width={44} height={44} className="mb-8 h-10 w-10 object-contain md:h-11 md:w-11" />
            <SectionEyebrow>Quiénes somos</SectionEyebrow>
            <DisplayHeading as="h1" className="mt-6" size="xl">
              Un hotel más humano<br />se construye por dentro.
            </DisplayHeading>
            <Lede className="mt-8">
              VULO nació dentro de un hotel, no en una sala de juntas. Por eso
              cada pantalla responde a algo que alguien pidió a gritos alguna
              madrugada.
            </Lede>
          </Reveal>
          <Reveal delay={0.1}>
            <PhotoFrame photo="lobbyBoutique" alt="Lobby de hotel boutique" aspect="aspect-[4/5]" priority />
          </Reveal>
        </div>
      </Section>

      <Section className="pt-24 md:pt-32">
        <div className="grid gap-14 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
          <Reveal>
            <SectionEyebrow>La historia</SectionEyebrow>
            <DisplayHeading className="mt-5" size="lg">
              Empezó con una libreta y demasiadas quejas.
            </DisplayHeading>
          </Reveal>
          <Reveal delay={0.08} className="space-y-6 text-[16px] leading-[1.7] text-foreground/85">
            <p>
              El hotel promedio en México sigue operando con una mezcla de Excel,
              WhatsApp y buena voluntad. Funciona, pero cuesta caro: en horas de
              trabajo, en ventas que se pierden y en huéspedes que no vuelven.
            </p>
            <p>
              En 2022, después de pasar demasiadas madrugadas cuadrando una caja
              y persiguiendo confirmaciones de reserva, decidimos que valía la
              pena construir algo mejor. Un software que respetara al que lo usa
              y al huésped que se sienta al otro lado del mostrador.
            </p>
            <p>
              Cuatro años después, VULO se usa en hoteles de doce habitaciones y
              en cadenas de cinco propiedades. El principio no ha cambiado:
              hacer el trabajo silencioso para que la hospitalidad hable.
            </p>
          </Reveal>
        </div>
      </Section>

      {/* Timeline */}
      <Section className="pt-32 md:pt-40">
        <Reveal>
          <SectionEyebrow>Recorrido</SectionEyebrow>
          <DisplayHeading className="mt-5" size="lg">
            Cuatro años, cerca del huésped.
          </DisplayHeading>
        </Reveal>
        <div className="mt-14 grid gap-8 md:grid-cols-2 lg:grid-cols-5">
          {TIMELINE.map((t, i) => (
            <Reveal key={t.year} delay={i * 0.05} className="border-t border-border/70 pt-6">
              <div className="font-mono text-sm text-accent">{t.year}</div>
              <h3 className="mt-3 text-[17px] font-semibold text-foreground">{t.title}</h3>
              <p className="mt-2 text-[13.5px] leading-[1.6] text-muted-foreground">{t.body}</p>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* Cifras */}
      <Section className="pt-32 md:pt-40">
        <Reveal className="grid grid-cols-2 gap-10 md:grid-cols-4">
          <QuietStat value="80+" label="hoteles operando" />
          <QuietStat value="2.4M" label="reservas gestionadas" />
          <QuietStat value="19" label="ciudades en México" />
          <QuietStat value="98%" label="renovación anual" />
        </Reveal>
      </Section>

      {/* Principios */}
      <Section className="pt-32 md:pt-40">
        <Reveal>
          <SectionEyebrow>Cómo pensamos</SectionEyebrow>
          <DisplayHeading className="mt-5 max-w-3xl" size="lg">
            Cuatro principios que atraviesan cada decisión.
          </DisplayHeading>
        </Reveal>
        <div className="mt-14 grid gap-x-14 gap-y-14 md:grid-cols-2 lg:gap-y-16">
          {PRINCIPIOS.map((p, i) => (
            <Reveal key={p.n} delay={i * 0.05}>
              <div className="font-mono text-sm text-accent">{p.n}</div>
              <h3 className="mt-4 text-xl font-semibold tracking-tight text-foreground md:text-[22px]">
                {p.title}
              </h3>
              <p className="mt-3 text-[15px] leading-[1.65] text-muted-foreground">{p.body}</p>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* Equipo */}
      <Section className="pt-32 md:pt-40">
        <Reveal>
          <SectionEyebrow>Equipo</SectionEyebrow>
          <DisplayHeading className="mt-5 max-w-3xl" size="lg">
            Personas reales detrás de cada línea de código.
          </DisplayHeading>
          <Lede className="mt-6">
            Un equipo pequeño, cercano, que responde por nombre y con reloj
            corriendo en zona horaria de México.
          </Lede>
        </Reveal>
        <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {EQUIPO.map((m, i) => (
            <Reveal key={m.name} delay={i * 0.05}>
              <PhotoFrame photo={m.photo} alt={m.name} aspect="aspect-[4/5]" rounded="lg" />
              <div className="mt-5">
                <div className="text-[15px] font-semibold text-foreground">{m.name}</div>
                <div className="mt-1 text-[13px] text-muted-foreground">{m.role}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section className="pt-40">
        <Reveal className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <DisplayHeading size="lg">Trabajemos juntos.</DisplayHeading>
          <Lede className="mt-6 text-center">
            Nos gustaría escuchar cómo opera tu hotel hoy.
          </Lede>
          <Link to="/contact" className="mt-10 inline-flex items-center gap-2 rounded-full bg-foreground px-7 py-4 text-[15px] font-medium text-background">
            Hablar con el equipo <ArrowRight className="h-4 w-4" />
          </Link>
        </Reveal>
      </Section>
    </>
  );
}