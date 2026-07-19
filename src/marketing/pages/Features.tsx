import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
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
  ShotHousekeeping,
  ShotDashboardKPIs,
  ShotTarifasTemporada,
  ShotPOS,
  ShotReportes,
  ShotCheckIn,
  ShotMultiHotel,
  ShotMotorReservas,
  ShotAutomatizaciones,
} from "@/marketing/shots";
import type { ReactNode } from "react";
import type { PhotoKey } from "@/marketing/lib/photos";

type Band = {
  id: string;
  group: string;
  eyebrow: string;
  title: string;
  problema: string;
  solucion: string;
  beneficio: string;
  photo: PhotoKey;
  alt: string;
  shot: ReactNode;
  shotLabel: string;
};

const BANDS: Band[] = [
  {
    id: "reservas",
    group: "Operación",
    eyebrow: "Reservas",
    title: "El estado real del hotel, siempre a la mano.",
    problema: "Un huésped confirma por WhatsApp y otro llega sin aviso; los canales se pisan, la libreta miente.",
    solucion: "Un solo timeline con cada reserva, cada canal y cada bloqueo. Filtros por estado, huésped, habitación o canal.",
    beneficio: "Cero doble-reserva. Recepción sabe qué pasa el próximo fin de semana sin abrir un solo Excel.",
    photo: "receptionDesk",
    alt: "Recepción registrando un huésped",
    shot: <ShotReservasTimeline />,
    shotLabel: "vulo · reservas",
  },
  {
    id: "checkin",
    group: "Operación",
    eyebrow: "Check-in · Check-out",
    title: "Llegadas y salidas sin dramas.",
    problema: "Papeles impresos, firmas mal escaneadas, tarjetas de registro perdidas. El huésped ya está incómodo antes de subir a su cuarto.",
    solucion: "Un flujo guiado por pasos, con firma digital, INE opcional, tarjeta impresa o enviada por correo. Todo queda en el expediente del huésped.",
    beneficio: "Un check-in promedio de menos de 4 minutos. Un huésped que empieza contento.",
    photo: "guestCheckin",
    alt: "Huésped firmando check-in en tablet",
    shot: <ShotCheckIn />,
    shotLabel: "vulo · check-in",
  },
  {
    id: "housekeeping",
    group: "Habitaciones",
    eyebrow: "Housekeeping",
    title: "La limpieza deja de ser un misterio.",
    problema: "El radio pregunta “¿ya está la 305?” cada media hora. Nadie tiene la respuesta a la primera.",
    solucion: "Cada habitación con su tarea, su camarista y su checklist. El estado cambia en vivo cuando se termina.",
    beneficio: "Recepción entrega habitaciones más rápido. Gerencia ve productividad real por persona.",
    photo: "housekeeperCart",
    alt: "Camarista con carrito de housekeeping",
    shot: <ShotHousekeeping />,
    shotLabel: "vulo · housekeeping",
  },
  {
    id: "mantenimiento",
    group: "Habitaciones",
    eyebrow: "Mantenimiento",
    title: "Del reporte al arreglo, sin cola de mensajes.",
    problema: "Una regadera con fuga se anota en un post-it que desaparece al día siguiente.",
    solucion: "Cualquiera reporta una incidencia; el sistema la asigna, la prioriza y avisa cuando se cierra.",
    beneficio: "Menos habitaciones fuera de servicio. Menos quejas repitiéndose.",
    photo: "detailPlant",
    alt: "Detalle de una habitación cuidada",
    shot: <ShotHousekeeping />,
    shotLabel: "vulo · mantenimiento",
  },
  {
    id: "tarifas",
    group: "Comercial",
    eyebrow: "Tarifas · Temporadas",
    title: "Cobrar lo que vale, no lo que quedó del año pasado.",
    problema: "El fin de semana largo se vende al mismo precio que un martes de febrero.",
    solucion: "Temporadas visuales, sobreprecios automáticos por evento, restricciones de estancia mínima y descuentos por adelanto.",
    beneficio: "ADR y RevPAR se mueven en el sentido correcto sin discusiones cada lunes.",
    photo: "cafeCoffee",
    alt: "Detalle editorial del hotel",
    shot: <ShotTarifasTemporada />,
    shotLabel: "vulo · tarifas",
  },
  {
    id: "motor",
    group: "Comercial",
    eyebrow: "Motor de reservas",
    title: "Un motor propio, sin comisiones de intermediarios.",
    problema: "Cada reserva directa que pasa por una OTA cuesta 15% que nadie te devuelve.",
    solucion: "Motor embebido en tu sitio, con diseño acorde a tu marca, tarifas en vivo y pago en un paso.",
    beneficio: "Más reservas directas. Más margen. Un canal que sí controlas.",
    photo: "tabletHands",
    alt: "Persona reservando desde un dispositivo",
    shot: <ShotMotorReservas />,
    shotLabel: "vulo · motor",
  },
  {
    id: "canales",
    group: "Comercial",
    eyebrow: "Canales de venta",
    title: "Booking, Airbnb y Expedia. Sincronizados.",
    problema: "Cerraste la 204 en el sistema y quedó abierta en Airbnb. El teléfono de recepción arde.",
    solucion: "Channel manager conectado a los principales OTAs. Inventario y tarifas en un solo sitio.",
    beneficio: "Adiós overbooking. Tu equipo deja de vivir en pánico.",
    photo: "laptopWorking",
    alt: "Persona trabajando en canales de venta",
    shot: <ShotMultiHotel />,
    shotLabel: "vulo · canales",
  },
  {
    id: "crm",
    group: "Clientes",
    eyebrow: "CRM · Huéspedes",
    title: "Reconocer al huésped cuando regresa.",
    problema: "Alguien que estuvo diez veces contigo es tratado como un extraño en su onceava visita.",
    solucion: "Ficha del huésped con historial de estancias, preferencias, notas privadas y etiquetas VIP.",
    beneficio: "Detalles pequeños que hacen que la gente vuelva. Y lo cuente.",
    photo: "coupleArrive",
    alt: "Huéspedes llegando al hotel",
    shot: <ShotWhatsAppCRM />,
    shotLabel: "vulo · crm",
  },
  {
    id: "whatsapp",
    group: "Comunicación",
    eyebrow: "WhatsApp · IA",
    title: "Responder en segundos. Sin sonar a bot.",
    problema: "La gente pregunta por WhatsApp, tardas horas en contestar y la venta se enfría.",
    solucion: "Bandeja compartida por hotel, plantillas aprobadas, respuestas sugeridas por IA con el tono de tu marca.",
    beneficio: "Más conversiones desde el primer mensaje. Un equipo que se ve profesional a cualquier hora.",
    photo: "tabletHands",
    alt: "Persona atendiendo mensajes en tablet",
    shot: <ShotWhatsAppCRM />,
    shotLabel: "vulo · whatsapp",
  },
  {
    id: "automatizaciones",
    group: "Comunicación",
    eyebrow: "Automatizaciones",
    title: "Lo repetitivo, lo hace VULO. Lo humano, tu equipo.",
    problema: "Recordar el check-in, pedir la reseña, avisar del check-out temprano — se olvida cuando el hotel está lleno.",
    solucion: "Flujos disparados por eventos: nueva reserva, T-24h, post check-out. WhatsApp, correo o SMS.",
    beneficio: "Tu operación no depende de que alguien se acuerde. Depende del sistema.",
    photo: "receptionistWoman",
    alt: "Personal usando VULO en recepción",
    shot: <ShotAutomatizaciones />,
    shotLabel: "vulo · flows",
  },
  {
    id: "cobros",
    group: "Financiero",
    eyebrow: "Cobros · Pagos",
    title: "Dinero que entra, cuadrado al centavo.",
    problema: "Tarjetas, efectivo, transferencias, propinas — al cierre nadie sabe qué falta.",
    solucion: "Métodos configurables, cargos a la habitación, cierre de turno y arqueo de caja transparente.",
    beneficio: "Un cierre honesto cada día. Cero fricción entre recepción y contabilidad.",
    photo: "reception",
    alt: "Cobro en recepción",
    shot: <ShotReportes />,
    shotLabel: "vulo · cobros",
  },
  {
    id: "pos",
    group: "Financiero",
    eyebrow: "POS · Restaurante · Room Service",
    title: "Un mismo huésped, una sola cuenta.",
    problema: "El bar cobra aparte, el restaurante también, y al check-out nadie sabe qué se cargó a la habitación.",
    solucion: "POS integrado. Ventas del restaurante, spa y room service se cargan al folio de la reserva.",
    beneficio: "Facturación limpia. Menos disputas al final. Más consumo por huésped.",
    photo: "restaurant",
    alt: "Restaurante del hotel",
    shot: <ShotPOS />,
    shotLabel: "vulo · pos",
  },
  {
    id: "reportes",
    group: "Inteligencia",
    eyebrow: "Reportes · Dashboards",
    title: "Los números que sí mueven la aguja.",
    problema: "Un archivo con veinte pestañas que nadie abre porque tarda diez minutos en cargar.",
    solucion: "Ocupación, ADR, RevPAR, canal, segmento, tarifa promedio. Filtros por rango, hotel y equipo.",
    beneficio: "El gerente decide desde su celular. La dueña, desde donde esté.",
    photo: "managerPortrait",
    alt: "Gerente revisando indicadores",
    shot: <ShotDashboardKPIs />,
    shotLabel: "vulo · reportes",
  },
  {
    id: "multihotel",
    group: "Plataforma",
    eyebrow: "Multi-hotel",
    title: "Un tablero para toda la marca.",
    problema: "Cinco propiedades, cinco herramientas distintas, y una junta semanal que se va en cuadrar reportes.",
    solucion: "Estructura multi-hotel real: cada propiedad con su equipo y su configuración, la dirección con la foto consolidada.",
    beneficio: "Escalar sin duplicar caos. Comparar hoteles como columnas, no como archivos.",
    photo: "city",
    alt: "Cadena regional de hoteles",
    shot: <ShotMultiHotel />,
    shotLabel: "vulo · multi",
  },
  {
    id: "usuarios",
    group: "Plataforma",
    eyebrow: "Usuarios · Permisos",
    title: "Cada persona ve lo que le toca ver.",
    problema: "Todo el equipo con la misma llave. Nadie sabe quién movió qué.",
    solucion: "Roles configurables por hotel: Recepción, Housekeeping, Mantenimiento, Gerencia, Contabilidad, SuperAdmin.",
    beneficio: "Menos errores, más confianza. Auditoría con nombre y hora exacta.",
    photo: "laptopWorking",
    alt: "Equipo en oficina back-office",
    shot: <ShotMultiHotel />,
    shotLabel: "vulo · usuarios",
  },
];

const GRUPOS = ["Operación", "Habitaciones", "Comercial", "Clientes", "Comunicación", "Financiero", "Inteligencia", "Plataforma"];

export default function Features() {
  return (
    <>
      <Helmet>
        <title>Funciones — VULO</title>
        <meta name="description" content="Reservas, recepción, housekeeping, tarifas, WhatsApp, POS y multi-hotel. Todo lo que hace mover un hotel, en una sola plataforma." />
        <link rel="canonical" href="https://vulo.mx/features" />
        <meta property="og:title" content="Funciones — VULO" />
        <meta property="og:url" content="https://vulo.mx/features" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Inicio", item: "https://vulo.mx/" },
              { "@type": "ListItem", position: 2, name: "Funciones", item: "https://vulo.mx/features" },
            ],
          })}
        </script>
      </Helmet>

      <Section className="pt-14 md:pt-24">
        <Reveal>
          <SectionEyebrow>Producto</SectionEyebrow>
          <DisplayHeading as="h1" className="mt-6 max-w-4xl" size="xl">
            Cada función existe porque alguien la usa a diario.
          </DisplayHeading>
          <Lede className="mt-8 max-w-2xl">
            Un recorrido honesto por lo que hace VULO. Sin frases vacías: qué
            problema resuelve, qué muestra la pantalla, qué gana tu equipo.
          </Lede>
        </Reveal>
      </Section>

      <Section className="pt-16 md:pt-24">
        <div className="grid gap-12 lg:grid-cols-[220px_1fr] lg:gap-16">
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Índice
              </div>
              <nav className="mt-4 flex flex-col gap-2 text-[13.5px]">
                {GRUPOS.map((g) => (
                  <a
                    key={g}
                    href={`#g-${g.toLowerCase()}`}
                    className="text-foreground/70 hover:text-foreground"
                  >
                    {g}
                  </a>
                ))}
              </nav>
              <div className="mt-8 border-t border-border/60 pt-6 text-[12.5px] text-muted-foreground">
                ¿Necesitas algo más específico?<br />
                <Link to="/contact" className="mt-1 inline-flex items-center gap-1 font-medium text-foreground hover:text-primary">
                  Hablemos <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </aside>

          <div className="space-y-28 md:space-y-36">
            {GRUPOS.map((g) => (
              <section key={g} id={`g-${g.toLowerCase()}`} className="space-y-24 md:space-y-28">
                <Reveal>
                  <div className="text-xs font-medium uppercase tracking-[0.18em] text-accent">
                    {g}
                  </div>
                </Reveal>

                {BANDS.filter((b) => b.group === g).map((b, i) => (
                  <Reveal
                    key={b.id}
                    id={b.id}
                    className={`grid items-center gap-10 lg:grid-cols-2 lg:gap-14 ${
                      i % 2 ? "lg:[&>*:first-child]:order-2" : ""
                    }`}
                    as="section"
                  >
                    <div className="space-y-4">
                      <PhotoFrame photo={b.photo} alt={b.alt} aspect="aspect-[4/3]" />
                      <ScreenshotFrame label={b.shotLabel}>{b.shot}</ScreenshotFrame>
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        {b.eyebrow}
                      </div>
                      <h2 className="mt-4 text-[26px] font-semibold tracking-tight text-foreground [text-wrap:balance] md:text-[34px]">
                        {b.title}
                      </h2>
                      <dl className="mt-8 space-y-6">
                        <div>
                          <dt className="text-[11px] font-medium uppercase tracking-[0.14em] text-accent">Problema</dt>
                          <dd className="mt-1.5 text-[15px] leading-[1.6] text-foreground/85">{b.problema}</dd>
                        </div>
                        <div>
                          <dt className="text-[11px] font-medium uppercase tracking-[0.14em] text-primary">Solución</dt>
                          <dd className="mt-1.5 text-[15px] leading-[1.6] text-foreground/85">{b.solucion}</dd>
                        </div>
                        <div>
                          <dt className="text-[11px] font-medium uppercase tracking-[0.14em] text-success">Beneficio</dt>
                          <dd className="mt-1.5 text-[15px] leading-[1.6] text-foreground/85">{b.beneficio}</dd>
                        </div>
                      </dl>
                      <Link
                        to="/contact"
                        className="mt-8 inline-flex items-center gap-1.5 text-[14px] font-medium text-foreground hover:text-primary"
                      >
                        Ver esto en tu hotel <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </Reveal>
                ))}
              </section>
            ))}
          </div>
        </div>
      </Section>

      <Section className="pt-40">
        <Reveal className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <DisplayHeading size="lg">
            ¿Necesitas algo que no viste aquí?
          </DisplayHeading>
          <Lede className="mt-6 text-center">
            VULO crece con hoteles que piden lo que les hace falta.
          </Lede>
          <Link to="/contact" className="mt-8 inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3.5 text-[15px] font-medium text-background">
            Contarnos tu operación <ArrowRight className="h-4 w-4" />
          </Link>
        </Reveal>
      </Section>
    </>
  );
}