import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { db } from "@/backend/db";
import { SESSION_COOKIE, signSession } from "@/backend/session";

const origin = process.env.API_TEST_ORIGIN ?? "http://localhost:3001";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(origin).hostname), "Acceptance checks may only write to a local server");
const vendorIds: string[] = [];
const weddingIds: string[] = [];
const enquiryIds: string[] = [];
const prefix = `Quote acceptance ${randomUUID()}`;
const planner = await db.user.findFirst({ where: { role: "PLANNER" }, select: { id: true, name: true } });
const packageRecord = await db.package.findFirst({ select: { id: true } });
assert.ok(planner);
assert.ok(packageRecord);
const cookie = `${SESSION_COOKIE}=${await signSession({ sub: planner.id, name: planner.name, role: "PLANNER" })}`;
async function api(path: string, body?: unknown, customCookie = cookie): Promise<Response> {
  return fetch(`${origin}/api/${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { Cookie: customCookie, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
async function createWedding(enquiryId?: string) {
  const wedding = await db.wedding.create({
    data: {
      code: `QACCEPT-${randomUUID()}`,
      packageId: packageRecord!.id,
      partner1: "Test",
      partner2: "Couple",
      phone: "9876543210",
      email: "private@example.com",
      startDate: new Date("2026-12-01"),
      endDate: new Date("2026-12-03"),
      city: "Udaipur",
      guestCount: 400,
      contractValue: 4000000,
      portalToken: randomUUID(),
      ...(enquiryId ? { enquiryId } : {}),
    },
  });
  weddingIds.push(wedding.id);
  return wedding;
}
type Invitation = { id: string; token: string; status: string; hasFile: boolean };
type RequestView = { id: string; status: string; quotes: Invitation[] };
async function createRequest(weddingId: string, ids = vendorIds.slice(0, 3)) {
  const response = await api("quote-requests", {
    weddingId,
    category: "CATERER",
    title: prefix,
    requirements: "Regional Rajasthani menu",
    guestCount: 400,
    vendorIds: ids,
  });
  assert.equal(response.status, 201, await response.clone().text());
  return ((await response.json()) as { request: RequestView }).request;
}
const summary = {
  perPlate: 2450,
  extraHourRate: 15000,
  total: 980000,
  notes: null,
  lines: [{ item: "Regional Rajasthani menu", category: "MAIN", qty: 400, unit: "plate", unitPrice: 2450, included: true }],
};
async function submit(token: string, payload: unknown = summary, file?: Blob) {
  const form = new FormData();
  form.set("data", JSON.stringify(payload));
  if (file) form.set("file", file, "quote.pdf");
  return fetch(`${origin}/api/quotes/${token}`, { method: "POST", body: form });
}
try {
  assert.equal((await fetch(`${origin}/api/quote-requests`)).status, 401);
  assert.equal((await api("quote-requests?weddingId=invalid")).status, 400);
  assert.equal((await fetch(`${origin}/api/quotes/invalid`)).status, 400);
  assert.equal((await fetch(`${origin}/api/quotes/${randomUUID()}`)).status, 404);
  for (let index = 0; index < 4; index++) {
    const vendor = await db.vendor.create({
      data: { name: `${prefix} ${index}`, category: index === 3 ? "DJ" : "CATERER", phone: "9876543210", city: "Udaipur" },
    });
    vendorIds.push(vendor.id);
  }
  const wedding = await createWedding();
  assert.equal(
    (await api("quote-requests", { weddingId: wedding.id, category: "CATERER", title: prefix, guestCount: 400, vendorIds: [vendorIds[3]] })).status,
    400,
  );
  const enquiry = await db.enquiry.create({ data: { partner1: "Unsigned", partner2: "Agreement", phone: "9876543210" } });
  enquiryIds.push(enquiry.id);
  const gated = await createWedding(enquiry.id);
  assert.equal(
    (await api("quote-requests", { weddingId: gated.id, category: "CATERER", title: prefix, guestCount: 400, vendorIds: [vendorIds[0]] })).status,
    403,
  );
  const group = await createRequest(wedding.id);
  const competing = await createRequest(wedding.id, [vendorIds[0]!]);
  assert.equal(group.quotes.length, 3);
  const [a, b, c] = group.quotes;
  assert.ok(a && b && c);
  for (const path of [`/v/${a.token}`, `/weddings/${wedding.id}/quotes`, `/weddings/${wedding.id}/quotes/CATERER`, "/vendors", `/vendors/${vendorIds[0]}`]) {
    const rendered = await fetch(`${origin}${path}`, { headers: { Cookie: cookie }, redirect: "manual" });
    assert.equal(rendered.status, 200, `Server render failed: ${path}`);
    assert.match(rendered.headers.get("content-type") ?? "", /text\/html/);
    const html = await rendered.text();
    assert.ok(!html.includes('"digest":"NEXT_HTTP_ERROR_FALLBACK;500"'), `Server render errored: ${path}`);
  }
  const portal = await fetch(`${origin}/api/quotes/${a.token}`);
  const portalText = await portal.text();
  assert.equal(portal.status, 200);
  assert.match(portal.headers.get("cache-control") ?? "", /no-store/);
  for (const privateField of ["portalToken", "contractValue", "private@example.com", b.token, c.token]) assert.ok(!portalText.includes(privateField));
  assert.equal((await submit(a.token, { ...summary, lines: [] })).status, 400);
  assert.equal((await submit(a.token, summary, new Blob(["not pdf"], { type: "text/plain" }))).status, 400);
  assert.equal((await submit(a.token, summary, new Blob(["%PDF-broken"], { type: "application/pdf" }))).status, 400);
  assert.equal((await submit(a.token, summary, new Blob([new Uint8Array(5 * 1024 * 1024 + 1)], { type: "application/pdf" }))).status, 400);
  assert.equal((await submit(a.token)).status, 200);
  assert.equal((await submit(a.token, { ...summary, notes: "Revised menu" })).status, 200);
  assert.equal(await db.quoteLine.count({ where: { quoteId: a.id } }), 1);
  const pdfB = await readFile("demo-assets/quotes/caterer-b-marwar-feasts.pdf");
  const pdfC = await readFile("demo-assets/quotes/caterer-c-royal-thaal.pdf");
  const uploadB = await submit(
    b.token,
    { ...summary, perPlate: 2150, extraHourRate: 12000, total: 946000, lines: [] },
    new Blob([pdfB], { type: "application/pdf" }),
  );
  assert.equal(uploadB.status, 200, await uploadB.clone().text());
  assert.ok(!(await uploadB.text()).includes("data:application/pdf"));
  assert.equal(
    (await submit(c.token, { ...summary, perPlate: 2600, extraHourRate: 18000, total: 1227200, lines: [] }, new Blob([pdfC], { type: "application/pdf" })))
      .status,
    200,
  );
  const file = await fetch(`${origin}/api/quotes/${b.token}/file`);
  assert.equal(file.status, 200);
  assert.equal(file.headers.get("x-content-type-options"), "nosniff");
  assert.ok(Buffer.from(await file.arrayBuffer()).equals(pdfB));
  assert.equal((await fetch(`${origin}/api/quotes/${a.token}/file`)).status, 404);
  const listing = await api(`quote-requests?weddingId=${wedding.id}`);
  const listingText = await listing.text();
  assert.equal(listing.status, 200);
  assert.ok(!listingText.includes("data:application/pdf"));
  assert.equal(
    (JSON.parse(listingText) as { requests: RequestView[] }).requests.find((entry) => entry.id === group.id)?.quotes.filter((quote) => quote.hasFile).length,
    2,
  );
  assert.equal((await api(`quote-requests/${group.id}/award`, { quoteId: competing.quotes[0]!.id })).status, 400);
  assert.equal((await api(`quote-requests/${competing.id}/award`, { quoteId: competing.quotes[0]!.id })).status, 400);
  // A nonexistent audit actor fails after booking creation; all earlier transaction writes must roll back.
  const invalidActorCookie = `${SESSION_COOKIE}=${await signSession({ sub: randomUUID(), name: "Rollback test", role: "PLANNER" })}`;
  assert.equal((await api(`quote-requests/${group.id}/award`, { quoteId: a.id }, invalidActorCookie)).status, 500);
  assert.equal(await db.booking.count({ where: { weddingId: wedding.id } }), 0);
  assert.equal((await db.quoteRequest.findUniqueOrThrow({ where: { id: group.id } })).status, "OPEN");
  assert.equal(await db.vendorQuote.count({ where: { requestId: group.id, status: "SUBMITTED" } }), 3);
  assert.equal((await submit(competing.quotes[0]!.token)).status, 200);
  const awards = await Promise.all([
    api(`quote-requests/${group.id}/award`, { quoteId: a.id, expectedArrival: "2026-12-01T09:00:00+05:30", agreedHours: 4 }),
    api(`quote-requests/${competing.id}/award`, { quoteId: competing.quotes[0]!.id }),
  ]);
  assert.deepEqual(awards.map((response) => response.status).sort(), [201, 409]);
  const booking = await db.booking.findMany({ where: { weddingId: wedding.id } });
  assert.equal(booking.length, 1);
  assert.equal(booking[0]?.agreedAmount, 980000);
  assert.equal(booking[0]?.perPlate, 2450);
  assert.equal(booking[0]?.agreedGuests, 400);
  assert.equal(booking[0]?.hourlyRate, 15000);
  assert.equal(await db.quoteRequest.count({ where: { weddingId: wedding.id, status: "AWARDED" } }), 1);
  assert.equal(await db.quoteRequest.count({ where: { weddingId: wedding.id, status: "CLOSED" } }), 1);
  assert.equal(await db.vendorQuote.count({ where: { request: { weddingId: wedding.id }, status: "WON" } }), 1);
  assert.equal(await db.vendorQuote.count({ where: { request: { weddingId: wedding.id }, status: "NOT_SELECTED" } }), 3);
  const winning = await db.vendorQuote.findUniqueOrThrow({ where: { id: booking[0]!.quoteId! } });
  assert.equal((await api(`quote-requests/${winning.requestId}/award`, { quoteId: winning.id })).status, 409);
  assert.equal((await submit(a.token)).status, 409);
  assert.equal(await db.activityLog.count({ where: { entityId: wedding.id, action: "quote_awarded" } }), 1);
  console.log("Quote API acceptance: three submissions, PDF privacy, agreement gate, atomic rollback, concurrent award and replay protection passed");
} finally {
  await db.activityLog.deleteMany({ where: { entityId: { in: weddingIds } } });
  if (weddingIds.length) await db.wedding.deleteMany({ where: { id: { in: weddingIds }, code: { startsWith: "QACCEPT-" } } });
  if (enquiryIds.length) await db.enquiry.deleteMany({ where: { id: { in: enquiryIds } } });
  if (vendorIds.length) await db.vendor.deleteMany({ where: { id: { in: vendorIds }, name: { startsWith: prefix } } });
  await db.$disconnect();
}
