import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { handle, HttpError, requireUser } from "@/lib/auth";

const Body = z.object({
  title: z.string().trim().min(3, "Title is too short").max(160),
  event: z.string().trim().min(2).max(30),
  ownerId: z.string().uuid().optional(),
  dueDate: z.coerce.date().optional(),
});

// Custom task added on top of the generated plan.
export const POST = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await params;
  const data = Body.parse(await req.json());
  const w = await db.wedding.findUnique({ where: { id }, select: { id: true } });
  if (!w) throw new HttpError(404, "Wedding not found");
  const task = await db.task.create({ data: { ...data, weddingId: id, ownerId: data.ownerId ?? user.sub, sortOrder: 999 } });
  return NextResponse.json(task, { status: 201 });
});
