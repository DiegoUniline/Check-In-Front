-- Ventas y consumos atómicos VULO.
-- Una sola transacción crea venta, detalle, cargos, movimientos de inventario,
-- recálculo de la estancia y auditoría. Las correcciones nunca borran historia.

ALTER TABLE public.cargos
  ADD COLUMN IF NOT EXISTS venta_id uuid,
  ADD COLUMN IF NOT EXISTS venta_detalle_id uuid;

ALTER TABLE public.ventas
  ADD COLUMN IF NOT EXISTS estado text NOT NULL DEFAULT 'Activa';

ALTER TABLE public.ventas_detalle
  ADD COLUMN IF NOT EXISTS estado text NOT NULL DEFAULT 'Activo',
  ADD COLUMN IF NOT EXISTS cancelado_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelado_por uuid,
  ADD COLUMN IF NOT EXISTS motivo_cancelacion text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cargos_venta_id_fkey') THEN
    ALTER TABLE public.cargos ADD CONSTRAINT cargos_venta_id_fkey
      FOREIGN KEY (venta_id) REFERENCES public.ventas(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cargos_venta_detalle_id_fkey') THEN
    ALTER TABLE public.cargos ADD CONSTRAINT cargos_venta_detalle_id_fkey
      FOREIGN KEY (venta_detalle_id) REFERENCES public.ventas_detalle(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ventas_estado_check') THEN
    ALTER TABLE public.ventas ADD CONSTRAINT ventas_estado_check CHECK (estado IN ('Activa','Cancelada'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ventas_detalle_estado_check') THEN
    ALTER TABLE public.ventas_detalle ADD CONSTRAINT ventas_detalle_estado_check CHECK (estado IN ('Activo','Cancelado'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS cargos_venta_idx ON public.cargos(venta_id);
CREATE UNIQUE INDEX IF NOT EXISTS cargos_venta_detalle_unique_idx
  ON public.cargos(venta_detalle_id) WHERE venta_detalle_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.vulo_register_sale(
  p_items jsonb,
  p_metodo_pago text DEFAULT 'Efectivo',
  p_reserva_id uuid DEFAULT NULL,
  p_habitacion_id uuid DEFAULT NULL,
  p_notas text DEFAULT NULL,
  p_motivo text DEFAULT NULL,
  p_cuenta_estancia_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hotel_id uuid := public.vulo_current_hotel_id();
  v_reserva public.reservas%ROWTYPE;
  v_before jsonb := '{}'::jsonb;
  v_venta public.ventas%ROWTYPE;
  v_detail public.ventas_detalle%ROWTYPE;
  v_charge public.cargos%ROWTYPE;
  v_product public.productos%ROWTYPE;
  v_item jsonb;
  v_normalized jsonb := '[]'::jsonb;
  v_charge_ids jsonb := '[]'::jsonb;
  v_product_id uuid;
  v_concept_id uuid;
  v_quantity numeric;
  v_price numeric;
  v_line_total numeric;
  v_subtotal numeric := 0;
  v_name text;
  v_method text := trim(COALESCE(p_metodo_pago, ''));
  v_reason text := trim(COALESCE(p_motivo, ''));
  v_folio text;
  v_stock_before numeric;
BEGIN
  IF auth.uid() IS NULL OR v_hotel_id IS NULL THEN RAISE EXCEPTION 'Sesión u hotel no válido'; END IF;
  IF COALESCE(jsonb_typeof(p_items),'null') <> 'array' THEN
    RAISE EXCEPTION 'El detalle de la venta no es válido';
  END IF;
  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Agrega por lo menos un producto o servicio';
  END IF;
  IF p_reserva_id IS NOT NULL AND length(v_reason) < 3 THEN RAISE EXCEPTION 'Escribe el motivo del consumo'; END IF;

  IF p_reserva_id IS NOT NULL THEN
    SELECT * INTO v_reserva FROM public.reservas
    WHERE id = p_reserva_id AND hotel_id = v_hotel_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Reservación no encontrada'; END IF;
    IF v_reserva.estado IN ('Cancelada','NoShow','CheckOut') OR COALESCE(v_reserva.checkout_realizado,false) THEN
      RAISE EXCEPTION 'No se pueden agregar consumos a una estancia cerrada';
    END IF;
    p_habitacion_id := v_reserva.habitacion_id;
    v_before := to_jsonb(v_reserva);
    v_method := 'Cargo a habitación';
    IF p_cuenta_estancia_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.cuentas_estancia
      WHERE id = p_cuenta_estancia_id AND reserva_id = p_reserva_id AND estado = 'Abierta'
    ) THEN RAISE EXCEPTION 'La subcuenta seleccionada no es válida'; END IF;
  ELSE
    IF length(v_method) < 2 OR NOT EXISTS (
      SELECT 1 FROM public.metodos_pago
      WHERE hotel_id = v_hotel_id AND activo IS TRUE AND lower(nombre) = lower(v_method)
    ) THEN RAISE EXCEPTION 'Selecciona una forma de pago activa del catálogo'; END IF;
  END IF;

  -- Bloquea y normaliza el catálogo antes de crear cualquier movimiento.
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := NULLIF(v_item->>'product_id','')::uuid;
    v_concept_id := NULLIF(v_item->>'concept_id','')::uuid;
    v_quantity := COALESCE(NULLIF(v_item->>'quantity','')::numeric, 0);
    IF v_quantity <= 0 THEN RAISE EXCEPTION 'Todas las cantidades deben ser mayores a cero'; END IF;

    IF v_product_id IS NOT NULL THEN
      SELECT * INTO v_product FROM public.productos
      WHERE id = v_product_id AND hotel_id = v_hotel_id AND activo IS NOT FALSE FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'Uno de los productos ya no existe o está inactivo'; END IF;
      v_name := v_product.nombre;
      v_price := COALESCE(v_product.precio_venta, 0);
      IF COALESCE(v_product.stock_actual,0) < v_quantity THEN
        RAISE EXCEPTION '%: existencia insuficiente. Disponible %, solicitado %',
          v_product.nombre, COALESCE(v_product.stock_actual,0), v_quantity;
      END IF;
    ELSIF v_concept_id IS NOT NULL THEN
      SELECT nombre, COALESCE(precio,0) INTO v_name, v_price
      FROM public.conceptos_cargo WHERE id = v_concept_id AND hotel_id = v_hotel_id;
      IF NOT FOUND THEN RAISE EXCEPTION 'Uno de los servicios ya no existe'; END IF;
    ELSE
      RAISE EXCEPTION 'Cada renglón debe pertenecer a un producto o servicio del catálogo';
    END IF;

    v_line_total := ROUND(v_quantity * v_price, 2);
    v_subtotal := v_subtotal + v_line_total;
    v_normalized := v_normalized || jsonb_build_array(jsonb_build_object(
      'product_id', v_product_id, 'concept_id', v_concept_id, 'name', v_name,
      'quantity', v_quantity, 'unit_price', v_price, 'total', v_line_total
    ));
  END LOOP;

  v_folio := 'POS-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS');
  INSERT INTO public.ventas(
    hotel_id, folio, subtotal, impuestos, total, metodo_pago, reserva_id,
    habitacion_id, notas, created_by, detalle, estado
  ) VALUES (
    v_hotel_id, v_folio, v_subtotal, 0, v_subtotal, v_method, p_reserva_id,
    p_habitacion_id, NULLIF(trim(COALESCE(p_notas,'')),''), auth.uid(), v_normalized, 'Activa'
  ) RETURNING * INTO v_venta;

  FOR v_item IN SELECT value FROM jsonb_array_elements(v_normalized)
  LOOP
    v_product_id := NULLIF(v_item->>'product_id','')::uuid;
    v_concept_id := NULLIF(v_item->>'concept_id','')::uuid;
    v_quantity := (v_item->>'quantity')::numeric;
    v_price := (v_item->>'unit_price')::numeric;
    v_line_total := (v_item->>'total')::numeric;
    v_name := v_item->>'name';

    INSERT INTO public.ventas_detalle(venta_id,producto_id,producto_nombre,cantidad,precio_unitario,total,estado)
    VALUES(v_venta.id,v_product_id,v_name,v_quantity,v_price,v_line_total,'Activo')
    RETURNING * INTO v_detail;

    IF v_product_id IS NOT NULL THEN
      SELECT COALESCE(stock_actual,0) INTO v_stock_before FROM public.productos
      WHERE id = v_product_id FOR UPDATE;
      IF v_stock_before < v_quantity THEN
        RAISE EXCEPTION '%: existencia insuficiente al confirmar la venta', v_name;
      END IF;
      UPDATE public.productos SET stock_actual = v_stock_before - v_quantity, updated_at = now()
      WHERE id = v_product_id AND hotel_id = v_hotel_id;
      INSERT INTO public.movimientos_inventario(
        producto_id,tipo,cantidad,stock_anterior,stock_nuevo,motivo,referencia,usuario_id
      ) VALUES (
        v_product_id,'Salida',v_quantity,v_stock_before,v_stock_before-v_quantity,
        CASE WHEN p_reserva_id IS NULL THEN 'Venta POS' ELSE 'Consumo de estancia' END,
        v_folio,auth.uid()
      );
    END IF;

    IF p_reserva_id IS NOT NULL THEN
      INSERT INTO public.cargos(
        hotel_id,reserva_id,habitacion_id,concepto,concepto_cargo_id,producto_id,
        cantidad,precio_unitario,subtotal,impuesto,total,notas,cuenta_estancia_id,
        venta_id,venta_detalle_id,estado
      ) VALUES (
        v_hotel_id,p_reserva_id,p_habitacion_id,v_name,v_concept_id,v_product_id,
        v_quantity,v_price,v_line_total,0,v_line_total,NULLIF(trim(COALESCE(p_notas,'')),''),
        p_cuenta_estancia_id,v_venta.id,v_detail.id,'Activo'
      ) RETURNING * INTO v_charge;
      v_charge_ids := v_charge_ids || jsonb_build_array(v_charge.id);
    END IF;
  END LOOP;

  IF p_reserva_id IS NOT NULL THEN
    PERFORM public.recalculate_reservation_financials(p_reserva_id);
    INSERT INTO public.estancia_movimientos(
      hotel_id,reserva_id,operacion,motivo,datos_antes,datos_despues,metadata,
      usuario_id,usuario_email,usuario_nombre,reversible
    ) SELECT v_hotel_id,p_reserva_id,'add_charge',v_reason,v_before,to_jsonb(r),
      jsonb_build_object('sale_id',v_venta.id,'charge_ids',v_charge_ids,'items',v_normalized),
      auth.uid(),p.email,concat_ws(' ',p.nombre,p.apellido_paterno),false
    FROM public.reservas r LEFT JOIN public.profiles p ON p.id=auth.uid()
    WHERE r.id=p_reserva_id;
  END IF;

  INSERT INTO public.auditoria(
    hotel_id,user_id,user_email,accion,entidad,entidad_id,descripcion,datos_despues
  ) SELECT v_hotel_id,auth.uid(),p.email,'CREAR','venta',v_venta.id,
    COALESCE(NULLIF(v_reason,''),'Venta POS'),to_jsonb(v_venta)||jsonb_build_object('items',v_normalized)
  FROM public.profiles p WHERE p.id=auth.uid();

  RETURN jsonb_build_object('sale',to_jsonb(v_venta),'items',v_normalized,'charge_ids',v_charge_ids);
END;
$$;

REVOKE ALL ON FUNCTION public.vulo_register_sale(jsonb,text,uuid,uuid,text,text,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vulo_register_sale(jsonb,text,uuid,uuid,text,text,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.vulo_adjust_stay_charge(
  p_reserva_id uuid,
  p_charge_id uuid,
  p_action text,
  p_payload jsonb DEFAULT '{}'::jsonb,
  p_motivo text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hotel_id uuid := public.vulo_current_hotel_id();
  v_action text := lower(trim(COALESCE(p_action,'')));
  v_reason text := trim(COALESCE(p_motivo,''));
  v_charge public.cargos%ROWTYPE;
  v_reserva public.reservas%ROWTYPE;
  v_before jsonb;
  v_new_quantity numeric;
  v_new_price numeric;
  v_new_tax numeric;
  v_delta numeric;
  v_stock numeric;
  v_move_type text;
BEGIN
  IF auth.uid() IS NULL OR COALESCE(public.vulo_current_role(),'') NOT IN ('SuperAdmin','Admin','Gerente') THEN
    RAISE EXCEPTION 'Sólo gerencia puede corregir, cancelar o restaurar consumos';
  END IF;
  IF length(v_reason) < 3 THEN RAISE EXCEPTION 'Escribe el motivo de la corrección'; END IF;
  IF v_action NOT IN ('update','cancel','restore') THEN RAISE EXCEPTION 'Acción de consumo no válida'; END IF;

  SELECT * INTO v_reserva FROM public.reservas
  WHERE id=p_reserva_id AND hotel_id=v_hotel_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reservación no encontrada'; END IF;
  SELECT * INTO v_charge FROM public.cargos
  WHERE id=p_charge_id AND reserva_id=p_reserva_id AND hotel_id=v_hotel_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Consumo no encontrado'; END IF;
  v_before := jsonb_build_object('reservation',to_jsonb(v_reserva),'charge',to_jsonb(v_charge));

  IF v_action = 'update' THEN
    IF COALESCE(v_charge.estado,'Activo') <> 'Activo' THEN RAISE EXCEPTION 'El consumo está cancelado'; END IF;
    v_new_quantity := COALESCE(NULLIF(p_payload->>'quantity','')::numeric,v_charge.cantidad,1);
    v_new_price := COALESCE(NULLIF(p_payload->>'amount','')::numeric,v_charge.precio_unitario,0);
    v_new_tax := COALESCE(NULLIF(p_payload->>'tax','')::numeric,v_charge.impuesto,0);
    IF v_new_quantity<=0 OR v_new_price<0 OR v_new_tax<0 THEN RAISE EXCEPTION 'Cantidad, precio o impuesto no válido'; END IF;
    v_delta := v_new_quantity - COALESCE(v_charge.cantidad,1);
    IF v_charge.producto_id IS NOT NULL AND v_delta <> 0 THEN
      SELECT COALESCE(stock_actual,0) INTO v_stock FROM public.productos
      WHERE id=v_charge.producto_id AND hotel_id=v_hotel_id FOR UPDATE;
      IF v_delta>0 AND v_stock<v_delta THEN RAISE EXCEPTION 'Existencia insuficiente para aumentar la cantidad'; END IF;
      UPDATE public.productos SET stock_actual=v_stock-v_delta,updated_at=now() WHERE id=v_charge.producto_id;
      v_move_type := CASE WHEN v_delta>0 THEN 'Salida' ELSE 'Entrada' END;
      INSERT INTO public.movimientos_inventario(producto_id,tipo,cantidad,stock_anterior,stock_nuevo,motivo,referencia,usuario_id)
      VALUES(v_charge.producto_id,v_move_type,abs(v_delta),v_stock,v_stock-v_delta,
        'Corrección de consumo: '||v_reason,'CARGO-'||v_charge.id,auth.uid());
    END IF;
    UPDATE public.cargos SET
      concepto=COALESCE(NULLIF(p_payload->>'concept',''),concepto),cantidad=v_new_quantity,
      precio_unitario=v_new_price,subtotal=ROUND(v_new_quantity*v_new_price,2),impuesto=v_new_tax,
      total=ROUND(v_new_quantity*v_new_price,2)+v_new_tax,notas=COALESCE(p_payload->>'notes',notas),
      actualizado_at=now(),actualizado_por=auth.uid()
    WHERE id=v_charge.id;
    IF v_charge.venta_detalle_id IS NOT NULL THEN
      UPDATE public.ventas_detalle SET cantidad=v_new_quantity,precio_unitario=v_new_price,
        total=ROUND(v_new_quantity*v_new_price,2) WHERE id=v_charge.venta_detalle_id;
    END IF;
  ELSIF v_action = 'cancel' THEN
    IF COALESCE(v_charge.estado,'Activo') <> 'Activo' THEN RAISE EXCEPTION 'El consumo ya está cancelado'; END IF;
    IF v_charge.producto_id IS NOT NULL THEN
      SELECT COALESCE(stock_actual,0) INTO v_stock FROM public.productos
      WHERE id=v_charge.producto_id AND hotel_id=v_hotel_id FOR UPDATE;
      UPDATE public.productos SET stock_actual=v_stock+COALESCE(v_charge.cantidad,1),updated_at=now()
      WHERE id=v_charge.producto_id;
      INSERT INTO public.movimientos_inventario(producto_id,tipo,cantidad,stock_anterior,stock_nuevo,motivo,referencia,usuario_id)
      VALUES(v_charge.producto_id,'Entrada',COALESCE(v_charge.cantidad,1),v_stock,v_stock+COALESCE(v_charge.cantidad,1),
        'Cancelación de consumo: '||v_reason,'CARGO-'||v_charge.id,auth.uid());
    END IF;
    UPDATE public.cargos SET estado='Cancelado',cancelado_at=now(),cancelado_por=auth.uid(),
      motivo_cancelacion=v_reason,actualizado_at=now(),actualizado_por=auth.uid() WHERE id=v_charge.id;
    IF v_charge.venta_detalle_id IS NOT NULL THEN
      UPDATE public.ventas_detalle SET estado='Cancelado',cancelado_at=now(),cancelado_por=auth.uid(),
        motivo_cancelacion=v_reason WHERE id=v_charge.venta_detalle_id;
    END IF;
  ELSE
    IF COALESCE(v_charge.estado,'Activo') <> 'Cancelado' THEN RAISE EXCEPTION 'El consumo no está cancelado'; END IF;
    IF v_charge.producto_id IS NOT NULL THEN
      SELECT COALESCE(stock_actual,0) INTO v_stock FROM public.productos
      WHERE id=v_charge.producto_id AND hotel_id=v_hotel_id FOR UPDATE;
      IF v_stock<COALESCE(v_charge.cantidad,1) THEN RAISE EXCEPTION 'No hay existencia suficiente para restaurar el consumo'; END IF;
      UPDATE public.productos SET stock_actual=v_stock-COALESCE(v_charge.cantidad,1),updated_at=now()
      WHERE id=v_charge.producto_id;
      INSERT INTO public.movimientos_inventario(producto_id,tipo,cantidad,stock_anterior,stock_nuevo,motivo,referencia,usuario_id)
      VALUES(v_charge.producto_id,'Salida',COALESCE(v_charge.cantidad,1),v_stock,v_stock-COALESCE(v_charge.cantidad,1),
        'Restauración de consumo: '||v_reason,'CARGO-'||v_charge.id,auth.uid());
    END IF;
    UPDATE public.cargos SET estado='Activo',cancelado_at=NULL,cancelado_por=NULL,motivo_cancelacion=NULL,
      actualizado_at=now(),actualizado_por=auth.uid() WHERE id=v_charge.id;
    IF v_charge.venta_detalle_id IS NOT NULL THEN
      UPDATE public.ventas_detalle SET estado='Activo',cancelado_at=NULL,cancelado_por=NULL,
        motivo_cancelacion=NULL WHERE id=v_charge.venta_detalle_id;
    END IF;
  END IF;

  IF v_charge.venta_id IS NOT NULL THEN
    UPDATE public.ventas v SET
      subtotal=COALESCE((SELECT SUM(COALESCE(d.total,0)) FROM public.ventas_detalle d WHERE d.venta_id=v.id AND d.estado='Activo'),0),
      total=COALESCE((SELECT SUM(COALESCE(d.total,0)) FROM public.ventas_detalle d WHERE d.venta_id=v.id AND d.estado='Activo'),0),
      estado=CASE WHEN EXISTS(SELECT 1 FROM public.ventas_detalle d WHERE d.venta_id=v.id AND d.estado='Activo') THEN 'Activa' ELSE 'Cancelada' END
    WHERE v.id=v_charge.venta_id;
  END IF;
  PERFORM public.recalculate_reservation_financials(p_reserva_id);

  INSERT INTO public.estancia_movimientos(
    hotel_id,reserva_id,operacion,motivo,datos_antes,datos_despues,metadata,
    usuario_id,usuario_email,usuario_nombre,reversible
  ) SELECT v_hotel_id,p_reserva_id,v_action||'_charge',v_reason,v_before,
    jsonb_build_object('reservation',to_jsonb(r),'charge',to_jsonb(c)),
    jsonb_build_object('charge_id',v_charge.id,'sale_id',v_charge.venta_id),
    auth.uid(),p.email,concat_ws(' ',p.nombre,p.apellido_paterno),false
  FROM public.reservas r JOIN public.cargos c ON c.id=v_charge.id
  LEFT JOIN public.profiles p ON p.id=auth.uid() WHERE r.id=p_reserva_id;

  RETURN jsonb_build_object('ok',true,'charge_id',v_charge.id,'action',v_action);
END;
$$;

REVOKE ALL ON FUNCTION public.vulo_adjust_stay_charge(uuid,uuid,text,jsonb,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vulo_adjust_stay_charge(uuid,uuid,text,jsonb,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.vulo_reopen_checkout(
  p_reserva_id uuid,
  p_new_checkout date,
  p_new_room_id uuid,
  p_motivo text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE
  v_reserva public.reservas%ROWTYPE;
  v_before jsonb;
  v_today date;
BEGIN
  IF auth.uid() IS NULL OR COALESCE(public.vulo_current_role(),'') NOT IN ('SuperAdmin','Admin','Gerente') THEN
    RAISE EXCEPTION 'Sólo gerencia puede reabrir un check-out';
  END IF;
  IF length(trim(COALESCE(p_motivo,'')))<3 THEN RAISE EXCEPTION 'Escribe el motivo de la reapertura'; END IF;
  SELECT * INTO v_reserva FROM public.reservas
  WHERE id=p_reserva_id AND hotel_id=public.vulo_current_hotel_id() FOR UPDATE;
  IF NOT FOUND OR v_reserva.estado<>'CheckOut' OR NOT COALESCE(v_reserva.checkout_realizado,false) THEN
    RAISE EXCEPTION 'La reservación no tiene un check-out cerrado';
  END IF;
  SELECT (now() AT TIME ZONE COALESCE(timezone,'UTC'))::date INTO v_today
  FROM public.hotels WHERE id=v_reserva.hotel_id;
  IF p_new_checkout<=v_today THEN RAISE EXCEPTION 'La nueva salida debe ser posterior al día operativo'; END IF;
  IF p_new_room_id IS NULL OR NOT public.vulo_room_available_for_stay(
    v_reserva.hotel_id,p_new_room_id,v_reserva.id,v_today,p_new_checkout,false
  ) THEN RAISE EXCEPTION 'La habitación seleccionada ya no está disponible'; END IF;
  v_before:=to_jsonb(v_reserva);
  UPDATE public.reservas SET habitacion_id=p_new_room_id,
    tipo_habitacion_id=(SELECT tipo_habitacion_id FROM public.habitaciones WHERE id=p_new_room_id),
    fecha_checkout=p_new_checkout,checkout_realizado=false,estado='CheckIn',
    reabierta_at=now(),reabierta_por=auth.uid(),version_operativa=version_operativa+1,updated_at=now()
  WHERE id=p_reserva_id;
  UPDATE public.habitaciones SET estado_habitacion='Ocupada' WHERE id=p_new_room_id AND hotel_id=v_reserva.hotel_id;
  PERFORM public.recalculate_reservation_financials(p_reserva_id);
  INSERT INTO public.estancia_movimientos(hotel_id,reserva_id,operacion,motivo,datos_antes,datos_despues,
    metadata,usuario_id,usuario_email,usuario_nombre,reversible)
  SELECT v_reserva.hotel_id,p_reserva_id,'reopen_checkout',trim(p_motivo),v_before,to_jsonb(r),
    jsonb_build_object('new_room_id',p_new_room_id),auth.uid(),p.email,
    concat_ws(' ',p.nombre,p.apellido_paterno),false
  FROM public.reservas r LEFT JOIN public.profiles p ON p.id=auth.uid() WHERE r.id=p_reserva_id;
  RETURN jsonb_build_object('reservation',(SELECT to_jsonb(r) FROM public.reservas r WHERE r.id=p_reserva_id));
END;
$$;

REVOKE ALL ON FUNCTION public.vulo_reopen_checkout(uuid,date,uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vulo_reopen_checkout(uuid,date,uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.vulo_assign_deliverable(
  p_reserva_id uuid,
  p_entregable_id uuid,
  p_cantidad numeric DEFAULT 1
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE
  v_hotel_id uuid:=public.vulo_current_hotel_id();
  v_item public.entregables%ROWTYPE;
  v_assignment public.entregables_reserva%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR p_cantidad<=0 THEN RAISE EXCEPTION 'Cantidad de entregable no válida'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.reservas WHERE id=p_reserva_id AND hotel_id=v_hotel_id
    AND estado NOT IN ('Cancelada','NoShow','CheckOut')) THEN RAISE EXCEPTION 'La estancia no admite entregables'; END IF;
  SELECT * INTO v_item FROM public.entregables
  WHERE id=p_entregable_id AND hotel_id=v_hotel_id AND activo IS TRUE FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Entregable no encontrado o inactivo'; END IF;
  IF v_item.stock IS NOT NULL AND v_item.stock<p_cantidad THEN RAISE EXCEPTION 'Stock insuficiente de %',v_item.nombre; END IF;
  IF v_item.stock IS NOT NULL THEN UPDATE public.entregables SET stock=stock-p_cantidad WHERE id=v_item.id; END IF;
  INSERT INTO public.entregables_reserva(reserva_id,entregable_id,cantidad,devuelto,fecha_entrega)
  VALUES(p_reserva_id,p_entregable_id,p_cantidad,false,now()) RETURNING * INTO v_assignment;
  INSERT INTO public.auditoria(hotel_id,user_id,user_email,accion,entidad,entidad_id,descripcion,datos_despues)
  SELECT v_hotel_id,auth.uid(),p.email,'ASIGNAR','entregable_reserva',v_assignment.id,
    'Entregable asignado: '||v_item.nombre,to_jsonb(v_assignment) FROM public.profiles p WHERE p.id=auth.uid();
  RETURN to_jsonb(v_assignment);
END;
$$;

CREATE OR REPLACE FUNCTION public.vulo_return_deliverable(
  p_assignment_id uuid,
  p_cantidad_devuelta numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE
  v_hotel_id uuid:=public.vulo_current_hotel_id();
  v_assignment public.entregables_reserva%ROWTYPE;
  v_item public.entregables%ROWTYPE;
  v_before jsonb;
BEGIN
  IF auth.uid() IS NULL OR p_cantidad_devuelta<0 THEN RAISE EXCEPTION 'Cantidad devuelta no válida'; END IF;
  SELECT er.* INTO v_assignment FROM public.entregables_reserva er
  JOIN public.reservas r ON r.id=er.reserva_id
  WHERE er.id=p_assignment_id AND r.hotel_id=v_hotel_id FOR UPDATE OF er;
  IF NOT FOUND OR COALESCE(v_assignment.devuelto,false) THEN RAISE EXCEPTION 'El entregable no está pendiente'; END IF;
  IF p_cantidad_devuelta>COALESCE(v_assignment.cantidad,1) THEN RAISE EXCEPTION 'La devolución supera la cantidad entregada'; END IF;
  v_before:=to_jsonb(v_assignment);
  SELECT * INTO v_item FROM public.entregables WHERE id=v_assignment.entregable_id FOR UPDATE;
  IF v_item.stock IS NOT NULL THEN UPDATE public.entregables SET stock=stock+p_cantidad_devuelta WHERE id=v_item.id; END IF;
  UPDATE public.entregables_reserva SET cantidad_devuelta=p_cantidad_devuelta,
    devuelto=true,fecha_devolucion=now(),
    costo_faltante=GREATEST(0,COALESCE(v_assignment.cantidad,1)-p_cantidad_devuelta)*COALESCE(v_item.costo_reposicion,0)
  WHERE id=v_assignment.id RETURNING * INTO v_assignment;
  INSERT INTO public.auditoria(hotel_id,user_id,user_email,accion,entidad,entidad_id,descripcion,datos_antes,datos_despues)
  SELECT v_hotel_id,auth.uid(),p.email,'DEVOLVER','entregable_reserva',v_assignment.id,
    'Devolución de entregable: '||v_item.nombre,v_before,to_jsonb(v_assignment)
  FROM public.profiles p WHERE p.id=auth.uid();
  RETURN to_jsonb(v_assignment);
END;
$$;

REVOKE ALL ON FUNCTION public.vulo_assign_deliverable(uuid,uuid,numeric) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.vulo_return_deliverable(uuid,numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vulo_assign_deliverable(uuid,uuid,numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.vulo_return_deliverable(uuid,numeric) TO authenticated;
