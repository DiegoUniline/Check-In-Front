import { useMemo, useState } from 'react';
import {
  BookOpen, Plus, CheckCircle2, Circle, Trash2, ArrowRightLeft, AlertTriangle,
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
  siguienteUsuario?: string;
}

export function BitacoraPanel({ turnoId, siguienteUsuario }: Props) {
  const { entradas, agregar, togglePendiente, eliminar } = useBitacora();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [handoverOpen, setHandoverOpen] = useState(false);
  const [filtro, setFiltro] = useState<'todos' | 'pendientes' | 'turno'>('todos');
  const [form, setForm] = useState<{ categoria: BitacoraCategoria; titulo: string; detalle: string }>({
    categoria: 'General',
    titulo: '',
    detalle: '',
  });
  const [handover, setHandover] = useState({ destinatario: '', resumen: '', pendientes: '', caja: '' });

  const filtradas = useMemo(() => {
    if (filtro === 'pendientes') return entradas.filter((e) => e.categoria === 'Pendiente' && !e.resuelto);
    if (filtro === 'turno' && turnoId) return entradas.filter((e) => e.turnoId === turnoId);
    return entradas;
  }, [entradas, filtro, turnoId]);

  const pendientes = entradas.filter((e) => e.categoria === 'Pendiente' && !e.resuelto).length;

  const handleAgregar = () => {
    if (!form.titulo.trim()) {
      toast({ title: 'Falta el título', variant: 'destructive' });
      return;
    }
    agregar({ ...form, turnoId, resuelto: false });
    toast({ title: 'Entrada agregada a la bitácora' });
    setForm({ categoria: 'General', titulo: '', detalle: '' });
    setOpen(false);
  };

  const handleHandover = () => {
    const titulo = `Entrega de turno${handover.destinatario ? ` → ${handover.destinatario}` : ''}`;
    const detalle = [
      handover.resumen && `Resumen: ${handover.resumen}`,
      handover.pendientes && `Pendientes: ${handover.pendientes}`,
      handover.caja && `Caja: ${handover.caja}`,
    ].filter(Boolean).join('\n\n');
    agregar({ categoria: 'Entrega de turno', titulo, detalle, turnoId, resuelto: false });
    toast({ title: 'Entrega de turno registrada' });
    setHandover({ destinatario: '', resumen: '', pendientes: '', caja: '' });
    setHandoverOpen(false);
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Bitácora de turno
          {pendientes > 0 && (
            <Badge className="bg-amber-500 text-white ml-2">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {pendientes} pendiente{pendientes > 1 ? 's' : ''}
            </Badge>
          )}
        </CardTitle>
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
          <Dialog open={handoverOpen} onOpenChange={setHandoverOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Entregar turno
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Entrega de turno</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div>
                  <Label>Entregar a</Label>
                  <Input
                    placeholder={siguienteUsuario || 'Nombre del siguiente recepcionista'}
                    value={handover.destinatario}
                    onChange={(e) => setHandover({ ...handover, destinatario: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Resumen general</Label>
                  <Textarea
                    rows={2}
                    placeholder="Ocupación, situación general…"
                    value={handover.resumen}
                    onChange={(e) => setHandover({ ...handover, resumen: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Pendientes / observaciones</Label>
                  <Textarea
                    rows={3}
                    placeholder="Check-outs, pagos, quejas, mantenimiento…"
                    value={handover.pendientes}
                    onChange={(e) => setHandover({ ...handover, pendientes: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Caja / fondo entregado</Label>
                  <Input
                    placeholder="Ej. $2,500 en efectivo + comprobantes"
                    value={handover.caja}
                    onChange={(e) => setHandover({ ...handover, caja: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setHandoverOpen(false)}>Cancelar</Button>
                <Button onClick={handleHandover}>Registrar entrega</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
      <CardContent>
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
                  e.categoria === 'Pendiente' && e.resuelto && 'opacity-60',
                )}
              >
                {e.categoria === 'Pendiente' && (
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
                    <span className={cn('font-medium', e.categoria === 'Pendiente' && e.resuelto && 'line-through')}>
                      {e.titulo}
                    </span>
                  </div>
                  {e.detalle && <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{e.detalle}</p>}
                  <p className="text-xs text-muted-foreground mt-1">
                    {e.autor} · {formatDateTime(e.fecha)}
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
