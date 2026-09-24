-- Página pública de reservas y políticas de reserva.
--  * Corrige "Hotel no disponible": la vista pública ya no depende de los
--    permisos de columnas de hotels para el visitante sin sesión.
--  * El visitante ve tipos, habitaciones, temporadas y ocupación sólo de
--    hoteles con reservas en línea activas.
--  * Políticas: estancia mínima/máxima por fechas, días de llegada no
--    permitidos y "no se permite una sola noche en sábado/domingo".

-- ---------------------------------------------------------------------------
-- 1. ¿El hotel tiene reservas en línea activas?
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.vulo_hotel_publico(p_hotel_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $pp_pub$
DECLARE
  v_ok boolean;
BEGIN
  SELECT COALESCE(h.permite_reservas_online, false)
    INTO v_ok
  FROM public.hotels h
  WHERE h.id = p_hotel_id;
  RETURN COALESCE(v_ok, false);
END;
$pp_pub$;

REVOKE ALL ON FUNCTION public.vulo_hotel_publico(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vulo_hotel_publico(uuid) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Vista pública de hoteles (con permisos del dueño de la vista)
-- ---------------------------------------------------------------------------
DO $pp_view$
DECLARE
  v_cols text;
  v_where text := 'h.slug IS NOT NULL';
  v_wanted text[] := ARRAY[
    'id','nombre','slug','ciudad','estado','pais','direccion','descripcion_publica',
    'estrellas','hora_checkin','hora_checkout','logo_url','moneda_codigo','moneda_locale',
    'moneda_simbolo','permite_reservas_online','porcentaje_anticipo','requiere_anticipo',
    'timezone','activo_plataforma'
  ];
  v_col text;
  v_parts text[] := ARRAY[]::text[];
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
  v_cols := array_to_string(v_parts, ', ');

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'hotels' AND column_name = 'suspendido_at') THEN
    v_where := v_where || ' AND h.suspendido_at IS NULL';
  END IF;

  BEGIN
    DROP VIEW IF EXISTS public.hotels_publicos;
  EXCEPTION WHEN dependent_objects_still_exist THEN
    -- Si otra vista depende de ésta, sólo se cambia a permisos del dueño.
    EXECUTE 'ALTER VIEW public.hotels_publicos SET (security_invoker = false)';
    EXECUTE 'GRANT SELECT ON public.hotels_publicos TO anon, authenticated';
    RETURN;
  END;

  EXECUTE format(
    'CREATE VIEW public.hotels_publicos WITH (security_invoker = false) AS SELECT %s FROM public.hotels h WHERE %s',
    v_cols, v_where
  );
  EXECUTE 'GRANT SELECT ON public.hotels_publicos TO anon, authenticated';
END $pp_view$;

-- ---------------------------------------------------------------------------
-- 3. Lo que el visitante necesita leer
-- ---------------------------------------------------------------------------
GRANT SELECT ON public.tipos_habitacion TO anon;
DROP POLICY IF EXISTS "Publico ve tipos web" ON public.tipos_habitacion;
CREATE POLICY "Publico ve tipos web" ON public.tipos_habitacion
  FOR SELECT TO anon
  USING (COALESCE(publicar_web, true) AND public.vulo_hotel_publico(hotel_id));

DO $pp_hab$
DECLARE
  v_cols text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ')
  INTO v_cols
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'habitaciones'
    AND column_name IN ('id', 'hotel_id', 'numero', 'piso', 'tipo_habitacion_id', 'fotos', 'excluida_publica');
  EXECUTE format('GRANT SELECT (%s) ON public.habitaciones TO anon', v_cols);
END $pp_hab$;
DROP POLICY IF EXISTS "Publico ve habitaciones web" ON public.habitaciones;
CREATE POLICY "Publico ve habitaciones web" ON public.habitaciones
  FOR SELECT TO anon
  USING (NOT COALESCE(excluida_publica, false) AND public.vulo_hotel_publico(hotel_id));

DO $pp_temp$
BEGIN
  IF to_regclass('public.temporadas') IS NOT NULL THEN
    EXECUTE 'GRANT SELECT ON public.temporadas TO anon';
    EXECUTE 'DROP POLICY IF EXISTS "Publico ve temporadas" ON public.temporadas';
    EXECUTE 'CREATE POLICY "Publico ve temporadas" ON public.temporadas FOR SELECT TO anon USING (public.vulo_hotel_publico(hotel_id))';
  END IF;
END $pp_temp$;

DROP POLICY IF EXISTS "Public can view reservas for availability" ON public.reservas;
CREATE POLICY "Public can view reservas for availability"
  ON public.reservas FOR SELECT TO anon
  USING (
    public.vulo_hotel_publico(hotel_id)
    AND estado IN ('Pendiente', 'Confirmada', 'CheckIn', 'Hospedado')
  );

-- ---------------------------------------------------------------------------
-- 4. Políticas de reserva
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.politicas_reserva (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  fecha_inicio date,
  fecha_fin date,
  min_noches integer,
  max_noches integer,
  dias_llegada_no_permitidos integer[] NOT NULL DEFAULT '{}',
  noche_sola_no_permitida integer[] NOT NULL DEFAULT '{}',
  aplica_web boolean NOT NULL DEFAULT true,
  aplica_recepcion boolean NOT NULL DEFAULT false,
  activo boolean NOT NULL DEFAULT true,
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT politicas_reserva_nombre_check CHECK (length(trim(nombre)) > 0),
  CONSTRAINT politicas_reserva_fechas_check CHECK (fecha_inicio IS NULL OR fecha_fin IS NULL OR fecha_fin >= fecha_inicio),
  CONSTRAINT politicas_reserva_noches_check CHECK (
    (min_noches IS NULL OR min_noches >= 1)
    AND (max_noches IS NULL OR max_noches >= 1)
    AND (min_noches IS NULL OR max_noches IS NULL OR max_noches >= min_noches)
  ),
  CONSTRAINT politicas_reserva_dias_check CHECK (
    dias_llegada_no_permitidos <@ ARRAY[0,1,2,3,4,5,6]
    AND noche_sola_no_permitida <@ ARRAY[0,1,2,3,4,5,6]
  )
);

CREATE INDEX IF NOT EXISTS politicas_reserva_hotel_idx ON public.politicas_reserva(hotel_id, activo);

ALTER TABLE public.politicas_reserva ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant select politicas_reserva" ON public.politicas_reserva;
DROP POLICY IF EXISTS "tenant insert politicas_reserva" ON public.politicas_reserva;
DROP POLICY IF EXISTS "tenant update politicas_reserva" ON public.politicas_reserva;
DROP POLICY IF EXISTS "tenant delete politicas_reserva" ON public.politicas_reserva;
CREATE POLICY "tenant select politicas_reserva" ON public.politicas_reserva FOR SELECT TO authenticated
  USING (hotel_id = public.vulo_current_hotel_id() OR public.vulo_is_superadmin());
CREATE POLICY "tenant insert politicas_reserva" ON public.politicas_reserva FOR INSERT TO authenticated
  WITH CHECK (hotel_id = public.vulo_current_hotel_id() OR public.vulo_is_superadmin());
CREATE POLICY "tenant update politicas_reserva" ON public.politicas_reserva FOR UPDATE TO authenticated
  USING (hotel_id = public.vulo_current_hotel_id() OR public.vulo_is_superadmin())
  WITH CHECK (hotel_id = public.vulo_current_hotel_id() OR public.vulo_is_superadmin());
CREATE POLICY "tenant delete politicas_reserva" ON public.politicas_reserva FOR DELETE TO authenticated
  USING (hotel_id = public.vulo_current_hotel_id() OR public.vulo_is_superadmin());

REVOKE ALL ON public.politicas_reserva FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.politicas_reserva TO authenticated;

CREATE OR REPLACE FUNCTION public.vulo_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $pp_touch$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$pp_touch$;

DROP TRIGGER IF EXISTS trg_politicas_reserva_updated_at ON public.politicas_reserva;
CREATE TRIGGER trg_politicas_reserva_updated_at
BEFORE UPDATE ON public.politicas_reserva
FOR EACH ROW EXECUTE FUNCTION public.vulo_touch_updated_at();

-- Devuelve el motivo por el que una estancia no cumple, o NULL si cumple.
CREATE OR REPLACE FUNCTION public.vulo_validar_politicas_reserva(
  p_hotel_id uuid,
  p_checkin date,
  p_checkout date,
  p_canal text DEFAULT 'web'
)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $pp_val$
DECLARE
  v_pol record;
  v_noches integer := GREATEST(1, p_checkout - p_checkin);
  v_dow integer := extract(dow FROM p_checkin)::integer;
  v_dias text[] := ARRAY['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
BEGIN
  IF p_hotel_id IS NULL OR p_checkin IS NULL OR p_checkout IS NULL THEN
    RETURN NULL;
  END IF;

  FOR v_pol IN
    SELECT *
    FROM public.politicas_reserva p
    WHERE p.hotel_id = p_hotel_id
      AND p.activo
      AND ((p_canal = 'web' AND p.aplica_web) OR (p_canal = 'recepcion' AND p.aplica_recepcion))
      AND (p.fecha_inicio IS NULL OR p_checkin >= p.fecha_inicio)
      AND (p.fecha_fin IS NULL OR p_checkin <= p.fecha_fin)
    ORDER BY p.fecha_inicio NULLS LAST, p.created_at
  LOOP
    IF v_pol.min_noches IS NOT NULL AND v_noches < v_pol.min_noches THEN
      RETURN format('%s: la estancia mínima es de %s noches.', v_pol.nombre, v_pol.min_noches);
    END IF;
    IF v_pol.max_noches IS NOT NULL AND v_noches > v_pol.max_noches THEN
      RETURN format('%s: la estancia máxima es de %s noches.', v_pol.nombre, v_pol.max_noches);
    END IF;
    IF v_dow = ANY(v_pol.dias_llegada_no_permitidos) THEN
      RETURN format('%s: no se permiten llegadas en %s.', v_pol.nombre, v_dias[v_dow + 1]);
    END IF;
    IF v_noches = 1 AND v_dow = ANY(v_pol.noche_sola_no_permitida) THEN
      RETURN format('%s: no se puede reservar sólo la noche del %s.', v_pol.nombre, v_dias[v_dow + 1]);
    END IF;
  END LOOP;

  RETURN NULL;
END;
$pp_val$;

REVOKE ALL ON FUNCTION public.vulo_validar_politicas_reserva(uuid, date, date, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vulo_validar_politicas_reserva(uuid, date, date, text) TO anon, authenticated;

-- Se aplica al crear la reservación: web siempre; recepción sólo si la
-- política lo indica.
CREATE OR REPLACE FUNCTION public.vulo_aplicar_politicas_reserva()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $pp_trg$
DECLARE
  v_canal text := CASE WHEN lower(COALESCE(NEW.origen, '')) = 'web' THEN 'web' ELSE 'recepcion' END;
  v_error text;
BEGIN
  IF v_canal = 'recepcion' AND auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  v_error := public.vulo_validar_politicas_reserva(
    NEW.hotel_id, (NEW.fecha_checkin)::date, (NEW.fecha_checkout)::date, v_canal
  );
  IF v_error IS NOT NULL THEN
    RAISE EXCEPTION '%', v_error;
  END IF;
  RETURN NEW;
END;
$pp_trg$;

REVOKE ALL ON FUNCTION public.vulo_aplicar_politicas_reserva() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_vulo_aplicar_politicas_reserva ON public.reservas;
CREATE TRIGGER trg_vulo_aplicar_politicas_reserva
BEFORE INSERT ON public.reservas
FOR EACH ROW EXECUTE FUNCTION public.vulo_aplicar_politicas_reserva();

-- Políticas visibles para la página pública.
CREATE OR REPLACE FUNCTION public.get_public_booking_policies(p_hotel_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $pp_get$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', p.id,
    'nombre', p.nombre,
    'fecha_inicio', p.fecha_inicio,
    'fecha_fin', p.fecha_fin,
    'min_noches', p.min_noches,
    'max_noches', p.max_noches,
    'dias_llegada_no_permitidos', p.dias_llegada_no_permitidos,
    'noche_sola_no_permitida', p.noche_sola_no_permitida,
    'notas', p.notas
  ) ORDER BY p.fecha_inicio NULLS LAST, p.created_at), '[]'::jsonb)
  FROM public.politicas_reserva p
  WHERE p.hotel_id = p_hotel_id
    AND p.activo
    AND p.aplica_web
    AND public.vulo_hotel_publico(p_hotel_id)
    AND (p.fecha_fin IS NULL OR p.fecha_fin >= CURRENT_DATE);
$pp_get$;

REVOKE ALL ON FUNCTION public.get_public_booking_policies(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_booking_policies(uuid) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

SELECT 'PAGINA PUBLICA Y POLITICAS APLICADAS' AS resultado;
