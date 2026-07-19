import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import vuloFoxUrl from '@/assets/vulo-fox.png';
import vuloWordmarkUrl from '@/assets/vulo-wordmark.png';

// ============================================================
// Asset loader (URL -> base64 data URL) — sin html2canvas
// ============================================================
const _imageCache = new Map<string, string>();
async function loadImageDataUrl(url: string): Promise<string> {
  if (_imageCache.has(url)) return _imageCache.get(url)!;
  const res = await fetch(url);
  const blob = await res.blob();
  const dataUrl: string = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
  _imageCache.set(url, dataUrl);
  return dataUrl;
}

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

// VULO brand colors
const VULO_NAVY: [number, number, number] = [16, 35, 63];
const VULO_ORANGE: [number, number, number] = [249, 115, 22];
const VULO_TEXT: [number, number, number] = [17, 24, 39];
const VULO_MUTED: [number, number, number] = [100, 116, 139];
const VULO_BORDER: [number, number, number] = [226, 232, 240];

// Constantes de layout (mm). A4 = 210x297.
const HEADER_H = 34; // banda navy superior
const CONTENT_TOP = 46; // inicio de contenido debajo del header
const FOOTER_H = 16;
const MARGIN_X = 14;

interface HeaderAssets {
  fox: string;
  wordmark: string;
}

/**
 * Dibuja el header profesional en la página actual.
 * Banda navy con logo VULO (isotipo + wordmark) e info del hotel.
 */
function drawHeader(
  doc: jsPDF,
  ctx: ReservaPdfCtx,
  titulo: string,
  subtitulo: string | undefined,
  assets: HeaderAssets,
) {
  const pageW = doc.internal.pageSize.getWidth();

  // Banda navy
  doc.setFillColor(...VULO_NAVY);
  doc.rect(0, 0, pageW, HEADER_H, 'F');

  // Acento naranja delgado abajo del header
  doc.setFillColor(...VULO_ORANGE);
  doc.rect(0, HEADER_H, pageW, 1.2, 'F');

  // Isotipo (fox) — cuadrado 18mm
  try {
    doc.addImage(assets.fox, 'PNG', MARGIN_X, 8, 18, 18, undefined, 'FAST');
  } catch { /* noop */ }

  // Wordmark VULO (proporción 1280x480 => 8mm alto, ~21.3mm ancho)
  try {
    doc.addImage(assets.wordmark, 'PNG', MARGIN_X + 22, 11, 22, 8, undefined, 'FAST');
  } catch { /* noop */ }

  // Tagline debajo del wordmark
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text('SOFTWARE PARA HOTELES', MARGIN_X + 22, 23);

  // Info del hotel a la derecha (dentro de la banda)
  if (ctx.hotel) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text(ctx.hotel, pageW - MARGIN_X, 13, { align: 'right' });
    const parts = [ctx.hotelDireccion, ctx.hotelTelefono].filter(Boolean);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(203, 213, 225);
    if (parts[0]) doc.text(String(parts[0]), pageW - MARGIN_X, 19, { align: 'right' });
    if (parts[1]) doc.text(String(parts[1]), pageW - MARGIN_X, 23.5, { align: 'right' });
  }

  // Título del documento debajo del header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...VULO_NAVY);
  doc.text(titulo, MARGIN_X, HEADER_H + 8);

  if (subtitulo) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...VULO_MUTED);
    doc.text(subtitulo, MARGIN_X, HEADER_H + 13);
  }

  doc.setTextColor(...VULO_TEXT);
  doc.setFont('helvetica', 'normal');
}

/**
 * Dibuja el footer profesional con paginación (Página X de Y).
 */
function drawFooter(
  doc: jsPDF,
  texto: string,
  pageNum: number,
  pageCount: number,
) {
  const pageH = doc.internal.pageSize.getHeight();
  const pageW = doc.internal.pageSize.getWidth();
  const yTop = pageH - FOOTER_H;

  // Línea divisora superior
  doc.setDrawColor(...VULO_BORDER);
  doc.setLineWidth(0.3);
  doc.line(MARGIN_X, yTop, pageW - MARGIN_X, yTop);

  // Bloque de texto
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...VULO_MUTED);
  doc.text(texto, MARGIN_X, yTop + 5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...VULO_NAVY);
  doc.text('VULO', pageW / 2, yTop + 5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...VULO_MUTED);
  doc.text('vulo.mx', pageW / 2, yTop + 9, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...VULO_MUTED);
  doc.text(`Página ${pageNum} de ${pageCount}`, pageW - MARGIN_X, yTop + 5, { align: 'right' });
  doc.setFontSize(6.5);
  doc.text(`Generado ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pageW - MARGIN_X, yTop + 9, { align: 'right' });

  // Cuadro de acento naranja abajo
  doc.setFillColor(...VULO_ORANGE);
  doc.rect(MARGIN_X, pageH - 3, 8, 1, 'F');

  doc.setTextColor(...VULO_TEXT);
}

/**
 * Rellena headers y footers en todas las páginas al final.
 * Debe llamarse una sola vez, después de generar todo el contenido.
 */
function paintChrome(
  doc: jsPDF,
  ctx: ReservaPdfCtx,
  titulo: string,
  subtitulo: string | undefined,
  assets: HeaderAssets,
  footerText: string,
) {
  const count = doc.getNumberOfPages();
  for (let i = 1; i <= count; i++) {
    doc.setPage(i);
    drawHeader(doc, ctx, titulo, subtitulo, assets);
    drawFooter(doc, footerText, i, count);
  }
}

function sectionLabel(doc: jsPDF, text: string, y: number) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...VULO_ORANGE);
  doc.text(text.toUpperCase(), 14, y);
  // línea decorativa fina
  const w = doc.getTextWidth(text.toUpperCase());
  doc.setDrawColor(...VULO_ORANGE);
  doc.setLineWidth(0.5);
  doc.line(14 + w + 3, y - 1.2, 14 + w + 12, y - 1.2);
  doc.setTextColor(...VULO_TEXT);
  return y + 5;
}

/** Chip informativo (etiqueta pequeña + valor grande) */
function drawInfoChip(doc: jsPDF, x: number, y: number, w: number, label: string, value: string) {
  doc.setDrawColor(...VULO_BORDER);
  doc.setFillColor(248, 250, 252);
  doc.setLineWidth(0.2);
  doc.roundedRect(x, y, w, 15, 2, 2, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...VULO_MUTED);
  doc.text(label.toUpperCase(), x + 3, y + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...VULO_NAVY);
  doc.text(value, x + 3, y + 11);
  doc.setTextColor(...VULO_TEXT);
}

function nombreCompleto(c: ClienteMin) {
  return [c.nombre, c.apellido_paterno, c.apellido_materno].filter(Boolean).join(' ') || '—';
}

/**
 * Comprobante / confirmación de reserva.
 * Para enviar al huésped al confirmar (email, WhatsApp, descarga).
 */
export async function exportarComprobanteReserva(opts: ReservaPdfCtx & {
  reserva: ReservaMin;
  cliente: ClienteMin;
  action?: 'save' | 'blob';
}): Promise<Blob | void> {
  const { reserva, cliente, currency = 'MXN', action = 'save' } = opts;
  const doc = new jsPDF();
  const assets: HeaderAssets = {
    fox: await loadImageDataUrl(vuloFoxUrl),
    wordmark: await loadImageDataUrl(vuloWordmarkUrl),
  };

  const titulo = 'Confirmación de reserva';
  const subtitulo = `Folio ${reserva.numero_reserva || '—'} · Emitido ${format(new Date(), 'dd/MM/yyyy HH:mm')}`;

  // Reserva espacio del header en autoTable
  const marginTop = CONTENT_TOP + 8;
  let y = marginTop;

  // Chips informativos (folio, check-in, check-out, estado)
  const pageW = doc.internal.pageSize.getWidth();
  const chipW = (pageW - MARGIN_X * 2 - 6) / 4;
  drawInfoChip(doc, MARGIN_X + chipW * 0 + 0, y, chipW, 'Folio', `#${reserva.numero_reserva || '—'}`);
  drawInfoChip(doc, MARGIN_X + chipW * 1 + 2, y, chipW, 'Check-in', format(new Date(reserva.fecha_checkin), 'dd/MM/yyyy'));
  drawInfoChip(doc, MARGIN_X + chipW * 2 + 4, y, chipW, 'Check-out', format(new Date(reserva.fecha_checkout), 'dd/MM/yyyy'));
  drawInfoChip(doc, MARGIN_X + chipW * 3 + 6, y, chipW, 'Estado', String(reserva.estado || 'confirmada').replace(/^./, (c) => c.toUpperCase()));
  y += 22;

  // Huésped
  y = sectionLabel(doc, 'Huésped', y);
  autoTable(doc, {
    startY: y,
    body: [
      ['Nombre', nombreCompleto(cliente)],
      ['Correo', cliente.email || '—'],
      ['Teléfono', cliente.telefono || '—'],
      ['Documento', [cliente.tipo_documento, cliente.numero_documento].filter(Boolean).join(' ') || '—'],
    ],
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: { top: 1.5, bottom: 1.5, left: 0, right: 0 }, textColor: VULO_TEXT },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 32, textColor: VULO_MUTED }, 1: { textColor: VULO_TEXT } },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // Estancia
  y = sectionLabel(doc, 'Estancia', y);
  autoTable(doc, {
    startY: y,
    head: [['Check-in', 'Check-out', 'Noches', 'Habitación', 'Tipo', 'Huéspedes']],
    body: [[
      `${format(new Date(reserva.fecha_checkin), 'dd/MM/yyyy', { locale: es })}${reserva.hora_llegada ? '\n' + reserva.hora_llegada : ''}`,
      format(new Date(reserva.fecha_checkout), 'dd/MM/yyyy', { locale: es }),
      String(reserva.noches || 1),
      reserva.habitacion_numero ? String(reserva.habitacion_numero) : '—',
      reserva.tipo_habitacion_nombre || '—',
      `${reserva.adultos || 0} ad${reserva.ninos ? ` + ${reserva.ninos} niños` : ''}`,
    ]],
    theme: 'grid',
    headStyles: { fillColor: [248, 250, 252], textColor: VULO_MUTED, fontSize: 7, fontStyle: 'bold', lineColor: VULO_BORDER, lineWidth: 0.2 },
    bodyStyles: { fontSize: 9, textColor: VULO_TEXT, lineColor: VULO_BORDER, lineWidth: 0.2 },
    styles: { cellPadding: 3 },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  const subtotal = Number(reserva.subtotal_hospedaje || 0);
  const desc = Number(reserva.descuento || 0);
  const imp = Number(reserva.total_impuestos || 0);
  const total = Number(reserva.total || 0);
  const saldo = Number(reserva.saldo_pendiente ?? total);
  const pagado = total - saldo;

  y = sectionLabel(doc, 'Resumen financiero', y);
  autoTable(doc, {
    startY: y,
    body: [
      ['Subtotal hospedaje', fmtMoney(subtotal, currency)],
      ['Descuento', desc ? `− ${fmtMoney(desc, currency)}` : fmtMoney(0, currency)],
      ['Impuestos', fmtMoney(imp, currency)],
      [{ content: 'Total', styles: { fontStyle: 'bold', fillColor: [248, 250, 252], textColor: VULO_NAVY } },
       { content: fmtMoney(total, currency), styles: { fontStyle: 'bold', fillColor: [248, 250, 252], textColor: VULO_NAVY, halign: 'right' } }],
      ['Pagado', fmtMoney(pagado, currency)],
      [{ content: 'Saldo pendiente', styles: { fontStyle: 'bold', textColor: saldo > 0 ? VULO_ORANGE : [22, 163, 74] } },
       { content: fmtMoney(saldo, currency), styles: { fontStyle: 'bold', textColor: saldo > 0 ? VULO_ORANGE : [22, 163, 74], halign: 'right' } }],
    ],
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: { top: 2.5, bottom: 2.5, left: 4, right: 4 }, textColor: VULO_TEXT, lineColor: VULO_BORDER, lineWidth: 0.15 },
    columnStyles: { 0: { cellWidth: 120, textColor: VULO_MUTED }, 1: { halign: 'right', textColor: VULO_TEXT } },
    didParseCell: (data) => {
      // línea inferior sutil
      if (data.section === 'body') {
        (data.cell.styles as any).lineWidth = { bottom: 0.15, top: 0, left: 0, right: 0 };
      }
    },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  if (reserva.solicitudes_especiales) {
    y = sectionLabel(doc, 'Solicitudes especiales', y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...VULO_TEXT);
    const lines = doc.splitTextToSize(reserva.solicitudes_especiales, 180);
    doc.text(lines, 14, y);
    y += lines.length * 4 + 4;
  }

  paintChrome(doc, opts, titulo, subtitulo, assets, 'Confirmación de reserva · Presente este documento al check-in');

  const filename = `reserva_${reserva.numero_reserva || 'sin-numero'}.pdf`;
  if (action === 'blob') return doc.output('blob');
  doc.save(filename);
}

/**
 * Tarjeta de registro de huésped con firma digital.
 * Genera el PDF al completar el check-in.
 */
export async function exportarRegistroHuesped(opts: ReservaPdfCtx & {
  reserva: ReservaMin;
  cliente: ClienteMin;
  firmaDataUrl?: string | null;
  aceptaTerminos?: boolean;
  action?: 'save' | 'blob';
}): Promise<Blob | void> {
  const { reserva, cliente, firmaDataUrl, aceptaTerminos, currency = 'MXN', action = 'save' } = opts;
  const doc = new jsPDF();
  const assets: HeaderAssets = {
    fox: await loadImageDataUrl(vuloFoxUrl),
    wordmark: await loadImageDataUrl(vuloWordmarkUrl),
  };
  const titulo = 'Tarjeta de registro';
  const subtitulo = `Folio ${reserva.numero_reserva || '—'} · Registrado ${format(new Date(), 'dd/MM/yyyy HH:mm')}`;
  let y = CONTENT_TOP + 8;

  y = sectionLabel(doc, 'Datos del huésped', y);
  autoTable(doc, {
    startY: y,
    body: [
      ['Nombre', nombreCompleto(cliente)],
      ['Documento', [cliente.tipo_documento, cliente.numero_documento].filter(Boolean).join(' ') || '—'],
      ['Nacionalidad', cliente.nacionalidad || '—'],
      ['Correo', cliente.email || '—'],
      ['Teléfono', cliente.telefono || '—'],
    ],
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: { top: 1.5, bottom: 1.5, left: 0, right: 0 }, textColor: VULO_TEXT },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40, textColor: VULO_MUTED }, 1: { textColor: VULO_TEXT } },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  y = sectionLabel(doc, 'Estancia', y);
  autoTable(doc, {
    startY: y,
    head: [['Habitación', 'Check-in', 'Check-out', 'Noches', 'Huéspedes', 'Total']],
    body: [[
      reserva.habitacion_numero ? `${reserva.habitacion_numero}${reserva.tipo_habitacion_nombre ? '\n' + reserva.tipo_habitacion_nombre : ''}` : '—',
      `${format(new Date(reserva.fecha_checkin), 'dd/MM/yyyy', { locale: es })}${reserva.hora_llegada ? '\n' + reserva.hora_llegada : ''}`,
      format(new Date(reserva.fecha_checkout), 'dd/MM/yyyy', { locale: es }),
      String(reserva.noches || 1),
      `${reserva.adultos || 0} ad${reserva.ninos ? ` + ${reserva.ninos} niños` : ''}`,
      fmtMoney(Number(reserva.total || 0), currency),
    ]],
    theme: 'grid',
    headStyles: { fillColor: [248, 250, 252], textColor: VULO_MUTED, fontSize: 7, fontStyle: 'bold', lineColor: VULO_BORDER, lineWidth: 0.2 },
    bodyStyles: { fontSize: 9, textColor: VULO_TEXT, lineColor: VULO_BORDER, lineWidth: 0.2 },
    styles: { cellPadding: 3 },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // Términos
  y = sectionLabel(doc, 'Términos y condiciones', y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...VULO_MUTED);
  const terminos =
    'El huésped declara que los datos consignados son verídicos y acepta las políticas del establecimiento, ' +
    'incluyendo horarios de check-in/out, política de cancelación, cargos por daños y responsabilidad por objetos ' +
    'personales. Se autoriza el tratamiento de datos personales conforme al aviso de privacidad del hotel.';
  const tLines = doc.splitTextToSize(terminos, 180);
  doc.text(tLines, 14, y);
  y += tLines.length * 3.5 + 6;
  doc.setTextColor(...VULO_TEXT);

  if (aceptaTerminos) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(22, 163, 74);
    doc.text('✓ El huésped acepta los términos y condiciones', 14, y);
    doc.setTextColor(...VULO_TEXT);
    y += 6;
  }

  // Firma
  y = sectionLabel(doc, 'Firma del huésped', y + 2);
  const firmaW = 90;
  const firmaH = 32;
  doc.setDrawColor(...VULO_BORDER);
  doc.setLineWidth(0.3);
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
  doc.setTextColor(...VULO_MUTED);
  doc.text(`Firmado el ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, y + firmaH + 4);
  doc.setTextColor(...VULO_TEXT);

  paintChrome(doc, opts, titulo, subtitulo, assets, 'Documento firmado digitalmente · La firma hace fe del acto de registro');

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