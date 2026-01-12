import { AlertTriangle, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TareaLimpieza } from '@/data/mockData';
import { cn } from '@/lib/utils';

interface TareasCriticasCardProps {
  tareas: TareaLimpieza[];
  onAtender?: (tareaId: string) => void;
}

export function TareasCriticasCard({ tareas, onAtender }: TareasCriticasCardProps) {
  const getPrioridadColor = (prioridad: TareaLimpieza['prioridad']) => {
    switch (prioridad) {
      case 'Urgente': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'Alta': return 'bg-warning/10 text-warning border-warning/20';
      case 'Normal': return 'bg-info/10 text-info border-info/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getTipoIcon = (tipo: TareaLimpieza['tipo']) => {
    switch (tipo) {
      case 'Checkout': return '🧹';
      case 'Ocupada': return '🛏️';
      case 'Profunda': return '✨';
      case 'Inspeccion': return '🔍';
      default: return '📋';
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning" />
          Tareas Críticas
        </CardTitle>
        <Badge variant="destructive" className="font-normal">
          {tareas.length} pendientes
        </Badge>
      </CardHeader>
      <CardContent>
        {tareas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-success/10 p-3 mb-3">
              <span className="text-2xl">✅</span>
            </div>
            <p className="text-sm text-muted-foreground">
              No hay tareas críticas pendientes
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {tareas.map((tarea) => (
              <div
                key={tarea.id}
                className="flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background text-lg">
                  {getTipoIcon(tarea.tipo)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">
                      Habitación {tarea.habitacion.numero}
                    </p>
                    <Badge 
                      variant="outline" 
                      className={cn("text-xs", getPrioridadColor(tarea.prioridad))}
                    >
                      {tarea.prioridad}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {tarea.tipo} • {tarea.notas || 'Limpieza estándar'}
                  </p>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  className="border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => onAtender?.(tarea.id)}
                >
                  Atender
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}