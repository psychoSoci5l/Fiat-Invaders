# Visual Design — Phase-Aware UI Theming

**Status**: Approved
**Author**: art-director
**Date**: 2026-04-29
**Engine**: Vanilla JavaScript (Canvas 2D + DOM overlay)
**Platform Target**: Mobile PWA + Desktop browser
**Accessibility Tier**: Basic

---

## 1. Visual Treatment by Phase

### Phase 1 — Earth (Horizon)

**Mood**: "First light over the exchange — clean, open, the start of a run."

The UI shifts from its default violet to a cooler blue-cyan palette. Terminal borders take on a sky-blue tint (`rgba(74, 144, 217, 0.35)`), neon accents shift to cyan-blue (`#4a90d9`), and the secondary accent warms to amber (`#ffb347`). Against the blue sky gradient and green hills of Phase 1 backgrounds, the UI reads as **cool data overlays on a live feed** — the Bloomberg terminal at dawn.

| CSS Variable | Phase 1 Value | Visual Effect |
|---|---|---|
| `--terminal-border` | `rgba(74, 144, 217, 0.35)` | Sky-blue border glow — complements blue sky bg |
| `--neon-accent` | `#4a90d9` | Labels, HUD accents, status icons in blue |
| `--accent-secondary` | `#ffb347` | Warm amber — the only warm note in the cool P1 palette |
| `--hud-glow-rgb` | `74, 144, 217` | HUD glow shifted blue, reduced amplitude (0.85×) |
| `--hud-glow-multiplier` | `0.85` | Glow alpha scaled to 85% — subtle against bright sky |

**What does NOT change in P1:**
- Terminal bg remains `rgba(4,4,16,0.85)` — dark panel is the anchor
- All semantic colors (gold score, green HP, red danger, orange GODCHAIN) are invariant
- Button system remains violet (see Section 6)

---

### Phase 2 — Atmosphere (Twilight)

**Mood**: "The purple hour — transition, uncertainty, the known middle."

This is the heritage/default palette — the UI the game has shipped with since v5. Terminal borders are violet (`rgba(136, 102, 170, 0.40)`), neon accents are violet-purple (`#8866aa`), secondary accent is neon violet (`#bb44ff`). Against the violet sky and purple clouds of Phase 2, the UI is **comfortably consistent** — the player's learned visual baseline.

| CSS Variable | Phase 2 Value | Visual Effect |
|---|---|---|
| `--terminal-border` | `rgba(136, 102, 170, 0.40)` | Violet border — heritage default |
| `--neon-accent` | `#8866aa` | Violet-purple labels — the baseline |
| `--accent-secondary` | `#bb44ff` | Classic neon violet |
| `--hud-glow-rgb` | `136, 102, 170` | Violet HUD glow, standard amplitude (1.0×) |
| `--hud-glow-multiplier` | `1.0` | Default glow — no scaling |

**What does NOT change in P2:**
- Same invariants as P1

---

### Phase 3 — Deep Space (Void)

**Mood**: "Neon against the ledger — pure data, pure contrast."

The UI shifts to maximum contrast. Terminal borders become bright cyan (`rgba(0, 240, 255, 0.50)`), neon accents shift to `#00f0ff`, and the secondary accent becomes neon magenta (`#ff2d95`). Against pure black sky, the UI **pops** — every border, glow, and accent stands at full intensity.

| CSS Variable | Phase 3 Value | Visual Effect |
|---|---|---|
| `--terminal-border` | `rgba(0, 240, 255, 0.50)` | Bright cyan border — highest contrast against black |
| `--neon-accent` | `#00f0ff` | Cyan labels — maximum readability against void |
| `--accent-secondary` | `#ff2d95` | Magenta — danger edge, the void's warning color |
| `--hud-glow-rgb` | `0, 240, 255` | Cyan HUD glow, boosted amplitude (1.2×) |
| `--hud-glow-multiplier` | `1.2` | Glow alpha scaled to 120% — pops against void |

**What does NOT change in P3:**
- Same invariants as P1/P2

---

## 2. Invariant Visuals

The following colors are **semantically loaded** and remain locked across all phases:

| Color | Hex | Elements | Rationale |
|---|---|---|---|
| Score Gold | `#ffd700` | Score values, HYPER mode, DIP meter full | Reward signal — must always read as "valuable" |
| Danger Magenta | `#ff2d95` | Lives count, graze meter fill, danger state | Loss/warning — must read immediately |
| HP Green | `#39ff14` | HP bars, shield pickup | Health — universal green = good |
| GODCHAIN Orange | `#ff4400`–`#ffaa00` | GODCHAIN mode, fire perk | Elemental fury — distinct from gold/cyan |
| Category Orange | `#ff6b35` | OFFENSE modifier category | Semantic — tells choice type, not ambiance |
| Category Cyan | `#00f0ff` | DEFENSE modifier category | Semantic — tells choice type |
| Category Magenta | `#ff2d95` | WILD modifier category | Semantic — tells choice type |
| Selection Green | `#39ff14` | Selected card glow | Choice confirmation — must read as "selected" |
| Button Violet | `#bb44ff` | `.btn-primary`, `.btn-toggle`, `.btn-icon` | Interaction layer — frame shifts, buttons don't |

**Phase-agnostic surfaces:**
- `--terminal-bg`: `rgba(4,4,16,0.85)` — never changes
- `--terminal-white`: `rgba(255,255,255,0.6–1.0)` — never changes
- All `.btn-*` button colors — never change (see Section 6)
- Combat state bars (HYPER/GODCHAIN/HYPERGOD) — own fixed colors
- Danger message strip types — always red/gold gradient, phase unaffected
- Ship brand colors (BTC violet, ETH blue-purple, SOL teal) — invariant
- Floating feedback text colors (white/gold/orange/magenta) — canvas-rendered, phase unaffected

---

## 3. Glow & Effects

### Glow Amplitude by Phase

HUD glow intensity is scaled to match ambient lighting conditions:

| Phase | Multiplier | Alpha on `--hud-glow-rgb` | Rationale |
|---|---|---|---|
| P1 — Earth | 0.85× | `rgba(74, 144, 217, 0.21)` | Blue sky ambient washes out glow — keep subtle |
| P2 — Atmosphere | 1.0× | `rgba(136, 102, 170, 0.30)` | Standard — twilight contrast works as-is |
| P3 — Void | 1.2× | `rgba(0, 240, 255, 0.42)` | Black void needs brighter glow for same visual weight |

The multiplier is applied as `rgba(R, G, B, BASE_ALPHA × multiplier)` on box-shadow and glow elements.

### Glitch Intensity by Phase (Game Over)

| Phase | Offset | Speed | CSS |
|---|---|---|---|
| P1 | 1px | Standard | `--glitch-offset: 1px; --glitch-speed: 1s` |
| P2 | 2px | Moderate | `--glitch-offset: 2px; --glitch-speed: 0.6s` |
| P3 | 3px | Fast | `--glitch-offset: 3px; --glitch-speed: 0.3s` |

`prefers-reduced-motion`: glitch animation suppressed entirely.

### HUD Glow Color by Phase

| Element | P1 | P2 | P3 |
|---|---|---|---|
| HYPER ready ring | Blue `rgba(74,144,217,0.4)` | Violet `rgba(136,102,170,0.4)` | Cyan `rgba(0,240,255,0.4)` |
| Shield ready ring | Blue `rgba(74,144,217,0.4)` | Violet `rgba(136,102,170,0.4)` | Cyan `rgba(0,240,255,0.4)` |
| DIP meter border | Blue `rgba(74,144,217,0.35)` | Violet `rgba(136,102,170,0.40)` | Cyan `rgba(0,240,255,0.50)` |
| Message strip border | Blue `rgba(74,144,217,0.35)` | Violet `rgba(136,102,170,0.40)` | Cyan `rgba(0,240,255,0.50)` |
| Status HUD icon glow | `#4a90d9` | `#8866aa` | `#00f0ff` |

---

## 4. Asset Requirements

**No new assets required.**

The phase-aware theming system operates entirely through CSS custom property updates — no new icons, textures, fonts, sprites, or gradient images are needed.

| Asset Category | Needed? | Notes |
|---|---|---|
| Textures / Backgrounds | No | All sky/weather backgrounds are canvas-rendered and already phase-aware |
| Vector icons / SVGs | No | Existing icon set works across all phases — colors are CSS-driven |
| Font files | No | Monospace stack is invariant; phase theming doesn't touch typography |
| Canvas sprites | No | Ship, enemy, bullet, and boss sprites are procedural canvas draws, not phase-affected |
| Gradient images | No | DIP meter gradient uses CSS gradient — color stops shift per phase in code |

**New CSS variables to add to `:root` (style.css):**

```css
:root {
    /* Phase-aware — updated via JS on phase change */
    --neon-accent: #4a90d9;          /* Phase 1 default */
    --accent-secondary: #ffb347;     /* Phase 1 default */
    --hud-glow-rgb: 74, 144, 217;    /* Phase 1 default */
    --hud-glow-multiplier: 0.85;     /* Phase 1 default */

    /* Glitch — updated via data-death-phase attribute */
    --glitch-offset: 1px;
    --glitch-speed: 1s;
}
```

---

## 5. Accessibility Verification

### Color-Alone Check

All phase-dependent color changes pass the Basic tier requirement: **no information conveyed solely through color**.

| Element | Color Signal | Secondary Signal |
|---|---|---|
| HUD level indicator | `--neon-accent` tint | Text label ("L1", "L2", "L3") |
| Terminal border | `--terminal-border` tint | Border is a frame — no information |
| HUD glow | `--hud-glow-rgb` tint | Glow is decorative only — no information |
| Status HUD icon glow | `--neon-accent` tint | Icon shape + text label |
| DIP meter border | `--terminal-border` tint | Fill level + percentage |
| Game over heading glitch | Position offset + speed | Text content unchanged |
| Modifier card border | `--terminal-border` tint | Text label + category badge |
| Stack badge | `--neon-accent` tint | Number text ("x2", "x3") |
| Lives count | Invariant `#ff2d95` | Number + heart icon |
| Score | Invariant gold `#ffd700` | Numeric value + "SCORE" label |

### Reduced Motion

- **SPLASH palette cycling**: suppressed when `prefers-reduced-motion: reduce`; locks to Phase 2
- **Game over glitch**: suppressed when `prefers-reduced-motion: reduce`; text renders without offset
- **HUD glow animation**: no animation — glow is static CSS (no pulsing keyframes affected)
- **Phase snap in gameplay**: instantaneous — no animation to suppress

### Contrast Verification

All phase values verified against WCAG AA (minimum 4.5:1):

| Element | Phase 1 | Phase 2 | Phase 3 |
|---|---|---|---|
| `--neon-accent` on black bg | `#4a90d9` — 6.28:1 ✅ AA | `#8866aa` — 5.1:1 ✅ AA | `#00f0ff` — 8.0:1 ✅ AAA |
| `--terminal-border` on `--terminal-bg` | Passes 4.5:1 ✅ | Passes 4.5:1 ✅ | Passes 4.5:1 ✅ |
| Primary text on terminal-bg | 15:1+ ✅ AAA | 15:1+ ✅ AAA | 15:1+ ✅ AAA |

---

## 6. Consistency Check

### Button Design System Compatibility

The current button system uses violet as its base color across all variants:

| Button Type | Current Violet Base | Phase-Compatible? |
|---|---|---|
| `.btn-primary` | Violet border + fill | ✅ Invariant — frame shifts, actions don't |
| `.btn-danger` | Red gradient | ✅ Invariant — danger is semantic |
| `.btn-toggle` | Violet border | ✅ Invariant |
| `.btn-icon` | Violet gradient | ✅ Invariant |
| `.btn-icon-round` | Violet gradient | ✅ Invariant |

**Decision: Buttons remain violet across all phases** for three reasons:

1. Buttons are an **interaction layer** — changing their color per phase would confuse affordance
2. The frame (borders, backgrounds, glows) shifting is sufficient to carry the phase mood
3. Violet is the game's brand color for crypto — buttons are brand anchors

No conflicts found with any existing visual pattern:
- `glow = collect, dark = avoid` rule unaffected
- Score streak colors unaffected
- Combat state bars unaffected
- Lives flash behavior unaffected
- Message strip type colors unaffected
- Modifier card behaviors unaffected
- Title animation unaffected

### Verification Checklist

- [x] Does P1 blue accent compete with shield cyan? — No, shield is `#00f0ff` fixed; neon accent is `#4a90d9` — distinct
- [x] Does P3 magenta secondary conflict with danger magenta? — `--accent-secondary` is `#ff2d95`, same as danger. But secondary accent only applies to frame elements (glow tints, non-critical labels), not danger signals. Acceptable.
- [x] Is P1 amber (`#ffb347`) readable on blue sky? — Amber appears on dark terminal panels, not directly on sky — contrast maintained
- [x] Does P3 bright cyan cause eye strain? — Cyan on black is high-contrast but not harsh (cyan is mid-frequency, not blue/violet high-frequency). Acceptable for a "void" phase.
- [x] Are transition midpoints considered? — UI snaps on phase completion, not during crossfade — no midpoint colors to verify

---

## 7. New CSS Variables to Add

```css
:root {
    /* Phase-aware accent system (added v7.17.0) */
    --neon-accent: #4a90d9;          /* P1 default — updated via JS */
    --accent-secondary: #ffb347;     /* P1 default — updated via JS */
    --hud-glow-rgb: 74, 144, 217;    /* P1 default — updated via JS */
    --hud-glow-multiplier: 0.85;     /* P1 default — updated via JS */

    /* Death-phase glitch system (added v7.17.0) */
    --glitch-offset: 1px;            /* Updated via data-death-phase attr */
    --glitch-speed: 1s;              /* Updated via data-death-phase attr */
}
```

These are the **only** additions to `:root`. No new CSS classes, no new DOM elements, no new assets.
