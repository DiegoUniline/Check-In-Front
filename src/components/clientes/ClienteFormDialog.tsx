import { useEffect, useState } from 'react';
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, cliente?.id]);

  const guardar = async () => {
    if (!form.nombre.trim() || !form.apellido_paterno.trim()) {
      toast({ title: 'Faltan datos', description: 'Nombre y apellido paterno son requeridos', variant: 'destructive' });
      return;
    }
    const telefono = joinPhone(phoneCountry, phoneLocal);
    if (requireTelefono && !phoneLocal.trim()) {
      toast({ title: 'Faltan datos', description: 'El teléfono es requerido', variant: 'destructive' });
      return;
    }
    const errorFiscal = validarDatosFiscales(fiscal);
    if (errorFiscal) {
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

  const nombre = [cliente?.nombre, cliente?.apellido_paterno].filter(Boolean).join(' ');

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!saving) onOpenChange(v); }}>
      <DialogContent
        className="max-h-[88vh] max-w-2xl overflow-y-auto"
        // Sólo se cierra con Cancelar o la X.
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{editing ? `Editar ${nombre || 'cliente'}` : 'Nuevo cliente'}</DialogTitle>
          <DialogDescription>{editing ? 'Actualiza los datos del huésped o empresa.' : 'Captura los datos del huésped; los fiscales y el descuento son opcionales.'}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-1 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Tipo de cliente</Label>
            <Select value={form.tipo_cliente} onValueChange={(v) => setForm({ ...form, tipo_cliente: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="Persona">Persona</SelectItem><SelectItem value="Empresa">Empresa</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div><Label className="font-medium">Cliente VIP</Label><p className="text-[11px] text-muted-foreground">Destácalo en reservas y recepción.</p></div>
            <Switch checked={Boolean(form.es_vip)} onCheckedChange={(v) => setForm({ ...form, es_vip: v })} />
          </div>

          <div className="space-y-1.5"><Label>Nombre *</Label><Input autoFocus value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Nombre" /></div>
          <div className="space-y-1.5"><Label>Apellido paterno *</Label><Input value={form.apellido_paterno} onChange={(e) => setForm({ ...form, apellido_paterno: e.target.value })} placeholder="Apellido paterno" /></div>
          <div className="space-y-1.5"><Label>Apellido materno</Label><Input value={form.apellido_materno} onChange={(e) => setForm({ ...form, apellido_materno: e.target.value })} placeholder="Apellido materno" /></div>
          <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="correo@ejemplo.com" /></div>

          <div className="space-y-1.5 sm:col-span-2"><Label>Teléfono{requireTelefono ? ' *' : ''}</Label><PhoneInput country={phoneCountry} localPhone={phoneLocal} onCountryChange={setPhoneCountry} onLocalPhoneChange={setPhoneLocal} /></div>

          <div className="space-y-1.5">
            <Label>Tipo de documento</Label>
            <Select value={form.tipo_documento} onValueChange={(v) => setForm({ ...form, tipo_documento: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="INE">INE</SelectItem><SelectItem value="Pasaporte">Pasaporte</SelectItem><SelectItem value="Licencia">Licencia</SelectItem><SelectItem value="Otro">Otro</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Número de documento</Label><Input value={form.numero_documento} onChange={(e) => setForm({ ...form, numero_documento: e.target.value })} placeholder="Identificación" /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label>Nacionalidad</Label><Input value={form.nacionalidad} onChange={(e) => setForm({ ...form, nacionalidad: e.target.value })} placeholder="Mexicana" /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label>Notas / preferencias</Label><Textarea className="min-h-20" value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} placeholder="Alergias, preferencias, solicitudes especiales..." /></div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Descuento del cliente</Label>
            <Select value={form.descuento_id || 'none'} onValueChange={(v) => setForm({ ...form, descuento_id: v === 'none' ? '' : v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin descuento</SelectItem>
                {descuentos.filter((d) => d.activo || d.id === form.descuento_id).map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.nombre} · {d.tipo === 'Porcentaje' ? `${Number(d.valor)}%` : formatCurrency(Number(d.valor))}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">Se aplica al elegir a este cliente en una reservación. Se administran en Catálogos › Descuentos.</p>
          </div>
          <div className="sm:col-span-2">
            <DatosFiscalesFields value={fiscal} onChange={setFiscal} onCsfFile={setCsfFile} csfPath={cliente?.csf_path} emailSugerido={form.email} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={() => void guardar()} disabled={saving}>{saving ? 'Guardando...' : (editing ? 'Guardar cambios' : 'Crear cliente')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
