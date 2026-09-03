import { Search, Sun, Moon, LogOut, User, Settings, Hotel, Command, Clock3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { NotificationBell } from '@/components/NotificationBell';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/useAuth';
import { useShift } from '@/contexts/useShift';

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { openShift, shiftRequired } = useShift();
  const queryClient = useQueryClient();
  const isSuperAdmin = user?.email === 'diego.leon@uniline.mx' || user?.rol === 'SuperAdmin';

  const { data: hoteles = [] } = useQuery({
    queryKey: ['superadmin-hoteles'],
    queryFn: api.getHotelesSaas,
    enabled: isSuperAdmin,
  });

  const hotelActivoId = (typeof window !== 'undefined' ? localStorage.getItem('hotel_id') : null) || '';

  const handleHotelChange = async (hotelId: string) => {
    try {
      await api.setHotelActivo(hotelId);
      queryClient.clear();
      toast.success('Hotel cambiado');
      setTimeout(() => { window.location.reload(); }, 250);
    } catch (e: any) {
      toast.error(e?.message || 'No se pudo cambiar de hotel');
    }
  };

  const getInitials = (nombre: string, apellido?: string) => {
    const first = nombre?.charAt(0) || '';
    const last = apellido?.charAt(0) || '';
    return (first + last).toUpperCase();
  };

  const openCommandPalette = () => {
    window.dispatchEvent(new CustomEvent('open-command-palette'));
  };

  return (
    <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between border-b bg-card/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-card/85 lg:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <SidebarTrigger className="h-9 w-9 rounded-xl" />
        <Logo size={34} className="lg:hidden" />
        {title ? (
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold tracking-tight text-foreground lg:text-lg">{title}</h1>
            {subtitle && (
              <p className="hidden truncate text-xs text-muted-foreground sm:block lg:text-sm">{subtitle}</p>
            )}
          </div>
        ) : (
          <span className="lg:hidden font-semibold text-foreground">Hotel</span>
        )}
      </div>

      <div className="hidden flex-1 justify-center px-4 md:flex">
        <button
          type="button"
          onClick={openCommandPalette}
          className="group flex h-10 w-full max-w-md items-center gap-3 rounded-xl border bg-background px-3 text-left text-sm text-muted-foreground shadow-sm transition-all hover:border-primary/30 hover:bg-muted/40 hover:shadow"
          aria-label="Abrir búsqueda global"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate">Buscar reservas, huéspedes, habitaciones...</span>
          <span className="hidden items-center gap-1 rounded-md border bg-muted/60 px-2 py-1 text-[11px] font-medium text-muted-foreground lg:flex">
            <Command className="h-3 w-3" /> K
          </span>
        </button>
      </div>

      <div className="flex items-center gap-1.5 lg:gap-2">
        {shiftRequired && <Button asChild variant="outline" size="sm" className={openShift
          ? 'h-9 border-emerald-200 bg-emerald-50 px-2 text-emerald-700 hover:bg-emerald-100 sm:px-3'
          : 'h-9 border-amber-200 bg-amber-50 px-2 text-amber-800 hover:bg-amber-100 sm:px-3'}>
          <Link to="/turnos"><Clock3 className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">{openShift ? 'Turno abierto' : 'Sin turno'}</span></Link>
        </Button>}
        <Button
          variant="ghost"
          size="icon"
          onClick={openCommandPalette}
          className="md:hidden h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground"
          aria-label="Buscar"
        >
          <Search className="h-5 w-5" />
        </Button>

        {isSuperAdmin && hoteles.length > 0 && (
          <div className="hidden items-center gap-2 xl:flex">
            <Hotel className="h-4 w-4 text-primary" />
            <Select value={hotelActivoId} onValueChange={handleHotelChange}>
              <SelectTrigger className="h-9 w-[210px] rounded-xl border-primary/20 bg-primary/5">
                <SelectValue placeholder="Seleccionar hotel..." />
              </SelectTrigger>
              <SelectContent>
                {hoteles.map((h: any) => (
                  <SelectItem key={h.id} value={h.id}>{h.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground"
          aria-label="Cambiar tema"
        >
          {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
        </Button>

        <NotificationBell />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-xl p-0">
              <Avatar className="h-9 w-9">
                <AvatarImage src={user?.fotoUrl} alt={user?.nombre} />
                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                  {getInitials(user?.nombre || '', user?.apellidoPaterno)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-60 rounded-xl" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.nombre} {user?.apellidoPaterno}</p>
                <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                <p className="mt-1 text-xs leading-none text-muted-foreground">{user?.rol} • {user?.hotelNombre}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              <span>Mi perfil</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              <span>Configuración</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Cerrar sesión</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
