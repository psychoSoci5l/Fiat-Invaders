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
- `window.marketCycle` - Current difficulty cycle (increases after boss)
- `window.currentLevel` - Current level (for WaveManager)

### Game States

`gameState` variable in `main.js`: `VIDEO` → `INTRO` → `HANGAR` → `PLAY` / `INTERMISSION` / `PAUSE` → `GAMEOVER`

### Entity Inheritance

All game objects extend `window.Game.Entity` (base class with x, y, vx, vy, update, draw).

---

## Difficulty System

Unified linear scaling via `getDifficulty()` in `main.js`:

```javascript
function getDifficulty() {
    const base = (level - 1) * 0.08;      // +8% per level
    const cycleBonus = (marketCycle - 1) * 0.20; // +20% per cycle
    return Math.min(0.85, base + cycleBonus);    // Cap at 0.85
}
```

### Applied Parameters

| Parameter | Formula | Range |
|-----------|---------|-------|
| `gridSpeed` | `12 + diff * 20` | 12 → 32 |
| `bulletSpeed` | `150 + diff * 80` | 150 → 230 |
| `rateMult` | `0.5 + diff * 0.5` | 0.5 → 1.0 |
| `enemyHP` | `10 + floor(diff * 15)` | 10 → 25 |

Bear Market applies additional 1.3x multiplier.

---

## Power-Up System

Two categories, **mutually exclusive within category**:

### Weapon Power-Ups (replace each other)
| Type | Description | Fire Rate |
|------|-------------|-----------|
| NORMAL | Single shot straight | 0.18s |
| WIDE | Triple shot, wide spread | 0.24s |
| NARROW | Triple shot, tight spread | 0.22s |
| FIRE | Triple shot, parallel | 0.28s |

### Ship Power-Ups (replace each other)
| Type | Effect | Duration |
|------|--------|----------|
| SPEED | 1.4x movement speed | 8s |
| RAPID | 0.6x fire rate | 8s |
| SHIELD | Instant shield activation | 2s |

### Drop Limits
- Level 1: Max 1 weapon + 1 ship
- Level 2+: Max 2 weapon + 2 ship per level
- Drop chance: 4% per enemy kill

---

## Enemy System (10 Fiat Currencies)

### Tiers & Stats

| Symbol | Name | Shape | Tier | HP | Fire Pattern |
|--------|------|-------|------|-----|--------------|
| ¥ | YEN | coin | Weak | 0.8 | SINGLE |
| ₽ | RUBLE | bill | Weak | 0.8 | SINGLE |
| ₹ | RUPEE | coin | Weak | 0.9 | SINGLE |
| € | EURO | bill | Medium | 1.0 | BURST |
| £ | POUND | coin | Medium | 1.0 | SINGLE |
| ₣ | FRANC | bar | Medium | 1.1 | DOUBLE |
| ₺ | LIRA | bill | Medium | 1.2 | BURST |
| $ | DOLLAR | bill | Strong | 1.3 | DOUBLE |
| 元 | YUAN | bar | Strong | 1.4 | BURST |
| Ⓒ | CBDC | card | Strong | 1.5 | DOUBLE |

### Visual Shapes (Enemy.js)
- `coin` - Round with edge notches
- `bill` - Rectangle with corner decorations
- `bar` - 3D gold ingot
- `card` - Credit card with chip

### Row Assignment (WaveManager.js)
Each row gets ONE currency type (organized, not random).

---

## Boss: "FEDERAL RESERVE"

Size: 160x140 (double previous size)

### 3 Phases

| Phase | HP Range | Movement | Attack Pattern |
|-------|----------|----------|----------------|
| 1 | 100%-66% | Slow patrol | 5-bullet spread (green) |
| 2 | 66%-33% | Fast + oscillating | Dual spiral + aimed shots (orange) |
| 3 | 33%-0% | Figure-8 erratic | Triple spiral + side cannons + minion spawn (red) |

### HP Scaling
```javascript
boss.hp = 500 + (level * 200) + (marketCycle * 300);
```

### Visual Features
- Money printer animation (Phase 2+)
- Side cannons (Phase 2+)
- Glowing red eyes (Phase 3)
- Rotating vault dial
- Phase indicator on HP bar

### Powell Memes
During boss fight, meme ticker shows Fed/Powell quotes (faster rotation: 2.5s).

---

## Visual System

### Sky Progression (5 levels)
| Level | Sky |
|-------|-----|
| 1 | Bright blue (morning) |
| 2 | Warm afternoon |
| 3 | Sunset (orange/pink/purple) |
| 4 | Dusk (purple/dark blue) |
| 5 | Night (dark + stars) |
| Boss | Deep space + stars |

### Score Display
- 52px font with glow effects
- Pulse animation
- Bump effect on increase

### Bullet Visuals
- **Player**: Colored bullet with upward trail
- **Enemy**: Energy orb with glow + fading trail (inherits enemy color)

### Particle Effects
- `createExplosion()` - Enemy death
- `createBulletSpark()` - Bullet collision
- `createScoreParticles()` - Score fly-up

---

## Perk System

- **Trigger**: Cancel 3 enemy bullets within 1.5s window
- **Pool**: `Upgrades.js` with rarity/weight
- **Display**: Horizontal scrolling ticker at `top: 100px`
- **Selection**: Random perk auto-applied (no modal)

---

## UI Safe Zones

| Zone | Position | Content |
|------|----------|---------|
| HUD | top: 0-90px | Score, Lives, Level |
| Perk Bar | top: 100px | Scrolling perk ticker |
| Gameplay | top: 145px+ | Enemies, Boss, Bullets |

Boss `targetY: 145` ensures no overlap with HUD.

---

## Tuning Quick Reference

### Enemy Fire Pacing (main.js)
- `enemyFireTimer` - 0.35s between fire groups
- `enemyFireStride` - 4 (every 4th enemy fires)
- `MAX_ENEMY_SHOTS_PER_TICK` - 2

### Wave Patterns (WaveManager.js)
- Cycle: RECT → V_SHAPE → COLUMNS → SINE_WAVE → RECT → Boss
- Bear Market: Forces SINE_WAVE from wave 2

### Meme Sources (Constants.js)
- `MEMES.LOW` / `MEMES.HIGH` - General crypto
- `MEMES.SAYLOR` - Michael Saylor quotes
- `MEMES.POWELL` - Fed/Powell quotes (boss fight)
- `MEMES.FIAT_DEATH` - Enemy kill taunts
