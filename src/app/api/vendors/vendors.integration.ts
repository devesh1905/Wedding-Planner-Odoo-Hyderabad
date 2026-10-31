import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { SESSION_COOKIE, signSession } from "@/lib/session";

const origin = process.env.API_TEST_ORIGIN ?? "http://localhost:3001";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(origin).hostname), "Acceptance checks may only write to a local server");
const ids: string[] = [];
let weddingId: string | undefined;
const prefix = `Directory acceptance ${randomUUID()}`;
const user = await db.user.findFirst({ where: { role: "PLANNER" }, select: { id: true, name: true, role: true } });
assert.ok(user, "Seed a planner before running acceptance checks");
const token = await signSession({ sub: user.id, name: user.name, role: user.role });
const headers = { Cookie: `${SESSION_COOKIE}=${token}`, "Content-Type": "application/json" };
async function request(path: string, method = "GET", body?: unknown): Promise<Response> {
  return fetch(`${origin}/api/vendors${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
}
async function create(suffix: string, category: "CATERER" | "DJ" = "CATERER") {
  const response = await request("", "POST", { name: `${prefix} ${suffix}`, category, phone: "+91 98765-43210", email: "", city: "Acceptance Nagar", notes: "Temporary acceptance record" });
  assert.equal(response.status, 201, await response.clone().text());
  const { vendor } = await response.json() as { vendor: { id: string; phone: string; email: null; backupVendorId: string | null } };
  ids.push(vendor.id); assert.equal(vendor.phone, "9876543210"); assert.equal(vendor.email, null);
  return vendor;
}
try {
  assert.equal((await fetch(`${origin}/api/vendors`)).status, 401);
  assert.equal((await fetch(`${origin}/api/vendors`, { method: "POST", headers, body: "{bad" })).status, 400);
  assert.equal((await request("?category=INVALID")).status, 400);
  assert.equal((await request("", "POST", { name: "Test", category: "DJ", phone: "123", city: "Jaipur" })).status, 400);
  assert.equal((await request("", "POST", { name: "Test", category: "DJ", phone: "9876543210", city: "Jaipur", inventedField: true })).status, 400);
  const a = await create("A"); const b = await create("B"); const c = await create("C", "DJ");
  assert.equal((await request(`/${a.id}`, "PATCH", {})).status, 400);
  assert.equal((await request(`/${a.id}`, "PATCH", { backupVendorId: a.id })).status, 400);
  assert.equal((await request(`/${a.id.toUpperCase()}`, "PATCH", { backupVendorId: a.id })).status, 400);
  assert.equal((await request(`/${a.id}`, "PATCH", { backupVendorId: c.id })).status, 400);
  assert.equal((await request(`/${a.id}`, "PATCH", { backupVendorId: randomUUID() })).status, 400);
  assert.equal((await request(`/${a.id}`, "PATCH", { backupVendorId: b.id, contactName: "Riya Sharma" })).status, 200);
  assert.equal((await request(`/${b.id}`, "PATCH", { backupVendorId: a.id })).status, 400);
  assert.equal((await request(`/${b.id}`, "PATCH", { category: "DJ" })).status, 400);
  const list = await request(`?q=${encodeURIComponent(prefix)}&category=CATERER&city=acceptance%20nagar`);
  const listData = await list.json() as { vendors: { id: string; backupVendor: { id: string } | null }[] };
  assert.equal(listData.vendors.length, 2);
  assert.equal(listData.vendors.find((vendor) => vendor.id === a.id)?.backupVendor?.id, b.id);
  assert.equal((await request(`/${randomUUID()}`)).status, 404);
  assert.equal((await request("/not-a-uuid")).status, 400);
  assert.equal((await request(`/${randomUUID()}`, "PATCH", { name: "Missing" })).status, 404);
  const packageRecord = await db.package.findFirst({ select: { id: true } });
  assert.ok(packageRecord, "Seed a package before running history checks");
  const wedding = await db.wedding.create({ data: {
    code: `ACCEPT-${randomUUID()}`, packageId: packageRecord.id, partner1: "Test", partner2: "Couple", phone: "9876543210",
    startDate: new Date("2026-12-01"), endDate: new Date("2026-12-03"), city: "Jaipur", guestCount: 400,
    contractValue: 4000000, portalToken: randomUUID(),
  } });
  weddingId = wedding.id;
  const booking = await db.booking.create({ data: { weddingId, vendorId: a.id, category: "CATERER", agreedAmount: 980000, checkinToken: randomUUID() } });
  const detail = await request(`/${a.id}`); const detailText = await detail.text();
  assert.equal(detail.status, 200); assert.ok(!detailText.includes("portalToken")); assert.ok(!detailText.includes("checkinToken"));
  const detailData = JSON.parse(detailText) as { vendor: { bookings: { id: string; agreedAmount: number; wedding: { id: string } }[] } };
  assert.equal(detailData.vendor.bookings[0]?.id, booking.id);
  assert.equal(detailData.vendor.bookings[0]?.agreedAmount, 980000);
  assert.equal(detailData.vendor.bookings[0]?.wedding.id, weddingId);
  assert.equal((await request(`/${a.id}`, "PATCH", { backupVendorId: "", notes: "", email: "" })).status, 200);
  console.log("Vendor API acceptance: auth, validation, filters, backup constraints, profile history and token exclusion passed");
} finally {
  if (weddingId) await db.wedding.deleteMany({ where: { id: weddingId } });
  if (ids.length) await db.vendor.deleteMany({ where: { id: { in: ids }, name: { startsWith: prefix } } });
  await db.$disconnect();
}
