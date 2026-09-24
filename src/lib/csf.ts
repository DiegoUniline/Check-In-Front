// Lectura de la Constancia de Situación Fiscal (CSF) del SAT en el navegador.
// pdf.js se carga bajo demanda desde CDN para no agregar dependencias.

const PDFJS_VERSION = '4.10.38';
const PDFJS_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.min.mjs`;
const PDFJS_WORKER_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`;

export const REGIMENES_FISCALES: { clave: string; nombre: string; buscar: string }[] = [
  { clave: '601', nombre: 'General de Ley Personas Morales', buscar: 'general de ley personas morales' },
  { clave: '603', nombre: 'Personas Morales con Fines no Lucrativos', buscar: 'fines no lucrativos' },
  { clave: '605', nombre: 'Sueldos y Salarios e Ingresos Asimilados a Salarios', buscar: 'sueldos y salarios' },
  { clave: '606', nombre: 'Arrendamiento', buscar: 'arrendamiento' },
  { clave: '607', nombre: 'Régimen de Enajenación o Adquisición de Bienes', buscar: 'enajenacion o adquisicion de bienes' },
  { clave: '608', nombre: 'Demás ingresos', buscar: 'demas ingresos' },
  { clave: '610', nombre: 'Residentes en el Extranjero sin Establecimiento Permanente en México', buscar: 'residentes en el extranjero' },
  { clave: '611', nombre: 'Ingresos por Dividendos (socios y accionistas)', buscar: 'dividendos' },
  { clave: '612', nombre: 'Personas Físicas con Actividades Empresariales y Profesionales', buscar: 'actividades empresariales y profesionales' },
  { clave: '614', nombre: 'Ingresos por intereses', buscar: 'ingresos por intereses' },
  { clave: '615', nombre: 'Régimen de los ingresos por obtención de premios', buscar: 'obtencion de premios' },
  { clave: '616', nombre: 'Sin obligaciones fiscales', buscar: 'sin obligaciones fiscales' },
  { clave: '620', nombre: 'Sociedades Cooperativas de Producción que optan por diferir sus ingresos', buscar: 'cooperativas de produccion' },
  { clave: '621', nombre: 'Incorporación Fiscal', buscar: 'incorporacion fiscal' },
  { clave: '622', nombre: 'Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras', buscar: 'actividades agricolas' },
  { clave: '623', nombre: 'Opcional para Grupos de Sociedades', buscar: 'grupos de sociedades' },
  { clave: '624', nombre: 'Coordinados', buscar: 'coordinados' },
  { clave: '625', nombre: 'Actividades Empresariales con ingresos a través de Plataformas Tecnológicas', buscar: 'plataformas tecnologicas' },
  { clave: '626', nombre: 'Régimen Simplificado de Confianza', buscar: 'simplificado de confianza' },
];

export const USOS_CFDI: { clave: string; nombre: string }[] = [
  { clave: 'G01', nombre: 'Adquisición de mercancías' },
  { clave: 'G02', nombre: 'Devoluciones, descuentos o bonificaciones' },
  { clave: 'G03', nombre: 'Gastos en general' },
  { clave: 'I01', nombre: 'Construcciones' },
  { clave: 'I02', nombre: 'Mobiliario y equipo de oficina por inversiones' },
  { clave: 'I03', nombre: 'Equipo de transporte' },
  { clave: 'I04', nombre: 'Equipo de cómputo y accesorios' },
  { clave: 'I08', nombre: 'Otra maquinaria y equipo' },
  { clave: 'D01', nombre: 'Honorarios médicos, dentales y gastos hospitalarios' },
  { clave: 'D10', nombre: 'Pagos por servicios educativos (colegiaturas)' },
  { clave: 'S01', nombre: 'Sin efectos fiscales' },
  { clave: 'CP01', nombre: 'Pagos' },
];

export type DatosCsf = {
  rfc?: string;
  curp?: string;
  razon_social?: string;
  regimen_fiscal?: string;
  codigo_postal_fiscal?: string;
  domicilio_fiscal?: string;
  email?: string;
};

const LABELS = [
  'RFC', 'CURP', 'Nombre \\(s\\)', 'Nombre\\(s\\)', 'Primer Apellido', 'Segundo Apellido',
  'Denominación/Razón Social', 'Denominación / Razón Social', 'Denominacion/Razon Social', 'Régimen Capital', 'Regimen Capital',
  'Nombre Comercial', 'Fecha inicio de operaciones', 'Estatus en el padrón', 'Fecha de último cambio de estado',
  'Código Postal', 'Codigo Postal', 'Tipo de Vialidad', 'Nombre de Vialidad', 'Número Exterior', 'Numero Exterior',
  'Número Interior', 'Numero Interior', 'Nombre de la Colonia', 'Nombre de la Localidad',
  'Nombre del Municipio o Demarcación Territorial', 'Nombre de la Entidad Federativa', 'Entre Calle', 'Y Calle',
  'Correo Electrónico', 'Tel\\. Fijo Lada', 'Número', 'Tel\\. Móvil Lada', 'Estado de la vialidad', 'idCIF', 'Lugar y Fecha de Emisión',
];

const quitarAcentos = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const limpio = (s?: string) => (s || '').replace(/\s+/g, ' ').trim();

function campo(texto: string, ...etiquetas: string[]): string | undefined {
  const siguiente = LABELS.join('|');
  for (const etiqueta of etiquetas) {
    const re = new RegExp(`(?:^|\\s)${etiqueta}\\s*:([^\\n]*?)(?=\\s+(?:${siguiente})\\s*:|\\s*\\n|\\s*$)`, 'i');
    const m = texto.match(re);
    const valor = limpio(m?.[1]);
    if (valor) return valor;
  }
  return undefined;
}

/** Interpreta el texto de la CSF (una línea por renglón del PDF). */
export function parseCsfTexto(lineas: string[]): DatosCsf {
  const texto = lineas.map(limpio).filter(Boolean).join('\n');
  const datos: DatosCsf = {};

  const rfc = campo(texto, 'RFC')?.replace(/\s/g, '').toUpperCase()
    || texto.match(/\b[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}\b/)?.[0];
  if (rfc && /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(rfc)) datos.rfc = rfc;

  const curp = campo(texto, 'CURP');
  if (curp && /^[A-Z]{4}\d{6}[A-Z0-9]{8}$/i.test(curp.replace(/\s/g, ''))) datos.curp = curp.replace(/\s/g, '').toUpperCase();

  const razon = campo(texto, 'Denominación\\s*/\\s*Razón Social', 'Denominaci[oó]n\\s*/\\s*Raz[oó]n Social');
  if (razon) {
    datos.razon_social = razon.toUpperCase();
  } else {
    const nombre = [campo(texto, 'Nombre\\s*\\(s\\)'), campo(texto, 'Primer Apellido'), campo(texto, 'Segundo Apellido')]
      .filter(Boolean).join(' ');
    if (nombre) datos.razon_social = nombre.toUpperCase();
  }

  const cp = campo(texto, 'C[oó]digo Postal')?.match(/\d{5}/)?.[0];
  if (cp) datos.codigo_postal_fiscal = cp;

  const via = [campo(texto, 'Tipo de Vialidad'), campo(texto, 'Nombre de Vialidad')].filter(Boolean).join(' ');
  const ext = campo(texto, 'N[uú]mero Exterior');
  const int = campo(texto, 'N[uú]mero Interior');
  const domicilio = [
    [via, ext ? `#${ext}` : '', int ? `Int. ${int}` : ''].filter(Boolean).join(' '),
    campo(texto, 'Nombre de la Colonia') ? `Col. ${campo(texto, 'Nombre de la Colonia')}` : '',
    campo(texto, 'Nombre del Municipio o Demarcaci[oó]n Territorial'),
    campo(texto, 'Nombre de la Entidad Federativa'),
    cp ? `C.P. ${cp}` : '',
  ].filter(Boolean).join(', ');
  if (domicilio) datos.domicilio_fiscal = domicilio.toUpperCase();

  const email = texto.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
  if (email) datos.email = email.toLowerCase();

  // Régimen: el primero que aparezca en la tabla de regímenes.
  const normal = quitarAcentos(texto).toLowerCase();
  const inicio = Math.max(0, normal.search(/regimenes\s*:?/));
  const seccion = normal.slice(inicio);
  let mejor: { clave: string; pos: number } | null = null;
  for (const r of REGIMENES_FISCALES) {
    const pos = seccion.indexOf(r.buscar);
    if (pos >= 0 && (!mejor || pos < mejor.pos)) mejor = { clave: r.clave, pos };
  }
  if (mejor) datos.regimen_fiscal = mejor.clave;

  return datos;
}

let pdfjsPromise: Promise<any> | null = null;
async function cargarPdfJs(): Promise<any> {
  if (!pdfjsPromise) {
    pdfjsPromise = import(/* @vite-ignore */ PDFJS_URL).then((lib: any) => {
      lib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
      return lib;
    }).catch((error) => {
      pdfjsPromise = null;
      throw error;
    });
  }
  return pdfjsPromise;
}

/** Extrae el texto del PDF agrupando por renglón. */
export async function extraerLineasPdf(data: ArrayBuffer): Promise<string[]> {
  const pdfjs = await cargarPdfJs();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(data) }).promise;
  const lineas: string[] = [];
  const paginas = Math.min(doc.numPages, 3);
  for (let n = 1; n <= paginas; n += 1) {
    const page = await doc.getPage(n);
    const content = await page.getTextContent();
    const filas = new Map<number, { x: number; str: string }[]>();
    for (const item of content.items as any[]) {
      if (!item.str?.trim()) continue;
      const y = Math.round(item.transform[5] / 2) * 2;
      const fila = filas.get(y) || [];
      fila.push({ x: item.transform[4], str: item.str });
      filas.set(y, fila);
    }
    [...filas.entries()]
      .sort((a, b) => b[0] - a[0])
      .forEach(([, fila]) => lineas.push(fila.sort((a, b) => a.x - b.x).map((f) => f.str).join(' ')));
  }
  return lineas;
}

export async function leerCsf(file: File): Promise<DatosCsf> {
  if (file.type && file.type !== 'application/pdf') throw new Error('Sube la constancia en PDF');
  let lineas: string[];
  try {
    lineas = await extraerLineasPdf(await file.arrayBuffer());
  } catch (error: any) {
    throw new Error(`No se pudo leer el PDF${error?.message ? `: ${error.message}` : ''}`);
  }
  const datos = parseCsfTexto(lineas);
  if (!datos.rfc && !datos.razon_social) {
    throw new Error('El PDF no parece una Constancia de Situación Fiscal (no se encontró RFC). Captura los datos a mano.');
  }
  return datos;
}
