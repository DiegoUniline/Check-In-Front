## Objetivo
Permitir que cada hotel configure sus propios items de verificación de Check-in y Check-out. La regla es estricta: para realizar el check-in/out se deben marcar **todos** los items configurados (100%) o no se permite la operación.

## Cambios en base de datos
Nueva tabla `checklist_items`:
- `id uuid PK`
- `hotel_id uuid` (multi-tenant)
- `tipo text` (`checkin` | `checkout`)
- `nombre text`
- `orden int default 0`
- `activo boolean default true`
- `created_at timestamptz`
- RLS abierto a authenticated (siguiendo el patrón actual).

Seed inicial por hotel con los items actuales:
- Check-in: Documento de identidad verificado, Garantía/tarjeta registrada, Registro de huésped firmado.
- Check-out: Habitación inspeccionada, Llaves devueltas.

## Cambios en frontend

### 1. Configuración (nueva sección)
En **Configuración del hotel** agregar pestaña "Checklists":
- Lista de items de Check-in con botones agregar/editar/eliminar/reordenar y toggle activo.
- Lista de items de Check-out con los mismos controles.
- Validación: nombre obligatorio, máx 120 chars.

### 2. ReservaDetalleModal
Reemplazar los 3 checkboxes hardcoded de Check-in y los 2 de Check-out por render dinámico desde `checklist_items` filtrados por `hotel_id` + `tipo` + `activo=true`.
- Estado local: `Record<itemId, boolean>`.
- Botón Check-in habilitado solo si **todos** los items activos están marcados (100% o nada). Sin opción de "forzar".
- Botón Check-out igual: requiere todos marcados + entregables devueltos.
- Si el hotel no tiene items configurados, no se exige ninguno (permite operar sin checklist).

### 3. Mensajes
Toast al intentar check-in/out con items faltantes: "Faltan N verificaciones por marcar".

## Archivos afectados
- Migración SQL nueva (tabla + seed).
- `src/integrations/supabase/types.ts` (auto).
- `src/pages/Configuracion.tsx` (o componente equivalente) — nueva pestaña Checklists.
- `src/components/reservas/ReservaDetalleModal.tsx` — render dinámico y validación 100%.
- Posiblemente `src/lib/api.ts` si centraliza llamadas.

## Fuera de alcance
- No se versionan los items marcados por reserva (solo se valida en el momento). Si más adelante quieres auditoría, se agregaría tabla `checklist_reserva`.
