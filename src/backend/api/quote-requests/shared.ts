import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { db } from "@/backend/db";
import { HttpError } from "@/backend/auth";

export async function parseJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, "Send a valid JSON object");
  }
}
export async function quoteTransaction<T>(run: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await db.$transaction(run, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10_000, timeout: 30_000 });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
        if (attempt < 2) continue;
        throw new HttpError(409, "Another quote update happened at the same time. Please retry.");
      }
      throw error;
    }
  }
  throw new HttpError(409, "Please retry the quote update");
}
export async function lockWedding(tx: Prisma.TransactionClient, weddingId: string): Promise<void> {
  // Request creation, submissions and awards share this lock so an award cannot miss a concurrent quote.
  await tx.$queryRaw`SELECT "id" FROM "Wedding" WHERE "id" = ${weddingId}::uuid FOR UPDATE`;
}
export async function requireSignedWedding(tx: Prisma.TransactionClient | typeof db, weddingId: string) {
  const wedding = await tx.wedding.findUnique({
    where: { id: weddingId },
    select: {
      id: true,
      guestCount: true,
      stage: true,
      enquiryId: true,
      enquiry: { select: { agreement: { select: { status: true } } } },
    },
  });
  if (!wedding) throw new HttpError(404, "Wedding not found");
  if (wedding.enquiryId && wedding.enquiry?.agreement?.status !== "SIGNED")
    throw new HttpError(403, "The service agreement must be signed before sharing vendor details");
  return wedding;
}
export const lineSelect = {
  id: true,
  item: true,
  category: true,
  qty: true,
  unit: true,
  unitPrice: true,
  included: true,
  sortOrder: true,
} satisfies Prisma.QuoteLineSelect;
export const quoteSelect = {
  id: true,
  token: true,
  status: true,
  perPlate: true,
  extraHourRate: true,
  total: true,
  notes: true,
  aiExtracted: true,
  aiReviewed: true,
  submittedAt: true,
  updatedAt: true,
  fileUrl: true,
  vendor: { select: { id: true, name: true, phone: true } },
  lines: { select: lineSelect, orderBy: { sortOrder: "asc" } },
} satisfies Prisma.VendorQuoteSelect;
export const requestSelect = {
  id: true,
  weddingId: true,
  category: true,
  title: true,
  requirements: true,
  guestCount: true,
  status: true,
  createdAt: true,
  quotes: { select: quoteSelect, orderBy: { vendor: { name: "asc" } } },
} satisfies Prisma.QuoteRequestSelect;
type SelectedRequest = Prisma.QuoteRequestGetPayload<{ select: typeof requestSelect }>;
export function requestView(request: SelectedRequest) {
  return { ...request, quotes: request.quotes.map(({ fileUrl, ...quote }) => ({ ...quote, hasFile: Boolean(fileUrl) })) };
}
export function privateJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
}
