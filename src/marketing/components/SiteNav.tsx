import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ArrowUpRight } from "lucide-react";
import foxIcon from "@/assets/vulo-fox.png";
import wordmark from "@/assets/vulo-wordmark.png";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/features", label: "Funciones", hasMega: true },
  { to: "/pricing", label: "Precios" },
  { to: "/about", label: "Empresa" },
  { to: "/contact", label: "Contacto" },
];

const MEGA = [
  {
    title: "Operación",
    items: ["Reservas", "Check-in / Check-out", "Recepción", "Calendario"],
  },
  {
    title: "Habitaciones",
    items: ["Housekeeping", "Mantenimiento", "Amenidades", "Inventario"],
  },
  {
    title: "Comercial",
    items: ["Tarifas", "Temporadas", "Motor de reservas", "Canales"],
  },
  {
    title: "Inteligencia",
    items: ["Dashboards", "Reportes", "Auditoría", "WhatsApp · IA"],
  },
  {
    title: "Plataforma",
    items: ["Multi-hotel", "Usuarios", "Permisos", "Seguridad"],
  },
];

export function SiteNav() {
  const [scrolled, setScrolled] = useState(false);
  const [openMega, setOpenMega] = useState(false);
  const [openMobile, setOpenMobile] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpenMobile(false);
    setOpenMega(false);
  }, [location.pathname]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        scrolled
          ? "border-b border-border/60 bg-background/85 backdrop-blur-xl"
          : "bg-background/0",
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-[1360px] items-center justify-between px-6 md:h-[72px] md:px-10 lg:px-14">
        <Link to="/" className="flex items-center gap-2.5" aria-label="VULO">
          <img src={foxIcon} alt="" width={32} height={32} className="h-7 w-7 object-contain md:h-8 md:w-8" />
          <img src={wordmark} alt="VULO" width={70} height={22} className="h-[18px] w-auto object-contain md:h-5" />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" onMouseLeave={() => setOpenMega(false)}>
          {NAV.map((n) =>
            n.hasMega ? (
              <div
                key={n.to}
                className="relative"
                onMouseEnter={() => setOpenMega(true)}
              >
                <NavLink
                  to={n.to}
                  className={({ isActive }) =>
                    cn(
                      "rounded-full px-4 py-2 text-[14px] font-medium transition-colors",
                      isActive
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )
                  }
                >
                  {n.label}
                </NavLink>
                <AnimatePresence>
                  {openMega && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                      className="absolute left-1/2 top-full mt-3 w-[860px] -translate-x-1/2 rounded-[22px] border border-border/70 bg-background/95 p-6 shadow-[0_30px_60px_-30px_rgba(15,23,42,0.25)] backdrop-blur-xl"
                    >
                      <div className="grid grid-cols-5 gap-6">
                        {MEGA.map((col) => (
                          <div key={col.title} className="min-w-0">
                            <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                              {col.title}
                            </div>
                            <ul className="space-y-2.5">
                              {col.items.map((i) => (
                                <li key={i}>
                                  <Link
                                    to="/features"
                                    className="text-[13.5px] leading-tight text-foreground/80 transition-colors hover:text-primary"
                                  >
                                    {i}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                      <div className="mt-6 flex items-center justify-between border-t border-border/60 pt-4">
                        <p className="text-xs text-muted-foreground">
                          Un producto, cada rincón de tu hotel bajo control.
                        </p>
                        <Link
                          to="/features"
                          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:opacity-80"
                        >
                          Ver todas <ArrowUpRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  cn(
                    "rounded-full px-4 py-2 text-[14px] font-medium transition-colors",
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )
                }
              >
                {n.label}
              </NavLink>
            ),
          )}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link
            to="/login"
            className="rounded-full px-4 py-2 text-[14px] font-medium text-foreground/80 transition-colors hover:text-foreground"
          >
            Iniciar sesión
          </Link>
          <Link
            to="/signup"
            className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-5 py-2.5 text-[14px] font-medium text-background transition-transform hover:scale-[1.02]"
          >
            Comenzar
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpenMobile((v) => !v)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground md:hidden"
          aria-label="Menú"
        >
          {openMobile ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <AnimatePresence>
        {openMobile && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22 }}
            className="border-t border-border/70 bg-background md:hidden"
          >
            <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-1 px-6 py-4">
              {NAV.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  className="rounded-xl px-3 py-3 text-base font-medium text-foreground hover:bg-secondary"
                >
                  {n.label}
                </Link>
              ))}
              <div className="mt-2 flex gap-2 border-t border-border/60 pt-4">
                <Link
                  to="/login"
                  className="flex-1 rounded-full border border-border px-4 py-3 text-center text-sm font-medium"
                >
                  Iniciar sesión
                </Link>
                <Link
                  to="/signup"
                  className="flex-1 rounded-full bg-foreground px-4 py-3 text-center text-sm font-medium text-background"
                >
                  Comenzar
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

export default SiteNav;