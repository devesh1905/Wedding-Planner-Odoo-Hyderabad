import { z } from "zod";
import { email, name, phone, uuid } from "@/shared/validation/common";

export const vendorCategories = [
  "CATERER",
  "DECORATOR",
  "FLORIST",
  "DJ",
  "DHOL",
  "MAKEUP",
  "PHOTOGRAPHER",
  "LIGHTING",
  "TENT",
  "TRANSPORT",
  "VENUE",
  "OTHER",
] as const;
export type VendorCategory = (typeof vendorCategories)[number];
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((value) => value || null);
export const vendorSchema = z
  .object({
    name,
    category: z.enum(vendorCategories),
    contactName: optionalText(80),
    phone,
    email: z
      .union([email, z.literal(""), z.null()])
      .optional()
      .transform((value) => value || null),
    city: z.string().trim().min(2, "Enter a city").max(80, "City is too long"),
    notes: optionalText(2000),
    backupVendorId: z
      .union([uuid, z.literal(""), z.null()])
      .optional()
      .transform((value) => value?.toLowerCase() || null),
  })
  .strict();
export const vendorPatchSchema = vendorSchema.partial().refine((value) => Object.keys(value).length > 0, "Provide at least one field to update");
export const vendorFilterSchema = z
  .object({
    q: z.string().trim().max(120).optional(),
    city: z.string().trim().max(80).optional(),
    category: z.enum(vendorCategories).optional(),
  })
  .strict();
export type VendorInput = z.input<typeof vendorSchema>;
export type VendorData = z.output<typeof vendorSchema>;
