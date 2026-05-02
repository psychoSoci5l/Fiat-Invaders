# Technical Preferences

<!-- Populated by /setup-engine. Updated as the user makes decisions throughout development. -->
<!-- All agents reference this file for project-specific standards and conventions. -->

## Engine & Language

- **Engine**: Vanilla JavaScript (ES6+), Canvas 2D, no framework
- **Language**: JavaScript (ES6+)
- **Rendering**: Canvas 2D (game) + DOM/CSS (UI overlays, HUD, menus)
- **Physics**: Custom AABB collision (entity-based, no physics engine)

## Input & Platform

- **Target Platforms**: Web (PWA — Progressive Web App)
- **Input Methods**: Keyboard/Mouse, Gamepad
- **Primary Input**: Keyboard (arrow keys + Z/X/C for actions)
- **Gamepad Support**: Full — standard gamepad mapping via Gamepad API
- **Touch Support**: Partial — mobile-friendly scaling, but no touch-specific controls
- **Platform Notes**: PWA-first, zero-friction access. No account, no download path. Offline-capable via service worker.

## Naming Conventions

- **Classes**: PascalCase (e.g., `GameStateMachine`, `WaveManager`)
- **Variables**: camelCase (e.g., `currentPhase`, `activeEnemies`)
- **Signals/Events**: Event bus pattern — custom event names as strings (e.g., `'score_changed'`)
- **Files**: kebab-case (e.g., `leaderboard-worker.js`, `adr-0006-leaderboard-cloudflare-worker.md`)
- **Scenes/Prefabs**: N/A — Canvas 2D rendering, no scene tree
- **Constants**: UPPER_SNAKE_CASE in `Game` namespace (e.g., `Game.MAX_ENEMIES`, `Game.TOTAL_MULT_CAP`)

## Performance Budgets

- **Target Framerate**: 60fps
- **Frame Budget**: ~16.6ms per frame
- **Draw Calls**: Single canvas draw pass + DOM overlay. No batched draw calls to track.
- **Memory Ceiling**: ~8MB canvas + ~1-2MB offscreen cache (confirmed by playtesting)
- **Entity Budget**: ~200-400 collision checks per frame (AABB)

## Testing

- **Framework**: Custom test runner (`tests/repro-*.js` pattern)
- **Minimum Coverage**: 739 unit test cases (98 suites), 46 smoke checks
- **Required Tests**: Game state machine, event bus, collision, waves, bosses, drops, perks, scoring, arcade mode, balance

## Forbidden Patterns

- No framework dependencies (no React, Vue, etc.)
- No external runtime libraries — zero third-party JS in `src/`
- No hardcoded gameplay values — all tuning in `BalanceConfig.js`
- No oscillators in audio chain (legacy GODCHAIN oscillator pattern killed in v7.20)

## Allowed Libraries / Addons

- Cloudflare Workers (leaderboard backend)
- Cloudflare KV (score storage)
- Canvas 2D API (rendering)
- Gamepad API (controller input)

## Architecture Decisions Log

<!-- Quick reference linking to full ADRs in docs/architecture/ -->
- [ADR-0001](docs/architecture/adr-0001-architecture-overview.md) — Game Architecture Overview
- [ADR-0002](docs/architecture/adr-0002-game-state-machine.md) — Game State Machine
- [ADR-0003](docs/architecture/adr-0003-event-bus.md) — Event Bus
- [ADR-0004](docs/architecture/adr-0004-audio-system.md) — Audio System
- [ADR-0005](docs/architecture/adr-0005-pwa-service-worker.md) — PWA Service Worker
- [ADR-0006](docs/architecture/adr-0006-leaderboard-cloudflare-worker.md) — Leaderboard Worker
- [ADR-0007](docs/architecture/adr-0007-v8-mode-levelscript.md) — V8 Campaign Mode
- [ADR-0008](docs/architecture/adr-0008-arcade-drop-system.md) — Arcade Drop System
- [ADR-0009](docs/architecture/adr-0009-boss-system-dip.md) — Boss System (DIP)
- [ADR-0010](docs/architecture/adr-0010-weapon-godchain-hyper.md) — Weapon/GODCHAIN/HYPER
- [ADR-0011](docs/architecture/adr-0011-collision-hitbox.md) — Collision & Hitbox
- [ADR-0012](docs/architecture/adr-0012-object-pool.md) — Object Pool
- [ADR-0013](docs/architecture/adr-0013-performance-guardrails.md) — Performance Guardrails
- [ADR-0014](docs/architecture/adr-0014-mainjs-structure-refactoring.md) — main.js Structure & Refactoring Strategy

## Engine Specialists

- **Primary**: godot-specialist (not used — Vanilla JS project)
- **Language/Code Specialist**: lead-programmer
- **Shader Specialist**: N/A (Canvas 2D, no shaders)
- **UI Specialist**: ui-programmer
- **Additional Specialists**: performance-analyst
- **Routing Notes**: This project uses Vanilla JS + Canvas 2D, not Godot. Spawn `lead-programmer` for code review, `ui-programmer` for UI files, `performance-analyst` for perf work.

### File Extension Routing

| File Extension / Type | Specialist to Spawn |
|-----------------------|---------------------|
| Game code (*.js in src/) | lead-programmer |
| Shader / material files | N/A (Canvas 2D) |
| UI / screen files (*.js in src/ui/ or src/managers/) | ui-programmer |
| Scene / prefab / level files | N/A |
| Native extension / plugin files | N/A (no plugins) |
| General architecture review | lead-programmer |
