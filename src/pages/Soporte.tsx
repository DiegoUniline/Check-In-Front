import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Mail, MapPin, Clock, Sparkles, LifeBuoy } from 'lucide-react';
import { useAuth } from '@/contexts/useAuth';
import { whatsappSoporteUrl } from '@/components/asistente/AsistenteVulo';
import foxIcon from '@/assets/vulo-fox.png';

export default function Soporte() {
  const { user } = useAuth();
  const hotelNombre = user?.hotelNombre;
  const waUrl = whatsappSoporteUrl(hotelNombre);

  return (
    <MainLayout title="Soporte" subtitle="Estamos aquí para ayudarte">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="rounded-3xl border border-[#CBD5E1] bg-white overflow-hidden shadow-[0_10px_40px_rgba(15,23,42,0.06)]">
          <div className="bg-[#10233F] text-white p-8 flex items-center gap-5">
            <div className="h-16 w-16 rounded-2xl bg-white flex items-center justify-center shrink-0">
              <img src={foxIcon} alt="VULO" className="h-11 w-11 object-contain" />
            </div>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.2em] text-white/60">Soporte VULO</p>
              <h1 className="text-2xl font-semibold mt-1">¿En qué te ayudamos?</h1>
              {hotelNombre && (
                <p className="text-sm text-white/70 mt-1">
                  Cuenta activa: <span className="text-white font-medium">{hotelNombre}</span>
                </p>
              )}
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex items-start gap-3 rounded-2xl border border-[#FDBA74] bg-[#FDBA74]/15 p-4">
              <Sparkles className="h-5 w-5 text-[#F97316] shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#111827]">
                  Antes de escribir, revisa el Asistente VULO
                </p>
                <p className="text-sm text-[#475569] mt-1">
                  Toca el zorro flotante en la esquina inferior derecha en cualquier vista.
                  Ahí encuentras el paso a paso de cada módulo — sin esperar a que respondamos.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-[#CBD5E1] p-5">
                <MessageCircle className="h-6 w-6 text-[#F97316]" strokeWidth={1.75} />
                <p className="text-sm font-medium text-[#111827] mt-3">WhatsApp</p>
                <p className="text-sm text-[#475569] mt-0.5">+52 317 103 5768</p>
                <p className="text-xs text-[#475569] mt-2">La forma más rápida — respondemos en minutos.</p>
              </div>
              <div className="rounded-2xl border border-[#CBD5E1] p-5">
                <Mail className="h-6 w-6 text-[#F97316]" strokeWidth={1.75} />
                <p className="text-sm font-medium text-[#111827] mt-3">Correo</p>
                <a href="mailto:soporte@vulo.mx" className="text-sm text-[#F97316] hover:underline">
                  soporte@vulo.mx
                </a>
                <p className="text-xs text-[#475569] mt-2">Para casos que requieran adjuntos o seguimiento largo.</p>
              </div>
              <div className="rounded-2xl border border-[#CBD5E1] p-5">
                <Clock className="h-6 w-6 text-[#F97316]" strokeWidth={1.75} />
                <p className="text-sm font-medium text-[#111827] mt-3">Horario</p>
                <p className="text-sm text-[#475569] mt-0.5">Lun a Sáb · 9:00 – 20:00 (CDMX)</p>
                <p className="text-xs text-[#475569] mt-2">Urgencias 24/7 vía WhatsApp para clientes activos.</p>
              </div>
              <div className="rounded-2xl border border-[#CBD5E1] p-5">
                <MapPin className="h-6 w-6 text-[#F97316]" strokeWidth={1.75} />
                <p className="text-sm font-medium text-[#111827] mt-3">Ubicación</p>
                <p className="text-sm text-[#475569] mt-0.5">Autlán de Navarro, Jalisco</p>
                <p className="text-xs text-[#475569] mt-2">Uniline · Innovación en la nube.</p>
              </div>
            </div>

            <div className="rounded-2xl border border-[#CBD5E1] bg-[#F8FAFC] p-5">
              <p className="text-[11px] uppercase tracking-wide text-[#475569] font-medium">Mensaje que se enviará</p>
              <p className="text-sm text-[#111827] mt-2 font-medium">
                “Hola equipo VULO, necesito ayuda con la empresa {hotelNombre || 'mi hotel'}.”
              </p>
            </div>

            <Button
              asChild
              size="lg"
              className="w-full h-13 rounded-xl bg-[#F97316] hover:bg-[#F97316]/90 text-white text-base"
            >
              <a href={waUrl} target="_blank" rel="noreferrer">
                <MessageCircle className="h-5 w-5 mr-2" />
                Contactar soporte por WhatsApp
              </a>
            </Button>

            <div className="flex items-center justify-center gap-2">
              <LifeBuoy className="h-4 w-4 text-[#475569]" />
              <Badge className="rounded-md bg-[#10233F] text-white hover:bg-[#10233F]">
                Soporte oficial VULO
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}