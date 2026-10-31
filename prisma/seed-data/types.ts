export const vendorCategories = ["CATERER", "DECORATOR", "FLORIST", "DJ", "DHOL", "MAKEUP", "PHOTOGRAPHER", "LIGHTING", "TENT", "TRANSPORT"] as const;
export type VendorCategory = typeof vendorCategories[number];
export type City = "Jaipur" | "Udaipur";
export type WeddingStage = "ENQUIRY" | "AGREEMENT_SIGNED" | "BOOKED" | "PLANNING" | "LIVE" | "COMPLETED" | "SETTLED";
export type VendorSeed = { id: string; name: string; category: VendorCategory; phone: string; email: string; city: City; backupVendorId: string; createdAt: string; updatedAt: string };
export type WeddingSeed = { id: string; code: string; partner1: string; partner2: string; startDate: string; endDate: string; city: City; venue: string; guestCount: number; theme: string; contractValue: number; stage: WeddingStage; packageName: "FULL_SERVICE" | "PARTIAL"; leadPlannerRole: "PLANNER"; createdAt: string; updatedAt: string };
export const seedTimestamp = "2026-09-01T04:30:00.000Z";
/** Stable UUIDs let the import script resolve relations without database-generated IDs. */
export function seedId(group: number, index: number): string {
  return `${group.toString(16).padStart(8, "0")}-0000-4000-8000-${index.toString(16).padStart(12, "0")}`;
}
