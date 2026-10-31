import { z } from "zod";
export const liveIdSchema = z.string().uuid().transform((value) => value.toLowerCase());
const timestamp = z.string().datetime({ offset: true });
export const scheduleStatuses = ["UPCOMING", "LIVE", "DONE", "DELAYED"] as const;
export const issueSeverities = ["LOW", "MEDIUM", "HIGH"] as const;
export const schedulePatchSchema = z.object({
  status: z.enum(scheduleStatuses), actualAt: timestamp.nullable().optional(), clientId: liveIdSchema.optional(),
}).strict();
export const checkinSchema = z.object({
  bookingId: liveIdSchema.optional(), token: z.string().regex(/^[a-zA-Z0-9_-]{16,256}$/, "Invalid check-in code").optional(),
  method: z.enum(["QR", "MANUAL"]), arrivedAt: timestamp.optional(), clientId: liveIdSchema,
}).strict().refine((value) => Boolean(value.bookingId || value.token), "Provide a booking or a check-in code");
export const issueCreateSchema = z.object({
  weddingId: liveIdSchema, description: z.string().trim().min(3, "Describe the issue").max(2000),
  ownerId: liveIdSchema.nullable(), severity: z.enum(issueSeverities), clientId: liveIdSchema,
}).strict();
export const issuePatchSchema = z.object({
  status: z.enum(["OPEN", "RESOLVED"]), ownerId: liveIdSchema.nullable().optional(),
  description: z.string().trim().min(3, "Describe the issue").max(2000).optional(),
}).strict();
export const liveQuerySchema = z.object({ weddingId: liveIdSchema }).strict();
