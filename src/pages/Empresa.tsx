import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { ArrowRight, MapPin, Heart, Zap, ShieldCheck, Users, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageShell, SectionTag, NAVY, ORANGE, ease } from './landing/Chrome';
import foxIsotype from '@/assets/vulo-fox.png';

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
        <div className="mx-auto grid max-w-[1280px] gap-14 px-6 pb-16 pt-20 lg:grid-cols-[1.35fr_1fr] lg:items-center lg:px-10 lg:pb-24 lg:pt-28">
          <div>
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
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, ease }}
            className="relative mx-auto flex aspect-square w-full max-w-[420px] items-center justify-center"
          >
            <div className="absolute inset-6 rounded-full" style={{ background: `radial-gradient(closest-side, ${ORANGE}22, transparent 70%)` }} />
            <div className="absolute inset-0 rounded-[32px] border border-slate-100 bg-slate-50/60" />
            <motion.img
              src={foxIsotype}
              alt="Isotipo VULO"
              className="relative z-10 h-[68%] w-[68%] object-contain drop-shadow-[0_20px_40px_rgba(15,35,63,0.18)]"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
            />
            <span className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium tracking-wide text-slate-600">
              Hecho en México
            </span>
          </motion.div>
        </div>
      </section>

      <section className="border-t border-slate-100 bg-slate-50/60 py-24">
        <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
          {/* Sueño */}
          <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[1fr_1.35fr] lg:items-start">
            <div>
              <SectionTag>Nuestro sueño</SectionTag>
              <div className="relative inline-flex h-32 w-32 items-center justify-center rounded-[24px]" style={{ background: NAVY }}>
                <img src={foxIsotype} alt="" className="h-[70%] w-[70%] object-contain" />
                <div className="absolute -bottom-2 -right-2 inline-flex h-10 w-10 items-center justify-center rounded-[12px] border-4 border-slate-50" style={{ background: ORANGE }}>
                  <Moon className="h-4 w-4 text-white" strokeWidth={2} />
                </div>
              </div>
            </div>
            <div>
              <h2 className="text-[30px] font-bold tracking-[-0.03em] text-slate-900 md:text-[44px]">
                Que operar un hotel
                <br />
                <span className="text-slate-400">se sienta ligero.</span>
              </h2>
              <p className="mt-6 max-w-xl text-[16.5px] leading-relaxed text-slate-600 md:text-[18px]">
                Soñamos con hoteles donde el equipo llega tranquilo, el huésped se siente esperado
                y los dueños duermen sabiendo que todo está en orden. Un hotel más humano, con menos
                fricción y más huéspedes que vuelven — sostenido por tecnología que no estorba.
              </p>
            </div>
          </div>

          {/* Principios */}
          <div className="mx-auto mt-24 max-w-3xl text-center">
            <SectionTag>Principios</SectionTag>
            <h2 className="text-[30px] font-bold tracking-[-0.03em] text-slate-900 md:text-[44px]">
              Cómo pensamos,
              <br />
              <span className="text-slate-400">cómo construimos.</span>
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
                className="group relative overflow-hidden rounded-[20px] border border-slate-200 bg-white p-7"
              >
                <img
                  src={foxIsotype}
                  alt=""
                  aria-hidden
                  className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 object-contain opacity-[0.06] transition-opacity duration-500 group-hover:opacity-[0.12]"
                />
                <div className="relative mb-4 inline-flex h-11 w-11 items-center justify-center rounded-[12px]" style={{ background: NAVY }}>
                  <p.icon className="h-5 w-5 text-white" strokeWidth={1.75} />
                </div>
                <h3 className="relative text-[18px] font-semibold tracking-tight text-slate-900">{p.t}</h3>
                <p className="relative mt-2 text-[14.5px] leading-relaxed text-slate-600">{p.d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-100 bg-white py-24">
        <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
          <div className="relative overflow-hidden grid gap-10 rounded-[24px] p-10 lg:grid-cols-[1.2fr_1fr] lg:items-center" style={{ background: NAVY }}>
            <img
              src={foxIsotype}
              alt=""
              aria-hidden
              className="pointer-events-none absolute -right-10 -bottom-10 h-72 w-72 object-contain opacity-10"
            />
            <div className="relative">
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
            <div className="relative flex flex-wrap gap-3 lg:justify-end">
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