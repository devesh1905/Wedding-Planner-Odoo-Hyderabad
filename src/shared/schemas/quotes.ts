import { z } from "zod";
import { vendorCategories } from "@/shared/schemas/vendors";

const uuid = z.string().uuid().transform((value) => value.toLowerCase());
const optionalText = (max: number) => z.string().trim().max(max).nullable().optional().transform((value) => value || null);
const money = z.number().int("Use whole rupees").nonnegative("Amount cannot be negative").max(2_000_000_000, "Amount is too large");
export const tokenSchema = z.string().regex(/^[a-zA-Z0-9_-]{16,256}$/, "Invalid invitation link");
export const quoteLineCategories = ["MAIN", "STARTER", "DESSERT", "BEVERAGE", "LIVE_COUNTER", "SERVICE", "TAX", "OTHER"] as const;
export const quoteLineSchema = z.object({
  item: z.string().trim().min(1, "Describe the item").max(160),
  category: z.enum(quoteLineCategories),
  qty: z.number().finite().positive().max(1_000_000).nullable(),
  unit: z.string().trim().max(30).nullable(),
  unitPrice: money.nullable(),
  included: z.boolean(),
}).strict();
export const quoteRequestSchema = z.object({
  weddingId: uuid,
  category: z.enum(vendorCategories),
  title: z.string().trim().min(2, "Enter a request title").max(160),
  requirements: optionalText(4000),
  guestCount: z.number().int().min(1).max(5000),
  vendorIds: z.array(uuid).min(1, "Select at least one vendor").max(40).refine((ids) => new Set(ids).size === ids.length, "Select each vendor once"),
}).strict();
export const quoteSubmissionSchema = z.object({
  perPlate: money.nullable(),
  extraHourRate: money.nullable(),
  total: money.positive("Enter the total agreed price"),
  notes: optionalText(4000),
  lines: z.array(quoteLineSchema).max(100),
}).strict();
export const quoteReviewContentSchema = quoteSubmissionSchema.extend({ lines: z.array(quoteLineSchema).min(1, "Add at least one line to confirm this quote").max(100) });
export const quoteReviewSchema = quoteReviewContentSchema.extend({ expectedUpdatedAt: z.string().datetime({ offset: true }).optional() });
export const quoteExtractSchema = z.object({ updatedAt: z.string().datetime({ offset: true }).optional() }).strict();
export const quoteAwardSchema = z.object({
  quoteId: uuid,
  expectedUpdatedAt: z.string().datetime({ offset: true }).optional(),
  expectedArrival: z.string().datetime({ offset: true }).nullable().optional(),
  agreedHours: z.number().int().min(1).max(168).nullable().optional(),
}).strict();
export const quoteRequestFilterSchema = z.object({ weddingId: uuid }).strict();
export const quoteIdSchema = uuid;
