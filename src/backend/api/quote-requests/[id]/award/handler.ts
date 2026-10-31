import { handle, HttpError, requireUser } from "@/backend/auth";
import { newToken } from "@/backend/tokens";
import { logActivity } from "@/backend/activity";
import { quoteAwardSchema, quoteIdSchema } from "@/shared/schemas/quotes";
import { lockWedding, parseJson, privateJson, quoteTransaction, requireSignedWedding } from "../../shared";

type Context = { params: Promise<{ id: string }> };
export const POST = handle(async (request: Request, context: Context) => {
  const user = await requireUser();
  const id = quoteIdSchema.parse((await context.params).id);
  const input = quoteAwardSchema.parse(await parseJson(request));
  const result = await quoteTransaction(async (tx) => {
    const candidate = await tx.quoteRequest.findUnique({ where: { id }, select: { weddingId: true } });
    if (!candidate) throw new HttpError(404, "Quote request not found");
    await lockWedding(tx, candidate.weddingId);
    const wedding = await requireSignedWedding(tx, candidate.weddingId);
    if (wedding.stage === "CANCELLED" || wedding.stage === "SETTLED") throw new HttpError(409, "This wedding no longer accepts vendor awards");
    const group = await tx.quoteRequest.findUnique({ where: { id } });
    if (!group || group.status !== "OPEN") throw new HttpError(409, "This request has already been awarded or closed");
    const winner = await tx.vendorQuote.findUnique({ where: { id: input.quoteId }, select: { id: true, requestId: true, vendorId: true, status: true, updatedAt: true, total: true, perPlate: true, extraHourRate: true, aiExtracted: true, aiReviewed: true, vendor: { select: { category: true } } } });
    if (!winner || winner.requestId !== id) throw new HttpError(400, "Choose a quote belonging to this request");
    if (input.expectedUpdatedAt && winner.updatedAt.getTime() !== new Date(input.expectedUpdatedAt).getTime()) throw new HttpError(409, "The vendor changed this proposal. Reload the comparison before awarding it.");
    if (winner.status !== "SUBMITTED" || winner.total === null || winner.total <= 0) throw new HttpError(400, "Only a submitted quote with a confirmed total can be awarded");
    if (winner.aiExtracted && !winner.aiReviewed) throw new HttpError(409, "Review and confirm the AI-read line items before awarding this quote");
    if (winner.vendor.category !== group.category) throw new HttpError(409, "The vendor category changed. Please review the request before awarding.");
    if (await tx.booking.findFirst({ where: { weddingId: group.weddingId, category: group.category }, select: { id: true } })) throw new HttpError(409, "A vendor has already been booked in this category");
    const claimed = await tx.quoteRequest.updateMany({ where: { id, status: "OPEN" }, data: { status: "AWARDED" } });
    if (claimed.count !== 1) throw new HttpError(409, "Another planner already awarded this request");
    const booking = await tx.booking.create({ data: {
      weddingId: group.weddingId, vendorId: winner.vendorId, quoteId: winner.id, category: group.category,
      agreedAmount: winner.total, perPlate: winner.perPlate, agreedGuests: group.guestCount ?? wedding.guestCount,
      agreedHours: input.agreedHours ?? null, hourlyRate: winner.extraHourRate,
      expectedArrival: input.expectedArrival ? new Date(input.expectedArrival) : null, checkinToken: newToken(),
    }, select: { id: true, weddingId: true, vendorId: true, agreedAmount: true } });
    const competing = await tx.quoteRequest.findMany({ where: { weddingId: group.weddingId, category: group.category, status: "OPEN", id: { not: id } }, select: { id: true } });
    const losingRequestIds = competing.map((entry) => entry.id);
    await tx.vendorQuote.updateMany({ where: { requestId: { in: [id, ...losingRequestIds] }, id: { not: winner.id } }, data: { status: "NOT_SELECTED" } });
    await tx.vendorQuote.update({ where: { id: winner.id }, data: { status: "WON" } });
    if (losingRequestIds.length) await tx.quoteRequest.updateMany({ where: { id: { in: losingRequestIds } }, data: { status: "CLOSED" } });
    await logActivity(tx, { actorId: user.sub, entity: "wedding", entityId: group.weddingId, action: "quote_awarded", payload: { requestId: id, quoteId: winner.id, bookingId: booking.id, vendorId: winner.vendorId, amount: winner.total } });
    return { booking, requestId: id, quoteId: winner.id };
  });
  return privateJson(result, 201);
});
