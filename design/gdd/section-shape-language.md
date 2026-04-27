# Shape Language / Geometric Vocabulary

**Version:** 7.12.14
**Pillar Alignment:** Visual Identity, Readability at Speed, Economy as Rendering Substrate
**Connects to:** Visual Identity Statement, Mood & Atmosphere, Color Language

---

## 1. Core Principle: Geometry as Currency

The shape language of FIAT vs CRYPTO is built on a single axiom: **every visible shape is either a financial symbol, a mechanical component of the financial system, or structural information about the economy.** There are no organic curves, no natural forms, no decorative flourishes. All geometry serves gameplay readability first, thematic coherence second.

- **Angular geometry dominates.** The player ship, enemy vehicles, boss structures, UI panels, and background chart data all use straight lines and acute angles. Curves appear only where they have financial meaning: circular coins, elliptical orbits of BCE star nodes, the golden ring of the Torii gate.
- **Symmetry is factional.** The player ship and bosses are bilaterally symmetrical (authority, order, power). Regular enemies are asymmetrical in their accessory details (hats, briefcases, sabers) but structurally symmetrical (vehicles are symmetric, pilot busts are slightly asymmetric).
- **Scale communicates economic hierarchy.** Player ship (55px bounding box) > boss structures (160x140px) > agents (58px) > minions (44px) > powerups (30px) > bullets (4-10px). This is not arbitrary -- it mirrors the monetary hierarchy: state > institution > individual > token > transaction.

---

## 2. Player Ship: The Inverted-V Delta

The player ship is an **8-vertex inverted-V polygon** (the "swept-back delta" or "wedge silhouette"). Its defining characteristic is that the wing tips are the rearmost AND widest points, creating an aggressive forward-stabbing profile.

### 2.1 Core Geometry (All Variants)

```
Coordinates (ship-local, origin at center):

  (0, -tipY)         NOSE TIP
     /\
    /  \
(shldr, shldrY) === (shldr, shldrY)   SHOULDER (widest structural point)
   |    |    |
   |    |    |
(wingTipX, wingTipY)                 WING TIPS (rearmost, widest)
    \  |  /
     \ | /
(inrTailX, inrTailY)  (inrTailX, inrTailY)  INNER TAIL
       \  |  /
        \ | /
        (0, tailY)              TAIL NOTCH (shorter than wing tips)
```

- **Tip Y:** -36 (nose is topmost)
- **Shoulder Y:** -10 (wing broadens from here)
- **Wing Tip Y:** +36 (rearmost, widest point -- swept-back effect)
- **Inner Tail Y:** +13 (narrow tail channel)
- **Tail Y:** +5 (center notch -- creates the inverted-V silhouette)

### 2.2 Growth Through Weapon Levels

The ship's geometry is not decorative -- it is a **readable power indicator**. As weaponLevel increases from 1 to 3, the ship physically grows:

| Property | LV1 | LV2 | LV3 | GODCHAIN |
|----------|-----|-----|-----|----------|
| Wing Span | 40 | 43 | 46 | 50 |
| Shoulder Width | 13 | 14 | 16 | 17 |
| Cannon Extension | 0 | 10 | 10 | 14 |
| Barrel Extension | 0 | 0 | 16 | 18 |
| Barrel Width | 0 | 0 | 5 | 6 |

- **LV1:** Bare delta -- narrow, minimal, vulnerable. Pre-mount glow dot at nose.
- **LV2:** Wing cannon pods appear at 30% of the leading edge. Elongated diamond housings, twin energy rails, glow orbs at tips. Subtle energy line between pods.
- **LV3:** Armor plates on wings (LV3+.35 and .65 positions). Heavy central barrel emerges from nose -- triple-layer construction with neon rails and pulsing glow orb. Energy circuit lines connect center reactor to all three cannon points.
- **GODCHAIN:** All dimensions expand 8-25%. Wing energy trails extend from tips. Active energy lines pulse along wing leading edges. Fire trails from tail. Prismatic cockpit symbol cycles hue.

### 2.3 Ship Variant Silhouettes

Three ship types share the same inverted-V topology but differ in proportions and color:

| Variant | Body Dark | Body Light | Nose Dark | Nose Light | Fin Dark | Fin Light | Profile |
|---------|-----------|------------|-----------|------------|----------|-----------|---------|
| BTC (Striker) | #2a2040 | #6644aa | #4d3366 | #9966cc | #1a4455 | #2a6677 | Balanced, purple/magenta dominant |
| ETH (Heavy) | #1a2040 | #4a5a8e | #2a3366 | #7a8ecc | #1a3455 | #2a5077 | Wider, slower, blue dominant |
| SOL (Speedster) | #0a2a2a | #1a6a6a | #0a3a3a | #2a8a8a | #0a3455 | #1a5a77 | Narrower, teal/cyan dominant |

The silhouette changes subtly: SOL appears more tapered (narrower body, smaller fins), BTC is medium, ETH is broader. At gameplay speed (pixels moving at up to 765px/s), the key differentiator is COLOR, not shape.

### 2.4 Ship Flight Dynamics

The ship is not a static shape -- it has a flight dynamics system that deforms the geometry in real time:
- **Banking Tilt:** Rotation follows lateral velocity (max angle proportional to vx/divisor)
- **Hover Bob:** Sinusoidal Y-offset (amplitude dampened by horizontal speed)
- **Squash & Stretch:** ScaleX contracts/ScaleY expands during acceleration (inertia response)
- **Asymmetric Thrust:** Inner flame boosts on turning side, outer flame reduces
- **Wing Vapor Trails:** Particle trails from wing tips during lateral movement

These deformations are subtle (under 15% scale change) but critical for making the procedural polygon feel alive.

---

## 3. Enemy Shape Language: Agents of the System (v7.9+)

Enemies are not abstract ships -- each is a **human agent of the FIAT regime, piloting a vehicle.** The visual hierarchy maps to financial power structure:

### 3.1 Silhouette Architecture

Every enemy is composed of three layers:
1. **Vehicle** (outer frame, drawn first) -- communicates region and tier
2. **Pilot bust** (inner figure, drawn on top) -- head + torso with currency chest mark
3. **Accessories + Hat** (top layer) -- communicates tier and regional archetype

### 3.2 Regional Families

**USA (dollar currencies: $, C$, cad, CAD) -- "Oligarch"**
- Vehicle: **Stealth Wedge** (delta-wing, trapezoidal, F-117 silhouette), hull #1a1d24, twin orange thrusters
- Pilot: Dark suit + tie, skin #b8876a, cold dot eyes, flat mouth line
- Hat dispatch: tophat (default $), stetson (C$/cad), cowboy (CAD variant), ushanka ($ strong tier)
- Accessories: cigar, kerchief, cane, monocle
- Chest mark: Currency glyph stamped on the red tie (pale gold #f2e7b8)
- Palette names: forest, burgundy, tan, steelblue

**EU (euro currencies: EUR, euro, CHF) -- "Bureaucrat"**
- Vehicle: **Diplomatic Shuttle** (navy oval fuselage, gold tail fin, portholes, central blue-white flame)
- Pilot: Narrower torso, thin tie, lapel pin, moustache, pressed mouth
- Hat dispatch: bowler (default), topBrit (£), beret (₣), fez (₺)
- Accessories: newspaper, baguette, worrybeads, pipe, monocle
- Chest mark: Currency symbol inside a monocle ring (gold chain to collar)
- Palette names: charcoal, navy, wine, olive

**ASIA (yen/wan currencies: JPY, yuan, won) -- "Ronin"**
- Vehicle: **Mech Quad-Drone** (central cockpit pod + 4 red lacquer rotors in X-configuration, gold trim ring)
- Pilot: Mechanical samurai -- armor plate torso, gold trim, shoulder pauldrons, red lacquer joint dots, menpo face guard, red glowing eye slits
- Hat dispatch: kabutoStd, kabutoWide, kabutoDragon
- Accessories: tanto (dagger), fan (gunbai), saber, scroll
- Chest mark: Currency symbol on gold disc (mon) on breastplate, with gold halo at STRONG tier
- Palette names: nightBlack, deepRed, saffron, imperial

### 3.3 Tier Communication Through Shape

Tier is not a label -- it is **visually encoded** in every layer:

| Feature | WEAK | MEDIUM | STRONG |
|---------|------|--------|--------|
| Scale | 0.90x | 1.0x | 1.12x |
| Hat | None or basic | Regional hat | Hat + crest/embellishment |
| Accessory | None | Varies (non-cigar for USA) | Always present |
| Chest mark size | 0.85x | 1.0x | 1.35x + gold glow/halo |
| Vehicle thrusters | Single flicker | Normal flicker | Brighter, longer flame |

### 3.4 Boss Minions

Minions use `drawMinion` -- a **coin silhouette with wing sparkles**. Two-tone circle (dark half/light half split) with the currency symbol at center. Small glowing "wings" on each side (animated white triangles). These are intentionally simpler -- they are the base unit of currency, the "coin" from which agents evolve.

### 3.5 Damage States on Enemies

Damage is not abstract -- it is **structural degradation** of the shape:

1. **Body Darkening:** Body fill darkens proportionally to damage (0.4 + configurable darken amount * intensity)
2. **Outline Flicker:** Stroke width oscillates between configurable MIN_WIDTH and MAX_WIDTH; glitch artifacts at high intensity
3. **Cracks:** Pre-generated jagged fracture lines (3-segment polylines with random angles), drawn subset proportional to damage. Configurable COUNT_AT_THRESHOLD vs COUNT_AT_DEATH.
4. **Sparks:** Neon particles emitted at configurable intervals (faster when more damaged), colors from enemy's bright color
5. **Glow Destabilization:** Pulse speed increases, alpha decreases, color desaturates toward white as structure fails

---

## 4. Boss Shape Language: Large Composite Geometries

Bosses are 160x140px structures composed of multiple geometric elements. Each boss communicates its financial institution through its shape language.

### 4.1 FEDERAL RESERVE -- The Corrupted Printer

**Shape vocabulary:** Pyramid, Eye, Orbital currency symbols, scan lines
**Phase accent progression:** Green (#39ff14) -> Orange (#ffaa00) -> Red (#ff2244)

- **Pyramid Body:** 110px wide at base, fill gradient from dark to very dark, neon edge stroke. Inner tier line at 35% height. Scan lines inside pyramid (horizontal 1px lines at 4px spacing). Scrolling "$" watermark inside pyramid.
- **All-Seeing Eye:** Large almond-shape eye (28x16px) at center, white with colored iris (10px radius), black pupil that tracks erratically in P3 (pupil afterimage trails in P3).
- **Floating $ Orbit:** 8 "$" glyphs orbiting in ellipse, different phases, additive blend, varying alpha.
- **Outer Aura:** Layered radial glow, 85px + 10px per phase.
- **P3 Corruption:** Matrix rain "$" outside pyramid, red tint overlay on pyramid, glitch artifacts (5 horizontal bars per frame).
- **Side Emitters (P2+):** Small rounded rectangles on left/right edges with pulsating cyan glow.

### 4.2 BCE (European Central Bank) -- The Star Fortress

**Shape vocabulary:** Golden segmented ring, 12-star constellation, energy nodes, holographic glyph
**Colors:** EU blue (0,51,102 progressing to 0,17,51) + gold (#ffdd00)

- **Segmented Golden Ring:** 12 segments (30 degrees each with 0.06 rad gap), 4px line width, 8px glow. P3: every 3rd segment drops out in rotation.
- **12 Energy Star Nodes:** 5-point stars at constellation positions. Connected to center and to each other by gold energy lines. P3: nodes pulse, distance oscillates, connections to center flicker.
- **Inner Core:** Blue radial gradient circle (coreR - 10px), gold stroke.
- **€ Hologram:** Large cent symbol (36px Arial bold), gold fill with dark outline. P3: intense pulse ring expands from it.
- **P3 Cracks:** 5 radial fracture lines with light leaking (additive blend), debris particles orbiting.

### 4.3 BOJ (Bank of Japan) -- The Golden Torii

**Shape vocabulary:** Torii gate pillars, rising sun rays, yield curve EKG, gold architecture
**Colors:** Gold (#ffd700) + vermilion (#bc002d progressing to #6b0019)

- **Rising Sun Rays:** 16 rays from center point, alternating alpha (0.12/0.06 scaled by phase), rotating at phase-dependent speed.
- **Gold Aura:** Radial gradient surrounding the structure.
- **Torii Gate:** Two pillars (10px wide, 65px tall, 55px apart) + curved kasagi (top crossbar, upward-curved ends, 140px total width) + nuki (second crossbar). P3: wave distortion on pillars.
- **¥ Symbol:** 38px bold gold glyph below nuki.
- **P2+: Yield Curve EKG:** Sine wave trace across gate span, flashing "INTERVENTION!" text.
- **P3 Meltdown:** Incandescent overlay, heat haze bezier curves, molten gold drips from crossbar.
- **Telegraph System:** Red dashed line from boss to targeted player position, expanding crosshairs at target.

---

## 5. Background Geometry: Candlestick Chart

The scrolling background is a **financial candlestick chart** -- the environment IS the economy visualized as geometry.

- **Candlesticks** are vertical bars with horizontal wick lines at high/low. Each candlestick body is a filled rectangle (green/red for up/down).
- **Grid lines** are horizontal and vertical, low-opacity, monochrome.
- **The chart scrolls vertically** matching the game's scroll speed (60-180 px/s per LUT).
- **Speed changes** are communicated by the chart compressing/stretching visually.
- **Boss encounters** halt the scroll entirely (chart freezes, creating tension).

The chart geometry is intentionally **lower contrast** than gameplay elements. It is the rendering substrate -- the ledger upon which the action is written.

---

## 6. UI Shape Grammar: Terminal Overlay

The UI is a **financial terminal overlaid on the game world.** It does not mimic the background's angular chart geometry -- it is a distinct layer with its own consistent language.

### 6.1 Core UI Shapes

- **Glass panels:** Rounded rectangles with dark semi-transparent fill and neon border (1-2px stroke). Corners are slightly rounded (2-4px radius).
- **Monospace typography:** All labels are uppercase, fixed-width, neon-colored. No serifs, no decorative fonts.
- **Borders are thin:** 1-2px strokes, no shadows (shadows belong to the game world, not the terminal).
- **Indicators:** Bars (DIP meter, timer bars) are flat rectangles. No gradients on UI fills (gradients belong to the world).

### 6.2 DIP Meter (Graze Meter)

The DIP meter is a **vertical or horizontal bar** filled proportional to graze progress:
- Empty: Dark outline rectangle, transparent fill
- Filling: Pink/magenta (#ff69b4) glow fill, intensifying as meter approaches 100%
- Full (HYPER ready): Gold (#ffd700) pulsing glow, rhythmic pulse animation
- The meter's shape is a simple bar -- its communicative power is in COLOR and PULSE, not geometry

### 6.3 HYPER Mode Shape Transform

When HYPER activates, the ship's shape language transforms:
- **Speed lines:** Vertical gold streaks flowing downward from ship (8 lines, randomized length/spread, additive blend)
- **Body glow:** Tight radial gradient on ship body (not a separate circle) -- gold, pulsing with timer
- **Timer bar:** Thin horizontal bar below ship (40x3px), gold fill transitioning to red below 30% remaining
- **Core hitbox indicator:** Warning ring (red, pulsing) around enlarged hitbox. Larger than normal -- communicates risk
- **Golden sparks:** Particle burst on graze-extend, drifting with gravity

### 6.4 GODCHAIN Mode Shape Transform

GODCHAIN is HYPER's inverse -- HOT where HYPER is GOLD:
- **Fire tongues:** 3 flame trails from tail (orange/red gradient, sinusoidal flicker)
- **Wing energy trails:** Short orange strokes extending from wing tips
- **Energy lines:** Bright orange strokes along wing leading edges and body contour
- **Aura:** Red/orange radial gradient glow, expanding with pulse
- **Cockpit prismatic:** BTC symbol cycles through HSL hue at 60 deg/s

---

## 7. Power-Up Shape Language

Power-ups use a **unified circle + icon** system (v5.25+):
- **Circle shape:** 16px radius sphere, 3D shaded (dark left half, light right half), 2.5px black outline, rim highlight arc
- **Inner icon:** White geometric path symbols drawn at 0.55x radius scale:
  - UPGRADE: Upward arrow with horizontal bar
  - HOMING: Crosshair (circle + cross + center dot)
  - PIERCE: Upward arrow with cross-through line
  - MISSILE: 4-point explosive star
  - SHIELD: Shield silhouette with curved bottom
  - SPEED: Lightning bolt
  - PERK: Diamond shape
- **Outer glow:** Radial gradient (color at center fading to transparent)
- **Light sweep:** Diagonal white shine passing across periodically (sinusoidal, 1s period)

---

## 8. Shape as Gameplay Communication

| State | Shape Change | What It Communicates |
|-------|-------------|---------------------|
| Weapon LV1->LV2 | Wing cannon pods deploy | "You gained a new attack dimension" |
| Weapon LV2->LV3 | Central barrel emerges, armor plates, circuit lines | "Maximum power reached" |
| Enemy damaged | Cracks appear, outline flickers, sparks emit | "This enemy is weakened" |
| Enemy near death | Severe flicker, desaturated glow, many cracks | "Finish it" |
| HYPER active | Gold aura, speed lines, timer bar, enlarged hitbox | "High risk, high reward window" |
| GODCHAIN active | Fire trails, orange energy lines, prismatic cockpit | "Invincible power spike" |
| Shield ready | Pulsing cyan ring on ship | "Tap to activate defense" |
| Shield active | Energy skin conforms to ship body | "Protected" |
| Graze meter filling | Pink glow on ship | "Building toward HYPER" |
| Graze meter full | Gold pulsing glow on ship | "HYPER ready" |
| Boss phase transition | Screen shake, flash, boss visually transforms | "The fight is escalating" |
| Bullet graze | Hit shake, teleport flash, particle burst | "Close call!" |

---

## 9. Shape Hierarchy: What Draws the Eye

The game uses a deliberate hierarchy of visual complexity to guide the player's attention:

1. **Player ship** -- highest detail (8+ polygon vertices, 3D shading, animated components, cockpit symbol, exhaust flames) and highest contrast against background. Player's eye anchor.
2. **Enemy bullets** -- white (#ffffff) regardless of enemy color (v4.18 change). Pure white = immediate threat. Small (4-6px), but high contrast.
3. **Boss structures** -- medium detail (multiple geometric elements, orbital animations, phase-specific VFX)
4. **Regular enemies** -- moderate detail (3-layer: vehicle + pilot + accessories), humanoid shapes draw instinctive attention
5. **Power-ups** -- moderate detail (shaded sphere + icon + glow + sweep), rotating to attract
6. **Boss minions** -- low detail (coin silhouette + symbol + wing sparkles)
7. **Background chart** -- lowest detail (low contrast, desaturated, no animation beyond slow scroll)

---

## 10. Edge Cases and Constraints

### 10.1 Small Scale Readability (58px enemies)

At 58px bounding box with vehicles and pilots drawn at sub-10px scale, readability relies on:
- **High contrast outlines** (#050505 stroke on all pilot busts, vehicles, accessories)
- **Exaggerated features** (eyes are 1-2px dots, ties are 1-2px wide stripes, monocles are 0.9px rings)
- **Currency symbol as the primary identifier** -- the chest mark is the single largest interior detail
- **Silhouette over detail** -- hats and vehicle shapes are recognizable at distance (top hat vs bowler vs kabuto)

### 10.2 Color Blindness Considerations

Shape differentiation must work when color is reduced:
- Currency symbols are geometrically unique ($ vs E vs Y vs P)
- Vehicle silhouettes differ by region (wedge vs oval vs quad-rotor)
- Hat shapes are culturally distinct
- Accessories are shape-distinct (cigar = horizontal rectangle, cane = diagonal line)

### 10.3 Performance Boundaries

All shapes are procedural Canvas 2D paths -- no sprites, no atlases:
- Player ship: ~50 path operations per frame (all variants)
- Each enemy: ~40-60 path operations (vehicle + pilot + hat + accessory + chest mark)
- Each boss: ~200-400 path operations (varies by phase and attack patterns)
- Power-ups: ~20 path operations each
- All particle effects: single circle arcs

---

## Appendix: Key Geometry Constants

| Element | Bounding Box | Key Ratio | Reference |
|---------|-------------|-----------|-----------|
| Player ship | 55x55 | Wing span 40:length 72 (0.56) | Player.js `_computeGeomForLevel` |
| Enemy agent | 58x58 | Scale 0.90-1.12 | Enemy.js `drawAgent` |
| Boss | 160x140 | Variable by type | Boss.js constructor |
| Minion | 44x44 (r=22) | N/A | Enemy.js `drawMinion` |
| Power-up | 30x30 | Sphere r=16, icon r=8.8 | PowerUp.js |
| Player bullet | 7x22 | N/A | Player.js `fireEvolution` |
| Enemy bullet | 4x6-12x12 | Varies by shape config | Enemy.js `buildBullet` |
| DIP meter bar | 40x3 (ship-attached) | N/A | Player.js HYPER timer bar |

---

*This document codifies the existing shape language as implemented in v7.12.14. All referenced values are read from source; this is a description of what exists, not a prescription for what to build.*
