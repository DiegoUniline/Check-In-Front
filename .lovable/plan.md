## Objetivo
Agregar selector de **moneda** en la configuración del hotel y propagar esa moneda a todas las vistas del sistema (precios, reportes, PDFs, dashboard, POS, etc.).

## Cambios

### 1. Base de datos
- Migración: añadir columnas a `hotels`:
  - `moneda_codigo text not null default 'MXN'` (ISO 4217: MXN, USD, EUR, COP, ARS, CLP, PEN, etc.)
  - `moneda_simbolo text not null default '$'`
  - `moneda_locale text not null default 'es-MX'` (para formato de miles/decimales)

### 2. Configuración (UI)
- En `src/pages/Configuracion.tsx`, sección "Información del hotel", agregar un selector de moneda con presets comunes (MXN, USD, EUR, COP, ARS, CLP, PEN, BRL, GTQ, DOP) que autocompleta código/símbolo/locale. Persistir vía `api.updateHotel`.

### 3. Contexto global de moneda
- Crear `src/lib/currency.ts` con:
  - Variable en memoria + `setHotelCurrency({ codigo, simbolo, locale })`
  - `formatCurrency(amount)` → usa `Intl.NumberFormat(locale, { style:'currency', currency: codigo })`
  - Hook `useCurrency()` (suscripción simple para que componentes re-renderen al cambiar de hotel)
- Cargar la moneda en:
  - `AuthContext` bootstrap y `refreshUser` (junto con timezone), tras leer `hotels.moneda_*`
  - Cambio de hotel del SuperAdmin (`handleHotelChange` en Header)

### 4. Propagación en vistas
Reemplazar usos hardcoded de `$` y `Intl.NumberFormat('es-MX', { currency:'MXN' })` por `formatCurrency()` en:
- Dashboard (`VentasDiaCard`, KPIs, etc.)
- Reservas / Detalle / Nueva reserva / Timeline / Recepción
- Check-In, Check-Out, HistorialReservas
- POS, Productos, Inventario, Compras, Gastos, AjustesStock, HistorialAjustes
- Reportes y `src/lib/pdfExport.ts` (recibirá `formatCurrency` o leerá del contexto)
- `PagosMultiplesGrid`, `PublicHotel`, `ReservasOnline`

Estrategia: búsqueda global de `'$'` y `toLocaleString()` aplicados a montos; refactor centralizado. Se mantienen los símbolos `$` que sean parte de strings no monetarios.

### 5. PDFs / exportes
- `pdfExport.ts` y `exportCsv.ts` reciben moneda activa para encabezados y celdas numéricas.

## Notas técnicas
- Moneda es **solo de presentación**: no se convierten montos almacenados (no hay tipo de cambio). Cambiar de moneda cambia el formato, no recalcula valores históricos.
- Default sigue siendo MXN para no romper hoteles existentes.
- `formatCurrency` tolera `null/undefined/NaN` devolviendo `"$0"` con la moneda activa.
