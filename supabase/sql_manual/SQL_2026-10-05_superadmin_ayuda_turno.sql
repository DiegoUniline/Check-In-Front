-- ============================================================================
-- AYUDA DE SUPERADMIN: cuando el SuperAdmin registra pagos/ventas/gastos
-- para apoyar a quien está en turno, el movimiento se asigna al turno ABIERTO
-- de esa persona (no al turno del SuperAdmin).
-- Quien registró sigue guardado en created_by / created_by_nombre.
-- Fecha: 05/10/2026
-- ============================================================================

CREATE OR REPLACE FUNCTION public.vulo_assert_open_shift(p_hotel_id uuid DEFAULT NULL::uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hotel_id uuid := COALESCE(p_hotel_id, public.vulo_current_hotel_id());
  v_turno_id uuid;
BEGIN
  IF NOT public.vulo_user_requires_shift() THEN RETURN NULL; END IF;

  -- SuperAdmin apoyando: el movimiento cuenta en el turno de quien está en turno
  IF public.vulo_is_superadmin() THEN
    SELECT id INTO v_turno_id
    FROM public.turnos_operativos
    WHERE hotel_id = v_hotel_id
      AND estado = 'Abierto'
      AND usuario_id <> auth.uid()::text
    ORDER BY abierto_at DESC
    LIMIT 1;
    IF v_turno_id IS NOT NULL THEN RETURN v_turno_id; END IF;
  END IF;

  -- Turno propio (comportamiento normal)
  SELECT id INTO v_turno_id
  FROM public.turnos_operativos
  WHERE hotel_id = v_hotel_id
    AND usuario_id = auth.uid()::text
    AND estado = 'Abierto'
  ORDER BY abierto_at DESC
  LIMIT 1;

  IF v_turno_id IS NULL THEN
    -- SuperAdmin sin nadie en turno: permite operar sin turno
    IF public.vulo_is_superadmin() THEN RETURN NULL; END IF;
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'Debes abrir tu turno antes de realizar operaciones en VULO',
      HINT = 'Ve a Turnos, registra el fondo inicial y vuelve a intentar.';
  END IF;
  RETURN v_turno_id;
END;
$$;

REVOKE ALL ON FUNCTION public.vulo_assert_open_shift(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vulo_assert_open_shift(uuid) TO authenticated;

SELECT 'SUPERADMIN AYUDA TURNO APLICADO' AS resultado;
