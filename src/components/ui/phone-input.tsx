import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { COUNTRY_CODES, joinPhone } from '@/lib/phoneCountries';

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
          <SelectTrigger className="w-[170px]">
            <SelectValue />
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
          className="flex-1"
          inputMode="tel"
          placeholder={country === 'MX' ? '3171035768 (10 dígitos)' : 'Número local'}
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