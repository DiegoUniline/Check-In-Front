import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
} from 'react';

/**
 * Aviso global de "cambios sin guardar".
 *
 * - Cualquier formulario puede llamar a `useUnsavedChanges(dirty)` para
 *   registrar/desregistrar su estado dirty.
 * - Si hay AL MENOS un formulario dirty:
 *     • Al cerrar/recargar la pestaña → prompt nativo del navegador.
 *     • Al navegar dentro de la app (history.pushState/replaceState) →
 *       confirm() preguntando si desea descartar los cambios.
 *     • Al usar el botón "atrás" del navegador → confirm(); si cancela,
 *       deshacemos el popstate con history.go(1).
 */

type Ctx = {
  registerDirty: (id: string, dirty: boolean) => void;
  hasUnsaved: () => boolean;
  /** Limpia todos los flags dirty (útil tras guardar manualmente). */
  clearAll: () => void;
};

const UnsavedChangesContext = createContext<Ctx | null>(null);

const CONFIRM_MESSAGE =
  'Tienes cambios sin guardar. ¿Deseas salir y descartarlos?';

export function UnsavedChangesProvider({ children }: { children: React.ReactNode }) {
  const dirtySet = useRef<Set<string>>(new Set());

  const hasUnsaved = useCallback(() => dirtySet.current.size > 0, []);

  const registerDirty = useCallback((id: string, dirty: boolean) => {
    if (dirty) dirtySet.current.add(id);
    else dirtySet.current.delete(id);
  }, []);

  const clearAll = useCallback(() => {
    dirtySet.current.clear();
  }, []);

  // 1) Aviso al cerrar pestaña / recargar
  useEffect(() => {
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (!hasUnsaved()) return;
      e.preventDefault();
      // Algunos navegadores ignoran el mensaje custom, pero requieren returnValue.
      e.returnValue = CONFIRM_MESSAGE;
      return CONFIRM_MESSAGE;
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [hasUnsaved]);

  // 2) Interceptar navegación SPA (react-router usa history.pushState)
  useEffect(() => {
    const origPush = window.history.pushState;
    const origReplace = window.history.replaceState;

    const wrap = (orig: typeof window.history.pushState) =>
      function (this: History, ...args: Parameters<typeof window.history.pushState>) {
        if (hasUnsaved()) {
          const targetUrl = String(args[2] ?? '');
          // Si la URL no cambia realmente, dejar pasar
          const same =
            !targetUrl ||
            targetUrl === window.location.pathname + window.location.search + window.location.hash;
          if (!same) {
            const ok = window.confirm(CONFIRM_MESSAGE);
            if (!ok) return;
            // Aceptó descartar → limpiamos flags para no preguntar otra vez en cascada
            dirtySet.current.clear();
          }
        }
        return orig.apply(this, args);
      };

    window.history.pushState = wrap(origPush) as typeof window.history.pushState;
    window.history.replaceState = wrap(origReplace) as typeof window.history.replaceState;

    return () => {
      window.history.pushState = origPush;
      window.history.replaceState = origReplace;
    };
  }, [hasUnsaved]);

  // 3) Botón "atrás" del navegador
  useEffect(() => {
    // Marcamos un estado base para poder hacer "go(1)" si cancela
    const onPopState = () => {
      if (!hasUnsaved()) return;
      const ok = window.confirm(CONFIRM_MESSAGE);
      if (!ok) {
        // Reposicionamos hacia adelante para deshacer el "back"
        window.history.go(1);
      } else {
        dirtySet.current.clear();
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [hasUnsaved]);

  const value = useMemo<Ctx>(
    () => ({ registerDirty, hasUnsaved, clearAll }),
    [registerDirty, hasUnsaved, clearAll]
  );

  return (
    <UnsavedChangesContext.Provider value={value}>
      {children}
    </UnsavedChangesContext.Provider>
  );
}

/**
 * Hook a usar en cualquier formulario:
 *   const dirty = isDirty(initial, current);
 *   useUnsavedChanges(dirty);
 * Se desregistra automáticamente al desmontar.
 */
export function useUnsavedChanges(dirty: boolean) {
  const ctx = useContext(UnsavedChangesContext);
  const id = useId();
  useEffect(() => {
    if (!ctx) return;
    ctx.registerDirty(id, dirty);
    return () => ctx.registerDirty(id, false);
  }, [ctx, id, dirty]);
}

export function useUnsavedChangesContext() {
  return useContext(UnsavedChangesContext);
}