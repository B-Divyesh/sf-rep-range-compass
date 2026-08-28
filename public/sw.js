const CACHE_NAME = 'rep-range-compass-v2';
const BUILD_ASSETS = "__BUILD_ASSETS__";
const VERSIONED_ASSETS = Array.isArray(BUILD_ASSETS) ? BUILD_ASSETS : [];
const APP_SHELL = [
  '/', '/index.html', '/offline.html', '/offline.css', '/legal.css', '/privacy/', '/terms/', '/manifest.webmanifest', '/robots.txt',
  '/assets/icon-192.png', '/assets/icon-512.png', '/assets/icon-maskable-512.png',
  '/assets/progression-landscape-640.avif', '/assets/progression-landscape-1280.avif',
  '/assets/progression-landscape-640.webp', '/assets/progression-landscape-1280.webp', '/assets/progression-landscape-1280.jpg',
  ...VERSIONED_ASSETS
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(Promise.all([
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
    self.clients.claim()
  ]));
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request)
      .then((response) => { const copy = response.clone(); caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)); return response; })
      .catch(async () => (await caches.match(event.request)) || (await caches.match('/index.html')) || caches.match('/offline.html')));
    return;
  }
  event.respondWith(caches.open(CACHE_NAME).then(async (cache) => {
    const cached = await cache.match(event.request, { ignoreSearch: true }) || await cache.match(url.pathname, { ignoreSearch: true });
    if (cached) return cached;
    const response = await fetch(event.request);
    if (response.ok) await cache.put(event.request, response.clone());
    return response;
  }));
});
