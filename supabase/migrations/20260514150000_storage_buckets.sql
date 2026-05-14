-- ============================================================
-- Fase 1: Storage buckets para imágenes (WebP)
-- ============================================================

-- Buckets públicos para lectura
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('hotel-logos',        'hotel-logos',        true),
  ('habitacion-fotos',   'habitacion-fotos',   true),
  ('producto-fotos',     'producto-fotos',     true),
  ('gasto-comprobantes', 'gasto-comprobantes', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Políticas RLS sobre storage.objects
-- Lectura: pública (los buckets son public)
-- Escritura/borrado: solo usuarios autenticados
-- ============================================================

-- HOTEL LOGOS
DROP POLICY IF EXISTS "Public read hotel-logos"        ON storage.objects;
DROP POLICY IF EXISTS "Auth write hotel-logos"         ON storage.objects;
DROP POLICY IF EXISTS "Auth update hotel-logos"        ON storage.objects;
DROP POLICY IF EXISTS "Auth delete hotel-logos"        ON storage.objects;

CREATE POLICY "Public read hotel-logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'hotel-logos');
CREATE POLICY "Auth write hotel-logos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'hotel-logos');
CREATE POLICY "Auth update hotel-logos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'hotel-logos');
CREATE POLICY "Auth delete hotel-logos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'hotel-logos');

-- HABITACION FOTOS
DROP POLICY IF EXISTS "Public read habitacion-fotos"   ON storage.objects;
DROP POLICY IF EXISTS "Auth write habitacion-fotos"    ON storage.objects;
DROP POLICY IF EXISTS "Auth update habitacion-fotos"   ON storage.objects;
DROP POLICY IF EXISTS "Auth delete habitacion-fotos"   ON storage.objects;

CREATE POLICY "Public read habitacion-fotos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'habitacion-fotos');
CREATE POLICY "Auth write habitacion-fotos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'habitacion-fotos');
CREATE POLICY "Auth update habitacion-fotos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'habitacion-fotos');
CREATE POLICY "Auth delete habitacion-fotos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'habitacion-fotos');

-- PRODUCTO FOTOS
DROP POLICY IF EXISTS "Public read producto-fotos"     ON storage.objects;
DROP POLICY IF EXISTS "Auth write producto-fotos"      ON storage.objects;
DROP POLICY IF EXISTS "Auth update producto-fotos"     ON storage.objects;
DROP POLICY IF EXISTS "Auth delete producto-fotos"     ON storage.objects;

CREATE POLICY "Public read producto-fotos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'producto-fotos');
CREATE POLICY "Auth write producto-fotos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'producto-fotos');
CREATE POLICY "Auth update producto-fotos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'producto-fotos');
CREATE POLICY "Auth delete producto-fotos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'producto-fotos');

-- GASTO COMPROBANTES
DROP POLICY IF EXISTS "Public read gasto-comprobantes" ON storage.objects;
DROP POLICY IF EXISTS "Auth write gasto-comprobantes"  ON storage.objects;
DROP POLICY IF EXISTS "Auth update gasto-comprobantes" ON storage.objects;
DROP POLICY IF EXISTS "Auth delete gasto-comprobantes" ON storage.objects;

CREATE POLICY "Public read gasto-comprobantes"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'gasto-comprobantes');
CREATE POLICY "Auth write gasto-comprobantes"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'gasto-comprobantes');
CREATE POLICY "Auth update gasto-comprobantes"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'gasto-comprobantes');
CREATE POLICY "Auth delete gasto-comprobantes"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'gasto-comprobantes');
