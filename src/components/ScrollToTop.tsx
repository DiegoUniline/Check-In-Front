import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Resetea el scroll al top al navegar entre rutas.
 * Se coloca dentro de <BrowserRouter>.
 */
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Restaurar scroll de la ventana
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    // Restaurar scroll del contenedor principal (MainLayout usa overflow-y-auto en <main>)
    document.querySelectorAll<HTMLElement>("main, [data-scroll-container]").forEach((el) => {
      el.scrollTop = 0;
    });
  }, [pathname]);

  return null;
};

export default ScrollToTop;