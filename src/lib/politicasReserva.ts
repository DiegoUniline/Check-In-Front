// Políticas de reserva (misma regla que vulo_validar_politicas_reserva en SQL).

export type PoliticaReserva = {
  id: string;
  nombre: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  min_noches: number | null;
  max_noches: number | null;
  dias_llegada_no_permitidos: number[];
  noche_sola_no_permitida: number[];
  aplica_web?: boolean;
  aplica_recepcion?: boolean;
  activo?: boolean;
  notas?: string | null;
};

export const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const diffDays = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000);

const dow = (day: string) => new Date(`${day}T12:00:00Z`).getUTCDay();

/** Devuelve el motivo por el que la estancia no cumple, o null. Fechas YYYY-MM-DD. */
export function validarPoliticas(politicas: PoliticaReserva[], checkin: string, checkout: string): string | null {
  if (!checkin || !checkout) return null;
  const noches = Math.max(1, diffDays(checkin, checkout));
  const dia = dow(checkin);
  for (const p of politicas) {
    if (p.activo === false) continue;
    if (p.fecha_inicio && checkin < p.fecha_inicio) continue;
    if (p.fecha_fin && checkin > p.fecha_fin) continue;
    if (p.min_noches && noches < p.min_noches) return `${p.nombre}: la estancia mínima es de ${p.min_noches} noches.`;
    if (p.max_noches && noches > p.max_noches) return `${p.nombre}: la estancia máxima es de ${p.max_noches} noches.`;
    if ((p.dias_llegada_no_permitidos || []).includes(dia)) return `${p.nombre}: no se permiten llegadas en ${DIAS_SEMANA[dia].toLowerCase()}.`;
    if (noches === 1 && (p.noche_sola_no_permitida || []).includes(dia)) return `${p.nombre}: no se puede reservar sólo la noche del ${DIAS_SEMANA[dia].toLowerCase()}.`;
  }
  return null;
}

const fmt = (d: string) => {
  const [y, m, day] = d.split('-').map(Number);
  return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(Date.UTC(y, m - 1, day));
};

/** Texto corto para mostrar la política. */
export function describirPolitica(p: PoliticaReserva): string {
  const partes: string[] = [];
  if (p.min_noches) partes.push(`mínimo ${p.min_noches} noches`);
  if (p.max_noches) partes.push(`máximo ${p.max_noches} noches`);
  if (p.dias_llegada_no_permitidos?.length) partes.push(`sin llegadas en ${p.dias_llegada_no_permitidos.map((d) => DIAS_SEMANA[d].toLowerCase()).join(', ')}`);
  if (p.noche_sola_no_permitida?.length) partes.push(`no se reserva sólo la noche del ${p.noche_sola_no_permitida.map((d) => DIAS_SEMANA[d].toLowerCase()).join(' o ')}`);
  const cuando = p.fecha_inicio && p.fecha_fin
    ? `del ${fmt(p.fecha_inicio)} al ${fmt(p.fecha_fin)}`
    : p.fecha_inicio ? `desde el ${fmt(p.fecha_inicio)}`
    : p.fecha_fin ? `hasta el ${fmt(p.fecha_fin)}`
    : 'todo el año';
  return `${cuando}: ${partes.join(' · ') || 'sin restricciones'}`;
}
