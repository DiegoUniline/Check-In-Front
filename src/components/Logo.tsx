import { cn } from '@/lib/utils';
import logoIcon from '@/assets/vulo-fox.png';
import wordmark from '@/assets/vulo-wordmark.png';

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
      alt="VULO"
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
 * Wordmark oficial VULO (imagen). Prohibido reemplazar con texto.
 */
export function LogoFull({ className, height = 48 }: { className?: string; height?: number }) {
  return (
    <img
      src={wordmark}
      alt="VULO"
      className={cn('object-contain', className)}
      style={{ height, width: 'auto' }}
      loading="eager"
      decoding="async"
    />
  );
}

/**
 * Isotipo + wordmark oficial (imagen). Ambos son intocables por manual de marca.
 */
export function LogoHorizontal({
  className,
  size = 36,
}: {
  className?: string;
  size?: number;
  wordmarkClassName?: string;
}) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <Logo size={size} />
      <img
        src={wordmark}
        alt="VULO"
        className="object-contain"
        style={{ height: size * 0.72, width: 'auto' }}
        loading="eager"
        decoding="async"
      />
    </div>
  );
}