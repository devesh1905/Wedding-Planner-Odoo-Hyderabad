import { z } from "zod";
import { handle, HttpError, requireUser } from "@/backend/auth";
import { db } from "@/backend/db";
import { askJson, AiUnavailableError } from "@/backend/ai/gemini";
import { quoteIdSchema } from "@/shared/schemas/quotes";
import { formatINR } from "@/shared/format";
import { parseJson, privateJson } from "../../shared";

// Lives under quote-requests/[id] because api/quotes/ already uses a [token] segment.
type Context = { params: Promise<{ id: string }> };
const bodySchema = z.object({ quoteId: quoteIdSchema });
const draftSchema = z.object({ message: z.string().trim().min(20).max(1200) });

type Line = { item: string; category: string; included: boolean };
type Offer = { id: string; vendorName: string; total: number; perPlate: number | null; lines: Line[] };

const label = (category: string) => category.replaceAll("_", " ").toLowerCase();
const includedCategories = (o: Offer) => new Set(o.lines.filter((l) => l.included).map((l) => l.category));

/** Deterministic talking points: every number comes straight from the stored quotes. */
function leveragePoints(target: Offer, offers: Offer[], guestCount: number | null) {
  const points: string[] = [];
  const cheaper = offers.filter((o) => o.id !== target.id && o.total < target.total).sort((a, b) => a.total - b.total);
  const best = cheaper[0];
  if (best) {
    const gap = target.total - best.total;
    const pct = Math.round((gap / target.total) * 100);
    points.push(`The lowest quote is ${formatINR(best.total)} in total, ${formatINR(gap)} (${pct}%) below this quote of ${formatINR(target.total)}.`);
    if (target.perPlate !== null && best.perPlate !== null && best.perPlate < target.perPlate) {
      points.push(`Per plate: ${formatINR(target.perPlate)} here against ${formatINR(best.perPlate)} in the lowest quote${guestCount ? ` (${guestCount} guests)` : ""}.`);
    }
  }
  if (cheaper.length > 1) points.push(`${cheaper.length} of the ${offers.length - 1} other quotes are cheaper than this one.`);
  // Categories competitors include that this vendor does not list as included.
  const mine = includedCategories(target);
  const missing = new Set<string>();
  for (const o of offers) if (o.id !== target.id) for (const c of includedCategories(o)) if (!mine.has(c) && c !== "TAX" && c !== "OTHER") missing.add(c);
  if (missing.size) points.push(`Other quotes include ${[...missing].map(label).join(", ")}, which this quote does not list as included.`);
  const excluded = target.lines.filter((l) => !l.included).map((l) => l.item);
  if (excluded.length) points.push(`This quote excludes: ${excluded.slice(0, 4).join(", ")}.`);
  return points.slice(0, 4);
}

function templateMessage(vendor: string, target: Offer, best: Offer, points: string[]) {
  const extra = points.find((p) => p.startsWith("Other quotes include") || p.startsWith("This quote excludes"));
  return [
    `Hello ${vendor}, thank you for your proposal of ${formatINR(target.total)}.`,
    `We have another proposal at ${formatINR(best.total)} in total. Could you match that or improve your offer?`,
    ...(extra ? [extra] : []),
    "We would like to work with you and would appreciate your best revised offer. Thank you!",
  ].join("\n\n");
}

/** Reject drafts that mention any figure not present in the stored quotes. */
function citesOnlyKnownFigures(message: string, allowed: Set<string>) {
  const found = message.match(/\d[\d,]*(?:\.\d+)?/g) ?? [];
  return found.every((n) => allowed.has(n.replace(/,/g, "")));
}

export const POST = handle(async (request: Request, context: Context) => {
  await requireUser();
  const requestId = quoteIdSchema.parse((await context.params).id);
  const { quoteId } = bodySchema.parse(await parseJson(request));
  const group = await db.quoteRequest.findUnique({
    where: { id: requestId },
    select: {
      guestCount: true,
      category: true,
      quotes: {
        where: { status: { in: ["SUBMITTED", "WON"] } },
        select: {
          id: true,
          total: true,
          perPlate: true,
          vendor: { select: { name: true, phone: true } },
          lines: { select: { item: true, category: true, included: true }, orderBy: { sortOrder: "asc" } },
        },
      },
    },
  });
  if (!group) throw new HttpError(404, "Quote request not found");
  const raw = group.quotes.find((q) => q.id === quoteId);
  if (!raw) throw new HttpError(404, "Quote not found in this request");
  const offers: Offer[] = group.quotes
    .filter((q) => q.total !== null && q.total > 0)
    .map((q) => ({ id: q.id, vendorName: q.vendor.name, total: q.total!, perPlate: q.perPlate, lines: q.lines }));
  const target = offers.find((o) => o.id === quoteId);
  if (!target) throw new HttpError(400, "This quote has no confirmed total to negotiate on");
  const best = offers.reduce((a, b) => (b.total < a.total ? b : a));
  if (best.id === target.id) throw new HttpError(400, "This is already the best-value quote, so there is nothing to counter");

  const points = leveragePoints(target, offers, group.guestCount);
  const facts = {
    vendor: target.vendorName,
    category: group.category,
    guestCount: group.guestCount,
    thisQuote: {
      total: formatINR(target.total),
      perPlate: target.perPlate === null ? null : formatINR(target.perPlate),
      included: target.lines.filter((l) => l.included).map((l) => l.item),
      excluded: target.lines.filter((l) => !l.included).map((l) => l.item),
    },
    lowestCompetingQuote: {
      total: formatINR(best.total),
      perPlate: best.perPlate === null ? null : formatINR(best.perPlate),
      included: best.lines.filter((l) => l.included).map((l) => l.item),
    },
    leveragePoints: points,
  };
  // Every number the vendor may be shown is one that appears in the facts above.
  const allowed = new Set((JSON.stringify(facts).match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((n) => n.replace(/,/g, "")));

  let message = templateMessage(target.vendorName, target, best, points);
  let source: "ai" | "template" = "template";
  try {
    const draft = await askJson({
      system:
        'You write short, polite WhatsApp messages from a wedding planner to a vendor, asking them to match or improve their quote. Use only the facts provided: never invent figures, discounts, dates or names, and do not name the competing vendor. Quote rupee amounts exactly as given. Keep it under 90 words, warm and professional, no emojis. Return JSON {"message": string}.',
      input: JSON.stringify(facts),
      schema: draftSchema,
      temperature: 0.4,
    });
    // A draft citing any unknown figure is discarded in favour of the template.
    if (citesOnlyKnownFigures(draft.message, allowed)) {
      message = draft.message;
      source = "ai";
    }
  } catch (error) {
    if (!(error instanceof AiUnavailableError)) throw error;
  }
  return privateJson({ message, source, leveragePoints: points, vendor: { name: raw.vendor.name, phone: raw.vendor.phone } });
});
