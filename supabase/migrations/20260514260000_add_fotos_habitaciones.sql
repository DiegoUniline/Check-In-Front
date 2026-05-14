ALTER TABLE public.habitaciones ADD COLUMN IF NOT EXISTS fotos text[] NOT NULL DEFAULT '{}';
