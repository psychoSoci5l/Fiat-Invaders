# ADR-0011: Arcade Rogue Protocol

## Status
Accepted

## Date
2026-04-25

## Engine Compatibility

| Field | Value |
|-------|-------|
| **Engine** | Vanilla JavaScript (Canvas 2D, no framework) |
| **Domain** | Core / Game Mode |
| **Knowledge Risk** | LOW — system is already shipped and active in v7.12.14 |
| **References Consulted** | `src/systems/ArcadeModifiers.js`, `src/ui/ModifierChoiceScreen.js`, `src/managers/WaveManager.js`, `src/managers/MiniBossManager.js`, `src/core/GameplayCallbacks.js`, `src/ui/GameCompletion.js`, `src/config/BalanceConfig.js`, `src/main.js`, `src/utils/RunState.js` |
| **Post-Cutoff APIs Used** | None |
| **Verification Required** | None — pattern is already shipped and active |

## ADR Dependencies

| Field | Value |
|-------|-------|
| **Depends On** | ADR-0001 (GameStateMachine — PLAY state gates WaveManager updates), ADR-0003 (EventBus — `entity:died`, `boss:defeated` events), ADR-0008 (Drop System — drop rate mult, pity mult), ADR-0010 (Weapon Evolution — crit chance, fire rate, damage bonuses) |
| **Enables** | Arcade mode as roguelike alternative to V8 campaign, modifier stacking, infinite scaling |
| **Blocks** | Wave System ADR (defines formation generators shared by Arcade) |

## Context

### Problem Statement

Arcade Rogue Protocol is the roguelike alternative to the V8 campaign. It activates when `CampaignState.isEnabled()` returns false, replacing the V8 LevelScript-driven scroller with WaveManager-driven procedural waves. Three interlocking systems define the mode:

1. **Combo multiplier** — kills in rapid succession compound a score bonus (1.0-5.0, 80 kills to cap), reset on timeout (3.0s) or death. Graze extends the timer by 0.5s per event.

2. **Enhanced mini-bosses** — lower spawn thresholds (0.65×), shorter cooldown (10s vs 15s), more per wave (3 vs 2), lower HP (50% vs 60%).

3. **Modifier cards** — chosen from a DOM modal after every boss/mini-boss defeat (2-3 picks), 15 modifiers across 3 categories (OFFENSE/DEFENSE/WILD), stacking indefinitely up to pool exhaustion.

4. **Post-C3 infinite scaling** — wave definitions cycle (C4→C1, C5→C2, C6→C3, repeat), formations remix at 40% per phase, difficulty ramps +0.20 per cycle until capped at 1.0.

5. **Persistent records** — localStorage stores best cycle/level/kills per run, NEW BEST badge shown on improvement.

6. **8-factor score multiplier** — bearMarket × perkMult × killStreak × grazeBonus × hyperMult × lastEnemy × comboMult × arcadeScoreMult.

### Constraints

- V8 campaign must be fully dormant in Arcade mode — no LevelScript ticks, no V8 fire ramp
- WaveManager must handle both Arcade (primary driver) and Story (dormant) without branching on mode flags
- Modifier selection must be fast (2-3 seconds) — no analysis paralysis
- DOM modal must work with keyboard-only navigation for accessibility

## Decisions

### Decision 1: CampaignState-Driven Gating with isArcadeMode()

Arcade mode is gated by a single predicate: `G.ArcadeModifiers.isArcadeMode()` returns `!(G.CampaignState && G.CampaignState.isEnabled())`. This propagates through the system as follows:

- **WaveManager** (`WaveManager.update()`, line 49-51): the V8 dormant check is `V8_MODE.ENABLED && !isArcadeMode()` — if Arcade is active, V8 dormancy is overridden and WaveManager runs normally
- **HarmonicConductor**: V8 fire ramp (`V8_RAMP`) is skipped when `isArcadeMode()` returns true — the base fire budget (`BULLETS_PER_SECOND`) applies without level-based scaling
- **HUD rendering**: Arcade-specific HUD elements (combo counter, modifier count) render only when `isArcadeMode()` is false (i.e., NOT in Story mode)
- **LevelScript**: `LevelScript.tick()` is never called — the V8 scroller is fully dormant

**Key implication**: V8_MODE.ENABLED can be true while Arcade is running. The system does NOT use a mode enum — it uses the negative of CampaignState which means any non-campaign mode (Arcade, Daily, etc.) automatically gets Arcade behavior. This is a leaky abstraction: Daily mode inherits Arcade modifiers, combo system, etc.

**Rationale**: A single boolean predicate avoids branching on mode constants throughout the codebase. The trade-off is that non-campaign modes cannot opt out of Arcade behaviors without additional checks.

### Decision 2: WaveManager Phase-Based Streaming with Timed Thresholds

WaveManager drives all Arcade spawning using a **phase-based streaming** model. Each wave has 2-3 phases; phase 0 spawns immediately, subsequent phases trigger when conditions are met:

```
Trigger condition (all three must hold):
  1. _phaseTimer >= MIN_PHASE_DURATION (3.0s)
  2. currentPhaseAlive <= threshold
     threshold = max(MIN(3), min(MAX(6), round(phaseCount × 0.35)))
  3. totalAlive + nextPhaseCount <= MAX_CONCURRENT_ENEMIES (22)
```

**Wave completion**: all phases spawned AND zero enemies remaining → `wave++`, intermission starts.

**Arcade count/HP overrides** (applied after bear market and cycle scaling):
- `targetCount × ARCADE.ENEMY_COUNT_MULT (1.15)` — +15% enemies per wave
- `hp × ARCADE.ENEMY_HP_MULT (0.85)` — -15% HP per enemy
- Active modifier `enemyHpMult` multiplied on top

**Intermission durations**:
- Between waves: `ARCADE.INTERMISSION_DURATION (2.0s)`
- After boss: `ARCADE.INTERMISSION_BOSS_DURATION (4.0s)`

**Rationale**: Phase-based streaming prevents the "all enemies arrive at once" pattern of traditional wave systems. The 25% threshold (35% of phase count) ensures the next phase arrives before the current is fully cleared, maintaining pressure. The 3.0s floor prevents phase stacking. MAX_CONCURRENT bounds entity count for performance.

### Decision 3: Combo System as Score Multiplier with Timer Decay

The combo system is a **linear multiplier with a fixed-decay timer**, applied exclusively in Arcade mode:

```javascript
on kill:
  comboCount++
  comboTimer = COMBO.TIMEOUT(3.0s)
  comboMult = min(COMBO.MULT_CAP(5.0), 1.0 + comboCount × 0.05)

on each frame (comboTimer > 0):
  comboTimer -= dt
  if comboTimer <= 0: comboCount = 0, comboMult = 1.0
```

**Graze extension**: each graze event during active combo adds `COMBO.GRAZE_EXTEND(0.5s)` to `comboTimer`. Does NOT reset to full TIMEOUT — partial extension only.

**Reset conditions**: death, Last Stand trigger, timer expiry.

**Score integration**: `comboMult` is one of 8 factors in the total multiplier chain:
```
totalMult = bearMult × perkMult × killStreakMult × grazeKillBonus
          × hyperMult × lastEnemyMult × comboMult × arcadeScoreMult
```
Capped by `HYPERGOD.TOTAL_MULT_CAP(12.0)` if HYPERGOD is active.

**Rationale**: Linear per-kill scaling (0.05 per kill) rewards sustained play without exponential score inflation. The 5.0 cap at 80 kills sets a clear "maximum efficiency" target. Graze extension (0.5s partial, not full reset) rewards active play without making combos indefinite from bullet-grazing alone.

### Decision 4: Mini-Boss Arcade Overrides — Lower Thresholds, Higher Frequency

Arcade mode overrides four mini-boss parameters:

| Parameter | Story | Arcade | Effect |
|-----------|-------|--------|--------|
| Cooldown | 15.0s | 10.0s | Mini-bosses spawn more frequently |
| Max per wave | 2 | 3 | More mini-bosses per wave |
| Threshold mult | 1.0 | 0.65 | Kill-count threshold reduced 35% |
| HP mult | 0.60 | 0.50 | Mini-boss HP reduced 17% |

**Trigger conditions** (checked on each enemy kill):
1. No active boss or mini-boss (`!boss`, `!miniBossActive`)
2. Enemy symbol in `CURRENCY_BOSS_MAP`
3. Not a minion
4. Boss warning timer <= 0
5. `totalTime - lastMiniBossSpawnTime >= COOLDOWN`
6. `miniBossThisWave < MAX_PER_WAVE`
7. Kill count for this symbol >= `floor(mapping.threshold × 0.65)`

**Post-mini-boss modifier pick**: `setTimeout(800ms)` → `ModifierChoiceScreen.show(2, callback)` — 2 cards.

**Rationale**: The combination of lower threshold (fewer kills to trigger), shorter cooldown (spawn more often), and lower HP (easier to kill) creates the "enhanced but not punishing" pacing Arcade needs. The 3-per-wave cap prevents mini-boss stacking while the 10s cooldown prevents back-to-back spawns.

### Decision 5: Modifier Card DOM Modal with Recalculate-from-Scratch Stacking

Modifier selection uses a **DOM overlay modal** (`#modifier-overlay`) with the following architecture:

**Selection flow** (`ModifierChoiceScreen.show(count, onComplete)`):
1. `ArcadeModifiers.getRandomModifiers(count, currentModifiers)` selects from the eligible pool (excludes non-stackable already-picked modifiers and stackable modifiers at max stacks)
2. For `count >= 3`: guarantee 1 OFFENSE + 1 DEFENSE from available pools, fill remaining from all eligible, shuffle final order
3. DOM overlay shown with cards, each with CSS `--cat-color` and `--cat-color-rgb` vars
4. Keyboard: digits 1-9 select by index, Enter/Space on focused card, ArrowLeft/Right navigate
5. On selection: card gets `modifier-card-selected` class, SFX fires, `applyModifier(modId)` called
6. After 600ms animation: `hide()`, `onComplete()` fires

**Apply flow** (`applyModifier(modId)`):
1. Append modifier ID to `RunState.arcadeModifiers[]`
2. Call `recalculateBonuses()` which resets ALL bonuses to default then replays every modifier in order
3. This means modifier order is irrelevant — stacking is purely additive

**15 modifiers** across 3 categories:

| Category | Modifiers | Stackable | Count |
|----------|-----------|-----------|-------|
| OFFENSE | OVERCLOCK, ARMOR_PIERCING, VOLATILE_ROUNDS, CRITICAL_HIT, CHAIN_LIGHTNING | 2 stackable | 5 |
| DEFENSE | NANO_SHIELD, EXTRA_LIFE, BULLET_TIME, WIDER_GRAZE, EMERGENCY_HEAL | 2 stackable | 5 |
| WILD | DOUBLE_SCORE, BULLET_HELL, SPEED_DEMON, JACKPOT, BERSERKER | 0 stackable | 5 |

**Capacity**: unlimited in practice — pool exhaustion (no eligible modifiers remaining) causes `onComplete()` to fire immediately without showing the overlay.

**Rationale**: DOM overlay (not canvas) allows CSS animations, keyboard accessibility via native DOM events, and screen reader support via ARIA attributes. The recalculate-from-scratch pattern prevents modifier-order bugs and makes stacking deterministic. Category-balanced selection for 3+ cards ensures each pick offers meaningful choice rather than three OFFENSE cards.

### Decision 6: Post-C3 Infinite Scaling with Wave Cycling

After cycle 3, Arcade mode enters **infinite scaling**:

**Wave cycling**: `effectiveCycle = ((cycle - 1) % 3) + 1` — C4=C1 waves, C5=C2, C6=C3, repeat.

**Formation remix**: 40% chance per phase (`POST_C3_FORMATION_REMIX`) to randomize the formation from the full 20-formation list. In Story mode (if it hypothetically reached C4), the remix chance is 30%.

**Difficulty ramp**: `baseDiff += (cycle - 3) × POST_C3_DIFF_PER_CYCLE (0.20)`

```javascript
calculateDifficulty:
  baseDiff = CYCLE_BASE[min(cycle-1, 2)]  // [0.0, 0.40, 0.60]
           + max(0, cycle - 3) × 0.20
           + waveInCycle × WAVE_SCALE (0.04)
  = min(DIFFICULTY.MAX(1.0), baseDiff + waveBonus)
```

| Cycle | baseDiff | +wave bonus | effective | Notes |
|-------|----------|-------------|-----------|-------|
| C1 | 0.00 | +0.16 | 0.16 | Baseline |
| C3 | 0.60 | +0.16 | 0.76 | Pre-cap |
| C4 | 0.80 | +0.16 | 0.96 | +0.20 from post-C3 |
| C5 | 1.00 | +0.16 | 1.00 | Capped |
| C6+ | 1.00 | +0.16 | 1.00 | Frozen |

After C5, difficulty is frozen at 1.0. Enemy count continues scaling via `CYCLE_COUNT_MULT` cycling through `[1.0, 1.2, 1.5]`. Enemy HP scales via `ENEMY_HP.CYCLE_MULT` clamped to index 2 (`2.8×`). The only unbounded growth is enemy count, which is bounded in practice by `MAX_CONCURRENT_ENEMIES(22)`.

**Rationale**: Wave cycling reuses existing content without requiring unique definitions for each cycle. Formation remix ensures variety despite recycled bases. The difficulty cap at 1.0 prevents mathematically unwinnable states — the run ends when the player's modifier stack can no longer compensate for the enemy count/density, not from impossible HP values.

### Decision 7: 8-Factor Score Multiplier Chain with HYPERGOD Cap

Arcade mode computes kill score through an 8-factor multiplier chain:

```
killScore = floor(e.scoreVal × totalMult)

totalMult = bearMult × perkMult × killStreakMult × grazeKillBonus
          × hyperMult × lastEnemyMult × comboMult × arcadeScoreMult
```

| Factor | Source | Range | Notes |
|--------|--------|-------|-------|
| bearMult | Bear market flag | 1.0-2.0 | ×2.0 during bear event |
| perkMult | Elemental perks | 1.0+ | Per-element bonus |
| killStreakMult | Streak counter | 1.0+ | Kill streak bonus |
| grazeKillBonus | Graze on kill | 1.0+ | Per-graze bonus |
| hyperMult | HYPER active | 3.0 (HYPER) / 5.0 (HYPERGOD) | Replaced by HYPERGOD if both active |
| lastEnemyMult | Last enemy in wave | 1.0-2.0 | Bonus for wave-clear |
| comboMult | Combo counter | 1.0-5.0 | 0.05 per kill, cap 80 |
| arcadeScoreMult | DOUBLE_SCORE modifier | 1.0-2.0 | ×2.0 if DOUBLE_SCORE active |

**Total cap**: `HYPERGOD.TOTAL_MULT_CAP(12.0)` — applied last. Without the cap, HYPERGOD(5.0) × combo(5.0) × bear(2.0) × DOUBLE_SCORE(2.0) = 100×.

**Rationale**: The multiplicative chain rewards stacking complementary bonuses (combo + HYPERGOD + DOUBLE_SCORE) while the 12× cap prevents degenerate scores. In practice, reaching 12× requires multiple high-value sources simultaneously — a transient peak rather than a sustained multiplier.

### Decision 8: localStorage Records with NEW BEST Detection

Arcade records are stored in localStorage under `fiat_arcade_records` as `{ bestCycle, bestLevel, bestKills }`.

**Check logic** (on game over):
1. Read existing records from localStorage
2. Compare current run values against stored values
3. If any field improved: update all three fields (not just the improved one — records are atomic), show `NEW BEST` badge
4. If no field improved: no update, no badge
5. Records are NEVER downgraded — only improved values overwrite

**Display**: On game over screen, Arcade stats row shows cycle, level, wave, best combo, and modifier count. The NEW BEST badge (`<span id="new-best-badge">`) is inline-block when active, none otherwise.

**Leaderboard submission**: Both Story and Arcade modes submit scores. In Arcade, `submitWave = G.WaveManager.wave` (real wave) and `submitCycle = window.marketCycle` (real cycle). The leaderboard worker uses these values for its score-ceiling check (`12000 × wave × cycle × 1.5`).

**Rationale**: Three-field atomic records are simple, auditable, and avoid partial-update bugs. The "highest only" rule ensures records accurately represent the player's best performance. Real wave/cycle values ensure the leaderboard ceiling correctly tracks Arcade progression.

### Decision 9: Modifier Bonuses as Recalculate-from-Scratch Reset

All modifier bonuses in `RunState.arcadeBonuses` follow a **recalculate-from-scratch** pattern:

```javascript
function recalculateBonuses() {
    // Reset ALL bonuses to defaults
    b.fireRateMult = 1.0;
    b.damageMult = 1.0;
    b.piercePlus = 0;
    b.speedMult = 1.0;
    b.enemyHpMult = 1.0;
    b.enemyBulletSpeedMult = 1.0;
    b.dropRateMult = 1.0;
    b.scoreMult = 1.0;
    b.grazeRadiusMult = 1.0;
    b.pityMult = 1.0;
    b.extraLives = 0;
    b.nanoShieldTimer = 0;
    b.nanoShieldCooldown = 0;
    b.lastStandAvailable = false;
    b.noShieldDrops = false;
    b.volatileRounds = false;
    b.chainLightning = false;
    b.critChance = 0;
    b.critMult = 3.0;

    // Replay all modifiers in order
    rs.arcadeModifiers.forEach(id => {
        const mod = MODIFIER_POOL.find(m => m.id === id);
        if (mod) mod.apply(b);
    });
}
```

This is called:
1. On every `applyModifier(modId)` — after pushing the new modifier to the list
2. On game start — empty list produces default values

**Key properties**:
- Order-independent: the same set of modifiers always produces the same bonuses regardless of acquisition order
- Self-healing: if a modifier definition changes, all runs pick up the change on the next `recalculateBonuses()` call — no migration needed
- No stale state: the full reset ensures no modifier can leave a bonus permanently modified (e.g., if a modifier were removed mid-run via data corruption)

**Rationale**: Recalculate-from-scratch is more expensive per operation (O(n) vs O(1) incremental update) but n is bounded by pool exhaustion (~20 modifiers maximum in practice). The correctness guarantee (no order-dependent bugs, no stale state) is worth the trivial CPU cost.

## GDD Requirements Addressed

| GDD System | Requirement | How This ADR Addresses It |
|------------|-------------|--------------------------|
| arcade-rogue-protocol.md | Arcade gating via isArcadeMode() — WaveManager active, V8 dormant (TR-ARC-001) | CampaignState-driven predicate; WaveManager V8 check bypassed when isArcadeMode |
| arcade-rogue-protocol.md | 15 waves (5×3 cycles) with 2-3 streaming phases (TR-ARC-002) | WaveManager phase-based streaming; 5 waves × 3 cycles; WAVE_DEFINITIONS in BalanceConfig |
| arcade-rogue-protocol.md | Phase streaming triggers at ~25% alive with 3.0s min (TR-ARC-003) | THRESHOLD_RATIO 0.35, MIN_PHASE_DURATION 3.0, MAX_CONCURRENT 22 |
| arcade-rogue-protocol.md | Combo system — kill chain with 3.0s timeout, graze extension (TR-ARC-004) | COMBO.TIMEOUT 3.0s, MULT_PER_COMBO 0.05, MULT_CAP 5.0, GRAZE_EXTEND 0.5s |
| arcade-rogue-protocol.md | Mini-boss triggers with 10s cooldown, 3 per wave max (TR-ARC-005) | COOLDOWN 10s, MAX_PER_WAVE 3, THRESHOLD_MULT 0.65, HP_MULT 0.50 |
| arcade-rogue-protocol.md | Modifier card DOM modal with keyboard accessibility and stacking (TR-ARC-006) | ModifierChoiceScreen DOM overlay; digits/arrows/enter keys; recalculate-from-scratch stacking |
| arcade-rogue-protocol.md | Post-C3 infinite scaling — wave cycling, formation remix, difficulty ramp (TR-ARC-007) | effectiveCycle cycling; POST_C3_FORMATION_REMIX 0.40; POST_C3_DIFF_PER_CYCLE 0.20 |
| arcade-rogue-protocol.md | 8-factor score multiplier chain (TR-ARC-008) | totalMult = 8-factor chain with HYPERGOD cap at 12.0 |
| arcade-rogue-protocol.md | Persistent localStorage records with NEW BEST badge (TR-ARC-009) | fiat_arcade_records atomic check; NEW BEST badge on game-over screen |
| arcade-rogue-protocol.md | Leaderboard submission with real wave/cycle (TR-ARC-010) | Arcade: submitWave = WaveManager.wave, submitCycle = marketCycle |

## Performance Implications

- **CPU**: Modifier selection is O(n) in modifier pool (15 items). Recalculate-from-scratch is O(m) in active modifiers (max ~20). Combo timer is O(1) per frame. Phase streaming checks are O(e) in enemy count (filtered by `_phaseIndex`).
- **Memory**: 15 modifier definitions in ArcadeModifiers.js (~2KB total). DOM modal created on demand, destroyed on hide. Record storage is 3 integers in localStorage.
- **Load Time**: Zero — all config is static data.
- **Network**: Leaderboard submission — same as ADR-0006.

## Migration Plan

Already shipped. No migration needed.

## Known Issues Carried Forward

1. **`isArcadeMode()` leaks to non-Arcade modes** — The predicate `!(CampaignState && CampaignState.isEnabled())` means Daily mode, or any future non-campaign mode, automatically inherits Arcade behaviors (combo system, modifiers, etc.). If a future mode needs different behaviors, this predicate must be replaced with an explicit mode enum.

2. **COMBO.COLORS label inversion** — Balance config names (`WHITE=10, YELLOW=30, ORANGE=50, RED=999`) are thresholds, but the HUD code checks `>= ORANGE` for red, `>= YELLOW` for orange, `>= WHITE` for yellow. The labels describe the *next* tier's color.

3. **Modifier pick while paused** — `setTimeout` fires regardless of game state. If the player pauses during the 800ms/1500ms window before a modifier pick, the overlay renders over the pause screen. Digit keys still select modifiers.

4. **Death mid-modifier-pick** — No guard for death during the modifier selection window. The `onComplete` callback still fires, potentially applying `extraLives` after the player has already died.

5. **Post-C3 formation remix applies to Story (dead code)** — The `getWaveDefinition` remix path applies regardless of mode (40% Arcade, 30% otherwise). In practice Story never reaches C4, so this is dead code — but would cause unexpected behavior if Story progression were extended.

6. **Pool exhaustion vs MAX_MODIFIERS** — The `MAX_MODIFIERS(20)` config key was removed in v7.12.6. Pool exhaustion (no eligible modifiers remaining) is the only cap. In practice the 15-modifier pool with mixed stackability limits total picks to ~20-25 before exhaustion.

## Validation Criteria

- Arcade mode: `isArcadeMode()` returns true when CampaignState is disabled; WaveManager drives spawning; LevelScript.tick() is never called
- 15 waves across 3 cycles; each wave has 2-3 streaming phases
- Phase streaming triggers at ≤35% of phase count alive after ≥3.0s, respecting MAX_CONCURRENT 22
- Combo counter increments on kill, resets after 3.0s timeout, capped at 5.0× at 80 kills
- Graze extends combo timer by 0.5s per event (only when combo is active)
- Mini-boss spawns at 0.65× threshold, 10s cooldown, max 3 per wave, 50% HP
- Modifier pick shows 3 cards after boss (with category guarantee), 2 after mini-boss
- Keyboard selection works: digits 1-3 pick, arrows navigate, Enter/Space selects
- Non-stackable modifiers excluded from subsequent pools; stackable modifiers accumulate
- Post-C3 wave cycling: C4=C1, C5=C2, C6=C3; 40% formation remix; +0.20 diff/cycle; capped at 1.0
- 8-factor score multiplier chain computed per kill; HYPERGOD cap at 12.0
- localStorage records updated on game over; NEW BEST badge shown on improvement
- Leaderboard submits real wave/cycle values for Arcade mode

## Related Decisions

- ADR-0010: Weapon Evolution + Elementals + GODCHAIN — crit chance, fire rate, damage bonuses consumed by Player
- ADR-0008: Drop System + APC — drop rate mult, pity mult from JACKPOT modifier
- ADR-0004: Spatial Grid Collision — kill events trigger combo increment and mini-boss threshold checks
- ADR-0001: GameStateMachine — PLAY state gates WaveManager update path
