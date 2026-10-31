import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { z } from "zod";
import { db } from "@/backend/db";
import { handle, HttpError } from "@/backend/auth";
import { formatINR } from "@/shared/format";
import { DEFAULT_GUESTS, estimate, RANGE_NOTE, EVENT_LABELS, PLANNING, serviceByKey, type EventKey } from "@/shared/package-builder";

const MAROON = rgb(0x7a / 255, 0x1f / 255, 0x2b / 255);
const INK = rgb(0.12, 0.1, 0.1);
const MUTED = rgb(0.4, 0.37, 0.37);
const RULE = rgb(0.85, 0.82, 0.8);

/** The summary link only works for a day after the enquiry was sent. */
const WINDOW_MS = 24 * 3600_000;

const query = z.object({ id: z.string().uuid(), ref: z.string().trim().toUpperCase().length(8) });

// Standard fonts only cover WinAnsi; replace anything else so drawText never throws.
const clean = (s: string) =>
  s
    .replace(/\r/g, "")
    .replace(/[^\n\x20-\x7e\xa0-\xff]/g, (c) => (c === "’" || c === "‘" ? "'" : c === "–" || c === "—" ? "-" : c === "₹" ? "Rs." : c === "·" ? "-" : "?"));

/** Greedy word wrap by measured width. */
function wrap(text: string, font: PDFFont, size: number, maxW: number): string[] {
  const out: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const test = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) <= maxW || !line) line = test;
    else {
      out.push(line);
      line = word;
    }
  }
  if (line) out.push(line);
  return out;
}

// GET /api/public/enquiries/:id/summary?ref=ABCD1234 — the couple's own copy of what they sent.
// Needs the id AND the reference shown on the thank-you screen, and only within 24 hours of
// sending; anything else is a plain 404 so the endpoint reveals nothing about other enquiries.
export const GET = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const parsed = query.safeParse({ id: (await params).id, ref: new URL(req.url).searchParams.get("ref") ?? "" });
  if (!parsed.success) throw new HttpError(404, "Summary not found");
  const { id, ref } = parsed.data;

  const e = await db.enquiry.findUnique({ where: { id } });
  if (!e || e.id.slice(0, 8).toUpperCase() !== ref || Date.now() - e.createdAt.getTime() > WINDOW_MS) {
    throw new HttpError(404, "Summary not found");
  }

  // Same pure function the form and the POST handler use, so the lines add up to the saved range.
  const est = e.services.length ? estimate({ guests: e.guestCount, services: e.services, events: e.events, planning: e.planning }) : null;
  const planning = PLANNING.find((p) => p.key === e.planning)?.label;

  const pdf = await PDFDocument.create();
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);

  const W = 595.28, H = 841.89, M = 56;
  const maxW = W - M * 2;
  const page = pdf.addPage([W, H]);
  let y = H - M;
  const text = (s: string, x: number, opts: { size?: number; font?: PDFFont; color?: typeof INK } = {}) =>
    page.drawText(clean(s), { x, y, size: opts.size ?? 10.5, font: opts.font ?? sans, color: opts.color ?? INK });
  const right = (s: string, size: number, font: PDFFont, color = INK) =>
    page.drawText(clean(s), { x: W - M - font.widthOfTextAtSize(clean(s), size), y, size, font, color });
  const para = (s: string, size = 9.5, color = MUTED) => {
    for (const l of wrap(clean(s), sans, size, maxW)) {
      page.drawText(l, { x: M, y, size, font: sans, color });
      y -= size + 4;
    }
  };

  text("The Royal Knot", M, { size: 10, font: bold, color: MAROON });
  right(`Reference ${ref}`, 10, bold, MAROON);
  y -= 30;
  text("Your enquiry summary", M, { size: 26, font: serif, color: MAROON });
  y -= 18;
  const sent = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "long", timeStyle: "short" }).format(e.createdAt);
  text(`Sent on ${sent} IST`, M, { size: 10, color: MUTED });
  y -= 10;
  page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 1, color: MAROON });
  y -= 26;
  text(`${e.partner1} & ${e.partner2}`, M, { size: 16, font: bold });
  y -= 24;

  const rows: [string, string][] = [
    ["Wedding date", e.roughDate ? e.roughDate.toLocaleDateString("en-IN", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" }) : "Not decided yet"],
    ["City", e.city ?? "Not decided yet"],
    ["Guests", e.guestCount ? String(e.guestCount) : `Not given yet (estimate uses ${DEFAULT_GUESTS} as an example)`],
    ["Theme", e.theme ?? "Open to ideas"],
    ["Planning level", planning ?? "To discuss"],
    ["Events", e.events.length ? e.events.map((ev) => EVENT_LABELS[ev as EventKey] ?? ev).join(", ") : "To discuss"],
  ];
  for (const [k, v] of rows) {
    text(k, M, { size: 10, color: MUTED });
    const lines = wrap(clean(v), sans, 10.5, maxW - 130);
    lines.forEach((l, i) => page.drawText(l, { x: M + 130, y: y - i * 14, size: 10.5, font: sans, color: INK }));
    y -= 14 * lines.length + 6;
  }

  y -= 12;
  text("Your package", M, { size: 13, font: bold, color: MAROON });
  y -= 20;
  if (!est) {
    para("No services picked yet - your planner will build the package with you on the first call.", 10.5, INK);
  } else {
    for (const l of est.lines) {
      if (l.key === "fee") {
        page.drawLine({ start: { x: M, y: y + 10 }, end: { x: W - M, y: y + 10 }, thickness: 0.5, color: RULE });
        text("Services subtotal", M, { size: 10.5, font: bold });
        right(formatINR(est.subtotal), 10.5, bold);
        y -= 16;
      }
      const label = l.key === "fee" ? l.label : (serviceByKey(l.key)?.label ?? l.label);
      text(label, M, { size: 10.5 });
      right(formatINR(l.amount), 10.5, sans);
      y -= 16;
    }
    page.drawLine({ start: { x: M, y: y + 10 }, end: { x: W - M, y: y + 10 }, thickness: 0.5, color: RULE });
    y -= 4;
    text("Indicative estimate", M, { size: 12, font: bold });
    // The saved range is the authoritative one (it was computed when the enquiry arrived).
    right(`${formatINR(e.estimateLow ?? est.low)} - ${formatINR(e.estimateHigh ?? est.high)}`, 12, bold, MAROON);
    y -= 18;
    para(`${RANGE_NOTE} An estimate, not a quote - your planner confirms after the first call.`);
    para("Includes vendor costs for the services you ticked and our planning fee. Excludes GST (18%), venue rental, guest flights and gold/jewellery.");
  }

  y -= 16;
  text("What happens next", M, { size: 13, font: bold, color: MAROON });
  y -= 18;
  para("Your planner will call you within one day to talk through the details and book a first meeting.", 10.5, INK);
  para(`Questions before then? Call +91 141 234 5678 or WhatsApp the same number, quoting reference ${ref}.`, 10.5, INK);

  const foot = "The Royal Knot  -  Jaipur & Udaipur";
  page.drawText(foot, { x: (W - sans.widthOfTextAtSize(foot, 8.5)) / 2, y: 36, size: 8.5, font: sans, color: MUTED });

  const bytes = await pdf.save();
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="royal-knot-enquiry-${ref.toLowerCase()}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
});
