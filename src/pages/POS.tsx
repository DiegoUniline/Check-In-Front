import { MainLayout } from '@/components/layout/MainLayout';

export default function POS() {
  return (
    <MainLayout 
      title="Punto de Venta" 
      subtitle="Sistema de ventas y cargos a habitación"
    >
      <div className="flex items-center justify-center h-[60vh] text-muted-foreground">
        Punto de venta - Próximamente
      </div>
    </MainLayout>
  );
}