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
            CYCLE_BASE: [0.0, 0.30, 0.60],  // Cycle 1: Tutorial, Cycle 2: Learning, Cycle 3: Skilled

            // Per-wave scaling within cycle
            WAVE_SCALE: 0.03,               // +3% per wave (5 waves = +12% total within cycle)

            // Bear Market additive bonus (not multiplier)
            BEAR_MARKET_BONUS: 0.25,        // Starts at Cycle 2 equivalent difficulty

            // Maximum cap
            MAX: 1.0
        },

        // --- PLAYER PHYSICS ---
        PLAYER: {
            ACCELERATION: 2500,       // Keyboard acceleration
            FRICTION: 0.92            // Velocity decay when not moving
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
            CLOSE_RADIUS: 12,         // Close graze radius for 3x bonus (tighter = more skill)

            // Scoring (grazing = primary score source)
            POINTS_BASE: 25,          // Base points per graze
            CLOSE_BONUS: 3,           // Close graze multiplier (3x)
            METER_GAIN: 8,            // Normal graze meter gain
            METER_GAIN_CLOSE: 20,     // Close graze meter gain

            // Multiplier system
            MULT_MAX: 2.5,            // Maximum score multiplier from full meter
            MULT_DIVISOR: 100,        // grazeMeter / this = multiplier bonus (100 = 2.5x at full)

            // Perk rewards
            PERK_THRESHOLD: 50,       // Graze count to trigger bonus perk
            MAX_PERKS_PER_LEVEL: 2,   // Cap graze perks per level

            // Decay (use it or lose it)
            DECAY_RATE: 6,            // Meter decay per second when not grazing
            DECAY_DELAY: 0.5,         // Seconds before decay starts

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
                ENEMY_KILL: 0.025,        // 25ms freeze on every kill (2 frames at 60fps)
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
                WAVE_START: { duration: 0.05, opacity: 0.25, color: '#FFFFFF' }
            },

            // Master toggles for screen effects (modularity)
            SCREEN_EFFECTS: {
                // Critical feedback (recommended ON)
                PLAYER_HIT_FLASH: true,       // Red flash when hit
                BOSS_DEFEAT_FLASH: true,      // White flash on boss kill
                BOSS_PHASE_FLASH: true,       // Orange flash on phase change

                // Optional feedback (default OFF - can feel like lag)
                STREAK_FLASH: false,          // Flash on kill streaks
                GRAZE_FLASH: false,           // Flash on close graze
                SCORE_PULSE: false,           // Edge glow every 10k points
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
            BULLET_SPEED_BASE: 128,   // Base bullet speed
            BULLET_SPEED_SCALE: 68    // Additional speed at max difficulty
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
            KAMIKAZE_SPEED: 400       // Dive speed for kamikaze enemies
        },

        // --- PATTERN DENSITY (Per Cycle) ---
        // Patterns follow Ikeda Rule 2: geometric, readable corridors
        PATTERNS: {
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
            SPACING: 75,              // Pixels between enemies in grid
            START_Y: 150,             // Initial Y position for new waves
            MAX_Y: 380                // Maximum Y before descent stops
        },

        // --- DROP SYSTEM ---
        DROPS: {
            WEAPON_COOLDOWN: 5.0,     // Min seconds between weapon drops
            PITY_TIMER_KILLS: 30,     // Guaranteed drop after N kills
            CHANCE_STRONG: 0.06,      // 6% for strong enemies ($, 元, Ⓒ)
            CHANCE_MEDIUM: 0.04,      // 4% for medium enemies (€, £, ₣, ₺)
            CHANCE_WEAK: 0.02,        // 2% for weak enemies (¥, ₽, ₹)
            WEAPON_RATIO: 0.5,        // 50% weapon, 50% ship power-up
            BOSS_DROP_COOLDOWN: 1.5,  // Seconds between boss power-up drops
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

            // Currency → Boss mapping with individual thresholds
            // v2.22.9: Thresholds lowered based on actual kill rates (~60% of spawned enemies)
            // Each 5-wave cycle spawns ~120 WEAK, ~60 MEDIUM, ~36 STRONG enemies
            CURRENCY_BOSS_MAP: {
                // Dollar → FED (US hegemony) - spawns waves 1,3,5
                '$': { boss: 'FEDERAL_RESERVE', threshold: 15 },

                // Euro/Europe → BCE
                '€': { boss: 'BCE', threshold: 18 },
                '₣': { boss: 'BCE', threshold: 18 },
                '£': { boss: 'BCE', threshold: 18 },

                // Asia → BOJ
                '¥': { boss: 'BOJ', threshold: 12 },
                '元': { boss: 'BOJ', threshold: 12 },

                // Emerging markets → Random boss (most common, higher threshold)
                '₽': { boss: 'RANDOM', threshold: 25 },
                '₹': { boss: 'RANDOM', threshold: 25 },
                '₺': { boss: 'RANDOM', threshold: 25 },

                // CBDC → Boss of current cycle (rare spawn)
                'Ⓒ': { boss: 'CYCLE_BOSS', threshold: 10 }
            }
        },

        // --- BOSS FIGHTS ---
        // Designed for 3-cycle runs (~12 min). Each boss ~2-3 min fight.
        BOSS: {
            WARNING_DURATION: 2.0,    // Seconds of warning before boss spawns
            DROP_INTERVAL: 25,        // Drop power-up every N hits on boss
            MEME_ROTATION_INTERVAL: 4.0,  // Seconds between boss meme rotations
            PHASE_THRESHOLDS: [0.66, 0.33], // HP % for phase transitions (Phase 2, Phase 3)
            PHASE_TRANSITION_TIME: 1.5,    // Seconds for phase transition

            // HP scaling (applied before perk/damage modifiers)
            // Updated v2.18.0: Higher base, smoother curve, bigger cycle jumps
            HP: {
                BASE: 1200,           // Base HP for all bosses (+200)
                PER_LEVEL: 25,        // +25 HP per level (smoother curve)
                PER_CYCLE: 500,       // +500 HP per cycle (significant jump)
                PERK_SCALE: 0.10,     // +10% per player perk
                MIN_FLOOR: 1000       // Minimum HP regardless of modifiers
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
                BOJ: [0.75, 0.45, 0.18]               // Precise intervention
            },

            // Minion spawn rate (seconds between spawns in Phase 3)
            MINION_SPAWN_RATE: {
                FEDERAL_RESERVE: 2.5,
                BCE: 3.0,
                BOJ: 2.0
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
                MAX_COUNT: 80,             // Global particle cap
                DEBRIS_SPEED_MIN: 100,
                DEBRIS_SPEED_MAX: 350,
                DEBRIS_SPREAD_ANGLE: 60,   // Degrees
                SCORE_HOMING_ACCEL: 1500,  // Acceleration toward score display
                SCORE_TARGET_DISTANCE: 30  // Pixels from target to despawn
            }
        },

        // --- HUD MESSAGES (Toggle for clean testing) ---
        // Each type has distinct visual style for quick recognition:
        // - GAME_INFO: Green box at top (progression)
        // - DANGER: Red pulsing center (warnings)
        // - VICTORY: Gold glow center (achievements)
        // - FLOATING_TEXT: Small numbers at position (score feedback)
        HUD_MESSAGES: {
            MEME_POPUP: false,            // Random meme popups (can distract)
            POWERUP_POPUP: false,         // Power-up text (redundant, see effect)
            GAME_INFO: true,              // LEVEL/WAVE info - essential feedback
            DANGER: true,                 // Boss warnings - requires attention
            VICTORY: true,                // Boss defeated - satisfying feedback
            FLOATING_TEXT: false,         // Damage numbers (optional, can clutter)
            MEME_TICKER: false,           // Boss fight ticker (distracting)
            PERK_NOTIFICATION: true       // Perk icons - useful to know what you got
        },

        // --- UI LAYOUT ---
        UI: {
            // Safe zones (pixels from top)
            HUD_HEIGHT: 90,               // Top HUD area
            PERK_BAR_TOP: 100,            // Perk display position
            GAMEPLAY_START: 145,          // Where gameplay area begins (boss targetY)

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
            AUTO_DELETE_Y: 1000,          // Y position to auto-remove

            // Weapon durations (stronger = shorter)
            DURATION_WEAPON_BASE: 10.0,   // WIDE, NARROW, FIRE
            DURATION_WEAPON_ADV: 8.0,     // SPREAD, HOMING
            DURATION_WEAPON_ELITE: 6.0,   // LASER

            // Ship power-up durations
            DURATION_SPEED: 10.0,
            DURATION_RAPID: 8.0,
            DURATION_SHIELD: 3.0,

            // Ship power-up effects
            SPEED_MULTIPLIER: 1.5,        // Movement speed boost
            RAPID_MULTIPLIER: 0.5         // Fire rate multiplier (lower = faster)
        },

        // --- DROP SCALING ---
        DROP_SCALING: {
            // Per-cycle bonus to drop chance
            CYCLE_BONUS: 0.01,            // +1% per cycle

            // Pity timer decreases with cycle
            PITY_BASE: 30,                // Base kills for guaranteed drop
            PITY_REDUCTION: 5             // -5 kills per cycle (min 15)
        },

        // --- WAVES ---
        WAVES: {
            PER_CYCLE: 5,                 // Waves before boss appears
            ENEMY_FIRE_TIMER: 0.5,        // Base timer for enemy fire phase
            HORDES_PER_WAVE: 2,           // Number of hordes per wave
            HORDE_TRANSITION_DURATION: 0.8, // Seconds between hordes
            HORDE_2_PATTERN_VARIANT: true // Use different pattern for horde 2
        },

        // --- ENEMY FORMATION ENTRY ---
        FORMATION_ENTRY: {
            ENABLED: true,                // Enable formation entry animation
            ENTRY_SPEED: 420,             // Pixels per second during entry (+20% from 350)
            STAGGER_DELAY: 0.08,          // Seconds between each enemy starting entry
            SPAWN_Y_OFFSET: -80,          // Y offset above screen for spawning
            SETTLE_TIME: 0.3,             // Seconds to settle after reaching position
            CURVE_INTENSITY: 0.4          // How much enemies curve during entry (0-1)
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
        }
    };
})();
