# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Fiat Invaders** is an HTML5 Canvas arcade shooter (Space Invaders-style) built with vanilla JavaScript using a global namespace pattern (`window.Game`). It's a PWA-ready mobile-first game with procedural audio, code-drawn graphics, and localization (EN/IT).

## Running the Project

The project uses ES6 modules and requires a local server:

```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx serve .

# Using VS Code: Right-click index.html -> "Open with Live Server"
```

**Important**: Clear Service Worker cache during development (DevTools → Application → Service Workers → Unregister) if changes don't appear.

## Architecture

### Namespace Pattern (No Build Step)

All modules attach to `window.Game`. Script load order in `index.html` matters:

1. `Constants.js` - Configuration, texts, ship/weapon/enemy definitions
2. `EventBus.js` - Pub/sub event system
3. `RunState.js` / `Upgrades.js` - Runtime state and perk system
4. `AudioSystem.js` - Procedural Web Audio synth (no audio files)
5. `InputSystem.js` - Keyboard + touch/joystick input
6. `ObjectPool.js` - GC prevention for bullets
7. Entity classes: `Entity.js` → `Bullet.js` → `Player.js` → `Enemy.js` → `Boss.js` → `PowerUp.js`
8. `WaveManager.js` - Wave spawning and progression
9. `main.js` - Game loop, state machine, collision, rendering

### Key Globals

- `window.Game` - Main namespace containing all classes and singletons
- `window.Game.Audio` - AudioSystem singleton
- `window.Game.Input` - InputSystem singleton
- `window.Game.Events` - EventBus singleton
- `window.Game.RunState` - Per-run state (perks, modifiers)
- `window.Game.Bullet.Pool` - Object pool for bullets
- `window.isBearMarket` - Hard mode flag (checked by WaveManager)

### Game States

`gameState` variable in `main.js`: `VIDEO` → `INTRO` → `HANGAR` → `PLAY` / `INTERMISSION` / `PAUSE` → `GAMEOVER`

### Entity Inheritance

All game objects extend `window.Game.Entity` (base class with x, y, vx, vy, update, draw).

## Tuning Parameters

Enemy fire pacing (`main.js`):
- `enemyFireTimer` - Base interval between fire groups (0.25s)
- `enemyFireStride` - Fire group size (3 = every 3rd enemy fires together)

Wave patterns (`WaveManager.js`):
- Spawn bounds: `startY: 140`, `maxY: 380`
- Pattern cycle: RECT → V_SHAPE → COLUMNS → SINE_WAVE → RECT → Boss

Enemy stats (`Constants.js` → `FIAT_TYPES`):
- Fire timing: `fireMin`, `fireMax`
- Aim accuracy: `aimSpread`
- Fire pattern: `SINGLE`, `BURST`, `DOUBLE`

## Visual System

All graphics are **code-drawn** on Canvas (no sprite dependencies). Assets in `/assets` are optional legacy files.

- Player/enemies use vector drawing in their `draw()` methods
- Power-ups rendered via Canvas
- Particle system for explosions and score fly-ups
- Sky gradient cycles with level (Day → Dusk → Night)

## Audio System

Procedural synthesis via Web Audio API:
- Sound effects: `AudioSystem.play(type)` - shoot, hit, explosion, coin, etc.
- Background music: `startMusic()` generates a synthwave loop in real-time
- iOS unlock hack: `unlockWebAudio()` plays silent buffer on first touch

## Perk System

- Perks apply via `RunState.js` modifiers
- Trigger: Cancel 3 enemy bullets in 1.5s window
- Perk pool in `Upgrades.js` with rarity/weight
- No modal selection - random perk auto-applied
