import * as React from "react";

// Breakpoint para considerar "mobile" en términos de UX de navegación.
// Se usa en el `Sidebar` (shadcn/ui) para decidir si debe mostrarse como Sheet (overlay).
// En tablets (ej. iPad ~820px) el sidebar fijo recorta demasiado el contenido, por eso
// elevamos el breakpoint a 1024 para que tablets usen el modo overlay.
// Relacionado con `Check-In-Front/src/components/ui/sidebar.tsx`.
const MOBILE_BREAKPOINT = 1024;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}
