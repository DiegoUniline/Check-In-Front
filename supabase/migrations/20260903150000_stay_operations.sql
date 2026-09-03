-- Operaciones integrales de estancia VULO.
-- Centraliza cambios cotidianos en transacciones atómicas, con permisos,
-- prevención de sobreventa, recálculo financiero e historial reversible.

CREATE OR REPLACE FUNCTION public.vulo_current_hotel_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(hotel_activo_id, hotel_id)
  FROM public.profiles
  WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.vulo_is_superadmin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role::text = 'SuperAdmin'
  )
$$;

CREATE OR REPLACE FUNCTION public.vulo_current_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text
  FROM public.user_roles
  WHERE user_id = auth.uid()
  ORDER BY CASE role::text
    WHEN 'SuperAdmin' THEN 1 WHEN 'Admin' THEN 2 WHEN 'Gerente' THEN 3
    WHEN 'Recepcion' THEN 4 WHEN 'Mantenimiento' THEN 5 ELSE 6 END
  LIMIT 1
$$;

ALTER TABLE public.reservas
  ADD COLUMN IF NOT EXISTS hora_checkout time,
  ADD COLUMN IF NOT EXISTS early_checkin_at timestamptz,
  ADD COLUMN IF NOT EXISTS late_checkout_until timestamptz,
  ADD COLUMN IF NOT EXISTS reabierta_at timestamptz,
  ADD COLUMN IF NOT EXISTS reabierta_por uuid,
  ADD COLUMN IF NOT EXISTS reserva_anterior_id uuid,
  ADD COLUMN IF NOT EXISTS impuesto_hospedaje_porcentaje numeric(8,4),
  ADD COLUMN IF NOT EXISTS version_operativa integer NOT NULL DEFAULT 1;

-- Conserva la tasa efectiva usada originalmente para que fechas y tarifas
-- puedan recalcular impuestos sin inventar una política fiscal nueva.
UPDATE public.reservas
SET impuesto_hospedaje_porcentaje = CASE
  WHEN COALESCE(subtotal_hospedaje,0)>0
    THEN ROUND(COALESCE(total_impuestos,0) * 100 / subtotal_hospedaje,4)
  ELSE 0 END
WHERE impuesto_hospedaje_porcentaje IS NULL;

ALTER TABLE public.habitaciones
  ADD COLUMN IF NOT EXISTS fuera_servicio_motivo text,
  ADD COLUMN IF NOT EXISTS fuera_servicio_desde timestamptz,
  ADD COLUMN IF NOT EXISTS fuera_servicio_hasta timestamptz;

ALTER TABLE public.cargos
  ADD COLUMN IF NOT EXISTS estado text NOT NULL DEFAULT 'Activo',
  ADD COLUMN IF NOT EXISTS actualizado_at timestamptz,
  ADD COLUMN IF NOT EXISTS actualizado_por uuid,
  ADD COLUMN IF NOT EXISTS cancelado_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelado_por uuid,
  ADD COLUMN IF NOT EXISTS motivo_cancelacion text;

ALTER TABLE public.pagos
  ADD COLUMN IF NOT EXISTS estado text NOT NULL DEFAULT 'Activo',
  ADD COLUMN IF NOT EXISTS actualizado_at timestamptz,
  ADD COLUMN IF NOT EXISTS actualizado_por uuid,
  ADD COLUMN IF NOT EXISTS motivo_cambio text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reservas_reserva_anterior_id_fkey') THEN
    ALTER TABLE public.reservas ADD CONSTRAINT reservas_reserva_anterior_id_fkey
      FOREIGN KEY (reserva_anterior_id) REFERENCES public.reservas(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cargos_estado_check') THEN
    ALTER TABLE public.cargos ADD CONSTRAINT cargos_estado_check
      CHECK (estado IN ('Activo', 'Cancelado'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pagos_estado_check') THEN
    ALTER TABLE public.pagos ADD CONSTRAINT pagos_estado_check
      CHECK (estado IN ('Activo', 'Cancelado'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.reserva_huespedes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  reserva_id uuid NOT NULL REFERENCES public.reservas(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  apellido_paterno text,
  tipo text NOT NULL DEFAULT 'Adulto' CHECK (tipo IN ('Adulto', 'Menor')),
  documento text,
  genera_cargo boolean NOT NULL DEFAULT false,
  cargo_por_noche numeric(14,2) NOT NULL DEFAULT 0 CHECK (cargo_por_noche >= 0),
  activo boolean NOT NULL DEFAULT true,
  retirado_at timestamptz,
  retirado_por uuid,
  motivo_retiro text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE TABLE IF NOT EXISTS public.cuentas_estancia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  reserva_id uuid NOT NULL REFERENCES public.reservas(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  responsable text,
  estado text NOT NULL DEFAULT 'Abierta' CHECK (estado IN ('Abierta', 'Cerrada')),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

ALTER TABLE public.cargos ADD COLUMN IF NOT EXISTS cuenta_estancia_id uuid;
ALTER TABLE public.pagos ADD COLUMN IF NOT EXISTS cuenta_estancia_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cargos_cuenta_estancia_id_fkey') THEN
    ALTER TABLE public.cargos ADD CONSTRAINT cargos_cuenta_estancia_id_fkey
      FOREIGN KEY (cuenta_estancia_id) REFERENCES public.cuentas_estancia(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pagos_cuenta_estancia_id_fkey') THEN
    ALTER TABLE public.pagos ADD CONSTRAINT pagos_cuenta_estancia_id_fkey
      FOREIGN KEY (cuenta_estancia_id) REFERENCES public.cuentas_estancia(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.estancia_movimientos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  reserva_id uuid NOT NULL REFERENCES public.reservas(id) ON DELETE CASCADE,
  operacion text NOT NULL,
  motivo text NOT NULL,
  datos_antes jsonb NOT NULL DEFAULT '{}'::jsonb,
  datos_despues jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  usuario_id uuid,
  usuario_email text,
  usuario_nombre text,
  reversible boolean NOT NULL DEFAULT false,
  revertido boolean NOT NULL DEFAULT false,
  revertido_at timestamptz,
  revertido_por uuid,
  motivo_reversion text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS estancia_movimientos_reserva_idx
  ON public.estancia_movimientos(reserva_id, created_at DESC);
CREATE INDEX IF NOT EXISTS reserva_huespedes_reserva_idx
  ON public.reserva_huespedes(reserva_id, activo);
CREATE INDEX IF NOT EXISTS cuentas_estancia_reserva_idx
  ON public.cuentas_estancia(reserva_id, estado);
CREATE INDEX IF NOT EXISTS cargos_cuenta_estancia_idx ON public.cargos(cuenta_estancia_id);
CREATE INDEX IF NOT EXISTS pagos_cuenta_estancia_idx ON public.pagos(cuenta_estancia_id);

ALTER TABLE public.reserva_huespedes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cuentas_estancia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estancia_movimientos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hotel_reserva_huespedes" ON public.reserva_huespedes;
CREATE POLICY "hotel_reserva_huespedes" ON public.reserva_huespedes FOR ALL TO authenticated
  USING (hotel_id = public.vulo_current_hotel_id() OR public.vulo_is_superadmin())
  WITH CHECK (hotel_id = public.vulo_current_hotel_id() OR public.vulo_is_superadmin());
DROP POLICY IF EXISTS "hotel_cuentas_estancia" ON public.cuentas_estancia;
CREATE POLICY "hotel_cuentas_estancia" ON public.cuentas_estancia FOR ALL TO authenticated
  USING (hotel_id = public.vulo_current_hotel_id() OR public.vulo_is_superadmin())
  WITH CHECK (hotel_id = public.vulo_current_hotel_id() OR public.vulo_is_superadmin());
DROP POLICY IF EXISTS "hotel_estancia_movimientos_select" ON public.estancia_movimientos;
CREATE POLICY "hotel_estancia_movimientos_select" ON public.estancia_movimientos FOR SELECT TO authenticated
  USING (hotel_id = public.vulo_current_hotel_id() OR public.vulo_is_superadmin());

-- Los movimientos sólo se insertan/modifican mediante las funciones auditadas.
REVOKE INSERT, UPDATE, DELETE ON public.estancia_movimientos FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.reserva_huespedes FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.cuentas_estancia FROM authenticated;

CREATE OR REPLACE FUNCTION public.vulo_operation_allowed(p_operacion text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
      'correction_note','split_account','move_to_account'
    ]);
  END IF;
  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.vulo_operation_allowed(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vulo_operation_allowed(text) TO authenticated;

-- Recalcula solamente movimientos financieros activos; los cancelados se
-- conservan para auditoría pero dejan de afectar el saldo.
CREATE OR REPLACE FUNCTION public.recalculate_reservation_financials(p_reserva_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reserva public.reservas%ROWTYPE;
  v_noches integer;
  v_hospedaje numeric;
  v_cargos numeric;
  v_pagado numeric;
  v_base numeric;
  v_descuento numeric;
  v_impuestos numeric;
BEGIN
  SELECT * INTO v_reserva FROM public.reservas WHERE id = p_reserva_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;

  v_noches := GREATEST(1, v_reserva.fecha_checkout - v_reserva.fecha_checkin);
  v_hospedaje := v_noches * COALESCE(v_reserva.tarifa_noche, 0)
    + v_noches * COALESCE(v_reserva.personas_extra, 0) * COALESCE(v_reserva.cargo_persona_extra, 0);

  SELECT COALESCE(SUM(COALESCE(total, subtotal + impuesto, 0)), 0) INTO v_cargos
  FROM public.cargos WHERE reserva_id = p_reserva_id AND COALESCE(estado, 'Activo') = 'Activo';
  SELECT COALESCE(SUM(monto), 0) INTO v_pagado
  FROM public.pagos WHERE reserva_id = p_reserva_id AND COALESCE(estado, 'Activo') = 'Activo';

  v_impuestos := CASE WHEN v_reserva.impuesto_hospedaje_porcentaje IS NOT NULL
    THEN v_hospedaje * GREATEST(0,v_reserva.impuesto_hospedaje_porcentaje) / 100.0
    ELSE COALESCE(v_reserva.total_impuestos,0) END;
  v_base := GREATEST(0, v_hospedaje + v_cargos + v_impuestos);
  IF lower(COALESCE(v_reserva.descuento_tipo, '')) LIKE 'porc%' THEN
    v_descuento := v_base * GREATEST(0, COALESCE(v_reserva.descuento_valor, 0)) / 100.0;
  ELSIF lower(COALESCE(v_reserva.descuento_tipo, '')) LIKE 'monto%' THEN
    v_descuento := GREATEST(0, COALESCE(v_reserva.descuento_valor, 0));
  ELSE
    v_descuento := GREATEST(0, COALESCE(v_reserva.descuento, 0));
  END IF;
  v_descuento := LEAST(v_base, v_descuento);

  UPDATE public.reservas SET
    noches = v_noches,
    subtotal_hospedaje = v_hospedaje,
    total_impuestos = v_impuestos,
    descuento = v_descuento,
    total = GREATEST(0, v_base - v_descuento),
    total_pagado = v_pagado,
    -- Un valor negativo representa crédito a favor del huésped después de una
    -- salida anticipada, descuento o corrección; no se pierde como cero.
    saldo_pendiente = v_base - v_descuento - v_pagado,
    updated_at = now()
  WHERE id = p_reserva_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_reservation_overpayment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_total numeric; v_pagado numeric;
BEGIN
  IF NEW.reserva_id IS NULL OR COALESCE(NEW.estado, 'Activo') = 'Cancelado' THEN RETURN NEW; END IF;
  IF COALESCE(NEW.monto, 0) <= 0 THEN RAISE EXCEPTION 'El monto del pago debe ser mayor a cero'; END IF;
  SELECT total INTO v_total FROM public.reservas WHERE id = NEW.reserva_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reserva no encontrada'; END IF;
  SELECT COALESCE(SUM(monto), 0) INTO v_pagado FROM public.pagos
  WHERE reserva_id = NEW.reserva_id AND id IS DISTINCT FROM NEW.id
    AND COALESCE(estado, 'Activo') = 'Activo';
  IF v_pagado + NEW.monto > COALESCE(v_total, 0) + 0.009 THEN
    RAISE EXCEPTION 'El pago excede el saldo pendiente de la reserva';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_reservation_overpayment ON public.pagos;
CREATE TRIGGER trg_prevent_reservation_overpayment
BEFORE INSERT OR UPDATE OF reserva_id, monto, estado ON public.pagos
FOR EACH ROW EXECUTE FUNCTION public.prevent_reservation_overpayment();

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
AS $$
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
          AND r.fecha_checkin < p_hasta
          AND r.fecha_checkout > p_desde
      )
  )
$$;

REVOKE ALL ON FUNCTION public.vulo_room_available_for_stay(uuid, uuid, uuid, date, date, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vulo_room_available_for_stay(uuid, uuid, uuid, date, date, boolean) TO authenticated;

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
AS $$
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
    IF v_new_checkout <= v_new_checkin THEN
      RAISE EXCEPTION 'La fecha de salida debe ser posterior a la entrada';
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
    IF v_hotel_today<>v_reserva.fecha_checkin THEN
      RAISE EXCEPTION 'El early check-in sólo puede registrarse el día de entrada';
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
$$;

REVOKE ALL ON FUNCTION public.vulo_apply_stay_operation(uuid,text,jsonb,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vulo_apply_stay_operation(uuid,text,jsonb,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.vulo_reverse_stay_operation(p_movement_id uuid,p_motivo text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE
  v_move public.estancia_movimientos%ROWTYPE;
  v_current public.reservas%ROWTYPE;
  v_before jsonb;
  v_old_room uuid;
  v_current_room uuid;
  v_active boolean;
BEGIN
  IF auth.uid() IS NULL OR COALESCE(public.vulo_current_role(),'') NOT IN ('SuperAdmin','Admin','Gerente') THEN
    RAISE EXCEPTION 'Sólo gerencia puede revertir operaciones';
  END IF;
  IF length(trim(COALESCE(p_motivo,'')))<3 THEN RAISE EXCEPTION 'Escribe el motivo de la reversión'; END IF;
  SELECT * INTO v_move FROM public.estancia_movimientos
  WHERE id=p_movement_id AND (hotel_id=public.vulo_current_hotel_id() OR public.vulo_is_superadmin()) FOR UPDATE;
  IF NOT FOUND OR NOT v_move.reversible OR v_move.revertido THEN RAISE EXCEPTION 'El movimiento no puede revertirse'; END IF;
  IF EXISTS(SELECT 1 FROM public.estancia_movimientos m WHERE m.reserva_id=v_move.reserva_id
    AND m.created_at>v_move.created_at AND NOT m.revertido) THEN
    RAISE EXCEPTION 'Primero revierte los movimientos posteriores';
  END IF;
  SELECT * INTO v_current FROM public.reservas WHERE id=v_move.reserva_id FOR UPDATE;
  v_before:=to_jsonb(v_current);
  v_old_room:=NULLIF(v_move.datos_antes->>'habitacion_id','')::uuid;
  v_current_room:=v_current.habitacion_id;
  v_active:=COALESCE((v_move.datos_antes->>'checkin_realizado')::boolean,false)
    AND NOT COALESCE((v_move.datos_antes->>'checkout_realizado')::boolean,false);
  IF v_old_room IS DISTINCT FROM v_current_room AND v_old_room IS NOT NULL
    AND NOT public.vulo_room_available_for_stay(v_move.hotel_id,v_old_room,v_move.reserva_id,
      (v_move.datos_antes->>'fecha_checkin')::date,(v_move.datos_antes->>'fecha_checkout')::date,v_active) THEN
    RAISE EXCEPTION 'La habitación anterior ya no está disponible';
  END IF;

  UPDATE public.reservas SET
    fecha_checkin=(v_move.datos_antes->>'fecha_checkin')::date,
    fecha_checkout=(v_move.datos_antes->>'fecha_checkout')::date,
    habitacion_id=NULLIF(v_move.datos_antes->>'habitacion_id','')::uuid,
    tipo_habitacion_id=NULLIF(v_move.datos_antes->>'tipo_habitacion_id','')::uuid,
    tarifa_noche=COALESCE((v_move.datos_antes->>'tarifa_noche')::numeric,0),
    descuento_tipo=NULLIF(v_move.datos_antes->>'descuento_tipo',''),
    descuento_valor=COALESCE((v_move.datos_antes->>'descuento_valor')::numeric,0),
    descuento=COALESCE((v_move.datos_antes->>'descuento')::numeric,0),
    adultos=COALESCE((v_move.datos_antes->>'adultos')::integer,1),
    ninos=COALESCE((v_move.datos_antes->>'ninos')::integer,0),
    personas_extra=COALESCE((v_move.datos_antes->>'personas_extra')::integer,0),
    cargo_persona_extra=COALESCE((v_move.datos_antes->>'cargo_persona_extra')::numeric,0),
    checkin_realizado=COALESCE((v_move.datos_antes->>'checkin_realizado')::boolean,false),
    checkout_realizado=COALESCE((v_move.datos_antes->>'checkout_realizado')::boolean,false),
    estado=v_move.datos_antes->>'estado',hora_checkout=NULLIF(v_move.datos_antes->>'hora_checkout','')::time,
    early_checkin_at=NULLIF(v_move.datos_antes->>'early_checkin_at','')::timestamptz,
    late_checkout_until=NULLIF(v_move.datos_antes->>'late_checkout_until','')::timestamptz,
    reabierta_at=NULLIF(v_move.datos_antes->>'reabierta_at','')::timestamptz,
    reabierta_por=NULLIF(v_move.datos_antes->>'reabierta_por','')::uuid,
    version_operativa=version_operativa+1,updated_at=now()
  WHERE id=v_move.reserva_id;

  IF v_old_room IS DISTINCT FROM v_current_room AND v_active THEN
    UPDATE public.habitaciones SET estado_habitacion='Disponible',estado_limpieza='Sucia'
    WHERE id=v_current_room AND hotel_id=v_move.hotel_id;
    UPDATE public.habitaciones SET estado_habitacion='Ocupada'
    WHERE id=v_old_room AND hotel_id=v_move.hotel_id;
  END IF;
  PERFORM public.recalculate_reservation_financials(v_move.reserva_id);
  IF NULLIF(v_move.metadata->>'charge_id','') IS NOT NULL THEN
    UPDATE public.cargos SET estado='Cancelado',cancelado_at=now(),cancelado_por=auth.uid(),
      motivo_cancelacion='Reversión: '||trim(p_motivo),actualizado_at=now(),actualizado_por=auth.uid()
    WHERE id=(v_move.metadata->>'charge_id')::uuid AND reserva_id=v_move.reserva_id
      AND COALESCE(estado,'Activo')='Activo';
  END IF;
  PERFORM public.recalculate_reservation_financials(v_move.reserva_id);
  UPDATE public.estancia_movimientos SET revertido=true,revertido_at=now(),revertido_por=auth.uid(),
    motivo_reversion=trim(p_motivo) WHERE id=v_move.id;
  INSERT INTO public.estancia_movimientos(hotel_id,reserva_id,operacion,motivo,datos_antes,datos_despues,
    metadata,usuario_id,usuario_email,usuario_nombre,reversible)
  SELECT v_move.hotel_id,v_move.reserva_id,'reverse_'||v_move.operacion,trim(p_motivo),v_before,to_jsonb(r),
    jsonb_build_object('movement_reversed',v_move.id),auth.uid(),p.email,concat_ws(' ',p.nombre,p.apellido_paterno),false
  FROM public.reservas r CROSS JOIN public.profiles p WHERE r.id=v_move.reserva_id AND p.id=auth.uid();
  INSERT INTO public.auditoria(hotel_id,user_id,user_email,accion,entidad,entidad_id,descripcion,datos_antes,datos_despues)
  SELECT v_move.hotel_id,auth.uid(),p.email,'ESTANCIA_REVERSION','reserva',v_move.reserva_id,trim(p_motivo),v_before,to_jsonb(r)
  FROM public.reservas r CROSS JOIN public.profiles p WHERE r.id=v_move.reserva_id AND p.id=auth.uid();
  RETURN (SELECT to_jsonb(r) FROM public.reservas r WHERE r.id=v_move.reserva_id);
END;
$$;

REVOKE ALL ON FUNCTION public.vulo_reverse_stay_operation(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vulo_reverse_stay_operation(uuid,text) TO authenticated;

-- Las correcciones financieras se cancelan; nunca se borra su historia.
CREATE OR REPLACE FUNCTION public.vulo_prevent_financial_hard_delete()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'No se puede eliminar este movimiento; cancélalo para conservar la trazabilidad';
END;
$$;
DROP TRIGGER IF EXISTS trg_prevent_cargo_delete ON public.cargos;
CREATE TRIGGER trg_prevent_cargo_delete BEFORE DELETE ON public.cargos
FOR EACH ROW EXECUTE FUNCTION public.vulo_prevent_financial_hard_delete();

CREATE OR REPLACE FUNCTION public.vulo_guard_financial_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF auth.uid() IS NOT NULL
    AND COALESCE(public.vulo_current_role(),'') NOT IN ('SuperAdmin','Admin','Gerente')
    AND COALESCE(current_setting('vulo.stay_operation',true),'')='' THEN
    RAISE EXCEPTION 'Esta corrección requiere una operación auditada o autorización de gerencia';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_cargo_update ON public.cargos;
CREATE TRIGGER trg_guard_cargo_update BEFORE UPDATE ON public.cargos
FOR EACH ROW EXECUTE FUNCTION public.vulo_guard_financial_update();
DROP TRIGGER IF EXISTS trg_guard_pago_update ON public.pagos;
CREATE TRIGGER trg_guard_pago_update BEFORE UPDATE ON public.pagos
FOR EACH ROW EXECUTE FUNCTION public.vulo_guard_financial_update();
DROP TRIGGER IF EXISTS trg_prevent_pago_delete ON public.pagos;
CREATE TRIGGER trg_prevent_pago_delete BEFORE DELETE ON public.pagos
FOR EACH ROW EXECUTE FUNCTION public.vulo_prevent_financial_hard_delete();

-- Red de seguridad: también audita cambios hechos por pantallas antiguas o
-- procesos automáticos que todavía actualizan directamente estas tablas.
CREATE OR REPLACE FUNCTION public.vulo_audit_reservation_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF (OLD.fecha_checkin,OLD.fecha_checkout,OLD.habitacion_id,OLD.tipo_habitacion_id,
      OLD.tarifa_noche,OLD.descuento,OLD.descuento_tipo,OLD.descuento_valor,
      OLD.estado,OLD.checkin_realizado,OLD.checkout_realizado)
    IS DISTINCT FROM
     (NEW.fecha_checkin,NEW.fecha_checkout,NEW.habitacion_id,NEW.tipo_habitacion_id,
      NEW.tarifa_noche,NEW.descuento,NEW.descuento_tipo,NEW.descuento_valor,
      NEW.estado,NEW.checkin_realizado,NEW.checkout_realizado) THEN
    INSERT INTO public.auditoria(hotel_id,user_id,user_email,accion,entidad,entidad_id,descripcion,datos_antes,datos_despues)
    VALUES(NEW.hotel_id,auth.uid(),(SELECT email FROM public.profiles WHERE id=auth.uid()),
      'RESERVA_CAMBIO','reserva',NEW.id,'Cambio operativo de reservación',to_jsonb(OLD),to_jsonb(NEW));
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_vulo_audit_reservation_change ON public.reservas;
CREATE TRIGGER trg_vulo_audit_reservation_change AFTER UPDATE ON public.reservas
FOR EACH ROW EXECUTE FUNCTION public.vulo_audit_reservation_change();

CREATE OR REPLACE FUNCTION public.vulo_audit_financial_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_row jsonb:=to_jsonb(NEW); v_old jsonb:=CASE WHEN TG_OP='UPDATE' THEN to_jsonb(OLD) ELSE NULL END;
BEGIN
  INSERT INTO public.auditoria(hotel_id,user_id,user_email,accion,entidad,entidad_id,descripcion,datos_antes,datos_despues)
  VALUES((v_row->>'hotel_id')::uuid,auth.uid(),(SELECT email FROM public.profiles WHERE id=auth.uid()),
    upper(TG_OP)||'_'||upper(TG_TABLE_NAME),TG_TABLE_NAME,v_row->>'id',
    'Movimiento financiero conservado',v_old,v_row);
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_vulo_audit_charge ON public.cargos;
CREATE TRIGGER trg_vulo_audit_charge AFTER INSERT OR UPDATE ON public.cargos
FOR EACH ROW EXECUTE FUNCTION public.vulo_audit_financial_change();
DROP TRIGGER IF EXISTS trg_vulo_audit_payment ON public.pagos;
CREATE TRIGGER trg_vulo_audit_payment AFTER INSERT OR UPDATE ON public.pagos
FOR EACH ROW EXECUTE FUNCTION public.vulo_audit_financial_change();

CREATE OR REPLACE FUNCTION public.vulo_release_room_after_maintenance()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_resolved boolean;
BEGIN
  v_resolved:=NEW.estado IN ('Completada','Completado','Resuelto','Cerrado');
  IF v_resolved AND OLD.estado IS DISTINCT FROM NEW.estado AND NEW.habitacion_id IS NOT NULL THEN
    NEW.fecha_completado:=COALESCE(NEW.fecha_completado,now());
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
$$;
DROP TRIGGER IF EXISTS trg_release_room_after_maintenance ON public.tareas_mantenimiento;
CREATE TRIGGER trg_release_room_after_maintenance BEFORE UPDATE OF estado ON public.tareas_mantenimiento
FOR EACH ROW EXECUTE FUNCTION public.vulo_release_room_after_maintenance();

UPDATE public.cargos SET estado='Activo' WHERE estado IS NULL;
UPDATE public.pagos SET estado='Activo' WHERE estado IS NULL;
