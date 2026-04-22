-- ============================================================================
-- FIX: Aislamiento estricto de datos por hotel + signup automático
-- ============================================================================

-- 1. HELPER: hotel_id del usuario actual
CREATE OR REPLACE FUNCTION public.current_user_hotel_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT hotel_id FROM public.profiles WHERE id = auth.uid() LIMIT 1
$$;

-- 2. TRIGGER: crear hotel + profile + rol Admin al registrarse un usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hotel_id uuid;
  v_email text;
  v_nombre text;
BEGIN
  v_email := COALESCE(NEW.email, '');
  IF v_email = 'admin@hotel.com' THEN
    RETURN NEW;
  END IF;

  v_nombre := COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(v_email, '@', 1));

  INSERT INTO public.hotels (nombre, email)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'hotel_nombre', v_nombre || '''s Hotel'),
    v_email
  )
  RETURNING id INTO v_hotel_id;

  INSERT INTO public.profiles (id, hotel_id, nombre, apellido_paterno, email)
  VALUES (
    NEW.id,
    v_hotel_id,
    v_nombre,
    NEW.raw_user_meta_data->>'apellido_paterno',
    v_email
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'Admin'::app_role);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. BACKFILL: usuarios existentes sin hotel/profile
DO $$
DECLARE
  u RECORD;
  v_hotel_id uuid;
  v_email text;
  v_nombre text;
BEGIN
  FOR u IN
    SELECT au.id, au.email, au.raw_user_meta_data
    FROM auth.users au
    LEFT JOIN public.profiles p ON p.id = au.id
    WHERE p.id IS NULL
      AND COALESCE(au.email, '') <> 'admin@hotel.com'
  LOOP
    v_email := COALESCE(u.email, '');
    v_nombre := COALESCE(u.raw_user_meta_data->>'nombre', split_part(v_email, '@', 1));

    INSERT INTO public.hotels (nombre, email)
    VALUES (
      COALESCE(u.raw_user_meta_data->>'hotel_nombre', v_nombre || '''s Hotel'),
      v_email
    )
    RETURNING id INTO v_hotel_id;

    INSERT INTO public.profiles (id, hotel_id, nombre, apellido_paterno, email)
    VALUES (u.id, v_hotel_id, v_nombre, u.raw_user_meta_data->>'apellido_paterno', v_email);

    INSERT INTO public.user_roles (user_id, role)
    VALUES (u.id, 'Admin'::app_role)
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- 4. RLS estricto en tablas con hotel_id directo
DO $$
DECLARE
  t text;
  tables_direct text[] := ARRAY[
    'habitaciones','tipos_habitacion','clientes','reservas','pagos','cargos',
    'productos','categorias_producto','proveedores','compras','gastos','ventas',
    'tareas_limpieza','tareas_mantenimiento','entregables','conceptos_cargo','transacciones'
  ];
BEGIN
  FOREACH t IN ARRAY tables_direct LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Auth select %s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Auth insert %s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Auth update %s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Auth delete %s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "hotel_select_%s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "hotel_insert_%s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "hotel_update_%s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "hotel_delete_%s" ON public.%I', t, t);

    EXECUTE format('CREATE POLICY "hotel_select_%s" ON public.%I FOR SELECT TO authenticated USING (hotel_id = public.current_user_hotel_id())', t, t);
    EXECUTE format('CREATE POLICY "hotel_insert_%s" ON public.%I FOR INSERT TO authenticated WITH CHECK (hotel_id = public.current_user_hotel_id())', t, t);
    EXECUTE format('CREATE POLICY "hotel_update_%s" ON public.%I FOR UPDATE TO authenticated USING (hotel_id = public.current_user_hotel_id()) WITH CHECK (hotel_id = public.current_user_hotel_id())', t, t);
    EXECUTE format('CREATE POLICY "hotel_delete_%s" ON public.%I FOR DELETE TO authenticated USING (hotel_id = public.current_user_hotel_id())', t, t);
  END LOOP;
END $$;

-- 5. RLS para tablas hijas (vía padre)

-- compras_detalle
DROP POLICY IF EXISTS "Auth select compras_detalle" ON public.compras_detalle;
DROP POLICY IF EXISTS "Auth insert compras_detalle" ON public.compras_detalle;
DROP POLICY IF EXISTS "Auth update compras_detalle" ON public.compras_detalle;
DROP POLICY IF EXISTS "Auth delete compras_detalle" ON public.compras_detalle;
CREATE POLICY "hotel_select_compras_detalle" ON public.compras_detalle FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.compras c WHERE c.id = compras_detalle.compra_id AND c.hotel_id = public.current_user_hotel_id()));
CREATE POLICY "hotel_insert_compras_detalle" ON public.compras_detalle FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.compras c WHERE c.id = compras_detalle.compra_id AND c.hotel_id = public.current_user_hotel_id()));
CREATE POLICY "hotel_update_compras_detalle" ON public.compras_detalle FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.compras c WHERE c.id = compras_detalle.compra_id AND c.hotel_id = public.current_user_hotel_id()));
CREATE POLICY "hotel_delete_compras_detalle" ON public.compras_detalle FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.compras c WHERE c.id = compras_detalle.compra_id AND c.hotel_id = public.current_user_hotel_id()));

-- ventas_detalle
DROP POLICY IF EXISTS "Auth select ventas_detalle" ON public.ventas_detalle;
DROP POLICY IF EXISTS "Auth insert ventas_detalle" ON public.ventas_detalle;
DROP POLICY IF EXISTS "Auth update ventas_detalle" ON public.ventas_detalle;
DROP POLICY IF EXISTS "Auth delete ventas_detalle" ON public.ventas_detalle;
CREATE POLICY "hotel_select_ventas_detalle" ON public.ventas_detalle FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ventas v WHERE v.id = ventas_detalle.venta_id AND v.hotel_id = public.current_user_hotel_id()));
CREATE POLICY "hotel_insert_ventas_detalle" ON public.ventas_detalle FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.ventas v WHERE v.id = ventas_detalle.venta_id AND v.hotel_id = public.current_user_hotel_id()));
CREATE POLICY "hotel_update_ventas_detalle" ON public.ventas_detalle FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ventas v WHERE v.id = ventas_detalle.venta_id AND v.hotel_id = public.current_user_hotel_id()));
CREATE POLICY "hotel_delete_ventas_detalle" ON public.ventas_detalle FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ventas v WHERE v.id = ventas_detalle.venta_id AND v.hotel_id = public.current_user_hotel_id()));

-- entregables_reserva
DROP POLICY IF EXISTS "Auth select entregables_reserva" ON public.entregables_reserva;
DROP POLICY IF EXISTS "Auth insert entregables_reserva" ON public.entregables_reserva;
DROP POLICY IF EXISTS "Auth update entregables_reserva" ON public.entregables_reserva;
DROP POLICY IF EXISTS "Auth delete entregables_reserva" ON public.entregables_reserva;
CREATE POLICY "hotel_select_entregables_reserva" ON public.entregables_reserva FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.reservas r WHERE r.id = entregables_reserva.reserva_id AND r.hotel_id = public.current_user_hotel_id()));
CREATE POLICY "hotel_insert_entregables_reserva" ON public.entregables_reserva FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.reservas r WHERE r.id = entregables_reserva.reserva_id AND r.hotel_id = public.current_user_hotel_id()));
CREATE POLICY "hotel_update_entregables_reserva" ON public.entregables_reserva FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.reservas r WHERE r.id = entregables_reserva.reserva_id AND r.hotel_id = public.current_user_hotel_id()));
CREATE POLICY "hotel_delete_entregables_reserva" ON public.entregables_reserva FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.reservas r WHERE r.id = entregables_reserva.reserva_id AND r.hotel_id = public.current_user_hotel_id()));

-- movimientos_inventario
DROP POLICY IF EXISTS "Auth select movimientos_inventario" ON public.movimientos_inventario;
DROP POLICY IF EXISTS "Auth insert movimientos_inventario" ON public.movimientos_inventario;
DROP POLICY IF EXISTS "Auth update movimientos_inventario" ON public.movimientos_inventario;
DROP POLICY IF EXISTS "Auth delete movimientos_inventario" ON public.movimientos_inventario;
CREATE POLICY "hotel_select_movimientos_inventario" ON public.movimientos_inventario FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.productos p WHERE p.id = movimientos_inventario.producto_id AND p.hotel_id = public.current_user_hotel_id()));
CREATE POLICY "hotel_insert_movimientos_inventario" ON public.movimientos_inventario FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.productos p WHERE p.id = movimientos_inventario.producto_id AND p.hotel_id = public.current_user_hotel_id()));
CREATE POLICY "hotel_update_movimientos_inventario" ON public.movimientos_inventario FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.productos p WHERE p.id = movimientos_inventario.producto_id AND p.hotel_id = public.current_user_hotel_id()));
CREATE POLICY "hotel_delete_movimientos_inventario" ON public.movimientos_inventario FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.productos p WHERE p.id = movimientos_inventario.producto_id AND p.hotel_id = public.current_user_hotel_id()));

-- 6. Restringir hotels: SELECT solo del hotel propio
DROP POLICY IF EXISTS "Authenticated users can view hotels" ON public.hotels;
CREATE POLICY "Users can view own hotel" ON public.hotels FOR SELECT TO authenticated
  USING (id = public.current_user_hotel_id());
