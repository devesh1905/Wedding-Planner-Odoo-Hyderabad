import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { checkinSchema, issueCreateSchema, issuePatchSchema, liveQuerySchema, schedulePatchSchema } from "@/components/live/schema";

const id = randomUUID(); const clientId = randomUUID();
assert.equal(checkinSchema.parse({ bookingId: id.toUpperCase(), clientId, method: "MANUAL" }).bookingId, id);
assert.equal(checkinSchema.safeParse({ clientId, method: "MANUAL" }).success, false);
assert.equal(checkinSchema.safeParse({ bookingId: id, clientId, method: "UNKNOWN" }).success, false);
assert.equal(checkinSchema.safeParse({ bookingId: id, clientId, method: "MANUAL", arrivedAt: "tomorrow" }).success, false);
assert.equal(checkinSchema.safeParse({ bookingId: id, clientId, method: "MANUAL", injected: true }).success, false);
assert.equal(schedulePatchSchema.parse({ status: "DONE", clientId }).status, "DONE");
assert.equal(schedulePatchSchema.safeParse({ status: "INVALID" }).success, false);
assert.equal(schedulePatchSchema.safeParse({ status: "DONE", actualAt: "bad" }).success, false);
assert.equal(issueCreateSchema.parse({ weddingId: id, clientId, description: "  Generator needed  ", severity: "HIGH", ownerId: null }).description, "Generator needed");
assert.equal(issueCreateSchema.safeParse({ weddingId: id, clientId, description: " ", severity: "HIGH", ownerId: null }).success, false);
assert.equal(issueCreateSchema.safeParse({ weddingId: id, clientId, description: "Issue", severity: "HIGH", ownerId: "invalid" }).success, false);
assert.equal(issuePatchSchema.safeParse({ status: "RESOLVED", weddingId: id }).success, false);
assert.equal(liveQuerySchema.safeParse({ weddingId: id, token: "not-allowed" }).success, false);
console.log("Control room schemas: strict inputs, UUID normalization, timestamps and owner validation passed");
