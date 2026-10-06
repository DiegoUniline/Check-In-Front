-- ============================================================================
-- CHECK-OUT RÁPIDO (UN CLIC) CONFIGURABLE POR HOTEL
--  * hotels.modo_checkout: 'completo' (flujo actual) | 'rapido' (un clic).
--  * hotels.checkout_rapido_limpia: al liberar, dejarla lista (Limpia) en vez
--    de mandarla a limpieza.
--  * vulo_checkout_rapido: valida saldo y entregables y hace el check-out en
--    una sola transacción usando complete_reservation_checkout.
-- Fecha: 06/10/2026
-- ============================================================================

ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS modo_checkout text NOT NULL DEFAULT 'completo';
ALTER TABLE public.hotels DROP CONSTRAINT IF EXISTS hotels_modo_checkout_check;
ALTER TABLE public.hotels ADD CONSTRAINT hotels_modo_checkout_check CHECK (modo_checkout IN ('completo', 'rapido'));
ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS checkout_rapido_limpia boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.vulo_checkout_rapido(p_reserva_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $f$
DECLARE
  v_reserva public.reservas%ROWTYPE;
  v_hotel public.hotels%ROWTYPE;
  v_pendientes text;
  v_result jsonb;
BEGIN
  SELECT * INTO v_reserva FROM public.reservas WHERE id = p_reserva_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reserva no encontrada'; END IF;
  SELECT * INTO v_hotel FROM public.hotels WHERE id = v_reserva.hotel_id;
  IF COALESCE(v_hotel.modo_checkout, 'completo') <> 'rapido' THEN
    RAISE EXCEPTION 'El check-out rápido no está activado en este hotel';
  END IF;

  PERFORM public.recalculate_reservation_financials(p_reserva_id);
  SELECT * INTO v_reserva FROM public.reservas WHERE id = p_reserva_id;
  IF COALESCE(v_reserva.saldo_pendiente, 0) > 0.009 THEN
    RAISE EXCEPTION 'SALDO_PENDIENTE:%', v_reserva.saldo_pendiente;
  END IF;
  IF COALESCE(v_reserva.saldo_pendiente, 0) < -0.009 THEN
    RAISE EXCEPTION 'SALDO_A_FAVOR:%', abs(v_reserva.saldo_pendiente);
  END IF;

  SELECT string_agg(COALESCE(e.nombre, 'Entregable'), ', ') INTO v_pendientes
  FROM public.entregables_reserva er
  JOIN public.entregables e ON e.id = er.entregable_id
  WHERE er.reserva_id = p_reserva_id AND e.requiere_devolucion AND NOT COALESCE(er.devuelto, false);
  IF v_pendientes IS NOT NULL THEN
    RAISE EXCEPTION 'ENTREGABLES_PENDIENTES:%', v_pendientes;
  END IF;

  v_result := public.complete_reservation_checkout(p_reserva_id, NULL);

  IF v_hotel.checkout_rapido_limpia AND v_reserva.habitacion_id IS NOT NULL THEN
    UPDATE public.habitaciones SET estado_limpieza = 'Limpia'
    WHERE id = v_reserva.habitacion_id AND estado_habitacion = 'Disponible';
  END IF;

  RETURN v_result || jsonb_build_object(
    'habitacion_numero', (SELECT numero FROM public.habitaciones WHERE id = v_reserva.habitacion_id),
    'habitacion_limpia', v_hotel.checkout_rapido_limpia
  );
END;
$f$;

REVOKE ALL ON FUNCTION public.vulo_checkout_rapido(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vulo_checkout_rapido(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';

SELECT 'CHECKOUT RAPIDO APLICADO' AS resultado;
