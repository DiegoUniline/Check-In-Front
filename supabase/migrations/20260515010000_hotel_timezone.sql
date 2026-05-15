-- Zona horaria por hotel (para que "hoy" se calcule en la zona local del hotel)
ALTER TABLE public.hotels
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'America/Mexico_City';
