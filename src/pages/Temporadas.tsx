import { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarRange, Pencil, Plus, Trash2, TrendingDown, TrendingUp, Tag } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import {
  Temporada,
  TipoAjuste,
  AlcanceTemporada,
  listTemporadas,
  loadTemporadas,
  upsertTemporada,
  deleteTemporada,
  describirAjuste,
  newTemporadaId,
} from '@/lib/temporadas';
import { formatCurrency } from '@/lib/currency';
import { format } from 'date-fns';

const emptyForm = (): Temporada => ({
  id: newTemporadaId(),
  nombre: '',
  fecha_inicio: format(new Date(), 'yyyy-MM-dd'),
  fecha_fin: format(new Date(), 'yyyy-MM-dd'),
  tipo_ajuste: 'porcentaje',
  valor: 10,
  alcance: 'todos',
  tipo_habitacion_id: null,
  habitacion_id: null,
  prioridad: 0,
  activo: true,
});

export default function Temporadas() {
  const [items, setItems] = useState<Temporada[]>([]);
  const [tipos, setTipos] = useState<any[]>([]);
  const [habitaciones, setHabitaciones] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Temporada>(emptyForm());

  const reload = () => setItems([...listTemporadas()].sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio)));

  useEffect(() => {
    loadTemporadas().then(reload).catch(() => reload());
    Promise.all([api.getTiposHabitacion().catch(() => []), api.getHabitaciones().catch(() => [])]).then(([t, h]) => {
      setTipos(Array.isArray(t) ? t : []);
      setHabitaciones(Array.isArray(h) ? h : []);
    });
  }, []);

  const nombreTipo = (id?: string | null) => tipos.find((t) => t.id === id)?.nombre || '—';
  const nombreHab = (id?: string | null) => {
    const h = habitaciones.find((x) => x.id === id);
    return h ? `Hab. ${h.numero || h.nombre || ''}`.trim() : '—';
  };

  const openNew = () => { setForm(emptyForm()); setOpen(true); };
  const openEdit = (t: Temporada) => { setForm({ ...t }); setOpen(true); };

  const save = async () => {
    if (!form.nombre.trim()) return toast.error('Ponle un nombre a la temporada');
    if (form.fecha_fin < form.fecha_inicio) return toast.error('La fecha fin no puede ser antes que la de inicio');
    if (form.alcance === 'tipo' && !form.tipo_habitacion_id) return toast.error('Elige un tipo de habitación');
    if (form.alcance === 'habitacion' && !form.habitacion_id) return toast.error('Elige la habitación');
    try {
      await upsertTemporada({ ...form, valor: Number(form.valor) || 0, prioridad: Number(form.prioridad) || 0 });
      reload();
      setOpen(false);
      toast.success('Temporada guardada');
    } catch (e: any) {
      toast.error(e?.message || 'No se pudo guardar la temporada');
    }
  };

  const remove = async (id: string) => {
    if (!confirm('¿Eliminar esta temporada?')) return;
    try {
      await deleteTemporada(id);
      reload();
    } catch (e: any) {
      toast.error(e?.message || 'No se pudo eliminar');
    }
  };

  const previewNumero = useMemo(() => {
    const base = 1000;
    if (form.tipo_ajuste === 'porcentaje') return base + (base * (Number(form.valor) || 0)) / 100;
    if (form.tipo_ajuste === 'monto') return base + (Number(form.valor) || 0);
    return Number(form.valor) || 0;
  }, [form.tipo_ajuste, form.valor]);

  return (
    <MainLayout title="Temporadas y tarifas" subtitle="Sube o baja los precios de habitación por rango de fechas">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            Al crear una reserva se aplica automáticamente la temporada que coincida con la fecha de check-in.
          </p>
          <Button onClick={openNew}>
            <Plus className="mr-2 h-4 w-4" /> Nueva temporada
          </Button>
        </div>

        {items.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <CalendarRange className="mx-auto h-10 w-10 mb-3 opacity-50" />
              <p className="font-medium">Aún no hay temporadas configuradas</p>
              <p className="text-sm">Crea una para ajustar tarifas por fechas (ej. Semana Santa, temporada baja).</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {items.map((t) => {
              const sube = t.tipo_ajuste === 'porcentaje' || t.tipo_ajuste === 'monto' ? t.valor >= 0 : true;
              return (
                <Card key={t.id} className={!t.activo ? 'opacity-60' : ''}>
                  <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold truncate">{t.nombre}</h3>
                        {!t.activo && <Badge variant="secondary">Inactiva</Badge>}
                        <Badge variant={sube ? 'default' : 'destructive'} className="flex items-center gap-1">
                          {sube ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {describirAjuste(t)}
                        </Badge>
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Tag className="h-3 w-3" />
                          {t.alcance === 'todos' && 'Todas'}
                          {t.alcance === 'tipo' && `Tipo: ${nombreTipo(t.tipo_habitacion_id)}`}
                          {t.alcance === 'habitacion' && nombreHab(t.habitacion_id)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                        <CalendarRange className="h-3.5 w-3.5" />
                        {t.fecha_inicio} → {t.fecha_fin}
                        {t.prioridad ? <span className="ml-2">Prioridad: {t.prioridad}</span> : null}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(t)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => remove(t.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Temporada</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nombre</Label>
              <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej. Semana Santa 2026" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Desde</Label>
                <Input type="date" value={form.fecha_inicio} onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Hasta</Label>
                <Input type="date" value={form.fecha_fin} onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo de ajuste</Label>
                <Select value={form.tipo_ajuste} onValueChange={(v) => setForm({ ...form, tipo_ajuste: v as TipoAjuste })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="porcentaje">Porcentaje (+/-%)</SelectItem>
                    <SelectItem value="monto">Monto fijo (+/-$)</SelectItem>
                    <SelectItem value="absoluto">Precio absoluto ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Valor {form.tipo_ajuste === 'porcentaje' ? '(%)' : '($)'}</Label>
                <Input type="number" value={form.valor}
                  onChange={(e) => setForm({ ...form, valor: Number(e.target.value) })}
                  placeholder={form.tipo_ajuste === 'porcentaje' ? '20 o -15' : '200 o -100'} />
              </div>
            </div>

            <div className="rounded-md border p-3 text-sm bg-muted/30">
              Ejemplo: tarifa base de <b>{formatCurrency(1000)}</b> quedaría en{' '}
              <b>{formatCurrency(previewNumero)}</b> durante esta temporada.
            </div>

            <div className="space-y-1.5">
              <Label>Se aplica a</Label>
              <Select value={form.alcance} onValueChange={(v) => setForm({ ...form, alcance: v as AlcanceTemporada, tipo_habitacion_id: null, habitacion_id: null })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas las habitaciones</SelectItem>
                  <SelectItem value="tipo">Un tipo de habitación</SelectItem>
                  <SelectItem value="habitacion">Una habitación específica</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.alcance === 'tipo' && (
              <div className="space-y-1.5">
                <Label>Tipo de habitación</Label>
                <Select value={form.tipo_habitacion_id || ''} onValueChange={(v) => setForm({ ...form, tipo_habitacion_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                  <SelectContent>
                    {tipos.map((t) => <SelectItem key={t.id} value={t.id}>{t.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {form.alcance === 'habitacion' && (
              <div className="space-y-1.5">
                <Label>Habitación</Label>
                <Select value={form.habitacion_id || ''} onValueChange={(v) => setForm({ ...form, habitacion_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                  <SelectContent>
                    {habitaciones.map((h) => <SelectItem key={h.id} value={h.id}>Hab. {h.numero || h.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Prioridad</Label>
                <Input type="number" value={form.prioridad} onChange={(e) => setForm({ ...form, prioridad: Number(e.target.value) })} />
                <p className="text-xs text-muted-foreground">Si dos temporadas se traslapan gana la de mayor número.</p>
              </div>
              <div className="flex items-end">
                <div className="flex items-center justify-between rounded-md border p-3 w-full">
                  <Label className="text-sm">Activa</Label>
                  <Switch checked={form.activo} onCheckedChange={(v) => setForm({ ...form, activo: v })} />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}