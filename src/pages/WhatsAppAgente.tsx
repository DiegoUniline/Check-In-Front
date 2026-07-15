import { MainLayout } from '@/components/layout/MainLayout';
import { WhatsAppAgentConfig } from '@/components/configuracion/WhatsAppAgentConfig';

export default function WhatsAppAgente() {
  return (
    <MainLayout title="Agente IA de WhatsApp" subtitle="Recepcionista virtual 24/7 con IA">
      <WhatsAppAgentConfig />
    </MainLayout>
  );
}