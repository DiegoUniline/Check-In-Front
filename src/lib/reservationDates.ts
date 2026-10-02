/** Calendar dates, without timezone conversions or daylight-saving drift. */
export function checkoutAfterArrivalChange(checkin: string, checkout: string, nextCheckin: string): string {
  if (!nextCheckin || !checkout || nextCheckin <= checkout) return checkout;
  const start = Date.parse(`${checkin}T00:00:00Z`);
  const end = Date.parse(`${checkout}T00:00:00Z`);
  const next = Date.parse(`${nextCheckin}T00:00:00Z`);
  if (![start, end, next].every(Number.isFinite)) return checkout;
  const days = Math.max(0, Math.round((end - start) / 86400000));
  return new Date(next + days * 86400000).toISOString().slice(0, 10);
}

export function reservationDateChanges(before: Record<string, unknown> | null, after: Record<string, unknown> | null) {
  if (!before || !after) return [];
  return (['fecha_checkin', 'fecha_checkout'] as const).flatMap((key) => {
    // Historical records may contain only partial snapshots.
    if (!(key in before) || !(key in after)) return [];
    const previous = String(before[key] || '').slice(0, 10);
    const next = String(after[key] || '').slice(0, 10);
    return previous === next ? [] : [{ key, label: key === 'fecha_checkin' ? 'Entrada' : 'Salida', before: previous, after: next }];
  });
}
