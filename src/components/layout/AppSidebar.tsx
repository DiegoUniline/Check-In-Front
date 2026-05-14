import { 
  LayoutDashboard, 
  CalendarDays, 
  BedDouble, 
  Users, 
  Sparkles, 
  Wrench, 
  ShoppingCart, 
  Package, 
  BarChart3, 
  Settings,
  Hotel,
  Clock,
  Receipt,
  ShoppingBag,
  History,
  BookOpen,
  UserCog,
  FileText,
  ShieldAlert,
  ShieldCheck // Icono para Diego
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { useAuth } from "@/contexts/useAuth"; // Importante para detectar a Diego
import { canAccess } from '@/lib/permissions';

const mainNavItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard, viewKey: 'dashboard' },
  { title: 'Reservas', url: '/reservas', icon: CalendarDays, viewKey: 'reservas' },
  { title: 'Habitaciones', url: '/habitaciones', icon: BedDouble, viewKey: 'habitaciones' },
  { title: 'Clientes', url: '/clientes', icon: Users, viewKey: 'clientes' },
];

const operationsNavItems = [
  { title: 'Limpieza', url: '/limpieza', icon: Sparkles, viewKey: 'limpieza' },
  { title: 'Mantenimiento', url: '/mantenimiento', icon: Wrench, viewKey: 'mantenimiento' },
];

const salesNavItems = [
  { title: 'POS', url: '/pos', icon: ShoppingCart, viewKey: 'pos' },
  { title: 'Inventario', url: '/inventario', icon: Package, viewKey: 'inventario' },
  { title: 'Compras', url: '/compras', icon: ShoppingBag, viewKey: 'compras' },
  { title: 'Gastos', url: '/gastos', icon: Receipt, viewKey: 'gastos' },
  { title: 'Historial Ventas', url: '/historial', icon: History, viewKey: 'historial' },
  { title: 'Historial Reservas', url: '/historial-reservas', icon: FileText, viewKey: 'historial-reservas' },
  { title: 'Reportes', url: '/reportes', icon: BarChart3, viewKey: 'reportes' },
];

const configNavItems = [
  { title: 'Usuarios', url: '/usuarios', icon: UserCog, viewKey: 'usuarios' },
  { title: 'Permisos', url: '/permisos', icon: ShieldAlert, viewKey: 'permisos' },
  { title: 'Turnos', url: '/turnos', icon: Clock, viewKey: 'turnos' },
  { title: 'Catálogos', url: '/catalogos', icon: BookOpen, viewKey: 'catalogos' },
  { title: 'Configuración', url: '/configuracion', icon: Settings, viewKey: 'configuracion' },
];

// Item especial para Diego
const adminSaaSItem = [
  { title: 'Administrar SaaS', url: '/admin-plataforma', icon: ShieldCheck },
];

export function AppSidebar() {
  const location = useLocation();
  const { state } = useSidebar();
  const { user } = useAuth(); // Detectamos al usuario actual
  const collapsed = state === 'collapsed';

  const [ocupadas, setOcupadas] = useState(0);
  const [totalHab, setTotalHab] = useState(0);

  useEffect(() => {
    const cargarOcupacion = async () => {
      try {
        // Calcular ocupación real desde reservas activas (con check-in pero sin check-out),
        // no desde el campo `estado_habitacion` que puede quedar desincronizado si se
        // eliminan reservas sin pasar por el flujo de checkout.
        const [habs, reservas] = await Promise.all([
          api.getHabitaciones().catch(() => []),
          api.getReservas().catch(() => []),
        ]);
        const total = Array.isArray(habs) ? habs.length : 0;
        const ocupadasIds = new Set(
          (Array.isArray(reservas) ? reservas : [])
            .filter((r: any) => r.checkin_realizado && !r.checkout_realizado)
            .map((r: any) => r.habitacion_id)
            .filter(Boolean)
        );
        setTotalHab(total);
        setOcupadas(ocupadasIds.size);
      } catch (e) {
        setTotalHab(0);
        setOcupadas(0);
      }
    };
    cargarOcupacion();
    const interval = setInterval(cargarOcupacion, 60_000);
    return () => clearInterval(interval);
  }, []);

  const occupancyPercent =
    totalHab > 0 ? Math.round((ocupadas / totalHab) * 100) : 0;

  const renderNavItems = (items: { title: string; url: string; icon: any; viewKey?: string }[]) => {
    const visible = items.filter(it => !it.viewKey || canAccess(it.viewKey, user?.rol));
    if (visible.length === 0) return null;
    return (
    <SidebarMenu>
      {visible.map((item) => {
        const isActive = location.pathname === item.url || 
          (item.url !== '/dashboard' && location.pathname.startsWith(item.url));
        
        return (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton asChild isActive={isActive}>
              <NavLink 
                to={item.url} 
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 transition-all",
                  isActive 
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50",
                  // Estilo azul si es el botón de SaaS
                  item.url === '/admin-plataforma' && "text-blue-600 font-bold"
                )}
              >
                <item.icon className={cn("h-5 w-5 shrink-0", item.url === '/admin-plataforma' && "text-blue-600")} />
                {!collapsed && <span>{item.title}</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="border-b px-4 py-4">
        <NavLink to="/dashboard" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Hotel className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-base font-bold text-sidebar-foreground">Hotel Check-In</span>
              <span className="text-xs text-muted-foreground">Sistema de Gestión</span>
            </div>
          )}
        </NavLink>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        {/* SECCIÓN PARA DIEGO - Solo aparece si el correo coincide */}
        {user?.email === 'diego.leon@uniline.mx' && (
          <SidebarGroup>
            {!collapsed && <SidebarGroupLabel className="text-blue-600 font-bold">Administración Maestro</SidebarGroupLabel>}
            <SidebarGroupContent>
              {renderNavItems(adminSaaSItem)}
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Principal</SidebarGroupLabel>}
          <SidebarGroupContent>
            {renderNavItems(mainNavItems)}
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Operaciones</SidebarGroupLabel>}
          <SidebarGroupContent>
            {renderNavItems(operationsNavItems)}
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Ventas</SidebarGroupLabel>}
          <SidebarGroupContent>
            {renderNavItems(salesNavItems)}
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Sistema</SidebarGroupLabel>}
          <SidebarGroupContent>
            {renderNavItems(configNavItems)}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        {!collapsed ? (
          <div className="rounded-lg bg-sidebar-accent p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-sidebar-foreground">Ocupación Actual</span>
              <span className="text-lg font-bold text-primary">{occupancyPercent}%</span>
            </div>
            <Progress value={occupancyPercent} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {ocupadas} de {totalHab} habitaciones
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <span className="text-xs font-bold text-primary">{occupancyPercent}%</span>
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
