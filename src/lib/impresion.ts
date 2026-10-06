// Documentos para el agente de impresión (térmica ESC/POS).
// Cada línea: t texto · r fila izq/der · hr separador · sp espacio · firma.
import api from '@/lib/api';
import { formatCurrency } from '@/lib/currency';
import { formatDateTime } from '@/lib/dateFormat';

export type LineaTicket =
  | { k: 't'; s: string; a?: 'c' | 'r'; b?: boolean; g?: boolean }
  | { k: 'r'; l: string; r: string; b?: boolean }
  | { k: 'hr' }
  | { k: 'sp'; n?: number }
  | { k: 'firma'; s: string };

const money = (v: unknown) => formatCurrency(Number(v || 0));
const arr = (v: unknown): any[] => (Array.isArray(v) ? v : []);
const when = (v: unknown) => (v ? formatDateTime(String(v)) : '—');

export function ticketTurnoLineas(opts: { report: any; turno?: any; hotelNombre?: string }): LineaTicket[] {
  const { report = {}, turno = {}, hotelNombre } = opts;
  const cash = report.caja || {};
  const period = report.periodo || {};
  const recep = report.recepcion || {};
  const hotel = report.estado_hotel || {};
  const pagos = report.pagos || {};
  const gastos = report.gastos || {};
  const ventas = report.ventas || {};
  const esperado = Number(cash.efectivo_esperado ?? turno.efectivo_esperado ?? 0);
  const contado = cash.efectivo_contado ?? turno.efectivo_contado;
  const diferencia = Number(cash.diferencia ?? turno.diferencia ?? 0);
  const totalIngresos = Number(cash.efectivo_ingresado ?? turno.ingresos_efectivo ?? 0)
    + Number(cash.tarjeta ?? turno.ingresos_tarjeta ?? 0)
    + Number(cash.transferencia ?? turno.ingresos_transferencia ?? 0)
    + Number(cash.otros_ingresos ?? turno.otros_ingresos ?? 0);
  const pendientes = turno.pendientes_entrega && turno.pendientes_entrega !== '__VULO_SIN_PENDIENTES__' ? turno.pendientes_entrega : '';
  const r = (l: string, v: string, b = false): LineaTicket => ({ k: 'r', l, r: v, b });
  const titulo = (s: string): LineaTicket => ({ k: 't', s, b: true });
  const vacio = (s: string): LineaTicket => ({ k: 't', s });

  return [
    { k: 't', s: hotelNombre || 'Hotel', a: 'c', b: true, g: true },
    { k: 't', s: 'CIERRE DE TURNO', a: 'c', b: true },
    { k: 'hr' },
    r('Responsable', turno.usuario_nombre || '—'),
    r('Apertura', when(period.inicio || turno.abierto_at)),
    r('Cierre', when(period.fin || turno.cerrado_at)),
    r('Entregado a', turno.entrega_a || 'Cierre final'),
    { k: 'hr' },
    titulo('CAJA'),
    r('Fondo inicial', money(cash.fondo_inicial ?? turno.fondo_inicial)),
    r('Efectivo recibido', money(cash.efectivo_ingresado ?? turno.ingresos_efectivo)),
    r('Egresos en efectivo', `-${money(cash.egresos_efectivo ?? turno.egresos_efectivo)}`),
    r('Efectivo esperado', money(esperado), true),
    r('Efectivo contado', contado == null ? '—' : money(contado), true),
    r('Diferencia', money(diferencia), true),
    ...(turno.motivo_diferencia ? [vacio(`Motivo: ${turno.motivo_diferencia}`)] : []),
    { k: 'hr' },
    titulo('INGRESOS POR MÉTODO'),
    r('Efectivo', money(cash.efectivo_ingresado ?? turno.ingresos_efectivo)),
    r('Tarjeta', money(cash.tarjeta ?? turno.ingresos_tarjeta)),
    r('Transferencia', money(cash.transferencia ?? turno.ingresos_transferencia)),
    r('Otros', money(cash.otros_ingresos ?? turno.otros_ingresos)),
    r('Total ingresos', money(totalIngresos), true),
    { k: 'hr' },
    titulo('RECEPCIÓN'),
    r('Reservas creadas', String(recep.reservas_creadas || 0)),
    r('Check-ins', String(recep.checkins || 0)),
    r('Check-outs', String(recep.checkouts || 0)),
    r('Operaciones de estancia', String(recep.operaciones || 0)),
    { k: 'hr' },
    titulo('HOTEL AL CIERRE'),
    r('Ocupadas', String(hotel.ocupadas ?? 0)),
    r('Disponibles', String(hotel.disponibles ?? 0)),
    r('Sucias', String(hotel.sucias ?? 0)),
    r('Mantenimiento', String(hotel.mantenimiento ?? 0)),
    r('Llegadas pendientes', String(hotel.llegadas_pendientes ?? 0)),
    r('Salidas pendientes', String(hotel.salidas_pendientes ?? 0)),
    { k: 'hr' },
    titulo(`PAGOS (${pagos.cantidad || arr(pagos.detalle).length}) · ${money(pagos.total)}`),
    ...(arr(pagos.detalle).length
      ? arr(pagos.detalle).flatMap((p): LineaTicket[] => [
        r(p.huesped || p.reserva || p.concepto || 'Pago', money(p.monto)),
        vacio(`  ${[p.metodo, p.reserva, p.fecha ? when(p.fecha) : ''].filter(Boolean).join(' · ')}`),
      ])
      : [vacio('Sin pagos')]),
    { k: 'hr' },
    titulo(`GASTOS (${gastos.cantidad || arr(gastos.detalle).length}) · ${money(gastos.total)}`),
    ...(arr(gastos.detalle).length
      ? arr(gastos.detalle).flatMap((g): LineaTicket[] => [
        r(g.concepto || g.categoria || 'Gasto', money(g.monto)),
        vacio(`  ${[g.categoria, g.metodo].filter(Boolean).join(' · ')}`),
      ])
      : [vacio('Sin gastos')]),
    { k: 'hr' },
    titulo(`VENTAS (${ventas.cantidad || 0}) · ${money(ventas.total)}`),
    ...(arr(ventas.productos).length
      ? arr(ventas.productos).map((v) => r(`${v.cantidad || 0} × ${v.producto || 'Producto'}`, money(v.total)))
      : [vacio('Sin ventas')]),
    ...(pendientes ? [{ k: 'hr' } as LineaTicket, titulo('PENDIENTES ENTREGADOS'), vacio(pendientes)] : []),
    { k: 'hr' },
    { k: 'firma', s: 'Entrega' },
    { k: 'firma', s: 'Recibe' },
    { k: 'sp' },
    { k: 't', s: `Impreso ${formatDateTime(new Date().toISOString())}`, a: 'c' },
  ];
}

export function imprimirCorteTermica(opts: { report: any; turno?: any; hotelNombre?: string }) {
  const quien = opts.turno?.usuario_nombre ? ` · ${opts.turno.usuario_nombre}` : '';
  return api.imprimir('corte_turno', `Corte de turno${quien}`, ticketTurnoLineas(opts));
}

export const ticketPrueba = (hotelNombre?: string): LineaTicket[] => [
  { k: 't', s: hotelNombre || 'VULO', a: 'c', b: true, g: true },
  { k: 't', s: 'Prueba desde el sistema', a: 'c' },
  { k: 'hr' },
  { k: 'r', l: 'Fecha', r: formatDateTime(new Date().toISOString()) },
  { k: 'r', l: 'Total', r: money(1234.5), b: true },
  { k: 't', s: 'Si lees esto, la impresión desde el sistema funciona.', a: 'c' },
];

/** Agente en línea: revisó la cola en el último minuto. */
export const agenteEnLinea = (agente: any) =>
  Boolean(agente?.ultimo_contacto) && Date.now() - new Date(agente.ultimo_contacto).getTime() < 60_000;
