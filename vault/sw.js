/* The Vault — service worker.
   Caches the app shell + covers so the app opens offline.
   Audio streams are never cached (they're hundreds of MB). */
const VERSION = 'vault-v2';
const SHELL = [
  './',
  './index.html',
  './books.js',
  './covers/up-from-slavery.jpg',
  './covers/outwitting-the-devil.jpg',
  './covers/how-to-win-friends.jpg',
  './covers/think-and-grow-rich.jpg',
  './covers/rich-dad-poor-dad.jpg',
  '/vault-favicon.svg',
  '/vault-icon.png',
  '/vault-manifest.json',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;

  // Audio/video streams: straight to the network, never cached.
  if (url.hostname.includes('archive.org')) return;

  // Google Fonts: cache-first so text renders offline after first load.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.open(VERSION).then(async c => {
        const hit = await c.match(e.request);
        if (hit) return hit;
        const res = await fetch(e.request);
        if (res.ok) c.put(e.request, res.clone());
        return res;
      })
    );
    return;
  }

  // App shell: network-first for the page and the book list (so updates
  // land without a cache-version bump), cache-first for everything else.
  if (e.request.mode === 'navigate' || url.pathname.endsWith('/books.js')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const copy = res.clone();
          caches.open(VERSION).then(c => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request).then(hit => hit || (e.request.mode === 'navigate' ? caches.match('./index.html') : Promise.reject(new Error('offline')))))
    );
    return;
  }

  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(e.request).then(hit =>
        hit ||
        fetch(e.request).then(res => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then(c => c.put(e.request, copy));
          }
          return res;
        })
      )
    );
  }
});
