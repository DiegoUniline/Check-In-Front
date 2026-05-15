import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ScrollText, Search, RefreshCw, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

const accionColor: Record<string, string> = {
  crear: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
  actualizar: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
  eliminar: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
  login: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200',
  custom: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
};

export default function Auditoria() {
  const [search, setSearch] = useState('');
  const [accion, setAccion] = useState<string>('all');
  const [entidad, setEntidad] = useState<string>('all');

  const { data: registros = [], refetch, isFetching } = useQuery({
    queryKey: ['auditoria'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('auditoria' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  const entidades = useMemo(() => {
    const set = new Set<string>(registros.map((r: any) => r.entidad).filter(Boolean));
    return Array.from(set).sort();
  }, [registros]);

  const filtrados = useMemo(() => {
    return registros.filter((r: any) => {
      if (accion !== 'all' && r.accion !== accion) return false;
      if (entidad !== 'all' && r.entidad !== entidad) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay =
          r.descripcion?.toLowerCase().includes(q) ||
          r.user_email?.toLowerCase().includes(q) ||
          r.entidad?.toLowerCase().includes(q) ||
          r.entidad_id?.toLowerCase().includes(q);
        if (!hay) return false;
      }
      return true;
    });
  }, [registros, search, accion, entidad]);

  return (
    <MainLayout title="Bitácora / Auditoría" subtitle="Registro inmutable de cambios y acciones del sistema">
      <div className="flex flex-col lg:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por usuario, descripción, entidad..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={accion} onValueChange={setAccion}>
          <SelectTrigger className="w-full lg:w-44">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Acción" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las acciones</SelectItem>
            <SelectItem value="crear">Crear</SelectItem>
            <SelectItem value="actualizar">Actualizar</SelectItem>
            <SelectItem value="eliminar">Eliminar</SelectItem>
            <SelectItem value="login">Login</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
        <Select value={entidad} onValueChange={setEntidad}>
          <SelectTrigger className="w-full lg:w-48">
            <SelectValue placeholder="Entidad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las entidades</SelectItem>
            {entidades.map((e) => (
              <SelectItem key={e} value={e}>{e}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          Recargar
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-44">Fecha</TableHead>
                <TableHead className="w-28">Acción</TableHead>
                <TableHead className="w-40">Entidad</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="w-56">Usuario</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    <ScrollText className="h-10 w-10 mx-auto mb-2 opacity-40" />
                    Sin registros que coincidan con los filtros.
                  </TableCell>
                </TableRow>
              ) : filtrados.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="text-sm font-mono text-muted-foreground">
                    {new Date(r.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge className={accionColor[r.accion] || accionColor.custom}>
                      {r.accion}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{r.entidad}</div>
                    {r.entidad_id && (
                      <div className="text-xs text-muted-foreground font-mono truncate max-w-40">
                        {r.entidad_id}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{r.descripcion || '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.user_email || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground mt-3">
        Mostrando {filtrados.length} de {registros.length} registros (máximo 500 más recientes).
      </p>
    </MainLayout>
  );
}