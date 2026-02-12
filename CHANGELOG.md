# Changelog

## v4.56.0 - 2026-02-12
### Enemy Neon Cyberpunk Restyling + Colored Enemy Bullets

- **Enemy neon restyling**: All 4 enemy shapes (coin, bill, bar, card) redesigned — removed flat cell-shading, replaced with dark body + neon bright outline + additive glow halo
- **Enemy glow halo**: Batched additive radial gradient per enemy with sin-pulse animation (configurable via `GLOW.ENEMY`)
- **Symbol neon glow**: Currency symbols now have `shadowBlur` glow matching enemy color
- **Card holographic shimmer**: Credit card enemies have subtle alpha-pulsing holographic overlay
- **Bar symbol fix**: Symbol changed from black (#111) to white with glow for consistency
- **Colored enemy bullets**: Enemy bullet body now uses the color of the enemy that fired it — instantly shows which tier enemy shot where
- **Ruble color update**: `#8899bb` → `#6699dd` (more electric blue, less grey)

## v4.55.0 - 2026-02-12
### Ship Evolution + BTC Lock

- **Ship body evolution**: Ship visually transforms as weapon level increases — LV1 base, LV2 side gun pods, LV3 longer pods + body belt + extended fins, LV4 central barrel + wider body + fin thrusters, LV5 armor plates + pulsing glow + enhanced engine
- **GODCHAIN form**: Energy circuit lines on body, wing energy trails, central energy core orb, glowing BTC logo, wider body + aggressive fins — full visual transformation
- **Engine flame scaling**: Reactor flame grows progressively larger with weapon level (+12% per level)
- **Muzzle flash update**: Flash now fires from side gun pods (LV2+) and central barrel (LV4+) matching visual cannons
- **Weapon pips removed**: Diegetic HUD triangles above ship removed — ship body itself now communicates weapon level
- **Ship selection locked to BTC**: Arrows and ETH/SOL cards hidden, cycleShip disabled, hangar simplified to single ship

## v4.54.0 - 2026-02-12
### Purple Asset Refresh + PWA Safe Area Fix

- **Splash video**: New purple-themed `splashscreen.mp4` replaces old orange version
- **App icon (SVG + 7 PNGs)**: Ship recolored from BTC orange to neon violet (#bb44ff), purple engine flames, deep space background (#1a0a30→#030308)
- **manifest.json**: `theme_color` → `#bb44ff`, `background_color` → `#030308` (deep space)
- **StoryScreen PWA fix**: Added `safeAreaInsets.top` offset to canvas text — story title no longer hidden under iOS status bar in standalone PWA mode

## v4.53.0 - 2026-02-12
### Premium Purple Neon Unification

- **Button system redesign**: All buttons from gold gradient to neon violet outline style (`--btn-violet-*` vars). Ghost fill + glowing border for premium cyberpunk look
- **New CSS palette**: `--neon-violet: #bb44ff` replaces `--neon-orange`. `--btn-violet-border/glow/fill/hover` replace `--btn-gold-*`
- **btn-primary**: Neon outline (violet border, dark fill, white text) instead of solid gold gradient
- **btn-cta**: TAP TO START ghost → violet ghost. LAUNCH state → solid violet gradient with white text
- **btn-toggle/icon/icon-round/pwa**: All converted to violet theme
- **Pause menu**: Removed decorative symbols from buttons, centered text, increased gap
- **Intro screen**: Mode pills, mode description, ship arrows, score labels, arcade records → violet
- **Gameover**: Final score glow, NEW BEST badge, roast message → violet. Inline styles moved to CSS
- **Settings**: Modal border, title, slider thumbs, section headers → violet
- **What's New**: Panel border, title, version borders, notification glow → violet
- **Manual**: Container border, title, tab active, section headings, table headers, scrollbar → violet
- **Tutorial**: Container border, title → violet
- **Pause button (II)**: Gold pill → violet pill
- **BTC Ship**: Orange (#F7931A) → violet (#bb44ff) — body, nose cone, ship card, dialogue speaker
- **Story screen**: Text highlights (years, keywords, percentages) → violet
- **PWA banner**: Border and install icon → violet
- **~109 hardcoded gold→violet** replacements across CSS, preserving gameplay gold (HUD score, GODCHAIN, streaks, tier-medium, boss phases)
- **Preserved**: HUD score stays gold (#ffaa00), score-row-value stays gold, GODCHAIN/HYPER effects, boss phase colors, bullet/explosion colors, btn-danger stays magenta

## v4.52.0 - 2026-02-12
### Visual Overhaul — Dark Cyberpunk Neon

- **New palette**: Deep space violet-black backgrounds, neon magenta (#ff2d95), cyan (#00f0ff), gold (#ffaa00), green (#39ff14)
- **Sky system**: All 5 level gradients reworked from bright blue to nebula violet→void progression. Stars visible from L1. Firefly particles (cyan/magenta) replace dust/pollen. Clouds now dark nebula wisps
- **Title**: FIAT → neon magenta glow, CRYPTO → neon cyan glow, VS → cyan flash
- **CSS overhaul**: ~100 color replacements across buttons, modals (dark bg + cyan borders), message strips, curtain overlays, manual/whatsnew panels
- **Enemies**: 10 fiat currencies with neon-saturated colors, outlines now tinted per-enemy color (not flat black)
- **Weapons**: All 7 bullet types recolored neon (WIDE purple, NARROW blue, FIRE red, SPREAD green, HOMING orange, PIERCE red, MISSILE blue)
- **Bosses**: FED → neon green (#00ff66), eye pupils phase 3 → green glow (#39ff14). BCE gold intensified. Identity colors preserved
- **PowerUps/Perks/Particles**: All aligned to neon palette. Boss death explosions, perk rarity colors, powerup config updated
- **Preserved**: Ship BTC/ETH/SOL colors, enemy bullets (white), currency symbols (white), all gameplay/audio unchanged

## v4.51.0 - 2026-02-12
### What's New iOS Fix + Update Notification

- **iOS scroll fix**: What's New panel now scrolls correctly on real iPhones — added `#whatsnew-panel` to InputSystem touch passthrough whitelist (root cause: `handleTouch` was calling `preventDefault()` on the panel)
- **Update notification glow**: What's New button pulses with gold glow when a new version is detected (compares `G.VERSION` vs `fiat_whatsnew_seen` in localStorage). Glow dismissed on open.

## v4.50.0 - 2026-02-12
### Arcade Mode Enhancements

- **Separate high scores**: Story and Arcade modes now track independent high scores (`fiat_highscore_story` / `fiat_highscore_arcade`) with one-time migration from legacy key
- **Arcade gameover stats**: Cycle, Level, and Wave displayed on game over screen (Arcade only)
- **Arcade Records**: Persistent tracking of best cycle, best level, and best kills with "NEW BEST!" badge on game over
- **Intro screen records**: Arcade records displayed below high score in selection screen (hidden if no records yet)
- **What's New panel**: Accessible from intro screen icon — shows version history and planned features for testers
- **No more localStorage wipe**: Records and preferences now persist across version updates
- **i18n**: Added EN/IT strings for NEW_BEST, BEST_CYCLE, BEST_LEVEL, BEST_KILLS, WHATS_NEW, CLOSE

## v4.49.0 - 2026-02-12
### Architectural Refactor — Module Extraction + Test Suite

- **FloatingTextManager.js**: Extracted floating text + score popup system from main.js into standalone module (~80 lines)
- **PerkIconManager.js**: Extracted perk glow icon rendering from main.js into standalone module (~120 lines)
- **PerkManager.js**: Extracted perk choice/roll/apply logic from main.js with dependency injection pattern (~170 lines)
- **MiniBossManager.js**: Extracted mini-boss spawn/update/draw/hit from main.js with callback pattern (~300 lines)
- **Test suite**: Added tests/runner.html with zero-dependency test framework, ~50 assertions covering MathUtils, ColorUtils, BalanceConfig, ObjectPool, GameStateMachine, RunState
- **NOTES.md**: Rewritten with current gameplay systems (v4.47 weapon evolution, v4.38 proximity kill, wave system v4.40+)
- **roadmap.md**: Updated with refactor progress and future ideas
- **main.js**: Reduced from ~5,470 to ~4,820 lines (~12% reduction), all extracted functions replaced with one-liner wrappers

## v4.48.0 - 2026-02-12
### Balance Recalibration Post-Weapon Evolution

- **Enemy HP rebalanced**: BASE 18→28 (+55%), SCALE 30→40, CYCLE_MULT C2 2.5×, C3 3.2× — compensates triple-spread all-hit pattern
- **Boss HP rebalanced**: BASE 3000→5000, PER_LEVEL 65→100, PER_CYCLE 4000→5000, CYCLE_MULT [1.0, 2.5, 2.2], MIN_FLOOR 2500→4000
- **GODCHAIN re-trigger fix**: UPGRADE drops now reach player at max weapon level (were converted to specials). Pity timer works at max level. Suppression never blocks UPGRADE drops
- **Adaptive drop intelligence**: Need-based category uses GODCHAIN_RECHARGE_NEED (0.35) at max level, gradual special/utility need based on player state (hasShield, hasSpeed)
- **Weapon pacing slower**: KILLS_FOR_UPGRADE 30→50 (LV5 reached in cycle 2 instead of minute 1:09)
- **Entity Density Tracker**: `dbg.entityReport()` — samples every 30 frames, reports session averages, density by wave, hot spots (>100 entities), player bullet analysis
- **Formation safety**: Y-cap for safety net rows, pixel cap on Y-clamping, filled chevron algorithm
- **Campaign victory transition**: STORY_SCREEN→CAMPAIGN_VICTORY added to state machine

## v4.47.0 - 2026-02-12
### Weapon Evolution Redesign

- **Linear 5-level weapon system**: Replaced 3 shot levels + 3 modifier layers with a clean 1→5 progression (Single → Dual → Dual+ → Triple → Triple MAX). Each level has fixed cooldown, damage, and spread stats
- **HYPER weapon boost**: HYPER mode now adds +2 temporary weapon levels (LV6 HYPER+, LV7 HYPER++), replacing the old modifier-stacking approach
- **GODCHAIN simplified**: Activates at weapon level 5 (was: need 2 of 3 overlapping modifiers — mathematically near-impossible)
- **Specials reduced to 3**: HOMING, PIERCE, MISSILE only. LASER removed (absorbed into PIERCE). Exclusive, 12s duration
- **Utility drops**: SHIELD and SPEED are now "utility" category with distinct capsule-shaped visual, separate from weapon specials
- **Adaptive drops simplified**: 2-axis power score (weapon level + special) instead of 3-axis (shot + modifiers + special). Categories: UPGRADE/SPECIAL/UTILITY
- **Removed**: RATE/POWER/SPREAD modifiers, LASER weapon/bullet, modifier diamond power-up visual, modifier timer tracking, modifier overlap analytics
- **Bullet pierce scales with level**: +0.5 pierce HP per weapon level (replaces POWER modifier bonus)
- **Diegetic HUD**: 5 weapon pips (was 3), HYPER-boosted pips pulse gold, no modifier glow indicators

## v4.46.0 - 2026-02-12
### Backlog Closure — Formations, Collisions, Polish

- **Privacy link in Settings**: Discrete text link under Help/Credits opens privacy summary modal, localized EN/IT
- **iOS icon set**: `scripts/generate-icons.js` (sharp) generates 120/152/167/180/192/1024px icons. Updated `manifest.json` + apple-touch-icon meta tags
- **Formation visual audit**: `dbg.formations()` renders all formations at 360/414/768px widths as overlay, reports off-screen and spacing issues
- **Currency symbol formations**: 5 new formations (BTC_SYMBOL, DOLLAR_SIGN, EURO_SIGN, YEN_SIGN, POUND_SIGN) — polyline path distribution, auto-rotate into cycle 4+ waves (30% swap chance)
- **Formation entry paths**: 4 entry path types (SINE, SWEEP, SPIRAL, SPLIT) with weighted random selection per wave. Config in `FORMATION_ENTRY.PATHS`
- **Spatial partitioning**: `SpatialGrid.js` hash grid (80px cells) accelerates player-bullet-vs-enemy and bullet-cancellation collision checks. Fallback to original loops if grid unavailable

## v4.45.0 - 2026-02-11
### Cinematic Story Screens

- **Gradient background**: Deep blue→black gradient replaces flat black, radial vignette at edges
- **Star glow**: 80 stars with soft blue halo, twinkling animation
- **Keyword highlighting**: Key terms (Bitcoin, FIAT, Nixon, Bretton Woods, etc.) in gold, years/percentages in amber — auto-detected with word-boundary check
- **Per-paragraph fade-in**: Each paragraph fades from transparent to opaque as it appears
- **Typography**: Larger title (32px) and period (22px), more line spacing (1.65), gold separator line under title
- **Closing emphasis**: Last paragraph of each chapter rendered in italic + brighter white
- **Narrative rewrite**: All 4 chapters rewritten with flowing, explanatory prose — fewer choppy sentences, more connective tissue and human context

## v4.44.0 - 2026-02-11
### Boss HP Scaling + Pixel Glitch Fix

- **Boss HP cycle multiplier**: Added `CYCLE_MULT: [1.0, 2.0, 3.0]` to `BOSS.HP` — C2 boss HP doubled, C3 tripled, matching player GODCHAIN power scaling
- **calculateBossHP() updated**: Now applies cycle multiplier after additive formula (C1 unchanged, C2 ~27k, C3 ~40k+)
- **Enemy hit shake pixel fix**: `Math.round()` on `_hitShakeX`/`_hitShakeY` in `Enemy.draw()` — eliminates sub-pixel anti-alias flickering on currency symbols
- **Enemy HP tuning**: Base 15→18, scale 25→30, cycle multipliers [1.0, 1.6, 2.2] for tankier hordes in later cycles

## v4.43.0 - 2026-02-11
### Paper Tear Effect

- **Paper tear intro**: Sky "tears open" revealing a dark void behind the title — canvas-drawn jagged edges with highlight strokes
- **Smooth animation**: 1.4s easeOutQuart opening, 0.7s easeInQuart closing, asymmetric top/bottom stagger
- **Title opacity sync**: DOM title fades in/out synchronized with tear progress
- **Reverse on tap**: Tapping "TOCCA PER INIZIARE" closes the tear before transitioning to ship selection
- **Title repositioned**: `flex-start` + `padding-top: 12%` pushes title to upper zone (box-sizing: border-box)
- **Config**: `Balance.PAPER_TEAR` with ENABLED kill-switch, durations, edge params, shadow
- **PWA banner fix**: Animation keyframes now preserve `translateX(-50%)` centering

## v4.42.0 - 2026-02-11
### Ambient Weather System

- **Ambient weather per level**: Atmosphere evolves L1→L5 with progressive effects
- **Snow (L5)**: 15 white flakes with sinusoidal wobble, slow fall 80-120px/s
- **Fog (L4)**: 4 translucent wisps (150-250px) with horizontal drift
- **Drizzle (L4 + Boss)**: 10 thin vertical drops, lighter than event rain
- **Distant lightning (L3+)**: Subtle sky flash every 10-25s, color by level (amber/violet/blue)
- **Bear Market**: Red distant lightning layered on existing blood rain/ember
- **Level transition burst**: Wind gust + flash on every level-up
- **Performance**: +15 draw calls max (L5), 0 jank frames at 118 FPS avg
- **Config**: `Balance.SKY.AMBIENT` with per-effect ENABLED kill-switches

## v4.40.0 - 2026-02-11
### Formation Overhaul + Balance Tuning

- **Top-heavy formations (C1+C2)**: Enemies spawn in upper 38% of screen with simple shapes (RECT, WALL, ARROW, DIAMOND)
- **Spiazzante formations (C3)**: Formations expand to 55% — surprise effect entering cycle 3
- **Monotonic enemy counts**: All wave counts strictly non-decreasing across levels (no dips)
- **RECT/WALL generators**: Even row distribution — no incomplete last rows
- **Per-cycle Y-clamping**: Enemy drop on edge-hit respects MAX_Y_RATIO_BY_CYCLE
- **SPIRAL/CROSS/CHEVRON caps**: Radius, arm length, and rows capped to prevent overflow
- **Proximity Kill Meter**: MAX_DISTANCE 450→600 (covers top-heavy formations), reset on boss defeat
- **Boss hit meter gain**: 0.4→0.15 per hit (gradual buildup, no sudden HYPER)
- **Drop anti-cluster**: 3s minimum between enemy drops, reroll on consecutive duplicate type
- **CYCLE_COUNT_MULT**: C2 1.375→1.25, C3 1.575→1.45 (less enemy inflation)
- **+1 row enemies**: All waves +4 enemies/horde for denser formations
- **Player fire rate +20%**: BTC 0.26→0.22s, ETH 0.40→0.33s, SOL 0.20→0.17s
- **RECT generator**: Prefer wide grids (search UP for column divisor, not down)

## v4.39.0 - 2026-02-11
### Sky Overhaul + UI Polish

- **Vertical cloud motion**: Clouds drift downward (player ascends through sky)
- **Cloud rendering overhauled**: Fat-border technique replaces per-lobe outlines
- **Tree silhouettes**: 3 shapes (round, pine, bush) replace uniform triangles
- **Hill outlines softened**: Thinner lines, semi-transparent stroke, smoother curves
- **Ground fog**: Fixed 80px strip at bottom during PLAY, aligned to control hint zone
- **Control zone hint**: Hidden by default, visible only during PLAY (fixes light band in story/intro)
- **Story screen fix**: Background always fully opaque — sky no longer bleeds through fade-in
- **Intro version text**: Dark backdrop + higher opacity for readability without hills
- **Shield button**: Larger (72px) and repositioned above hint zone
- **Pause button**: Compact (58×32px), moved closer to HUD top bar
- **CLS fix**: `tapShine` animation uses `transform: translateX` (zero layout shift)

## v4.38.0 - 2026-02-10
### Bullet Pierce + Proximity Kill Meter ("Buy the Dip")

- **Bullet Pierce**: Player bullets now have `pierceHP` — they survive multiple enemy-bullet collisions instead of being destroyed on first contact. Base HP=1 (passes through 1 enemy bullet), +1 per POWER modifier level, +1 for HODL stance, missiles get 3 HP. Solves the late-game bullet wall problem
- **Proximity Kill Meter** (replaces Graze as meter source): Killing enemies close to the player fills the DIP meter. Uses vertical distance — closer kills give more meter (up to 7 at ≤150px, minimum 1 at ≤450px). Boss hits give +0.4, boss phase transitions +15. HYPER auto-activates at 100
- **Graze simplified**: Graze (near-miss) still gives score/audio/sparks but no longer fills meter or grants perks
- **HYPER clean countdown**: Once activated, HYPER counts down from 5s to 0 without extensions. Timer freezes during non-combat states (boss warning, enemy entrance). Graze no longer resets meter decay timer
- **Boss meter fill**: Boss hits give small meter gain (+0.4 per hit), boss phase transitions give +15. Exposed `Game.addProximityMeter()` API for Boss.js
- **Game loop HYPER fallback**: Auto-activation check runs every frame as fallback, catching meter reaching threshold between kills
- **Prologue on first play**: Fixed story screen not showing on first launch — added INTRO→STORY_SCREEN state transition
- **Tutorial fade-out**: Smooth 0.2s opacity transition instead of instant disappear (eliminates visual glitch)
- **Joystick resized**: 120px→75px, repositioned to bottom: 5px to reduce overlap with meter bar
- **UI**: Meter label "GRAZE"→"DIP", removed graze count display, `restoreGameUI()` helper for post-story HUD restore
- **Files**: BalanceConfig.js, Bullet.js, Player.js, CollisionSystem.js, main.js, Boss.js, index.html, style.css, InputSystem.js, GameStateMachine.js

---

## v4.37.0 - 2026-02-10
### Difficulty Rebalance + Unified Tutorial Level + UI Polish

- **Unified tutorial level**: Replaced 3-step tutorial + separate warmup with a single tutorial overlay shown during WARMUP state. Sky and ship visible underneath semi-transparent overlay. Shows controls (PC/mobile-specific), animated swipe zone (mobile), objective, survival tips, and a GO! button. Story dialogue appears only after pressing GO
- **Reduced Cycle 1 enemy counts**: All 5 waves reduced by 3-4 enemies per horde (e.g. Wave 1: 15→12, Wave 2: 18→14). `CYCLE_COUNT_MULT[0]` reduced from 1.2 to 1.0 (no bonus enemies in tutorial cycle)
- **Flatter formations**: `MAX_Y_RATIO` reduced from 0.65 to 0.55 — enemies don't descend past 55% of screen height, giving players more breathing room
- **Slower enemy fire**: Cycle 1 fire budget reduced from 20→12 bullets/sec. Tier 1 cooldowns 3.0-3.5→4.5s min, 4.2-5.0→6.5s max. Tier 2 cooldowns increased ~30%
- **Wave grace period**: 2.5 seconds of silence at the start of each wave — no enemy fire while formations settle
- **Satoshi's Sacrifice disabled**: `SACRIFICE.ENABLED = false` — mechanic confused new players. All code remains but never activates
- **Larger pause button**: 50×26px → 72×40px with 8px border-radius, meets Apple 44pt touch target guideline
- **Localization**: Added TUT_TITLE, TUT_CONTROLS_UNIFIED, TUT_SWIPE_HERE, TUT_OBJECTIVE_UNIFIED, TUT_SURVIVAL_UNIFIED strings (EN/IT). Removed WARMUP_HINT
- **Files**: Constants.js, main.js, style.css, index.html

---

## v4.36.0 - 2026-02-09
### Memory Footprint Audit — Long Session Stability (10 fixes)

- **RankSystem per-frame GC fix (HIGH)**: Replaced `.filter()` on `_killTimes`/`_grazeTimes` arrays (called every frame, 120 new array allocations/sec) with in-place `_pruneOld()` write-pointer compaction. Changed `= []` to `.length = 0` in `onDeath()` to reuse existing arrays
- **AudioSystem noise buffer cache (MEDIUM)**: `createNoiseOsc()` created a new AudioBuffer on every call (~10-20 times/sec during music). Added `_noiseBufferCache` keyed by millisecond-rounded duration — eliminates ~600+ buffer allocations/minute during music playback
- **Bullet pool leak on restart (MEDIUM)**: `startGame()` reset `bullets`/`enemyBullets` arrays without releasing pooled bullets, causing ObjectPool growth on every game restart. Added `Bullet.Pool.release()` calls before array clear
- **Intro ship rAF loop leak (HIGH)**: `animateIntroShip()` started a new `requestAnimationFrame` loop on every backToIntro→initIntroShip call without cancelling the previous one. After N restart cycles, N animation loops ran simultaneously. Fixed with `cancelAnimationFrame` guard + stored rAF ID
- **Bullet pool leak in backToIntro (MEDIUM)**: Added `Bullet.Pool.release()` in `backToIntro()` in addition to `startGame()`, preventing pool objects from being orphaned between menu return and next game start
- **SkyRenderer gradient caching (LOW)**: Horizon glow and bear market overlay created new `createLinearGradient`/`createRadialGradient` every frame. Cached by key (level+dimensions), invalidated on state change. Bear market pulse uses `globalAlpha` modulation with fixed-alpha cached gradient
- **HarmonicConductor PANIC gradient cache (LOW)**: PANIC vignette `createRadialGradient` cached by `gameWidth-gameHeight` key, recreated only on resize
- **Music schedule() burst catch-up guard (MEDIUM)**: After tab loses focus, `ctx.currentTime` advances but `schedule()` doesn't run. On tab refocus, the while loop tried to catch up all missed beats at once, creating potentially hundreds of audio nodes simultaneously. Added `noteTime` clamp (max 8 beats lag) to skip ahead instead of catching up
- **SkyRenderer lightning shadowBlur removal (LOW)**: Leftover `shadowBlur = 15` from pre-v4.11 cleanup removed from `drawLightning()` — eliminates per-frame GPU shadow computation
- **Zero gameplay changes**: All optimizations are internal. Rendering, audio, and collision behavior identical pre/post
- **Files**: RankSystem.js, AudioSystem.js, main.js, SkyRenderer.js, HarmonicConductor.js, Constants.js + sw.js (version bump)

---

## v4.35.0 - 2026-02-09
### Animated Title Screen

- **Title animation sequence**: 2-second choreographed intro on first load. "Currencies" subtitle fades in, "FIAT" bounces from top with gold particles, "vs" rotates in, "CRYPTO" bounces from bottom with cyan particles. Mode selector and controls fade in at end
- **TitleAnimator.js (NEW)**: Self-contained state machine (IDLE/ANIMATING/LOOPING/HIDDEN) with canvas particle system (max 40, additive blending). DOM element positions mapped to canvas coordinates via `getBoundingClientRect()`
- **CSS keyframes**: `titleBounceInTop`, `titleFadeRotate`, `titleBounceInBottom` with cubic-bezier overshoot. `.anim-active` class hides title spans during sequence, `.anim-hidden`/`.anim-show` for controls fade
- **2 new SFX**: `titleBoom` (sub bass + metallic ring + noise burst) for FIAT slam, `titleZap` (electric sweep + sub punch + noise crackle) for CRYPTO reveal
- **Subtitle "Currencies"/"Valute"**: Clarifies that "FIAT" = traditional currencies. Localized EN/IT
- **Skip on tap**: Tapping during animation skips to loop state with all elements visible
- **No replay on return**: Coming back from Game Over shows loop state directly (no animation replay)
- **Kill switch**: `Balance.TITLE_ANIM.ENABLED = false` skips animation entirely
- **prefers-reduced-motion**: Respects accessibility setting, shows everything immediately
- **Config**: `Balance.TITLE_ANIM` with timeline, particle, and SFX volume settings
- **Files**: TitleAnimator.js (NEW), style.css (~80 lines), index.html (subtitle + script), BalanceConfig.js (TITLE_ANIM config), AudioSystem.js (2 SFX), Constants.js (localization + version), main.js (7 integration points), sw.js (version)

---

## v4.34.0 - 2026-02-09
### Audio Overhaul — Music System v2 & Separate Music/SFX Controls

- **Separate Music/SFX gain nodes**: Audio routing split into `musicGain` and `sfxGain`, both feeding `masterGain → compressor → destination`. Music and sound effects can be independently controlled
- **Dual toggle buttons**: Single mute button replaced with 2 buttons in intro screen and pause screen — music (note icon) and SFX (speaker icon). Each toggles independently with visual muted state (dark gray + red border)
- **localStorage persistence**: `fiat_music_muted` and `fiat_sfx_muted` keys persist toggle state across sessions. Read on init, applied to gain nodes
- **MusicData.js (NEW)**: Data-driven music system with 5 unique level themes + 3 boss phases + bear market modifier. Each song has named sections (A/B/FILL) with 16-beat arrays for bass, melody, arp, drums, and sustained pad chords
- **Level themes**: L1 "Digital Dawn" (Cm, 140bpm synth-pop), L2 "Deep Liquidity" (Dm, 130bpm funk), L3 "Dark Protocol" (Am, 150bpm breakbeat), L4 "Crypto Winter" (Ebm, 120bpm industrial), L5 "Final Hash" (Gm, 160bpm epic)
- **Boss theme**: "Central Authority" — Phase 1 menacing drone (130bpm), Phase 2 escalation with melody (145bpm), Phase 3 chaos with all instruments (165bpm)
- **Bear market audio modifier**: -1 semitone pitch shift, +10% tempo, darker tone via frequency multiplier
- **Data-driven schedule()**: Refactored from hardcoded generation to reading MusicData sections beat-by-beat. Section structure (A→A→B→A→FILL etc.) creates musical variation and progression
- **Intensity-gated layers**: Bass always plays, arp at intensity 30+, pad at 40+, drums at 50+, melody at 60+ — music builds as gameplay intensifies
- **HarmonicConductor sync preserved**: `schedule()` always advances timing and sets `this.tempo` even when music is muted, maintaining enemy fire rhythm sync
- **Config**: `Balance.AUDIO` section with `MUSIC_VOLUME`, `SFX_VOLUME`, master `ENABLED` toggle, per-channel kill-switches
- **Files**: MusicData.js (NEW), AudioSystem.js (rewrite: gain routing, schedule v2, data-driven methods), BalanceConfig.js (AUDIO config), index.html (dual toggles, load order), style.css (muted styles), main.js (toggle handlers, localStorage), Constants.js + sw.js (version bump)

---

## v4.33.0 - 2026-02-09
### Juice Cleanup — Fluid Gameplay, Cinematic Boss Events

- **Hit Stop disabled during gameplay**: All gameplay hit stops zeroed (ENEMY_KILL, STREAK 10/25/50, CLOSE_GRAZE, PLAYER_HIT). Eliminates 120-500ms freezes perceived as lag. Boss events preserved (BOSS_PHASE 300ms, BOSS_DEFEAT 500ms)
- **Screen Flash disabled during gameplay**: PLAYER_HIT_FLASH, STREAK_FLASH, GRAZE_FLASH, SCORE_PULSE all set to `false`. Boss flashes preserved (BOSS_DEFEAT_FLASH, BOSS_PHASE_FLASH, HYPER_ACTIVATE_FLASH)
- **Screen Shake refined**: Removed hardcoded `shake = 40` on enemy contact. Shake now only triggers on player death (non-gameplay moment)
- **Master kill-switches**: 3 new toggles in `Balance.JUICE.SCREEN_EFFECTS`: `SCREEN_SHAKE`, `SCREEN_FLASH`, `HIT_STOP` — gate all effects at entry point with `=== false` check (safe: `undefined` = enabled)
- **Damage Vignette (NEW)**: Non-intrusive hit feedback — 4 red border rectangles (12px thickness), 0.3s ease-out fade. Triggers on bullet hit and enemy contact. Zero GPU overhead (no gradients, no fullscreen fill)
- **Preserved feedback stack**: Player blink (invuln timer), device vibration (`[50,50,50]`), hit sound (`hitPlayer`), damage vignette — clear feedback without interrupting gameplay flow
- **All effect code preserved**: Original flash/shake/hit-stop implementation intact, disabled via config. Can be re-enabled per-effect by changing config values
- **Files**: BalanceConfig.js (SCREEN_EFFECTS toggles, HIT_STOP values), EffectsRenderer.js (master gates, damage vignette), main.js (damage vignette calls, removed hardcoded shake), Constants.js + sw.js (version bump)

---

## v4.32.0 - 2026-02-09
### Responsive Formation System — Mobile Layout Fix

- **Bug fix: `G._gameHeight` exposed**: `G._gameHeight` was never set in `resize()` despite being used by WaveManager (fallback 700) and HYPER particles (fallback 900). Now set alongside `G._gameWidth`
- **Responsive formation spacing**: Formation spacing scales with `gameWidth / BASE_WIDTH` ratio. On iPhone 14 Pro Max (430px), spacing shrinks from 78px to ~56px (clamped to minimum 62px), fitting more enemies per row and reducing formation depth
- **Responsive startY**: Formation Y origin scales with `gameHeight / 800` ratio when `START_Y_RESPONSIVE` enabled. Maintains proportional player-enemy gap across screen sizes
- **Legacy horde fix**: `spawnWaveLegacy()` hardcoded values (spacing=75, startY=150, maxY=380) replaced with FORMATION config + responsive scaling. Now consistent with `generateFormation()`
- **Responsive teleport bounds**: `Enemy.doTeleport()` X/Y bounds clamped to actual screen dimensions. Prevents enemies teleporting off-screen on narrow devices (BOUNDS_X_MAX 550 > 430px screen)
- **Proportional kamikaze trigger**: `e.y > 250` hardcoded threshold replaced with `gameHeight * 0.33` (equivalent on 750px, proportional on all sizes)
- **Config**: `Balance.FORMATION.RESPONSIVE` (master toggle), `SPACING_MIN` (62px floor), `START_Y_RESPONSIVE` (height scaling)
- **Kill-switch**: `FORMATION.RESPONSIVE: false` restores exact pre-v4.32 behavior on all screens
- **Invariant**: Desktop 600px (widthRatio=1.0) → spacing stays 78px, zero visual changes. Enemy count unchanged
- **Files**: main.js (G._gameHeight + kamikaze), BalanceConfig.js (RESPONSIVE config), WaveManager.js (generateFormation + spawnWaveLegacy), Enemy.js (teleport bounds), Constants.js + sw.js (version bump)

---

## v4.31.0 - 2026-02-09
### Off-Screen Canvas — Sky & Hills Caching

- **Sky gradient off-screen canvas**: Sky background (gradient `fillRect` full-screen) rendered onto a dedicated off-screen canvas (`{ alpha: false }` for GPU fast-path). Blitted via single `drawImage` per frame. Redrawn only on level/bear market/boss state change (~5 times per game session vs 60/sec)
- **Hills off-screen canvas**: 5-layer parallax hills (sin() wave, fill+stroke, silhouettes) rendered onto transparent off-screen canvas. Throttled redraw every N frames (default: 2, configurable). Automatic invalidation on level change, bear market toggle, and boss→normal transition
- **Config**: `Balance.SKY.OFFSCREEN` with `ENABLED` toggle (master kill-switch, `false` = pre-v4.31 direct-draw fallback) and `HILLS_REDRAW_INTERVAL` (frames between hill redraws)
- **Memory**: 2 extra canvases at ~400x700 = ~2.2 MB total. Acceptable for mobile
- **Fallback**: `OFFSCREEN.ENABLED: false` produces pixel-identical output to pre-v4.31 (original pipeline preserved as else branch)
- **Zero gameplay changes**: All collision, scoring, visual behavior identical pre/post optimization
- **Files**: SkyRenderer.js (off-screen pipeline + helpers), BalanceConfig.js (OFFSCREEN config), Constants.js + sw.js (version bump)

---

## v4.30.0 - 2026-02-09
### Batch Rendering — Canvas State Change Optimization

- **ParticleSystem multi-pass draw**: Refactored single-loop draw into 2-pass pipeline — Pass 1: standard particles (circles, symbols) in source-over; Pass 2: all additive particles (isGlow, isRing, isSpark) in a single `lighter` context. Reduces ~40-60 composite switches/frame to 2
- **Player bullet glow batching**: Extracted `drawGlow(ctx)` method in Bullet.js (radial gradient without save/restore/composite). Removed inline glow block from `draw()`. New batched additive pass in main.js draws all player bullet glows in one `save → lighter → restore` cycle. Reduces 50 save/restore + 100 composite switches → 1 save/restore + 2 switches
- **Floating text shared setup**: Hoisted `textAlign`, `textBaseline`, `strokeStyle`, `lineWidth` assignments before the floating text loop. Eliminates ~40-80 redundant per-text state assignments/frame
- **Rendering order preserved**: Glow (additive, under) → Body (source-over, over) for bullets. Standard particles → additive particles for ParticleSystem. Visually identical to pre-v4.30
- **Zero gameplay changes**: All collision, scoring, particle behavior identical pre/post optimization
- **Files**: ParticleSystem.js (multi-pass), Bullet.js (drawGlow extracted), main.js (batched glow + text setup), Constants.js + sw.js (version bump)

---

## v4.29.0 - 2026-02-09
### Object Pool Audit — GC & Per-Frame Allocation Optimization

- **ObjectPool.release O(1)**: Replaced `indexOf` O(n) duplicate check with `_inPool` boolean flag. Eliminates ~150-300 comparisons/frame during active combat
- **Pre-allocated hot-path objects**: `buildPlayerState()`, `getState()` lambda, and `onEnemyHit` spark opts now reuse pre-allocated objects instead of creating fresh ones per call. Eliminates ~10-20 object allocations/frame
- **ParticleSystem compaction**: Replaced backward-iterate + `.splice()` pattern (O(n) per removal × ~15 removals/frame) with single-pass forward write-pointer compaction (1× O(n) total). Eliminates micro-array allocations from splice return values
- **Dead code removal**: Removed unused `ParticlePool.getActive()` method (called `.slice()` on every invocation, never used)
- **Zero gameplay changes**: All collision, scoring, particle behavior identical pre/post optimization
- **Files**: ObjectPool.js (refactored), main.js (pre-allocated objects), ParticleSystem.js (compaction), Constants.js + sw.js (version bump)

---

## v4.28.0 - 2026-02-09
### main.js Decomposition — CollisionSystem, RunState, GameStateMachine

- **CollisionSystem.js** (NEW): Extracted 4 collision loops from main.js (~350 lines) into `G.CollisionSystem` module. Callback pattern: detection loops in CollisionSystem, side-effects (score, meme, drop, VFX) stay in main.js as named callbacks. Methods: `processEnemyBulletsVsPlayer`, `processPlayerBulletVsBoss`, `processPlayerBulletVsEnemy`, `processBulletCancellation`
- **RunState.js expansion**: Moved ~30 per-run variables from main.js globals into `RunState.reset()` — score, level, marketCycle, totalTime, killCount, streak, bestStreak, killStreak, grazeMeter, grazeCount, bulletCancelStreak, sacrificeState, fiatKillCounter, and more. `syncFromRunState()` bridges local aliases for backward compat
- **GameStateMachine.js** (NEW): Centralized state transition table with validation. `G.GameState.transition(newState)` logs + warns on invalid transitions. `G.GameState.is(...states)` helper for multi-state checks. All `gameState = 'X'` in main.js now route through `setGameState()` wrapper
- **Zero gameplay changes**: Identical behavior pre/post refactor. All collision detection, scoring, and state management work exactly as before
- **main.js reduced**: Removed `checkBulletCollisions()` function (~200 lines), inline enemy bullet loop (~170 lines), inline boss collision (~150 lines), inline bullet cancel (~36 lines). Net reduction ~400+ lines
- **Files**: CollisionSystem.js (new), GameStateMachine.js (new), RunState.js (expanded), main.js (refactored), index.html (+2 scripts), sw.js (cache list + version)

---

## v4.27.0 - 2026-02-09
### Hardcoded Values Audit — Tier 1 (Gameplay/Balance)

- **~70 magic numbers extracted**: Moved gameplay-critical hardcoded values from Player.js (~14), Enemy.js (~20), Boss.js (~40), and main.js (~3) into `BalanceConfig.js`. All gameplay tuning now lives in `G.Balance.*`
- **Extended `Balance.PLAYER`**: Added SPAWN_OFFSET_Y, RESET_Y_OFFSET, BOUNDARY_MARGIN, TOUCH_SWIPE_MULT, SECOND_WIND_DURATION, INVULN_DURATION, MUZZLE_FLASH_DURATION, BULLET_SPAWN_Y_OFFSET, FIRE_VIBRATION_MS, DANGER_RANGE_SQ, START_LIVES, SHIELD_COOLDOWN, SPREAD_OFFSETS (NARROW/FIRE/WIDE)
- **New `Balance.GAME`**: BASE_WIDTH (600) and BASE_HEIGHT (800) — canvas dimensions configurable
- **Extended `Balance.ENEMY_BEHAVIOR`**: Added TELEGRAPH_LEAD, BULLET_SPAWN_Y_OFFSET, FLASH_FADE (HIT/SHIELD/TELEPORT), TELEPORT (range/chance/offsets/bounds/cooldown), WAVE_PATTERNS (V_SHAPE/SINE_WAVE), ENTRY (distance/curve/rotation)
- **Extended `Balance.BOSS`**: Added ENTRANCE_SPEED, BOUNDARY_MARGIN, MINION (HP scaling/spawn offsets), MOVEMENT (per-boss per-phase configs for FED/BCE/BOJ), ATTACKS (full pattern params — rotation speeds, bullet counts, speeds, homing strengths, gap sizes, spiral arms for all 3 bosses × 3 phases)
- **Zero gameplay changes**: All extracted values match their original hardcoded counterparts exactly. Behavior is identical pre/post refactor
- **Files modified**: BalanceConfig.js (config additions), Player.js, Enemy.js, Boss.js, main.js (literal → config references)

---

## v4.26.0 - 2026-02-09
### Top Bar Message Strip

- **DOM Message Strip**: New `#message-strip` DOM element replaces 3 canvas-based message channels (WAVE_STRIP, ALERT DANGER, ALERT VICTORY). Positioned under HUD top bar (45px) with z-index 110
- **4 Type Variants**: DANGER (red gradient + pulse flash + screen shake), VICTORY (gold gradient + gold glow), WAVE (semi-transparent black, gold text), INFO (semi-transparent black, cyan text)
- **Priority Queue System**: 3-tier priority (DANGER/VICTORY=3, WAVE=2, INFO=1). Higher priority interrupts current. Same type replaces in queue. Max queue size 3
- **Entrance/Exit Animations**: CSS `stripEntrance` (200ms bounce) and `stripExit` (300ms fade-up). Danger variant adds `stripPulse` brightness flash
- **Performance Gain**: Removed ~130 lines of per-frame canvas text rendering (fillText, measureText, shadowBlur). DOM updates are event-driven, not per-frame
- **Canvas Channels Preserved**: SHIP_STATUS (above player ship) and WAVE_SWEEP (horizontal line) remain canvas-based. Meme whisper functions now no-ops (dead code since v4.20)
- **Config**: `Balance.MESSAGE_STRIP` with ENABLED toggle, per-type PRIORITIES/DURATIONS, COOLDOWN (300ms), MAX_QUEUE_SIZE (3)
- **Mobile Responsive**: Font scales down at 380px (10px) and 320px (9px)
- **Files**: index.html, style.css, BalanceConfig.js, MessageSystem.js (refactored), main.js (2 lines)

---

## v4.25.0 - 2026-02-09
### Enemy Resize

- **Enemy Resize +20%**: All enemies scaled from 48×48 to 58×58px. Better visual presence against rich cell-shaded backgrounds. All internal dimensions updated: coin radius 19→23, bill 36×21→44×25, bar trapezoid +20%, card 33×22→40×27, minion 18→22
- **Collision Updated**: `BULLET_CONFIG.ENEMY_HITBOX_RADIUS` 24→29 to match new size. Hit flash/damage tint radius 21→25, telegraph ring 25→30, shield hexagon 26→31
- **Formation Spacing**: `FORMATION.SPACING` 65→78, `GRID.SPACING` 60→72, spiral base/step scaled proportionally. Formations won't overflow on 430px screens
- **Font Scaling**: All enemy symbol fonts scaled +20% (coin 15→18, bill/bar/minion 14→17, card 12→14)
- **Enemy Bullets Unchanged**: Remain 4×4px — ratio 4:58 (6.9%) gives better visual proportion
- **Off-Screen Culling**: Margin increased 65→80px to accommodate larger enemies

---

## v4.24.0 - 2026-02-09
### Sky & Background Enhancement (Cell-Shading)

- **Smooth Gradient Sky**: Replaced flat 4-band fills with smooth `createLinearGradient()` for all 5 level palettes + boss + bear market. Gradient cached per level/state combo, invalidated on resize. Legacy fallback: `SKY.GRADIENTS.ENABLED: false`
- **Enhanced Star Field**: 90 stars (was 40) with variable size (1.5-3.5px), brightness, and parallax drift (3 px/sec). Visible from L3+ with progressive alpha (L3=0.25, L4=0.55, L5=1.0, boss=1.0). Shooting stars (0-2 active, 4-12s spawn interval) with 40px trail
- **5-Layer Parallax Hills**: Added 2 distant layers at 65% and 70% screen height with atmospheric perspective (lighter colors, slower movement). Per-layer configurable freq/amp wave parameters. 5 color palettes per level. Deterministic silhouettes (trees + buildings) on distant layers 0-2 with cell-shaded #111 outline
- **Atmospheric Particles**: 20 particles with level-themed types: dust (L1-2), pollen (L2-3), fireflies with sinusoidal blink (L4-5), embers (bear market). Cell-shaded outline on particles >= 3px. Drift + sinusoidal wobble with screen-edge wrapping
- **Multi-Lobe Clouds**: 2-4 overlapping ellipse lobes per cloud (was single ellipse). Shadow layer + main body + highlight lobe + per-lobe outline. Layer-based scaling (back 1.3x, front 0.7x). Normal/bear/night color schemes
- **Horizon Glow**: Subtle luminous band (8px) at first hill Y position with level-matched color. Sinusoidal alpha pulse (0.12-0.28). Hidden during boss fights
- **Draw Pipeline Updated**: bands → symbols → stars → atmospheric particles (NEW) → horizon glow (NEW) → hills → clouds → lightning
- **Resize Fix**: `SkyRenderer.setDimensions()` now called in `resize()` function (was missing, pre-existing bug)
- **Full Config**: `Balance.SKY` with master toggle + per-feature toggles (pattern matches `Balance.GLOW`)

---

## v4.23.1 - 2026-02-09
### Glow Boost + Trail & Motion Effects

- **Glow Values Boosted**: All GLOW config values increased for visible impact — bullet alpha 0.25→0.45, radius 12→18px, pulse 0.08→0.15; engine alpha 0.35→0.55, radius 18→24px; muzzle alpha 0.4→0.6, radius mult 1.4→1.8; aura mult 0.8→1.0; power-up alpha 0.35→0.5, radius mult 1.2→1.5; ring alpha mult 1.0→1.3
- **Additive Bullet Trails**: All 9 player bullet draw methods (Normal, Wide, Narrow, Fire, Pierce, Homing, Laser, Missile, Evolution) now render their trail/exhaust sections in additive composite mode — trails glow and blend with overlapping effects
- **Player Afterimage Enhancement**: Speed threshold lowered (80→50 vx), alpha increased (0.25→0.4), trail age extended (0.12→0.18s), afterimages rendered in additive mode — visible ship silhouette scie at moderate speeds
- **Enemy Death Lingering Glow**: New `isGlow` particle type — additive radial gradient persists at enemy death point for ~0.4s. Config: `Balance.GLOW.DEATH_FLASH` with toggle, radius, and duration
- **Spark Additive Rendering**: White spark particles from bullet impacts (`isSpark` flag) now render in additive mode for brighter, more impactful hit effects
- **Enemy Bullets Unchanged**: No additive effects on hostile bullets — visual distinction preserved

---

## v4.23.0 - 2026-02-09
### Premium Graphics v1 — Glow & Bloom (Additive Blending)

- **Additive Glow System**: New `Balance.GLOW` config block with per-element toggle and tuning (BULLET, ENGINE, MUZZLE, AURA, POWERUP, PARTICLES). Master kill-switch `GLOW.ENABLED` reverts to pre-v4.23 rendering
- **Player Bullet Glow**: Pulsing radial gradient underneath bullet body using `globalCompositeOperation: 'lighter'`. Bullets now emit soft light halos that blend additively with overlapping effects
- **Engine Flame Glow**: Warm orange additive circle behind main engine flame, making the ship's thrust feel like real energy output
- **Muzzle Flash Bloom**: Additive pass on muzzle flash with configurable radius multiplier (1.4x) — firing now produces a visible light bloom
- **HYPER/GODCHAIN Aura Bloom**: Both auras wrapped in additive composite mode — overlapping light creates natural bloom at intersection points. Ethereal, energy-based look
- **Power-Up Glow**: Outer gradient rendered in additive mode with configurable radius multiplier (1.2x) — power-ups now glow as collectible light sources. Reinforces "glow = collect, dark = avoid" visual language
- **Explosion Ring Bloom**: Ring particles from death explosions use additive blending — overlapping rings produce bright intersection points for natural bloom effect
- **Enemy Bullets Untouched**: Hostile tint system (v4.17) preserved — enemy bullets remain dark with no additive glow, maintaining visual distinction

---

> **Versioni precedenti (v2.7.0 — v4.22.0)**: vedi [CHANGELOG_ARCHIVE.md](CHANGELOG_ARCHIVE.md)
