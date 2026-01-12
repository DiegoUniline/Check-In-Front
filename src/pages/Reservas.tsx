import { MainLayout } from '@/components/layout/MainLayout';

export default function Reservas() {
  return (
    <MainLayout 
      title="Calendario de Reservas" 
      subtitle="Gestión de ocupación y disponibilidad en tiempo real"
    >
      <div className="flex items-center justify-center h-[60vh] text-muted-foreground">
        Calendario de reservas - Próximamente
      </div>
    </MainLayout>
  );
}