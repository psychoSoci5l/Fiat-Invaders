# ADR-0015: Arcade Miniboss Continuous-Action Rework

## Status

Accepted

## Date

2026-05-15

## Last Verified

2026-05-15

## Decision Makers

psychoSocial (design direction), opencode (implementation)

## Summary

The Arcade miniboss system currently interrupts gameplay by clearing the battlefield and suspending the wave on every miniboss spawn. This ADR changes minibosses from **replacement encounters** (wave stops, miniboss fights alone) to **overlay threats** (wave continues, miniboss fights alongside regular enemies). Additionally, all legacy minibosses share identical movement and attack patterns — this ADR introduces per-bloc movement personalities and signature attacks. Finally, perk drops are enabled during miniboss fights via a hit-triggered drop path.

## Engine Compatibility

| Field | Value |
|-------|-------|
| **Engine** | Vanilla JavaScript (Canvas 2D, no framework) |
| **Domain** | Core / Game Mode — Arcade Miniboss System |
| **Knowledge Risk** | LOW — system is already shipped; this ADR modifies existing behavior |
| **References Consulted** | `src/managers/MiniBossManager.js`, `src/managers/WaveManager.js`, `src/core/GameplayCallbacks.js`, `src/systems/DropSystem.js`, `src/config/BalanceConfig.js` |
| **Post-Cutoff APIs Used** | None |
| **Verification Required** | Playtest miniboss fight with 18 concurrent enemies at 60fps; verify no regression on Boss-instance minibosses |

## ADR Dependencies

| Field | Value |
|-------|-------|
| **Depends On** | ADR-0011 (Arcade Rogue Protocol — miniboss trigger, modifier picks), ADR-0008 (Drop System — perk drop infrastructure), ADR-0009 (Boss System — Boss-instance miniboss path) |
| **Enables** | Per-bloc miniboss differentiation, mid-fight perk drops, continuous Arcade action loop |
| **Blocks** | None — backward-compatible with existing Boss-instance miniboss path |

## Context

### Problem Statement

Three critical pain points in Arcade mode:

1. **Flow interruption** — Every miniboss spawn calls `clearBattlefield()` and `WaveManager.suspendStreaming()`, wiping all regular enemies and bullets. This creates a hard stop in the combo-driven action loop every ~10 kills, breaking the momentum that defines Arcade mode.

2. **Identical miniboss patterns** — All legacy minibosses (currency-triggered, non-Boss-instance) share the same sine-wave movement (`x = center + sin(t * 1.5) * 150`) and the same 3-phase attack (aimed → spread → radial). No differentiation between `$` and `¥` minibosses.

3. **No perk drops during fights** — The drop system only fires on enemy kills. During miniboss fights (wave suspended, no enemies dying), players get zero perks mid-fight — only modifier cards after defeat.

### Current State

Miniboss spawn flow (`MiniBossManager.spawn()`):
```
1. applyHitStop('BOSS_DEFEAT_SLOWMO')
2. waveMgr.suspendStreaming(savedEnemies)  ← suspends wave
3. G.clearBattlefield()                     ← clears ALL enemies + bullets
4. setEnemies([])                           ← empties enemy array
5. spawn miniboss
```

Miniboss defeat flow (`MiniBossManager.checkHit()`):
```
1. waveMgr.resumeStreaming()                ← restores wave state
2. setEnemies(restored)                     ← restores saved enemies
3. ModifierChoiceScreen.show(2, callback)   ← 2-card pick
4. waveMgr.miniBossActive = false           ← unblocks WaveManager
```

All legacy minibosses use identical movement and attacks in `MiniBossManager.update()` and `_fireBullets()`.

### Constraints

- Boss-instance minibosses (`miniBoss instanceof G.Boss`) must continue working with their existing 3-phase system
- V8 campaign is unaffected (minibosses are Arcade-only)
- Performance budget: 60fps with miniboss + 18 regular enemies + bullets
- Modifier picks post-defeat must remain unchanged
- Combo system must not be disrupted by the new flow

### Requirements

- Miniboss spawns without clearing the battlefield (regular enemies persist)
- At least 4 distinct miniboss movement patterns (one per currency bloc)
- At least 2 signature attacks per miniboss type (beyond generic 3-phase)
- Perk drops fire on miniboss hit during fights
- All values data-driven in BalanceConfig
- Boss-instance minibosses unchanged

## Decision

### Decision 1: Remove clearBattlefield from Miniboss Spawn

The miniboss spawn flow changes from:
```
clearBattlefield → suspend wave → spawn miniboss → fight → resume wave
```
to:
```
spawn miniboss (wave continues) → fight alongside wave → defeat → modifier pick
```

**Specific changes:**
- Remove `G.clearBattlefield()` call from `MiniBossManager.spawn()`
- Remove `waveMgr.suspendStreaming()` and `waveMgr.resumeStreaming()` calls
- Remove `waveMgr.miniBossActive` gating — the miniboss is just another entity on the field
- Keep enemy bullet cleanup at spawn time (visual clarity — clear in-flight bullets only)
- Guard: `if (miniBoss instanceof G.Boss)` → existing behavior preserved for Boss-instance minibosses

**WaveManager impact:**
- Line 118: `if (!bossActive && !this.miniBossActive && enemiesCount === 0 ...)` — the `miniBossActive` check is removed since miniboss no longer blocks wave progression
- `suspendStreaming()` / `resumeStreaming()` remain available for future use but are no longer called by the miniboss path

### Decision 2: Per-Bloc Movement Patterns

Four currency blocs, each with a unique movement personality:

| Bloc | Currencies | Movement Type | Feel |
|------|-----------|---------------|------|
| USA | `$`, `C$`, `Ⓒ` | PATROL — horizontal oscillation with occasional pauses | Steady, imposing |
| EU | `€`, `£`, `₣`, `₺` | WEAVE — figure-8 / lemniscate pattern | Slippery, covers area |
| ASIA | `¥`, `₩`, `₹`, `元` | DASH — quick lateral bursts with hover stops | Aggressive, unpredictable |
| EMERGING | `₽`, `₿` | ORBIT — circular path around fixed point | Methodical, circling |

Movement config is data-driven in `BalanceConfig.js` under `ARCADE.MINI_BOSS_PATTERNS`.

### Decision 3: Per-Bloc Signature Attacks

Each bloc replaces the generic 3-phase (aimed/spread/radial) with bloc-specific attacks:

| Bloc | Phase 0 | Phase 1 | Phase 2 (Signature) |
|------|---------|---------|---------------------|
| USA | Rapid aimed (2 bullets) | Cone (5 bullets) | Sweep arc (12 bullets over 1.5s) |
| EU | Alternating left/right | Horizontal wall (6 bullets) | Orbit delayed (4 orbiting bullets) |
| ASIA | Fast aimed (240 px/s) | Multi-speed (3 speeds) | Temporary homing (2 bullets) |
| EMERGING | Random burst (3 bullets) | Shotgun (8 bullets, wide spread) | Expanding ring (2 rings × 10 bullets) |

### Decision 4: Perk Drops on Miniboss Hit

A new drop path `DropSystem.tryMinibossDrop()` fires on each miniboss hit:
- 8% chance per hit (configurable)
- Pity at 12 hits without a drop
- Category weights: PERK 50%, SPECIAL 30%, UTILITY 20%
- Max 2 drops per miniboss fight
- Only active in Arcade mode
- Resets on miniboss spawn and defeat

### Decision 5: Balance Tuning for Continuous-Action Flow

With regular enemies persisting during miniboss fights, values are recalibrated:

| Parameter | Old Value | New Value | Rationale |
|-----------|-----------|-----------|-----------|
| HP_MULT | 0.50 | 0.40 | Shorter fights, less screen competition |
| COOLDOWN | 10.0s | 12.0s | Fewer encounters, more breathing room |
| MAX_PER_WAVE | 3 | 2 | Quality over quantity |
| THRESHOLD_MULT | 0.65 | 0.70 | Slightly harder to trigger |
| Base fire rate | 0.8s | 1.0s | Slower to account for extra enemy bullets |

Per-bloc HP and fire rate variance adds ±5-10% on top of base values.

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Arcade Game Loop                      │
│                                                          │
│  WaveManager ────→ spawns regular enemies ────┐          │
│       │                                        │          │
│       │ (no longer suspended)                  │          │
│       ▼                                        ▼          │
│  ┌─────────────┐    ┌──────────────────────────────┐     │
│  │  Regular    │    │  MiniBossManager              │     │
│  │  Enemies    │    │                               │     │
│  │  (persist)  │    │  spawn() ── no clearBattlefield│     │
│  │             │    │  update() ── bloc movement     │     │
│  │  + bullets  │    │  _fireBullets() ── bloc attacks│     │
│  │  + drops    │    │  checkHit() ── drop roll       │     │
│  └─────────────┘    └──────────────────────────────┘     │
│       │                                        │          │
│       ▼                                        ▼          │
│  DropSystem.tryEnemyDrop()    DropSystem.tryMinibossDrop()│
│                                                          │
│  ModifierChoiceScreen.show() ← fires on miniboss defeat  │
└─────────────────────────────────────────────────────────┘
```

### Key Interfaces

```javascript
// MiniBossManager.spawn() — no longer clears battlefield
function spawn(symbol, triggerColor) {
    // OLD: G.clearBattlefield(); waveMgr.suspendStreaming();
    // NEW: only clear in-flight bullets for visual clarity
    clearEnemyBulletsOnly();
    // spawn miniboss...
}

// MiniBossManager.update() — bloc-specific movement
function update(dt) {
    const bloc = resolveBloc(miniBoss.symbol);
    const pattern = Balance.ARCADE.MINI_BOSS_PATTERNS[bloc];
    switch (pattern.type) {
        case 'PATROL': updatePatrol(miniBoss, dt, pattern); break;
        case 'WEAVE':  updateWeave(miniBoss, dt, pattern);  break;
        case 'DASH':   updateDash(miniBoss, dt, pattern);   break;
        case 'ORBIT':  updateOrbit(miniBoss, dt, pattern);  break;
    }
}

// DropSystem.tryMinibossDrop() — new method
function tryMinibossDrop(x, y, hitCount) {
    // roll against DROP_CHANCE_PER_HIT
    // pity at PITY_HITS
    // select category with miniboss-specific weights
    // respect MAX_DROPS_PER_FIGHT
    // return drop type or null
}
```

### Implementation Guidelines

1. S12.1 MUST be implemented first — all other stories depend on the continuous-action flow
2. Boss-instance minibosses (`miniBoss instanceof G.Boss`) must NOT be modified — guard all changes
3. All movement and attack values must be data-driven in BalanceConfig
4. Bullet budget: miniboss attacks must not exceed the global bullet cap (150)
5. Perk drop rate should start conservative — tune after playtest

## Alternatives Considered

### Alternative 1: Keep clearBattlefield, add "miniboss arena" overlay

- **Description**: Instead of removing clearBattlefield, spawn minibosses in a separate visual layer (semi-transparent overlay) that shows the miniboss fight while the wave is "frozen" in the background
- **Pros**: No risk of screen overcrowding; preserves existing flow
- **Cons**: Does not solve the fundamental "action interruption" problem; adds rendering complexity; feels like a pause
- **Estimated Effort**: Medium (new rendering layer, state management)
- **Rejection Reason**: Does not address the core player complaint — the action still stops

### Alternative 2: Minibosses as elite enemies (no separate system)

- **Description**: Convert minibosses into elite variants of regular enemies (like ARMORED/EVADER/REFLECTOR) with boosted stats and unique behavior
- **Pros**: Unified enemy system; no separate MiniBossManager; simpler codebase
- **Cons**: Loses the "climax encounter" feel of minibosses; modifier pick flow would need redesign; boss-instance minibosses would need special handling
- **Estimated Effort**: High (refactor MiniBossManager, GameplayCallbacks, modifier flow)
- **Rejection Reason**: Too invasive; breaks existing modifier pick and boss-instance miniboss paths

### Alternative 3: Reduce miniboss frequency instead of changing flow

- **Description**: Keep the current clearBattlefield flow but increase cooldown and reduce max-per-wave so minibosses interrupt less often
- **Pros**: Minimal code changes; reduces interruption frequency
- **Cons**: Does not solve the fundamental problem — when a miniboss DOES spawn, the action still stops completely
- **Estimated Effort**: Low (config changes only)
- **Rejection Reason**: Treats the symptom, not the cause

## Consequences

### Positive

- Continuous action loop — no more hard stops every ~10 kills
- Each miniboss feels unique — players can identify bloc by movement and attacks
- Mid-fight perk drops create meaningful micro-decisions
- Combo system benefits from uninterrupted kill chains
- Modifier picks remain post-defeat (no change to existing flow)

### Negative

- More entities on screen simultaneously — potential performance impact
- Miniboss fights are more chaotic — player must track miniboss + regular enemies
- Balance tuning is more complex — HP, fire rate, and drop rates must account for concurrent threats
- `miniBossActive` gating removal means WaveManager may trigger boss spawn during miniboss fight (needs guard)

### Neutral

- `suspendStreaming()` / `resumeStreaming()` become dead code (kept for future use)
- Boss-instance minibosses continue using the old flow (dual-path system)
- Currency-to-bloc mapping adds a new config layer

## Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| Too many enemies on screen (miniboss + 18 regular) | Medium | High | Cap concurrent enemies during miniboss; reduce wave spawn rate while miniboss active |
| Performance hit from extra entities + bullets | Low | Medium | Profile at 60fps with full load; optimize if >1ms/frame |
| Boss spawn triggers during miniboss fight | Medium | High | Add guard in WaveManager: `if (miniBoss active) → no SPAWN_BOSS` |
| Perk drop rate too high during miniboss | Medium | Low | Tunable via config; start conservative (8% per hit) |
| Breaking Boss-instance miniboss path | Low | High | Guard all changes with `if (!(miniBoss instanceof G.Boss))` |

## Performance Implications

| Metric | Before | Expected After | Budget |
|--------|--------|---------------|--------|
| CPU (frame time) | ~2.5ms (miniboss solo) | ~4.0ms (miniboss + 18 enemies) | <8ms |
| Memory | ~1.2MB | ~1.4MB (+ saved enemy state removed) | <5MB |
| Bullet count | ~40 (miniboss only) | ~80 (miniboss + regular enemies) | <150 (global cap) |
| Load Time | No change | No change | N/A |

## Migration Plan

1. **ADR-0015 accepted** → create ADR file, update epic references
2. **S12.1** — Remove clearBattlefield from miniboss spawn (breaking change — requires playtest)
3. **S12.6** — Update balance values in BalanceConfig (config-only, no code risk)
4. **Playtest** — Verify continuous-action flow is fun and performant
5. **S12.2 + S12.3** — Add per-bloc movement and attacks (additive on top of S12.1)
6. **S12.4** — Add perk drops during fights (additive)
7. **S12.5** — Add visual differentiation (additive)
8. **S12.7** — Write unit tests

**Rollback plan**: Revert `MiniBossManager.spawn()` and `checkHit()` to call `clearBattlefield()` and `suspendStreaming()` as before. BalanceConfig changes are easily reverted.

## Validation Criteria

- [ ] Miniboss spawn does NOT clear regular enemies (verified via debug inspection)
- [ ] Wave continues spawning during miniboss fight (verified via wave counter)
- [ ] At least 4 distinct miniboss movement patterns (verified via visual observation)
- [ ] At least 2 signature attacks per bloc (verified via debug inspection)
- [ ] Perk drops fire on miniboss hit (verified via drop counter)
- [ ] Boss-instance minibosses unchanged (verified via existing test suite)
- [ ] 60fps with miniboss + 18 enemies + bullets (verified via profiler)
- [ ] No regression in V8 campaign (verified via smoke test)

## GDD Requirements Addressed

| GDD Document | System | Requirement | How This ADR Satisfies It |
|-------------|--------|-------------|--------------------------|
| `design/gdd/arcade-rogue-protocol.md` | Mini-Boss System | Continuous action during miniboss fights (playtest feedback) | Remove clearBattlefield; miniboss spawns as overlay threat |
| `design/gdd/arcade-rogue-protocol.md` | Mini-Boss System | Per-miniboss differentiation (playtest feedback) | Per-bloc movement patterns and signature attacks |
| `design/gdd/arcade-rogue-protocol.md` | Drop System | Perk drops during miniboss fights (playtest feedback) | New tryMinibossDrop() path on miniboss hit |
| `design/gdd/arcade-rogue-protocol.md` | Mini-Boss System | Balance tuning for new flow | Recalibrated HP, fire rate, cooldown, max-per-wave |

## Related

- ADR-0011: Arcade Rogue Protocol — original miniboss system design
- ADR-0009: Boss System + Proximity Kill — Boss-instance miniboss path (unchanged)
- ADR-0008: Drop System + APC — perk drop infrastructure (extended by this ADR)
- ADR-0012: Enemy Elites + Behaviors — elite variants (separate from miniboss system)
