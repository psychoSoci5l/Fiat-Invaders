# FIAT vs CRYPTO

**FIAT vs CRYPTO** is a retro-arcade space shooter built with modern Web Technologies (HTML5 Canvas, ES6 Modules). Defend the blockchain from the infinite printing of Fiat Currencies!

## 🚀 Features

*   **PWA Ready**: Installable on iOS/Android as a native-like app (Manifest, Service Worker, cache strategy).
*   **Procedural Audio**: Custom "Synthwave" soundtrack generated in real-time using Web Audio API (No mp3 files required!).
*   **Dynamic Visuals**: Code-drawn (Canvas) player, enemies, boss, power-ups, and particle effects.
*   **Responsive**: "Notch-safe" UI design that adapts to all mobile screens.
*   **Localization**: Fully localized in English (EN) and Italian (IT).

## 🧠 Current Gameplay Rules (v4.1.0)

*   **Wave System**: 15 unique waves (5 per cycle x 3 cycles) with 16 formation patterns and thematic currency groups.
*   **Horde System**: Each wave has 2 hordes with complementary formations and escalating difficulty.
*   **HarmonicConductor**: Beat-synced enemy firing with wave intensity phases (Setup → Build → Panic).
*   **HYPER Mode**: Fill graze meter to 100%, activate for 5x score + 50% bigger hitbox (high risk/reward).
*   **Satoshi's Sacrifice**: At 1 life, sacrifice all score for 10s invincibility and 10x multiplier.
*   **Weapon Evolution**: Progressive shot levels (1-3) + stackable modifiers + exclusive specials.
*   **Dynamic Difficulty (Rank System)**: Game adapts to player skill in real-time (-1.0 to +1.0 rank).
*   **3 Unique Bosses**: FED (MEGA-BILL), BCE (MEGA-COIN), BOJ (MEGA-BAR) with exclusive attack patterns.
*   **10 Fiat Currencies**: Each with unique shape, tier, and fire pattern.

## 🎮 How to Play

*   **Move**: Arrow Keys (Desktop) or Virtual Joystick (Mobile).
*   **Shoot**: Auto-fire / Spacebar.
*   **Shield**: Down Arrow or Tap Shield Button.
*   **HYPER**: H Key or Tap HYPER Button (when meter full).
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
* If changes don’t show, clear SW cache: DevTools → Application → Service Workers → Unregister → Clear Storage.
* Current visuals are **code‑drawn**; sprites in `/assets` are optional unless wired back.

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

Created by **psychoSocial** with **Claude**, **Antigravity**, **ChatGPT**, **Gemini**.
