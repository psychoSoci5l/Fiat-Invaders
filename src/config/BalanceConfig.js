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
            INVULN_DURATION: 1.4,     // Post-hit invulnerability seconds
            MUZZLE_FLASH_DURATION: 0.08, // Muzzle flash display time
            BULLET_SPAWN_Y_OFFSET: 33,   // Y offset for bullet spawn above ship (v5.9: 25→33 chevron)
            FIRE_VIBRATION_MS: 5,     // Haptic feedback on fire
            DANGER_RANGE_SQ: 3600,    // Core hitbox indicator range (60px squared)
            START_LIVES: 3,           // Starting lives per run
            SHIELD_COOLDOWN: 10.0,    // Base shield cooldown seconds
            SHIELD_DURATION: 5.0,     // Shield active duration (seconds)
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

        // --- PERK SYSTEM (v4.60: Elemental perks) ---
        PERK: {
            ENABLED: true,            // Toggle perk system (false = no perks awarded)
            COOLDOWN_TIME: 20,        // v5.0.4: 25→20s (compromise: not too fast, not boring)
            PAUSE_DURATION: 1.2,      // Seconds to pause for perk notification
            MAX_ELEMENTS: 3           // v4.60: 3 elemental perks (fire→laser→electric)
        },

        // --- ELEMENTAL PERK EFFECTS (v4.60) ---
        ELEMENTAL: {
            FIRE: {
                SPLASH_RADIUS: 55,    // v5.0.8: 40→50→55 (wider AoE for formation clumps)
                SPLASH_DAMAGE: 0.55,  // v5.31: 0.50→0.55 (+10% elemental buff)
                TRAIL_COLORS: ['#ff4400', '#ff6600', '#ffaa00'],
                IMPACT_PARTICLES: 8
            },
            LASER: {
                SPEED_MULT: 1.375,    // v5.31: 1.25→1.375 (+10% elemental buff)
                PIERCE_BONUS: 1,      // +1 pierce HP
                GLOW_COLOR: '#00f0ff',
                TRAIL_LENGTH: 18,     // legacy overlay (fallback when BEAM disabled)
                BEAM: {
                    ENABLED: true,
                    LENGTH: 75,
                    CORE_WIDTH: 2.5,       // white center line
                    MID_WIDTH: 5,          // cyan-white mid layer
                    OUTER_WIDTH: 10,       // cyan glow (additive pass)
                    CORE_ALPHA: 1.0,
                    MID_ALPHA: 0.5,
                    OUTER_ALPHA: 0.18,
                    SHIMMER_SPEED: 15,     // rad/s
                    SHIMMER_AMOUNT: 0.15,
                    HEAD_GLOW_RADIUS: 6,   // bright tip
                    IMPACT_PARTICLES: 6
                }
            },
            ELECTRIC: {
                CHAIN_RADIUS: 100,    // v5.0.8: 80→90→100 (wider chain reach)
                CHAIN_DAMAGE: 0.44,   // v5.31: 0.40→0.44 (+10% elemental buff)
                CHAIN_TARGETS: 2,     // max enemies to chain to
                ARC_COLOR: '#8844ff',
                ARC_COLOR_BRIGHT: '#bb88ff'
            },
            // v5.0.7: Elemental Contagion — cascade kills propagate elemental effects
            CONTAGION: {
                ENABLED: true,
                MAX_DEPTH: [1, 2, 2],     // max cascade depth per perkLevel 1/2/3+
                DAMAGE_DECAY: 0.38          // v5.31: 0.45→0.38 (-15%, cascade weakens faster)
            },
            // v5.13: Contagion cascade VFX (line + ripple)
            CONTAGION_VFX: {
                ENABLED: true,
                LINE_DURATION: 0.20,       // seconds
                LINE_WIDTH: 2,
                COLORS: {
                    FIRE: '#ff6600',
                    ELECTRIC: '#8844ff'
                },
                RIPPLE_DURATION: 0.20,
                RIPPLE_RADIUS: 18
            },

            // v5.15: Elemental tint on living enemies
            ENEMY_TINT: {
                ENABLED: true,
                FLASH_DURATION: 0.15,
                FLASH_ALPHA: 0.6,
                PERSISTENT_ALPHA: 0.25,
                FIRE: '#ff4400', LASER: '#00f0ff', ELECTRIC: '#8844ff'
            },

            // v5.28: Cockpit canopy — transparent ellipse with reactive BTC symbol
            COCKPIT_CANOPY: {
                RX: 12,           // Ellipse horizontal radius
                RY: 9,            // Ellipse vertical radius
                CY: -12,          // Center Y offset from ship center
                GLASS_ALPHA: 0.12,// Canopy glass transparency
                BORDER_WIDTH: 1.5,
                BTC_SCALE: 0.7,   // BTC symbol scale inside canopy
                // Reactive colors per element
                COLOR_DEFAULT: '#00f0ff',
                COLOR_FIRE:    '#ff6622',
                COLOR_LASER:   '#00f0ff',
                COLOR_ELECTRIC:'#aa77ff',
                COLOR_GC:      null,  // null = prismatic (hue rotation)
            },

            // v5.27: Cannon housing tint per active elemental perk
            CANNON_TINT: {
                FIRE:     { DARK: '#663311', LIGHT: '#ff6622' },
                LASER:    { DARK: '#114455', LIGHT: '#00f0ff' },
                ELECTRIC: { DARK: '#442266', LIGHT: '#aa77ff' }
            }
        },

        // --- ELEMENTAL VFX v5.13 (Spectacular perk visuals) ---
        ELEMENTAL_VFX: {
            // Pickup surge (flash + burst + pulse on perk collect)
            PICKUP_SURGE: {
                FLASH_DURATION: 0.10,
                FLASH_OPACITY: 0.20,
                PARTICLE_COUNT: 12,
                SHIP_PULSE_DURATION: 0.35,
                COLORS: {
                    FIRE:     { hex: '#ff6600', rgb: [255, 102, 0] },
                    LASER:    { hex: '#00f0ff', rgb: [0, 240, 255] },
                    ELECTRIC: { hex: '#bb44ff', rgb: [187, 68, 255] },
                    GODCHAIN: { hex: '#FFD700', rgb: [255, 215, 0] }
                }
            },
            // Ship aura (persistent glow + ambient particles per element)
            SHIP_AURA: {
                ENABLED: true,
                FIRE: {
                    GLOW_RADIUS: 38,
                    GLOW_ALPHA: 0.12,
                    COLOR: [255, 102, 0],    // rgb for CU.rgba
                    EMBER_INTERVAL: 5,       // frames between ember emissions
                    EMBER_SPEED: 30,
                    EMBER_LIFE: 0.5,
                    EMBER_SIZE: 2.0
                },
                LASER: {
                    GLOW_RADIUS: 35,
                    GLOW_ALPHA: 0.10,
                    COLOR: [0, 240, 255],
                    TRAIL_INTERVAL: 4,
                    TRAIL_SPEED: 15,
                    TRAIL_LIFE: 0.35,
                    TRAIL_SIZE: 1.8
                },
                ELECTRIC: {
                    GLOW_RADIUS: 36,
                    GLOW_ALPHA: 0.11,
                    COLOR: [187, 68, 255],
                    ARC_INTERVAL: 8,         // frames between arc re-randomize
                    ARC_COUNT: 3,
                    ARC_RADIUS: 28,
                    ARC_SEGMENTS: 5,
                    ARC_JITTER: 6
                },
                STACK_ALPHA_MULT: 0.7        // alpha mult per additional aura
            },
            // GODCHAIN apotheosis burst
            GODCHAIN_APOTHEOSIS: {
                SYMBOLS: ['🔥', '⚡', '💎'],
                SYMBOL_SPEED: 120,
                SYMBOL_LIFE: 0.8,
                SYMBOL_SIZE: 22,
                RING_COUNT: 2,
                RING_COLOR: '#FFD700',
                GLOW_RADIUS: 30,
                GLOW_COLOR: '#FFD700'
            },
            // Napalm impact (replaces basic fire particles)
            NAPALM: {
                ENABLED: true,
                RING_SIZE: 10,
                RING_EXPAND: 40,
                RING_LIFE: 0.30,
                RING_COLOR: '#ff6600',
                TONGUE_COUNT: 6,
                TONGUE_SPEED_MIN: 100,
                TONGUE_SPEED_MAX: 200,
                TONGUE_LIFE: 0.25,
                TONGUE_SIZE: 3,
                TONGUE_COLORS: ['#ff4400', '#ff6600', '#ffaa00'],
                EMBER_COUNT: 5,
                EMBER_SPEED: 40,
                EMBER_LIFE: 0.45,
                EMBER_SIZE: 1.8,
                EMBER_GRAVITY: 120
            },
            // Lightning bolt (replaces basic electric chain)
            LIGHTNING: {
                ENABLED: true,
                SEGMENTS: 8,
                JITTER: 12,
                BRANCH_CHANCE: 0.3,
                BRANCH_LENGTH: 15,
                BRANCH_SEGMENTS: 3,
                DURATION: 0.25,
                CORE_WIDTH: 2,
                GLOW_WIDTH: 6,
                CORE_COLOR: '#ffffff',
                GLOW_COLOR: '#8844ff',
                BRANCH_COLOR: '#bb88ff',
                ENDPOINT_GLOW_SIZE: 12
            },
            // Laser beam impact sparks
            BEAM_IMPACT: {
                SPARK_COUNT: 3,
                SPARK_SPEED: 150,
                SPARK_LIFE: 0.12,
                SPARK_SIZE: 2,
                SPARK_COLOR: '#00f0ff',
                PIERCE_FLASH_SIZE: 10,
                PIERCE_FLASH_LIFE: 0.08,
                PIERCE_FLASH_COLOR: '#ffffff'
            }
        },

        // --- GRAZING SYSTEM (Core Risk/Reward Mechanic) ---
        // Grazing is the primary skill expression. Close to danger = maximum reward.
        GRAZE: {
            RADIUS: 25,               // Pixels outside core hitbox for graze
            CLOSE_RADIUS: 22,         // Close graze radius for 4x bonus (v4.44: 18→22, 7px gap was too tight — 2% hit rate)

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
            DECAY_RATE: 4,            // v4.60: 2→4 meter decay/sec (need consistent killing)
            DECAY_DELAY: 1.0,         // Seconds before decay starts (v2.24.11: 0.5→1.0)
            DECAY_CYCLE_SCALE: [0.50, 1.00, 1.50], // v5.15.1: decay multiplier per cycle [C1, C2, C3+]

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
            BASE_DURATION: 10.0,      // v4.60: 5→10s fixed duration (no extensions)
            GRAZE_EXTENSION: 0,       // v4.60: disabled (was 0.3)
            MAX_DURATION: 10.0,       // v4.60: matches BASE_DURATION (fixed)
            SCORE_MULT: 3.0,          // Score multiplier during HYPER (v4.44: 5.0→3.0, less score distortion between cycles)
            HITBOX_PENALTY: 1.5,      // Core hitbox size multiplier (50% larger = more risk)
            COOLDOWN: 8.0,            // Seconds after HYPER ends before meter can refill
            TIME_SCALE: 0.82,         // Game speed during HYPER (stronger slow-mo for readability)
            INSTANT_DEATH: true,      // If hit during HYPER, instant game over (bypass lives)

            // Visual settings
            AURA_PULSE_SPEED: 8,      // Aura animation speed
            AURA_SIZE_BASE: 46,       // Base aura radius (v5.28: 35→46 +30% premium)
            AURA_SIZE_PULSE: 7,       // Aura size oscillation (v5.28: 5→7)
            PARTICLE_BURST: 3,        // Particles per graze during HYPER (minimal clutter)

            // Audio settings
            WARNING_TIME: 2.0         // Seconds before HYPER ends to play warning
        },

        // --- JUICE SYSTEM (Hit Stop & Visual Feedback) ---
        // Every action should feel impactful. Micro-freezes and flashes create "weight".
        JUICE: {
            // Hit stop durations (seconds) - game freezes briefly on impact
            HIT_STOP: {
                // Gameplay — all zero (fluid action, no perceived stutter)
                ENEMY_KILL: 0,
                STREAK_10: 0,
                STREAK_25: 0,
                STREAK_50: 0,
                CLOSE_GRAZE: 0,
                PLAYER_HIT: 0.05,     // v5.31: 0→0.05 (50ms freeze frame on hit)
                // Non-gameplay — preserved (boss cinematic moments)
                BOSS_PHASE: 0.30,         // 300ms on boss phase transition
                BOSS_DEFEAT_FREEZE: 0.50, // v5.11: 500ms total freeze on boss death
                BOSS_DEFEAT_SLOWMO: 1.50, // v5.11: 1.5s slowmo after freeze
                WEAPON_UPGRADE: 0.40,     // v5.11: 400ms slowmo during evolution transform
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
                WEAPON_UPGRADE: { duration: 0.15, opacity: 0.40, color: '#FFFFFF' },
                PLAYER_HIT: { duration: 0.08, opacity: 0.30, color: '#FF0000' },  // v5.31: 0.04/0.15→0.08/0.30 (stronger flash)
                WAVE_START: { duration: 0.05, opacity: 0.25, color: '#FFFFFF' },
                MULTI_KILL: { duration: 0.08, opacity: 0.20, color: '#FFFFFF' },  // v4.5
                PERK_PICKUP: { duration: 0.10, opacity: 0.20, color: '#bb44ff' },       // v5.13: overridden per-element at runtime
                GODCHAIN_ACTIVATE: { duration: 0.15, opacity: 0.30, color: '#FFD700' }  // v5.13
            },

            // Master toggles for screen effects (modularity)
            SCREEN_EFFECTS: {
                // Master toggles (set false to disable entire category)
                SCREEN_SHAKE: true,            // ON — only fires on death (non-gameplay)
                SCREEN_FLASH: true,            // ON — granular control below
                HIT_STOP: true,                // ON — granular control via durations below

                // Gameplay flashes — OFF (perceived as lag during action)
                PLAYER_HIT_FLASH: false,       // Red flash when hit — OFF, replaced by vignette
                STREAK_FLASH: false,           // Flash on kill streaks — OFF
                GRAZE_FLASH: false,            // Flash on close graze — OFF
                SCORE_PULSE: false,            // Edge glow every 10k — OFF
                SCORE_FLOATING_TEXT: false,     // v5.14: floating "+500" text on kills — OFF (replaced by HUD pulse)
                SCREEN_DIMMING: false,         // Darken screen with many bullets — OFF

                // Non-gameplay flashes — ON (boss events, transitions)
                BOSS_DEFEAT_FLASH: true,       // White flash on boss kill
                BOSS_PHASE_FLASH: true,        // Orange flash on phase change
                HYPER_ACTIVATE_FLASH: true,    // Flash when HYPER activates

                // Mode-specific overlays — ON (tints, not interruptions)
                HYPER_OVERLAY: false,          // Golden tint during HYPER (disabled — obscures bullets)

                // v5.13: Elemental pickup/godchain flashes
                PERK_PICKUP_FLASH: true,
                GODCHAIN_ACTIVATE_FLASH: true,

                // Bear Market atmosphere
                LIGHTNING: true,               // Purple lightning flashes
                BEAR_VIGNETTE: true            // Pulsing red vignette
            },

            // Score pulse effect (screen edge glow on milestones)
            SCORE_PULSE: {
                THRESHOLD: 10000,         // Points between pulses
                SCALE: 1.015,             // Subtle zoom factor
                DURATION: 0.25,           // Pulse duration
                GLOW_COLOR: '#FFD700',    // Gold edge glow
                GLOW_SIZE: 30             // Pixels of edge glow
            },

            // v5.14: Score Pulse Tiers — HUD-reactive score feedback
            SCORE_PULSE_TIERS: {
                MICRO:     { threshold: 0,    scale: 1.0, duration: 0,    color: null,      shake: 0, glow: 0 },
                NORMAL:    { threshold: 100,  scale: 1.15, duration: 0.2, color: '#ffffff', shake: 0, glow: 0.3 },
                BIG:       { threshold: 500,  scale: 1.3, duration: 0.3, color: '#ffaa00', shake: 2, glow: 0.6 },
                MASSIVE:   { threshold: 2000, scale: 1.5, duration: 0.4, color: '#ff6600', shake: 4, glow: 0.8 },
                LEGENDARY: { threshold: 5000, scale: 1.8, duration: 0.5, color: '#ff3300', shake: 6, glow: 1.0 },
                ACCUMULATOR_DECAY: 0.4,  // seconds before combo accumulator resets
                ACCUMULATOR_MAX_BUMP: 2  // max tier bumps from rapid kills
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
        // All firing handled by HarmonicConductor with beat-synced sequences
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

            // v5.16: Salvo system — coordinated row-by-row fire with safe corridors
            SALVO: {
                // Time gap between bullet ARRIVALS at player zone (not fire time!)
                // Computed dynamically: fire_delay = travel_offset/bulletSpeed + arrivalGap
                ARRIVAL_GAP: [0.55, 0.40, 0.28],    // v5.16.1: C1 wider gaps for readable waves
                PLAYER_TARGET_Y: 680,                // Estimated player Y for travel time calc
                CORRIDOR_WIDTH: [80, 65, 50],        // Safe corridor px width per cycle
                SKIP_CHANCE: 0.15,                   // Per-enemy chance to skip (organic variation)
                MAX_ROWS: [2, 3, 4],                 // v5.16.1: Per-cycle cap (C1=2 readable, C3=4 dense)
                AIM_FACTOR: [0, 0.4, 0.7]            // v5.16.1: Band aim toward player (0=straight down, 1=full aimed)
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
            BASE: 30,                 // v5.18.2: 28→30 (+7%, slightly tankier baseline)
            SCALE: 40,                // v4.48: 30→40 (+33%, late waves tankier)
            CYCLE_MULT: [1.0, 2.5, 3.2]  // v4.48b: C2 2.5 (slows GODCHAIN carry-over to boss), C3 3.2 (compensates lighter BOJ)
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

        // --- ELITE ENEMY VARIANTS v5.32 ---
        ELITE_VARIANTS: {
            ENABLED: true,
            CYCLE_VARIANTS: { 1: 'ARMORED', 2: 'EVADER', 3: 'REFLECTOR' },
            ELIGIBLE_TIERS: ['MEDIUM', 'STRONG'],
            CHANCE: {
                STORY: [0.10, 0.15, 0.20],
                ARCADE: [0.15, 0.20, 0.25],
                BEAR_BONUS: 0.05
            },
            ARMORED: {
                ENABLED: true,
                HP_MULT: 2.0,
                SCORE_MULT: 2.0,
                SPEED_MULT: 0.8,
                SHEEN_COLOR: '#c0c8d0',
                SHEEN_ALPHA: 0.25,
                ICON_SIZE: 8
            },
            EVADER: {
                ENABLED: true,
                DETECT_RADIUS: 60,
                DASH_DISTANCE: 40,
                DASH_SPEED: 600,
                COOLDOWN: 2.0,
                LINE_ALPHA: 0.4,
                LINE_COUNT: 3
            },
            REFLECTOR: {
                ENABLED: true,
                CHARGES: 1,
                REFLECT_SPEED: 200,
                REFLECT_SPREAD: 0.3,
                SHIMMER_SPEED: 0.006,
                SHIMMER_ALPHA: 0.3,
                BROKEN_ALPHA: 0.08
            }
        },

        // --- ENEMY BEHAVIORS v5.32 (4 new combat behaviors) ---
        ENEMY_BEHAVIORS: {
            ENABLED: true,
            BEHAVIOR_RATE: 0.18,
            BEHAVIOR_RATE_ARCADE: 0.22,
            CAPS: { FLANKER: 4, BOMBER: 2, HEALER: 1, CHARGER: 3 },
            MIN_WAVE: { FLANKER: 3, BOMBER: 7, HEALER: 8, CHARGER: 7 },  // v6.5: BOMBER 6→7 (C2W2 not C2W1 — too aggressive at cycle opening)
            FLANKER: {
                ENABLED: true,
                ENTRY_SPEED: 250,
                FIRE_INTERVAL: 0.8,
                RUN_DURATION: 3.0,
                JOINS_FORMATION: true
            },
            BOMBER: {
                ENABLED: true,
                BOMB_COOLDOWN: 4.0,
                BOMB_SPEED: 80,
                ZONE_DURATION: 2.0,
                ZONE_RADIUS: 40,
                ZONE_COLOR: '#ff4400',
                ZONE_ALPHA: 0.25
            },
            HEALER: {
                ENABLED: true,
                AURA_RADIUS: 60,
                HEAL_RATE: 0.05,
                PULSE_INTERVAL: 1.0,
                AURA_COLOR: '#00ff88',
                AURA_ALPHA: 0.15
            },
            CHARGER: {
                ENABLED: true,
                CHARGE_INTERVAL: 5.0,
                WINDUP_TIME: 0.5,
                CHARGE_DISTANCE: 80,
                CHARGE_SPEED: 500,
                RETREAT_SPEED: 200,
                WINDUP_SHAKE: 2,
                FLASH_COLOR: '#ff2222'
            }
        },

        // --- STREAMING ENEMY FLOW v5.33 (Phase-Based) ---
        STREAMING: {
            PHASE_TRIGGER: {
                THRESHOLD_RATIO: 0.25,      // v6.5: 0.35→0.25 — trigger later, less overlap
                MIN_THRESHOLD: 3,           // At least 3 remaining to trigger
                MAX_THRESHOLD: 4,           // v6.5: 6→4 — max 4 old enemies when new phase arrives
                MIN_PHASE_DURATION: 3.0     // Minimum seconds before next phase can trigger
            },
            PHASE_ESCALATION: {
                FIRE_RATE_PER_PHASE: 0.05,      // v6.5: 0.10→0.05 — halved escalation per phase
                BEHAVIOR_BONUS_PER_PHASE: 0.05  // +5% behavior chance per phase index
            },
            MAX_CONCURRENT_ENEMIES: 18,     // v6.5: 22→18 — reduced visual chaos
            MAX_PER_PHASE: 14,              // v6.5: cap per single phase (14 + 4 overlap = 18 max)
            GRID_SETTLE_THRESHOLD: 0.5,     // Grid moves when >=50% settled
            FIRE_GRACE_AFTER_PHASE: 0.5     // Brief fire grace after new phase spawns
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
            START_Y: 130,             // v5.4.0: 80→130, clears HUD zone (enemy top edge at ~101px, below strip ~95px)
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
            PHASE_THRESHOLDS: [0.66, 0.20], // v5.0.4: P3 at 20% (was 33%) — shorter desperation phase
            PHASE_TRANSITION_TIME: 1.5,    // Seconds for phase transition
            DMG_DIVISOR: 2.5,              // v6.5: 4→3→2.5 — target 70-80s fights (93.9s still SLOW at 3)

            // HP scaling (applied before perk/damage modifiers)
            // v4.16: +25-40% boost — audit showed FED 12.7s, BCE 9.7s (target 45-75s)
            HP: {
                BASE: 2430,           // v5.31: 2700→2430 (-10%, C1 easier)
                PER_LEVEL: 100,       // v4.48: 65→100 (+54%, scaling livello più incisivo)
                PER_CYCLE: 5000,      // v4.48: 4000→5000 (+25%, gap tra cicli maggiore)
                PERK_SCALE: 0.10,     // +10% per player perk
                MIN_FLOOR: 2430       // v5.31: 3000→2430 (match new BASE)
            },

            // Movement speed per phase per boss type
            // Updated v2.18.0: Distinct movement personalities
            PHASE_SPEEDS: {
                FEDERAL_RESERVE: [70, 130, 170],  // v5.31: P3 200→170 (-15%, less aggressive)
                BCE: [35, 55, 77],                // v5.31: P3 90→77 (-15%)
                BOJ: [45, 75, 136]                // v5.31: P3 160→136 (-15%)
            },

            // Fire rate per phase (seconds between attacks, lower = faster)
            // v5.31: P3 fire rates ×1.15 (slower)
            FIRE_RATES: {
                FEDERAL_RESERVE: [0.77, 0.42, 0.25],  // v5.31: P3 0.22→0.25
                BCE: [1.40, 0.70, 0.40],              // v5.31: P3 0.35→0.40
                BOJ: [0.90, 0.45, 0.21]               // v5.31: P3 0.18→0.21
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
                        SINE: { count: 10, width: 350, amplitude: 25, speed: 150 },
                        BURST: { count: 4, speed: 180, spread: 0.3 }  // v5.0.4: 3rd pattern — aimed burst at player
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
                        BARRIER: { count: 20, radius: 70, speed: 50, gapAngle: 1.047, rotationSpeed: 1.2 },
                        FLOWER: { petals: 6, bulletsPerPetal: 2, speed: 100 }  // v5.0.4: 3rd pattern — EU star burst
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
                        ZEN: { arms: 2, bulletsPerArm: 1, speed: 110 },
                        RING: { count: 10, speed: 100, size: 9 }  // v5.0.4: 3rd pattern — zen concentric ring
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
            },
            COMBAT_SUPPRESSION: true,         // Suppress memes during active combat
            WAVE_GRACE_PERIOD: 2.0            // Seconds after wave start where memes are visible
        },

        // --- MESSAGE STRIP v4.26.0 ---
        MESSAGE_STRIP: {
            ENABLED: true,
            PRIORITIES: { DANGER: 3, VICTORY: 3, PICKUP: 2, WAVE: 2, INFO: 1 },
            DURATIONS: { DANGER: 2500, VICTORY: 3000, PICKUP: 1500, WAVE: 2500, INFO: 2000 },
            COOLDOWN: 300,
            MAX_QUEUE_SIZE: 3,
            ENTRANCE_MS: 200,
            EXIT_MS: 300,
            DROP_LOW_PRIORITY: true           // Drop low-pri messages when high-pri is active
        },

        // --- TIMING SYSTEM (all durations in seconds unless noted) ---
        TIMING: {
            // State transitions
            SPLASH_TIMEOUT: 4.0,           // Video splash screen max duration
            INTERMISSION_DURATION: 3.2,    // Between waves (3-2-1 countdown, ceil(3.2)=4 but we cap at 3)
            BOSS_CELEBRATION_DELAY: 7.5,   // v6.5: 5→7.5s — 2.7s viewing post-evolution (item 2.8s + fly 1.2s + deploy 0.8s = 4.8s)
            INTERMISSION_BOSS_DURATION: 6.0, // Boss defeat intermission (skippable)
            DEATH_DURATION: 2.0,           // Death sequence length
            INVULNERABILITY: 2.1,          // Post-hit protection

            // v5.27: Game start countdown
            START_COUNTDOWN: 3.0,        // 3→2→1 duration (seconds)
            START_COUNTDOWN_GO: 0.5,     // GO! flash duration

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
                BOSS_DEFEAT: 80,
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
        // WAVE_STRIP: Minimal full-width strip for wave info
        // ALERT: Colored center box (danger=red, victory=gold)
        // MEME_WHISPER: Tiny italic canvas text, decorative flavor
        // SHIP_STATUS: Icon+text above player ship
        // FLOATING_TEXT: Opt-in score numbers
        HUD_MESSAGES: {
            WAVE_STRIP: true,             // Wave strip (replaces GAME_INFO)
            ALERT_DANGER: true,           // Boss warnings, danger messages
            ALERT_VICTORY: true,          // Boss defeated, achievements
            MEME_WHISPER: true,           // Small decorative meme text (replaces MEME_POPUP)
            SHIP_STATUS: false,           // Replaced by PICKUP toast in message strip
            FLOATING_TEXT: false,         // Damage numbers (opt-in, can clutter)
            PERK_NOTIFICATION: false,     // Replaced by PICKUP toast in message strip

            // Wave strip config
            WAVE_STRIP_CONFIG: {
                Y: 95,                    // Y position (below compact HUD)
                HEIGHT: 28,               // Strip height
                FONT_SIZE: 16,            // Primary text size (v5.7: was 14)
                SUBTITLE_SIZE: 12,        // Flavor text size (v5.7: was 10)
                DURATION: 2.5,            // Display duration (seconds)
                BG_ALPHA: 0.5             // Background opacity
            },

            // Meme whisper config
            MEME_WHISPER_CONFIG: {
                MAX_ON_SCREEN: 2,         // Max simultaneous whispers
                FONT_SIZE: 15,            // Italic font size (v5.7: was 13)
                ALPHA: 0.35,              // Starting opacity (v4.12: was 0.45, less distracting)
                DRIFT_SPEED: 15,          // Upward drift px/s
                LIFETIME: 3.0,            // Seconds to live
                SPAWN_Y_RATIO: 0.25       // Y spawn = gameHeight * this (v4.12: was 0.60, moved to top-quarter)
            },

            // Ship status config
            SHIP_STATUS_CONFIG: {
                Y_OFFSET: -60,            // Above player
                FONT_SIZE: 13,            // Text size (v5.7: was 11)
                DURATION: 2.0,            // Display duration
                ICON_SIZE: 16             // Icon size
            },

            // HYPER UI v5.4.0 — simplified idle/cooldown display
            HYPER_UI: {
                SHOW_TEXT_WHEN_IDLE: false, // Kill-switch: true → legacy text labels
                IDLE_BAR_HEIGHT: 4,
                IDLE_BAR_WIDTH: 160
                // Y position derived dynamically from message-strip DOM position
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
                ENABLED: false,  // v5.28: Disabled — ship is large enough, pips add visual clutter
                Y_OFFSET: 34,            // Below ship center (v5.9: 28→34 chevron)
                RADIUS: 4,               // Pip circle radius
                SPACING: 12,             // Between pips
                FULL_ALPHA: 0.7,         // Filled pip opacity
                EMPTY_ALPHA: 0.25        // Empty pip opacity
            },
            SHIELD_RING: {
                ENABLED: false,          // v5.10: replaced by SHIELD_FIN_GLOW
                RADIUS: 45,
                COOLDOWN_ALPHA: 0.15,
                READY_ALPHA: 0.35,
                READY_PULSE_SPEED: 4,
                READY_PULSE_AMP: 0.15,
                LINE_WIDTH: 2
            },
            SHIELD_FIN_GLOW: {
                ENABLED: true,
                COOLDOWN_ALPHA: 0.35,    // Max alpha during cooldown fill
                READY_ALPHA: 0.6,        // Base alpha when ready
                READY_PULSE_SPEED: 4,    // rad/s pulsing
                READY_PULSE_AMP: 0.2,    // ±alpha oscillation
                GLOW_SPREAD: 10          // px blur/spread around fin edges (v5.28: 6→10)
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

        // --- BULLET PIERCE (Player bullets survive multiple enemy-bullet hits) ---
        BULLET_PIERCE: {
            BASE_HP: 1,            // Each base bullet passes through 1 enemy bullet
            LEVEL_BONUS: 0.5,      // +0.5 per weapon level (LV5 = +2)
            MISSILE_HP: 3,         // Missiles are tougher
        },

        // --- PROXIMITY KILL METER (replaces graze as meter source) ---
        PROXIMITY_KILL: {
            MAX_DISTANCE: 600,     // v4.40: 450→600, covers full play field with top-heavy formations
            CLOSE_DISTANCE: 150,   // Vertical distance for max meter gain
            METER_GAIN_MAX: 7,     // Meter gain at close distance
            METER_GAIN_MIN: 1,     // Meter gain at max distance
            BOSS_PHASE_GAIN: 15,   // Gain per boss phase completed
            BOSS_HIT_GAIN: 0.15,   // v4.40: 0.4→0.15, gradual meter build during boss (prevents sudden HYPER)
            HYPER_KILL_EXTENSION: 0, // v4.60: disabled (was 0.4, HYPER is now fixed duration)
        },

        // --- BULLET CONFIG v4.22 (Centralized bullet parameters) ---
        BULLET_CONFIG: {
            // Player bullets
            PLAYER_NORMAL:  { speed: 765, collisionRadius: 6, piercing: false, explosion: null }, // v5.9: 5→6
            PLAYER_HOMING:  { speed: 459, collisionRadius: 6, piercing: false, explosion: null },   // 765*0.6
            PLAYER_PIERCE:  { speed: 765, collisionRadius: 5, piercing: true,  explosion: null },
            PLAYER_MISSILE: { speed: 536, collisionRadius: 7, piercing: false,                      // 765*0.7
                explosion: { radius: 35, damage: 1.2, knockback: 60, particles: 12, shake: 6 }  // v4.45: nerfed AoE 50→35, dmg 1.5→1.2
            },
            // Enemy bullets (all shapes)
            ENEMY_DEFAULT:  { speed: null, collisionRadius: 4, piercing: false, explosion: null },
            // Boss patterns
            BOSS_PATTERN:   { speed: null, collisionRadius: 8, piercing: false, explosion: null }, // v5.10.3: 5→8 (44% of visual r=18)
            // Collision targets
            ENEMY_HITBOX_RADIUS: 29,     // Half of 58px enemy size (v4.25)
            PLAYER_CORE_RADIUS: 8        // Default, overridden by stats.coreHitboxSize (v5.9: 6→8)
        },

        // --- BULLET CANCEL (v6.5: player-vs-enemy bullet cancellation radius boost) ---
        BULLET_CANCEL: {
            RADIUS_MULT: 1.8              // v6.5: +80% cancel radius — matches visual bullet size
        },

        // --- HITBOX / COLLISION ---
        HITBOX: {
            PLAYER_OUTER_BONUS: 15,       // Added to ship hitboxSize for outer collision
            PLAYER_CORE_DEFAULT: 10,      // Default core hitbox if not in ship stats (v5.28: 8→10 premium)
            PLAYER_OUTER_DEFAULT: 48,     // Default outer hitbox if not in ship stats (v5.28: swept-back)
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

        // --- WEAPON EVOLUTION SYSTEM (v5.11 Boss Evolution Redesign) ---
        // 3-level weapon progression (permanent, no death penalty)
        // Upgrades ONLY from boss kills (Evolution Core item)
        // HYPER adds +2 temporary levels (max effective LV5)
        // Specials: 3 weapon types (HOMING/PIERCE/MISSILE), exclusive, 8s
        // Utilities: SHIELD/SPEED (separate non-weapon drops)
        WEAPON_EVOLUTION: {
            // Weapon levels (permanent for entire run — no death penalty)
            MAX_WEAPON_LEVEL: 3,
            KILLS_FOR_PERK: 100,          // v5.25: 70→100 (slower perk drops)

            // HYPER mode weapon boost
            HYPER_LEVEL_BOOST: 2,         // +2 weapon levels during HYPER (max effective LV5)

            // Level table: stats lookup by weapon level (1-5)
            // LV 4-5 only reachable during HYPER
            LEVELS: {
                1: { name: 'Single',     bullets: 1, cooldownMult: 0.70, damageMult: 1.20, spreadDeg: 0 },
                2: { name: 'Dual',       bullets: 2, cooldownMult: 0.85, damageMult: 1.30, spreadDeg: 0 },
                3: { name: 'Triple MAX', bullets: 3, cooldownMult: 0.65, damageMult: 1.70, spreadDeg: 6 },
                // HYPER-only levels (not reachable without HYPER):
                4: { name: 'HYPER+',     bullets: 3, cooldownMult: 0.45, damageMult: 2.00, spreadDeg: 10 },
                5: { name: 'HYPER++',    bullets: 3, cooldownMult: 0.30, damageMult: 2.25, spreadDeg: 12 }
            },

            // v4.48: Missile optimization — fewer projectiles, more damage
            MISSILE_BULLET_DIVISOR: 2,   // floor(bullets / divisor), min 1
            MISSILE_DAMAGE_BONUS: 2.0,   // stacked on damageMult

            // Special duration (HOMING/PIERCE/MISSILE)
            SPECIAL_DURATION: 8,              // v5.25: 12→8

            // Utility duration (SHIELD/SPEED)
            UTILITY_DURATION: 8,              // v5.25: 12→8

            // Death penalty
            DEATH_PENALTY: 0,             // v5.11: No weapon loss on death (evolution is permanent)

            // Speed utility effect
            SPEED_MULTIPLIER: 1.4,        // Movement speed during SPEED utility

            // PIERCE penetration tuning (v5.0.8)
            PIERCE_DECAY: {
                DAMAGE_MULT: 0.65,    // damageMult multiplied by this after each enemy pierced
                MAX_ENEMIES: 5        // max enemies a single pierce bullet can pass through
            },

            // Drop weights for specials (weapon-type only)
            SPECIAL_WEIGHTS: {
                HOMING: 25,
                PIERCE: 25,
                MISSILE: 20
            }
        },

        // --- DROP SCALING ---
        // v4.17: Fixed drop rate to prevent power-up flood (62/run → target 30-40)
        DROP_SCALING: {
            // Per-cycle bonus to drop chance
            CYCLE_BONUS: 0,              // v4.17: 0.5%→0 (flat rate, no cycle scaling)

            // Pity timer decreases with cycle
            PITY_BASE: 30,              // v5.15.1: 40→30 (general drop every ~30 kills, ~18s)
            PITY_REDUCTION: 2,          // -2 kills per cycle (min 15) (v4.17: 3→2)
            // v4.57: Early drop at level 2 start — pity counter pre-filled so first drop comes after ~8 kills
            EARLY_DROP_LEVEL: 1,        // v5.15.1: 2→1 (prefill from game start, not level 2)
            EARLY_DROP_PREFILL: 32,     // v5.15.1: 25→32 (primo drop dopo ~15 kills, inizio W1H1)
            GUARANTEED_SPECIAL_WAVE: 4  // v5.18: From wave 4+, force SPECIAL if none dropped this cycle
        },

        // --- ADAPTIVE DROPS v4.47 (Redesigned) ---
        // Dynamic suppression based on player power state
        ADAPTIVE_DROPS: {
            ENABLED: true,
            // Power score weights (sum = 1.0) — 2-axis: weapon + special
            WEAPON_WEIGHT: 0.65,        // Weight of weapon level in power score
            SPECIAL_WEIGHT: 0.35,       // Weight of special in power score
            // Suppression
            SUPPRESSION_FLOOR: 0.50,    // Below this power score, no suppression
            // Need-based category selection weights
            CATEGORY_WEIGHTS: {
                UPGRADE: 1.5,           // Base weight for weapon upgrade need
                SPECIAL: 1.0,           // Base weight for special need
                UTILITY: 0.8,           // Base weight for utility need
                PERK: 1.2              // v4.61: Base weight for elemental perk need
            },
            MIN_CATEGORY_WEIGHT: 0.05   // Minimum weight to prevent zero-chance
        },

        // --- ADAPTIVE POWER CALIBRATION v4.59 ---
        // Adjusts enemy HP and drop pity based on player power at cycle start (C2+)
        ADAPTIVE_POWER: {
            ENABLED: true,
            WEIGHTS: { WEAPON: 0.50, PERKS: 0.30, SPECIAL: 0.20 },
            HP_FLOOR: 0.85,              // hpMult at powerScore=0 (weakest player)
            HP_RANGE: 0.50,              // hpMult = FLOOR + powerScore * RANGE → max 1.35
            PITY_BONUS_WEAK: -10,        // Kills reduction on pity timer if weak
            PITY_PENALTY_STRONG: 5,      // Kills increase on pity timer if strong
            WEAK_THRESHOLD: 0.30,        // Below this = weak player
            STRONG_THRESHOLD: 0.60       // Above this = strong player
        },

        // --- ADAPTIVE DROP BALANCER v5.19 ---
        // Bidirezionale: boost per deboli, soppressione per dominanti
        // Zero costo per-frame: logica solo su kill event
        ADAPTIVE_DROP_BALANCER: {
            ENABLED: true,

            // --- STRUGGLE (boost drop per deboli) ---
            STRUGGLE: {
                TIME_THRESHOLD: 40,        // s senza drop → attiva boost
                FORCE_THRESHOLD: 55,       // s senza drop → drop forzato
                ACTIVITY_WINDOW: 8,        // kill entro Ns = attivo (anti-AFK)
                MIN_KILLS_SINCE_DROP: 5,   // minimo kill per triggerare
                POWER_CEILING: 0.40,       // solo power score ≤ questo
                CHANCE_BOOST: 3.0,         // 3× drop chance
                CATEGORY_BIAS: { SPECIAL: 0.55, PERK: 0.35, UTILITY: 0.10 },
                CYCLE_REDUCTION: 5,        // -5s/ciclo (C2: 35s, C3: 30s)
            },

            // --- DOMINATION (limita per dominanti) ---
            DOMINATION: {
                KILL_RATE_THRESHOLD: 1.5,  // kills/sec per attivare
                KILL_RATE_WINDOW: 10,      // ultimi N kill per calcolo rate
                POWER_FLOOR: 0.60,         // solo power score ≥ questo
                CHANCE_MULT: 0.25,         // drop chance ×0.25 (75% riduzione)
                PITY_MULT: 2.0,            // pity threshold ×2 (30→60 kill)
                HYPER_SUPPRESS: true,      // soppressione automatica durante HYPER
                GODCHAIN_SUPPRESS: true,   // soppressione automatica durante GODCHAIN
            },

            // --- POST DEATH (grace period) ---
            POST_DEATH: {
                THRESHOLD: 25,             // soglia struggle ridotta
                MIN_KILLS: 3,              // solo 3 kill richieste
                WINDOW: 60,               // grace per 60s dopo morte
            },

            // --- ARCADE MODE ---
            ARCADE_MULT: 0.85,             // soglie struggle ×0.85 in arcade
        },

        // --- WAVES ---
        WAVES: {
            PER_CYCLE: 5,                 // Waves before boss appears
            ENEMY_FIRE_TIMER: 0.5,        // Base timer for enemy fire phase
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

            // v4.6.1: Cycle-based enemy count multiplier (player is stronger in later cycles)
            // v4.18: +20% C1, +10% C2, +5% C3 — slow down early cycles, more targets to clear
            CYCLE_COUNT_MULT: [1.0, 1.25, 1.45],  // v4.40: C2 1.375→1.25, C3 1.575→1.45 — reduce enemy count inflation

            // Bear Market scaling
            BEAR_MARKET: {
                COUNT_MULT: 1.25,           // +25% enemies
                FORCE_STRONG: true          // Force strong enemies in mix
            },

            // Wave definitions: Phase-based streaming (v6.2: all waves 3 phases)
            // Each wave has phases[] — each phase is an independent formation
            // Phases spawn when previous is ~35% cleared (PHASE_TRIGGER config)
            WAVES: [
                // === CYCLE 1: "AWAKENING" (Tutorial — simple formations, 3 phases) ===
                {
                    cycle: 1, wave: 1, name: 'First Contact',
                    phases: [
                        { count: 14, formation: 'RECT', currencies: ['¥', '₽', '₹'] },
                        { count: 12, formation: 'RECT', currencies: ['¥', '₽', '₹'] },
                        { count: 12, formation: 'WALL', currencies: ['¥', '₽', '₹'] }
                    ]
                },
                {
                    cycle: 1, wave: 2, name: 'European Dawn',
                    phases: [
                        { count: 15, formation: 'WALL', currencies: ['¥', '₽', '€'] },
                        { count: 13, formation: 'ARROW', currencies: ['₹', '£'] },
                        { count: 12, formation: 'RECT', currencies: ['€', '₽', '₹'] }
                    ]
                },
                {
                    cycle: 1, wave: 3, name: 'Old World',
                    phases: [
                        { count: 16, formation: 'ARROW', currencies: ['€', '£', '₣'] },
                        { count: 14, formation: 'RECT', currencies: ['₺', '€', '£'] },
                        { count: 13, formation: 'WALL', currencies: ['₣', '€', '₺'] }
                    ]
                },
                {
                    cycle: 1, wave: 4, name: 'Dollar Emerges',
                    phases: [
                        { count: 17, formation: 'WALL', currencies: ['€', '₣', '$'] },
                        { count: 15, formation: 'WALL', currencies: ['£', '₺', '元'] },
                        { count: 14, formation: 'RECT', currencies: ['€', '$', '元'] }
                    ]
                },
                {
                    cycle: 1, wave: 5, name: 'Global Alliance',
                    phases: [
                        { count: 18, formation: 'WALL', currencies: ['¥', '€', '$', '元'] },
                        { count: 16, formation: 'RECT', currencies: ['₽', '£', '₣', 'Ⓒ'] },
                        { count: 15, formation: 'WALL', currencies: ['$', 'Ⓒ', '元'] }
                    ]
                },

                // === CYCLE 2: "CONFLICT" (Learning — varied formations, 3 phases) ===
                {
                    cycle: 2, wave: 1, name: 'Eastern Front',
                    phases: [
                        { count: 16, formation: 'RECT', currencies: ['¥', '元', '₹'] },
                        { count: 14, formation: 'WALL', currencies: ['¥', '元', '₽'] },
                        { count: 12, formation: 'RECT', currencies: ['₹', '元', '¥'] }
                    ]
                },
                {
                    cycle: 2, wave: 2, name: 'Brussels Burns',
                    phases: [
                        { count: 17, formation: 'CHEVRON', currencies: ['€', '₣', '£'] },
                        { count: 15, formation: 'PINCER', currencies: ['€', '₣', '₺'] },
                        { count: 13, formation: 'WALL', currencies: ['€', '£', '₣'] }
                    ]
                },
                {
                    cycle: 2, wave: 3, name: 'Reserve War',
                    phases: [
                        { count: 18, formation: 'WALL', currencies: ['$', '€', '£'] },
                        { count: 16, formation: 'FORTRESS', currencies: ['$', '元', 'Ⓒ'] },
                        { count: 14, formation: 'RECT', currencies: ['$', '€', 'Ⓒ'] }
                    ]
                },
                {
                    cycle: 2, wave: 4, name: 'BRICS Rising',
                    phases: [
                        { count: 18, formation: 'ARROW', currencies: ['₽', '₹', '₺', '$'] },
                        { count: 15, formation: 'WALL', currencies: ['元', 'Ⓒ', '$'] },
                        { count: 12, formation: 'CHEVRON', currencies: ['₽', '₹', '元'] }
                    ]
                },
                {
                    cycle: 2, wave: 5, name: 'Final Stand',
                    phases: [
                        { count: 18, formation: 'FORTRESS', currencies: ['$', '元', 'Ⓒ', '€'] },
                        { count: 16, formation: 'WALL', currencies: ['$', '元', 'Ⓒ', '₣'] },
                        { count: 14, formation: 'ARROW', currencies: ['Ⓒ', '$', '€'] }
                    ]
                },

                // === CYCLE 3: "RECKONING" (Skilled — complex formations, 3 phases) ===
                {
                    cycle: 3, wave: 1, name: 'Digital Doom',
                    phases: [
                        { count: 18, formation: 'VORTEX', currencies: ['Ⓒ', '€', '$'] },
                        { count: 16, formation: 'HURRICANE', currencies: ['Ⓒ', '元', '£'] },
                        { count: 14, formation: 'WALL', currencies: ['Ⓒ', '$', '元'] }
                    ]
                },
                {
                    cycle: 3, wave: 2, name: 'Pincer Attack',
                    phases: [
                        { count: 20, formation: 'FLANKING', currencies: ['$', '元', 'Ⓒ'] },
                        { count: 18, formation: 'SPIRAL', currencies: ['€', '£', '₣', '$'] },
                        { count: 16, formation: 'WALL', currencies: ['Ⓒ', '$', '€'] }
                    ]
                },
                {
                    cycle: 3, wave: 3, name: 'Escalation',
                    phases: [
                        { count: 20, formation: 'STAIRCASE', currencies: ['¥', '₽', '₹', '€', '£', '₣', '₺', '$', '元', 'Ⓒ'] },
                        { count: 18, formation: 'STAIRCASE_REVERSE', currencies: ['$', '元', 'Ⓒ', '₺', '₣', '£', '€', '₹', '₽', '¥'] },
                        { count: 14, formation: 'WALL', currencies: ['$', '元', 'Ⓒ'] }
                    ]
                },
                {
                    cycle: 3, wave: 4, name: 'Eye of Storm',
                    phases: [
                        { count: 22, formation: 'HURRICANE', currencies: ['¥', '₽', '₹', '€', '£', '₣', '₺', '$', '元', 'Ⓒ'] },
                        { count: 20, formation: 'VORTEX', currencies: ['$', '元', 'Ⓒ'] },
                        { count: 16, formation: 'FORTRESS', currencies: ['Ⓒ', '$', '€'] }
                    ]
                },
                {
                    cycle: 3, wave: 5, name: 'Endgame',
                    phases: [
                        { count: 22, formation: 'FINAL_FORM', currencies: ['$', '元', 'Ⓒ', '€', '£', '₣'] },
                        { count: 20, formation: 'FINAL_FORM', currencies: ['Ⓒ', 'Ⓒ', 'Ⓒ', '$', '元'] },
                        { count: 18, formation: 'WALL', currencies: ['Ⓒ', '$', '元'] }
                    ]
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

                // Currency symbol formations (cycle 4+)
                BTC_SYMBOL:  { generator: 'generateBtcSymbol' },
                DOLLAR_SIGN: { generator: 'generateDollarSign' },
                EURO_SIGN:   { generator: 'generateEuroSign' },
                YEN_SIGN:    { generator: 'generateYenSign' },
                POUND_SIGN:  { generator: 'generatePoundSign' },

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
            START_Y: 130,             // v5.4.0: 80→130, clears HUD zone (enemy top edge at ~101px, below strip ~95px)
            MARGIN: 60,               // Left/right margin for scatter/wall
            MAX_Y_RATIO: 0.55,        // v4.37: 0.65→0.55, enemies don't descend past 55% — more breathing room
            MAX_Y_RATIO_BY_CYCLE: [0.42, 0.50, 0.58],  // v6.2: C1 0.48→0.42 (shallower formations)
            MAX_Y_PIXEL: 500,         // v4.48: absolute Y cap (prevents overflow on tall screens)
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
            START_Y_RESPONSIVE: false // v5.4.0: disabled — HUD zone is fixed-pixel, startY must not scale down
        },

        // --- ENEMY FORMATION ENTRY ---
        FORMATION_ENTRY: {
            ENABLED: true,                // Enable formation entry animation
            ENTRY_SPEED: 600,             // Pixels per second during entry
            STAGGER_DELAY: 0.04,          // Seconds between each enemy starting entry
            SPAWN_Y_OFFSET: -80,          // Y offset above screen for spawning
            SETTLE_TIME: 0.3,             // Seconds to settle after reaching position
            CURVE_INTENSITY: 0.15,        // How much enemies curve during entry (0-1)
            // Entry path types with weighted random selection
            PATHS: {
                SINE:   { weight: 3 },    // Default sine curve entry (from top)
                SWEEP:  { weight: 2 },    // Enter from left or right side
                SPIRAL: { weight: 1 },    // Spiral descent from center
                SPLIT:  { weight: 2 }     // Two groups from opposite sides
            }
        },

        // --- VFX SYSTEM v4.5 (Game Feel Overhaul) ---
        VFX: {
            // Enemy hit reaction
            HIT_FLASH_DURATION: 0.04,         // Seconds of white flash on hit
            HIT_SHAKE_INTENSITY: 2,           // Max px offset on hit
            HIT_SHAKE_DURATION: 0.06,         // Seconds of shake
            // Bullet impact sparks (contextual)
            SPARK_COUNT_BASE: 4,              // Particles at shot level 1
            SPARK_COUNT_PER_LEVEL: 2,         // +2 per shot level
            SPARK_POWER_SCALE: 1.5,           // Size mult with POWER modifier
            SPARK_KILL_RING: true,            // Expanding ring on kill hit
            SPARK_HYPER_RING: false,          // Golden ring during HYPER (disabled — clean readability)

            // Muzzle flash evolution (legacy — kept for compat)
            MUZZLE_SCALE_PER_LEVEL: 0.4,
            MUZZLE_POWER_SCALE: 1.3,
            MUZZLE_RATE_SCALE: 0.6,
            MUZZLE_RING_AT_LEVEL: 3,

            // v5.2: Weapon deployment animation (mechanical slide-out)
            WEAPON_DEPLOY: {
                ENABLED: true,
                DURATION: 0.35,             // Animation duration (s)
                LOCK_AT: 0.85,              // Shake + audio lock at this % of progress
                SHAKE_INTENSITY: 6,         // Screen shake at lock-in (px)
                HITSTOP: true,              // v5.11: Kill-switch for cinematic upgrade effects
                UPGRADE_SHAKE: 10,          // v5.11: Shake intensity on evolution collect
                // v5.20: Cinematic deploy VFX
                FLASH_DURATION: 0.2,        // White flash pulse (s)
                FLASH_ALPHA: 0.6,           // Max flash opacity
                BRIGHTEN_AMOUNT: 0.3,       // Ship brightness boost during deploy
                BURST_PARTICLES: 14,        // Energy burst particle count
                AURA_PULSE_DURATION: 0.3,   // Post-deploy expanding ring (s)
                AURA_PULSE_RADIUS: 50,      // Max ring radius (px)
                // v5.28: Energy Surge — cinematic transform per weapon transition
                ENERGY_SURGE: {
                    DEPLOY_DURATION: [0.8, 0.8, 1.0],   // Duration per transition [mount, LV2, LV3]
                    SLOWDOWN_SCALE: [1.0, 0.7, 0.6],    // Game speed during surge
                    SLOWDOWN_DURATION: [0, 0.6, 0.8],   // How long slowmo lasts
                    BRIGHTEN_PEAK: [0.3, 0.5, 0.7],     // Ship brighten amount
                    BRIGHTEN_ENABLED: false,             // v5.31: kill-switch for white bubble
                    SHOCKWAVE_RADIUS: [0, 60, 80],       // Expanding shockwave ring
                    INVULN_FRAMES: 0.5,                  // Brief invulnerability (s)
                },
            },

            // v5.11: Boss death cinematic sequence
            BOSS_DEATH: {
                CHAIN_EXPLOSIONS: 6,
                CHAIN_TIMES: [0.0, 0.4, 0.8, 1.3, 1.8, 2.5],
                CHAIN_OFFSETS: [[0,0], [-50,-30], [40,20], [-30,40], [50,-20], [0,10]],
                CHAIN_SCALE: [1.0, 0.8, 0.9, 1.0, 1.1, 1.5],
                COIN_RAIN: {
                    ENABLED: true,
                    COUNT: 25,
                    SPAWN_DURATION: 1.5,
                    START_DELAY: 0.3,
                    FALL_SPEED: { MIN: 60, MAX: 120 },
                    WOBBLE: { SPEED: 3, AMOUNT: 30 },
                    LIFE: 3.0,
                    SYMBOLS: ['$', '€', '¥', '£', '₿'],
                    COLORS: ['#FFD700', '#ffaa00', '#00ff66', '#fff']
                },
                EVOLUTION_ITEM: {
                    SPAWN_DELAY: 2.8,
                    FLY_DURATION: 1.2,
                    SIZE: 28,
                    GLOW_COLOR: '#00f0ff',
                    TRAIL_PARTICLES: 8
                }
            },

            // v5.1: Directional muzzle flash (canvas + particles)
            MUZZLE_FLASH: {
                ENABLED: true,                    // Kill-switch for canvas V-flash
                BASE_WIDTH: 8,                    // V-flash half-width (v5.9: 7→8)
                BASE_HEIGHT: 20,                  // V-flash height (v5.9: 18→20)
                LEVEL_SCALE: 0.12,                // +12% size per weapon level

                // Color palettes [inner, mid, outer]
                COLORS_BASE:      ['#ffffff', '#ffcc44', '#ff8c00'],
                COLORS_FIRE:      ['#ffffff', '#ff6622', '#ff4400'],
                COLORS_LASER:     ['#ffffff', '#66ddff', '#00f0ff'],
                COLORS_ELECTRIC:  ['#ffffff', '#aa77ff', '#8844ff'],
                COLORS_GODCHAIN:  ['#ffffff', '#ff8833', '#ff4400'],

                // Shape modifiers per elemental
                FIRE_WIDTH_MULT: 1.4,             // Wider fire flash
                LASER_HEIGHT_MULT: 1.5,           // Taller laser flash
                LASER_WIDTH_MULT: 0.7,            // Narrower laser flash
                ELECTRIC_SIDE_SPARKS: 2,          // Side spark count
                GODCHAIN_TONGUE_COUNT: 3,         // Oscillating fire tongues
            },

            // Muzzle spark particles (reduced — canvas flash carries visual weight)
            MUZZLE_SPARK_BASE: 2,                 // Base spark count
            MUZZLE_SPARK_PER_LEVEL: 1,            // +1 per weapon level
            MUZZLE_SPARK_SPREAD: 0.3,             // Radians spread (tight cone)
            MUZZLE_TRACER_PER_BARREL: 1,          // White tracer per fire point
            MUZZLE_TRACER_SPEED: 400,             // Tracer speed (px/s)
            MUZZLE_TRACER_LIFE: 0.10,             // Tracer lifetime (s)
            MUZZLE_TRACER_SIZE: 2.5,              // Tracer radius

            // Explosion tiers
            EXPLOSION_WEAK: { particles: 6, ringCount: 1, duration: 0.30, debrisCount: 2 },
            EXPLOSION_MEDIUM: { particles: 10, ringCount: 1, duration: 0.40, debrisCount: 4 },
            EXPLOSION_STRONG: { particles: 14, ringCount: 2, duration: 0.55, debrisCount: 6, flash: true },

            // v5.15: Cyber Destruction VFX
            ENEMY_DESTROY: {
                ENABLED: true,
                RECT_FRAGMENTS: {
                    ENABLED: true,
                    WIDTH_MIN: 3, WIDTH_MAX: 8,
                    HEIGHT_MIN: 2, HEIGHT_MAX: 5,
                    ROT_SPEED_MIN: 5, ROT_SPEED_MAX: 15
                },
                ELEMENTAL_TINT: {
                    ENABLED: true,
                    FIRE: '#ff4400', LASER: '#00f0ff', ELECTRIC: '#8844ff',
                    TINT_RATIO: 0.6
                },
                SFX: {
                    ENABLED: true,
                    WEAK:   { VOLUME: 0.08, DURATION: 0.08 },
                    MEDIUM: { VOLUME: 0.10, DURATION: 0.12 },
                    STRONG: { VOLUME: 0.14, DURATION: 0.18 },
                    ELEM_LAYER: { ENABLED: true, VOLUME: 0.06, DURATION: 0.15 }
                }
            },

            // v5.31: Energy Skin — shield conforms to ship body instead of hex bubble
            ENERGY_SKIN: {
                ENABLED: true,
                COLLISION_RADIUS: 35,       // Shield bullet destroy radius (px)
                OUTER_STROKE: 8,
                MID_STROKE: 4,
                CORE_STROKE: 1.5,
                FILL_ALPHA: 0.08,
                SPARK_COUNT: 3,
                SPARK_SPEED: 1.2,           // Revolutions per second along perimeter
                SPARK_RADIUS: 3,
                WARN_TIME: 1.5,             // Warning blink in last N seconds
            },

            // v5.31: Energy Link Beam — horizontal beam between LV2 paired bullets
            ENERGY_LINK: {
                ENABLED: true,
                ALPHA: 0.3,
                WIDTH: 2,
                COLLISION_RADIUS: 4,        // Enemy bullet cancel radius around link line
            },

            // v5.31: HYPER Aura Rework — speed lines + timer bar + body glow (no circles)
            HYPER_AURA: {
                ENABLED: true,
                SPEED_LINES: {
                    ENABLED: true,
                    COUNT: 8,             // Number of speed lines
                    MIN_LENGTH: 15,
                    MAX_LENGTH: 35,
                    SPEED: 300,           // Pixels/sec downward
                    SPREAD: 30,           // Horizontal spread from ship center
                    WIDTH: 2,
                    ALPHA: 0.7,
                },
                TIMER_BAR: {
                    ENABLED: true,
                    WIDTH: 40,
                    HEIGHT: 3,
                    OFFSET_Y: 32,         // Below ship center
                    WARN_RATIO: 0.3,      // Turn red below this
                },
                BODY_GLOW: {
                    ENABLED: true,
                    RADIUS: 35,
                    ALPHA: 0.25,
                },
            },

            // v5.30: Ship Flight Dynamics — sense of flight with 5 complementary effects
            SHIP_FLIGHT: {
                ENABLED: true,
                BANKING: {
                    ENABLED: true,
                    MAX_ANGLE: 0.22,      // ~12.6° in radians
                    LERP_SPEED: 8,        // Interpolation speed toward bank
                    RETURN_SPEED: 5,      // Return to neutral (slower = floaty)
                    VX_DIVISOR: 420,      // Normalize vx: angle = vx/DIVISOR * MAX_ANGLE
                    BULLET_FOLLOW: 0.5,   // v5.31: Bullet angle follows bank (0=none, 1=full)
                },
                HOVER_BOB: {
                    ENABLED: true,
                    AMPLITUDE: 2.5,       // Pixels of oscillation
                    FREQUENCY: 1.8,       // Hz
                    SPEED_DAMPEN: 0.003,  // Dampening per |vx|
                },
                THRUST: {
                    ENABLED: true,
                    INNER_BOOST: 1.5,     // Inner-curve flame height multiplier
                    OUTER_REDUCE: 0.7,    // Outer-curve flame height multiplier
                    LERP_SPEED: 6,
                    VX_THRESHOLD: 30,     // Minimum |vx| to trigger asymmetry
                },
                VAPOR_TRAILS: {
                    ENABLED: true,
                    VX_THRESHOLD: 180,
                    SPAWN_RATE_BASE: 0.02,
                    SPAWN_RATE_MAX: 0.08,
                    PARTICLE_LIFE: 0.5,
                    PARTICLE_SIZE: 2.5,
                    DRIFT_SPEED: 40,
                    GRAVITY: 60,
                    COLOR: '#88ccff',
                    COLOR_HYPER: '#ffd700',
                    COLOR_GODCHAIN: '#ff6600',
                    MAX_PER_FRAME: 2,
                },
                SQUASH_STRETCH: {
                    ENABLED: true,
                    ACCEL_THRESHOLD: 800, // Minimum instantaneous accel to trigger
                    MAX_SQUASH_X: 0.97,
                    MAX_STRETCH_Y: 1.03,
                    LERP_SPEED: 10,
                    RETURN_SPEED: 6,
                },
            },

            // Trail enhancement
            TRAIL_POWER_GLOW: 0.25,           // Outer glow alpha with POWER mod
            TRAIL_HYPER_SPARKLE: false,       // Golden sparkles during HYPER (disabled — clean readability)

            // Screen juice
            MULTI_KILL_WINDOW: 0.05,          // Seconds to count as multi-kill (3 frames)
            MULTI_KILL_FLASH: { duration: 0.08, opacity: 0.20, color: '#FFFFFF' },
            STRONG_KILL_SHAKE: 3,             // Shake px on strong-tier kill
            STRONG_KILL_SHAKE_DURATION: 0.06, // Shake duration
            HYPER_AMBIENT_INTERVAL: 0.5,      // Seconds between HYPER sparkles (slower — less clutter)
            COMBO_SCORE_SCALE: true,          // Float score size scales with streak

            // v4.58: Cyberpunk damage deterioration
            DAMAGE_VISUAL: {
                ENABLED: true,
                THRESHOLD: 0.5,               // HP ratio below which effects begin
                FLICKER: {
                    ENABLED: true,
                    SPEED: 18,                // Hz
                    MIN_WIDTH: 1.0,
                    MAX_WIDTH: 4.5,
                    GLITCH_CHANCE: 0.03,
                    GLITCH_MULT: 2.5
                },
                CRACKS: {
                    ENABLED: true,
                    COUNT_AT_THRESHOLD: 2,
                    COUNT_AT_DEATH: 5,
                    WIDTH: 1.5,
                    ALPHA_MIN: 0.4,
                    ALPHA_MAX: 0.9,
                    LENGTH_MIN: 8,
                    LENGTH_MAX: 18,
                    BODY_RADIUS: 22
                },
                SPARKS: {
                    ENABLED: true,
                    INTERVAL_SLOW: 0.28,
                    INTERVAL_FAST: 0.10,
                    SPEED_MIN: 40,
                    SPEED_MAX: 80,
                    SIZE: 2.5,
                    LIFETIME: 0.25
                },
                GLOW: {
                    PULSE_SPEED_MULT: 2.5,
                    ALPHA_MULT: 0.55,
                    DESATURATE: 0.2
                },
                BODY_DARKEN: 0.12
            }
        },

        // --- GODCHAIN MODE v4.6 (All modifiers maxed simultaneously) ---
        GODCHAIN: {
            // v4.60: GODCHAIN = 3 elemental perks collected (was weapon level 5)
            REQUIREMENTS: { PERK_LEVEL: 3 },
            DURATION: 10,               // v4.48: seconds (was permanent, now temporary + re-triggerable)
            COOLDOWN: 10,               // v5.15.1: seconds after GODCHAIN ends before re-activation
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
                INNER_RADIUS: 20,
                OUTER_RADIUS: 70,       // v4.45: 52→70 (much larger glow)
                ALPHA: 0.45,            // v4.45: 0.18→0.45 (clearly visible)
                PULSE_SPEED: 5.0        // v4.45: 3→5 (faster pulsing, more dramatic)
            },
            FIRE_TRAIL: {
                TONGUE_COUNT: 5,        // v4.45: 3→5
                LENGTH: 20,             // v4.45: 12→20
                ALPHA: 0.85,            // v4.45: 0.7→0.85
                COLORS: ['#ff4400', '#ff6600', '#ffaa00']
            },
            VIGNETTE: true              // v4.45: Enable screen-edge orange glow
        },

        // --- HYPERGOD v5.26 (simultaneous HYPER + GODCHAIN) ---
        HYPERGOD: {
            SCORE_MULT: 5.0,            // HYPER=3x, HYPERGOD=5x
        },

        // --- SKY & BACKGROUND v4.24 (Cell-Shading Enhancement) ---
        SKY: {
            ENABLED: true,              // Master toggle — false = legacy flat bands

            // A. Gradient sky (smooth cached linear gradient)
            GRADIENTS: {
                ENABLED: true,
                LEVELS: {
                    1: ['#0a0825', '#121040', '#1a1555', '#201a60'],
                    2: ['#080620', '#0f0d38', '#161250', '#1c1660'],
                    3: ['#060518', '#0a0a30', '#120e42', '#180f50'],
                    4: ['#040410', '#080820', '#0c0c30', '#100e38'],
                    5: ['#020208', '#050515', '#08081a', '#0a0a22']
                },
                BOSS: ['#000005', '#030312', '#06061a', '#080820'],
                BEAR: ['#1a0008', '#200010', '#280015', '#200010']
            },

            // B. Star field
            STARS: {
                ENABLED: true,
                COUNT: 90,
                MIN_SIZE: 1.5,
                MAX_SIZE: 3.5,
                MIN_VISIBLE_LEVEL: 1,      // Stars visible from L1 (dark sky)
                ALPHA_BY_LEVEL: { 1: 0.15, 2: 0.30, 3: 0.50, 4: 0.75, 5: 1.0 },
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
                    1: ['#141030', '#100c28', '#0c0a22', '#0a081c', '#080616'],
                    2: ['#120e28', '#0e0a22', '#0a081c', '#080616', '#060510'],
                    3: ['#100c22', '#0c081c', '#0a0618', '#080514', '#06040e'],
                    4: ['#0a0818', '#080614', '#060510', '#05040c', '#040308'],
                    5: ['#080614', '#060510', '#05040c', '#040308', '#030206']
                },
                BEAR_COLORS: ['#1a0408', '#160306', '#120205', '#0e0204', '#0a0103'],
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
                    1: { color: '#00f0ff', type: 'firefly' },
                    2: { color: '#ff2d95', type: 'firefly' },
                    3: { color: '#bb44ff', type: 'firefly' },
                    4: { color: '#00f0ff', type: 'firefly' },
                    5: { color: '#ff2d95', type: 'firefly' }
                },
                BEAR_THEME: { color: '#ff2244', type: 'ember' },
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
                    NORMAL: { shadow: '#1a1035', main: '#251848', highlight: '#352060', outline: '#0e0820' },
                    BEAR: { shadow: '#200008', main: '#300010', highlight: '#400018', outline: '#180006' },
                    NIGHT: { shadow: '#0c0820', main: '#141030', highlight: '#1c1840', outline: '#080515' }
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
                    1: '#201a60',
                    2: '#1c1660',
                    3: '#180f50',
                    4: '#100e38',
                    5: '#0a0a22'
                },
                BEAR_COLOR: '#200010',
                BOSS_COLOR: '#080820'
            },

            // G. Off-screen canvas caching (v4.31)
            OFFSCREEN: {
                ENABLED: true,            // false = direct-draw (pre-v4.31)
                HILLS_REDRAW_INTERVAL: 2  // frames between hills redraw (1 = every frame)
            },

            // H. Weather events (v4.41)
            WEATHER: {
                ENABLED: true,
                SHEET_LIGHTNING: {
                    COLOR: '#bb66ff',
                    BEAR_COLOR: '#ff2244',
                    ALPHA: 0.5
                },
                RAIN: {
                    COLOR: '#6666aa',
                    BEAR_COLOR: '#882222',
                    WIDTH: 1.5
                },
                TRIGGERS: {
                    boss_spawn: [
                        { type: 'sheet_lightning', duration: 0.5, intensity: 0.35 },
                        { type: 'wind_gust', duration: 5, intensity: 2.5 },
                        { type: 'rain', duration: 14, count: 30 }
                    ],
                    boss_defeat: [
                        { type: 'meteor_shower', duration: 3, count: 10 },
                        { type: 'wind_gust', duration: 2.5, intensity: 3.0 }
                    ],
                    wave_clear: [
                        { type: 'wind_gust', duration: 2, intensity: 1.8 }
                    ],
                    godchain: [
                        { type: 'meteor_shower', duration: 2, count: 6 },
                        { type: 'sheet_lightning', duration: 0.3, intensity: 0.25 }
                    ]
                }
            },

            // I. Ambient weather per level (v4.42)
            AMBIENT: {
                ENABLED: true,

                SNOW: {
                    ENABLED: true,
                    COUNT: 15,
                    SPEED_MIN: 80,
                    SPEED_MAX: 120,
                    SIZE_MIN: 1.5,
                    SIZE_MAX: 3.5,
                    WOBBLE_AMP: 25,       // horizontal wobble px
                    WOBBLE_FREQ: 1.2,     // wobble cycles/sec
                    ALPHA: 0.7
                },

                FOG: {
                    ENABLED: true,
                    COUNT: 4,
                    WIDTH_MIN: 150,
                    WIDTH_MAX: 250,
                    HEIGHT_RATIO: 0.4,    // height = width * ratio
                    DRIFT_SPEED: 15,      // px/sec horizontal
                    ALPHA_MIN: 0.04,
                    ALPHA_MAX: 0.08,
                    COLOR: '#4444aa',
                    BEAR_COLOR: '#aa2244'
                },

                DRIZZLE: {
                    ENABLED: true,
                    COUNT: 10,
                    SPEED_MIN: 200,
                    SPEED_MAX: 320,
                    LENGTH_MIN: 6,
                    LENGTH_MAX: 12,
                    ALPHA: 0.12,
                    COLOR: '#5566aa',
                    BEAR_COLOR: '#664444',
                    WIDTH: 1
                },

                DISTANT_LIGHTNING: {
                    ENABLED: true,
                    INTERVAL_MIN: 10,     // seconds
                    INTERVAL_MAX: 25,
                    ALPHA_MIN: 0.08,
                    ALPHA_MAX: 0.15,
                    DECAY_SPEED: 1.5,     // alpha/sec
                    COLORS: {
                        3: '#bb66ff',     // violet
                        4: '#aa44ff',     // deep violet
                        5: '#6644ff'      // indigo
                    },
                    BEAR_COLOR: '#ff2244' // neon red
                },

                LEVEL_TRANSITION: {
                    WIND_INTENSITY: 3.0,
                    WIND_DURATION: 2.0,
                    FLASH_INTENSITY: 0.12
                },

                // Which effects are active per level
                LEVELS: {
                    1: [],
                    2: [],
                    3: ['distant_lightning'],
                    4: ['drizzle', 'fog', 'distant_lightning'],
                    5: ['snow', 'distant_lightning']
                },
                BEAR_MARKET: ['distant_lightning'],
                BOSS_ACTIVE: ['drizzle'],

                // Bird silhouettes (v4.43: intro screen ambient)
                BIRDS: {
                    ENABLED: true,
                    COUNT: 4,
                    SPEED_MIN: 30,
                    SPEED_MAX: 55,
                    WING_SPAN: 6,
                    FLAP_SPEED: 3,
                    FLAP_AMP: 4,
                    COLOR: '#1a1a30',
                    LINE_WIDTH: 1.5
                },
                INTRO: ['birds']
            }
        },

        // --- ADDITIVE GLOW SYSTEM (v4.23, boosted v4.23.1) ---
        GLOW: {
            ENABLED: true,

            BULLET: {
                ENABLED: true,
                RADIUS: 24,              // v4.52: 18→24 for neon halo
                ALPHA: 0.6,              // v4.52: 0.45→0.6
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
                RADIUS: 40,              // v4.52: 30→40 for neon flash
                DURATION: 0.4
            },

            ENEMY: {                     // v4.56: Neon halo on enemies
                ENABLED: true,
                RADIUS: 20,              // Halo glow radius beyond enemy body
                ALPHA: 0.35,             // Base halo alpha
                PULSE_SPEED: 4,          // Sin pulse speed
                PULSE_AMOUNT: 0.1        // Pulse amplitude
            }
        },

        // --- QUALITY TIERS (v6.3 — Adaptive quality with ULTRA for high-end) ---
        QUALITY: {
            AUTO_DETECT: true,
            CURRENT_TIER: 'HIGH',        // ULTRA | HIGH | MEDIUM | LOW

            // FPS monitoring
            SAMPLE_WINDOW: 3,            // seconds of sampling
            DROP_THRESHOLD: 45,          // below 45fps → drop tier
            RECOVER_THRESHOLD: 55,       // above 55fps → raise tier
            RECOVER_HOLD: 5,             // stable seconds before raising
            MIN_PLAY_SECONDS: 5,         // wait N sec from play start before evaluating
            ULTRA_PROMOTE_THRESHOLD: 58, // FPS minimo per promuovere a ULTRA
            ULTRA_PROMOTE_HOLD: 8,       // secondi di FPS stabile prima di promuovere

            // Tier definitions — override values applied on Balance
            TIERS: {
                ULTRA: {
                    // Particles & canvas effects
                    PARTICLES_MAX: 280,
                    CANVAS_EFFECTS_MAX: 32,
                    // Glow boost
                    GLOW_BULLET_RADIUS: 32,
                    GLOW_BULLET_ALPHA: 0.72,
                    GLOW_ENGINE_RADIUS: 30,
                    GLOW_ENGINE_ALPHA: 0.65,
                    GLOW_MUZZLE_RADIUS_MULT: 2.2,
                    GLOW_MUZZLE_ALPHA: 0.72,
                    GLOW_POWERUP_RADIUS_MULT: 1.8,
                    GLOW_POWERUP_ALPHA: 0.6,
                    GLOW_RING_ALPHA_MULT: 1.6,
                    GLOW_DEATH_RADIUS: 54,
                    GLOW_DEATH_DURATION: 0.5,
                    GLOW_ENEMY_RADIUS: 26,
                    GLOW_ENEMY_ALPHA: 0.42,
                    // Sky enhancement
                    SKY_STARS_COUNT: 140,
                    SKY_SHOOTING_MAX: 3,
                    SKY_PARTICLES_COUNT: 32,
                    SKY_CLOUDS_COUNT: 16,
                    // Explosions boost
                    EXPLOSION_WEAK: { particles: 8, debrisCount: 3 },
                    EXPLOSION_MEDIUM: { particles: 14, debrisCount: 6 },
                    EXPLOSION_STRONG: { particles: 20, debrisCount: 9 },
                    // Muzzle sparks
                    MUZZLE_SPARK_BASE: 3,
                    MUZZLE_SPARK_PER_LEVEL: 2,
                    // HYPER aura boost
                    HYPER_SPEED_LINES_COUNT: 12,
                    HYPER_SPEED_LINES_ALPHA: 0.82,
                    HYPER_BODY_GLOW_RADIUS: 45,
                    HYPER_BODY_GLOW_ALPHA: 0.33,
                    // Vapor trails
                    VAPOR_MAX_PER_FRAME: 4,
                    // Shield energy skin
                    ENERGY_SKIN_OUTER_STROKE: 10,
                    ENERGY_SKIN_SPARK_COUNT: 5,
                },
                HIGH: {
                    // Default — everything active, no overrides
                },
                MEDIUM: {
                    GLOW_ENABLED: false,
                    PARTICLES_MAX: 100,
                    SKY_CLOUDS: false,
                    SKY_PARTICLES_COUNT: 8,
                    SKY_WEATHER: false,
                    SHIP_FLIGHT_VAPOR: false,
                    SHIP_FLIGHT_SQUASH: false,
                    MUZZLE_FLASH: false,
                    ENEMY_GLOW: false,
                    DEATH_FLASH: false,
                    HORIZON_GLOW: false,
                },
                LOW: {
                    GLOW_ENABLED: false,
                    PARTICLES_MAX: 50,
                    CANVAS_EFFECTS_MAX: 8,
                    SKY_CLOUDS: false,
                    SKY_PARTICLES_COUNT: 0,
                    SKY_WEATHER: false,
                    SKY_HILLS_REDRAW: 10,
                    SHIP_FLIGHT_ALL: false,
                    MUZZLE_FLASH: false,
                    WEAPON_DEPLOY: false,
                    ENEMY_GLOW: false,
                    DEATH_FLASH: false,
                    HORIZON_GLOW: false,
                    ELEMENTAL_VFX_REDUCED: true,
                }
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
            BULLETS_PER_SECOND: [8, 20, 35],   // v6.5: [12,31,50]→[8,20,35] — recalibrated for streaming (no pause between phases)
            WAVE_GRACE_PERIOD: 2.5,             // v4.37: seconds of silence at wave start (no enemy fire)
            BEAR_MARKET_BONUS: 10,              // +10 bullets/sec in Bear Market
            PANIC_MULTIPLIER: 1.3,              // +30% during PANIC phase
            RANK_SCALE: 0.15,                   // ±15% from rank
            DEFICIT_CARRYOVER: 0.5,             // 50% unused budget carried over
            // v5.16.1: Burst/pause DISABLED — sequences themselves create rhythm via SALVO spacing
            BURST_DURATION: 0,                  // v5.16.1: disabled (was 1.5 — conflicted with SALVO setTimeout)
            PAUSE_DURATION: 0,                  // v5.16.1: disabled (was 0.8 — sequences control gaps now)
            // v5.0.7: Progressive aggression — fire rate boost per elemental perk level
            ELEMENTAL_AGGRESSION: {
                ENABLED: true,
                SCALE: [0.10, 0.15, 0.20]  // +% fire rate for perkLevel 1/2/3+
            }
        },

        // --- TITLE ANIMATION v4.35 ---
        TITLE_ANIM: {
            ENABLED: true,                // false = skip animation, show everything immediately
            DURATION: 2.4,
            TIMELINE: {
                SUBTITLE_IN: 0.24,
                FIAT_IN: 0.6,
                VS_IN: 0.96,
                CRYPTO_IN: 1.32,
                LOOP_START: 1.8,
                CONTROLS_IN: 2.4
            },
            PARTICLES: {
                COUNT: 16,
                SPEED_MIN: 3,
                SPEED_MAX: 7,
                DECAY_MIN: 0.5,
                DECAY_MAX: 1.0,
                FIAT_COLOR: '#FFD700',
                CRYPTO_COLOR: '#00FFCC',
                MAX_TOTAL: 40
            },
            SFX: {
                BOOM_VOLUME: 0.7,
                ZAP_VOLUME: 0.7
            }
        },

        // --- STORY BACKGROUNDS v5.5 ---
        STORY_BACKGROUNDS: {
            ENABLED: true,
            PROLOGUE: {
                COIN_COUNT: 14,
                COIN_SIZE_MIN: 6,
                COIN_SIZE_MAX: 12,
                FALL_SPEED_MIN: 0.3,
                FALL_SPEED_MAX: 0.8,
                DISSOLVE_START: 0.6,         // fraction of screen height
                GREY_SPEED: 1.2,
                FADE_SPEED: 0.8,
                SHRINK_SPEED: 0.5,
                SPARK_CHANCE: 0.4,
                SPARK_MAX: 35
            },
            CHAPTER_1: {
                CHAR_COUNT: 28,
                FONT_SIZE_MIN: 12,
                FONT_SIZE_MAX: 20,
                FALL_SPEED_MIN: 0.5,
                FALL_SPEED_MAX: 1.2,
                ATTRACT_RADIUS: 120,
                ATTRACT_FORCE: 0.8,
                BTC_SIZE: 80,
                BTC_BASE_ALPHA: 0.1,
                BTC_PULSE_ALPHA: 0.08,
                BTC_PULSE_SPEED: 2.5
            },
            CHAPTER_2: {
                NODE_COUNT: 18,
                NODE_RADIUS_MIN: 3,
                NODE_RADIUS_MAX: 6,
                DRIFT_SPEED: 0.3,
                CONNECT_DIST: 160,
                LINE_ALPHA: 0.2,
                PULSE_INTERVAL: 2.5,
                PULSE_TRAVEL_TIME: 0.8
            },
            CHAPTER_3: {
                NODE_COUNT: 22,
                GLOBE_RADIUS: 0.35,
                ROTATE_SPEED: 0.15,
                BOLT_INTERVAL: 2.5,
                BOLT_SEGMENTS: 6,
                BOLT_JITTER: 30,
                BOLT_FADE_SPEED: 2.5,
                RIPPLE_SPEED: 60,
                RIPPLE_FADE: 2.0
            }
        },

        // --- AUDIO SYSTEM v4.34 ---
        AUDIO: {
            ENABLED: true,           // Master kill-switch
            MUSIC_VOLUME: 0.7,       // Default music volume (0-1)
            SFX_VOLUME: 0.8,         // Default SFX volume (0-1)
            MUSIC_ENABLED: true,     // Music kill-switch
            SFX_ENABLED: true,       // SFX kill-switch

            // --- Audio Richness (v6.7) ---
            REVERB: {
                ENABLED: true,
                DECAY: 1.5,              // Impulse response length (seconds)
                DAMPING: 0.7,            // High-frequency damping (0-1)
                WET_LEVEL: 0.15,         // Master reverb wet mix
                SEND: { bass: 0.08, arp: 0.25, melody: 0.20, pad: 0.35, drums: 0.05 },
                SFX_SENDS: { explosion: 0.20, bossSpawn: 0.30, waveComplete: 0.25, levelUp: 0.20, godchainActivate: 0.30 }
            },
            STEREO: {
                ENABLED: true,
                PAN: { bass: 0, arp: -0.3, melody: 0.3, kick: 0, snare: 0, hihat: 0.4, crash: -0.2, pad: 0 }
            },
            LFO: {
                ARP_FILTER: { ENABLED: true, RATE: 2, MIN_FREQ: 800, MAX_FREQ: 4000, Q: 2 },
                MELODY_FILTER: { ENABLED: true, ATTACK_FREQ: 3000, RELEASE_FREQ: 800, Q: 1 },
                PAD_TREMOLO: { ENABLED: true, RATE: 0.5, DEPTH: 0.3 },
                PAD_DETUNE: { ENABLED: true, CENTS: 8 }
            },
            COMPRESSOR: { THRESHOLD: -18, KNEE: 30, RATIO: 6, ATTACK: 0.003, RELEASE: 0.25 },
            DRUMS: {
                KICK_SUB: { ENABLED: true, FREQ: 50, DECAY: 0.15, VOLUME: 0.12 },
                SNARE_BODY: { ENABLED: true, FREQ: 200, DECAY: 0.06, VOLUME: 0.06 },
                HIHAT_OPEN_DECAY: 0.12
            }
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
            let baseDiff = this.DIFFICULTY.CYCLE_BASE[cycleIndex];

            // Arcade post-C3: continued difficulty scaling
            const _isArcade = window.Game.ArcadeModifiers && window.Game.ArcadeModifiers.isArcadeMode();
            if (_isArcade && cycle > 3 && this.ARCADE) {
                baseDiff += (cycle - 3) * (this.ARCADE.POST_C3_DIFF_PER_CYCLE || 0.20);
            }

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
        calculateEnemyHP(difficulty, cycle) {
            const baseHP = this.ENEMY_HP.BASE + Math.floor(difficulty * this.ENEMY_HP.SCALE);
            // v4.45: Per-cycle multiplier — player power grows faster than linear HP scaling
            const cm = this.ENEMY_HP.CYCLE_MULT;
            const cycleMult = cm ? cm[Math.min((cycle || 1) - 1, cm.length - 1)] : 1;
            return Math.floor(baseHP * cycleMult);
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
            const raw = hp.BASE + (level * hp.PER_LEVEL) + ((cycle - 1) * hp.PER_CYCLE);
            const cycleMult = hp.CYCLE_MULT ? hp.CYCLE_MULT[Math.min(cycle, 3) - 1] : 1.0;
            return raw * cycleMult;
        },

        /**
         * Get wave definition for current cycle/wave
         * @param {number} cycle - Market cycle (1-based)
         * @param {number} waveInCycle - Wave number within cycle (1-5)
         * @returns {Object|null} Wave definition or null if not found
         */
        getWaveDefinition(cycle, waveInCycle) {
            const defs = this.WAVE_DEFINITIONS.WAVES;
            const _isArcade = window.Game.ArcadeModifiers && window.Game.ArcadeModifiers.isArcadeMode();
            const arcadeCfg = this.ARCADE;

            // Arcade post-C3: cycle through C1-C3 definitions
            // C4=C1 waves, C5=C2, C6=C3, C7=C1, ...
            let effectiveCycle;
            if (_isArcade && cycle >= 4) {
                effectiveCycle = ((cycle - 1) % 3) + 1;
            } else {
                effectiveCycle = Math.min(cycle, 3);
            }

            const base = defs.find(w => w.cycle === effectiveCycle && w.wave === waveInCycle) || null;

            // Cycle 4+: remix formations (randomize phase formations)
            if (base && cycle >= 4) {
                const allFormations = ['DIAMOND', 'ARROW', 'PINCER', 'CHEVRON', 'FORTRESS', 'SCATTER',
                    'SPIRAL', 'CROSS', 'WALL', 'GAUNTLET', 'VORTEX', 'FLANKING', 'STAIRCASE',
                    'HURRICANE', 'FINAL_FORM', 'BTC_SYMBOL', 'DOLLAR_SIGN', 'EURO_SIGN', 'YEN_SIGN', 'POUND_SIGN'];
                const remixChance = (_isArcade && arcadeCfg) ? arcadeCfg.POST_C3_FORMATION_REMIX : 0.30;
                const clone = JSON.parse(JSON.stringify(base));
                if (clone.phases) {
                    for (const phase of clone.phases) {
                        if (Math.random() < remixChance) {
                            phase.formation = allFormations[Math.floor(Math.random() * allFormations.length)];
                        }
                    }
                }
                return clone;
            }
            return base;
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
         * Get phase modifiers for streaming phase index
         * @param {number} phaseIndex - 0-based phase index
         * @returns {Object} Phase modifiers (fireRateMult, behaviorBonus, entryStyle)
         */
        getPhaseModifiers(phaseIndex) {
            const esc = this.STREAMING?.PHASE_ESCALATION || {};
            return {
                behaviorBonus: 0,
                fireRateMult: phaseIndex > 0 ? 1 + phaseIndex * (esc.FIRE_RATE_PER_PHASE || 0.05) : 1.0,
                entryStyle: 'stagger',
                _behaviorEscalation: phaseIndex > 0 ? phaseIndex * (esc.BEHAVIOR_BONUS_PER_PHASE || 0.05) : 0
            };
        },

        // --- ARCADE MODE: ROGUE PROTOCOL ---
        ARCADE: {
            // Pacing overrides
            INTERMISSION_DURATION: 2.0,         // Faster wave transitions (vs 3.2s Story)
            INTERMISSION_BOSS_DURATION: 4.0,    // Shorter boss celebration (vs 6.0s)

            // Enemy scaling
            ENEMY_COUNT_MULT: 1.15,             // +15% enemies per wave
            ENEMY_HP_MULT: 0.85,                // -15% HP (swarm-friendly, combo-friendly)
            DROP_RATE_MULT: 1.10,               // +10% drop rate

            // Post-C3 scaling
            POST_C3_DIFF_PER_CYCLE: 0.20,       // +20% difficulty per cycle beyond C3
            POST_C3_FORMATION_REMIX: 0.40,      // 40% chance to remix formation

            // Combo system
            COMBO: {
                TIMEOUT: 3.0,                   // Seconds before combo resets
                GRAZE_EXTEND: 0.5,              // Seconds added per graze
                MULT_PER_COMBO: 0.05,           // Score multiplier per combo kill
                MULT_CAP: 5.0,                  // Max combo multiplier
                DECAY_ANIM: 0.5,                // Fade-out duration on reset
                // HUD colors by threshold
                COLORS: {
                    WHITE: 10,                  // 1-10
                    YELLOW: 30,                 // 11-30
                    ORANGE: 50,                 // 31-50
                    RED: 999                    // 51+
                }
            },

            // Mini-boss Arcade overrides
            MINI_BOSS: {
                COOLDOWN: 10.0,                 // 10s (vs 15s Story)
                MAX_PER_WAVE: 3,                // 3 (vs 2 Story)
                HP_MULT: 0.50,                  // 50% of full boss HP (vs 60%)
                THRESHOLD_MULT: 0.65            // Kill thresholds × 0.65 (lower = more frequent)
            },

            // Modifier system
            MODIFIERS: {
                POST_BOSS_PICKS: 3,             // Cards shown after boss defeat
                POST_MINIBOSS_PICKS: 2,         // Cards shown after mini-boss defeat
                MAX_MODIFIERS: 20               // Safety cap
            },

            // Modifier tuning values (v5.13.1: extracted from inline)
            MODIFIER_TUNING: {
                VOLATILE_ROUNDS: { AOE_RADIUS: 30, DMG_MULT: 0.5, HIT_FLASH: 0.1 },
                CHAIN_LIGHTNING: { RANGE: 100, DMG_MULT: 0.3, HIT_FLASH: 0.15 }
            }
        }
    };
})();
