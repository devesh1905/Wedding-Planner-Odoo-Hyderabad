import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handle, requireUser } from "@/lib/auth";

const IST = 5.5 * 60 * 60_000;
const OPEN: [number, number] = [10 * 60, 19 * 60]; // office hours, minutes from midnight IST
const MEETING_MIN = 60; // meetings are booked for an hour

/**
 * The next five working days (Mon–Sat) with the agency's existing meetings marked busy,
 * in the shape the slot picker expects: minutes from midnight, India time.
 */
export const GET = handle(async () => {
  await requireUser();
  const nowIst = new Date(Date.now() + IST);
  const days: { date: string; open: [number, number]; busy: [number, number][] }[] = [];
  for (let d = 1; days.length < 5; d++) {
    const day = new Date(Date.UTC(nowIst.getUTCFullYear(), nowIst.getUTCMonth(), nowIst.getUTCDate() + d));
    if (day.getUTCDay() !== 0) days.push({ date: day.toISOString().slice(0, 10), open: OPEN, busy: [] });
  }
  const from = new Date(Date.parse(`${days[0]!.date}T00:00:00Z`) - IST);
  const to = new Date(Date.parse(`${days.at(-1)!.date}T23:59:59Z`) - IST);
  const meetings = await db.meeting.findMany({ where: { scheduledAt: { gte: from, lte: to } }, select: { scheduledAt: true } });
  for (const m of meetings) {
    const ist = new Date(m.scheduledAt.getTime() + IST);
    const day = days.find((d) => d.date === ist.toISOString().slice(0, 10));
    const start = ist.getUTCHours() * 60 + ist.getUTCMinutes();
    day?.busy.push([start, start + MEETING_MIN]);
  }
  days.forEach((d) => d.busy.sort((a, b) => a[0] - b[0]));
  return NextResponse.json({ days });
});
