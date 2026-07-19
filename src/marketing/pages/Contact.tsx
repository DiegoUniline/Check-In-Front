import { useState, type FormEvent } from "react";
import { Helmet } from "react-helmet-async";
import { ArrowRight, Mail, MessageCircle, MapPin, Phone } from "lucide-react";
import { toast } from "sonner";
import {
  Reveal,
  Section,
  SectionEyebrow,
  DisplayHeading,
  Lede,
  PhotoFrame,
} from "@/marketing/components/atoms";
import { cn } from "@/lib/utils";

const FAQ = [
  { q: "¿En cuánto tiempo responden?", a: "Menos de 2 horas en horario laboral (9:00–19:00 CDMX). Los fines de semana atendemos urgencias por WhatsApp." },
  { q: "¿Puedo agendar una demo directa?", a: "Sí. Elige “Agendar demo” abajo y te enviamos un link con horarios disponibles esta misma semana." },
  { q: "¿Trabajan con hoteles fuera de México?", a: "Sí. VULO opera en México, Colombia, Perú y Costa Rica. El soporte se atiende en español." },
  { q: "¿Hay soporte técnico las 24 horas?", a: "Sí. Los planes Professional y Enterprise incluyen guardia 24/7 para incidencias críticas." },
];

type Motivo = "demo" | "ventas" | "soporte" | "prensa";

export default function Contact() {
  const [motivo, setMotivo] = useState<Motivo>("demo");
  const [sending, setSending] = useState(false);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSending(true);
    setTimeout(() => {
      setSending(false);
      toast.success("Recibido. Te contactamos en las próximas 2 horas.");
      (e.target as HTMLFormElement).reset();
    }, 800);
  };

  const motivos: { id: Motivo; label: string }[] = [
    { id: "demo", label: "Agendar demo" },
    { id: "ventas", label: "Hablar con ventas" },
    { id: "soporte", label: "Soporte" },
    { id: "prensa", label: "Prensa" },
  ];

  return (
    <>
      <Helmet>
        <title>Contacto — VULO</title>
        <meta name="description" content="Agenda una demo, habla con ventas o escríbenos por WhatsApp. Respondemos en menos de 2 horas." />
        <link rel="canonical" href="https://vulo.mx/contact" />
        <meta property="og:title" content="Contacto — VULO" />
        <meta property="og:url" content="https://vulo.mx/contact" />
        <meta property="og:type" content="website" />
      </Helmet>

      <Section className="pt-14 md:pt-24">
        <div className="grid gap-12 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
          <Reveal>
            <SectionEyebrow>Contacto</SectionEyebrow>
            <DisplayHeading as="h1" className="mt-6" size="xl">
              Nos gustaría escucharte.
            </DisplayHeading>
            <Lede className="mt-8">
              Cuéntanos brevemente cómo opera tu hotel hoy. Te devolvemos una
              propuesta clara, sin presiones y sin plantillas copiadas.
            </Lede>

            <div className="mt-12 grid grid-cols-2 gap-6 text-[14.5px] md:max-w-lg">
              <a href="mailto:hola@vulo.mx" className="group flex items-start gap-3">
                <Mail className="mt-0.5 h-5 w-5 text-accent" />
                <div>
                  <div className="font-medium text-foreground">Correo</div>
                  <div className="text-muted-foreground group-hover:text-foreground">hola@vulo.mx</div>
                </div>
              </a>
              <a href="https://wa.me/5215555555555" target="_blank" rel="noreferrer" className="group flex items-start gap-3">
                <MessageCircle className="mt-0.5 h-5 w-5 text-accent" />
                <div>
                  <div className="font-medium text-foreground">WhatsApp</div>
                  <div className="text-muted-foreground group-hover:text-foreground">+52 55 5555 5555</div>
                </div>
              </a>
              <div className="flex items-start gap-3">
                <Phone className="mt-0.5 h-5 w-5 text-accent" />
                <div>
                  <div className="font-medium text-foreground">Teléfono</div>
                  <div className="text-muted-foreground">+52 322 100 1000</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-5 w-5 text-accent" />
                <div>
                  <div className="font-medium text-foreground">Oficinas</div>
                  <div className="text-muted-foreground">Puerto Vallarta · CDMX</div>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <form
              onSubmit={onSubmit}
              className="rounded-[28px] border border-border/70 bg-card p-6 md:p-8"
            >
              <div className="flex flex-wrap gap-2">
                {motivos.map((m) => (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => setMotivo(m.id)}
                    className={cn(
                      "rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors",
                      motivo === m.id
                        ? "border-foreground bg-foreground text-background"
                        : "border-border/70 bg-transparent text-foreground/70 hover:text-foreground",
                    )}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Field label="Nombre" name="nombre" placeholder="Juan Pérez" required />
                <Field label="Hotel" name="hotel" placeholder="Hotel Aurora" required />
                <Field label="Correo" name="email" type="email" placeholder="juan@hotelaurora.com" required />
                <Field label="Teléfono" name="tel" placeholder="+52 322 100 1000" />
                <Field label="Habitaciones" name="habs" type="number" placeholder="24" />
                <Field label="Ciudad" name="ciudad" placeholder="Puerto Vallarta" />
              </div>

              <label className="mt-4 block">
                <span className="text-[13px] font-medium text-foreground">Cuéntanos brevemente</span>
                <textarea
                  name="mensaje"
                  rows={4}
                  required
                  placeholder="Estamos operando con Excel y Booking, queremos algo más profesional…"
                  className="mt-1.5 w-full rounded-2xl border border-border/70 bg-background px-4 py-3 text-[14.5px] text-foreground placeholder:text-muted-foreground/70 focus:border-foreground focus:outline-none"
                />
              </label>

              <button
                type="submit"
                disabled={sending}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-6 py-4 text-[15px] font-medium text-background transition-transform hover:scale-[1.01] disabled:opacity-60"
              >
                {sending ? "Enviando…" : "Enviar mensaje"} <ArrowRight className="h-4 w-4" />
              </button>
              <p className="mt-3 text-center text-[12px] text-muted-foreground">
                Al enviar aceptas nuestra política de privacidad.
              </p>
            </form>
          </Reveal>
        </div>
      </Section>

      <Section className="pt-32 md:pt-40">
        <Reveal>
          <SectionEyebrow>Dónde estamos</SectionEyebrow>
          <DisplayHeading className="mt-5" size="lg">
            Cerca del mar, cerca del huésped.
          </DisplayHeading>
        </Reveal>
        <Reveal delay={0.08} className="mt-10 overflow-hidden rounded-[28px] border border-border/70">
          <div className="relative aspect-[16/7]">
            <PhotoFrame
              photo="city"
              alt="Vista aérea de la ciudad"
              aspect="aspect-[16/7]"
              rounded="xl"
              className="absolute inset-0 rounded-none"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/40 to-transparent" />
            <div className="absolute bottom-6 left-6 rounded-2xl bg-background/95 px-5 py-4 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.4)] backdrop-blur">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">Oficina principal</div>
              <div className="mt-1 text-[15px] font-semibold text-foreground">Puerto Vallarta, Jalisco</div>
              <div className="text-[13px] text-muted-foreground">Marina Vallarta · Local 208</div>
            </div>
          </div>
        </Reveal>
      </Section>

      <Section className="pt-32 md:pt-40">
        <div className="grid gap-14 lg:grid-cols-[1fr_1.6fr] lg:gap-20">
          <Reveal>
            <SectionEyebrow>Preguntas</SectionEyebrow>
            <DisplayHeading className="mt-5" size="md">
              Antes de escribirnos.
            </DisplayHeading>
          </Reveal>
          <div className="divide-y divide-border/70 border-t border-border/70">
            {FAQ.map((f, i) => (
              <Reveal key={f.q} delay={i * 0.04} className="py-6">
                <h3 className="text-[17px] font-semibold text-foreground">{f.q}</h3>
                <p className="mt-2 text-[14.5px] leading-[1.6] text-muted-foreground">{f.a}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </Section>
    </>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[13px] font-medium text-foreground">{label}</span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        className="mt-1.5 w-full rounded-2xl border border-border/70 bg-background px-4 py-3 text-[14.5px] text-foreground placeholder:text-muted-foreground/70 focus:border-foreground focus:outline-none"
      />
    </label>
  );
}