# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Workflow

### End of Session Checklist (MANDATORY)
When completing a feature or ending a session, **always update without being asked**:

1. **Constants.js** - Bump `VERSION` string (e.g., "v2.15.3 FIAT vs CRYPTO")
2. **sw.js** - Bump `SW_VERSION` to match (e.g., '2.15.3')
3. **CHANGELOG.md** - Add new version entry with feature summary

**Version Sync**: Constants.js and sw.js versions MUST match for PWA cache updates to work correctly.

**Update only if the change requires it** (not every session):
- **ROADMAP.md** - Mark completed tasks, add new phases
- **CLAUDE.md** - New systems/patterns added
- **README.md** - Major features added (shown on GitHub homepage)

**Credits**: README.md credits line: "Created by [**psychoSocial**](https://www.psychosoci5l.com/) with **Claude**, **Antigravity**, **ChatGPT**, **Gemini**."

### Git Hygiene (MANDATORY)

Only **project files** belong in git. Personal/dev files stay local, excluded by `.gitignore`.

**ON git** (project):
- Source code (`src/`, `index.html`, `style.css`, `sw.js`)
- Assets (`icon-512.png`, `splashscreen.mp4`, `manifest.json`, `_headers`)
- Docs (`README.md`, `CLAUDE.md`, `CHANGELOG.md`, `ROADMAP.md`, `ROADMAP_V6_ARCHIVE.md`, `ROADMAP_V7_ARCHIVE.md`, `PRIVACY.md`)
- Tests (`tests/`)
- `.gitignore`

**NOT on git** (local-only, in `.gitignore`):
- Prompt files (`*.txt`, `*prompt*.md`)
- AI tool config (`.claude/`)
- Project metadata (`_ps_meta/`)
- Local dev docs (`PROJECT_SNAPSHOT.md`, `SYSTEM_REFERENCE.md`, `BALANCE_TEST.md`)
- OS artifacts (`nul`, `.DS_Store`, `Thumbs.db`)

**Rule**: Before committing, always check `git status`. If you see untracked files that are NOT project code/docs, do NOT add them. If a new file type should be excluded, update `.gitignore` first.

---

## Project Overview

**FIAT vs CRYPTO** is an HTML5 Canvas arcade shooter (Space Invaders-style) built with vanilla JavaScript using a global namespace pattern (`window.Game`). It's a PWA-ready mobile-first game with procedural audio, code-drawn graphics, and localization (EN/IT).

**Detailed reference** (read on demand, NOT at session start):
- `SYSTEM_REFERENCE.md` — Detailed system tables (enemies, waves, bosses, tuning params). Read relevant sections when needed.

## Running the Project

```bash
python -m http.server 8000    # or: npx serve .
# VS Code: Right-click index.html -> "Open with Live Server"
```

**Important**: Clear Service Worker cache during development (DevTools -> Application -> Service Workers -> Unregister) if changes don't appear.

---

## Architecture

### Namespace Pattern (No Build Step)

All modules attach to `window.Game` (alias `G`). Script load order in `index.html` matters — check `index.html` directly when needed.

### Key Globals

- `window.Game` (G) - Main namespace
- `G.Balance` - **Single source of truth for ALL tuning** (BalanceConfig.js)
- `G.Audio`, `G.Input`, `G.Events` - Singletons (AudioSystem, InputSystem, EventBus)
- `G.RunState` - Per-run state (perks, score, level, streaks, graze, etc.)
- `G.GameState` - State machine (transition table, validation, `.is()` helper)
- `G.CollisionSystem` - Collision detection loops (enemy→player, player→enemy, player→boss, bullet cancel)
- `G.Debug` (alias `window.dbg`) - Debug system
- `G.DropSystem`, `G.MemeEngine`, `G.RankSystem` - Systems
- `G.FloatingTextManager`, `G.PerkIconManager` - VFX systems (extracted from main.js v4.49)
- `G.PerkManager`, `G.MiniBossManager` - Managers (extracted from main.js v4.49)
- `G.Bullet.Pool`, `G.ParticlePool`, `G.ParticleSystem` - Pooling & particles
- `G.ColorUtils`, `G.MathUtils` - Utilities
- `G.CampaignState` - Story mode progression
- `G.ArcadeModifiers` - Arcade roguelike modifier system (definitions, pool, apply)
- `G.ModifierChoiceScreen` - DOM modal for modifier card selection (post-boss/mini-boss)
- `G._currentLang` - Current language ('EN' or 'IT')
- `window.isBearMarket` - Hard mode flag
- `window.marketCycle` - Current difficulty cycle
- `window.currentLevel` - Current level

### Game States

`G.GameState` (GameStateMachine.js): `VIDEO` -> `INTRO` -> `HANGAR` -> `STORY_SCREEN` -> `WARMUP` -> `PLAY` / `PAUSE` -> `GAMEOVER` (WARMUP = first game only, move-only phase with GO! button. INTERMISSION state only for boss defeats, waves transition seamlessly). Transition table with validation. `setGameState('X')` wrapper in main.js syncs local `gameState` variable + `G.GameState.transition()`.

`introState`: `SPLASH` (title + mode tabs) -> `SELECTION` (ship carousel + LAUNCH)

### Entity Inheritance

All game objects extend `G.Entity` (base class with x, y, vx, vy, update, draw).

---

## Systems Overview

Detailed tables, parameters, and implementation specifics → **SYSTEM_REFERENCE.md** (read on demand).

### V8 Scroller (Gradius-style) — PRIMARY MODE (v7.0+)
When `Balance.V8_MODE.ENABLED=true` (default on `main` since v7.5.0), the game runs as a vertical scroller with scripted burst spawning — **not** the WaveManager/formation system below. Level flow: 170s timeline → boss → intermission → next level.

- **LevelScript** (`src/v8/LevelScript.js`) — burst-based spawn table with absolute timestamps, patterns (DIVE/SINE/HOVER/SWOOP), lanes as 0..1 fractions, phase-based categorization (OPENING/BUILDUP/ESCALATION/PEAK/CRUSH/BOSS). `LEVELS[]` array holds L1 FED / L2 BCE / L3 BOJ scripts. `scheduleLevelEnd(delay)` triggers `LEVEL_END` action → `showV8Intermission()` → `advanceToNextV8Level()`
- **ScrollEngine** (`src/systems/ScrollEngine.js`) — camera scroll, speed multiplier, halt/resume/override API. Parallax NEAR layer. `reset()` on level advance (scrollY→0, mult→1.0)
- **CRUSH anchors** — per-level speed ramps (`LEVEL_{1,2,3}_ANCHORS`): L1 1.8×, L2 2.2×, L3 2.6× at endgame
- **Regional thematization (v7.5.0)** — each level uses a coherent currency roster: L1 USA (₽/C$/Ⓒ/$), L2 EU (₺/₣/£/€), L3 Asia (₹/₩/元/¥). Tier normalization via `TIER_TARGETS_BY_LEVEL` (array indexed by `_levelIdx`) — independent of `FIAT_TYPES` base stats
- **Inter-level HP curve (v7.12.3)** — `TIER_TARGETS_BY_LEVEL` differenziato per livello: STRONG L1=1.40 / L2=1.55 / L3=1.75 (val +10%/+20%). Prima era uniforme → difficoltà piatta inter-livello. Fallback export `TIER_TARGETS = TIER_TARGETS_BY_LEVEL[0]` per back-compat
- **V8_RAMP fire budget** (`Balance.FIRE_BUDGET.V8_RAMP`) — `HarmonicConductor` fire budget scales with `_elapsed/BOSS_AT_S`. v7.12.3: `START 0.50`, `CURVE 'lin'` (prima 0.35 quad → spike 90-120s), plus `LEVEL_MULT [1.0, 1.10, 1.25]` applicato dopo la ramp per scalare anche per livello. Only active when `V8_MODE.ENABLED`, campaign-only (skipped in Arcade)
- **Telemetry** — `dbg.v8()` reports escape rate, kills by pattern/phase/Y-bucket, level state
- **Debug helpers** — `dbg.v8FastForwardToBoss()`, `dbg.v8KillBoss()`, `dbg.v8Continue()` for rapid boss-end flow testing
- **Arcade mode legacy** — still uses WaveManager/formation system below. V8 is campaign-only at present

### Core Gameplay
- **Difficulty & Rank** — `Balance.DIFFICULTY` / `Balance.RANK`. +8%/lvl, +20%/cycle, cap 85%, Bear Market 1.3×, dynamic rank ±1
- **Weapon Evolution** — `Balance.WEAPON_EVOLUTION`. Linear 3-level system (Single→Dual→Triple MAX). Boss Evolution Core upgrades (cinematic deploy VFX, 2.8s spawn + 1.2s fly-in). HYPER adds +2 temp levels (LV4/LV5, HYPER-only). 3 specials (HOMING/PIERCE/MISSILE, **10s**, weighted 25/25/20). 2 utilities (SHIELD 5s/SPEED 8s, +40% move). Death: no weapon penalty (`DEATH_PENALTY:0`), lose special. Full spec: [design/gdd/weapon-elementals-godchain.md](design/gdd/weapon-elementals-godchain.md)
- **GODCHAIN** — `Balance.GODCHAIN`. Activates on 3rd elemental perk collected (10s timer, **10s post-expiry cooldown**). Re-trigger via any further PERK pickup (4th+) — pickups during cooldown are silently dropped. +5% move speed, red-orange ship+aura+vignette, VFX-only (no direct damage bonus). HYPERGOD (HYPER×GODCHAIN): 5× score mult, 12× total cap
- **Enemy System** — `Balance.ENEMY_BEHAVIOR`. 10 currencies, 3 tiers, 4 shapes. Fire budget: C1=25/C2=45/C3=70 bullets/sec. **Elite Variants** (`Balance.ELITE_VARIANTS`): one elite type per cycle (not a numeric cap) — C1 Armored, C2 Evader, C3 Reflector. MEDIUM+STRONG only, 10/15/20% chance. Armored = HP×2 + SCORE×2 (no speed reduction). **Enemy Behaviors** (`Balance.ENEMY_BEHAVIORS`): Flanker (C1W3+), Bomber (C2W2+), Healer (C2W3+), Charger (C2W2+). Kill-switches per feature
- **Agents of the System (v7.9)** — `Balance.ENEMY_AGENT`. Procedural pilot+vehicle enemies (no PNG). 12 per-currency species via `Game.CURRENCY_VARIANT` lookup (hat × accessory × palette). 3 regional vehicles (USA Stealth Wedge / EU Diplomatic Shuttle / ASIA Mech Quad-Drone). Full Y-flip (`ctx.scale(1,-1)`) — enemies descend head-first with thrusters on top. Tier scale 0.82/1.0/1.22. Chest mark scales by tier with STRONG gold glow. Kill-switch: `ENEMY_AGENT.ENABLED = false` → fallback to drawMinion
- **Gravity Gate (v7.9.5)** — `Balance.HOVER_GATE`. `HOVER_CHANCE 0.55` of enemies hover-stop at random Y (25-45%), flip upright (thrusters below, suspended against gravity), dwell 6s, then leave upward (`EXIT_VY -180`). `DWELL_FIRE_GRACE 1.5s` — no-fire window at DWELL start ("settling"). `Enemy._fireSuppressed` read by `HarmonicConductor` row-fire and `fireEnemy` to skip enemies in grace. Active on DIVE/SINE/SWOOP patterns only (HOVER pattern has its own dwell). Kill-switch: `HOVER_GATE.ENABLED = false`
- **Currency-Symbol Bullets (v7.9.5)** — `Balance.BULLET_SYMBOL`. Enemy bullets render as the shooter's currency glyph (€ fires €, $ fires $). `Bullet.symbol` propagated via `Enemy.buildBullet` → `HarmonicConductor` → `main.js` acquire. `drawSymbolBullet` reads from `Bullet._symbolCache` (LRU Map, `CACHE_MAX 64`) — cache misses build OffscreenCanvas (28/36/44px per S/M/L bucket) with additive glow + bold glyph. Boss/mini-boss bullets have `symbol=null` → fallback to shape-based. Kill-switch: `BULLET_SYMBOL.ENABLED = false`
- **Wave System (legacy / Arcade mode only)** — `Balance.WAVE_DEFINITIONS`. 15 waves (5x3 cycles), 16 formations. **Phase-based streaming** (`Balance.STREAMING`): each wave has 2-3 phases with own formation/count/currencies. Next phase triggers at <=35% alive (`PHASE_TRIGGER`). `MAX_CONCURRENT_ENEMIES: 22` hard cap. Per-phase escalation (+10% fire, +5% behavior). `prepareStreamingWave()`+`spawnNextPhase()` in WaveManager. Kill-switch: `STREAMING.ENABLED`. Arcade post-C3: cycles through C1-C3 definitions with formation remix
- **Boss System** — `Balance.BOSS`. FED/BCE/BOJ, 3 phases each, HP formula in config, rotation `marketCycle % 3`
- **Drop System** — `Balance.ADAPTIVE_DROPS`. Rates 3%/2.5%/1% by tier, pity 30 kills, adaptive suppression. 3 categories: SPECIAL/UTILITY/PERK. Adaptive Drop Balancer (struggle/domination detection). Guaranteed SPECIAL pre-boss (wave 4+)
- **Collision** — `CollisionSystem.js`. 4 loops, callback pattern, init via `initCollisionSystem()`
- **Bullet System** — `Balance.BULLET_CONFIG` + `Balance.BULLET_PIERCE`. Circle-based collision, missile AoE, pierce HP (bullets survive N enemy-bullet hits). Debug: `dbg.hitboxes()`
- **Proximity Kill Meter** — `Balance.PROXIMITY_KILL`. Vertical-distance kills fill DIP meter (replaces graze as HYPER source). Boss hits +0.4, phase transitions +15. `Game.addProximityMeter(gain)` API
- **Elemental Perk System** — `Upgrades.js` + `PerkManager.js`. Fixed order: Fire (splash **55%** dmg / 55px radius), Laser (**+37.5% move speed**, +1 pierce HP), Electric (chain **2 targets / 100px / 44% dmg, deterministic** — no probability roll). No stacking. Perk 3 → triggers GODCHAIN. Perk 4+ → re-triggers GODCHAIN. Death resets all. Config in `Balance.ELEMENTAL`. Drops as diamond power-ups via DropSystem (pity 100 kills). Contagion cascade depth `[1,2,2]` per perkLevel, decay 0.38. Cannon tint priority Electric>Laser>Fire. Full spec: [design/gdd/weapon-elementals-godchain.md](design/gdd/weapon-elementals-godchain.md)
- **Adaptive Power Calibration** — `Balance.ADAPTIVE_POWER`. At cycle transitions (C2+), snapshots player power (weapon level, perk stacks, special). Adjusts enemy HP (0.85–1.35×) and drop pity timer. Debug: APC section in `dbg.report()`
- **Arcade Rogue Protocol** — `Balance.ARCADE`. Roguelike Arcade mode with combo scoring, accumulating modifiers, enhanced mini-bosses. Config: `COMBO` (3s timeout, 0.05x/kill cap 5.0x), `MINI_BOSS` (lower thresholds, 10s cooldown, modifier rewards), `MODIFIERS` (3 post-boss / 2 post-mini-boss picks). Pacing: 2s intermission, +15% enemy count, -15% enemy HP. Post-C3 infinite scaling (+20%/cycle). `ArcadeModifiers.js` (15 modifiers: 5 OFFENSE/5 DEFENSE/5 WILD), `ModifierChoiceScreen.js` (DOM card selection, keyboard-accessibile: tasti 1/2/3 per selezione diretta, Enter/Space sulla card focused, Arrow Left/Right per navigare, role/tabindex/aria-label per screen reader, `--cat-color-rgb` CSS var settata per il gradient categoriale). `RunState.arcadeModifiers[]`, `RunState.arcadeBonuses{}`, `RunState.comboCount/comboTimer/comboMult`. Leaderboard: submit attivo in entrambe le modalità (Story usa mapping V8→wave=5/cycle=level per il ceiling del worker; Arcade usa wave/cycle reali)

### UI & Presentation
- **HUD & Messages** — `Balance.MESSAGE_STRIP`. 2 DOM (#message-strip, #meme-popup) + 2 canvas (SHIP_STATUS, WAVE_SWEEP)
- **Status HUD** — `MemeEngine.showStatus(text, icon, statusType, duration, countdown)`. Repurposes `#meme-popup` during PLAY for ship status: pickup feedback, active special/utility countdown, elemental perk activation, GODCHAIN timer. CSS `.status-*` classes with elemental effects (fire flicker, electric flash, laser glow, gold shimmer). Memes suppressed during PLAY (CRITICAL → message-strip)
- **Meme System** — `Balance.MEME_POPUP`. DOM popup, 3-tier priority, `queueMeme(event, text, emoji)` API. Suppressed during PLAY state (v5.25)
- **Tutorial** — 3-step DOM overlay, mode-aware (Story/Arcade), per-mode localStorage
- **What's New** — `#whatsnew-panel` DOM modal, JS-generated bilingual array (EN/IT title/items). Re-renders each open
- **Arcade Records** — Persistent best cycle/level/kills in localStorage, NEW BEST badge on gameover, displayed in intro selection
- **Game Completion** — Cinematic video (Remotion, EN/IT) + credits overlay on first campaign completion. `fiat_completion_seen` localStorage flag

### Rendering & VFX
- **Color Palette (v4.53 Cyberpunk)** — Neon Violet `#bb44ff` (UI buttons/accents), Neon Magenta `#ff2d95` (FIAT/danger), Neon Cyan `#00f0ff` (CRYPTO/info/shield), Gold `#ffaa00` (HUD score only), Neon Green `#39ff14` (boss eyes/success), Deep Space `#030308→#0a0825` (backgrounds). Enemy outlines use `_colorDark50` (tinted, not flat black)
- **Additive Glow** — `Balance.GLOW`. `'lighter'` on player elements. Kill-switch: `GLOW.ENABLED = false`. Visual rule: "glow = collect, dark = avoid"
- **Sky & Background** — `Balance.SKY`. Nebula violet→void gradients, stars from L1, firefly particles (cyan/magenta). Off-screen caching via `Balance.SKY.OFFSCREEN`
- **Render Pipeline** — Multi-pass pipeline (standard → additive), ~30% less canvas state changes
- **Responsive Formations** — `Balance.FORMATION.RESPONSIVE`. Spacing scales with screen width. Kill-switch: `RESPONSIVE: false`
- **Muzzle Flash** — `Balance.VFX.MUZZLE_FLASH`. Canvas V-flash at actual cannon positions (nose/pods/barrel per level). 3-layer diamond, elemental tinting, `ENABLED` kill-switch
- **Weapon Deploy** — `Balance.VFX.WEAPON_DEPLOY`. Mechanical slide-out animation on weapon upgrade (0.35s ease-out-back). LV1 nose barrel always visible. Geometry cache `_geom` (incl. `finExt`) shared with muzzle flash. `ENABLED` kill-switch
- **Laser Beam** — `Balance.ELEMENTAL.LASER.BEAM`. Gradius-style **75px** beam bolt per bullet when Laser perk active (suppressed if HOMING/PIERCE/MISSILE active). 3-layer rendering (core 2.5px white / mid 5px cyan / outer 10px cyan additive glow), shimmer animation, line-segment collision via `BulletSystem.lineSegmentVsCircle()`. **Each cannon fires an independent beam** (no multi-cannon consolidation). `ENABLED` kill-switch
- **Juice & VFX** — `Balance.JUICE` / `Balance.VFX`. Damage vignette, boss cinematics. Kill-switches in `JUICE.SCREEN_EFFECTS`
- **Score Pulse** — `Balance.JUICE.SCORE_PULSE_TIERS`. 5-tier HUD-reactive score (MICRO/NORMAL/BIG/MASSIVE/LEGENDARY). CSS animations with scale+shake+glow. Combo accumulator bumps tier on rapid kills. `updateScore(score, scoreGain)`. Floating text disabled via `SCREEN_EFFECTS.SCORE_FLOATING_TEXT: false`. New high score: magenta pulsing glow (`.score-new-record`)
- **Enemy Destruction** — `Balance.VFX.ENEMY_DESTROY`. Rectangular rotating fragment particles (isRect), elemental tint on 60% of shrapnel, tier-differentiated SFX (noise crunch + sub-bass + square snap). `Balance.ELEMENTAL.ENEMY_TINT` for flash/persistent tint on living enemies hit by elemental damage. Kill-switches per feature
- **Ship Flight Dynamics** — `Balance.VFX.SHIP_FLIGHT`. 5 visual-only effects with individual `ENABLED` kill-switches: Banking Tilt (smooth rotation ∝ vx, asymmetric lerp), Hover Bob (sinusoidal Y oscillation dampened by speed), Asymmetric Thrust (inner-curve flame 1.5×, outer 0.7×), Wing Vapor Trails (additive sparks from wingtips at high speed, color-reactive for HYPER/GODCHAIN), Squash & Stretch (micro scale deformation on sharp accel). `_flight` state object in Player.js (zero per-frame allocs). Afterimage captures bank angle. Hitbox unaffected
- **Title Animation** — `Balance.TITLE_ANIM`. 2s intro, skip on tap, `prefers-reduced-motion` → auto-skip

### Audio
- **Audio System** — `Balance.AUDIO`. Procedural music (MusicData.js), separate Music/SFX gain. `toggleMusic()`/`toggleSfx()`. Bear market: -1 semitone, +10% tempo. **Audio Richness (v6.7)**: 5 instrument sub-buses (bass/arp/melody/drums/pad), stereo panning (`StereoPannerNode`), convolution reverb (procedural impulse, per-instrument sends), arp LFO filter (2Hz sine → lowpass), melody per-note filter envelope, pad chorus (±8¢ detune) + tremolo (0.5Hz), drum enhancement (kick sub 50Hz, snare body 200Hz), relaxed compressor (6:1 @ -18dB). Quality-tier scaling via `G.Audio.applyQualityTier(tier)`: ULTRA/HIGH=full, MEDIUM=no reverb/LFO/tremolo, LOW=also no stereo (identical to pre-v6.7). Config: `AUDIO.REVERB/STEREO/LFO/COMPRESSOR/DRUMS`, all with individual kill-switches

### Debug
- **Debug System** — `dbg.*` console API. **Silent by default** (`ENABLED: false`, all categories off). Use `dbg.on()` to enable master + all categories, or `dbg.debugBoss()`/`dbg.debugWaves()` for specific debugging. Key commands: `dbg.balanceTest()`, `dbg.report()`, `dbg.hitboxes()`, `dbg.maxWeapon()`, `dbg.arcade()`, `dbg.arcadeHelp()`, `dbg.elites()`, `dbg.behaviors()`, `dbg.streaming()`, `dbg.waveReport()`, `dbg.toggleElites()`, `dbg.toggleBehaviors()`, `dbg.toggleStreaming()`. Full reference in SYSTEM_REFERENCE.md
- **Debug Overlay (v6.4)** — Hidden mobile debug panel. **Game Over**: triple-tap on background (3 taps in 800ms, ignores buttons) → current session. **Intro**: triple-tap on `#version-tag` → previous session from localStorage. 6 sections: Device, Performance, Game Session, Quality Judgment, Last Error (`window._lastError`), Session Log (compact `+M:SS [CAT] msg`, max 40 entries). Session log categories: STATE, WAVE, BOSS, MINIBOSS, QUALITY. `G.Debug.flushSessionLog()` persists to `fiat_debug_session_log` on game over/error/beforeunload. `G.Debug.getPreviousSessionLog()` reads previous. SEND → mailto with error+log (1800 char limit). z-index 10050. Auto-hides on RETRY/MENU/startGame. English-only, no i18n

### Input & Platform
- **Tilt Control (v6.8)** — `G.Input.tilt` state: `{ available, permitted, active, gamma, filtered, calibration, axisX }`. DeviceOrientation API (`event.gamma`), mobile-only. Separate toggle from SWIPE/JOY (opt-in). `requestTiltPermission()` for iOS 13+ (`DeviceOrientationEvent.requestPermission()`), auto-granted on Android. `calibrateTilt()` sets current angle as zero. Low-pass filter (`SMOOTHING: 0.25`) + reuses joystick deadzone/sensitivity. Autofire constant (`TILT.AUTOFIRE`), shield via tap-on-ship. Config: `Balance.PLAYER.TILT` with kill-switch. localStorage: `fiat_tilt_on` (separate from `fiat_control_mode`). **Requires HTTPS on iOS** for sensor access
- **Desktop Mouse Controls (v6.6)** — `G.Input.mouse` state: `{ active, xPct, shield }`. Hold left click = fire + move (ship follows cursor), right click = shield. Events on `window` (NOT canvas — DOM overlays steal focus). Guard: `!('ontouchstart' in window)`. Player.js reads `input.mouse?.active` for movement/fire/shield alongside keyboard/touch. Tutorial shows mouse-only text on desktop (`.desktop-only` class via `body.is-touch`)
- **Desktop Viewport (v6.6)** — `@media (hover: hover) and (pointer: fine)`: `#game-container` gets `height: 100vh; max-height: 1300px; top: 50%; transform: translate(-50%, -50%); border-radius: 20px; box-shadow`. Phone-like centered frame on desktop. Zero impact on mobile
- **Early Quality Detection (v6.6)** — `QualityManager.init()`: if `navigator.deviceMemory <= 2` or `navigator.hardwareConcurrency <= 2`, forces MEDIUM tier at boot (skips heavy intro clouds). Only when `_auto` is true. No impact on normal devices (APIs default to 8/4)
- **SkyRenderer ellipse() fallback (v6.6)** — `safeEllipse(ctx, x, y, rx, ry, rot, start, end)` helper. Uses native `ctx.ellipse()` when available, falls back to `arc()` + `scale()` for old GPU drivers

---

## Key Rules & Patterns

### Balance Config is Law
**Always modify `BalanceConfig.js`**, never hardcode values in entity files. All tuning lives in `G.Balance.*`. Check `BalanceConfig.js` directly for available config sections.

### z-index Stacking (CRITICAL)
`#game-container` creates its own CSS stacking context. All overlays above the curtain (z-index 9000) must be **DOM siblings outside `#game-container`**, not children.

| Element | z-index | Position |
|---------|---------|----------|
| `#splash-layer` | 9999 | Outside game-container |
| `#tutorial-overlay` | 9500 | Outside game-container |
| `#modifier-overlay` | 9800 | Outside game-container |
| `#curtain-overlay` | 9000 | Outside game-container |
| Modals | 1000-1100 | Outside game-container |
| `#intro-screen` | 250 | Inside game-container |
| `#touchControls` | 200 | Inside game-container |
| `#ui-layer` | 120 | Inside game-container |

### Button Design System
All buttons use composable `.btn` classes from `style.css`. Never create new button classes — compose existing ones:
- **Variants**: `.btn-primary` (neon violet outline), `.btn-secondary` (ghost), `.btn-danger` (magenta), `.btn-toggle` (compact violet outline), `.btn-icon` (44px square violet), `.btn-icon-round` (50px circle violet), `.btn-cta` (animated title violet), `.btn-pwa` (install banner violet)
- **Sizes**: `.btn-sm`, `.btn-lg`, `.btn-block` (full-width)
- **CSS vars**: `--btn-violet-border/glow/fill/hover`, `--btn-danger-top/bottom/shadow`
- **Example**: `<button class="btn btn-primary btn-block">TEXT</button>`

### Performance: ColorUtils Caching
Use `G.ColorUtils.rgba(r,g,b,a)` and `G.ColorUtils.font(w,s,f)` in all per-frame draw code instead of template literals to avoid GC pressure.

### localStorage Version Migration
IIFE at top of main.js: clears all localStorage on version mismatch (`G.VERSION` vs `fiat_app_version` key). Ensures clean state on updates.

### PWA Layout Pattern (v6.5.3 Full-Bleed)
`#game-container` is `position: fixed; top:0; bottom:0` — full-bleed canvas renders behind Dynamic Island and home indicator on iOS PWA. `resize()` reads `gameContainer.clientHeight` for canvas, sets `--safe-top`/`--safe-bottom` CSS vars from JS heuristic (PWA minimums: top 59px, bottom 34px). Children (HUD, buttons, ship) use `var(--safe-top)`/`var(--safe-bottom)` for offset. **Player uses `playableHeight = gameHeight - safeBottom`** so the ship stays above the home indicator. `G._safeBottom` exposed globally. **`--di-safe-top`**: separate CSS var for static screens (intro, gameover, manual, debug overlay) in Safari browser mode where `env(safe-area-inset-top)` returns 0. Self-deactivating heuristic: `screen.height >= 852 && !isPWA && safeTop < 10`.

### Leaderboard Anti-Spam (v5.23.8)
**Nickname dedup**: Worker keeps only the best score per nickname. Lower score submissions are ignored. **Device binding**: Client sends `fiat_device_id` (UUID in localStorage), worker stores `dev:{mode}:{hash} → nickname` in KV (30d TTL). Changing nickname removes old entry from leaderboard. Device ID included in HMAC signature (backward-compatible).

### Leaderboard Offline Queue (v5.23)
Failed score submissions are saved to `fiat_pending_score` in localStorage (only keeps highest). `flushPendingScore()` retries on app start and at each game over. i18n key `LB_QUEUED`.

### Nickname Flow (v5.23)
`showNicknamePrompt(callback, options)` — callback receives boolean (true=entered, false=skipped). Options: `{title, hideSkip}`. SKIP button in overlay. First launch: prompt once per session (`window._nickPromptShown`), skip allowed. Game over with new record + no nickname: prompt with `NICK_RECORD_TITLE`.

### OLED Deep Black Pattern (v5.29)
All overlay/panel backgrounds use pure `#000000` (OLED pixel-off). All inner containers (cards, sections, modals) also `#000000`. Only gameplay HUD elements (`#message-strip`, perk overlay backdrop) remain semi-transparent `rgba()` because they overlay the active game canvas. Never use `rgba(0,0,0,X)` for panel/card backgrounds — always `#000000`.

### UI Safe Zones
HUD: 0-45px top. Gameplay: 65px+ top. Boss targetY: 65 + safeOffset. Graze/Shield/HYPER/Joystick: bottom area (DOM elements). Ship Y: `playableHeight - RESET_Y_OFFSET` (respects safeBottom).
