const CACHE = 'meu-financeiro-static-v3';
const CORE = ['./index.html', './manifest.webmanifest', './icon.svg', './vendor/supabase.js', './cloud-sync.mjs'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('meu-financeiro-static-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/') || event.request.headers.has('Authorization')) return;
  const staticAsset = CORE.some(path => new URL(path, self.location.href).pathname === url.pathname);
  if (!staticAsset && event.request.mode !== 'navigate') return;
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok && staticAsset) {const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache => cache.put(event.request, copy)));}
    return response;
  }).catch(async () => {
    const cached = await caches.match(event.request);
    if (cached) return cached;
    if (event.request.mode === 'navigate') return (await caches.match('./index.html')) || Response.error();
    return Response.error();
  }));
});
