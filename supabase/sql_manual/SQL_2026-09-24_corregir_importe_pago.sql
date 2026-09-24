-- Correr completo en Supabase > SQL Editor (descargar el archivo, no copiar de la vista previa).

-- Corregir el importe de un pago (gerencia), con motivo y auditoría.
-- Cancelar, reactivar y cambiar forma de pago ya existen como operaciones
-- de estancia; ésta completa la edición del pago.

CREATE OR REPLACE FUNCTION public.vulo_change_payment_amount(
  p_reserva_id uuid,
  p_payment_id uuid,
  p_amount numeric,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $cp_amt$
DECLARE
  v_reason text := trim(COALESCE(p_reason, ''));
  v_amount numeric := round(COALESCE(p_amount, 0), 2);
  v_reserva public.reservas%ROWTYPE;
  v_payment public.pagos%ROWTYPE;
  v_after public.reservas%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sesión no válida'; END IF;
  IF NOT public.vulo_operation_allowed('payment_amount_change') THEN
    RAISE EXCEPTION 'Tu rol no tiene permiso para corregir importes de pago';
  END IF;
  IF length(v_reason) < 3 THEN RAISE EXCEPTION 'Escribe el motivo de la corrección'; END IF;
  IF v_amount <= 0 THEN RAISE EXCEPTION 'El importe debe ser mayor a cero'; END IF;

  SELECT * INTO v_reserva FROM public.reservas
  WHERE id = p_reserva_id
    AND (hotel_id = public.vulo_current_hotel_id() OR public.vulo_is_superadmin())
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reserva no encontrada'; END IF;

  SELECT * INTO v_payment FROM public.pagos
  WHERE id = p_payment_id AND reserva_id = p_reserva_id AND hotel_id = v_reserva.hotel_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pago no encontrado'; END IF;
  IF COALESCE(v_payment.estado, 'Activo') <> 'Activo' THEN
    RAISE EXCEPTION 'El pago está cancelado; reactívalo antes de corregir el importe';
  END IF;
  IF v_amount = round(COALESCE(v_payment.monto, 0), 2) THEN
    RAISE EXCEPTION 'El importe es el mismo';
  END IF;

  PERFORM set_config('vulo.stay_operation', 'payment_amount_change', true);
  PERFORM set_config('vulo.stay_reason', v_reason, true);

  UPDATE public.pagos
  SET monto = v_amount,
      motivo_cambio = v_reason,
      notas = concat_ws(' · ', NULLIF(notas, ''), format('Importe corregido de %s a %s', v_payment.monto, v_amount)),
      actualizado_at = now(),
      actualizado_por = auth.uid()
  WHERE id = v_payment.id;

  PERFORM public.recalculate_reservation_financials(p_reserva_id);
  SELECT * INTO v_after FROM public.reservas WHERE id = p_reserva_id;
  IF COALESCE(v_after.saldo_pendiente, 0) < -0.009 THEN
    RAISE EXCEPTION 'Con ese importe lo pagado supera el total de la cuenta';
  END IF;

  INSERT INTO public.auditoria(hotel_id, user_id, user_email, accion, entidad, entidad_id, descripcion, datos_antes, datos_despues)
  VALUES (
    v_reserva.hotel_id, auth.uid(), (SELECT email FROM public.profiles WHERE id = auth.uid()),
    'PAGO_IMPORTE_CORREGIDO', 'pago', v_payment.id,
    format('Importe de pago corregido de %s a %s: %s', v_payment.monto, v_amount, v_reason),
    to_jsonb(v_payment),
    (SELECT to_jsonb(p) FROM public.pagos p WHERE p.id = v_payment.id)
  );

  RETURN jsonb_build_object('payment_id', v_payment.id, 'monto_anterior', v_payment.monto, 'monto', v_amount,
    'saldo_pendiente', v_after.saldo_pendiente);
END;
$cp_amt$;

REVOKE ALL ON FUNCTION public.vulo_change_payment_amount(uuid, uuid, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vulo_change_payment_amount(uuid, uuid, numeric, text) TO authenticated;

NOTIFY pgrst, 'reload schema';

SELECT 'CORRECCION DE IMPORTE DE PAGO APLICADA' AS resultado;
