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
2. `ColorUtils.js` - Consolidated color manipulation utilities
3. `BalanceConfig.js` - **Single source of truth for all balancing parameters**
4. `BulletPatterns.js` - Bullet pattern definitions
5. `DropSystem.js` - **Unified power-up drop management**
6. `MemeEngine.js` - **Unified meme selection & display**
7. `EventBus.js` - Pub/sub event system
8. `RunState.js` / `Upgrades.js` - Runtime state and perk system
9. `AudioSystem.js` - Procedural Web Audio synth (no audio files)
10. `InputSystem.js` - Keyboard + touch/joystick input
11. `ObjectPool.js` - GC prevention for bullets
12. Entity classes: `Entity.js` → `Bullet.js` → `Player.js` → `Enemy.js` → `Boss.js` → `PowerUp.js`
13. `WaveManager.js` - Wave spawning and progression
14. `main.js` - Game loop, state machine, collision, rendering

### Key Globals

- `window.Game` - Main namespace containing all classes and singletons
- `window.Game.Audio` - AudioSystem singleton
- `window.Game.Input` - InputSystem singleton
- `window.Game.Events` - EventBus singleton
- `window.Game.RunState` - Per-run state (perks, modifiers)
- `window.Game.Bullet.Pool` - Object pool for bullets
- `window.Game.Balance` - Centralized balancing configuration
- `window.Game.ColorUtils` - Color manipulation utilities
- `window.Game.DropSystem` - Unified power-up drop management
- `window.Game.MemeEngine` - Unified meme selection & display
- `window.isBearMarket` - Hard mode flag (checked by WaveManager)
- `window.marketCycle` - Current difficulty cycle (increases after boss)
- `window.currentLevel` - Current level (for WaveManager)

### Game States

`gameState` variable in `main.js`: `VIDEO` → `INTRO` → `HANGAR` → `PLAY` / `INTERMISSION` / `PAUSE` → `GAMEOVER`

### Entity Inheritance

All game objects extend `window.Game.Entity` (base class with x, y, vx, vy, update, draw).

---

## Difficulty System

All balancing is centralized in `src/config/BalanceConfig.js` via `window.Game.Balance`.

### Difficulty Scaling (Balance.DIFFICULTY)

| Parameter | Value | Description |
|-----------|-------|-------------|
| `LEVEL_SCALE` | 0.08 | +8% per level |
| `CYCLE_SCALE` | 0.20 | +20% per boss cycle |
| `MAX_DIFFICULTY` | 0.85 | Cap at 85% |
| `BEAR_MARKET_MULT` | 1.3 | Bear Market multiplier |

### Applied Parameters

| Parameter | Formula | Range |
|-----------|---------|-------|
| `gridSpeed` | `12 + diff * 20` | 12 → 32 |
| `bulletSpeed` | `128 + diff * 68` | 128 → 196 |
| `rateMult` | `0.5 + diff * 0.5` | 0.5 → 1.0 |
| `enemyHP` | `10 + floor(diff * 15)` | 10 → 25 |

Bear Market applies additional 1.3x multiplier.

### Player Fire Rates (after 30% nerf)
| Ship | Fire Rate (cooldown) |
|------|---------------------|
| BTC | 0.26s |
| ETH | 0.57s |
| SOL | 0.20s |

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

## Boss System (3 Boss Types)

All boss parameters are in `Balance.BOSS`. Size: 160x140.

### Boss Types
| Type | Symbol | Movement Style | Theme |
|------|--------|----------------|-------|
| FEDERAL_RESERVE | $ | Aggressive | Money printer |
| BCE | € | Bureaucratic | EU tower |
| BOJ | ¥ | Zen precision | Rising sun |

### 3 Phases (All Bosses)

| Phase | HP Range | Behavior |
|-------|----------|----------|
| 1 | 100%-66% | Slow patrol, simple patterns |
| 2 | 66%-33% | Faster, complex patterns |
| 3 | 33%-0% | Erratic, minion spawns |

### HP Scaling (Balance.BOSS.HP)
```javascript
baseHP = 1000 + (level * 30) + ((cycle - 1) * 400)
// Cycle 1: ~1150 HP, Cycle 2: ~1700 HP, Cycle 3: ~2250 HP
// + 12% per player perk
```

### Fire Rates per Phase (seconds)
| Boss | Phase 1 | Phase 2 | Phase 3 |
|------|---------|---------|---------|
| FED | 0.9 | 0.4 | 0.22 |
| BCE | 1.3 | 0.65 | 0.3 |
| BOJ | 0.8 | 0.5 | 0.22 |

### Movement Speeds per Phase
| Boss | Phase 1 | Phase 2 | Phase 3 |
|------|---------|---------|---------|
| FED | 60 | 120 | 180 |
| BCE | 40 | 60 | 100 |
| BOJ | 50 | 80 | 150 |

### Visual Features
- Phase-specific colors and effects
- Side cannons (Phase 2+)
- Glowing red eyes (Phase 3)
- Phase indicator on HP bar

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

- **Trigger**: Cancel 5 enemy bullets within 1.5s window (Balance.PERK.BULLET_CANCEL_COUNT)
- **Pool**: `Upgrades.js` with rarity/weight
- **Display**: Horizontal scrolling ticker at `top: 100px`
- **Selection**: Random perk auto-applied (no modal)
- **Cooldown**: 4s between perks (Balance.PERK.COOLDOWN_TIME)

---

## UI Safe Zones

| Zone | Position | Content |
|------|----------|---------|
| HUD | top: 0-90px | Score, Lives, Level |
| Perk Bar | top: 100px | Scrolling perk ticker |
| Gameplay | top: 145px+ | Enemies, Boss, Bullets |

Boss `targetY: 145` ensures no overlap with HUD.

---

## HUD Messages System

Messages have distinct visual styles for quick recognition during gameplay:

| Type | Style | Position | Purpose |
|------|-------|----------|---------|
| `GAME_INFO` | Green box, border | Top (Y=130) | Level/Wave progression |
| `DANGER` | Red pulsing, thick border | Center | Boss warnings, alerts |
| `VICTORY` | Gold glow, scaling | Center | Boss defeated, achievements |
| `PERK_NOTIFICATION` | Floating icon | Above player | Perk acquired |
| `FLOATING_TEXT` | Small text | At position | Score numbers (optional) |
| `MEME_POPUP` | Random color/position | Random | Meme text (optional) |

### Balance.HUD_MESSAGES
Toggle each type independently in BalanceConfig.js:
```javascript
HUD_MESSAGES: {
    GAME_INFO: true,        // Essential progression feedback
    DANGER: true,           // Warnings require attention
    VICTORY: true,          // Satisfying boss kill feedback
    PERK_NOTIFICATION: true,// Know what perk you got
    FLOATING_TEXT: false,   // Can clutter screen
    MEME_POPUP: false,      // Can distract
    MEME_TICKER: false      // Boss fight ticker
}
```

---

## Tuning Quick Reference

All tuning parameters are in `src/config/BalanceConfig.js`. **Always modify Balance config, not individual files.**

### Balance.ENEMY_FIRE
| Parameter | Value | Description |
|-----------|-------|-------------|
| `STRIDE` | 8 | Every Nth enemy fires per group |
| `MAX_SHOTS_PER_TICK` | 1 | Max bullets spawned per frame |
| `FIBONACCI_INTERVAL` | 0.40 | Seconds between ramp-up steps |
| `BULLET_SPEED_BASE` | 128 | Base bullet speed |
| `BULLET_SPEED_SCALE` | 68 | Additional speed at max difficulty |

### Balance.GRAZE
| Parameter | Value | Description |
|-----------|-------|-------------|
| `RADIUS` | 25 | Pixels for graze detection |
| `CLOSE_RADIUS` | 15 | Close graze for 2x bonus |
| `PERK_THRESHOLD` | 60 | Graze count for bonus perk |
| `DECAY_RATE` | 5 | Meter decay per second |
| `MAX_PERKS_PER_LEVEL` | 2 | Cap graze perks per level |

### Balance.DROPS
| Parameter | Value | Description |
|-----------|-------|-------------|
| `WEAPON_COOLDOWN` | 5.0 | Min seconds between weapon drops |
| `PITY_TIMER_KILLS` | 30 | Guaranteed drop after N kills |
| `CHANCE_STRONG` | 0.06 | 6% for $, 元, Ⓒ |
| `CHANCE_MEDIUM` | 0.04 | 4% for €, £, ₣, ₺ |
| `CHANCE_WEAK` | 0.02 | 2% for ¥, ₽, ₹ |

### Balance.PLAYER
| Parameter | Value | Description |
|-----------|-------|-------------|
| `ACCELERATION` | 2500 | Keyboard acceleration |
| `FRICTION` | 0.92 | Velocity decay |

### Wave Patterns (WaveManager.js)
- Cycle: RECT → V_SHAPE → COLUMNS → SINE_WAVE → RECT → Boss
- Bear Market: Forces SINE_WAVE from wave 2

### Meme Sources (Constants.js)
- `MEMES.LOW` / `MEMES.HIGH` - General crypto
- `MEMES.SAYLOR` - Michael Saylor quotes
- `MEMES.POWELL` - Fed/Powell quotes (boss fight)
- `MEMES.FIAT_DEATH` - Enemy kill taunts

---

## ColorUtils Module

Consolidated color manipulation in `src/utils/ColorUtils.js` via `window.Game.ColorUtils`:

| Function | Description |
|----------|-------------|
| `darken(color, amount)` | Darken color by 0-1 |
| `lighten(color, amount)` | Lighten color by 0-1 |
| `lightenPercent(hex, percent)` | Lighten hex by 0-100% (returns hex) |
| `hexToRgb(hex)` | Convert hex to "r,g,b" string |
| `hexToRgba(hex, alpha)` | Convert hex to rgba() string |
| `withAlpha(color, alpha)` | Add alpha to any color format |
