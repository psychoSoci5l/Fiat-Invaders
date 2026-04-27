# ADR-0013: Wave System — Streaming, Formations, and Arcade Scaling

## Status
Accepted

## Date
2026-04-25

## Engine Compatibility

| Field | Value |
|-------|-------|
| **Engine** | Vanilla JavaScript (Canvas 2D, no framework) |
| **Domain** | Core / Spawning |
| **Knowledge Risk** | LOW — system shipped and active in Arcade mode since v6.2+ (v7.12.14) |
| **References Consulted** | `src/managers/WaveManager.js`, `src/config/BalanceConfig.js`, `src/core/GameStateMachine.js`, `src/systems/HarmonicConductor.js`, `design/gdd/wave-legacy-arcade.md` |
| **Post-Cutoff APIs Used** | None |
| **Verification Required** | None — pattern is shipped and active |

## ADR Dependencies

| Field | Value |
|-------|-------|
| **Depends On** | ADR-0001 (Game State Machine — PLAY/INTERMISSION gate), ADR-0008 (Drop System + APC — wave-anchored drops), ADR-0011 (Arcade Rogue Protocol — modifier stacking in Arcade waves), ADR-0012 (Enemy Elites — elites/behaviors applied at WaveManager spawn) |
| **Enables** | Arcade-mode wave progression, 15 baseline waves, 20 formation generators, phase-streaming state machine, count scaling, entry animation, per-cycle bullet density |
| **Blocks** | None |

## Context

### Problem Statement

The legacy **Wave System** is the enemy-spawning backbone for Arcade mode (and legacy campaign pre-v7.5). Six technical requirements define its architecture:

1. **15 baseline waves** (TR-WAV-001) — 5 per cycle × 3 cycles, each wave containing 2–3 streaming phases with per-phase formation + currency configuration.

2. **20 formation generators** (TR-WAV-002) — named grid-position functions producing enemy spawn coordinates, ranging from simple shapes (RECT, WALL) to complex symbol art (BTC_SYMBOL, DOLLAR_SIGN).

3. **Phase streaming trigger** (TR-WAV-003) — continuous-play trigger that spawns the next phase when ~25% of current phase is cleared, with a 3.0s minimum timer and `MAX_CONCURRENT_ENEMIES: 18` hard cap.

4. **Count scaling pipeline** (TR-WAV-004) — five multiplicative factors applied to base enemy count per wave: bear market (1.25×), cycle multiplier ([1.0, 1.25, 1.45]), Arcade bonus (1.15×), rank difficulty, and MAX_PER_PHASE clamp (14).

5. **Entry animation system** (TR-WAV-005) — four weighted-random entry paths (SINE/SWEEP/SPIRAL/SPLIT) with stagger delay and settle timing, one path per phase.

6. **Per-cycle bullet density scaling** (TR-WAV-007) — GAP_SIZE, MAX_BULLETS, COMPLEXITY, and TELEGRAPH_TIME change per cycle (C1→C2→C3) via `Balance.PATTERNS`.

### Constraints

- Arcade-mode only in v7.5+ — V8 campaign bypasses WaveManager entirely.
- Post-C3 (cycle ≥ 4) loops back to C1 definitions with formation remixing and +20%/cycle difficulty.
- Wave counter must only increment when all phases are spawned AND all enemies are dead.
- Phase streaming must prevent dead-time between phases without overwhelming the screen.
- All tuning values must live in `BalanceConfig.js` for iteration without code changes.

## Decisions

### Decision 1: Phase-Streaming State Machine with Threshold-Based Trigger

**WaveManager** uses a flat state machine with a single Boolean guard (`isStreaming`) plus phase tracking fields rather than a formal enum, because the system only needs to distinguish "streaming in progress" from "no active stream." The streaming-complete check is: all phases spawned AND all enemies dead.

The phase trigger formula (TR-WAV-003) is:

```
threshold = clamp(round(phaseOriginalCount × THRESHOLD_RATIO), MIN_THRESHOLD, MAX_THRESHOLD)
trigger when: phaseTimer ≥ MIN_PHASE_DURATION (3.0s)
           AND currentPhaseAlive ≤ threshold
           AND totalAlive + nextPhaseCount ≤ MAX_CONCURRENT_ENEMIES (18)
```

This gives:
- **Small phases** (count ≤ 12): threshold floors at 3, so 1–2 survivors don't trigger premature next-phase.
- **Medium phases** (count 13–16): threshold is 4 (ceiling), preventing a single straggler from blocking progression.
- **Large phases** (count 16+): threshold is calculated at 25%, but MAX_CONCURRENT provides a backpressure valve — if a 14-enemy phase can't fit, it waits.

**Decision rationale**: The threshold-based approach with clamp bounds is simpler than a timer-only system (would create dead-time) or a pure percentage (fragile at low counts). The 3.0s `MIN_PHASE_DURATION` prevents rapid-fire triggers if a phase is very small. The `MAX_CONCURRENT_ENEMIES` cap prevents screen overload, accepting brief "lulls" when the cap is reached.

### Decision 2: 20 Formation Generators as Discrete Coordinate Functions

Each formation generator is a named function on `WaveManager.generateFormation()` producing an array of `{x, y}` positions. Formations are organized into four complexity tiers (TR-WAV-002):

| Complexity | Examples | Typical Cycle |
|---|---|---|
| Simple | RECT, WALL, DIAMOND, ARROW, PINCER, CHEVRON, FORTRESS | C1 |
| Mid | SCATTER, SPIRAL, CROSS, GAUNTLET | C2 |
| Complex | VORTEX, FLANKING, STAIRCASE, STAIRCASE_REVERSE, HURRICANE, FINAL_FORM | C3 |
| Symbol-art | BTC_SYMBOL, DOLLAR_SIGN, EURO_SIGN, YEN_SIGN, POUND_SIGN | C4+ (remix) |

Layout parameters from `Balance.FORMATION`:
- `SPACING: 78`px between enemies (v4.25: 65→78 for 58px sprites)
- `START_Y: 130`px (v5.4.0: clears HUD zone)
- `MAX_Y_RATIO_BY_CYCLE: [0.42, 0.50, 0.58]` — per-cycle vertical cap
- `MAX_Y_PIXEL: 500` — absolute cap on tall screens
- `RESPONSIVE: true` — spacing scales with canvas width

**Decision rationale**: Discrete functions over a parametric system because formations need arbitrary geometric layout (spiral math, sine curves, currency-art shapes) that a unified parameter set cannot express. The `RESPONSIVE` flag scales spacing uniformly rather than reformatting geometry, preserving shape integrity across screen sizes. Five symbol-art formations are only reachable via post-C3 remix (40% chance per phase), making them "surprise content" for Arcade endurance runs.

### Decision 3: Five-Factor Count Scaling Pipeline with Hard Clamp

Enemy count per phase passes through a fixed-order pipeline before spawning (TR-WAV-004):

```
count = phase.baseCount
count ×= BEAR_MARKET.COUNT_MULT (1.25)       // step 1: bear market
count ×= CYCLE_COUNT_MULT[cycle-1]             // step 2: [1.0, 1.25, 1.45]
count ×= ARCADE.ENEMY_COUNT_MULT (1.15)         // step 3: arcade bonus
count ×= getEnemyCountMultiplier()             // step 4: rank difficulty
count  = min(count, MAX_PER_PHASE(14))          // step 5: hard clamp
```

Order matters: bear market applies first so its count boost is visible before cycle/arcade multipliers inflate further. The `MAX_PER_PHASE: 14` clamp (added in v6.5) is the final step — a hard ceiling that prevents any single phase from exceeding 14 enemies regardless of combined multipliers.

**Decision rationale**: The hard clamp at 14 is intentional — it bounds per-wave complexity so formation geometry remains readable. A consequence: waves with base count 14+ (e.g., C3W5 phase 1: base 22 × 1.45 × 1.15 ≈ 36.7) are all clipped to 14, meaning count scaling beyond `MAX_PER_PHASE / (baseCount)` is cosmetic for large waves. This is acceptable because the *perception* of difficulty comes from cycle escalation across all waves, not from a single phase's count.

### Decision 4: Entry Animation as Weighted-Random Per-Phase Assignment

Each phase picks one of four entry paths at spawn time via `_pickEntryPath()` (TR-WAV-005). All enemies in the phase share the same path, applied with per-enemy stagger:

| Path | Weight | Behavior |
|---|---|---|
| SINE | 3 | Sine-wave curve from top of screen to target position |
| SWEEP | 2 | Sweep in from left or right canvas edge |
| SPIRAL | 1 | Spiral descent from center-top |
| SPLIT | 2 | Two groups enter from opposite sides |

Constants: `ENTRY_SPEED: 600` px/s, `STAGGER_DELAY: 0.04`s, `SPAWN_Y_OFFSET: -80`px, `SETTLE_TIME: 0.3`s, `CURVE_INTENSITY: 0.15`.

Each enemy enters with `isEntering = true`, `targetX/Y = formation position + entry offset`, and an `entryDelay = idx × STAGGER_DELAY × entryMult`. The enemy's update loop checks `isEntering` and interpolates toward `targetX/Y`. When settled (`SETTLE_TIME` elapsed at target), `isEntering` flips to `false` and the enemy begins normal behavior.

**Decision rationale**: Per-phase (not per-enemy) randomization keeps formation coherence — a mixed-entry formation would look chaotic. Sine-heavy weighting (3/8) produces the most readable entry, while SPIRAL (1/8) is a rare visual treat. The entry state is a simple Boolean on the Enemy entity with no additional state machine.

### Decision 5: Per-Cycle Bullet Density Config via PATTERNS Table

Bullet density scales per cycle through a flat config table in `Balance.PATTERNS` (TR-WAV-007):

| Cycle | GAP_SIZE | MAX_BULLETS | COMPLEXITY | TELEGRAPH |
|---|---|---|---|---|
| 1 | 100px | 15 | 1 | 0.30s |
| 2 | 75px | 30 | 2 | 0.20s |
| 3 | 55px | 50 | 3 | 0.15s |

Bear market overrides: `GAP_SIZE_BEAR_BONUS: -15`, `MAX_BULLETS_BEAR_BONUS: +15`, `COMPLEXITY_BEAR_BONUS: +1`, `TELEGRAPH_TIME_BEAR_MULT: 0.85`.

Global hard cap: `GLOBAL_BULLET_CAP: 150` enemy bullets on screen, enforced by `HarmonicConductor` (see ADR-0010).

**Decision rationale**: A flat table rather than a formula provides explicit designer control over each cycle's feel. The progression (GAP shrinks, MAX_BULLETS climbs, telegraph shortens) creates a clear difficulty curve from C1 (wide gaps, slow, predictable) to C3 (tight patterns, dense fire, fast). Bear market shifts each tier by roughly one cycle step as a temporary difficulty spike.

### Decision 6: Post-C3 Infinite Loop via Definition Recycling

When cycle exceeds 3 in Arcade mode (TR-WAV-001 postloop behavior):

```
effectiveCycle = ((cycle - 1) % 3) + 1  // C4→C1, C5→C2, C6→C3, ...
remixChance = ARCADE.POST_C3_FORMATION_REMIX (0.40)
postC3DiffMult = 1.0 + (cycle - 3) × ARCADE.POST_C3_DIFF_PER_CYCLE (0.20)
```

The wave definition is cloned from the effective cycle, then each phase rolls against `remixChance` — if hit, `phase.formation` is replaced with a random pick from the full 20-entry formation pool (including symbol-art formations). Difficulty multiplier applies to enemy HP and damage at spawn time (see ADR-0012 for HP scaling details).

**Decision rationale**: Definition recycling avoids unbounded content generation while the remix system provides variety. The +20%/cycle difficulty ensures the run eventually becomes unwinnable, which is appropriate for an Arcade endurance mode. Cycle tracking continues past C3 for analytics even though no new wave definitions exist.

## Consequences

### Positive

- **Continuous play**: Phase streaming eliminates the "clear wave → wait → next wave" dead time. The player is under constant pressure.
- **Readable screen**: MAX_CONCURRENT_ENEMIES (18) + MAX_PER_PHASE (14) prevent visual chaos without explicit spawn gating.
- **Content depth without content explosion**: 15 waves × 20 formations × 4 entry paths × 4 complexity levels produces combinatorial variety without hand-authoring every combination.
- **Clear difficulty curve**: Per-cycle bullet density scaling + count multipliers + formation complexity tiers produce a predictable difficulty ramp.
- **Arcade endurance**: Post-C3 loop with remix and +20%/cycle creates infinite replayability within a single config system.

### Negative

- **MAX_PER_PHASE clamp masks count scaling**: Large-base waves (count 14+) never see the full effect of cycle/Arcade multipliers. The count scaling pipeline is partially cosmetic at high base counts.
- **Flat state machine**: The `isStreaming` Boolean + phase-tracking fields are less expressive than a formal state machine. The `waveInProgress` vs `isStreaming` distinction is confusing and has caused bugs (noted in GDD tuning debt #7).
- **Dead-code branches**: Legacy `startWave` (non-streaming) path still exists. Currency themes are defined but unused at runtime.

### Mitigations

- MAX_PER_PHASE clamp is documented in GDD as intentional; if per-wave density needs to increase, reduce `STREAMING.PHASE_TRIGGER.THRESHOLD_RATIO` per cycle rather than raising the cap.
- The `isStreaming` state could be migrated to a formal three-state enum (IDLE / STREAMING / COMPLETE) when the legacy non-streaming path is removed.
- All kill-switches exist in BalanceConfig: formation responsive (`FORMATION.RESPONSIVE`), entry animation (`FORMATION_ENTRY.ENABLED`), Arcade overrides, and per-cycle values.

## Verification

### Coverage
- TR-WAV-001: 15 baseline waves → `Balance.WAVE_DEFINITIONS.WAVES`, 5 per cycle × 3 cycles, 2–3 phases each. Post-C3 loop via `effectiveCycle` mapping + remix. ✅
- TR-WAV-002: 20 formation generators → `WaveManager.generateFormation()` with 20 named entries in 4 tiers. ✅
- TR-WAV-003: Phase trigger → `clamp(round(count × 0.25), 3, 4)` with 3.0s min, MAX_CONCURRENT=18 gate. ✅
- TR-WAV-004: Count scaling pipeline → 5 factors in fixed order with MAX_PER_PHASE=14 clamp. ✅
- TR-WAV-005: Entry animation → 4 weighted paths, per-phase pick, per-enemy stagger at 600 px/s. ✅
- TR-WAV-007: Bullet density scaling → `Balance.PATTERNS` table per cycle with bear overrides, GLOBAL_BULLET_CAP=150. ✅

### Test Points
1. Phase streaming fires within 0.5s of threshold crossing (3 enemies alive for a count-14 phase).
2. Count scaling: C1W1 phase count 12 → no multipliers → spawns 12. C3W5 phase count 22 → 22 × 1.45 × 1.15 ≈ 36.7 → clamped to 14.
3. Entry animation: all 4 paths render correctly within first 3 waves of cycle 1.
4. Post-C3 loop: cycle 4 behaves as cycle 1 with remix chance active and +20% difficulty.
5. Arcade overrides: enemy count ×1.15, HP ×0.85, intermission 2.0s vs 3.2s story.
