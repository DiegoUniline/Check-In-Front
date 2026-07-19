import type { LucideIcon } from 'lucide-react';
import {
  Home,
  CalendarCheck2,
  LogIn,
  LogOut,
  BedDouble,
  Users,
  Sparkles,
  Wrench,
  ShoppingCart,
  Package,
  Boxes,
  ClipboardList,
  Receipt,
  Building2,
  MessageCircle,
  Bot,
  QrCode,
  BarChart3,
  Settings,
  Tag,
  ShieldCheck,
  History,
  FileText,
  Truck,
  CalendarRange,
  UserCog,
  Wallet,
} from 'lucide-react';

export interface GuiaPaso {
  titulo: string;
  detalle: string;
}

export interface Guia {
  ruta: string;
  icono: LucideIcon;
  nombre: string;
  proposito: string;
  cuando: string;
  pasos: GuiaPaso[];
  tips?: string[];
  navegable?: boolean;
}

export const GUIAS: Guia[] = [
  {
    ruta: '/reservas',
    icono: Home,
    nombre: 'Inicio (Calendario)',
    proposito:
      'Vista central del hotel. Aquí ves todas las habitaciones y reservas en calendario, tarjetas o por habitación.',
    cuando:
      'Todo el día. Es tu pantalla principal para saber qué pasa hoy, mañana y en próximos meses.',
    pasos: [
      { titulo: 'Cambiar vista', detalle: 'Usa los chips Calendario · Card · Habitaciones para cambiar cómo se muestran las reservas.' },
      { titulo: 'Navegar fechas', detalle: 'Con Día · Semana · Mes ajustas el rango. El calendario abre un selector rápido de mes/año.' },
      { titulo: 'Filtrar por tipo', detalle: 'Chips Todas · Doble · Sencilla · Triple filtran habitaciones al instante.' },
      { titulo: 'Crear reserva', detalle: 'Arrastra sobre celdas vacías o toca una celda para abrir el formulario de nueva reserva.' },
      { titulo: 'Ver detalle', detalle: 'Da clic sobre una reserva existente para abrir el modal con toda su información, pagos y acciones.' },
    ],
    tips: ['Si filtras y ves vacío es porque no hay reservas en ese rango. Cambia el mes.'],
  },
  {
    ruta: '/check-in',
    icono: LogIn,
    nombre: 'Check-In',
    proposito: 'Registrar la llegada del huésped y activar su estancia.',
    cuando: 'Cuando un huésped llega al hotel, ya sea de reserva o walk-in.',
    pasos: [
      { titulo: 'Buscar reserva', detalle: 'Busca por folio, nombre o teléfono. Si no existe, crea walk-in directo.' },
      { titulo: 'Verificar datos', detalle: 'Confirma nombre, documento, teléfono y correo del huésped.' },
      { titulo: 'Firmar tarjeta', detalle: 'El huésped firma en pantalla. Se genera el PDF de registro automáticamente.' },
      { titulo: 'Entregar habitación', detalle: 'Al confirmar, la habitación pasa a "Ocupada" y se registra hora de entrada.' },
    ],
    tips: ['Puedes reimprimir la tarjeta de registro desde el histórico si el huésped la pide de nuevo.'],
    navegable: false,
  },
  {
    ruta: '/check-out',
    icono: LogOut,
    nombre: 'Check-Out',
    proposito: 'Cerrar la estancia, cobrar saldos pendientes y liberar la habitación.',
    cuando: 'Cuando el huésped se retira del hotel.',
    pasos: [
      { titulo: 'Seleccionar habitación', detalle: 'Elige la habitación ocupada que hará check-out.' },
      { titulo: 'Revisar consumos', detalle: 'Verifica cargos extras (POS, servicios) y pagos ya aplicados.' },
      { titulo: 'Cobrar saldo', detalle: 'Registra el pago final con el método correspondiente (efectivo, tarjeta, transferencia).' },
      { titulo: 'Emitir comprobante', detalle: 'Genera el PDF del comprobante para el huésped e imprímelo si lo requiere.' },
      { titulo: 'Liberar habitación', detalle: 'La habitación pasa a "Sucia" y aparece en Limpieza automáticamente.' },
    ],
    navegable: false,
  },
  {
    ruta: '/habitaciones',
    icono: BedDouble,
    nombre: 'Habitaciones',
    proposito: 'Administrar el inventario de habitaciones del hotel, sus tarifas y estado.',
    cuando: 'Al dar de alta el hotel, o cuando cambian tarifas / se agregan cuartos.',
    pasos: [
      { titulo: 'Nueva habitación', detalle: 'Botón "Nueva habitación". Define número, tipo, capacidad y tarifa base.' },
      { titulo: 'Editar tarifa', detalle: 'Toca la habitación y cambia la tarifa. Aplica al instante en reservas nuevas.' },
      { titulo: 'Cambiar estado', detalle: 'Marca Disponible · Ocupada · Limpieza · Mantenimiento según corresponda.' },
      { titulo: 'Fotos y detalles', detalle: 'Agrega fotos que se mostrarán en la página pública del hotel y en reservas online.' },
    ],
  },
  {
    ruta: '/clientes',
    icono: Users,
    nombre: 'Clientes',
    proposito: 'Base de datos de huéspedes con historial completo de estancias y gasto.',
    cuando: 'Al registrar un huésped nuevo o consultar histórico de un recurrente.',
    pasos: [
      { titulo: 'Crear cliente', detalle: 'Usa el botón "Nuevo cliente" y captura al menos nombre y teléfono con lada (+52 México).' },
      { titulo: 'Ver historial', detalle: 'Da clic en un cliente para ver todas sus reservas, noches y total gastado.' },
      { titulo: 'Vincular chat', detalle: 'Si el número coincide con un chat de WhatsApp, se enlaza automáticamente.' },
    ],
    tips: ['En México captura los 10 dígitos, el sistema agrega el +52 y el 1 para WhatsApp automáticamente.'],
  },
  {
    ruta: '/limpieza',
    icono: Sparkles,
    nombre: 'Limpieza',
    proposito: 'Coordinar al equipo de housekeeping con las habitaciones por limpiar.',
    cuando: 'Después de cada check-out o de forma programada diaria.',
    pasos: [
      { titulo: 'Ver pendientes', detalle: 'Muestra habitaciones marcadas "Sucia" o "En limpieza".' },
      { titulo: 'Asignar tarea', detalle: 'Selecciona la habitación y marca "En proceso" al iniciar la limpieza.' },
      { titulo: 'Marcar limpia', detalle: 'Al terminar, la habitación regresa a "Disponible" y queda lista para reservas.' },
    ],
  },
  {
    ruta: '/mantenimiento',
    icono: Wrench,
    nombre: 'Mantenimiento',
    proposito: 'Registrar y dar seguimiento a fallas o reparaciones en habitaciones.',
    cuando: 'Cuando un huésped o el equipo reporta un problema (fugas, aire, TV, etc.).',
    pasos: [
      { titulo: 'Reportar falla', detalle: 'Botón "Nuevo reporte". Elige habitación, tipo y prioridad.' },
      { titulo: 'Asignar técnico', detalle: 'Selecciona al responsable y define fecha estimada de solución.' },
      { titulo: 'Cerrar reporte', detalle: 'Al reparar, marca "Resuelto". La habitación regresa a disponible.' },
    ],
  },
  {
    ruta: '/pos',
    icono: ShoppingCart,
    nombre: 'Punto de Venta (POS)',
    proposito: 'Vender productos y servicios extra (bar, restaurante, tienda) y cargarlos a habitación o cobrar directo.',
    cuando: 'Cada vez que un huésped o cliente consume algo fuera del hospedaje.',
    pasos: [
      { titulo: 'Elegir productos', detalle: 'Da clic sobre los productos para agregarlos al ticket.' },
      { titulo: 'Cargar a habitación', detalle: 'Selecciona la habitación ocupada y se suma al saldo del check-out.' },
      { titulo: 'Cobrar directo', detalle: 'Elige método de pago para cerrar la venta al momento.' },
    ],
  },
  {
    ruta: '/inventario',
    icono: Package,
    nombre: 'Inventario',
    proposito: 'Controlar existencias de productos que vendes en el POS.',
    cuando: 'Al iniciar operaciones y cada vez que compras o mueves stock.',
    pasos: [
      { titulo: 'Ver stock', detalle: 'Lista con existencias actuales y alertas de bajo stock.' },
      { titulo: 'Ajustar stock', detalle: 'Usa "Ajustes de stock" para correcciones (mermas, faltantes).' },
      { titulo: 'Historial', detalle: 'En "Historial de ajustes" revisas todos los movimientos y quién los hizo.' },
    ],
  },
  {
    ruta: '/productos',
    icono: Boxes,
    nombre: 'Productos',
    proposito: 'Catálogo maestro de productos y servicios que vende el hotel.',
    cuando: 'Al configurar el sistema y cada vez que agregas o cambias precios.',
    pasos: [
      { titulo: 'Nuevo producto', detalle: 'Define nombre, categoría, precio de venta, costo y stock inicial.' },
      { titulo: 'Editar precio', detalle: 'Da clic sobre el producto y actualiza el precio. Aplica desde el próximo ticket.' },
    ],
  },
  {
    ruta: '/compras',
    icono: Truck,
    nombre: 'Compras',
    proposito: 'Registrar entradas de mercancía y compras a proveedores.',
    cuando: 'Cada vez que llega mercancía nueva al hotel.',
    pasos: [
      { titulo: 'Nueva compra', detalle: 'Selecciona proveedor, agrega productos y cantidades.' },
      { titulo: 'Guardar', detalle: 'El stock del inventario se incrementa automáticamente.' },
    ],
  },
  {
    ruta: '/proveedores',
    icono: UserCog,
    nombre: 'Proveedores',
    proposito: 'Directorio de proveedores del hotel.',
    cuando: 'Al dar de alta uno nuevo o consultar datos de contacto.',
    pasos: [
      { titulo: 'Alta proveedor', detalle: 'Captura nombre, RFC, contacto y notas.' },
      { titulo: 'Ver compras', detalle: 'Desde el detalle ves el historial de compras a ese proveedor.' },
    ],
  },
  {
    ruta: '/gastos',
    icono: Wallet,
    nombre: 'Gastos',
    proposito: 'Registrar egresos del hotel que no son compras de inventario (luz, agua, sueldos).',
    cuando: 'Cada vez que sale dinero de la caja u operación.',
    pasos: [
      { titulo: 'Nuevo gasto', detalle: 'Elige categoría, monto, método de pago y descripción.' },
      { titulo: 'Adjuntar comprobante', detalle: 'Sube foto o PDF de la factura si aplica.' },
    ],
  },
  {
    ruta: '/turnos',
    icono: ClipboardList,
    nombre: 'Bitácora de turno',
    proposito: 'Entrega formal entre recepcionistas: qué queda pendiente, incidencias y corte de caja.',
    cuando: 'Al abrir y cerrar cada turno.',
    pasos: [
      { titulo: 'Abrir turno', detalle: 'Registra hora de inicio y monto inicial de caja.' },
      { titulo: 'Notas del turno', detalle: 'Anota incidencias, pendientes y observaciones para el siguiente.' },
      { titulo: 'Cerrar turno', detalle: 'Registra monto final, diferencia y firma de entrega.' },
    ],
  },
  {
    ruta: '/reportes',
    icono: BarChart3,
    nombre: 'Reportes',
    proposito: 'Analizar ingresos, ocupación, ADR y otros indicadores del hotel.',
    cuando: 'Diario, semanal y mensual para toma de decisiones.',
    pasos: [
      { titulo: 'Elegir rango', detalle: 'Filtra por fechas: hoy, semana, mes, año o rango custom.' },
      { titulo: 'Exportar', detalle: 'Descarga a Excel cualquier reporte con el botón "Exportar".' },
    ],
  },
  {
    ruta: '/historial-reservas',
    icono: History,
    nombre: 'Histórico entradas',
    proposito: 'Registro completo de todas las reservas y walk-ins con filtros avanzados.',
    cuando: 'Para buscar una reserva pasada, reimprimir un documento o generar reportes.',
    pasos: [
      { titulo: 'Filtrar rango', detalle: 'Selecciona el rango de fechas (por check-in). Presets: hoy, ayer, mes, año.' },
      { titulo: 'Filtrar por origen', detalle: 'Reserva directa, walk-in, online, WhatsApp, etc.' },
      { titulo: 'Reimprimir PDF', detalle: 'Menú de 3 puntos → Tarjeta de registro o Comprobante.' },
      { titulo: 'Exportar Excel', detalle: 'Botón "Exportar" descarga todo lo filtrado.' },
    ],
  },
  {
    ruta: '/chats',
    icono: MessageCircle,
    nombre: 'WhatsApp / Chats',
    proposito: 'Centro de conversaciones con huéspedes vía WhatsApp con panel CRM al lado.',
    cuando: 'Todo el día para atender clientes que escriben por WhatsApp.',
    pasos: [
      { titulo: 'Abrir chat', detalle: 'Selecciona una conversación de la lista izquierda.' },
      { titulo: 'Panel CRM', detalle: 'A la derecha ves datos del cliente, historial y acciones rápidas.' },
      { titulo: 'Acciones rápidas', detalle: 'Crear cliente, enviar datos bancarios, enviar link de reserva, etc.' },
      { titulo: 'Tomar / soltar IA', detalle: 'Puedes intervenir manualmente y regresar al agente IA cuando quieras.' },
    ],
  },
  {
    ruta: '/whatsapp/agente',
    icono: Bot,
    nombre: 'Agente IA de WhatsApp',
    proposito: 'Configurar la personalidad, reglas y respuestas automáticas del agente IA que atiende WhatsApp.',
    cuando: 'Al activar el asistente y cuando quieras ajustar cómo responde.',
    pasos: [
      { titulo: 'Activar / desactivar', detalle: 'Botón para prender o apagar el agente.' },
      { titulo: 'Personalidad', detalle: 'Define tono (formal, cercano, mexicano) y datos que puede compartir.' },
      { titulo: 'Probar', detalle: 'Envía un WhatsApp de prueba desde tu teléfono para validar.' },
    ],
  },
  {
    ruta: '/whatsapp/conexion',
    icono: QrCode,
    nombre: 'Conexión WhatsApp',
    proposito: 'Vincular el número de WhatsApp del hotel escaneando un QR.',
    cuando: 'Al configurar por primera vez o si se pierde la sesión.',
    pasos: [
      { titulo: 'Generar QR', detalle: 'Toca "Conectar" y espera a que aparezca el QR.' },
      { titulo: 'Escanear', detalle: 'Abre WhatsApp → Dispositivos vinculados → Vincular dispositivo.' },
      { titulo: 'Listo', detalle: 'Una vez conectado, el estado cambia a "En línea".' },
    ],
  },
  {
    ruta: '/temporadas',
    icono: CalendarRange,
    nombre: 'Temporadas',
    proposito: 'Ajustar precios automáticamente por temporadas (alta, baja, especiales).',
    cuando: 'Al planear el año o antes de fechas clave (Semana Santa, verano, diciembre).',
    pasos: [
      { titulo: 'Nueva temporada', detalle: 'Define nombre, fechas y % de incremento/descuento.' },
      { titulo: 'Aplicar', detalle: 'El precio se ajusta automáticamente en reservas dentro de ese rango.' },
    ],
  },
  {
    ruta: '/dashboard',
    icono: BarChart3,
    nombre: 'Dashboard',
    proposito: 'Panorama general del hotel: ingresos, ocupación, reservas del día.',
    cuando: 'Al iniciar el día o en cualquier momento para saber cómo va el negocio.',
    pasos: [
      { titulo: 'KPIs principales', detalle: 'Ingresos del día, ocupación, check-ins y check-outs pendientes.' },
      { titulo: 'Gráficas', detalle: 'Tendencias de ocupación e ingresos por semana/mes.' },
    ],
  },
  {
    ruta: '/configuracion',
    icono: Settings,
    nombre: 'Configuración',
    proposito: 'Datos generales del hotel: nombre, dirección, logo, moneda, impuestos.',
    cuando: 'Al inicio y cuando cambia algún dato del hotel.',
    pasos: [
      { titulo: 'Datos del hotel', detalle: 'Nombre, dirección, ciudad, teléfono, correo — aparecen en documentos PDF.' },
      { titulo: 'Logo', detalle: 'Sube el logo del hotel para PDFs y página pública.' },
      { titulo: 'Impuestos', detalle: 'Define el % de impuesto que se aplica a habitaciones (IVA u otro).' },
      { titulo: 'Zona horaria y moneda', detalle: 'Ajusta según tu país para reportes y fechas correctas.' },
    ],
  },
  {
    ruta: '/catalogos',
    icono: Tag,
    nombre: 'Catálogos',
    proposito: 'Mantener catálogos maestros: tipos de habitación, categorías de productos, métodos de pago.',
    cuando: 'Al configurar el sistema y cuando quieras agregar nuevas opciones.',
    pasos: [
      { titulo: 'Elegir catálogo', detalle: 'Selecciona el catálogo que quieres editar.' },
      { titulo: 'Agregar / editar', detalle: 'Nuevo registro o modifica los existentes.' },
    ],
  },
  {
    ruta: '/usuarios',
    icono: UserCog,
    nombre: 'Usuarios',
    proposito: 'Administrar el personal que usa VULO en el hotel.',
    cuando: 'Al contratar personal nuevo o dar de baja empleados.',
    pasos: [
      { titulo: 'Nuevo usuario', detalle: 'Captura nombre, correo y asigna un rol (Recepción, Housekeeping, etc.).' },
      { titulo: 'Invitar', detalle: 'El usuario recibe un correo para crear su contraseña.' },
    ],
  },
  {
    ruta: '/permisos',
    icono: ShieldCheck,
    nombre: 'Permisos',
    proposito: 'Definir qué puede ver y hacer cada rol dentro del sistema.',
    cuando: 'Al configurar roles o si un empleado necesita más/menos acceso.',
    pasos: [
      { titulo: 'Elegir rol', detalle: 'Selecciona el rol (Admin, Recepción, etc.).' },
      { titulo: 'Marcar accesos', detalle: 'Activa/desactiva vistas y acciones. Guarda al final.' },
    ],
  },
  {
    ruta: '/auditoria',
    icono: FileText,
    nombre: 'Auditoría',
    proposito: 'Bitácora de cambios: quién hizo qué y cuándo dentro del sistema.',
    cuando: 'Para investigar movimientos, correcciones o incidencias.',
    pasos: [
      { titulo: 'Filtrar', detalle: 'Por usuario, módulo o fecha.' },
      { titulo: 'Ver detalle', detalle: 'Cada registro muestra los datos antes y después del cambio.' },
    ],
  },
  {
    ruta: '/reservas-online',
    icono: CalendarCheck2,
    nombre: 'Reservas Online',
    proposito: 'Reservas que llegan desde la página pública del hotel o link compartido.',
    cuando: 'Cada vez que un cliente reserva sin llamar ni escribir por WhatsApp.',
    pasos: [
      { titulo: 'Revisar solicitudes', detalle: 'Lista de reservas pendientes de confirmar.' },
      { titulo: 'Confirmar / rechazar', detalle: 'Aceptar reserva o rechazarla si no hay disponibilidad.' },
    ],
  },
  {
    ruta: '/historial',
    icono: History,
    nombre: 'Historial',
    proposito: 'Historial general de movimientos financieros y de operación.',
    cuando: 'Para auditoría interna o revisar movimientos del día.',
    pasos: [
      { titulo: 'Filtrar rango', detalle: 'Selecciona fechas y tipo de movimiento.' },
      { titulo: 'Exportar', detalle: 'Descarga a Excel para respaldo o contabilidad.' },
    ],
  },
  {
    ruta: '/ajustes-stock',
    icono: Package,
    nombre: 'Ajustes de stock',
    proposito: 'Registrar mermas, robos, cortesías o correcciones de inventario.',
    cuando: 'Al detectar diferencias entre stock físico y sistema.',
    pasos: [
      { titulo: 'Nuevo ajuste', detalle: 'Elige producto, cantidad (+/-) y motivo.' },
      { titulo: 'Guardar', detalle: 'El stock se actualiza y queda registrado en el historial.' },
    ],
  },
  {
    ruta: '/historial-ajustes',
    icono: History,
    nombre: 'Historial de ajustes',
    proposito: 'Ver todos los ajustes de stock hechos, con motivo y responsable.',
    cuando: 'Auditoría de inventario.',
    pasos: [{ titulo: 'Filtrar', detalle: 'Por producto, usuario o rango de fechas.' }],
  },
  {
    ruta: '/admin-plataforma',
    icono: Building2,
    nombre: 'Admin de plataforma',
    proposito: 'Panel exclusivo para el equipo VULO — administración de hoteles cliente.',
    cuando: 'Solo super-administradores.',
    pasos: [{ titulo: 'Gestionar hoteles', detalle: 'Alta, suscripciones y estado de cada hotel cliente.' }],
    navegable: false,
  },
  {
    ruta: '/soporte',
    icono: MessageCircle,
    nombre: 'Soporte',
    proposito: 'Contactar al equipo VULO por WhatsApp si necesitas ayuda humana.',
    cuando: 'Cuando la guía no resuelva tu duda.',
    pasos: [{ titulo: 'Enviar WhatsApp', detalle: 'Toca el botón y se abre WhatsApp con un mensaje prellenado con el nombre de tu hotel.' }],
  },
  {
    ruta: '__default__',
    icono: Receipt,
    nombre: 'VULO',
    proposito:
      'VULO es el sistema todo-en-uno para operar tu hotel: reservas, recepción, WhatsApp, cobranza, inventario y reportes en un solo lugar.',
    cuando: 'Todos los días. Empieza por Inicio (Calendario) y ve moviéndote por el menú lateral.',
    pasos: [
      { titulo: 'Menú lateral', detalle: 'Ahí están todos los módulos agrupados: Principal, Ventas, Inventarios, Compras, Configuración.' },
      { titulo: 'Cambiar de hotel', detalle: 'Arriba a la derecha puedes cambiar entre hoteles si administras varios.' },
      { titulo: 'Asistente VULO', detalle: 'En cada pantalla toca el zorro flotante para ver la guía de esa vista.' },
    ],
  },
];

export function guiaPorRuta(pathname: string): Guia {
  const match = GUIAS.find((g) => g.ruta !== '__default__' && pathname.startsWith(g.ruta));
  return match || (GUIAS.find((g) => g.ruta === '__default__') as Guia);
}