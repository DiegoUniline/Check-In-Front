import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { exportToExcel, type ExportOptions } from '@/lib/exportExcel';
import { useToast } from '@/hooks/use-toast';

interface Props extends ExportOptions {
  rows: Record<string, any>[] | (() => Record<string, any>[]);
  label?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'icon';
  disabled?: boolean;
  className?: string;
}

export function ExportButton({
  rows,
  label = 'Exportar Excel',
  variant = 'outline',
  size = 'sm',
  disabled,
  className,
  ...opts
}: Props) {
  const { toast } = useToast();
  const handle = () => {
    try {
      const data = typeof rows === 'function' ? rows() : rows;
      if (!data || data.length === 0) {
        toast({ title: 'Sin datos', description: 'No hay filas para exportar.' });
        return;
      }
      exportToExcel(data, opts);
      toast({ title: 'Exportado', description: `${data.length} filas descargadas.` });
    } catch (e: any) {
      toast({ title: 'Error al exportar', description: e?.message ?? 'Error', variant: 'destructive' });
    }
  };
  return (
    <Button onClick={handle} variant={variant} size={size} disabled={disabled} className={className}>
      <Download className="h-4 w-4 mr-2" />
      {label}
    </Button>
  );
}
