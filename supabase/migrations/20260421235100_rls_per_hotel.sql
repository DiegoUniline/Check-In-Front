-- Aislamiento de datos por hotel mediante RLS estricto.
CREATE OR REPLACE FUNCTION public.current_user_hotel_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT hotel_id FROM public.profiles WHERE id = auth.uid()
$$;

DO $$
DECLARE
  t text;
  tablas text[] := ARRAY[
    'habitaciones','tipos_habitacion','clientes','reservas',
    'pagos','cargos','conceptos_cargo','categorias_producto',
    'productos','entregables','proveedores','compras',
    'gastos','ventas','tareas_limpieza','tareas_mantenimiento',
    'transacciones'
  ];
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Auth select %1$s" ON public.%1$I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Auth insert %1$s" ON public.%1$I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Auth update %1$s" ON public.%1$I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Auth delete %1$s" ON public.%1$I', t);

    EXECUTE format('CREATE POLICY "Hotel select %1$s" ON public.%1$I FOR SELECT TO authenticated USING (hotel_id = public.current_user_hotel_id())', t);
    EXECUTE format('CREATE POLICY "Hotel insert %1$s" ON public.%1$I FOR INSERT TO authenticated WITH CHECK (hotel_id = public.current_user_hotel_id())', t);
    EXECUTE format('CREATE POLICY "Hotel update %1$s" ON public.%1$I FOR UPDATE TO authenticated USING (hotel_id = public.current_user_hotel_id()) WITH CHECK (hotel_id = public.current_user_hotel_id())', t);
    EXECUTE format('CREATE POLICY "Hotel delete %1$s" ON public.%1$I FOR DELETE TO authenticated USING (hotel_id = public.current_user_hotel_id())', t);
  END LOOP;
END $$;

-- compras_detalle
DROP POLICY IF EXISTS "Auth select compras_detalle" ON public.compras_detalle;
DROP POLICY IF EXISTS "Auth insert compras_detalle" ON public.compras_detalle;
DROP POLICY IF EXISTS "Auth update compras_detalle" ON public.compras_detalle;
DROP POLICY IF EXISTS "Auth delete compras_detalle" ON public.compras_detalle;
CREATE POLICY "Hotel select compras_detalle" ON public.compras_detalle FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.compras c WHERE c.id = compras_detalle.compra_id AND c.hotel_id = public.current_user_hotel_id()));
CREATE POLICY "Hotel insert compras_detalle" ON public.compras_detalle FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.compras c WHERE c.id = compras_detalle.compra_id AND c.hotel_id = public.current_user_hotel_id()));
CREATE POLICY "Hotel update compras_detalle" ON public.compras_detalle FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.compras c WHERE c.id = compras_detalle.compra_id AND c.hotel_id = public.current_user_hotel_id()));
CREATE POLICY "Hotel delete compras_detalle" ON public.compras_detalle FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.compras c WHERE c.id = compras_detalle.compra_id AND c.hotel_id = public.current_user_hotel_id()));

-- ventas_detalle
DROP POLICY IF EXISTS "Auth select ventas_detalle" ON public.ventas_detalle;
DROP POLICY IF EXISTS "Auth insert ventas_detalle" ON public.ventas_detalle;
DROP POLICY IF EXISTS "Auth update ventas_detalle" ON public.ventas_detalle;
DROP POLICY IF EXISTS "Auth delete ventas_detalle" ON public.ventas_detalle;
CREATE POLICY "Hotel select ventas_detalle" ON public.ventas_detalle FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ventas v WHERE v.id = ventas_detalle.venta_id AND v.hotel_id = public.current_user_hotel_id()));
CREATE POLICY "Hotel insert ventas_detalle" ON public.ventas_detalle FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.ventas v WHERE v.id = ventas_detalle.venta_id AND v.hotel_id = public.current_user_hotel_id()));
CREATE POLICY "Hotel update ventas_detalle" ON public.ventas_detalle FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ventas v WHERE v.id = ventas_detalle.venta_id AND v.hotel_id = public.current_user_hotel_id()));
CREATE POLICY "Hotel delete ventas_detalle" ON public.ventas_detalle FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ventas v WHERE v.id = ventas_detalle.venta_id AND v.hotel_id = public.current_user_hotel_id()));

-- entregables_reserva
DROP POLICY IF EXISTS "Auth select entregables_reserva" ON public.entregables_reserva;
DROP POLICY IF EXISTS "Auth insert entregables_reserva" ON public.entregables_reserva;
DROP POLICY IF EXISTS "Auth update entregables_reserva" ON public.entregables_reserva;
DROP POLICY IF EXISTS "Auth delete entregables_reserva" ON public.entregables_reserva;
CREATE POLICY "Hotel select entregables_reserva" ON public.entregables_reserva FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.reservas r WHERE r.id = entregables_reserva.reserva_id AND r.hotel_id = public.current_user_hotel_id()));
CREATE POLICY "Hotel insert entregables_reserva" ON public.entregables_reserva FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.reservas r WHERE r.id = entregables_reserva.reserva_id AND r.hotel_id = public.current_user_hotel_id()));
CREATE POLICY "Hotel update entregables_reserva" ON public.entregables_reserva FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.reservas r WHERE r.id = entregables_reserva.reserva_id AND r.hotel_id = public.current_user_hotel_id()));
CREATE POLICY "Hotel delete entregables_reserva" ON public.entregables_reserva FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.reservas r WHERE r.id = entregables_reserva.reserva_id AND r.hotel_id = public.current_user_hotel_id()));

-- movimientos_inventario
DROP POLICY IF EXISTS "Auth select movimientos_inventario" ON public.movimientos_inventario;
DROP POLICY IF EXISTS "Auth insert movimientos_inventario" ON public.movimientos_inventario;
DROP POLICY IF EXISTS "Auth update movimientos_inventario" ON public.movimientos_inventario;
DROP POLICY IF EXISTS "Auth delete movimientos_inventario" ON public.movimientos_inventario;
CREATE POLICY "Hotel select movimientos_inventario" ON public.movimientos_inventario FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.productos p WHERE p.id = movimientos_inventario.producto_id AND p.hotel_id = public.current_user_hotel_id()));
CREATE POLICY "Hotel insert movimientos_inventario" ON public.movimientos_inventario FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.productos p WHERE p.id = movimientos_inventario.producto_id AND p.hotel_id = public.current_user_hotel_id()));
CREATE POLICY "Hotel update movimientos_inventario" ON public.movimientos_inventario FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.productos p WHERE p.id = movimientos_inventario.producto_id AND p.hotel_id = public.current_user_hotel_id()));
CREATE POLICY "Hotel delete movimientos_inventario" ON public.movimientos_inventario FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.productos p WHERE p.id = movimientos_inventario.producto_id AND p.hotel_id = public.current_user_hotel_id()));

-- hotels: cada usuario solo ve su propio hotel
DROP POLICY IF EXISTS "Authenticated users can view hotels" ON public.hotels;
CREATE POLICY "Users view own hotel" ON public.hotels FOR SELECT TO authenticated
  USING (id = public.current_user_hotel_id());
