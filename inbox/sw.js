/* Inbox HQ service worker — cache the shell, always fetch live data. */
const CACHE = 'inbox-hq-shell-v19';
const SHELL = [
  '/inbox/',
  '/inbox/index.html',
  '/inbox/manifest.webmanifest',
  '/inbox/apple-touch-icon.png',
  '/inbox/icon-192.png',
  '/inbox/icon-512.png',
  '/inbox/icon-512-maskable.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

function isLiveData(url) {
  const path = url.pathname;
  return path.endsWith('/data.json') || path.endsWith('/todo.json');
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith('/inbox')) return;

  // Always network-first for live data so the hourly update is never stale.
  if (isLiveData(url)) {
    event.respondWith(
      fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((cache) => cache.put(url.pathname, copy)); }
        return res;
      }).catch(() => caches.match(url.pathname))
    );
    return;
  }

  // Page: network-first so updates show right away, cached copy when offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((cache) => cache.put('/inbox/', copy)); }
        return res;
      }).catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match('/inbox/')))
    );
    return;
  }

  // Shell assets: cache-first, fall back to network.
  event.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        const copy = res.clone();
        if (res.ok && (req.destination === 'document' || req.destination === 'script' || req.destination === 'style' || req.destination === 'image' || url.pathname.endsWith('.webmanifest'))) {
          caches.open(CACHE).then((cache) => cache.put(req, copy));
        }
        return res;
      });
    })
  );
});
