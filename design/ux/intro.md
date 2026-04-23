# UX Spec — Intro Flow

| Field            | Value                                              |
|------------------|----------------------------------------------------|
| Status           | Reverse-documented from v7.12.3                    |
| Author           | reverse-document + ux-designer                     |
| Last Updated     | 2026-04-23                                         |
| Template         | UX Spec                                            |
| Platform Target  | Mobile PWA + Desktop browser                       |
| Scope            | Intro flow: VIDEO state → SPLASH state → SELECTION state |

---

## Purpose & Player Need

The intro flow answers three player questions before the first bullet fires:

1. **What is this game?** — Title, tone, thematic premise (crypto vs central banks).
2. **What mode do I want?** — Story (narrative campaign), Arcade (roguelike), Daily (seeded run).
3. **Which ship?** — One of three hulls with distinct stat profiles.

Secondary purpose: surface persistent social hooks (leaderboard, What's New, nickname) without blocking the path to play.

---

## Player Context on Arrival

- **Cold launch (PWA / browser):** Player has no game context. Expects a loading moment, then orientation.
- **Return visit (same session):** Returning via backToIntro() after a run. TitleAnimator restarts in skip mode (no replay). Previous mode and ship selection are preserved.
- **Return visit (new session):** localStorage restores last mode (campaign/arcade), ship index resets to 0 (BTC).

---

## Navigation Position

```
VIDEO → INTRO[SPLASH] → INTRO[SELECTION] → (HANGAR) → WARMUP / PLAY
                ↑              |
         goBackToModeSelect()  └─ nickname overlay (gate, first session only)
```

HANGAR (`#hangar-screen`) is a legacy dead-end: it exists in HTML but `launchShipAndStart()` bypasses it entirely and goes directly to game. It is not part of the live flow.

---

## Entry & Exit Points

| Trigger | Entry State | Source |
|---|---|---|
| splashscreen.mp4 ends or 4s timeout | VIDEO → SPLASH | `vid.onended` / `setTimeout(startApp, 4000)` |
| Tap/click anywhere on `#splash-layer` | VIDEO → SPLASH | `splash.addEventListener('touchstart', startApp)` |
| ESC / gamepad Start during VIDEO | VIDEO → SPLASH | `inputSys.on('escape')` |
| TAP TO START button (`#btn-primary-action`) | SPLASH → SELECTION | `handlePrimaryAction()` |
| Mode indicator tapped (`#current-mode-indicator`) | SELECTION → SPLASH | `goBackToModeSelect()` |
| LAUNCH button | SELECTION → (nickname gate?) → game | `launchShipAndStart()` |
| `backToIntro()` from pause / gameover | any → SPLASH | `G.IntroScreen.resetToSplash()` |

---

## Layout Specification

### Information Hierarchy

**SPLASH priority order (top → bottom):**
1. Animated title ("Currencies / FIAT vs CRYPTO")
2. Mode pills (STORY / ARCADE / DAILY)
3. Mode description line
4. TAP TO START CTA
5. Bottom icon row (Settings, Leaderboard, What's New, Profile)
6. Version tag (bottom, doubles as debug trigger)
7. PWA install banner (deferred 3s, conditional)

**SELECTION priority order:**
1. Current-mode indicator / back affordance
2. Ship name + stats bar
3. Ship canvas (animated, 160×180px)
4. Left/right carousel arrows
5. High score row (mode-specific)
6. Arcade records row (bestCycle / bestLevel / bestKills — Arcade mode only)
7. LAUNCH CTA

### Layout Zones

```
┌─────────────────────────────────┐  ← safe-area top (--di-safe-top)
│         [SPLASH ZONE]           │
│   "Currencies" subtitle         │
│   FIAT  vs  CRYPTO              │  ← TitleAnimator canvas overlay
│                                 │
│   ● STORY  ○ ARCADE  ○ DAILY    │  ← mode-selector
│   "Follow Bitcoin's rise…"      │  ← mode-explanation
│                                 │
│   ┌─────────────────────────┐   │
│   │      TAP TO START       │   │  ← .primary-action-container
│   └─────────────────────────┘   │
│   ⚙  🏆  ●  👤               │  ← .intro-icons (4 buttons)
│   v7.12.3                       │  ← #version-tag
│   [PWA install banner]          │  ← conditional, hidden in PWA mode
└─────────────────────────────────┘  ← safe-area bottom
```

```
┌─────────────────────────────────┐
│  STORY MODE  ▾ change mode      │  ← #current-mode-indicator (tappable)
│     BTC STRIKER                 │  ← #selection-header / #ship-name
│   SPD ██████░░                  │
│   PWR ███████░                  │  ← #ship-stats (8-bar block chars)
│   HIT █████░░░                  │
│                                 │
│  ‹        [SHIP CANVAS]      ›  │  ← arrows + #intro-ship-canvas (160×180)
│                                 │
│  RECORD          12,400         │  ← #selection-score-row
│                                 │
│   ┌─────────────────────────┐   │
│   │         LAUNCH          │   │  ← btn-primary-action.launch-state
│   └─────────────────────────┘   │
└─────────────────────────────────┘
```

### Component Inventory

| ID / Selector | Type | State Visibility |
|---|---|---|
| `#splash-layer` | div > video | VIDEO only; removed from DOM on transition |
| `#intro-screen` | div, `display:flex` | INTRO (SPLASH + SELECTION) |
| `#intro-title` | h1 `.game-title` | SPLASH (`.hidden` in SELECTION) |
| `#title-subtitle` | span | Animated in via `.anim-visible` at t=0.24s |
| `#mode-selector` `.mode-pills` | 3× `.mode-pill` buttons | SPLASH only |
| `#mode-pill-daily` | button | Present but undocumented in CLAUDE.md — third mode |
| `#mode-explanation` | div with 3× `.mode-desc` | SPLASH only, one visible per active mode |
| `#current-mode-indicator` | div, tappable | SELECTION only |
| `#selection-header` | div | SELECTION only |
| `#selection-info` | div | SELECTION only |
| `#ship-name` | div | SELECTION only |
| `#ship-stats` | div | SELECTION only (8-bar block chars, scaled 0-8) |
| `.ship-area` | div | SELECTION only (`.hidden` → remove) |
| `#intro-ship-canvas` | canvas 160×180 | Both states; SPLASH always renders BTC |
| `#arrow-left` / `#arrow-right` | button `.ship-arrow` | SELECTION only (`.visible` class) |
| `#arcade-records-row` | div | SELECTION + Arcade mode only |
| `#selection-score-row` | div | SELECTION only |
| `#btn-primary-action` | button `.btn-cta` | Both states; label/class changes |
| `#pwa-install-banner` | div | SPLASH only, conditional, hidden in PWA/dismissed |
| `.intro-icons` | div, 4× `.btn-icon` | SPLASH only (hidden in SELECTION) |
| `#version-tag` | div | SPLASH only (triple-tap → debug overlay) |
| `#whatsnew-panel` | div (outside game-container) | Overlay, on demand |
| `#nickname-overlay` | div (outside game-container) | Overlay, first-session gate |

---

## States & Variants

### VIDEO

- Canvas renders solid black (`ctx.fillRect`).
- `#splash-layer` visible, fullscreen, `z-index: 9999`.
- `#intro-video` autoplays muted. On `ended` or after 4000ms timeout → `startApp()`.
- Tap/click/ESC/Start also skips to `startApp()`.
- No accessibility affordance for video content (muted, decorative).

### SPLASH (idle)

- `#intro-screen` visible. TitleAnimator runs ANIMATING → LOOPING sequence (2.4s).
- During ANIMATING: title elements enter staggered via CSS classes (`anim-hidden` / `anim-visible`). Subtitle at 0.24s, FIAT at 0.6s, vs at 0.96s, CRYPTO at 1.32s. Mode selector + CTA + icons hidden until CONTROLS_IN at 2.4s.
- `prefers-reduced-motion`: TitleAnimator jumps to LOOPING immediately, all elements shown at once.
- `TITLE_ANIM.ENABLED: false`: same as reduced-motion path.
- Tap during ANIMATING: `TitleAnimator.skip()` → LOOPING (400ms cooldown on `_introActionCooldown`).
- What's New button gets `.btn-glow-notify` pulse if `fiat_whatsnew_seen` in localStorage does not match `G.VERSION`.
- Ship canvas renders BTC Striker regardless of any previous selection.
- PWA install banner shown 3s after startApp(), dismissed after 15s auto or user × tap. Hidden if already standalone or `fiat_pwa_dismissed` set.

### SPLASH (returning from game)

- `G.IntroScreen.resetToSplash()` called by `backToIntro()`.
- TitleAnimator restarted with `start(true)` (skip mode — no replay animation).
- Previously selected mode pill restored from `G.CampaignState.isEnabled()`.

### SELECTION (idle)

- TitleAnimator hidden.
- Splash elements hidden; selection elements shown.
- Ship canvas renders the selected ship (index 0 = BTC on first visit, persists within session).
- Arrow buttons visible; swipe left/right not implemented (arrows only on mobile).
- Keyboard: ArrowLeft/A = previous, ArrowRight/D = next.
- Arcade records row shown only if mode is arcade AND at least one record is non-zero.

### SELECTION (ship confirmed — launch gate)

- User taps LAUNCH → `launchShipAndStart()`.
- **Daily mode lock check:** if `DailyMode.isLockedToday()`, show meme popup and abort.
- **Nickname gate:** if no nickname and `_nickPromptShown` is false → `#nickname-overlay` shown, game does not start. After confirm/skip → `launchShipAndStart()` retried.
- **Audio unlock:** AudioContext resumed synchronously with the user gesture.
- Launch animation: ship canvas detached from DOM, placed in fixed `#launch-ship-container`, flies upward off-screen (CSS transition), then curtain closes, game starts.

### Nickname overlay (on top of SELECTION)

- `#nickname-overlay` outside `#game-container`, `z-index` above curtain.
- Input: maxlength 6, autocapitalize, no spellcheck.
- CONFIRM → validate → callback. SKIP → callback with no nickname set.
- On new-record game over (separate call): `hideSkip: true` option hides SKIP button.
- One prompt per session (`window._nickPromptShown` flag).

### What's New overlay (on top of SPLASH or SELECTION)

- `#whatsnew-panel` outside `#game-container`.
- Opened via `toggleWhatsNew()` (icon button or auto-open).
- Content generated at open time from `WHATS_NEW[]` array in IntroScreen.js (bilingual EN/IT).
- Sorted newest-first. On close: `fiat_whatsnew_seen` written to localStorage, glow removed.
- Auto-open on first visit with new version: `seenVer !== G.VERSION` check at `startApp()` — currently checks but does NOT auto-open (only adds glow). **Gap: no auto-open of the panel itself — see Open Questions.**

---

## Interaction Map

| Action | Input | Result |
|---|---|---|
| Skip splash video | Tap anywhere on `#splash-layer` | `startApp()` |
| Skip title animation | Tap `#btn-primary-action` during ANIMATING | `TitleAnimator.skip()`, 400ms cooldown |
| Enter SELECTION | Tap `#btn-primary-action` (SPLASH, post-animation) | `enterSelectionState()` |
| Switch mode | Tap mode pill | `setGameMode()`, pill highlight, desc swap, SFX coinUI |
| Return to SPLASH | Tap `#current-mode-indicator` | `goBackToModeSelect()`, SFX coinUI |
| Cycle ship (next) | Tap `#arrow-right` or ArrowRight/D | `cycleShip(1)` |
| Cycle ship (prev) | Tap `#arrow-left` or ArrowLeft/A | `cycleShip(-1)` |
| Launch | Tap `#btn-primary-action` (SELECTION) | `launchShipAndStart()` → daily check → nickname gate → launch |
| Open Settings | Tap settings icon | `toggleSettings()` |
| Open Leaderboard | Tap trophy icon | `Game.Leaderboard.toggle()` |
| Open What's New | Tap info icon | `toggleWhatsNew()` |
| Open Profile | Tap profile icon | `toggleProfile()` |
| Debug overlay (intro) | Triple-tap `#version-tag` in <800ms | `_showDebugOverlay('INTRO')` — shows previous session log |
| Install PWA (Android) | Tap `#pwa-banner-action` | Trigger deferred `BeforeInstallPromptEvent` |
| Dismiss PWA banner | Tap × or 15s timeout | `dismissPWABanner()`, sets `fiat_pwa_dismissed` |

---

## Events Fired

| Event | When | System |
|---|---|---|
| `G.Audio.play('coinUI')` | Mode pill tap, enterSelection, goBackToModeSelect | AudioSystem |
| `G.Audio.init()` + `G.Audio.unlockWebAudio()` | LAUNCH tap (user gesture sync) | AudioSystem |
| `G.Audio.startMusic()` | After launch anim begins | AudioSystem |
| `G.GameState.transition('INTRO')` | startApp() | GameStateMachine |
| `G.SkyRenderer.init()` | startApp() + launchShipAndStart() | SkyRenderer |
| `G.WeatherController.setIntroMode()` | startApp() | WeatherController |
| `curtain-overlay.classList.add('open')` | 100ms after intro-screen shown | CSS curtain |
| `localStorage.setItem('fiat_whatsnew_seen', VERSION)` | toggleWhatsNew() open | IntroScreen |
| `localStorage.setItem('fiat_pwa_dismissed', '1')` | PWA banner dismiss | main.js |

---

## Transitions & Animations

| Transition | Mechanism | Duration |
|---|---|---|
| VIDEO → SPLASH | `#splash-layer` opacity 0 → CSS fade, then `remove()` | 1000ms |
| Curtain open | `#curtain-overlay.open` CSS class (left/right panels slide) | ~100ms delay + CSS |
| Title animation (Currencies) | `.anim-visible` CSS class on `#title-subtitle` | at t=0.24s |
| Title animation (FIAT / vs / CRYPTO) | Staggered CSS animations via TitleAnimator timeline | t=0.6/0.96/1.32s |
| Controls reveal | `.anim-hidden` → `.anim-show` on mode-selector, CTA, icons | at t=2.4s |
| SPLASH → SELECTION | Synchronous DOM class/style swap, `TitleAnimator.hide()`, `coinUI` SFX | Immediate |
| SELECTION → SPLASH | Synchronous DOM class/style swap, TitleAnimator restart (skip mode) | Immediate |
| Ship carousel | `updateShipUI()` redraws canvas on next rAF tick, no slide transition | <1 frame |
| LAUNCH ship animation | Canvas detached → fixed container → CSS `translateY` off-screen | ~600ms (estimated, CSS-driven) |
| Curtain close (launch) | `#curtain-overlay` closes before game starts | CSS |

---

## Data Requirements

| Data | Source | Persistence |
|---|---|---|
| Last mode (campaign/arcade) | `G.CampaignState.isEnabled()` | localStorage via CampaignState |
| High score (per mode) | `d.loadHighScoreForMode()` | localStorage |
| Arcade records (cycle/level/kills) | `d.loadArcadeRecords()` | localStorage |
| What's New seen version | `fiat_whatsnew_seen` | localStorage |
| Nickname | `G.hasNickname()` | localStorage |
| Nickname prompt shown (this session) | `window._nickPromptShown` | in-memory, session only |
| PWA dismissed | `fiat_pwa_dismissed` | localStorage |
| Daily mode locked | `G.DailyMode.isLockedToday()` | localStorage (date-keyed) |
| Current language | `G._currentLang` | localStorage, affects all `d.t()` calls |
| Ship selection index | `selectedShipIndex` | in-memory, session only (resets to 0 on cold launch) |
| Version string | `G.VERSION` / `Constants.VERSION` | Constants.js |

---

## Accessibility

- [x] Keyboard navigable: ESC/Enter skip video, Arrow keys cycle ship in SELECTION, Enter triggers focused button.
- [ ] Gamepad: `inputSys.on('start')` skips video and triggers primary action. Ship carousel not bound to gamepad d-pad — **gap**.
- [x] Text readable: All intro text is DOM-rendered, no canvas text for readable content. Font size minimum not audited against spec.
- [x] Color not sole indicator: Mode pill active state uses both background fill AND text contrast change, not color alone.
- [x] No flashing: TitleAnimator particle burst is brief and non-repetitive. Not classified as hazardous flashing.
- [ ] `prefers-reduced-motion` respected for TitleAnimator only. Ship canvas hover-bob and flame flicker are unconditional rAF loops — **gap**.
- [ ] Subtitles: `#intro-video` (splashscreen.mp4) is muted and decorative; no captions needed. Confirmed muted in HTML attribute.
- [x] UI scales at all resolutions: CSS flex layout, safe-area CSS vars applied. Desktop gets max-height 1300px centered frame.
- [ ] Screen reader: `#intro-screen` has no `aria-label`. Icon buttons have no `aria-label` except `#intro-profile` (has `aria-label="Profile"`). Settings, Leaderboard, What's New icons are SVG-only — **gap**.

---

## Localization Considerations

- All player-visible strings use `d.t('KEY')` (EN/IT lookup via `G.TEXTS[currentLang]`).
- `G._currentLang` restored from localStorage on init; toggled via Settings.
- What's New content is bilingual per-entry: `{ EN: [], IT: [] }` arrays in `WHATS_NEW[]`.
- Mode descriptions in HTML have `data-i18n` attributes (`MODE_STORY_DESC`, `MODE_ARCADE_DESC`, `MODE_DAILY_DESC`).
- `#mode-pill-daily` has `data-i18n="MODE_DAILY"` but no matching key found in any locale file — **gap** (no `src/locales/` directory exists; strings are inline in JS objects).
- Language toggle in Settings affects intro immediately via `updateUIText()` call in `setGameMode()`.
- Ship names (BTC STRIKER, ETH HEAVY, SOL SPEEDSTER) are not localized — hardcoded strings in `SHIP_DISPLAY`.

---

## Acceptance Criteria

1. On cold launch, video plays; tapping anywhere skips to SPLASH within one frame.
2. TitleAnimator completes sequence in ≤2.4s; skips immediately on tap during ANIMATING with no visible flicker.
3. `prefers-reduced-motion` causes all title elements to appear simultaneously at SPLASH render.
4. Mode pill tap updates active pill, description text, and mode-indicator text correctly for all three modes.
5. Entering SELECTION hides all SPLASH-only elements and shows all SELECTION-only elements with no leftover visibility leaks.
6. Ship carousel cycles through BTC → ETH → SOL → BTC with stat bars updating correctly each step.
7. In Arcade mode SELECTION, records row appears only if at least one of bestCycle / bestLevel / bestKills is > 0.
8. Nickname overlay blocks launch on first session; after confirm/skip, launch completes.
9. Daily mode: second attempt on same UTC day shows error meme and does not start game.
10. What's New glow badge appears on icon when version changed; clears on first panel open.
11. Triple-tap on `#version-tag` (3 taps within 800ms) opens debug overlay showing previous session log.
12. PWA banner appears 3s after startApp() on non-standalone iOS (shows instructions) and Android with deferred prompt (shows install button). Auto-dismisses at 15s.
13. `backToIntro()` restores SPLASH with TitleAnimator in skip mode; previously selected mode is preserved.
14. LAUNCH animation completes and game state transitions correctly without leaving orphan DOM nodes.
15. All four icon buttons in `.intro-icons` are reachable and activatable via keyboard Tab + Enter.

---

## Open Questions

1. **Daily mode pill completeness:** `MODE_DAILY` i18n key has no corresponding entry in any locale store (no `src/locales/` found — strings appear to be inline JS objects in `G.TEXTS`). Is Daily mode considered complete or is it a stub? The lock-on-second-attempt logic exists in `launchShipAndStart()`.

2. **What's New auto-open:** The glow badge fires when `seenVer !== G.VERSION`, but the panel is never auto-opened — only the badge glows. Was auto-open intentionally removed, or is it a missing behavior?

3. **ETH and SOL ships:** `SHIP_DISPLAY` defines ETH HEAVY and SOL SPEEDSTER with full stat and color data, and the carousel cycles through all three. However, `#hangar-screen` only shows BTC. Are ETH/SOL intended to be selectable from the intro carousel, or is this dead data?

4. **Ship selection persistence across sessions:** `selectedShipIndex` is in-memory only, resets to 0 (BTC) on each cold launch. Is this intentional, or should the last-selected ship be persisted in localStorage?

5. **Gamepad ship carousel:** ArrowLeft/Right keyboard navigation is wired for ship cycling, but no gamepad d-pad binding is present in `inputSys.on('navigate')`. Intentional (mobile-first) or gap?

6. **Ship canvas hover-bob / flame animation in reduced-motion:** The `animateIntroShip()` rAF loop does not check `prefers-reduced-motion`. For strict compliance, the hover oscillation should be suppressed.

7. **Icon button aria-labels:** Only `#intro-profile` has an `aria-label`. The other three icon buttons (Settings, Leaderboard, What's New) are SVG-only with no accessible name. This fails WCAG 2.1 SC 4.1.2.
