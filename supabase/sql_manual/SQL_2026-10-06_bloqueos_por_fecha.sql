-- ============================================================================
-- BLOQUEO DE HABITACIONES POR RANGO DE FECHAS
-- Mantenimiento / fuera de servicio / bloqueo con fecha inicio y fin.
--  * Sólo bloquea las noches del rango: antes y después se puede reservar.
--  * No deja crear un bloqueo encima de reservas activas.
--  * No deja reservar (cualquier origen) en noches bloqueadas.
--  * La habitación se marca en mantenimiento sólo los días que cubre el bloqueo
--    (habitaciones.bloqueo_id) y se libera sola al terminar.
--  * Las banderas antiguas sin fecha (bloqueo_id NULL) siguen como antes.
-- fecha_desde = primera noche bloqueada, fecha_hasta = última noche bloqueada.
-- Fecha: 06/10/2026
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.habitacion_bloqueos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  habitacion_id uuid NOT NULL REFERENCES public.habitaciones(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'Mantenimiento' CHECK (tipo IN ('Mantenimiento', 'FueraDeServicio', 'Bloqueo')),
  fecha_desde date NOT NULL,
  fecha_hasta date NOT NULL,
  motivo text NOT NULL,
  estado text NOT NULL DEFAULT 'Activo' CHECK (estado IN ('Activo', 'Finalizado', 'Cancelado')),
  tarea_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  created_by_nombre text,
  actualizado_at timestamptz,
  actualizado_por_nombre text,
  CHECK (fecha_hasta >= fecha_desde)
);

CREATE INDEX IF NOT EXISTS habitacion_bloqueos_hab_idx
  ON public.habitacion_bloqueos(habitacion_id, fecha_desde, fecha_hasta) WHERE estado = 'Activo';
CREATE INDEX IF NOT EXISTS habitacion_bloqueos_hotel_idx
  ON public.habitacion_bloqueos(hotel_id, fecha_desde, fecha_hasta);

ALTER TABLE public.habitaciones ADD COLUMN IF NOT EXISTS bloqueo_id uuid;

ALTER TABLE public.habitacion_bloqueos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hotel lee bloqueos" ON public.habitacion_bloqueos;
CREATE POLICY "hotel lee bloqueos" ON public.habitacion_bloqueos FOR SELECT TO authenticated
  USING (hotel_id = public.vulo_current_hotel_id() OR public.vulo_is_superadmin());
-- Escritura sólo por RPC.
REVOKE INSERT, UPDATE, DELETE ON public.habitacion_bloqueos FROM anon, authenticated;
GRANT SELECT ON public.habitacion_bloqueos TO authenticated;

DO $rt$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'habitacion_bloqueos') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.habitacion_bloqueos';
  END IF;
END $rt$;

INSERT INTO public.permisos_default(modulo, rol) VALUES
  ('habitaciones.bloquear', 'Admin'),
  ('habitaciones.bloquear', 'Gerente'),
  ('habitaciones.bloquear', 'Recepcion'),
  ('habitaciones.bloquear', 'Mantenimiento')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 1) ¿Hay bloqueo activo en las noches [p_desde, p_hasta)? (p_hasta = salida)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.vulo_room_blocked_in_range(
  p_habitacion_id uuid, p_desde date, p_hasta date, p_excluir uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $f$
  SELECT b.id FROM public.habitacion_bloqueos b
  WHERE b.habitacion_id = p_habitacion_id
    AND b.estado = 'Activo'
    AND b.id IS DISTINCT FROM p_excluir
    AND b.fecha_desde < CASE WHEN p_hasta <= p_desde THEN p_desde + 1 ELSE p_hasta END
    AND b.fecha_hasta >= p_desde
  ORDER BY b.fecha_desde
  LIMIT 1
$f$;
REVOKE ALL ON FUNCTION public.vulo_room_blocked_in_range(uuid, date, date, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vulo_room_blocked_in_range(uuid, date, date, uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 2) Disponibilidad: bloqueos por fecha + banderas antiguas sin fecha.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.vulo_room_available_for_stay(
  p_hotel_id uuid,
  p_habitacion_id uuid,
  p_reserva_id uuid,
  p_desde date,
  p_hasta date,
  p_require_ready boolean DEFAULT false
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.habitaciones h
    WHERE h.id = p_habitacion_id AND h.hotel_id = p_hotel_id
      AND (
        h.bloqueo_id IS NOT NULL
        OR (h.estado_habitacion NOT IN ('Mantenimiento', 'FueraDeServicio', 'Bloqueada')
            AND lower(COALESCE(h.estado_mantenimiento, 'OK')) = 'ok')
      )
      AND (NOT p_require_ready OR (
        h.estado_habitacion = 'Disponible'
        AND lower(COALESCE(h.estado_limpieza, 'Limpia')) = 'limpia'))
      AND public.vulo_room_blocked_in_range(p_habitacion_id, p_desde, p_hasta) IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.reservas r
        WHERE r.hotel_id = p_hotel_id AND r.habitacion_id = p_habitacion_id
          AND r.id IS DISTINCT FROM p_reserva_id
          AND r.estado IN ('Pendiente', 'Confirmada', 'CheckIn', 'Hospedado')
          AND r.fecha_checkin < CASE WHEN p_hasta <= p_desde THEN p_desde + 1 ELSE p_hasta END
          AND GREATEST(
            CASE WHEN r.fecha_checkout <= r.fecha_checkin THEN r.fecha_checkin + 1 ELSE r.fecha_checkout END,
            CASE WHEN r.estado IN ('CheckIn','Hospedado') AND COALESCE(r.checkin_realizado,false)
                   AND NOT COALESCE(r.checkout_realizado,false)
                 THEN public.vulo_hotel_today(p_hotel_id) + 1 ELSE r.fecha_checkin END
          ) > p_desde))
$$;
REVOKE ALL ON FUNCTION public.vulo_room_available_for_stay(uuid, uuid, uuid, date, date, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vulo_room_available_for_stay(uuid, uuid, uuid, date, date, boolean) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3) Ninguna reserva (recepción, web, cambio, extensión) cae en noches bloqueadas.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.vulo_prevent_reservation_on_block()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $f$
DECLARE
  v_block public.habitacion_bloqueos%ROWTYPE;
  v_id uuid;
BEGIN
  IF NEW.habitacion_id IS NULL OR NEW.fecha_checkin IS NULL OR NEW.fecha_checkout IS NULL
     OR COALESCE(NEW.estado, '') NOT IN ('Pendiente', 'Confirmada', 'CheckIn', 'Hospedado') THEN
    RETURN NEW;
  END IF;
  v_id := public.vulo_room_blocked_in_range(NEW.habitacion_id, NEW.fecha_checkin::date, NEW.fecha_checkout::date);
  IF v_id IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO v_block FROM public.habitacion_bloqueos WHERE id = v_id;
  RAISE EXCEPTION 'La habitación % está bloqueada del % al % (%: %)',
    (SELECT numero FROM public.habitaciones WHERE id = NEW.habitacion_id),
    to_char(v_block.fecha_desde, 'DD/MM/YYYY'), to_char(v_block.fecha_hasta, 'DD/MM/YYYY'),
    v_block.tipo, v_block.motivo
    USING ERRCODE = 'P0001';
END;
$f$;

DROP TRIGGER IF EXISTS trg_prevent_reservation_on_block ON public.reservas;
CREATE TRIGGER trg_prevent_reservation_on_block
BEFORE INSERT OR UPDATE OF habitacion_id, fecha_checkin, fecha_checkout, estado ON public.reservas
FOR EACH ROW EXECUTE FUNCTION public.vulo_prevent_reservation_on_block();

-- ---------------------------------------------------------------------------
-- 4) Sincroniza el estado "de hoy" de las habitaciones con sus bloqueos.
--    p_hotel_id NULL (cron) = todos los hoteles.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.vulo_sync_bloqueos(p_hotel_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $f$
DECLARE
  v_hotel uuid := p_hotel_id;
  v_count integer := 0;
  v_n integer;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.vulo_is_superadmin() THEN
    v_hotel := public.vulo_current_hotel_id();
  END IF;

  -- Liberar habitaciones cuyo bloqueo ya no cubre hoy.
  UPDATE public.habitaciones h SET
    estado_mantenimiento = 'OK',
    estado_habitacion = CASE
      WHEN h.estado_habitacion IN ('Mantenimiento', 'FueraDeServicio', 'Bloqueada') THEN
        CASE WHEN EXISTS (
          SELECT 1 FROM public.reservas r WHERE r.habitacion_id = h.id
            AND r.estado IN ('CheckIn', 'Hospedado') AND COALESCE(r.checkin_realizado, false)
            AND NOT COALESCE(r.checkout_realizado, false)
        ) THEN 'Ocupada' ELSE 'Disponible' END
      ELSE h.estado_habitacion END,
    fuera_servicio_motivo = NULL, fuera_servicio_desde = NULL, fuera_servicio_hasta = NULL,
    bloqueo_id = NULL
  WHERE h.bloqueo_id IS NOT NULL
    AND (v_hotel IS NULL OR h.hotel_id = v_hotel)
    AND NOT EXISTS (
      SELECT 1 FROM public.habitacion_bloqueos b
      WHERE b.id = h.bloqueo_id AND b.estado = 'Activo'
        AND public.vulo_hotel_today(h.hotel_id) BETWEEN b.fecha_desde AND b.fecha_hasta
    );
  GET DIAGNOSTICS v_n = ROW_COUNT; v_count := v_count + v_n;

  -- Aplicar bloqueos que cubren hoy (no pisa banderas manuales antiguas).
  UPDATE public.habitaciones h SET
    estado_habitacion = CASE
      WHEN h.estado_habitacion = 'Ocupada' THEN h.estado_habitacion
      WHEN b.tipo = 'Bloqueo' THEN 'Bloqueada'
      ELSE b.tipo END,
    estado_mantenimiento = CASE WHEN b.tipo = 'Bloqueo' THEN COALESCE(h.estado_mantenimiento, 'OK') ELSE 'Pendiente' END,
    fuera_servicio_motivo = b.motivo,
    fuera_servicio_desde = b.fecha_desde::timestamptz,
    fuera_servicio_hasta = (b.fecha_hasta + 1)::timestamptz,
    bloqueo_id = b.id
  FROM public.habitacion_bloqueos b
  WHERE b.habitacion_id = h.id AND b.estado = 'Activo'
    AND (v_hotel IS NULL OR h.hotel_id = v_hotel)
    AND public.vulo_hotel_today(h.hotel_id) BETWEEN b.fecha_desde AND b.fecha_hasta
    AND h.bloqueo_id IS DISTINCT FROM b.id
    AND (h.bloqueo_id IS NOT NULL OR (
      COALESCE(h.estado_habitacion, '') NOT IN ('Mantenimiento', 'FueraDeServicio', 'Bloqueada')
      AND lower(COALESCE(h.estado_mantenimiento, 'OK')) = 'ok'));
  GET DIAGNOSTICS v_n = ROW_COUNT; v_count := v_count + v_n;

  -- Bloqueos vencidos pasan a Finalizado.
  UPDATE public.habitacion_bloqueos b SET estado = 'Finalizado', actualizado_at = now()
  WHERE b.estado = 'Activo' AND (v_hotel IS NULL OR b.hotel_id = v_hotel)
    AND b.fecha_hasta < public.vulo_hotel_today(b.hotel_id);

  RETURN v_count;
END;
$f$;
REVOKE ALL ON FUNCTION public.vulo_sync_bloqueos(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vulo_sync_bloqueos(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 5) Validación común de un rango contra reservas activas.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.vulo_assert_block_range_free(
  p_hotel_id uuid, p_habitacion_id uuid, p_desde date, p_hasta date, p_excluir uuid
)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $f$
DECLARE
  v_conflictos text;
  v_otro uuid;
BEGIN
  SELECT string_agg(format('#%s %s (%s → %s)', COALESCE(r.numero_reserva, left(r.id::text, 8)),
           trim(concat_ws(' ', c.nombre, c.apellido_paterno)),
           to_char(r.fecha_checkin, 'DD/MM'), to_char(r.fecha_checkout, 'DD/MM')), ', ' ORDER BY r.fecha_checkin)
  INTO v_conflictos
  FROM public.reservas r
  LEFT JOIN public.clientes c ON c.id = r.cliente_id
  WHERE r.hotel_id = p_hotel_id AND r.habitacion_id = p_habitacion_id
    AND r.estado IN ('Pendiente', 'Confirmada', 'CheckIn', 'Hospedado')
    AND r.fecha_checkin <= p_hasta
    AND GREATEST(
      CASE WHEN r.fecha_checkout <= r.fecha_checkin THEN r.fecha_checkin + 1 ELSE r.fecha_checkout END,
      CASE WHEN r.estado IN ('CheckIn','Hospedado') AND COALESCE(r.checkin_realizado,false)
             AND NOT COALESCE(r.checkout_realizado,false)
           THEN public.vulo_hotel_today(p_hotel_id) + 1 ELSE r.fecha_checkin END
    ) > p_desde;
  IF v_conflictos IS NOT NULL THEN
    RAISE EXCEPTION 'Hay reservas en esas fechas; muévelas antes de bloquear: %', v_conflictos;
  END IF;

  v_otro := public.vulo_room_blocked_in_range(p_habitacion_id, p_desde, p_hasta + 1, p_excluir);
  IF v_otro IS NOT NULL THEN
    RAISE EXCEPTION 'Ya existe un bloqueo en esas fechas (%)',
      (SELECT format('%s al %s', to_char(fecha_desde, 'DD/MM/YYYY'), to_char(fecha_hasta, 'DD/MM/YYYY'))
       FROM public.habitacion_bloqueos WHERE id = v_otro);
  END IF;
END;
$f$;
REVOKE ALL ON FUNCTION public.vulo_assert_block_range_free(uuid, uuid, date, date, uuid) FROM PUBLIC, anon;

-- ---------------------------------------------------------------------------
-- 6) Crear bloqueo (opcionalmente con ticket de mantenimiento).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.vulo_crear_bloqueo(
  p_habitacion_id uuid,
  p_desde date,
  p_hasta date,
  p_tipo text,
  p_motivo text,
  p_crear_ticket boolean DEFAULT false,
  p_ticket jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $f$
DECLARE
  v_hab public.habitaciones%ROWTYPE;
  v_motivo text := trim(COALESCE(p_motivo, ''));
  v_tipo text := COALESCE(NULLIF(trim(COALESCE(p_tipo, '')), ''), 'Mantenimiento');
  v_tarea uuid;
  v_block public.habitacion_bloqueos%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sesión no válida'; END IF;
  IF NOT public.vulo_permitido('habitaciones.bloquear') THEN
    RAISE EXCEPTION 'Tu rol no tiene permiso para bloquear habitaciones';
  END IF;
  IF p_desde IS NULL OR p_hasta IS NULL THEN RAISE EXCEPTION 'Indica fecha inicio y fin'; END IF;
  IF p_hasta < p_desde THEN RAISE EXCEPTION 'La fecha fin no puede ser anterior a la de inicio'; END IF;
  IF length(v_motivo) < 3 THEN RAISE EXCEPTION 'Escribe el motivo del bloqueo'; END IF;
  IF v_tipo NOT IN ('Mantenimiento', 'FueraDeServicio', 'Bloqueo') THEN RAISE EXCEPTION 'Tipo de bloqueo no válido'; END IF;

  SELECT * INTO v_hab FROM public.habitaciones
  WHERE id = p_habitacion_id AND (hotel_id = public.vulo_current_hotel_id() OR public.vulo_is_superadmin())
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Habitación no encontrada'; END IF;
  IF p_hasta < public.vulo_hotel_today(v_hab.hotel_id) THEN
    RAISE EXCEPTION 'El rango ya pasó';
  END IF;

  PERFORM public.vulo_assert_block_range_free(v_hab.hotel_id, v_hab.id, p_desde, p_hasta, NULL);

  IF COALESCE(p_crear_ticket, false) THEN
    INSERT INTO public.tareas_mantenimiento(hotel_id, habitacion_id, titulo, descripcion, categoria, prioridad, estado, tipo, fecha_reporte, fecha_estimada)
    VALUES (
      v_hab.hotel_id, v_hab.id,
      COALESCE(NULLIF(trim(COALESCE(p_ticket->>'titulo', '')), ''), v_motivo),
      COALESCE(NULLIF(trim(COALESCE(p_ticket->>'descripcion', '')), ''), v_motivo),
      COALESCE(NULLIF(p_ticket->>'categoria', ''), 'General'),
      COALESCE(NULLIF(p_ticket->>'prioridad', ''), 'Normal'),
      'Pendiente', 'Bloqueo por fechas', now(), p_hasta
    )
    RETURNING id INTO v_tarea;
  END IF;

  INSERT INTO public.habitacion_bloqueos(hotel_id, habitacion_id, tipo, fecha_desde, fecha_hasta, motivo, tarea_id, created_by, created_by_nombre)
  VALUES (v_hab.hotel_id, v_hab.id, v_tipo, p_desde, p_hasta, v_motivo, v_tarea, auth.uid(), public.vulo_actor_name())
  RETURNING * INTO v_block;

  INSERT INTO public.auditoria(hotel_id, user_id, user_email, accion, entidad, entidad_id, descripcion, datos_despues)
  VALUES (v_hab.hotel_id, auth.uid(), (SELECT email FROM public.profiles WHERE id = auth.uid()),
    'HABITACION_BLOQUEADA', 'habitacion', v_hab.id,
    format('Hab. %s %s del %s al %s: %s', v_hab.numero, v_tipo, p_desde, p_hasta, v_motivo), to_jsonb(v_block));

  PERFORM public.vulo_sync_bloqueos(v_hab.hotel_id);
  RETURN to_jsonb(v_block);
END;
$f$;
REVOKE ALL ON FUNCTION public.vulo_crear_bloqueo(uuid, date, date, text, text, boolean, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vulo_crear_bloqueo(uuid, date, date, text, text, boolean, jsonb) TO authenticated;

-- ---------------------------------------------------------------------------
-- 7) Editar fechas / tipo / motivo.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.vulo_editar_bloqueo(
  p_bloqueo_id uuid, p_desde date, p_hasta date, p_tipo text, p_motivo text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $f$
DECLARE
  v_old public.habitacion_bloqueos%ROWTYPE;
  v_new public.habitacion_bloqueos%ROWTYPE;
  v_motivo text := trim(COALESCE(p_motivo, ''));
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sesión no válida'; END IF;
  IF NOT public.vulo_permitido('habitaciones.bloquear') THEN
    RAISE EXCEPTION 'Tu rol no tiene permiso para bloquear habitaciones';
  END IF;
  SELECT * INTO v_old FROM public.habitacion_bloqueos
  WHERE id = p_bloqueo_id AND (hotel_id = public.vulo_current_hotel_id() OR public.vulo_is_superadmin())
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Bloqueo no encontrado'; END IF;
  IF v_old.estado <> 'Activo' THEN RAISE EXCEPTION 'El bloqueo ya no está activo'; END IF;
  IF p_desde IS NULL OR p_hasta IS NULL OR p_hasta < p_desde THEN RAISE EXCEPTION 'Rango de fechas no válido'; END IF;
  IF length(v_motivo) < 3 THEN RAISE EXCEPTION 'Escribe el motivo del bloqueo'; END IF;
  IF COALESCE(p_tipo, v_old.tipo) NOT IN ('Mantenimiento', 'FueraDeServicio', 'Bloqueo') THEN RAISE EXCEPTION 'Tipo de bloqueo no válido'; END IF;

  PERFORM public.vulo_assert_block_range_free(v_old.hotel_id, v_old.habitacion_id, p_desde, p_hasta, v_old.id);

  UPDATE public.habitacion_bloqueos SET
    fecha_desde = p_desde, fecha_hasta = p_hasta, tipo = COALESCE(p_tipo, tipo), motivo = v_motivo,
    actualizado_at = now(), actualizado_por_nombre = public.vulo_actor_name()
  WHERE id = v_old.id
  RETURNING * INTO v_new;

  -- Forzar re-aplicación del estado de hoy.
  UPDATE public.habitaciones SET bloqueo_id = NULL,
    estado_mantenimiento = 'OK',
    estado_habitacion = CASE WHEN estado_habitacion IN ('Mantenimiento', 'FueraDeServicio', 'Bloqueada') THEN 'Disponible' ELSE estado_habitacion END
  WHERE id = v_old.habitacion_id AND bloqueo_id = v_old.id;

  INSERT INTO public.auditoria(hotel_id, user_id, user_email, accion, entidad, entidad_id, descripcion, datos_antes, datos_despues)
  VALUES (v_old.hotel_id, auth.uid(), (SELECT email FROM public.profiles WHERE id = auth.uid()),
    'BLOQUEO_EDITADO', 'habitacion', v_old.habitacion_id, 'Bloqueo de habitación editado', to_jsonb(v_old), to_jsonb(v_new));

  PERFORM public.vulo_sync_bloqueos(v_old.hotel_id);
  RETURN to_jsonb(v_new);
END;
$f$;
REVOKE ALL ON FUNCTION public.vulo_editar_bloqueo(uuid, date, date, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vulo_editar_bloqueo(uuid, date, date, text, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 8) Terminar / cancelar: si ya empezó termina ayer (hoy queda libre);
--    si no ha empezado se cancela.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.vulo_terminar_bloqueo_interno(p_bloqueo_id uuid, p_motivo text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $f$
DECLARE
  v_b public.habitacion_bloqueos%ROWTYPE;
  v_today date;
BEGIN
  SELECT * INTO v_b FROM public.habitacion_bloqueos WHERE id = p_bloqueo_id AND estado = 'Activo' FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  v_today := public.vulo_hotel_today(v_b.hotel_id);
  IF v_b.fecha_desde >= v_today THEN
    UPDATE public.habitacion_bloqueos SET estado = 'Cancelado', actualizado_at = now(),
      actualizado_por_nombre = public.vulo_actor_name(),
      motivo = concat_ws(' · ', motivo, NULLIF(trim(COALESCE(p_motivo, '')), ''))
    WHERE id = v_b.id;
  ELSE
    UPDATE public.habitacion_bloqueos SET estado = 'Finalizado', fecha_hasta = LEAST(fecha_hasta, v_today - 1),
      actualizado_at = now(), actualizado_por_nombre = public.vulo_actor_name(),
      motivo = concat_ws(' · ', motivo, NULLIF(trim(COALESCE(p_motivo, '')), ''))
    WHERE id = v_b.id;
  END IF;
END;
$f$;
REVOKE ALL ON FUNCTION public.vulo_terminar_bloqueo_interno(uuid, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.vulo_cancelar_bloqueo(p_bloqueo_id uuid, p_motivo text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $f$
DECLARE
  v_b public.habitacion_bloqueos%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sesión no válida'; END IF;
  IF NOT public.vulo_permitido('habitaciones.bloquear') THEN
    RAISE EXCEPTION 'Tu rol no tiene permiso para bloquear habitaciones';
  END IF;
  SELECT * INTO v_b FROM public.habitacion_bloqueos
  WHERE id = p_bloqueo_id AND (hotel_id = public.vulo_current_hotel_id() OR public.vulo_is_superadmin());
  IF NOT FOUND THEN RAISE EXCEPTION 'Bloqueo no encontrado'; END IF;

  PERFORM public.vulo_terminar_bloqueo_interno(v_b.id, p_motivo);

  INSERT INTO public.auditoria(hotel_id, user_id, user_email, accion, entidad, entidad_id, descripcion, datos_antes, datos_despues)
  VALUES (v_b.hotel_id, auth.uid(), (SELECT email FROM public.profiles WHERE id = auth.uid()),
    'BLOQUEO_TERMINADO', 'habitacion', v_b.habitacion_id, COALESCE(NULLIF(trim(COALESCE(p_motivo, '')), ''), 'Bloqueo terminado'),
    to_jsonb(v_b), (SELECT to_jsonb(b) FROM public.habitacion_bloqueos b WHERE b.id = v_b.id));

  PERFORM public.vulo_sync_bloqueos(v_b.hotel_id);
  RETURN (SELECT to_jsonb(b) FROM public.habitacion_bloqueos b WHERE b.id = v_b.id);
END;
$f$;
REVOKE ALL ON FUNCTION public.vulo_cancelar_bloqueo(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vulo_cancelar_bloqueo(uuid, text) TO authenticated;

-- "Marcar disponible" en Habitaciones: termina el bloqueo que cubre hoy.
CREATE OR REPLACE FUNCTION public.vulo_liberar_bloqueo_hoy(p_habitacion_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $f$
DECLARE
  v_hotel uuid;
  v_b record;
  v_n integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sesión no válida'; END IF;
  SELECT hotel_id INTO v_hotel FROM public.habitaciones
  WHERE id = p_habitacion_id AND (hotel_id = public.vulo_current_hotel_id() OR public.vulo_is_superadmin());
  IF v_hotel IS NULL THEN RAISE EXCEPTION 'Habitación no encontrada'; END IF;
  FOR v_b IN
    SELECT id FROM public.habitacion_bloqueos
    WHERE habitacion_id = p_habitacion_id AND estado = 'Activo'
      AND public.vulo_hotel_today(v_hotel) BETWEEN fecha_desde AND fecha_hasta
  LOOP
    PERFORM public.vulo_terminar_bloqueo_interno(v_b.id, 'Liberada manualmente');
    v_n := v_n + 1;
  END LOOP;
  PERFORM public.vulo_sync_bloqueos(v_hotel);
  RETURN v_n;
END;
$f$;
REVOKE ALL ON FUNCTION public.vulo_liberar_bloqueo_hoy(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vulo_liberar_bloqueo_hoy(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 9) Cerrar el ticket ligado termina su bloqueo.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.vulo_end_block_on_ticket_close()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $f$
DECLARE
  v_b record;
BEGIN
  IF NEW.estado IN ('Completada', 'Completado', 'Resuelto', 'Cerrado', 'Cancelada', 'Cancelado')
     AND OLD.estado IS DISTINCT FROM NEW.estado THEN
    FOR v_b IN SELECT id FROM public.habitacion_bloqueos WHERE tarea_id = NEW.id AND estado = 'Activo' LOOP
      PERFORM public.vulo_terminar_bloqueo_interno(v_b.id, 'Ticket de mantenimiento cerrado');
    END LOOP;
    PERFORM public.vulo_sync_bloqueos(NEW.hotel_id);
  END IF;
  RETURN NEW;
END;
$f$;

DROP TRIGGER IF EXISTS trg_end_block_on_ticket_close ON public.tareas_mantenimiento;
CREATE TRIGGER trg_end_block_on_ticket_close
AFTER UPDATE OF estado ON public.tareas_mantenimiento
FOR EACH ROW EXECUTE FUNCTION public.vulo_end_block_on_ticket_close();

-- ---------------------------------------------------------------------------
-- 10) Página pública: bloqueos por fecha y habitaciones visibles.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_public_room_blocks(p_hotel_id uuid)
RETURNS TABLE(habitacion_id uuid, fecha_desde date, fecha_hasta date)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $f$
  SELECT b.habitacion_id, b.fecha_desde, b.fecha_hasta
  FROM public.habitacion_bloqueos b
  WHERE b.hotel_id = p_hotel_id AND b.estado = 'Activo'
    AND b.fecha_hasta >= public.vulo_hotel_today(p_hotel_id)
    AND public.vulo_hotel_publico(p_hotel_id)
$f$;
REVOKE ALL ON FUNCTION public.get_public_room_blocks(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_room_blocks(uuid) TO anon, authenticated;

-- La habitación sólo se oculta por banderas antiguas sin fecha.
DROP POLICY IF EXISTS "Publico ve habitaciones web" ON public.habitaciones;
CREATE POLICY "Publico ve habitaciones web" ON public.habitaciones FOR SELECT TO anon USING (
  NOT COALESCE(excluida_publica, false)
  AND public.vulo_hotel_publico(hotel_id)
  AND (
    bloqueo_id IS NOT NULL
    OR (COALESCE(estado_habitacion, '') NOT IN ('Mantenimiento', 'FueraDeServicio', 'Bloqueada')
        AND lower(COALESCE(estado_mantenimiento, 'OK')) = 'ok')
  )
);

-- ---------------------------------------------------------------------------
-- 11) Sincronización automática cada hora (si pg_cron está disponible).
-- ---------------------------------------------------------------------------
DO $cron$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      PERFORM cron.unschedule('vulo_sync_bloqueos');
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    PERFORM cron.schedule('vulo_sync_bloqueos', '5 * * * *', 'SELECT public.vulo_sync_bloqueos(NULL)');
  END IF;
END $cron$;

SELECT public.vulo_sync_bloqueos(NULL);

NOTIFY pgrst, 'reload schema';

SELECT 'BLOQUEOS POR FECHA APLICADOS' AS resultado;
