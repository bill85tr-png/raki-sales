const CACHE_NAME = 'raki-sales-v3.5';

// Τα βασικά αρχεία που ΠΡΕΠΕΙ να είναι cached για offline λειτουργία
const CORE_URLS = [
  '/raki-sales/Index.html',
  '/raki-sales/manifest.json',
  '/raki-sales/icon-192.png',
  '/raki-sales/icon-512.png'
];

// CDN αρχεία — τα κάνουμε cache αλλά δεν αποτυγχάνουμε αν δεν φορτώσουν
const CDN_URLS = [
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
  'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/pdfmake.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/vfs_fonts.js'
];

// Εγκατάσταση
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      // Πρώτα τα βασικά (υποχρεωτικά)
      await cache.addAll(CORE_URLS);
      // Μετά τα CDN (προαιρετικά — δεν σταματάμε αν αποτύχουν)
      await Promise.allSettled(
        CDN_URLS.map(url =>
          fetch(url).then(res => {
            if (res.ok) cache.put(url, res);
          }).catch(() => {})
        )
      );
      console.log('[SW] Cache εγκαταστάθηκε - v3.5');
    })
  );
  self.skipWaiting();
});

// Ενεργοποίηση — καθαρισμός παλιών cache
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => {
            console.log('[SW] Διαγραφή παλιού cache:', k);
            return caches.delete(k);
          })
      )
    )
  );
  self.clients.claim();
});

// Fetch — cache-first για τοπικά, network-first για CDN
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Παράκαμψη Google API (πάντα χρειάζονται internet)
  if (url.includes('googleapis.com') ||
      url.includes('accounts.google.com') ||
      url.includes('gsi/client')) {
    return;
  }

  // Cache-first στρατηγική
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      // Δεν υπάρχει στην cache — δοκιμή από network
      return fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline και δεν υπάρχει στην cache
        if (event.request.destination === 'document') {
          return caches.match('/raki-sales/Index.html');
        }
      });
    })
  );
});
