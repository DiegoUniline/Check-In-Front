-- Tabla de planes SaaS
CREATE TABLE IF NOT EXISTS public.planes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  descripcion text,
  costo_mensual numeric NOT NULL DEFAULT 0,
  costo_anual numeric NOT NULL DEFAULT 0,
  limite_hoteles integer NOT NULL DEFAULT 1,
  limite_habitaciones_por_hotel integer NOT NULL DEFAULT 10,
  limite_usuarios integer NOT NULL DEFAULT 3,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  activo boolean NOT NULL DEFAULT true,
  orden integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.planes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view planes activos" ON public.planes
  FOR SELECT TO anon, authenticated USING (activo = true);
CREATE POLICY "Admins manage planes" ON public.planes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'Admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'Admin'::app_role));

-- Tabla de suscripciones
CREATE TABLE IF NOT EXISTS public.suscripciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL,
  plan_id uuid NOT NULL,
  fecha_inicio date NOT NULL DEFAULT CURRENT_DATE,
  fecha_fin date NOT NULL,
  estado text NOT NULL DEFAULT 'Activa',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.suscripciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth view suscripciones" ON public.suscripciones
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage suscripciones" ON public.suscripciones
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'Admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'Admin'::app_role));

-- Seed de planes México
INSERT INTO public.planes (nombre, descripcion, costo_mensual, costo_anual, limite_hoteles, limite_habitaciones_por_hotel, limite_usuarios, features, orden) VALUES
('Starter', 'Ideal para hoteles pequeños y posadas', 799, 7990, 1, 15, 3,
 '["Reservas ilimitadas","Check-in/Check-out","Calendario de ocupación","Soporte por email"]'::jsonb, 1),
('Profesional', 'Para hoteles en crecimiento', 1899, 18990, 1, 40, 8,
 '["Todo de Starter","Reservas online","WhatsApp integrado","Reportes avanzados","Multi-usuario","Soporte prioritario"]'::jsonb, 2),
('Business', 'Para hoteles medianos con operación completa', 3999, 39990, 1, 100, 20,
 '["Todo de Profesional","Channel Manager","Inventario y POS","Mantenimiento y limpieza","API y exportación","Soporte 24/7"]'::jsonb, 3),
('Enterprise', 'Cadenas y grupos hoteleros', 7999, 79990, 999, 999, 999,
 '["Todo de Business","Hoteles ilimitados","Habitaciones ilimitadas","Usuarios ilimitados","Onboarding dedicado","Account manager"]'::jsonb, 4)
ON CONFLICT DO NOTHING;
