// Service Worker for FIAT vs CRYPTO
// ⚠️ VERSION SYNC: Must match src/utils/Constants.js window.Game.VERSION
// When updating version: 1) Constants.js  2) sw.js  3) CHANGELOG.md
const SW_VERSION = '7.39.0';
const CACHE_NAME = `fiat-vs-crypto-v${SW_VERSION}`;

// All assets to cache
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.min.css',
    './bundle.js',
    './manifest.json',
    './icon-512.png',
    './icon-512.svg',
    './splashscreen.webm',
    './splashscreen.mp4',
    // Videos used at end-game (lazy loaded, but cache for offline)
    './completion-en.webm',
    './completion-it.webm',
    './completion-en.mp4',
    './completion-it.mp4',
];

// v7.19: Synthetic 503 fallback used when both cache and network are unavailable.
// Returning this Response keeps event.respondWith() from rejecting, which would
// otherwise surface in DevTools as "Failed to convert value to 'Response'." spam.
function offlineFallback(request) {
    return new Response('', {
        status: 503,
        statusText: 'Service Unavailable (offline + uncached)',
        headers: { 'Content-Type': 'text/plain' }
    });
}

// Install: cache all assets and activate immediately
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => {
                // Skip waiting - activate new SW immediately
                return self.skipWaiting();
            })
    );
});

// Activate: clean old caches and take control
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME) {
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                // Take control of all clients immediately
                return self.clients.claim();
            })
    );
});

// Fetch: Network-first for HTML/JS/CSS, cache-first for images
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    // Skip cross-origin requests
    if (url.origin !== location.origin) return;

    // Network-first for dynamic content (HTML, JS, CSS)
    if (url.pathname.endsWith('.html') ||
        url.pathname.endsWith('.js') ||
        url.pathname.endsWith('.css') ||
        url.pathname === '/' ||
        url.pathname === '') {

        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    // Clone and cache the fresh response
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                    return response;
                })
                .catch(() => {
                    // Offline fallback to cache; if cache also misses, synthesize 503.
                    // v7.19: never reject the FetchEvent — return a real Response always.
                    return caches.match(event.request).then((cached) => cached || offlineFallback(event.request));
                })
        );
        return;
    }

    // Cache-first for static assets (images, fonts, etc.)
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) return response;
                return fetch(event.request).then((fetchResponse) => {
                    // Only cache complete (200) responses — 206 partial responses are unsupported
                    if (fetchResponse.status === 200) {
                        const responseClone = fetchResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseClone);
                        });
                    }
                    return fetchResponse;
                }).catch(() => {
                    // v7.19: network down + no cache hit → synthetic 503 instead of rejected promise.
                    return offlineFallback(event.request);
                });
            })
    );
});

// Listen for skip waiting message from client
self.addEventListener('message', (event) => {
    if (event.data === 'skipWaiting') {
        self.skipWaiting();
    }
});
