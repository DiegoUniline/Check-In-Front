import { Clock, CheckCircle2, LogIn, LogOut, XCircle, AlertTriangle, Wrench, Sparkles, HelpCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface EstadoConfig {
  label: string;
  icon: LucideIcon;
  /** Tailwind classes for a solid block (e.g. timeline cell) */
  block: string;
  /** Tailwind classes for a soft badge */
  badge: string;
  /** Left border accent for cards */
  borderLeft: string;
  /** Avatar circle */
  avatarBg: string;
  avatarText: string;
}

const registry: Record<string, EstadoConfig> = {
  Pendiente: {
    label: 'Pendiente',
    icon: Clock,
    block: 'bg-amber-500 hover:bg-amber-600 text-white',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-900',
    borderLeft: 'border-l-amber-500',
    avatarBg: 'bg-amber-100 dark:bg-amber-950/40',
    avatarText: 'text-amber-700 dark:text-amber-300',
  },
  Confirmada: {
    label: 'Confirmada',
    icon: CheckCircle2,
    block: 'bg-sky-500 hover:bg-sky-600 text-white',
    badge: 'bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300 border border-sky-200 dark:border-sky-900',
    borderLeft: 'border-l-sky-500',
    avatarBg: 'bg-sky-100 dark:bg-sky-950/40',
    avatarText: 'text-sky-700 dark:text-sky-300',
  },
  CheckIn: {
    label: 'Check-In',
    icon: LogIn,
    block: 'bg-emerald-500 hover:bg-emerald-600 text-white',
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900',
    borderLeft: 'border-l-emerald-500',
    avatarBg: 'bg-emerald-100 dark:bg-emerald-950/40',
    avatarText: 'text-emerald-700 dark:text-emerald-300',
  },
  Hospedado: {
    label: 'Hospedado',
    icon: LogIn,
    block: 'bg-emerald-500 hover:bg-emerald-600 text-white',
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900',
    borderLeft: 'border-l-emerald-500',
    avatarBg: 'bg-emerald-100 dark:bg-emerald-950/40',
    avatarText: 'text-emerald-700 dark:text-emerald-300',
  },
  CheckOut: {
    label: 'Check-Out',
    icon: LogOut,
    block: 'bg-slate-500 hover:bg-slate-600 text-white',
    badge: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700',
    borderLeft: 'border-l-slate-500',
    avatarBg: 'bg-slate-100 dark:bg-slate-800',
    avatarText: 'text-slate-700 dark:text-slate-200',
  },
  Cancelada: {
    label: 'Cancelada',
    icon: XCircle,
    block: 'bg-rose-500 hover:bg-rose-600 text-white',
    badge: 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900',
    borderLeft: 'border-l-rose-500',
    avatarBg: 'bg-rose-100 dark:bg-rose-950/40',
    avatarText: 'text-rose-700 dark:text-rose-300',
  },
  NoShow: {
    label: 'No Show',
    icon: AlertTriangle,
    block: 'bg-orange-500 hover:bg-orange-600 text-white',
    badge: 'bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300 border border-orange-200 dark:border-orange-900',
    borderLeft: 'border-l-orange-500',
    avatarBg: 'bg-orange-100 dark:bg-orange-950/40',
    avatarText: 'text-orange-700 dark:text-orange-300',
  },
  Mantenimiento: {
    label: 'Mantenimiento',
    icon: Wrench,
    block: 'bg-zinc-500 hover:bg-zinc-600 text-white',
    badge: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700',
    borderLeft: 'border-l-zinc-500',
    avatarBg: 'bg-zinc-100 dark:bg-zinc-800',
    avatarText: 'text-zinc-700 dark:text-zinc-200',
  },
  Limpieza: {
    label: 'Limpieza',
    icon: Sparkles,
    block: 'bg-violet-500 hover:bg-violet-600 text-white',
    badge: 'bg-violet-100 text-violet-800 dark:bg-violet-950/40 dark:text-violet-300 border border-violet-200 dark:border-violet-900',
    borderLeft: 'border-l-violet-500',
    avatarBg: 'bg-violet-100 dark:bg-violet-950/40',
    avatarText: 'text-violet-700 dark:text-violet-300',
  },
};

const fallback: EstadoConfig = {
  label: 'Desconocido',
  icon: HelpCircle,
  block: 'bg-muted text-muted-foreground',
  badge: 'bg-muted text-muted-foreground border border-border',
  borderLeft: 'border-l-muted-foreground/40',
  avatarBg: 'bg-muted',
  avatarText: 'text-muted-foreground',
};

export function getEstadoConfig(estado: string | undefined | null): EstadoConfig {
  if (!estado) return fallback;
  return registry[estado] || fallback;
}

export const ESTADOS_RESERVA = ['Pendiente', 'Confirmada', 'CheckIn', 'CheckOut', 'Cancelada', 'NoShow'] as const;