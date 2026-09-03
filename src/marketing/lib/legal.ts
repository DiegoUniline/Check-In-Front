/**
 * Datos legales oficiales de VULO. Fuente única de verdad para los documentos
 * legales, la página de soporte y los pies de página públicos.
 *
 * No modificar sin confirmación del titular: estos datos son los que se
 * publican como identidad del Responsable conforme al artículo 15 de la
 * Ley Federal de Protección de Datos Personales en Posesión de los
 * Particulares (LFPDPPP), publicada en el DOF el 20 de marzo de 2025.
 */

export const LEGAL = {
  /** Persona física titular / Responsable del tratamiento */
  titular: 'Diego Alonso León de Dios',
  rfc: 'LEDD900608JE9',
  marca: 'VULO',
  grupo: 'Grupo Uniline',
  domicilio: '5 de Mayo 9, Jardines de Autlán, Autlán de Navarro, Jalisco, México, C.P. 48902',
  ciudad: 'Autlán de Navarro, Jalisco',
  /** Contacto oficial y buzón de datos personales (derechos ARCO) */
  email: 'sistema@vulo.mx',
  telefono: '+52 317 103 5768',
  whatsapp: 'https://wa.me/523171035768',
  sitio: 'https://vulo.mx',
  /** Horario de atención y soporte */
  horario: 'Lunes a viernes, 9:00 a 16:00 h (hora del centro de México)',
  horarioCorto: 'Lun–Vie · 9:00–16:00 h',
  /** Fecha de última actualización de los documentos legales */
  actualizado: '3 de septiembre de 2026',
} as const;

export default LEGAL;
