import { LayoutDashboard, CalendarDays, LogIn, LogOut, BedDouble } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/useAuth';
import { canAccess } from '@/lib/permissions';

const primary = [
  { title: 'Inicio', url: '/dashboard', icon: LayoutDashboard, viewKey: 'dashboard' },
  { title: 'Reservas', url: '/reservas', icon: CalendarDays, viewKey: 'reservas' },
  { title: 'Check-In', url: '/reservas/checkin', icon: LogIn, viewKey: 'reservas' },
  { title: 'Check-Out', url: '/reservas/checkout', icon: LogOut, viewKey: 'reservas' },
  { title: 'Habitaciones', url: '/habitaciones', icon: BedDouble, viewKey: 'habitaciones' },
];

export function MobileBottomNav() {
  const { pathname } = useLocation();
  const { user } = useAuth();

  const isActive = (url: string) =>
    url === '/dashboard'
      ? pathname === '/dashboard'
      : url === '/reservas'
      ? pathname === '/reservas'
      : url === '/reservas/checkin'
      ? pathname === '/reservas/checkin' || pathname.startsWith('/checkin/')
      : url === '/reservas/checkout'
      ? pathname === '/reservas/checkout' || pathname.startsWith('/checkout/')
      : pathname === url || pathname.startsWith(url + '/');

  const items = primary.filter((i) => !i.viewKey || canAccess(i.viewKey, user?.rol)).slice(0, 5);

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t bg-card/96 shadow-[0_-8px_30px_rgba(15,23,42,0.06)] backdrop-blur supports-[backdrop-filter]:bg-card/88"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Navegación principal"
    >
      <div
        className="h-[68px] px-1"
        style={{ display: 'grid', gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((item) => {
          const active = isActive(item.url);
          return (
            <NavLink
              key={item.url}
              to={item.url}
              className={cn(
                'relative flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-medium transition-all',
                active ? 'text-primary' : 'text-muted-foreground active:bg-muted active:text-foreground'
              )}
            >
              {active && (
                <span className="absolute top-1 h-1 w-1 rounded-full bg-primary" />
              )}
              <span className={cn(
                'flex h-8 w-8 items-center justify-center rounded-xl transition-all',
                active && 'bg-primary/10'
              )}>
                <item.icon className={cn('h-5 w-5 transition-transform', active && 'scale-105')} />
              </span>
              <span className="max-w-full truncate leading-none">{item.title}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
