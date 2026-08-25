import api from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';

/**
 * Integridad operativa transversal.
 *
 * - POS: acepta `detalle`/`detalles`, valida stock y descuenta inventario una sola vez.
 * - Pagos: al eliminar un pago recalcula total_pagado y saldo_pendiente de la reserva.
 * - Check-out: normaliza cargos para que la cuenta incluya consumos reales del POS.
 * - Habitaciones: una habitación "Disponible" pero sucia no se trata como lista para vender.
 * - Dashboard: disponibilidad = habitación disponible + limpia.
 */
const PATCH_KEY = '__hospedapp_operational_integrity_patch_v1__';
const root = globalThis as any;

if (!root[PATCH_KEY]) {
  root[PATCH_KEY] = true;

  const client = api as any;
  const db = supabase as any;

  const originalCreateVenta = client.createVenta.bind(client);
  const originalDeletePago = client.deletePago.bind(client);
  const originalGetReserva = client.getReserva.bind(client);
  const originalGetHabitaciones = client.getHabitaciones.bind(client);
  const originalGetDashboardStats = client.getDashboardStats.bind(client);

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

    // Normaliza la firma: el API legado solo entendía `detalles`, mientras POS enviaba `detalle`.
    const venta = await originalCreateVenta({ ...header, detalles: items });
    const actualizados: string[] = [];

    try {
      for (const [productoId, cantidad] of cantidades) {
        const anterior = stockAnterior.get(productoId) || 0;
        const nuevo = anterior - cantidad;
        const { error } = await db
          .from('productos')
          .update({ stock_actual: nuevo })
          .eq('id', productoId)
          .eq('hotel_id', hotelId);
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
      // Compensación de stock si falla cualquier paso posterior a la venta.
      for (const productoId of actualizados.reverse()) {
        await db
          .from('productos')
          .update({ stock_actual: stockAnterior.get(productoId) || 0 })
          .eq('id', productoId)
          .eq('hotel_id', hotelId);
      }
      if (venta?.id) {
        await db.from('ventas_detalle').delete().eq('venta_id', venta.id);
        await db.from('ventas').delete().eq('id', venta.id).eq('hotel_id', hotelId);
      }
      throw error;
    }
  };

  client.deletePago = async (id: string) => {
    const hotelId = client.getHotelId?.();
    const { data: pago, error: pagoError } = await db
      .from('pagos')
      .select('id,reserva_id')
      .eq('id', id)
      .eq('hotel_id', hotelId)
      .maybeSingle();
    if (pagoError) throw pagoError;

    const result = await originalDeletePago(id);

    if (pago?.reserva_id) {
      const [{ data: pagos, error: pagosError }, { data: reserva, error: reservaError }] = await Promise.all([
        db.from('pagos').select('monto').eq('reserva_id', pago.reserva_id).eq('hotel_id', hotelId),
        db.from('reservas').select('total').eq('id', pago.reserva_id).eq('hotel_id', hotelId).maybeSingle(),
      ]);
      if (pagosError) throw pagosError;
      if (reservaError) throw reservaError;
      const totalPagado = (pagos || []).reduce((sum: number, p: any) => sum + (Number(p.monto) || 0), 0);
      const total = Number(reserva?.total || 0);
      const { error: updateError } = await db
        .from('reservas')
        .update({ total_pagado: totalPagado, saldo_pendiente: Math.max(0, total - totalPagado) })
        .eq('id', pago.reserva_id)
        .eq('hotel_id', hotelId);
      if (updateError) throw updateError;
    }

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
      const limpia = !limpieza || limpieza === 'limpia';
      const sinMantenimiento = !mantenimiento || mantenimiento === 'ok';
      return limpia && sinMantenimiento;
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
      const disponible = h.estado_habitacion === 'Disponible';
      const limpieza = String(h.estado_limpieza || '').toLowerCase();
      const mantenimiento = String(h.estado_mantenimiento || '').toLowerCase();
      return disponible && (!limpieza || limpieza === 'limpia') && (!mantenimiento || mantenimiento === 'ok');
    }).length;

    return {
      ...stats,
      habitaciones_disponibles: disponiblesReales,
      disponibles: disponiblesReales,
    };
  };
}

export {};
