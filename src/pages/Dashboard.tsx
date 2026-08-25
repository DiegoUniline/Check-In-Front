import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BedDouble,
  DoorOpen,
  Sparkles,
  Wrench,
  CalendarPlus,
  LogIn,
  LogOut,
  Search,
  ArrowRight,
  CalendarDays,
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PublicLinkBanner } from '@/components/PublicLinkBanner';
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
  const [checkinsHoy, setCheckinsHoy] = useState<any[]>([]);
  const [checkoutsHoy, setCheckoutsHoy] = useState<any[]>([]);
  const [ventas, setVentas] = useState<any>({ total: 0, alojamiento: 0, alimentos: 0, servicios: 0 });
  const [tareasCriticas, setTareasCriticas] = useState<any>({ limpieza: [], mantenimiento: [] });

  const cargarDatos = async () => {
    try {
      const results = await Promise.allSettled([
        api.getDashboardStats(),
        api.getDashboardCheckinsHoy(),
        api.getDashboardCheckoutsHoy(),
        api.getDashboardVentasHoy().catch(() => null),
        api.getDashboardTareasCriticas().catch(() => ({ limpieza: [], mantenimiento: [] })),
        api.getHabitaciones().catch(() => []),
      ]);

      const [statsResult, checkinsResult, checkoutsResult, ventasResult, tareasResult, habitacionesResult] = results;
      const habitaciones = (habitacionesResult.status === 'fulfilled' && Array.isArray(habitacionesResult.value))
        ? habitacionesResult.value
        : [];

      const pendientesLimpiezaCalculado = habitaciones.filter((h: any) => {
        const estado = String(h.estado_limpieza ?? h.estadoLimpieza ?? '').trim();
        return estado !== '' && estado !== 'Limpia';
      }).length;

      const pendientesMantenimientoCalculado = habitaciones.filter((h: any) => {
        const estado = String(h.estado_mantenimiento ?? h.estadoMantenimiento ?? '').trim();
        return estado !== '' && estado !== 'OK';
      }).length;

      if (statsResult.status === 'fulfilled' && statsResult.value) {
        const s: any = statsResult.value;
        setStats({
          ...s,
          ocupadas: s.ocupadas ?? s.habitaciones_ocupadas ?? 0,
          disponibles: s.disponibles ?? s.habitaciones_disponibles ?? 0,
          total_habitaciones: s.total_habitaciones ?? s.habitaciones_total ?? habitaciones.length ?? 0,
          ocupacion_porcentaje: s.ocupacion_porcentaje ?? s.ocupacion ?? 0,
          pendientes_limpieza: pendientesLimpiezaCalculado,
          pendientes_mantenimiento: pendientesMantenimientoCalculado,
        });
      } else {
        setStats((prev: any) => ({
          ...prev,
          pendientes_limpieza: pendientesLimpiezaCalculado,
          pendientes_mantenimiento: pendientesMantenimientoCalculado,
          total_habitaciones: prev.total_habitaciones || habitaciones.length || 0,
        }));
      }

      if (checkinsResult.status === 'fulfilled') {
        setCheckinsHoy(Array.isArray(checkinsResult.value) ? checkinsResult.value : []);
      }

      if (checkoutsResult.status === 'fulfilled') {
        setCheckoutsHoy(Array.isArray(checkoutsResult.value) ? checkoutsResult.value : []);
      }

      if (ventasResult.status === 'fulfilled' && ventasResult.value) {
        const v: any = ventasResult.value;
        setVentas({
          total: v.total || v.total_ventas || v.ingresos_total || 0,
          alojamiento: v.alojamiento || v.hospedaje || v.ingresos_hospedaje || 0,
          alimentos: v.alimentos || v.alimentos_bebidas || v.ingresos_alimentos || 0,
          servicios: v.servicios || v.otros_servicios || v.ingresos_servicios || 0,
        });
      } else {
        try {
          const hoy = new Date().toISOString().split('T')[0];
          const pagos = await api.getPagos({ fecha: hoy });
          if (Array.isArray(pagos) && pagos.length > 0) {
            const totalPagos = pagos.reduce((sum: number, p: any) => sum + (Number(p.monto) || 0), 0);
            setVentas({ total: totalPagos, alojamiento: totalPagos, alimentos: 0, servicios: 0 });
          }
        } catch {
          // Mantener valores en cero si no existe un endpoint compatible.
        }
      }

      if (tareasResult.status === 'fulfilled') {
        const tareas: any = tareasResult.value;
        if (Array.isArray(tareas)) {
          setTareasCriticas({ limpieza: tareas, mantenimiento: [] });
        } else {
          setTareasCriticas(tareas || { limpieza: [], mantenimiento: [] });
        }
      }
    } catch (error) {
      console.error('Error cargando dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    const onChange = (e: Event) => {
      const t = (e as CustomEvent).detail?.table;
      if (t === 'reservas' || t === 'habitaciones' || t === 'pagos' || t === 'tareas_limpieza' || t === 'tareas_mantenimiento') {
        cargarDatos();
      }
    };
    window.addEventListener('data:changed', onChange);
    return () => window.removeEventListener('data:changed', onChange);
  }, []);

  const fechaHoy = useMemo(() => {
    return new Intl.DateTimeFormat('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(new Date());
  }, []);

  const quickActions = [
    { label: 'Nueva reserva', description: 'Crear una reservación', icon: CalendarPlus, onClick: () => navigate('/reservas') },
    { label: 'Hacer check-in', description: `${checkinsHoy.length} pendiente${checkinsHoy.length === 1 ? '' : 's'} hoy`, icon: LogIn, onClick: () => navigate('/reservas/checkin') },
    { label: 'Hacer check-out', description: `${checkoutsHoy.length} salida${checkoutsHoy.length === 1 ? '' : 's'} hoy`, icon: LogOut, onClick: () => navigate('/reservas/checkout') },
    { label: 'Buscar huésped', description: 'Reserva, cliente o habitación', icon: Search, onClick: () => window.dispatchEvent(new CustomEvent('open-command-palette')) },
  ];

  const handleCheckin = (reservaId: string) => navigate(`/checkin/${reservaId}`);
  const handleCheckout = (reservaId: string) => navigate(`/checkout/${reservaId}`);
  const handleAtenderTarea = (tareaId: string) => navigate(`/limpieza?tarea=${tareaId}`);

  if (loading) {
    return (
      <MainLayout title="Inicio" subtitle="Operación del hotel">
        <div className="space-y-5 animate-pulse">
          <div className="h-28 rounded-2xl bg-muted" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => <div key={i} className="h-24 rounded-2xl bg-muted" />)}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="h-72 rounded-2xl bg-muted" />
            <div className="h-72 rounded-2xl bg-muted" />
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Inicio" subtitle="Lo importante del hotel, en un solo lugar">
      <div className="space-y-5 lg:space-y-6">
        <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-center lg:justify-between lg:p-6">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                <CalendarDays className="h-4 w-4 text-primary" />
                {fechaHoy}
              </div>
              <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">¿Qué necesitas hacer?</h2>
              <p className="mt-1 text-sm text-muted-foreground">Accede directo a las tareas más frecuentes de recepción.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => navigate('/reservas')}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:brightness-95"
              >
                <CalendarPlus className="h-4 w-4" />
                Nueva reserva
              </button>
              <button
                type="button"
                onClick={() => navigate('/habitaciones')}
                className="inline-flex h-10 items-center gap-2 rounded-xl border bg-background px-4 text-sm font-medium text-foreground transition-all hover:bg-muted"
              >
                Ver habitaciones
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid border-t sm:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action, index) => (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                className={`group flex items-center gap-3 p-4 text-left transition-colors hover:bg-muted/55 lg:p-5 ${index > 0 ? 'border-t sm:border-t-0 sm:border-l' : ''} ${index === 2 ? 'sm:border-l-0 lg:border-l' : ''} ${index === 3 ? 'lg:border-l' : ''}`}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-105">
                  <action.icon className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-foreground">{action.label}</span>
                  <span className="block truncate text-xs text-muted-foreground">{action.description}</span>
                </span>
              </button>
            ))}
          </div>
        </section>

        <PublicLinkBanner />

        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-foreground">Estado del hotel</h2>
              <p className="text-xs text-muted-foreground sm:text-sm">Lectura rápida de ocupación y pendientes.</p>
            </div>
            <button type="button" onClick={() => navigate('/habitaciones')} className="hidden text-sm font-medium text-primary hover:underline sm:inline-flex">Ver habitaciones</button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KPICard
              title="Ocupadas"
              value={stats.ocupadas}
              subtitle={`de ${stats.total_habitaciones} habitaciones`}
              icon={BedDouble}
              trend={{ value: `${stats.ocupacion_porcentaje || 0}%`, positive: true }}
              iconColor="text-warning"
              iconBgColor="bg-warning/10"
            />
            <KPICard
              title="Disponibles"
              value={stats.disponibles}
              icon={DoorOpen}
              badge={{ text: 'Listas para vender', variant: 'secondary' }}
              iconColor="text-success"
              iconBgColor="bg-success/10"
            />
            <KPICard
              title="Por limpiar"
              value={stats.pendientes_limpieza}
              icon={Sparkles}
              badge={stats.pendientes_limpieza > 5 ? { text: 'Prioridad', variant: 'destructive' } : undefined}
              iconColor="text-info"
              iconBgColor="bg-info/10"
            />
            <KPICard
              title="Mantenimiento"
              value={stats.pendientes_mantenimiento}
              icon={Wrench}
              badge={stats.pendientes_mantenimiento > 0 ? { text: 'Revisar', variant: 'outline' } : undefined}
              iconColor="text-destructive"
              iconBgColor="bg-destructive/10"
            />
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-5">
            <CheckInsCard title="Llegadas de hoy" reservas={checkinsHoy} type="checkin" onAction={handleCheckin} />
            <CheckInsCard title="Salidas de hoy" reservas={checkoutsHoy} type="checkout" onAction={handleCheckout} />
          </div>
          <div className="space-y-5">
            <TareasCriticasCard tareas={tareasCriticas.limpieza || []} onAtender={handleAtenderTarea} />
            <VentasDiaCard ventas={ventas} />
          </div>
        </section>

        <section>
          <div className="mb-3">
            <h2 className="text-base font-semibold tracking-tight text-foreground">Ocupación</h2>
            <p className="text-xs text-muted-foreground sm:text-sm">Comportamiento reciente del hotel.</p>
          </div>
          <OcupacionChart />
        </section>
      </div>
    </MainLayout>
  );
}
