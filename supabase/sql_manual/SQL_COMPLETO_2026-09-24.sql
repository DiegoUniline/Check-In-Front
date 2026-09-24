-- SQL COMPLETO (3 partes en orden). Pegar entero en Supabase > SQL Editor > Run.
-- Tiene 2,200+ líneas. Si al pegar no ves al final la línea 'SQL COMPLETO APLICADO', se copió incompleto.
-- Se puede correr más de una vez.

-- ===================== 20260924090000_trazabilidad_fechas_checkin.sql =====================
-- Trazabilidad completa (quién y cuándo) + corrección de fechas y check-in.
--  * Reservas: quién la creó, confirmó, hizo check-in, check-out y canceló.
--  * Pagos y cargos: quién los registró, modificó o canceló, con fecha y hora.
--  * Disponibilidad: estancias del día y huéspedes con salida vencida.
--  * Check-in inmediato: llegada anticipada, habitación con estado desfasado.

-- ---------------------------------------------------------------------------
-- 1. Utilidades
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.vulo_user_name(p_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $b090000_1$
  SELECT COALESCE(
    NULLIF(trim(concat_ws(' ', p.nombre, p.apellido_paterno)), ''),
    p.email
  )
  FROM public.profiles p
  WHERE p.id = p_user_id
$b090000_1$;

CREATE OR REPLACE FUNCTION public.vulo_actor_name()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $b090000_2$
  SELECT CASE WHEN auth.uid() IS NULL THEN NULL
    ELSE COALESCE(public.vulo_user_name(auth.uid()), 'Usuario') END
$b090000_2$;

CREATE OR REPLACE FUNCTION public.vulo_hotel_today(p_hotel_id uuid)
RETURNS date
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $b090000_3$
  SELECT (now() AT TIME ZONE COALESCE(
    (SELECT h.timezone FROM public.hotels h WHERE h.id = p_hotel_id),
    'America/Mexico_City'
  ))::date
$b090000_3$;

REVOKE ALL ON FUNCTION public.vulo_user_name(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.vulo_actor_name() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.vulo_hotel_today(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vulo_user_name(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.vulo_actor_name() TO authenticated;
GRANT EXECUTE ON FUNCTION public.vulo_hotel_today(uuid) TO authenticated, anon;

-- ---------------------------------------------------------------------------
-- 2. Columnas de trazabilidad
-- ---------------------------------------------------------------------------
ALTER TABLE public.reservas
  ADD COLUMN IF NOT EXISTS creado_por uuid,
  ADD COLUMN IF NOT EXISTS creado_por_nombre text,
  ADD COLUMN IF NOT EXISTS actualizado_por uuid,
  ADD COLUMN IF NOT EXISTS actualizado_por_nombre text,
  ADD COLUMN IF NOT EXISTS confirmada_at timestamptz,
  ADD COLUMN IF NOT EXISTS confirmada_por uuid,
  ADD COLUMN IF NOT EXISTS confirmada_por_nombre text,
  ADD COLUMN IF NOT EXISTS checkin_at timestamptz,
  ADD COLUMN IF NOT EXISTS checkin_por uuid,
  ADD COLUMN IF NOT EXISTS checkin_por_nombre text,
  ADD COLUMN IF NOT EXISTS checkout_at timestamptz,
  ADD COLUMN IF NOT EXISTS checkout_por uuid,
  ADD COLUMN IF NOT EXISTS checkout_por_nombre text,
  ADD COLUMN IF NOT EXISTS cancelada_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelada_por uuid,
  ADD COLUMN IF NOT EXISTS cancelada_por_nombre text,
  ADD COLUMN IF NOT EXISTS motivo_cancelacion text;

ALTER TABLE public.pagos
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS created_by_nombre text,
  ADD COLUMN IF NOT EXISTS actualizado_por_nombre text,
  ADD COLUMN IF NOT EXISTS cancelado_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelado_por uuid,
  ADD COLUMN IF NOT EXISTS cancelado_por_nombre text;

ALTER TABLE public.cargos
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS created_by_nombre text,
  ADD COLUMN IF NOT EXISTS actualizado_por_nombre text,
  ADD COLUMN IF NOT EXISTS cancelado_por_nombre text;

CREATE INDEX IF NOT EXISTS reservas_creado_por_idx ON public.reservas(creado_por);
CREATE INDEX IF NOT EXISTS pagos_created_by_idx ON public.pagos(created_by);

-- ---------------------------------------------------------------------------
-- 3. Recuperación de históricos (desde auditoría y perfiles)
--    Se desactivan temporalmente los triggers de usuario para no generar
--    auditoría ni bloquear por días cerrados; el bloque es atómico.
-- ---------------------------------------------------------------------------
DO $b090000_4$
BEGIN
  ALTER TABLE public.reservas DISABLE TRIGGER USER;
  ALTER TABLE public.pagos DISABLE TRIGGER USER;
  ALTER TABLE public.cargos DISABLE TRIGGER USER;

  -- Quién creó la reserva
  UPDATE public.reservas r SET
    creado_por = a.user_id::uuid,
    creado_por_nombre = COALESCE(public.vulo_user_name(a.user_id::uuid), a.user_email)
  FROM (
    SELECT DISTINCT ON (entidad_id) entidad_id, user_id, user_email
    FROM public.auditoria
    WHERE lower(entidad) IN ('reserva','reservas')
      AND lower(accion) IN ('crear','create','insert','insert_reservas')
      AND entidad_id IS NOT NULL
    ORDER BY entidad_id, created_at
  ) a
  WHERE a.entidad_id::text = r.id::text AND r.creado_por IS NULL AND r.creado_por_nombre IS NULL;

  UPDATE public.reservas SET creado_por_nombre = 'Reserva en línea'
  WHERE creado_por_nombre IS NULL AND origen = 'Web';

  -- Check-in, check-out y cancelación desde el historial de cambios
  UPDATE public.reservas r SET
    checkin_at = a.created_at, checkin_por = a.user_id::uuid,
    checkin_por_nombre = COALESCE(public.vulo_user_name(a.user_id::uuid), a.user_email)
  FROM (
    SELECT DISTINCT ON (entidad_id) entidad_id, user_id, user_email, created_at
    FROM public.auditoria
    WHERE entidad = 'reserva' AND (datos_despues->>'checkin_realizado') IS NOT NULL
      AND COALESCE((datos_despues->>'checkin_realizado')::boolean, false)
      AND NOT COALESCE((datos_antes->>'checkin_realizado')::boolean, false)
    ORDER BY entidad_id, created_at DESC
  ) a
  WHERE a.entidad_id::text = r.id::text AND r.checkin_at IS NULL AND COALESCE(r.checkin_realizado, false);

  UPDATE public.reservas r SET
    checkout_at = a.created_at, checkout_por = a.user_id::uuid,
    checkout_por_nombre = COALESCE(public.vulo_user_name(a.user_id::uuid), a.user_email)
  FROM (
    SELECT DISTINCT ON (entidad_id) entidad_id, user_id, user_email, created_at
    FROM public.auditoria
    WHERE entidad = 'reserva' AND (datos_despues->>'checkout_realizado') IS NOT NULL
      AND COALESCE((datos_despues->>'checkout_realizado')::boolean, false)
      AND NOT COALESCE((datos_antes->>'checkout_realizado')::boolean, false)
    ORDER BY entidad_id, created_at DESC
  ) a
  WHERE a.entidad_id::text = r.id::text AND r.checkout_at IS NULL AND COALESCE(r.checkout_realizado, false);

  UPDATE public.reservas r SET
    cancelada_at = a.created_at, cancelada_por = a.user_id::uuid,
    cancelada_por_nombre = COALESCE(public.vulo_user_name(a.user_id::uuid), a.user_email)
  FROM (
    SELECT DISTINCT ON (entidad_id) entidad_id, user_id, user_email, created_at
    FROM public.auditoria
    WHERE entidad = 'reserva'
      AND datos_despues->>'estado' IN ('Cancelada','NoShow')
      AND COALESCE(datos_antes->>'estado','') NOT IN ('Cancelada','NoShow')
    ORDER BY entidad_id, created_at DESC
  ) a
  WHERE a.entidad_id::text = r.id::text AND r.cancelada_at IS NULL AND r.estado IN ('Cancelada','NoShow');

  UPDATE public.reservas r SET motivo_cancelacion = m.motivo
  FROM (
    SELECT DISTINCT ON (reserva_id) reserva_id, motivo
    FROM public.estancia_movimientos
    WHERE operacion IN ('cancel_reservation','no_show') AND NOT revertido
    ORDER BY reserva_id, created_at DESC
  ) m
  WHERE m.reserva_id = r.id AND r.motivo_cancelacion IS NULL AND r.estado IN ('Cancelada','NoShow');

  -- Pagos y cargos: autor desde created_by o desde la auditoría del INSERT
  UPDATE public.pagos p SET created_by = a.user_id::uuid
  FROM (
    SELECT DISTINCT ON (entidad_id) entidad_id, user_id
    FROM public.auditoria
    WHERE accion = 'INSERT_PAGOS' AND user_id IS NOT NULL
    ORDER BY entidad_id, created_at
  ) a
  WHERE a.entidad_id::text = p.id::text AND p.created_by IS NULL;

  UPDATE public.cargos c SET created_by = a.user_id::uuid
  FROM (
    SELECT DISTINCT ON (entidad_id) entidad_id, user_id
    FROM public.auditoria
    WHERE accion = 'INSERT_CARGOS' AND user_id IS NOT NULL
    ORDER BY entidad_id, created_at
  ) a
  WHERE a.entidad_id::text = c.id::text AND c.created_by IS NULL;

  UPDATE public.pagos SET created_by_nombre = public.vulo_user_name(created_by)
  WHERE created_by IS NOT NULL AND created_by_nombre IS NULL;
  UPDATE public.pagos SET actualizado_por_nombre = public.vulo_user_name(actualizado_por)
  WHERE actualizado_por IS NOT NULL AND actualizado_por_nombre IS NULL;
  UPDATE public.pagos SET
    cancelado_at = COALESCE(actualizado_at, created_at),
    cancelado_por = actualizado_por,
    cancelado_por_nombre = public.vulo_user_name(actualizado_por)
  WHERE estado = 'Cancelado' AND cancelado_at IS NULL;

  UPDATE public.cargos SET created_by_nombre = public.vulo_user_name(created_by)
  WHERE created_by IS NOT NULL AND created_by_nombre IS NULL;
  UPDATE public.cargos SET actualizado_por_nombre = public.vulo_user_name(actualizado_por)
  WHERE actualizado_por IS NOT NULL AND actualizado_por_nombre IS NULL;
  UPDATE public.cargos SET cancelado_por_nombre = public.vulo_user_name(cancelado_por)
  WHERE cancelado_por IS NOT NULL AND cancelado_por_nombre IS NULL;

  ALTER TABLE public.reservas ENABLE TRIGGER USER;
  ALTER TABLE public.pagos ENABLE TRIGGER USER;
  ALTER TABLE public.cargos ENABLE TRIGGER USER;
END $b090000_4$;

-- ---------------------------------------------------------------------------
-- 4. Sellado automático de autor/fecha (cubre cualquier pantalla o RPC)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.vulo_stamp_reservation_actor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $b090000_5$
DECLARE
  v_uid uuid := auth.uid();
  v_name text := public.vulo_actor_name();
  v_reason text := NULLIF(trim(COALESCE(current_setting('vulo.stay_reason', true), '')), '');
  v_old_estado text := CASE WHEN TG_OP = 'UPDATE' THEN OLD.estado ELSE NULL END;
  v_old_checkin boolean := CASE WHEN TG_OP = 'UPDATE' THEN COALESCE(OLD.checkin_realizado, false) ELSE false END;
  v_old_checkout boolean := CASE WHEN TG_OP = 'UPDATE' THEN COALESCE(OLD.checkout_realizado, false) ELSE false END;
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_at := COALESCE(NEW.created_at, now());
    NEW.creado_por := COALESCE(NEW.creado_por, v_uid);
    NEW.creado_por_nombre := COALESCE(
      NULLIF(NEW.creado_por_nombre, ''),
      public.vulo_user_name(NEW.creado_por),
      CASE WHEN NEW.origen = 'Web' THEN 'Reserva en línea' ELSE 'Sistema' END
    );
  ELSIF v_uid IS NOT NULL THEN
    NEW.actualizado_por := v_uid;
    NEW.actualizado_por_nombre := v_name;
  END IF;

  IF NEW.estado = 'Confirmada' AND v_old_estado IS DISTINCT FROM 'Confirmada' AND NEW.confirmada_at IS NULL THEN
    NEW.confirmada_at := now();
    NEW.confirmada_por := v_uid;
    NEW.confirmada_por_nombre := COALESCE(v_name, NEW.creado_por_nombre, 'Sistema');
  END IF;

  IF COALESCE(NEW.checkin_realizado, false) AND NOT v_old_checkin THEN
    NEW.checkin_at := now();
    NEW.checkin_por := v_uid;
    NEW.checkin_por_nombre := COALESCE(v_name, 'Sistema');
  ELSIF NOT COALESCE(NEW.checkin_realizado, false) AND v_old_checkin THEN
    NEW.checkin_at := NULL; NEW.checkin_por := NULL; NEW.checkin_por_nombre := NULL;
  END IF;

  IF COALESCE(NEW.checkout_realizado, false) AND NOT v_old_checkout THEN
    NEW.checkout_at := now();
    NEW.checkout_por := v_uid;
    NEW.checkout_por_nombre := COALESCE(v_name, 'Sistema');
  ELSIF NOT COALESCE(NEW.checkout_realizado, false) AND v_old_checkout THEN
    NEW.checkout_at := NULL; NEW.checkout_por := NULL; NEW.checkout_por_nombre := NULL;
  END IF;

  IF NEW.estado IN ('Cancelada', 'NoShow') AND v_old_estado IS DISTINCT FROM NEW.estado THEN
    NEW.cancelada_at := now();
    NEW.cancelada_por := v_uid;
    NEW.cancelada_por_nombre := COALESCE(v_name, 'Sistema');
    NEW.motivo_cancelacion := COALESCE(
      v_reason,
      NULLIF(trim(COALESCE(NEW.motivo_cancelacion, '')), '')
    );
  ELSIF TG_OP = 'UPDATE' AND v_old_estado IN ('Cancelada', 'NoShow')
        AND NEW.estado NOT IN ('Cancelada', 'NoShow') THEN
    NEW.cancelada_at := NULL; NEW.cancelada_por := NULL;
    NEW.cancelada_por_nombre := NULL; NEW.motivo_cancelacion := NULL;
  END IF;

  RETURN NEW;
END;
$b090000_5$;

DROP TRIGGER IF EXISTS trg_zz_vulo_stamp_reservation_actor ON public.reservas;
CREATE TRIGGER trg_zz_vulo_stamp_reservation_actor
BEFORE INSERT OR UPDATE ON public.reservas
FOR EACH ROW EXECUTE FUNCTION public.vulo_stamp_reservation_actor();

CREATE OR REPLACE FUNCTION public.vulo_stamp_payment_actor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $b090000_6$
DECLARE
  v_uid uuid := auth.uid();
  v_name text := public.vulo_actor_name();
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_at := COALESCE(NEW.created_at, now());
    NEW.created_by := COALESCE(NEW.created_by, v_uid);
    NEW.created_by_nombre := COALESCE(
      NULLIF(NEW.created_by_nombre, ''),
      public.vulo_user_name(NEW.created_by),
      'Sistema'
    );
    RETURN NEW;
  END IF;

  IF v_uid IS NOT NULL THEN
    NEW.actualizado_at := now();
    NEW.actualizado_por := v_uid;
    NEW.actualizado_por_nombre := v_name;
  END IF;

  IF COALESCE(NEW.estado, 'Activo') = 'Cancelado' AND COALESCE(OLD.estado, 'Activo') <> 'Cancelado' THEN
    NEW.cancelado_at := now();
    NEW.cancelado_por := v_uid;
    NEW.cancelado_por_nombre := COALESCE(v_name, 'Sistema');
  ELSIF COALESCE(NEW.estado, 'Activo') <> 'Cancelado' AND COALESCE(OLD.estado, 'Activo') = 'Cancelado' THEN
    NEW.cancelado_at := NULL; NEW.cancelado_por := NULL; NEW.cancelado_por_nombre := NULL;
  END IF;
  RETURN NEW;
END;
$b090000_6$;

DROP TRIGGER IF EXISTS trg_zz_vulo_stamp_payment_actor ON public.pagos;
CREATE TRIGGER trg_zz_vulo_stamp_payment_actor
BEFORE INSERT OR UPDATE ON public.pagos
FOR EACH ROW EXECUTE FUNCTION public.vulo_stamp_payment_actor();

CREATE OR REPLACE FUNCTION public.vulo_stamp_charge_actor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $b090000_7$
DECLARE
  v_uid uuid := auth.uid();
  v_name text := public.vulo_actor_name();
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_at := COALESCE(NEW.created_at, now());
    NEW.created_by := COALESCE(NEW.created_by, v_uid);
    NEW.created_by_nombre := COALESCE(
      NULLIF(NEW.created_by_nombre, ''),
      public.vulo_user_name(NEW.created_by),
      'Sistema'
    );
    RETURN NEW;
  END IF;

  IF v_uid IS NOT NULL THEN
    NEW.actualizado_at := now();
    NEW.actualizado_por := v_uid;
    NEW.actualizado_por_nombre := v_name;
  END IF;

  IF COALESCE(NEW.estado, 'Activo') = 'Cancelado' AND COALESCE(OLD.estado, 'Activo') <> 'Cancelado' THEN
    NEW.cancelado_at := COALESCE(NEW.cancelado_at, now());
    NEW.cancelado_por := COALESCE(NEW.cancelado_por, v_uid);
    NEW.cancelado_por_nombre := COALESCE(public.vulo_user_name(NEW.cancelado_por), v_name, 'Sistema');
  ELSIF COALESCE(NEW.estado, 'Activo') <> 'Cancelado' THEN
    NEW.cancelado_por_nombre := NULL;
  END IF;
  RETURN NEW;
END;
$b090000_7$;

DROP TRIGGER IF EXISTS trg_zz_vulo_stamp_charge_actor ON public.cargos;
CREATE TRIGGER trg_zz_vulo_stamp_charge_actor
BEFORE INSERT OR UPDATE ON public.cargos
FOR EACH ROW EXECUTE FUNCTION public.vulo_stamp_charge_actor();

REVOKE ALL ON FUNCTION public.vulo_stamp_reservation_actor() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.vulo_stamp_payment_actor() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.vulo_stamp_charge_actor() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. Disponibilidad: estancia del día = ocupa hasta el día siguiente;
--    un huésped con salida vencida que no ha hecho check-out sigue ocupando.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.vulo_room_available_for_stay(
  p_hotel_id uuid,
  p_habitacion_id uuid,
  p_reserva_id uuid,
  p_desde date,
  p_hasta date,
  p_require_ready boolean DEFAULT false
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $b090000_8$
  SELECT EXISTS (
    SELECT 1 FROM public.habitaciones h
    WHERE h.id = p_habitacion_id AND h.hotel_id = p_hotel_id
      AND h.estado_habitacion NOT IN ('Mantenimiento', 'FueraDeServicio', 'Bloqueada')
      AND lower(COALESCE(h.estado_mantenimiento, 'OK')) = 'ok'
      AND (NOT p_require_ready OR (
        h.estado_habitacion = 'Disponible'
        AND lower(COALESCE(h.estado_limpieza, 'Limpia')) = 'limpia'
      ))
      AND NOT EXISTS (
        SELECT 1 FROM public.reservas r
        WHERE r.hotel_id = p_hotel_id
          AND r.habitacion_id = p_habitacion_id
          AND r.id IS DISTINCT FROM p_reserva_id
          AND r.estado IN ('Pendiente', 'Confirmada', 'CheckIn', 'Hospedado')
          AND r.fecha_checkin < CASE WHEN p_hasta <= p_desde THEN p_desde + 1 ELSE p_hasta END
          AND GREATEST(
            CASE WHEN r.fecha_checkout <= r.fecha_checkin THEN r.fecha_checkin + 1 ELSE r.fecha_checkout END,
            CASE WHEN r.estado IN ('CheckIn', 'Hospedado')
                   AND COALESCE(r.checkin_realizado, false)
                   AND NOT COALESCE(r.checkout_realizado, false)
                 THEN public.vulo_hotel_today(p_hotel_id) + 1
                 ELSE r.fecha_checkin END
          ) > p_desde
      )
  )
$b090000_8$;

REVOKE ALL ON FUNCTION public.vulo_room_available_for_stay(uuid, uuid, uuid, date, date, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vulo_room_available_for_stay(uuid, uuid, uuid, date, date, boolean) TO authenticated;

-- Valida que una habitación pueda recibir al huésped hoy. No depende del
-- indicador estado_habitacion (puede quedar desfasado); revisa estancias reales.
CREATE OR REPLACE FUNCTION public.vulo_assert_room_ready_for_checkin(
  p_hotel_id uuid,
  p_habitacion_id uuid,
  p_reserva_id uuid,
  p_desde date,
  p_hasta date
)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $b090000_9$
DECLARE
  v_room public.habitaciones%ROWTYPE;
  v_holder text;
BEGIN
  SELECT * INTO v_room FROM public.habitaciones
  WHERE id = p_habitacion_id AND hotel_id = p_hotel_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Habitación no encontrada'; END IF;

  IF v_room.estado_habitacion IN ('Mantenimiento', 'FueraDeServicio', 'Bloqueada')
     OR lower(COALESCE(v_room.estado_mantenimiento, 'OK')) <> 'ok' THEN
    RAISE EXCEPTION 'La habitación % está en mantenimiento o fuera de servicio', v_room.numero;
  END IF;

  SELECT COALESCE(r.numero_reserva, left(r.id::text, 8)) INTO v_holder
  FROM public.reservas r
  WHERE r.hotel_id = p_hotel_id
    AND r.habitacion_id = p_habitacion_id
    AND r.id IS DISTINCT FROM p_reserva_id
    AND r.estado IN ('CheckIn', 'Hospedado')
    AND COALESCE(r.checkin_realizado, false)
    AND NOT COALESCE(r.checkout_realizado, false)
  LIMIT 1;
  IF v_holder IS NOT NULL THEN
    RAISE EXCEPTION 'La habitación % sigue ocupada por la reserva %. Registra primero su check-out.',
      v_room.numero, v_holder;
  END IF;

  IF NOT public.vulo_room_available_for_stay(p_hotel_id, p_habitacion_id, p_reserva_id, p_desde, p_hasta, false) THEN
    RAISE EXCEPTION 'La habitación % tiene otra reserva que se cruza con esas fechas', v_room.numero;
  END IF;
END;
$b090000_9$;

REVOKE ALL ON FUNCTION public.vulo_assert_room_ready_for_checkin(uuid, uuid, uuid, date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vulo_assert_room_ready_for_checkin(uuid, uuid, uuid, date, date) TO authenticated;

-- ---------------------------------------------------------------------------
-- 6. Check-in inmediato
--    * Llegada anticipada: la entrada se mueve a hoy y se recalcula.
--    * Llegada tardía: se conservan las fechas reservadas.
--    * La habitación se valida contra estancias reales, no contra el
--      indicador estado_habitacion (que puede quedar desfasado).
--    * Habitación sucia: se permite el check-in (se deja registro).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_reservation_checkin(
  p_reserva_id uuid,
  p_habitacion_id uuid,
  p_pagos jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $b090000_10$
DECLARE
  v_reserva public.reservas%ROWTYPE;
  v_item jsonb;
  v_today date;
  v_checkin date;
  v_checkout date;
  v_room_id uuid;
  v_type_id uuid;
  v_dirty boolean;
BEGIN
  SELECT * INTO v_reserva FROM public.reservas WHERE id = p_reserva_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reserva no encontrada'; END IF;

  IF COALESCE(v_reserva.checkin_realizado, false)
     AND v_reserva.estado IN ('CheckIn', 'Hospedado')
     AND NOT COALESCE(v_reserva.checkout_realizado, false) THEN
    RETURN to_jsonb(v_reserva);
  END IF;
  IF v_reserva.estado IN ('Cancelada', 'NoShow', 'CheckOut') THEN
    RAISE EXCEPTION 'No se puede hacer check-in a una reserva en estado %', v_reserva.estado;
  END IF;

  v_room_id := COALESCE(p_habitacion_id, v_reserva.habitacion_id);
  IF v_room_id IS NULL THEN RAISE EXCEPTION 'Selecciona una habitación antes de hacer check-in'; END IF;

  v_today := public.vulo_hotel_today(v_reserva.hotel_id);
  v_checkin := LEAST(v_reserva.fecha_checkin, v_today);
  v_checkout := v_reserva.fecha_checkout;
  -- Una estancia del día ocupa hasta el día siguiente.
  IF (CASE WHEN v_checkout <= v_reserva.fecha_checkin THEN v_reserva.fecha_checkin + 1 ELSE v_checkout END) <= v_today THEN
    RAISE EXCEPTION 'La fecha de salida (%) ya pasó. Modifica las fechas antes de hacer check-in', v_checkout;
  END IF;
  IF v_checkout < v_checkin THEN v_checkout := v_checkin; END IF;

  PERFORM public.vulo_assert_room_ready_for_checkin(
    v_reserva.hotel_id, v_room_id, p_reserva_id, v_checkin, v_checkout
  );

  SELECT tipo_habitacion_id,
         lower(COALESCE(estado_limpieza, 'Limpia')) NOT IN ('limpia', 'lista', 'inspeccionada')
  INTO v_type_id, v_dirty
  FROM public.habitaciones WHERE id = v_room_id;

  -- Primero se fijan fechas/habitación para que el total quede recalculado
  -- antes de validar los pagos.
  UPDATE public.reservas SET
    habitacion_id = v_room_id,
    tipo_habitacion_id = COALESCE(v_type_id, tipo_habitacion_id),
    fecha_checkin = v_checkin,
    fecha_checkout = v_checkout,
    early_checkin_at = CASE WHEN v_checkin < v_reserva.fecha_checkin THEN now() ELSE early_checkin_at END,
    checkin_realizado = true,
    estado = 'CheckIn',
    notas_internas = CASE WHEN v_dirty
      THEN concat_ws(E'\n', NULLIF(notas_internas, ''), 'Check-in con habitación pendiente de limpieza (' || to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI') || ' UTC)')
      ELSE notas_internas END,
    updated_at = now()
  WHERE id = p_reserva_id;

  UPDATE public.habitaciones SET estado_habitacion = 'Ocupada'
  WHERE id = v_room_id AND hotel_id = v_reserva.hotel_id;

  PERFORM public.recalculate_reservation_financials(p_reserva_id);

  FOR v_item IN SELECT value FROM jsonb_array_elements(COALESCE(p_pagos, '[]'::jsonb)) LOOP
    IF COALESCE((v_item->>'monto')::numeric, 0) <= 0 THEN
      RAISE EXCEPTION 'El monto del pago debe ser mayor a cero';
    END IF;
    INSERT INTO public.pagos (hotel_id, reserva_id, monto, metodo_pago, referencia, concepto)
    VALUES (
      v_reserva.hotel_id, p_reserva_id, (v_item->>'monto')::numeric,
      NULLIF(v_item->>'metodo_pago', ''), NULLIF(v_item->>'referencia', ''),
      COALESCE(NULLIF(v_item->>'concepto', ''), 'Pago en Check-in')
    );
  END LOOP;

  PERFORM public.recalculate_reservation_financials(p_reserva_id);
  SELECT * INTO v_reserva FROM public.reservas WHERE id = p_reserva_id;
  IF COALESCE(v_reserva.total_pagado, 0) > COALESCE(v_reserva.total, 0) + 0.009 THEN
    RAISE EXCEPTION 'Los pagos exceden el total de la reserva';
  END IF;

  RETURN to_jsonb(v_reserva);
END;
$b090000_10$;

REVOKE ALL ON FUNCTION public.complete_reservation_checkin(uuid, uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_reservation_checkin(uuid, uuid, jsonb) TO authenticated;

-- ---------------------------------------------------------------------------
-- 7. Alta de reserva / entrada directa
--    * "Entrada hoy" siempre inicia en la fecha local del hotel.
--    * Se permiten estancias del día (entrada = salida).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_reservation_bundle(
  p_reserva jsonb,
  p_cliente jsonb DEFAULT NULL,
  p_cargos jsonb DEFAULT '[]'::jsonb,
  p_pagos jsonb DEFAULT '[]'::jsonb,
  p_entregables jsonb DEFAULT '[]'::jsonb,
  p_checkin boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $b090000_11$
DECLARE
  v_hotel_id uuid := (p_reserva->>'hotel_id')::uuid;
  v_cliente_id uuid := (NULLIF(p_reserva->>'cliente_id', ''))::uuid;
  v_reserva public.reservas%ROWTYPE;
  v_item jsonb;
  v_habitacion_id uuid := (NULLIF(p_reserva->>'habitacion_id', ''))::uuid;
  v_checkin date := (p_reserva->>'fecha_checkin')::date;
  v_checkout date := (p_reserva->>'fecha_checkout')::date;
  v_today date := public.vulo_hotel_today((p_reserva->>'hotel_id')::uuid);
BEGIN
  IF v_checkin IS NULL OR v_checkout IS NULL THEN
    RAISE EXCEPTION 'Indica las fechas de entrada y salida';
  END IF;

  IF p_checkin THEN
    IF v_habitacion_id IS NULL THEN RAISE EXCEPTION 'Selecciona la habitación para registrar la entrada'; END IF;
    -- La entrada directa ocurre hoy aunque el navegador tenga otra fecha.
    IF v_checkin <> v_today THEN
      v_checkout := GREATEST(v_today, v_checkout + (v_today - v_checkin));
      v_checkin := v_today;
    END IF;
  END IF;

  IF v_checkout < v_checkin THEN
    RAISE EXCEPTION 'La fecha de salida no puede ser anterior a la entrada';
  END IF;

  IF p_cliente IS NOT NULL AND p_cliente <> '{}'::jsonb THEN
    IF length(trim(COALESCE(p_cliente->>'nombre', ''))) = 0
       OR length(trim(COALESCE(p_cliente->>'apellido_paterno', ''))) = 0
       OR length(trim(COALESCE(p_cliente->>'telefono', ''))) = 0 THEN
      RAISE EXCEPTION 'Nombre, apellido paterno y teléfono son obligatorios';
    END IF;

    INSERT INTO public.clientes (
      hotel_id, nombre, apellido_paterno, apellido_materno, email, telefono,
      tipo_documento, numero_documento, nacionalidad, notas, es_vip
    ) VALUES (
      v_hotel_id,
      trim(p_cliente->>'nombre'),
      trim(p_cliente->>'apellido_paterno'),
      NULLIF(trim(p_cliente->>'apellido_materno'), ''),
      NULLIF(trim(p_cliente->>'email'), ''),
      trim(p_cliente->>'telefono'),
      NULLIF(p_cliente->>'tipo_documento', ''),
      NULLIF(p_cliente->>'numero_documento', ''),
      COALESCE(NULLIF(p_cliente->>'nacionalidad', ''), 'Mexicana'),
      NULLIF(p_cliente->>'notas', ''),
      COALESCE((p_cliente->>'es_vip')::boolean, false)
    ) RETURNING id INTO v_cliente_id;
  END IF;

  IF v_cliente_id IS NULL THEN
    RAISE EXCEPTION 'Selecciona o crea un cliente';
  END IF;

  IF p_checkin THEN
    PERFORM public.vulo_assert_room_ready_for_checkin(v_hotel_id, v_habitacion_id, NULL, v_checkin, v_checkout);
  END IF;

  INSERT INTO public.reservas (
    hotel_id, cliente_id, habitacion_id, tipo_habitacion_id,
    fecha_checkin, fecha_checkout, hora_llegada, adultos, ninos,
    tarifa_noche, personas_extra, cargo_persona_extra,
    descuento, descuento_tipo, descuento_valor, total_impuestos,
    solicitudes_especiales, notas, notas_internas, origen, estado
  ) VALUES (
    v_hotel_id,
    v_cliente_id,
    v_habitacion_id,
    (NULLIF(p_reserva->>'tipo_habitacion_id', ''))::uuid,
    v_checkin,
    v_checkout,
    NULLIF(p_reserva->>'hora_llegada', ''),
    COALESCE((p_reserva->>'adultos')::integer, 1),
    COALESCE((p_reserva->>'ninos')::integer, 0),
    GREATEST(0, COALESCE((p_reserva->>'tarifa_noche')::numeric, 0)),
    GREATEST(0, COALESCE((p_reserva->>'personas_extra')::integer, 0)),
    GREATEST(0, COALESCE((p_reserva->>'cargo_persona_extra')::numeric, 0)),
    GREATEST(0, COALESCE((p_reserva->>'descuento')::numeric, 0)),
    NULLIF(p_reserva->>'descuento_tipo', ''),
    GREATEST(0, COALESCE((p_reserva->>'descuento_valor')::numeric, 0)),
    GREATEST(0, COALESCE((p_reserva->>'total_impuestos')::numeric, 0)),
    NULLIF(p_reserva->>'solicitudes_especiales', ''),
    NULLIF(p_reserva->>'notas', ''),
    NULLIF(p_reserva->>'notas_internas', ''),
    COALESCE(NULLIF(p_reserva->>'origen', ''), 'Reserva'),
    COALESCE(NULLIF(p_reserva->>'estado', ''), 'Confirmada')
  ) RETURNING * INTO v_reserva;

  FOR v_item IN SELECT value FROM jsonb_array_elements(COALESCE(p_cargos, '[]'::jsonb)) LOOP
    INSERT INTO public.cargos (
      hotel_id, reserva_id, concepto_id, concepto, cantidad,
      precio_unitario, impuesto, notas
    ) VALUES (
      v_hotel_id,
      v_reserva.id,
      (NULLIF(v_item->>'concepto_id', ''))::uuid,
      COALESCE(NULLIF(v_item->>'concepto', ''), 'Cargo adicional'),
      GREATEST(1, COALESCE((v_item->>'cantidad')::numeric, 1)),
      GREATEST(0, COALESCE((v_item->>'precio_unitario')::numeric, 0)),
      GREATEST(0, COALESCE((v_item->>'impuesto')::numeric, 0)),
      NULLIF(v_item->>'notas', '')
    );
  END LOOP;

  FOR v_item IN SELECT value FROM jsonb_array_elements(COALESCE(p_pagos, '[]'::jsonb)) LOOP
    IF COALESCE((v_item->>'monto')::numeric, 0) <= 0 THEN
      RAISE EXCEPTION 'El monto del pago debe ser mayor a cero';
    END IF;
    INSERT INTO public.pagos (
      hotel_id, reserva_id, monto, metodo_pago, referencia, concepto, notas
    ) VALUES (
      v_hotel_id,
      v_reserva.id,
      (v_item->>'monto')::numeric,
      NULLIF(v_item->>'metodo_pago', ''),
      NULLIF(v_item->>'referencia', ''),
      NULLIF(v_item->>'concepto', ''),
      NULLIF(v_item->>'notas', '')
    );
  END LOOP;

  FOR v_item IN SELECT value FROM jsonb_array_elements(COALESCE(p_entregables, '[]'::jsonb)) LOOP
    INSERT INTO public.entregables_reserva (reserva_id, entregable_id, cantidad)
    VALUES (
      v_reserva.id,
      (NULLIF(v_item->>'entregable_id', ''))::uuid,
      GREATEST(1, COALESCE((v_item->>'cantidad')::integer, 1))
    );
  END LOOP;

  IF p_checkin THEN
    UPDATE public.reservas
    SET checkin_realizado = true, estado = 'CheckIn'
    WHERE id = v_reserva.id;

    UPDATE public.habitaciones
    SET estado_habitacion = 'Ocupada'
    WHERE id = v_habitacion_id AND hotel_id = v_hotel_id;
  END IF;

  PERFORM public.recalculate_reservation_financials(v_reserva.id);
  SELECT * INTO v_reserva FROM public.reservas WHERE id = v_reserva.id;
  IF COALESCE(v_reserva.total_pagado, 0) > COALESCE(v_reserva.total, 0) + 0.009 THEN
    RAISE EXCEPTION 'Los pagos exceden el total de la reserva';
  END IF;
  RETURN to_jsonb(v_reserva);
END;
$b090000_11$;

REVOKE ALL ON FUNCTION public.create_reservation_bundle(jsonb, jsonb, jsonb, jsonb, jsonb, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_reservation_bundle(jsonb, jsonb, jsonb, jsonb, jsonb, boolean) TO authenticated;

-- ---------------------------------------------------------------------------
-- 8. Operaciones de estancia
--    * Se guarda el motivo para la trazabilidad de cancelación/no-show.
--    * Modificar fechas admite estancia del día.
--    * Early check-in admite llegada anticipada (mueve la entrada a hoy).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.vulo_apply_stay_operation(
  p_reserva_id uuid,
  p_operacion text,
  p_payload jsonb DEFAULT '{}'::jsonb,
  p_motivo text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $b090000_12$
DECLARE
  v_reserva public.reservas%ROWTYPE;
  v_after public.reservas%ROWTYPE;
  v_op text := lower(trim(COALESCE(p_operacion, '')));
  v_reason text := trim(COALESCE(p_motivo, ''));
  v_before jsonb;
  v_after_json jsonb;
  v_meta jsonb := COALESCE(p_payload, '{}'::jsonb);
  v_new_checkin date;
  v_new_checkout date;
  v_new_room uuid;
  v_old_room uuid;
  v_target_reservation uuid;
  v_charge public.cargos%ROWTYPE;
  v_payment public.pagos%ROWTYPE;
  v_guest public.reserva_huespedes%ROWTYPE;
  v_account_id uuid;
  v_movement_id uuid;
  v_is_active boolean;
  v_require_ready boolean;
  v_new_rate numeric;
  v_late_until timestamptz;
  v_hotel_today date;
  v_capacity integer;
  v_adults integer;
  v_children integer;
  v_extra_count integer;
  v_is_manager boolean := COALESCE(public.vulo_current_role(), '') IN ('SuperAdmin','Admin','Gerente');
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sesión no válida'; END IF;
  IF NOT public.vulo_operation_allowed(v_op) THEN
    RAISE EXCEPTION 'Tu rol no tiene permiso para realizar esta operación';
  END IF;
  PERFORM set_config('vulo.stay_operation',v_op,true);
  PERFORM set_config('vulo.stay_reason',v_reason,true);
  IF length(v_reason) < 3 AND v_op NOT IN ('add_guest','add_charge','partial_payment','split_account') THEN
    RAISE EXCEPTION 'Escribe el motivo de la operación';
  END IF;

  SELECT * INTO v_reserva FROM public.reservas
  WHERE id = p_reserva_id
    AND (hotel_id = public.vulo_current_hotel_id() OR public.vulo_is_superadmin())
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reserva no encontrada'; END IF;

  IF v_reserva.impuesto_hospedaje_porcentaje IS NULL THEN
    v_reserva.impuesto_hospedaje_porcentaje := CASE WHEN COALESCE(v_reserva.subtotal_hospedaje,0)>0
      THEN ROUND(COALESCE(v_reserva.total_impuestos,0)*100/v_reserva.subtotal_hospedaje,4) ELSE 0 END;
    UPDATE public.reservas SET impuesto_hospedaje_porcentaje=v_reserva.impuesto_hospedaje_porcentaje
    WHERE id=p_reserva_id;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_reserva.hotel_id::text || ':' || p_reserva_id::text, 0));
  v_before := to_jsonb(v_reserva);
  v_old_room := v_reserva.habitacion_id;
  v_is_active := COALESCE(v_reserva.checkin_realizado, false)
    AND NOT COALESCE(v_reserva.checkout_realizado, false)
    AND v_reserva.estado IN ('CheckIn', 'Hospedado');
  SELECT (now() AT TIME ZONE COALESCE(h.timezone, 'UTC'))::date INTO v_hotel_today
  FROM public.hotels h WHERE h.id = v_reserva.hotel_id;

  IF v_op IN ('extend_stay','early_departure','modify_dates','reservation_correction') THEN
    IF v_reserva.estado IN ('Cancelada','NoShow','CheckOut') THEN
      RAISE EXCEPTION 'La reservación cerrada no admite cambios de fechas';
    END IF;
    v_new_checkin := COALESCE(NULLIF(p_payload->>'new_checkin', '')::date, v_reserva.fecha_checkin);
    v_new_checkout := COALESCE(NULLIF(p_payload->>'new_checkout', '')::date, v_reserva.fecha_checkout);
    v_new_room := COALESCE(NULLIF(p_payload->>'new_room_id', '')::uuid, v_reserva.habitacion_id);

    IF v_op = 'extend_stay' AND v_new_checkout <= v_reserva.fecha_checkout THEN
      RAISE EXCEPTION 'La nueva salida debe ser posterior a la salida actual';
    END IF;
    IF v_op = 'early_departure' AND v_new_checkout >= v_reserva.fecha_checkout THEN
      RAISE EXCEPTION 'La salida anticipada debe ser anterior a la salida actual';
    END IF;
    IF v_is_active AND v_new_checkin <> v_reserva.fecha_checkin AND NOT v_is_manager THEN
      RAISE EXCEPTION 'Sólo gerencia puede corregir la fecha de entrada después del check-in';
    END IF;
    -- Se permiten estancias del día (entrada y salida en la misma fecha).
    IF v_new_checkout < v_new_checkin THEN
      RAISE EXCEPTION 'La fecha de salida no puede ser anterior a la entrada';
    END IF;
    IF v_is_active AND v_new_checkout < v_hotel_today THEN
      RAISE EXCEPTION 'La salida no puede quedar antes del día operativo';
    END IF;
    IF v_new_room IS NOT NULL AND NOT public.vulo_room_available_for_stay(
      v_reserva.hotel_id, v_new_room, v_reserva.id, v_new_checkin, v_new_checkout,
      v_is_active AND v_new_room IS DISTINCT FROM v_old_room
    ) THEN
      RAISE EXCEPTION 'La habitación no está disponible para el nuevo rango';
    END IF;

    IF v_new_room IS DISTINCT FROM v_old_room AND v_is_active THEN
      UPDATE public.habitaciones SET estado_habitacion = 'Disponible', estado_limpieza = 'Sucia'
      WHERE id = v_old_room AND hotel_id = v_reserva.hotel_id;
      UPDATE public.habitaciones SET estado_habitacion = 'Ocupada'
      WHERE id = v_new_room AND hotel_id = v_reserva.hotel_id;
    END IF;

    UPDATE public.reservas SET
      fecha_checkin = v_new_checkin,
      fecha_checkout = v_new_checkout,
      habitacion_id = v_new_room,
      tipo_habitacion_id = COALESCE(
        (SELECT tipo_habitacion_id FROM public.habitaciones WHERE id = v_new_room),
        tipo_habitacion_id
      ),
      version_operativa = version_operativa + 1,
      updated_at = now()
    WHERE id = p_reserva_id;

  ELSIF v_op IN ('room_change','category_change') THEN
    IF v_reserva.estado IN ('Cancelada','NoShow','CheckOut') THEN RAISE EXCEPTION 'La reservación está cerrada'; END IF;
    v_new_room := NULLIF(p_payload->>'new_room_id', '')::uuid;
    IF v_new_room IS NULL OR v_new_room = v_old_room THEN
      RAISE EXCEPTION 'Selecciona una habitación diferente';
    END IF;
    IF NOT public.vulo_room_available_for_stay(
      v_reserva.hotel_id, v_new_room, v_reserva.id,
      GREATEST(v_reserva.fecha_checkin, v_hotel_today), v_reserva.fecha_checkout, v_is_active
    ) THEN
      RAISE EXCEPTION 'La habitación destino no está disponible, limpia y operativa';
    END IF;
    v_new_rate := NULLIF(p_payload->>'new_rate', '')::numeric;
    IF v_new_rate IS NOT NULL AND NOT v_is_manager THEN
      RAISE EXCEPTION 'Sólo gerencia puede modificar la tarifa durante un cambio de categoría';
    END IF;

    IF v_is_active THEN
      UPDATE public.habitaciones SET estado_habitacion = 'Disponible', estado_limpieza = 'Sucia'
      WHERE id = v_old_room AND hotel_id = v_reserva.hotel_id;
      UPDATE public.habitaciones SET estado_habitacion = 'Ocupada'
      WHERE id = v_new_room AND hotel_id = v_reserva.hotel_id;
    END IF;
    UPDATE public.reservas SET
      habitacion_id = v_new_room,
      tipo_habitacion_id = (SELECT tipo_habitacion_id FROM public.habitaciones WHERE id = v_new_room),
      tarifa_noche = COALESCE(v_new_rate, tarifa_noche),
      version_operativa = version_operativa + 1,
      updated_at = now()
    WHERE id = p_reserva_id;

  ELSIF v_op = 'late_checkout' THEN
    IF NOT v_is_active THEN RAISE EXCEPTION 'El late check-out requiere una estancia activa'; END IF;
    v_late_until := NULLIF(p_payload->>'late_until', '')::timestamptz;
    IF v_late_until IS NULL THEN RAISE EXCEPTION 'Indica la nueva hora de salida'; END IF;
    IF v_reserva.habitacion_id IS NULL THEN RAISE EXCEPTION 'La estancia no tiene habitación asignada'; END IF;
    IF (v_late_until AT TIME ZONE (SELECT COALESCE(timezone,'UTC') FROM public.hotels WHERE id=v_reserva.hotel_id))::date
      <> v_reserva.fecha_checkout THEN RAISE EXCEPTION 'El late check-out debe quedar en la fecha de salida'; END IF;
    IF (v_late_until AT TIME ZONE (SELECT COALESCE(timezone,'UTC') FROM public.hotels WHERE id=v_reserva.hotel_id))::time
      <= COALESCE((SELECT hora_checkout FROM public.hotels WHERE id=v_reserva.hotel_id),'11:00')::time THEN
      RAISE EXCEPTION 'La hora indicada no corresponde a un late check-out';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.reservas r
      JOIN public.hotels h ON h.id = v_reserva.hotel_id
      WHERE r.hotel_id = v_reserva.hotel_id AND r.habitacion_id = v_reserva.habitacion_id
        AND r.id <> v_reserva.id AND r.estado IN ('Pendiente','Confirmada','CheckIn','Hospedado')
        AND r.fecha_checkin = v_reserva.fecha_checkout
        AND (v_late_until AT TIME ZONE COALESCE(h.timezone, 'UTC'))::time >= COALESCE(h.hora_checkin, '15:00')::time
    ) THEN
      RAISE EXCEPTION 'El late check-out entra en conflicto con la siguiente llegada';
    END IF;
    UPDATE public.reservas SET late_checkout_until = v_late_until,
      hora_checkout = (v_late_until AT TIME ZONE (SELECT COALESCE(timezone,'UTC') FROM public.hotels WHERE id = v_reserva.hotel_id))::time,
      version_operativa = version_operativa + 1, updated_at = now()
    WHERE id = p_reserva_id;
    IF COALESCE(NULLIF(p_payload->>'charge_amount','')::numeric, 0) > 0 THEN
      INSERT INTO public.cargos(hotel_id,reserva_id,habitacion_id,concepto,cantidad,precio_unitario,subtotal,total,notas)
      VALUES(v_reserva.hotel_id,p_reserva_id,v_reserva.habitacion_id,'Late check-out',1,
        NULLIF(p_payload->>'charge_amount','')::numeric,NULLIF(p_payload->>'charge_amount','')::numeric,
        NULLIF(p_payload->>'charge_amount','')::numeric,v_reason)
      RETURNING * INTO v_charge;
      v_meta:=v_meta||jsonb_build_object('charge_id',v_charge.id);
    END IF;

  ELSIF v_op = 'early_checkin' THEN
    IF v_reserva.estado IN ('Cancelada','NoShow','CheckOut') OR COALESCE(v_reserva.checkin_realizado,false) THEN
      RAISE EXCEPTION 'La reserva no admite early check-in';
    END IF;
    -- Llegada anticipada: la estancia inicia hoy (se recalcula la noche extra).
    IF v_reserva.fecha_checkin > v_hotel_today THEN
      UPDATE public.reservas SET fecha_checkin=v_hotel_today WHERE id=p_reserva_id;
      v_reserva.fecha_checkin := v_hotel_today;
    END IF;
    v_new_room := COALESCE(NULLIF(p_payload->>'new_room_id', '')::uuid, v_reserva.habitacion_id);
    IF v_new_room IS NULL OR NOT public.vulo_room_available_for_stay(
      v_reserva.hotel_id, v_new_room, v_reserva.id, v_reserva.fecha_checkin, v_reserva.fecha_checkout, true
    ) THEN
      RAISE EXCEPTION 'La habitación no está disponible, limpia y lista';
    END IF;
    UPDATE public.reservas SET habitacion_id = v_new_room,
      tipo_habitacion_id = (SELECT tipo_habitacion_id FROM public.habitaciones WHERE id = v_new_room),
      checkin_realizado = true, estado = 'CheckIn', early_checkin_at = now(),
      version_operativa = version_operativa + 1, updated_at = now()
    WHERE id = p_reserva_id;
    UPDATE public.habitaciones SET estado_habitacion = 'Ocupada'
    WHERE id = v_new_room AND hotel_id = v_reserva.hotel_id;
    IF COALESCE(NULLIF(p_payload->>'charge_amount','')::numeric, 0) > 0 THEN
      INSERT INTO public.cargos(hotel_id,reserva_id,habitacion_id,concepto,cantidad,precio_unitario,subtotal,total,notas)
      VALUES(v_reserva.hotel_id,p_reserva_id,v_new_room,'Early check-in',1,
        NULLIF(p_payload->>'charge_amount','')::numeric,NULLIF(p_payload->>'charge_amount','')::numeric,
        NULLIF(p_payload->>'charge_amount','')::numeric,v_reason);
    END IF;

  ELSIF v_op = 'add_guest' THEN
    IF NOT v_is_active THEN RAISE EXCEPTION 'Sólo se agregan acompañantes a una estancia activa'; END IF;
    IF length(trim(COALESCE(p_payload->>'name',''))) < 2 THEN RAISE EXCEPTION 'Escribe el nombre del huésped'; END IF;
    INSERT INTO public.reserva_huespedes(
      hotel_id,reserva_id,nombre,apellido_paterno,tipo,documento,
      genera_cargo,cargo_por_noche,created_by
    ) VALUES (
      v_reserva.hotel_id,p_reserva_id,trim(p_payload->>'name'),NULLIF(trim(p_payload->>'last_name'),''),
      COALESCE(NULLIF(p_payload->>'guest_type',''),'Adulto'),NULLIF(trim(p_payload->>'document'),''),
      COALESCE(NULLIF(p_payload->>'generates_charge','')::boolean,false),
      GREATEST(0,COALESCE(NULLIF(p_payload->>'charge_per_night','')::numeric,0)),auth.uid()
    ) RETURNING * INTO v_guest;

    SELECT COALESCE(t.capacidad_maxima, t.capacidad_adultos + t.capacidad_ninos, 1),
      1 + count(*) FILTER (WHERE rh.tipo = 'Adulto'),
      count(*) FILTER (WHERE rh.tipo = 'Menor')
    INTO v_capacity, v_adults, v_children
    FROM public.reservas r
    LEFT JOIN public.tipos_habitacion t ON t.id = r.tipo_habitacion_id
    LEFT JOIN public.reserva_huespedes rh ON rh.reserva_id = r.id AND rh.activo
    WHERE r.id = p_reserva_id
    GROUP BY t.capacidad_maxima,t.capacidad_adultos,t.capacidad_ninos;
    IF v_adults + v_children > v_capacity THEN
      RAISE EXCEPTION 'Se excede la capacidad máxima de la habitación (%)', v_capacity;
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.reservas r JOIN public.tipos_habitacion t ON t.id = r.tipo_habitacion_id
      WHERE r.id = p_reserva_id
        AND ((t.capacidad_adultos IS NOT NULL AND v_adults > t.capacidad_adultos)
          OR (t.capacidad_ninos IS NOT NULL AND v_children > t.capacidad_ninos))
    ) THEN RAISE EXCEPTION 'La distribución de adultos y menores excede la capacidad configurada'; END IF;

    SELECT count(*), COALESCE(avg(cargo_por_noche),0) INTO v_extra_count,v_new_rate
    FROM public.reserva_huespedes WHERE reserva_id=p_reserva_id AND activo AND genera_cargo;
    UPDATE public.reservas SET adultos=v_adults,ninos=v_children,personas_extra=v_extra_count,
      cargo_persona_extra=CASE WHEN v_extra_count>0 THEN v_new_rate ELSE cargo_persona_extra END,
      version_operativa=version_operativa+1,updated_at=now() WHERE id=p_reserva_id;
    v_meta := v_meta || jsonb_build_object('guest_id',v_guest.id);

  ELSIF v_op = 'remove_guest' THEN
    IF NOT v_is_active THEN RAISE EXCEPTION 'Sólo se retiran acompañantes de una estancia activa'; END IF;
    SELECT * INTO v_guest FROM public.reserva_huespedes
    WHERE id=NULLIF(p_payload->>'guest_id','')::uuid AND reserva_id=p_reserva_id AND activo FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Huésped adicional no encontrado'; END IF;
    UPDATE public.reserva_huespedes SET activo=false,retirado_at=now(),retirado_por=auth.uid(),motivo_retiro=v_reason
    WHERE id=v_guest.id;
    SELECT 1 + count(*) FILTER (WHERE tipo='Adulto'),count(*) FILTER (WHERE tipo='Menor'),
      count(*) FILTER (WHERE genera_cargo),COALESCE(avg(cargo_por_noche) FILTER (WHERE genera_cargo),0)
    INTO v_adults,v_children,v_extra_count,v_new_rate
    FROM public.reserva_huespedes WHERE reserva_id=p_reserva_id AND activo;
    UPDATE public.reservas SET adultos=v_adults,ninos=v_children,personas_extra=v_extra_count,
      cargo_persona_extra=CASE WHEN v_extra_count>0 THEN v_new_rate ELSE cargo_persona_extra END,
      version_operativa=version_operativa+1,updated_at=now() WHERE id=p_reserva_id;
    v_meta := v_meta || jsonb_build_object('guest_id',v_guest.id,'guest_before',to_jsonb(v_guest));

  ELSIF v_op = 'room_out_of_service' THEN
    IF v_old_room IS NULL THEN RAISE EXCEPTION 'La reservación no tiene habitación asignada'; END IF;
    v_new_room := NULLIF(p_payload->>'new_room_id','')::uuid;
    IF v_reserva.estado IN ('Pendiente','Confirmada','CheckIn','Hospedado') THEN
      IF v_new_room IS NULL THEN RAISE EXCEPTION 'Reasigna la reservación antes de bloquear su habitación'; END IF;
      IF NOT public.vulo_room_available_for_stay(v_reserva.hotel_id,v_new_room,v_reserva.id,
        CASE WHEN v_is_active THEN GREATEST(v_reserva.fecha_checkin,v_hotel_today) ELSE v_reserva.fecha_checkin END,
        v_reserva.fecha_checkout,v_is_active) THEN
        RAISE EXCEPTION 'La habitación de reubicación no está operativa o disponible';
      END IF;
      IF v_is_active THEN
        UPDATE public.habitaciones SET estado_habitacion='Ocupada' WHERE id=v_new_room AND hotel_id=v_reserva.hotel_id;
      END IF;
      UPDATE public.reservas SET habitacion_id=v_new_room,
        tipo_habitacion_id=(SELECT tipo_habitacion_id FROM public.habitaciones WHERE id=v_new_room),
        version_operativa=version_operativa+1,updated_at=now() WHERE id=p_reserva_id;
    END IF;
    UPDATE public.habitaciones SET estado_habitacion='FueraDeServicio',estado_mantenimiento='Pendiente',
      fuera_servicio_motivo=v_reason,fuera_servicio_desde=now(),
      fuera_servicio_hasta=NULLIF(p_payload->>'blocked_until','')::timestamptz
    WHERE id=v_old_room AND hotel_id=v_reserva.hotel_id;
    INSERT INTO public.tareas_mantenimiento(hotel_id,habitacion_id,titulo,descripcion,estado,prioridad,tipo,fecha_reporte)
    VALUES(v_reserva.hotel_id,v_old_room,'Habitación fuera de servicio',v_reason,'Pendiente',
      COALESCE(NULLIF(p_payload->>'priority',''),'Alta'),'Fuera de servicio',now());
    v_meta := v_meta || jsonb_build_object('blocked_room_id',v_old_room,'relocated_to',v_new_room);

  ELSIF v_op = 'rate_change' THEN
    IF NOT v_is_manager THEN RAISE EXCEPTION 'Sólo gerencia puede modificar tarifas'; END IF;
    v_new_rate := NULLIF(p_payload->>'new_rate','')::numeric;
    IF v_new_rate IS NULL OR v_new_rate < 0 THEN RAISE EXCEPTION 'Indica una tarifa válida'; END IF;
    UPDATE public.reservas SET tarifa_noche=v_new_rate,version_operativa=version_operativa+1,updated_at=now()
    WHERE id=p_reserva_id;

  ELSIF v_op = 'discount_change' THEN
    IF NOT v_is_manager THEN RAISE EXCEPTION 'Sólo gerencia puede aplicar descuentos o cortesías'; END IF;
    IF COALESCE(p_payload->>'discount_type','') NOT IN ('none','Monto','Porcentaje','Cortesia') THEN
      RAISE EXCEPTION 'Tipo de descuento no válido';
    END IF;
    IF p_payload->>'discount_type'='Porcentaje' AND COALESCE(NULLIF(p_payload->>'discount_value','')::numeric,0)>100 THEN
      RAISE EXCEPTION 'El descuento porcentual no puede superar 100%%';
    END IF;
    UPDATE public.reservas SET
      descuento_tipo=CASE WHEN p_payload->>'discount_type'='Cortesia' THEN 'Porcentaje'
        WHEN p_payload->>'discount_type'='none' THEN NULL ELSE p_payload->>'discount_type' END,
      descuento_valor=CASE WHEN p_payload->>'discount_type'='Cortesia' THEN 100
        WHEN p_payload->>'discount_type'='none' THEN 0 ELSE GREATEST(0,COALESCE(NULLIF(p_payload->>'discount_value','')::numeric,0)) END,
      version_operativa=version_operativa+1,updated_at=now()
    WHERE id=p_reserva_id;

  ELSIF v_op = 'add_charge' THEN
    IF COALESCE(NULLIF(p_payload->>'amount','')::numeric,0) < 0 OR COALESCE(NULLIF(p_payload->>'quantity','')::numeric,1) <= 0 THEN
      RAISE EXCEPTION 'Cantidad o importe no válido';
    END IF;
    INSERT INTO public.cargos(hotel_id,reserva_id,habitacion_id,concepto,concepto_id,cantidad,precio_unitario,impuesto,notas)
    VALUES(v_reserva.hotel_id,p_reserva_id,v_reserva.habitacion_id,COALESCE(NULLIF(p_payload->>'concept',''),'Cargo adicional'),
      NULLIF(p_payload->>'concept_id','')::uuid,COALESCE(NULLIF(p_payload->>'quantity','')::numeric,1),
      COALESCE(NULLIF(p_payload->>'amount','')::numeric,0),GREATEST(0,COALESCE(NULLIF(p_payload->>'tax','')::numeric,0)),NULLIF(p_payload->>'notes',''))
    RETURNING * INTO v_charge;
    v_meta := v_meta || jsonb_build_object('charge_id',v_charge.id);

  ELSIF v_op IN ('update_charge','cancel_charge','restore_charge','transfer_charge') THEN
    IF NOT v_is_manager THEN RAISE EXCEPTION 'Sólo gerencia puede corregir, cancelar o trasladar cargos'; END IF;
    SELECT * INTO v_charge FROM public.cargos
    WHERE id=NULLIF(p_payload->>'charge_id','')::uuid AND reserva_id=p_reserva_id AND hotel_id=v_reserva.hotel_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Cargo no encontrado'; END IF;
    IF v_op<>'restore_charge' AND COALESCE(v_charge.estado,'Activo')<>'Activo' THEN
      RAISE EXCEPTION 'El cargo está cancelado';
    END IF;
    v_meta := v_meta || jsonb_build_object('charge_before',to_jsonb(v_charge));
    IF v_op='update_charge' THEN
      UPDATE public.cargos SET concepto=COALESCE(NULLIF(p_payload->>'concept',''),concepto),
        cantidad=COALESCE(NULLIF(p_payload->>'quantity','')::numeric,cantidad),
        precio_unitario=COALESCE(NULLIF(p_payload->>'amount','')::numeric,precio_unitario),
        impuesto=COALESCE(NULLIF(p_payload->>'tax','')::numeric,impuesto),
        notas=COALESCE(p_payload->>'notes',notas),actualizado_at=now(),actualizado_por=auth.uid()
      WHERE id=v_charge.id;
    ELSIF v_op='cancel_charge' THEN
      UPDATE public.cargos SET estado='Cancelado',cancelado_at=now(),cancelado_por=auth.uid(),
        motivo_cancelacion=v_reason,actualizado_at=now(),actualizado_por=auth.uid() WHERE id=v_charge.id;
    ELSIF v_op='restore_charge' THEN
      IF COALESCE(v_charge.estado,'Activo')<>'Cancelado' THEN RAISE EXCEPTION 'El cargo no está cancelado'; END IF;
      UPDATE public.cargos SET estado='Activo',cancelado_at=NULL,cancelado_por=NULL,
        motivo_cancelacion=NULL,actualizado_at=now(),actualizado_por=auth.uid() WHERE id=v_charge.id;
    ELSE
      v_target_reservation := NULLIF(p_payload->>'target_reservation_id','')::uuid;
      IF NOT EXISTS(SELECT 1 FROM public.reservas WHERE id=v_target_reservation AND hotel_id=v_reserva.hotel_id
        AND estado NOT IN ('Cancelada','NoShow')) THEN RAISE EXCEPTION 'La cuenta destino no es válida'; END IF;
      UPDATE public.cargos SET reserva_id=v_target_reservation,
        habitacion_id=(SELECT habitacion_id FROM public.reservas WHERE id=v_target_reservation),
        cuenta_estancia_id=NULL,notas=concat_ws(' · ',NULLIF(notas,''),'Trasladado: '||v_reason),
        actualizado_at=now(),actualizado_por=auth.uid() WHERE id=v_charge.id;
      v_meta := v_meta || jsonb_build_object('target_reservation_id',v_target_reservation);
    END IF;

  ELSIF v_op IN ('payment_method_change','cancel_payment','restore_payment') THEN
    IF NOT v_is_manager THEN RAISE EXCEPTION 'Sólo gerencia puede corregir la forma de pago'; END IF;
    SELECT * INTO v_payment FROM public.pagos
    WHERE id=NULLIF(p_payload->>'payment_id','')::uuid AND reserva_id=p_reserva_id
      AND hotel_id=v_reserva.hotel_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Pago no encontrado'; END IF;
    IF v_op='payment_method_change' AND length(trim(COALESCE(p_payload->>'payment_method',''))) < 2 THEN
      RAISE EXCEPTION 'Selecciona una forma de pago válida';
    END IF;
    v_meta := v_meta || jsonb_build_object('payment_before',to_jsonb(v_payment));
    IF v_op='cancel_payment' THEN
      IF COALESCE(v_payment.estado,'Activo')<>'Activo' THEN RAISE EXCEPTION 'El pago ya está cancelado'; END IF;
      UPDATE public.pagos SET estado='Cancelado',actualizado_at=now(),actualizado_por=auth.uid(),motivo_cambio=v_reason
      WHERE id=v_payment.id;
    ELSIF v_op='restore_payment' THEN
      IF COALESCE(v_payment.estado,'Activo')<>'Cancelado' THEN RAISE EXCEPTION 'El pago no está cancelado'; END IF;
      UPDATE public.pagos SET estado='Activo',actualizado_at=now(),actualizado_por=auth.uid(),motivo_cambio=v_reason
      WHERE id=v_payment.id;
    ELSE
      UPDATE public.pagos SET metodo_pago=trim(p_payload->>'payment_method'),
        referencia=COALESCE(NULLIF(trim(p_payload->>'reference'),''),referencia),
        actualizado_at=now(),actualizado_por=auth.uid(),motivo_cambio=v_reason
      WHERE id=v_payment.id;
    END IF;

  ELSIF v_op = 'partial_payment' THEN
    IF COALESCE(NULLIF(p_payload->>'amount','')::numeric,0) <= 0 THEN
      RAISE EXCEPTION 'El abono debe ser mayor a cero';
    END IF;
    PERFORM public.recalculate_reservation_financials(p_reserva_id);
    SELECT * INTO v_reserva FROM public.reservas WHERE id=p_reserva_id FOR UPDATE;
    IF NULLIF(p_payload->>'amount','')::numeric > COALESCE(v_reserva.saldo_pendiente,0) + 0.009 THEN
      RAISE EXCEPTION 'El abono excede el saldo pendiente';
    END IF;
    v_account_id := NULLIF(p_payload->>'account_id','')::uuid;
    IF v_account_id IS NOT NULL AND NOT EXISTS(
      SELECT 1 FROM public.cuentas_estancia WHERE id=v_account_id AND reserva_id=p_reserva_id AND estado='Abierta'
    ) THEN RAISE EXCEPTION 'La subcuenta no es válida'; END IF;
    INSERT INTO public.pagos(hotel_id,reserva_id,monto,metodo_pago,referencia,concepto,notas,cuenta_estancia_id)
    VALUES(v_reserva.hotel_id,p_reserva_id,NULLIF(p_payload->>'amount','')::numeric,
      COALESCE(NULLIF(trim(p_payload->>'payment_method'),''),'Efectivo'),NULLIF(trim(p_payload->>'reference'),''),
      COALESCE(NULLIF(trim(p_payload->>'concept'),''),'Abono a estancia'),NULLIF(trim(p_payload->>'notes'),''),v_account_id)
    RETURNING * INTO v_payment;
    v_meta := v_meta || jsonb_build_object('payment_id',v_payment.id);

  ELSIF v_op = 'split_account' THEN
    IF length(trim(COALESCE(p_payload->>'name',''))) < 2 THEN RAISE EXCEPTION 'Nombra la nueva subcuenta'; END IF;
    INSERT INTO public.cuentas_estancia(hotel_id,reserva_id,nombre,responsable,created_by)
    VALUES(v_reserva.hotel_id,p_reserva_id,trim(p_payload->>'name'),NULLIF(trim(p_payload->>'responsible'),''),auth.uid())
    RETURNING id INTO v_account_id;
    UPDATE public.cargos SET cuenta_estancia_id=v_account_id,actualizado_at=now(),actualizado_por=auth.uid()
    WHERE reserva_id=p_reserva_id AND hotel_id=v_reserva.hotel_id
      AND id IN (SELECT value::text::uuid FROM jsonb_array_elements_text(COALESCE(p_payload->'charge_ids','[]'::jsonb)));
    UPDATE public.pagos SET cuenta_estancia_id=v_account_id,actualizado_at=now(),actualizado_por=auth.uid(),motivo_cambio=v_reason
    WHERE reserva_id=p_reserva_id AND hotel_id=v_reserva.hotel_id
      AND id IN (SELECT value::text::uuid FROM jsonb_array_elements_text(COALESCE(p_payload->'payment_ids','[]'::jsonb)));
    v_meta := v_meta || jsonb_build_object('account_id',v_account_id);

  ELSIF v_op = 'move_to_account' THEN
    v_account_id := NULLIF(p_payload->>'account_id','')::uuid;
    IF v_account_id IS NOT NULL AND NOT EXISTS(
      SELECT 1 FROM public.cuentas_estancia WHERE id=v_account_id AND reserva_id=p_reserva_id AND estado='Abierta'
    ) THEN RAISE EXCEPTION 'La subcuenta destino no es válida'; END IF;
    UPDATE public.cargos SET cuenta_estancia_id=v_account_id,actualizado_at=now(),actualizado_por=auth.uid()
    WHERE reserva_id=p_reserva_id AND hotel_id=v_reserva.hotel_id
      AND id IN (SELECT value::text::uuid FROM jsonb_array_elements_text(COALESCE(p_payload->'charge_ids','[]'::jsonb)));
    UPDATE public.pagos SET cuenta_estancia_id=v_account_id,actualizado_at=now(),actualizado_por=auth.uid(),motivo_cambio=v_reason
    WHERE reserva_id=p_reserva_id AND hotel_id=v_reserva.hotel_id
      AND id IN (SELECT value::text::uuid FROM jsonb_array_elements_text(COALESCE(p_payload->'payment_ids','[]'::jsonb)));

  ELSIF v_op IN ('no_show','cancel_reservation') THEN
    IF v_is_active OR COALESCE(v_reserva.checkout_realizado,false) THEN
      RAISE EXCEPTION 'Una estancia iniciada no puede cancelarse; registra salida anticipada';
    END IF;
    UPDATE public.reservas SET estado=CASE WHEN v_op='no_show' THEN 'NoShow' ELSE 'Cancelada' END,
      notas_internas=concat_ws(E'\n',NULLIF(notas_internas,''),
        CASE WHEN v_op='no_show' THEN 'No-show: ' ELSE 'Cancelación: ' END || v_reason),
      version_operativa=version_operativa+1,updated_at=now()
    WHERE id=p_reserva_id;

  ELSIF v_op = 'consecutive_reservation' THEN
    v_target_reservation := NULLIF(p_payload->>'next_reservation_id','')::uuid;
    IF NOT EXISTS(
      SELECT 1 FROM public.reservas next_r
      WHERE next_r.id=v_target_reservation AND next_r.hotel_id=v_reserva.hotel_id
        AND next_r.id<>p_reserva_id AND next_r.cliente_id=v_reserva.cliente_id
        AND next_r.fecha_checkin>=v_reserva.fecha_checkout
        AND next_r.estado NOT IN ('Cancelada','NoShow')
    ) THEN RAISE EXCEPTION 'La reservación consecutiva debe ser posterior y del mismo huésped'; END IF;
    UPDATE public.reservas SET reserva_anterior_id=p_reserva_id,
      version_operativa=version_operativa+1,updated_at=now() WHERE id=v_target_reservation;
    v_meta := v_meta || jsonb_build_object('next_reservation_id',v_target_reservation);

  ELSIF v_op = 'reopen_checkout' THEN
    IF NOT v_is_manager THEN RAISE EXCEPTION 'Sólo gerencia puede reabrir un check-out'; END IF;
    IF v_reserva.estado<>'CheckOut' OR NOT COALESCE(v_reserva.checkout_realizado,false) THEN
      RAISE EXCEPTION 'La reservación no tiene un check-out cerrado';
    END IF;
    v_new_checkout := COALESCE(NULLIF(p_payload->>'new_checkout','')::date,v_hotel_today+1);
    IF v_new_checkout<=v_hotel_today THEN RAISE EXCEPTION 'La nueva salida debe ser posterior al día operativo'; END IF;
    IF v_reserva.habitacion_id IS NULL OR NOT public.vulo_room_available_for_stay(
      v_reserva.hotel_id,v_reserva.habitacion_id,v_reserva.id,v_hotel_today,v_new_checkout,false
    ) THEN RAISE EXCEPTION 'La habitación ya está comprometida; reubica antes de reabrir'; END IF;
    UPDATE public.reservas SET fecha_checkout=v_new_checkout,checkout_realizado=false,estado='CheckIn',
      reabierta_at=now(),reabierta_por=auth.uid(),version_operativa=version_operativa+1,updated_at=now()
    WHERE id=p_reserva_id;
    UPDATE public.habitaciones SET estado_habitacion='Ocupada'
    WHERE id=v_reserva.habitacion_id AND hotel_id=v_reserva.hotel_id;

  ELSIF v_op = 'correction_note' THEN
    UPDATE public.reservas SET notas_internas=concat_ws(E'\n',NULLIF(notas_internas,''),'Corrección operativa: '||v_reason),
      version_operativa=version_operativa+1,updated_at=now() WHERE id=p_reserva_id;

  ELSE
    RAISE EXCEPTION 'Operación de estancia no reconocida';
  END IF;

  PERFORM public.recalculate_reservation_financials(p_reserva_id);
  SELECT * INTO v_after FROM public.reservas WHERE id=p_reserva_id;
  v_after_json := to_jsonb(v_after);

  INSERT INTO public.estancia_movimientos(
    hotel_id,reserva_id,operacion,motivo,datos_antes,datos_despues,metadata,
    usuario_id,usuario_email,usuario_nombre,reversible
  )
  SELECT v_reserva.hotel_id,p_reserva_id,v_op,COALESCE(NULLIF(v_reason,''),'Operación registrada'),
    v_before,v_after_json,v_meta,auth.uid(),p.email,
    concat_ws(' ',p.nombre,p.apellido_paterno),
    v_op=ANY(ARRAY['extend_stay','early_departure','modify_dates','reservation_correction',
      'room_change','category_change','late_checkout','rate_change','discount_change',
      'no_show','cancel_reservation'])
  FROM public.profiles p WHERE p.id=auth.uid()
  RETURNING id INTO v_movement_id;

  INSERT INTO public.auditoria(hotel_id,user_id,user_email,accion,entidad,entidad_id,descripcion,datos_antes,datos_despues)
  SELECT v_reserva.hotel_id,auth.uid(),p.email,'ESTANCIA_'||upper(v_op),'reserva',p_reserva_id,
    COALESCE(NULLIF(v_reason,''),'Operación registrada'),v_before,v_after_json
  FROM public.profiles p WHERE p.id=auth.uid();

  RETURN jsonb_build_object('reservation',v_after_json,'movement_id',v_movement_id,'metadata',v_meta);
END;
$b090000_12$;

REVOKE ALL ON FUNCTION public.vulo_apply_stay_operation(uuid,text,jsonb,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vulo_apply_stay_operation(uuid,text,jsonb,text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 9. Las reservaciones no se borran desde la aplicación: se cancelan para
--    conservar quién, cuándo y por qué. (Procesos internos sin sesión, como la
--    baja de un hotel, y el SuperAdmin conservan el borrado.)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.vulo_prevent_reservation_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $b090000_13$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.vulo_is_superadmin() THEN
    RAISE EXCEPTION 'Las reservaciones no se eliminan; cancélalas para conservar el historial';
  END IF;
  RETURN OLD;
END;
$b090000_13$;

REVOKE ALL ON FUNCTION public.vulo_prevent_reservation_delete() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_prevent_reserva_delete ON public.reservas;
CREATE TRIGGER trg_prevent_reserva_delete
BEFORE DELETE ON public.reservas
FOR EACH ROW EXECUTE FUNCTION public.vulo_prevent_reservation_delete();

NOTIFY pgrst, 'reload schema';


-- ===================== 20260924120000_inventario_compras_checkout.sql =====================
-- Inventario, compras y check-out atómicos.
--  * Movimientos de inventario en una sola transacción (sin pérdidas por
--    concurrencia y sin stock negativo).
--  * Recepción de compras una sola vez y con bloqueo de la orden.
--  * Folio de compras único por hotel.
--  * Pagos a proveedor: no exceden el total ni se registran en órdenes canceladas.
--  * Una orden con pagos no se borra; los pagos no se borran en días cerrados.
--  * Check-out sólo sobre estancias activas.
--  * Faltantes de entregables generan cargo.

-- ---------------------------------------------------------------------------
-- 1. Movimiento de inventario atómico
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.vulo_inventory_move(
  p_producto_id uuid,
  p_tipo text,
  p_cantidad numeric,
  p_motivo text DEFAULT NULL,
  p_referencia text DEFAULT NULL,
  p_absoluto boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $b120000_1$
DECLARE
  v_product public.productos%ROWTYPE;
  v_before numeric;
  v_after numeric;
  v_qty numeric := COALESCE(p_cantidad, 0);
  v_tipo text := lower(trim(COALESCE(p_tipo, '')));
  v_move public.movimientos_inventario%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sesión no válida'; END IF;

  SELECT * INTO v_product FROM public.productos
  WHERE id = p_producto_id
    AND (hotel_id = public.vulo_current_hotel_id() OR public.vulo_is_superadmin())
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Producto no encontrado'; END IF;

  v_before := COALESCE(v_product.stock_actual, 0);
  IF p_absoluto THEN
    IF v_qty < 0 THEN RAISE EXCEPTION 'El stock real no puede ser negativo'; END IF;
    v_after := v_qty;
    IF v_after = v_before THEN RETURN NULL; END IF;
    v_tipo := CASE WHEN v_after > v_before THEN 'Entrada' ELSE 'Salida' END;
    v_qty := abs(v_after - v_before);
  ELSE
    IF v_qty <= 0 THEN RAISE EXCEPTION 'La cantidad debe ser mayor a cero'; END IF;
    IF v_tipo = 'salida' THEN
      v_after := v_before - v_qty;
      v_tipo := 'Salida';
    ELSIF v_tipo = 'entrada' THEN
      v_after := v_before + v_qty;
      v_tipo := 'Entrada';
    ELSE
      RAISE EXCEPTION 'Tipo de movimiento no válido';
    END IF;
    IF v_after < 0 THEN
      RAISE EXCEPTION '%: existencia insuficiente. Disponible %, solicitado %', v_product.nombre, v_before, v_qty;
    END IF;
  END IF;

  UPDATE public.productos SET stock_actual = v_after, updated_at = now()
  WHERE id = v_product.id;

  INSERT INTO public.movimientos_inventario(
    producto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, referencia, usuario_id
  ) VALUES (
    v_product.id, v_tipo, v_qty, v_before, v_after,
    COALESCE(NULLIF(trim(p_motivo), ''), CASE WHEN p_absoluto THEN 'Ajuste de stock' ELSE v_tipo END),
    NULLIF(trim(COALESCE(p_referencia, '')), ''),
    auth.uid()
  ) RETURNING * INTO v_move;

  RETURN to_jsonb(v_move);
END;
$b120000_1$;

REVOKE ALL ON FUNCTION public.vulo_inventory_move(uuid, text, numeric, text, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vulo_inventory_move(uuid, text, numeric, text, text, boolean) TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. Folio de compra único por hotel (se asigna en la base)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.vulo_assign_purchase_folio()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $b120000_2$
DECLARE
  v_last integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('compras_folio:' || NEW.hotel_id::text, 0));
  IF NEW.numero_orden IS NULL OR trim(NEW.numero_orden) = ''
     OR EXISTS (SELECT 1 FROM public.compras c
                WHERE c.hotel_id = NEW.hotel_id AND c.numero_orden = NEW.numero_orden
                  AND c.id IS DISTINCT FROM NEW.id) THEN
    SELECT COALESCE(MAX(NULLIF(regexp_replace(numero_orden, '\D', '', 'g'), '')::integer), 0)
    INTO v_last
    FROM public.compras
    WHERE hotel_id = NEW.hotel_id AND numero_orden LIKE 'OC-%';
    NEW.numero_orden := 'OC-' || lpad((v_last + 1)::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$b120000_2$;

REVOKE ALL ON FUNCTION public.vulo_assign_purchase_folio() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_vulo_assign_purchase_folio ON public.compras;
CREATE TRIGGER trg_vulo_assign_purchase_folio
BEFORE INSERT ON public.compras
FOR EACH ROW EXECUTE FUNCTION public.vulo_assign_purchase_folio();

-- ---------------------------------------------------------------------------
-- 3. Recepción de compra: una sola vez, con la orden bloqueada
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.vulo_receive_purchase(p_compra_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $b120000_3$
DECLARE
  v_compra public.compras%ROWTYPE;
  v_item record;
  v_product public.productos%ROWTYPE;
  v_folio text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sesión no válida'; END IF;

  SELECT * INTO v_compra FROM public.compras
  WHERE id = p_compra_id
    AND (hotel_id = public.vulo_current_hotel_id() OR public.vulo_is_superadmin())
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Orden de compra no encontrada'; END IF;
  IF v_compra.estado = 'Recibida' THEN RETURN to_jsonb(v_compra); END IF;
  IF v_compra.estado = 'Cancelada' THEN RAISE EXCEPTION 'Una orden cancelada no puede recibirse'; END IF;

  v_folio := v_compra.numero_orden;

  -- Compatibilidad: órdenes antiguas que ya ingresaron stock al crearse.
  IF v_folio IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.movimientos_inventario m
    JOIN public.productos p ON p.id = m.producto_id AND p.hotel_id = v_compra.hotel_id
    WHERE m.referencia = v_folio AND m.motivo = 'Compra'
  ) THEN
    FOR v_item IN
      SELECT d.producto_id, SUM(COALESCE(d.cantidad, 0)) AS cantidad
      FROM public.compras_detalle d
      WHERE d.compra_id = v_compra.id AND d.producto_id IS NOT NULL
      GROUP BY d.producto_id
      HAVING SUM(COALESCE(d.cantidad, 0)) > 0
    LOOP
      SELECT * INTO v_product FROM public.productos
      WHERE id = v_item.producto_id AND hotel_id = v_compra.hotel_id
      FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'Un producto de la orden ya no existe en el hotel'; END IF;

      UPDATE public.productos
      SET stock_actual = COALESCE(stock_actual, 0) + v_item.cantidad, updated_at = now()
      WHERE id = v_product.id;

      INSERT INTO public.movimientos_inventario(
        producto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, referencia, usuario_id
      ) VALUES (
        v_product.id, 'Entrada', v_item.cantidad, COALESCE(v_product.stock_actual, 0),
        COALESCE(v_product.stock_actual, 0) + v_item.cantidad, 'Compra', v_folio, auth.uid()
      );
    END LOOP;
  END IF;

  UPDATE public.compras SET estado = 'Recibida' WHERE id = v_compra.id
  RETURNING * INTO v_compra;
  RETURN to_jsonb(v_compra);
END;
$b120000_3$;

REVOKE ALL ON FUNCTION public.vulo_receive_purchase(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vulo_receive_purchase(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. Eliminar orden: nunca si está recibida o tiene pagos; las órdenes
--    antiguas que ya habían ingresado stock se revierten con un movimiento.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.vulo_delete_purchase(p_compra_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $b120000_4$
DECLARE
  v_compra public.compras%ROWTYPE;
  v_item record;
  v_product public.productos%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sesión no válida'; END IF;

  SELECT * INTO v_compra FROM public.compras
  WHERE id = p_compra_id
    AND (hotel_id = public.vulo_current_hotel_id() OR public.vulo_is_superadmin())
  FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', true); END IF;
  IF v_compra.estado = 'Recibida' THEN
    RAISE EXCEPTION 'Una orden recibida ya afectó inventario y no debe eliminarse. Usa un ajuste documentado si necesitas corregirla.';
  END IF;
  IF to_regclass('public.pagos_compras') IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.pagos_compras WHERE compra_id = v_compra.id) THEN
    RAISE EXCEPTION 'La orden tiene pagos registrados; elimina o corrige los pagos antes de borrar la orden.';
  END IF;

  IF v_compra.numero_orden IS NOT NULL THEN
    FOR v_item IN
      SELECT m.producto_id, SUM(m.cantidad) AS cantidad
      FROM public.movimientos_inventario m
      JOIN public.productos p ON p.id = m.producto_id AND p.hotel_id = v_compra.hotel_id
      WHERE m.referencia = v_compra.numero_orden AND m.motivo = 'Compra'
      GROUP BY m.producto_id
    LOOP
      SELECT * INTO v_product FROM public.productos WHERE id = v_item.producto_id FOR UPDATE;
      IF COALESCE(v_product.stock_actual, 0) < v_item.cantidad THEN
        RAISE EXCEPTION 'No se puede eliminar esta orden porque parte del stock que generó ya fue consumido. Usa un ajuste de inventario.';
      END IF;
      UPDATE public.productos SET stock_actual = COALESCE(stock_actual, 0) - v_item.cantidad, updated_at = now()
      WHERE id = v_product.id;
      INSERT INTO public.movimientos_inventario(
        producto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, referencia, usuario_id
      ) VALUES (
        v_product.id, 'Salida', v_item.cantidad, COALESCE(v_product.stock_actual, 0),
        COALESCE(v_product.stock_actual, 0) - v_item.cantidad, 'Reverso de compra eliminada',
        v_compra.numero_orden, auth.uid()
      );
    END LOOP;
  END IF;

  DELETE FROM public.compras_detalle WHERE compra_id = v_compra.id;
  DELETE FROM public.compras WHERE id = v_compra.id;
  RETURN jsonb_build_object('ok', true);
END;
$b120000_4$;

REVOKE ALL ON FUNCTION public.vulo_delete_purchase(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vulo_delete_purchase(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 9. Día cerrado según la zona horaria del hotel (antes usaba UTC: un pago a
--    las 20:00 quedaba en el día siguiente y el candado protegía otro día).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.vulo_movement_hotel_date(p_row jsonb, p_hotel_id uuid)
RETURNS date
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $b120000_5$
DECLARE
  v_tz text;
  v_raw text := NULLIF(COALESCE(p_row->>'fecha', p_row->>'created_at'), '');
BEGIN
  SELECT COALESCE(timezone, 'America/Mexico_City') INTO v_tz FROM public.hotels WHERE id = p_hotel_id;
  v_tz := COALESCE(v_tz, 'America/Mexico_City');
  IF v_raw IS NULL THEN RETURN (now() AT TIME ZONE v_tz)::date; END IF;
  -- Fecha sin hora: ya es el día del hotel.
  IF length(v_raw) <= 10 THEN RETURN v_raw::date; END IF;
  RETURN (v_raw::timestamptz AT TIME ZONE v_tz)::date;
END;
$b120000_5$;

CREATE OR REPLACE FUNCTION public.vulo_prevent_closed_day_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $b120000_6$
DECLARE
  v_hotel_id uuid;
  v_fecha date;
  v_old_fecha date;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_hotel_id := OLD.hotel_id;
    v_fecha := public.vulo_movement_hotel_date(to_jsonb(OLD), v_hotel_id);
  ELSE
    v_hotel_id := NEW.hotel_id;
    v_fecha := public.vulo_movement_hotel_date(to_jsonb(NEW), v_hotel_id);
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.cierres_diarios c
    WHERE c.hotel_id = v_hotel_id AND c.fecha_operativa = v_fecha AND c.estado = 'Cerrado'
  ) THEN
    RAISE EXCEPTION 'El día operativo % está cerrado. Reábralo antes de modificar movimientos.', v_fecha
      USING ERRCODE = 'P0001';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    v_old_fecha := public.vulo_movement_hotel_date(to_jsonb(OLD), OLD.hotel_id);
    IF EXISTS (
      SELECT 1 FROM public.cierres_diarios c
      WHERE c.hotel_id = OLD.hotel_id AND c.fecha_operativa = v_old_fecha AND c.estado = 'Cerrado'
    ) THEN
      RAISE EXCEPTION 'El día operativo % está cerrado. Reábralo antes de modificar movimientos.', v_old_fecha
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$b120000_6$;

-- ---------------------------------------------------------------------------
-- 5. Pagos a proveedor
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.vulo_guard_purchase_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $b120000_7$
DECLARE
  v_compra public.compras%ROWTYPE;
  v_paid numeric;
BEGIN
  SELECT * INTO v_compra FROM public.compras WHERE id = NEW.compra_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Orden de compra no encontrada'; END IF;
  IF v_compra.hotel_id <> NEW.hotel_id THEN RAISE EXCEPTION 'La orden pertenece a otro hotel'; END IF;
  IF v_compra.estado = 'Cancelada' THEN RAISE EXCEPTION 'No se pueden registrar pagos en una orden cancelada'; END IF;
  SELECT COALESCE(SUM(monto), 0) INTO v_paid FROM public.pagos_compras
  WHERE compra_id = NEW.compra_id AND id IS DISTINCT FROM NEW.id;
  IF v_paid + COALESCE(NEW.monto, 0) > COALESCE(v_compra.total, 0) + 0.009 THEN
    RAISE EXCEPTION 'El pago excede el saldo de la orden (pendiente %)', GREATEST(0, COALESCE(v_compra.total, 0) - v_paid);
  END IF;
  NEW.created_by := COALESCE(NEW.created_by, auth.uid());
  RETURN NEW;
END;
$b120000_7$;

REVOKE ALL ON FUNCTION public.vulo_guard_purchase_payment() FROM PUBLIC, anon, authenticated;

DO $b120000_8$
BEGIN
  IF to_regclass('public.pagos_compras') IS NULL THEN RETURN; END IF;
  EXECUTE 'DROP TRIGGER IF EXISTS trg_vulo_guard_purchase_payment ON public.pagos_compras';
  EXECUTE 'CREATE TRIGGER trg_vulo_guard_purchase_payment BEFORE INSERT OR UPDATE OF monto, compra_id ON public.pagos_compras FOR EACH ROW EXECUTE FUNCTION public.vulo_guard_purchase_payment()';
  -- Los pagos a proveedor de un día cerrado no se modifican ni se borran.
  EXECUTE 'DROP TRIGGER IF EXISTS prevent_closed_day_pagos_compras ON public.pagos_compras';
  EXECUTE 'CREATE TRIGGER prevent_closed_day_pagos_compras BEFORE INSERT OR UPDATE OR DELETE ON public.pagos_compras FOR EACH ROW EXECUTE FUNCTION public.vulo_prevent_closed_day_change()';
  -- La orden ya no arrastra en cascada sus pagos: se debe decidir explícitamente.
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pagos_compras_compra_id_fkey') THEN
    EXECUTE 'ALTER TABLE public.pagos_compras DROP CONSTRAINT pagos_compras_compra_id_fkey';
  END IF;
  EXECUTE 'ALTER TABLE public.pagos_compras ADD CONSTRAINT pagos_compras_compra_id_fkey FOREIGN KEY (compra_id) REFERENCES public.compras(id) ON DELETE RESTRICT';
END $b120000_8$;

-- ---------------------------------------------------------------------------
-- 6. Check-out sólo sobre estancias activas
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_reservation_checkout(
  p_reserva_id uuid,
  p_pago jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $b120000_9$
DECLARE
  v_reserva public.reservas%ROWTYPE;
BEGIN
  SELECT * INTO v_reserva FROM public.reservas WHERE id = p_reserva_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reserva no encontrada'; END IF;
  IF COALESCE(v_reserva.checkout_realizado, false) OR v_reserva.estado = 'CheckOut' THEN
    RAISE EXCEPTION 'La reserva ya tiene check-out';
  END IF;
  IF v_reserva.estado NOT IN ('CheckIn', 'Hospedado') OR NOT COALESCE(v_reserva.checkin_realizado, false) THEN
    RAISE EXCEPTION 'Sólo se puede hacer check-out de una estancia con check-in (estado actual: %)', v_reserva.estado;
  END IF;

  PERFORM public.recalculate_reservation_financials(p_reserva_id);
  SELECT * INTO v_reserva FROM public.reservas WHERE id = p_reserva_id;

  IF p_pago IS NOT NULL AND COALESCE((p_pago->>'monto')::numeric, 0) > 0 THEN
    IF (p_pago->>'monto')::numeric > GREATEST(COALESCE(v_reserva.saldo_pendiente, 0), 0) + 0.009 THEN
      RAISE EXCEPTION 'El pago excede el saldo pendiente';
    END IF;
    INSERT INTO public.pagos (hotel_id, reserva_id, monto, metodo_pago, referencia, concepto)
    VALUES (
      v_reserva.hotel_id, p_reserva_id, (p_pago->>'monto')::numeric,
      NULLIF(p_pago->>'metodo_pago', ''), NULLIF(p_pago->>'referencia', ''),
      COALESCE(NULLIF(p_pago->>'concepto', ''), 'Pago en Check-out')
    );
  END IF;

  PERFORM public.recalculate_reservation_financials(p_reserva_id);
  SELECT * INTO v_reserva FROM public.reservas WHERE id = p_reserva_id;
  IF COALESCE(v_reserva.saldo_pendiente, 0) > 0.009 THEN
    RAISE EXCEPTION 'La reserva todavía tiene saldo pendiente de %', round(v_reserva.saldo_pendiente, 2);
  END IF;

  UPDATE public.reservas
  SET checkout_realizado = true, estado = 'CheckOut'
  WHERE id = p_reserva_id;

  -- La habitación sólo se libera si no hay otra estancia activa en ella.
  IF v_reserva.habitacion_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.reservas r
    WHERE r.habitacion_id = v_reserva.habitacion_id AND r.id <> p_reserva_id
      AND r.estado IN ('CheckIn', 'Hospedado')
      AND COALESCE(r.checkin_realizado, false) AND NOT COALESCE(r.checkout_realizado, false)
  ) THEN
    UPDATE public.habitaciones
    SET estado_habitacion = 'Disponible', estado_limpieza = 'Sucia'
    WHERE id = v_reserva.habitacion_id AND hotel_id = v_reserva.hotel_id;
  END IF;

  RETURN (SELECT to_jsonb(r) FROM public.reservas r WHERE r.id = p_reserva_id);
END;
$b120000_9$;

REVOKE ALL ON FUNCTION public.complete_reservation_checkout(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_reservation_checkout(uuid, jsonb) TO authenticated;

-- ---------------------------------------------------------------------------
-- 7. Devolución de entregables con cargo por faltantes
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.vulo_return_deliverable_charge(
  p_assignment_id uuid,
  p_cantidad_devuelta numeric,
  p_crear_cargo boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $b120000_10$
DECLARE
  v_assignment jsonb;
  v_row public.entregables_reserva%ROWTYPE;
  v_reserva public.reservas%ROWTYPE;
  v_nombre text;
  v_charge public.cargos%ROWTYPE;
BEGIN
  v_assignment := public.vulo_return_deliverable(p_assignment_id, p_cantidad_devuelta);
  SELECT * INTO v_row FROM public.entregables_reserva WHERE id = p_assignment_id;

  IF p_crear_cargo AND COALESCE(v_row.costo_faltante, 0) > 0 THEN
    SELECT * INTO v_reserva FROM public.reservas WHERE id = v_row.reserva_id;
    SELECT nombre INTO v_nombre FROM public.entregables WHERE id = v_row.entregable_id;
    INSERT INTO public.cargos(hotel_id, reserva_id, habitacion_id, concepto, cantidad, precio_unitario, impuesto, notas)
    VALUES (
      v_reserva.hotel_id, v_reserva.id, v_reserva.habitacion_id,
      'Faltante: ' || COALESCE(v_nombre, 'entregable'),
      1, v_row.costo_faltante, 0,
      'Devueltos ' || p_cantidad_devuelta || ' de ' || COALESCE(v_row.cantidad, 1)
    ) RETURNING * INTO v_charge;
    RETURN v_assignment || jsonb_build_object('cargo', to_jsonb(v_charge));
  END IF;
  RETURN v_assignment;
END;
$b120000_10$;

REVOKE ALL ON FUNCTION public.vulo_return_deliverable_charge(uuid, numeric, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vulo_return_deliverable_charge(uuid, numeric, boolean) TO authenticated;

-- ---------------------------------------------------------------------------
-- 8. Corrección de reserva desde el detalle: también para recepción
--    (cambia fechas/habitación con las mismas validaciones que modify_dates).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.vulo_operation_allowed(p_operacion text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $b120000_11$
DECLARE
  v_role text := COALESCE(public.vulo_current_role(), '');
  v_override boolean;
  v_key text := 'reservas.operacion.' || lower(p_operacion);
BEGIN
  IF v_role IN ('SuperAdmin', 'Admin') THEN RETURN true; END IF;

  SELECT permitido INTO v_override
  FROM public.permisos_hotel
  WHERE hotel_id = public.vulo_current_hotel_id()
    AND rol = v_role AND modulo = v_key
  LIMIT 1;
  IF FOUND THEN RETURN COALESCE(v_override, false); END IF;

  IF v_role = 'Gerente' THEN RETURN true; END IF;
  IF v_role = 'Recepcion' THEN
    RETURN lower(p_operacion) = ANY (ARRAY[
      'extend_stay','early_departure','modify_dates','room_change',
      'late_checkout','early_checkin','add_guest','remove_guest',
      'add_charge','partial_payment','no_show','consecutive_reservation',
      'correction_note','split_account','move_to_account','reservation_correction'
    ]);
  END IF;
  RETURN false;
END;
$b120000_11$;

-- ---------------------------------------------------------------------------
-- 10. Mantenimiento: cerrar un reporte no libera la habitación si quedan
--     otros reportes abiertos.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.vulo_release_room_after_maintenance()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $b120000_12$
DECLARE v_resolved boolean;
BEGIN
  v_resolved := NEW.estado IN ('Completada','Completado','Resuelto','Cerrado');
  IF v_resolved AND OLD.estado IS DISTINCT FROM NEW.estado AND NEW.habitacion_id IS NOT NULL THEN
    NEW.fecha_completado := COALESCE(NEW.fecha_completado, now());
    IF EXISTS (
      SELECT 1 FROM public.tareas_mantenimiento t
      WHERE t.habitacion_id = NEW.habitacion_id AND t.id <> NEW.id
        AND COALESCE(t.estado, 'Pendiente') NOT IN ('Completada','Completado','Resuelto','Cerrado','Cancelada','Cancelado')
    ) THEN
      RETURN NEW;
    END IF;
    UPDATE public.habitaciones h SET estado_mantenimiento='OK',
      estado_habitacion=CASE WHEN h.estado_habitacion IN ('FueraDeServicio','Mantenimiento','Bloqueada')
        AND NOT EXISTS(SELECT 1 FROM public.reservas r WHERE r.habitacion_id=h.id
          AND r.estado IN ('CheckIn','Hospedado') AND COALESCE(r.checkin_realizado,false)
          AND NOT COALESCE(r.checkout_realizado,false)) THEN 'Disponible' ELSE h.estado_habitacion END,
      fuera_servicio_motivo=NULL,fuera_servicio_desde=NULL,fuera_servicio_hasta=NULL
    WHERE h.id=NEW.habitacion_id AND h.hotel_id=NEW.hotel_id;
  END IF;
  RETURN NEW;
END;
$b120000_12$;

NOTIFY pgrst, 'reload schema';


-- ===================== 20260924130000_seguridad_accesos.sql =====================
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

SELECT 'SQL COMPLETO APLICADO' AS resultado;
