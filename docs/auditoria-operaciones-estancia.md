# Auditoría de operaciones cotidianas de estancia

Fecha: 3 de septiembre de 2026

## Resultado

La arquitectura anterior ya contaba con prevención de solapamientos, recálculo financiero central, check-in/check-out atómicos, cargos, pagos, limpieza, mantenimiento y actualización en tiempo real. El principal riesgo estaba en los cambios posteriores a la creación: varias pantallas actualizaban directamente la reserva, los cargos y pagos podían borrarse, y no existía un historial transaccional con motivo y reversión.

La migración `20260903150000_stay_operations.sql` agrega una única capa operativa transaccional. La interfaz se integra en el expediente continuo de la reservación; reutiliza las tablas y funciones actuales y no crea un segundo módulo de reservas. La migración complementaria `20260903200000_atomic_sales_and_stay_consumptions.sql` unifica POS, consumos, inventario y cuenta de la estancia.

## Cobertura implementada

| Operación | Resultado | Validaciones principales |
|---|---|---|
| Extender estancia | Implementada | Fechas válidas, disponibilidad exclusiva, recálculo de noches, tarifa, impuestos, total y saldo |
| Salida anticipada | Implementada | No permite fechas anteriores al día operativo; conserva saldo a favor cuando existe |
| Cambio de habitación | Implementada | Habitación operativa, limpia para traslado activo, sin solapamientos; origen queda sucio y destino ocupado |
| Upgrade/downgrade/cortesía | Implementada | Cambio de habitación/categoría, tarifa base automática, motivo y permiso de gerencia |
| Late check-out | Implementada | Sólo estancia activa, misma fecha de salida, hora posterior a la política y sin conflicto con la próxima llegada |
| Early check-in | Implementada | Sólo el día de entrada; habitación disponible, limpia y sin mantenimiento; cargo opcional |
| Agregar/retirar huéspedes | Implementada | Sólo estancia activa, capacidad total/adultos/menores y cargos por persona |
| Modificar fechas | Implementada | Prevención de sobreventa y corrección de fecha de entrada restringida después del check-in |
| Fuera de servicio | Implementada | Reasigna reserva/huésped, bloquea habitación, abre mantenimiento y la libera al resolver la tarea |
| Cargos/consumos | Implementada | Catálogo y precios reales, venta y detalle, inventario, alta, corrección, cancelación, restauración y traslado; no permite borrado físico |
| No-show y cancelación | Implementada | Sólo antes del check-in; motivo e historial; reversión controlada |
| Tarifa, descuento y cortesía | Implementada | Permiso de gerencia y recálculo financiero con tasa fiscal original |
| Forma de pago y pagos parciales | Implementada | Usa métodos activos configurados; sobrepago bloqueado; corrección, cancelación y restauración auditadas |
| División de cuenta | Implementada | Subcuentas, responsable, totales/pagos/saldo y asignación de movimientos sin duplicarlos |
| Traslado entre cuentas/folios | Implementada | Valida mismo hotel y reserva destino válida |
| Reservas consecutivas | Implementada | Mismo huésped, orden cronológico y relación explícita |
| Reapertura de check-out | Implementada | Sólo gerencia; permite elegir otra habitación y valida el nuevo rango antes de reabrir |
| Entregables | Implementada | Asignación y devolución desde el expediente, pendientes visibles y auditoría |
| Correcciones posteriores | Implementada | Nota operativa y edición controlada desde la estancia |

## Integridad y seguridad

- Todas las operaciones se ejecutan dentro de una función de base de datos y se revierten completas si falla una validación.
- Una venta crea en la misma transacción el encabezado, renglones, cargos de habitación, salidas de inventario, saldo e historial.
- Cancelar o restaurar un consumo ajusta el inventario inversamente y conserva el renglón original.
- La prevención de solapamientos existente permanece como segunda barrera contra sobreventa.
- Los cargos y pagos cancelados dejan de afectar el saldo, pero permanecen en el historial.
- Los cambios sensibles guardan usuario, correo, fecha/hora, motivo, valores anteriores y posteriores.
- Recepción conserva operaciones cotidianas; tarifa, descuentos, correcciones financieras, fuera de servicio, cancelación y reapertura requieren gerencia por defecto.
- Los permisos pueden ajustarse por hotel con las claves `reservas.operacion.*`; la base de datos los verifica aunque alguien intente llamar la función fuera de la interfaz.
- Fechas, habitaciones, cargos y pagos continúan notificándose por tiempo real a calendario, recepción, limpieza y mantenimiento.

## Validación técnica realizada

- TypeScript: `tsc --noEmit`, sin errores.
- ESLint sobre archivos modificados: sin errores (el proyecto conserva advertencias históricas por `any`).
- Compilación de producción: `vite build`, exitosa.
- Revisión de diferencias: `git diff --check`, sin problemas de formato.

La validación funcional conectada requiere ejecutar primero la migración en el proyecto Supabase del hotel; antes de eso la interfaz mostrará que las funciones operativas todavía no existen.
