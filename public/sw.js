// Service Worker — Aghsat PWA
// Cache-first for app shell, cache-only for runtime data (localStorage lives in browser).
const CACHE_NAME = 'aghsat-3d6ec03c';
const ASSETS = [
  '/',
  '/index.html',
  '/favicon.png',
  '/manifest.json',
  '/assets/geist-cyrillic-ext-wght-normal-DjL33-gN.woff2',
  '/assets/geist-cyrillic-wght-normal-BEAKL7Jp.woff2',
  '/assets/geist-latin-ext-wght-normal-DC-KSUi6.woff2',
  '/assets/geist-latin-wght-normal-BgDaEnEv.woff2',
  '/assets/geist-vietnamese-wght-normal-6IgcOCM7.woff2',
  '/assets/index-Bdn3zmr4.js',
  '/assets/index-RRUuYEZD.css',
  '/assets/vazirmatn-arabic-wght-normal-Cafbb7Zc.woff2',
  '/assets/vazirmatn-latin-ext-wght-normal-tDTa1Fj6.woff2',
  '/assets/vazirmatn-latin-wght-normal-BFexNX-K.woff2'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Cache-first for same-origin assets (HTML, JS, CSS, fonts, icons).
  if (url.origin === self.location.origin) {
    // Navigations: network-first so a new deploy is picked up immediately; cache when offline.
    const accept = request.headers.get('accept') || '';
    if (request.mode === 'navigate' || accept.includes('text/html')) {
      event.respondWith(
        fetch(request)
          .then((response) => {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy));
            return response;
          })
          .catch(() => caches.match('/index.html'))
      );
      return;
    }

    event.respondWith(
      caches.match(request).then((cached) =>
        cached || fetch(request).then((response) => {
          if (response.ok && request.method === 'GET') {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
      )
    );
    return;
  }

  // Cross-origin (fonts from fontsource CDN etc.): network-first, fall back to cache.
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// Allow the page to tell the waiting SW to activate immediately (PWA update flow).
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
