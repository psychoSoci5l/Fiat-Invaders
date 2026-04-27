# ADR-0008: Drop System + Adaptive Power Calibration

## Status
Accepted

## Date
2026-04-25

## Engine Compatibility

| Field | Value |
|-------|-------|
| **Engine** | Vanilla JavaScript (Canvas 2D, no framework) |
| **Domain** | Core / Balance |
| **Knowledge Risk** | LOW — system is already shipped and active in v7.12.14 |
| **References Consulted** | `src/systems/DropSystem.js`, `src/config/BalanceConfig.js`, `src/managers/WaveManager.js`, `src/core/GameplayCallbacks.js`, `src/utils/RunState.js` |
| **Post-Cutoff APIs Used** | None |
| **Verification Required** | None — pattern is already shipped and active |

## ADR Dependencies

| Field | Value |
|-------|-------|
| **Depends On** | ADR-0003 (EventBus — consumes `entity:died`, `boss:defeated`, `player:died`), ADR-0004 (Spatial Grid Collision — kill events feed pity counter) |
| **Enables** | All drop-related game feel: adaptive balancing, APC, struggle/domination detection |
| **Blocks** | None |
| **Ordering Note** | DropSystem is a consumer of kill events from CollisionSystem; APC triggers on cycle transitions from GameplayCallbacks |

## Context

### Problem Statement

The drop system governs when enemies drop pickups (SPECIAL, UTILITY, PERK). A naive fixed-percentage system creates two problems:
1. Players who are struggling (dying, weak loadout) get even weaker from lack of drops
2. Players who are dominant (strong loadout, high kill rate) snowball further

The system must provide three layers of adjustment:

1. **Pity timer**: Guarantee a drop after N kills without one, with cycle-scaling thresholds
2. **Adaptive Drop Balancer**: Detect struggle (no drops for 40s+ while weak, 3× chance boost) and domination (>1.5 kills/s while strong, 0.25× chance)
3. **Adaptive Power Calibration (APC)**: At cycle transitions, compute a power score from the player's loadout and adjust enemy HP (0.85–1.35×) and pity threshold (±10 kills) for the next cycle

Three coexisting power score formulas serve different purposes—APC, ADAPTIVE_DROPS (category suppression), and Balancer (struggle/domination gating).

### Constraints

- Must coexist with both V8 Campaign and Arcade modes (ARCADE_MULT: 0.85 applies in Arcade)
- Must suppress drops entirely during HYPER/GODCHAIN windows
- Must guarantee a SPECIAL drop pre-boss (wave 4+)
- Must enforce anti-cluster guard (minimum 6s between drops)
- Must provide post-death grace window (60s with lowered thresholds)
- Must not use ES modules or bundler dependencies

## Decision

### Decision 1: Three-Layer Drop Flow

The drop check in `DropSystem.tryEnemyDrop()` executes in strict sequence:

```
1. Read tier chance (STRONG 3%, MEDIUM 2.5%, WEAK 1.0%)
2. Compute pity threshold = max(10, max(15, PITY_BASE - (cycle-1) × PITY_REDUCTION) + apcAdj)
3. Check pity: killsSinceLastDrop >= pityThreshold → forced drop
4. Check struggle force: Adaptive Balancer may force a drop
5. Gate: struggleForce || pityDrop || Math.random() < dropChance
6. Anti-cluster guard: skip if timeSinceLastDrop < 6.0s (non-pity, non-force path)
7. Category selection with adaptive weighting
8. Suppression check (domination, HYPER, GODCHAIN)
```

**Pity overrides anti-cluster**: A pity-forced drop ignores the 6s anti-cluster guard. Suppression (domination, HYPER, GODCHAIN) never applies to struggle-forced drops, PERK drops, or UPGRADE drops.

**Death grace**: After player death, a 60s grace window reduces struggle thresholds from 40s to 25s, with only 3 min-kills required.

Rationale: Layer 1 (pity) ensures a baseline generosity floor. Layer 2 (struggle/domination) adapts to short-term kill rate trends. Layer 3 (APC) adjusts at cycle boundaries for longer-term loadout-based tuning. Each layer operates independently and can be kill-switched.

### Decision 2: Three Coexisting Power Score Formulas

Each layer computes player power differently, tuned to its specific purpose:

| Formula | Weights | Purpose | Location |
|---------|---------|---------|----------|
| **APC** | weapon=0.50, perks=0.30, special=0.20 | Enemy HP + pity adjustment at cycle boundaries | `GameplayCallbacks.js:424` |
| **ADAPTIVE_DROPS** | weapon=0.65, special=0.35 | Category suppression probability | `DropSystem.js:313` |
| **Balancer** | weapon=0.50, special=0.25, perk=0.25 | Struggle/domination gating thresholds | `DropSystem.js:327` |

APC scoring function:
```
weaponScore = (weaponLevel - 1) / 2  // 0 at LV1, 0.5 at LV2, 1.0 at LV3
perkScore  = min(totalPerkStacks / 8, 1)
specialScore = hasActiveSpecial ? 1 : 0
powerScore = 0.50×weaponScore + 0.30×perkScore + 0.20×specialScore
```

Rationale: Each formula was independently tuned to its own suppression/adjustment logic. Consolidating into a single formula would require re-tuning all three systems simultaneously. The formulas are documented in code with their specific contexts and are not interchangeable.

### Decision 3: APC Triggered at Cycle Boundaries Only

APC recalibrates only at cycle transitions (boss defeated), and only from C2 onward:
- C1: no calibration (no baseline, `cyclePower.score` stays 0)
- C2+: compute power score from current loadout, store on `RunState.cyclePower`

HP adjustment: `hpMult = 0.85 + powerScore × 0.50` (range 0.85–1.35×), applied as final multiplier in `WaveManager.calculateEnemyHP()`.

Pity adjustment: `pityAdj = -10` if powerScore < 0.30 (weak), `+5` if > 0.60 (strong), else 0.

Rationale: Per-frame APC would be noisy and expensive. Cycle boundaries provide a natural recalibration point. C1 exclusion is intentional—there is no loadout baseline to compare against before the first boss.

### Decision 4: Category Selection with Adaptive Weighting

Three categories: SPECIAL, UTILITY, PERK. UPGRADE is not droppable from enemies since v5.11 (Evolution Core drops only from boss kills).

Adaptive weighting (`ADAPTIVE_DROPS`):
- Base weights: SPECIAL=1.0, UTILITY=0.8, PERK=1.2
- Power score modulates weights: higher power suppresses SPECIAL and PERK (down to `MIN_CATEGORY_WEIGHT: 0.05`)
- Suppression floor: no suppression applied if power score < 0.50
- Fallback (when `ADAPTIVE_DROPS.ENABLED = false`): fixed 60% SPECIAL / 20% UTILITY / 20% PERK

During struggle, category bias shifts to `SPECIAL=0.55, PERK=0.35, UTILITY=0.10` to prefer combat-relevant drops.

Guaranteed SPECIAL pre-boss: when `currentWave >= 4 && !specialDroppedThisCycle`, the next drop is forced to SPECIAL. Flag resets per cycle.

Rationale: Adaptive weighting prevents dominant players from stockpiling high-value drops while ensuring struggling players get the drops they need.

### Decision 5: Struggle/Domination Detection via Rolling Kill Window

Struggle and domination use a rolling window of kill times (`_recentKillTimes`). Each kill pushes a timestamp; old entries outside the window are pruned.

**Struggle** triggers when:
- Time since last drop ≥ TIME_THRESHOLD (40s, reduced by CYCLE_REDUCTION per cycle)
- Power score ≤ POWER_CEILING (0.40)
- Kills since last drop ≥ 5
- Recent kill activity within ACTIVITY_WINDOW (8s)
- Effect: ×3 drop chance, forced drop at FORCE_THRESHOLD (55s)

**Domination** triggers when:
- Kill rate (rolling) > 1.5 kills/s
- Power score ≥ POWER_FLOOR (0.60)
- Effect: drop chance ×0.25, pity threshold ×2

**Priority on conflict**: Struggle wins. The system favours generosity over suppression.

Rationale: Rolling window is more responsive than frame-based timers alone—a burst of kills triggers domination immediately without waiting for a timer-based check.

### Decision 6: HYPER/GODCHAIN Drop Suppression

During HYPER or GODCHAIN active states, drops are fully suppressed:
- `DOMINATION.HYPER_SUPPRESS: true` — no drops while HYPER is active
- `DOMINATION.GODCHAIN_SUPPRESS: true` — no drops while GODCHAIN is active

Drops already mid-fall when suppression activates continue falling and can be collected. Only new drops are blocked.

Rationale: HYPER and GODCHAIN are already power spikes. Adding a drop on top would create excessive reward density. Suppression during these windows prevents GODCHAIN re-activation cascades.

### Decision 7: Anti-Cluster Guard

Minimum 6 seconds between non-pity, non-force drops (`_lastDropGameTime` check at `DropSystem.js:562`). This prevents multiple drops clustering from rapid kills.

Value is hardcoded—not in BalanceConfig. Recommended to extract to config.

Rationale: Without this guard, a cluster of rapid kills with individually small drop chances can produce visually confusing multi-drop piles. The 6s window spreads drops without feeling slow.

## GDD Requirements Addressed

| GDD System | Requirement | How This ADR Addresses It |
|------------|-------------|--------------------------|
| drop-system-apc.md | Tier-based drop chances (STRONG 3%, MEDIUM 2.5%, WEAK 1.0%) (TR-DRP-001) | Balance.getDropChance() lookup by currency symbol tier |
| drop-system-apc.md | Pity timer with cycle-scaling threshold (C1=30, min floor 15 kills) (TR-DRP-002) | DROP_SCALING with PITY_BASE, PITY_REDUCTION, APC pityAdj |
| drop-system-apc.md | Category selection (SPECIAL/UTILITY/PERK) with adaptive weighting (TR-DRP-003) | ADAPTIVE_DROPS weights with power-score modulation |
| drop-system-apc.md | Struggle detection (40s trigger, 3× chance boost, SPECIAL/PERK bias) (TR-DRP-004) | Rolling time-window, power score ceiling, category bias |
| drop-system-apc.md | Domination detection (>1.5 kills/s, 0.25× chance, 2× pity) (TR-DRP-005) | Rolling kill-rate window, power score floor, suppression |
| drop-system-apc.md | Post-death grace window (60s with lowered thresholds) (TR-DRP-006) | DropSystem._deathGraceUntil and ADAPTIVE_DROP_BALANCER.POST_DEATH |
| drop-system-apc.md | APC 3-axis power score → enemy HP 0.85-1.35× and pity ±10 kills (TR-DRP-007) | ADAPTIVE_POWER with weapon/perk/special weights, HP_FLOOR+HP_RANGE |
| drop-system-apc.md | Three coexisting power score formulas (TR-DRP-008) | Decision 2 documents all three formulas and their contexts |
| drop-system-apc.md | Anti-cluster guard (minimum 6s between drops) (TR-DRP-009) | DropSystem.lastEnemyDropTime check in tryEnemyDrop() |
| drop-system-apc.md | Guaranteed SPECIAL drop pre-boss from wave 4+ (TR-DRP-010) | GUARANTEED_SPECIAL_WAVE with per-cycle flag |
| drop-system-apc.md | GODCHAIN and HYPER drop suppression during active buffs (TR-DRP-011) | DOMINATION.HYPER_SUPPRESS / GODCHAIN_SUPPRESS flags |

## Performance Implications

- **CPU**: O(1) per kill (push timestamp, prune old entries from rolling window). Category selection does one weighted random selection.
- **Memory**: Rolling kill window stores up to 10 timestamps. ~160 bytes total.
- **Load Time**: Zero — DropSystem is instantiated at boot with no precomputation.
- **Network**: None.

## Migration Plan

Already shipped. No migration needed.

## Known Issues Carried Forward

1. **Three power score formulas** are independently tuned but undocumented as a set. If re-tuning one, check the other two for side effects.
2. **Anti-cluster 6s** is hardcoded at `DropSystem.js:562` — not in BalanceConfig. Consider extracting.
3. **UPGRADE weight (1.5)** is declared in `CATEGORY_WEIGHTS` but unreachable since v5.11. Dead config.
4. **Legacy `DROPS.PITY_TIMER_KILLS: 45`** is never read at runtime. Dead config.
5. **APC never calibrates C1** — intentional, but players entering their first cycle transition may feel a sudden jump.

## Validation Criteria

- Drop rates per tier match config over 1000+ samples
- Pity timer guarantees a drop within PITY_BASE kills (C1) or fewer (C2+, reduced by PITY_REDUCTION)
- Struggle detection triggers within ±2s of TIME_THRESHOLD (40s) and applies ×3 chance boost
- Domination detection triggers at >1.5 kills/s and applies 0.25× chance, 2× pity
- No two drops within 6s of each other (non-pity path)
- Guaranteed SPECIAL drop from wave 4+ (pre-boss) in both V8 campaign and Arcade
- Post-death grace window of 60s with lowered thresholds
- APC adjusts enemy HP between 0.85× and 1.35× (C2+ only)
- Arcade mode applies ARCADE_MULT: 0.85 threshold scaling
- HYPER/GODCHAIN suppression blocks new drops; mid-fall drops remain collectible

## Related Decisions

- ADR-0003: EventBus — `entity:died` events drive kill counting, `player:died` triggers grace window
- ADR-0004: Spatial Grid Collision — kill detection feeds pity counter and rolling window
- ADR-0007: V8 Scroller LevelScript — wave numbering for guaranteed SPECIAL pre-boss
