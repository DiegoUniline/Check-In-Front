-- ============================================================================
-- LIMPIEZA RÁPIDA (UN CLIC) CONFIGURABLE POR HOTEL
-- hotels.modo_limpieza: 'completo' (iniciar, marcar lista, verificar)
--                       'rapido'   (un clic: limpia y disponible)
-- Fecha: 06/10/2026
-- ============================================================================

ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS modo_limpieza text NOT NULL DEFAULT 'completo';
ALTER TABLE public.hotels DROP CONSTRAINT IF EXISTS hotels_modo_limpieza_check;
ALTER TABLE public.hotels ADD CONSTRAINT hotels_modo_limpieza_check CHECK (modo_limpieza IN ('completo', 'rapido'));

NOTIFY pgrst, 'reload schema';

SELECT 'LIMPIEZA RAPIDA APLICADA' AS resultado;
