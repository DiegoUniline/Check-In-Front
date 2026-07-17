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