import assert from "node:assert/strict";
import { vendors } from "./vendors";
import { weddings, weddingFinance } from "./weddings";
import { schedule, weddingEvents } from "./schedule";
import { checkins, historicalBookings } from "./checkins";
import { vendorCategories } from "./types";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
assert.equal(vendors.length, 40); assert.equal(weddings.length, 25);
const ids = [...vendors, ...weddings, ...weddingEvents, ...schedule, ...historicalBookings, ...checkins].map((item) => item.id);
assert.equal(new Set(ids).size, ids.length); ids.forEach((id) => assert.match(id, uuid));
for (const category of vendorCategories) assert.equal(vendors.filter((vendor) => vendor.category === category).length, 4);
for (const vendor of vendors) {
  assert.match(vendor.phone, /^[6-9]\d{9}$/);
  const backup = vendors.find((item) => item.id === vendor.backupVendorId);
  assert.ok(backup); assert.notEqual(backup.id, vendor.id); assert.equal(backup.category, vendor.category);
}
for (const wedding of weddings) {
  assert.ok(wedding.guestCount >= 250 && wedding.guestCount <= 600);
  assert.ok(Number.isInteger(wedding.contractValue) && wedding.contractValue >= 300000000 && wedding.contractValue <= 3000000000);
  assert.ok(new Date(wedding.endDate) >= new Date(wedding.startDate));
  assert.ok([9, 10, 11, 0, 1].includes(new Date(wedding.startDate).getUTCMonth()));
}
for (const event of weddingEvents) {
  const items = schedule.filter((item) => item.eventId === event.id);
  assert.equal(items.length, 30);
  assert.ok(items.every((item, index) => index === 0 || item.startTime > items[index - 1]!.startTime));
}
for (const booking of historicalBookings) {
  assert.ok(weddings.some((wedding) => wedding.id === booking.weddingId && wedding.stage === "SETTLED"));
  assert.ok(vendors.some((vendor) => vendor.id === booking.vendorId));
}
checkins.forEach((item) => assert.ok(historicalBookings.some((booking) => booking.id === item.bookingId)));
assert.equal(new Set(checkins.map((item) => item.clientId)).size, checkins.length);
const dj = vendors.find((vendor) => vendor.name === "Beat Baraat")!;
const djBookings = new Set(historicalBookings.filter((booking) => booking.vendorId === dj.id).map((booking) => booking.id));
assert.equal(checkins.filter((item) => djBookings.has(item.bookingId) && item.arrivedAt > item.expectedAt).length, 3);
const profits = weddingFinance.map((item) => item.clientRevenue - item.vendorCosts - item.teamHours * item.hourlyCost);
assert.ok(profits.some((profit) => profit > 0)); assert.ok(profits.some((profit) => profit < 0));
console.log("Seed integrity: 40 vendors, 25 weddings, 120 schedule items, historical relations and finance passed");
