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

SELECT 'CORRECCION DE TURNO APLICADA' AS resultado;
