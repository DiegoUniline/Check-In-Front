CREATE TABLE IF NOT EXISTS public.checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('checkin', 'checkout')),
  nombre text NOT NULL,
  orden integer NOT NULL DEFAULT 0,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_checklist_items_hotel_tipo
  ON public.checklist_items (hotel_id, tipo, orden);

ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth select checklist_items"
  ON public.checklist_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert checklist_items"
  ON public.checklist_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update checklist_items"
  ON public.checklist_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth delete checklist_items"
  ON public.checklist_items FOR DELETE TO authenticated USING (true);

INSERT INTO public.checklist_items (hotel_id, tipo, nombre, orden)
SELECT h.id, 'checkin', x.nombre, x.orden
FROM public.hotels h
CROSS JOIN (VALUES
  ('Documento de identidad verificado', 1),
  ('Garantía/tarjeta registrada', 2),
  ('Registro de huésped firmado', 3)
) AS x(nombre, orden)
WHERE NOT EXISTS (
  SELECT 1 FROM public.checklist_items c
  WHERE c.hotel_id = h.id AND c.tipo = 'checkin'
);

INSERT INTO public.checklist_items (hotel_id, tipo, nombre, orden)
SELECT h.id, 'checkout', x.nombre, x.orden
FROM public.hotels h
CROSS JOIN (VALUES
  ('Habitación inspeccionada', 1),
  ('Llaves devueltas', 2)
) AS x(nombre, orden)
WHERE NOT EXISTS (
  SELECT 1 FROM public.checklist_items c
  WHERE c.hotel_id = h.id AND c.tipo = 'checkout'
);
