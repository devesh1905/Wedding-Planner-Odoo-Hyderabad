import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handle, HttpError, requireUser } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { generatePlan } from "@/lib/plan";

// Manual trigger (e.g. booking paid offline before the system was used).
export const POST = handle(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await params;
  const res = await db.$transaction(async (tx) => {
    const w = await tx.wedding.findUnique({ where: { id }, select: { stage: true } });
    if (!w) throw new HttpError(404, "Wedding not found");
    const r = await generatePlan(tx, id);
    if (w.stage === "BOOKED") await tx.wedding.update({ where: { id }, data: { stage: "PLANNING" } });
    if (r.created) await logActivity(tx, { actorId: user.sub, entity: "wedding", entityId: id, action: "plan_generated", payload: { tasks: r.created } });
    return r;
  });
  return NextResponse.json(res);
});
