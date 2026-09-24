import api from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';

/**
 * Capa de seguridad para Compras.
 *
 * Reglas definitivas:
 * 1) crear una orden NO modifica inventario;
 * 2) pagar una orden NO modifica su estado logístico ni inventario;
 * 3) marcar una orden como Recibida ingresa stock una sola vez;
 * 4) órdenes históricas que ya generaron stock no se duplican.
 */
const PATCH_KEY = '__hospedapp_compras_safety_patch_v1__';
const root = globalThis as any;

if (!root[PATCH_KEY]) {
  root[PATCH_KEY] = true;

  const client = api as any;
  const db = supabase as any;
  const originalUpdateEstadoCompra = client.updateEstadoCompra.bind(client);

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

    // El folio OC-###### lo asigna la base (único por hotel).
    const numeroOrden = header.numero_orden || null;

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
      await db.from('compras').delete().eq('id', compra.id).eq('hotel_id', hotelId);
      throw error;
    }

    return compra;
  };

  // Recepción en una sola transacción: bloquea la orden, suma stock una sola
  // vez y registra movimientos.
  const recibirCompra = async (id: string) => {
    const { data, error } = await db.rpc('vulo_receive_purchase', { p_compra_id: id });
    if (error) throw error;
    return data;
  };

  client.updateEstadoCompra = async (id: string, estado: string) => {
    if (estado !== 'Recibida') return originalUpdateEstadoCompra(id, estado);
    return recibirCompra(id);
  };

  client.deleteCompra = async (id: string) => {
    const { data, error } = await db.rpc('vulo_delete_purchase', { p_compra_id: id });
    if (error) throw error;
    return data || { ok: true };
  };
}

export {};
