/* Veille service worker — reviewed as sensitive code (AGENTS.md §5.5).
   Precache only: no runtime caching, no cross-origin handling, no network
   beacon. The version and the precache list are injected at build time. */
const VERSION = "__VERSION__";
const CACHE = `veille-${VERSION}`;
const PRECACHE = __PRECACHE__;
// Precached responses are keyed by URL only: a `Vary` header (e.g. Origin on cors module scripts)
// must not make a precached asset miss.
const MATCH = { ignoreVary: true };
const SHELL = new URL("__SHELL__", self.location.href).href;

self.addEventListener("install", (event) => {
  // No skipWaiting here: an update waits until the user accepts it (ADR-0012).
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE.map((p) => new URL(p, self.location.href).href))),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names.filter((n) => n.startsWith("veille-") && n !== CACHE).map((n) => caches.delete(n)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(caches.match(SHELL, MATCH).then((hit) => hit || fetch(request)));
    return;
  }
  event.respondWith(caches.match(request, MATCH).then((hit) => hit || fetch(request)));
});
