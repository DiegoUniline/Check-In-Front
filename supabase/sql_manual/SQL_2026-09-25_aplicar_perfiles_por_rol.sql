-- Aplica los perfiles recomendados por rol a todos los hoteles:
-- se quitan los permisos personalizados y rige permisos_default.
DELETE FROM public.permisos_hotel;

NOTIFY pgrst, 'reload schema';

SELECT 'PERFILES POR ROL APLICADOS' AS resultado;
