import test from "node:test";
import assert from "node:assert/strict";
import { reservationFeeLineItems, sumReservationFees, tableBookingFee } from "./reservationPricing.js";

test("combined table checkout uses the quoted extended price, including zero base fees", () => {
  const tables = [
    { reservation_fee: 250, base_fee_amount: 250, extra_hours: 2, extra_hour_rate: 100, extra_fee_amount: 200, fee_amount: 450 },
    { reservation_fee: 0, base_fee_amount: 0, extra_hours: 2, extra_hour_rate: 50.25, extra_fee_amount: 100.5, fee_amount: 100.5 },
  ];
  assert.equal(tableBookingFee(tables[0]), 450);
  assert.deepEqual(sumReservationFees(tables), {
    base_fee_amount: 250, extra_hours: 2, extra_hour_rate: 150.25,
    extra_fee_amount: 300.5, fee_amount: 550.5,
  });
});

test("invoices retain the saved base and overtime rate after table prices change", () => {
  const reservation = {
    fee_amount: 450, base_fee_amount: 250, extra_hour_rate: 100, extra_hours: 2, extra_fee_amount: 200,
    tables: [{ reservation_fee: 900, extra_hour_fee: 500 }],
  };
  const lines = reservationFeeLineItems(reservation);
  assert.equal(lines.length, 2);
  assert.equal(lines[0].amount, 250);
  assert.equal(lines[1].quantity, 2);
  assert.equal(lines[1].unitPrice, 100);
  assert.equal(lines.reduce((total, line) => total + line.amount, 0), 450);
});

test("legacy reservations and table responses keep their original price", () => {
  assert.equal(tableBookingFee({ reservation_fee: 250 }), 250);
  const lines = reservationFeeLineItems({ fee_amount: 250, tables: [{ reservation_fee: 900 }] });
  assert.equal(lines.length, 1);
  assert.equal(lines[0].amount, 250);
  assert.equal(sumReservationFees([{ reservation_fee: 0 }]).fee_amount, 0);
});
