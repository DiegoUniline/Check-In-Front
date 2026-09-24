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

SELECT 'FACTURACION Y CANCELACION APLICADAS' AS resultado;
