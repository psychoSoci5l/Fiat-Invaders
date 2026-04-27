# Art Bible — Section 5: Character Design Direction

## 5.1 Player Ships: Visual Archetypes

The player flies an 8-vertex inverted-V delta (wedge shape). All three ship types share this topology but vary in proportion, color, and statistical footprint to communicate role at a glance.

### 5.1.1 BTC Striker (Balanced)

- **Accent color** (`SHIP_DISPLAY.BTC.accent`): `#bb44ff` (violet)
- **Body**: dark violet `#2a2040` left half, lighter `#6644aa` right half
- **Nose**: `#4d3366` dark, `#9966cc` light
- **Fins**: teal-cyan `#1a4455` / `#2a6677`
- **Silhouette**: base geometry — wingSpan 40px, shoulderW 13px, tipY -36, wingTipY +36
- **Role communication**: The violet/cyan hue sits at the center of the player's color spectrum. Mid-range wing span and shoulder width visually communicate "no extreme." The balanced asymmetry (dark left/light right halves with violet accent glow) suggests a dual-nature asset — both store of value and medium of exchange.
- **Stat bars visible in hangar**: SPD 5/10, PWR 6/10, HIT 5/10

### 5.1.2 ETH Heavy (Broad, Slow)

- **Accent color**: `#8c7ae6` (muted blue-purple)
- **Body**: dark navy `#1a2040` / lighter slate `#4a5a8e`
- **Nose**: `#2a3366` / `#7a8ecc`
- **Fins**: deep teal `#1a3455` / `#2a5077`
- **Silhouette**: widest at same base wingSpan, but the heavier body fill and broader shoulder visually imply mass. The nose gradient is deeper, suggesting a denser forward section.
- **Role communication**: The cooler, more reserved purple communicates stability and bulk. Lower saturation than BTC implies "enterprise grade, not flashy." The stat distribution (SPD 3/10, PWR 8/10, HIT 3/10) is reinforced visually by the wider darker body — the ship looks like it takes more space and hits harder.
- **Contract tracking**: ETH's Smart Contract mechanic (consecutive-hit stacking) has no separate visual — the damage multiplier is communicated solely through hit flash frequency and score float color.

### 5.1.3 SOL Speedster (Narrow, Fast)

- **Accent color**: `#00d2d3` (bright cyan-teal)
- **Body**: dark teal `#0a2a2a` / lighter `#1a6a6a`
- **Nose**: `#0a3a3a` / `#2a8a8a`
- **Fins**: deep cyan `#0a3455` / `#1a5a77`
- **Role communication**: The coolest, brightest hue signals speed. Cyan is associated with throughput, data transfer, and liquidity. The lighter overall fill makes the ship appear less massive. SPD 9/10, PWR 5/10, HIT 8/10 — the narrow silhouette and bright color say "hard to hit, easy to move."

### 5.1.4 Weapon Level Visual Progression (All Ships)

As weapon level increases from 1 to 3 (max), the ship geometry evolves mechanically:

| Feature | LV1 | LV2 | LV3 | GODCHAIN |
|---------|-----|-----|-----|----------|
| wingSpan | 40 | 43 | 46 | 50 |
| shoulderW | 13 | 14 | 16 | 17 |
| wing chord plates | none | none | armor plates appear | armor + red shift |
| panel lines | none | cyan accent lines | thicker, with chord lines | red glow lines |
| cannonLen | 10 | 10 | 10 | 10 |
| barrelW | 0 | 0 | 5 | 6 |

LV2 adds horizontal panel accent lines across the body. LV3 adds armored plates on the wing leading edges (35% and 65% along the shoulder-to-wingtip edge). GODCHAIN mode widens everything by ~25% and shifts the entire palette to red/orange (see Section 5.6).

## 5.2 Distinguishing Feature Rules (Faction Recognition)

These visual rules are inviolable. They guarantee the player can identify any entity's role within 200ms at full camera scroll speed.

### 5.2.1 Player vs Everything Else

| Cue | Player | Enemy | Boss | Minion | Ally (none yet) |
|-----|--------|-------|------|--------|--------|
| Shape | 8-vertex inverted-V delta | Humanoid bust + vehicle (agents) or coin shape (minions) | Architectural institution geometry | Small coin with currency glyph | N/A |
| Core hitbox | Visible pulsing white dot when bullets near | None visible (enemies use full body) | None visible | None visible | N/A |
| Trail | Afterimage trail when vx > 100px/s (3 ghosts max, 0.2 alpha) | None | None | None | N/A |
| Exhaust | Twin orange-white flames at inner tail (Y+13) | Vehicle thrusters (orange/blue) | Side emitters (P2+) | None | N/A |
| Bank angle | Ship tilts with lateral movement (max ~12.6 deg) | Rotation only during entry or HOVER DWELL | None | None | N/A |
| Shield | Cyan energy-skin conforming to ship (pulsing + sparks) | None | Phase transition barrier (shake glow) | None | N/A |

### 5.2.2 Player Ship Color Invariants

- BTC always violet (`#bb44ff` accent, `#2a2040`/`#6644aa` body)
- ETH always muted purple (`#8c7ae6`)
- SOL always cyan (`#00d2d3`)
- GODCHAIN overrides all with red/orange palette (see 5.6)

### 5.2.3 Enemy vs Boss vs Minion

| Cue | Enemy (Agent) | Boss | Minion |
|-----|---------------|------|--------|
| Scale | 58x58px (tier-scaled: WEAK 0.82, MEDIUM 1.0, STRONG 1.22) | 160x140px (entrance from top) | 44x44px (small coin) |
| Structure | 3-layer: vehicle + pilot bust + chest mark | Single massive geometry (pyramid/ring/torii) | Single circular coin shape |
| Movement | Grid-based descent with pattern oscillation | Horizontal patrol with phase-specific patterns | Bob up/down following boss |
| HP bar | None | Thin bar above boss, color-coded to boss type | None |
| Glow | Neon halo (radius 20, alpha 0.35, pulses) | Massive radial aura (radius 85-130 depending on boss/phase) | Danger glow when near player |
| Death VFX | Elemental fragments + tier-scaled explosion | 6-chain explosions + coin rain + evolution item | Standard explosion |

## 5.3 Enemy Agent Design Philosophy (v7.9 "Agents of the System")

Every enemy is a humanoid pilot seated inside a vehicle. The pilot bust, vehicle hull, and chest-mark currency symbol form a three-layer visual stack. At 58px nominal size, every pixel must earn its place.

### 5.3.1 The Three-Layer System

```
Layer 1: Vehicle (drawn FIRST, behind pilot)
  └─ Positions the agent in the world
  └─ Regional hull style + thruster animation
Layer 2: Pilot bust (drawn SECOND, inside cockpit frame)
  └─ Head + torso + hat + accessories
  └─ Subtle hover bob (sinusoidal, 0.8px amplitude)
Layer 3: Chest mark (drawn THIRD, on top of pilot)
  └─ Currency symbol as brand emblem, not label
  └─ Tier-scaled size + STRONG-only gold glow
```

### 5.3.2 Regional Families (Distinct at 58px)

#### USA/Oligarch — "Stealth Wedge" (symbols: $, Ⓒ)

- **Vehicle**: Dark gray delta-wing (F-117 feel), twin orange thrusters with flicker, accent stripe in currency color across leading edge
- **Pilot**: Broad-shouldered dark suit and tie, pale skin, cold dot eyes, flat-line mouth
- **Hats**: tophat ($), stetson (C$), cowboy (cad), ushanka (₽)
- **Accessories**: cigar (STRONG), kerchief (Canadian), cane (aristocrat), monocle (₽ oligarch)
- **Chest mark**: Pale-gold glyph (`#f2e7b8`) stamped on the red tie, stroke-outlined for legibility. STRONG: gold shadow glow.
- **Readability silhouette**: Wide shoulders + tall hat = "moneyed power." The cigar smoke puff (even at 58px, a single translucent circle) signals arrogance.

#### EU/Bureaucrat — "Diplomatic Shuttle" (symbols: €, £, ₣, ₺)

- **Vehicle**: Navy oval fuselage with 3 gold-rimmed portholes, gold tail fin, central blue-white flame
- **Pilot**: Narrower torso, thinner tie, gold lapel pin, moustache, monocle-ready right eye (smaller)
- **Hats**: bowler (€), topBrit (£), beret (₣), fez (₺)
- **Accessories**: newspaper, baguette, worrybeads, pipe — all "civil servant" props
- **Chest mark**: Currency symbol drawn inside a gold monocle ring with chain to collar. STRONG: gold ring glow.
- **Readability silhouette**: Narrow shoulders + rounded hat = "paper pusher." The porthole vehicle reads as civilian transport.

#### ASIA/Ronin — "Mech Quad-Drone" (symbols: ¥, 元, ₹)

- **Vehicle**: Dark hull central cockpit pod with gold trim ring, 4 red lacquer rotors in X-configuration (motion blur via alpha flicker), central red sensor eye
- **Pilot**: Mechanical samurai armor — shoulder pauldrons, gold-rimmed breastplate, red lacquer joint dots, menpo face guard with horizontal slit
- **Hats**: kabuto (standard/wide/dragon-crest), turban (₹)
- **Accessories**: tanto, fan, saber, scroll — militarist/ceremonial
- **Chest mark**: Gold disc (mon) on breastplate with currency symbol in dark contrast. STRONG: gold halo ring.
- **Readability silhouette**: Angular armor plates + horned kabuto = "warrior." The quad-rotor vehicle with red discs reads as aggressive tech.

### 5.3.3 Regional Palette Summary

| Region | Palette Names | Suit Range | Accent | Vehicle Hull |
|--------|--------------|------------|--------|-------------|
| USA | forest, burgundy, tan, steelblue | Green/red/brown/blue suits | Currency color stripe | `#1a1d24` delta-wing |
| EU | charcoal, navy, wine, olive | Gray/navy/burgundy/olive | Gold trim | `#1a2a52` oval |
| ASIA | nightBlack, deepRed, saffron, imperial | Black/red/amber/purple armor | Gold + red lacquer | `#1a1a24` quad-rotor |

## 5.4 Tier Communication (WEAK / MEDIUM / STRONG)

Tiers are derived from score value in `Enemy._tier`. No text labels — purely visual.

### 5.4.1 Global Tier Signals

| Signal | WEAK | MEDIUM | STRONG |
|--------|------|--------|--------|
| **Body scale** | 0.82x | 1.0x (baseline) | 1.22x |
| **Hat complexity** | Bare head or simple hat | Standard hat | Hat + crest/accessory |
| **Accessories** | None | Secondary accessory (non-cigar for USA) | Always full accessory (cigar/saber/cane) |
| **Chest mark size** | 0.85x | 1.0x | 1.35x (glyph dominates chest) |
| **Chest mark glow** | None | None | Gold shadow glow (shadowBlur 4-5) |
| **Behavior** | May be kamikaze (dives at player) | Standard grid combat | May teleport, special abilities |
| **Explosion VFX** | `EXPLOSION_WEAK`: 6 particles, 1 ring, 0.30s | `EXPLOSION_MEDIUM`: 10 particles, 1 ring, 0.40s | `EXPLOSION_STRONG`: 14 particles, 2 rings, 0.55s, white flash |

### 5.4.2 Tier by Currency Symbol (from BalanceConfig)

```
STRONG: $, 元, Ⓒ      (scoreVal >= 70)
MEDIUM: €, £, ₣, ₺     (scoreVal 35-69)
WEAK:   ¥, ₽, ₹        (scoreVal < 35)
```

STRONG enemies feel like mini-bosses. The 1.22x scale makes them loom 22% larger than MEDIUM, and the gold glow on the chest mark creates a clear "this one is special" signal. MEDIUM enemies are the baseline encounter. WEAK enemies are visibly smaller and come bare-headed — the player learns to prioritize them as "easy kills" for meter building.

### 5.4.3 Elite Variant Overlays (v5.32)

Elite variants (ARMORED / EVADER / REFLECTOR) add supplementary visual signals on top of tier:

| Elite | Visual Overlay | Color |
|-------|----------------|-------|
| ARMORED | Metallic sheen sweep across body + shield icon above | `#c0c8d0` sheen |
| EVADER | Speed lines when dashing (horizontal streaks) | `#00f0ff` lines |
| REFLECTOR | Prismatic shimmer arc (hue rotation) or broken dashed arc when depleted | HSL hue rotation / `#888` dashed |

## 5.5 Boss Character Design

Each boss is a financial institution rendered as architectural geometry. The design communicates personality through structure, movement, and phase escalation.

### 5.5.1 FED — The Corrupted Printer (Pyramid + Eye)

- **Identity**: The Federal Reserve. Aggressive, rapid attacks. Money printer always running.
- **Geometry**: Massive pyramid (110px wide, 90px tall) with an all-seeing eye at center. Floating `$` symbols orbit the pyramid. Internal scan lines scroll vertically like ticker tape.
- **Personality expressed through movement**: P1 slow patrol, P2 erratic with vertical oscillation, P3 RAGE mode with jittery sine-wave tracking + minion printing.
- **Phase color progression**:
  - P1: neon green (RGB 57/255/20) — "healthy economy" facade
  - P2: warning orange (RGB 255/170/0) — "caution"
  - P3: corruption red (RGB 255/34/68) — "meltdown"
- **Phase 3 tells**: Matrix-style `$` rain inside pyramid, red corruption tint overlay, pupil afterimage trail (eye tracking too fast for the eye to follow), glitch artifacts (5 horizontal scanline breaks), side emitters fire rapidly.
- **Eye animation**: P1 steady. P2 pupil oscillates (sin `t*3`). P3 pupil races (cos `t*6` / sin `t*5`) with 4-frame afterimage trail — the eye has literally lost control.
- **Minions**: Green `$` coins with boss color tint.

### 5.5.2 BCE — The Star Fortress (Golden Ring + Stars)

- **Identity**: European Central Bank. Bureaucratic, methodical, bullet walls. Patience is the weapon.
- **Geometry**: 12 gold star nodes in a ring (EU flag reference) connected by energy lines to a blue core center with a glowing `€` hologram. The core is a segmented golden ring (12 segments, slight gaps).
- **Personality expressed through movement**: P1 very slow patrol (bureaucracy). P2 slight vertical oscillation + spiral attacks. P3 fragmentation — double counter-rotating barrier rings + all 12 stars fire independently.
- **Phase progression**:
  - P1: deep EU blue (RGB 0/51/153), gold nodes connected node-to-node (EU flag intact)
  - P2: medium blue, spiral attacks, delayed explosion bombs
  - P3: corrupted dark blue (RGB 0/17/51), node-to-node connections break, nodes pulse independently, gold ring segments disappear (1/3 missing), cracks with light leaking from core, debris particles orbit
- **P3 tells**: The golden ring has missing segments — structural integrity is failing. Light leaks through cracks radiating from the `€` center. Star nodes pulse out of sync with each other (individual fragmentation, not collective).
- **Minions**: Blue `€` minions.

### 5.5.3 BOJ — The Golden Torii (Gate + Sun)

- **Identity**: Bank of Japan. Zen precision, then sudden intervention. Hypnotic patterns followed by lethal bursts.
- **Geometry**: Gold torii gate (two pillars + curved kasagi crossbar + straight nuki crossbar) with a large `¥` symbol suspended between the pillars. Behind it, 16 rising-sun rays rotate.
- **Personality expressed through movement**: P1 smooth zen oscillation (wave at center). P2 yield curve control — smooth waves with sudden intervention dashes. P3 full intervention — unpredictable pattern with zen pauses and aggressive movements alternating every ~1.5s.
- **Phase progression**:
  - P1: deep red (RGB 188/0/45), slow ray rotation, gold fill intact
  - P2: medium red (RGB 139/0/35), yield curve EKG line appears below gate, INTERVENTION flash text
  - P3: near-black red (RGB 107/0/25), gate distorts (wave distortion `sin(t*6)*3`), gold turns incandescent orange (RED shifts up, GREEN oscillates), heat haze lines above gate, molten drips from crossbar
- **P3 tells**: The torii gate visibly warps. Gold becomes orange-hot (incandescent). Heat shimmer rises above the structure. Molten gold drips from the crossbar. The gate is melting down.
- **Minions**: Red `¥` minions.

## 5.6 Damage / Death Visualization Philosophy

The game communicates enemy health degradation through structural and energetic cues — no HP bars on regular enemies.

### 5.6.1 Damage Intensity System

When an enemy's HP drops below 50% (`DAMAGE_VISUAL.THRESHOLD`), a `_damageIntensity` value scales from 0 (just damaged) to 1 (near death). This drives four simultaneous effects:

#### A. Body Darkening
```javascript
this._bodyFill = CU.darken(this.color, 0.4 + 0.12 * this._damageIntensity);
```
The enemy body darkens progressively. At full intensity, it's nearly black — the "life" has drained out of it.

#### B. Outline Flicker
- Frequency: 18Hz sine wave
- Width oscillates between 1.0px (intact) and 4.5px (near death)
- Random glitch spikes: 2.5x width multiplier at `GLITCH_CHANCE * intensity` probability
- Effect: the outline "loses signal" like a damaged neon tube

#### C. Neon Sparks
Bright-colored sparks (matching the enemy's `_colorBright`) emit at intervals ranging from 0.28s (low damage) to 0.10s (near death):
```
interval = INTERVAL_SLOW + (INTERVAL_FAST - INTERVAL_SLOW) * intensity
```
Sparks are radial (random angle), speed 40-80px/s, lifetime 0.25s. They create the impression of short-circuiting electronics.

#### D. Fracture Lines (Cracks)
Generated once when damage first crosses threshold, then drawn progressively:
- 2 cracks visible at threshold, up to 5 near death
- Each crack has 3 points (start, jagged midpoint, end) for organic appearance
- Alpha scales from 0.4 to 0.9 with damage intensity
- Cracks use `_colorBright` (neon version of enemy color) — they literally "bleed light"

#### E. Glow Destabilization
- Pulse speed doubles (2.5x multiplier at max intensity)
- Base alpha drops to 55% of normal
- Glow desaturates (lightened toward white by 0.2 factor)
- The halo stutters and fades — the enemy's "financial aura" collapses

### 5.6.2 Hit Reaction (Instant Feedback)

Every hit triggers:
1. **Hit flash**: White fill for 0.04s (`hitFlash` timer decremented at rate 8)
2. **Hit shake**: 2px random jitter for 0.06s (recoil from impact)
3. **Elemental tint** (if applicable): 0.15s colored flash (fire=orange, laser=cyan, electric=purple)
4. **Glow pulse**: Brief destabilization of the additive halo

### 5.6.3 Death (Enemy Destroyed)

On kill (`takeDamage` returns `hp <= 0`):

1. **Cyber Destruction Fragments**: Rectangular fragments (3-8px wide, 2-5px tall) fly outward with random rotation — the enemy shatters into data shards
2. **Elemental death tint**: Fragments tinted with current elemental color (FIRE/LASER/ELECTRIC) if elemental perks are active
3. **Tier-scaled explosion**:
   - WEAK: 6 particles, 1 ring, 0.30s = quick pop
   - MEDIUM: 10 particles, 1 ring, 0.40s = satisfying burst
   - STRONG: 14 particles, 2 rings, 0.55s + white flash = significant event
4. **Glow death flash**: Lingering glow (radius 40, 0.4s) at the death location, creating a "heat ghost" effect

### 5.6.4 Boss Death Sequence (Cinematic)

Boss death uses a 6-chain timed explosion sequence (v5.11):
```
Chain times: [0.0, 0.4, 0.8, 1.3, 1.8, 2.5] seconds
Chain offsets: various positions across boss body
Chain scale: [1.0, 0.8, 0.9, 1.0, 1.1, 1.5] — final explosion is largest
```
Followed by coin rain (25 coins, 5 currency symbols, 1.5s spawn duration) and the evolution item fly-up (2.8s delay, 1.2s fly duration).

A 500ms freeze frame plus 1.5s slow-motion precedes the explosion chain, giving the player time to register the kill.

### 5.6.5 Hit Stop and Screen Juice

- Enemy kill: no hit stop (fluid gameplay)
- Boss phase transition: 300ms freeze
- Boss defeat: 500ms freeze + 1.5s slow-mo
- Weapon upgrade: 400ms slow-mo during transform
- Close graze: screen flash (0.03s, 10% opacity white)
- HYPER activation: screen flash (0.10s, 20% opacity gold)
- Boss phase change: screen flash (0.12s, 25% opacity orange)
- Boss defeat: screen flash (0.20s, 50% opacity white)

## 5.7 Character Design Rules Summary

1. **Player ships must always be inverted-V delta shapes.** This silhouette is the player's visual anchor in every frame.
2. **Enemy agents must always have three layers: vehicle, pilot, chest mark.** No layer may be omitted — even at 58px, all three are discernible.
3. **Bosses must use architectural geometry.** No organic shapes. A boss is a building, an institution, a structure of power.
4. **Tier must be readable at a glance without text.** Scale + hat complexity + chest mark glow form a hierarchy that works at 58px and below.
5. **Damage must be communicated structurally, not numerically.** Cracks, sparks, flicker, and glow destabilization replace HP bars.
6. **Color is faction** — violet/cyan is player, green is FED, blue is BCE, red is BOJ. No cross-faction color sharing.
7. **GODCHAIN overrides all player color rules** — the red/orange GODCHAIN palette is deliberately alarming, signaling that the player is in a temporary super-state.

---

*End of Section 5. Approved and codified from live game code (v7.12.14).*
