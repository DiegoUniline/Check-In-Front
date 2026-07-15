import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const unlockStalePageScroll = () => {
  const body = document.body;
  const html = document.documentElement;

  body.removeAttribute("data-scroll-locked");
  body.style.removeProperty("overflow");
  body.style.removeProperty("padding-right");
  body.style.removeProperty("margin-right");
  body.style.removeProperty("pointer-events");
  html.style.removeProperty("overflow");
};

const resetScrollPositions = () => {
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  document
    .querySelectorAll<HTMLElement>("main, [data-scroll-container], .public-page")
    .forEach((el) => {
      el.scrollTop = 0;
    });
};

/**
 * Resetea el scroll al top al navegar entre rutas.
 * Se coloca dentro de <BrowserRouter>.
 */
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    unlockStalePageScroll();
    resetScrollPositions();

    const frame = requestAnimationFrame(() => {
      unlockStalePageScroll();
      resetScrollPositions();
    });

    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  return null;
};

export default ScrollToTop;