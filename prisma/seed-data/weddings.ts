import { seedId, seedTimestamp, type WeddingSeed, type WeddingStage } from "./types";
const couples = [
  ["Aarav", "Meera"], ["Arjun", "Ananya"], ["Kabir", "Ishita"], ["Vihaan", "Diya"], ["Aditya", "Kavya"],
  ["Rohan", "Naina"], ["Vivaan", "Saanvi"], ["Dhruv", "Aditi"], ["Kunal", "Riya"], ["Ishaan", "Tara"],
  ["Yash", "Myra"], ["Dev", "Avni"], ["Siddharth", "Pihu"], ["Rishi", "Kiara"], ["Nikhil", "Shreya"],
  ["Harsh", "Palak"], ["Varun", "Simran"], ["Samar", "Anika"], ["Neel", "Mahi"], ["Aryan", "Jiya"],
  ["Pranav", "Aisha"], ["Shaurya", "Ira"], ["Raghav", "Vanya"], ["Manav", "Sia"], ["Akash", "Navya"],
] as const;
const stages: WeddingStage[] = ["PLANNING", "SETTLED", "SETTLED", "SETTLED", "SETTLED", "SETTLED", "COMPLETED", "LIVE", "BOOKED", "AGREEMENT_SIGNED", "ENQUIRY"];
const venues = [
  { city: "Udaipur", venue: "City Palace Udaipur" }, { city: "Jaipur", venue: "Rambagh Palace Jaipur" },
  { city: "Udaipur", venue: "Leela Palace Udaipur" }, { city: "Jaipur", venue: "Samode Palace" },
] as const;
const themes = ["Royal Heritage", "Pastel Garden", "Desert Elegance", "Mewar Romance", "Marigold Courtyard"];
export const demoWeddingId = seedId(2, 1);
// Day-of packages only for a few upcoming weddings; everything booked through us is full service.
const isPartial = (index: number) => index >= 8 && index % 4 === 0;
export const weddings: WeddingSeed[] = couples.map(([partner1, partner2], index) => {
  const place = venues[index % venues.length]!;
  const guestCount = index === 0 ? 400 : 250 + ((index * 37) % 351);
  // All-inclusive price per guest for a three-day palace wedding (venue, food, decor, vendors, our fee):
  // full service ₹26k–₹42k a guest, a lighter day-of package ₹14k–₹20k. Rounded to the lakh.
  const perGuest = isPartial(index) ? 14000 + ((index * 3) % 5) * 1500 : 26000 + ((index * 7) % 9) * 2000;
  const contractRupees = Math.round((guestCount * perGuest) / 100000) * 100000;
  const stage = index < stages.length ? stages[index]! : (["BOOKED", "PLANNING", "AGREEMENT_SIGNED", "ENQUIRY"] as const)[index % 4]!;
  const date = index === 0 ? "2026-11-15" : stage === "SETTLED" || stage === "COMPLETED" ? `2026-10-${String(index + 1).padStart(2, "0")}` : stage === "LIVE" ? "2026-10-31" : new Date(Date.UTC(2026, 10, 20 + index * 4)).toISOString().slice(0, 10);
  const start = new Date(`${date}T04:30:00.000Z`);
  return {
    id: seedId(2, index + 1), code: `TRK-2627-${String(index + 1).padStart(3, "0")}`, partner1, partner2,
    startDate: start.toISOString(), endDate: new Date(start.getTime() + 2 * 86400000).toISOString(),
    ...place, guestCount, theme: themes[index % themes.length]!,
    // Stored in paise here; the seed converts to whole rupees.
    contractValue: contractRupees * 100,
    stage, packageName: isPartial(index) ? "PARTIAL" : "FULL_SERVICE", leadPlannerRole: "PLANNER",
    createdAt: seedTimestamp, updatedAt: seedTimestamp,
  };
});
export type WeddingFinanceSeed = { weddingId: string; clientRevenue: number; vendorCosts: number; teamHours: number; hourlyCost: number };
/** Import these as real payments, bills and time logs; never use them as dashboard data directly. */
export const weddingFinance: WeddingFinanceSeed[] = weddings.map((wedding, index) => ({
  weddingId: wedding.id, clientRevenue: wedding.contractValue,
  // Vendors take 80–86% of the contract (a 14–20% gross margin is typical for planners). One wedding
  // ran over — extras the family asked for weren't billed — so it shows as a small loss.
  vendorCosts: Math.round(wedding.contractValue * (index === 2 ? 0.99 : 0.8 + (index % 3) * 0.03)),
  // ~250–450 planner hours a wedding at a blended ₹1,500/hr (paise) → ₹4–7 L team cost.
  teamHours: 250 + index * 8, hourlyCost: 150000,
}));
