import { useMemo, useState } from 'react';
import { Shield, RotateCcw, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  ROLES, VIEWS, RoleId, PermissionMatrix,
  loadPermissions, savePermissions, resetPermissions, DEFAULT_PERMISSIONS, ROLE_PROFILES, aplicarPerfil,
} from '@/lib/permissions';
import { SaveButton, isDirty } from '@/components/ui/save-button';
import { useUnsavedChanges } from '@/contexts/UnsavedChangesContext';

export default function Permisos() {
  const { toast } = useToast();
  const [matrix, setMatrix] = useState<PermissionMatrix>(() => loadPermissions());
  const [initialMatrix, setInitialMatrix] = useState<PermissionMatrix>(() => loadPermissions());
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  // Cargar desde BD al montar
  useQuery({
    queryKey: ['permisos-hotel'],
    queryFn: async () => {
      const remote = await api.getPermisosHotel().catch(() => ({}));
      const merged = { ...DEFAULT_PERMISSIONS, ...remote } as PermissionMatrix;
      setMatrix(merged);
      setInitialMatrix(merged);
      savePermissions(merged); // cache local
      return merged;
    },
  });

  const groups = useMemo(() => {
    const filtered = VIEWS.filter(v =>
      !search ||
      v.label.toLowerCase().includes(search.toLowerCase()) ||
      v.group.toLowerCase().includes(search.toLowerCase())
    );
    const map = new Map<string, typeof VIEWS>();
    for (const v of filtered) {
      if (!map.has(v.group)) map.set(v.group, []);
      map.get(v.group)!.push(v);
    }
    return Array.from(map.entries());
  }, [search]);

  const toggle = (viewKey: string, role: RoleId, checked: boolean) => {
    setMatrix(prev => {
      const current = new Set(prev[viewKey] || []);
      if (checked) current.add(role); else current.delete(role);
      return { ...prev, [viewKey]: Array.from(current) as RoleId[] };
    });
  };

  const toggleAllForView = (viewKey: string, checked: boolean) => {
    setMatrix(prev => ({
      ...prev,
      [viewKey]: checked ? ROLES.filter(r => r.id !== 'Admin').map(r => r.id) : ['Admin'],
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.savePermisosHotel(matrix);
      savePermissions(matrix);
      setInitialMatrix(matrix);
      toast({ title: 'Permisos guardados', description: 'Sincronizados con la base de datos.' });
    } catch (e: any) {
      toast({ title: 'Error al guardar', description: e?.message || 'Intenta de nuevo', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const aplicar = (role: RoleId) => {
    setMatrix(prev => aplicarPerfil(prev, role));
    toast({ title: `Perfil de ${ROLES.find(r => r.id === role)?.nombre} aplicado`, description: 'Revisa y guarda para que tome efecto.' });
  };

  const contar = (role: RoleId) => VIEWS.filter(v => (matrix[v.key] || []).includes(role)).length;

  const handleReset = () => {
    const def = resetPermissions();
    setMatrix(def);
    toast({ title: 'Permisos restaurados', description: 'Se cargaron los valores por defecto.' });
  };

  const dirty = useMemo(() => isDirty(initialMatrix, matrix), [initialMatrix, matrix]);
  useUnsavedChanges(dirty);

  return (
    <MainLayout
      title="Permisos por Rol"
      subtitle="Define qué vistas y pestañas puede ver cada rol del sistema"
    >
      <div className="flex flex-col sm:flex-row gap-3 mb-6 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar vista o sección..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="mr-2 h-4 w-4" /> Restaurar
          </Button>
          <SaveButton onClick={handleSave} dirty={dirty} loading={saving} />
        </div>
      </div>

      <Card className="mb-4 border-primary/20 bg-primary/5">
        <CardContent className="p-4 text-sm text-muted-foreground flex items-start gap-3">
          <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            El rol <strong>Administrador</strong> siempre tiene acceso completo y no puede ser deshabilitado.
            Los permisos se guardan en la base de datos y se validan también en el servidor; se aplican al instante a todos los usuarios.
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Perfiles por rol</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {ROLES.map(r => (
            <div key={r.id} className="flex flex-col rounded-md border p-3">
              <div className="flex items-center gap-2">
                <span className={cn('h-2 w-2 rounded-full', r.color)} />
                <span className="text-sm font-semibold">{r.nombre}</span>
                <Badge variant="secondary" className="ml-auto text-[10px]">
                  {r.id === 'Admin' ? 'Todo' : `${contar(r.id)} / ${VIEWS.length}`}
                </Badge>
              </div>
              <p className="mt-2 flex-1 text-xs text-muted-foreground">{ROLE_PROFILES[r.id]}</p>
              {r.id !== 'Admin' && (
                <Button size="sm" variant="outline" className="mt-3 h-7 text-xs" onClick={() => aplicar(r.id)}>
                  Aplicar perfil recomendado
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="space-y-6">
        {groups.map(([group, items]) => (
          <Card key={group}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{group}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">Vista / Tab</TableHead>
                    {ROLES.map(r => (
                      <TableHead key={r.id} className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <div className={cn('w-2 h-2 rounded-full', r.color)} />
                          <span className="text-xs">{r.nombre}</span>
                        </div>
                      </TableHead>
                    ))}
                    <TableHead className="text-center w-20">Todos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map(view => {
                    const allowed = matrix[view.key] || [];
                    const allOn = ROLES.every(r => allowed.includes(r.id));
                    return (
                      <TableRow key={view.key}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{view.label}</span>
                            {view.path && (
                              <Badge variant="outline" className="text-xs font-mono">{view.path}</Badge>
                            )}
                          </div>
                        </TableCell>
                        {ROLES.map(r => (
                          <TableCell key={r.id} className="text-center">
                            <Checkbox
                              checked={allowed.includes(r.id)}
                              disabled={r.id === 'Admin'}
                              onCheckedChange={(c) => toggle(view.key, r.id, !!c)}
                            />
                          </TableCell>
                        ))}
                        <TableCell className="text-center">
                          <Checkbox
                            checked={allOn}
                            onCheckedChange={(c) => toggleAllForView(view.key, !!c)}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
      </div>
    </MainLayout>
  );
}