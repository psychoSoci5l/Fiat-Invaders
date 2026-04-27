# Color System — FIAT vs CRYPTO v7.12.14

> "Economy is not the theme; economy is the rendering substrate — currencies are geometry, data is light, black is the ledger."

---

## 1. Primary Palette (with Roles)

The game renders on a black substrate (`#000000`). Every color is a neon emission against this void.

| Name | Hex | Role | Emotional / Thematic Meaning |
|---|---|---|---|
| **Black** | `#000000` | Ledger substrate, UI background | The void of infinite monetary data. Nothing exists until light touches it. |
| **Neon Violet** | `#bb44ff` | Player primary (BTC), crypto allegiance | Bitcoin's brand purple. Digital royalty, sovereign money, the apex predator of currencies. |
| **Neon Cyan** | `#00f0ff` | Player secondary (SOL), UI borders, terminal glow, shield-ready | Data flow, network liquidity, SOL speed. The color of information moving across the wire. |
| **Neon Green** | `#39ff14` / `#00ff66` | FED boss, HP bars, market "up", dollar enemies | Money printer green. Growth, quantitative easing, the color of fiat being conjured from nothing. Also: "number go up." |
| **Neon Magenta** | `#ff2d95` | Danger, lives lost, graze meter fill, enemy bullet warning | The color of a margin call. Loss, liquidation, one wrong move. |
| **Gold** | `#ffd700` | HYPER mode, score, DIP meter full, power-up upgrades | Ultimate reward. The treasure at the end of the run. Full DIP = payday. |
| **Orange** | `#ff4400`–`#ffaa00` | GODCHAIN mode, fire element, charger windup | Incandescent rage, elemental fury, the heat of a proof-of-work burn. |
| **Deep Blue** | `#003399` | BCE boss, EU currency enemies | Bureaucratic EU blue. Cold, institutional, orderly — the color of regulation and treaties. |
| **Red** | `#bc002d` | BOJ boss, game over ("REKT"), market down, yen enemies | Japan's rising sun red. Also: loss, defeat, the end of a run. |
| **Terminal White** | `rgba(255,255,255,0.6–1.0)` | Neutral data, HUD labels, enemy bullets (v4.18+) | The impartial ticker tape. Pure information, no emotional valence. |

---

## 2. Semantic Color Vocabulary

Every color in the game carries meaning rooted in the financial world it parodies.

### Green (`#39ff14` / `#00ff66`)
**Means:** Money printing, inflation, fiat creation, HP integrity.

WHY green? In the real world, the US Dollar is printed in green ink. The game weaponizes this: the FED boss glows green because it IS the money printer. Dollar enemies are green because they are the most visible fiat currency. HP bars are green because health = money in the bank.

- FED boss aura (P1): neon green `#39ff14`
- FED boss bullets: `#00ff66`, `#00cc55`
- Player HP bar: green gradient
- Dollar enemy (`$`): `#00ff66`
- Shield pickups: `#2ECC71` (softer green, protective)

### Red (`#bc002d` / `#ff2d95` / `#ff3355`)
**Means:** Danger, death, BOJ, loss, liquidation.

WHY red? In financial markets, red = down. In this game, red = the BOJ (Japan's flag), yen enemies, and the color of game over ("REKT"). The graze meter fills in magenta-pink because grazing is dancing with death — the color of a near-miss. Enemy bullet warnings use magenta `#ff2d95` because that's the color of a fatal trade.

- BOJ boss: `#bc002d` (Japan red) + white + gold
- Yen enemies (`¥`): `#ff3355`
- Game over screen: red tint
- Graze meter fill: `#ff2d95` (magenta danger)
- Lives indicator: `#ff2d95`
- Dollar sign matrix rain (FED P3) overlays red corruption: `rgba(255,0,0,0.07)`
- Bomber bomb zone: `#ff4400`

### Gold (`#ffd700`)
**Means:** HYPER, max power, achievement, ultimate state.

WHY gold? Gold has been the ultimate store of value across human history. In the game, gold = HYPER mode (5x score), the DIP meter being full, weapon upgrades, and power-up pickups. Gold is the color of having "made it."

- HYPER mode: `#FFD700`
- DIP meter full: gold glow
- Score text: gold
- Weapon upgrade pickup: `#FFD700`
- BCE star nodes: `#ffdd00`
- BOJ torii gate: gold
- Speed pickups: `#F1C40F`

### Orange (`#ff4400`–`#ffaa00`)
**Means:** GODCHAIN, elemental fire, extreme power, meltdown.

WHY orange? Orange is gold pushed past its limit — the incandescent heat of a blockchain consensus mechanism burning at full capacity. GODCHAIN is the highest player state (all three elements active). Orange is what gold becomes when it's white-hot.

- GODCHAIN mode: `#ff4400`–`#ffaa00` gradient
- Fire elemental: orange tint
- FED P2 bullets: `#ffaa00`, `#ff8800`
- Kamikaze trail: `#ff6600` → `#ff3300` → `#cc0000`

### Blue (`#003399` / `#00f0ff` / `#00d2d3`)
**Means:** Institution (deep blue), data (cyan), speed (teal).

Three blues for three meanings:
- **Deep blue** `#003399` = the BCE. EU blue. Central bank authority. Cold, bureaucratic, slow.
- **Cyan** `#00f0ff` = network data flowing. UI borders. SOL ship (fast). Shield-ready indicator.
- **Teal** `#00d2d3` = SOL Speedster. Speed, liquidity, Solana's brand.

WHY blue for the ECB? The EU flag is blue with gold stars. The BCE boss is a star fortress — its 12 stars are the EU member stars, rendered in gold on deep blue.

- SOL ship: `#00d2d3`
- Shield indicator (wingtips): cyan glow
- UI borders: `#00f0ff`
- BCE boss body: `#003399`
- Euro enemies (`€`): `#2288ff`
- Missile pickups: `#3498DB`

### Purple / Violet (`#bb44ff` / `#8c7ae6`)
**Means:** Crypto, BTC, ETH, player allegiance.

WHY purple? Bitcoin's brand color. It's not fiat green or institutional blue — it's something new. Purple sits between red (danger) and blue (institution) on the spectrum, representing crypto as a third way. ETH gets a softer, more reserved purple-blue `#8c7ae6`.

- BTC Striker: `#bb44ff`
- ETH Heavy: `#8c7ae6`
- Pound enemies (`£`): `#bb44ff`
- Modifier purple: `#9b59b6`

### White (`#ffffff`)
**Means:** Pure data, neutral information, enemy bullet core, high contrast.

WHY white? White is the absence of bias. In v4.18, ALL enemy bullets were changed to white for visual clarity against the black background. The bullet core still tints with the enemy's color, but the bullet body is white — the player reads the threat immediately, uncolored by faction.

- Enemy bullets (body): `#ffffff`
- Text labels in HUD: terminal white
- BOJ phase 2 burst: `#ffffff`
- BOJ zen garden: `#ffffff` alternating with `#bc002d`

### Magenta / Pink (`#ff2d95` / `#ff3355` / `#ff1054`)
**Means:** Graze, near-miss, danger threshold, one life left.

WHY pink? Pink is the warning color before full red. The graze meter fills in pink because grazing is the mechanic of "almost dying." When the player has one life remaining, the indicator shifts toward this color.

- Graze meter: `#ff2d95` fill
- Lives at 1: `#ff2d95`
- Yen minions: `#ff3355`
- Pre-cached warning red: `rgba(255,68,68,*)`
- Pre-cached danger red: `rgba(255,100,100,*)`

---

## 3. Per-Faction Color Rules

Colors declare allegiance before the player reads a name.

### Player Ships

Each ship is a crypto protocol. Color = brand.

| Ship | Hex | Meaning |
|---|---|---|
| BTC Striker | `#bb44ff` | Digital gold purple. Bitcoin. Sovereign money. |
| ETH Heavy | `#8c7ae6` | Contract blue-purple. Ethereum. Smart contracts, slower but more powerful. |
| SOL Speedster | `#00d2d3` | Speed teal. Solana. Fastest, lightest, most fragile. |

Player bullets inherit the ship's color with a `lightenPercent(percent, 50)` highlight pass — player shots always read as neon variants of the ship's brand.

### FED (Federal Reserve)

- **Primary:** `#00ff66` — Dollar green, money printer color
- **Accent:** `#00cc55` — Deeper printer green
- **Dark:** `#004422` — Shadow green, corruption
- **Phase shift:** P1 green → P2 orange/warning → P3 red corruption
- **Bullets:** Green `#00ff66` in P1, orange `#ffaa00` in P2, cyan `#00ffff` + green in P3
- **Minion color:** `#00ff66` dollar green
- **Symbol:** `$`

### BCE (Banca Centrale Europea)

- **Primary:** `#003399` — EU flag blue
- **Accent:** `#ffcc00` — EU gold stars
- **Dark:** `#001a4d` — Deep bureaucratic shadow
- **Core glow:** Blue `rgba(0,51,153,*)` + gold `rgba(255,221,0,*)`
- **Bullets:** Blue `#003399` in P1–P2, gold/yellow `#ffdd00` for star attacks and explosions
- **Minion color:** `#2288ff` Euro blue
- **Symbol:** `€`

### BOJ (Bank of Japan)

- **Primary:** `#bc002d` — Japan red
- **Accent:** `#ffffff` — White (zen minimalism)
- **Dark:** `#6b0019` — Deep crimson shadow
- **Phase shift:** P1 deep red → P2 intensified red + white → P3 incandescent orange-red (meltdown)
- **Bullets:** Red `#bc002d` alternating with white `#ffffff`
- **Telegraph line:** `#ff0000` (bright red warning line before intervention)
- **Minion color:** `#ff3355` Yen red
- **Symbol:** `¥`

### Fiat Currency Enemies (by Tier)

Currency enemies carry their nation's color as a chest emblem and vehicle accent stripe.

| Currency | Color | Region | Shape | Meaning |
|---|---|---|---|---|
| Yen `¥` | `#ff3355` | ASIA | coin | Japan red |
| Ruble `₽` | `#6699dd` | USA | bill | Russia blue-white |
| Rupee `₹` | `#ffaa00` | ASIA | coin | Saffron/orange |
| CAD `C$` | `#e63946` | USA | bill | Canada red |
| Won `₩` | `#3366dd` | ASIA | coin | Korea blue |
| Euro `€` | `#2288ff` | EU | bill | EU blue |
| Pound `£` | `#bb44ff` | EU | coin | UK purple (ironic — a fiat currency in crypto purple) |
| Franc `₣` | `#00ddbb` | EU | bar | Swiss teal |
| Lira `₺` | `#ff8800` | EU | bill | Turkish orange |
| Dollar `$` | `#00ff66` | USA | bill | Printer green |
| Yuan `元` | `#ff2244` | ASIA | bar | China red |
| CBDC `Ⓒ` | `#aa33ff` | USA | card | Digital purple — the "new" fiat, ominous |

### Projectile Colors (Enemy Bullets)

All enemy bullets use `#ffffff` as their body color since v4.18 (visual clarity). The bullet **core** tints with `ownerColor` (the enemy's faction color) for faction identification. Arcade mode keeps full colored bullets; V8 campaign mode sets `ownerColor = null` for pure white legibility against the Gradius scroll.

---

## 4. Economy-State Color Shifts

The game world shifts its color language based on the player's power state.

### Normal State
- Ship emits its brand color (violet/blue-purple/teal)
- Trail: faint ship-color afterimage
- HUD: terminal white labels, cyan borders
- DIP meter: violet fill growing toward gold

### HYPER Mode (Gold)
Trigger: DIP meter full, player activates HYPER.
- **Visual language shifts entirely to GOLD**
- Ship aura: `#ffd700` glow
- Bullets: gold tint `#ffd700`
- Vapor trails: gold (`COLOR_HYPER` in ShipFlight config)
- Score multiplier: gold 5x indicator
- HUD border: gold pulse
- Particle effects: golden sparkles `rgba(255,215,0,*)` and `rgba(255,255,150,*)`
- Duration: short burst, aggressive play extended

### GODCHAIN Mode (Orange)
Trigger: All three elemental perks (FIRE, LASER, ELECTRIC) collected.
- **Visual language shifts to INCANDESCENT ORANGE**
- Ship aura: `#ff4400`–`#ffaa00` gradient
- Bullets: orange elemental glow
- Vapor trails: orange (`COLOR_GODCHAIN` in ShipFlight config)
- Screen flash: orange on activation
- Energy arcs: orange electric chains
- Duration: 10s base, extendable by canceling enemy bullets

### Bear Market (Desaturated Hard Mode)
Toggleable in Settings. Doubles score, increases difficulty.
- UI accent shifts toward dimmer, more aggressive tones
- Enemy bullet speed increased
- No bright color shift — the world stays cold and threatening
- HUD may display a red "BEAR" indicator
- No palette change per se — the difficulty IS the color shift

### Phase-Based Boss Color Shifts

Each boss transitions through 3 phases with distinct color language:

**FED:** Green (P1: stable printing) → Orange (P2: overheating warning) → Red-corrupted (P3: meltdown, matrix rain)
- P1: `rgb(57,255,20)` — pure neon green
- P2: `rgb(255,170,0)` — warning orange
- P3: `rgb(255,34,68)` — corruption red, overlay of `rgba(255,0,0,0.07)` on pyramid

**BCE:** Blue (P1: bureaucratic) → Blue+gold (P2: negative rates) → Fractured blue (P3: fragmentation)
- Core: deep blue `rgb(0,51,153)` with gold accents `rgb(255,221,0)`
- P3: cracks leak gold light, stars destabilize, debris particles

**BOJ:** Deep red (P1: zen) → Red+white (P2: intervention) → Incandescent (P3: meltdown)
- P1: `rgb(188,0,45)` — deep Japan red
- P2: intensified red with white intervention flashes
- P3: `rgb(255,150,0)` — gold-red incandescent, heat haze, molten drips

---

## 5. UI Palette: Terminal Colors vs World Colors

### World Colors (Canvas 2D Rendering)
- **Composite operation:** `source-over` (default) with targeted use of `lighter` (additive blending) for glows, auras, and neon edges
- **Alpha usage:** Heavy use of `rgba()` with discretized alpha steps (0.05 increments via ColorUtils cache)
- **Glow rendering:** Radial gradients with `globalCompositeOperation = 'lighter'` for additive neon halos
- **Black is the canvas:** `#000` background. Nothing is drawn on a grey or gradient sky.

### Terminal Colors (HTML/CSS UI)
The HTML overlay (HUD, menus, pause screen) uses a separate, more constrained palette:

- **Backgrounds:** `rgba(0,0,0,0.85)` — semi-transparent black panels
- **Borders:** `rgba(0,240,255,0.6)` — cyan terminal borders
- **Primary text:** `rgba(255,255,255,0.9)` — bright white labels
- **Secondary text:** `rgba(255,255,255,0.5)` — dimmer data
- **Accent text:** `#ffd700` for score, `#bb44ff` for ship names, `#ff2d95` for warnings
- **Buttons:** Dark backgrounds with cyan or white borders, text in white
- **Input fields:** Dark with cyan caret

The UI language deliberately echoes a financial terminal — Bloomberg Terminal meets The Matrix. This is "the ledger" layer. The world layer (canvas) is "the market" — volatile, neon, alive.

### HUD Layout Colors

| Element | Color | Why |
|---|---|---|
| Score | `#ffd700` | Gold = value, achievement |
| Lives | `#ff2d95` | Magenta = danger, each life is precious |
| Level / Wave | `rgba(255,255,255,0.9)` | White = neutral data |
| DIP Meter fill | Violet → Gold gradient | Violet = crypto power filling toward gold payout |
| Graze Meter fill | `#ff2d95` | Pink = near-death risk/reward |
| DIP Meter border | `#00f0ff` | Cyan = data boundary |
| HYPER button (ready) | `#ffd700` pulsing | Gold = ready to cash in |
| HYPER button (cooldown) | Dimmed/dark | Grey = depleted |
| Shield indicator | `#00f0ff` | Cyan = protective data barrier |
| Shield ready (wingtips) | `#00f0ff` glow | Same cyan, confirms readiness |
| GODCHAIN indicator | `#ff4400`–`#ffaa00` gradient | Orange = incandescent power |
| Perk element (FIRE) | Orange icon | Fire elemental |
| Perk element (LASER) | Cyan/blue icon | Precision data beam |
| Perk element (ELECTRIC) | Yellow/white icon | Electric chain |
| Health bar fill | `#39ff14` (green) | Money in the bank |
| Health bar low | `#ff2d95` (magenta) | Critical account balance |

---

## 6. Colorblind Safety

The game's visual language is **partially colorblind-safe** by design but has intentional gaps.

### What works

| Mechanism | Backup | Status |
|---|---|---|
| **Enemy faction** | Currency symbol (`$`, `€`, `¥`) renders on the enemy chest mark. The player reads the glyph, not just the color. | SAFE |
| **Enemy tier** | Size scaling (WEAK 0.85x, MEDIUM 1.0x, STRONG 1.35x) + STRONG-only gold glow halo on chest mark. | SAFE |
| **Player ship** | Ship shape differs per type (BTC swept delta, ETH broader, SOL smallest). Stats bar shows speed/power/hitbox ratings numerically. | PARTIAL — ship color is primary identifier |
| **Game state** | "REKT" text appears on death, not just red screen. HYPER button label appears, not just gold glow. | SAFE |
| **Enemy bullet danger** | All bullets white body (v4.18+). Bullet shape differs by enemy shape (coin/bill/bar/card). | SAFE |
| **Graze meter** | Bar fills with visible height change, not just color shift. Graze count displayed numerically. | SAFE |
| **Boss identity** | Boss name displayed on HP bar. Phase threshold markers visible as diamonds on bar. Country emoji in boss config. | SAFE |

### What needs icon/shape backup

| Element | Issue | Required Backup |
|---|---|---|
| **Power-up pickups** | Colors distinguish specials (HOMING=orange, PIERCE=red, MISSILE=blue, SHIELD=green, SPEED=yellow) | Each has a symbol icon (`🎯`, `🔥`, `🚀`, `🛡️`, `💨`) rendered beside the pickup. Already implemented. |
| **Perk elements** | FIRE=orange, LASER=cyan, ELECTRIC=yellow-white | Each shows a distinct icon on pickup and in the perk HUD strip. Lesson modal explains each. |
| **HYPER vs GODCHAIN** | Gold vs Orange — common confusion for deuteranopia | HYPER button shows "HYPER" label. GODCHAIN shows "GODCHAIN" text on screen. Distinct sound effects. |
| **DIP meter fill level** | Violet-to-gold color gradient | Height fills visually. Percentage or "FULL" text appears when ready. |
| **Bullet elemental tint** | FIRE=orange, LASER=cyan, ELECTRIC=white on enemy hit | Elemental tint is secondary feedback; hit flash (white) and damage numbers are primary. Sound effects differ per element. |

### Critical: Red-Green (Deuteranopia)

The most common form of colorblindness. The game uses red-green signaling in several places:

1. **FED boss (green) vs BOJ boss (red)** — Mitigated by: boss name on HP bar, symbol (`$` vs `¥`), distinct shapes (pyramid vs torii gate)
2. **HP bar (green healthy, red low)** — Mitigated by: bar width contracts, phase threshold markers visible
3. **Market direction (green=up, red=down)** — This is the ONE place where the financial metaphor intentionally sacrifices accessibility for thematic authenticity. Green = up, red = down is the universal finance convention. The player learns this in the first wave.

### Sound Backup

Every significant color-coded event has a distinct audio cue:
- HYPER activation: ascending chime
- GODCHAIN activation: layered harmonic surge
- Shield ready: soft ping
- Shield depleted: descending tone
- Graze: spark sound
- Hit taken: explosion + time-slow
- Boss phase change: heavy bass hit

---

## 7. Material Language Reference

How colors are applied to different surfaces:

| Surface | Technique | Example |
|---|---|---|
| **Enemy body** | Darkened base color (`colorDark40`) with bright outline (`colorBright`) | Euro enemy: `#2288ff` → body `rgba(20,80,153,*)`, outline `#66ccff` |
| **Enemy vehicle** | Hull (`#1a1d24`), color accent stripe, outline `#050505` | Dark tech chassis with currency color as identity stripe |
| **Boss structures** | Radial gradients + additive glow layer + `lighter` composite | FED pyramid: dark green fill with neon edge, layered halos |
| **Player ship** | Brand color body, 50% lighterened highlight, dark 30% shadow | BTC: `#bb44ff` body, `#eebbff` highlight |
| **Particles** | `rgba()` with discretized alpha (0.05 steps, cached) | Pre-cached common colors at 21 alpha levels |
| **Bullets** | White body + optional ownerColor core tint | Enemy bullet: white ellipse with colored center dot |
| **UI text** | Solid hex with no transparency (CSS), or `rgba` for dim states | Score: `#ffd700`, Labels: `rgba(255,255,255,0.9)` |
| **Glow halos** | `createRadialGradient` + `globalCompositeOperation = 'lighter'` | Enemy glow: `#2288ff` at center fading to transparent |

---

## 8. Color Generation Utilities

Located in `src/utils/ColorUtils.js`:

- `darken(color, amount)` — darken any hex/rgb by 0–1 factor
- `lighten(color, amount)` — lighten by 0–1 factor
- `lightenPercent(hex, percent)` — lighten by 0–100%
- `withAlpha(color, alpha)` — add alpha to any color
- `rgba(r, g, b, alpha)` — cached rgba string (21-step alpha discretization)
- Pre-cached colors: gold, warning red, danger red, godchain orange, shield cyan, modifier purple, black, white, grey

The game pre-caches 19 frequently-used colors at all alpha levels (21 steps from 0.00 to 1.00), eliminating ~500+ string allocations per frame in draw calls.

---

## 9. Quick Reference: Color Decision Matrix

| I need to communicate... | I use... | Because... |
|---|---|---|
| Player/crypto allegiance | Violet `#bb44ff`, Blue-purple `#8c7ae6`, Teal `#00d2d3` | Brand identity of BTC/ETH/SOL |
| Fiat money creation | Green `#39ff14`–`#00ff66` | Dollar printer color |
| Institutional authority | Deep blue `#003399` | EU flag, BCE brand |
| Danger / death / loss | Red `#bc002d`, Magenta `#ff2d95` | Market down, Japan flag |
| Ultimate power / reward | Gold `#ffd700` | Store of value |
| Incandescent fury | Orange `#ff4400`–`#ffaa00` | Heat of proof-of-work |
| Neutral data | White `rgba(255,255,255,0.6–1.0)` | Uncolored information |
| Network / data flow | Cyan `#00f0ff` | Data in motion |
| Enemy faction | Currency accent color on chest + vehicle | Each fiat currency's national color |
| Player power state | Ship color shifts: Normal → Gold (HYPER) → Orange (GODCHAIN) | Escalating value → incandescence |
| Boss phase progression | Boss accent shifts toward red/corruption | Decaying institutional control |
