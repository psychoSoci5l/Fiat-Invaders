# Control Manifest

> **Engine**: Vanilla JavaScript (ES6+) / Canvas 2D
> **Last Updated**: 2026-04-25
> **Manifest Version**: 2026-04-25
> **ADRs Covered**: ADR-0001, ADR-0002, ADR-0003, ADR-0004, ADR-0005, ADR-0006, ADR-0007, ADR-0008, ADR-0009, ADR-0010, ADR-0011, ADR-0012, ADR-0013
> **Status**: Active — regenerate with `/create-control-manifest update` when ADRs change

`Manifest Version` is the date this manifest was generated. Story files embed this date when created. `/story-readiness` compares a story's embedded version to this field to detect stories written against stale rules.

This manifest is a programmer's quick-reference extracted from all Accepted ADRs, technical preferences, and engine reference docs. For the reasoning behind each rule, see the referenced ADR.

---

## Foundation Layer Rules

*Applies to: state management, event architecture, rendering pipeline, engine initialisation*

### Required Patterns
- **GameStateMachine as singleton** (`Game.GameState`) with explicit transition map — all valid transitions listed, invalid ones blocked — source: ADR-0001
- **Read-only currentState** — systems read `currentState` to gate behaviour; never write directly (use `transition()`) — source: ADR-0001
- **State change listeners** via `onEnter(state, fn)` / `onExit(state, fn)` — systems register callbacks instead of polling — source: ADR-0001
- **Synchronous state transitions** — transitions complete in the same frame; no deferred or async state changes — source: ADR-0001
- **EventBus as singleton** (`Game.Events`) — pub/sub for decoupled communication between systems — source: ADR-0003
- **Synchronous event dispatch** — all listeners fire immediately on `emit()`; no async/await in handlers — source: ADR-0003
- **Try-catch wrapped listeners** — a single listener throw must not prevent subsequent listeners from firing — source: ADR-0003
- **Event naming convention: `domain:action`** — e.g., `player:died`, `wave:started`, `boss:defeated` — source: ADR-0003
- **Canvas 2D API** (`CanvasRenderingContext2D`) for all rendering — no WebGL, no DOM-based rendering for gameplay — source: ADR-0002
- **Fixed draw-order pipeline** — execute in order: background → entities → bullets → particles → HUD → screen shake — source: ADR-0002
- **OffscreenCanvas caching** for frequently-rendered static elements (currency-symbol bullets, procedural agent renders) — source: ADR-0002

### Forbidden Approaches
- **Never use ad-hoc boolean flags for game phase** (`isPlaying`, `isPaused` tracked per-system) — causes desync bugs on transitions — source: ADR-0001
- **Never use event-only state management** without FSM — events notify but don't enforce authoritative state — source: ADR-0001
- **Never use WebGL or DOM-based rendering for gameplay** — Canvas 2D handles the entity count at 60fps; WebGL adds unjustified complexity — source: ADR-0002
- **Never use direct method calls between systems** for event notification — creates tight coupling; use EventBus instead — source: ADR-0003

### Performance Guardrails
- **State machine**: negligible CPU — single property read per frame per system — source: ADR-0001
- **EventBus**: event dispatch O(n) where n = listeners for that event — source: ADR-0003
- **Canvas memory**: one full-screen canvas (~8MB at 1920×1080) + OffscreenCanvas caches (~1-2MB total) — source: ADR-0002

---

## Core Layer Rules

*Applies to: collision, enemy spawning, boss fights, drops, weapons, wave system, elites/behaviors*

### Required Patterns
- **Spatial-grid collision** with 120px cell size, rebuilt each frame — O(n) grid rebuild + AABB checks per cell — source: ADR-0004
- **Multi-cell range iteration** for entities spanning multiple grid cells (boss 160×140 hitbox) — source: ADR-0004
- **LevelScript as tick-based orchestrator** (not state machine) — linear timeline advancing `_elapsed` and firing script entries — source: ADR-0007
- **Four movement patterns as Enemy.update() branches** (DIVE/SINE/HOVER/SWOOP) gated by `_v8Fall` flag — source: ADR-0007
- **Gravity Gate as independent overlay** with its own `_hoverY`, `_hoverTimer`, `_fireSuppressed` state — not a movement pattern — source: ADR-0007
- **CRUSH anchors as parallel timeline** — separate `_anchorIdx` from burst script index — source: ADR-0007
- **Scroll speed LUT** with piecewise-linear interpolation, DT clamp at 0.050s — source: ADR-0007
- **isArcadeMode() single boolean gating** — V8 dormant when Arcade active, WaveManager dormant when V8 active — source: ADR-0007, ADR-0011
- **Three-layer drop flow** (pity → adaptive/struggle → APC), executed in strict sequence per kill — source: ADR-0008
- **Pity timer with cycle-scaling** — floor at 10 kills, base at 15, adjusted by APC — source: ADR-0008
- **Struggle detection** rolling window: 40s no drop + power ≤ 0.40 + kills ≥ 5 → 3× chance — source: ADR-0008
- **Domination detection** rolling window: >1.5 kills/s + power ≥ 0.60 → 0.25× chance, 2× pity — source: ADR-0008
- **Struggle wins on conflict** — system favours generosity over suppression — source: ADR-0008
- **APC recalibrates at cycle boundaries only** (C2+), never per-frame — source: ADR-0008
- **Anti-cluster guard** — minimum 6s between non-pity, non-force drops — source: ADR-0008
- **HYPER/GODCHAIN drop suppression** — no new drops while either buff is active — source: ADR-0008, ADR-0010
- **Boss as Entity extension** with phase as integer (1-3), no separate FSM — source: ADR-0009
- **Phase transitions at 66% and 20% HP** with 1.5s invulnerability window, dialogue, screen flash — source: ADR-0009
- **Attack pattern selection by rotation** through per-phase arrays per boss type — source: ADR-0009
- **DIP meter as linear interpolation** 0-100, distance-only (vertical), gain 1-7 by proximity — source: ADR-0009
- **HYPER auto-activation** when DIP reaches 100 during boss fights — source: ADR-0009, ADR-0010
- **Boss entrance sequence**: 80px/s descent, invulnerable (`isEntering` flag), completes before phase 1 — source: ADR-0009
- **Boss rotation with V8 override**: Arcade = `(cycle-1) % 3`, V8 = per-level boss type — source: ADR-0009
- **Weapon level as integer** (1-3 permanent, 4-5 HYPER-only) with BalanceConfig LEVELS lookup table — source: ADR-0010
- **`effectiveLevel = min(5, weaponLevel + (hyperActive ? 2 : 0))`** computed per-frame — source: ADR-0010
- **Fixed perk order: Fire → Laser → Electric** enforced by Upgrades.order and PerkManager gate — source: ADR-0010
- **Elemental on-kill effects as single CollisionSystem hook** (`_applyElementalOnKill()`) — source: ADR-0010
- **Contagion depth-limited cascade** (`MAX_DEPTH: [1,2,2]`, `DAMAGE_DECAY: 0.38`) — no infinite chains — source: ADR-0010
- **GODCHAIN as compound state** (no direct damage multiplier) — 10s duration, 10s cooldown — source: ADR-0010
- **HYPER as manual activation** with instant death on hit, +2 effective levels, 3× score, 0.82 time scale — source: ADR-0010
- **HYPERGOD multiplicative score**: 5× base, 12× total cap — source: ADR-0010
- **Specials/Utilities as transient buffs** (10s/8s), lost on death — source: ADR-0010
- **Combo multiplier linear per kill** (0.05×), cap at 5.0× (80 kills), 3.0s timeout, graze extends 0.5s — source: ADR-0011
- **Modifier selection via DOM overlay modal** — keyboard accessibility, recalculate-from-scratch stacking — source: ADR-0011
- **Post-C3 infinite scaling**: `effectiveCycle = ((cycle-1) % 3) + 1`, 40% formation remix, +0.20 diff/cycle — source: ADR-0011
- **8-factor score multiplier** with HYPERGOD cap at 12.0 — source: ADR-0011
- **Per-cycle elite variant assignment** at WaveManager spawn — C1=ARMORED, C2=EVADER, C3=REFLECTOR — source: ADR-0012
- **Probabilistic behavior assignment** with per-wave caps and MIN_WAVE gating — source: ADR-0012
- **Two independent fire-suppression flags** (`_fireSuppressed`, `_fireSuppressedByEntry`) with OR logic — source: ADR-0012
- **Phase-streaming trigger**: `clamp(round(count × 0.25), 3, 4)` + 3.0s min + MAX_CONCURRENT=18 gate — source: ADR-0013
- **20 formation generators** as discrete coordinate functions in 4 complexity tiers — source: ADR-0013
- **5-factor count scaling pipeline** in fixed order: bear → cycle → arcade → rank → clamp(14) — source: ADR-0013
- **Entry animation per-phase weighted-random**: SINE(3)/SWEEP(2)/SPIRAL(1)/SPLIT(2) — source: ADR-0013
- **Per-cycle bullet density via PATTERNS flat table** — GAP, MAX_BULLETS, COMPLEXITY, TELEGRAPH — source: ADR-0013

### Forbidden Approaches
- **Never use brute-force O(n*m) collision** — use spatial-grid broad phase — source: ADR-0004
- **Never use quadtree** — spatial grid is simpler and sufficient for top-down entity distribution — source: ADR-0004
- **Never run WaveManager and LevelScript simultaneously** — isArcadeMode() ensures exactly one is active — source: ADR-0007, ADR-0011
- **Never use frame-based timers** for struggle/domination — use rolling kill window — source: ADR-0008
- **Never apply APC per-frame** — cycle boundaries only, C1 excluded intentionally — source: ADR-0008
- **Never allow V8 campaign enemies to receive elites or behaviors** — they bypass WaveManager spawn — source: ADR-0012
- **Never use timer-only phase streaming** — threshold-based with clamp prevents dead-time — source: ADR-0013
- **Never raise MAX_PER_PHASE above 14** to increase density — reduce THRESHOLD_RATIO per cycle instead — source: ADR-0013
- **Never assign the same elite variant to different cycles** — CYCLE_VARIANTS[cycle] enforces exclusivity — source: ADR-0012

### Performance Guardrails
- **Collision**: ~200-400 AABB checks/frame vs ~2,200 brute-force; grid rebuild ~50μs — source: ADR-0004
- **LevelScript tick**: O(n) in fired bursts per frame (typically 0-3) — source: ADR-0007
- **Drop system**: O(1) per kill (push timestamp, prune rolling window) — source: ADR-0008
- **Boss update**: O(1) per frame + O(minions) P3 — source: ADR-0009
- **Weapon level**: O(1) per frame (lookup) — source: ADR-0010
- **Modifier recalculation**: O(m) in active modifiers (max ~20) — source: ADR-0011
- **Elite/behavior assignment**: O(1) per spawn + O(n) in behavior pool (4 items) — source: ADR-0012

---

## Feature Layer Rules

*Applies to: leaderboard, secondary systems*

### Required Patterns
- **Cloudflare Workers + KV** for leaderboard backend — serverless, zero ops — source: ADR-0006
- **HMAC-SHA256 signature verification** for score submissions — key matches between Constants.js and worker secret — source: ADR-0006
- **Leaderboard API calls intentionally NOT cached** — always fresh data via network — source: ADR-0005, ADR-0006

### Forbidden Approaches
- **Never use Firebase/Firestore** for leaderboard — overkill for top-N; Cloudflare Workers integrates natively with existing Pages deployment — source: ADR-0006
- **Never use localStorage-only** for shared leaderboard — required for cross-device comparison and community features — source: ADR-0006

---

## Presentation Layer Rules

*Applies to: rendering, audio, UI, VFX*

### Required Patterns
- **Fixed draw order** (back to front): sky → weather → title → entities → bullets → power-ups → particles → floating text → HUD → debug — source: ADR-0002
- **`globalCompositeOperation = 'lighter'`** for additive glow passes (particles, GODCHAIN aura, laser beams) — source: ADR-0002
- **OffscreenCanvas LRU cache** for currency-symbol bullets and procedural agent renders — source: ADR-0002
- **Culling by off-screen margin** per entity type (enemies 80px, bullets 20px, enemy bullets 20px, power-ups 40px) — source: ADR-0002
- **Screen shake as canvas translate** (`ctx.save()`/`restore()` wrapping the full draw) — source: ADR-0002

### Forbidden Approaches
- **Never use `shadowBlur`** — forces software rendering in some browsers — source: ADR-0002, engine-reference known-issues
- **Never use DOM elements for gameplay rendering** — performance tanks above ~50 elements — source: ADR-0002

### Performance Guardrails
- **Minimize `save()`/`restore()` depth** — each call has measurable overhead — source: engine-reference
- **Batch similar draw calls** (draw all enemies, then all bullets — not interleaved) — source: engine-reference
- **OffscreenCanvas cache hit**: ~0.01ms per draw; miss: ~0.1ms per render — source: engine-reference

---

## Infrastructure Layer Rules

*Applies to: PWA, service worker, deployment*

### Required Patterns
- **Cache-first service worker** for all static assets — source: ADR-0005
- **Version sync on bump** — update ALL three: `Constants.js VERSION`, `sw.js SW_VERSION + CACHE_NAME`, `CHANGELOG.md` — source: ADR-0005
- **SW_VERSION and CACHE_NAME match Game.VERSION** — cache invalidation is version-based — source: ADR-0005
- **manifest.json + icons** for PWA standalone mode install prompt — source: ADR-0005

### Forbidden Approaches
- **Never cache leaderboard API responses in service worker** — leaderboard data must always be fresh (network-only) — source: ADR-0005, ADR-0006

---

## Global Rules (All Layers)

### Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Namespaces | `window.Game.*` | `Game.Collision`, `Game.WaveManager` |
| Class/Module files | PascalCase | `GameStateMachine.js`, `DropSystem.js` |
| Variables | camelCase | `weaponLevel`, `currentState` |
| Constants | UPPER_SNAKE_CASE | `MAX_CONCURRENT_ENEMIES`, `GLOBAL_BULLET_CAP` |
| Private methods | Underscore prefix | `_elapsed`, `_computeGeomForLevel()` |
| Events | `domain:action` | `player:died`, `wave:started` |

### Performance Budgets

| Target | Value |
|--------|-------|
| Framerate | 60 fps on mid-range mobile |
| Enemy cap | MAX_CONCURRENT_ENEMIES: 18 (Arcade) / V8 timeline |
| Particles | Pooled, max age-based expiry |
| Memory | Minimize per-frame allocations; ObjectPool for bullets/enemies |

### Approved Libraries

- **None** — zero npm dependencies for runtime; all code hand-rolled
- **Dev-only**: `sharp` (icon generation), `wrangler` (Cloudflare deployment)

### Forbidden APIs

Canvas 2D (stable, no deprecated APIs in use):

| API | Issue | Since |
|-----|-------|-------|
| `shadowBlur` | Forces software rendering in some browsers | — |

### Forbidden Patterns

- No ES module `import`/`export` in game code — script-load order via `<script>` tags in `index.html`
- No bundlers (webpack, vite, etc.)
- No external runtime dependencies or CDN scripts
- No DOM manipulation in game loop — DOM used only for intermission screen, modifier choice modal, and non-game UI
- All code lives under `window.Game.*` namespace — no global variable leakage

### Cross-Cutting Constraints

- **Version sync discipline**: Every version bump touches `Constants.js`, `sw.js`, and `CHANGELOG.md` as a single atomic change. Missing any one breaks cache management or deployment tracking.
- **Kill-switch pattern**: All major subsystems have a boolean kill-switch in `BalanceConfig` (e.g., `ENEMY_AGENT_ENABLED`, `ADAPTIVE_DROPS_ENABLED`, `ELEMENTAL_CONTAGION_ENABLED`, `V8_MODE_ENABLED`). Feature flags for safe toggling without code deployment.
- **Zero external dependencies at runtime**: No CDN scripts, no npm packages, no third-party services in the game client. The only external dependency is the Cloudflare Workers leaderboard backend.
