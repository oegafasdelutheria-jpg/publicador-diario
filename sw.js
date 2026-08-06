// Service Worker de Publicador Diario
// Cachea el "app shell" en la instalación para que funcione sin conexión
// después de la primera visita.
//
// IMPORTANTE: cada vez que subas una actualización de index.html,
// subí también en 1 el número de acá abajo (v1 -> v2 -> v3...).
// Eso fuerza a que todos los que ya tienen la app instalada reciban
// la versión nueva en la próxima apertura, sin tener que limpiar caché a mano.
const CACHE_NAME = 'publicador-diario-v11';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Estrategia: cache primero, red como respaldo (y actualiza el cache en segundo plano).
// { cache: 'reload' } le dice al navegador que ignore SU PROPIA caché interna
// y vaya de verdad a buscar el archivo actualizado, no una copia vieja guardada.
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(cached => {
      const networkFetch = fetch(event.request, { cache: 'reload' }).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);
      return cached || networkFetch;
    })
  );
});