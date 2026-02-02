# Changelog

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
