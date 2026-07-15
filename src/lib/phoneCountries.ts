// Códigos de país + prefijo real que WhatsApp guarda (MX móvil = 521, AR = 549).
export interface CountryCode {
  code: string;
  label: string;
  dial: string;
  waPrefix: string;
}

export const COUNTRY_CODES: CountryCode[] = [
  { code: 'MX', label: '🇲🇽 México', dial: '52', waPrefix: '521' },
  { code: 'US', label: '🇺🇸 Estados Unidos', dial: '1', waPrefix: '1' },
  { code: 'CA', label: '🇨🇦 Canadá', dial: '1', waPrefix: '1' },
  { code: 'AR', label: '🇦🇷 Argentina', dial: '54', waPrefix: '549' },
  { code: 'BR', label: '🇧🇷 Brasil', dial: '55', waPrefix: '55' },
  { code: 'CL', label: '🇨🇱 Chile', dial: '56', waPrefix: '56' },
  { code: 'CO', label: '🇨🇴 Colombia', dial: '57', waPrefix: '57' },
  { code: 'PE', label: '🇵🇪 Perú', dial: '51', waPrefix: '51' },
  { code: 'EC', label: '🇪🇨 Ecuador', dial: '593', waPrefix: '593' },
  { code: 'VE', label: '🇻🇪 Venezuela', dial: '58', waPrefix: '58' },
  { code: 'UY', label: '🇺🇾 Uruguay', dial: '598', waPrefix: '598' },
  { code: 'PY', label: '🇵🇾 Paraguay', dial: '595', waPrefix: '595' },
  { code: 'BO', label: '🇧🇴 Bolivia', dial: '591', waPrefix: '591' },
  { code: 'CR', label: '🇨🇷 Costa Rica', dial: '506', waPrefix: '506' },
  { code: 'PA', label: '🇵🇦 Panamá', dial: '507', waPrefix: '507' },
  { code: 'GT', label: '🇬🇹 Guatemala', dial: '502', waPrefix: '502' },
  { code: 'HN', label: '🇭🇳 Honduras', dial: '504', waPrefix: '504' },
  { code: 'SV', label: '🇸🇻 El Salvador', dial: '503', waPrefix: '503' },
  { code: 'NI', label: '🇳🇮 Nicaragua', dial: '505', waPrefix: '505' },
  { code: 'DO', label: '🇩🇴 República Dominicana', dial: '1', waPrefix: '1' },
  { code: 'CU', label: '🇨🇺 Cuba', dial: '53', waPrefix: '53' },
  { code: 'ES', label: '🇪🇸 España', dial: '34', waPrefix: '34' },
  { code: 'FR', label: '🇫🇷 Francia', dial: '33', waPrefix: '33' },
  { code: 'DE', label: '🇩🇪 Alemania', dial: '49', waPrefix: '49' },
  { code: 'IT', label: '🇮🇹 Italia', dial: '39', waPrefix: '39' },
  { code: 'GB', label: '🇬🇧 Reino Unido', dial: '44', waPrefix: '44' },
];

export const DEFAULT_COUNTRY = 'MX';

/** Divide un teléfono completo (con o sin '+') en país + número local. */
export function splitPhone(raw: string | null | undefined): { country: string; local: string } {
  if (!raw) return { country: DEFAULT_COUNTRY, local: '' };
  const digits = String(raw).replace(/\D/g, '');
  if (!digits) return { country: DEFAULT_COUNTRY, local: '' };
  const byWa = [...COUNTRY_CODES].sort((a, b) => b.waPrefix.length - a.waPrefix.length);
  for (const c of byWa) {
    if (digits.startsWith(c.waPrefix)) return { country: c.code, local: digits.slice(c.waPrefix.length) };
  }
  const byDial = [...COUNTRY_CODES].sort((a, b) => b.dial.length - a.dial.length);
  for (const c of byDial) {
    if (digits.startsWith(c.dial)) return { country: c.code, local: digits.slice(c.dial.length) };
  }
  return { country: DEFAULT_COUNTRY, local: digits };
}

/** Ensambla el teléfono completo listo para WhatsApp (sin '+'). */
export function joinPhone(countryCode: string, local: string): string {
  const c = COUNTRY_CODES.find((x) => x.code === countryCode) || COUNTRY_CODES[0];
  const clean = (local || '').replace(/\D/g, '');
  if (!clean) return '';
  return `${c.waPrefix}${clean}`;
}