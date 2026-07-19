## Objetivo

Que la IA de WhatsApp opere como un recepcionista real: consulte disponibilidad, cotice, aparte habitaciones, cree clientes, informe sobre reservas existentes y sepa cuándo pasar al humano dejando un resumen listo.

## Alcance

**Sí incluye**
- Motor de intención + tool-calling (Gemini 3 flash preview).
- 7 herramientas de negocio conectadas a la base real del hotel.
- Detección de handoff con resumen automático.
- Panel en `/chats` para ver estado (IA / humano) y "tomar conversación".
- Configuración por hotel (activar IA, horarios, políticas).

**No incluye (fase 2)**
- Cobros en línea desde WhatsApp.
- Voz / audio inbound (Whisper).
- Reglas de yield / tarifa dinámica automática.

## Arquitectura

```text
WhatsApp (Evolution API webhook)
        │
        ▼
edge fn: wa-webhook (existente)
        │  guarda mensaje en wa_mensajes
        ▼
edge fn: wa-ai-agent           ← NUEVO
   ├─ carga historial (últimos 20 msgs)
   ├─ carga contexto hotel (habitaciones, tarifas, políticas)
   ├─ llama Lovable AI (google/gemini-3-flash-preview)
   │     con 7 tools definidas abajo
   ├─ ejecuta tool_calls sobre Supabase
   ├─ responde por Evolution API
   └─ si detecta handoff → marca chat + notifica recepción
```

## Herramientas expuestas al modelo

| Tool | Descripción | Efecto en BD |
|---|---|---|
| `buscar_disponibilidad` | Recibe `fecha_checkin`, `fecha_checkout`, `huespedes`, `tipo?` → devuelve habitaciones libres con tarifa aplicando **temporadas**. | read |
| `cotizar_estancia` | Recibe habitación + fechas → total con impuestos y desglose por noche. | read |
| `crear_cliente` | Nombre, teléfono normalizado (521…), documento opcional. | insert `clientes` |
| `crear_reserva_tentativa` | Crea reserva estado `pendiente` con expiración 30 min. | insert `reservas` |
| `confirmar_reserva` | Pasa reserva de `pendiente` → `confirmada` tras aceptación explícita. | update `reservas` |
| `consultar_reserva` | Por folio (`RES-YYYY-XXXX`) o teléfono → detalle + saldo. | read |
| `solicitar_humano` | La IA la invoca cuando detecta queja, negociación fuera de política, problema operativo, o el huésped lo pide. | update `wa_chats.handoff = true` + inserta nota resumen |

Cada tool valida `hotel_id` desde el chat y respeta multi-tenant (nunca cruza hoteles).

## Reglas del agente (system prompt)

- Idioma: español mexicano, tono cálido, breve, no "florido".
- Fechas: siempre `dd/mm/yyyy` en respuesta al huésped.
- No inventar habitaciones ni precios: si no hay disponibilidad, propone alternativa real.
- No promete descuentos: si el cliente los pide, invoca `solicitar_humano`.
- Al apartar: pide **nombre completo** antes de crear el cliente/reserva.
- Confirma explícitamente antes de `confirmar_reserva` ("¿Confirmo la reserva del 20/12 al 22/12 por $2,400?").
- Al finalizar reserva confirmada: envía el folio y menciona que llegará el comprobante.

## Handoff inteligente

Se dispara con `solicitar_humano` cuando:
- El huésped escribe "gerente", "queja", "reclamo", "cancelar y reembolso".
- La IA falla 2 veces en entender.
- Fuera de horario de auto-atención (config del hotel).

Efectos:
- `wa_chats.handoff = true`, `handoff_at = now()`.
- Se inserta un `wa_notas` con resumen: **motivo + últimos 6 mensajes resumidos + datos del cliente + reserva vinculada**.
- Notificación push en `notificaciones` para rol Recepción.
- La IA deja de responder ese chat hasta que recepción presione "Devolver a IA".

## Cambios en base de datos

Migración con **GRANTs** + RLS:

```text
ALTER TABLE wa_chats
  ADD COLUMN handoff boolean DEFAULT false,
  ADD COLUMN handoff_at timestamptz,
  ADD COLUMN handoff_motivo text,
  ADD COLUMN ai_activa boolean DEFAULT true;

ALTER TABLE wa_agent_config
  ADD COLUMN horario_ai_inicio time DEFAULT '00:00',
  ADD COLUMN horario_ai_fin    time DEFAULT '23:59',
  ADD COLUMN permite_apartar   boolean DEFAULT true,
  ADD COLUMN reserva_expira_min int DEFAULT 30;
```

## Edge functions

- **wa-ai-agent** (nuevo): recibe `{ chat_id, hotel_id }`, orquesta el loop de tool-calling (máx 8 pasos), guarda cada tool_call en `wa_mensajes` con `tipo='tool'` para auditoría.
- **wa-webhook** (modificar): tras persistir el mensaje entrante, si `wa_chats.ai_activa && !handoff` invoca `wa-ai-agent`.
- **wa-liberar-tentativas** (cron cada 5 min): cancela reservas `pendiente` con `expira_at < now()`.

## UI

- `/chats`: badge "IA" / "Humano" por conversación; botón **"Tomar conversación"** y **"Devolver a IA"**; ver resumen del handoff.
- `/configuracion → WhatsApp AI`: switch global, horario, permitir apartar sí/no, minutos de expiración, política que el modelo debe respetar (textarea).
- `/reservas` (calendario): las reservas creadas por IA muestran chip naranja `IA`.

## Seguridad

- `wa-ai-agent` valida JWT del webhook (Evolution firma).
- Cada tool ejecuta con `service_role` pero filtra por `hotel_id` del chat.
- Rate limit: máx 12 tool_calls por conversación / 5 min.
- Nunca expone `LOVABLE_API_KEY` ni datos de otros hoteles.

## Entrega en 3 pasos

1. **DB + config**: migración, panel de configuración en `/configuracion`.
2. **Agente core**: edge function `wa-ai-agent` con las 7 tools + integración al webhook + cron de liberación.
3. **UI de handoff**: badges, botón tomar/devolver, resumen automático en `/chats`.

¿Arranco con el paso 1?