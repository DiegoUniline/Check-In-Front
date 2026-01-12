import { Clock, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Reserva } from '@/data/mockData';
import { cn } from '@/lib/utils';

interface CheckInsCardProps {
  title: string;
  reservas: Reserva[];
  type: 'checkin' | 'checkout';
  onAction?: (reservaId: string) => void;
}

export function CheckInsCard({ title, reservas, type, onAction }: CheckInsCardProps) {
  const getInitials = (nombre: string, apellido?: string) => {
    return `${nombre.charAt(0)}${apellido?.charAt(0) || ''}`.toUpperCase();
  };

  const getStatusColor = (estado: Reserva['estado']) => {
    switch (estado) {
      case 'Confirmada': return 'bg-success/10 text-success border-success/20';
      case 'CheckIn': return 'bg-warning/10 text-warning border-warning/20';
      case 'Pendiente': return 'bg-info/10 text-info border-info/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        <Badge variant="outline" className="font-normal">
          {reservas.length} pendientes
        </Badge>
      </CardHeader>
      <CardContent>
        {reservas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-muted p-3 mb-3">
              <Clock className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              No hay {type === 'checkin' ? 'llegadas' : 'salidas'} pendientes
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {reservas.map((reserva) => (
              <div
                key={reserva.id}
                className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
              >
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                    {getInitials(reserva.cliente.nombre, reserva.cliente.apellidoPaterno)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {reserva.cliente.nombre} {reserva.cliente.apellidoPaterno}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Hab. {reserva.habitacion?.numero || 'Por asignar'}</span>
                    <span>•</span>
                    <span>{reserva.horaLlegada || '—'}</span>
                  </div>
                </div>

                <Badge 
                  variant="outline" 
                  className={cn("text-xs", getStatusColor(reserva.estado))}
                >
                  {reserva.estado}
                </Badge>

                <Button
                  size="sm"
                  variant="ghost"
                  className="text-primary hover:text-primary hover:bg-primary/10"
                  onClick={() => onAction?.(reserva.id)}
                >
                  {type === 'checkin' ? 'Check-in' : 'Check-out'}
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