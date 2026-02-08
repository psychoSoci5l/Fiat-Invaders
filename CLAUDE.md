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
7. **PROJECT_SNAPSHOT.md** - Update with any new systems/patterns added

**Version Sync**: Constants.js and sw.js versions MUST match for PWA cache updates to work correctly.

**Credits**: README.md credits line: "Created by [**psychoSocial**](https://www.psychosoci5l.com/) with **Claude**, **Antigravity**, **ChatGPT**, **Gemini**."

This is a **priority rule** - documentation updates are part of the work, not an afterthought.

### Git Hygiene (MANDATORY)

Only **project files** belong in git. Personal/dev files stay local, excluded by `.gitignore`.

**ON git** (project):
- Source code (`src/`, `index.html`, `style.css`, `sw.js`)
- Assets (`icon-512.png`, `splashscreen.mp4`, `manifest.json`, `_headers`)
- Docs (`README.md`, `CLAUDE.md`, `CHANGELOG.md`, `roadmap.md`, `PLAYER_MANUAL.md`, `MANUALE_GIOCATORE.md`, `PRIVACY.md`, `NOTES.md`)
- Tests (`tests/`)
- `.gitignore`

**NOT on git** (local-only, in `.gitignore`):
- Prompt files (`*.txt`, `*prompt*.md`)
- AI tool config (`.claude/`)
- Project metadata (`_ps_meta/`)
- Local dev docs (`PROJECT_SNAPSHOT.md`, `SYSTEM_REFERENCE.md`, `BALANCE_TEST.md`)
- OS artifacts (`nul`, `.DS_Store`, `Thumbs.db`)

**Rule**: Before committing, always check `git status`. If you see untracked files that are NOT project code/docs, do NOT add them. If a new file type should be excluded, update `.gitignore` first.

---

## Project Overview

**FIAT vs CRYPTO** is an HTML5 Canvas arcade shooter (Space Invaders-style) built with vanilla JavaScript using a global namespace pattern (`window.Game`). It's a PWA-ready mobile-first game with procedural audio, code-drawn graphics, and localization (EN/IT).

**Documentation layers** (read on demand, NOT all at session start):
- `PROJECT_SNAPSHOT.md` — Project orientation (file tree, components, flow, search guide). Read when starting code work.
- `SYSTEM_REFERENCE.md` — Detailed system tables (enemies, waves, bosses, tuning params). Read relevant sections when needed.

## Running the Project

```bash
python -m http.server 8000    # or: npx serve .
# VS Code: Right-click index.html -> "Open with Live Server"
```

**Important**: Clear Service Worker cache during development (DevTools -> Application -> Service Workers -> Unregister) if changes don't appear.

---

## Architecture

### Namespace Pattern (No Build Step)

All modules attach to `window.Game` (alias `G`). Script load order in `index.html` matters. See PROJECT_SNAPSHOT.md for full 37-script load order.

Key load sequence: Constants -> ColorUtils -> BalanceConfig -> BulletPatterns -> DropSystem -> MemeEngine -> EventBus -> RunState/RankSystem/Upgrades -> AudioSystem -> InputSystem -> ObjectPool -> Entities (Entity->Bullet->Player->Enemy->Boss->PowerUp) -> WaveManager -> main.js

### Key Globals

- `window.Game` (G) - Main namespace
- `G.Balance` - **Single source of truth for ALL tuning** (BalanceConfig.js)
- `G.Audio`, `G.Input`, `G.Events` - Singletons (AudioSystem, InputSystem, EventBus)
- `G.RunState` - Per-run state (perks, modifiers)
- `G.Debug` (alias `window.dbg`) - Debug system
- `G.DropSystem`, `G.MemeEngine`, `G.RankSystem` - Systems
- `G.Bullet.Pool`, `G.ParticlePool`, `G.ParticleSystem` - Pooling & particles
- `G.ColorUtils`, `G.MathUtils` - Utilities
- `G.CampaignState` - Story mode progression
- `G._currentLang` - Current language ('EN' or 'IT')
- `window.isBearMarket` - Hard mode flag
- `window.marketCycle` - Current difficulty cycle
- `window.currentLevel` - Current level

### Game States

`gameState` in main.js: `VIDEO` -> `INTRO` -> `HANGAR` -> `STORY_SCREEN` -> `PLAY` / `INTERMISSION` / `PAUSE` -> `GAMEOVER`

`introState`: `SPLASH` (title + mode tabs) -> `SELECTION` (ship carousel + LAUNCH)

### Entity Inheritance

All game objects extend `G.Entity` (base class with x, y, vx, vy, update, draw).

---

## Systems Overview

All detailed tables, parameters, and configs are in **SYSTEM_REFERENCE.md** (read sections on demand).

### Difficulty & Rank
Scaling via `Balance.DIFFICULTY`: +8%/level, +20%/cycle, cap 85%, Bear Market 1.3x. Dynamic difficulty via `RankSystem` (rolling 30s window, rank -1 to +1).

### Weapon Evolution (v3.0)
3 shot levels (permanent, UPGRADE drop every 30 kills). 3 modifiers (RATE/POWER/SPREAD, stackable, 12s). 6 specials (exclusive, 12s). Death penalty: -1 shot level, -1 modifier levels, lose special. Config: `Balance.WEAPON_EVOLUTION`.

### GODCHAIN Mode (v4.6.0)
Activates when shotLevel=3 + rate>=2 + power>=2 + spread>=1. Red ship, fire trails, +5% speed. Deactivates on modifier expiry or death. Config: `Balance.GODCHAIN`.

### Enemy System
10 fiat currencies in 3 tiers (Weak/Medium/Strong). 4 visual shapes: coin, bill, bar, card. Enemy bullets inherit shape from parent enemy. v4.14: Enemies 48×48px (was 65), bullets 4×4 (was 6×6), bullet speed -40%. v4.17: Enemy bullets have hostile tint (70% color + 30% red), dark rings/contours (no white glow), dimmed trails — visually distinct from power-ups. Fire budget limits bullet density: C1=25, C2=45, C3=70 bullets/sec.

### Wave System (v4.0)
15 unique waves (5 per cycle x 3 cycles) with thematic currency assignments. 16 formation types. 2 hordes per wave. Bear Market: +25% count. Legacy fallback cycles 4+.

### Boss System
3 bosses: FEDERAL_RESERVE ($), BCE (euro), BOJ (yen). 3 phases each. HP: `3000 + level*65 + (cycle-1)*1400`. Phase thresholds from `Balance.BOSS.PHASE_THRESHOLDS`. 6 exclusive patterns. Mini-boss triggers via per-currency kill counters. v4.19.1: Dir-based movement (FED P1/P2, BCE P1/P2/P3) uses boundary clamp to prevent oscillation after phase transition shake.

### Power-Up & Drop System
Managed by `DropSystem.js`. Drop rates: 3%/2.5%/1% by tier + pity timer (55 kills). Weapon cooldown 8s. Boss drops capped at 6 per fight (DROP_INTERVAL 40, cooldown 3s). No cycle scaling (CYCLE_BONUS=0). Categories: UPGRADE, MODIFIER, SPECIAL. v4.15: Visual distinction — UPGRADE=Star, MODIFIER=Diamond (was hexagon), SPECIAL=Circle+Ring. Glow + light sweep on all power-ups. v4.19: Adaptive Drops — suppression gate based on Player Power Score (0.0→1.0), need-based category selection. Config: `Balance.ADAPTIVE_DROPS`.

### HUD & Messages (v4.4.0)
5 canvas channels: WAVE_STRIP, ALERT, MEME_WHISPER, SHIP_STATUS, FLOATING_TEXT. Diegetic ship HUD (life pips, shield ring, weapon pips). Reactive HUD (streak colors, HYPER glow, danger pulse).

### Visual & VFX (v4.5.0)
Sky progression (5 levels + boss). Tiered death explosions. Hit stop & screen flash via `Balance.JUICE`. VFX config via `Balance.VFX`. Screen effects toggles via `Balance.JUICE.SCREEN_EFFECTS`.

### Meme System (v4.6.0, v4.20.0)
10+ pools (LOW, HIGH, SAYLOR, POWELL, BCE, BOJ, etc.) in Constants.js. Deduplication via MemeEngine.js (last 8 per context). v4.20.0: DOM popup `#meme-popup` replaces ALL canvas memes + boss DialogueUI during gameplay. Whisper-style (italic gold, black outline) above player ship (bottom 240px). 3-tier priority queue (CRITICAL=red, HIGH=gold, NORMAL=muted gold). `queueMeme(event, text, emoji)` API. 11 event types (incl. BOSS_TICKER). Boss intro/phase dialogues (POWELL, LAGARDE, KURODA) routed through popup with speaker label. Config: `Balance.MEME_POPUP`.

### Perk System
Trigger: cancel 5 enemy bullets in 1.5s. Random perk auto-applied. Cooldown 4s. Pool in `Upgrades.js`.

### Debug System
Console: `dbg.balanceTest()` -> play -> `dbg.report()`. Overlay: `dbg.showOverlay()`. Presets: `dbg.debugBoss()`, `dbg.debugWaves()`. Weapon: `dbg.weaponStatus()`, `dbg.maxWeapon()`. Production: `dbg.setProduction()`. Power-up economy: `dbg.powerUpReport()` (drops spawned/collected/expired, weapon timeline, modifier overlap, GODCHAIN stats, adaptive suppression stats).

### Tutorial (v4.12.0, v4.19.2) & Manual v2
3-step DOM overlay (Controls/Objective/Survival). v4.19.2: mode-aware — Story ("3 atti, FED→BCE→BOJ") vs Arcade ("ondate infinite, record"). Mobile control text dynamic (Swipe/Joystick via `fiat_control_mode`). Per-mode localStorage: `fiat_tutorial_story_seen` / `fiat_tutorial_arcade_seen` (backward compat with `fiat_tutorial_seen`). Manual: 4 scrollable sections replacing 6 tabs.

---

## Key Rules & Patterns

### Balance Config is Law
**Always modify `BalanceConfig.js`**, never hardcode values in entity files. All tuning lives in `G.Balance.*`.

### z-index Stacking (CRITICAL)
`#game-container` creates its own CSS stacking context. All overlays above the curtain (z-index 9000) must be **DOM siblings outside `#game-container`**, not children.

| Element | z-index | Position |
|---------|---------|----------|
| `#splash-layer` | 9999 | Outside game-container |
| `#tutorial-overlay` | 9500 | Outside game-container |
| `#curtain-overlay` | 9000 | Outside game-container |
| Modals | 1000-1100 | Outside game-container |
| `#touchControls` | 200 | Inside game-container |
| `#ui-layer` | 120 | Inside game-container |

### Button Design System (v4.13.0)
All buttons use composable `.btn` classes from `style.css`. Never create new button classes — compose existing ones:
- **Variants**: `.btn-primary` (gold), `.btn-secondary` (ghost), `.btn-danger` (red), `.btn-toggle` (compact gold), `.btn-icon` (44px square), `.btn-icon-round` (50px circle), `.btn-cta` (animated title), `.btn-pwa` (install banner)
- **Sizes**: `.btn-sm`, `.btn-lg`, `.btn-block` (full-width)
- **CSS vars**: `--btn-gold-top/bottom/shadow/glow`, `--btn-danger-top/bottom/shadow`
- **Example**: `<button class="btn btn-primary btn-block">TEXT</button>`

### Performance: ColorUtils Caching
Use `G.ColorUtils.rgba(r,g,b,a)` and `G.ColorUtils.font(w,s,f)` in all per-frame draw code instead of template literals to avoid GC pressure.

### localStorage Version Migration
IIFE at top of main.js: clears all localStorage on version mismatch (`G.VERSION` vs `fiat_app_version` key). Ensures clean state on updates.

### UI Safe Zones
HUD: 0-45px top. Gameplay: 65px+ top. Boss targetY: 65 + safeOffset. Graze/Shield/HYPER/Joystick: bottom area (DOM elements).
