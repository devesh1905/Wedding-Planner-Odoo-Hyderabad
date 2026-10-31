import "server-only";
import { z } from "zod";
import { db } from "@/backend/db";
import { askJson } from "./gemini";

/**
 * Morning risk brief: "what could go wrong this week". Plain rules over live data FIND the risks and
 * rank them; the model only WORDS them (a one-line note plus a sentence per risk, keyed by the rule's
 * id). Anything the model returns for an id we didn't send is dropped, so it can rephrase but never
 * invent a problem. Without a key the rule text is shown as is.
 */

export type Risk = {
  id: string;
  kind: "payment" | "vendor" | "tasks" | "issue" | "deposit";
  severity: 3 | 2 | 1; // 3 = act today
  weddingId: string;
  couple: string;
  fact: string; // the rule's own sentence, always accurate
  text: string; // what is shown (model wording when available)
  href: string;
};

export type Brief = { note: string; risks: Risk[]; source: "assistant" | "rules"; generatedAt: string };

const DAY = 86_400_000;
const CORE = ["CATERER", "DECORATOR", "PHOTOGRAPHER"] as const;
const lakh = (n: number) => (n >= 1e7 ? `₹${(n / 1e7).toFixed(2).replace(/\.?0+$/, "")} Cr` : `₹${(n / 1e5).toFixed(1).replace(/\.0$/, "")} L`);
const days = (ms: number) => Math.max(0, Math.round(ms / DAY));
const daysText = (ms: number) => (days(ms) === 1 ? "1 day" : `${days(ms)} days`);
const nice = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

/** The rules. Founders see every wedding; planners see the ones they lead. */
export async function findRisks(user: { sub: string; role: string }): Promise<Risk[]> {
  const now = Date.now();
  const weddings = await db.wedding.findMany({
    where: {
      stage: { notIn: ["SETTLED", "CANCELLED"] },
      ...(user.role !== "FOUNDER" && { leadPlannerId: user.sub }),
    },
    select: {
      id: true,
      partner1: true,
      partner2: true,
      startDate: true,
      stage: true,
      milestones: { where: { status: "DUE" }, select: { id: true, label: true, amount: true, dueDate: true } },
      bookings: { select: { category: true } },
      tasks: { where: { stage: { not: "DONE" }, dueDate: { lt: new Date(now) } }, select: { id: true } },
      issues: { where: { status: "OPEN" }, select: { id: true, description: true, severity: true } },
    },
  });

  const risks: Risk[] = [];
  for (const w of weddings) {
    const couple = `${w.partner1} & ${w.partner2}`;
    const until = w.startDate.getTime() - now;
    const base = { weddingId: w.id, couple };

    for (const m of w.milestones) {
      const late = now - m.dueDate.getTime();
      if (late > 0) {
        // overdue money: urgent once a week late or when the wedding is close
        risks.push({
          ...base,
          id: `pay-${m.id}`,
          kind: "payment",
          severity: late > 7 * DAY || until < 14 * DAY ? 3 : 2,
          fact: `${m.label} of ${lakh(m.amount)} is ${daysText(late)} overdue.`,
          text: "",
          href: `/weddings/${w.id}?tab=payments`,
        });
      } else if (-late < 7 * DAY) {
        risks.push({
          ...base,
          id: `due-${m.id}`,
          kind: "deposit",
          severity: 1,
          fact: `${m.label} of ${lakh(m.amount)} falls due in ${daysText(-late)}.`,
          text: "",
          href: `/weddings/${w.id}?tab=payments`,
        });
      }
    }

    // a core vendor still unbooked close to the date
    if (until > 0 && until < 30 * DAY) {
      const missing = CORE.filter((c) => !w.bookings.some((b) => b.category === c));
      if (missing.length)
        risks.push({
          ...base,
          id: `ven-${w.id}`,
          kind: "vendor",
          severity: until < 14 * DAY ? 3 : 2,
          fact: `No ${missing.map((c) => nice(c).toLowerCase()).join(" or ")} booked, ${daysText(until)} before the wedding.`,
          text: "",
          href: `/weddings/${w.id}?tab=vendors`,
        });
    }

    if (w.tasks.length >= 3)
      risks.push({
        ...base,
        id: `task-${w.id}`,
        kind: "tasks",
        severity: w.tasks.length >= 8 || until < 14 * DAY ? 2 : 1,
        fact: `${w.tasks.length} planning tasks are past their due date.`,
        text: "",
        href: `/weddings/${w.id}?tab=plan`,
      });

    for (const i of w.issues)
      risks.push({
        ...base,
        id: `iss-${i.id}`,
        kind: "issue",
        severity: i.severity === "HIGH" ? 3 : i.severity === "MEDIUM" ? 2 : 1,
        fact: `Open ${i.severity.toLowerCase()} issue: ${i.description.slice(0, 90)}`,
        text: "",
        href: `/weddings/${w.id}/live`,
      });
  }

  // most severe first, then the soonest wedding
  const when = new Map(weddings.map((w) => [w.id, w.startDate.getTime()]));
  return risks
    .sort((a, b) => b.severity - a.severity || when.get(a.weddingId)! - when.get(b.weddingId)!)
    .slice(0, 5)
    .map((r) => ({ ...r, text: r.fact }));
}

const worded = z.object({
  note: z.string().max(220),
  items: z.array(z.object({ id: z.string(), text: z.string().max(200) })).max(8),
});

export async function buildBrief(user: { sub: string; role: string; name: string }): Promise<Brief> {
  const risks = await findRisks(user);
  const generatedAt = new Date().toISOString();
  if (!risks.length) return { note: "Nothing needs you this morning: payments, vendors and plans are on track.", risks, source: "rules", generatedAt };

  const fallbackNote = `${risks.filter((r) => r.severity === 3).length || "No"} urgent ${risks.filter((r) => r.severity === 3).length === 1 ? "item" : "items"} across ${new Set(risks.map((r) => r.weddingId)).size} weddings.`;
  try {
    const out = await askJson({
      system: `You write the morning brief for ${user.name.split(" ")[0]}, a wedding planner in India. You get a list of risks found by the system.
Return JSON {"note": string, "items": [{"id": string, "text": string}]}.
note: one calm sentence (max 25 words) on what matters most today.
items: one per risk, same id, a short action-first sentence (max 22 words) that names the couple and says what to do.
Use only the facts given; keep every amount and number exactly as written; never add risks, people or numbers.`,
      input: JSON.stringify(
        risks.map((r) => ({ id: r.id, couple: r.couple, severity: r.severity === 3 ? "urgent" : r.severity === 2 ? "this week" : "watch", fact: r.fact })),
      ),
      schema: worded,
      temperature: 0.3,
    });
    const byId = new Map(out.items.map((i) => [i.id, i.text]));
    return { note: out.note, risks: risks.map((r) => ({ ...r, text: byId.get(r.id) ?? r.fact })), source: "assistant", generatedAt };
  } catch {
    return { note: fallbackNote, risks, source: "rules", generatedAt };
  }
}
