-- =====================================================================
-- 1) Helper: hotel_id del usuario actual (SECURITY DEFINER)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.current_user_hotel_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT hotel_id FROM public.profiles WHERE id = auth.uid()
$$;

-- =====================================================================
-- 2) Trigger: al crear un auth.user, crea hotel + profile + rol Admin
-- =====================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hotel_id uuid;
  v_hotel_nombre text;
  v_nombre text;
  v_apellido text;
BEGIN
  v_hotel_nombre := COALESCE(NEW.raw_user_meta_data->>'hotel_nombre', 'Mi Hotel');
  v_nombre       := COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email, '@', 1));
  v_apellido     := COALESCE(NEW.raw_user_meta_data->>'apellido_paterno', '');

  INSERT INTO public.hotels (nombre, email)
  VALUES (v_hotel_nombre, NEW.email)
  RETURNING id INTO v_hotel_id;

  INSERT INTO public.profiles (id, hotel_id, nombre, apellido_paterno, email, activo)
  VALUES (NEW.id, v_hotel_id, v_nombre, v_apellido, NEW.email, true);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'Admin'::app_role)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================================
-- 3) RLS estricto por hotel_id en tablas operativas
-- =====================================================================
DO $outer$
DECLARE
  t text;
  tables_with_hotel text[] := ARRAY[
    'habitaciones','tipos_habitacion','reservas','clientes','pagos','cargos',
    'conceptos_cargo','productos','categorias_producto','compras','gastos',
    'proveedores','ventas','tareas_limpieza','tareas_mantenimiento',
    'entregables','transacciones'
  ];
  pol record;
BEGIN
  FOREACH t IN ARRAY tables_with_hotel LOOP
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
    END LOOP;
    EXECUTE format('CREATE POLICY "select_own_hotel" ON public.%I FOR SELECT TO authenticated USING (hotel_id = public.current_user_hotel_id())', t);
    EXECUTE format('CREATE POLICY "insert_own_hotel" ON public.%I FOR INSERT TO authenticated WITH CHECK (hotel_id = public.current_user_hotel_id())', t);
    EXECUTE format('CREATE POLICY "update_own_hotel" ON public.%I FOR UPDATE TO authenticated USING (hotel_id = public.current_user_hotel_id()) WITH CHECK (hotel_id = public.current_user_hotel_id())', t);
    EXECUTE format('CREATE POLICY "delete_own_hotel" ON public.%I FOR DELETE TO authenticated USING (hotel_id = public.current_user_hotel_id())', t);
  END LOOP;
END $outer$;

-- compras_detalle (parent: compras)
DROP POLICY IF EXISTS "Auth select compras_detalle" ON public.compras_detalle;
DROP POLICY IF EXISTS "Auth insert compras_detalle" ON public.compras_detalle;
DROP POLICY IF EXISTS "Auth update compras_detalle" ON public.compras_detalle;
DROP POLICY IF EXISTS "Auth delete compras_detalle" ON public.compras_detalle;
CREATE POLICY "select_via_compra" ON public.compras_detalle FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.compras c WHERE c.id = compras_detalle.compra_id AND c.hotel_id = public.current_user_hotel_id()));
CREATE POLICY "insert_via_compra" ON public.compras_detalle FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.compras c WHERE c.id = compras_detalle.compra_id AND c.hotel_id = public.current_user_hotel_id()));
CREATE POLICY "update_via_compra" ON public.compras_detalle FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.compras c WHERE c.id = compras_detalle.compra_id AND c.hotel_id = public.current_user_hotel_id()));
CREATE POLICY "delete_via_compra" ON public.compras_detalle FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.compras c WHERE c.id = compras_detalle.compra_id AND c.hotel_id = public.current_user_hotel_id()));

-- ventas_detalle (parent: ventas)
DROP POLICY IF EXISTS "Auth select ventas_detalle" ON public.ventas_detalle;
DROP POLICY IF EXISTS "Auth insert ventas_detalle" ON public.ventas_detalle;
DROP POLICY IF EXISTS "Auth update ventas_detalle" ON public.ventas_detalle;
DROP POLICY IF EXISTS "Auth delete ventas_detalle" ON public.ventas_detalle;
CREATE POLICY "select_via_venta" ON public.ventas_detalle FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ventas v WHERE v.id = ventas_detalle.venta_id AND v.hotel_id = public.current_user_hotel_id()));
CREATE POLICY "insert_via_venta" ON public.ventas_detalle FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.ventas v WHERE v.id = ventas_detalle.venta_id AND v.hotel_id = public.current_user_hotel_id()));
CREATE POLICY "update_via_venta" ON public.ventas_detalle FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ventas v WHERE v.id = ventas_detalle.venta_id AND v.hotel_id = public.current_user_hotel_id()));
CREATE POLICY "delete_via_venta" ON public.ventas_detalle FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ventas v WHERE v.id = ventas_detalle.venta_id AND v.hotel_id = public.current_user_hotel_id()));

-- entregables_reserva (parent: reservas)
DROP POLICY IF EXISTS "Auth select entregables_reserva" ON public.entregables_reserva;
DROP POLICY IF EXISTS "Auth insert entregables_reserva" ON public.entregables_reserva;
DROP POLICY IF EXISTS "Auth update entregables_reserva" ON public.entregables_reserva;
DROP POLICY IF EXISTS "Auth delete entregables_reserva" ON public.entregables_reserva;
CREATE POLICY "select_via_reserva" ON public.entregables_reserva FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.reservas r WHERE r.id = entregables_reserva.reserva_id AND r.hotel_id = public.current_user_hotel_id()));
CREATE POLICY "insert_via_reserva" ON public.entregables_reserva FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.reservas r WHERE r.id = entregables_reserva.reserva_id AND r.hotel_id = public.current_user_hotel_id()));
CREATE POLICY "update_via_reserva" ON public.entregables_reserva FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.reservas r WHERE r.id = entregables_reserva.reserva_id AND r.hotel_id = public.current_user_hotel_id()));
CREATE POLICY "delete_via_reserva" ON public.entregables_reserva FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.reservas r WHERE r.id = entregables_reserva.reserva_id AND r.hotel_id = public.current_user_hotel_id()));

-- movimientos_inventario (parent: productos)
DROP POLICY IF EXISTS "Auth select movimientos_inventario" ON public.movimientos_inventario;
DROP POLICY IF EXISTS "Auth insert movimientos_inventario" ON public.movimientos_inventario;
DROP POLICY IF EXISTS "Auth update movimientos_inventario" ON public.movimientos_inventario;
DROP POLICY IF EXISTS "Auth delete movimientos_inventario" ON public.movimientos_inventario;
CREATE POLICY "select_via_producto" ON public.movimientos_inventario FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.productos p WHERE p.id = movimientos_inventario.producto_id AND p.hotel_id = public.current_user_hotel_id()));
CREATE POLICY "insert_via_producto" ON public.movimientos_inventario FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.productos p WHERE p.id = movimientos_inventario.producto_id AND p.hotel_id = public.current_user_hotel_id()));
CREATE POLICY "update_via_producto" ON public.movimientos_inventario FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.productos p WHERE p.id = movimientos_inventario.producto_id AND p.hotel_id = public.current_user_hotel_id()));
CREATE POLICY "delete_via_producto" ON public.movimientos_inventario FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.productos p WHERE p.id = movimientos_inventario.producto_id AND p.hotel_id = public.current_user_hotel_id()));

-- =====================================================================
-- 4) hotels: cada usuario solo ve su hotel
-- =====================================================================
DROP POLICY IF EXISTS "Authenticated users can view hotels" ON public.hotels;
DROP POLICY IF EXISTS "Admins can update hotels" ON public.hotels;
DROP POLICY IF EXISTS "Admins can insert hotels" ON public.hotels;

CREATE POLICY "view_own_hotel" ON public.hotels FOR SELECT TO authenticated
  USING (id = public.current_user_hotel_id());
CREATE POLICY "update_own_hotel_row" ON public.hotels FOR UPDATE TO authenticated
  USING (id = public.current_user_hotel_id() AND public.has_role(auth.uid(), 'Admin'::app_role));

-- =====================================================================
-- 5) profiles: usuario solo ve su propio profile
-- =====================================================================
DROP POLICY IF EXISTS "Users can view profiles" ON public.profiles;
CREATE POLICY "view_own_profile" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

-- =====================================================================
-- 6) Backfill: para usuarios existentes sin profile/hotel, crearlos
-- =====================================================================
DO $bf$
DECLARE
  u record;
  v_hotel_id uuid;
BEGIN
  FOR u IN
    SELECT au.id, au.email, au.raw_user_meta_data
    FROM auth.users au
    LEFT JOIN public.profiles p ON p.id = au.id
    WHERE p.id IS NULL
  LOOP
    INSERT INTO public.hotels (nombre, email)
    VALUES (COALESCE(u.raw_user_meta_data->>'hotel_nombre', 'Mi Hotel'), u.email)
    RETURNING id INTO v_hotel_id;

    INSERT INTO public.profiles (id, hotel_id, nombre, apellido_paterno, email, activo)
    VALUES (
      u.id, v_hotel_id,
      COALESCE(u.raw_user_meta_data->>'nombre', split_part(u.email, '@', 1)),
      COALESCE(u.raw_user_meta_data->>'apellido_paterno', ''),
      u.email, true
    );

    INSERT INTO public.user_roles (user_id, role)
    VALUES (u.id, 'Admin'::app_role)
    ON CONFLICT DO NOTHING;
  END LOOP;
END $bf$;
