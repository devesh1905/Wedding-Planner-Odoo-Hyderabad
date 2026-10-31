import { NextResponse } from "next/server";
import { db } from "@/backend/db";
import { handle, HttpError, requireUser } from "@/backend/auth";
import { logActivity } from "@/backend/activity";
import { extraClientCharge } from "@/shared/settlement";
import { addDays } from "@/backend/weddings";

// Bill the couple for every billable extra not yet billed, as one ADDON payment milestone.
// Each extra is linked to the milestone so it can never be billed twice.
export const POST = handle(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await params;

  const result = await db.$transaction(async (tx) => {
    const extras = await tx.extra.findMany({
      where: { booking: { weddingId: id }, billableToClient: true, milestoneId: null },
      include: { booking: { select: { category: true } } },
    });
    if (extras.length === 0) throw new HttpError(400, "No unbilled extras for this wedding");
    const amount = extras.reduce((s, e) => s + extraClientCharge(e), 0);
    const m = await tx.paymentMilestone.create({
      data: {
        weddingId: id,
        type: "ADDON",
        label: `Add-ons: ${extras.map((e) => e.description).join(", ").slice(0, 120)}`,
        amount,
        dueDate: addDays(new Date(), 7),
      },
    });
    await tx.extra.updateMany({ where: { id: { in: extras.map((e) => e.id) } }, data: { milestoneId: m.id } });
    await logActivity(tx, { actorId: user.sub, entity: "wedding", entityId: id, action: "addon_billed", payload: { amount, items: extras.length } });
    return { milestoneId: m.id, amount, items: extras.length };
  });

  return NextResponse.json(result, { status: 201 });
});
