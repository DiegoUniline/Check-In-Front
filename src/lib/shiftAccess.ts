const VIEW_ONLY_ACTIVE_KEY = 'vulo:view-only-without-shift:active';

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
  throw new Error('Estás en modo sólo consulta. Abre un turno para registrar o modificar información.');
};

