const CACHE = "knotos-shell-v1";
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then(async (cache) => { await Promise.allSettled([cache.add("/")]); await self.skipWaiting(); }));
});
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith("knotos-") && key !== CACHE).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener("message", (event) => {
  if (event.data?.type === "CLEAR_OFFLINE_CACHE") event.waitUntil(caches.delete(CACHE));
});
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  const api = url.pathname.startsWith("/api/");
  const live = /^\/weddings\/[^/]+\/live\/?$/.test(url.pathname);
  const asset = url.pathname.startsWith("/_next/static/") || /\.(woff2?|png|svg|ico|jpg|webp)$/.test(url.pathname);
  if (!api && !live && !asset && url.pathname !== "/") return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const response = await fetch(request);
      // Persist API records only when the endpoint explicitly opts into device storage.
      if (response.status === 401 || response.status === 403) await cache.delete(request);
      if (response.ok && !response.redirected && (!api || response.headers.get("X-Offline-Cache") === "allow")) await cache.put(request, response.clone()).catch(() => {});
      return response;
    } catch {
      const cached = await cache.match(request);
      if (cached) return cached;
      return api
        ? new Response(JSON.stringify({ error: "Offline and no cached response is available" }), { status: 503, headers: { "Content-Type": "application/json" } })
        : new Response("This page is unavailable offline. Open the control room once while connected.", { status: 503, headers: { "Content-Type": "text/plain" } });
    }
  })());
});
