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
- [x] **Panic Selling**: Enemy vertical drop pattern on Wave 5+.
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
- [x] **Difficulty Spike**: Faster enemies (1.5x), Panic from Wave 2 (SINE_WAVE), 1HP Challenge, aggressive drop (35px).

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
- [x] **Cycle Warning**: "CYCLE X - HARDER!" popup after boss.
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
