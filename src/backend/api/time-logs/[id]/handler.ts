import { NextResponse } from "next/server";
import { db } from "@/backend/db";
import { handle, HttpError, requireUser } from "@/backend/auth";

// Remove a mistaken entry.
export const DELETE = handle(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireUser();
  const { id } = await params;
  const log = await db.timeLog.findUnique({ where: { id }, select: { id: true } });
  if (!log) throw new HttpError(404, "Entry not found");
  await db.timeLog.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
