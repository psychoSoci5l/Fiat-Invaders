# Accessibility Requirements

**Tier**: Basic
**Last Updated**: 2026-04-25
**Engine**: Vanilla JavaScript (Canvas 2D, Web API)

---

## Commitments

### Input

- Full keyboard navigation for all menus and UI modals (IntroScreen, ModifierChoiceScreen, PerkManager, StoryScreen)
- Gamepad support via InputSystem (axis and button mappings)
- No input sequences requiring simultaneous multi-key press for critical actions
- Pause accessible via Escape key and Start/Select button

### Visual

- Minimum 4.5:1 contrast ratio for all HUD text against gameplay background
- HUD text rendered with black stroke/outline for readability over varying backgrounds
- Screen shake is visual-only (no gameplay effect) and kept within 8px amplitude
- Flash effects (impact flash, HYPER overlay) are short-duration (< 0.5s sustained)
- No information conveyed solely through color — all color-coded elements (enemy tier, bullet patterns, elemental effects) have accompanying shape, size, or positional cues

### Audio

- SFX and music have separate volume controls, persisted to localStorage
- No audio cues required for critical gameplay actions (all audio is supplementary)
- Procedural music avoids sustained low-frequency content that could cause listener fatigue

### Motion

- No auto-scrolling background in menus
- V8 campaign scroll speed is the only forced scrolling; player can pause at any time
- Warning indicator before boss encounters (HUD countdown)

### Session

- Game can be paused at any time during gameplay
- No session timers or time-limited modes that prevent pausing
- Arcade mode runs are finite (15 waves) — no endless mandatory sessions

---

## Exclusions (Basic tier)

The following are explicitly out of scope for Basic tier:

- Screen reader / TTS support (Canvas 2D has no DOM for gameplay)
- Custom colorblind palettes (color + shape encoding covers differentiation)
- Remappable controls (fixed keybindings documented in-game)
- Text size scaling (HUD uses fixed font sizes relative to canvas)
- Subtitle tracks for dialogue (dialogue is text-only, displayed on screen)

---

## Future Considerations

- Add `prefers-reduced-motion` media query support to disable screen shake and parallax
- Evaluate custom keybinding storage for motor accessibility
- Consider UI scaling option for smaller viewports
