import { db } from "@/lib/db";
import { HttpError } from "@/lib/auth";
import { extractQuote, extractTextFromPdf } from "@/lib/ai/extract-quote";
import { extractionForStorage, isCurrentExtraction } from "@/lib/ai/store-quote";
import { lockWedding, quoteTransaction, requireSignedWedding } from "@/app/api/quote-requests/shared";
import { portalSelect } from "./portal";
import { MAX_PDF_BYTES } from "./submission";

export const extractionFallbackMessage = "The PDF could not be read automatically. Your proposal is saved; enter or review its line items manually.";
export async function extractAndPersistQuote(id: string, expectedUpdatedAt?: Date) {
  const snapshot = await db.vendorQuote.findUnique({ where: { id }, select: {
    id: true, status: true, updatedAt: true, fileUrl: true, perPlate: true, extraHourRate: true, total: true, notes: true,
    request: { select: { weddingId: true, status: true } },
  } });
  if (!snapshot) throw new HttpError(404, "Quote not found");
  if (expectedUpdatedAt && snapshot.updatedAt.getTime() !== expectedUpdatedAt.getTime()) throw new HttpError(409, "This quote changed before reading began. Please reload it.");
  const wedding = await requireSignedWedding(db, snapshot.request.weddingId);
  if (wedding.stage === "CANCELLED" || wedding.stage === "SETTLED" || snapshot.status !== "SUBMITTED" || snapshot.request.status !== "OPEN") throw new HttpError(409, "Only an open submitted quote can be read");
  const prefix = "data:application/pdf;base64,";
  if (!snapshot.fileUrl?.startsWith(prefix)) throw new HttpError(400, "Upload a proposal PDF before reading this quote");
  let data: ReturnType<typeof extractionForStorage>;
  try {
    const encoded = snapshot.fileUrl.slice(prefix.length);
    if (encoded.length > Math.ceil(MAX_PDF_BYTES / 3) * 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)) throw new Error("Invalid PDF storage");
    const bytes = Buffer.from(encoded, "base64");
    if (!bytes.length || bytes.length > MAX_PDF_BYTES) throw new Error("Invalid PDF size");
    const text = await extractTextFromPdf(bytes);
    const extraction = await extractQuote(text);
    data = extractionForStorage(extraction.data, snapshot);
  } catch { throw new HttpError(422, extractionFallbackMessage); }
  return quoteTransaction(async (tx) => {
    await lockWedding(tx, snapshot.request.weddingId);
    const currentWedding = await requireSignedWedding(tx, snapshot.request.weddingId);
    const current = await tx.vendorQuote.findUnique({ where: { id }, select: { updatedAt: true, fileUrl: true, status: true, request: { select: { status: true } } } });
    if (!current || current.status !== "SUBMITTED" || current.request.status !== "OPEN" || currentWedding.stage === "CANCELLED" || currentWedding.stage === "SETTLED") throw new HttpError(409, "The quote request closed while the PDF was being read");
    if (!isCurrentExtraction(snapshot, current)) throw new HttpError(409, "The proposal changed while it was being read. Reload it before trying again.");
    await tx.quoteLine.deleteMany({ where: { quoteId: id } });
    const { lines, ...summary } = data;
    return tx.vendorQuote.update({ where: { id }, data: {
      ...summary, aiExtracted: true, aiReviewed: false,
      lines: { create: lines.map((line, sortOrder) => ({ ...line, sortOrder })) },
    }, select: portalSelect });
  });
}
