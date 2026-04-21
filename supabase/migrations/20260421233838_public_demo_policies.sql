-- Permitir acceso público (anon + authenticated) en modo demo
-- Aplicado a todas las tablas operativas del sistema

DO $$
DECLARE
  t text;
  tablas text[] := ARRAY[
    'cargos','categorias_producto','clientes','compras','compras_detalle',
    'conceptos_cargo','entregables','entregables_reserva','gastos','habitaciones',
    'movimientos_inventario','pagos','productos','proveedores','reservas',
    'tareas_limpieza','tareas_mantenimiento','tipos_habitacion','transacciones',
    'ventas','ventas_detalle'
  ];
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    -- Drop policies viejas (Auth ...)
    EXECUTE format('DROP POLICY IF EXISTS "Auth select %I" ON public.%I;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Auth insert %I" ON public.%I;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Auth update %I" ON public.%I;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Auth delete %I" ON public.%I;', t, t);
    -- Drop nuevas si existen (idempotente)
    EXECUTE format('DROP POLICY IF EXISTS "Public select %I" ON public.%I;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Public insert %I" ON public.%I;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Public update %I" ON public.%I;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Public delete %I" ON public.%I;', t, t);

    -- Crear nuevas para anon + authenticated (demo público)
    EXECUTE format('CREATE POLICY "Public select %I" ON public.%I FOR SELECT TO anon, authenticated USING (true);', t, t);
    EXECUTE format('CREATE POLICY "Public insert %I" ON public.%I FOR INSERT TO anon, authenticated WITH CHECK (true);', t, t);
    EXECUTE format('CREATE POLICY "Public update %I" ON public.%I FOR UPDATE TO anon, authenticated USING (true);', t, t);
    EXECUTE format('CREATE POLICY "Public delete %I" ON public.%I FOR DELETE TO anon, authenticated USING (true);', t, t);
  END LOOP;
END $$;
