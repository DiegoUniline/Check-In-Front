import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/currency';

/**
 * Check-out según la configuración del hotel:
 *  - completo: abre el flujo de check-out.
 *  - rápido: un clic libera la habitación; si hay saldo, saldo a favor o
 *    entregables pendientes, abre el flujo completo con el aviso.
 */
export function useCheckoutAction(onDone?: () => void | Promise<void>) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [procesandoId, setProcesandoId] = useState<string | null>(null);

  const iniciarCheckout = async (reservaId: string) => {
    if (!reservaId || procesandoId) return;
    let modo: 'completo' | 'rapido' = 'completo';
    try { modo = (await api.getCheckoutConfig()).modo; } catch { /* flujo completo */ }
    if (modo !== 'rapido') { navigate(`/checkout/${reservaId}`); return; }

    setProcesandoId(reservaId);
    try {
      const r = await api.checkoutRapido(reservaId);
      toast({
        title: `Check-out listo · Hab. ${r?.habitacion_numero || ''}`.trim(),
        description: r?.habitacion_limpia ? 'Habitación liberada y lista para rentar.' : 'Habitación liberada y enviada a limpieza.',
      });
      await onDone?.();
    } catch (error: any) {
      const msg = String(error?.message || '');
      const [codigo, detalle] = msg.split(':');
      const avisos: Record<string, string> = {
        SALDO_PENDIENTE: `Tiene saldo pendiente de ${formatCurrency(Number(detalle))}. Cóbralo para terminar.`,
        SALDO_A_FAVOR: `Tiene saldo a favor de ${formatCurrency(Number(detalle))}. Revisa la liquidación.`,
        ENTREGABLES_PENDIENTES: `Faltan por devolver: ${detalle}.`,
      };
      if (avisos[codigo]) {
        toast({ title: 'Se necesita el check-out completo', description: avisos[codigo] });
        navigate(`/checkout/${reservaId}`);
      } else {
        toast({ title: 'No se pudo hacer el check-out', description: msg, variant: 'destructive' });
      }
    } finally {
      setProcesandoId(null);
    }
  };

  return { iniciarCheckout, procesandoId };
}
