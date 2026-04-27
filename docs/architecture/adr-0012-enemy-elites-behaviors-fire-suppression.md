# ADR-0012: Enemy Elites, Behaviors, and Fire Suppression

## Status
Accepted

## Date
2026-04-25

## Engine Compatibility

| Field | Value |
|-------|-------|
| **Engine** | Vanilla JavaScript (Canvas 2D, no framework) |
| **Domain** | Core / Combat |
| **Knowledge Risk** | LOW — system is already shipped and active in v7.12.14 |
| **References Consulted** | `src/managers/WaveManager.js`, `src/entities/Enemy.js`, `src/systems/HarmonicConductor.js`, `src/systems/CollisionSystem.js`, `src/config/BalanceConfig.js`, `src/v8/LevelScript.js` |
| **Post-Cutoff APIs Used** | None |
| **Verification Required** | None — pattern is already shipped and active |

## ADR Dependencies

| Field | Value |
|-------|-------|
| **Depends On** | ADR-0011 (Arcade Rogue Protocol — elite/behavior assignment in WaveManager spawn path), ADR-0002 (Canvas 2D Rendering — elite visual overlays, behavior VFX), ADR-0004 (Spatial Grid Collision — Reflector bullet reflection intercept) |
| **Enables** | Elite enemy variants, combat behavior variety, harmonic fire suppression |
| **Blocks** | None |

## Context

### Problem Statement

Three subsystems add depth to enemy combat beyond basic movement and firing:

1. **Elite Variants** — per-cycle special enemy types (ARMORED/EVADER/REFLECTOR) with modified stats, behaviors, and visual overlays. One variant type per cycle, assigned at spawn to MEDIUM/STRONG tier enemies only.

2. **Behavior State Machines** — four combat behaviors (FLANKER/BOMBER/HEALER/CHARGER) assigned probabilistically at spawn. Mutually exclusive per enemy, stack with elite variants. Each behavior has its own update logic, state machine, and visual indicators.

3. **Fire Suppression Flags** — two independent boolean flags (`_fireSuppressed`, `_fireSuppressedByEntry`) that prevent an enemy from firing through the HarmonicConductor row-fire loop. Used by Gravity Gate DWELL grace period and off-screen entry suppression.

### Constraints

- All three systems are Arcade-mode-native (WaveManager spawn path). V8 campaign enemies bypass WaveManager and never receive elites, behaviors, or fire suppression.
- Behaviors must stack with elite variants — an enemy can be both ARMORED and FLANKER.
- Both systems must have kill-switch flags in BalanceConfig.
- Fire suppression must support two independent sources to prevent interference.

## Decisions

### Decision 1: Per-Cycle Elite Variant Assignment at WaveManager Spawn

Elite variants are assigned during `WaveManager._spawnEnemyAt()`, which is the single spawn entry point for all Arcade enemies:

```javascript
// Per-cycle variant type
variantType = CYCLE_VARIANTS[cycle]  // {1: 'ARMORED', 2: 'EVADER', 3: 'REFLECTOR'}
chance = isArcade ? CHANCE.ARCADE[cycleIdx] : CHANCE.STORY[cycleIdx]
       = [0.15/0.10, 0.20/0.15, 0.25/0.20] + (bearMarket ? 0.05 : 0)
eligible = tier is 'MEDIUM' or 'STRONG'
roll < chance AND eligible → enemy.isElite = true, enemy.eliteType = variantType
```

**Per-variant application:**

| Variant | Stats | Visual | Trigger |
|---------|-------|--------|---------|
| ARMORED | `hp × 2.0`, `scoreVal × 2.0` | Metallic sheen sweep (`#c0c8d0`, alpha 0.25), shield icon | Applied at spawn — passive |
| EVADER | `_evaderCooldown = 1.0s` initial grace | 3 cyan speed-lines when dashing | Detects player bullets within 60px with vy < 0; dashes sideways at 600px/s for 40px |
| REFLECTOR | `reflectCharges = 1` | Prismatic shimmer ring (hue cycle), dashed grey ring when broken | First hit returns `'reflect'` string from `takeDamage()` — caller spawns reflected bullet |

**Cycle exclusivity**: Only one variant type is active per cycle. C1=ARMORED, C2=EVADER, C3=REFLECTOR. The variant type is determined by `CYCLE_VARIANTS[cycle]` — the same enemy cannot have multiple variant types.

**V8 exclusion**: LevelScript spawns enemies via `new Enemy()` directly, bypassing `WaveManager._spawnEnemyAt()`. All V8 enemies have `isElite = false`.

**Rationale**: Per-cycle variant rotation ensures the player sees each variant type gradually. The increasing chance array (10/15/20% Story, 15/20/25% Arcade) creates rising threat across cycles. Bear Market +5% is a minor punishment that doesn't break balance. Restricting to MEDIUM/STRONG prevents WEAK enemies (which appear in large numbers) from becoming too durable.

### Decision 2: Behavior Assignment as Independent Probabilistic Stack

Behavior assignment runs after elite assignment in the same `_spawnEnemyAt()` function, using a **roll-based system**:

```javascript
globalWave = ((cycle - 1) × 5) + waveInCycle
behRate = isArcade ? 0.22 : 0.18

if random() < (behRate + _behaviorEscalation):
    // Build available pool: behaviors where globalWave >= MIN_WAVE AND count < CAP
    // Pick one at random, increment _behaviorCounts[behavior]
```

**Available pool filtering**:

| Behavior | MIN_WAVE | Cap/wave | Trigger |
|----------|----------|----------|---------|
| FLANKER | C1W3 (global 3) | 4 | Spawns off-screen (`x = -40` or `x = gameWidth + 40`), runs at 250px/s for 3s firing every 0.8s, then curves into formation |
| BOMBER | C2W2 (global 7) | 2 | Drops bomb zones (40px radius, 2s duration) every 4s via `'bomber_drop'` event |
| HEALER | C2W3 (global 8) | 1 | Pulses every 1s, heals enemies within 60px by 5% maxHp |
| CHARGER | C2W2 (global 7) | 3 | State machine: IDLE → WINDUP(0.5s) → CHARGING(80px down at 500px/s) → RETREATING(200px/s up) → IDLE(5s cooldown) |

**Stacking rules**:
- Behaviors are mutually exclusive per enemy (one behavior per enemy max)
- Behaviors stack with elite variants (ARMORED + FLANKER is valid)
- The escalation bonus (`_behaviorEscalation`) increases with streaming phase index, making later phases more likely to produce behavior enemies
- Per-wave caps reset at wave start via `WaveManager._behaviorCounts`

**V8 exclusion**: Same as elites — LevelScript bypasses WaveManager. V8 enemies always have `behavior = null`.

**Rationale**: Probabilistic assignment (not deterministic) ensures variety while the per-wave caps prevent any single behavior from overwhelming a wave. The MIN_WAVE gate spaces introduction across cycles — FLANKER appears early (C1W3), the rest at C2W2+. The escalation bonus creates natural difficulty curves within a wave (later phases have more behavior enemies).

### Decision 3: Two Independent Fire-Suppression Flags

Two orthogonal boolean flags on the Enemy entity control whether HarmonicConductor can target the enemy for firing:

| Flag | Set by | Cleared by | Check location |
|------|--------|------------|----------------|
| `_fireSuppressed` | Gravity Gate DWELL entry (if grace > 0) | Grace timer expires or LEAVING start | `HarmonicConductor.js:859` (row-fire), `:945` (fireEnemy) |
| `_fireSuppressedByEntry` | While `(y + h/2) < 0` (above screen) | Once enemy y-center enters screen | `HarmonicConductor.js:861` (row-fire), `:947` (fireEnemy) |

**Design rationale for two flags**:
- An enemy can be in entry burst (above screen) AND IDLE for hover simultaneously — the two states are independent, so the flags must be independent
- If a single flag were used, an enemy that enters DWELL before its entry flag clears would lose fire-suppression protection when entry cleared, even though the DWELL grace period should still apply
- The flags are checked with OR logic: if either flag is true, the enemy cannot fire

**HarmonicConductor check pattern** (row-fire loop):
```javascript
if (!enemy._fireSuppressed && !enemy._fireSuppressedByEntry) {
    // enemy is eligible to fire this frame
}
```

**Grace period mechanics**:
- DWELL grace: `DWELL_FIRE_GRACE(1.5s)` starts on DWELL entry. Timer decrements each frame; at zero → `_fireSuppressed = false`
- Entry suppression: checked each frame as `(enemy.y + enemy.h/2) < 0`. Once true, flag remains true until the enemy's center crosses y=0

**Rationale**: Two independent flags prevent state interference between the Gravity Gate and entry systems. The OR-check in HarmonicConductor means either source can suppress fire without the other knowing about it. This keeps the fire-suppression contract simple: set the flag when you want suppression, clear it when you don't.

## GDD Requirements Addressed

| GDD System | Requirement | How This ADR Addresses It |
|------------|-------------|--------------------------|
| enemy-agents.md | Elite variant system (ARMORED/EVADER/REFLECTOR) per cycle (TR-EA-005) | Per-cycle CYCLE_VARIANTS; spawn-time assignment with chance roll; per-variant stat/visual/trigger |
| enemy-agents.md | Behavior system with state machines (FLANKER/BOMBER/HEALER/CHARGER) (TR-EA-006) | Probabilistic assignment with per-wave caps and MIN_WAVE gating; per-behavior FSM |
| enemy-agents.md | Two independent fire-suppression flags (TR-EA-007) | _fireSuppressed (DWELL grace) and _fireSuppressedByEntry (off-screen) as orthogonal booleans |

## Performance Implications

- **CPU**: Elite variant check is O(1) per spawn (one boolean + one roll). Behavior assignment is O(n) in behavior pool (4 items). Behavior update is O(1) per behavior-type per frame. Fire suppression is O(1) per enemy per frame (two boolean reads in HarmonicConductor).
- **Memory**: Two booleans + one string per Enemy instance (`isElite`, `_fireSuppressed`, `_fireSuppressedByEntry`, `eliteType`, `behavior`).
- **Load Time**: Zero — all config is static data.
- **Network**: None.

## Migration Plan

Already shipped. No migration needed.

## Known Issues Carried Forward

1. **ARMORED SPEED_MULT not applied** — `ARMORED.SPEED_MULT(0.8)` was declared in config but never consumed in the spawner or movement code. Removed in v7.12.7. "Armored = slower" is deferred — would require propagating speed mult into grid movement and V8 pattern vy.

2. **REFLECTOR bullet spawning contract** — `takeDamage()` returns `'reflect'` but does not spawn the reflected bullet. The caller (`CollisionSystem`) must check the return value and spawn the reflected projectile. This contract is not visible in `Enemy.js` alone.

3. **Behavior + elite stacking can produce dangerous combinations** — ARMORED + FLANKER creates a high-HP enemy that runs across the screen. REFLECTOR + FLANKER is the most dangerous: the Flanker enters from the side during its RUN phase while its first hit is absorbed. No special handling exists.

4. **V8 campaign never uses elites or behaviors** — LevelScript spawns enemies directly without WaveManager. This is by design but undocumented — V8 enemies always have `isElite = false` and `behavior = null`.

5. **HEALER with empty field** — If the Healer is the last enemy alive, its pulse timer fires every 1s but finds no valid targets. No crash — the Healer waits until killed.

## Validation Criteria

- Elite variant per cycle: C1=ARMORED, C2=EVADER, C3=REFLECTOR (Arcade only)
- ARMORED: 2× HP, 2× score, metallic sheen, shield icon; never assigned to WEAK tier
- EVADER: detects player bullets within 60px, dashes sideways at 600px/s, 2s cooldown, 1s initial grace
- REFLECTOR: absorbs first hit (returns 'reflect'), shimmer ring active, broken ring after
- Behaviors: FLANKER C1W3+, BOMBER C2W2+, HEALER C2W3+, CHARGER C2W2+
- Per-wave caps enforced: FLANKER 4, BOMBER 2, HEALER 1, CHARGER 3
- Behaviors stack with elite variants; behaviors are mutually exclusive per enemy
- Fire suppression: `_fireSuppressed` active for 1.5s after DWELL entry; `_fireSuppressedByEntry` active while enemy center is above screen
- V8 campaign enemies have no elites, no behaviors, no fire suppression (bypasses WaveManager)
- Kill-switch `ELITE_VARIANTS.ENABLED` and `ENEMY_BEHAVIORS.ENABLED` suppress assignment

## Related Decisions

- ADR-0011: Arcade Rogue Protocol — WaveManager spawn path is the exclusive entry point for elite/behavior assignment
- ADR-0007: V8 Scroller LevelScript — V8 spawn path bypasses WaveManager, creating the elite/behavior exclusion
- ADR-0004: Spatial Grid Collision — Reflector bullet reflection handling (takeDamage return value)
- ADR-0002: Canvas 2D Rendering — elite visual overlays, behavior VFX (speed-lines, aura, trails)
