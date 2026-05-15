import { useEffect, useState } from 'react';
import { Plus, Trash2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useConfirm } from '@/hooks/useConfirm';
import api from '@/lib/api';

type Tipo = 'checkin' | 'checkout';

function ListaItems({ tipo, titulo, descripcion }: { tipo: Tipo; titulo: string; descripcion: string }) {
  const { toast } = useToast();
  const confirm = useConfirm();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [nuevo, setNuevo] = useState('');
  const [saving, setSaving] = useState(false);

  const cargar = async () => {
    setLoading(true);
    try {
      const data = await api.getChecklistItems({ tipo });
      setItems(data);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, [tipo]);

  const agregar = async () => {
    const nombre = nuevo.trim();
    if (!nombre) return;
    if (nombre.length > 120) {
      toast({ title: 'Nombre muy largo', description: 'Máximo 120 caracteres', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await api.createChecklistItem({ tipo, nombre, orden: items.length + 1, activo: true });
      setNuevo('');
      await cargar();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (item: any, activo: boolean) => {
    try {
      await api.updateChecklistItem(item.id, { activo });
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, activo } : i)));
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const renombrar = async (item: any, nombre: string) => {
    if (!nombre.trim() || nombre === item.nombre) return;
    try {
      await api.updateChecklistItem(item.id, { nombre: nombre.trim() });
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, nombre: nombre.trim() } : i)));
      toast({ title: 'Guardado' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const eliminar = async (id: string) => {
    const ok = await confirm({
      title: 'Eliminar item',
      description: '¿Eliminar este item del checklist?',
      confirmText: 'Eliminar',
      destructive: true,
    });
    if (!ok) return;
    try {
      await api.deleteChecklistItem(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{titulo}</CardTitle>
        <CardDescription>{descripcion}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin items configurados.</p>
        ) : (
          items.map((item) => (
            <ItemRow key={item.id} item={item} onToggle={toggle} onRename={renombrar} onDelete={eliminar} />
          ))
        )}

        <div className="flex gap-2 pt-2 border-t">
          <Input
            placeholder="Nuevo item de verificación..."
            value={nuevo}
            maxLength={120}
            onChange={(e) => setNuevo(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && agregar()}
          />
          <Button onClick={agregar} disabled={saving || !nuevo.trim()}>
            <Plus className="h-4 w-4 mr-1" /> Agregar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ItemRow({
  item,
  onToggle,
  onRename,
  onDelete,
}: {
  item: any;
  onToggle: (it: any, v: boolean) => void;
  onRename: (it: any, n: string) => void;
  onDelete: (id: string) => void;
}) {
  const [nombre, setNombre] = useState(item.nombre);
  const cambio = nombre.trim() !== item.nombre;
  return (
    <div className="flex items-center gap-2">
      <Input
        value={nombre}
        maxLength={120}
        onChange={(e) => setNombre(e.target.value)}
        className="flex-1"
      />
      {cambio && (
        <Button size="sm" variant="outline" onClick={() => onRename(item, nombre)}>
          <Save className="h-4 w-4" />
        </Button>
      )}
      <div className="flex items-center gap-2 px-2">
        <Switch checked={!!item.activo} onCheckedChange={(v) => onToggle(item, v)} />
        <span className="text-xs text-muted-foreground w-12">
          {item.activo ? 'Activo' : 'Inactivo'}
        </span>
      </div>
      <Button size="sm" variant="ghost" onClick={() => onDelete(item.id)}>
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}

export function ChecklistConfig() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ListaItems
        tipo="checkin"
        titulo="Verificaciones de Check-in"
        descripcion="Items requeridos al recibir al huésped. Se exige marcarlos todos para hacer check-in."
      />
      <ListaItems
        tipo="checkout"
        titulo="Verificaciones de Check-out"
        descripcion="Items requeridos al cierre de la estancia. Se exige marcarlos todos para hacer check-out."
      />
    </div>
  );
}