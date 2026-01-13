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
  BookOpen
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
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

const mainNavItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Reservas', url: '/reservas', icon: CalendarDays },
  { title: 'Habitaciones', url: '/habitaciones', icon: BedDouble },
  { title: 'Clientes', url: '/clientes', icon: Users },
];

const operationsNavItems = [
  { title: 'Limpieza', url: '/limpieza', icon: Sparkles },
  { title: 'Mantenimiento', url: '/mantenimiento', icon: Wrench },
];

const salesNavItems = [
  { title: 'POS', url: '/pos', icon: ShoppingCart },
  { title: 'Inventario', url: '/inventario', icon: Package },
  { title: 'Compras', url: '/compras', icon: ShoppingBag },
  { title: 'Gastos', url: '/gastos', icon: Receipt },
  { title: 'Historial', url: '/historial', icon: History },
  { title: 'Reportes', url: '/reportes', icon: BarChart3 },
];

const configNavItems = [
  { title: 'Turnos', url: '/turnos', icon: Clock },
  { title: 'Catálogos', url: '/catalogos', icon: BookOpen },
  { title: 'Configuración', url: '/configuracion', icon: Settings },
];

export function AppSidebar() {
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  
  // Mock occupancy data
  const occupancyPercent = 84;

  const renderNavItems = (items: typeof mainNavItems) => (
    <SidebarMenu>
      {items.map((item) => {
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
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{item.title}</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );

  return (
    <Sidebar collapsible="icon" className="border-r">
      {/* Header with logo */}
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
        {/* Main navigation */}
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Principal</SidebarGroupLabel>}
          <SidebarGroupContent>
            {renderNavItems(mainNavItems)}
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Operations */}
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Operaciones</SidebarGroupLabel>}
          <SidebarGroupContent>
            {renderNavItems(operationsNavItems)}
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Sales & Reports */}
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Ventas</SidebarGroupLabel>}
          <SidebarGroupContent>
            {renderNavItems(salesNavItems)}
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Configuration */}
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Sistema</SidebarGroupLabel>}
          <SidebarGroupContent>
            {renderNavItems(configNavItems)}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer with occupancy indicator */}
      <SidebarFooter className="border-t p-4">
        {!collapsed ? (
          <div className="rounded-lg bg-sidebar-accent p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-sidebar-foreground">Ocupación Actual</span>
              <span className="text-lg font-bold text-primary">{occupancyPercent}%</span>
            </div>
            <Progress value={occupancyPercent} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">42 de 50 habitaciones</p>
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
