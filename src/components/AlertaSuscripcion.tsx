import { useEffect, useState } from 'react';
import { AlertTriangle, Phone } from 'lucide-react';
import api from '@/lib/api';

const WHATSAPP_NUMERO = '5213171035768';
const MODAL_KEY = 'suscripcion_modal_shown';

export function AlertaSuscripcion() {
  const [suscripcion, setSuscripcion] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [showBanner, setShowBanner] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      try {
        const data = await api.getMiSuscripcion();
        setSuscripcion(data);
        
        if (data && data.dias_restantes <= 7 && data.dias_restantes > -999) {
          const lastShown = localStorage.getItem(MODAL_KEY);
          const today = new Date().toDateString();
          if (lastShown !== today) {
            setShowModal(true);
            localStorage.setItem(MODAL_KEY, today);
          }
        }
      } catch (e) {
        console.error('Error cargando suscripción:', e);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, []);

  const handleRenovar = () => {
    const dias = suscripcion?.dias_restantes || 0;
    let estado = '';
    if (dias < 0) estado = 'ya venció';
    else if (dias === 0) estado = 'vence hoy';
    else if (dias === 1) estado = 'vence mañana';
    else estado = `vence en ${dias} días`;
    
    const mensaje = encodeURIComponent(
      `Hola, quiero renovar mi suscripción del sistema hotelero. Mi suscripción ${estado}. ¿Me pueden ayudar con la renovación?`
    );
    window.open(`https://wa.me/${WHATSAPP_NUMERO}?text=${mensaje}`, '_blank');
  };

  if (loading || !suscripcion || suscripcion.dias_restantes === -999) return null;
  
  const dias = suscripcion.dias_restantes;

  const ModalSuscripcion = () => {
    if (!showModal || dias > 7) return null;

    const getTitulo = () => {
      if (dias < 0) return 'Tu suscripción ha vencido';
      if (dias === 0) return '¡Tu suscripción vence hoy!';
      if (dias === 1) return 'Tu suscripción vence mañana';
      if (dias <= 3) return '¡Quedan pocos días!';
      return 'Tu suscripción está por vencer';
    };

    const getEmoji = () => {
      if (dias < 0) return '😟';
      if (dias <= 1) return '⚠️';
      if (dias <= 3) return '🔔';
      return '📅';
    };

    const getMensaje = () => {
      if (dias < 0) return 'Para seguir disfrutando de todas las funciones del sistema, es necesario renovar tu suscripción. Contáctanos ahora y te ayudamos en minutos.';
      if (dias === 0) return 'Hoy es el último día de tu suscripción. Renueva ahora para no perder acceso al sistema y mantener tu operación sin interrupciones.';
      if (dias === 1) return 'Mañana vence tu suscripción. Te recomendamos renovar hoy para asegurar la continuidad de tu servicio sin contratiempos.';
      if (dias <= 3) return `Solo te quedan ${dias} días de suscripción. Aprovecha para renovar ahora y evita interrupciones en tu operación diaria.`;
      return `Tu suscripción vence en ${dias} días. Te recordamos renovar con anticipación para mantener tu sistema siempre activo.`;
    };

    const getColorBg = () => {
      if (dias < 0) return 'from-red-500 to-red-700';
      if (dias <= 1) return 'from-orange-500 to-red-600';
      if (dias <= 3) return 'from-yellow-500 to-orange-500';
      return 'from-blue-500 to-blue-700';
    };

    const getDiasLabel = () => {
      if (dias < 0) return 'Vencida';
      if (dias === 0) return 'Último día';
      if (dias === 1) return 'Vence mañana';
      return `${dias} días restantes`;
    };

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
          <div className={`bg-gradient-to-r ${getColorBg()} p-6 text-white text-center`}>
            <div className="text-5xl mb-3">{getEmoji()}</div>
            <h2 className="text-xl font-black">{getTitulo()}</h2>
            <div className="mt-3 bg-white/20 rounded-full px-4 py-1.5 inline-block">
              <span className="text-sm font-bold">{getDiasLabel()}</span>
            </div>
          </div>
          
          <div className="p-6">
            <p className="text-slate-600 text-center mb-6 leading-relaxed">
              {getMensaje()}
            </p>
            
            <div className="space-y-3">
              <button
                onClick={handleRenovar}
                className={`w-full bg-gradient-to-r ${getColorBg()} text-white py-4 px-6 rounded-xl font-bold flex items-center justify-center gap-3 hover:opacity-90 transition-all shadow-lg`}
              >
                <Phone className="w-5 h-5" />
                Renovar por WhatsApp
              </button>
              
              <button
                onClick={() => setShowModal(false)}
                className="w-full text-slate-500 py-2 text-sm hover:text-slate-700 transition-colors"
              >
                Recordarme después
              </button>
            </div>
            
            <p className="text-center text-xs text-slate-400 mt-4">
              Soporte disponible Lun-Sab 9am-7pm
            </p>
          </div>
        </div>
      </div>
    );
  };

  const BannerUrgente = () => {
    if (!showBanner || dias > 0) return null;

    return (
      <div className={`${dias < 0 ? 'bg-red-600' : 'bg-orange-500'} text-white px-4 py-3 flex items-center justify-between gap-4`}>
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 animate-pulse" />
          <span className="font-bold text-sm">
            {dias < 0 ? '⚠️ Tu suscripción ha vencido - Renueva para continuar' : '⚠️ ¡Tu suscripción vence HOY!'}
          </span>
        </div>
        <button
          onClick={handleRenovar}
          className="bg-white text-slate-900 px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-slate-100 transition-all"
        >
          <Phone className="w-4 h-4" />
          Renovar
        </button>
      </div>
    );
  };

  return (
    <>
      <ModalSuscripcion />
      <BannerUrgente />
    </>
  );
}
