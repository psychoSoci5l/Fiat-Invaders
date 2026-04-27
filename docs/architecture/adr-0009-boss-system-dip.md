# ADR-0009: Boss System + Proximity Kill (DIP) Meter

## Status
Accepted

## Date
2026-04-25

## Engine Compatibility

| Field | Value |
|-------|-------|
| **Engine** | Vanilla JavaScript (Canvas 2D, no framework) |
| **Domain** | Core / Gameplay |
| **Knowledge Risk** | LOW — system is already shipped and active in v7.12.14 |
| **References Consulted** | `src/entities/Boss.js`, `src/config/BalanceConfig.js`, `src/core/GameplayCallbacks.js`, `src/main.js`, `src/utils/Constants.js`, `src/systems/HarmonicConductor.js` |
| **Post-Cutoff APIs Used** | None |
| **Verification Required** | None — pattern is already shipped and active |

## ADR Dependencies

| Field | Value |
|-------|-------|
| **Depends On** | ADR-0001 (GameStateMachine — boss fight gates on PLAY state), ADR-0003 (EventBus — `boss:defeated` event), ADR-0004 (Spatial Grid Collision — boss hit detection), ADR-0007 (V8 Scroller — boss trigger at 170s, per-level boss override) |
| **Enables** | Boss fight mechanics, DIP meter, HYPER activation, Evolution Core drops |
| **Blocks** | None |
| **Ordering Note** | Boss system depends on V8 Scroller for campaign boss timing; DIP meter feeds HYPER system (see Weapon Evolution ADR) |

## Context

### Problem Statement

The boss system must deliver three-boss fights (FED/BCE/BOJ) with phased escalation, distinct per-boss personalities, and a proximity-based reward meter (DIP) that incentivizes aggressive play. Specific requirements:

1. Three bosses in fixed rotation, overridable per-level in V8 campaign
2. 3-phase fight structure at 66% and 20% HP thresholds with distinct movement, fire rate, and attack patterns per phase
3. Phase transitions with 1.5s invulnerability, dialogue, meme popup, screen flash, hit-stop
4. 14 attack patterns across 3 bosses × 3 phases (FED laser curtain, BCE star patterns, BOJ intervention)
5. Minion spawning in Phase 3 at per-boss intervals
6. DIP proximity meter (0-100) filling from close-range kills, boss hits, and phase transitions
7. HYPER auto-activation when DIP meter reaches 100
8. Boss entrance sequence (80px/s descent, invulnerable during entry)
9. Per-boss movement personalities (Lissajous for FED, star-circling for BCE, oscillation for BOJ)

### Constraints

- Boss must coexist with both V8 campaign (fixed per-level boss) and Arcade (rotation by cycle)
- Phase transitions must feel impactful without disrupting gameplay flow
- DIP gain must be large enough to feel meaningful but small enough that HYPER doesn't trigger too early in boss fights
- No ES modules or bundler dependencies

## Decision

### Decision 1: Boss as Specialized Entity (extends Entity base)

`Boss` extends `Entity` with a larger hitbox (160×140 vs 58 for standard enemies). Key architectural choices:

- **State**: Boss tracks `phase` (1-3), `phaseTransitioning` flag, `isEntering` flag. No FSM—phase is an integer gating attack selection and movement speed.
- **HP formula**: `rawHp = BASE + level × PER_LEVEL + (marketCycle-1) × PER_CYCLE`, then multiplied by perk scaling (+10% per perk held) and NG+ multiplier. Damage divided by `DMG_DIVISOR: 2.5` to target 70-80s fight length.
- **Per-boss config**: Color, symbol, movement speeds, attack patterns all configured in `Balance.BOSS` and `Constants.BOSSES`. Boss type string selects the config block.

Rationale: Boss doesn't need a full FSM because phase progression is linear (1→2→3) and driven by HP thresholds. The `phaseTransitioning` timer provides a brief invulnerability window between phases without introducing a separate state machine.

### Decision 2: Phase Transitions as Cinematic Interrupts

Triggered inside `Boss.damage()` when HP crosses 66% or 20%. Sequence is atomic:

1. Set `phaseTransitioning = true`, `phaseTransitionTimer = 1.5s`
2. Update movement speed to new phase value from `PHASE_SPEEDS`
3. Audio: `bossPhaseChange` SFX + music layer update
4. Dialogue: random pick from `DIALOGUES.BOSS_PHASE[bossType][newPhase]` → MemeEngine
5. HarmonicConductor switches fire sequence
6. Screen shake (30 intensity), hit-stop slowmo, orange screen flash
7. DIP meter +15 (phase transition reward)

During transition, the boss is stationary and visually shaking. It takes reduced damage (invulnerable-ish). The `phaseTransitioning` flag gates most update logic.

Rationale: The 1.5s transition window serves triple duty—visual spectacle, gameplay pause (player repositions), and balance lever (prevents burning the boss through a phase boundary without the player seeing the new pattern).

### Decision 3: Attack Pattern Selection by Phase Index

Each boss defines three attack arrays in `Balance.BOSS.ATTACKS[bossType][P1|P2|P3]`. Pattern selection is rotation-based:

```
FED P1: RING (12 radial), SINE (10-wave), BURST (aimed) → rotation 0.15 rad/s
FED P2: adds HOMING (3 homing bullets, strength 2.0) → rotation 0.28 rad/s
FED P3: LASER curtain (25 bullets, width 450, gap 65) + CURTAIN (16 vertical)
BCE:  Star-pattern bullet hell, P3 adds SIN_AMP/COS_AMP oscillation
BOJ P1: Gentle oscillation (zen mode), slow fire
BOJ P2: Wave motion with legacy INTERVENTION_CHANCE (1%/frame)
BOJ P3: INTERVENTION burst (telegraphed 0.4s, 5 bullets, 0.4 rad spread, 240 speed, 2.5s cooldown)
```

14 total attack patterns. Each pattern fires through the existing bullet system (enemy bullet arrays), not a special boss bullet system.

Rationale: Rotating through a per-phase attack array provides variety without a complex behavior tree. Per-boss arrays allow each boss to feel distinct while sharing the same update loop.

### Decision 4: DIP Meter as Linear Interpolation with Hard Cap

DIP (Proximity Kill) meter is a 0-100 gauge stored on the player's `grazeMeter` property (naming drift from a legacy graze mechanic).

**Kill path** (on enemy kill):
```
dist = abs(enemy.y - player.y)
if dist >= MAX_DISTANCE (600) || player.isHyperActive → skip
t2 = 1 - max(0, dist - CLOSE_DISTANCE(150)) / (MAX_DISTANCE - CLOSE_DISTANCE)
gain = METER_GAIN_MIN(1) + t2 × (METER_GAIN_MAX(7) - METER_GAIN_MIN)
```

Gain ramps linearly from 1 (at max distance) to 7 (at ≤150px). Vertical distance only—horizontal position is ignored.

**Boss hit path**: Flat `BOSS_HIT_GAIN: 0.15` per player bullet hit on boss. No distance modifier. Suppressed during HYPER. Nerfed from 0.4→0.15 in v4.40 to prevent early HYPER activation.

**Phase transition path**: Lump sum `+15` per phase break.

**Auto-activation**: When meter reaches 100 and HYPER cooldown is clear, HYPER activates automatically (meter resets to 0, screen flash triggers).

Rationale: Linear interpolation is simple to tune (two knobs: min/max gain and two distance thresholds). Hard cap at 100 prevents meter hoarding. Boss hit gain is deliberately small—HYPER during a boss fight should be earned over the full fight duration, not in the first 10 seconds.

### Decision 5: Boss Rotation with V8 Override

In Arcade mode: `bossType = BOSS_ROTATION[(marketCycle - 1) % 3]` → FED, BCE, BOJ cycling.
In V8 campaign: `bossType = LevelScript.BOSS_TYPE` overrides the rotation so L1=FED, L2=BCE, L3=BOJ always.

The boss type string selects from `Constants.BOSSES[bossType]` for display properties (name, color, accent, symbol) and `Balance.BOSS.PHASE_SPEEDS[bossType]` + `Balance.BOSS.ATTACKS[bossType]` for combat properties.

Rationale: Single boss type string drives all per-boss configuration. V8 override ensures campaign consistency regardless of market cycle. No conditional branches on level number in combat logic.

### Decision 6: Minion Spawning in Phase 3

Each boss type has a per-boss spawn interval (`FED 2.5s / BCE 3.0s / BOJ 2.0s`). Minions are standard Enemy instances with HP scaled by `MINION.HP_MULT_BASE(5) + HP_MULT_PER_PHASE(2) × phase`.

Minions despawn immediately on boss death (cleared from enemies array), preventing orphan minions.

Rationale: Phase 3 is the desperation phase—minions add chaos without requiring new attack patterns. Per-boss intervals allow tuning (BOJ's faster interval matches its aggressive personality).

### Decision 7: Entrance Sequence

Boss spawns at y=-160, descends at 80px/s to targetY=100+safeAreaTop. During entrance, `isEntering=true` makes the boss invulnerable. The entrance sequence runs to completion before the boss begins its phase 1 attack cycle.

V8 campaign triggers boss via `LevelScript.tick() → {action: 'SPAWN_BOSS'}` → `startBossWarning()` (2.0s warning overlay) → `spawnBoss()`. ScrollEngine halts immediately on boss spawn.

Rationale: The entrance sequence gives the player visual warning and time to position before the fight starts. The invulnerability window prevents pre-firing bursts.

## GDD Requirements Addressed

| GDD System | Requirement | How This ADR Addresses It |
|------------|-------------|--------------------------|
| boss-proximity.md | 3-boss rotation (FED/BCE/BOJ) with V8 campaign level override (TR-BS-001) | BOSS_ROTATION array + LevelScript.BOSS_TYPE override |
| boss-proximity.md | Boss HP formula (base + level + cycle + perkScaling + ngPlus) (TR-BS-002) | HP formula with PER_LEVEL, PER_CYCLE, PERK_SCALE, DMG_DIVISOR |
| boss-proximity.md | 3-phase fight system at 66% and 20% HP thresholds (TR-BS-003) | PHASE_THRESHOLDS[0.66, 0.20] in Boss.damage() |
| boss-proximity.md | Phase transitions with 1.5s invuln, dialogue, meme, screen flash (TR-BS-004) | triggerPhaseTransition() with 1.5s timer, MemeEngine, screen shake |
| boss-proximity.md | 14 attack patterns across 3 bosses × 3 phases (TR-BS-005) | Balance.BOSS.ATTACKS arrays per phase per boss |
| boss-proximity.md | P3 minion spawning (FED 2.5s, BCE 3.0s, BOJ 2.0s) (TR-BS-006) | Per-boss minion spawn interval in Phase 3 |
| boss-proximity.md | DIP proximity kill meter (0-100 gauge, distance-based gain formula) (TR-BS-007) | Linear interpolation between CLOSE_DISTANCE and MAX_DISTANCE |
| boss-proximity.md | DIP gain from boss hits (0.15/hit) and phase transitions (+15) (TR-BS-008) | BOSS_HIT_GAIN in onBossHit, BOSS_PHASE_GAIN on phase change |
| boss-proximity.md | HYPER auto-activation when DIP meter reaches 100 (TR-BS-009) | auto-activation gate in addProximityMeter() |
| boss-proximity.md | Boss entrance sequence (80px/s, invulnerable, boundary margins) (TR-BS-010) | Entrance speed, isEntering flag, targetY positioning |
| boss-proximity.md | Per-boss movement personalities (Lissajous, patrol, oscillation) (TR-BS-011) | Balance.BOSS.MOVEMENT arrays per boss per phase |

## Performance Implications

- **CPU**: Boss update is O(1) per frame + O(minions) for P3 spawns. Attack pattern selection is a rotation index. Phase transition includes one MemeEngine queue call per transition.
- **Memory**: Boss entity ~2KB. Boss config data in BalanceConfig and Constants is static (< 5KB total).
- **Load Time**: Zero — Boss constructor reads from config, no precomputation.
- **Network**: None.

## Migration Plan

Already shipped. No migration needed.

## Known Issues Carried Forward

1. **`grazeMeter` naming drift** — code still uses "graze" terminology (variables, function names) for what is now a proximity-based system. Cosmetic, no functional impact.
2. **Dead fields in `Constants.BOSSES[]`** — `baseHp/hpPerLevel/hpPerCycle` declared but not read by the scaling path (reads from `Balance.BOSS.HP.*` instead).
3. **Two DIP entry points with divergent Arcade JACKPOT handling** — `onBossHit` path does not apply the JACKPOT modifier; `onEnemyKilled` and `addProximityMeter` do. May be intentional but undocumented.
4. **Phase 3 skip** — a bursty HYPER+GODCHAIN combo can delete the remaining 20% HP before the player sees P3 patterns. Not a bug per design intent, but worth monitoring.
5. **APC never calibrates C1** — boss HP on first cycle uses base values, which may create a perceived jump on C2.

## Validation Criteria

- Boss rotation: V8 campaign L1=FED, L2=BCE, L3=BOJ; Arcade follows `BOSS_ROTATION[(cycle-1) % 3]`
- Phase transitions fire at ≤66% and ≤20% HP with dialogue + meme + flash + slowmo
- Each phase has distinct movement speed and fire rate per Balance config
- DIP meter fills from enemy kills (distance-based 1-7), boss hits (0.15), and phase transitions (+15)
- HYPER triggers when DIP reaches 100; meter resets to 0 on activation
- Boss entrance: 80px/s descent, invulnerable, completes before phase 1 begins
- P3 minions spawn at per-boss intervals; despawn on boss death
- Evolution Core spawns on boss death with cinematic fly-in

## Related Decisions

- ADR-0007: V8 Scroller LevelScript — boss trigger at 170s, per-level boss type override, scroll halt
- ADR-0003: EventBus — `boss:defeated` event drives post-boss flow (celebration, intermission, campaign victory)
- ADR-0004: Spatial Grid Collision — player bullet → boss hit detection feeds DIP meter and score
- ADR-0002: Canvas 2D Rendering — boss glow pass, phase visual indicators, DIP meter HUD rendering
