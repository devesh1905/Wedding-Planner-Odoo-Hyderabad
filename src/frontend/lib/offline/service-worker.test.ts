import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

type WorkerEvent = {
  request?: Request;
  data?: { type: string };
  respondWith: (promise: Promise<Response>) => void;
  waitUntil: (promise: Promise<unknown>) => void;
};
const handlers = new Map<string, (event: WorkerEvent) => void>();
const stored = new Map<string, Response>();
let network: (request: Request) => Promise<Response> = async () => new Response("live page");
const cache = {
  put: async (request: Request, response: Response) => {
    stored.set(request.url, response);
  },
  match: async (request: Request) => stored.get(request.url)?.clone(),
  delete: async (request: Request) => stored.delete(request.url),
  add: async () => {},
};
const context = vm.createContext({
  URL,
  Response,
  Promise,
  fetch: (request: Request) => network(request),
  caches: {
    open: async () => cache,
    delete: async () => {
      stored.clear();
      return true;
    },
    keys: async () => [],
  },
  self: {
    location: { origin: "https://knotos.example" },
    addEventListener: (type: string, listener: (event: WorkerEvent) => void) => handlers.set(type, listener),
    skipWaiting: async () => {},
    clients: { claim: async () => {} },
  },
});
vm.runInContext(await readFile(new URL("../../../../public/sw.js", import.meta.url), "utf8"), context);
function request(path: string, method = "GET"): Promise<Response> | undefined {
  let result: Promise<Response> | undefined;
  handlers.get("fetch")!({
    request: new Request(`https://knotos.example${path}`, { method }),
    respondWith: (promise) => {
      result = promise;
    },
    waitUntil: () => {},
  });
  return result;
}
assert.equal(await (await request("/weddings/demo/live"))?.text(), "live page");
network = async () => {
  throw new TypeError("Disconnected");
};
assert.equal(await (await request("/weddings/demo/live"))?.text(), "live page");
assert.equal((await request("/api/uncached"))?.status, 503);
assert.equal(request("/api/checkins", "POST"), undefined);
network = async () => new Response("private data");
await request("/api/uncached");
assert.equal(stored.has("https://knotos.example/api/uncached"), false);
network = async () => new Response("arrivals", { headers: { "X-Offline-Cache": "allow" } });
await request("/api/arrivals");
network = async () => {
  throw new TypeError("Disconnected");
};
assert.equal(await (await request("/api/arrivals"))?.text(), "arrivals");
network = async () => new Response("Unauthorized", { status: 401 });
await request("/api/arrivals");
assert.equal(stored.has("https://knotos.example/api/arrivals"), false);
let cleared: Promise<unknown> | undefined;
handlers.get("message")!({
  data: { type: "CLEAR_OFFLINE_CACHE" },
  respondWith: () => {},
  waitUntil: (promise) => {
    cleared = promise;
  },
});
await cleared;
assert.equal(stored.size, 0);
console.log("Service worker: live-page fallback, API opt-in, auth expiry and logout purge passed");
