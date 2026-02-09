# FIAT vs CRYPTO

**FIAT vs CRYPTO** is a retro-arcade space shooter built with modern Web Technologies (HTML5 Canvas, ES6 Modules). Defend the blockchain from the infinite printing of Fiat Currencies!

## 🚀 Features

*   **PWA Ready**: Installable on iOS/Android as a native-like app (Manifest, Service Worker, cache strategy).
*   **Procedural Audio**: Custom "Synthwave" soundtrack generated in real-time using Web Audio API (No mp3 files required!).
*   **Dynamic Visuals**: Code-drawn (Canvas) player, enemies, boss, power-ups, and particle effects.
*   **Responsive**: "Notch-safe" UI design that adapts to all mobile screens.
*   **Localization**: Fully localized in English (EN) and Italian (IT).

## 🧠 Current Gameplay Rules (v4.23.0)

*   **Two Game Modes**: **Story Mode** (3 acts with narrative chapters, boss progression FED→BCE→BOJ) and **Arcade Mode** (endless waves, high scores, mini-bosses).
*   **Wave System**: 15 unique waves (5 per cycle x 3 cycles) with 16 formation patterns and thematic currency groups.
*   **Seamless Flow**: Waves transition instantly — no countdown between waves. Boss-defeat celebrations preserved.
*   **HarmonicConductor**: Beat-synced enemy firing with wave intensity phases (Setup → Build → Panic).
*   **HYPER Mode**: Graze meter auto-triggers HYPER at 100% — 5x score + 50% bigger hitbox (high risk/reward).
*   **Satoshi's Sacrifice**: At 1 life, sacrifice all score for 10s invincibility and 10x multiplier.
*   **Weapon Evolution**: Progressive shot levels (1-3) + stackable modifiers + exclusive specials.
*   **GODCHAIN Mode**: Max all weapon modifiers simultaneously for ultimate ship form (red aura, fire trails, speed boost).
*   **Dynamic Difficulty (Rank System)**: Game adapts to player skill in real-time (-1.0 to +1.0 rank).
*   **3 Unique Bosses**: FED (MEGA-BILL), BCE (MEGA-COIN), BOJ (MEGA-BAR) with exclusive attack patterns.
*   **10 Fiat Currencies**: Each with unique shape, tier, and fire pattern.
*   **Compact HUD**: Minimal 45px top bar with diegetic ship indicators (life pips, shield ring, weapon pips, graze glow).
*   **Reactive Feedback**: Score colors on streaks, danger pulse at low HP, wave sweep transitions.
*   **Meme Popup System**: Full-width neon cartoon popup above player ship with 3-tier priority queue (CRITICAL/HIGH/NORMAL), spring-pop animation, 10 event types.
*   **First-Run Tutorial**: 3-step mode-aware onboarding (Controls, Objective, Survival) — separate content for Story vs Arcade, dynamic mobile control text (Swipe/Joystick).
*   **Accessibility**: WCAG 2.1 AA+ contrast ratios, 48px+ touch targets, `prefers-reduced-motion` support.

## 🎮 How to Play

*   **Move**: Arrow Keys (Desktop) or Virtual Joystick (Mobile).
*   **Shoot**: Auto-fire / Spacebar.
*   **Shield**: Down Arrow or Tap Shield Button.
*   **HYPER**: Auto-activates when graze meter fills to 100%.
*   **HODL Mode**: Stop moving to charge "Diamond Hands" for 2x score multiplier.

## 🛠️ Development & Running Locally

Since this project uses ES6 Modules (`import/export`), you cannot run it by double-clicking `index.html`. You must use a local server.

### Using VS Code
1.  Install "Live Server" extension.
2.  Right-click `index.html` -> "Open with Live Server".

### Using Python
```bash
python -m http.server 8000
# Go to http://localhost:8000
```

### Using Node.js
```bash
npx serve .
```

## 📦 Deployment

This project is a static site. You can deploy it instantly to:

*   **Vercel**: Import the repository and hit Deploy.
*   **GitHub Pages**: Enable Pages in Settings -> Source: `main` branch / root.
*   **Netlify**: Drag and drop the folder.

## 📂 Project Structure

```
/assets          # Images and Icons
/src
  /config        # BalanceConfig (single source of truth)
  /core          # Audio, Input, Object Pools, EventBus
  /entities      # Game Objects (Player, Enemy, Boss, Bullet, PowerUp)
  /managers      # WaveManager, CampaignState
  /systems       # HarmonicConductor, ParticleSystem, RankSystem, Effects, Sky, etc.
  /utils         # Constants, DebugSystem, ColorUtils, MathUtils, Upgrades
  main.js        # Game Loop & State Machine
index.html       # DOM Structure & UI Overlay
style.css        # Cell-Shaded Styling & Responsive Rules
sw.js            # Service Worker (Offline Support)
manifest.json    # PWA Configuration
```

## 📚 Docs

* `CHANGELOG.md` — Running log of gameplay/visual changes.
* `NOTES.md` — Current tuning knobs and balancing parameters.
* `roadmap.md` — Medium/long‑term feature phases.

## 🧪 Dev Tips

* **Hard refresh** after changing assets: `Ctrl+F5`.
* If changes don't show, clear SW cache: DevTools → Application → Service Workers → Unregister → Clear Storage.
* Current visuals are **code‑drawn**; sprites in `/assets` are optional unless wired back.

## 🔬 Debug & Performance Tools

All tools accessible via browser console using `dbg.` shortcut.

### Balance Testing (one-command workflow)
```javascript
dbg.balanceTest()      // Start tracking + auto-enable perf profiler
// ... play the game ...
dbg.report()           // After game over: full analytics + performance report
dbg.powerUpReport()    // Detailed power-up economy: spawned/collected/expired,
                       // weapon timeline, modifier overlap, GODCHAIN stats
```

### Performance Profiler
```javascript
dbg.perf()          // Start profiling (shows FPS overlay top-right)
dbg.perfStop()      // Stop profiling
dbg.perfReport()    // Detailed report: FPS, frame times (P50/P95/P99),
                    // jank analysis, GC spikes, entity peaks, verdict
```

### Debug Overlay & Logging
```javascript
dbg.showOverlay()   // On-screen panel: state, entities, boss, rank, HUD
dbg.debugBoss()     // Enable boss logging + overlay
dbg.debugWaves()    // Enable wave logging + overlay
dbg.debugHUD()      // Enable HUD logging + overlay
dbg.hudStatus()     // Full HUD state snapshot
```

### Weapon Debug
```javascript
dbg.maxWeapon()     // Max all weapon stats
dbg.setShot(3)      // Set shot level 1-3
dbg.setMod('rate',2)// Set modifier level
dbg.setSpecial('HOMING') // Activate special
dbg.godchain()      // Force GODCHAIN mode
```

## 🔧 Common Tweaks

All tuning is centralized in `src/config/BalanceConfig.js` via `window.Game.Balance`.

* **Difficulty curve**: `Balance.DIFFICULTY` (CYCLE_BASE, WAVE_SCALE, MAX_DIFFICULTY)
* **Enemy firing**: `Balance.CHOREOGRAPHY` (HarmonicConductor controls all firing)
* **Wave definitions**: `Balance.WAVE_DEFINITIONS` (15 waves, formations, currencies)
* **Boss stats**: `Balance.BOSS` (HP, fire rates, movement per boss per phase)
* **Dynamic difficulty**: `Balance.RANK` (fire rate/enemy count adjustment range)
* **Graze system**: `Balance.GRAZE` (radius, decay, HYPER meter)

## ✅ Quickstart Tuning Checklist

* **Too much bullet spam** → Lower `Balance.CHOREOGRAPHY.INTENSITY` rate multipliers
* **Waves end too fast** → Increase enemy count in `Balance.WAVE_DEFINITIONS`
* **Player dies too quickly** → Reduce `Balance.RANK.FIRE_RATE_RANGE` or enable easier base difficulty
* **Boss too spiky** → Lower `Balance.BOSS.HP` or increase fire rate timers

## 🧩 Known Issues / Watchlist

* Bear Market uses `window.isBearMarket` in `WaveManager` (ensure it stays in sync).
* Assets in `/assets` are optional unless re‑wired into entities.
* Service worker cache can mask recent changes during dev.

## 📜 Credits

Created by [**psychoSocial**](https://www.psychosoci5l.com/) with **Claude**, **Antigravity**, **ChatGPT**, **Gemini**.
