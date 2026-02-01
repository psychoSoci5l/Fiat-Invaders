# Roadmap: Fiat Invaders -> iOS App Store Ready 📱

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
- [x] **Power-Up Nerfs**: Triple weapons ~1.5-1.8x DPS (was 2.5x), ship bonuses reduced
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
6. **Pass 6**: Paper Mario style background ✅
   - Cielo a bande piatte (no gradienti) per tutti i 5 livelli + boss + bear market
   - Nuvole flat con two-tone e bold outline
   - Stelle stile Paper Mario (4-point star shape)
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

## Phase 19: Story Campaign Mode 📖 (Future)
*Goal: Narrative-driven experience with boss progression.*
- [ ] **3-Boss Arc**: FED → BCE → BOJ rotation with unique dialogues
- [ ] **Unlock System**: Complete FED to unlock BCE, etc.
- [ ] **Ending Screens**: Unique victory screen per final boss
- [ ] **New Game+**: Carry perks into next playthrough

## Phase 20: Leaderboards & Social 🏆 (Future)
*Goal: Competition and sharing.*
- [ ] **Local Leaderboard**: Top 10 scores with date
- [ ] **Share Score**: Screenshot + share button
- [ ] **Daily Challenge**: Seeded run with global ranking
- [ ] **Achievements**: 20+ achievements with icons
