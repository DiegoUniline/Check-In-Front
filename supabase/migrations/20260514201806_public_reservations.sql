ALTER TABLE public.hotels
  ADD COLUMN IF NOT EXISTS slug text UNIQUE,
  ADD COLUMN IF NOT EXISTS descripcion_publica text,
  ADD COLUMN IF NOT EXISTS permite_reservas_online boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS requiere_anticipo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS porcentaje_anticipo numeric NOT NULL DEFAULT 0;

ALTER TABLE public.tipos_habitacion
  ADD COLUMN IF NOT EXISTS publico boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fotos text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.habitaciones
  ADD COLUMN IF NOT EXISTS excluida_publica boolean NOT NULL DEFAULT false;

UPDATE public.hotels
SET slug = trim(both '-' from regexp_replace(lower(coalesce(nombre, 'hotel')), '[^a-z0-9]+', '-', 'g')) || '-' || substr(id::text, 1, 6)
WHERE slug IS NULL OR slug = '';

DROP POLICY IF EXISTS "Public can view bookable hotels" ON public.hotels;
CREATE POLICY "Public can view bookable hotels"
  ON public.hotels FOR SELECT TO anon
  USING (permite_reservas_online = true);

DROP POLICY IF EXISTS "Public can view public room types" ON public.tipos_habitacion;
CREATE POLICY "Public can view public room types"
  ON public.tipos_habitacion FOR SELECT TO anon
  USING (
    publico = true
    AND EXISTS (SELECT 1 FROM public.hotels h WHERE h.id = tipos_habitacion.hotel_id AND h.permite_reservas_online = true)
  );

DROP POLICY IF EXISTS "Public can view bookable rooms" ON public.habitaciones;
CREATE POLICY "Public can view bookable rooms"
  ON public.habitaciones FOR SELECT TO anon
  USING (
    excluida_publica = false
    AND EXISTS (SELECT 1 FROM public.hotels h WHERE h.id = habitaciones.hotel_id AND h.permite_reservas_online = true)
  );

DROP POLICY IF EXISTS "Public can view reservas for availability" ON public.reservas;
CREATE POLICY "Public can view reservas for availability"
  ON public.reservas FOR SELECT TO anon
  USING (
    EXISTS (SELECT 1 FROM public.hotels h WHERE h.id = reservas.hotel_id AND h.permite_reservas_online = true)
    AND estado IN ('Pendiente', 'Confirmada', 'CheckIn')
  );

DROP POLICY IF EXISTS "Public can insert clientes" ON public.clientes;
CREATE POLICY "Public can insert clientes"
  ON public.clientes FOR INSERT TO anon
  WITH CHECK (
    nombre IS NOT NULL AND length(nombre) BETWEEN 1 AND 200
    AND EXISTS (SELECT 1 FROM public.hotels h WHERE h.id = clientes.hotel_id AND h.permite_reservas_online = true)
  );

DROP POLICY IF EXISTS "Public can insert reservas" ON public.reservas;
CREATE POLICY "Public can insert reservas"
  ON public.reservas FOR INSERT TO anon
  WITH CHECK (
    fecha_checkin >= CURRENT_DATE
    AND fecha_checkout > fecha_checkin
    AND estado = 'Pendiente'
    AND EXISTS (SELECT 1 FROM public.hotels h WHERE h.id = reservas.hotel_id AND h.permite_reservas_online = true)
  );

ALTER TABLE public.reservas REPLICA IDENTITY FULL;
ALTER TABLE public.habitaciones REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.reservas'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.habitaciones'; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
