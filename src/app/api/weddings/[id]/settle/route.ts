import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handle, HttpError, requireUser } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { bookingTotals } from "@/lib/settlement";

// Close the wedding only when every vendor is paid in full and every client payment is in.
export const POST = handle(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await params;
  const w = await db.wedding.findUnique({
    where: { id },
    include: { bookings: { include: { extras: true, payments: true, bills: true, vendor: { select: { name: true } } } }, milestones: true },
  });
  if (!w) throw new HttpError(404, "Wedding not found");
  if (w.stage === "SETTLED") throw new HttpError(409, "Already settled");

  const owing = w.bookings.filter((b) => bookingTotals(b).balance > 0).map((b) => b.vendor.name);
  if (owing.length) throw new HttpError(400, `Still to pay: ${owing.join(", ")}`);
  const unpaid = w.milestones.filter((m) => m.status === "DUE");
  if (unpaid.length) throw new HttpError(400, `Client payments still due: ${unpaid.map((m) => m.label).join(", ")}`);

  await db.wedding.update({ where: { id }, data: { stage: "SETTLED" } });
  await logActivity(db, { actorId: user.sub, entity: "wedding", entityId: id, action: "settled" });
  return NextResponse.json({ ok: true });
});
