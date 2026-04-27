# V8 Scroller — Game Design Document

**System:** V8 Scroller (Gradius-style vertical campaign mode)
**Version covered:** v7.12.4 (reverse-documented from code; cite file:line where noted)
**Status:** PRIMARY campaign mode since v7.5.0; Arcade mode excluded
**File audience:** Designers, engineers, QA

---

## Overview

The V8 Scroller is the primary campaign mode of *FIAT vs CRYPTO* (active when `Balance.V8_MODE.ENABLED = true`, default since v7.5.0). It replaces the legacy WaveManager formation system with a Gradius-style vertical scrolling shooter: enemies spawn from the top of the screen on scripted absolute timestamps, fly through the arena in one of four movement patterns (DIVE, SINE, HOVER, SWOOP), and the player must survive a 170-second timeline before a regional central-bank boss appears. The campaign consists of three levels (L1 FED / L2 BCE / L3 BOJ), each themed around a distinct regional currency roster, with HP targets, scroll speed, and fire density escalating between levels. Completing a level triggers a DOM intermission screen; completing all three levels triggers campaign victory. Arcade mode continues to use the legacy WaveManager and is deliberately excluded from V8 logic.

---

## Player Fantasy

The player should feel like a lone fighter jet punching through a relentless wall of enemy currencies — the visual language and pacing borrow from *Gradius* and *R-Type*: enemies descend in formations, some peel off into elegant sine waves or swoop flanks, and occasionally one "lands" in a hover-stop — defying gravity and staring the player down before floating away. The final 20–26 seconds of each level are a CORRIDOR CRUSH set-piece: the scroll slams to a higher speed multiplier, screen shake hits, audio pitch drops, and enemy density peaks — a visceral "almost there" moment before the boss siren sounds. The player should feel constant forward momentum, with the scroll speed itself communicating threat level, culminating in a boss fight in a halted arena. Between levels the intermission screen is a breath and a tease for the next regional act.

---

## Detailed Rules

### C.1 Activation gating

- V8 is active when `G.Balance.V8_MODE.ENABLED === true` **and** `G.ArcadeModifiers.isArcadeMode()` returns `false`.
  - Source: `src/main.js:2928-2932`, `src/core/GameplayCallbacks.js:395-396`, `src/systems/HarmonicConductor.js:270-271`
- When V8 is active, `WaveManager.update()` is called but returns `null` (it goes dormant); `LevelScript.tick(dt)` drives the action pipeline instead.
  - Source: `src/main.js:2925-2932`

### C.2 Level timeline

Each level runs for exactly **170 seconds** before the boss trigger fires.

- `LEVELS[i].BOSS_AT_S = 170` for all three levels.
  - Source: `src/v8/LevelScript.js:325,337,349`
- `LevelScript._elapsed` accumulates real seconds (delta-time) each frame via `tick(dt)`.
  - Source: `src/v8/LevelScript.js:480`
- The ticker is only advanced when `gameState === 'PLAY'`, `!startCountdownActive`, `!shipEntryActive`, and `!isBossActive`.
  - Source: `src/main.js:2929-2932`

### C.3 Burst spawn system

Each level defines a `SCRIPT` array of burst entries. Each entry has:

| Field | Type | Meaning |
|---|---|---|
| `at_s` | number | Absolute seconds at which this burst fires |
| `currencies` | string \| string[] | Symbol(s) to spawn, cycled per lane |
| `lanes` | number[] | 0..1 fractions of game width; one enemy per lane |
| `pattern` | string? | `'DIVE'` (default) \| `'SINE'` \| `'HOVER'` \| `'SWOOP'` |

- Legacy `lane: X` single-value form is still accepted for back-compat.
  - Source: `src/v8/LevelScript.js:562-568`
- `currencies` is cycled modulo lane count: `currs[i % currs.length]`.
  - Source: `src/v8/LevelScript.js:567`
- Bursts fire in order; the tick loop advances `_idx` until all entries with `at_s <= _elapsed` have fired.
  - Source: `src/v8/LevelScript.js:507-510`

### C.4 Enemy spawn

Each spawned enemy receives:

- `_v8Fall = true` — marks it as a V8 scroller enemy (bypasses legacy grid/entry logic).
- `isEntering = false`, `hasSettled = true` — skips WaveManager entry animation.
- `fireTimer` randomized 0.8–2.0 s — staggered opening fire.
- `entryPattern` — the movement pattern string.
- Spawn X: for non-SWOOP patterns, clamped to `[30, gameWidth-30]` from `lane × gameWidth`. For SWOOP, spawned at `SIDE_MARGIN (30px)` from left or right edge based on `lane < 0.5`.
  - Source: `src/v8/LevelScript.js:583-594`
- Spawn Y: `Balance.V8_MODE.SPAWN_Y_OFFSET = -40` (was -80 before v7.12).
  - Source: `src/config/BalanceConfig.js:27`

### C.5 Movement patterns

All movement is executed in `Enemy.update()` when `_v8Fall === true`.
- Source: `src/entities/Enemy.js:219-320`

**DIVE** (default): Enemy falls straight down. `vy += ACCEL × dt` (ACCEL = 10 px/s²). No horizontal movement.

**SINE**: Enemy descends while oscillating horizontally.
- `x = spawnX + sin(patTimer × FREQ) × AMPLITUDE`
- FREQ = 2.0, AMPLITUDE = 70 px
- Clamped to [20, gameWidth-20].

**HOVER** (scripted pattern):
- APPROACH phase: descends at `APPROACH_VY = 60 px/s` until `y >= gameHeight × Y_TARGET_RATIO (0.28)`.
- DWELL phase: holds position for `DWELL = 2.5 s`, then transitions to LEAVE.
- LEAVE phase: flies upward at `EXIT_VY = -180 px/s`.

**SWOOP**: Enemy spawns near a side edge and curves across the screen.
- `x = spawnX + swoopDir × sin(patTimer × CURVE_FREQ) × CURVE_AMP`
- CURVE_FREQ = 1.3, CURVE_AMP = 140 px, APPROACH_VY = 50 px/s
- Clamped to [SIDE_MARGIN, gameWidth-SIDE_MARGIN].

Source for all patterns: `src/config/BalanceConfig.js:41-44`; `src/entities/Enemy.js:281-318`.

### C.6 Cinematic entry burst (v7.12)

When an enemy first spawns (y = -40), it immediately falls at `ENTRY_BURST.VY = 260 px/s` regardless of pattern. Once `y >= ENTRY_BURST.UNTIL_Y (40)` it reverts to its pattern's normal vy. This makes enemies visually appear before they start firing.

- Applies to all four patterns: `PATTERNS: ['DIVE', 'SINE', 'SWOOP', 'HOVER']`.
- While y < 0 (enemy center above screen top), `_fireSuppressedByEntry = true` — HarmonicConductor skips it.
  - Source: `src/config/BalanceConfig.js:31-36`; `src/entities/Enemy.js:227-233`

### C.8 Off-edge culling

Each tick, enemies with `_v8Fall === true` and `y > gameHeight + 120` are removed from the array. This prevents invisible enemies accumulating and firing bullets off-screen.
- Source: `src/v8/LevelScript.js:487-494`

### C.9 CRUSH anchors

Each level defines an `ANCHORS` array with three entries fired via `_handleAnchor()`:

| Action | Effect |
|---|---|
| `CRUSH_ENTER` | `ScrollEngine.setSpeedMultiplier(speed, 2.0)` — ramps to target over 2 s; audio pitch drops 100 cents over 2 s |
| `CRUSH_PEAK` | Screen shake (4.0 amplitude) + damage vignette triggered |
| `CRUSH_EXIT` | Shake cleared, speed ramp back to 1.0× over 1.5 s, audio pitch restored over 1.5 s |

CRUSH windows by level:

| Level | CRUSH_ENTER_S | CRUSH_PEAK | CRUSH_EXIT_S | Peak speed mult |
|---|---|---|---|---|
| L1 FED | 150 s | 152 s | 168 s | 1.8× |
| L2 BCE | 148 s | 150 s | 168 s | 2.2× |
| L3 BOJ | 142 s | 144 s | 168 s | 2.6× |

Source: `src/v8/LevelScript.js:116-119, 209-213, 315-319, 535-553`.

### C.10 Boss trigger

When `_elapsed >= BOSS_AT_S (170)` and `_bossSpawned` is false, the tick returns `{ action: 'SPAWN_BOSS' }`. Main.js receives this, calls `startBossWarning()` which shows a `WARNING_DURATION (2.0 s)` warning overlay before `spawnBoss()` fires.

- In V8 mode, `spawnBoss()` reads the boss type from `LevelScript.BOSS_TYPE` (overriding the usual cycle-rotation).
- **Scroll halt**: Immediately on `spawnBoss()`, `ScrollEngine.halt()` is called — the camera freezes for the boss fight.

Source: `src/v8/LevelScript.js:527-531`; `src/main.js:2677-2681, 2764-2765, 2990-2991`.

### C.11 Boss death → level end sequence

1. `onBossDeath()` fires via `CollisionSystem` callback.
2. `ScrollEngine.resume(40)` resumes scroll at 40 px/s "breathing" speed.
3. Cinematic boss death sequence runs (coin rain, chain explosions, evolution item spawn) over `BOSS_CELEBRATION_DELAY = 7.5 s`.
4. After the celebration delay:
   - If a story chapter should display: `showStoryScreen(chapterId, callback)` where callback calls `advanceToNextV8Level()`.
   - Else if V8 enabled and not campaign-complete: `LevelScript.scheduleLevelEnd(1)` — sets `_levelEndTimer = 1 s`.
   - If campaign complete (BOJ defeated): routes to `showCampaignVictory()`.
5. One second later, `tick()` fires `{ action: 'LEVEL_END' }`.
6. If `hasNextLevel()` is true: `showV8Intermission()` is called (game state → PAUSE, DOM intermission screen shown).
7. If no next level exists: `showCampaignVictory()`.

Source: `src/systems/CollisionSystem.js:169-170`; `src/core/GameplayCallbacks.js:362-566`; `src/main.js:2992-3005`; `src/v8/LevelScript.js:518-525`.

### C.12 Intermission screen

DOM element `#v8-intermission-screen`. Displays "LEVEL N COMPLETE" / "NAME DOWN", score, kill count, best streak, next level name. Two buttons: CONTINUE (`advanceToNextV8Level()`) and MENU (`backToIntro()`).
- Source: `src/main.js:1943-2010`

### C.13 Level advance

`advanceToNextV8Level()`:
1. Clears `enemies[]` and releases all `enemyBullets` to pool.
2. `ScrollEngine.reset()` — scrollY → 0, mult → 1.0, speedOverride cleared.
3. `LevelScript.loadLevel(nextIdx)` — resets `_elapsed`, `_idx`, `_anchorIdx`, `_bossSpawned`, `_hcPrimed`, `_levelEndTimer`.
4. Syncs `level`, `runState.level`, `window.currentLevel` to new level number.
5. Calls `_startPlayCountdown()` — triggers 3-2-1 countdown + cinematic ship entry.
- Source: `src/main.js:1967-1998`

### C.14 Phase classification (telemetry only)

Kill events are bucketed into phases for `dbg.v8()` reports. Phase boundaries (approximate, telemetry only — no gameplay logic branches):

| Phase | Elapsed time range |
|---|---|
| OPENING | 0–30 s |
| BUILDUP | 30–60 s |
| ESCALATION | 60–100 s |
| PEAK | 100 s – CRUSH_ENTER_S |
| CRUSH | CRUSH_ENTER_S – 168 s |
| BOSS | 168 s+ |

Source: `src/v8/LevelScript.js:395-404`.

### C.15 Regional currency rosters

| Level | Boss | WEAK | MEDIUM | STRONG |
|---|---|---|---|---|
| L1 | FED (FEDERAL_RESERVE) | ₽ RUB, C$ CAD | Ⓒ USDC | $ USD |
| L2 | BCE | ₺ TRY, ₣ CHF | £ GBP | € EUR |
| L3 | BOJ | ₹ INR, ₩ KRW | 元 CNY | ¥ JPY |

Source: `src/v8/LevelScript.js:55, 124, 219`.

### C.16 HUD boss countdown indicator

During PLAY with V8 active, a top-center HUD indicator is drawn showing time-to-boss (or "CRUSH" label inside CRUSH window). Canvas-drawn, no gameplay effect.
- Source: `src/main.js:3833-3839`

---

## Formulas

### D.1 Enemy HP (per spawned unit)

```
scaledHP = calculateEnemyHP(calculateDifficulty(level, cycle), cycle)

calculateDifficulty(level, cycle):
  cycleIndex = min(cycle - 1, 2)
  baseDiff   = CYCLE_BASE[cycleIndex]          // [0.0, 0.40, 0.60]
  waveInCycle = (level - 1) % WAVES_PER_CYCLE
  return min(DIFFICULTY.MAX, baseDiff + waveInCycle × WAVE_SCALE)
    // WAVE_SCALE = 0.04, MAX = 1.0

calculateEnemyHP(difficulty, cycle):
  baseHP    = ENEMY_HP.BASE + floor(difficulty × ENEMY_HP.SCALE)
            = 30 + floor(difficulty × 40)
  cycleMult = ENEMY_HP.CYCLE_MULT[min(cycle-1, 2)]
            = [1.0, 1.8, 2.8][cycleIndex]
  return floor(baseHP × cycleMult)
```

This `scaledHP` is then applied multiplicatively to the regional tier base HP:

```
effectiveHP = tierTarget.hp × scaledHP

tierTarget.hp:
  L1: WEAK=0.85  MEDIUM=1.10  STRONG=1.40
  L2: WEAK=0.95  MEDIUM=1.25  STRONG=1.55
  L3: WEAK=1.05  MEDIUM=1.40  STRONG=1.75
```

Source: `src/config/BalanceConfig.js:53, 56, 551-554, 2617-2666`; `src/v8/LevelScript.js:32-50, 596-615`.

Example (C1, L1, STRONG): `diff=0.0` → `baseHP=30` → `cycleMult=1.0` → `scaledHP=30` → `effectiveHP = 1.40 × 30 = 42`.

### D.2 Enemy score value (val)

`val` is taken directly from the tier target (not multiplied by difficulty):

```
effectiveVal = tierTarget.val

tierTarget.val:
  L1: WEAK=22  MEDIUM=50  STRONG=90
  L2: WEAK=24  MEDIUM=55  STRONG=100
  L3: WEAK=26  MEDIUM=60  STRONG=108
```

Source: `src/v8/LevelScript.js:33-47, 613`.

### D.3 Fire budget (bullets per second)

The HarmonicConductor computes `maxPerSecond` each frame:

```
Step 1 — Base from cycle:
  cycleIdx = min(marketCycle - 1, 2)
  max = BULLETS_PER_SECOND[cycleIdx]    // [8, 20, 35]

Step 2 — Bear Market:
  if isBearMarket: max += BEAR_MARKET_BONUS   // +10

Step 3 — PANIC phase:
  if waveIntensity.currentPhase === 'PANIC':
    max *= PANIC_MULTIPLIER   // × 1.3

Step 4 — Rank scaling:
  rank ∈ {-1, 0, +1}
  max *= (1 + rank × RANK_SCALE)   // RANK_SCALE = 0.15

Step 5 — Elemental Aggression:
  if ELEMENTAL_AGGRESSION.ENABLED && perkLevel > 0:
    lvl = min(perkLevel, 3)
    max *= 1 + SCALE[lvl-1]   // SCALE = [0.10, 0.15, 0.20]

Step 6 — V8 ramp (campaign only):
  t = clamp(LevelScript._elapsed / BOSS_AT_S, 0, 1)   // BOSS_AT_S = 170
  curved = (CURVE === 'quad') ? t² : t                // v7.12.3: 'lin'
  rampMul = START + (END - START) × curved
          = 0.50 + 0.50 × t                            // v7.12.3
  max *= rampMul

Step 7 — Level multiplier:
  max *= LEVEL_MULT[LevelScript._levelIdx]
       = [1.0, 1.10, 1.25][_levelIdx]                  // v7.12.3

Step 8 — Round:
  maxPerSecond = round(max)
```

Budget recharges each frame: `available += maxPerSecond × dt`, capped at `maxPerSecond × 1.5`.

Source: `src/systems/HarmonicConductor.js:228-288`; `src/config/BalanceConfig.js:2462-2490`.

**Example (C1, L1, neutral, t=0.0):** `max = 8 × 0.50 × 1.0 = 4.0 BPS`
**Example (C1, L3, neutral, t=1.0):** `max = 8 × 1.0 × 1.25 = 10.0 BPS`

### D.4 V8 ramp — prior quad spike (rationale for v7.12.3)

Before v7.12.3: `START=0.35, CURVE='quad'`. At t=0.5 (85 s): `rampMul = 0.35 + 0.65×0.25 = 0.51`. At t=0.75 (127 s): `rampMul = 0.35 + 0.65×0.5625 = 0.72`. The quad acceleration caused a rapid ramp from ~50% to 100% in the 90–120 s window — the documented "fire spike". Linear curve distributes ramp uniformly at `0.50/170 ≈ 0.003/s`.

### D.5 Scroll speed (LUT-based, ScrollEngine)

`ScrollEngine` uses a piecewise-linear look-up table. Default LUT (used for all 3 levels — see Gap #2 in Edge Cases):

| scrollY (px) | v (px/s) |
|---|---|
| 0 | 60 |
| 2400 | 100 |
| 6000 | 100 |
| 9000 | 140 |
| 12000 | 180 |
| 14500 | 180 |
| 15500 | 40 |
| 17500 | 40 |
| 18000 | 40 |

Linear interpolation between adjacent keyframes; clamps at table boundaries.

```
effectiveSpeed = halted ? 0 : (speedOverride ?? sampleSpeed(scrollY)) × mult
```

`mult` ramps toward `multTarget` at `multRate = |multTarget - mult| / rampTime` per second.

**DT clamp:** `dt = min(dtRaw, 0.050)` — protects against frame-skip scroll jumps.

Source: `src/systems/ScrollEngine.js:24-90`.

### D.6 Speed multiplier ramp (CRUSH)

```
setSpeedMultiplier(target, ramp):
  multTarget = target
  multRate   = |target - mult| / max(0.001, ramp)
```

Each tick: `mult += sign(multTarget - mult) × multRate × dt` until `mult === multTarget`. Optional decay tail available (not used by CRUSH_EXIT).

Source: `src/systems/ScrollEngine.js:66-79, 119-126`.

### D.7 HOVER pattern dwell Y target

```
_hoverY (scripted HOVER) = gameHeight × 0.28
```

Source: `src/config/BalanceConfig.js:43`; `src/entities/Enemy.js:291`.

### D.8 SWOOP X trajectory

```
swoopDir = lane < 0.5 ? +1 : -1
spawnX   = lane < 0.5 ? SIDE_MARGIN (30) : gameWidth - SIDE_MARGIN (30)
x(t)     = spawnX + swoopDir × sin(patTimer × 1.3) × CURVE_AMP  (140 px — see Gap #5)
```

Source: `src/config/BalanceConfig.js:44`; `src/entities/Enemy.js:314-315`.

---

## Edge Cases

### E.1 Boss death mid-CRUSH script

If the player kills the boss before `CRUSH_EXIT` fires (e.g., t=160 s on L3 where CRUSH runs 142–168 s), CRUSH_EXIT will never fire — `_anchorIdx` stops advancing because the tick guard `!isBossActive` blocks `LevelScript.tick()`. `ScrollEngine.halt()` on boss spawn overrides the multiplier. On `advanceToNextV8Level()`, `ScrollEngine.reset()` clears `mult`, `speedOverride`, and `halted` — next level starts clean.

**Gap:** No explicit CRUSH_EXIT call on boss spawn. If V8 halt is ever skipped (bug), scroll continues at elevated speed until `ScrollEngine.resume(40)` in `onBossDeath` overrides — only after celebration delay.

### E.2 Pause during V8 level

`LevelScript.tick()` only runs when `gameState === 'PLAY'`, so `_elapsed` freezes. `ScrollEngine.update()` similarly gated, so `scrollY` freezes. On resume, both continue from where they stopped. No correction needed.

### E.3 Player death during CRUSH phase

Player death triggers standard death handler (lives, invuln, ship re-entry). `LevelScript._elapsed` continues accumulating (tick is not paused for player death unless `gameState` leaves PLAY). CRUSH anchors fire at scheduled times regardless. Scroll multiplier remains active through respawn. **By design** — no slow-down on respawn during CRUSH (intended difficulty escalation).

### E.4 Restart (backToIntro / triggerGameOver)

`triggerGameOver` → `startGame()` → `G.LevelScript.reset()` resets `_levelIdx = 0`, `_elapsed = 0`, all pointers. `ScrollEngine.reset()` is called on `advanceToNextV8Level()` and on game restart.

### E.5 Boss spawn while enemies still on screen

`startBossWarning()` calls `clearBattlefield()` — `enemies = []` and bullets pooled before boss spawns. In-flight enemies cleared.

### E.6 Player death in BOSS phase

`_bossSpawned` prevents re-trigger. `LevelScript.tick()` gated by `isBossActive = !!boss`, so no bursts/anchors advance. Level end only via `scheduleLevelEnd()` from `onBossDeath`.

### E.7 `scheduleLevelEnd` called twice

Sets `_levelEndTimer = delay`. Second call overwrites — restarts the 1-second countdown, delaying `LEVEL_END` by ≤1 extra second. Race-safe.

### E.8 `hasNextLevel()` returning false on intermission click

Defensive guard in `advanceToNextV8Level()`: `if (nextIdx >= LEVELS.length) { triggerGameOver(); }`. Should not occur in practice (L3 routes to victory, not intermission).

### E.9 HarmonicConductor generation counter

`HarmonicConductor.reset()` increments `generation`. Pending `setTimeout` callbacks capture `gen` at creation and bail if changed. Prevents ghost fire commands from a previous level surviving `loadLevel()`.

---

## Dependencies

| System | File | Interaction |
|---|---|---|
| HarmonicConductor | `src/systems/HarmonicConductor.js` | Reads `_elapsed`/`BOSS_AT_S` for V8 ramp; consumes `_fireSuppressed`/`_fireSuppressedByEntry` flags |
| ScrollEngine | `src/systems/ScrollEngine.js` | CRUSH multiplier set by anchors; `halt()` on boss spawn; `resume(40)` on boss death; `reset()` on level advance |
| LevelScript | `src/v8/LevelScript.js` | Central orchestrator; public API: `tick`, `loadLevel`, `scheduleLevelEnd`, `hasNextLevel`, `currentLevelNum`, `currentLevelName`, `reset` |
| main.js | `src/main.js` | Calls `tick(dt)` each frame; renders intermission DOM; wires advance; overrides boss type |
| GameplayCallbacks | `src/core/GameplayCallbacks.js` | `onBossDeath()` post-boss flow (resume → celebration → schedule level end) |
| Enemy | `src/entities/Enemy.js` | Reads `V8_MODE.PATTERNS`; exposes `_v8Fall`, `_entryPattern`, `_fireSuppressedByEntry` |
| ArcadeModifiers | `src/managers/ArcadeModifiers.js` | `isArcadeMode()` checked at every V8 branch — campaign only |
| CollisionSystem | `src/systems/CollisionSystem.js` | Fires `onBossDeath(boss)` when HP ≤ 0 |
| EventBus | `G.Events` | `'enemy_killed'` hook for telemetry (pattern, phase, Y-bucket) |
| Audio | `G.Audio` | `setDetune(-100, 2.0)` on CRUSH_ENTER; `setDetune(0, 1.5)` on CRUSH_EXIT |
| EffectsRenderer | `G.EffectsRenderer` | `applyShake(4.0)` + `triggerDamageVignette()` on CRUSH_PEAK |
| CampaignState / Leaderboard | (various) | Campaign complete = `defeatedBossType === 'BOJ'`; LB worker maps Story→`wave=5/cycle=level` |

**Broken / missing GDDs in `design/gdd/`:** every dependency above has zero GDD coverage in this repo (`design/gdd/` was empty before this file). All of them are implemented in code but undocumented at the design-doc level.

---

## Tuning Knobs

All keys live in `G.Balance` (= `src/config/BalanceConfig.js`) **unless noted as in `LevelScript.js`**.

### G.1 V8_MODE block (BalanceConfig.js:22-45)

| Key | Value | Effect |
|---|---|---|
| `V8_MODE.ENABLED` | `true` | Master kill-switch. `false` → WaveManager. |
| `V8_MODE.BOSS_AT_S` | `170` | **Unused at runtime** — superseded by `LEVELS[i].BOSS_AT_S`. Fallback only. |
| `V8_MODE.DEFAULT_ENEMY_VY` | `40 px/s` | Fallback fall speed for DIVE if pattern config missing. |
| `V8_MODE.SPAWN_Y_OFFSET` | `-40` | Spawn Y. v7.12: was -80. |
| `V8_MODE.ENTRY_BURST.ENABLED` | `true` | Cinematic entry kill-switch. |
| `V8_MODE.ENTRY_BURST.VY` | `260 px/s` | Fast-fall during entry. |
| `V8_MODE.ENTRY_BURST.UNTIL_Y` | `40 px` | Y at which normal vy resumes. |
| `V8_MODE.ENTRY_BURST.PATTERNS` | `['DIVE','SINE','SWOOP','HOVER']` | Patterns receiving entry burst. |
| `V8_MODE.PATTERNS.ENABLED` | `true` | Pattern kill-switch. |
| `V8_MODE.PATTERNS.DIVE.ACCEL` | `10 px/s²` | DIVE gravity. |
| `V8_MODE.PATTERNS.SINE.AMPLITUDE` | `70 px` | SINE half-width. |
| `V8_MODE.PATTERNS.SINE.FREQ` | `2.0 rad/s` | SINE frequency. |
| `V8_MODE.PATTERNS.HOVER.Y_TARGET_RATIO` | `0.28` | Scripted HOVER Y. |
| `V8_MODE.PATTERNS.HOVER.DWELL` | `2.5 s` | Scripted HOVER dwell. |
| `V8_MODE.PATTERNS.HOVER.EXIT_VY` | `-180 px/s` | Scripted HOVER exit. |
| `V8_MODE.PATTERNS.HOVER.APPROACH_VY` | `60 px/s` | Scripted HOVER descent. |
| `V8_MODE.PATTERNS.SWOOP.APPROACH_VY` | `50 px/s` | SWOOP descent. |
| `V8_MODE.PATTERNS.SWOOP.CURVE_FREQ` | `1.3 rad/s` | SWOOP lateral freq. |
| `V8_MODE.PATTERNS.SWOOP.CURVE_AMP` | `TBD — 140 px` | SWOOP lateral amplitude. **Design review 2026-04-27: 140 px exceeds screen bounds; 80 px recommended.** |
| `V8_MODE.PATTERNS.SWOOP.SIDE_MARGIN` | `30 px` | SWOOP edge spawn distance. |

### G.2 TIER_TARGETS_BY_LEVEL — *in LevelScript.js, NOT BalanceConfig*

| Level | WEAK hp | WEAK val | MEDIUM hp | MEDIUM val | STRONG hp | STRONG val |
|---|---|---|---|---|---|---|
| L1 | 0.85 | 22 | 1.10 | 50 | 1.40 | 90 |
| L2 | 0.95 | 24 | 1.25 | 55 | 1.55 | 100 |
| L3 | 1.05 | 26 | 1.40 | 60 | 1.75 | 108 |

Source: `src/v8/LevelScript.js:32-48`. **To tune: edit LevelScript.js directly.** Convention violation: this should arguably move into BalanceConfig.

### G.3 FIRE_BUDGET (BalanceConfig.js:2462-2477)

| Key | Value |
|---|---|
| `FIRE_BUDGET.ENABLED` | `true` |
| `FIRE_BUDGET.BULLETS_PER_SECOND` | `[8, 20, 35]` (C1/C2/C3) |
| `FIRE_BUDGET.WAVE_GRACE_PERIOD` | `2.5 s` |
| `FIRE_BUDGET.BEAR_MARKET_BONUS` | `+10` |
| `FIRE_BUDGET.PANIC_MULTIPLIER` | `1.3×` |
| `FIRE_BUDGET.RANK_SCALE` | `0.15` |
| `FIRE_BUDGET.ELEMENTAL_AGGRESSION.ENABLED` | `true` |
| `FIRE_BUDGET.ELEMENTAL_AGGRESSION.SCALE` | `[0.10, 0.15, 0.20]` |

### G.4 FIRE_BUDGET.V8_RAMP (BalanceConfig.js:2481-2489)

| Key | Value | Effect |
|---|---|---|
| `V8_RAMP.ENABLED` | `true` | Kill-switch. |
| `V8_RAMP.START` | `0.50` | Multiplier at t=0. v7.12.3: was 0.35. |
| `V8_RAMP.END` | `1.0` | Multiplier at t=BOSS_AT_S. |
| `V8_RAMP.CURVE` | `'lin'` | `'lin'` or `'quad'`. v7.12.3: was 'quad'. |
| `V8_RAMP.LEVEL_MULT` | `[1.0, 1.10, 1.25]` | Per-level multiplier. |

### G.5 CRUSH anchor values — *in LevelScript.js*

To tune: edit `LEVEL_1_ANCHORS`, `LEVEL_2_ANCHORS`, `LEVEL_3_ANCHORS` in `src/v8/LevelScript.js:116-119, 209-213, 315-319`.

### G.6 Enemy HP curve params (BalanceConfig.js:50-60, 551-554)

| Key | Value |
|---|---|
| `DIFFICULTY.CYCLE_BASE` | `[0.0, 0.40, 0.60]` |
| `DIFFICULTY.WAVE_SCALE` | `0.04` |
| `DIFFICULTY.BEAR_MARKET_BONUS` | `0.25` |
| `DIFFICULTY.MAX` | `1.0` |
| `ENEMY_HP.BASE` | `30` |
| `ENEMY_HP.SCALE` | `40` |
| `ENEMY_HP.CYCLE_MULT` | `[1.0, 1.8, 2.8]` |

### G.7 Timing constants (BalanceConfig.js:818, 1044)

| Key | Value |
|---|---|
| `BOSS.WARNING_DURATION` | `2.0 s` |
| `TIMING.BOSS_CELEBRATION_DELAY` | `7.5 s` |

---

## Acceptance Criteria

Each criterion is independently testable.

### H.1 V8 mode activates exclusively in campaign

**Test:** Launch in Arcade. Verify `G.LevelScript.tick()` is never called (breakpoint or `dbg.on()`); WaveManager spawns formations.
**Pass:** No V8 log entries; formation waves spawn; `_elapsed` stays 0.

### H.2 Burst spawn schedule accuracy (±0.1 s)

**Test:** Start C1 campaign. First L1 burst should fire at `at_s=2.0` (₽ at lanes [0.3, 0.7]).
**Pass:** Two ₽ enemies appear at 2.0 s ±0.1 s, at 30% and 70% of screen width.

### H.3 CRUSH speed ramp activates at correct times

**Test (L1):** At t=150 s `_speedMult` climbs toward 1.8; at t≈152 shake>0 + vignette; at t≈168 ramps back toward 1.0.
**Pass:** All three anchor effects fire within ±0.5 s of scripted times.

### H.4 Scroll halts on boss spawn; resumes on boss death

**Test:** Reach t=170. Verify `ScrollEngine._halted === true` after `spawnBoss()`. Kill boss via `dbg.v8KillBoss()`. Verify `_halted === false` and `getSpeed() ≈ 40` within 1 frame.
**Pass:** Halt during boss; resume at 40 px/s on death.

### H.5 `scheduleLevelEnd(1)` fires LEVEL_END after 1 s

**Test:** Call `G.LevelScript.scheduleLevelEnd(1)` in console during PLAY.
**Pass:** Intermission appears 1.0 s ±0.1 s later.

### H.6 Intermission CONTINUE advances cleanly

**Test:** Complete L1, click CONTINUE. Verify `currentLevelNum() === 2`, `scrollY === 0`, `enemies.length === 0`, `window.currentLevel === 2`, BCE currencies spawn within 5 s.
**Pass:** All five conditions satisfied.

### H.7 Fire budget ramp matches formula

**Test (C1, L1, neutral):** At t=0: `maxPerSecond` should be `round(8 × 0.50 × 1.0) = 4`. At t=85: `round(8 × 0.75 × 1.0) = 6`.
**Pass:** Values match expected ±1.

### H.8 Fire budget per-level multiplier applies (L2 vs L1)

**Test:** At t=85 on L1 note `maxPerSecond`. Set `_levelIdx=1`, recalc.
**Pass:** L2 value ≈ L1 value × 1.10 (±1).

### H.9 Tier HP targets override base FIAT_TYPES stats

**Test:** L3 STRONG `¥`. Its hp should be `1.75 × scaledHP`, not `0.8 × scaledHP` (base).
**Pass:** `enemy.hp === floor(tierTarget.hp × scaledHP)` for the correct level index.

### H.10 Campaign completion routes to victory

**Test:** Kill BOJ on L3.
**Pass:** `showCampaignVictory()` (or `showGameCompletion()` first run) — no intermission.

### H.11 Boss type per level matches script declaration

**Test:** L2 boss spawn.
**Pass:** `window.boss.bossType === 'BCE'`.

### H.12 ScrollEngine DT clamp prevents tab-switch runaway

**Test:** Switch tabs 5 s, return. Single-frame `scrollY` jump bounded by `180 × 0.050 × 2.6 = 23.4 px`.
**Pass:** No frame jumps `scrollY` by > 25 px.

### H.13 Level 3 CRUSH density matches v7.12.3 target

**Test:** Count burst entries in `LEVEL_3_SCRIPT` between t=142 s and t=168 s (26 s CRUSH window).
**Pass:** Exactly 19 bursts (≈0.73 bursts/s).

---

## Documented Gaps (informational — flagged for review)

1. ~~**`HOVER_GATE.EASE_IN_MS = 400`**~~ **Resolved v7.12.5**: dead key removed; snap-stop confirmed as intentional feel.

2. **ScrollEngine LUT is L1-only.** `ScrollEngine.DEFAULT_LUT` is the FED profile, hardcoded; no `setProfile()` called between levels. L2/L3 use the same LUT. Consider per-level scroll profiles (see Recommended Improvements below).

3. **`scheduleLevelEnd` delay asymmetry.** Story-screen path skips the 1 s timer; non-story path uses it. Intermission appears ~1 s later in non-story path. Not commented in code.

4. **Off-screen cull `cullY = gameHeight + 120`** is a magic number with no config key.

5. **SWOOP amplitude exceeds screen bounds.** `CURVE_AMP` (140 px) + `SIDE_MARGIN` spawn (30 px from edge) causes the sine oscillation to clamp at `[30, gameWidth-30]` for ~2.4 s per half-cycle, destroying the sweeping arc. ~~Recommended fix: reduce `CURVE_AMP` to ~80 px.~~ *(Design review 2026-04-27: flagged for fix.)*

6. **No top-side enemy cull.** Enemies in scripted HOVER LEAVE state (vy = -180 px/s) fly upward and accumulate indefinitely in the enemies array. There is no culling for `y < -200`. ~~Recommended fix: add top-side cull in LevelScript tick.~~ *(Design review 2026-04-27: flagged for fix.)*

7. **LUT deceleration inverts apparent enemy motion.** At scrollY ≈ 14500–15500 the LUT drops from 180 to 40 px/s over ~10 s. Enemy apparent vertical velocity inverts from ≈ -140 px/s (rising on screen) to ≈ 0 px/s (hovering in place). This affects all four movement patterns and is undocumented. *(Design review 2026-04-27: flagged for review.)*

## Recommended Improvements (non-blocking)

1. **Per-level scroll profiles.** The same `DEFAULT_LUT` is used for all 3 levels. Per-level breakpoints with different scroll personalities (L1 steady, L2 erratic, L3 relentless) would give each region distinct pacing. (See Gap #2.)

2. **CRUSH-specific enemy variant or behavior.** CRUSH is numerically intense (speed multiplier + fire budget ramp) but uses the same enemy patterns as PEAK. A CRUSH-exclusive variant (e.g., gold-plated currency enemies with unique bullet patterns) would make the set-piece feel qualitatively distinct.

*End of GDD — V8 Scroller v7.12.4 — revised 2026-04-27*
