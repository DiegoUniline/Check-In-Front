ALTER TABLE public.hotels
  ADD COLUMN IF NOT EXISTS moneda_codigo text NOT NULL DEFAULT 'MXN',
  ADD COLUMN IF NOT EXISTS moneda_simbolo text NOT NULL DEFAULT '$',
  ADD COLUMN IF NOT EXISTS moneda_locale text NOT NULL DEFAULT 'es-MX';
