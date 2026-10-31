import { NextResponse } from "next/server";
import { db } from "@/backend/db";
import { handle, requireUser } from "@/backend/auth";

/**
 * Everything the command palette can jump to, in one small payload (a few dozen rows), so
 * filtering happens instantly in the browser as you type.
 */
export const GET = handle(async () => {
  await requireUser();
  const [weddings, enquiries, vendors] = await Promise.all([
    db.wedding.findMany({
      where: { stage: { not: "CANCELLED" } },
      orderBy: { startDate: "asc" },
      select: { id: true, code: true, partner1: true, partner2: true, city: true, venue: true, phone: true, stage: true, startDate: true },
    }),
    db.enquiry.findMany({
      where: { wedding: null },
      orderBy: { createdAt: "desc" },
      select: { id: true, partner1: true, partner2: true, phone: true, city: true, status: true },
    }),
    db.vendor.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, category: true, city: true, phone: true } }),
  ]);
  return NextResponse.json(
    { weddings, enquiries, vendors },
    { headers: { "Cache-Control": "private, no-store" } },
  );
});
