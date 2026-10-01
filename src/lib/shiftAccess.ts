const VIEW_ONLY_ACTIVE_KEY = 'vulo:view-only-without-shift:active';

// Pantallas administrativas / catálogos que se pueden editar sin turno abierto.
// Todo lo que mueve dinero (pagos, ventas, compras, gastos, reservas) sigue bloqueado.
const ADMIN_PATHS = [
  '/usuarios', '/permisos', '/catalogos', '/habitaciones', '/clientes', '/productos',
  '/proveedores', '/configuracion', '/temporadas', '/politicas-reserva',
  '/whatsapp/agente', '/whatsapp/conexion', '/soporte',
];

export const isAdminPathWithoutShift = (pathname: string) =>
  ADMIN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

export const setShiftViewOnlyActive = (active: boolean) => {
  if (typeof window === 'undefined') return;
  if (active) sessionStorage.setItem(VIEW_ONLY_ACTIVE_KEY, '1');
  else sessionStorage.removeItem(VIEW_ONLY_ACTIVE_KEY);
};

export const isShiftViewOnlyActive = () => (
  typeof window !== 'undefined' && sessionStorage.getItem(VIEW_ONLY_ACTIVE_KEY) === '1'
);

export const assertShiftWriteAllowed = () => {
  if (!isShiftViewOnlyActive()) return;
  if (typeof window !== 'undefined' && isAdminPathWithoutShift(window.location.pathname)) return;
  throw new Error('Estás en modo sólo consulta. Abre un turno para registrar o modificar información.');
};
