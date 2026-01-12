import { useNavigate } from 'react-router-dom';
import { BedDouble, DoorOpen, Sparkles, Wrench } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { KPICard } from '@/components/dashboard/KPICard';
import { CheckInsCard } from '@/components/dashboard/CheckInsCard';
import { VentasDiaCard } from '@/components/dashboard/VentasDiaCard';
import { TareasCriticasCard } from '@/components/dashboard/TareasCriticasCard';
import { OcupacionChart } from '@/components/dashboard/OcupacionChart';
import { 
  getDashboardStats, 
  getCheckinsHoy, 
  getCheckoutsHoy, 
  getVentasHoy, 
  getTareasCriticas 
} from '@/data/mockData';

export default function Dashboard() {
  const navigate = useNavigate();
  const stats = getDashboardStats();
  const checkinsHoy = getCheckinsHoy();
  const checkoutsHoy = getCheckoutsHoy();
  const ventas = getVentasHoy();
  const tareasCriticas = getTareasCriticas();

  const handleCheckin = (reservaId: string) => {
    navigate(`/checkin/${reservaId}`);
  };

  const handleCheckout = (reservaId: string) => {
    navigate(`/checkout/${reservaId}`);
  };

  const handleAtenderTarea = (tareaId: string) => {
    navigate(`/limpieza?tarea=${tareaId}`);
  };

  return (
    <MainLayout 
      title="Panel Principal" 
      subtitle="Resumen de operaciones del hotel"
    >
      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <KPICard
          title="Habitaciones Ocupadas"
          value={stats.ocupadas}
          subtitle={`de ${stats.total} habitaciones`}
          icon={BedDouble}
          trend={{ value: '+3 hoy', positive: true }}
          iconColor="text-warning"
          iconBgColor="bg-warning/10"
        />
        <KPICard
          title="Habitaciones Libres"
          value={stats.disponibles}
          icon={DoorOpen}
          badge={{ text: 'Disponibles', variant: 'secondary' }}
          iconColor="text-success"
          iconBgColor="bg-success/10"
        />
        <KPICard
          title="En Limpieza"
          value={stats.limpieza}
          icon={Sparkles}
          badge={stats.limpieza > 5 ? { text: 'Prioridad', variant: 'destructive' } : undefined}
          iconColor="text-info"
          iconBgColor="bg-info/10"
        />
        <KPICard
          title="En Mantenimiento"
          value={stats.mantenimiento}
          icon={Wrench}
          badge={stats.mantenimiento > 0 ? { text: 'Fuera de servicio', variant: 'outline' } : undefined}
          iconColor="text-destructive"
          iconBgColor="bg-destructive/10"
        />
      </div>

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left column */}
        <div className="space-y-6">
          <CheckInsCard
            title="Check-ins Pendientes (Hoy)"
            reservas={checkinsHoy}
            type="checkin"
            onAction={handleCheckin}
          />
          <CheckInsCard
            title="Check-outs del Día"
            reservas={checkoutsHoy}
            type="checkout"
            onAction={handleCheckout}
          />
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <VentasDiaCard ventas={ventas} />
          <TareasCriticasCard 
            tareas={tareasCriticas} 
            onAtender={handleAtenderTarea}
          />
        </div>
      </div>

      {/* Occupancy chart */}
      <div className="mt-6">
        <OcupacionChart />
      </div>
    </MainLayout>
  );
}