# Changelog

## v2.24.9 - 2026-02-04
### Balance: Boss HP Retuned (3x→2x)

**Problem**: v2.24.8 (3x HP) was too tanky - FED 16110 HP took 106s+ and player died before finishing.

**Changes**:
| Parameter | v2.24.8 | v2.24.9 |
|-----------|---------|---------|
| `BASE` | 3600 | 2400 |
| `PER_LEVEL` | 75 | 50 |
| `PER_CYCLE` | 1500 | 1000 |
| `MIN_FLOOR` | 3000 | 2000 |
| Mini-boss % | 40% | **50%** |

**Expected**:
- Boss fights: 45-75s (was 106s+)
- Mini-boss: 8-12s (was 1.2s)

---

## v2.24.8 - 2026-02-04
### Balance: Boss HP Tripled (Longer Fights)

**Problem**: Boss fights too short - FED 17.6s, BCE 28.3s (target 60-90s).

**Analysis**: Player DPS ~330. Current HP produced fights 3-4x shorter than intended.

**Changes**:
| Parameter | Old | New | Effect |
|-----------|-----|-----|--------|
| `BASE` | 1200 | 3600 | 3x base HP |
| `PER_LEVEL` | 25 | 75 | 3x level scaling |
| `PER_CYCLE` | 500 | 1500 | 3x cycle scaling |
| `MIN_FLOOR` | 1000 | 3000 | 3x minimum |

**Expected Results**:
- FED (Cycle 1): ~50-60s fight
- BCE (Cycle 2): ~80-90s fight
- BOJ (Cycle 3): ~100-120s fight

---

## v2.24.7 - 2026-02-04
### Balance: Graze Meter Tuning (HYPER Reachable)

**Problem**: 102 grazes in 8+ minutes, 0 HYPER activations. Meter never filled.

**Math Analysis**:
- Old: +8/graze, -6/sec decay = needs 13 consecutive grazes to reach 100
- With 1 graze every ~5 sec: +8 gain, -30 decay = impossible to fill
- Close graze radius (12px) too tight → 0% close grazes

**Rebalanced Values**:
| Parameter | Old | New | Effect |
|-----------|-----|-----|--------|
| `METER_GAIN` | 8 | 12 | +50% per graze |
| `METER_GAIN_CLOSE` | 20 | 25 | +25% for close |
| `DECAY_RATE` | 6/s | 4/s | -33% drain |
| `CLOSE_RADIUS` | 12px | 18px | +50% close zone |

**New Math**: +12/graze, -4/sec = ~9 grazes to fill (achievable in 15-20 sec burst)

---

## v2.24.6 - 2026-02-04
### Safety: Global Enemy Bullet Cap

**Problem**: BOJ mini-boss spawned 624 bullets, flooding the screen.

**Solution**: Added `GLOBAL_BULLET_CAP: 150` in BalanceConfig.

**Implementation**:
- `canSpawnEnemyBullet()` helper function checks cap before every bullet spawn
- Applied to: HarmonicConductor, Boss patterns, Mini-boss patterns
- Bullets stop spawning when cap reached, resume when bullets leave screen

**Result**: Screen never exceeds 150 enemy bullets regardless of pattern bugs.

---

## v2.24.5 - 2026-02-04
### Balance: Mini-Boss Spawn Rate Tuning

**Problem**: v2.24.4 thresholds were too high - 0 mini-bosses in 14 levels!

**Analysis from debug log**:
- ~200 enemies per boss cycle, split among 10 currencies
- Average ~20 kills per currency before boss spawns
- Old thresholds (30-50) were mathematically unreachable

**Rebalanced Thresholds** (~1.5x original, achievable):
| Currency | v2.24.4 | v2.24.5 | Rationale |
|----------|---------|---------|-----------|
| $ | 35 | 22 | Reaches ~25/cycle |
| € ₣ £ | 40 | 22 | Reaches ~24/cycle |
| ¥ 元 | 30 | 18 | Reaches ~24/cycle |
| ₽ ₹ ₺ | 50 | 35 | Reaches ~43/cycle |
| Ⓒ | 25 | 12 | Rare spawn |

**Protection still in place**:
- 15s cooldown between mini-boss spawns
- Global counter reset prevents cascade

**Target**: 1-2 mini-bosses per boss cycle (was 0, originally 5).

---

## v2.24.3 - 2026-02-04
### Fix: Complete Debug Analytics Tracking

**Problem**: Two tracking methods were defined but never called:
- `trackBossPhase()` - Boss phase transitions not recorded
- `trackMiniBossFight()` - Mini-boss fight duration not tracked

**Solution**:
- Added `trackBossPhase()` call in `Boss.js:triggerPhaseTransition()`
- Added `trackMiniBossFight()` call in mini-boss defeat handler
- Added `_miniBossStartInfo` temp storage for duration calculation

**Result**: `dbg.report()` now shows complete data for balance testing checklist.

---

## v2.24.2 - 2026-02-04
### Balance: Sacrifice Limit

**Problem**: Failed sacrifices let player survive indefinitely on last life (infinite loop).

**Solution**: Limit to **1 sacrifice per run**.
- Added `sacrificesUsedThisRun` counter
- Check in `canSacrifice` condition
- Reset in `startGame()`

Now after using your one sacrifice (success or fail), the next hit on last life = game over.

---

## v2.24.1 - 2026-02-04
### Fix: Death Analytics Tracking

**Bug**: Player deaths were not being tracked in analytics (`Deaths: 0` even after game over).

**Root Cause**: The `trackPlayerDeath()` function in DebugSystem.js was never called from main.js.

**Solution**:
- Added `G.Debug.trackPlayerDeath()` call in `executeDeath()`
- Added special tracking for HYPER deaths with cause='hyper'
- Added `deathAlreadyTracked` flag to prevent double-tracking HYPER deaths
- Reset flag in `startGame()` for clean state

**Files Modified**:
- `main.js`: Added death tracking calls and flag

---

## v2.24.0 - 2026-02-04
### Feature: 1-Hit = 1-Life System

**Change**: Simplified the life/HP system for more arcade-style gameplay.

**Old System**:
- `player.hp = 3`, `player.maxHp = 3`
- 3 hits per life × 3 lives = 9 total hits before game over

**New System**:
- `player.hp = 1`, `player.maxHp = 1`
- 1 hit = 1 life lost
- 3 lives total = 3 hits before game over

**Death Sequence Changes**:
1. **Bullet Explosions**: All enemy bullets explode visually when player dies (not just clear)
2. **Bullet Time**: 2-second slowmo (not freeze) during death sequence
3. **Resume**: Game resumes with same enemy positions (no reset)

**UI Changes**:
- Health bar hidden (unnecessary with 1 HP)
- Lives display remains (shows 3-2-1)

**Files Modified**:
- `Player.js`: Default HP changed to 1
- `main.js`: startGame(), startDeathSequence(), executeDeath(), updateLivesUI()
- `BalanceConfig.js`: HIT_STOP_DEATH already 2.0s

---

## v2.23.1 - 2026-02-04
### Feature: Balance Analytics System

**Purpose**: Automatic tracking for Phase 25 balance testing.

**New Console Commands**:
```javascript
dbg.balanceTest()   // Enable analytics + overlay
dbg.report()        // Show full analytics report after game over
```

**Metrics Tracked Automatically**:
- **Timing**: Run duration, cycle times, boss fight times
- **Combat**: Deaths (when/where/cause), grazes, close grazes, kill streaks
- **HYPER**: Activations, total duration, deaths during HYPER, score gained
- **Power-ups**: Types collected, pity timer triggers
- **Sacrifice**: Opportunities, accepted, success/fail rate
- **Bosses**: Kill time per boss, damage taken
- **Mini-bosses**: Spawn count, triggers, kill time

**Usage**:
1. Open console, run `dbg.balanceTest()`
2. Play the game
3. After game over, run `dbg.report()` to see full analytics
4. Screenshot the report for analysis

---

## v2.23.0 - 2026-02-04
### Fix: Mini-Boss Ghost Bullets

**Problem**: When mini-boss was defeated, its bullets continued to exist and new bullets could appear from pending HarmonicConductor setTimeout callbacks.

**Root Cause**: Mini-boss cleanup was missing three critical steps that main boss cleanup had:
1. Clear `enemyBullets` array
2. Reset `HarmonicConductor` to invalidate pending fire callbacks
3. Set `bossJustDefeated` flag for next-frame defensive cleanup

**Solution** (in `checkMiniBossHit()`):
```javascript
// Clear all mini-boss bullets
enemyBullets.forEach(b => G.Bullet.Pool.release(b));
enemyBullets.length = 0;

// Reset HarmonicConductor to cancel pending setTimeout
G.HarmonicConductor.reset();

// Set defensive flag for next frame
bossJustDefeated = true;
```

**Verification**:
```javascript
dbg.showOverlay()  // Watch enemyBullets count
// Kill mini-boss → count should drop to 0 immediately
```

---

## v2.22.9 - 2026-02-04
### Fix: Mini-Boss Thresholds Too High

**Problem**: Mini-boss never spawned in 20 levels because kill thresholds were unreachable.

**Analysis from debug logs**:
- ₽ (RUBLE) reached 38 kills but threshold was 50
- 元 (YUAN) reached 19 kills but threshold was 35
- Player kills ~60% of spawned enemies (not 100%)

**Threshold Changes** (approximately halved):
| Currency | Old | New | Boss |
|----------|-----|-----|------|
| ¥ YEN | 25 | 12 | BOJ |
| $ DOLLAR | 30 | 15 | FED |
| 元 YUAN | 35 | 12 | BOJ |
| € EURO | 40 | 18 | BCE |
| £ ₣ | 45 | 18 | BCE |
| ₽ ₹ ₺ | 50 | 25 | RANDOM |
| Ⓒ CBDC | 20 | 10 | CYCLE |

**Expected Result**: Mini-boss should spawn ~1-2 times per 5-wave cycle.

---

## v2.22.8 - 2026-02-04
### Debug: Mini-Boss Kill Counter Visibility

**Investigation**: Player reached level 20 without mini-boss spawn. Added debugging tools.

**Debug Enhancements:**
- Added `fiatKillCounter` to debug overlay (shows top 3 currencies by kill count)
- Added logging: `[MINIBOSS] Kill $: 15/30` tracks progress toward threshold
- Exposed `window.fiatKillCounter` for console inspection
- Expanded debug overlay height to fit new info

**How to Debug:**
```javascript
dbg.showOverlay()           // See kill counter in overlay
dbg.enable('MINIBOSS')      // Enable kill counter logging
window.fiatKillCounter      // Check counter values directly
```

**Files Changed:**
- `src/main.js` - Added logging and window exposure
- `src/utils/DebugSystem.js` - Kill counter in overlay

---

## v2.22.7 - 2026-02-04
### Enhancement: Clean Horde Transitions

**1. Enemies Invulnerable During Formation Entry**
- Enemies cannot be damaged while flying into position (`isEntering`) or settling (`!hasSettled`)
- Player bullets pass through enemies until they're in formation
- Prevents "cheap kills" during entry animation

**2. Silent Horde 2 Transitions**
- Removed "HORDE 2!" message and screen flash between hordes within same level
- Clean flow: screen clears → enemies arrive → action resumes
- Less visual noise, more focus on gameplay

**Files Changed:**
- `src/main.js` - Added invulnerability check in `checkBulletCollisions()`, removed messages in `startHorde2()`

---

## v2.22.6 - 2026-02-04
### Fix: Defensive Ghost Bullet Cleanup

**Investigation**: Analyzed 13 screenshots from game session to investigate potential ghost bullets after boss defeat.

**Existing Safeguards Verified (Working Correctly):**
- HarmonicConductor generation counter (v2.22.4) - All setTimeout callbacks check generation
- Boss defeat cleanup clears `enemyBullets[]` immediately
- Boss update guarded by `if (boss && boss.active)`
- Enemy bullet loop runs after boss collision check

**Defensive Fix Added:**
- New `bossJustDefeated` flag set when boss dies
- On next frame, any remaining enemy bullets are cleared (edge case protection)
- Debug logging when defensive clear triggers: `[DEFENSIVE] Cleared X ghost bullets`

**How to Test:**
1. Enable debug: `dbg.enable('BULLET'); dbg.showOverlay()`
2. Play to boss fight and defeat boss
3. Verify debug overlay shows `enemyBullets: 0` after boss death
4. If defensive clear triggers, console will log the cleared count

**Files Changed:**
- `src/main.js` - Added `bossJustDefeated` flag and defensive cleanup in `update()`

---

## v2.22.5 - 2026-02-04
### Fix: Complete Boss Cleanup + Advanced Debug System

**Bug 1: Boss Minions Persisting After Defeat**
- Root cause: Boss minions (spawned by `printMoney()` in phase 3) remained in `enemies[]` after boss death
- Effect: Debug showed `enemies=1` after boss defeat; minions could continue firing
- Fix: Clear `enemies[]` array when boss is defeated

**Bug 2: MiniBoss Overlapping with Main Boss**
- Root cause: `miniBoss` not cleared when main boss spawns or dies
- Effect: Two bosses could theoretically exist simultaneously
- Fix: Clear `miniBoss` in both `spawnBoss()` and boss defeat handler

**Advanced Debug System (DebugSystem.js):**
- Event tracking with counters: boss spawns/defeats, mini-boss, waves, hordes, levels, cycles
- Visual overlay panel (toggle with `dbg.showOverlay()`)
- Event history (last 50 events with timestamps)
- Statistics display (`dbg.stats()`)
- Quick presets: `dbg.debugBoss()`, `dbg.debugWaves()`
- State snapshot: `dbg.getSnapshot()`

**Debug Tracking Points Added:**
- `spawnBoss()` → `trackBossSpawn()`
- Boss defeat → `trackBossDefeat()`, `trackCycleUp()`
- `spawnMiniBoss()` → `trackMiniBossSpawn()`
- Mini-boss defeat → `trackMiniBossDefeat()`
- `startIntermission()` → `trackIntermission()`
- `startHordeTransition()` → `trackHordeTransition()`
- Level up → `trackLevelUp()`
- Wave spawn → `trackWaveStart()`
- HarmonicConductor reset → `trackConductorReset()`

**Console Commands:**
```javascript
dbg.stats()           // Show event statistics
dbg.showOverlay()     // Visual debug panel on canvas
dbg.showHistory(20)   // Last 20 events
dbg.debugBoss()       // Quick boss debugging setup
dbg.getSnapshot()     // Export current state
```

---

## v2.22.4 - 2026-02-04
### Fix: Ghost Boss Bullets & Mini-Boss Cascade

**Bug 1: Ghost Boss Bullets After Death**
- Root cause: `enemyBullets` array not cleared when boss defeated
- Effect: Boss bullets continued moving/dealing damage after boss death
- Fix: Clear and release `enemyBullets` in boss defeat handler

**Bug 2: HarmonicConductor Pending setTimeout Callbacks**
- Root cause: setTimeout callbacks scheduled by boss patterns continued firing after boss death
- Effect: New bullets spawned from patterns even after boss was null
- Fix: Added `generation` counter to HarmonicConductor; all setTimeout callbacks now check generation before executing

**Bug 3: Mini-Boss Cascade in New Cycle**
- Root cause: `fiatKillCounter` not reset after boss defeat
- Effect: Counter accumulated across cycles, triggering mini-bosses too easily in new cycle
- Fix: Reset `fiatKillCounter` when boss is defeated

**HarmonicConductor Generation System:**
- Added `generation` property (increments on reset)
- All 8 setTimeout-using methods now capture and check generation:
  - `executeSyncFire()`, `executeSweep()`, `executeCascade()`
  - `executePattern()`, `executeAimedVolley()`, `executeRandomSingle()`
  - `executeRandomVolley()`, `fireEnemy()` (BURST pattern)
- Ensures no stale callbacks execute after boss death or wave transition

---

## v2.22.3 - 2026-02-04
### Fix: Root Cause Bug Fixes (HarmonicConductor Desync & Memory Leaks)

**Bug 1: HarmonicConductor Reference Desync**
- Root cause: `spawnBoss()` created a NEW empty array for `G.HarmonicConductor.enemies = []`
- Effect: HarmonicConductor held a different array reference than main `enemies`, causing potential double boss spawns
- Fix: Share same reference with `G.HarmonicConductor.enemies = enemies`
- Location: `main.js:2062`

**Bug 2: Object Pool Memory Leaks**
- Root cause: Bullets cleared from arrays without being released back to pool
- Effect: Memory accumulation, pool exhaustion, performance degradation over time
- Fix: Release bullets to pool before clearing arrays in:
  - `startIntermission()` - both `bullets` and `enemyBullets`
  - `startHordeTransition()` - both `bullets` and `enemyBullets`

**Code Quality: Console.log → DebugSystem Migration**
- Converted 9 `console.log` statements to use `Game.Debug.log()` with proper categories
- Categories: WAVE, HORDE, BOSS, STATE
- Locations: WaveManager.js (7), main.js (2)
- Debug output now respects toggle settings for cleaner production logs

---

## v2.22.2 - 2026-02-04
### Fix: Wave Cycle Critical Bugs (VERIFIED)

**Bug 1: SINE_WAVE pattern spawned 0 enemies**
- Root cause: `spawnWave()` had cases for RECT, V_SHAPE, COLUMNS but **missing SINE_WAVE**
- Effect: Wave 4 was instantly "completed" (0 enemies to kill), causing level skip
- Fix: Added `else if (pattern === 'SINE_WAVE') spawn = true;` in WaveManager.js
- **Verified**: Wave 4 now spawns 20 enemies correctly

**Bug 2: Boss died instantly on spawn**
- Root cause: Player bullets fired during 2s warning period hit boss immediately on spawn
- Effect: Boss showed "DEFEATED" message before player could even see it
- Fix: Clear `bullets[]` array in `spawnBoss()` before boss enters
- **Verified**: Boss spawns with full HP and takes normal combat damage

**Test Results:**
- Full cycle tested: Level 1-5 → Boss → Level 6
- Wave/horde progression: ✅ Correct (2 hordes per wave, 5 waves per cycle)
- SINE_WAVE pattern: ✅ Spawns 20 enemies
- Boss warning timer: ✅ 2 second countdown works
- Boss HP: ✅ 5370 HP, normal damage progression
- Debug logging: Cleaned up for production

---

## v2.22.1 - 2026-02-04
### Fix: Critical Boss/Mini-Boss Collision Bug

**Bug Description:**
- Two bosses (e.g., two FED) could appear simultaneously during boss fights
- Level progression became anomalous after horde system was introduced

**Root Cause (2 issues):**
1. **Mini-boss during boss fight**: Boss minions (spawned by FED/BCE/BOJ) have symbols ($, €, ¥). When killed, they incremented `fiatKillCounter`, potentially triggering a mini-boss spawn while the main boss was active.
2. **Boss warning state not protected**: During boss warning (`bossWarningTimer > 0`), WaveManager wasn't informed that a boss was about to spawn, potentially allowing duplicate spawn actions.

**Fixes Applied:**
1. Added guards to mini-boss trigger (`main.js:3189`):
   - `!boss` - Don't trigger during boss fight
   - `!e.isMinion` - Boss minions don't count for kill counter
   - `bossWarningTimer <= 0` - Don't trigger during boss warning

2. Extended `bossActive` parameter to WaveManager (`main.js:2471`):
   - Now includes `bossWarningTimer > 0` state
   - Prevents WaveManager from generating duplicate SPAWN_BOSS actions

---

## v2.22.0 - 2026-02-03
### Feature: Enemy Formation Entry Animation

**New Visual Feature:**
- Enemies now enter the screen one-by-one and fly to their assigned positions
- Staggered entry creates a wave-like formation animation
- Enemies cannot fire until they have settled into position
- Slight curve and rotation during entry for visual interest

**Gameplay Impact:**
- Players get a brief moment to prepare as enemies form up
- Formation entry happens at start of each wave/horde
- Creates more dramatic wave starts without artificial delay

**Configuration (Balance.FORMATION_ENTRY):**
| Parameter | Value | Description |
|-----------|-------|-------------|
| `ENTRY_SPEED` | 350 | Pixels per second during entry |
| `STAGGER_DELAY` | 0.08 | Seconds between each enemy starting |
| `SPAWN_Y_OFFSET` | -80 | Y position above screen for spawn |
| `SETTLE_TIME` | 0.3 | Seconds to settle after reaching position |
| `CURVE_INTENSITY` | 0.4 | How much enemies curve during entry |

**Technical:**
- New Enemy properties: `isEntering`, `targetX`, `targetY`, `entryDelay`, `hasSettled`
- WaveManager sets enemies off-screen with staggered `entryDelay`
- HarmonicConductor checks `areEnemiesEntering()` before allowing fire
- Player.update() accepts `blockFiring` parameter to prevent shooting during entry
- Entry animation includes sine-wave curve and rotation

---

## v2.21.3 - 2026-02-03
### Fix: Countdown Timer Duration

**Changes:**
- Increased `INTERMISSION_DURATION` from 1.9s to 3.2s for proper 3-2-1 countdown
- Capped countdown display at 3 (prevents showing "4" with longer timer)
- Now shows full "3" → "2" → "1" sequence with ~1 second per number

---

## v2.21.2 - 2026-02-03
### Fix: Horde System Critical Bugs

**Bug Fixes:**
- Fixed game start showing horde transition instead of intermission
  - Added `hordeSpawned` flag to track if horde was actually spawned
  - Only triggers horde transition when horde 1 was cleared, not at game start
- Removed overlapping messages that caused visual clutter
  - Removed `showVictory()` from `startIntermission()` (overlapped with countdown overlay)
  - Removed "HORDE 1 CLEAR" message from `startHordeTransition()` (redundant)
- Fixed countdown overlay showing wrong wave info
  - Now shows "GET READY" / "PREPARATI" instead of next wave name

**Simplified Flow:**
- Horde transition: silent 0.8s pause → "HORDE 2!" message when horde 2 spawns
- Level complete: countdown overlay with "GET READY" + meme

**Technical:**
- Added `WaveManager.hordeSpawned` flag to distinguish game start from horde completion
- Cleaned up i18n: removed unused `HORDE_COMPLETE`, `WAVE_COMPLETE`, added `GET_READY`

---

## v2.21.1 - 2026-02-03
### Feature: Horde/Level Transition Polish (superseded by v2.21.2)

---

## v2.21.0 - 2026-02-03
### Feature: 2-Horde Wave System & Enemy Fire Rate Reduction

**New Gameplay Features:**
- Each wave now has 2 distinct hordes (double the enemies per wave)
- "HORDE 2!" message appears between hordes with brief transition
- Graze meter and pity timer persist between hordes (no reset)
- Horde 2 uses pattern variant for gameplay variety

**Balance Changes:**
- 15% global reduction in enemy fire rate (FIRE_RATE_GLOBAL_MULT: 0.85)
- Bullet conversion between hordes gives half bonus (5 points vs 10)

**Gameplay Impact:**
| Metric | Before | After |
|--------|--------|-------|
| Enemies per wave | ~20 | ~40 (2×20) |
| Wave duration | ~30s | ~60-70s |
| Enemy bullets | 100% | 85% |
| Run duration | ~12 min | ~22-25 min |

**Technical:**
- New `Balance.WAVES.HORDES_PER_WAVE` configuration
- New `Balance.WAVES.HORDE_TRANSITION_DURATION` (0.8s)
- New `Balance.CHOREOGRAPHY.INTENSITY.FIRE_RATE_GLOBAL_MULT`
- WaveManager tracks `currentHorde`, `isHordeTransition`, `hordeTransitionTimer`
- New actions: `START_HORDE_TRANSITION`, `START_HORDE_2`
- New functions: `startHordeTransition()`, `startHorde2()` in main.js
- i18n: Added `HORDE_2_INCOMING` (EN/IT)

---

## v2.20.4 - 2026-02-03
### Feature: Wave Countdown Enhancement

**Changes:**
- Redesigned intermission countdown with cell-shaded visual style
  - Dark semi-transparent box with rounded corners
  - Wave info displayed at top in green (e.g., "WAVE 2: BULL RUN")
  - Large gold countdown number with scale-in animation
- Added ascending audio tick feedback (3=low, 2=mid, 1=high pitch)
- Brief white flash when wave starts
- Removed meme text for cleaner, minimal look

**Technical:**
- `AudioSystem.play()` now accepts optional `opts` parameter for pitch control
- New `countdownTick` sound with adjustable pitch
- Added `WAVE_START` flash config to Balance.JUICE.FLASH
- Cleaned up roadmap.md (removed duplicate boss warning task)

---

## v2.20.3 - 2026-02-03
### Fix: UI Readability & Layout

**Fixes:**
- Version text now more readable (opacity 40% → 60% + text-shadow)
- "RECORD" label more readable (opacity 50% → 70% + text-shadow)
- Version hidden in SELECTION state (less clutter)
- Fixed UI overlap bug when returning from game via settings
  - Cleared inline styles instead of setting `opacity: '1'` which overrode CSS `.hidden`
- Icons positioned lower (70px → 50px) for better LAUNCH button spacing

---

## v2.20.2 - 2026-02-03
### Fix: iOS Touch Handling for Buttons

**Fixes:**
- Added `pointer-events: none` to shield button child elements (SVG, face, icon)
- Touch events now properly pass through to the wrapper element
- Added explicit touch handlers for pause button in InputSystem.js
- Pause button now uses `touchend` → `togglePause()` instead of relying on `onclick`

---

## v2.20.1 - 2026-02-03
### Fix: Button Positioning & Pause Button Redesign

**Changes:**
- Shield button lowered to GRAZE meter height (`bottom: 60px`)
- Pause button completely redesigned with cell-shaded style
  - Same 64x64px size as shield button
  - Orange/gold gradient (#f39c12 → #d35400)
  - Bold 3px black border
  - Pulsing glow animation
  - Press feedback with scale transform
- Both buttons now symmetrically positioned (left/right at same height)

---

## v2.20.0 - 2026-02-03
### Feature: Shield Button Redesign (Phase 21)

**UI Overhaul:**
Redesigned shield button for better mobile ergonomics and visual feedback.

| Change | Before | After |
|--------|--------|-------|
| **Position** | Right side | Left side (thumb-friendly) |
| **Size** | 40x40px | 64x64px |
| **Style** | Semi-transparent | Cell-shaded with bold border |
| **Feedback** | Color change only | SVG radial cooldown indicator |

**Three Visual States:**
| State | Appearance | Indicator |
|-------|------------|-----------|
| **READY** | Cyan gradient + pulsing glow | Full circle |
| **ACTIVE** | Bright white + intense glow | Pulsing |
| **COOLDOWN** | Grey, no glow | Circle fills 0→100% |

**Technical Details:**
- SVG radial progress indicator (circumference math: 2πr = 188.5)
- CSS transitions for smooth state changes
- Press feedback with scale transform
- `stopPropagation()` prevents touch conflicts

**Files Modified:**
- `index.html`: New shield button structure with SVG
- `style.css`: Complete cell-shaded button styles
- `src/main.js`: Added `updateShieldButton()` function
- `src/core/InputSystem.js`: Updated handlers and fallback creation

---

## v2.19.0 - 2026-02-03
### Feature: Shape-Specific Enemy Bullets

**Visual Overhaul:**
Enemy bullets now have distinct shapes based on the enemy type that fired them, making gameplay more readable and visually interesting.

| Shape | Enemies | Bullet Visual |
|-------|---------|---------------|
| **COIN** | ¥ ₹ £ | Spinning ellipse (3D coin rotation) |
| **BILL** | ₽ € ₺ $ | V-shape paper airplane with flutter |
| **BAR** | ₣ 元 | 3D trapezoid/ingot that tumbles |
| **CARD** | Ⓒ | Digital chip with circuits & scanlines |

**Technical Approach:**
- All shapes maintain identical visibility (same glow, trail, white ring)
- Only the internal core shape changes per type
- Incremental implementation with user validation at each step
- Dispatcher pattern in `drawEnemyBullet()` routes to shape-specific methods

**Files Modified:**
- `src/entities/Bullet.js`: Added `drawCoinBullet()`, `drawBillBullet()`, `drawBarBullet()`, `drawCardBullet()`

---

## v2.18.4 - 2026-02-03
### Fix: Stale Array Reference Bugs (Comprehensive)

**Bugs Fixed:**
- Enemies continued firing bullets during mini-boss fight even though not visible
- HarmonicConductor kept stale reference to old enemies array in multiple scenarios
- Boss minion spawning could push to wrong array reference
- Global enemies reference became desynced after wave spawn

**Root Cause:**
JavaScript arrays are reference types. When reassigning `enemies = []` or `enemies = newArray`,
any system holding the OLD reference (like HarmonicConductor) continues using stale data.

**Affected Locations & Fixes:**

| Location | Line | Fix Applied |
|----------|------|-------------|
| `resetState()` | 1736 | Added `HarmonicConductor.enemies` sync |
| Boss entrance | 1879 | Added `G.enemies` + `HarmonicConductor.enemies` sync |
| `spawnMiniBoss()` | 1982 | Added `HarmonicConductor.enemies` sync |
| `checkMiniBossHit()` | 2284 | Added `HarmonicConductor.enemies` sync on restore |
| Wave spawn | 2408 | Added `G.enemies` sync (for Boss minion spawning) |

**Technical Pattern:**
All array reassignments now follow this sync pattern:
```javascript
enemies = newValue;
G.enemies = enemies;                           // For Boss.js minion spawning
if (G.HarmonicConductor) G.HarmonicConductor.enemies = enemies; // For firing orchestration
```

---

## v2.18.2 - 2026-02-03
### Fix: Text Overflow & Bounds Clamping

**Improvements:**
- Long text messages now auto-shrink font size to fit screen width
- All text boxes clamped to screen bounds (no more overflow)
- Floating texts and perk names now centered and clamped at screen edges

**Changes:**
- `MessageSystem.js`: Dynamic font sizing (24→12px) for GAME_INFO, DANGER, VICTORY
- `MessageSystem.js`: Box width clamped to `screenWidth - 40px`
- `main.js`: floatingTexts now use `textAlign: center` + X clamping
- `main.js`: perkIcons name text clamped to prevent edge overflow

---

## v2.18.1 - 2026-02-03
### Fix: Text Box Positioning After Resize

**Bug Fixed:**
- Text boxes (GAME_INFO, DANGER, VICTORY messages) were appearing at wrong positions after screen resize or orientation change
- Messages like "VOLATILITÀ", "CLIMAX", "LAST FIAT! x2" were rendering at left edge instead of centered

**Root Cause:**
- `MessageSystem.setDimensions()` was not called in the resize handler
- After resize, MessageSystem kept using stale `gameWidth/gameHeight` values

**Changes:**
- `main.js`: Added `MessageSystem.setDimensions()` call to resize handler
- `MessageSystem.js`: Added defensive fallbacks (`w || 600`, `h || 800`) to prevent left-edge rendering if dimensions are uninitialized

---

## v2.18.0 - 2026-02-03
### Boss Redesign: Exclusive Patterns & Currency Triggers

**New: 6 Boss-Exclusive Bullet Patterns**
```javascript
// FED Signature Patterns
laserBeam(cx, cy, targetX, targetY, config)      // Horizontal continuous beam
homingMissiles(cx, cy, playerX, playerY, config) // 3-5 tracking missiles

// BCE Signature Patterns
rotatingBarrier(cx, cy, time, config)            // Orbiting shield with gap
delayedExplosion(positions, delay, config)       // Timed bombs

// BOJ Signature Patterns
screenWipe(direction, cy, config)                // Full-screen wall with gap
zenGarden(cx, cy, time, config)                  // Intertwined hypnotic spirals
```

**New: Boss Visual Redesign**
- **FED → MEGA-BILL**: Giant banknote with $ eyes in seal, "FEDERAL RESERVE NOTE" text
  - Phase 1: Green dollar, luminous seal
  - Phase 2: Edge cracks, "OVERPRINTED" watermark
  - Phase 3: Burning edges, red inflation tint
- **BCE → MEGA-COIN**: Giant Euro coin with 3D edge and 12 orbiting stars
  - Phase 1: Blue/gold EU colors, slow star orbit
  - Phase 2: Stars pulse, coin tilts showing thickness
  - Phase 3: Fragmented coin, stars attack independently
- **BOJ → MEGA-BAR**: Gold ingot with engraved ¥ and rising sun aura
  - Phase 1: Bright gold, zen aura
  - Phase 2: Yield curve overlay, "INTERVENTION" flash
  - Phase 3: Incandescent bar, rays become lasers

**New: Currency-Based Mini-Boss Triggers**
```javascript
CURRENCY_BOSS_MAP: {
    '$': { boss: 'FEDERAL_RESERVE', threshold: 30 },
    '€': { boss: 'BCE', threshold: 40 },
    '₣': { boss: 'BCE', threshold: 45 },
    '£': { boss: 'BCE', threshold: 45 },
    '¥': { boss: 'BOJ', threshold: 25 },
    '元': { boss: 'BOJ', threshold: 35 },
    '₽': { boss: 'RANDOM', threshold: 50 },
    '₹': { boss: 'RANDOM', threshold: 50 },
    '₺': { boss: 'RANDOM', threshold: 50 },
    'Ⓒ': { boss: 'CYCLE_BOSS', threshold: 20 }
}
```

**New: Boss Signature Memes**
- FED: "MONEY PRINTER GO BRRRRR"
- BCE: "WHATEVER IT TAKES... AGAIN"
- BOJ: "YIELD CURVE: CONTROLLED"

**Rebalanced: Boss Stats**
| Parameter | Old | New |
|-----------|-----|-----|
| Base HP | 1000 | 1200 |
| HP/Level | 30 | 25 |
| HP/Cycle | 400 | 500 |
| Perk Scale | 12% | 10% |
| Min HP | 800 | 1000 |

**Updated: Boss Fire Rates (seconds)**
| Boss | Phase 1 | Phase 2 | Phase 3 |
|------|---------|---------|---------|
| FED | 0.85 | 0.38 | 0.20 |
| BCE | 1.40 | 0.70 | 0.35 |
| BOJ | 0.75 | 0.45 | 0.18 |

**Updated: Boss Movement Speeds**
| Boss | Phase 1 | Phase 2 | Phase 3 |
|------|---------|---------|---------|
| FED | 55 | 130 | 200 |
| BCE | 35 | 55 | 90 |
| BOJ | 45 | 75 | 160 |

---

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
