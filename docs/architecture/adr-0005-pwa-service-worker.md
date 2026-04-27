# ADR-0005: PWA + Service Worker Architecture

## Status
Accepted

## Date
2026-04-25

## Engine Compatibility

| Field | Value |
|-------|-------|
| **Engine** | Vanilla JavaScript (Canvas 2D, no framework) |
| **Domain** | Core / Deployment |
| **Knowledge Risk** | LOW — PWA patterns are stable across modern browsers |
| **References Consulted** | `sw.js`, `manifest.json`, `_headers` |
| **Post-Cutoff APIs Used** | None |
| **Verification Required** | Cache-busting behavior on version change |

## ADR Dependencies

| Field | Value |
|-------|-------|
| **Depends On** | None |
| **Enables** | Offline play, mobile standalone mode, fast repeat visits |
| **Blocks** | None |
| **Ordering Note** | Service worker is a deployment-layer concern; game code does not depend on it at runtime |

## Context

### Problem Statement
The game is a static-site PWA deployed on Cloudflare Pages. Players expect to:
1. Install the game on their mobile home screen (standalone mode)
2. Play without network connectivity after initial load
3. Receive updates when the game is redeployed
4. Load quickly on repeat visits (cache hits instead of network fetches)

Without a service worker, every visit requires re-downloading all assets, and the game cannot be installed as a PWA.

### Constraints
- Must work on Cloudflare Pages (no server-side logic, static files only)
- Must support cache-first strategy for all game assets (JS, CSS, images, audio)
- Must invalidate old caches when the game version changes
- Must serve from a single root path (no complex routing)
- Zero external dependencies in the service worker (no Workbox)

### Requirements
- Cache all game assets on first visit (install event)
- Serve cached assets on subsequent visits (cache-first, network fallback)
- Activate new service worker version without breaking the current session (wait-until-next-load)
- Clear old caches when version changes
- Support `manifest.json` for PWA install prompt
- Include icons for various device sizes

## Decision

Use a cache-first service worker with versioned cache naming and manual cache-busting on version change.

### Architecture

```
Service Worker Lifecycle
├── INSTALL → Cache all static assets in CACHE_NAME
├── FETCH  → Cache-first: serve from cache, fallback to network
└── ACTIVATE → Delete old caches where name !== CACHE_NAME
```

### Key Interfaces

```js
// sw.js — Version sync (must match Constants.js)
const SW_VERSION = '7.12.14';
const CACHE_NAME = `fiat-vs-crypto-${SW_VERSION}`;
const ASSETS = [
  '/', '/index.html', '/style.css', '/manifest.json',
  '/src/main.js', '/src/utils/Constants.js',
  // ... all game scripts and assets
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
});
```

### Version Sync
When bumping the game version, ALL three must be updated:
1. `src/utils/Constants.js` — `window.Game.VERSION`
2. `sw.js` — `SW_VERSION` and `CACHE_NAME`
3. `CHANGELOG.md`

## Alternatives Considered

### Alternative 1: Network-first strategy
- **Description**: Try network first, fallback to cache
- **Pros**: Always serves latest version on first load
- **Cons**: Slower repeat visits; PWA install requires at least some cache
- **Rejection Reason**: Cache-first provides instant loading on repeat visits and full offline play. Version-bumping handles updates.

### Alternative 2: No service worker
- **Description**: Pure static site, no PWA capabilities
- **Pros**: Simpler deployment, no cache invalidation logic
- **Cons**: No offline play; no install prompt; slower repeat loads
- **Rejection Reason**: PWA is a requirement for mobile game distribution.

## Consequences

### Positive
- Full offline play after initial load
- Instant loading on repeat visits (cache hits)
- Mobile install via PWA prompt
- Simple version-based cache invalidation

### Negative
- Hard-refresh (Shift+Reload) required to bypass cache during development
- Cache-first means the old version runs until the next page load (no hot-swap)
- Asset list must be manually maintained in sw.js (add new scripts on creation)

### Risks
- Cache grows stale if version is not bumped on deployment
  - **Mitigation**: Version sync is documented in CLAUDE.md as a required step on every release
- New assets added mid-development aren't cached until next version bump
  - **Mitigation**: Hard-refresh bypasses cache during development; version bump before deployment ensures fresh cache

## GDD Requirements Addressed

| GDD System | Requirement | How This ADR Addresses It |
|------------|-------------|--------------------------|
| (infrastructure) | Offline play | Service worker cache-first strategy enables full offline play |
| (infrastructure) | Mobile standalone mode | manifest.json + icons enable PWA install-to-home-screen |

## Performance Implications
- **CPU**: Zero — service worker runs in a separate thread, not on the main game loop
- **Memory**: Cache storage varies by asset count (~1-2MB for all game assets)
- **Load Time**: First load = network speed; repeat loads = instant (cache hit)
- **Network**: First download of all assets on initial visit; zero network requests on repeat visits

## Migration Plan
Already shipped. No migration needed.

## Validation Criteria
- Game loads and plays fully in airplane mode after one successful load
- Version bump + redeploy clears old cache and serves new assets
- PWA install prompt appears on mobile Chrome/Safari
- All game assets are cached (verify via DevTools → Cache Storage)

## Related Decisions
- ADR-0006: Cloudflare Workers Leaderboard — separate from PWA; leaderboard API calls are network-only (not cached)
