import { useEffect, useState } from 'react';
import { AlertTriangle, Phone, Lock } from 'lucide-react';
import api from '@/lib/api';

const WHATSAPP_NUMERO = '5213171035768';
const MODAL_KEY = 'suscripcion_modal_shown';

export function AlertaSuscripcion() {
  const [suscripcion, setSuscripcion] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      try {
        const data = await api.getMiSuscripcion();
        setSuscripcion(data);
        
        if (data && data.dias_restantes !== -999) {
          // Vencida = siempre mostrar y no cerrar
          if (data.dias_restantes < 0) {
            setShowModal(true);
          } 
          // 7 días o menos = mostrar una vez al día
          else if (data.dias_restantes <= 7) {
            const lastShown = localStorage.getItem(MODAL_KEY);
            const today = new Date().toDateString();
            if (lastShown !== today) {
              setShowModal(true);
              localStorage.setItem(MODAL_KEY, today);
            }
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
      `Hola, quiero renovar mi suscripción del sistema hotelero. Mi suscripción ${estado}. ¿Me pueden ayudar?`
    );
    window.open(`https://wa.me/${WHATSAPP_NUMERO}?text=${mensaje}`, '_blank');
  };

  if (loading || !suscripcion || suscripcion.dias_restantes === -999) return null;
  
  const dias = suscripcion.dias_restantes;
  const vencida = dias < 0;

  // BLOQUEO TOTAL cuando está vencida
  if (vencida) {
    return (
      <div className="fixed inset-0 bg-slate-900 z-[9999] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
          <div className="bg-gradient-to-r from-red-600 to-red-800 p-8 text-white text-center">
            <Lock className="w-16 h-16 mx-auto mb-4" />
            <h2 className="text-2xl font-black">Acceso Bloqueado</h2>
            <p className="mt-2 text-red-200">Tu suscripción ha vencido</p>
          </div>
          
          <div className="p-6">
            <p className="text-slate-600 text-center mb-6 leading-relaxed">
              Para continuar usando el sistema y acceder a todas tus reservas, habitaciones y datos, es necesario renovar tu suscripción.
            </p>
            
            <button
              onClick={handleRenovar}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-4 px-6 rounded-xl font-bold flex items-center justify-center gap-3 hover:opacity-90 transition-all shadow-lg text-lg"
            >
              <Phone className="w-6 h-6" />
              Contactar para Renovar
            </button>
            
            <div className="mt-6 p-4 bg-slate-100 rounded-lg text-center">
              <p className="text-xs text-slate-500 mb-1">Línea directa de renovación</p>
              <p className="font-bold text-slate-700">{WHATSAPP_NUMERO}</p>
              <p className="text-xs text-slate-400 mt-1">Lun-Sab 9am-7pm</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Modal de advertencia (se puede cerrar)
  const ModalAdvertencia = () => {
    if (!showModal || dias > 7) return null;

    const getTitulo = () => {
      if (dias === 0) return '¡Tu suscripción vence hoy!';
      if (dias === 1) return 'Tu suscripción vence mañana';
      if (dias <= 3) return '¡Quedan pocos días!';
      return 'Tu suscripción está por vencer';
    };

    const getEmoji = () => {
      if (dias <= 1) return '⚠️';
      if (dias <= 3) return '🔔';
      return '📅';
    };

    const getMensaje = () => {
      if (dias === 0) return 'Hoy es el último día. Renueva ahora para no perder acceso mañana.';
      if (dias === 1) return 'Mañana vence tu suscripción. Renueva hoy para evitar interrupciones.';
      if (dias <= 3) return `Solo quedan ${dias} días. Renueva ahora.`;
      return `Tu suscripción vence en ${dias} días.`;
    };

    const getColorBg = () => {
      if (dias <= 1) return 'from-orange-500 to-red-600';
      if (dias <= 3) return 'from-yellow-500 to-orange-500';
      return 'from-blue-500 to-blue-700';
    };

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
          <div className={`bg-gradient-to-r ${getColorBg()} p-6 text-white text-center`}>
            <div className="text-5xl mb-3">{getEmoji()}</div>
            <h2 className="text-xl font-black">{getTitulo()}</h2>
            <div className="mt-3 bg-white/20 rounded-full px-4 py-1.5 inline-block">
              <span className="text-sm font-bold">
                {dias === 0 ? 'Último día' : dias === 1 ? 'Vence mañana' : `${dias} días restantes`}
              </span>
            </div>
          </div>
          
          <div className="p-6">
            <p className="text-slate-600 text-center mb-6">{getMensaje()}</p>
            
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
                className="w-full text-slate-500 py-2 text-sm hover:text-slate-700"
              >
                Recordarme después
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Banner para día de vencimiento
  const BannerHoy = () => {
    if (dias !== 0) return null;

    return (
      <div className="bg-orange-500 text-white px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 animate-pulse" />
          <span className="font-bold text-sm">⚠️ ¡Tu suscripción vence HOY!</span>
        </div>
        <button
          onClick={handleRenovar}
          className="bg-white text-slate-900 px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-slate-100"
        >
          <Phone className="w-4 h-4" />
          Renovar
        </button>
      </div>
    );
  };

  return (
    <>
      <ModalAdvertencia />
      <BannerHoy />
    </>
  );
}
