import { z } from "zod";
const money = z.number().finite().nonnegative().nullable();
export const categories = ["MAIN", "STARTER", "DESSERT", "BEVERAGE", "LIVE_COUNTER", "SERVICE", "TAX", "OTHER"] as const;
export const quoteExtractionSchema = z
  .object({
    vendorName: z.string().trim().min(1),
    currency: z.literal("INR"),
    perPlate: money,
    guestCount: z.number().int().positive().max(5000).nullable(),
    extraHourRate: money,
    taxes: z.array(z.object({ label: z.string().min(1), percent: z.number().min(0).max(100).nullable(), amount: money }).strict()),
    lines: z.array(
      z
        .object({
          item: z.string().min(1),
          category: z.enum(categories),
          qty: z.number().finite().nonnegative().nullable(),
          unit: z.string().nullable(),
          unitPrice: money,
          included: z.boolean(),
        })
        .strict(),
    ),
    total: money,
    notes: z.array(z.string()),
  })
  .strict();
export type QuoteExtraction = z.infer<typeof quoteExtractionSchema>;
export type QuoteCategory = (typeof categories)[number];
export function toStoredRupees(rupees: number): number {
  const result = Math.round(rupees);
  if (!Number.isFinite(rupees) || rupees < 0 || !Number.isSafeInteger(result) || result > 2_000_000_000) throw new Error("Invalid money amount");
  return result;
}
