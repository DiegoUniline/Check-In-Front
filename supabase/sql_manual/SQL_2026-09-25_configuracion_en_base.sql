-- Correr completo en Supabase > SQL Editor (descargar el archivo, no copiar de la vista previa).

-- Configuración que antes vivía en el navegador, ahora en la base:
--  * Impuestos por defecto (hotel, tipo y habitación).
--  * Configuración general por hotel (datos bancarios y respuestas de WhatsApp).
--  * Permisos: cambios en tiempo real para todos los usuarios.
--
-- Impuestos por defecto guardados en la base (antes sólo en el navegador).
-- NULL = hereda (habitación → tipo → hotel); [] = sin impuestos explícito.
ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS impuestos_default jsonb;
ALTER TABLE public.tipos_habitacion ADD COLUMN IF NOT EXISTS impuestos_default jsonb;
ALTER TABLE public.habitaciones ADD COLUMN IF NOT EXISTS impuestos_default jsonb;

DO $imp_chk$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hotels_impuestos_default_array') THEN
    ALTER TABLE public.hotels ADD CONSTRAINT hotels_impuestos_default_array
      CHECK (impuestos_default IS NULL OR jsonb_typeof(impuestos_default) = 'array');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tipos_impuestos_default_array') THEN
    ALTER TABLE public.tipos_habitacion ADD CONSTRAINT tipos_impuestos_default_array
      CHECK (impuestos_default IS NULL OR jsonb_typeof(impuestos_default) = 'array');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'habitaciones_impuestos_default_array') THEN
    ALTER TABLE public.habitaciones ADD CONSTRAINT habitaciones_impuestos_default_array
      CHECK (impuestos_default IS NULL OR jsonb_typeof(impuestos_default) = 'array');
  END IF;
END $imp_chk$;

-- Configuración general por hotel (clave → valor).
CREATE TABLE IF NOT EXISTS public.configuracion_hotel (
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  clave text NOT NULL,
  valor jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  PRIMARY KEY (hotel_id, clave)
);

ALTER TABLE public.configuracion_hotel ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant select configuracion_hotel" ON public.configuracion_hotel;
DROP POLICY IF EXISTS "tenant insert configuracion_hotel" ON public.configuracion_hotel;
DROP POLICY IF EXISTS "tenant update configuracion_hotel" ON public.configuracion_hotel;
DROP POLICY IF EXISTS "tenant delete configuracion_hotel" ON public.configuracion_hotel;
CREATE POLICY "tenant select configuracion_hotel" ON public.configuracion_hotel FOR SELECT TO authenticated
  USING (hotel_id = public.vulo_current_hotel_id() OR public.vulo_is_superadmin());
CREATE POLICY "tenant insert configuracion_hotel" ON public.configuracion_hotel FOR INSERT TO authenticated
  WITH CHECK (hotel_id = public.vulo_current_hotel_id() OR public.vulo_is_superadmin());
CREATE POLICY "tenant update configuracion_hotel" ON public.configuracion_hotel FOR UPDATE TO authenticated
  USING (hotel_id = public.vulo_current_hotel_id() OR public.vulo_is_superadmin())
  WITH CHECK (hotel_id = public.vulo_current_hotel_id() OR public.vulo_is_superadmin());
CREATE POLICY "tenant delete configuracion_hotel" ON public.configuracion_hotel FOR DELETE TO authenticated
  USING (hotel_id = public.vulo_current_hotel_id() OR public.vulo_is_superadmin());
REVOKE ALL ON public.configuracion_hotel FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.configuracion_hotel TO authenticated;

CREATE OR REPLACE FUNCTION public.vulo_stamp_configuracion_hotel()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $imp_cfg$
BEGIN
  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$imp_cfg$;

DROP TRIGGER IF EXISTS trg_stamp_configuracion_hotel ON public.configuracion_hotel;
CREATE TRIGGER trg_stamp_configuracion_hotel
BEFORE INSERT OR UPDATE ON public.configuracion_hotel
FOR EACH ROW EXECUTE FUNCTION public.vulo_stamp_configuracion_hotel();

-- Permisos en tiempo real (si la publicación de Supabase existe).
DO $imp_rt$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND to_regclass('public.permisos_hotel') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'permisos_hotel'
     ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.permisos_hotel';
  END IF;
END $imp_rt$;

NOTIFY pgrst, 'reload schema';

SELECT 'CONFIGURACION EN BASE APLICADA' AS resultado;
