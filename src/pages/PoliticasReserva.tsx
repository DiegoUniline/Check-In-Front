import { MainLayout } from '@/components/layout/MainLayout';
import { PoliticasReservaPanel } from '@/components/reservas/PoliticasReservaPanel';

export default function PoliticasReserva() {
  return (
    <MainLayout title="Políticas de reserva" subtitle="Reglas de estancia mínima, días de llegada y noches sueltas">
      <PoliticasReservaPanel />
    </MainLayout>
  );
}
