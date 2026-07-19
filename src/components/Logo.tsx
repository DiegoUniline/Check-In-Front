import { cn } from '@/lib/utils';
import logoIcon from '@/assets/hospedapp-icon.png';
import logoFull from '@/assets/hospedapp-logo-full.png';

interface LogoProps {
  className?: string;
  size?: number;
}

/**
 * HospedApp brandmark — H en forma de escudo con puerta abierta (hospitalidad + acceso).
 * Solo el icono, sin wordmark. Ideal para sidebar, header móvil, favicon.
 */
export function Logo({ className, size = 24 }: LogoProps) {
  return (
    <img
      src={logoIcon}
      alt="HospedApp"
      width={size}
      height={size}
      className={cn('shrink-0 object-contain', className)}
      style={{ width: size, height: size }}
      loading="eager"
      decoding="async"
    />
  );
}

/**
 * Logo completo con wordmark "HospedApp" — para login, landing hero, splash.
 */
export function LogoFull({ className, height = 48 }: { className?: string; height?: number }) {
  return (
    <img
      src={logoFull}
      alt="HospedApp"
      className={cn('object-contain', className)}
      style={{ height, width: 'auto' }}
      loading="eager"
      decoding="async"
    />
  );
}

/**
 * Versión horizontal: isotipo + wordmark "HospedApp" con split bicolor
 * (Hosped en azul marino #04122C, App en turquesa #0B9F91) — cumple el manual
 * de identidad para barra superior, encabezados y espacios reducidos.
 */
export function LogoHorizontal({
  className,
  size = 36,
  wordmarkClassName,
}: {
  className?: string;
  size?: number;
  wordmarkClassName?: string;
}) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <Logo size={size} />
      <span
        className={cn('font-heading font-bold tracking-tight leading-none', wordmarkClassName)}
        style={{ fontSize: size * 0.62 }}
      >
        <span className="text-[#04122C] dark:text-white">VU</span>
        <span className="text-primary">LO</span>
      </span>
    </div>
  );
}