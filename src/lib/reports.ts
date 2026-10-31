import "server-only";
import { unstable_cache } from "next/cache";
import { db } from "./db";
import { bookingTotals } from "./settlement";

const DAY = 86_400_000;

export type Period = "today" | "week" | "month" | "season";

const IST = 5.5 * 60 * 60_000;

/**
 * The period as an Indian calendar window. `fromDay/toDay` are UTC-midnight dates (how wedding
 * dates are stored, end exclusive); `from/to` are the same window as real instants, for
 * timestamps like payments and check-ins. Season = no window.
 */
export function periodWindow(period: Period, now = new Date()) {
  if (period === "season") return null;
  const ist = new Date(now.getTime() + IST);
  const y = ist.getUTCFullYear(), m = ist.getUTCMonth(), d = ist.getUTCDate();
  let fromDay: Date, toDay: Date;
  if (period === "today") {
    fromDay = new Date(Date.UTC(y, m, d));
    toDay = new Date(Date.UTC(y, m, d + 1));
  } else if (period === "week") {
    const monday = d - ((ist.getUTCDay() + 6) % 7); // weeks start on Monday
    fromDay = new Date(Date.UTC(y, m, monday));
    toDay = new Date(Date.UTC(y, m, monday + 7));
  } else {
    fromDay = new Date(Date.UTC(y, m, 1));
    toDay = new Date(Date.UTC(y, m + 1, 1));
  }
  return { fromDay, toDay, from: new Date(fromDay.getTime() - IST), to: new Date(toDay.getTime() - IST) };
}

/**
 * Season numbers for the founder. Per wedding:
 *   revenue    = contract value + add-ons billed to the couple
 *   vendorCost = agreed vendor amounts + extras (what we owe vendors)
 *   teamCost   = planning hours × each planner's hourly cost
 *   profit     = revenue − vendorCost − teamCost
 */
export async function getSeasonReport(period: Period = "season") {
  const now = new Date();
  const win = periodWindow(period, now);
  // A wedding belongs to the period if any of its event days fall inside it.
  const weddingInPeriod = (w: { startDate: Date; endDate: Date }) => !win || (w.startDate < win.toDay && w.endDate >= win.fromDay);
  const inPeriod = (d: Date) => !win || (d >= win.from && d < win.to);

  const [allWeddings, vendors, issues] = await Promise.all([
    // One joined query instead of a round trip per relation — the dashboard's biggest cost.
    db.wedding.findMany({
      relationLoadStrategy: "join",
      where: { stage: { not: "CANCELLED" } },
      orderBy: { startDate: "asc" },
      include: {
        milestones: true,
        bookings: { include: { extras: true, payments: true, bills: true, vendor: { select: { name: true } } } },
        timeLogs: { include: { user: { select: { hourlyCost: true } } } },
        tasks: { select: { stage: true, dueDate: true } },
      },
    }),
    db.vendor.findMany({
      relationLoadStrategy: "join",
      where: { bookings: { some: {} } },
      include: {
        bookings: { include: { checkins: true, bills: true, extras: true, payments: true } },
      },
    }),
    db.issue.findMany({ select: { status: true, createdAt: true } }),
  ]);

  const weddings = allWeddings.filter(weddingInPeriod);
  const rows = weddings.map((w) => {
    const addons = w.milestones.filter((m) => m.type === "ADDON" && m.status !== "CANCELLED").reduce((s, m) => s + m.amount, 0);
    const revenue = w.contractValue + addons;
    const received = w.milestones.filter((m) => m.status === "PAID").reduce((s, m) => s + m.amount, 0);
    const totals = w.bookings.map((b) => bookingTotals(b));
    const vendorCost = totals.reduce((s, t) => s + t.expected, 0);
    const vendorPaid = totals.reduce((s, t) => s + t.paid, 0);
    const teamCost = Math.round(w.timeLogs.reduce((s, t) => s + t.hours * t.user.hourlyCost, 0));
    const profit = revenue - vendorCost - teamCost;
    const openTasks = w.tasks.filter((t) => t.stage !== "DONE").length;
    return {
      id: w.id,
      code: w.code,
      couple: `${w.partner1} & ${w.partner2}`,
      startDate: w.startDate,
      endDate: w.endDate,
      city: w.city,
      stage: w.stage,
      revenue,
      received,
      vendorCost,
      vendorPaid,
      teamCost,
      profit,
      margin: revenue ? profit / revenue : 0,
      openTasks,
      hours: w.timeLogs.reduce((s, t) => s + t.hours, 0),
      // Profit is only meaningful once vendors are booked; earlier weddings would show a fake 100% margin.
      costed: w.bookings.length > 0,
    };
  });

  // Cash flow buckets: client milestones due in vs vendor balances due out (vendors are paid ~7 days after the event).
  const horizon = [7, 14, 28].map((days) => {
    const until = new Date(now.getTime() + days * DAY);
    const moneyIn = allWeddings
      .flatMap((w) => w.milestones)
      .filter((m) => m.status === "DUE" && m.dueDate <= until)
      .reduce((s, m) => s + m.amount, 0);
    const moneyOut = allWeddings
      .filter((w) => new Date(w.endDate.getTime() + 7 * DAY) <= until && w.stage !== "SETTLED")
      .flatMap((w) => w.bookings.map((b) => Math.max(bookingTotals(b).balance, 0)))
      .reduce((s, x) => s + x, 0);
    return { days, moneyIn, moneyOut };
  });

  const overduePayments = allWeddings
    .flatMap((w) => w.milestones.filter((m) => m.status === "DUE" && m.dueDate < now).map((m) => ({ ...m, couple: `${w.partner1} & ${w.partner2}`, weddingId: w.id })))
    .sort((a, b) => +a.dueDate - +b.dueDate);

  // Vendor scorecards from real data: check-ins (punctuality) and bill matching (accuracy).
  const scorecards = vendors
    .map((v) => {
      const checks = v.bookings.flatMap((b) => b.checkins.filter((c) => c.expectedAt && inPeriod(c.arrivedAt)));
      const late = checks.filter((c) => +c.arrivedAt - +c.expectedAt! > 10 * 60_000);
      const avgLateMin = checks.length ? checks.reduce((s, c) => s + Math.max(0, (+c.arrivedAt - +c.expectedAt!) / 60_000), 0) / checks.length : 0;
      const bills = v.bookings.flatMap((b) => b.bills);
      const accurate = bills.filter((b) => b.match === "MATCHED").length;
      return {
        id: v.id,
        name: v.name,
        category: v.category,
        hired: v.bookings.length,
        checkins: checks.length,
        punctuality: checks.length ? (checks.length - late.length) / checks.length : null,
        avgLateMin: Math.round(avgLateMin),
        billAccuracy: bills.length ? accurate / bills.length : null,
      };
    })
    .filter((v) => v.hired > 0 && (!win || v.checkins > 0));

  const paymentsInPeriod = allWeddings.flatMap((w) => w.milestones).filter((m) => m.status === "PAID" && m.paidAt && inPeriod(m.paidAt));
  const vendorPaymentsInPeriod = allWeddings.flatMap((w) => w.bookings.flatMap((b) => b.payments)).filter((p) => inPeriod(p.paidAt));

  const active = rows.filter((r) => r.stage !== "SETTLED");
  const costed = rows.filter((r) => r.costed);
  return {
    generatedAt: now,
    period,
    window: win,
    rows,
    seasonCount: allWeddings.length,
    kpi: {
      activeWeddings: active.length,
      seasonRevenue: rows.reduce((s, r) => s + r.revenue, 0),
      seasonProfit: costed.reduce((s, r) => s + r.profit, 0),
      avgMargin: costed.length ? costed.reduce((s, r) => s + r.margin, 0) / costed.length : 0,
      lossMaking: costed.filter((r) => r.profit < 0).length,
      costedWeddings: costed.length,
      dueIn4Weeks: horizon[2]!.moneyIn,
      // client payments falling due inside the window (season: next 4 weeks)
      dueInPeriod: win
        ? allWeddings.flatMap((w) => w.milestones).filter((m) => m.status === "DUE" && m.dueDate >= win.fromDay && m.dueDate < win.toDay).reduce((s, m) => s + m.amount, 0)
        : horizon[2]!.moneyIn,
      openIssues: issues.filter((i) => i.status === "OPEN").length,
      issuesInPeriod: issues.filter((i) => inPeriod(i.createdAt)).length,
      collectedInPeriod: paymentsInPeriod.reduce((s, m) => s + m.amount, 0),
      paidOutInPeriod: vendorPaymentsInPeriod.reduce((s, p) => s + p.amount, 0),
    },
    horizon,
    overduePayments,
    scorecards,
  };
}

export type SeasonReport = Awaited<ReturnType<typeof getSeasonReport>>;

/** Cache tag for every number on the dashboard; any API write expires it (see `handle()` in lib/auth). */
export const REPORT_TAG = "report";

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
// The data cache stores JSON, so dates come back as strings — turn them back into Dates.
const revive = <T,>(v: T): T => JSON.parse(JSON.stringify(v), (_k, x) => (typeof x === "string" && ISO.test(x) ? new Date(x) : x));

const cachedReport = unstable_cache((period: Period) => getSeasonReport(period), ["season-report"], { tags: [REPORT_TAG], revalidate: 60 });

/**
 * The dashboard's report, served from cache so the page is instant. Fresh within a moment of any
 * change made through the app; at most 60 s old for changes made outside it (e.g. seed scripts).
 */
export async function getReport(period: Period = "season"): Promise<SeasonReport> {
  return revive(await cachedReport(period));
}
