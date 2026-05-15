import { forwardRef } from 'react';
import { Save, Loader2, Check } from 'lucide-react';
import { Button, ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface SaveButtonProps extends Omit<ButtonProps, 'variant'> {
  /** Whether there are unsaved changes. When false the button looks disabled/gray. */
  dirty: boolean;
  /** Whether a save operation is in progress. */
  loading?: boolean;
  /** Label shown when there are unsaved changes (default: "Guardar cambios"). */
  label?: string;
  /** Label shown when there are no unsaved changes (default: "Sin cambios"). */
  idleLabel?: string;
  /** Label shown while saving (default: "Guardando..."). */
  loadingLabel?: string;
  /** Hide the leading icon. */
  hideIcon?: boolean;
}

/**
 * Botón de guardado global.
 * - Si `dirty` es true → verde, llamativo, habilitado.
 * - Si `dirty` es false → gris apagado, deshabilitado, indica "sin cambios".
 * - Si `loading` es true → spinner.
 */
export const SaveButton = forwardRef<HTMLButtonElement, SaveButtonProps>(
  (
    {
      dirty,
      loading = false,
      label = 'Guardar cambios',
      idleLabel = 'Sin cambios',
      loadingLabel = 'Guardando...',
      hideIcon = false,
      disabled,
      className,
      children,
      ...rest
    },
    ref
  ) => {
    const isDisabled = disabled || loading || !dirty;
    const Icon = loading ? Loader2 : dirty ? Save : Check;

    return (
      <Button
        ref={ref}
        type={rest.type ?? 'button'}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        className={cn(
          'transition-all duration-200',
          dirty && !loading
            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 ring-1 ring-emerald-500/30'
            : 'bg-muted text-muted-foreground hover:bg-muted cursor-not-allowed opacity-70',
          className
        )}
        {...rest}
      >
        {!hideIcon && (
          <Icon
            className={cn('h-4 w-4 mr-2', loading && 'animate-spin')}
          />
        )}
        {children ?? (loading ? loadingLabel : dirty ? label : idleLabel)}
      </Button>
    );
  }
);
SaveButton.displayName = 'SaveButton';

/**
 * Hook utilitario para detectar cambios entre el estado inicial y el actual.
 * Compara con JSON.stringify; ideal para formularios planos.
 */
export function isDirty<T>(initial: T, current: T): boolean {
  try {
    return JSON.stringify(initial) !== JSON.stringify(current);
  } catch {
    return initial !== current;
  }
}