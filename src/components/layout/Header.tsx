import { Search, Sun, Moon, LogOut, User, Settings, Hotel } from 'lucide-react';
import { NotificationBell } from '@/components/NotificationBell';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { user, logout, refreshUser } = useAuth();
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
      await refreshUser();
      await queryClient.invalidateQueries();
      toast.success('Hotel cambiado');
    } catch (e: any) {
      toast.error(e?.message || 'No se pudo cambiar de hotel');
    }
  };

  const getInitials = (nombre: string, apellido?: string) => {
    const first = nombre?.charAt(0) || '';
    const last = apellido?.charAt(0) || '';
    return (first + last).toUpperCase();
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 lg:h-16 items-center justify-between border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 px-3 lg:px-6">
      {/* Left section */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <SidebarTrigger />
        <Logo size={36} className="lg:hidden" />
        {title ? (
          <div className="min-w-0">
            <h1 className="text-base lg:text-lg font-semibold text-foreground truncate">{title}</h1>
            {subtitle && (
              <p className="hidden sm:block text-sm text-muted-foreground truncate">{subtitle}</p>
            )}
          </div>
        ) : (
          <span className="lg:hidden font-semibold text-foreground">Hotel</span>
        )}
      </div>

      {/* Center - Search */}
      <div className="hidden md:flex flex-1 max-w-md mx-4">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar reservas, huéspedes, habitaciones..."
            className="pl-9 bg-background"
          />
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2">
        {/* Selector de hotel para SuperAdmin */}
        {isSuperAdmin && hoteles.length > 0 && (
          <div className="hidden md:flex items-center gap-2 mr-2">
            <Hotel className="h-4 w-4 text-blue-600" />
            <Select value={hotelActivoId} onValueChange={handleHotelChange}>
              <SelectTrigger className="w-[220px] h-9 border-blue-300 bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-100">
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

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="text-muted-foreground hover:text-foreground"
        >
          {theme === 'light' ? (
            <Moon className="h-5 w-5" />
          ) : (
            <Sun className="h-5 w-5" />
          )}
        </Button>

        {/* Notifications */}
        <NotificationBell />

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarImage src={user?.fotoUrl} alt={user?.nombre} />
                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                  {getInitials(user?.nombre || '', user?.apellidoPaterno)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {user?.nombre} {user?.apellidoPaterno}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email}
                </p>
                <p className="text-xs leading-none text-muted-foreground mt-1">
                  {user?.rol} • {user?.hotelNombre}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              <span>Mi Perfil</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              <span>Configuración</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Cerrar Sesión</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}