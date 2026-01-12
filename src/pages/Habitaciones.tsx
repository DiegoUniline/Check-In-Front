import { MainLayout } from '@/components/layout/MainLayout';

export default function Habitaciones() {
  return (
    <MainLayout 
      title="Gestión de Habitaciones" 
      subtitle="Administración y estado de habitaciones"
    >
      <div className="flex items-center justify-center h-[60vh] text-muted-foreground">
        Gestión de habitaciones - Próximamente
      </div>
    </MainLayout>
  );
}