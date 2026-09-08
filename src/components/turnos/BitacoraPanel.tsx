import { useMemo, useState } from 'react';
import {
  BookOpen, Plus, CheckCircle2, Circle, Trash2, AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useBitacora, type BitacoraCategoria } from '@/hooks/useBitacora';
import { formatDateTime } from '@/lib/dateFormat';
import { ExportButton } from '@/components/ExportButton';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const CATEGORIAS: BitacoraCategoria[] = [
  'General', 'Pendiente', 'Incidente', 'Huésped', 'Mantenimiento', 'Caja', 'Entrega de turno',
];
const CATEGORIAS_CON_SEGUIMIENTO: BitacoraCategoria[] = ['Pendiente', 'Incidente', 'Mantenimiento', 'Caja', 'Entrega de turno'];

const catColor: Record<BitacoraCategoria, string> = {
  General: 'bg-slate-100 text-slate-700',
  Pendiente: 'bg-amber-100 text-amber-800',
  Incidente: 'bg-red-100 text-red-800',
  Huésped: 'bg-blue-100 text-blue-800',
  Mantenimiento: 'bg-purple-100 text-purple-800',
  Caja: 'bg-emerald-100 text-emerald-800',
  'Entrega de turno': 'bg-orange-100 text-orange-800',
};

interface Props {
  turnoId?: string;
}

export function BitacoraPanel({ turnoId }: Props) {
  const { entradas, agregar, togglePendiente, eliminar } = useBitacora();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [filtro, setFiltro] = useState<'todos' | 'pendientes' | 'turno'>('todos');
  const [form, setForm] = useState<{ categoria: BitacoraCategoria; prioridad: 'Baja' | 'Normal' | 'Alta' | 'Crítica'; responsable: string; titulo: string; detalle: string }>({
    categoria: 'General',
    prioridad: 'Normal',
    responsable: '',
    titulo: '',
    detalle: '',
  });

  const filtradas = useMemo(() => {
    if (filtro === 'pendientes') return entradas.filter((e) => CATEGORIAS_CON_SEGUIMIENTO.includes(e.categoria) && !e.resuelto);
    if (filtro === 'turno' && turnoId) return entradas.filter((e) => e.turnoId === turnoId);
    return entradas;
  }, [entradas, filtro, turnoId]);

  const pendientes = entradas.filter((e) => CATEGORIAS_CON_SEGUIMIENTO.includes(e.categoria) && !e.resuelto).length;

  const handleAgregar = () => {
    if (!form.titulo.trim()) {
      toast({ title: 'Falta el título', variant: 'destructive' });
      return;
    }
    agregar({ ...form, turnoId, resuelto: false });
    toast({ title: 'Entrada agregada a la bitácora' });
    setForm({ categoria: 'General', prioridad: 'Normal', responsable: '', titulo: '', detalle: '' });
    setOpen(false);
  };

  return (
    <Card className="overflow-hidden border-[#10233F]/10 shadow-sm">
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0 border-b bg-slate-50/70 px-4 py-3 sm:px-5">
        <div><CardTitle className="flex items-center gap-2 text-base text-[#10233F]">
          <BookOpen className="h-4 w-4" />
          Bitácora de turno
          {pendientes > 0 && (
            <Badge className="bg-amber-500 text-white ml-2">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {pendientes} pendiente{pendientes > 1 ? 's' : ''}
            </Badge>
          )}
        </CardTitle><p className="mt-0.5 text-xs text-muted-foreground">Notas e incidencias que necesitan continuidad.</p></div>
        <div className="flex gap-2 flex-wrap">
          <ExportButton
            rows={() => entradas.map((e) => ({
              Fecha: formatDateTime(e.fecha),
              Autor: e.autor,
              Categoría: e.categoria,
              Título: e.titulo,
              Detalle: e.detalle,
              Estado: e.categoria === 'Pendiente' ? (e.resuelto ? 'Resuelto' : 'Abierto') : '',
            }))}
            filename="bitacora_turnos"
            sheetName="Bitácora"
            label="Exportar"
          />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Nueva nota
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Nueva entrada en bitácora</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div>
                  <Label>Categoría</Label>
                  <Select
                    value={form.categoria}
                    onValueChange={(v: BitacoraCategoria) => setForm({ ...form, categoria: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Prioridad</Label>
                    <Select value={form.prioridad} onValueChange={(v: typeof form.prioridad) => setForm({ ...form, prioridad: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{['Baja', 'Normal', 'Alta', 'Crítica'].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Responsable</Label>
                    <Input value={form.responsable} onChange={(e) => setForm({ ...form, responsable: e.target.value })} placeholder="Nombre o área" />
                  </div>
                </div>
                <div>
                  <Label>Título *</Label>
                  <Input
                    value={form.titulo}
                    onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                    placeholder="Ej. Hab 302 pide toallas extra"
                  />
                </div>
                <div>
                  <Label>Detalle</Label>
                  <Textarea
                    rows={4}
                    value={form.detalle}
                    onChange={(e) => setForm({ ...form, detalle: e.target.value })}
                    placeholder="Contexto, acciones tomadas, seguimiento…"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={handleAgregar}>Agregar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-5">
        <div className="flex gap-2 mb-4 flex-wrap">
          {[
            { k: 'todos', l: `Todas (${entradas.length})` },
            { k: 'pendientes', l: `Pendientes (${pendientes})` },
            ...(turnoId ? [{ k: 'turno', l: 'Este turno' }] : []),
          ].map((f) => (
            <button
              key={f.k}
              onClick={() => setFiltro(f.k as any)}
              className={cn(
                'h-8 px-3 rounded-full text-sm border transition',
                filtro === f.k
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-white border-slate-200 hover:bg-slate-50',
              )}
            >
              {f.l}
            </button>
          ))}
        </div>

        {filtradas.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p>Sin entradas en bitácora todavía.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtradas.map((e) => (
              <div
                key={e.id}
                className={cn(
                  'p-3 rounded-lg border bg-white flex gap-3',
                  CATEGORIAS_CON_SEGUIMIENTO.includes(e.categoria) && e.resuelto && 'opacity-60',
                )}
              >
                {CATEGORIAS_CON_SEGUIMIENTO.includes(e.categoria) && (
                  <button onClick={() => togglePendiente(e.id)} className="shrink-0 mt-0.5">
                    {e.resuelto
                      ? <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      : <Circle className="h-5 w-5 text-amber-500" />}
                  </button>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={cn('font-normal', catColor[e.categoria])} variant="secondary">
                      {e.categoria}
                    </Badge>
                    {e.prioridad && e.prioridad !== 'Normal' && <Badge variant={e.prioridad === 'Crítica' ? 'destructive' : 'outline'}>{e.prioridad}</Badge>}
                    <span className={cn('font-medium', CATEGORIAS_CON_SEGUIMIENTO.includes(e.categoria) && e.resuelto && 'line-through')}>
                      {e.titulo}
                    </span>
                  </div>
                  {e.detalle && <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{e.detalle}</p>}
                  <p className="text-xs text-muted-foreground mt-1">
                    {e.autor}{e.responsable ? ` · Responsable: ${e.responsable}` : ''} · {formatDateTime(e.fecha)}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => eliminar(e.id)} className="shrink-0">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
