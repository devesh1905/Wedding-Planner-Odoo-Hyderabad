import { quoteReviewContentSchema } from "@/shared/schemas/quotes";
import { toStoredRupees, type QuoteExtraction } from "./quote-schema";

export type QuoteSnapshot = { perPlate: number | null; extraHourRate: number | null; total: number | null; notes: string | null };
const storedMoney = (value: number | null): number | null => value === null ? null : toStoredRupees(value);
/** Keep quoted summary values when the document omits them; missing numbers never become zero. */
export function extractionForStorage(extraction: QuoteExtraction, previous: QuoteSnapshot) {
  const lines = extraction.lines.map((line) => ({ ...line, unitPrice: storedMoney(line.unitPrice) }));
  if (!lines.some((line) => line.category === "TAX")) {
    for (const tax of extraction.taxes) lines.push({
      item: `${tax.label}${tax.percent === null ? "" : ` (${tax.percent}%)`}`,
      category: "TAX", qty: tax.amount === null ? null : 1, unit: tax.amount === null ? null : "lot",
      unitPrice: storedMoney(tax.amount), included: true,
    });
  }
  const notes = [...new Set([...(previous.notes?.split("\n") ?? []), ...extraction.notes].map((note) => note.trim()).filter(Boolean))].join("\n") || null;
  return quoteReviewContentSchema.parse({
    perPlate: storedMoney(extraction.perPlate) ?? previous.perPlate,
    extraHourRate: storedMoney(extraction.extraHourRate) ?? previous.extraHourRate,
    total: storedMoney(extraction.total) ?? previous.total,
    notes, lines,
  });
}
export function isCurrentExtraction(snapshot: { updatedAt: Date; fileUrl: string | null }, current: { updatedAt: Date; fileUrl: string | null }): boolean {
  return snapshot.updatedAt.getTime() === current.updatedAt.getTime() && snapshot.fileUrl === current.fileUrl;
}
