import { test } from "node:test";
import assert from "node:assert/strict";
import { arrivalStatus } from "./arrival-status";
test("late detection uses the same instant across timezones and preserves actual arrival", () => {
  const expected = "2026-11-15T10:00:00+05:30";
  const time = new Date("2026-11-15T04:42:00Z").getTime();
  assert.deepEqual(arrivalStatus(expected, null, time), { status: "LATE", minutesLate: 12 });
  assert.deepEqual(arrivalStatus(expected, null, new Date(expected).getTime()), { status: "UPCOMING", minutesLate: 0 });
  assert.equal(arrivalStatus(expected, null, new Date(expected).getTime() + 1).status, "LATE");
  assert.deepEqual(arrivalStatus(expected, "2026-11-15T04:25:00Z", time), { status: "ARRIVED", minutesLate: 0 });
  assert.deepEqual(arrivalStatus(expected, "2026-11-15T04:35:00Z", time), { status: "ARRIVED", minutesLate: 5 });
  assert.deepEqual(arrivalStatus(null, null, time), { status: "UPCOMING", minutesLate: 0 });
});
