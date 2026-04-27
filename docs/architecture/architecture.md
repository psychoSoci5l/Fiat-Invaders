# Architecture Document: FIAT vs CRYPTO

**Version**: v7.12.14
**Engine**: Vanilla JavaScript (ES6+) / Canvas 2D
**Last Updated**: 2026-04-25
**Technical Director Sign-Off**: 2026-04-25 — APPROVED
**Lead Programmer Feasibility**: FEASIBLE (all 13 ADRs written, 0 architectural gaps)
**GDDs Covered**: v8-scroller, enemy-agents, boss-proximity, weapon-elementals-godchain, drop-system-apc, wave-legacy-arcade, arcade-rogue-protocol
**ADRs Referenced**: 13 (ADR-0001 through ADR-0013)

---

## 1. Module Dependency Graph

Script load order in `index.html` is the explicit dependency graph. Each layer imports only layers above it.

```
layer 0:  utils/      Constants, DebugSystem, ColorUtils, MathUtils, RNG, RunState, Upgrades
layer 1:  core/       GameStateMachine, EventBus, AudioSystem, InputSystem, ObjectPool, GameplayCallbacks
layer 2:  config/     BalanceConfig (single source of truth for all tuning)
layer 3:  systems/    CollisionSystem, BulletSystem, ParticleSystem, DropSystem,
                      ScrollEngine, SpatialGrid, EffectsRenderer, SkyRenderer,
                      WeatherController, TransitionManager, TitleAnimator,
                      MessageSystem, MemeEngine, HintTracker, QualityManager,
                      HarmonicConductor, HarmonicSequences, RankSystem,
                      ArcadeModifiers, FloatingTextManager, PerkIconManager
layer 4:  entities/   Entity (base) → Player, Enemy, Boss, Bullet, PowerUp
layer 5:  managers/   WaveManager, PerkManager, MiniBossManager, CampaignState,
                      AchievementSystem, DailyMode, StatsTracker, LeaderboardClient
layer 6:  story/      StoryManager, DialogueData, DialogueUI, StoryScreen,
                      StoryScreenData, StoryBackgrounds
layer 7:  ui/         IntroScreen, DebugOverlay, ModifierChoiceScreen,
                      LessonModal, GameCompletion
layer 8:  v8/         LevelScript (V8 campaign scroller)
layer 9:  audio/      MusicData (procedural audio patterns)
layer 10: main.js     Entry point, game loop, wiring, HUD rendering
```

**Rule**: A module at layer N may reference modules at layer <= N only. Circular references are prohibited.

---

## 2. Namespace Pattern

All code lives under `window.Game.*`. No ES modules, no imports.

| Namespace | Source | Purpose |
|-----------|--------|---------|
| `Game.Constants` | `utils/Constants.js` | Version, balance constants, DOM IDs |
| `Game.VERSION` | `utils/Constants.js` | Semver string |
| `Game.Debug` | `utils/DebugSystem.js` | Session logging, debug overlay |
| `Game.ColorUtils` | `utils/ColorUtils.js` | Color manipulation, font helpers |
| `Game.MathUtils` | `utils/MathUtils.js` | Clamp, lerp, vector math |
| `Game.RNG` | `utils/RNG.js` | Seeded random number generation |
| `Game.RunState` | `utils/RunState.js` | Per-run mutable state (score, lives, combo) |
| `Game.Upgrades` | `utils/Upgrades.js` | Persistent upgrade data |
| `Game.GameState` | `core/GameStateMachine.js` | State machine singleton |
| `Game.Events` | `core/EventBus.js` | Pub/sub event bus singleton |
| `Game.Audio` | `core/AudioSystem.js` | Web Audio API wrapper |
| `Game.Input` | `core/InputSystem.js` | Keyboard/gamepad input |
| `Game.ObjectPool` | `core/ObjectPool.js` | Object pooling for bullets/particles |
| `Game.Balance` | `config/BalanceConfig.js` | All tuning constants |
| `Game.Collision` | `systems/CollisionSystem.js` | Spatial-grid collision detection |
| `Game.SpatialGrid` | `systems/SpatialGrid.js` | Grid binning data structure |
| `Game.BulletSystem` | `systems/BulletSystem.js` | Enemy bullet patterns |
| `Game.BulletPatterns` | `systems/BulletPatterns.js` | Pattern definitions |
| `Game.ParticleSystem` | `systems/ParticleSystem.js` | Particle VFX |
| `Game.DropSystem` | `systems/DropSystem.js` | Power-up drop logic |
| `Game.ScrollEngine` | `systems/ScrollEngine.js` | V8 stage scrolling |
| `Game.EffectsRenderer` | `systems/EffectsRenderer.js` | Screen shake, flash, overlays |
| `Game.SkyRenderer` | `systems/SkyRenderer.js` | Background sky rendering |
| `Game.WeatherController` | `systems/WeatherController.js` | Weather VFX |
| `Game.TransitionManager` | `systems/TransitionManager.js` | Scene transitions |
| `Game.TitleAnimator` | `systems/TitleAnimator.js` | Title screen particles |
| `Game.MessageSystem` | `systems/MessageSystem.js` | Typed message overlays |
| `Game.MemeEngine` | `systems/MemeEngine.js` | Meme/dialogue VFX |
| `Game.HintTracker` | `systems/HintTracker.js` | Contextual hint system |
| `Game.QualityManager` | `systems/QualityManager.js` | Quality-of-life settings |
| `Game.HarmonicConductor` | `systems/HarmonicConductor.js` | Music-synced enemy actions |
| `Game.HarmonicSequences` | `systems/HarmonicSequences.js` | Sequence definitions |
| `Game.RankSystem` | `systems/RankSystem.js` | Dynamic difficulty rank |
| `Game.ArcadeModifiers` | `systems/ArcadeModifiers.js` | Arcade mode modifiers |
| `Game.FloatingTextManager` | `systems/FloatingTextManager.js` | Floating damage numbers |
| `Game.PerkIconManager` | `systems/PerkIconManager.js` | Perk icon rendering |
| `Game.Player` | `entities/Player.js` | Player entity constructor |
| `Game.Enemy` | `entities/Enemy.js` | Enemy entity constructor |
| `Game.Boss` | `entities/Boss.js` | Boss entity constructor |
| `Game.Bullet` | `entities/Bullet.js` | Bullet entity constructor |
| `Game.PowerUp` | `entities/PowerUp.js` | Power-up entity constructor |
| `Game.WaveManager` | `managers/WaveManager.js` | Wave spawning and progression |
| `Game.PerkManager` | `managers/PerkManager.js` | Perk choice modal and state |
| `Game.MiniBossManager` | `managers/MiniBossManager.js` | Mini-boss lifecycle |
| `Game.CampaignState` | `managers/CampaignState.js` | Campaign progression state |
| `Game.AchievementSystem` | `managers/AchievementSystem.js` | Achievement tracking |
| `Game.DailyMode` | `managers/DailyMode.js` | Daily challenge mode |
| `Game.StatsTracker` | `managers/StatsTracker.js` | Per-run statistics |
| `Game.LeaderboardClient` | `managers/LeaderboardClient.js` | Leaderboard API client |
| `Game.StoryManager` | `story/StoryManager.js` | Story progression |
| `Game.StoryScreen` | `story/StoryScreen.js` | Full-screen narrative display |
| `Game.DialogueUI` | `story/DialogueUI.js` | In-game dialogue bubbles |
| `Game.IntroScreen` | `ui/IntroScreen.js` | Title/menu screen |
| `Game.ModifierChoiceScreen` | `ui/ModifierChoiceScreen.js` | Arcade modifier selection |
| `Game.DebugOverlay` | `ui/DebugOverlay.js` | Debug info overlay |
| `Game.LevelScript` | `v8/LevelScript.js` | V8 campaign scripted events |
| `Game.MusicData` | `audio/MusicData.js` | Procedural music patterns |

---

## 3. State Management

### 3.1 GameStateMachine (ADR-0001)

Central state machine with a strict transition map. Invalid transitions are **blocked** (not warned).

```
States:    VIDEO → INTRO → HANGAR → PLAY → ...
                                    → WARMUP → PLAY
                                              → PAUSE
                   → STORY_SCREEN → PLAY
                                  → INTERMISSION
                   → SETTINGS
Transitions:
  VIDEO            → INTRO
  INTRO            → HANGAR | SETTINGS | WARMUP | STORY_SCREEN
  HANGAR           → PLAY | WARMUP | INTRO | STORY_SCREEN
  STORY_SCREEN     → PLAY | WARMUP | INTERMISSION | INTRO | CAMPAIGN_VICTORY
  WARMUP           → PLAY | PAUSE | INTRO
  PLAY             → PAUSE | INTERMISSION | GAMEOVER | STORY_SCREEN | CAMPAIGN_VICTORY
  PAUSE            → PLAY | WARMUP | INTERMISSION | INTRO
  INTERMISSION     → PLAY | STORY_SCREEN | PAUSE
  GAMEOVER         → INTRO
  CAMPAIGN_VICTORY → INTRO
  SETTINGS         → INTRO
```

**Key design decisions:**
- Singleton: `Game.GameState`
- Change listeners via `onChange(callback)` — used by `main.js` to keep the local `gameState` alias in sync
- `forceSet(state)` available for init/reset only (skips validation)

### 3.2 RunState (per-run mutable state)

`Game.RunState` holds all ephemeral per-run data: score, lives, combo count, graze meter, kill counter, current level, active modifiers, proximity meter (DIP), and boss tracking. Reset at game start.

### 3.3 CampaignState (persistent progression)

`Game.CampaignState` manages campaign-level persistence (unlocked levels, cleared tiers) stored in localStorage. Arcade mode records are stored separately under `fiat_arcade_records`.

---

## 4. Event System (ADR-0003)

`Game.Events` is a pub/sub event bus singleton. Events are string-keyed with named arguments.

**Published events and subscribers:**

| Event | Publisher | Subscribers |
|-------|-----------|-------------|
| `entity:died` | CollisionSystem | DropSystem, ArcadeModifiers (combo), StatsTracker, AchievementSystem, WaveManager, PerkManager |
| `boss:defeated` | Boss entity | DropSystem, CampaignState, AudioSystem, WaveManager, StoryManager |
| `player:died` | CollisionSystem | DropSystem, GameStateMachine, AudioSystem, StatsTracker |
| `player:damaged` | CollisionSystem | EffectsRenderer (screen flash), AudioSystem, QualityManager |
| `weapon:evolved` | PerkManager | AudioSystem, EffectsRenderer, ParticleSystem |
| `perk:selected` | PerkManager | Player (weapon config), AudioSystem |
| `wave:started` | WaveManager | ArcadeModifiers, StatsTracker |
| `phase:transition` | WaveManager | ArcadeModifiers |
| `score:changed` | Combat systems | UI updates, StatsTracker, AchievementSystem |

**Key design decisions:**
- Single bus, no priority ordering (subscriber order is registration order)
- No async/await — all handlers are synchronous
- Used for decoupling game systems from each other (DropSystem doesn't call WaveManager directly)

---

## 5. Rendering Pipeline (ADR-0002)

### 5.1 Draw Order (back to front)

```
1.  Clear canvas (black fill for VIDEO state)
2.  StoryScreen (full-screen, if active → early return)
3.  Screen shake transform (EffectsRenderer.applyShakeTransform)
4.  SkyRenderer — background parallax layers
5.  WeatherController — rain, fog, etc.
6.  TitleAnimator — title screen particles (INTRO state only)
7.  Impact flash overlay
8.  HYPER mode golden overlay (if active)
9.  Player entity
10. Enemy glow pass (additive composite, batched)
11. Enemy bodies (with off-screen culling, 80px margin)
12. Boss entity
13. Mini-boss entity
14. Bullet glow pass (additive composite, batched)
15. Bullet bodies (with off-screen culling)
16. Energy Link beams (between LV2 paired bullets)
17. Screen dimming (for heavy bullet density)
18. HarmonicConductor telegraphs
19. Enemy bullets (with off-screen culling, 20px margin)
20. Danger zones (bomber AoE indicators)
21. Power-ups (with off-screen culling)
22. Particles
23. Evolution item (GODCHAIN core)
24. Floating texts (damage numbers, notifications)
25. Perk icons
26. Typed messages (GAME_INFO, DANGER, VICTORY)
27. Arcade combo HUD
28. Boss warning overlay / start countdown
29. Debug overlay (if enabled)
30. Perk pause overlay (if perk choice active)
```

### 5.2 Compositing Modes

- Normal blending for all opaque elements
- `globalCompositeOperation = 'lighter'` for glow passes (additive blending)
- `ctx.globalAlpha` modulation for screen dimming and danger zones

### 5.3 Offscreen Canvas

- Currency-symbol bullets: rendered to OffscreenCanvas and cached via LRU (`_bulletSymbolCache`)
- Procedural agent renders: 3 body regions × 12 currency types, cached on first render
- Font glyphs: sized via `ColorUtils.font()` which maps to `G.Balance.FONT` sizing

### 5.4 Culling Strategy

| Entity Type | Culling Rule |
|-------------|-------------|
| Enemies | Skip draw if `x < -80 \|\| x > gameWidth + 80 \|\| y < -80 \|\| y > gameHeight + 80` |
| Bullets | Skip draw if beyond margin (20px default, 130px for elemental lasers) |
| Enemy bullets | Skip draw if `x < -20 \|\| x > gameWidth + 20 \|\| y < -20 \|\| y > gameHeight + 20` |
| Power-ups | Skip draw if `x < -40 \|\| x > gameWidth + 40 \|\| y < -40 \|\| y > gameHeight + 40` |
| V8 enemies | Off-edge culling at `y > gameHeight + 120` |

---

## 6. Game Loop (main.js)

```
loop(timestamp):
  1. Calculate dt = (timestamp - lastTime) / 1000, clamped to 0.1s max
  2. Apply hit-stop (if active, dt *= 0.1)
  3. update(dt) — all game systems
  4. draw() — all rendering
  5. requestAnimationFrame(loop)
```

### Update order (within `update(dt)`):

```
1.  TransitionManager
2.  InputSystem
3.  TitleAnimator (INTRO state)
4.  StoryScreen (STORY_SCREEN state)
5.  Player update
6.  Enemies update
7.  Boss update
8.  MiniBossManager update
9.  Bullets update
10. Enemy bullets update
11. Power-ups update
12. CollisionSystem pass
13. BulletSystem update (enemy bullet spawning)
14. WaveManager update
15. ScrollEngine update (V8 only)
16. DropSystem update
17. EffectsRenderer update
18. ParticleSystem update
19. FloatingTextManager update
20. PerkIconManager update
21. HarmonicConductor update
22. WeatherController update
23. AudioSystem update (music sync)
24. ArcadeModifiers update (if arcade mode)
25. UI updates (HUD, countdown, messages, quality overlay, debug)
```

---

## 7. Collision System (ADR-0004)

Spatial-grid broad-phase filtering.

- Grid cell size: configurable via `Game.Balance.COLLISION.CELL_SIZE`
- Entities binned into cells each frame by position
- Broad phase: only check pairs sharing a grid cell
- Narrow phase: AABB or distance-based per entity pair

**Collision matrix:**

| | Player | Bullets | Enemies | Enemy Bullets | PowerUps | Boss |
|---|---|---|---|---|---|---|
| Player | — | — | contact damage | player hit | collect | contact damage |
| Bullets | — | — | enemy hit | bullet vs bullet (reflect) | — | boss hit |
| Enemies | — | — | friendly fire | — | — | — |

---

## 8. Audio Pipeline

- Web Audio API (`AudioContext`)
- Procedural music via `MusicData.js` (not pre-recorded assets)
- Sound effects via short AudioBuffer sources
- Music synchronization: `HarmonicConductor` reads audio clock for beat-synced enemy actions
- Volume controls: separate SFX and music gain nodes, persisted to localStorage

---

## 9. Persistence

| Data | Mechanism | Key |
|------|-----------|-----|
| Campaign progress | localStorage | `fiat_campaign_state` |
| High scores | localStorage | `fiat_highscore_story`, `fiat_highscore_arcade` |
| Arcade records | localStorage | `fiat_arcade_records` |
| Settings | localStorage | `fiat_settings_*` |
| Achievements | localStorage | `fiat_achievements` |
| Leaderboard | Cloudflare KV (remote) | HMAC-signed scores via LeaderboardClient |
| Session logs | localStorage | `fiat_session_log` (DebugSystem) |

---

## 10. Service Worker / PWA (ADR-0005)

- `sw.js` — cache-first for all static assets
- `SW_VERSION` and `CACHE_NAME` versioned in sync with `Game.VERSION`
- Manifest: `manifest.json` with standalone display for PWA mode
- Offline-capable after initial load
- `beforeinstallprompt` event captured for Android/Chrome install banner

---

## 11. Leaderboard (ADR-0006)

- Cloudflare Worker at `workers/leaderboard-worker.js`
- KV store for persistent score data
- HMAC-SHA256 signature verification (key must match between `Constants.js` and worker secret)
- Submissions include real wave/cycle values for arcade mode

---

## 12. Architecture Layers (system map)

```
FOUNDATION LAYER
  ├── GameStateMachine     — state transitions
  ├── EventBus             — pub/sub communication
  ├── InputSystem          — keyboard/gamepad
  ├── AudioSystem          — Web Audio API
  └── ObjectPool           — entity recycling

CORE LAYER
  ├── CollisionSystem      — spatial-grid collision
  ├── BulletSystem         — enemy bullet patterns
  ├── ParticleSystem       — VFX particles
  ├── ScrollEngine         — V8 stage scrolling
  ├── DropSystem           — power-up drops
  ├── WaveManager          — enemy wave spawning
  ├── Player / Enemy / Boss — entity classes
  └── BalanceConfig        — all tuning constants

FEATURE LAYER
  ├── ArcadeModifiers      — arcade mode modifier system
  ├── PerkManager          — perk choice and evolution
  ├── MiniBossManager      — mini-boss lifecycle
  ├── HarmonicConductor    — music-synced actions
  ├── RankSystem           — dynamic difficulty
  ├── CampaignState        — campaign progression
  ├── DailyMode            — daily challenge
  └── AchievementSystem    — achievement tracking

PRESENTATION LAYER
  ├── EffectsRenderer      — screen shake, flash, hyper overlay
  ├── SkyRenderer          — background sky parallax
  ├── WeatherController    — rain, fog effects
  ├── TransitionManager    — scene transitions
  ├── TitleAnimator        — title screen
  ├── StoryScreen          — narrative display
  ├── DialogueUI           — in-game dialogue
  ├── IntroScreen          — main menu
  ├── ModifierChoiceScreen — arcade card modal
  └── DebugOverlay         — debug HUD

INFRASTRUCTURE LAYER
  ├── Service Worker       — PWA caching
  └── Leaderboard Worker   — Cloudflare backend
```

---

## 13. Game Modes

### V8 Campaign (story mode)
- Scripted scroller with predefined wave timestamps
- Managed by `LevelScript.js` + `ScrollEngine.js`
- `WaveManager` is dormant — `isArcadeMode()` returns false
- Boss encounters at fixed timestamps (170s)
- Progression through CampaignState

### Arcade Mode
- Procedural waves via `WaveManager` (15 waves, 5×3 cycles)
- `isArcadeMode()` returns true — V8 scroll system is dormant
- Modifier cards via `ModifierChoiceScreen` after each cycle
- Combo system with graze extension
- Post-C3 infinite scaling with formation remix and difficulty ramp
- Persistent records with localStorage, leaderboard submission

---

## 14. Open Questions / Known Gaps

These are implemented in code but lack formal ADR documentation:

| Area | Gap | Priority | Status |
|------|-----|----------|--------|
| V8 Scroller | Burst spawn, movement patterns, Gravity Gate, CRUSH, scroll LUT | HIGH | ✅ Covered by ADR-0007 |
| Drop System | Pity timer, adaptive balancing, struggle/domination, APC formulas | HIGH | ✅ Covered by ADR-0008 |
| Boss System | 3-boss rotation, HP formula, 3-phase fights, DIP meter | HIGH | ✅ Covered by ADR-0009 |
| Weapon Evolution | 3-tier gating, elemental on-kill effects, GODCHAIN fusion, HYPER | MEDIUM | ✅ Covered by ADR-0010 |
| Enemy Elites | ARMORED/EVADER/REFLECTOR variants, behavior FSM | MEDIUM | ✅ Covered by ADR-0012 |
| Wave System | Formation generators, entry animations, density scaling | LOW | ❌ Gap |

See `docs/architecture/traceability-index.md` for the full matrix and `docs/architecture/tr-registry.yaml` for requirement IDs.

---

## 15. ADR Index

| ADR | Title | Status | Layer |
|-----|-------|--------|-------|
| ADR-0001 | GameStateMachine — Central State Management | Accepted | Foundation |
| ADR-0002 | Canvas 2D Rendering Pipeline | Accepted | Foundation |
| ADR-0003 | EventBus — Decoupled Pub/Sub Communication | Accepted | Foundation |
| ADR-0004 | Spatial-Grid Collision Detection | Accepted | Core |
| ADR-0005 | PWA + Service Worker Architecture | Accepted | Infrastructure |
| ADR-0006 | Cloudflare Workers Leaderboard Backend | Accepted | Infrastructure |
| ADR-0007 | V8 Scroller LevelScript Architecture | Accepted | Core |
| ADR-0008 | Drop System + Adaptive Power Calibration | Accepted | Core |
| ADR-0009 | Boss System + Proximity Kill (DIP) Meter | Accepted | Core |
| ADR-0010 | Weapon Evolution + Elementals + GODCHAIN | Accepted | Core |
| ADR-0011 | Arcade Rogue Protocol | Accepted | Core |
| ADR-0012 | Enemy Elites + Behaviors + Fire Suppression | Accepted | Core |
| ADR-0013 | Wave System — Streaming, Formations, Arcade Scaling | Accepted | Core |

**Dependency order:** ADR-0001 → ADR-0002, ADR-0003, ADR-0004, ADR-0007, ADR-0008, ADR-0012, ADR-0013 → ADR-0006 (depends on ADR-0003)
