// voicenotes service worker — v2.
//
// Intentionally a near-no-op. The earlier version had a network-first cache
// strategy that occasionally served stale or partial responses (Chrome's
// "this page couldn't load" overlay). PWA installability only requires a
// registered service worker with a fetch listener, so we keep one but pass
// every request straight through to the network.
//
// Future caching strategies should be opt-in per route (static assets only,
// never HTML or /api/*).
const VERSION = "voicenotes-v2";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Nuke every prior cache so v1 leftovers can't shadow a live response.
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", () => {
  // No respondWith — browser uses the network directly. We're registered
  // purely so installability checks pass.
});

self.addEventListener("message", (event) => {
  // Lets the page tell us to bail out immediately if needed.
  if (event.data === "skip-waiting") {
    self.skipWaiting();
  }
});

// Surface the version for debugging.
console.log("[sw] " + VERSION + " active");
