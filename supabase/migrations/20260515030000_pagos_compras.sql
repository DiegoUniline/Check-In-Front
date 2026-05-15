CREATE TABLE IF NOT EXISTS public.pagos_compras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL,
  compra_id uuid NOT NULL REFERENCES public.compras(id) ON DELETE CASCADE,
  fecha timestamptz NOT NULL DEFAULT now(),
  monto numeric NOT NULL CHECK (monto > 0),
  metodo_pago text NOT NULL DEFAULT 'Efectivo',
  referencia text,
  notas text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pagos_compras_compra ON public.pagos_compras (compra_id);
CREATE INDEX IF NOT EXISTS idx_pagos_compras_hotel ON public.pagos_compras (hotel_id, fecha DESC);
ALTER TABLE public.pagos_compras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant select pagos_compras" ON public.pagos_compras FOR SELECT TO authenticated USING ((hotel_id = current_hotel_id()) OR is_superadmin());
CREATE POLICY "tenant insert pagos_compras" ON public.pagos_compras FOR INSERT TO authenticated WITH CHECK ((hotel_id = current_hotel_id()) OR is_superadmin());
CREATE POLICY "tenant update pagos_compras" ON public.pagos_compras FOR UPDATE TO authenticated USING ((hotel_id = current_hotel_id()) OR is_superadmin()) WITH CHECK ((hotel_id = current_hotel_id()) OR is_superadmin());
CREATE POLICY "tenant delete pagos_compras" ON public.pagos_compras FOR DELETE TO authenticated USING ((hotel_id = current_hotel_id()) OR is_superadmin());
