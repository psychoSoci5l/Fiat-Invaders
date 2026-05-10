# Interaction Pattern Library — FIAT vs CRYPTO

**Status**: Initial
**Last Updated**: 2026-04-25
**Engine**: Vanilla JavaScript (Canvas 2D + DOM overlay)

---

## Pattern 1: Terminal Panel

**Used in**: IntroScreen, ModifierChoiceScreen, GameOver screen, StoryScreen

**Description**: Semi-transparent dark panel with neon border, monospace text. Mimics a trading terminal / Bloomberg screen.

**Behavior**:
- Panel fades in over 150ms
- Content appears staggered (title → body → actions) at 100ms intervals
- Dismiss via Escape key or explicit button press
- No click-outside-to-dismiss (prevents accidental closure during gameplay)

**States**:
| State | Visual | Behavior |
|-------|--------|----------|
| Entering | `opacity: 0→1`, border glow pulse | Inputs queued, not processed |
| Active | Full opacity, steady border | All inputs processed |
| Exiting | `opacity: 1→0` | Inputs ignored, cleanup in progress |

**Accessibility**: Full keyboard navigation (Tab/Arrow for selection, Enter/Space to confirm, Escape to cancel/dismiss).

---

## Pattern 2: Card Choice (N-of-M Selection)

**Used in**: ModifierChoiceScreen (3-of-6 post-boss, 2-of-4 post-mini-boss), PerkManager

**Description**: Horizontal row of cards, each displaying an option. Player selects exactly one.

**Behavior**:
- Cards appear with staggered entrance (80ms offset each)
- Hover/focus lifts card 4px with glow border
- Selection confirmed on click/Enter — no second confirmation step
- Selection animates card to slot position, others fade out

**States**:
| State | Visual | Behavior |
|-------|--------|----------|
| Idle | Default position, dim glow | Navigable |
| Hovered | Lifted 4px, glow intensifies | Preview info shown |
| Selected | Scale 1.05 → slot position | Irreversible, triggers effect |

---

## Pattern 3: HUD Ticker

**Used in**: HUD (score, lives, level, DIP meter, HYPER status)

**Description**: Real-time data display styled as market ticker/ledger readout. All text is monospace uppercase.

**Behavior**:
- Score increments animate with counter ticking
- Lives flash magenta on loss, gold on gain
- DIP meter fills/sweeps as gauge with color shift (green → yellow → red)
- All values update immediately on EventBus emission — no polling

**States**: N/A — always active during PLAY state.

---

## Pattern 4: Floating Feedback

**Used in**: Damage numbers, score pops, combo count, "GODCHAIN" / "HYPER" activation

**Description**: Canvas-rendered text that floats upward and fades. Positioned relative to the event source.

**Behavior**:
- Spawns at entity position with upward velocity (-60px/s)
- Duration: 1.2s (fade begins at 0.8s)
- Color-coded: white (damage), gold (score), orange (GODCHAIN), magenta (HYPER)
- Text follows `domain:value` format (e.g., "+250", "GODCHAIN ACTIVE")

---

## Pattern 5: Modal Overlay (DOM)

**Used in**: Pause menu, Settings, Story dialogue, Game Over, Lesson cards

**Description**: Full-screen DOM overlay over the canvas. Canvas rendering continues (paused or frozen depending on state).

**Behavior**:
- Overlay fades in over 200ms
- Background dim: rgba(0,0,0,0.6)
- Canvas visible behind (frozen frame during PAUSE)
- Escape to close (except Game Over — explicit button only)
- Focus trapped inside modal while open

**Sub-pattern: Story Screen Crawl** — Progressive tap-to-skip:
1. First tap: accelerate scroll to 3x speed (`SCROLL_SPEED_FAST`)
2. Second tap (while scrolling): jump to end position immediately (`scrollY = scrollRestY`, `readyForInput = true`)
3. Third tap (at rest): dismiss with 0.8s fade-out

**Sub-pattern: Lesson Card** — First-encounter info modal (perk pickup, mechanic unlock). Purple-bordered card centered on dark backdrop. Flex column layout: icon (64px) → title → scrollable body text (left-aligned, flex 0 1 auto) → OK button (centered, align-self: center). Max height calc(100vh - 80px) with body scroll for long text on small screens.

**Sub-pattern: Intermission Skip** — Touch in INTERMISSION/STORY_SCREEN/GAMEOVER states emits 'start' event. For INTERMISSION, sets `waveMgr.intermissionTimer = 0` (immediate wave start). For STORY_SCREEN, routes to StoryScreen.handleTap() (progressive skip above).

---

## Pattern 6: Boss Warning

**Used in**: V8 campaign mode before boss encounters

**Description**: HUD countdown + screen border flash warning the player of imminent boss.

**Behavior**:
- 5-second countdown displayed in HUD
- Screen border pulses red at 1s intervals
- Warning sound plays (procedural)
- No gameplay interruption — player continues moving/shooting

---

## Pattern 7: Notification Strip

**Used in**: Achievement unlocks, wave announcements, story dialogue

**Description**: Horizontal strip sliding in from top of screen, auto-dismissing.

**Behavior**:
- Slides in from top over 300ms
- Stays visible for 2.5s (configurable)
- Slides out over 200ms
- Queued if another notification is active
- Click/tap to dismiss early

---

## Existing Patterns (No Formal Spec Yet)
- Screen shake (gameplay feedback)
- Hit-stop / freeze-frame (impact feel)
- Meme popup / status popup (dual-use DOM node `#meme-popup`) — v7.13: standardized with fixed-height card, emoji/text/detail slots
- Title animation (VIDEO → INTRO transition)
- Intermission skip hint (`#intermission-skip-hint`) — v7.13: "TAP TO SKIP" bottom-center, fade-in 300ms after intermission starts, hidden when timer < 0.5s
- StoryScreen progressive tap: 1st tap = 3x scroll speed, 2nd tap = jump to end (readyForInput), 3rd tap = dismiss with fade-out

---

## Pattern 8: Toast Notification (v7.13)

**Used in**: Perk pickup, HYPER first activation, combo milestones, power-up acquired

**Description**: Non-blocking feedback strip at top of screen. Max 2 visible, auto-dismiss 1.5s, slide-in from top. Does not interrupt gameplay. Suppressed when critical popup (meme-popup) is active.

**Behavior**:
- Slide in from top (translateY -20px → 0) over 150ms
- Hold for 1.5s (configurable per type)
- Slide out (opacity 0) over 200ms
- Max 2 visible — 3rd toast immediately dismisses oldest
- Color-coded border by type: perk (violet), hyper (gold), godchain (orange), shield (cyan), combo (gold)

**States**:
| State | Visual | Behavior |
|-------|--------|----------|
| Entering | Slide from top, 150ms | Queued if 2 already visible |
| Active | Full opacity, type-colored border | Auto-dismiss timer starts |
| Exiting | Fade out, 200ms | Removed from DOM after animation |

**Accessibility**: pointer-events: none — toast is informational only, no interaction target.

---

## Pattern 9: Overlay Button Anchor (v7.13)

**Used in**: Tutorial NEXT/GO, Tutorial SKIP, Title SKIP

**Description**: Action buttons in overlay screens are anchored to fixed positions within their overlay container, not positioned by document flow. Anchored buttons never move regardless of content height changes.

**Behavior**:
- SKIP button: `position: absolute; top: calc(14px + safe-area); right: 14px` — always visible, never occluded
- NEXT/GO button: Container uses `position: sticky; bottom: 0` — always at bottom of card, content scrolls above
- Title SKIP: `position: absolute; top: max(14px, env(safe-area-inset-top)); right: 16px` — consistent top-right position, no content reflow

---

## Pattern Usage Matrix

| Screen / Context | Patterns Used |
|-----------------|---------------|
| Intro / Title | Terminal Panel, Notification Strip |
| Ship Selection | Card Choice, Terminal Panel |
| HUD (PLAY) | HUD Ticker, Floating Feedback |
| Boss Encounter | Boss Warning, Notification Strip |
| Modifier Choice | Card Choice, Terminal Panel |
| Game Over | Terminal Panel, Floating Feedback |
| Pause / Settings | Modal Overlay |
| Story Dialogue | Modal Overlay |
| Achievement | Notification Strip |
