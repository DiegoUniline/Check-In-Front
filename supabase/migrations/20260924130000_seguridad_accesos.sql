-- Seguridad de accesos.
--  * Elimina las políticas "demo" abiertas (USING true) que seguían activas.
--  * El público (anon) sólo ve columnas seguras de hoteles y reservas.
--  * La reserva en línea se valida y se cotiza en el servidor.
--  * Usuarios creados por un administrador no reciben hotel ni rol Admin extra.
--  * Un usuario normal no puede cambiarse de hotel ni operar sobre otro.
--  * Sólo Admin edita los datos del hotel; sólo SuperAdmin suspende hoteles.

-- ---------------------------------------------------------------------------
-- 1. Políticas demo abiertas
-- ---------------------------------------------------------------------------
DO $b130000_1$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'cargos','categorias_producto','clientes','compras','compras_detalle',
    'conceptos_cargo','entregables','entregables_reserva','gastos','habitaciones',
    'movimientos_inventario','pagos','productos','proveedores','reservas',
    'tareas_limpieza','tareas_mantenimiento','tipos_habitacion','transacciones',
    'ventas','ventas_detalle'
  ] LOOP
    IF to_regclass('public.' || quote_ident(t)) IS NULL THEN CONTINUE; END IF;
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Public select ' || t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Public insert ' || t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Public update ' || t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Public delete ' || t, t);
  END LOOP;
END $b130000_1$;

-- ---------------------------------------------------------------------------
-- 2. Hotel del usuario: hotel_activo_id sólo cuenta para SuperAdmin
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.vulo_current_hotel_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $b130000_2$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text = 'SuperAdmin')
      THEN COALESCE(p.hotel_activo_id, p.hotel_id)
    ELSE p.hotel_id
  END
  FROM public.profiles p
  WHERE p.id = auth.uid()
$b130000_2$;

CREATE OR REPLACE FUNCTION public.vulo_guard_profile_hotel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $b130000_3$
BEGIN
  -- Procesos internos (service role / funciones del servidor) sí pueden.
  IF auth.uid() IS NULL OR public.vulo_is_superadmin() THEN RETURN NEW; END IF;
  IF NEW.hotel_id IS DISTINCT FROM OLD.hotel_id THEN
    RAISE EXCEPTION 'No puedes cambiar el hotel de un usuario';
  END IF;
  IF NEW.hotel_activo_id IS DISTINCT FROM OLD.hotel_activo_id
     AND NEW.hotel_activo_id IS NOT NULL
     AND NEW.hotel_activo_id IS DISTINCT FROM NEW.hotel_id THEN
    RAISE EXCEPTION 'No tienes acceso a ese hotel';
  END IF;
  RETURN NEW;
END;
$b130000_3$;

REVOKE ALL ON FUNCTION public.vulo_guard_profile_hotel() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_vulo_guard_profile_hotel ON public.profiles;
CREATE TRIGGER trg_vulo_guard_profile_hotel
BEFORE UPDATE OF hotel_id, hotel_activo_id ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.vulo_guard_profile_hotel();

-- ---------------------------------------------------------------------------
-- 3. Registro público vs. usuarios creados por un administrador
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $b130000_4$
DECLARE
  new_hotel_id uuid;
  v_hotel_nombre text;
  v_nombre text;
  v_apellido text;
BEGIN
  -- Los usuarios que crea un administrador (función create-user) ya tienen
  -- hotel y rol; no se les crea otro hotel ni se les da Admin.
  IF COALESCE(NEW.raw_app_meta_data->>'created_by_admin', 'false') = 'true' THEN
    RETURN NEW;
  END IF;

  v_hotel_nombre := COALESCE(NEW.raw_user_meta_data->>'hotel_nombre', 'Mi Hotel');
  v_nombre := COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email, '@', 1));
  v_apellido := COALESCE(NEW.raw_user_meta_data->>'apellido_paterno', '');

  INSERT INTO public.hotels (nombre, email)
  VALUES (v_hotel_nombre, NEW.email)
  RETURNING id INTO new_hotel_id;

  INSERT INTO public.profiles (id, nombre, apellido_paterno, email, hotel_id)
  VALUES (NEW.id, v_nombre, v_apellido, NEW.email, new_hotel_id);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'Admin')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$b130000_4$;

-- Corrige usuarios ya afectados: empleados que recibieron un rol Admin extra y
-- un hotel huérfano (creado con su correo y distinto de su hotel real).
DELETE FROM public.user_roles ur
USING public.profiles p
WHERE ur.user_id = p.id
  AND ur.role::text = 'Admin'
  AND EXISTS (
    SELECT 1 FROM public.user_roles other
    WHERE other.user_id = ur.user_id AND other.role::text NOT IN ('Admin', 'SuperAdmin')
  )
  AND EXISTS (
    SELECT 1 FROM public.hotels h
    WHERE lower(h.email) = lower(p.email) AND h.id IS DISTINCT FROM p.hotel_id
      AND NOT EXISTS (SELECT 1 FROM public.profiles p2 WHERE p2.hotel_id = h.id)
  );

-- ---------------------------------------------------------------------------
-- 4. Hoteles: el público sólo ve columnas seguras; sólo Admin edita;
--    sólo SuperAdmin suspende o reactiva.
-- ---------------------------------------------------------------------------
DO $b130000_5$
DECLARE
  v_cols text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ')
  INTO v_cols
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'hotels'
    AND column_name NOT IN ('whatsapp_token', 'rfc', 'razon_social', 'suspendido_motivo', 'suspendido_at');
  EXECUTE 'REVOKE SELECT ON public.hotels FROM anon';
  EXECUTE format('GRANT SELECT (%s) ON public.hotels TO anon', v_cols);
END $b130000_5$;

DROP POLICY IF EXISTS "Tenant update hotel" ON public.hotels;
CREATE POLICY "Tenant update hotel" ON public.hotels
  FOR UPDATE TO authenticated
  USING (
    public.is_superadmin()
    OR (id = public.current_hotel_id()
        AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text = 'Admin'))
  )
  WITH CHECK (
    public.is_superadmin()
    OR (id = public.current_hotel_id()
        AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text = 'Admin'))
  );

CREATE OR REPLACE FUNCTION public.vulo_guard_hotel_platform_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $b130000_6$
BEGIN
  IF auth.uid() IS NULL OR public.vulo_is_superadmin() THEN RETURN NEW; END IF;
  IF NEW.activo_plataforma IS DISTINCT FROM OLD.activo_plataforma
     OR NEW.suspendido_at IS DISTINCT FROM OLD.suspendido_at
     OR NEW.suspendido_motivo IS DISTINCT FROM OLD.suspendido_motivo THEN
    RAISE EXCEPTION 'Sólo la plataforma puede suspender o reactivar un hotel';
  END IF;
  RETURN NEW;
END;
$b130000_6$;

REVOKE ALL ON FUNCTION public.vulo_guard_hotel_platform_fields() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_vulo_guard_hotel_platform_fields ON public.hotels;
CREATE TRIGGER trg_vulo_guard_hotel_platform_fields
BEFORE UPDATE ON public.hotels
FOR EACH ROW EXECUTE FUNCTION public.vulo_guard_hotel_platform_fields();

-- ---------------------------------------------------------------------------
-- 5. Reservas públicas: el público sólo ve lo necesario para disponibilidad
-- ---------------------------------------------------------------------------
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.reservas FROM anon;
GRANT SELECT (id, hotel_id, habitacion_id, tipo_habitacion_id, fecha_checkin, fecha_checkout, estado)
  ON public.reservas TO anon;

DROP POLICY IF EXISTS "Public can view reservas for availability" ON public.reservas;
CREATE POLICY "Public can view reservas for availability"
  ON public.reservas FOR SELECT TO anon
  USING (
    EXISTS (SELECT 1 FROM public.hotels h WHERE h.id = reservas.hotel_id AND h.permite_reservas_online = true)
    AND estado IN ('Pendiente', 'Confirmada', 'CheckIn', 'Hospedado')
  );

-- Las altas públicas sólo entran por la función validada.
DROP POLICY IF EXISTS "Public can insert reservas" ON public.reservas;
DROP POLICY IF EXISTS "Public can insert clientes" ON public.clientes;
REVOKE INSERT, UPDATE, DELETE ON public.clientes FROM anon;

-- Tarifa nocturna con temporadas (misma regla que la aplicación:
-- habitación > tipo > todas; luego mayor prioridad).
CREATE OR REPLACE FUNCTION public.vulo_nightly_rate(
  p_hotel_id uuid,
  p_tipo_id uuid,
  p_habitacion_id uuid,
  p_fecha date
)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $b130000_7$
DECLARE
  v_base numeric;
  v_t record;
BEGIN
  SELECT COALESCE(precio_base, 0) INTO v_base FROM public.tipos_habitacion
  WHERE id = p_tipo_id AND hotel_id = p_hotel_id;
  v_base := COALESCE(v_base, 0);
  IF v_base = 0 OR to_regclass('public.temporadas') IS NULL THEN RETURN v_base; END IF;

  SELECT tipo_ajuste, valor INTO v_t FROM public.temporadas
  WHERE hotel_id = p_hotel_id AND activo IS NOT FALSE
    AND p_fecha BETWEEN fecha_inicio::date AND fecha_fin::date
    AND (alcance = 'todos'
      OR (alcance = 'tipo' AND tipo_habitacion_id = p_tipo_id)
      OR (alcance = 'habitacion' AND habitacion_id = p_habitacion_id))
  ORDER BY CASE alcance WHEN 'habitacion' THEN 3 WHEN 'tipo' THEN 2 ELSE 1 END DESC,
           COALESCE(prioridad, 0) DESC
  LIMIT 1;

  IF NOT FOUND THEN RETURN v_base; END IF;
  RETURN CASE v_t.tipo_ajuste
    WHEN 'porcentaje' THEN GREATEST(0, v_base + v_base * COALESCE(v_t.valor, 0) / 100)
    WHEN 'monto' THEN GREATEST(0, v_base + COALESCE(v_t.valor, 0))
    WHEN 'absoluto' THEN GREATEST(0, COALESCE(v_t.valor, 0))
    ELSE v_base
  END;
END;
$b130000_7$;

REVOKE ALL ON FUNCTION public.vulo_nightly_rate(uuid, uuid, uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vulo_nightly_rate(uuid, uuid, uuid, date) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_public_reservation(
  p_hotel_id uuid,
  p_cliente jsonb,
  p_reserva jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $b130000_8$
DECLARE
  v_cliente_id uuid;
  v_reserva public.reservas%ROWTYPE;
  v_today date;
  v_room public.habitaciones%ROWTYPE;
  v_tipo public.tipos_habitacion%ROWTYPE;
  v_checkin date := NULLIF(p_reserva->>'fecha_checkin', '')::date;
  v_checkout date := NULLIF(p_reserva->>'fecha_checkout', '')::date;
  v_adults integer := GREATEST(1, COALESCE(NULLIF(p_reserva->>'adultos', '')::integer, 1));
  v_children integer := GREATEST(0, COALESCE(NULLIF(p_reserva->>'ninos', '')::integer, 0));
  v_nights integer;
  v_total_rate numeric := 0;
  v_day date;
  v_extras integer;
BEGIN
  SELECT (now() AT TIME ZONE COALESCE(h.timezone, 'America/Mexico_City'))::date
  INTO v_today
  FROM public.hotels h
  WHERE h.id = p_hotel_id AND h.permite_reservas_online = true
    AND COALESCE(h.activo_plataforma, true);
  IF v_today IS NULL THEN RAISE EXCEPTION 'El hotel no acepta reservas en línea'; END IF;

  IF length(trim(COALESCE(p_cliente->>'nombre', ''))) = 0
     OR length(trim(COALESCE(p_cliente->>'email', ''))) = 0
     OR length(trim(COALESCE(p_cliente->>'telefono', ''))) = 0 THEN
    RAISE EXCEPTION 'Nombre, email y teléfono son obligatorios';
  END IF;
  IF length(p_cliente->>'nombre') > 200 OR length(p_cliente->>'email') > 200
     OR length(p_cliente->>'telefono') > 40 OR length(COALESCE(p_reserva->>'solicitudes_especiales', '')) > 2000 THEN
    RAISE EXCEPTION 'Los datos capturados son demasiado largos';
  END IF;
  IF v_checkin IS NULL OR v_checkout IS NULL OR v_checkin < v_today OR v_checkout <= v_checkin THEN
    RAISE EXCEPTION 'Las fechas de la reserva no son válidas';
  END IF;
  v_nights := v_checkout - v_checkin;
  IF v_nights > 60 THEN RAISE EXCEPTION 'Para estancias de más de 60 noches contacta al hotel'; END IF;

  SELECT * INTO v_room FROM public.habitaciones
  WHERE id = NULLIF(p_reserva->>'habitacion_id', '')::uuid AND hotel_id = p_hotel_id;
  IF NOT FOUND OR COALESCE(v_room.excluida_publica, false) THEN
    RAISE EXCEPTION 'La habitación no está disponible en línea';
  END IF;
  SELECT * INTO v_tipo FROM public.tipos_habitacion
  WHERE id = v_room.tipo_habitacion_id AND hotel_id = p_hotel_id AND COALESCE(publicar_web, false);
  IF NOT FOUND THEN RAISE EXCEPTION 'La habitación no está disponible en línea'; END IF;
  IF COALESCE(v_tipo.capacidad_maxima, 0) > 0 AND v_adults + v_children > v_tipo.capacidad_maxima THEN
    RAISE EXCEPTION 'La ocupación excede la capacidad de la habitación';
  END IF;

  IF NOT public.vulo_room_available_for_stay(p_hotel_id, v_room.id, NULL, v_checkin, v_checkout, false) THEN
    RAISE EXCEPTION 'La habitación ya no está disponible en esas fechas';
  END IF;

  -- Tarifa calculada en el servidor, noche por noche.
  v_day := v_checkin;
  WHILE v_day < v_checkout LOOP
    v_total_rate := v_total_rate + public.vulo_nightly_rate(p_hotel_id, v_tipo.id, v_room.id, v_day);
    v_day := v_day + 1;
  END LOOP;
  v_extras := GREATEST(0, v_adults + v_children - COALESCE(v_tipo.capacidad_adultos, v_adults + v_children));

  INSERT INTO public.clientes (hotel_id, nombre, apellido_paterno, email, telefono)
  VALUES (
    p_hotel_id,
    trim(p_cliente->>'nombre'),
    NULLIF(trim(p_cliente->>'apellido_paterno'), ''),
    trim(p_cliente->>'email'),
    trim(p_cliente->>'telefono')
  ) RETURNING id INTO v_cliente_id;

  INSERT INTO public.reservas (
    hotel_id, cliente_id, habitacion_id, tipo_habitacion_id,
    fecha_checkin, fecha_checkout, adultos, ninos, tarifa_noche,
    personas_extra, cargo_persona_extra, solicitudes_especiales,
    estado, origen
  ) VALUES (
    p_hotel_id, v_cliente_id, v_room.id, v_tipo.id,
    v_checkin, v_checkout, v_adults, v_children, round(v_total_rate / v_nights, 4),
    v_extras, COALESCE(v_tipo.precio_persona_extra, 0),
    NULLIF(left(p_reserva->>'solicitudes_especiales', 2000), ''),
    'Pendiente', 'Web'
  ) RETURNING * INTO v_reserva;

  PERFORM public.recalculate_reservation_financials(v_reserva.id);
  SELECT * INTO v_reserva FROM public.reservas WHERE id = v_reserva.id;

  RETURN jsonb_build_object(
    'id', v_reserva.id,
    'numero_reserva', v_reserva.numero_reserva,
    'fecha_checkin', v_reserva.fecha_checkin,
    'fecha_checkout', v_reserva.fecha_checkout,
    'noches', v_reserva.noches,
    'total', v_reserva.total,
    'estado', v_reserva.estado
  );
END;
$b130000_8$;

REVOKE ALL ON FUNCTION public.create_public_reservation(uuid, jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_public_reservation(uuid, jsonb, jsonb) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
