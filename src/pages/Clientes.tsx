import { useState, useEffect, useMemo } from 'react';
import {
  Users, Search, Plus, Star, Mail, Phone,
  MoreVertical, Eye, Edit, Award, RotateCcw
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { ExportButton } from '@/components/ExportButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { useDataTable } from '@/hooks/useDataTable';
import { SortHeader } from '@/components/datatable/SortHeader';
import { BulkActionBar } from '@/components/datatable/BulkActionBar';
import { exportToCsv } from '@/lib/exportCsv';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { PhoneInput } from '@/components/ui/phone-input';
import { splitPhone, joinPhone, DEFAULT_COUNTRY } from '@/lib/phoneCountries';
import { formatDate } from '@/lib/dateFormat';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';

interface Cliente {
  id: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno?: string;
  email: string;
  telefono: string;
  nacionalidad?: string;
  tipo_documento?: string;
  numero_documento?: string;
  tipo_cliente?: string;
  nivel_lealtad?: string;
  es_vip?: boolean;
  total_estancias?: number;
  notas?: string;
  created_at?: string;
}

const clienteInicial = {
  tipo_cliente: 'Persona',
  nombre: '',
  apellido_paterno: '',
  apellido_materno: '',
  email: '',
  telefono: '',
  tipo_documento: 'INE',
  numero_documento: '',
  nacionalidad: 'Mexicana',
  direccion: '',
  es_vip: false,
  notas: ''
};

type ClienteFiltro = 'all' | 'vip' | 'nuevos' | 'frecuentes';

export default function Clientes() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [quickFilter, setQuickFilter] = useState<ClienteFiltro>('all');
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(clienteInicial);
  const [saving, setSaving] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [phoneCountry, setPhoneCountry] = useState<string>(DEFAULT_COUNTRY);
  const [phoneLocal, setPhoneLocal] = useState<string>('');
  const [historial, setHistorial] = useState<any[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [eliminandoBulk, setEliminandoBulk] = useState(false);

  const isVipValue = (value: unknown) => value === true || value === 1 || value === '1' || value === 'true';

  const sanitizeApellidoParaNoVip = (apellido: unknown, esVip: boolean) => {
    if (esVip) return typeof apellido === 'string' ? apellido : (apellido as any);
    if (apellido === 0) return '';
    if (typeof apellido !== 'string') return apellido as any;
    return apellido.replace(/0[\s\u200B\uFEFF]*$/u, '').trim();
  };

  const sanitizeTextoParaNoVip = (texto: unknown, esVip: boolean) => {
    if (esVip) return typeof texto === 'string' ? texto : (texto as any);
    if (texto === 0) return '';
    if (typeof texto !== 'string') return texto as any;
    return texto.replace(/0[\s\u200B\uFEFF]*$/u, '').trim();
  };

  const nombreCompleto = (cliente?: Cliente | null) => {
    if (!cliente) return '';
    const vip = isVipValue((cliente as any).es_vip);
    return [
      sanitizeTextoParaNoVip(cliente.nombre, vip),
      sanitizeApellidoParaNoVip(cliente.apellido_paterno, vip),
      sanitizeApellidoParaNoVip(cliente.apellido_materno || '', vip),
    ].filter(Boolean).join(' ').trim();
  };

  const iniciales = (cliente?: Cliente | null) => {
    if (!cliente) return '?';
    const parts = nombreCompleto(cliente).split(/\s+/).filter(Boolean);
    return `${parts[0]?.[0] || ''}${parts[1]?.[0] || ''}`.toUpperCase() || '?';
  };

  useEffect(() => {
    cargarClientes();
  }, []);

  const cargarClientes = async () => {
    try {
      setLoading(true);
      const data = await api.getClientes();
      const list = Array.isArray(data) ? data : [];
      const sanitized = list.map((c: Cliente) => {
        const esVip = isVipValue((c as any).es_vip);
        return {
          ...c,
          es_vip: esVip,
          nombre: sanitizeTextoParaNoVip(c.nombre, esVip),
          apellido_paterno: sanitizeApellidoParaNoVip(c.apellido_paterno, esVip),
          apellido_materno: sanitizeApellidoParaNoVip(c.apellido_materno, esVip),
        };
      });
      setClientes(sanitized);
    } catch (error) {
      console.error('Error cargando clientes:', error);
      toast({ title: 'Error', description: 'No se pudieron cargar los clientes', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleNuevoCliente = () => {
    setFormData(clienteInicial);
    setPhoneCountry(DEFAULT_COUNTRY);
    setPhoneLocal('');
    setSelectedCliente(null);
    setIsEditing(false);
    setIsFormOpen(true);
  };

  const handleEditarCliente = (cliente: Cliente) => {
    const esVip = isVipValue((cliente as any).es_vip);
    const sp = splitPhone(cliente.telefono);
    setPhoneCountry(sp.country);
    setPhoneLocal(sp.local);
    setFormData({
      tipo_cliente: cliente.tipo_cliente || 'Persona',
      nombre: cliente.nombre || '',
      apellido_paterno: sanitizeApellidoParaNoVip(cliente.apellido_paterno || '', esVip),
      apellido_materno: sanitizeApellidoParaNoVip(cliente.apellido_materno || '', esVip),
      email: cliente.email || '',
      telefono: cliente.telefono || '',
      tipo_documento: cliente.tipo_documento || 'INE',
      numero_documento: cliente.numero_documento || '',
      nacionalidad: cliente.nacionalidad || 'Mexicana',
      direccion: '',
      es_vip: esVip,
      notas: cliente.notas || ''
    });
    setSelectedCliente(cliente);
    setIsEditing(true);
    setIsFormOpen(true);
  };

  const handleGuardar = async () => {
    if (!formData.nombre.trim() || !formData.apellido_paterno.trim()) {
      toast({ title: 'Faltan datos', description: 'Nombre y apellido son requeridos', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const { direccion: _direccion, ...rest } = formData as any;
      const telefonoNormalizado = joinPhone(phoneCountry, phoneLocal);
      const payload = {
        ...rest,
        telefono: telefonoNormalizado || null,
        apellido_paterno: sanitizeApellidoParaNoVip(formData.apellido_paterno, Boolean(formData.es_vip)),
        apellido_materno: sanitizeApellidoParaNoVip(formData.apellido_materno, Boolean(formData.es_vip)),
      };
      if (isEditing && selectedCliente) {
        await api.updateCliente(selectedCliente.id, payload);
        toast({ title: 'Cliente actualizado' });
      } else {
        await api.createCliente(payload);
        toast({ title: 'Cliente creado' });
      }
      setIsFormOpen(false);
      await cargarClientes();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const stats = {
    total: clientes.length,
    vip: clientes.filter(c => isVipValue((c as any).es_vip)).length,
    nuevos: clientes.filter(c => (c.total_estancias || 0) <= 1).length,
    frecuentes: clientes.filter(c => (c.total_estancias || 0) > 5).length,
  };

  const filteredClientes = clientes.filter(c => {
    const query = searchQuery.trim().toLowerCase();
    const searchMatch = !query
      || nombreCompleto(c).toLowerCase().includes(query)
      || String(c.email || '').toLowerCase().includes(query)
      || String(c.telefono || '').toLowerCase().includes(query)
      || String(c.numero_documento || '').toLowerCase().includes(query);

    let filterMatch = true;
    if (quickFilter === 'vip') filterMatch = isVipValue((c as any).es_vip);
    if (quickFilter === 'nuevos') filterMatch = (c.total_estancias || 0) <= 1;
    if (quickFilter === 'frecuentes') filterMatch = (c.total_estancias || 0) > 5;
    return searchMatch && filterMatch;
  });

  const accessors = useMemo(() => ({
    nombre: (c: Cliente) => `${c.nombre || ''} ${c.apellido_paterno || ''} ${c.apellido_materno || ''}`.trim(),
    email: (c: Cliente) => c.email || '',
    telefono: (c: Cliente) => c.telefono || '',
    estancias: (c: Cliente) => c.total_estancias || 0,
    registro: (c: Cliente) => c.created_at || '',
    lealtad: (c: Cliente) => c.nivel_lealtad || 'Bronce',
  }), []);
  const dt = useDataTable<Cliente>(filteredClientes, accessors, { storageKey: 'clientes' });

  const handleResetAll = () => {
    setSearchQuery('');
    setQuickFilter('all');
    dt.resetPersisted();
  };

  const eliminarSeleccionados = async () => {
    setEliminandoBulk(true);
    try {
      const ids = Array.from(dt.selected);
      await Promise.all(ids.map(id => api.deleteCliente(id)));
      toast({ title: 'Clientes eliminados', description: `Se eliminaron ${ids.length} cliente(s).` });
      dt.clearSelection();
      await cargarClientes();
    } catch (err: any) {
      toast({ title: 'Error al eliminar', description: err.message || 'No se pudieron eliminar', variant: 'destructive' });
    } finally {
      setEliminandoBulk(false);
    }
  };

  const exportarCsv = () => {
    exportToCsv('clientes', dt.selectedRows.length > 0 ? dt.selectedRows : dt.processed, [
      { key: 'nombre', label: 'Nombre', accessor: (c) => c.nombre },
      { key: 'apellido_paterno', label: 'Apellido Paterno', accessor: (c) => c.apellido_paterno },
      { key: 'apellido_materno', label: 'Apellido Materno', accessor: (c) => c.apellido_materno },
      { key: 'email', label: 'Email', accessor: (c) => c.email },
      { key: 'telefono', label: 'Teléfono', accessor: (c) => c.telefono },
      { key: 'tipo_cliente', label: 'Tipo', accessor: (c) => c.tipo_cliente },
      { key: 'nivel_lealtad', label: 'Lealtad', accessor: (c) => c.nivel_lealtad },
      { key: 'es_vip', label: 'VIP', accessor: (c) => (c.es_vip ? 'Sí' : 'No') },
      { key: 'total_estancias', label: 'Estancias', accessor: (c) => c.total_estancias || 0 },
    ]);
  };

  const getLoyaltyColor = (nivel?: string) => {
    switch (nivel) {
      case 'Diamante': return 'bg-purple-500 text-white';
      case 'Platino': return 'bg-slate-400 text-white';
      case 'Oro': return 'bg-yellow-500 text-yellow-950';
      case 'Plata': return 'bg-gray-400 text-white';
      default: return 'bg-orange-700 text-white';
    }
  };

  const handleViewCliente = async (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setIsDetailOpen(true);
    setHistorial([]);
    setLoadingHistorial(true);
    try {
      const data = await api.getClienteReservas(cliente.id);
      setHistorial(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Error cargando historial:', e);
    } finally {
      setLoadingHistorial(false);
    }
  };

  if (loading) {
    return (
      <MainLayout title="Clientes" subtitle="Huéspedes y empresas">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-xl border bg-muted/30" />)}
        </div>
      </MainLayout>
    );
  }

  const quickStats: Array<{ key: ClienteFiltro; label: string; count: number; icon: any; className: string }> = [
    { key: 'all', label: 'Todos', count: stats.total, icon: Users, className: 'text-primary' },
    { key: 'vip', label: 'VIP', count: stats.vip, icon: Star, className: 'text-warning' },
    { key: 'nuevos', label: 'Nuevos', count: stats.nuevos, icon: Plus, className: 'text-success' },
    { key: 'frecuentes', label: 'Frecuentes', count: stats.frecuentes, icon: Award, className: 'text-info' },
  ];

  return (
    <MainLayout title="Clientes" subtitle="Encuentra huéspedes, historial y preferencias">
      <Card className="mb-4 overflow-hidden">
        <CardContent className="p-0">
          <div className="grid grid-cols-2 divide-x divide-y sm:grid-cols-4 sm:divide-y-0">
            {quickStats.map(stat => {
              const Icon = stat.icon;
              return (
                <button
                  type="button"
                  key={stat.key}
                  onClick={() => setQuickFilter(quickFilter === stat.key && stat.key !== 'all' ? 'all' : stat.key)}
                  className={cn('flex items-center gap-2 p-3 text-left transition hover:bg-muted/40', quickFilter === stat.key && 'bg-primary/5')}
                >
                  <Icon className={cn('h-4 w-4', stat.className)} />
                  <div>
                    <p className="text-lg font-bold tabular-nums">{stat.count}</p>
                    <p className="text-[11px] text-muted-foreground">{stat.label}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="relative min-w-0 flex-1 sm:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Nombre, teléfono, email o documento..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {(searchQuery || quickFilter !== 'all') && (
            <Button variant="ghost" size="sm" className="shrink-0" onClick={handleResetAll}>
              <RotateCcw className="mr-1 h-3.5 w-3.5" /> <span className="hidden sm:inline">Limpiar</span>
            </Button>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <span className="text-xs text-muted-foreground sm:hidden">{filteredClientes.length} clientes</span>
          <Button onClick={handleNuevoCliente} size="sm"><Plus className="mr-1.5 h-3.5 w-3.5" /> Nuevo cliente</Button>
          <ExportButton
            rows={() => filteredClientes.map((c: any) => ({
              Nombre: nombreCompleto(c),
              Email: c.email || '',
              Teléfono: c.telefono || '',
              'Total estancias': c.total_estancias || 0,
              VIP: c.es_vip ? 'Sí' : 'No',
              Notas: c.notas || '',
            }))}
            filename="clientes"
            sheetName="Clientes"
            label="Exportar"
          />
        </div>
      </div>

      <BulkActionBar
        count={dt.selectedCount}
        onClear={dt.clearSelection}
        onDelete={eliminarSeleccionados}
        onExport={exportarCsv}
        deleting={eliminandoBulk}
        entityName="clientes"
      />

      <div className="space-y-2 md:hidden">
        {dt.processed.length === 0 ? (
          <div className="flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed bg-muted/10 px-6 text-center">
            <Users className="mb-3 h-9 w-9 text-muted-foreground/40" />
            <p className="font-medium">No encontramos clientes</p>
            <p className="mt-1 text-sm text-muted-foreground">Prueba otra búsqueda o filtro.</p>
          </div>
        ) : dt.processed.map(cliente => (
          <Card
            key={cliente.id}
            className={cn('transition active:bg-muted/40', dt.selected.has(cliente.id) && 'ring-2 ring-primary')}
          >
            <CardContent className="p-3">
              <div className="flex items-start gap-3">
                <Checkbox
                  className="mt-2"
                  checked={dt.selected.has(cliente.id)}
                  onCheckedChange={() => dt.toggleRow(cliente.id)}
                  aria-label="Seleccionar cliente"
                />
                <button type="button" className="flex min-w-0 flex-1 items-start gap-3 text-left" onClick={() => handleViewCliente(cliente)}>
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{iniciales(cliente)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-semibold">{nombreCompleto(cliente)}</p>
                      {isVipValue((cliente as any).es_vip) && <Star className="h-3.5 w-3.5 shrink-0 fill-warning text-warning" />}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{cliente.telefono || cliente.email || 'Sin contacto'}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px]">{cliente.total_estancias || 0} estancias</Badge>
                      <Badge className={cn('text-[10px]', getLoyaltyColor(cliente.nivel_lealtad))}>{cliente.nivel_lealtad || 'Bronce'}</Badge>
                    </div>
                  </div>
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleViewCliente(cliente)}><Eye className="mr-2 h-4 w-4" /> Ver detalle</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleEditarCliente(cliente)}><Edit className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="hidden overflow-hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox checked={dt.allVisibleSelected ? true : dt.someVisibleSelected ? 'indeterminate' : false} onCheckedChange={(v) => dt.toggleSelectAllVisible(!!v)} aria-label="Seleccionar todos" />
              </TableHead>
              <SortHeader label="Cliente" columnKey="nombre" sortKey={dt.sortKey} sortDir={dt.sortDir} onSort={dt.toggleSort} filterValue={dt.filters.nombre} onFilterChange={(v) => dt.setColumnFilter('nombre', v)} onValuesChange={(vs) => dt.setColumnFilterValues('nombre', vs)} filterOptions={filteredClientes.map(c => nombreCompleto(c))} />
              <SortHeader label="Contacto" columnKey="email" sortKey={dt.sortKey} sortDir={dt.sortDir} onSort={dt.toggleSort} filterValue={dt.filters.email} onFilterChange={(v) => dt.setColumnFilter('email', v)} onValuesChange={(vs) => dt.setColumnFilterValues('email', vs)} filterOptions={filteredClientes.map(c => c.email || c.telefono || '')} />
              <SortHeader label="Estancias" columnKey="estancias" sortKey={dt.sortKey} sortDir={dt.sortDir} onSort={dt.toggleSort} align="center" filterValue={dt.filters.estancias} onFilterChange={(v) => dt.setColumnFilter('estancias', v)} onValuesChange={(vs) => dt.setColumnFilterValues('estancias', vs)} filterOptions={filteredClientes.map(c => String(c.total_estancias || 0))} />
              <SortHeader label="Registro" columnKey="registro" sortKey={dt.sortKey} sortDir={dt.sortDir} onSort={dt.toggleSort} filterValue={dt.filters.registro} onFilterChange={(v) => dt.setColumnFilter('registro', v)} onValuesChange={(vs) => dt.setColumnFilterValues('registro', vs)} filterOptions={filteredClientes.map(c => c.created_at || '')} />
              <SortHeader label="Lealtad" columnKey="lealtad" sortKey={dt.sortKey} sortDir={dt.sortDir} onSort={dt.toggleSort} filterValue={dt.filters.lealtad} onFilterChange={(v) => dt.setColumnFilter('lealtad', v)} onValuesChange={(vs) => dt.setColumnFilterValues('lealtad', vs)} filterOptions={filteredClientes.map(c => c.nivel_lealtad || 'Bronce')} />
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dt.processed.map(cliente => (
              <TableRow
                key={cliente.id}
                onClick={() => handleViewCliente(cliente)}
                className={cn('cursor-pointer', dt.selected.has(cliente.id) && 'bg-primary/5')}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox checked={dt.selected.has(cliente.id)} onCheckedChange={() => dt.toggleRow(cliente.id)} aria-label="Seleccionar fila" />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <Avatar className="h-8 w-8"><AvatarFallback className="bg-primary/10 text-[11px] font-semibold text-primary">{iniciales(cliente)}</AvatarFallback></Avatar>
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 font-medium"><span className="max-w-[260px] truncate">{nombreCompleto(cliente)}</span>{isVipValue((cliente as any).es_vip) && <Star className="h-3.5 w-3.5 fill-warning text-warning" />}</p>
                      <p className="text-[11px] text-muted-foreground">{cliente.tipo_cliente || 'Persona'}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-0.5">
                    <p className="flex items-center gap-1 text-xs"><Mail className="h-3 w-3 text-muted-foreground" /> {cliente.email || 'Sin email'}</p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground"><Phone className="h-3 w-3" /> {cliente.telefono || 'Sin teléfono'}</p>
                  </div>
                </TableCell>
                <TableCell className="text-center font-semibold tabular-nums">{cliente.total_estancias || 0}</TableCell>
                <TableCell className="text-xs">{cliente.created_at ? formatDate(cliente.created_at) : '-'}</TableCell>
                <TableCell><Badge className={cn('text-[10px]', getLoyaltyColor(cliente.nivel_lealtad))}>{cliente.nivel_lealtad || 'Bronce'}</Badge></TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleViewCliente(cliente)}><Eye className="mr-2 h-4 w-4" /> Ver detalle</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEditarCliente(cliente)}><Edit className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {dt.processed.length === 0 && <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">No hay clientes que coincidan.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>

      <div className="mt-3 hidden items-center justify-between text-xs text-muted-foreground md:flex">
        <span>Mostrando {dt.processed.length} de {clientes.length} clientes</span>
        <span>Haz clic en una fila para abrir el expediente.</span>
      </div>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-h-[88vh] max-w-xl overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10"><AvatarFallback className="bg-primary text-sm font-semibold text-primary-foreground">{iniciales(selectedCliente)}</AvatarFallback></Avatar>
              <div className="min-w-0 flex-1">
                <DialogTitle className="flex items-center gap-1.5"><span className="truncate">{nombreCompleto(selectedCliente)}</span>{isVipValue((selectedCliente as any)?.es_vip) && <Star className="h-4 w-4 fill-warning text-warning" />}</DialogTitle>
                <DialogDescription className="truncate">{selectedCliente?.email || selectedCliente?.telefono || 'Sin contacto registrado'}</DialogDescription>
              </div>
              {selectedCliente && <Button variant="outline" size="sm" onClick={() => { setIsDetailOpen(false); handleEditarCliente(selectedCliente); }}><Edit className="mr-1 h-3.5 w-3.5" /> Editar</Button>}
            </div>
          </DialogHeader>

          <Tabs defaultValue="info">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="info">Resumen</TabsTrigger>
              <TabsTrigger value="historial">Historial</TabsTrigger>
              <TabsTrigger value="preferencias">Notas</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="mt-3 space-y-3">
              <div className="grid grid-cols-2 gap-2 rounded-lg border p-3 text-sm">
                <div><p className="text-[11px] text-muted-foreground">Teléfono</p><p className="truncate font-medium">{selectedCliente?.telefono || '-'}</p></div>
                <div><p className="text-[11px] text-muted-foreground">Nacionalidad</p><p className="truncate font-medium">{selectedCliente?.nacionalidad || '-'}</p></div>
                <div><p className="text-[11px] text-muted-foreground">Documento</p><p className="truncate font-medium">{selectedCliente?.tipo_documento || '-'} {selectedCliente?.numero_documento || ''}</p></div>
                <div><p className="text-[11px] text-muted-foreground">Lealtad</p><Badge className={cn('mt-0.5 text-[10px]', getLoyaltyColor(selectedCliente?.nivel_lealtad))}>{selectedCliente?.nivel_lealtad || 'Bronce'}</Badge></div>
              </div>
              {(() => {
                const validas = historial.filter((r: any) => r.estado !== 'Cancelada');
                const totalGastado = validas.reduce((s: number, r: any) => s + (Number(r.total) || 0), 0);
                const totalNoches = validas.reduce((s: number, r: any) => s + (Number(r.noches) || 0), 0);
                const estancias = validas.length || (selectedCliente?.total_estancias || 0);
                return (
                  <div className="grid grid-cols-3 divide-x rounded-lg border bg-muted/10">
                    <div className="p-3 text-center"><p className="text-lg font-bold text-primary">{estancias}</p><p className="text-[10px] text-muted-foreground">Estancias</p></div>
                    <div className="p-3 text-center"><p className="truncate text-sm font-bold text-primary sm:text-base">{formatCurrency(totalGastado)}</p><p className="text-[10px] text-muted-foreground">Gastado</p></div>
                    <div className="p-3 text-center"><p className="text-lg font-bold text-primary">{totalNoches}</p><p className="text-[10px] text-muted-foreground">Noches</p></div>
                  </div>
                );
              })()}
            </TabsContent>

            <TabsContent value="historial" className="mt-3">
              {loadingHistorial ? (
                <div className="space-y-2 py-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-muted/40" />)}</div>
              ) : historial.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">No hay estancias registradas.</div>
              ) : (
                <div className="max-h-[50vh] space-y-2 overflow-y-auto">
                  {historial.map((r: any) => (
                    <div key={r.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{r.numero_reserva || `RES-${String(r.id).slice(0, 6)}`}</p>
                        <p className="text-[11px] text-muted-foreground">{r.fecha_checkin ? formatDate(r.fecha_checkin) : '-'}{r.fecha_checkout ? ` → ${formatDate(r.fecha_checkout)}` : ''}{r.habitacion_numero ? ` · Hab ${r.habitacion_numero}` : ''}</p>
                      </div>
                      <div className="shrink-0 text-right">{r.total != null && <p className="text-sm font-semibold">{formatCurrency(Number(r.total))}</p>}{r.estado && <p className="text-[10px] text-muted-foreground">{r.estado}</p>}</div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="preferencias" className="mt-3">
              <div className="min-h-28 rounded-lg border bg-muted/10 p-3 text-sm leading-relaxed text-muted-foreground">
                {selectedCliente?.notas || 'Sin notas o preferencias registradas.'}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? `Editar ${selectedCliente ? nombreCompleto(selectedCliente) : 'cliente'}` : 'Nuevo cliente'}</DialogTitle>
            <DialogDescription>{isEditing ? 'Actualiza los datos del huésped o empresa.' : 'Registra los datos esenciales; puedes completar el resto después.'}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 py-1 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Tipo de cliente</Label>
              <Select value={formData.tipo_cliente} onValueChange={(v) => setFormData({ ...formData, tipo_cliente: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Persona">Persona</SelectItem><SelectItem value="Empresa">Empresa</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div><Label className="font-medium">Cliente VIP</Label><p className="text-[11px] text-muted-foreground">Destácalo en reservas y recepción.</p></div>
              <Switch checked={Boolean(formData.es_vip)} onCheckedChange={(v) => setFormData({ ...formData, es_vip: v })} />
            </div>

            <div className="space-y-1.5"><Label>Nombre *</Label><Input autoFocus value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} placeholder="Nombre" /></div>
            <div className="space-y-1.5"><Label>Apellido paterno *</Label><Input value={formData.apellido_paterno} onChange={(e) => setFormData({ ...formData, apellido_paterno: e.target.value })} placeholder="Apellido paterno" /></div>
            <div className="space-y-1.5"><Label>Apellido materno</Label><Input value={formData.apellido_materno} onChange={(e) => setFormData({ ...formData, apellido_materno: e.target.value })} placeholder="Apellido materno" /></div>
            <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="correo@ejemplo.com" /></div>

            <div className="space-y-1.5 sm:col-span-2"><Label>Teléfono</Label><PhoneInput country={phoneCountry} localPhone={phoneLocal} onCountryChange={setPhoneCountry} onLocalPhoneChange={setPhoneLocal} /></div>

            <div className="space-y-1.5"><Label>Tipo de documento</Label><Select value={formData.tipo_documento} onValueChange={(v) => setFormData({ ...formData, tipo_documento: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="INE">INE</SelectItem><SelectItem value="Pasaporte">Pasaporte</SelectItem><SelectItem value="Licencia">Licencia</SelectItem><SelectItem value="Otro">Otro</SelectItem></SelectContent></Select></div>
            <div className="space-y-1.5"><Label>Número de documento</Label><Input value={formData.numero_documento} onChange={(e) => setFormData({ ...formData, numero_documento: e.target.value })} placeholder="Identificación" /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label>Nacionalidad</Label><Input value={formData.nacionalidad} onChange={(e) => setFormData({ ...formData, nacionalidad: e.target.value })} placeholder="Mexicana" /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label>Notas / preferencias</Label><Textarea className="min-h-24" value={formData.notas} onChange={(e) => setFormData({ ...formData, notas: e.target.value })} placeholder="Alergias, preferencias, solicitudes especiales..." /></div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleGuardar} disabled={saving}>{saving ? 'Guardando...' : (isEditing ? 'Guardar cambios' : 'Crear cliente')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
