import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Inbox, Check, X, Mail, Phone, CalendarDays, Users, BedDouble } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { formatCurrency } from '@/lib/currency';

export default function ReservasOnline() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [procesando, setProcesando] = useState<string | null>(null);

  const { data: reservas = [], isLoading, refetch } = useQuery({
    queryKey: ['reservas-online-pendientes'],
    queryFn: api.getReservasOnlinePendientes,
  });

  useRealtimeSync('reservas', () => {
    refetch();
    qc.invalidateQueries({ queryKey: ['reservas-online-count'] });
  });

  const confirmar = useMutation({
    mutationFn: (id: string) => api.confirmarReservaOnline(id),
    onSuccess: () => {
      toast({ title: 'Reserva confirmada', description: 'El cliente verá su reserva como confirmada.' });
      refetch();
      qc.invalidateQueries({ queryKey: ['reservas-online-count'] });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
    onSettled: () => setProcesando(null),
  });

  const rechazar = useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo?: string }) => api.rechazarReservaOnline(id, motivo),
    onSuccess: () => {
      toast({ title: 'Reserva rechazada' });
      refetch();
      qc.invalidateQueries({ queryKey: ['reservas-online-count'] });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
    onSettled: () => setProcesando(null),
  });

  return (
    <MainLayout title="Reservas Online" subtitle="Bandeja de reservas pendientes desde la web pública">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Inbox className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold">Reservas online pendientes</h1>
            <p className="text-sm text-muted-foreground">
              {reservas.length} {reservas.length === 1 ? 'reserva esperando' : 'reservas esperando'} tu confirmación
            </p>
          </div>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Cargando…</p>
        ) : reservas.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Inbox className="h-12 w-12 mx-auto mb-3 opacity-30" />
              No hay reservas online pendientes.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {reservas.map((r: any) => (
              <Card key={r.id} className="border-l-4 border-l-yellow-400">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-base">{r.cliente_nombre || 'Sin nombre'}</div>
                      <div className="text-xs text-muted-foreground">{r.numero_reserva}</div>
                    </div>
                    <Badge variant="outline" className="bg-yellow-50 border-yellow-300 text-yellow-700">
                      Pendiente
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {r.cliente_email && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Mail className="h-3 w-3" /> {r.cliente_email}
                      </div>
                    )}
                    {r.cliente_telefono && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Phone className="h-3 w-3" /> {r.cliente_telefono}
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {format(new Date(r.fecha_checkin), 'd MMM', { locale: es })} →{' '}
                      {format(new Date(r.fecha_checkout), 'd MMM yyyy', { locale: es })}
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" /> {r.adultos}A {r.ninos > 0 ? `${r.ninos}N` : ''}
                    </div>
                    {r.tipo_nombre && (
                      <div className="flex items-center gap-1 col-span-2">
                        <BedDouble className="h-3 w-3" /> {r.tipo_nombre}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t">
                    <div className="font-bold text-primary">{formatCurrency(Number(r.total || 0))}</div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={procesando === r.id}
                        onClick={() => {
                          const motivo = prompt('Motivo del rechazo (opcional):') || '';
                          if (motivo === null) return;
                          setProcesando(r.id);
                          rechazar.mutate({ id: r.id, motivo });
                        }}
                      >
                        <X className="h-4 w-4 mr-1" /> Rechazar
                      </Button>
                      <Button
                        size="sm"
                        disabled={procesando === r.id}
                        onClick={() => {
                          setProcesando(r.id);
                          confirmar.mutate(r.id);
                        }}
                      >
                        <Check className="h-4 w-4 mr-1" /> Confirmar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}