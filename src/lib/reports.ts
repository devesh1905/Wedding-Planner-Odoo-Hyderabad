import "server-only";
import { db } from "./db";
import { bookingTotals } from "./settlement";

const DAY = 86_400_000;

export type Period = "today" | "week" | "month" | "season";

/**
 * Season numbers for the founder. Per wedding:
 *   revenue    = contract value + add-ons billed to the couple
 *   vendorCost = agreed vendor amounts + extras (what we owe vendors)
 *   teamCost   = planning hours × each planner's hourly cost
 *   profit     = revenue − vendorCost − teamCost
 */
export async function getSeasonReport(period: Period = "season") {
  const now = new Date();
  const from =
    period === "today" ? new Date(now.toDateString()) : period === "week" ? new Date(now.getTime() - 7 * DAY) : period === "month" ? new Date(now.getTime() - 30 * DAY) : null;

  const [weddings, vendors, openIssues] = await Promise.all([
    db.wedding.findMany({
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
      include: {
        bookings: { include: { checkins: true, bills: true, extras: true, payments: true } },
      },
    }),
    db.issue.count({ where: { status: "OPEN" } }),
  ]);

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
    const moneyIn = weddings
      .flatMap((w) => w.milestones)
      .filter((m) => m.status === "DUE" && m.dueDate <= until)
      .reduce((s, m) => s + m.amount, 0);
    const moneyOut = weddings
      .filter((w) => new Date(w.endDate.getTime() + 7 * DAY) <= until && w.stage !== "SETTLED")
      .flatMap((w) => w.bookings.map((b) => Math.max(bookingTotals(b).balance, 0)))
      .reduce((s, x) => s + x, 0);
    return { days, moneyIn, moneyOut };
  });

  const overduePayments = weddings
    .flatMap((w) => w.milestones.filter((m) => m.status === "DUE" && m.dueDate < now).map((m) => ({ ...m, couple: `${w.partner1} & ${w.partner2}`, weddingId: w.id })))
    .sort((a, b) => +a.dueDate - +b.dueDate);

  // Vendor scorecards from real data: check-ins (punctuality) and bill matching (accuracy).
  const scorecards = vendors
    .map((v) => {
      const checks = v.bookings.flatMap((b) => b.checkins.filter((c) => c.expectedAt));
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
    .filter((v) => v.hired > 0);

  const inPeriod = (d: Date) => !from || d >= from;
  const paymentsInPeriod = weddings.flatMap((w) => w.milestones).filter((m) => m.status === "PAID" && m.paidAt && inPeriod(m.paidAt));
  const vendorPaymentsInPeriod = weddings.flatMap((w) => w.bookings.flatMap((b) => b.payments)).filter((p) => inPeriod(p.paidAt));

  const active = rows.filter((r) => r.stage !== "SETTLED");
  const costed = rows.filter((r) => r.costed);
  return {
    generatedAt: now,
    period,
    rows,
    kpi: {
      activeWeddings: active.length,
      seasonRevenue: rows.reduce((s, r) => s + r.revenue, 0),
      seasonProfit: costed.reduce((s, r) => s + r.profit, 0),
      avgMargin: costed.length ? costed.reduce((s, r) => s + r.margin, 0) / costed.length : 0,
      lossMaking: costed.filter((r) => r.profit < 0).length,
      costedWeddings: costed.length,
      dueIn4Weeks: horizon[2]!.moneyIn,
      openIssues,
      collectedInPeriod: paymentsInPeriod.reduce((s, m) => s + m.amount, 0),
      paidOutInPeriod: vendorPaymentsInPeriod.reduce((s, p) => s + p.amount, 0),
    },
    horizon,
    overduePayments,
    scorecards,
  };
}

export type SeasonReport = Awaited<ReturnType<typeof getSeasonReport>>;
