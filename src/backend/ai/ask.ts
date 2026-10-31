import "server-only";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/backend/db";
import { askJson } from "./gemini";

/**
 * "Ask KnotOS": a plain-English question becomes a *filter plan* chosen from a fixed vocabulary,
 * and only this file turns that plan into Prisma queries. The model never writes SQL, never sees
 * customer rows, and cannot ask for anything outside the fields listed below — so the answer is
 * exactly what the database says, and every row links to the real record.
 */

const STAGES = ["BOOKED", "PLANNING", "VENDORS", "BIG_DAY", "SETTLEMENT", "SETTLED", "CANCELLED"] as const;
const ENQUIRY_STATUSES = ["NEW", "CONTACTED", "MEETING_BOOKED", "AGREEMENT_SENT", "SIGNED", "LOST"] as const;
const CATEGORIES = ["CATERER", "DECORATOR", "FLORIST", "DJ", "DHOL", "MAKEUP", "PHOTOGRAPHER", "LIGHTING", "TENT", "TRANSPORT", "VENUE", "OTHER"] as const;
const month = z.string().regex(/^\d{4}-\d{2}$/);

export const askPlan = z.object({
  entity: z.enum(["weddings", "enquiries", "vendors", "payments", "tasks"]),
  /** one plain sentence restating what is being listed, shown above the answers */
  meaning: z.string().max(160),
  filters: z
    .object({
      city: z.string().max(40).nullish(),
      stages: z.array(z.enum(STAGES)).nullish(),
      planner: z.string().max(40).nullish(), // a planner's first or full name
      from: month.nullish(), // wedding date / due date / enquiry date window, inclusive
      to: month.nullish(),
      minGuests: z.number().int().nullish(),
      maxGuests: z.number().int().nullish(),
      unpaid: z.boolean().nullish(), // weddings with a payment still due
      overdue: z.boolean().nullish(), // payments/tasks past their date, or weddings that have one
      missingVendor: z.enum(CATEGORIES).nullish(), // weddings with no booking in this category
      hasVendor: z.enum(CATEGORIES).nullish(),
      openIssues: z.boolean().nullish(),
      agreement: z.enum(["signed", "unsigned"]).nullish(),
      enquiryStatuses: z.array(z.enum(ENQUIRY_STATUSES)).nullish(),
      vendorCategory: z.enum(CATEGORIES).nullish(),
      theme: z.string().max(40).nullish(),
      maxBudget: z.number().int().nullish(), // rupees
      minBudget: z.number().int().nullish(),
    })
    .default({}),
  sort: z.enum(["date", "value", "guests", "name"]).nullish(),
});
export type AskPlan = z.infer<typeof askPlan>;

export type AskRow = { id: string; title: string; meta: string; href: string; icon: "heart" | "inbox" | "shop" | "wallet" | "checklist" };

function system(today: string, planners: string[]) {
  return `You turn a wedding-planning team's question into a JSON filter plan. Today is ${today} (India).
Return only JSON: {"entity": ..., "meaning": ..., "filters": {...}, "sort": ...}.
entity: "weddings" | "enquiries" (leads not yet weddings) | "vendors" | "payments" (couple payment milestones) | "tasks".
filters (all optional, omit what the question doesn't say):
  city (e.g. "Jaipur", "Udaipur"), stages (array of ${STAGES.join(", ")}; "active" means every stage except SETTLED and CANCELLED),
  planner (one of: ${planners.join(", ")}), from / to ("YYYY-MM", inclusive; resolve "December", "next month", "this season" against today),
  minGuests, maxGuests, unpaid (true = a payment still due), overdue (true = past its due date),
  missingVendor / hasVendor (one of ${CATEGORIES.join(", ")}; "no caterer booked" = missingVendor CATERER),
  openIssues (true), agreement ("signed" | "unsigned"), enquiryStatuses (array of ${ENQUIRY_STATUSES.join(", ")}),
  vendorCategory (for vendors), theme, minBudget / maxBudget (whole rupees; "1 crore" = 10000000, "50 lakh" = 5000000).
sort: "date" | "value" | "guests" | "name".
meaning: one short sentence restating what will be listed, e.g. "Active Udaipur weddings in December with a payment still due".
Never invent filters that are not listed. If the question is not about this data, use entity "weddings", empty filters and meaning "Showing all weddings".`;
}

/** Whole-month window [from, to] as dates (to is the first day of the month after `to`). */
function window(from?: string | null, to?: string | null) {
  const gte = from ? new Date(`${from}-01T00:00:00+05:30`) : undefined;
  let lt: Date | undefined;
  if (to) {
    const [y, m] = to.split("-").map(Number);
    lt = new Date(`${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}-01T00:00:00+05:30`);
  }
  return gte || lt ? { ...(gte && { gte }), ...(lt && { lt }) } : undefined;
}

const ci = (s: string) => ({ contains: s, mode: "insensitive" as const });
const dateFmt = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
const lakh = (n: number) => (n >= 1e7 ? `₹${(n / 1e7).toFixed(2).replace(/\.?0+$/, "")} Cr` : `₹${(n / 1e5).toFixed(1).replace(/\.0$/, "")} L`);
const title = (s: string) => s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");

/** The one place a plan becomes a query. Every filter is a fixed Prisma fragment. */
export async function runPlan(plan: AskPlan): Promise<AskRow[]> {
  const f = plan.filters;
  const now = new Date();
  const take = 25;

  if (plan.entity === "vendors") {
    const rows = await db.vendor.findMany({
      where: {
        ...(f.vendorCategory && { category: f.vendorCategory }),
        ...(f.city && { city: ci(f.city) }),
      },
      orderBy: { name: "asc" },
      take,
      select: { id: true, name: true, category: true, city: true, _count: { select: { bookings: true } } },
    });
    return rows.map((v) => ({
      id: v.id,
      title: v.name,
      meta: `${title(v.category)} · ${v.city} · ${v._count.bookings} bookings`,
      href: `/vendors/${v.id}`,
      icon: "shop",
    }));
  }

  if (plan.entity === "enquiries") {
    const rows = await db.enquiry.findMany({
      where: {
        wedding: null,
        ...(f.city && { city: ci(f.city) }),
        ...(f.enquiryStatuses?.length && { status: { in: f.enquiryStatuses } }),
        ...(window(f.from, f.to) && { roughDate: window(f.from, f.to) }),
        ...(f.minGuests || f.maxGuests ? { guestCount: { ...(f.minGuests && { gte: f.minGuests }), ...(f.maxGuests && { lte: f.maxGuests }) } } : {}),
        ...(f.minBudget || f.maxBudget ? { maxBudget: { ...(f.minBudget && { gte: f.minBudget }), ...(f.maxBudget && { lte: f.maxBudget }) } } : {}),
        ...(f.theme && { theme: ci(f.theme) }),
        ...(f.planner && { assignedTo: { name: ci(f.planner) } }),
        ...(f.agreement === "signed" && { agreement: { status: "SIGNED" } }),
        ...(f.agreement === "unsigned" && { OR: [{ agreement: null }, { agreement: { status: { not: "SIGNED" } } }] }),
      },
      orderBy: plan.sort === "date" ? { roughDate: "asc" } : { createdAt: "desc" },
      take,
      select: { id: true, partner1: true, partner2: true, city: true, status: true, roughDate: true, guestCount: true, maxBudget: true },
    });
    return rows.map((e) => ({
      id: e.id,
      title: `${e.partner1} & ${e.partner2}`,
      meta: [
        title(e.status),
        e.city,
        e.roughDate && dateFmt(e.roughDate),
        e.guestCount && `${e.guestCount} guests`,
        e.maxBudget && `up to ${lakh(e.maxBudget)}`,
      ]
        .filter(Boolean)
        .join(" · "),
      href: `/enquiries?open=${e.id}`,
      icon: "inbox",
    }));
  }

  // Wedding-level conditions, reused by payments and tasks so "Kabir's overdue payments" works too.
  const wedding: Prisma.WeddingWhereInput = {
    ...(f.city && { city: ci(f.city) }),
    stage: f.stages?.length ? { in: f.stages } : { not: "CANCELLED" },
    ...(f.planner && { leadPlanner: { name: ci(f.planner) } }),
    ...(f.theme && { theme: ci(f.theme) }),
    ...(f.minGuests || f.maxGuests ? { guestCount: { ...(f.minGuests && { gte: f.minGuests }), ...(f.maxGuests && { lte: f.maxGuests }) } } : {}),
    ...(f.minBudget || f.maxBudget ? { contractValue: { ...(f.minBudget && { gte: f.minBudget }), ...(f.maxBudget && { lte: f.maxBudget }) } } : {}),
  };

  if (plan.entity === "payments") {
    const rows = await db.paymentMilestone.findMany({
      where: {
        wedding,
        status: f.unpaid === false ? "PAID" : "DUE",
        ...(f.overdue && { dueDate: { lt: now } }),
        ...(window(f.from, f.to) && !f.overdue && { dueDate: window(f.from, f.to) }),
      },
      orderBy: plan.sort === "value" ? { amount: "desc" } : { dueDate: "asc" },
      take,
      select: { id: true, label: true, amount: true, dueDate: true, status: true, wedding: { select: { id: true, partner1: true, partner2: true } } },
    });
    return rows.map((m) => ({
      id: m.id,
      title: `${m.wedding.partner1} & ${m.wedding.partner2} · ${m.label}`,
      meta: `${lakh(m.amount)} · ${m.status === "PAID" ? "paid" : m.dueDate < now ? `overdue since ${dateFmt(m.dueDate)}` : `due ${dateFmt(m.dueDate)}`}`,
      href: `/weddings/${m.wedding.id}?tab=payments`,
      icon: "wallet",
    }));
  }

  if (plan.entity === "tasks") {
    const rows = await db.task.findMany({
      where: {
        wedding,
        stage: { not: "DONE" },
        ...(f.overdue && { dueDate: { lt: now } }),
        ...(window(f.from, f.to) && !f.overdue && { dueDate: window(f.from, f.to) }),
        ...(f.planner && { OR: [{ owner: { name: ci(f.planner) } }, { wedding: { leadPlanner: { name: ci(f.planner) } } }] }),
      },
      orderBy: { dueDate: "asc" },
      take,
      select: { id: true, title: true, event: true, dueDate: true, wedding: { select: { id: true, partner1: true, partner2: true } } },
    });
    return rows.map((t) => ({
      id: t.id,
      title: t.title,
      meta: [
        `${t.wedding.partner1} & ${t.wedding.partner2}`,
        t.event,
        t.dueDate && (t.dueDate < now ? `overdue since ${dateFmt(t.dueDate)}` : `due ${dateFmt(t.dueDate)}`),
      ]
        .filter(Boolean)
        .join(" · "),
      href: `/weddings/${t.wedding.id}?tab=tasks`,
      icon: "checklist",
    }));
  }

  const rows = await db.wedding.findMany({
    where: {
      ...wedding,
      ...(window(f.from, f.to) && { startDate: window(f.from, f.to) }),
      AND: [
        f.unpaid ? { milestones: { some: { status: "DUE" } } } : {},
        f.overdue ? { milestones: { some: { status: "DUE", dueDate: { lt: now } } } } : {},
        f.missingVendor ? { bookings: { none: { category: f.missingVendor } } } : {},
        f.hasVendor ? { bookings: { some: { category: f.hasVendor } } } : {},
        f.openIssues ? { issues: { some: { status: "OPEN" } } } : {},
        f.agreement === "signed" ? { enquiry: { agreement: { status: "SIGNED" } } } : {},
        f.agreement === "unsigned"
          ? { OR: [{ enquiry: null }, { enquiry: { agreement: null } }, { enquiry: { agreement: { status: { not: "SIGNED" } } } }] }
          : {},
      ],
    },
    orderBy:
      plan.sort === "value"
        ? { contractValue: "desc" }
        : plan.sort === "guests"
          ? { guestCount: "desc" }
          : plan.sort === "name"
            ? { partner1: "asc" }
            : { startDate: "asc" },
    take,
    select: {
      id: true,
      partner1: true,
      partner2: true,
      city: true,
      startDate: true,
      guestCount: true,
      contractValue: true,
      stage: true,
      leadPlanner: { select: { name: true } },
    },
  });
  return rows.map((w) => ({
    id: w.id,
    title: `${w.partner1} & ${w.partner2}`,
    meta: [dateFmt(w.startDate), w.city, `${w.guestCount} guests`, lakh(w.contractValue), title(w.stage), w.leadPlanner?.name.split(" ")[0]]
      .filter(Boolean)
      .join(" · "),
    href: `/weddings/${w.id}`,
    icon: "heart",
  }));
}

export async function ask(question: string): Promise<{ plan: AskPlan; rows: AskRow[] }> {
  const planners = (await db.user.findMany({ select: { name: true } })).map((u) => u.name);
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const plan = await askJson({ system: system(today, planners), input: question, schema: askPlan, temperature: 0 });
  return { plan, rows: await runPlan(plan) };
}
