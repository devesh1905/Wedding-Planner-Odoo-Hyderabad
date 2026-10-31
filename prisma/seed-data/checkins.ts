import { vendors } from "./vendors";
import { weddings } from "./weddings";
import { seedId } from "./types";
export type HistoricalBookingSeed = { id: string; weddingId: string; vendorId: string; agreedAmount: number; expectedArrival: string; agreedGuests: number; agreedHours: number; hourlyRate: number; perPlate: number | null };
export type CheckinSeed = { id: string; bookingId: string; clientId: string; expectedAt: string; arrivedAt: string; method: "QR" | "MANUAL" };
const settled = weddings.filter((wedding) => wedding.stage === "SETTLED");
const historicalVendors = [vendors.find((vendor) => vendor.name === "Beat Baraat")!, vendors[0]!, vendors[8]!, vendors[24]!];
export const historicalBookings: HistoricalBookingSeed[] = settled.flatMap((wedding, weddingIndex) => historicalVendors.map((vendor, vendorIndex) => ({
  id: seedId(5, weddingIndex * historicalVendors.length + vendorIndex + 1), weddingId: wedding.id, vendorId: vendor.id,
  agreedAmount: vendor.category === "CATERER" ? wedding.guestCount * 245000 : 15000000,
  expectedArrival: new Date(new Date(wedding.startDate).getTime() + vendorIndex * 3600000).toISOString(),
  agreedGuests: wedding.guestCount, agreedHours: 4, hourlyRate: 1500000, perPlate: vendor.category === "CATERER" ? 245000 : null,
})));
export const checkins: CheckinSeed[] = historicalBookings.map((booking, index) => {
  const vendorIndex = index % historicalVendors.length;
  const weddingIndex = Math.floor(index / historicalVendors.length);
  // The first three DJ arrivals are late, while later bookings show an improvement.
  const delayMinutes = vendorIndex === 0 ? [18, 27, 12, -8, -5][weddingIndex % 5]! : [-15, -6, 4, -10][vendorIndex]!;
  return { id: seedId(6, index + 1), bookingId: booking.id, clientId: seedId(7, index + 1), expectedAt: booking.expectedArrival,
    arrivedAt: new Date(new Date(booking.expectedArrival).getTime() + delayMinutes * 60000).toISOString(), method: index % 2 === 0 ? "QR" : "MANUAL" };
});
