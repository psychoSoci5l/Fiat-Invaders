# UX Review — Intro Flow

**Date**: 2026-04-25
**Reviewer**: ux-designer (automated gate check)
**Spec**: `design/ux/intro.md`
**Status**: Reverse-documented from v7.12.3

---

## Verdict: APPROVED WITH CONDITIONS

### Strengths
- Complete state machine documented (VIDEO → SPLASH → SELECTION)
- Detailed layout zones with ASCII diagrams
- Comprehensive interaction map covering all inputs
- State visibility tracked per element
- All acceptance criteria enumerated and testable

### Issues Found

1. **Icon buttons missing aria-labels (MEDIUM)** — Only `#intro-profile` has `aria-label`. Settings, Leaderboard, What's New are SVG-only with no accessible name (WCAG 4.1.2).

2. **Ship carousel no gamepad binding (MEDIUM)** — ArrowLeft/Right works on keyboard but gamepad d-pad is not bound.

3. **`prefers-reduced-motion` partial compliance (MEDIUM)** — TitleAnimator respects it, but ship canvas hover-bob and flame flicker are unconditional rAF loops.

4. **Ship selection not persisted (LOW)** — `selectedShipIndex` resets to 0 on each cold launch. Player loses ship preference between sessions.

5. **Daily mode i18n gap (LOW)** — `MODE_DAILY` i18n key has no matching locale entry.

### Recommendation
Address aria-labels and gamepad navigation before Production milestone 1. Ship persistence and reduced-motion compliance can be tracked as technical debt.
