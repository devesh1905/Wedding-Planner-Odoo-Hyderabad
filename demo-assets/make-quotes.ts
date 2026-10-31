import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const output = fileURLToPath(new URL("./quotes/", import.meta.url));
await mkdir(output, { recursive: true });
const names = ["shahi-rasoi", "marwar-feasts", "royal-thaal"];
for (let index = 0; index < 3; index++) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const text = (value: string, x: number, y: number, size = 12, strong = false) =>
    page.drawText(value, { x, y, size, font: strong ? bold : font, color: rgb(0.18, 0.13, 0.12) });
  text(["Shahi Rasoi", "Marwar Feasts", "Royal Thaal"][index]!, 48, 770, 28, true);
  text("CATERING PROPOSAL | 14 NOVEMBER 2026", 48, 740, 11);
  text("Aarav & Meera - Udaipur", 48, 700, 17, true);
  text("400 guests | Regional Rajasthani menu", 48, 674);
  if (index === 0) {
    const rows = [
      ["SERVICE", "TERMS"],
      ["Regional main course", "Included"],
      ["Starters and live counters", "Included"],
      ["Traditional desserts", "Included"],
      ["Price per plate", "INR 2,450"],
      ["Extra hour", "INR 15,000/hr"],
      ["400-guest total", "INR 9,80,000"],
    ];
    rows.forEach(([left, right], i) => {
      const y = 610 - i * 47;
      page.drawRectangle({ x: 48, y: y - 14, width: 499, height: 43, borderWidth: 0.5, borderColor: rgb(0.7, 0.65, 0.6) });
      text(left!, 60, y, 12, i === 0);
      text(right!, 345, y, 12, i === 0);
    });
    text("Taxes: none. Additional hours billed only when used.", 48, 225, 11);
  } else if (index === 1) {
    [
      "Dear Aarav and Meera,",
      "We are delighted to cater your celebration in Udaipur.",
      "Our regional Rajasthani menu includes starters, dal baati",
      "churma-style savouries, gatte ki sabzi and seasonal mains.",
      "The price is INR 2,150 per plate for 400 guests.",
      "Desserts are not included and must be arranged separately.",
      "Live counters and welcome drinks are not included.",
      "An extra hour costs INR 12,000/hr.",
      "A service charge of 10% (INR 86,000) applies to food.",
      "Food subtotal: INR 8,60,000. Total: INR 9,46,000.",
      "No other taxes apply. Extra hours are billed separately.",
      "Warm regards,",
      "Marwar Feasts - Catering team",
    ].forEach((line, i) => text(line, 48, 610 - i * 28, 12, i === 5));
  } else {
    text("REGIONAL MENU", 48, 610, 15, true);
    text("HOSPITALITY", 320, 610, 15, true);
    ["Dal baati and gatte ki sabzi", "Seasonal vegetable mains", "Paneer and assorted breads", "Traditional desserts included"].forEach((line, i) =>
      text(line, 48, 574 - i * 28, 11),
    );
    ["Welcome drinks included", "Starters included", "Live counters not included", "400 guests in Udaipur"].forEach((line, i) =>
      text(line, 320, 574 - i * 28, 11),
    );
    page.drawRectangle({ x: 48, y: 260, width: 499, height: 170, borderWidth: 1, borderColor: rgb(0.5, 0.35, 0.2) });
    [
      "PRICE SUMMARY",
      "Per plate: INR 2,600",
      "Food subtotal: INR 10,40,000",
      "GST 18% separate: INR 1,87,200",
      "Total including GST: INR 12,27,200",
      "Extra hour: INR 18,000/hr (before tax)",
    ].forEach((line, i) => text(line, 64, 402 - i * 25, 12, i === 0));
  }
  text("Rates in Indian rupees. Extra hours excluded from quoted total.", 48, 100, 10);
  text("Proposal valid for 14 days | Page 1 of 1", 48, 76, 10);
  await writeFile(`${output}/caterer-${String.fromCharCode(97 + index)}-${names[index]}.pdf`, await doc.save());
}
