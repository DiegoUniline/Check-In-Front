import { cn } from '@/lib/utils';
import { UserPlus, CalendarPlus } from 'lucide-react';

const legendItems = [
  // Por origen
  { label: 'Reserva anticipada', color: 'bg-blue-500', icon: CalendarPlus },
  { label: 'Walk-in (Recepción)', color: 'bg-green-500', icon: UserPlus },
  // Por estado
  { label: 'Confirmada', color: 'bg-blue-500' },
  { label: 'En hotel', color: 'bg-emerald-500' },
  { label: 'Pendiente', color: 'bg-yellow-400' },
  { label: 'Cancelada', color: 'bg-red-400' },
];

const statusItems = [
  { label: 'Disponible', dotColor: 'bg-green-500' },
  { label: 'Ocupada', dotColor: 'bg-amber-500' },
  { label: 'Limpieza', dotColor: 'bg-blue-400' },
  { label: 'Mantenimiento', dotColor: 'bg-red-500' },
];

interface TimelineLegendProps {
  totalRooms: number;
  visibleRooms: number;
  lastUpdate?: Date;
  totalReservas?: number;
  totalWalkins?: number;
  enHotel?: number;
}

export function TimelineLegend({ 
  totalRooms, 
  visibleRooms, 
  lastUpdate,
  totalReservas = 0,
  totalWalkins = 0,
  enHotel = 0,
}: TimelineLegendProps) {
  return (
    <div className="flex flex-col gap-4 mt-4 p-4 bg-card rounded-lg border">
      {/* Stats rápidos */}
      <div className="flex items-center gap-6 pb-3 border-b">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
            <CalendarPlus className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <p className="text-lg font-bold">{totalReservas}</p>
            <p className="text-xs text-muted-foreground">Reservas</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
            <UserPlus className="h-4 w-4 text-green-600" />
          </div>
          <div>
            <p className="text-lg font-bold">{totalWalkins}</p>
            <p className="text-xs text-muted-foreground">Walk-ins</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center">
            <span className="text-emerald-600 font-bold text-sm">🏨</span>
          </div>
          <div>
            <p className="text-lg font-bold">{enHotel}</p>
            <p className="text-xs text-muted-foreground">En hotel</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Leyenda de colores */}
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-xs font-medium text-muted-foreground">Origen:</span>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-blue-500 flex items-center justify-center">
              <CalendarPlus className="h-2.5 w-2.5 text-white" />
            </div>
            <span className="text-xs text-muted-foreground">Reserva</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-green-500 flex items-center justify-center">
              <UserPlus className="h-2.5 w-2.5 text-white" />
            </div>
            <span className="text-xs text-muted-foreground">Walk-in</span>
          </div>
          
          <span className="text-xs font-medium text-muted-foreground ml-4">Habitación:</span>
          {statusItems.map((item) => (
            <div key={item.label} className="flex items-center gap-1">
              <div className={cn("w-2.5 h-2.5 rounded-full", item.dotColor)} />
              <span className="text-xs text-muted-foreground">{item.label}</span>
            </div>
          ))}
        </div>

        {/* Info */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>
            <strong>{visibleRooms}</strong> de <strong>{totalRooms}</strong> habitaciones
          </span>
          {lastUpdate && (
            <span>
              Actualizado: {lastUpdate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
