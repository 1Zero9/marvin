const STATIC_CACHE = "marvin-static-v63";
const STATIC_ASSETS = ["/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png"];

const OFFLINE_PAGE = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Marvin is offline</title><style>
body{background:#f8f3ea;color:#2a1c26;font-family:system-ui,sans-serif;margin:0;padding:24px}main{background:#fff;border:1px solid #e3d6c7;border-radius:24px;box-shadow:0 4px 12px rgba(38,26,34,.07);margin:12vh auto;max-width:480px;padding:32px}h1{color:#4a1548;font-family:Georgia,serif;font-size:2rem;margin:0 0 12px}p{color:#6b5a62;line-height:1.5;margin:0 0 20px}button{background:#ee5a1e;border:0;border-radius:999px;color:#fff;font:700 1rem system-ui;min-height:48px;padding:0 22px}
</style></head><body><main><h1>You&rsquo;re offline</h1><p>Marvin couldn&rsquo;t reach the kitchen. Check your connection, then try again. Private household pages are never stored for offline use.</p><button onclick="location.reload()">Try again</button></main></body></html>`;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== STATIC_CACHE)
            .map((k) => caches.delete(k))
        )
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => new Response(OFFLINE_PAGE, {
      status: 503,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    })));
    return;
  }

  if (
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/_next/static/") ||
    url.pathname === "/manifest.json"
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            const copy = res.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
            return res;
          })
      )
    );
    return;
  }

  event.respondWith(fetch(request));
});
