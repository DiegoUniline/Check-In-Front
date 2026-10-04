-- ============================================================================
-- CORTE DE CAJA: clasificar ingresos/egresos por el TIPO configurado en
-- Catálogos (metodos_pago.tipo), no por el nombre del método.
-- Caso: "Deposito en efectivo" configurado como Transferencia se sumaba
-- como dinero físico en caja.
-- Fecha: 04/10/2026
-- ============================================================================

-- 1) Clasificador central: tipo configurado primero, nombre como respaldo.
CREATE OR REPLACE FUNCTION public.vulo_metodo_clase(p_hotel_id uuid, p_metodo text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT CASE
        WHEN lower(COALESCE(m.tipo,'')) LIKE '%efectivo%' THEN 'efectivo'
        WHEN lower(COALESCE(m.tipo,'')) LIKE '%tarjeta%' THEN 'tarjeta'
        WHEN lower(COALESCE(m.tipo,'')) LIKE '%transfer%'
          OR lower(COALESCE(m.tipo,'')) LIKE '%deposito%'
          OR lower(COALESCE(m.tipo,'')) LIKE '%depósito%' THEN 'transferencia'
        ELSE 'otro'
      END
      FROM public.metodos_pago m
      WHERE m.hotel_id = p_hotel_id
        AND lower(trim(m.nombre)) = lower(trim(COALESCE(p_metodo,'')))
      LIMIT 1
    ),
    CASE
      WHEN lower(COALESCE(p_metodo,'')) LIKE '%tarjeta%' THEN 'tarjeta'
      WHEN lower(COALESCE(p_metodo,'')) LIKE '%transfer%'
        OR lower(COALESCE(p_metodo,'')) LIKE '%deposito%'
        OR lower(COALESCE(p_metodo,'')) LIKE '%depósito%' THEN 'transferencia'
      WHEN lower(COALESCE(p_metodo,'')) LIKE '%efectivo%' THEN 'efectivo'
      ELSE 'otro'
    END
  );
$$;

REVOKE ALL ON FUNCTION public.vulo_metodo_clase(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vulo_metodo_clase(uuid, text) TO authenticated;

-- 2) Cierre de turno usando el clasificador.
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
    COALESCE(SUM(amount) FILTER (WHERE clase='efectivo'),0),
    COALESCE(SUM(amount) FILTER (WHERE clase='tarjeta'),0),
    COALESCE(SUM(amount) FILTER (WHERE clase='transferencia'),0),
    COALESCE(SUM(amount) FILTER (WHERE clase='otro'),0)
  INTO v_cash,v_card,v_transfer,v_other
  FROM (
    SELECT monto AS amount, public.vulo_metodo_clase(v_shift.hotel_id, metodo_pago) AS clase
    FROM public.pagos WHERE turno_id=p_turno_id AND COALESCE(estado,'Activo')='Activo'
    UNION ALL
    SELECT total AS amount, public.vulo_metodo_clase(v_shift.hotel_id, metodo_pago) AS clase
    FROM public.ventas WHERE turno_id=p_turno_id AND reserva_id IS NULL AND COALESCE(estado,'Activa')='Activa'
  ) income;

  SELECT COALESCE(SUM(monto),0) INTO v_expenses FROM public.gastos
  WHERE turno_id=p_turno_id
    AND public.vulo_metodo_clase(v_shift.hotel_id, metodo_pago)='efectivo';
  IF to_regclass('public.pagos_compras') IS NOT NULL THEN
    EXECUTE $sql$ SELECT COALESCE(SUM(monto),0) FROM public.pagos_compras
      WHERE turno_id=$1 AND public.vulo_metodo_clase($2, metodo_pago)='efectivo' $sql$
    INTO v_provider_expenses USING p_turno_id, v_shift.hotel_id;
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

SELECT 'CLASIFICACION POR TIPO APLICADA' AS resultado;
