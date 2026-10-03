-- Día operativo del hotel: antes de la hora de inicio sigue contando el día anterior.
-- Ejemplo Camino Real: el día empieza a las 7:00; a las 2:00 del 03/10 sigue siendo 02/10.

ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS hora_inicio_dia smallint NOT NULL DEFAULT 0;
ALTER TABLE public.hotels DROP CONSTRAINT IF EXISTS hotels_hora_inicio_dia_rango;
ALTER TABLE public.hotels ADD CONSTRAINT hotels_hora_inicio_dia_rango CHECK (hora_inicio_dia BETWEEN 0 AND 12);

CREATE OR REPLACE FUNCTION public.vulo_hotel_today(p_hotel_id uuid)
RETURNS date
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $f$
  SELECT ((now() AT TIME ZONE COALESCE(h.timezone, 'America/Mexico_City'))
          - make_interval(hours => COALESCE(h.hora_inicio_dia, 0)::int))::date
  FROM (SELECT 1) x
  LEFT JOIN public.hotels h ON h.id = p_hotel_id
$f$;

UPDATE public.hotels SET hora_inicio_dia = 7 WHERE id = '8740e7ae-e5dc-4b16-a58e-32fccae476af';

NOTIFY pgrst, 'reload schema';
SELECT 'DIA OPERATIVO APLICADO' AS resultado;
