import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, Download, X } from 'lucide-react';
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
  entityName?: string; // p.ej. "clientes"
  /** Acciones extra (activar/desactivar, cambiar estado, etc.) */
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
    <div className="flex flex-wrap items-center justify-between gap-2 mt-3 p-2 rounded-md bg-primary/10 border border-primary/20">
      <span className="text-sm font-medium">
        {count} {entityName} seleccionado(s)
      </span>
      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" size="sm" onClick={onClear}>
          <X className="h-4 w-4 mr-1" /> Limpiar
        </Button>
        {onExport && (
          <Button variant="outline" size="sm" onClick={onExport}>
            <Download className="h-4 w-4 mr-1" /> Exportar CSV
          </Button>
        )}
        {extraActions}
        {onDelete && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={deleting}>
                <Trash2 className="h-4 w-4 mr-1" /> Eliminar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar {count} {entityName}?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción no se puede deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => { e.preventDefault(); onDelete(); }}
                  disabled={deleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleting ? 'Eliminando...' : 'Eliminar'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}