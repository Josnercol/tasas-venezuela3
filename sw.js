// Cambia este número cuando quieras forzar a todos a descargar los estáticos de nuevo
const CACHE = 'tasasve-v3';
const STATIC = ['/', '/index.html', '/manifest.json', '/icon-180.png', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // Tasas: siempre red, nunca caché (el navegador maneja el error)
  if (url.pathname === '/rates.json' || url.pathname.startsWith('/api/')) return;

  // Página HTML: primero red (para recibir actualizaciones), caché si no hay internet
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put('/index.html', copy));
          }
          return res;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Íconos y manifest: caché primero
  e.respondWith(caches.match(e.request).then(cached => cached || fetch(e.request)));
});
