import { handle, HttpError, requireUser } from "@/lib/auth";
import { quoteIdSchema, quoteReviewSchema } from "@/components/quotes/schema";
import { lockWedding, parseJson, privateJson, quoteTransaction, requireSignedWedding } from "@/app/api/quote-requests/shared";
import { portalSelect, portalView } from "../../portal";

type Context = { params: Promise<{ token: string }> };
export const PATCH = handle(async (request: Request, context: Context) => {
  await requireUser();
  const id = quoteIdSchema.parse((await context.params).token);
  const { lines, expectedUpdatedAt, ...summary } = quoteReviewSchema.parse(await parseJson(request));
  const quote = await quoteTransaction(async (tx) => {
    const candidate = await tx.vendorQuote.findUnique({ where: { id }, select: { request: { select: { weddingId: true } } } });
    if (!candidate) throw new HttpError(404, "Quote not found");
    await lockWedding(tx, candidate.request.weddingId);
    const wedding = await requireSignedWedding(tx, candidate.request.weddingId);
    const current = await tx.vendorQuote.findUnique({ where: { id }, select: { status: true, updatedAt: true, aiExtracted: true, request: { select: { status: true } } } });
    if (!current || current.status !== "SUBMITTED" || current.request.status !== "OPEN" || wedding.stage === "CANCELLED" || wedding.stage === "SETTLED") throw new HttpError(409, "Only an open submitted quote can be reviewed");
    if (expectedUpdatedAt && current.updatedAt.getTime() !== new Date(expectedUpdatedAt).getTime()) throw new HttpError(409, "The vendor changed this proposal. Reload it before saving your review.");
    await tx.quoteLine.deleteMany({ where: { quoteId: id } });
    return tx.vendorQuote.update({ where: { id }, data: { ...summary, aiReviewed: current.aiExtracted,
      lines: { create: lines.map((line, sortOrder) => ({ ...line, sortOrder })) },
    }, select: portalSelect });
  });
  return privateJson({ quote: portalView(quote) });
});
