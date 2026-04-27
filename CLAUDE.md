# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**FIAT vs CRYPTO** (v7.17.0) — a vertical-scrolling shoot-'em-up built in pure vanilla JavaScript using Canvas 2D. No frameworks, no bundlers, no npm dependencies. Runs as a static PWA with a Cloudflare Workers leaderboard backend.

## Commands

- **Serve locally**: `python3 -m http.server 8000` (or any static file server) — open `http://localhost:8000` in a browser
- **Run tests**: Open `tests/runner.html` in a browser (no server needed for tests, but the game needs one due to ES module/CORS constraints)
- **Generate icons**: `node scripts/generate-icons.js` (requires sharp — `npm install sharp` if not present)
- **Deploy leaderboard worker**: `cd workers && npx wrangler deploy` (requires Cloudflare credentials)
- **Create KV namespace**: `npx wrangler kv:namespace create LEADERBOARD` — paste the returned ID into `workers/wrangler.toml`
- **Set leaderboard HMAC secret**: `npx wrangler secret put HMAC_SECRET` — must match `Game.LEADERBOARD_HMAC_KEY` in `src/utils/Constants.js`

## Version Sync

When bumping the game version, update ALL three locations:
1. `src/utils/Constants.js` — `window.Game.VERSION`
2. `sw.js` — `SW_VERSION` and `CACHE_NAME`
3. `CHANGELOG.md`

## Code Architecture

### Namespace Pattern

All code lives under `window.Game.*` (no ES modules, no imports). Script load order in `index.html` is the dependency graph:

1. `utils/` — Constants, MathUtils, ColorUtils, DebugSystem, RNG, RunState, Upgrades
2. `core/` — GameStateMachine, EventBus, AudioSystem, GameplayCallbacks, ObjectPool, InputSystem
3. `config/` — BalanceConfig (all tuning knobs: game balance, enemy stats, drop rates)
4. `systems/` — CollisionSystem, BulletSystem, ParticleSystem, DropSystem, ScrollEngine, etc.
5. `entities/` — Player, Enemy, Bullet, Boss, PowerUp, Entity (base)
6. `managers/` — WaveManager, PerkManager, MiniBossManager, CampaignState, AchievementSystem, DailyMode, StatsTracker, LeaderboardClient
7. `story/` — StoryManager, DialogueData, DialogueUI, StoryScreen, StoryScreenData, StoryBackgrounds
8. `ui/` — IntroScreen, DebugOverlay, ModifierChoiceScreen, LessonModal, GameCompletion
9. `v8/` — LevelScript (V8 scroller level)
10. `audio/` — MusicData (procedural audio patterns)
11. `main.js` — Entry point, game loop, wiring

### Key Modules

- **GameStateMachine** (`core/GameStateMachine.js`): Central state machine with strict transition map. States: VIDEO → INTRO → HANGAR → PLAY → PAUSE → GAMEOVER, etc.
- **EventBus** (`core/EventBus.js`): Pub/sub for decoupled communication between systems.
- **BalanceConfig** (`config/BalanceConfig.js`): Single source of truth for all game balance numbers (damage, HP, speeds, drop rates, wave timing).
- **CollisionSystem** (`systems/CollisionSystem.js`): Spatial-grid optimized collision detection.
- **WaveManager** (`managers/WaveManager.js`): Enemy wave definitions and progression.
- **PhaseTransitionController** (`systems/PhaseTransitionController.js`): Manages 8-12s alpha crossfade between visual phases (Earth/Atmosphere/Deep Space) with per-layer blend curves.

### Test Suite

Tests use a custom `window._testRunner` harness (zero dependencies, `console.assert`-based). Each test file calls `_testRunner.suite(name, fn)` and uses an `assert(condition, msg)` callback. Tests are loaded via plain `<script>` tags in `tests/runner.html`.

### Leaderboard Backend

`workers/leaderboard-worker.js` — Cloudflare Worker using KV for persistent storage and HMAC for score verification. The HMAC key must match between the worker secret and `Constants.js`.

### Design Docs

`design/gdd/` contains Game Design Documents in markdown. `design/ux/` contains UX specs. Review logs are in `design/gdd/reviews/`.

### PWA Notes

- Service worker (`sw.js`) caches all assets — hard-refresh (Shift+Reload) to bypass during development
- `_headers` file sets Content-Security-Policy and other security headers for Cloudflare Pages deployment
- App manifests and icons support standalone PWA mode on mobile
