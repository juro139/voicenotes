// voicenotes service worker — network-first with offline fallback for app shell.
const VERSION = "voicenotes-v1";
const PRECACHE_URLS = ["/", "/record", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== VERSION).map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // Don't cache API or audio streams
  if (url.pathname.startsWith("/api/")) return;

  event.respondWith(
    fetch(req)
      .then((response) => {
        if (response.ok && response.type === "basic") {
          const clone = response.clone();
          caches.open(VERSION).then((cache) => cache.put(req, clone));
        }
        return response;
      })
      .catch(() =>
        caches
          .match(req)
          .then((cached) => cached ?? caches.match("/") ?? Response.error()),
      ),
  );
});
