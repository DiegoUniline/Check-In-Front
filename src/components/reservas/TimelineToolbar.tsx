import { useState } from 'react';
import { CalendarDays, Download, Plus, ChevronLeft, ChevronRight, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, addDays, subDays } from 'date-fns';
import { es } from 'date-fns/locale';

interface TimelineToolbarProps {
  viewMode: 'dia' | 'semana' | 'mes';
  onViewModeChange: (mode: 'dia' | 'semana' | 'mes') => void;
  startDate: Date;
  onDateChange: (date: Date) => void;
  tipoFilter: string;
  onTipoFilterChange: (tipo: string) => void;
  onNewReservation: () => void;
  tiposHabitacion: any[];
}

export function TimelineToolbar({
  viewMode,
  onViewModeChange,
  startDate,
  onDateChange,
  tipoFilter,
  onTipoFilterChange,
  onNewReservation,
  tiposHabitacion,
}: TimelineToolbarProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);

  const handlePrev = () => {
    const days = viewMode === 'dia' ? 1 : viewMode === 'semana' ? 7 : 30;
    onDateChange(subDays(startDate, days));
  };

  const handleNext = () => {
    const days = viewMode === 'dia' ? 1 : viewMode === 'semana' ? 7 : 30;
    onDateChange(addDays(startDate, days));
  };

  const handleToday = () => {
    onDateChange(new Date());
  };

  return (
    <div className="flex flex-col gap-4 mb-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Recepción</h1>
          <p className="text-sm text-muted-foreground">
            Gestión de check-ins, check-outs y ocupación
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
          <Button size="sm" onClick={onNewReservation}>
            <UserPlus className="mr-2 h-4 w-4" />
            Nueva Entrada
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 bg-card rounded-lg border">
        <div className="flex items-center gap-4 flex-wrap">
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(value) => value && onViewModeChange(value as 'dia' | 'semana' | 'mes')}
            className="bg-muted p-1 rounded-lg"
          >
            <ToggleGroupItem value="dia" className="px-4 data-[state=on]:bg-background">Día</ToggleGroupItem>
            <ToggleGroupItem value="semana" className="px-4 data-[state=on]:bg-background">Semana</ToggleGroupItem>
            <ToggleGroupItem value="mes" className="px-4 data-[state=on]:bg-background">Mes</ToggleGroupItem>
          </ToggleGroup>

          <Select value={tipoFilter} onValueChange={onTipoFilterChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Todas las habitaciones" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las habitaciones</SelectItem>
              {tiposHabitacion.map((tipo) => (
                <SelectItem key={tipo.id} value={tipo.id}>{tipo.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="min-w-[200px] justify-start">
                <CalendarDays className="mr-2 h-4 w-4" />
                {format(startDate, "d 'de' MMMM, yyyy", { locale: es })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={(date) => {
                  if (date) {
                    onDateChange(date);
                    setCalendarOpen(false);
                  }
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Button variant="outline" size="icon" onClick={handleNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>

          <Button variant="secondary" size="sm" onClick={handleToday}>Hoy</Button>
        </div>
      </div>
    </div>
  );
}
