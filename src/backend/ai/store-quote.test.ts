import assert from "node:assert/strict";
import { extractionForStorage, isCurrentExtraction } from "./store-quote";
import { quoteExtractionSchema } from "./quote-schema";

const previous = { perPlate: 2450, extraHourRate: 15000, total: 980000, notes: "Original terms\nShared condition" };
const extraction = quoteExtractionSchema.parse({
  vendorName: "Test caterer",
  currency: "INR",
  perPlate: null,
  guestCount: 400,
  extraHourRate: null,
  total: null,
  notes: ["Shared condition", "Desserts excluded"],
  taxes: [{ label: "Service charge", percent: 10, amount: 86000 }],
  lines: [{ item: "Regional menu", category: "MAIN", qty: 400, unit: "plate", unitPrice: 2150.4, included: true }],
});
const mapped = extractionForStorage(extraction, previous);
assert.equal(mapped.perPlate, 2450);
assert.equal(mapped.extraHourRate, 15000);
assert.equal(mapped.total, 980000);
assert.equal(mapped.lines[0]?.unitPrice, 2150);
assert.equal(mapped.lines[1]?.category, "TAX");
assert.equal(mapped.lines[1]?.unitPrice, 86000);
assert.equal(mapped.lines[1]?.item, "Service charge (10%)");
assert.equal(mapped.notes, "Original terms\nShared condition\nDesserts excluded");
assert.equal(
  mapped.lines.some((line) => line.category === "DESSERT"),
  false,
);
const existingTax = extractionForStorage(
  { ...extraction, lines: [...extraction.lines, { item: "Service charge", category: "TAX", qty: 1, unit: "lot", unitPrice: 86000, included: true }] },
  previous,
);
assert.equal(existingTax.lines.filter((line) => line.category === "TAX").length, 1);
const unknownTax = extractionForStorage({ ...extraction, taxes: [{ label: "GST", percent: 18, amount: null }] }, previous);
assert.equal(unknownTax.lines[1]?.unitPrice, null);
assert.equal(unknownTax.lines[1]?.qty, null);
assert.throws(() => extractionForStorage({ ...extraction, perPlate: 2_000_000_001 }, previous));
assert.throws(() => extractionForStorage({ ...extraction, total: 0 }, previous));
assert.throws(() => extractionForStorage({ ...extraction, lines: [], taxes: [] }, previous));
const snapshot = { updatedAt: new Date("2026-10-31T06:00:00.000Z"), fileUrl: "original" };
assert.equal(isCurrentExtraction(snapshot, { ...snapshot }), true);
assert.equal(isCurrentExtraction(snapshot, { ...snapshot, updatedAt: new Date("2026-10-31T06:00:00.001Z") }), false);
assert.equal(isCurrentExtraction(snapshot, { ...snapshot, fileUrl: "resubmitted" }), false);
console.log("Quote storage mapping: rupees, preserved summaries, missing inclusions, taxes, notes and stale extraction guard passed");
