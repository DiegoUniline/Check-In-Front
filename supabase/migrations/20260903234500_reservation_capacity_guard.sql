-- Impide crear una reserva con una ocupación superior a la capacidad
-- configurada para su tipo de habitación. La validación visual puede cambiar
-- mientras dos recepcionistas trabajan; este trigger es el candado definitivo.

CREATE OR REPLACE FUNCTION public.prevent_new_reservation_capacity_overflow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_type_id uuid;
  v_maximum integer;
  v_adult_limit integer;
  v_child_limit integer;
  v_adults integer := GREATEST(0, COALESCE(NEW.adultos, 0));
  v_children integer := GREATEST(0, COALESCE(NEW.ninos, 0));
  v_extras integer := GREATEST(0, COALESCE(NEW.personas_extra, 0));
BEGIN
  v_type_id := NEW.tipo_habitacion_id;
  IF v_type_id IS NULL AND NEW.habitacion_id IS NOT NULL THEN
    SELECT h.tipo_habitacion_id INTO v_type_id
    FROM public.habitaciones h
    WHERE h.id = NEW.habitacion_id AND h.hotel_id = NEW.hotel_id;
  END IF;

  IF v_type_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT
    COALESCE(t.capacidad_maxima, t.capacidad_adultos + t.capacidad_ninos),
    t.capacidad_adultos,
    t.capacidad_ninos
  INTO v_maximum, v_adult_limit, v_child_limit
  FROM public.tipos_habitacion t
  WHERE t.id = v_type_id AND t.hotel_id = NEW.hotel_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El tipo de habitación no pertenece al hotel';
  END IF;

  IF v_extras > v_adults + v_children THEN
    RAISE EXCEPTION 'Los huéspedes con recargo (%) exceden la ocupación total (%)',
      v_extras, v_adults + v_children;
  END IF;

  IF v_maximum IS NOT NULL AND v_maximum > 0
     AND v_adults + v_children > v_maximum THEN
    RAISE EXCEPTION 'La ocupación (%) excede la capacidad máxima de la habitación (%)',
      v_adults + v_children, v_maximum;
  END IF;

  IF v_adult_limit IS NOT NULL AND v_adult_limit > 0
     AND v_adults > v_adult_limit THEN
    RAISE EXCEPTION 'La cantidad de adultos (%) excede la capacidad configurada (%)',
      v_adults, v_adult_limit;
  END IF;

  IF v_child_limit IS NOT NULL AND v_child_limit > 0
     AND v_children > v_child_limit THEN
    RAISE EXCEPTION 'La cantidad de menores (%) excede la capacidad configurada (%)',
      v_children, v_child_limit;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_new_reservation_capacity_overflow() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS trg_prevent_new_reservation_capacity_overflow ON public.reservas;
CREATE TRIGGER trg_prevent_new_reservation_capacity_overflow
BEFORE INSERT ON public.reservas
FOR EACH ROW
EXECUTE FUNCTION public.prevent_new_reservation_capacity_overflow();
