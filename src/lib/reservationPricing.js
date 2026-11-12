export const tableBookingFee = (table) =>
  Number(table.fee_amount ?? table.reservation_fee ?? 0);

export function sumReservationFees(tables) {
  const sum = (value) =>
    tables.reduce((total, table) => total + Math.round(Number(value(table) || 0) * 100), 0) / 100;
  return {
    base_fee_amount: sum((table) => table.base_fee_amount ?? table.reservation_fee),
    extra_hour_rate: sum((table) => table.extra_hour_rate),
    extra_hours: Number(tables[0]?.extra_hours || 0),
    extra_fee_amount: sum((table) => table.extra_fee_amount),
    fee_amount: sum(tableBookingFee),
  };
}

export function reservationFeeLineItems(reservation) {
  const fee = Number(reservation.fee_amount || 0);
  const extra = Number(reservation.extra_fee_amount || 0);
  const base = Number(reservation.base_fee_amount ?? fee - extra);
  const lines = [{
    description: "Reservation table fee",
    quantity: 1,
    unitPrice: base,
    amount: base,
  }];
  if (extra > 0) {
    const hours = Number(reservation.extra_hours || 1);
    lines.push({
      description: "Additional dining time (each started hour after the first)",
      quantity: hours,
      unitPrice: Number(reservation.extra_hour_rate ?? extra / hours),
      amount: extra,
    });
  }
  return lines;
}
