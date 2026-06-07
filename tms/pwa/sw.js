// Centro TMS — Service Worker (PWA offline shell)
// Bump CACHE_VERSION on each deploy to invalidate stale caches.
const CACHE_VERSION = 'centro-tms-v1';
const SHELL = [
  '/employee-app',
  '/driver-app',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return; // never cache writes (bookings, QR scans, GPS pings)

  const url = new URL(req.url);
  // Online-only for data/AI calls — serving stale records would be dangerous.
  // Offline write queueing lives in the app's own localStorage, not here.
  if (url.hostname.includes('zoho') || url.hostname.includes('googleapis')) return;

  // Cache-first for the app shell / static assets.
  event.respondWith(
    caches.match(req).then((cached) =>
      cached || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
        return res;
      }).catch(() => cached)
    )
  );
});
