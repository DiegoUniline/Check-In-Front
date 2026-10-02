# Historial y corrección de pagos en Check-out

## Objetivo
Mostrar en la misma pantalla de salida todos los pagos registrados para que recepción pueda revisarlos y corregir un importe equivocado antes de cerrar la estancia.

## Cambios
- Añadir una sección **Pagos realizados** con fecha, método, referencia, concepto, estado e importe.
- Incluir una acción **Modificar importe** en cada pago activo, solicitando el nuevo importe y el motivo de la corrección.
- Recalcular y actualizar cuenta, total pagado y saldo inmediatamente después del cambio.
- Conservar visibles los pagos cancelados como historial, claramente identificados y sin sumarlos al saldo.
- Mantener una presentación compacta en escritorio y adaptable a móvil, usando los controles y colores actuales.

## Validación
- Abrir una salida con pagos existentes y comprobar que el historial coincide con la cuenta.
- Modificar un pago, confirmar que el saldo cambia sin recargar y que no se permite un importe inválido.
- Verificar que la salida sigue permitiendo varios métodos y cambio en efectivo.
