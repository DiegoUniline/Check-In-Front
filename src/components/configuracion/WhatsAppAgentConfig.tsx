import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Bot, Plus, Trash2, Sparkles } from "lucide-react";

type Cfg = {
  hotel_id: string;
  activo: boolean;
  nombre_agente: string;
  personalidad: string;
  instrucciones: string;
  saludo: string;
  horario_24_7: boolean;
  hora_inicio: string | null;
  hora_fin: string | null;
  mensaje_fuera_horario: string;
  handoff_keywords: string[];
  auto_crear_reservas: boolean;
};

type Faq = { id?: string; pregunta: string; respuesta: string; categoria?: string | null; activo: boolean; orden: number };

export function WhatsAppAgentConfig() {
  const [cfg, setCfg] = useState<Cfg | null>(null);
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [hotelId, setHotelId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from("profiles").select("hotel_id, hotel_activo_id").eq("id", user.id).single();
    const hid = profile?.hotel_activo_id ?? profile?.hotel_id;
    if (!hid) return;
    setHotelId(hid);
    const { data: c } = await supabase.from("wa_agent_config").select("*").eq("hotel_id", hid).maybeSingle();
    setCfg(c ?? {
      hotel_id: hid,
      activo: false,
      nombre_agente: "Sofía",
      personalidad: "Amable, profesional y cálida. Responde en el idioma del huésped.",
      instrucciones: "",
      saludo: "¡Hola! 👋 Soy el asistente virtual del hotel. ¿En qué puedo ayudarte?",
      horario_24_7: true,
      hora_inicio: null,
      hora_fin: null,
      mensaje_fuera_horario: "Gracias por escribir. Te responderemos en horario de atención.",
      handoff_keywords: ["humano", "agente", "persona", "recepción"],
      auto_crear_reservas: false,
    });
    const { data: f } = await supabase.from("wa_faq").select("*").eq("hotel_id", hid).order("orden");
    setFaqs((f ?? []) as Faq[]);
    setLoading(false);
  }

  async function guardar() {
    if (!cfg || !hotelId) return;
    setSaving(true);
    const { error } = await supabase.from("wa_agent_config").upsert({ ...cfg, hotel_id: hotelId });
    if (error) toast.error("Error: " + error.message);
    else toast.success("Configuración guardada");
    setSaving(false);
  }

  async function guardarFaq(faq: Faq) {
    if (!hotelId) return;
    const payload = { ...faq, hotel_id: hotelId };
    if (faq.id) {
      const { error } = await supabase.from("wa_faq").update(payload).eq("id", faq.id);
      if (error) toast.error(error.message); else toast.success("FAQ actualizada");
    } else {
      const { error } = await supabase.from("wa_faq").insert(payload);
      if (error) toast.error(error.message); else { toast.success("FAQ creada"); load(); }
    }
  }
  async function borrarFaq(id?: string) {
    if (!id) { setFaqs(faqs.filter((f) => f.id)); return; }
    const { error } = await supabase.from("wa_faq").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("FAQ eliminada"); load(); }
  }

  if (loading || !cfg) return <Card><CardContent className="py-8 text-center text-muted-foreground">Cargando…</CardContent></Card>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5 text-primary" /> Agente IA de WhatsApp</CardTitle>
              <CardDescription>Tu recepcionista virtual 24/7 con IA</CardDescription>
            </div>
            <Badge variant={cfg.activo ? "default" : "secondary"}>{cfg.activo ? "Activo" : "Inactivo"}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label>Activar agente IA</Label>
              <p className="text-sm text-muted-foreground">Responderá automáticamente a los mensajes entrantes</p>
            </div>
            <Switch checked={cfg.activo} onCheckedChange={(v) => setCfg({ ...cfg, activo: v })} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Nombre del agente</Label>
              <Input value={cfg.nombre_agente} onChange={(e) => setCfg({ ...cfg, nombre_agente: e.target.value })} />
            </div>
            <div>
              <Label>Palabras para handoff (separadas por coma)</Label>
              <Input
                value={cfg.handoff_keywords.join(", ")}
                onChange={(e) => setCfg({ ...cfg, handoff_keywords: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
              />
            </div>
          </div>

          <div>
            <Label>Personalidad</Label>
            <Textarea rows={2} value={cfg.personalidad} onChange={(e) => setCfg({ ...cfg, personalidad: e.target.value })} />
          </div>

          <div>
            <Label>Instrucciones adicionales</Label>
            <Textarea rows={3} placeholder="Reglas del hotel, políticas, tono especial…" value={cfg.instrucciones} onChange={(e) => setCfg({ ...cfg, instrucciones: e.target.value })} />
          </div>

          <div>
            <Label>Saludo inicial</Label>
            <Textarea rows={2} value={cfg.saludo} onChange={(e) => setCfg({ ...cfg, saludo: e.target.value })} />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label>Disponible 24/7</Label>
              <p className="text-sm text-muted-foreground">Si se desactiva, sólo responde en horario</p>
            </div>
            <Switch checked={cfg.horario_24_7} onCheckedChange={(v) => setCfg({ ...cfg, horario_24_7: v })} />
          </div>
          {!cfg.horario_24_7 && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Hora inicio</Label>
                <Input type="time" value={cfg.hora_inicio ?? ""} onChange={(e) => setCfg({ ...cfg, hora_inicio: e.target.value })} />
              </div>
              <div>
                <Label>Hora fin</Label>
                <Input type="time" value={cfg.hora_fin ?? ""} onChange={(e) => setCfg({ ...cfg, hora_fin: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>Mensaje fuera de horario</Label>
                <Textarea rows={2} value={cfg.mensaje_fuera_horario} onChange={(e) => setCfg({ ...cfg, mensaje_fuera_horario: e.target.value })} />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label>Permitir crear pre-reservas</Label>
              <p className="text-sm text-muted-foreground">El agente puede crear reservas en estado "Pendiente"</p>
            </div>
            <Switch checked={cfg.auto_crear_reservas} onCheckedChange={(v) => setCfg({ ...cfg, auto_crear_reservas: v })} />
          </div>

          <Button onClick={guardar} disabled={saving} className="w-full">
            <Sparkles className="h-4 w-4 mr-2" />
            {saving ? "Guardando…" : "Guardar configuración"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Preguntas frecuentes</CardTitle>
            <CardDescription>El agente usará estas respuestas como base de conocimiento</CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={() => setFaqs([...faqs, { pregunta: "", respuesta: "", activo: true, orden: faqs.length }])}>
            <Plus className="h-4 w-4 mr-1" /> Nueva
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {faqs.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Sin preguntas frecuentes aún.</p>}
          {faqs.map((f, i) => (
            <div key={f.id ?? `new-${i}`} className="rounded-lg border p-3 space-y-2">
              <div className="flex gap-2">
                <Input placeholder="Pregunta" value={f.pregunta} onChange={(e) => { const c = [...faqs]; c[i] = { ...f, pregunta: e.target.value }; setFaqs(c); }} />
                <Input className="w-40" placeholder="Categoría" value={f.categoria ?? ""} onChange={(e) => { const c = [...faqs]; c[i] = { ...f, categoria: e.target.value }; setFaqs(c); }} />
                <Button size="icon" variant="ghost" onClick={() => borrarFaq(f.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
              <Textarea rows={2} placeholder="Respuesta" value={f.respuesta} onChange={(e) => { const c = [...faqs]; c[i] = { ...f, respuesta: e.target.value }; setFaqs(c); }} />
              <div className="flex justify-end">
                <Button size="sm" onClick={() => guardarFaq(f)} disabled={!f.pregunta || !f.respuesta}>Guardar</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}