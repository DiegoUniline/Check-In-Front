import * as React from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

export interface SwipeAction {
  /** Etiqueta visible al deslizar */
  label: string;
  /** Icono opcional (lucide) */
  icon?: React.ReactNode;
  /** Color de fondo de la acción. Default: primary */
  bg?: string;
  /** Color de texto. Default: white */
  color?: string;
  /** Acción a ejecutar cuando se completa el swipe */
  onAction: () => void | Promise<void>;
}

interface SwipeableCardProps {
  children: React.ReactNode;
  /** Acción al deslizar a la derecha (revelada del lado izquierdo) */
  rightAction?: SwipeAction;
  /** Acción al deslizar a la izquierda (revelada del lado derecho) */
  leftAction?: SwipeAction;
  /** Umbral en px para confirmar la acción. Default: 100 */
  threshold?: number;
  className?: string;
  /** Si true, deshabilita el swipe en desktop (default true) */
  mobileOnly?: boolean;
}

/**
 * Tarjeta deslizable estilo nativo iOS/Android.
 * - Drag horizontal con framer-motion.
 * - Al superar el threshold, ejecuta la acción y vibra (haptic).
 * - Si no llega al threshold, regresa con spring.
 */
export function SwipeableCard({
  children,
  rightAction,
  leftAction,
  threshold = 100,
  className,
  mobileOnly = true,
}: SwipeableCardProps) {
  const isMobile = useIsMobile();
  const x = useMotionValue(0);
  const enabled = !mobileOnly || isMobile;

  // Color de fondo del contenedor según la dirección del drag
  const bgColor = useTransform(
    x,
    [-200, -1, 0, 1, 200],
    [
      leftAction?.bg ?? "hsl(var(--destructive))",
      "transparent",
      "transparent",
      "transparent",
      rightAction?.bg ?? "hsl(var(--primary))",
    ],
  );

  const leftLabelOpacity = useTransform(x, [-threshold, -20, 0], [1, 0.4, 0]);
  const rightLabelOpacity = useTransform(x, [0, 20, threshold], [0, 0.4, 1]);

  const handleDragEnd = async (_: unknown, info: { offset: { x: number } }) => {
    const offset = info.offset.x;
    if (offset >= threshold && rightAction) {
      navigator.vibrate?.(30);
      await animate(x, 400, { duration: 0.2 });
      await rightAction.onAction();
      animate(x, 0, { type: "spring", stiffness: 400, damping: 30 });
    } else if (offset <= -threshold && leftAction) {
      navigator.vibrate?.(30);
      await animate(x, -400, { duration: 0.2 });
      await leftAction.onAction();
      animate(x, 0, { type: "spring", stiffness: 400, damping: 30 });
    } else {
      animate(x, 0, { type: "spring", stiffness: 400, damping: 30 });
    }
  };

  if (!enabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={cn("relative overflow-hidden rounded-lg", className)}
      style={{ backgroundColor: bgColor }}
    >
      {/* Etiqueta acción izquierda (visible al deslizar a la derecha) */}
      {rightAction && (
        <motion.div
          className="pointer-events-none absolute inset-y-0 left-0 flex items-center gap-2 px-4 text-sm font-semibold"
          style={{ opacity: rightLabelOpacity, color: rightAction.color ?? "white" }}
        >
          {rightAction.icon}
          <span>{rightAction.label}</span>
        </motion.div>
      )}
      {/* Etiqueta acción derecha (visible al deslizar a la izquierda) */}
      {leftAction && (
        <motion.div
          className="pointer-events-none absolute inset-y-0 right-0 flex items-center gap-2 px-4 text-sm font-semibold"
          style={{ opacity: leftLabelOpacity, color: leftAction.color ?? "white" }}
        >
          <span>{leftAction.label}</span>
          {leftAction.icon}
        </motion.div>
      )}
      <motion.div
        drag="x"
        dragConstraints={{ left: leftAction ? -200 : 0, right: rightAction ? 200 : 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className="bg-card touch-pan-y"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}