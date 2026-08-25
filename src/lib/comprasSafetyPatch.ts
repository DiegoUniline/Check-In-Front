import api from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';

/**
 * Capa de seguridad para Compras.
 *
 * Corrige tres problemas del flujo legado sin romper órdenes históricas:
 * 1) una orden nueva NO debe aumentar stock hasta que sea recibida;
 * 2) pagar una orden NO equivale a recibir mercancía;
 * 3) una recepción debe impactar inventario una sola vez.
 *
 * Las órdenes antiguas que ya generaron movimientos con motivo "Compra" se
 * reconocen por su referencia/folio y no vuelven a incrementar existencias.
 */
const PATCH_KEY = '__hospedapp_compras_safety_patch_v1__';
const root = globalThis as any;

if (!root[PATCH_KEY]) {
  root[PATCH_KEY] = true;

  const client = api as any;
  const db = supabase as any;

  const originalUpdateEstadoCompra = client.updateEstadoCompra.bind(client);
  const originalDeleteCompra = client.deleteCompra.bind(client);
  const originalCreatePagoCompra = client.createPagoCompra.bind(client);

  // Cuando Compras registra un pago, la pantalla legado intenta marcar
  // inmediatamente la orden como Recibida si queda saldada. Marcamos ese
  // intento para ignorarlo una sola vez: pago y recepción son eventos distintos.
  const suppressAutoReceive = new Map<string, number>();

  client.createPagoCompra = async (data: any) => {
    const result = await originalCreatePagoCompra(data);
    if (data?.compra_id) {
      suppressAutoReceive.set(String(data.compra_id), Date.now() + 5000);
    }
    return result;
  };

  client.createCompra = async (data: any) => {
    const { detalles, detalle, ...header } = data || {};
    const items = (detalles ?? detalle) as any[] | undefined;
    const hotelId = client.getHotelId?.();
    if (!hotelId) throw new Error('Hotel no definido');

    let proveedorNombre = header.proveedor_nombre as string | undefined;
    if (!proveedorNombre && header.proveedor_id) {
      const { data: proveedor, error: proveedorError } = await db
        .from('proveedores')
        .select('nombre')
        .eq('id', header.proveedor_id)
        .eq('hotel_id', hotelId)
        .maybeSingle();
      if (proveedorError) throw proveedorError;
      proveedorNombre = proveedor?.nombre;
    }

    let numeroOrden = header.numero_orden as string | undefined;
    if (!numeroOrden) {
      const { data: ultimas, error: folioError } = await db
        .from('compras')
        .select('numero_orden')
        .eq('hotel_id', hotelId)
        .like('numero_orden', 'OC-%')
        .order('numero_orden', { ascending: false })
        .limit(1);
      if (folioError) throw folioError;
      const ultimo = ultimas?.[0]?.numero_orden as string | undefined;
      const ultimoNum = ultimo ? parseInt(ultimo.replace(/\D/g, ''), 10) || 0 : 0;
      numeroOrden = `OC-${String(ultimoNum + 1).padStart(6, '0')}`;
    }

    const { data: compra, error: compraError } = await db
      .from('compras')
      .insert({ ...header, proveedor_nombre: proveedorNombre, numero_orden: numeroOrden, hotel_id: hotelId })
      .select()
      .single();
    if (compraError) throw compraError;

    try {
      if (Array.isArray(items) && items.length) {
        const idsSinNombre = items
          .filter((item: any) => !item.producto_nombre && item.producto_id)
          .map((item: any) => item.producto_id);

        const nombres: Record<string, string> = {};
        if (idsSinNombre.length) {
          const { data: productos, error: productosError } = await db
            .from('productos')
            .select('id,nombre')
            .eq('hotel_id', hotelId)
            .in('id', [...new Set(idsSinNombre)]);
          if (productosError) throw productosError;
          (productos || []).forEach((p: any) => { nombres[p.id] = p.nombre; });
        }

        const rows = items.map((item: any) => ({
          compra_id: compra.id,
          producto_id: item.producto_id ?? null,
          producto_nombre: item.producto_nombre ?? (item.producto_id ? nombres[item.producto_id] : null) ?? null,
          cantidad: Number(item.cantidad) || 0,
          precio_unitario: Number(item.precio_unitario) || 0,
          total: (Number(item.cantidad) || 0) * (Number(item.precio_unitario) || 0),
        }));

        const { error: detalleError } = await db.from('compras_detalle').insert(rows);
        if (detalleError) throw detalleError;
      }
    } catch (error) {
      // La cabecera no debe quedar huérfana si falla el detalle.
      await db.from('compras').delete().eq('id', compra.id).eq('hotel_id', hotelId);
      throw error;
    }

    // Deliberadamente NO se modifica inventario aquí. El stock entra al recibir.
    return compra;
  };

  const recibirCompra = async (id: string) => {
    const hotelId = client.getHotelId?.();
    if (!hotelId) throw new Error('Hotel no definido');

    const { data: compra, error: compraError } = await db
      .from('compras')
      .select('*, compras_detalle(*)')
      .eq('id', id)
      .eq('hotel_id', hotelId)
      .maybeSingle();
    if (compraError) throw compraError;
    if (!compra) throw new Error('Orden de compra no encontrada');
    if (compra.estado === 'Recibida') return compra;

    const folio = compra.numero_orden || compra.numero || compra.codigo || null;

    // Compatibilidad histórica: antes el stock se incrementaba al CREAR la orden.
    // Si ya existe un movimiento con este folio, no lo repetimos.
    if (folio) {
      const { data: movimientosPrevios, error: movimientosError } = await db
        .from('movimientos_inventario')
        .select('id')
        .eq('referencia', folio)
        .eq('motivo', 'Compra')
        .limit(1);
      if (movimientosError) throw movimientosError;
      if (movimientosPrevios?.length) {
        return originalUpdateEstadoCompra(id, 'Recibida');
      }
    }

    const detalle = (compra.compras_detalle || compra.detalle || []) as any[];
    const cantidades = new Map<string, number>();
    detalle.forEach((item: any) => {
      if (!item.producto_id) return;
      const cantidad = Number(item.cantidad) || 0;
      if (cantidad <= 0) return;
      cantidades.set(item.producto_id, (cantidades.get(item.producto_id) || 0) + cantidad);
    });

    if (!cantidades.size) {
      return originalUpdateEstadoCompra(id, 'Recibida');
    }

    const ids = [...cantidades.keys()];
    const { data: productos, error: productosError } = await db
      .from('productos')
      .select('id,stock_actual')
      .eq('hotel_id', hotelId)
      .in('id', ids);
    if (productosError) throw productosError;

    const anteriores = new Map<string, number>();
    (productos || []).forEach((p: any) => anteriores.set(p.id, Number(p.stock_actual) || 0));
    const actualizados: string[] = [];

    try {
      for (const productoId of ids) {
        if (!anteriores.has(productoId)) {
          throw new Error(`No se encontró el producto ${productoId} para recibir la compra`);
        }
        const anterior = anteriores.get(productoId) || 0;
        const nuevo = anterior + (cantidades.get(productoId) || 0);
        const { error } = await db
          .from('productos')
          .update({ stock_actual: nuevo })
          .eq('id', productoId)
          .eq('hotel_id', hotelId);
        if (error) throw error;
        actualizados.push(productoId);
      }

      const movimientos = ids.map((productoId) => {
        const anterior = anteriores.get(productoId) || 0;
        const cantidad = cantidades.get(productoId) || 0;
        return {
          producto_id: productoId,
          tipo: 'Entrada',
          cantidad,
          stock_anterior: anterior,
          stock_nuevo: anterior + cantidad,
          motivo: 'Compra',
          referencia: folio,
        };
      });

      const { data: movimientosInsertados, error: movimientosError } = await db
        .from('movimientos_inventario')
        .insert(movimientos)
        .select('id');
      if (movimientosError) throw movimientosError;

      try {
        return await originalUpdateEstadoCompra(id, 'Recibida');
      } catch (error) {
        if (movimientosInsertados?.length) {
          await db.from('movimientos_inventario').delete().in('id', movimientosInsertados.map((m: any) => m.id));
        }
        throw error;
      }
    } catch (error) {
      // Compensación: si algo falla a mitad de la recepción, regresamos stocks.
      for (const productoId of actualizados.reverse()) {
        await db
          .from('productos')
          .update({ stock_actual: anteriores.get(productoId) || 0 })
          .eq('id', productoId)
          .eq('hotel_id', hotelId);
      }
      throw error;
    }
  };

  client.updateEstadoCompra = async (id: string, estado: string) => {
    if (estado !== 'Recibida') return originalUpdateEstadoCompra(id, estado);

    const expiry = suppressAutoReceive.get(String(id));
    if (expiry && expiry >= Date.now()) {
      suppressAutoReceive.delete(String(id));
      const { data } = await db.from('compras').select('*').eq('id', id).maybeSingle();
      return data;
    }
    suppressAutoReceive.delete(String(id));
    return recibirCompra(id);
  };

  client.deleteCompra = async (id: string) => {
    const hotelId = client.getHotelId?.();
    const { data: compra, error } = await db
      .from('compras')
      .select('id,estado,numero_orden')
      .eq('id', id)
      .eq('hotel_id', hotelId)
      .maybeSingle();
    if (error) throw error;
    if (!compra) return { ok: true };

    if (compra.estado === 'Recibida') {
      throw new Error('Una orden recibida ya afectó inventario y no debe eliminarse. Cancela mediante un ajuste documentado si necesitas corregirla.');
    }

    // Órdenes históricas no recibidas pudieron haber afectado stock por la lógica
    // anterior. Las detectamos y revertimos antes de permitir su eliminación.
    const folio = compra.numero_orden;
    if (folio) {
      const { data: movs, error: movError } = await db
        .from('movimientos_inventario')
        .select('id,producto_id,cantidad')
        .eq('referencia', folio)
        .eq('motivo', 'Compra');
      if (movError) throw movError;

      if (movs?.length) {
        const qty = new Map<string, number>();
        movs.forEach((m: any) => qty.set(m.producto_id, (qty.get(m.producto_id) || 0) + (Number(m.cantidad) || 0)));
        const ids = [...qty.keys()];
        const { data: prods, error: prodError } = await db
          .from('productos')
          .select('id,stock_actual')
          .eq('hotel_id', hotelId)
          .in('id', ids);
        if (prodError) throw prodError;

        for (const p of prods || []) {
          const actual = Number(p.stock_actual) || 0;
          const restar = qty.get(p.id) || 0;
          if (actual < restar) {
            throw new Error('No se puede eliminar esta orden porque parte del stock que generó ya fue consumido. Usa un ajuste de inventario para conservar trazabilidad.');
          }
        }

        for (const p of prods || []) {
          await db
            .from('productos')
            .update({ stock_actual: (Number(p.stock_actual) || 0) - (qty.get(p.id) || 0) })
            .eq('id', p.id)
            .eq('hotel_id', hotelId);
        }
        await db.from('movimientos_inventario').delete().in('id', movs.map((m: any) => m.id));
      }
    }

    return originalDeleteCompra(id);
  };
}

export {};
