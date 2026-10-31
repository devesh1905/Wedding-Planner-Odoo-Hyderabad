import { NextResponse } from "next/server";
import { z } from "zod";
import type { VendorCategory } from "@prisma/client";
import { db } from "@/backend/db";
import { handle, HttpError, requireUser } from "@/backend/auth";
import { askJson, AiUnavailableError } from "@/backend/ai/gemini";
import { EVENT_LABELS, PLANNING, serviceByKey, type EventKey } from "@/shared/package-builder";
import { formatDate, formatINR, formatINRCompact } from "@/shared/format";

// Which vendor categories can fill a ticked service, and the share of the total budget a
// couple typically spends on it (used to judge whether a vendor's quotes fit the budget).
const SERVICE_VENDORS: Record<string, { categories: VendorCategory[]; share: number }> = {
  venue: { categories: ["VENUE"], share: 0.2 },
  catering: { categories: ["CATERER"], share: 0.3 },
  decor: { categories: ["DECORATOR", "FLORIST", "LIGHTING", "TENT"], share: 0.15 },
  photo: { categories: ["PHOTOGRAPHER"], share: 0.1 },
  music: { categories: ["DJ", "DHOL"], share: 0.05 },
  makeup: { categories: ["MAKEUP"], share: 0.04 },
  hospitality: { categories: ["TRANSPORT"], share: 0.06 },
};
// Services most weddings end up needing; flagged when the couple did not tick them.
const USUALLY_NEEDED = ["venue", "catering", "decor", "photo", "makeup"];
const PEAK_MONTHS = [10, 11, 0, 1]; // Nov, Dec, Jan, Feb (0-based)
const PER_SERVICE = 3;
const DAY = 86_400_000;

export type Pick = {
  id: string;
  name: string;
  category: string;
  city: string;
  priceLabel: string | null;
  bookings: number;
  why: string;
};
export type CallPrep = {
  basic: boolean;
  summary: string;
  talkingPoints: string[];
  risks: string[];
  vendors: { service: string; label: string; picks: Pick[]; note: string | null }[];
};

const aiOutput = z.object({
  summary: z.string().min(10).max(600),
  talkingPoints: z.array(z.string().min(5).max(300)).min(4).max(6),
});

export const POST = handle(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireUser();
  const { id } = z.object({ id: z.string().uuid() }).parse(await params);
  const e = await db.enquiry.findUnique({ where: { id } });
  if (!e) throw new HttpError(404, "Enquiry not found");

  const days = e.roughDate ? Math.ceil((e.roughDate.getTime() - Date.now()) / DAY) : null;
  const events = e.events.map((x) => EVENT_LABELS[x as EventKey] ?? x);
  const services = e.services.map((k) => serviceByKey(k)?.label ?? k);
  const plan = PLANNING.find((p) => p.key === e.planning)?.label ?? null;
  const peak = e.roughDate ? PEAK_MONTHS.includes(e.roughDate.getUTCMonth()) : false;
  const perGuest = e.maxBudget && e.guestCount ? Math.round(e.maxBudget / e.guestCount) : null;

  // ---- Risk flags: plain rules ----
  const risks: string[] = [];
  if (e.maxBudget && e.estimateLow && e.maxBudget < e.estimateLow)
    risks.push(`Budget ${formatINRCompact(e.maxBudget)} is below the estimate low of ${formatINRCompact(e.estimateLow)}.`);
  if (days != null && days < 0) risks.push("The rough date has already passed.");
  else if (days != null && days < 60) risks.push(`Date is only ${days} day${days === 1 ? "" : "s"} away (under 60 days).`);
  if (!e.guestCount) risks.push("Guest count is missing, so the estimate assumed a default.");
  if (!e.roughDate) risks.push("No rough date given yet.");

  // ---- Vendor shortlist: deterministic, from real rows ----
  const vendors: CallPrep["vendors"] = [];
  for (const key of e.services) {
    const rule = SERVICE_VENDORS[key];
    const label = serviceByKey(key)?.label ?? key;
    if (!rule) {
      vendors.push({ service: key, label, picks: [], note: "No matching category in the vendor directory." });
      continue;
    }
    const rows = await db.vendor.findMany({
      where: {
        category: { in: rule.categories },
        ...(e.city ? { city: { equals: e.city, mode: "insensitive" as const } } : {}),
      },
      include: {
        quotes: { where: { status: { in: ["SUBMITTED", "WON"] } }, select: { perPlate: true, total: true } },
        _count: { select: { bookings: true } },
      },
    });
    const scored = rows.map((v) => {
      const plates = v.quotes.map((q) => q.perPlate).filter((n): n is number => n != null);
      const totals = v.quotes.map((q) => q.total).filter((n): n is number => n != null);
      const avgPlate = plates.length ? Math.round(plates.reduce((a, b) => a + b, 0) / plates.length) : null;
      const avgTotal = totals.length ? Math.round(totals.reduce((a, b) => a + b, 0) / totals.length) : null;
      // fit: true = fits, false = over budget, null = no price or no budget to compare against.
      let fit: boolean | null = null;
      let priceLabel: string | null = null;
      if (key === "catering" && avgPlate != null) {
        priceLabel = `${formatINR(avgPlate)} per plate (avg of ${plates.length} quote${plates.length === 1 ? "" : "s"})`;
        if (perGuest) fit = avgPlate * Math.max(1, e.events.length) <= perGuest * rule.share;
      } else if (avgTotal != null) {
        priceLabel = `${formatINRCompact(avgTotal)} avg quote (${totals.length} quote${totals.length === 1 ? "" : "s"})`;
        if (e.maxBudget) fit = avgTotal <= e.maxBudget * rule.share;
      }
      return { v, fit, priceLabel, avgPlate, avgTotal, bookings: v._count.bookings };
    });
    // Over-budget vendors are dropped; then price-fitting first, most-booked, cheapest.
    const kept = scored.filter((s) => s.fit !== false);
    const ranked = kept
      .sort(
        (a, b) =>
          Number(b.fit === true) - Number(a.fit === true) ||
          b.bookings - a.bookings ||
          (a.avgTotal ?? a.avgPlate ?? Infinity) - (b.avgTotal ?? b.avgPlate ?? Infinity) ||
          a.v.name.localeCompare(b.v.name),
      )
      .slice(0, PER_SERVICE);
    const picks: Pick[] = ranked.map((s) => ({
      id: s.v.id,
      name: s.v.name,
      category: s.v.category,
      city: s.v.city,
      priceLabel: s.priceLabel,
      bookings: s.bookings,
      why: [
        e.city ? `Based in ${s.v.city}` : `Based in ${s.v.city} (couple gave no city)`,
        s.fit === true ? "quotes fit the budget" : s.priceLabel ? "no budget to compare against" : "no quotes on file, price to be confirmed",
        s.bookings ? `${s.bookings} past booking${s.bookings === 1 ? "" : "s"}` : null,
      ]
        .filter(Boolean)
        .join("; "),
    }));
    const dropped = scored.length - kept.length;
    vendors.push({
      service: key,
      label,
      picks,
      note: picks.length
        ? null
        : dropped
          ? `${dropped} vendor${dropped === 1 ? "" : "s"} in ${e.city} quote above this budget.`
          : `No ${rule.categories.join("/").toLowerCase()} vendors in ${e.city ?? "the directory"}.`,
    });
  }

  // ---- Summary + talking points (template; used as-is when the assistant is off) ----
  const missing = USUALLY_NEEDED.filter((k) => !e.services.includes(k)).map((k) => serviceByKey(k)?.label ?? k);
  const estimate = e.estimateLow && e.estimateHigh ? `${formatINRCompact(e.estimateLow)} to ${formatINRCompact(e.estimateHigh)}` : null;
  const couple = `${e.partner1} & ${e.partner2}`;
  const summary = [
    `${couple}${plan ? ` want ${plan.toLowerCase()}` : " enquired"}${e.city ? ` in ${e.city}` : ""}${e.roughDate ? ` around ${formatDate(e.roughDate)}` : ""}, ${e.guestCount ? `for ${e.guestCount} guests` : "guest count not given"}${e.theme ? `, theme: ${e.theme}` : ""}.`,
    `${e.maxBudget ? `Budget up to ${formatINR(e.maxBudget)}` : "No budget stated"}${estimate ? `, estimate ${estimate}` : ""}${events.length ? `; events: ${events.join(", ")}` : ""}${services.length ? `; services: ${services.join(", ")}` : "; no services ticked"}.`,
  ].join("\n");

  const points: string[] = [];
  if (e.maxBudget && e.estimateLow && e.maxBudget < e.estimateLow)
    points.push(`Budget (${formatINRCompact(e.maxBudget)}) sits below the estimate low (${formatINRCompact(e.estimateLow)}). Ask what is flexible: guest count, events or services.`);
  else if (e.maxBudget && e.estimateHigh && e.maxBudget > e.estimateHigh)
    points.push(`Budget (${formatINRCompact(e.maxBudget)}) is above the estimate high (${formatINRCompact(e.estimateHigh)}). Ask whether they want a premium upgrade.`);
  else if (!e.maxBudget) points.push("No budget stated. Ask for a comfortable range and who is contributing.");
  if (peak) points.push("The date falls in peak wedding season (Nov to Feb). Check venue and vendor availability early and ask if a nearby date works.");
  if (days != null && days >= 0 && days < 90) points.push("Timeline is tight. Confirm whether the venue is booked or still open.");
  if (!e.roughDate) points.push("Ask for a date or a window, and whether auspicious dates are fixed by family.");
  if (!e.guestCount) points.push("Ask for a guest count, even a range. It drives catering, venue and hospitality cost.");
  if (missing.length) points.push(`They did not tick ${missing.join(", ")}. Ask whether these are booked already or still needed.`);
  if (!e.city) points.push("Ask which city or venue they have in mind.");
  if (events.length) points.push(`Confirm the functions (${events.join(", ")}) and which fall on separate days.`);
  if (e.theme) points.push(`Explore the "${e.theme}" theme: colours, references, must-have moments.`);
  points.push("Ask who makes the final decisions and who joins the first meeting.");
  const fallbackPoints = points.slice(0, 6);
  while (fallbackPoints.length < 4) fallbackPoints.push("Ask what matters most to them about the day.");

  let basic = false;
  let out = { summary, talkingPoints: fallbackPoints };
  try {
    out = await askJson({
      system:
        "You help a wedding planner prepare for a first call with a couple. Use only the facts given; never invent numbers, dates or vendors, and do not name or recommend vendors. " +
        'Return JSON {"summary": string, "talkingPoints": string[]}. The summary is exactly two short lines separated by a newline, covering date, city, guests, theme, budget, planning type, events, services and estimate. talkingPoints has 4 to 6 concise questions or points for the planner (budget vs estimate gap, peak season, services not ticked that are usually needed, risk flags). Amounts are in Indian rupees.',
      input: JSON.stringify({
        couple,
        city: e.city,
        roughDate: e.roughDate ? formatDate(e.roughDate) : null,
        daysAway: days,
        peakSeason: peak,
        guests: e.guestCount,
        theme: e.theme,
        budget: e.maxBudget ? formatINR(e.maxBudget) : null,
        budgetPerGuest: perGuest ? formatINR(perGuest) : null,
        planning: plan,
        events,
        tickedServices: services,
        usuallyNeededButNotTicked: missing,
        estimate,
        notes: e.notes,
        riskFlags: risks,
        vendorShortlist: vendors.map((v) => ({ service: v.label, vendors: v.picks.map((p) => `${p.name} (${p.priceLabel ?? "no price"})`) })),
      }),
      schema: aiOutput,
      temperature: 0.3,
    });
  } catch (err) {
    if (!(err instanceof AiUnavailableError)) throw err;
    basic = true;
  }

  return NextResponse.json({ basic, summary: out.summary, talkingPoints: out.talkingPoints, risks, vendors } satisfies CallPrep);
});
