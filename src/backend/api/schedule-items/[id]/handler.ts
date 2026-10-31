import { NextResponse } from "next/server";
import { handle, HttpError, requireUser } from "@/backend/auth";
import { liveIdSchema, schedulePatchSchema } from "@/shared/schemas/live";
import { itemSelect, liveTransaction, parseJson, requireActiveWedding } from "@/backend/api/checkins/shared";

type Context = { params: Promise<{ id: string }> };
export const PATCH = handle(async (request: Request, context: Context) => {
  const user = await requireUser();
  const id = liveIdSchema.parse((await context.params).id);
  const { clientId, ...input } = schedulePatchSchema.parse(await parseJson(request));
  const item = await liveTransaction(async (tx) => {
    const existing = await tx.scheduleItem.findUnique({ where: { id }, select: { actualAt: true, event: { select: { weddingId: true } } } });
    if (!existing) throw new HttpError(404, "Schedule item not found");
    await requireActiveWedding(tx, existing.event.weddingId);
    if (clientId) {
      const receipt = await tx.activityLog.findUnique({ where: { id: clientId } });
      if (receipt) {
        const payload = receipt.payload as { status?: unknown } | null;
        if (receipt.actorId !== user.sub || receipt.entity !== "schedule_item" || receipt.entityId !== id || receipt.action !== "status_updated" || payload?.status !== input.status) throw new HttpError(409, "This action ID was already used for a different update");
        return tx.scheduleItem.findUniqueOrThrow({ where: { id }, select: itemSelect });
      }
    }
    // Moving back to Upcoming clears the actual time; repeated Done updates keep the first completion.
    const actualAt = input.actualAt !== undefined ? input.actualAt ? new Date(input.actualAt) : null
      : input.status === "UPCOMING" ? null : input.status === "DONE" || input.status === "LIVE" ? existing.actualAt ?? new Date() : existing.actualAt;
    const updated = await tx.scheduleItem.update({ where: { id }, data: { status: input.status, actualAt }, select: itemSelect });
    if (clientId) await tx.activityLog.create({ data: { id: clientId, actorId: user.sub, entity: "schedule_item", entityId: id, action: "status_updated", payload: { status: input.status } } });
    return updated;
  });
  return NextResponse.json({ item });
});
