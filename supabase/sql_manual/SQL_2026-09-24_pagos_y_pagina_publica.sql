-- Correr completo en Supabase > SQL Editor (descargar el archivo, no copiar de la vista previa).
-- Requiere haber corrido antes SQL_2026-09-24_pagina_publica_politicas.sql

-- ===== 20260924230000_corregir_importe_pago =====
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


-- ===== 20260924233000_ajustes_pagina_publica =====
-- Ajustes de la página pública y de las políticas de reserva.
--  * La vista pública incluye teléfono y correo del hotel (botón Contactar).
--  * Hotel suspendido o inactivo en la plataforma ya no aparece como reservable.
--  * El público no ve habitaciones en mantenimiento o fuera de servicio.
--  * Sólo Admin/Gerente crean, editan o borran políticas de reserva.

CREATE OR REPLACE FUNCTION public.vulo_hotel_publico(p_hotel_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $ap_pub$
DECLARE
  v_ok boolean;
BEGIN
  SELECT COALESCE(h.permite_reservas_online, false)
     AND COALESCE(h.activo_plataforma, true)
     AND h.suspendido_at IS NULL
    INTO v_ok
  FROM public.hotels h
  WHERE h.id = p_hotel_id;
  RETURN COALESCE(v_ok, false);
END;
$ap_pub$;

REVOKE ALL ON FUNCTION public.vulo_hotel_publico(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vulo_hotel_publico(uuid) TO anon, authenticated;

DO $ap_view$
DECLARE
  v_wanted text[] := ARRAY[
    'id','nombre','slug','ciudad','estado','pais','direccion','descripcion_publica',
    'estrellas','hora_checkin','hora_checkout','logo_url','moneda_codigo','moneda_locale',
    'moneda_simbolo','permite_reservas_online','porcentaje_anticipo','requiere_anticipo',
    'timezone','activo_plataforma','telefono','email'
  ];
  v_col text;
  v_parts text[] := ARRAY[]::text[];
  v_where text := 'h.slug IS NOT NULL';
BEGIN
  FOREACH v_col IN ARRAY v_wanted LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'hotels' AND column_name = v_col
    ) THEN
      v_parts := v_parts || format('h.%I', v_col);
    ELSE
      v_parts := v_parts || format('NULL::text AS %I', v_col);
    END IF;
  END LOOP;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'hotels' AND column_name = 'suspendido_at') THEN
    v_where := v_where || ' AND h.suspendido_at IS NULL';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'hotels' AND column_name = 'activo_plataforma') THEN
    v_where := v_where || ' AND COALESCE(h.activo_plataforma, true)';
  END IF;

  BEGIN
    DROP VIEW IF EXISTS public.hotels_publicos;
  EXCEPTION WHEN dependent_objects_still_exist THEN
    EXECUTE 'ALTER VIEW public.hotels_publicos SET (security_invoker = false)';
    EXECUTE 'GRANT SELECT ON public.hotels_publicos TO anon, authenticated';
    RETURN;
  END;

  EXECUTE format(
    'CREATE VIEW public.hotels_publicos WITH (security_invoker = false) AS SELECT %s FROM public.hotels h WHERE %s',
    array_to_string(v_parts, ', '), v_where
  );
  EXECUTE 'GRANT SELECT ON public.hotels_publicos TO anon, authenticated';
END $ap_view$;

DO $ap_hab$
DECLARE
  v_cond text := 'NOT COALESCE(excluida_publica, false) AND public.vulo_hotel_publico(hotel_id)';
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'habitaciones' AND column_name = 'estado_habitacion') THEN
    v_cond := v_cond || ' AND COALESCE(estado_habitacion, '''') NOT IN (''Mantenimiento'', ''FueraDeServicio'', ''Bloqueada'')';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'habitaciones' AND column_name = 'estado_mantenimiento') THEN
    v_cond := v_cond || ' AND lower(COALESCE(estado_mantenimiento, ''OK'')) = ''ok''';
  END IF;
  EXECUTE 'DROP POLICY IF EXISTS "Publico ve habitaciones web" ON public.habitaciones';
  EXECUTE format('CREATE POLICY "Publico ve habitaciones web" ON public.habitaciones FOR SELECT TO anon USING (%s)', v_cond);
END $ap_hab$;

-- Políticas de reserva: lectura para el hotel; escritura sólo gerencia.
DROP POLICY IF EXISTS "tenant insert politicas_reserva" ON public.politicas_reserva;
DROP POLICY IF EXISTS "tenant update politicas_reserva" ON public.politicas_reserva;
DROP POLICY IF EXISTS "tenant delete politicas_reserva" ON public.politicas_reserva;
CREATE POLICY "tenant insert politicas_reserva" ON public.politicas_reserva FOR INSERT TO authenticated
  WITH CHECK ((hotel_id = public.vulo_current_hotel_id() AND COALESCE(public.vulo_current_role(), '') IN ('Admin', 'Gerente'))
    OR public.vulo_is_superadmin());
CREATE POLICY "tenant update politicas_reserva" ON public.politicas_reserva FOR UPDATE TO authenticated
  USING ((hotel_id = public.vulo_current_hotel_id() AND COALESCE(public.vulo_current_role(), '') IN ('Admin', 'Gerente'))
    OR public.vulo_is_superadmin())
  WITH CHECK ((hotel_id = public.vulo_current_hotel_id() AND COALESCE(public.vulo_current_role(), '') IN ('Admin', 'Gerente'))
    OR public.vulo_is_superadmin());
CREATE POLICY "tenant delete politicas_reserva" ON public.politicas_reserva FOR DELETE TO authenticated
  USING ((hotel_id = public.vulo_current_hotel_id() AND COALESCE(public.vulo_current_role(), '') IN ('Admin', 'Gerente'))
    OR public.vulo_is_superadmin());

NOTIFY pgrst, 'reload schema';


SELECT 'PAGOS Y PAGINA PUBLICA APLICADOS' AS resultado;
