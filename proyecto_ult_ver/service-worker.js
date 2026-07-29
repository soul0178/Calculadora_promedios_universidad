/* ============================= SERVICE WORKER ============================= */
// Sube este número cada vez que cambies algún archivo cacheado, para forzar
// a los usuarios a recibir la versión nueva.
const CACHE_VERSION = 'v11';
const CACHE_NAME = `libreta-notas-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/config.js',
  './js/state.js',
  './js/calc.js',
  './js/semesters-courses.js',
  './js/render.js',
  './js/events.js',
  './js/modals.js',
  './js/import-export.js',
  './js/pdf-report.js',
  './js/firebase-config.js',
  './js/cloud-sync.js',
  './js/main.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  // Recursos externos (fuentes, Chart.js, jsPDF, Firebase) — se cachean como "opacos" (no-cors).
  'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600;700&display=swap',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js',
  'https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all(
        PRECACHE_URLS.map((url) =>
          cache.add(new Request(url, { mode: url.startsWith('http') ? 'no-cors' : 'same-origin' }))
            .catch((err) => console.warn('[SW] No se pudo precachear', url, err))
        )
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Estrategia: cache-first con actualización en segundo plano (stale-while-revalidate).
// Como la app no depende de un backend (todo vive en localStorage), esto la deja
// funcionando 100% offline una vez visitada la primera vez.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const networkFetch = fetch(req)
        .then((res) => {
          if (res && (res.status === 200 || res.type === 'opaque')) {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return res;
        })
        .catch(() => cached); // sin red: usa lo cacheado si existe

      return cached || networkFetch;
    })
  );
});
