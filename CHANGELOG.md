# Changelog

## v6.6.0 - 2026-02-18

### Desktop Mouse Controls + Android Fix + Console Cleanup
- **feat(input)**: Desktop mouse controls — hold left click to fire + move, right click for shield, cursor follows crosshair
- **feat(layout)**: Desktop viewport centered with phone-like frame (max-height 1300px, border-radius, subtle violet glow)
- **fix(android)**: Early quality detection for low-end devices (≤2GB RAM or ≤2 cores) — forces MEDIUM tier at boot, skipping heavy intro clouds
- **fix(compat)**: `ellipse()` fallback using `arc()` + `scale()` in SkyRenderer for old GPU drivers
- **fix(console)**: Removed 8 ungated `console.log` in main.js (boss/APC) and 4 in sw.js (install/activate)
- **docs(tutorial)**: Updated PC tutorial and manual control strings to include mouse controls (EN + IT)

## v6.5.4 - 2026-02-18

### Remove PaperTear + Privacy Scroll Fix
- **remove(intro)**: Removed "Digital Scanline Void" (PaperTear) system — neon violet line no longer renders behind Dynamic Island
- Deleted `src/systems/PaperTear.js`, removed script tag, config block (`Balance.PAPER_TEAR`), and all 9 references in main.js
- SPLASH→SELECTION transition now instant (no closing animation), TitleAnimator handles title reveal independently
- **fix(privacy)**: Privacy panel now scrolls on iOS with `-webkit-overflow-scrolling: touch` + `touch-action: pan-y`

## v6.5.3 - 2026-02-18

### Full-Bleed Canvas (iOS PWA)
- **feat(layout)**: Canvas now renders behind Dynamic Island and home indicator on iOS PWA
- Game container set to `top: 0; bottom: 0` (full viewport) instead of being inset by safe areas
- HUD, buttons, ship, and all interactive elements remain safely inside `--safe-top` / `--safe-bottom` via CSS vars
- Starfield, nebula, and particles now fill the entire screen — enemies enter from behind the notch
- ~93px of extra visual canvas on iPhone 14 Pro+ (59px top + 34px bottom)
- No gameplay impact: all touch targets and entity positions already use safe area offsets
- No regression on Safari browser, Android, or desktop (`_isIOS` + `isPWA` guard)

## v6.5.2 - 2026-02-18

### Dynamic Island Safe Area Fix
- **fix(layout)**: Title hidden behind Dynamic Island on iPhone 14 Pro+ in Safari browser mode
- `env(safe-area-inset-top)` returns 0 in Safari, but `viewport-fit=cover` extends content behind status bar
- New `--di-safe-top` CSS var (set via `resize()` heuristic) targets only static screens: intro, gameover, manual, debug overlay
- Gameplay HUD (`--safe-top`) untouched — no double-offset on message-strip, pause button, or score bar
- Self-deactivating: if future Safari returns correct `env()` value, heuristic is skipped
- No regression on PWA mode, Android, desktop, or non-Dynamic Island iPhones

## v6.5.1 - 2026-02-18

### "Clean Slate" — Code Consolidation
Removes the legacy horde fallback system (~350 lines) and stale comments. Streaming is now the only wave flow path.

### Horde System Removal
- **remove(waves)**: `startHordeTransition()`, `startHorde2()`, `spawnWaveLegacy()` from main.js (~80 lines)
- **remove(waves)**: `getHordesPerWave()`, `getHordeTransitionDuration()`, `startHordeTransition()`, `completeHordeTransition()`, `_convertHordesToPhases()` from WaveManager (~200 lines)
- **remove(config)**: `STREAMING.ENABLED` kill-switch, `HORDE_MODIFIERS`, `HORDES_PER_WAVE`, `HORDE_TRANSITION_DURATION`, `ARCADE.HORDE_TRANSITION_DURATION`
- **remove(debug)**: `HORDE` category, `trackHordeTransition()`, `hordeTransitions` counter, horde refs in overlay/snapshot
- **remove(i18n)**: `HORDE_2_INCOMING` from EN and IT locales

### Refactoring
- **refactor(config)**: `getHordeModifiers(hordeNumber)` → `getPhaseModifiers(phaseIndex)` with escalation from `STREAMING.PHASE_ESCALATION`
- **refactor(waves)**: `hordeMods` → `phaseMods` in WaveManager.createEnemy and _spawnPhase
- **refactor(conductor)**: `areEnemiesEntering()` simplified — removed `STREAMING.ENABLED` check
- **cleanup**: Removed stale "removed" comments (SECOND_WIND, STRIDE, HODL, drawHyperUI, checkBulletCollisions, enemy shield, shield button, weapon pips)

## v6.5.0 - 2026-02-18

### "Adaptive Quality" Release
Consolidates v6.1.0–v6.4.1 development into a single release.

### Adaptive Quality System (v6.1.0 + v6.3.0)
- **feat(quality)**: QualityManager.js — FPS monitoring + 4-tier system (ULTRA/HIGH/MEDIUM/LOW)
- **feat(quality)**: Auto-detect with hysteresis (drop <45fps, recover >55fps/5s)
- **feat(quality)**: ULTRA tier for flagship devices — ~30 VFX parameters boosted
- **feat(quality)**: ULTRA auto-promotion >58fps for 8s (stricter threshold)
- **feat(quality)**: Settings UI cycle AUTO→ULTRA→HIGH→MEDIUM→LOW
- **feat(quality)**: `_applyTier()` clean slate pattern (restore defaults → apply override)
- **config(quality)**: `Balance.QUALITY` config section with tier definitions

### Streaming Flow Fix (v6.2.0)
- **fix(streaming)**: `wave++` moved to streaming-complete (boss now spawns at correct wave)
- **fix(streaming)**: `getHordesPerWave()→1` when streaming (no mid-wave pause)
- **fix(streaming)**: `areEnemiesEntering()→false` during streaming (no firing blockade)
- **change(waves)**: C1 all waves now 3 phases (RECT/WALL/ARROW), DIAMOND removed
- **change(waves)**: C2 W1-W3 and C3 W1-W2 gain 3rd phase
- **change(waves)**: `MAX_Y_RATIO_BY_CYCLE[0]` 0.48→0.42

### Story Screen Accessibility (v6.1.1)
- **content(story)**: All 32 narrative texts rewritten EN/IT — removed crypto/finance jargon
- **content(story)**: Prologue title→"The Breaking Point", Ch2→"The War Within"
- **content(story)**: "whitepaper"→"blueprint", "sound money"→"honest money"
- **i18n**: HIGHLIGHT_KEYWORDS updated (-8 jargon, +2 accessible terms)

### Debug Overlay v2 (v6.3.1 + v6.4.0)
- **feat(debug)**: Triple-tap at game over → debug overlay (current session)
- **feat(debug)**: Triple-tap on version tag in INTRO → previous session from localStorage
- **feat(debug)**: Session Log Buffer (40 entries, categories STATE/WAVE/BOSS/MINIBOSS/HORDE/QUALITY)
- **feat(debug)**: Last Error section with time-ago display
- **feat(debug)**: `flushSessionLog()` persists on game over/error/beforeunload
- **feat(debug)**: Mailto report integration (1800 char budget)

### Streaming Calibration Pass
- **balance(streaming)**: `MAX_CONCURRENT_ENEMIES` 22→18 — reduced visual chaos
- **balance(streaming)**: `MAX_PER_PHASE: 14` — new per-phase cap (14 + 4 overlap = 18 max)
- **balance(streaming)**: `THRESHOLD_RATIO` 0.35→0.25 — phases trigger later, less overlap
- **balance(streaming)**: `MAX_THRESHOLD` 6→4 — max 4 old enemies when new phase arrives
- **balance(fire)**: `BULLETS_PER_SECOND` [12,31,50]→[8,20,35] — recalibrated for continuous streaming
- **balance(fire)**: `FIRE_RATE_PER_PHASE` 0.10→0.05 — halved per-phase escalation
- **feat(fire)**: `FIRE_GRACE_AFTER_PHASE: 0.5` now implemented — 0.5s fire suppression on phase spawn (was orphan config)
- **balance(boss)**: `DMG_DIVISOR` 4→2.5 — +60% player DPS vs boss (target 70-80s fights)
- **balance(timing)**: `BOSS_CELEBRATION_DELAY` 5.0→7.5 — 2.7s viewing post-evolution
- **balance(behavior)**: `BOMBER MIN_WAVE` 6→7 — delayed from C2W1 to C2W2 (too aggressive at cycle opening)
- **feat(collision)**: `BULLET_CANCEL.RADIUS_MULT: 1.8` — +80% bullet cancel hitbox (matches visual size)
- **debug(boss)**: Boss HP breakdown log at spawn (base/level/cycle/perkScale/DMG_DIVISOR)
- **debug(balance)**: `dbg.balanceTest()` now auto-prints report + entityReport + waveReport at game over
- **debug(balance)**: C1 cycle target updated 4-5m→3-4m in judgment thresholds
- **debug(skip)**: `dbg.skipTo(N)` — skip to any level for testing (sets level/cycle/wave, clears field)

### Browser Compatibility (v6.4.1)
- **feat(compat)**: `eval('_t?.a??0')` gate in index.html — Chrome <80/Safari <14 see styled fallback
- **debug(logging)**: Elite/behavior spawn logging in createEnemy()

## v6.0.0 "RafaX Release" - 2026-02-18
*Dedicated to RafaX — for the encouragement and friendship*

### Phase-Based Streaming (replaces v5.32 batch system)
- **feat(streaming)**: Wave phases replace monolithic batch spawning — each wave has 2-3 independent phases with own formation, count, currencies
- **feat(streaming)**: Phase trigger based on alive-count (<=35% threshold) instead of fixed timer — no screen flooding
- **feat(streaming)**: MAX_CONCURRENT_ENEMIES hard cap (22) prevents accumulation
- **feat(streaming)**: Per-phase escalation (+10% fire rate, +5% behavior per phase)
- **change(balance)**: Wave definitions rewritten from horde1/horde2 to phases[] — counts reduced (26-60 per wave vs 41-76), difficulty maintained via escalation
- **change(balance)**: MAX_Y_RATIO_BY_CYCLE expanded [0.48, 0.50, 0.58] — phases of 12-18 enemies never need Y-compression

### v5.32 Features (bundled in this release)
- **feat(elite)**: Elite Variants — 1 per cycle (C1 Armored, C2 Evader, C3 Reflector)
- **feat(behavior)**: 4 enemy behaviors (Flanker, Bomber, Healer, Charger)
- **feat(debug)**: 9 new debug commands (dbg.elites/behaviors/streaming/waveReport + toggles)

### v5.31 Features (bundled)
- **feat(shield)**: Energy Skin — body-conform shield replacing hex bubble
- **feat(hyper)**: HYPER Aura rework — speed lines + timer bar replace circles
- **feat(bullet)**: Bullet Banking (BULLET_FOLLOW: 0.5)
- **feat(mobile)**: Mobile hardening (overscroll, contextmenu, gesturestart, resize throttle)

### v5.30 Features (bundled)
- **feat(vfx)**: Ship Flight Dynamics — 5 visual effects (Banking Tilt, Hover Bob, Asymmetric Thrust, Wing Vapor Trails, Squash & Stretch)

### Cleanup
- **refactor(docs)**: NOTES.md removed (stale since v5.11)
- **refactor(docs)**: MEMORY.md consolidated (v5.0-v5.22 summarized)
- **refactor(docs)**: SYSTEM_REFERENCE.md wave table updated for phases

## v5.32.0 - 2026-02-18
### Gameplay Feel & Polish — Elite Variants + Enemy Behaviors + Streaming Flow
- **feat(elite)**: Elite Enemy Variants — one variant per cycle: C1 Armored (HP×2, speed×0.8, metallic sheen), C2 Evader (dashes sideways when bullet approaches, 2s cooldown), C3 Reflector (reflects first bullet back as enemy shot, prismatic shimmer). Only MEDIUM+STRONG tiers eligible. 10%/15%/20% chance per cycle (Story), +5% Arcade, +5% Bear Market
- **feat(behavior)**: Flanker — enters from side, flies horizontally firing, then joins formation. 2-4 per wave (C1W3+)
- **feat(behavior)**: Bomber — drops slow bombs that create pulsing danger zones on ground (2s, r=40px, 1 dmg). 1-2 per wave (C2W1+)
- **feat(behavior)**: Healer — green aura (60px), regenerates 5% HP/s to nearby enemies, doesn't fire. Priority kill target. 1 per wave (C2W3+)
- **feat(behavior)**: Charger — windup shake+flash → charge forward 80px at 500px/s → retreat. 2-3 per wave (C2W2+)
- **feat(streaming)**: Streaming Enemy Flow — replaces discrete horde1→horde2 with continuous drip-feed. Batch size 5/6/7 per cycle, configurable delays. Grid movement starts at 50% settled. Escalation: behavior bonus +3%/batch, fire rate +2%/batch
- **feat(debug)**: 9 new debug commands — `dbg.elites()`, `dbg.forceElite(type)`, `dbg.behaviors()`, `dbg.forceBehavior(type)`, `dbg.streaming()`, `dbg.waveReport()`, `dbg.toggleElites()`, `dbg.toggleBehaviors()`, `dbg.toggleStreaming()`
- **config**: `Balance.ELITE_VARIANTS` (per-variant kill-switches), `Balance.ENEMY_BEHAVIORS` (per-behavior kill-switches), `Balance.STREAMING` (master kill-switch)
- **change(collision)**: Reflector interception in CollisionSystem — reflected bullets spawn as enemy shots toward player with spread
- **change(conductor)**: HarmonicConductor threshold-based areEnemiesEntering() for streaming mode (>50% entering = block, not any)
- **change(main)**: Danger zone system for Bomber bombs, battlefield clearing includes streaming state + danger zones

## v5.31.0 - 2026-02-18
### Gameplay Polish + HYPER Rework + Mobile Hardening
- **feat(shield)**: Energy Skin — shield conforms to 8-vertex ship body (4-layer glow + 3 perimeter sparks). Destroys enemy bullets on contact (r=35px)
- **feat(combat)**: Energy Link Beam — LV2 horizontal beam between paired bullets cancels enemy bullets in gap
- **feat(vfx)**: HYPER Aura Rework — replaced circles/rings/orbs with speed lines + timer bar + body glow. Visually distinct from shield. Config `Balance.VFX.HYPER_AURA` with per-feature kill-switches
- **feat(vfx)**: Bullet Banking — bullets tilt slightly in movement direction following ship bank angle. `BANKING.BULLET_FOLLOW: 0.5`. HOMING/MISSILE excluded
- **feat(vfx)**: Stronger player hit feedback — shake 20→30, flash 0.04/0.15→0.08/0.30, 50ms freeze frame, red impact particles
- **feat(mobile)**: Gesture prevention — `overscroll-behavior: none`, context menu blocked during PLAY, Safari pinch-zoom blocked, resize throttled 1s during gameplay
- **change(hud)**: Combat strip (HYPER/GODCHAIN/HYPERGOD) now starts at left:68px to avoid covering pause button
- **change(hud)**: HYPER strip text 18→20px + letter-spacing 2px + darker fill bar + extra black text-shadow for contrast
- **change(hud)**: Removed "×3" multiplier display from HYPER countdown label
- **change(balance)**: Boss C1 HP -10% (2700→2430), P3 fire rates ×1.15 slower, P3 speeds ×0.85 slower
- **change(balance)**: Elemental damage +10% (fire splash 0.50→0.55, electric chain 0.40→0.44, laser speed 1.25→1.375)
- **change(balance)**: Contagion cascade decay 0.45→0.38 (-15%, weakens faster)
- **change(i18n)**: Tutorial texts rewritten EN/IT — descriptive mission, drag-from-bottom controls hint, shield wing explanation
- **fix(vfx)**: Brighten kill-switch — `ENERGY_SURGE.BRIGHTEN_ENABLED: false`
- **config**: `Balance.VFX.ENERGY_SKIN`, `Balance.VFX.ENERGY_LINK`, `Balance.VFX.HYPER_AURA`

## v5.30.0 - 2026-02-18
### Ship Flight Dynamics
- **feat(vfx)**: Banking Tilt — smooth lateral rotation proportional to `vx` (max ~12.6°, asymmetric lerp: fast bank, slow return)
- **feat(vfx)**: Hover Bob — sinusoidal vertical oscillation (2.5px, 1.8Hz) dampened by movement speed
- **feat(vfx)**: Asymmetric Thrust — inner-curve exhaust flame 1.5× longer, outer 0.7× shorter during banking
- **feat(vfx)**: Wing Vapor Trails — additive spark particles from wingtips at high speed (color-reactive: cyan/gold HYPER/orange GODCHAIN)
- **feat(vfx)**: Squash & Stretch — micro scale deformation (0.97×/1.03×) during sharp acceleration changes
- **feat(vfx)**: Banked afterimage — trail captures bank angle for tilted ghost silhouettes
- **config**: `Balance.VFX.SHIP_FLIGHT` with 5 sub-configs, each with individual `ENABLED` kill-switch
- **perf**: Zero allocations per frame — `_flight` object pre-allocated with all scalars, reused every update

## v5.29.1 - 2026-02-18
### Game Over Layout + OLED Deep Black
- **change(ui)**: Game over title `.glitch-text` reduced from 28-42px to 20-28px (single line on mobile)
- **change(ui)**: Game over score `.final-score` promoted to hero: 56-80px, white with violet glow
- **change(ui)**: Game over meme → cyan uppercase, label → small 11px white above score
- **change(ui)**: Game over stats → inline flex row (kills + streak side by side)
- **change(ui)**: Game over actions → full-width 280px max, retry primary, menu btn-sm
- **change(ui)**: OLED deep black: 11 inner containers rgba → pure `#000000` (credits, privacy, manual, boss-card, tip-card, perk-card, dialogue-box, terminal-log, manual-tabs, pwa-banner)

## v5.29.0 - 2026-02-18
### Game Over Redesign + Icon Regeneration
- **change(ui)**: Game over screen background `rgba(0,0,0,0.85)` → opaque `#000000` for LED display readability
- **change(ui)**: All overlay/panel backgrounds → opaque `#000000`: pause, settings, credits, privacy, what's new, manual, tutorial, modifier, nickname, feedback, leaderboard
- **change(ui)**: All container inner backgrounds → `#000000`: modal-content, whatsnew-box, feedback-box, leaderboard-box, nickname-box, manual-container, tutorial-container, paper-modal, ship-carousel, bar-container
- **change(ui)**: All scrollbar tracks → `#000000` (manual-content, manual-v2 scroll)
- **change(ui)**: `.final-score` font-size `46px` → `clamp(42px, 10vw, 54px)` with margin 12px
- **change(ui)**: `#gameover-stats` border opacity `0.06` → `0.12` (more visible on pure black)
- **change(ui)**: `.gameover-actions` gap `15px` → `18px`, margin-top `20px` → `24px`
- **change(icons)**: Icon generator rewritten for v5.28 Premium Arsenal LV3 geometry (8-vertex ∧ delta with all cannons)
- **change(icons)**: Ship scale +38% (`5.8` → `8.0` / 1024), centered at 45% vertical
- **change(icons)**: Title text removed — icon is ship-only for cleaner PWA appearance
- **change(icons)**: Twin engine trail with radial additive glow (red→orange→yellow per exhaust, merged center glow)
- **change(icons)**: Deeper space background gradient (`#0a0825 → #020204`)

## v5.28.0 - 2026-02-17
### Ship Redesign "Premium Arsenal"
- **feat(ship)**: Ship +30% larger (52→68px height, 72→94px width LV1). Afterimage, exhaust, wing thrusters all scaled proportionally
- **feat(ship)**: Cockpit canopy — transparent ellipse with metallic border, glass highlight arc. BTC ₿ symbol inside at 0.7 scale with reactive color per element (cyan default, orange fire, cyan laser, violet electric, prismatic hue-rotation for GODCHAIN)
- **feat(ship)**: Nose cannon with `cannonLen` — twin rails slide-out from nose with housing cap and glow tip. Animates during mount (0→10), retracts on LV1→LV2, re-emerges on LV3
- **feat(ship)**: Heavy central barrel LV3 — triple-layer design (dark base, neon inner rails, bright tip accent). Muzzle cap + pulsing glow orb (r=3). GC energy orb r=6
- **feat(ship)**: Wing cannon pods redesigned — elongated diamond housing, twin rails per pod, muzzle caps, larger glow orbs (r=4 LV2, r=5 LV3)
- **feat(ship)**: LV2 energy line between wing pods (alpha 0.15, subtle pulsing). LV3 energy circuit lines from reactor (center) to all 3 cannons (pulsing alpha 0.2-0.5)
- **feat(vfx)**: Energy Surge system — configurable slowmo per weapon transition: LV2 at 0.7× for 0.6s, LV3 at 0.6× for 0.8s. Per-transition brighten peaks (0.3/0.5/0.7). Flash radius 40→52, brighten radius 35→46
- **feat(config)**: `COCKPIT_CANOPY` config section in BalanceConfig (rx, ry, BTC_SCALE, per-element colors)
- **feat(config)**: `ENERGY_SURGE` config inside `WEAPON_DEPLOY` (DEPLOY_DURATION, SLOWDOWN_SCALE/DURATION, BRIGHTEN_PEAK, SHOCKWAVE_RADIUS, INVULN_FRAMES)
- **feat(effects)**: `setHitStop(duration, freeze, slowScale)` — new slowScale parameter for configurable slowmo intensity (was hardcoded 0.25)
- **change(hud)**: Life pips disabled (LIFE_PIPS.ENABLED: false) — ship is now large enough to see without pips
- **change(hitbox)**: BTC hitboxSize 42→55, coreHitboxSize 8→10. HITBOX defaults scaled to match
- **change(hyper)**: HYPER aura rings scaled +30%: inner ring 35→46, timer ring 58→75, orb orbit 53→69
- **change(shield)**: Hex shield radius 52→68, hexSize 11→14
- **change(particles)**: Deploy burst ring baseSize 60→80
- **change(intro)**: Ship preview scale 1.35→1.05 (compensates +30% ship size). Nose barrel uses cannonLen, BTC cockpit replaced with canopy ellipse

## v5.27.1 - 2026-02-17
### Bugfix Countdown + Ship Redesign "Inverted-V Delta"
- **fix(gameplay)**: Countdown 3→2→1→GO! was stuck at 3 — `_startPlayCountdown()` was called before reset block in `startGame()` which immediately cancelled it. Moved call to end of function after all resets
- **fix(audio)**: Fixed `audioSystem.playSfx is not a function` — corrected to `audioSystem.play()` for countdown tick SFX
- **feat(ship)**: Inverted-V delta redesign — complete ship rewrite to ∧ arrowhead silhouette. 8-vertex polygon: sharp nose at top, narrow shoulders, massive swept-back wings with tips as the REARMOST and WIDEST points (Y=+24), V-notch tail shorter than wing tips. God Phoenix / Gatchaman inspired
- **feat(ship)**: New `_geom` cache — `wingSpan` (36-46), `shoulderW` (10-13), `cannonExt`, `barrelExt`, `barrelW`. Replaces all old geometry fields (`bodyHalfW`, `podX`, `finExt`, etc.)
- **feat(ship)**: Wing cannons at 30% along wing leading edge (LV2+) — diamond housing with twin rails, computed from shoulder-to-wingtip line. Central barrel extends from nose (LV3+)
- **feat(ship)**: Shield wing glow on trailing edges (wingTip→innerTail→tail triangles). `_drawShieldWingGlow()` replaces `_drawShieldFinGlow()`
- **feat(ship)**: Twin exhaust flames at inner tail edges (±5, Y=10), wing tip accents, side thrusters at wing tips when strafing
- **feat(ship)**: Removed engine glow circle (was RADIUS:24 ALPHA:0.55 — too large for new design). Twin exhaust flames provide sufficient visual feedback
- **feat(ship)**: BTC cockpit repositioned to Y=-10 (center of fuselage)
- **feat(ship)**: Afterimage simplified to 8-vertex inverted-V silhouette
- **feat(intro)**: Intro ship preview rewritten with inverted-V delta geometry

## v5.27.0 - 2026-02-17
### Polish & Feel
- **feat(hud)**: Boss HP bar simplified — removed boss name and "PHASE X" text, bar moved 2px closer to boss, phase threshold markers now thicker (lineWidth 2, alpha 0.35) with diamond notches above and below
- **feat(tutorial)**: Tutorial text rewritten with arcade tone — energetic, concise, action-oriented (EN: "GET READY!", IT: "PREPARATI!"). Font size 14px→16px, card padding increased
- **feat(ship)**: Elemental cannon tint — nose/pod housing changes color based on active perk (Fire: orange, Laser: cyan, Electric: violet). GODCHAIN overrides. Config: `Balance.ELEMENTAL.CANNON_TINT`
- **feat(ship)**: Wings swept-back redesign — fin tips extended to Y=22 for sharper aerodynamic silhouette. Fin thrusters, GODCHAIN energy trails, and shield fin glow updated to match new geometry
- **feat(gameplay)**: Game start countdown — 3→2→1→GO! canvas overlay before Wave 1. Waves and firing blocked during countdown. Gold numbers with pulse scale, green GO! with scale-up fade-out. `countdownTick` SFX. Works on first play and retry. Config: `Balance.TIMING.START_COUNTDOWN/START_COUNTDOWN_GO`

## v5.26.0 - 2026-02-17
### Unified Combat HUD + HYPERGOD State
- **feat(hud)**: Combat HUD Bar — message-strip redesigned as 48px unified bar with fill meter. HYPER (gold fill), GODCHAIN (red-orange fill with pulse), HYPERGOD (prismatic animated gradient) all display in the same bar with live countdown
- **feat(gameplay)**: HYPERGOD state — when HYPER and GODCHAIN are both active simultaneously, the bar shows a prismatic animated display and score multiplier increases to 5× (configurable via `Balance.HYPERGOD.SCORE_MULT`)
- **feat(hud)**: Combat bar respects message priority — wave/info/pickup messages don't interrupt active combat display, but danger/victory alerts temporarily override it and combat auto-restores after
- **feat(hud)**: Pulse-before-fade — transient messages and bottom status popups now pulse 3× before fading out (500ms/600ms CSS animations)
- **feat(hud)**: Bottom status text size increased (14px→16px) for better readability
- **refactor**: Removed `drawHyperUI()` and `drawGodchainUI()` canvas functions (~150 lines) — replaced by DOM-based Combat HUD Bar via `MessageSystem.setCombatState/updateCombatDisplay/clearCombatState` API
- **refactor**: GODCHAIN status removed from MemeEngine bottom popup — now shown in top Combat HUD Bar alongside HYPER
- **feat(hud)**: Strip fill bar (`.strip-fill`) as child of message-strip — percentage width updated every frame for smooth countdown visualization

## v5.25.0 - 2026-02-17
### Power-Up Redesign + Status HUD + Tuning (v5.25 WIP → released as part of v5.26)
- **feat(powerup)**: Unified power-up visual — all types now render as 3D circles (dark/light halves, black outline, rim highlight) with white icon per type (arrow, crosshair, shield, lightning, diamond, star, penetrating arrow). Removes 6 old draw methods (~500 lines), adds 2 new (~170 lines)
- **feat(powerup)**: White blink flash on all power-ups — sharp sin³ pulse every ~0.8s, clearly signals "collectible"
- **feat(hud)**: Status HUD in bottom area — meme-popup repurposed during gameplay to show ship status (pickup feedback, active special/utility/perk with type-colored effects, GODCHAIN). Memes suppressed during PLAY, CRITICAL redirected to message-strip
- **feat(hud)**: Countdown timer for specials/utilities/GODCHAIN — live remaining time shown in status area (e.g. "HOMING 6.3s", "SHIELD 3.1s", "GODCHAIN 8.2s")
- **feat(hud)**: Elemental CSS effects on status text — fire (flickering orange glow), electric (intermittent violet/cyan flash), laser (steady cyan beam), GODCHAIN (gold shimmer), shield (cyan pulse)
- **feat(bullet)**: HOMING bullet redesigned as orb tracker — radial gradient sphere (orange), 3 trail circles, orbiting tilted ring, pulsing crosshair center. Visually opposite to MISSILE (blue warhead)
- **feat(shield)**: Expiry warning blink — last 1.5s of hex shield blinks with accelerating frequency (4Hz→12Hz), alpha oscillates 0.3→1.0
- **balance**: Special duration 12s→8s, Utility duration 12s→8s, Perk kill threshold 70→100

## v5.24.0 - 2026-02-17
### Android Compatibility + Tutorial Persistence
- **fix(tutorial)**: Tutorial now shows only on first-ever play per mode (story/arcade) — previously showed every session because `warmupShown` was in-memory only while `localStorage` write was never read back
- **fix(enemies)**: Safety timeout (4s) on enemy entry animation — if an enemy gets stuck in `isEntering` state, it force-completes to prevent game-wide firing blockade (player + enemies both blocked by `areEnemiesEntering()`)
- **feat(debug)**: Global `window.onerror` + `window.onunhandledrejection` handlers — catches silent crashes, stores in `window._lastError` for Android remote debugging

## v5.23.8 - 2026-02-16
### Boss HP Bar Below + Game Over Cleanup + Leaderboard Dedup
- **fix(boss)**: HP bar and name now render below the boss instead of above — bar width matches boss visual width (110px FED/BCE, 140px BOJ), smaller bar height (6px), phase text below bar
- **fix(ui)**: Game over screen now hides HUD layer (graze meter, DIP bar) — previously remained visible behind gameover overlay
- **fix(leaderboard)**: "IL TUO RANK" now uses high score from localStorage instead of stale global score variable — fixes rank showing #2 when player is actually #1
- **feat(leaderboard)**: Nickname dedup — only best score per nickname is kept on the leaderboard (new score lower than existing → ignored)
- **feat(leaderboard)**: Device binding — client generates UUID (`fiat_device_id` in localStorage), worker enforces 1 nickname per device. Changing nickname removes old entry from leaderboard
- **feat(leaderboard)**: Device ID included in HMAC signature (backward-compatible: old payloads without `d` still verify)
- **balance(boss)**: C1 FED nerf — HP 3000→2700 (-10%), fire rate intervals +10% slower across all 3 phases

## v5.23.7 - 2026-02-16
### Relative Drag Touch + UX Polish
- **feat(controls)**: Swipe mode now uses relative drag — finger delta from anchor point instead of absolute screen position. Small repeated gestures move the ship across the screen without stretching thumb edge-to-edge
- **feat(controls)**: Sensitivity slider now affects swipe mode — multiplies finger delta (1.5× = less finger travel needed)
- **fix(ux)**: Nickname overlay no longer auto-focuses input field — prevents iOS keyboard popup when user wants to tap SKIP

## v5.23.6 - 2026-02-16
### Definitive PWA Safe Area — JS heuristic replaces unreliable env()
- **fix(pwa)**: Container always positioned in safe zone on iOS PWA — uses `env()` values when available, `screen.height - innerHeight` heuristic as fallback (env() unreliable on iOS 17+/18+)
- **fix(pwa)**: Removed CSS `@media (display-mode: standalone)` env() block — was interfering with sentinel reads and redundant with JS positioning
- **fix(pwa)**: CSS `--safe-top/--safe-bottom` set to 0 in PWA (container handles offsets), set by JS in Safari (env()=0 naturally)
- **feat(pwa)**: New `--vp-safe-top/--vp-safe-bottom` CSS vars for viewport-level insets (available for future full-screen overlays)
- **refactor**: Removed `:root` env() vars (JS controls all), removed debug overlay, cleaned dead comments
- **note**: All modals outside game-container are flex-centered — safe by design, no additional offsets needed
- **result**: Safari 430×775 vs PWA 430×780 — near-identical layout, violet border correctly inside screen

## v5.23.5 - 2026-02-16
### iOS PWA Standalone Layout Fix — env() fallback + max() pattern
- **fix(pwa)**: JS fallback in `resize()` — when PWA and `env(safe-area-inset-top)` returns 0, forces 59px (Dynamic Island) and overrides `--safe-top` CSS var. Same for bottom (34px home indicator). Clears override if env() resolves later
- **fix(pwa)**: CSS `max()` pattern on intro/gameover elements — `calc(X + safe)` → `max(X, calc(Z + safe))` prevents double-adding in PWA while keeping Safari identical
- **fix(pwa)**: `.hud-top-bar` padding-top floor 20px via `max()` — CSS safety net independent of JS
- **fix(canvas)**: StoryScreen + HUD now get correct safeTop via `window.safeAreaInsets` even when env()=0
- **note**: Gameplay controls (joystick, shield, hyper, graze) remain additive `calc(X + safe)` — full offset needed during play

## v5.23.4 - 2026-02-16
### Apple Best Practice Safe Area — CSS-native env()
- **fix(pwa)**: CSS `--safe-top`/`--safe-bottom` now resolve `env()` natively in `:root` — no JS dependency, works from first paint
- **fix(pwa)**: Replaced temp-div `getSafeAreaInsets()` with persistent `#sa-sentinel` element — eliminates create/destroy race conditions
- **fix(pwa)**: Double resize on `orientationchange` (100ms + 350ms) — defensive pattern for iOS `env()` recalculation delay
- **fix(pwa)**: `#control-zone-hint` background set to transparent — eliminates grey bar at bottom of gameplay screen
- **refactor**: Removed 25-line `getSafeAreaInsets()` function and JS `setProperty('--safe-top/--safe-bottom')` — CSS handles CSS

## v5.23.3 - 2026-02-16
### Raw env() — Safari-first layout
- **fix(pwa)**: Reverted container to `top:0;bottom:0` (Safari reference layout). Safe areas handled by children via `--safe-top/--safe-bottom` CSS vars
- **fix(pwa)**: Removed JS-forced safe area minimums (59px/34px) — raw `env()` values trusted on iPhone 14+ (iOS 16+)
- **fix(pwa)**: Removed `isPWA` conditional logic from resize() — same code path for Safari and PWA

## v5.23.2 - 2026-02-16 (reverted)
### Native Safe Area — Safari/PWA Identical Layout

## v5.23.1 - 2026-02-16
### Safari vs PWA Layout Consistency
- **fix(pwa)**: Body background `#030308` → `#000000` — eliminates OLED seam between body and game-container in PWA bottom area
- **fix(css)**: `#intro-screen` padding `12%` → `calc(25px + var(--safe-top))` — consistent title position Safari/PWA (was 84px vs 101px)
- **fix(css)**: `#gameover-screen` padding `60px` → `calc(10px + var(--safe-top))` — safe-area aware
- **fix(css)**: Short screen media query padding aligned to `calc(10px + var(--safe-top))`
- **fix(pwa)**: `manifest.json` background_color `#030308` → `#000000` — splash screen matches body
- **fix(pwa)**: `resize()` stores enforced safeTop/safeBottom in `window.safeAreaInsets` (was storing raw env values)
- **fix(pwa)**: Exposed `G._safeTop` globally for canvas code

## v5.23.0 - 2026-02-16
### PWA Layout Fix + Offline Queue + Nickname Flow
- **fix(pwa)**: Game container changed from `position: absolute` (JS-sized) to `position: fixed; top:0; bottom:0` (CSS-sized) — eliminates black band on iOS PWA standalone
- **fix(pwa)**: Unified `resize()` — removed dual PWA/browser code path; single flow reads container dimensions from CSS
- **refactor(css)**: Renamed 19 CSS custom properties: `--pwa-top/bottom-inset` → `--safe-top/--safe-bottom` (JS-set, consumed everywhere)
- **fix(css)**: Direct `env(safe-area-inset-top)` in manual title replaced with `var(--safe-top)` for consistency
- **fix(ui)**: Graze bar bottom offset increased from 85px to 95px — adds ~12px gap from ship (was 2px)
- **feat(leaderboard)**: Offline score queue — failed submissions saved to `fiat_pending_score` in localStorage, flushed on next app start and game over
- **feat(leaderboard)**: `LB_QUEUED` i18n key: "SCORE QUEUED" / "PUNTEGGIO IN CODA" shown when offline
- **feat(nickname)**: SKIP button added to nickname overlay — first launch prompt is skippable (once per session)
- **feat(nickname)**: New record without nickname triggers callsign prompt on game over with "NEW RECORD!" title
- **feat(nickname)**: `showNicknamePrompt(callback, options)` now supports `title` override and `hideSkip` option
- **feat(i18n)**: New keys: `LB_QUEUED`, `NICK_SKIP`, `NICK_RECORD_TITLE` (EN/IT)

## v5.22.1 - 2026-02-15
### Cinematic Cannon Mount + Score Reset + iOS Link Fix
- **fix(player)**: Cannon mount at game start now uses the full deploy animation system (flash, brighten, ease-out-back, screen shake, burst particles, SFX sequence) instead of instant pop-in
- **feat(scores)**: One-time local score reset via localStorage migration (`fiat_scores_reset_v2`) — all players start fresh
- **fix(ios)**: External links in Game Completion overlay now use `window.open()` for iOS PWA standalone compatibility
- **docs**: Manuals updated to v5.22.1 with Game Completion section, README gameplay version updated

## v5.22.0 - 2026-02-15
### Settings as Hub — UI Rationalization
- **feat(ui)**: Bottom bar consolidated from 6 to 3 icons: Settings, Leaderboard, What's New
- **feat(settings)**: Settings modal restructured into 3 sections: GAMEPLAY, AUDIO, INFO
- **feat(settings)**: Audio toggle-switches (Music/SFX) added to settings with sync to pause menu icons
- **feat(settings)**: INFO section with Manual, Feedback, Credits, Privacy buttons in 2x2 grid
- **feat(pause)**: Pause menu simplified from 5 to 4 buttons (Manual removed, accessible via Settings > Info)
- **feat(manual)**: New SCORING section merged from help-panel (kill points, HODL, streak, graze, bullet time, hitbox)
- **remove(help-panel)**: Entire #help-panel DOM removed — content merged into Manual
- **remove(settings)**: How-to-play box and HELP button removed from settings
- **feat(i18n)**: 16 new keys: SET_GAMEPLAY/AUDIO/INFO/MUSIC/SFX/MANUAL/FEEDBACK/CREDITS + MAN_SCORING/SCORE_* (EN/IT)
- **feat(css)**: `.settings-section-header` (violet terminal style), `.settings-info-grid` (2-col), `.settings-hub` (scrollable)
- **cleanup(css)**: Removed orphan CSS: `.help-section/item/icon/text`, `#help-panel`, `.help-modal`, `.paper-box`, `.how-to-play`, `.privacy-link`
- **fix(InputSystem)**: Removed `#help-panel` from touch whitelist
- **feat(settings)**: LINGUA and CONTROLLI converted from btn-toggle to toggle-switch for UI consistency
- **fix(settings)**: INFO grid overflow fixed — removed `btn-block`, added `box-sizing: border-box` to modal
- **feat(css)**: `.toggle-switch.active .switch-label` violet color, `min-width: 40px` for SWIPE/JOY labels

## v5.21.0 - 2026-02-15
### Game Completion Screen — Cinematic Credits
- **feat(completion)**: Cinematic completion video (~11s, Remotion) — ship victory ascent with fire trail launch + glitch title reveal
- **feat(completion)**: Two pre-rendered videos: `completion-en.mp4` (EN) and `completion-it.mp4` (IT) with localized title text
- **feat(completion)**: Interactive credits overlay — sequential fade-in sections: title, thanks, credit, open source, privacy, Bitcoin history link, continue button
- **feat(completion)**: First-completion-only flow — `fiat_completion_seen` localStorage flag; subsequent completions skip to Campaign Victory directly
- **feat(completion)**: `showGameCompletion()` — video playback with skip on tap/click, 20s safety timeout, language-aware src
- **feat(completion)**: `showCompletionOverlay()` — DOM overlay with staggered fade-in animations, fadeout on continue
- **feat(remotion)**: `BojBoss.tsx` — SVG translation of Boss.js `drawBOJ()` (torii gate, rising sun, yen symbol)
- **feat(remotion)**: `CryptoViper.tsx` upgraded — full LV1-3 fidelity (armor plates, panel lines, twin-rail barrels, gun pods, BTC cockpit, fin thrusters)
- **feat(remotion)**: 2 scenes: `SceneVictoryAscent` (enter→zoom→snap launch with fire trail), `SceneTitleReveal` (glitch→resolve)
- **feat(i18n)**: 12 `GC_*` keys (EN/IT)
- **feat(css)**: `.gc-*` classes — cyberpunk palette, sequential section fade-in, `prefers-reduced-motion` support
- **fix(cleanup)**: `backToIntro()` hides completion screen + pauses completion video
- **feat(victory)**: Campaign Victory redesign — removed NG+, replaced with Bear Market suggestion + Replay Story
- **feat(victory)**: `activateBearFromVictory()` — enables Bear Market mode and restarts campaign
- **feat(victory)**: `replayStoryFromVictory()` — resets campaign and restarts story
- **feat(victory)**: Bear Market hint box (magenta border) shown only when Bear Market is not already active
- **feat(i18n)**: 8 `CV_*` keys (EN/IT) — campaign victory localization
- **feat(ui)**: Score repositioned above LAUNCH button — vertical layout with large gold value (28-38px clamp), double glow
- **feat(debug)**: `dbg.completion()` — spawns BOJ at cycle 3 with FED/BCE pre-defeated + max weapon for testing completion flow

## v5.20.0 - 2026-02-15
### Cinematic Ship Deploy + Laser Fix + Feedback Form
- **feat(vfx)**: Cinematic weapon deploy — white flash pulse (200ms), ship brightening during transition, energy burst particles at lock-in, cyan aura ring on completion
- **feat(particles)**: `createDeployBurst()` — radial cyan/violet energy particles (14 count, spark type)
- **fix(laser)**: Multi-beam from actual cannon positions — removed v5.3 single-beam consolidation, LV2 fires 2 beams from pod positions, LV3 fires 3 beams (2 pods + 1 barrel)
- **fix(laser)**: Beam tail clamp — beams no longer extend behind the ship (`_spawnY` clamping)
- **fix(laser)**: Beam ramp-up — 50ms grow from 0 to full length prevents visual pop-in
- **config**: `BEAM.LENGTH` 110→75px (proportioned for multi-beam), `WEAPON_DEPLOY` gains `FLASH_DURATION/FLASH_ALPHA/BRIGHTEN_AMOUNT/BURST_PARTICLES/AURA_PULSE_DURATION/AURA_PULSE_RADIUS`
- **feat(feedback)**: Feedback form in leaderboard — mailto-based overlay with subject + message, sends to psychoSocial_01@proton.me
- **feat(i18n)**: `FB_TITLE/FB_SUBJECT_PH/FB_TEXT_PH/FB_SEND/FB_CANCEL/FB_ERROR_SHORT` keys (EN/IT)
- **feat(ship)**: Auto-cannon mount system — ship starts bare, cannon auto-mounts after 1.5s with VFX trail + burst
- **feat(ship)**: Twin-rail cannon design — consistent barrel aesthetic across nose (LV1), side pods (LV2), central barrel (LV3)
- **fix(laser)**: HYPER/GODCHAIN beam positions match visual weapon level — DPS compensated via damageMult
- **fix(collision)**: Enemy destroyed on player contact — prevents kamikaze multi-hit drain
- **fix(iOS)**: Feedback/nickname/leaderboard overlays whitelisted in InputSystem touch handler
- **fix(debug)**: `window.player` exposed for `dbg.setShot()` and other debug commands

## v5.19.0 - 2026-02-15
### Adaptive Drop Balancer
- **feat(drops)**: Bidirectional drop balancer — boosts drops for struggling players, suppresses for dominant ones
- **feat(drops)**: Struggle detection: 3x drop chance after 40s without drops (LV1-2, low power score), forced drop at 55s
- **feat(drops)**: Domination suppression: 75% drop chance reduction + 2x pity threshold when kill rate > 1.5k/s at high power
- **feat(drops)**: Auto-suppression during HYPER and GODCHAIN active states (configurable kill-switches)
- **feat(drops)**: Post-death grace period: reduced struggle thresholds (25s/3 kills) for 60s after death
- **feat(drops)**: Struggle bias categories: SPECIAL 55% / PERK 35% / UTILITY 10% (offensive recovery focus)
- **feat(drops)**: Anti-AFK guard: struggle requires kill within 8s activity window
- **feat(drops)**: Arcade mode scaling: struggle thresholds x0.85
- **feat(drops)**: Extended power score (3-axis): weapon 50% + special 25% + perks 25%
- **feat(drops)**: `notifyDeath(totalTime)` API for death handler integration
- **feat(playerState)**: `isHyper` and `isGodchain` added to `buildPlayerState()` snapshot
- **feat(debug)**: DROP BALANCER section in `dbg.report()` — struggle/domination counters, kill rate, grace status
- **config**: `Balance.ADAPTIVE_DROP_BALANCER` with STRUGGLE/DOMINATION/POST_DEATH sub-configs, `ENABLED` kill-switch
- **fix(contagion)**: Fire splash damage 1.2→0.50, electric chain damage 0.80→0.40, cascade decay 0.7→0.45 — contagion now weakens neighbors instead of killing them
- **fix(drops)**: PERK drops during cooldown now redirect to SPECIAL instead of spawning uncollectible items on the ground

## v5.18.2 - 2026-02-15
### Leaderboard Premium Redesign
- **feat(leaderboard)**: Medal emoji (🥇🥈🥉) replace numeric ranks 1/2/3 in leaderboard table
- **feat(leaderboard)**: Top 3 rows get colored left border accent (gold/silver/bronze) and subtle gold inset glow on #1
- **feat(leaderboard)**: Rank 1 row has larger, bolder font for visual distinction
- **feat(leaderboard)**: Player row with separator (`···`) shown at bottom when not in displayed top scores
- **feat(leaderboard)**: Motivational message below table when fewer than 5 entries (bilingual EN/IT)
- **style**: Table row padding increased (8px→10px), scroll area min-height 180px for less sparse feel
- **feat(i18n)**: `LB_FEW_ENTRIES` key added (EN/IT)
- **refactor(leaderboard)**: `_getMode()` helper replaces hardcoded `'story'` — arcade-ready (fetchScores, getRank, submitScore)

## v5.18.1 - 2026-02-15
### Battlefield Clearing + Boss Invulnerability
- **fix(combat)**: `clearBattlefield()` — unified bullet clearing at every combat transition (boss/mini-boss spawn, wave deploy, last enemy kill)
- **fix(combat)**: Player bullets explode with spark VFX on clear; enemy bullets explode with VFX + score bonus (10 pts each, as bullet cancel)
- **fix(boss)**: `Boss.isEntering` invulnerability flag — boss immune to damage during entrance animation (safety net)
- **fix(collision)**: `CollisionSystem.processPlayerBulletVsBoss()` and `MiniBossManager.checkHit()` skip hits on entering bosses
- **fix(combat)**: Player firing blocked during boss warning countdown, boss entrance, and mini-boss entrance (no wasted shots)
- **refactor**: Replaced 4 separate bullet-clearing code blocks with `clearBattlefield()` calls (startBossWarning, spawnBoss, isLastEnemy, MiniBossManager.spawn)

## v5.18.0 - 2026-02-15
### What's New Panel — Multilingual + Redesign
- **feat(i18n)**: What's New panel fully bilingual EN/IT — all entries (titles, items, planned section) switch with language
- **feat(content)**: Added 10 missing major versions (v5.8.0–v5.17.0) with 3-4 bullet points each
- **feat(content)**: Translated all 10 existing entries (v4.47–v5.7.0) to Italian
- **feat(i18n)**: `COMING_SOON` key added to Constants.js (EN: "COMING SOON", IT: "IN ARRIVO")
- **feat(i18n)**: `WHATS_NEW_PLANNED` entries now bilingual objects
- **refactor**: Removed `whatsNewRendered` guard — panel re-renders every open for correct language
- **style**: Spacious card redesign — larger fonts (h3 16px, li 13px, date 11px, title 22px), more padding (12px/14px), wider box (440px)

## v5.17.2 - 2026-02-15
### Leaderboard: Platform Tag + Nickname 6 Chars Min
- **feat(leaderboard)**: Platform tag (Desktop/Mobile) on each score entry — emoji icons in leaderboard table and gameover top 5
- **feat(nickname)**: Nickname range changed from 3-12 to 3-6 characters (shorter callsigns)
- **backend**: Worker updated — `p` field in score entry, HMAC signature includes platform, validation accepts D/M
- **i18n**: Updated NICK_PLACEHOLDER and NICK_INVALID strings (EN/IT) to reflect 6-12 range

## v5.17.1 - 2026-02-15
### Guaranteed Special Drop Pre-Boss
- **fix(drops)**: Guaranteed SPECIAL weapon drop from wave 4+ if none dropped in current cycle — prevents boss fights without offensive specials
- **config**: `Balance.DROP_SCALING.GUARANTEED_SPECIAL_WAVE: 4` — configurable threshold
- **tracking**: `DropSystem.specialDroppedThisCycle` flag, resets on game start and cycle transition (post-boss)

## v5.17.0 - 2026-02-15
### Online Leaderboard System — Nickname + Score Submit + Rankings
- **feat(leaderboard)**: Online leaderboard with Cloudflare Workers + KV backend. Top 100 scores, sorted descending. REST API: `GET /api/lb`, `GET /api/rank`, `POST /api/score`
- **feat(leaderboard)**: Anti-cheat: HMAC-SHA256 signature, rate limit (30s/IP), score ceiling validation, sanity checks (kills ratio, cycle/wave bounds)
- **feat(nickname)**: Mandatory callsign prompt (3-12 chars, alphanumeric + spaces) on first launch. Persisted in localStorage, shown before game start
- **feat(leaderboard)**: Trophy button in intro icons opens full leaderboard modal (scrollable table, top 3 gold/silver/bronze highlight, self highlight cyan)
- **feat(leaderboard)**: Gameover rank section — submits score async, shows player rank + top 5 mini-list inline, "VIEW FULL LEADERBOARD" button. Tier badges: TOP 3 (gold pulse), TOP 5 (silver), TOP 10 (cyan) with animation
- **feat(i18n)**: Full EN/IT localization for all leaderboard and nickname UI (`LB_*`, `NICK_*` keys)
- **config**: `Game.LEADERBOARD_API` + `Game.LEADERBOARD_HMAC_KEY` in Constants.js
- **backend**: `workers/leaderboard-worker.js` + `workers/wrangler.toml` (deploy-ready)
- **css**: `#nickname-overlay` (z-index 10100), `#leaderboard-panel` (z-index 10000), mobile fullscreen, top 3 color coding
- **unchanged**: Gameplay, scoring, offline play (leaderboard gracefully degrades to "OFFLINE")

## v5.16.1 - 2026-02-15
### Fix SALVO — Readable Band Waves + Progressive Aim
- **feat(salvo)**: Band firing — all bullets in a SALVO row travel in **uniform direction** (no crossing). Replaces per-enemy aimed fire that created unreadable intersecting paths
- **feat(salvo)**: Progressive `AIM_FACTOR` per cycle [0, 0.4, 0.7] — C1 straight down (pure bands), C2 40% aimed toward player (bands sweep slightly), C3 70% aimed (aggressive tracking). Angle computed once per row from row center to player position
- **fix(choreography)**: Burst/pause cycle disabled (BURST_DURATION/PAUSE_DURATION→0) — conflicted with SALVO setTimeout callbacks, cutting salvos mid-execution
- **balance(salvo)**: MAX_ROWS per-cycle [2, 3, 4] — C1 fires only 2 rows (~6-8 bullets), C2=3 rows, C3=4 rows
- **balance(salvo)**: ARRIVAL_GAP widened for C1: 0.45→0.55s between row arrivals
- **balance(fire_budget)**: C1 BPS 18→12 — sequences control rhythm, raw budget caps total
- **balance(sequences)**: All VERSE reduced to 1 SALVO + 1 light command per 16-beat cycle. CHORUS/BEAR: 2 SALVO per 32-beat, 16 beats apart
- **unchanged**: Boss sequences, corridor/skip mechanics, HALF_SWEEP logic

## v5.16.0 - 2026-02-15
### Coordinated Salvo System — Row-by-Row Fire + Safe Corridors + Half-Sweeps
- **feat(choreography)**: `SALVO` command — enemies fire row-by-row (top→bottom) with configurable delay per cycle (C1 180ms, C2 150ms, C3 120ms). Safe corridor skip prevents bullets in a random vertical band. 15% organic skip chance per enemy for variation
- **feat(choreography)**: `HALF_SWEEP_LEFT` / `HALF_SWEEP_RIGHT` — only one side of enemies fires with staggered timing, creating an entire safe half-screen for the player to dodge into
- **feat(choreography)**: Corridor telegraph — green dashed-line safe zone indicator (`addGapTelegraph`) shows the corridor during each salvo, giving player visual read on where to move
- **feat(choreography)**: Corridor X biased toward player position (±100px jitter) so corridors are reachable but not trivially predictable
- **balance(sequences)**: All VERSE sequences rewritten — `SYNC_FIRE` replaced by `SALVO`, `RANDOM_SINGLE` filler reduced, `HALF_SWEEP` alternation creates left/right rhythm. Player reads: salvo→corridor→half-sweep→opposite side
- **balance(sequences)**: CHORUS_ASSAULT rewritten — `SALVO DOUBLE` + CASCADE + alternating HALF_SWEEP. More intense but always with corridors
- **balance(sequences)**: BEAR_MARKET_CHAOS rewritten — `SALVO DOUBLE` + rapid cascades + HALF_SWEEP. No more `RANDOM_VOLLEY` (replaced with structured patterns)
- **balance(fire_budget)**: C1 BPS 12→18 (corridors make higher density readable), BURST_DURATION 2.0→1.5s, PAUSE_DURATION 1.2→0.8s (SALVO built-in gaps compensate shorter global pause)
- **config**: `Balance.CHOREOGRAPHY.SALVO` — ROW_DELAY/CORRIDOR_WIDTH per cycle, SKIP_CHANCE, MAX_ROWS
- **unchanged**: Boss sequences (use PATTERN/BOSS_SPREAD, not enemy fire), DEFAULT_BASIC fallback

## v5.15.1 - 2026-02-15
### C1 Rebalance — LV1 Buff + Boss HP + Drop Pacing + No Meter Decay
- **balance**: LV1 weapon buff — cooldownMult 1.00→0.70 (+43% fire rate), damageMult 1.00→1.20 (+20% damage). LV2+ unchanged
- **balance**: DIP meter decay removed — meter only goes up from proximity kills, auto-paces with enemy density. HYPER risk/reward self-balancing via INSTANT_DEATH + 1.5x hitbox
- **balance**: Boss HP BASE 4083→3000 (-27%), MIN_FLOOR 4000→3000. C1 boss target ~75-100s at WPN LV1 (was ~180s)
- **balance**: Drop pity timer — PITY_BASE 40→30 (drop every ~30 kills instead of ~40), EARLY_DROP_PREFILL 25→32 (first drop after ~15 kills instead of ~30)
- **balance**: GODCHAIN cooldown 10s after deactivation — prevents back-to-back re-triggers from rapid perk drops. Perk collected during cooldown is consumed but doesn't re-activate GODCHAIN
- **fix**: EARLY_DROP_LEVEL 2→1 — prefill now applies from game start (was broken: weapon level never reaches 2 before boss since v5.11.0)

## v5.15.0 - 2026-02-15
### Cyber Destruction Overhaul — Rectangular Fragments + Elemental Tint + Tier SFX
- **feat(vfx)**: Rectangular fragment particles replace circular "balloon" explosions. Rotating debris with randomized width/height for a cyber-shrapnel aesthetic
- **feat(vfx)**: Elemental tint on death fragments — 60% of shrapnel colored with element color (fire orange, laser cyan, electric violet) when killing with elemental bullets
- **feat(vfx)**: Elemental tint on living enemies — flash overlay on hit, persistent tint on enemies surviving splash/chain damage. Visual feedback for contagion spread
- **feat(audio)**: Tier-differentiated destruction SFX (`enemyDestroy`) — noise crunch (highpass filtered), sub-bass thud (MEDIUM/STRONG), square snap sweep. Replaces flat `coinScore` sound
- **feat(audio)**: Elemental destroy layer (`elemDestroyLayer`) — fire rumble (bandpass noise 200Hz), laser shimmer (triangle sweep), electric zap (3 square pulses)
- **fix(pool)**: ObjectPool `acquire()` now resets all special particle flags (isRect, isRing, isSpark, isGlow, symbol, rotation, gravity, etc.) preventing stale state from recycled particles
- **config**: `Balance.VFX.ENEMY_DESTROY` — master config for rect fragments, elemental tint ratios, tier SFX volumes/durations
- **config**: `Balance.ELEMENTAL.ENEMY_TINT` — flash duration/alpha, persistent alpha, per-element colors
- **pipeline**: CollisionSystem passes `elemType` through `takeDamage()` and `applyContagionTint()` to surviving enemies
- **kill-switches**: `VFX.ENEMY_DESTROY.ENABLED` (master), `.RECT_FRAGMENTS.ENABLED`, `.ELEMENTAL_TINT.ENABLED`, `.SFX.ENABLED` (fallback to coinScore), `ELEMENTAL.ENEMY_TINT.ENABLED`

## v5.14.0 - 2026-02-14
### Score Pulse System — HUD-Reactive Score Feedback
- **feat(hud)**: Score Pulse Tiers — 5-tier reactive HUD score (MICRO/NORMAL/BIG/MASSIVE/LEGENDARY) replaces floating "+500" text. Tier determined by score gain amount, CSS animations with scale+shake+glow per tier
- **feat(hud)**: Combo accumulator — rapid kills within 0.4s bump the tier up (max +2 levels), rewarding kill chains with intensifying visual feedback
- **feat(vfx)**: HUD particle burst — BIG+ tiers spawn gold/orange/red sparks from HUD score position. MASSIVE/LEGENDARY add starburst ring. `ParticleSystem.createScoreHudBurst(tier)`
- **feat(vfx)**: LEGENDARY tier triggers screen edge glow (`triggerScorePulse`) for boss kills and massive combos
- **refactor(score)**: `updateScore(score, scoreGain)` — all call sites now pass gain amount for tier detection
- **config**: `Balance.JUICE.SCORE_PULSE_TIERS` (thresholds, scale, duration, colors, shake, accumulator settings)
- **config**: `Balance.JUICE.SCREEN_EFFECTS.SCORE_FLOATING_TEXT: false` — kill-switch disables old floating text (set `true` for legacy behavior)
- **removed**: `createScoreParticles` homing particles from enemy kill (replaced by HUD burst)
- **removed**: `createFloatingScore` calls from enemy/boss kill sites (score info now communicated via HUD pulse)
- **feat(hud)**: New High Score indicator — one-shot `scoreRecordBreak` animation (2x scale white flash) when surpassing record, then persistent magenta pulsing glow (`.score-new-record`) for rest of run. Particle burst + screen glow + "NEW HIGH SCORE!" message + SFX
- **css**: 4 tier keyframes (`scorePulseNormal`/`Big`/`Massive`/`Legendary`) replace single `scoreBump`. `scoreRecordBreak` + `scoreNewRecordPulse` for high score. `prefers-reduced-motion` supported

## v5.13.1 - 2026-02-14
### Health Check — Boss Death Race Condition + Code Hygiene
- **fix(boss-death)**: Tracked all boss death `setTimeout` calls in `_bossDeathTimeouts[]` — restart/back-to-intro during celebration now cancels all orphan timeouts (coin rain, explosions, evolution item, celebration transition). Prevents ghost `_evolutionItem` writes and stray explosions on fresh game state
- **refactor(arcade)**: Extracted Volatile Rounds and Chain Lightning hardcoded values to `Balance.ARCADE.MODIFIER_TUNING` (AOE_RADIUS, DMG_MULT, HIT_FLASH, RANGE)
- **refactor(damage)**: `baseDamage || 14` → `?? 14` in 6 locations (CollisionSystem, BulletSystem, MiniBossManager, main.js) — semantically correct nullish coalescing
- **refactor(weapon)**: `weaponLevel || 1` → `?? 1` in 14 locations (Player.js, main.js, ParticleSystem, DebugSystem) — consistent with v5.11.1 `??` convention

## v5.13.0 - 2026-02-14
### Spectacular Elemental VFX
- **feat(vfx)**: Napalm impact — fire kills now produce expanding ring + 6 directional flame tongues + 5 gravity embers (replaces 8 plain circles). Kill-switch: `ELEMENTAL_VFX.NAPALM.ENABLED`
- **feat(vfx)**: Lightning bolt — electric chains now render as jagged multi-segment bolts with random branches, 3-layer glow (core/mid/branches), alpha fade. Kill-switch: `ELEMENTAL_VFX.LIGHTNING.ENABLED`
- **feat(vfx)**: Laser beam impact — perpendicular spark burst on every beam hit, white pierce-through flash on penetration
- **feat(vfx)**: Contagion cascade lines — visible connection lines + ripple rings when elemental kills cascade to nearby enemies
- **feat(vfx)**: Canvas effect system — new `canvasEffects[]` array in ParticleSystem for non-particle visual effects (lightning, lines, ripples), capped at 20, rendered in additive pass
- **feat(vfx)**: Elemental ship aura — per-perk persistent glow + ambient particles: fire embers rise from ship, laser cyan trail dots behind ship, electric mini-arcs crackle around ship. Stacking alpha reduction for multiple auras. Kill-switch: `ELEMENTAL_VFX.SHIP_AURA.ENABLED`
- **feat(vfx)**: Elemental pickup burst — perk collection produces colored ring + 12 radial sparks + central glow (color matches element type)
- **feat(vfx)**: Elemental pickup pulse — brief radial flash on ship body when perk collected, color per element
- **feat(vfx)**: Screen flash on perk pickup (color per element) + GODCHAIN activation flash (gold). Kill-switches in `JUICE.SCREEN_EFFECTS`
- **feat(vfx)**: GODCHAIN apotheosis — symbol burst (fire/lightning/diamond emoji) + 2 expanding gold rings + central glow when 3rd perk triggers GODCHAIN
- **config**: `Balance.ELEMENTAL_VFX` — new top-level config section with PICKUP_SURGE, SHIP_AURA, GODCHAIN_APOTHEOSIS, NAPALM, LIGHTNING, BEAM_IMPACT subsections
- **config**: `Balance.ELEMENTAL.CONTAGION_VFX` — cascade line/ripple visual config
- **config**: `Balance.JUICE.FLASH.PERK_PICKUP/GODCHAIN_ACTIVATE` — new screen flash entries
- **config**: `Balance.JUICE.SCREEN_EFFECTS.PERK_PICKUP_FLASH/GODCHAIN_ACTIVATE_FLASH` — new kill-switches

## v5.12.0 - 2026-02-14
### Progressive Step-by-Step Tutorial
- **feat(tutorial)**: Redesigned tutorial from 4 static cards to 3 sequential animated steps: Mission (magenta), Controls (violet), Shield (cyan)
- **feat(tutorial)**: Step-by-step flow with NEXT/GO! button, slide-up entrance + slide-left exit animations
- **feat(tutorial)**: Progress dots indicator (3 dots, active = violet glow)
- **feat(tutorial)**: Platform-aware controls text (PC keyboard vs mobile touch) per step
- **feat(tutorial)**: `prefers-reduced-motion` support — instant transitions, no animations
- **feat(i18n)**: New tutorial keys: `TUT_STEP_MISSION`, `TUT_STEP_CONTROLS_PC/MOBILE`, `TUT_STEP_SHIELD_PC/MOBILE`, `TUT_NEXT` (EN + IT)
- **refactor**: Removed old `.tut-group`, `.tut-divider`, `.tut-card--survive` CSS and unused i18n keys

## v5.11.1 - 2026-02-14
### Bugfix: Death Penalty
- **fix(player)**: `DEATH_PENALTY: 0` was ignored — JS `||` operator treats 0 as falsy, so `0 || 1 = 1` applied -1 weapon level on death despite config. Fixed with nullish coalescing `??`

## v5.11.0 - 2026-02-14
### Cinematic Boss Evolution + 3-Level Weapon System
- **feat(weapon)**: 3-level weapon system (was 5) — LV1 Single, LV2 Dual, LV3 Triple MAX. HYPER adds +2 temp levels (max effective LV5). Cleaner progression tied to boss kills
- **feat(boss)**: Evolution Core item — boss defeat spawns a glowing cyan diamond that flies to the player with curved path + trail particles, triggering cinematic weapon upgrade (slowmo 0.4s + flash + shockwave burst)
- **feat(boss)**: Cinematic boss death sequence — 500ms freeze → 1.5s slowmo, 6 config-driven chain explosions with offsets/scale (climax explosion at t=2.5s), coin rain (25 symbols with gravity+wobble)
- **feat(vfx)**: `createWeaponUpgradeEffect` — expanding shockwave ring + 14 radial energy sparks + central flash glow
- **feat(vfx)**: `createCoinRain` — celebratory currency symbols ($€¥£₿) falling with sinusoidal wobble
- **feat(vfx)**: `createEvolutionItemTrail` — cyan spark trail during evolution item flight
- **feat(particles)**: Gravity + wobble physics support in particle update loop
- **balance(drops)**: UPGRADE removed from enemy drop table — weapons only evolve via boss Evolution Core. Drop pool: 60% SPECIAL, 20% UTILITY, 20% PERK
- **balance(death)**: No weapon loss on death (`DEATH_PENALTY: 0`) — evolution is permanent for the run
- **balance(timing)**: `BOSS_CELEBRATION_DELAY` 2→5s to accommodate chain explosions + evolution item flight + transform
- **balance(APC)**: Adaptive Power Calibration formula updated for 3-level range: `(wl-1)/2` (0, 0.5, 1.0)
- **config**: `Balance.VFX.BOSS_DEATH` — new section with CHAIN_EXPLOSIONS, COIN_RAIN, EVOLUTION_ITEM configs
- **config**: `Balance.JUICE.HIT_STOP` — BOSS_DEFEAT replaced by BOSS_DEFEAT_FREEZE (0.5s) + BOSS_DEFEAT_SLOWMO (1.5s) + WEAPON_UPGRADE (0.4s)

## v5.10.3 - 2026-02-14
### Boss Flow Fixes + Bullet Collision + Drop Economy
- **fix(boss)**: Boss defeat no longer double-spawns next wave — `waveInProgress` flag blocks WaveManager during 2s celebration, preventing spurious START_INTERMISSION before story screen
- **fix(boss)**: Boss bullet collision radius 4→8px — tagged `isBossBullet` uses `BOSS_PATTERN.collisionRadius` (44% of visual radius ~18px), matching enemy bullet proportions
- **fix(drops)**: PERK diamond not consumed during cooldown — pickup skipped if `perkCooldown > 0`, diamond floats until collectible
- **fix(drops)**: UPGRADE drops at max weapon redirected to SPECIAL — removed stale `GODCHAIN_RECHARGE_NEED` (dead since v4.60), pity timer also redirects at WPN max

## v5.10.2 - 2026-02-14
### Shield Duration + Boss Celebration + PWA Bottom Inset
- **fix(player)**: Shield duration 2s→5s — configurable via `Balance.PLAYER.SHIELD_DURATION`, all 3 shield activation paths now read from config
- **feat(boss)**: Boss defeat celebration delay — 2s pause before intermission/story screen (`Balance.TIMING.BOSS_CELEBRATION_DELAY`), chain reaction explosions at t=0.6s and t=1.1s
- **feat(boss)**: Enhanced boss defeat impact — hitstop 0.5s→1.0s, screen shake 60→80, shake reads from `Balance.EFFECTS.SHAKE.BOSS_DEFEAT`
- **fix(pwa)**: Bottom safe area inset for iPhone PWA — `--pwa-bottom-inset` CSS variable (min 34px home indicator), all 14 `env(safe-area-inset-bottom)` references wrapped in `var()` fallback

## v5.10.1 - 2026-02-14
### PWA Icons: Crypto Viper
- **feat(icons)**: Regenerated all 7 PWA icons (120→1024px) with Crypto Viper LV5 ship design — chevron body, swept fins, gun pods, BTC cockpit path, reactor flames
- **style(icons)**: Deep space radial gradient background, seeded stars, "FIAT vs CRYPTO" title with violet glow and cyan "vs" accent
- **chore(icons)**: Canvas-based generator tool (`_generate_icons.html`) for future icon regeneration, gitignored

## v5.10.0 - 2026-02-14
### Shield Fin Glow + Tutorial Redesign
- **feat(player)**: Shield Fin Glow — cyan additive glow on fins replaces SHIELD_RING circle. Cooldown: fins fill 0→100% alpha. Ready: pulsing cyan + radial glow at fin tips. Hidden during active hex shield
- **feat(config)**: `SHIELD_FIN_GLOW` config in `DIEGETIC_HUD` (COOLDOWN_ALPHA, READY_ALPHA, READY_PULSE_SPEED/AMP, GLOW_SPREAD). `SHIELD_RING.ENABLED: false`
- **feat(tutorial)**: Card-based mission briefing — 4 sections with colored left-border accents and icon badges (◎ magenta objective, ♥ gold survival, ◂▸ violet controls, ⬡ cyan shield)
- **feat(tutorial)**: Two-group layout — gameplay (objective + survival) separated from controls (move + shield) by violet gradient divider
- **feat(tutorial)**: Shield step with cyan highlight — explains fin glow mechanic to new players (i18n EN/IT)
- **style(tutorial)**: Compact typography (14px text, 10px gap), `.tut-card`/`.tut-group`/`.tut-divider` CSS system

## v5.9.0 - 2026-02-14
### Ship Redesign: Crypto Viper
- **feat(player)**: Complete ship redesign — 42px chevron silhouette (was 30px triangle), 6-vertex body with shoulder breaks, waist, flared rear
- **feat(player)**: Metallic tech palette — dark violet body (#2a2040/#6644aa), purple nose cap (#4d3366/#9966cc), teal fins (#1a4455/#2a6677)
- **feat(player)**: BTC cockpit path — symbol drawn as multi-layer stroke path (glow/bright/core) instead of text, cyan normal / orange GODCHAIN
- **feat(player)**: Dramatic weapon evolution — bodyHalfW 22→33px across LV1-GC, swept-back fins with finExt 0→10px, panel lines LV3+, diagonal accents LV4+
- **feat(player)**: Dorsal spine — central violet accent line always visible, scales with GODCHAIN intensity
- **feat(player)**: Updated deploy animation — new hidden positions (pods 8/-14/3.5, barrel -36/2.5), finExt lerped during transitions
- **feat(player)**: Proportional hitboxes — BTC 42/8, ETH 50/9, SOL 24/5 (core hitbox scales with ship size)
- **feat(player)**: Chevron afterimage trail — 6-vertex silhouette replaces triangle for movement trail
- **feat(player)**: Larger hex shield — radius 52 (was 40), hexSize 11, 6 rows for full coverage
- **feat(player)**: HYPER aura scaled — timer ring 58px, orbiting orbs 53px, base aura 35px
- **feat(player)**: Wider bullet spread — 7x22 base bullets (was 5x20), 2-bullet ±8px, 3-bullet ±13px offsets
- **feat(player)**: Muzzle flash LV1 at Y=-40 (was -32), matching nose barrel position
- **feat(player)**: Side thrusters repositioned — ±34/18px (was ±28/16px) matching wider chevron
- **feat(player)**: Reactor flame Y=14 (was 12), aligned with chevron rear
- **feat(bullet)**: Visual multipliers tuned — 1.8x width / 1.2x height (was 2.0/1.3), BTC font 9px (was 8px)
- **feat(balance)**: Bullet spawn Y offset 33 (was 25), collision radius 6 (was 5), core radius 8 (was 6)
- **feat(balance)**: Diegetic HUD — life pips Y=34, shield ring radius 45, muzzle flash 8x20px base

## v5.8.0 - 2026-02-14
### Arcade Mode: Rogue Protocol
- **feat(arcade)**: Arcade mode unlocked — fully playable roguelike shooter mode with infinite scaling
- **feat(arcade)**: Roguelike modifier system — 15 modifiers across 3 categories (OFFENSE/DEFENSE/WILD), selectable after boss and mini-boss defeats
- **feat(arcade)**: Post-boss modifier choice — 3-card fullscreen modal with category colors, stack indicators, slide-in animation
- **feat(arcade)**: Post-mini-boss modifier choice — 2-card compact selection for quick picks
- **feat(arcade)**: Combo scoring system — kill chain counter with 3s timeout, graze extends +0.5s, multiplier up to 5.0x (combo 80), death/hit resets
- **feat(arcade)**: Combo HUD — canvas-drawn "xN COMBO" below score, color gradient (white/yellow/orange/red), pulse animation, fade-out on reset
- **feat(arcade)**: Mini-boss enhancements — lower kill thresholds (x0.65), 10s cooldown (vs 15s), max 3/wave, 50% boss HP (vs 60%)
- **feat(arcade)**: Aggressive pacing — 2s intermission (vs 3.2s), 4s boss celebration (vs 6s), 0.5s horde transition (vs 0.8s)
- **feat(arcade)**: Enemy scaling — +15% count, -15% HP per wave (swarm-friendly, combo-friendly), +10% drop rate
- **feat(arcade)**: Post-C3 infinite scaling — wave definitions cycle C1-C3, formations remixed (40% chance), +20% difficulty per cycle beyond C3
- **feat(arcade)**: Modifier effects — fire rate, damage, pierce, player speed, enemy HP/bullet speed, drop rate, pity timer, score multiplier, graze radius
- **feat(arcade)**: Special modifiers — Volatile Rounds (AoE on kill), Chain Lightning (chain to nearby), Critical Hit (15% chance 3x), Nano Shield (auto 45s), Last Stand (survive lethal 1x/cycle)
- **feat(arcade)**: Wild modifiers — Double Score (+2x score, +25% enemy HP), Bullet Hell (+40% fire, +60% drops), Speed Demon (+25% all speed), Jackpot (halved pity, -1 life), Berserker (+50% dmg, no shield drops)
- **feat(arcade)**: Gameover stats — best combo, protocol count alongside cycle/level/wave
- **feat(ui)**: Modifier overlay — z-index 9800, backdrop blur, responsive card layout
- **feat(i18n)**: Arcade mode descriptions updated for EN/IT ("Roguelike protocols. Infinite runs.")
- **fix(ui)**: Removed WIP tag and disabled state from Arcade button
- **new files**: `src/systems/ArcadeModifiers.js`, `src/ui/ModifierChoiceScreen.js`
- **config**: `Balance.ARCADE` section — pacing, combo, mini-boss, scaling, modifier counts

## v5.7.0 - 2026-02-14
### Premium Boss Redesign + Tap Shield + Visual Polish
- **feat(boss)**: FED "The Corrupted Printer" — pyramid body with All-Seeing Eye (iris gradient + tracking pupil), neon green edges, CRT scan lines, orbiting $ symbols, P2 glitch artifacts + side emitters, P3 wireframe flicker + matrix rain $ + afterimage pupil trail
- **feat(boss)**: BCE "The Star Fortress" — EU star fortress with 12 energy nodes connected by gold lines, segmented golden ring, holographic € center, P2 nodes pulse independently, P3 ring fragments + light-leak cracks + autonomous debris
- **feat(boss)**: BOJ "The Golden Torii" — floating torii gate in neon gold with rising sun rays, ¥ glow center, P2 yield curve EKG + INTERVENTION flash, P3 meltdown (wave distortion, heat haze, molten drips, incandescent color shift)
- **feat(boss)**: HP bar redesign — rounded rect, gradient fill, additive glow, phase threshold markers at 66%/20%, monospace typography
- **feat(shield)**: hexgrid energy shield — honeycomb hexagon pattern with radial wave animation, multi-layer additive glow, 0.33s sequential fade-out on deactivation, replaces flat cyan circle
- **feat(shield)**: tap-on-ship activation — shield button removed, tap on ship to activate shield on mobile; pulsing cyan ring with rotating dash accents indicates "ready" state; keyboard (Down/S) unchanged on desktop
- **feat(shield)**: diegetic ready indicator — pulsing ring (alpha 0.20–0.50) + outer additive glow + 2 rotating dash arcs around ship when shield is available
- **feat(ui)**: status text sizes +2-3px across all message types — wave 12→14, danger/victory 16→18, info 10→12, pickup 11→13, HYPER/GODCHAIN 11→13, floating score 18→20, perk card headers/desc +2px
- **feat(ui)**: mobile text breakpoints bumped — 380px and 320px media queries increased proportionally
- **fix(ui)**: removed asymmetric left boundary margin (shield button no longer occupies that space)
- **debug**: `dbg.boss(type)` — spawn any boss instantly during gameplay (fed/bce/boj)
- **config**: all boss rendering uses `ColorUtils.rgba()` and `ColorUtils.font()` for GC-friendly per-frame drawing
- **config**: all boss rendering uses additive compositing (`'lighter'`) for glow layers (consistent with rest of game)

## v5.6.0 - 2026-02-14
### Digital Scanline Void (replaces Paper Tear)
- **feat(vfx)**: digital scanline void — neon violet horizontal split replaces cartoon paper tear effect
- **feat(vfx)**: opening flash — thin neon line at center expands into void (1.2s ease-out)
- **feat(vfx)**: neon border lines — 2-layer glow + core stroke with additive blending (`'lighter'`)
- **feat(vfx)**: glitch segments — 4 random-length offset lines per edge, refresh every 80ms
- **feat(vfx)**: CRT void scanlines — subtle horizontal lines every 3px (alpha 0.03) inside void
- **feat(vfx)**: shimmer/breathing — border alpha oscillates ±15% via sine wave
- **feat(vfx)**: closing flash — neon burst when void fully closes (0.6s ease-in)
- **config**: `Balance.PAPER_TEAR` rewritten — `SCANLINE`, `GLITCH`, `VOID_SCANLINES`, `FLASH` blocks (replaces `EDGE`/`SHADOW`)
- **config**: kill-switch `ENABLED: false` preserved — instant open/close behavior unchanged
- **compat**: API fully backward-compatible — zero changes to main.js (all 10 call sites unchanged)

### Selection Screen Layout Refresh
- **feat(ui)**: layout reordered — mode indicator at top, then ship header/stats/record, then ship preview with arrows, then LAUNCH
- **feat(ui)**: ship selection re-enabled — `cycleShip()` restored, arrow buttons `‹` `›` flanking ship preview, keyboard arrows supported
- **feat(ui)**: mode indicator enlarged — text 18-22px (was 14-16px), more glow and spacing
- **fix(ui)**: hint/record text readability — removed white stroke text-shadow, clean lavender color instead
- **i18n**: "tap to change" → "change mode" (EN) / "cambia modalità" (IT)

## v5.5.0 - 2026-02-14
### Cinematic Story Backgrounds
- **feat(story)**: PROLOGUE — falling gold coins dissolving into grey dust with golden sparks (14 coins, dissolve at 60% screen)
- **feat(story)**: CHAPTER_1 — Matrix-style hex rain with pulsing Bitcoin symbol (28 chars, center attraction, amber ₿ glow)
- **feat(story)**: CHAPTER_2 — network nodes with pulse connections (18 nodes, violet vs cyan debate, traveling pulse every 2.5s)
- **feat(story)**: CHAPTER_3 — lightning network globe (22 amber nodes, zigzag bolts every 2.5s, radial ripples)
- **new**: `src/story/StoryBackgrounds.js` — per-chapter animated backgrounds with dispatch tables
- **config**: `Balance.STORY_BACKGROUNDS` — per-chapter tuning, kill-switch `ENABLED: true` (fallback to legacy stars)

## v5.4.0 - 2026-02-13
### HUD Message Refactoring
- **feat(hud)**: PICKUP toast — power-up/perk/GODCHAIN feedback now uses DOM message strip (Zona 1) with cyan border, scale-in bounce animation (150ms)
- **feat(hud)**: priority-based drop logic — low-priority messages silently dropped when high-priority message is active (< 60% duration elapsed)
- **feat(hud)**: meme combat suppression — meme popups auto-suppressed during active combat, visible only in INTERMISSION and first 2s of each wave
- **feat(hud)**: boss intermission 6s — sequenced messages: VICTORY (0-2s) → weapon unlock (2-4s) → CYCLE BEGINS (4-6s), skippable
- **feat(hud)**: HYPER idle slim bar — ready state shows 160x4 golden pulsing bar, cooldown shows grey filling bar (replaces text labels)
- **feat(hud)**: 3-row HUD layout — HYPER bar (Row 1, compact 18px) → message strip (Row 2) → GODCHAIN (Row 3), positions derived from DOM `_stripTopY` for safe-area alignment
- **feat(hud)**: pause button resized to span both feedback rows (48px height, aligned with HYPER bar + message strip zone)
- **fix(layout)**: enemy `START_Y` raised to 130, `START_Y_RESPONSIVE` disabled — enemies no longer overlap HUD/message strip on any screen size
- **refactor**: pickup feedback routed from MemeEngine popup to MessageSystem strip (perk, powerup, GODCHAIN on/off)
- **refactor**: PerkIconManager calls removed from PerkManager (feedback via showPickup)
- **config**: kill-switches for rollback — `HUD_MESSAGES.SHIP_STATUS`, `PERK_NOTIFICATION`, `MEME_POPUP.COMBAT_SUPPRESSION`, `HYPER_UI.SHOW_TEXT_WHEN_IDLE`, `MESSAGE_STRIP.DROP_LOW_PRIORITY`
- **config**: `Balance.TIMING.INTERMISSION_BOSS_DURATION` (6.0s), `Balance.HUD_MESSAGES.HYPER_UI` block

## v5.3.0 - 2026-02-13
### Gradius-Style Laser Beam
- **feat(vfx)**: laser beam replaces bullet when Laser perk active — 110px elongated beam bolt with 3-layer rendering (white core → cyan mid → additive outer glow)
- **feat(vfx)**: beam head glow — radial white-to-cyan gradient at leading tip
- **feat(vfx)**: shimmer animation — beam width pulses ±15% at ~2.4Hz (sin wave)
- **feat(vfx)**: beam direction-aligned to velocity vector (supports spread angles)
- **feat(gameplay)**: Gradius-style single beam — multi-cannon levels (LV2+) consolidate into one powerful central beam with combined damage (×2 for Dual, ×3 for Triple)
- **feat(collision)**: line-segment vs circle collision for beam bullets — `BulletSystem.lineSegmentVsCircle()` replaces circle check; beam damages enemies along entire 110px length
- **feat(collision)**: beam bullet cancellation — player laser beams cancel enemy bullets along full segment (both spatial grid and fallback paths)
- **feat(debug)**: `dbg.hitboxes()` shows cyan collision segment for beam bullets
- **feat(vfx)**: elemental overlay compositing — Fire trail, Electric arcs, HYPER sparkles, GODCHAIN fire tongues render on top of beam body
- **config**: `Balance.ELEMENTAL.LASER.BEAM` — ENABLED kill-switch, LENGTH, CORE/MID/OUTER widths and alphas, SHIMMER_SPEED, HEAD_GLOW_RADIUS
- **perf**: beam consolidation reduces bullet pool objects at high weapon levels (1 beam vs 2-3 bullets), culling margin expanded to 130px for beam bounds

## v5.2.0 - 2026-02-13
### Weapon Deployment Animation System
- **feat(vfx)**: weapon upgrade transitions — mechanical slide-out animation with ease-out-back overshoot (0.35s)
- **feat(vfx)**: LV1 nose barrel — small integrated barrel always visible at ship tip with pulsing glow
- **feat(vfx)**: LV1→LV2 gun pods slide out from body, LV2→3 pods extend upward, LV3→4 barrel rises + pods widen, LV4→5 full extend + armor
- **feat(audio)**: `weaponDeploy` SFX — two-phase procedural sound (square sweep whoosh + triangle/square mechanical clank at lock-in)
- **feat(vfx)**: screen shake + haptic feedback at 85% animation progress (lock-in moment)
- **feat(vfx)**: muzzle flash positions follow animated geometry during deployment
- **config**: `Balance.VFX.WEAPON_DEPLOY` — ENABLED kill-switch, DURATION (0.35s), LOCK_AT (0.85), SHAKE_INTENSITY (6px)
- **fix**: deploy cancelled on death/reset — no visual glitches from interrupted animations

## v5.1.0 - 2026-02-13
### Directional Muzzle Flash VFX
- **feat(vfx)**: new canvas V-flash muzzle effect — directional diamond shape drawn at actual cannon positions per weapon level
- **feat(vfx)**: 3-layer coloring (inner white → mid → outer colored) with linear alpha decay from fire timer
- **feat(vfx)**: elemental perk tinting — Fire (wider, red), Laser (taller/narrower, cyan), Electric (side spark arcs, violet), GODCHAIN (oscillating fire tongues)
- **feat(vfx)**: muzzle flash scales with weapon level (+12%/lvl, includes HYPER boost)
- **refactor(particles)**: `createMuzzleFlashParticles` rewritten — directional sparks (0.3 rad spread) + 1 white tracer per barrel, tinted per elemental perk
- **fix(visual)**: muzzle flash positions now match actual ship geometry — LV1 nose tip, LV2-3 gun pod tops, LV4+ pods + central barrel
- **config**: `Balance.VFX.MUZZLE_FLASH` — full kill-switch (`ENABLED`), color palettes, shape modifiers, spark/tracer params
- **perf**: reduced particle count (2+level vs 3+level×2) — canvas flash carries visual weight

## v5.0.9 - 2026-02-13
### Visual Polish + Elemental Tuning Round 2
- **fix(visual)**: removed muzzle flash "bubble" effect (circle + ring burst on player nose when firing)
- **fix(visual)**: removed flash ring particle from muzzle spark system — only directional sparks remain
- **feat(visual)**: ship evolution more distinct per weapon level — wider pods, mount brackets, progressive body scaling, brighter tip glows
- **balance**: elemental damage tuning round 2 — fire splash 0.75→1.2, electric chain 0.50→0.80, contagion decay 0.6→0.7
- **balance**: fire splash radius 50→55, electric chain radius 90→100
- **result**: contagion kill rate 3.4%→26.9% (target 15-25%) — elemental system now gameplay-relevant

## v5.0.8 - 2026-02-13
### Pierce Decay + Progression Tracker
- **fix(balance)**: PIERCE bullets now lose 35% damage per enemy pierced (`DAMAGE_MULT: 0.65`), max 5 enemies — prevents screen-clearing
- **config**: `Balance.WEAPON_EVOLUTION.PIERCE_DECAY` — `DAMAGE_MULT`, `MAX_ENEMIES` (tuneable)
- **feat(debug)**: progression tracker logs every pickup with before/after state diff in real-time
- **debug**: `dbg.progressionReport()` — full timeline with weapon milestones, pierce escalation, power curve summary
- **debug**: `dbg.report()` auto-appends progression report when data exists

## v5.0.7 - 2026-02-13
### Elemental Contagion + Progressive Aggression
- **feat(cascade)**: elemental kills now propagate — Fire splash and Electric chain kills trigger further cascades
- **cascade depth**: scales with perk level (1 perk → depth 1, 2+ perks → depth 2), damage halves each step (`DAMAGE_DECAY: 0.5`)
- **config**: `Balance.ELEMENTAL.CONTAGION` — `ENABLED`, `MAX_DEPTH`, `DAMAGE_DECAY` (kill-switch ready)
- **feat(aggression)**: enemy fire rate increases with perk level (+10%/+15%/+20% for perk 1/2/3+)
- **config**: `Balance.FIRE_BUDGET.ELEMENTAL_AGGRESSION` — `ENABLED`, `SCALE` (kill-switch ready)
- **impact**: dense formations reward elemental builds with chain reactions; enemies compensate with increased pressure

## v5.0.6 - 2026-02-13
### Explosion VFX Overhaul
- **fix(visual)**: replaced "imploding balloon" particle effect with real explosion shrapnel
- **particle lifecycle**: explosion particles now grow briefly (60%→100% in first 25% of life) then hold size, fading via alpha only (was: constant shrink `size *= 0.92`)
- **bullet cancel**: 8 colored shrapnel particles (was 4 white), enemy bullet color passed through, longer lifetime 0.28s (was 0.18s)
- **enemy kill spark**: extra fast shrapnel burst (4 sparks at 350+ px/s) for kill impacts
- **removed rings/glow**: all explosion functions now use directional fragments only — no more bubble-like expanding rings
- **boss death**: 15 multicolor shrapnel burst replaces 3 large expanding rings
- **non-explosion particles**: gentler shrink `0.97` (was `0.92`) for muzzle flash, graze, etc.

## v5.0.5 - 2026-02-13
### Boss Damage Rebalance
- **fix(critical)**: boss damage now scales with weapon level (`damageMult`) — was flat `ceil(baseDamage/4)` since launch
- **fix(bug)**: missile AoE now damages bosses (`takeDamage` → `damage` method fix)
- **removed**: boss HP `CYCLE_MULT` [1.0, 2.5, 2.2] — was calibrated for old compound perk system
- **config**: added `BOSS.DMG_DIVISOR` for tuneable boss damage divisor
- **impact**: C1 boss kill ~35s (was ~60s), C2 ~75s (was ~132s), C3 ~117s (was ~204s)

## v5.0.4 - 2026-02-13
### Boss Fight Overhaul & Power Progression
- **Boss P1 pattern variety**: all 3 bosses now rotate 3 visually distinct patterns in Phase 1
  - FED: ring → sineWave → aimedBurst (was 2-pattern alternation)
  - BCE: curtain/flower alternation + rotatingBarrier (was curtain-only + barrier)
  - BOJ: sineWave → zenGarden → expandingRing (was sine + zen only)
- **Boss HP & phases**: BASE 5250→4083 (-22%), P3 threshold 33%→20% (shorter desperation)
- **FED P1 intensity**: fire rate 0.85→0.70s (+22%), move speed 55→70 (+27%)
- **Power progression pacing**: linearized for C1 — player peaks during boss, not before
  - KILLS_FOR_UPGRADE: 55→75 (weapon LV4 at boss entry, LV5 mid-fight)
  - KILLS_FOR_PERK: 50→80 (2 perks pre-boss, GODCHAIN triggers during fight)
  - EARLY_DROP_PREFILL: 42→25 (first drop after ~30 kills, end W1H1)
  - PITY_BASE: 55→65 (less drop clustering)
  - PERK.COOLDOWN_TIME: 15→25s (wider perk spacing)

## v5.0.3 - 2026-02-13
### Balance Tuning
- Boss HP BASE: 5000 → 5250 (+5%) — FED C1 fight was 21.8s, target 40-60s
- KILLS_FOR_UPGRADE: 50 → 55 (+10%) — slightly slower weapon progression
- EARLY_DROP_PREFILL: 45 → 42 — first weapon upgrade at ~13 kills (was ~10)

## v5.0.2 - 2026-02-13
### Fixes
- Fix crash on elemental perk pickup: `perkStacks` not initialized in RunState.reset()

## v5.0.1 - 2026-02-13
### Fixes & Cleanup
- Restore ship preview canvas + stats panel accidentally removed in v5.0.0
- Fix stale HODL tip in DialogueData ("stai fermo per bonus danni" → DIP meter tip)
- Remove dead `HODL` key from LABELS EN/IT
- Clean stale HODL comments in Player.js
- Rename MemeEngine shield text "HODL MODE" → "SHIELD UP"
- Update CLAUDE.md: RunState description, perk drop system

## v5.0.0 - 2026-02-13
### Clean Slate Release

Major codebase cleanup — zero gameplay changes. All removed systems are preserved in git history.

**Dead code removed (~1200 lines):**
- Sacrifice system (main.js, BalanceConfig, AudioSystem, EffectsRenderer, CollisionSystem, RunState, DebugSystem — 8 files, ~400 lines)
- `script.js` prototype (entire file, ~700 lines)
- Legacy `WEAPONS` / `SHIP_POWERUPS` constants + Player.js legacy fire fallback (~100 lines)
- Ship selection UI from intro (HTML + ~200 lines CSS)
- `modifiers` / `getMod()` dead accessor system (RunState + 4 call sites)
- localStorage v4.50 migration shim
- `perkStacks` compatibility field

**Console noise cleaned:**
- WeatherController: 7 hardcoded `console.log` removed
- 3 commented-out `console.log` removed (main.js, InputSystem)

**Docs updated:**
- SYSTEM_REFERENCE.md: Weapon Evolution + GODCHAIN rewritten for v5.0, new Elemental Perk section
- README.md: Removed HODL, updated version/GODCHAIN/perks, fixed credits
- NOTES.md: Rewritten (perk system, mini-boss, APC, HYPER meter)
- roadmap.md: Consolidated, archived completed phases

**Renamed:** "hodl sparkle" → "golden sparkle" in ColorUtils

## v4.61.0 - 2026-02-13
### Perk Drop via DropSystem

- **Perk drops are now physical power-ups**: Elemental perks (Fire/Laser/Electric) drop from killed enemies via DropSystem instead of bullet-cancel trigger
- **Perk pity timer**: Guaranteed perk drop every 50 kills (`KILLS_FOR_PERK`), similar to weapon upgrade pity
- **Need-based perk weighting**: DropSystem category selector includes perk need (high pre-3 elements, 0.35 post-3 for GODCHAIN re-trigger)
- **Diamond crystal visual**: New PERK power-up drawn as diamond/crystal shape with dynamic color matching next element (Fire=orange, Laser=cyan, Electric=purple, GODCHAIN=gold)
- **Bullet-cancel decoupled**: Bullet cancellation still works (audio + VFX) but no longer awards perks. Removed `BULLET_CANCEL_COUNT` and `CANCEL_WINDOW` from config
- **Perk bypasses suppression**: Like UPGRADE drops, PERK drops are never suppressed by adaptive drop system
- **Tested pacing**: First perk (Fire) arrives ~L1, all 3 elements by end of C1, GODCHAIN at ~2:30 (was 17s with bullet-cancel)

## v4.60.0 - 2026-02-13
### Elemental Perk System + Meter Rebalance

- **Elemental perks replace stat perks**: 3 sequential elements (Fire → Laser → Electric) replace Kinetic Rounds / Overclock Thrusters / Diamond Hands. Fixed order, no stacking, no RNG
- **Fire perk**: Splash damage 30% to enemies within 40px on kill. Orange/red flame trail on bullets, fire impact particles
- **Laser perk**: Bullets +25% speed, +1 pierce HP. Cyan glow trail, elongated scia on bullets
- **Electric perk**: Chain damage 20% to 1-2 nearest enemies within 80px on kill. Purple arc overlays on bullets, chain particles
- **GODCHAIN now triggered by perks**: Collecting all 3 elements activates GODCHAIN 10s (was weapon level 5). Further bullet cancels re-trigger GODCHAIN
- **GODCHAIN HUD bar**: Timer bar below HYPER bar shows remaining GODCHAIN time (red-orange fill)
- **Weapon level 5 = visual only**: Ship gets armored look at LV5 but no longer triggers GODCHAIN energy form
- **HYPER fixed duration**: 10s flat (was 5s + extensions). No more timer extension on graze/kill. Removed `GRAZE_EXTENSION` and `HYPER_KILL_EXTENSION`
- **Meter decay doubled**: `DECAY_RATE` 2→4 per second — need consistent killing to maintain meter
- **Death resets all perks**: Lose all elemental effects, perkLevel back to 0
- **PerkManager rewritten**: Sequential assignment (no modal, no choice), auto-applied on trigger
- **New BalanceConfig section**: `ELEMENTAL` with Fire/Laser/Electric tuning (splash radius, chain radius, speed mult, etc.)
- **Particle effects**: `createFireImpact()` and `createElectricChain()` in ParticleSystem
- **Known issue**: Perk trigger still uses bullet-cancel mechanic (inherited) — resolved in v4.61

## v4.59.0 - 2026-02-12
### Perk Reduction + Adaptive Power Calibration

- **Perk system reduced (6 → 3)**: Kept Kinetic Rounds (damage +20%, pierce +1/stack), Overclock Thrusters (speed +15%), Diamond Hands (score x1.25). Removed Rapid Core, Wide Arsenal, Fortress Protocol — all DPS-stacking and shield perks eliminated
- **Dead code cleanup**: Removed volatilityTimer, rapidCoreKillBoost, secondWind, wideArsenal shot code, fireRateMult/tempFireRateMult/shieldCooldownMult modifiers from RunState and Player
- **Perk toggle**: Added `PERK.ENABLED` flag in BalanceConfig for easy testing with perks on/off
- **Adaptive Power Calibration (APC)**: New system adjusts enemy HP and drop pity at cycle transitions (C2+) based on player power score (weapon level, perk stacks, special weapon)
- **APC HP scaling**: `HP_FLOOR: 0.85` + `HP_RANGE: 0.50` — weak players face 85% HP enemies, strong players face up to 135%
- **APC pity adjustment**: Weak players get -10 kills on pity timer, strong players +5 — adaptive drop economy
- **APC debug**: `dbg.report()` shows APC section with power score, HP multiplier, pity adjustment

## v4.58.0 - 2026-02-12
### Cyberpunk Enemy Damage Deterioration

- **Progressive damage visuals**: Enemies no longer "pop like balloons" — below 50% HP they visually deteriorate with 5 layered cyberpunk effects that intensify as HP drops
- **Outline flicker/glitch**: Neon outline oscillates at 18Hz with random glitch spikes — more unstable as HP decreases
- **Fracture lines**: 2→5 luminous cracks appear on the dark body, generated once per enemy, alpha increases with damage
- **Neon spark emission**: Replaces old grey smoke — bright sparks in enemy's own color, emitted faster as damage increases (0.28s→0.10s interval)
- **Glow destabilization**: The neon halo pulses 2.5× faster, dims to 55% alpha, and shifts toward white on damaged enemies
- **Body darkening**: Enemy fill progressively darkens, making cracks and flickering outline more visible
- **Removed**: Old red damage tint circle (not shape-aware) and grey smoke particles (not cyberpunk)
- **Kill switch**: `DAMAGE_VISUAL.ENABLED = false` disables all effects; individual sub-switches for each effect

## v4.57.0 - 2026-02-12
### Gameplay Rebalance + Perk Rationalization

- **Wave density +1 row**: All 15 waves get ~4 extra enemies per horde — fuller formations, less empty first levels
- **Perk rationalization (12 → 6)**: Removed 5 dead-code perks, merged overlapping effects into 6 functional perks: Rapid Core (fire rate + kill streak boost), Kinetic Rounds (damage + pierce), Overclock Thrusters (speed), Fortress Protocol (shield CD + invuln at x2), Wide Arsenal (+2 side shots), Diamond Hands (score)
- **Wide Arsenal implemented**: New rare perk adds 2 actual wide-angle shots (±25°) to every volley
- **Kinetic Rounds pierce**: Each stack adds +1 pierceHP to all bullets (including missiles)
- **Rapid Core kill streak**: Replaces broken volatilityRush — on kill, 2s of fire rate boost (tempFireRateMult 0.7)
- **Fortress Protocol**: Merges cooldown_vents + second_wind — shield CD -25%/stack, invuln on expire at stack 2
- **Max stack reduction**: All stackable perks capped at x2 (was x3-4) — DPS ceiling from perks: x4 → x2
- **C3 fire budget -10%**: Cycle 3 enemy bullets/sec 56 → 50 (boss excluded)
- **Early drop at level 2**: Pity counter pre-filled so first power-up arrives after ~10 kills
- **Dead code cleanup**: Removed hodlBonus, twinCannons, wideSpread, laserBeam, pierce, volatilityRush flags

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
