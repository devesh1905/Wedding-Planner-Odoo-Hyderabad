// Demo vendor proposals (florist, decorator, photographer, DJ) for the AI quote reader.
// Usage: npx tsx demo-assets/make-vendor-quotes.ts <output-folder>
// Priced for Ishaan & Tara — Rambagh Palace, Jaipur, 583 guests, 26–28 Dec 2026 (seeded wedding).
// Three layouts on purpose (table, letter, summary box) so the reader is tested on each.
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

type Quote = {
  file: string;
  vendor: string;
  kind: string;
  layout: "table" | "letter" | "summary";
  rows: [string, string][]; // item, price/terms
  lines?: string[]; // letter body
  summary?: string[];
  notes: string[];
};

const out = path.resolve(process.argv[2] ?? "vendor-pdfs");
const couple = "Ishaan & Tara - Rambagh Palace, Jaipur";
const meta = "583 guests | 26-28 December 2026";

const quotes: Quote[] = [
  {
    file: "florist1",
    vendor: "Mogra Stories",
    kind: "FLORAL PROPOSAL",
    layout: "table",
    rows: [
      ["ITEM", "PRICE"],
      ["Mandap florals (rose, orchid, mogra)", "INR 3,40,000"],
      ["Entrance arch and aisle", "INR 1,65,000"],
      ["Varmala pair", "INR 22,000"],
      ["Haldi and mehendi marigold setup", "INR 1,40,000"],
      ["Table centrepieces (60 x INR 2,400)", "INR 1,44,000"],
      ["Total before GST", "INR 8,11,000"],
    ],
    notes: ["GST 18% extra: INR 1,45,980. Total with GST: INR 9,56,980.", "Imported orchids subject to availability."],
  },
  {
    file: "florist2",
    vendor: "Phool Mahal",
    kind: "FLORAL PROPOSAL",
    layout: "letter",
    lines: [
      "Dear Ishaan and Tara,",
      "Thank you for considering Phool Mahal for your wedding at Rambagh Palace.",
      "We will dress the mandap in fresh roses and mogra strings: INR 3,10,000.",
      "Entrance and aisle florals: INR 1,40,000.",
      "Haldi and mehendi marigold decor: INR 1,20,000.",
      "Table centrepieces for 60 tables at INR 2,000 each: INR 1,20,000.",
      "Varmala is not included and can be added at INR 18,000.",
      "Total: INR 6,90,000 including GST.",
      "Warm regards,",
      "Phool Mahal - Floral team",
    ],
    rows: [],
    notes: ["Prices include GST. Setup crew and transport included."],
  },
  {
    file: "florist3",
    vendor: "Gulab Bagh Florals",
    kind: "FLORAL PROPOSAL",
    layout: "summary",
    rows: [
      ["Mandap and stage florals", "Included"],
      ["Entrance, aisle and varmala", "Included"],
      ["Haldi / mehendi marigold", "Included"],
      ["Centrepieces (60 tables)", "Not included"],
    ],
    summary: [
      "PRICE SUMMARY",
      "Floral package: INR 7,40,000",
      "Travel from Udaipur: INR 45,000",
      "GST 18% separate: INR 1,41,300",
      "Total including GST: INR 9,26,300",
    ],
    notes: ["Centrepieces can be quoted separately."],
  },

  {
    file: "decorator1",
    vendor: "Gulabi Mandap",
    kind: "DECOR PROPOSAL",
    layout: "table",
    rows: [
      ["ITEM", "PRICE"],
      ["Wedding mandap (carved jharokha)", "INR 9,50,000"],
      ["Sangeet stage and LED backdrop", "INR 5,80,000"],
      ["Mehendi lounge and swings", "INR 3,20,000"],
      ["Entrance and photo walls", "INR 2,90,000"],
      ["Seating and lounges (583 guests)", "INR 4,10,000"],
      ["Total before GST", "INR 25,50,000"],
    ],
    notes: ["GST 18% extra: INR 4,59,000. Total with GST: INR 30,09,000.", "Lighting by the lighting vendor."],
  },
  {
    file: "decorator2",
    vendor: "Rajwada Celebrations",
    kind: "DECOR PROPOSAL",
    layout: "letter",
    lines: [
      "Dear Ishaan and Tara,",
      "Rajwada Celebrations is honoured to design your three days at Rambagh.",
      "Royal mandap with marigold canopy and brass details: INR 8,60,000.",
      "Sangeet stage with mirror-work backdrop: INR 5,10,000.",
      "Mehendi courtyard with low seating and umbrellas: INR 2,90,000.",
      "Entrance, photo walls and signage: INR 2,40,000.",
      "Guest seating and lounges are not included.",
      "Total: INR 22,30,000 including GST.",
      "Warm regards,",
      "Rajwada Celebrations",
    ],
    rows: [],
    notes: ["Prices include GST. Fabric and props are rented and removed after the event."],
  },
  {
    file: "decorator3",
    vendor: "Lake City Designs",
    kind: "DECOR PROPOSAL",
    layout: "summary",
    rows: [
      ["Mandap and wedding stage", "Included"],
      ["Sangeet stage", "Included"],
      ["Mehendi and haldi setups", "Included"],
      ["Seating and lounges", "Included"],
    ],
    summary: [
      "PRICE SUMMARY",
      "Complete decor package: INR 24,80,000",
      "Travel and crew stay: INR 1,20,000",
      "GST 18% separate: INR 4,68,000",
      "Total including GST: INR 30,68,000",
    ],
    notes: ["Includes three site visits before the wedding."],
  },

  {
    file: "photographer1",
    vendor: "Gulabi Frames",
    kind: "PHOTO & FILM PROPOSAL",
    layout: "table",
    rows: [
      ["ITEM", "PRICE"],
      ["3 photographers, 3 days", "INR 4,20,000"],
      ["2 cinematographers, 3 days", "INR 3,60,000"],
      ["Drone coverage", "INR 55,000"],
      ["Wedding film and teaser edit", "INR 1,50,000"],
      ["2 premium albums (INR 40,000 each)", "INR 80,000"],
      ["Total before GST", "INR 10,65,000"],
    ],
    notes: ["GST 18% extra: INR 1,91,700. Total with GST: INR 12,56,700.", "Extra hour: INR 20,000/hr."],
  },
  {
    file: "photographer2",
    vendor: "Pehla Phera Films",
    kind: "PHOTO & FILM PROPOSAL",
    layout: "letter",
    lines: [
      "Dear Ishaan and Tara,",
      "We would love to tell your story at Rambagh Palace.",
      "Candid and traditional photography, 3 days: INR 4,80,000.",
      "Cinematic wedding film with same-day edit: INR 4,40,000.",
      "Drone coverage: INR 50,000.",
      "Albums are not included and can be added at INR 45,000 each.",
      "Total: INR 9,70,000 plus GST 18%.",
      "Extra hour: INR 25,000/hr.",
      "Warm regards,",
      "Pehla Phera Films",
    ],
    rows: [],
    notes: ["GST 18% extra."],
  },
  {
    file: "photographer3",
    vendor: "Lake Lens Weddings",
    kind: "PHOTO & FILM PROPOSAL",
    layout: "summary",
    rows: [
      ["Photography, 3 days", "Included"],
      ["Cinematography and film", "Included"],
      ["Drone", "Not included"],
      ["2 albums", "Included"],
    ],
    summary: [
      "PRICE SUMMARY",
      "Photo and film package: INR 9,20,000",
      "Travel from Udaipur: INR 60,000",
      "Total including GST: INR 9,80,000",
      "Extra hour: INR 18,000/hr",
    ],
    notes: ["Raw footage delivered on drive within 2 weeks."],
  },

  {
    file: "dj1",
    vendor: "Beat Baraat",
    kind: "MUSIC PROPOSAL",
    layout: "table",
    rows: [
      ["ITEM", "PRICE"],
      ["Sangeet night DJ (5 hours)", "INR 1,80,000"],
      ["Baraat DJ on truck with dhol sync", "INR 95,000"],
      ["Sound system (583 guests)", "INR 1,10,000"],
      ["Dance floor lighting", "INR 65,000"],
      ["Total before GST", "INR 4,50,000"],
    ],
    notes: ["GST 18% extra: INR 81,000. Total with GST: INR 5,31,000.", "Extra hour: INR 15,000/hr."],
  },
  {
    file: "dj2",
    vendor: "Pink City Beats",
    kind: "MUSIC PROPOSAL",
    layout: "letter",
    lines: [
      "Dear Ishaan and Tara,",
      "Pink City Beats will keep your sangeet and baraat moving.",
      "Sangeet DJ for 4 hours with MC: INR 1,60,000.",
      "Baraat DJ and mobile sound: INR 85,000.",
      "Sound and dance-floor lighting: INR 1,40,000.",
      "Total: INR 3,85,000 including GST.",
      "Extra hour: INR 18,000/hr.",
      "Warm regards,",
      "Pink City Beats",
    ],
    rows: [],
    notes: ["Prices include GST."],
  },
];

await mkdir(out, { recursive: true });
for (const q of quotes) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.18, 0.13, 0.12);
  const text = (v: string, x: number, y: number, size = 12, strong = false) => page.drawText(v, { x, y, size, font: strong ? bold : font, color: ink });
  text(q.vendor, 48, 770, 28, true);
  text(`${q.kind} | DECEMBER 2026`, 48, 740, 11);
  text(couple, 48, 700, 17, true);
  text(meta, 48, 674);
  if (q.layout === "table") {
    q.rows.forEach(([l, r], i) => {
      const y = 610 - i * 47;
      page.drawRectangle({ x: 48, y: y - 14, width: 499, height: 43, borderWidth: 0.5, borderColor: rgb(0.7, 0.65, 0.6) });
      text(l, 60, y, 12, i === 0 || i === q.rows.length - 1);
      text(r, 380, y, 12, i === 0 || i === q.rows.length - 1);
    });
  } else if (q.layout === "letter") {
    q.lines!.forEach((l, i) => text(l, 48, 610 - i * 28, 12, l.startsWith("Total")));
  } else {
    text("WHAT IS INCLUDED", 48, 610, 15, true);
    q.rows.forEach(([l, r], i) => text(`${l}: ${r}`, 48, 574 - i * 28, 11));
    page.drawRectangle({ x: 48, y: 260, width: 499, height: 170, borderWidth: 1, borderColor: rgb(0.5, 0.35, 0.2) });
    q.summary!.forEach((l, i) => text(l, 64, 402 - i * 25, 12, i === 0));
  }
  q.notes.forEach((n, i) => text(n, 48, 200 - i * 20, 10));
  text("Rates in Indian rupees. Proposal valid for 14 days | Page 1 of 1", 48, 76, 10);
  await writeFile(path.join(out, `${q.file}.pdf`), await doc.save());
}
console.log(`Wrote ${quotes.length} proposals to ${out}`);
