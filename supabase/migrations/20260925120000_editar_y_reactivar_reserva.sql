-- Edición completa y reactivación de reservaciones.
--  * vulo_editar_datos_reserva: huésped, ocupación, hora de llegada y notas,
--    con permiso, validación de capacidad e historial.
--  * vulo_reactivar_reserva: regresa una reserva cancelada o no-show a
--    Confirmada si la habitación sigue libre (o en otra habitación libre).

INSERT INTO public.permisos_default(modulo, rol) VALUES
  ('reservas.operacion.reactivate_reservation', 'Admin'),
  ('reservas.operacion.reactivate_reservation', 'Gerente')
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.vulo_editar_datos_reserva(
  p_reserva_id uuid,
  p_datos jsonb,
  p_motivo text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $er_datos$
DECLARE
  v_reserva public.reservas%ROWTYPE;
  v_after public.reservas%ROWTYPE;
  v_cliente uuid;
  v_adultos integer;
  v_ninos integer;
  v_cap_max integer;
  v_cap_adultos integer;
  v_cap_ninos integer;
  v_activa boolean;
  v_cerrada boolean;
  v_reason text := NULLIF(trim(COALESCE(p_motivo, '')), '');
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sesión no válida'; END IF;
  IF NOT public.vulo_operation_allowed('reservation_correction') THEN
    RAISE EXCEPTION 'Tu rol no tiene permiso para editar reservaciones';
  END IF;

  SELECT * INTO v_reserva FROM public.reservas
  WHERE id = p_reserva_id
    AND (hotel_id = public.vulo_current_hotel_id() OR public.vulo_is_superadmin())
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reserva no encontrada'; END IF;

  v_activa := COALESCE(v_reserva.checkin_realizado, false) AND NOT COALESCE(v_reserva.checkout_realizado, false);
  v_cerrada := v_reserva.estado IN ('Cancelada', 'NoShow', 'CheckOut');

  v_cliente := COALESCE(NULLIF(p_datos->>'cliente_id', '')::uuid, v_reserva.cliente_id);
  v_adultos := COALESCE(NULLIF(p_datos->>'adultos', '')::integer, v_reserva.adultos, 1);
  v_ninos := COALESCE(NULLIF(p_datos->>'ninos', '')::integer, v_reserva.ninos, 0);

  IF v_cerrada AND (v_cliente IS DISTINCT FROM v_reserva.cliente_id
      OR v_adultos IS DISTINCT FROM v_reserva.adultos OR v_ninos IS DISTINCT FROM v_reserva.ninos) THEN
    RAISE EXCEPTION 'La reservación está cerrada; sólo puedes editar sus notas';
  END IF;

  IF v_cliente IS DISTINCT FROM v_reserva.cliente_id THEN
    IF NOT EXISTS (SELECT 1 FROM public.clientes c WHERE c.id = v_cliente AND c.hotel_id = v_reserva.hotel_id) THEN
      RAISE EXCEPTION 'El huésped seleccionado no pertenece a este hotel';
    END IF;
  END IF;

  IF v_adultos < 1 THEN RAISE EXCEPTION 'Debe haber al menos un adulto'; END IF;
  IF v_ninos < 0 THEN RAISE EXCEPTION 'El número de menores no es válido'; END IF;

  IF v_adultos IS DISTINCT FROM v_reserva.adultos OR v_ninos IS DISTINCT FROM v_reserva.ninos THEN
    IF v_activa THEN
      RAISE EXCEPTION 'La estancia ya inició: usa Agregar o Retirar huésped';
    END IF;
    SELECT t.capacidad_maxima, t.capacidad_adultos, t.capacidad_ninos
      INTO v_cap_max, v_cap_adultos, v_cap_ninos
    FROM public.tipos_habitacion t WHERE t.id = v_reserva.tipo_habitacion_id;
    IF v_cap_max IS NOT NULL AND v_cap_max > 0 AND v_adultos + v_ninos > v_cap_max THEN
      RAISE EXCEPTION 'La habitación admite máximo % huésped(es)', v_cap_max;
    END IF;
    IF v_cap_adultos IS NOT NULL AND v_cap_adultos > 0 AND v_adultos > v_cap_adultos THEN
      RAISE EXCEPTION 'La habitación admite máximo % adulto(s)', v_cap_adultos;
    END IF;
    IF v_cap_ninos IS NOT NULL AND v_cap_ninos > 0 AND v_ninos > v_cap_ninos THEN
      RAISE EXCEPTION 'La habitación admite máximo % menor(es)', v_cap_ninos;
    END IF;
  END IF;

  PERFORM set_config('vulo.stay_operation', 'reservation_data', true);
  PERFORM set_config('vulo.stay_reason', COALESCE(v_reason, 'Edición de datos de la reservación'), true);

  UPDATE public.reservas SET
    cliente_id = v_cliente,
    adultos = v_adultos,
    ninos = v_ninos,
    solicitudes_especiales = CASE WHEN p_datos ? 'solicitudes_especiales'
      THEN NULLIF(trim(p_datos->>'solicitudes_especiales'), '') ELSE solicitudes_especiales END,
    notas_internas = CASE WHEN p_datos ? 'notas_internas'
      THEN NULLIF(trim(p_datos->>'notas_internas'), '') ELSE notas_internas END,
    version_operativa = COALESCE(version_operativa, 1) + 1,
    updated_at = now()
  WHERE id = p_reserva_id;

  -- hora_llegada puede ser time o text según la instalación.
  IF p_datos ? 'hora_llegada' THEN
    EXECUTE format('UPDATE public.reservas SET hora_llegada = %L WHERE id = %L',
      NULLIF(trim(p_datos->>'hora_llegada'), ''), p_reserva_id);
  END IF;
  SELECT * INTO v_after FROM public.reservas WHERE id = p_reserva_id;

  INSERT INTO public.estancia_movimientos(
    hotel_id, reserva_id, operacion, motivo, datos_antes, datos_despues, metadata,
    usuario_id, usuario_email, usuario_nombre, reversible
  )
  SELECT v_reserva.hotel_id, p_reserva_id, 'reservation_data',
    COALESCE(v_reason, 'Edición de datos de la reservación'),
    to_jsonb(v_reserva), to_jsonb(v_after), p_datos,
    auth.uid(), p.email, concat_ws(' ', p.nombre, p.apellido_paterno), false
  FROM public.profiles p WHERE p.id = auth.uid();

  INSERT INTO public.auditoria(hotel_id, user_id, user_email, accion, entidad, entidad_id, descripcion, datos_antes, datos_despues)
  SELECT v_reserva.hotel_id, auth.uid(), p.email, 'RESERVA_EDITADA', 'reserva', p_reserva_id,
    COALESCE(v_reason, 'Edición de datos de la reservación'), to_jsonb(v_reserva), to_jsonb(v_after)
  FROM public.profiles p WHERE p.id = auth.uid();

  RETURN to_jsonb(v_after);
END;
$er_datos$;

REVOKE ALL ON FUNCTION public.vulo_editar_datos_reserva(uuid, jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vulo_editar_datos_reserva(uuid, jsonb, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.vulo_reactivar_reserva(
  p_reserva_id uuid,
  p_habitacion_id uuid,
  p_motivo text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $er_react$
DECLARE
  v_reserva public.reservas%ROWTYPE;
  v_after public.reservas%ROWTYPE;
  v_room uuid;
  v_today date;
  v_reason text := trim(COALESCE(p_motivo, ''));
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sesión no válida'; END IF;
  IF NOT public.vulo_operation_allowed('reactivate_reservation') THEN
    RAISE EXCEPTION 'Tu rol no tiene permiso para reactivar reservaciones';
  END IF;
  IF length(v_reason) < 3 THEN RAISE EXCEPTION 'Escribe el motivo de la reactivación'; END IF;

  SELECT * INTO v_reserva FROM public.reservas
  WHERE id = p_reserva_id
    AND (hotel_id = public.vulo_current_hotel_id() OR public.vulo_is_superadmin())
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reserva no encontrada'; END IF;
  IF v_reserva.estado NOT IN ('Cancelada', 'NoShow') OR COALESCE(v_reserva.checkin_realizado, false) THEN
    RAISE EXCEPTION 'Sólo se reactivan reservas canceladas o no-show que no hayan hecho check-in';
  END IF;

  v_today := public.vulo_hotel_today(v_reserva.hotel_id);
  IF v_reserva.fecha_checkout < v_today THEN
    RAISE EXCEPTION 'Las fechas de esta reserva ya pasaron; crea una nueva reservación';
  END IF;

  v_room := COALESCE(p_habitacion_id, v_reserva.habitacion_id);
  IF v_room IS NULL THEN RAISE EXCEPTION 'Selecciona una habitación'; END IF;
  IF NOT public.vulo_room_available_for_stay(
    v_reserva.hotel_id, v_room, v_reserva.id, v_reserva.fecha_checkin, v_reserva.fecha_checkout, false
  ) THEN
    RAISE EXCEPTION 'La habitación ya está ocupada en esas fechas; elige otra';
  END IF;

  PERFORM set_config('vulo.stay_operation', 'reactivate_reservation', true);
  PERFORM set_config('vulo.stay_reason', v_reason, true);

  UPDATE public.reservas SET
    estado = 'Confirmada',
    habitacion_id = v_room,
    tipo_habitacion_id = COALESCE((SELECT tipo_habitacion_id FROM public.habitaciones WHERE id = v_room), tipo_habitacion_id),
    notas_internas = concat_ws(E'\n', NULLIF(notas_internas, ''), 'Reactivada: ' || v_reason),
    version_operativa = COALESCE(version_operativa, 1) + 1,
    updated_at = now()
  WHERE id = p_reserva_id;

  PERFORM public.recalculate_reservation_financials(p_reserva_id);
  SELECT * INTO v_after FROM public.reservas WHERE id = p_reserva_id;

  INSERT INTO public.estancia_movimientos(
    hotel_id, reserva_id, operacion, motivo, datos_antes, datos_despues, metadata,
    usuario_id, usuario_email, usuario_nombre, reversible
  )
  SELECT v_reserva.hotel_id, p_reserva_id, 'reactivate_reservation', v_reason,
    to_jsonb(v_reserva), to_jsonb(v_after), jsonb_build_object('habitacion_id', v_room),
    auth.uid(), p.email, concat_ws(' ', p.nombre, p.apellido_paterno), false
  FROM public.profiles p WHERE p.id = auth.uid();

  INSERT INTO public.auditoria(hotel_id, user_id, user_email, accion, entidad, entidad_id, descripcion, datos_antes, datos_despues)
  SELECT v_reserva.hotel_id, auth.uid(), p.email, 'RESERVA_REACTIVADA', 'reserva', p_reserva_id,
    v_reason, to_jsonb(v_reserva), to_jsonb(v_after)
  FROM public.profiles p WHERE p.id = auth.uid();

  RETURN to_jsonb(v_after);
END;
$er_react$;

REVOKE ALL ON FUNCTION public.vulo_reactivar_reserva(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vulo_reactivar_reserva(uuid, uuid, text) TO authenticated;

NOTIFY pgrst, 'reload schema';

SELECT 'EDITAR Y REACTIVAR RESERVA APLICADO' AS resultado;
