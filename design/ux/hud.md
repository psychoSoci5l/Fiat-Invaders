---
Status: Reverse-documented from v7.12.3
Author: reverse-document + ux-designer
Last Updated: 2026-04-23
Template: HUD Design
Platform Target: Mobile (PWA primary), Desktop browser secondary
Accessibility Tier: Undefined — no formal audit on file; observations noted per element
---

# HUD Design — FIAT vs CRYPTO

## HUD Philosophy

The HUD is split across two rendering surfaces: the **DOM layer** (`#ui-layer`, z-index 120, inside `#game-container`) and the **canvas** (below). DOM handles score, lives, level, meters, and message strips; canvas handles boss phase slots, combo HUD, floating text, and perk icons. The separation exists for performance: DOM elements are GPU-composited independently and avoid canvas state overhead.

The design rule codified in CLAUDE.md: **"glow = collect, dark = avoid"** — additive glow is reserved for player-owned elements (ship, bullets, power-ups, positive feedback); enemy elements use dark tinted outlines.

Meme/status feedback is channelled through a single DOM node (`#meme-popup`) that changes role at runtime: meme popup outside PLAY state, status HUD during PLAY state. This dual-use is intentional but creates an invisible contract that must not be broken.

---

## Information Architecture

### Full Information Inventory

| Information | Element | Surface | Visible During |
|---|---|---|---|
| Score (current) | `#scoreVal` `.hud-score-value` | DOM | PLAY |
| Lives remaining | `#livesText` + `.hud-heart` | DOM | PLAY |
| Level number | `#lvlVal` `.hud-level` | DOM | PLAY |
| DIP / Proximity Kill meter | `#graze-meter` / `#graze-fill` | DOM | PLAY |
| HYPER button + radial cooldown | `#t-hyper` `.hyper-btn-wrapper` | DOM | PLAY (touch) |
| Shield button + radial cooldown | `#t-shield` `.shield-btn-wrapper` | DOM | PLAY (touch) |
| Message strip (wave/danger/victory/pickup) | `#message-strip` | DOM | All states |
| Combat state bar (HYPER/GODCHAIN/HYPERGOD) | `#message-strip` (combat type) | DOM | PLAY |
| Meme popup (non-PLAY) | `#meme-popup` | DOM | Non-PLAY |
| Status HUD (PLAY) | `#meme-popup` (status-* class) | DOM | PLAY |
| Pause button | `#pause-btn` | DOM | PLAY |
| Boss phase slots | Canvas draw call | Canvas | Boss fight |
| Arcade combo HUD | Canvas `drawArcadeComboHUD` | Canvas | PLAY (Arcade) |
| Floating score text | Canvas `FloatingTextManager` | Canvas | PLAY (disabled by default) |
| Perk icons | Canvas `PerkIconManager` | Canvas | PLAY |
| Control mode toast | `#control-toast` | DOM | Session start |

### Categorization (Nielsen's information scent)

**Always-on (ambient):** Score, lives, level — player references continuously.

**Threshold-reactive (alert):** DIP meter fill, HYPER/shield radial progress, score pulse — changes appearance only when approaching or crossing a threshold.

**Event-driven (transient):** Message strip messages, status HUD, meme popup — appear on event, auto-dismiss.

**Combat-persistent (while active):** Combat bar (HYPER/GODCHAIN/HYPERGOD) — replaces normal message strip content for the full duration of the state; updates countdown every frame.

---

## Layout Zones

```
┌──────────────────────────────────┐  ← --safe-top boundary
│  ♥ 3   [SCORE]   LV 1           │  hud-top-bar  height=45px+safe-top
├──────────────────────────────────┤
│  [MESSAGE STRIP]  top=47px+safe  │  z-index 110, height ~34px
│                                  │
│         GAMEPLAY AREA            │
│                                  │
│    [MEME / STATUS HUD]           │  bottom=240px+safe-bottom, z-index 90
│                                  │
│  [DIP METER]                     │  bottom=95px+safe-bottom, centered
│                                  │
│  🛡️ SHIELD    [JOYSTICK]  ⚡ HYPER │  bottom area, respects --safe-bottom
└──────────────────────────────────┘  ← --safe-bottom boundary
      ↑ Pause btn: left=10px, top=47px+safe-top (below top bar)
```

**Gameplay safe zone:** Top of playfield starts at 65px (HUD top bar 45px + message strip 34px). Boss `targetY` = 65 + safeOffset per CLAUDE.md.

**Canvas playable height:** `gameHeight - safeBottom` — ship is capped at `playableHeight - RESET_Y_OFFSET` to stay above home indicator.

---

## HUD Elements

### Top Bar (`.hud-top-bar`)

- **Position:** `top: 0; width: 100%; height: calc(45px + --safe-top)`
- **Padding:** `max(calc(8px + --safe-top), 20px)` top — Dynamic Island safe
- **Layout:** flex row, space-between; 3 columns (lives / score / level)
- **Pointer events:** none (pass-through to canvas)

**Lives** (`.hud-lives`): heart glyph `♥` (#ff2d95 magenta) + number `#livesText`. Danger state (1 life): `.lives-danger` turns text red (#FF4444) with glow.

**Score** (`.hud-score-compact` / `#scoreVal`):
- Absolute-centered via `left:50%; transform:translateX(-50%)`
- `top: calc(--safe-top + 8px)` — explicitly avoids Dynamic Island
- Font: 36px, weight 900
- Color shifts: streak-10 = green, streak-25 = gold, streak-50 = red, HYPER active = gold with infinite pulse animation `hyperScorePulse`
- New record: magenta (`#ff2d95`) persistent glow class `.score-new-record`; one-shot break flash `.score-record-break`

**Level** (`.hud-level` / `#lvlVal`): right side, `::before` pseudo-element renders "LV" prefix (10px). Number 20px weight 900.

### Message Strip (`#message-strip`)

- **Position:** `top: calc(47px + --safe-top); left:0; right:0; z-index: 110`
- **Inside `#game-container`** (not a sibling)
- **Priority types** (from `Balance.MESSAGE_STRIP`):

| Type | Priority | Duration | Visual |
|---|---|---|---|
| DANGER | 3 | 2500ms | Red gradient bg, red border-bottom, 20px text |
| VICTORY | 3 | 3000ms | Dark gold bg, violet border-bottom, 20px violet text |
| PICKUP | 2 | 1500ms | — |
| WAVE | 2 | 2500ms | Semi-transparent bg, violet 14px text |
| INFO | 1 | 2000ms | — |

- **Combat state types** (persistent, no auto-dismiss, no entrance animation):

| State | Class | Visual | Left offset |
|---|---|---|---|
| HYPER | `type-combat-hyper` | Dark bg, white border, gold fill bar | 68px (clears pause btn) |
| GODCHAIN | `type-combat-godchain` | Cyan gradient, pulsing animation | 68px |
| HYPERGOD | `type-combat-hypergod` | Animated gradient (gold→orange→red→violet), border shift | 68px |

Combat states are managed by `_updateCombatHUD()` in `main.js`, called every frame. Label format: `⚡ HYPER 8.3s` / `⛓ GODCHAIN 9.1s` / `⚡⛓ HYPERGOD 7.4s`. Progress fill width is updated via `MessageSystem.updateCombatDisplay()`.

CRITICAL memes during PLAY are redirected here (boss defeated → victory type, death → danger type) by `MemeEngine.queueMeme()`.

### Status HUD (`#meme-popup` with `status-*` class)

- **Position:** `bottom: calc(240px + --safe-bottom); left:0; right:0; z-index: 90`
- **Dual-role element:** meme popup outside PLAY, status readout during PLAY
- **API:** `G.MemeEngine.showStatus(text, icon, statusType, duration, countdown)`
- **Status types and colors:**

| statusType | Color | Effect |
|---|---|---|
| fire | `#ff6600` | Flickering orange/red text-shadow |
| laser | `#00f0ff` | Steady cyan glow |
| electric | `#bb44ff` | Intermittent violet/cyan flash |
| godchain | `#FFD700` | Gold shimmer |
| homing | `#ff8800` | Warm orange glow |
| pierce | (not extracted — inferred present) | — |
| missile | (not extracted — inferred present) | — |
| shield | `#00f0ff` | Cyan pulse |
| speed | `#ffcc00` | Yellow flash |
| upgrade | (not extracted) | — |

- **Countdown:** when `countdown=true`, text updates live with remaining seconds (e.g. `HOMING 7.3s`) via `MemeEngine.update(dt)`
- **Dismissal:** `status-fade-out` class, 600ms `statusPulseFade` animation, then class cleared
- **Meme suppression during PLAY:** all non-CRITICAL meme queue calls return early if `G.GameState.is('PLAY')`. Combat suppression also applies outside PLAY via `isSuppressed()` using a 2s wave-start grace window.

### DIP Meter / Graze Bar (`#graze-meter`)

- **Position:** `bottom: calc(95px + --safe-bottom); left: 50%; transform: translateX(-50%)`
- **Label:** `#graze-label` shows "DIP" (renamed from GRAZE in gameplay text, per tutorial copy)
- **States:**
  - Default: thin horizontal bar, cyan fill
  - `.graze-approaching`: faster shimmer animation (0.8s)
  - `.graze-full`: pulsing glow (`#ff69b4` pink, `#ffff00` yellow), rainbow gradient fill cycling at 0.8s, label pulses
  - `.pulse`: brief pulse on graze event (0.3s)

### HYPER Button (`.hyper-btn-wrapper` / `#t-hyper`)

- **Position:** `right: 20px; bottom: calc(75px + --safe-bottom)`
- **Size:** 68×68px circle with radial SVG progress ring
- **Hidden by default** (display:none), shown via `.visible` class on touch devices
- **States:**
  - Default: dimmed
  - `.ready`: gold gradient bg (`#FFD700`→`#B8860B`), pulsing glow (1.0s cycle), progress ring stroke-dashoffset = 0
  - `.active`: white-gold intense glow
  - `:active`: press feedback (translateY 2px, scale 0.95)
- **Radial progress:** SVG `stroke-dashoffset` driven by DIP meter fill percentage; transitions 0.1s linear

### Shield Button (`.shield-btn-wrapper` / `#t-shield`)

- **Position:** `left: 20px; bottom: calc(90px + --safe-bottom)`
- **Mirrors HYPER pattern:** same SVG radial cooldown ring, 68×68px
- **States:**
  - `.ready`: cyan gradient (`#0ff`→`#088`), 1.5s pulse
  - `.active`: bright white with intense cyan glow
  - Cooldown ring stroke in cyan

### Joystick (`#joystick`)

- **Position:** `left: 50%; bottom: calc(5px + --safe-bottom)`
- **Mode-dependent visibility:** shown only in JOYSTICK control mode
- **Not visible in SWIPE or TILT modes**

### Pause Button (`#pause-btn`)

- **Position:** `left: 10px; top: calc(47px + --safe-top)` — directly below top bar
- **Style:** gold pill, violet on press
- **Note:** Combat HUD bar (HYPER/GODCHAIN) uses `left: 68px` to leave space for pause button

---

## Dynamic Behaviors

### Score Pulse Tiers

Five tiers based on score gain per kill (`Balance.JUICE.SCORE_PULSE_TIERS`):

| Tier | Threshold | Scale | Duration | Shake | CSS class |
|---|---|---|---|---|---|
| MICRO | 0 | 1.0 | 0ms | 0 | (none) |
| NORMAL | 100 | 1.15× | 200ms | 0 | `.score-normal` |
| BIG | 500 | 1.30× | 300ms | 2px | `.score-big` |
| MASSIVE | 2000 | 1.50× | 400ms | 4px | `.score-massive` |
| LEGENDARY | 5000 | 1.80× | 500ms | 6px | `.score-legendary` |

**Accumulator mechanic:** rapid consecutive kills inflate the tier by up to 2 levels (`ACCUMULATOR_MAX_BUMP: 2`), decaying over 0.4s. Implemented in `_getScoreTier()` / `updateScore()` in `main.js`.

### Message Strip Priority Queue

`MessageSystem` (`src/systems/MessageSystem.js`) manages a priority queue with cooldown (`Balance.MESSAGE_STRIP.COOLDOWN: 300ms`). DANGER and VICTORY (priority 3) interrupt lower-priority content. Combat state is a separate persistent slot that does not participate in the queue — it is set/cleared by `_updateCombatHUD()` every frame.

### Meme Popup Queue

`MemeEngine` maintains an internal queue (max 5 items, `MAX_QUEUE_SIZE`). Tiers: CRITICAL (interrupts immediately), HIGH (cooldown 400ms), NORMAL (cooldown 800ms). Queue sorted by priority descending, FIFO within same priority. Exit animation 250ms before next item is shown.

### GODCHAIN / HYPER Overlay (Combat HUD)

Managed entirely by `_updateCombatHUD()` called each game loop frame. Three mutually exclusive sub-states: hyper-only, godchain-only, hypergod (both simultaneously). Each displays a live countdown in the message strip label and a progress fill width. Screen flash (`triggerScreenFlash`) fires on GODCHAIN_ACTIVATED event separately from the strip. A LessonModal is shown once on first GODCHAIN activation (400ms delay, game paused).

### Boss Phase Indicators

Rendered on canvas (not DOM). Not reverse-documented here — implementation lives in `Boss.js` and `main.js` render loop. Referenced in CLAUDE.md as "boss cinematics" under `Balance.JUICE`.

---

## Platform & Input Variants

### Mobile (PWA primary)

- Touch controls visible (`@media (hover: none) and (pointer: coarse)`)
- Shield button: left side, tap ship also activates (per tutorial text)
- HYPER button: right side
- Joystick or swipe zones depending on `fiat_control_mode` localStorage setting
- Tilt mode: additional opt-in via settings; replaces joystick/swipe for X-axis movement; autofire always on in tilt mode
- Safe areas enforced via JS heuristic: `--safe-top` (PWA minimum 59px for Dynamic Island on iOS ≥ iPhone X height), `--safe-bottom` (PWA minimum 34px)
- `--di-safe-top`: separate var for static screens (intro, gameover) that use `env(safe-area-inset-top)` which returns 0 in some iOS Safari modes

### Desktop (browser secondary)

- Touch controls hidden
- Mouse: hold left click = move + fire, right click = shield
- Keyboard: A/D or arrows (move), Space/Up (fire), S/Down (shield), ESC (pause)
- Viewport: `#game-container` gets `max-height: 1300px; border-radius: 20px; box-shadow` — phone-like centered frame at `@media (hover: hover) and (pointer: fine)`
- Score and top bar layout unchanged; HYPER/shield buttons not shown (keyboard shortcuts used instead)

---

## Accessibility

| Criterion | Status | Notes |
|---|---|---|
| Keyboard-only playable | Partial | Move/fire/shield/pause covered; HYPER activation keyboard binding not found in manual or tutorial |
| Gamepad | Undefined | No gamepad API found in InputSystem review |
| Text readable at min font size | Partial | Min observed: 10px (#graze-label, #graze-count). Below WCAG recommended 12px minimum for legibility |
| Functional without color alone | No | Lives danger state, score streak states, all status HUD types, and DIP meter full state rely on color changes with no secondary indicator (icon, shape, text change) |
| No flashing without warning | Unknown | GODCHAIN_ACTIVATED fires a screen flash; no seizure warning implemented |
| Subtitles for dialogue | Unknown | Story dialogue system exists (DialogueUI.js) — subtitle/accessibility options not confirmed |
| UI scales at all resolutions | Partial | Responsive breakpoints at ≤375px and ≤320px for font sizes; button 44px touch targets confirmed for shield/HYPER; graze label 10px does not scale |

---

## Open Questions

1. **HYPER keyboard trigger:** The tutorial step 3 mentions "tap the HYPER button" (mobile-only framing). No keyboard binding for HYPER activation was found in the manual table or InputSystem grep. Is HYPER inaccessible on desktop/keyboard?

2. **`status-pierce`, `status-missile`, `status-upgrade` CSS:** These types are listed in the `showStatus` JSDoc but their CSS rules were not found in the style.css grep (only fire/laser/electric/godchain/homing/shield/speed). Either they fall through to default styling or the rules exist outside the searched range.

3. **Boss phase canvas HUD:** Boss phase slots are canvas-rendered but not reverse-documented here. Their safe-zone positioning, font, and color are undocumented at the UX level.

4. **Arcade combo HUD:** `drawArcadeComboHUD` is a canvas draw call — its layout zone, colors, and thresholds are not documented in this file. Needs a separate pass against `main.js` ~line 3401+.

5. **`#graze-count` element:** Present in CSS (`right: 8px; font-size: 10px`) but not found in index.html markup. May be dynamically injected by JS or may be dead CSS.

6. **Colorblind mode:** No colorblind palette or mode switch found. The primary semantic color channel — cyan (friendly/safe) vs magenta (danger) — is partially mitigated by the `glowing = collect` rule, but no formal colorblind accommodation exists.

7. **`--vp-safe-top` / `--vp-safe-bottom`:** Set in JS resize() for full-screen modals outside `#game-container`. No CSS usage was found in the grep sample — confirm they are actually applied to modal positioning or are dead.
