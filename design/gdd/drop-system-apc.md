# Drop System + Adaptive Power Calibration — Game Design Document

**System:** Drop System + Adaptive Drop Balancer + Adaptive Power Calibration (APC)
**Version covered:** v7.12.8 (reverse-documented from code; cite `file:line`)
**Status:** Shipped, active in all modes
**File audience:** Designers, engineers, QA

---

## A. Overview

The Drop System governs **what, when, and how often** enemies drop pickups. It is layered: a base per-tier probability roll, a pity floor that guarantees pickups after N kills without drops, a category selector (SPECIAL / UTILITY / PERK — never UPGRADE from enemies since v5.11), an Adaptive Drop Balancer that detects **struggle** (no drops for too long while weak) and **domination** (killing too fast while strong) and biases the system accordingly, and a cycle-based Adaptive Power Calibration (APC) that re-tunes enemy HP and pity cadence based on the player's loadout strength at boss defeats.

Three distinct "power score" formulas coexist in the codebase — one per layer — each with its own weighting. APC uses Weapon/Perks/Special at `0.50/0.30/0.20`, `ADAPTIVE_DROPS` uses Weapon/Special at `0.65/0.35`, and the Adaptive Drop Balancer v5.19 uses Weapon/Special/Perk at `0.50/0.25/0.25`. They are **not interchangeable** — each was tuned for its own suppression/adjustment logic.

The net effect: drops should feel generous-when-struggling, rare-when-dominant, cycle-aware, and anti-clustered. A pity-forced drop never fires faster than 6 seconds apart (anti-cluster), always respects `MIN_KILLS_SINCE_DROP` (no cheap drops in dead time), and during HYPER / GODCHAIN windows drops are fully suppressed.

---

## B. Player Fantasy

Drops should feel **earned but not grindy**. The player should never go long enough without a pickup to feel punished (struggle boost kicks in at 40s without a drop), but should also not feel like the game is "feeding them" when they're already ahead (domination cuts drop chance to 25% and doubles pity timer). Pre-boss waves should reliably provide a Special for the fight (guaranteed SPECIAL from wave 4+). After death the game grants a 60-second grace window with lowered thresholds — a soft rebound.

APC should be invisible moment-to-moment. A dominant player on cycle 2 suddenly sees boss-rotation enemies with ±35% HP variance; a struggling player gets -10 kills off their pity timer. The goal is equilibrium without overt punishment or favoritism.

---

## C. Detailed Rules

### C.1 Enemy tier classification

Enemies are classified by currency symbol into three tiers (not by formation type):

| Tier | Symbols | Drop Chance | Config |
|---|---|---|---|
| STRONG | `$`, `元`, `Ⓒ` | 3.0% | [BalanceConfig.js:765](src/config/BalanceConfig.js:765) |
| MEDIUM | `€`, `£`, `₣`, `₺` | 2.5% | [BalanceConfig.js:766](src/config/BalanceConfig.js:766) |
| WEAK | `¥`, `₽`, `₹` | 1.0% | [BalanceConfig.js:767](src/config/BalanceConfig.js:767) |

Lookup at runtime via `Balance.getDropChance(symbol)` [BalanceConfig.js:2681–2683](src/config/BalanceConfig.js:2681).

### C.2 Main drop flow — `DropSystem.tryEnemyDrop()`

Entry point [DropSystem.js:471](src/systems/DropSystem.js:471). Sequence:

1. **Read tier chance** [DropSystem.js:495](src/systems/DropSystem.js:495) → `dropChance = Balance.getDropChance(enemySymbol)`.
2. **Compute pity threshold** [DropSystem.js:511–516](src/systems/DropSystem.js:511) with APC adjustment `pityAdj`. Formula: `max(10, max(15, PITY_BASE - (cycle-1) × PITY_REDUCTION) + pityAdj)`.
3. **Pity check** [DropSystem.js:554](src/systems/DropSystem.js:554) → `killsSinceLastDrop >= pityThreshold` forces a drop.
4. **Struggle force check** [DropSystem.js:557](src/systems/DropSystem.js:557) — Adaptive Balancer can force a drop even without pity hit.
5. **Gate** [DropSystem.js:560](src/systems/DropSystem.js:560): `struggleForce || pityDrop || Math.random() < dropChance`.
6. **Anti-cluster guard** [DropSystem.js:562](src/systems/DropSystem.js:562) — skip roll if `timeSinceLastDrop < 6.0s` (non-pity, non-force path only).
7. **Category selection** (see C.4).
8. **Suppression check** [DropSystem.js:599](src/systems/DropSystem.js:599) via `shouldSuppressDrop()` — never applied to UPGRADE / PERK / struggle-forced drops.

### C.3 Pity timer — cycle-scaling

- `DROP_SCALING.PITY_BASE: 30` [BalanceConfig.js:1385](src/config/BalanceConfig.js:1385).
- `DROP_SCALING.PITY_REDUCTION: 2` per cycle [BalanceConfig.js:1386](src/config/BalanceConfig.js:1386).
- Minimum floor: 15 kills.
- Effective thresholds: **C1 = 30, C2 = 28, C3 = 26** (reduced further by APC struggle bonus if player is weak).
- Legacy key `DROPS.PITY_TIMER_KILLS: 45` [BalanceConfig.js:764](src/config/BalanceConfig.js:764) is **dead**, replaced by `DROP_SCALING`.

### C.4 Category selection

- Three active categories: **SPECIAL, UTILITY, PERK**. UPGRADE is NOT droppable from enemies since v5.11 — the Evolution Core item drops only from boss kills (see Weapon GDD C.2).
- UPGRADE → SPECIAL redirect [DropSystem.js:197–200](src/systems/DropSystem.js:197): if an "upgrade" category is rolled by legacy path, re-route to `getWeightedSpecial()`.
- Comment at [DropSystem.js:258](src/systems/DropSystem.js:258): "shouldForceUpgrade removed — UPGRADE no longer drops from enemies".
- **Adaptive category weighting** (`ADAPTIVE_DROPS` [BalanceConfig.js:1395–1410](src/config/BalanceConfig.js:1395)):
  - `CATEGORY_WEIGHTS: { UPGRADE: 1.5, SPECIAL: 1.0, UTILITY: 0.8, PERK: 1.2 }` (UPGRADE weight still declared but unreachable post-v5.11).
  - `MIN_CATEGORY_WEIGHT: 0.05` — never fully zero a category.
  - `SUPPRESSION_FLOOR: 0.50` — below power score 0.50 no suppression is applied.
- **Legacy fallback** (when `ADAPTIVE_DROPS.ENABLED = false`): fixed split **60% SPECIAL / 20% UTILITY / 20% PERK** [DropSystem.js:213–229](src/systems/DropSystem.js:213).

### C.5 Guaranteed SPECIAL pre-boss

- `DROP_SCALING.GUARANTEED_SPECIAL_WAVE: 4` [BalanceConfig.js:1390](src/config/BalanceConfig.js:1390).
- Check at [DropSystem.js:179–185](src/systems/DropSystem.js:179): if `currentWave >= 4 && !specialDroppedThisCycle` → force `getWeightedSpecial()` result.
- Per-cycle flag `specialDroppedThisCycle` reset by [GameplayCallbacks.js:447](src/core/GameplayCallbacks.js:447) on cycle transition.
- Ensures the player enters each boss with a Special available (HOMING/PIERCE/MISSILE).

### C.6 Adaptive Drop Balancer v5.19 — Struggle detection

Config `Balance.ADAPTIVE_DROP_BALANCER.STRUGGLE` [BalanceConfig.js:1428–1463](src/config/BalanceConfig.js:1428).

| Parameter | Value | Meaning |
|---|---|---|
| `TIME_THRESHOLD` | 40s | Trigger struggle boost after this long without a drop |
| `FORCE_THRESHOLD` | 55s | Force a drop regardless of roll |
| `CHANCE_BOOST` | 3.0 | ×3 drop chance during struggle window |
| `POWER_CEILING` | 0.40 | Only trigger if power score ≤ 0.40 |
| `MIN_KILLS_SINCE_DROP` | 5 | Don't trigger in early kill stretches |
| `ACTIVITY_WINDOW` | 8s | Kill-rate must be active within this window |
| `CYCLE_REDUCTION` | 5 | -5s off both thresholds per cycle (C2: 35s/50s, C3: 30s/45s) |
| `CATEGORY_BIAS` | `{SPECIAL:0.55, PERK:0.35, UTILITY:0.10}` | During struggle, prefer SPECIAL and PERK over UTILITY |

Balancer power score formula [DropSystem.js:313](src/systems/DropSystem.js:313): `0.50×weapon + 0.25×special + 0.25×perk`.

### C.7 Adaptive Drop Balancer v5.19 — Domination detection

Config `Balance.ADAPTIVE_DROP_BALANCER.DOMINATION`.

| Parameter | Value | Meaning |
|---|---|---|
| `KILL_RATE_THRESHOLD` | 1.5 kills/s | Above this, domination kicks in |
| `KILL_RATE_WINDOW` | 10 | Rolling window of last 10 kills |
| `POWER_FLOOR` | 0.60 | Only trigger if power score ≥ 0.60 |
| `CHANCE_MULT` | 0.25 | Drop chance × 0.25 during domination |
| `PITY_MULT` | 2.0 | Pity threshold × 2 (e.g. 30 → 60) |
| `HYPER_SUPPRESS` | true | Fully suppress drops while HYPER active |
| `GODCHAIN_SUPPRESS` | true | Fully suppress drops while GODCHAIN active |

### C.8 Post-death grace

Config `Balance.ADAPTIVE_DROP_BALANCER.POST_DEATH`:
- `WINDOW: 60s` — grace lasts 60 seconds after respawn.
- `THRESHOLD: 25s` — lower struggle threshold during grace.
- `MIN_KILLS: 3` — only after 3 post-death kills.
- Handler: [DropSystem.js:418](src/systems/DropSystem.js:418) `notifyDeath()` sets `_deathGraceUntil` timestamp.

### C.9 Arcade mode multiplier

`ADAPTIVE_DROP_BALANCER.ARCADE_MULT: 0.85` — in Arcade mode struggle thresholds are multiplied by 0.85 (faster grace, more generous pacing). Applied in Balancer threshold computations.

### C.10 Adaptive Power Calibration (APC)

Config `Balance.ADAPTIVE_POWER` [BalanceConfig.js:1414–1423](src/config/BalanceConfig.js:1414).

| Parameter | Value |
|---|---|
| `ENABLED` | true |
| `WEIGHTS` | `{WEAPON: 0.50, PERKS: 0.30, SPECIAL: 0.20}` |
| `HP_FLOOR` | 0.85 |
| `HP_RANGE` | 0.50 |
| `PITY_BONUS_WEAK` | -10 (kills) |
| `PITY_PENALTY_STRONG` | +5 (kills) |
| `WEAK_THRESHOLD` | 0.30 |
| `STRONG_THRESHOLD` | 0.60 |

- **Trigger** [GameplayCallbacks.js:424–440](src/core/GameplayCallbacks.js:424): fires at cycle transition (boss defeated), cycle ≥ 2 only. C1 is never calibrated.
- **Power score formula**: `ps = 0.50×weaponScore + 0.30×perkScore + 0.20×specialScore` where:
  - `weaponScore = (weaponLevel - 1) / 2` → 0 at LV1, 0.5 at LV2, 1.0 at LV3.
  - `perkScore = min(totalPerkStacks / 8, 1)` (caps quickly given the 3-perk max, usually 0.375 per perk held).
  - `specialScore = 0 | 1` (binary — has active Special or not).
- **HP multiplier** [WaveManager.js:221–222](src/managers/WaveManager.js:221): `hpMult = 0.85 + ps × 0.50` (range 0.85–1.35×). Applied as final multiplier in `calculateEnemyHP()`.
- **Pity adjustment** [DropSystem.js:515–516](src/systems/DropSystem.js:515): `pityAdj = -10` if `ps < 0.30`, `+5` if `ps > 0.60`, else 0. Added to base pity threshold (floored at 10).
- Stored on `RunState.cyclePower` for debug inspection.

### C.11 GODCHAIN / HYPER suppression

Separate from Balancer `HYPER_SUPPRESS / GODCHAIN_SUPPRESS`:
- `BalanceConfig.js:1451` — `DOMINATION.GODCHAIN_SUPPRESS: true` suppresses all drops while GODCHAIN is active, so 4th+ PERK pickups don't fire during the 10s window. Prevents redundant GODCHAIN re-activations (see Weapon+Elementals+GODCHAIN GDD C.15).

### C.12 Debug surface — `dbg.report()`

Two sections [DebugSystem.js:1010–1033](src/utils/DebugSystem.js:1010):

**ADAPTIVE POWER CALIBRATION** (shown only if `cyclePower.score > 0`, i.e. C2+):
- Power Score (2 decimals)
- HP Mult (3 decimals)
- Pity Adj (integer)
- Header color `#bb44ff`.

**ADAPTIVE SUPPRESSION**:
- Total suppressed count + rate %
- Avg power score at suppression
- Last 5 suppression events (timestamp / weapon level / hasSpecial)

---

## D. Balance & Tuning Reference

| Knob | Value | Location | What it does |
|---|---|---|---|
| `DROPS.CHANCE_STRONG` | 0.03 | `BalanceConfig.js:765` | Drop rate STRONG tier |
| `DROPS.CHANCE_MEDIUM` | 0.025 | `BalanceConfig.js:766` | Drop rate MEDIUM tier |
| `DROPS.CHANCE_WEAK` | 0.01 | `BalanceConfig.js:767` | Drop rate WEAK tier |
| `DROP_SCALING.PITY_BASE` | 30 | `BalanceConfig.js:1385` | Base pity kills |
| `DROP_SCALING.PITY_REDUCTION` | 2 | `BalanceConfig.js:1386` | Pity reduction per cycle |
| `DROP_SCALING.GUARANTEED_SPECIAL_WAVE` | 4 | `BalanceConfig.js:1390` | Wave from which SPECIAL is guaranteed |
| `ADAPTIVE_DROPS.WEAPON_WEIGHT/SPECIAL_WEIGHT` | 0.65 / 0.35 | `BalanceConfig.js:1395` | 2-axis power for suppression |
| `ADAPTIVE_DROPS.SUPPRESSION_FLOOR` | 0.50 | `BalanceConfig.js:1395` | Power floor below which no suppression |
| `ADAPTIVE_POWER.WEIGHTS` | 0.50/0.30/0.20 | `BalanceConfig.js:1415` | 3-axis power for APC |
| `ADAPTIVE_POWER.HP_FLOOR/RANGE` | 0.85 / 0.50 | `BalanceConfig.js:1416` | Enemy HP mult floor + range |
| `BALANCER.STRUGGLE.TIME_THRESHOLD` | 40s | `BalanceConfig.js:1428` | Struggle boost start |
| `BALANCER.STRUGGLE.FORCE_THRESHOLD` | 55s | `BalanceConfig.js:1429` | Struggle force drop |
| `BALANCER.STRUGGLE.CHANCE_BOOST` | 3.0 | `BalanceConfig.js:1430` | Struggle chance multiplier |
| `BALANCER.STRUGGLE.POWER_CEILING` | 0.40 | `BalanceConfig.js:1431` | Only trigger if weak |
| `BALANCER.DOMINATION.KILL_RATE_THRESHOLD` | 1.5 k/s | `BalanceConfig.js:1445` | Domination trigger rate |
| `BALANCER.DOMINATION.POWER_FLOOR` | 0.60 | `BalanceConfig.js:1446` | Only trigger if strong |
| `BALANCER.DOMINATION.CHANCE_MULT` | 0.25 | `BalanceConfig.js:1447` | Drop chance cut |
| `BALANCER.DOMINATION.PITY_MULT` | 2.0 | `BalanceConfig.js:1448` | Pity doubled |
| `BALANCER.POST_DEATH.WINDOW` | 60s | `BalanceConfig.js:1455` | Grace window after death |
| `BALANCER.ARCADE_MULT` | 0.85 | `BalanceConfig.js:1462` | Arcade threshold scaling |

---

## E. Kill-switches & Risks

### Kill-switches

- `Balance.ADAPTIVE_DROPS.ENABLED` — fall back to fixed 60/20/20 split.
- `Balance.ADAPTIVE_POWER.ENABLED` — disable APC entirely (HP flat, pity flat).
- Balancer does not expose a top-level `ENABLED` flag — effectively always on.

### Risks & drifts (surfaced in reverse-doc)

1. **Three coexisting "power score" formulas.** APC uses `0.50/0.30/0.20` (weapon/perks/special), ADAPTIVE_DROPS uses `0.65/0.35` (weapon/special only — perks ignored), Balancer uses `0.50/0.25/0.25` (weapon/special/perk). Each was tuned for its own purpose but **there is no single source of truth** for "how strong is the player right now". Risk: touching one formula and forgetting the others creates inconsistent suppression behavior. Consider consolidating into a shared `RunState.powerScore()` helper or at minimum documenting which formula applies where.

2. **Legacy `DROPS.PITY_TIMER_KILLS: 45` is dead config.** [BalanceConfig.js:764](src/config/BalanceConfig.js:764) is never read; runtime uses `DROP_SCALING.PITY_BASE: 30`. Recommend deleting or commenting as dead.

3. **`CATEGORY_WEIGHTS.UPGRADE: 1.5` is unreachable.** Since v5.11 UPGRADE does not drop from enemies. The weight is dead. Safe to remove.

4. **CLAUDE.md tier terminology is wrong.** Doc says "SMALL/MEDIUM/STRONG"; code uses **STRONG/MEDIUM/WEAK**. Fix in same commit.

5. **CLAUDE.md "pity 30 kills" is only half-right.** 30 is the C1 runtime value after DROP_SCALING. The legacy `45` is what `DROPS.PITY_TIMER_KILLS` holds. Without the cycle-reduction context ("C1=30, C2=28, C3=26, floor 15") the number is misleading.

6. **CLAUDE.md missing facts.** No mention of: UPGRADE eliminated from enemy drops (v5.11), post-death 60s grace, Arcade 0.85× multiplier, Guaranteed SPECIAL wave 4+ mechanic, APC only firing from C2+, HP_RANGE 0.85–1.35×.

7. **APC never calibrates C1.** Intentional (no baseline to compare against), but players entering their first cycle transition may feel a sudden difficulty jump if they were dominant in C1. Worth a playtest note.

8. **Struggle `MIN_KILLS_SINCE_DROP: 5` vs post-death `MIN_KILLS: 3`.** Two separate min-kill gates exist. The numbers are close and the semantics overlap ("don't fire in dead time") — worth an internal doc line or unification.

---

## F. Open Design Questions

- **Should APC consider HYPER meter state?** Currently APC is blind to proximity-kill meter fill. A player approaching HYPER but not yet active reads as "weak" to APC. Debatable — HYPER is a one-shot burst, not persistent power.
- **Balancer `CYCLE_REDUCTION: 5`.** Struggle thresholds shorten each cycle (C3 = 30s/45s) — but so does pity, and so does enemy HP (APC). Is the compounding generosity intentional or over-correction?
- **`HYPER_SUPPRESS + GODCHAIN_SUPPRESS` both true.** During HYPERGOD (HYPER × GODCHAIN) the player is at maximum power for 10s. Drops are fully frozen. Good — but the cliff-edge when both expire might feel abrupt. Consider a 2s "ramp back in" instead of instant re-enable.
- **Guaranteed SPECIAL pre-boss in V8 mode.** The wave-4+ check relies on `currentWave` — in V8 Scroller the concept of "wave" maps to level boss phases differently. Verify the guarantee still fires before each V8 boss (L1 FED / L2 BCE / L3 BOJ).
- **Anti-cluster 6s** hardcoded at [DropSystem.js:562](src/systems/DropSystem.js:562) — not in config. Move to `Balance.DROPS.ANTI_CLUSTER_S`.

---

## G. Related Systems

- **Weapon Evolution + Elementals + GODCHAIN GDD** — defines the pickups (SPECIAL / UTILITY / PERK) that this system drops and consumes.
- **Arcade Rogue Protocol GDD** — uses `ARCADE_MULT` threshold scaling; mini-boss modifier rewards bypass this system entirely.
- **Enemy Agents GDD** — defines the tier classification (STRONG/MEDIUM/WEAK by currency symbol) that feeds `getDropChance()`.
- **V8 Scroller GDD** — wave-4+ guaranteed SPECIAL mechanic requires cross-check in V8 flow.
