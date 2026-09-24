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

SELECT 'AJUSTES DE PAGINA PUBLICA APLICADOS' AS resultado;
