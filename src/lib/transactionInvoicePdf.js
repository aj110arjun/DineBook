const readableId = (value, prefix) => value
  ? `${prefix}-${String(value).replaceAll("-", "").slice(0, 8).toUpperCase()}`
  : "—";

const formatDate = (value) => value
  ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
  : "—";

const cleanText = (value) => String(value ?? "—")
  .replaceAll("₹", "INR ")
  .replace(/[\u2010-\u2015\u2212]/g, "-")
  .normalize("NFKD")
  .replace(/[^\x20-\x7E]/g, "");

const pdfString = (value) => cleanText(value)
  .replace(/\\/g, "\\\\")
  .replace(/\(/g, "\\(")
  .replace(/\)/g, "\\)");

const money = (value, currency) => `${currency || "INR"} ${Number(value || 0).toLocaleString("en-IN", {
  minimumFractionDigits: 2, maximumFractionDigits: 2,
})}`;

const amountNumber = (value) => Number(value || 0).toLocaleString("en-IN", {
  minimumFractionDigits: 2, maximumFractionDigits: 2,
});

function wrap(value, max = 48) {
  const words = cleanText(value).split(/\s+/);
  const lines = [];
  let current = "";
  for (const word of words) {
    if (word.length > max) {
      if (current) lines.push(current);
      current = "";
      for (let index = 0; index < word.length; index += max) lines.push(word.slice(index, index + max));
      continue;
    }
    const next = current ? `${current} ${word}` : word;
    if (next.length > max && current) { lines.push(current); current = word; }
    else current = next;
  }
  if (current) lines.push(current);
  return lines.length ? lines : ["—"];
}

function statusPresentation(invoice) {
  const status = String(invoice.status || "Pending").toUpperCase().replaceAll("_", " ");
  const isPaid = status === "PAID" || status === "CREDITED" || status === "DEBITED";
  const isRefunded = status === "REFUNDED" || status === "PARTIALLY REFUNDED" || status === "PARTIAL REFUND";
  const title = invoice.documentTitle || (invoice.category === "wallet_top_up" ? "Wallet top-up receipt"
    : invoice.category === "wallet" ? "Wallet transaction receipt"
    : invoice.category === "refund" || isRefunded ? "Refund receipt"
      : isPaid ? "Payment invoice" : "Transaction summary");
  return { status, isPaid, isRefunded, title };
}

function makePage(invoice, transactionId, pageNumber) {
  const commands = [];
  const text = (x, y, size, value, color = "0.15 0.18 0.20") => {
    commands.push(`${color} rg BT /F1 ${size} Tf ${x} ${y} Td (${pdfString(value)}) Tj ET`);
  };
  const rightText = (right, y, size, value, color = "0.15 0.18 0.20") => {
    const safe = cleanText(value);
    const estimatedWidth = safe.length * size * 0.52;
    text(Math.max(52, right - estimatedWidth), y, size, safe, color);
  };
  const line = (x1, y1, x2, y2, color = "0.84 0.87 0.88") => {
    commands.push(`${color} RG 0.7 w ${x1} ${y1} m ${x2} ${y2} l S`);
  };
  const { status, isPaid, isRefunded, title } = statusPresentation(invoice);
  const statusColor = isPaid || isRefunded ? "0.88 0.95 0.91" : status === "FAILED" ? "0.98 0.90 0.90" : "0.96 0.94 0.88";
  const statusTextColor = isPaid || isRefunded ? "0.12 0.40 0.27" : status === "FAILED" ? "0.56 0.18 0.20" : "0.48 0.36 0.12";

  text(52, 785, 14, "DINEBOOK", "0.06 0.39 0.43");
  text(52, 751, 23, pageNumber === 1 ? title : `${title} - continued`);
  text(52, 732, 9, invoice.typeLabel || "Transaction record", "0.38 0.43 0.45");
  commands.push(`${statusColor} rg 432 770 110 23 re f`);
  text(444, 778, 9, status, statusTextColor);
  text(365, 740, 8, "INVOICE / RECEIPT NO.", "0.38 0.43 0.45");
  text(365, 725, 10, transactionId);
  text(365, 708, 8, "ISSUED", "0.38 0.43 0.45");
  text(414, 708, 8, formatDate(invoice.createdAt));
  line(52, 693, 543, 693, "0.06 0.39 0.43");

  let tableY = 594;
  if (pageNumber === 1) {
    text(52, 672, 8, "BILLED BY", "0.38 0.43 0.45");
    const merchantNameLines = wrap(invoice.merchantName || "DineBook", 48);
    merchantNameLines.forEach((value, index) => text(52, 656 - index * 11, 9, value, "0.12 0.16 0.18"));
    const merchantLines = [invoice.merchantAddress, invoice.merchantLocation, invoice.merchantEmail, invoice.merchantPhone].filter(Boolean).flatMap((value) => wrap(value, 48));
    const merchantInfoY = 656 - Math.max(0, merchantNameLines.length - 1) * 11 - 14;
    merchantLines.forEach((value, index) => text(52, merchantInfoY - index * 10, 7, value, "0.38 0.43 0.45"));
    text(310, 672, 8, "BILLED TO", "0.38 0.43 0.45");
    const customerNameLines = wrap(invoice.customerName || "Customer", 42);
    customerNameLines.forEach((value, index) => text(310, 656 - index * 11, 9, value, "0.12 0.16 0.18"));
    const customerLines = [invoice.customerEmail, invoice.customerAddress].filter(Boolean).flatMap((value) => wrap(value, 42));
    const customerInfoY = 656 - Math.max(0, customerNameLines.length - 1) * 11 - 14;
    customerLines.forEach((value, index) => text(310, customerInfoY - index * 10, 7, value, "0.38 0.43 0.45"));
    const merchantBottom = merchantLines.length ? merchantInfoY - (merchantLines.length - 1) * 10 : merchantInfoY;
    const customerBottom = customerLines.length ? customerInfoY - (customerLines.length - 1) * 10 : customerInfoY;
    tableY = Math.min(594, Math.min(merchantBottom, customerBottom) - 25);
  } else {
    text(52, 668, 8, "TRANSACTION DETAILS - CONTINUED", "0.38 0.43 0.45");
  }
  text(52, tableY, 8, "DESCRIPTION", "0.38 0.43 0.45");
  text(365, tableY, 8, "QTY", "0.38 0.43 0.45");
  text(393, tableY, 8, `UNIT PRICE (${invoice.currency || "INR"})`, "0.38 0.43 0.45");
  text(474, tableY, 8, `AMOUNT (${invoice.currency || "INR"})`, "0.38 0.43 0.45");
  line(52, tableY - 10, 543, tableY - 10);
  return { commands, text, rightText, line, status, isPaid, isRefunded, tableY };
}

function pageStream(commands) { return commands.join("\n"); }

export function createTransactionInvoicePdf(invoice = {}) {
  const prefix = invoice.transactionPrefix || (invoice.category === "wallet_top_up" ? "WLT" : invoice.category === "refund" ? "RFD" : "TXN");
  const transactionId = readableId(invoice.transactionId, prefix);
  const relatedId = invoice.relatedId ? readableId(invoice.relatedId, invoice.relatedPrefix || "RES") : null;
  const { status, isPaid, isRefunded } = statusPresentation(invoice);
  const amount = Number(invoice.amount || 0);
  const currency = invoice.currency || "INR";
  const lineItems = invoice.lineItems?.length ? invoice.lineItems : [{
    description: invoice.description || invoice.typeLabel || "Payment",
    quantity: 1, unitPrice: amount, amount,
  }];
  const pages = [];
  let page = makePage(invoice, transactionId, 1);
  pages.push(page);
  let y = page.tableY - 24;

  for (const item of lineItems) {
    const description = `${item.description || item.food_name || invoice.description || invoice.typeLabel || "Payment"}${item.variant_name ? ` - ${item.variant_name}` : ""}`;
    const descriptionLines = wrap(description, 48);
    let offset = 0;
    let firstPart = true;
    while (offset < descriptionLines.length) {
      const availableLines = Math.floor((y - 245 - 18) / 11);
      if (availableLines < 1) {
        page = makePage(invoice, transactionId, pages.length + 1);
        pages.push(page);
        y = page.tableY - 24;
        continue;
      }
      const chunk = descriptionLines.slice(offset, offset + availableLines);
      chunk.forEach((value, index) => page.text(52, y - index * 11, 8, value));
      if (firstPart) {
        page.text(369, y, 8, item.quantity ?? 1);
        page.rightText(480, y, 8, amountNumber(item.unitPrice ?? item.unit_price ?? item.amount ?? amount));
        page.rightText(543, y, 8, amountNumber(item.amount ?? item.line_total ?? amount));
      }
      y -= Math.max(31, chunk.length * 11 + 18);
      page.line(52, y + 8, 543, y + 8);
      offset += chunk.length;
      firstPart = false;
      if (offset < descriptionLines.length) {
        page = makePage(invoice, transactionId, pages.length + 1);
        pages.push(page);
        y = page.tableY - 24;
      }
    }
  }

  const discount = Number(invoice.discountAmount || 0);
  const subtotal = Number(invoice.subtotal ?? amount + discount);
  const amountRows = [
    invoice.taxAmount > 0 ? ["Tax", Number(invoice.taxAmount)] : null,
    invoice.additionalCharges > 0 ? ["Additional charges", Number(invoice.additionalCharges)] : null,
    invoice.paidAmount > 0 ? ["Amount paid", Number(invoice.paidAmount)] : null,
    invoice.outstandingBalance > 0 ? ["Outstanding balance", Number(invoice.outstandingBalance)] : null,
  ].filter(Boolean);
  const hasRefundSummary = isRefunded && invoice.category !== "refund";
  const refundAmount = invoice.refundAmount == null
    ? (status === "REFUNDED" && hasRefundSummary ? amount : null)
    : Number(invoice.refundAmount);
  const paymentFields = [
    ["Payment method", invoice.paymentMethod],
    ["Payment provider", invoice.provider],
    ["Payment reference", invoice.providerReference],
    ["Provider order reference", invoice.providerOrderReference],
    ["Transaction ID", transactionId],
    [invoice.relatedLabel || "Related reference", relatedId],
    ["Refund status", invoice.refundStatus && invoice.refundStatus !== "None" ? invoice.refundStatus : null],
    ["Refund reference", invoice.refundReference],
    ["Refund date", invoice.refundDate ? formatDate(invoice.refundDate) : null],
    ["Original payment reference", invoice.originalPaymentReference],
  ].filter(([, value]) => value);
  const paymentRows = [];
  for (let index = 0; index < paymentFields.length; index += 2) {
    const fields = [paymentFields[index], paymentFields[index + 1]].filter(Boolean);
    const rowHeight = Math.max(27, ...fields.map(([, value]) => wrap(value, 35).length * 9 + 16));
    paymentRows.push({ fields, rowHeight });
  }
  const needed = 100 + (discount > 0 ? 18 : 0) + amountRows.length * 17 + (hasRefundSummary ? 34 : 0) + paymentRows.reduce((total, row) => total + row.rowHeight, 0);
  if (y - needed < 66) {
    page = makePage(invoice, transactionId, pages.length + 1);
    pages.push(page);
    y = page.tableY - 24;
  }

  let summaryY = y - 28;
  page.text(354, summaryY, 8, "Subtotal", "0.38 0.43 0.45");
  page.rightText(535, summaryY, 8, money(subtotal, currency));
  summaryY -= 17;
  if (discount > 0) {
    page.text(354, summaryY, 8, "Discount", "0.38 0.43 0.45");
    page.rightText(535, summaryY, 8, `- ${money(discount, currency)}`, "0.12 0.40 0.27");
    summaryY -= 17;
  }
  for (const [label, value] of amountRows) {
    page.text(354, summaryY, 8, label, "0.38 0.43 0.45");
    page.rightText(535, summaryY, 8, money(value, currency));
    summaryY -= 17;
  }
  if (hasRefundSummary) {
    page.text(354, summaryY, 8, "Original amount", "0.38 0.43 0.45");
    page.rightText(535, summaryY, 8, money(amount, currency));
    summaryY -= 16;
    page.text(354, summaryY, 8, "Refunded amount", "0.38 0.43 0.45");
    page.rightText(535, summaryY, 8, refundAmount == null ? "Not available" : money(refundAmount, currency), "0.12 0.40 0.27");
    summaryY -= 19;
  }
  const totalTitle = invoice.category === "wallet" ? (status === "DEBITED" ? "Wallet debit" : "Wallet credit")
    : invoice.category === "refund" ? "Refund amount" : isRefunded ? "Net amount after refund" : isPaid ? "Amount paid" : status === "FAILED" ? "Amount attempted" : "Amount due";
  const totalValue = hasRefundSummary && refundAmount != null ? Math.max(0, amount - refundAmount) : hasRefundSummary ? null : amount;
  const totalHeight = hasRefundSummary ? 39 : 34;
  const totalY = summaryY - totalHeight - 5;
  page.commands.push(`0.06 0.39 0.43 rg 340 ${totalY} 203 ${totalHeight} re f`);
  page.text(352, totalY + 13, 8, totalTitle, "1 1 1");
  if (totalValue == null) page.text(438, totalY + 13, 7, "Check refund status", "1 1 1");
  else page.rightText(530, totalY + 13, 10, money(totalValue, currency), "1 1 1");

  const paymentTop = totalY - 22;
  page.text(52, paymentTop, 8, "PAYMENT DETAILS", "0.38 0.43 0.45");
  page.line(52, paymentTop - 9, 543, paymentTop - 9);
  let detailsY = paymentTop - 25;
  for (const row of paymentRows) {
    row.fields.forEach(([label, value], column) => {
      const x = column === 0 ? 52 : 306;
      const valueX = column === 0 ? 150 : 405;
      page.text(x, detailsY, 7, label, "0.38 0.43 0.45");
      wrap(value, 35).forEach((line, lineIndex) => page.text(valueX, detailsY - lineIndex * 9, 7, line));
    });
    detailsY -= row.rowHeight;
  }

  pages.forEach((entry, index) => {
    entry.line(52, 61, 543, 61);
    entry.text(52, 47, 7, "Electronic document generated by DineBook. Keep this record for your reference.", "0.48 0.52 0.53");
    entry.text(477, 47, 7, `Page ${index + 1} of ${pages.length}`, "0.48 0.52 0.53");
  });

  const streams = pages.map((entry) => pageStream(entry.commands));
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pages.map((_, index) => `${4 + index * 2} 0 R`).join(" ")}] /Count ${pages.length} >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
  ];
  pages.forEach((_, index) => {
    const pageObject = 4 + index * 2;
    const streamObject = pageObject + 1;
    const stream = streams[index];
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${streamObject} 0 R >>`);
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  });

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => { pdf += `${String(offset).padStart(10, "0")} 00000 n \n`; });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}

export function transactionInvoiceFilename(invoice = {}) {
  const prefix = invoice.transactionPrefix || (invoice.category === "wallet_top_up" ? "WLT" : invoice.category === "refund" ? "RFD" : "TXN");
  const presentation = statusPresentation(invoice);
  const kind = presentation.isRefunded || invoice.category === "refund" ? "Refund"
    : invoice.category === "wallet_top_up" || invoice.category === "wallet" ? "Wallet-Receipt"
      : ["PENDING", "FAILED"].includes(presentation.status) ? "Transaction-Summary" : "Invoice";
  return `DineBook-${kind}-${readableId(invoice.transactionId, prefix)}.pdf`;
}
