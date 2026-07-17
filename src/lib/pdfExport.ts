import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';

export type PdfKpi = { label: string; value: string };
export type PdfTable = { title: string; head: string[]; rows: (string | number)[][] };

export function exportarReportePDF(opts: {
  titulo: string;
  subtitulo?: string;
  hotel?: string;
  periodo?: string;
  kpis?: PdfKpi[];
  tablas?: PdfTable[];
}) {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(20, 30, 60);
  doc.rect(0, 0, pageW, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text(opts.titulo, 14, 14);
  doc.setFontSize(10);
  if (opts.subtitulo) doc.text(opts.subtitulo, 14, 21);

  doc.setTextColor(0, 0, 0);
  let y = 36;
  doc.setFontSize(9);
  if (opts.hotel) {
    doc.text(`Hotel: ${opts.hotel}`, 14, y);
    y += 5;
  }
  if (opts.periodo) {
    doc.text(`Período: ${opts.periodo}`, 14, y);
    y += 5;
  }
  doc.text(`Generado: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, y);
  y += 8;

  // KPIs
  if (opts.kpis?.length) {
    autoTable(doc, {
      startY: y,
      head: [opts.kpis.map((k) => k.label)],
      body: [opts.kpis.map((k) => k.value)],
      theme: 'grid',
      headStyles: { fillColor: [20, 30, 60], textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 11, fontStyle: 'bold', halign: 'center' },
      styles: { cellPadding: 4 },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // Tables
  for (const t of opts.tablas || []) {
    doc.setFontSize(12);
    doc.text(t.title, 14, y);
    autoTable(doc, {
      startY: y + 3,
      head: [t.head],
      body: t.rows.map((r) => r.map((c) => String(c))),
      theme: 'striped',
      headStyles: { fillColor: [60, 80, 120], textColor: 255 },
      styles: { fontSize: 9 },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
    if (y > 260) {
      doc.addPage();
      y = 20;
    }
  }

  // Footer
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`Página ${i} de ${pages}`, pageW - 30, doc.internal.pageSize.getHeight() - 8);
  }

  const filename = `${opts.titulo.replace(/\s+/g, '_').toLowerCase()}_${format(
    new Date(),
    'yyyyMMdd_HHmm',
  )}.pdf`;
  doc.save(filename);
}

// ============================================================
// REPORTES ESPECIALIZADOS (ocupación, ingresos, corte de caja)
// ============================================================

const fmtMoney = (n: number, currency = 'MXN') =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency, maximumFractionDigits: 2 }).format(n || 0);

interface CommonCtx {
  hotel?: string;
  currency?: string;
}

/**
 * Reporte de OCUPACIÓN
 * - % de ocupación día por día en el rango.
 * - Total habitaciones, noches ocupadas, ocupación promedio.
 * - Tabla por habitación: nombre, noches ocupadas, % ocupación.
 */
export function exportarReporteOcupacion(opts: CommonCtx & {
  desde: Date;
  hasta: Date;
  habitaciones: Array<{ id: string; numero: string | number }>;
  reservas: Array<{
    habitacion_id?: string;
    fecha_checkin: string;
    fecha_checkout?: string;
    noches?: number;
    estado?: string;
  }>;
}) {
  const { desde, hasta, habitaciones, reservas } = opts;
  const dias = eachDayOfInterval({ start: desde, end: hasta });
  const totalHab = habitaciones.length || 1;

  // Activas: excluir canceladas
  const activas = reservas.filter((r) => r.estado !== 'Cancelada' && r.estado !== 'NoShow');

  // Map día -> ocupadas
  const ocupadasPorDia = dias.map((d) => {
    const dStr = format(d, 'yyyy-MM-dd');
    const count = activas.filter((r) => {
      const ci = r.fecha_checkin?.slice(0, 10);
      const co = (r.fecha_checkout || r.fecha_checkin)?.slice(0, 10);
      return ci && co && dStr >= ci && dStr < co;
    }).length;
    return { fecha: dStr, label: format(d, 'dd MMM', { locale: es }), ocupadas: count, pct: Math.round((count / totalHab) * 100) };
  });

  const promedio = Math.round(ocupadasPorDia.reduce((s, x) => s + x.pct, 0) / (ocupadasPorDia.length || 1));
  const totalNoches = activas.reduce((s, r) => s + (Number(r.noches) || 1), 0);

  // Por habitación
  const porHab = habitaciones.map((h) => {
    const noches = activas
      .filter((r) => r.habitacion_id === h.id)
      .reduce((s, r) => s + (Number(r.noches) || 1), 0);
    return {
      numero: String(h.numero),
      noches,
      pct: Math.round((noches / (dias.length || 1)) * 100),
    };
  }).sort((a, b) => b.noches - a.noches);

  exportarReportePDF({
    titulo: 'Reporte de Ocupación',
    subtitulo: 'Ocupación por día y por habitación',
    hotel: opts.hotel,
    periodo: `${format(desde, 'dd MMM yyyy', { locale: es })} – ${format(hasta, 'dd MMM yyyy', { locale: es })}`,
    kpis: [
      { label: 'Total habitaciones', value: String(totalHab) },
      { label: 'Noches ocupadas', value: String(totalNoches) },
      { label: 'Días en período', value: String(dias.length) },
      { label: 'Ocupación promedio', value: `${promedio}%` },
    ],
    tablas: [
      {
        title: 'Ocupación por día',
        head: ['Fecha', 'Habs. ocupadas', '% Ocupación'],
        rows: ocupadasPorDia.map((d) => [d.label, `${d.ocupadas} / ${totalHab}`, `${d.pct}%`]),
      },
      {
        title: 'Ocupación por habitación',
        head: ['Habitación', 'Noches', '% del período'],
        rows: porHab.map((h) => [`Hab. ${h.numero}`, h.noches, `${h.pct}%`]),
      },
    ],
  });
}

// ============================================================
// COMPROBANTE DE RESERVA / TARJETA DE REGISTRO (con firma)
// ============================================================

interface ReservaPdfCtx {
  hotel?: string;
  hotelDireccion?: string;
  hotelTelefono?: string;
  hotelLogoUrl?: string;
  currency?: string;
}

interface ReservaMin {
  numero_reserva?: string;
  fecha_checkin: string;
  fecha_checkout: string;
  hora_llegada?: string;
  noches?: number;
  adultos?: number;
  ninos?: number;
  habitacion_numero?: string | number;
  tipo_habitacion_nombre?: string;
  tarifa_noche?: number;
  subtotal_hospedaje?: number;
  descuento?: number;
  total_impuestos?: number;
  total?: number;
  saldo_pendiente?: number;
  solicitudes_especiales?: string | null;
  notas?: string | null;
  estado?: string;
}

interface ClienteMin {
  nombre?: string;
  apellido_paterno?: string;
  apellido_materno?: string;
  email?: string;
  telefono?: string;
  tipo_documento?: string;
  numero_documento?: string;
  nacionalidad?: string;
}

function buildHeader(doc: jsPDF, ctx: ReservaPdfCtx, titulo: string) {
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFillColor(20, 30, 60);
  doc.rect(0, 0, pageW, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text(titulo, 14, 14);
  doc.setFontSize(10);
  if (ctx.hotel) doc.text(ctx.hotel, 14, 22);
  if (ctx.hotelDireccion || ctx.hotelTelefono) {
    doc.setFontSize(8);
    doc.text([ctx.hotelDireccion, ctx.hotelTelefono].filter(Boolean).join(' · '), 14, 27);
  }
  doc.setTextColor(0, 0, 0);
}

function nombreCompleto(c: ClienteMin) {
  return [c.nombre, c.apellido_paterno, c.apellido_materno].filter(Boolean).join(' ') || '—';
}

/**
 * Comprobante / confirmación de reserva.
 * Para enviar al huésped al confirmar (email, WhatsApp, descarga).
 */
export function exportarComprobanteReserva(opts: ReservaPdfCtx & {
  reserva: ReservaMin;
  cliente: ClienteMin;
  action?: 'save' | 'blob';
}): Blob | void {
  const { reserva, cliente, currency = 'MXN', action = 'save' } = opts;
  const doc = new jsPDF();
  buildHeader(doc, opts, 'Confirmación de Reserva');

  let y = 40;
  doc.setFontSize(10);
  doc.text(`Reserva: ${reserva.numero_reserva || '—'}`, 14, y);
  doc.text(`Emitido: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 140, y);
  y += 8;

  autoTable(doc, {
    startY: y,
    head: [['Huésped', 'Contacto', 'Documento']],
    body: [[
      nombreCompleto(cliente),
      [cliente.email, cliente.telefono].filter(Boolean).join('\n') || '—',
      [cliente.tipo_documento, cliente.numero_documento].filter(Boolean).join(' ') || '—',
    ]],
    theme: 'grid',
    headStyles: { fillColor: [60, 80, 120], textColor: 255 },
    styles: { fontSize: 9, cellPadding: 3 },
  });
  y = (doc as any).lastAutoTable.finalY + 4;

  autoTable(doc, {
    startY: y,
    head: [['Check-in', 'Check-out', 'Noches', 'Habitación', 'Tipo', 'Huéspedes']],
    body: [[
      `${format(new Date(reserva.fecha_checkin), 'dd MMM yyyy', { locale: es })}${reserva.hora_llegada ? '\n' + reserva.hora_llegada : ''}`,
      format(new Date(reserva.fecha_checkout), 'dd MMM yyyy', { locale: es }),
      String(reserva.noches || 1),
      reserva.habitacion_numero ? `Hab. ${reserva.habitacion_numero}` : '—',
      reserva.tipo_habitacion_nombre || '—',
      `${reserva.adultos || 0} adultos${reserva.ninos ? ` + ${reserva.ninos} niños` : ''}`,
    ]],
    theme: 'grid',
    headStyles: { fillColor: [60, 80, 120], textColor: 255 },
    styles: { fontSize: 9, cellPadding: 3 },
  });
  y = (doc as any).lastAutoTable.finalY + 4;

  const subtotal = Number(reserva.subtotal_hospedaje || 0);
  const desc = Number(reserva.descuento || 0);
  const imp = Number(reserva.total_impuestos || 0);
  const total = Number(reserva.total || 0);
  const saldo = Number(reserva.saldo_pendiente ?? total);

  autoTable(doc, {
    startY: y,
    head: [['Concepto', 'Monto']],
    body: [
      ['Subtotal hospedaje', fmtMoney(subtotal, currency)],
      ['Descuento', `- ${fmtMoney(desc, currency)}`],
      ['Impuestos', fmtMoney(imp, currency)],
      [{ content: 'TOTAL', styles: { fontStyle: 'bold' } }, { content: fmtMoney(total, currency), styles: { fontStyle: 'bold' } }],
      ['Pagado', fmtMoney(total - saldo, currency)],
      [{ content: 'Saldo pendiente', styles: { fontStyle: 'bold', textColor: [180, 40, 40] } }, { content: fmtMoney(saldo, currency), styles: { fontStyle: 'bold', textColor: [180, 40, 40] } }],
    ],
    theme: 'grid',
    headStyles: { fillColor: [60, 80, 120], textColor: 255 },
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: { 1: { halign: 'right' } },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  if (reserva.solicitudes_especiales) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Solicitudes especiales', 14, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(reserva.solicitudes_especiales, 180);
    doc.text(lines, 14, y);
    y += lines.length * 4 + 4;
  }

  // Footer
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text('Este documento es una confirmación de reserva. Consérvelo para presentar al check-in.', 14, pageH - 10);

  const filename = `reserva_${reserva.numero_reserva || 'sin-numero'}.pdf`;
  if (action === 'blob') return doc.output('blob');
  doc.save(filename);
}

/**
 * Tarjeta de registro de huésped con firma digital.
 * Genera el PDF al completar el check-in.
 */
export function exportarRegistroHuesped(opts: ReservaPdfCtx & {
  reserva: ReservaMin;
  cliente: ClienteMin;
  firmaDataUrl?: string | null;
  aceptaTerminos?: boolean;
  action?: 'save' | 'blob';
}): Blob | void {
  const { reserva, cliente, firmaDataUrl, aceptaTerminos, currency = 'MXN', action = 'save' } = opts;
  const doc = new jsPDF();
  buildHeader(doc, opts, 'Tarjeta de Registro de Huésped');

  let y = 40;
  doc.setFontSize(10);
  doc.text(`Reserva: ${reserva.numero_reserva || '—'}`, 14, y);
  doc.text(`Registrado: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 130, y);
  y += 6;

  autoTable(doc, {
    startY: y,
    head: [['Datos del huésped', '']],
    body: [
      ['Nombre', nombreCompleto(cliente)],
      ['Documento', [cliente.tipo_documento, cliente.numero_documento].filter(Boolean).join(' ') || '—'],
      ['Nacionalidad', cliente.nacionalidad || '—'],
      ['Email', cliente.email || '—'],
      ['Teléfono', cliente.telefono || '—'],
    ],
    theme: 'grid',
    headStyles: { fillColor: [60, 80, 120], textColor: 255 },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 45 } },
  });
  y = (doc as any).lastAutoTable.finalY + 4;

  autoTable(doc, {
    startY: y,
    head: [['Estancia', '']],
    body: [
      ['Habitación', reserva.habitacion_numero ? `Hab. ${reserva.habitacion_numero} — ${reserva.tipo_habitacion_nombre || ''}` : '—'],
      ['Check-in', `${format(new Date(reserva.fecha_checkin), 'dd MMM yyyy', { locale: es })}${reserva.hora_llegada ? ' · ' + reserva.hora_llegada : ''}`],
      ['Check-out', format(new Date(reserva.fecha_checkout), 'dd MMM yyyy', { locale: es })],
      ['Noches', String(reserva.noches || 1)],
      ['Huéspedes', `${reserva.adultos || 0} adultos${reserva.ninos ? ` + ${reserva.ninos} niños` : ''}`],
      ['Total', fmtMoney(Number(reserva.total || 0), currency)],
    ],
    theme: 'grid',
    headStyles: { fillColor: [60, 80, 120], textColor: 255 },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 45 } },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // Términos
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Términos y condiciones', 14, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const terminos =
    'El huésped declara que los datos consignados son verídicos y acepta las políticas del establecimiento, ' +
    'incluyendo horarios de check-in/out, política de cancelación, cargos por daños y responsabilidad por objetos ' +
    'personales. Se autoriza el tratamiento de datos personales conforme al aviso de privacidad del hotel.';
  const tLines = doc.splitTextToSize(terminos, 180);
  doc.text(tLines, 14, y);
  y += tLines.length * 3.5 + 4;

  if (aceptaTerminos) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 120, 30);
    doc.text('✓ El huésped acepta los términos y condiciones', 14, y);
    doc.setTextColor(0, 0, 0);
    y += 6;
  }

  // Firma
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Firma del huésped', 14, y);
  y += 3;
  const firmaW = 90;
  const firmaH = 30;
  doc.setDrawColor(200, 200, 200);
  doc.rect(14, y, firmaW, firmaH);
  if (firmaDataUrl) {
    try {
      doc.addImage(firmaDataUrl, 'PNG', 15, y + 1, firmaW - 2, firmaH - 2);
    } catch (err) {
      console.warn('No se pudo insertar la firma:', err);
    }
  }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text(`Firmado el ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, y + firmaH + 4);
  doc.setTextColor(0, 0, 0);

  const pageH = doc.internal.pageSize.getHeight();
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text('Documento firmado digitalmente. La firma queda almacenada como imagen y hace fe del acto de registro.', 14, pageH - 8);

  const filename = `registro_${reserva.numero_reserva || 'sin-numero'}.pdf`;
  if (action === 'blob') return doc.output('blob');
  doc.save(filename);
}

/**
 * Reporte de INGRESOS
 * - Desglose por método de pago, por concepto/tipo y por día.
 */
export function exportarReporteIngresos(opts: CommonCtx & {
  desde: Date;
  hasta: Date;
  pagos: Array<{
    fecha: string;
    monto: number | string;
    metodo_pago?: string;
    concepto?: string;
    tipo?: string;
  }>;
}) {
  const { desde, hasta, pagos, currency = 'MXN' } = opts;
  const total = pagos.reduce((s, p) => s + Number(p.monto || 0), 0);

  const agrupar = (campo: 'metodo_pago' | 'concepto' | 'tipo') => {
    const map: Record<string, { count: number; monto: number }> = {};
    pagos.forEach((p) => {
      const key = (p as any)[campo] || 'Sin especificar';
      if (!map[key]) map[key] = { count: 0, monto: 0 };
      map[key].count += 1;
      map[key].monto += Number(p.monto || 0);
    });
    return Object.entries(map)
      .map(([k, v]) => ({ key: k, ...v, pct: total > 0 ? Math.round((v.monto / total) * 100) : 0 }))
      .sort((a, b) => b.monto - a.monto);
  };

  const porMetodo = agrupar('metodo_pago');
  const porConcepto = agrupar('concepto');
  const porTipo = agrupar('tipo');

  // Por día
  const porDia: Record<string, number> = {};
  pagos.forEach((p) => {
    const k = (p.fecha || '').slice(0, 10);
    if (k) porDia[k] = (porDia[k] || 0) + Number(p.monto || 0);
  });
  const porDiaRows = Object.entries(porDia)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => [format(new Date(k + 'T00:00:00'), 'dd MMM yyyy', { locale: es }), fmtMoney(v, currency)]);

  exportarReportePDF({
    titulo: 'Reporte de Ingresos',
    subtitulo: 'Desglose por método, concepto y día',
    hotel: opts.hotel,
    periodo: `${format(desde, 'dd MMM yyyy', { locale: es })} – ${format(hasta, 'dd MMM yyyy', { locale: es })}`,
    kpis: [
      { label: 'Total ingresos', value: fmtMoney(total, currency) },
      { label: 'N° de pagos', value: String(pagos.length) },
      { label: 'Ticket promedio', value: fmtMoney(pagos.length ? total / pagos.length : 0, currency) },
    ],
    tablas: [
      {
        title: 'Por método de pago',
        head: ['Método', 'N° pagos', 'Monto', '%'],
        rows: porMetodo.map((r) => [r.key, r.count, fmtMoney(r.monto, currency), `${r.pct}%`]),
      },
      {
        title: 'Por concepto',
        head: ['Concepto', 'N° pagos', 'Monto', '%'],
        rows: porConcepto.map((r) => [r.key, r.count, fmtMoney(r.monto, currency), `${r.pct}%`]),
      },
      {
        title: 'Por tipo',
        head: ['Tipo', 'N° pagos', 'Monto', '%'],
        rows: porTipo.map((r) => [r.key, r.count, fmtMoney(r.monto, currency), `${r.pct}%`]),
      },
      {
        title: 'Por día',
        head: ['Fecha', 'Ingresos'],
        rows: porDiaRows,
      },
    ],
  });
}

/**
 * CORTE DE CAJA del turno/día.
 * - Suma ingresos por método de pago en el rango.
 * - Resta gastos del rango.
 * - Muestra neto y desglose detallado.
 */
export function exportarCorteCaja(opts: CommonCtx & {
  desde: Date;
  hasta: Date;
  /** Nombre del usuario/turno (opcional, ej: "Turno mañana — Juan Pérez") */
  turno?: string;
  pagos: Array<{
    fecha: string;
    monto: number | string;
    metodo_pago?: string;
    concepto?: string;
    numero_pago?: string;
  }>;
  gastos: Array<{
    fecha?: string;
    monto: number | string;
    concepto?: string;
    descripcion?: string;
    metodo_pago?: string;
  }>;
}) {
  const { desde, hasta, pagos, gastos, turno, currency = 'MXN' } = opts;

  // Ingresos por método
  const ingPorMetodo: Record<string, number> = {};
  let totalIng = 0;
  pagos.forEach((p) => {
    const m = p.metodo_pago || 'Sin especificar';
    const v = Number(p.monto || 0);
    ingPorMetodo[m] = (ingPorMetodo[m] || 0) + v;
    totalIng += v;
  });

  // Egresos por método
  const egrPorMetodo: Record<string, number> = {};
  let totalEgr = 0;
  gastos.forEach((g) => {
    const m = g.metodo_pago || 'Sin especificar';
    const v = Number(g.monto || 0);
    egrPorMetodo[m] = (egrPorMetodo[m] || 0) + v;
    totalEgr += v;
  });

  const neto = totalIng - totalEgr;

  // Detalle cronológico
  const detalleRows = [
    ...pagos.map((p) => ({
      fecha: p.fecha,
      tipo: 'Ingreso',
      ref: p.numero_pago || '—',
      concepto: p.concepto || '—',
      metodo: p.metodo_pago || '—',
      monto: Number(p.monto || 0),
    })),
    ...gastos.map((g) => ({
      fecha: g.fecha || '',
      tipo: 'Egreso',
      ref: '—',
      concepto: g.concepto || g.descripcion || '—',
      metodo: g.metodo_pago || '—',
      monto: -Number(g.monto || 0),
    })),
  ]
    .sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''))
    .map((m) => [
      m.fecha ? format(new Date(m.fecha), 'dd/MM HH:mm', { locale: es }) : '—',
      m.tipo,
      m.ref,
      m.concepto,
      m.metodo,
      fmtMoney(m.monto, currency),
    ]);

  exportarReportePDF({
    titulo: 'Corte de Caja',
    subtitulo: turno || 'Movimientos del período',
    hotel: opts.hotel,
    periodo: `${format(desde, 'dd MMM yyyy HH:mm', { locale: es })} – ${format(hasta, 'dd MMM yyyy HH:mm', { locale: es })}`,
    kpis: [
      { label: 'Ingresos', value: fmtMoney(totalIng, currency) },
      { label: 'Egresos', value: fmtMoney(totalEgr, currency) },
      { label: 'NETO', value: fmtMoney(neto, currency) },
    ],
    tablas: [
      {
        title: 'Ingresos por método de pago',
        head: ['Método', 'Monto'],
        rows: Object.entries(ingPorMetodo).map(([k, v]) => [k, fmtMoney(v, currency)]),
      },
      {
        title: 'Egresos por método de pago',
        head: ['Método', 'Monto'],
        rows: Object.entries(egrPorMetodo).map(([k, v]) => [k, fmtMoney(v, currency)]),
      },
      {
        title: 'Detalle de movimientos',
        head: ['Fecha/hora', 'Tipo', 'Ref.', 'Concepto', 'Método', 'Monto'],
        rows: detalleRows,
      },
    ],
  });
}