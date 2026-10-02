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
import { formatDate } from '@/lib/dateFormat';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PoliticasReservaPanel } from '@/components/reservas/PoliticasReservaPanel';
import { canAccess } from '@/lib/permissions';
import { useAuth } from '@/contexts/useAuth';

export default function ReservasOnline() {
  const { toast } = useToast();
  const { user } = useAuth();
  const verPoliticas = canAccess('politicas_reserva', user?.rol);
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
      <Tabs defaultValue="pendientes" className="space-y-3">
        <TabsList className="h-8">
          <TabsTrigger value="pendientes" className="h-7 text-xs">Pendientes{reservas.length ? ` (${reservas.length})` : ''}</TabsTrigger>
          {verPoliticas && <TabsTrigger value="politicas" className="h-7 text-xs">Políticas de reserva</TabsTrigger>}
        </TabsList>
        {verPoliticas && <TabsContent value="politicas" className="mt-0">
          <PoliticasReservaPanel />
        </TabsContent>}
        <TabsContent value="pendientes" className="mt-0">
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
          <Card className="py-0">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-2.5 font-medium">Reserva</th>
                      <th className="px-4 py-2.5 font-medium">Contacto</th>
                      <th className="px-4 py-2.5 font-medium whitespace-nowrap">Fechas</th>
                      <th className="px-4 py-2.5 font-medium">Huéspedes</th>
                      <th className="px-4 py-2.5 font-medium">Habitación</th>
                      <th className="px-4 py-2.5 font-medium text-right">Total</th>
                      <th className="px-4 py-2.5 font-medium text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reservas.map((r: any) => (
                      <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-semibold">{r.cliente_nombre || 'Sin nombre'}</div>
                          <div className="text-xs text-muted-foreground">{r.numero_reserva}</div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {r.cliente_email && <div className="truncate max-w-[180px]">{r.cliente_email}</div>}
                          {r.cliente_telefono && <div className="text-xs">{r.cliente_telefono}</div>}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {formatDate(r.fecha_checkin)} → {formatDate(r.fecha_checkout)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {r.adultos}A{r.ninos > 0 ? ` ${r.ninos}N` : ''}
                        </td>
                        <td className="px-4 py-3">{r.tipo_nombre || '—'}</td>
                        <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">{formatCurrency(Number(r.total || 0))}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8"
                              disabled={procesando === r.id}
                              onClick={() => {
                                const respuesta = prompt('Motivo del rechazo (opcional):');
                                if (respuesta === null) return; // Canceló: no se rechaza.
                                setProcesando(r.id);
                                rechazar.mutate({ id: r.id, motivo: respuesta.trim() });
                              }}
                            >
                              <X className="h-4 w-4 mr-1" /> Rechazar
                            </Button>
                            <Button
                              size="sm"
                              className="h-8"
                              disabled={procesando === r.id}
                              onClick={() => {
                                setProcesando(r.id);
                                confirmar.mutate(r.id);
                              }}
                            >
                              <Check className="h-4 w-4 mr-1" /> Confirmar
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}
