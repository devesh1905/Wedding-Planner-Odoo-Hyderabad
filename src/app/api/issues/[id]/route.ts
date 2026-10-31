import { NextResponse } from "next/server";
import { handle, HttpError, requireUser } from "@/lib/auth";
import { issuePatchSchema, liveIdSchema } from "@/components/live/schema";
import { issueSelect, liveTransaction, parseJson, requireActiveWedding, validateOwner } from "@/app/api/checkins/shared";

type Context = { params: Promise<{ id: string }> };
export const PATCH = handle(async (request: Request, context: Context) => {
  await requireUser();
  const id = liveIdSchema.parse((await context.params).id);
  const input = issuePatchSchema.parse(await parseJson(request));
  const issue = await liveTransaction(async (tx) => {
    const existing = await tx.issue.findUnique({ where: { id }, select: { weddingId: true, resolvedAt: true } });
    if (!existing) throw new HttpError(404, "Issue not found");
    await requireActiveWedding(tx, existing.weddingId); await validateOwner(tx, input.ownerId);
    return tx.issue.update({ where: { id }, data: { ...input, resolvedAt: input.status === "RESOLVED" ? existing.resolvedAt ?? new Date() : null }, select: issueSelect });
  });
  return NextResponse.json({ issue });
});
