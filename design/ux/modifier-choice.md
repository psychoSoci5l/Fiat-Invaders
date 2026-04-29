---
title: Modifier Choice Screen
status: Reverse-documented from v7.12.3
author: reverse-document + ux-designer
last_updated: 2026-04-29
template: UX Spec
platform_target: Mobile PWA + Desktop browser
mode: Arcade only
scope: >
  DOM modal that appears post-boss (3 cards) and post-mini-boss (2 cards).
  Player selects 1 modifier to permanently add to the current run.
---

## Purpose & Player Need

The Modifier Choice Screen is the Arcade mode's core roguelike decision point.
After defeating a boss or mini-boss, the game pauses to offer the player a
curated set of permanent run modifiers. The player's choice meaningfully shapes
their remaining run — increasing offense, survivability, or accepting risky
trade-offs for reward. The screen must communicate: what each modifier does,
which category it belongs to, whether a modifier stacks with what the player
already has, and that the game is waiting for them (not a race).


## Player Context on Arrival

- The player has just won a high-stakes fight (boss or mini-boss).
- Adrenaline is still high; cognitive load is elevated.
- They have no prior information about which modifiers will be offered.
- They may already carry 0–N modifiers from previous picks in this run.
- They are in a relief + anticipation emotional state — a classic roguelike
  "shop moment." Design must reward that moment without overwhelming it.


## Navigation Position

```
Boot → Intro → Mode Select (ARCADE) → PLAY → [Boss/MiniBoss defeated]
  └── Modifier Choice Screen → PLAY (next wave / next cycle)
```

This screen sits entirely outside normal game flow; it is not reachable from
menus. It is modal: the game loop continues to tick in the background (canvas
renders), but all player input that would affect gameplay is suspended while
the overlay is visible.


## Entry & Exit Points

| Trigger | Card count | Entry delay | Caller |
|---|---|---|---|
| Boss defeated (Arcade) | 3 | BOSS_CELEBRATION_DELAY (7.5 s) + nested bossDeathTimeout (unspecified 2nd delay) | `GameplayCallbacks.js` |
| Mini-boss defeated (Arcade) | 2 | 800 ms (hardcoded `setTimeout`) | `MiniBossManager.js` |
| Pool exhausted (all modifiers at max stacks) | 0 | — | `ModifierChoiceScreen.show()` skips immediately |

Exit is always via card selection. There is no cancel, back button, or timeout.
The `onComplete` callback resumes gameplay (next wave start, Extra Life
application, etc.).


## Layout Specification

### Information Hierarchy

1. Screen heading — action prompt ("CHOOSE YOUR PROTOCOL")
2. Cards (2 or 3) — parallel choices, each self-contained
3. Per-card: icon > name (+ stack indicator if applicable) > description > category label

### Layout Zones

```
[modifier-overlay — position: fixed; inset: 0; z-index: 9800; background: #000]
  [.modifier-header — heading, neon-violet, Courier New 22px bold]
  [#modifier-cards — flex row, gap 14px, max-width 500px (3 cards) / 340px (2 cards)]
    [.modifier-card × N — flex 0 0 140px, OLED black, rounded 12px]
```

### Layout Zones — Responsive

- 3-card layout: `max-width: 500px`, cards wrap if viewport is narrower.
- 2-card layout: `.modifier-cards-2` class, `max-width: 340px`.
- Cards are `flex-wrap: wrap`, so on very narrow screens (< ~300px) they stack
  vertically. No explicit breakpoint handles this; wrapping is the fallback.

### Component Inventory

| Component | Element | Key CSS |
|---|---|---|
| Overlay backdrop | `#modifier-overlay` | `position:fixed; inset:0; z-index:9800; background:#000; backdrop-filter:blur(6px)` |
| Heading | `.modifier-header` | `font: bold 22px Courier New; color: --neon-violet; letter-spacing:3px` |
| Card container | `#modifier-cards` | `display:flex; gap:14px; flex-wrap:wrap` |
| Card | `.modifier-card` | `flex: 0 0 140px; border-radius:12px; cursor:pointer; --cat-color` CSS var |
| Category gradient | `.modifier-card::before` | `linear-gradient` using `--cat-color` at 8% opacity |
| Icon | `.mod-icon` | `font-size: 36px` (emoji) |
| Name | `.mod-name` | `bold 14px Courier New; color: #fff` |
| Stack badge | `.mod-stack` | `color: --neon-cyan; font-size: 12px` — shows `x{current+1}` |
| Description | `.mod-desc` | `11px Courier New; color: rgba(255,255,255,0.7)` |
| Category label | `.mod-category` | `bold 9px Courier New; letter-spacing:2px; color: --cat-color` |

### ASCII Wireframe — 3 Cards (post-boss)

```
┌──────────────────────────────────────────────────┐
│                                                  │
│         CHOOSE YOUR PROTOCOL                     │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │   icon   │  │   icon   │  │   icon   │       │
│  │  Name x2 │  │  Name    │  │  Name    │       │
│  │  desc    │  │  desc    │  │  desc    │       │
│  │ OFFENSE  │  │ DEFENSE  │  │  WILD    │       │
│  └──────────┘  └──────────┘  └──────────┘       │
│                                                  │
└──────────────────────────────────────────────────┘
```

Category colors: OFFENSE `#ff6b35` (orange) / DEFENSE `#00f0ff` (cyan) /
WILD `#ff2d95` (magenta).

### ASCII Wireframe — 2 Cards (post-mini-boss)

```
┌──────────────────────────────────┐
│                                  │
│     CHOOSE YOUR PROTOCOL         │
│                                  │
│   ┌──────────┐  ┌──────────┐    │
│   │   icon   │  │   icon   │    │
│   │  Name    │  │  Name    │    │
│   │  desc    │  │  desc    │    │
│   │ DEFENSE  │  │  WILD    │    │
│   └──────────┘  └──────────┘    │
│                                  │
└──────────────────────────────────┘
```


## States & Variants

| State | Trigger | Visual |
|---|---|---|
| Hidden | Default | `display: none` |
| Entering | `show()` called | `mod-overlay-enter` class added; cards animate in via `@keyframes modCardEnter` (translateY 40px → 0, scale 0.9 → 1, staggered 0.1s per card) |
| Idle / Waiting | Cards fully rendered | Player hovering/touching cards; `:hover` scales card 1.06× |
| Card Selected | Click/tap on card | Selected card: `.modifier-card-selected` (scale 1.12×, green glow #39ff14). Rejected cards: `.modifier-card-rejected` (opacity → 0, scale → 0.8). 600ms hold before close. |
| Dismissed | 600ms post-selection | `display: none`; `mod-overlay-enter` removed; `onComplete()` fires |
| Pool Exhausted | `getRandomModifiers()` returns [] | `show()` calls `onComplete()` immediately; overlay never appears |

**Stack indicator variant**: when a stackable modifier the player already owns
appears in the offer, `.mod-stack` badge renders `x{stacks+1}` in neon cyan
next to the name.


## Interaction Map

```
Player action          → System response
─────────────────────────────────────────────────────────
Tap / click card       → selectCard() fires; modifier applied immediately
                          via ArcadeModifiers.applyModifier(); selection
                          animation plays 600ms; hide() + onComplete()
Hover card (desktop)   → scale 1.06×, border highlights with --cat-color
No card selected       → Modal stays open indefinitely (no timeout)
Attempt to tap canvas  → No effect — overlay is z-index 9800, full-viewport
```

**Keyboard support**: not implemented. No key listener exists in
`ModifierChoiceScreen.js`. This is an accessibility gap (see Open Questions).

**Gamepad support**: not implemented. Same gap.


## Events Fired

| Event | When | Source |
|---|---|---|
| `G.Audio.play('coinUI')` | On `show()` | ModifierChoiceScreen.js |
| `G.Audio.play('coinScore')` | On card selection | ModifierChoiceScreen.js |
| `G.ArcadeModifiers.applyModifier(modId)` | Immediately on selection | ModifierChoiceScreen.js |
| `G.ArcadeModifiers.recalculateBonuses()` | Inside applyModifier | ArcadeModifiers.js |
| `G.adjustLives(extraL)` | In onComplete if Extra Life was picked | GameplayCallbacks.js / MiniBossManager.js |
| `onComplete()` callback | 600ms after selection | ModifierChoiceScreen.js |


## Transitions & Animations

| Animation | Duration | Keyframe / Class |
|---|---|---|
| Cards enter | 0.35s ease-out per card, staggered +0.1s | `@keyframes modCardEnter`: `translateY(40px) scale(0.9)` → `translateY(0) scale(1)` |
| Card hover | 0.2s | CSS transition on `transform`, `border-color`, `box-shadow` |
| Card selected | 0.3s ease-out | `.modifier-card-selected`: scale 1.12×, green border + glow |
| Cards rejected | 0.3s ease-out | `.modifier-card-rejected`: opacity 0, scale 0.8, pointer-events none |
| Overlay dismiss | Immediate | `display: none` after 600ms `setTimeout` |

No overlay fade-in/fade-out animation exists on `#modifier-overlay` itself
(despite `mod-overlay-enter` class being added). The class has no corresponding
CSS rule — it is inert. Overlay appears/disappears instantly via `display`.


## Phase Adaptation — Backdrop & Accents

The Modifier Choice Screen appears during gameplay, so it inherits the current
visual phase at the moment the boss or mini-boss is defeated. The overlay adapts
its accent colors to the phase, making the choice screen feel continuous with the
world the player just fought in.

### Palette Mapping

| Element | Phase 1 — Horizon | Phase 2 — Twilight | Phase 3 — Void |
|---|---|---|---|
| Heading text ("CHOOSE YOUR PROTOCOL") | `--neon-accent` = `#4a90d9` | `--neon-accent` = `#8866aa` (default) | `--neon-accent` = `#00f0ff` |
| Card border default | `--terminal-border` = `rgba(74, 144, 217, 0.35)` | `--terminal-border` = `rgba(136, 102, 170, 0.40)` | `--terminal-border` = `rgba(0, 240, 255, 0.50)` |
| Card hover border highlight | `--neon-accent` at 60% opacity | `--neon-accent` at 60% opacity | `--neon-accent` at 70% opacity |
| Category gradient tint (card `::before`) | Uses `--neon-accent` at 8% opacity as fallback base | Uses `--neon-accent` at 8% opacity as fallback base | Uses `--neon-accent` at 8% opacity as fallback base |
| Selected card glow | `#39ff14` green (unchanged) | `#39ff14` green (unchanged) | `#39ff14` green (unchanged) |
| Overlay backdrop | `background: #000` (unchanged) | `background: #000` (unchanged) | `background: #000` (unchanged) |

### Category Colors — Unchanged

The three category colors (OFFENSE `#ff6b35`, DEFENSE `#00f0ff`, WILD `#ff2d95`)
carry **semantic meaning** and must remain invariant across all phases. These
colors tell the player the type of choice they are making — changing them per
phase would break the learned association.

The category gradient tint on the card background (`::before` pseudo-element)
uses the category's own `--cat-color`, not the phase `--neon-accent`. This is
an exception to the general phase-theming rule.

### Stack Badge — Phase-Tinted

The stack indicator badge (`.mod-stack`, showing `x{current+1}`) uses
`--neon-accent` instead of the fixed `--neon-cyan`:

- P1: `#4a90d9` blue
- P2: `#8866aa` violet
- P3: `#00f0ff` bright cyan

This is a subtle differentiator — the stack badge is a secondary information
element, not a primary semantic signal.

### Related Bug Note

The `--cat-color-rgb` bug documented in Open Questions (always falls back to
violet `187, 68, 255` due to being unset) affects the category gradient on all
phases equally. Fixing that bug (setting `--cat-color-rgb` per category) is
independent of this phase adaptation and is a prerequisite for the category
gradient to render correctly at all.

### Implementation

- The Modifier Choice Screen reads the current phase variables from CSS custom
  properties, which have already been updated by PhaseTransitionController during
  gameplay. No additional phase-detection logic is needed within the screen.
- Card selected/rejected animation colors (green glow, fade-out) are invariant —
  selection feedback should always read as "chosen" regardless of phase.


## Data Requirements

### Input

| Data | Source | Used for |
|---|---|---|
| `cardCount` | Caller (3 = boss, 2 = mini-boss; from `Balance.ARCADE.MODIFIERS`) | Governs how many cards to display and which CSS class to apply |
| `RunState.arcadeModifiers[]` | G.RunState | Passed to `getRandomModifiers()` to filter exhausted options and compute stack labels |
| `G._currentLang` | Global | Selects `mod.desc[lang]` and heading text |

### Output / Side-effects

| Data | Modified | How |
|---|---|---|
| `RunState.arcadeModifiers[]` | Appended | `applyModifier()` pushes chosen `mod.id` |
| `RunState.arcadeModifierPicks` | Incremented | Counter used on game-over screen |
| `RunState.arcadeBonuses{}` | Fully recalculated | `recalculateBonuses()` resets all fields and replays every modifier in order |
| Lives (`lives` local var in main.js) | Adjusted via `G.adjustLives()` | Applied in `onComplete` if Extra Life modifier was selected |

### Modifier Pool Reference

| ID | Name | Category | Stackable | Max Stacks | Effect |
|---|---|---|---|---|---|
| OVERCLOCK | Overclock | OFFENSE | Yes | 2 | Fire rate +20% (`fireRateMult *= 0.80`) |
| ARMOR_PIERCING | Armor Piercing | OFFENSE | Yes | 2 | All bullets +1 pierce |
| VOLATILE_ROUNDS | Volatile Rounds | OFFENSE | No | 1 | Kills trigger AoE 30px, 50% dmg |
| CRITICAL_HIT | Critical Hit | OFFENSE | Yes | 2 | +15% crit chance (cap 30%), 3× dmg |
| CHAIN_LIGHTNING | Chain Lightning | OFFENSE | No | 1 | Kill chains to 1 nearby enemy (30%) |
| NANO_SHIELD | Nano Shield | DEFENSE | No | 1 | Auto-shield every 22s |
| EXTRA_LIFE | Extra Life | DEFENSE | Yes | 99 | +1 life (applied in onComplete) |
| BULLET_TIME | Bullet Time | DEFENSE | Yes | 2 | Enemy bullet speed -20% |
| WIDER_GRAZE | Wider Graze | DEFENSE | No | 1 | Graze radius +40% |
| EMERGENCY_HEAL | Last Stand | DEFENSE | No | 1 | Survive 1 lethal hit per cycle |
| DOUBLE_SCORE | Double Score | WILD | No | 1 | Score 2× but enemies +25% HP |
| BULLET_HELL | Bullet Hell | WILD | No | 1 | Enemy fire +40%, drops +60% |
| SPEED_DEMON | Speed Demon | WILD | No | 1 | Player speed +25% |
| JACKPOT | Jackpot | WILD | No | 1 | Pity timers halved, graze gain -50% |
| BERSERKER | Berserker | WILD | No | 1 | Damage +50%, no shield drops |

### Category-Balanced Selection (3-card picks)

When `count >= 3` and both OFFENSE and DEFENSE categories have available
modifiers, `getRandomModifiers()` guarantees exactly 1 OFFENSE and 1 DEFENSE
in the offer. The 3rd slot is filled randomly from all remaining available
modifiers. Final order is shuffled so guaranteed slots are not always first.
For 2-card picks (mini-boss), selection is pure random shuffle.


## Accessibility

| Check | Status | Notes |
|---|---|---|
| Keyboard-only usable | FAIL | No key listener. Cards cannot be focused or selected via keyboard. |
| Gamepad usable | FAIL | No gamepad polling while overlay is active. |
| Text readable at min font size | PASS | Smallest text `.mod-category` is 9px — below recommended 12px minimum. |
| Functional without color alone | PARTIAL | Category is conveyed by both color and text label (`.mod-category`). Color alone is not the sole signal. However, the category gradient tint on the card background is color-only. |
| No flashing content without warning | PASS | Entry animation is a slide-up; no strobing. |
| Touch target size | PASS | Cards are 140px wide with full-height tap area. Meets 44px minimum. |
| Screen reader | FAIL | Cards are `div` elements with no `role`, `aria-label`, or `tabindex`. Content is not announced. |


## Localization Considerations

- Heading text: keyed as `ARCADE_CHOOSE` in `G.TEXTS[lang]`. EN: "CHOOSE YOUR
  PROTOCOL" / IT: "SCEGLI IL TUO PROTOCOLLO". Fallback hardcoded to EN string
  if key missing.
- Modifier descriptions: each modifier carries `desc: { EN: '...', IT: '...' }`.
  Rendered with `mod.desc[lang] || mod.desc.EN` fallback.
- Modifier names are not localized — they are English-only strings in code.
- Category labels (OFFENSE / DEFENSE / WILD) are rendered as raw constant
  strings, not localized.


## Acceptance Criteria

1. Modal opens within 1 second of the mini-boss death (800ms setTimeout) and
   within 1 second of the boss celebration sequence completing
   (BOSS_CELEBRATION_DELAY 7.5s is the celebration, not the modal delay — the
   nested `bossDeathTimeout` for the modal itself has no explicit delay
   argument visible in the read code; see Open Questions).
2. When 3 cards are shown, no two cards present the same modifier ID.
3. When 3 cards are shown and both OFFENSE and DEFENSE categories have
   available modifiers, exactly 1 OFFENSE and 1 DEFENSE are present.
4. Non-stackable modifiers already held in `RunState.arcadeModifiers` do not
   appear in the offer.
5. Stackable modifiers at their `maxStacks` limit do not appear in the offer.
6. Selecting any card applies the modifier to `RunState` before `onComplete`
   fires.
7. After selection and `onComplete`, gameplay resumes (next wave or cycle
   begins).
8. The total modifier count (`arcadeModifierPicks`) increments by 1 per pick
   and is visible on the game-over screen.
9. Accumulated modifiers affect gameplay (bonuses reflected in
   `RunState.arcadeBonuses`) for the remainder of the run.
10. If the available pool is empty, the modal is skipped silently and gameplay
    resumes.
11. Cards animate in (translateY + scale) on open. Selected card shows green
    glow. Rejected cards fade out. These animations complete before
    `onComplete` fires (600ms close delay).


## Open Questions

1. **Boss-path modal open delay**: The nested `bossDeathTimeout()` call that
   invokes `ModifierChoiceScreen.show()` in `GameplayCallbacks.js` has no
   explicit `delay` argument visible — the call reads
   `d.bossDeathTimeout(() => { G.ModifierChoiceScreen.show(...) })`. If
   `delay` defaults to 0, the modal appears immediately after the
   intermission message. Needs verification; acceptance criterion 1 may need
   to be tightened once confirmed.

2. **Keyboard / gamepad support**: Neither is implemented. Is this a conscious
   decision for mobile-first priority, or an oversight? Desktop players in
   browser mode cannot select a card without a pointer device.

3. **Screen reader support**: Cards are non-semantic `div` elements with no
   ARIA roles or labels. Should be addressed for accessibility compliance.
   Minimum fix: `role="button"`, `tabindex="0"`, `aria-label` combining name
   + description + category.

4. **`mod-overlay-enter` class**: The class is added via
   `overlay.classList.add('mod-overlay-enter')` in `show()` but no
   corresponding CSS rule exists in `style.css`. The overlay appear/disappear
   is instant (`display` toggle only). Intentional simplification or a dead
   remnant from a planned fade animation?

5. **Modifier visibility during run**: There is no in-run HUD element showing
   accumulated modifiers to the player. The only place to review active
   modifiers is the game-over screen (`arcadeModCount`). Should a compact
   modifier list be accessible during play (e.g., pause screen)?

6. **No-skip enforcement**: Is forcing a pick — with no escape or skip — the
   intended design for all future modifiers, or should "curse" modifiers
   (e.g., BULLET_HELL, DOUBLE_SCORE) eventually require opt-in confirmation?

7. **Category color `--cat-color-rgb`**: The `::before` gradient uses
   `rgba(var(--cat-color-rgb, 187, 68, 255), 0.08)` but `--cat-color-rgb`
   is never set. The fallback (187, 68, 255 = violet) is always used,
   meaning the category-tinted gradient is non-functional for OFFENSE
   (orange) and WILD (magenta). Bug or intentional?
