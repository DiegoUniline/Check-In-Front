ALTER TABLE public.tipos_habitacion
  ADD COLUMN IF NOT EXISTS fotos text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS publicar_web boolean NOT NULL DEFAULT true;

ALTER TABLE public.habitaciones
  ADD COLUMN IF NOT EXISTS excluida_publica boolean NOT NULL DEFAULT false;

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('hotel-logos',        'hotel-logos',        true),
  ('habitacion-fotos',   'habitacion-fotos',   true),
  ('producto-fotos',     'producto-fotos',     true),
  ('gasto-comprobantes', 'gasto-comprobantes', true)
ON CONFLICT (id) DO NOTHING;

DO $mig$
DECLARE b text;
BEGIN
  FOREACH b IN ARRAY ARRAY['hotel-logos','habitacion-fotos','producto-fotos','gasto-comprobantes'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Public read %s" ON storage.objects', b);
    EXECUTE format('DROP POLICY IF EXISTS "Auth write %s"  ON storage.objects', b);
    EXECUTE format('DROP POLICY IF EXISTS "Auth update %s" ON storage.objects', b);
    EXECUTE format('DROP POLICY IF EXISTS "Auth delete %s" ON storage.objects', b);

    EXECUTE format($p$CREATE POLICY "Public read %s" ON storage.objects FOR SELECT USING (bucket_id = %L)$p$, b, b);
    EXECUTE format($p$CREATE POLICY "Auth write %s"  ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = %L)$p$, b, b);
    EXECUTE format($p$CREATE POLICY "Auth update %s" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = %L)$p$, b, b);
    EXECUTE format($p$CREATE POLICY "Auth delete %s" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = %L)$p$, b, b);
  END LOOP;
END $mig$;
