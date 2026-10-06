-- ============================================================================
-- AGENTE DE IMPRESIÓN (Windows, térmica ESC/POS) CON COLA EN LA NUBE
--  * print_agentes: PCs con el agente instalado, vinculadas por código.
--  * print_trabajos: cola; desde cualquier dispositivo se manda y el agente
--    de recepción imprime.
--  * El agente no usa usuario: se identifica con un token (se guarda sólo su
--    hash) y llama a funciones validadas por ese token.
-- Fecha: 06/10/2026
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.print_agentes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  token_hash text UNIQUE,
  impresora text,
  impresoras jsonb NOT NULL DEFAULT '[]'::jsonb,
  ancho smallint NOT NULL DEFAULT 48,
  version text,
  ultimo_contacto timestamptz,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
CREATE INDEX IF NOT EXISTS print_agentes_hotel_idx ON public.print_agentes(hotel_id);

CREATE TABLE IF NOT EXISTS public.print_codigos (
  codigo text PRIMARY KEY,
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  expira_at timestamptz NOT NULL,
  usado_at timestamptz,
  created_by uuid
);

CREATE TABLE IF NOT EXISTS public.print_trabajos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  agente_id uuid REFERENCES public.print_agentes(id) ON DELETE SET NULL,
  tipo text NOT NULL DEFAULT 'documento',
  titulo text NOT NULL DEFAULT 'Documento',
  contenido jsonb NOT NULL DEFAULT '[]'::jsonb,
  copias smallint NOT NULL DEFAULT 1 CHECK (copias BETWEEN 1 AND 5),
  estado text NOT NULL DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente', 'Imprimiendo', 'Impreso', 'Error', 'Cancelado')),
  error text,
  intentos smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  created_by_nombre text,
  tomado_at timestamptz,
  impreso_at timestamptz
);
CREATE INDEX IF NOT EXISTS print_trabajos_cola_idx ON public.print_trabajos(hotel_id, estado, created_at);

ALTER TABLE public.print_agentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.print_codigos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.print_trabajos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hotel lee agentes" ON public.print_agentes;
CREATE POLICY "hotel lee agentes" ON public.print_agentes FOR SELECT TO authenticated
  USING (hotel_id = public.vulo_current_hotel_id() OR public.vulo_is_superadmin());
DROP POLICY IF EXISTS "hotel lee trabajos" ON public.print_trabajos;
CREATE POLICY "hotel lee trabajos" ON public.print_trabajos FOR SELECT TO authenticated
  USING (hotel_id = public.vulo_current_hotel_id() OR public.vulo_is_superadmin());
-- Escritura sólo por funciones; el token nunca se expone.
REVOKE ALL ON public.print_agentes, public.print_codigos, public.print_trabajos FROM anon, authenticated;
GRANT SELECT (id, hotel_id, nombre, impresora, impresoras, ancho, version, ultimo_contacto, activo, created_at)
  ON public.print_agentes TO authenticated;
GRANT SELECT ON public.print_trabajos TO authenticated;

DO $rt$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'print_trabajos') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.print_trabajos';
  END IF;
END $rt$;

-- ---------------------------------------------------------------------------
-- Desde el sistema (usuario con sesión)
-- ---------------------------------------------------------------------------

-- Código de 8 caracteres para vincular un agente (válido 15 minutos).
CREATE OR REPLACE FUNCTION public.vulo_print_crear_codigo(p_nombre text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $f$
DECLARE
  v_hotel uuid := public.vulo_current_hotel_id();
  v_alfabeto text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_codigo text;
  i int;
BEGIN
  IF auth.uid() IS NULL OR v_hotel IS NULL THEN RAISE EXCEPTION 'Sesión no válida'; END IF;
  IF NOT public.vulo_permitido('configuracion') THEN
    RAISE EXCEPTION 'Tu rol no tiene permiso para configurar impresoras';
  END IF;
  DELETE FROM public.print_codigos WHERE expira_at < now() - interval '1 day';
  LOOP
    v_codigo := '';
    FOR i IN 1..8 LOOP
      v_codigo := v_codigo || substr(v_alfabeto, 1 + floor(random() * length(v_alfabeto))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.print_codigos WHERE codigo = v_codigo);
  END LOOP;
  INSERT INTO public.print_codigos(codigo, hotel_id, nombre, expira_at, created_by)
  VALUES (v_codigo, v_hotel, COALESCE(NULLIF(trim(p_nombre), ''), 'Recepción'), now() + interval '15 minutes', auth.uid());
  RETURN jsonb_build_object('codigo', v_codigo, 'expira_at', now() + interval '15 minutes');
END;
$f$;
REVOKE ALL ON FUNCTION public.vulo_print_crear_codigo(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vulo_print_crear_codigo(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.vulo_print_eliminar_agente(p_agente_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $f$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sesión no válida'; END IF;
  IF NOT public.vulo_permitido('configuracion') THEN
    RAISE EXCEPTION 'Tu rol no tiene permiso para configurar impresoras';
  END IF;
  DELETE FROM public.print_agentes
  WHERE id = p_agente_id AND (hotel_id = public.vulo_current_hotel_id() OR public.vulo_is_superadmin());
END;
$f$;
REVOKE ALL ON FUNCTION public.vulo_print_eliminar_agente(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vulo_print_eliminar_agente(uuid) TO authenticated;

-- Manda un documento a la cola. p_agente_id NULL = cualquier agente del hotel.
CREATE OR REPLACE FUNCTION public.vulo_imprimir(
  p_tipo text, p_titulo text, p_contenido jsonb, p_agente_id uuid DEFAULT NULL, p_copias int DEFAULT 1
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $f$
DECLARE
  v_hotel uuid := public.vulo_current_hotel_id();
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL OR v_hotel IS NULL THEN RAISE EXCEPTION 'Sesión no válida'; END IF;
  IF jsonb_typeof(p_contenido) <> 'array' OR jsonb_array_length(p_contenido) = 0 THEN
    RAISE EXCEPTION 'El documento está vacío';
  END IF;
  IF p_agente_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.print_agentes WHERE id = p_agente_id AND hotel_id = v_hotel AND activo
  ) THEN
    RAISE EXCEPTION 'Impresora no encontrada';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.print_agentes WHERE hotel_id = v_hotel AND activo) THEN
    RAISE EXCEPTION 'No hay ninguna impresora vinculada. Instala el agente en Configuración › Impresión.';
  END IF;
  INSERT INTO public.print_trabajos(hotel_id, agente_id, tipo, titulo, contenido, copias, created_by, created_by_nombre)
  VALUES (v_hotel, p_agente_id, COALESCE(NULLIF(p_tipo, ''), 'documento'), COALESCE(NULLIF(p_titulo, ''), 'Documento'),
    p_contenido, LEAST(GREATEST(COALESCE(p_copias, 1), 1), 5), auth.uid(), public.vulo_actor_name())
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$f$;
REVOKE ALL ON FUNCTION public.vulo_imprimir(text, text, jsonb, uuid, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vulo_imprimir(text, text, jsonb, uuid, int) TO authenticated;

-- ---------------------------------------------------------------------------
-- Desde el agente (sin sesión; validado por token)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.vulo_print_hash(p_token text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $f$ SELECT encode(sha256(convert_to(COALESCE(p_token, ''), 'UTF8')), 'hex') $f$;

CREATE OR REPLACE FUNCTION public.vulo_print_vincular(p_codigo text, p_version text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $f$
DECLARE
  v_cod public.print_codigos%ROWTYPE;
  v_token text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  v_agente public.print_agentes%ROWTYPE;
BEGIN
  SELECT * INTO v_cod FROM public.print_codigos
  WHERE codigo = upper(replace(trim(COALESCE(p_codigo, '')), '-', ''))
  FOR UPDATE;
  IF NOT FOUND OR v_cod.usado_at IS NOT NULL OR v_cod.expira_at < now() THEN
    PERFORM pg_sleep(1);
    RAISE EXCEPTION 'Código inválido o vencido. Genera uno nuevo en Configuración › Impresión.';
  END IF;
  UPDATE public.print_codigos SET usado_at = now() WHERE codigo = v_cod.codigo;
  INSERT INTO public.print_agentes(hotel_id, nombre, token_hash, version, ultimo_contacto, created_by)
  VALUES (v_cod.hotel_id, v_cod.nombre, public.vulo_print_hash(v_token), p_version, now(), v_cod.created_by)
  RETURNING * INTO v_agente;
  RETURN jsonb_build_object(
    'token', v_token, 'agente_id', v_agente.id, 'nombre', v_agente.nombre,
    'hotel', (SELECT nombre FROM public.hotels WHERE id = v_cod.hotel_id)
  );
END;
$f$;
REVOKE ALL ON FUNCTION public.vulo_print_vincular(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vulo_print_vincular(text, text) TO anon, authenticated;

-- Latido + toma de trabajos pendientes.
CREATE OR REPLACE FUNCTION public.vulo_print_tomar(
  p_token text, p_impresora text DEFAULT NULL, p_impresoras jsonb DEFAULT NULL,
  p_ancho int DEFAULT NULL, p_version text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $f$
DECLARE
  v_agente public.print_agentes%ROWTYPE;
  v_trabajos jsonb;
BEGIN
  UPDATE public.print_agentes SET
    ultimo_contacto = now(),
    impresora = COALESCE(NULLIF(p_impresora, ''), impresora),
    impresoras = COALESCE(p_impresoras, impresoras),
    ancho = COALESCE(p_ancho, ancho),
    version = COALESCE(p_version, version)
  WHERE token_hash = public.vulo_print_hash(p_token)
  RETURNING * INTO v_agente;
  IF NOT FOUND THEN RAISE EXCEPTION 'AGENTE_NO_VINCULADO'; END IF;

  IF NOT v_agente.activo OR COALESCE(v_agente.impresora, '') = '' THEN
    RETURN jsonb_build_object('nombre', v_agente.nombre, 'activo', v_agente.activo, 'trabajos', '[]'::jsonb);
  END IF;

  -- Trabajos que se quedaron "imprimiendo" (agente cerrado) vuelven a la cola.
  UPDATE public.print_trabajos SET estado = 'Pendiente'
  WHERE hotel_id = v_agente.hotel_id AND estado = 'Imprimiendo'
    AND tomado_at < now() - interval '2 minutes' AND intentos < 3;
  UPDATE public.print_trabajos SET estado = 'Error', error = 'No se pudo imprimir después de 3 intentos'
  WHERE hotel_id = v_agente.hotel_id AND estado = 'Imprimiendo'
    AND tomado_at < now() - interval '2 minutes' AND intentos >= 3;
  -- Lo que nadie imprimió en un día ya no se imprime.
  UPDATE public.print_trabajos SET estado = 'Cancelado', error = 'Sin impresora disponible'
  WHERE hotel_id = v_agente.hotel_id AND estado = 'Pendiente' AND created_at < now() - interval '1 day';

  WITH tomados AS (
    SELECT id FROM public.print_trabajos
    WHERE hotel_id = v_agente.hotel_id AND estado = 'Pendiente'
      AND (agente_id IS NULL OR agente_id = v_agente.id)
    ORDER BY created_at
    LIMIT 5
    FOR UPDATE SKIP LOCKED
  ), act AS (
    UPDATE public.print_trabajos t SET estado = 'Imprimiendo', tomado_at = now(),
      intentos = t.intentos + 1, agente_id = v_agente.id
    FROM tomados WHERE t.id = tomados.id
    RETURNING t.id, t.tipo, t.titulo, t.contenido, t.copias, t.created_at
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', id, 'tipo', tipo, 'titulo', titulo, 'contenido', contenido, 'copias', copias
  ) ORDER BY created_at), '[]'::jsonb) INTO v_trabajos FROM act;

  RETURN jsonb_build_object('nombre', v_agente.nombre, 'activo', true, 'trabajos', v_trabajos);
END;
$f$;
REVOKE ALL ON FUNCTION public.vulo_print_tomar(text, text, jsonb, int, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vulo_print_tomar(text, text, jsonb, int, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.vulo_print_reportar(p_token text, p_trabajo_id uuid, p_ok boolean, p_error text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $f$
DECLARE
  v_agente uuid;
BEGIN
  SELECT id INTO v_agente FROM public.print_agentes WHERE token_hash = public.vulo_print_hash(p_token);
  IF v_agente IS NULL THEN RAISE EXCEPTION 'AGENTE_NO_VINCULADO'; END IF;
  UPDATE public.print_trabajos SET
    estado = CASE WHEN p_ok THEN 'Impreso' ELSE 'Error' END,
    impreso_at = CASE WHEN p_ok THEN now() ELSE NULL END,
    error = CASE WHEN p_ok THEN NULL ELSE left(COALESCE(p_error, 'Error de impresora'), 500) END
  WHERE id = p_trabajo_id AND agente_id = v_agente;
  DELETE FROM public.print_trabajos
  WHERE agente_id = v_agente AND created_at < now() - interval '30 days';
END;
$f$;
REVOKE ALL ON FUNCTION public.vulo_print_reportar(text, uuid, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vulo_print_reportar(text, uuid, boolean, text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

SELECT 'AGENTE DE IMPRESION APLICADO' AS resultado;
