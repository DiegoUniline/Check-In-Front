-- Permite que las operaciones transaccionales autenticadas (check-in, check-out,
-- pagos y creación de reservas) invoquen el recálculo financiero, conservando
-- el aislamiento entre hoteles.

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

  -- Las llamadas desde triggers son internas. Una invocación directa de un
  -- usuario autenticado solo puede operar sobre su hotel (o como SuperAdmin).
  IF pg_trigger_depth() = 0
     AND auth.role() = 'authenticated'
     AND NOT (
       v_reserva.hotel_id = public.current_hotel_id()
       OR public.is_superadmin()
     ) THEN
    RAISE EXCEPTION 'No tienes acceso a esta reserva' USING ERRCODE = '42501';
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

REVOKE ALL ON FUNCTION public.recalculate_reservation_financials(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recalculate_reservation_financials(uuid) TO authenticated;

