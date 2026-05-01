/**
 * Service Worker for PWA — v3
 *
 * Caching strategy:
 *   /_next/*    → BYPASS the SW. Next.js chunks already have content-hashes
 *                 and Vercel sends `immutable` Cache-Control. Caching them
 *                 here is redundant AND dangerous: a stale chunk pinned in
 *                 the SW cache locks users on old code after a deploy.
 *   /api/*      → network-first, cached fallback when offline.
 *   images/font → cache-first (truly immutable in the public/ folder).
 *   HTML pages  → network-first with cached fallback (so deploys take
 *                 effect on next navigation, not after a manual reload).
 *
 * Versioning:
 *   On every deploy that wants to invalidate clients' SW caches, bump the
 *   version suffix (v3 → v4). The activate event's allowlist deletes any
 *   cache name not in the current set.
 */

const VERSION = 'v3';
const STATIC_CACHE  = `legal-rag-static-${VERSION}`;
const DYNAMIC_CACHE = `legal-rag-dynamic-${VERSION}`;
const ALLOWLIST = [STATIC_CACHE, DYNAMIC_CACHE];

// Pre-cache only what is genuinely useful offline. Best-effort: if any URL
// 404s we skip it instead of failing the whole install.
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
];

// ─── Install ──────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log(`[SW ${VERSION}] Installing`);
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      Promise.all(
        STATIC_ASSETS.map((url) =>
          cache.add(url).catch((err) =>
            console.warn(`[SW ${VERSION}] Skipped (failed to cache):`, url, err.message)
          )
        )
      )
    )
  );
  // Take over from any older waiting SW immediately.
  self.skipWaiting();
});

// ─── Activate ─────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log(`[SW ${VERSION}] Activating`);
  event.waitUntil(
    caches.keys()
      .then((names) =>
        Promise.all(
          names
            .filter((n) => !ALLOWLIST.includes(n))
            .map((n) => {
              console.log(`[SW ${VERSION}] Deleting old cache:`, n);
              return caches.delete(n);
            })
        )
      )
      .then(() => self.clients.claim())
  );
});

// ─── Fetch ────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Cross-origin: let the browser handle it directly.
  if (url.origin !== location.origin) return;

  // Next.js chunks/images: BYPASS the SW completely.
  // Hashes guarantee uniqueness and Vercel's immutable cache header is
  // optimal — any caching here just gets in the way of fresh deploys.
  if (url.pathname.startsWith('/_next/')) return;

  // API: network-first, fall back to cached response when offline.
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(DYNAMIC_CACHE).then((c) => c.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Genuinely immutable static assets in /public — cache-first.
  if (request.destination === 'image' || request.destination === 'font') {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(STATIC_CACHE).then((c) => c.put(request, clone));
          return response;
        }).catch(() => caches.match(request));
      })
    );
    return;
  }

  // Everything else (HTML pages, manifest, etc.): network-first.
  // We never serve stale HTML — that was the root cause of the
  // ChunkLoadError loop. Cache only as offline fallback.
  event.respondWith(
    fetch(request)
      .then((response) => {
        const clone = response.clone();
        caches.open(DYNAMIC_CACHE).then((c) => c.put(request, clone));
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// ─── Background sync (offline actions) ────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-queries') {
    event.waitUntil(syncQueries());
  }
});

// ─── Push notifications ───────────────────────────────────────────────
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'New notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: { dateOfArrival: Date.now(), primaryKey: 1 },
    actions: [
      { action: 'explore', title: 'View' },
      { action: 'close', title: 'Close' },
    ],
  };
  event.waitUntil(self.registration.showNotification('Poweria Legal', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'explore') {
    event.waitUntil(clients.openWindow('/'));
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────
async function syncQueries() {
  try {
    return Promise.resolve();
  } catch (error) {
    return Promise.reject(error);
  }
}

// ─── External controls ────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(DYNAMIC_CACHE).then((cache) => cache.addAll(event.data.urls))
    );
  }
});
