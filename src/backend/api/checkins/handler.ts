import { NextResponse } from "next/server";
import { db } from "@/backend/db";
import { handle, HttpError, requireUser } from "@/backend/auth";
import { checkinSchema, liveQuerySchema } from "@/shared/schemas/live";
import { checkinSelect, issueSelect, itemSelect, liveTransaction, parseJson, requireActiveWedding, scanKey, staffSelect } from "./shared";

export const GET = handle(async (request: Request) => {
  await requireUser();
  const { weddingId } = liveQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  const data = await db.$transaction(async (tx) => {
    await requireActiveWedding(tx, weddingId);
    const events = await tx.weddingEvent.findMany({ where: { weddingId }, orderBy: [{ sortOrder: "asc" }, { startsAt: "asc" }], select: {
      id: true, name: true, startsAt: true, scheduleItems: { select: itemSelect, orderBy: [{ startsAt: "asc" }, { id: "asc" }] },
    } });
    const rawBookings = await tx.booking.findMany({ where: { weddingId }, orderBy: [{ expectedArrival: "asc" }, { id: "asc" }], select: {
      id: true, expectedArrival: true, checkinToken: true, vendor: { select: { id: true, name: true, phone: true, category: true, backupVendor: { select: { id: true, name: true, phone: true } } } },
      checkins: { orderBy: { arrivedAt: "asc" }, take: 1, select: { arrivedAt: true, method: true } },
    } });
    // The raw token is a credential, so it is never sent to the device cache; a hash lets offline scans find the booking.
    const bookings = rawBookings.map(({ checkinToken, ...booking }) => ({ ...booking, scanKey: scanKey(checkinToken) }));
    const issues = await tx.issue.findMany({ where: { weddingId }, orderBy: [{ status: "asc" }, { createdAt: "desc" }], select: issueSelect });
    const staff = await tx.user.findMany({ orderBy: { name: "asc" }, select: staffSelect });
    return { events, bookings, issues, staff };
  });
  return NextResponse.json(data, { headers: { "Cache-Control": "private, no-store", "X-Offline-Cache": "allow" } });
});
export const POST = handle(async (request: Request) => {
  await requireUser();
  const input = checkinSchema.parse(await parseJson(request));
  const result = await liveTransaction(async (tx) => {
    const booking = await tx.booking.findFirst({ where: { ...(input.bookingId ? { id: input.bookingId } : {}), ...(input.token ? { checkinToken: input.token } : {}) }, select: { id: true, weddingId: true, expectedArrival: true } });
    if (!booking) throw new HttpError(404, "Booking or check-in code not found");
    // Keep a single arrival per booking even when two planners tap Arrived simultaneously.
    await tx.$queryRaw`SELECT "id" FROM "Booking" WHERE "id" = ${booking.id}::uuid FOR UPDATE`;
    await requireActiveWedding(tx, booking.weddingId);
    const replay = await tx.checkin.findUnique({ where: { clientId: input.clientId }, select: checkinSelect });
    if (replay) {
      if (replay.bookingId !== booking.id) throw new HttpError(409, "This action ID was already used for another booking");
      return { checkin: replay, duplicate: true };
    }
    const existing = await tx.checkin.findFirst({ where: { bookingId: booking.id }, orderBy: { arrivedAt: "asc" }, select: checkinSelect });
    if (existing) return { checkin: existing, duplicate: true };
    const checkin = await tx.checkin.create({ data: {
      bookingId: booking.id, clientId: input.clientId, method: input.method,
      arrivedAt: input.arrivedAt ? new Date(input.arrivedAt) : new Date(), expectedAt: booking.expectedArrival,
    }, select: checkinSelect });
    return { checkin, duplicate: false };
  });
  return NextResponse.json(result, { status: result.duplicate ? 200 : 201, headers: { "Cache-Control": "private, no-store" } });
});
