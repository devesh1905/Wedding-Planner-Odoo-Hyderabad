import { readFile, writeFile } from "node:fs/promises";
import { extractTextFromPdf, textFingerprint } from "../src/backend/ai/extract-quote";
import { quoteExtractionSchema, type QuoteExtraction, type QuoteCategory } from "../src/backend/ai/quote-schema";
const vendors = [
  {
    file: "caterer-a-shahi-rasoi",
    name: "Shahi Rasoi",
    price: 2450,
    hour: 15000,
    total: 980000,
    taxes: [],
    included: ["MAIN", "STARTER", "DESSERT", "LIVE_COUNTER"],
    notes: ["Additional hours billed only when used.", "No taxes apply."],
  },
  {
    file: "caterer-b-marwar-feasts",
    name: "Marwar Feasts",
    price: 2150,
    hour: 12000,
    total: 946000,
    taxes: [{ label: "Service charge", percent: 10, amount: 86000 }],
    included: ["MAIN", "STARTER"],
    notes: ["Desserts, live counters and welcome drinks are not included.", "Service charge applies to food.", "Extra hours are billed separately."],
  },
  {
    file: "caterer-c-royal-thaal",
    name: "Royal Thaal",
    price: 2600,
    hour: 18000,
    total: 1227200,
    taxes: [{ label: "GST", percent: 18, amount: 187200 }],
    included: ["MAIN", "STARTER", "DESSERT", "BEVERAGE"],
    notes: ["Live counters are not included.", "GST is separate from the food subtotal.", "Extra hour rate is before tax."],
  },
];
const labels: Partial<Record<QuoteCategory, string>> = {
  MAIN: "Regional Rajasthani mains",
  STARTER: "Starters",
  DESSERT: "Traditional desserts",
  BEVERAGE: "Welcome drinks",
  LIVE_COUNTER: "Live counters",
};
const manifest: Record<string, string> = {};
for (const vendor of vendors) {
  const lines: QuoteExtraction["lines"] = Object.entries(labels)
    .filter(([category]) => vendor.included.includes(category) || category !== "BEVERAGE" || vendor.name !== "Shahi Rasoi")
    .map(([category, item]) => ({
      item,
      category: category as QuoteCategory,
      qty: null,
      unit: null,
      unitPrice: null,
      included: vendor.included.includes(category),
    }));
  const data = quoteExtractionSchema.parse({
    vendorName: vendor.name,
    currency: "INR",
    perPlate: vendor.price,
    guestCount: 400,
    extraHourRate: vendor.hour,
    taxes: vendor.taxes,
    lines,
    total: vendor.total,
    notes: vendor.notes,
  });
  const text = await extractTextFromPdf(await readFile(new URL(`./quotes/${vendor.file}.pdf`, import.meta.url)));
  manifest[textFingerprint(text)] = `${vendor.file}.json`;
  await writeFile(new URL(`../src/backend/ai/fixtures/${vendor.file}.json`, import.meta.url), JSON.stringify(data, null, 2) + "\n");
}
await writeFile(new URL("../src/backend/ai/fixtures/manifest.json", import.meta.url), JSON.stringify(manifest, null, 2) + "\n");
