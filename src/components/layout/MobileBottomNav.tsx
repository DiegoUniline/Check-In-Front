import { LayoutDashboard, CalendarDays, LogIn, ShoppingCart, Menu, BedDouble, Users, Sparkles, Wrench, Package, BarChart3, Settings, Clock, Receipt, ShoppingBag, Truck, History, BookOpen, UserCog, ShieldAlert, Inbox, ScrollText, ArrowUpDown, LogOut as LogOutIcon, FileText, Hotel, ShieldCheck } from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/useAuth';
import { canAccess } from '@/lib/permissions';

const primary = [
  { title: 'Inicio', url: '/dashboard', icon: LayoutDashboard, viewKey: 'dashboard' },
  { title: 'Reservas', url: '/reservas', icon: CalendarDays, viewKey: 'reservas' },
  { title: 'Check-In', url: '/reservas/checkin', icon: LogIn, viewKey: 'reservas' },
  { title: 'POS', url: '/pos', icon: ShoppingCart, viewKey: 'pos' },
];

const allGroups = [
  {
    label: 'Principal',
    items: [
      { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard, viewKey: 'dashboard' },
      { title: 'Reservas', url: '/reservas', icon: CalendarDays, viewKey: 'reservas' },
      { title: 'Check-In', url: '/reservas/checkin', icon: LogIn, viewKey: 'reservas' },
      { title: 'Check-Out', url: '/reservas/checkout', icon: LogOutIcon, viewKey: 'reservas' },
      { title: 'Timeline', url: '/reservas/timeline', icon: CalendarDays, viewKey: 'reservas' },
      { title: 'Histórico Reservas', url: '/reservas/historico', icon: History, viewKey: 'reservas' },
      { title: 'Reservas Online', url: '/reservas-online', icon: Inbox, viewKey: 'reservas' },
      { title: 'Habitaciones', url: '/habitaciones', icon: BedDouble, viewKey: 'habitaciones' },
      { title: 'Clientes', url: '/clientes', icon: Users, viewKey: 'clientes' },
    ],
  },
  {
    label: 'Operaciones',
    items: [
      { title: 'Limpieza', url: '/limpieza', icon: Sparkles, viewKey: 'limpieza' },
      { title: 'Mantenimiento', url: '/mantenimiento', icon: Wrench, viewKey: 'mantenimiento' },
    ],
  },
  {
    label: 'Ventas',
    items: [
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
    ],
  },
  {
    label: 'Sistema',
    items: [
      { title: 'Usuarios', url: '/usuarios', icon: UserCog, viewKey: 'usuarios' },
      { title: 'Permisos', url: '/permisos', icon: ShieldAlert, viewKey: 'permisos' },
      { title: 'Auditoría', url: '/auditoria', icon: ScrollText, viewKey: 'auditoria' },
      { title: 'Turnos', url: '/turnos', icon: Clock, viewKey: 'turnos' },
      { title: 'Catálogos', url: '/catalogos', icon: BookOpen, viewKey: 'catalogos' },
      { title: 'Configuración', url: '/configuracion', icon: Settings, viewKey: 'configuracion' },
    ],
  },
];

export function MobileBottomNav() {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const isActive = (url: string) =>
    url === '/dashboard'
      ? pathname === '/dashboard'
      : url === '/reservas'
      ? pathname === '/reservas'
      : pathname === url || pathname.startsWith(url + '/');

  const visiblePrimary = primary.filter((i) => !i.viewKey || canAccess(i.viewKey, user?.rol));

  return (
    <>
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="h-16" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }}>
          {visiblePrimary.slice(0, 4).map((item) => {
            const active = isActive(item.url);
            return (
              <NavLink
                key={item.url}
                to={item.url}
                className={cn(
                  'relative flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground active:text-foreground'
                )}
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-b-full bg-primary" />
                )}
                <item.icon className={cn('h-5 w-5 transition-transform', active && 'scale-110')} />
                <span className="leading-none">{item.title}</span>
              </NavLink>
            );
          })}

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                className="flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-muted-foreground hover:text-foreground"
                type="button"
              >
                <Menu className="h-5 w-5" />
                <span className="leading-none">Más</span>
              </button>
            </SheetTrigger>
            <SheetContent
              side="bottom"
              className="h-[85vh] rounded-t-2xl p-0 flex flex-col"
              style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
              <SheetHeader className="px-5 pt-5 pb-3 border-b">
                <SheetTitle className="flex items-center gap-2 text-left">
                  <Hotel className="h-5 w-5 text-primary" />
                  Menú completo
                </SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
                {user?.email === 'diego.leon@uniline.mx' && (
                  <div>
                    <button
                      onClick={() => { setOpen(false); navigate('/admin-plataforma'); }}
                      className="w-full flex items-center gap-3 rounded-xl px-4 py-3 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-200 font-semibold"
                    >
                      <ShieldCheck className="h-5 w-5" /> Administrar SaaS
                    </button>
                  </div>
                )}
                {allGroups.map((group) => {
                  const visible = group.items.filter((i) => !i.viewKey || canAccess(i.viewKey, user?.rol));
                  if (visible.length === 0) return null;
                  return (
                    <div key={group.label}>
                      <p className="px-2 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {group.label}
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {visible.map((item) => {
                          const active = isActive(item.url);
                          return (
                            <button
                              key={item.url}
                              onClick={() => { setOpen(false); navigate(item.url); }}
                              className={cn(
                                'flex flex-col items-center justify-center gap-1.5 rounded-xl p-3 text-center text-[11px] font-medium border transition-all min-h-[80px]',
                                active
                                  ? 'bg-primary text-primary-foreground border-primary shadow'
                                  : 'bg-card text-foreground border-border hover:bg-muted'
                              )}
                            >
                              <item.icon className="h-5 w-5" />
                              <span className="leading-tight">{item.title}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                <div className="pt-2">
                  <button
                    onClick={() => { setOpen(false); logout(); }}
                    className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 bg-destructive/10 text-destructive font-semibold"
                  >
                    <LogOutIcon className="h-4 w-4" /> Cerrar sesión
                  </button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </>
  );
}