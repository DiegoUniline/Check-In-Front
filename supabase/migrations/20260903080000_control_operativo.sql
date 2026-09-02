-- Control operativo VULO: turnos reales, bitácora compartida y cierre diario.

CREATE TABLE IF NOT EXISTS public.turnos_operativos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  usuario_id text NOT NULL,
  usuario_nombre text NOT NULL,
  estado text NOT NULL DEFAULT 'Abierto' CHECK (estado IN ('Abierto', 'Cerrado')),
  abierto_at timestamptz NOT NULL DEFAULT now(),
  cerrado_at timestamptz,
  fondo_inicial numeric(14,2) NOT NULL DEFAULT 0 CHECK (fondo_inicial >= 0),
  efectivo_esperado numeric(14,2),
  efectivo_contado numeric(14,2),
  diferencia numeric(14,2),
  ingresos_efectivo numeric(14,2) NOT NULL DEFAULT 0,
  ingresos_tarjeta numeric(14,2) NOT NULL DEFAULT 0,
  ingresos_transferencia numeric(14,2) NOT NULL DEFAULT 0,
  otros_ingresos numeric(14,2) NOT NULL DEFAULT 0,
  egresos_efectivo numeric(14,2) NOT NULL DEFAULT 0,
  entrega_a text,
  resumen_entrega text,
  pendientes_entrega text,
  motivo_diferencia text,
  checklist_cierre jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS turnos_operativos_usuario_abierto_idx
  ON public.turnos_operativos(hotel_id, usuario_id)
  WHERE estado = 'Abierto';
CREATE INDEX IF NOT EXISTS turnos_operativos_hotel_fecha_idx
  ON public.turnos_operativos(hotel_id, abierto_at DESC);

CREATE TABLE IF NOT EXISTS public.bitacora_operativa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  turno_id uuid REFERENCES public.turnos_operativos(id) ON DELETE SET NULL,
  categoria text NOT NULL DEFAULT 'General',
  prioridad text NOT NULL DEFAULT 'Normal' CHECK (prioridad IN ('Baja', 'Normal', 'Alta', 'Crítica')),
  titulo text NOT NULL,
  detalle text,
  estado text NOT NULL DEFAULT 'Abierto' CHECK (estado IN ('Abierto', 'Resuelto')),
  responsable text,
  fecha_limite timestamptz,
  autor_id text,
  autor_nombre text NOT NULL DEFAULT 'Usuario',
  resuelto_at timestamptz,
  resuelto_por text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bitacora_operativa_hotel_estado_idx
  ON public.bitacora_operativa(hotel_id, estado, prioridad, created_at DESC);
CREATE INDEX IF NOT EXISTS bitacora_operativa_turno_idx
  ON public.bitacora_operativa(turno_id);

CREATE TABLE IF NOT EXISTS public.cierres_diarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  fecha_operativa date NOT NULL,
  estado text NOT NULL DEFAULT 'Cerrado' CHECK (estado IN ('Cerrado', 'Reabierto')),
  checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  resumen jsonb NOT NULL DEFAULT '{}'::jsonb,
  observaciones text,
  cerrado_at timestamptz NOT NULL DEFAULT now(),
  cerrado_por text,
  cerrado_por_nombre text,
  reabierto_at timestamptz,
  reabierto_por text,
  motivo_reapertura text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hotel_id, fecha_operativa)
);

CREATE INDEX IF NOT EXISTS cierres_diarios_hotel_fecha_idx
  ON public.cierres_diarios(hotel_id, fecha_operativa DESC);

ALTER TABLE public.turnos_operativos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bitacora_operativa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cierres_diarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hotel_turnos_select" ON public.turnos_operativos;
DROP POLICY IF EXISTS "hotel_turnos_insert" ON public.turnos_operativos;
DROP POLICY IF EXISTS "hotel_turnos_update" ON public.turnos_operativos;
DROP POLICY IF EXISTS "hotel_turnos_delete" ON public.turnos_operativos;
CREATE POLICY "hotel_turnos_select" ON public.turnos_operativos FOR SELECT TO authenticated
  USING (hotel_id = public.current_user_hotel_id() OR public.is_superadmin());
CREATE POLICY "hotel_turnos_insert" ON public.turnos_operativos FOR INSERT TO authenticated
  WITH CHECK (hotel_id = public.current_user_hotel_id() OR public.is_superadmin());
CREATE POLICY "hotel_turnos_update" ON public.turnos_operativos FOR UPDATE TO authenticated
  USING (hotel_id = public.current_user_hotel_id() OR public.is_superadmin())
  WITH CHECK (hotel_id = public.current_user_hotel_id() OR public.is_superadmin());
CREATE POLICY "hotel_turnos_delete" ON public.turnos_operativos FOR DELETE TO authenticated
  USING (hotel_id = public.current_user_hotel_id() OR public.is_superadmin());

DROP POLICY IF EXISTS "hotel_bitacora_select" ON public.bitacora_operativa;
DROP POLICY IF EXISTS "hotel_bitacora_insert" ON public.bitacora_operativa;
DROP POLICY IF EXISTS "hotel_bitacora_update" ON public.bitacora_operativa;
DROP POLICY IF EXISTS "hotel_bitacora_delete" ON public.bitacora_operativa;
CREATE POLICY "hotel_bitacora_select" ON public.bitacora_operativa FOR SELECT TO authenticated
  USING (hotel_id = public.current_user_hotel_id() OR public.is_superadmin());
CREATE POLICY "hotel_bitacora_insert" ON public.bitacora_operativa FOR INSERT TO authenticated
  WITH CHECK (hotel_id = public.current_user_hotel_id() OR public.is_superadmin());
CREATE POLICY "hotel_bitacora_update" ON public.bitacora_operativa FOR UPDATE TO authenticated
  USING (hotel_id = public.current_user_hotel_id() OR public.is_superadmin())
  WITH CHECK (hotel_id = public.current_user_hotel_id() OR public.is_superadmin());
CREATE POLICY "hotel_bitacora_delete" ON public.bitacora_operativa FOR DELETE TO authenticated
  USING (hotel_id = public.current_user_hotel_id() OR public.is_superadmin());

DROP POLICY IF EXISTS "hotel_cierres_select" ON public.cierres_diarios;
DROP POLICY IF EXISTS "hotel_cierres_insert" ON public.cierres_diarios;
DROP POLICY IF EXISTS "hotel_cierres_update" ON public.cierres_diarios;
DROP POLICY IF EXISTS "hotel_cierres_delete" ON public.cierres_diarios;
CREATE POLICY "hotel_cierres_select" ON public.cierres_diarios FOR SELECT TO authenticated
  USING (hotel_id = public.current_user_hotel_id() OR public.is_superadmin());
CREATE POLICY "hotel_cierres_insert" ON public.cierres_diarios FOR INSERT TO authenticated
  WITH CHECK (
    (hotel_id = public.current_user_hotel_id() OR public.is_superadmin())
    AND (public.has_role(auth.uid(), 'Admin'::app_role) OR public.has_role(auth.uid(), 'Gerente'::app_role) OR public.is_superadmin())
  );
CREATE POLICY "hotel_cierres_update" ON public.cierres_diarios FOR UPDATE TO authenticated
  USING (
    (hotel_id = public.current_user_hotel_id() OR public.is_superadmin())
    AND (public.has_role(auth.uid(), 'Admin'::app_role) OR public.has_role(auth.uid(), 'Gerente'::app_role) OR public.is_superadmin())
  ) WITH CHECK (
    (hotel_id = public.current_user_hotel_id() OR public.is_superadmin())
    AND (public.has_role(auth.uid(), 'Admin'::app_role) OR public.has_role(auth.uid(), 'Gerente'::app_role) OR public.is_superadmin())
  );
CREATE POLICY "hotel_cierres_delete" ON public.cierres_diarios FOR DELETE TO authenticated
  USING (hotel_id = public.current_user_hotel_id() OR public.is_superadmin());

CREATE OR REPLACE FUNCTION public.vulo_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS touch_turnos_operativos ON public.turnos_operativos;
CREATE TRIGGER touch_turnos_operativos BEFORE UPDATE ON public.turnos_operativos
FOR EACH ROW EXECUTE FUNCTION public.vulo_touch_updated_at();
DROP TRIGGER IF EXISTS touch_bitacora_operativa ON public.bitacora_operativa;
CREATE TRIGGER touch_bitacora_operativa BEFORE UPDATE ON public.bitacora_operativa
FOR EACH ROW EXECUTE FUNCTION public.vulo_touch_updated_at();
DROP TRIGGER IF EXISTS touch_cierres_diarios ON public.cierres_diarios;
CREATE TRIGGER touch_cierres_diarios BEFORE UPDATE ON public.cierres_diarios
FOR EACH ROW EXECUTE FUNCTION public.vulo_touch_updated_at();

-- Una vez cerrado el día, no se pueden alterar movimientos financieros de esa
-- fecha hasta que un responsable reabra explícitamente el cierre.
CREATE OR REPLACE FUNCTION public.vulo_prevent_closed_day_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hotel_id uuid;
  v_fecha date;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_hotel_id := OLD.hotel_id;
    v_fecha := COALESCE(OLD.fecha::date, OLD.created_at::date, CURRENT_DATE);
  ELSE
    v_hotel_id := NEW.hotel_id;
    v_fecha := COALESCE(NEW.fecha::date, NEW.created_at::date, CURRENT_DATE);
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.cierres_diarios c
    WHERE c.hotel_id = v_hotel_id
      AND c.fecha_operativa = v_fecha
      AND c.estado = 'Cerrado'
  ) THEN
    RAISE EXCEPTION 'El día operativo % está cerrado. Reábralo antes de modificar movimientos.', v_fecha
      USING ERRCODE = 'P0001';
  END IF;

  IF TG_OP = 'UPDATE' AND EXISTS (
    SELECT 1 FROM public.cierres_diarios c
    WHERE c.hotel_id = OLD.hotel_id
      AND c.fecha_operativa = COALESCE(OLD.fecha::date, OLD.created_at::date, CURRENT_DATE)
      AND c.estado = 'Cerrado'
  ) THEN
    RAISE EXCEPTION 'El día operativo % está cerrado. Reábralo antes de modificar movimientos.', COALESCE(OLD.fecha::date, OLD.created_at::date, CURRENT_DATE)
      USING ERRCODE = 'P0001';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_closed_day_pagos ON public.pagos;
CREATE TRIGGER prevent_closed_day_pagos BEFORE INSERT OR UPDATE OR DELETE ON public.pagos
FOR EACH ROW EXECUTE FUNCTION public.vulo_prevent_closed_day_change();
DROP TRIGGER IF EXISTS prevent_closed_day_gastos ON public.gastos;
CREATE TRIGGER prevent_closed_day_gastos BEFORE INSERT OR UPDATE OR DELETE ON public.gastos
FOR EACH ROW EXECUTE FUNCTION public.vulo_prevent_closed_day_change();
DROP TRIGGER IF EXISTS prevent_closed_day_ventas ON public.ventas;
CREATE TRIGGER prevent_closed_day_ventas BEFORE INSERT OR UPDATE OR DELETE ON public.ventas
FOR EACH ROW EXECUTE FUNCTION public.vulo_prevent_closed_day_change();
