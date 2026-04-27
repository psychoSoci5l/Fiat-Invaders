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

**Used in**: Pause menu, Settings, Story dialogue, Game Over

**Description**: Full-screen DOM overlay over the canvas. Canvas rendering continues (paused or frozen depending on state).

**Behavior**:
- Overlay fades in over 200ms
- Background dim: rgba(0,0,0,0.6)
- Canvas visible behind (frozen frame during PAUSE)
- Escape to close (except Game Over — explicit button only)
- Focus trapped inside modal while open

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
- Meme popup / status popup (dual-use DOM node `#meme-popup`)
- Title animation (VIDEO → INTRO transition)

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
