import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { ArrowRight, MapPin, Heart, Zap, ShieldCheck, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageShell, SectionTag, NAVY, ORANGE, ease } from './landing/Chrome';

const principios = [
  { icon: Heart, t: 'Hecho por personas que entienden la operación', d: 'Cada pantalla nace de una necesidad real de recepción, housekeeping o gerencia — no de un tablero de diseño.' },
  { icon: Zap, t: 'Rápido, calmado, sin ruido', d: 'Menos clics, menos pestañas, menos notificaciones inútiles. La calma también es una función.' },
  { icon: ShieldCheck, t: 'Tus datos son tuyos', d: 'Respaldos automáticos, permisos por rol y exportación libre. Sin candados.' },
  { icon: Users, t: 'Cerca del hotel', d: 'Soporte por WhatsApp con humano real. Implementación acompañada, no un manual PDF.' },
];

export default function Empresa() {
  return (
    <PageShell>
      <Helmet>
        <title>Empresa | VULO — Software para hoteles</title>
        <meta name="description" content="VULO es software para hoteles hecho en Autlán de Navarro, Jalisco. Desarrollado por Uniline · Innovación en la nube." />
        <link rel="canonical" href="https://vulo.mx/empresa" />
      </Helmet>

      <section className="bg-white">
        <div className="mx-auto max-w-[1280px] px-6 pb-16 pt-20 lg:px-10 lg:pb-24 lg:pt-28">
          <SectionTag>Empresa</SectionTag>
          <h1 className="max-w-3xl text-[40px] font-bold leading-[1.05] tracking-[-0.035em] text-slate-900 md:text-[64px]">
            Un hotel bien llevado se nota.
            <br />
            <span className="text-slate-400">VULO lo hace más obvio.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-[17px] leading-relaxed text-slate-600 md:text-[19px]">
            VULO reúne todo lo que hace mover un hotel — reservas, recepción, habitaciones,
            cobros y conversaciones — en una experiencia calmada, rápida y hecha por personas
            que entienden la operación.
          </p>
        </div>
      </section>

      <section className="border-t border-slate-100 bg-slate-50/60 py-24">
        <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
          <div className="mx-auto max-w-3xl text-center">
            <SectionTag>Cómo pensamos</SectionTag>
            <h2 className="text-[30px] font-bold tracking-[-0.03em] text-slate-900 md:text-[44px]">
              Menos fricción.
              <br />
              <span className="text-slate-400">Más huéspedes que vuelven.</span>
            </h2>
          </div>
          <div className="mt-14 grid gap-5 md:grid-cols-2">
            {principios.map((p, i) => (
              <motion.div
                key={p.t}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.7, ease, delay: i * 0.06 }}
                className="rounded-[20px] border border-slate-200 bg-white p-7"
              >
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-[12px]" style={{ background: NAVY }}>
                  <p.icon className="h-5 w-5 text-white" strokeWidth={1.75} />
                </div>
                <h3 className="text-[18px] font-semibold tracking-tight text-slate-900">{p.t}</h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-slate-600">{p.d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-100 bg-white py-24">
        <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
          <div className="grid gap-10 rounded-[24px] p-10 lg:grid-cols-[1.2fr_1fr] lg:items-center" style={{ background: NAVY }}>
            <div>
              <SectionTag>Detrás de VULO</SectionTag>
              <h2 className="text-[28px] font-bold tracking-[-0.02em] text-white md:text-[38px]">
                Desarrollado por Uniline
                <br />
                <span className="text-white/50">Innovación en la nube.</span>
              </h2>
              <p className="mt-5 max-w-md text-[15.5px] leading-relaxed text-white/75">
                Somos un equipo de Autlán de Navarro, Jalisco, construyendo software que se usa todos
                los días en hoteles reales. Cerca del cliente, con soporte humano.
              </p>
              <div className="mt-6 inline-flex items-center gap-2 text-[13.5px] text-white/70">
                <MapPin className="h-4 w-4" /> Autlán de Navarro, Jalisco · México
              </div>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Button asChild size="lg" className="h-[52px] rounded-full px-7 text-[15px] font-medium text-white shadow-none hover:opacity-95" style={{ background: ORANGE }}>
                <Link to="/contacto">Hablemos <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-[52px] rounded-full border-white/25 bg-transparent px-6 text-[15px] font-medium text-white hover:bg-white/10 hover:text-white">
                <Link to="/funciones">Ver funciones</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}