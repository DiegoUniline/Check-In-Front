import { MainLayout } from '@/components/layout/MainLayout';
import { useParams } from 'react-router-dom';

export default function CheckIn() {
  const { id } = useParams();
  
  return (
    <MainLayout 
      title="Proceso de Check-In" 
      subtitle={`Reserva: ${id}`}
    >
      <div className="flex items-center justify-center h-[60vh] text-muted-foreground">
        Proceso de check-in - Próximamente
      </div>
    </MainLayout>
  );
}