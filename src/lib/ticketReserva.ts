// Ticket imprimible de reserva (80 mm): vista previa e impresión térmica.
import vuloFoxUrl from '@/assets/vulo-fox.png';
import { formatDate, formatDateTime } from '@/lib/dateFormat';
import { getHotelCurrency } from '@/lib/currency';
import {
  getReservationAccountSummary,
  reservationNightsBetween,
  reservationMoney,
} from '@/lib/reservationFinancials';

export type TicketReservaOptions = {
  reserva: any;
  hotel?: any;
  cliente?: any;
  currency?: string;
  locale?: string;
};

const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char] as string));

const row = (label: string, value: unknown, strong = false) =>
  `<div class="r${strong ? ' b' : ''}"><span>${esc(label)}</span><span>${esc(value)}</span></div>`;

const title = (label: string) => `<div class="t">${esc(label)}</div>`;

export function ticketReservaHtml(opts: TicketReservaOptions): string {
  const { reserva = {}, hotel = reserva.hotel || {}, cliente = reserva.cliente || reserva.clientes || {} } = opts;
  const account = getReservationAccountSummary(reserva);
  const activeCurrency = getHotelCurrency();
  const currency = opts.currency || hotel.moneda_codigo || hotel.moneda || activeCurrency.codigo;
  const locale = opts.locale || activeCurrency.locale || 'es-MX';
  const money = (value: unknown) => {
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2,
      }).format(reservationMoney(value));
    } catch {
      return `${activeCurrency.simbolo}${reservationMoney(value).toFixed(2)}`;
    }
  };

  const guestName = reserva.cliente_nombre || [
    cliente.nombre, cliente.apellido_paterno, cliente.apellido_materno,
  ].filter(Boolean).join(' ') || 'Huésped sin nombre';
  const guestPhone = reserva.cliente_telefono || cliente.telefono || '';
  const guestEmail = reserva.cliente_email || cliente.email || '';
  const nights = reservationNightsBetween(reserva.fecha_checkin, reserva.fecha_checkout);
  const adults = reservationMoney(reserva.adultos);
  const children = reservationMoney(reserva.ninos);
  const guests = `${adults} adulto${adults === 1 ? '' : 's'}${children ? ` · ${children} menor${children === 1 ? '' : 'es'}` : ''}`;
  const room = reserva.habitacion_numero || reserva.habitacion?.numero || 'Sin asignar';
  const roomType = reserva.tipo_habitacion_nombre || reserva.tipo_habitacion?.nombre || reserva.habitacion?.tipos_habitacion?.nombre || '';
  const address = [hotel.direccion, hotel.ciudad].filter(Boolean).join(' · ');
  const contact = [hotel.telefono ? `Tel. ${hotel.telefono}` : '', hotel.email || ''].filter(Boolean).join(' · ');
  const payments = [...account.activePayments].sort((a: any, b: any) =>
    String(a.created_at || a.fecha || '').localeCompare(String(b.created_at || b.fecha || '')));
  const charges = [...account.activeCharges].sort((a: any, b: any) =>
    String(a.created_at || '').localeCompare(String(b.created_at || '')));
  const creditPending = Boolean(reserva.salida_credito) && !reserva.credito_liquidado && account.balance > 0.009;
  const balanceLabel = creditPending ? 'PENDIENTE A CRÉDITO' : account.balance <= 0.009 ? 'CUENTA LIQUIDADA' : 'SALDO PENDIENTE';

  const paymentRows = payments.length
    ? payments.map((payment: any) => {
      const method = payment.metodo_pago || payment.metodo || 'Pago';
      const reference = payment.referencia || payment.numero_referencia || '';
      return `<div class="i">
        <div class="r"><span>${esc(method)}</span><span>${esc(money(payment.monto))}</span></div>
        <div class="m">${esc(formatDateTime(payment.created_at || payment.fecha))}${reference ? `<br/>Ref. ${esc(reference)}` : ''}</div>
      </div>`;
    }).join('')
    : '<div class="m">Sin pagos vigentes.</div>';

  const chargeRows = charges.map((charge: any) => {
    const quantity = reservationMoney(charge.cantidad ?? 1) || 1;
    const unit = reservationMoney(charge.precio_unitario ?? charge.precio);
    const total = charge.total ?? charge.subtotal;
    return `<div class="i">
      <div class="r"><span>${esc(charge.concepto || charge.producto_nombre || 'Cargo adicional')}</span><span>${esc(money(total))}</span></div>
      <div class="m">${esc(`${quantity} × ${money(unit)}`)}</div>
    </div>`;
  }).join('');

  const body = [
    hotel.logo_url ? `<img class="hotel-logo" src="${esc(hotel.logo_url)}" alt="Logo del hotel"/>` : '',
    `<div class="c h">${esc(hotel.nombre || 'Hotel')}</div>`,
    address ? `<div class="c m">${esc(address)}</div>` : '',
    contact ? `<div class="c m">${esc(contact)}</div>` : '',
    '<hr/>',
    '<div class="c h">TICKET DE RESERVA</div>',
    `<div class="c folio">${esc(reserva.numero_reserva || String(reserva.id || '').slice(0, 8) || '—')}</div>`,
    `<div class="c m">Impreso ${esc(formatDateTime(new Date().toISOString()))}</div>`,
    '<hr/>',
    title('HUÉSPED'),
    `<div class="b wrap">${esc(guestName)}</div>`,
    guestPhone ? `<div class="m">${esc(guestPhone)}</div>` : '',
    guestEmail ? `<div class="m wrap">${esc(guestEmail)}</div>` : '',
    '<hr/>',
    title('ESTANCIA'),
    row('Estado', reserva.estado || '—'),
    row('Entrada', `${formatDate(reserva.fecha_checkin)}${reserva.hora_llegada ? ` · ${reserva.hora_llegada}` : ''}`),
    row('Salida', `${formatDate(reserva.fecha_checkout)}${reserva.hora_checkout ? ` · ${reserva.hora_checkout}` : ''}`),
    row('Noches', nights),
    row('Habitación', room),
    roomType ? `<div class="m wrap">${esc(roomType)}</div>` : '',
    row('Huéspedes', guests),
    reserva.origen ? row('Origen', reserva.origen) : '',
    '<hr/>',
    title('DETALLE DE LA CUENTA'),
    row(`Hospedaje · ${nights} noche${nights === 1 ? '' : 's'}`, money(account.lodging)),
    chargeRows,
    Math.abs(account.taxes) > 0.009 ? row('Impuestos', money(account.taxes)) : '',
    Math.abs(account.discount) > 0.009 ? row('Descuento', money(-account.discount)) : '',
    Math.abs(account.otherCharges) > 0.009
      ? row(account.otherCharges > 0 ? 'Otros conceptos' : 'Ajuste de reservación', money(account.otherCharges))
      : '',
    '<hr/>',
    row('TOTAL', money(account.total), true),
    row('PAGADO', money(account.paid), true),
    `<div class="balance">${row(balanceLabel, money(Math.max(0, account.balance)), true)}</div>`,
    reserva.salida_credito ? `<div class="c m credit">${esc(reserva.credito_liquidado ? 'Crédito liquidado' : 'Salida autorizada a crédito')}</div>` : '',
    '<hr/>',
    title(`PAGOS REGISTRADOS (${payments.length})`),
    paymentRows,
    reserva.solicitudes_especiales ? `<hr/>${title('SOLICITUDES ESPECIALES')}<div class="m pre">${esc(reserva.solicitudes_especiales)}</div>` : '',
    '<hr/>',
    '<div class="c m">Comprobante interno de reservación.<br/>No es un Comprobante Fiscal Digital por Internet (CFDI).</div>',
    '<div class="c m">Gracias por su preferencia.</div>',
    `<div class="c brand"><img src="${esc(vuloFoxUrl)}" alt=""/><span>Sistema VULO</span></div>`,
    '<div class="c m">vulo.mx · Software para hoteles</div>',
  ].join('');

  return `<!doctype html><html lang="es"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Ticket ${esc(reserva.numero_reserva || 'de reserva')}</title><style>
    @page { size: 80mm auto; margin: 3mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #fff; color: #000; }
    body { width: 80mm; max-width: 100%; padding: 8px; font: 11px/1.4 Arial, Helvetica, sans-serif; }
    .c { text-align: center; } .h { font-size: 14px; font-weight: 700; }
    .hotel-logo { display: block; width: auto; max-width: 48mm; height: auto; max-height: 17mm; object-fit: contain; margin: 0 auto 5px; }
    .folio { margin-top: 2px; font-size: 13px; font-weight: 700; }
    hr { border: 0; border-top: 1px dashed #000; margin: 7px 0; }
    .t { margin: 2px 0 4px; font-size: 10px; font-weight: 700; letter-spacing: .4px; }
    .r { display: flex; align-items: flex-start; justify-content: space-between; gap: 7px; margin: 2px 0; }
    .r span:first-child { min-width: 0; overflow-wrap: anywhere; }
    .r span:last-child { flex-shrink: 0; white-space: nowrap; text-align: right; }
    .b { font-weight: 700; } .m { color: #222; font-size: 9.5px; }
    .i { margin: 0 0 5px; break-inside: avoid; } .wrap { overflow-wrap: anywhere; }
    .balance { margin: 5px -3px 0; padding: 5px 3px; border-top: 1px solid #000; border-bottom: 1px solid #000; font-size: 12px; }
    .credit { margin-top: 4px; } .pre { white-space: pre-wrap; overflow-wrap: anywhere; }
    .brand { display: flex; align-items: center; justify-content: center; gap: 4px; margin-top: 9px; font-size: 10px; font-weight: 700; }
    .brand img { width: 15px; height: 15px; object-fit: contain; }
    @media print { body { padding: 0; } }
  </style></head><body>${body}</body></html>`;
}

export function imprimirTicketReserva(opts: TicketReservaOptions): void {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    iframe.remove();
    throw new Error('El navegador no permitió abrir la impresión.');
  }

  let removed = false;
  const cleanup = () => {
    if (removed) return;
    removed = true;
    iframe.remove();
  };
  win.addEventListener('afterprint', cleanup, { once: true });
  doc.open();
  doc.write(ticketReservaHtml(opts));
  doc.close();

  const images = Array.from(doc.images);
  const ready = images.map((image) => image.complete
    ? Promise.resolve()
    : new Promise<void>((resolve) => {
      image.addEventListener('load', () => resolve(), { once: true });
      image.addEventListener('error', () => resolve(), { once: true });
    }));
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, 1800));

  void Promise.race([Promise.all(ready), timeout]).then(() => {
    if (removed) return;
    win.focus();
    win.print();
    setTimeout(cleanup, 60_000);
  });
}
