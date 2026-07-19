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

// Carga una imagen y la convierte a PNG data URL (jsPDF no soporta WebP nativo).
const _pngCache = new Map<string, string>();
async function loadImageAsPng(url: string): Promise<string> {
  if (_pngCache.has(url)) return _pngCache.get(url)!;
  const src = await loadImageDataUrl(url);
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = src;
  });
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d');
  ctx.drawImage(img, 0, 0);
  const png = canvas.toDataURL('image/png');
  _pngCache.set(url, png);
  return png;
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
  hotelEmail?: string;
  hotelCiudad?: string;
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

  // ===== ENCABEZADO: SOLO datos del hotel =====
  // Izquierda: nombre + dirección
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text(ctx.hotel || 'Hotel', MARGIN_X, 13);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225); // slate-300
  if (ctx.hotelDireccion) doc.text(String(ctx.hotelDireccion), MARGIN_X, 19);

  // Derecha: teléfono / contacto
  if (ctx.hotelTelefono) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(203, 213, 225);
    doc.text(`Tel. ${ctx.hotelTelefono}`, pageW - MARGIN_X, 13, { align: 'right' });
  }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225);
  doc.text(format(new Date(), "dd/MM/yyyy · HH:mm"), pageW - MARGIN_X, 19, { align: 'right' });
  // Nota: se omite el logo/branding VULO en el encabezado — sólo aparece en el pie de página.

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
  foxDataUrl?: string,
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

  // Centro: isotipo VULO + "Sistema VULO"
  const centerX = pageW / 2;
  if (foxDataUrl) {
    try {
      doc.addImage(foxDataUrl, 'PNG', centerX - 12, yTop + 1.5, 6, 6, undefined, 'FAST');
    } catch { /* noop */ }
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...VULO_NAVY);
  doc.text('Sistema VULO', centerX - 4, yTop + 5.5, { align: 'left' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...VULO_MUTED);
  doc.text('vulo.mx · Software para hoteles', centerX, yTop + 9.5, { align: 'center' });

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
    drawFooter(doc, footerText, i, count, assets.fox);
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
  // ===== Diseño B/N clásico — mismo que la Tarjeta de registro =====
  const doc = new jsPDF({ unit: 'mm', format: 'letter' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 20;
  const contentW = pageW - M * 2;

  const BLACK: [number, number, number] = [17, 24, 39];
  const GRAY_600: [number, number, number] = [75, 85, 99];
  const GRAY_500: [number, number, number] = [107, 114, 128];
  const GRAY_400: [number, number, number] = [156, 163, 175];
  const GRAY_200: [number, number, number] = [229, 231, 235];
  const GRAY_700: [number, number, number] = [55, 65, 81];

  let foxData: string | null = null;
  try { foxData = await loadImageDataUrl(vuloFoxUrl); } catch { /* noop */ }

  const fmtFecha = (d: Date | string) => format(new Date(d), 'dd/MM/yyyy', { locale: es });
  const nowLabel = format(new Date(), 'dd/MM/yyyy HH:mm');
  const folio = reserva.numero_reserva || '—';

  // --- 1. ENCABEZADO — SOLO datos del hotel ---
  let y = M;
  // Logo del hotel (opcional) — cuadro 18x18mm a la izquierda
  let headerX = M;
  if (opts.hotelLogoUrl) {
    try {
      const logoData = await loadImageAsPng(opts.hotelLogoUrl);
      doc.addImage(logoData, 'PNG', M, y, 18, 18, undefined, 'FAST');
      headerX = M + 22;
    } catch { /* noop */ }
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...BLACK);
  doc.text(opts.hotel || 'Hotel', headerX, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...GRAY_600);
  let ly = y + 11;
  const dirLinea = [opts.hotelDireccion, opts.hotelCiudad].filter(Boolean).join(', ');
  const leftMaxW = pageW - M - headerX - 72; // reserva espacio al bloque derecho
  if (dirLinea) {
    const wrapped = doc.splitTextToSize(dirLinea, leftMaxW) as string[];
    wrapped.forEach((ln) => { doc.text(ln, headerX, ly); ly += 4.5; });
  }
  const contacto = [opts.hotelTelefono ? `Tel. ${opts.hotelTelefono}` : '', opts.hotelEmail || '']
    .filter(Boolean)
    .join('  ·  ');
  if (contacto) {
    const wrapped = doc.splitTextToSize(contacto, leftMaxW) as string[];
    wrapped.forEach((ln) => { doc.text(ln, headerX, ly); ly += 4.5; });
  }

  const rightX = pageW - M;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...GRAY_500);
  doc.setCharSpace(0.4);
  doc.setCharSpace(0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...BLACK);
  doc.text(`Folio ${folio}`, rightX, y + 11.5, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...GRAY_500);
  doc.text(`Emitido ${nowLabel}`, rightX, y + 16, { align: 'right' });

  y = Math.max(ly + 3, y + 20);
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.6);
  doc.line(M, y, pageW - M, y);
  y += 10;

  const sectionTitle = (label: string, yy: number) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...GRAY_500);
    doc.setCharSpace(0.5);
    doc.text(label.toUpperCase(), M, yy);
    doc.setCharSpace(0);
    return yy + 6;
  };

  // --- 2. DATOS DEL HUÉSPED ---
  y = sectionTitle('Datos del huésped', y);
  const filas: Array<{ label: string; value: string; bold?: boolean }> = [];
  const nombre = nombreCompleto(cliente);
  if (nombre && nombre !== '—') filas.push({ label: 'Nombre', value: nombre, bold: true });
  const docStr = [cliente.tipo_documento, cliente.numero_documento].filter(Boolean).join(' ');
  if (docStr) filas.push({ label: 'Documento', value: docStr });
  if (cliente.email) filas.push({ label: 'Correo', value: cliente.email });
  if (cliente.telefono) filas.push({ label: 'Teléfono', value: cliente.telefono });

  const labelW = contentW * 0.3;
  const valueX = M + labelW;
  filas.forEach((f) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...GRAY_500);
    doc.text(f.label, M, y + 3.5);
    doc.setFont('helvetica', f.bold ? 'bold' : 'normal');
    doc.setTextColor(...BLACK);
    doc.text(f.value, valueX, y + 3.5);
    doc.setDrawColor(...GRAY_200);
    doc.setLineWidth(0.15);
    doc.line(M, y + 5.5, pageW - M, y + 5.5);
    y += 6.5;
  });
  y += 4;

  // --- 3. ESTANCIA ---
  y = sectionTitle('Estancia', y);
  const cols = ['Habitación', 'Check-in', 'Check-out', 'Noches', 'Huéspedes', 'Estado'];
  const weights = [1.1, 1.4, 1.2, 0.8, 1.1, 1.2];
  const wSum = weights.reduce((a, b) => a + b, 0);
  const colX: number[] = [];
  let acc = M;
  weights.forEach((w) => { colX.push(acc); acc += (w / wSum) * contentW; });
  colX.push(pageW - M);

  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.35);
  doc.line(M, y, pageW - M, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...GRAY_700);
  cols.forEach((c, i) => {
    doc.text(c, colX[i] + 1, y + 4);
  });
  doc.setDrawColor(...GRAY_400);
  doc.setLineWidth(0.18);
  doc.line(M, y + 6, pageW - M, y + 6);

  const hab = reserva.habitacion_numero
    ? `${reserva.habitacion_numero}${reserva.tipo_habitacion_nombre ? ' · ' + reserva.tipo_habitacion_nombre : ''}`
    : '—';
  const ci = `${fmtFecha(reserva.fecha_checkin)}${reserva.hora_llegada ? ' · ' + reserva.hora_llegada : ''}`;
  const co = fmtFecha(reserva.fecha_checkout);
  const noches = String(reserva.noches || 1);
  const huesp = `${reserva.adultos || 0}${reserva.ninos ? ' + ' + reserva.ninos : ''}`;
  const estado = String(reserva.estado || 'confirmada').replace(/^./, (c) => c.toUpperCase());
  const values = [hab, ci, co, noches, huesp, estado];

  const rowY = y + 11;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...BLACK);
  values.forEach((v, i) => {
    const maxW = (colX[i + 1] - colX[i]) - 2;
    const lines = doc.splitTextToSize(v, maxW);
    doc.text(lines[0], colX[i] + 1, rowY);
  });
  y = rowY + 5;

  // --- 4. RESUMEN FINANCIERO ---
  y = sectionTitle('Resumen financiero', y + 3);
  const subtotal = Number(reserva.subtotal_hospedaje || 0);
  const desc = Number(reserva.descuento || 0);
  const imp = Number(reserva.total_impuestos || 0);
  const total = Number(reserva.total || 0);
  const saldo = Number(reserva.saldo_pendiente ?? total);
  const pagado = total - saldo;

  const finanzas: Array<{ label: string; value: string; bold?: boolean; separator?: 'top' | 'bottom' | 'both' }> = [
    { label: 'Subtotal hospedaje', value: fmtMoney(subtotal, currency) },
    { label: 'Descuento', value: desc ? `− ${fmtMoney(desc, currency)}` : fmtMoney(0, currency) },
    { label: 'Impuestos', value: fmtMoney(imp, currency) },
    { label: 'Total', value: fmtMoney(total, currency), bold: true, separator: 'both' },
    { label: 'Pagado', value: fmtMoney(pagado, currency) },
    { label: 'Saldo pendiente', value: fmtMoney(saldo, currency), bold: true },
  ];

  finanzas.forEach((f) => {
    if (f.separator === 'top' || f.separator === 'both') {
      doc.setDrawColor(...BLACK);
      doc.setLineWidth(0.3);
      doc.line(M, y, pageW - M, y);
      y += 1;
    }
    doc.setFont('helvetica', f.bold ? 'bold' : 'normal');
    doc.setFontSize(f.bold ? 10.5 : 10);
    doc.setTextColor(...(f.bold ? BLACK : GRAY_600));
    doc.text(f.label, M, y + 4);
    doc.setTextColor(...BLACK);
    doc.text(f.value, pageW - M, y + 4, { align: 'right' });
    y += 5.5;
    if (f.separator === 'bottom' || f.separator === 'both') {
      doc.setDrawColor(...BLACK);
      doc.setLineWidth(0.3);
      doc.line(M, y, pageW - M, y);
      y += 1;
    } else {
      doc.setDrawColor(...GRAY_200);
      doc.setLineWidth(0.12);
      doc.line(M, y, pageW - M, y);
    }
    y += 0.8;
  });
  y += 3;

  // --- 5. SOLICITUDES ---
  if (reserva.solicitudes_especiales) {
    y = sectionTitle('Solicitudes especiales', y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...GRAY_600);
    const lines = doc.splitTextToSize(reserva.solicitudes_especiales, contentW);
    doc.text(lines, M, y + 3);
    y += lines.length * 4 + 6;
  }

  // --- 6. NOTA ---
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...GRAY_500);
  const nota =
    'Este comprobante confirma la reserva ante el establecimiento. Preséntelo el día del check-in junto con una ' +
    'identificación oficial. La reserva está sujeta a las políticas de hospedaje y cancelación del hotel.';
  const nLines = doc.splitTextToSize(nota, contentW);
  doc.text(nLines, M, y + 3, { align: 'justify', maxWidth: contentW });

  // --- 7. FOOTER: Sistema VULO ---
  const footerY = pageH - M + 4;
  doc.setDrawColor(...GRAY_200);
  doc.setLineWidth(0.15);
  doc.line(M, footerY - 5, pageW - M, footerY - 5);
  const cX = pageW / 2;
  if (foxData) {
    try { doc.addImage(foxData, 'PNG', cX - 20, footerY - 3.8, 5, 5, undefined, 'FAST'); } catch { /* noop */ }
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...BLACK);
  doc.text('Sistema VULO', cX - 13, footerY, { align: 'left' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...GRAY_400);
  doc.text('vulo.mx · Software para hoteles', cX, footerY + 4, { align: 'center' });

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
  // ===== Diseño B/N clásico de documento hotelero =====
  // Carta (letter): 216 x 279 mm, márgenes de 20mm.
  const doc = new jsPDF({ unit: 'mm', format: 'letter' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 20; // margen 2 cm
  const contentW = pageW - M * 2;

  // Cargar isotipo VULO (para header derecho y footer central)
  let foxData: string | null = null;
  try { foxData = await loadImageDataUrl(vuloFoxUrl); } catch { /* noop */ }

  const BLACK: [number, number, number] = [17, 24, 39];        // #111827
  const GRAY_600: [number, number, number] = [75, 85, 99];      // #4B5563
  const GRAY_500: [number, number, number] = [107, 114, 128];   // #6B7280
  const GRAY_400: [number, number, number] = [156, 163, 175];   // #9CA3AF
  const GRAY_200: [number, number, number] = [229, 231, 235];   // #E5E7EB
  const GRAY_700: [number, number, number] = [55, 65, 81];      // #374151

  const fmtFecha = (d: Date | string) => format(new Date(d), 'dd/MM/yyyy', { locale: es });
  const nowLabel = format(new Date(), 'dd/MM/yyyy HH:mm');
  const folio = reserva.numero_reserva || '—';

  // --- 1. ENCABEZADO — SOLO datos del hotel ---
  let y = M;

  // IZQUIERDA: nombre y dirección del hotel
  let headerX = M;
  if (opts.hotelLogoUrl) {
    try {
      const logoData = await loadImageAsPng(opts.hotelLogoUrl);
      doc.addImage(logoData, 'PNG', M, y, 18, 18, undefined, 'FAST');
      headerX = M + 22;
    } catch { /* noop */ }
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...BLACK);
  doc.text(opts.hotel || 'Hotel', headerX, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...GRAY_600);
  let ly = y + 11;
  const dirLinea = [opts.hotelDireccion, opts.hotelCiudad].filter(Boolean).join(', ');
  const leftMaxW = pageW - M - headerX - 72;
  if (dirLinea) {
    const wrapped = doc.splitTextToSize(dirLinea, leftMaxW) as string[];
    wrapped.forEach((ln) => { doc.text(ln, headerX, ly); ly += 4.5; });
  }
  const contacto = [opts.hotelTelefono ? `Tel. ${opts.hotelTelefono}` : '', opts.hotelEmail || '']
    .filter(Boolean)
    .join('  ·  ');
  if (contacto) {
    const wrapped = doc.splitTextToSize(contacto, leftMaxW) as string[];
    wrapped.forEach((ln) => { doc.text(ln, headerX, ly); ly += 4.5; });
  }

  // DERECHA: título del documento + folio + fecha
  const rightX = pageW - M;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...GRAY_500);
  doc.setCharSpace(0.4);
  doc.setCharSpace(0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...BLACK);
  doc.text(`Folio ${folio}`, rightX, y + 11.5, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...GRAY_500);
  doc.text(`Generado ${nowLabel}`, rightX, y + 16, { align: 'right' });

  // Línea inferior 2px negro
  y = Math.max(ly + 3, y + 20);
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.6);
  doc.line(M, y, pageW - M, y);
  y += 10;

  // --- 2. DATOS DEL HUÉSPED ---
  const sectionTitle = (label: string, yy: number) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...GRAY_500);
    doc.setCharSpace(0.5);
    doc.text(label.toUpperCase(), M, yy);
    doc.setCharSpace(0);
    return yy + 6;
  };

  y = sectionTitle('Datos del huésped', y);

  const filas: Array<{ label: string; value: string; bold?: boolean }> = [];
  const nombre = nombreCompleto(cliente);
  if (nombre && nombre !== '—') filas.push({ label: 'Nombre', value: nombre, bold: true });
  const doc_ = [cliente.tipo_documento, cliente.numero_documento].filter(Boolean).join(' ');
  if (doc_) filas.push({ label: 'Documento', value: doc_ });
  if (cliente.nacionalidad) filas.push({ label: 'Nacionalidad', value: cliente.nacionalidad });
  if (cliente.email) filas.push({ label: 'Correo', value: cliente.email });
  if (cliente.telefono) filas.push({ label: 'Teléfono', value: cliente.telefono });

  const labelW = contentW * 0.3;
  const valueX = M + labelW;
  filas.forEach((f) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...GRAY_500);
    doc.text(f.label, M, y + 3.5);
    doc.setFont('helvetica', f.bold ? 'bold' : 'normal');
    doc.setTextColor(...BLACK);
    doc.text(f.value, valueX, y + 3.5);
    // línea inferior
    doc.setDrawColor(...GRAY_200);
    doc.setLineWidth(0.15);
    doc.line(M, y + 5.5, pageW - M, y + 5.5);
    y += 6.5;
  });
  y += 4;

  // --- 3. ESTANCIA ---
  y = sectionTitle('Estancia', y);

  const cols = ['Habitación', 'Check-in', 'Check-out', 'Noches', 'Huéspedes', 'Total'];
  // anchos proporcionales
  const weights = [1.1, 1.4, 1.2, 0.8, 1.1, 1.2];
  const wSum = weights.reduce((a, b) => a + b, 0);
  const colX: number[] = [];
  let acc = M;
  weights.forEach((w) => { colX.push(acc); acc += (w / wSum) * contentW; });
  colX.push(pageW - M); // borde derecho

  // línea superior 1px negro
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.35);
  doc.line(M, y, pageW - M, y);

  // encabezados
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...GRAY_700);
  cols.forEach((c, i) => {
    const align: 'left' | 'right' = i === cols.length - 1 ? 'right' : 'left';
    const x = align === 'right' ? colX[i + 1] : colX[i] + 1;
    doc.text(c, x, y + 4, { align });
  });

  // línea bajo headers
  doc.setDrawColor(...GRAY_400);
  doc.setLineWidth(0.18);
  doc.line(M, y + 6, pageW - M, y + 6);

  // fila de datos
  const hab = reserva.habitacion_numero
    ? `${reserva.habitacion_numero}${reserva.tipo_habitacion_nombre ? ' · ' + reserva.tipo_habitacion_nombre : ''}`
    : '—';
  const ci = `${fmtFecha(reserva.fecha_checkin)}${reserva.hora_llegada ? ' · ' + reserva.hora_llegada : ''}`;
  const co = fmtFecha(reserva.fecha_checkout);
  const noches = String(reserva.noches || 1);
  const huesp = `${reserva.adultos || 0}${reserva.ninos ? ' + ' + reserva.ninos : ''}`;
  const totalStr = fmtMoney(Number(reserva.total || 0), currency);
  const values = [hab, ci, co, noches, huesp, totalStr];

  const rowY = y + 11;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...BLACK);
  values.forEach((v, i) => {
    const isTotal = i === cols.length - 1;
    const align: 'left' | 'right' = isTotal ? 'right' : 'left';
    if (isTotal) doc.setFont('helvetica', 'bold');
    const x = align === 'right' ? colX[i + 1] : colX[i] + 1;
    // truncar a ancho de columna
    const maxW = (colX[i + 1] - colX[i]) - 2;
    const lines = doc.splitTextToSize(v, maxW);
    doc.text(lines[0], x, rowY, { align });
    if (isTotal) doc.setFont('helvetica', 'normal');
  });
  // línea bajo el total
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.35);
  doc.line(colX[cols.length - 1] - 30, rowY + 2, colX[cols.length], rowY + 2);
  y = rowY + 7;

  // --- 4. TÉRMINOS Y CONDICIONES ---
  y = sectionTitle('Términos y condiciones', y + 2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...GRAY_500);
  const terminos =
    'El huésped declara que los datos consignados son verídicos y acepta las políticas del establecimiento, ' +
    'incluyendo horarios de check-in/out, política de cancelación, cargos por daños ocasionados durante la estancia ' +
    'y responsabilidad por objetos personales. Se autoriza el tratamiento de datos personales conforme al aviso de ' +
    'privacidad del hotel. La firma al pie hace constar la conformidad con las condiciones de hospedaje.';
  const tLines = doc.splitTextToSize(terminos, contentW);
  doc.text(tLines, M, y + 3, { align: 'justify', maxWidth: contentW });
  y += tLines.length * 4 + 8;

  // --- 5. FIRMA ---
  // Posición al pie: dejar espacio suficiente por si el contenido queda corto
  const firmaTop = Math.max(y + 20, pageH - M - 40);
  const firmaBoxW = 80; // mm ~ 220px
  const firmaBoxX = M;
  const lineaY = firmaTop + 10;

  // Imagen de firma si existe (encima de la línea)
  if (firmaDataUrl) {
    try {
      const imgW = 70;
      const imgH = 20;
      doc.addImage(firmaDataUrl, 'PNG', firmaBoxX + (firmaBoxW - imgW) / 2, lineaY - imgH - 1, imgW, imgH);
    } catch (err) { /* noop */ }
  }
  // Línea de firma
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.35);
  doc.line(firmaBoxX, lineaY, firmaBoxX + firmaBoxW, lineaY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...BLACK);
  doc.text('Firma del huésped', firmaBoxX + firmaBoxW / 2, lineaY + 5, { align: 'center' });
  doc.setFontSize(9);
  doc.setTextColor(...GRAY_400);
  doc.text(`Firmado el ${nowLabel}`, firmaBoxX + firmaBoxW / 2, lineaY + 9.5, { align: 'center' });

  // Derecha: generado con VULO
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...GRAY_400);
  doc.text('Generado con VULO · vulo.mx', pageW - M, lineaY, { align: 'right' });

  // ===== Footer institucional: Sistema VULO =====
  const footerY = pageH - M + 4;
  doc.setDrawColor(...GRAY_200);
  doc.setLineWidth(0.15);
  doc.line(M, footerY - 5, pageW - M, footerY - 5);
  const cX = pageW / 2;
  if (foxData) {
    try { doc.addImage(foxData, 'PNG', cX - 20, footerY - 3.8, 5, 5, undefined, 'FAST'); } catch { /* noop */ }
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...BLACK);
  doc.text('Sistema VULO', cX - 13, footerY, { align: 'left' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...GRAY_400);
  doc.text('vulo.mx · Software para hoteles', cX, footerY + 4, { align: 'center' });

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