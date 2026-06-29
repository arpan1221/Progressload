// Hand-rolled service worker for the Workout Tracker PWA.
// Strategy:
//   - Precache the app shell ("/") on install for offline launch.
//   - Network-first for navigations, falling back to cached "/" when offline.
//   - Cache-first for same-origin static assets.
//   - NEVER cache cross-origin requests (e.g. Supabase API) — bypass them entirely.

const CACHE_VERSION = "workout-tracker-v1";
const APP_SHELL = "/";

// Precache the app shell so the app launches with no network.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll([APP_SHELL]))
      .then(() => self.skipWaiting())
  );
});

// Remove any caches from previous versions.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_VERSION)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle GET requests; let the network deal with everything else.
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Bypass cross-origin requests (Supabase API, auth, etc.) — never cache them.
  if (url.origin !== self.location.origin) return;

  // Network-first for navigations, with cached app-shell fallback when offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(APP_SHELL, copy));
          return response;
        })
        .catch(() =>
          caches
            .match(request)
            .then((cached) => cached || caches.match(APP_SHELL))
        )
    );
    return;
  }

  // Cache-first for same-origin static assets.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        // Only cache valid, basic (same-origin) responses.
        if (
          response &&
          response.status === 200 &&
          response.type === "basic"
        ) {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
