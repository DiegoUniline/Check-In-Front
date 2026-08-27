-- Integridad central de reservas, cargos, pagos y disponibilidad.
-- Todas las estancias usan rango [check-in, check-out): el día de salida queda libre.

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
  v_total numeric;
BEGIN
  SELECT * INTO v_reserva
  FROM public.reservas
  WHERE id = p_reserva_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_noches := GREATEST(1, v_reserva.fecha_checkout - v_reserva.fecha_checkin);
  v_hospedaje :=
    v_noches * COALESCE(v_reserva.tarifa_noche, 0)
    + v_noches * COALESCE(v_reserva.personas_extra, 0) * COALESCE(v_reserva.cargo_persona_extra, 0);

  SELECT COALESCE(SUM(COALESCE(total, subtotal + impuesto, 0)), 0)
  INTO v_cargos
  FROM public.cargos
  WHERE reserva_id = p_reserva_id;

  SELECT COALESCE(SUM(monto), 0)
  INTO v_pagado
  FROM public.pagos
  WHERE reserva_id = p_reserva_id;

  v_base := GREATEST(0, v_hospedaje + v_cargos + COALESCE(v_reserva.total_impuestos, 0));

  IF lower(COALESCE(v_reserva.descuento_tipo, '')) LIKE 'porc%'
     AND COALESCE(v_reserva.descuento_valor, 0) > 0 THEN
    v_descuento := v_base * (v_reserva.descuento_valor / 100.0);
  ELSIF lower(COALESCE(v_reserva.descuento_tipo, '')) LIKE 'monto%'
        AND COALESCE(v_reserva.descuento_valor, 0) > 0 THEN
    v_descuento := v_reserva.descuento_valor;
  ELSE
    v_descuento := COALESCE(v_reserva.descuento, 0);
  END IF;

  v_descuento := LEAST(v_base, GREATEST(0, v_descuento));
  v_total := GREATEST(0, v_base - v_descuento);

  UPDATE public.reservas
  SET noches = v_noches,
      subtotal_hospedaje = v_hospedaje,
      descuento = v_descuento,
      total = v_total,
      total_pagado = v_pagado,
      saldo_pendiente = GREATEST(0, v_total - v_pagado),
      updated_at = now()
  WHERE id = p_reserva_id;
END;
$$;

REVOKE ALL ON FUNCTION public.recalculate_reservation_financials(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.normalize_reservation_charge()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.cantidad := GREATEST(1, COALESCE(NEW.cantidad, 1));
  NEW.precio_unitario := GREATEST(0, COALESCE(NEW.precio_unitario, 0));
  NEW.impuesto := GREATEST(0, COALESCE(NEW.impuesto, 0));
  NEW.subtotal := NEW.cantidad * NEW.precio_unitario;
  NEW.total := NEW.subtotal + NEW.impuesto;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_reservation_charge ON public.cargos;
CREATE TRIGGER trg_normalize_reservation_charge
BEFORE INSERT OR UPDATE OF cantidad, precio_unitario, impuesto
ON public.cargos
FOR EACH ROW
EXECUTE FUNCTION public.normalize_reservation_charge();

CREATE OR REPLACE FUNCTION public.refresh_reservation_from_child()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_id uuid;
  v_old_id uuid;
BEGIN
  IF TG_OP <> 'DELETE' THEN v_new_id := NEW.reserva_id; END IF;
  IF TG_OP <> 'INSERT' THEN v_old_id := OLD.reserva_id; END IF;

  IF v_old_id IS NOT NULL AND v_old_id IS DISTINCT FROM v_new_id THEN
    PERFORM public.recalculate_reservation_financials(v_old_id);
  END IF;
  IF v_new_id IS NOT NULL THEN
    PERFORM public.recalculate_reservation_financials(v_new_id);
  ELSIF v_old_id IS NOT NULL THEN
    PERFORM public.recalculate_reservation_financials(v_old_id);
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_reservation_from_child() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_refresh_reservation_from_charge ON public.cargos;
CREATE TRIGGER trg_refresh_reservation_from_charge
AFTER INSERT OR UPDATE OR DELETE ON public.cargos
FOR EACH ROW
EXECUTE FUNCTION public.refresh_reservation_from_child();

DROP TRIGGER IF EXISTS trg_refresh_reservation_from_payment ON public.pagos;
CREATE TRIGGER trg_refresh_reservation_from_payment
AFTER INSERT OR UPDATE OR DELETE ON public.pagos
FOR EACH ROW
EXECUTE FUNCTION public.refresh_reservation_from_child();

CREATE OR REPLACE FUNCTION public.prevent_reservation_overpayment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total numeric;
  v_pagado numeric;
BEGIN
  IF NEW.reserva_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF COALESCE(NEW.monto, 0) <= 0 THEN
    RAISE EXCEPTION 'El monto del pago debe ser mayor a cero';
  END IF;

  SELECT total INTO v_total
  FROM public.reservas
  WHERE id = NEW.reserva_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reserva no encontrada';
  END IF;

  SELECT COALESCE(SUM(monto), 0) INTO v_pagado
  FROM public.pagos
  WHERE reserva_id = NEW.reserva_id
    AND id IS DISTINCT FROM NEW.id;

  IF v_pagado + NEW.monto > COALESCE(v_total, 0) + 0.009 THEN
    RAISE EXCEPTION 'El pago excede el saldo pendiente de la reserva';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_reservation_overpayment() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_prevent_reservation_overpayment ON public.pagos;
CREATE TRIGGER trg_prevent_reservation_overpayment
BEFORE INSERT OR UPDATE OF reserva_id, monto ON public.pagos
FOR EACH ROW
EXECUTE FUNCTION public.prevent_reservation_overpayment();

CREATE OR REPLACE FUNCTION public.refresh_reservation_from_stay()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- El recálculo actualiza columnas de la misma fila; evita reentrar al trigger.
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;
  PERFORM public.recalculate_reservation_financials(NEW.id);
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_reservation_from_stay() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_refresh_reservation_after_insert ON public.reservas;
CREATE TRIGGER trg_refresh_reservation_after_insert
AFTER INSERT ON public.reservas
FOR EACH ROW
EXECUTE FUNCTION public.refresh_reservation_from_stay();

DROP TRIGGER IF EXISTS trg_refresh_reservation_after_stay_change ON public.reservas;
CREATE TRIGGER trg_refresh_reservation_after_stay_change
AFTER UPDATE OF fecha_checkin, fecha_checkout, tarifa_noche, personas_extra,
  cargo_persona_extra, total_impuestos, descuento, descuento_tipo, descuento_valor
ON public.reservas
FOR EACH ROW
EXECUTE FUNCTION public.refresh_reservation_from_stay();

CREATE OR REPLACE FUNCTION public.prevent_active_reservation_overlap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.fecha_checkout <= NEW.fecha_checkin THEN
    RAISE EXCEPTION 'La fecha de check-out debe ser posterior al check-in';
  END IF;

  IF NEW.habitacion_id IS NULL
     OR NEW.estado NOT IN ('Pendiente', 'Confirmada', 'CheckIn', 'Hospedado') THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(NEW.hotel_id::text || ':' || NEW.habitacion_id::text, 0)
  );

  IF EXISTS (
    SELECT 1
    FROM public.reservas r
    WHERE r.hotel_id = NEW.hotel_id
      AND r.habitacion_id = NEW.habitacion_id
      AND r.id IS DISTINCT FROM NEW.id
      AND r.estado IN ('Pendiente', 'Confirmada', 'CheckIn', 'Hospedado')
      AND r.fecha_checkin < NEW.fecha_checkout
      AND r.fecha_checkout > NEW.fecha_checkin
  ) THEN
    RAISE EXCEPTION 'La habitación ya tiene una reserva que se cruza con esas fechas';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_active_reservation_overlap() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_prevent_active_reservation_overlap ON public.reservas;
CREATE TRIGGER trg_prevent_active_reservation_overlap
BEFORE INSERT OR UPDATE OF hotel_id, habitacion_id, fecha_checkin, fecha_checkout, estado
ON public.reservas
FOR EACH ROW
EXECUTE FUNCTION public.prevent_active_reservation_overlap();

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
AS $$
DECLARE
  v_hotel_id uuid := (p_reserva->>'hotel_id')::uuid;
  v_cliente_id uuid := (NULLIF(p_reserva->>'cliente_id', ''))::uuid;
  v_reserva public.reservas%ROWTYPE;
  v_item jsonb;
  v_habitacion_id uuid := (NULLIF(p_reserva->>'habitacion_id', ''))::uuid;
BEGIN
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

  IF p_checkin AND NOT EXISTS (
    SELECT 1
    FROM public.habitaciones h
    WHERE h.id = v_habitacion_id
      AND h.hotel_id = v_hotel_id
      AND h.estado_habitacion = 'Disponible'
      AND lower(COALESCE(h.estado_limpieza, 'Limpia')) = 'limpia'
      AND lower(COALESCE(h.estado_mantenimiento, 'OK')) = 'ok'
  ) THEN
    RAISE EXCEPTION 'La habitación ya no está lista para recibir al huésped';
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
    (p_reserva->>'fecha_checkin')::date,
    (p_reserva->>'fecha_checkout')::date,
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
  RETURN (SELECT to_jsonb(r) FROM public.reservas r WHERE r.id = v_reserva.id);
END;
$$;

REVOKE ALL ON FUNCTION public.create_reservation_bundle(jsonb, jsonb, jsonb, jsonb, jsonb, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_reservation_bundle(jsonb, jsonb, jsonb, jsonb, jsonb, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.complete_reservation_checkin(
  p_reserva_id uuid,
  p_habitacion_id uuid,
  p_pagos jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_reserva public.reservas%ROWTYPE;
  v_item jsonb;
BEGIN
  SELECT * INTO v_reserva FROM public.reservas WHERE id = p_reserva_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reserva no encontrada'; END IF;
  IF v_reserva.estado IN ('Cancelada', 'NoShow', 'CheckOut') THEN
    RAISE EXCEPTION 'No se puede hacer check-in a esta reserva';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.habitaciones h
    WHERE h.id = p_habitacion_id
      AND h.hotel_id = v_reserva.hotel_id
      AND h.estado_habitacion = 'Disponible'
      AND lower(COALESCE(h.estado_limpieza, 'Limpia')) = 'limpia'
      AND lower(COALESCE(h.estado_mantenimiento, 'OK')) = 'ok'
  ) THEN
    RAISE EXCEPTION 'La habitación ya no está lista para recibir al huésped';
  END IF;

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

  UPDATE public.reservas
  SET habitacion_id = p_habitacion_id, checkin_realizado = true, estado = 'CheckIn'
  WHERE id = p_reserva_id;
  UPDATE public.habitaciones SET estado_habitacion = 'Ocupada'
  WHERE id = p_habitacion_id AND hotel_id = v_reserva.hotel_id;

  PERFORM public.recalculate_reservation_financials(p_reserva_id);
  SELECT * INTO v_reserva FROM public.reservas WHERE id = p_reserva_id;
  IF COALESCE(v_reserva.total_pagado, 0) > COALESCE(v_reserva.total, 0) + 0.009 THEN
    RAISE EXCEPTION 'Los pagos exceden el total de la reserva';
  END IF;

  RETURN (SELECT to_jsonb(r) FROM public.reservas r WHERE r.id = p_reserva_id);
END;
$$;

REVOKE ALL ON FUNCTION public.complete_reservation_checkin(uuid, uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_reservation_checkin(uuid, uuid, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.complete_reservation_checkout(
  p_reserva_id uuid,
  p_pago jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_reserva public.reservas%ROWTYPE;
BEGIN
  SELECT * INTO v_reserva FROM public.reservas WHERE id = p_reserva_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reserva no encontrada'; END IF;

  PERFORM public.recalculate_reservation_financials(p_reserva_id);
  SELECT * INTO v_reserva FROM public.reservas WHERE id = p_reserva_id;

  IF p_pago IS NOT NULL AND COALESCE((p_pago->>'monto')::numeric, 0) > 0 THEN
    IF (p_pago->>'monto')::numeric > COALESCE(v_reserva.saldo_pendiente, 0) + 0.009 THEN
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
    RAISE EXCEPTION 'La reserva todavía tiene saldo pendiente';
  END IF;

  UPDATE public.reservas
  SET checkout_realizado = true, estado = 'CheckOut'
  WHERE id = p_reserva_id;
  IF v_reserva.habitacion_id IS NOT NULL THEN
    UPDATE public.habitaciones
    SET estado_habitacion = 'Disponible', estado_limpieza = 'Sucia'
    WHERE id = v_reserva.habitacion_id AND hotel_id = v_reserva.hotel_id;
  END IF;

  RETURN (SELECT to_jsonb(r) FROM public.reservas r WHERE r.id = p_reserva_id);
END;
$$;

REVOKE ALL ON FUNCTION public.complete_reservation_checkout(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_reservation_checkout(uuid, jsonb) TO authenticated;

-- Reserva pública atómica: si falla la disponibilidad, no deja un cliente huérfano.
CREATE OR REPLACE FUNCTION public.create_public_reservation(
  p_hotel_id uuid,
  p_cliente jsonb,
  p_reserva jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_cliente_id uuid;
  v_reserva public.reservas%ROWTYPE;
  v_today date;
BEGIN
  SELECT (now() AT TIME ZONE COALESCE(h.timezone, 'UTC'))::date
  INTO v_today
  FROM public.hotels h
  WHERE h.id = p_hotel_id AND h.permite_reservas_online = true;

  IF v_today IS NULL THEN
    RAISE EXCEPTION 'El hotel no acepta reservas en línea';
  END IF;
  IF length(trim(COALESCE(p_cliente->>'nombre', ''))) = 0
     OR length(trim(COALESCE(p_cliente->>'email', ''))) = 0
     OR length(trim(COALESCE(p_cliente->>'telefono', ''))) = 0 THEN
    RAISE EXCEPTION 'Nombre, email y teléfono son obligatorios';
  END IF;
  IF (p_reserva->>'fecha_checkin')::date < v_today
     OR (p_reserva->>'fecha_checkout')::date <= (p_reserva->>'fecha_checkin')::date THEN
    RAISE EXCEPTION 'Las fechas de la reserva no son válidas';
  END IF;

  INSERT INTO public.clientes (
    hotel_id, nombre, apellido_paterno, email, telefono
  ) VALUES (
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
    p_hotel_id,
    v_cliente_id,
    (NULLIF(p_reserva->>'habitacion_id', ''))::uuid,
    (NULLIF(p_reserva->>'tipo_habitacion_id', ''))::uuid,
    (p_reserva->>'fecha_checkin')::date,
    (p_reserva->>'fecha_checkout')::date,
    GREATEST(1, COALESCE((p_reserva->>'adultos')::integer, 1)),
    GREATEST(0, COALESCE((p_reserva->>'ninos')::integer, 0)),
    GREATEST(0, COALESCE((p_reserva->>'tarifa_noche')::numeric, 0)),
    GREATEST(0, COALESCE((p_reserva->>'personas_extra')::integer, 0)),
    GREATEST(0, COALESCE((p_reserva->>'cargo_persona_extra')::numeric, 0)),
    NULLIF(p_reserva->>'solicitudes_especiales', ''),
    'Pendiente',
    'Web'
  ) RETURNING * INTO v_reserva;

  RETURN to_jsonb(v_reserva);
END;
$$;

REVOKE ALL ON FUNCTION public.create_public_reservation(uuid, jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_public_reservation(uuid, jsonb, jsonb) TO anon;

-- La política pública compara contra el día local del hotel, no contra CURRENT_DATE UTC.
DROP POLICY IF EXISTS "Public can insert reservas" ON public.reservas;
CREATE POLICY "Public can insert reservas"
  ON public.reservas FOR INSERT TO anon
  WITH CHECK (
    fecha_checkin >= (
      SELECT (now() AT TIME ZONE COALESCE(h.timezone, 'UTC'))::date
      FROM public.hotels h
      WHERE h.id = reservas.hotel_id
    )
    AND fecha_checkout > fecha_checkin
    AND estado = 'Pendiente'
    AND EXISTS (
      SELECT 1 FROM public.hotels h
      WHERE h.id = reservas.hotel_id AND h.permite_reservas_online = true
    )
  );

-- Normaliza también las reservas existentes al desplegar la migración.
DO $$
DECLARE
  v_id uuid;
BEGIN
  FOR v_id IN SELECT id FROM public.reservas LOOP
    PERFORM public.recalculate_reservation_financials(v_id);
  END LOOP;
END;
$$;
