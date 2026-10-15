-- Respeta fechas pasadas al registrar una entrada directa.
-- Antes: si la entrada no era hoy, el servidor la movía a hoy.
-- Ahora: solo se ajusta si la entrada es FUTURA (no se puede registrar entrada antes de llegar).
DO $patch$
DECLARE v_def text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_def
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'create_reservation_bundle';
  IF v_def IS NULL THEN RAISE EXCEPTION 'No se encontró create_reservation_bundle'; END IF;
  IF position('IF v_checkin <> v_today THEN' in v_def) = 0 THEN
    RAISE NOTICE 'Ya estaba corregido';
  ELSE
    EXECUTE replace(v_def, 'IF v_checkin <> v_today THEN', 'IF v_checkin > v_today THEN');
  END IF;
END
$patch$;

NOTIFY pgrst, 'reload schema';
SELECT 'FECHAS PASADAS RESPETADAS' AS resultado;
