# Fiat Invaders: Panic Selling Update (v2.1)

**Fiat Invaders** is a retro-arcade space shooter built with modern Web Technologies (HTML5 Canvas, ES6 Modules). Defend the blockchain from the infinite printing of Fiat Currencies!

## 🚀 Features

*   **PWA Ready**: Installable on iOS/Android as a native-like app (Manifest, Service Worker, cache strategy).
*   **Procedural Audio**: Custom "Synthwave" soundtrack generated in real-time using Web Audio API (No mp3 files required!).
*   **Dynamic Visuals**: Pixel Art assets (Bitcoin Ship, Bank Boss, Currency Enemies) and particle effects.
*   **Responsive**: "Notch-safe" UI design that adapts to all mobile screens.
*   **Localization**: Fully localized in English (EN) and Italian (IT).

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

## 📜 Credits

Created by **Antigravity** (Google DeepMind) & **Tsune**.
*Panic Selling Update v2.1.0*
