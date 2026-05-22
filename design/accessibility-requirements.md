# Accessibility Requirements

**Tier**: AA (WCAG 2.1)
**Last Updated**: 2026-05-22
**Engine**: Vanilla JavaScript (Canvas 2D, Web API)

---

## Commitments

### Input

- Full keyboard navigation for all menus and UI modals (IntroScreen, ModifierChoiceScreen, PerkManager, StoryScreen)
- Gamepad support via InputSystem (axis and button mappings)
- No input sequences requiring simultaneous multi-key press for critical actions
- Pause accessible via Escape key and Start/Select button
- Escape key is modale-aware: closes top modal before unpausing (avoids focus confusion)
- Focus trap within all open modals (Tab cycles within modal, Escape closes safely)

### Screen Reader (DOM Layer)

- All modals use `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing to their title
- Live region (`#a11y-announcer`) with `aria-live="polite" aria-atomic="true"` for dynamic state announcements
- In-game events (power-ups, danger, victory, wave info) emit `a11y:announce` via EventBus
- `<canvas>` has `role="img"` and `aria-label` describing the game
- Decorative elements (`scanlines`, `vignette`, `curtain-overlay`, etc.) marked `aria-hidden="true"`
- Skip-link (`#skip-link → #game-container`) for keyboard users to bypass repeated navigation
- Landmark roles: `<main>` on game container, `<nav>` on intro navigation

### Visual

- Minimum 4.5:1 contrast ratio for all HUD text against gameplay background
- HUD text rendered with black stroke/outline for readability over varying backgrounds
- Screen shake is visual-only (no gameplay effect) and kept within 8px amplitude
- Flash effects (impact flash, HYPER overlay) are short-duration (< 0.5s sustained)
- No information conveyed solely through color — all color-coded elements (enemy tier, bullet patterns, elemental effects) have accompanying shape, size, or positional cues
- `forced-colors: active` mode supported: removes decorative overlays, ensures button borders, replaces gradient text with solid ButtonText
- `prefers-contrast: more` mode supported: thicker borders, enhanced text shadows

### Motion

- `prefers-reduced-motion` supported: disables canvas animations (title pulse, drift, particles, parallax), CSS animations (curtain sweep, screen shake, glow pulses), and screen shake via `G.Accessibility.prefersReducedMotion()`
- No auto-scrolling background in menus
- V8 campaign scroll speed is the only forced scrolling; player can pause at any time
- Warning indicator before boss encounters (HUD countdown)

### CSS / Platform

- `color-scheme: dark` on `:root` for native dark form controls
- All interactive elements have `:focus-visible` outlines (2px solid white, 3px offset)
- `outline: none` only applies via `:focus:not(:focus-visible)` pattern — never removes focus for keyboard users
- `.skip-link` uses clipped-offscreen pattern (visible on `:focus`)
- PWA manifest includes `shortcuts` for common game actions

### Session

- Game can be paused at any time during gameplay
- No session timers or time-limited modes that prevent pausing
- Arcade mode runs are finite (15 waves) — no endless mandatory sessions

---

## Implementation Notes

- Shared utility in `src/utils/AccessibilityUtils.js` (IIFE pattern, `G.Accessibility.*`)
- All modal open/close goes through `G.Accessibility.openModal()` / `closeModal()` for consistent focus trap + ARIA
- `G.Accessibility.announce(text)` sends text to the `#a11y-announcer` live region
- `G.Accessibility.isModalOpen()` returns whether any modal is currently open
- `G.Accessibility.closeTopModal()` closes the most recently opened modal without touching parent
- EventBus channel `a11y:announce(text)` routes game events to the announcer

## Exclusions (AA tier)

The following remain out of scope:

- Custom colorblind palettes (color + shape encoding covers differentiation)
- Remappable controls (fixed keybindings documented in-game)
- Text size scaling (HUD uses fixed font sizes relative to canvas)
- Subtitle tracks for dialogue (dialogue is text-only, displayed on screen)

---

## Future Considerations

- Evaluate custom keybinding storage for motor accessibility
- Consider UI scaling option for smaller viewports
- Investigate Canvas accessibility API (`canvas.setAccessibilityFocus`) for future-readiness
