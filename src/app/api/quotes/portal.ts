import { Prisma } from "@prisma/client";
import { HttpError } from "@/lib/auth";
import { db } from "@/lib/db";
import { quoteSelect, requireSignedWedding } from "@/app/api/quote-requests/shared";

export const portalSelect = {
  ...quoteSelect,
  request: { select: {
    id: true, weddingId: true, title: true, category: true, requirements: true, guestCount: true, status: true,
    wedding: { select: { partner1: true, partner2: true, city: true, startDate: true } },
  } },
} satisfies Prisma.VendorQuoteSelect;
export async function findPortalQuote(token: string) {
  const quote = await db.vendorQuote.findUnique({ where: { token }, select: portalSelect });
  if (!quote) throw new HttpError(404, "Invitation not found");
  await requireSignedWedding(db, quote.request.weddingId);
  return quote;
}
export function portalView(quote: Prisma.VendorQuoteGetPayload<{ select: typeof portalSelect }>) {
  const { fileUrl, request, ...summary } = quote;
  return { ...summary, request: {
    id: request.id, title: request.title, category: request.category, requirements: request.requirements,
    guestCount: request.guestCount, status: request.status, wedding: request.wedding,
  }, hasFile: Boolean(fileUrl) };
}
