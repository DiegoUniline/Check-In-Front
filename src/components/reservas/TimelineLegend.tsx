import { cn } from '@/lib/utils';

const legendItems = [
  { label: 'Confirmada', color: 'bg-primary' },
  { label: 'Check-in realizado', color: 'bg-success' },
  { label: 'Pendiente de pago', color: 'bg-info' },
  { label: 'Disponible', dotColor: 'bg-success' },
  { label: 'Ocupada', dotColor: 'bg-warning' },
  { label: 'Limpieza', dotColor: 'bg-info' },
  { label: 'Mantenimiento', dotColor: 'bg-destructive' },
];

interface TimelineLegendProps {
  totalRooms: number;
  visibleRooms: number;
  lastUpdate?: Date;
}

export function TimelineLegend({ totalRooms, visibleRooms, lastUpdate }: TimelineLegendProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-4 p-4 bg-card rounded-lg border">
      {/* Legend items */}
      <div className="flex flex-wrap items-center gap-4">
        {legendItems.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            {item.color ? (
              <div className={cn("w-6 h-3 rounded-sm", item.color)} />
            ) : (
              <div className={cn("w-2.5 h-2.5 rounded-full", item.dotColor)} />
            )}
            <span className="text-xs text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>
          Viendo <strong>{visibleRooms}</strong> de <strong>{totalRooms}</strong> habitaciones
        </span>
        {lastUpdate && (
          <span>
            Última actualización: {lastUpdate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
    </div>
  );
}