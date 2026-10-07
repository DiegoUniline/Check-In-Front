CREATE OR REPLACE FUNCTION public.vulo_apply_stay_operation(p_reserva_id uuid, p_operacion text, p_payload jsonb DEFAULT '{}'::jsonb, p_motivo text DEFAULT ''::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_reserva public.reservas%ROWTYPE;
  v_after public.reservas%ROWTYPE;
  v_op text := lower(trim(COALESCE(p_operacion, '')));
  v_reason text := trim(COALESCE(p_motivo, ''));
  v_before jsonb;
  v_after_json jsonb;
  v_meta jsonb := COALESCE(p_payload, '{}'::jsonb);
  v_new_checkin date;
  v_new_checkout date;
  v_new_room uuid;
  v_old_room uuid;
  v_target_reservation uuid;
  v_charge public.cargos%ROWTYPE;
  v_payment public.pagos%ROWTYPE;
  v_guest public.reserva_huespedes%ROWTYPE;
  v_account_id uuid;
  v_movement_id uuid;
  v_is_active boolean;
  v_require_ready boolean;
  v_new_rate numeric;
  v_late_until timestamptz;
  v_hotel_today date;
  v_capacity integer;
  v_adults integer;
  v_children integer;
  v_extra_count integer;
  v_is_manager boolean := COALESCE(public.vulo_current_role(), '') IN ('SuperAdmin','Admin','Gerente');
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sesión no válida'; END IF;
  IF NOT public.vulo_operation_allowed(v_op) THEN
    RAISE EXCEPTION 'Tu rol no tiene permiso para realizar esta operación';
  END IF;
  PERFORM set_config('vulo.stay_operation',v_op,true);
  PERFORM set_config('vulo.stay_reason',v_reason,true);
  IF length(v_reason) < 3 AND v_op NOT IN ('add_guest','add_charge','partial_payment','split_account') THEN
    RAISE EXCEPTION 'Escribe el motivo de la operación';
  END IF;

  SELECT * INTO v_reserva FROM public.reservas
  WHERE id = p_reserva_id
    AND (hotel_id = public.vulo_current_hotel_id() OR public.vulo_is_superadmin())
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reserva no encontrada'; END IF;

  IF v_reserva.impuesto_hospedaje_porcentaje IS NULL THEN
    v_reserva.impuesto_hospedaje_porcentaje := CASE WHEN COALESCE(v_reserva.subtotal_hospedaje,0)>0
      THEN ROUND(COALESCE(v_reserva.total_impuestos,0)*100/v_reserva.subtotal_hospedaje,4) ELSE 0 END;
    UPDATE public.reservas SET impuesto_hospedaje_porcentaje=v_reserva.impuesto_hospedaje_porcentaje
    WHERE id=p_reserva_id;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_reserva.hotel_id::text || ':' || p_reserva_id::text, 0));
  v_before := to_jsonb(v_reserva);
  v_old_room := v_reserva.habitacion_id;
  v_is_active := COALESCE(v_reserva.checkin_realizado, false)
    AND NOT COALESCE(v_reserva.checkout_realizado, false)
    AND v_reserva.estado IN ('CheckIn', 'Hospedado');
  SELECT (now() AT TIME ZONE COALESCE(h.timezone, 'UTC'))::date INTO v_hotel_today
  FROM public.hotels h WHERE h.id = v_reserva.hotel_id;

  IF v_op IN ('extend_stay','early_departure','modify_dates','reservation_correction') THEN
    IF v_reserva.estado IN ('Cancelada','NoShow','CheckOut') THEN
      RAISE EXCEPTION 'La reservación cerrada no admite cambios de fechas';
    END IF;
    v_new_checkin := COALESCE(NULLIF(p_payload->>'new_checkin', '')::date, v_reserva.fecha_checkin);
    v_new_checkout := COALESCE(NULLIF(p_payload->>'new_checkout', '')::date, v_reserva.fecha_checkout);
    v_new_room := COALESCE(NULLIF(p_payload->>'new_room_id', '')::uuid, v_reserva.habitacion_id);

    IF v_op = 'extend_stay' AND v_new_checkout <= v_reserva.fecha_checkout THEN
      RAISE EXCEPTION 'La nueva salida debe ser posterior a la salida actual';
    END IF;
    IF v_op = 'early_departure' AND v_new_checkout >= v_reserva.fecha_checkout THEN
      RAISE EXCEPTION 'La salida anticipada debe ser anterior a la salida actual';
    END IF;
    IF v_is_active AND v_new_checkin <> v_reserva.fecha_checkin AND NOT v_is_manager THEN
      RAISE EXCEPTION 'Sólo gerencia puede corregir la fecha de entrada después del check-in';
    END IF;
    -- Se permiten estancias del día (entrada y salida en la misma fecha).
    IF v_new_checkout < v_new_checkin THEN
      RAISE EXCEPTION 'La fecha de salida no puede ser anterior a la entrada';
    END IF;
    IF v_is_active AND v_new_checkout < v_hotel_today THEN
      RAISE EXCEPTION 'La salida no puede quedar antes del día operativo';
    END IF;
    IF v_new_room IS NOT NULL AND NOT public.vulo_room_available_for_stay(
      v_reserva.hotel_id, v_new_room, v_reserva.id, v_new_checkin, v_new_checkout,
      v_is_active AND v_new_room IS DISTINCT FROM v_old_room
    ) THEN
      RAISE EXCEPTION 'La habitación no está disponible para el nuevo rango';
    END IF;

    IF v_new_room IS DISTINCT FROM v_old_room AND v_is_active THEN
      UPDATE public.habitaciones SET estado_habitacion = 'Disponible', estado_limpieza = 'Sucia'
      WHERE id = v_old_room AND hotel_id = v_reserva.hotel_id;
      UPDATE public.habitaciones SET estado_habitacion = 'Ocupada'
      WHERE id = v_new_room AND hotel_id = v_reserva.hotel_id;
    END IF;

    UPDATE public.reservas SET
      fecha_checkin = v_new_checkin,
      fecha_checkout = v_new_checkout,
      habitacion_id = v_new_room,
      tipo_habitacion_id = COALESCE(
        (SELECT tipo_habitacion_id FROM public.habitaciones WHERE id = v_new_room),
        tipo_habitacion_id
      ),
      version_operativa = version_operativa + 1,
      updated_at = now()
    WHERE id = p_reserva_id;

  ELSIF v_op IN ('room_change','category_change') THEN
    IF v_reserva.estado IN ('Cancelada','NoShow','CheckOut') THEN RAISE EXCEPTION 'La reservación está cerrada'; END IF;
    v_new_room := NULLIF(p_payload->>'new_room_id', '')::uuid;
    IF v_new_room IS NULL OR v_new_room = v_old_room THEN
      RAISE EXCEPTION 'Selecciona una habitación diferente';
    END IF;
    IF NOT public.vulo_room_available_for_stay(
      v_reserva.hotel_id, v_new_room, v_reserva.id,
      GREATEST(v_reserva.fecha_checkin, v_hotel_today), v_reserva.fecha_checkout, v_is_active
    ) THEN
      RAISE EXCEPTION 'La habitación destino no está disponible, limpia y operativa';
    END IF;
    v_new_rate := NULLIF(p_payload->>'new_rate', '')::numeric;
    IF v_new_rate IS NOT NULL AND NOT v_is_manager THEN
      RAISE EXCEPTION 'Sólo gerencia puede modificar la tarifa durante un cambio de categoría';
    END IF;
    IF v_new_rate IS NULL AND v_op = 'room_change' THEN
      v_new_rate := GREATEST(
        COALESCE(v_reserva.tarifa_noche, 0),
        COALESCE(public.vulo_nightly_rate(
          v_reserva.hotel_id,
          (SELECT tipo_habitacion_id FROM public.habitaciones WHERE id = v_new_room),
          v_new_room,
          GREATEST(v_reserva.fecha_checkin, v_hotel_today)
        ), 0)
      );
    END IF;

    IF v_is_active THEN
      UPDATE public.habitaciones SET estado_habitacion = 'Disponible', estado_limpieza = 'Sucia'
      WHERE id = v_old_room AND hotel_id = v_reserva.hotel_id;
      UPDATE public.habitaciones SET estado_habitacion = 'Ocupada'
      WHERE id = v_new_room AND hotel_id = v_reserva.hotel_id;
    END IF;
    UPDATE public.reservas SET
      habitacion_id = v_new_room,
      tipo_habitacion_id = (SELECT tipo_habitacion_id FROM public.habitaciones WHERE id = v_new_room),
      tarifa_noche = COALESCE(v_new_rate, tarifa_noche),
      version_operativa = version_operativa + 1,
      updated_at = now()
    WHERE id = p_reserva_id;

  ELSIF v_op = 'late_checkout' THEN
    IF NOT v_is_active THEN RAISE EXCEPTION 'El late check-out requiere una estancia activa'; END IF;
    v_late_until := NULLIF(p_payload->>'late_until', '')::timestamptz;
    IF v_late_until IS NULL THEN RAISE EXCEPTION 'Indica la nueva hora de salida'; END IF;
    IF v_reserva.habitacion_id IS NULL THEN RAISE EXCEPTION 'La estancia no tiene habitación asignada'; END IF;
    IF (v_late_until AT TIME ZONE (SELECT COALESCE(timezone,'UTC') FROM public.hotels WHERE id=v_reserva.hotel_id))::date
      <> v_reserva.fecha_checkout THEN RAISE EXCEPTION 'El late check-out debe quedar en la fecha de salida'; END IF;
    IF (v_late_until AT TIME ZONE (SELECT COALESCE(timezone,'UTC') FROM public.hotels WHERE id=v_reserva.hotel_id))::time
      <= COALESCE((SELECT hora_checkout FROM public.hotels WHERE id=v_reserva.hotel_id),'11:00')::time THEN
      RAISE EXCEPTION 'La hora indicada no corresponde a un late check-out';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.reservas r
      JOIN public.hotels h ON h.id = v_reserva.hotel_id
      WHERE r.hotel_id = v_reserva.hotel_id AND r.habitacion_id = v_reserva.habitacion_id
        AND r.id <> v_reserva.id AND r.estado IN ('Pendiente','Confirmada','CheckIn','Hospedado')
        AND r.fecha_checkin = v_reserva.fecha_checkout
        AND (v_late_until AT TIME ZONE COALESCE(h.timezone, 'UTC'))::time >= COALESCE(h.hora_checkin, '15:00')::time
    ) THEN
      RAISE EXCEPTION 'El late check-out entra en conflicto con la siguiente llegada';
    END IF;
    UPDATE public.reservas SET late_checkout_until = v_late_until,
      hora_checkout = (v_late_until AT TIME ZONE (SELECT COALESCE(timezone,'UTC') FROM public.hotels WHERE id = v_reserva.hotel_id))::time,
      version_operativa = version_operativa + 1, updated_at = now()
    WHERE id = p_reserva_id;
    IF COALESCE(NULLIF(p_payload->>'charge_amount','')::numeric, 0) > 0 THEN
      INSERT INTO public.cargos(hotel_id,reserva_id,habitacion_id,concepto,cantidad,precio_unitario,subtotal,total,notas)
      VALUES(v_reserva.hotel_id,p_reserva_id,v_reserva.habitacion_id,'Late check-out',1,
        NULLIF(p_payload->>'charge_amount','')::numeric,NULLIF(p_payload->>'charge_amount','')::numeric,
        NULLIF(p_payload->>'charge_amount','')::numeric,v_reason)
      RETURNING * INTO v_charge;
      v_meta:=v_meta||jsonb_build_object('charge_id',v_charge.id);
    END IF;

  ELSIF v_op = 'early_checkin' THEN
    IF v_reserva.estado IN ('Cancelada','NoShow','CheckOut') OR COALESCE(v_reserva.checkin_realizado,false) THEN
      RAISE EXCEPTION 'La reserva no admite early check-in';
    END IF;
    -- Llegada anticipada: la estancia inicia hoy (se recalcula la noche extra).
    IF v_reserva.fecha_checkin > v_hotel_today THEN
      UPDATE public.reservas SET fecha_checkin=v_hotel_today WHERE id=p_reserva_id;
      v_reserva.fecha_checkin := v_hotel_today;
    END IF;
    v_new_room := COALESCE(NULLIF(p_payload->>'new_room_id', '')::uuid, v_reserva.habitacion_id);
    IF v_new_room IS NULL OR NOT public.vulo_room_available_for_stay(
      v_reserva.hotel_id, v_new_room, v_reserva.id, v_reserva.fecha_checkin, v_reserva.fecha_checkout, true
    ) THEN
      RAISE EXCEPTION 'La habitación no está disponible, limpia y lista';
    END IF;
    UPDATE public.reservas SET habitacion_id = v_new_room,
      tipo_habitacion_id = (SELECT tipo_habitacion_id FROM public.habitaciones WHERE id = v_new_room),
      checkin_realizado = true, estado = 'CheckIn', early_checkin_at = now(),
      version_operativa = version_operativa + 1, updated_at = now()
    WHERE id = p_reserva_id;
    UPDATE public.habitaciones SET estado_habitacion = 'Ocupada'
    WHERE id = v_new_room AND hotel_id = v_reserva.hotel_id;
    IF COALESCE(NULLIF(p_payload->>'charge_amount','')::numeric, 0) > 0 THEN
      INSERT INTO public.cargos(hotel_id,reserva_id,habitacion_id,concepto,cantidad,precio_unitario,subtotal,total,notas)
      VALUES(v_reserva.hotel_id,p_reserva_id,v_new_room,'Early check-in',1,
        NULLIF(p_payload->>'charge_amount','')::numeric,NULLIF(p_payload->>'charge_amount','')::numeric,
        NULLIF(p_payload->>'charge_amount','')::numeric,v_reason);
    END IF;

  ELSIF v_op = 'add_guest' THEN
    IF NOT v_is_active THEN RAISE EXCEPTION 'Sólo se agregan acompañantes a una estancia activa'; END IF;
    IF length(trim(COALESCE(p_payload->>'name',''))) < 2 THEN RAISE EXCEPTION 'Escribe el nombre del huésped'; END IF;
    INSERT INTO public.reserva_huespedes(
      hotel_id,reserva_id,nombre,apellido_paterno,tipo,documento,
      genera_cargo,cargo_por_noche,created_by
    ) VALUES (
      v_reserva.hotel_id,p_reserva_id,trim(p_payload->>'name'),NULLIF(trim(p_payload->>'last_name'),''),
      COALESCE(NULLIF(p_payload->>'guest_type',''),'Adulto'),NULLIF(trim(p_payload->>'document'),''),
      COALESCE(NULLIF(p_payload->>'generates_charge','')::boolean,false),
      GREATEST(0,COALESCE(NULLIF(p_payload->>'charge_per_night','')::numeric,0)),auth.uid()
    ) RETURNING * INTO v_guest;

    SELECT COALESCE(t.capacidad_maxima, t.capacidad_adultos + t.capacidad_ninos, 1),
      1 + count(*) FILTER (WHERE rh.tipo = 'Adulto'),
      count(*) FILTER (WHERE rh.tipo = 'Menor')
    INTO v_capacity, v_adults, v_children
    FROM public.reservas r
    LEFT JOIN public.tipos_habitacion t ON t.id = r.tipo_habitacion_id
    LEFT JOIN public.reserva_huespedes rh ON rh.reserva_id = r.id AND rh.activo
    WHERE r.id = p_reserva_id
    GROUP BY t.capacidad_maxima,t.capacidad_adultos,t.capacidad_ninos;
    IF v_adults + v_children > v_capacity THEN
      RAISE EXCEPTION 'Se excede la capacidad máxima de la habitación (%)', v_capacity;
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.reservas r JOIN public.tipos_habitacion t ON t.id = r.tipo_habitacion_id
      WHERE r.id = p_reserva_id
        AND ((t.capacidad_adultos IS NOT NULL AND v_adults > t.capacidad_adultos)
          OR (t.capacidad_ninos IS NOT NULL AND v_children > t.capacidad_ninos))
    ) THEN RAISE EXCEPTION 'La distribución de adultos y menores excede la capacidad configurada'; END IF;

    SELECT count(*), COALESCE(avg(cargo_por_noche),0) INTO v_extra_count,v_new_rate
    FROM public.reserva_huespedes WHERE reserva_id=p_reserva_id AND activo AND genera_cargo;
    UPDATE public.reservas SET adultos=v_adults,ninos=v_children,personas_extra=v_extra_count,
      cargo_persona_extra=CASE WHEN v_extra_count>0 THEN v_new_rate ELSE cargo_persona_extra END,
      version_operativa=version_operativa+1,updated_at=now() WHERE id=p_reserva_id;
    v_meta := v_meta || jsonb_build_object('guest_id',v_guest.id);

  ELSIF v_op = 'remove_guest' THEN
    IF NOT v_is_active THEN RAISE EXCEPTION 'Sólo se retiran acompañantes de una estancia activa'; END IF;
    SELECT * INTO v_guest FROM public.reserva_huespedes
    WHERE id=NULLIF(p_payload->>'guest_id','')::uuid AND reserva_id=p_reserva_id AND activo FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Huésped adicional no encontrado'; END IF;
    UPDATE public.reserva_huespedes SET activo=false,retirado_at=now(),retirado_por=auth.uid(),motivo_retiro=v_reason
    WHERE id=v_guest.id;
    SELECT 1 + count(*) FILTER (WHERE tipo='Adulto'),count(*) FILTER (WHERE tipo='Menor'),
      count(*) FILTER (WHERE genera_cargo),COALESCE(avg(cargo_por_noche) FILTER (WHERE genera_cargo),0)
    INTO v_adults,v_children,v_extra_count,v_new_rate
    FROM public.reserva_huespedes WHERE reserva_id=p_reserva_id AND activo;
    UPDATE public.reservas SET adultos=v_adults,ninos=v_children,personas_extra=v_extra_count,
      cargo_persona_extra=CASE WHEN v_extra_count>0 THEN v_new_rate ELSE cargo_persona_extra END,
      version_operativa=version_operativa+1,updated_at=now() WHERE id=p_reserva_id;
    v_meta := v_meta || jsonb_build_object('guest_id',v_guest.id,'guest_before',to_jsonb(v_guest));

  ELSIF v_op = 'room_out_of_service' THEN
    IF v_old_room IS NULL THEN RAISE EXCEPTION 'La reservación no tiene habitación asignada'; END IF;
    v_new_room := NULLIF(p_payload->>'new_room_id','')::uuid;
    IF v_reserva.estado IN ('Pendiente','Confirmada','CheckIn','Hospedado') THEN
      IF v_new_room IS NULL THEN RAISE EXCEPTION 'Reasigna la reservación antes de bloquear su habitación'; END IF;
      IF NOT public.vulo_room_available_for_stay(v_reserva.hotel_id,v_new_room,v_reserva.id,
        CASE WHEN v_is_active THEN GREATEST(v_reserva.fecha_checkin,v_hotel_today) ELSE v_reserva.fecha_checkin END,
        v_reserva.fecha_checkout,v_is_active) THEN
        RAISE EXCEPTION 'La habitación de reubicación no está operativa o disponible';
      END IF;
      IF v_is_active THEN
        UPDATE public.habitaciones SET estado_habitacion='Ocupada' WHERE id=v_new_room AND hotel_id=v_reserva.hotel_id;
      END IF;
      UPDATE public.reservas SET habitacion_id=v_new_room,
        tipo_habitacion_id=(SELECT tipo_habitacion_id FROM public.habitaciones WHERE id=v_new_room),
        version_operativa=version_operativa+1,updated_at=now() WHERE id=p_reserva_id;
    END IF;
    UPDATE public.habitaciones SET estado_habitacion='FueraDeServicio',estado_mantenimiento='Pendiente',
      fuera_servicio_motivo=v_reason,fuera_servicio_desde=now(),
      fuera_servicio_hasta=NULLIF(p_payload->>'blocked_until','')::timestamptz
    WHERE id=v_old_room AND hotel_id=v_reserva.hotel_id;
    INSERT INTO public.tareas_mantenimiento(hotel_id,habitacion_id,titulo,descripcion,estado,prioridad,tipo,fecha_reporte)
    VALUES(v_reserva.hotel_id,v_old_room,'Habitación fuera de servicio',v_reason,'Pendiente',
      COALESCE(NULLIF(p_payload->>'priority',''),'Alta'),'Fuera de servicio',now());
    v_meta := v_meta || jsonb_build_object('blocked_room_id',v_old_room,'relocated_to',v_new_room);

  ELSIF v_op = 'rate_change' THEN
    IF NOT v_is_manager THEN RAISE EXCEPTION 'Sólo gerencia puede modificar tarifas'; END IF;
    v_new_rate := NULLIF(p_payload->>'new_rate','')::numeric;
    IF v_new_rate IS NULL OR v_new_rate < 0 THEN RAISE EXCEPTION 'Indica una tarifa válida'; END IF;
    UPDATE public.reservas SET tarifa_noche=v_new_rate,version_operativa=version_operativa+1,updated_at=now()
    WHERE id=p_reserva_id;

  ELSIF v_op = 'discount_change' THEN
    IF NOT v_is_manager THEN RAISE EXCEPTION 'Sólo gerencia puede aplicar descuentos o cortesías'; END IF;
    IF COALESCE(p_payload->>'discount_type','') NOT IN ('none','Monto','Porcentaje','Cortesia') THEN
      RAISE EXCEPTION 'Tipo de descuento no válido';
    END IF;
    IF p_payload->>'discount_type'='Porcentaje' AND COALESCE(NULLIF(p_payload->>'discount_value','')::numeric,0)>100 THEN
      RAISE EXCEPTION 'El descuento porcentual no puede superar 100%%';
    END IF;
    UPDATE public.reservas SET
      descuento_tipo=CASE WHEN p_payload->>'discount_type'='Cortesia' THEN 'Porcentaje'
        WHEN p_payload->>'discount_type'='none' THEN NULL ELSE p_payload->>'discount_type' END,
      descuento_valor=CASE WHEN p_payload->>'discount_type'='Cortesia' THEN 100
        WHEN p_payload->>'discount_type'='none' THEN 0 ELSE GREATEST(0,COALESCE(NULLIF(p_payload->>'discount_value','')::numeric,0)) END,
      version_operativa=version_operativa+1,updated_at=now()
    WHERE id=p_reserva_id;

  ELSIF v_op = 'add_charge' THEN
    IF COALESCE(NULLIF(p_payload->>'amount','')::numeric,0) < 0 OR COALESCE(NULLIF(p_payload->>'quantity','')::numeric,1) <= 0 THEN
      RAISE EXCEPTION 'Cantidad o importe no válido';
    END IF;
    INSERT INTO public.cargos(hotel_id,reserva_id,habitacion_id,concepto,concepto_id,cantidad,precio_unitario,impuesto,notas)
    VALUES(v_reserva.hotel_id,p_reserva_id,v_reserva.habitacion_id,COALESCE(NULLIF(p_payload->>'concept',''),'Cargo adicional'),
      NULLIF(p_payload->>'concept_id','')::uuid,COALESCE(NULLIF(p_payload->>'quantity','')::numeric,1),
      COALESCE(NULLIF(p_payload->>'amount','')::numeric,0),GREATEST(0,COALESCE(NULLIF(p_payload->>'tax','')::numeric,0)),NULLIF(p_payload->>'notes',''))
    RETURNING * INTO v_charge;
    v_meta := v_meta || jsonb_build_object('charge_id',v_charge.id);

  ELSIF v_op IN ('update_charge','cancel_charge','restore_charge','transfer_charge') THEN
    IF NOT v_is_manager THEN RAISE EXCEPTION 'Sólo gerencia puede corregir, cancelar o trasladar cargos'; END IF;
    SELECT * INTO v_charge FROM public.cargos
    WHERE id=NULLIF(p_payload->>'charge_id','')::uuid AND reserva_id=p_reserva_id AND hotel_id=v_reserva.hotel_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Cargo no encontrado'; END IF;
    IF v_op<>'restore_charge' AND COALESCE(v_charge.estado,'Activo')<>'Activo' THEN
      RAISE EXCEPTION 'El cargo está cancelado';
    END IF;
    v_meta := v_meta || jsonb_build_object('charge_before',to_jsonb(v_charge));
    IF v_op='update_charge' THEN
      UPDATE public.cargos SET concepto=COALESCE(NULLIF(p_payload->>'concept',''),concepto),
        cantidad=COALESCE(NULLIF(p_payload->>'quantity','')::numeric,cantidad),
        precio_unitario=COALESCE(NULLIF(p_payload->>'amount','')::numeric,precio_unitario),
        impuesto=COALESCE(NULLIF(p_payload->>'tax','')::numeric,impuesto),
        notas=COALESCE(p_payload->>'notes',notas),actualizado_at=now(),actualizado_por=auth.uid()
      WHERE id=v_charge.id;
    ELSIF v_op='cancel_charge' THEN
      UPDATE public.cargos SET estado='Cancelado',cancelado_at=now(),cancelado_por=auth.uid(),
        motivo_cancelacion=v_reason,actualizado_at=now(),actualizado_por=auth.uid() WHERE id=v_charge.id;
    ELSIF v_op='restore_charge' THEN
      IF COALESCE(v_charge.estado,'Activo')<>'Cancelado' THEN RAISE EXCEPTION 'El cargo no está cancelado'; END IF;
      UPDATE public.cargos SET estado='Activo',cancelado_at=NULL,cancelado_por=NULL,
        motivo_cancelacion=NULL,actualizado_at=now(),actualizado_por=auth.uid() WHERE id=v_charge.id;
    ELSE
      v_target_reservation := NULLIF(p_payload->>'target_reservation_id','')::uuid;
      IF NOT EXISTS(SELECT 1 FROM public.reservas WHERE id=v_target_reservation AND hotel_id=v_reserva.hotel_id
        AND estado NOT IN ('Cancelada','NoShow')) THEN RAISE EXCEPTION 'La cuenta destino no es válida'; END IF;
      UPDATE public.cargos SET reserva_id=v_target_reservation,
        habitacion_id=(SELECT habitacion_id FROM public.reservas WHERE id=v_target_reservation),
        cuenta_estancia_id=NULL,notas=concat_ws(' · ',NULLIF(notas,''),'Trasladado: '||v_reason),
        actualizado_at=now(),actualizado_por=auth.uid() WHERE id=v_charge.id;
      v_meta := v_meta || jsonb_build_object('target_reservation_id',v_target_reservation);
    END IF;

  ELSIF v_op IN ('payment_method_change','cancel_payment','restore_payment') THEN
    IF NOT v_is_manager THEN RAISE EXCEPTION 'Sólo gerencia puede corregir la forma de pago'; END IF;
    SELECT * INTO v_payment FROM public.pagos
    WHERE id=NULLIF(p_payload->>'payment_id','')::uuid AND reserva_id=p_reserva_id
      AND hotel_id=v_reserva.hotel_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Pago no encontrado'; END IF;
    IF v_op='payment_method_change' AND length(trim(COALESCE(p_payload->>'payment_method',''))) < 2 THEN
      RAISE EXCEPTION 'Selecciona una forma de pago válida';
    END IF;
    v_meta := v_meta || jsonb_build_object('payment_before',to_jsonb(v_payment));
    IF v_op='cancel_payment' THEN
      IF COALESCE(v_payment.estado,'Activo')<>'Activo' THEN RAISE EXCEPTION 'El pago ya está cancelado'; END IF;
      UPDATE public.pagos SET estado='Cancelado',actualizado_at=now(),actualizado_por=auth.uid(),motivo_cambio=v_reason
      WHERE id=v_payment.id;
    ELSIF v_op='restore_payment' THEN
      IF COALESCE(v_payment.estado,'Activo')<>'Cancelado' THEN RAISE EXCEPTION 'El pago no está cancelado'; END IF;
      UPDATE public.pagos SET estado='Activo',actualizado_at=now(),actualizado_por=auth.uid(),motivo_cambio=v_reason
      WHERE id=v_payment.id;
    ELSE
      UPDATE public.pagos SET metodo_pago=trim(p_payload->>'payment_method'),
        referencia=COALESCE(NULLIF(trim(p_payload->>'reference'),''),referencia),
        actualizado_at=now(),actualizado_por=auth.uid(),motivo_cambio=v_reason
      WHERE id=v_payment.id;
    END IF;

  ELSIF v_op = 'partial_payment' THEN
    IF COALESCE(NULLIF(p_payload->>'amount','')::numeric,0) <= 0 THEN
      RAISE EXCEPTION 'El abono debe ser mayor a cero';
    END IF;
    PERFORM public.recalculate_reservation_financials(p_reserva_id);
    SELECT * INTO v_reserva FROM public.reservas WHERE id=p_reserva_id FOR UPDATE;
    IF NULLIF(p_payload->>'amount','')::numeric > COALESCE(v_reserva.saldo_pendiente,0) + 0.009 THEN
      RAISE EXCEPTION 'El abono excede el saldo pendiente';
    END IF;
    v_account_id := NULLIF(p_payload->>'account_id','')::uuid;
    IF v_account_id IS NOT NULL AND NOT EXISTS(
      SELECT 1 FROM public.cuentas_estancia WHERE id=v_account_id AND reserva_id=p_reserva_id AND estado='Abierta'
    ) THEN RAISE EXCEPTION 'La subcuenta no es válida'; END IF;
    INSERT INTO public.pagos(hotel_id,reserva_id,monto,metodo_pago,referencia,concepto,notas,cuenta_estancia_id)
    VALUES(v_reserva.hotel_id,p_reserva_id,NULLIF(p_payload->>'amount','')::numeric,
      COALESCE(NULLIF(trim(p_payload->>'payment_method'),''),'Efectivo'),NULLIF(trim(p_payload->>'reference'),''),
      COALESCE(NULLIF(trim(p_payload->>'concept'),''),'Abono a estancia'),NULLIF(trim(p_payload->>'notes'),''),v_account_id)
    RETURNING * INTO v_payment;
    v_meta := v_meta || jsonb_build_object('payment_id',v_payment.id);

  ELSIF v_op = 'split_account' THEN
    IF length(trim(COALESCE(p_payload->>'name',''))) < 2 THEN RAISE EXCEPTION 'Nombra la nueva subcuenta'; END IF;
    INSERT INTO public.cuentas_estancia(hotel_id,reserva_id,nombre,responsable,created_by)
    VALUES(v_reserva.hotel_id,p_reserva_id,trim(p_payload->>'name'),NULLIF(trim(p_payload->>'responsible'),''),auth.uid())
    RETURNING id INTO v_account_id;
    UPDATE public.cargos SET cuenta_estancia_id=v_account_id,actualizado_at=now(),actualizado_por=auth.uid()
    WHERE reserva_id=p_reserva_id AND hotel_id=v_reserva.hotel_id
      AND id IN (SELECT value::text::uuid FROM jsonb_array_elements_text(COALESCE(p_payload->'charge_ids','[]'::jsonb)));
    UPDATE public.pagos SET cuenta_estancia_id=v_account_id,actualizado_at=now(),actualizado_por=auth.uid(),motivo_cambio=v_reason
    WHERE reserva_id=p_reserva_id AND hotel_id=v_reserva.hotel_id
      AND id IN (SELECT value::text::uuid FROM jsonb_array_elements_text(COALESCE(p_payload->'payment_ids','[]'::jsonb)));
    v_meta := v_meta || jsonb_build_object('account_id',v_account_id);

  ELSIF v_op = 'move_to_account' THEN
    v_account_id := NULLIF(p_payload->>'account_id','')::uuid;
    IF v_account_id IS NOT NULL AND NOT EXISTS(
      SELECT 1 FROM public.cuentas_estancia WHERE id=v_account_id AND reserva_id=p_reserva_id AND estado='Abierta'
    ) THEN RAISE EXCEPTION 'La subcuenta destino no es válida'; END IF;
    UPDATE public.cargos SET cuenta_estancia_id=v_account_id,actualizado_at=now(),actualizado_por=auth.uid()
    WHERE reserva_id=p_reserva_id AND hotel_id=v_reserva.hotel_id
      AND id IN (SELECT value::text::uuid FROM jsonb_array_elements_text(COALESCE(p_payload->'charge_ids','[]'::jsonb)));
    UPDATE public.pagos SET cuenta_estancia_id=v_account_id,actualizado_at=now(),actualizado_por=auth.uid(),motivo_cambio=v_reason
    WHERE reserva_id=p_reserva_id AND hotel_id=v_reserva.hotel_id
      AND id IN (SELECT value::text::uuid FROM jsonb_array_elements_text(COALESCE(p_payload->'payment_ids','[]'::jsonb)));

  ELSIF v_op IN ('no_show','cancel_reservation') THEN
    IF COALESCE(v_reserva.checkout_realizado,false) OR v_reserva.estado IN ('Cancelada','NoShow','CheckOut') THEN
      RAISE EXCEPTION 'La reservación ya está cerrada';
    END IF;
    IF v_op='no_show' AND v_is_active THEN
      RAISE EXCEPTION 'Una estancia iniciada no puede marcarse como no-show';
    END IF;
    IF v_op='cancel_reservation' THEN
      -- Anula pagos activos de turnos abiertos (o sin turno) para que el corte se actualice.
      WITH anulados AS (
        UPDATE public.pagos pg SET estado='Cancelado',cancelado_at=now(),cancelado_por=auth.uid(),
          actualizado_at=now(),actualizado_por=auth.uid(),motivo_cambio='Reserva cancelada: '||v_reason
        WHERE pg.reserva_id=p_reserva_id AND pg.hotel_id=v_reserva.hotel_id
          AND COALESCE(pg.estado,'Activo')<>'Cancelado'
          AND (pg.turno_id IS NULL OR EXISTS(SELECT 1 FROM public.turnos_operativos t WHERE t.id=pg.turno_id AND t.estado='Abierto'))
        RETURNING pg.id,pg.turno_id,pg.monto
      )
      SELECT v_meta || jsonb_build_object('pagos_anulados',COUNT(*),'monto_anulado',COALESCE(SUM(monto),0),
        'turnos',COALESCE(jsonb_agg(DISTINCT turno_id) FILTER (WHERE turno_id IS NOT NULL),'[]'::jsonb))
      INTO v_meta FROM anulados;
      IF v_is_active AND v_reserva.habitacion_id IS NOT NULL THEN
        UPDATE public.habitaciones SET estado_habitacion='Disponible',estado_limpieza='Sucia'
        WHERE id=v_reserva.habitacion_id AND hotel_id=v_reserva.hotel_id;
      END IF;
    END IF;
    UPDATE public.reservas SET estado=CASE WHEN v_op='no_show' THEN 'NoShow' ELSE 'Cancelada' END,
      notas_internas=concat_ws(E'\n',NULLIF(notas_internas,''),
        CASE WHEN v_op='no_show' THEN 'No-show: ' ELSE 'Cancelación: ' END || v_reason),
      motivo_cancelacion=CASE WHEN v_op='cancel_reservation' THEN v_reason ELSE motivo_cancelacion END,
      version_operativa=version_operativa+1,updated_at=now()
    WHERE id=p_reserva_id;

  ELSIF v_op = 'consecutive_reservation' THEN
    v_target_reservation := NULLIF(p_payload->>'next_reservation_id','')::uuid;
    IF NOT EXISTS(
      SELECT 1 FROM public.reservas next_r
      WHERE next_r.id=v_target_reservation AND next_r.hotel_id=v_reserva.hotel_id
        AND next_r.id<>p_reserva_id AND next_r.cliente_id=v_reserva.cliente_id
        AND next_r.fecha_checkin>=v_reserva.fecha_checkout
        AND next_r.estado NOT IN ('Cancelada','NoShow')
    ) THEN RAISE EXCEPTION 'La reservación consecutiva debe ser posterior y del mismo huésped'; END IF;
    UPDATE public.reservas SET reserva_anterior_id=p_reserva_id,
      version_operativa=version_operativa+1,updated_at=now() WHERE id=v_target_reservation;
    v_meta := v_meta || jsonb_build_object('next_reservation_id',v_target_reservation);

  ELSIF v_op = 'reopen_checkout' THEN
    IF NOT v_is_manager THEN RAISE EXCEPTION 'Sólo gerencia puede reabrir un check-out'; END IF;
    IF v_reserva.estado<>'CheckOut' OR NOT COALESCE(v_reserva.checkout_realizado,false) THEN
      RAISE EXCEPTION 'La reservación no tiene un check-out cerrado';
    END IF;
    v_new_checkout := COALESCE(NULLIF(p_payload->>'new_checkout','')::date,v_hotel_today+1);
    IF v_new_checkout<=v_hotel_today THEN RAISE EXCEPTION 'La nueva salida debe ser posterior al día operativo'; END IF;
    IF v_reserva.habitacion_id IS NULL OR NOT public.vulo_room_available_for_stay(
      v_reserva.hotel_id,v_reserva.habitacion_id,v_reserva.id,v_hotel_today,v_new_checkout,false
    ) THEN RAISE EXCEPTION 'La habitación ya está comprometida; reubica antes de reabrir'; END IF;
    UPDATE public.reservas SET fecha_checkout=v_new_checkout,checkout_realizado=false,estado='CheckIn',
      reabierta_at=now(),reabierta_por=auth.uid(),version_operativa=version_operativa+1,updated_at=now()
    WHERE id=p_reserva_id;
    UPDATE public.habitaciones SET estado_habitacion='Ocupada'
    WHERE id=v_reserva.habitacion_id AND hotel_id=v_reserva.hotel_id;

  ELSIF v_op = 'correction_note' THEN
    UPDATE public.reservas SET notas_internas=concat_ws(E'\n',NULLIF(notas_internas,''),'Corrección operativa: '||v_reason),
      version_operativa=version_operativa+1,updated_at=now() WHERE id=p_reserva_id;

  ELSE
    RAISE EXCEPTION 'Operación de estancia no reconocida';
  END IF;

  PERFORM public.recalculate_reservation_financials(p_reserva_id);
  SELECT * INTO v_after FROM public.reservas WHERE id=p_reserva_id;
  v_after_json := to_jsonb(v_after);

  INSERT INTO public.estancia_movimientos(
    hotel_id,reserva_id,operacion,motivo,datos_antes,datos_despues,metadata,
    usuario_id,usuario_email,usuario_nombre,reversible
  )
  SELECT v_reserva.hotel_id,p_reserva_id,v_op,COALESCE(NULLIF(v_reason,''),'Operación registrada'),
    v_before,v_after_json,v_meta,auth.uid(),p.email,
    concat_ws(' ',p.nombre,p.apellido_paterno),
    v_op=ANY(ARRAY['extend_stay','early_departure','modify_dates','reservation_correction',
      'room_change','category_change','late_checkout','rate_change','discount_change',
      'no_show'])
  FROM public.profiles p WHERE p.id=auth.uid()
  RETURNING id INTO v_movement_id;

  INSERT INTO public.auditoria(hotel_id,user_id,user_email,accion,entidad,entidad_id,descripcion,datos_antes,datos_despues)
  SELECT v_reserva.hotel_id,auth.uid(),p.email,'ESTANCIA_'||upper(v_op),'reserva',p_reserva_id,
    COALESCE(NULLIF(v_reason,''),'Operación registrada'),v_before,v_after_json
  FROM public.profiles p WHERE p.id=auth.uid();

  RETURN jsonb_build_object('reservation',v_after_json,'movement_id',v_movement_id,'metadata',v_meta);
END;
$function$;

SELECT 'CANCELACION CON CORTE APLICADA' AS resultado;
