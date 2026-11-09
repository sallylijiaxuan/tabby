/* Production builds replace the asset list and cache version. */
const CACHE = 'tabby-__CACHE_VERSION__';
const ASSETS = /* PRECACHE */ [];
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(ASSETS);
    const response = await fetch('/', { cache: 'reload', credentials: 'same-origin' });
    if (!response.ok || response.redirected) throw new Error('Open Tabby online to finish setup.');
    await cache.put('/', response);
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith('tabby-') && key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  // Authentication and server component requests always go to the server.
  if (url.pathname !== '/' && !ASSETS.includes(url.pathname)) return;
  if (request.mode === 'navigate' && url.pathname === '/') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        return response;
      } catch {
        return await (await caches.open(CACHE)).match('/') || new Response('Open Tabby online once to enable offline access.', { status: 503, headers: { 'Content-Type': 'text/plain' } });
      }
    })());
  } else if (ASSETS.includes(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE), cached = await cache.match(url.pathname);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok && !response.redirected) await cache.put(url.pathname, response.clone());
      return response;
    })());
  }
});
