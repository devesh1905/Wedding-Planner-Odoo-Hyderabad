import { NextResponse } from "next/server";
import { z } from "zod";
import { handle, HttpError, requireUser } from "@/backend/auth";
import { issueCreateSchema, liveIdSchema, schedulePatchSchema } from "@/shared/schemas/live";
import { liveTransaction, parseJson, requireActiveWedding, validateOwner } from "@/backend/api/checkins/shared";

/**
 * Batch endpoint for actions queued on a device while offline.
 * Every action carries a device-generated clientId; applying the same clientId twice is a no-op,
 * so a retry after a lost response (or a second open tab) can never create duplicates.
 * The response lists `acceptedClientIds` (applied now or already applied before) and `rejected`
 * (permanently invalid actions, e.g. deleted booking) so the device can stop retrying them.
 */
const envelope = { clientId: liveIdSchema, createdAt: z.string().datetime({ offset: true }) };
const checkinPayload = z
  .object({
    bookingId: liveIdSchema.optional(),
    token: z
      .string()
      .regex(/^[a-zA-Z0-9_-]{16,256}$/)
      .optional(),
    method: z.enum(["QR", "MANUAL"]),
    arrivedAt: z.string().datetime({ offset: true }).optional(),
  })
  .strict()
  .refine((value) => Boolean(value.bookingId || value.token), "Provide a booking or a check-in code");
const actionSchema = z.discriminatedUnion("type", [
  z.object({ ...envelope, type: z.literal("CHECKIN"), payload: checkinPayload }),
  z.object({
    ...envelope,
    type: z.literal("SCHEDULE_STATUS"),
    payload: z.object({ itemId: liveIdSchema, status: schedulePatchSchema.shape.status, actualAt: schedulePatchSchema.shape.actualAt }).strict(),
  }),
  z.object({ ...envelope, type: z.literal("ISSUE"), payload: issueCreateSchema.omit({ clientId: true }) }),
]);
const bodySchema = z.object({ actions: z.array(z.unknown()).max(200) });
type Action = z.infer<typeof actionSchema>;

async function applyCheckin(action: Extract<Action, { type: "CHECKIN" }>) {
  const input = action.payload;
  await liveTransaction(async (tx) => {
    const booking = await tx.booking.findFirst({
      where: { ...(input.bookingId ? { id: input.bookingId } : {}), ...(input.token ? { checkinToken: input.token } : {}) },
      select: { id: true, weddingId: true, expectedArrival: true },
    });
    if (!booking) throw new HttpError(404, "Booking not found");
    // Lock the booking row so two devices syncing the same arrival cannot both insert.
    await tx.$queryRaw`SELECT "id" FROM "Booking" WHERE "id" = ${booking.id}::uuid FOR UPDATE`;
    await requireActiveWedding(tx, booking.weddingId);
    if (await tx.checkin.findUnique({ where: { clientId: action.clientId }, select: { id: true } })) return;
    // One arrival per booking: a different device already recorded it, so this one is a duplicate.
    if (await tx.checkin.findFirst({ where: { bookingId: booking.id }, select: { id: true } })) return;
    await tx.checkin.create({
      data: {
        bookingId: booking.id,
        clientId: action.clientId,
        method: input.method,
        arrivedAt: input.arrivedAt ? new Date(input.arrivedAt) : new Date(action.createdAt),
        expectedAt: booking.expectedArrival,
      },
    });
  });
}
async function applyStatus(action: Extract<Action, { type: "SCHEDULE_STATUS" }>, actorId: string) {
  const { itemId, status, actualAt } = action.payload;
  await liveTransaction(async (tx) => {
    const item = await tx.scheduleItem.findUnique({ where: { id: itemId }, select: { actualAt: true, event: { select: { weddingId: true } } } });
    if (!item) throw new HttpError(404, "Schedule item not found");
    await requireActiveWedding(tx, item.event.weddingId);
    // The activity log row (id = clientId) is the receipt that makes this update idempotent.
    if (await tx.activityLog.findUnique({ where: { id: action.clientId }, select: { id: true } })) return;
    const next =
      actualAt !== undefined
        ? actualAt
          ? new Date(actualAt)
          : null
        : status === "UPCOMING"
          ? null
          : status === "DONE" || status === "LIVE"
            ? (item.actualAt ?? new Date(action.createdAt))
            : item.actualAt;
    await tx.scheduleItem.update({ where: { id: itemId }, data: { status, actualAt: next } });
    await tx.activityLog.create({
      data: { id: action.clientId, actorId, entity: "schedule_item", entityId: itemId, action: "status_updated", payload: { status } },
    });
  });
}
async function applyIssue(action: Extract<Action, { type: "ISSUE" }>) {
  const input = action.payload;
  await liveTransaction(async (tx) => {
    await requireActiveWedding(tx, input.weddingId);
    await validateOwner(tx, input.ownerId);
    if (await tx.issue.findUnique({ where: { clientId: action.clientId }, select: { id: true } })) return;
    await tx.issue.create({ data: { ...input, clientId: action.clientId } });
  });
}

export const POST = handle(async (request: Request) => {
  const user = await requireUser();
  const { actions } = bodySchema.parse(await parseJson(request));
  const acceptedClientIds: string[] = [];
  const rejected: { clientId: string; error: string }[] = [];
  // Oldest first, one short transaction per action: a bad action never blocks the rest of the batch.
  for (const raw of actions) {
    const parsed = actionSchema.safeParse(raw);
    if (!parsed.success) {
      const id = liveIdSchema.safeParse((raw as { clientId?: unknown } | null)?.clientId);
      if (id.success) {
        acceptedClientIds.push(id.data);
        rejected.push({ clientId: id.data, error: parsed.error.issues[0]?.message ?? "Invalid action" });
      }
      continue;
    }
    const action = parsed.data;
    try {
      if (action.type === "CHECKIN") await applyCheckin(action);
      else if (action.type === "SCHEDULE_STATUS") await applyStatus(action, user.sub);
      else await applyIssue(action);
      acceptedClientIds.push(action.clientId);
    } catch (error) {
      // 4xx = the action can never succeed (acknowledge so the device stops retrying); anything else stays pending.
      if (error instanceof HttpError && error.status >= 400 && error.status < 500 && error.status !== 401) {
        acceptedClientIds.push(action.clientId);
        rejected.push({ clientId: action.clientId, error: error.message });
      } else console.error(error);
    }
  }
  return NextResponse.json({ acceptedClientIds, rejected }, { headers: { "Cache-Control": "private, no-store" } });
});
