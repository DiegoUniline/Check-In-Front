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
  Clock,
  Receipt,
  ShoppingBag,
  Truck,
  History,
  BookOpen,
  UserCog,
  ShieldAlert,
  ShieldCheck,
  Inbox,
  ScrollText,
  ArrowUpDown,
  LogIn,
  LogOut,
  MessageCircle,
  Bot,
  CalendarRange,
  ChevronDown,
  PanelLeftClose,
  X,
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
import { useAuth } from '@/contexts/useAuth';
import { canAccess } from '@/lib/permissions';
import { Logo, LogoHorizontal } from '@/components/Logo';

const mainNavItems = [
  { title: 'Inicio', url: '/dashboard', icon: LayoutDashboard, viewKey: 'dashboard' },
  { title: 'Reservas', url: '/reservas', icon: CalendarDays, viewKey: 'reservas' },
  { title: 'Check-In', url: '/reservas/checkin', icon: LogIn, viewKey: 'reservas' },
  { title: 'Check-Out', url: '/reservas/checkout', icon: LogOut, viewKey: 'reservas' },
  { title: 'Reservas Online', url: '/reservas-online', icon: Inbox, viewKey: 'reservas', badgeKey: 'reservas-online' },
  { title: 'Habitaciones', url: '/habitaciones', icon: BedDouble, viewKey: 'habitaciones' },
  { title: 'Clientes', url: '/clientes', icon: Users, viewKey: 'clientes' },
];

const operationsNavItems = [
  { title: 'Limpieza', url: '/limpieza', icon: Sparkles, viewKey: 'limpieza' },
  { title: 'Mantenimiento', url: '/mantenimiento', icon: Wrench, viewKey: 'mantenimiento' },
  { title: 'Histórico Entradas', url: '/historial-reservas', icon: History, viewKey: 'reservas' },
];

const salesNavItems = [
  { title: 'POS', url: '/pos', icon: ShoppingCart, viewKey: 'pos' },
  { title: 'Historial Ventas', url: '/historial', icon: History, viewKey: 'historial' },
  { title: 'Reportes', url: '/reportes', icon: BarChart3, viewKey: 'reportes' },
];

const stockNavItems = [
  { title: 'Productos', url: '/productos', icon: Package, viewKey: 'inventario' },
  { title: 'Inventario', url: '/inventario', icon: Package, viewKey: 'inventario' },
  { title: 'Ajustes de Stock', url: '/ajustes-stock', icon: ArrowUpDown, viewKey: 'inventario' },
  { title: 'Historial de Ajustes', url: '/historial-ajustes', icon: History, viewKey: 'inventario' },
  { title: 'Órdenes de Compra', url: '/compras', icon: ShoppingBag, viewKey: 'compras' },
  { title: 'Proveedores', url: '/proveedores', icon: Truck, viewKey: 'proveedores' },
  { title: 'Gastos', url: '/gastos', icon: Receipt, viewKey: 'gastos' },
  { title: 'Temporadas', url: '/temporadas', icon: CalendarRange, viewKey: 'catalogos' },
];

const whatsappNavItems = [
  { title: 'Chats', url: '/chats', icon: MessageCircle, viewKey: 'chats' },
  { title: 'Agente IA', url: '/whatsapp/agente', icon: Bot, viewKey: 'configuracion' },
  { title: 'Conexión / QR', url: '/whatsapp/conexion', icon: Settings, viewKey: 'configuracion' },
];

const adminNavItems = [
  { title: 'Usuarios', url: '/usuarios', icon: UserCog, viewKey: 'usuarios' },
  { title: 'Permisos', url: '/permisos', icon: ShieldAlert, viewKey: 'permisos' },
  { title: 'Auditoría', url: '/auditoria', icon: ScrollText, viewKey: 'auditoria' },
  { title: 'Turnos', url: '/turnos', icon: Clock, viewKey: 'turnos' },
  { title: 'Catálogos', url: '/catalogos', icon: BookOpen, viewKey: 'catalogos' },
  { title: 'Configuración', url: '/configuracion', icon: Settings, viewKey: 'configuracion' },
];

const adminSaaSItem = [
  { title: 'Administrar SaaS', url: '/admin-plataforma', icon: ShieldCheck },
];

export function AppSidebar() {
  const location = useLocation();
  const { state, isMobile, setOpenMobile, toggleSidebar } = useSidebar();
  const { user } = useAuth();
  const collapsed = state === 'collapsed';
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [ocupadas, setOcupadas] = useState(0);
  const [totalHab, setTotalHab] = useState(0);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const saved = Number(sessionStorage.getItem('sidebar-scroll') ?? '0');
    if (saved > 0) el.scrollTop = saved;
    const onScroll = () => sessionStorage.setItem('sidebar-scroll', String(el.scrollTop));
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const { data: pendientesOnline = 0, refetch: refetchPendientes } = useQuery({
    queryKey: ['reservas-online-count'],
    queryFn: api.contarReservasOnlinePendientes,
    refetchInterval: 60_000,
  });
  useRealtimeSync('reservas', () => refetchPendientes());

  useEffect(() => {
    const cargarOcupacion = async () => {
      try {
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
      } catch {
        setTotalHab(0);
        setOcupadas(0);
      }
    };
    cargarOcupacion();
    const interval = setInterval(cargarOcupacion, 60_000);
    return () => clearInterval(interval);
  }, []);

  const occupancyPercent = totalHab > 0 ? Math.round((ocupadas / totalHab) * 100) : 0;

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    try {
      const raw = sessionStorage.getItem('sidebar-open-groups');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const toggleGroup = (key: string, defaultOpen: boolean) => {
    setOpenGroups((prev) => {
      const current = prev[key] ?? defaultOpen;
      const next = { ...prev, [key]: !current };
      try { sessionStorage.setItem('sidebar-open-groups', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const renderNavItems = (items: { title: string; url: string; icon: any; viewKey?: string; badgeKey?: string }[]) => {
    const visible = items.filter((it) => !it.viewKey || canAccess(it.viewKey, user?.rol));
    if (visible.length === 0) return null;

    return (
      <SidebarMenu className="gap-1">
        {visible.map((item) => {
          const isActive = item.url === '/reservas'
            ? location.pathname === '/reservas'
            : location.pathname === item.url || location.pathname.startsWith(item.url + '/');
          const badgeValue = item.badgeKey === 'reservas-online' ? pendientesOnline : 0;

          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                <NavLink
                  to={item.url}
                  className={cn(
                    'group relative flex min-h-10 items-center gap-3 rounded-xl transition-all',
                    collapsed ? 'justify-center px-0' : 'px-3',
                    isActive
                      ? 'bg-primary/10 font-semibold text-primary'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
                  )}
                >
                  {isActive && !collapsed && <span className="absolute left-0 h-5 w-1 rounded-r-full bg-primary" />}
                  <item.icon className={cn('h-[18px] w-[18px] shrink-0', isActive && 'text-primary')} />
                  {!collapsed && <span className="flex-1 truncate text-sm">{item.title}</span>}
                  {!collapsed && badgeValue > 0 && (
                    <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                      {badgeValue}
                    </span>
                  )}
                  {collapsed && badgeValue > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary" />}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    );
  };

  const groups = [
    { key: 'operacion', label: 'Operación', items: operationsNavItems, defaultOpen: false },
    { key: 'ventas', label: 'Ventas y caja', items: salesNavItems, defaultOpen: false },
    { key: 'stock', label: 'Inventario y compras', items: stockNavItems, defaultOpen: false },
    { key: 'whatsapp', label: 'WhatsApp', items: whatsappNavItems, defaultOpen: false },
    { key: 'admin', label: 'Administración', items: adminNavItems, defaultOpen: false },
  ];

  return (
    <Sidebar collapsible="icon" className="border-r-0 bg-sidebar">
      <SidebarHeader className="border-b border-sidebar-border/70 px-3 py-4">
        <div className="flex items-center justify-between gap-2">
          <NavLink to="/dashboard" className="flex min-w-0 items-center gap-3">
            {collapsed ? (
              <Logo size={36} />
            ) : (
              <div className="flex min-w-0 flex-col">
                <LogoHorizontal size={34} />
                <span className="ml-12 mt-1 text-[10px] font-medium tracking-wide text-muted-foreground">Software para hoteles</span>
              </div>
            )}
          </NavLink>
          {!collapsed && (
            <button
              type="button"
              onClick={() => (isMobile ? setOpenMobile(false) : toggleSidebar())}
              aria-label="Contraer menú"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              {isMobile ? <X className="h-5 w-5" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent ref={contentRef} className="px-2 py-3 group-data-[collapsible=icon]:px-1">
        {user?.email === 'diego.leon@uniline.mx' && (
          <SidebarGroup className="pb-1">
            {!collapsed && <SidebarGroupLabel className="px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">Administración maestro</SidebarGroupLabel>}
            <SidebarGroupContent>{renderNavItems(adminSaaSItem)}</SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup className="pb-1">
          {!collapsed && <SidebarGroupLabel className="px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Principal</SidebarGroupLabel>}
          <SidebarGroupContent>{renderNavItems(mainNavItems)}</SidebarGroupContent>
        </SidebarGroup>

        {groups.map((group) => {
          const rendered = renderNavItems(group.items);
          if (!rendered) return null;
          if (collapsed) {
            return <SidebarGroup key={group.key}><SidebarGroupContent>{rendered}</SidebarGroupContent></SidebarGroup>;
          }

          const open = openGroups[group.key] ?? group.defaultOpen;
          return (
            <SidebarGroup key={group.key} className="py-0.5">
              <Collapsible open={open} onOpenChange={() => toggleGroup(group.key, group.defaultOpen)}>
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                  >
                    <span>{group.label}</span>
                    <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open ? 'rotate-0' : '-rotate-90')} />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-1">
                  <SidebarGroupContent>{rendered}</SidebarGroupContent>
                </CollapsibleContent>
              </Collapsible>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/70 p-3">
        {!collapsed ? (
          <div className="rounded-2xl border border-sidebar-border/70 bg-sidebar-accent/45 p-3">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Ocupación</p>
                <p className="mt-0.5 text-sm font-medium text-sidebar-foreground">{ocupadas} de {totalHab} habitaciones</p>
              </div>
              <span className="text-xl font-bold tracking-tight text-primary">{occupancyPercent}%</span>
            </div>
            <Progress value={occupancyPercent} className="h-1.5" />
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-[11px] font-bold text-primary">{occupancyPercent}%</div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
