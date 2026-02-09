/**
 * BalanceConfig.js - Single Source of Truth for Game Balancing
 *
 * All gameplay tuning parameters in one place to prevent:
 * - Duplicate formulas in multiple files
 * - Regression bugs from scattered constants
 * - Difficult-to-track balance changes
 *
 * IMPORTANT: When modifying balance, update ONLY this file.
 * All game systems reference these values via window.Game.Balance
 */

(function() {
    'use strict';

    const G = window.Game = window.Game || {};

    G.Balance = {
        // --- DIFFICULTY SCALING (Stepped Progression) ---
        // 3 cycles = complete run (~12 min). Difficulty jumps per cycle, subtle increase per wave.
        DIFFICULTY: {
            // Base difficulty per cycle (stepped progression)
            // v4.0.3: Smoothed C1→C2 jump (0.30→0.20, was +150% now +25%)
            CYCLE_BASE: [0.0, 0.40, 0.60],  // Cycle 1: Tutorial, Cycle 2: Learning, Cycle 3: Skilled (v4.18: C2 0.25→0.40 for +HP)

            // Per-wave scaling within cycle
            WAVE_SCALE: 0.04,               // +4% per wave (v4.0.3: 0.03→0.04, 5 waves = +20% total within cycle)

            // Bear Market additive bonus (not multiplier)
            BEAR_MARKET_BONUS: 0.25,        // Starts at Cycle 2 equivalent difficulty

            // Maximum cap
            MAX: 1.0
        },

        // --- PLAYER PHYSICS & GAMEPLAY ---
        PLAYER: {
            ACCELERATION: 2500,       // Keyboard acceleration
            FRICTION: 0.92,           // Velocity decay when not moving
            SPAWN_OFFSET_Y: 80,       // Distance from bottom at spawn
            RESET_Y_OFFSET: 160,      // Y position after reset (above controls)
            BOUNDARY_MARGIN: 20,      // Screen edge margin
            TOUCH_SWIPE_MULT: 15,     // Touch input responsiveness
            SECOND_WIND_DURATION: 0.5,// ETH invulnerability on shield expire
            INVULN_DURATION: 1.4,     // Post-hit invulnerability seconds
            MUZZLE_FLASH_DURATION: 0.08, // Muzzle flash display time
            BULLET_SPAWN_Y_OFFSET: 25,   // Y offset for bullet spawn above ship
            FIRE_VIBRATION_MS: 5,     // Haptic feedback on fire
            DANGER_RANGE_SQ: 3600,    // Core hitbox indicator range (60px squared)
            START_LIVES: 3,           // Starting lives per run
            SHIELD_COOLDOWN: 10.0,    // Base shield cooldown seconds
            SPREAD_OFFSETS: {
                NARROW: 4,            // Narrow pattern X offset
                FIRE: 10,             // Fire pattern X offset
                WIDE: 25              // Wide/triple pattern X offset
            }
        },

        // --- GAME CANVAS ---
        GAME: {
            BASE_WIDTH: 600,          // Default canvas width
            BASE_HEIGHT: 800          // Default canvas height
        },

        // --- ETH SMART CONTRACT BONUS (v4.0.2) ---
        // Consecutive hits on same enemy within window = stacking damage bonus
        ETH_BONUS: {
            STACK_WINDOW: 0.5,        // Seconds to count as consecutive hit
            DAMAGE_BONUS: 0.15        // +15% per consecutive hit
        },

        // --- PERK SYSTEM ---
        PERK: {
            BULLET_CANCEL_COUNT: 5,   // Bullets to cancel for perk trigger
            CANCEL_WINDOW: 1.5,       // Seconds window to cancel bullets
            COOLDOWN_TIME: 4,         // Seconds between perk rewards
            PAUSE_DURATION: 1.2       // Seconds to pause for perk notification
        },

        // --- GRAZING SYSTEM (Core Risk/Reward Mechanic) ---
        // Grazing is the primary skill expression. Close to danger = maximum reward.
        GRAZE: {
            RADIUS: 25,               // Pixels outside core hitbox for graze
            CLOSE_RADIUS: 18,         // Close graze radius for 4x bonus (v4.0.2: 23→18 for 7px gap, more distinct)

            // Scoring (grazing = primary score source)
            POINTS_BASE: 25,          // Base points per graze
            CLOSE_BONUS: 4,           // Close graze multiplier (v4.0.2: 3x→4x)
            METER_GAIN: 12,           // Normal graze meter gain (v2.24.7: 8→12 for faster fill)
            METER_GAIN_CLOSE: 25,     // Close graze meter gain (v2.24.7: 20→25)

            // Multiplier system
            MULT_MAX: 2.5,            // Maximum score multiplier from full meter
            MULT_DIVISOR: 100,        // grazeMeter / this = multiplier bonus (100 = 2.5x at full)

            // Perk rewards
            PERK_THRESHOLD: 50,       // Graze count to trigger bonus perk
            MAX_PERKS_PER_LEVEL: 2,   // Cap graze perks per level

            // Decay (use it or lose it)
            DECAY_RATE: 2,            // Meter decay per second (v2.24.11: 4→2 for slower drain)
            DECAY_DELAY: 1.0,         // Seconds before decay starts (v2.24.11: 0.5→1.0)

            // Sound design (theremin of danger)
            SOUND_THROTTLE: 0.05,     // Min seconds between graze sounds (was 0.15)
            SOUND_PITCH_BASE: 200,    // Base frequency Hz
            SOUND_PITCH_CLOSE: 600,   // Max frequency for close graze
            SOUND_CHAIN_PITCH_STEP: 50 // Hz increase per consecutive graze
        },

        // --- HYPER GRAZE SYSTEM (Ultimate Risk/Reward) ---
        // When meter is full, player can activate HYPER for massive rewards at extreme risk.
        // Design: Ikeda Philosophy - the decision to risk everything for glory.
        HYPER: {
            METER_THRESHOLD: 100,     // Graze meter value to enable HYPER activation
            AUTO_ACTIVATE: true,      // v4.21: Auto-trigger HYPER when meter is full (no manual input needed)
            BASE_DURATION: 5.0,       // Seconds of HYPER mode
            GRAZE_EXTENSION: 0.3,     // Seconds added per graze during HYPER
            MAX_DURATION: 12.0,       // Cap on total HYPER time (prevents infinite)
            SCORE_MULT: 5.0,          // Score multiplier during HYPER (stacks with other mults)
            HITBOX_PENALTY: 1.5,      // Core hitbox size multiplier (50% larger = more risk)
            COOLDOWN: 8.0,            // Seconds after HYPER ends before meter can refill
            TIME_SCALE: 0.92,         // Game speed during HYPER (slight slow-mo for readability)
            INSTANT_DEATH: true,      // If hit during HYPER, instant game over (bypass lives)

            // Visual settings
            AURA_PULSE_SPEED: 8,      // Aura animation speed
            AURA_SIZE_BASE: 55,       // Base aura radius
            AURA_SIZE_PULSE: 10,      // Aura size oscillation
            PARTICLE_BURST: 12,       // Particles per graze during HYPER

            // Audio settings
            WARNING_TIME: 2.0         // Seconds before HYPER ends to play warning
        },

        // --- SATOSHI'S SACRIFICE (Ultimate Last Stand) ---
        // When about to die, player can sacrifice ALL score for a chance at redemption.
        // Design: Ikeda Philosophy - the ultimate gamble, all or nothing.
        SACRIFICE: {
            // Trigger conditions
            TRIGGER_HP: 1,                    // HP threshold to enable sacrifice option
            ENABLED: true,                    // Can be disabled for easier modes

            // Decision window
            DECISION_WINDOW: 2.0,             // Seconds to decide (press SPACE/tap)
            DECISION_TIME_SCALE: 0.25,        // Extreme slow-mo during decision

            // Sacrifice mode
            INVINCIBILITY_DURATION: 10.0,     // Seconds of total invincibility
            SCORE_MULT: 10.0,                 // Kill multiplier during sacrifice
            DISABLE_GRAZE: true,              // Walk through bullets (no graze)

            // Outcome thresholds
            SUCCESS_THRESHOLD: 1.0,           // Must earn >= 100% of sacrificed score
            SUCCESS_BONUS_LIVES: 1,           // Extra life on success

            // Visual settings
            BUTTON_SIZE: 100,                 // Sacrifice button size in pixels
            COUNTDOWN_FONT_SIZE: 64,          // Timer font size
            GLOW_COLOR: '#FFFFFF',            // Player glow during sacrifice
            GHOST_TRAIL_COUNT: 5,             // Number of ghost images

            // Audio
            HEARTBEAT_INTERVAL: 0.8,          // Seconds between heartbeats during decision
            WARNING_TIME: 3.0                 // Seconds before sacrifice ends to warn
        },

        // --- JUICE SYSTEM (Hit Stop & Visual Feedback) ---
        // Every action should feel impactful. Micro-freezes and flashes create "weight".
        JUICE: {
            // Hit stop durations (seconds) - game freezes briefly on impact
            HIT_STOP: {
                ENEMY_KILL: 0,            // Disabled — was 25ms freeze on every kill, caused perceived stuttering
                STREAK_10: 0.12,          // 120ms on 10-kill streak
                STREAK_25: 0.18,          // 180ms on 25-kill streak
                STREAK_50: 0.25,          // 250ms on 50-kill streak
                BOSS_PHASE: 0.30,         // 300ms on boss phase transition
                BOSS_DEFEAT: 0.50,        // 500ms on boss death
                CLOSE_GRAZE: 0.02,        // 20ms micro-freeze on close graze
                PLAYER_HIT: 0.08          // 80ms on player taking damage
            },

            // Screen flash effects (values used when enabled)
            FLASH: {
                CLOSE_GRAZE: { duration: 0.03, opacity: 0.10, color: '#FFFFFF' },
                HYPER_ACTIVATE: { duration: 0.10, opacity: 0.20, color: '#FFD700' },
                STREAK_10: { duration: 0.06, opacity: 0.15, color: '#00FFFF' },
                STREAK_25: { duration: 0.08, opacity: 0.20, color: '#FFD700' },
                STREAK_50: { duration: 0.10, opacity: 0.25, color: '#9B59B6' },
                BOSS_PHASE: { duration: 0.12, opacity: 0.25, color: '#FF6600' },
                BOSS_DEFEAT: { duration: 0.20, opacity: 0.50, color: '#FFFFFF' },
                PLAYER_HIT: { duration: 0.04, opacity: 0.15, color: '#FF0000' },
                WAVE_START: { duration: 0.05, opacity: 0.25, color: '#FFFFFF' },
                MULTI_KILL: { duration: 0.08, opacity: 0.20, color: '#FFFFFF' }  // v4.5
            },

            // Master toggles for screen effects (modularity)
            SCREEN_EFFECTS: {
                // Critical feedback (recommended ON)
                PLAYER_HIT_FLASH: true,       // Red flash when hit
                BOSS_DEFEAT_FLASH: true,      // White flash on boss kill
                BOSS_PHASE_FLASH: true,       // Orange flash on phase change

                // Optional feedback (default OFF - can feel like lag)
                STREAK_FLASH: true,           // Flash on kill streaks (v4.0.1: enabled)
                GRAZE_FLASH: false,           // Flash on close graze
                SCORE_PULSE: true,            // Edge glow every 10k points (v4.0.1: enabled)
                SCREEN_DIMMING: false,        // Darken screen with many bullets

                // Mode-specific overlays
                HYPER_OVERLAY: true,          // Golden tint during HYPER
                SACRIFICE_OVERLAY: true,      // White tint during sacrifice
                HYPER_ACTIVATE_FLASH: true,   // Flash when HYPER activates

                // Bear Market atmosphere
                LIGHTNING: true,              // Purple lightning flashes
                BEAR_VIGNETTE: true           // Pulsing red vignette
            },

            // Score pulse effect (screen edge glow on milestones)
            SCORE_PULSE: {
                THRESHOLD: 10000,         // Points between pulses
                SCALE: 1.015,             // Subtle zoom factor
                DURATION: 0.25,           // Pulse duration
                GLOW_COLOR: '#FFD700',    // Gold edge glow
                GLOW_SIZE: 30             // Pixels of edge glow
            },

            // Floating score numbers
            FLOAT_SCORE: {
                MIN_VALUE: 100,           // Minimum score to show floating number
                VELOCITY: -80,            // Upward speed (pixels/sec)
                DURATION: 1.2,            // How long number stays visible
                SCALE_LARGE: 1.5,         // Scale for scores > 500
                SCALE_HUGE: 2.0           // Scale for scores > 2000
            }
        },

        // --- ENEMY FIRING ---
        // Note: STRIDE, MAX_SHOTS_PER_TICK, FIBONACCI_INTERVAL removed in v2.13.0
        // All firing now handled by HarmonicConductor with beat-synced sequences
        ENEMY_FIRE: {
            BULLET_SPEED_BASE: 77,    // v4.14: -40% (was 128) — smaller bullets, slower speed
            BULLET_SPEED_SCALE: 41    // v4.14: -40% (was 68)
        },

        // --- ENEMY BULLET VISUALS (v4.14) ---
        // Size per enemy shape — used by Enemy.buildBullet() and Bullet.draw()
        BULLET_VISUALS: {
            coin:    { size: { w: 4, h: 4 } },
            bill:    { size: { w: 4, h: 4 } },
            bar:     { size: { w: 4, h: 4 } },
            card:    { size: { w: 4, h: 4 } },
            DEFAULT: { size: { w: 4, h: 4 } }
        },

        // --- WAVE CHOREOGRAPHY (Ikeda Philosophy: Readable Bullet Ballet) ---
        // Transforms random chaos into synchronized, learnable patterns
        CHOREOGRAPHY: {
            // Row-based firing (rows fire in sequence, not simultaneously)
            ROW_FIRE_DELAY: 0.4,                    // Seconds between row volleys
            MAX_ROWS: 3,                            // Max rows that fire in sequence

            // Pattern types per row (cycle through based on row index)
            PATTERNS: ['ARC', 'WALL', 'AIMED'],     // Default pattern per row

            // Wave intensity phases (% of enemies killed)
            INTENSITY: {
                SETUP_END: 0.30,                    // 0-30%: Learning phase
                BUILD_END: 0.70,                    // 30-70%: Intensity builds
                PANIC_START: 0.85,                  // 85%+: Panic phase
                PANIC_RATE_MULT: 1.4,               // Fire rate multiplier in panic
                LAST_ENEMY_PAUSE: 0.8,              // Silence before last kill
                LAST_ENEMY_BONUS: 2.0,              // Score multiplier for last enemy
                FIRE_RATE_GLOBAL_MULT: 0.85         // Global 15% reduction in enemy fire rate
            },

            // Telegraph (warning before pattern fires)
            TELEGRAPH: {
                ENABLED: true,                      // Show trajectory warnings
                DURATION: 0.25,                     // How long warning shows
                OPACITY: 0.35,                      // Warning line visibility
                COLOR: '#FF6600',                   // Warning color (orange)
                GAP_GLOW: true,                     // Highlight safe corridors
                GAP_COLOR: '#00FF00'                // Safe zone color (green)
            },

            // Pattern definitions
            PATTERN_DEFS: {
                ARC: {
                    BULLETS: 7,                     // Bullets in semicircle
                    SPREAD: 120,                    // Degrees of spread
                    SPEED: 140                      // Bullet speed
                },
                WALL: {
                    BULLETS: 8,                     // Bullets in horizontal line
                    GAP_COUNT: 2,                   // Number of gaps
                    GAP_SIZE: 60,                   // Gap width in pixels
                    SPEED: 120                      // Bullet speed
                },
                AIMED: {
                    BULLETS: 5,                     // Bullets aimed at player
                    SPREAD: 30,                     // Degrees of spread
                    SPEED: 160                      // Bullet speed
                },
                RAIN: {
                    BULLETS: 12,                    // Random drops
                    SAFE_LANES: 3,                  // Guaranteed safe columns
                    SPEED: 100                      // Bullet speed
                }
            }
        },

        // --- ENEMY HP SCALING ---
        ENEMY_HP: {
            BASE: 10,                 // Base HP at difficulty 0
            SCALE: 15                 // Additional HP at max difficulty
        },

        // --- ENEMY BEHAVIORS ---
        ENEMY_BEHAVIOR: {
            KAMIKAZE_SPEED: 400,      // Dive speed for kamikaze enemies
            TELEGRAPH_LEAD: 0.12,     // Telegraph timer before firing
            BULLET_SPAWN_Y_OFFSET: 29, // Y offset for bullet spawn below enemy center
            FLASH_FADE: {
                HIT: 8,              // Hit flash fade speed (dt multiplier)
                SHIELD: 5,           // Shield flash fade speed
                TELEPORT: 4          // Teleport flash fade speed
            },
            TELEPORT: {
                TRIGGER_RANGE: 200,   // Distance threshold to enable teleport
                CHANCE: 0.01,         // Per-frame teleport probability
                OFFSET_X: 120,        // Horizontal teleport offset range
                OFFSET_Y: 40,         // Vertical teleport offset range
                BOUNDS_X_MIN: 50,     // Min X after teleport
                BOUNDS_X_MAX: 550,    // Max X after teleport
                BOUNDS_Y_MIN: 100,    // Min Y after teleport
                BOUNDS_Y_MAX: 500,    // Max Y after teleport
                COOLDOWN_MIN: 3,      // Min cooldown between teleports
                COOLDOWN_RANDOM: 2    // Random additional cooldown (0-2s)
            },
            WAVE_PATTERNS: {
                V_SHAPE: { AMPLITUDE: 20, FREQUENCY: 3 },
                SINE_WAVE: { AMPLITUDE: 40, FREQUENCY: 4, PHASE_SCALE: 0.01 }
            },
            ENTRY: {
                MAX_DISTANCE: 400,    // Reference distance for entry progress
                CURVE_AMPLITUDE: 50,  // Entry curve sine amplitude
                ROTATION_WOBBLE: 0.15 // Max rotation during entry
            }
        },

        // --- PATTERN DENSITY (Per Cycle) ---
        // Patterns follow Ikeda Rule 2: geometric, readable corridors
        PATTERNS: {
            // v2.24.6: Global hard cap on enemy bullets (prevents runaway patterns)
            GLOBAL_BULLET_CAP: 150,        // Absolute max enemy bullets on screen

            // Gap size = width of safe corridor in pixels (smaller = harder)
            GAP_SIZE: [100, 75, 55],       // Per cycle: [Tutorial, Learning, Skilled]
            GAP_SIZE_BEAR_BONUS: -15,      // Bear Market reduces gap

            // Max bullets per pattern spawn
            MAX_BULLETS: [15, 30, 50],     // Per cycle
            MAX_BULLETS_BEAR_BONUS: 15,    // Bear Market adds bullets

            // Pattern complexity (affects visual density)
            COMPLEXITY: [1, 2, 3],         // Per cycle
            COMPLEXITY_BEAR_BONUS: 1,      // Bear Market adds complexity

            // Telegraph time (how long warning shows before pattern)
            TELEGRAPH_TIME: [0.30, 0.20, 0.15],  // Per cycle
            TELEGRAPH_TIME_BEAR_MULT: 0.85       // Bear Market reduces warning time
        },

        // --- GRID MOVEMENT ---
        GRID: {
            SPEED_BASE: 12,           // Base grid scroll speed
            SPEED_SCALE: 20,          // Additional speed at max difficulty
            SPACING: 72,              // v4.25: 60→72 (58px enemies, was 48px)
            START_Y: 80,              // Initial Y position (v4.4: 150→80 for compact HUD)
            MAX_Y: 380                // Maximum Y before descent stops
        },

        // --- DROP SYSTEM ---
        // v4.16: Halved rates — audit showed 78 power-ups/7min (10.5/min), target ~30-40/run
        DROPS: {
            WEAPON_COOLDOWN: 8.0,     // Min seconds between weapon drops (v4.17: 5.0→8.0)
            PITY_TIMER_KILLS: 45,     // Guaranteed drop after N kills (v4.16: 30→45)
            CHANCE_STRONG: 0.03,      // 3% for strong enemies (v4.16: 6%→3%)
            CHANCE_MEDIUM: 0.025,     // 2.5% for medium enemies (v4.16: 4%→2.5%)
            CHANCE_WEAK: 0.01,        // 1% for weak enemies (v4.16: 2%→1%)
            WEAPON_RATIO: 0.5,        // 50% weapon, 50% ship power-up
            BOSS_DROP_COOLDOWN: 3.0,  // Seconds between boss power-up drops (v4.17: 1.5→3.0)
            SHIP_TYPES: ['SPEED', 'RAPID', 'SHIELD']  // Available ship power-ups
        },

        // --- TIER DEFINITIONS ---
        TIERS: {
            STRONG: ['$', '元', 'Ⓒ'],
            MEDIUM: ['€', '£', '₣', '₺'],
            WEAK: ['¥', '₽', '₹']
        },

        // --- MINI BOSS (Currency-Based Trigger System) ---
        MINI_BOSS: {
            KILL_THRESHOLD: 15,       // Default kills for mini-boss (used as fallback)
            COOLDOWN: 15.0,           // Seconds between mini-boss spawns
            MAX_PER_WAVE: 2,          // v4.10.2: Cap mini-bosses per wave to prevent spam

            // Currency → Boss mapping with individual thresholds
            // v2.24.5: Balanced thresholds (~1.5x original) with 15s cooldown + global reset
            // Target: 1-2 mini-bosses per boss cycle (5 waves = ~200 enemies, ~20 per currency)
            CURRENCY_BOSS_MAP: {
                // Dollar → FED (US hegemony) - spawns waves 1,3,5
                '$': { boss: 'FEDERAL_RESERVE', threshold: 22 },

                // Euro/Europe → BCE
                '€': { boss: 'BCE', threshold: 22 },
                '₣': { boss: 'BCE', threshold: 22 },
                '£': { boss: 'BCE', threshold: 22 },

                // Asia → BOJ (appear frequently in weak tier waves)
                '¥': { boss: 'BOJ', threshold: 18 },
                '元': { boss: 'BOJ', threshold: 18 },

                // Emerging markets → Random boss (most common, reach 40+ per cycle)
                '₽': { boss: 'RANDOM', threshold: 35 },
                '₹': { boss: 'RANDOM', threshold: 35 },
                '₺': { boss: 'RANDOM', threshold: 35 },

                // CBDC → Boss of current cycle
                // v4.10.2: threshold 12→24 (C3W5H2 has 26 Ⓒ, was triggering 3 minibosses)
                'Ⓒ': { boss: 'CYCLE_BOSS', threshold: 24 }
            }
        },

        // --- BOSS FIGHTS ---
        // Designed for 3-cycle runs (~12 min). Each boss ~2-3 min fight.
        BOSS: {
            WARNING_DURATION: 2.0,    // Seconds of warning before boss spawns
            DROP_INTERVAL: 40,        // Drop power-up every N hits on boss (v4.17: 25→40)
            MAX_DROPS_PER_BOSS: 99,   // v4.18: Effectively uncapped — dynamic time-based cap below
            DROP_TIME_INTERVAL: 12,   // v4.18: Seconds between allowed boss drops (dynamic cap)
            MEME_ROTATION_INTERVAL: 4.0,  // Seconds between boss meme rotations
            PHASE_THRESHOLDS: [0.66, 0.33], // HP % for phase transitions (Phase 2, Phase 3)
            PHASE_TRANSITION_TIME: 1.5,    // Seconds for phase transition

            // HP scaling (applied before perk/damage modifiers)
            // v4.16: +25-40% boost — audit showed FED 12.7s, BCE 9.7s (target 45-75s)
            HP: {
                BASE: 3000,           // Base HP for all bosses (v4.16: 2400→3000)
                PER_LEVEL: 65,        // +65 HP per level (v4.16: 50→65)
                PER_CYCLE: 3000,      // +3000 HP per cycle (v4.18: 1400→3000, BCE C2 was 26.4s)
                PERK_SCALE: 0.10,     // +10% per player perk
                MIN_FLOOR: 2500       // Minimum HP (v4.16: 2000→2500)
            },

            // Movement speed per phase per boss type
            // Updated v2.18.0: Distinct movement personalities
            PHASE_SPEEDS: {
                FEDERAL_RESERVE: [55, 130, 200],  // Aggressive, fast in later phases
                BCE: [35, 55, 90],                // Bureaucratic, always slow
                BOJ: [45, 75, 160]                // Zen to sudden intervention
            },

            // Fire rate per phase (seconds between attacks, lower = faster)
            // Updated v2.18.0: Rebalanced for new patterns
            FIRE_RATES: {
                FEDERAL_RESERVE: [0.85, 0.38, 0.20],  // Aggressive printer
                BCE: [1.40, 0.70, 0.35],              // Bureaucratic delays
                BOJ: [0.90, 0.45, 0.18]               // v4.10.2: Phase 1 slowed (0.75→0.90) to reduce bullet density
            },

            // Minion spawn rate (seconds between spawns in Phase 3)
            MINION_SPAWN_RATE: {
                FEDERAL_RESERVE: 2.5,
                BCE: 3.0,
                BOJ: 2.0
            },

            // v4.0.2: BOJ Phase 3 intervention burst (was random 8% per frame, now cooldown-based with telegraph)
            BOJ_INTERVENTION: {
                TELEGRAPH: 0.4,       // Seconds of warning lines before burst fires
                COOLDOWN: 2.5,        // Seconds between intervention bursts
                COUNT: 5,             // Bullets per burst (was 7)
                SPEED: 240,           // Bullet speed (was 320)
                SPREAD: 0.4           // Spread angle in radians
            },

            // v4.27: Boss entrance and boundary
            ENTRANCE_SPEED: 80,       // Pixels/sec during entrance
            BOUNDARY_MARGIN: 20,      // Default edge margin (FED/BCE P3)

            // Minion HP scaling
            MINION: {
                HP_MULT_BASE: 5,      // Base HP multiplier
                HP_MULT_PER_PHASE: 2, // Additional HP per boss phase
                SPAWN_OFFSET_X: 40,   // X offset from boss edge
                SPAWN_OFFSET_Y: 80    // Y offset below boss
            },

            // Movement parameters per boss per phase
            MOVEMENT: {
                FEDERAL_RESERVE: {
                    P1: { MARGIN: 20 },
                    P2: { MARGIN: 20, OSC_AMP: 20, OSC_FREQ: 3 },
                    P3: { AMP_X: 150, AMP_Y: 30, FREQ_X: 2, FREQ_Y: 4, LERP: 3, JITTER: 8 }
                },
                BCE: {
                    P1: { MARGIN: 40 },
                    P2: { MARGIN: 30, OSC_AMP: 15, OSC_FREQ: 1.5 },
                    P3: { MARGIN: 20, SIN_AMP: 25, SIN_FREQ: 3, COS_AMP: 10, COS_FREQ: 5 }
                },
                BOJ: {
                    P1: { OSC_AMP: 100, OSC_FREQ: 0.8, LERP: 2 },
                    P2: { WAVE_AMP: 120, WAVE_FREQ: 1.2, LERP: 3, VERT_AMP: 20, VERT_FREQ: 2, INTERVENTION_CHANCE: 0.01, INTERVENTION_COOLDOWN: 3.0 },
                    P3: { AMP_X: 140, AMP_Y: 25, FREQ_X: 3, FREQ_Y: 2, LERP: 4 }
                }
            },

            // Attack pattern parameters per boss per phase
            ATTACKS: {
                FEDERAL_RESERVE: {
                    P1: {
                        ROTATION_SPEED: 0.15,
                        RING: { count: 12, speed: 130, size: 10 },
                        SINE: { count: 10, width: 350, amplitude: 25, speed: 150 }
                    },
                    P2: {
                        ROTATION_SPEED: 0.28,
                        HOMING: { count: 3, speed: 100, homingStrength: 2.0, maxSpeed: 180 }
                    },
                    P3: {
                        ROTATION_SPEED: 0.25,
                        LASER: { count: 25, speed: 280, width: 450, gapSize: 65 },
                        CURTAIN: { count: 16, gapSize: 60, speed: 160 },
                        HOMING: { count: 4, speed: 110, homingStrength: 2.5, maxSpeed: 200 }
                    }
                },
                BCE: {
                    P1: {
                        ROTATION_SPEED: 0.08,
                        CURTAIN: { count: 11, gapSize: 90, speed: 90 },
                        BARRIER: { count: 20, radius: 70, speed: 50, gapAngle: 1.047, rotationSpeed: 1.2 }
                    },
                    P2: {
                        ROTATION_SPEED: 0.18,
                        SPIRAL: { arms: 5, speed: 100 }
                    },
                    P3: {
                        ROTATION_SPEED: 0.22,
                        BARRIER1: { count: 18, radius: 60, rotationSpeed: 1.8 },
                        BARRIER2: { count: 16, radius: 90, rotationSpeed: -1.2 }
                    }
                },
                BOJ: {
                    P1: {
                        WAVE_PHASE_SPEED: 0.12,
                        SINE: { count: 12, width: 380, amplitude: 35, speed: 120 },
                        ZEN: { arms: 2, bulletsPerArm: 1, speed: 110 }
                    },
                    P2: {
                        WAVE_PHASE_SPEED: 0.18,
                        WIPE: { count: 25, speed: 110, gapSize: 75 },
                        BURST: { count: 5, speed: 260, spread: 0.35 }
                    },
                    P3: {
                        WAVE_PHASE_SPEED: 0.25,
                        ANGLE_SPEED: 0.2,
                        ZEN: { arms: 6, bulletsPerArm: 3, speed: 140, spiralTightness: 0.12 },
                        WIPE: { count: 22, speed: 140, gapSize: 60 },
                        WAVE: { count: 7, width: 160, amplitude: 25, speed: 150 }
                    }
                }
            }
        },

        // --- SCORE SYSTEM ---
        SCORE: {
            // Damage multipliers
            HODL_MULT_ENEMY: 1.25,    // HODL damage multiplier vs enemies
            HODL_MULT_BOSS: 1.5,      // HODL damage multiplier vs boss

            // Base multipliers
            BEAR_MARKET_MULT: 2,      // Score multiplier in Bear Market mode

            // Boss rewards (scale with cycle)
            BOSS_DEFEAT_BASE: 3000,   // Base points for boss defeat
            BOSS_DEFEAT_PER_CYCLE: 2000, // Additional per cycle
            CYCLE_BONUS: 2000,        // Points per market cycle completed

            // Kill streak system
            STREAK_MULT_PER_KILL: 0.1,   // +10% per consecutive kill
            STREAK_MULT_MAX: 2.0,        // Max 2x multiplier
            STREAK_TIMEOUT: 2.0,         // Seconds before streak resets

            // Graze-kill synergy
            GRAZE_KILL_THRESHOLD: 50,    // grazeMeter above this = bonus
            GRAZE_KILL_BONUS: 1.5        // 50% bonus for kills during high graze
        },

        // --- MEME SYSTEM ---
        MEMES: {
            SAYLOR_PROBABILITY: 0.4,  // 40% chance for Saylor quote vs general
            TICKER_SWAP_INTERVAL: 2.0,     // Normal meme ticker rotation (seconds)
            BOSS_TICKER_INTERVAL: 4.0,     // Boss fight meme ticker rotation (seconds)
            POPUP_COOLDOWN: 600,           // Milliseconds between meme popups
            POPUP_DURATION_DEFAULT: 1500,  // Default popup display time (ms)
            POPUP_DURATION_POWERUP: 1500,  // Power-up message duration (ms)
            POPUP_DURATION_DANGER: 2000,   // Danger message duration (ms)
            POPUP_PRIORITY: {              // Higher = more important
                MEME: 1,
                POWERUP: 2,
                VICTORY: 3,
                DANGER: 4
            },
            STREAK_MILESTONES: [           // Kill streak milestone rewards
                { at: 10, text: '🐋 WHALE ALERT!' },
                { at: 25, text: '💎 DIAMOND HANDS!' },
                { at: 50, text: '👑 SATOSHI REBORN!' }
            ],
            COLORS: ['#00FFFF', '#FF00FF', '#00FF00', '#FFD700', '#FF6B6B', '#4ECDC4']
        },

        // --- MEME POPUP v4.20.0 ---
        MEME_POPUP: {
            ENABLED: true,
            PRIORITIES: { CRITICAL: 3, HIGH: 2, NORMAL: 1 },
            COOLDOWNS: { CRITICAL: 0, HIGH: 400, NORMAL: 800 },
            MAX_QUEUE_SIZE: 5,
            DURATIONS: {
                DEATH: 2000,
                BOSS_DEFEATED: 3000,
                MINI_BOSS_DEFEATED: 2000,
                BOSS_SPAWN: 2500,
                MINI_BOSS_SPAWN: 2000,
                BOSS_TICKER: 3000,
                UPGRADE: 2500,
                SPECIAL: 2500,
                MODIFIER: 2000,
                STREAK: 2000,
                GRAZE: 1500
            }
        },

        // --- MESSAGE STRIP v4.26.0 ---
        MESSAGE_STRIP: {
            ENABLED: true,
            PRIORITIES: { DANGER: 3, VICTORY: 3, WAVE: 2, INFO: 1 },
            DURATIONS: { DANGER: 2500, VICTORY: 3000, WAVE: 2500, INFO: 2000 },
            COOLDOWN: 300,
            MAX_QUEUE_SIZE: 3,
            ENTRANCE_MS: 200,
            EXIT_MS: 300
        },

        // --- TIMING SYSTEM (all durations in seconds unless noted) ---
        TIMING: {
            // State transitions
            SPLASH_TIMEOUT: 4.0,           // Video splash screen max duration
            INTERMISSION_DURATION: 3.2,    // Between waves (3-2-1 countdown, ceil(3.2)=4 but we cap at 3)
            DEATH_DURATION: 2.0,           // Death sequence length
            INVULNERABILITY: 2.1,          // Post-hit protection

            // Combat feel
            HIT_STOP_CONTACT: 0.5,         // Slowmo on enemy contact
            HIT_STOP_DEATH: 2.0,           // Slowmo on player death

            // Effects
            LIGHTNING_MIN: 1.5,            // Min seconds between lightning
            LIGHTNING_MAX: 4.5,            // Max seconds between lightning
            PERK_ICON_LIFETIME: 2.5,       // Floating perk icon duration
            FLOATING_TEXT_LIFETIME: 1.0,   // Damage number duration

            // Launch sequence
            LAUNCH_CHARGE_TIME: 0.6,       // Ship charge-up phase
            LAUNCH_ACCEL_MULT: 1.5,        // Acceleration multiplier
            LAUNCH_RUMBLE_TIMES: [0.2, 0.4], // Audio trigger points

            // Graze
            GRAZE_DECAY_DELAY: 0.5,        // Seconds before meter starts decaying
            GRAZE_SOUND_THROTTLE: 0.15,    // Min seconds between graze sounds

            // UI animations (in milliseconds)
            CURTAIN_DELAY_MS: 100,         // Curtain animation delay
            ORIENTATION_DELAY_MS: 100,     // iOS safe area recalc
            PARTICLE_DOM_LIFETIME_MS: 1500, // DOM particle removal
            TOUCH_CONTROLS_DELAY_MS: 150   // Delay before showing touch controls
        },

        // --- EFFECTS SYSTEM ---
        EFFECTS: {
            // Screen shake intensities (higher = stronger)
            SHAKE: {
                BOSS_DEFEAT: 60,
                PLAYER_DEATH: 50,
                BOSS_HIT: 40,
                PHASE_TRANSITION: 30,
                ATTACK: 20,
                WARNING: 10,
                LIGHTNING: 8,
                DECAY_RATE: 1              // Shake reduction per frame
            },
            // Screen flash
            FLASH: {
                DEATH_OPACITY: 0.8,        // Red flash on death
                FADE_RATE: 0.02,           // Flash fade per frame
                VIBRATION_FALLBACK_MAX: 0.3 // Max screen flash when no vibration
            },
            // Particles
            PARTICLES: {
                MAX_COUNT: 180,            // Global particle cap (v4.5: 120→180)
                DEBRIS_SPEED_MIN: 100,
                DEBRIS_SPEED_MAX: 350,
                DEBRIS_SPREAD_ANGLE: 60,   // Degrees
                SCORE_HOMING_ACCEL: 1500,  // Acceleration toward score display
                SCORE_TARGET_DISTANCE: 30  // Pixels from target to despawn
            }
        },

        // --- HUD MESSAGES v4.4 (5-channel system) ---
        // WAVE_STRIP: Minimal full-width strip for wave/horde info
        // ALERT: Colored center box (danger=red, victory=gold)
        // MEME_WHISPER: Tiny italic canvas text, decorative flavor
        // SHIP_STATUS: Icon+text above player ship
        // FLOATING_TEXT: Opt-in score numbers
        HUD_MESSAGES: {
            WAVE_STRIP: true,             // Wave/horde strip (replaces GAME_INFO)
            ALERT_DANGER: true,           // Boss warnings, danger messages
            ALERT_VICTORY: true,          // Boss defeated, achievements
            MEME_WHISPER: true,           // Small decorative meme text (replaces MEME_POPUP)
            SHIP_STATUS: true,            // Perk/weapon/power-up above player
            FLOATING_TEXT: false,         // Damage numbers (opt-in, can clutter)
            PERK_NOTIFICATION: true,      // Perk icons - useful to know what you got

            // Wave strip config
            WAVE_STRIP_CONFIG: {
                Y: 95,                    // Y position (below compact HUD)
                HEIGHT: 28,               // Strip height
                FONT_SIZE: 14,            // Primary text size
                SUBTITLE_SIZE: 10,        // Flavor text size
                DURATION: 2.5,            // Display duration (seconds)
                BG_ALPHA: 0.5             // Background opacity
            },

            // Meme whisper config
            MEME_WHISPER_CONFIG: {
                MAX_ON_SCREEN: 2,         // Max simultaneous whispers
                FONT_SIZE: 13,            // Italic font size
                ALPHA: 0.35,              // Starting opacity (v4.12: was 0.45, less distracting)
                DRIFT_SPEED: 15,          // Upward drift px/s
                LIFETIME: 3.0,            // Seconds to live
                SPAWN_Y_RATIO: 0.25       // Y spawn = gameHeight * this (v4.12: was 0.60, moved to top-quarter)
            },

            // Ship status config
            SHIP_STATUS_CONFIG: {
                Y_OFFSET: -60,            // Above player
                FONT_SIZE: 11,            // Text size
                DURATION: 2.0,            // Display duration
                ICON_SIZE: 16             // Icon size
            }
        },

        // --- UI LAYOUT (v4.4 Compact HUD) ---
        UI: {
            // Safe zones (pixels from top)
            HUD_HEIGHT: 45,               // Compact single-row HUD
            GAMEPLAY_START: 65,           // Where gameplay area begins

            // Dynamic safe area offset (iOS notch/safe areas)
            get SAFE_OFFSET() {
                return (window.safeAreaInsets?.top || 0);
            },
            // Gameplay start with safe area offset applied
            get GAMEPLAY_START_SAFE() {
                return this.GAMEPLAY_START + this.SAFE_OFFSET;
            },

            // Z-indices
            Z_INDEX: {
                TOUCH_CONTROLS: 50,
                GRAZE_METER: 60,
                SHIELD_BUTTON: 100,
                PERK_MODAL: 10000
            },

            // Floating text
            FLOATING_TEXT_MAX: 3,         // Max concurrent floating texts
            FLOATING_TEXT_SPEED: 50,      // Upward pixels per second

            // Joystick (InputSystem)
            JOYSTICK: {
                RADIUS: 40,
                CENTER_X: 60,
                CENTER_Y: 60,
                DEADZONE_DEFAULT: 0.15,
                DEADZONE_MAX: 0.6,
                SENSITIVITY_MIN: 0.5,
                SENSITIVITY_MAX: 1.5,
                SENSITIVITY_DEFAULT: 1.0
            }
        },

        // --- DIEGETIC HUD (v4.4 - Ship-attached elements) ---
        DIEGETIC_HUD: {
            ENABLED: true,
            LIFE_PIPS: {
                ENABLED: true,
                Y_OFFSET: 28,            // Below ship center
                RADIUS: 4,               // Pip circle radius
                SPACING: 12,             // Between pips
                FULL_ALPHA: 0.7,         // Filled pip opacity
                EMPTY_ALPHA: 0.25        // Empty pip opacity
            },
            SHIELD_RING: {
                ENABLED: true,
                RADIUS: 35,              // Ring radius
                COOLDOWN_ALPHA: 0.12,    // Cooldown arc opacity
                READY_ALPHA: 0.06,       // Ready state (very faint)
                LINE_WIDTH: 1.5          // Arc line width
            },
            WEAPON_PIPS: {
                ENABLED: true,
                Y_OFFSET: -38,           // Above ship center
                SIZE: 6,                 // Triangle size
                SPACING: 10,             // Between pips
                FULL_ALPHA: 0.8,         // Active level opacity
                EMPTY_ALPHA: 0.2         // Inactive level opacity
            },
            GRAZE_GLOW: {
                ENABLED: true,
                THRESHOLD: 75,           // Graze % to start glow
                RADIUS: 40,              // Glow radius
                MIN_ALPHA: 0.10,         // At threshold
                MAX_ALPHA: 0.18,         // At 99%
                HYPER_READY_ALPHA: 0.25  // At 100% (gold)
            }
        },

        // --- REACTIVE HUD (v4.4 - Dynamic visual feedback) ---
        REACTIVE_HUD: {
            ENABLED: true,
            SCORE_STREAK_COLORS: {
                STREAK_10: '#00FF00',     // Green
                STREAK_25: '#FFD700',     // Gold
                STREAK_50: '#FF4444'      // Red
            },
            SCORE_STREAK_DURATION: 0.5,   // Seconds of color change
            LIVES_DANGER_THRESHOLD: 1,    // Lives <= this triggers danger state
            LIVES_DANGER_VIGNETTE: 0.05,  // Very subtle red vignette alpha
            GRAZE_APPROACHING_THRESHOLD: 80, // % to start shimmer speed-up
            WAVE_SWEEP: {
                ENABLED: true,
                ALPHA: 0.3,               // Line opacity
                DURATION: 0.3             // Sweep duration seconds
            }
        },

        // --- BULLET CONFIG v4.22 (Centralized bullet parameters) ---
        BULLET_CONFIG: {
            // Player bullets
            PLAYER_NORMAL:  { speed: 765, collisionRadius: 5, piercing: false, explosion: null },
            PLAYER_HOMING:  { speed: 459, collisionRadius: 6, piercing: false, explosion: null },   // 765*0.6
            PLAYER_PIERCE:  { speed: 765, collisionRadius: 5, piercing: true,  explosion: null },
            PLAYER_LASER:   { speed: 1071, collisionRadius: 3, piercing: true, explosion: null },   // 765*1.4
            PLAYER_MISSILE: { speed: 536, collisionRadius: 7, piercing: false,                      // 765*0.7
                explosion: { radius: 50, damage: 1.5, knockback: 80, particles: 15, shake: 8 }
            },
            // Enemy bullets (all shapes)
            ENEMY_DEFAULT:  { speed: null, collisionRadius: 4, piercing: false, explosion: null },
            // Boss patterns
            BOSS_PATTERN:   { speed: null, collisionRadius: 5, piercing: false, explosion: null },
            // Collision targets
            ENEMY_HITBOX_RADIUS: 29,     // Half of 58px enemy size (v4.25)
            PLAYER_CORE_RADIUS: 6        // Default, overridden by stats.coreHitboxSize
        },

        // --- HITBOX / COLLISION ---
        HITBOX: {
            PLAYER_OUTER_BONUS: 15,       // Added to ship hitboxSize for outer collision
            PLAYER_CORE_DEFAULT: 6,       // Default core hitbox if not in ship stats
            PLAYER_OUTER_DEFAULT: 30,     // Default outer hitbox if not in ship stats
            BOSS_DEFAULT_WIDTH: 160,
            BOSS_DEFAULT_HEIGHT: 140
        },

        // --- POWERUP SYSTEM ---
        POWERUPS: {
            // Physics
            FALL_SPEED: 100,              // Pixels per second
            WOBBLE_AMPLITUDE: 35,         // Horizontal wobble range
            WOBBLE_SPEED: 3,              // Wobble oscillation speed
            AUTO_DELETE_Y: 1000           // Y position to auto-remove
        },

        // --- WEAPON EVOLUTION SYSTEM (v3.0) ---
        // Progressive weapon upgrade system:
        // - Shot level (1-3): permanent, lost on death (-1)
        // - Modifiers (RATE/POWER/SPREAD): stackable, temp timer, lost on death (-1)
        // - Specials (HOMING/PIERCE/LASER/MISSILE/SHIELD/SPEED): exclusive, temp, lost completely on death
        WEAPON_EVOLUTION: {
            // Shot levels (permanent until death)
            MAX_SHOT_LEVEL: 3,
            KILLS_FOR_UPGRADE: 30,        // Guaranteed UPGRADE drop every N kills

            // Modifier durations (seconds)
            MODIFIER_DURATION: 12,

            // Modifier effects per level (index = level - 1)
            RATE: {
                MAX_LEVEL: 3,
                COOLDOWN_REDUCTION: [0.15, 0.30, 0.45]  // -15%, -30%, -45%
            },
            POWER: {
                MAX_LEVEL: 3,
                DAMAGE_BONUS: [0.25, 0.50, 0.75]        // +25%, +50%, +75%
            },
            SPREAD: {
                MAX_LEVEL: 2,
                ANGLE_BONUS: [12, 24]                    // +12°, +24° in degrees
            },

            // Special duration
            SPECIAL_DURATION: 12,

            // Death penalty
            DEATH_PENALTY: 1,             // Levels lost per category on death

            // Speed special effect
            SPEED_MULTIPLIER: 1.4,        // Movement speed during SPEED special

            // Drop weights for specials (higher = more common)
            SPECIAL_WEIGHTS: {
                HOMING: 20,
                PIERCE: 20,
                SPEED: 20,
                MISSILE: 15,
                LASER: 15,
                SHIELD: 10                // Rarest
            }
        },

        // --- DROP SCALING ---
        // v4.17: Fixed drop rate to prevent power-up flood (62/run → target 30-40)
        DROP_SCALING: {
            // Per-cycle bonus to drop chance
            CYCLE_BONUS: 0,              // v4.17: 0.5%→0 (flat rate, no cycle scaling)

            // Pity timer decreases with cycle
            PITY_BASE: 55,              // Base kills for guaranteed drop (v4.17: 45→55)
            PITY_REDUCTION: 2           // -2 kills per cycle (min 15) (v4.17: 3→2)
        },

        // --- ADAPTIVE DROPS v4.19 ---
        // Dynamic suppression based on player power state
        ADAPTIVE_DROPS: {
            ENABLED: true,
            // Power score weights (sum = 1.0)
            SHOT_WEIGHT: 0.40,          // Weight of shot level in power score
            MOD_WEIGHT: 0.35,           // Weight of modifiers in power score
            SPECIAL_WEIGHT: 0.25,       // Weight of special in power score
            // Suppression
            SUPPRESSION_FLOOR: 0.15,    // Below this power score, no suppression
            // Need-based category selection weights
            CATEGORY_WEIGHTS: {
                UPGRADE: 1.5,           // Base weight for upgrade need
                MODIFIER: 1.0,          // Base weight for modifier need
                SPECIAL: 0.8            // Base weight for special need
            },
            MIN_CATEGORY_WEIGHT: 0.05   // Minimum weight to prevent zero-chance
        },

        // --- WAVES ---
        WAVES: {
            PER_CYCLE: 5,                 // Waves before boss appears
            ENEMY_FIRE_TIMER: 0.5,        // Base timer for enemy fire phase
            HORDES_PER_WAVE: 2,           // Number of hordes per wave
            HORDE_TRANSITION_DURATION: 0.8, // Seconds between hordes
            HORDE_2_PATTERN_VARIANT: true // Use different pattern for horde 2
        },

        // --- WAVE DEFINITIONS v4.0 ---
        // 15 unique waves (5 per cycle × 3 cycles)
        // Each wave has: formation, enemy counts, currency themes
        WAVE_DEFINITIONS: {
            // Currency theme groups for thematic waves
            CURRENCY_THEMES: {
                ASIAN_BLOC: ['¥', '元', '₹'],      // Yen, Yuan, Rupee
                EURO_BLOC: ['€', '£', '₣'],        // Euro, Pound, Franc
                EMERGING: ['₽', '₹', '₺'],         // Ruble, Rupee, Lira
                DOLLAR_ALLIES: ['$', '€', '£'],    // Dollar + Western
                BRICS: ['₽', '₹', '元'],           // BRICS nations
                DIGITAL_THREAT: ['Ⓒ', '$', '元'],  // CBDCs + majors
                WEAK_ONLY: ['¥', '₽', '₹'],
                MEDIUM_ONLY: ['€', '£', '₣', '₺'],
                STRONG_ONLY: ['$', '元', 'Ⓒ'],
                ALL_MIX: ['¥', '₽', '₹', '€', '£', '₣', '₺', '$', '元', 'Ⓒ']
            },

            // Horde modifiers - differentiate horde 1 vs horde 2
            HORDE_MODIFIERS: {
                1: { behaviorBonus: 0, fireRateMult: 1.0, entryStyle: 'stagger' },
                2: { behaviorBonus: 0.20, fireRateMult: 1.15, entryStyle: 'rapid' }
            },

            // v4.6.1: Cycle-based enemy count multiplier (player is stronger in later cycles)
            // v4.18: +20% C1, +10% C2, +5% C3 — slow down early cycles, more targets to clear
            CYCLE_COUNT_MULT: [1.2, 1.375, 1.575],  // C1: 1.0×1.2, C2: 1.25×1.1, C3: 1.5×1.05

            // Bear Market scaling
            BEAR_MARKET: {
                COUNT_MULT: 1.25,           // +25% enemies
                FORCE_STRONG: true          // Force strong enemies in mix
            },

            // Wave definitions: cycle, wave, name, formation, counts, currencies
            // v4.0.3: H2 formations diversified (complementary pairing for visual variety)
            // v4.14: All counts +25% (ceil) — rebalanced for smaller 48px enemies
            WAVES: [
                // === CYCLE 1: "AWAKENING" (Tutorial) ===
                {
                    cycle: 1, wave: 1, name: 'First Contact',
                    horde1: { count: 15, formation: 'DIAMOND', currencies: ['¥', '₽', '₹'] },
                    horde2: { count: 13, formation: 'DIAMOND', currencies: ['¥', '₽', '₹'] }
                },
                {
                    cycle: 1, wave: 2, name: 'European Dawn',
                    horde1: { count: 18, formation: 'ARROW', currencies: ['¥', '₽', '€'] },
                    horde2: { count: 15, formation: 'CHEVRON', currencies: ['₹', '£'] }
                },
                {
                    cycle: 1, wave: 3, name: 'Old World',
                    horde1: { count: 15, formation: 'PINCER', currencies: ['€', '£', '₣'] },
                    horde2: { count: 13, formation: 'DIAMOND', currencies: ['₺', '€', '£'] }
                },
                {
                    cycle: 1, wave: 4, name: 'Dollar Emerges',
                    horde1: { count: 18, formation: 'CHEVRON', currencies: ['€', '₣', '$'] },
                    horde2: { count: 13, formation: 'ARROW', currencies: ['£', '₺', '元'] }
                },
                {
                    cycle: 1, wave: 5, name: 'Global Alliance',
                    horde1: { count: 20, formation: 'FORTRESS', currencies: ['¥', '€', '$', '元'] },
                    horde2: { count: 15, formation: 'SCATTER', currencies: ['₽', '£', '₣', 'Ⓒ'] }
                },

                // === CYCLE 2: "CONFLICT" (Learning) ===
                {
                    cycle: 2, wave: 1, name: 'Eastern Front',
                    horde1: { count: 18, formation: 'SCATTER', currencies: ['¥', '元', '₹'] },
                    horde2: { count: 15, formation: 'WALL', currencies: ['¥', '元', '₽'] }
                },
                {
                    cycle: 2, wave: 2, name: 'Brussels Burns',
                    horde1: { count: 20, formation: 'SPIRAL', currencies: ['€', '₣', '£'] },
                    horde2: { count: 18, formation: 'CROSS', currencies: ['€', '₣', '₺'] }
                },
                {
                    cycle: 2, wave: 3, name: 'Reserve War',
                    horde1: { count: 23, formation: 'CROSS', currencies: ['$', '€', '£'] },
                    horde2: { count: 18, formation: 'FLANKING', currencies: ['$', '元', 'Ⓒ'] }
                },
                {
                    cycle: 2, wave: 4, name: 'BRICS Rising',
                    horde1: { count: 23, formation: 'WALL', currencies: ['₽', '₹', '₺', '$'] },
                    horde2: { count: 20, formation: 'GAUNTLET', currencies: ['元', 'Ⓒ', '$'] }
                },
                {
                    cycle: 2, wave: 5, name: 'Final Stand',
                    horde1: { count: 25, formation: 'GAUNTLET', currencies: ['$', '元', 'Ⓒ', '€'] },
                    horde2: { count: 20, formation: 'WALL', currencies: ['$', '元', 'Ⓒ', '₣'] }
                },

                // === CYCLE 3: "RECKONING" (Skilled) ===
                {
                    cycle: 3, wave: 1, name: 'Digital Doom',
                    horde1: { count: 23, formation: 'VORTEX', currencies: ['Ⓒ', '€', '$'] },
                    horde2: { count: 20, formation: 'HURRICANE', currencies: ['Ⓒ', '元', '£'] }
                },
                {
                    cycle: 3, wave: 2, name: 'Pincer Attack',
                    horde1: { count: 25, formation: 'FLANKING', currencies: ['$', '元', 'Ⓒ'] },
                    horde2: { count: 23, formation: 'SPIRAL', currencies: ['€', '£', '₣', '$'] }
                },
                {
                    cycle: 3, wave: 3, name: 'Escalation',
                    horde1: { count: 28, formation: 'STAIRCASE', currencies: ['¥', '₽', '₹', '€', '£', '₣', '₺', '$', '元', 'Ⓒ'] },
                    horde2: { count: 23, formation: 'STAIRCASE_REVERSE', currencies: ['$', '元', 'Ⓒ', '₺', '₣', '£', '€', '₹', '₽', '¥'] }
                },
                {
                    cycle: 3, wave: 4, name: 'Eye of Storm',
                    horde1: { count: 28, formation: 'HURRICANE', currencies: ['¥', '₽', '₹', '€', '£', '₣', '₺', '$', '元', 'Ⓒ'] },
                    horde2: { count: 25, formation: 'VORTEX', currencies: ['$', '元', 'Ⓒ'] }
                },
                {
                    cycle: 3, wave: 5, name: 'Endgame',
                    horde1: { count: 30, formation: 'FINAL_FORM', currencies: ['$', '元', 'Ⓒ', '€', '£', '₣'] },
                    horde2: { count: 25, formation: 'FINAL_FORM', currencies: ['Ⓒ', 'Ⓒ', 'Ⓒ', '$', '元'] }
                }
            ],

            // Formation definitions with generator function names
            FORMATIONS: {
                // Cycle 1 formations (simpler, tutorial-friendly)
                DIAMOND:    { generator: 'generateDiamond', scaleWithCount: true },
                ARROW:      { generator: 'generateArrow', direction: 'down' },
                PINCER:     { generator: 'generatePincer' },
                CHEVRON:    { generator: 'generateChevron' },
                FORTRESS:   { generator: 'generateFortress' },

                // Cycle 2 formations (more complex)
                SCATTER:    { generator: 'generateScatter' },
                SPIRAL:     { generator: 'generateSpiral' },
                CROSS:      { generator: 'generateCross' },
                WALL:       { generator: 'generateWall' },
                GAUNTLET:   { generator: 'generateGauntlet' },

                // Cycle 3 formations (challenging)
                VORTEX:     { generator: 'generateVortex' },
                FLANKING:   { generator: 'generateFlanking' },
                STAIRCASE:  { generator: 'generateStaircase', ascending: true },
                STAIRCASE_REVERSE: { generator: 'generateStaircase', ascending: false },
                HURRICANE:  { generator: 'generateHurricane' },
                FINAL_FORM: { generator: 'generateFinalForm' },

                // Legacy patterns (backwards compatibility)
                RECT:       { generator: 'generateRect' },
                V_SHAPE:    { generator: 'generateVShape' },
                COLUMNS:    { generator: 'generateColumns' },
                SINE_WAVE:  { generator: 'generateSineWave' }
            }
        },

        // --- FORMATION LAYOUT (v4.0.3: extracted from WaveManager hardcodes) ---
        FORMATION: {
            SPACING: 78,              // v4.25: 65→78 (58px enemies, was 48px)
            START_Y: 80,              // Initial Y position (v4.4: 150→80 for compact HUD)
            MARGIN: 60,               // Left/right margin for scatter/wall
            MAX_Y_RATIO: 0.65,        // v4.16: extracted from WaveManager hardcode (max Y as ratio of gameHeight)
            CHEVRON_Y_MULT: 0.55,     // v4.16: Y-spacing multiplier for CHEVRON (was 0.75, caused overflow with high counts)
            SPIRAL_CENTER_Y_OFFSET: 100, // Spiral center Y offset from startY
            SPIRAL_ANGLE_STEP: 0.5,   // Radians per enemy in spiral
            SPIRAL_BASE_RADIUS: 36,   // v4.25: 30→36 (58px enemies)
            SPIRAL_RADIUS_STEP: 19,   // v4.25: 16→19 (58px enemies, prevents spiral overlap)
            SPIRAL_Y_SQUEEZE: 0.6,    // Y axis compression for spiral
            ROW_TOLERANCE: 25,        // Y tolerance for grouping positions into rows (currency assignment)
            SAFE_EDGE_MARGIN: 30,     // Min X margin from screen edge (must be > 20px edge-detect threshold)
            // v4.32: Responsive formation scaling
            RESPONSIVE: true,         // Master toggle (false = pre-v4.32 fixed spacing)
            SPACING_MIN: 62,          // Min spacing (58px enemy + 4px gap, prevents overlap)
            START_Y_RESPONSIVE: true  // Scale startY with height ratio
        },

        // --- ENEMY FORMATION ENTRY ---
        FORMATION_ENTRY: {
            ENABLED: true,                // Enable formation entry animation
            ENTRY_SPEED: 600,             // Pixels per second during entry
            STAGGER_DELAY: 0.04,          // Seconds between each enemy starting entry
            SPAWN_Y_OFFSET: -80,          // Y offset above screen for spawning
            SETTLE_TIME: 0.3,             // Seconds to settle after reaching position
            CURVE_INTENSITY: 0.15         // How much enemies curve during entry (0-1)
        },

        // --- VFX SYSTEM v4.5 (Game Feel Overhaul) ---
        VFX: {
            // Enemy hit reaction
            HIT_FLASH_DURATION: 0.04,         // Seconds of white flash on hit
            HIT_SHAKE_INTENSITY: 2,           // Max px offset on hit
            HIT_SHAKE_DURATION: 0.06,         // Seconds of shake
            DAMAGE_TINT_START: 0.5,           // HP ratio below which tint begins
            SMOKE_HP_THRESHOLD: 0.20,         // HP ratio below which smoke starts
            SMOKE_INTERVAL: 0.15,             // Seconds between smoke particles

            // Bullet impact sparks (contextual)
            SPARK_COUNT_BASE: 4,              // Particles at shot level 1
            SPARK_COUNT_PER_LEVEL: 2,         // +2 per shot level
            SPARK_POWER_SCALE: 1.5,           // Size mult with POWER modifier
            SPARK_KILL_RING: true,            // Expanding ring on kill hit
            SPARK_HYPER_RING: true,           // Golden ring during HYPER

            // Muzzle flash evolution
            MUZZLE_SCALE_PER_LEVEL: 0.4,     // +40% per shot level
            MUZZLE_POWER_SCALE: 1.3,         // Size mult with POWER mod
            MUZZLE_RATE_SCALE: 0.6,          // Size mult with RATE mod (smaller, faster)
            MUZZLE_RING_AT_LEVEL: 3,         // Show ring burst at this shot level

            // Explosion tiers
            EXPLOSION_WEAK: { particles: 6, ringCount: 1, duration: 0.30, debrisCount: 2 },
            EXPLOSION_MEDIUM: { particles: 10, ringCount: 1, duration: 0.40, debrisCount: 4 },
            EXPLOSION_STRONG: { particles: 14, ringCount: 2, duration: 0.55, debrisCount: 6, flash: true },

            // Trail enhancement
            TRAIL_POWER_GLOW: 0.25,           // Outer glow alpha with POWER mod
            TRAIL_HYPER_SPARKLE: true,        // Golden sparkles during HYPER

            // Screen juice
            MULTI_KILL_WINDOW: 0.05,          // Seconds to count as multi-kill (3 frames)
            MULTI_KILL_FLASH: { duration: 0.08, opacity: 0.20, color: '#FFFFFF' },
            STRONG_KILL_SHAKE: 3,             // Shake px on strong-tier kill
            STRONG_KILL_SHAKE_DURATION: 0.06, // Shake duration
            HYPER_AMBIENT_INTERVAL: 0.12,     // Seconds between HYPER sparkles
            COMBO_SCORE_SCALE: true           // Float score size scales with streak
        },

        // --- GODCHAIN MODE v4.6 (All modifiers maxed simultaneously) ---
        GODCHAIN: {
            // v4.6.1: Lowered from 3/3/2 — original was near-impossible in normal play
            REQUIREMENTS: { RATE: 2, POWER: 2, SPREAD: 1 },
            SPEED_BONUS: 1.05,          // +5% movement speed
            SHIP_COLORS: {
                BODY: '#cc2222',        // Deep red body
                BODY_DARK: '#881111',   // Dark red accent
                BODY_LIGHT: '#ff4444',  // Light red highlight
                NOSE: '#ff6633',        // Orange-red nose
                NOSE_LIGHT: '#ff9966',  // Light nose
                FIN: '#991111',         // Dark red fins
                FIN_LIGHT: '#dd3333',   // Light red fins
                WINDOW: '#ffaaaa',      // Pink-red window
                ENGINE: '#ff4400'       // Engine glow
            },
            AURA: {
                INNER_RADIUS: 28,
                OUTER_RADIUS: 52,
                ALPHA: 0.18,
                PULSE_SPEED: 3.0
            },
            FIRE_TRAIL: {
                TONGUE_COUNT: 3,
                LENGTH: 12,
                ALPHA: 0.7,
                COLORS: ['#ff4400', '#ff6600', '#ffaa00']
            }
        },

        // --- SKY & BACKGROUND v4.24 (Cell-Shading Enhancement) ---
        SKY: {
            ENABLED: true,              // Master toggle — false = legacy flat bands

            // A. Gradient sky (smooth cached linear gradient)
            GRADIENTS: {
                ENABLED: true,
                LEVELS: {
                    1: ['#3a80c9', '#5a9fd9', '#7bbfeb', '#9dd5f5'],
                    2: ['#2a6bb8', '#4a8bc8', '#7ab5d8', '#d4c87c'],
                    3: ['#3a4558', '#8b49a6', '#d74c3c', '#e38c22'],
                    4: ['#15152e', '#2a2a4e', '#3a2f5b', '#2d1b4e'],
                    5: ['#080812', '#101025', '#151535', '#1a1a40']
                },
                BOSS: ['#000008', '#05051a', '#0a0a20', '#0f0f28'],
                BEAR: ['#1a0000', '#2a0505', '#3a0a0a', '#2a0000']
            },

            // B. Star field
            STARS: {
                ENABLED: true,
                COUNT: 90,
                MIN_SIZE: 1.5,
                MAX_SIZE: 3.5,
                MIN_VISIBLE_LEVEL: 3,      // Stars appear from L3
                ALPHA_BY_LEVEL: { 3: 0.25, 4: 0.55, 5: 1.0 },
                DRIFT_SPEED: 3,            // px/sec base drift
                SHOOTING_STARS: {
                    ENABLED: true,
                    MAX_ACTIVE: 2,
                    SPAWN_INTERVAL_MIN: 4,
                    SPAWN_INTERVAL_MAX: 12,
                    SPEED: 350,
                    LENGTH: 40
                }
            },

            // C. Parallax hills
            HILLS: {
                ENABLED: true,
                LAYERS: [
                    { yRatio: 0.65, height: 60,  speed: 2,  amp1: 12, freq1: 0.015, amp2: 6,  freq2: 0.008 },
                    { yRatio: 0.70, height: 80,  speed: 4,  amp1: 16, freq1: 0.018, amp2: 8,  freq2: 0.010 },
                    { yRatio: 0.75, height: 100, speed: 5,  amp1: 20, freq1: 0.020, amp2: 12, freq2: 0.010 },
                    { yRatio: 0.80, height: 110, speed: 12, amp1: 25, freq1: 0.020, amp2: 15, freq2: 0.010 },
                    { yRatio: 0.85, height: 90,  speed: 20, amp1: 25, freq1: 0.020, amp2: 15, freq2: 0.010 }
                ],
                COLORS: {
                    1: ['#8ab8d0', '#6a9ab8', '#4a7da0', '#3a6888', '#2a5470'],
                    2: ['#7aa0c0', '#5a88a8', '#4a7090', '#3a6080', '#2a5070'],
                    3: ['#7a5a70', '#6a4860', '#5a3850', '#4a3040', '#3a2030'],
                    4: ['#2a2a50', '#222244', '#1c1c3c', '#181834', '#14142c'],
                    5: ['#1a1a3a', '#161632', '#12122a', '#0e0e22', '#0a0a1a']
                },
                BEAR_COLORS: ['#2a0808', '#220606', '#1e0505', '#1a0404', '#160303'],
                SILHOUETTES: {
                    ENABLED: true,
                    MAX_LAYER: 2,           // Only on distant layers (0-2)
                    DENSITY: 0.02,          // Chance per pixel-step
                    TREE_HEIGHT_MIN: 6,
                    TREE_HEIGHT_MAX: 18,
                    BUILDING_WIDTH_MIN: 8,
                    BUILDING_WIDTH_MAX: 16,
                    BUILDING_HEIGHT_MIN: 10,
                    BUILDING_HEIGHT_MAX: 25
                }
            },

            // D. Atmospheric particles
            PARTICLES: {
                ENABLED: true,
                COUNT: 20,
                MIN_SIZE: 1.5,
                MAX_SIZE: 3.5,
                MIN_ALPHA: 0.06,
                MAX_ALPHA: 0.20,
                DRIFT_SPEED: 12,
                WOBBLE_SPEED: 1.5,
                WOBBLE_AMP: 15,
                OUTLINE_THRESHOLD: 3.0,    // px — particles >= this get #111 outline
                THEMES: {
                    1: { color: '#c8b888', type: 'dust' },
                    2: { color: '#aad488', type: 'pollen' },
                    3: { color: '#ddaa55', type: 'dust' },
                    4: { color: '#88ddaa', type: 'firefly' },
                    5: { color: '#66ccff', type: 'firefly' }
                },
                BEAR_THEME: { color: '#ff6622', type: 'ember' },
                FIREFLY_BLINK_SPEED: 3.0
            },

            // E. Multi-lobe clouds
            CLOUDS: {
                ENABLED: true,
                COUNT: 12,
                LOBES_MIN: 2,
                LOBES_MAX: 4,
                LAYER_SCALE: { back: 1.3, front: 0.7 },
                HIGHLIGHT_OFFSET: -0.25,   // Y ratio offset for highlight lobe
                SHADOW_OFFSET_Y: 4,
                OUTLINE_WIDTH: 2,
                COLORS: {
                    NORMAL: { shadow: '#b0c0d0', main: '#e8f0f8', highlight: '#ffffff', outline: '#7888a0' },
                    BEAR: { shadow: '#200808', main: '#301010', highlight: '#401818', outline: '#401515' },
                    NIGHT: { shadow: '#181830', main: '#282848', highlight: '#383860', outline: '#101028' }
                }
            },

            // F. Horizon glow
            HORIZON_GLOW: {
                ENABLED: true,
                HEIGHT: 8,
                ALPHA_MIN: 0.12,
                ALPHA_MAX: 0.28,
                PULSE_SPEED: 1.5,
                COLORS: {
                    1: '#9dd5f5',
                    2: '#d4c87c',
                    3: '#e38c22',
                    4: '#3a2f5b',
                    5: '#1a1a40'
                },
                BEAR_COLOR: '#4a0000',
                BOSS_COLOR: '#0f0f28'
            },

            // G. Off-screen canvas caching (v4.31)
            OFFSCREEN: {
                ENABLED: true,            // false = direct-draw (pre-v4.31)
                HILLS_REDRAW_INTERVAL: 2  // frames between hills redraw (1 = every frame)
            }
        },

        // --- ADDITIVE GLOW SYSTEM (v4.23, boosted v4.23.1) ---
        GLOW: {
            ENABLED: true,

            BULLET: {
                ENABLED: true,
                RADIUS: 18,              // v4.23.1: 12→18 for visible halo
                ALPHA: 0.45,             // v4.23.1: 0.25→0.45
                PULSE_SPEED: 8,
                PULSE_AMOUNT: 0.15       // v4.23.1: 0.08→0.15 stronger pulse
            },

            ENGINE: {
                ENABLED: true,
                RADIUS: 24,              // v4.23.1: 18→24
                ALPHA: 0.55              // v4.23.1: 0.35→0.55
            },

            MUZZLE: {
                ENABLED: true,
                RADIUS_MULT: 1.8,        // v4.23.1: 1.4→1.8
                ALPHA: 0.6               // v4.23.1: 0.4→0.6
            },

            AURA: {
                ENABLED: true,
                ALPHA_MULT: 1.0           // v4.23.1: 0.8→1.0
            },

            POWERUP: {
                ENABLED: true,
                RADIUS_MULT: 1.5,        // v4.23.1: 1.2→1.5
                ALPHA: 0.5               // v4.23.1: 0.35→0.5
            },

            PARTICLES: {
                ENABLED: true,
                RING_ALPHA_MULT: 1.3     // v4.23.1: 1.0→1.3
            },

            DEATH_FLASH: {               // v4.23.1: lingering glow on enemy death
                ENABLED: true,
                RADIUS: 30,
                DURATION: 0.4
            }
        },

        // --- RANK SYSTEM (Dynamic Difficulty v4.1.0) ---
        RANK: {
            ENABLED: true,            // Toggle dynamic difficulty
            WINDOW_SIZE: 30,          // Rolling window in seconds
            FIRE_RATE_RANGE: 0.20,    // ±20% fire rate adjustment
            ENEMY_COUNT_RANGE: 0.15,  // ±15% enemy count adjustment
            DEATH_PENALTY: 0.15,      // Rank decrease on death
            CONVERGENCE_SPEED: 0.5    // How fast rank changes (lower = smoother)
        },

        // --- FIRE BUDGET (v4.17 — BUG 7 fix: bullet density control) ---
        // Limits total enemy bullets/sec to prevent screen flooding with many enemies
        FIRE_BUDGET: {
            ENABLED: true,
            BULLETS_PER_SECOND: [20, 36, 56],  // Per cycle [C1, C2, C3] — v4.18: -20% flat
            BEAR_MARKET_BONUS: 10,              // +10 bullets/sec in Bear Market
            PANIC_MULTIPLIER: 1.3,              // +30% during PANIC phase
            RANK_SCALE: 0.15,                   // ±15% from rank
            DEFICIT_CARRYOVER: 0.5              // 50% unused budget carried over
        },

        // --- HELPER FUNCTIONS ---

        /**
         * Calculate difficulty multiplier for current game state
         * Uses stepped progression per cycle with subtle wave scaling.
         * @param {number} level - Current level (1-based, continuous)
         * @param {number} cycle - Current market cycle (1-based)
         * @returns {number} Difficulty multiplier (0 to MAX)
         */
        calculateDifficulty(level, cycle) {
            // Get base difficulty for this cycle (stepped)
            const cycleIndex = Math.min(cycle - 1, this.DIFFICULTY.CYCLE_BASE.length - 1);
            const baseDiff = this.DIFFICULTY.CYCLE_BASE[cycleIndex];

            // Calculate wave within current cycle (0-4)
            const waveInCycle = ((level - 1) % this.WAVES.PER_CYCLE);

            // Add wave scaling within cycle
            const waveBonus = waveInCycle * this.DIFFICULTY.WAVE_SCALE;

            return Math.min(this.DIFFICULTY.MAX, baseDiff + waveBonus);
        },

        /**
         * Calculate grid speed for current difficulty
         * Bear Market adds flat speed bonus instead of multiplier.
         * @param {number} difficulty - Current difficulty (0 to MAX)
         * @param {boolean} isBearMarket - Whether bear market mode is active
         * @returns {number} Grid movement speed
         */
        calculateGridSpeed(difficulty, isBearMarket) {
            // Base speed from difficulty
            let speed = this.GRID.SPEED_BASE + difficulty * this.GRID.SPEED_SCALE;

            // Bear Market: add flat bonus (equivalent to +25% difficulty)
            if (isBearMarket) {
                speed += this.DIFFICULTY.BEAR_MARKET_BONUS * this.GRID.SPEED_SCALE;
            }

            return speed;
        },

        /**
         * Calculate enemy HP for current difficulty
         * @param {number} difficulty - Current difficulty (0 to MAX_DIFFICULTY)
         * @returns {number} Enemy HP multiplier
         */
        calculateEnemyHP(difficulty) {
            return this.ENEMY_HP.BASE + Math.floor(difficulty * this.ENEMY_HP.SCALE);
        },

        /**
         * Calculate enemy bullet speed for current difficulty
         * @param {number} difficulty - Current difficulty (0 to MAX_DIFFICULTY)
         * @returns {number} Bullet speed
         */
        calculateBulletSpeed(difficulty) {
            return this.ENEMY_FIRE.BULLET_SPEED_BASE + difficulty * this.ENEMY_FIRE.BULLET_SPEED_SCALE;
        },

        /**
         * Get drop chance for enemy tier
         * @param {string} symbol - Enemy currency symbol
         * @returns {number} Drop chance (0 to 1)
         */
        getDropChance(symbol) {
            if (this.TIERS.STRONG.includes(symbol)) return this.DROPS.CHANCE_STRONG;
            if (this.TIERS.MEDIUM.includes(symbol)) return this.DROPS.CHANCE_MEDIUM;
            return this.DROPS.CHANCE_WEAK;
        },

        /**
         * Check if symbol is a strong tier enemy
         * @param {string} symbol - Enemy currency symbol
         * @returns {boolean}
         */
        isStrongTier(symbol) {
            return this.TIERS.STRONG.includes(symbol);
        },

        /**
         * Check if symbol is a medium tier enemy
         * @param {string} symbol - Enemy currency symbol
         * @returns {boolean}
         */
        isMediumTier(symbol) {
            return this.TIERS.MEDIUM.includes(symbol);
        },

        /**
         * Get shake intensity for event type
         * @param {string} event - Event type (BOSS_DEFEAT, PLAYER_DEATH, etc.)
         * @returns {number} Shake intensity
         */
        getShakeIntensity(event) {
            return this.EFFECTS.SHAKE[event] || this.EFFECTS.SHAKE.WARNING;
        },

        /**
         * Get graze score multiplier from meter value
         * @param {number} grazeMeter - Current graze meter (0-100)
         * @returns {number} Score multiplier (1.0 to MULT_MAX)
         */
        getGrazeMultiplier(grazeMeter) {
            return 1 + (grazeMeter / this.GRAZE.MULT_DIVISOR) * (this.GRAZE.MULT_MAX - 1);
        },

        /**
         * Get pattern difficulty parameters for cycle
         * @param {number} cycle - Current market cycle (1-based)
         * @param {boolean} isBearMarket - Whether bear market mode is active
         * @returns {Object} Pattern params {gapSize, telegraphTime, maxBullets, complexity}
         */
        getPatternParams(cycle, isBearMarket) {
            const P = this.PATTERNS;
            const idx = Math.min(cycle - 1, P.GAP_SIZE.length - 1);

            let params = {
                gapSize: P.GAP_SIZE[idx],
                telegraphTime: P.TELEGRAPH_TIME[idx],
                maxBullets: P.MAX_BULLETS[idx],
                complexity: P.COMPLEXITY[idx]
            };

            if (isBearMarket) {
                params.gapSize = Math.max(45, params.gapSize + P.GAP_SIZE_BEAR_BONUS);
                params.telegraphTime *= P.TELEGRAPH_TIME_BEAR_MULT;
                params.maxBullets = Math.min(70, params.maxBullets + P.MAX_BULLETS_BEAR_BONUS);
                params.complexity = Math.min(4, params.complexity + P.COMPLEXITY_BEAR_BONUS);
            }

            return params;
        },

        /**
         * Get streak milestone text if applicable
         * @param {number} streak - Current kill streak
         * @returns {Object|null} Milestone object {at, text} or null
         */
        getStreakMilestone(streak) {
            return this.MEMES.STREAK_MILESTONES.find(m => m.at === streak) || null;
        },

        /**
         * Get random lightning interval
         * @returns {number} Seconds until next lightning
         */
        getRandomLightningInterval() {
            const min = this.TIMING.LIGHTNING_MIN;
            const max = this.TIMING.LIGHTNING_MAX;
            return min + Math.random() * (max - min);
        },

        /**
         * Get boss phase from HP percentage
         * @param {number} hpPercent - Current HP as percentage (0-1)
         * @returns {number} Phase number (1, 2, or 3)
         */
        getBossPhase(hpPercent) {
            if (hpPercent > this.BOSS.PHASE_THRESHOLDS[0]) return 1;
            if (hpPercent > this.BOSS.PHASE_THRESHOLDS[1]) return 2;
            return 3;
        },

        /**
         * Get boss movement speed for phase
         * @param {string} bossType - Boss type (FEDERAL_RESERVE, BCE, BOJ)
         * @param {number} phase - Phase number (1, 2, 3)
         * @returns {number} Movement speed
         */
        getBossPhaseSpeed(bossType, phase) {
            const speeds = this.BOSS.PHASE_SPEEDS[bossType];
            return speeds ? speeds[phase - 1] : 60;
        },

        /**
         * Get boss fire rate for phase
         * @param {string} bossType - Boss type (FEDERAL_RESERVE, BCE, BOJ)
         * @param {number} phase - Phase number (1, 2, 3)
         * @returns {number} Fire rate in seconds
         */
        getBossFireRate(bossType, phase) {
            const rates = this.BOSS.FIRE_RATES[bossType];
            return rates ? rates[phase - 1] : 0.5;
        },

        /**
         * Calculate boss base HP (before modifiers)
         * @param {number} level - Current level
         * @param {number} cycle - Market cycle (1-based)
         * @returns {number} Base HP
         */
        calculateBossHP(level, cycle) {
            const hp = this.BOSS.HP;
            return hp.BASE + (level * hp.PER_LEVEL) + ((cycle - 1) * hp.PER_CYCLE);
        },

        /**
         * Get wave definition for current cycle/wave
         * @param {number} cycle - Market cycle (1-based)
         * @param {number} waveInCycle - Wave number within cycle (1-5)
         * @returns {Object|null} Wave definition or null if not found
         */
        getWaveDefinition(cycle, waveInCycle) {
            const defs = this.WAVE_DEFINITIONS.WAVES;
            // Cap cycle at 3 (repeat cycle 3 for cycles 4+)
            const effectiveCycle = Math.min(cycle, 3);
            return defs.find(w => w.cycle === effectiveCycle && w.wave === waveInCycle) || null;
        },

        /**
         * Get currency type config by symbol
         * @param {string} symbol - Currency symbol (e.g., '¥', '$')
         * @returns {Object|null} Fiat type config or null
         */
        getCurrencyBySymbol(symbol) {
            return window.Game.FIAT_TYPES.find(t => t.s === symbol) || null;
        },

        /**
         * Get horde modifiers for horde number
         * @param {number} hordeNumber - 1 or 2
         * @returns {Object} Horde modifiers
         */
        getHordeModifiers(hordeNumber) {
            return this.WAVE_DEFINITIONS.HORDE_MODIFIERS[hordeNumber] ||
                   this.WAVE_DEFINITIONS.HORDE_MODIFIERS[1];
        }
    };
})();
