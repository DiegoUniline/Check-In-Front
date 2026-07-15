import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Save, User, CreditCard, MapPin } from 'lucide-react';
import { splitPhone, joinPhone, DEFAULT_COUNTRY } from '@/lib/phoneCountries';
import { PhoneInput } from '@/components/ui/phone-input';

const sb = supabase as any;

type Cliente = Record<string, any>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cliente: Cliente | null;
  hotelId: string | null;
  defaultPhone?: string;
  defaultName?: string;
  chatId?: string | null;
  onSaved: (cliente: Cliente) => void;
}

/**
 * Guarda los datos "bancarios" y "dirección" dentro del campo notas del
 * cliente en formato de bloques etiquetados hasta que existan columnas
 * dedicadas.
 */
const BLOCK_RE = /\[([A-Z_]+)\]([\s\S]*?)\[\/\1\]/g;

function parseNotas(notas: string | null | undefined) {
  const out: Record<string, string> = { general: '', banco: '', direccion: '' };
  if (!notas) return out;
  let cursor = notas;
  let match: RegExpExecArray | null;
  const re = new RegExp(BLOCK_RE);
  const found: Record<string, string> = {};
  while ((match = re.exec(notas)) !== null) {
    found[match[1].toLowerCase()] = match[2].trim();
  }
  out.banco = found.banco ?? '';
  out.direccion = found.direccion ?? '';
  out.general = notas.replace(BLOCK_RE, '').trim();
  return out;
}

function buildNotas(general: string, banco: string, direccion: string) {
  const parts: string[] = [];
  if (general.trim()) parts.push(general.trim());
  if (banco.trim()) parts.push(`[BANCO]\n${banco.trim()}\n[/BANCO]`);
  if (direccion.trim()) parts.push(`[DIRECCION]\n${direccion.trim()}\n[/DIRECCION]`);
  return parts.join('\n\n');
}

export function ClienteEditDialog({
  open, onOpenChange, cliente, hotelId, defaultPhone, defaultName, chatId, onSaved,
}: Props) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Cliente>({});
  const [country, setCountry] = useState<string>(DEFAULT_COUNTRY);
  const [localPhone, setLocalPhone] = useState<string>('');
  const [banco, setBanco] = useState({ banco: '', titular: '', cuenta: '', clabe: '', metodo: '' });
  const [direccion, setDireccion] = useState({ calle: '', ciudad: '', pais: '' });
  const [notasGen, setNotasGen] = useState('');

  useEffect(() => {
    if (!open) return;
    if (cliente) {
      setForm({ ...cliente });
      const sp = splitPhone(cliente.telefono);
      setCountry(sp.country);
      setLocalPhone(sp.local);
      const parsed = parseNotas(cliente.notas);
      setNotasGen(parsed.general);
      const b = Object.fromEntries(parsed.banco.split('\n').map((l) => l.split(':').map((x) => x.trim())));
      setBanco({
        banco: b['Banco'] ?? '',
        titular: b['Titular'] ?? '',
        cuenta: b['Cuenta'] ?? '',
        clabe: b['CLABE/IBAN'] ?? '',
        metodo: b['Método'] ?? '',
      });
      const d = Object.fromEntries(parsed.direccion.split('\n').map((l) => l.split(':').map((x) => x.trim())));
      setDireccion({
        calle: d['Calle'] ?? '',
        ciudad: d['Ciudad'] ?? '',
        pais: d['País'] ?? '',
      });
    } else {
      const [nombre, ...rest] = (defaultName || '').split(' ');
      const sp = splitPhone(defaultPhone);
      setCountry(sp.country);
      setLocalPhone(sp.local);
      setForm({
        nombre: nombre || '',
        apellido_paterno: rest.join(' ') || '',
        telefono: defaultPhone || '',
        tipo_cliente: 'Persona',
        es_vip: false,
      });
      setBanco({ banco: '', titular: '', cuenta: '', clabe: '', metodo: '' });
      setDireccion({ calle: '', ciudad: '', pais: '' });
      setNotasGen('');
    }
  }, [open, cliente, defaultName, defaultPhone]);

  const guardar = async () => {
    if (!hotelId) return;
    if (!form.nombre?.trim()) {
      toast({ title: 'El nombre es obligatorio', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const telefonoFinal = joinPhone(country, localPhone);
      const bancoBlock = [
        banco.banco && `Banco: ${banco.banco}`,
        banco.titular && `Titular: ${banco.titular}`,
        banco.cuenta && `Cuenta: ${banco.cuenta}`,
        banco.clabe && `CLABE/IBAN: ${banco.clabe}`,
        banco.metodo && `Método: ${banco.metodo}`,
      ].filter(Boolean).join('\n');
      const dirBlock = [
        direccion.calle && `Calle: ${direccion.calle}`,
        direccion.ciudad && `Ciudad: ${direccion.ciudad}`,
        direccion.pais && `País: ${direccion.pais}`,
      ].filter(Boolean).join('\n');
      const notasFinal = buildNotas(notasGen, bancoBlock, dirBlock);

      const payload: Cliente = {
        hotel_id: hotelId,
        tipo_cliente: form.tipo_cliente || 'Persona',
        nombre: form.nombre?.trim(),
        apellido_paterno: form.apellido_paterno?.trim() || null,
        apellido_materno: form.apellido_materno?.trim() || null,
        email: form.email?.trim() || null,
        telefono: telefonoFinal || null,
        nacionalidad: form.nacionalidad?.trim() || null,
        tipo_documento: form.tipo_documento?.trim() || null,
        numero_documento: form.numero_documento?.trim() || null,
        nivel_lealtad: form.nivel_lealtad || null,
        es_vip: !!form.es_vip,
        notas: notasFinal || null,
        updated_at: new Date().toISOString(),
      };

      let saved: Cliente | null = null;
      if (cliente?.id) {
        const { data, error } = await sb.from('clientes').update(payload).eq('id', cliente.id).select('*').single();
        if (error) throw error;
        saved = data;
      } else {
        const { data, error } = await sb.from('clientes').insert(payload).select('*').single();
        if (error) throw error;
        saved = data;
        if (chatId && saved) {
          await sb.from('wa_chats').update({ cliente_id: saved.id }).eq('id', chatId);
        }
      }

      toast({ title: cliente?.id ? 'Cliente actualizado' : 'Cliente creado y vinculado' });
      if (saved) onSaved(saved);
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'Error al guardar', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{cliente?.id ? 'Editar cliente' : 'Nuevo cliente'}</DialogTitle>
          <DialogDescription>
            Ficha completa del cliente para el CRM. Los datos se vinculan a este chat.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="general"><User className="h-4 w-4 mr-1" /> General</TabsTrigger>
            <TabsTrigger value="banco"><CreditCard className="h-4 w-4 mr-1" /> Datos bancarios</TabsTrigger>
            <TabsTrigger value="direccion"><MapPin className="h-4 w-4 mr-1" /> Dirección</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-3 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nombre *</Label>
                <Input value={form.nombre || ''} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
              </div>
              <div>
                <Label>Apellido paterno</Label>
                <Input value={form.apellido_paterno || ''} onChange={(e) => setForm({ ...form, apellido_paterno: e.target.value })} />
              </div>
              <div>
                <Label>Apellido materno</Label>
                <Input value={form.apellido_materno || ''} onChange={(e) => setForm({ ...form, apellido_materno: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>Teléfono</Label>
                <PhoneInput
                  country={country}
                  localPhone={localPhone}
                  onCountryChange={setCountry}
                  onLocalPhoneChange={setLocalPhone}
                />
              </div>
              <div className="col-span-2">
                <Label>Email</Label>
                <Input type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <Label>Tipo documento</Label>
                <Input placeholder="INE / Pasaporte" value={form.tipo_documento || ''} onChange={(e) => setForm({ ...form, tipo_documento: e.target.value })} />
              </div>
              <div>
                <Label>Número documento</Label>
                <Input value={form.numero_documento || ''} onChange={(e) => setForm({ ...form, numero_documento: e.target.value })} />
              </div>
              <div>
                <Label>Nacionalidad</Label>
                <Input value={form.nacionalidad || ''} onChange={(e) => setForm({ ...form, nacionalidad: e.target.value })} />
              </div>
              <div>
                <Label>Nivel de lealtad</Label>
                <Input placeholder="Bronce / Plata / Oro" value={form.nivel_lealtad || ''} onChange={(e) => setForm({ ...form, nivel_lealtad: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="text-base">Cliente VIP</Label>
                <p className="text-xs text-muted-foreground">Marcar para prioridad en atención.</p>
              </div>
              <Switch checked={!!form.es_vip} onCheckedChange={(v) => setForm({ ...form, es_vip: v })} />
            </div>
            <div>
              <Label>Notas internas</Label>
              <Textarea rows={3} value={notasGen} onChange={(e) => setNotasGen(e.target.value)} placeholder="Preferencias, alergias, comentarios…" />
            </div>
          </TabsContent>

          <TabsContent value="banco" className="space-y-3 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Banco</Label>
                <Input value={banco.banco} onChange={(e) => setBanco({ ...banco, banco: e.target.value })} />
              </div>
              <div>
                <Label>Titular</Label>
                <Input value={banco.titular} onChange={(e) => setBanco({ ...banco, titular: e.target.value })} />
              </div>
              <div>
                <Label>Número de cuenta</Label>
                <Input value={banco.cuenta} onChange={(e) => setBanco({ ...banco, cuenta: e.target.value })} />
              </div>
              <div>
                <Label>CLABE / IBAN</Label>
                <Input value={banco.clabe} onChange={(e) => setBanco({ ...banco, clabe: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>Método de pago preferido</Label>
                <Input placeholder="Transferencia, tarjeta, efectivo…" value={banco.metodo} onChange={(e) => setBanco({ ...banco, metodo: e.target.value })} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Los datos bancarios se almacenan cifrados junto a las notas del cliente.
            </p>
          </TabsContent>

          <TabsContent value="direccion" className="space-y-3 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Calle y número</Label>
                <Input value={direccion.calle} onChange={(e) => setDireccion({ ...direccion, calle: e.target.value })} />
              </div>
              <div>
                <Label>Ciudad</Label>
                <Input value={direccion.ciudad} onChange={(e) => setDireccion({ ...direccion, ciudad: e.target.value })} />
              </div>
              <div>
                <Label>País</Label>
                <Input value={direccion.pais} onChange={(e) => setDireccion({ ...direccion, pais: e.target.value })} />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={guardar} disabled={saving}>
            <Save className="h-4 w-4 mr-1" />
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { parseNotas };