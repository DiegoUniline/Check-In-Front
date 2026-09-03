-- Reporte automático y persistente para entrega y cierre de turno VULO.
-- Conserva la conciliación financiera del servidor y evita pedir al usuario
-- que vuelva a redactar información que el sistema ya conoce.

ALTER TABLE public.turnos_operativos
  ADD COLUMN IF NOT EXISTS entrega_a_usuario_id uuid,
  ADD COLUMN IF NOT EXISTS reporte_cierre jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'turnos_entrega_usuario_fkey') THEN
    ALTER TABLE public.turnos_operativos
      ADD CONSTRAINT turnos_entrega_usuario_fkey
      FOREIGN KEY (entrega_a_usuario_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.turno_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  turno_id uuid NOT NULL REFERENCES public.turnos_operativos(id) ON DELETE CASCADE,
  usuario_id uuid,
  tipo text NOT NULL,
  reserva_id uuid REFERENCES public.reservas(id) ON DELETE SET NULL,
  detalle jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS turno_eventos_turno_idx
  ON public.turno_eventos(turno_id, created_at);

ALTER TABLE public.turno_eventos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hotel_turno_eventos_select" ON public.turno_eventos;
DROP POLICY IF EXISTS "hotel_turno_eventos_insert" ON public.turno_eventos;
CREATE POLICY "hotel_turno_eventos_select" ON public.turno_eventos FOR SELECT TO authenticated
  USING (hotel_id = public.vulo_current_hotel_id() OR public.vulo_is_superadmin());
CREATE POLICY "hotel_turno_eventos_insert" ON public.turno_eventos FOR INSERT TO authenticated
  WITH CHECK (hotel_id = public.vulo_current_hotel_id() OR public.vulo_is_superadmin());

CREATE OR REPLACE FUNCTION public.vulo_capture_reception_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shift uuid;
  v_detail jsonb;
BEGIN
  v_shift := public.vulo_assert_open_shift(NEW.hotel_id);
  IF v_shift IS NULL THEN RETURN NEW; END IF;

  v_detail := jsonb_build_object(
    'numero_reserva', NEW.numero_reserva,
    'cliente_id', NEW.cliente_id,
    'habitacion_id', NEW.habitacion_id,
    'estado', NEW.estado,
    'total', COALESCE(NEW.total,0)
  );

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.turno_eventos(hotel_id,turno_id,usuario_id,tipo,reserva_id,detalle)
    VALUES(NEW.hotel_id,v_shift,auth.uid(),'reserva_creada',NEW.id,v_detail);
    IF COALESCE(NEW.checkin_realizado,false) THEN
      INSERT INTO public.turno_eventos(hotel_id,turno_id,usuario_id,tipo,reserva_id,detalle)
      VALUES(NEW.hotel_id,v_shift,auth.uid(),'checkin',NEW.id,v_detail);
    END IF;
    RETURN NEW;
  END IF;

  IF NOT COALESCE(OLD.checkin_realizado,false) AND COALESCE(NEW.checkin_realizado,false) THEN
    INSERT INTO public.turno_eventos(hotel_id,turno_id,usuario_id,tipo,reserva_id,detalle)
    VALUES(NEW.hotel_id,v_shift,auth.uid(),'checkin',NEW.id,v_detail);
  END IF;
  IF NOT COALESCE(OLD.checkout_realizado,false) AND COALESCE(NEW.checkout_realizado,false) THEN
    INSERT INTO public.turno_eventos(hotel_id,turno_id,usuario_id,tipo,reserva_id,detalle)
    VALUES(NEW.hotel_id,v_shift,auth.uid(),'checkout',NEW.id,v_detail);
  END IF;
  IF OLD.estado IS DISTINCT FROM NEW.estado AND NEW.estado = 'Cancelada' THEN
    INSERT INTO public.turno_eventos(hotel_id,turno_id,usuario_id,tipo,reserva_id,detalle)
    VALUES(NEW.hotel_id,v_shift,auth.uid(),'cancelacion',NEW.id,v_detail);
  END IF;
  IF OLD.estado IS DISTINCT FROM NEW.estado AND lower(COALESCE(NEW.estado,'')) IN ('noshow','no_show','no show') THEN
    INSERT INTO public.turno_eventos(hotel_id,turno_id,usuario_id,tipo,reserva_id,detalle)
    VALUES(NEW.hotel_id,v_shift,auth.uid(),'no_show',NEW.id,v_detail);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS capture_reception_event ON public.reservas;
CREATE TRIGGER capture_reception_event
AFTER INSERT OR UPDATE ON public.reservas
FOR EACH ROW EXECUTE FUNCTION public.vulo_capture_reception_event();

CREATE OR REPLACE FUNCTION public.vulo_build_shift_report(p_turno_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shift public.turnos_operativos%ROWTYPE;
  v_today date;
  v_events jsonb := '[]'::jsonb;
  v_operations jsonb := '[]'::jsonb;
  v_payments jsonb := '[]'::jsonb;
  v_expenses jsonb := '[]'::jsonb;
  v_products jsonb := '[]'::jsonb;
  v_payment_methods jsonb := '[]'::jsonb;
  v_reservations integer := 0;
  v_checkins integer := 0;
  v_checkouts integer := 0;
  v_cancellations integer := 0;
  v_no_shows integer := 0;
  v_payment_total numeric := 0;
  v_expense_total numeric := 0;
  v_sales_total numeric := 0;
  v_sales_count integer := 0;
  v_occupied integer := 0;
  v_available integer := 0;
  v_dirty integer := 0;
  v_maintenance integer := 0;
  v_arrivals_pending integer := 0;
  v_departures_pending integer := 0;
BEGIN
  SELECT * INTO v_shift FROM public.turnos_operativos WHERE id=p_turno_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Turno no encontrado'; END IF;
  IF NOT public.vulo_is_superadmin() AND v_shift.hotel_id<>public.vulo_current_hotel_id() THEN
    RAISE EXCEPTION 'No tienes acceso a este turno';
  END IF;

  SELECT (now() AT TIME ZONE COALESCE(h.timezone,'UTC'))::date INTO v_today
  FROM public.hotels h WHERE h.id=v_shift.hotel_id;

  SELECT
    COUNT(*) FILTER (WHERE tipo='reserva_creada'),
    COUNT(*) FILTER (WHERE tipo='checkin'),
    COUNT(*) FILTER (WHERE tipo='checkout'),
    COUNT(*) FILTER (WHERE tipo='cancelacion'),
    COUNT(*) FILTER (WHERE tipo='no_show')
  INTO v_reservations,v_checkins,v_checkouts,v_cancellations,v_no_shows
  FROM public.turno_eventos WHERE turno_id=p_turno_id;

  SELECT COALESCE(jsonb_agg(item ORDER BY sort_at),'[]'::jsonb) INTO v_events
  FROM (
    SELECT e.created_at AS sort_at, jsonb_build_object(
      'id',e.id,'tipo',e.tipo,'fecha',e.created_at,
      'reserva',COALESCE(r.numero_reserva,e.detalle->>'numero_reserva'),
      'huesped',trim(concat_ws(' ',c.nombre,c.apellido_paterno)),
      'habitacion',h.numero,'total',COALESCE(r.total,(e.detalle->>'total')::numeric,0)
    ) AS item
    FROM public.turno_eventos e
    LEFT JOIN public.reservas r ON r.id=e.reserva_id
    LEFT JOIN public.clientes c ON c.id=r.cliente_id
    LEFT JOIN public.habitaciones h ON h.id=r.habitacion_id
    WHERE e.turno_id=p_turno_id
  ) reception_rows;

  SELECT COALESCE(jsonb_agg(item ORDER BY sort_at),'[]'::jsonb) INTO v_operations
  FROM (
    SELECT m.created_at AS sort_at, jsonb_build_object(
      'id',m.id,'operacion',m.operacion,'motivo',m.motivo,'fecha',m.created_at,
      'reserva',r.numero_reserva
    ) AS item
    FROM public.estancia_movimientos m
    LEFT JOIN public.reservas r ON r.id=m.reserva_id
    WHERE m.turno_id=p_turno_id AND NOT COALESCE(m.revertido,false)
  ) operation_rows;

  SELECT COALESCE(SUM(p.monto),0), COALESCE(jsonb_agg(jsonb_build_object(
    'id',p.id,'fecha',COALESCE(p.fecha,p.created_at),'monto',p.monto,
    'metodo',COALESCE(p.metodo_pago,'Otro'),'concepto',COALESCE(p.concepto,'Pago'),
    'reserva',r.numero_reserva,'huesped',trim(concat_ws(' ',c.nombre,c.apellido_paterno))
  ) ORDER BY COALESCE(p.fecha,p.created_at)),'[]'::jsonb)
  INTO v_payment_total,v_payments
  FROM public.pagos p
  LEFT JOIN public.reservas r ON r.id=p.reserva_id
  LEFT JOIN public.clientes c ON c.id=r.cliente_id
  WHERE p.turno_id=p_turno_id AND COALESCE(p.estado,'Activo')='Activo';

  SELECT COALESCE(jsonb_agg(jsonb_build_object('metodo',method,'total',total,'cantidad',quantity) ORDER BY total DESC),'[]'::jsonb)
  INTO v_payment_methods
  FROM (
    SELECT COALESCE(NULLIF(trim(metodo_pago),''),'Otro') AS method,
      SUM(monto) AS total,COUNT(*) AS quantity
    FROM public.pagos
    WHERE turno_id=p_turno_id AND COALESCE(estado,'Activo')='Activo'
    GROUP BY 1
  ) methods;

  SELECT COALESCE(SUM(g.monto),0), COALESCE(jsonb_agg(jsonb_build_object(
    'id',g.id,'fecha',COALESCE(g.fecha,g.created_at),'monto',g.monto,
    'metodo',COALESCE(g.metodo_pago,'Otro'),'categoria',g.categoria,
    'concepto',COALESCE(g.descripcion,g.proveedor_nombre,g.proveedor,'Gasto')
  ) ORDER BY COALESCE(g.fecha,g.created_at)),'[]'::jsonb)
  INTO v_expense_total,v_expenses
  FROM public.gastos g WHERE g.turno_id=p_turno_id;

  SELECT COALESCE(SUM(v.total),0),COUNT(*) INTO v_sales_total,v_sales_count
  FROM public.ventas v
  WHERE v.turno_id=p_turno_id AND COALESCE(v.estado,'Activa')='Activa';

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'producto',product_name,'cantidad',quantity,'total',total
  ) ORDER BY total DESC),'[]'::jsonb) INTO v_products
  FROM (
    SELECT COALESCE(NULLIF(d.producto_nombre,''),'Producto o servicio') AS product_name,
      SUM(COALESCE(d.cantidad,0)) AS quantity,SUM(COALESCE(d.total,0)) AS total
    FROM public.ventas v
    JOIN public.ventas_detalle d ON d.venta_id=v.id
    WHERE v.turno_id=p_turno_id AND COALESCE(v.estado,'Activa')='Activa'
      AND COALESCE(d.estado,'Activo')='Activo'
    GROUP BY 1
  ) products;

  SELECT
    COUNT(*) FILTER (WHERE lower(COALESCE(estado_habitacion,''))='ocupada'),
    COUNT(*) FILTER (WHERE lower(COALESCE(estado_habitacion,''))='disponible'),
    COUNT(*) FILTER (WHERE lower(COALESCE(estado_limpieza,''))='sucia'),
    COUNT(*) FILTER (WHERE lower(COALESCE(estado_mantenimiento,''))<>'ok')
  INTO v_occupied,v_available,v_dirty,v_maintenance
  FROM public.habitaciones WHERE hotel_id=v_shift.hotel_id;

  SELECT
    COUNT(*) FILTER (WHERE r.fecha_checkin<=v_today AND NOT COALESCE(r.checkin_realizado,false)
      AND lower(COALESCE(r.estado,'')) NOT IN ('cancelada','noshow','no_show','no show','checkout')),
    COUNT(*) FILTER (WHERE r.fecha_checkout<=v_today AND COALESCE(r.checkin_realizado,false)
      AND NOT COALESCE(r.checkout_realizado,false))
  INTO v_arrivals_pending,v_departures_pending
  FROM public.reservas r WHERE r.hotel_id=v_shift.hotel_id;

  RETURN jsonb_build_object(
    'version',1,'generado_at',now(),'turno_id',p_turno_id,
    'periodo',jsonb_build_object('inicio',v_shift.abierto_at,'fin',COALESCE(v_shift.cerrado_at,now())),
    'recepcion',jsonb_build_object(
      'reservas_creadas',v_reservations,'checkins',v_checkins,'checkouts',v_checkouts,
      'cancelaciones',v_cancellations,'no_shows',v_no_shows,
      'operaciones',jsonb_array_length(v_operations),'eventos',v_events,'detalle_operaciones',v_operations
    ),
    'estado_hotel',jsonb_build_object(
      'ocupadas',v_occupied,'disponibles',v_available,'sucias',v_dirty,'mantenimiento',v_maintenance,
      'llegadas_pendientes',v_arrivals_pending,'salidas_pendientes',v_departures_pending
    ),
    'pagos',jsonb_build_object(
      'total',v_payment_total,'cantidad',jsonb_array_length(v_payments),
      'por_metodo',v_payment_methods,'detalle',v_payments
    ),
    'gastos',jsonb_build_object('total',v_expense_total,'cantidad',jsonb_array_length(v_expenses),'detalle',v_expenses),
    'ventas',jsonb_build_object('total',v_sales_total,'cantidad',v_sales_count,'productos',v_products)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.vulo_build_shift_report(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vulo_build_shift_report(uuid) TO authenticated;

-- Mantiene la misma firma pública para que el frontend anterior también pueda
-- cerrar turnos. El resumen se genera en el servidor y pendientes es opcional.
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
  v_provider_expenses numeric := 0;
  v_expected numeric;
  v_difference numeric;
  v_delivery_user_id uuid := NULLIF(p_checklist->>'entrega_usuario_id','')::uuid;
  v_delivery_name text;
  v_report jsonb;
BEGIN
  SELECT * INTO v_shift FROM public.turnos_operativos
  WHERE id=p_turno_id AND estado='Abierto' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'El turno ya no está abierto'; END IF;
  IF NOT public.vulo_is_superadmin() AND v_shift.usuario_id<>auth.uid()::text THEN
    RAISE EXCEPTION 'Sólo puedes cerrar tu propio turno';
  END IF;
  IF p_efectivo_contado IS NULL OR p_efectivo_contado<0 THEN
    RAISE EXCEPTION 'Registra el efectivo contado';
  END IF;
  IF NOT COALESCE((p_checklist->>'caja')::boolean,false) THEN
    RAISE EXCEPTION 'Confirma que contaste físicamente la caja';
  END IF;

  IF v_delivery_user_id IS NOT NULL THEN
    SELECT trim(concat_ws(' ',nombre,apellido_paterno)) INTO v_delivery_name
    FROM public.profiles
    WHERE id=v_delivery_user_id AND hotel_id=v_shift.hotel_id AND activo IS NOT FALSE;
    IF v_delivery_name IS NULL THEN RAISE EXCEPTION 'El usuario de entrega ya no está disponible'; END IF;
  END IF;

  SELECT
    COALESCE(SUM(amount) FILTER (WHERE method LIKE '%efectivo%'),0),
    COALESCE(SUM(amount) FILTER (WHERE method LIKE '%tarjeta%'),0),
    COALESCE(SUM(amount) FILTER (WHERE method LIKE '%transfer%'),0),
    COALESCE(SUM(amount) FILTER (WHERE method NOT LIKE '%efectivo%' AND method NOT LIKE '%tarjeta%' AND method NOT LIKE '%transfer%'),0)
  INTO v_cash,v_card,v_transfer,v_other
  FROM (
    SELECT monto AS amount,lower(COALESCE(metodo_pago,'')) AS method
    FROM public.pagos WHERE turno_id=p_turno_id AND COALESCE(estado,'Activo')='Activo'
    UNION ALL
    SELECT total AS amount,lower(COALESCE(metodo_pago,'')) AS method
    FROM public.ventas WHERE turno_id=p_turno_id AND reserva_id IS NULL AND COALESCE(estado,'Activa')='Activa'
  ) income;

  SELECT COALESCE(SUM(monto),0) INTO v_expenses FROM public.gastos
  WHERE turno_id=p_turno_id AND lower(COALESCE(metodo_pago,'')) LIKE '%efectivo%';
  IF to_regclass('public.pagos_compras') IS NOT NULL THEN
    EXECUTE $sql$ SELECT COALESCE(SUM(monto),0) FROM public.pagos_compras
      WHERE turno_id=$1 AND lower(COALESCE(metodo_pago,'')) LIKE '%efectivo%' $sql$
    INTO v_provider_expenses USING p_turno_id;
    v_expenses := v_expenses+v_provider_expenses;
  END IF;

  v_expected := ROUND(COALESCE(v_shift.fondo_inicial,0)+v_cash-v_expenses,2);
  v_difference := ROUND(p_efectivo_contado-v_expected,2);
  IF abs(v_difference)>=0.01 AND length(trim(COALESCE(p_motivo_diferencia,'')))<3 THEN
    RAISE EXCEPTION 'Explica la diferencia de caja';
  END IF;

  v_report := public.vulo_build_shift_report(p_turno_id) || jsonb_build_object(
    'caja',jsonb_build_object(
      'fondo_inicial',COALESCE(v_shift.fondo_inicial,0),'efectivo_ingresado',v_cash,
      'tarjeta',v_card,'transferencia',v_transfer,'otros_ingresos',v_other,
      'egresos_efectivo',v_expenses,'efectivo_esperado',v_expected,
      'efectivo_contado',p_efectivo_contado,'diferencia',v_difference
    )
  );

  UPDATE public.turnos_operativos SET
    estado='Cerrado',cerrado_at=now(),efectivo_esperado=v_expected,
    efectivo_contado=p_efectivo_contado,diferencia=v_difference,
    ingresos_efectivo=v_cash,ingresos_tarjeta=v_card,
    ingresos_transferencia=v_transfer,otros_ingresos=v_other,
    egresos_efectivo=v_expenses,entrega_a=COALESCE(v_delivery_name,NULLIF(trim(COALESCE(p_entrega_a,'')),'')),
    entrega_a_usuario_id=v_delivery_user_id,resumen_entrega='Reporte automático de turno',
    pendientes_entrega=NULLIF(NULLIF(trim(COALESCE(p_pendientes_entrega,'')),'__VULO_SIN_PENDIENTES__'),''),
    motivo_diferencia=NULLIF(trim(COALESCE(p_motivo_diferencia,'')),''),
    checklist_cierre=p_checklist,reporte_cierre=v_report
  WHERE id=p_turno_id;

  RETURN (SELECT to_jsonb(t) FROM public.turnos_operativos t WHERE t.id=p_turno_id);
END;
$$;

REVOKE ALL ON FUNCTION public.vulo_close_shift(uuid,numeric,text,text,text,text,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vulo_close_shift(uuid,numeric,text,text,text,text,jsonb) TO authenticated;
