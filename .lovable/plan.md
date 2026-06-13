## Objetivo
Que cada pantalla del sistema funcione correctamente en móvil (≤640 px), tablet (641–1024 px) y desktop (>1024 px), sin desbordes horizontales, con tablas usables y formularios cómodos al pulgar.

## Estrategia transversal (aplica a todos los archivos)

1. **Layout base**
   - `MainLayout`/`Header`/`AppSidebar`: el sidebar ya colapsa en móvil; verificar que el botón `Menu` esté siempre visible y que `<main>` use `px-3 sm:px-4 lg:px-6` y `py-4 lg:py-6` sin paddings fijos grandes.
   - Garantizar `overflow-x: hidden` solo en `body`, nunca dentro de contenedores que recortarían dropdowns.

2. **Encabezados de página**
   - Títulos: `text-xl sm:text-2xl lg:text-3xl`.
   - Acciones (botones "Nuevo", filtros): pasar de `flex` a `flex-col sm:flex-row gap-2`, botones `w-full sm:w-auto`.

3. **Grids de KPIs / cards**
   - Reemplazar `grid-cols-3/4/6` por `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-{n}`.

4. **Tablas (patrón "doble vista")**
   - Envolver cada `<Table>` en `<div className="hidden md:block overflow-x-auto">`.
   - Añadir, debajo, una vista mobile `<div className="md:hidden space-y-2">` que recorra los mismos datos y los muestre como `Card` apiladas con las 3–5 columnas más relevantes.
   - Crear helper `src/components/datatable/ResponsiveTable.tsx` que reciba `columns`, `data`, `mobileRender` y aplique el patrón de forma consistente (Reservas, Historial, Clientes, Compras, Gastos, Productos, Inventario, Habitaciones, Catálogos, Turnos, Permisos, Usuarios, Auditoría, etc.).

5. **Formularios y modales**
   - Diálogos: `max-w-[95vw] sm:max-w-lg md:max-w-2xl lg:max-w-4xl`, `max-h-[90vh] overflow-y-auto`.
   - Grids internos: `grid-cols-1 sm:grid-cols-2` (en lugar de `grid-cols-2` fijo).
   - Inputs `h-11` en móvil para áreas táctiles ≥44 px (vía `min-h-11`).
   - Reservas → NuevaReservaModal, ReservaDetalleModal, DetalleReservaModal: revisar pasos del wizard, asegurando que el footer de navegación no se corte.

6. **Filtros y toolbars**
   - Reservas, HistorialReservas, CheckIn, CheckOut, Reportes: convertir las barras `flex gap-3` en `flex-col md:flex-row` con `flex-wrap` y inputs `min-w-0`.
   - Selects de fecha "Desde/Hasta": `grid grid-cols-2 sm:flex` para que en móvil ocupen una fila completa.

7. **Gráficos (Recharts)**
   - Asegurar siempre `ResponsiveContainer` con `width="100%"` y altura `h-[220px] sm:h-[280px] lg:h-[320px]`.
   - En móvil, reducir `tickFormatter` y rotar etiquetas `angle={-25} textAnchor="end"` cuando aplique.
   - Pie charts: ocultar `label` en móvil, mostrar `Legend` debajo.

8. **Sidebar / navegación**
   - Confirmar que `SidebarProvider` cierra el sheet móvil al navegar.
   - El header `Hotel selector` (SuperAdmin) se oculta en `hidden md:flex` (ya está); añadir versión compacta dentro del dropdown de usuario en móvil.

9. **Timeline de reservas** (`TimelineGrid`)
   - Habilitar scroll horizontal con sticky en la primera columna (habitación). En móvil reducir el ancho mínimo del día a 56 px y permitir zoom in/out con dos botones.

10. **POS**
    - Layout dos columnas → en móvil un Drawer inferior para el carrito; productos en grid `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`.

11. **Página pública (`PublicHotel`)**
    - Hero `text-2xl sm:text-4xl`, galería con `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`, calendario `w-full overflow-x-auto`.

12. **Landing**
    - Revisar hero/secciones, tipografías fluidas y CTAs apilados en móvil.

## Trabajo por pantalla (alcance concreto)

- Dashboard, Reservas, HistorialReservas, CheckIn, CheckOut, Limpieza, Mantenimiento, Habitaciones, Catálogos, Productos, Inventario, AjustesStock, HistorialAjustes, Compras, Proveedores, Gastos, Clientes, POS, Turnos, Reportes, Auditoría, Usuarios, Permisos, Configuración, AdminPlataforma, ReservasOnline, Landing, PublicHotel, Login/Signup/Forgot/Reset.
- Componentes compartidos: `MainLayout`, `Header`, `AppSidebar`, `NotificationBell`, `TimelineGrid`/`Toolbar`/`Legend`, `RecepcionGrid`, todos los modales de `src/components/reservas/*`, `PagosMultiplesGrid`, `dashboard/*`, `datatable/*`.

## Verificación
- QA en 360×800, 414×896, 768×1024, 1280×800 y 1920×1080.
- Sin scroll horizontal involuntario en ninguna ruta.
- Todos los modales caben en pantalla y son scrollables internamente.
- Botones táctiles ≥44 px en móvil.
- Tablas: vista cards en `<md`, vista tabla con scroll horizontal en `>=md` cuando supera el ancho.

## Notas técnicas
- Nuevo componente `ResponsiveTable` para evitar duplicar el patrón en 20+ archivos.
- Sin cambios de lógica de negocio ni de esquema.
- Sin nuevas dependencias: solo Tailwind utilities y shadcn primitives existentes (`Drawer`, `Sheet`, `ScrollArea`).
