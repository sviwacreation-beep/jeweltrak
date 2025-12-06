const CACHE_NAME = 'jeweltrack-v1';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
  // CDN Modules
  'https://aistudiocdn.com/react@^19.2.0/',
  'https://aistudiocdn.com/react@^19.2.0',
  'https://aistudiocdn.com/@google/genai@^1.30.0',
  'https://aistudiocdn.com/lucide-react@^0.554.0',
  'https://aistudiocdn.com/react-dom@^19.2.0/',
  'https://aistudiocdn.com/recharts@^3.5.0',
  'https://aistudiocdn.com/qrcode.react@^4.2.0',
  'https://aistudiocdn.com/html5-qrcode@^2.3.8',
  'https://aistudiocdn.com/firebase@^12.6.0/'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // We use { mode: 'no-cors' } for opaque CDN responses to prevent install failure
      // on cross-origin scripts.
      const cachePromises = URLS_TO_CACHE.map(url => {
        return fetch(url, { mode: 'no-cors' }).then(response => {
          return cache.put(url, response);
        }).catch(err => console.warn('Failed to cache:', url, err));
      });
      return Promise.all(cachePromises);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Skip non-GET requests or Firestore API calls (Firestore handles its own offline persistence)
  if (event.request.method !== 'GET' || event.request.url.includes('firestore.googleapis.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }
      return fetch(event.request).then((response) => {
        // Cache new valid responses
        if (!response || response.status !== 200 || response.type !== 'basic') {
          // If it's an opaque response (CDN), we might still want to cache it depending on strategy,
          // but strictly, only basic/cors valid responses here for safety.
          // For simplicity in this specialized setup:
          if (response && (response.type === 'opaque' || response.type === 'cors')) {
             const responseToCache = response.clone();
             caches.open(CACHE_NAME).then((cache) => {
               cache.put(event.request, responseToCache);
             });
          }
          return response;
        }

        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      }).catch(() => {
        // Fallback for offline if not in cache (could return offline.html if existed)
      });
    })
  );
});