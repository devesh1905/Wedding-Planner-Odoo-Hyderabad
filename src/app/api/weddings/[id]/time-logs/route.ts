import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { handle, HttpError, requireUser } from "@/lib/auth";

const Body = z.object({
  userId: z.string().uuid("Pick a team member"),
  date: z.coerce
    .date({ message: "Pick a date" })
    .max(new Date(Date.now() + 86_400_000), "Hours can't be logged for a future date"),
  hours: z.coerce.number({ message: "Enter hours" }).positive("Hours must be more than zero").max(24, "Max 24 hours in a day"),
  note: z.string().trim().max(200).optional().transform((v) => v || undefined),
});

// Planning hours per wedding. Hours × each person's hourly cost feeds the profit on the founder dashboard.
export const POST = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireUser();
  const { id } = await params;
  const data = Body.parse(await req.json());
  const [wedding, user] = await Promise.all([
    db.wedding.findUnique({ where: { id }, select: { id: true } }),
    db.user.findUnique({ where: { id: data.userId }, select: { id: true } }),
  ]);
  if (!wedding) throw new HttpError(404, "Wedding not found");
  if (!user) throw new HttpError(400, "Team member not found");
  const log = await db.timeLog.create({ data: { ...data, weddingId: id } });
  return NextResponse.json(log, { status: 201 });
});
