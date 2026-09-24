import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PhoneInput } from '@/components/ui/phone-input';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/currency';
import { splitPhone, joinPhone, DEFAULT_COUNTRY } from '@/lib/phoneCountries';
import { DatosFiscalesFields, datosFiscalesDe, datosFiscalesVacios, validarDatosFiscales, type DatosFiscales } from './DatosFiscalesFields';

const clienteInicial = {
  tipo_cliente: 'Persona',
  nombre: '',
  apellido_paterno: '',
  apellido_materno: '',
  email: '',
  tipo_documento: 'INE',
  numero_documento: '',
  nacionalidad: 'Mexicana',
  es_vip: false,
  notas: '',
  descuento_id: '',
};

const isVip = (v: unknown) => v === true || v === 1 || v === '1' || v === 'true';
// Los registros no VIP a veces traen un "0" pegado al final del apellido.
const limpiarApellido = (v: unknown, vip: boolean) => {
  if (vip) return typeof v === 'string' ? v : '';
  if (v === 0 || typeof v !== 'string') return '';
  return v.replace(/0[\s\u200B\uFEFF]*$/u, '').trim();
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Cliente a editar; vacío para alta. */
  cliente?: any | null;
  /** Datos iniciales para un alta (por ejemplo lo que se escribió al buscar). */
  inicial?: Partial<typeof clienteInicial> & { telefono?: string };
  requireTelefono?: boolean;
  onSaved?: (cliente: any) => void;
};

export function ClienteFormDialog({ open, onOpenChange, cliente, inicial, requireTelefono = false, onSaved }: Props) {
  const { toast } = useToast();
  const [form, setForm] = useState(clienteInicial);
  const [fiscal, setFiscal] = useState<DatosFiscales>(datosFiscalesVacios);
  const [csfFile, setCsfFile] = useState<File | null>(null);
  const [phoneCountry, setPhoneCountry] = useState(DEFAULT_COUNTRY);
  const [phoneLocal, setPhoneLocal] = useState('');
  const [descuentos, setDescuentos] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('general');
  const [mostrarNuevoDesc, setMostrarNuevoDesc] = useState(false);
  const [creandoDesc, setCreandoDesc] = useState(false);
  const [nuevoDesc, setNuevoDesc] = useState<{ nombre: string; tipo: 'Porcentaje' | 'Monto'; valor: string }>({ nombre: '', tipo: 'Porcentaje', valor: '' });
  const editing = Boolean(cliente?.id);

  useEffect(() => {
    if (!open) return;
    api.getDescuentos().then(setDescuentos).catch(() => setDescuentos([]));
    const vip = isVip(cliente?.es_vip);
    const tel = splitPhone(cliente?.telefono || inicial?.telefono || '');
    setPhoneCountry(tel.country);
    setPhoneLocal(tel.local);
    setForm(cliente ? {
      tipo_cliente: cliente.tipo_cliente || 'Persona',
      nombre: cliente.nombre || '',
      apellido_paterno: limpiarApellido(cliente.apellido_paterno, vip),
      apellido_materno: limpiarApellido(cliente.apellido_materno, vip),
      email: cliente.email || '',
      tipo_documento: cliente.tipo_documento || 'INE',
      numero_documento: cliente.numero_documento || '',
      nacionalidad: cliente.nacionalidad || 'Mexicana',
      es_vip: vip,
      notas: cliente.notas || '',
      descuento_id: cliente.descuento_id || '',
    } : { ...clienteInicial, ...(inicial || {}) });
    setFiscal(cliente ? datosFiscalesDe(cliente) : datosFiscalesVacios);
    setCsfFile(null);
    setTab('general');
    setMostrarNuevoDesc(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, cliente?.id]);

  const guardar = async () => {
    if (!form.nombre.trim() || !form.apellido_paterno.trim()) {
      setTab('general');
      toast({ title: 'Faltan datos', description: 'Nombre y apellido paterno son requeridos', variant: 'destructive' });
      return;
    }
    const telefono = joinPhone(phoneCountry, phoneLocal);
    if (requireTelefono && !phoneLocal.trim()) {
      setTab('general');
      toast({ title: 'Faltan datos', description: 'El teléfono es requerido', variant: 'destructive' });
      return;
    }
    const errorFiscal = validarDatosFiscales(fiscal);
    if (errorFiscal) {
      setTab('fiscal');
      toast({ title: 'Datos fiscales', description: errorFiscal, variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const { descuento_id: _descuentoId, ...rest } = form;
      const tieneFiscal = Boolean(fiscal.rfc.trim() || fiscal.razon_social.trim());
      const original = (cliente || {}) as Record<string, unknown>;
      // Sólo se envían columnas con valor o que ya existen en el registro,
      // así el alta no falla si todavía no se corre el SQL de datos fiscales.
      const extra = Object.fromEntries(
        Object.entries({ ...fiscal, uso_cfdi: tieneFiscal ? fiscal.uso_cfdi : '', descuento_id: form.descuento_id })
          .map(([k, v]) => [k, String(v || '').trim() || null] as const)
          .filter(([k, v]) => v !== null || k in original),
      );
      const payload = {
        ...rest,
        nombre: form.nombre.trim(),
        apellido_paterno: limpiarApellido(form.apellido_paterno, Boolean(form.es_vip)),
        apellido_materno: limpiarApellido(form.apellido_materno, Boolean(form.es_vip)),
        email: form.email.trim() || null,
        telefono: telefono || null,
        ...extra,
      };
      let guardado = editing ? await api.updateCliente(cliente.id, payload) : await api.createCliente(payload);
      if (csfFile && guardado?.id) {
        try {
          const csf_path = await api.subirCsfCliente(guardado.id, csfFile);
          guardado = { ...guardado, csf_path };
        } catch (err: any) {
          toast({ title: 'Se guardó el cliente, pero no la constancia', description: err.message, variant: 'destructive' });
        }
      }
      toast({ title: editing ? 'Cliente actualizado' : 'Cliente creado' });
      onSaved?.(guardado);
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: 'No se pudo guardar', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const crearDescuento = async () => {
    const valor = Number(nuevoDesc.valor);
    if (!nuevoDesc.nombre.trim()) return toast({ title: 'Escribe el nombre del descuento', variant: 'destructive' });
    if (!Number.isFinite(valor) || valor <= 0) return toast({ title: 'El valor debe ser mayor a 0', variant: 'destructive' });
    if (nuevoDesc.tipo === 'Porcentaje' && valor > 100) return toast({ title: 'El porcentaje no puede superar 100', variant: 'destructive' });
    setCreandoDesc(true);
    try {
      const d = await api.createDescuento({ nombre: nuevoDesc.nombre.trim(), tipo: nuevoDesc.tipo, valor });
      setDescuentos((prev) => [...prev, d].sort((x, y) => String(x.nombre).localeCompare(String(y.nombre))));
      setForm((f) => ({ ...f, descuento_id: d.id }));
      setNuevoDesc({ nombre: '', tipo: 'Porcentaje', valor: '' });
      setMostrarNuevoDesc(false);
      toast({ title: 'Descuento creado y asignado', description: d.nombre });
    } catch (error: any) {
      const dup = /duplicate|unique/i.test(error.message || '');
      toast({ title: 'No se pudo crear el descuento', description: dup ? 'Ya existe uno con ese nombre' : error.message, variant: 'destructive' });
    } finally {
      setCreandoDesc(false);
    }
  };

  const nombre = [cliente?.nombre, cliente?.apellido_paterno].filter(Boolean).join(' ');
  const tieneFiscales = Boolean(fiscal.rfc || fiscal.razon_social);
  const descuentoSel = descuentos.find((d) => d.id === form.descuento_id);
  const fmtDesc = (d: any) => (d.tipo === 'Porcentaje' ? `${Number(d.valor)}%` : formatCurrency(Number(d.valor)));

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!saving) onOpenChange(v); }}>
      <DialogContent
        className="max-h-[90vh] w-[calc(100%-1rem)] max-w-5xl overflow-y-auto"
        // Sólo se cierra con Cancelar o la X.
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{editing ? `Editar ${nombre || 'cliente'}` : 'Nuevo cliente'}</DialogTitle>
          <DialogDescription>{editing ? 'Actualiza los datos del huésped o empresa.' : 'Captura los datos del huésped; los fiscales y el descuento son opcionales.'}</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="h-8">
            <TabsTrigger value="general" className="h-7 text-xs">Datos generales</TabsTrigger>
            <TabsTrigger value="descuento" className="h-7 gap-1.5 text-xs">Descuento{descuentoSel && <span className="rounded bg-primary/10 px-1 text-[10px] text-primary">{fmtDesc(descuentoSel)}</span>}</TabsTrigger>
            <TabsTrigger value="fiscal" className="h-7 gap-1.5 text-xs">Datos fiscales{tieneFiscales && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}</TabsTrigger>
            <TabsTrigger value="notas" className="h-7 text-xs">Notas</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="mt-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label>Tipo de cliente</Label>
                <Select value={form.tipo_cliente} onValueChange={(v) => setForm({ ...form, tipo_cliente: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Persona">Persona</SelectItem><SelectItem value="Empresa">Empresa</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Nombre *</Label><Input autoFocus value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Nombre" /></div>
              <div className="space-y-1.5"><Label>Apellido paterno *</Label><Input value={form.apellido_paterno} onChange={(e) => setForm({ ...form, apellido_paterno: e.target.value })} placeholder="Apellido paterno" /></div>
              <div className="space-y-1.5"><Label>Apellido materno</Label><Input value={form.apellido_materno} onChange={(e) => setForm({ ...form, apellido_materno: e.target.value })} placeholder="Apellido materno" /></div>

              <div className="space-y-1.5 sm:col-span-2"><Label>Teléfono{requireTelefono ? ' *' : ''}</Label><PhoneInput country={phoneCountry} localPhone={phoneLocal} onCountryChange={setPhoneCountry} onLocalPhoneChange={setPhoneLocal} /></div>
              <div className="space-y-1.5 sm:col-span-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="correo@ejemplo.com" /></div>

              <div className="space-y-1.5">
                <Label>Tipo de documento</Label>
                <Select value={form.tipo_documento} onValueChange={(v) => setForm({ ...form, tipo_documento: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="INE">INE</SelectItem><SelectItem value="Pasaporte">Pasaporte</SelectItem><SelectItem value="Licencia">Licencia</SelectItem><SelectItem value="Otro">Otro</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Número de documento</Label><Input value={form.numero_documento} onChange={(e) => setForm({ ...form, numero_documento: e.target.value })} placeholder="Identificación" /></div>
              <div className="space-y-1.5"><Label>Nacionalidad</Label><Input value={form.nacionalidad} onChange={(e) => setForm({ ...form, nacionalidad: e.target.value })} placeholder="Mexicana" /></div>
              <label className="flex cursor-pointer items-center justify-between gap-2 self-end rounded-md border px-3 py-2">
                <span><span className="block text-sm font-medium">Cliente VIP</span><span className="block text-[11px] text-muted-foreground">Se destaca en recepción.</span></span>
                <Switch checked={Boolean(form.es_vip)} onCheckedChange={(v) => setForm({ ...form, es_vip: v })} />
              </label>
            </div>
          </TabsContent>

          <TabsContent value="descuento" className="mt-3">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="space-y-1.5">
                <Label>Descuento del cliente</Label>
                <Select value={form.descuento_id || 'none'} onValueChange={(v) => setForm({ ...form, descuento_id: v === 'none' ? '' : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin descuento</SelectItem>
                    {descuentos.filter((d) => d.activo || d.id === form.descuento_id).map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.nombre} · {fmtDesc(d)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">Se aplica solo al elegir a este cliente en una reservación.</p>
                {!mostrarNuevoDesc && (
                  <Button type="button" variant="outline" size="sm" className="mt-1" onClick={() => setMostrarNuevoDesc(true)}>
                    <Plus className="mr-1.5 h-3.5 w-3.5" />Crear tipo de descuento
                  </Button>
                )}
              </div>
              {mostrarNuevoDesc && (
                <div className="space-y-3 rounded-md border bg-muted/20 p-3">
                  <p className="text-sm font-semibold">Nuevo tipo de descuento</p>
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_120px_100px]">
                    <Input autoFocus value={nuevoDesc.nombre} onChange={(e) => setNuevoDesc({ ...nuevoDesc, nombre: e.target.value })} placeholder="Corporativo, Convenio…" />
                    <Select value={nuevoDesc.tipo} onValueChange={(v) => setNuevoDesc({ ...nuevoDesc, tipo: v as 'Porcentaje' | 'Monto' })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="Porcentaje">Porcentaje</SelectItem><SelectItem value="Monto">Monto fijo</SelectItem></SelectContent>
                    </Select>
                    <Input type="number" min={0} value={nuevoDesc.valor} onFocus={(e) => e.currentTarget.select()} onChange={(e) => setNuevoDesc({ ...nuevoDesc, valor: e.target.value })} placeholder={nuevoDesc.tipo === 'Porcentaje' ? '%' : '$'} />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="ghost" size="sm" disabled={creandoDesc} onClick={() => setMostrarNuevoDesc(false)}>Cancelar</Button>
                    <Button type="button" size="sm" disabled={creandoDesc} onClick={() => void crearDescuento()}>{creandoDesc ? 'Creando…' : 'Crear y asignar'}</Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="fiscal" className="mt-3">
            <DatosFiscalesFields value={fiscal} onChange={setFiscal} onCsfFile={setCsfFile} csfPath={cliente?.csf_path} emailSugerido={form.email} />
          </TabsContent>

          <TabsContent value="notas" className="mt-3">
            <Label>Notas / preferencias</Label>
            <Textarea className="mt-1.5 min-h-32" value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} placeholder="Alergias, preferencias, solicitudes especiales..." />
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={() => void guardar()} disabled={saving}>{saving ? 'Guardando...' : (editing ? 'Guardar cambios' : 'Crear cliente')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
