import test from "node:test";
import assert from "node:assert/strict";
import { createTransactionInvoicePdf, transactionInvoiceFilename } from "./transactionInvoicePdf.js";

async function pdfText(invoice) {
  const blob = createTransactionInvoicePdf(invoice);
  assert.equal(blob.type, "application/pdf");
  return new TextDecoder().decode(await blob.arrayBuffer());
}

test("reservation fee invoice includes its readable reservation reference and verified paid state", async () => {
  const output = await pdfText({ transactionId: "11111111-2222-4333-8444-555555555555", relatedId: "11111111-2222-4333-8444-555555555555", relatedPrefix: "RES", relatedLabel: "Reservation ID", typeLabel: "Reservation fee", amount: 450, subtotal: 450, status: "Paid", createdAt: "2026-10-13T10:00:00Z", merchantName: "DineBook Cafe", customerName: "Arjun Customer", paymentMethod: "Razorpay" });
  assert.match(output, /RES-11111111/);
  assert.match(output, /PAID/);
  assert.match(output, /Reservation fee/);
  assert.match(output, /Subtotal/);
  assert.match(output, /INR 450\.00/);
});

test("order invoice includes item quantities, discount, and grows to multiple A4 pages", async () => {
  const lineItems = Array.from({ length: 24 }, (_, index) => ({ description: `Dish ${index + 1}`, variant_name: "Large", quantity: 2, unit_price: 125, line_total: 250 }));
  const output = await pdfText({ transactionId: "22222222-2222-4333-8444-555555555555", relatedId: "22222222-2222-4333-8444-555555555555", relatedPrefix: "ORD", relatedLabel: "Order ID", typeLabel: "Restaurant order payment", lineItems, subtotal: 6000, discountAmount: 250, amount: 5750, status: "Paid", paymentMethod: "DineBook wallet" });
  assert.match(output, /\/Count [2-9]/);
  assert.match(output, /Dish 24/);
  assert.match(output, /Discount/);
  assert.match(output, /INR 5,750\.00/);
});

test("pending, failed, refunded, and wallet top-up documents use accurate titles and statuses", async () => {
  const pending = await pdfText({ transactionId: "pending-id", amount: 300, status: "Pending" });
  const failed = await pdfText({ transactionId: "failed-id", amount: 300, status: "Failed" });
  const refunded = await pdfText({ transactionId: "refund-id", category: "refund", transactionPrefix: "RFD", amount: 300, status: "Refunded", refundReference: "refund-123" });
  const wallet = await pdfText({ transactionId: "wallet-id", category: "wallet_top_up", transactionPrefix: "WLT", amount: 500, status: "Paid", provider: "Razorpay", providerReference: "pay_123" });
  assert.match(pending, /Transaction summary/);
  assert.match(failed, /FAILED/);
  assert.match(refunded, /Refund receipt/);
  assert.match(refunded, /Refund amount/);
  assert.match(wallet, /Wallet top-up receipt/);
  assert.match(wallet, /pay_123/);
});

test("partial refund summary separates the original payment from the refunded amount", async () => {
  const output = await pdfText({ transactionId: "part-refund", amount: 1200, refundAmount: 350, status: "Partially Refunded", subtotal: 1200, refundStatus: "Partially refunded", providerReference: "pay_original" });
  assert.match(output, /PARTIALLY REFUNDED/);
  assert.match(output, /Original amount/);
  assert.match(output, /Refunded amount/);
  assert.match(output, /INR 350\.00/);
  assert.match(output, /INR 850\.00/);
  assert.match(output, /pay_original/);
});

test("missing fields and long text remain printable without losing transaction references", async () => {
  const longName = "Restaurant and customer name ".repeat(18);
  const longReference = "razorpay_reference_".repeat(14);
  const output = await pdfText({ transactionId: "33333333-2222-4333-8444-555555555555", amount: 123456789.5, status: "Paid", currency: "INR", merchantName: longName, customerName: longName, customerEmail: `${longName}@example.com`, providerReference: longReference });
  assert.match(output, /\/Count 1/);
  assert.match(output, /INR 12,34,56,789\.50/);
  assert.match(output, /DineBook/);
  assert.match(output, /razorpay_reference/);
  assert.match(output, /example\.com/);
});

test("invoice filename is stable and identifies refund documents", () => {
  assert.equal(transactionInvoiceFilename({ transactionId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", status: "Paid" }), "DineBook-Invoice-TXN-AAAAAAAA.pdf");
  assert.equal(transactionInvoiceFilename({ transactionId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", category: "refund" }), "DineBook-Refund-RFD-AAAAAAAA.pdf");
  assert.equal(transactionInvoiceFilename({ transactionId: "bbbbbbbb-bbbb-cccc-dddd-eeeeeeeeeeee", status: "Pending" }), "DineBook-Transaction-Summary-TXN-BBBBBBBB.pdf");
});
