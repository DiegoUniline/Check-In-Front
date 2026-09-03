-- Turno obligatorio y conciliación exacta por caja VULO.
-- Cada movimiento financiero queda ligado al turno del usuario que lo creó.

ALTER TABLE public.pagos ADD COLUMN IF NOT EXISTS turno_id uuid, ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.cargos ADD COLUMN IF NOT EXISTS turno_id uuid, ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.ventas ADD COLUMN IF NOT EXISTS turno_id uuid;
ALTER TABLE public.gastos ADD COLUMN IF NOT EXISTS turno_id uuid;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS turno_id uuid;
ALTER TABLE public.pagos_compras ADD COLUMN IF NOT EXISTS turno_id uuid;
ALTER TABLE public.estancia_movimientos ADD COLUMN IF NOT EXISTS turno_id uuid;
ALTER TABLE public.movimientos_inventario ADD COLUMN IF NOT EXISTS turno_id uuid;

DO $$
DECLARE
  v_table text;
  v_constraint text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY['pagos','cargos','ventas','gastos','compras','pagos_compras','estancia_movimientos','movimientos_inventario']
  LOOP
    v_constraint := v_table || '_turno_id_fkey';
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = v_constraint) THEN
      EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (turno_id) REFERENCES public.turnos_operativos(id) ON DELETE SET NULL', v_table, v_constraint);
    END IF;
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(turno_id)', v_table || '_turno_idx', v_table);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.vulo_user_requires_shift()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
    AND NOT public.vulo_is_superadmin()
    AND (
      EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role::text IN ('Admin','Gerente','Recepcion')
      )
      OR NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid())
    )
$$;

CREATE OR REPLACE FUNCTION public.vulo_assert_open_shift(p_hotel_id uuid DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hotel_id uuid := COALESCE(p_hotel_id, public.vulo_current_hotel_id());
  v_turno_id uuid;
BEGIN
  IF NOT public.vulo_user_requires_shift() THEN RETURN NULL; END IF;
  SELECT id INTO v_turno_id
  FROM public.turnos_operativos
  WHERE hotel_id = v_hotel_id
    AND usuario_id = auth.uid()::text
    AND estado = 'Abierto'
  ORDER BY abierto_at DESC
  LIMIT 1;
  IF v_turno_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'Debes abrir tu turno antes de realizar operaciones en VULO',
      HINT = 'Ve a Turnos, registra el fondo inicial y vuelve a intentar.';
  END IF;
  RETURN v_turno_id;
END;
$$;

REVOKE ALL ON FUNCTION public.vulo_assert_open_shift(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vulo_assert_open_shift(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.vulo_require_open_shift_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hotel_id uuid;
BEGIN
  v_hotel_id := NULLIF(CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD)->>'hotel_id' ELSE to_jsonb(NEW)->>'hotel_id' END, '')::uuid;
  PERFORM public.vulo_assert_open_shift(v_hotel_id);
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.vulo_attach_open_shift_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shift uuid;
BEGIN
  v_shift := public.vulo_assert_open_shift(NEW.hotel_id);
  IF v_shift IS NOT NULL THEN
    NEW.turno_id := v_shift;
    NEW.created_by := COALESCE(NEW.created_by, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.vulo_attach_open_shift_only_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shift uuid;
BEGIN
  v_shift := public.vulo_assert_open_shift(NEW.hotel_id);
  IF v_shift IS NOT NULL THEN NEW.turno_id := v_shift; END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.vulo_attach_inventory_shift_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hotel_id uuid;
  v_shift uuid;
BEGIN
  SELECT hotel_id INTO v_hotel_id FROM public.productos WHERE id=NEW.producto_id;
  v_shift := public.vulo_assert_open_shift(v_hotel_id);
  IF v_shift IS NOT NULL THEN
    NEW.turno_id := v_shift;
    NEW.usuario_id := COALESCE(NEW.usuario_id, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

-- Protege mutaciones operativas. Limpieza y mantenimiento siguen disponibles
-- para sus roles especializados, que no administran caja.
DO $$
DECLARE v_table text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY['reservas','pagos','cargos','ventas','gastos','compras','pagos_compras','productos','habitaciones','estancia_movimientos']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS require_open_shift ON public.%I', v_table);
    EXECUTE format('CREATE TRIGGER require_open_shift BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.vulo_require_open_shift_trigger()', v_table);
  END LOOP;
END $$;

DO $$
DECLARE v_table text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY['pagos','cargos','ventas','gastos','compras','pagos_compras']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS attach_open_shift ON public.%I', v_table);
    EXECUTE format('CREATE TRIGGER attach_open_shift BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.vulo_attach_open_shift_trigger()', v_table);
  END LOOP;
  FOREACH v_table IN ARRAY ARRAY['estancia_movimientos']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS attach_open_shift ON public.%I', v_table);
    EXECUTE format('CREATE TRIGGER attach_open_shift BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.vulo_attach_open_shift_only_trigger()', v_table);
  END LOOP;
  DROP TRIGGER IF EXISTS attach_open_shift ON public.movimientos_inventario;
  CREATE TRIGGER attach_open_shift BEFORE INSERT ON public.movimientos_inventario
  FOR EACH ROW EXECUTE FUNCTION public.vulo_attach_inventory_shift_trigger();
END $$;

-- No se permite abrir una caja a nombre de otra persona.
CREATE OR REPLACE FUNCTION public.vulo_validate_shift_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.vulo_is_superadmin() AND NEW.usuario_id <> auth.uid()::text THEN
    RAISE EXCEPTION 'Sólo puedes abrir o modificar tu propio turno';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_shift_owner ON public.turnos_operativos;
CREATE TRIGGER validate_shift_owner BEFORE INSERT OR UPDATE ON public.turnos_operativos
FOR EACH ROW EXECUTE FUNCTION public.vulo_validate_shift_owner();

-- Asocia movimientos históricos cuando sí existe autor identificable.
DO $$
DECLARE v_table text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY['pagos','cargos','ventas','gastos','compras','pagos_compras']
  LOOP
    EXECUTE format($sql$
      UPDATE public.%I movement
      SET turno_id = (
        SELECT shift.id
        FROM public.turnos_operativos shift
        WHERE shift.hotel_id = movement.hotel_id
          AND shift.usuario_id = movement.created_by::text
          AND movement.created_at >= shift.abierto_at
          AND movement.created_at < COALESCE(shift.cerrado_at, 'infinity'::timestamptz)
        ORDER BY shift.abierto_at DESC LIMIT 1
      )
      WHERE movement.turno_id IS NULL AND movement.created_by IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.turnos_operativos shift
          WHERE shift.hotel_id = movement.hotel_id
            AND shift.usuario_id = movement.created_by::text
            AND movement.created_at >= shift.abierto_at
            AND movement.created_at < COALESCE(shift.cerrado_at, 'infinity'::timestamptz)
        )
    $sql$, v_table);
  END LOOP;
END $$;

-- El servidor vuelve a sumar la caja al cerrar; no confía en los totales del navegador.
CREATE OR REPLACE FUNCTION public.vulo_close_shift(
  p_turno_id uuid,
  p_efectivo_contado numeric,
  p_entrega_a text,
  p_resumen_entrega text,
  p_pendientes_entrega text,
  p_motivo_diferencia text,
  p_checklist jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shift public.turnos_operativos%ROWTYPE;
  v_cash numeric := 0;
  v_card numeric := 0;
  v_transfer numeric := 0;
  v_other numeric := 0;
  v_expenses numeric := 0;
  v_expected numeric;
  v_difference numeric;
BEGIN
  SELECT * INTO v_shift FROM public.turnos_operativos
  WHERE id = p_turno_id AND estado = 'Abierto' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'El turno ya no está abierto'; END IF;
  IF NOT public.vulo_is_superadmin() AND v_shift.usuario_id <> auth.uid()::text THEN
    RAISE EXCEPTION 'Sólo puedes cerrar tu propio turno';
  END IF;
  IF p_efectivo_contado IS NULL OR p_efectivo_contado < 0 THEN RAISE EXCEPTION 'Registra el efectivo contado'; END IF;
  IF length(trim(COALESCE(p_resumen_entrega,''))) < 2 OR length(trim(COALESCE(p_pendientes_entrega,''))) < 2 THEN
    RAISE EXCEPTION 'La entrega debe incluir resumen y pendientes';
  END IF;
  IF NOT (COALESCE((p_checklist->>'caja')::boolean,false)
    AND COALESCE((p_checklist->>'pendientes')::boolean,false)
    AND COALESCE((p_checklist->>'llegadas')::boolean,false)
    AND COALESCE((p_checklist->>'incidentes')::boolean,false)) THEN
    RAISE EXCEPTION 'Completa la confirmación obligatoria del cierre';
  END IF;

  SELECT
    COALESCE(SUM(amount) FILTER (WHERE method LIKE '%efectivo%'),0),
    COALESCE(SUM(amount) FILTER (WHERE method LIKE '%tarjeta%'),0),
    COALESCE(SUM(amount) FILTER (WHERE method LIKE '%transfer%'),0),
    COALESCE(SUM(amount) FILTER (WHERE method NOT LIKE '%efectivo%' AND method NOT LIKE '%tarjeta%' AND method NOT LIKE '%transfer%'),0)
  INTO v_cash,v_card,v_transfer,v_other
  FROM (
    SELECT monto AS amount, lower(COALESCE(metodo_pago,'')) AS method
    FROM public.pagos WHERE turno_id=p_turno_id AND COALESCE(estado,'Activo')='Activo'
    UNION ALL
    SELECT total AS amount, lower(COALESCE(metodo_pago,'')) AS method
    FROM public.ventas WHERE turno_id=p_turno_id AND reserva_id IS NULL AND COALESCE(estado,'Activa')='Activa'
  ) income;

  SELECT COALESCE(SUM(amount),0) INTO v_expenses FROM (
    SELECT monto AS amount FROM public.gastos WHERE turno_id=p_turno_id AND lower(COALESCE(metodo_pago,'')) LIKE '%efectivo%'
    UNION ALL
    SELECT monto AS amount FROM public.pagos_compras WHERE turno_id=p_turno_id AND lower(COALESCE(metodo_pago,'')) LIKE '%efectivo%'
  ) expense;

  v_expected := ROUND(COALESCE(v_shift.fondo_inicial,0)+v_cash-v_expenses,2);
  v_difference := ROUND(p_efectivo_contado-v_expected,2);
  IF abs(v_difference) >= 0.01 AND length(trim(COALESCE(p_motivo_diferencia,''))) < 3 THEN
    RAISE EXCEPTION 'Explica la diferencia de caja';
  END IF;

  UPDATE public.turnos_operativos SET
    estado='Cerrado', cerrado_at=now(), efectivo_esperado=v_expected,
    efectivo_contado=p_efectivo_contado, diferencia=v_difference,
    ingresos_efectivo=v_cash, ingresos_tarjeta=v_card,
    ingresos_transferencia=v_transfer, otros_ingresos=v_other,
    egresos_efectivo=v_expenses, entrega_a=NULLIF(trim(COALESCE(p_entrega_a,'')),''),
    resumen_entrega=trim(p_resumen_entrega), pendientes_entrega=trim(p_pendientes_entrega),
    motivo_diferencia=NULLIF(trim(COALESCE(p_motivo_diferencia,'')),''), checklist_cierre=p_checklist
  WHERE id=p_turno_id;

  RETURN (SELECT to_jsonb(t) FROM public.turnos_operativos t WHERE t.id=p_turno_id);
END;
$$;

REVOKE ALL ON FUNCTION public.vulo_close_shift(uuid,numeric,text,text,text,text,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vulo_close_shift(uuid,numeric,text,text,text,text,jsonb) TO authenticated;
