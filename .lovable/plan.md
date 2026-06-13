
# Plan: Features gratis (sin cuentas externas)

Voy a entregar en **3 tandas** para que puedas validar después de cada una. Si algo no te gusta, paramos antes de seguir.

---

## TANDA 1 — UX móvil nativa y tiempo real (lo más impactante)

### 1. Sincronización en tiempo real (Supabase Realtime)
- Migración: `ALTER PUBLICATION supabase_realtime ADD TABLE` para `reservas`, `habitaciones`, `tareas_limpieza`, `tareas_mantenimiento`, `pagos`, `notificaciones`.
- Hook nuevo `src/hooks/useRealtimeSync.ts` que invalida queries de React Query cuando llega un cambio.
- Se monta una sola vez en `MainLayout`. Si dos recepcionistas trabajan al mismo tiempo, los cambios aparecen al instante.

### 2. Modo offline básico
- Persistir queries críticas (reservas, habitaciones, tareas) en `localStorage` usando el persister de React Query (`@tanstack/react-query-persist-client` + `@tanstack/query-sync-storage-persister`).
- Banner sticky superior cuando `navigator.onLine === false`: "Sin conexión — viendo datos guardados. Los cambios se sincronizarán al reconectar."
- Cola simple de mutaciones offline en `localStorage` que se reintenta al volver online (solo para acciones idempotentes: cambiar estado de habitación, completar tarea de limpieza). Las acciones complejas (crear reserva, cobrar) se bloquean offline con mensaje claro.

### 3. Drawers móviles (bottom sheet)
- Componente `ResponsiveDialog` (`src/components/ui/responsive-dialog.tsx`) que usa shadcn `Drawer` (vaul) en móvil y `Dialog` en desktop. Misma API que Dialog.
- Reemplazar en: Nueva Reserva, Detalle de Reserva, Registrar Pago, Nueva Tarea, Detalle Habitación.

### 4. Gestos swipe
- Componente `SwipeableCard` con `framer-motion` drag horizontal.
- Reserva: swipe → izquierda = Check-out, derecha = Check-in (con confirmación + haptic feedback vía `navigator.vibrate`).
- Tarea de limpieza: swipe derecha = Completar.
- Solo activo en viewport `< 768px`.

---

## TANDA 2 — Operación y documentos

### 5. Firma digital del huésped
- Componente `SignaturePad` con `<canvas>` táctil (sin librería, ~80 líneas).
- En el modal de check-in: aparece después de verificar datos. Se guarda como base64 PNG en `reservas.firma_huesped` (nueva columna `text`).
- Botón "Limpiar" y "Confirmar firma".

### 6. Reportes PDF
- Librería: `jspdf` + `jspdf-autotable` (todo client-side, sin edge functions).
- 3 reportes desde `/reportes`:
  - **Ocupación**: % por día, habitaciones ocupadas vs disponibles, gráfico simple.
  - **Ingresos**: por método de pago, por concepto, total del período.
  - **Corte de caja**: por turno/usuario, ingresos - egresos del día.
- Cada uno con logo del hotel, rango de fechas configurable, botón "Descargar PDF".

### 7. Compartir por WhatsApp (sin API, solo deep link)
- Botón "Compartir por WhatsApp" en detalle de reserva → abre `https://wa.me/<telefono>?text=<mensaje>` con plantilla precargada (confirmación de reserva, link al recibo, etc.).
- Plantillas configurables ya existen (`whatsapp_templates`), solo hay que conectar el botón.
- No requiere API de WhatsApp Business, usa el handler nativo del SO.

---

## TANDA 3 — Configuración avanzada

### 8. Multi-idioma ES/EN
- Librería: `react-i18next`.
- Archivos `src/locales/es.json` y `src/locales/en.json`.
- Switch en perfil de usuario + auto-detección por `navigator.language`.
- Cobertura: toda la UI pública (`/hotel/:slug`, landing, login, signup) y los textos del huésped en check-in. La parte administrativa interna queda solo en ES por ahora (es para staff mexicano).

### 9. Tarifas dinámicas
- Nueva tabla `tarifas_dinamicas` (hotel_id, tipo_habitacion_id, regla_tipo `temporada|dia_semana|ocupacion`, fecha_inicio, fecha_fin, dia_semana, umbral_ocupacion, multiplicador, precio_fijo, prioridad).
- Función SQL `calcular_precio_dinamico(tipo_habitacion_id, fecha_checkin, fecha_checkout)` que aplica reglas por prioridad.
- UI en `/configuracion/tarifas`: crear/editar reglas con preview de precio resultante.
- Al crear reserva se llama la función y se muestra "Tarifa base $X → Tarifa aplicada $Y (temporada alta)".

### 10. Backups y exportación
- Botón "Exportar todo" en SuperAdmin/Admin: dispara edge function `exportar-hotel` que genera un ZIP con todas las tablas del hotel en JSON + CSV.
- Backups automáticos diarios: cron job (pg_cron) que guarda snapshot JSON en bucket de Storage `backups-hotel` (nuevo, privado), retención 30 días.
- UI muestra lista de backups con botón descargar.

---

## Detalles técnicos

**Dependencias nuevas:**
- `@tanstack/react-query-persist-client`, `@tanstack/query-sync-storage-persister` (offline)
- `jspdf`, `jspdf-autotable` (PDFs)
- `react-i18next`, `i18next`, `i18next-browser-languagedetector` (i18n)
- (`vaul` ya está incluido por shadcn Drawer; `framer-motion` ya está)

**Migraciones SQL:**
- Habilitar realtime en 6 tablas
- Columna `firma_huesped` en `reservas`
- Tabla `tarifas_dinamicas` + función `calcular_precio_dinamico`
- Bucket `backups-hotel` + edge function `exportar-hotel` + cron

**Riesgos:**
- Offline + Realtime conviven bien si invalidamos el cache de RQ al reconectar.
- Swipe puede chocar con scroll vertical — uso `drag="x"` con `dragConstraints` estrictos.
- PDFs grandes (>500 reservas) pueden tardar 3-5s en cliente; añado loader.

---

## ¿Procedemos?

Empiezo con **Tanda 1** completa (Realtime + Offline + Drawers + Swipe). Cuando confirmes que funciona bien, sigo con Tanda 2 y 3.

Si quieres reordenar algo o saltar alguna feature, dímelo ahora.
