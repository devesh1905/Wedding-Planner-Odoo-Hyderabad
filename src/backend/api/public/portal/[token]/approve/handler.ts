import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/backend/db";
import { handle, HttpError } from "@/backend/auth";
import { logActivity } from "@/backend/activity";

const Body = z.object({ milestoneId: z.string().uuid() });

// Couple approves the add-on bill from their portal link.
export const POST = handle(async (req: Request, { params }: { params: Promise<{ token: string }> }) => {
  const { token } = await params;
  const { milestoneId } = Body.parse(await req.json());
  const w = await db.wedding.findUnique({ where: { portalToken: token }, select: { id: true, partner1: true } });
  if (!w) throw new HttpError(404, "This link is not valid");
  const m = await db.paymentMilestone.findFirst({ where: { id: milestoneId, weddingId: w.id, type: "ADDON" } });
  if (!m) throw new HttpError(404, "Add-on bill not found");

  await db.$transaction(async (tx) => {
    await tx.extra.updateMany({ where: { milestoneId }, data: { clientApproved: true } });
    await logActivity(tx, { entity: "wedding", entityId: w.id, action: "addons_approved", payload: { amount: m.amount, by: w.partner1 } });
  });
  return NextResponse.json({ ok: true });
});
