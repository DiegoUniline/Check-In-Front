import { useEffect, useMemo, useRef, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Search, Send, Bot, User as UserIcon, Check, CheckCheck,
  MessageCircle, RefreshCw, Pause, Play, Hotel
} from 'lucide-react';
import { CrmPanel } from '@/components/whatsapp/CrmPanel';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const sb = supabase as any;

type Chat = {
  id: string;
  hotel_id: string;
  wa_id: string;
  phone: string;
  nombre: string;
  avatar_url?: string | null;
  ultima_actividad: string;
  ultimo_mensaje: string | null;
  no_leidos: number;
  cliente_id: string | null;
  asignado_a: string | null;
  estado_bot: 'bot' | 'humano';
  etiquetas: string[];
};

type Mensaje = {
  id: string;
  chat_id: string;
  direccion: 'in' | 'out';
  tipo: string;
  contenido: string | null;
  media_url: string | null;
  media_mime: string | null;
  status: string;
  from_bot: boolean;
  timestamp: string;
};

type ClienteResumen = {
  id: string;
  nombre?: string | null;
  apellido_paterno?: string | null;
  apellido_materno?: string | null;
};

const soloDigitos = (value?: string | null) => String(value || '').replace(/\D/g, '');

const pareceTelefono = (value?: string | null) => soloDigitos(value).length >= 7;

const nombreCompletoCliente = (cliente?: ClienteResumen | null) => {
  if (!cliente) return '';
  const tokens: string[] = [];
  [cliente.nombre, cliente.apellido_paterno, cliente.apellido_materno]
    .filter(Boolean)
    .map((s) => String(s).trim())
    .forEach((parte) => {
      parte.split(/\s+/).forEach((token) => {
        if (token && !tokens.some((x) => x.toLowerCase() === token.toLowerCase())) tokens.push(token);
      });
    });
  return tokens.join(' ');
};

const nombreVisibleChat = (chat?: Chat | null, cliente?: ClienteResumen | null) => {
  if (!chat) return '';
  const nombreCliente = nombreCompletoCliente(cliente);
  if (nombreCliente) return nombreCliente;
  if (chat.nombre && !pareceTelefono(chat.nombre)) return chat.nombre;
  return chat.phone || chat.nombre || 'Sin nombre';
};

export default function Chats() {
  const { toast } = useToast();
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'todos' | 'no_leidos' | 'bot' | 'humano'>('todos');
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [cliente, setCliente] = useState<any>(null);
  const [clientesPorId, setClientesPorId] = useState<Record<string, ClienteResumen>>({});
  const [fichaAbierta, setFichaAbierta] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => chats.find((c) => c.id === selectedId) || null,
    [chats, selectedId]
  );

  // Cargar chats
  const cargarChats = async () => {
    const { data, error } = await sb
      .from('wa_chats')
      .select('*')
      .order('ultima_actividad', { ascending: false })
      .limit(200);
    if (error) {
      toast({ title: 'Error al cargar chats', description: error.message, variant: 'destructive' });
      return [];
    }
    const rows = (data as Chat[]) ?? [];
    setChats(rows);
    const clienteIds = Array.from(new Set(rows.map((c) => c.cliente_id).filter(Boolean))) as string[];
    if (clienteIds.length > 0) {
      const { data: clientesData } = await sb
        .from('clientes')
        .select('id,nombre,apellido_paterno,apellido_materno')
        .in('id', clienteIds);
      setClientesPorId(Object.fromEntries(
        ((clientesData as ClienteResumen[]) ?? []).map((item) => [item.id, item])
      ));
    } else {
      setClientesPorId({});
    }
    return rows;
  };

  const sincronizarChats = async (silent = false) => {
    if (syncing) return;
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('evolution-sync-chats', { body: {} });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      await cargarChats();
      if (!silent) {
        toast({
          title: 'Chats sincronizados',
          description: `${(data as any)?.chats ?? 0} chats y ${(data as any)?.mensajes ?? 0} mensajes actualizados.`,
        });
      }
    } catch (e: any) {
      if (!silent) toast({ title: 'Error al sincronizar', description: e.message, variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    cargarChats().then((rows) => {
      if (rows.length === 0) sincronizarChats(true);
    });
  }, []);

  // Realtime chats
  useEffect(() => {
    const ch = supabase
      .channel('wa_chats_rt')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wa_chats' },
        () => cargarChats()
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  // Cargar mensajes del chat seleccionado
  const cargarMensajes = async (chatId: string) => {
    const { data } = await sb
      .from('wa_mensajes')
      .select('*')
      .eq('chat_id', chatId)
      .order('timestamp', { ascending: true })
      .limit(500);
    setMensajes((data as Mensaje[]) ?? []);
  };

  useEffect(() => {
    if (!selectedId) { setMensajes([]); setCliente(null); return; }
    cargarMensajes(selectedId);
    // marcar leídos
    sb.from('wa_chats').update({ no_leidos: 0 }).eq('id', selectedId).then(() => cargarChats());

    const ch = supabase
      .channel(`wa_msg_${selectedId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wa_mensajes', filter: `chat_id=eq.${selectedId}` },
        () => cargarMensajes(selectedId)
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [selectedId]);

  // Cargar cliente asociado
  useEffect(() => {
    if (!selected) { setCliente(null); return; }
    if (selected.cliente_id) {
      sb.from('clientes').select('*').eq('id', selected.cliente_id).single()
        .then(async ({ data }: any) => {
          setCliente(data);
          const nombreCliente = nombreCompletoCliente(data);
          if (nombreCliente && (!selected.nombre || pareceTelefono(selected.nombre))) {
            await sb.from('wa_chats').update({ nombre: nombreCliente }).eq('id', selected.id);
            cargarChats();
          }
        });
      return;
    }
    // Auto-vincular: busca clientes por teléfono, aún si guardaron con o sin lada.
    const digits = String(selected.phone || '').replace(/\D/g, '');
    if (!digits) { setCliente(null); return; }
    // Variantes: full (5213171035768), sin '1' móvil (523171035768), local (3171035768).
    const variantes = new Set<string>([digits]);
    if (digits.startsWith('521')) variantes.add('52' + digits.slice(3));
    if (digits.startsWith('52') && digits.length >= 12) variantes.add(digits.slice(2));
    if (digits.startsWith('521')) variantes.add(digits.slice(3));
    if (digits.length > 10) variantes.add(digits.slice(-10));
    const arr = Array.from(variantes);
    sb.from('clientes')
      .select('*')
      .in('telefono', arr)
      .limit(1)
      .then(async ({ data }: any) => {
        const match = data?.[0];
        if (match) {
          setCliente(match);
          const nombreCliente = nombreCompletoCliente(match);
          await sb.from('wa_chats')
            .update({ cliente_id: match.id, nombre: nombreCliente || selected.nombre })
            .eq('id', selected.id);
          cargarChats();
        } else {
          setCliente(null);
        }
      });
  }, [selected?.id, selected?.cliente_id, selected?.phone]);

  // Scroll al final al cargar mensajes
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [mensajes]);

  const chatsFiltrados = useMemo(() => {
    const q = search.toLowerCase();
    return chats.filter((c) => {
      if (filter === 'no_leidos' && c.no_leidos <= 0) return false;
      if (filter === 'bot' && c.estado_bot !== 'bot') return false;
      if (filter === 'humano' && c.estado_bot !== 'humano') return false;
      if (q) {
        return (
          (c.nombre || '').toLowerCase().includes(q) ||
          (c.phone || '').includes(q) ||
          (c.ultimo_mensaje || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [chats, search, filter]);

  const enviar = async () => {
    if (!selected || !input.trim() || sending) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('evolution-send', {
        body: {
          chat_id: selected.id,
          tipo: 'text',
          contenido: input.trim(),
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setInput('');
    } catch (e: any) {
      toast({ title: 'Error al enviar', description: e.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const toggleBot = async () => {
    if (!selected) return;
    const nuevo = selected.estado_bot === 'bot' ? 'humano' : 'bot';
    await sb.from('wa_chats').update({ estado_bot: nuevo }).eq('id', selected.id);
    cargarChats();
    toast({ title: nuevo === 'bot' ? 'Bot reanudado' : 'Bot pausado en este chat' });
  };

  return (
    <MainLayout title="WhatsApp / Chats" subtitle="Bandeja de conversaciones con IA">
      <div
        className={cn(
          'grid grid-cols-1 gap-3 h-[calc(100vh-11rem)] transition-[grid-template-columns] duration-300',
          fichaAbierta
            ? 'lg:grid-cols-[320px_1fr_320px]'
            : 'lg:grid-cols-[320px_1fr_56px]'
        )}
      >
        {/* Panel izquierdo: lista */}
        <div className="border rounded-lg bg-card overflow-hidden flex flex-col">
          <div className="p-3 border-b space-y-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Buscar…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-1 flex-wrap">
              {(['todos', 'no_leidos', 'bot', 'humano'] as const).map((f) => (
                <Button
                  key={f}
                  size="sm"
                  variant={filter === f ? 'default' : 'outline'}
                  className="h-7 text-xs px-2"
                  onClick={() => setFilter(f)}
                >
                  {f === 'no_leidos' ? 'No leídos' : f[0].toUpperCase() + f.slice(1)}
                </Button>
              ))}
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs px-2 ml-auto"
                onClick={() => sincronizarChats(false)}
                disabled={syncing}
              >
                <RefreshCw className={cn('h-3 w-3 mr-1', syncing && 'animate-spin')} />
                Sync
              </Button>
            </div>
          </div>
          <ScrollArea className="flex-1">
            {chatsFiltrados.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Sin conversaciones aún.
                <br />Conecta WhatsApp en <b>Configuración</b>.
              </div>
            )}
            {chatsFiltrados.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={cn(
                  'w-full text-left p-3 border-b hover:bg-muted/50 transition-colors',
                  selectedId === c.id && 'bg-muted'
                )}
              >
                <div className="flex items-start gap-2">
                  <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 font-bold flex-shrink-0">
                    {(c.nombre || c.phone || '?').slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium truncate">{c.nombre || c.phone}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {formatDistanceToNow(new Date(c.ultima_actividad), { addSuffix: false, locale: es })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      {c.estado_bot === 'bot' ? (
                        <Bot className="h-3 w-3 text-blue-500 shrink-0" />
                      ) : (
                        <UserIcon className="h-3 w-3 text-orange-500 shrink-0" />
                      )}
                      <span className="text-xs text-muted-foreground truncate">
                        {c.ultimo_mensaje || '—'}
                      </span>
                      {c.no_leidos > 0 && (
                        <Badge variant="default" className="ml-auto h-5 min-w-5 px-1 text-[10px]">
                          {c.no_leidos}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </ScrollArea>
        </div>

        {/* Panel central: hilo */}
        <div className="border rounded-lg bg-card overflow-hidden flex flex-col">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p>Selecciona una conversación</p>
              </div>
            </div>
          ) : (
            <>
              <div className="p-3 border-b flex items-center justify-between">
                <div>
                  <div className="font-semibold">
                    {cliente
                      ? [cliente.nombre, cliente.apellido_paterno, cliente.apellido_materno]
                          .filter(Boolean)
                          .join(' ')
                          .split(/\s+/)
                          .filter((t: string, i: number, a: string[]) =>
                            a.findIndex((x) => x.toLowerCase() === t.toLowerCase()) === i)
                          .join(' ')
                      : (selected.nombre || selected.phone)}
                  </div>
                  <div className="text-xs text-muted-foreground">{selected.phone}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={toggleBot}>
                    {selected.estado_bot === 'bot' ? (
                      <><Pause className="h-3.5 w-3.5 mr-1.5" /> Pausar bot</>
                    ) : (
                      <><Play className="h-3.5 w-3.5 mr-1.5" /> Reanudar bot</>
                    )}
                  </Button>
                </div>
              </div>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2 bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2260%22%20height=%2260%22%3E%3C/svg%3E')] bg-muted/20">
                {mensajes.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      'flex',
                      m.direccion === 'out' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[70%] rounded-2xl px-3 py-2 text-sm shadow-sm',
                        m.direccion === 'out'
                          ? 'bg-emerald-500 text-white rounded-br-sm'
                          : 'bg-background border rounded-bl-sm'
                      )}
                    >
                      {m.from_bot && (
                        <div className="text-[10px] opacity-75 flex items-center gap-1 mb-0.5">
                          <Bot className="h-3 w-3" /> IA
                        </div>
                      )}
                      {m.tipo === 'image' && m.media_url && (
                        <img src={m.media_url} alt="" className="rounded max-w-full mb-1" />
                      )}
                      {m.tipo === 'audio' && m.media_url && (
                        <audio src={m.media_url} controls className="max-w-full" />
                      )}
                      {m.tipo === 'document' && m.media_url && (
                        <a href={m.media_url} target="_blank" rel="noreferrer" className="underline">
                          📎 Descargar documento
                        </a>
                      )}
                      {(m.contenido || '').split('\n').map((line, i) => (
                        <div key={i}>{line || <>&nbsp;</>}</div>
                      ))}
                      <div className={cn(
                        'flex items-center gap-1 justify-end mt-0.5 text-[10px]',
                        m.direccion === 'out' ? 'text-white/80' : 'text-muted-foreground'
                      )}>
                        {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {m.direccion === 'out' && (
                          m.status === 'read'
                            ? <CheckCheck className="h-3 w-3 text-sky-200" />
                            : m.status === 'delivered'
                              ? <CheckCheck className="h-3 w-3" />
                              : <Check className="h-3 w-3" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t flex items-end gap-2">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      enviar();
                    }
                  }}
                  placeholder="Escribe un mensaje…"
                  rows={1}
                  className="min-h-[40px] max-h-32 resize-none"
                />
                <Button onClick={enviar} disabled={sending || !input.trim()}>
                  {sending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Panel derecho: ficha */}
        <div className="border rounded-lg bg-card overflow-hidden hidden lg:flex flex-col">
          <div
            className={cn(
              'flex items-center border-b p-2',
              fichaAbierta ? 'justify-between' : 'justify-center'
            )}
          >
            {fichaAbierta && (
              <span className="text-xs font-semibold text-muted-foreground px-2">
                Ficha del contacto
              </span>
            )}
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => setFichaAbierta((v) => !v)}
              title={fichaAbierta ? 'Contraer ficha' : 'Expandir ficha'}
            >
              <Hotel className="h-4 w-4" />
            </Button>
          </div>
          {fichaAbierta && (!selected ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Selecciona una conversación
            </div>
          ) : (
            <CrmPanel
              chat={selected}
              cliente={cliente}
              onClienteChange={() => {
                if (selected?.cliente_id) {
                  sb.from('clientes').select('*').eq('id', selected.cliente_id).single()
                    .then(({ data }: any) => setCliente(data));
                } else {
                  cargarChats();
                }
              }}
              onChatChange={cargarChats}
            />
          ))}
        </div>
      </div>
    </MainLayout>
  );
}