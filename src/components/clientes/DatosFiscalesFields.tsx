import { useRef, useState } from 'react';
import { FileText, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { leerCsf, REGIMENES_FISCALES, USOS_CFDI } from '@/lib/csf';

export type DatosFiscales = {
  rfc: string;
  razon_social: string;
  regimen_fiscal: string;
  codigo_postal_fiscal: string;
  uso_cfdi: string;
  email_facturacion: string;
  domicilio_fiscal: string;
};

export const datosFiscalesVacios: DatosFiscales = {
  rfc: '',
  razon_social: '',
  regimen_fiscal: '',
  codigo_postal_fiscal: '',
  uso_cfdi: 'G03',
  email_facturacion: '',
  domicilio_fiscal: '',
};

export const datosFiscalesDe = (c: any): DatosFiscales => ({
  rfc: c?.rfc || '',
  razon_social: c?.razon_social || '',
  regimen_fiscal: c?.regimen_fiscal || '',
  codigo_postal_fiscal: c?.codigo_postal_fiscal || '',
  uso_cfdi: c?.uso_cfdi || 'G03',
  email_facturacion: c?.email_facturacion || '',
  domicilio_fiscal: c?.domicilio_fiscal || '',
});

export const RFC_RE = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;

export function validarDatosFiscales(d: DatosFiscales): string | null {
  const rfc = d.rfc.trim().toUpperCase();
  if (!rfc && !d.razon_social.trim()) return null;
  if (rfc && !RFC_RE.test(rfc)) return 'El RFC no es válido';
  if (d.codigo_postal_fiscal && !/^\d{5}$/.test(d.codigo_postal_fiscal.trim())) return 'El código postal fiscal debe tener 5 dígitos';
  if (d.email_facturacion && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email_facturacion.trim())) return 'El correo de facturación no es válido';
  return null;
}

export const regimenNombre = (clave?: string | null) => {
  const r = REGIMENES_FISCALES.find((x) => x.clave === clave);
  return r ? `${r.clave} · ${r.nombre}` : clave || '';
};

type Props = {
  value: DatosFiscales;
  onChange: (value: DatosFiscales) => void;
  /** Archivo CSF elegido; se sube al guardar el cliente. */
  onCsfFile?: (file: File | null) => void;
  csfPath?: string | null;
  emailSugerido?: string;
};

export function DatosFiscalesFields({ value, onChange, onCsfFile, csfPath, emailSugerido }: Props) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [leyendo, setLeyendo] = useState(false);
  const [archivo, setArchivo] = useState<string>('');
  const set = (patch: Partial<DatosFiscales>) => onChange({ ...value, ...patch });

  const onFile = async (file?: File) => {
    if (!file) return;
    setLeyendo(true);
    try {
      const datos = await leerCsf(file);
      onChange({
        ...value,
        rfc: datos.rfc || value.rfc,
        razon_social: datos.razon_social || value.razon_social,
        regimen_fiscal: datos.regimen_fiscal || value.regimen_fiscal,
        codigo_postal_fiscal: datos.codigo_postal_fiscal || value.codigo_postal_fiscal,
        domicilio_fiscal: datos.domicilio_fiscal || value.domicilio_fiscal,
        email_facturacion: value.email_facturacion || datos.email || emailSugerido || '',
      });
      setArchivo(file.name);
      onCsfFile?.(file);
      toast({ title: 'Constancia leída', description: 'Revisa los datos antes de guardar.' });
    } catch (error: any) {
      toast({ title: 'No se pudo leer la constancia', description: error.message, variant: 'destructive' });
    } finally {
      setLeyendo(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const verCsf = async () => {
    if (!csfPath) return;
    try {
      window.open(await api.urlCsfCliente(csfPath), '_blank', 'noopener');
    } catch (error: any) {
      toast({ title: 'No se pudo abrir la constancia', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">Datos fiscales</p>
          <p className="text-[11px] text-muted-foreground">Sube la Constancia de Situación Fiscal (PDF) y se llenan solos, o captúralos a mano.</p>
        </div>
        <div className="flex items-center gap-1.5">
          {csfPath && (
            <Button type="button" size="sm" variant="ghost" onClick={() => void verCsf()}>
              <FileText className="mr-1.5 h-3.5 w-3.5" />Ver CSF
            </Button>
          )}
          <Button type="button" size="sm" variant="outline" disabled={leyendo} onClick={() => inputRef.current?.click()}>
            {leyendo ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-1.5 h-3.5 w-3.5" />}
            {leyendo ? 'Leyendo…' : 'Subir CSF'}
          </Button>
          <input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
        </div>
      </div>
      {archivo && <p className="text-[11px] text-emerald-700">✓ {archivo} · se guardará con el cliente</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>RFC</Label>
          <Input value={value.rfc} maxLength={13} onChange={(e) => set({ rfc: e.target.value.toUpperCase().replace(/\s/g, '') })} placeholder="XAXX010101000" />
        </div>
        <div className="space-y-1.5">
          <Label>Código postal fiscal</Label>
          <Input value={value.codigo_postal_fiscal} maxLength={5} inputMode="numeric" onChange={(e) => set({ codigo_postal_fiscal: e.target.value.replace(/\D/g, '') })} placeholder="00000" />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Nombre o razón social</Label>
          <Input value={value.razon_social} onChange={(e) => set({ razon_social: e.target.value.toUpperCase() })} placeholder="Tal como aparece en la constancia, sin régimen de capital" />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Régimen fiscal</Label>
          <Select value={value.regimen_fiscal || 'none'} onValueChange={(v) => set({ regimen_fiscal: v === 'none' ? '' : v })}>
            <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin especificar</SelectItem>
              {REGIMENES_FISCALES.map((r) => <SelectItem key={r.clave} value={r.clave}>{r.clave} · {r.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Uso de CFDI</Label>
          <Select value={value.uso_cfdi || 'G03'} onValueChange={(v) => set({ uso_cfdi: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {USOS_CFDI.map((u) => <SelectItem key={u.clave} value={u.clave}>{u.clave} · {u.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Correo para la factura</Label>
          <Input type="email" value={value.email_facturacion} onChange={(e) => set({ email_facturacion: e.target.value })} placeholder={emailSugerido || 'facturas@empresa.com'} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Domicilio fiscal</Label>
          <Input value={value.domicilio_fiscal} onChange={(e) => set({ domicilio_fiscal: e.target.value })} placeholder="Calle, número, colonia, municipio, estado" />
        </div>
      </div>
    </div>
  );
}
