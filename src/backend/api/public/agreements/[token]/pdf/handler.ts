import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { db } from "@/backend/db";
import { handle, HttpError } from "@/backend/auth";

const MAROON = rgb(0x7a / 255, 0x1f / 255, 0x2b / 255);
const INK = rgb(0.12, 0.1, 0.1);
const MUTED = rgb(0.4, 0.37, 0.37);

// Standard fonts only cover WinAnsi; replace anything else so drawText never throws.
const clean = (s: string) => s.replace(/\r/g, "").replace(/\t/g, "    ").replace(/[^\n\x20-\x7e\xa0-\xff]/g, (c) => (c === "’" || c === "‘" ? "'" : c === "–" || c === "—" ? "-" : c === "₹" ? "Rs." : "?"));

// Greedy word wrap by measured width; long unbroken words are hard-split.
function wrap(text: string, font: PDFFont, size: number, maxW: number): string[] {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    if (!para.trim()) { out.push(""); continue; }
    let line = "";
    for (const word of para.split(" ")) {
      const test = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(test, size) <= maxW) { line = test; continue; }
      if (line) out.push(line);
      let w = word;
      while (font.widthOfTextAtSize(w, size) > maxW) {
        let n = w.length;
        while (n > 1 && font.widthOfTextAtSize(w.slice(0, n), size) > maxW) n--;
        out.push(w.slice(0, n));
        w = w.slice(n);
      }
      line = w;
    }
    out.push(line);
  }
  return out;
}

// GET /api/public/agreements/:token/pdf — the long random token is the key, same as the signing page.
export const GET = handle(async (_req: Request, { params }: { params: Promise<{ token: string }> }) => {
  const { token } = await params;
  const agreement = await db.agreement.findUnique({
    where: { token },
    include: { enquiry: { select: { partner1: true, partner2: true, city: true, roughDate: true } } },
  });
  if (!agreement || agreement.status !== "SIGNED") throw new HttpError(404, "Signed agreement not found");
  const { partner1, partner2, city, roughDate } = agreement.enquiry;

  const pdf = await PDFDocument.create();
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);

  const W = 595.28, H = 841.89, M = 56, BOTTOM = 70;
  const maxW = W - M * 2;
  let page: PDFPage = pdf.addPage([W, H]);
  let y = H - M;
  const ensure = (need: number) => {
    if (y - need < BOTTOM) { page = pdf.addPage([W, H]); y = H - M; }
  };

  page.drawText("The Royal Knot", { x: M, y, size: 10, font: bold, color: MAROON });
  y -= 30;
  page.drawText("Service Agreement", { x: M, y, size: 26, font: serif, color: MAROON });
  y -= 18;
  page.drawText("The Royal Knot  -  Jaipur & Udaipur", { x: M, y, size: 10, font: sans, color: MUTED });
  y -= 10;
  page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 1, color: MAROON });
  y -= 24;
  page.drawText(clean(`${partner1} & ${partner2}`), { x: M, y, size: 16, font: bold, color: INK });
  y -= 16;
  const meta = [city, roughDate ? roughDate.toLocaleDateString("en-IN", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" }) : null].filter(Boolean).join("  -  ");
  if (meta) { page.drawText(clean(meta), { x: M, y, size: 10, font: sans, color: MUTED }); y -= 14; }
  y -= 14;

  const size = 10.5, lh = 15;
  for (const line of wrap(clean(agreement.body), serif, size + 0.5, maxW)) {
    ensure(lh);
    if (line) page.drawText(line, { x: M, y, size: size + 0.5, font: serif, color: INK });
    y -= lh;
  }

  // Signature block (kept together on one page)
  ensure(150);
  y -= 16;
  page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.5, color: MUTED });
  y -= 22;
  page.drawText("Signed electronically", { x: M, y, size: 11, font: bold, color: INK });
  y -= 10;

  const sigTop = y;
  const m = agreement.signatureUrl?.match(/^data:image\/png;base64,([A-Za-z0-9+/=]+)$/);
  if (m) {
    try {
      const img = await pdf.embedPng(Buffer.from(m[1], "base64"));
      const s = Math.min(180 / img.width, 60 / img.height, 1);
      page.drawImage(img, { x: M, y: y - img.height * s, width: img.width * s, height: img.height * s });
    } catch { /* unreadable image: skip, name and time still shown */ }
  }
  y -= 70;
  page.drawLine({ start: { x: M, y }, end: { x: M + 200, y }, thickness: 0.5, color: INK });
  y -= 14;
  page.drawText(clean(agreement.signerName ?? partner1), { x: M, y, size: 11, font: bold, color: INK });
  y -= 14;
  const when = agreement.signedAt
    ? new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "long", timeStyle: "short" }).format(agreement.signedAt) + " IST"
    : "";
  page.drawText(clean(`Signed on ${when}`), { x: M, y, size: 9.5, font: sans, color: MUTED });

  // Seal: double ring + SIGNED
  const cx = W - M - 45, cy = sigTop - 38;
  page.drawCircle({ x: cx, y: cy, size: 40, borderColor: MAROON, borderWidth: 2, opacity: 0, borderOpacity: 1 });
  page.drawCircle({ x: cx, y: cy, size: 34, borderColor: MAROON, borderWidth: 0.8, opacity: 0, borderOpacity: 1 });
  const tw = bold.widthOfTextAtSize("SIGNED", 13);
  page.drawText("SIGNED", { x: cx - tw / 2, y: cy - 4.5, size: 13, font: bold, color: MAROON });

  const pages = pdf.getPages();
  const ref = agreement.id.slice(0, 8);
  pages.forEach((p, i) => {
    const t = `Agreement ref ${ref}  -  Page ${i + 1} of ${pages.length}`;
    p.drawText(t, { x: (W - sans.widthOfTextAtSize(t, 8.5)) / 2, y: 36, size: 8.5, font: sans, color: MUTED });
  });

  const bytes = await pdf.save();
  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "couple";
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="royal-knot-agreement-${slug(partner1)}-${slug(partner2)}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
});
