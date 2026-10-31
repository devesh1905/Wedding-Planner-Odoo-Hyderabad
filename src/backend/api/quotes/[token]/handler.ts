import { handle, HttpError } from "@/backend/auth";
import { db } from "@/backend/db";
import { tokenSchema } from "@/shared/schemas/quotes";
import { lockWedding, privateJson, quoteTransaction, requireSignedWedding } from "@/backend/api/quote-requests/shared";
import { findPortalQuote, portalSelect, portalView } from "../portal";
import { parseSubmission } from "../submission";
import { extractAndPersistQuote, extractionFallbackMessage } from "../extraction";

type Context = { params: Promise<{ token: string }> };
export const GET = handle(async (_request: Request, context: Context) => {
  const token = tokenSchema.parse((await context.params).token);
  return privateJson({ quote: portalView(await findPortalQuote(token)) });
});
export const POST = handle(async (request: Request, context: Context) => {
  const token = tokenSchema.parse((await context.params).token);
  const invitation = await db.vendorQuote.findUnique({ where: { token }, select: { id: true, request: { select: { weddingId: true } } } });
  if (!invitation) throw new HttpError(404, "Invitation not found");
  const { data, fileUrl } = await parseSubmission(request);
  let quote = await quoteTransaction(async (tx) => {
    await lockWedding(tx, invitation.request.weddingId);
    const wedding = await requireSignedWedding(tx, invitation.request.weddingId);
    if (wedding.stage === "CANCELLED" || wedding.stage === "SETTLED") throw new HttpError(409, "This wedding no longer accepts quote submissions");
    const current = await tx.vendorQuote.findUnique({ where: { token }, select: { id: true, status: true, request: { select: { status: true } } } });
    if (!current) throw new HttpError(404, "Invitation not found");
    if (current.request.status !== "OPEN" || current.status === "WON" || current.status === "NOT_SELECTED")
      throw new HttpError(409, "This quote request is closed and cannot be changed");
    await tx.quoteLine.deleteMany({ where: { quoteId: current.id } });
    const { lines, ...summary } = data;
    return tx.vendorQuote.update({
      where: { id: current.id },
      data: {
        ...summary,
        fileUrl,
        status: "SUBMITTED",
        submittedAt: new Date(),
        aiExtracted: false,
        aiReviewed: false,
        lines: { create: lines.map((line, sortOrder) => ({ ...line, sortOrder })) },
      },
      select: portalSelect,
    });
  });
  let extractionError: string | undefined;
  if (fileUrl) {
    try {
      quote = await extractAndPersistQuote(quote.id, quote.updatedAt);
    } catch {
      extractionError = extractionFallbackMessage;
    }
  }
  return privateJson({ quote: portalView(quote), ...(extractionError ? { extractionError } : {}) });
});
