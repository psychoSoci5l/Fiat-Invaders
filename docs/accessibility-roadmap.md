# Accessibility Roadmap — WCAG 2.1 AA

**Tier target**: AA (da Basic)
**Estimate**: 14h total
**Actual**: ~6h
**Completed**: 2026-05-22

## Fasi

### ✅ Phase 1 — Foundation (`src/utils/AccessibilityUtils.js`)
- [x] Create shared utility: `prefersReducedMotion()`, `trapFocus()`, `restoreFocus()`, `openModal()`, `closeModal()`, `announce()`, `isModalOpen()`, `closeTopModal()`
- [x] Refactor `IntroScreen.js` and `TitleAnimator.js` to use shared utility

### ✅ Phase 2 — ARIA + Focus Trap (15 modali + canvas)
- [x] `role="dialog"`, `aria-modal="true"`, `aria-labelledby="ID"` su tutti gli overlay in `index.html`
- [x] `role="img"` + `aria-label` su `#gameCanvas`
- [x] `UIManager.js`: toggleModal, toggleSettings, toggleManual, togglePause con openModal/closeModal
- [x] `IntroScreen.js`: toggleProfile, toggleWhatsNew con openModal/closeModal + bulk cleanup `_hideAndClose()`
- [x] `main.js`: toggleFeedback, v8 intermission (show/advance) con openModal/closeModal
- [x] `GameCompletion.js`, `ModifierChoiceScreen.js`, `LessonModal.js`, `LeaderboardClient.js`, `DebugOverlay.js`: focus trap integrato
- [x] `InputSystem.js`: Escape modale-aware (closeTopModal prima di togglePause)

### ✅ Phase 3 — Keyboard Navigation
- [x] Pause screen: auto-focus primo elemento tramite openModal
- [x] Game Over: auto-focus retry tramite openModal
- [x] Intro screen: focus `#btn-primary-action` su transizione SPLASH→SELECTION
- [x] Tutorial: openModal su show, closeModal su completeTutorial

### ✅ Phase 4 — Screen Reader Announcements
- [x] `#a11y-announcer` con `aria-live="polite" aria-atomic="true"` in `index.html`
- [x] Canale `a11y:announce` registrato su EventBus in `main.js`
- [x] showPowerUp, showGameInfo, showDanger, showVictory, game-over emettono annunci

### ✅ Phase 5 — CSS Enhancements
- [x] `color-scheme: dark` su `:root`
- [x] `@media (forced-colors: active)` — ButtonText/Highlight, overlay nascosti
- [x] `@media (prefers-contrast: more)` — bordi spessi, ombre rinforzate
- [x] `:focus:not(:focus-visible)` pattern per btn/.skip-btn/curtain/scanlines
- [x] `:focus-visible` su slider, input, nickname-input, feedback, pause-btn, joystick
- [x] `.skip-link` styling + `:focus` visibile

### ✅ Phase 6 — Semantic HTML
- [x] Skip-to-content link (`#skip-link → #game-container`)
- [x] `role="main"` su `#game-container`
- [x] `aria-label="Main navigation"` su `.intro-icons`
- [x] `aria-hidden="true"` su scanlines, vignette, curtain-overlay, splash-layer, intro-video, touchControls, sa-sentinel

### ✅ Phase 7 — Tests
- [x] `npm install @axe-core/playwright`
- [x] `tests/accessibility-test-playwright.js`: 9 categorie, copre ARIA modali, announcer, skip-link, canvas, landmark, color-scheme, input integrazione, keyboard nav

### ✅ Phase 8 — Documentation + Manifest
- [x] `manifest.json`: aggiunti 3 shortcut (Arcade, Story, Leaderboard)
- [x] `design/accessibility-requirements.md`: aggiornato da Basic → AA, documentate tutte le implementazioni

## Riepilogo Check

| Area | Verdetto |
|------|----------|
| Screen reader (modali + annunci) | ✅ Coperto |
| Tastiera (focus + tab + escape) | ✅ Coperto |
| Prefers-reduced-motion | ✅ Già implementato pre-audit |
| Forced-colors / High Contrast | ✅ Aggiunto |
| Prefers-contrast | ✅ Aggiunto |
| Focus visibile (focus-visible) | ✅ Aggiunto |
| Skip-link | ✅ Aggiunto |
| Landmark HTML | ✅ Aggiunto |
| PWA shortcuts | ✅ Aggiunto |
| Test automatici | ✅ Aggiunto |
