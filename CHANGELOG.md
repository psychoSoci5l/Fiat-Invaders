# Changelog

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
