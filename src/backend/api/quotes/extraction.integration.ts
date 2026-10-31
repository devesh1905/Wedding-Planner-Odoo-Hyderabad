import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { db } from "@/backend/db";
import { SESSION_COOKIE, signSession } from "@/backend/session";
import type { PortalQuote } from "@/shared/schemas/quotes-types";

const origin = process.env.API_TEST_ORIGIN ?? "http://localhost:3001";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(origin).hostname), "Acceptance checks may only write to a local server");
const planner = await db.user.findFirst({ where: { role: "PLANNER" }, select: { id: true, name: true } });
const packageRecord = await db.package.findFirst({ select: { id: true } }); assert.ok(planner); assert.ok(packageRecord);
const cookie = `${SESSION_COOKIE}=${await signSession({ sub: planner.id, name: planner.name, role: "PLANNER" })}`;
const vendorIds: string[] = []; let weddingId: string | undefined;
const prefix = `Reader acceptance ${randomUUID()}`;
async function api(path: string, method = "POST", body: unknown = {}): Promise<Response> {
  return fetch(`${origin}/api/${path}`, { method, headers: { Cookie: cookie, "Content-Type": "application/json" }, body: JSON.stringify(body) });
}
const line = { item: "Regional menu", category: "MAIN", qty: 400, unit: "plate", unitPrice: 2450, included: true };
const summary = { perPlate: 2450, extraHourRate: 15000, total: 980000, notes: "Vendor terms", lines: [line] };
async function submit(token: string, data: unknown, bytes?: Uint8Array) {
  const form = new FormData(); form.set("data", JSON.stringify(data));
  if (bytes) form.set("file", new Blob([Buffer.from(bytes)], { type: "application/pdf" }), "proposal.pdf");
  return fetch(`${origin}/api/quotes/${token}`, { method: "POST", body: form });
}
try {
  assert.equal((await fetch(`${origin}/api/quotes/${randomUUID()}/extract`, { method: "POST" })).status, 401);
  assert.equal((await api("quotes/invalid/extract")).status, 400);
  assert.equal((await api(`quotes/${randomUUID()}/review`, "PATCH", { ...summary, lines: [] })).status, 400);
  const wedding = await db.wedding.create({ data: { code: `RACCEPT-${randomUUID()}`, packageId: packageRecord.id, partner1: "Reader", partner2: "Test", phone: "9876543210", city: "Udaipur", startDate: new Date("2026-12-01"), endDate: new Date("2026-12-03"), guestCount: 400, contractValue: 4000000, portalToken: randomUUID() } }); weddingId = wedding.id;
  for (const suffix of ["A", "B", "C"]) {
    const vendor = await db.vendor.create({ data: { name: `${prefix} ${suffix}`, category: "CATERER", phone: "9876543210", city: "Udaipur" } }); vendorIds.push(vendor.id);
  }
  const request = await db.quoteRequest.create({ data: { weddingId, category: "CATERER", title: prefix, guestCount: 400, quotes: { create: vendorIds.map((vendorId) => ({ vendorId, token: randomUUID() })) } }, include: { quotes: { orderBy: { vendorId: "asc" } } } });
  const filenames = ["caterer-a-shahi-rasoi.pdf", "caterer-b-marwar-feasts.pdf", "caterer-c-royal-thaal.pdf"];
  const expected = [{ perPlate: 2450, extraHourRate: 15000, total: 980000 }, { perPlate: 2150, extraHourRate: 12000, total: 946000 }, { perPlate: 2600, extraHourRate: 18000, total: 1227200 }];
  const extracted: PortalQuote[] = [];
  for (let index = 0; index < 3; index++) {
    const bytes = await readFile(`demo-assets/quotes/${filenames[index]}`);
    const response = await submit(request.quotes[index]!.token, { ...summary, ...expected[index], lines: [] }, bytes);
    assert.equal(response.status, 200, await response.clone().text());
    const result = await response.json() as { quote: PortalQuote; extractionError?: string };
    assert.equal(result.extractionError, undefined); assert.equal(result.quote.aiExtracted, true); assert.equal(result.quote.aiReviewed, false);
    assert.equal(result.quote.perPlate, expected[index]!.perPlate); assert.equal(result.quote.total, expected[index]!.total);
    assert.equal(result.quote.extraHourRate, expected[index]!.extraHourRate); assert.ok(result.quote.lines.length > 0);
    extracted.push(result.quote);
  }
  assert.equal(extracted[1]!.lines.some((entry) => entry.category === "DESSERT" && entry.included), false);
  assert.equal(extracted[0]!.lines.some((entry) => entry.category === "DESSERT" && entry.included), true);
  assert.equal(extracted[1]!.lines.some((entry) => entry.category === "TAX" && entry.unitPrice === 86000), true);
  assert.equal(extracted[2]!.lines.some((entry) => entry.category === "TAX" && entry.unitPrice === 187200), true);
  const first = extracted[0]!;
  assert.equal((await api(`quote-requests/${request.id}/award`, "POST", { quoteId: first.id })).status, 409);
  const review = await api(`quotes/${first.id}/review`, "PATCH", { ...summary, perPlate: 2455, total: 982000 });
  assert.equal(review.status, 200); const reviewed = (await review.json() as { quote: PortalQuote }).quote;
  assert.equal(reviewed.aiReviewed, true); assert.equal(reviewed.total, 982000);
  assert.ok(first.updatedAt);
  assert.equal((await api(`quotes/${first.id}/review`, "PATCH", { ...summary, expectedUpdatedAt: first.updatedAt })).status, 409);
  assert.equal((await api(`quote-requests/${request.id}/award`, "POST", { quoteId: first.id, expectedUpdatedAt: first.updatedAt })).status, 409);
  assert.equal((await api(`quotes/${first.id}/extract`, "POST", { updatedAt: first.updatedAt })).status, 409);
  assert.equal((await db.vendorQuote.findUniqueOrThrow({ where: { id: first.id } })).total, 982000);
  const reread = await api(`quotes/${first.id}/extract`, "POST", { updatedAt: reviewed.updatedAt });
  assert.equal(reread.status, 200); assert.equal((await reread.json() as { quote: PortalQuote }).quote.aiReviewed, false);
  assert.equal((await api(`quotes/${first.id}/review`, "PATCH", summary)).status, 200);
  const manualRequest = await db.quoteRequest.create({ data: { weddingId, category: "CATERER", title: `${prefix} fallback`, guestCount: 400, quotes: { create: { vendorId: vendorIds[0]!, token: randomUUID() } } }, include: { quotes: true } });
  const manual = manualRequest.quotes[0]!;
  assert.equal((await submit(manual.token, summary)).status, 200);
  assert.equal((await api(`quotes/${manual.id}/extract`)).status, 400);
  if (!process.env.AI_API_KEY) {
    const unknown = await PDFDocument.create(); const page = unknown.addPage(); const font = await unknown.embedFont(StandardFonts.Helvetica);
    page.drawText("Unrecognized private proposal; enter terms manually.", { x: 40, y: 700, size: 12, font });
    const fallback = await submit(manual.token, { ...summary, lines: [] }, await unknown.save());
    assert.equal(fallback.status, 200); const saved = await fallback.json() as { quote: PortalQuote; extractionError?: string };
    assert.ok(saved.extractionError); assert.equal(saved.quote.total, 980000); assert.equal(saved.quote.hasFile, true); assert.equal(saved.quote.aiExtracted, false);
    assert.equal((await api(`quotes/${manual.id}/extract`)).status, 422);
  }
  assert.equal((await api(`quote-requests/${request.id}/award`, "POST", { quoteId: first.id })).status, 201);
  assert.equal((await api(`quotes/${first.id}/review`, "PATCH", summary)).status, 409);
  assert.equal((await api(`quotes/${first.id}/extract`)).status, 409);
  console.log("Quote reader API acceptance: three PDFs, review gate, stale version guard, private fallback and award protection passed");
} finally {
  if (weddingId) { await db.activityLog.deleteMany({ where: { entityId: weddingId } }); await db.wedding.deleteMany({ where: { id: weddingId, code: { startsWith: "RACCEPT-" } } }); }
  if (vendorIds.length) await db.vendor.deleteMany({ where: { id: { in: vendorIds }, name: { startsWith: prefix } } });
  await db.$disconnect();
}
