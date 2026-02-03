# Roadmap: FIAT vs CRYPTO -> iOS App Store Ready 📱

> [!IMPORTANT]
> **PIVOT**: As of Phase 3, development is exclusively focused on **Mobile/iOS**. Desktop support is deprecated.

## Phase 1: The Great Refactor (Foundation) ✅
*Goal: Transform the prototype code into a professional, maintainable architecture.*
- [x] **Project Structure Setup**: Create folder structure (`src/core`, `src/entities`, etc.).
- [x] **Decoupling**: Extricate `Constants` and `AudioSys` first.
- [x] **Entity Migration**: Move Player, Enemy, Bullet logic to separate classes.
- [x] **Manager Migration**: Isolate Wave, Collision, and UI logic.
- [x] **Entry Point**: Re-wire `index.html` to use `src/main.js` (Namespace Pattern).

## Phase 2: Hardening & Optimization ✅
*Goal: Ensure stability and performance.*
- [x] **Object Pooling**: Formalize the recycling of bullets and particles (prevent GC stutters).
- [x] **Event System**: Pub/Sub EventBus implemented (`Events.emit('PLAYER_HIT')`, etc.).
- [x] **Game Center Prep**: Mock `submitToGameCenter()` hook ready for Capacitor plugin.

## Phase 3: iOS Experience Polish ✅
*Goal: It feels like an App, not a website.*
- [x] **Viewport Management**: Prevent all rubber-banding/zooming.
- [x] **Notch Support**: CSS updates for Safe Areas.
- [x] **Safe Area v2 (v2.13.1)**: Full env() safe-area-inset support for HUD, controls, and game logic.
- [x] **Touch Control v2**: Refine the touch zones and sensitivity for mobile play.
- [x] **Haptics**: Add vibration feedback (Navigator.vibrate for now, Capacitor Haptics later).

## Phase 4: Next-Gen Visuals & Gameplay 🎨
*Goal: Graphics and mechanics worthy of the App Store.*
- [x] **Visual Identity**: Neon Geometry & Particles.
- [x] **Juice**: Screen Shake, SlowMo, Red Flash.
- [x] **Gameplay Depth**: Smart AI, Snake Patterns, Power-Ups (Satoshi Drops).
- [x] **Boss**: "The Central Bank" (3 Phases).

## Phase 5: Final Polish & Pre-Flight 🚀
- [x] **Asset Review**: App Icon & Splash Screen generated.
- [x] **Meta Tags**: iOS PWA Ready.

## Phase 6: Release Candy (Final Features) 🍬
*Goal: Retention and Vibe.*
- [x] **Background Music**: Procedural Synthwave loop.
- [x] **Persistence**: Save High Score to LocalStorage.
- [x] **Controls**: 1:1 Finger Tracking.

## Phase 7: Balance & Game Feel (RC 1.1) ⚖️
- [x] **Balance**: Buffed SOL (Hitbox), Nerfed ETH (FireRate).
- [x] **Panic Selling**: Enemy vertical drop on edge hit (20px normal, 35px in Bear Market).
- [x] **Bug Fix**: UI Buttons fix on mobile.

# ✅ PROJECT COMPLETE: RELEASE CANDIDATE 1.1 READY

## Phase 7.5: Gameplay Rebalance (Jan 30, 2026)
*Goal: smoother pacing + less spike damage.*
- [x] **Wave Cycle**: 5 waves before boss.
- [x] **Enemy Fire Pacing**: Alternating fire groups (no full volleys).
- [x] **Bullet Cancel**: Player shots delete enemy bullets.
- [x] **Perk Flow**: Removed perk selection modal; random perk on cancel streak (3 in a row).
- [x] **Visuals**: Switch to code-drawn player/enemies/boss/power-ups (sprites optional).

## Phase 8: Bear Market Mode 🐻 ✅
*Goal: For the hardcore trading veterans.*
- [x] **Hard Mode Toggle**: "Bear Market" button.
- [x] **Red Aesthetics**: Tint the whole game blood red (CSS filter + dark storm sky).
- [x] **Difficulty Spike**: Faster enemies (1.3x), Panic from Wave 2 (SINE_WAVE), aggressive drop (35px).

## Phase 9: Visual Overhaul (Sky Pivot) ☁️ ✅
- [x] **Background**: Dusk Gradient + Parallax Clouds (Day/Dusk/Night cycle).
- [x] **Bear Market V2**: Stormy Sky + Lightning (purple flash every 2-6s).

## Phase 10: Performance & Polish ✅
*Goal: Smooth 60fps + better game feel.*
- [x] **Canvas Optimization**: Removed shadowBlur from all entities (major perf gain).
- [x] **Enemy Fire Rebalance**: Rate limiter (max 2/tick), slower phase rotation, wider spread.
- [x] **Explosion Juice**: Bigger particles, sparkles, expanding ring flash.
- [x] **Perk Bar Vertical**: Last 3 perks displayed under score.
- [x] **Meme System**: Popup on streak milestones (less frequent, more impactful).
- [x] **Grid Pattern Removed**: Cleaner UI layer.

## Phase 11: Difficulty & Progression ✅
*Goal: Fair challenge curve.*
- [x] **Market Cycle System**: Track boss completions, scale difficulty each cycle.
- [x] **Enemy HP Scaling**: 10 base + 5 per cycle.
- [x] **Fire Rate Scaling**: +15% per cycle.
- [x] **Cycle Warning**: "CYCLE X BEGINS" intermission message after boss.
- [x] **Drop Rate -40%**: Power-ups less frequent.
- [x] **Wave 3 Fix**: More enemies in COLUMNS pattern.

## Phase 12: Visual Identity Refresh ✅
*Goal: Premium look & feel.*
- [x] **Start Screen Redesign**: Modern, clean, impactful. Animated ship with reactor flame.
- [x] **Player Ship Effects**: Reactor flame, muzzle flash, trail, side thrusters.
- [ ] **Difficulty Tuning**: Final balance pass (pending testing).

## Phase 13: Mini-Boss & Meme System ✅
*Goal: More variety and personality.*
- [x] **Fiat Kill Counter**: Track kills per enemy type (¥, €, £, $).
- [x] **Mini-Boss Trigger**: Every 100 kills of same type spawns giant revenge boss.
- [x] **Mini-Boss Mechanics**: 3 attack phases, HP scaling, 1v1 fight.
- [x] **Bear Market Toggle Redesign**: Sleek switch-style button.
- [x] **Meme Vocabulary Explosion**: 100+ memes including 50 Michael Saylor quotes.
- [x] **Meme Categories**: LOW, HIGH, SAYLOR, FIAT_DEATH, BOSS, STREAK.

## Phase 14: Start Screen Overhaul 🎬 ✅
*Goal: Cinematic intro experience and polished start screen.*

### A) Curtain Reveal Effect ✅
- [x] **Entering Curtain**: When loading completes, show a "curtain" overlay that covers the screen
- [x] **Reveal Animation**: Curtain splits and slides away (left/right) to reveal intro screen
- [x] **Exit Curtain**: When pressing PLAY, curtain closes again before transitioning to hangar
- [x] **CSS Implementation**: Two divs (`curtain-left`, `curtain-right`) with CSS transforms
- [x] **Timing**: ~0.8s reveal/close with cubic-bezier easing
- [x] **Back to Intro**: Curtain effect also plays when returning from game over/pause

### B) Bear Market Button Redesign ✅
- [x] **Width Match**: Same width as PLAY button (`min-width: 280px`)
- [x] **Yellow Background**: Yellow gradient (`#f1c40f` → `#f39c12`)
- [x] **Red Text**: `color: #c0392b` (danger red)
- [x] **Keep Height**: Slightly smaller padding than PLAY (14px vs 18px)
- [x] **Remove Toggle Switch**: Removed `::before` and `::after` pseudo-elements
- [x] **Active State**: Red background with yellow text when Bear Mode enabled

### C) PLAY Button -> "CHANGE THE SYSTEM" ✅
- [x] **Text Change**: Now displays "CHANGE THE SYSTEM"
- [x] **Font Adjustment**: Reduced to 18px with letter-spacing 3px
- [x] **Launch Animation**: Ship canvas flies upward with CSS transform
- [x] **Sound Effects**: Triple shoot sound during launch
- [x] **Transition Timing**: 400ms ship animation, then curtain closes, then hangar opens

### D) Version Tag Verification ✅
- [x] **Source Check**: Updated to `v2.3.0 Start Screen Update` in Constants.js
- [x] **Display Check**: `#version-tag` populated via `updateUIText()`
- [x] **Footer Position**: Version visible at bottom of start screen

### E) High Score Persistence ✅
- [x] **Load Verification**: `localStorage.getItem('fiat_highscore')` at main.js:71
- [x] **Save Verification**: `localStorage.setItem()` in `triggerGameOver()`
- [x] **Display Check**: `#highScoreVal` updates on load and after new high score

## Phase 15: Combat Rebalance v2 ✅
*Goal: Smoother difficulty curve and balanced combat.*
- [x] **Fibonacci Enemy Firing**: Enemies fire in Fibonacci sequence (1→1→2→3→5→8...) with 0.40s intervals
- [x] **Enemy Tier Distribution**: 1:2:3 ratio (Strong:Medium:Weak) by rows
- [x] **Power-Up Nerfs**: Triple weapons ~1.5-1.8x DPS, ship bonuses reduced
- [x] **FIRE Weapon Penetration**: Bullets pierce through enemies
- [x] **First Shot Immediate**: First enemy fires instantly, others staggered

## Phase 16: Branding & Message System ✅
*Goal: Clean visual identity and communication.*
- [x] **Game Rebrand**: "FIAT INVADERS" → "FIAT vs CRYPTO"
- [x] **Animated Title**: Red FIAT (enemy pulse), electric VS, gold CRYPTO (hero glow)
- [x] **Message Categories**: showMemeFun, showPowerUp, showGameInfo, showDanger, showVictory
- [x] **Anti-Overlap Queue**: Priority system (DANGER > VICTORY > POWERUP > MEME) with 600ms cooldown
- [x] **Max 3 Floating Texts**: Prevents screen clutter
- [x] **Perk Bar Disabled**: Cleaner gameplay view

## Phase 17: Cell-Shading Visual Style 🎨 ✅
*Goal: Comic book / cartoon aesthetic inspired by Wind Waker & Viewtiful Joe.*

### Key Techniques to Implement:
| Element | Description | Priority |
|---------|-------------|----------|
| **Bold Outlines** | 3-4px black strokes on all entities | HIGH |
| **Two-Tone Shading** | Light side + shadow side per object | HIGH |
| **Rim Lighting** | Bright edge highlight on top-right | MEDIUM |
| **Hard Shadow Edges** | Sharp transitions, no gradients | MEDIUM |
| **Speed Lines** | Motion trails on fast objects | LOW |
| **Ink Splatters** | Comic-style explosion particles | LOW |
| **Hatching** | Diagonal lines in shadow regions | LOW |

### Files Modified:
- [x] `src/entities/Player.js` - Ship outlines + two-tone + rim light + speed lines
- [x] `src/entities/Enemy.js` - Bold outlines on coin/bill/bar/card shapes + two-tone + rim light
- [x] `src/entities/Boss.js` - Enhanced outlines + shadow regions + rim light
- [x] `src/entities/Bullet.js` - Bold outlines + speed line trails
- [x] `src/entities/PowerUp.js` - Bold outlines + two-tone + rim light
- [x] `src/main.js` - Explosion particles → ink splatter style (3 shapes)

### Implementation Order:
1. **Pass 1**: Bold outlines (3-4px) on all entities ✅
   - Player.js: Already had 4px (unchanged)
   - Enemy.js: 2px → 3px
   - Boss.js: Unified to 3-4px (eyes, cannons, vault dial)
   - Bullet.js: Added 2px outlines to all bullet types
   - PowerUp.js: White → dark (#111) 3px outlines
2. **Pass 2**: Two-tone shading (darker bottom-left region) ✅
   - Enemy.js: All 4 shapes (coin, bill, bar, card) split into light/shadow halves
   - Player.js: Body, nose cone, fins with two-tone + darkenColor helper
   - PowerUp.js: Diamond and circle with shadow arcs + darkenColor helper
   - Boss.js: Vault body split left/right + darkenColor helper
3. **Pass 3**: Rim lighting (bright top-right edge) ✅
   - Enemy.js: All 4 shapes with bright edge highlights + lightenColor
   - Player.js: Body right edge + nose highlight + lightenColor helper
   - PowerUp.js: Diamond and circle rim arcs + lightenColor helper
   - Boss.js: Vault top-right edge highlight + lightenColor helper
4. **Pass 4**: Speed lines on bullets and fast movement ✅
   - Bullet.js: Enemy bullets con 3 speed lines trailing
   - Bullet.js: Player bullets con speed lines verticali
   - Bullet.js: Laser beams con speed lines
   - Player.js: Speed lines laterali quando si muove veloce
5. **Pass 5**: Ink splatter explosions and hit effects ✅
   - main.js createExplosion: Ink blobs, droplets, star bursts
   - main.js drawParticles: 3 ink shapes (blob, star, splat) con bold outlines
   - main.js createBulletSpark: Star/blob ink per bullet cancel
   - Ring flash con doppio outline
6. **Pass 6**: Cell-shaded background ✅
   - Cielo a bande piatte per tutti i 5 livelli + boss + bear market
   - Nuvole flat con two-tone e bold outline
   - Stelle a 4 punte con twinkle effect
   - 3 layer di colline parallax con silhouette ondulate e outline
   - Colori adattivi per giorno/tramonto/notte/bear market

---

## Phase 18: Deep Balance & Polish 🔧
*Goal: Fix all identified weaknesses for a polished, fair experience.*

### A) Balance Overhaul 🎯 (CRITICAL) ✅

#### A1) Boss HP Scaling Fix ✅
- [x] **Perk-Aware Scaling**: Boss HP formula accounts for accumulated perks (+12% per perk)
- [x] **Damage Compensation**: Boss HP scales with sqrt(playerDamageMult) for softer scaling
- [ ] **Dynamic HP Display**: Show boss HP relative to player DPS (estimated time-to-kill)
- [ ] **Phase Thresholds**: Adjust phase transitions based on cycle (earlier phases in later cycles)

#### A2) Graze System Rebalance ✅
- [x] **Graze Decay**: Meter decays 5 points/second if not grazing (use it or lose it)
- [x] **Skill-Based Bonus**: Close grazes (< 15px) worth 2x points + golden particles
- [x] **Graze Perk Threshold**: Increase from 80 to 120 grazes for bonus perk
- [x] **Cap Graze Perks**: Max 2 graze perks per level (score bonus after cap)

#### A3) Mini-Boss Scaling ✅
- [x] **HP Formula Fix**: `400 + (level × 100) + (cycle × 150)` + perk scaling (+10% per perk)
- [x] **Full Fiat Names**: All 10 currencies now have proper names
- [ ] **Scaling Attacks**: Mini-boss gains new attack patterns per cycle
- [ ] **Reward Scaling**: Better drops from mini-boss (guaranteed weapon power-up)

#### A4) Power-Up Drop Rebalance ✅
- [x] **Remove Time-Based Drops**: No more guaranteed 5-second drops
- [x] **Tier-Based Drops**: Strong enemies 6%, Medium 4%, Weak 2%
- [x] **Drop Cooldown**: Minimum 8 seconds between weapon drops
- [x] **Pity Timer**: Guaranteed drop after 30 kills without one

### C) UX Polish ✨ ✅

#### C1) Perk Pause System ✅
- [x] **Pause on Perk**: Game pauses during perk acquisition (enemies freeze)
- [x] **Visual Overlay**: Dimmed background with perk card display
- [x] **Auto-Resume**: 1.2-second display then auto-resume
- [x] **Rarity Colors**: Common/Uncommon/Rare/Epic color coding

#### C2) Wave Countdown Visual ✅
- [x] **Already Implemented**: Intermission countdown with meme display
- [ ] **Wave Countdown**: Visual 3-2-1 countdown before next wave (uses intermission)
- [ ] **Boss Warning**: 2-second "BOSS INCOMING" warning before spawn

#### C3) Boss Warning System ✅
- [x] **Warning Timer**: 2-second dramatic warning before boss spawn
- [x] **Visual Effects**: Pulsing red overlay, vignette, flashing text
- [x] **Boss Name Display**: Shows incoming boss name and countdown
- [x] **Clear Arena**: Enemies and bullets cleared during warning

### B) Code Quality & Stability 🛡️ ✅

#### B1) Object Pool Optimization ✅
- [x] **Array-Based Pool**: Efficient acquire/release pattern with reserve array
- [x] **Pool Pre-population**: 10 initial objects created at startup
- [x] **Reset Method**: Objects properly reset on acquire for reuse

#### B2) Error Handling ✅
- [x] **Audio Fallback**: Graceful degradation with disabled flag after 10 errors
- [x] **Event Bus Recovery**: EventBus emit() has error handling
- [ ] **Touch Fallback**: Dynamic shield button creation if missing

#### B3) State Cleanup ✅
- [x] **Comprehensive Reset**: Added missing resets (Fibonacci, boss drops, effects)
- [x] **Visual State Reset**: shake, totalTime, lightning, transition vars
- [x] **Firing System Reset**: waveStartTime, fibonacciIndex, enemiesAllowedToFire
- [ ] **Centralized Globals**: Move globals into RunState (future refactor)

### D) Mobile Experience 📱 ✅

#### D1) Touch Reliability ✅
- [x] **Shield Button Check**: Validate element exists before binding
- [x] **Fallback UI**: Create shield button dynamically via `_createShieldButton()`
- [x] **Touch Debug Mode**: F4 toggle shows touch overlay with position, axisX, shield state

#### D2) Input Polish ✅
- [x] **Deadzone Smoothing**: Gradual remap from [deadzone, 1] to [0, 1] via `_applyDeadzone()`
- [x] **Sensitivity Clamp**: Already implemented (line 67)
- [x] **Vibration Fallback**: Visual flash via `setVibrationFallback()` callback

### E) Audio Completeness 🔊 ✅

#### E1) Missing Sound Effects ✅
- [x] **Shield Activate**: 'shield' - rising shimmer (already existed)
- [x] **Shield Deactivate**: 'shieldDeactivate' - gentle descending fade
- [x] **Bullet Cancel**: 'bulletCancel' - pop sound (already existed)
- [x] **Wave Complete**: 'waveComplete' - victory jingle (already existed)
- [x] **Level Up**: 'levelUp' - triumphant ascending fanfare
- [x] **Bear Market Toggle**: 'bearMarketToggle' - ominous low rumble
- [x] **Graze Near-Miss**: 'grazeNearMiss' - subtle whoosh for close calls

#### E2) Audio Variety ✅
- [x] **Hit Sound Variants**: 'hitEnemy' (3 random), 'hitPlayer' (2 random)
- [x] **Coin Sound Context**: 'coinScore', 'coinUI', 'coinPerk' (different pitch)

### F) Content Expansion 🎮

#### F1) Weapon Variety ✅
- [x] **LASER Weapon**: Continuous beam (rate 0.06s), penetrates, cyan energy
- [x] **SPREAD Weapon**: 5-shot fan pattern, green spinning stars
- [x] **HOMING Weapon**: Tracking missiles, orange with exhaust trail
- [x] **Weapon Progression**: SPREAD unlocks at cycle 2, HOMING at cycle 3, LASER at cycle 4 (persisted in localStorage)

#### F2) Enemy Behavior ✅
- [x] **Kamikaze Enemies**: Weak tier can dive at player (0.05% per frame, scales with cycle)
- [x] **Shield Enemies**: Medium tier with 1-hit hexagonal barrier (10-50% chance based on cycle)
- [x] **Teleport Enemies**: Strong tier can dodge when player is close (1% chance, 3-5s cooldown)
- [x] **Boss Minions**: Flying money enemies with wings, spawned in Phase 3, smaller hitbox + glow

#### F3) Story Integration ✅
- [x] **Intro Dialogue**: Ship intro on selection + level complete messages
- [x] **Boss Dialogue**: Boss intro taunt + phase change taunts (per boss type)
- [x] **Victory Dialogue**: Boss defeat messages with ironic crypto/fiat commentary
- [x] **Dialogue System**: Full modular system (DialogueData, StoryManager, DialogueUI)
- [x] **Bear Market Dialogue**: Special dialogue when activating bear market mode

### G) Performance Optimization ⚡ ✅

#### G1) Calculation Caching ✅
- [x] **Difficulty Cache**: `cachedDifficulty` updated once per frame via `updateDifficultyCache()`
- [x] **Grid Speed Cache**: `cachedGridSpeed` computed with difficulty
- [x] **Color Cache**: Enemy colors pre-computed in constructor (`_colorDark30`, etc.)

#### G2) Render Optimization ✅
- [x] **Off-Screen Culling**: All entities skip draw if outside viewport
  - Enemies: ±65px bounds check
  - Bullets: ±20px bounds check (X and Y)
  - PowerUps: ±40px bounds check
  - Particles: Already had culling
- [ ] **Dirty Rectangles**: Skipped (complex, minimal benefit for this game)
- [ ] **Batch Similar Draws**: Skipped (requires canvas layer restructure)

#### G3) GC Churn Elimination (v2.16.0) ✅
- [x] **Player Trail Buffer**: Pre-allocated circular buffer, no .filter()/.shift()/.forEach()
- [x] **Homing Bullets**: Distance squared comparison, single sqrt per bullet per frame
- [x] **Touch Input**: Direct iteration instead of Array.from().find()
- [x] **Enemy Update Loop**: Consolidated 3 loops into 1, cached player position/hitbox

#### G4) Frame-Rate Independent Effects (v2.16.1) ✅
- [x] **Shake Decay**: `dt * 60` instead of fixed `-= 1`
- [x] **Impact Flash Decay**: `dt * 1.2` instead of fixed `-= 0.02`
- [x] **Screen Flash Easing**: Quadratic ease-out instead of linear decay
- [x] **Lightning Ramp-Up**: Smooth ~0.03s ramp instead of instant jump

#### G5) Screen Effects Modularization (v2.17.0) ✅
- [x] **SCREEN_EFFECTS Config**: Master toggles in BalanceConfig.js
- [x] **Removed Screen Dimming**: Was causing "lag" perception (off by default)
- [x] **Reduced Flash Opacities**: All flashes reduced 30-50%
- [x] **Config-Driven Effects**: All overlays check Balance toggles before rendering

---

### Phase 18 Priority Order:

| Sprint | Focus | Tasks | Status |
|--------|-------|-------|--------|
| **18.1** | Balance Critical | A1, A2, A3, A4 | ✅ |
| **18.2** | UX Critical | C1, C2, C3 | ✅ |
| **18.3** | Code Stability | B1, B2, B3 | ✅ |
| **18.4** | Audio | E1, E2 | ✅ |
| **18.5** | Mobile | D1, D2 | ✅ |
| **18.6** | Content | F1, F2, F3 | ✅ |
| **18.7** | Performance | G1, G2 | ✅ |

---

## Phase 19: Story Campaign Mode 📖 ✅
*Goal: Narrative-driven experience with boss progression.*
- [x] **3-Boss Arc**: FED → BCE → BOJ rotation with unique dialogues
- [x] **Unlock System**: Complete FED to unlock BCE, etc.
- [x] **Ending Screens**: Unique victory screen per final boss (campaign complete screen)
- [x] **New Game+**: Carry perks into next playthrough

### Implementation Details:
- **CampaignState.js**: Persistent campaign tracker with localStorage
- **Game Mode Toggle**: Arcade vs Campaign mode selection in intro screen
- **Boss Progression UI**: Visual display showing FED → BCE → BOJ with lock/unlock states
- **Campaign Victory Screen**: Special golden victory overlay when all bosses defeated
- **NG+ System**: Carry perks, +25% difficulty per NG+ cycle

## Phase 19.5: Bug Fixes & Balance Pass 🐛 ✅
*Goal: Fix critical bugs and balance issues from code audit (Feb 1, 2026).*

### Bug Fixes Applied:
- [x] **Duplicate Boss Phase Handler**: Removed duplicate `onBossPhaseChange()` call in Boss.js:97-100
- [x] **Teleport Bounds Fix**: Added clamping in `Enemy.js:doTeleport()` (x: 50-550, y: 100-500)
- [x] **Particle Object Pool**: Implemented in ObjectPool.js with 100 pre-allocated particles
- [x] **Ship Stats Layout**: Added CSS `order` to fix stats positioning after launch animation

### Balance Adjustments:
- [x] **Mini-Boss Threshold**: 100 → 30 kills (now spawns during normal gameplay)
- [x] **Perk Cooldown**: 8s → 4s (more perks in shorter waves)
- [x] **Graze Threshold**: 120 → 60 (achievable with 5/sec decay)
- [x] **Weapon Drop Cooldown**: 8s → 5s (more variety per wave)

### Boss Balance (Major):
- [x] **Boss HP Reduced**: 5500/500/600 → 2000/150/250 (baseHp/perLevel/perCycle)
- [x] **Boss FireTimer Phase 2**: FED 0.18s → 0.35s, BOJ 0.15s → 0.25s
- [x] **Boss FireTimer Phase 3**: FED 0.10s → 0.20s, BOJ 0.12s → 0.20s
- [x] **Boss fights now ~5-8 seconds** instead of 15+ seconds

### HarmonicConductor Cleanup:
- [x] **Removed bullet-hell patterns from normal waves** (spiral, curtain, flower, ring)
- [x] **Normal waves now use**: SYNC_FIRE, SWEEP, CASCADE, AIMED_VOLLEY only
- [x] **Bullet-hell patterns reserved for boss fights only**

### Documentation Note:
> ⚠️ The initial audit incorrectly flagged HarmonicConductor as "dead code" because
> roadmap/comments were outdated. It was actually ACTIVE and managing enemy firing.
> Always verify code behavior before removing systems marked as "unused".

### Known Issues (Non-Critical):
- [ ] **DialogueData.js**: Empty file, story dialogues not fully implemented
- [ ] **Perk Bar Hidden**: `renderPerkBar()` disabled intentionally for cleaner UI

---

## Phase 19.6: Code Consolidation ✅
*Goal: Centralize all gameplay parameters for future redesign.*

### System Modules Created:
- [x] **BalanceConfig.js** (extended): Single source of truth for ALL balance parameters
  - DIFFICULTY, PLAYER, PERK, GRAZE, ENEMY_FIRE, ENEMY_HP, GRID, DROPS, BOSS, SCORE, MEMES, TIMING, EFFECTS, UI, HITBOX, POWERUPS, WAVES
  - Helper functions for calculations (difficulty, HP, drop chance, shake, etc.)
- [x] **DropSystem.js**: Unified power-up drop management (enemy/boss drops, pity timer)
- [x] **MemeEngine.js**: Unified meme selection & display (ticker, popups, priorities)
- [x] **ColorUtils.js**: Consolidated color utilities (darken, lighten, hexToRgb, etc.)

### Code Cleanup:
- [x] Removed all external style references from comments
- [x] Standardized visual terminology to "cell-shaded"
- [x] Removed historical "was X" value comments
- [x] Fixed touch controls flash bug (opacity transition)

---

## Phase 20: Gameplay Redesign 🎮 ✅ COMPLETE
*Goal: Ridefinire il gameplay da zero sfruttando la centralizzazione dei parametri.*

### Completati:
- [x] **Curva di difficoltà a scalini** - Progressione per ciclo (0.0 → 0.30 → 0.60)
- [x] **Sistema grazing potenziato** - Punti 5→25, close bonus 2x→3x, multiplier 1.5x→2.5x
- [x] **Pattern density centralizzata** - Balance.PATTERNS con gapSize, maxBullets, complexity per ciclo
- [x] **HUD Messages toggle** - Balance.HUD_MESSAGES per testing pulito
- [x] **Sistema di scoring** - Kill streak (+10%/kill, max 2x), graze-kill synergy (+50% bonus)
- [x] **Power-up system** - Durate differenziate (base 10s, adv 8s, elite 6s), drop scaling con ciclo
- [x] **Boss fights centralizzati** - HP/fire rates/speeds in Balance.BOSS. HP: 1000 + level*30 + cycle*400
- [x] **Level progression fix** - WaveManager usa Balance.WAVES.PER_CYCLE, aggiunti WAVE4/WAVE5 messages
- [x] **Perk system centralizzato** - CANCEL_WINDOW, PERK_ICON_LIFETIME ora in Balance config
- [x] **Intro screen compatta** - Canvas 200→140, container 290→190px, arrows ridimensionate
- [x] **HUD Messages redesign** - Stili visivi distinti per tipo (verde/rosso/oro), indipendenti

### Principi guida (Ikeda Rules):
1. **Core Hitbox** - Difficoltà da pattern, non hitbox sleali
2. **Geometria Ipnotica** - Corridoi leggibili anche con molti proiettili
3. **Grazing** - Rischio = ricompensa, fonte principale di score
4. **Climax Visivo** - Densità alta ma sempre leggibile

---

## Phase 20.5: Intro Screen Redesign ✅
*Goal: Polished two-phase intro with smooth transitions.*

### Unified Intro Structure:
- [x] **Single Screen**: Replaced two separate divs with unified element show/hide
- [x] **Splash State**: Title + BTC ship + TAP TO START + yellow icons
- [x] **Selection State**: Ship arrows + stats + mode toggle + LAUNCH button
- [x] **Smooth Transition**: Ship canvas stays in place, elements fade in/out

### Ship Preview:
- [x] **Cell-Shaded Rendering**: Matches in-game ship (two-tone body, shadows)
- [x] **4-Layer Flames**: Red outer → orange → yellow → white core
- [x] **Full Details**: Fins, cockpit with highlight, crypto symbol (₿/Ξ/◎)
- [x] **Hover Animation**: Gentle floating motion

### UI Polish:
- [x] **TAP TO START**: Shine sweep effect + pulse animation + 3D shadow
- [x] **Icon Buttons**: Yellow cell-shaded style restored (mute/settings)
- [x] **Staggered Animations**: Selection elements fade in sequentially
- [x] **Responsive Sizing**: clamp() for fonts, flexible layout

---

## Phase 20.6: Bug Fixes & Game Cycle ✅
*Goal: Stabilità e razionalizzazione del ciclo di gioco.*

### Crash Fixes
- [x] **Null Safety**: Added checks to all entity loops (enemies, bullets, powerUps)
- [x] **Post-Boss Crash**: Fixed undefined entity access during transitions

### Mini-Boss System
- [x] **Wave Freeze**: `miniBossActive` flag pauses wave spawning
- [x] **Enemy Restore**: Saved enemies properly restored after mini-boss defeat
- [x] **Fibonacci Reset**: Firing ramp-up reset when enemies restored

### Game Cycle
- [x] **Level Increment**: Fixed double-increment (now once per wave only)
- [x] **currentLevel Timing**: Updated before spawnWave() for correct HP scaling
- [x] **Story System**: Verified all dialogue triggers working

---

## Phase 21: Interactive Player Manual 📖 ✅
*Goal: In-game documentation for player onboarding.*
- [x] **Manual Modal**: New `#manual-modal` with 6 tabs
- [x] **Tab Navigation**: Welcome, Controls, Power-Ups, Enemies, Bosses, Pro Tips
- [x] **Bilingual Content**: ~80 new text keys for EN and IT
- [x] **Access Points**: Book icon in intro screen + MANUAL button in pause menu
- [x] **Arcade Styling**: Bitcoin gold theme, dark background, custom scrollbar
- [x] **Responsive Design**: Mobile-friendly tab layout and content

---

## Phase 21.5: Technical Revision v2.11.0 🔧 ✅
*Goal: Fix critical and high-priority bugs identified in code audit.*

### Critical Fixes
- [x] **Division by Zero (Bullet.js:78)**: Guard clause for homing when dist < 1
- [x] **Double Release (main.js:2894)**: Removed Pool.release, keep only markedForDeletion

### High Priority Fixes
- [x] **lastGrazeTime Init (main.js:1854)**: Set to totalTime instead of 0
- [x] **Pool indexOf Safety (main.js:521)**: Check idx !== -1 before splice
- [x] **Speed Normalization (Bullet.js:88)**: Added `|| 1` fallback

### Excluded (False Positives)
- InputSystem event leak: `init()` called once, no accumulation
- ObjectPool double-release: Already protected with indexOf check
- Enemy bullet race: Protected by existing markedForDeletion check

---

## Phase 21.6: Campaign Mode Fix v2.11.1 🔧 ✅
*Goal: Fix campaign completion bug.*

### Bug Fix
- [x] **Campaign Auto-Complete Bug**: Campaign showed "complete" after defeating 1 boss
  - Root cause: localStorage retained defeated boss states from previous sessions
  - Fix: Auto-reset campaign when already complete (on mode select or game start)
  - Files: main.js (setGameMode, startGame)

---

## Phase 22: Ikeda Vision - Gameplay Redesign v2.12.0 🎮 (IN PROGRESS)
*Goal: Transform the game into an adrenaline masterpiece with risk/reward depth.*

> **Design Philosophy**: Tsuneki Ikeda (Ikaruga, Radiant Silvergun)
> - Every movement must be intentional
> - Risk = Reward (exponential, not linear)
> - Readable patterns even in chaos
> - The "trance state" - hypnotic bullet dance

---

### A) HYPER GRAZE System 🔥 (Sprint 1) ✅ COMPLETE
*Goal: Transform grazing from passive to active risk/reward.*

#### A1) HYPER Mode Mechanics
- [x] **Activation Trigger**: When grazeMeter reaches 100%, player can activate HYPER
- [x] **HYPER Button**: Press H key when meter is full (UI indicator shows)
- [x] **Duration**: 5 seconds base, +0.3s per graze during HYPER
- [x] **Score Multiplier**: 5x score during HYPER (stacks with existing multipliers)
- [x] **Risk Factor**: Core hitbox +50% size during HYPER
- [x] **Fail State**: Instant death if hit during HYPER (bypasses lives/shield)
- [x] **Cooldown**: 8 seconds after HYPER ends before meter can fill again

#### A2) HYPER Visual Effects
- [x] **Screen Tint**: Golden/amber overlay during HYPER
- [x] **Player Aura**: Intense pulsing golden glow (larger than HODL aura)
- [ ] **Bullet Trails**: Enemy bullets leave longer trails (deferred to Sprint 2)
- [x] **Time Dilation Effect**: Subtle slow-motion feel (0.92x game speed)
- [x] **Graze Particles**: Massive golden particle bursts on each graze
- [x] **Timer Display**: Countdown bar at top + ring around player

#### A3) HYPER Audio
- [x] **Activation Sound**: Epic power-up chord (`hyperActivate`)
- [ ] **Loop During HYPER**: Intensified music layer (deferred)
- [x] **Graze Sound (HYPER)**: Higher pitch, more satisfying (`hyperGraze`)
- [x] **Warning Sound**: Tick-tick-tick in final 2 seconds (`hyperWarning`)
- [x] **Deactivation Sound**: Power-down sound (`hyperDeactivate`)
- [x] **Ready Sound**: Ascending chord when meter fills (`hyperReady`)

#### A4) Balance Config ✅
```javascript
Balance.HYPER = {
    METER_THRESHOLD: 100,      // Meter value to enable HYPER
    BASE_DURATION: 5.0,        // Seconds
    GRAZE_EXTENSION: 0.3,      // Seconds added per graze
    MAX_DURATION: 12.0,        // Cap on extension
    SCORE_MULT: 5.0,           // Score multiplier
    HITBOX_PENALTY: 1.5,       // Core hitbox size multiplier
    COOLDOWN: 8.0,             // Seconds before meter refills
    TIME_SCALE: 0.92           // Game speed during HYPER (implemented)
}
```

---

### B) Hit Stop & Visual Juice 💥 (Sprint 2) ✅ COMPLETE
*Goal: Every action feels impactful.*

#### B1) Hit Stop System ✅
- [x] **Enemy Kill Freeze**: 25ms on every kill
- [x] **Streak Milestone Freeze**: 120/180/250ms on 10/25/50 kill streaks
- [x] **Boss Phase Change**: 300ms dramatic pause
- [x] **Boss Defeat**: 500ms epic slowmo
- [x] **Close Graze Freeze**: 20ms micro-freeze on <12px graze
- [x] **Player Hit Freeze**: 80ms slowmo on taking damage

#### B2) Screen Flash System ✅
- [x] **Close Graze Flash**: Quick white flash (40ms, 15% opacity)
- [x] **HYPER Activation Flash**: Golden flash (120ms, 40% opacity)
- [x] **Kill Streak Flash**: Color flash matching milestone (cyan/gold/purple)
- [x] **Boss Phase Flash**: Orange flash (150ms, 50% opacity)
- [x] **Boss Defeat Flash**: Massive white flash (250ms, 70% opacity)
- [x] **Player Hit Flash**: Red flash (60ms, 30% opacity)

#### B3) Score Pulse System ✅
- [x] **10K Milestone**: Golden edge glow with radial gradient
- [x] **Score Number Juice**: Large floating "+X" with velocity and fade
- [ ] **Combo Counter**: Visual combo display that scales with streak (deferred)

#### B4) Camera Shake Refinement (Deferred to Sprint 3)
- [ ] **Directional Shake**: Shake direction matches impact direction
- [ ] **Shake Decay Curve**: Exponential decay instead of linear
- [ ] **Micro-Shake**: Subtle constant shake during HYPER mode

#### B5) Balance Config
```javascript
Balance.JUICE = {
    HIT_STOP: {
        ENEMY_KILL: 0.02,
        STREAK_10: 0.15,
        STREAK_25: 0.20,
        STREAK_50: 0.25,
        BOSS_PHASE: 0.30,
        CLOSE_GRAZE: 0.03,
        PLAYER_HIT: 0.10
    },
    FLASH: {
        CLOSE_GRAZE: { duration: 0.05, opacity: 0.2, color: '#FFFFFF' },
        HYPER_ACTIVATE: { duration: 0.10, opacity: 0.4, color: '#FFD700' },
        STREAK_10: { duration: 0.08, opacity: 0.3, color: '#00FFFF' },
        STREAK_25: { duration: 0.10, opacity: 0.4, color: '#FFD700' },
        STREAK_50: { duration: 0.12, opacity: 0.5, color: '#9B59B6' },
        BOSS_DEFEAT: { duration: 0.30, opacity: 0.8, color: '#FFFFFF' }
    },
    SCORE_PULSE: {
        THRESHOLD: 10000,
        SCALE: 1.02,
        DURATION: 0.20
    }
}
```

---

### C) Wave Choreography 💃 (Sprint 3) ✅ COMPLETE
*Goal: Transform random chaos into readable bullet ballet.*

#### C1) Synchronized Row Firing (Existing in HarmonicConductor)
- [x] **Row Commander**: CASCADE_DOWN/UP handles row-based firing
- [x] **Fire Delay Per Row**: Configurable via ROW_FIRE_DELAY (0.4s)
- [x] **Pattern Assignment**: PATTERNS array in config

#### C2) Bullet Pattern Types (Existing + New Config)
- [x] **ARC**: Defined in PATTERN_DEFS (7 bullets, 120° spread)
- [x] **WALL**: Defined in PATTERN_DEFS (8 bullets, 2 gaps)
- [x] **AIMED**: Defined in PATTERN_DEFS (5 bullets at player)
- [x] **RAIN**: Defined in PATTERN_DEFS (12 drops, 3 safe lanes)

#### C3) Wave Intensity Curve ✅
- [x] **Setup Phase (0-30%)**: 1.0x fire rate, learning time
- [x] **Build Phase (30-85%)**: 1.1x → 1.2x fire rate
- [x] **Panic Phase (85%+)**: 1.4x fire rate, red vignette
- [x] **Last Enemy Silence**: 0.8s pause, 2x score for final kill

#### C4) Pattern Readability ✅
- [x] **Telegraph Lines**: Configurable duration/opacity
- [x] **Gap Highlighting**: Green safe corridor indicators
- [x] **Pattern Preview**: Ring/aimed/pattern telegraph styles

#### C5) Balance Config ✅
```javascript
Balance.CHOREOGRAPHY = {
    ROW_FIRE_DELAY: 0.4,
    PATTERNS: ['ARC', 'WALL', 'AIMED'],
    INTENSITY: {
        SETUP_END: 0.30, BUILD_END: 0.70, PANIC_START: 0.85,
        PANIC_RATE_MULT: 1.4, LAST_ENEMY_PAUSE: 0.8, LAST_ENEMY_BONUS: 2.0
    },
    TELEGRAPH: {
        ENABLED: true, DURATION: 0.25, OPACITY: 0.35,
        COLOR: '#FF6600', GAP_GLOW: true, GAP_COLOR: '#00FF00'
    },
    PATTERN_DEFS: { ARC: {...}, WALL: {...}, AIMED: {...}, RAIN: {...} }
}
```

---

### D) Satoshi's Sacrifice 🔥 (Sprint 4) ✅ COMPLETE
*Goal: The ultimate risk/reward moment.*

#### D1) Activation Conditions ✅
- [x] **Trigger**: Player at 1 life and takes fatal hit
- [x] **Window**: 2-second decision window (0.25x slow-mo)
- [x] **Visual Prompt**: Golden pulsing Bitcoin sacrifice button
- [x] **Audio Cue**: Heartbeat + tension drone

#### D2) Sacrifice Mechanics ✅
- [x] **Cost**: ALL accumulated score reset to 0
- [x] **Reward**: 10 seconds of TOTAL INVINCIBILITY
- [x] **Scoring**: All kills during Sacrifice worth 10x points
- [x] **No Graze**: Bullets pass through player completely
- [x] **Timer Display**: Large "SATOSHI MODE" countdown

#### D3) Outcome States ✅
- [x] **Success**: Earn >= sacrificed score
  - Display: "SATOSHI APPROVES 💎"
  - Bonus: Extra life awarded
- [x] **Failure**: Earn < sacrificed score
  - Display: "NGMI 📉"
  - Player survives anyway
- [x] **Tracking**: Real-time progress display (earned / needed)

#### D4) Visual Effects ✅
- [x] **Activation**: Dark overlay + golden button
- [x] **During**: Player white glow + ghost trail
- [x] **Bullets**: Pass through (no collision)
- [x] **Countdown**: 64px pulsing numbers
- [x] **End Flash**: Gold (success) or red (fail)

#### D5) Balance Config ✅
```javascript
Balance.SACRIFICE = {
    TRIGGER_HP: 1, ENABLED: true,
    DECISION_WINDOW: 2.0, DECISION_TIME_SCALE: 0.25,
    INVINCIBILITY_DURATION: 10.0, SCORE_MULT: 10.0,
    SUCCESS_THRESHOLD: 1.0, SUCCESS_BONUS_LIVES: 1,
    BUTTON_SIZE: 100, COUNTDOWN_FONT_SIZE: 64,
    GLOW_COLOR: '#FFFFFF', GHOST_TRAIL_COUNT: 5
}
```

---

### E) Graze Sound Design 🎵 (Sprint 1 - Quick Win) ✅ COMPLETE
*Goal: Audio feedback that creates the "theremin of danger".*

- [x] **Distance-Based Pitch**: Closer = higher pitch (config: SOUND_PITCH_BASE/CLOSE)
- [x] **Throttle Reduction**: 150ms → 50ms between sounds (Balance.GRAZE.SOUND_THROTTLE)
- [x] **Graze Chain Sound**: Consecutive grazes increase pitch progressively (grazeCombo in AudioSystem)
- [x] **Near-Miss Whoosh**: Distinct sound for close graze (`grazeNearMiss`)

---

### Implementation Priority

| Sprint | Focus | Complexity | Impact | Status |
|--------|-------|------------|--------|--------|
| **22.1** | HYPER GRAZE + Graze Sound | Medium | 🔴 HIGH | ✅ DONE |
| **22.2** | Hit Stop + Visual Juice | Low | 🟡 MEDIUM | ✅ DONE |
| **22.3** | Wave Choreography | High | 🔴 HIGH | ✅ DONE |
| **22.4** | Satoshi's Sacrifice | Medium | 🟡 MEDIUM | ✅ DONE |

### Files to Modify

| File | Changes |
|------|---------|
| `BalanceConfig.js` | Add HYPER, JUICE, CHOREOGRAPHY, SACRIFICE configs |
| `Player.js` | HYPER mode state, hitbox scaling, visual effects |
| `main.js` | Hit stop system, flash system, sacrifice logic |
| `WaveManager.js` | Intensity curve, row choreography |
| `Enemy.js` | Synchronized firing, pattern execution |
| `AudioSystem.js` | HYPER sounds, graze pitch system, sacrifice audio |
| `InputSystem.js` | HYPER activation button, sacrifice button |

---

## Phase 23: Technical Debt & Architecture (v2.14.x) 🔧
*Goal: Code quality, maintainability, and test coverage through incremental sprints.*

### Sprint 23.0: Enemy Firing Refactor ✅ COMPLETE (v2.13.0)
- [x] **Enemy Firing System Refactor** ✅ COMPLETE
  - Removed Fibonacci system entirely
  - HarmonicConductor now sole authority for enemy firing
  - Added DEFAULT_BASIC fallback sequence
  - Fixed BURST pattern handling
  - Files modified: main.js, HarmonicConductor.js, HarmonicSequences.js, Enemy.js, BalanceConfig.js

---

### Sprint 23.1: Quick Wins ✅ COMPLETE (v2.14.0)
*Goal: Zero-risk improvements with immediate benefit.*

- [x] **MathUtils.js**: Create new utility module ✅
  - `distance()`, `distanceSquared()`, `magnitude()`, `normalize()`
  - `direction()`, `velocityTowards()`, `angleBetween()`, `angleToVelocity()`
  - `clamp()`, `clampMagnitude()`, `clampToRadius()`, `isWithinDistance()`, `lerp()`
  - Added `CircularBuffer` class
  - File: `src/utils/MathUtils.js` (~200 lines)

- [x] **FloatingTexts Slot Reuse**: Replace array.shift() O(n) with O(1) ✅
  - `findFloatingTextSlot()` reuses expired/empty slots
  - Unified MAX_FLOATING_TEXTS = 8
  - No more array element shifting

- [x] **AudioSystem Guard Clauses**: Add null checks to init() ✅
  - Check AudioContext support before instantiation
  - Validate createGain/createDynamicsCompressor results
  - Safe getOutput() handles null ctx

- [x] **ParticlePool Stack Pattern**: Replace filter()/find() with stack pointer ✅
  - `acquire()`: O(n) → O(1) stack increment
  - `release()`: O(1) swap with last active
  - `getActive()`: O(n) → O(1) slice
  - `activeCount`: O(n) → O(1) direct read

---

### Sprint 23.2: System Extraction - Core (v2.14.1) 🚧 IN PROGRESS
*Goal: Extract critical systems from main.js.*

- [ ] **CollisionSystem.js**: New system module (~400 lines)
  - Extract from: main.js:2500-3100
  - File: `src/systems/CollisionSystem.js`
  - Interface:
    - `checkBulletEnemyCollisions(bullets, enemies, boss, callbacks)`
    - `checkEnemyBulletPlayerCollision(enemyBullets, player, callbacks)`
    - `checkPowerUpCollision(powerUps, player, callback)`
    - `checkGrazeCollisions(enemyBullets, player, grazeRadius)`
    - `aabbCollision(a, b)`
  - Note: Tightly coupled with game logic - needs callback pattern

- [x] **ParticleSystem.js**: New system module ✅ COMPLETE
  - File: `src/systems/ParticleSystem.js` (~450 lines)
  - 12 particle creation functions extracted
  - `init()`, `setDimensions()`, `clear()` lifecycle
  - `update(dt)`, `draw(ctx)` for game loop
  - main.js functions delegate to G.ParticleSystem

---

### Sprint 23.3: System Extraction - Rendering (v2.14.2) 🆕
*Goal: Separate rendering logic from main.js.*

- [→] **UIRenderer.js**: Deferred to Sprint 23.4 ⏳
  - **Reason**: HUD is DOM-based (HTML elements), not canvas. Canvas UI functions (`drawHyperUI`, `drawSacrificeUI`, `drawTypedMessages`) are tightly coupled to game state variables. Better to extract during main.js decomposition when state management is refactored.
  - **DOM functions to move**: `updateGrazeUI`, `updateLivesUI`, `updateLevelUI`, `updateShipUI`, `updateCampaignProgressUI`
  - **Canvas functions to move**: `drawHyperUI`, `drawSacrificeUI`, `drawTypedMessages`, `drawPerkIcons`

- [x] **EffectsRenderer.js**: New system module (~330 lines) ✅
  - Extract from: main.js (scattered effect code)
  - File: `src/systems/EffectsRenderer.js`
  - Interface:
    - Triggers: `applyShake()`, `applyImpactFlash()`, `applyHitStop()`, `setHitStop()`
    - Triggers: `triggerScreenFlash()`, `triggerScorePulse()`, `checkScorePulse()`
    - Drawing: `applyShakeTransform()`, `drawImpactFlash()`, `drawScreenFlash()`
    - Drawing: `drawScorePulse()`, `drawHyperOverlay()`, `drawSacrificeOverlay()`, `drawVignette()`
    - State: `getShake()`, `getHitStopTimer()`, `isHitStopActive()`

---

### Sprint 23.4: main.js Decomposition (v2.15.0)
*Goal: Break down the monolithic main.js file.*

- [ ] **main.js Decomposition**: Split 4000+ line file into logical modules
  - GameLoop.js (update/draw cycle)
  - StateManager.js (game states, transitions)
- [ ] **Global Variable Cleanup**: Move globals into RunState or dedicated managers
- [ ] **Magic Numbers**: Extract remaining hardcoded values to BalanceConfig

---

### Hotfix 23.4.1: Post-Refactor Fixes (v2.15.1) ✅ COMPLETE
*Goal: Fix bugs introduced by Sprint 23.4 module extraction.*

- [x] **Critical Fix**: `gameInfoMessages is not defined` crash on game start
- [x] **Visual Fix**: Black background during INTRO (SkyRenderer not initialized)
- [x] **Animation Fix**: Launch glitch - UI overlapping during ship takeoff
- [x] **Service Worker Rewrite**: Network-first strategy, proper versioning, complete asset list

---

### Sprint 24: Code Quality & App Store Prep ✅ COMPLETE (v2.15.9)
*Goal: Fix memory leaks, clean up code, prepare for future App Store submission.*

> **Context**: Audit del 2026-02-03 ha identificato 22 criticità. Analisi approfondita ha ridotto a 2 fix reali necessari.
> **Hotfixes v2.15.5-v2.15.9**: Risolti crash launch animation, PWA notch/Dynamic Island, backToIntro blank screen.

#### Phase A: Memory Leak Fixes 🧠 ✅ COMPLETE (v2.15.2)
*Priority: HIGH - Causa instabilità su sessioni lunghe*

- [x] **A1. DialogueUI Event Listeners** (`src/story/DialogueUI.js`)
  - Aggiunto `_listenersAttached` flag per prevenire duplicati
  - Salvati handler come proprietà per cleanup
  - Aggiunto metodo `destroy()` per cleanup completo

- [x] **A2. InputSystem Debug Handler** - GIÀ IMPLEMENTATO CORRETTAMENTE
  - `_hideDebugOverlay()` già rimuove i listener (linee 309-313)
  - Nessuna fix necessaria

- [x] **A3. Timer Cleanup** - NON NECESSARIO
  - Tutti i setTimeout sono one-shot per animazioni brevi
  - Nessun memory leak reale identificato

#### Phase B: iOS Audio & Input Fixes 🎵 ✅ COMPLETE (v2.15.2)
*Priority: HIGH - Critico per esperienza mobile*

- [x] **B1. AudioContext Resume** - GIÀ IMPLEMENTATO CORRETTAMENTE
  - `toggleMute()` già fa `ctx.resume()` e `unlockWebAudio()`
  - Design corretto: unmute esplicito rispetta autoplay policy

- [x] **B2. Passive Event Listeners** (`src/core/InputSystem.js`)
  - Shield button: aggiunto `{ passive: false }` a touchstart/touchend
  - General touchend: aggiunto `{ passive: true }` per coerenza

- [x] **B3. Safe Area Orientation** - GIÀ IMPLEMENTATO
  - `orientationchange` handler esiste (linea 878)
  - Chiama `resize()` che aggiorna `safeAreaInsets`

#### Phase C: Code Cleanup 🧹 ✅ COMPLETE (v2.15.3)
*Priority: MEDIUM - Professionalità e manutenibilità*

- [x] **C1. Console.log Removal**
  - Rimossi log non essenziali: "Starting App...", "[InputSystem] Shield button created"
  - Debug mode toggle ora logga solo quando attivo
  - GameCenter mock log commentato per production
  - Mantenuti console.warn/error per errori reali (AudioSystem, CampaignState, Bullet)
  - SW logs mantenuti per debugging cache behavior

- [x] **C2. Versioning Single Source**
  - Aggiunta documentazione cross-reference in Constants.js e sw.js
  - CLAUDE.md aggiornato con procedura esplicita di version sync
  - Checklist include ora: Constants.js + sw.js + CHANGELOG.md

- [x] **C3. Asset Error Handling** - GIÀ IMPLEMENTATO
  - `loadAssets()` già ha console.warn per load failures (linea 62)
  - Alpha validation per immagini (linea 56)
  - Nessun intervento necessario

#### Phase D: Asset & Metadata Fixes 📦 ✅ COMPLETE (v2.15.4)
*Priority: MEDIUM - Necessario per App Store submission*

- [x] **D1. Icon PNG Conversion**
  - ✅ Creato icon-512.svg (sorgente vettoriale)
  - ✅ Convertito icon-512.png in PNG reale (era JPEG)
  - ⏳ Set completo iOS (120, 152, 167, 180, 1024px) - da fare con tool esterno

- [x] **D2. Privacy Policy**
  - ✅ Creato PRIVACY.md con policy completa
  - ✅ Documenta localStorage only, no tracking, no ads
  - ⏳ Link in footer/settings - opzionale

- [x] **D3. I18N Audit**
  - ✅ Aggiunte 10 chiavi mancanti (EN + IT)
  - ✅ Aggiornato index.html con ID per elementi traducibili
  - ✅ Esteso updateUIText() per tradurre intro screen e HUD

#### iOS PWA Hotfixes 📱 ✅ COMPLETE (v2.15.5-v2.15.9)
*Priority: CRITICAL - Testati su iPhone 14 Pro*

- [x] **v2.15.5** - destroyTargets ReferenceError fix
- [x] **v2.15.6** - PWA notch safe area (--pwa-top-inset CSS variable)
- [x] **v2.15.7** - Dynamic Island support (59px minimum inset)
- [x] **v2.15.8** - HUD score positioning + EXIT button selector
- [x] **v2.15.9** - backToIntro() reset opacity/transform for all elements

#### Phase E: Future App Store Prep (Deferred) 📱
*Priority: LOW - Da fare quando decidiamo di pubblicare*

- [ ] **E1. Capacitor Setup** - iOS native wrapper
- [ ] **E2. Game Center Integration** - Leaderboard reali
- [ ] **E3. App Store Screenshots** - Marketing assets
- [ ] **E4. TestFlight Beta** - Testing pre-release

---

### Sprint 25: Performance & Architecture (v2.17.0)
*Goal: Ottimizzare performance e consolidare architettura.*

#### Performance
- [ ] **Spatial Partitioning**: Grid-based collision O(n) instead of O(n²)
- [ ] **Draw Call Batching**: Group similar entities
- [ ] **Object Pool Audit**: Verificare tutti gli oggetti sono pooled

#### Architecture
- [ ] **Entity Factory**: Centralize entity creation
- [ ] **Event System Audit**: Document all events, remove unused
- [ ] **State Machine**: Formalizzare game states

---

### Sprint Dependencies (Updated)

```
Sprint 23.4 ✅ ──> Hotfix 23.4.1 ✅
                        │
                        v
              ┌─────────────────┐
              │   Sprint 24     │ ◄── CURRENT
              │ Code Quality &  │
              │ App Store Prep  │
              └────────┬────────┘
                       │
          ┌────────────┼────────────┐
          v            v            v
      Phase A      Phase B      Phase C
      Memory       iOS Audio    Code
      Leaks        & Input      Cleanup
          │            │            │
          └────────────┼────────────┘
                       v
              ┌─────────────────┐
              │   Sprint 25     │
              │  Performance &  │
              │  Architecture   │
              └─────────────────┘
```
              Module Consolidation
                        │
                        v
                Sprint 23.6
             Performance & Testing
```

### Expected Impact

| Metric | Before | After 23.3 | After 23.6 |
|--------|--------|------------|------------|
| **main.js lines** | 5055 | ~3500 | ~2000 |
| **Distance duplications** | 12 | 0 | 0 |
| **floatingTexts shift** | O(n) | O(1) | O(1) |
| **Collision complexity** | O(n²) | O(n²) | O(n) |
| **Testability** | Low | Medium | High |
| **New files** | 0 | 5 | 8+ |

---

## Phase 24: Leaderboards & Social 🏆 (Future)
*Goal: Competition and sharing.*
- [ ] **Local Leaderboard**: Top 10 scores with date
- [ ] **Share Score**: Screenshot + share button
- [ ] **Daily Challenge**: Seeded run with global ranking
- [ ] **Achievements**: 20+ achievements with icons

---

## 📋 Quick Reference: Phase 22 Sprints

```
Sprint 22.1: HYPER GRAZE + Graze Sound ✅ COMPLETE (v2.12.0)
├── Balance.HYPER config
├── Player.js: HYPER state machine
├── main.js: HYPER activation logic
├── AudioSystem.js: Pitch-based graze
└── Visual: Golden aura, time dilation

Sprint 22.2: Hit Stop + Visual Juice ✅ COMPLETE (v2.12.1)
├── Balance.JUICE config
├── main.js: applyHitStop(), triggerScreenFlash()
├── Score pulse effects (edge glow)
├── Floating score numbers
└── Boss phase/defeat juice

Sprint 22.3: Wave Choreography ✅ COMPLETE (v2.12.2)
├── Balance.CHOREOGRAPHY config
├── HarmonicConductor: Wave intensity tracking
├── SETUP/BUILD/PANIC phase detection
├── Last enemy pause + 2x bonus
├── Gap telegraph visualization
└── Panic phase red vignette

Sprint 22.4: Satoshi's Sacrifice ✅ COMPLETE (v2.12.3)
├── Balance.SACRIFICE config
├── 2s decision window with 0.25x slowmo
├── Golden Bitcoin sacrifice button
├── 10s invincibility + 10x score
├── Ghost trail + white glow effects
├── Success/Fail outcome with extra life
└── 4 new audio sounds
├── Balance.CHOREOGRAPHY config
├── WaveManager.js: Intensity curve
├── Enemy.js: Row sync firing
├── Pattern types (ARC, WALL, SPIRAL)
└── Telegraph visualization

Sprint 22.4: Satoshi's Sacrifice
├── Balance.SACRIFICE config
├── main.js: Sacrifice state machine
├── Death intercept logic
├── 10s invincibility mode
└── Success/Failure outcomes
```
