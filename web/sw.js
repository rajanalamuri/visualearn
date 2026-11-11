/* VisuaLearn service worker: lets the site open without a connection.
   Network first, so people always get the newest version when online; the cache is only the fallback. */
const V = 'vl-v1';
const CORE = ['/play/', '/math/', '/progress/', '/curriculum/', '/assets/style.css', '/assets/home.css', '/assets/arith.css', '/assets/play.css',
  '/assets/pipkit.js', '/assets/play.js', '/assets/progress.js', '/assets/limit.js', '/assets/arith.js', '/assets/catalog.js',
  '/favicon.svg', '/manifest.webmanifest', '/icons/icon-192.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(V).then((c) => Promise.all(CORE.map((u) => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  e.respondWith(
    fetch(r).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(V).then((c) => c.put(r, copy)); }
      return res;
    }).catch(() => caches.match(r).then((m) => m || (r.mode === 'navigate' ? caches.match('/play/') : Response.error())))
  );
});
