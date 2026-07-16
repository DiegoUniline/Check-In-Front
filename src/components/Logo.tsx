import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  size?: number;
}

/**
 * HospedApp brandmark — letra "H" con travesaño en forma de techo (doble lectura H/hotel).
 * Una sola tinta plana. Usa `currentColor`, por lo que hereda color del contenedor
 * (ej. text-primary, text-primary-foreground, text-white).
 */
export function Logo({ className, size = 24 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0', className)}
      aria-label="HospedApp"
      role="img"
    >
      {/* Pierna izquierda */}
      <rect x="10" y="8" width="13" height="48" rx="3.5" fill="currentColor" />
      {/* Pierna derecha */}
      <rect x="41" y="8" width="13" height="48" rx="3.5" fill="currentColor" />
      {/* Travesaño con techo (roof-shaped crossbar) */}
      <path
        d="M23 27 L32 19 L41 27 L41 37 L23 37 Z"
        fill="currentColor"
      />
    </svg>
  );
}

/**
 * Wordmark completo: brandmark + "HospedApp".
 */
export function LogoWithWordmark({ className, size = 32 }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Logo size={size} className="text-primary" />
      <span className="font-bold tracking-tight text-foreground" style={{ fontSize: size * 0.6 }}>
        HospedApp
      </span>
    </div>
  );
}