-- =====================================================================
-- AISLAMIENTO MULTI-TENANT POR hotel_id
-- =====================================================================

-- Helper: hotel_id del usuario actual (security definer evita recursión RLS)
CREATE OR REPLACE FUNCTION public.current_hotel_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT hotel_id FROM public.profiles WHERE id = auth.uid()
$$;

-- Helper: verifica si el usuario actual es SuperAdmin
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'SuperAdmin')
$$;

-- =====================================================================
-- Función para regenerar políticas estándar de tabla con hotel_id
-- =====================================================================
DO $$
DECLARE
  t text;
  tablas text[] := ARRAY[
    'cargos','categorias_producto','checklist_items','clientes','compras',
    'conceptos_cargo','entregables','gastos','habitaciones','metodos_pago',
    'pagos','productos','proveedores','reservas','tareas_limpieza',
    'tareas_mantenimiento','tipos_habitacion','transacciones','ventas',
    'whatsapp_envios','whatsapp_templates','suscripciones'
  ];
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    -- Eliminar políticas permisivas existentes
    EXECUTE format('DROP POLICY IF EXISTS "Auth select %I" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Auth insert %I" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Auth update %I" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Auth delete %I" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Auth all %I" ON public.%I', t, t);

    -- SELECT: solo del propio hotel o SuperAdmin
    EXECUTE format($q$
      CREATE POLICY "tenant select %1$s" ON public.%1$I
      FOR SELECT TO authenticated
      USING (hotel_id = public.current_hotel_id() OR public.is_superadmin())
    $q$, t);

    -- INSERT: solo en el propio hotel o SuperAdmin
    EXECUTE format($q$
      CREATE POLICY "tenant insert %1$s" ON public.%1$I
      FOR INSERT TO authenticated
      WITH CHECK (hotel_id = public.current_hotel_id() OR public.is_superadmin())
    $q$, t);

    -- UPDATE: idem
    EXECUTE format($q$
      CREATE POLICY "tenant update %1$s" ON public.%1$I
      FOR UPDATE TO authenticated
      USING (hotel_id = public.current_hotel_id() OR public.is_superadmin())
      WITH CHECK (hotel_id = public.current_hotel_id() OR public.is_superadmin())
    $q$, t);

    -- DELETE: idem
    EXECUTE format($q$
      CREATE POLICY "tenant delete %1$s" ON public.%1$I
      FOR DELETE TO authenticated
      USING (hotel_id = public.current_hotel_id() OR public.is_superadmin())
    $q$, t);
  END LOOP;
END $$;

-- =====================================================================
-- HOTELS: el usuario sólo ve su propio hotel; SuperAdmin ve todos
-- =====================================================================
DROP POLICY IF EXISTS "Authenticated users can view hotels" ON public.hotels;
CREATE POLICY "Tenant view hotel" ON public.hotels
  FOR SELECT TO authenticated
  USING (id = public.current_hotel_id() OR public.is_superadmin());

DROP POLICY IF EXISTS "Admins can update hotels" ON public.hotels;
CREATE POLICY "Tenant update hotel" ON public.hotels
  FOR UPDATE TO authenticated
  USING (id = public.current_hotel_id() OR public.is_superadmin())
  WITH CHECK (id = public.current_hotel_id() OR public.is_superadmin());

-- =====================================================================
-- PROFILES: ver sólo perfiles del mismo hotel; SuperAdmin ve todos
-- =====================================================================
DROP POLICY IF EXISTS "Users can view profiles" ON public.profiles;
CREATE POLICY "Tenant view profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR hotel_id = public.current_hotel_id()
    OR public.is_superadmin()
  );

-- =====================================================================
-- TABLAS DETALLE: aislar vía parent
-- =====================================================================
DROP POLICY IF EXISTS "Auth select compras_detalle" ON public.compras_detalle;
DROP POLICY IF EXISTS "Auth insert compras_detalle" ON public.compras_detalle;
DROP POLICY IF EXISTS "Auth update compras_detalle" ON public.compras_detalle;
DROP POLICY IF EXISTS "Auth delete compras_detalle" ON public.compras_detalle;
CREATE POLICY "tenant compras_detalle" ON public.compras_detalle
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.compras c WHERE c.id = compras_detalle.compra_id AND (c.hotel_id = public.current_hotel_id() OR public.is_superadmin())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.compras c WHERE c.id = compras_detalle.compra_id AND (c.hotel_id = public.current_hotel_id() OR public.is_superadmin())));

DROP POLICY IF EXISTS "Auth select ventas_detalle" ON public.ventas_detalle;
DROP POLICY IF EXISTS "Auth insert ventas_detalle" ON public.ventas_detalle;
DROP POLICY IF EXISTS "Auth update ventas_detalle" ON public.ventas_detalle;
DROP POLICY IF EXISTS "Auth delete ventas_detalle" ON public.ventas_detalle;
CREATE POLICY "tenant ventas_detalle" ON public.ventas_detalle
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ventas v WHERE v.id = ventas_detalle.venta_id AND (v.hotel_id = public.current_hotel_id() OR public.is_superadmin())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.ventas v WHERE v.id = ventas_detalle.venta_id AND (v.hotel_id = public.current_hotel_id() OR public.is_superadmin())));

DROP POLICY IF EXISTS "Auth select entregables_reserva" ON public.entregables_reserva;
DROP POLICY IF EXISTS "Auth insert entregables_reserva" ON public.entregables_reserva;
DROP POLICY IF EXISTS "Auth update entregables_reserva" ON public.entregables_reserva;
DROP POLICY IF EXISTS "Auth delete entregables_reserva" ON public.entregables_reserva;
CREATE POLICY "tenant entregables_reserva" ON public.entregables_reserva
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.reservas r WHERE r.id = entregables_reserva.reserva_id AND (r.hotel_id = public.current_hotel_id() OR public.is_superadmin())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.reservas r WHERE r.id = entregables_reserva.reserva_id AND (r.hotel_id = public.current_hotel_id() OR public.is_superadmin())));

DROP POLICY IF EXISTS "Auth select movimientos_inventario" ON public.movimientos_inventario;
DROP POLICY IF EXISTS "Auth insert movimientos_inventario" ON public.movimientos_inventario;
DROP POLICY IF EXISTS "Auth update movimientos_inventario" ON public.movimientos_inventario;
DROP POLICY IF EXISTS "Auth delete movimientos_inventario" ON public.movimientos_inventario;
CREATE POLICY "tenant movimientos_inventario" ON public.movimientos_inventario
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.productos p WHERE p.id = movimientos_inventario.producto_id AND (p.hotel_id = public.current_hotel_id() OR public.is_superadmin())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.productos p WHERE p.id = movimientos_inventario.producto_id AND (p.hotel_id = public.current_hotel_id() OR public.is_superadmin())));
