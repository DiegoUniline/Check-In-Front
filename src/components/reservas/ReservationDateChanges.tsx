import { formatDate } from '@/lib/dateFormat';
import { reservationDateChanges } from '@/lib/reservationDates';

export function ReservationDateChanges({ before, after }: {
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}) {
  const changes = reservationDateChanges(before, after);
  if (!changes.length) return null;
  return <dl className="mt-2 space-y-1 rounded-md border bg-slate-50 p-2 text-xs">
    {changes.map((change) => <div key={change.key} className="flex flex-wrap gap-x-2 gap-y-1">
      <dt className="font-medium">{change.label}:</dt>
      <dd>Antes: {formatDate(change.before)} <span aria-hidden="true">→</span> Ahora: <strong>{formatDate(change.after)}</strong></dd>
    </div>)}
  </dl>;
}
