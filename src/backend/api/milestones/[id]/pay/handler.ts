import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/backend/db";
import { handle, HttpError, requireUser } from "@/backend/auth";
import { logActivity } from "@/backend/activity";
import { generatePlan } from "@/backend/plan";

const Body = z.object({
  reference: z.string().trim().min(3, "Enter the payment reference (UTR / cheque no.)").max(60),
  paidAt: z.coerce
    .date()
    .max(new Date(Date.now() + 86_400_000), "Payment date can't be in the future")
    .optional(),
});

// Record a client payment. The reference is unique across all milestones, so the same receipt can't be used twice.
// Paying the BOOKING milestone kicks off the wedding plan automatically.
export const POST = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await params;
  const { reference, paidAt } = Body.parse(await req.json());

  const result = await db.$transaction(async (tx) => {
    const m = await tx.paymentMilestone.findUnique({ where: { id }, include: { wedding: { select: { id: true, stage: true } } } });
    if (!m) throw new HttpError(404, "Payment not found");
    if (m.status === "PAID") throw new HttpError(409, "This payment is already recorded");
    if (m.status === "CANCELLED") throw new HttpError(400, "This payment was cancelled");
    const dupe = await tx.paymentMilestone.findUnique({ where: { reference } });
    if (dupe) throw new HttpError(409, "This payment reference was already used");

    await tx.paymentMilestone.update({ where: { id }, data: { status: "PAID", reference, paidAt: paidAt ?? new Date() } });
    await logActivity(tx, {
      actorId: user.sub,
      entity: "wedding",
      entityId: m.weddingId,
      action: "payment_received",
      payload: { label: m.label, amount: m.amount },
    });

    let plan = { created: 0 };
    if (m.type === "BOOKING") {
      plan = await generatePlan(tx, m.weddingId);
      if (m.wedding.stage === "BOOKED") await tx.wedding.update({ where: { id: m.weddingId }, data: { stage: "PLANNING" } });
      if (plan.created) {
        await logActivity(tx, { actorId: user.sub, entity: "wedding", entityId: m.weddingId, action: "plan_generated", payload: { tasks: plan.created } });
      }
    }
    return { planCreated: plan.created };
  });

  return NextResponse.json({ ok: true, ...result });
});
