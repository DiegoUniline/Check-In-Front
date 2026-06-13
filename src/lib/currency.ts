// Moneda activa del hotel. Cambiar aquí se refleja en toda la app vía formatCurrency().
import { useEffect, useState } from 'react';

export interface HotelCurrency {
  codigo: string;   // ISO 4217 (MXN, USD, EUR, COP, ...)
  simbolo: string;  // $, €, S/, Bs, ...
  locale: string;   // es-MX, en-US, es-CO, ...
}

const DEFAULT_CURRENCY: HotelCurrency = {
  codigo: 'MXN',
  simbolo: '$',
  locale: 'es-MX',
};

export const CURRENCY_PRESETS: HotelCurrency[] = [
  { codigo: 'MXN', simbolo: '$',  locale: 'es-MX' },
  { codigo: 'USD', simbolo: '$',  locale: 'en-US' },
  { codigo: 'EUR', simbolo: '€',  locale: 'es-ES' },
  { codigo: 'COP', simbolo: '$',  locale: 'es-CO' },
  { codigo: 'ARS', simbolo: '$',  locale: 'es-AR' },
  { codigo: 'CLP', simbolo: '$',  locale: 'es-CL' },
  { codigo: 'PEN', simbolo: 'S/', locale: 'es-PE' },
  { codigo: 'BRL', simbolo: 'R$', locale: 'pt-BR' },
  { codigo: 'GTQ', simbolo: 'Q',  locale: 'es-GT' },
  { codigo: 'DOP', simbolo: 'RD$',locale: 'es-DO' },
  { codigo: 'CRC', simbolo: '₡',  locale: 'es-CR' },
  { codigo: 'UYU', simbolo: '$U', locale: 'es-UY' },
  { codigo: 'BOB', simbolo: 'Bs', locale: 'es-BO' },
  { codigo: 'PYG', simbolo: '₲',  locale: 'es-PY' },
  { codigo: 'VES', simbolo: 'Bs', locale: 'es-VE' },
  { codigo: 'HNL', simbolo: 'L',  locale: 'es-HN' },
  { codigo: 'NIO', simbolo: 'C$', locale: 'es-NI' },
  { codigo: 'PAB', simbolo: 'B/.',locale: 'es-PA' },
  { codigo: 'GBP', simbolo: '£',  locale: 'en-GB' },
];

let CURRENT: HotelCurrency = { ...DEFAULT_CURRENCY };

// Restaurar última moneda conocida del navegador para evitar parpadeo al recargar.
try {
  const raw = typeof window !== 'undefined' ? localStorage.getItem('hotel_currency') : null;
  if (raw) {
    const parsed = JSON.parse(raw);
    if (parsed?.codigo) CURRENT = { ...DEFAULT_CURRENCY, ...parsed };
  }
} catch { /* ignore */ }

const listeners = new Set<() => void>();

export function getHotelCurrency(): HotelCurrency {
  return CURRENT;
}

export function setHotelCurrency(c: Partial<HotelCurrency> | null | undefined) {
  if (!c) return;
  const next: HotelCurrency = {
    codigo: (c.codigo || CURRENT.codigo || 'MXN').toUpperCase(),
    simbolo: c.simbolo || CURRENT.simbolo || '$',
    locale: c.locale || CURRENT.locale || 'es-MX',
  };
  if (
    next.codigo === CURRENT.codigo &&
    next.simbolo === CURRENT.simbolo &&
    next.locale === CURRENT.locale
  ) return;
  CURRENT = next;
  try { localStorage.setItem('hotel_currency', JSON.stringify(CURRENT)); } catch { /* ignore */ }
  listeners.forEach((l) => { try { l(); } catch { /* ignore */ } });
}

function safeNumber(v: any): number {
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Formatea un monto usando la moneda activa del hotel.
 * Devuelve algo como "$1,234.50", "€1.234,50", "S/ 1,234.50", etc.
 */
export function formatCurrency(
  amount: number | string | null | undefined,
  opts: { decimals?: number; compact?: boolean } = {}
): string {
  const n = safeNumber(amount);
  const { codigo, locale } = CURRENT;
  const decimals = opts.decimals ?? 2;
  try {
    if (opts.compact) {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: codigo,
        notation: 'compact',
        maximumFractionDigits: 1,
      }).format(n);
    }
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: codigo,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(n);
  } catch {
    return `${CURRENT.simbolo}${n.toFixed(decimals)}`;
  }
}

/** Símbolo simple para etiquetas/inputs. */
export function currencySymbol(): string {
  return CURRENT.simbolo;
}

/** Código ISO. */
export function currencyCode(): string {
  return CURRENT.codigo;
}

/** Suscripción reactiva — útil para forzar re-render al cambiar de hotel. */
export function useCurrency(): HotelCurrency {
  const [c, setC] = useState<HotelCurrency>(CURRENT);
  useEffect(() => {
    const l = () => setC({ ...CURRENT });
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);
  return c;
}