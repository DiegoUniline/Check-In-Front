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
  ,CalendarRange
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { ChevronDown, PanelLeftClose, X } from 'lucide-react';
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
import { useAuth } from "@/contexts/useAuth"; // Importante para detectar a Diego
import { canAccess } from '@/lib/permissions';
import { Logo, LogoHorizontal } from '@/components/Logo';

const mainNavItems = [
  { title: 'Inicio', url: '/reservas', icon: CalendarDays, viewKey: 'reservas' },
  { title: 'Check-In', url: '/reservas/checkin', icon: LogIn, viewKey: 'reservas' },
  { title: 'Check-Out', url: '/reservas/checkout', icon: LogOut, viewKey: 'reservas' },
  { title: 'Histórico Entradas', url: '/historial-reservas', icon: History, viewKey: 'reservas' },
  { title: 'Reservas Online', url: '/reservas-online', icon: Inbox, viewKey: 'reservas', badgeKey: 'reservas-online' },
  { title: 'Habitaciones', url: '/habitaciones', icon: BedDouble, viewKey: 'habitaciones' },
  { title: 'Clientes', url: '/clientes', icon: Users, viewKey: 'clientes' },
];

const operationsNavItems = [
  { title: 'Limpieza', url: '/limpieza', icon: Sparkles, viewKey: 'limpieza' },
  { title: 'Mantenimiento', url: '/mantenimiento', icon: Wrench, viewKey: 'mantenimiento' },
];

const ventasNavItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard, viewKey: 'dashboard' },
  { title: 'POS', url: '/pos', icon: ShoppingCart, viewKey: 'pos' },
  { title: 'Historial Ventas', url: '/historial', icon: History, viewKey: 'historial' },
  { title: 'Reportes', url: '/reportes', icon: BarChart3, viewKey: 'reportes' },
];

const inventariosNavItems = [
  { title: 'Productos', url: '/productos', icon: Package, viewKey: 'inventario' },
  { title: 'Inventario', url: '/inventario', icon: Package, viewKey: 'inventario' },
  { title: 'Ajustes de Stock', url: '/ajustes-stock', icon: ArrowUpDown, viewKey: 'inventario' },
  { title: 'Historial de Ajustes', url: '/historial-ajustes', icon: History, viewKey: 'inventario' },
  { title: 'Temporadas', url: '/temporadas', icon: CalendarRange, viewKey: 'catalogos' },
];

const comprasNavItems = [
  { title: 'Órdenes de Compra', url: '/compras', icon: ShoppingBag, viewKey: 'compras' },
  { title: 'Proveedores', url: '/proveedores', icon: Truck, viewKey: 'proveedores' },
  { title: 'Gastos', url: '/gastos', icon: Receipt, viewKey: 'gastos' },
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
  const { state, isMobile, setOpenMobile, toggleSidebar } = useSidebar();
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

  // Estado colapsable persistido por grupo
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
  const isGroupOpen = (key: string, defaultOpen: boolean) =>
    openGroups[key] ?? defaultOpen;

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
            <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
              <NavLink 
                to={item.url} 
                className={cn(
                  "flex items-center gap-3 rounded-lg py-2 transition-all",
                  collapsed ? "justify-center px-0" : "px-3",
                  isActive 
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50",
                  // Estilo azul si es el botón de SaaS
                  item.url === '/admin-plataforma' && "text-[#F97316] font-semibold"
                )}
              >
                <item.icon className={cn("h-5 w-5 shrink-0", item.url === '/admin-plataforma' && "text-[#F97316]")} />
                {!collapsed && <span className="flex-1">{item.title}</span>}
                {!collapsed && badgeValue > 0 && (
                  <span className="ml-auto inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-[#F97316] text-white text-[10px] font-bold">
                    {badgeValue}
                  </span>
                )}
                {collapsed && badgeValue > 0 && (
                  <span className="absolute top-1 right-1 inline-flex items-center justify-center w-2 h-2 rounded-full bg-[#F97316]" />
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
      <SidebarHeader className="border-b border-sidebar-border bg-white px-4 py-4">
        <div className="flex items-center justify-between gap-2">
          <NavLink to="/dashboard" className="flex items-center gap-3 min-w-0">
            {collapsed ? (
              <Logo size={36} />
            ) : (
              <div className="flex flex-col min-w-0">
                <LogoHorizontal size={34} />
                <span className="text-[11px] font-medium text-[#475569] mt-1 ml-12 tracking-wide">Software para hoteles</span>
              </div>
            )}
          </NavLink>
          {!collapsed && (
            <button
              type="button"
              onClick={() => (isMobile ? setOpenMobile(false) : toggleSidebar())}
              aria-label="Contraer menú"
              className="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-md text-[#475569] hover:bg-slate-100 hover:text-[#10233F] transition-colors"
            >
              {isMobile ? <X className="h-5 w-5" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent ref={contentRef} className="py-4 group-data-[collapsible=icon]:px-0">
        {/* SECCIÓN PARA DIEGO - Solo aparece si el correo coincide */}
        {user?.email === 'diego.leon@uniline.mx' && (
          <SidebarGroup>
            {!collapsed && <SidebarGroupLabel className="text-[#F97316] font-semibold">Administración Maestro</SidebarGroupLabel>}
            <SidebarGroupContent>
              {renderNavItems(adminSaaSItem)}
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {[
          { key: 'chat', label: 'WhatsApp Chat', items: chatTopItem, labelClass: 'text-[#F97316]', defaultOpen: true },
          { key: 'principal', label: 'Principal', items: mainNavItems, defaultOpen: true },
          { key: 'operaciones', label: 'Operaciones', items: operationsNavItems, defaultOpen: false },
          { key: 'ventas', label: 'Ventas', items: ventasNavItems, defaultOpen: false },
          { key: 'inventarios', label: 'Inventarios', items: inventariosNavItems, defaultOpen: false },
          { key: 'compras', label: 'Compras', items: comprasNavItems, defaultOpen: false },
          { key: 'sistema', label: 'Sistema', items: configNavItems, defaultOpen: false },
          { key: 'whatsapp', label: 'WhatsApp', items: whatsappNavItems, labelClass: 'text-[#F97316]', defaultOpen: false },
        ].map((g) => {
          const rendered = renderNavItems(g.items);
          if (!rendered) return null;
          if (collapsed) {
            return (
              <SidebarGroup key={g.key}>
                <SidebarGroupContent>{rendered}</SidebarGroupContent>
              </SidebarGroup>
            );
          }
          const open = isGroupOpen(g.key, g.defaultOpen);
          return (
            <SidebarGroup key={g.key}>
              <Collapsible open={open} onOpenChange={() => toggleGroup(g.key, g.defaultOpen)}>
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      'flex w-full items-center justify-between px-3 py-1.5 text-xs font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors',
                      g.labelClass
                    )}
                  >
                    <span>{g.label}</span>
                    <ChevronDown className={cn('h-4 w-4 transition-transform', open ? 'rotate-0' : '-rotate-90')} />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarGroupContent>{rendered}</SidebarGroupContent>
                </CollapsibleContent>
              </Collapsible>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        {!collapsed ? (
          <div className="rounded-lg bg-sidebar-accent p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-white">Ocupación Actual</span>
              <span className="text-lg font-bold text-[#F97316]">{occupancyPercent}%</span>
            </div>
            <Progress value={occupancyPercent} className="h-2" />
            <p className="text-xs text-white/80 mt-2">
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
