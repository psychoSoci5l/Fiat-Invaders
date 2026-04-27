# Difficulty Curve — FIAT vs CRYPTO

**Version**: 1.0 (v7.13.1)
**Last updated**: 2026-04-27

---

## Overview

The difficulty curve is designed around a **gradual intensity ramp** across three campaign levels, with **adaptive rank-based scaling** that responds to player performance in real time. The curve ensures accessibility for new players while providing sustained challenge for experienced ones.

---

## Campaign Structure (V8)

The campaign consists of 3 levels, each with identical wave structure but escalating difficulty parameters.

| Level | Boss | Theme | Difficulty Multiplier |
|-------|------|-------|----------------------|
| 1 — FED | Federal Reserve | Introduction | 1.0x (baseline) |
| 2 — BCE | European Central Bank | Mid-game escalation | ~1.5x |
| 3 — BOJ | Bank of Japan | Final challenge | ~2.0x+ |

Each level contains:
- **81 bursts** (enemy waves) over ~170 seconds
- **Boss encounter** at ~170s
- **Intermission** between levels (defeat → next level transition)
- Estimated **732 enemies** per full run, ~667 killed (3% escape rate)

---

## Within-Level Wave Progression

### Intensity Phases

Each level's wave sequence follows 4 phases based on cumulative burst count:

| Phase | Bursts | Intensity | Description |
|-------|--------|-----------|-------------|
| **Setup** | 0-24 | Low | Simple formations, single enemy types, slow fire |
| **Build** | 25-48 | Medium | Mixed enemy types, tighter formations, faster fire |
| **Challenge** | 49-72 | High | Dense patterns, aimed fire, mini-bosses appear |
| **Panic** | 73-81 | Very High | Max fire rate, complex patterns, final push before boss |

### Salvo System Scaling (per cycle)

| Parameter | Cycle 1 | Cycle 2 | Cycle 3 |
|-----------|---------|---------|---------|
| Arrival gap | 0.55s | 0.40s | 0.28s |
| Corridor width | 80px | 65px | 50px |
| Max rows | 2 | 3 | 4 |
| Aim factor | 0 (none) | 0.4 (partial) | 0.7 (high) |
| Skip chance | 15% | 15% | 15% |

The salvo system controls enemy formation density. By cycle 3, enemies arrive **2x faster** in **half the corridor width** with **double the rows** and **highly aimed fire**.

### Enemy Fire Rate Ramp

- **Global fire rate multiplier**: 0.85 (enemies fire 15% slower baseline)
- **Panic phase**: fire rate x1.4 (when 85% of enemies remain in a burst)
- **Rank system**: adjusts fire rate from **0.8x** (EASY) to **1.2x** (BRUTAL)

### Enemy Bullet Pattern Progression

| Pattern | Cycles Available | Difficulty |
|---------|-----------------|------------|
| ARC (7 bullets, 120°) | All | Low — wide spread, easy to dodge |
| WALL (8 bullets, 2 gaps) | Cycle 2+ | Medium — requires movement |
| AIMED (5 bullets, 30°) | Cycle 2+ | Medium — tracks player position |
| RAIN (12 bullets, 3 lanes) | Cycle 3+ | High — dense coverage |

---

## Enemy Scaling

### HP and Damage Scaling by Cycle

| Stat | Cycle 1 | Cycle 2 | Cycle 3 |
|------|---------|---------|---------|
| Enemy HP | 4-8 | 8-14 | 14-22 |
| Enemy Damage | 8-10 | 12-16 | 16-22 |
| Enemy Speed | 60-140 | 80-180 | 100-220 |

### Kamikaze Enemies

- Introduced from Cycle 2 onward
- Speed: **400 px/s** (fixed)
- Telegraph lead: **0.12s**

### Mini-Boss Scaling

| Cycle | HP Formula (non-boss-type) |
|-------|---------------------------|
| Cycle 1 | 400 + (1 * 100) + (1 * 150) = **650** |
| Cycle 2 | 400 + (2 * 100) + (2 * 150) = **900** |
| Cycle 3 | 400 + (3 * 100) + (3 * 150) = **1150** |

- Max per wave: **2**
- Cooldown: **15s** between spawns
- Kill threshold (fallback): **15** enemies

---

## Boss Difficulty

Each boss has **3 phases** (P1, P2, P3) with escalating attack patterns.

### Federal Reserve (Level 1 — Baseline)

| Phase | HP | Key Attacks | Difficulty |
|-------|-----|-------------|------------|
| P1 | Low | Ring (12 bullets), Sine (10), Burst (4) | Introductory |
| P2 | Mid | Rotation speed x1.87, Homing (3 missiles) | Moderate |
| P3 | High | Laser (25), Curtain (16), Homing (4) | Challenging |

Movement: Mostly static in P1, oscillating in P2-P3.

### BCE (Level 2 — x1.5 HP)

| Phase | HP | Key Attacks | Difficulty |
|-------|-----|-------------|------------|
| P1 | Mid | Curtain (11), Barrier (20), Flower (6x2) | Moderate |
| P2 | High | Spiral (5 arms) | Hard |
| P3 | Very High | Dual barrier (18+16) | Very Hard |

Movement: More aggressive oscillation. Flower pattern forces precise positioning.

### BOJ (Level 3 — x2.0+ HP)

| Phase | HP | Key Attacks | Difficulty |
|-------|-----|-------------|------------|
| P1 | High | Sine (12), Zen (2x1), Ring (10) | Hard |
| P2 | Very High | Wipe (25), Burst (5 at 260px/s) | Very Hard |
| P3 | Extreme | Zen (6x3), Wipe (22), Wave (7) | Extreme |

Special: **BOJ Intervention** — telegraph attack (0.4s warning, 5 bullets at 240px/s, 0.4 rad spread) that triggers randomly during P2. Cooldown: 2.5s, trigger chance: 1% per frame.

---

## Adaptive Difficulty (Rank System)

The **Rank System** (`src/systems/RankSystem.js`) continuously adjusts difficulty based on player performance.

### Rank Scale

| Rank | Label | Fire Rate Mult | Enemy Count Mult |
|------|-------|----------------|------------------|
| < -0.5 | EASY | 0.80x | 0.85x |
| -0.5 to -0.15 | GENTLE | — | — |
| -0.15 to 0.15 | NORMAL | 1.00x (baseline) | 1.00x |
| 0.15 to 0.5 | HARD | — | — |
| > 0.5 | BRUTAL | 1.20x | 1.15x |

### Rank Signals

| Event | Effect | Description |
|-------|--------|-------------|
| Kill rate above 1/sec | +0.5/sec | Rewards efficient play |
| Graze rate above 0.5/sec | +0.3/sec | Rewards risky play |
| Death | -0.15 (instant) | Punishes mistakes heavily |
| Drift | -0.05/sec | Gradual regression to neutral |

Rank converges at **0.5/sec** toward target. Window: **30s** rolling.

---

## Drop System Scaling

### Weapon Drops

- **Cooldown**: 8s between weapon drops
- **Pity timer**: 45 kills (guaranteed weapon)
- **Pity per cycle**: 30 base, -2 per cycle (min 15)
- **Guaranteed special wave**: Wave 4+
- **Early drop**: Level 1, prefilled at 32 kills

### Drop Rates

| Type | Chance |
|------|--------|
| Strong drop | 3% |
| Medium drop | 2.5% |
| Weak drop | 1% |
| Weapon ratio | 50% |

### Adaptive Drop Balancer

Two systems adjust drops to keep the game fair:

**STRUGGLE (boosts weak players):**
- Time without drop > 40s → boosted chance
- Forced drop at 55s
- Chance boost: **3.0x**
- Category bias: SPECIAL (55%), PERK (35%), UTILITY (10%)

**DOMINATION (suppresses strong players):**
- Kill rate > 1.5/sec → 75% drop rate reduction
- Pity threshold doubled
- HYPER and GODCHAIN modes suppress drops further

---

## Graze / HYPER Economy

The risk-reward loop of grazing enemy bullets is a core skill gate:

| Mechanic | Requirement | Reward |
|----------|------------|--------|
| Graze (normal) | 25px from core | 25 points, 12 meter |
| Graze (close) | 22px from core | 100 points (4x), 25 meter |
| HYPER activation | 100 meter | 10s of 3.0x score, slow-mo |
| HYPER cooldown | 8s | Cannot re-activate |
| HYPER penalty | n/a | 1.5x hitbox, instant death on hit |

Graze meter decays at **4/sec** after 1s delay. Decay accelerates per cycle (x1.5 in cycle 3).

---

## Difficulty Curve Summary

```
Difficulty
   ^
   |                                    ★ BOJ
   |                                ★  Boss
   |                           ★
   |                       ★  BCE Boss
   |                    ★
   |                 ★  FED Boss
   |           ★★★★
   |      ★★★★
   |  ★★★★
   +------------------------------------------------→ Time
   0s     60s    120s   180s   240s   300s   360s   420s+
   |-- FED Level --||--- BCE Level ---||-- BOJ Level --|
   
   ★ = Boss encounter
   ★★★★ = Wave intensity (height = density)
```

### Key Design Principles

1. **Early levels teach, late levels test** — FED has simpler patterns and no aimed fire. BOJ uses every tool.
2. **Adaptive rank protects extremes** — Struggling players get easier enemies; dominant players face tougher ones.
3. **Drop pity prevents softlocks** — No player can fall below a minimum power threshold.
4. **Graze risk-reward is the skill ceiling** — Master players can accelerate score by grazing, but the higher rank makes it harder.
5. **Bosses escalate in complexity** — FED is predictable, BCE adds patterns, BOJ adds random interventions.

---

## Appendix: Player Power Curve

### Ship Stats

| Ship | Speed | HP | Fire Rate | Base Damage | Graze Radius |
|------|-------|----|-----------|-------------|-------------|
| BTC | 420 | 3 | 0.22s | 14 | Medium |
| ETH | 320 | 4 | 0.33s | 28 | Medium |
| SOL | 560 | 2 | 0.17s | 10 | Small |

### Weapon Evolution

| Level | Bullets | Cooldown | Damage | Notes |
|-------|---------|----------|--------|-------|
| 1 — Single | 1 | 0.70x | 1.20x | Starting |
| 2 — Dual | 2 | 0.75x | 1.30x | First upgrade |
| 3 — Triple MAX | 3 | 0.65x | 1.70x | Max normal |
| HYPER+ | 3 | 0.45x | 2.00x | During HYPER |
| HYPER++ | 3 | 0.30x | 2.25x | During HYPER with level 3 |

Player power grows through weapon upgrades, perk elements (Fire/Laser/Electric), and special pickups (Homing/Pierce/Missile). The drop system's adaptive balancer ensures power stays in a **0.40-0.60 range** relative to difficulty.
