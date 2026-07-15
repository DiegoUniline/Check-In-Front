import { MainLayout } from '@/components/layout/MainLayout';
import { EvolutionConfig } from '@/components/configuracion/EvolutionConfig';
import { WhatsAppConfig } from '@/components/configuracion/WhatsAppConfig';

export default function WhatsAppConexion() {
  return (
    <MainLayout title="Conexión de WhatsApp" subtitle="Conecta tu número por QR y administra plantillas">
      <div className="space-y-6">
        <EvolutionConfig />
        <WhatsAppConfig />
      </div>
    </MainLayout>
  );
}