# Changelog

## v2.17.0 - 2026-02-03
### Screen Effects Modularization

**New: Centralized SCREEN_EFFECTS config in BalanceConfig.js**
```javascript
SCREEN_EFFECTS: {
    PLAYER_HIT_FLASH: true,    // Critical feedback
    BOSS_DEFEAT_FLASH: true,
    BOSS_PHASE_FLASH: true,
    STREAK_FLASH: false,       // Off by default
    GRAZE_FLASH: false,
    SCORE_PULSE: false,
    SCREEN_DIMMING: false,
    HYPER_OVERLAY: true,
    SACRIFICE_OVERLAY: true,
    LIGHTNING: true,
    BEAR_VIGNETTE: true
}
```

**Removed: Screen Dimming default behavior**
- Was darkening screen up to 35% with many bullets
- Caused perception of "lag" or "blur"
- Now OFF by default, configurable via SCREEN_DIMMING toggle

**Reduced: Flash opacities across the board**
- PLAYER_HIT: 0.30 → 0.15
- BOSS_PHASE: 0.50 → 0.25
- HYPER_ACTIVATE: 0.40 → 0.20
- All streak flashes: reduced 30-40%

**Architecture: All effects now config-driven**
- EffectsRenderer.js reads SCREEN_EFFECTS toggles
- SkyRenderer.js reads SCREEN_EFFECTS for lightning/vignette
- Easy to enable/disable any effect without code changes

---

## v2.16.1 - 2026-02-03
### Brightness Smoothing: Frame-Rate Independent Effects

**Fixed: Effects not frame-rate independent**
- `EffectsRenderer.js`: `shake -= 1` → `shake -= dt * 60`
- `EffectsRenderer.js`: `flashRed -= 0.02` → `flashRed -= dt * 1.2`
- Now decays at consistent rate on 60Hz/120Hz/144Hz displays

**Fixed: Screen flash harsh onset**
- Changed from linear decay to ease-out quadratic curve
- Flash now fades more naturally (fast start, slow end)

**Fixed: Lightning flash instant jump**
- Added `lightningTarget` system for smooth ramp-up (~0.03s)
- Lightning now ramps to peak then decays (no harsh jump)

---

## v2.16.0 - 2026-02-03
### Performance Polish: GC Churn & Hot Path Optimization

**Fixed: Player.js trail causing ~120 GC allocations/sec**
- Pre-allocated circular buffer for trail positions
- Eliminated `.filter()`, `.shift()`, `.forEach()` in hot path
- Reuse existing array references instead of creating new objects

**Fixed: Bullet.js homing missiles calling sqrt() per enemy**
- Use distance squared for nearest-target comparison
- Only one sqrt call per homing bullet per frame
- Eliminated object literal allocation for target position

**Fixed: InputSystem.js creating arrays on every touch event**
- Replaced `Array.from(e.changedTouches).find()` with direct iteration
- Eliminates 30-60 array allocations per second on mobile

**Fixed: main.js updateEnemies() with redundant forEach loops**
- Consolidated two `.forEach()` into existing for loop
- Cached player position and hitbox size outside loop
- Reduced enemy array iterations from 3 to 1 per frame

**Estimated Performance Impact**
- ~30-40% frame time reduction on mobile devices
- Smoother 60fps during heavy bullet hell sequences
- Reduced GC micro-stuttering

---

## v2.15.9 - 2026-02-03
### Hotfix: Back to Intro Screen

**Fixed: Blank screen when exiting to title**
- intro-screen had `opacity: 0` from launch animation, never reset
- Now resets opacity, pointerEvents, transform for all intro elements
- Fixes title, tapBtn, intro-icons, intro-version visibility

---

## v2.15.8 - 2026-02-03
### Hotfix: HUD Score & EXIT Button

**Fixed: SALDO CONTO not aligned with VITE/LIVELLO**
- `.hud-score` had `top: 5px` absolute positioning ignoring safe-area
- Now uses `var(--pwa-top-inset)` like other HUD elements

**Fixed: EXIT button selector**
- Added `id="btn-exit-title"` for reliable selection
- Fixed updateUIText to preserve ">" prefix

---

## v2.15.7 - 2026-02-03
### Hotfix: Dynamic Island Safe Area

- Increased PWA top inset from 47px to 59px
- 47px was not enough for iPhone 14 Pro Dynamic Island

---

## v2.15.6 - 2026-02-03
### Hotfix: PWA Notch Safe Area

**Fixed: HUD covered by iOS status bar in PWA mode**
- Added `--pwa-top-inset` CSS variable set by JS
- Forces minimum 47px padding for iOS status bar
- `env(safe-area-inset-top)` returns 0 in PWA standalone mode

---

## v2.15.5 - 2026-02-03
### Hotfix: Launch Animation Crash

**Fixed: ReferenceError destroyTargets is not defined**
- `destroyTargets` array was used but never declared
- Added declaration and population during element explosion

---

## v2.15.4 - 2026-02-03
### Sprint 24 Phase D: I18N & Assets

**Complete I18N Support**
- Added 10 new translation keys for UI elements
- EN: ACCOUNT_BALANCE, KILLS, GRAZE, CHOOSE_SHIP, TAP_START, HIGH_SCORE, ARCADE, CAMPAIGN, LAUNCH
- IT: SALDO CONTO, UCCISIONI, GRAZE, SCEGLI LA NAVE, TOCCA PER INIZIARE, RECORD, ARCADE, CAMPAGNA, LANCIA
- Updated index.html with proper IDs for all translatable elements
- Extended updateUIText() to translate intro screen and HUD labels

**Privacy Policy**
- Created PRIVACY.md with complete privacy policy
- Documents localStorage-only data storage
- No tracking, no analytics, no ads

**New App Icon**
- Created icon-512.svg (vector source)
- Replaced icon-512.png with proper PNG (was JPEG)
- Ship design matches current in-game graphics

**Files Changed**
- `src/utils/Constants.js`: Added I18N keys + version bump
- `src/main.js`: Extended updateUIText()
- `index.html`: Added IDs for translatable elements
- `PRIVACY.md`: New file
- `icon-512.svg`: New file
- `icon-512.png`: Replaced

---

## v2.15.3 - 2026-02-03
### Sprint 24 Phase C: Code Cleanup

**Console.log Cleanup**
- Removed non-essential logs: "Starting App...", "[InputSystem] Shield button created"
- Debug mode toggle now only logs when enabled
- GameCenter mock log commented out for production
- Kept console.warn/error for real issues (AudioSystem, CampaignState, Bullet pool)

**Version Sync Documentation**
- Added cross-reference comments in Constants.js and sw.js
- Updated CLAUDE.md with explicit 5-step version bump procedure
- Version sync now mandatory in end-of-session checklist

**Asset Error Handling** - Already implemented correctly
- `loadAssets()` has console.warn for failures (main.js:62)
- Alpha validation for images (main.js:56)

**Files Changed**
- `src/main.js`: Removed debug logs
- `src/core/InputSystem.js`: Removed shield button creation log
- `src/utils/Constants.js`: Version + sync comment
- `sw.js`: Version + sync comment
- `CLAUDE.md`: Updated checklist with sw.js

---

## v2.15.2 - 2026-02-03
### Sprint 24 Phase A+B: Code Quality & iOS Fixes

**Fixed: DialogueUI Memory Leak Prevention**
- Added `_listenersAttached` flag to prevent duplicate event listeners
- Stored handler references (`_onClickHandler`, `_onTouchHandler`) for cleanup
- Added `destroy()` method for complete cleanup
- Added `{ passive: false }` to touchstart listener

**Fixed: InputSystem Passive Listeners**
- Shield button touchstart/touchend now have `{ passive: false }` (required for preventDefault)
- General touchend now explicitly has `{ passive: true }` for consistency

**Audit Results**
- Memory leak A2 (InputSystem debug handler): Already correctly implemented
- Timer cleanup A3: All timers are one-shot, no cleanup needed
- AudioContext B1: Design is correct (explicit unmute required)
- Safe area B3: Already implemented via orientationchange handler

**Files Changed**
- `src/story/DialogueUI.js`: Listener protection + destroy method
- `src/core/InputSystem.js`: Passive listener compliance
- `src/utils/Constants.js`: Version bump
- `sw.js`: Version sync

---

## v2.15.1 - 2026-02-03
### Hotfix: Post-Refactor Bug Fixes

**Fixed: Game Crash on Start**
- `gameInfoMessages is not defined` error in startGame()
- MessageSystem.reset() now called instead of direct variable access

**Fixed: Black Background in INTRO**
- SkyRenderer.init() now called in startApp() for INTRO state
- Sky renders correctly during SPLASH and SELECTION screens

**Fixed: Launch Animation Glitch**
- UI elements now explode immediately on LAUNCH tap (staggered)
- intro-screen hidden after explosions to prevent visual artifacts
- Removed collision-based destruction that caused overlay issues

**Improved: Service Worker Updates**
- Rewrote sw.js with proper versioning (synced with Constants.js)
- Network-first strategy for HTML/JS/CSS ensures fresh content
- skipWaiting() + clients.claim() for immediate activation
- Complete asset list (was missing 20+ module files)
- Old caches properly deleted on version change

**Files Changed**
- `src/main.js`: Fixed MessageSystem integration, SkyRenderer init, launch animation
- `src/utils/Constants.js`: Version bump to 2.15.1
- `sw.js`: Complete rewrite with network-first strategy

---

## v2.15.0 - 2026-02-03
### Sprint 23.4: main.js Decomposition

**New: SkyRenderer.js Module** (~400 lines)
- Parallax clouds, hills, floating crypto symbols
- Star field with twinkle animation
- Bear Market lightning and blood rain effects
- Level-based sky color progression (5 levels + boss)

**New: TransitionManager.js Module** (~140 lines)
- Screen fade transitions with callback support
- Wipe line visual effect during transitions
- `startFadeOut(alpha, color)` for dramatic effects

**New: MessageSystem.js Module** (~270 lines)
- DOM popups: showMemeFun, showPowerUp, showMemePopup
- Canvas typed messages: showGameInfo, showDanger, showVictory
- Priority queue with cooldown for popup overlap prevention

**Refactored: main.js**
- Extracted 3 modules totaling ~810 lines
- main.js: 4630 → 4033 lines (-13%)

**Deferred: PerkManager.js**
- Tightly coupled to runState, player, UI elements
- Will extract in Sprint 23.5 with better state management

**Files Changed**
- NEW: `src/systems/SkyRenderer.js`
- NEW: `src/systems/TransitionManager.js`
- NEW: `src/systems/MessageSystem.js`
- `src/main.js`: Sky, transition, message code removed
- `index.html`: Added new module scripts

---

## v2.14.2 - 2026-02-02
### Sprint 23.3: System Extraction - EffectsRenderer

**New: EffectsRenderer.js Module**
- Extracted all screen effects from main.js into centralized module
- Screen shake system with decay and transform application
- Impact flash (red overlay) for damage feedback
- Screen flash system with color, opacity, duration control
- Score pulse edge glow effect for milestone feedback
- Hit stop system (freeze/slowmo) for impact emphasis
- HYPER and Sacrifice mode overlays
- Vignette effect for atmosphere

**Interface:**
- Triggers: `applyShake()`, `applyImpactFlash()`, `applyHitStop()`, `setHitStop()`
- Triggers: `triggerScreenFlash()`, `triggerScorePulse()`, `checkScorePulse()`
- Drawing: `applyShakeTransform()`, `drawImpactFlash()`, `drawScreenFlash()`
- Drawing: `drawScorePulse()`, `drawHyperOverlay()`, `drawSacrificeOverlay()`, `drawVignette()`
- State: `getShake()`, `getHitStopTimer()`, `isHitStopActive()`

**Refactored: main.js Effects Code**
- All effect functions now delegate to `G.EffectsRenderer`
- Removed local effect state variables (flashRed, screenFlash*, scorePulseTimer, hitStop*)
- Game loop uses `EffectsRenderer.update()` for hit stop time modification
- Death sequences use EffectsRenderer methods
- Vibration fallback uses `applyImpactFlash()`

**Global Compatibility:**
- `G.applyHitStop` and `G.triggerScreenFlash` exposed for external callers

**Files Changed**
- NEW: `src/systems/EffectsRenderer.js` (~330 lines)
- `src/main.js`: Effects code replaced with delegations
- `index.html`: Added EffectsRenderer.js script

**Deferred: UIRenderer.js**
- Planned extraction deferred to Sprint 23.4 (main.js decomposition)
- HUD is DOM-based (HTML elements), not canvas-drawn
- Canvas UI functions (`drawHyperUI`, `drawSacrificeUI`) tightly coupled to game state
- Better to extract during main.js refactoring when state management improves

---

## v2.14.1 - 2026-02-02
### Sprint 23.2: System Extraction - ParticleSystem

**New: ParticleSystem.js Module**
- Extracted all particle logic from main.js into centralized module
- Manages internal particle array with proper lifecycle
- 12 particle creation functions: `createExplosion`, `createGrazeSpark`, `createBulletSpark`, etc.
- `update()` and `draw()` methods for game loop integration
- `init()`, `setDimensions()`, `clear()` for lifecycle management

**Refactored: main.js Particle Code**
- All particle functions now delegate to `G.ParticleSystem`
- Reduced main.js by ~350 lines of particle code
- Debug display uses ParticleSystem.getCount()
- Game reset uses ParticleSystem.clear()

**Files Changed**
- NEW: `src/systems/ParticleSystem.js` (~450 lines)
- `src/main.js`: Particle functions replaced with delegations
- `index.html`: Added ParticleSystem.js script

---

## v2.14.0 - 2026-02-02
### Sprint 23.1: Quick Wins - Code Quality & Performance

**New: MathUtils.js Module**
- Centralized math utilities replacing 11+ duplicated distance calculations
- `distance()`, `distanceSquared()`, `magnitude()`, `normalize()`
- `direction()`, `velocityTowards()`, `angleBetween()`, `angleToVelocity()`
- `clamp()`, `clampMagnitude()`, `clampToRadius()`, `isWithinDistance()`, `lerp()`
- Added `CircularBuffer` class for fixed-size collections

**Optimized: floatingTexts Array**
- Replaced O(n) `shift()` with O(1) slot-based insertion
- `findFloatingTextSlot()` reuses expired/empty slots
- Unified limit to MAX_FLOATING_TEXTS = 8
- No more array element shifting on every add

**Improved: AudioSystem Guard Clauses**
- Added null check for AudioContext support
- Validates createGain/createDynamicsCompressor results
- Safe getOutput() handles null ctx gracefully
- Prevents undefined errors on unsupported browsers

**Optimized: ParticlePool Stack Pointer Pattern**
- `acquire()`: O(n) find → O(1) stack pointer increment
- `release()`: O(1) swap with last active
- `getActive()`: O(n) filter → O(1) slice
- `activeCount`: O(n) filter → O(1) direct read
- Added `clear()` method for game restart

**Files Changed**
- NEW: `src/utils/MathUtils.js`
- `src/main.js`: floatingTexts optimization
- `src/core/AudioSystem.js`: guard clauses
- `src/core/ObjectPool.js`: ParticlePool stack pattern
- `index.html`: Added MathUtils.js script

---

## v2.13.2 - 2026-02-02
### Bug Fixes: iOS Button Overlap & HUD Message Box Rendering

**iOS Intro Screen**
- `.intro-icons`: Added `env(safe-area-inset-bottom)` and reduced from 100px to 70px
- `.intro-version`: Added `env(safe-area-inset-bottom)` and reduced from 30px to 20px
- Fixes mute/settings/manual buttons overlapping LAUNCH button on iOS

**HUD Message Boxes (Canvas)**
- Fixed `ctx.measureText()` called BEFORE `ctx.font` was set
- GAME_INFO, DANGER, VICTORY messages now measure text width correctly
- Boxes now properly fit the text content

---

## v2.13.1 - 2026-02-02
### iOS Safari Safe Area Compatibility

**CSS Safe Area Support**
- `.hud-top-bar`: Added `env(safe-area-inset-top)` padding for notched devices
- `#perk-bar`: Position now respects top safe area inset
- `#joystick`: Position now respects bottom safe area inset (home bar)
- `.touch-shield-btn`: Position now respects bottom safe area inset
- `#pause-btn`: Position now respects bottom safe area inset
- `#control-toast`: Position now respects bottom safe area inset

**JavaScript Safe Area Offset**
- `BalanceConfig.js`: Added `UI.SAFE_OFFSET` and `UI.GAMEPLAY_START_SAFE` dynamic getters
- `WaveManager.js`: Enemy spawn Y now includes `safeAreaInsets.top` offset
- `Boss.js`: Boss `targetY` now includes `safeAreaInsets.top` offset

**Benefits**
- HUD elements no longer hidden under iOS notch
- Touch controls no longer blocked by iOS home bar
- Enemy grid and boss spawn below safe area on notched devices
- Desktop experience unchanged (env() returns 0px by default)

---

## v2.13.0 - 2026-02-02
### Phase 23: Enemy Firing System Refactor

**Breaking Change: Unified Firing Authority**
- Removed legacy Fibonacci firing system entirely
- HarmonicConductor is now the SOLE authority for enemy firing
- All waves guaranteed to have beat-synced attack patterns

**HarmonicSequences.js**
- Added `DEFAULT_BASIC` fallback sequence (guarantees enemies always fire)

**HarmonicConductor.js**
- `setSequence()` now never leaves `currentSequence` null (triple fallback)
- Fixed BURST pattern handling with direct setTimeout (no longer relies on attemptFire)

**main.js**
- Removed: `fibonacciIndex`, `fibonacciTimer`, `enemiesAllowedToFire`, `FIBONACCI_SEQ`
- Removed: `enemyFirePhase`, `enemyFireTimer`, `enemyFireStride`, `enemyShotsThisTick`
- Removed: Legacy firing loop in `updateEnemies()`
- Cleaned up: Reset code in 3 locations (resetState, post-miniboss, wave spawn)

**Enemy.js**
- Removed: `attemptFire()` method (now dead code)
- Kept: `buildBullet()` (used by HarmonicConductor)

**BalanceConfig.js**
- Removed: `ENEMY_FIRE.STRIDE`, `MAX_SHOTS_PER_TICK`, `FIBONACCI_INTERVAL`
- Kept: `BULLET_SPEED_BASE`, `BULLET_SPEED_SCALE`

**Benefits**
- Simpler codebase (one firing system instead of two)
- Consistent beat-synced enemy attacks
- No more "conductorEnabled" branching logic
- Easier to tune via HarmonicSequences

---

## v2.12.3 - 2026-02-02
### Phase 22 Sprint 4: Satoshi's Sacrifice

**New Feature: Satoshi's Sacrifice (Ultimate Last Stand)**
- When at 1 life and about to die, player can sacrifice ALL score
- 2-second decision window with 0.25x slow-mo
- Golden pulsing sacrifice button with Bitcoin symbol
- Press SPACE to accept sacrifice

**Sacrifice Mode Mechanics**
- 10 seconds of TOTAL INVINCIBILITY (walk through bullets)
- 10x score multiplier on all kills
- Grazing disabled (bullets pass through)
- White ethereal glow and ghost trail on player
- Large countdown timer "SATOSHI MODE"

**Outcome System**
- Success (earn >= sacrificed score): "SATOSHI APPROVES 💎" + extra life
- Failure (earn < sacrificed score): "NGMI 📉" but player survives
- Real-time progress tracker showing earned vs needed

**Visual Effects**
- Decision overlay with dark background
- Glowing Bitcoin sacrifice button
- Player white glow during sacrifice mode
- Ghost trail following player
- White screen tint during sacrifice

**New Audio**
- `sacrificeOffer` - Heartbeat + tension drone
- `sacrificeActivate` - White noise burst + holy chord
- `sacrificeSuccess` - Triumphant fanfare (C major arpeggio)
- `sacrificeFail` - Sad descending tone

**Balance Config**
- New `Balance.SACRIFICE` section with all parameters
- DECISION_WINDOW: 2.0s, INVINCIBILITY_DURATION: 10s
- SCORE_MULT: 10x, SUCCESS_BONUS_LIVES: 1

**Files Modified**
- `BalanceConfig.js` - SACRIFICE config section
- `main.js` - Sacrifice state machine, collision bypass, UI drawing
- `AudioSystem.js` - 4 new sacrifice sounds

---

## v2.12.2 - 2026-02-02
### Phase 22 Sprint 3: Wave Choreography

**New Feature: Wave Intensity System**
- Setup Phase (0-30%): Normal fire rate, learning time
- Build Phase (30-70%): 1.1x fire rate, increasing pressure
- Build Late Phase (70-85%): 1.2x fire rate
- Panic Phase (85%+): 1.4x fire rate, red vignette overlay
- Automatic phase detection based on enemies killed

**Last Enemy Bonus**
- 0.8s dramatic pause when one enemy remains
- 2x score multiplier for final kill
- Gold flash and hit stop on last enemy death
- "LAST FIAT!" message with multiplier display

**Telegraph Enhancements**
- Configurable opacity via Balance.CHOREOGRAPHY.TELEGRAPH
- Gap highlighting for safe corridors (green vertical lanes)
- Panic phase red vignette indicator
- All telegraph colors/timing now centralized

**Balance Config**
- New `Balance.CHOREOGRAPHY` section with:
  - ROW_FIRE_DELAY, MAX_ROWS
  - INTENSITY phases (SETUP_END, BUILD_END, PANIC_START, PANIC_RATE_MULT)
  - TELEGRAPH settings (ENABLED, DURATION, OPACITY, COLOR, GAP_GLOW)
  - PATTERN_DEFS for ARC, WALL, AIMED, RAIN

**Files Modified**
- `BalanceConfig.js` - CHOREOGRAPHY config section
- `HarmonicConductor.js` - Wave intensity tracking, phase detection, gap telegraphs
- `main.js` - startWave integration, last enemy bonus

---

## v2.12.1 - 2026-02-02
### Phase 22 Sprint 2: Hit Stop + Visual Juice

**New Feature: Hit Stop System (Ikeda Philosophy)**
- Micro-freeze on every enemy kill (25ms) for impact weight
- Longer hit stops on kill streaks (10/25/50 kills = 120/180/250ms)
- Boss phase transition hit stop (300ms)
- Boss defeat epic slowmo (500ms)
- Close graze micro-freeze (20ms)
- Player damage slowmo (80ms)

**Screen Flash System**
- Close graze white flash
- HYPER activation gold flash
- Streak milestones (cyan/gold/purple)
- Boss phase orange flash
- Boss defeat white flash
- Player hit red flash

**Score Pulse System**
- Golden edge glow every 10,000 points
- Radial gradient from center to edges
- Fade animation over 0.25s

**Floating Score Numbers**
- Gold "+X" numbers float up on significant scores
- Scale based on score magnitude (1x/1.5x/2x)
- Fade out with outline for readability
- Shows on enemy kills (>100) and boss defeat

**Balance Config**
- New `Balance.JUICE` section with HIT_STOP, FLASH, SCORE_PULSE, FLOAT_SCORE
- Functions exposed globally: `window.Game.applyHitStop`, `window.Game.triggerScreenFlash`

**Files Modified**
- `BalanceConfig.js` - JUICE config section
- `main.js` - Hit stop, flash, pulse, floating scores
- `Boss.js` - Phase transition juice calls

---

## v2.12.0 - 2026-02-02
### Phase 22 Sprint 1: HYPER GRAZE System

**New Feature: HYPER Mode**
- When graze meter reaches 100%, player can activate HYPER mode (press H key)
- HYPER lasts 5 seconds base, extended by 0.3s per graze during HYPER
- All scores multiplied by 5x during HYPER (kills and grazes)
- Core hitbox 50% larger during HYPER (increased risk)
- Instant death if hit during HYPER (bypasses lives/shield)
- 8 second cooldown after HYPER ends before meter can refill
- Slight time dilation (0.92x speed) for better bullet reading

**HYPER Visual Effects**
- Intense golden aura around player
- Timer ring showing remaining HYPER time
- Pulsing "HYPER READY [H]" indicator when available
- Golden screen tint during HYPER
- Enhanced particle bursts on HYPER grazes

**New Audio**
- `hyperReady` - Epic ascending chord when meter fills
- `hyperActivate` - Massive power chord on activation
- `hyperDeactivate` - Power-down sound when HYPER ends
- `hyperWarning` - Urgent ticks in final 2 seconds
- `hyperGraze` - Higher pitch satisfying graze during HYPER

**Balance Config**
- New `Balance.HYPER` section with all parameters
- Updated `Balance.GRAZE` with sound throttle (50ms) and pitch settings
- Dynamic hitbox via `player.getCoreHitboxSize()`

**Files Modified**
- `BalanceConfig.js` - HYPER config section
- `Player.js` - HYPER state, visuals, methods
- `main.js` - Activation logic, score multipliers, UI
- `AudioSystem.js` - 5 new HYPER sounds

---

## v2.11.1 - 2026-02-02
### Campaign Mode Fix

**Bug Fix**
- Fixed campaign completion triggering after defeating just one boss
- Root cause: localStorage retained defeated boss states from previous sessions
- Campaign now auto-resets when already complete (on mode select or game start)

---

## v2.11.0 - 2026-02-02
### Technical Revision - Bug Fixes

**Critical Fixes**
- Fixed division by zero in Bullet homing logic when bullet and target coincide (Bullet.js:78)
- Fixed startDeathSequence double-release bug causing wasted cycles (main.js:2894)

**High Priority Fixes**
- Fixed lastGrazeTime initialization causing immediate decay on game start (main.js:1854)
- Fixed pool indexOf safety issue that could remove wrong element if index was -1 (main.js:521)
- Added fallback for bullet speed normalization to prevent NaN from stationary bullets (Bullet.js:88)

**Code Quality**
- Conservative approach: only defensive fixes, no gameplay changes
- All fixes use guard clauses and fallback values

---

## v2.10.0 - 2026-02-02
### Interactive Player Manual

**New Feature: In-Game Manual**
- Full player manual accessible from intro screen and pause menu
- 6 tabs: Welcome, Controls, Power-Ups, Enemies, Bosses, Pro Tips
- Arcade/crypto visual style with Bitcoin gold accents
- Bilingual support (EN/IT) with real-time language switching
- Responsive design for mobile screens

**Manual Content**
- Welcome: Game loop, win/lose conditions, Bear Market mode
- Controls: PC keyboard + Mobile touch tables
- Power-Ups: 7 weapon types + 3 ship boosts with icons
- Enemies: 10 fiat currencies organized by tier (Weak/Medium/Strong)
- Bosses: FED, ECB, BOJ with 3-phase system explained
- Pro Tips: HODL mode, Grazing, Shield tactics, Boss drops

**UI Changes**
- New book icon button in intro screen (alongside mute/settings)
- New MANUAL button in pause menu
- ~80 new localization keys for EN and IT

---

## v2.9.2 - 2026-02-02
### Bug Fixes & Game Cycle Rationalization

**Crash Fixes**
- Added null safety checks to all entity iteration loops (enemies, bullets, powerUps)
- Prevents crashes when arrays are modified during iteration (e.g., post-boss transition)

**Mini-Boss System Fix**
- Mini-boss now properly freezes wave spawning (`miniBossActive` flag)
- Enemies saved before mini-boss, restored after defeat
- Fibonacci firing reset when enemies restored (prevents instant full-rate fire)
- Global references (`G.enemies`, `window.Game.enemies`) updated correctly

**Game Cycle Rationalization**
- Level increments once per wave completed (removed duplicate increment on boss defeat)
- `window.currentLevel` updated before `spawnWave()` for correct enemy HP scaling
- Clear progression: 5 waves → boss → cycle++ → repeat

**Story System Verified**
- All dialogue triggers working (ship select, level complete, boss intro/phase/defeat, game over)
- DialogueUI with typewriter effect and speaker colors
- Full dialogue data for 3 ships, 5 levels, 3 bosses

---

## v2.9.1 - 2026-02-02
### Intro Screen Redesign

**Unified Two-Phase Intro**
- Single screen with element show/hide (no page jump)
- Splash state: Title + BTC ship + TAP TO START
- Selection state: Ship arrows + stats + mode toggle + LAUNCH
- Smooth transition - ship stays in place while UI elements fade in/out

**Ship Preview**
- Detailed cell-shaded rendering (matches in-game ship)
- 4-layer animated reactor flames
- Two-tone body with shadow/highlight
- Fins, cockpit, and crypto symbol

**UI Polish**
- TAP TO START button with shine sweep effect and pulse animation
- Yellow cell-shaded icon buttons restored (mute/settings)
- Staggered fade animations for selection elements
- Responsive font sizes with clamp()

---

## v2.9.0 - 2026-02-02
### Phase 20: Gameplay Redesign (Complete)

**Difficulty System**
- Stepped difficulty progression per cycle (0.0 → 0.30 → 0.60)
- Bear Market now additive bonus (+0.25) instead of multiplier
- 5 waves per cycle, 3 cycles = complete run (~12 min)

**Scoring System**
- Kill streak multiplier (+10%/kill, max 2x, 2s timeout)
- Graze-kill synergy (+50% bonus for kills during high graze)
- Grazing as primary score source (25 base points, 3x close bonus)

**Boss System (Centralized in Balance.BOSS)**
- HP formula: 1000 + level*30 + cycle*400 (+12% per player perk)
- Fire rates per phase per boss type
- Movement speeds per phase per boss type
- Minion spawn rates configurable

**Power-Up System**
- Differentiated durations: base 10s, advanced 8s, elite 6s
- Drop rate scaling with cycle progression
- Pity timer decreases with cycle

**HUD Messages Redesign**
- GAME_INFO: Green box at top (level/wave progression)
- DANGER: Red pulsing center (boss warnings)
- VICTORY: Gold glow center (boss defeated)
- Each type independent, visually distinct at a glance

**Level Progression**
- WaveManager uses Balance.WAVES.PER_CYCLE
- Added WAVE4 ("CORRECTION") and WAVE5 ("CLIMAX") messages
- Perk system values centralized (CANCEL_WINDOW, PERK_ICON_LIFETIME)

**UI Improvements**
- Compact intro screen ship preview (canvas 200→140, container 290→190px)
- Smaller ship selection arrows

---

## v2.8.2 - 2026-02-02
### New Modules (System Consolidation)
- **DropSystem.js**: Unified power-up drop management
  - Enemy kill drops (tier-based chances)
  - Boss hit drops (periodic power-ups)
  - Pity timer system (guaranteed drop after N kills)
  - Weapon vs Ship selection logic
  - Singleton: `window.Game.DropSystem`

- **MemeEngine.js**: Unified meme selection & display
  - Random meme selection (general, Saylor, boss-specific)
  - Enemy death memes, streak milestone memes
  - Power-up feedback memes (all weapon/ship types)
  - Popup queue management with priority system
  - Singleton: `window.Game.MemeEngine`

### BalanceConfig Extensions
- **Extended sections**: DROPS (ship types), BOSS (phases), SCORE, MEMES, TIMING, EFFECTS, UI, HITBOX, POWERUPS, WAVES
- **New helper functions**:
  - `getShakeIntensity(event)` - Screen shake values
  - `getGrazeMultiplier(grazeMeter)` - Score multiplier
  - `getStreakMilestone(streak)` - Kill streak rewards
  - `getRandomLightningInterval()` - Ambient effect timing
  - `getBossPhase(hpPercent)` - Phase detection
  - `getBossPhaseSpeed(bossType, phase)` - Movement speeds

### main.js Migration
- Meme functions now delegate to MemeEngine
- Drop logic now delegates to DropSystem
- All timing values now use Balance.TIMING.*
- All effect intensities now use Balance.EFFECTS.*
- HODL damage multipliers now use Balance.SCORE.HODL_MULT_*
- Removed all redundant drop/meme variables

### Code Cleanup
- Removed all external style references from comments (replaced with technical terms)
- Removed historical "was X" value comments from code
- Standardized visual style terminology to "cell-shaded"
- Renamed `BULLET_HELL_COLORS` to `PROJECTILE_COLORS` (with backwards-compatible alias)
- Cleaned up commented-out code and obsolete notes
- Fixed touch controls flash bug with opacity-based transition

---

## v2.8.1 - 2026-02-02
### Code Maintenance & Refactoring
- **BalanceConfig.js**: New centralized balance configuration module
  - Single source of truth for all gameplay tuning parameters
  - Eliminates duplicate formulas across files (prevents regression bugs)
  - Helper functions: `calculateDifficulty()`, `calculateGridSpeed()`, `calculateEnemyHP()`, `calculateBulletSpeed()`
  - All constants now accessible via `window.Game.Balance.*`

- **ColorUtils.js**: New consolidated color utilities module
  - Replaced 6 duplicate implementations across entity files
  - Functions: `darken()`, `lighten()`, `lightenPercent()`, `hexToRgb()`, `hexToRgba()`, `withAlpha()`
  - Accessible via `window.Game.ColorUtils.*`

### Dead Code Removal
- Removed unused variables: `displayScore`, `timeScale`, `currentMeme`
- Removed 25 lines of unreachable code in `renderPerkBar()`

### Files Refactored
- `main.js` - All balance constants now reference Balance.*
- `WaveManager.js` - Uses Balance.calculateEnemyHP()
- `Player.js` - Physics uses Balance.PLAYER.*
- `Enemy.js` - Kamikaze speed uses Balance.ENEMY_BEHAVIOR.*
- Entity files (Enemy, Boss, Player, PowerUp, Bullet) - Color methods use ColorUtils

### Documentation
- Updated CLAUDE.md with Balance and ColorUtils references
- Added complete parameter tables for all Balance sections

---

## v2.8.0 - 2026-02-01
### Balance Overhaul
- **Boss HP drastically reduced**: 5500 → 2000 base HP (-64%)
- **Boss fire rate slowed**: Phase 2/3 fire timers doubled for fairer fights
- **Boss fights now ~5-8 seconds** instead of 15+ seconds
- Mini-boss threshold: 100 → 30 kills (actually spawns now)
- Perk cooldown: 8s → 4s (more perks per wave)
- Graze threshold: 120 → 60 (achievable)
- Weapon drop cooldown: 8s → 5s

### HarmonicConductor Cleanup
- Removed bullet-hell patterns (spiral, curtain, flower) from normal waves
- Normal waves now use enemy-based firing only (SYNC_FIRE, SWEEP, CASCADE)
- Bullet-hell patterns reserved exclusively for boss fights
- Clearer distinction between regular enemies and boss attacks

### Bug Fixes
- Fixed duplicate boss phase handler (dialogues triggered twice)
- Fixed teleport enemies going off-screen (added bounds clamping)
- Fixed ship stats layout shifting after launch animation (CSS order)

### Performance
- Implemented particle object pool (100 pre-allocated) to reduce GC churn

---

## v2.7.1 - 2026-02-01
### Bug Fixes
- Fixed intro screen layout shift when changing ships or game modes
- "DESTROY THE SYSTEM" button now stays fixed in position
- Removed spurious files (nul, styles.css) causing potential rendering issues

### Technical
- Added fixed heights to ship selector (290px), ship preview (280px), score area (85px), mode selector (44px)
- Added flex-shrink: 0 to prevent container compression
- Improved ship arrow alignment with margin-top positioning

---

## v2.7.0 - 2026-01-30
### Gameplay
- 5 waves before boss (cycle repeats).
- Enemy fire staggered in groups (no full volleys).
- Player bullets cancel enemy bullets.
- Perk modal removed; random perk after 3 canceled bullets in a row (1.5s window).

### Visuals
- Switched to code-drawn player, enemies, boss, and power-ups.

### HUD
- Score display forced to integer (no decimals).

### Assets
- Sprite loading kept but unused for gameplay sprites.
