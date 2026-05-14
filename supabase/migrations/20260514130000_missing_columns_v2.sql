-- Análisis profundo: columnas faltantes detectadas en código vs schema

-- pagos: el código envía y lee `concepto`
ALTER TABLE public.pagos
  ADD COLUMN IF NOT EXISTS concepto text;

-- cargos: NuevaReservaModal y POS envían subtotal/impuesto/concepto_id/producto_id
ALTER TABLE public.cargos
  ADD COLUMN IF NOT EXISTS subtotal numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS impuesto numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS concepto_id uuid,
  ADD COLUMN IF NOT EXISTS producto_id uuid;
