-- Trigger: al crear un usuario en auth.users, crea hotel + profile + rol Admin
-- Lee metadatos de raw_user_meta_data (nombre, apellido_paterno, hotel_nombre)

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_hotel_id uuid;
  v_nombre text;
  v_apellido text;
  v_hotel_nombre text;
BEGIN
  -- Demo user no debe disparar creación de hotel propio
  IF NEW.email = 'admin@hotel.com' THEN
    RETURN NEW;
  END IF;

  v_nombre := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'nombre'), ''), split_part(NEW.email, '@', 1));
  v_apellido := COALESCE(NEW.raw_user_meta_data->>'apellido_paterno', '');
  v_hotel_nombre := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'hotel_nombre'), ''), 'Mi Hotel');

  -- 1. Crear hotel
  INSERT INTO public.hotels (nombre, email, pais)
  VALUES (v_hotel_nombre, NEW.email, 'México')
  RETURNING id INTO new_hotel_id;

  -- 2. Crear profile vinculado al hotel
  INSERT INTO public.profiles (id, email, nombre, apellido_paterno, hotel_id, activo)
  VALUES (NEW.id, NEW.email, v_nombre, v_apellido, new_hotel_id, true);

  -- 3. Asignar rol Admin
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'Admin');

  RETURN NEW;
END;
$$;

-- Crear trigger en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Política para permitir que un Admin actualice/borre su propio hotel
DROP POLICY IF EXISTS "Owners can update their hotel" ON public.hotels;
CREATE POLICY "Owners can update their hotel"
  ON public.hotels FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.hotel_id = hotels.id
    )
  );
