import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { SESSION_COOKIE, signSession } from "@/lib/session";
import type { LiveData } from "@/components/live/types";

const origin = process.env.API_TEST_ORIGIN ?? "http://localhost:3001";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(origin).hostname), "Acceptance checks may only write to a local server");
const planner = await db.user.findFirst({ where: { role: "PLANNER" }, select: { id: true, name: true } });
const packageRecord = await db.package.findFirst({ select: { id: true } });
assert.ok(planner); assert.ok(packageRecord);
const cookie = `${SESSION_COOKIE}=${await signSession({ sub: planner.id, name: planner.name, role: "PLANNER" })}`;
const prefix = `Live acceptance ${randomUUID()}`;
let weddingId: string | undefined; let vendorId: string | undefined; let itemId: string | undefined;
async function api(path: string, method = "GET", body?: unknown): Promise<Response> {
  return fetch(`${origin}/api/${path}`, { method, headers: { Cookie: cookie, "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
}
try {
  const vendor = await db.vendor.create({ data: { name: prefix, category: "CATERER", phone: "9876543210", city: "Udaipur" } }); vendorId = vendor.id;
  const wedding = await db.wedding.create({ data: { code: `LACCEPT-${randomUUID()}`, packageId: packageRecord.id, partner1: "Test", partner2: "Live", phone: "9876543210", email: "private@example.com", city: "Udaipur", startDate: new Date("2026-12-01"), endDate: new Date("2026-12-03"), guestCount: 400, contractValue: 4000000, portalToken: randomUUID(), stage: "PLANNING" } }); weddingId = wedding.id;
  const expected = "2026-12-01T04:30:00.000Z";
  const booking = await db.booking.create({ data: { weddingId, vendorId, category: "CATERER", agreedAmount: 980000, expectedArrival: new Date(expected), checkinToken: randomUUID() } });
  const second = await db.booking.create({ data: { weddingId, vendorId, category: "CATERER", agreedAmount: 980000, expectedArrival: new Date(expected), checkinToken: randomUUID() } });
  const event = await db.weddingEvent.create({ data: { weddingId, name: "Wedding", startsAt: new Date(expected) } });
  const item = await db.scheduleItem.create({ data: { eventId: event.id, title: "Groom arrival", startsAt: new Date(expected), responsibleId: planner.id } }); itemId = item.id;
  for (const [path, method] of [["checkins", "POST"], [`schedule-items/${itemId}`, "PATCH"], ["issues", "POST"]]) {
    assert.equal((await fetch(`${origin}/api/${path}`, { method })).status, 401);
  }
  assert.equal((await api("checkins?weddingId=invalid")).status, 400);
  assert.equal((await fetch(`${origin}/api/issues`, { method: "POST", headers: { Cookie: cookie, "Content-Type": "application/json" }, body: "{bad" })).status, 400);
  const actionId = randomUUID();
  const arrival = { bookingId: booking.id, clientId: actionId, method: "MANUAL", arrivedAt: "2026-12-01T04:42:00.000Z" };
  assert.equal((await api("checkins", "POST", arrival)).status, 201);
  assert.equal((await api("checkins", "POST", arrival)).status, 200);
  assert.equal((await api("checkins", "POST", { ...arrival, clientId: randomUUID() })).status, 200);
  assert.equal(await db.checkin.count({ where: { bookingId: booking.id } }), 1);
  assert.equal((await db.checkin.findUniqueOrThrow({ where: { clientId: actionId } })).expectedAt?.toISOString(), expected);
  assert.equal((await api("checkins", "POST", { bookingId: second.id, clientId: actionId, method: "MANUAL" })).status, 409);
  const concurrent = await Promise.all([api("checkins", "POST", { token: second.checkinToken, clientId: randomUUID(), method: "QR" }), api("checkins", "POST", { token: second.checkinToken, clientId: randomUUID(), method: "QR" })]);
  assert.deepEqual(concurrent.map((response) => response.status).sort(), [200, 201]);
  assert.equal(await db.checkin.count({ where: { bookingId: second.id } }), 1);
  assert.equal((await api("checkins", "POST", { bookingId: booking.id, token: second.checkinToken, clientId: randomUUID(), method: "QR" })).status, 404);
  const doneId = randomUUID();
  assert.equal((await api(`schedule-items/${itemId}`, "PATCH", { status: "DONE", clientId: doneId })).status, 200);
  assert.ok((await db.scheduleItem.findUniqueOrThrow({ where: { id: itemId } })).actualAt);
  assert.equal((await api(`schedule-items/${itemId}`, "PATCH", { status: "UPCOMING", clientId: randomUUID() })).status, 200);
  assert.equal((await api(`schedule-items/${itemId}`, "PATCH", { status: "DONE", clientId: doneId })).status, 200);
  const afterReplay = await db.scheduleItem.findUniqueOrThrow({ where: { id: itemId } }); assert.equal(afterReplay.status, "UPCOMING"); assert.equal(afterReplay.actualAt, null);
  assert.equal(await db.activityLog.count({ where: { id: doneId } }), 1);
  assert.equal((await api(`schedule-items/${itemId}`, "PATCH", { status: "LIVE", clientId: doneId })).status, 409);
  const issueInput = { weddingId, clientId: randomUUID(), description: "Florist needs a generator", severity: "HIGH", ownerId: planner.id };
  const issueResponse = await api("issues", "POST", issueInput); assert.equal(issueResponse.status, 201);
  const { issue } = await issueResponse.json() as { issue: { id: string } };
  assert.equal((await api("issues", "POST", issueInput)).status, 200);
  assert.equal(await db.issue.count({ where: { clientId: issueInput.clientId } }), 1);
  assert.equal((await api("issues", "POST", { ...issueInput, clientId: randomUUID(), ownerId: randomUUID() })).status, 400);
  assert.equal((await api(`issues/${issue.id}`, "PATCH", { status: "RESOLVED" })).status, 200);
  const resolvedAt = (await db.issue.findUniqueOrThrow({ where: { id: issue.id } })).resolvedAt?.toISOString(); assert.ok(resolvedAt);
  await api(`issues/${issue.id}`, "PATCH", { status: "RESOLVED" });
  assert.equal((await db.issue.findUniqueOrThrow({ where: { id: issue.id } })).resolvedAt?.toISOString(), resolvedAt);
  assert.equal((await api(`issues/${issue.id}`, "PATCH", { status: "OPEN", ownerId: null })).status, 200);
  assert.equal((await db.issue.findUniqueOrThrow({ where: { id: issue.id } })).resolvedAt, null);
  const live = await api(`checkins?weddingId=${weddingId}`); assert.equal(live.status, 200); assert.equal(live.headers.get("x-offline-cache"), "allow");
  const text = await live.text(); const data = JSON.parse(text) as LiveData;
  for (const field of ["portalToken", "checkinToken", "contractValue", "private@example.com"]) assert.ok(!text.includes(field));
  assert.equal(data.events[0]?.scheduleItems[0]?.id, itemId); assert.equal(data.bookings.length, 2); assert.equal(data.issues.length, 1); assert.ok(data.staff.some((staff) => staff.id === planner.id));
  const rendered = await fetch(`${origin}/weddings/${weddingId}/live`, { headers: { Cookie: cookie }, redirect: "manual" }); assert.equal(rendered.status, 200); assert.match(rendered.headers.get("content-type") ?? "", /text\/html/);
  await db.wedding.update({ where: { id: weddingId }, data: { stage: "CANCELLED" } });
  assert.equal((await api("issues", "POST", { ...issueInput, clientId: randomUUID() })).status, 409);
  assert.equal((await api(`schedule-items/${itemId}`, "PATCH", { status: "DONE" })).status, 409);
  console.log("Control room API acceptance: arrivals, token check-in, concurrent dedupe, schedule receipts, issues, safe live data and server rendering passed");
} finally {
  if (itemId) await db.activityLog.deleteMany({ where: { entity: "schedule_item", entityId: itemId } });
  if (weddingId) await db.wedding.deleteMany({ where: { id: weddingId, code: { startsWith: "LACCEPT-" } } });
  if (vendorId) await db.vendor.deleteMany({ where: { id: vendorId, name: prefix } });
  await db.$disconnect();
}
