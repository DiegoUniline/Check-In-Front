import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { MessageSquare, Phone, MapPin, Mail, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { PageShell, SectionTag, NAVY, ORANGE, ease } from './landing/Chrome';

const WA = 'https://wa.me/523171035768?text=Hola%20VULO%2C%20quiero%20una%20demo';

export default function Contacto() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ nombre: '', hotel: '', tel: '', email: '', mensaje: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const msg = `Hola VULO, soy ${form.nombre} del hotel ${form.hotel}. ${form.mensaje || 'Quiero agendar una demo.'} · Tel: ${form.tel} · Email: ${form.email}`;
    window.open(`https://wa.me/523171035768?text=${encodeURIComponent(msg)}`, '_blank');
    setSent(true);
  };

  return (
    <PageShell>
      <Helmet>
        <title>Contacto | VULO — Agenda una demo</title>
        <meta name="description" content="Te mostramos VULO con tus datos, sin compromiso. Escríbenos por WhatsApp al 317 103 5768 o agenda una demo." />
        <link rel="canonical" href="https://vulo.mx/contacto" />
      </Helmet>

      <section className="bg-white">
        <div className="mx-auto max-w-[1280px] px-6 pb-16 pt-20 lg:px-10 lg:pb-24 lg:pt-28">
          <SectionTag>Contacto</SectionTag>
          <h1 className="max-w-3xl text-[40px] font-bold leading-[1.05] tracking-[-0.035em] text-slate-900 md:text-[60px]">
            Un hotel más tranquilo
            <br />
            <span className="text-slate-400">empieza con una conversación.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-[17px] leading-relaxed text-slate-600 md:text-[19px]">
            Te mostramos VULO con tus datos, sin compromiso.
          </p>
        </div>
      </section>

      <section className="border-t border-slate-100 bg-slate-50/60 py-20">
        <div className="mx-auto grid max-w-[1280px] gap-10 px-6 lg:grid-cols-[1.15fr_1fr] lg:px-10">
          {/* Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease }}
            className="rounded-[22px] border border-slate-200 bg-white p-8 md:p-10"
          >
            {!sent ? (
              <>
                <h2 className="text-[22px] font-bold tracking-tight text-slate-900">
                  Agenda una demo
                </h2>
                <p className="mt-1.5 text-[14px] text-slate-500">
                  Te contactamos por WhatsApp en menos de 24 horas.
                </p>
                <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="nombre">Tu nombre</Label>
                      <Input id="nombre" required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="mt-1.5 h-11 rounded-xl" />
                    </div>
                    <div>
                      <Label htmlFor="hotel">Nombre del hotel</Label>
                      <Input id="hotel" required value={form.hotel} onChange={(e) => setForm({ ...form, hotel: e.target.value })} className="mt-1.5 h-11 rounded-xl" />
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="tel">Teléfono / WhatsApp</Label>
                      <Input id="tel" required value={form.tel} onChange={(e) => setForm({ ...form, tel: e.target.value })} className="mt-1.5 h-11 rounded-xl" />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1.5 h-11 rounded-xl" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="mensaje">¿Qué te gustaría ver primero?</Label>
                    <Textarea id="mensaje" rows={4} value={form.mensaje} onChange={(e) => setForm({ ...form, mensaje: e.target.value })} className="mt-1.5 rounded-xl" />
                  </div>
                  <Button type="submit" size="lg" className="h-[52px] rounded-full text-[15px] font-medium text-white shadow-none hover:opacity-95" style={{ background: ORANGE }}>
                    Enviar por WhatsApp <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </form>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-full" style={{ background: '#FFF3EB' }}>
                  <Check className="h-6 w-6" style={{ color: ORANGE }} strokeWidth={2.5} />
                </div>
                <h3 className="text-[20px] font-semibold text-slate-900">Listo, abrimos WhatsApp</h3>
                <p className="max-w-sm text-[14.5px] text-slate-500">
                  Si no se abrió automáticamente, escríbenos al 317 103 5768.
                </p>
              </div>
            )}
          </motion.div>

          {/* Info */}
          <div className="flex flex-col gap-4">
            <a href={WA} target="_blank" rel="noreferrer" className="group rounded-[20px] border border-slate-200 bg-white p-6 transition hover:border-slate-300">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-[10px]" style={{ background: '#FFF3EB' }}>
                <MessageSquare className="h-5 w-5" style={{ color: ORANGE }} strokeWidth={1.75} />
              </div>
              <div className="text-[13px] font-semibold uppercase tracking-wider text-slate-500">WhatsApp</div>
              <div className="mt-1 text-[20px] font-semibold text-slate-900 group-hover:opacity-80">317 103 5768</div>
              <p className="mt-1 text-[13.5px] text-slate-500">Respuesta rápida, con humano real.</p>
            </a>
            <div className="rounded-[20px] p-6 text-white" style={{ background: NAVY }}>
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-[10px] bg-white/10">
                <MapPin className="h-5 w-5 text-white" strokeWidth={1.75} />
              </div>
              <div className="text-[13px] font-semibold uppercase tracking-wider text-white/60">Ubicación</div>
              <div className="mt-1 text-[17px] font-semibold">Autlán de Navarro, Jalisco</div>
              <p className="mt-1 text-[13.5px] text-white/70">México</p>
            </div>
            <div className="rounded-[20px] border border-slate-200 bg-white p-6">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-[10px] bg-slate-100">
                <Phone className="h-5 w-5 text-slate-700" strokeWidth={1.75} />
              </div>
              <div className="text-[13px] font-semibold uppercase tracking-wider text-slate-500">Horario</div>
              <div className="mt-1 text-[15px] font-medium text-slate-900">Lun a Sáb · 9:00 – 20:00</div>
              <p className="mt-1 text-[13.5px] text-slate-500">Zona horaria Ciudad de México.</p>
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}