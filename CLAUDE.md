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
6. **README.md** - Update if major features added (shown on GitHub homepage)

**Version Sync**: Constants.js and sw.js versions MUST match for PWA cache updates to work correctly.

**Credits**: README.md credits line: "Created by [**psychoSocial**](https://www.psychosoci5l.com/) with **Claude**, **Antigravity**, **ChatGPT**, **Gemini**."

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
8. `RunState.js` / `RankSystem.js` / `Upgrades.js` - Runtime state, dynamic difficulty, perk system
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
- `window.Game.Debug` - Debug logging system (alias: `window.dbg`)
- `window.Game.RankSystem` - Dynamic difficulty adjustment (rank -1 to +1)
- `window.Game.CampaignState` - Story Mode progression tracker (boss defeats, chapters, NG+)
- `window.Game._currentLang` - Current language ('EN' or 'IT'), used by StoryScreen

### Debug System (DebugSystem.js) - v4.11.0

Advanced debug system with logging, event tracking, statistics, performance profiling, and visual overlay.

**Console Commands (use `dbg.` shortcut):**
```javascript
// Logging Controls
dbg.enableAll()           // Enable all logging categories
dbg.disableAll()          // Disable all logging
dbg.enable('BOSS')        // Enable specific category
dbg.disable('WAVE')       // Disable specific category
dbg.status()              // Show all settings

// Event Statistics
dbg.stats()               // Show boss/wave/miniboss counters
dbg.showHistory(20)       // Show last 20 events
dbg.resetStats()          // Reset all counters
dbg.getSnapshot()         // Get current state as object

// Visual Overlay
dbg.showOverlay()         // Show on-screen debug panel
dbg.hideOverlay()         // Hide overlay
dbg.toggleOverlay()       // Toggle overlay

// Quick Presets
dbg.debugBoss()           // Enable boss debugging + overlay
dbg.debugWaves()          // Enable wave debugging + overlay
dbg.debugHUD()            // Enable HUD debugging + overlay
dbg.setProduction()       // Disable all (for release)

// HUD Monitoring (v4.1.1)
dbg.hudStatus()           // Show full HUD state snapshot in console
dbg.toggleHudMsg('KEY')   // Toggle HUD_MESSAGES flag (e.g. 'FLOATING_TEXT')

// Balance Testing (v4.10.3 — unified with perf)
dbg.balanceTest()         // Start balance test + auto-start perf profiler
dbg.report()              // Full analytics + PERFORMANCE section after game over

// Performance Profiler (v4.10.0)
dbg.perf()                // Start profiling (shows FPS overlay top-right)
dbg.perfStop()            // Stop profiling
dbg.perfReport()          // Detailed report: FPS, P50/P95/P99 frame times,
                          // jank analysis, GC spikes, update/draw breakdown,
                          // entity peaks, verdict (EXCELLENT/GREAT/GOOD/NEEDS WORK/POOR)
```

**Balance + Performance Testing Workflow:**
```javascript
// 1. Open DevTools Console (F12)
dbg.balanceTest()         // Start tracking + perf profiler (auto)

// 2. Play the game normally (FPS overlay shows top-right)

// 3. After game over:
dbg.report()              // Shows: cycle times, boss fights, deaths,
                          // grazes, HYPER, power-ups, mini-bosses,
                          // + PERFORMANCE: FPS, frame times, jank, GC spikes, verdict
```

**Performance Report Includes:**
- Avg FPS, P50/P95/P99 frame times, worst frame
- Update vs Draw time breakdown (% split)
- Jank counters: frames >16ms, >25ms, >33ms
- GC spike count (>8ms absolute threshold)
- Entity peaks: enemies, enemy bullets, player bullets, particles
- Verdict: EXCELLENT / GREAT / GOOD / NEEDS WORK / POOR

**Categories:**
| Category | Description | Default |
|----------|-------------|---------|
| `WAVE` | WaveManager state transitions | ON |
| `BOSS` | Boss spawn, damage, defeat | ON |
| `HORDE` | Horde transitions | ON |
| `MINIBOSS` | Mini-boss triggers | ON |
| `STATE` | Game state changes | ON |
| `CONDUCTOR` | HarmonicConductor events | OFF |
| `ENEMY` | Enemy spawn/death (verbose) | OFF |
| `BULLET` | Bullet collisions (very verbose) | OFF |
| `PERK` | Perk triggers | OFF |
| `DROP` | Power-up drops | OFF |

**Event Tracking (auto-logged):**
- `trackBossSpawn(type, hp, level, cycle)` - Boss spawn
- `trackBossDefeat(type, level, cycle)` - Boss killed
- `trackMiniBossSpawn(type, symbol, kills)` - Mini-boss triggered
- `trackMiniBossDefeat(type)` - Mini-boss killed
- `trackWaveStart(wave, horde, level, pattern, count)` - Wave spawned
- `trackHordeTransition(from, to, wave)` - Horde change
- `trackIntermission(level, wave)` - Intermission start
- `trackLevelUp(level, cycle)` - Level increment
- `trackCycleUp(cycle)` - Cycle increment (after boss)
- `trackConductorReset(generation)` - HarmonicConductor reset

**Visual Overlay Shows:**
- Game state (PLAY/INTERMISSION/etc.)
- Level, Cycle, Wave, Horde
- Entity counts (enemies, bullets)
- Boss status (type, HP, phase)
- MiniBoss status
- Event counters (spawns/defeats)
- HarmonicConductor state (generation, sequence, phase)
- Rank system (label, multipliers)
- HUD state: score, lives, graze meter, streak, floating texts/perk icons count
- Player state: position, shield, HYPER, weapon, special
- Intermission: countdown timer, active meme
- Message/Dialogue system activity

**Usage in code:**
```javascript
G.Debug.log('WAVE', `Spawned ${count} enemies`);
G.Debug.trackBossSpawn('FEDERAL_RESERVE', 5000, 5, 1);
```

**Production:** Call `Game.Debug.setProduction()` to disable all.

### Game States

`gameState` variable in `main.js`: `VIDEO` → `INTRO` → `HANGAR` → `STORY_SCREEN` → `PLAY` / `INTERMISSION` / `PAUSE` → `GAMEOVER`

#### Intro Sub-States (v4.8)
`introState` variable: `SPLASH` → `SELECTION`
- **SPLASH**: Title, mode selector tabs, "TAP TO START"
- **SELECTION**: Ship arrows, stats, mode badge, "LAUNCH"
- `handlePrimaryAction()`: Unified button handler for both states
- `goBackToModeSelect()`: Returns from SELECTION to SPLASH

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
| Ship | Fire Rate (cooldown) | Notes |
|------|---------------------|-------|
| BTC | 0.26s | Balanced |
| ETH | 0.40s | Tank + Smart Contract (+15% stacking dmg) |
| SOL | 0.20s | Glass cannon |

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

## Weapon Evolution System (v3.0)

Progressive weapon system replacing the old 7-weapon rotation. All config in `Balance.WEAPON_EVOLUTION`.

### Shot Levels (Permanent)
| Level | Bullets | Pattern |
|-------|---------|---------|
| 1 | 1 | Single center shot |
| 2 | 2 | Dual symmetric |
| 3 | 3 | Triple (center + sides) |

- **Upgrade trigger**: UPGRADE power-up (guaranteed every 30 kills)
- **Death penalty**: -1 level (min 1)

### Modifiers (Stackable, Temporary)
| Type | Icon | Max Level | Effect per Level | Duration |
|------|------|-----------|------------------|----------|
| RATE | ⚡ | 3 | -15%, -30%, -45% cooldown | 12s |
| POWER | 💥 | 3 | +25%, +50%, +75% damage | 12s |
| SPREAD | 🔱 | 2 | +12°, +24° spread angle | 12s |

- **Stacking**: Same modifier refreshes timer AND adds level
- **Death penalty**: -1 level per modifier (min 0)

### Specials (Exclusive, Temporary)
| Type | Icon | Effect | Duration |
|------|------|--------|----------|
| HOMING | 🎯 | Bullets track enemies | 12s |
| PIERCE | 🔥 | Bullets penetrate enemies | 12s |
| LASER | ⚡ | Continuous beam weapon | 12s |
| MISSILE | 🚀 | AoE explosive bullets | 12s |
| SHIELD | 🛡️ | Instant shield activation | 2s |
| SPEED | 💨 | 1.5x movement speed | 12s |

- **Exclusive**: New special replaces current
- **Death penalty**: Lost completely

### Player State (Player.js)
```javascript
player.shotLevel          // 1-3 (permanent)
player.modifiers.rate     // { level: 0-3, timer: 0-12 }
player.modifiers.power    // { level: 0-3, timer: 0-12 }
player.modifiers.spread   // { level: 0-2, timer: 0-12 }
player.special            // 'HOMING'|'PIERCE'|'LASER'|'MISSILE'|'SPEED'|null
player.specialTimer       // seconds remaining
```

### Debug Commands
```javascript
dbg.setShot(3)           // Set shot level 1-3
dbg.setMod('rate', 2)    // Set modifier level
dbg.setSpecial('HOMING') // Activate special
dbg.maxWeapon()          // Max all stats
dbg.weaponStatus()       // Show current state
```

### HUD Display
New weapon-status bar shows:
- Shot level indicators (▸▸▸)
- Modifier bars with timer fill
- Active special icon + countdown

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

---

## Wave System v4.0 (WaveManager.js)

15 unique waves (5 per cycle × 3 cycles) with thematic currency assignments and unique formations.

### Wave Definitions (Balance.WAVE_DEFINITIONS)

#### Cycle 1: "Awakening" (Tutorial)
| Wave | Horde 1 | Horde 2 | Formation | Theme |
|------|---------|---------|-----------|-------|
| 1 | 12 ¥₽₹ | 10 ¥₽₹ | DIAMOND | First Contact |
| 2 | 14 ¥₽€ | 12 ₹£ | ARROW | European Dawn |
| 3 | 12 €£₣ | 10 ₺€£ | PINCER | Old World |
| 4 | 14 €₣$ | 10 £₺元 | CHEVRON | Dollar Emerges |
| 5 | 16 ¥€$元 | 12 ₽£₣Ⓒ | FORTRESS | Global Alliance |

#### Cycle 2: "Conflict" (Learning)
| Wave | Horde 1 | Horde 2 | Formation | Theme |
|------|---------|---------|-----------|-------|
| 1 | 14 ¥元₹ | 12 ¥元₽ | SCATTER | Eastern Front |
| 2 | 16 €₣£ | 14 €₣₺ | SPIRAL | Brussels Burns |
| 3 | 18 $€£ | 14 $元Ⓒ | CROSS | Reserve War |
| 4 | 18 ₽₹₺$ | 16 元Ⓒ$ | WALL | BRICS Rising |
| 5 | 20 $元Ⓒ€ | 16 $元Ⓒ₣ | GAUNTLET | Final Stand |

#### Cycle 3: "Reckoning" (Skilled)
| Wave | Horde 1 | Horde 2 | Formation | Theme |
|------|---------|---------|-----------|-------|
| 1 | 18 Ⓒ€$ | 16 Ⓒ元£ | VORTEX | Digital Doom |
| 2 | 20 $元Ⓒ | 18 €£₣$ | FLANKING | Pincer Attack |
| 3 | 22 all | 18 all-rev | STAIRCASE | Escalation |
| 4 | 22 all | 20 $元Ⓒ | HURRICANE | Eye of Storm |
| 5 | 24 mix | 20 Ⓒ-swarm | FINAL_FORM | Endgame |

### 16 Formations
```
DIAMOND    ARROW     PINCER    CHEVRON    FORTRESS
    *         *      * * * *   *     *    * * * * *
   * *       * *       * *      *   *     *       *
  *   *     * * *       *        * *      *   *   *
   * *     *     *      *         *       *       *
    *                                     * * * * *

SCATTER    SPIRAL    CROSS     WALL       GAUNTLET
 *   *   *    * *       *      * * * * *   * *   * *
*       *   *   *       *      * * * * *   * *   * *
    *   *   * * *   * * * * *  * * * * *   * *   * *
*     *     * * *       *
  *       *             *

VORTEX     FLANKING  STAIRCASE HURRICANE  FINAL_FORM
   * *     * *   * *  *         *   *   *   * * * * *
 *     *     *   *    * *         *   *     *   *   *
*       *            * * *      *   *   *   * * * * *
 *     *             * * * *      *   *     *   *   *
   * *               * * * * *  *   *   *   * * * * *
```

### Horde Modifiers
| Aspect | Horde 1 | Horde 2 |
|--------|---------|---------|
| Behavior bonus | 0% | +20% shield/teleport |
| Fire rate mult | 1.0x | 1.15x |
| Entry style | stagger | rapid (0.5x delay) |

### Currency Themes
```javascript
ASIAN_BLOC: ['¥', '元', '₹']
EURO_BLOC: ['€', '£', '₣']
EMERGING: ['₽', '₹', '₺']
DOLLAR_ALLIES: ['$', '€', '£']
BRICS: ['₽', '₹', '元']
DIGITAL_THREAT: ['Ⓒ', '$', '元']
```

### Bear Market
- `+25%` enemy count in all waves
- Forces `$` and `元` into weak-only waves

### Helper Functions
```javascript
Balance.getWaveDefinition(cycle, waveInCycle)  // Get wave config
Balance.getCurrencyBySymbol(symbol)            // Get FIAT_TYPE by symbol
Balance.getHordeModifiers(hordeNumber)         // Get horde 1/2 modifiers
```

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
- 36px font, compact single-row HUD (v4.4.0: was 52px)
- Reactive: streak colors, HYPER glow, danger pulse
- No labels (score value only)

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

### Particle Effects (v4.5.0: Game Feel Overhaul)
- `createBulletSpark(x, y, color, opts)` - Contextual impact spark (color, shotLevel, kill/HYPER rings)
- `createEnemyDeathExplosion(x, y, color, symbol, shape)` - Tier-differentiated death (WEAK/MEDIUM/STRONG)
- `createMuzzleFlashParticles(x, y, color, opts)` - Scaled by shotLevel/modifiers
- `createExplosion()` - Base explosion (used by tiered deaths)
- `createScoreParticles()` - Score fly-up
- MAX_PARTICLES: 180 (was 120)

### VFX System (v4.5.0 — Balance.VFX)

All visual feedback configurable via `Balance.VFX`:

| System | Key Properties | Location |
|--------|---------------|----------|
| **Enemy Hit Reaction** | HIT_FLASH_DURATION, HIT_SHAKE_INTENSITY, DAMAGE_TINT_START, SMOKE_HP_THRESHOLD | Enemy.js |
| **Bullet Impact Spark** | SPARK_COUNT_BASE/PER_LEVEL, SPARK_POWER_SCALE, SPARK_KILL_RING, SPARK_HYPER_RING | ParticleSystem.js |
| **Muzzle Flash** | MUZZLE_SCALE_PER_LEVEL, MUZZLE_POWER_SCALE, MUZZLE_RATE_SCALE, MUZZLE_RING_AT_LEVEL | Player.js |
| **Tiered Explosions** | EXPLOSION_WEAK/MEDIUM/STRONG (particles, ringCount, duration, debrisCount) | ParticleSystem.js |
| **Trail Enhancement** | TRAIL_POWER_GLOW, TRAIL_HYPER_SPARKLE | Bullet.js draw() |
| **Screen Juice** | MULTI_KILL_WINDOW, STRONG_KILL_SHAKE, HYPER_AMBIENT_INTERVAL, COMBO_SCORE_SCALE | main.js |

Enemy `maxHp` tracked for damage tint. Bullet `_isHyper` flag set during HYPER mode.

---

## Perk System

- **Trigger**: Cancel 5 enemy bullets within 1.5s window (Balance.PERK.BULLET_CANCEL_COUNT)
- **Pool**: `Upgrades.js` with rarity/weight
- **Display**: Temporary canvas notification above player (SHIP_STATUS channel)
- **Selection**: Random perk auto-applied (no modal)
- **Cooldown**: 4s between perks (Balance.PERK.COOLDOWN_TIME)

---

## GODCHAIN MODE (v4.6.0)

Ultimate reward state when ALL weapon modifiers are maxed simultaneously.

### Trigger Conditions (v4.6.1: lowered from 3/3/2)
- `shotLevel === 3` (permanent, no timer)
- `modifiers.rate.level >= 2` AND `timer > 0` (configurable via `Balance.GODCHAIN.REQUIREMENTS.RATE`)
- `modifiers.power.level >= 2` AND `timer > 0` (configurable via `Balance.GODCHAIN.REQUIREMENTS.POWER`)
- `modifiers.spread.level >= 1` AND `timer > 0` (configurable via `Balance.GODCHAIN.REQUIREMENTS.SPREAD`)
- Special is NOT required

Deactivates when ANY modifier timer expires or player dies.

### Effects
| Effect | Description |
|--------|-------------|
| Red ship | Deep red color palette override (Balance.GODCHAIN.SHIP_COLORS) |
| Red aura | Pulsing orange-red glow around ship |
| Fire trail | 3 flickering fire tongues on all bullets (`_isGodchain` flag) |
| Speed boost | +5% movement speed (Balance.GODCHAIN.SPEED_BONUS) |
| Sound | Ascending power chord on activation |
| Events | `GODCHAIN_ACTIVATED` / `GODCHAIN_DEACTIVATED` |
| HUD | "GODCHAIN MODE" / "GODCHAIN LOST" via showPowerUp |

### Config: `Balance.GODCHAIN`
```javascript
GODCHAIN: {
    REQUIREMENTS: { RATE: 2, POWER: 2, SPREAD: 1 },  // v4.6.1
    SPEED_BONUS: 1.05,
    SHIP_COLORS: { BODY, BODY_DARK, BODY_LIGHT, NOSE, ... },
    AURA: { INNER_RADIUS, OUTER_RADIUS, ALPHA, PULSE_SPEED },
    FIRE_TRAIL: { TONGUE_COUNT, LENGTH, ALPHA, COLORS }
}
```

### Debug
```javascript
dbg.godchain()       // Force GODCHAIN ON
dbg.godchainStatus() // Show modifier levels/timers
```

---

## Meme System (v4.6.0 — Dedup + Dedicated Pools)

### Meme Pools (Constants.js)
| Pool | Context | Count | Description |
|------|---------|-------|-------------|
| `INTERMISSION` | Countdown spotlight | ~20 | Curated best-of, shown during 3-2-1 |
| `LOW` | Whisper channel | ~32 | Ambient flavor text |
| `HIGH` | Power-up/streak | ~11 | Celebration memes |
| `SAYLOR` | Random/general | ~42 | Michael Saylor quotes |
| `POWELL` | FED boss fight | ~26 | Fed/Powell memes |
| `BCE` | BCE boss fight | ~14 | ECB memes |
| `BOJ` | BOJ boss fight | ~14 | Bank of Japan memes |
| `FIAT_DEATH` | Enemy kill | ~15 | Fiat death taunts |
| `STREAK` | Kill streaks | ~13 | Streak celebrations |
| `BOSS` | Boss generic | ~10 | Generic boss memes |

### Deduplication (MemeEngine.js)
- `_recentMemes`: Map of `{ context: string[] }` tracking last 8 picks per context
- `_pickDeduplicated(pool, context, count)`: Filters recent, picks random, auto-resets when exhausted
- `getIntermissionMeme()`: Picks from INTERMISSION pool with dedup
- `getWhisperMeme()`: Picks from LOW pool with dedup

---

## UI Safe Zones (v4.4.0)

| Zone | Position | Content |
|------|----------|---------|
| HUD | top: 0-45px (+safe) | Score, Lives, Level (single row) |
| Perk notification | top: ~55px | Temporary canvas slide (2.5s) |
| Gameplay | top: 65px+ (+safe) | Enemies, Boss, Bullets |
| Wave Strip | Y=95 | Temporary full-width strip (2.5s) |
| Meme Whisper | Y=60% | Small italic drift text (decorative) |
| Graze Meter | bottom-85 | DOM, unchanged |
| Shield/HYPER | bottom-75 | DOM buttons, unchanged |
| Joystick | bottom-30 | DOM, unchanged |

Boss `targetY: 65 + safeOffset` ensures no overlap with compact HUD.

---

## HUD Messages System (v4.4.0)

5 canvas-based channels with clear visual separation:

| Channel | Style | Position | Purpose |
|---------|-------|----------|---------|
| `WAVE_STRIP` | Transparent strip, white/gold text | Y=95, full-width | Wave/horde progression |
| `ALERT` | Red (danger) / Gold (victory) box | Center screen | Boss warnings, defeats |
| `MEME_WHISPER` | Italic 13px, alpha 0.45, no bg | Y=60%, random X | Decorative flavor text |
| `SHIP_STATUS` | Text above player, float-up | Above player Y-60 | Perk acquired, weapon change |
| `FLOATING_TEXT` | Small text at position | At position | Score numbers (opt-in) |

### Design Principle
- **Game messages** = solid text, centered, with background strip = "must read"
- **Memes** = italic, no background, low opacity, small = "decorative flavor, ignorable"

### Usage
```javascript
G.MessageSystem.showWaveStrip('CYCLE 1 • WAVE 3/5', 'Volatility');
G.MessageSystem.showDanger('BOSS INCOMING!', 5);
G.MessageSystem.showVictory('BOSS DESTROYED!');
G.MessageSystem.showMemeWhisper('MONEY PRINTER GO BRRR');
G.MessageSystem.showShipStatus('HOMING ACQUIRED', '🎯');
```

### Legacy Compat
- `showGameInfo()` → `showWaveStrip()`
- `showMemeFun()` / `showMemePopup()` → `showMemeWhisper()`
- `showPowerUp()` → `showShipStatus()`

### Balance.HUD_MESSAGES
```javascript
HUD_MESSAGES: {
    WAVE_STRIP: true,
    ALERT_DANGER: true,
    ALERT_VICTORY: true,
    MEME_WHISPER: true,
    SHIP_STATUS: true,
    FLOATING_TEXT: false,  // opt-in
    WAVE_STRIP_CONFIG: {
        Y: 95, HEIGHT: 28, FONT_SIZE: 14,
        SUBTITLE_SIZE: 10, DURATION: 2.5, BG_ALPHA: 0.5
    },
    MEME_WHISPER_CONFIG: {
        MAX_ON_SCREEN: 2, FONT_SIZE: 13, ALPHA: 0.45,
        DRIFT_SPEED: 15, LIFETIME: 3.0, SPAWN_Y_RATIO: 0.60
    }
}
```

---

## Diegetic Ship HUD (v4.4.0)

Visual indicators drawn on the player ship (Player.js `_drawDiegeticHUD()`):

| Element | Position | Description |
|---------|----------|-------------|
| Life pips | Y+28 below ship | 3 circles (white=alive, grey=lost, red pulse at lives≤1) |
| Shield ring | Around ship | Partial cyan arc showing cooldown progress |
| Weapon pips | Y-38 above ship | 3 triangles showing shot level + modifier glow |
| Special icon | Above ship | Replaces pips when special active, with countdown arc |
| Graze glow | Around ship | Pink radial at 75%+, gold pulsing at 100% |

All toggleable via `Balance.DIEGETIC_HUD`.

---

## Reactive HUD (v4.4.0)

HUD elements react to game state:

| Behavior | Trigger | Effect |
|----------|---------|--------|
| Score streak color | Kill streak 10/25/50 | Green/yellow/red CSS class (0.5s) |
| HYPER score glow | HYPER mode active | Gold text-shadow on score |
| Lives danger | lives ≤ 1 | Red pulse CSS + life pips pulse |
| Low-HP vignette | lives ≤ threshold | Subtle red edge vignette (alpha 0.05) |
| Graze approaching | 80-99% meter | Faster shimmer on graze bar |
| Wave sweep | Wave/horde change | 1px white horizontal line sweeps down |

All toggleable via `Balance.REACTIVE_HUD`.

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
| `CLOSE_RADIUS` | 18 | Close graze for 4x bonus |
| `PERK_THRESHOLD` | 50 | Graze count for bonus perk |
| `DECAY_RATE` | 2 | Meter decay per second (v2.24.11) |
| `DECAY_DELAY` | 1.0 | Seconds before decay starts |
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
| `STREAK_FLASH` | true | Flash on kill streaks (10/25/50) |
| `GRAZE_FLASH` | false | Flash on close graze |
| `SCORE_PULSE` | true | Edge glow every 10k points |
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

### Balance.FORMATION_ENTRY
| Parameter | Value | Description |
|-----------|-------|-------------|
| `ENABLED` | true | Enable formation entry animation |
| `ENTRY_SPEED` | 600 | Pixels per second during entry |
| `STAGGER_DELAY` | 0.04 | Seconds between each enemy starting |
| `SPAWN_Y_OFFSET` | -80 | Y position above screen for spawn |
| `SETTLE_TIME` | 0.3 | Seconds to settle after reaching position |
| `CURVE_INTENSITY` | 0.15 | How much enemies curve during entry |

### Balance.FORMATION
| Parameter | Value | Description |
|-----------|-------|-------------|
| `SPACING` | 85 | Pixels between formation grid points |
| `START_Y` | 80 | Starting Y position for formations (v4.4.0: was 150) |
| `MARGIN` | 60 | Screen edge margin for formations |
| `ROW_TOLERANCE` | 25 | Y tolerance for grouping positions into rows |
| `SAFE_EDGE_MARGIN` | 30 | Min X margin from screen edge (> 20px edge-detect threshold) |

### Balance.RANK (Dynamic Difficulty v4.1.0)
| Parameter | Value | Description |
|-----------|-------|-------------|
| `ENABLED` | true | Enable/disable rank system |
| `WINDOW_SIZE` | 30 | Seconds of rolling performance window |
| `FIRE_RATE_RANGE` | 0.20 | Fire rate adjustment range (0.8x to 1.2x) |
| `ENEMY_COUNT_RANGE` | 0.15 | Enemy count adjustment range (0.85x to 1.15x) |
| `DEATH_PENALTY` | 0.15 | Rank decrease on death |
| `CONVERGENCE_SPEED` | 0.5 | How fast rank converges to target |

### Balance.ETH_BONUS (Smart Contract v4.0.2)
| Parameter | Value | Description |
|-----------|-------|-------------|
| `STACK_WINDOW` | 0.5 | Seconds window for consecutive hits |
| `DAMAGE_BONUS` | 0.15 | +15% damage per stack |

### Balance.BOSS.BOJ_INTERVENTION (v4.0.2)
| Parameter | Value | Description |
|-----------|-------|-------------|
| `TELEGRAPH` | 0.4 | Seconds of visual warning |
| `COOLDOWN` | 2.5 | Seconds between interventions |
| `COUNT` | 5 | Bullets per intervention |
| `SPEED` | 240 | Bullet speed |
| `SPREAD` | 0.4 | Spread angle |

### Wave Patterns (WaveManager.js)
- 15 unique waves (5 per cycle x 3 cycles) with thematic currency assignments
- 16 formation types: DIAMOND, ARROW, PINCER, CHEVRON, FORTRESS, SCATTER, SPIRAL, CROSS, WALL, GAUNTLET, VORTEX, FLANKING, STAIRCASE, HURRICANE, FINAL_FORM
- H1/H2 use complementary formations (e.g., DIAMOND↔PINCER, ARROW↔CHEVRON)
- Legacy fallback for cycles 4+ via `spawnWaveLegacy()`
- Bear Market: +25% enemy count, forces strong currencies in weak waves
- Cycle scaling (v4.6.1): `CYCLE_COUNT_MULT: [1.0, 1.25, 1.5]` — more enemies in later cycles

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
| `rgba(r, g, b, alpha)` | **v4.11.0** Cached rgba string (alpha discretized to 0.05 steps, 21 values per color). Zero allocation after first call. |
| `font(weight, size, family)` | **v4.11.0** Cached font string (keyed by weight + floor(size) + family). Zero allocation after first call. |
| `parseHex(hex)` | Parse hex to `{r, g, b}` object (cached) |

**Performance Note**: Use `rgba()` and `font()` in all per-frame draw code instead of template literals to avoid GC pressure. 20 most-used colors are pre-cached at module load.
