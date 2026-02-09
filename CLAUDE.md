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

Key load sequence: Constants -> ColorUtils -> BalanceConfig -> MusicData -> BulletPatterns -> BulletSystem -> CollisionSystem -> DropSystem -> MemeEngine -> EventBus -> GameStateMachine -> RunState/RankSystem/Upgrades -> AudioSystem -> InputSystem -> ObjectPool -> Entities (Entity->Bullet->Player->Enemy->Boss->PowerUp) -> WaveManager -> main.js

### Key Globals

- `window.Game` (G) - Main namespace
- `G.Balance` - **Single source of truth for ALL tuning** (BalanceConfig.js)
- `G.Audio`, `G.Input`, `G.Events` - Singletons (AudioSystem, InputSystem, EventBus)
- `G.RunState` - Per-run state (perks, modifiers, score, level, streaks, graze, sacrifice, etc.)
- `G.GameState` - State machine (transition table, validation, `.is()` helper)
- `G.CollisionSystem` - Collision detection loops (enemy→player, player→enemy, player→boss, bullet cancel)
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

`G.GameState` (GameStateMachine.js): `VIDEO` -> `INTRO` -> `HANGAR` -> `STORY_SCREEN` -> `PLAY` / `PAUSE` -> `GAMEOVER` (v4.21: INTERMISSION state only for boss defeats, waves transition seamlessly). v4.28: Transition table with validation. `setGameState('X')` wrapper in main.js syncs local `gameState` variable + `G.GameState.transition()`.

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
10 fiat currencies in 3 tiers (Weak/Medium/Strong). 4 visual shapes: coin, bill, bar, card. Enemy bullets inherit shape from parent enemy. v4.25: Enemies 58×58px (was 48, +20%), bullets 4×4, bullet speed -40%. v4.17: Enemy bullets have hostile tint (70% color + 30% red), dark rings/contours (no white glow), dimmed trails — visually distinct from power-ups. Fire budget limits bullet density: C1=25, C2=45, C3=70 bullets/sec.

### Wave System (v4.0)
15 unique waves (5 per cycle x 3 cycles) with thematic currency assignments. 16 formation types. 2 hordes per wave. Bear Market: +25% count. Legacy fallback cycles 4+.

### Boss System
3 bosses: FEDERAL_RESERVE ($), BCE (euro), BOJ (yen). 3 phases each. HP: `3000 + level*65 + (cycle-1)*1400`. Phase thresholds from `Balance.BOSS.PHASE_THRESHOLDS`. 6 exclusive patterns. Mini-boss triggers via per-currency kill counters. v4.19.1: Dir-based movement (FED P1/P2, BCE P1/P2/P3) uses boundary clamp to prevent oscillation after phase transition shake. v4.21: Boss rotation always `marketCycle % 3` (FED→BCE→BOJ), CampaignState boss tracking deprecated (campaign resets every new game).

### Power-Up & Drop System
Managed by `DropSystem.js`. Drop rates: 3%/2.5%/1% by tier + pity timer (55 kills). Weapon cooldown 8s. Boss drops capped at 6 per fight (DROP_INTERVAL 40, cooldown 3s). No cycle scaling (CYCLE_BONUS=0). Categories: UPGRADE, MODIFIER, SPECIAL. v4.15: Visual distinction — UPGRADE=Star, MODIFIER=Diamond (was hexagon), SPECIAL=Circle+Ring. Glow + light sweep on all power-ups. v4.19: Adaptive Drops — suppression gate based on Player Power Score (0.0→1.0), need-based category selection. Config: `Balance.ADAPTIVE_DROPS`.

### HUD & Messages (v4.4.0, v4.26.0)
2 DOM message points + 2 canvas channels. **Message Strip** (`#message-strip`): DOM element under HUD top bar (45px), 4 types (DANGER/VICTORY/WAVE/INFO), priority queue, CSS animations. Replaces canvas WAVE_STRIP + ALERT channels. **Meme Popup** (`#meme-popup`): DOM popup above player ship. **SHIP_STATUS**: canvas above player (unchanged). **WAVE_SWEEP**: canvas horizontal line (unchanged). Config: `Balance.MESSAGE_STRIP`. Diegetic ship HUD (life pips, shield ring, weapon pips). Reactive HUD (streak colors, HYPER glow, danger pulse).

### Visual & VFX (v4.5.0)
Sky progression (5 levels + boss). Tiered death explosions. Hit stop & screen flash via `Balance.JUICE`. VFX config via `Balance.VFX`. Screen effects toggles via `Balance.JUICE.SCREEN_EFFECTS`.

### Meme System (v4.6.0, v4.20.0)
10+ pools (LOW, HIGH, SAYLOR, POWELL, BCE, BOJ, etc.) in Constants.js. Deduplication via MemeEngine.js (last 8 per context). v4.20.0: DOM popup `#meme-popup` replaces ALL canvas memes + boss DialogueUI during gameplay. Whisper-style (italic gold, black outline) above player ship (bottom 240px). 3-tier priority queue (CRITICAL=red, HIGH=gold, NORMAL=muted gold). `queueMeme(event, text, emoji)` API. 11 event types (incl. BOSS_TICKER). Boss intro/phase dialogues (POWELL, LAGARDE, KURODA) routed through popup with speaker label. Config: `Balance.MEME_POPUP`.

### Perk System
Trigger: cancel 5 enemy bullets in 1.5s. Random perk auto-applied. Cooldown 4s. Pool in `Upgrades.js`.

### Collision System (v4.28.0)
`G.CollisionSystem` (CollisionSystem.js) — extracted from main.js. 4 collision loops: enemy bullets→player (core hit + graze), player bullets→enemies, player bullets→boss, bullet cancellation. Callback pattern: CollisionSystem handles iteration + circle-based detection, side-effects (score, meme, drop, VFX) stay in main.js as named callbacks passed via `init(context)`. Context object provides getters for game entities (player, bullets, enemies, boss). Initialized in `startGame()` via `initCollisionSystem()`.

### Bullet System v2.0 (v4.22.0)
Circle-based collision via `G.BulletSystem`. All bullet params centralized in `Balance.BULLET_CONFIG` (radii, speed, piercing per type). Missile AoE: `handleMissileExplosion()` — radial damage falloff, knockback, particles, shake. `Bullet.collisionRadius` getter auto-resolves from config. Debug: `dbg.hitboxes()` overlay.

### Additive Glow System (v4.23.0, boosted v4.23.1)
`globalCompositeOperation: 'lighter'` on player bullets, engine flame, muzzle flash, HYPER/GODCHAIN auras, power-ups, and explosion ring particles. All config in `Balance.GLOW` with per-element ENABLED toggles. Master kill-switch: `GLOW.ENABLED = false` reverts to pre-v4.23 rendering. Enemy bullets explicitly excluded (hostile tint v4.17 preserved). Visual language: "glow = collect/player, dark = avoid/enemy". v4.23.1: All glow values boosted (bullet alpha 0.45, radius 18px), bullet trail sections additive, player afterimage additive (threshold 50 vx, alpha 0.4), death glow particle (`DEATH_FLASH` config), spark additive rendering.

### Batch Rendering (v4.30.0)
Multi-pass draw pipeline reduces ~30% canvas state changes. ParticleSystem: 2-pass (standard source-over → additive lighter). Player bullet glow: `Bullet.drawGlow(ctx)` batched in main.js single additive pass before body loop. Floating text: shared textAlign/strokeStyle setup hoisted. Visually identical to pre-v4.30.

### Audio System v2 (v4.34.0)
Data-driven procedural music with separate Music/SFX routing. `MusicData.js` defines 5 level themes + 3 boss phases + bear market modifier. Each song has sections (A/B/FILL) with 16-beat arrays for bass/melody/arp/drums/pad. `AudioSystem.js` schedule() reads beat-by-beat from data with intensity-gated layers (bass always, arp 30+, pad 40+, drums 50+, melody 60+). Separate `musicGain`/`sfxGain` nodes for independent toggle. `toggleMusic()`/`toggleSfx()` methods. localStorage persistence (`fiat_music_muted`, `fiat_sfx_muted`). Timing always advances when muted (HarmonicConductor sync). Config: `Balance.AUDIO`. Bear market: -1 semitone pitch shift, +10% tempo.

### Juice Cleanup (v4.33.0)
Gameplay effects decluttered for fluid action. All hit stops zeroed during gameplay (streak, graze, player hit). Screen flash disabled for gameplay events. Screen shake removed from enemy contact. Boss cinematic events preserved (BOSS_PHASE 300ms, BOSS_DEFEAT 500ms, boss flashes). 3 master kill-switches in `Balance.JUICE.SCREEN_EFFECTS`: `SCREEN_SHAKE`, `SCREEN_FLASH`, `HIT_STOP` — `=== false` gate (undefined = enabled). New **Damage Vignette**: 4 red border rects (12px), 0.3s ease-out fade on hit — replaces fullscreen flash. All original effect code preserved, disabled via config values. `EffectsRenderer.triggerDamageVignette()` + `drawDamageVignette(ctx)`.

### Responsive Formation System (v4.32.0)
Formation spacing and positioning scale with screen dimensions. `widthRatio = gameWidth / BASE_WIDTH` (e.g. 430/600 = 0.717 on iPhone). Spacing: `max(SPACING_MIN, round(SPACING * widthRatio))`. startY scales with `gameHeight / 800`. Legacy `spawnWaveLegacy()` aligned to same responsive logic. Enemy teleport bounds clamped to actual screen size. Kamikaze trigger proportional (`gameHeight * 0.33`). Config: `Balance.FORMATION.RESPONSIVE` (master toggle), `SPACING_MIN` (62px floor), `START_Y_RESPONSIVE`. Kill-switch: `RESPONSIVE: false` = pre-v4.32 fixed spacing. Desktop 600px: widthRatio=1.0, zero changes.

### Entity Resize (v4.25.0)
Enemies resized from 48×48 to 58×58px (+20%). All internal shape dimensions, collision radii, formation spacing, and fonts scaled proportionally. Enemy bullets unchanged (4×4px). Off-screen culling margin 65→80px.

### Sky & Background System (v4.24.0, off-screen v4.31.0)
Cell-shading sky enhancement in SkyRenderer.js with config in `Balance.SKY`. Master toggle + per-feature toggles (same pattern as `Balance.GLOW`). Features: A) Smooth gradient sky (cached `createLinearGradient`, invalidated on level change/resize); B) Enhanced star field (90 stars with parallax drift, L3+ visible with progressive alpha, shooting stars); C) 5-layer parallax hills with atmospheric perspective + deterministic silhouettes (trees/buildings on distant layers, #111 outline); D) Atmospheric particles (dust/pollen/firefly/ember themed per level, cell-shaded outline on >= 3px); E) Multi-lobe clouds (2-4 ellipse lobes, shadow+main+highlight+outline layers, depth-based scaling); F) Horizon glow (8px band at first hill Y, pulsing alpha); G) Off-screen canvas caching (v4.31): sky gradient on opaque off-screen canvas (redrawn only on state change), hills on transparent off-screen canvas (throttled redraw every N frames). Config: `Balance.SKY.OFFSCREEN`. Kill-switch: `ENABLED: false` = direct-draw fallback. Draw pipeline: bands → symbols → stars → atmo particles → horizon glow → hills → clouds → lightning.

### Debug System
Console: `dbg.balanceTest()` -> play -> `dbg.report()`. Overlay: `dbg.showOverlay()`. Presets: `dbg.debugBoss()`, `dbg.debugWaves()`. Weapon: `dbg.weaponStatus()`, `dbg.maxWeapon()`. Production: `dbg.setProduction()`. Power-up economy: `dbg.powerUpReport()` (drops spawned/collected/expired, weapon timeline, modifier overlap, GODCHAIN stats, adaptive suppression stats). Hitbox debug: `dbg.hitboxes()` (v4.22).

### Tutorial (v4.12.0, v4.19.2) & Manual v2
3-step DOM overlay (Controls/Objective/Survival). v4.19.2: mode-aware — Story ("3 atti, FED→BCE→BOJ") vs Arcade ("ondate infinite, record"). Mobile control text dynamic (Swipe/Joystick via `fiat_control_mode`). Per-mode localStorage: `fiat_tutorial_story_seen` / `fiat_tutorial_arcade_seen` (backward compat with `fiat_tutorial_seen`). Manual: 4 scrollable sections replacing 6 tabs.

---

## Key Rules & Patterns

### Balance Config is Law
**Always modify `BalanceConfig.js`**, never hardcode values in entity files. All tuning lives in `G.Balance.*`.

Key config sections (v4.34.0): `PLAYER` (movement, combat, shield), `GAME` (canvas size), `ENEMY_BEHAVIOR` (teleport, wave patterns, entry, flash), `BOSS` (HP, movement per boss/phase, attacks per boss/phase), `WEAPON_EVOLUTION`, `DIFFICULTY`, `CHOREOGRAPHY`, `WAVE_DEFINITIONS`, `GLOW`, `SKY`, `MESSAGE_STRIP`, `MEME_POPUP`, `ADAPTIVE_DROPS`, `BULLET_CONFIG`, `FIRE_BUDGET`, `GRAZE`, `RANK`, `AUDIO`.

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
