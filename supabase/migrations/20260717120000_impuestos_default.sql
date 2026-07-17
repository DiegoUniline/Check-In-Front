ALTER TABLE public.tipos_habitacion ADD COLUMN IF NOT EXISTS impuestos_default jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.habitaciones ADD COLUMN IF NOT EXISTS impuestos_default jsonb;
