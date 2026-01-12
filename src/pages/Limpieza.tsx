import { MainLayout } from '@/components/layout/MainLayout';

export default function Limpieza() {
  return (
    <MainLayout 
      title="Módulo de Limpieza" 
      subtitle="Gestión de tareas de housekeeping"
    >
      <div className="flex items-center justify-center h-[60vh] text-muted-foreground">
        Módulo de limpieza - Próximamente
      </div>
    </MainLayout>
  );
}