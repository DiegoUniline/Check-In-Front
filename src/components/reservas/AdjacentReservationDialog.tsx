import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatDate } from '@/lib/dateFormat';
import { formatCurrency } from '@/lib/currency';

export type AdjacentSelection = {
  habitacion: any;
  fechaCheckin: Date;
  fechaCheckout: Date;
  reservas: any[];
};

export function AdjacentReservationDialog({ selection, onClose, onCreate, onAction, canExtend, canCancel }: {
  selection: AdjacentSelection | null;
  onClose: () => void;
  onCreate: () => void;
  onAction: (reservation: any, action: 'view' | 'extend_stay' | 'cancel') => void;
  canExtend: boolean;
  canCancel: boolean;
}) {
  return <Dialog open={Boolean(selection)} onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent className="sm:max-w-xl">
      <DialogHeader><DialogTitle>¿Extender la estancia o crear otra reserva?</DialogTitle><DialogDescription>
        Elegiste días libres justo después de una reserva de esta habitación. Elige qué quieres hacer antes de continuar.
      </DialogDescription></DialogHeader>
      {selection && <>
        <p className="text-sm text-muted-foreground">Habitación {selection.habitacion.numero} · Días seleccionados: {formatDate(selection.fechaCheckin)} → {formatDate(selection.fechaCheckout)}</p>
        <div className="space-y-3">{selection.reservas.map((reservation) => <div key={reservation.id} className="space-y-3 rounded-lg border bg-slate-50 p-4">
          <div><p className="font-semibold text-[#10233F]">{reservation.cliente_nombre || [reservation.clientes?.nombre, reservation.clientes?.apellido_paterno].filter(Boolean).join(' ') || 'Huésped registrado'}</p>
            <p className="mt-1 text-xs text-muted-foreground">{reservation.numero_reserva} · {formatDate(reservation.fecha_checkin)} → {formatDate(reservation.fecha_checkout)}</p>
            <p className="mt-1 text-sm">Pagado: {formatCurrency(Number(reservation.total_pagado || 0))}</p>
          </div>
          <p className="text-xs text-muted-foreground">Al extender se conserva la misma reserva, su huésped y sus pagos. Revisarás disponibilidad, nuevo total y motivo antes de guardar.</p>
          <div className="flex flex-wrap gap-2">
            {canExtend && <Button className="bg-[#10233F] hover:bg-[#10233F]/90" onClick={() => onAction(reservation, 'extend_stay')}>Extender esta reserva</Button>}
            <Button variant="outline" onClick={() => onAction(reservation, 'view')}>Ver expediente</Button>
            {canCancel && !reservation.checkin_realizado && ['Pendiente', 'Confirmada'].includes(reservation.estado) && <Button variant="ghost" className="text-red-700 hover:bg-red-50 hover:text-red-800" onClick={() => onAction(reservation, 'cancel')}>Cancelar esta reserva</Button>}
          </div>
        </div>)}</div>
        <DialogFooter><Button variant="ghost" onClick={onClose}>Volver al calendario</Button><Button variant="outline" onClick={onCreate}>Crear otra reserva</Button></DialogFooter>
      </>}
    </DialogContent>
  </Dialog>;
}
