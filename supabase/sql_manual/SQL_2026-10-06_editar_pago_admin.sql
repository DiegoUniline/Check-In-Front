-- ============================================================================
-- EDICIÓN COMPLETA DE PAGOS (ADMIN) + RECÁLCULO DEL CORTE DE TURNO
-- Monto, método, referencia, fecha, quién lo registró y turno al que pertenece.
-- Permite corregir días cerrados (sólo dentro de esta RPC) y recalcula los
-- cortes de turno cerrados afectados conservando el efectivo contado.
-- Fecha: 06/10/2026
-- ============================================================================

INSERT INTO public.permisos_default(modulo, rol) VALUES
  ('reservas.operacion.admin_payment_edit', 'Admin')
ON CONFLICT DO NOTHING;

-- 1) Día cerrado: se respeta salvo dentro de una corrección de administrador.
CREATE OR REPLACE FUNCTION public.vulo_prevent_closed_day_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $pcd$
DECLARE
  v_hotel_id uuid;
  v_fecha date;
  v_old_fecha date;
BEGIN
  IF COALESCE(current_setting('vulo.admin_correccion', true), '') = 'on' THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;

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
$pcd$;

-- 2) Turnos de otra persona: sólo el recálculo de administrador puede tocarlos.
CREATE OR REPLACE FUNCTION public.vulo_validate_shift_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $vso$
BEGIN
  IF auth.uid() IS NOT NULL
     AND NOT public.vulo_is_superadmin()
     AND COALESCE(current_setting('vulo.admin_correccion', true), '') <> 'on'
     AND NEW.usuario_id <> auth.uid()::text THEN
    RAISE EXCEPTION 'Sólo puedes abrir o modificar tu propio turno';
  END IF;
  RETURN NEW;
END;
$vso$;

-- 3) Recalcular un corte de turno cerrado (efectivo contado se conserva).
CREATE OR REPLACE FUNCTION public.vulo_recalcular_turno(p_turno_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $rt$
DECLARE
  v_shift public.turnos_operativos%ROWTYPE;
  v_cash numeric := 0;
  v_card numeric := 0;
  v_transfer numeric := 0;
  v_other numeric := 0;
  v_expenses numeric := 0;
  v_provider_expenses numeric := 0;
  v_expected numeric;
  v_difference numeric;
  v_report jsonb;
  v_old_report jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sesión no válida'; END IF;
  IF NOT public.vulo_operation_allowed('admin_payment_edit') THEN
    RAISE EXCEPTION 'Tu rol no tiene permiso para recalcular cortes de turno';
  END IF;

  SELECT * INTO v_shift FROM public.turnos_operativos WHERE id = p_turno_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Turno no encontrado'; END IF;
  IF NOT public.vulo_is_superadmin() AND v_shift.hotel_id <> public.vulo_current_hotel_id() THEN
    RAISE EXCEPTION 'No tienes acceso a este turno';
  END IF;
  -- Un turno abierto se calcula en vivo; no hay corte que actualizar.
  IF v_shift.estado <> 'Cerrado' THEN
    RETURN jsonb_build_object('turno_id', p_turno_id, 'estado', v_shift.estado, 'recalculado', false);
  END IF;

  SELECT
    COALESCE(SUM(amount) FILTER (WHERE clase = 'efectivo'), 0),
    COALESCE(SUM(amount) FILTER (WHERE clase = 'tarjeta'), 0),
    COALESCE(SUM(amount) FILTER (WHERE clase = 'transferencia'), 0),
    COALESCE(SUM(amount) FILTER (WHERE clase = 'otro'), 0)
  INTO v_cash, v_card, v_transfer, v_other
  FROM (
    SELECT monto AS amount, public.vulo_metodo_clase(v_shift.hotel_id, metodo_pago) AS clase
    FROM public.pagos WHERE turno_id = p_turno_id AND COALESCE(estado, 'Activo') = 'Activo'
    UNION ALL
    SELECT total AS amount, public.vulo_metodo_clase(v_shift.hotel_id, metodo_pago) AS clase
    FROM public.ventas WHERE turno_id = p_turno_id AND reserva_id IS NULL AND COALESCE(estado, 'Activa') = 'Activa'
  ) income;

  SELECT COALESCE(SUM(monto), 0) INTO v_expenses FROM public.gastos
  WHERE turno_id = p_turno_id
    AND public.vulo_metodo_clase(v_shift.hotel_id, metodo_pago) = 'efectivo';
  IF to_regclass('public.pagos_compras') IS NOT NULL THEN
    EXECUTE $sql$ SELECT COALESCE(SUM(monto),0) FROM public.pagos_compras
      WHERE turno_id=$1 AND public.vulo_metodo_clase($2, metodo_pago)='efectivo' $sql$
    INTO v_provider_expenses USING p_turno_id, v_shift.hotel_id;
    v_expenses := v_expenses + v_provider_expenses;
  END IF;

  v_expected := ROUND(COALESCE(v_shift.fondo_inicial, 0) + v_cash - v_expenses, 2);
  v_difference := ROUND(COALESCE(v_shift.efectivo_contado, 0) - v_expected, 2);
  v_old_report := COALESCE(v_shift.reporte_cierre, '{}'::jsonb);

  v_report := public.vulo_build_shift_report(p_turno_id) || jsonb_build_object(
    -- El estado del hotel es una foto del momento del cierre; no se rehace.
    'estado_hotel', COALESCE(v_old_report->'estado_hotel', '{}'::jsonb),
    'generado_at', COALESCE(v_old_report->'generado_at', to_jsonb(v_shift.cerrado_at)),
    'recalculado_at', now(),
    'recalculado_por', public.vulo_actor_name(),
    'caja', jsonb_build_object(
      'fondo_inicial', COALESCE(v_shift.fondo_inicial, 0), 'efectivo_ingresado', v_cash,
      'tarjeta', v_card, 'transferencia', v_transfer, 'otros_ingresos', v_other,
      'egresos_efectivo', v_expenses, 'efectivo_esperado', v_expected,
      'efectivo_contado', COALESCE(v_shift.efectivo_contado, 0), 'diferencia', v_difference
    )
  );

  PERFORM set_config('vulo.admin_correccion', 'on', true);
  UPDATE public.turnos_operativos SET
    efectivo_esperado = v_expected, diferencia = v_difference,
    ingresos_efectivo = v_cash, ingresos_tarjeta = v_card,
    ingresos_transferencia = v_transfer, otros_ingresos = v_other,
    egresos_efectivo = v_expenses, reporte_cierre = v_report
  WHERE id = p_turno_id;
  PERFORM set_config('vulo.admin_correccion', '', true);

  INSERT INTO public.auditoria(hotel_id, user_id, user_email, accion, entidad, entidad_id, descripcion, datos_antes, datos_despues)
  VALUES (
    v_shift.hotel_id, auth.uid(), (SELECT email FROM public.profiles WHERE id = auth.uid()),
    'TURNO_RECALCULADO', 'turno', p_turno_id,
    format('Corte de turno de %s recalculado. Esperado %s → %s', v_shift.usuario_nombre, v_shift.efectivo_esperado, v_expected),
    to_jsonb(v_shift),
    (SELECT to_jsonb(t) FROM public.turnos_operativos t WHERE t.id = p_turno_id)
  );

  RETURN jsonb_build_object(
    'turno_id', p_turno_id, 'recalculado', true, 'usuario', v_shift.usuario_nombre,
    'esperado_anterior', v_shift.efectivo_esperado, 'esperado', v_expected,
    'diferencia_anterior', v_shift.diferencia, 'diferencia', v_difference
  );
END;
$rt$;

REVOKE ALL ON FUNCTION public.vulo_recalcular_turno(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vulo_recalcular_turno(uuid) TO authenticated;

-- 4) Edición completa del pago.
--    p_turno_id: NULL = conserva el turno; p_quitar_turno = true lo deja sin turno.
CREATE OR REPLACE FUNCTION public.vulo_admin_editar_pago(
  p_payment_id uuid,
  p_monto numeric,
  p_metodo text,
  p_referencia text,
  p_fecha timestamptz,
  p_usuario_id uuid,
  p_turno_id uuid,
  p_quitar_turno boolean,
  p_estado text,
  p_motivo text,
  p_recalcular_turno boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $aep$
DECLARE
  v_reason text := trim(COALESCE(p_motivo, ''));
  v_amount numeric := round(COALESCE(p_monto, 0), 2);
  v_estado text := COALESCE(NULLIF(trim(COALESCE(p_estado, '')), ''), 'Activo');
  v_payment public.pagos%ROWTYPE;
  v_after_payment public.pagos%ROWTYPE;
  v_reserva public.reservas%ROWTYPE;
  v_after public.reservas%ROWTYPE;
  v_new_turno uuid;
  v_user_name text;
  v_turnos uuid[];
  v_t uuid;
  v_recalc jsonb := '[]'::jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sesión no válida'; END IF;
  IF NOT public.vulo_operation_allowed('admin_payment_edit') THEN
    RAISE EXCEPTION 'Sólo un administrador puede editar pagos';
  END IF;
  IF length(v_reason) < 3 THEN RAISE EXCEPTION 'Escribe el motivo de la corrección'; END IF;
  IF v_amount <= 0 THEN RAISE EXCEPTION 'El importe debe ser mayor a cero'; END IF;
  IF length(trim(COALESCE(p_metodo, ''))) < 2 THEN RAISE EXCEPTION 'Selecciona el método de pago'; END IF;
  IF p_fecha IS NULL THEN RAISE EXCEPTION 'Indica la fecha del pago'; END IF;
  IF v_estado NOT IN ('Activo', 'Cancelado') THEN RAISE EXCEPTION 'Estado de pago no válido'; END IF;

  SELECT * INTO v_payment FROM public.pagos WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pago no encontrado'; END IF;
  IF NOT public.vulo_is_superadmin() AND v_payment.hotel_id <> public.vulo_current_hotel_id() THEN
    RAISE EXCEPTION 'Pago no encontrado';
  END IF;

  IF v_payment.reserva_id IS NOT NULL THEN
    SELECT * INTO v_reserva FROM public.reservas WHERE id = v_payment.reserva_id FOR UPDATE;
  END IF;

  IF p_usuario_id IS NOT NULL THEN
    SELECT public.vulo_user_name(id) INTO v_user_name
    FROM public.profiles WHERE id = p_usuario_id;
    IF v_user_name IS NULL THEN RAISE EXCEPTION 'Usuario no encontrado'; END IF;
  END IF;

  v_new_turno := CASE
    WHEN COALESCE(p_quitar_turno, false) THEN NULL
    WHEN p_turno_id IS NOT NULL THEN p_turno_id
    ELSE v_payment.turno_id
  END;
  IF v_new_turno IS NOT NULL AND v_new_turno IS DISTINCT FROM v_payment.turno_id
     AND NOT EXISTS (SELECT 1 FROM public.turnos_operativos WHERE id = v_new_turno AND hotel_id = v_payment.hotel_id) THEN
    RAISE EXCEPTION 'Turno no encontrado';
  END IF;

  PERFORM set_config('vulo.admin_correccion', 'on', true);
  PERFORM set_config('vulo.stay_operation', 'admin_payment_edit', true);
  PERFORM set_config('vulo.stay_reason', v_reason, true);

  UPDATE public.pagos SET
    monto = v_amount,
    metodo_pago = trim(p_metodo),
    referencia = NULLIF(trim(COALESCE(p_referencia, '')), ''),
    fecha = p_fecha,
    created_at = p_fecha,
    created_by = COALESCE(p_usuario_id, created_by),
    created_by_nombre = COALESCE(v_user_name, created_by_nombre),
    turno_id = v_new_turno,
    estado = v_estado,
    motivo_cambio = v_reason,
    notas = concat_ws(' · ', NULLIF(notas, ''), format('Corrección admin: %s', v_reason))
  WHERE id = v_payment.id;

  IF v_payment.reserva_id IS NOT NULL THEN
    PERFORM public.recalculate_reservation_financials(v_payment.reserva_id);
    SELECT * INTO v_after FROM public.reservas WHERE id = v_payment.reserva_id;
    IF COALESCE(v_after.saldo_pendiente, 0) < -0.009 THEN
      RAISE EXCEPTION 'Con ese importe lo pagado supera el total de la cuenta';
    END IF;
  END IF;

  SELECT * INTO v_after_payment FROM public.pagos WHERE id = v_payment.id;

  PERFORM set_config('vulo.admin_correccion', '', true);
  PERFORM set_config('vulo.stay_operation', '', true);
  PERFORM set_config('vulo.stay_reason', '', true);

  INSERT INTO public.auditoria(hotel_id, user_id, user_email, accion, entidad, entidad_id, descripcion, datos_antes, datos_despues)
  VALUES (
    v_payment.hotel_id, auth.uid(), (SELECT email FROM public.profiles WHERE id = auth.uid()),
    'PAGO_EDITADO_ADMIN', 'pago', v_payment.id,
    format('Pago editado por administrador: %s', v_reason),
    to_jsonb(v_payment), to_jsonb(v_after_payment)
  );

  IF COALESCE(p_recalcular_turno, true) THEN
    v_turnos := ARRAY(SELECT DISTINCT t FROM unnest(ARRAY[v_payment.turno_id, v_new_turno]) t WHERE t IS NOT NULL);
    FOREACH v_t IN ARRAY v_turnos LOOP
      v_recalc := v_recalc || jsonb_build_array(public.vulo_recalcular_turno(v_t));
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'payment_id', v_payment.id,
    'antes', to_jsonb(v_payment),
    'despues', to_jsonb(v_after_payment),
    'saldo_pendiente', v_after.saldo_pendiente,
    'turnos_recalculados', v_recalc
  );
END;
$aep$;

REVOKE ALL ON FUNCTION public.vulo_admin_editar_pago(uuid, numeric, text, text, timestamptz, uuid, uuid, boolean, text, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vulo_admin_editar_pago(uuid, numeric, text, text, timestamptz, uuid, uuid, boolean, text, text, boolean) TO authenticated;

NOTIFY pgrst, 'reload schema';

SELECT 'EDICION DE PAGOS ADMIN Y RECALCULO DE TURNO APLICADO' AS resultado;
