const CACHE = 'scan-receipt-shell-v4';
const CORE = ['/index.html', '/offline.html', '/manifest.webmanifest', '/icons/icon.svg', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/apple-touch-icon.png', '/assets/hero-480.webp', '/assets/hero-960.webp', '/assets/hero-1440.webp', '/assets/hero-960.jpg', '/assets/social-preview.jpg'];

const cacheKey = request => {
  const url = new URL(typeof request === 'string' ? request : request.url, self.location.origin);
  return url.pathname;
};

async function cached(path) {
  return (await caches.open(CACHE)).match(cacheKey(path), { ignoreSearch: true });
}

self.addEventListener('install', event => event.waitUntil((async () => {
  const cache = await caches.open(CACHE);
  const indexResponse = await fetch('/index.html', { cache: 'reload' });
  if (!indexResponse.ok) throw new Error('App shell unavailable');
  const html = await indexResponse.clone().text();
  const builtAssets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"?]+)(?:\?[^\"]*)?"/g)].map(match => match[1]);
  await cache.addAll([...new Set([...CORE.slice(1), ...builtAssets])]);
  await Promise.all([cache.put('/', indexResponse.clone()), cache.put('/index.html', indexResponse)]);
  const responses = await Promise.all(['/', ...CORE, ...builtAssets].map(path => cache.match(path, { ignoreSearch: true })));
  if (responses.some(response => !response)) throw new Error('App shell cache incomplete');
  await self.skipWaiting();
})()));

self.addEventListener('activate', event => event.waitUntil((async () => {
  const keys = await caches.keys();
  await Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)));
  await self.clients.claim();
})()));

self.addEventListener('message', event => {
  if (event.data?.type !== 'CHECK_OFFLINE_READY' || !event.ports[0]) return;
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const index = await cache.match('/index.html');
    if (!index) return event.ports[0].postMessage({ type: 'OFFLINE_READY', ready: false });
    const html = await index.clone().text();
    const builtAssets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"?]+)(?:\?[^\"]*)?"/g)].map(match => match[1]);
    const responses = await Promise.all(['/', ...CORE, ...builtAssets].map(path => cache.match(path, { ignoreSearch: true })));
    event.ports[0].postMessage({ type: 'OFFLINE_READY', ready: responses.every(Boolean), cache: CACHE });
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      const shell = await cached('/index.html');
      if (shell) {
        event.waitUntil(fetch(event.request).then(response => response.ok ? caches.open(CACHE).then(cache => cache.put('/index.html', response)) : undefined).catch(() => undefined));
        return shell;
      }
      try { return await fetch(event.request); }
      catch { return (await cached('/offline.html')) || Response.error(); }
    })());
    return;
  }
  event.respondWith((async () => {
    const response = await cached(url.pathname);
    if (response) return response;
    const network = await fetch(event.request);
    if (network.ok) event.waitUntil(caches.open(CACHE).then(cache => cache.put(url.pathname, network.clone())));
    return network;
  })());
});
