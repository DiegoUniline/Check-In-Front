import { cn } from "@/lib/utils";
import {
  BedDouble,
  CalendarDays,
  CheckCircle2,
  Circle,
  MessageCircle,
  Send,
  Sparkles,
  UtensilsCrossed,
  ArrowUpRight,
  TrendingUp,
  Users,
  Clock,
  Search,
} from "lucide-react";

/* Shared chrome inner padding */
const pad = "p-5 md:p-6";

/* ─────────────────── ShotReservasTimeline ─────────────────── */

const RES_ROWS = [
  { id: "RES-2026-2041", guest: "Juan Pérez",       room: "Suite 204",  in: "12 Jul", out: "15 Jul", nights: 3, status: "Confirmada", color: "bg-primary" },
  { id: "RES-2026-2042", guest: "Emily Johnson",    room: "Habitación 118", in: "12 Jul", out: "14 Jul", nights: 2, status: "Check-in", color: "bg-accent" },
  { id: "RES-2026-2043", guest: "Carlos Ramírez",   room: "Suite 305",  in: "13 Jul", out: "18 Jul", nights: 5, status: "Confirmada", color: "bg-primary" },
  { id: "RES-2026-2044", guest: "Sofía Herrera",    room: "Habitación 210", in: "14 Jul", out: "16 Jul", nights: 2, status: "Pendiente", color: "bg-warning" },
  { id: "RES-2026-2045", guest: "Marco Bianchi",    room: "Junior 402", in: "15 Jul", out: "20 Jul", nights: 5, status: "Confirmada", color: "bg-primary" },
];

export function ShotReservasTimeline() {
  const days = ["Lun 12", "Mar 13", "Mié 14", "Jue 15", "Vie 16", "Sáb 17", "Dom 18"];
  return (
    <div className={cn(pad, "bg-background")}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <CalendarDays className="h-4 w-4 text-primary" /> Reservas · Julio 2026
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="hidden sm:inline">Hotel Aurora · Ciudad</span>
          <span className="rounded-full border border-border px-2 py-0.5">Semana</span>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-[180px_1fr] gap-3 text-xs">
        <div />
        <div className="grid grid-cols-7 gap-2">
          {days.map((d) => (
            <div key={d} className="rounded-md bg-secondary/60 px-2 py-1.5 text-center text-[11px] font-medium text-foreground/70">
              {d}
            </div>
          ))}
        </div>
        {RES_ROWS.map((r, idx) => {
          const start = idx % 5;
          const span = Math.min(r.nights, 7 - start);
          return (
            <>
              <div key={`${r.id}-l`} className="flex flex-col justify-center">
                <div className="text-[11px] font-mono text-muted-foreground">{r.id}</div>
                <div className="truncate text-[13px] font-medium text-foreground">{r.guest}</div>
                <div className="text-[11px] text-muted-foreground">{r.room}</div>
              </div>
              <div key={`${r.id}-t`} className="relative grid h-11 grid-cols-7 gap-2">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="rounded-md bg-secondary/40" />
                ))}
                <div
                  className={cn(
                    "absolute top-1.5 flex h-8 items-center gap-2 rounded-full px-3 text-[11px] font-medium text-primary-foreground",
                    r.color,
                  )}
                  style={{
                    left: `calc((100% / 7) * ${start} + 2px)`,
                    width: `calc((100% / 7) * ${span} - 6px)`,
                  }}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground/80" />
                  <span className="truncate">{r.status}</span>
                </div>
              </div>
            </>
          );
        })}
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3 border-t border-border/60 pt-4 text-xs">
        <div><span className="text-muted-foreground">Ocupación</span><div className="text-lg font-semibold text-foreground">87%</div></div>
        <div><span className="text-muted-foreground">ADR</span><div className="text-lg font-semibold text-foreground">$2,340</div></div>
        <div><span className="text-muted-foreground">Ingresos semana</span><div className="text-lg font-semibold text-foreground">$186,420</div></div>
      </div>
    </div>
  );
}

/* ─────────────────── ShotWhatsAppCRM ─────────────────── */

export function ShotWhatsAppCRM() {
  return (
    <div className="grid grid-cols-[220px_1fr] bg-background">
      <aside className="border-r border-border/60 bg-secondary/30 p-3">
        <div className="mb-3 flex items-center gap-2 rounded-full bg-background px-3 py-2 text-xs text-muted-foreground">
          <Search className="h-3.5 w-3.5" /> Buscar
        </div>
        {[
          { name: "Carlos Ramírez", msg: "¿Tienen disponibilidad el 15?", time: "10:24", unread: 2, active: true },
          { name: "Emily Johnson", msg: "Perfect, thank you!", time: "09:48" },
          { name: "Sofía Herrera", msg: "Aviso, llegamos tarde", time: "08:12", unread: 1 },
          { name: "Marco Bianchi", msg: "Grazie mille", time: "Ayer" },
          { name: "Ana Villalobos", msg: "Confirmado, gracias", time: "Ayer" },
        ].map((c) => (
          <div
            key={c.name}
            className={cn(
              "flex items-start gap-2 rounded-lg p-2 transition-colors",
              c.active ? "bg-background shadow-sm" : "hover:bg-background/60",
            )}
          >
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
              {c.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[12.5px] font-medium text-foreground">{c.name}</span>
                <span className="text-[10px] text-muted-foreground">{c.time}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <p className="truncate text-[11.5px] text-muted-foreground">{c.msg}</p>
                {c.unread ? (
                  <span className="ml-auto inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-semibold text-accent-foreground">
                    {c.unread}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </aside>
      <div className="flex flex-col">
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">CR</div>
            <div>
              <div className="text-sm font-semibold text-foreground">Carlos Ramírez</div>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-success" /> en línea · Hotel Aurora
              </div>
            </div>
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <span className="rounded-full border border-border px-2.5 py-1 text-[10px] font-medium text-foreground/70">VIP</span>
            <span className="rounded-full border border-border px-2.5 py-1 text-[10px] font-medium text-foreground/70">Recurrente</span>
          </div>
        </div>
        <div className="flex-1 space-y-3 bg-secondary/30 p-5">
          <div className="max-w-[75%] rounded-2xl rounded-tl-sm bg-background px-3.5 py-2.5 text-[13px] text-foreground shadow-sm">
            Hola, ¿tienen disponibilidad el 15 de julio para 2 personas?
          </div>
          <div className="ml-auto max-w-[75%] rounded-2xl rounded-tr-sm bg-primary px-3.5 py-2.5 text-[13px] text-primary-foreground">
            ¡Hola Carlos! Sí, tenemos la Suite 305 disponible del 15 al 18 de julio.
            ¿Te comparto tarifas?
          </div>
          <div className="max-w-[75%] rounded-2xl rounded-tl-sm bg-background px-3.5 py-2.5 text-[13px] text-foreground shadow-sm">
            Sí, por favor.
          </div>
          <div className="ml-auto flex max-w-[80%] items-start gap-2">
            <div className="rounded-2xl rounded-tr-sm bg-primary px-3.5 py-2.5 text-[13px] text-primary-foreground">
              Suite 305 · 3 noches · $7,020 total (incluye desayuno).
              <br />¿Bloqueo la reserva?
            </div>
          </div>
          <div className="mx-auto flex max-w-fit items-center gap-1.5 rounded-full bg-background/80 px-3 py-1 text-[10px] text-muted-foreground">
            <Sparkles className="h-3 w-3 text-accent" /> Respuesta sugerida por IA
          </div>
        </div>
        <div className="flex items-center gap-2 border-t border-border/60 bg-background px-5 py-3">
          <div className="flex flex-1 items-center rounded-full border border-border bg-secondary/40 px-3 py-2 text-[12px] text-muted-foreground">
            Escribir mensaje…
          </div>
          <button className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── ShotHousekeeping ─────────────────── */

export function ShotHousekeeping() {
  const rows = [
    { room: "Suite 204", status: "Sucia", assigned: "Ana G.", eta: "11:00", done: 4, total: 8, priority: true },
    { room: "Suite 305", status: "En proceso", assigned: "María L.", eta: "10:15", done: 6, total: 8 },
    { room: "Hab. 410", status: "Limpia", assigned: "Ana G.", eta: "—", done: 8, total: 8 },
    { room: "Hab. 118", status: "Sucia", assigned: "Carlos P.", eta: "12:30", done: 0, total: 8 },
    { room: "Junior 402", status: "Inspección", assigned: "Supervisor", eta: "10:40", done: 8, total: 8 },
  ];
  return (
    <div className={cn(pad, "bg-background")}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <BedDouble className="h-4 w-4 text-primary" /> Housekeeping · hoy
        </div>
        <div className="text-xs text-muted-foreground">18 tareas · 12 completadas</div>
      </div>
      <div className="mt-4 overflow-hidden rounded-xl border border-border/60">
        <div className="grid grid-cols-[120px_1fr_120px_80px_120px] gap-3 border-b border-border/60 bg-secondary/60 px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          <span>Habitación</span><span>Estado</span><span>Camarista</span><span>ETA</span><span>Checklist</span>
        </div>
        {rows.map((r) => (
          <div key={r.room} className="grid grid-cols-[120px_1fr_120px_80px_120px] items-center gap-3 border-b border-border/50 px-4 py-3 last:border-b-0 text-[12.5px]">
            <div className="flex items-center gap-2 font-medium text-foreground">
              {r.priority && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
              {r.room}
            </div>
            <div>
              <span className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
                r.status === "Limpia" && "bg-success/10 text-success",
                r.status === "En proceso" && "bg-info/10 text-info",
                r.status === "Sucia" && "bg-warning/15 text-warning-foreground",
                r.status === "Inspección" && "bg-primary/10 text-primary",
              )}>
                {r.status === "Limpia" ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
                {r.status}
              </span>
            </div>
            <div className="text-foreground/80">{r.assigned}</div>
            <div className="text-muted-foreground">{r.eta}</div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                <div className="h-full bg-primary" style={{ width: `${(r.done / r.total) * 100}%` }} />
              </div>
              <span className="text-[11px] tabular-nums text-muted-foreground">{r.done}/{r.total}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────── ShotDashboardKPIs ─────────────────── */

export function ShotDashboardKPIs() {
  const kpis = [
    { label: "Ocupación", value: "87%", trend: "+4.2%", icon: BedDouble },
    { label: "ADR", value: "$2,340", trend: "+1.8%", icon: TrendingUp },
    { label: "RevPAR", value: "$2,036", trend: "+6.1%", icon: Sparkles },
    { label: "Huéspedes hoy", value: "142", trend: "+12", icon: Users },
  ];
  const bars = [42, 58, 68, 75, 62, 88, 92, 78, 84, 91, 87, 95];
  return (
    <div className={cn(pad, "bg-background")}>
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-foreground">Panel · Hotel Aurora</div>
        <div className="text-xs text-muted-foreground">Últimos 12 meses</div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-border/60 bg-secondary/30 p-4">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] uppercase tracking-wide">{k.label}</span>
              <k.icon className="h-3.5 w-3.5" />
            </div>
            <div className="mt-2 text-2xl font-semibold text-foreground">{k.value}</div>
            <div className="text-[11px] font-medium text-success">{k.trend}</div>
          </div>
        ))}
      </div>
      <div className="mt-6 rounded-xl border border-border/60 p-4">
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium text-foreground">Ocupación mensual</div>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" /> 2026</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-border" /> 2025</span>
          </div>
        </div>
        <div className="mt-4 flex h-[120px] items-end gap-1.5">
          {bars.map((h, i) => (
            <div key={i} className="flex flex-1 flex-col justify-end gap-0.5">
              <div className="rounded-t bg-primary/90" style={{ height: `${h}%` }} />
              <div className="rounded-t bg-border" style={{ height: `${h - 12}%` }} />
            </div>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-12 text-[10px] text-muted-foreground">
          {["E","F","M","A","M","J","J","A","S","O","N","D"].map((m,i)=>(<div key={i} className="text-center">{m}</div>))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── ShotTarifasTemporada ─────────────────── */

export function ShotTarifasTemporada() {
  const cells = Array.from({ length: 35 }).map((_, i) => {
    const day = i - 2;
    const inMonth = day > 0 && day <= 31;
    const high = [5, 6, 12, 13, 19, 20, 26, 27].includes(day);
    const peak = [24, 25, 26, 27].includes(day);
    return { day, inMonth, high, peak };
  });
  return (
    <div className={cn(pad, "bg-background")}>
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-foreground">Tarifas · Diciembre 2026</div>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-secondary" /> Base $1,800</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-primary/40" /> Alta $2,400</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-accent" /> Pico $3,200</span>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-7 gap-1.5 text-center text-[10px] text-muted-foreground">
        {["Do","Lu","Ma","Mi","Ju","Vi","Sá"].map((d) => (<div key={d} className="py-1">{d}</div>))}
        {cells.map((c, i) => (
          <div
            key={i}
            className={cn(
              "aspect-square rounded-md text-left text-[11px]",
              !c.inMonth && "bg-transparent text-transparent",
              c.inMonth && !c.high && !c.peak && "bg-secondary/60 text-foreground",
              c.high && !c.peak && "bg-primary/25 text-primary",
              c.peak && "bg-accent text-accent-foreground",
            )}
          >
            {c.inMonth ? <div className="px-1.5 pt-1 font-medium">{c.day}</div> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────── ShotPOS ─────────────────── */

export function ShotPOS() {
  const items = [
    { name: "Filete de res", qty: 2, price: 480 },
    { name: "Ensalada César", qty: 1, price: 180 },
    { name: "Copa Malbec", qty: 3, price: 195 },
    { name: "Postre del día", qty: 2, price: 120 },
  ];
  const subtotal = items.reduce((a, i) => a + i.qty * i.price, 0);
  return (
    <div className="grid grid-cols-[1fr_260px] bg-background">
      <div className={cn(pad)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <UtensilsCrossed className="h-4 w-4 text-primary" /> Restaurante · Mesa 7
          </div>
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
            Cargar a Suite 305
          </span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {["Entradas","Fuertes","Bebidas","Vinos","Postres","Snacks"].map((c) => (
            <div key={c} className="rounded-lg border border-border/60 bg-secondary/30 px-3 py-2 text-[12px] text-foreground/80">
              {c}
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {["Filete de res","Salmón teriyaki","Ensalada César","Pasta al pesto"].map((p) => (
            <div key={p} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-3 text-[12.5px]">
              <span className="text-foreground">{p}</span>
              <span className="text-muted-foreground">${240 + p.length * 6}</span>
            </div>
          ))}
        </div>
      </div>
      <aside className="border-l border-border/60 bg-secondary/30 p-5">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">Cuenta</div>
        <div className="mt-3 space-y-2 text-[12.5px]">
          {items.map((i) => (
            <div key={i.name} className="flex justify-between">
              <span className="text-foreground/85">{i.qty} × {i.name}</span>
              <span className="tabular-nums text-foreground">${i.qty * i.price}</span>
            </div>
          ))}
        </div>
        <div className="my-3 h-px bg-border" />
        <div className="flex justify-between text-[13px] font-semibold text-foreground">
          <span>Total</span><span>${subtotal.toLocaleString()}</span>
        </div>
        <button className="mt-4 w-full rounded-full bg-primary py-2.5 text-[13px] font-medium text-primary-foreground">
          Enviar a cocina
        </button>
      </aside>
    </div>
  );
}

/* ─────────────────── ShotReportes ─────────────────── */

export function ShotReportes() {
  const points = [30, 42, 38, 55, 62, 58, 72, 78, 74, 88, 82, 95];
  const path = points
    .map((p, i) => `${(i / (points.length - 1)) * 100},${100 - p}`)
    .join(" L ");
  return (
    <div className={cn(pad, "bg-background")}>
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-foreground">Ingresos por canal · YTD</div>
        <button className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
          Exportar <ArrowUpRight className="h-3 w-3" />
        </button>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3 text-[11px]">
        {[
          { l: "Directo", v: "48%", n: "$1.42M" },
          { l: "Booking", v: "27%", n: "$798K" },
          { l: "Airbnb / Expedia", v: "25%", n: "$742K" },
        ].map((r) => (
          <div key={r.l} className="rounded-lg border border-border/60 p-3">
            <div className="text-muted-foreground">{r.l}</div>
            <div className="text-lg font-semibold text-foreground">{r.n}</div>
            <div className="text-primary">{r.v}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 h-[140px] rounded-lg border border-border/60 p-3">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
          <defs>
            <linearGradient id="g" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.25" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`M 0,${100 - points[0]} L ${path} L 100,100 L 0,100 Z`} fill="url(#g)" />
          <path d={`M 0,${100 - points[0]} L ${path}`} fill="none" stroke="hsl(var(--primary))" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
    </div>
  );
}

/* ─────────────────── ShotCheckIn ─────────────────── */

export function ShotCheckIn() {
  return (
    <div className={cn(pad, "bg-background")}>
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-foreground">Check-in · RES-2026-2042</div>
        <span className="rounded-full bg-accent/10 px-2.5 py-1 text-[11px] font-medium text-accent">Paso 3 de 4</span>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-4 text-[12.5px]">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Huésped</div>
          <div className="mt-1 text-foreground">Emily Johnson</div>
          <div className="text-muted-foreground">emily.johnson@mail.com</div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Estancia</div>
          <div className="mt-1 text-foreground">Hab. 118 · 2 noches</div>
          <div className="text-muted-foreground">12 Jul → 14 Jul · 2 huéspedes</div>
        </div>
      </div>
      <div className="mt-5 rounded-xl border border-border/60 bg-secondary/30 p-4">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Firma digital</div>
        <div className="mt-2 flex h-20 items-center justify-center rounded-lg border border-dashed border-border bg-background text-[11px] text-muted-foreground">
          <span className="italic text-foreground/60">Emily J.</span>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="inline-flex items-center gap-2 text-[11px] text-muted-foreground">
          <Clock className="h-3.5 w-3.5" /> Tiempo promedio: 3m 40s
        </span>
        <button className="rounded-full bg-primary px-4 py-2 text-[12px] font-medium text-primary-foreground">
          Finalizar check-in
        </button>
      </div>
    </div>
  );
}

/* ─────────────────── ShotMultiHotel ─────────────────── */

export function ShotMultiHotel() {
  const hoteles = [
    { name: "Hotel Aurora", city: "CDMX", occ: 87, rev: "$186K" },
    { name: "Hotel Costa Azul", city: "Cancún", occ: 92, rev: "$248K" },
    { name: "Hotel Vista Mar", city: "Puerto Vallarta", occ: 74, rev: "$142K" },
    { name: "Casa Petra", city: "Oaxaca", occ: 68, rev: "$92K" },
    { name: "Marea Norte", city: "Ensenada", occ: 81, rev: "$118K" },
  ];
  return (
    <div className={cn(pad, "bg-background")}>
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-foreground">Todos los hoteles</div>
        <div className="text-xs text-muted-foreground">5 propiedades · consolidado</div>
      </div>
      <div className="mt-4 divide-y divide-border/60 rounded-xl border border-border/60">
        {hoteles.map((h) => (
          <div key={h.name} className="grid grid-cols-[1fr_120px_100px_80px] items-center gap-4 px-4 py-3 text-[12.5px]">
            <div>
              <div className="font-medium text-foreground">{h.name}</div>
              <div className="text-[11px] text-muted-foreground">{h.city}</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                <div className="h-full bg-primary" style={{ width: `${h.occ}%` }} />
              </div>
              <span className="w-8 text-right text-[11px] tabular-nums text-muted-foreground">{h.occ}%</span>
            </div>
            <div className="text-right tabular-nums text-foreground">{h.rev}</div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                Ver <ArrowUpRight className="h-2.5 w-2.5" />
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────── ShotMotor ─────────────────── */

export function ShotMotorReservas() {
  return (
    <div className={cn(pad, "bg-background")}>
      <div className="text-sm font-semibold text-foreground">Reservar en Hotel Aurora</div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-[12px]">
        {[
          { l: "Llegada", v: "12 Jul 2026" },
          { l: "Salida", v: "15 Jul 2026" },
          { l: "Adultos", v: "2" },
          { l: "Niños", v: "0" },
        ].map((f) => (
          <div key={f.l} className="rounded-lg border border-border/60 px-3 py-2.5">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{f.l}</div>
            <div className="text-foreground">{f.v}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 space-y-3">
        {[
          { name: "Suite 204 · Vista Ciudad", price: "$2,340", note: "Incluye desayuno" },
          { name: "Junior 402 · Terraza", price: "$1,980", note: "Cancelación gratis" },
        ].map((r) => (
          <div key={r.name} className="flex items-center justify-between rounded-xl border border-border/60 p-3">
            <div>
              <div className="text-[13px] font-medium text-foreground">{r.name}</div>
              <div className="text-[11px] text-muted-foreground">{r.note}</div>
            </div>
            <div className="text-right">
              <div className="text-[13px] font-semibold text-foreground">{r.price}</div>
              <div className="text-[10px] text-muted-foreground">por noche</div>
            </div>
          </div>
        ))}
      </div>
      <button className="mt-4 w-full rounded-full bg-accent py-2.5 text-[13px] font-medium text-accent-foreground">
        Reservar ahora
      </button>
    </div>
  );
}

/* ─────────────────── ShotAutomatizaciones ─────────────────── */

export function ShotAutomatizaciones() {
  const flows = [
    { icon: MessageCircle, name: "Confirmación por WhatsApp", trigger: "Nueva reserva", active: true },
    { icon: Sparkles, name: "Recordatorio 24h antes", trigger: "T-24h de check-in", active: true },
    { icon: CheckCircle2, name: "Pedir reseña Google", trigger: "24h después de check-out", active: true },
    { icon: Users, name: "Aviso VIP a gerencia", trigger: "Huésped recurrente detectado", active: false },
  ];
  return (
    <div className={cn(pad, "bg-background")}>
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-foreground">Automatizaciones</div>
        <span className="text-xs text-muted-foreground">3 activas</span>
      </div>
      <div className="mt-4 space-y-2">
        {flows.map((f) => (
          <div key={f.name} className="flex items-center justify-between rounded-xl border border-border/60 p-3">
            <div className="flex items-center gap-3">
              <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", f.active ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground")}>
                <f.icon className="h-4 w-4" />
              </div>
              <div>
                <div className="text-[13px] font-medium text-foreground">{f.name}</div>
                <div className="text-[11px] text-muted-foreground">Cuando: {f.trigger}</div>
              </div>
            </div>
            <div className={cn(
              "flex h-5 w-9 items-center rounded-full p-0.5 transition-colors",
              f.active ? "bg-primary justify-end" : "bg-border justify-start",
            )}>
              <span className="h-4 w-4 rounded-full bg-background" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}