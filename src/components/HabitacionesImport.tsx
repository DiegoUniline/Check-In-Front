import { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Download, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';

interface Props {
  tiposHabitacion: any[];
  onImported: () => void;
}

type RowResult = { numero: string; status: 'ok' | 'error'; message?: string };

const ESTADOS = ['Disponible', 'Ocupada', 'Reservada', 'Bloqueada'];
const LIMPIEZA = ['Limpia', 'Sucia', 'En limpieza'];
const MANTENIMIENTO = ['OK', 'Pendiente', 'En proceso'];

export function HabitacionesImport({ tiposHabitacion, onImported }: Props) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<RowResult[]>([]);

  const descargarPlantilla = () => {
    const wb = XLSX.utils.book_new();

    // Hoja principal con encabezados + 3 filas ejemplo
    const ejemplo = [
      {
        Numero: '101',
        Tipo: tiposHabitacion[0]?.nombre || 'Sencilla',
        Piso: 1,
        Estado: 'Disponible',
        Limpieza: 'Limpia',
        Mantenimiento: 'OK',
        ExcluidaWeb: 'NO',
      },
      {
        Numero: '102',
        Tipo: tiposHabitacion[0]?.nombre || 'Sencilla',
        Piso: 1,
        Estado: 'Disponible',
        Limpieza: 'Limpia',
        Mantenimiento: 'OK',
        ExcluidaWeb: 'NO',
      },
      {
        Numero: '201',
        Tipo: tiposHabitacion[1]?.nombre || tiposHabitacion[0]?.nombre || 'Doble',
        Piso: 2,
        Estado: 'Disponible',
        Limpieza: 'Limpia',
        Mantenimiento: 'OK',
        ExcluidaWeb: 'NO',
      },
    ];
    const ws = XLSX.utils.json_to_sheet(ejemplo);
    ws['!cols'] = [
      { wch: 12 }, { wch: 22 }, { wch: 8 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 14 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Habitaciones');

    // Hoja de instrucciones
    const instrucciones = [
      ['PLANTILLA DE IMPORTACIÓN — HABITACIONES VULO'],
      [],
      ['Instrucciones:'],
      ['1. Llena la hoja "Habitaciones" (borra los ejemplos).'],
      ['2. Solo "Numero" y "Tipo" son obligatorios.'],
      ['3. "Tipo" debe coincidir EXACTO con un nombre de la hoja "Tipos".'],
      ['4. "ExcluidaWeb": SI la ocultas del sitio público, NO si se publica.'],
      ['5. Guarda como .xlsx y súbelo con el botón "Importar".'],
      [],
      ['Valores válidos:'],
      ['Estado', ESTADOS.join(' | ')],
      ['Limpieza', LIMPIEZA.join(' | ')],
      ['Mantenimiento', MANTENIMIENTO.join(' | ')],
      ['ExcluidaWeb', 'SI | NO'],
    ];
    const wsI = XLSX.utils.aoa_to_sheet(instrucciones);
    wsI['!cols'] = [{ wch: 20 }, { wch: 60 }];
    XLSX.utils.book_append_sheet(wb, wsI, 'Instrucciones');

    // Hoja de tipos disponibles
    const tipos = [['Nombre', 'Código']].concat(
      (tiposHabitacion || []).map((t: any) => [t.nombre, t.codigo || ''])
    );
    const wsT = XLSX.utils.aoa_to_sheet(tipos);
    wsT['!cols'] = [{ wch: 24 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsT, 'Tipos');

    XLSX.writeFile(wb, 'plantilla_habitaciones.xlsx');
  };

  const parseBool = (v: any) => {
    const s = String(v ?? '').trim().toLowerCase();
    return s === 'si' || s === 'sí' || s === 'true' || s === '1' || s === 'yes';
  };

  const handleFile = async (file: File) => {
    setImporting(true);
    setResults([]);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const sheet = wb.Sheets['Habitaciones'] || wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      const tiposMap = new Map<string, string>();
      tiposHabitacion.forEach((t: any) => {
        tiposMap.set(String(t.nombre).trim().toLowerCase(), t.id);
        if (t.codigo) tiposMap.set(String(t.codigo).trim().toLowerCase(), t.id);
      });

      const out: RowResult[] = [];
      for (const row of rows) {
        const numero = String(row.Numero ?? row.numero ?? '').trim();
        const tipoNombre = String(row.Tipo ?? row.tipo ?? '').trim();
        if (!numero) {
          out.push({ numero: '(vacío)', status: 'error', message: 'Falta Numero' });
          continue;
        }
        const tipoId = tiposMap.get(tipoNombre.toLowerCase());
        if (!tipoId) {
          out.push({ numero, status: 'error', message: `Tipo "${tipoNombre}" no existe` });
          continue;
        }
        const pisoNum = parseInt(String(row.Piso ?? row.piso ?? ''), 10);
        try {
          await api.createHabitacion({
            numero,
            tipo_habitacion_id: tipoId,
            piso: isNaN(pisoNum) ? null : pisoNum,
            estado_habitacion: ESTADOS.includes(row.Estado) ? row.Estado : 'Disponible',
            estado_limpieza: LIMPIEZA.includes(row.Limpieza) ? row.Limpieza : 'Limpia',
            estado_mantenimiento: MANTENIMIENTO.includes(row.Mantenimiento) ? row.Mantenimiento : 'OK',
            excluida_publica: parseBool(row.ExcluidaWeb),
            fotos: [],
          });
          out.push({ numero, status: 'ok' });
        } catch (e: any) {
          out.push({ numero, status: 'error', message: e?.message || 'Error al crear' });
        }
      }
      setResults(out);
      const okCount = out.filter(r => r.status === 'ok').length;
      const errCount = out.length - okCount;
      toast({
        title: 'Importación finalizada',
        description: `${okCount} creadas · ${errCount} con error`,
        variant: errCount > 0 && okCount === 0 ? 'destructive' : undefined,
      });
      if (okCount > 0) onImported();
    } catch (e: any) {
      toast({ title: 'Error al leer archivo', description: e?.message || 'Archivo inválido', variant: 'destructive' });
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Upload className="h-4 w-4 mr-2" />
        Importar
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Importar habitaciones</DialogTitle>
            <DialogDescription>
              Descarga la plantilla, llénala en Excel y súbela para dar de alta muchas habitaciones a la vez.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Button variant="outline" onClick={descargarPlantilla} className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Descargar plantilla .xlsx
            </Button>

            <div className="rounded-md border border-dashed p-4 text-center">
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
              <Button
                onClick={() => fileRef.current?.click()}
                disabled={importing}
                className="w-full"
              >
                {importing ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importando…</>
                ) : (
                  <><Upload className="h-4 w-4 mr-2" /> Subir archivo llenado</>
                )}
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Se lee la hoja "Habitaciones". "Numero" y "Tipo" son obligatorios.
              </p>
            </div>

            {results.length > 0 && (
              <div className="max-h-56 overflow-auto rounded-md border text-sm">
                {results.map((r, i) => (
                  <div
                    key={i}
                    className={`flex justify-between px-3 py-1.5 border-b last:border-0 ${
                      r.status === 'error' ? 'bg-destructive/5 text-destructive' : ''
                    }`}
                  >
                    <span className="font-medium">{r.numero}</span>
                    <span className="text-xs">
                      {r.status === 'ok' ? 'Creada ✓' : r.message}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}