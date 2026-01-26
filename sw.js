const CACHE_NAME = 'fiat-invaders-v1';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './src/main.js',
    './src/core/Constants.js',
    './src/core/InputSystem.js',
    './src/core/ObjectPool.js',
    './src/entities/Player.js',
    './src/entities/Enemy.js',
    './src/entities/Bullet.js',
    './src/entities/Boss.js',
    './src/managers/WaveManager.js',
    './src/audio/AudioSystem.js',
    './src/utils/Utils.js',
    './manifest.json',
    './icon-512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Caching App Shell');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
