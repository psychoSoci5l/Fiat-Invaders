# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Workflow

### End of Session Checklist (MANDATORY)
When completing a feature or ending a session, **always update these files without being asked**:

1. **CHANGELOG.md** - Add new version entry with feature summary
2. **roadmap.md** - Mark completed tasks, add new phases if needed
3. **Constants.js** - Bump `VERSION` string (e.g., "v2.15.3 FIAT vs CRYPTO")
4. **sw.js** - Bump `SW_VERSION` to match (e.g., '2.15.3')
5. **CLAUDE.md** - Update if new systems/patterns were added

**Version Sync**: Constants.js and sw.js versions MUST match for PWA cache updates to work correctly.

This is a **priority rule** - documentation updates are part of the work, not an afterthought.

---

## Project Overview

**FIAT vs CRYPTO** is an HTML5 Canvas arcade shooter (Space Invaders-style) built with vanilla JavaScript using a global namespace pattern (`window.Game`). It's a PWA-ready mobile-first game with procedural audio, code-drawn graphics, and localization (EN/IT).

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
- `window.Game.MathUtils` - Math utilities (distance, angles, vectors, clamp)
- `window.Game.DropSystem` - Unified power-up drop management
- `window.Game.MemeEngine` - Unified meme selection & display
- `window.Game.ParticlePool` - Optimized particle pool with stack pattern
- `window.Game.ParticleSystem` - Centralized particle management (create, update, draw)
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

### Boss Types & Visuals (v2.18.0)
| Type | Symbol | Shape | Theme |
|------|--------|-------|-------|
| FEDERAL_RESERVE | $ | MEGA-BILL | Banknote with $ eyes in seal |
| BCE | € | MEGA-COIN | 3D coin with 12 orbiting EU stars |
| BOJ | ¥ | MEGA-BAR | Gold ingot with rising sun aura |

### Boss-Exclusive Patterns (BulletPatterns.js)
| Pattern | Boss | Description |
|---------|------|-------------|
| `laserBeam` | FED | Horizontal continuous beam |
| `homingMissiles` | FED | 3-5 tracking missiles |
| `rotatingBarrier` | BCE | Orbiting shield with gap |
| `delayedExplosion` | BCE | Timed bombs that expand |
| `screenWipe` | BOJ | Full-screen wall with gap |
| `zenGarden` | BOJ | Intertwined hypnotic spirals |

### Pattern Assignment by Phase
| Boss | Phase 1 | Phase 2 | Phase 3 |
|------|---------|---------|---------|
| FED | sineWave + ring | spiral + homing | laserBeam + curtain + homing |
| BCE | curtain + rotatingBarrier | spiral + delayedExplosion | rotatingBarrier x2 + stars |
| BOJ | sineWave + zenGarden | screenWipe + aimedBurst | zenGarden x4 + rapid screenWipe |

### 3 Phases (All Bosses)

| Phase | HP Range | Behavior |
|-------|----------|----------|
| 1 | 100%-66% | Slow patrol, simple patterns |
| 2 | 66%-33% | Faster, complex patterns |
| 3 | 33%-0% | Erratic, minion spawns |

### HP Scaling (Balance.BOSS.HP)
```javascript
baseHP = 1200 + (level * 25) + ((cycle - 1) * 500)
// Cycle 1: ~1350 HP, Cycle 2: ~1850 HP, Cycle 3: ~2350 HP
// + 10% per player perk
```

### Fire Rates per Phase (seconds)
| Boss | Phase 1 | Phase 2 | Phase 3 |
|------|---------|---------|---------|
| FED | 0.85 | 0.38 | 0.20 |
| BCE | 1.40 | 0.70 | 0.35 |
| BOJ | 0.75 | 0.45 | 0.18 |

### Movement Speeds per Phase
| Boss | Phase 1 | Phase 2 | Phase 3 |
|------|---------|---------|---------|
| FED | 55 | 130 | 200 |
| BCE | 35 | 55 | 90 |
| BOJ | 45 | 75 | 160 |

### Currency-Based Mini-Boss Triggers (v2.18.0)
```javascript
Balance.MINI_BOSS.CURRENCY_BOSS_MAP = {
    '$': { boss: 'FEDERAL_RESERVE', threshold: 30 },
    '€': { boss: 'BCE', threshold: 40 },
    '₣': { boss: 'BCE', threshold: 45 },
    '£': { boss: 'BCE', threshold: 45 },
    '¥': { boss: 'BOJ', threshold: 25 },
    '元': { boss: 'BOJ', threshold: 35 },
    '₽': { boss: 'RANDOM', threshold: 50 },
    '₹': { boss: 'RANDOM', threshold: 50 },
    '₺': { boss: 'RANDOM', threshold: 50 },
    'Ⓒ': { boss: 'CYCLE_BOSS', threshold: 20 }
}
```

### Boss Signature Memes
- FED: "MONEY PRINTER GO BRRRRR"
- BCE: "WHATEVER IT TAKES... AGAIN"
- BOJ: "YIELD CURVE: CONTROLLED"

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

#### Player Bullets
Weapon-specific visuals via `switch(weaponType)` in Bullet.js:
- NORMAL, WIDE, NARROW, FIRE, SPREAD, HOMING, LASER

#### Enemy Bullets (Shape-Based v2.19.0)
Enemy bullets inherit `shape` from the enemy that fires them. Dispatcher in `drawEnemyBullet()`:

| Shape | Enemies | Visual Style | Animation |
|-------|---------|--------------|-----------|
| **coin** | ¥ ₹ £ | Spinning 3D ellipse | Rotation + metallic shine |
| **bill** | ₽ € ₺ $ | Folded paper V-shape | Flutter oscillation |
| **bar** | ₣ 元 | 3D trapezoid ingot | Tumble rotation |
| **card** | Ⓒ | Digital chip rectangle | Glitch + scanlines |
| *(default)* | Boss/other | Energy orb | Pulse + glow |

All shapes maintain identical visibility (glow, trail, white ring) - only internal core differs.

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
> Note: As of v2.13.0, all firing is handled by HarmonicConductor (Fibonacci system removed).

| Parameter | Value | Description |
|-----------|-------|-------------|
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

### Balance.JUICE (Hit Stop & Visual Feedback)
Controls the "game feel" micro-effects that make impacts satisfying.

| Type | Duration | Description |
|------|----------|-------------|
| `HIT_STOP.ENEMY_KILL` | 0.025s | Micro-freeze on every kill |
| `HIT_STOP.STREAK_10/25/50` | 0.12/0.18/0.25s | Kill streak milestones |
| `HIT_STOP.BOSS_PHASE` | 0.30s | Boss phase transition |
| `HIT_STOP.BOSS_DEFEAT` | 0.50s | Epic boss death slowmo |
| `HIT_STOP.CLOSE_GRAZE` | 0.02s | Near-miss micro-freeze |
| `FLASH.*` | Various | Screen flash on events |
| `SCORE_PULSE.THRESHOLD` | 10000 | Points between edge glow |
| `FLOAT_SCORE.MIN_VALUE` | 100 | Min score for floating number |

Global functions: `window.Game.applyHitStop(type, freeze)`, `window.Game.triggerScreenFlash(type)`

### Balance.JUICE.SCREEN_EFFECTS (Modular Toggles)
Master switches for all screen-wide visual effects. Allows easy enable/disable without code changes.

| Toggle | Default | Description |
|--------|---------|-------------|
| `PLAYER_HIT_FLASH` | true | Red flash when player takes damage |
| `BOSS_DEFEAT_FLASH` | true | White flash on boss kill |
| `BOSS_PHASE_FLASH` | true | Orange flash on phase change |
| `HYPER_ACTIVATE_FLASH` | true | Gold flash when HYPER activates |
| `STREAK_FLASH` | false | Flash on kill streaks (10/25/50) |
| `GRAZE_FLASH` | false | Flash on close graze |
| `SCORE_PULSE` | false | Edge glow every 10k points |
| `SCREEN_DIMMING` | false | Darken screen with many bullets |
| `HYPER_OVERLAY` | true | Golden tint during HYPER mode |
| `SACRIFICE_OVERLAY` | true | White tint during sacrifice |
| `LIGHTNING` | true | Purple lightning (Bear Market) |
| `BEAR_VIGNETTE` | true | Red vignette (Bear Market) |

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
