import { WifiOff, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { cn } from "@/lib/utils";

/**
 * Banner sticky que aparece cuando se pierde la conexión.
 * Cuando vuelve, muestra "Conexión restablecida" 2s y se oculta.
 */
export function OfflineBanner() {
  const online = useOnlineStatus();
  const [showRestored, setShowRestored] = useState(false);
  const wasOffline = useRef(false);

  useEffect(() => {
    if (!online) {
      wasOffline.current = true;
      setShowRestored(false);
    } else if (wasOffline.current) {
      setShowRestored(true);
      const t = setTimeout(() => {
        setShowRestored(false);
        wasOffline.current = false;
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [online]);

  if (online && !showRestored) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "sticky top-0 z-50 flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium",
        online
          ? "bg-emerald-600 text-white"
          : "bg-amber-500 text-amber-950 dark:text-amber-50",
      )}
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.375rem)" }}
    >
      {online ? (
        <>
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Conexión restablecida — sincronizando…</span>
        </>
      ) : (
        <>
          <WifiOff className="h-3.5 w-3.5" />
          <span>Sin conexión — viendo datos guardados</span>
        </>
      )}
    </div>
  );
}