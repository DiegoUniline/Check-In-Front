import { Link } from "react-router-dom";
import foxIcon from "@/assets/vulo-fox.png";
import wordmark from "@/assets/vulo-wordmark.png";

const COLS = [
  {
    title: "Producto",
    links: [
      { to: "/features", label: "Funciones" },
      { to: "/pricing", label: "Precios" },
      { to: "/features#reservas", label: "Reservas" },
      { to: "/features#whatsapp", label: "WhatsApp · IA" },
      { to: "/features#multihotel", label: "Multi-hotel" },
    ],
  },
  {
    title: "Empresa",
    links: [
      { to: "/about", label: "Quiénes somos" },
      { to: "/about#historia", label: "Historia" },
      { to: "/about#equipo", label: "Equipo" },
      { to: "/contact", label: "Contacto" },
    ],
  },
  {
    title: "Recursos",
    links: [
      { to: "/features", label: "Guía de funciones" },
      { to: "/pricing#faq", label: "Preguntas frecuentes" },
      { to: "/contact", label: "Soporte" },
      { to: "/login", label: "Iniciar sesión" },
    ],
  },
  {
    title: "Legal",
    links: [
      { to: "/legal/privacidad", label: "Privacidad" },
      { to: "/legal/terminos", label: "Términos" },
      { to: "/legal/seguridad", label: "Seguridad" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-32 border-t border-border/60 bg-secondary/40">
      <div className="mx-auto w-full max-w-[1360px] px-6 py-16 md:px-10 md:py-20 lg:px-14">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_repeat(4,minmax(0,1fr))]">
          <div className="max-w-sm">
            <Link to="/" className="flex items-center gap-2.5">
              <img src={foxIcon} alt="" width={36} height={36} className="h-8 w-8 object-contain" />
              <img src={wordmark} alt="VULO" width={70} height={22} className="h-5 w-auto object-contain" />
            </Link>
            <p className="mt-6 text-[15px] leading-[1.65] text-muted-foreground">
              La forma tranquila de operar un hotel. Menos tareas dispersas, más
              decisiones tomadas a tiempo.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <select
                aria-label="Idioma"
                className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-foreground/70"
                defaultValue="es-MX"
              >
                <option value="es-MX">Español · MX</option>
                <option value="en-US" disabled>English (soon)</option>
              </select>
              <span className="text-xs text-muted-foreground">CDMX, México</span>
            </div>
          </div>
          {COLS.map((c) => (
            <div key={c.title} className="min-w-0">
              <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {c.title}
              </div>
              <ul className="space-y-3">
                {c.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      to={l.to}
                      className="text-[14px] text-foreground/75 transition-colors hover:text-foreground"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-16 flex flex-col items-start justify-between gap-4 border-t border-border/60 pt-8 md:flex-row md:items-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} VULO. Hecho con cuidado en México.
          </p>
          <div className="flex items-center gap-5 text-xs text-muted-foreground">
            <a href="https://wa.me/523171035768" target="_blank" rel="noreferrer" className="hover:text-foreground">WhatsApp</a>
            <a href="mailto:hola@vulo.mx" className="hover:text-foreground">hola@vulo.mx</a>
            <a href="https://vulo.mx" className="hover:text-foreground">vulo.mx</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default SiteFooter;