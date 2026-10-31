import { z } from "zod";

// Shared field rules — used by client forms and API routes so both validate the same way.

export const phone = z
  .string({ message: "Required" })
  .trim()
  .transform((v) => v.replace(/[\s-]/g, "").replace(/^(\+91|0)/, ""))
  .pipe(z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"));

export const email = z.string().trim().toLowerCase().email("Enter a valid email");
export const optionalEmail = z
  .union([email, z.literal("")])
  .optional()
  .transform((v) => v || undefined);

export const name = z.string({ message: "Required" }).trim().min(2, "Enter at least 2 letters").max(80, "Too long");

/** Rupees typed by a user → stored as whole rupees. */
export const rupees = z.coerce
  .number({ message: "Enter an amount" })
  .nonnegative("Amount can't be negative")
  .max(1e9, "Amount too large")
  .transform((r) => Math.round(r));

export const positiveRupees = z.coerce
  .number({ message: "Enter an amount" })
  .positive("Amount must be more than zero")
  .max(1e9, "Amount too large")
  .transform((r) => Math.round(r));

export const guestCount = z.coerce.number({ message: "Enter guest count" }).int("Whole number only").min(1, "At least 1 guest").max(5000, "Max 5000 guests");

export const uuid = z.string().uuid();

export const futureDate = z.coerce
  .date({ message: "Pick a date" })
  .refine((d) => d.getTime() >= new Date().setHours(0, 0, 0, 0), "Date must be today or later");
