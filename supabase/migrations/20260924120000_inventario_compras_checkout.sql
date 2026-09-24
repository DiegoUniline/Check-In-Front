-- Inventario, compras y check-out atómicos.
--  * Movimientos de inventario en una sola transacción (sin pérdidas por
--    concurrencia y sin stock negativo).
--  * Recepción de compras una sola vez y con bloqueo de la orden.
--  * Folio de compras único por hotel.
--  * Pagos a proveedor: no exceden el total ni se registran en órdenes canceladas.
--  * Una orden con pagos no se borra; los pagos no se borran en días cerrados.
--  * Check-out sólo sobre estancias activas.
--  * Faltantes de entregables generan cargo.

-- ---------------------------------------------------------------------------
-- 1. Movimiento de inventario atómico
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.vulo_inventory_move(
  p_producto_id uuid,
  p_tipo text,
  p_cantidad numeric,
  p_motivo text DEFAULT NULL,
  p_referencia text DEFAULT NULL,
  p_absoluto boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product public.productos%ROWTYPE;
  v_before numeric;
  v_after numeric;
  v_qty numeric := COALESCE(p_cantidad, 0);
  v_tipo text := lower(trim(COALESCE(p_tipo, '')));
  v_move public.movimientos_inventario%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sesión no válida'; END IF;

  SELECT * INTO v_product FROM public.productos
  WHERE id = p_producto_id
    AND (hotel_id = public.vulo_current_hotel_id() OR public.vulo_is_superadmin())
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Producto no encontrado'; END IF;

  v_before := COALESCE(v_product.stock_actual, 0);
  IF p_absoluto THEN
    IF v_qty < 0 THEN RAISE EXCEPTION 'El stock real no puede ser negativo'; END IF;
    v_after := v_qty;
    IF v_after = v_before THEN RETURN NULL; END IF;
    v_tipo := CASE WHEN v_after > v_before THEN 'Entrada' ELSE 'Salida' END;
    v_qty := abs(v_after - v_before);
  ELSE
    IF v_qty <= 0 THEN RAISE EXCEPTION 'La cantidad debe ser mayor a cero'; END IF;
    IF v_tipo = 'salida' THEN
      v_after := v_before - v_qty;
      v_tipo := 'Salida';
    ELSIF v_tipo = 'entrada' THEN
      v_after := v_before + v_qty;
      v_tipo := 'Entrada';
    ELSE
      RAISE EXCEPTION 'Tipo de movimiento no válido';
    END IF;
    IF v_after < 0 THEN
      RAISE EXCEPTION '%: existencia insuficiente. Disponible %, solicitado %', v_product.nombre, v_before, v_qty;
    END IF;
  END IF;

  UPDATE public.productos SET stock_actual = v_after, updated_at = now()
  WHERE id = v_product.id;

  INSERT INTO public.movimientos_inventario(
    producto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, referencia, usuario_id
  ) VALUES (
    v_product.id, v_tipo, v_qty, v_before, v_after,
    COALESCE(NULLIF(trim(p_motivo), ''), CASE WHEN p_absoluto THEN 'Ajuste de stock' ELSE v_tipo END),
    NULLIF(trim(COALESCE(p_referencia, '')), ''),
    auth.uid()
  ) RETURNING * INTO v_move;

  RETURN to_jsonb(v_move);
END;
$$;

REVOKE ALL ON FUNCTION public.vulo_inventory_move(uuid, text, numeric, text, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vulo_inventory_move(uuid, text, numeric, text, text, boolean) TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. Folio de compra único por hotel (se asigna en la base)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.vulo_assign_purchase_folio()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('compras_folio:' || NEW.hotel_id::text, 0));
  IF NEW.numero_orden IS NULL OR trim(NEW.numero_orden) = ''
     OR EXISTS (SELECT 1 FROM public.compras c
                WHERE c.hotel_id = NEW.hotel_id AND c.numero_orden = NEW.numero_orden
                  AND c.id IS DISTINCT FROM NEW.id) THEN
    SELECT COALESCE(MAX(NULLIF(regexp_replace(numero_orden, '\D', '', 'g'), '')::integer), 0)
    INTO v_last
    FROM public.compras
    WHERE hotel_id = NEW.hotel_id AND numero_orden LIKE 'OC-%';
    NEW.numero_orden := 'OC-' || lpad((v_last + 1)::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.vulo_assign_purchase_folio() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_vulo_assign_purchase_folio ON public.compras;
CREATE TRIGGER trg_vulo_assign_purchase_folio
BEFORE INSERT ON public.compras
FOR EACH ROW EXECUTE FUNCTION public.vulo_assign_purchase_folio();

-- ---------------------------------------------------------------------------
-- 3. Recepción de compra: una sola vez, con la orden bloqueada
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.vulo_receive_purchase(p_compra_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_compra public.compras%ROWTYPE;
  v_item record;
  v_product public.productos%ROWTYPE;
  v_folio text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sesión no válida'; END IF;

  SELECT * INTO v_compra FROM public.compras
  WHERE id = p_compra_id
    AND (hotel_id = public.vulo_current_hotel_id() OR public.vulo_is_superadmin())
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Orden de compra no encontrada'; END IF;
  IF v_compra.estado = 'Recibida' THEN RETURN to_jsonb(v_compra); END IF;
  IF v_compra.estado = 'Cancelada' THEN RAISE EXCEPTION 'Una orden cancelada no puede recibirse'; END IF;

  v_folio := v_compra.numero_orden;

  -- Compatibilidad: órdenes antiguas que ya ingresaron stock al crearse.
  IF v_folio IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.movimientos_inventario m
    JOIN public.productos p ON p.id = m.producto_id AND p.hotel_id = v_compra.hotel_id
    WHERE m.referencia = v_folio AND m.motivo = 'Compra'
  ) THEN
    FOR v_item IN
      SELECT d.producto_id, SUM(COALESCE(d.cantidad, 0)) AS cantidad
      FROM public.compras_detalle d
      WHERE d.compra_id = v_compra.id AND d.producto_id IS NOT NULL
      GROUP BY d.producto_id
      HAVING SUM(COALESCE(d.cantidad, 0)) > 0
    LOOP
      SELECT * INTO v_product FROM public.productos
      WHERE id = v_item.producto_id AND hotel_id = v_compra.hotel_id
      FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'Un producto de la orden ya no existe en el hotel'; END IF;

      UPDATE public.productos
      SET stock_actual = COALESCE(stock_actual, 0) + v_item.cantidad, updated_at = now()
      WHERE id = v_product.id;

      INSERT INTO public.movimientos_inventario(
        producto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, referencia, usuario_id
      ) VALUES (
        v_product.id, 'Entrada', v_item.cantidad, COALESCE(v_product.stock_actual, 0),
        COALESCE(v_product.stock_actual, 0) + v_item.cantidad, 'Compra', v_folio, auth.uid()
      );
    END LOOP;
  END IF;

  UPDATE public.compras SET estado = 'Recibida' WHERE id = v_compra.id
  RETURNING * INTO v_compra;
  RETURN to_jsonb(v_compra);
END;
$$;

REVOKE ALL ON FUNCTION public.vulo_receive_purchase(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vulo_receive_purchase(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. Eliminar orden: nunca si está recibida o tiene pagos; las órdenes
--    antiguas que ya habían ingresado stock se revierten con un movimiento.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.vulo_delete_purchase(p_compra_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_compra public.compras%ROWTYPE;
  v_item record;
  v_product public.productos%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sesión no válida'; END IF;

  SELECT * INTO v_compra FROM public.compras
  WHERE id = p_compra_id
    AND (hotel_id = public.vulo_current_hotel_id() OR public.vulo_is_superadmin())
  FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', true); END IF;
  IF v_compra.estado = 'Recibida' THEN
    RAISE EXCEPTION 'Una orden recibida ya afectó inventario y no debe eliminarse. Usa un ajuste documentado si necesitas corregirla.';
  END IF;
  IF to_regclass('public.pagos_compras') IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.pagos_compras WHERE compra_id = v_compra.id) THEN
    RAISE EXCEPTION 'La orden tiene pagos registrados; elimina o corrige los pagos antes de borrar la orden.';
  END IF;

  IF v_compra.numero_orden IS NOT NULL THEN
    FOR v_item IN
      SELECT m.producto_id, SUM(m.cantidad) AS cantidad
      FROM public.movimientos_inventario m
      JOIN public.productos p ON p.id = m.producto_id AND p.hotel_id = v_compra.hotel_id
      WHERE m.referencia = v_compra.numero_orden AND m.motivo = 'Compra'
      GROUP BY m.producto_id
    LOOP
      SELECT * INTO v_product FROM public.productos WHERE id = v_item.producto_id FOR UPDATE;
      IF COALESCE(v_product.stock_actual, 0) < v_item.cantidad THEN
        RAISE EXCEPTION 'No se puede eliminar esta orden porque parte del stock que generó ya fue consumido. Usa un ajuste de inventario.';
      END IF;
      UPDATE public.productos SET stock_actual = COALESCE(stock_actual, 0) - v_item.cantidad, updated_at = now()
      WHERE id = v_product.id;
      INSERT INTO public.movimientos_inventario(
        producto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, referencia, usuario_id
      ) VALUES (
        v_product.id, 'Salida', v_item.cantidad, COALESCE(v_product.stock_actual, 0),
        COALESCE(v_product.stock_actual, 0) - v_item.cantidad, 'Reverso de compra eliminada',
        v_compra.numero_orden, auth.uid()
      );
    END LOOP;
  END IF;

  DELETE FROM public.compras_detalle WHERE compra_id = v_compra.id;
  DELETE FROM public.compras WHERE id = v_compra.id;
  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.vulo_delete_purchase(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vulo_delete_purchase(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 5. Pagos a proveedor
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.pagos_compras') IS NULL THEN RETURN; END IF;

  EXECUTE $f$
    CREATE OR REPLACE FUNCTION public.vulo_guard_purchase_payment()
    RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $b$
    DECLARE
      v_compra public.compras%ROWTYPE;
      v_paid numeric;
    BEGIN
      SELECT * INTO v_compra FROM public.compras WHERE id = NEW.compra_id FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'Orden de compra no encontrada'; END IF;
      IF v_compra.hotel_id <> NEW.hotel_id THEN RAISE EXCEPTION 'La orden pertenece a otro hotel'; END IF;
      IF v_compra.estado = 'Cancelada' THEN RAISE EXCEPTION 'No se pueden registrar pagos en una orden cancelada'; END IF;
      SELECT COALESCE(SUM(monto), 0) INTO v_paid FROM public.pagos_compras
      WHERE compra_id = NEW.compra_id AND id IS DISTINCT FROM NEW.id;
      IF v_paid + COALESCE(NEW.monto, 0) > COALESCE(v_compra.total, 0) + 0.009 THEN
        RAISE EXCEPTION 'El pago excede el saldo de la orden (pendiente %)', GREATEST(0, COALESCE(v_compra.total, 0) - v_paid);
      END IF;
      NEW.created_by := COALESCE(NEW.created_by, auth.uid());
      RETURN NEW;
    END;
    $b$;
  $f$;

  EXECUTE 'REVOKE ALL ON FUNCTION public.vulo_guard_purchase_payment() FROM PUBLIC, anon, authenticated';
  EXECUTE 'DROP TRIGGER IF EXISTS trg_vulo_guard_purchase_payment ON public.pagos_compras';
  EXECUTE 'CREATE TRIGGER trg_vulo_guard_purchase_payment BEFORE INSERT OR UPDATE OF monto, compra_id ON public.pagos_compras FOR EACH ROW EXECUTE FUNCTION public.vulo_guard_purchase_payment()';

  -- Los pagos a proveedor de un día cerrado no se modifican ni se borran.
  EXECUTE 'DROP TRIGGER IF EXISTS prevent_closed_day_pagos_compras ON public.pagos_compras';
  EXECUTE 'CREATE TRIGGER prevent_closed_day_pagos_compras BEFORE INSERT OR UPDATE OR DELETE ON public.pagos_compras FOR EACH ROW EXECUTE FUNCTION public.vulo_prevent_closed_day_change()';

  -- La orden ya no arrastra en cascada sus pagos: se debe decidir explícitamente.
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pagos_compras_compra_id_fkey') THEN
    EXECUTE 'ALTER TABLE public.pagos_compras DROP CONSTRAINT pagos_compras_compra_id_fkey';
  END IF;
  EXECUTE 'ALTER TABLE public.pagos_compras ADD CONSTRAINT pagos_compras_compra_id_fkey FOREIGN KEY (compra_id) REFERENCES public.compras(id) ON DELETE RESTRICT';
END $$;

-- ---------------------------------------------------------------------------
-- 6. Check-out sólo sobre estancias activas
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_reservation_checkout(
  p_reserva_id uuid,
  p_pago jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_reserva public.reservas%ROWTYPE;
BEGIN
  SELECT * INTO v_reserva FROM public.reservas WHERE id = p_reserva_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reserva no encontrada'; END IF;
  IF COALESCE(v_reserva.checkout_realizado, false) OR v_reserva.estado = 'CheckOut' THEN
    RAISE EXCEPTION 'La reserva ya tiene check-out';
  END IF;
  IF v_reserva.estado NOT IN ('CheckIn', 'Hospedado') OR NOT COALESCE(v_reserva.checkin_realizado, false) THEN
    RAISE EXCEPTION 'Sólo se puede hacer check-out de una estancia con check-in (estado actual: %)', v_reserva.estado;
  END IF;

  PERFORM public.recalculate_reservation_financials(p_reserva_id);
  SELECT * INTO v_reserva FROM public.reservas WHERE id = p_reserva_id;

  IF p_pago IS NOT NULL AND COALESCE((p_pago->>'monto')::numeric, 0) > 0 THEN
    IF (p_pago->>'monto')::numeric > GREATEST(COALESCE(v_reserva.saldo_pendiente, 0), 0) + 0.009 THEN
      RAISE EXCEPTION 'El pago excede el saldo pendiente';
    END IF;
    INSERT INTO public.pagos (hotel_id, reserva_id, monto, metodo_pago, referencia, concepto)
    VALUES (
      v_reserva.hotel_id, p_reserva_id, (p_pago->>'monto')::numeric,
      NULLIF(p_pago->>'metodo_pago', ''), NULLIF(p_pago->>'referencia', ''),
      COALESCE(NULLIF(p_pago->>'concepto', ''), 'Pago en Check-out')
    );
  END IF;

  PERFORM public.recalculate_reservation_financials(p_reserva_id);
  SELECT * INTO v_reserva FROM public.reservas WHERE id = p_reserva_id;
  IF COALESCE(v_reserva.saldo_pendiente, 0) > 0.009 THEN
    RAISE EXCEPTION 'La reserva todavía tiene saldo pendiente de %', round(v_reserva.saldo_pendiente, 2);
  END IF;

  UPDATE public.reservas
  SET checkout_realizado = true, estado = 'CheckOut'
  WHERE id = p_reserva_id;

  -- La habitación sólo se libera si no hay otra estancia activa en ella.
  IF v_reserva.habitacion_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.reservas r
    WHERE r.habitacion_id = v_reserva.habitacion_id AND r.id <> p_reserva_id
      AND r.estado IN ('CheckIn', 'Hospedado')
      AND COALESCE(r.checkin_realizado, false) AND NOT COALESCE(r.checkout_realizado, false)
  ) THEN
    UPDATE public.habitaciones
    SET estado_habitacion = 'Disponible', estado_limpieza = 'Sucia'
    WHERE id = v_reserva.habitacion_id AND hotel_id = v_reserva.hotel_id;
  END IF;

  RETURN (SELECT to_jsonb(r) FROM public.reservas r WHERE r.id = p_reserva_id);
END;
$$;

REVOKE ALL ON FUNCTION public.complete_reservation_checkout(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_reservation_checkout(uuid, jsonb) TO authenticated;

-- ---------------------------------------------------------------------------
-- 7. Devolución de entregables con cargo por faltantes
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.vulo_return_deliverable_charge(
  p_assignment_id uuid,
  p_cantidad_devuelta numeric,
  p_crear_cargo boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assignment jsonb;
  v_row public.entregables_reserva%ROWTYPE;
  v_reserva public.reservas%ROWTYPE;
  v_nombre text;
  v_charge public.cargos%ROWTYPE;
BEGIN
  v_assignment := public.vulo_return_deliverable(p_assignment_id, p_cantidad_devuelta);
  SELECT * INTO v_row FROM public.entregables_reserva WHERE id = p_assignment_id;

  IF p_crear_cargo AND COALESCE(v_row.costo_faltante, 0) > 0 THEN
    SELECT * INTO v_reserva FROM public.reservas WHERE id = v_row.reserva_id;
    SELECT nombre INTO v_nombre FROM public.entregables WHERE id = v_row.entregable_id;
    INSERT INTO public.cargos(hotel_id, reserva_id, habitacion_id, concepto, cantidad, precio_unitario, impuesto, notas)
    VALUES (
      v_reserva.hotel_id, v_reserva.id, v_reserva.habitacion_id,
      'Faltante: ' || COALESCE(v_nombre, 'entregable'),
      1, v_row.costo_faltante, 0,
      'Devueltos ' || p_cantidad_devuelta || ' de ' || COALESCE(v_row.cantidad, 1)
    ) RETURNING * INTO v_charge;
    RETURN v_assignment || jsonb_build_object('cargo', to_jsonb(v_charge));
  END IF;
  RETURN v_assignment;
END;
$$;

REVOKE ALL ON FUNCTION public.vulo_return_deliverable_charge(uuid, numeric, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vulo_return_deliverable_charge(uuid, numeric, boolean) TO authenticated;

-- ---------------------------------------------------------------------------
-- 8. Corrección de reserva desde el detalle: también para recepción
--    (cambia fechas/habitación con las mismas validaciones que modify_dates).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.vulo_operation_allowed(p_operacion text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text := COALESCE(public.vulo_current_role(), '');
  v_override boolean;
  v_key text := 'reservas.operacion.' || lower(p_operacion);
BEGIN
  IF v_role IN ('SuperAdmin', 'Admin') THEN RETURN true; END IF;

  SELECT permitido INTO v_override
  FROM public.permisos_hotel
  WHERE hotel_id = public.vulo_current_hotel_id()
    AND rol = v_role AND modulo = v_key
  LIMIT 1;
  IF FOUND THEN RETURN COALESCE(v_override, false); END IF;

  IF v_role = 'Gerente' THEN RETURN true; END IF;
  IF v_role = 'Recepcion' THEN
    RETURN lower(p_operacion) = ANY (ARRAY[
      'extend_stay','early_departure','modify_dates','room_change',
      'late_checkout','early_checkin','add_guest','remove_guest',
      'add_charge','partial_payment','no_show','consecutive_reservation',
      'correction_note','split_account','move_to_account','reservation_correction'
    ]);
  END IF;
  RETURN false;
END;
$$;

-- ---------------------------------------------------------------------------
-- 9. Día cerrado según la zona horaria del hotel (antes usaba UTC: un pago a
--    las 20:00 quedaba en el día siguiente y el candado protegía otro día).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.vulo_movement_hotel_date(p_row jsonb, p_hotel_id uuid)
RETURNS date
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tz text;
  v_raw text := NULLIF(COALESCE(p_row->>'fecha', p_row->>'created_at'), '');
BEGIN
  SELECT COALESCE(timezone, 'America/Mexico_City') INTO v_tz FROM public.hotels WHERE id = p_hotel_id;
  v_tz := COALESCE(v_tz, 'America/Mexico_City');
  IF v_raw IS NULL THEN RETURN (now() AT TIME ZONE v_tz)::date; END IF;
  -- Fecha sin hora: ya es el día del hotel.
  IF length(v_raw) <= 10 THEN RETURN v_raw::date; END IF;
  RETURN (v_raw::timestamptz AT TIME ZONE v_tz)::date;
END;
$$;

CREATE OR REPLACE FUNCTION public.vulo_prevent_closed_day_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hotel_id uuid;
  v_fecha date;
  v_old_fecha date;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_hotel_id := OLD.hotel_id;
    v_fecha := public.vulo_movement_hotel_date(to_jsonb(OLD), v_hotel_id);
  ELSE
    v_hotel_id := NEW.hotel_id;
    v_fecha := public.vulo_movement_hotel_date(to_jsonb(NEW), v_hotel_id);
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.cierres_diarios c
    WHERE c.hotel_id = v_hotel_id AND c.fecha_operativa = v_fecha AND c.estado = 'Cerrado'
  ) THEN
    RAISE EXCEPTION 'El día operativo % está cerrado. Reábralo antes de modificar movimientos.', v_fecha
      USING ERRCODE = 'P0001';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    v_old_fecha := public.vulo_movement_hotel_date(to_jsonb(OLD), OLD.hotel_id);
    IF EXISTS (
      SELECT 1 FROM public.cierres_diarios c
      WHERE c.hotel_id = OLD.hotel_id AND c.fecha_operativa = v_old_fecha AND c.estado = 'Cerrado'
    ) THEN
      RAISE EXCEPTION 'El día operativo % está cerrado. Reábralo antes de modificar movimientos.', v_old_fecha
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 10. Mantenimiento: cerrar un reporte no libera la habitación si quedan
--     otros reportes abiertos.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.vulo_release_room_after_maintenance()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_resolved boolean;
BEGIN
  v_resolved := NEW.estado IN ('Completada','Completado','Resuelto','Cerrado');
  IF v_resolved AND OLD.estado IS DISTINCT FROM NEW.estado AND NEW.habitacion_id IS NOT NULL THEN
    NEW.fecha_completado := COALESCE(NEW.fecha_completado, now());
    IF EXISTS (
      SELECT 1 FROM public.tareas_mantenimiento t
      WHERE t.habitacion_id = NEW.habitacion_id AND t.id <> NEW.id
        AND COALESCE(t.estado, 'Pendiente') NOT IN ('Completada','Completado','Resuelto','Cerrado','Cancelada','Cancelado')
    ) THEN
      RETURN NEW;
    END IF;
    UPDATE public.habitaciones h SET estado_mantenimiento='OK',
      estado_habitacion=CASE WHEN h.estado_habitacion IN ('FueraDeServicio','Mantenimiento','Bloqueada')
        AND NOT EXISTS(SELECT 1 FROM public.reservas r WHERE r.habitacion_id=h.id
          AND r.estado IN ('CheckIn','Hospedado') AND COALESCE(r.checkin_realizado,false)
          AND NOT COALESCE(r.checkout_realizado,false)) THEN 'Disponible' ELSE h.estado_habitacion END,
      fuera_servicio_motivo=NULL,fuera_servicio_desde=NULL,fuera_servicio_hasta=NULL
    WHERE h.id=NEW.habitacion_id AND h.hotel_id=NEW.hotel_id;
  END IF;
  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
