-- Un usuario con rol operativo debe abrir turno incluso si su correo también
-- está reconocido como propietario de plataforma. Sólo el rol SuperAdmin
-- explícito queda exento al operar la administración global.
CREATE OR REPLACE FUNCTION public.vulo_user_requires_shift()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role::text = 'SuperAdmin'
    )
    AND (
      EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role::text IN ('Admin','Gerente','Recepcion')
      )
      OR (
        NOT public.vulo_is_superadmin()
        AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid())
      )
    )
$$;

REVOKE ALL ON FUNCTION public.vulo_user_requires_shift() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vulo_user_requires_shift() TO authenticated;

