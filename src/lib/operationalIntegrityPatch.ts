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
    const [{ data: reserva, error: reservaError }, { data: pagos, error: pagosError }, { data: cargos, error: cargosError }] = await Promise.all([
      db.from('reservas').select('total').eq('id', reservaId).eq('hotel_id', hotelId).maybeSingle(),
      db.from('pagos').select('monto').eq('reserva_id', reservaId).eq('hotel_id', hotelId),
      db.from('cargos').select('total,subtotal,cantidad,precio_unitario').eq('reserva_id', reservaId).eq('hotel_id', hotelId),
    ]);
    if (reservaError) throw reservaError;
    if (pagosError) throw pagosError;
    if (cargosError) throw cargosError;
    if (!reserva) return;

    const hospedaje = Number(reserva.total || 0);
    const cargosTotal = (cargos || []).reduce((sum: number, c: any) => {
      const totalCargo = Number(c.total ?? c.subtotal ?? ((Number(c.precio_unitario) || 0) * (Number(c.cantidad) || 1))) || 0;
      return sum + totalCargo;
    }, 0);
    const totalPagado = (pagos || []).reduce((sum: number, p: any) => sum + (Number(p.monto) || 0), 0);
    const totalAdeudado = hospedaje + cargosTotal;

    const { error } = await db
      .from('reservas')
      .update({ total_pagado: totalPagado, saldo_pendiente: Math.max(0, totalAdeudado - totalPagado) })
      .eq('id', reservaId)
      .eq('hotel_id', hotelId);
    if (error) throw error;
  };

  client.createVenta = async (data: any) => {
    const { detalle, detalles, ...header } = data || {};
    const items = (detalles ?? detalle ?? []) as any[];
    const hotelId = client.getHotelId?.();
    if (!hotelId) throw new Error('Hotel no definido');
    if (!Array.isArray(items) || items.length === 0) throw new Error('La venta no contiene productos');

    const cantidades = new Map<string, number>();
    for (const item of items) {
      if (!item?.producto_id) continue;
      const cantidad = Number(item.cantidad) || 0;
      if (cantidad <= 0) throw new Error('La cantidad de un producto no es válida');
      cantidades.set(item.producto_id, (cantidades.get(item.producto_id) || 0) + cantidad);
    }

    const ids = [...cantidades.keys()];
    const { data: productos, error: productosError } = await db
      .from('productos')
      .select('id,nombre,stock_actual')
      .eq('hotel_id', hotelId)
      .in('id', ids);
    if (productosError) throw productosError;

    const stockAnterior = new Map<string, number>();
    const nombres = new Map<string, string>();
    for (const producto of productos || []) {
      stockAnterior.set(producto.id, Number(producto.stock_actual) || 0);
      nombres.set(producto.id, producto.nombre || 'Producto');
    }

    for (const [productoId, cantidad] of cantidades) {
      if (!stockAnterior.has(productoId)) throw new Error('Uno de los productos ya no existe');
      const disponible = stockAnterior.get(productoId) || 0;
      if (cantidad > disponible) {
        throw new Error(`${nombres.get(productoId) || 'Producto'}: stock insuficiente. Disponible ${disponible}, solicitado ${cantidad}.`);
      }
    }

    const venta = await originalCreateVenta({ ...header, detalles: items });
    const actualizados: string[] = [];

    try {
      for (const [productoId, cantidad] of cantidades) {
        const anterior = stockAnterior.get(productoId) || 0;
        const nuevo = anterior - cantidad;
        const { error } = await db.from('productos').update({ stock_actual: nuevo }).eq('id', productoId).eq('hotel_id', hotelId);
        if (error) throw error;
        actualizados.push(productoId);
      }

      const movimientos = [...cantidades.entries()].map(([productoId, cantidad]) => {
        const anterior = stockAnterior.get(productoId) || 0;
        return {
          producto_id: productoId,
          tipo: 'Salida',
          cantidad,
          stock_anterior: anterior,
          stock_nuevo: anterior - cantidad,
          motivo: 'Venta POS',
          referencia: venta?.folio || venta?.id || null,
        };
      });
      if (movimientos.length) {
        const { error } = await db.from('movimientos_inventario').insert(movimientos);
        if (error) throw error;
      }
      return venta;
    } catch (error) {
      for (const productoId of actualizados.reverse()) {
        await db.from('productos').update({ stock_actual: stockAnterior.get(productoId) || 0 }).eq('id', productoId).eq('hotel_id', hotelId);
      }
      if (venta?.id) {
        await db.from('ventas_detalle').delete().eq('venta_id', venta.id);
        await db.from('ventas').delete().eq('id', venta.id).eq('hotel_id', hotelId);
      }
      throw error;
    }
  };

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
