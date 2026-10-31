import "fake-indexeddb/auto";
import assert from "node:assert/strict";
import { clearOfflineData, enqueue, flush, pending, startAutoSync } from "./queue";

async function main(): Promise<void> {
  await clearOfflineData();
  await assert.rejects(enqueue("ISSUE", undefined));
  await assert.rejects(enqueue("ISSUE", { quantity: 1n }));
  const first = await enqueue("CHECKIN", { bookingId: "sample" });
  const second = await enqueue("ISSUE", { description: "Generator needed" });
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (_url, init) => {
    calls++;
    const request = JSON.parse(String(init?.body)) as { actions: { clientId: string }[] };
    assert.equal(request.actions.length, 2);
    return Response.json({ acceptedClientIds: [first.clientId, "unknown-id"] });
  };
  try {
    const [a, b] = await Promise.all([flush(), flush()]);
    assert.deepEqual(a, { sent: 1, failed: 1 }); assert.deepEqual(b, a); assert.equal(calls, 1);
    assert.deepEqual((await pending()).map((item) => item.clientId), [second.clientId]);
    globalThis.fetch = async () => { throw new TypeError("Offline"); };
    assert.deepEqual(await flush(), { sent: 0, failed: 1 });
    assert.equal((await pending())[0]?.clientId, second.clientId);
    globalThis.fetch = async () => new Response("Unauthorized", { status: 401 });
    assert.deepEqual(await flush(), { sent: 0, failed: 1 });
    globalThis.fetch = async () => Response.json({ ok: true });
    assert.deepEqual(await flush(), { sent: 0, failed: 1 });
    globalThis.fetch = async (_url, init) => {
      const request = JSON.parse(String(init?.body)) as { actions: { clientId: string }[] };
      assert.equal(request.actions[0]?.clientId, second.clientId);
      return Response.json({ acceptedClientIds: request.actions.map((item) => item.clientId) });
    };
    assert.deepEqual(await flush(), { sent: 1, failed: 0 });
    assert.deepEqual(await pending(), []);
    assert.deepEqual(await flush(), { sent: 0, failed: 0 });
    const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
    const events = new EventTarget(); const timers = new Set<number>(); let nextTimer = 0;
    const fakeWindow = { addEventListener: events.addEventListener.bind(events), removeEventListener: events.removeEventListener.bind(events),
      setInterval: () => { timers.add(++nextTimer); return nextTimer; }, clearInterval: (id: number) => { timers.delete(id); } };
    Object.defineProperty(globalThis, "window", { configurable: true, value: fakeWindow });
    try {
      const firstStop = startAutoSync(); assert.equal(startAutoSync(), firstStop); assert.equal(timers.size, 1);
      firstStop(); assert.equal(timers.size, 0);
      const secondStop = startAutoSync(); firstStop();
      assert.equal(startAutoSync(), secondStop); assert.equal(timers.size, 1);
      secondStop(); assert.equal(timers.size, 0);
      await flush();
    } finally {
      if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
      else Reflect.deleteProperty(globalThis, "window");
    }
    console.log("Offline queue: concurrent flush, partial acknowledgement, lost response and retry passed");
  } finally { globalThis.fetch = originalFetch; await clearOfflineData(); }
}
void main();
