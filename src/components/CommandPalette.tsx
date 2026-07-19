import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  LayoutDashboard,
  CalendarDays,
  BedDouble,
  Users,
  Sparkles,
  Wrench,
  ShoppingCart,
  Boxes,
  Package,
  BarChart3,
  Settings,
  Clock,
  Receipt,
  Truck,
  History,
  ShieldCheck,
  UserCog,
  FileText,
  Globe,
} from 'lucide-react';

type ViewItem = {
  label: string;
  path: string;
  keywords?: string;
  icon: React.ComponentType<{ className?: string }>;
};

const VIEWS: ViewItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, keywords: 'inicio resumen' },
  { label: 'Reservas', path: '/reservas', icon: CalendarDays, keywords: 'booking' },
  { label: 'Reservas - Calendario', path: '/reservas/calendario', icon: CalendarDays },
  { label: 'Reservas - Lista', path: '/reservas/lista', icon: CalendarDays },
  { label: 'Reservas Online', path: '/reservas-online', icon: Globe },
  { label: 'Habitaciones', path: '/habitaciones', icon: BedDouble, keywords: 'cuartos rooms' },
  { label: 'Clientes', path: '/clientes', icon: Users, keywords: 'huespedes' },
  { label: 'Limpieza', path: '/limpieza', icon: Sparkles, keywords: 'housekeeping' },
  { label: 'Mantenimiento', path: '/mantenimiento', icon: Wrench },
  { label: 'POS', path: '/pos', icon: ShoppingCart, keywords: 'punto de venta' },
  { label: 'Inventario', path: '/inventario', icon: Boxes },
  { label: 'Productos', path: '/productos', icon: Package },
  { label: 'Ajustes de Stock', path: '/ajustes-stock', icon: Boxes },
  { label: 'Historial de Ajustes', path: '/historial-ajustes', icon: History },
  { label: 'Reportes', path: '/reportes', icon: BarChart3, keywords: 'gerencia informes' },
  { label: 'Turnos', path: '/turnos', icon: Clock, keywords: 'caja corte' },
  { label: 'Gastos', path: '/gastos', icon: Receipt },
  { label: 'Compras', path: '/compras', icon: ShoppingCart },
  { label: 'Proveedores', path: '/proveedores', icon: Truck },
  { label: 'Historial', path: '/historial', icon: History },
  { label: 'Histórico Entradas', path: '/historial-reservas', icon: History },
  { label: 'Catálogos', path: '/catalogos', icon: FileText },
  { label: 'Usuarios', path: '/usuarios', icon: UserCog },
  { label: 'Permisos', path: '/permisos', icon: ShieldCheck },
  { label: 'Auditoría', path: '/auditoria', icon: ShieldCheck },
  { label: 'Configuración', path: '/configuracion', icon: Settings, keywords: 'ajustes' },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const { data: habitaciones = [] } = useQuery({
    queryKey: ['habitaciones'],
    queryFn: () => api.getHabitaciones(),
    enabled: open,
    staleTime: 30_000,
  });

  const { data: reservas = [] } = useQuery({
    queryKey: ['reservas'],
    queryFn: () => api.getReservas(),
    enabled: open,
    staleTime: 30_000,
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => api.getClientes(),
    enabled: open,
    staleTime: 30_000,
  });

  const q = query.trim().toLowerCase();

  const habFiltradas = useMemo(() => {
    if (!q) return [];
    return (habitaciones as any[])
      .filter((h) => {
        const num = String(h.numero || '').toLowerCase();
        const tipo = String(h.tipo_nombre || '').toLowerCase();
        return num.includes(q) || tipo.includes(q) || `habitacion ${num}`.includes(q) || `habitación ${num}`.includes(q);
      })
      .slice(0, 8);
  }, [habitaciones, q]);

  const resFiltradas = useMemo(() => {
    if (!q) return [];
    return (reservas as any[])
      .filter((r) => {
        const id = String(r.id || '').toLowerCase();
        const cli = String(r.cliente_nombre || '').toLowerCase();
        const hab = String(r.habitaciones?.numero || '').toLowerCase();
        return id.includes(q) || cli.includes(q) || hab.includes(q);
      })
      .slice(0, 8);
  }, [reservas, q]);

  const cliFiltrados = useMemo(() => {
    if (!q) return [];
    return (clientes as any[])
      .filter((c) => {
        const n = `${c.nombre || ''} ${c.apellido_paterno || ''} ${c.apellido_materno || ''}`.toLowerCase();
        const tel = String(c.telefono || '').toLowerCase();
        const email = String(c.email || '').toLowerCase();
        return n.includes(q) || tel.includes(q) || email.includes(q);
      })
      .slice(0, 6);
  }, [clientes, q]);

  const go = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Buscar vistas, habitación, reserva, cliente…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>Sin resultados</CommandEmpty>

        {habFiltradas.length > 0 && (
          <CommandGroup heading="Habitaciones">
            {habFiltradas.map((h: any) => (
              <CommandItem
                key={`h-${h.id}`}
                value={`hab-${h.numero}-${h.id}`}
                onSelect={() => go(`/habitaciones?habitacion=${h.id}`)}
              >
                <BedDouble className="mr-2 h-4 w-4" />
                <span>Habitación {h.numero}</span>
                {h.tipo_nombre && <span className="ml-2 text-xs text-muted-foreground">{h.tipo_nombre}</span>}
              </CommandItem>
            ))}
            {habFiltradas[0] && (
              <CommandItem
                value={`hab-ver-todas-${q}`}
                onSelect={() => go('/habitaciones')}
              >
                <BedDouble className="mr-2 h-4 w-4" />
                Ver todas las habitaciones
              </CommandItem>
            )}
          </CommandGroup>
        )}

        {resFiltradas.length > 0 && (
          <CommandGroup heading="Reservas">
            {resFiltradas.map((r: any) => (
              <CommandItem
                key={`r-${r.id}`}
                value={`res-${r.id}-${r.cliente_nombre}`}
                onSelect={() => go(`/reservas?reserva=${r.id}`)}
              >
                <CalendarDays className="mr-2 h-4 w-4" />
                <span>{r.cliente_nombre || 'Sin cliente'}</span>
                {r.habitaciones?.numero && (
                  <span className="ml-2 text-xs text-muted-foreground">Hab. {r.habitaciones.numero}</span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {cliFiltrados.length > 0 && (
          <CommandGroup heading="Clientes">
            {cliFiltrados.map((c: any) => (
              <CommandItem
                key={`c-${c.id}`}
                value={`cli-${c.id}-${c.nombre}`}
                onSelect={() => go(`/clientes?cliente=${c.id}`)}
              >
                <Users className="mr-2 h-4 w-4" />
                <span>
                  {c.nombre} {c.apellido_paterno || ''}
                </span>
                {c.telefono && <span className="ml-2 text-xs text-muted-foreground">{c.telefono}</span>}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {(habFiltradas.length || resFiltradas.length || cliFiltrados.length) && <CommandSeparator />}

        <CommandGroup heading="Vistas">
          {VIEWS.map((v) => {
            const Icon = v.icon;
            return (
              <CommandItem
                key={v.path}
                value={`${v.label} ${v.keywords || ''} ${v.path}`}
                onSelect={() => go(v.path)}
              >
                <Icon className="mr-2 h-4 w-4" />
                <span>{v.label}</span>
                <span className="ml-auto text-xs text-muted-foreground">{v.path}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}