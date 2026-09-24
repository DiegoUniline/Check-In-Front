-- Catálogo de descuentos, descuento por cliente y datos fiscales (CSF).

-- 1. Catálogo de descuentos por hotel
CREATE TABLE IF NOT EXISTS public.descuentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  tipo text NOT NULL DEFAULT 'Porcentaje',
  valor numeric(12,2) NOT NULL DEFAULT 0,
  descripcion text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT descuentos_tipo_check CHECK (tipo IN ('Porcentaje', 'Monto')),
  CONSTRAINT descuentos_valor_check CHECK (valor >= 0 AND (tipo <> 'Porcentaje' OR valor <= 100)),
  CONSTRAINT descuentos_nombre_check CHECK (length(trim(nombre)) > 0)
);

CREATE INDEX IF NOT EXISTS descuentos_hotel_idx ON public.descuentos(hotel_id, activo);
CREATE UNIQUE INDEX IF NOT EXISTS descuentos_hotel_nombre_uq ON public.descuentos(hotel_id, lower(nombre));

ALTER TABLE public.descuentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant select descuentos" ON public.descuentos;
DROP POLICY IF EXISTS "tenant insert descuentos" ON public.descuentos;
DROP POLICY IF EXISTS "tenant update descuentos" ON public.descuentos;
DROP POLICY IF EXISTS "tenant delete descuentos" ON public.descuentos;

CREATE POLICY "tenant select descuentos" ON public.descuentos FOR SELECT TO authenticated
  USING (hotel_id = public.vulo_current_hotel_id() OR public.vulo_is_superadmin());
CREATE POLICY "tenant insert descuentos" ON public.descuentos FOR INSERT TO authenticated
  WITH CHECK (hotel_id = public.vulo_current_hotel_id() OR public.vulo_is_superadmin());
CREATE POLICY "tenant update descuentos" ON public.descuentos FOR UPDATE TO authenticated
  USING (hotel_id = public.vulo_current_hotel_id() OR public.vulo_is_superadmin())
  WITH CHECK (hotel_id = public.vulo_current_hotel_id() OR public.vulo_is_superadmin());
CREATE POLICY "tenant delete descuentos" ON public.descuentos FOR DELETE TO authenticated
  USING (hotel_id = public.vulo_current_hotel_id() OR public.vulo_is_superadmin());

REVOKE ALL ON public.descuentos FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.descuentos TO authenticated;

CREATE OR REPLACE FUNCTION public.vulo_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $dsc_touch$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$dsc_touch$;

DROP TRIGGER IF EXISTS trg_descuentos_updated_at ON public.descuentos;
CREATE TRIGGER trg_descuentos_updated_at
BEFORE UPDATE ON public.descuentos
FOR EACH ROW EXECUTE FUNCTION public.vulo_touch_updated_at();

-- 2. Cliente: descuento asignado + datos fiscales
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS descuento_id uuid REFERENCES public.descuentos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rfc text,
  ADD COLUMN IF NOT EXISTS razon_social text,
  ADD COLUMN IF NOT EXISTS regimen_fiscal text,
  ADD COLUMN IF NOT EXISTS codigo_postal_fiscal text,
  ADD COLUMN IF NOT EXISTS uso_cfdi text,
  ADD COLUMN IF NOT EXISTS email_facturacion text,
  ADD COLUMN IF NOT EXISTS domicilio_fiscal text,
  ADD COLUMN IF NOT EXISTS csf_path text,
  ADD COLUMN IF NOT EXISTS datos_fiscales_at timestamptz;

CREATE INDEX IF NOT EXISTS clientes_descuento_idx ON public.clientes(descuento_id) WHERE descuento_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS clientes_rfc_idx ON public.clientes(hotel_id, rfc) WHERE rfc IS NOT NULL;

CREATE OR REPLACE FUNCTION public.vulo_guard_cliente_fiscal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $dsc_cli$
BEGIN
  IF NEW.descuento_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.descuentos d WHERE d.id = NEW.descuento_id AND d.hotel_id = NEW.hotel_id
  ) THEN
    RAISE EXCEPTION 'El descuento no pertenece a este hotel';
  END IF;

  NEW.rfc := NULLIF(upper(regexp_replace(COALESCE(NEW.rfc, ''), '\s', '', 'g')), '');
  NEW.codigo_postal_fiscal := NULLIF(trim(COALESCE(NEW.codigo_postal_fiscal, '')), '');
  NEW.razon_social := NULLIF(trim(COALESCE(NEW.razon_social, '')), '');

  IF NEW.rfc IS NOT NULL AND NEW.rfc !~ '^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$' THEN
    RAISE EXCEPTION 'RFC no válido: %', NEW.rfc;
  END IF;
  IF NEW.codigo_postal_fiscal IS NOT NULL AND NEW.codigo_postal_fiscal !~ '^[0-9]{5}$' THEN
    RAISE EXCEPTION 'El código postal fiscal debe tener 5 dígitos';
  END IF;

  IF TG_OP = 'INSERT'
     OR (NEW.rfc, NEW.razon_social, NEW.regimen_fiscal, NEW.codigo_postal_fiscal, NEW.uso_cfdi,
         NEW.email_facturacion, NEW.domicilio_fiscal, NEW.csf_path)
        IS DISTINCT FROM
        (OLD.rfc, OLD.razon_social, OLD.regimen_fiscal, OLD.codigo_postal_fiscal, OLD.uso_cfdi,
         OLD.email_facturacion, OLD.domicilio_fiscal, OLD.csf_path) THEN
    IF NEW.rfc IS NOT NULL OR NEW.razon_social IS NOT NULL THEN
      NEW.datos_fiscales_at := now();
    END IF;
  END IF;

  RETURN NEW;
END;
$dsc_cli$;

REVOKE ALL ON FUNCTION public.vulo_guard_cliente_fiscal() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_vulo_guard_cliente_fiscal ON public.clientes;
CREATE TRIGGER trg_vulo_guard_cliente_fiscal
BEFORE INSERT OR UPDATE ON public.clientes
FOR EACH ROW EXECUTE FUNCTION public.vulo_guard_cliente_fiscal();

-- 3. Reservación: qué descuento del catálogo se aplicó
ALTER TABLE public.reservas
  ADD COLUMN IF NOT EXISTS descuento_id uuid REFERENCES public.descuentos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS descuento_nombre text;

-- 4. Archivo de la CSF (bucket privado, carpeta por hotel)
INSERT INTO storage.buckets (id, name, public)
VALUES ('clientes-csf', 'clientes-csf', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "csf select hotel" ON storage.objects;
DROP POLICY IF EXISTS "csf insert hotel" ON storage.objects;
DROP POLICY IF EXISTS "csf update hotel" ON storage.objects;
DROP POLICY IF EXISTS "csf delete hotel" ON storage.objects;

CREATE POLICY "csf select hotel" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'clientes-csf'
    AND ((storage.foldername(name))[1] = public.vulo_current_hotel_id()::text OR public.vulo_is_superadmin()));
CREATE POLICY "csf insert hotel" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'clientes-csf'
    AND ((storage.foldername(name))[1] = public.vulo_current_hotel_id()::text OR public.vulo_is_superadmin()));
CREATE POLICY "csf update hotel" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'clientes-csf'
    AND ((storage.foldername(name))[1] = public.vulo_current_hotel_id()::text OR public.vulo_is_superadmin()));
CREATE POLICY "csf delete hotel" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'clientes-csf'
    AND ((storage.foldername(name))[1] = public.vulo_current_hotel_id()::text OR public.vulo_is_superadmin()));

NOTIFY pgrst, 'reload schema';

SELECT 'DESCUENTOS Y DATOS FISCALES APLICADOS' AS resultado;
