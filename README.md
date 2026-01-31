# Fiat Invaders: Panic Selling Update (v2.1)

**Fiat Invaders** is a retro-arcade space shooter built with modern Web Technologies (HTML5 Canvas, ES6 Modules). Defend the blockchain from the infinite printing of Fiat Currencies!

## 🚀 Features

*   **PWA Ready**: Installable on iOS/Android as a native-like app (Manifest, Service Worker, cache strategy).
*   **Procedural Audio**: Custom "Synthwave" soundtrack generated in real-time using Web Audio API (No mp3 files required!).
*   **Dynamic Visuals**: Code-drawn (Canvas) player, enemies, boss, power-ups, and particle effects.
*   **Responsive**: "Notch-safe" UI design that adapts to all mobile screens.
*   **Localization**: Fully localized in English (EN) and Italian (IT).

## 🧠 Current Gameplay Rules (as of Jan 30, 2026)

*   **Wave Cycle**: 5 waves → Boss → repeat (infinite progression).
*   **Enemy Fire**: Alternating fire groups (no full-squad volleys).
*   **Bullet Cancel**: Player bullets can destroy enemy bullets.
*   **Perks**: No selection modal. Random perk is applied after **3 enemy bullets canceled in a row** (1.5s window).
*   **Power-ups**: Drawn via Canvas (no sprites).

## 🎮 How to Play

*   **Move**: Arrow Keys (Desktop) or Touch Sides (Mobile).
*   **Shoot**: Auto-fire / Spacebar.
*   **Shield**: Down Arrow or Tap Shield Icon.
*   **HODL Mode**: Stop moving to charge your "Diamond Hands" and get 2x Multiplier!

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
  /core          # Audio, Input, Object Pools
  /entities      # Game Objects (Player, Enemy, Boss)
  /managers      # Wave Logic, Collision
  /utils         # Constants, Text Strings
  main.js        # Entry Point & Game Loop
index.html       # DOM Structure & UI Overlay
style.css        # Cyberpunk Styling & Responsive Rules
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

* Enemy fire density: `enemyFireStride`, `enemyFireTimer` in `src/main.js`.
* Wave patterns/spawn bounds: `src/managers/WaveManager.js`.
* Perk trigger rules: `bulletCancelStreak` logic in `src/main.js`.

## ✅ Quickstart Tuning Checklist

* **Too much bullet spam** → raise `enemyFireStride`, increase `enemyFireTimer`.
* **Waves end too fast** → increase enemy HP in `Constants.FIAT_TYPES`.
* **Player dies too quickly** → raise base HP or reduce enemy fire rate scaling.
* **Boss too spiky** → lower boss HP scale or fire cadence.

## 🧩 Known Issues / Watchlist

* Bear Market uses `window.isBearMarket` in `WaveManager` (ensure it stays in sync).
* Assets in `/assets` are optional unless re‑wired into entities.
* Service worker cache can mask recent changes during dev.

## 📜 Credits

Created by **Antigravity** (Google DeepMind) & **Tsune**.
*Panic Selling Update v2.1.0*
