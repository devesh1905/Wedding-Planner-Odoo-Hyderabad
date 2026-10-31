import { db } from "@/backend/db";
import { handle, HttpError, requireUser } from "@/backend/auth";
import { newToken } from "@/backend/tokens";
import { quoteRequestFilterSchema, quoteRequestSchema } from "@/shared/schemas/quotes";
import { lockWedding, parseJson, privateJson, quoteTransaction, requestSelect, requestView, requireSignedWedding } from "./shared";

export const GET = handle(async (request: Request) => {
  await requireUser();
  const { weddingId } = quoteRequestFilterSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  await requireSignedWedding(db, weddingId);
  const requests = await db.quoteRequest.findMany({ where: { weddingId }, orderBy: { createdAt: "desc" }, select: requestSelect });
  return privateJson({ requests: requests.map(requestView) });
});
export const POST = handle(async (request: Request) => {
  await requireUser();
  const { vendorIds, ...data } = quoteRequestSchema.parse(await parseJson(request));
  const result = await quoteTransaction(async (tx) => {
    await lockWedding(tx, data.weddingId);
    const wedding = await requireSignedWedding(tx, data.weddingId);
    if (wedding.stage === "CANCELLED" || wedding.stage === "SETTLED") throw new HttpError(409, "This wedding no longer accepts quote requests");
    if (await tx.booking.findFirst({ where: { weddingId: data.weddingId, category: data.category }, select: { id: true } })) throw new HttpError(409, "A vendor has already been booked in this category");
    const vendors = await tx.vendor.findMany({ where: { id: { in: vendorIds }, category: data.category }, select: { id: true } });
    if (vendors.length !== vendorIds.length) throw new HttpError(400, "Choose existing vendors in the requested category");
    return tx.quoteRequest.create({ data: { ...data, quotes: { create: vendorIds.map((vendorId) => ({ vendorId, token: newToken() })) } }, select: requestSelect });
  });
  return privateJson({ request: requestView(result) }, 201);
});
