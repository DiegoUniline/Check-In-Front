import { MainLayout } from '@/components/layout/MainLayout';

export default function Mantenimiento() {
  return (
    <MainLayout 
      title="Mantenimiento" 
      subtitle="Gestión de tickets y reparaciones"
    >
      <div className="flex items-center justify-center h-[60vh] text-muted-foreground">
        Módulo de mantenimiento - Próximamente
      </div>
    </MainLayout>
  );
}