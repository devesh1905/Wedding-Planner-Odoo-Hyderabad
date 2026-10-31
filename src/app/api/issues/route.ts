import { NextResponse } from "next/server";
import { handle, HttpError, requireUser } from "@/lib/auth";
import { issueCreateSchema } from "@/components/live/schema";
import { issueSelect, liveTransaction, parseJson, requireActiveWedding, validateOwner } from "@/app/api/checkins/shared";

export const POST = handle(async (request: Request) => {
  await requireUser();
  const input = issueCreateSchema.parse(await parseJson(request));
  const result = await liveTransaction(async (tx) => {
    await requireActiveWedding(tx, input.weddingId);
    await validateOwner(tx, input.ownerId);
    const replay = await tx.issue.findUnique({ where: { clientId: input.clientId }, select: { ...issueSelect, weddingId: true } });
    if (replay) {
      if (replay.weddingId !== input.weddingId) throw new HttpError(409, "This action ID was already used for another wedding");
      return { issue: replay, duplicate: true };
    }
    const issue = await tx.issue.create({ data: input, select: issueSelect });
    return { issue, duplicate: false };
  });
  return NextResponse.json(result, { status: result.duplicate ? 200 : 201 });
});
