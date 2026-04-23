# Enemy Agents — Game Design Document

**System:** Enemy Agents (v7.9 cohesive bundle: Procedural Agents + Gravity Gate + Currency Bullets + Elites/Behaviors)
**Version covered:** v7.12.4 (reverse-documented from code; cite file:line where noted)
**Status:** Active in both V8 campaign and Arcade; Gravity Gate V8-only (DIVE/SINE/SWOOP patterns only)
**File audience:** Designers, engineers, QA

---

## A. Overview

The Enemy Agents system is a cohesive bundle of four mutually-reinforcing subsystems introduced in v7.9 that together transform the enemy from an abstract currency icon into a legible, characterful threat. Every regular enemy (non-minion, non-boss) is now a **procedurally-drawn humanoid pilot inside a regional vehicle**, whose **bullets are literally its own currency glyph**, who may **hover-stop mid-flight to stare the player down**, and who may carry an **elite variant overlay** or a **special combat behavior** that changes its tactical role. These four systems all attach to the same `Enemy` entity and share state machines, rendering state, and `HarmonicConductor` fire-suppression hooks, which is why they are documented as one cohesive GDD.

The system is active in all game modes. Gravity Gate (hover-stop) is V8-exclusive by nature — it requires the `_v8Fall` flag, which is only set by `LevelScript`. Arcade enemies use the legacy WaveManager formation system and thus do not hover-stop, but they do use all three other subsystems: procedural agents, symbol bullets, and elite/behavior assignment.

For the Gravity Gate's relationship to V8 movement patterns, this is the **primary reference**. `design/gdd/v8-scroller.md` section C.7 and G.5 describe it at the integration level only; update them to link here if revised.

---

## B. Player Fantasy

**Threat legibility is the design thesis.** Every visual element of this bundle exists to answer the question "who is shooting at me and why should I care?"

The procedural agent design makes each currency feel like a factional representative: the dollar fires from under a top hat (cigar optional), the yen from a kabuto-helmeted Ronin in a quad-drone, the franc from a beret-wearing functionary. The vehicle behind each pilot contextualizes them as airborne — they are not coins floating in space, they are people in machines coming to collect.

The currency-symbol bullet completes the feedback loop: when a € pilot fires, the bullet **is** a €. The player does not need to remember "EU-bloc enemies use star bullets" — the projectile announces its origin on every frame.

The Gravity Gate is the standoff moment. 55% of V8 enemies will cross a random Y-threshold and halt — thrusters flipping below them, suspended against gravity, staring the player down for up to 6 seconds before departing upward. The 1.5-second fire-grace period ("settling") is a breathing moment of threat-theatre that does not punish the player for looking at the scene.

Elite variants and behaviors add depth to the "read the field" fantasy: the metallic sheen of an Armored unit, the speed-lines of a dashing Evader, the green aura pulse of a Healer cluster — all are designed so the player can identify them at a glance and adjust their priority accordingly.

---

## C. Detailed Rules

### C.1 Procedural Agents

Every non-minion enemy renders via `Enemy.drawAgent()` instead of a shape-icon. The method is the primary `draw()` dispatch:

```
Enemy.draw():
  if this.isMinion → drawMinion()       // Boss minions: old coin silhouette
  else             → drawAgent()        // All regular enemies
```
Source: `src/entities/Enemy.js:726-730`

**Kill-switch fallback:** if `Balance.ENEMY_AGENT.ENABLED === false`, `drawAgent()` calls `drawMinion()` and returns immediately, so every enemy degrades to the pre-v7.9 coin silhouette.
Source: `src/entities/Enemy.js:964-968`

#### C.1.1 Region dispatch

`drawAgent()` reads `window.Game.CURRENCY_REGION[this.symbol]` to resolve the agent's regional family. Unknown symbols default to `'USA'`.

| Region | Pilot archetype | Vehicle |
|---|---|---|
| `'USA'` | `_drawOligarch()` — dark suit, tie, hat | `_drawVehicleUSA()` — Stealth Wedge delta-wing |
| `'EU'` | `_drawBureaucrat()` — formal jacket, lapel pin, moustache | `_drawVehicleEU()` — Diplomatic Shuttle oval fuselage |
| `'ASIA'` | `_drawRonin()` — kabuto helmet, menpo face guard, armor | `_drawVehicleASIA()` — Mech Quad-Drone |

Source: `src/entities/Enemy.js:969-1010`; `src/utils/Constants.js:818-834`

#### C.1.2 Currency variant lookup

Each of the 12 currencies maps to a `{hat, acc, palette}` record in `window.Game.CURRENCY_VARIANT` (`src/utils/Constants.js:843-859`). This is resolved in `_variant()`:

```javascript
_variant() {
  return (window.Game.CURRENCY_VARIANT || {})[this.symbol]
      || { hat: 'tophat', acc: 'cigar', palette: 'forest' };  // fallback
}
```
Source: `src/entities/Enemy.js:1284-1286`

The full lookup table (12 entries, 3 axes each):

| Symbol | Region | Hat | Accessory | Palette |
|---|---|---|---|---|
| `$` | USA | tophat | cigar | forest |
| `C$` | USA | stetson | kerchief | burgundy |
| `Ⓒ` | USA | cowboy | cane | tan |
| `₽` | USA | ushanka | monocle | steelblue |
| `€` | EU | bowler | pipe | charcoal |
| `£` | EU | topBrit | newspaper | navy |
| `₣` | EU | beret | baguette | wine |
| `₺` | EU | fez | worrybeads | olive |
| `¥` | ASIA | kabutoStd | tanto | nightBlack |
| `₩` | ASIA | kabutoWide | fan | deepRed |
| `₹` | ASIA | turban | saber | saffron |
| `元` | ASIA | kabutoDragon | scroll | imperial |

Source: `src/utils/Constants.js:843-859`

#### C.1.3 Tier scale

Agent render scale is read from `Balance.ENEMY_AGENT.TIER_SCALE`:
- WEAK: `0.82` — visibly small
- MEDIUM: `1.00` — baseline
- STRONG: `1.22` — looming

Tier is derived at construction from `scoreVal`:
```
_tier = scoreVal < 35 ? 'WEAK' : (scoreVal < 70 ? 'MEDIUM' : 'STRONG')
```
Source: `src/entities/Enemy.js:100`; `src/config/BalanceConfig.js:680-684`

If `TIER_SCALE` config is missing, the fallback in code applies `0.90` (WEAK) / `1.12` (STRONG). Source: `src/entities/Enemy.js:972`.

#### C.1.4 Y-flip (head-first descent)

In normal descent (`_uprightFlip = false`), `drawAgent()` applies `ctx.scale(1, -1)` after translating to the enemy center. This flips the coordinate system so that in "canvas space" the pilot appears head-down and the vehicle's thrusters (which draw at positive Y) appear at the top — pushing the craft toward the player.

When Gravity Gate DWELL activates (`_uprightFlip = true`), the flip is skipped so the pilot stands upright with thrusters beneath — the visual language of the craft being suspended against gravity.

Source: `src/entities/Enemy.js:983-986`

#### C.1.5 Thruster animation

`thrusterPhase = (Math.floor((performance.now() + _walkOffset) / 80)) & 1` — a 1/0 toggle every 80 ms, desynchronized across enemies via `_walkOffset` (random 0–1000 ms assigned at construction). This drives flame length and alpha flicker for all three vehicle types.

`_walkOffset` also seeds a `bobY = sin(now × 0.004) × 0.8` pilot hover-bob (subtle breathing motion, applied to the pilot bust only, not the vehicle).

Source: `src/entities/Enemy.js:976-978`

#### C.1.6 Chest mark

`_drawChestMark(ctx, region, tier)` renders the currency symbol as an emblem embedded in the pilot's clothing:
- **USA**: pale-gold glyph stamped on the red tie (`y=3.5`), font `7×sizeMul px` bold. STRONG: drop shadow (`shadowColor '#f2e7b8'`, blur 5).
- **EU**: gold monocle ring on right eye (`arc(2.6,-9,3.2×sizeMul)`) + chain. STRONG: `shadowColor '#c9a227'`, blur 4.
- **ASIA**: gold mon disc on breastplate (`arc(0,2.5,3.8×sizeMul)`). STRONG: additional gold halo ring (alpha 0.45), `+1.6 px` radius.

`sizeMul`: WEAK `0.85` / MEDIUM `1.0` / STRONG `1.35`.

Counter-flip: when `_uprightFlip = false` (normal descent with Y-flipped context), the glyph is drawn with `ctx.scale(1, -1)` locally so it reads upright. When `_uprightFlip = true` (hover DWELL, no global flip), no counter-flip is needed.

Source: `src/entities/Enemy.js:1673-1767`

#### C.1.7 Accessory tier rules

- **USA Oligarch**: STRONG always gets accessory; MEDIUM gets accessory only if its `acc` is not `'cigar'`; WEAK gets no accessory.
- **EU Bureaucrat**: MEDIUM and STRONG always get accessory; WEAK gets none.
- **ASIA Ronin**: MEDIUM and STRONG always get accessory; WEAK gets none.

Source: `src/entities/Enemy.js:1093-1095, 1171-1173, 1269-1271`

#### C.1.8 Vehicle descriptions

| Vehicle | Key features |
|---|---|
| USA Stealth Wedge | Delta-wing hull (±19 × 20 px), accent stripe in currency color, twin orange thrusters (flicker 4/6 px flame length) |
| EU Diplomatic Shuttle | Oval fuselage (r=17×8), 3 portholes in currency color, gold tail fin, single blue-white central flame (5/7 px) |
| ASIA Mech Quad-Drone | 4 arms with rotor disks at tips (±15, 18/22 px), central cockpit pod (r=9), red sensor eye, 4 lacquer rotor hubs with alpha flicker |

Source: `src/entities/Enemy.js:1777-1960`

---

### C.2 Gravity Gate

**Gravity Gate** is a per-enemy state machine layered on top of V8 scroller movement. It is only active when `enemy._v8Fall === true` (set by LevelScript during V8 burst spawn). Arcade enemies do not receive `_v8Fall`, so Gravity Gate is V8-campaign-only in practice.

**Excluded from Gravity Gate:** enemies with `entryPattern === 'HOVER'`. The scripted HOVER pattern has its own dwell logic (`_v8PatPhase` state machine). Gravity Gate is for DIVE, SINE, and SWOOP only.

Source: `src/entities/Enemy.js:240` (`pat !== 'HOVER'` guard)

#### C.2.1 Initialization (constructor)

On construction, every enemy:
1. Reads `Balance.HOVER_GATE` (or uses safe defaults if absent).
2. Assigns `_hoverY = gameHeight × (Y_MIN + random() × (Y_MAX - Y_MIN))` — a random Y target in the 25%–45% band of game height.
3. Rolls `_hoverEnabled = random() < HOVER_CHANCE` (default 0.55). Enemies that fail this roll (`_hoverEnabled = false`) descend through unaffected.
4. Sets `_hoverState = 'IDLE'`, `_hoverTimer = 0`, `_uprightFlip = false`, `_fireSuppressed = false`.

Source: `src/entities/Enemy.js:107-119`

If `Balance.HOVER_GATE` is absent (e.g., kill-switch entirely removed), `_hoverY` is set to `9999` (never triggers) and `_hoverEnabled = false`.

#### C.2.2 State machine: IDLE → DWELL → LEAVING

**IDLE** (initial state):

Each frame, if `hoverGateActive` (= `ENABLED && pat !== 'HOVER' && _hoverEnabled`):
- When `y >= _hoverY`: transition to DWELL.
  - `vy = 0` (halt vertical movement).
  - `_uprightFlip = true` (agent stands upright, thrusters below).
  - `_hoverTimer = DWELL_DURATION` (default 6.0 s).
  - If `DWELL_FIRE_GRACE > 0`: `_fireSuppressed = true`, `_fireGraceTimer = DWELL_FIRE_GRACE` (default 1.5 s).

Source: `src/entities/Enemy.js:241-265`

**DWELL**:

Each frame:
- Position is frozen — the update returns early (`return`) without advancing x/y. Source: `src/entities/Enemy.js:268-271`.
- `_hoverTimer -= dt`.
- If `_fireSuppressed`: `_fireGraceTimer -= dt`. When `_fireGraceTimer <= 0`: `_fireSuppressed = false` (enemy begins firing).
- When `_hoverTimer <= 0`: transition to LEAVING.
  - `_hoverState = 'LEAVING'`.
  - `_uprightFlip = false` (flip restores).
  - `_fireSuppressed = false` (explicit clear).
  - `vy = EXIT_VY` (default −180 px/s, upward).

**LEAVING**:

Enemy moves upward at constant `EXIT_VY`. Pattern-specific X oscillations are frozen during LEAVING (SINE and SWOOP explicitly check `_hoverState !== 'LEAVING'` before updating X). Source: `src/entities/Enemy.js:283, 312`. DIVE gravity acceleration is also suppressed during LEAVING. Source: `src/entities/Enemy.js:276`.

The enemy continues until off-screen (`y > gameHeight + 120` cull threshold, applied by LevelScript). Source: `src/v8/LevelScript.js:487-494`.

#### C.2.3 Fire suppression

Two independent fire-suppression flags:

| Flag | Set by | Cleared by | HarmonicConductor check |
|---|---|---|---|
| `_fireSuppressed` | DWELL entry (if grace > 0) | Grace timer expires or LEAVING start | Row-fire: `Enemy.js` line 859; `fireEnemy()`: line 945 |
| `_fireSuppressedByEntry` | While `(y + h/2) < 0` (top offscreen) | Once enemy y-center enters screen | Row-fire: line 861; `fireEnemy()`: line 947 |

These two flags are orthogonal — an enemy in entry burst can simultaneously be IDLE for hover (if it descends fast enough to cross `_hoverY` before reaching y=0, which is impossible by design since `_hoverY >= gameHeight×0.25`).

Source: `src/systems/HarmonicConductor.js:858-861, 944-947`; `src/entities/Enemy.js:233`

#### C.2.4 Interaction with entry burst (v7.12)

The entry burst (`_entryBurst = true`) drives enemies down at 260 px/s until `y >= 40 px`. This puts them on-screen quickly before reverting to their pattern's normal vy. The Gravity Gate IDLE check runs in the same frame loop — an enemy could theoretically trigger DWELL while still in entry burst if it enters very fast. In practice, `_hoverY >= gameHeight × 0.25 ≈ 200 px`, and entry burst clears at `y = 40 px`, so entry burst always completes before any hover-stop triggers.

Source: `src/entities/Enemy.js:227-233`; `src/config/BalanceConfig.js:31-36`

---

### C.3 Currency-Symbol Bullets

Every enemy builds its bullets via `Enemy.buildBullet()`, which includes `symbol: this.symbol` in the returned data object. This symbol propagates through `HarmonicConductor.fireEnemy()` → `harmonic_bullets` event → `main.js` acquire loop → `Bullet.symbol`. Source: `src/entities/Enemy.js:159`; `src/systems/HarmonicConductor.js:953-979`; `src/main.js:932`.

#### C.3.1 Dispatch in Bullet.drawEnemyBullet()

```javascript
drawEnemyBullet(ctx) {
  if (this.isBossBullet) { this.drawBossBullet(ctx); return; }
  if (this.symbol && bsCfg?.ENABLED) { this.drawSymbolBullet(ctx, bsCfg); return; }
  // Fallback: shape-based (coin/bill/bar/card)
}
```
Source: `src/entities/Bullet.js:1225-1252`

Boss/mini-boss bullets have `symbol = null` (propagated as `null` because mini-boss bullets are built by `MiniBossManager`, not via `Enemy.buildBullet()`, and full boss bullets go through `Boss.buildBullet()` which does not set a currency symbol). They always fall through to `drawBossBullet()` or the shape-based fallback.

#### C.3.2 OffscreenCanvas cache

`Bullet._symbolCache` is a static `Map` instance (key → `{canvas, canvasSize}`). Key format: `symbol + '|' + bucket` (e.g., `'€|M'`).

Size bucketing by bullet width:
- `r = width × 1.8`
- `r < 8` → bucket `'S'` → 28 px canvas, 18 px font
- `r < 11` → bucket `'M'` → 36 px canvas, 24 px font
- `r >= 11` → bucket `'L'` → 44 px canvas, 30 px font

Source: `src/entities/Bullet.js:1261-1265, 1952-1955`

On cache miss, `_buildSymbolCacheEntry()` is called:
1. Creates `OffscreenCanvas` (or `<canvas>` fallback if OffscreenCanvas unavailable).
2. If `GLOW !== false`: draws radial gradient glow (warm gold, 0.55 → 0 alpha across canvas radius).
3. Draws glyph: font `900 {fontSize}px Arial`, dark outline (`#1a0a05`, lineWidth `max(2, fontSize×0.14)`), pale warm gold fill (`#fff3c4`).

LRU eviction: if `cache.size >= CACHE_MAX` (default 64), the oldest key (`keys().next().value`) is deleted before inserting the new entry.

Source: `src/entities/Bullet.js:1268-1277, 1949-1985`

#### C.3.3 Live rendering (v7.12 enhancements)

`drawSymbolBullet()` renders three layers on top of the cached glyph, all using `globalCompositeOperation = 'lighter'`:

1. **Motion trail** — tapered triangular gradient backward along velocity vector. Length = `min(24, speed × 0.10)`. Uses `ownerColor` as tint (falls back to warm gold `#ffb040`). Only drawn if `trailLen > 4`.
2. **Hostile halo** — radial gradient centered on bullet, radius `half × 1.8 × pulse`. Tier-tinted via `ownerColor`. Stops at 0% (center inner), 14% (mid), 0% (edge).
3. **Glyph core** — `drawImage` from cache at `(x - half, y - half, drawSize, drawSize)`. If `SPIN = true`: `translate` + `rotate(age × 2)`.

`pulse = 1 + sin(age × 14) × 0.12` — subtle breathing animation on glyph size.

Source: `src/entities/Bullet.js:1279-1338`

**V8 campaign vs. Arcade:** In V8 campaign, `ownerColor` is forced to `null` for legibility (colored bullets blending with same-colored enemies on the scroller). In Arcade, `ownerColor` is preserved for colored bullets. Source: `src/main.js:933-935`.

---

### C.4 Elite Variants and Behaviors

Both systems are assigned at enemy spawn time in `WaveManager._spawnEnemyAt()`. They are Arcade-mode-native (WaveManager-only) but also called by LevelScript's V8 spawn path if that path calls WaveManager helpers — in practice, V8 enemies are spawned directly by LevelScript without WaveManager, so these systems are **Arcade-only** in the V8 era unless LevelScript explicitly assigns them.

**Important:** In V8 campaign, enemies are spawned via `LevelScript` which does not call `WaveManager._spawnEnemyAt()`. Elite variants and behaviors are therefore **not assigned** to V8 enemies. These two systems are Arcade (WaveManager) only.

Source: `src/v8/LevelScript.js:562-615` (no elite/behavior assignment); `src/managers/WaveManager.js:293-365`

#### C.4.1 Elite variants

One variant type is active per cycle (`CYCLE_VARIANTS: { 1: 'ARMORED', 2: 'EVADER', 3: 'REFLECTOR' }`). Only MEDIUM and STRONG tier enemies are eligible (`ELIGIBLE_TIERS`). Assignment is independent per enemy (each roll independently — there is no hard "1 per cycle" cap at the individual enemy level; the config comment is misleading).

| Cycle | Variant | Spawn chance Story | Spawn chance Arcade | Bear Market bonus |
|---|---|---|---|---|
| C1 | ARMORED | 10% | 15% | +5% |
| C2 | EVADER | 15% | 20% | +5% |
| C3 | REFLECTOR | 20% | 25% | +5% |

Source: `src/config/BalanceConfig.js:593-598`; `src/managers/WaveManager.js:298-303`

**ARMORED** (`ELITE_VARIANTS.ARMORED`):
- `hp × HP_MULT (2.0×)`, `scoreVal × SCORE_MULT (2.0×)`.
- `SPEED_MULT: 0.8` is declared in config but **not applied** to any movement parameter in the spawner code. (See Documented Gaps.)
- Renders: metallic sheen sweep across body (`'#c0c8d0'`, alpha 0.25), shield icon above head (8 px).

Source: `src/config/BalanceConfig.js:600-607`; `src/managers/WaveManager.js:310-313`; `src/entities/Enemy.js:754-781`

**EVADER** (`ELITE_VARIANTS.EVADER`):
- `_evaderCooldown = 1.0 s` initial grace (prevents instant dash on spawn).
- Each frame: if `_evaderCooldown <= 0`, scans `window.Game._playerBullets` within `DETECT_RADIUS (60 px)`. On detection of upward bullet (`vy < 0`): dash sideways at `DASH_SPEED (600 px/s)` for `DASH_DISTANCE (40) / DASH_SPEED` seconds. Cooldown resets to `COOLDOWN (2.0 s)`.
- Renders: 3 cyan speed-lines when dashing (`LINE_ALPHA 0.4`, `LINE_COUNT 3`).

Source: `src/config/BalanceConfig.js:609-616`; `src/entities/Enemy.js:449-483`; `src/entities/Enemy.js:782-797`

**REFLECTOR** (`ELITE_VARIANTS.REFLECTOR`):
- `reflectCharges = CHARGES (1)` on spawn.
- First hit: `takeDamage()` returns `'reflect'` instead of dealing damage; `reflectCharges--`, `_reflectBroken = true`. Subsequent hits process normally.
- Renders active: prismatic shimmer ring (HSL hue cycle at `SHIMMER_SPEED 0.006` speed, alpha `SHIMMER_ALPHA 0.30`, r=27 px). Renders broken: dashed grey ring (alpha `BROKEN_ALPHA 0.08`).
- Reflected bullet: `REFLECT_SPEED (200 px/s)` upward-ish with `REFLECT_SPREAD (0.3 rad)` spread. *Note: reflected bullet spawning is handled in CollisionSystem, not Enemy.js.*

Source: `src/config/BalanceConfig.js:618-626`; `src/entities/Enemy.js:641-648, 798-820`

#### C.4.2 Behavior assignment

Behaviors are mutually exclusive with each other per enemy — only one behavior is assigned. Behaviors stack with elite variants (an enemy can be both ARMORED and FLANKER).

Assignment rate: `18%` Story / `22%` Arcade + `_behaviorEscalation` bonus from streaming phase index.
Source: `src/config/BalanceConfig.js:632-633`; `src/managers/WaveManager.js:328-330`

**Global wave threshold** (used for MIN_WAVE gating):
```
globalWave = ((cycle - 1) × 5) + waveInCycle
```
Source: `src/managers/WaveManager.js:326`

| Behavior | MIN_WAVE (globalWave) | Equivalent | Cap/wave |
|---|---|---|---|
| FLANKER | 3 | C1W3 | 4 |
| BOMBER | 7 | C2W2 | 2 |
| CHARGER | 7 | C2W2 | 3 |
| HEALER | 8 | C2W3 | 1 |

Source: `src/config/BalanceConfig.js:634-635`

Per-behavior caps are tracked in `WaveManager._behaviorCounts` (reset at wave start). If cap is reached, that behavior is excluded from the available pool for that wave.

**FLANKER**: Spawns from the screen edge (off `left = -40` or `right = gameWidth + 40`), runs across the screen at `ENTRY_SPEED (250 px/s)` for `RUN_DURATION (3.0 s)`, fires at player every `FIRE_INTERVAL (0.8 s)` via `harmonic_bullets` event, then re-enters formation. Visual: gold chevron in run direction during RUN phase.
Source: `src/config/BalanceConfig.js:636-641`; `src/entities/Enemy.js:488-512`; `src/managers/WaveManager.js:348-355`

**BOMBER**: After initial random grace (`BOMB_COOLDOWN × 0.5–1.5 s`), emits `'bomber_drop'` event every `BOMB_COOLDOWN (4.0 s)`. Main.js handles this event by placing a hazard zone (radius `ZONE_RADIUS (40 px)`, duration `ZONE_DURATION (2.0 s)`, `ZONE_COLOR '#ff4400'`, alpha 0.25) centered at bomb drop point. Visual: small bomb icon above enemy.
Source: `src/config/BalanceConfig.js:643-650`; `src/entities/Enemy.js:515-527`; `src/managers/WaveManager.js:357`

**HEALER**: Every `PULSE_INTERVAL (1.0 s)`, heals all active enemies within `AURA_RADIUS (60 px)` by `HEAL_RATE (5%)` of their `maxHp`. Reads `window.Game.enemies` directly. Visual: pulsing green aura ring (alpha 0.15 base, 0.5× pulse) and green cross icon above.
Source: `src/config/BalanceConfig.js:651-657`; `src/entities/Enemy.js:530-549`; `src/entities/Enemy.js:826-844`

**CHARGER**: State machine `IDLE → WINDUP → CHARGING → RETREATING → IDLE`. Initial timer randomized to `CHARGE_INTERVAL × 0.3–1.0 s`. WINDUP: `WINDUP_TIME (0.5 s)` with `WINDUP_SHAKE (2 px)` oscillation. CHARGING: moves down at `CHARGE_SPEED (500 px/s)` for `CHARGE_DISTANCE (80 px)`. RETREATING: moves up at `RETREAT_SPEED (200 px/s)`. Cycle repeats at `CHARGE_INTERVAL (5.0 s)` cooldown. Visual: red flash during WINDUP, red trail during CHARGING.
Source: `src/config/BalanceConfig.js:660-669`; `src/entities/Enemy.js:552-588`; `src/entities/Enemy.js:846-864`

---

## D. Formulas

### D.1 Agent tier scale

```
_tier = scoreVal < 35 ? 'WEAK' : (scoreVal < 70 ? 'MEDIUM' : 'STRONG')
scale = Balance.ENEMY_AGENT.TIER_SCALE[_tier]
      = { WEAK: 0.82, MEDIUM: 1.00, STRONG: 1.22 }[_tier]
```

Source: `src/entities/Enemy.js:100`; `src/config/BalanceConfig.js:680-684`

### D.2 Hat/accessory variant hash

```
variant = CURRENCY_VARIANT[enemy.symbol]
       || { hat: 'tophat', acc: 'cigar', palette: 'forest' }   // fallback
```

No hash — direct O(1) Map lookup keyed by currency symbol string.
Source: `src/entities/Enemy.js:1284-1286`; `src/utils/Constants.js:843-859`

### D.3 Gravity Gate hover-Y target

```
_hoverY = gameHeight × (Y_MIN + random() × (Y_MAX - Y_MIN))
        = gameHeight × (0.25 + random() × 0.20)
```

Range: [25%, 45%] of game height. At `gameHeight = 800`: [200 px, 360 px].
Source: `src/entities/Enemy.js:110`; `src/config/BalanceConfig.js:693-694`

### D.4 Gravity Gate enable roll

```
_hoverEnabled = random() < HOVER_CHANCE   // HOVER_CHANCE = 0.55
```

Rolled once at construction. Not re-rolled. Source: `src/entities/Enemy.js:111`; `src/config/BalanceConfig.js:692`

### D.5 Gravity Gate fire-grace timer

```
_fireSuppressed = true
_fireGraceTimer = DWELL_FIRE_GRACE   // 1.5 s
```

Clears when `_fireGraceTimer <= 0` during DWELL. Source: `src/entities/Enemy.js:248-257`; `src/config/BalanceConfig.js:696`

### D.6 Symbol bullet cache key

```
r = bullet.width × 1.8
bucket = r < 8 ? 'S' : (r < 11 ? 'M' : 'L')
key = symbol + '|' + bucket
```

Source: `src/entities/Bullet.js:1261-1265`

### D.7 Symbol bullet canvas sizes by bucket

| Bucket | Canvas px | Font px | Typical bullet width |
|---|---|---|---|
| S | 28 | 18 | w ≤ 4.4 px |
| M | 36 | 24 | 4.5 – 6.1 px |
| L | 44 | 30 | w ≥ 6.2 px |

Source: `src/entities/Bullet.js:1952-1955`

### D.8 Symbol bullet pulse animation

```
pulse = 1 + sin(age × 14) × 0.12
drawSize = canvasSize × SIZE_MUL × pulse
```

Oscillation: ±12% at ~2.2 Hz. Source: `src/entities/Bullet.js:1285-1286`

### D.9 Symbol bullet motion trail length

```
speed = sqrt(vx² + vy²)
trailLen = min(24, speed × 0.10)
tailLen = trailLen + (drawSize / 2) × 0.6
```

Drawn only when `trailLen > 4` (i.e., bullet speed > 40 px/s). Source: `src/entities/Bullet.js:1284, 1298-1316`

### D.10 Elite spawn chance

```
cycleIdx = min(cycle - 1, 2)   // clamps to [0, 1, 2]
variantType = CYCLE_VARIANTS[cycle] || CYCLE_VARIANTS[1]
             = { 1: 'ARMORED', 2: 'EVADER', 3: 'REFLECTOR' }[cycle]
chances = isArcade ? CHANCE.ARCADE : CHANCE.STORY
chance = chances[cycleIdx]           // [0.10/0.15, 0.15/0.20, 0.20/0.25]
if (isBearMarket) chance += CHANCE.BEAR_BONUS   // +0.05
eligible = ELIGIBLE_TIERS.includes(tier)        // ['MEDIUM', 'STRONG']
roll < chance AND eligible → isElite = true
```

Source: `src/managers/WaveManager.js:293-320`; `src/config/BalanceConfig.js:591-626`

### D.11 Armored HP/score multipliers

```
enemy.hp     = enemy.hp × HP_MULT (2.0)
enemy.maxHp  = enemy.hp   (updated to match)
enemy.scoreVal = round(enemy.scoreVal × SCORE_MULT (2.0))
```

Source: `src/managers/WaveManager.js:310-313`; `src/config/BalanceConfig.js:602-603`

### D.12 Reflector takeDamage intercept

```
if isElite AND eliteType === 'REFLECTOR' AND reflectCharges > 0:
  reflectCharges--
  _reflectBroken = true
  return 'reflect'      // Caller (CollisionSystem) checks for this string
else:
  hp -= amount
  return (hp <= 0)
```

Source: `src/entities/Enemy.js:641-648`

### D.13 Evader dash trigger

```
detectRSq = DETECT_RADIUS² = 60² = 3600
for each playerBullet with vy < 0:
  if (dx² + dy²) < detectRSq:
    dashDir = bdx > 0 ? -1 : 1
    _evaderDashVx = dashDir × DASH_SPEED (600)
    _evaderDashTimer = DASH_DISTANCE / DASH_SPEED = 40 / 600 = 0.0667 s
    _evaderDashing = true
    _evaderCooldown = COOLDOWN (2.0 s)
    break
```

Source: `src/entities/Enemy.js:459-482`; `src/config/BalanceConfig.js:609-614`

### D.14 Healer pulse

```
every PULSE_INTERVAL (1.0 s):
  for each enemy e ≠ self, e.active:
    if (e.x - self.x)² + (e.y - self.y)² <= AURA_RADIUS² (3600):
      e.hp = min(e.maxHp, e.hp + e.maxHp × HEAL_RATE (0.05))
```

Source: `src/entities/Enemy.js:531-549`; `src/config/BalanceConfig.js:653-655`

### D.15 Behavior assignment rate

```
globalWave = ((cycle - 1) × 5) + waveInCycle
behRate = isArcade ? BEHAVIOR_RATE_ARCADE (0.22) : BEHAVIOR_RATE (0.18)
extraBehChance = phaseMods._behaviorEscalation || 0
roll < (behRate + extraBehChance) → attempt behavior assignment
```

Available behaviors filtered by `globalWave >= MIN_WAVE[behavior]` and `_behaviorCounts[behavior] < CAPS[behavior]`. Source: `src/managers/WaveManager.js:325-345`

---

## E. Edge Cases

### E.1 Agent rendering when `CURRENCY_VARIANT` is cold (cache cold, missing symbol)

If `CURRENCY_VARIANT[symbol]` is not defined (e.g., a new currency added to FIAT_TYPES without a corresponding entry), `_variant()` returns the fallback `{ hat: 'tophat', acc: 'cigar', palette: 'forest' }`. The enemy renders as a default USA-Oligarch-style pilot regardless of its actual region or currency. The currency symbol still appears on the chest mark (which reads `this.symbol` directly). No crash, no missing render — but the visual is mismatched.

### E.2 Gravity Gate triggering during boss warmup (clearBattlefield)

When `clearBattlefield()` fires at boss spawn (called from `startBossWarning()`), `enemies = []` is cleared immediately. Any enemy mid-DWELL or mid-LEAVING is simply discarded — `_hoverState`, `_uprightFlip`, `_fireSuppressed` all disappear with the object. The next game object pool acquisition starts with fresh state from the constructor.

### E.3 Currency bullet with `null` symbol

If `bullet.symbol` is `null` or `undefined` (boss bullets, mini-boss bullets, or any path that skips `buildBullet`), the `if (this.symbol && bsCfg?.ENABLED)` guard in `drawEnemyBullet()` fails. The bullet falls through to shape-based rendering or `drawBossBullet()`. No crash.

Boss bullets additionally have `isBossBullet = true` which routes them to `drawBossBullet()` first, before the symbol check even runs. Source: `src/entities/Bullet.js:1228-1231`.

### E.4 Elite variant + behavior stacking

Both are assigned in sequence in `_spawnEnemyAt()` — elite first, then behavior. An enemy can be both ARMORED (2× HP, 2× score) and FLANKER (runs across screen). No mutual exclusion exists in code. The result is a high-HP flanker that is harder to kill before it rejoins formation.

A REFLECTOR + FLANKER combination is the most dangerous: the Flanker enters from the side during its RUN phase (when it is not yet in formation and thus harder to predict), while its first hit is absorbed. No special handling for this combination exists.

### E.5 Healer with empty field (no other active enemies)

`window.Game.enemies` is iterated. If the Healer is the last enemy alive, no `he !== this` target satisfies the distance check. The pulse timer still fires, no crash. The Healer waits at its formation position, healing nobody, until the player kills it.

### E.6 Hover-gate during entry burst (theoretical)

As described in C.2.4: entry burst clears at y=40 px; `_hoverY` minimum is `gameHeight × 0.25 ≈ 200 px`. An enemy cannot cross its `_hoverY` while still in entry burst. No conflict is possible.

### E.7 DWELL enemy and fire-budget interaction

A DWELL enemy has `vy = 0` and returns early from `update()`. It still appears in `window.Game.enemies`. The `HarmonicConductor` row-fire loop iterates enemies by approximate Y-rows — a DWELL enemy occupies a stable Y position and is continuously considered for fire targeting. The `_fireSuppressed` flag (during grace) and `_fireSuppressedByEntry` (impossible in DWELL, since entry burst cleared long before) are the only suppressors. After grace, the DWELL enemy fires normally from its frozen position.

### E.8 Symbol cache eviction race

`_symbolCache` is a static Map — shared across all Bullet instances. If 64 unique symbol+bucket combinations are seen, the oldest entry is evicted (insertion-order Map semantics). With 12 currencies × 3 buckets = 36 possible keys, the `CACHE_MAX (64)` is never reached in practice under normal play. A custom enemy symbol injected via console debug could reach the limit.

### E.9 Evader detecting player laser beam as bullet

The EVADER checks `window.Game._playerBullets` for upward bullets (`vy < 0`) within detect radius. Player laser beam bullets have `_elemLaser = true` and normal negative vy — they are treated identically to regular bullets by the EVADER detection code. The EVADER will dash to avoid laser hits, which is correct behavior.

### E.10 Behavior activation in V8 campaign

V8 enemies are spawned by `LevelScript.spawnBurst()` which calls `new Enemy(x, y, typeConf)` directly, without passing through `WaveManager._spawnEnemyAt()`. Therefore, no behavior (`enemy.behavior`) or elite flag (`enemy.isElite`) is ever assigned to V8 enemies. They always have `behavior = null` and `isElite = false`. Healer, Flanker, Bomber, Charger, Armored, Evader, and Reflector variants are Arcade-only for the current codebase.

---

## F. Dependencies

| System | File | Interaction |
|---|---|---|
| `Enemy` | `src/entities/Enemy.js` | Core entity. All four subsystems implemented here: `drawAgent()`, `_hoverState` machine, `_fireSuppressed` flags, `buildBullet()` symbol propagation, `takeDamage()` reflect intercept, behavior update loop |
| `Bullet` | `src/entities/Bullet.js` | `Bullet.symbol` field; `Bullet._symbolCache` static Map; `drawEnemyBullet()` dispatch; `drawSymbolBullet()` renderer; `_buildSymbolCacheEntry()` static method |
| `HarmonicConductor` | `src/systems/HarmonicConductor.js` | Reads `_fireSuppressed` and `_fireSuppressedByEntry` in row-fire loop (line 858-861) and `fireEnemy()` (line 944-947); calls `enemy.buildBullet()` to get bullet data including `symbol` |
| `WaveManager` | `src/managers/WaveManager.js` | Assigns `isElite`, `eliteType`, `behavior` in `_spawnEnemyAt()` (lines 293-365); tracks `_behaviorCounts` per wave |
| `LevelScript` | `src/v8/LevelScript.js` | Sets `_v8Fall = true` on V8 enemies (enabling Gravity Gate); does NOT call `_spawnEnemyAt()` — no elite/behavior for V8 enemies |
| `BalanceConfig` | `src/config/BalanceConfig.js` | `ENEMY_AGENT`, `HOVER_GATE`, `BULLET_SYMBOL`, `ELITE_VARIANTS`, `ENEMY_BEHAVIORS` blocks |
| `Constants.js` | `src/utils/Constants.js` | `CURRENCY_REGION` (12 entries), `CURRENCY_VARIANT` (12 entries) — read-only lookups |
| `main.js` | `src/main.js` | `harmonic_bullets` event handler acquires bullets from pool and sets `bullet.symbol` (line 932); V8/Arcade mode gate for `ownerColor` nulling (lines 933-935) |
| `CollisionSystem` | `src/systems/CollisionSystem.js` | Checks `takeDamage()` return value for `'reflect'` to handle Reflector bullet reflection |
| `ArcadeModifiers` | `src/systems/ArcadeModifiers.js` | `isArcadeMode()` predicate used in elite chance array selection and behavior rate selection |
| `window.Game.enemies` | global array in `main.js` | Healer reads this directly in its pulse loop to find nearby targets |
| `window.Game._playerBullets` | global array in `main.js` | Evader reads this directly for detection |

---

## G. Tuning Knobs

All keys live in `G.Balance` (`src/config/BalanceConfig.js`) unless noted.

### G.1 `ENEMY_AGENT` (BalanceConfig.js:677-685)

| Key | Value | Effect |
|---|---|---|
| `ENEMY_AGENT.ENABLED` | `true` | Master kill-switch. `false` → all regular enemies render as `drawMinion()` coin silhouette |
| `ENEMY_AGENT.WALK_CYCLE_MS` | `150` | Legacy; no longer consumed post-v7.9.1. Dead config key. |
| `ENEMY_AGENT.TIER_SCALE.WEAK` | `0.82` | Context transform scale for WEAK tier agents |
| `ENEMY_AGENT.TIER_SCALE.MEDIUM` | `1.00` | Baseline scale |
| `ENEMY_AGENT.TIER_SCALE.STRONG` | `1.22` | Scale for STRONG agents — "looms" |

To tune: modify `TIER_SCALE` values to spread visual threat differentiation. The `scoreVal` thresholds (35/70) that determine `_tier` are hardcoded in `Enemy.js:100` — not in BalanceConfig.

### G.2 `HOVER_GATE` (BalanceConfig.js:690-698)

This is the **primary reference** for Gravity Gate. The v8-scroller.md entry (G.5) is a secondary summary.

| Key | Value | Effect |
|---|---|---|
| `HOVER_GATE.ENABLED` | `true` | Master kill-switch. `false` → no enemy ever enters DWELL |
| `HOVER_GATE.HOVER_CHANCE` | `0.55` | Fraction of V8 enemies that roll `_hoverEnabled = true` at construction |
| `HOVER_GATE.Y_MIN` | `0.25` | Minimum hover-stop Y as fraction of game height |
| `HOVER_GATE.Y_MAX` | `0.45` | Maximum hover-stop Y as fraction of game height |
| `HOVER_GATE.DWELL_DURATION` | `6.0 s` | How long enemy holds upright before departing (v7.9.5b: was 10 s) |
| `HOVER_GATE.DWELL_FIRE_GRACE` | `1.5 s` | No-fire window at DWELL start ("settling") |
| `HOVER_GATE.EXIT_VY` | `-180 px/s` | Upward departure speed |

Note: `HOVER_GATE.EASE_IN_MS` was a dead config key (enemy snapped to halt rather than easing). Removed in v7.12.5.

### G.3 `BULLET_SYMBOL` (BalanceConfig.js:703-709)

| Key | Value | Effect |
|---|---|---|
| `BULLET_SYMBOL.ENABLED` | `true` | Kill-switch. `false` → all enemy bullets render as shape-based (coin/bill/bar/card) |
| `BULLET_SYMBOL.GLOW` | `true` | Warm gold radial glow painted on the offscreen canvas behind the glyph |
| `BULLET_SYMBOL.SPIN` | `false` | If `true`, glyph rotates at `age × 2 rad/s` around bullet center |
| `BULLET_SYMBOL.SIZE_MUL` | `1.0` | Global canvas draw size multiplier (tune for mobile legibility) |
| `BULLET_SYMBOL.CACHE_MAX` | `64` | LRU eviction threshold for `_symbolCache` |

Note: `TRAIL_ALPHA` is referenced in `drawSymbolBullet()` as `cfg.TRAIL_ALPHA ?? 0.42` but is not defined in BalanceConfig. The fallback value `0.42` is always used. (See Documented Gaps.)

### G.4 `ELITE_VARIANTS` (BalanceConfig.js:590-627)

| Key | Value | Effect |
|---|---|---|
| `ELITE_VARIANTS.ENABLED` | `true` | Master kill-switch for all elite variant assignment |
| `ELITE_VARIANTS.CYCLE_VARIANTS` | `{1:'ARMORED', 2:'EVADER', 3:'REFLECTOR'}` | One variant type active per cycle |
| `ELITE_VARIANTS.ELIGIBLE_TIERS` | `['MEDIUM', 'STRONG']` | WEAK enemies never become elites |
| `ELITE_VARIANTS.CHANCE.STORY` | `[0.10, 0.15, 0.20]` | Spawn chance per cycleIdx (C1/C2/C3) in Story |
| `ELITE_VARIANTS.CHANCE.ARCADE` | `[0.15, 0.20, 0.25]` | Spawn chance per cycleIdx in Arcade |
| `ELITE_VARIANTS.CHANCE.BEAR_BONUS` | `0.05` | Added to chance in Bear Market |
| `ELITE_VARIANTS.ARMORED.HP_MULT` | `2.0` | HP multiplier for Armored |
| `ELITE_VARIANTS.ARMORED.SCORE_MULT` | `2.0` | Score value multiplier for Armored |
| `ELITE_VARIANTS.ARMORED.SPEED_MULT` | `0.8` | **Not applied** — declared but not consumed in spawner (see Documented Gaps) |
| `ELITE_VARIANTS.ARMORED.SHEEN_COLOR` | `'#c0c8d0'` | Metallic sheen overlay color |
| `ELITE_VARIANTS.ARMORED.SHEEN_ALPHA` | `0.25` | Sheen overlay alpha |
| `ELITE_VARIANTS.ARMORED.ICON_SIZE` | `8` | Shield icon half-size in px |
| `ELITE_VARIANTS.EVADER.DETECT_RADIUS` | `60 px` | Bullet detection range |
| `ELITE_VARIANTS.EVADER.DASH_DISTANCE` | `40 px` | Distance of each dash |
| `ELITE_VARIANTS.EVADER.DASH_SPEED` | `600 px/s` | Lateral dash speed |
| `ELITE_VARIANTS.EVADER.COOLDOWN` | `2.0 s` | Minimum time between dashes |
| `ELITE_VARIANTS.EVADER.LINE_ALPHA` | `0.4` | Speed-line alpha when dashing |
| `ELITE_VARIANTS.EVADER.LINE_COUNT` | `3` | Number of speed lines when dashing |
| `ELITE_VARIANTS.REFLECTOR.CHARGES` | `1` | Number of bullets absorbed before breaking |
| `ELITE_VARIANTS.REFLECTOR.REFLECT_SPEED` | `200 px/s` | Speed of reflected bullet |
| `ELITE_VARIANTS.REFLECTOR.REFLECT_SPREAD` | `0.3 rad` | Spread angle of reflected bullet |
| `ELITE_VARIANTS.REFLECTOR.SHIMMER_SPEED` | `0.006` | Hue rotation speed (hue = Date.now() × speed) |
| `ELITE_VARIANTS.REFLECTOR.SHIMMER_ALPHA` | `0.3` | Active shimmer ring alpha |
| `ELITE_VARIANTS.REFLECTOR.BROKEN_ALPHA` | `0.08` | Broken dashed ring alpha |

Individual variant kill-switches: `ELITE_VARIANTS.ARMORED.ENABLED`, `.EVADER.ENABLED`, `.REFLECTOR.ENABLED` — checked before spawn roll.

### G.5 `ENEMY_BEHAVIORS` (BalanceConfig.js:629-670)

| Key | Value | Effect |
|---|---|---|
| `ENEMY_BEHAVIORS.ENABLED` | `true` | Master kill-switch for all behavior assignment and update |
| `ENEMY_BEHAVIORS.BEHAVIOR_RATE` | `0.18` | Base assignment probability per enemy in Story |
| `ENEMY_BEHAVIORS.BEHAVIOR_RATE_ARCADE` | `0.22` | Base probability in Arcade |
| `ENEMY_BEHAVIORS.CAPS.FLANKER` | `4` | Max Flankers per wave |
| `ENEMY_BEHAVIORS.CAPS.BOMBER` | `2` | Max Bombers per wave |
| `ENEMY_BEHAVIORS.CAPS.HEALER` | `1` | Max Healers per wave |
| `ENEMY_BEHAVIORS.CAPS.CHARGER` | `3` | Max Chargers per wave |
| `ENEMY_BEHAVIORS.MIN_WAVE.FLANKER` | `3` | Global wave ≥ 3 (C1W3) |
| `ENEMY_BEHAVIORS.MIN_WAVE.BOMBER` | `7` | Global wave ≥ 7 (C2W2) |
| `ENEMY_BEHAVIORS.MIN_WAVE.HEALER` | `8` | Global wave ≥ 8 (C2W3) |
| `ENEMY_BEHAVIORS.MIN_WAVE.CHARGER` | `7` | Global wave ≥ 7 (C2W2) |
| `ENEMY_BEHAVIORS.FLANKER.ENTRY_SPEED` | `250 px/s` | Lateral run speed |
| `ENEMY_BEHAVIORS.FLANKER.FIRE_INTERVAL` | `0.8 s` | Fire period during run |
| `ENEMY_BEHAVIORS.FLANKER.RUN_DURATION` | `3.0 s` | Duration of run before settling |
| `ENEMY_BEHAVIORS.FLANKER.JOINS_FORMATION` | `true` | After run, re-enters formation |
| `ENEMY_BEHAVIORS.BOMBER.BOMB_COOLDOWN` | `4.0 s` | Period between bomb drops |
| `ENEMY_BEHAVIORS.BOMBER.BOMB_SPEED` | `80 px/s` | Bomb descent speed |
| `ENEMY_BEHAVIORS.BOMBER.ZONE_DURATION` | `2.0 s` | Hazard zone linger time |
| `ENEMY_BEHAVIORS.BOMBER.ZONE_RADIUS` | `40 px` | Hazard zone radius |
| `ENEMY_BEHAVIORS.HEALER.AURA_RADIUS` | `60 px` | Heal pulse range |
| `ENEMY_BEHAVIORS.HEALER.HEAL_RATE` | `0.05` | 5% maxHp healed per pulse |
| `ENEMY_BEHAVIORS.HEALER.PULSE_INTERVAL` | `1.0 s` | Time between heal pulses |
| `ENEMY_BEHAVIORS.CHARGER.CHARGE_INTERVAL` | `5.0 s` | Idle wait between charges |
| `ENEMY_BEHAVIORS.CHARGER.WINDUP_TIME` | `0.5 s` | Telegraph shake before charge |
| `ENEMY_BEHAVIORS.CHARGER.CHARGE_DISTANCE` | `80 px` | Downward charge travel |
| `ENEMY_BEHAVIORS.CHARGER.CHARGE_SPEED` | `500 px/s` | Charge descent speed |
| `ENEMY_BEHAVIORS.CHARGER.RETREAT_SPEED` | `200 px/s` | Return-to-origin speed |
| `ENEMY_BEHAVIORS.CHARGER.WINDUP_SHAKE` | `2 px` | Shake amplitude during windup |

Individual kill-switches: `FLANKER.ENABLED`, `BOMBER.ENABLED`, `HEALER.ENABLED`, `CHARGER.ENABLED`.

### G.6 `CURRENCY_REGION` and `CURRENCY_VARIANT` lookup tables

Location: `src/utils/Constants.js:818-859`. Not in BalanceConfig.

To add a new currency:
1. Add to `CURRENCY_REGION` with one of `'USA'`, `'EU'`, `'ASIA'`.
2. Add to `CURRENCY_VARIANT` with `{hat, acc, palette}`. Use existing hat/accessory/palette names or add new primitives to `_drawHat()` / `_drawAccessory()` in `Enemy.js`.

Without a `CURRENCY_VARIANT` entry, the enemy renders as a default tophat-cigar-forest Oligarch regardless of region.

---

## H. Acceptance Criteria

Each criterion is independently testable.

### H.1 Agent renders for all 12 currencies

**Test:** In campaign, observe one of each of the 12 currency types on screen.
**Pass:** Each renders a distinct pilot+vehicle combination matching the CURRENCY_VARIANT table (C.1.2). No currency shows the fallback minion coin silhouette (unless `ENEMY_AGENT.ENABLED = false`).

### H.2 Kill-switch degrades to minion silhouette

**Test:** Set `Balance.ENEMY_AGENT.ENABLED = false`. Start a wave.
**Pass:** All regular enemies render as the coin+wing `drawMinion()` silhouette. No crash.

### H.3 Y-flip: pilot heads face downward in normal descent

**Test:** Observe a DIVE enemy on a V8 level. The pilot's head should be at the bottom; the vehicle thrusters at the top.
**Pass:** Head-down orientation confirmed.

### H.4 Upright flip during Gravity Gate DWELL

**Test:** Observe a DWELL enemy. Pilot should stand upright (head up), thrusters below the vehicle.
**Pass:** `_uprightFlip === true`; pilot facing correct direction; chest mark glyph reads upright (not mirrored).

### H.5 Gravity Gate HOVER_CHANCE is ~55%

**Test:** Spawn 200 V8 DIVE enemies. Count `_hoverEnabled === true`.
**Pass:** ~110 ±20 enemies have hover enabled.

### H.6 Gravity Gate only activates on DIVE/SINE/SWOOP, not HOVER pattern

**Test:** Force-spawn a HOVER-pattern enemy. Observe over 10 seconds.
**Pass:** `_hoverState` stays `'IDLE'`; enemy follows scripted HOVER pattern (approach → scripted dwell → leave). No `_uprightFlip` changes.

### H.7 Gravity Gate fire grace: no bullets for 1.5 s after DWELL entry

**Test:** Breakpoint or counter on `HarmonicConductor.fireEnemy()` filtered to a specific DWELL enemy.
**Pass:** Zero `fireEnemy()` calls for first 1.5 s ±0.1 s of DWELL; calls resume after.

### H.8 LEAVING enemy exits upward at EXIT_VY

**Test:** Log `enemy.vy` at `_hoverState === 'LEAVING'`.
**Pass:** `vy === -180` (constant, no acceleration applied during LEAVING).

### H.9 Currency-symbol bullets render as the shooter's glyph

**Test:** Observe a € enemy fire. Check `bullet.symbol`.
**Pass:** `bullet.symbol === '€'`; bullet renders the € glyph (visible, not a coin shape); `Bullet._symbolCache.has('€|S')` (or M/L) is true after first fire.

### H.10 BULLET_SYMBOL kill-switch falls back to shape rendering

**Test:** Set `Balance.BULLET_SYMBOL.ENABLED = false`. Trigger enemy fire.
**Pass:** Bullets render as coin/bill/bar/card shapes. Symbol cache remains empty.

### H.11 Bullet symbol cache size bounded by CACHE_MAX

**Test:** Fire 200 bullets across many symbol/size combinations exceeding 64 unique keys.
**Pass:** `Bullet._symbolCache.size <= 64` at all times; oldest entries are evicted correctly.

### H.12 Boss bullets do not render as symbol bullets

**Test:** Fight a boss. Observe boss projectiles.
**Pass:** Boss bullets render as `drawBossBullet()` (pulsing halo, no glyph); `isBossBullet === true` on each; `bullet.symbol === null`.

### H.13 ARMORED elite has 2× HP and 2× score

**Test:** C1 Arcade. Find an ARMORED enemy (metallic sheen). Read `enemy.hp` and `enemy.scoreVal`.
**Pass:** `hp ≈ 2 × non-elite_hp_same_type`; `scoreVal ≈ 2 × non-elite_scoreVal`. Verify MEDIUM or STRONG tier (WEAK never elite).

### H.14 EVADER dashes away from incoming player bullets

**Test:** C2 Arcade. Fire at an EVADER from close range (within 60 px).
**Pass:** `_evaderDashing === true` within one frame; enemy x-position shifts away from bullet; speed-lines appear. Cooldown prevents re-dash within 2 s.

### H.15 REFLECTOR absorbs first hit, takes damage on second

**Test:** C3 Arcade. Hit a REFLECTOR once.
**Pass:** `takeDamage()` returns `'reflect'`; `reflectCharges === 0`; `_reflectBroken === true`; enemy hp unchanged. Hit again: hp decreases normally.

### H.16 HEALER restores HP to adjacent enemies every 1 s

**Test:** C2W3+ Arcade. Identify a HEALER. Partially damage a nearby enemy (within 60 px). Watch HP over 2 s.
**Pass:** Damaged enemy HP increases by ~5% maxHp per second (±1 frame timing). Green aura visible on HEALER.

### H.17 FLANKER enters from screen edge, fires, then joins formation

**Test:** C1W3+ Arcade. Observe a FLANKER (gold chevron in transit).
**Pass:** Enemy spawns off-screen (`x < 0` or `x > gameWidth`); runs laterally for ~3 s firing; then `isEntering = true` — enemy curves to a formation slot.

### H.18 CHARGER telegraphs and dives downward

**Test:** C2W2+ Arcade. Observe a CHARGER during WINDUP phase.
**Pass:** `_behaviorPhase === 'WINDUP'` for 0.5 s with shake; transitions to CHARGING (rapid downward 80 px); RETREATING (upward); IDLE cooldown 5 s.

### H.19 Behaviors and elites do not appear on V8 campaign enemies

**Test:** Start V8 campaign. Inspect all enemies via `window.Game.enemies.map(e => ({elite: e.isElite, beh: e.behavior}))`.
**Pass:** All entries show `{elite: false, behavior: null}`.

### H.20 Elite/behavior not assigned to WEAK tier enemies (elite check only)

**Test:** C1 Story/Arcade. Inspect enemies with `scoreVal < 35` (WEAK).
**Pass:** None have `isElite === true`. Behaviors may still be assigned to WEAK (behavior code has no tier filter).

### H.21 Bear Market increases elite chance by 5 pp

**Test:** Set `window.isBearMarket = true`. Run C1 Arcade. Sample 100 MEDIUM/STRONG enemies.
**Pass:** Elite rate ≈ 20% (`0.15 + 0.05`) vs. 15% without Bear Market.

### H.22 Hover-gate ENABLED = false is a clean kill-switch

**Test:** Set `Balance.HOVER_GATE.ENABLED = false`. Spawn 50 DIVE enemies in V8.
**Pass:** No enemy enters DWELL state (`_hoverState` stays `'IDLE'`). No upright flip. No fire suppression.

### H.23 Behavior cap enforced per wave (HEALER cap = 1)

**Test:** C2W3+ Arcade. Observe one full wave.
**Pass:** At most 1 HEALER appears in the wave despite >1 MEDIUM/STRONG enemies rolled for behavior.

### H.24 `ENEMY_BEHAVIORS.ENABLED = false` suppresses all behaviors

**Test:** Set `Balance.ENEMY_BEHAVIORS.ENABLED = false`. Start Arcade from C1W3+.
**Pass:** No enemy has `behavior !== null`. No flanking, bombing, healing, or charging observed.

---

## Documented Gaps

### Gap 1 — ~~`ENEMY_AGENT.WALK_CYCLE_MS` dead config~~ — **Resolved v7.12.7**: key removed.

### Gap 2 — ~~`ELITE_VARIANTS.ARMORED.SPEED_MULT` declared but never applied~~ — **Resolved v7.12.7**: key removed + CLAUDE.md corrected. "Armored = slower" feature deferred as potential future work (would require propagating mult into grid speed and V8 pattern vy).

### Gap 3 — ~~`BULLET_SYMBOL.TRAIL_ALPHA` missing from config~~ — **Resolved v7.12.7**: `TRAIL_ALPHA: 0.42` added to BalanceConfig `BULLET_SYMBOL` block. Now tunable.

### Gap 4 — ~~CLAUDE.md "Bomber C2W1+" stale~~ — **Resolved v7.12.7**: CLAUDE.md corrected to "C2W2+".

### Gap 5 — ~~CLAUDE.md "1 per cycle" imprecise~~ — **Resolved v7.12.7**: CLAUDE.md clarified to "one elite type per cycle (not a numeric cap)".

### Gap 6 — Gravity Gate state survives `LevelScript.loadLevel()` on enemies alive during level end

`LevelScript.loadLevel()` calls `clearBattlefield()` which sets `enemies = []`. Any mid-DWELL enemy is dereferenced. If the level ends by timeout (rather than boss defeat) while enemies are in DWELL, they are simply discarded. No state corruption — object pool reuse starts fresh.

### Gap 7 — Reflector reflected bullet spawning not documented in `Enemy.js`

`takeDamage()` returns `'reflect'` but does not spawn a reflected bullet itself. The caller (`CollisionSystem`) must check for the `'reflect'` return value and spawn the reflected projectile. The `REFLECT_SPEED` and `REFLECT_SPREAD` config values are consumed there. This creates a design contract between `Enemy` and `CollisionSystem` that is not visible in `Enemy.js` alone.

*End of GDD — Enemy Agents v7.12.4*
