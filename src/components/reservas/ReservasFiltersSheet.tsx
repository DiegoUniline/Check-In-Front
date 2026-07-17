import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { X } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { ESTADOS_RESERVA } from './estadoConfig';

export interface ReservasFilters {
  desde: string;
  hasta: string;
  estado: string;
  tipoHabitacion: string;
  origen: string;
  soloConSaldo: boolean;
}

export const defaultFilters: ReservasFilters = {
  desde: '',
  hasta: '',
  estado: 'todos',
  tipoHabitacion: 'all',
  origen: 'todos',
  soloConSaldo: false,
};

export function countActiveFilters(f: ReservasFilters): number {
  let n = 0;
  if (f.desde) n++;
  if (f.hasta) n++;
  if (f.estado !== 'todos') n++;
  if (f.tipoHabitacion !== 'all') n++;
  if (f.origen !== 'todos') n++;
  if (f.soloConSaldo) n++;
  return n;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  value: ReservasFilters;
  onApply: (f: ReservasFilters) => void;
  tiposHabitacion: { id: string; nombre: string }[];
}

export function ReservasFiltersSheet({ open, onOpenChange, value, onApply, tiposHabitacion }: Props) {
  const isMobile = useIsMobile();
  const [draft, setDraft] = useState<ReservasFilters>(value);

  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  const apply = () => {
    onApply(draft);
    onOpenChange(false);
  };
  const reset = () => setDraft(defaultFilters);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className="p-0 flex flex-col gap-0 w-full sm:max-w-md"
        style={{
          height: isMobile ? '100dvh' : undefined,
          maxHeight: isMobile ? '100dvh' : undefined,
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {/* Header sticky */}
        <SheetHeader className="px-4 py-3 border-b flex flex-row items-center justify-between space-y-0 sticky top-0 bg-background z-10">
          <SheetTitle className="text-base">Filtros</SheetTitle>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={reset} className="h-8">
              Limpiar
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onOpenChange(false)}
              aria-label="Cerrar filtros"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Desde</Label>
              <Input
                type="date"
                value={draft.desde}
                onChange={(e) => setDraft({ ...draft, desde: e.target.value })}
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Hasta</Label>
              <Input
                type="date"
                value={draft.hasta}
                onChange={(e) => setDraft({ ...draft, hasta: e.target.value })}
                className="h-10"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Estado</Label>
            <Select
              value={draft.estado}
              onValueChange={(v) => setDraft({ ...draft, estado: v })}
            >
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                {ESTADOS_RESERVA.map((e) => (
                  <SelectItem key={e} value={e}>{e}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Tipo de habitación</Label>
            <Select
              value={draft.tipoHabitacion}
              onValueChange={(v) => setDraft({ ...draft, tipoHabitacion: v })}
            >
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {tiposHabitacion.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Canal / origen</Label>
            <Select
              value={draft.origen}
              onValueChange={(v) => setDraft({ ...draft, origen: v })}
            >
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los canales</SelectItem>
                <SelectItem value="Recepcion">Recepción</SelectItem>
                <SelectItem value="Web">Web</SelectItem>
                <SelectItem value="Telefono">Teléfono</SelectItem>
                <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                <SelectItem value="Reserva">Reserva</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Solo con saldo pendiente</p>
              <p className="text-xs text-muted-foreground">Reservas con adeudo mayor a cero</p>
            </div>
            <Switch
              checked={draft.soloConSaldo}
              onCheckedChange={(v) => setDraft({ ...draft, soloConSaldo: v })}
            />
          </div>
        </div>

        {/* Sticky footer */}
        <div
          className="border-t px-4 py-3 bg-background sticky bottom-0"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <Button className="w-full h-11" onClick={apply}>
            Aplicar filtros
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}