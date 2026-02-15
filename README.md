# FIAT vs CRYPTO

**FIAT vs CRYPTO** is a retro-arcade space shooter built with modern Web Technologies (HTML5 Canvas, ES6 Modules). Defend the blockchain from the infinite printing of Fiat Currencies!

## 🚀 Features

*   **PWA Ready**: Installable on iOS/Android as a native-like app (Manifest, Service Worker, cache strategy).
*   **Procedural Audio**: 5 unique level themes + boss music, generated in real-time using Web Audio API (No mp3 files required!). Separate music/SFX controls.
*   **Dynamic Visuals**: Code-drawn (Canvas) player, enemies, boss, power-ups, and particle effects.
*   **Responsive**: "Notch-safe" UI design that adapts to all mobile screens.
*   **Localization**: Fully localized in English (EN) and Italian (IT).

## 🧠 Current Gameplay Rules (v5.22)

*   **Two Game Modes**: **Story Mode** (3 acts with narrative chapters, boss progression FED→BCE→BOJ) and **Arcade Mode** ("Rogue Protocol" — roguelike modifier system, combo scoring, enhanced mini-bosses, infinite scaling).
*   **Wave System**: 15 unique waves (5 per cycle × 3 cycles) with 16 formation patterns and thematic currency groups.
*   **Seamless Flow**: Waves transition instantly — no countdown between waves. Boss-defeat celebrations preserved.
*   **HarmonicConductor**: Beat-synced enemy firing with wave intensity phases (Setup → Build → Panic).
*   **Weapon Evolution**: 3-level system (Single → Dual → Triple MAX). Boss kills drop an **Evolution Core** that upgrades weapons cinematically. HYPER adds +2 temp levels (LV4-5). No weapon death penalty.
*   **Special Weapons**: 3 exclusive specials (HOMING, PIERCE, MISSILE) — 12s duration each.
*   **Utility Drops**: SHIELD (absorbs hit) and SPEED (+40% movement) — capsule-shaped, 12s duration.
*   **Elemental Perks**: Fixed sequential order (Fire → Laser → Electric). Diamond crystal drops every 50 kills. Fire = napalm splash, Laser = beam + impact sparks, Electric = chain lightning bolts. Each perk adds a persistent ship aura with ambient particles.
*   **HYPER Mode**: Proximity kills fill the DIP meter. At 100%, HYPER activates — 5x score, +2 temp weapon levels, 50% bigger hitbox (high risk/reward).
*   **GODCHAIN Mode**: Activates when 3 elemental perks collected — apotheosis burst (symbol explosion + gold rings), energy form ship, max firepower. Further perks re-trigger it.
*   **Arcade Rogue Protocol**: 15 roguelike modifiers (OFFENSE/DEFENSE/WILD) chosen after boss and mini-boss defeats. Combo scoring (chain kills for up to 5x multiplier). Aggressive pacing, post-C3 infinite scaling.
*   **Dynamic Difficulty (Rank System)**: Game adapts to player skill in real-time (-1.0 to +1.0 rank).
*   **3 Unique Bosses**: FED (Corrupted Printer pyramid), BCE (Star Fortress), BOJ (Golden Torii) with exclusive attack patterns, 3 phases each, and cinematic death sequences.
*   **10 Fiat Currencies**: Each with unique shape, tier, and fire pattern.
*   **Compact HUD**: Minimal 45px top bar with diegetic ship indicators.
*   **Reactive Feedback**: Score colors on streaks, danger pulse at low HP, wave sweep transitions.
*   **Meme Popup System**: Full-width neon cartoon popup above player ship with 3-tier priority queue (CRITICAL/HIGH/NORMAL), spring-pop animation, 10 event types.
*   **First-Run Tutorial**: Progressive 3-step mission briefing (Mission, Controls, Shield) with slide animations — separate content for Story vs Arcade, platform-aware (PC/mobile).
*   **Online Leaderboard**: Global rankings powered by Cloudflare Workers + KV. Callsign system (3-6 chars), auto-submit on gameover, rank display with tier badges (TOP 3/5/10), platform icons (Desktop 🖥 / Mobile 📱).
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

The game runs on **Cloudflare**:

*   **Frontend**: Static site on **Cloudflare Pages**, connected to this GitHub repo (`main` branch). Pushes to `main` trigger automatic deploys. CSP headers configured via `_headers`.
*   **Leaderboard API**: **Cloudflare Worker + KV** (`workers/leaderboard-worker.js`). Handles score submission (HMAC-signed), rankings, and rate limiting. Deployed separately via `wrangler`.

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
/workers           # Cloudflare Worker (leaderboard backend)
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
* **Weapon evolution**: `Balance.WEAPON_EVOLUTION` (3-level table, specials, utilities, boss Evolution Core)
* **Drop system**: `Balance.ADAPTIVE_DROPS` (suppression, category weights: SPECIAL/UTILITY/PERK)
* **Dynamic difficulty**: `Balance.RANK` (fire rate/enemy count adjustment range)
* **Proximity kills**: `Balance.PROXIMITY_KILL` (DIP meter gain, HYPER trigger)

## ✅ Quickstart Tuning Checklist

* **Too much bullet spam** → Lower `Balance.CHOREOGRAPHY.INTENSITY` rate multipliers
* **Waves end too fast** → Increase `Balance.ENEMY_HP` (BASE, SCALE, CYCLE_MULT)
* **Player dies too quickly** → Reduce `Balance.RANK.FIRE_RATE_RANGE` or lower difficulty
* **Boss too tanky** → Lower `Balance.BOSS.HP` (BASE, PER_LEVEL, CYCLE_MULT)
* **Weapon levels too fast** → Increase `Balance.WEAPON_EVOLUTION.KILLS_FOR_UPGRADE`
* **GODCHAIN too rare** → Lower `Balance.WEAPON_EVOLUTION.KILLS_FOR_PERK` (perk diamond frequency)

## 🧩 Known Issues / Watchlist

* Bear Market uses `window.isBearMarket` in `WaveManager` (ensure it stays in sync).
* Assets in `/assets` are optional unless re‑wired into entities.
* Service worker cache can mask recent changes during dev — always unregister SW when testing.

## 📜 Credits

Created by [**psychoSocial**](https://www.psychosoci5l.com/) with **Claude**, **Antigravity**, **ChatGPT**, **Gemini**.
