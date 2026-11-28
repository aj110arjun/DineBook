import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { build } from "vite";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

let badges, temporary;
before(async () => {
  const result = await build({ logLevel: "silent", build: { ssr: "src/components/FoodOfferBadges.jsx", write: false } });
  temporary = await mkdtemp(join(process.cwd(), "node_modules/.food-offers-render-"));
  for (const chunk of result.output) if (chunk.type === "chunk") {
    const file = join(temporary, chunk.fileName);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, chunk.code);
  }
  badges = (await import(pathToFileURL(join(temporary, "FoodOfferBadges.js")))).default;
});
after(async () => { if (temporary) await rm(temporary, { recursive: true, force: true }); });

test("food cards show automatic discounts and coupon codes with their conditions", () => {
  const base = { status: "ACTIVE", applicability: "RESTAURANT", discount_type: "PERCENTAGE", discount_percent: 10, title: "Lunch offer", minimum_subtotal: 500, max_discount: 100 };
  const html = renderToStaticMarkup(createElement(badges, { food: { id: "pasta", name: "Pasta" }, offers: [
    { ...base, id: "auto", application_mode: "AUTOMATIC", code: "INTERNAL_AUTO" },
    { ...base, id: "coupon", application_mode: "COUPON", code: "LUNCH10" },
    { ...base, id: "other", applicability: "ITEMS", eligible_food_ids: ["salad"], title: "Salad only" },
  ] }));
  for (const text of ["Offers for Pasta", "10% off", "Automatic offer", "Coupon LUNCH10", "₹500.00", "₹100.00"]) assert.ok(html.includes(text), text);
  assert.doesNotMatch(html, /INTERNAL_AUTO|Salad only/);
});
