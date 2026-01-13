import { TrendingUp, FileText, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface VentasDiaCardProps {
  ventas: {
    total: number;
    alojamiento: number;
    alimentos: number;
    servicios: number;
  };
}

export function VentasDiaCard({ ventas }: VentasDiaCardProps) {
  // Ensure values are valid numbers
  const total = Number(ventas?.total) || 0;
  const alojamiento = Number(ventas?.alojamiento) || 0;
  const alimentos = Number(ventas?.alimentos) || 0;
  const servicios = Number(ventas?.servicios) || 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getPercentage = (value: number) => total > 0 ? Math.round((value / total) * 100) : 0;

  const breakdown = [
    { label: 'Alojamiento', value: alojamiento, color: 'bg-primary' },
    { label: 'Alimentos y Bebidas', value: alimentos, color: 'bg-info' },
    { label: 'Servicios', value: servicios, color: 'bg-warning' },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold">Ventas del Día</CardTitle>
        <div className="flex items-center gap-1 text-sm text-success">
          <TrendingUp className="h-4 w-4" />
          <span>+12.5%</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <p className="text-3xl font-bold tracking-tight">{formatCurrency(total)}</p>
          <p className="text-sm text-muted-foreground">Total recaudado hoy</p>
        </div>

        <div className="space-y-3">
          {breakdown.map((item) => (
            <div key={item.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-muted-foreground">{item.label}</span>
                <span className="text-sm font-medium">{formatCurrency(item.value)}</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div 
                  className={`h-full rounded-full ${item.color}`}
                  style={{ width: `${getPercentage(item.value)}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" size="sm" className="flex-1">
            <FileText className="mr-2 h-4 w-4" />
            Reporte Diario
          </Button>
          <Button variant="outline" size="sm" className="flex-1">
            <BarChart3 className="mr-2 h-4 w-4" />
            Estadísticas
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}