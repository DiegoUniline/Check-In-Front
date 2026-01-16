import { useEffect, useState } from 'react';
import { AlertTriangle, Clock, Phone, X } from 'lucide-react';
import api from '@/lib/api';

const WHATSAPP_NUMERO = '5213171035768';

export function AlertaSuscripcion() {
  const [suscripcion, setSuscripcion] = useState<any>(null);
  const [visible, setVisible] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      try {
        const data = await api.getMiSuscripcion();
        setSuscripcion(data);
      } catch (e) {
        console.error('Error cargando suscripción:', e);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, []);

  if (loading || !visible || !suscripcion) return null;
  
  const dias = suscripcion.dias_restantes;
  
  // Solo mostrar si quedan 7 días o menos
  if (dias > 7) return null;

  const getMensaje = () => {
    if (dias < 0) return '⚠️ Tu suscripción ha vencido';
    if (dias === 0) return '⚠️ Tu suscripción vence HOY';
    if (dias === 1) return '⚠️ Tu suscripción vence MAÑANA';
    return `⏳ Te quedan ${dias} días de suscripción`;
  };

  const getColor = () => {
    if (dias <= 0) return 'bg-red-600';
    if (dias <= 2) return 'bg-orange-500';
    return 'bg-yellow-500';
  };

  const handleRenovar = () => {
    const mensaje = encodeURIComponent(
      `Hola, quiero renovar mi suscripción del hotel. Mi suscripción vence ${dias <= 0 ? 'ya venció' : dias === 0 ? 'hoy' : dias === 1 ? 'mañana' : `en ${dias} días`}. ¿Me pueden ayudar?`
    );
    window.open(`https://wa.me/${WHATSAPP_NUMERO}?text=${mensaje}`, '_blank');
  };

  return (
    <div className={`${getColor()} text-white px-4 py-3 flex items-center justify-between gap-4 animate-pulse`}>
      <div className="flex items-center gap-3">
        {dias <= 2 ? <AlertTriangle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
        <span className="font-bold text-sm">{getMensaje()}</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleRenovar}
          className="bg-white text-slate-900 px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-slate-100 transition-all"
        >
          <Phone className="w-4 h-4" />
          Renovar Ahora
        </button>
        <button onClick={() => setVisible(false)} className="p-1 hover:bg-white/20 rounded">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
