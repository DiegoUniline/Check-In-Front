-- Permite estancias de uso diurno (check-in y check-out en la misma fecha).
-- Para disponibilidad, una estancia del día ocupa [entrada, entrada + 1 día),
-- por lo que conserva el bloqueo de sobreventa y el cobro mínimo de una noche.

CREATE OR REPLACE FUNCTION public.prevent_active_reservation_overlap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_checkout_exclusive date;
BEGIN
  IF NEW.fecha_checkout < NEW.fecha_checkin THEN
    RAISE EXCEPTION 'La fecha de check-out no puede ser anterior al check-in';
  END IF;

  v_new_checkout_exclusive := CASE
    WHEN NEW.fecha_checkout = NEW.fecha_checkin THEN NEW.fecha_checkin + 1
    ELSE NEW.fecha_checkout
  END;

  IF NEW.habitacion_id IS NULL
     OR NEW.estado NOT IN ('Pendiente', 'Confirmada', 'CheckIn', 'Hospedado') THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(NEW.hotel_id::text || ':' || NEW.habitacion_id::text, 0)
  );

  IF EXISTS (
    SELECT 1
    FROM public.reservas r
    WHERE r.hotel_id = NEW.hotel_id
      AND r.habitacion_id = NEW.habitacion_id
      AND r.id IS DISTINCT FROM NEW.id
      AND r.estado IN ('Pendiente', 'Confirmada', 'CheckIn', 'Hospedado')
      AND r.fecha_checkin < v_new_checkout_exclusive
      AND (
        CASE
          WHEN r.fecha_checkout = r.fecha_checkin THEN r.fecha_checkin + 1
          ELSE r.fecha_checkout
        END
      ) > NEW.fecha_checkin
  ) THEN
    RAISE EXCEPTION 'La habitación ya tiene una reserva que se cruza con esas fechas';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_active_reservation_overlap() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_prevent_active_reservation_overlap ON public.reservas;
CREATE TRIGGER trg_prevent_active_reservation_overlap
BEFORE INSERT OR UPDATE OF hotel_id, habitacion_id, fecha_checkin, fecha_checkout, estado
ON public.reservas
FOR EACH ROW
EXECUTE FUNCTION public.prevent_active_reservation_overlap();
