# Changelog

## v4.38.0 - 2026-02-10
### Bullet Pierce + Proximity Kill Meter ("Buy the Dip")

- **Bullet Pierce**: Player bullets now have `pierceHP` — they survive multiple enemy-bullet collisions instead of being destroyed on first contact. Base HP=1 (passes through 1 enemy bullet), +1 per POWER modifier level, +1 for HODL stance, missiles get 3 HP. Solves the late-game bullet wall problem
- **Proximity Kill Meter** (replaces Graze as meter source): Killing enemies close to the player fills the DIP meter. Uses vertical distance — closer kills give more meter (up to 7 at ≤150px, minimum 1 at ≤450px). Boss hits give +0.4, boss phase transitions +15. HYPER auto-activates at 100
- **Graze simplified**: Graze (near-miss) still gives score/audio/sparks but no longer fills meter or grants perks
- **HYPER clean countdown**: Once activated, HYPER counts down from 5s to 0 without extensions. Timer freezes during non-combat states (boss warning, enemy entrance). Graze no longer resets meter decay timer
- **Boss meter fill**: Boss hits give small meter gain (+0.4 per hit), boss phase transitions give +15. Exposed `Game.addProximityMeter()` API for Boss.js
- **Game loop HYPER fallback**: Auto-activation check runs every frame as fallback, catching meter reaching threshold between kills
- **Prologue on first play**: Fixed story screen not showing on first launch — added INTRO→STORY_SCREEN state transition
- **Tutorial fade-out**: Smooth 0.2s opacity transition instead of instant disappear (eliminates visual glitch)
- **Joystick resized**: 120px→75px, repositioned to bottom: 5px to reduce overlap with meter bar
- **UI**: Meter label "GRAZE"→"DIP", removed graze count display, `restoreGameUI()` helper for post-story HUD restore
- **Files**: BalanceConfig.js, Bullet.js, Player.js, CollisionSystem.js, main.js, Boss.js, index.html, style.css, InputSystem.js, GameStateMachine.js

---

## v4.37.0 - 2026-02-10
### Difficulty Rebalance + Unified Tutorial Level + UI Polish

- **Unified tutorial level**: Replaced 3-step tutorial + separate warmup with a single tutorial overlay shown during WARMUP state. Sky and ship visible underneath semi-transparent overlay. Shows controls (PC/mobile-specific), animated swipe zone (mobile), objective, survival tips, and a GO! button. Story dialogue appears only after pressing GO
- **Reduced Cycle 1 enemy counts**: All 5 waves reduced by 3-4 enemies per horde (e.g. Wave 1: 15→12, Wave 2: 18→14). `CYCLE_COUNT_MULT[0]` reduced from 1.2 to 1.0 (no bonus enemies in tutorial cycle)
- **Flatter formations**: `MAX_Y_RATIO` reduced from 0.65 to 0.55 — enemies don't descend past 55% of screen height, giving players more breathing room
- **Slower enemy fire**: Cycle 1 fire budget reduced from 20→12 bullets/sec. Tier 1 cooldowns 3.0-3.5→4.5s min, 4.2-5.0→6.5s max. Tier 2 cooldowns increased ~30%
- **Wave grace period**: 2.5 seconds of silence at the start of each wave — no enemy fire while formations settle
- **Satoshi's Sacrifice disabled**: `SACRIFICE.ENABLED = false` — mechanic confused new players. All code remains but never activates
- **Larger pause button**: 50×26px → 72×40px with 8px border-radius, meets Apple 44pt touch target guideline
- **Localization**: Added TUT_TITLE, TUT_CONTROLS_UNIFIED, TUT_SWIPE_HERE, TUT_OBJECTIVE_UNIFIED, TUT_SURVIVAL_UNIFIED strings (EN/IT). Removed WARMUP_HINT
- **Files**: Constants.js, main.js, style.css, index.html

---

## v4.36.0 - 2026-02-09
### Memory Footprint Audit — Long Session Stability (10 fixes)

- **RankSystem per-frame GC fix (HIGH)**: Replaced `.filter()` on `_killTimes`/`_grazeTimes` arrays (called every frame, 120 new array allocations/sec) with in-place `_pruneOld()` write-pointer compaction. Changed `= []` to `.length = 0` in `onDeath()` to reuse existing arrays
- **AudioSystem noise buffer cache (MEDIUM)**: `createNoiseOsc()` created a new AudioBuffer on every call (~10-20 times/sec during music). Added `_noiseBufferCache` keyed by millisecond-rounded duration — eliminates ~600+ buffer allocations/minute during music playback
- **Bullet pool leak on restart (MEDIUM)**: `startGame()` reset `bullets`/`enemyBullets` arrays without releasing pooled bullets, causing ObjectPool growth on every game restart. Added `Bullet.Pool.release()` calls before array clear
- **Intro ship rAF loop leak (HIGH)**: `animateIntroShip()` started a new `requestAnimationFrame` loop on every backToIntro→initIntroShip call without cancelling the previous one. After N restart cycles, N animation loops ran simultaneously. Fixed with `cancelAnimationFrame` guard + stored rAF ID
- **Bullet pool leak in backToIntro (MEDIUM)**: Added `Bullet.Pool.release()` in `backToIntro()` in addition to `startGame()`, preventing pool objects from being orphaned between menu return and next game start
- **SkyRenderer gradient caching (LOW)**: Horizon glow and bear market overlay created new `createLinearGradient`/`createRadialGradient` every frame. Cached by key (level+dimensions), invalidated on state change. Bear market pulse uses `globalAlpha` modulation with fixed-alpha cached gradient
- **HarmonicConductor PANIC gradient cache (LOW)**: PANIC vignette `createRadialGradient` cached by `gameWidth-gameHeight` key, recreated only on resize
- **Music schedule() burst catch-up guard (MEDIUM)**: After tab loses focus, `ctx.currentTime` advances but `schedule()` doesn't run. On tab refocus, the while loop tried to catch up all missed beats at once, creating potentially hundreds of audio nodes simultaneously. Added `noteTime` clamp (max 8 beats lag) to skip ahead instead of catching up
- **SkyRenderer lightning shadowBlur removal (LOW)**: Leftover `shadowBlur = 15` from pre-v4.11 cleanup removed from `drawLightning()` — eliminates per-frame GPU shadow computation
- **Zero gameplay changes**: All optimizations are internal. Rendering, audio, and collision behavior identical pre/post
- **Files**: RankSystem.js, AudioSystem.js, main.js, SkyRenderer.js, HarmonicConductor.js, Constants.js + sw.js (version bump)

---

## v4.35.0 - 2026-02-09
### Animated Title Screen

- **Title animation sequence**: 2-second choreographed intro on first load. "Currencies" subtitle fades in, "FIAT" bounces from top with gold particles, "vs" rotates in, "CRYPTO" bounces from bottom with cyan particles. Mode selector and controls fade in at end
- **TitleAnimator.js (NEW)**: Self-contained state machine (IDLE/ANIMATING/LOOPING/HIDDEN) with canvas particle system (max 40, additive blending). DOM element positions mapped to canvas coordinates via `getBoundingClientRect()`
- **CSS keyframes**: `titleBounceInTop`, `titleFadeRotate`, `titleBounceInBottom` with cubic-bezier overshoot. `.anim-active` class hides title spans during sequence, `.anim-hidden`/`.anim-show` for controls fade
- **2 new SFX**: `titleBoom` (sub bass + metallic ring + noise burst) for FIAT slam, `titleZap` (electric sweep + sub punch + noise crackle) for CRYPTO reveal
- **Subtitle "Currencies"/"Valute"**: Clarifies that "FIAT" = traditional currencies. Localized EN/IT
- **Skip on tap**: Tapping during animation skips to loop state with all elements visible
- **No replay on return**: Coming back from Game Over shows loop state directly (no animation replay)
- **Kill switch**: `Balance.TITLE_ANIM.ENABLED = false` skips animation entirely
- **prefers-reduced-motion**: Respects accessibility setting, shows everything immediately
- **Config**: `Balance.TITLE_ANIM` with timeline, particle, and SFX volume settings
- **Files**: TitleAnimator.js (NEW), style.css (~80 lines), index.html (subtitle + script), BalanceConfig.js (TITLE_ANIM config), AudioSystem.js (2 SFX), Constants.js (localization + version), main.js (7 integration points), sw.js (version)

---

## v4.34.0 - 2026-02-09
### Audio Overhaul — Music System v2 & Separate Music/SFX Controls

- **Separate Music/SFX gain nodes**: Audio routing split into `musicGain` and `sfxGain`, both feeding `masterGain → compressor → destination`. Music and sound effects can be independently controlled
- **Dual toggle buttons**: Single mute button replaced with 2 buttons in intro screen and pause screen — music (note icon) and SFX (speaker icon). Each toggles independently with visual muted state (dark gray + red border)
- **localStorage persistence**: `fiat_music_muted` and `fiat_sfx_muted` keys persist toggle state across sessions. Read on init, applied to gain nodes
- **MusicData.js (NEW)**: Data-driven music system with 5 unique level themes + 3 boss phases + bear market modifier. Each song has named sections (A/B/FILL) with 16-beat arrays for bass, melody, arp, drums, and sustained pad chords
- **Level themes**: L1 "Digital Dawn" (Cm, 140bpm synth-pop), L2 "Deep Liquidity" (Dm, 130bpm funk), L3 "Dark Protocol" (Am, 150bpm breakbeat), L4 "Crypto Winter" (Ebm, 120bpm industrial), L5 "Final Hash" (Gm, 160bpm epic)
- **Boss theme**: "Central Authority" — Phase 1 menacing drone (130bpm), Phase 2 escalation with melody (145bpm), Phase 3 chaos with all instruments (165bpm)
- **Bear market audio modifier**: -1 semitone pitch shift, +10% tempo, darker tone via frequency multiplier
- **Data-driven schedule()**: Refactored from hardcoded generation to reading MusicData sections beat-by-beat. Section structure (A→A→B→A→FILL etc.) creates musical variation and progression
- **Intensity-gated layers**: Bass always plays, arp at intensity 30+, pad at 40+, drums at 50+, melody at 60+ — music builds as gameplay intensifies
- **HarmonicConductor sync preserved**: `schedule()` always advances timing and sets `this.tempo` even when music is muted, maintaining enemy fire rhythm sync
- **Config**: `Balance.AUDIO` section with `MUSIC_VOLUME`, `SFX_VOLUME`, master `ENABLED` toggle, per-channel kill-switches
- **Files**: MusicData.js (NEW), AudioSystem.js (rewrite: gain routing, schedule v2, data-driven methods), BalanceConfig.js (AUDIO config), index.html (dual toggles, load order), style.css (muted styles), main.js (toggle handlers, localStorage), Constants.js + sw.js (version bump)

---

## v4.33.0 - 2026-02-09
### Juice Cleanup — Fluid Gameplay, Cinematic Boss Events

- **Hit Stop disabled during gameplay**: All gameplay hit stops zeroed (ENEMY_KILL, STREAK 10/25/50, CLOSE_GRAZE, PLAYER_HIT). Eliminates 120-500ms freezes perceived as lag. Boss events preserved (BOSS_PHASE 300ms, BOSS_DEFEAT 500ms)
- **Screen Flash disabled during gameplay**: PLAYER_HIT_FLASH, STREAK_FLASH, GRAZE_FLASH, SCORE_PULSE all set to `false`. Boss flashes preserved (BOSS_DEFEAT_FLASH, BOSS_PHASE_FLASH, HYPER_ACTIVATE_FLASH)
- **Screen Shake refined**: Removed hardcoded `shake = 40` on enemy contact. Shake now only triggers on player death (non-gameplay moment)
- **Master kill-switches**: 3 new toggles in `Balance.JUICE.SCREEN_EFFECTS`: `SCREEN_SHAKE`, `SCREEN_FLASH`, `HIT_STOP` — gate all effects at entry point with `=== false` check (safe: `undefined` = enabled)
- **Damage Vignette (NEW)**: Non-intrusive hit feedback — 4 red border rectangles (12px thickness), 0.3s ease-out fade. Triggers on bullet hit and enemy contact. Zero GPU overhead (no gradients, no fullscreen fill)
- **Preserved feedback stack**: Player blink (invuln timer), device vibration (`[50,50,50]`), hit sound (`hitPlayer`), damage vignette — clear feedback without interrupting gameplay flow
- **All effect code preserved**: Original flash/shake/hit-stop implementation intact, disabled via config. Can be re-enabled per-effect by changing config values
- **Files**: BalanceConfig.js (SCREEN_EFFECTS toggles, HIT_STOP values), EffectsRenderer.js (master gates, damage vignette), main.js (damage vignette calls, removed hardcoded shake), Constants.js + sw.js (version bump)

---

## v4.32.0 - 2026-02-09
### Responsive Formation System — Mobile Layout Fix

- **Bug fix: `G._gameHeight` exposed**: `G._gameHeight` was never set in `resize()` despite being used by WaveManager (fallback 700) and HYPER particles (fallback 900). Now set alongside `G._gameWidth`
- **Responsive formation spacing**: Formation spacing scales with `gameWidth / BASE_WIDTH` ratio. On iPhone 14 Pro Max (430px), spacing shrinks from 78px to ~56px (clamped to minimum 62px), fitting more enemies per row and reducing formation depth
- **Responsive startY**: Formation Y origin scales with `gameHeight / 800` ratio when `START_Y_RESPONSIVE` enabled. Maintains proportional player-enemy gap across screen sizes
- **Legacy horde fix**: `spawnWaveLegacy()` hardcoded values (spacing=75, startY=150, maxY=380) replaced with FORMATION config + responsive scaling. Now consistent with `generateFormation()`
- **Responsive teleport bounds**: `Enemy.doTeleport()` X/Y bounds clamped to actual screen dimensions. Prevents enemies teleporting off-screen on narrow devices (BOUNDS_X_MAX 550 > 430px screen)
- **Proportional kamikaze trigger**: `e.y > 250` hardcoded threshold replaced with `gameHeight * 0.33` (equivalent on 750px, proportional on all sizes)
- **Config**: `Balance.FORMATION.RESPONSIVE` (master toggle), `SPACING_MIN` (62px floor), `START_Y_RESPONSIVE` (height scaling)
- **Kill-switch**: `FORMATION.RESPONSIVE: false` restores exact pre-v4.32 behavior on all screens
- **Invariant**: Desktop 600px (widthRatio=1.0) → spacing stays 78px, zero visual changes. Enemy count unchanged
- **Files**: main.js (G._gameHeight + kamikaze), BalanceConfig.js (RESPONSIVE config), WaveManager.js (generateFormation + spawnWaveLegacy), Enemy.js (teleport bounds), Constants.js + sw.js (version bump)

---

## v4.31.0 - 2026-02-09
### Off-Screen Canvas — Sky & Hills Caching

- **Sky gradient off-screen canvas**: Sky background (gradient `fillRect` full-screen) rendered onto a dedicated off-screen canvas (`{ alpha: false }` for GPU fast-path). Blitted via single `drawImage` per frame. Redrawn only on level/bear market/boss state change (~5 times per game session vs 60/sec)
- **Hills off-screen canvas**: 5-layer parallax hills (sin() wave, fill+stroke, silhouettes) rendered onto transparent off-screen canvas. Throttled redraw every N frames (default: 2, configurable). Automatic invalidation on level change, bear market toggle, and boss→normal transition
- **Config**: `Balance.SKY.OFFSCREEN` with `ENABLED` toggle (master kill-switch, `false` = pre-v4.31 direct-draw fallback) and `HILLS_REDRAW_INTERVAL` (frames between hill redraws)
- **Memory**: 2 extra canvases at ~400x700 = ~2.2 MB total. Acceptable for mobile
- **Fallback**: `OFFSCREEN.ENABLED: false` produces pixel-identical output to pre-v4.31 (original pipeline preserved as else branch)
- **Zero gameplay changes**: All collision, scoring, visual behavior identical pre/post optimization
- **Files**: SkyRenderer.js (off-screen pipeline + helpers), BalanceConfig.js (OFFSCREEN config), Constants.js + sw.js (version bump)

---

## v4.30.0 - 2026-02-09
### Batch Rendering — Canvas State Change Optimization

- **ParticleSystem multi-pass draw**: Refactored single-loop draw into 2-pass pipeline — Pass 1: standard particles (circles, symbols) in source-over; Pass 2: all additive particles (isGlow, isRing, isSpark) in a single `lighter` context. Reduces ~40-60 composite switches/frame to 2
- **Player bullet glow batching**: Extracted `drawGlow(ctx)` method in Bullet.js (radial gradient without save/restore/composite). Removed inline glow block from `draw()`. New batched additive pass in main.js draws all player bullet glows in one `save → lighter → restore` cycle. Reduces 50 save/restore + 100 composite switches → 1 save/restore + 2 switches
- **Floating text shared setup**: Hoisted `textAlign`, `textBaseline`, `strokeStyle`, `lineWidth` assignments before the floating text loop. Eliminates ~40-80 redundant per-text state assignments/frame
- **Rendering order preserved**: Glow (additive, under) → Body (source-over, over) for bullets. Standard particles → additive particles for ParticleSystem. Visually identical to pre-v4.30
- **Zero gameplay changes**: All collision, scoring, particle behavior identical pre/post optimization
- **Files**: ParticleSystem.js (multi-pass), Bullet.js (drawGlow extracted), main.js (batched glow + text setup), Constants.js + sw.js (version bump)

---

## v4.29.0 - 2026-02-09
### Object Pool Audit — GC & Per-Frame Allocation Optimization

- **ObjectPool.release O(1)**: Replaced `indexOf` O(n) duplicate check with `_inPool` boolean flag. Eliminates ~150-300 comparisons/frame during active combat
- **Pre-allocated hot-path objects**: `buildPlayerState()`, `getState()` lambda, and `onEnemyHit` spark opts now reuse pre-allocated objects instead of creating fresh ones per call. Eliminates ~10-20 object allocations/frame
- **ParticleSystem compaction**: Replaced backward-iterate + `.splice()` pattern (O(n) per removal × ~15 removals/frame) with single-pass forward write-pointer compaction (1× O(n) total). Eliminates micro-array allocations from splice return values
- **Dead code removal**: Removed unused `ParticlePool.getActive()` method (called `.slice()` on every invocation, never used)
- **Zero gameplay changes**: All collision, scoring, particle behavior identical pre/post optimization
- **Files**: ObjectPool.js (refactored), main.js (pre-allocated objects), ParticleSystem.js (compaction), Constants.js + sw.js (version bump)

---

## v4.28.0 - 2026-02-09
### main.js Decomposition — CollisionSystem, RunState, GameStateMachine

- **CollisionSystem.js** (NEW): Extracted 4 collision loops from main.js (~350 lines) into `G.CollisionSystem` module. Callback pattern: detection loops in CollisionSystem, side-effects (score, meme, drop, VFX) stay in main.js as named callbacks. Methods: `processEnemyBulletsVsPlayer`, `processPlayerBulletVsBoss`, `processPlayerBulletVsEnemy`, `processBulletCancellation`
- **RunState.js expansion**: Moved ~30 per-run variables from main.js globals into `RunState.reset()` — score, level, marketCycle, totalTime, killCount, streak, bestStreak, killStreak, grazeMeter, grazeCount, bulletCancelStreak, sacrificeState, fiatKillCounter, and more. `syncFromRunState()` bridges local aliases for backward compat
- **GameStateMachine.js** (NEW): Centralized state transition table with validation. `G.GameState.transition(newState)` logs + warns on invalid transitions. `G.GameState.is(...states)` helper for multi-state checks. All `gameState = 'X'` in main.js now route through `setGameState()` wrapper
- **Zero gameplay changes**: Identical behavior pre/post refactor. All collision detection, scoring, and state management work exactly as before
- **main.js reduced**: Removed `checkBulletCollisions()` function (~200 lines), inline enemy bullet loop (~170 lines), inline boss collision (~150 lines), inline bullet cancel (~36 lines). Net reduction ~400+ lines
- **Files**: CollisionSystem.js (new), GameStateMachine.js (new), RunState.js (expanded), main.js (refactored), index.html (+2 scripts), sw.js (cache list + version)

---

## v4.27.0 - 2026-02-09
### Hardcoded Values Audit — Tier 1 (Gameplay/Balance)

- **~70 magic numbers extracted**: Moved gameplay-critical hardcoded values from Player.js (~14), Enemy.js (~20), Boss.js (~40), and main.js (~3) into `BalanceConfig.js`. All gameplay tuning now lives in `G.Balance.*`
- **Extended `Balance.PLAYER`**: Added SPAWN_OFFSET_Y, RESET_Y_OFFSET, BOUNDARY_MARGIN, TOUCH_SWIPE_MULT, SECOND_WIND_DURATION, INVULN_DURATION, MUZZLE_FLASH_DURATION, BULLET_SPAWN_Y_OFFSET, FIRE_VIBRATION_MS, DANGER_RANGE_SQ, START_LIVES, SHIELD_COOLDOWN, SPREAD_OFFSETS (NARROW/FIRE/WIDE)
- **New `Balance.GAME`**: BASE_WIDTH (600) and BASE_HEIGHT (800) — canvas dimensions configurable
- **Extended `Balance.ENEMY_BEHAVIOR`**: Added TELEGRAPH_LEAD, BULLET_SPAWN_Y_OFFSET, FLASH_FADE (HIT/SHIELD/TELEPORT), TELEPORT (range/chance/offsets/bounds/cooldown), WAVE_PATTERNS (V_SHAPE/SINE_WAVE), ENTRY (distance/curve/rotation)
- **Extended `Balance.BOSS`**: Added ENTRANCE_SPEED, BOUNDARY_MARGIN, MINION (HP scaling/spawn offsets), MOVEMENT (per-boss per-phase configs for FED/BCE/BOJ), ATTACKS (full pattern params — rotation speeds, bullet counts, speeds, homing strengths, gap sizes, spiral arms for all 3 bosses × 3 phases)
- **Zero gameplay changes**: All extracted values match their original hardcoded counterparts exactly. Behavior is identical pre/post refactor
- **Files modified**: BalanceConfig.js (config additions), Player.js, Enemy.js, Boss.js, main.js (literal → config references)

---

## v4.26.0 - 2026-02-09
### Top Bar Message Strip

- **DOM Message Strip**: New `#message-strip` DOM element replaces 3 canvas-based message channels (WAVE_STRIP, ALERT DANGER, ALERT VICTORY). Positioned under HUD top bar (45px) with z-index 110
- **4 Type Variants**: DANGER (red gradient + pulse flash + screen shake), VICTORY (gold gradient + gold glow), WAVE (semi-transparent black, gold text), INFO (semi-transparent black, cyan text)
- **Priority Queue System**: 3-tier priority (DANGER/VICTORY=3, WAVE=2, INFO=1). Higher priority interrupts current. Same type replaces in queue. Max queue size 3
- **Entrance/Exit Animations**: CSS `stripEntrance` (200ms bounce) and `stripExit` (300ms fade-up). Danger variant adds `stripPulse` brightness flash
- **Performance Gain**: Removed ~130 lines of per-frame canvas text rendering (fillText, measureText, shadowBlur). DOM updates are event-driven, not per-frame
- **Canvas Channels Preserved**: SHIP_STATUS (above player ship) and WAVE_SWEEP (horizontal line) remain canvas-based. Meme whisper functions now no-ops (dead code since v4.20)
- **Config**: `Balance.MESSAGE_STRIP` with ENABLED toggle, per-type PRIORITIES/DURATIONS, COOLDOWN (300ms), MAX_QUEUE_SIZE (3)
- **Mobile Responsive**: Font scales down at 380px (10px) and 320px (9px)
- **Files**: index.html, style.css, BalanceConfig.js, MessageSystem.js (refactored), main.js (2 lines)

---

## v4.25.0 - 2026-02-09
### Enemy Resize

- **Enemy Resize +20%**: All enemies scaled from 48×48 to 58×58px. Better visual presence against rich cell-shaded backgrounds. All internal dimensions updated: coin radius 19→23, bill 36×21→44×25, bar trapezoid +20%, card 33×22→40×27, minion 18→22
- **Collision Updated**: `BULLET_CONFIG.ENEMY_HITBOX_RADIUS` 24→29 to match new size. Hit flash/damage tint radius 21→25, telegraph ring 25→30, shield hexagon 26→31
- **Formation Spacing**: `FORMATION.SPACING` 65→78, `GRID.SPACING` 60→72, spiral base/step scaled proportionally. Formations won't overflow on 430px screens
- **Font Scaling**: All enemy symbol fonts scaled +20% (coin 15→18, bill/bar/minion 14→17, card 12→14)
- **Enemy Bullets Unchanged**: Remain 4×4px — ratio 4:58 (6.9%) gives better visual proportion
- **Off-Screen Culling**: Margin increased 65→80px to accommodate larger enemies

---

## v4.24.0 - 2026-02-09
### Sky & Background Enhancement (Cell-Shading)

- **Smooth Gradient Sky**: Replaced flat 4-band fills with smooth `createLinearGradient()` for all 5 level palettes + boss + bear market. Gradient cached per level/state combo, invalidated on resize. Legacy fallback: `SKY.GRADIENTS.ENABLED: false`
- **Enhanced Star Field**: 90 stars (was 40) with variable size (1.5-3.5px), brightness, and parallax drift (3 px/sec). Visible from L3+ with progressive alpha (L3=0.25, L4=0.55, L5=1.0, boss=1.0). Shooting stars (0-2 active, 4-12s spawn interval) with 40px trail
- **5-Layer Parallax Hills**: Added 2 distant layers at 65% and 70% screen height with atmospheric perspective (lighter colors, slower movement). Per-layer configurable freq/amp wave parameters. 5 color palettes per level. Deterministic silhouettes (trees + buildings) on distant layers 0-2 with cell-shaded #111 outline
- **Atmospheric Particles**: 20 particles with level-themed types: dust (L1-2), pollen (L2-3), fireflies with sinusoidal blink (L4-5), embers (bear market). Cell-shaded outline on particles >= 3px. Drift + sinusoidal wobble with screen-edge wrapping
- **Multi-Lobe Clouds**: 2-4 overlapping ellipse lobes per cloud (was single ellipse). Shadow layer + main body + highlight lobe + per-lobe outline. Layer-based scaling (back 1.3x, front 0.7x). Normal/bear/night color schemes
- **Horizon Glow**: Subtle luminous band (8px) at first hill Y position with level-matched color. Sinusoidal alpha pulse (0.12-0.28). Hidden during boss fights
- **Draw Pipeline Updated**: bands → symbols → stars → atmospheric particles (NEW) → horizon glow (NEW) → hills → clouds → lightning
- **Resize Fix**: `SkyRenderer.setDimensions()` now called in `resize()` function (was missing, pre-existing bug)
- **Full Config**: `Balance.SKY` with master toggle + per-feature toggles (pattern matches `Balance.GLOW`)

---

## v4.23.1 - 2026-02-09
### Glow Boost + Trail & Motion Effects

- **Glow Values Boosted**: All GLOW config values increased for visible impact — bullet alpha 0.25→0.45, radius 12→18px, pulse 0.08→0.15; engine alpha 0.35→0.55, radius 18→24px; muzzle alpha 0.4→0.6, radius mult 1.4→1.8; aura mult 0.8→1.0; power-up alpha 0.35→0.5, radius mult 1.2→1.5; ring alpha mult 1.0→1.3
- **Additive Bullet Trails**: All 9 player bullet draw methods (Normal, Wide, Narrow, Fire, Pierce, Homing, Laser, Missile, Evolution) now render their trail/exhaust sections in additive composite mode — trails glow and blend with overlapping effects
- **Player Afterimage Enhancement**: Speed threshold lowered (80→50 vx), alpha increased (0.25→0.4), trail age extended (0.12→0.18s), afterimages rendered in additive mode — visible ship silhouette scie at moderate speeds
- **Enemy Death Lingering Glow**: New `isGlow` particle type — additive radial gradient persists at enemy death point for ~0.4s. Config: `Balance.GLOW.DEATH_FLASH` with toggle, radius, and duration
- **Spark Additive Rendering**: White spark particles from bullet impacts (`isSpark` flag) now render in additive mode for brighter, more impactful hit effects
- **Enemy Bullets Unchanged**: No additive effects on hostile bullets — visual distinction preserved

---

## v4.23.0 - 2026-02-09
### Premium Graphics v1 — Glow & Bloom (Additive Blending)

- **Additive Glow System**: New `Balance.GLOW` config block with per-element toggle and tuning (BULLET, ENGINE, MUZZLE, AURA, POWERUP, PARTICLES). Master kill-switch `GLOW.ENABLED` reverts to pre-v4.23 rendering
- **Player Bullet Glow**: Pulsing radial gradient underneath bullet body using `globalCompositeOperation: 'lighter'`. Bullets now emit soft light halos that blend additively with overlapping effects
- **Engine Flame Glow**: Warm orange additive circle behind main engine flame, making the ship's thrust feel like real energy output
- **Muzzle Flash Bloom**: Additive pass on muzzle flash with configurable radius multiplier (1.4x) — firing now produces a visible light bloom
- **HYPER/GODCHAIN Aura Bloom**: Both auras wrapped in additive composite mode — overlapping light creates natural bloom at intersection points. Ethereal, energy-based look
- **Power-Up Glow**: Outer gradient rendered in additive mode with configurable radius multiplier (1.2x) — power-ups now glow as collectible light sources. Reinforces "glow = collect, dark = avoid" visual language
- **Explosion Ring Bloom**: Ring particles from death explosions use additive blending — overlapping rings produce bright intersection points for natural bloom effect
- **Enemy Bullets Untouched**: Hostile tint system (v4.17) preserved — enemy bullets remain dark with no additive glow, maintaining visual distinction

---

> **Versioni precedenti (v2.7.0 — v4.22.0)**: vedi [CHANGELOG_ARCHIVE.md](CHANGELOG_ARCHIVE.md)
