# Weapon Evolution + Elemental Perks + GODCHAIN — Game Design Document

**System:** Combat Progression Core (weapon tiers, elemental perks Fire/Laser/Electric, GODCHAIN fusion state, HYPER, specials & utilities)
**Version covered:** v7.12.7 (reverse-documented from code; cite `file:line` where noted)
**Status:** Shipped, active in all modes (Campaign V8 + Arcade Rogue Protocol)
**File audience:** Designers, engineers, QA

---

## A. Overview

The Combat Progression Core is the player's offensive toolbox. It is composed of three tightly-coupled subsystems that all read/write state on the `Player` entity and `RunState`:

1. **Weapon Evolution** — a linear 3-level permanent weapon tier (LV1 Single → LV2 Dual → LV3 Triple MAX), gated by the Evolution Core item that only drops from boss kills. Each level changes bullet count, cooldown, damage multiplier, spread, and cannon geometry. Two temporary "HYPER" tiers (LV4 / LV5) unlock only while the HYPER buff is active.
2. **Elemental Perks** — three permanent-until-death perks collected in a **fixed order** (Fire → Laser → Electric) via `PERK` diamond pickups. Each perk mutates bullet properties and applies on-kill effects: Fire splash, Laser beam + piercing, Electric chain. An Elemental Contagion layer cascades the on-kill effect between nearby enemies.
3. **GODCHAIN** — a 10-second fused-state buff triggered the instant the player holds all three elemental perks (and re-triggered on every perk-drop collected thereafter, with a 10s post-expiry cooldown). Grants +5% movement, colors the ship/vapor/bullets red-orange, and lights a full-screen vignette. Stacks with HYPER into **HYPERGOD** (5× score multiplier, capped at 12× total).

Layered on top of weapon tiers live two short-duration buffs that drop as diamond powerups during play:

- **Specials** (HOMING / PIERCE / MISSILE) — 10s replacements of the bullet type, weighted 25/25/20 in drops. Lost on death.
- **Utilities** (SHIELD / SPEED) — 5s invulnerability or 8s +40% movement speed.

The system is deliberately loss-averse: the permanent weapon tier survives death, but the active Special does not. This rewards long combat streaks while preserving progression hooks.

---

## B. Player Fantasy

The player should feel a **steady arc of compounding power** across a run. Tier 1 is a lean nose-cannon; Tier 2 sprouts dual shoulder mounts with a visible "energy link" tether between paired shots; Tier 3 is a full three-barrel broadside that fans at 6° spread. The Boss Evolution Core arriving after each boss kill — floating in from the dead boss's position, flying toward the ship, triggering hitstop + screen flash + geometry slide-out animation — is the project's keystone reward moment.

On top of that chassis, the three elemental perks feel like distinct flavors: Fire is a wide-clump incinerator, Laser is surgical piercing speed, Electric is arc-lightning crowd control. Holding all three should feel transformative — the GODCHAIN red-orange aura, pulsing fire tongues on every bullet, prismatic vignette, arp-lift music modulation, vapor trails burning orange instead of cyan. If HYPER triggers on top of GODCHAIN, the HYPERGOD state is the apex "screen-breaking" mode the player chases for the final 10 seconds before the buff runs out.

Specials and utilities are the moment-to-moment surprise: a homing wave clearing a hover column, a missile barrel-rolling into a formation, a shield eating a wall of bullets. They're transient, they're loud, they're lost on death — and that's the point.

---

## C. Detailed Rules

### C.1 Weapon Evolution — levels & firing

All numbers live in `Balance.WEAPON_EVOLUTION` in [src/config/BalanceConfig.js:1329](src/config/BalanceConfig.js:1329).

| Level | Bullets | Cooldown × | Damage × | Spread | Unlock |
|---|---|---|---|---|---|
| LV1 Single | 1 | ×0.70 | ×1.20 | 0° | Default |
| LV2 Dual | 2 | ×0.75 | ×1.30 | 0° | Boss 1 |
| LV3 Triple MAX | 3 | ×0.65 | ×1.70 | 6° | Boss 2 |
| LV4 HYPER+ | 3 | ×0.45 | ×2.00 | 10° | HYPER only |
| LV5 HYPER++ | 3 | ×0.30 | ×2.25 | 12° | HYPER only |

- `MAX_WEAPON_LEVEL: 3` is the permanent cap. Source: [BalanceConfig.js:1331](src/config/BalanceConfig.js:1331).
- `HYPER_LEVEL_BOOST: 2` pushes `effectiveLevel = min(5, weaponLevel + 2)` in [Player.js:838–841](src/entities/Player.js:838). The underlying `weaponLevel` is unchanged; LV4/LV5 are strictly temporary.
- Firing geometry is computed per-level by `Player._computeGeomForLevel()` at [Player.js:1894–1904](src/entities/Player.js:1894). Cannon offsets (`shoulderW`, `wingSpan`, `cannonExt`, `barrelExt`, `barrelW`, `cannonLen`) are shared with muzzle flash + weapon-deploy VFX.
- `fireEvolution()` at [Player.js:832–1007](src/entities/Player.js:832) spawns bullets using `weaponLevel` (not `effectiveLevel`) for muzzle-point geometry; HYPER DPS is compensated via cooldown/damage multipliers applied at [Player.js:1001–1004](src/entities/Player.js:1001).
- LV2 taggs each bullet pair with `_volleyId + _isLinkPair` for an **energy-link VFX tether** between the two shots, drawn at alpha 0.3 width 2 ([Player.js:981–992](src/entities/Player.js:981)). Tag suppressed while a Special is active.

### C.2 Weapon Evolution — Boss Evolution Core pickup

- Triggered by boss kill via `GameplayCallbacks.onBossKilled()` [GameplayCallbacks.js:496–515](src/core/GameplayCallbacks.js:496). Only spawned if `player.weaponLevel < MAX_WEAPON_LEVEL`.
- Spawn delay `EVOLUTION_CORE.SPAWN_DELAY: 2.8s`, fly-in duration `FLY_DURATION: 1.2s` ([BalanceConfig.js:1771–1774](src/config/BalanceConfig.js:1771)).
- On arrival, `main.js:4297–4301` calls `player.collectEvolution()` [Player.js:1826–1858](src/entities/Player.js:1826) which: increments `weaponLevel`, calls `_startDeploy()` for the slide-out animation, fires hitstop + screen flash + screen shake (`UPGRADE_SHAKE: 10`) + particle burst, and audio cue.
- `_startDeploy()` reads `Balance.VFX.WEAPON_DEPLOY` [BalanceConfig.js:1728–1751](src/config/BalanceConfig.js:1728): `DURATION: 0.35s`, lock-in at 85%, shake 6px, per-transition energy surge (durations `[0.8, 0.8, 1.0]s`, slowdown `[1.0, 0.7, 0.6]`, shockwave `[0, 60, 80]px`, `INVULN_FRAMES: 0.5s`), flash alpha 0.6 for 0.2s, burst 14 particles, aura pulse radius 50px.
- Overflow-safe: if already at `MAX_WEAPON_LEVEL`, `collectEvolution()` returns without effect ([Player.js:1829](src/entities/Player.js:1829)).
- UPGRADE drops from regular enemies are **redirected to SPECIAL** drops in [DropSystem.js:5,187,198](src/systems/DropSystem.js:5). Only boss kills produce weapon evolution.

### C.3 Weapon Evolution — death penalty

- `DEATH_PENALTY: 0` in [BalanceConfig.js:1359](src/config/BalanceConfig.js:1359). The player keeps their weapon level forever once acquired.
- `applyDeathPenalty()` [Player.js:1865–1887](src/entities/Player.js:1865) also clears `special = null` and `specialTimer = 0` — active Specials are lost on death.
- Fallback read `DEATH_PENALTY ?? 1` means **accidentally deleting the config key would silently revert to -1 level penalty**. Safe today, fragile in principle.

### C.4 Specials — HOMING / PIERCE / MISSILE

- Config: `Balance.WEAPON_EVOLUTION.SPECIAL_DURATION: 10` seconds ([BalanceConfig.js:1353](src/config/BalanceConfig.js:1353)).
- Drop weights `SPECIAL_WEIGHTS`: HOMING 25, PIERCE 25, MISSILE 20 ([BalanceConfig.js:1371–1374](src/config/BalanceConfig.js:1371)).
- Activation: `collectEvolutionPowerup(type)` [Player.js:1789–1799](src/entities/Player.js:1789) sets `special = type`, `specialTimer = 10`. Countdown decremented in `updateWeaponState(dt)` [Player.js:263–269](src/entities/Player.js:263); at zero → `special = null`.

| Special | Bullet flags | Behavior |
|---|---|---|
| HOMING | `b.homing = true`, `b.homingSpeed = 4.0`, speed ×0.6 | Bullets curve to nearest enemy ([Player.js:920–923](src/entities/Player.js:920)) |
| PIERCE | `b.penetration = true` | Bullet survives N enemy hits with damage decay ×0.65 per hit, max 5 enemies (`PIERCE_DECAY` [BalanceConfig.js:1365–1368](src/config/BalanceConfig.js:1365)) |
| MISSILE | `b.isMissile = true`, `b.aoeRadius = 50`, speed ×0.7 | AoE explosion on impact; count halved via `MISSILE_BULLET_DIVISOR: 2`; damage bonus ×2.0; falloff 50% at edge ([BulletSystem.js:86–120](src/systems/BulletSystem.js:86)) |

### C.5 Utilities — SHIELD / SPEED

- **SHIELD**: `activateShield()` [Player.js:1803–1807](src/entities/Player.js:1803) sets `shieldActive = true`, `shieldTimer = Balance.PLAYER.SHIELD_DURATION = 5.0s` ([BalanceConfig.js:80](src/config/BalanceConfig.js:80)). Blocks all damage during its window ([Player.js:1700](src/entities/Player.js:1700)). Decays in [Player.js:509–514](src/entities/Player.js:509).
- **SPEED**: `shipPowerUp = 'SPEED'`, `shipPowerUpTimer = UTILITY_DURATION = 8s` ([BalanceConfig.js:1356](src/config/BalanceConfig.js:1356)). Applies `speedMult *= SPEED_MULTIPLIER = 1.4` in [Player.js:294–295](src/entities/Player.js:294). Decays in [Player.js:533–536](src/entities/Player.js:533).

### C.6 HYPER

Separate system from GODCHAIN, but mechanically symmetric.

- Duration `HYPER.BASE_DURATION = 10.0s` ([BalanceConfig.js:347](src/config/BalanceConfig.js:347)).
- Activation: **manual** — `AUTO_ACTIVATE: false` ([BalanceConfig.js:346](src/config/BalanceConfig.js:346)). Player triggers via HUD button or tap, consuming the HYPER meter (filled by Proximity Kill Meter — see separate system).
- On activation [Player.js:721–722](src/entities/Player.js:721): `hyperActive = true`, `hyperTimer = 10`, `weaponLevel` untouched; `effectiveLevel` temporarily +2.
- Expiry [Player.js:614–615](src/entities/Player.js:614): `hyperTimer <= 0` → `deactivateHyper()`.
- **`INSTANT_DEATH: true`** ([BalanceConfig.js:354](src/config/BalanceConfig.js:354)): any hit during HYPER is game-over immediately, bypassing lives. Risk/reward by design.

### C.7 Elemental Perks — acquisition & order

Config: `Balance.ELEMENTAL` at [BalanceConfig.js:115](src/config/BalanceConfig.js:115).

- Fixed acquisition order enforced by `Upgrades.js` [src/utils/Upgrades.js:8–41](src/utils/Upgrades.js:8): `{order:1 Fire, order:2 Laser, order:3 Electric}`.
- `PerkManager.getNextPerk()` [src/managers/PerkManager.js:34](src/managers/PerkManager.js:34) returns the perk whose `order === perkLevel + 1`. Player cannot skip or reorder.
- No stacking: each perk records `perkStacks[id] = 1` ([PerkManager.js:59](src/managers/PerkManager.js:59)).
- Pity: `KILLS_FOR_PERK: 100` ([BalanceConfig.js:1332](src/config/BalanceConfig.js:1332)). After 100 kills without a PERK drop, `DropSystem` returns `{type:'PERK'}` on the next roll ([DropSystem.js:167–175](src/systems/DropSystem.js:167)).
- Death reset: `PerkManager.reset()` [PerkManager.js:91](src/managers/PerkManager.js:91) clears `recentPerks`; the hard reset of `runState.hasFirePerk/hasLaserPerk/hasElectricPerk/perkLevel` lives in `RunState`.

### C.8 Elemental Perks — on-kill effects

Applied in `CollisionSystem._applyElementalOnKill()` [src/systems/CollisionSystem.js:428](src/systems/CollisionSystem.js:428).

**FIRE** (Splash):
- `SPLASH_RADIUS: 55` ([BalanceConfig.js:118](src/config/BalanceConfig.js:118)), `SPLASH_DAMAGE: 0.55` (55% of kill damage dealt to neighbors within radius).
- VFX: `ParticleSystem.createNapalmImpact()` ring + flame tongues + embers ([ParticleSystem.js:1049](src/systems/ParticleSystem.js:1049)), fallback `createFireImpact` (8 particles).
- Trigger: deterministic on every kill carrying `bullet._elemFire`.

**LASER** (Beam + Pierce):
- `SPEED_MULT: 1.375` → +37.5% movement speed while carrying the perk ([BalanceConfig.js:124](src/config/BalanceConfig.js:124)). Applied as player movement multiplier, NOT bullet speed.
- `PIERCE_BONUS: 1` — bullets gain 1 passive pierce HP even without the PIERCE special.
- Beam rendering: `Bullet._drawLaserBeam()` + `_drawLaserBeamGlow()` ([Bullet.js:396,512](src/entities/Bullet.js:396)). `BEAM.LENGTH: 75` (a 75-pixel beam bolt, not a persistent rail) with 3-layer rendering: core 2.5px white / mid 5px cyan / outer 10px cyan glow on additive pass.
- Triggered per-bullet when `_elemLaser && !bullet.special && BEAM.ENABLED` ([Bullet.js:233](src/entities/Bullet.js:233)). Bullets with an active Special (HOMING/PIERCE/MISSILE) skip the beam visual.
- Collision: `BulletSystem.lineSegmentVsCircle(x1,y1,x2,y2,cx,cy,r)` [BulletSystem.js:55–73](src/systems/BulletSystem.js:55). Used by `CollisionSystem` at line 213 (bullet→enemy) and lines 334/355 (bullet cancel).
- **No multi-cannon consolidation**: each cannon's bullet carries its own beam. On LV3 Triple, three independent beams are drawn.

**ELECTRIC** (Chain):
- `CHAIN_RADIUS: 100`, `CHAIN_DAMAGE: 0.44`, `CHAIN_TARGETS: 2` ([BalanceConfig.js:144–146](src/config/BalanceConfig.js:144)).
- Trigger: **deterministic** on every kill carrying `bullet._elemElectric` — no probability roll. The system finds up to 2 nearest living enemies within 100px and deals 44% of kill damage to each.
- VFX: `createElectricChain()` (5-step zigzag) + `createLightningBolt()` (jagged segments + branches) ([ParticleSystem.js:867, 1095](src/systems/ParticleSystem.js:867)).

### C.9 Elemental Contagion

Cascade layer on top of the three perks. Config `ELEMENTAL.CONTAGION` at [BalanceConfig.js:151](src/config/BalanceConfig.js:151).

- `MAX_DEPTH: [1, 2, 2]` indexed by `perkLevel` (i.e. depth-1 after Fire only, depth-2 once Laser arrives, stays at 2 with Electric).
- `DAMAGE_DECAY: 0.38` per cascade step.
- Cascade kills propagate the elemental effect (Fire splash / Electric chain) from the killed enemy onto the next neighbor, creating visible chain reactions. VFX via `contagion_line` + `ripple` canvas effects ([CollisionSystem.js:462–473](src/systems/CollisionSystem.js:462), `CONTAGION_VFX` config at [BalanceConfig.js:157–167](src/config/BalanceConfig.js:157)).

### C.10 Visual feedback — enemy & ship tint

- **Enemy tint** (`ELEMENTAL.ENEMY_TINT` [BalanceConfig.js:170](src/config/BalanceConfig.js:170)): on hit, Enemy stores `_elemTint + _elemPersistent = true`. In `draw()` [Enemy.js:738](src/entities/Enemy.js:738): flash at alpha 0.6 for 0.15s, then persistent tint at alpha 0.25. Colors: Fire `#ff4400`, Laser `#00f0ff`, Electric `#8844ff`.
- **Cannon tint** (`ELEMENTAL.CANNON_TINT` [BalanceConfig.js:195](src/config/BalanceConfig.js:195)): Player `draw()` [Player.js:2070–2077](src/entities/Player.js:2070) picks `elemTint` with priority **Electric > Laser > Fire**, applying `noseDark` / `noseLight` to the ship cannon housing.
- **Cockpit canopy** (`ELEMENTAL.COCKPIT_CANOPY` [BalanceConfig.js:179](src/config/BalanceConfig.js:179)): transparent ellipse with reactive BTC symbol color — Fire `#ff6622`, Laser `#00f0ff`, Electric `#aa77ff`, GODCHAIN prismatic (hue rotation).

### C.11 GODCHAIN — trigger & timer

Config `Balance.GODCHAIN` at [BalanceConfig.js:1989–2020](src/config/BalanceConfig.js:1989).

- `REQUIREMENTS.PERK_LEVEL: 3` — fires the instant the 3rd elemental perk is applied.
- `DURATION: 10s` (permanent before v4.48), `COOLDOWN: 10s` post-expiry (added v5.15.1).
- Trigger path: PERK pickup → `DropSystem` → `applyRandomPerk()` → `PerkManager.applyNext()` → `player.activateGodchain()` [Player.js:281–284](src/entities/Player.js:281) sets `_godchainPending = true`.
- Game-loop gate [Player.js:554–560](src/entities/Player.js:554): if `_godchainPending && godchainCooldown <= 0`, sets `godchainTimer = DURATION`. If cooldown is still running, the pending flag is **silently dropped** (pending is not queued).
- Re-trigger path [PerkManager.js:68–75](src/managers/PerkManager.js:68): when `perkLevel >= 3`, `getNextPerk()` returns null; picking up another PERK still calls `activateGodchain()`, so every post-3rd perk refreshes/re-triggers GODCHAIN (subject to cooldown).
- Timer decrement [Player.js:570–572](src/entities/Player.js:570); on expiry [Player.js:576–586](src/entities/Player.js:576): sets `godchainCooldown = COOLDOWN`, emits `GODCHAIN_DEACTIVATED`.
- Activation edge emits `GODCHAIN_ACTIVATED`, plays `Audio.play('godchainActivate')`, vibration pattern `[80,40,80,40,80]`.

### C.12 GODCHAIN — runtime effects

- **Movement**: `speedMult *= SPEED_BONUS = 1.05` while active ([Player.js:297–299](src/entities/Player.js:297)).
- **Bullet tagging**: every fired bullet gets `b._isGodchain = true` ([Player.js:946](src/entities/Player.js:946)), which triggers fire-tongue overlay on the bullet ([Bullet.js:207–226, 448–449](src/entities/Bullet.js:207)).
- **No direct damage bonus**: the GODCHAIN bullet flag drives **VFX only**. Extra lethality comes from the compounded elemental on-kill effects (all 3 active at once: fire splash + laser pierce + electric chain + contagion) rather than a multiplier.
- **Audio**: live music engine increments intensity by +12 and detunes the arp instrument +300 cents (+3 semitones) while GODCHAIN is active ([main.js:3201–3203](src/main.js:3201)).
- **Passive particle sparks**: 33% chance per frame to emit wing sparks ([Player.js:589–600](src/entities/Player.js:589)).

### C.13 GODCHAIN — visual identity

- **Aura** pulsing red-orange on the ship: `INNER_RADIUS: 20, OUTER_RADIUS: 70, ALPHA: 0.45, PULSE_SPEED: 5.0 rad/s` ([Player.js:1649–1650](src/entities/Player.js:1649)).
- **Fire trail** from ship tail: 5 tongues, length 20, alpha 0.85, colors `['#ff4400','#ff6600','#ffaa00']` ([Player.js:1194](src/entities/Player.js:1194)).
- **Wing-tip energy lines** ([Player.js:2371, 2422](src/entities/Player.js:2371)); nose light `SHIP_COLORS.NOSE_LIGHT` ([Player.js:2478–2479](src/entities/Player.js:2478)).
- **Vapor trails** override: `COLOR_GODCHAIN: '#ff6600'` replaces the default cyan trail ([Player.js:479–480](src/entities/Player.js:479)).
- **Screen vignette**: `VIGNETTE: true` → `EffectsRenderer.drawGodchainVignette()` ([main.js:3818–3819](src/main.js:3818)).
- **Activation burst**: `APOTHEOSIS` symbols `['🔥','⚡','💎']`, 2 ring bursts at 120 px/s ([BalanceConfig.js:251–257](src/config/BalanceConfig.js:251)).
- **Screen flash** on activation: `duration 0.15s, opacity 0.30, color #FFD700` ([BalanceConfig.js:399](src/config/BalanceConfig.js:399)).
- **Muzzle flash** switches to `COLORS_GODCHAIN` palette with `GODCHAIN_TONGUE_COUNT: 3` ([BalanceConfig.js:1792–1799](src/config/BalanceConfig.js:1792)).
- **Weather hook**: `'godchain'` event triggers `meteor_shower` (2s, 6 meteors) + `sheet_lightning` (0.3s, intensity 0.25) ([BalanceConfig.js:2186–2189](src/config/BalanceConfig.js:2186)).

### C.14 HYPERGOD — HYPER × GODCHAIN interaction

Config `Balance.GODCHAIN.HYPERGOD` [BalanceConfig.js:2022–2026](src/config/BalanceConfig.js:2022).

- When both `hyperActive` and `_godchainActive` are true simultaneously, the HUD shows `⚡⛓ HYPERGOD` with the shorter of the two timers ([main.js:3365–3372](src/main.js:3365)).
- `SCORE_MULT: 5.0` replaces HYPER's 3× base.
- `TOTAL_MULT_CAP: 12.0` caps the compound multiplier (including combo/arcade/bear-market multipliers).
- Vapor trail color: GODCHAIN's `#ff6600` overrides HYPER's gold `#ffd700` ([Player.js:479–480](src/entities/Player.js:479)).

### C.15 Drop suppression during GODCHAIN

`BalanceConfig.js:1451` sets `GODCHAIN_SUPPRESS: true` — drops are filtered/suppressed while GODCHAIN is active, to prevent perk pickups during the 10-second window from triggering redundant re-activations. Implemented in `DropSystem`.

---

## D. Balance & Tuning Reference

| Parameter | Value | Location |
|---|---|---|
| `MAX_WEAPON_LEVEL` | 3 | `BalanceConfig.js:1331` |
| `KILLS_FOR_PERK` (pity) | 100 | `BalanceConfig.js:1332` |
| `HYPER_LEVEL_BOOST` | 2 | `BalanceConfig.js:1335` |
| `SPECIAL_DURATION` | 10s | `BalanceConfig.js:1353` |
| `UTILITY_DURATION` (SPEED) | 8s | `BalanceConfig.js:1356` |
| `PLAYER.SHIELD_DURATION` | 5s | `BalanceConfig.js:80` |
| `DEATH_PENALTY` | 0 | `BalanceConfig.js:1359` |
| `SPEED_MULTIPLIER` (utility) | 1.4 | `BalanceConfig.js:1362` |
| `PIERCE_DECAY.DAMAGE_MULT` | 0.65 | `BalanceConfig.js:1365` |
| `PIERCE_DECAY.MAX_ENEMIES` | 5 | `BalanceConfig.js:1366` |
| `SPECIAL_WEIGHTS` HOMING/PIERCE/MISSILE | 25/25/20 | `BalanceConfig.js:1371` |
| `MISSILE_BULLET_DIVISOR` | 2 | `BalanceConfig.js:1349` |
| `MISSILE_DAMAGE_BONUS` | 2.0 | `BalanceConfig.js:1350` |
| Fire `SPLASH_RADIUS` / `SPLASH_DAMAGE` | 55 / 0.55 | `BalanceConfig.js:118` |
| Laser `SPEED_MULT` / `PIERCE_BONUS` | 1.375 / 1 | `BalanceConfig.js:124` |
| Laser `BEAM.LENGTH` | 75 px | `BalanceConfig.js:130` |
| Electric `CHAIN_RADIUS` / `CHAIN_DAMAGE` / `CHAIN_TARGETS` | 100 / 0.44 / 2 | `BalanceConfig.js:144` |
| Contagion `MAX_DEPTH` / `DAMAGE_DECAY` | `[1,2,2]` / 0.38 | `BalanceConfig.js:153` |
| GODCHAIN `DURATION` / `COOLDOWN` | 10s / 10s | `BalanceConfig.js:1993` |
| GODCHAIN `SPEED_BONUS` | 1.05 | `BalanceConfig.js:1995` |
| HYPERGOD `SCORE_MULT` / `TOTAL_MULT_CAP` | 5.0 / 12.0 | `BalanceConfig.js:2023` |
| HYPER `BASE_DURATION` / `INSTANT_DEATH` | 10s / true | `BalanceConfig.js:347, 354` |

---

## E. Kill-switches & Risks

### Kill-switches (feature flags)

- `Balance.ELEMENTAL.LASER.BEAM.ENABLED` — disable beam rendering, fall back to legacy trail overlay.
- `Balance.ELEMENTAL.CONTAGION.ENABLED` — disable cascade.
- `Balance.ELEMENTAL.CONTAGION_VFX.ENABLED` — disable line+ripple VFX only.
- `Balance.ELEMENTAL.ENEMY_TINT.ENABLED` — disable hit-tint overlay.
- `Balance.VFX.MUZZLE_FLASH.ENABLED`, `Balance.VFX.WEAPON_DEPLOY.ENABLED`.
- `Balance.WEAPON_EVOLUTION.HYPER.AUTO_ACTIVATE` (currently false — manual only).

### Risks & fragile coupling (real drifts / bugs surfaced during reverse-doc)

1. **`DEATH_PENALTY` fallback is -1, not 0.** `Player.js:1869` reads `WE.DEATH_PENALTY ?? 1` (then `Math.max(1, weaponLevel - penalty)`). Accidentally removing the `DEATH_PENALTY: 0` line from config would silently restore a -1 level penalty. Recommend hardcoding default to `0` or changing to `?? 0`.

2. **GODCHAIN pending flag is dropped, not queued.** If a 4th-perk pickup triggers `_godchainPending = true` while `godchainCooldown > 0`, the pending is lost at the next tick ([Player.js:554–560](src/entities/Player.js:554)). Intentional (prevents queuing), but the behavior is undocumented and can surprise QA — "I picked up a perk and nothing happened" during the cooldown window.

3. **CLAUDE.md drifts (all found during this review — corrected in same commit):**
   - `SPECIAL_DURATION` is **10s**, not 8s as stated in the memory doc.
   - Fire `SPLASH_DAMAGE` is **55%**, not 30%.
   - Laser `SPEED_MULT` is **+37.5%**, not +25%.
   - Laser `BEAM.LENGTH` is **75 px**, not 110 px.
   - Electric chain is **deterministic on every kill**, not a 20% chance.
   - `KILLS_FOR_PERK` pity is **100**, not documented in CLAUDE.md.
   - `GODCHAIN.COOLDOWN: 10s` not documented in CLAUDE.md.
   - Memory says re-trigger is "via bullet cancels"; in reality it's via PERK pickups (bullet cancels generate PERK drops indirectly — the chain is PERK drop → pickup → activate, not cancel → activate).

4. **`CONTAGION.DAMAGE_DECAY: 0.38`** is aggressive: by step 2 the propagated damage is already 14% of the original. Makes the depth-2 cascade mostly visual. If playtest wants stronger cascades, this is the knob.

5. **No multi-cannon beam consolidation.** Despite the LV3 visual expectation of "three barrels firing one mega-beam", each of the three cannons fires an independent 75px beam bolt. This is consistent but worth knowing — there is no "Laser Ultra" mode combining beams.

6. **Special + Laser beam mutual exclusion.** Picking up HOMING/PIERCE/MISSILE while holding Laser perk suppresses the beam VFX for 10 seconds ([Bullet.js:233](src/entities/Bullet.js:233)). Intentional, but feels like a "downgrade" to players who don't know the rule. Worth a tutorial beat if we ever add one.

7. **Contagion vs. combo multiplier interaction is unverified.** Arcade combo timer resets on kill; contagion cascades kill enemies within the same frame. Does each cascade step count as a combo hit? Grep the code or playtest before tuning Arcade.

---

## F. Open Design Questions

- **Should GODCHAIN have a score multiplier of its own** (independent of HYPERGOD)? Currently GODCHAIN grants no direct damage/score bonus — only compound elemental lethality. Playtest whether this reads as "earned power" or "visual-only".
- **Pity tuning for PERK drops.** 100 kills is long. In V8 a level averages ~180-220 enemies; pity triggers ~once per level. Is that intended cadence?
- **HYPERGOD cap vs Arcade combo.** `TOTAL_MULT_CAP: 12.0` — does Arcade's 5.0× combo cap push above this? Worth a cross-check with `arcade-rogue-protocol.md`.
- **Laser BEAM.LENGTH 75 px.** With LV3 cooldown ×0.65 and HYPER pushing to ×0.30, beams densely overlap vertically. Consider whether length should scale with weapon level.
- **Cannon-tint priority Electric > Laser > Fire.** Player expectations may differ (most recent perk? last element used?). Worth a playtest comment.

---

## G. Related Systems

- **Proximity Kill Meter** (`Balance.PROXIMITY_KILL`) — fills the HYPER meter. Defined in main.js, documented separately.
- **DropSystem** (`Balance.ADAPTIVE_DROPS`) — produces PERK / SPECIAL / UTILITY drops. Separate GDD candidate.
- **Score Pulse Tiers** (`Balance.JUICE.SCORE_PULSE_TIERS`) — not directly tied to GODCHAIN, but HYPERGOD's 5× multiplier pushes gains into higher tiers easily.
- **Enemy Agents GDD** — covers the targets of elemental effects (tint system lives across both GDDs).
