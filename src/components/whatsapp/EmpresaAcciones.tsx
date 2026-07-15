import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Building2, Landmark, Copy, Send, Pencil, Plus, Trash2,
  MessageSquareText, Clock, MapPin, Mail, Phone, FileText,
} from 'lucide-react';

const sb = supabase as any;

interface Props {
  chat: any;
  hotelId: string | null;
}

interface BancoEmpresa {
  banco?: string;
  titular?: string;
  cuenta?: string;
  clabe?: string;
  swift?: string;
  metodo?: string;
  nota?: string;
}

interface Respuesta {
  id: string;
  titulo: string;
  texto: string;
}

const bancoKey = (h: string) => `wa_empresa_banco_${h}`;
const respuestasKey = (h: string) => `wa_empresa_respuestas_${h}`;

function formatBanco(b: BancoEmpresa, hotelNombre?: string) {
  const lines: string[] = [];
  lines.push(`💳 *Datos bancarios${hotelNombre ? ' – ' + hotelNombre : ''}*`);
  if (b.banco) lines.push(`Banco: ${b.banco}`);
  if (b.titular) lines.push(`Titular: ${b.titular}`);
  if (b.cuenta) lines.push(`Cuenta: ${b.cuenta}`);
  if (b.clabe) lines.push(`CLABE: ${b.clabe}`);
  if (b.swift) lines.push(`SWIFT/IBAN: ${b.swift}`);
  if (b.metodo) lines.push(`Método: ${b.metodo}`);
  if (b.nota) lines.push(`\n${b.nota}`);
  return lines.join('\n');
}

export function EmpresaAcciones({ chat, hotelId }: Props) {
  const { toast } = useToast();
  const [hotel, setHotel] = useState<any>(null);
  const [banco, setBanco] = useState<BancoEmpresa>({});
  const [respuestas, setRespuestas] = useState<Respuesta[]>([]);
  const [bancoOpen, setBancoOpen] = useState(false);
  const [bancoDraft, setBancoDraft] = useState<BancoEmpresa>({});
  const [respOpen, setRespOpen] = useState(false);
  const [respDraft, setRespDraft] = useState<Respuesta | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!hotelId) return;
    sb.from('hotels').select('*').eq('id', hotelId).single()
      .then(({ data }: any) => setHotel(data));
    try {
      const b = localStorage.getItem(bancoKey(hotelId));
      setBanco(b ? JSON.parse(b) : {});
      const r = localStorage.getItem(respuestasKey(hotelId));
      setRespuestas(r ? JSON.parse(r) : defaultRespuestas());
    } catch {
      setBanco({});
      setRespuestas(defaultRespuestas());
    }
  }, [hotelId]);

  const guardarBanco = () => {
    if (!hotelId) return;
    localStorage.setItem(bancoKey(hotelId), JSON.stringify(bancoDraft));
    setBanco(bancoDraft);
    setBancoOpen(false);
    toast({ title: 'Datos bancarios guardados' });
  };

  const guardarRespuestas = (list: Respuesta[]) => {
    if (!hotelId) return;
    localStorage.setItem(respuestasKey(hotelId), JSON.stringify(list));
    setRespuestas(list);
  };

  const copiar = (txt: string) => {
    navigator.clipboard.writeText(txt);
    toast({ title: 'Copiado' });
  };

  const enviar = async (texto: string) => {
    if (!chat?.id) {
      toast({ title: 'Selecciona un chat', variant: 'destructive' });
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('evolution-send', {
        body: { chat_id: chat.id, tipo: 'text', contenido: texto },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({ title: 'Mensaje enviado' });
    } catch (e: any) {
      toast({ title: 'Error al enviar', description: e.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const bancoTexto = useMemo(() => formatBanco(banco, hotel?.nombre), [banco, hotel?.nombre]);
  const hasBanco = !!(banco.banco || banco.cuenta || banco.clabe || banco.titular);

  const contactoTexto = useMemo(() => {
    if (!hotel) return '';
    const lines = [`📍 *${hotel.nombre}*`];
    if (hotel.direccion) lines.push(hotel.direccion);
    if (hotel.ciudad || hotel.estado) lines.push([hotel.ciudad, hotel.estado].filter(Boolean).join(', '));
    if (hotel.pais) lines.push(hotel.pais);
    if (hotel.telefono) lines.push(`Tel: ${hotel.telefono}`);
    if (hotel.email) lines.push(`Email: ${hotel.email}`);
    return lines.join('\n');
  }, [hotel]);

  const horariosTexto = useMemo(() => {
    if (!hotel) return '';
    return `🕒 *Horarios ${hotel.nombre ?? ''}*\nCheck-in: ${hotel.hora_checkin ?? '15:00'}\nCheck-out: ${hotel.hora_checkout ?? '12:00'}`;
  }, [hotel]);

  return (
    <>
      <Accordion type="multiple" defaultValue={['empresa']} className="w-full">
        <AccordionItem value="empresa">
          <AccordionTrigger className="text-sm py-2">
            <span className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-emerald-600" /> Acciones de empresa
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-3">
            {/* Datos bancarios de la empresa */}
            <div className="rounded-md border p-2 space-y-2 bg-muted/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold flex items-center gap-1">
                  <Landmark className="h-3.5 w-3.5" /> Datos bancarios
                </span>
                <Button size="sm" variant="ghost" className="h-6 px-2 text-xs"
                  onClick={() => { setBancoDraft(banco); setBancoOpen(true); }}>
                  <Pencil className="h-3 w-3 mr-1" />{hasBanco ? 'Editar' : 'Configurar'}
                </Button>
              </div>
              {hasBanco ? (
                <>
                  <pre className="text-[11px] whitespace-pre-wrap font-mono bg-background rounded p-2 border max-h-32 overflow-y-auto">
                    {bancoTexto}
                  </pre>
                  <div className="flex gap-1">
                    <Button size="sm" className="h-7 flex-1 text-xs" disabled={sending}
                      onClick={() => enviar(bancoTexto)}>
                      <Send className="h-3 w-3 mr-1" /> Enviar
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs"
                      onClick={() => copiar(bancoTexto)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  Configura los datos bancarios del hotel para enviarlos con un clic.
                </p>
              )}
            </div>

            {/* Info del hotel */}
            {hotel && (
              <div className="grid grid-cols-2 gap-1.5">
                <QuickSendBtn icon={MapPin} label="Ubicación" disabled={!contactoTexto || sending}
                  onSend={() => enviar(contactoTexto)} onCopy={() => copiar(contactoTexto)} />
                <QuickSendBtn icon={Clock} label="Horarios" disabled={sending}
                  onSend={() => enviar(horariosTexto)} onCopy={() => copiar(horariosTexto)} />
                {hotel.telefono && (
                  <QuickSendBtn icon={Phone} label="Teléfono" disabled={sending}
                    onSend={() => enviar(`📞 ${hotel.telefono}`)}
                    onCopy={() => copiar(hotel.telefono)} />
                )}
                {hotel.email && (
                  <QuickSendBtn icon={Mail} label="Email" disabled={sending}
                    onSend={() => enviar(`✉️ ${hotel.email}`)}
                    onCopy={() => copiar(hotel.email)} />
                )}
                {hotel.rfc && (
                  <QuickSendBtn icon={FileText} label="RFC" disabled={sending}
                    onSend={() => enviar(`RFC: ${hotel.rfc}\n${hotel.razon_social ?? ''}`.trim())}
                    onCopy={() => copiar(hotel.rfc)} />
                )}
              </div>
            )}

            {/* Respuestas rápidas */}
            <div className="rounded-md border p-2 space-y-2 bg-muted/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold flex items-center gap-1">
                  <MessageSquareText className="h-3.5 w-3.5" /> Respuestas rápidas
                </span>
                <Button size="sm" variant="ghost" className="h-6 px-2 text-xs"
                  onClick={() => { setRespDraft({ id: crypto.randomUUID(), titulo: '', texto: '' }); setRespOpen(true); }}>
                  <Plus className="h-3 w-3 mr-1" /> Nueva
                </Button>
              </div>
              {respuestas.length === 0 && (
                <p className="text-[11px] text-muted-foreground">Sin respuestas guardadas.</p>
              )}
              <div className="space-y-1">
                {respuestas.map((r) => (
                  <div key={r.id} className="group flex items-center gap-1 rounded border bg-background px-2 py-1">
                    <button
                      className="flex-1 text-left text-xs truncate hover:text-emerald-600"
                      title={r.texto}
                      onClick={() => enviar(r.texto)}
                    >
                      {r.titulo || r.texto.slice(0, 30)}
                    </button>
                    <button className="opacity-60 hover:opacity-100" onClick={() => copiar(r.texto)}>
                      <Copy className="h-3 w-3" />
                    </button>
                    <button className="opacity-60 hover:opacity-100"
                      onClick={() => { setRespDraft(r); setRespOpen(true); }}>
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button className="opacity-0 group-hover:opacity-100 text-destructive"
                      onClick={() => guardarRespuestas(respuestas.filter((x) => x.id !== r.id))}>
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Dialog: datos bancarios */}
      <Dialog open={bancoOpen} onOpenChange={setBancoOpen}>
        <DialogContent className="w-[95vw] max-w-lg">
          <DialogHeader>
            <DialogTitle>Datos bancarios de la empresa</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            <FieldInput label="Banco" value={bancoDraft.banco}
              onChange={(v) => setBancoDraft({ ...bancoDraft, banco: v })} />
            <FieldInput label="Titular" value={bancoDraft.titular}
              onChange={(v) => setBancoDraft({ ...bancoDraft, titular: v })} />
            <FieldInput label="Cuenta" value={bancoDraft.cuenta}
              onChange={(v) => setBancoDraft({ ...bancoDraft, cuenta: v })} />
            <FieldInput label="CLABE" value={bancoDraft.clabe}
              onChange={(v) => setBancoDraft({ ...bancoDraft, clabe: v })} />
            <FieldInput label="SWIFT / IBAN" value={bancoDraft.swift}
              onChange={(v) => setBancoDraft({ ...bancoDraft, swift: v })} />
            <FieldInput label="Método" value={bancoDraft.metodo}
              onChange={(v) => setBancoDraft({ ...bancoDraft, metodo: v })} />
            <div className="col-span-2">
              <Label className="text-xs">Nota adicional</Label>
              <Textarea rows={2} value={bancoDraft.nota ?? ''}
                onChange={(e) => setBancoDraft({ ...bancoDraft, nota: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBancoOpen(false)}>Cancelar</Button>
            <Button onClick={guardarBanco}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: respuesta rápida */}
      <Dialog open={respOpen} onOpenChange={setRespOpen}>
        <DialogContent className="w-[95vw] max-w-lg">
          <DialogHeader>
            <DialogTitle>Respuesta rápida</DialogTitle>
          </DialogHeader>
          {respDraft && (
            <div className="space-y-2">
              <FieldInput label="Título" value={respDraft.titulo}
                onChange={(v) => setRespDraft({ ...respDraft, titulo: v })} />
              <div>
                <Label className="text-xs">Mensaje</Label>
                <Textarea rows={5} value={respDraft.texto}
                  onChange={(e) => setRespDraft({ ...respDraft, texto: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRespOpen(false)}>Cancelar</Button>
            <Button onClick={() => {
              if (!respDraft || !respDraft.texto.trim()) return;
              const exists = respuestas.some((x) => x.id === respDraft.id);
              const next = exists
                ? respuestas.map((x) => x.id === respDraft.id ? respDraft : x)
                : [...respuestas, respDraft];
              guardarRespuestas(next);
              setRespOpen(false);
            }}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function FieldInput({ label, value, onChange }: { label: string; value?: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input className="h-9" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function QuickSendBtn({
  icon: Icon, label, onSend, onCopy, disabled,
}: { icon: any; label: string; onSend: () => void; onCopy: () => void; disabled?: boolean }) {
  return (
    <div className="flex items-stretch rounded border bg-background overflow-hidden">
      <button
        disabled={disabled}
        onClick={onSend}
        className="flex-1 flex items-center gap-1.5 px-2 py-1.5 text-xs hover:bg-emerald-500/10 disabled:opacity-40"
      >
        <Icon className="h-3.5 w-3.5 text-emerald-600" />
        <span className="truncate">{label}</span>
      </button>
      <button
        onClick={onCopy}
        className="px-2 border-l text-muted-foreground hover:text-foreground hover:bg-muted"
        title="Copiar"
      >
        <Copy className="h-3 w-3" />
      </button>
    </div>
  );
}

function defaultRespuestas(): Respuesta[] {
  return [
    { id: crypto.randomUUID(), titulo: 'Saludo', texto: '¡Hola! 👋 Gracias por escribirnos. ¿En qué podemos ayudarte?' },
    { id: crypto.randomUUID(), titulo: 'Disponibilidad', texto: 'Con gusto reviso disponibilidad. ¿Para qué fechas y cuántas personas?' },
    { id: crypto.randomUUID(), titulo: 'Confirmar reserva', texto: 'Tu reserva quedó confirmada ✅. Cualquier duda estamos a tus órdenes.' },
  ];
}