import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import {
  UserPlus, UserCog, CalendarPlus, Copy, ExternalLink, Star,
  StickyNote, CreditCard, MapPin, BookUser, Tag, Plus, Trash2,
  Phone, Mail, Building2, IdCard,
} from 'lucide-react';
import { ClienteEditDialog, parseNotas } from './ClienteEditDialog';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const sb = supabase as any;

interface Props {
  chat: any;
  cliente: any;
  onClienteChange: () => void;
  onChatChange: () => void;
}

export function CrmPanel({ chat, cliente, onClienteChange, onChatChange }: Props) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  const [notas, setNotas] = useState<any[]>([]);
  const [nuevaNota, setNuevaNota] = useState('');
  const [reservas, setReservas] = useState<any[]>([]);
  const [nuevaEtiqueta, setNuevaEtiqueta] = useState('');

  useEffect(() => {
    if (!chat?.id) return;
    sb.from('wa_notas').select('*').eq('chat_id', chat.id).order('created_at', { ascending: false })
      .then(({ data }: any) => setNotas(data ?? []));
  }, [chat?.id]);

  useEffect(() => {
    if (!cliente?.id) { setReservas([]); return; }
    sb.from('reservas')
      .select('id, numero_reserva, fecha_checkin, fecha_checkout, estado')
      .eq('cliente_id', cliente.id)
      .order('fecha_checkin', { ascending: false })
      .limit(10)
      .then(({ data }: any) => setReservas(data ?? []));
  }, [cliente?.id]);

  const parsed = parseNotas(cliente?.notas);

  const copiar = (txt: string) => {
    navigator.clipboard.writeText(txt);
    toast({ title: 'Copiado', description: txt });
  };

  const toggleVip = async () => {
    if (!cliente?.id) return;
    await sb.from('clientes').update({ es_vip: !cliente.es_vip }).eq('id', cliente.id);
    onClienteChange();
    toast({ title: !cliente.es_vip ? 'Marcado como VIP' : 'VIP removido' });
  };

  const abrirWA = () => {
    if (!chat?.phone) return;
    window.open(`https://wa.me/${chat.phone}`, '_blank');
  };

  const nuevaReserva = () => {
    const params = new URLSearchParams();
    if (cliente?.id) params.set('cliente_id', cliente.id);
    if (chat?.phone) params.set('telefono', chat.phone);
    navigate(`/reservas/nueva?${params.toString()}`);
  };

  const agregarNota = async () => {
    if (!nuevaNota.trim() || !chat?.id) return;
    const { error } = await sb.from('wa_notas').insert({
      chat_id: chat.id,
      hotel_id: chat.hotel_id,
      nota: nuevaNota.trim(),
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    setNuevaNota('');
    const { data } = await sb.from('wa_notas').select('*').eq('chat_id', chat.id).order('created_at', { ascending: false });
    setNotas(data ?? []);
  };

  const eliminarNota = async (id: string) => {
    await sb.from('wa_notas').delete().eq('id', id);
    setNotas((n) => n.filter((x) => x.id !== id));
  };

  const agregarEtiqueta = async () => {
    const et = nuevaEtiqueta.trim();
    if (!et || !chat?.id) return;
    const current: string[] = Array.isArray(chat.etiquetas) ? chat.etiquetas : [];
    if (current.includes(et)) return;
    await sb.from('wa_chats').update({ etiquetas: [...current, et] }).eq('id', chat.id);
    setNuevaEtiqueta('');
    onChatChange();
  };

  const quitarEtiqueta = async (et: string) => {
    if (!chat?.id) return;
    const current: string[] = Array.isArray(chat.etiquetas) ? chat.etiquetas : [];
    await sb.from('wa_chats').update({ etiquetas: current.filter((x) => x !== et) }).eq('id', chat.id);
    onChatChange();
  };

  const nombreCompleto = cliente
    ? [cliente.nombre, cliente.apellido_paterno, cliente.apellido_materno].filter(Boolean).join(' ')
    : (chat?.nombre || chat?.phone);

  return (
    <div className="p-4 space-y-4 overflow-y-auto">
      {/* Cabecera */}
      <div className="flex flex-col items-center text-center">
        <div className="relative">
          <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-2xl font-bold text-emerald-600 mb-2">
            {(nombreCompleto || '?').slice(0, 1).toUpperCase()}
          </div>
          {cliente?.es_vip && (
            <Star className="absolute -top-1 -right-1 h-5 w-5 text-yellow-500 fill-yellow-400" />
          )}
        </div>
        <div className="font-semibold text-base">{nombreCompleto}</div>
        <button
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          onClick={() => copiar(chat.phone)}
        >
          <Phone className="h-3 w-3" />
          {chat.phone}
        </button>
        {cliente?.email && (
          <button
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            onClick={() => copiar(cliente.email)}
          >
            <Mail className="h-3 w-3" />
            {cliente.email}
          </button>
        )}
        <div className="flex gap-1 mt-2 flex-wrap justify-center">
          <Badge variant={chat.estado_bot === 'bot' ? 'default' : 'secondary'} className="text-[10px]">
            {chat.estado_bot === 'bot' ? '🤖 IA' : '👤 Humano'}
          </Badge>
          {cliente?.nivel_lealtad && <Badge variant="outline" className="text-[10px]">{cliente.nivel_lealtad}</Badge>}
          {cliente?.tipo_cliente && <Badge variant="outline" className="text-[10px]">{cliente.tipo_cliente}</Badge>}
        </div>
      </div>

      {/* Acciones rápidas */}
      <div className="grid grid-cols-4 gap-2">
        <ActionBtn
          icon={cliente ? UserCog : UserPlus}
          label={cliente ? 'Editar' : 'Crear'}
          onClick={() => setEditOpen(true)}
        />
        <ActionBtn icon={CalendarPlus} label="Reserva" onClick={nuevaReserva} />
        <ActionBtn
          icon={Star}
          label={cliente?.es_vip ? 'Quitar VIP' : 'VIP'}
          disabled={!cliente}
          onClick={toggleVip}
          highlight={!!cliente?.es_vip}
        />
        <ActionBtn icon={ExternalLink} label="WA Web" onClick={abrirWA} />
      </div>

      <Separator />

      <Accordion type="multiple" defaultValue={['cliente']} className="w-full">
        {/* Info cliente */}
        <AccordionItem value="cliente">
          <AccordionTrigger className="text-sm py-2">
            <span className="flex items-center gap-2"><BookUser className="h-4 w-4" /> Información</span>
          </AccordionTrigger>
          <AccordionContent className="space-y-2 text-sm">
            {!cliente && (
              <div className="text-xs text-muted-foreground">
                Aún no hay cliente vinculado. Crea uno con las acciones rápidas.
              </div>
            )}
            {cliente && (
              <div className="space-y-1.5">
                {cliente.numero_documento && (
                  <Field icon={IdCard} label={cliente.tipo_documento || 'Documento'} value={cliente.numero_documento} />
                )}
                {cliente.nacionalidad && <Field icon={MapPin} label="Nacionalidad" value={cliente.nacionalidad} />}
                {cliente.total_estancias > 0 && (
                  <Field icon={Building2} label="Estancias" value={String(cliente.total_estancias)} />
                )}
                {parsed.general && (
                  <div className="mt-2 rounded-md bg-muted/40 p-2 text-xs whitespace-pre-wrap">{parsed.general}</div>
                )}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Datos bancarios */}
        <AccordionItem value="banco">
          <AccordionTrigger className="text-sm py-2">
            <span className="flex items-center gap-2"><CreditCard className="h-4 w-4" /> Datos bancarios</span>
          </AccordionTrigger>
          <AccordionContent>
            {parsed.banco ? (
              <pre className="text-xs whitespace-pre-wrap font-mono bg-muted/40 rounded p-2">{parsed.banco}</pre>
            ) : (
              <div className="text-xs text-muted-foreground">
                Sin datos bancarios. {cliente ? 'Edita el cliente para agregarlos.' : 'Primero crea el cliente.'}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Dirección */}
        <AccordionItem value="direccion">
          <AccordionTrigger className="text-sm py-2">
            <span className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Dirección</span>
          </AccordionTrigger>
          <AccordionContent>
            {parsed.direccion ? (
              <pre className="text-xs whitespace-pre-wrap font-mono bg-muted/40 rounded p-2">{parsed.direccion}</pre>
            ) : (
              <div className="text-xs text-muted-foreground">Sin dirección registrada.</div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Reservas */}
        <AccordionItem value="reservas">
          <AccordionTrigger className="text-sm py-2">
            <span className="flex items-center gap-2">
              <CalendarPlus className="h-4 w-4" /> Reservas
              {reservas.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">{reservas.length}</Badge>
              )}
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-1.5">
            {reservas.length === 0 && (
              <div className="text-xs text-muted-foreground">Sin reservas para este cliente.</div>
            )}
            {reservas.map((r) => (
              <button
                key={r.id}
                onClick={() => navigate(`/reservas/${r.id}`)}
                className="w-full text-left rounded-md border p-2 text-xs hover:bg-muted/50"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{r.numero_reserva}</span>
                  <Badge variant="outline" className="text-[10px]">{r.estado}</Badge>
                </div>
                <div className="text-muted-foreground">
                  {r.fecha_checkin} → {r.fecha_checkout}
                </div>
              </button>
            ))}
          </AccordionContent>
        </AccordionItem>

        {/* Etiquetas */}
        <AccordionItem value="etiquetas">
          <AccordionTrigger className="text-sm py-2">
            <span className="flex items-center gap-2"><Tag className="h-4 w-4" /> Etiquetas</span>
          </AccordionTrigger>
          <AccordionContent className="space-y-2">
            <div className="flex flex-wrap gap-1">
              {(chat?.etiquetas ?? []).length === 0 && (
                <span className="text-xs text-muted-foreground">Sin etiquetas</span>
              )}
              {(chat?.etiquetas ?? []).map((et: string) => (
                <Badge key={et} variant="outline" className="pr-0.5">
                  {et}
                  <button className="ml-1 opacity-60 hover:opacity-100" onClick={() => quitarEtiqueta(et)}>×</button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-1">
              <Input
                value={nuevaEtiqueta}
                onChange={(e) => setNuevaEtiqueta(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && agregarEtiqueta()}
                placeholder="Nueva etiqueta"
                className="h-8 text-xs"
              />
              <Button size="sm" variant="outline" onClick={agregarEtiqueta} className="h-8">
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Notas del chat */}
        <AccordionItem value="notas">
          <AccordionTrigger className="text-sm py-2">
            <span className="flex items-center gap-2">
              <StickyNote className="h-4 w-4" /> Notas del chat
              {notas.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">{notas.length}</Badge>
              )}
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-2">
            <div className="flex gap-1">
              <Textarea
                rows={2}
                value={nuevaNota}
                onChange={(e) => setNuevaNota(e.target.value)}
                placeholder="Nueva nota interna…"
                className="text-xs resize-none"
              />
              <Button size="sm" onClick={agregarNota} disabled={!nuevaNota.trim()}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            {notas.map((n) => (
              <div key={n.id} className="rounded-md border p-2 text-xs bg-muted/30 group">
                <div className="whitespace-pre-wrap">{n.nota}</div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: es })}
                  </span>
                  <button
                    className="opacity-0 group-hover:opacity-100 text-destructive"
                    onClick={() => eliminarNota(n.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <ClienteEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        cliente={cliente}
        hotelId={chat?.hotel_id}
        defaultPhone={chat?.phone}
        defaultName={chat?.nombre}
        chatId={chat?.id}
        onSaved={() => { onClienteChange(); onChatChange(); }}
      />
    </div>
  );
}

function ActionBtn({
  icon: Icon, label, onClick, disabled, highlight,
}: { icon: any; label: string; onClick: () => void; disabled?: boolean; highlight?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={
        'flex flex-col items-center gap-1 rounded-lg border p-2 text-[10px] transition-colors ' +
        (disabled
          ? 'opacity-40 cursor-not-allowed'
          : highlight
            ? 'bg-yellow-500/10 border-yellow-500/40 text-yellow-700 hover:bg-yellow-500/20'
            : 'hover:bg-muted')
      }
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </button>
  );
}

function Field({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium truncate">{value}</span>
    </div>
  );
}