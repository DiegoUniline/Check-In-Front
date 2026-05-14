-- Auto-create hotel + profile + admin role when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_hotel_id uuid;
  v_hotel_nombre text;
  v_nombre text;
  v_apellido text;
BEGIN
  v_hotel_nombre := COALESCE(NEW.raw_user_meta_data->>'hotel_nombre', 'Mi Hotel');
  v_nombre := COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email, '@', 1));
  v_apellido := COALESCE(NEW.raw_user_meta_data->>'apellido_paterno', '');

  -- Crear hotel
  INSERT INTO public.hotels (nombre, email)
  VALUES (v_hotel_nombre, NEW.email)
  RETURNING id INTO new_hotel_id;

  -- Crear profile
  INSERT INTO public.profiles (id, nombre, apellido_paterno, email, hotel_id)
  VALUES (NEW.id, v_nombre, v_apellido, NEW.email, new_hotel_id);

  -- Asignar rol Admin
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'Admin')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
