import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { COUNTRY_CODES, joinPhone } from '@/lib/phoneCountries';

// Extrae solo el emoji de bandera del label ("🇲🇽 México" -> "🇲🇽").
function flagOf(label: string) {
  const m = label.match(/^\p{Extended_Pictographic}+/u);
  return m ? m[0] : label.split(' ')[0];
}

interface Props {
  country: string;
  localPhone: string;
  onCountryChange: (c: string) => void;
  onLocalPhoneChange: (v: string) => void;
  showPreview?: boolean;
}

export function PhoneInput({ country, localPhone, onCountryChange, onLocalPhoneChange, showPreview = true }: Props) {
  return (
    <div>
      <div className="flex gap-2">
        <Select value={country} onValueChange={onCountryChange}>
          <SelectTrigger className="w-[110px] shrink-0">
            <SelectValue>
              {(() => {
                const c = COUNTRY_CODES.find((x) => x.code === country) || COUNTRY_CODES[0];
                return <span className="flex items-center gap-1">{flagOf(c.label)} +{c.dial}</span>;
              })()}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {COUNTRY_CODES.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.label} (+{c.dial})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          className="flex-1 min-w-0"
          inputMode="tel"
          placeholder={country === 'MX' ? '3171035768' : 'Número'}
          value={localPhone}
          onChange={(e) => onLocalPhoneChange(e.target.value.replace(/\D/g, ''))}
        />
      </div>
      {showPreview && localPhone && (
        <p className="text-[11px] text-muted-foreground mt-1">
          WhatsApp: +{joinPhone(country, localPhone)}
        </p>
      )}
    </div>
  );
}