import api, { hotelDayBounds } from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';

/**
 * Corrige los métodos de lectura usados por Reportes.
 *
 * El API legado aceptaba fecha_desde/fecha_hasta en la firma de la UI pero
 * getPagos/getGastos ignoraban esos parámetros. Esto provocaba KPIs y cortes
 * con movimientos fuera del periodo seleccionado.
 */
const PATCH_KEY = '__hospedapp_reporting_safety_patch_v1__';
const root = globalThis as any;

const nextDate = (yyyyMmDd: string) => {
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  const date = new Date(y, (m || 1) - 1, d || 1);
  date.setDate(date.getDate() + 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

if (!root[PATCH_KEY]) {
  root[PATCH_KEY] = true;
  const client = api as any;
  const db = supabase as any;

  client.getPagos = async (params?: Record<string, string>) => {
    const hotelId = client.getHotelId?.();
    let query = db
      .from('pagos')
      .select('*')
      .eq('hotel_id', hotelId)
      .order('created_at', { ascending: false });

    // Los pagos cancelados no son ingreso; se consultan sólo si se piden.
    if (params?.incluir_cancelados !== 'true') query = query.neq('estado', 'Cancelado');
    // Rango por hora local del hotel (un pago a las 20:00 no cae en el día siguiente).
    if (params?.fecha_desde) query = query.gte('created_at', hotelDayBounds(params.fecha_desde)[0]);
    if (params?.fecha_hasta) query = query.lt('created_at', hotelDayBounds(params.fecha_hasta)[1]);
    if (params?.reserva_id) query = query.eq('reserva_id', params.reserva_id);
    if (params?.metodo_pago) query = query.eq('metodo_pago', params.metodo_pago);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  };

  client.getGastos = async (params?: Record<string, string>) => {
    const hotelId = client.getHotelId?.();
    let query = db
      .from('gastos')
      .select('*')
      .eq('hotel_id', hotelId)
      .order('fecha', { ascending: false });

    if (params?.fecha_desde) query = query.gte('fecha', params.fecha_desde);
    if (params?.fecha_hasta) query = query.lt('fecha', nextDate(params.fecha_hasta));
    if (params?.categoria) query = query.eq('categoria', params.categoria);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  };
}

export {};
