import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BedDouble, DoorOpen, Sparkles, Wrench } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { KPICard } from '@/components/dashboard/KPICard';
import { CheckInsCard } from '@/components/dashboard/CheckInsCard';
import { VentasDiaCard } from '@/components/dashboard/VentasDiaCard';
import { TareasCriticasCard } from '@/components/dashboard/TareasCriticasCard';
import { OcupacionChart } from '@/components/dashboard/OcupacionChart';
import api from '@/lib/api';

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({ ocupadas: 0, disponibles: 0, pendientes_limpieza: 0, pendientes_mantenimiento: 0, total_habitaciones: 0, ocupacion_porcentaje: 0 });
  const [checkinsHoy, setCheckinsHoy] = useState([]);
  const [checkoutsHoy, setCheckoutsHoy] = useState([]);
  const [ventas, setVentas] = useState<any>({ total: 0, alojamiento: 0, alimentos: 0, servicios: 0 });
  const [tareasCriticas, setTareasCriticas] = useState<any>({ limpieza: [], mantenimiento: [] });

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const [statsData, checkins, checkouts, ventasData, tareas] = await Promise.all([
          api.getDashboardStats(),
          api.getDashboardCheckinsHoy(),
          api.getDashboardCheckoutsHoy(),
          api.getDashboardVentasHoy(),
          api.getDashboardTareasCriticas()
        ]);
        console.log('Dashboard data:', { statsData, checkins, checkouts, ventasData, tareas });
        
        setStats(statsData || { ocupadas: 0, disponibles: 0, pendientes_limpieza: 0, pendientes_mantenimiento: 0, total_habitaciones: 0, ocupacion_porcentaje: 0 });
        setCheckinsHoy(Array.isArray(checkins) ? checkins : []);
        setCheckoutsHoy(Array.isArray(checkouts) ? checkouts : []);
        
        // Map ventas data - handle different API response structures
        if (ventasData) {
          setVentas({
            total: ventasData.total || ventasData.total_ventas || ventasData.ingresos_total || 0,
            alojamiento: ventasData.alojamiento || ventasData.hospedaje || ventasData.ingresos_hospedaje || 0,
            alimentos: ventasData.alimentos || ventasData.alimentos_bebidas || ventasData.ingresos_alimentos || 0,
            servicios: ventasData.servicios || ventasData.otros_servicios || ventasData.ingresos_servicios || 0,
          });
        } else {
          setVentas({ total: 0, alojamiento: 0, alimentos: 0, servicios: 0 });
        }
        
        // Handle tareas - could be array or object with limpieza property
        if (Array.isArray(tareas)) {
          setTareasCriticas({ limpieza: tareas, mantenimiento: [] });
        } else {
          setTareasCriticas(tareas || { limpieza: [], mantenimiento: [] });
        }
      } catch (error) {
        console.error('Error cargando dashboard:', error);
        // Set default values on error
        setStats({ ocupadas: 0, disponibles: 0, pendientes_limpieza: 0, pendientes_mantenimiento: 0, total_habitaciones: 0, ocupacion_porcentaje: 0 });
        setCheckinsHoy([]);
        setCheckoutsHoy([]);
        setVentas({ total: 0, alojamiento: 0, alimentos: 0, servicios: 0 });
        setTareasCriticas({ limpieza: [], mantenimiento: [] });
      } finally {
        setLoading(false);
      }
    };
    cargarDatos();
  }, []);

  const handleCheckin = (reservaId: string) => {
    navigate(`/checkin/${reservaId}`);
  };

  const handleCheckout = (reservaId: string) => {
    navigate(`/checkout/${reservaId}`);
  };

  const handleAtenderTarea = (tareaId: string) => {
    navigate(`/limpieza?tarea=${tareaId}`);
  };

  if (loading) {
    return (
      <MainLayout title="Panel Principal" subtitle="Cargando...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

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
          subtitle={`de ${stats.total_habitaciones} habitaciones`}
          icon={BedDouble}
          trend={{ value: `${stats.ocupacion_porcentaje || 0}%`, positive: true }}
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
          value={stats.pendientes_limpieza}
          icon={Sparkles}
          badge={stats.pendientes_limpieza > 5 ? { text: 'Prioridad', variant: 'destructive' } : undefined}
          iconColor="text-info"
          iconBgColor="bg-info/10"
        />
        <KPICard
          title="En Mantenimiento"
          value={stats.pendientes_mantenimiento}
          icon={Wrench}
          badge={stats.pendientes_mantenimiento > 0 ? { text: 'Fuera de servicio', variant: 'outline' } : undefined}
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
            tareas={tareasCriticas.limpieza || []} 
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
