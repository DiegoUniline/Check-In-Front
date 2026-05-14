-- WhatsApp integration: token por hotel, plantillas editables y registro de envíos.

ALTER TABLE public.hotels
  ADD COLUMN IF NOT EXISTS whatsapp_token text,
  ADD COLUMN IF NOT EXISTS whatsapp_enabled boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL,
  template_key text NOT NULL,
  nombre text NOT NULL,
  mensaje text NOT NULL,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hotel_id, template_key)
);

ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Auth all whatsapp_templates" ON public.whatsapp_templates;
CREATE POLICY "Auth all whatsapp_templates" ON public.whatsapp_templates
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.whatsapp_envios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL,
  reserva_id uuid,
  template_key text NOT NULL,
  phone text NOT NULL,
  mensaje text,
  status text NOT NULL DEFAULT 'sent',
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (reserva_id, template_key)
);

ALTER TABLE public.whatsapp_envios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Auth select whatsapp_envios" ON public.whatsapp_envios;
CREATE POLICY "Auth select whatsapp_envios" ON public.whatsapp_envios
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Auth insert whatsapp_envios" ON public.whatsapp_envios;
CREATE POLICY "Auth insert whatsapp_envios" ON public.whatsapp_envios
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_whatsapp_envios_reserva ON public.whatsapp_envios(reserva_id, template_key);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_hotel ON public.whatsapp_templates(hotel_id);
