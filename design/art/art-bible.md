# Art Bible — FIAT vs CRYPTO

> **Status:** In Progress (sections 2, 4, 6 revised for Phase 1→3 progression)
> **Last Updated:** 2026-04-27
> **Engine:** Vanilla JavaScript (Canvas 2D, procedural rendering)
> **Review Mode:** Lean (AD-ART-BIBLE skipped)

---

## Section 1: Visual Identity Statement

### One-Line Visual Rule

**Economy is not the theme; economy is the rendering substrate — currencies are geometry, data is light, black is the ledger.**

### Supporting Visual Principles

**Principle 1: Terminal as Frame** (anchored in Pillar 1 — Economic Satire Through Gameplay)

*When a UI element's role is ambiguous, default to terminal/ledger aesthetic: monospace type, uppercase, letter-spaced, text-shadow glow, rgba glass panels with neon borders.*

The HUD is a live market ticker — LV for level, score as pulsating gold, lives as magenta heartbeat. DIP meter, HYPER status, and GODCHAIN activation read as trading alerts, not game announcements. Panels use the terminal visual language of the Bloomberg Terminal crossed with a 1980s arcade cabinet: dark transparent fills, cyan/violet neon borders, monospace all-caps labels.

**Principle 2: Weaponized Geometry** (anchored in Pillar 2 — Juicy, Responsive Combat)

*When rendering a game entity, prefer geometric path construction over sprites or raster: everything is a procedurally drawn shape whose form communicates state through stroke weight, fill, damage cracks, and particle emissions.*

No sprite sheets, no pre-rendered frames. The player ship is a swept-back delta wing of layered polygons. Enemies are currency signs drawn as filled paths that accumulate visual damage. Bosses are large composite geometries with rotating attack rings, particle cloaks, and halos. Combat feel is delivered through geometric operations: hit-flash white pulses, hit-stop freezes motion, screen shake displaces the entire canvas, banking tilt and thrust flames are all geometric transforms on the same path data.

**Principle 3: Light = Information; Color = Allegiance** (anchored in Pillar 4 — Two Distinct Modes, One Core Loop)

*When choosing a color for any element, let it declare faction, state, or economy-role: neutral data is terminal white, friendly is violet/cyan, the enemy FED is green, BCE is blue, BOJ is red. Economy-state shifts (HYPER = gold, GODCHAIN = orange, Bear Market = desaturated, danger = magenta pulse) override faction colors.*

Color is a communication channel, not decoration. The player ship is violet (BTC), blue (ETH), or cyan (SOL). The three bosses use distinct color identities so the player reads threat origin at a glance. Economy states shift the entire color language — no text label needed to know the rules have changed.

---

## Section 2: Mood & Atmosphere

> **Revision adds:** Phase Progression System (Phase 1/2/3) as a background-palette axis
> **Preserves:** All 11 existing visual states, all 3 mood families
> **Key insight:** Phase determines background palette; game state (PLAY/FIGHT/HYPER/GODCHAIN) determines foreground treatment
> **Reference:** Ikaruga Stage 1 (blue sky/clouds) → Stage 5 (abstract/digital void)

### 2.1 Phase Progression System

The game world moves through three visual phases that track the player's ascent from Earth orbit into deep space. The **Phase** controls the background palette (sky gradient, cloud color, starfield density, hill tint). The **Game State** controls the foreground treatment (lighting direction, bloom intensity, particle color, screen effects). This two-axis system means every PLAY state has three distinct visual expressions without requiring new art assets — the same geometry is rendered against different color substrates.

#### Phase Overview

| Aspect | Phase 1: Low Earth Orbit | Phase 2: Upper Atmosphere | Phase 3: Deep Space |
|---|---|---|---|
| **Sky gradient** | Blue `#4a90d9` → `#87ceeb` (daylight) | Violet-blue → muted purple | Pure black (`#000`) |
| **Clouds** | White/gray, multi-lobe, soft edges, natural volume, 50-65% fill | Thin, stylized, violet-tinted white, sharper edges, 30-45% fill | Dark silhouettes with neon rim (cyan/magenta edge glow only) |
| **Stars** | None (daylight sky overpowers) | Faint stars begin appearing in upper sky band | Full starfield ~135 stars, shooting stars, deterministic positions |
| **Hills** | 5-layer parallax, natural earth greens/browns, solid fill | Greens shift to purple-blue, lower contrast, thinner | Pure black silhouettes, no fill, cyan underglow on bottom edge |
| **Horizon glow** | Warm daylight `#ffe4a0` at horizon line | Pale violet `#cc88ff` horizon band | None (black on black) |
| **Chart contrast** | Full opacity candlestick colors (green/red) | 80% opacity, slightly desaturated | 60% opacity, dark neon tones, cyan candle outlines |
| **Palette mood** | Natural, terrestrial, familiar | Crossover, transitional, slightly synthetic | Cyberpunk, digital, void-like |
| **Ikaruga analogue** | Stage 1 (earth sky, clouds, green terrain) | Stage 3 (purple/pink transition zone) | Stage 5 (pure abstraction, neon on black) |

#### Transition Rules

- **Phase shifts are gradual** — never instantaneous. A phase transition takes 8-12 seconds, blending the 6-layer sky pipeline via alpha crossfade on the cached sky canvas (`SkyRenderer.js`).
- **V8 Campaign:** Phase advances at fixed level thresholds. Phase 1 = Levels 1-4, Phase 2 = Levels 5-7, Phase 3 = Levels 8-10.
- **Arcade Mode:** Phase advances by wave tier. Phase 1 = Waves 1-5, Phase 2 = Waves 6-10, Phase 3 = Waves 11+.
- **Boss fights:** The phase freezes on whatever background state was active when the boss spawned. The boss arena is a paused-phase zone.
- **Phase never regresses** within a single session. Once Phase 2 is reached, the background never returns to Phase 1's blue sky.

#### Layer Pipeline Impact

The Phase system maps onto the existing 6-layer environment pipeline (`SkyRenderer.js`):

| Layer | Phase 1 Tuning | Phase 2 Tuning | Phase 3 Tuning |
|---|---|---|---|
| 1. Sky gradient | Blue `#4a90d9` → `#87ceeb` | `#6655aa` → `#9966cc` | `#000` (single color) |
| 2. Star field | Hidden (alpha 0) | Fade in upper 40% of canvas | Full alpha, all 135 stars |
| 3. Clouds | White/gray, soft, dense | Violet-tinted, thinner, sharper | Black silhouettes, neon rim |
| 4. Hills | Earth greens/browns | Purple/blue tints | Black, no fill, cyan edge glow |
| 5. NEAR streaks | Daylight color | Violet-tinted | Neon cyan/magenta |
| 6. Floating symbols | Chart colors | Slightly desaturated | Neon outlines |

### 2.2 Calma — Low Energy / High Contrast

*(Unchanged from previous version — these states exist outside of active gameplay and are phase-independent.)*

| State | Primary Emotion | Lighting | Descriptors | Energy | Visual Carrier |
|---|---|---|---|---|---|
| **INTRO** | Anticipation / Digital reverence | Cool, high-contrast, ambient backlight from below (terminal glow) | clean, authoritative, humming, vast, expectant | Contemplative | A single pulsing cursor on an otherwise black screen — the terminal is alive, waiting for input |
| **HANGAR** | Readiness / Focused preparation | Cool ambient with localized warm accent on selected ship; top-down key light, cyan/violet underglow | technical, precise, armored, quiet, charged | Measured | The selected ship idling with slow 360° rotation against a wireframe blueprint grid |
| **Arcade INTERMISSION** | Brief relief / Tactical breath | Neutral, low-contrast cool, dimmed ~40% from combat brightness | transitional, cooling, brief, tactical, suspended | Measured | Slow horizontal scanline sweep top-to-bottom as the terminal refreshes, revealing wave number in large cyan digits |

### 2.3 Combattimento — High Energy / Saturated (Phase-Enhanced)

Each PLAY state now has three phase variants. The **Primary Emotion** and **Energy** remain constant across phases — what changes is the visual vocabulary (lighting, color substrate, descriptors, visual carrier). Phase 3 entries marked with (Current) indicate the shipping aesthetic that remains the final destination.

#### V8 Campaign PLAY

| Phase | Lighting | Descriptors | Visual Carrier |
|---|---|---|---|
| **P1 — Low Earth Orbit** | Cool-to-neutral, side-lit by scrolling chart candles providing horizontal light streaks; blue sky casts cool ambient on ship undersides | financial, rhythmic, terrestrial, blue-tinted, scrolling, saturated | Scrolling candlestick chart against a blue gradient sky with white clouds drifting at parallax depth — the market is open, the weather is clear |
| **P2 — Upper Atmosphere** | Cool-to-neutral with emerging violet ambient; chart candles now read against purple sky; medium contrast, sky reflection on ship shifts from blue to violet | financial, transitional, thinning, violet-tinged, rhythmic | Candlestick chart against a violet-blue sky with thinner stylized clouds — the atmosphere is changing, the familiar world is receding |
| **P3 — Deep Space (Current)** | Cool-to-neutral, side-lit by scrolling chart candles; pure black background; highest contrast | financial, rhythmic, scrolling, saturated, relentless | Candlestick chart scrolling against pure black with neon starfield faintly visible in gaps between candles — void trading |

#### Arcade Mode PLAY

| Phase | Lighting | Descriptors | Visual Carrier |
|---|---|---|---|
| **P1 — Low Earth Orbit** | Cool with warm hazard pulses; blue sky provides natural contrast for neon enemy bullets; health-drop red reads against blue background | procedural, blue-skied, natural-backlit, wave-driven | Procedural enemy formations against blue gradient sky — danger arrives in daylight, making it feel more invasive |
| **P2 — Upper Atmosphere** | Cool violet ambient with warm hazard pulses; enemy bullet neon reads more intensely against purple sky; desaturated cloud layer adds visual depth | procedural, purpling, denser, crossover, pulsing | Enemy formations against violet-purple sky with faint stars beginning to appear in the upper band — the rules of the world are bending |
| **P3 — Deep Space (Current)** | Cool with warm hazard pulses; dynamic shift toward red as health drops, toward cyan on graze; pure black background makes every neon element max-contrast | procedural, pulsing, dense, wave-driven, adaptive | Pure black void as the combat arena — only enemy geometry, neon bullets, and the player's colored ship exist in the darkness |

#### Boss Fight

| Phase | Lighting | Descriptors | Visual Carrier |
|---|---|---|---|
| **P1 — Low Earth Orbit** | Warm menace from boss (orange-gold core glow) against blue sky; sky provides a calming counterweight to the boss's heat; rim-light on player ship with blue fill | monumental, sky-framed, glowing, terrestrial-scale | Boss as enormous geometric structure against receding blue sky — the sky is still visible behind the boss silhouette, anchoring the fight in the real world |
| **P2 — Upper Atmosphere** | Warm boss glow against violet-purple background; the sky no longer feels like refuge; boss light dominates the frame | monumental, oppressive, void-adjacent, cinematic | Boss silhouette against purple-black sky with sparse stars — the last color is draining from the world as the fight intensifies |
| **P3 — Deep Space (Current)** | Warm menace from boss (orange-gold core glow) against cool black background; high contrast, rim-light on player ship | monumental, oppressive, glowing, cinematic, urgent | Boss as enormous procedural geometric structure against absolute black — no sky, no horizon, nothing exists except the boss and the player |

#### HYPER Mode

| Phase | Lighting | Descriptors | Visual Carrier |
|---|---|---|---|
| **P1 — Low Earth Orbit** | Warm, high-saturation gold; blue sky absorbs some of the gold spread, creating blue/gold complementary contrast | golden, sky-blooming, triumphant, warm-cool | Gold particle comet tail against blue sky — the gold glows brighter because the blue background is its complementary opposite |
| **P2 — Upper Atmosphere** | Warm gold against violet-purple sky; gold and violet are near-complements, creating a rich, regal color harmony | golden, regal, overflowing, violet-tinged | Gold comet tail against violet-purple void — the transition gives HYPER a royal, twilight aesthetic |
| **P3 — Deep Space (Current)** | Warm, high-saturation gold, full-volume ambient bloom radiating from player ship outward | golden, overflowing, triumphant, blinding, maximalist | Gold particle comet tail lingering behind the ship, lighting up the pure black background in its wake — no background competes, only the gold exists |

#### GODCHAIN Event

| Phase | Lighting | Descriptors | Visual Carrier |
|---|---|---|---|
| **P1 — Low Earth Orbit** | Hot orange-red flame core against blue sky; blue/orange is the classic cinematic contrast (teal-and-orange) creating natural drama | apocalyptic, sky-lit, burning, cascading, primal | Orange chain-links wrapping screen edges against blue sky with clouds — the fire element reads as a disruption of the natural world |
| **P2 — Upper Atmosphere** | Hot orange-red against violet-purple background; warmer overall palette, fire merges more with its background, feeling more engulfing | apocalyptic, purpling-fire, burning, cascading, total | Orange chain-links against violet sky where stars are faintly visible — the sky itself is burning, the phase transition amplifies the heat |
| **P3 — Deep Space (Current)** | Hot orange-red flame core, high-contrast flicker, strobe-like pulse at 4-6 Hz | apocalyptic, burning, volatile, cascading, primal | Orange chain-links drawn as procedural geometry wrapping around screen edges and contracting inward against pure black — each link glowing like embers in absolute darkness |

### 2.4 Transizione — Frozen / Terminal

*(Unchanged — these are overlay/frozen states that sit on top of gameplay regardless of phase.)*

| State | Primary Emotion | Lighting | Descriptors | Energy | Visual Carrier |
|---|---|---|---|---|---|
| **PAUSE** | Suspended time / Cold clarity | Frozen cool — gameplay desaturated with a cyan-tinted overlay | frozen, clinical, translucent, quiet, exposed | Contemplative | Frozen gameplay visible beneath a semi-transparent cyan scanline overlay |
| **GAMEOVER** | Finality / Hollow defeat | Dim, desaturated cool; slow decay of bloom and glow over 2-3 seconds | empty, cold, terminal, final, quiet | Contemplative | Score counter blinking slowly in red, fading to dim violet as screen goes to black — no particles, no motion, just text on a dark ledger |
| **Arcade Modifier Choice** | Strategic weight / Calculated gamble | Cool ambient with colored card glow (each modifier card emits its category color) | card-like, weighted, luminous, decisive, silent | Contemplative | Three modifier cards floating on black, each backlit by its own category-color glow (purple/cyan/green), no background decoration — pure choice |

### 2.5 Phase Color Reference

Quick-reference swatches for the three phases' dominant color substrates, for use in `BalanceConfig.js` or `Constants.js` phase color definitions:

| Color Role | Phase 1 | Phase 2 | Phase 3 |
|---|---|---|---|
| **Sky top** | `#4a90d9` (medium blue) | `#554488` (violet) | `#000000` (black) |
| **Sky bottom** | `#87ceeb` (light blue) | `#8866aa` (muted purple) | `#000000` (black) |
| **Horizon glow** | `#ffe4a0` (warm daylight) | `#cc88ff` (pale violet) | `#000000` (no glow) |
| **Cloud fill (P1/P2)** | `#ffffff` → `#cccccc` (white to gray) | `#ddaaff` → `#8866aa` (violet-white) | N/A (silhouette only) |
| **Cloud silhouette rim** | N/A | N/A | `#ff2d95` (magenta) / `#00f0ff` (cyan) |
| **Hill base** | `#5a8a4a` (earth green) | `#553366` (dark purple) | `#000000` (black) |
| **Chart candle green** | `#00ff66` | `#00cc66` (slightly dimmed) | `#00aa55` (dark neon) |
| **Chart candle red** | `#ff3333` | `#cc3333` (slightly dimmed) | `#aa2233` (dark neon) |

---

## Section 3: Shape Language

> Full detail: [`design/gdd/section-shape-language.md`](../gdd/section-shape-language.md) — 346 lines covering player ship vertex coordinates, enemy agent architecture, boss composite geometries, and power-up icon system.

### Core Principle: Geometry as Currency

Every visible shape is either a financial symbol, a mechanical component of the financial system, or structural information about the economy. No organic curves, no natural forms, no decorative flourishes. Angular geometry dominates — the player ship, enemy vehicles, boss structures, UI panels, and background chart all use straight lines and acute angles. Curves appear only where they have financial meaning (circular coins, elliptical orbits, the golden ring of a Torii gate).

### Player Ship: 8-Vertex Inverted-V Delta

The ship is a swept-back delta wing — wing tips are the rearmost AND widest points, creating an aggressive forward-stabbing profile. Core coordinates: tipY=-36, shoulderY=-10, wingTipY=+36, tailY=+5. The ship grows with weapon level (LV1→LV3), deploying wing cannon pods, armor plates, and a central barrel as visible power indicators. Three variants (BTC/ETH/SOL) share the same topological silhouette differentiated by proportions and color.

### Enemy Shape Architecture (v7.9+ "Agents of the System")

Each enemy is a three-layer composition: vehicle (outer frame, region-typed) + pilot bust (inner figure with currency chest mark) + accessories/hat (tier indicator). Three regional families:

- **USA / Oligarch** — Stealth Wedge delta-wing, dark suit + tie, tophat/stetson, cigar/cane
- **EU / Bureaucrat** — Diplomatic Shuttle oval fuselage, narrow torso + thin tie, bowler/beret, newspaper/baguette
- **ASIA / Ronin** — Mech Quad-Drone with 4 rotors, samurai armor torso + menpo face guard, kabuto helmets, tanto/saber

Tier is encoded visually: WEAK = 0.90x scale, no hat; MEDIUM = 1.0x, regional hat; STRONG = 1.12x, hat + crest, glowing chest mark.

### Boss Composite Geometries

Each boss is a 160x140px structure using financial-institution-specific shape vocabulary:
- **FED** — Pyramid + All-Seeing Eye + floating $ orbit. Phase progression: green → orange → red
- **BCE** — Segmented golden ring (12 segments) + 12-star constellation + € hologram. EU blue + gold
- **BOJ** — Torii gate pillars + rising sun rays (16 rays) + ¥ symbol + yield curve EKG. Gold + vermilion

### Shape as Communication

Damage is structural degradation: body darkening, outline flicker, cracks (jagged 3-segment polylines), sparks, glow destabilization. HYPER mode adds gold speed lines + timer bar + enlarged hitbox. GODCHAIN adds fire trails + orange energy lines + prismatic cockpit. The shape hierarchy guides attention: player ship (highest detail) > enemy bullets (pure white) > bosses > enemies > power-ups > minions > background chart (lowest contrast).

---

## Section 4: Color System

> **Revision adds:** Phase Progression dimension — the 10-color palette now evolves across Phase 1 (natural) → Phase 2 (transition) → Phase 3 (neon/space)
> **Key constraint:** Phase 3 palette (black + 9 neon colors) is frozen — this revision only adds Phase 1 and 2 variants
> **Full baseline detail:** [`design/ux/color-system.md`](../ux/color-system.md) — 395 lines covering palette, faction colors, state shifts, and colorblind safety

### 4.1 Phase Color Evolution

The 10-color palette is no longer fixed — each color shifts in perceptual contrast and thematic meaning depending on the phase background substrate. The color's hex value stays constant; what changes is how it reads against the evolving sky.

#### Palette Color × Phase Matrix

| Color | Hex | Phase 1: Low Earth Orbit | Phase 2: Upper Atmosphere | Phase 3: Deep Space |
|---|---|---|---|---|
| **Black** | `#000` | **Dark object against daylight.** Reads as "shadow" rather than "void." Lower contrast against blue sky. | **Deepening shadow.** Losing solidity. The transition from "natural shadow" to "digital void" begins. | **(Current) The ledger substrate.** Absolute void. Maximum contrast for all neon. |
| **Neon Violet** | `#bb44ff` | **Synthetic intruder in a natural world.** Against blue sky (cool-on-cool), violet reads as artificial — a crypto signal cutting through terrestrial daylight. Moderate contrast. | **(LOWEST CONTRAST WARNING)** Against violet-purple sky, the BTC player ship nearly disappears. Violet-on-violet is the worst visibility moment. The ship must rely on silhouette, highlight pass, and thrust flame. | **(Current) Digital royalty.** Full contrast against black. Sovereign crypto signal. |
| **Neon Cyan** | `#00f0ff` | **Data flowing through daylight.** Good contrast against blue sky — brighter and more saturated than sky blue. | **High contrast against violet.** Cyan is cool-green-blue against warm violet-purple — near-complementary. Maximum legibility for UI borders and SOL ship. | **(Current) Data channel.** Pure information flow against void. |
| **Neon Green** | `#39ff14` / `#00ff66` | **Money printing in the sun.** Green against blue sky is a natural pair — the FED feels rooted in the earthly world. Good contrast. | **Alien green against alien sky.** Green against purple is jarring, uncomfortable. The FED's green becomes more threatening. | **(Current) Printer green against void.** Money conjured from nothing. |
| **Neon Magenta** | `#ff2d95` | **Warning flare in daylight.** High contrast against blue sky (magenta is warm-cool, blue is cool). Reads as a distant danger signal. | **Moderate contrast against violet.** Magenta and violet are close on the color wheel. The "near-miss" feeling is preserved by the color's inherent anxiety. | **(Current) Margin call against void.** Maximum contrast. |
| **Gold** | `#ffd700` | **THE best phase for gold.** Blue sky + gold is classic complementary contrast. HYPER feels earned, natural, like sunlight on coins. | **Regal against violet.** Gold + violet is a historically royal combination. HYPER feels majestic, twilight-like. | **(Current) Absolute against void.** No background competes. Only the gold exists. |
| **Orange** | `#ff4400`–`#ffaa00` | **Cinematic fire against sky.** Teal-and-orange (blue + orange fire) is the classic Hollywood contrast. GODCHAIN reads as natural disaster. Most dramatic read of any phase. | **Engulfing warmth against violet.** Orange doesn't pop as sharply — it spreads, feels more pervasive. The sky itself seems to burn. | **(Current) Lone flame in void.** Maximum contrast but also maximum isolation. |
| **Deep Blue** | `#003399` | **Lowest contrast in any phase.** Deep blue against daylight sky — BCE nearly blends in. Intentional: the ECB is bureaucratic, invisible. The € symbol does the identification work. | **Still low contrast against violet-blue sky.** Gold star accents become the primary visual identifier. | **(Current) Institutional against void.** Deep blue stands out fully against black. |
| **Red** | `#bc002d` | **Strong contrast against blue sky.** Red-on-blue is highly visible (warm-on-cool). BOJ reads clearly as threat. | **Warm-on-warm against violet.** Lower contrast. White accents (`#fff`) become critical for legibility. | **(Current) Japan red against void.** Maximum contrast. Pure threat. |
| **Terminal White** | `rgba(255,255,255,0.6–1.0)` | **Good contrast against blue sky.** Slight blue reflection on white surfaces adds a natural feel. | **Good contrast against violet sky.** White is the most legible color across all phases. | **(Current) Pure data against void.** Maximum contrast. |

#### Phase 2 Visibility Cliff

The single most important finding: **Phase 2's violet-purple sky creates a visibility problem for neon violet `#bb44ff` (BTC ship)**. The hue distance between `#bb44ff` and the Phase 2 sky (`#554488`–`#8866aa`) is dangerously small (~20° on the color wheel).

- **Mitigation:** BTC ship uses its 50% lighten highlight pass (`#eebbff`) as the primary silhouette edge in P2. The thrust flame (orange-gold) becomes the visual anchor.
- **ETH Heavy (`#8c7ae6`)** has even worse contrast. Mitigation: broader silhouette and slower movement reduce tracking difficulty.
- **SOL Speedster (`#00d2d3`)** has the best P2 visibility — teal against violet is a strong complementary pair.

### 4.2 Faction Colors Through Phases

#### FED (Green → Orange → Red)

- **Phase 1:** Dollar green against blue sky — the FED looks like it belongs in the natural world. The green→orange→red corruption arc reads as a violation of the natural order.
- **Phase 2:** Green against purple — jarring, uncomfortable. The FED's color no longer blends with nature because nature has been left behind.
- **Phase 3 (Current):** Green against black — money from nothing. The purest expression of fiat creation.
- **Verdict:** Holds up well across all phases. HP bar (`#39ff14`) is safe in all phases.

#### BCE (EU Blue + Gold) — Most Phase-Vulnerable

- **Phase 1:** Deep blue (`#003399`) against blue sky — minimum contrast. BCE is deliberately hard to see. Gold stars (`#ffcc00`) do the visual work.
- **Phase 2:** Still low contrast against violet sky. Gold stars are critical for identification.
- **Phase 3 (Current):** Deep blue against black — finally visible. The € symbol + gold constellation are BCE's signature.
- **Verdict:** BCE is the faction most affected by phase backgrounds. **Design recommendation:** Increase BCE's gold accent intensity by +15% in P1 and P2. Add a faint gold rim-light to the boss structure so the 12-star constellation is always the primary visual anchor.

#### BOJ (Japan Red + White) — Most Phase-Robust

- **Phase 1:** Red (`#bc002d`) against blue sky — strong, visible, warm-on-cool. Rising sun rays clearly readable.
- **Phase 2:** Red against violet — lower contrast. White zen elements (`#fff`) become the shape-defining color.
- **Phase 3 (Current):** Red against black — maximum contrast.
- **Verdict:** The red/white dual-color identity means one color always has good contrast against any background. White saves legibility in P2 where red fades. The rising sun geometry (16 rays) is a strong shape signal independent of color.

### 4.3 Economy-State Shifts Across Phases

#### HYPER Mode (Gold `#ffd700`)

| Aspect | Phase 1: Blue Sky | Phase 2: Violet Sky | Phase 3: Black Sky |
|---|---|---|---|
| **Contrast** | Complementary (blue/gold) | Near-complementary (violet/gold) | Absolute (black/gold) |
| **Emotional read** | Treasure, sunlight on coins, golden hour — the warmest, most "human" HYPER | Regal, royal, twilight treasure — HYPER feels like an anointment | Pure wealth, cosmic treasure — no context, just value |
| **Gold visibility** | Gold particles against blue sky — highly visible. Comet tail leaves warm trail across cool sky. | Less visible against violet. Comet tail more atmospheric, less sharp. | Max visible. Comet tail is blinding. |

#### GODCHAIN Mode (Orange `#ff4400`–`#ffaa00`)

| Aspect | Phase 1: Blue Sky | Phase 2: Violet Sky | Phase 3: Black Sky |
|---|---|---|---|
| **Contrast** | Teal-and-orange (classic cinema contrast) | Warm-on-cool-warm (closer in hue) | Absolute (black/orange) |
| **Emotional read** | Cinematic fire, natural disaster — chain-links look like wildfires against blue sky. The most "epic" GODCHAIN. | Engulfing, pervasive — fire spreads across the sky. Less cinematic, more apocalyptic. | Lone flame, final rage — pure elemental fury in the void. |
| **Chain visibility** | Max pop — each link clearly defined. | Lower edge definition — links blur together. | Max edge definition — fire is sharp and contained. |
| **Recommendation** | — | Increase glow radius +20% in P2. Use brighter orange midpoint `#ff8800` (vs `#ff6600` in P1). | — |

**Split verdict:** GODCHAIN's best "story" read is Phase 1 (teal-and-orange cinema contrast). Its best "impact" read is Phase 3 (absolute contrast).

#### Bear Market

Phase-independent — applies a desaturation filter to foreground entities and UI, not the background. Bear Market in P1 = "a cold day in a blue-skied world." Bear Market in P3 = "the void getting colder."

### 4.4 Phase Transition Intermediate States

Phase transitions are 8-12s alpha crossfades on the 6-layer sky canvas.

| Transition | Risk | Issue |
|---|---|---|
| **P1→P2: Blue → Violet** | **LOW** | All intermediate colors are cool-spectrum. Neon violet `#bb44ff` gradually loses contrast — smooth degradation over 8-12s that the player can adapt to. No sharp cutoff. |
| **P2→P3: Violet → Black** | **LOW** | All neon colors gradually gain contrast. Gold and orange get progressively brighter. **Pleasant effect — the player feels power increasing as the world darkens.** |
| **Cloud blend P2→P3** | **MEDIUM** | Violet-tinted clouds alpha into black silhouettes with neon rims. At the ~5s midpoint, clouds are desaturated near-black with partial violet tint — can look muddy. **Recommendation:** Cloud rim alpha should lag cloud body alpha by ~3s to avoid "dirty gray" look. |
| **Hill blends** | **LOW** | All hill transitions are clean fades. |

**Midpoint legibility recommendation:** During active phase transitions, apply a subtle +10% boost to ship highlight pass intensity and enemy outline stroke width, peaking at the midpoint. This compensates for the 5-10s window where contrast is at its worst.

### 4.5 Colorblind Safety Update

The Phase 1 palette introduces more color variety (greens, browns, blues) — this creates new considerations:

| Condition | Risk | Mitigation |
|---|---|---|
| **Deuteranopia (P1 hills)** | **MODERATE** — Green hills `#5a8a4a` and blue sky `#4a90d9` have similar luminance to deuteranopes. | Hills already use luminance stacking (5 layers, each darker). Depth separation is preserved by brightness, not hue. Verify span ≥ 40% luminance. |
| **Tritanopia (P1 gold on sky)** | **MODERATE** — Gold on blue sky appears similar blue-gray. | DIP meter and score are on dark DOM panel, not against sky. Only in-world gold (HYPER trails) is affected. |
| **Tritanopia (P1 BCE)** | **HIGH** — Blue BCE boss against blue sky is nearly invisible. | Gold stars (`#ffcc00`) become critical. The € symbol is the primary identifier. Same mitigation as normal vision. |
| **Achromatopsia** | **LOW** — The luminance pipeline is naturally safe. The 6-layer system uses luminance stacking (sky brightest, hills darkest). | No mitigation needed. |
| **Phase 3 (all conditions)** | **SAFE** — All neon on black reads by luminance contrast. | Phase 3 already verified safe. |

New Phase 1-specific mitigation: verify the 5-layer hill parallax uses at least 15% luminance separation per layer, spanning ≥ 40% total luminance range. This guarantees depth separation for all colorblind conditions.

### Summary of Recommendations

1. **BCE gold accent +15% in P1/P2** — gold stars become the primary visual anchor for the blue-on-blue boss.
2. **Ship highlight +10% during phase transitions** — compensates for the midpoint window where BTC ship (`#bb44ff`) loses contrast against the blending sky.
3. **Cloud neon rim alpha lag ~3s during P2→P3** — avoids "muddy gray" midpoint where clouds are neither violet-tinted nor properly rim-lit.
4. **GODCHAIN glow radius +20% in P2** — uses brighter orange midpoint (`#ff8800`) where orange/violet contrast is lowest.
5. **Hill luminance span ≥ 40% in P1** — ensures colorblind-safe depth separation across the 5-layer parallax.
6. **Phase 3 palette frozen** — no hex value changes to the shipping aesthetic.

## Section 5: Character Design Direction

### Player Ship Archetypes

Three ships share the same 8-vertex inverted-V delta topology but communicate distinct roles through proportion and color. At gameplay speed (up to 765px/s), the key differentiator is color, not shape — but each ship's stats bar provides numeric backup. The ship grows visibly with weapon level (LV1 bare delta → LV2 wing cannon pods → LV3 central barrel + armor plates + energy circuit lines).

### Distinguishing Features: Entity Type Identification

| Entity | Visual Rule | Why |
|---|---|---|
| **Player ship** | Inverted-V delta, colored fill with dark/light halves, cockpit BTC symbol | Player's eye anchor — highest detail |
| **Enemy bullets** | Pure white body (#fff, v4.18), optional faction-tinted core | White = uncolored threat |
| **Boss** | >100px composite geometry with orbital elements, HP bar above | Size = threat level |
| **Regular enemy** | ~58px 3-layer humanoid agent (vehicle + pilot + hat), regional silhouette | Humanoid = combatant |
| **Minion** | ~44px coin silhouette with wing sparkles | Simplification = lower threat |
| **Power-up** | ~30px shaded sphere + white geometric icon + rotating light sweep | Always circle + icon — safe |
| **Player bullets** | Colored neon (ship accent + elemental tint) | Different from white enemy bullets |

### Enemy Agent Design (v7.9+ "Agents of the System")

Each enemy is a **human agent of the FIAT regime** composed of three visual layers:
1. **Vehicle** (outer frame) — communicates region and tier via silhouette
2. **Pilot bust** (inner figure) — head + torso with currency chest mark
3. **Accessories + Hat** (top layer) — tier and regional archetype

Three regional families encode financial power structure:
- **USA / Oligarch** — Stealth Wedge delta-wing, dark suit + tie, tophat/stetson, cigar/cane
- **EU / Bureaucrat** — Diplomatic Shuttle oval fuselage, narrow torso + thin tie, bowler/beret/fez, newspaper/baguette
- **ASIA / Ronin** — Mech Quad-Drone (central pod + 4 rotors), samurai armor + menpo face guard, kabuto helmets, tanto/saber/fan

Tier is visually encoded with zero text: WEAK = 0.90x scale, no hat; MEDIUM = 1.0x, regional hat; STRONG = 1.12x, hat + crest + glowing chest mark.

### Boss Character Design

Each boss is a financial institution with personality expressed through geometry:
- **FED** — Pyramid + All-Seeing Eye + floating $ orbit. Corruption arc (green → orange → red P3).
- **BCE** — Segmented golden ring (12 segments) + 12-star constellation + € hologram. The Star Fortress.
- **BOJ** — Torii gate pillars + rising sun rays (16 rays) + ¥ symbol + yield curve EKG. Zen → meltdown.

### Damage/Death Visualization

Damage is communicated structurally: body darkening → outline flicker/glitch → cracks (jagged 3-segment fracture polylines) → sparks (neon particles, faster with damage) → glow destabilization (pulse accelerates, alpha decays, color desaturates toward white). At death: screen shake + particle burst + flash. The geometry literally falls apart.

---

## Section 6: Environment Design Language

> **Revision adds:** Phase 1 (Low Earth Orbit) and Phase 2 (Upper Atmosphere) variants for all 6 environment layers, weather per phase, transition visual effects, chart per phase, level/wave-to-phase mapping.
> **Key constraint:** Phase 3 (Deep Space) descriptions are frozen — this revision only adds Phase 1 and 2 variants.
> **Delivery mechanism:** The existing 6-layer pipeline (`SkyRenderer.js`) carries all phase changes via parameter tuning — no new rendering systems.

### 6.1 Six-Layer Pipeline: Phase-Specific Tuning

The game world renders as six distinct background layers (in draw order, `src/systems/SkyRenderer.js`). Each layer has Phase 1, Phase 2, and Phase 3 tuning sets. Phase 3 represents the current shipping aesthetic.

#### Layer 1: Sky Gradient + Horizon Glow Band

The cached vertical gradient that fills the entire canvas. This is the foundational color substrate.

| Parameter | Phase 1: Low Earth Orbit | Phase 2: Upper Atmosphere | Phase 3: Deep Space |
|---|---|---|---|
| **Gradient colors** (top→bottom) | `#4a90d9` → `#87ceeb` (daylight blue) | `#554488` → `#8866aa` (violet-purple) | `#000` → `#000` (pure black) |
| **Horizon glow color** | `#ffe4a0` (warm daylight) | `#cc88ff` (pale violet) | None (black on black) |
| **Horizon glow height** | 12px | 8px | 0px |

#### Layer 2: Star Field

135 deterministic stars + shooting stars. Phase determines visibility, density, and alpha.

| Parameter | Phase 1 | Phase 2 | Phase 3 |
|---|---|---|---|
| **Stars visible** | No (daylight sky) | Upper 50% of canvas only | Full canvas |
| **Star alpha base** | 0 | 0.08–0.25 (fades in vertically) | 0.3–1.0 |
| **Shooting stars** | None | 8-20s interval, alpha 0.4 | 4-12s interval, alpha 1.0 |

Design rationale: P2 stars appear first as faint pinpricks at the very top of the canvas ("thinning atmosphere" zone) and increase as scroll moves upward. Mirrors ascending through atmosphere into space.

#### Layer 3: Clouds (Multi-Lobe Cell-Shaded)

| Parameter | Phase 1 | Phase 2 | Phase 3 |
|---|---|---|---|
| **Cloud count** | 12 | 8 | 4 |
| **Lobe range** | 3-5 lobes (full, fluffy) | 2-3 lobes (thinning) | 2 lobes (wispy silhouettes) |
| **Alpha** | 0.85 | 0.55 | 0.35 |
| **Main fill color** | `#eef0f5` (white-gray) | `#ccb3e6` (violet-white) | N/A (silhouette mode) |
| **Outline color** | `#667788` (gray) | `#443366` (dark violet) | `#000` (black silhouette) |
| **Neon rim color** | N/A | N/A | `#ff2d95` (magenta, top) + `#00f0ff` (cyan, bottom) |
| **Vertical drift speed** | 20-30 px/s | 15-25 px/s | 10-20 px/s |

Cloud shape evolution: P1 = dense rounded cumulus. P2 = stretched cirrus-like. P3 = dark silhouettes with neon rim highlights.

#### Layer 4: Hills (5-Layer Parallax Silhouettes)

| Parameter | Phase 1 | Phase 2 | Phase 3 |
|---|---|---|---|
| **Layer colors** (L1→L5) | Earth greens `#5a8a4a`→`#3a5a2a` | Purple-blues `#553366`→`#331144` | Blacks `#000`→`#000` |
| **Luminance span** | ≥40% across 5 layers | ≥35% | 0% (all black) |
| **Cyan underglow** | None | None | Alpha 0.15, 2px stroke at base |

#### Layer 5: NEAR Streaks (Foreground Parallax)

| Parameter | Phase 1 | Phase 2 | Phase 3 |
|---|---|---|---|
| **Count** | 20 | 25 | 30 |
| **Colors** | Daylight blues `#6699cc` | Violet `#8866cc` | Neon cyan/magenta/violet |
| **Alpha** | 0.08-0.30 | 0.10-0.40 | 0.15-0.55 |
| **Base speed** | 20px/s | 50px/s | 100px/s |

P1 streaks feel like distant birds or heat haze. P2 takes on a violet technological cast. P3 is full neon cyberpunk.

#### Layer 6: Floating Symbols (Crypto at Parallax Depth)

| Parameter | Phase 1 | Phase 2 | Phase 3 |
|---|---|---|---|
| **Count** | 5 | 6 | 8 |
| **Alpha** | 0.04-0.10 (barely visible against blue sky) | 0.06-0.14 | 0.08-0.15 |
| **Color** | `#aabbcc` (gray-blue) | `#8888cc` (pale violet-blue) | `#8888cc` or `#6666aa` |

### 6.2 Candlestick Chart Per Phase

| Parameter | Phase 1 | Phase 2 | Phase 3 |
|---|---|---|---|
| **Candle green** | `#00ff66` (full) | `#00cc66` | `#00aa55` (dark neon) |
| **Candle red** | `#ff3333` (full) | `#cc3333` | `#aa2233` (dark neon) |
| **Candle opacity** | 1.0 | 0.80 | 0.60 |
| **Scroll speed** | 60-120px/s | 80-150px/s | 120-180px/s |
| **Chart-to-sky contrast** | 0.40 (blends into bright sky) | 0.55 | 0.70 (max pop against black) |

Design rationale: The chart must always be SECONDARY to gameplay. P1 has the highest visibility risk (candles compete with bright sky). P3 has the cleanest read (black background makes even dim candles readable).

### 6.3 Weather System Per Phase

Weather events adjust their visual parameters per phase — the same rain that looks striking against blue sky (P1) may be nearly invisible against black void (P3).

**Rain** — P1: High visibility, dark `#6666aa` against bright sky. P3: Low visibility — shift color to `#bbaaff` (+40% luminance), increase count +50%, enable additive blend (`lighter` composite).

**Snow** — P1: Very high visibility. P3: Moderate — reduce opacity to 0.65x, reduce count -20% to avoid stark white-on-black.

**Fog** — P1: Pale blue-gray `#aaaacc`, opacity 0.06-0.10. P3: Dark blue-violet `#4444aa`, opacity 0.02-0.05 (nearly invisible). Intentional — in deep space there is no atmosphere.

**Drizzle** — P1: `#5566aa`, opacity 0.12. P3: `#8833aa`, opacity 0.08.

**Sheet lightning** — P1: Pale blue flash `#8888ff`, alpha 0.35. P3: Violet flash `#bb66ff`, alpha 0.50.

**Phase-independent** (no change needed): Bear Market lightning, wind gusts, meteor shower.

### 6.4 Phase Transition Visual Effects

Phase transitions last **8-12 seconds** using alpha crossfade on the cached sky canvas. Both old-phase and new-phase skies are rendered to separate off-screen canvases, then alpha-blended. Gameplay continues during the transition.

#### P1→P2: Blue Sky to Violet Sky

| Layer | Behavior | Midpoint (~5s) Issue |
|---|---|---|
| **Sky gradient** | Blue → violet over 10s | `#7f68b0` muddy blue-violet — worst-looking moment |
| **Stars** | Fade in from top 30% at ~4s | Acceptable |
| **Clouds** | White-gray → violet-white | Gray-violet muddy — **worst visual moment in the entire game** |
| **Hills** | Green → purple | Desaturated brown-violet — acceptable (low contrast) |
| **Overall beat** | The familiar natural world is draining away. | |

#### P2→P3: Violet Sky to Black Void

| Layer | Behavior | Midpoint Issue |
|---|---|---|
| **Sky gradient** | Violet → black over 10s | `#2a2244` very dark violet — acceptable (no muddy moment) |
| **Stars** | Spread downward, increase alpha | Stars "multiply" as sky darkens — pleasant |
| **Clouds** | Violet-white → black + neon rim | Rim alpha lags body by ~3s to avoid dirty gray |
| **NEAR streaks** | Violet → neon cyan/magenta | Dramatic but gradual |
| **Overall beat** | The world becomes pure data substrate. All neon gains contrast — the player feels POWER increasing as the world darkens. | |

#### Midpoint Legibility Safeguards

During the ~5s window around the transition midpoint:
1. **Ship highlight pass intensity +10%** (all 3 ship variants)
2. **Enemy outline stroke width +1px** (prevents blending into transitional sky)
3. Boosts peak at midpoint and fade back by transition end

### 6.5 V8 Campaign Level-to-Phase Mapping

| Level | Phase | Environment | Weather |
|---|---|---|---|
| 1 | **P1** | Blue sky, white clouds, green hills | Clear — "Earth orbit, daylight. The market opens." |
| 2 | **P1** | Blue sky, white clouds, green hills | Distant lightning (amber) |
| 3 | **P1** | Blue sky, thinning clouds, hills fading to purple | Distant lightning (violet) — "Something is changing." |
| 4 | **P1→P2** | Blue sky darkening toward violet | Transition + wind gust — "The boundary layer." |
| 5 | **P2** | Violet sky, tinted clouds, purple hills, faint stars | Drizzle, distant lightning |
| 6 | **P2** | Deep violet sky, thinner clouds, more stars | Fog, drizzle |
| 7 | **P2→P3** | Violet darkening toward black | Transition + wind burst + sheet lightning — "The edge of space." |
| 8 | **P3** | Black void, all 135 stars, cloud silhouettes with neon rim | Snow, distant lightning (indigo) |
| 9 | **P3** | Black void, neon data streaks | Snow (heavier) |
| 10 | **P3** | Black void, full neon expression | Snow (heavy) — "Final ascent." |

**Boss arena phase freeze:** Level 4 boss (FED) against P1 blue sky — teal-and-orange cinematic contrast. Level 7 boss (BCE) against P2 violet sky — lowest contrast boss fight, €/gold stars do the work. Level 10 boss (BOJ) against P3 black — pure neon contrast.

### 6.6 Arcade Mode Wave-to-Phase Mapping

| Wave Index | Cycle | Phase | Background |
|---|---|---|---|
| 1-4 | C1 | **P1** | Blue sky, clouds thinning across waves |
| 5 | C1 | **P1→P2** | Transition trigger (~8s into wave) |
| 6-9 | C2 | **P2** | Violet sky, stars filling upper 60% |
| 10 | C2 | **P2→P3** | Transition trigger |
| 11+ | C3+ | **P3** | Black void, full starfield, neon |

Phase always advances at the boss wave (5 and 10). Phase never regresses within a session.

### 6.7 PhaseTransitionController Specification

A new module `src/systems/PhaseTransitionController.js` (~150 lines) manages crossfade state:

```js
window.Game.PhaseTransitionController = {
    init(),                              // Reset state
    startTransition(fromPhase, toPhase), // Begin 8-12s crossfade
    update(dt),                          // Advance progress
    isTransitioning(),                   // Boolean
    getProgress(),                       // 0.0 to 1.0
    getSkyBlendAlpha(),                  // Sky gradient blend (0=old, 1=new)
    getLayerAlpha(layerIndex),           // Per-layer blend factor
    getMidpointBoost(),                  // Peaks at 0.5 progress (for ship/enemy compensation)
    pause(),                             // Freeze (boss spawn edge case)
    resume(),                            // Resume (fast-finish to 2s)
    onTransitionComplete(callback)
}
```

**Per-layer fade curves:** Sky gradient = linear (10s). Star field = sigmoid (emerge gradually). Clouds = linear body + lagged rim (rim starts at 5s, full at 8s). Hills = linear (8s, fastest). NEAR streaks = linear (10s). Floating symbols = linear (12s, slowest).

### 6.8 No-Change Zones

Phase-independent systems requiring NO modifications: `ParticleSystem.js`, `Enemy.js`, `Boss.js`, `Bullet.js`, `Player.js`, `ScrollEngine.js`, `CollisionSystem.js`, `ObjectPool.js`.

### Layer Separation

Strict contrast separation for readability with 200+ entities: **Background** (sky, stars, clouds, hills, chart) = low contrast. **Midground** (enemies, enemy bullets) = medium contrast. **Foreground** (player, player bullets, particles, HUD) = high contrast, neon-colored, additive blend for glows. This separation is preserved across all three phases.

---

## Section 7: UI/HUD Visual Direction

> UX detail: [`design/ux/hud.md`](../ux/hud.md), [`design/ux/intro.md`](../ux/intro.md), [`design/ux/modifier-choice.md`](../ux/modifier-choice.md)

### Dual-Surface Architecture

The HUD is split across two rendering surfaces:
- **DOM layer** (`#ui-layer`, z-index 120) — score, lives, level/wave, DIP meter, graze meter, message strips, modifier cards, pause overlay. GPU-composited, no canvas state overhead.
- **Canvas layer** — boss HP bar, combo HUD, floating damage numbers, perk icons, hit indicators.

### Visual Style

**Terminal as Frame** (Principle 1) drives all UI decisions:
- **Glass panels**: Rounded rectangles (2-4px radius), dark semi-transparent fill (`rgba(4,4,16,0.8)`), neon cyan border (`rgba(0,240,255,0.35)`)
- **Typography**: Monospace, uppercase, letter-spaced (2px), text-shadow glow. Labels in terminal white (`rgba(255,255,255,0.9)`), values in role-specific colors
- **Meters**: Flat rectangles, no gradients on fills (gradients belong to the world layer). DIP meter = violet→gold gradient, graze meter = magenta (#ff2d95)
- **Buttons**: `.btn` design system — dark fill with violet border (`#bb44ff`), hover state with 18% violet fill. Danger variant = red gradient. Disabled = 30% white border.

### Interactive Screens

| Screen | Visual Language | Key Elements |
|---|---|---|
| **INTRO** | Terminal-on-black, pulsing cursor, mode selection pills | Game title in neon violet, mode buttons with cyan borders, arcade records row |
| **HANGAR** | Blueprint grid background, ship 360° rotation, stat bars | Ship preview with rotation, stat bars (SPD/PWR/HIT), weapon level indicators |
| **PAUSE** | Frozen canvas beneath semi-transparent cyan overlay | Desaturated gameplay visible, pause menu overlaid |
| **GAMEOVER** | Dark terminal, score counter blinking red → dim violet | "REKT" label, final score, continue prompt, no particle effects |
| **Modifier Choice** | Three cards floating on black, category-colored glows | Card with icon + title + description + stats, no background decoration |

### Design Rule

**"Glow = collect, dark = avoid"** — additive glow is reserved for player-owned elements (ship, bullets, power-ups, positive feedback). Enemy elements use dark tinted outlines and never use additive blending. This is the single inviolable UI rule.

---

## Section 8: Asset Standards

### Rendering Technology

All game assets are **procedural Canvas 2D paths** — zero raster assets, zero sprite sheets, zero external image files. The only external assets are:
- **Icons** (PWA): `icon-*.png` (generated from `icon-512.svg` via `scripts/generate-icons.js`, requires sharp)
- **Video**: `splashscreen.mp4`, `completion-en.mp4`, `completion-it.mp4` — loaded as `<video>` elements, not canvas

### Procedural Asset Budgets

| Entity Type | Path Ops/Frame | Bounding Box | Notes |
|---|---|---|---|
| Player ship | ~50 (all variants) | 55×55px | 8-vertex delta + cannons + cockpit + flight deformations |
| Enemy agent | 40–60 | 58×58px | Vehicle + pilot + hat + accessory + chest mark |
| Boss | 200–400 | 160×140px | Varies by phase and attack pattern |
| Power-up | ~20 | 30×30px | Shaded sphere + icon + glow + sweep |
| Minion | ~15 | 44×44px | Coin silhouette + symbol + wing sparkles |
| Enemy bullet | ~5 | 4–12px | White body + optional tinted core |
| Player bullet | ~8 | 7×22px | Colored neon + elemental overrides |
| Particle | 1 (arc) | 2–8px | Single `arc()` call, cached color |

### Performance Constraints

- **Target**: 60fps with 200+ entities
- **Draw call optimization**: Off-screen canvas caching for sky background and hills (rebuilt on resize/color change), pre-cached rgba strings at 21 alpha steps (eliminates ~500+ string allocations/frame)
- **Glow rendering**: `globalCompositeOperation = 'lighter'` for additive neon halos, used only for player-owned elements
- **Anti-aliasing**: Canvas 2D default (none explicit) — procedural paths are inherently anti-aliased by the browser

### Naming Convention

All visual code lives in `src/` organized by concern: entities (`Player.js`, `Enemy.js`, `Boss.js`), systems (`SkyRenderer.js`, `ParticleSystem.js`, `EffectsRenderer.js`), UI (`IntroScreen.js`, `ModifierChoiceScreen.js`, `DebugOverlay.js`). No asset manifest — draw functions are the asset source of truth.

---

## Section 9: Reference Direction

### Gradius / R-Type (Classic Shmup Visual Language)

**Borrow:**
- **Parallax scrolling depth** — each layer uses a different scroll speed and color saturation to create readable depth without 3D. Gradius's approach of layered starfields, mountains, and foreground debris is the direct ancestor of the game's 6-layer sky pipeline (gradient → stars → clouds → hills → streaks → symbols).
- **Power-up capsule hierarchy** — distinct capsule shapes where form encodes function. The game's power-up system (shaded sphere + white geometric icon + rotating light sweep) follows this tradition: UPGRADE = upward arrow, HOMING = crosshair, SHIELD = shield silhouette, SPEED = lightning bolt.
- **Boss entrance ceremony** — the boss appearing as a large composite structure that enters from the top of the screen, halting scroll and establishing tension. All three bosses (FED, BCE, BOJ) follow this pattern.

**Avoid:**
- **Bio-mechanical aesthetic** — R-Type's Bydo organism feel, fleshy tendrils, living-ship visual language. This game is geometric, digital, financial — no organic forms.
- **Dark, muddy backgrounds** — R-Type's low-contrast environmental backdrops. FvC uses pure black (#000) as the canvas with neon emission. Nothing is grey or muddy.
- **Bullet-hell density** — unlike R-Type's dense pattern memorization, FvC caps enemy bullets at 150 global and uses the DIP graze system for close-range risk/reward.
