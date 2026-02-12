// Service Worker for FIAT vs CRYPTO
// ⚠️ VERSION SYNC: Must match src/utils/Constants.js window.Game.VERSION
// When updating version: 1) Constants.js  2) sw.js  3) CHANGELOG.md
const SW_VERSION = '4.50.0';
const CACHE_NAME = `fiat-vs-crypto-v${SW_VERSION}`;

// All assets to cache
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './manifest.json',
    './icon-512.png',
    // Config
    './src/config/BalanceConfig.js',
    // Audio
    './src/audio/MusicData.js',
    // Utils
    './src/utils/Constants.js',
    './src/utils/DebugSystem.js',
    './src/utils/ColorUtils.js',
    './src/utils/MathUtils.js',
    './src/utils/RunState.js',
    './src/utils/Upgrades.js',
    // Core
    './src/core/EventBus.js',
    './src/core/GameStateMachine.js',
    './src/core/InputSystem.js',
    './src/core/AudioSystem.js',
    './src/core/ObjectPool.js',
    // Entities
    './src/entities/Entity.js',
    './src/entities/Bullet.js',
    './src/entities/Player.js',
    './src/entities/Enemy.js',
    './src/entities/Boss.js',
    './src/entities/PowerUp.js',
    // Managers
    './src/managers/WaveManager.js',
    './src/managers/CampaignState.js',
    './src/managers/PerkManager.js',
    './src/managers/MiniBossManager.js',
    // Story System
    './src/story/StoryScreenData.js',
    './src/story/StoryScreen.js',
    './src/story/DialogueData.js',
    './src/story/StoryManager.js',
    './src/story/DialogueUI.js',
    // Systems
    './src/systems/BulletPatterns.js',
    './src/systems/BulletSystem.js',
    './src/systems/SpatialGrid.js',
    './src/systems/CollisionSystem.js',
    './src/systems/DropSystem.js',
    './src/systems/MemeEngine.js',
    './src/systems/HarmonicSequences.js',
    './src/systems/HarmonicConductor.js',
    './src/systems/ParticleSystem.js',
    './src/systems/EffectsRenderer.js',
    './src/systems/SkyRenderer.js',
    './src/systems/TransitionManager.js',
    './src/systems/TitleAnimator.js',
    './src/systems/MessageSystem.js',
    './src/systems/RankSystem.js',
    './src/systems/FloatingTextManager.js',
    './src/systems/PerkIconManager.js',
    // Main
    './src/main.js'
];

// Install: cache all assets and activate immediately
self.addEventListener('install', (event) => {
    console.log(`[SW] Installing version ${SW_VERSION}`);
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching app shell');
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
    console.log(`[SW] Activating version ${SW_VERSION}`);
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('[SW] Deleting old cache:', cacheName);
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
                    // Offline fallback to cache
                    return caches.match(event.request);
                })
        );
        return;
    }

    // Cache-first for static assets (images, fonts, etc.)
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                return response || fetch(event.request).then((fetchResponse) => {
                    // Only cache complete (200) responses — 206 partial responses are unsupported
                    if (fetchResponse.status === 200) {
                        const responseClone = fetchResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseClone);
                        });
                    }
                    return fetchResponse;
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
