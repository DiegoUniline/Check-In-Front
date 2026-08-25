import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, Download, X, CheckCircle2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface BulkActionBarProps {
  count: number;
  onClear: () => void;
  onDelete?: () => Promise<void> | void;
  onExport?: () => void;
  deleting?: boolean;
  entityName?: string;
  extraActions?: ReactNode;
}

export function BulkActionBar({
  count,
  onClear,
  onDelete,
  onExport,
  deleting,
  entityName = 'registros',
  extraActions,
}: BulkActionBarProps) {
  if (count === 0) return null;

  return (
    <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+5rem)] z-20 mt-3 lg:bottom-4">
      <div className="flex flex-col gap-2 rounded-xl border border-border/80 bg-background/95 p-2.5 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/90 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2 px-1">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight">
              {count} {count === 1 ? 'seleccionado' : 'seleccionados'}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              Acciones para {entityName}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
          <Button variant="ghost" size="sm" onClick={onClear} className="h-8 px-2.5">
            <X className="mr-1.5 h-3.5 w-3.5" />
            Quitar selección
          </Button>

          {onExport && (
            <Button variant="outline" size="sm" onClick={onExport} className="h-8 px-2.5">
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Exportar
            </Button>
          )}

          {extraActions}

          {onDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={deleting} className="h-8 px-2.5">
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Eliminar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    ¿Eliminar {count} {entityName}?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción no se puede deshacer. Revisa la selección antes de continuar.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(e) => {
                      e.preventDefault();
                      onDelete();
                    }}
                    disabled={deleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleting ? 'Eliminando...' : `Eliminar ${count}`}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
    </div>
  );
}
