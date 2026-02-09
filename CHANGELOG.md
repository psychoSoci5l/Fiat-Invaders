# Changelog

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

## v4.22.0 - 2026-02-09
### Bullet System v2.0 — Collision + Explosion + Config

- **Circle-based Collision**: Replaced all AABB (Manhattan distance) collision checks with accurate circle-vs-circle detection. Affects player bullets vs enemies, enemy bullets vs player, and bullet-on-bullet cancellation
- **Centralized BULLET_CONFIG**: All bullet parameters (collision radius, speed, piercing) now in `Balance.BULLET_CONFIG`. No more hardcoded values scattered across files
- **Missile AoE Fix**: `isMissile` and `aoeRadius` (set in `Player.fireEvolution()`) now actually trigger splash damage on impact. Radial falloff (full center, half edge), knockback, particles, screen shake
- **BulletSystem.js**: New module (`G.BulletSystem`) with `circleCollide()`, `bulletHitsEntity()`, `handleMissileExplosion()`, and `drawDebugOverlay()`
- **Bullet.collisionRadius getter**: Each bullet auto-resolves its collision radius from config based on type (NORMAL/HOMING/PIERCE/LASER/MISSILE/ENEMY)
- **Debug Hitbox Overlay**: `dbg.hitboxes()` toggles visual overlay showing collision circles for all entities (magenta=player bullet, red=enemy bullet, green=enemy, yellow=player core, cyan=graze zone)

---

## v4.21.0 - 2026-02-09
### Gameplay Flow & Quality of Life

- **HYPER Auto-Activate**: Graze meter now auto-triggers HYPER mode when reaching 100% — no manual activation needed. Controlled via `Balance.HYPER.AUTO_ACTIVATE`. HYPER button hidden when auto-activate is enabled
- **Seamless Wave Transitions**: Removed blocking 3-2-1 countdown between waves. Waves now flow continuously with inline cleanup (bullet bonus, clear bullets, audio, meme). Boss-defeat intermissions preserved
- **Bug Fix: Menu Buttons**: Fixed settings/icon buttons becoming unresponsive after returning from game. Root cause: `.dialogue-container` (DialogueUI) had `pointer-events: auto` even when invisible (`opacity: 0`), blocking all taps on the bottom of the screen. Fix: `pointer-events: none` by default, `auto` only when `.visible`. Also added `#intro-screen` z-index 250, InputSystem touch exclusion for intro screen, and dialogue cleanup in `backToIntro()`
- **Bug Fix: iPhone Manual Scroll**: Fixed player manual not scrollable on iOS Safari. Changes: `overflow-y: scroll` (iOS requires explicit), `overscroll-behavior: contain`, `100dvh` height on mobile, safe-area insets for notch/home bar, InputSystem touch exclusion for modals
- **Unified Boss Rotation**: Deprecated CampaignState boss tracking across sessions. Boss rotation always follows `marketCycle % 3` (FED→BCE→BOJ) for both Story and Arcade modes. Campaign always resets on new game
- **PWA Banner Polish**: Banner now hides when entering ship selection screen (no more persistence across screens). Improved centering and spacing to avoid overlap with CTA button

---

## v4.20.0 - 2026-02-09
### Meme Popup System

- **DOM Popup replaces canvas memes**: Whisper-style popup (italic gold text, black outline) positioned above the player ship (bottom 240px), replaces all canvas meme rendering
- **3-tier priority system**: CRITICAL (red, boss defeat/death), HIGH (gold, boss spawn/upgrades), NORMAL (muted gold, modifiers/streaks/graze)
- **Priority queue**: Up to 5 queued memes, sorted by priority (FIFO within same tier). CRITICAL interrupts immediately
- **Spring-pop animation**: Scale(0.3)→1.08→1 entrance (150ms), scale+fade exit (250ms)
- **11 event types**: BOSS_DEFEATED, MINI_BOSS_DEFEATED, DEATH, BOSS_SPAWN, MINI_BOSS_SPAWN, BOSS_TICKER, UPGRADE, SPECIAL, MODIFIER, STREAK, GRAZE — each with configurable duration
- **Boss dialogues unified**: Boss intro (BOSS_INTRO) and phase change (BOSS_PHASE) dialogues now routed through meme popup with speaker label (POWELL, LAGARDE, KURODA), replacing bottom DialogueUI during gameplay
- **Boss ticker via popup**: Boss fight meme rotation now uses popup instead of legacy DOM ticker
- **Intermission meme via popup**: Canvas-rendered intermission meme replaced with popup
- **Power-up pickup routing**: Category-based meme tier (UPGRADE→HIGH, SPECIAL→HIGH, MODIFIER→NORMAL)
- **Death meme**: Respawn now shows CRITICAL popup
- **Speaker labels**: All memes show contextual label (boss name, STREAK, GRAZE, REKT, power-up type)
- **Config**: `Balance.MEME_POPUP` in BalanceConfig.js (priorities, cooldowns, durations)
- **Pause menu**: Button prefix changed from `>` to `⟡`, text aligned left
- **pointer-events: none**: Popup never blocks touch controls

---

## v4.19.2 - 2026-02-08
### Mode-Aware Tutorial + Mobile Control Fix

- **Tutorial per modalita**: Step "Obiettivo" ora mostra contenuto diverso per Story Mode ("3 atti contro le banche centrali, FED → BCE → BOJ") e Arcade Mode ("ondate infinite, batti il record")
- **Controlli mobile dinamici**: Step "Controlli" riflette il controllo attualmente selezionato (Swipe vs Joystick) invece di mostrare sempre "joystick"
- **localStorage per-mode**: `fiat_tutorial_story_seen` / `fiat_tutorial_arcade_seen` — chi gioca entrambe le modalita vede il tutorial corretto per ciascuna
- **Backward compat**: vecchia chiave `fiat_tutorial_seen` ancora rispettata come skip globale
- **4 nuove chiavi i18n**: `TUT_CONTROLS_MOBILE_SWIPE`, `TUT_CONTROLS_MOBILE_JOY`, `TUT_OBJECTIVE_STORY`, `TUT_OBJECTIVE_ARCADE` (EN + IT)

---

## v4.19.1 - 2026-02-08
### Boss Movement Freeze Fix

- **BUG FIX**: All bosses (FED/BCE) could permanently stop moving after phase transitions
  - **Root cause**: Phase transition shake used `this.x +=` (random walk), pushing boss 20-40px past screen boundaries. Boundary check only flipped `dir` without clamping position, causing sub-pixel oscillation (~0.88px/frame step couldn't escape 5-10px overshoot zone)
  - **Fix**: All 5 dir-based boundary checks (FED P1/P2, BCE P1/P2/P3) now clamp position + set absolute direction instead of `dir *= -1`
  - FED P3 and BOJ (all phases) already used lerp+clamp, unaffected

---

## v4.19.0 - 2026-02-08
### Adaptive Drop System

Intelligent power-up economy that scales drops based on player power state.

- **Player Power Score** (0.0→1.0): Composite metric from shot level (40%), modifier levels (35%), and special (25%)
- **Suppression Gate**: Drops have a chance to be suppressed proportional to power score
  - Power 0.0 → 0% suppressed (weak player gets everything)
  - Power 0.5 → 50% suppressed
  - Power 1.0 → ~100% suppressed (fully armed player rarely gets more)
  - Pity drops always bypass suppression
  - SUPPRESSION_FLOOR: 0.15 (protects fresh/post-death players)
  - Suppressed drops don't reset kill counter → pity timer keeps counting
- **Need-Based Category Selection**: Replaces fixed 60/40 modifier/special split
  - Categories weighted by player need (upgrade, modifier, special)
  - Max-level players get fewer upgrades, more of what they lack
- **Config**: New `Balance.ADAPTIVE_DROPS` block in BalanceConfig.js
- **Debug**: `dbg.powerUpReport()` now shows ADAPTIVE SUPPRESSION section
  - Tracks suppressed count, rate, avg power score at suppression
- **Impact**: ~12-14 drops per 4:30 run (was 19), gradual power curve, fast post-death recovery

---

## v4.17.0 - 2026-02-08
### Unified Balance & Bugfix Patch

Power-up economy fix, enemy bullet visual distinction, and fire budget system.

- **Power-Up Economy Fix**: Target 30-40/run (was 62)
  - Boss drops: DROP_INTERVAL 25→40, BOSS_DROP_COOLDOWN 1.5→3.0s
  - New: MAX_DROPS_PER_BOSS cap of 6 per boss fight
  - Pity timer: PITY_BASE 45→55, PITY_REDUCTION 3→2 kills/cycle
  - Cycle scaling removed: CYCLE_BONUS 0.5%→0% (flat rate across cycles)
  - Weapon cooldown: 5.0→8.0s between weapon drops
- **BUG 4: Enemy Bullet Visual Distinction** (Bullet.js)
  - Glow reduced: radius r+6→r+3, alpha halved (0.3→0.15)
  - White ring removed: replaced with dark hostile ring (rgba(80,20,20,0.35))
  - Hostile tint: glow color shifted 70% enemy + 30% red
  - Trail dimmed: alpha 0.35/0.15→0.20/0.08
  - White contours on shapes (coin/bill/bar/card) → dark semi-transparent
  - Core shape, animation, and size unchanged (4×4px)
- **BUG 7: Fire Budget System** (HarmonicConductor.js)
  - New FIRE_BUDGET config in BalanceConfig.js
  - Per-cycle bullet limits: C1 25/sec, C2 45/sec, C3 70/sec
  - Bear Market +10/sec, PANIC phase +30%, Rank ±15%
  - Budget recharges per-frame, caps at 1.5x max
  - Commands skipped (not delayed) when budget exhausted
  - GLOBAL_BULLET_CAP (150) remains as separate safety net
- **BUG 5 closed**: 48px entities confirmed OK since v4.14.0

---

## v4.16.0 - 2026-02-08
### Post-Audit Balance Tuning

Gameplay audit results: BTC Arcade Normal, 3 cycles, 7:27, 0 deaths, 78 power-ups collected.

- **Drop rates halved**: STRONG 6%→3%, MEDIUM 4%→2.5%, WEAK 2%→1%
  - Pity timer raised: 30→45 kills guaranteed drop
  - Cycle bonus reduced: 1%→0.5%, pity reduction 5→3 kills/cycle
- **Boss HP boosted +25-40%**: BASE 2400→3000, PER_LEVEL 50→65, PER_CYCLE 1000→1400
  - Target: 30-50s boss fights (was 10-13s for C1/C2)
- **Boss phase thresholds from config**: Boss.js now reads `Balance.BOSS.PHASE_THRESHOLDS`
  - Fixed hardcoded 0.66/0.33 values that ignored config
- **CHEVRON Y-overflow fix**: Y-spacing multiplier 0.75→0.55 (from `Balance.FORMATION.CHEVRON_Y_MULT`)
  - Prevents enemies spawning in player zone with high counts
- **Y-clamp configurable**: `Balance.FORMATION.MAX_Y_RATIO` replaces hardcoded `gameH * 0.65`

---

## v4.15.0 - 2026-02-08
### Power-Up Visual Design: Category Distinction

- **MODIFIER shape changed**: Hexagon → 4-pointed Diamond for clear distinction from UPGRADE star
  - Diamond vertices: top/right/bottom/left (0.7x width ratio)
  - Light-side facet overlay on right half
  - Stack indicator lines repositioned for diamond geometry
- **Glow effects added** to all 3 power-up categories:
  - UPGRADE: Gold glow (shadowBlur 8, rgba gold 0.4)
  - MODIFIER: Color-matched glow (shadowBlur 6)
  - SPECIAL: Color-matched glow (shadowBlur 8)
- **Visual hierarchy now clear**:
  - UPGRADE = Gold Star (permanent)
  - MODIFIER = Colored Diamond (temporary, stackable)
  - SPECIAL = Circle + Orbiting Ring (temporary, exclusive)
- No changes to colors, symbols, or gameplay mechanics

---

## v4.14.1 - 2026-02-08
### Debug: Power-Up Economy Report

- **`dbg.powerUpReport()`**: New detailed report for power-up lifecycle analysis
  - DROP ECONOMY: spawned / collected / expired / collection rate %
  - DROPS BY SOURCE: enemy vs boss breakdown
  - DROPS BY CATEGORY: upgrade / modifier / special counts
  - WEAPON TIMELINE: chronological weapon evolution events (last 30)
  - MODIFIER ANALYSIS: overlap % (time with 2+ active modifiers)
  - GODCHAIN: activations, total/avg duration
  - WEAPON STATE FINAL: end-of-run weapon snapshot
- **Tracking hooks**: Drop spawned/expired in main.js, weapon events in Player.js (modifier/special expired, GODCHAIN on/off, shot level up, death penalty)
- **Analytics extended**: `dropsSpawned[]`, `dropsExpired`, `weaponTimeline[]`, GODCHAIN duration, modifier overlap frames

---

## v4.14.0 - 2026-02-08
### Game Balance Rebalancing — Enemy Size & Spawn

- **Enemy size -25%**: 65×65 → 48×48 pixels, all shape drawings rescaled (coin, bill, bar, card)
- **Enemy count +25%**: All 15 wave definitions increased by 25% (ceil), e.g. C1W1 12→15, C3W5 24→30
- **Enemy bullets -40%**: Size 6×6 → 4×4, speed base 128→77, speed scale 68→41
- **BULLET_VISUALS config**: New BalanceConfig section for per-shape enemy bullet sizes
- **Formation spacing**: 85→65 (FORMATION), 75→60 (GRID) — tighter grid for smaller enemies
- **Collision detection**: Player bullet→enemy hitbox 40→30, mini-boss fallback 60→44
- **Drawing details**: All hardcoded radii, arcs, fonts proportionally rescaled (×0.75)
- **Fire rate unchanged**: Option A (conservativo) — more enemies = naturally more bullets

---

## v4.13.0 - 2026-02-08
### Button Design System

- **Unified button system**: 12 composable CSS classes (`.btn`, `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.btn-toggle`, `.btn-icon`, `.btn-icon-round`, `.btn-sm`, `.btn-lg`, `.btn-block`, `.btn-cta`, `.btn-pwa`)
- **CSS custom properties**: `--btn-gold-*`, `--btn-danger-*` variables in `:root` for consistent theming
- **Gold/amber design language**: All ~22 buttons across 9 screens now use unified gold gradient, 3D shadow, hover lift, active press
- **Danger state**: ESCI button uses red gradient (`.btn-danger`) — no more inline styles
- **Ghost secondary**: MENU/SKIP buttons use transparent border style (`.btn-secondary`)
- **Toggle compact**: Language/Controls buttons use gold compact style (`.btn-toggle`)
- **Removed 15+ old CSS classes**: `.btn-coin`, `.btn-play`, `.btn-cell`, `.icon-btn-cell`, `.icon-btn`, `.toggle-btn-cell`, `.btn-primary-action`, `.pwa-banner-btn`, `.tutorial-btn/.tutorial-skip/.tutorial-next`, `.help-btn`, `.credits-btn`, `@keyframes blinkBtn`
- **JS selectors fixed**: 6 selectors updated from class-based to `getElementById` for robustness
- **Accessibility**: `focus-visible` outline on all buttons, `prefers-reduced-motion` updated for `.btn-cta`
- **Mobile-first**: 48px+ touch targets, `min(320px, 85vw)` block width

---

## v4.12.1 (docs) - 2026-02-08
### Documentation Restructure — 3-Layer Architecture

- **CLAUDE.md** reduced from 41.3k → 8.5k chars (auto-loaded every prompt)
- **SYSTEM_REFERENCE.md** created (15k): detailed system tables, read on-demand per task
- **PROJECT_SNAPSHOT.md** cleaned to orientation-only (24k): read when starting code work
- Updated `.gitignore` to exclude `SYSTEM_REFERENCE.md`
- Updated `MEMORY.md` with 3-layer protocol and session behavior rules

**Loading scenarios**: Chat only = 8.5k, Code work = 32k, Full reference = 47k (was 41k always)

---

## v4.12.1 - 2026-02-08
### Accessibility, Onboarding & Bugfixes

#### Accessibility (WCAG 2.1 AA+)
- **P1 Menu Readability**: Mode pill contrast 0.5→0.75, font sizes enlarged, 48px+ touch targets
- **P3 Title Visual Hierarchy**: Intro title `clamp(58px, 13vw, 84px)`, small screen fallback, `prefers-reduced-motion` support
- **P5 Meme Repositioning**: Whispers moved from 60%→25% screen height, opacity 0.45→0.35

#### Tutorial Onboarding (P2)
- 3-step DOM overlay on first launch: Controls (platform-aware), Objective, Survival
- Skip/Next/Got It buttons, progress dots, 48px min-height touch targets
- Auto-skips on repeat visits via localStorage flag
- Fixed: tutorial overlay placed outside game-container for correct z-index stacking above curtain

#### Manual v2 (P4)
- Replaced 6-tab manual with 4 scrollable sections: Controls, Objectives, Power-Ups, Tips
- Single-column vertical scroll with flexbox `min-height: 0` fix
- Mobile fullscreen: padding removed, 100dvh height, no border/radius
- Platform-aware controls section (desktop/mobile)

#### Bugfixes
- Fixed `backToIntro()` not restoring mode-explanation and ship-area visibility (pre-existing v4.11.0 bug)
- Added localStorage force-reset on version change (clean slate for all cached users)

#### Infrastructure
- Version migration system: `localStorage.clear()` on version mismatch
- Forced cache invalidation via SW_VERSION bump to 4.12.1

## v4.11.0 (infra) - 2026-02-08
### Git Hygiene & Architecture Docs
- **Added `.gitignore`**: Excludes prompt files (`*.txt`, `*prompt*.md`), local tool config (`.claude/`, `_ps_meta/`), dev docs (`PROJECT_SNAPSHOT.md`, `BALANCE_TEST.md`), OS artifacts
- **Removed 6 non-project files from git tracking** (kept on disk): `.claude/`, `_ps_meta/`, `debug checklist.txt`, `BALANCE_TEST.md`
- **Updated CLAUDE.md**: New "Git Hygiene" mandatory rule — ON/NOT on git checklist, pre-commit check
- **Created `PROJECT_SNAPSHOT.md`** (local-only): Full architecture snapshot for faster session onboarding (38 files, 28 classes, 150+ methods documented)

## v4.11.0 - 2026-02-06
### Performance: 60fps Rock Solid — Draw + GC Optimization

Targeted optimization based on mobile performance report (BTC Normal, 80.3fps avg, 814 GC spikes, 37.6ms worst frame).

#### FIX 1: RGBA String Cache (CRITICAL — ~500 alloc/frame eliminated)
- **`ColorUtils.rgba(r, g, b, alpha)`**: Cached rgba strings with alpha discretized to 0.05 steps (21 values per color)
- **20 most-used colors pre-cached** at module load (gold, white, red, cyan, etc.)
- Replaced all `\`rgba(...)\`` template literals in `Bullet.js` (4), `Player.js` (36), `Boss.js` (3) with cached lookups
- Static color constants on Bullet class (`_WHITE_HALF`, `_WHITE_15`, `_WHITE_90`) for enemy bullet shapes

#### FIX 2: Font String Cache (~50 alloc/frame eliminated)
- **`ColorUtils.font(weight, size, family)`**: Cached font strings keyed by weight+size+family
- Replaced 8 dynamic `\`bold ${size}px ...\`` template literals in main.js, ParticleSystem.js

#### FIX 3: Intermission Blur Removal (2-5ms/frame saved during intermission)
- Removed `ctx.filter = 'blur(4px)'; ctx.drawImage(canvas)` — the single most expensive GPU operation
- Replaced with simple `rgba(0,0,0,0.6)` dark overlay (visually similar, ~100x cheaper)

#### FIX 4: Enemy Bullet Trail Simplification (~450 path ops/frame saved)
- Reduced trail segments from 4 triangles to 2 per bullet across all 5 enemy shapes
- At 150 enemy bullets: 600→300 triangle path operations per frame
- Removed intermediate colored ring from default energy bolt (3 circles→2)

#### FIX 5: shadowBlur Removal (GPU cost reduction)
- Replaced `shadowBlur` with stroke outlines or glow circles in:
  - Boss.js: BCE phase 3 `€` symbol, BOJ phase 3 `¥` symbol
  - main.js: Perk icons, HYPER ready indicator, intermission meme
  - Player.js: Weapon pip modifier glow

#### FIX 6: Perk Icon Gradient Optimization
- Parse hex color once per icon (`_rgb` cached), use `rgba()` for gradient stops
- Eliminated 4 `hexToRgba()` calls per perk icon per frame

**Measured Impact** (desktop): GC spikes 814→3, worst frame 37.6ms→9.8ms, 0 jank >16ms — Verdict: EXCELLENT

### Bug Fixes (v4.11.0)

#### Story Mode: Campaign Progress Persistence Bug (CRITICAL)
- **Problem**: Boss defeats persisted in localStorage across sessions. Starting a new Story game with 2/3 bosses already defeated from previous sessions caused the campaign to complete after 1 boss fight (BOJ as Cycle 1 boss instead of FED)
- **Fix**: `resetCampaign()` now called **always** when starting Story Mode, not just when campaign was already complete
- **Symptom**: Game ended with "CAMPAIGN COMPLETE" after first boss, Final Score: 0

#### Story Mode: Campaign Victory Score Not Recorded
- **Problem**: `showCampaignVictory()` bypassed `triggerGameOver()`, so `endAnalyticsRun(score)` was never called — Final Score always showed 0 in `dbg.report()`
- **Fix**: Added `endAnalyticsRun()` call in `showCampaignVictory()`

#### Story Screen Language Always English
- **Problem**: `StoryScreen.show()` read `localStorage.getItem('fiat_lang')` which is `null` if user never toggled language (browser auto-detect doesn't save to localStorage)
- **Fix**: Exposed `G._currentLang` from main.js; StoryScreen reads it directly with localStorage fallback

#### Mini-Bosses Disabled in Story Mode
- **Rationale**: Mini-bosses break narrative rhythm in Story Mode; they're arcade-oriented mechanics
- **Implementation**: Early guard `!(G.CampaignState && G.CampaignState.isEnabled())` before the entire mini-boss trigger block — zero wasted computation in Story Mode

#### Intermission Countdown Skippable
- **Feature**: Tap/click/spacebar during 3-2-1 intermission countdown now skips it instantly
- **Implementation**: Added `INTERMISSION` case to `inputSys.on('start')` handler, sets `intermissionTimer = 0`

## v4.10.3 - 2026-02-06
### Enhancement: Unified Balance + Performance Report

`dbg.balanceTest()` now auto-starts performance profiling, and `dbg.report()` includes a PERFORMANCE section.

- **`balanceTest()`**: Automatically calls `this.perf()` — no need to run `dbg.perf()` separately
- **`report()`**: Appends performance data (Avg FPS, frame times P95/P99, jank counts, GC spikes, entity peaks, verdict)
- **No breaking changes**: `dbg.perf()` and `dbg.perfReport()` still work standalone
- **Workflow**: `dbg.balanceTest()` → play → game over → `dbg.report()` = everything in one place

## v4.10.2 - 2026-02-06
### Fix: Post-Playtest Balance Fixes — BOJ, Mini-Boss Spam, Boss HP, Formation Bounds

Critical balance fixes identified during Story Mode BTC playtest session.

#### Fix 1: BOJ Phase 1 Pattern Density (CRITICAL)
- **Problem**: BOJ Phase 1 lasted 72s (10x longer than FED/BCE) due to 24 bullets/sec flooding the screen
- **Fix**: Phase 1 fire rate 0.75s → 0.90s, zenGarden fires every 2nd cycle (was every cycle), arms 3→2, bulletsPerArm 2→1
- **Result**: ~6 bullets/sec (was 24), player can now damage the boss

#### Fix 2: Mini-Boss Spam Prevention (CRITICAL)
- **Problem**: C3W5H2 Ⓒ-swarm (26 enemies) triggered 3 consecutive BOJ mini-bosses (~100s total)
- **Fix**: Ⓒ threshold 12→24 (max 1 trigger per wave), added `MAX_PER_WAVE: 2` cap with per-wave counter
- **Result**: Max 1-2 mini-bosses per wave regardless of enemy composition

#### Fix 3: Boss HP Scaling (HIGH)
- **Problem**: `dmgCompensation = Math.sqrt(playerDmgMult)` punished players for taking Kinetic Rounds perk — counterintuitive
- **Fix**: Removed dmgCompensation entirely. perkScaling already handles perk-based HP increase
- **Result**: ~28% lower boss HP with damage perks (no more double penalty)

#### Fix 4: Formation Y-Clamping (MEDIUM)
- **Problem**: SPIRAL generated Y=-49, STAIRCASE Y=624, CROSS Y=590 — enemies invisible off-screen
- **Fix**: Added Y-clamp after formation generation (same pattern as existing X-clamp): minY=startY, maxY=gameHeight*0.65
- **Result**: All enemies visible within gameplay area (80px to ~455px)

## v4.10.1 - 2026-02-06
### Fix: Full Localization Audit — All Game Messages Now Respect Language Setting

Complete audit and fix of hardcoded English strings in game messages. All gameplay text now uses the `t()` localization function.

#### Fixed Strings (14 total)
- **CYCLE X BEGINS** → IT: "CICLO X INIZIA" (intermission after boss)
- **HYPER READY! [H]** → IT: "HYPER PRONTO! [H]" (wave strip + canvas overlay)
- **HYPER FAILED!** → IT: "HYPER FALLITO!" (danger alert)
- **SURVIVE THE CRASH** → IT: "SOPRAVVIVI AL CRASH" (Bear Market start)
- **[Boss] APPEARS!** → IT: "[Boss] APPARE!" (mini-boss entrance)
- **[Boss] REVENGE!** → IT: "[Boss] VENDETTA!" (mini-boss revenge)
- **[Boss] DESTROYED!** → IT: "[Boss] DISTRUTTO!" (boss/mini-boss killed)
- **[Boss] DEFEATED!** → IT: "[Boss] SCONFITTO!" (boss defeated)
- **GODCHAIN MODE / LOST** → IT: "GODCHAIN ATTIVA / PERSA"
- **BULLET BONUS** → IT: "BONUS PROIETTILI"
- **GRAZE BONUS!** → IT: "BONUS GRAZE!"
- **GRAZE MASTER** → IT: "MAESTRO GRAZE"
- **LAST FIAT!** → IT: "ULTIMO FIAT!"
- **RESPAWN!** → IT: "RINASCITA!"
- **NEW WEAPON UNLOCKED:** → IT: "NUOVA ARMA SBLOCCATA:"
- **PROFIT!** → IT: "PROFITTO!"
- **s LEFT!** → IT: "s RIMASTI!"

#### Intentionally Kept in English (crypto jargon)
- "SATOSHI MODE", "SATOSHI APPROVES", "NGMI" — universal crypto slang
- "CENTRAL BANK REKT!", "FIAT IS DEAD!" — meme flavor text
- Boss names (FEDERAL RESERVE, BCE, BOJ) — proper nouns
- All meme pools (SAYLOR, POWELL, etc.) — crypto culture content

#### Service Worker
- Fixed 206 partial response caching error (was throwing `TypeError: Partial response unsupported`)

## v4.10.0 - 2026-02-06
### Engine Hardening: Phase 40A — GC Pressure & Hot-Path Optimization

Zero-allocation engine pass targeting the ~3800 GC pauses detected during full story mode profiling.

#### HarmonicConductor (biggest impact)
- Replaced ALL `.filter()` calls with manual for-loops (was ~960 alloc/sec)
- Replaced `.some()` with early-return for-loop
- Pre-allocated `_tempActive` / `_tempTier` reusable arrays for `getEnemiesByTier()`
- Replaced `.forEach()` with for-loops in `processBeat()`, `executeCascade()`, `executeSyncFire()`
- Centroid calculation in `executePattern()` now inline (no `.filter().reduce()`)

#### EventBus
- `emit()`: replaced `.slice().forEach()` with simple for-loop (was allocating array copy per emit)
- Removed dead `beat` event emission in AudioSystem (no listeners existed, created object per beat)
- `harmonic_bullets` handler: `.forEach()` → for-loop

#### main.js Hot-Path
- DOM cache (`_domCache`): `setStyle()` / `setUI()` no longer call `getElementById()` per frame
- `updateShieldButton()` / `updateHyperButton()`: cached button + progress circle refs
- `_weaponState`: pre-allocated object, updated in-place (was recreating every frame)
- `bossBullets.forEach()` → for-loop
- Debug overlay: `floatingTexts.filter().length` → `_countActive()` manual counter (2 arrays/frame eliminated)

#### Performance Profiler v4.10.1
- Session-wide percentiles via histogram (200 buckets × 0.25ms) — no longer just last 300 frames
- Session-wide update/draw breakdown sums (was only from circular buffer)
- Session-wide jank counters (`_above16`, `_above25`, `_above33`)
- GC pause detection: absolute 8ms threshold (was 2.5x avg, way too sensitive at sub-1ms avg)
- Improved verdict categories (EXCELLENT/GREAT/GOOD/NEEDS WORK/POOR)

#### Bug Fix: Story Mode HUD disappearing (pre-existing)
- `showStoryScreen()` hid `ui-layer` and `touchControls` but callback never restored them
- After Chapter 1/2/3 story screens (post-boss), all DOM HUD elements became invisible
- Fix: restore `ui.uiLayer` and `ui.touchControls` in StoryScreen dismiss callback
- Only the Prologue was unaffected (its callback calls `startGame()` which restores HUD)

#### Summary
- Estimated ~1000+ allocations/sec eliminated from hot path
- All changes are internal — zero gameplay/visual changes
- Profiler now produces accurate session-wide metrics
- Fixed pre-existing Story Mode HUD bug

## v4.9.0 - 2026-02-05
### Feature: Platform-Aware Manual + Intro Improvements + Story Mode Fixes

Three independent improvements for better UX:

#### 1. Platform-Aware Manual (Controls Tab)
- Manual "Controls" tab now shows only relevant controls for current platform
- Desktop: Shows "Keyboard (PC)" controls only
- Mobile/Touch: Shows "Touch (Mobile)" controls only
- Detection via `is-touch` class on body element

#### 2. Intro SPLASH Screen Improvements
- Ship preview now hidden in SPLASH state (visible in SELECTION)
- Added mode explanation text below mode selector
- Story: "Follow Bitcoin's rise against central banks."
- Arcade: "Endless waves. High scores. Pure action."
- Localized to both EN and IT
- Smooth transition animations between states

#### 3. Story Mode Fixes
- **Language fix**: `toggleLang()` now saves to localStorage, so Story screens respect language choice
- **Always show stories**: `startGame()` resets `storyProgress` every time in Story Mode, so Prologue and Chapters always appear (players can skip if desired)

#### 4. UI/UX Polish
- **Mode description**: Larger text (+25%), orange color with black outline for readability
- **Touch scrolling**: Fixed scrolling in Manual and Help panels on mobile (touch-action: pan-y)
- **Settings controls**: Platform-aware (shows only PC or Mobile controls)
- **Pause menu**: Fully translated (PAUSA, RIPRENDI, IMPOSTAZIONI, MANUALE, RICOMINCIA, ESCI)
- **Pause button icon**: Changed from emoji to universal "II" for cross-device compatibility
- **LAUNCH button**: Adjusted position to avoid overlap with RECORD row

#### Files Changed
- `index.html` - ship-area hidden class, mode-explanation div, manual section classes
- `style.css` - platform visibility classes, mode-explanation styles, ship-area.hidden
- `src/main.js` - platform detection, toggleLang save, setGameMode reset, state transitions
- `src/utils/Constants.js` - MODE_STORY_DESC, MODE_ARCADE_DESC (EN + IT), version bump
- `sw.js` - version bump

---

## v4.8.1 - 2026-02-05
### Fix: Intro Screen Visual Polish

Simplified intro UI design for better visual harmony between SPLASH and SELECTION states.

#### Changes
- **Minimal mode selector**: Simple pill buttons instead of heavy box with tabs
- **Clean mode indicator**: Lightweight text instead of badge with background
- **Better visual integration**: Elements blend naturally with sky background
- **Score row separation**: High score displayed in dedicated row
- Removed: box backgrounds, checkmarks, mode descriptions (decluttered)
- Updated element IDs: `mode-selector`, `mode-pill-*`, `current-mode-indicator`, `mode-indicator-text`, `selection-score-row`
- Function rename: `updateModeBadge()` → `updateModeIndicator()`

## v4.8.0 - 2026-02-05
### Feature: Intro Screen Redesign

Complete UX overhaul of SPLASH and SELECTION screens for better flow.

#### 1. Mode Selector (SPLASH Screen)
- **Mode tabs**: Interactive STORY/ARCADE toggle with checkmark indicator
- **Mode description**: Contextual text explaining each mode
- Story mode now **default** (changed from Arcade)
- Description updates dynamically when switching modes

#### 2. Current Mode Badge (SELECTION Screen)
- Shows current mode + "tap to change" hint
- Displays HIGH SCORE inline
- Click/tap returns to SPLASH for mode change

#### 3. Fixed-Position Primary Action Button
- **Same screen position** in both SPLASH and SELECTION states
- Enables **double-tap quick start** (tap → tap → play)
- Visual state changes: transparent (TAP TO START) → solid (LAUNCH)

#### 4. UX Improvements
- New user flow: Title → Mode Select → Ship Select → Launch
- Expert flow: Double-tap anywhere to start immediately
- Mode preference persists to localStorage
- Safe zones maintained for iPhone notch/Dynamic Island

#### 5. Code Changes
- `handlePrimaryAction()`: Unified button handler
- `goBackToModeSelect()`: Return to mode selection
- `updatePrimaryButton(state)`: Button state switcher
- `updateModeBadge()`: Badge content updater
- New CSS classes: `.mode-selector-box`, `.mode-tab`, `.current-mode-badge`, `.primary-action-container`
- Removed: old `.btn-tap-start`, `.btn-launch`, `.selection-controls`, `.selection-mode` elements

#### 6. Localization (EN/IT)
- `MODE_STORY_DESC`: Mode explanation text
- `MODE_ARCADE_DESC`: Mode explanation text
- `CHANGE_MODE`: "tap to change" hint

## v4.7.0 - 2026-02-05
### Feature: Story Mode — "Storia di Bitcoin"

Full-screen narrative system that tells the story of Bitcoin across 4 chapters.

#### 1. Story System Architecture
- **StoryScreenData.js**: Narrative content with EN/IT localization
- **StoryScreen.js**: Canvas-based full-screen renderer with:
  - Fade in/out transitions (0.8s)
  - Typewriter text effect (35ms/char)
  - Animated star background (60 stars)
  - Multi-paragraph support
  - Tap/click to continue

#### 2. Narrative Structure
| Chapter | Period | Trigger | Theme |
|---------|--------|---------|-------|
| Prologue | 1971 | Before first game (Story mode) | End of Gold Standard |
| Chapter 1 | 2008-2010 | After defeating FED | Birth of Bitcoin |
| Chapter 2 | 2011-2016 | After defeating BCE | Scaling Wars |
| Chapter 3 | 2017-Today | After defeating BOJ | Unstoppable Network + Victory |

#### 3. Mode Rename
- "CAMPAIGN" → "STORY" (EN) / "STORIA" (IT)
- Mode toggle button dynamically updated via `updateUIText()`

#### 4. Progress Tracking
- `CampaignState.storyProgress`: Tracks which chapters shown (persists to localStorage)
- Stories only shown once per campaign run
- Reset on `resetCampaign()` (new playthrough)

#### 5. Integration Points
- `STORY_SCREEN` game state in main.js
- Story hooks in `launchShipAndStart()` (Prologue) and boss defeat handler (Chapters)
- Input handling via keyboard (Space/Enter/Escape) and touch/click

## v4.6.1 - 2026-02-05
### Bug Fixes (Post-Playtest)

#### 1. Fix: Game stuck at Level 15 after miniboss defeat (CRITICAL)
- **Root cause**: When all wave enemies die before miniboss spawns, `savedEnemies` is empty
- Phase 3 minions remain in `enemies` array, WaveManager can't proceed (requires `enemiesCount === 0`)
- **Fix**: Clear enemies array when savedEnemies is empty instead of leaving minions behind

#### 2. Fix: GODCHAIN mode unreachable in normal play
- **Root cause**: Required all modifiers at absolute max (Rate=3, Power=3, Spread=2) simultaneously with 12s timers — near-zero probability with 10 drop types
- **Fix**: Lowered requirements to `Rate >= 2, Power >= 2, Spread >= 1` via new `Balance.GODCHAIN.REQUIREMENTS` config
- `isGodchainActive()` now reads from config instead of hardcoded max levels

#### 3. Fix: Short level durations in Cycles 2-3
- **Root cause**: Player has maxed weapons by Cycle 2, killing enemies faster than designed
- **Fix**: Added `CYCLE_COUNT_MULT: [1.0, 1.25, 1.5]` — +25% enemies in Cycle 2, +50% in Cycle 3
- Increased `DIFFICULTY.CYCLE_BASE` scaling: C2 0.20→0.25, C3 0.55→0.60 for tougher enemies

## v4.6.0 - 2026-02-05
### Feature: GODCHAIN MODE + Meme Audit

#### 1. GODCHAIN MODE
- **Trigger**: All modifiers at max level with active timers (Shot=3, Rate=3, Power=3, Spread=2)
- **Red ship override**: Deep red color palette replaces standard ship when active
- **Red/orange aura**: Pulsing radial glow around ship during GODCHAIN
- **Fire trail bullets**: 3 flickering fire tongues trail behind every bullet
- **Speed bonus**: +5% movement speed while active
- **Activation sound**: Ascending power chord (low-high harmonic sweep)
- **Events**: `GODCHAIN_ACTIVATED` / `GODCHAIN_DEACTIVATED` via EventBus
- **Debug**: `dbg.godchain()` to force ON, `dbg.godchainStatus()` to inspect
- **Config**: All params in `Balance.GODCHAIN` (ship colors, aura, fire trail)

#### 2. Meme System Audit
- **New `MEMES.INTERMISSION` pool**: 20 curated best-of memes for countdown spotlight
- **Deduplication system**: `_pickDeduplicated()` tracks last 8 per context, no repeats
- **`MemeEngine.getIntermissionMeme()`**: Draws from dedicated pool with dedup
- **`MemeEngine.getWhisperMeme()`**: Draws from LOW pool with dedup
- **Pool cleanup**: Removed overlapping memes between INTERMISSION, LOW, HIGH, SAYLOR
- **Text overflow fix**: `ctx.fillText()` now uses `maxWidth` param (gameWidth - 40px)
- **Intermission selection**: Simplified priority (level dialogues > INTERMISSION pool)

## v4.5.0 - 2026-02-05
### Feature: Game Feel Overhaul — "Ogni Colpo Deve Pesare"

#### 1. Enemy Hit Reaction
- **White flash + micro-shake** (±2px, 0.06s) on every hit — enemies visibly react
- **Damage tint**: Progressive red overlay as HP drops below 50%
- **Smoke particles**: Low-HP enemies (<20%) emit grey smoke before dying
- `maxHp` tracked per enemy for tint calculation

#### 2. Contextual Bullet Impact Sparks
- **Colored sparks**: Inherit color from projectile (orange NORMAL, purple WIDE, etc.)
- **Scaled by shot level**: 4→6→8 particles at level 1→2→3
- **POWER modifier**: +50% spark size
- **Kill ring**: Expanding colored ring on lethal hits
- **HYPER ring**: Golden expanding ring during HYPER mode
- Sparks now fire on ALL bullet-enemy hits (was only on bullet-vs-bullet)

#### 3. Muzzle Flash Evolution
- **Shot level scaling**: Flash size grows +40% per level (1→2→3)
- **Weapon-colored**: Flash core matches weapon palette (orange, purple, blue, etc.)
- **Modifier-reactive**: POWER = bigger flash, RATE = smaller+faster
- **Level 3 ring burst**: Expanding ring on shot level 3
- **Radial lines scale**: 1 line at L1, 3 at L2, 5 at L3
- Muzzle particles also scale (5→7→9 by level)

#### 4. Tiered Enemy Explosions
- **Weak tier** (¥, ₽, ₹): Quick 6-particle pop, 1 ring, 2 debris
- **Medium tier** (€, £, ₣, ₺): 10 particles, shockwave ring, 4 debris
- **Strong tier** ($, 元, Ⓒ): 14 particles, white flash, double ring, 6 debris, +50% duration
- Shape-specific debris sizing (chunky for bars, thin for bills)
- Shockwave ring on medium/strong kills

#### 5. Trail Enhancement
- **POWER modifier glow**: Pulsing golden outer aura on any powered-up bullet
- **HYPER golden trail**: Two trailing golden sparkles on all bullets during HYPER mode
- `_isHyper` flag on bullets spawned during HYPER

#### 6. Screen Juice
- **Multi-kill flash**: White flash + slowmo when 2+ enemies killed in same frame
- **Strong-tier shake**: ±3px screen shake on $, 元, Ⓒ kills
- **HYPER ambient sparkles**: Random golden particles across screen during HYPER
- **Combo score scaling**: Floating score numbers grow with kill streak (>5 kills)
- MAX_PARTICLES raised from 120 to 180

#### Configuration
- New `Balance.VFX` section in BalanceConfig.js (all 6 systems tuneable)
- New `MULTI_KILL` flash in `Balance.JUICE.FLASH`
- `EFFECTS.PARTICLES.MAX_COUNT` updated to 180
- All effects canvas-based, no new DOM elements, respects v4.4 HUD zones

## v4.4.0 - 2026-02-05
### Feature: HUD Redesign — "Zero Distrazioni, Massima Informazione"

#### Phase 1: Message System Rationalization (12 channels → 5)
- **WAVE_STRIP**: Full-width transparent strip (Y=95) for wave/horde info with fade in/out
- **ALERT**: Unchanged danger (red) and victory (gold) center boxes
- **MEME_WHISPER**: Small italic canvas text (13px Courier, alpha 0.45) with upward drift — replaces DOM meme-popup
- **SHIP_STATUS**: Icon+text above player ship for perks/power-ups
- **FLOATING_TEXT**: Opt-in score numbers (unchanged)
- Removed: `#meme-popup` DOM, `#meme-ticker` DOM, `GAME_INFO` green box, `POWERUP_POPUP`
- All meme display now canvas-based (no DOM manipulation during gameplay)

#### Phase 2: Compact Top HUD
- **Single-row HUD** (45px vs 90px): `♥3 | 12,345 | LV 5`
- Removed verbose labels (LIVES, ACCOUNT BALANCE, LEVEL)
- Score reduced from 52px to 36px, still with orange glow
- Removed `#perk-bar`, `#weapon-icon`, `#kill-counter` DOM elements
- **GAMEPLAY_START** reduced from 145px to 65px (+80px more gameplay space)
- Boss `targetY` updated to 65+safeOffset (was 145)
- Formation `START_Y` reduced from 150 to 80

#### Phase 3: Diegetic Ship Elements (Player.js)
- **Life pips**: 3 small circles below ship (white=alive, grey=lost, red pulse at 1 life)
- **Shield cooldown ring**: Partial cyan arc showing cooldown progress around ship
- **Weapon level pips**: 3 triangles above ship showing shot level (with modifier color glow)
- **Special icon**: Replaces pips when special active, shows countdown arc
- **Graze proximity glow**: Pink glow at 75%+ meter, gold pulse at 100% (HYPER ready)
- All configurable via `Balance.DIEGETIC_HUD` with individual toggles

#### Phase 4: Reactive HUD
- **Score streak colors**: Green (10), gold (25), red (50) — 0.5s duration
- **HYPER score glow**: Gold pulsing shadow on score during HYPER mode
- **Lives danger**: Red pulse animation on heart+number when lives ≤ 1
- **Low-HP vignette**: Very subtle red edge vignette (alpha 0.05) via EffectsRenderer
- **Graze approaching**: Faster shimmer animation at 80%+ meter
- **Wave sweep**: 1px white horizontal line sweeps top-to-bottom on wave change
- All configurable via `Balance.REACTIVE_HUD` with individual toggles

| File | Changes |
|------|---------|
| `src/systems/MessageSystem.js` | Complete rewrite: 5-channel canvas system |
| `src/systems/MemeEngine.js` | Output for MEME_WHISPER (unchanged API) |
| `src/main.js` | Compact HUD, reactive state, diegetic data pass, removed weapon-icon |
| `index.html` | Compact HUD DOM, removed perk-bar/weapon-icon/kill-counter/meme-popup |
| `style.css` | Compact HUD styles, reactive CSS classes, removed old HUD styles |
| `src/config/BalanceConfig.js` | New: HUD_MESSAGES v4.4, DIEGETIC_HUD, REACTIVE_HUD |
| `src/entities/Player.js` | Diegetic drawing methods (_drawDiegeticHUD) |
| `src/entities/Boss.js` | targetY 145→65 for compact HUD |
| `src/systems/EffectsRenderer.js` | drawLowHPVignette() |

## v4.3.0 - 2026-02-05
### Feature: PWA Install Prompt Banner

- **Install banner** on splash screen for first-time visitors (non-standalone)
- **iOS detection**: Shows Share icon + "Add to Home Screen" instructions
- **Android/Chrome**: Intercepts `beforeinstallprompt`, shows native install button
- **Auto-dismiss**: Banner hides after 8 seconds or on close tap
- **localStorage persistence**: `fiat_pwa_dismissed` flag prevents re-showing
- **Localized**: EN/IT strings in Constants.js
- **Standalone skip**: Banner never shown if already installed as PWA

| File | Changes |
|------|---------|
| `index.html` | PWA install banner HTML inside `#intro-screen` |
| `style.css` | Banner styling (fixed bottom, gold border, fadeIn animation) |
| `src/main.js` | `beforeinstallprompt` listener, `checkPWAInstallPrompt()`, `dismissPWABanner()` |
| `src/utils/Constants.js` | PWA_INSTALL_IOS, PWA_INSTALL_ANDROID, PWA_INSTALL_BTN (EN/IT) |

## v4.2.2 - 2026-02-05
### Fix: Formation System Overhaul — Currency Rows, Symmetry, Entry Animation

#### Row-Based Currency Assignment (WaveManager.assignCurrencies)
- Currencies assigned **per row** (Y-proximity grouping, tolerance 25px), not per index
- Sorted weak→medium→strong before row assignment
- Removed 20% random swap that caused visual inconsistency

#### Symmetric Formation Thinning (WaveManager.generateFormation)
- Replaced even-step index sampling with row-based symmetric thinning
- Algorithm: find widest row (ties → lowest), pop rightmost, re-center on screen midpoint
- Example: DIAMOND 12→10 produces [1,2,2,2,2,1] — all rows bilaterally symmetric

#### X-Clamping — Crash-Down Prevention (WaveManager.generateFormation)
- Formations near screen edges triggered edge detection every frame → ~1200px/sec crash-down
- **Scale-to-fit** if formation span > safe area, **shift** if offset, **hard clamp** for outliers
- Safe margin: 30px (configurable `FORMATION.SAFE_EDGE_MARGIN`)

#### Grid Movement Blocked During Entry (main.js updateEnemies)
- `allSettled` flag: grid movement = 0 until ALL enemies complete entry animation
- Edge detection gated by `allSettled` — prevents premature drops during staggered entry

#### Entry Animation Tuning (BalanceConfig.js FORMATION_ENTRY)
- `ENTRY_SPEED`: 600 px/s — fast arrival, formation visible as intended shape
- `STAGGER_DELAY`: 0.04s — tight stagger, ~50% faster full formation entry
- `CURVE_INTENSITY`: 0.15 — near-straight paths, no sideways drift

#### Wave Definitions (BalanceConfig.js)
- Wave 1 Horde 2: PINCER → DIAMOND (consistent tutorial experience)

#### New Config Parameters (BalanceConfig.js FORMATION)
- `ROW_TOLERANCE`: 25 — Y tolerance for row grouping (currency assignment + thinning)
- `SAFE_EDGE_MARGIN`: 30 — minimum X margin from screen edge

## v4.1.2 - 2026-02-05
### Fix: Formations, Overlaps & Meme Readability

#### Formation Generator Fixes (Critical Bug)
- **DIAMOND**: Fixed `size = ceil(sqrt(count))` producing only 6/12 enemies; now iterates until diamond capacity >= count
- **ARROW**: Fixed `rows = ceil(count/3)` underfilling; now uses triangle capacity formula `rows*(rows+1)/2 >= count`
- **CHEVRON**: Fixed `rows = ceil(count/2)` giving capacity 2*rows-1 < count; now iterates correctly
- **FORTRESS**: Fixed `size = ceil(sqrt(count))` with perimeter capacity 4*(size-1)+1 < count; now iterates to fit
- **CROSS, STAIRCASE**: Removed early-cutoff guards that truncated shapes

#### Full Shape Generation + Even-Distribution Thinning
- All geometric generators now produce their FULL shape (no more bottom-row truncation)
- When shape capacity > count, even-distribution sampling preserves outline while thinning interior
- Diamonds close properly, chevrons reach their center point, staircases have full widest row

#### Safety Net (Universal Fill Pass)
- After every formation generator, if `positions.length < count`, extra rows are appended below
- Logs warning via DebugSystem when safety net activates
- Prevents any future formation from silently dropping enemies

#### Overlap Prevention (Y Factor Fixes)
- DIAMOND Y factor: 0.7 → 0.8 (68px gap, was 60px)
- CHEVRON Y factor: 0.6 → 0.75 (64px gap, was 51px - OVERLAP)
- PINCER Y factor: 0.7 → 0.8, X factor: 0.6 → 0.7
- GAUNTLET Y factor: 0.7 → 0.8
- FLANKING Y factor: 0.7 → 0.8
- STAIRCASE Y factor: 0.7 → 0.8
- FORTRESS factor: 0.8 → 0.85 (72px gap)

#### Meme Countdown Readability
- Font sizes increased: 14/12/10px → 16/14/12px
- Max chars before truncation: 45 → 50
- Breakpoints adjusted: >30/>20 → >40/>25 chars

## v4.1.1 - 2026-02-05
### Polish Pass: Visual & Balance Tweaks

#### Intermission Meme Merge
- Meme source changed from generic pool to curated Story dialogues (level-specific)
- Story dialogue box (bottom bar) suppressed during intermission - single display in countdown
- Boss defeat intermission uses boss-specific defeat quotes
- Gold color (#FFD700), auto-scaling font (14/12/10px based on length), quotation marks
- DialogueUI.hide() called on intermission start to prevent overlap

#### Wave 1-2 Enemy Count Buff
- Wave 1: 8+6=14 → 12+10=22 enemies (fills the screen better)
- Wave 2: 10+8=18 → 14+12=26 enemies (smoother progression)
- Still weak currencies only (¥₽₹), tutorial feel maintained

#### Formation Overlap Fix
- Base SPACING: 75 → 85 pixels (+13%, prevents enemy overlap in all formations)
- SPIRAL_RADIUS_STEP: 12 → 16 (+33%, fixes worst-case spiral overlap)

#### HUD Debug System
- New `dbg.debugHUD()` preset: enables overlay with HUD-relevant categories
- New `dbg.hudStatus()`: full HUD state snapshot in console (score, lives, graze, streak, player, shield, HYPER, weapon, messages, dialogue)
- New `dbg.toggleHudMsg(key)`: toggle HUD_MESSAGES flags at runtime (e.g. FLOATING_TEXT, MEME_POPUP)
- Debug overlay expanded with HUD section: score/lives, graze meter, kill streak, floating text/perk icon counts, player state (position, shield, HYPER, weapon), intermission countdown + meme preview, message/dialogue activity
- `G._hudState` exposed per-frame for debug overlay access
- Overlay background height now dynamic (620px when HUD data available)

---

## v4.1.0 - 2026-02-05
### Gameplay Polish: Rank System (Dynamic Difficulty)

New dynamic difficulty adjustment system that adapts to player skill in real-time.

#### Rank System (RankSystem.js)
- **Rank value**: -1.0 (struggling) to +1.0 (dominating), 0 = neutral
- **Rolling window**: 30-second performance tracking (kills/sec, grazes/sec)
- **Death penalty**: Rank drops -0.15 on death, resets momentum
- **Fire rate adjustment**: 0.8x (easy) to 1.2x (hard) enemy fire rate
- **Enemy count adjustment**: 0.85x (fewer) to 1.15x (more) enemies per wave
- **Convergence**: Rank slowly drifts to neutral over time
- **Labels**: EASY / GENTLE / NORMAL / HARD / BRUTAL

#### Integration Points
- HarmonicConductor: Fire rate multiplier applied to tempo
- WaveManager: Enemy count multiplier applied to wave spawning
- Debug overlay: Shows rank label, value, and multipliers

#### Configuration
```javascript
Balance.RANK = {
    ENABLED: true, WINDOW_SIZE: 30,
    FIRE_RATE_RANGE: 0.20, ENEMY_COUNT_RANGE: 0.15,
    DEATH_PENALTY: 0.15, CONVERGENCE_SPEED: 0.5
}
```

#### Files
- NEW: `src/systems/RankSystem.js`
- Modified: `main.js`, `HarmonicConductor.js`, `WaveManager.js`, `BalanceConfig.js`, `DebugSystem.js`, `index.html`, `sw.js`

---

## v4.0.4 - 2026-02-05
### HYPER Touch Button & Enemy Bullet Differentiation

#### HYPER Touch Button (Mobile)
- New circular gold button for HYPER mode activation on touch devices
- Positioned right side, matching shield button style
- Three states: hidden (meter < 100), ready (gold pulse), active (bright gold)
- Touch handler in InputSystem with same pattern as shield button

#### Enemy Bullet Tier Differentiation
- Reduced outer glow radius (-25%) for less visual noise
- Increased internal shape sizes (+15%) for better readability:
  - Coin ellipse: 0.8/0.4 → 0.9/0.5
  - Bill V-shape: 1.2/1.4 → 1.4/1.6
  - Bar ingot: 1.3/0.8 → 1.5/0.95
  - Card rectangle: 1.1/0.8 → 1.25/0.95

#### Files
- Modified: `index.html`, `style.css`, `InputSystem.js`, `main.js`, `Bullet.js`

---

## v4.0.3 - 2026-02-05
### Wave Choreography & Formations

#### Diversified Horde 2 Formations
All 15 waves now use complementary H1/H2 formation pairing:
- DIAMOND↔PINCER, ARROW↔CHEVRON, FORTRESS↔SCATTER, etc.
- Each horde presents a different spatial challenge

#### Horde 2 Notification
- Added "HORDE 2 INCOMING" message with WAVE_START flash
- Uses existing localization key `HORDE_2_INCOMING`

#### Smoothed Difficulty Curve (Cycle 1→2)
- CYCLE_BASE: [0.0, 0.30, 0.60] → [0.0, 0.20, 0.55]
- WAVE_SCALE: 0.03 → 0.04
- Jump reduced from +150% to +25% between cycles

#### STAIRCASE Formation Fix
- Rows now centered on screen width (was left-aligned from x=80)

#### Formation Config Extraction
- New `Balance.FORMATION` block with SPACING, START_Y, MARGIN, SPIRAL params
- WaveManager reads from config instead of hardcoded values

#### Files
- Modified: `BalanceConfig.js`, `WaveManager.js`, `main.js`

---

## v4.0.2 - 2026-02-05
### Fairness Fixes

#### BOJ Phase 3 Telegraph System
- Replaced random 8%/frame aimed burst with cooldown-based system
- 2.5s cooldown between interventions
- 0.4s telegraph: red dashed line + crosshair warning before burst
- Reduced: count 7→5, speed 320→240

#### BCE Phase 3 Barrier Gap Coordination
- Barrier 2 gap offset by PI from barrier 1 (guaranteed opposite side)
- Curtain gap follows safe corridor midpoint
- Always a navigable path through double barriers

#### ETH Ship Rebalance + Smart Contract
- Fire rate: 0.57s → 0.40s, Damage: 22 → 28, Hitbox: 8 → 7
- New "Smart Contract" mechanic: consecutive hits on same enemy within 0.5s give +15% stacking damage

#### Second Wind Perk (replaces Reinforced Plating)
- Old perk was useless in 1-hit system (added maxHpBonus)
- New effect: 0.5s invulnerability when shield expires

#### Close Graze Distinction
- CLOSE_RADIUS: 23 → 18px (7px gap from normal, was 2px)
- CLOSE_BONUS: 3 → 4 (4x multiplier)

#### Files
- Modified: `Boss.js`, `BalanceConfig.js`, `Constants.js`, `Upgrades.js`, `Player.js`, `main.js`

---

## v4.0.1 - 2026-02-05
### Bug Fixes & Quick Wins

#### Bug Fixes
1. **GLOBAL_BULLET_CAP path**: Fixed lookup from `Balance.ENEMY_FIRE?.PATTERNS` to `Balance.PATTERNS`
2. **Homing bullet speed**: Changed hardcoded `200` to `this.maxSpeed || 200`
3. **Boss homing missiles**: Added missing `isHoming`/`homingStrength`/`maxSpeed` property copy for boss bullets
4. **Horizontal bullet bounds**: Added `x < -100 || x > gameWidth + 100` check (bullets no longer persist off-screen)

#### Config Toggles
5. **STREAK_FLASH**: Enabled by default (was false)
6. **SCORE_PULSE**: Enabled by default (was false)
7. **Particle cap**: Increased from 80 to 120 (both ParticleSystem.js and BalanceConfig.js)

#### Files
- Modified: `main.js`, `Bullet.js`, `BalanceConfig.js`, `ParticleSystem.js`

---

## v4.0.0 - 2026-02-04
### Wave/Horde System Redesign - Complete Overhaul

Major redesign of the enemy wave spawning system for maximum variety and thematic gameplay.

#### 15 Unique Waves (5 per cycle × 3 cycles)
- **Cycle 1 "Awakening"**: Tutorial-friendly with 8-16 enemies per horde
  - Wave 1: First Contact (DIAMOND, weak currencies only)
  - Wave 2: European Dawn (ARROW, intro to Euro bloc)
  - Wave 3: Old World (PINCER, European mix)
  - Wave 4: Dollar Emerges (CHEVRON, intro to Dollar)
  - Wave 5: Global Alliance (FORTRESS, all major currencies)

- **Cycle 2 "Conflict"**: Learning difficulty with 14-20 enemies
  - Wave 1: Eastern Front (SCATTER, Asian currencies)
  - Wave 2: Brussels Burns (SPIRAL, Euro bloc)
  - Wave 3: Reserve War (CROSS, Dollar vs majors)
  - Wave 4: BRICS Rising (WALL, emerging markets)
  - Wave 5: Final Stand (GAUNTLET, strong currencies)

- **Cycle 3 "Reckoning"**: Skilled difficulty with 18-24 enemies
  - Wave 1: Digital Doom (VORTEX, CBDC focus)
  - Wave 2: Pincer Attack (FLANKING, mixed assault)
  - Wave 3: Escalation (STAIRCASE, weak→strong progression)
  - Wave 4: Eye of Storm (HURRICANE, chaotic all-mix)
  - Wave 5: Endgame (FINAL_FORM, ultimate challenge)

#### 16 Formation Patterns
New formations: DIAMOND, ARROW, PINCER, CHEVRON, FORTRESS, SCATTER, SPIRAL, CROSS, WALL, GAUNTLET, VORTEX, FLANKING, STAIRCASE, HURRICANE, FINAL_FORM (plus legacy: RECT, V_SHAPE, COLUMNS)

#### Horde Differentiation
- **Horde 1**: Standard behavior, normal entry, 1.0x fire rate
- **Horde 2**: +20% shield/teleport chance, rapid entry, 1.15x fire rate, different currencies

#### Thematic Currency Groups
- ASIAN_BLOC: ¥, 元, ₹
- EURO_BLOC: €, £, ₣
- EMERGING: ₽, ₹, ₺
- DOLLAR_ALLIES: $, €, £
- BRICS: ₽, ₹, 元
- DIGITAL_THREAT: Ⓒ, $, 元

#### Bear Market Scaling
- +25% enemy count in all waves
- Forces strong currencies ($ 元) in weak waves

#### Technical
- All wave config in `Balance.WAVE_DEFINITIONS`
- Helper functions: `getWaveDefinition()`, `getCurrencyBySymbol()`, `getHordeModifiers()`
- Full backward compatibility with legacy spawn system for cycles 4+

---


> **Versioni precedenti (v2.7.0 — v3.0.8)**: vedi [CHANGELOG_ARCHIVE.md](CHANGELOG_ARCHIVE.md)
