# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Workflow

### End of Session Checklist (MANDATORY)
When completing a feature or ending a session, **always update without being asked**:

1. **Constants.js** - Bump `VERSION` string (e.g., "v2.15.3 FIAT vs CRYPTO")
2. **sw.js** - Bump `SW_VERSION` to match (e.g., '2.15.3')
3. **CHANGELOG.md** - Add new version entry with feature summary

**Version Sync**: Constants.js and sw.js versions MUST match for PWA cache updates to work correctly.

**Update only if the change requires it** (not every session):
- **roadmap.md** - Mark completed tasks, add new phases
- **CLAUDE.md** - New systems/patterns added
- **README.md** - Major features added (shown on GitHub homepage)

**Credits**: README.md credits line: "Created by [**psychoSocial**](https://www.psychosoci5l.com/) with **Claude**, **Antigravity**, **ChatGPT**, **Gemini**."

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

**Detailed reference** (read on demand, NOT at session start):
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

All modules attach to `window.Game` (alias `G`). Script load order in `index.html` matters — check `index.html` directly when needed.

### Key Globals

- `window.Game` (G) - Main namespace
- `G.Balance` - **Single source of truth for ALL tuning** (BalanceConfig.js)
- `G.Audio`, `G.Input`, `G.Events` - Singletons (AudioSystem, InputSystem, EventBus)
- `G.RunState` - Per-run state (perks, modifiers, score, level, streaks, graze, sacrifice, etc.)
- `G.GameState` - State machine (transition table, validation, `.is()` helper)
- `G.CollisionSystem` - Collision detection loops (enemy→player, player→enemy, player→boss, bullet cancel)
- `G.Debug` (alias `window.dbg`) - Debug system
- `G.DropSystem`, `G.MemeEngine`, `G.RankSystem` - Systems
- `G.FloatingTextManager`, `G.PerkIconManager` - VFX systems (extracted from main.js v4.49)
- `G.PerkManager`, `G.MiniBossManager` - Managers (extracted from main.js v4.49)
- `G.Bullet.Pool`, `G.ParticlePool`, `G.ParticleSystem` - Pooling & particles
- `G.ColorUtils`, `G.MathUtils` - Utilities
- `G.CampaignState` - Story mode progression
- `G._currentLang` - Current language ('EN' or 'IT')
- `window.isBearMarket` - Hard mode flag
- `window.marketCycle` - Current difficulty cycle
- `window.currentLevel` - Current level

### Game States

`G.GameState` (GameStateMachine.js): `VIDEO` -> `INTRO` -> `HANGAR` -> `STORY_SCREEN` -> `WARMUP` -> `PLAY` / `PAUSE` -> `GAMEOVER` (WARMUP = first game only, move-only phase with GO! button. INTERMISSION state only for boss defeats, waves transition seamlessly). Transition table with validation. `setGameState('X')` wrapper in main.js syncs local `gameState` variable + `G.GameState.transition()`.

`introState`: `SPLASH` (title + mode tabs) -> `SELECTION` (ship carousel + LAUNCH)

### Entity Inheritance

All game objects extend `G.Entity` (base class with x, y, vx, vy, update, draw).

---

## Systems Overview

Detailed tables, parameters, and implementation specifics → **SYSTEM_REFERENCE.md** (read on demand).

### Core Gameplay
- **Difficulty & Rank** — `Balance.DIFFICULTY` / `Balance.RANK`. +8%/lvl, +20%/cycle, cap 85%, Bear Market 1.3×, dynamic rank ±1
- **Weapon Evolution** — `Balance.WEAPON_EVOLUTION`. Linear 5-level system (`LEVELS` table 1-7). HYPER adds +2 temp levels. 3 specials (HOMING/PIERCE/MISSILE, 12s). 2 utilities (SHIELD/SPEED, capsule visual). Death: -1 weapon level, lose special
- **GODCHAIN** — `Balance.GODCHAIN`. Activates at `weaponLevel >= 5`
- **Enemy System** — `Balance.ENEMY_BEHAVIOR`. 10 currencies, 3 tiers, 4 shapes. Fire budget: C1=25/C2=45/C3=70 bullets/sec
- **Wave System** — `Balance.WAVE_DEFINITIONS`. 15 waves (5×3 cycles), 16 formations, legacy fallback cycle 4+
- **Boss System** — `Balance.BOSS`. FED/BCE/BOJ, 3 phases each, HP formula in config, rotation `marketCycle % 3`
- **Drop System** — `Balance.ADAPTIVE_DROPS`. Rates 3%/2.5%/1% by tier, pity 55 kills, adaptive suppression. 3 categories: UPGRADE/SPECIAL/UTILITY
- **Collision** — `CollisionSystem.js`. 4 loops, callback pattern, init via `initCollisionSystem()`
- **Bullet System** — `Balance.BULLET_CONFIG` + `Balance.BULLET_PIERCE`. Circle-based collision, missile AoE, pierce HP (bullets survive N enemy-bullet hits). Debug: `dbg.hitboxes()`
- **Proximity Kill Meter** — `Balance.PROXIMITY_KILL`. Vertical-distance kills fill DIP meter (replaces graze as HYPER source). Boss hits +0.4, phase transitions +15. `Game.addProximityMeter(gain)` API
- **Perk System** — `Upgrades.js`. Cancel 5 enemy bullets in 1.5s → random perk, cooldown 4s

### UI & Presentation
- **HUD & Messages** — `Balance.MESSAGE_STRIP`. 2 DOM (#message-strip, #meme-popup) + 2 canvas (SHIP_STATUS, WAVE_SWEEP)
- **Meme System** — `Balance.MEME_POPUP`. DOM popup, 3-tier priority, `queueMeme(event, text, emoji)` API
- **Tutorial** — 3-step DOM overlay, mode-aware (Story/Arcade), per-mode localStorage
- **What's New** — `#whatsnew-panel` DOM modal, JS-generated from version array in main.js. Scroll broken on iOS Safari (TODO)
- **Arcade Records** — Persistent best cycle/level/kills in localStorage, NEW BEST badge on gameover, displayed in intro selection

### Rendering & VFX
- **Additive Glow** — `Balance.GLOW`. `'lighter'` on player elements. Kill-switch: `GLOW.ENABLED = false`. Visual rule: "glow = collect, dark = avoid"
- **Sky & Background** — `Balance.SKY`. Gradient + stars + hills + clouds + particles. Off-screen caching via `Balance.SKY.OFFSCREEN`
- **Batch Rendering** — Multi-pass pipeline (standard → additive), ~30% less canvas state changes
- **Responsive Formations** — `Balance.FORMATION.RESPONSIVE`. Spacing scales with screen width. Kill-switch: `RESPONSIVE: false`
- **Juice & VFX** — `Balance.JUICE` / `Balance.VFX`. Damage vignette, boss cinematics. Kill-switches in `JUICE.SCREEN_EFFECTS`
- **Title Animation** — `Balance.TITLE_ANIM`. 2s intro, skip on tap, `prefers-reduced-motion` → auto-skip

### Audio
- **Audio System** — `Balance.AUDIO`. Procedural music (MusicData.js), separate Music/SFX gain. `toggleMusic()`/`toggleSfx()`. Bear market: -1 semitone, +10% tempo

### Debug
- **Debug System** — `dbg.*` console API. Key commands: `dbg.balanceTest()`, `dbg.report()`, `dbg.hitboxes()`, `dbg.maxWeapon()`. Full reference in SYSTEM_REFERENCE.md

---

## Key Rules & Patterns

### Balance Config is Law
**Always modify `BalanceConfig.js`**, never hardcode values in entity files. All tuning lives in `G.Balance.*`. Check `BalanceConfig.js` directly for available config sections.

### z-index Stacking (CRITICAL)
`#game-container` creates its own CSS stacking context. All overlays above the curtain (z-index 9000) must be **DOM siblings outside `#game-container`**, not children.

| Element | z-index | Position |
|---------|---------|----------|
| `#splash-layer` | 9999 | Outside game-container |
| `#tutorial-overlay` | 9500 | Outside game-container |
| `#curtain-overlay` | 9000 | Outside game-container |
| Modals | 1000-1100 | Outside game-container |
| `#intro-screen` | 250 | Inside game-container |
| `#touchControls` | 200 | Inside game-container |
| `#ui-layer` | 120 | Inside game-container |

### Button Design System
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
