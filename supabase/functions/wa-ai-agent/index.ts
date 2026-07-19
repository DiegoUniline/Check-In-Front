import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { corsHeaders, evoFetch, json } from "../_shared/evolution.ts";

/**
 * Agente IA de WhatsApp.
 * Recibe { chat_id } y responde al huésped usando Lovable AI (Gemini) con tools:
 *   - datos_hotel, consultar_disponibilidad, cotizar, buscar_faq,
 *     crear_pre_reserva, escalar_a_humano
 * El servicio se invoca desde evolution-webhook cuando llega un mensaje entrante
 * y el chat está en estado_bot='bot' y el hotel tiene wa_agent_config.activo=true.
 */

const LOVABLE_API = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";
const MAX_STEPS = 8;

type Msg = { role: "system" | "user" | "assistant" | "tool"; content: string; tool_call_id?: string; tool_calls?: unknown[]; name?: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método inválido" }, 405);
  try {
    const body = await req.json().catch(() => ({}));
    const chat_id = (body as { chat_id?: unknown }).chat_id;
    if (typeof chat_id !== "string" || !/^[0-9a-f-]{36}$/i.test(chat_id)) {
      return json({ error: "chat_id inválido" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_KEY) return json({ error: "LOVABLE_API_KEY no configurado" }, 500);

    const { data: chat } = await admin.from("wa_chats").select("*").eq("id", chat_id).single();
    if (!chat) return json({ error: "chat no encontrado" }, 404);
    if (chat.estado_bot !== "bot") return json({ ok: true, note: "chat en modo humano" });

    const { data: cfg } = await admin.from("wa_agent_config").select("*").eq("hotel_id", chat.hotel_id).maybeSingle();
    if (!cfg || !cfg.activo) return json({ ok: true, note: "agente inactivo" });

    // Horario
    if (!cfg.horario_24_7 && cfg.hora_inicio && cfg.hora_fin) {
      const now = new Date();
      const hhmm = now.toTimeString().slice(0, 5);
      if (hhmm < cfg.hora_inicio || hhmm > cfg.hora_fin) {
        await enviar(admin, chat, cfg.mensaje_fuera_horario);
        return json({ ok: true, note: "fuera de horario" });
      }
    }

    // Handoff por keyword
    const { data: ultimo } = await admin
      .from("wa_mensajes")
      .select("contenido")
      .eq("chat_id", chat_id)
      .eq("direccion", "in")
      .order("timestamp", { ascending: false })
      .limit(1)
      .maybeSingle();
    const txt = (ultimo?.contenido ?? "").toLowerCase();
    const kws = (cfg.handoff_keywords ?? []) as string[];
    if (kws.some((k) => txt.includes(k.toLowerCase()))) {
      await admin.from("wa_chats").update({ estado_bot: "humano" }).eq("id", chat_id);
      await enviar(admin, chat, "Perfecto, en un momento te contacta una persona del equipo. 🙌");
      return json({ ok: true, note: "handoff" });
    }

    // Historial (últimos 20)
    const { data: hist } = await admin
      .from("wa_mensajes")
      .select("direccion, contenido, from_bot")
      .eq("chat_id", chat_id)
      .order("timestamp", { ascending: false })
      .limit(20);
    const historia = (hist ?? []).reverse();

    const { data: hotel } = await admin.from("hotels").select("nombre, ciudad, hora_checkin, hora_checkout, moneda_simbolo, telefono, email, direccion, descripcion_publica").eq("id", chat.hotel_id).single();

    const systemPrompt = `Eres ${cfg.nombre_agente}, asistente virtual de WhatsApp del hotel "${hotel?.nombre}".
Personalidad: ${cfg.personalidad}
${cfg.instrucciones ? `Instrucciones adicionales: ${cfg.instrucciones}` : ""}

Reglas:
- Responde en el idioma del huésped (por defecto español mexicano), breve (2-4 líneas), tono cálido, natural.
- Usa emojis con moderación (máx 1 por mensaje).
- Nunca inventes precios ni disponibilidad: SIEMPRE usa las herramientas para consultar datos reales.
- Al huésped muéstrale las fechas como dd/mm/yyyy. Internamente/en tools usa YYYY-MM-DD.
- Check-in ${hotel?.hora_checkin ?? "15:00"}, check-out ${hotel?.hora_checkout ?? "12:00"}. Moneda: ${hotel?.moneda_simbolo ?? "$"}.

Flujo de reserva:
1. Pregunta fechas y número de huéspedes si no las tienes.
2. Usa consultar_disponibilidad para verificar. Si no hay, propón fechas alternativas reales.
3. Cotiza con "cotizar" y presenta el total claro.
4. Pide nombre completo del huésped.
5. Usa crear_pre_reserva → obtienes un folio con estado Pendiente.
6. Pide confirmación EXPLÍCITA ("¿Confirmo tu reserva del 20/12 al 22/12 por $2,400?").
7. Solo cuando el huésped diga "sí, confirmo" (o equivalente claro), llama a confirmar_reserva con el reserva_id. Luego dale su folio.

Consulta de reserva existente:
- Si el huésped pregunta "cuál es mi reserva", "cuánto debo", "a qué hora llego", usa consultar_reserva (con folio si lo da, o sin argumentos para buscar por su teléfono).

Handoff (escalar_a_humano):
- Si pide descuento, gerente, queja, reembolso, o algo fuera de tus capacidades, llama a escalar_a_humano con motivo Y resumen de 2-4 líneas de lo que necesita.
- Después del handoff, despídete brevemente: "En un momento te contacta alguien del equipo 🙌".
- Nunca prometas descuentos por tu cuenta.
`;

    const messages: Msg[] = [{ role: "system", content: systemPrompt }];
    for (const h of historia) {
      messages.push({
        role: h.direccion === "in" ? "user" : "assistant",
        content: h.contenido ?? "",
      });
    }

    const tools = buildTools();

    // Loop de tool calls
    let respuestaFinal = "";
    for (let step = 0; step < MAX_STEPS; step++) {
      const resp = await fetch(LOVABLE_API, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_KEY}` },
        body: JSON.stringify({ model: MODEL, messages, tools, tool_choice: "auto" }),
      });
      if (!resp.ok) {
        const t = await resp.text();
        console.error("AI Gateway error", resp.status, t);
        if (resp.status === 429) { await enviar(admin, chat, "Estoy con mucha demanda ahora mismo, ¿me das un momento?"); return json({ error: "rate_limit" }, 429); }
        if (resp.status === 402) { await enviar(admin, chat, "En un momento te contacta una persona del equipo."); await admin.from("wa_chats").update({ estado_bot: "humano" }).eq("id", chat_id); return json({ error: "credits" }, 402); }
        return json({ error: "ai_error", details: t }, 500);
      }
      const data = await resp.json();
      const msg = data.choices?.[0]?.message;
      if (!msg) break;
      messages.push(msg);

      if (msg.tool_calls && msg.tool_calls.length > 0) {
        for (const call of msg.tool_calls) {
          const name = call.function?.name;
          let args: Record<string, unknown> = {};
          try { args = JSON.parse(call.function?.arguments ?? "{}"); } catch { /* */ }
          const result = await ejecutarTool(admin, chat.hotel_id, chat_id, name, args, cfg);
          messages.push({
            role: "tool",
            tool_call_id: call.id,
            name,
            content: JSON.stringify(result),
          });
        }
        continue;
      }

      respuestaFinal = msg.content ?? "";
      break;
    }

    if (respuestaFinal) {
      await enviar(admin, chat, respuestaFinal, true);
    }
    return json({ ok: true });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

// ---------- Envío ----------
async function enviar(admin: ReturnType<typeof createClient>, chat: any, texto: string, fromBot = true) {
  const { data: inst } = await admin.from("wa_instancias").select("instance_name, estado").eq("hotel_id", chat.hotel_id).maybeSingle();
  if (!inst || inst.estado !== "connected") return;
  try {
    const resp = await evoFetch(`/message/sendText/${inst.instance_name}`, {
      method: "POST",
      body: JSON.stringify({ number: chat.phone, text: texto }),
    });
    const wa_id = (resp.body as any)?.key?.id ?? null;
    await admin.from("wa_mensajes").insert({
      chat_id: chat.id,
      hotel_id: chat.hotel_id,
      direccion: "out",
      tipo: "text",
      contenido: texto,
      wa_message_id: wa_id,
      status: "sent",
      from_bot: fromBot,
    });
    await admin.from("wa_chats").update({
      ultima_actividad: new Date().toISOString(),
      ultimo_mensaje: texto,
      updated_at: new Date().toISOString(),
    }).eq("id", chat.id);
  } catch (e) {
    console.error("enviar error", e);
  }
}

// ---------- Tools ----------
function buildTools() {
  return [
    {
      type: "function",
      function: {
        name: "datos_hotel",
        description: "Devuelve información pública del hotel: dirección, teléfono, email, check-in/out, descripción.",
        parameters: { type: "object", properties: {} },
      },
    },
    {
      type: "function",
      function: {
        name: "listar_tipos_habitacion",
        description: "Lista los tipos de habitación con precios y capacidad.",
        parameters: { type: "object", properties: {} },
      },
    },
    {
      type: "function",
      function: {
        name: "consultar_disponibilidad",
        description: "Consulta disponibilidad de habitaciones en un rango de fechas.",
        parameters: {
          type: "object",
          properties: {
            checkin: { type: "string", description: "YYYY-MM-DD" },
            checkout: { type: "string", description: "YYYY-MM-DD" },
            adultos: { type: "number", default: 2 },
            ninos: { type: "number", default: 0 },
          },
          required: ["checkin", "checkout"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "cotizar",
        description: "Cotiza estancia por tipo de habitación en rango de fechas.",
        parameters: {
          type: "object",
          properties: {
            tipo_habitacion_id: { type: "string" },
            checkin: { type: "string" },
            checkout: { type: "string" },
            personas_extra: { type: "number", default: 0 },
          },
          required: ["tipo_habitacion_id", "checkin", "checkout"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "buscar_faq",
        description: "Busca en las preguntas frecuentes del hotel.",
        parameters: {
          type: "object",
          properties: { consulta: { type: "string" } },
          required: ["consulta"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "crear_pre_reserva",
        description: "Crea una pre-reserva (estado 'Pendiente') con los datos del huésped.",
        parameters: {
          type: "object",
          properties: {
            nombre: { type: "string" },
            tipo_habitacion_id: { type: "string" },
            checkin: { type: "string" },
            checkout: { type: "string" },
            adultos: { type: "number", default: 2 },
            ninos: { type: "number", default: 0 },
            email: { type: "string" },
            notas: { type: "string" },
          },
          required: ["nombre", "tipo_habitacion_id", "checkin", "checkout"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "escalar_a_humano",
        description: "Pasa la conversación a un humano cuando no puedas resolver (quejas, negociación de descuentos, reclamos, cancelaciones con reembolso, o cuando el huésped lo pide explícitamente).",
        parameters: {
          type: "object",
          properties: {
            motivo: { type: "string", description: "Motivo breve del handoff." },
            resumen: { type: "string", description: "Resumen de 2-4 líneas de la conversación y lo que el huésped necesita." },
          },
          required: ["motivo"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "consultar_reserva",
        description: "Busca una reserva del huésped por folio (RES-YYYY-XXXX) o por el teléfono del chat actual. Devuelve fechas, habitación, total, saldo y estado.",
        parameters: {
          type: "object",
          properties: {
            folio: { type: "string", description: "Folio tipo RES-2026-0010. Opcional si se busca por teléfono del chat." },
          },
        },
      },
    },
    {
      type: "function",
      function: {
        name: "confirmar_reserva",
        description: "Cambia una reserva de estado 'Pendiente' a 'Confirmada'. Solo úsala tras confirmación EXPLÍCITA del huésped en el chat.",
        parameters: {
          type: "object",
          properties: {
            reserva_id: { type: "string", description: "UUID de la reserva a confirmar." },
          },
          required: ["reserva_id"],
        },
      },
    },
  ];
}

async function ejecutarTool(admin: any, hotelId: string, chatId: string, name: string, args: any, _cfg: any) {
  try {
    if (name === "datos_hotel") {
      const { data } = await admin.from("hotels").select("nombre, direccion, ciudad, telefono, email, hora_checkin, hora_checkout, descripcion_publica").eq("id", hotelId).single();
      return data ?? {};
    }
    if (name === "listar_tipos_habitacion") {
      const { data } = await admin.from("tipos_habitacion").select("id, nombre, descripcion, capacidad_adultos, capacidad_ninos, precio_base, precio_persona_extra, amenidades").eq("hotel_id", hotelId).eq("publicar_web", true);
      return { tipos: data ?? [] };
    }
    if (name === "consultar_disponibilidad") {
      const { checkin, checkout, adultos = 2, ninos = 0 } = args;
      const { data: tipos } = await admin.from("tipos_habitacion").select("id, nombre, precio_base, capacidad_adultos, capacidad_ninos").eq("hotel_id", hotelId);
      const { data: habs } = await admin.from("habitaciones").select("id, tipo_habitacion_id, numero").eq("hotel_id", hotelId);
      const { data: reservas } = await admin.from("reservas").select("habitacion_id, tipo_habitacion_id, fecha_checkin, fecha_checkout, estado").eq("hotel_id", hotelId).not("estado", "in", "(Cancelada,NoShow)").lt("fecha_checkin", checkout).gt("fecha_checkout", checkin);
      const ocupadas = new Set((reservas ?? []).map((r: any) => r.habitacion_id).filter(Boolean));
      const disponibles: Record<string, number> = {};
      for (const h of habs ?? []) {
        if (!ocupadas.has(h.id)) disponibles[h.tipo_habitacion_id] = (disponibles[h.tipo_habitacion_id] ?? 0) + 1;
      }
      const noches = Math.max(1, Math.round((new Date(checkout).getTime() - new Date(checkin).getTime()) / 86400000));
      const resultado = (tipos ?? [])
        .filter((t: any) => (t.capacidad_adultos ?? 0) >= adultos && (t.capacidad_ninos ?? 99) >= ninos)
        .map((t: any) => ({
          tipo_habitacion_id: t.id,
          nombre: t.nombre,
          disponibles: disponibles[t.id] ?? 0,
          precio_noche: Number(t.precio_base),
          total: Number(t.precio_base) * noches,
          noches,
        }))
        .filter((r: any) => r.disponibles > 0);
      return { checkin, checkout, noches, resultados: resultado };
    }
    if (name === "cotizar") {
      const { tipo_habitacion_id, checkin, checkout, personas_extra = 0 } = args;
      const { data: t } = await admin.from("tipos_habitacion").select("nombre, precio_base, precio_persona_extra").eq("id", tipo_habitacion_id).single();
      if (!t) return { error: "tipo no encontrado" };
      const noches = Math.max(1, Math.round((new Date(checkout).getTime() - new Date(checkin).getTime()) / 86400000));
      const total = (Number(t.precio_base) + Number(t.precio_persona_extra ?? 0) * personas_extra) * noches;
      return { nombre: t.nombre, noches, tarifa_noche: t.precio_base, total };
    }
    if (name === "buscar_faq") {
      const q = String(args.consulta ?? "").toLowerCase();
      const { data } = await admin.from("wa_faq").select("pregunta, respuesta, categoria").eq("hotel_id", hotelId).eq("activo", true);
      const encontrados = (data ?? []).filter((f: any) =>
        f.pregunta.toLowerCase().includes(q) || (f.categoria ?? "").toLowerCase().includes(q) || q.split(" ").some((w) => w.length > 3 && f.pregunta.toLowerCase().includes(w))
      ).slice(0, 3);
      return { resultados: encontrados };
    }
    if (name === "crear_pre_reserva") {
      const { nombre, tipo_habitacion_id, checkin, checkout, adultos = 2, ninos = 0, email, notas } = args;
      const { data: chat } = await admin.from("wa_chats").select("phone, cliente_id").eq("id", chatId).single();
      let clienteId = chat?.cliente_id;
      if (!clienteId) {
        const partes = String(nombre).trim().split(" ");
        const { data: nuevo } = await admin.from("clientes").insert({
          hotel_id: hotelId,
          nombre: partes[0] ?? nombre,
          apellido_paterno: partes.slice(1).join(" ") || null,
          telefono: chat?.phone ?? null,
          email: email ?? null,
        }).select("id").single();
        clienteId = nuevo?.id;
        if (clienteId) await admin.from("wa_chats").update({ cliente_id: clienteId }).eq("id", chatId);
      }
      const { data: t } = await admin.from("tipos_habitacion").select("precio_base").eq("id", tipo_habitacion_id).single();
      const noches = Math.max(1, Math.round((new Date(checkout).getTime() - new Date(checkin).getTime()) / 86400000));
      const tarifa = Number(t?.precio_base ?? 0);
      const subtotal = tarifa * noches;
      const { data: reserva, error } = await admin.from("reservas").insert({
        hotel_id: hotelId,
        cliente_id: clienteId,
        tipo_habitacion_id,
        fecha_checkin: checkin,
        fecha_checkout: checkout,
        adultos, ninos, noches,
        tarifa_noche: tarifa,
        subtotal_hospedaje: subtotal,
        total: subtotal,
        estado: "Pendiente",
        origen: "WhatsApp Bot",
        notas: notas ?? "Creada por agente IA vía WhatsApp",
      }).select("id, numero_reserva").single();
      if (error) return { error: error.message };
      return { ok: true, reserva_id: reserva?.id, numero_reserva: reserva?.numero_reserva, total: subtotal, noches };
    }
    if (name === "escalar_a_humano") {
      const motivo = String(args.motivo ?? "El agente solicitó apoyo humano");
      const resumen = String(args.resumen ?? "").trim();
      await admin.from("wa_chats").update({ estado_bot: "humano" }).eq("id", chatId);
      // Guardar nota con resumen si la tabla wa_notas existe
      try {
        await admin.from("wa_notas").insert({
          chat_id: chatId,
          hotel_id: hotelId,
          contenido: `🤝 HANDOFF automático\nMotivo: ${motivo}${resumen ? `\n\nResumen IA:\n${resumen}` : ""}`,
        });
      } catch (_) { /* wa_notas opcional */ }
      // Notificación para recepción
      try {
        await admin.from("notificaciones").insert({
          hotel_id: hotelId,
          tipo: "whatsapp_handoff",
          titulo: "WhatsApp: se requiere atención humana",
          mensaje: motivo,
          prioridad: "alta",
        });
      } catch (_) { /* notificaciones puede tener otro shape */ }
      return { ok: true, mensaje: "Conversación pasada a un humano." };
    }
    if (name === "consultar_reserva") {
      const folio = String(args.folio ?? "").trim();
      let query = admin
        .from("reservas")
        .select("id, numero_reserva, fecha_checkin, fecha_checkout, noches, adultos, ninos, total, total_pagado, saldo_pendiente, estado, tarifa_noche, tipo_habitacion_id, habitacion_id, cliente_id, clientes(nombre, telefono), habitaciones(numero), tipos_habitacion(nombre)")
        .eq("hotel_id", hotelId);
      if (folio) {
        query = query.eq("numero_reserva", folio);
      } else {
        // Buscar por teléfono del chat
        const { data: chat } = await admin.from("wa_chats").select("phone, cliente_id").eq("id", chatId).single();
        if (chat?.cliente_id) {
          query = query.eq("cliente_id", chat.cliente_id);
        } else if (chat?.phone) {
          const { data: cli } = await admin.from("clientes").select("id").eq("hotel_id", hotelId).eq("telefono", chat.phone).maybeSingle();
          if (cli?.id) query = query.eq("cliente_id", cli.id);
          else return { encontrada: false, mensaje: "No encontré reservas asociadas a este teléfono." };
        } else {
          return { encontrada: false, mensaje: "Necesito el folio (por ejemplo RES-2026-0010) para buscar la reserva." };
        }
      }
      const { data: reservas } = await query.order("fecha_checkin", { ascending: false }).limit(5);
      if (!reservas || reservas.length === 0) return { encontrada: false, mensaje: "No encontré ninguna reserva con esos datos." };
      return {
        encontrada: true,
        reservas: reservas.map((r: any) => ({
          id: r.id,
          folio: r.numero_reserva,
          checkin: r.fecha_checkin,
          checkout: r.fecha_checkout,
          noches: r.noches,
          adultos: r.adultos,
          ninos: r.ninos,
          huesped: r.clientes?.nombre ?? null,
          habitacion: r.habitaciones?.numero ?? null,
          tipo: r.tipos_habitacion?.nombre ?? null,
          tarifa_noche: r.tarifa_noche,
          total: r.total,
          pagado: r.total_pagado,
          saldo: r.saldo_pendiente,
          estado: r.estado,
        })),
      };
    }
    if (name === "confirmar_reserva") {
      const reservaId = String(args.reserva_id ?? "");
      if (!/^[0-9a-f-]{36}$/i.test(reservaId)) return { error: "reserva_id inválido" };
      const { data: r } = await admin.from("reservas").select("id, hotel_id, estado, numero_reserva").eq("id", reservaId).single();
      if (!r) return { error: "Reserva no encontrada" };
      if (r.hotel_id !== hotelId) return { error: "Reserva no pertenece a este hotel" };
      if (r.estado === "Confirmada") return { ok: true, ya_confirmada: true, folio: r.numero_reserva };
      if (r.estado !== "Pendiente") return { error: `No se puede confirmar una reserva en estado ${r.estado}` };
      const { error } = await admin.from("reservas").update({ estado: "Confirmada", updated_at: new Date().toISOString() }).eq("id", reservaId);
      if (error) return { error: error.message };
      return { ok: true, folio: r.numero_reserva, mensaje: "Reserva confirmada correctamente." };
    }
    return { error: `tool desconocida: ${name}` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}