export type ReservationFinancialSnapshot = {
  nights: number;
  lodging: number;
  charges: number;
  taxes: number;
  discount: number;
  total: number;
  paid: number;
  balance: number;
};

export type ReservationFinancialOptions = {
  checkin?: string;
  checkout?: string;
  nightlyRate?: number;
  extraGuests?: number;
  extraGuestRate?: number;
  additionalCharges?: number;
  paidDelta?: number;
  discountType?: string | null;
  discountValue?: number;
};

export type ReservationLedgerRow = {
  id: string;
  at: string;
  concept: string;
  type: 'Hospedaje' | 'Consumo' | 'Cargo' | 'Impuesto' | 'Descuento' | 'Ajuste' | 'Pago';
  charge: number;
  payment: number;
  balance: number;
  cancelled?: boolean;
  state?: string | null;
  source?: any;
};

export const reservationMoney = (value: unknown) => Number(value || 0);

export const roundReservationMoney = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const dateOnly = (value: unknown) => String(value || '').slice(0, 10);

const dateFromValue = (value: unknown) => {
  const [year, month, day] = dateOnly(value).split('-').map(Number);
  return year && month && day ? new Date(year, month - 1, day, 12) : undefined;
};

export const reservationNightsBetween = (checkin: unknown, checkout: unknown) => {
  const start = dateFromValue(checkin);
  const end = dateFromValue(checkout);
  return start && end
    ? Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000))
    : 1;
};

export const getActiveReservationCharges = (reserva: any) =>
  (reserva?.cargos || []).filter((charge: any) => String(charge.estado || 'Activo') !== 'Cancelado');

export const getActiveReservationPayments = (reserva: any) =>
  (reserva?.pagos || []).filter((payment: any) => String(payment.estado || 'Activo') !== 'Cancelado');

export const calculateReservationFinancialSnapshot = (
  reserva: any,
  options: ReservationFinancialOptions = {},
): ReservationFinancialSnapshot => {
  const nights = reservationNightsBetween(
    options.checkin || reserva.fecha_checkin,
    options.checkout || reserva.fecha_checkout,
  );
  const nightlyRate = options.nightlyRate ?? reservationMoney(reserva.tarifa_noche);
  const extraGuests = options.extraGuests ?? reservationMoney(reserva.personas_extra);
  const extraGuestRate = options.extraGuestRate ?? reservationMoney(reserva.cargo_persona_extra);

  const lodging = roundReservationMoney(
    nights * nightlyRate + nights * extraGuests * extraGuestRate,
  );
  const charges = roundReservationMoney(
    getActiveReservationCharges(reserva).reduce(
      (sum: number, charge: any) =>
        sum + reservationMoney(charge.total ?? (reservationMoney(charge.subtotal) + reservationMoney(charge.impuesto))),
      0,
    ) + reservationMoney(options.additionalCharges),
  );

  const inferredTaxRate =
    reservationMoney(reserva.impuesto_hospedaje_porcentaje) ||
    (reservationMoney(reserva.subtotal_hospedaje) > 0
      ? (reservationMoney(reserva.total_impuestos) * 100) / reservationMoney(reserva.subtotal_hospedaje)
      : 0);
  const taxes = roundReservationMoney(lodging * Math.max(0, inferredTaxRate) / 100);
  const base = Math.max(0, lodging + charges + taxes);

  const discountType =
    options.discountType === undefined ? reserva.descuento_tipo : options.discountType;
  const discountValue =
    options.discountValue === undefined
      ? reservationMoney(reserva.descuento_valor)
      : options.discountValue;

  let discount = reservationMoney(reserva.descuento);
  if (String(discountType || '').toLowerCase().startsWith('porc')) {
    discount = base * Math.max(0, reservationMoney(discountValue)) / 100;
  } else if (String(discountType || '').toLowerCase().startsWith('monto')) {
    discount = Math.max(0, reservationMoney(discountValue));
  } else if (options.discountType === null) {
    discount = 0;
  }
  discount = roundReservationMoney(Math.min(base, discount));

  const total = roundReservationMoney(Math.max(0, base - discount));
  const paid = roundReservationMoney(
    getActiveReservationPayments(reserva).reduce(
      (sum: number, payment: any) => sum + reservationMoney(payment.monto),
      0,
    ) + reservationMoney(options.paidDelta),
  );

  return {
    nights,
    lodging,
    charges,
    taxes,
    discount,
    total,
    paid,
    balance: roundReservationMoney(total - paid),
  };
};

const movementTimestamp = (item: any, fallback: string) =>
  String(item?.fecha || item?.created_at || item?.actualizado_at || fallback || '');

export const getReservationAccountSummary = (reserva: any) => {
  const activeCharges = getActiveReservationCharges(reserva);
  const activePayments = getActiveReservationPayments(reserva);
  const lodging = reservationMoney(
    reserva?.subtotal_hospedaje ??
      reservationNightsBetween(reserva?.fecha_checkin, reserva?.fecha_checkout) *
        reservationMoney(reserva?.tarifa_noche),
  );
  const charges = activeCharges.reduce(
    (sum: number, item: any) => sum + reservationMoney(item.total ?? item.subtotal),
    0,
  );
  const taxes = reservationMoney(reserva?.total_impuestos);
  const discount = reservationMoney(reserva?.descuento ?? reserva?.descuento_monto);
  const total = reservationMoney(reserva?.total);
  const paidFromMovements = activePayments.reduce(
    (sum: number, item: any) => sum + reservationMoney(item.monto),
    0,
  );
  const paid = reserva?.total_pagado == null
    ? paidFromMovements
    : reservationMoney(reserva.total_pagado);
  const balance = reserva?.saldo_pendiente == null
    ? roundReservationMoney(total - paid)
    : reservationMoney(reserva.saldo_pendiente);
  const otherCharges = roundReservationMoney(total - (lodging + charges + taxes - discount));

  return {
    lodging,
    charges,
    taxes,
    discount,
    otherCharges,
    total,
    paid,
    balance,
    activeCharges,
    activePayments,
  };
};

export const buildReservationLedger = (reserva: any): ReservationLedgerRow[] => {
  const summary = getReservationAccountSummary(reserva);
  const checkinAt = String(reserva?.fecha_checkin || '');
  const rawRows: Array<Omit<ReservationLedgerRow, 'balance'>> = [];

  if (Math.abs(summary.lodging) > 0.009) {
    rawRows.push({
      id: 'lodging',
      at: checkinAt,
      concept: `Hospedaje · ${reservationNightsBetween(reserva?.fecha_checkin, reserva?.fecha_checkout)} noche${reservationNightsBetween(reserva?.fecha_checkin, reserva?.fecha_checkout) === 1 ? '' : 's'}`,
      type: 'Hospedaje',
      charge: summary.lodging,
      payment: 0,
    });
  }

  if (Math.abs(summary.taxes) > 0.009) {
    rawRows.push({
      id: 'taxes',
      at: checkinAt,
      concept: 'Impuestos de la reservación',
      type: 'Impuesto',
      charge: summary.taxes,
      payment: 0,
    });
  }

  if (Math.abs(summary.discount) > 0.009) {
    rawRows.push({
      id: 'discount',
      at: checkinAt,
      concept: 'Descuento aplicado',
      type: 'Descuento',
      charge: -summary.discount,
      payment: 0,
    });
  }

  (reserva?.cargos || []).forEach((item: any) => {
    const cancelled = String(item.estado || 'Activo') === 'Cancelado';
    rawRows.push({
      id: `charge:${item.id}`,
      at: movementTimestamp(item, checkinAt),
      concept: item.concepto || item.producto_nombre || 'Cargo adicional',
      type: item.venta_id || item.producto_id ? 'Consumo' : 'Cargo',
      charge: reservationMoney(item.total ?? item.subtotal),
      payment: 0,
      cancelled,
      state: item.estado,
      source: item,
    });
  });

  if (Math.abs(summary.otherCharges) > 0.009) {
    rawRows.push({
      id: 'reservation-adjustment',
      at: checkinAt,
      concept: summary.otherCharges > 0 ? 'Otros conceptos de la reservación' : 'Ajuste de la reservación',
      type: 'Ajuste',
      charge: summary.otherCharges,
      payment: 0,
    });
  }

  (reserva?.pagos || []).forEach((item: any) => {
    const cancelled = String(item.estado || 'Activo') === 'Cancelado';
    rawRows.push({
      id: `payment:${item.id}`,
      at: movementTimestamp(item, checkinAt),
      concept: item.concepto || item.metodo_pago || 'Pago',
      type: 'Pago',
      charge: 0,
      payment: reservationMoney(item.monto),
      cancelled,
      state: item.estado,
      source: item,
    });
  });

  const typeOrder: Record<ReservationLedgerRow['type'], number> = {
    Hospedaje: 0,
    Impuesto: 1,
    Descuento: 2,
    Ajuste: 3,
    Cargo: 4,
    Consumo: 4,
    Pago: 5,
  };

  rawRows.sort((a, b) => {
    const dateCompare = String(a.at || '').localeCompare(String(b.at || ''));
    return dateCompare || typeOrder[a.type] - typeOrder[b.type] || a.id.localeCompare(b.id);
  });

  let running = 0;
  return rawRows.map((row) => {
    if (!row.cancelled) {
      running = roundReservationMoney(running + row.charge - row.payment);
    }
    return { ...row, balance: running };
  });
};
