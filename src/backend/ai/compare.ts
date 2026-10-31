import { categories, type QuoteCategory, type QuoteExtraction } from "./quote-schema";
type Value = { items: QuoteExtraction["lines"]; missing: boolean; value: number | null };
type ComparisonRow = { key: QuoteCategory | "PER_PLATE" | "EXTRA_HOUR" | "TOTAL"; values: Value[]; cheapestVendorIndex: number | null };

function cheapest(values: Value[]): number | null {
  let index: number | null = null;
  values.forEach((cell, i) => {
    if (!cell.missing && cell.value !== null && (index === null || cell.value < values[index]!.value!)) index = i;
  });
  return index;
}
export function normalizeForComparison(extractions: QuoteExtraction[]): { rows: ComparisonRow[]; cheapestVendorIndex: number | null } {
  const metrics = [
    ["PER_PLATE", "perPlate"],
    ["EXTRA_HOUR", "extraHourRate"],
    ["TOTAL", "total"],
  ] as const;
  const rows: ComparisonRow[] = metrics.map(([key, field]) => {
    const values = extractions.map((q) => ({ items: [], missing: q[field] === null, value: q[field] }));
    return { key, values, cheapestVendorIndex: cheapest(values) };
  });
  for (const category of categories) {
    const values = extractions.map((q) => {
      let items = q.lines.filter((line) => line.category === category);
      // Tax summaries need comparison cells even when the PDF has no separate tax line.
      if (category === "TAX" && items.length === 0)
        items = q.taxes.map((tax) => ({ item: tax.label, category: "TAX", qty: 1, unit: "lot", unitPrice: tax.amount, included: true }));
      const included = items.filter((line) => line.included);
      // A bundled inclusion has no standalone price; null keeps it from appearing free.
      const priced = included.length > 0 && included.every((line) => line.qty !== null && line.unitPrice !== null);
      return { items, missing: included.length === 0, value: priced ? included.reduce((sum, line) => sum + line.qty! * line.unitPrice!, 0) : null };
    });
    rows.push({ key: category, values, cheapestVendorIndex: cheapest(values) });
  }
  return { rows, cheapestVendorIndex: rows.find((row) => row.key === "TOTAL")?.cheapestVendorIndex ?? null };
}
