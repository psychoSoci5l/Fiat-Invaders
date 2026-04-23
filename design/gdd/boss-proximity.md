---
status: reverse-documented
source: src/entities/Boss.js, src/managers/MiniBossManager.js, src/config/BalanceConfig.js, src/core/GameplayCallbacks.js, src/main.js, src/utils/Constants.js
date: 2026-04-23
verified-by: psychoSocial
scope: M
---

# Boss System + Proximity Kill Meter — Game Design Document

**System:** 3-boss rotation (FED / BCE / BOJ) with 3-phase fight structure, plus the DIP (Proximity Kill) meter that feeds HYPER mode.
**Version covered:** v7.12.9 (reverse-documented from code)
**Status:** Shipped, active in all modes
**File audience:** Designers, engineers, QA

> **Note**: This document was reverse-engineered from the existing implementation. It captures current behavior and clarified design intent accumulated over ~6 years of iteration. Some tuning values carry long comment trails (`v4.x: A→B`) — those are preserved where relevant.

---

## A. Overview

A **boss fight** is the closing act of every level in V8 campaign mode (spawn at `BOSS_AT_S = 170s` [BalanceConfig.js:25](src/config/BalanceConfig.js:25)) and the periodic climax in Arcade mode. Three bosses rotate in a fixed order — `FEDERAL_RESERVE → BCE → BOJ` — selected by `bossType = BOSS_ROTATION[(marketCycle - 1) % 3]` [main.js:2676](src/main.js:2676), overridden in V8 by `G.LevelScript.BOSS_TYPE` [main.js:2680](src/main.js:2680) so that L1=FED / L2=BCE / L3=BOJ regardless of `marketCycle`.

Each boss has **3 HP-gated phases** with progressively faster movement, faster fire rate, distinct attack patterns per phase, and phase-specific dialogue + meme popup + screen flash + hit-stop slowmo. Phase thresholds are HP-ratio based: **Phase 2 at 66% HP**, **Phase 3 at 20% HP** [BalanceConfig.js:821](src/config/BalanceConfig.js:821).

The **Proximity Kill Meter** (visually labeled "DIP") is a 0–100 gauge that fills as the player racks up kills from close vertical range and lands hits on bosses. When full, it triggers HYPER mode (see Weapon GDD). The meter is the system-level replacement for the older "graze" mechanic — the variable names still say `grazeMeter` / `getGrazeMeter` in code [GameplayCallbacks.js:283](src/core/GameplayCallbacks.js:283) for backward compatibility, but the semantics are proximity-based.

---

## B. Player Fantasy

Each boss is the **personification of a central bank**. The Fed is loud and arrogant (green, money-printer brrrr), the BCE is bureaucratic (EU blue with gold stars, "whatever it takes"), the BOJ is zen-turned-frantic (Japan red, yield curve control). The boss is meant to feel like a boss fight — bigger hitbox (160×140 vs. 58 for enemies [Boss.js:6](src/entities/Boss.js:6)), distinct entrance, phased escalation, and signature meme/dialogue.

Phase 3 is the **desperation phase** — short (0–20% HP), fast, and loaded with the boss's signature "ultimate" pattern (FED's laser curtain, BOJ's intervention bursts, BCE's star pattern P3). The player should feel like the fight is being won _against_ them in the final 20%, not a coast to zero.

The DIP meter gives players a reason to be **aggressive**: close the distance, trade positional safety for meter gain, chase a HYPER trigger mid-boss-fight as a comeback tool. Boss-hit gain is deliberately **small** (`BOSS_HIT_GAIN: 0.15`, nerfed from 0.4 in v4.40 [BalanceConfig.js:1278](src/config/BalanceConfig.js:1278)) — HYPER during a boss fight should be _earned over time_, not popped automatically in the first 10 seconds. Phase-transition bonus (`BOSS_PHASE_GAIN: 15`) is the lump-sum reward for breaking the boss into its next phase.

---

## C. Detailed Rules

### C.1 Boss roster and rotation

| Boss | Symbol | Color | Personality | Config |
|---|---|---|---|---|
| FEDERAL_RESERVE | `$` | `#00ff66` (dollar green) | arrogant | [Constants.js:893](src/utils/Constants.js:893) |
| BCE | `€` | `#003399` (EU blue) + `#ffcc00` accent | bureaucratic | [Constants.js:906](src/utils/Constants.js:906) |
| BOJ | `¥` | `#bc002d` (Japan red) | zen | [Constants.js:919](src/utils/Constants.js:919) |

**Rotation:** `G.BOSS_ROTATION = ['FEDERAL_RESERVE', 'BCE', 'BOJ']` [Constants.js:935](src/utils/Constants.js:935). Arcade picks by `(marketCycle - 1) % 3`. V8 campaign overrides with `LevelScript.BOSS_TYPE` so each level always fights the intended boss regardless of cycle [main.js:2680](src/main.js:2680).

### C.2 HP formula

Boss HP at spawn is computed in main.js [main.js:2697–2713](src/main.js:2697):

```
rawHp    = BASE + level × PER_LEVEL + (marketCycle - 1) × PER_CYCLE
bossHp   = max(MIN_FLOOR, floor(rawHp × perkScaling × ngPlusMult))
perkScaling = 1 + perkCount × PERK_SCALE     // +10% per player perk held
```

Config values [BalanceConfig.js:827–833](src/config/BalanceConfig.js:827):

| Key | Value | Notes |
|---|---|---|
| `BASE` | 2430 | v5.31: 2700→2430 (C1 easier) |
| `PER_LEVEL` | 100 | v4.48: 65→100 |
| `PER_CYCLE` | 5000 | v4.48: 4000→5000 |
| `PERK_SCALE` | 0.10 | +10% HP per perk held |
| `MIN_FLOOR` | 2430 | |

Boss inherits `baseHp`/`hpPerLevel`/`hpPerCycle` from `Constants.BOSSES[bossType]` at the per-boss level ([Constants.js:902–904](src/utils/Constants.js:902)) — these fields are **declared but not read** by the HP scaling path; it reads from `Balance.BOSS.HP.*` instead. (Dead fields, flagged for cleanup.)

Damage is scaled down by `DMG_DIVISOR: 2.5` [BalanceConfig.js:823](src/config/BalanceConfig.js:823), tuned to target 70–80s fight length (v6.5: 4→3→2.5). NG+ multiplier from campaign state stacks on top.

### C.3 Phase transitions

Triggered inside `Boss.damage(amount)` [Boss.js:67–79](src/entities/Boss.js:67):

- **Phase 2**: HP ≤ 66% (`PHASE_THRESHOLDS[0] = 0.66`).
- **Phase 3**: HP ≤ 20% (`PHASE_THRESHOLDS[1] = 0.20`) — shortened from 33% in v5.0.4 for shorter desperation phase.

On transition [Boss.js:81–136](src/entities/Boss.js:81):
1. `phaseTransitioning = true`, `phaseTransitionTimer = 1.5s` — boss is stationary, shaking, invulnerable-ish during this window.
2. `moveSpeed` updates to `PHASE_SPEEDS[bossType][newPhase - 1]`.
3. BOJ flips out of `zenMode` at phase 2+.
4. Audio: `bossPhaseChange` SFX + music layer update (`setBossPhase(newPhase)`).
5. Dialogue: random pick from `G.DIALOGUES.BOSS_PHASE[bossType][newPhase]` routed through `MemeEngine.queueMeme('BOSS_SPAWN', ...)`.
6. Harmonic Conductor switches enemy-fire sequence.
7. Screen shake 30, hit-stop slowmo (`applyHitStop('BOSS_PHASE', false)`), orange screen flash (`BOSS_PHASE`).
8. **DIP meter +15** via `addProximityMeter(BOSS_PHASE_GAIN)`.

### C.4 Per-phase movement and fire rate

From [BalanceConfig.js:837–849](src/config/BalanceConfig.js:837):

| Boss | P1 speed / fire | P2 speed / fire | P3 speed / fire |
|---|---|---|---|
| FEDERAL_RESERVE | 70 / 0.77s | 130 / 0.42s | 170 / 0.25s |
| BCE | 35 / 1.40s | 55 / 0.70s | 77 / 0.40s |
| BOJ | 45 / 0.90s | 75 / 0.45s | 136 / 0.21s |

P3 values were nerfed -15% speed and ×1.15 fire-rate in v5.31. FED moves 2× faster than BCE in every phase (personality: arrogant/aggressive vs. bureaucratic/stately). BOJ P3 is the fastest fire rate in the game (0.21s = ~4.8 shots/sec).

### C.5 Attack patterns per phase

Defined in `Balance.BOSS.ATTACKS[bossType][P1|P2|P3]` [BalanceConfig.js:899+](src/config/BalanceConfig.js:899). Summary:

- **FED P1**: RING (12 bullets radial), SINE (10-bullet wave), aimed BURST. Rotates at 0.15 rad/s.
- **FED P2**: HOMING (3 bullets, homing strength 2.0). Rotation speeds up to 0.28.
- **FED P3**: LASER curtain (25 bullets, width 450, gap 65), vertical CURTAIN (16 bullets, gap 60). Signature.
- **BCE P1–P3**: star-pattern bullet hell with accent-gold projectiles, phase 3 adds `SIN_AMP`/`COS_AMP` movement oscillation (circling stars).
- **BOJ P1**: gentle oscillation (zen mode), slow fire.
- **BOJ P2**: wave motion with `INTERVENTION_CHANCE: 0.01` per frame — old stochastic path.
- **BOJ P3 INTERVENTION** [BalanceConfig.js:859–865](src/config/BalanceConfig.js:859): cooldown-based burst, `TELEGRAPH: 0.4s` warning lines → `COUNT: 5` bullets in `SPREAD: 0.4 rad` at `SPEED: 240`. Fires every `COOLDOWN: 2.5s`. Signature. Replaced v4.0.2 random 8%/frame path.

### C.6 Minion spawning in P3

Each boss type has its own minion spawn rate in Phase 3 [BalanceConfig.js:852–856](src/config/BalanceConfig.js:852):

| Boss | Spawn interval |
|---|---|
| FEDERAL_RESERVE | 2.5s |
| BCE | 3.0s |
| BOJ | 2.0s |

Minion HP scales by `MINION.HP_MULT_BASE: 5 + HP_MULT_PER_PHASE: 2 × phase` [BalanceConfig.js:872–877](src/config/BalanceConfig.js:872).

### C.7 Boss drops and Evolution Core

On each player-bullet hit [GameplayCallbacks.js:339–362](src/core/GameplayCallbacks.js:339):
- Score += `floor(damage × 2)`.
- DIP meter += `BOSS_HIT_GAIN = 0.15` (unless HYPER active).
- `DropSystem.tryBossDrop()` rolled against `DROP_INTERVAL: 40` hits + `DROP_TIME_INTERVAL: 12s` dynamic cap [BalanceConfig.js:818–819](src/config/BalanceConfig.js:818).

On boss defeat (cinematic flow from v5.11 onward) the **Evolution Core** pickup is spawned — the player's weapon is permanently upgraded (Single → Dual → Triple). See [Weapon GDD C.2](weapon-elementals-godchain.md) for the cinematic deploy VFX (2.8s spawn + 1.2s fly-in + 0.8s deploy, totaling `BOSS_CELEBRATION_DELAY: 7.5s`).

Intermission duration: `INTERMISSION_BOSS_DURATION: 6.0s` skippable [BalanceConfig.js:1043](src/config/BalanceConfig.js:1043).

### C.8 Entrance and boundaries

- **Entrance speed**: `ENTRANCE_SPEED: 80 px/s` from spawn Y = -160 down to `targetY = 100 + safeAreaTop` [Boss.js:30–31](src/entities/Boss.js:30) — below HUD + HP bar (v4.41: was 65).
- `isEntering = true` → boss is invulnerable during entrance (raised v-bar clearance).
- `BOUNDARY_MARGIN: 20px` default edge margin (FED/BCE P3 use this).

### C.9 Per-boss movement personalities

Defined in `Balance.BOSS.MOVEMENT[bossType][Pn]` [BalanceConfig.js:881–895](src/config/BalanceConfig.js:881):

- **FED**: horizontal patrol → P2 oscillation (amp 20, freq 3) → P3 Lissajous-style (`AMP_X 150, AMP_Y 30, FREQ_X 2, FREQ_Y 4, LERP 3, JITTER 8`).
- **BCE**: slower margins, P3 uses `SIN_AMP 25, COS_AMP 10` — star-circling.
- **BOJ**: from the start uses oscillating motion (`OSC_AMP 100, OSC_FREQ 0.8`). P2 adds wave (`WAVE_AMP 120, WAVE_FREQ 1.2`) plus the legacy intervention-chance path. P3 switches to `AMP_X 140, AMP_Y 25`.

---

## D. Proximity Kill Meter (DIP)

### D.1 Rules

Config [BalanceConfig.js:1272–1280](src/config/BalanceConfig.js:1272):

| Key | Value | Meaning |
|---|---|---|
| `MAX_DISTANCE` | 600 | Max vertical pixel distance for any meter gain |
| `CLOSE_DISTANCE` | 150 | At ≤ this distance, full `METER_GAIN_MAX` |
| `METER_GAIN_MAX` | 7 | Meter gain at close range |
| `METER_GAIN_MIN` | 1 | Meter gain at max range |
| `BOSS_PHASE_GAIN` | 15 | Lump sum per boss phase transition |
| `BOSS_HIT_GAIN` | 0.15 | Per boss-hit (gradual, anti-spike) |
| `HYPER_KILL_EXTENSION` | 0 | Disabled (v4.60) — HYPER is fixed duration |

### D.2 Gain formula — enemy kill path

Entry at [GameplayCallbacks.js:274–296](src/core/GameplayCallbacks.js:274) inside `onEnemyKilled`:

```
dist = abs(enemy.y - player.y)                                 // vertical only
if dist >= MAX_DISTANCE or player.isHyperActive → skip
t2   = 1 - max(0, dist - CLOSE_DISTANCE) / (MAX_DISTANCE - CLOSE_DISTANCE)
gain = METER_GAIN_MIN + t2 × (METER_GAIN_MAX - METER_GAIN_MIN)
// Arcade JACKPOT modifier halves gain
if isArcade: gain *= RunState.arcadeBonuses.grazeGainMult ?? 1
grazeMeter = min(100, grazeMeter + gain)
```

`t2` is linear-ramped: at `dist ≤ CLOSE_DISTANCE` → `t2 = 1` → gain = 7. At `dist = MAX_DISTANCE` → `t2 = 0` → gain = 1. Between, linear.

### D.3 Gain formula — boss hit path

At [GameplayCallbacks.js:345–350](src/core/GameplayCallbacks.js:345):
- Flat `BOSS_HIT_GAIN = 0.15` per hit, no distance modifier.
- Suppressed during HYPER.
- Nerfed from 0.4 → 0.15 in v4.40 to prevent HYPER triggering in the first few seconds of a boss fight with a max-DPS loadout.

### D.4 Gain — boss phase transition

Lump sum `+15` at each phase break, called from `Boss.triggerPhaseTransition()` [Boss.js:132–134](src/entities/Boss.js:132) via `G.addProximityMeter()`.

### D.5 Global entry point — `G.addProximityMeter(gain)`

Exposed at [main.js:4391–4414](src/main.js:4391). Contract:
1. **Skip if HYPER active** (`player.isHyperActive()`).
2. **Arcade JACKPOT modifier**: gain ×= `arcadeBonuses.grazeGainMult` (0.5 when that modifier is active).
3. Update `lastGrazeTime = totalTime` (for backward-compat UI timing).
4. `grazeMeter = min(100, grazeMeter + gain)`.
5. **First-time lesson**: on crossing 50% for the first time, show `lesson_dip` modal [main.js:4402](src/main.js:4402).
6. At `grazeMeter >= HYPER.METER_THRESHOLD` and `hyperCooldown <= 0`:
   - Auto-activate HYPER via `player.activateHyper()` + reset meter to 0 + `triggerScreenFlash('HYPER_ACTIVATE')`.

Internal `onEnemyKilled` path in GameplayCallbacks does **not** call `addProximityMeter` — it writes directly to `grazeMeter` via setters. Only `Boss.triggerPhaseTransition()` uses the exposed global. Both paths end up at the same HYPER auto-activation check.

### D.6 Interaction with HYPER and GODCHAIN

- During HYPER the meter is frozen (all three gain paths are gated on `!isHyperActive`).
- During GODCHAIN no explicit gate — GODCHAIN doesn't modify meter behavior (it's a VFX+score-multiplier layer on top).
- Arcade JACKPOT modifier halves all DIP gain (malus side; bonus side is drop-pity ×0.5).

---

## E. Feature Matrix

| Feature | Config key | Effect | Kill-switch |
|---|---|---|---|
| Phase 2 trigger | `BOSS.PHASE_THRESHOLDS[0]` | HP ≤ 66% → phase 2 | Edit array |
| Phase 3 trigger | `BOSS.PHASE_THRESHOLDS[1]` | HP ≤ 20% → phase 3 | Edit array |
| Phase transition duration | `BOSS.PHASE_TRANSITION_TIME` | 1.5s stationary/shaking | — |
| Boss HP | `BOSS.HP.*` | 5-variable formula | — |
| Damage divisor | `BOSS.DMG_DIVISOR` | 2.5× damage reduction | Set to 1 for raw |
| BOJ intervention | `BOSS.BOJ_INTERVENTION` | Telegraphed burst | `COOLDOWN: 999` |
| Boss drop interval | `BOSS.DROP_INTERVAL` + `DROP_TIME_INTERVAL` | 40 hits AND 12s cap | Raise both |
| DIP from kill | `PROXIMITY_KILL.METER_GAIN_MIN/MAX` | 1–7 per kill by vertical dist | Set both to 0 |
| DIP from boss hit | `PROXIMITY_KILL.BOSS_HIT_GAIN` | 0.15 per hit | Set to 0 |
| DIP from phase | `PROXIMITY_KILL.BOSS_PHASE_GAIN` | +15 on phase break | Set to 0 |
| DIP HYPER lock | `grazeMeter` gates on `isHyperActive` | — | Remove guard |

---

## F. Analytics

- `G.Debug.trackBossFightStart(bossType, marketCycle)` [main.js:2716](src/main.js:2716).
- `G.Debug.trackBossSpawn(bossType, hp, level, marketCycle)` [main.js:2719](src/main.js:2719).
- `G.Debug.trackBossPhase(bossType, newPhase)` [Boss.js:87](src/entities/Boss.js:87).
- `G.Debug.trackKillStreak(streak)` on every enemy kill [GameplayCallbacks.js:269](src/core/GameplayCallbacks.js:269).
- Event `enemy_killed` emitted with `{score, x, y, pattern, symbol, v8Fall}` [GameplayCallbacks.js:272](src/core/GameplayCallbacks.js:272).

Debug helpers (from CLAUDE.md): `dbg.v8KillBoss()` fast-ends boss fight; `dbg.report()` includes DIP meter state.

---

## G. Tuning Notes and Open Debts

1. **Dead fields in `Constants.BOSSES[]`**: each boss declares `baseHp / hpPerLevel / hpPerCycle` but the scaling path reads `Balance.BOSS.HP.*` instead. Safe to delete in a cleanup pass.
2. **Dead comment at `BalanceConfig.js:1279`**: `HYPER_KILL_EXTENSION: 0` is disabled — old mechanic. Can be removed with its consumers.
3. **Variable naming drift**: everything still says `graze` in code (`grazeMeter`, `getGrazeMeter`, `lastGrazeTime`) — functionally the system is **proximity** now. Rename tracked as cleanup.
4. **Two entry points with divergent rules**: `G.addProximityMeter()` (used by boss phase) applies the Arcade JACKPOT modifier; the inline path in `onEnemyKilled` (enemy kills) also applies it; the inline path in `onBossHit` (boss hits) does **not** apply it [GameplayCallbacks.js:345–350](src/core/GameplayCallbacks.js:345). Possibly intentional (JACKPOT should only scale "kill-driven" gain, not hit-driven), but worth confirming — flag for review.
5. **Three HP formulas with different growth**: boss HP grows `+100/level +5000/cycle`, enemy HP grows by tier normalization (see Enemy Agents GDD), minion HP grows `+2 HP mult per phase`. No single curve, historically tuned independently.
6. **Phase 3 is very short** (20% HP window). Some playtests reveal a "skip P3" effect where a bursty HYPER+GODCHAIN combo deletes the boss between P2 and P3 without seeing the P3 pattern. Not ruled as a bug — the design intent is "reward for the player if they've built up the power" — but worth tracking.

---

## H. Cross-links

- [V8 Scroller GDD](v8-scroller.md) — `BOSS_AT_S` timing, per-level boss override via LevelScript.
- [Arcade Rogue Protocol GDD](arcade-rogue-protocol.md) — MiniBoss system, Arcade boss cycling, JACKPOT modifier.
- [Weapon Evolution + Elementals + GODCHAIN GDD](weapon-elementals-godchain.md) — Evolution Core flow post-boss, HYPER trigger off full DIP meter.
- [Drop System + APC GDD](drop-system-apc.md) — `tryBossDrop`, boss drop time-capping.
- [Enemy Agents GDD](enemy-agents.md) — minion rendering (boss phase 3).
