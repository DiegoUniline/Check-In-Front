# VULO: adaptación móvil y alcance de validación

## Implementación

Se revisaron las rutas declaradas en `src/App.tsx`, sus componentes de navegación, tablas, formularios y ventanas secundarias. La aplicación utiliza React/Vite y Tailwind; no se migró de framework.

| Área | Problemas encontrados y correcciones |
| --- | --- |
| Navegación y estructura | El contenedor principal forzaba `touch-action: pan-y`, bloqueando gestos horizontales. Se permite desplazamiento táctil en ambos ejes; se corrige el tamaño mínimo de hijos flex/grid y se reserva espacio para la navegación inferior en páginas de altura fija. El selector de hotel y el cambio de tema siguen accesibles en el menú móvil. |
| Catálogos | Pestañas, cabeceras y acciones de tipos, categorías, entregables, métodos de pago, descuentos y servicios podían desbordarse. Las pestañas se distribuyen en varias filas y las cabeceras/formularios se apilan en móvil. |
| Tablas y filtros | Tablas con desplazamiento interno, sin comprimir columnas; se conservan acciones, ordenamiento, selección y filtros. Se repararon específicamente las barras de Productos, Usuarios, Historial de Ajustes, Facturación y Administración. Se mantienen las tarjetas móviles que ya existían. |
| Formularios | Cuadrículas de captura a una columna en pantallas pequeñas. Controles adaptables, tamaño de texto de 16 px en móvil y teclados numérico, decimal, teléfono y correo donde corresponde. Ajustes en alta de reserva, pagos, filtros, configuración, temporadas, catálogos y administración. |
| Calendario y recepción | Filas táctiles de 48 px, columna de habitación más estrecha y fechas legibles con desplazamiento interno. Tocar una reserva abre sus acciones; tocar una fecha disponible prepara una reserva con habitación y fecha. Arrastrar y redimensionar con ratón se mantienen en escritorio; las acciones equivalentes de fechas/habitación siguen en los formularios móviles. |
| Ventanas y teclado | Diálogos limitados al viewport visible, contenido desplazable y cierre que permanece accesible al recorrer formularios largos. Selectores, popovers y menús limitados al ancho disponible. Seguimiento de `visualViewport`, áreas seguras y ocultamiento de barras inferiores al detectar teclado. Los paneles laterales respetan el área visible. |
| Check-in/check-out | Formularios y barras de acción revisados; el asistente flotante se coloca por encima de la barra de confirmación. No se cambiaron cobros, entregables, fechas, horarios ni condiciones para confirmar. |
| Chats/WhatsApp | En móvil se navega entre lista y conversación con botón de regreso; la ficha CRM se abre en un panel accesible. Se conservaron las acciones de empresa, cliente y conversación. |
| Imágenes y firma | Reemplazar/eliminar imágenes y acciones de respuestas/notas son visibles en dispositivos sin hover. Se añadieron botones para reordenar fotografías sin arrastrar. El componente de firma conserva el trazo al redimensionar. |
| Sitio público | Se contuvo la cuadrícula de Funciones. Se corrigieron advertencias React de atributos de imágenes y claves en la ilustración de reservas. |

No se modificaron servicios/API, esquema de datos, permisos, tarifas, cálculos de estancia, reglas de ocupación, turnos nocturnos ni validaciones del negocio. Las sustituciones de autenticación y API usadas para probar existen exclusivamente en `scripts/mobile`; no se importan desde producción.

## Pantallas y flujos secundarios inventariados

| Módulos | Revisión secundaria |
| --- | --- |
| Dashboard, reportes, historial, auditoría | Indicadores, gráficos, filtros de fechas, tablas, menús y exportación. |
| Reservas, recepción, llegadas/salidas, expediente | Alta/edición, selección de habitación y huésped, calendario, filtros, cargos, anticipos, resumen y acciones de expediente. |
| Operaciones de estancia | Extensión, salida anticipada, modificación de fechas, early check-in, late check-out, cambio de habitación/categoría, huéspedes adicionales, fuera de servicio, reserva consecutiva, tarifa, descuento, cargos, pagos, subcuentas, no-show, cancelación, reapertura y correcciones. |
| Reservas en línea y políticas | Revisión de solicitudes, disponibilidad, aceptación/rechazo y configuración de políticas. |
| Habitaciones, clientes, limpieza, mantenimiento | Altas/ediciones, detalles, menús, fotografías, documentos, tareas y tickets. |
| POS, inventario, productos, ajustes | Catálogo, cobro, búsquedas, filtros, existencias, ajustes y movimientos. |
| Turnos, cierre de día, gastos, compras, proveedores, facturación | Apertura/cierre, conteo, entrega, bitácora, revisión de movimientos, formularios, comprobantes y órdenes. |
| Configuración, usuarios, permisos, administración | Todas las pestañas; hotel, reservas en línea, WhatsApp, checklists, impresión, pagos, notificaciones, apariencia, perfiles y planes. |
| Chats, agente y conexión WhatsApp, soporte | Lista/hilo/CRM, edición de contacto, respuestas rápidas, notas, acciones de empresa, conexión y ayuda. |
| Acceso y páginas públicas | Inicio de sesión, registro, recuperación, motor del hotel, marketing y páginas legales. |

La revisión estructural de estos flujos no equivale a haber ejecutado todas las combinaciones de datos y permisos contra un hotel real.

## Pruebas reproducibles

El arnés empaqueta el `App` real con esbuild y datos ficticios, utiliza el CSS generado por Vite y bloquea todas las solicitudes externas. No inicia sesiones reales ni escribe en hoteles. Playwright ejecuta Chromium con viewport táctil. Los resultados detallados están en `mobile-validation.json`.

```bash
npm run build
node scripts/mobile/build-harness.mjs
# Playwright debe estar instalado en el entorno de pruebas.
# Se puede indicar su ruta absoluta mediante PLAYWRIGHT_MODULE.
# CHROMIUM_PATH permite usar un ejecutable Chromium ya instalado.
node scripts/mobile/audit.mjs
node scripts/mobile/interactions.mjs
npx tsc --noEmit -p tsconfig.app.json
node --test scripts/test-reservation-dates.mjs scripts/test-online-reservations.mjs
```

`MOBILE_AUDIT_DIR` cambia el directorio de artefactos (por defecto `/tmp/vulo-mobile-audit`). `MOBILE_ROUTES`, `MOBILE_WIDTHS` y `MOBILE_CASES` permiten repetir casos concretos; `MOBILE_RESULTS_FILE` conserva resultados de una repetición en otro archivo. Los procesos devuelven código distinto de cero ante fallos.

- Matriz de rutas: 58 rutas concretas × 9 anchos = 522 comprobaciones. Anchos: **320, 360, 375, 390, 414, 430, 768, 1024 y 1440 px**, altura 844 px. Inspección de desbordamiento de página, controles fuera del viewport, excepciones y errores de consola en los estados iniciales cargados.
- **57 casos de interacción aprobados**: apertura, recorrido y cierre de formularios, todas las pestañas de Catálogos/Configuración/Reportes/Inventario, selección de fecha, acciones del calendario, gestos horizontales, CRM, navegación y asistente; conservación de datos tras error de guardado simulado; formularios de operaciones de estancia; firma y reordenación de imágenes. El guardado de proveedor se probó únicamente contra la API ficticia.
- Viewport reducido a 320 × 400 px: el diálogo sigue dentro de pantalla y conserva la captura. Es una simulación de espacio reducido, no una prueba del teclado nativo de iOS/Android.
- Las 22 pruebas existentes de fechas, ocupación, paginación y reservas en línea pasan. Se completaron los mocks de `matchMedia` y bloqueos en JSDOM para que sigan verificando el comportamiento de escritorio del calendario.
- `npm run build`, TypeScript y `git diff --check` pasan. La compilación mantiene avisos existentes sobre tamaño de bundle, Browserslist/PostCSS; no son errores de compilación.

## Pendientes de validación real

No se certifica todavía el funcionamiento integral en todos los teléfonos. Faltan pruebas con una sesión de hotel de prueba y dispositivos físicos:

1. Safari/iPhone y Chrome/Android reales: teclado virtual, barras dinámicas, áreas seguras, rotación, cámara/archivos y gestos nativos. Chromium táctil no sustituye Safari/WebKit.
2. Persistencia y errores reales de crear/editar reservas, registrar huéspedes, check-in, cobros, check-out, cierre de caja, compras y cambios sensibles. Las pruebas UI de las ventanas de operación **no aplicaron esos cambios al backend**.
3. Permisos de cada rol, concurrencia entre recepcionistas, volúmenes reales, reservas vencidas y casos de turno nocturno con datos de negocio.
4. Integraciones externas: envío de WhatsApp, conexión del agente, comprobantes, impresión térmica/PDF, exportaciones, cámara y almacenamiento de imágenes reales.
5. Estados secundarios que necesitan registros específicos no presentes en los fixtures: tareas/tickets históricos, comprobantes reales, reaperturas/reversiones con historial completo y todas las variantes de administración de cuentas/suscripciones.

Las limitaciones anteriores se dejan explícitas para no confundir verificación visual/UI con una certificación end-to-end de producción.

## Rutas de la matriz

`/login`, `/signup`, `/forgot-password`, `/reset-password`, `/`, `/funciones`, `/precios`, `/empresa`, `/contacto`, `/ayuda`, `/features`, `/pricing`, `/about`, `/contact`, `/legal/privacidad`, `/legal/terminos`, `/legal/seguridad`, `/h/demo`, `/admin-plataforma`, `/dashboard`, `/reservas`, `/reservas/nueva`, `/reservas/detalle/r1`, `/reservas/checkin`, `/reservas/checkout`, `/politicas-reserva`, `/reservas-online`, `/chats`, `/whatsapp/agente`, `/whatsapp/conexion`, `/habitaciones`, `/clientes`, `/limpieza`, `/mantenimiento`, `/pos`, `/inventario`, `/productos`, `/ajustes-stock`, `/historial-ajustes`, `/reportes`, `/configuracion`, `/catalogos`, `/temporadas`, `/soporte`, `/checkin/r1`, `/checkout/r2`, `/turnos`, `/cierre-dia`, `/gastos`, `/compras`, `/proveedores`, `/historial`, `/facturacion`, `/historial-reservas`, `/usuarios`, `/permisos`, `/auditoria`, `/gerencia`.
