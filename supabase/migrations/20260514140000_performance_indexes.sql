-- ============================================================
-- Índices de performance para escalabilidad
-- Cubre: hotel_id (multi-tenant), FKs implícitas, fechas y estados
-- ============================================================

-- HABITACIONES
CREATE INDEX IF NOT EXISTS idx_habitaciones_hotel              ON public.habitaciones (hotel_id);
CREATE INDEX IF NOT EXISTS idx_habitaciones_tipo               ON public.habitaciones (tipo_habitacion_id);
CREATE INDEX IF NOT EXISTS idx_habitaciones_estado             ON public.habitaciones (hotel_id, estado_habitacion);
CREATE INDEX IF NOT EXISTS idx_habitaciones_limpieza           ON public.habitaciones (hotel_id, estado_limpieza);

-- TIPOS DE HABITACIÓN
CREATE INDEX IF NOT EXISTS idx_tipos_habitacion_hotel          ON public.tipos_habitacion (hotel_id);

-- CLIENTES
CREATE INDEX IF NOT EXISTS idx_clientes_hotel                  ON public.clientes (hotel_id);
CREATE INDEX IF NOT EXISTS idx_clientes_email                  ON public.clientes (hotel_id, email);
CREATE INDEX IF NOT EXISTS idx_clientes_documento              ON public.clientes (hotel_id, numero_documento);
CREATE INDEX IF NOT EXISTS idx_clientes_nombre                 ON public.clientes (hotel_id, nombre);

-- RESERVAS (la más consultada)
CREATE INDEX IF NOT EXISTS idx_reservas_hotel                  ON public.reservas (hotel_id);
CREATE INDEX IF NOT EXISTS idx_reservas_cliente                ON public.reservas (cliente_id);
CREATE INDEX IF NOT EXISTS idx_reservas_habitacion             ON public.reservas (habitacion_id);
CREATE INDEX IF NOT EXISTS idx_reservas_tipo_habitacion        ON public.reservas (tipo_habitacion_id);
CREATE INDEX IF NOT EXISTS idx_reservas_estado                 ON public.reservas (hotel_id, estado);
CREATE INDEX IF NOT EXISTS idx_reservas_checkin                ON public.reservas (hotel_id, fecha_checkin);
CREATE INDEX IF NOT EXISTS idx_reservas_checkout               ON public.reservas (hotel_id, fecha_checkout);
CREATE INDEX IF NOT EXISTS idx_reservas_rango                  ON public.reservas (hotel_id, fecha_checkin, fecha_checkout);
CREATE INDEX IF NOT EXISTS idx_reservas_numero                 ON public.reservas (hotel_id, numero_reserva);

-- PAGOS
CREATE INDEX IF NOT EXISTS idx_pagos_hotel                     ON public.pagos (hotel_id);
CREATE INDEX IF NOT EXISTS idx_pagos_reserva                   ON public.pagos (reserva_id);
CREATE INDEX IF NOT EXISTS idx_pagos_fecha                     ON public.pagos (hotel_id, fecha DESC);

-- CARGOS
CREATE INDEX IF NOT EXISTS idx_cargos_hotel                    ON public.cargos (hotel_id);
CREATE INDEX IF NOT EXISTS idx_cargos_reserva                  ON public.cargos (reserva_id);
CREATE INDEX IF NOT EXISTS idx_cargos_habitacion               ON public.cargos (habitacion_id);
CREATE INDEX IF NOT EXISTS idx_cargos_concepto                 ON public.cargos (concepto_cargo_id);
CREATE INDEX IF NOT EXISTS idx_cargos_fecha                    ON public.cargos (hotel_id, fecha DESC);

-- CONCEPTOS / CATÁLOGOS
CREATE INDEX IF NOT EXISTS idx_conceptos_cargo_hotel           ON public.conceptos_cargo (hotel_id);
CREATE INDEX IF NOT EXISTS idx_categorias_producto_hotel       ON public.categorias_producto (hotel_id);
CREATE INDEX IF NOT EXISTS idx_proveedores_hotel               ON public.proveedores (hotel_id);
CREATE INDEX IF NOT EXISTS idx_entregables_hotel               ON public.entregables (hotel_id);

-- PRODUCTOS
CREATE INDEX IF NOT EXISTS idx_productos_hotel                 ON public.productos (hotel_id);
CREATE INDEX IF NOT EXISTS idx_productos_categoria             ON public.productos (categoria_id);
CREATE INDEX IF NOT EXISTS idx_productos_codigo                ON public.productos (hotel_id, codigo);
CREATE INDEX IF NOT EXISTS idx_productos_activo                ON public.productos (hotel_id, activo);

-- VENTAS
CREATE INDEX IF NOT EXISTS idx_ventas_hotel                    ON public.ventas (hotel_id);
CREATE INDEX IF NOT EXISTS idx_ventas_reserva                  ON public.ventas (reserva_id);
CREATE INDEX IF NOT EXISTS idx_ventas_habitacion               ON public.ventas (habitacion_id);
CREATE INDEX IF NOT EXISTS idx_ventas_fecha                    ON public.ventas (hotel_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_ventas_detalle_venta            ON public.ventas_detalle (venta_id);
CREATE INDEX IF NOT EXISTS idx_ventas_detalle_producto         ON public.ventas_detalle (producto_id);

-- COMPRAS
CREATE INDEX IF NOT EXISTS idx_compras_hotel                   ON public.compras (hotel_id);
CREATE INDEX IF NOT EXISTS idx_compras_proveedor               ON public.compras (proveedor_id);
CREATE INDEX IF NOT EXISTS idx_compras_fecha                   ON public.compras (hotel_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_compras_detalle_compra          ON public.compras_detalle (compra_id);
CREATE INDEX IF NOT EXISTS idx_compras_detalle_producto        ON public.compras_detalle (producto_id);

-- GASTOS
CREATE INDEX IF NOT EXISTS idx_gastos_hotel                    ON public.gastos (hotel_id);
CREATE INDEX IF NOT EXISTS idx_gastos_proveedor                ON public.gastos (proveedor_id);
CREATE INDEX IF NOT EXISTS idx_gastos_fecha                    ON public.gastos (hotel_id, fecha DESC);

-- INVENTARIO
CREATE INDEX IF NOT EXISTS idx_movinv_producto                 ON public.movimientos_inventario (producto_id);
CREATE INDEX IF NOT EXISTS idx_movinv_fecha                    ON public.movimientos_inventario (producto_id, created_at DESC);

-- TAREAS
CREATE INDEX IF NOT EXISTS idx_tareas_limp_hotel               ON public.tareas_limpieza (hotel_id);
CREATE INDEX IF NOT EXISTS idx_tareas_limp_habitacion          ON public.tareas_limpieza (habitacion_id);
CREATE INDEX IF NOT EXISTS idx_tareas_limp_estado              ON public.tareas_limpieza (hotel_id, estado, prioridad);
CREATE INDEX IF NOT EXISTS idx_tareas_limp_asignado            ON public.tareas_limpieza (asignado_a);

CREATE INDEX IF NOT EXISTS idx_tareas_mant_hotel               ON public.tareas_mantenimiento (hotel_id);
CREATE INDEX IF NOT EXISTS idx_tareas_mant_habitacion          ON public.tareas_mantenimiento (habitacion_id);
CREATE INDEX IF NOT EXISTS idx_tareas_mant_estado              ON public.tareas_mantenimiento (hotel_id, estado, prioridad);
CREATE INDEX IF NOT EXISTS idx_tareas_mant_asignado            ON public.tareas_mantenimiento (asignado_a);

-- ENTREGABLES RESERVA
CREATE INDEX IF NOT EXISTS idx_entreg_reserva_reserva          ON public.entregables_reserva (reserva_id);
CREATE INDEX IF NOT EXISTS idx_entreg_reserva_entregable       ON public.entregables_reserva (entregable_id);

-- TRANSACCIONES
CREATE INDEX IF NOT EXISTS idx_transacciones_hotel             ON public.transacciones (hotel_id);
CREATE INDEX IF NOT EXISTS idx_transacciones_ref               ON public.transacciones (referencia_tipo, referencia_id);
CREATE INDEX IF NOT EXISTS idx_transacciones_fecha             ON public.transacciones (hotel_id, fecha DESC);

-- PROFILES & ROLES
CREATE INDEX IF NOT EXISTS idx_profiles_hotel                  ON public.profiles (hotel_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user                 ON public.user_roles (user_id);

-- ANALYZE para que el planner use los nuevos índices de inmediato
ANALYZE;
