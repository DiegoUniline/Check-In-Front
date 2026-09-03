import api from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';

const PATCH_KEY = '__hospedapp_operational_integrity_patch_v2__';
const root = globalThis as any;

if (!root[PATCH_KEY]) {
  root[PATCH_KEY] = true;

  const client = api as any;
  const db = supabase as any;

  const originalCreateVenta = client.createVenta.bind(client);
  const originalCreatePago = client.createPago.bind(client);
  const originalDeletePago = client.deletePago.bind(client);
  const originalCreateCargo = client.createCargo.bind(client);
  const originalDeleteCargo = client.deleteCargo.bind(client);
  const originalGetReserva = client.getReserva.bind(client);
  const originalGetHabitaciones = client.getHabitaciones.bind(client);
  const originalGetDashboardStats = client.getDashboardStats.bind(client);

  const recalcularSaldoReserva = async (reservaId: string) => {
    const hotelId = client.getHotelId?.();
    const [{ data: reserva, error: reservaError }, { data: pagos, error: pagosError }] = await Promise.all([
      db.from('reservas').select('total').eq('id', reservaId).eq('hotel_id', hotelId).maybeSingle(),
      db.from('pagos').select('monto').eq('reserva_id', reservaId).eq('hotel_id', hotelId),
    ]);
    if (reservaError) throw reservaError;
    if (pagosError) throw pagosError;
    if (!reserva) return;

    const totalReserva = Number(reserva.total || 0);
    const totalPagado = (pagos || []).reduce((sum: number, p: any) => sum + (Number(p.monto) || 0), 0);

    const { error } = await db
      .from('reservas')
      .update({ total_pagado: totalPagado, saldo_pendiente: Math.max(0, totalReserva - totalPagado) })
      .eq('id', reservaId)
      .eq('hotel_id', hotelId);
    if (error) throw error;
  };

  // La API ya registra venta, detalle e inventario dentro de un único RPC.
  // No se vuelve a tocar stock desde el navegador para evitar dobles salidas.
  client.createVenta = (data: any) => originalCreateVenta(data);

  client.createPago = async (data: any) => {
    if (data?.reserva_id) {
      await recalcularSaldoReserva(data.reserva_id);
      const hotelId = client.getHotelId?.();
      const { data: reserva, error } = await db
        .from('reservas')
        .select('saldo_pendiente')
        .eq('id', data.reserva_id)
        .eq('hotel_id', hotelId)
        .maybeSingle();
      if (error) throw error;
      const saldo = Number(reserva?.saldo_pendiente || 0);
      const monto = Number(data.monto || 0);
      if (monto <= 0) throw new Error('El monto del pago debe ser mayor a cero');
      if (monto > saldo + 0.009) throw new Error(`El pago excede el saldo pendiente de ${saldo.toFixed(2)}`);
    }
    const pago = await originalCreatePago(data);
    if (data?.reserva_id) await recalcularSaldoReserva(data.reserva_id);
    return pago;
  };

  client.deletePago = async (id: string) => {
    const hotelId = client.getHotelId?.();
    const { data: pago, error } = await db.from('pagos').select('id,reserva_id').eq('id', id).eq('hotel_id', hotelId).maybeSingle();
    if (error) throw error;
    const result = await originalDeletePago(id);
    if (pago?.reserva_id) await recalcularSaldoReserva(pago.reserva_id);
    return result;
  };

  client.createCargo = async (data: any) => {
    const cargo = await originalCreateCargo(data);
    if (cargo?.reserva_id || data?.reserva_id) await recalcularSaldoReserva(cargo?.reserva_id || data.reserva_id);
    return cargo;
  };

  client.cargoHabitacion = (data: any) => client.createCargo(data);

  client.deleteCargo = async (id: string) => {
    const hotelId = client.getHotelId?.();
    const { data: cargo, error } = await db.from('cargos').select('id,reserva_id').eq('id', id).eq('hotel_id', hotelId).maybeSingle();
    if (error) throw error;
    const result = await originalDeleteCargo(id);
    if (cargo?.reserva_id) await recalcularSaldoReserva(cargo.reserva_id);
    return result;
  };

  client.getReserva = async (id: string) => {
    const reserva = await originalGetReserva(id);
    if (!reserva) return reserva;
    const cargos = Array.isArray(reserva.cargos) ? reserva.cargos : [];
    const cargosExtra = cargos.map((cargo: any) => ({
      ...cargo,
      precio: Number(cargo.precio ?? cargo.precio_unitario ?? 0),
      cantidad: Number(cargo.cantidad || 1),
      total: Number(cargo.total ?? cargo.subtotal ?? ((Number(cargo.precio ?? cargo.precio_unitario ?? 0)) * Number(cargo.cantidad || 1))),
      producto_nombre: cargo.producto_nombre || cargo.concepto || 'Cargo',
    }));
    return { ...reserva, cargos_extra: cargosExtra };
  };

  client.getHabitaciones = async (params?: Record<string, string>) => {
    const habitaciones = await originalGetHabitaciones(params);
    if (params?.estado_habitacion !== 'Disponible') return habitaciones;
    return (habitaciones || []).filter((h: any) => {
      const limpieza = String(h.estado_limpieza || '').toLowerCase();
      const mantenimiento = String(h.estado_mantenimiento || '').toLowerCase();
      return (!limpieza || limpieza === 'limpia') && (!mantenimiento || mantenimiento === 'ok');
    });
  };

  client.getDashboardStats = async () => {
    const stats = await originalGetDashboardStats();
    const hotelId = client.getHotelId?.();
    const { data: habitaciones, error } = await db
      .from('habitaciones')
      .select('estado_habitacion,estado_limpieza,estado_mantenimiento')
      .eq('hotel_id', hotelId);
    if (error) return stats;

    const disponiblesReales = (habitaciones || []).filter((h: any) => {
      const limpieza = String(h.estado_limpieza || '').toLowerCase();
      const mantenimiento = String(h.estado_mantenimiento || '').toLowerCase();
      return h.estado_habitacion === 'Disponible' && (!limpieza || limpieza === 'limpia') && (!mantenimiento || mantenimiento === 'ok');
    }).length;

    return { ...stats, habitaciones_disponibles: disponiblesReales, disponibles: disponiblesReales };
  };
}

export {};
