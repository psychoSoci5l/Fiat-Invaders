# ADR-0010: Weapon Evolution + Elemental Perks + GODCHAIN

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
| **References Consulted** | `src/config/BalanceConfig.js`, `src/entities/Player.js`, `src/systems/CollisionSystem.js`, `src/managers/PerkManager.js`, `src/utils/Upgrades.js`, `src/core/GameplayCallbacks.js`, `src/entities/Bullet.js`, `src/systems/BulletSystem.js`, `src/systems/ParticleSystem.js`, `src/systems/DropSystem.js`, `src/main.js` |
| **Post-Cutoff APIs Used** | None |
| **Verification Required** | None — pattern is already shipped and active |

## ADR Dependencies

| Field | Value |
|-------|-------|
| **Depends On** | ADR-0001 (GameStateMachine — PLAY state gates weapon updates), ADR-0002 (Canvas 2D Rendering — additive glow pass, offscreen canvas, GODCHAIN vignette), ADR-0003 (EventBus — `weapon:evolved`, `perk:selected` events), ADR-0004 (Spatial Grid Collision — elemental on-kill effects, contagion cascade), ADR-0008 (Drop System — PERK/SPECIAL/UTILITY drops, GODCHAIN suppression), ADR-0009 (Boss System — Evolution Core drops, HYPER from DIP meter) |
| **Enables** | Weapon tier progression, elemental combat effects, GODCHAIN fusion, HYPERGOD multiplicative stacking |
| **Blocks** | None |

## Context

### Problem Statement

The Combat Progression Core is the player's offensive toolbox — three tightly-coupled subsystems that all read/write state on the Player entity and RunState. Specific requirements:

1. **Weapon Evolution**: 3-tier permanent weapon level (LV1 Single → LV2 Dual → LV3 Triple MAX), gated by Evolution Core item from boss kills. Each level changes bullet count, cooldown, damage multiplier, spread angle, and cannon geometry. HYPER temporarily grants +2 effective levels (LV4/LV5) with improved stats.

2. **Elemental Perks**: Three permanent-until-death perks collected in **fixed order** (Fire → Laser → Electric) via PERK diamond pickups. Each mutates bullet properties and applies deterministic on-kill effects: Fire splash (55px, 55% damage), Laser beam (75px bolt, +37.5% player speed, +1 pierce), Electric chain (100px, 44% damage, 2 targets).

3. **Elemental Contagion**: Depth-limited cascade (max depth [1,2,2] by perkLevel) with 0.38 damage decay per step. Cascade kills propagate the killing element's on-kill effect to the nearest neighbor within range.

4. **GODCHAIN Fusion**: 10-second fused-state buff triggered when all 3 elemental perks are held. +5% movement speed, visual overhaul (pulsing red-orange aura, fire trail, vapor trail override, screen vignette, prismatic cockpit), no direct damage bonus — lethality comes from compounded elemental on-kill effects. 10s cooldown post-expiry.

5. **HYPER System**: Manual activation, 10s duration, +2 effective weapon level, 3× score multiplier, 1.5× hitbox penalty, 0.82 time scale. Instant death on hit (bypasses lives). 8s cooldown post-expiry.

6. **HYPERGOD**: When HYPER and GODCHAIN overlap simultaneously — 5× score multiplier, capped at 12× total combined multiplier.

7. **Specials** (HOMING/PIERCE/MISSILE): 10s bullet-type replacements, lost on death. Drop weights 25/25/20.

8. **Utilities** (SHIELD/SPEED): 5s invulnerability / 8s +40% speed, lost on death.

## Decisions

### Decision 1: Weapon Level as Integer Gate with BalanceConfig Lookup

Weapon evolution is a **linear integer progression** (1-5, with 4-5 being HYPER-only) where each level is a lookup into `Balance.WEAPON_EVOLUTION.LEVELS[]`:

```javascript
LEVELS: {
    1: { name: 'Single',     bullets: 1, cooldownMult: 0.70, damageMult: 1.20, spreadDeg: 0 },
    2: { name: 'Dual',       bullets: 2, cooldownMult: 0.75, damageMult: 1.30, spreadDeg: 0 },
    3: { name: 'Triple MAX', bullets: 3, cooldownMult: 0.65, damageMult: 1.70, spreadDeg: 6 },
    4: { name: 'HYPER+',     bullets: 3, cooldownMult: 0.45, damageMult: 2.00, spreadDeg: 10 },
    5: { name: 'HYPER++',    bullets: 3, cooldownMult: 0.30, damageMult: 2.25, spreadDeg: 12 }
}
```

**Key mechanics:**
- `weaponLevel` (1-3) is the permanent level, stored on the Player entity, surviving death
- `effectiveLevel = min(5, weaponLevel + (hyperActive ? HYPER_LEVEL_BOOST(2) : 0))` computed per-frame
- `fireEvolution()` uses `weaponLevel` for muzzle-point geometry, `effectiveLevel` for stat lookup
- HYPER DPS is compensated entirely through the LEVELS table cooldown/damage multipliers — no separate HYPER damage branch
- Level-up from boss Evolution Core: `GameplayCallbacks.onBossKilled()` spawns the core with 2.8s delay + 1.2s fly-in; `Player.collectEvolution()` increments `weaponLevel`, triggers cinematic deploy (0.35s slide-out, hitstop, screen flash, particle burst, 0.5s invulnerability)
- Overflow-safe: `collectEvolution()` returns early if already at `MAX_WEAPON_LEVEL(3)`

**Rationale**: A flat lookup table is simpler and more auditable than formulas. The HYPER boost works by index shift, not by modifying the weaponLevel — no state corruption risk. Per-level geometry computed by `_computeGeomForLevel()` reads cannon offsets shared with muzzle flash and weapon-deploy VFX, ensuring visual consistency.

### Decision 2: Fixed Perk Order via Upgrades Array + PerkManager Gate

Elemental perks are acquired in **fixed sequence Fire → Laser → Electric**, enforced by two layers:

1. **Data layer** (`Upgrades.js`): Each upgrade has an `order` field (1/2/3) and an `apply()` function that sets the corresponding `runState.has{Element}Perk = true` and bumps `runState.perkLevel`.

2. **Gate layer** (`PerkManager.getNextPerk()`): Returns the perk whose `order === perkLevel + 1`. If `perkLevel >= MAX_ELEMENTS(3)`, returns null — signalling that the pickup should re-trigger GODCHAIN instead.

**Key mechanics:**
- No stacking: each perk records `perkStacks[id] = 1`, repeated collections of the same perk are impossible by design
- Pity: `KILLS_FOR_PERK: 100` — after 100 kills without a PERK drop, DropSystem forces one
- Death reset: `PerkManager.reset()` clears `recentPerks`; `RunState` hard-resets `perkLevel` and all three `has{Element}Perk` flags
- Perk application is immediate (no modal, no choice) — the pickup IS the action

**Rationale**: Fixed order removes choice paralysis and ensures predictable power curves. Fire first gives the player a wide-area effect for early formation clumps. Laser second adds speed and pierce for mid-game threat density. Electric last is the capstone that completes the GODCHAIN trigger condition. Since perks are permanent-until-death, the design risk of "wrong choice" is eliminated entirely.

### Decision 3: Elemental On-Kill Effects as CollisionSystem Hooks

All three elemental effects are triggered from a single function `CollisionSystem._applyElementalOnKill()`, called deterministically on every enemy kill when the player holds the corresponding perk.

**Fire splash** (on `bullet._elemFire`):
- Finds all enemies within `SPLASH_RADIUS(55px)` of the killed enemy
- Deals `SPLASH_DAMAGE(0.55) × kill damage` to each
- VFX: `ParticleSystem.createNapalmImpact()` — ring + flame tongues + embers

**Laser beam + pierce** (on `bullet._elemLaser`):
- Player gets `SPEED_MULT(1.375)` — +37.5% movement speed (not bullet speed)
- Bullets gain `PIERCE_BONUS(1)` — 1 passive pierce HP even without the PIERCE special
- Per-bullet beam VFX: `Bullet._drawLaserBeam()` + `_drawLaserBeamGlow()` — 3-layer rendering (2.5px core / 5px mid / 10px glow) at `BEAM.LENGTH(75px)`
- Collision: `BulletSystem.lineSegmentVsCircle()` for beam-vs-enemy hit detection
- Special + Laser mutual exclusion: active HOMING/PIERCE/MISSILE suppresses beam VFX for the special's duration

**Electric chain** (on `bullet._elemElectric`):
- Finds up to `CHAIN_TARGETS(2)` nearest living enemies within `CHAIN_RADIUS(100px)`
- Deals `CHAIN_DAMAGE(0.44) × kill damage` to each
- VFX: `ParticleSystem.createElectricChain()` (5-step zigzag) + `createLightningBolt()`
- **Deterministic on every kill** — no probability roll

**Rationale**: A single hook point keeps elemental logic isolated from the main collision path. Effects are deterministic (no RNG) so the player's damage output is predictable. The three effects are spatially distinct: splash (area), beam (line), chain (nearest-neighbor) — covering different tactical situations without overlap.

### Decision 4: Elemental Contagion as Depth-Limited Cascade

Contagion is a **supervised cascade** — not an unbounded chain reaction. Config `ELEMENTAL.CONTAGION`:

- `MAX_DEPTH: [1, 2, 2]` — depth-1 with only Fire, depth-2 once Laser acquired, stays at 2 with Electric
- `DAMAGE_DECAY: 0.38` — at depth-2, propagated damage is ~14% of original
- Cascade kills propagate the killing element's on-kill effect (Fire splash / Electric chain) to the nearest neighbor within range
- VFX: `contagion_line` (colored line between dead and cascaded enemy) + `ripple` (expanding ring)

**Key rules:**
- A Fire-element kill always cascades Fire splash damage regardless of which elements the player holds
- Contagion does NOT create infinite loops — depth limit ensures termination
- Each cascade step is a full "kill" for Arcade combo purposes (combo timer resets on each cascaded death)

**Rationale**: Depth-limited cascade prevents infinite chain reactions that could clear a full screen from one kill (game-breaking in bullet-hell scoring). The aggressive damage decay (0.38) ensures cascade kills feel like "bonus" damage rather than the primary kill mechanism. The depth of [1,2,2] ties cascade power to perk progression — GODCHAIN (all 3 perks) doesn't deepen the cascade further, incentivising HYPERGOD activation for the score multiplier instead.

### Decision 5: GODCHAIN as Compound State Without Direct Damage Bonus

GODCHAIN is a **visual + compound lethality** state, not a raw damage steroid. When `perkLevel >= 3` and a PERK pickup fires `PerkManager.applyNext()`, `player.activateGodchain()` schedules `_godchainPending = true`, which the game loop resolves to `godchainTimer = DURATION(10s)`.

**Effects during GODCHAIN:**
- **Movement**: `speedMult *= 1.05` (+5%, applied in Player.update())
- **Bullet tagging**: every bullet gets `b._isGodchain = true` — VFX only (fire-tongue overlay)
- **Elemental compounding**: all 3 on-kill effects fire simultaneously + contagion cascade
- **No direct damage/score multiplier**: the GODCHAIN bullet flag has zero effect on damage or score by itself

**Visual identity** (all driven by `_godchainActive` flag):
- Pulsing red-orange aura: `INNER_RADIUS: 20, OUTER_RADIUS: 70, ALPHA: 0.45, PULSE_SPEED: 5.0 rad/s`
- Fire trail: 5 tongues, length 20, alpha 0.85, colors `['#ff4400','#ff6600','#ffaa00']`
- Vapor trail override: `COLOR_GODCHAIN: '#ff6600'` replaces default cyan
- Screen vignette: `EffectsRenderer.drawGodchainVignette()`
- Activation burst: `APOTHEOSIS` symbols `['🔥','⚡','💎']`, 2 ring bursts
- Screen flash: `duration 0.15s, opacity 0.30, color #FFD700`
- Weather hook: `'godchain'` event → `meteor_shower (2s, 6 meteors)` + `sheet_lightning (0.3s)`
- Audio: music intensity +12, arp detune +300 cents

**Re-trigger path**: Every post-3rd PERK pickup calls `activateGodchain()` (subject to 10s cooldown). If cooldown is still running, the pending flag is silently dropped — not queued.

**Rationale**: Making GODCHAIN a visual/compound state rather than a raw damage multiplier avoids stacking balance issues with HYPER. The "real" power of GODCHAIN is having all 3 on-kill effects active simultaneously, which provides more total damage than any single flat multiplier could. This design also makes HYPERGOD distinctly powerful — when both states overlap, the score multiplier is the reward, not extra damage.

### Decision 6: HYPER as Manual Risk/Reward with Instant Death

HYPER is **manually activated** (AUTO_ACTIVATE: false) by the player pressing the HYPER button or H key. The DIP proximity meter fills to 100 via close-range kills, boss hits, and phase transitions (see ADR-0009), enabling activation.

**On activation** (`Player`):
- `hyperActive = true`, `hyperTimer = BASE_DURATION(10s)`
- `effectiveLevel = min(5, weaponLevel + 2)` — temporarily +2 weapon levels
- `INSTANT_DEATH: true` — any hit during HYPER is instant game over, bypassing lives
- `HITBOX_PENALTY: 1.5` — core hitbox 50% larger (more risk)
- `TIME_SCALE: 0.82` — game speed slow-mo for readability
- `SCORE_MULT: 3.0` — base score multiplier during HYPER

**On expiry**: `hyperTimer <= 0` → `deactivateHyper()` → returns to normal weapon level, 8s cooldown before meter can refill.

**DIP auto-activation** (ADR-0009 Decision 4): When the DIP meter reaches 100 and HYPER cooldown is clear, HYPER activates automatically. This is the only automatic trigger — the player cannot auto-activate outside boss fights.

**Rationale**: Manual activation puts the risk/reward decision in the player's hands. The instant-death mechanic (Ikeda Philosophy — "the decision to risk everything for glory") creates tension. Auto-activation during boss fights via DIP meter maintains the proximity-kill incentive without requiring manual reaction time during high-density phases.

### Decision 7: HYPERGOD as Multiplicative Score Stack

When both `hyperActive` and `_godchainActive` are true simultaneously, the system enters HYPERGOD state:

- **Score multiplier**: `HYPERGOD.SCORE_MULT(5.0)` replaces HYPER's 3× base
- **Total cap**: `HYPERGOD.TOTAL_MULT_CAP(12.0)` caps the compound multiplier (HYPERGOD × combo × streak × arcade/bear-market modifiers)
- **Visual**: HUD shows `⚡⛓ HYPERGOD` with the shorter of the two remaining timers
- **Vapor trail**: GODCHAIN's `#ff6600` overrides HYPER's gold `#ffd700`

When one state expires, the label reverts to the surviving state's display (HYPER or nothing).

**Rationale**: The 12× total cap was added in v7.0 to prevent degenerate scores (25×+ combinations with Arcade modifiers). The 5× base is deliberately above HYPER's 3× but below a simple additive 8× (3+5) — multiplicative stacking between GODCHAIN (compound elemental lethality) and HYPER (raw stats) is balanced by the 10s/10s timing constraint. Both states must align, which happens at most once per boss fight.

### Decision 8: Specials and Utilities as Transient Bullet-Type Replacements

Specials and utilities are **short-duration buffs** that drop as diamond powerups from the DropSystem:

**Specials** (10s, `Balance.WEAPON_EVOLUTION.SPECIAL_DURATION`):
- HOMING: `b.homing = true`, `b.homingSpeed = 4.0`, bullet speed ×0.6. Curve to nearest enemy per frame.
- PIERCE: `b.penetration = true`. Bullet survives up to `PIERCE_DECAY.MAX_ENEMIES(5)` hits with `DAMAGE_MULT(0.65)` decay per hit.
- MISSILE: `b.isMissile = true`, `b.aoeRadius = 50`, speed ×0.7. Bullet count halved via `MISSILE_BULLET_DIVISOR(2)`, damage bonus ×2.0 with 50% falloff at edge.
- **Lost on death**: `Player.applyDeathPenalty()` clears `special = null`, `specialTimer = 0`.

**Utilities**:
- SHIELD: 5s invulnerability (`PLAYER.SHIELD_DURATION`). Blocks all damage during its window. `activateShield()` sets `shieldActive = true`, timer decays in `updateWeaponState()`.
- SPEED: 8s (`UTILITY_DURATION`). Applies `speedMult *= SPEED_MULTIPLIER(1.4)` in Player.update(). Lost on death.

**Special + Laser mutual exclusion**: Picking up HOMING/PIERCE/MISSILE while holding Laser suppresses the beam VFX for the special's duration (`Bullet.js:233`). Elemental on-kill effects still fire — this is a visual exclusion only.

**Rationale**: These are intentionally transient and death-volatile to create a "use it or lose it" cadence. They provide moment-to-moment variety (homing wave, missile barrel-roll, shield eating a wall) without permanent power accumulation. The 10s/8s duration is long enough to feel meaningful but short enough to prevent hoarding.

### Decision 9: GODCHAIN Drop Suppression in DropSystem

When `_godchainActive` is true, `BalanceConfig.js:1451` sets `GODCHAIN_SUPPRESS: true`. The DropSystem filters out PERK drops during the GODCHAIN window. This prevents:

1. Redundant re-activations during the 10s buff window (wasted drops)
2. Visual confusion from multiple "perk collected" notifications during GODCHAIN
3. Post-expiry cooldown manipulation (suppression does NOT extend the cooldown — the cooldown is a hard 10s)

The suppression is implemented in `DropSystem` as a filter on the PERK category — when GODCHAIN is active, PERK drops are redirected to SPECIAL or UTILITY categories.

**Rationale**: Without suppression, every PERK drop during GODCHAIN would queue a re-trigger that would either fail (cooldown active) or refresh the timer (creating near-permanent GODCHAIN uptime with enough drops). Suppression ensures the 10s/10s on/off cadence is enforced at the drop source rather than requiring the player to avoid collecting pickups.

## GDD Requirements Addressed

| GDD System | Requirement | How This ADR Addresses It |
|------------|-------------|--------------------------|
| weapon-elementals-godchain.md | 3-tier weapon evolution gated by boss Evolution Core (TR-WEP-001) | weaponLevel (1-3) integer with MAX_WEAPON_LEVEL gate; Evolution Core from boss kills only |
| weapon-elementals-godchain.md | Per-level firing geometry + cooldown (TR-WEP-002) | LEVELS lookup table with bullets/cooldownMult/damageMult/spreadDeg; _computeGeomForLevel() per-cannon offsets |
| weapon-elementals-godchain.md | HYPER system — manual, 10s, instant death (TR-WEP-003) | Manual activation/AUTO_ACTIVATE: false, BASE_DURATION 10s, INSTANT_DEATH: true, TIME_SCALE 0.82 |
| weapon-elementals-godchain.md | Elemental on-kill effects (splash/beam/chain) (TR-WEP-004) | _applyElementalOnKill() in CollisionSystem; Fire splash, Laser beam, Electric chain |
| weapon-elementals-godchain.md | Fixed perk order: Fire→Laser→Electric (TR-WEP-005) | Upgrades.js order field 1/2/3; PerkManager.getNextPerk() enforces sequence |
| weapon-elementals-godchain.md | Elemental Contagion cascade (depth-2) (TR-WEP-006) | CONTAGION.MAX_DEPTH [1,2,2]; DAMAGE_DECAY 0.38; cascade by killing element |
| weapon-elementals-godchain.md | GODCHAIN fusion state (10s, 10s cooldown) (TR-WEP-007) | DURATION 10s, COOLDOWN 10s; activateGodchain(); _godchainPending gate; visual overhaul |
| weapon-elementals-godchain.md | HYPERGOD (5× score, 12× cap) (TR-WEP-008) | SCORE_MULT 5.0; TOTAL_MULT_CAP 12.0; HYPER + GODCHAIN simultaneity detection |
| weapon-elementals-godchain.md | Specials (HOMING/PIERCE/MISSILE) (TR-WEP-009) | SPECIAL_DURATION 10s; homing/pierce/missile bullet flags; lost on death |
| weapon-elementals-godchain.md | Utilities (SHIELD/SPEED) (TR-WEP-010) | SHIELD_DURATION 5s invulnerability; UTILITY_DURATION 8s +40% speed; lost on death |
| weapon-elementals-godchain.md | Evolution Core cinematic deploy (TR-WEP-011) | 2.8s spawn delay, 1.2s fly-in, 0.35s deploy with ENERGY_SURGE config per transition |
| weapon-elementals-godchain.md | GODCHAIN visual identity (aura, fire trail, vignette) (TR-WEP-012) | AURA config (20/70/0.45/5.0), FIRE_TRAIL (5 tongues/20px), VIGNETTE true, vapor override |

## Performance Implications

- **CPU**: Weapon level is a lookup — O(1). Elemental on-kill effects run per kill, bounded by enemy count. Contagion cascade terminates at depth-2 maximum. Beam VFX is per-bullet (up to 3 with LV3) with 3-layer rendering but uses simple line drawing.
- **Memory**: No per-frame allocations in the weapon path. Bullet flags (`_elemFire`, `_isGodchain`, etc.) are booleans on existing bullet objects. Contagion VFX (line + ripple) creates transient canvas draw calls with no persistent state.
- **Load Time**: Zero — all config is static data in BalanceConfig.js.
- **Network**: None.

## Migration Plan

Already shipped. No migration needed.

## Known Issues Carried Forward

1. **`DEATH_PENALTY` fallback fragility** — `Player.js:1869` reads `WE.DEATH_PENALTY ?? 1`. Accidentally removing the `DEATH_PENALTY: 0` line from config would silently restore a -1 level penalty. Should use `?? 0`.

2. **GODCHAIN pending dropped during cooldown** — If a 4th+ PERK pickup triggers `_godchainPending = true` while `godchainCooldown > 0`, the pending flag is lost on the next tick ([Player.js:554-560](src/entities/Player.js:554)). The player sees the perk collected but no GODCHAIN activation. Intentional (no queuing) but can surprise players.

3. **No multi-cannon beam consolidation** — Despite the LV3 visual expectation of "three barrels firing one mega-beam", each cannon fires an independent 75px beam bolt. There is no "Laser Ultra" combining beams.

4. **Special + Laser beam mutual exclusion** — Picking up HOMING/PIERCE/MISSILE while holding Laser suppresses the beam VFX for 10s. Elemental on-kill effects still fire, but it feels like a "downgrade" to players who don't know the rule.

5. **Contagion damage decay is aggressive** — At 0.38 decay per step, depth-2 cascade deals ~14% of original damage. Mostly visual. Knob is `DAMAGE_DECAY` if cascades need to be stronger.

6. **GODCHAIN lacks its own score multiplier** — Only the HYPERGOD overlap provides a score bonus. Playtest feedback may want GODCHAIN to grant a minor score multiplier independently.

## Validation Criteria

- Weapon level LV1 (default) → LV2 (Boss 1 core) → LV3 (Boss 2 core). Each level changes bullet count, cooldown, and spread per LEVELS table.
- HYPER temporarily boosts effective level to min(5, weaponLevel + 2). Underlying weaponLevel is unchanged.
- Fire splash deals 55% damage to enemies within 55px on kill. VFX confirms napalm impact.
- Laser beam renders 75px bolt with 3-layer core/mid/glow. Player speed +37.5%. Bullets gain +1 pierce.
- Electric chain hits up to 2 nearest enemies within 100px for 44% damage. Deterministic on every kill.
- Contagion cascades up to depth [1,2,2] by perkLevel with 0.38 damage decay per step.
- GODCHAIN triggers when all 3 elemental perks held. 10s duration, 10s cooldown. Visual effects confirmed.
- HYPERGOD shows `⚡⛓ HYPERGOD` label, 5× score multiplier, capped at 12× total.
- HOMING bullets curve to nearest enemy. PIERCE bullets pass through up to 5 enemies with 0.65 damage decay. MISSILE bullets deal AoE 50px with 2.0× damage bonus.
- SHIELD blocks all damage for 5s. SPEED applies 1.4× movement for 8s.
- All specials and utilities cleared on death. Weapon level preserved.
- GODCHAIN suppression prevents PERK drops during the 10s active window.

## Related Decisions

- ADR-0009: Boss System + DIP — Evolution Core boss drops, HYPER from DIP meter at 100
- ADR-0008: Drop System + APC — PERK/SPECIAL/UTILITY drop flow, GODCHAIN suppression in DropSystem
- ADR-0004: Spatial Grid Collision — elemental on-kill effects as collision hooks
- ADR-0002: Canvas 2D Rendering — additive glow pass for beam/chain VFX, vignette overlay
