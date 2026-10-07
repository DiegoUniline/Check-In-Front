-- Salida a crédito: permite check-out con saldo pendiente marcado como cuenta por cobrar.
-- Ejecutar completo. Al final debe aparecer «SALIDA A CREDITO APLICADA».

ALTER TABLE public.reservas
  ADD COLUMN IF NOT EXISTS salida_credito boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS credito_monto numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credito_liquidado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS credito_liquidado_at timestamptz,
  ADD COLUMN IF NOT EXISTS credito_autorizado_por uuid;

COMMENT ON COLUMN public.reservas.salida_credito IS 'El huésped salió sin liquidar; el saldo queda como cuenta por cobrar.';

DROP FUNCTION public.complete_reservation_checkout(uuid, jsonb);

CREATE OR REPLACE FUNCTION public.complete_reservation_checkout(p_reserva_id uuid, p_pago jsonb DEFAULT NULL::jsonb, p_credito boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
  IF COALESCE(v_reserva.saldo_pendiente, 0) > 0.009 AND NOT p_credito THEN
    RAISE EXCEPTION 'La reserva todavía tiene saldo pendiente de %', round(v_reserva.saldo_pendiente, 2);
  END IF;

  UPDATE public.reservas
  SET checkout_realizado = true,
      estado = 'CheckOut',
      salida_credito = p_credito AND COALESCE(v_reserva.saldo_pendiente, 0) > 0.009,
      credito_monto = CASE WHEN p_credito AND COALESCE(v_reserva.saldo_pendiente, 0) > 0.009
                           THEN round(v_reserva.saldo_pendiente, 2) ELSE 0 END,
      credito_liquidado = NOT (p_credito AND COALESCE(v_reserva.saldo_pendiente, 0) > 0.009),
      credito_autorizado_por = CASE WHEN p_credito AND COALESCE(v_reserva.saldo_pendiente, 0) > 0.009
                                    THEN auth.uid() ELSE NULL END
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
$function$;

SELECT 'SALIDA A CREDITO APLICADA' AS resultado;
