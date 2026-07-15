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
  Truck,
  History,
  BookOpen,
  UserCog,
  FileText,
  ShieldAlert,
  ShieldCheck, // Icono para Diego
  Inbox,
  ScrollText
  ,ArrowUpDown
  ,LogIn
  ,LogOut
  ,MessageCircle
  ,Bot
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
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
  { title: 'Check-In', url: '/reservas/checkin', icon: LogIn, viewKey: 'reservas' },
  { title: 'Check-Out', url: '/reservas/checkout', icon: LogOut, viewKey: 'reservas' },
  { title: 'Timeline', url: '/reservas/timeline', icon: CalendarDays, viewKey: 'reservas' },
  { title: 'Histórico Reservas', url: '/reservas/historico', icon: History, viewKey: 'reservas' },
  { title: 'Reservas Online', url: '/reservas-online', icon: Inbox, viewKey: 'reservas', badgeKey: 'reservas-online' },
  { title: 'Habitaciones', url: '/habitaciones', icon: BedDouble, viewKey: 'habitaciones' },
  { title: 'Clientes', url: '/clientes', icon: Users, viewKey: 'clientes' },
];

const operationsNavItems = [
  { title: 'Limpieza', url: '/limpieza', icon: Sparkles, viewKey: 'limpieza' },
  { title: 'Mantenimiento', url: '/mantenimiento', icon: Wrench, viewKey: 'mantenimiento' },
];

const salesNavItems = [
  { title: 'POS', url: '/pos', icon: ShoppingCart, viewKey: 'pos' },
  { title: 'Productos', url: '/productos', icon: Package, viewKey: 'inventario' },
  { title: 'Inventario', url: '/inventario', icon: Package, viewKey: 'inventario' },
  { title: 'Ajustes de Stock', url: '/ajustes-stock', icon: ArrowUpDown, viewKey: 'inventario' },
  { title: 'Historial de Ajustes', url: '/historial-ajustes', icon: History, viewKey: 'inventario' },
  { title: 'Compras', url: '/compras', icon: ShoppingBag, viewKey: 'compras' },
  { title: 'Proveedores', url: '/proveedores', icon: Truck, viewKey: 'proveedores' },
  { title: 'Gastos', url: '/gastos', icon: Receipt, viewKey: 'gastos' },
  { title: 'Historial Ventas', url: '/historial', icon: History, viewKey: 'historial' },
  { title: 'Historial Reservas', url: '/historial-reservas', icon: FileText, viewKey: 'historial-reservas' },
  { title: 'Reportes', url: '/reportes', icon: BarChart3, viewKey: 'reportes' },
];

const configNavItems = [
  { title: 'Usuarios', url: '/usuarios', icon: UserCog, viewKey: 'usuarios' },
  { title: 'Permisos', url: '/permisos', icon: ShieldAlert, viewKey: 'permisos' },
  { title: 'Auditoría', url: '/auditoria', icon: ScrollText, viewKey: 'auditoria' },
  { title: 'Turnos', url: '/turnos', icon: Clock, viewKey: 'turnos' },
  { title: 'Catálogos', url: '/catalogos', icon: BookOpen, viewKey: 'catalogos' },
  { title: 'Configuración', url: '/configuracion', icon: Settings, viewKey: 'configuracion' },
];

// Acceso destacado arriba (encima de "Principal")
const chatTopItem = [
  { title: 'WhatsApp Chat', url: '/chats', icon: MessageCircle, viewKey: 'chats' },
];

// Módulo consolidado de WhatsApp al final
const whatsappNavItems = [
  { title: 'Chats', url: '/chats', icon: MessageCircle, viewKey: 'chats' },
  { title: 'Agente IA', url: '/whatsapp/agente', icon: Bot, viewKey: 'configuracion' },
  { title: 'Conexión / QR', url: '/whatsapp/conexion', icon: Settings, viewKey: 'configuracion' },
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
  const contentRef = useRef<HTMLDivElement | null>(null);

  // Persistir la posición del scroll de la sidebar entre navegaciones
  // (cada página monta su propio MainLayout, así que la sidebar se remonta).
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const saved = Number(sessionStorage.getItem('sidebar-scroll') ?? '0');
    if (saved > 0) el.scrollTop = saved;
    const onScroll = () => sessionStorage.setItem('sidebar-scroll', String(el.scrollTop));
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const [ocupadas, setOcupadas] = useState(0);
  const [totalHab, setTotalHab] = useState(0);

  const { data: pendientesOnline = 0, refetch: refetchPendientes } = useQuery({
    queryKey: ['reservas-online-count'],
    queryFn: api.contarReservasOnlinePendientes,
    refetchInterval: 60_000,
  });
  useRealtimeSync('reservas', () => refetchPendientes());

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

  const renderNavItems = (items: { title: string; url: string; icon: any; viewKey?: string; badgeKey?: string }[]) => {
    const visible = items.filter(it => !it.viewKey || canAccess(it.viewKey, user?.rol));
    if (visible.length === 0) return null;
    return (
    <SidebarMenu>
      {visible.map((item) => {
        const [path, qs] = item.url.split('?');
        const isActive = path === '/reservas'
          ? location.pathname === '/reservas'
          : qs
            ? location.pathname === path && location.search.includes(qs)
            : location.pathname === path ||
              (path !== '/dashboard' && location.pathname.startsWith(path + '/'));
        const badgeValue = item.badgeKey === 'reservas-online' ? pendientesOnline : 0;
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
                {!collapsed && <span className="flex-1">{item.title}</span>}
                {!collapsed && badgeValue > 0 && (
                  <span className="ml-auto inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-yellow-400 text-yellow-950 text-[10px] font-bold">
                    {badgeValue}
                  </span>
                )}
                {collapsed && badgeValue > 0 && (
                  <span className="absolute top-1 right-1 inline-flex items-center justify-center w-2 h-2 rounded-full bg-yellow-400" />
                )}
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

      <SidebarContent ref={contentRef} className="px-2 py-4">
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
          {!collapsed && <SidebarGroupLabel className="text-green-600 font-semibold">WhatsApp Chat</SidebarGroupLabel>}
          <SidebarGroupContent>
            {renderNavItems(chatTopItem)}
          </SidebarGroupContent>
        </SidebarGroup>

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

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel className="text-green-600 font-semibold">WhatsApp</SidebarGroupLabel>}
          <SidebarGroupContent>
            {renderNavItems(whatsappNavItems)}
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
