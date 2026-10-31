import { PrismaClient, type ScheduleStatus } from "@prisma/client";
import { randomUUID } from "node:crypto";

// Makes the demo wedding "happen today": shifts all dates relative to now and
// rebuilds schedule statuses, vendor arrivals, check-ins and issues. Repeatable.
const WEDDING_ID = "00000002-0000-4000-8000-000000000001";
const MIN = 60_000;
const db = new PrismaClient();

const ist = (d: Date) =>
  d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true });
const istDateOnly = (d: Date) => {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  return new Date(`${p}T00:00:00.000Z`);
};

async function run() {
  const now = new Date();
  const nowMs = now.getTime();

  const wedding = await db.wedding.findUnique({
    where: { id: WEDDING_ID },
    select: { id: true, leadPlannerId: true, events: { orderBy: { sortOrder: "asc" }, select: { id: true, name: true, startsAt: true } } },
  });
  if (!wedding) throw new Error(`Demo wedding ${WEDDING_ID} not found`);
  const mainEvent = wedding.events.find((e) => e.name === "Wedding");
  if (!mainEvent) throw new Error('No "Wedding" event on the demo wedding');

  // 1. Shift everything so the Wedding event started 90 minutes ago.
  const deltaMs = nowMs - 90 * MIN - mainEvent.startsAt.getTime();
  await db.$executeRaw`UPDATE "WeddingEvent" SET "startsAt" = "startsAt" + (${deltaMs}::double precision * interval '1 millisecond') WHERE "weddingId" = ${WEDDING_ID}::uuid`;
  await db.$executeRaw`UPDATE "ScheduleItem" SET
      "startsAt" = "startsAt" + (${deltaMs}::double precision * interval '1 millisecond'),
      "actualAt" = CASE WHEN "actualAt" IS NULL THEN NULL ELSE "actualAt" + (${deltaMs}::double precision * interval '1 millisecond') END
    WHERE "eventId" IN (SELECT "id" FROM "WeddingEvent" WHERE "weddingId" = ${WEDDING_ID}::uuid)`;

  const events = await db.weddingEvent.findMany({
    where: { weddingId: WEDDING_ID },
    orderBy: [{ sortOrder: "asc" }, { startsAt: "asc" }],
    select: { id: true, name: true, startsAt: true, scheduleItems: { orderBy: [{ startsAt: "asc" }, { id: "asc" }], select: { id: true, startsAt: true, durationMin: true } } },
  });
  const starts = events.map((e) => e.startsAt.getTime());
  await db.wedding.update({
    where: { id: WEDDING_ID },
    data: { startDate: istDateOnly(new Date(Math.min(...starts))), endDate: istDateOnly(new Date(Math.max(...starts))), stage: "BIG_DAY" },
  });

  // 2. Schedule statuses.
  const done: string[] = [];
  const delayed: { id: string; actualAt: Date }[] = [];
  const live: string[] = [];
  const upcoming: string[] = [];
  for (const ev of events) {
    const items = ev.scheduleItems;
    const endOf = (i: { startsAt: Date; durationMin: number }) => i.startsAt.getTime() + i.durationMin * MIN;
    if (items.every((i) => endOf(i) <= nowMs)) { done.push(...items.map((i) => i.id)); continue; }
    if (items.every((i) => i.startsAt.getTime() > nowMs)) { upcoming.push(...items.map((i) => i.id)); continue; }
    let pastIdx = 0;
    for (const i of items) {
      if (endOf(i) <= nowMs) {
        pastIdx++;
        if ((pastIdx === 4 || pastIdx === 9) && endOf(i) + 15 * MIN <= nowMs) {
          delayed.push({ id: i.id, actualAt: new Date(i.startsAt.getTime() + (pastIdx === 4 ? 12 : 14) * MIN) });
        } else done.push(i.id);
      } else if (i.startsAt.getTime() <= nowMs) live.push(i.id);
      else upcoming.push(i.id);
    }
  }
  const setStatus = async (ids: string[], status: ScheduleStatus) => {
    if (ids.length) await db.scheduleItem.updateMany({ where: { id: { in: ids } }, data: { status, actualAt: null } });
  };
  await setStatus(live, "LIVE");
  await setStatus(upcoming, "UPCOMING");
  if (done.length) {
    await db.$executeRaw`UPDATE "ScheduleItem" SET "status" = 'DONE', "actualAt" = "startsAt" WHERE "id" = ANY(${done}::uuid[])`;
  }
  for (const d of delayed) await db.scheduleItem.update({ where: { id: d.id }, data: { status: "DELAYED", actualAt: d.actualAt } });

  // 3. Bookings and check-ins.
  const bookings = await db.booking.findMany({
    where: { weddingId: WEDDING_ID },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true, category: true },
  });
  const dj = bookings.find((b) => b.category === "DJ");
  const others = bookings.filter((b) => b !== dj);
  const expected = new Map<string, Date>();
  // Spread from 3h ago to 2h ahead, keeping clear of the 25-minutes-ago slot reserved for the DJ.
  others.forEach((b, i) => {
    const frac = others.length > 1 ? i / (others.length - 1) : 0.5;
    let offset = -180 + frac * 300;
    if (Math.abs(offset + 25) < 8) offset += offset >= -25 ? 10 : -10;
    expected.set(b.id, new Date(nowMs + Math.round(offset) * MIN));
  });
  if (dj) expected.set(dj.id, new Date(nowMs - 25 * MIN));

  for (const b of bookings) await db.booking.update({ where: { id: b.id }, data: { expectedArrival: expected.get(b.id)! } });
  const ids = bookings.map((b) => b.id);
  await db.checkin.deleteMany({ where: { bookingId: { in: ids } } });
  const checkins: { clientId: string; bookingId: string; expectedAt: Date; arrivedAt: Date; method: "MANUAL" | "QR" }[] = [];
  others.forEach((b, i) => {
    const exp = expected.get(b.id)!;
    if (exp.getTime() > nowMs - MIN) return;
    const lateMin = i % 4 === 3 ? 3 + (i % 5) : (i % 3) - 1; // mostly on time, a few a handful of minutes late
    const arrivedAt = new Date(Math.min(exp.getTime() + lateMin * MIN, nowMs - MIN));
    checkins.push({ clientId: randomUUID(), bookingId: b.id, expectedAt: exp, arrivedAt, method: i % 2 === 0 ? "QR" : "MANUAL" });
  });
  if (checkins.length) await db.checkin.createMany({ data: checkins });

  // 4. Issues.
  const planner =
    (wedding.leadPlannerId ? await db.user.findUnique({ where: { id: wedding.leadPlannerId } }) : null) ??
    (await db.user.findFirst({ where: { role: "PLANNER" }, orderBy: { name: "asc" } }));
  const resolvedText = "Photographer asked for a second power point near the stage";
  await db.issue.deleteMany({ where: { weddingId: WEDDING_ID, OR: [{ status: "OPEN" }, { description: resolvedText }] } });
  await db.issue.create({ data: { weddingId: WEDDING_ID, ownerId: planner?.id, description: "Florist needs an extra generator for the mandap lights", severity: "HIGH", status: "OPEN" } });
  await db.issue.create({ data: { weddingId: WEDDING_ID, ownerId: planner?.id, description: resolvedText, severity: "MEDIUM", status: "RESOLVED", resolvedAt: new Date(nowMs - 40 * MIN) } });

  // Summary.
  const lateCount = bookings.filter((b) => !checkins.some((c) => c.bookingId === b.id) && expected.get(b.id)!.getTime() < nowMs).length;
  const expectedCount = bookings.length - checkins.length - lateCount;
  console.log("Demo wedding is live now.");
  for (const e of await db.weddingEvent.findMany({ where: { weddingId: WEDDING_ID }, orderBy: { sortOrder: "asc" } })) {
    console.log(`  ${e.name.padEnd(10)} starts ${ist(e.startsAt)} IST`);
  }
  console.log(`Schedule: ${done.length} done, ${delayed.length} delayed, ${live.length} live, ${upcoming.length} upcoming`);
  console.log(`Vendors: ${checkins.length} arrived, ${lateCount} late${dj ? " (DJ)" : ""}, ${expectedCount} expected`);
  console.log(`Wedding id: ${WEDDING_ID}`);
  console.log(`Path: /weddings/${WEDDING_ID}/live`);
}

run()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => db.$disconnect());
