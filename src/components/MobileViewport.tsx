import { useEffect } from 'react';

/** Tracks the visible area when browser chrome or the software keyboard moves. */
export function MobileViewport() {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const root = document.documentElement;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        // Preserve native pinch zoom behavior.
        if (viewport.scale !== 1) return;
        root.style.setProperty('--vulo-viewport-height', `${viewport.height}px`);
        root.style.setProperty('--vulo-viewport-top', `${viewport.offsetTop}px`);
        const active = document.activeElement;
        const editing = active instanceof HTMLElement && active.matches('input, textarea, [contenteditable="true"]');
        const keyboard = editing && window.innerHeight - viewport.height > 150;
        root.dataset.mobileKeyboard = keyboard ? 'open' : 'closed';
        if (keyboard && active instanceof HTMLElement) {
          const bounds = active.getBoundingClientRect();
          if (bounds.bottom > viewport.offsetTop + viewport.height - 16 || bounds.top < viewport.offsetTop) {
            active.scrollIntoView({ block: 'nearest', inline: 'nearest' });
          }
        }
      });
    };
    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    document.addEventListener('focusin', update);
    document.addEventListener('focusout', update);
    return () => {
      cancelAnimationFrame(frame);
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
      document.removeEventListener('focusin', update);
      document.removeEventListener('focusout', update);
      root.style.removeProperty('--vulo-viewport-height');
      root.style.removeProperty('--vulo-viewport-top');
      delete root.dataset.mobileKeyboard;
    };
  }, []);
  return null;
}
