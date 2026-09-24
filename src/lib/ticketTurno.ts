// Ticket de cierre de turno (80 mm): se ve en pantalla y se imprime.
import { formatCurrency } from '@/lib/currency';
import { formatDateTime } from '@/lib/dateFormat';

const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
const money = (v: unknown) => formatCurrency(Number(v || 0));
const arr = (v: unknown): any[] => (Array.isArray(v) ? v : []);
const when = (v: unknown) => (v ? formatDateTime(String(v)) : '—');

const row = (label: string, value: string, strong = false) =>
  `<div class="r${strong ? ' b' : ''}"><span>${esc(label)}</span><span>${esc(value)}</span></div>`;
const title = (t: string) => `<div class="t">${esc(t)}</div>`;

export function ticketTurnoHtml(opts: { report: any; turno?: any; hotelNombre?: string }): string {
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

  const lista = (items: any[], render: (x: any) => string, vacio: string) =>
    items.length ? items.map(render).join('') : `<div class="m">${esc(vacio)}</div>`;

  const body = [
    `<div class="c h">${esc(hotelNombre || 'Hotel')}</div>`,
    `<div class="c">CIERRE DE TURNO</div>`,
    '<hr/>',
    row('Responsable', turno.usuario_nombre || '—'),
    row('Apertura', when(period.inicio || turno.abierto_at)),
    row('Cierre', when(period.fin || turno.cerrado_at)),
    row('Entregado a', turno.entrega_a || 'Cierre final'),
    '<hr/>',
    title('CAJA'),
    row('Fondo inicial', money(cash.fondo_inicial ?? turno.fondo_inicial)),
    row('Efectivo recibido', money(cash.efectivo_ingresado ?? turno.ingresos_efectivo)),
    row('Egresos en efectivo', `-${money(cash.egresos_efectivo ?? turno.egresos_efectivo)}`),
    row('Efectivo esperado', money(esperado), true),
    row('Efectivo contado', contado == null ? '—' : money(contado), true),
    row('Diferencia', money(diferencia), true),
    turno.motivo_diferencia ? `<div class="m">Motivo: ${esc(turno.motivo_diferencia)}</div>` : '',
    '<hr/>',
    title('INGRESOS POR MÉTODO'),
    row('Efectivo', money(cash.efectivo_ingresado ?? turno.ingresos_efectivo)),
    row('Tarjeta', money(cash.tarjeta ?? turno.ingresos_tarjeta)),
    row('Transferencia', money(cash.transferencia ?? turno.ingresos_transferencia)),
    row('Otros', money(cash.otros_ingresos ?? turno.otros_ingresos)),
    row('Total ingresos', money(totalIngresos), true),
    '<hr/>',
    title('RECEPCIÓN'),
    row('Reservas creadas', String(recep.reservas_creadas || 0)),
    row('Check-ins', String(recep.checkins || 0)),
    row('Check-outs', String(recep.checkouts || 0)),
    row('Operaciones de estancia', String(recep.operaciones || 0)),
    '<hr/>',
    title('HOTEL AL CIERRE'),
    row('Ocupadas', String(hotel.ocupadas ?? 0)),
    row('Disponibles', String(hotel.disponibles ?? 0)),
    row('Sucias', String(hotel.sucias ?? 0)),
    row('Mantenimiento', String(hotel.mantenimiento ?? 0)),
    row('Llegadas pendientes', String(hotel.llegadas_pendientes ?? 0)),
    row('Salidas pendientes', String(hotel.salidas_pendientes ?? 0)),
    '<hr/>',
    title(`PAGOS (${pagos.cantidad || arr(pagos.detalle).length}) · ${money(pagos.total)}`),
    lista(arr(pagos.detalle), (p) => `<div class="i"><div class="r"><span>${esc(p.huesped || p.reserva || p.concepto || 'Pago')}</span><span>${esc(money(p.monto))}</span></div><div class="m">${esc([p.metodo, p.reserva, p.fecha ? when(p.fecha) : ''].filter(Boolean).join(' · '))}</div></div>`, 'Sin pagos'),
    '<hr/>',
    title(`GASTOS (${gastos.cantidad || arr(gastos.detalle).length}) · ${money(gastos.total)}`),
    lista(arr(gastos.detalle), (g) => `<div class="i"><div class="r"><span>${esc(g.concepto || g.categoria || 'Gasto')}</span><span>${esc(money(g.monto))}</span></div><div class="m">${esc([g.categoria, g.metodo].filter(Boolean).join(' · '))}</div></div>`, 'Sin gastos'),
    '<hr/>',
    title(`VENTAS (${ventas.cantidad || 0}) · ${money(ventas.total)}`),
    lista(arr(ventas.productos), (v) => row(`${v.cantidad || 0} × ${v.producto || 'Producto'}`, money(v.total)), 'Sin ventas'),
    pendientes ? `<hr/>${title('PENDIENTES ENTREGADOS')}<div class="p">${esc(pendientes)}</div>` : '',
    '<hr/>',
    '<div class="f"><div class="s"></div>Entrega</div>',
    '<div class="f"><div class="s"></div>Recibe</div>',
    `<div class="c m">Impreso ${esc(formatDateTime(new Date().toISOString()))}</div>`,
  ].join('');

  return `<!doctype html><html><head><meta charset="utf-8"/><title>Cierre de turno</title><style>
    @page { size: 80mm auto; margin: 3mm; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 8px; width: 80mm; max-width: 100%; font: 12px/1.35 ui-monospace, Menlo, Consolas, monospace; color: #000; background: #fff; }
    .c { text-align: center; } .h { font-size: 15px; font-weight: 700; }
    hr { border: 0; border-top: 1px dashed #000; margin: 6px 0; }
    .t { font-weight: 700; margin: 2px 0 3px; }
    .r { display: flex; justify-content: space-between; gap: 8px; } .r span:first-child { min-width: 0; overflow-wrap: anywhere; } .r span:last-child { white-space: nowrap; }
    .b { font-weight: 700; } .m { font-size: 10.5px; color: #333; } .i { margin-bottom: 3px; }
    .p { white-space: pre-wrap; } .f { margin-top: 22px; text-align: center; font-size: 11px; } .s { border-top: 1px solid #000; margin: 0 16px 2px; }
  </style></head><body>${body}</body></html>`;
}

export function imprimirTicketTurno(opts: { report: any; turno?: any; hotelNombre?: string }) {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  if (!doc) return;
  doc.open();
  doc.write(ticketTurnoHtml(opts));
  doc.close();
  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => iframe.remove(), 1000);
  }, 250);
}
