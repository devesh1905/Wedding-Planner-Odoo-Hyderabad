import { randomUUID } from "node:crypto";
import type { PrismaClient, Prisma, WeddingStage as DbStage, VendorCategory as DbCategory } from "@prisma/client";
import { newToken } from "../../src/lib/tokens";
import { vendors } from "../seed-data/vendors";
import { weddings, weddingFinance } from "../seed-data/weddings";
import { weddingEvents, schedule } from "../seed-data/schedule";
import { historicalBookings, checkins } from "../seed-data/checkins";
import type { WeddingStage } from "../seed-data/types";

// Fixed "today" so stage-dependent data is reproducible.
const TODAY = new Date("2026-10-31T00:00:00.000Z");
const DAY = 86400000;
// Seed data is in paise; the database stores whole rupees.


const scaleMoney = (paise: number) => Math.round(paise / 100);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY);

const STAGE_MAP: Record<WeddingStage, DbStage> = {
  ENQUIRY: "BOOKED",
  AGREEMENT_SIGNED: "BOOKED",
  BOOKED: "BOOKED",
  PLANNING: "PLANNING",
  LIVE: "BIG_DAY",
  COMPLETED: "SETTLEMENT",
  SETTLED: "SETTLED",
};

const CATEGORY_WEIGHT: [DbCategory, number][] = [
  ["CATERER", 30], ["DECORATOR", 22], ["PHOTOGRAPHER", 10], ["FLORIST", 8], ["LIGHTING", 8],
  ["TENT", 7], ["MAKEUP", 6], ["DJ", 4], ["TRANSPORT", 3], ["DHOL", 2],
];

type BookingRow = {
  id: string; weddingId: string; vendorId: string; category: DbCategory; agreedAmount: number;
  checkinToken: string; expectedArrival: Date; agreedHours: number | null; hourlyRate: number | null;
  agreedGuests: number | null; perPlate: number | null;
};

async function insertAll<T>(rows: T[], fn: (batch: T[]) => Promise<unknown>, size = 1000) {
  for (let i = 0; i < rows.length; i += size) await fn(rows.slice(i, i + size));
}

/** Splits `total` across weights; the last entry takes the remainder so the sum is exact. */
function splitByWeight(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  const out: number[] = [];
  let used = 0;
  weights.forEach((w, i) => {
    const v = i === weights.length - 1 ? total - used : Math.round((total * w) / sum);
    out.push(v);
    used += v;
  });
  return out;
}

export async function seedDemo(db: PrismaClient) {
  const userRows = await db.user.findMany();
  const byEmail = new Map(userRows.map((u) => [u.email, u]));
  const founder = byEmail.get("founder@royalknot.in")!;
  const planners = ["ananya", "kabir", "ishita"].map((n) => byEmail.get(`${n}@royalknot.in`)!);
  const packages = await db.package.findMany({ include: { templates: { orderBy: { sortOrder: "asc" } } } });
  const pkgByKind = new Map(packages.map((p) => [p.kind, p]));
  const plannerFor = (i: number) => planners[i % planners.length]!;

  // Wipe previous demo data (weddings cascade to tasks/bookings/etc, then vendors).
  await db.wedding.deleteMany();
  await db.vendor.deleteMany();

  // Vendors: insert first, then link backups.
  await db.vendor.createMany({
    data: vendors.map((v) => ({
      id: v.id, name: v.name, category: v.category, phone: v.phone, email: v.email, city: v.city,
      createdAt: new Date(v.createdAt), updatedAt: new Date(v.updatedAt),
    })),
  });
  for (const v of vendors) {
    await db.vendor.update({ where: { id: v.id }, data: { backupVendorId: v.backupVendorId } });
  }

  // Weddings
  await db.wedding.createMany({
    data: weddings.map((w, i) => ({
      id: w.id, code: w.code, packageId: pkgByKind.get(w.packageName)!.id, leadPlannerId: plannerFor(i).id,
      partner1: w.partner1, partner2: w.partner2, phone: `98${String(76500000 + i * 1373).padStart(8, "0")}`,
      email: `${w.partner1}.${w.partner2}@example.com`.toLowerCase(),
      startDate: new Date(w.startDate), endDate: new Date(w.endDate), city: w.city, venue: w.venue,
      guestCount: w.guestCount, theme: w.theme, contractValue: scaleMoney(w.contractValue), stage: STAGE_MAP[w.stage],
      portalToken: newToken(), createdAt: new Date(w.createdAt), updatedAt: new Date(w.updatedAt),
    })),
  });

  // Tasks from package templates
  const taskRows: Prisma.TaskCreateManyInput[] = [];
  weddings.forEach((w, i) => {
    const stage = STAGE_MAP[w.stage];
    if (stage === "BOOKED") return; // plan is generated once the deposit is paid
    const start = new Date(w.startDate);
    const planner = plannerFor(i);
    for (const t of pkgByKind.get(w.packageName)!.templates) {
      const due = addDays(start, t.offsetDays);
      let status: "TO_PLAN" | "IN_PROGRESS" | "DONE" | "WAITING" = "TO_PLAN";
      if (stage === "SETTLED") status = "DONE";
      else if (stage === "SETTLEMENT") status = t.offsetDays >= 10 ? "TO_PLAN" : t.offsetDays >= 7 ? "IN_PROGRESS" : "DONE";
      else if (stage === "BIG_DAY") status = t.offsetDays <= 0 ? "DONE" : t.offsetDays <= 2 ? "IN_PROGRESS" : "TO_PLAN";
      else if (due.getTime() < TODAY.getTime() - 7 * DAY) status = "DONE";
      else if (due.getTime() < TODAY.getTime() + 7 * DAY) status = "IN_PROGRESS";
      else if (due.getTime() < TODAY.getTime() + 21 * DAY && t.offsetDays < -30) status = "WAITING";
      taskRows.push({
        weddingId: w.id, templateId: t.id, ownerId: t.defaultRole === "FOUNDER" ? founder.id : planner.id,
        title: t.title, event: t.event, stage: status, dueDate: due,
        doneAt: status === "DONE" ? addDays(due, -1) : null, sortOrder: t.sortOrder,
      });
    }
  });
  await insertAll(taskRows, (data) => db.task.createMany({ data }));

  // Payment milestones: 20 / 40 / 40 split
  const milestoneRows: Prisma.PaymentMilestoneCreateManyInput[] = [];
  for (const w of weddings) {
    const stage = STAGE_MAP[w.stage];
    const [bookAmt, advAmt, finAmt] = splitByWeight(scaleMoney(w.contractValue), [20, 40, 40]);
    const advDue = addDays(new Date(w.startDate), -30);
    const status = (type: "BOOKING" | "ADVANCE" | "FINAL"): "PAID" | "DUE" => {
      if (stage === "SETTLED") return "PAID";
      if (stage === "SETTLEMENT" || stage === "BIG_DAY") return type === "FINAL" ? "DUE" : "PAID";
      if (stage === "PLANNING") return type === "BOOKING" || (type === "ADVANCE" && advDue < TODAY) ? "PAID" : "DUE";
      return "DUE";
    };
    const items = [
      { type: "BOOKING" as const, label: "Booking deposit", amount: bookAmt, dueDate: new Date("2026-09-01T00:00:00.000Z") },
      { type: "ADVANCE" as const, label: "Advance (30 days before)", amount: advAmt, dueDate: advDue },
      { type: "FINAL" as const, label: "Final settlement", amount: finAmt, dueDate: addDays(new Date(w.endDate), 7) },
    ];
    for (const m of items) {
      const st = status(m.type);
      milestoneRows.push({
        weddingId: w.id, ...m, status: st, paidAt: st === "PAID" ? m.dueDate : null,
        reference: st === "PAID" ? `RCPT-${w.code}-${m.type}` : null,
      });
    }
  }
  await insertAll(milestoneRows, (data) => db.paymentMilestone.createMany({ data }));

  // Bookings: historical ones for settled weddings plus category bookings that sum to the finance vendor cost
  const vendorById = new Map(vendors.map((v) => [v.id, v]));
  const finance = new Map(weddingFinance.map((f) => [f.weddingId, { ...f, vendorCosts: scaleMoney(f.vendorCosts) }]));
  const bookingRows: BookingRow[] = [];
  const bookingsByWedding = new Map<string, BookingRow[]>();
  const pickVendor = (city: string, category: DbCategory, i: number) => {
    const pool = vendors.filter((v) => v.category === category && v.city === city);
    return pool[i % pool.length]!;
  };

  weddings.forEach((w, i) => {
    if (STAGE_MAP[w.stage] === "BOOKED") return;
    const fin = finance.get(w.id)!;
    const start = new Date(w.startDate);
    const rows: BookingRow[] = [];
    const make = (vendorId: string, category: DbCategory, agreedAmount: number, extra: Partial<BookingRow> = {}) => {
      rows.push({
        id: randomUUID(), weddingId: w.id, vendorId, category, agreedAmount, checkinToken: newToken(),
        expectedArrival: new Date(start.getTime() + 3 * 3600000),
        agreedHours: category === "DJ" ? 4 : null, hourlyRate: category === "DJ" ? 15000 : null,
        agreedGuests: category === "CATERER" ? w.guestCount : null, perPlate: category === "CATERER" ? 2450 : null,
        ...extra,
      });
    };

    const hist = historicalBookings.filter((b) => b.weddingId === w.id);
    if (hist.length > 0) {
      for (const b of hist) {
        const v = vendorById.get(b.vendorId)!;
        make(v.id, v.category, scaleMoney(b.agreedAmount), {
          id: b.id, expectedArrival: new Date(b.expectedArrival), agreedGuests: b.agreedGuests,
          agreedHours: b.agreedHours, hourlyRate: b.hourlyRate == null ? null : scaleMoney(b.hourlyRate), perPlate: b.perPlate == null ? null : scaleMoney(b.perPlate),
        });
      }
      const covered = new Set(rows.map((r) => r.category));
      const rest = CATEGORY_WEIGHT.filter(([c]) => !covered.has(c));
      const remaining = fin.vendorCosts - rows.reduce((s, r) => s + r.agreedAmount, 0);
      if (remaining <= 0) throw new Error(`Vendor cost for ${w.code} is below its historical bookings`);
      const parts = splitByWeight(remaining, rest.map(([, wt]) => wt));
      rest.forEach(([cat], k) => {
        const v = pickVendor(w.city, cat, i);
        make(v.id, cat, parts[k]!);
      });
    } else {
      const parts = splitByWeight(fin.vendorCosts, CATEGORY_WEIGHT.map(([, wt]) => wt));
      CATEGORY_WEIGHT.forEach(([cat], k) => make(pickVendor(w.city, cat, i).id, cat, parts[k]!));
    }
    bookingsByWedding.set(w.id, rows);
    bookingRows.push(...rows);
  });
  await insertAll(bookingRows, (data) =>
    db.booking.createMany({
      data: data.map((b) => ({
        id: b.id, weddingId: b.weddingId, vendorId: b.vendorId, category: b.category, agreedAmount: b.agreedAmount,
        checkinToken: b.checkinToken, expectedArrival: b.expectedArrival, agreedHours: b.agreedHours,
        hourlyRate: b.hourlyRate, agreedGuests: b.agreedGuests, perPlate: b.perPlate,
      })),
    }),
  );

  // Vendor bills and payments
  const billRows: Prisma.VendorBillCreateManyInput[] = [];
  const payRows: Prisma.VendorPaymentCreateManyInput[] = [];
  for (const w of weddings) {
    const stage = STAGE_MAP[w.stage];
    const rows = bookingsByWedding.get(w.id) ?? [];
    const start = new Date(w.startDate);
    const end = new Date(w.endDate);
    rows.forEach((b, k) => {
      const tag = `${w.code}-${b.category}`;
      if (stage === "SETTLED" || stage === "SETTLEMENT") {
        const pending = stage === "SETTLEMENT" && k >= rows.length - 2;
        billRows.push({ bookingId: b.id, billNo: `INV-${tag}`, amount: b.agreedAmount, match: pending ? "PENDING" : "MATCHED" });
      }
      const advance = Math.round(b.agreedAmount * 0.5);
      const wantsAdvance =
        stage === "SETTLED" || stage === "SETTLEMENT" || stage === "BIG_DAY" ||
        (stage === "PLANNING" && (b.category === "CATERER" || b.category === "DECORATOR"));
      if (wantsAdvance) {
        payRows.push({ bookingId: b.id, amount: advance, paidAt: addDays(start, -21), reference: `UTR-${tag}-ADV`, isAdvance: true });
      }
      if (stage === "SETTLED" || (stage === "SETTLEMENT" && k < rows.length - 2)) {
        payRows.push({ bookingId: b.id, amount: b.agreedAmount - advance, paidAt: addDays(end, 5), reference: `UTR-${tag}-BAL`, isAdvance: false });
      }
    });
  }
  await insertAll(billRows, (data) => db.vendorBill.createMany({ data }));
  await insertAll(payRows, (data) => db.vendorPayment.createMany({ data }));

  // Time logs: total cost equals teamHours * hourlyCost (scaled by how far the wedding has progressed)
  const timeRows: Prisma.TimeLogCreateManyInput[] = [];
  const progress: Record<DbStage, number> = { SETTLED: 1, SETTLEMENT: 1, BIG_DAY: 0.9, PLANNING: 0.45, BOOKED: 0, VENDORS: 0, CANCELLED: 0 };
  weddings.forEach((w, i) => {
    const fin = finance.get(w.id)!;
    const factor = progress[STAGE_MAP[w.stage]];
    if (factor === 0) return;
    const budget = (fin.teamHours * fin.hourlyCost * factor) / 100; // rupees
    const start = new Date(w.startDate);
    const parts = [
      { user: plannerFor(i), share: 0.7, notes: ["Client calls and planning", "Vendor negotiation", "Run sheet and logistics"] },
      { user: plannerFor(i + 1), share: 0.3, notes: ["Venue coordination", "Guest and hospitality tracking", "On-site support"] },
    ];
    for (const p of parts) {
      const each = ((budget * p.share) / p.user.hourlyCost) / p.notes.length;
      p.notes.forEach((note, k) => {
        timeRows.push({
          userId: p.user.id, weddingId: w.id, date: addDays(start, -45 + k * 22),
          hours: Math.round(each * 1000) / 1000, note,
        });
      });
    }
  });
  await insertAll(timeRows, (data) => db.timeLog.createMany({ data }));

  // Demo wedding events, schedule, and historical check-ins
  await db.weddingEvent.createMany({
    data: weddingEvents.map((e, idx) => ({
      id: e.id, weddingId: e.weddingId, name: e.name, startsAt: new Date(e.startTime), venue: e.venue, sortOrder: idx,
    })),
  });
  const demoId = weddingEvents[0]!.weddingId;
  const demoBookings = bookingsByWedding.get(demoId) ?? [];
  const demoLead = plannerFor(weddings.findIndex((w) => w.id === demoId));
  const others = planners.filter((p) => p.id !== demoLead.id);
  const responsible = (role: string) => (role === "PLANNER" ? demoLead : role === "VENUE_LEAD" ? others[0]! : others[1]!).id;
  await insertAll(schedule, (batch) =>
    db.scheduleItem.createMany({
      data: batch.map((s) => ({
        id: s.id, eventId: s.eventId, responsibleId: responsible(s.responsibleRole),
        bookingId: demoBookings.find((b) => b.category === s.vendorCategory)?.id ?? null,
        startsAt: new Date(s.startTime), durationMin: 12, title: s.title, status: s.status, notes: s.notes,
      })),
    }),
  );
  await insertAll(checkins, (batch) =>
    db.checkin.createMany({
      data: batch.map((c) => ({
        id: c.id, clientId: c.clientId, bookingId: c.bookingId, expectedAt: new Date(c.expectedAt),
        arrivedAt: new Date(c.arrivedAt), method: c.method,
      })),
    }),
  );
}
