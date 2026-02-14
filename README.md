# FIAT vs CRYPTO

**FIAT vs CRYPTO** is a retro-arcade space shooter built with modern Web Technologies (HTML5 Canvas, ES6 Modules). Defend the blockchain from the infinite printing of Fiat Currencies!

## 🚀 Features

*   **PWA Ready**: Installable on iOS/Android as a native-like app (Manifest, Service Worker, cache strategy).
*   **Procedural Audio**: 5 unique level themes + boss music, generated in real-time using Web Audio API (No mp3 files required!). Separate music/SFX controls.
*   **Dynamic Visuals**: Code-drawn (Canvas) player, enemies, boss, power-ups, and particle effects.
*   **Responsive**: "Notch-safe" UI design that adapts to all mobile screens.
*   **Localization**: Fully localized in English (EN) and Italian (IT).

## 🧠 Current Gameplay Rules (v5.9)

*   **Two Game Modes**: **Story Mode** (3 acts with narrative chapters, boss progression FED→BCE→BOJ) and **Arcade Mode** ("Rogue Protocol" — roguelike modifier system, combo scoring, enhanced mini-bosses, infinite scaling).
*   **Wave System**: 15 unique waves (5 per cycle × 3 cycles) with 16 formation patterns and thematic currency groups.
*   **Seamless Flow**: Waves transition instantly — no countdown between waves. Boss-defeat celebrations preserved.
*   **HarmonicConductor**: Beat-synced enemy firing with wave intensity phases (Setup → Build → Panic).
*   **Weapon Evolution**: Linear 5-level system (Single → Dual → Dual+ → Triple → Triple MAX). UPGRADE drops increase level permanently. Death costs -1 level.
*   **Special Weapons**: 3 exclusive specials (HOMING, PIERCE, MISSILE) — 12s duration each.
*   **Utility Drops**: SHIELD (absorbs hit) and SPEED (+40% movement) — capsule-shaped, 12s duration.
*   **Elemental Perks**: Fixed sequential order (Fire → Laser → Electric). Diamond crystal drops every 50 kills. Fire = splash damage, Laser = speed + pierce, Electric = chain lightning.
*   **HYPER Mode**: Proximity kills fill the DIP meter. At 100%, HYPER activates — 5x score, +2 temp weapon levels, 50% bigger hitbox (high risk/reward).
*   **GODCHAIN Mode**: Activates when 3 elemental perks collected — energy form ship, max firepower. Further perks re-trigger it.
*   **Arcade Rogue Protocol**: 15 roguelike modifiers (OFFENSE/DEFENSE/WILD) chosen after boss and mini-boss defeats. Combo scoring (chain kills for up to 5x multiplier). Aggressive pacing, post-C3 infinite scaling.
*   **Dynamic Difficulty (Rank System)**: Game adapts to player skill in real-time (-1.0 to +1.0 rank).
*   **3 Unique Bosses**: FED (MEGA-BILL), BCE (MEGA-COIN), BOJ (MEGA-BAR) with exclusive attack patterns and 3 phases each.
*   **10 Fiat Currencies**: Each with unique shape, tier, and fire pattern.
*   **Compact HUD**: Minimal 45px top bar with diegetic ship indicators.
*   **Reactive Feedback**: Score colors on streaks, danger pulse at low HP, wave sweep transitions.
*   **Meme Popup System**: Full-width neon cartoon popup above player ship with 3-tier priority queue (CRITICAL/HIGH/NORMAL), spring-pop animation, 10 event types.
*   **First-Run Tutorial**: 3-step mode-aware onboarding (Controls, Objective, Survival) — separate content for Story vs Arcade.
*   **Accessibility**: WCAG 2.1 AA+ contrast ratios, 48px+ touch targets, `prefers-reduced-motion` support.

## 🎮 How to Play

*   **Move**: Arrow Keys / A-D (Desktop) or Virtual Joystick (Mobile).
*   **Shoot**: Auto-fire / Spacebar.
*   **HYPER**: Press H when DIP meter is full (auto-activates on mobile).

See [PLAYER_MANUAL.md](PLAYER_MANUAL.md) (EN) or [MANUALE_GIOCATORE.md](MANUALE_GIOCATORE.md) (IT) for full details.

## 🛠️ Development & Running Locally

Since this project uses a global namespace pattern (`window.Game`), you need a local server.

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
  /managers      # WaveManager, CampaignState, MiniBossManager, PerkManager
  /systems       # HarmonicConductor, ParticleSystem, RankSystem, ArcadeModifiers, etc.
  /utils         # Constants, DebugSystem, ColorUtils, MathUtils, Upgrades
  main.js        # Game Loop & State Machine
index.html       # DOM Structure & UI Overlay
style.css        # Cell-Shaded Styling & Responsive Rules
sw.js            # Service Worker (Offline Support)
manifest.json    # PWA Configuration
```

## 📚 Docs

* `PLAYER_MANUAL.md` — Full player manual (English).
* `MANUALE_GIOCATORE.md` — Manuale completo del giocatore (Italiano).
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
                       // weapon timeline, GODCHAIN stats, adaptive suppression
dbg.entityReport()     // Entity density: averages, wave grouping, hot spots,
                       // player bullet analysis
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
dbg.debugHUD()      // Enable HUD logging + overlay
dbg.hudStatus()     // Full HUD state snapshot
dbg.hitboxes()      // Show collision hitboxes
dbg.formations()    // Formation visual audit at 360/414/768px
```

### Weapon Debug
```javascript
dbg.maxWeapon()     // Max weapon level + activate GODCHAIN
dbg.weaponStatus()  // Current weapon state snapshot
dbg.godchain()      // Force GODCHAIN mode
dbg.godchainStatus()// GODCHAIN timer and state
```

### Arcade Debug
```javascript
dbg.arcade()        // Full arcade status (modifiers, combo, bonuses)
dbg.arcadeMod(id)   // Force-apply modifier (e.g. 'OVERCLOCK')
dbg.arcadePick(3)   // Open modifier choice screen
dbg.arcadeCombo(50) // Set combo counter
dbg.arcadeMax()     // Apply all offense modifiers
dbg.arcadeTank()    // Apply all defense modifiers + extra lives
dbg.arcadeWild()    // Apply all wild modifiers
dbg.arcadeReset()   // Clear all modifiers and combo
dbg.arcadeCycle(5)  // Jump to cycle N
dbg.arcadeHelp()    // List all arcade debug commands
```

## 🔧 Common Tweaks

All tuning is centralized in `src/config/BalanceConfig.js` via `window.Game.Balance`.

* **Difficulty curve**: `Balance.DIFFICULTY` (CYCLE_BASE, WAVE_SCALE, MAX_DIFFICULTY)
* **Enemy firing**: `Balance.CHOREOGRAPHY` (HarmonicConductor controls all firing)
* **Wave definitions**: `Balance.WAVE_DEFINITIONS` (15 waves, formations, currencies)
* **Boss stats**: `Balance.BOSS` (HP, fire rates, movement per boss per phase, attack patterns)
* **Weapon evolution**: `Balance.WEAPON_EVOLUTION` (level table, specials, utilities, GODCHAIN)
* **Drop system**: `Balance.ADAPTIVE_DROPS` (suppression, category weights, GODCHAIN recharge)
* **Dynamic difficulty**: `Balance.RANK` (fire rate/enemy count adjustment range)
* **Proximity kills**: `Balance.PROXIMITY_KILL` (DIP meter gain, HYPER trigger)

## ✅ Quickstart Tuning Checklist

* **Too much bullet spam** → Lower `Balance.CHOREOGRAPHY.INTENSITY` rate multipliers
* **Waves end too fast** → Increase `Balance.ENEMY_HP` (BASE, SCALE, CYCLE_MULT)
* **Player dies too quickly** → Reduce `Balance.RANK.FIRE_RATE_RANGE` or lower difficulty
* **Boss too tanky** → Lower `Balance.BOSS.HP` (BASE, PER_LEVEL, CYCLE_MULT)
* **Weapon levels too fast** → Increase `Balance.WEAPON_EVOLUTION.KILLS_FOR_UPGRADE`
* **GODCHAIN too rare** → Increase `Balance.ADAPTIVE_DROPS.GODCHAIN_RECHARGE_NEED`

## 🧩 Known Issues / Watchlist

* Bear Market uses `window.isBearMarket` in `WaveManager` (ensure it stays in sync).
* Assets in `/assets` are optional unless re‑wired into entities.
* Service worker cache can mask recent changes during dev — always unregister SW when testing.

## 📜 Credits

Created by [**psychoSocial**](https://www.psychosoci5l.com/) with **Claude**, **Antigravity**, **ChatGPT**, **Gemini**.
