import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/backend/db";
import { handle, HttpError, requireUser } from "@/backend/auth";

const Patch = z
  .object({
    stage: z.enum(["TO_PLAN", "IN_PROGRESS", "WAITING", "DONE"]),
    ownerId: z.string().uuid().nullable(),
    dueDate: z.coerce.date().nullable(),
    title: z.string().trim().min(3, "Title is too short").max(160),
  })
  .partial();

export const PATCH = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireUser();
  const { id } = await params;
  const data = Patch.parse(await req.json());
  const task = await db.task.findUnique({ where: { id }, select: { stage: true } });
  if (!task) throw new HttpError(404, "Task not found");
  const doneAt = data.stage === undefined ? undefined : data.stage === "DONE" ? new Date() : null;
  const updated = await db.task.update({ where: { id }, data: { ...data, doneAt } });
  return NextResponse.json(updated);
});
