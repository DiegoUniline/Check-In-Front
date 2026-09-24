-- Correr completo en Supabase > SQL Editor (descargar el archivo, no copiar de la vista previa).

-- ===== 20260924150000_fix_turno_hotel_activo =====
-- Corrige: el dueño de la plataforma (reconocido por su correo, igual que la
-- aplicación) puede trabajar en el hotel que eligió en el selector. Sin esto,
-- el turno abierto se buscaba en otro hotel y pedía abrir turno otra vez.

CREATE OR REPLACE FUNCTION public.vulo_platform_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn_owner$
  SELECT EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text = 'SuperAdmin'
    )
    OR lower(COALESCE(auth.jwt()->>'email', '')) = 'diego.leon@uniline.mx'
$fn_owner$;

REVOKE ALL ON FUNCTION public.vulo_platform_owner() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vulo_platform_owner() TO authenticated;

CREATE OR REPLACE FUNCTION public.vulo_current_hotel_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn_hotel$
  SELECT CASE
    WHEN public.vulo_platform_owner() THEN COALESCE(p.hotel_activo_id, p.hotel_id)
    ELSE p.hotel_id
  END
  FROM public.profiles p
  WHERE p.id = auth.uid()
$fn_hotel$;

CREATE OR REPLACE FUNCTION public.vulo_guard_profile_hotel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn_guard$
BEGIN
  IF auth.uid() IS NULL OR public.vulo_platform_owner() THEN RETURN NEW; END IF;
  IF NEW.hotel_id IS DISTINCT FROM OLD.hotel_id THEN
    RAISE EXCEPTION 'No puedes cambiar el hotel de un usuario';
  END IF;
  IF NEW.hotel_activo_id IS DISTINCT FROM OLD.hotel_activo_id
     AND NEW.hotel_activo_id IS NOT NULL
     AND NEW.hotel_activo_id IS DISTINCT FROM NEW.hotel_id THEN
    RAISE EXCEPTION 'No tienes acceso a ese hotel';
  END IF;
  RETURN NEW;
END;
$fn_guard$;


-- ===== 20260924170000_facturacion_y_cancelacion =====
-- Facturación por reservación y motivo obligatorio al cancelar.
--  * "¿Requiere factura?" en la reservación. Si es sí, nace en Pendiente.
--  * Estados: Pendiente -> Realizada -> Enviada (se guarda quién y cuándo).
--  * Cancelar una reservación exige motivo (también desde fuera de la app).

ALTER TABLE public.reservas
  ADD COLUMN IF NOT EXISTS requiere_factura boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS factura_estado text,
  ADD COLUMN IF NOT EXISTS factura_folio text,
  ADD COLUMN IF NOT EXISTS factura_notas text,
  ADD COLUMN IF NOT EXISTS factura_actualizada_at timestamptz,
  ADD COLUMN IF NOT EXISTS factura_actualizada_por uuid,
  ADD COLUMN IF NOT EXISTS factura_actualizada_por_nombre text,
  ADD COLUMN IF NOT EXISTS factura_realizada_at timestamptz,
  ADD COLUMN IF NOT EXISTS factura_enviada_at timestamptz;

DO $fact_chk$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reservas_factura_estado_check') THEN
    ALTER TABLE public.reservas ADD CONSTRAINT reservas_factura_estado_check
      CHECK (factura_estado IS NULL OR factura_estado IN ('Pendiente', 'Realizada', 'Enviada'));
  END IF;
END $fact_chk$;

CREATE INDEX IF NOT EXISTS reservas_factura_idx
  ON public.reservas(hotel_id, factura_estado) WHERE requiere_factura;

CREATE OR REPLACE FUNCTION public.vulo_reservation_invoice_and_cancel_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fact_fn$
DECLARE
  v_old_estado text := CASE WHEN TG_OP = 'UPDATE' THEN OLD.factura_estado ELSE NULL END;
  v_old_reserva text := CASE WHEN TG_OP = 'UPDATE' THEN OLD.estado ELSE NULL END;
BEGIN
  -- Facturación
  IF COALESCE(NEW.requiere_factura, false) THEN
    NEW.factura_estado := COALESCE(NEW.factura_estado, 'Pendiente');
  ELSE
    NEW.factura_estado := NULL;
  END IF;

  IF NEW.factura_estado IS DISTINCT FROM v_old_estado THEN
    NEW.factura_actualizada_at := now();
    NEW.factura_actualizada_por := auth.uid();
    NEW.factura_actualizada_por_nombre := COALESCE(public.vulo_actor_name(), 'Sistema');
    IF NEW.factura_estado = 'Realizada' THEN NEW.factura_realizada_at := COALESCE(NEW.factura_realizada_at, now()); END IF;
    IF NEW.factura_estado = 'Enviada' THEN
      NEW.factura_realizada_at := COALESCE(NEW.factura_realizada_at, now());
      NEW.factura_enviada_at := now();
    END IF;
    IF NEW.factura_estado = 'Pendiente' THEN
      NEW.factura_realizada_at := NULL;
      NEW.factura_enviada_at := NULL;
    END IF;
  END IF;

  -- Cancelación con motivo obligatorio (usuarios de la app).
  IF auth.uid() IS NOT NULL
     AND NEW.estado = 'Cancelada'
     AND v_old_reserva IS DISTINCT FROM 'Cancelada'
     AND length(trim(COALESCE(NEW.motivo_cancelacion, ''))) < 3 THEN
    RAISE EXCEPTION 'Escribe el motivo de la cancelación';
  END IF;

  RETURN NEW;
END;
$fact_fn$;

REVOKE ALL ON FUNCTION public.vulo_reservation_invoice_and_cancel_rules() FROM PUBLIC, anon, authenticated;

-- Corre después del sellado de autor (trg_zz_...), que es quien toma el motivo
-- de las operaciones de estancia.
DROP TRIGGER IF EXISTS trg_zzz_vulo_invoice_cancel_rules ON public.reservas;
CREATE TRIGGER trg_zzz_vulo_invoice_cancel_rules
BEFORE INSERT OR UPDATE ON public.reservas
FOR EACH ROW EXECUTE FUNCTION public.vulo_reservation_invoice_and_cancel_rules();

NOTIFY pgrst, 'reload schema';


-- ===== 20260924190000_descuentos_datos_fiscales =====
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


SELECT 'SQL FACTURACION DESCUENTOS Y DATOS FISCALES APLICADO' AS resultado;
