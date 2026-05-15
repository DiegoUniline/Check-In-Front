import { useEffect, useState } from 'react';
import { Bell, Check, CheckCheck, Inbox } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { marcarLeida, marcarTodasLeidas } from '@/lib/notificaciones';
import { cn } from '@/lib/utils';

const tipoColor: Record<string, string> = {
  info: 'border-l-blue-500',
  success: 'border-l-green-500',
  warning: 'border-l-yellow-500',
  error: 'border-l-red-500',
  reserva_online: 'border-l-yellow-500',
  pago: 'border-l-green-500',
  mantenimiento: 'border-l-orange-500',
  limpieza: 'border-l-purple-500',
};

export function NotificationBell() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const hotelId = typeof window !== 'undefined' ? localStorage.getItem('hotel_id') : null;

  const { data: notifs = [] } = useQuery({
    queryKey: ['notificaciones'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notificaciones' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data as any[]) || [];
    },
    enabled: !!hotelId,
    refetchInterval: 60_000,
  });

  useRealtimeSync('notificaciones', () => {
    qc.invalidateQueries({ queryKey: ['notificaciones'] });
  });

  const noLeidas = notifs.filter((n: any) => !n.leida).length;

  const handleClick = async (n: any) => {
    if (!n.leida) {
      await marcarLeida(n.id);
      qc.invalidateQueries({ queryKey: ['notificaciones'] });
    }
    if (n.url) {
      setOpen(false);
      navigate(n.url);
    }
  };

  const handleMarcarTodas = async () => {
    if (!hotelId) return;
    await marcarTodasLeidas(hotelId);
    qc.invalidateQueries({ queryKey: ['notificaciones'] });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
          <Bell className="h-5 w-5" />
          {noLeidas > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
              {noLeidas > 9 ? '9+' : noLeidas}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between p-3 border-b">
          <div className="font-semibold">Notificaciones</div>
          {noLeidas > 0 && (
            <Button variant="ghost" size="sm" onClick={handleMarcarTodas} className="h-7 text-xs">
              <CheckCheck className="h-3.5 w-3.5 mr-1" />
              Marcar todas
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-96">
          {notifs.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <Inbox className="h-10 w-10 mx-auto mb-2 opacity-40" />
              No hay notificaciones
            </div>
          ) : (
            <ul className="divide-y">
              {notifs.map((n: any) => (
                <li key={n.id}>
                  <button
                    onClick={() => handleClick(n)}
                    className={cn(
                      'w-full text-left p-3 hover:bg-accent transition-colors border-l-4',
                      tipoColor[n.tipo] || tipoColor.info,
                      !n.leida && 'bg-accent/40'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-medium text-sm">{n.titulo}</div>
                      {!n.leida && <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                    </div>
                    {n.mensaje && (
                      <div className="text-xs text-muted-foreground mt-1">{n.mensaje}</div>
                    )}
                    <div className="text-[10px] text-muted-foreground mt-1.5">
                      {new Date(n.created_at).toLocaleString()}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}