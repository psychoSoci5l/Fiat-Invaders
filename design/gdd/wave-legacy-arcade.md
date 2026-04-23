---
status: reverse-documented
source: src/managers/WaveManager.js, src/config/BalanceConfig.js
date: 2026-04-23
verified-by: psychoSocial
scope: M
---

# Wave System (Legacy / Arcade) — Game Design Document

**System:** Wave-based enemy spawning with phase streaming, formation generators, and cycle/arcade scaling. **Arcade mode only** as of v7.5.0 — campaign uses [V8 Scroller](v8-scroller.md) instead.
**Version covered:** v7.12.9 (reverse-documented from code)
**Status:** Shipped, active in Arcade mode only
**File audience:** Designers, engineers, QA

> **Note**: This document was reverse-engineered from the existing implementation. It captures current behavior and clarified design intent accumulated over ~6 years of iteration. Some tuning values carry comment trails (`v4.x: A→B`) — preserved where relevant.

---

## A. Overview

The legacy **Wave System** is a wave-by-wave, phase-streaming enemy spawn system. Each level = 1 wave; each wave contains 2–3 **phases**; each phase is an independently configurable formation (count + formation type + allowed currencies). The next phase spawns when the previous is ~25% cleared — so the player sees a continuous stream of enemies instead of "wave cleared → pause → next wave". Wave counter increments only when all phases are spawned and all enemies are dead.

Since **v7.5.0** the campaign runs on the V8 Scroller instead of the wave system. The legacy wave path is therefore **Arcade-mode only** — gated by `if (V8_MODE.ENABLED && !isArcade) return null` at the top of `WaveManager.update()` [WaveManager.js:49–52](src/managers/WaveManager.js:49). In Arcade the waves escalate across 3 cycles (C1 "Awakening", C2 "Conflict", C3 "Reckoning"), then **post-C3** the system loops back to C1 definitions with formation remixing and +20%/cycle difficulty.

The system ships with **15 baseline waves** (5 per cycle × 3 cycles) and **~20 formation generators** covering simple tutorial shapes, mid-complexity patterns, and chaotic endgame formations.

---

## B. Player Fantasy

Each cycle has a theme: C1 is **Awakening** (tutorial-friendly shapes, weak/medium currencies), C2 is **Conflict** (more aggressive formations, Euro/Dollar blocs confront each other), C3 is **Reckoning** (digital threats like CBDC `Ⓒ`, swirling formations like Hurricane/Vortex, full currency mix). Wave names reinforce theme: "First Contact", "Eastern Front", "Digital Doom", "Endgame". The player feels narrative progression through formation complexity and currency strength, not through numeric inflation.

The phase-streaming design prevents the "wait for the last enemy to wander in" dead-time problem. When ~75% of a phase is dead, the next phase shows up — the player is always under pressure. The hard cap on concurrent enemies (`MAX_CONCURRENT_ENEMIES: 18`) keeps the screen readable.

**Arcade** trades content-depth for infinite loop pacing: faster intermissions (2s vs 3.2s), +15% enemies, -15% HP (swarm-friendly for combo runs), and post-C3 formation randomization so repeat cycles don't feel identical.

---

## C. Detailed Rules

### C.1 Wave structure

A wave is defined in `Balance.WAVE_DEFINITIONS.WAVES[]` [BalanceConfig.js:1502–1628](src/config/BalanceConfig.js:1502). Shape:

```js
{
  cycle: 1, wave: 1, name: 'First Contact',
  phases: [
    { count: 14, formation: 'RECT', currencies: ['¥', '₽', '₹'] },
    { count: 12, formation: 'RECT', currencies: ['¥', '₽', '₹'] },
    { count: 12, formation: 'WALL', currencies: ['¥', '₽', '₹'] }
  ]
}
```

Lookup: `Balance.getWaveDefinition(cycle, waveInCycle)` [BalanceConfig.js:2821–2854](src/config/BalanceConfig.js:2821).

### C.2 Cycle mapping and post-C3 loop

- `WAVES_PER_CYCLE: 5` ([BalanceConfig.js: `Balance.WAVES.PER_CYCLE`](src/config/BalanceConfig.js), read via `WaveManager.getWavesPerCycle()` [WaveManager.js:39–42](src/managers/WaveManager.js:39)).
- `waveInCycle = ((wave - 1) % 5) + 1`.
- Cycles 1–3 use defined waves 1–5 for that cycle.
- **Post-C3 mapping** (Arcade only, C ≥ 4): `effectiveCycle = ((cycle - 1) % 3) + 1`. So C4→C1 defs, C5→C2, C6→C3, C7→C1, etc. [BalanceConfig.js:2829](src/config/BalanceConfig.js:2829).
- **Formation remix** on post-C3 replays: `remixChance = arcadeCfg.POST_C3_FORMATION_REMIX (0.40)` or `0.30` (non-Arcade fallback). Clones the wave def, rolls per-phase: if hit, replaces `phase.formation` with a random pick from the full formation pool (20 entries including currency-symbol shapes) [BalanceConfig.js:2839–2851](src/config/BalanceConfig.js:2839).

### C.3 Streaming state machine

`WaveManager` state [WaveManager.js:20–37](src/managers/WaveManager.js:20):
- `wave` — global wave counter, incremented when streaming completes.
- `isStreaming` — true between `prepareStreamingWave()` and full clear.
- `_streamingPhases[]` — phase defs for current wave.
- `_currentPhaseIndex`, `_phasesSpawned` — progress through phases.
- `_phaseTimer` — seconds since last phase spawned.
- `_phaseEnemyTag` / enemies' `_phaseIndex` — tracks which phase each enemy belongs to.
- `streamingSpawnedCount` — running total for current wave.

### C.4 Phase-trigger rules

From `Balance.STREAMING.PHASE_TRIGGER` [BalanceConfig.js:710–726](src/config/BalanceConfig.js:710):

| Key | Value | Meaning |
|---|---|---|
| `THRESHOLD_RATIO` | 0.25 | When current-phase alive ≤ 25% of spawned, trigger next |
| `MIN_THRESHOLD` | 3 | Threshold floor (min 3 alive to trigger) |
| `MAX_THRESHOLD` | 4 | Threshold ceiling (max 4 alive before forced trigger) |
| `MIN_PHASE_DURATION` | 3.0s | Min seconds before phase transition can occur |

The trigger logic [WaveManager.js:63–100](src/managers/WaveManager.js:63):

```
threshold = clamp(round(phaseOriginalCount × THRESHOLD_RATIO), MIN, MAX)
if phaseTimer ≥ MIN_PHASE_DURATION
   AND currentPhaseAlive ≤ threshold
   AND totalAlive + nextPhaseCount ≤ MAX_CONCURRENT_ENEMIES (18)
→ emit { action: 'SPAWN_PHASE', phaseIndex: _phasesSpawned }
```

Constants tuned in v6.5: `THRESHOLD_RATIO: 0.35→0.25` (trigger later), `MAX_CONCURRENT: 22→18` (less visual chaos), `MAX_PER_PHASE: 14`.

### C.5 Phase escalation

From `Balance.STREAMING.PHASE_ESCALATION` [BalanceConfig.js:718–721](src/config/BalanceConfig.js:718). Applied per phase index (0-based):

- `FIRE_RATE_PER_PHASE: 0.05` — +5% fire rate per phase beyond 0 (v6.5: halved from 0.10).
- `BEHAVIOR_BONUS_PER_PHASE: 0.05` — +5% behavior-chance per phase.

Read via `Balance.getPhaseModifiers(phaseIndex)` [BalanceConfig.js:2870–2878](src/config/BalanceConfig.js:2870):

```
phase0 → { fireRateMult: 1.0,  behaviorBonus: 0 }
phase1 → { fireRateMult: 1.05, _behaviorEscalation: 0.05 }
phase2 → { fireRateMult: 1.10, _behaviorEscalation: 0.10 }
```

Phase 0 always vanilla; escalation is per-phase-within-wave, not cumulative across waves.

### C.6 Count scaling pipeline

For each spawn, enemy count is transformed in order [WaveManager.js:150–168, 518–519](src/managers/WaveManager.js:150):

```
targetCount = phase.count
if isBearMarket:      targetCount × BEAR_MARKET.COUNT_MULT (1.25)
                      (also forces STRONG currencies in mix)
targetCount × CYCLE_COUNT_MULT[cycle-1]   // [1.0, 1.25, 1.45] v4.40
if isArcade:          targetCount × ARCADE.ENEMY_COUNT_MULT (1.15)
if RankSystem present:targetCount × getEnemyCountMultiplier()  (clamp floor 4)
targetCount = min(targetCount, STREAMING.MAX_PER_PHASE (14))
```

Bear Market forces STRONG currencies via `WAVE_DEFINITIONS.BEAR_MARKET.FORCE_STRONG: true` [BalanceConfig.js:1494–1497](src/config/BalanceConfig.js:1494). `CYCLE_COUNT_MULT` was nerfed in v4.40 from `[1.0, 1.375, 1.575]` to `[1.0, 1.25, 1.45]` to reduce inflation.

### C.7 Formation generators

20 named formations [BalanceConfig.js:1631–1666](src/config/BalanceConfig.js:1631):

| Complexity | Names | Typical cycle |
|---|---|---|
| Simple | RECT, WALL, DIAMOND, ARROW, PINCER, CHEVRON, FORTRESS | C1 |
| Mid | SCATTER, SPIRAL, CROSS, GAUNTLET | C2 |
| Complex | VORTEX, FLANKING, STAIRCASE, STAIRCASE_REVERSE, HURRICANE, FINAL_FORM | C3 |
| Symbol-art | BTC_SYMBOL, DOLLAR_SIGN, EURO_SIGN, YEN_SIGN, POUND_SIGN | C4+ (remix) |
| Legacy | V_SHAPE, COLUMNS, SINE_WAVE | (kept for back-compat) |

Each entry maps to a generator function in `WaveManager.generateFormation()` [WaveManager.js:620+](src/managers/WaveManager.js:620). Layout constants from `Balance.FORMATION` [BalanceConfig.js:1670–1689](src/config/BalanceConfig.js:1670):

- `SPACING: 78` (v4.25: 65→78 for 58px enemies), `SPACING_MIN: 62` (prevent overlap).
- `START_Y: 130` (v5.4.0: clears HUD zone).
- `MAX_Y_RATIO_BY_CYCLE: [0.42, 0.50, 0.58]` — per-cycle downward limit.
- `MAX_Y_PIXEL: 500` — absolute cap on tall screens.
- `RESPONSIVE: true` — spacing scales with screen width (kill-switch available).

### C.8 Currency assignment

Formations produce raw `positions[]`; currencies are assigned per-row using `WaveManager.assignCurrencies(positions, allowedCurrencies, cycle, isBearMarket)`. Rows are grouped by `ROW_TOLERANCE: 25px` on Y.

`WAVE_DEFINITIONS.CURRENCY_THEMES` [BalanceConfig.js:1476–1487](src/config/BalanceConfig.js:1476) provides named groups (ASIAN_BLOC, EURO_BLOC, EMERGING, DOLLAR_ALLIES, BRICS, DIGITAL_THREAT, WEAK_ONLY, MEDIUM_ONLY, STRONG_ONLY, ALL_MIX). Waves reference symbols directly, not themes — themes are a **documented reference palette**, not used at runtime in the wave defs.

Actual currency list resolved via `Balance.getCurrencyBySymbol(symbol)` → `Game.FIAT_TYPES` [BalanceConfig.js:2861–2863](src/config/BalanceConfig.js:2861).

### C.9 Entry animation

On spawn each enemy plays a weighted-random entry animation before settling [BalanceConfig.js:1692–1706](src/config/BalanceConfig.js:1692):

| Path | Weight | Description |
|---|---|---|
| SINE | 3 | Default sine curve from top |
| SWEEP | 2 | From left or right side |
| SPIRAL | 1 | Spiral descent from center |
| SPLIT | 2 | Two groups from opposite sides |

Constants: `ENTRY_SPEED: 600 px/s`, `STAGGER_DELAY: 0.04s` between enemies, `SPAWN_Y_OFFSET: -80px` (offscreen top), `SETTLE_TIME: 0.3s`, `CURVE_INTENSITY: 0.15`.

All enemies within one phase share the same entry path (picked once per phase via `_pickEntryPath()` [WaveManager.js:197–209](src/managers/WaveManager.js:197)).

### C.10 Enemy creation

`WaveManager.createEnemy(pos, currencyType, cycle, phaseMods, idx, entryPath, gw)` [WaveManager.js:214+](src/managers/WaveManager.js:214):

1. Compute scaled HP: `calculateEnemyHP(difficulty, cycle) × runState.cyclePower.hpMult (APC)`.
2. If Arcade: `HP × ENEMY_HP_MULT (0.85) × arcadeBonuses.enemyHpMult`.
3. Compute spawn coords based on `entryPath`.
4. Assign entry state (`isEntering`, `targetX/Y`, `entryDelay = idx × STAGGER_DELAY × entryMult`).
5. Apply tier-based behaviors: WEAK → isKamikaze (50% of behavior chance); STRONG → flanker/charger/etc. per `Balance.ENEMY_BEHAVIORS` (see Enemy Agents GDD).
6. `behaviorChance = min(0.5, 0.1 + cycle × 0.1) + phaseMods.behaviorBonus`.

### C.11 Intermission and wave increment

- `waveInProgress` flips `false` after last phase spawns.
- Wave counter increments inside `update()` streaming-complete branch (all phases spawned AND all enemies dead).
- On boss defeat → `gameState = INTERMISSION` → `intermissionTimer` runs → `START_WAVE` action.
- Intermission duration: `JUICE.INTERMISSION_BOSS_DURATION: 6.0s` (Story) or `ARCADE.INTERMISSION_BOSS_DURATION: 4.0s` [BalanceConfig.js:2884](src/config/BalanceConfig.js:2884).

### C.12 Pattern/bullet density per cycle

From `Balance.PATTERNS` [BalanceConfig.js:730–749](src/config/BalanceConfig.js:730):

| Cycle | GAP_SIZE | MAX_BULLETS | COMPLEXITY | TELEGRAPH |
|---|---|---|---|---|
| 1 | 100px | 15 | 1 | 0.30s |
| 2 | 75px | 30 | 2 | 0.20s |
| 3 | 55px | 50 | 3 | 0.15s |

Bear Market: `GAP_SIZE_BEAR_BONUS: -15`, `MAX_BULLETS_BEAR_BONUS: +15`, `COMPLEXITY_BEAR_BONUS: +1`, `TELEGRAPH_TIME_BEAR_MULT: 0.85`. Global hard cap: `GLOBAL_BULLET_CAP: 150` enemy bullets on screen.

---

## D. V8 vs Legacy routing

`WaveManager.update()` at [WaveManager.js:49–52](src/managers/WaveManager.js:49):

```js
const _isArcadeWM_v8 = G.ArcadeModifiers && G.ArcadeModifiers.isArcadeMode();
if (G.Balance?.V8_MODE?.ENABLED && !_isArcadeWM_v8) {
    return null;   // V8 campaign — WaveManager dormant
}
```

Result:
- **Campaign** (`V8_MODE.ENABLED = true`, not Arcade) → V8 Scroller owns spawns, WaveManager returns null every frame.
- **Arcade** (any cycle) → WaveManager owns spawns regardless of V8_MODE flag.
- **Legacy dev mode** (`V8_MODE.ENABLED = false`) → WaveManager owns campaign spawns too. Safety fallback if V8 is disabled for debugging.

---

## E. Feature Matrix

| Feature | Config key | Effect | Kill-switch |
|---|---|---|---|
| Phase-based streaming | `STREAMING.PHASE_TRIGGER.*` | Triggers next phase at 25% alive | Edit thresholds |
| Concurrent enemy cap | `STREAMING.MAX_CONCURRENT_ENEMIES` | 18 alive max | Raise |
| Phase escalation | `STREAMING.PHASE_ESCALATION.*` | +5% fire/behavior per phase | Zero out |
| Cycle count multiplier | `WAVE_DEFINITIONS.CYCLE_COUNT_MULT` | [1.0, 1.25, 1.45] | `[1,1,1]` |
| Bear Market | `WAVE_DEFINITIONS.BEAR_MARKET` | ×1.25 count + force STRONG | Set window flag false |
| Arcade count | `ARCADE.ENEMY_COUNT_MULT` | ×1.15 | Set to 1 |
| Arcade HP | `ARCADE.ENEMY_HP_MULT` | ×0.85 | Set to 1 |
| Post-C3 remix | `ARCADE.POST_C3_FORMATION_REMIX` | 40% chance | Set to 0 |
| Post-C3 difficulty | `ARCADE.POST_C3_DIFF_PER_CYCLE` | +20%/cycle | Set to 0 |
| Formation responsive | `FORMATION.RESPONSIVE` | Spacing scales with screen | `false` |
| Entry animation | `FORMATION_ENTRY.ENABLED` | On/off | `false` |
| Pattern bullet cap | `PATTERNS.GLOBAL_BULLET_CAP` | 150 global | Raise |

---

## F. Analytics / Debug

- `dbg.log('WAVE', ...)` — every wave/phase spawn log. Silent by default (category off).
- `dbg.waveReport()` — summary of current wave + streaming state.
- `dbg.streaming()` — toggle streaming debug output.
- `dbg.toggleStreaming()` — kill-switch for live testing.
- Boss fight trackers from boss GDD also apply on boss-spawn transition.

---

## G. Tuning Notes and Open Debts

1. **Dead code path: non-streaming `startWave` branch**. The file still carries a legacy non-streaming `startWave` path (around [WaveManager.js:150–192](src/managers/WaveManager.js:150)) — scaled-count logic + single formation spawn. The live path is `prepareStreamingWave()` for all waves (streaming is always on in v6.2+). Consider dead-code removal when enemy-streaming is confirmed permanent.
2. **CURRENCY_THEMES unused at runtime**. Named blocs (ASIAN_BLOC, BRICS, etc.) are a **documentation reference** — wave defs don't call them. They exist as a design palette for future wave authoring but currently they're a dead config branch.
3. **Legacy formations (V_SHAPE, COLUMNS, SINE_WAVE)** are registered but not used in any C1–C3 wave def. Kept for back-compat with older wave definitions or test scripts.
4. **Currency-symbol formations (BTC_SYMBOL, DOLLAR_SIGN, …)** are only reachable through post-C3 remix (40% chance). They never appear in the defined 15 waves. Effectively "Arcade surprise content".
5. **`WAVES.PER_CYCLE` duplication**: lives in `Balance.WAVES.PER_CYCLE` (5), read by `WaveManager.getWavesPerCycle()`. Separate from `Balance.V8_MODE.*` level counts. Worth confirming no drift.
6. **MAX_PER_PHASE interaction**: `STREAMING.MAX_PER_PHASE: 14` clamps per-phase count **after** scaling — a large wave (e.g. C3W5 phase 1: 22 × 1.45 × 1.15 Arcade = 36.7) gets hard-clipped to 14. This is **intentional** (v6.5 clamp) but means `phase.count` in wave defs of 15+ are not spawning their full budget.
7. **`WaveManager.isStreamingComplete()`** returns `this.isStreaming === false && streamingSpawnedCount > 0`. The `isStreaming` flip back to false is owned by the streaming-complete branch inside `update()`. Could be clarified with a dedicated state enum.
8. **Phase-index propagation**: enemies carry `_phaseIndex` for trigger-counting. Kill-path must not lose this tag — verified in Enemy.kill() but not in all teleport/phase-shift edge cases (e.g. BOJ intervention spawn). Low-risk, flagged.

---

## H. Cross-links

- [V8 Scroller GDD](v8-scroller.md) — replaces wave system in campaign mode (v7.5.0+).
- [Arcade Rogue Protocol GDD](arcade-rogue-protocol.md) — Arcade mode pacing, combo, modifier triggers on wave progress.
- [Boss System + Proximity Kill GDD](boss-proximity.md) — boss spawn slots into intermission flow after wave 5.
- [Drop System + APC GDD](drop-system-apc.md) — drop anchor `GUARANTEED_SPECIAL_WAVE: 4`, APC cycle transitions.
- [Enemy Agents GDD](enemy-agents.md) — tier classification, elite variants, behaviors applied to enemies created via `WaveManager.createEnemy`.
