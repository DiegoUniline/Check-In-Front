-- Permisos validados en la base de datos (no sólo en la app).
--  * permisos_default: matriz por defecto (igual a la de la app).
--  * vulo_permitido(modulo): override del hotel (permisos_hotel) o default.
--  * Escrituras directas desde la app (rol authenticated) se validan por
--    tabla/operación contra los módulos que las usan.
--  * Lecturas sensibles (gastos, compras, proveedores) se restringen por rol.
--  * Las RPC (SECURITY DEFINER) y los triggers internos no se bloquean aquí:
--    cada RPC valida su propia operación.

CREATE TABLE IF NOT EXISTS public.permisos_default (
  modulo text NOT NULL,
  rol text NOT NULL,
  PRIMARY KEY (modulo, rol)
);
ALTER TABLE public.permisos_default ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "leer permisos_default" ON public.permisos_default;
CREATE POLICY "leer permisos_default" ON public.permisos_default FOR SELECT TO authenticated USING (true);
REVOKE INSERT, UPDATE, DELETE ON public.permisos_default FROM anon, authenticated;
GRANT SELECT ON public.permisos_default TO authenticated;

DELETE FROM public.permisos_default;
INSERT INTO public.permisos_default(modulo, rol) VALUES
  
('dashboard','Admin'),
  ('dashboard','Gerente'),
  ('dashboard','Recepcion'),
  ('reservas','Admin'),
  ('reservas','Gerente'),
  ('reservas','Recepcion'),
  ('habitaciones','Admin'),
  ('habitaciones','Gerente'),
  ('habitaciones','Recepcion'),
  ('habitaciones','Housekeeping'),
  ('habitaciones','Mantenimiento'),
  ('clientes','Admin'),
  ('clientes','Gerente'),
  ('clientes','Recepcion'),
  ('chats','Admin'),
  ('chats','Gerente'),
  ('chats','Recepcion'),
  ('limpieza','Admin'),
  ('limpieza','Gerente'),
  ('limpieza','Housekeeping'),
  ('mantenimiento','Admin'),
  ('mantenimiento','Gerente'),
  ('mantenimiento','Mantenimiento'),
  ('cierre-dia','Admin'),
  ('cierre-dia','Gerente'),
  ('checkin','Admin'),
  ('checkin','Gerente'),
  ('checkin','Recepcion'),
  ('checkout','Admin'),
  ('checkout','Gerente'),
  ('checkout','Recepcion'),
  ('pos','Admin'),
  ('pos','Gerente'),
  ('pos','Recepcion'),
  ('inventario','Admin'),
  ('inventario','Gerente'),
  ('compras','Admin'),
  ('compras','Gerente'),
  ('proveedores','Admin'),
  ('proveedores','Gerente'),
  ('gastos','Admin'),
  ('gastos','Gerente'),
  ('historial','Admin'),
  ('historial','Gerente'),
  ('historial-reservas','Admin'),
  ('historial-reservas','Gerente'),
  ('historial-reservas','Recepcion'),
  ('facturacion','Admin'),
  ('facturacion','Gerente'),
  ('facturacion','Recepcion'),
  ('politicas_reserva','Admin'),
  ('politicas_reserva','Gerente'),
  ('reportes','Admin'),
  ('reportes','Gerente'),
  ('usuarios','Admin'),
  ('turnos','Admin'),
  ('turnos','Gerente'),
  ('turnos','Recepcion'),
  ('catalogos','Admin'),
  ('catalogos','Gerente'),
  ('configuracion','Admin'),
  ('permisos','Admin'),
  ('auditoria','Admin'),
  ('auditoria','Gerente'),
  ('catalogos.conceptos','Admin'),
  ('catalogos.conceptos','Gerente'),
  ('catalogos.categorias','Admin'),
  ('catalogos.categorias','Gerente'),
  ('catalogos.entregables','Admin'),
  ('catalogos.entregables','Gerente'),
  ('catalogos.metodos','Admin'),
  ('catalogos.metodos','Gerente'),
  ('catalogos.proveedores','Admin'),
  ('catalogos.proveedores','Gerente'),
  ('catalogos.tipos-habitacion','Admin'),
  ('catalogos.tipos-habitacion','Gerente'),
  ('config.hotel','Admin'),
  ('config.usuarios','Admin'),
  ('config.pagos','Admin'),
  ('config.notificaciones','Admin'),
  ('config.notificaciones','Gerente'),
  ('config.apariencia','Admin'),
  ('config.apariencia','Gerente'),
  ('config.apariencia','Recepcion'),
  ('reportes.ocupacion','Admin'),
  ('reportes.ocupacion','Gerente'),
  ('reportes.ingresos','Admin'),
  ('reportes.ingresos','Gerente'),
  ('reportes.ventas','Admin'),
  ('reportes.ventas','Gerente'),
  ('reportes.huespedes','Admin'),
  ('reportes.huespedes','Gerente'),
  ('reservas.operacion.extend_stay','Admin'),
  ('reservas.operacion.extend_stay','Gerente'),
  ('reservas.operacion.extend_stay','Recepcion'),
  ('reservas.operacion.early_departure','Admin'),
  ('reservas.operacion.early_departure','Gerente'),
  ('reservas.operacion.early_departure','Recepcion'),
  ('reservas.operacion.modify_dates','Admin'),
  ('reservas.operacion.modify_dates','Gerente'),
  ('reservas.operacion.modify_dates','Recepcion'),
  ('reservas.operacion.room_change','Admin'),
  ('reservas.operacion.room_change','Gerente'),
  ('reservas.operacion.room_change','Recepcion'),
  ('reservas.operacion.category_change','Admin'),
  ('reservas.operacion.category_change','Gerente'),
  ('reservas.operacion.late_checkout','Admin'),
  ('reservas.operacion.late_checkout','Gerente'),
  ('reservas.operacion.late_checkout','Recepcion'),
  ('reservas.operacion.early_checkin','Admin'),
  ('reservas.operacion.early_checkin','Gerente'),
  ('reservas.operacion.early_checkin','Recepcion'),
  ('reservas.operacion.add_guest','Admin'),
  ('reservas.operacion.add_guest','Gerente'),
  ('reservas.operacion.add_guest','Recepcion'),
  ('reservas.operacion.remove_guest','Admin'),
  ('reservas.operacion.remove_guest','Gerente'),
  ('reservas.operacion.remove_guest','Recepcion'),
  ('reservas.operacion.room_out_of_service','Admin'),
  ('reservas.operacion.room_out_of_service','Gerente'),
  ('reservas.operacion.rate_change','Admin'),
  ('reservas.operacion.rate_change','Gerente'),
  ('reservas.operacion.discount_change','Admin'),
  ('reservas.operacion.discount_change','Gerente'),
  ('reservas.operacion.add_charge','Admin'),
  ('reservas.operacion.add_charge','Gerente'),
  ('reservas.operacion.add_charge','Recepcion'),
  ('reservas.operacion.update_charge','Admin'),
  ('reservas.operacion.update_charge','Gerente'),
  ('reservas.operacion.cancel_charge','Admin'),
  ('reservas.operacion.cancel_charge','Gerente'),
  ('reservas.operacion.restore_charge','Admin'),
  ('reservas.operacion.restore_charge','Gerente'),
  ('reservas.operacion.transfer_charge','Admin'),
  ('reservas.operacion.transfer_charge','Gerente'),
  ('reservas.operacion.partial_payment','Admin'),
  ('reservas.operacion.partial_payment','Gerente'),
  ('reservas.operacion.partial_payment','Recepcion'),
  ('reservas.operacion.payment_method_change','Admin'),
  ('reservas.operacion.payment_method_change','Gerente'),
  ('reservas.operacion.cancel_payment','Admin'),
  ('reservas.operacion.cancel_payment','Gerente'),
  ('reservas.operacion.payment_amount_change','Admin'),
  ('reservas.operacion.payment_amount_change','Gerente'),
  ('reservas.operacion.restore_payment','Admin'),
  ('reservas.operacion.restore_payment','Gerente'),
  ('reservas.operacion.split_account','Admin'),
  ('reservas.operacion.split_account','Gerente'),
  ('reservas.operacion.split_account','Recepcion'),
  ('reservas.operacion.move_to_account','Admin'),
  ('reservas.operacion.move_to_account','Gerente'),
  ('reservas.operacion.move_to_account','Recepcion'),
  ('reservas.operacion.no_show','Admin'),
  ('reservas.operacion.no_show','Gerente'),
  ('reservas.operacion.no_show','Recepcion'),
  ('reservas.operacion.cancel_reservation','Admin'),
  ('reservas.operacion.cancel_reservation','Gerente'),
  ('reservas.operacion.reopen_checkout','Admin'),
  ('reservas.operacion.reopen_checkout','Gerente'),
  ('reservas.operacion.consecutive_reservation','Admin'),
  ('reservas.operacion.consecutive_reservation','Gerente'),
  ('reservas.operacion.consecutive_reservation','Recepcion'),
  ('reservas.operacion.correction_note','Admin'),
  ('reservas.operacion.correction_note','Gerente'),
  ('reservas.operacion.correction_note','Recepcion'),
  ('reservas.operacion.reservation_correction','Admin'),
  ('reservas.operacion.reservation_correction','Gerente'),
  ('reservas.operacion.reservation_correction','Recepcion');

CREATE OR REPLACE FUNCTION public.vulo_permitido(p_modulo text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $pe_perm$
DECLARE
  v_role text;
  v_override boolean;
BEGIN
  IF auth.uid() IS NULL THEN RETURN true; END IF;
  IF public.vulo_is_superadmin() OR public.vulo_platform_owner() THEN RETURN true; END IF;
  v_role := COALESCE(public.vulo_current_role(), '');
  IF v_role IN ('Admin', 'SuperAdmin') THEN RETURN true; END IF;
  IF v_role = '' THEN RETURN false; END IF;

  SELECT permitido INTO v_override
  FROM public.permisos_hotel
  WHERE hotel_id = public.vulo_current_hotel_id() AND rol = v_role AND modulo = p_modulo
  LIMIT 1;
  IF FOUND THEN RETURN COALESCE(v_override, false); END IF;

  RETURN EXISTS (SELECT 1 FROM public.permisos_default WHERE modulo = p_modulo AND rol = v_role);
END;
$pe_perm$;

CREATE OR REPLACE FUNCTION public.vulo_permitido_alguno(p_modulos text[])
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $pe_alg$
DECLARE
  v_mod text;
BEGIN
  FOREACH v_mod IN ARRAY COALESCE(p_modulos, ARRAY[]::text[]) LOOP
    IF public.vulo_permitido(v_mod) THEN RETURN true; END IF;
  END LOOP;
  RETURN false;
END;
$pe_alg$;

REVOKE ALL ON FUNCTION public.vulo_permitido(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.vulo_permitido_alguno(text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vulo_permitido(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.vulo_permitido_alguno(text[]) TO authenticated;

-- Las operaciones de estancia usan la misma matriz.
CREATE OR REPLACE FUNCTION public.vulo_operation_allowed(p_operacion text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $pe_op$
  SELECT public.vulo_permitido('reservas.operacion.' || lower(p_operacion))
$pe_op$;

REVOKE ALL ON FUNCTION public.vulo_operation_allowed(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vulo_operation_allowed(text) TO authenticated;

-- Validación de escrituras directas desde la app.
CREATE OR REPLACE FUNCTION public.vulo_enforce_permiso()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $pe_enf$
DECLARE
  v_mods text[] := string_to_array(TG_ARGV[0], ',');
BEGIN
  IF current_user <> 'authenticated'
     OR pg_trigger_depth() > 1
     OR auth.uid() IS NULL
     OR COALESCE(current_setting('vulo.stay_operation', true), '') <> '' THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;

  IF NOT public.vulo_permitido_alguno(v_mods) THEN
    RAISE EXCEPTION 'Tu rol no tiene permiso para esta acción (%)', TG_TABLE_NAME
      USING ERRCODE = '42501';
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$pe_enf$;

DO $pe_trg$
DECLARE
  r record;
  v_op text;
  v_suffix text;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('reservas', 'INSERT', 'reservas'),
      ('reservas', 'UPDATE', 'reservas,checkin,checkout,facturacion,historial-reservas'),
      ('reservas', 'DELETE', 'reservas'),
      ('clientes', 'INSERT', 'clientes,reservas,checkin,chats'),
      ('clientes', 'UPDATE', 'clientes,reservas,checkin,chats,facturacion'),
      ('clientes', 'DELETE', 'clientes'),
      ('pagos', 'INSERT', 'reservas,checkin,checkout'),
      ('pagos', 'UPDATE', 'reservas,checkout'),
      ('pagos', 'DELETE', 'reservas'),
      ('cargos', 'INSERT', 'reservas,checkout,pos'),
      ('cargos', 'UPDATE', 'reservas,checkout'),
      ('cargos', 'DELETE', 'reservas,checkout'),
      ('habitaciones', 'INSERT', 'habitaciones'),
      ('habitaciones', 'UPDATE', 'habitaciones,limpieza,mantenimiento,reservas,checkin,checkout'),
      ('habitaciones', 'DELETE', 'habitaciones'),
      ('tipos_habitacion', 'INSERT', 'catalogos'),
      ('tipos_habitacion', 'UPDATE', 'catalogos'),
      ('tipos_habitacion', 'DELETE', 'catalogos'),
      ('tareas_limpieza', 'INSERT', 'limpieza,checkout,reservas,habitaciones'),
      ('tareas_limpieza', 'UPDATE', 'limpieza,checkout,reservas'),
      ('tareas_limpieza', 'DELETE', 'limpieza'),
      ('tareas_mantenimiento', 'INSERT', 'mantenimiento,habitaciones,reservas'),
      ('tareas_mantenimiento', 'UPDATE', 'mantenimiento,habitaciones'),
      ('tareas_mantenimiento', 'DELETE', 'mantenimiento'),
      ('checklist_items', 'INSERT', 'limpieza,mantenimiento'),
      ('checklist_items', 'UPDATE', 'limpieza,mantenimiento'),
      ('checklist_items', 'DELETE', 'limpieza,mantenimiento'),
      ('productos', 'INSERT', 'inventario'),
      ('productos', 'UPDATE', 'inventario,pos,compras,reservas,checkout'),
      ('productos', 'DELETE', 'inventario'),
      ('categorias_producto', 'INSERT', 'catalogos,inventario'),
      ('categorias_producto', 'UPDATE', 'catalogos,inventario'),
      ('categorias_producto', 'DELETE', 'catalogos,inventario'),
      ('movimientos_inventario', 'INSERT', 'inventario,compras,pos,reservas,checkout'),
      ('movimientos_inventario', 'UPDATE', 'inventario'),
      ('movimientos_inventario', 'DELETE', 'inventario'),
      ('compras', 'INSERT', 'compras'),
      ('compras', 'UPDATE', 'compras'),
      ('compras', 'DELETE', 'compras'),
      ('compras_detalle', 'INSERT', 'compras'),
      ('compras_detalle', 'UPDATE', 'compras'),
      ('compras_detalle', 'DELETE', 'compras'),
      ('pagos_compras', 'INSERT', 'compras'),
      ('pagos_compras', 'UPDATE', 'compras'),
      ('pagos_compras', 'DELETE', 'compras'),
      ('proveedores', 'INSERT', 'proveedores,compras,catalogos'),
      ('proveedores', 'UPDATE', 'proveedores,compras,catalogos'),
      ('proveedores', 'DELETE', 'proveedores,catalogos'),
      ('gastos', 'INSERT', 'gastos,turnos,cierre-dia'),
      ('gastos', 'UPDATE', 'gastos'),
      ('gastos', 'DELETE', 'gastos'),
      ('ventas', 'INSERT', 'pos'),
      ('ventas', 'UPDATE', 'pos,historial'),
      ('ventas', 'DELETE', 'pos,historial'),
      ('ventas_detalle', 'INSERT', 'pos'),
      ('ventas_detalle', 'UPDATE', 'pos,historial'),
      ('ventas_detalle', 'DELETE', 'pos,historial'),
      ('conceptos_cargo', 'INSERT', 'catalogos,reservas,checkout,pos'),
      ('conceptos_cargo', 'UPDATE', 'catalogos'),
      ('conceptos_cargo', 'DELETE', 'catalogos'),
      ('entregables', 'INSERT', 'catalogos'),
      ('entregables', 'UPDATE', 'catalogos,reservas,checkin,checkout'),
      ('entregables', 'DELETE', 'catalogos'),
      ('entregables_reserva', 'INSERT', 'reservas,checkin,checkout'),
      ('entregables_reserva', 'UPDATE', 'reservas,checkin,checkout'),
      ('entregables_reserva', 'DELETE', 'reservas,checkin,checkout'),
      ('metodos_pago', 'INSERT', 'catalogos,configuracion'),
      ('metodos_pago', 'UPDATE', 'catalogos,configuracion'),
      ('metodos_pago', 'DELETE', 'catalogos,configuracion'),
      ('descuentos', 'INSERT', 'catalogos,clientes'),
      ('descuentos', 'UPDATE', 'catalogos'),
      ('descuentos', 'DELETE', 'catalogos'),
      ('temporadas', 'INSERT', 'catalogos,configuracion'),
      ('temporadas', 'UPDATE', 'catalogos,configuracion'),
      ('temporadas', 'DELETE', 'catalogos,configuracion'),
      ('cierres_diarios', 'INSERT', 'cierre-dia'),
      ('cierres_diarios', 'UPDATE', 'cierre-dia'),
      ('cierres_diarios', 'DELETE', 'cierre-dia'),
      ('configuracion_hotel', 'INSERT', 'configuracion,chats'),
      ('configuracion_hotel', 'UPDATE', 'configuracion,chats'),
      ('configuracion_hotel', 'DELETE', 'configuracion'),
      ('politicas_reserva', 'INSERT', 'politicas_reserva'),
      ('politicas_reserva', 'UPDATE', 'politicas_reserva'),
      ('politicas_reserva', 'DELETE', 'politicas_reserva'),
      ('permisos_hotel', 'INSERT', 'permisos'),
      ('permisos_hotel', 'UPDATE', 'permisos'),
      ('permisos_hotel', 'DELETE', 'permisos'),
      ('wa_notas', 'INSERT', 'chats'),
      ('wa_notas', 'UPDATE', 'chats'),
      ('wa_notas', 'DELETE', 'chats'),
      ('wa_chats', 'UPDATE', 'chats')
    ) AS t(tabla, op, modulos)
  LOOP
    IF to_regclass('public.' || r.tabla) IS NULL THEN CONTINUE; END IF;
    v_op := r.op;
    v_suffix := lower(left(v_op, 3));
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', 'trg_zz_vulo_perm_' || v_suffix, r.tabla);
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE %s ON public.%I FOR EACH ROW EXECUTE FUNCTION public.vulo_enforce_permiso(%L)',
      'trg_zz_vulo_perm_' || v_suffix, v_op, r.tabla, r.modulos
    );
  END LOOP;
END $pe_trg$;

-- Lecturas sensibles.
DO $pe_read$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('gastos', 'gastos,turnos,reportes,cierre-dia,dashboard'),
      ('compras', 'compras,inventario,reportes,cierre-dia,proveedores'),
      ('compras_detalle', 'compras,inventario,reportes,cierre-dia,proveedores'),
      ('pagos_compras', 'compras,reportes,cierre-dia,dashboard,turnos,proveedores'),
      ('proveedores', 'proveedores,compras,catalogos,inventario,gastos')
    ) AS t(tabla, modulos)
  LOOP
    IF to_regclass('public.' || r.tabla) IS NULL THEN CONTINUE; END IF;
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'permiso lectura ' || r.tabla, r.tabla);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR SELECT TO authenticated USING (public.vulo_permitido_alguno(string_to_array(%L, '','')))',
      'permiso lectura ' || r.tabla, r.tabla, r.modulos
    );
  END LOOP;
END $pe_read$;

NOTIFY pgrst, 'reload schema';

SELECT 'PERMISOS EN SERVIDOR APLICADOS' AS resultado;
