import { z } from "zod";
import { EVENTS, PLANNING_KEYS, SERVICE_KEYS } from "../package-builder";
import { email, guestCount, name, optionalEmail, phone, rupees } from "./common";

export const SOURCES = ["WEB_FORM", "PHONE", "INSTAGRAM", "WHATSAPP", "REFERRAL", "WALK_IN"] as const;
export const STATUSES = ["NEW", "CONTACTED", "MEETING_BOOKED", "AGREEMENT_SENT", "SIGNED", "LOST"] as const;
export const THEMES = [
  "Royal Heritage",
  "Beach Chic",
  "Pastel Garden",
  "Modern Minimal",
  "Desert Boho",
  "Lakeside Ivory",
  "Mehendi Marigold",
] as const;
export const CITIES = ["Jaipur", "Udaipur", "Jodhpur", "Other"] as const;

const optionalText = (max: number) =>
  z.string().trim().max(max, "Too long").optional().transform((v) => v || undefined);

/** Shared by the public form and the planner's quick-add. */
export const enquiryInput = z.object({
  partner1: name,
  partner2: name,
  phone,
  email: optionalEmail,
  roughDate: z.coerce
    .date({ message: "Pick a date" })
    .refine((d) => d.getTime() >= new Date().setHours(0, 0, 0, 0), "Date must be in the future")
    .optional(),
  guestCount: guestCount.optional(),
  theme: optionalText(60),
  maxBudget: rupees.optional(),
  city: optionalText(40),
  notes: optionalText(1000),
  // "Build your package" selection. The estimate is NOT accepted from the client: the server
  // recomputes it from these fields (see shared/package-builder.ts).
  services: z.array(z.enum(SERVICE_KEYS)).max(10).optional().transform((v) => (v ? [...new Set(v)] : undefined)),
  events: z.array(z.enum(EVENTS)).max(EVENTS.length).optional().transform((v) => (v ? [...new Set(v)] : undefined)),
  planning: z.enum(PLANNING_KEYS).optional(),
});

export const staffEnquiryInput = enquiryInput.extend({
  source: z.enum(SOURCES).default("PHONE"),
  assignedToId: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
});

export const enquiryPatch = z
  .object({
    status: z.enum(STATUSES),
    lostReason: optionalText(200),
    assignedToId: z.string().uuid().nullable(),
    nextFollowUp: z.coerce.date().nullable(),
    partner1: name,
    partner2: name,
    phone,
    email: optionalEmail,
    roughDate: z.coerce.date().nullable(),
    guestCount: guestCount.nullable(),
    theme: optionalText(60),
    maxBudget: rupees.nullable(),
    city: optionalText(40),
    notes: optionalText(1000),
  })
  .partial();

export const meetingInput = z.object({
  scheduledAt: z.coerce.date({ message: "Pick a date and time" }),
  location: optionalText(120),
  notes: optionalText(500),
});

export const signInput = z.object({
  signerName: name,
  signature: z
    .string()
    .startsWith("data:image/png;base64,", "Please sign in the box")
    .max(400_000, "Signature image too large"),
  agree: z.literal(true, { message: "Please accept the agreement" }),
});

export const convertInput = z
  .object({
    packageKind: z.enum(["FULL_SERVICE", "PARTIAL"]),
    startDate: z.coerce.date({ message: "Pick the first event day" }),
    endDate: z.coerce.date({ message: "Pick the last event day" }),
    city: z.string().trim().min(2, "Enter the city"),
    venue: optionalText(120),
    guestCount,
    contractValue: rupees.refine((p) => p > 0, "Enter the contract value"),
    leadPlannerId: z.string().uuid().optional(),
  })
  .refine((v) => v.endDate >= v.startDate, { path: ["endDate"], message: "End date must be after start date" });

export { email };
