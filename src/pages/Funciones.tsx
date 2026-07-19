import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  ArrowRight, Calendar, Users, Sparkles, Wallet, FileText, MessageSquare,
  BarChart3, Building2, ShieldCheck, Bot, ScanLine, Package, Wrench,
  BedDouble, Globe, ClipboardList, Receipt, Boxes, Truck, ClipboardCheck,
  LineChart, Lock, LifeBuoy, Layers, Coins, History,
} from 'lucide-react';
import { PageShell, SectionTag, NAVY, ORANGE, ease } from './landing/Chrome';

type Mod = { icon: any; t: string; d: string; tag?: string };

const groups: Array<{ title: string; subtitle: string; items: Mod[] }> = [
  {
    title: 'Reservas y disponibilidad',
    subtitle: 'El corazón operativo: ver, mover y confirmar sin fricción.',
    items: [
      { icon: Calendar, t: 'Calendario y matriz de fechas', d: 'Vista timeline por habitación con arrastrar y soltar, bloqueos, extensiones y cambios de habitación.' },
      { icon: Globe, t: 'Motor de reservas online', d: 'Página pública por hotel con disponibilidad y tarifas en vivo. El huésped reserva directo, sin comisión de intermediario.' },
      { icon: Layers, t: 'Temporadas y tarifas', d: 'Precios por temporada, día de la semana y estancia mínima. Se aplican automáticamente al cotizar.' },
      { icon: History, t: 'Historial de reservas', d: 'Cada reserva con su bitácora: origen, cambios, pagos y notas. Nada se pierde.' },
    ],
  },
  {
    title: 'Recepción y huéspedes',
    subtitle: 'Todo lo que pasa entre el check-in y el check-out.',
    items: [
      { icon: Users, t: 'Check-in / Check-out', d: 'Llegadas y salidas del día, asignación de habitación, firma digital y registro del huésped en un solo flujo.' },
      { icon: BedDouble, t: 'Habitaciones', d: 'Estado en tiempo real: ocupada, sucia, limpia, en mantenimiento. Foto por habitación y notas del piso.' },
      { icon: ClipboardList, t: 'Clientes / CRM', d: 'Ficha del huésped con historial, contacto, preferencias y consumos. Ligado a WhatsApp automáticamente.' },
      { icon: ShieldCheck, t: 'Registro y documentos', d: 'Formato oficial de registro por huésped, generado en PDF con datos y firma.' },
    ],
  },
  {
    title: 'IA y WhatsApp',
    subtitle: 'Lo que hace que VULO se sienta distinto.',
    items: [
      { icon: Bot, t: 'Agente IA para WhatsApp', d: 'Responde consultas de disponibilidad, tarifas y ubicación 24/7. Convierte conversaciones en reservas confirmadas.', tag: 'Estrella' },
      { icon: MessageSquare, t: 'Chats unificados', d: 'Un buzón por hotel con todas las conversaciones, cada una ligada a su reserva y a su cliente.' },
      { icon: Sparkles, t: 'Handover a humano', d: 'La IA sabe cuándo callarse. Escala a recepción con contexto completo del hilo.' },
    ],
  },
  {
    title: 'Punto de venta y cobros',
    subtitle: 'Restaurante, bar, tienda y caja: todo cuadra al cierre.',
    items: [
      { icon: ScanLine, t: 'POS táctil', d: 'Vende productos y servicios desde tablet. Cobra al momento o carga a la cuenta del huésped.' },
      { icon: Wallet, t: 'Cobros y caja', d: 'Efectivo, tarjeta, transferencia y links de pago. Corte de caja por método y por turno.' },
      { icon: Coins, t: 'Turnos de caja', d: 'Apertura, movimientos y cierre firmado. Cada peso registrado con hora y responsable.' },
      { icon: FileText, t: 'Facturación CFDI 4.0', d: 'Factura al huésped que la pida, timbrada desde el sistema y anclada al pago.' },
    ],
  },
  {
    title: 'Housekeeping y mantenimiento',
    subtitle: 'El piso siempre alineado con recepción.',
    items: [
      { icon: Sparkles, t: 'Limpieza / Housekeeping', d: 'Tareas por camarista, checklist por habitación y estado sincronizado con recepción en tiempo real.' },
      { icon: Wrench, t: 'Mantenimiento', d: 'Reportes de fallas, asignación a técnico y bloqueo temporal de la habitación mientras se resuelve.' },
    ],
  },
  {
    title: 'Inventario y compras',
    subtitle: 'Stock claro, sin sorpresas al cierre de mes.',
    items: [
      { icon: Boxes, t: 'Inventario', d: 'Existencias por producto, alertas de mínimos y valuación al costo.' },
      { icon: Package, t: 'Productos', d: 'Catálogo con precio, costo, unidad y categoría. Alimenta al POS y a las compras.' },
      { icon: ClipboardCheck, t: 'Ajustes de stock', d: 'Entradas, salidas, mermas y traspasos con motivo y responsable.' },
      { icon: Truck, t: 'Compras y proveedores', d: 'Órdenes de compra, recepción de mercancía y directorio de proveedores.' },
      { icon: Receipt, t: 'Gastos', d: 'Registro de gastos operativos por categoría, con soporte y comprobante.' },
    ],
  },
  {
    title: 'Reportes y control',
    subtitle: 'Los números del hotel, listos al instante.',
    items: [
      { icon: BarChart3, t: 'Reportes', d: 'Ocupación, ADR, RevPAR, ingresos por periodo y por origen. Sin armar Excel a mano.' },
      { icon: LineChart, t: 'Reportería gerencial', d: 'Vista consolidada para dirección: comparativos, tendencias y foco por propiedad.' },
      { icon: Building2, t: 'Multi-propiedad', d: 'Varios hoteles bajo un solo acceso, con datos aislados y reporte consolidado.' },
    ],
  },
  {
    title: 'Administración',
    subtitle: 'Quién puede ver qué. Y quién hizo qué.',
    items: [
      { icon: Users, t: 'Usuarios y roles', d: 'Admin, Gerencia, Recepción, Housekeeping, Mantenimiento — permisos por módulo.' },
      { icon: Lock, t: 'Permisos por hotel', d: 'Recepción no ve lo que ve gerencia. Cada rol con acceso justo.' },
      { icon: ClipboardCheck, t: 'Auditoría', d: 'Bitácora de acciones sensibles: cambios de precio, cancelaciones, movimientos de caja.' },
      { icon: LifeBuoy, t: 'Catálogos', d: 'Tipos de habitación, métodos de pago, impuestos, categorías — todo configurable sin código.' },
    ],
  },
];

export default function Funciones() {
  return (
    <PageShell>
      <Helmet>
        <title>Funciones | VULO — Software para hoteles</title>
        <meta name="description" content="Todos los módulos de VULO: reservas, recepción, IA en WhatsApp, punto de venta, housekeeping, inventario, reportes y más. Un sistema, un hotel más tranquilo." />
        <link rel="canonical" href="https://vulo.mx/funciones" />
      </Helmet>

      {/* Hero */}
      <section className="bg-white">
        <div className="mx-auto max-w-[1280px] px-6 pb-16 pt-20 lg:px-10 lg:pb-24 lg:pt-28">
          <motion.div initial="hidden" animate="show">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }}>
              <SectionTag>Funciones</SectionTag>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease, delay: 0.05 }}
              className="max-w-4xl text-[40px] font-bold leading-[1.05] tracking-[-0.035em] text-slate-900 md:text-[64px]"
            >
              Todo lo que mueve tu hotel,
              <br />
              <span className="text-slate-400">explorado con calma.</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease, delay: 0.12 }}
              className="mt-6 max-w-2xl text-[17px] leading-relaxed text-slate-600 md:text-[19px]"
            >
              Diseñado para que dé gusto usarlo, todos los días. Cada pantalla existe porque
              alguien la necesita para trabajar mejor. No hay pestañas de adorno.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Groups */}
      <section className="border-t border-slate-100 bg-slate-50/60 py-24">
        <div className="mx-auto max-w-[1280px] space-y-20 px-6 lg:px-10">
          {groups.map((g, gi) => (
            <motion.div
              key={g.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.7, ease }}
            >
              <div className="mb-10 grid gap-4 lg:grid-cols-[1fr_2fr] lg:items-end">
                <div>
                  <div className="text-[12px] font-semibold uppercase tracking-[0.24em]" style={{ color: ORANGE }}>
                    {String(gi + 1).padStart(2, '0')}
                  </div>
                  <h2 className="mt-2 text-[26px] font-bold tracking-[-0.02em] text-slate-900 md:text-[36px]">
                    {g.title}
                  </h2>
                </div>
                <p className="text-[15.5px] leading-relaxed text-slate-600 md:text-[16.5px]">
                  {g.subtitle}
                </p>
              </div>
              <div className="grid gap-px overflow-hidden rounded-[20px] border border-slate-200 bg-slate-200 md:grid-cols-2 lg:grid-cols-3">
                {g.items.map((it) => (
                  <div key={it.t} className="flex flex-col gap-3 bg-white p-6 transition hover:bg-slate-50 md:p-7">
                    <div className="flex items-center justify-between">
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-[10px]" style={{ background: '#FFF3EB' }}>
                        <it.icon className="h-5 w-5" style={{ color: ORANGE }} strokeWidth={1.75} />
                      </div>
                      {it.tag && (
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white" style={{ background: ORANGE }}>
                          {it.tag}
                        </span>
                      )}
                    </div>
                    <h3 className="text-[16px] font-semibold tracking-tight text-slate-900">{it.t}</h3>
                    <p className="text-[13.5px] leading-relaxed text-slate-600">{it.d}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-slate-100 py-24" style={{ background: NAVY }}>
        <div className="mx-auto max-w-3xl px-6 text-center lg:px-10">
          <h2 className="text-[32px] font-bold tracking-[-0.03em] text-white md:text-[48px]">
            Un hotel más tranquilo
            <br />
            <span className="text-white/50">empieza con una conversación.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-[16px] leading-relaxed text-white/70">
            Te mostramos VULO con tus datos, sin compromiso.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="h-[52px] rounded-full px-8 text-[15px] font-medium text-white shadow-none hover:opacity-95" style={{ background: ORANGE }}>
              <Link to="/contacto">Agendar una demo <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
            <Link to="/precios" className="text-[15px] font-medium text-white/80 hover:text-white">
              Ver precios →
            </Link>
          </div>
        </div>
      </section>
    </PageShell>
  );
}