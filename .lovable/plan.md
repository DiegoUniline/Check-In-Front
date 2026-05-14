# Plan: Landing comercial + reservas públicas por hotel

## 1. Landing comercial de HospedApp (`/`)
- Nueva ruta pública `/` con landing simple de **una sección**: hero con propuesta de valor, mini-features (3-4 íconos), CTA "Probar demo" → `/login` y "Crear mi hotel" → `/signup`.
- Mover el dashboard actual de `/` a `/app` (o similar) y proteger con auth.
- Mantener estilo del sistema actual (mismos tokens/colores).

## 2. Cambios de base de datos (migración)
- `hotels`: agregar `slug TEXT UNIQUE`, `descripcion_publica TEXT`, `permite_reservas_online BOOL DEFAULT false`, `requiere_anticipo BOOL DEFAULT false`, `porcentaje_anticipo NUMERIC DEFAULT 0`.
- `tipos_habitacion`: agregar `publico BOOL DEFAULT false`, `fotos TEXT[]`.
- `habitaciones`: agregar `excluida_publica BOOL DEFAULT false` (override por habitación individual).
- Generar slug automático desde `nombre` para hoteles existentes.
- **RLS público**: políticas SELECT `anon` (no autenticado) sobre `hotels`, `tipos_habitacion` (filtrado por `publico=true`), `habitaciones` (no excluidas), y `reservas` (solo para validar disponibilidad por fechas). Política INSERT `anon` sobre `reservas` y `clientes` con validaciones (campos requeridos, fechas válidas, hotel_id existe).

## 3. Configuración por hotel (en sistema)
- En `Configuracion.tsx` (o nueva pestaña "Reservas Online"):
  - Toggle "Permitir reservas desde web pública"
  - Slug editable + preview de URL `hospedapp.com/h/{slug}`
  - Toggle anticipo + % anticipo
  - Texto descriptivo público
- En `Catalogos.tsx` (Tipos de habitación): toggle "Publicar este tipo en web" + subir fotos.
- En `Habitaciones.tsx`: toggle "Excluir de reservas online" por habitación.

## 4. Página pública de reservas `/h/:slug`
Ruta pública sin auth con:
- **Header**: nombre del hotel, logo, datos de contacto.
- **Selector de fechas** (check-in / check-out) + adultos/niños.
- **Listado de tipos disponibles**: foto, nombre, descripción, precio/noche, capacidad, botón "Reservar".
  - Cálculo de disponibilidad: total habitaciones del tipo (no excluidas) menos reservas que se traslapan en esas fechas.
  - Si 0 disponibles → badge "No disponible".
- **Modal de reserva**: datos del cliente (nombre, email, tel, documento), resumen, total, anticipo si aplica.
  - Sin pago: crea cliente + reserva estado `Pendiente`, muestra confirmación con número de reserva.
  - Con anticipo: por ahora marcar como "pago pendiente por transferencia" con instrucciones (integrar Stripe es trabajo aparte; lo dejamos preparado pero no activo en este paso, salvo que confirmes después).

## 5. Realtime (lo "inmediato")
- `ALTER PUBLICATION supabase_realtime ADD TABLE reservas, habitaciones;`
- En la página pública: suscripción a cambios en `reservas` del hotel para refrescar disponibilidad al instante (si alguien reserva o el hotel bloquea, la disponibilidad cambia en vivo).
- En el sistema interno: las reservas creadas desde web aparecen al instante en `Reservas.tsx` (ya existe el listado; sumar canal realtime si no está).

## 6. Detalles técnicos
- Ruta pública en `App.tsx` antes del guard de auth.
- Cliente Supabase ya soporta llamadas `anon` con la publishable key — usar las mismas instancias.
- Validación con `zod` en el formulario público.
- Generar `numero_reserva` con patrón `RES-YYYY-XXXX`.
- Memoria del proyecto: añadir nota sobre "Reservas Online Públicas".

## Archivos principales a tocar
- Nueva migración SQL.
- `src/App.tsx` (rutas).
- Nuevos: `src/pages/Landing.tsx`, `src/pages/PublicHotel.tsx`, `src/pages/PublicHotel/*` (componentes).
- `src/pages/Configuracion.tsx`, `src/pages/Catalogos.tsx`, `src/pages/Habitaciones.tsx`.
- `mem://features/reservas-publicas` (nueva memoria).

## Fuera de alcance (te aviso para confirmar después)
- Pago real con Stripe en línea (puedo activarlo en un siguiente paso con `enable_stripe_payments`).
- Subdominios por hotel (quedó descartado, usamos slug).
- Galería de imágenes con upload a storage (puedo agregarla; por ahora dejo el campo `fotos[]` listo y un input de URLs).

¿Procedo con esto tal cual o quieres ajustar algo (ej: incluir Stripe ahora, o el upload real de fotos)?