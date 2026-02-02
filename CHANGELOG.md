# Changelog

## v2.10.0 - 2026-02-02
### Interactive Player Manual

**New Feature: In-Game Manual**
- Full player manual accessible from intro screen and pause menu
- 6 tabs: Welcome, Controls, Power-Ups, Enemies, Bosses, Pro Tips
- Arcade/crypto visual style with Bitcoin gold accents
- Bilingual support (EN/IT) with real-time language switching
- Responsive design for mobile screens

**Manual Content**
- Welcome: Game loop, win/lose conditions, Bear Market mode
- Controls: PC keyboard + Mobile touch tables
- Power-Ups: 7 weapon types + 3 ship boosts with icons
- Enemies: 10 fiat currencies organized by tier (Weak/Medium/Strong)
- Bosses: FED, ECB, BOJ with 3-phase system explained
- Pro Tips: HODL mode, Grazing, Shield tactics, Boss drops

**UI Changes**
- New book icon button in intro screen (alongside mute/settings)
- New MANUAL button in pause menu
- ~80 new localization keys for EN and IT

---

## v2.9.2 - 2026-02-02
### Bug Fixes & Game Cycle Rationalization

**Crash Fixes**
- Added null safety checks to all entity iteration loops (enemies, bullets, powerUps)
- Prevents crashes when arrays are modified during iteration (e.g., post-boss transition)

**Mini-Boss System Fix**
- Mini-boss now properly freezes wave spawning (`miniBossActive` flag)
- Enemies saved before mini-boss, restored after defeat
- Fibonacci firing reset when enemies restored (prevents instant full-rate fire)
- Global references (`G.enemies`, `window.Game.enemies`) updated correctly

**Game Cycle Rationalization**
- Level increments once per wave completed (removed duplicate increment on boss defeat)
- `window.currentLevel` updated before `spawnWave()` for correct enemy HP scaling
- Clear progression: 5 waves → boss → cycle++ → repeat

**Story System Verified**
- All dialogue triggers working (ship select, level complete, boss intro/phase/defeat, game over)
- DialogueUI with typewriter effect and speaker colors
- Full dialogue data for 3 ships, 5 levels, 3 bosses

---

## v2.9.1 - 2026-02-02
### Intro Screen Redesign

**Unified Two-Phase Intro**
- Single screen with element show/hide (no page jump)
- Splash state: Title + BTC ship + TAP TO START
- Selection state: Ship arrows + stats + mode toggle + LAUNCH
- Smooth transition - ship stays in place while UI elements fade in/out

**Ship Preview**
- Detailed cell-shaded rendering (matches in-game ship)
- 4-layer animated reactor flames
- Two-tone body with shadow/highlight
- Fins, cockpit, and crypto symbol

**UI Polish**
- TAP TO START button with shine sweep effect and pulse animation
- Yellow cell-shaded icon buttons restored (mute/settings)
- Staggered fade animations for selection elements
- Responsive font sizes with clamp()

---

## v2.9.0 - 2026-02-02
### Phase 20: Gameplay Redesign (Complete)

**Difficulty System**
- Stepped difficulty progression per cycle (0.0 → 0.30 → 0.60)
- Bear Market now additive bonus (+0.25) instead of multiplier
- 5 waves per cycle, 3 cycles = complete run (~12 min)

**Scoring System**
- Kill streak multiplier (+10%/kill, max 2x, 2s timeout)
- Graze-kill synergy (+50% bonus for kills during high graze)
- Grazing as primary score source (25 base points, 3x close bonus)

**Boss System (Centralized in Balance.BOSS)**
- HP formula: 1000 + level*30 + cycle*400 (+12% per player perk)
- Fire rates per phase per boss type
- Movement speeds per phase per boss type
- Minion spawn rates configurable

**Power-Up System**
- Differentiated durations: base 10s, advanced 8s, elite 6s
- Drop rate scaling with cycle progression
- Pity timer decreases with cycle

**HUD Messages Redesign**
- GAME_INFO: Green box at top (level/wave progression)
- DANGER: Red pulsing center (boss warnings)
- VICTORY: Gold glow center (boss defeated)
- Each type independent, visually distinct at a glance

**Level Progression**
- WaveManager uses Balance.WAVES.PER_CYCLE
- Added WAVE4 ("CORRECTION") and WAVE5 ("CLIMAX") messages
- Perk system values centralized (CANCEL_WINDOW, PERK_ICON_LIFETIME)

**UI Improvements**
- Compact intro screen ship preview (canvas 200→140, container 290→190px)
- Smaller ship selection arrows

---

## v2.8.2 - 2026-02-02
### New Modules (System Consolidation)
- **DropSystem.js**: Unified power-up drop management
  - Enemy kill drops (tier-based chances)
  - Boss hit drops (periodic power-ups)
  - Pity timer system (guaranteed drop after N kills)
  - Weapon vs Ship selection logic
  - Singleton: `window.Game.DropSystem`

- **MemeEngine.js**: Unified meme selection & display
  - Random meme selection (general, Saylor, boss-specific)
  - Enemy death memes, streak milestone memes
  - Power-up feedback memes (all weapon/ship types)
  - Popup queue management with priority system
  - Singleton: `window.Game.MemeEngine`

### BalanceConfig Extensions
- **Extended sections**: DROPS (ship types), BOSS (phases), SCORE, MEMES, TIMING, EFFECTS, UI, HITBOX, POWERUPS, WAVES
- **New helper functions**:
  - `getShakeIntensity(event)` - Screen shake values
  - `getGrazeMultiplier(grazeMeter)` - Score multiplier
  - `getStreakMilestone(streak)` - Kill streak rewards
  - `getRandomLightningInterval()` - Ambient effect timing
  - `getBossPhase(hpPercent)` - Phase detection
  - `getBossPhaseSpeed(bossType, phase)` - Movement speeds

### main.js Migration
- Meme functions now delegate to MemeEngine
- Drop logic now delegates to DropSystem
- All timing values now use Balance.TIMING.*
- All effect intensities now use Balance.EFFECTS.*
- HODL damage multipliers now use Balance.SCORE.HODL_MULT_*
- Removed all redundant drop/meme variables

### Code Cleanup
- Removed all external style references from comments (replaced with technical terms)
- Removed historical "was X" value comments from code
- Standardized visual style terminology to "cell-shaded"
- Renamed `BULLET_HELL_COLORS` to `PROJECTILE_COLORS` (with backwards-compatible alias)
- Cleaned up commented-out code and obsolete notes
- Fixed touch controls flash bug with opacity-based transition

---

## v2.8.1 - 2026-02-02
### Code Maintenance & Refactoring
- **BalanceConfig.js**: New centralized balance configuration module
  - Single source of truth for all gameplay tuning parameters
  - Eliminates duplicate formulas across files (prevents regression bugs)
  - Helper functions: `calculateDifficulty()`, `calculateGridSpeed()`, `calculateEnemyHP()`, `calculateBulletSpeed()`
  - All constants now accessible via `window.Game.Balance.*`

- **ColorUtils.js**: New consolidated color utilities module
  - Replaced 6 duplicate implementations across entity files
  - Functions: `darken()`, `lighten()`, `lightenPercent()`, `hexToRgb()`, `hexToRgba()`, `withAlpha()`
  - Accessible via `window.Game.ColorUtils.*`

### Dead Code Removal
- Removed unused variables: `displayScore`, `timeScale`, `currentMeme`
- Removed 25 lines of unreachable code in `renderPerkBar()`

### Files Refactored
- `main.js` - All balance constants now reference Balance.*
- `WaveManager.js` - Uses Balance.calculateEnemyHP()
- `Player.js` - Physics uses Balance.PLAYER.*
- `Enemy.js` - Kamikaze speed uses Balance.ENEMY_BEHAVIOR.*
- Entity files (Enemy, Boss, Player, PowerUp, Bullet) - Color methods use ColorUtils

### Documentation
- Updated CLAUDE.md with Balance and ColorUtils references
- Added complete parameter tables for all Balance sections

---

## v2.8.0 - 2026-02-01
### Balance Overhaul
- **Boss HP drastically reduced**: 5500 → 2000 base HP (-64%)
- **Boss fire rate slowed**: Phase 2/3 fire timers doubled for fairer fights
- **Boss fights now ~5-8 seconds** instead of 15+ seconds
- Mini-boss threshold: 100 → 30 kills (actually spawns now)
- Perk cooldown: 8s → 4s (more perks per wave)
- Graze threshold: 120 → 60 (achievable)
- Weapon drop cooldown: 8s → 5s

### HarmonicConductor Cleanup
- Removed bullet-hell patterns (spiral, curtain, flower) from normal waves
- Normal waves now use enemy-based firing only (SYNC_FIRE, SWEEP, CASCADE)
- Bullet-hell patterns reserved exclusively for boss fights
- Clearer distinction between regular enemies and boss attacks

### Bug Fixes
- Fixed duplicate boss phase handler (dialogues triggered twice)
- Fixed teleport enemies going off-screen (added bounds clamping)
- Fixed ship stats layout shifting after launch animation (CSS order)

### Performance
- Implemented particle object pool (100 pre-allocated) to reduce GC churn

---

## v2.7.1 - 2026-02-01
### Bug Fixes
- Fixed intro screen layout shift when changing ships or game modes
- "DESTROY THE SYSTEM" button now stays fixed in position
- Removed spurious files (nul, styles.css) causing potential rendering issues

### Technical
- Added fixed heights to ship selector (290px), ship preview (280px), score area (85px), mode selector (44px)
- Added flex-shrink: 0 to prevent container compression
- Improved ship arrow alignment with margin-top positioning

---

## v2.7.0 - 2026-01-30
### Gameplay
- 5 waves before boss (cycle repeats).
- Enemy fire staggered in groups (no full volleys).
- Player bullets cancel enemy bullets.
- Perk modal removed; random perk after 3 canceled bullets in a row (1.5s window).

### Visuals
- Switched to code-drawn player, enemies, boss, and power-ups.

### HUD
- Score display forced to integer (no decimals).

### Assets
- Sprite loading kept but unused for gameplay sprites.
