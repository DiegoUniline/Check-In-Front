import { LayoutDashboard, CalendarDays, LogIn, ShoppingCart, BedDouble } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/useAuth';
import { canAccess } from '@/lib/permissions';

const primary = [
  { title: 'Inicio', url: '/dashboard', icon: LayoutDashboard, viewKey: 'dashboard' },
  { title: 'Reservas', url: '/reservas', icon: CalendarDays, viewKey: 'reservas' },
  { title: 'Check-In', url: '/reservas/checkin', icon: LogIn, viewKey: 'reservas' },
  { title: 'Habitaciones', url: '/habitaciones', icon: BedDouble, viewKey: 'habitaciones' },
  { title: 'POS', url: '/pos', icon: ShoppingCart, viewKey: 'pos' },
];

export function MobileBottomNav() {
  const { pathname } = useLocation();
  const { user } = useAuth();

  const isActive = (url: string) =>
    url === '/dashboard'
      ? pathname === '/dashboard'
      : url === '/reservas'
      ? pathname === '/reservas'
      : pathname === url || pathname.startsWith(url + '/');

  const visiblePrimary = primary.filter((i) => !i.viewKey || canAccess(i.viewKey, user?.rol));
  const items = visiblePrimary.slice(0, 5);

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div
        className="h-16"
        style={{ display: 'grid', gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((item) => {
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
      </div>
    </nav>
  );
}