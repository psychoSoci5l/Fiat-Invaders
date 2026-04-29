---
title: Game Over Screen — UX Spec
status: Reverse-documented from v7.12.3
author: reverse-document + ux-designer
last_updated: 2026-04-29
template: UX Spec
platform_target: Mobile PWA + Desktop browser
scope: >
  GAMEOVER state — stats summary, nickname prompt (new record),
  leaderboard submit + offline queue, RETRY/MENU buttons,
  triple-tap debug overlay, NEW BEST badge (Arcade), campaign
  completion branch (cinematic video + credits).
---

## 1. Overview

`GAMEOVER` is reached when `triggerGameOver()` fires from `GameCompletion.js`.
It is also reachable defensively if `advanceToNextV8Level()` finds no further
levels and `showCampaignVictory` is unavailable. The screen is a DOM overlay
(`#gameover-screen`, `display:flex`) placed inside `#game-container`; the
canvas continues rendering the player ship behind it.

Two distinct branches exist at GAMEOVER:

- **Story/Campaign mode** — shows kills + streak only; leaderboard rank section
  visible (if nickname exists); NEW BEST badge hidden.
- **Arcade mode** — additionally shows Cycle / Level / Wave / Best Combo /
  Protocol Count; NEW BEST badge shown when any Arcade personal record is
  broken (cycle, level, or kills).

A third branch, **Campaign Victory**, exits GAMEOVER entirely: all three bosses
defeated triggers `showCampaignVictory()` → cinematic video → credits overlay.
This is not the standard GAMEOVER screen.

---

## 2. Entry Points

| Trigger | Source |
|---|---|
| Player HP reaches 0 | `playerDeath()` → `triggerGameOver()` |
| V8 last level end, no next level, no `showCampaignVictory` | `advanceToNextV8Level()` defensive fallback |
| INTRO keyboard/touch: `backToIntro` already handles GAMEOVER → INTRO | N/A (exit path, not entry) |

State machine: `setGameState('GAMEOVER')` is called inside `triggerGameOver()`
before any DOM mutation.

---

## 3. Screen Anatomy

```
┌─────────────────────────────────────┐
│  [dynamic island safe zone]         │
│  LIQUIDATION EVENT          ← h1.glitch-text
│  <meme text>                ← #gameover-meme (cyan, monospace)
│  ACCOUNT BALANCE            ← #roast-msg
│  <final score>              ← .final-score #finalScore
│                                     │
│  KILLS: N   BEST STREAK: N  ← #gameover-stats (always)
│  [CYCLE N  LEVEL N  WAVE N] ← #arcade-stats-row (Arcade only)
│  [BEST COMBO N  PROTOCOLS N]← #arcade-combo-row (Arcade only)
│                                     │
│  [NEW BEST!]                ← #new-best-badge (Arcade only, conditional)
│                                     │
│  [Rank section]             ← #gameover-rank-section (Story+nickname)
│    YOUR RANK  #N            ← .gameover-rank-badge
│    [TOP3/TOP5/TOP10 badge]  ← .gameover-rank-tier (conditional)
│    Top-5 list               ← .gameover-top5
│    [VIEW FULL LEADERBOARD]  ← #btn-view-lb
│                                     │
│  [RETRY]                    ← #btn-retry .btn.btn-primary
│  [MENU]                     ← .btn.btn-secondary.btn-sm
└─────────────────────────────────────┘
```

`#gameover-screen` shares CSS with `#v8-intermission-screen`
(`position: absolute`). At `max-height: 740px` viewports, `padding-top`
collapses to `max(10px, var(--di-safe-top))` to avoid Dynamic Island overlap.

---

## 4. State Inventory

| State | Trigger | Visible elements |
|---|---|---|
| **Loading rank** | Nickname exists, score submitted | Rank badge shows `t('LB_SUBMITTING')` |
| **Rank resolved** | `submitScore` returns `ok=true, rank>0` | `#N` in rank badge; optional tier badge |
| **Rank outside top** | `result.rank === -1` | Dash (`-`) in rank badge |
| **Queued offline** | `submitScore` returns `ok=false` | `t('LB_QUEUED')` in rank badge; score saved to `fiat_pending_score` |
| **No nickname** | `!hasNickname()` and NOT new high score | `#gameover-rank-section` hidden |
| **Nickname prompt** | `!hasNickname()` AND `wasNewHighScore` | `#nickname-overlay` opens over GAMEOVER screen |
| **Nickname confirmed** | User enters valid 3-6 char callsign | Overlay closes; `_doRank()` fires |
| **Nickname skipped** | User taps SKIP | Overlay closes; rank section stays hidden |
| **NEW BEST badge** | Arcade mode AND any personal record broken | `#new-best-badge` `display:inline-block` |
| **Debug overlay open** | Triple-tap background within 800ms | `G.DebugOverlay` panel shown; z-index 10050 |
| **Campaign cinematic** | All 3 bosses defeated before HP=0 | `showCampaignVictory()` replaces GAMEOVER entirely |

---

## 5. User Flows

### 5.1 Standard Story game over (has nickname)

```
triggerGameOver()
  → setGameState('GAMEOVER')
  → #gameover-screen display:flex
  → stats populated (kills, streak)
  → arcade rows hidden
  → new-best-badge hidden
  → G.Leaderboard.renderGameoverRank() called
      → flushPendingScore() (clears any queued offline score first)
      → submitScore() → rank badge: "SUBMITTING..."
      → on success: rank badge "#N" + optional tier badge
      → on failure: rank badge "LB_QUEUED", savePendingScore()
      → fetchScores() → top-5 list rendered
```

### 5.2 Story game over — new high score, no nickname

```
triggerGameOver()
  → wasNewHighScore = true
  → rank section skipped
  → showNicknamePrompt({ title: NICK_RECORD_TITLE, hideSkip: false })
      → #nickname-overlay display:flex
      → User confirms: setNickname(), _doRank() fires → [see 5.1]
      → User skips:    overlay closes, rank section stays hidden
```

### 5.3 Arcade game over

```
triggerGameOver()
  → #arcade-stats-row display:flex (cycle / level / wave)
  → #arcade-combo-row display:flex (best combo / protocols)
  → checkArcadeRecords() → compare localStorage fiat_arcade_records
  → newBest=true: #new-best-badge visible ("NEW BEST!")
  → Leaderboard NOT submitted in Arcade path
    (renderGameoverRank is only called in isStoryMode branch)
```

**Gap noted:** see Open Questions §14.

### 5.4 Offline queue flush

```
App start: flushPendingScore()
  → getPendingScore() from fiat_pending_score
  → hasNickname() check (skips if no nickname)
  → submitScore(pending) → on ok: clearPendingScore()

Also: renderGameoverRank() always calls flushPendingScore() first,
      ensuring any prior queued score is resolved before the new submit.
```

### 5.5 Campaign victory path (not GAMEOVER)

```
LEVEL_END action, no next level
  → showCampaignVictory()
      → setGameState('CAMPAIGN_VICTORY')
      → gold fade-out transition
      → #campaign-victory-screen injected as body child
      → [BEAR MARKET suggestion if not already active]
      → [REPLAY / MENU]
      → high score updated; submitToGameCenter() called

  If first ever completion:
      → Player taps CONTINUE in victory screen
          → localStorage.setItem('fiat_completion_seen', '1')
          → showGameCompletion() (cinematic video)
              → completion-{lang}.mp4 plays (EN or IT)
              → skip: tap/click on video
              → auto-timeout: 20s
              → → showCompletionOverlay() (credits DOM overlay)
                   → player taps CONTINUE → gc-fadeout → overlay hidden → onComplete()
```

**Note:** `fiat_completion_seen` is set *after* the player dismisses the
credits overlay, not at victory screen display. Re-entry is not gated by the
flag in the current code — `showGameCompletion` is always called from
`showCampaignVictory` via `onComplete` chain. The flag is read elsewhere
(presumably intro) to suppress repeat cinematic.

---

## 6. Interaction Design

### 6.1 Primary actions

| Action | Element | Input |
|---|---|---|
| Retry | `#btn-retry` `.btn.btn-primary` | Tap / click / Enter (keyboard focus) |
| Menu | `.btn.btn-secondary.btn-sm` | Tap / click |
| View leaderboard | `#btn-view-lb` | Tap / click → `G.Leaderboard.toggle()` |
| Confirm nickname | `#nickname-confirm` | Tap / Enter key (`keydown` listener) |
| Skip nickname | `#nickname-skip` | Tap (hidden if `opts.hideSkip=true`) |

`restartFromGameOver()`: hides debug overlay → hides gameover screen → resets
audio → forces `HANGAR` state → `startGame()`.

`backToIntro()`: triggered by MENU button inline `onclick`.

### 6.2 Triple-tap debug gesture

- Target: anywhere on `#gameover-screen` except `button`, `a`, `input` elements
- Events: `touchend` (passive) + `click`
- Threshold: 3 events within 800ms
- Guard: `G.GameState.is('GAMEOVER')` checked on each tap
- Result: `G.DebugOverlay` shown with `context='GAMEOVER'` (current session data)
- Contrast: Intro triple-tap targets `#version-tag` specifically, shows previous
  session data from localStorage

### 6.3 Input buffering / edge cases

- RETRY and MENU buttons are always present and tappable while async leaderboard
  operations are in progress. No loading lock exists on the CTA buttons.
- Nickname overlay accepts `Enter` key via `keydown` listener. No `keyup` or
  gamepad navigation is implemented on the overlay.

---

## 7. Information Architecture

Hierarchy of information density, top to bottom:

1. **Outcome label** — "LIQUIDATION EVENT" (fixed, EN only despite i18n wrapper)
2. **Emotional beat** — random meme (cyan) + roast label
3. **Score** — large numeric, always visible
4. **Run stats** — kills + streak (universal); cycle + level + wave + combo
   (Arcade only)
5. **Achievement signal** — NEW BEST badge (Arcade only)
6. **Social/competitive context** — rank badge + top-5 + tier badge
7. **Navigation** — RETRY (primary) + MENU (secondary)

This ordering follows progressive disclosure: immediate outcome → personal
performance → social comparison → navigation. The leaderboard section loads
asynchronously without blocking the CTA buttons.

---

## 8. Feedback Systems

| Event | Feedback |
|---|---|
| GAMEOVER state entered | `audioSys.play('explosion')` |
| Score submit in progress | Rank badge text = `t('LB_SUBMITTING')` |
| Submit success, top 3 | `.gameover-rank-tier.rank-tier-3` badge + `t('LB_TOP3')` |
| Submit success, top 5 | `.gameover-rank-tier.rank-tier-5` + `t('LB_TOP5')` |
| Submit success, top 10 | `.gameover-rank-tier.rank-tier-10` + `t('LB_TOP10')` |
| Submit offline queued | Rank badge = `t('LB_QUEUED')` |
| Arcade new record | `#new-best-badge` inline-block, `t('NEW_BEST')` text |
| Invalid nickname | `#nickname-error` shown with `t('NICK_INVALID')` |
| Campaign victory | Gold flash transition + triple `levelUp` SFX staggered 300ms |
| High score in HUD | `.hud-score-value.score-new-record` magenta pulsing glow (persists during play) |

No haptic feedback is implemented at GAMEOVER. No animation on the gameover
screen entrance itself (display:flex, no CSS transition).

---

## 9. Phase Adaptation — Death Phase Palette

The game-over screen captures the visual phase at the moment of the player's death
and uses it to tint the overlay's accent colors. This gives the death screen an
emotional context — dying in the blue sky of Earth, the violet twilight of the
atmosphere, or the neon void of deep space — without requiring layout changes.

### Palette Capture

When `triggerGameOver()` fires, it reads `PhaseTransitionController.getCurrentPhase()`
and stores the phase index on the game-over overlay as a data attribute:

```html
<div id="gameover-screen" data-death-phase="1|2|3">
```

This attribute drives CSS custom property overrides for the game-over elements only.

### Phase Mapping

| Element | Phase 1 — Horizon | Phase 2 — Twilight | Phase 3 — Void |
|---|---|---|---|
| Screen heading "LIQUIDATION EVENT" | `#4a90d9` cyan-blue | `#8866aa` violet (default) | `#00f0ff` bright cyan |
| Meme text (`#gameover-meme`) | `--neon-accent` (blue) | `--neon-accent` (violet) | `--neon-accent` (cyan) |
| "ACCOUNT BALANCE" label (`#roast-msg`) | `#a0a0a0` cool grey | `#a0a0a0` (unchanged) | `#a0a0a0` (unchanged) |
| Score value | `#ffd700` gold (unchanged) | `#ffd700` (unchanged) | `#ffd700` (unchanged) |
| Stats labels | `rgba(255,255,255,0.7)` | `rgba(255,255,255,0.7)` | `rgba(255,255,255,0.8)` slightly brighter |
| NEW BEST badge | `#39ff14` green (unchanged) | `#39ff14` (unchanged) | `#39ff14` (unchanged) |
| Rank badge border | `--terminal-border` | `--terminal-border` | `--terminal-border` |
| Rank badge "YOUR RANK" label | `--neon-accent` | `--neon-accent` | `--neon-accent` |
| RETRY button border | `--terminal-border` | `--terminal-border` | `--terminal-border` |
| MENU button text | `rgba(255,255,255,0.6)` | `rgba(255,255,255,0.6)` | `rgba(255,255,255,0.7)` |

### Phase-Specific Emotional Tint

Beyond colors, the death phase influences the **glitch intensity** of the "LIQUIDATION
EVENT" heading:

| Phase | Glitch effect | Rationale |
|---|---|---|
| P1 — Earth | Minimal glitch, 1px offset | Dying close to home — clean, almost peaceful end |
| P2 — Atmosphere | Moderate glitch, 2px offset, 0.3s interval | Standard death; the transition zone is where failure feels natural |
| P3 — Void | Intense glitch, 3px offset, 0.15s interval | Dying in deep space — the stakes are highest. Max visual impact |

The `.glitch-text` class on the `h1` applies an existing CSS glitch keyframe
(defined in style.css). The phase modifies glitch intensity via `--glitch-offset`
and `--glitch-speed` CSS variables driven by `data-death-phase`.

### Arcade Records — No Phase Effect

Arcade-specific elements (cycle/level/wave display, combo rows) are unaffected by
death phase. They render with fixed colors matching the heritage palette. This keeps
statistical data visually neutral across all death contexts.

### Campaign Victory Path

The `showCampaignVictory()` screen is a distinct visual experience (gold fade,
triumphant palette) and does not use death-phase theming. Phase adaptation applies
only to the standard GAMEOVER screen.

### Implementation

1. `triggerGameOver()` calls `G.PhaseTransitionController.getCurrentPhase()` (or
   reads from a snapshot stored at `RunState.currentPhase`).
2. `#gameover-screen` receives `data-death-phase="{phase}"` attribute.
3. CSS rules under `[data-death-phase="1"]`, `[data-death-phase="2"]`,
   `[data-death-phase="3"]` override `--neon-accent`, `--terminal-border`,
   `--glitch-offset`, and `--glitch-speed` for game-over elements only.
4. If PhaseTransitionController is unavailable, default to `data-death-phase="2"`
   (Atmosphere) — the heritage default.

### Accessibility Note

The heading glitch effect respects `prefers-reduced-motion`: when the user has
reduced motion enabled, the glitch animation is suppressed entirely regardless of
`data-death-phase`. The glitch CSS animation uses `@media (prefers-reduced-motion: no-preference)`.

---

## 10. Accessibility

- [x] RETRY and MENU are `.btn` elements — keyboard-focusable
- [x] Nickname input: `autocapitalize="characters"`, `inputmode="text"` for mobile keyboards
- [x] Enter key submits nickname form
- [ ] No `aria-live` region for async rank loading — screen readers will not
      announce rank result
- [ ] No focus management on GAMEOVER show — focus remains wherever it was when
      player died; no auto-focus to RETRY
- [ ] Triple-tap debug gesture has no keyboard equivalent
- [ ] `#nickname-overlay` has no `role="dialog"` or `aria-modal`; focus is not
      trapped inside the overlay
- [x] Text readable: monospace 12px stats labels, 20px rank value, 14px badge
- [x] Color not sole indicator: NEW BEST badge uses text; rank tier uses text label
- [x] No flashing content at GAMEOVER (gold transition on victory is one-shot)
- [ ] Subtitles: cinematic completion video — no subtitle track confirmed in spec

---

## 11. Localization

| Key | Usage |
|---|---|
| `RESTART` | `#btn-retry` label |
| `NICK_TITLE` | Default nickname overlay title |
| `NICK_RECORD_TITLE` | Nickname overlay title when triggered by new high score |
| `NICK_PLACEHOLDER` | Input placeholder |
| `NICK_CONFIRM` | Confirm button |
| `NICK_SKIP` | Skip button |
| `NICK_INVALID` | Error message for invalid callsign |
| `NEW_BEST` | NEW BEST badge text |
| `LB_SUBMITTING` | Rank badge during async submit |
| `LB_QUEUED` | Rank badge when submit fails (offline) |
| `LB_YOUR_RANK` | Rank label text |
| `LB_TOP3/5/10` | Tier badge text |
| `LB_VIEW_FULL` | View leaderboard button |
| `GC_TITLE` / `GC_CONTINUE` | Campaign completion overlay |
| `CV_TITLE` / `CV_SUBTITLE` / etc. | Campaign victory overlay |

The gameover `h1` ("LIQUIDATION EVENT") is hardcoded in JS (`goTitle.innerText`)
and in HTML, bypassing the i18n system. It does not change in IT locale.

---

## 12. Platform Specifics

### Mobile PWA

- `#gameover-screen` uses `var(--di-safe-top)` padding resolved from JS
  heuristic for Dynamic Island clearance
- Touch events registered as `passive:true` on triple-tap listener
- Cinematic video uses `touchstart` skip handler alongside `click`
- `completion-{lang}.mp4` language selection uses `G._currentLang`

### Desktop

- Mouse click registered on triple-tap listener (same handler as touch)
- `#gameover-screen` inherits the centered phone-frame viewport from
  `#game-container` (`max-height: 1300px`, `border-radius: 20px`)
- Nickname `Enter` key works identically

---

## 13. localStorage Keys

| Key | Purpose |
|---|---|
| `fiat_nickname` | Player callsign (3-6 chars A-Z0-9) |
| `fiat_device_id` | UUID for leaderboard device binding (30d TTL on server) |
| `fiat_pending_score` | Offline queue; only highest score kept |
| `fiat_arcade_records` | `{bestCycle, bestLevel, bestKills}` for NEW BEST logic |
| `fiat_highscore_story` | Story mode personal best |
| `fiat_highscore_arcade` | Arcade mode personal best |
| `fiat_completion_seen` | Set to `'1'` after credits dismissed; suppresses repeat cinematic |
| `fiat_debug_session_log` | Flushed on game over; read by debug overlay on INTRO tap |

---

## 14. Edge Cases

- **Simultaneous offline queue + new run:** `renderGameoverRank` calls
  `flushPendingScore()` before submitting the current score. If the flush
  succeeds, the pending slot is cleared before the new score is queued.
  If flush fails again, only the higher of {pending, new} is stored.

- **V8 mode wave mapping:** V8 campaign keeps `WaveManager.wave` at 1.
  `triggerGameOver` maps the reached V8 level to `submitCycle` and hardcodes
  `submitWave=5` to avoid the server score-ceiling rejecting valid runs
  (ceiling = `12000 × wave × cycle × 1.5`).

- **No nickname + no new high score:** Rank section hidden, no prompt shown.
  Player can still use RETRY/MENU freely.

- **Campaign victory high score check:** `showCampaignVictory()` updates
  high score via `d.setHighScore()` independently of `triggerGameOver()`.
  If the player wins, `triggerGameOver` is never called — the victory path
  does its own high score write and `submitToGameCenter()` call.

- **Debug overlay on RETRY/MENU:** `G.DebugOverlay.hide()` is explicitly called
  in both `restartFromGameOver()` and `startGame()`, preventing overlay bleed
  into next run.

---

## 15. Open Questions

1. **Arcade leaderboard:** `renderGameoverRank` is only called inside the
   `isStoryMode` branch. Arcade scores are never submitted to the leaderboard.
   Intentional design (separate arcade board) or gap? The Leaderboard API does
   support `mode='arcade'` (`G.Leaderboard._getMode()` returns `'arcade'` in
   Arcade). The submission code just doesn't reach it.

2. **GAMEOVER h1 localization:** "LIQUIDATION EVENT" is hardcoded and bypasses
   the `t()` system. If IT locale equivalence is desired, an i18n key is needed.

3. **`fiat_completion_seen` read site:** The flag is written in
   `showCompletionOverlay` but its read location is not in `GameCompletion.js`.
   If the guard lives in `IntroScreen` or `CampaignState`, a re-completion run
   will still call `showCampaignVictory()` — it is unclear whether the cinematic
   is suppressed on repeat wins.

4. **Nickname `hideSkip` inconsistency:** `showNicknamePrompt` is called with
   `hideSkip: false` even on new high score, meaning the player can always skip.
   CLAUDE.md documents "skip allowed except on new record with no nickname" as
   intended — but the code does not enforce a hard block. Confirm if this is
   intentional UX (soft nudge, not mandatory).

5. **Focus management:** No auto-focus to RETRY button when GAMEOVER screen
   appears. On desktop this forces the user to Tab before keyboard navigation
   works. Minor friction for keyboard-primary players.

6. **No GAMEOVER screen entrance animation:** The screen appears instantly
   (`display:flex`). The explosion SFX fires but there is no visual transition
   into the screen. Consider a fade or slide for future polish pass.

7. **Cinematic subtitle track:** `completion-{lang}.mp4` language selection
   exists but no `<track>` element or subtitle fallback is documented. Confirm
   whether the video file itself has burned-in subtitles.
