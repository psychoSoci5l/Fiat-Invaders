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
        // --- DIFFICULTY SCALING ---
        DIFFICULTY: {
            LEVEL_SCALE: 0.08,        // +8% per level (0-4 = 0-0.32)
            CYCLE_SCALE: 0.20,        // +20% per boss cycle completed
            MAX_DIFFICULTY: 0.85,     // Cap at 85% (hard but fair)
            BEAR_MARKET_MULT: 1.3     // Bear Market mode multiplier
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

        // --- GRAZING SYSTEM ---
        GRAZE: {
            RADIUS: 25,               // Pixels outside core hitbox for graze
            CLOSE_RADIUS: 15,         // Close graze radius for 2x bonus
            PERK_THRESHOLD: 60,       // Graze count to trigger bonus perk
            DECAY_RATE: 5,            // Meter decay per second when not grazing
            MAX_PERKS_PER_LEVEL: 2    // Cap graze perks per level
        },

        // --- ENEMY FIRING ---
        ENEMY_FIRE: {
            STRIDE: 8,                // Every Nth enemy fires per group
            MAX_SHOTS_PER_TICK: 1,    // Max bullets spawned per frame
            FIBONACCI_INTERVAL: 0.40, // Seconds between Fibonacci ramp-up steps
            BULLET_SPEED_BASE: 128,   // Base bullet speed
            BULLET_SPEED_SCALE: 68    // Additional speed at max difficulty
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

        // --- MINI BOSS ---
        MINI_BOSS: {
            KILL_THRESHOLD: 30        // Kills of same currency to spawn mini-boss
        },

        // --- BOSS FIGHTS ---
        BOSS: {
            WARNING_DURATION: 2.0,    // Seconds of warning before boss spawns
            DROP_INTERVAL: 25,        // Drop power-up every N hits on boss
            MEME_ROTATION_INTERVAL: 4.0,  // Seconds between boss meme rotations
            PHASE_THRESHOLDS: [0.66, 0.33], // HP % for phase transitions (Phase 2, Phase 3)
            PHASE_TRANSITION_TIME: 1.5,    // Seconds for phase transition
            PHASE_SPEEDS: {           // Movement speed per phase per boss type
                FEDERAL_RESERVE: [60, 180, 80],
                BCE: [50, 150, 70],
                BOJ: [55, 160, 75]
            }
        },

        // --- SCORE SYSTEM ---
        SCORE: {
            HODL_MULT_ENEMY: 1.25,    // HODL damage multiplier vs enemies
            HODL_MULT_BOSS: 1.5,      // HODL damage multiplier vs boss
            GRAZE_MULT_MAX: 1.5,      // Maximum graze score multiplier
            GRAZE_METER_DIVISOR: 200, // grazeMeter / this = multiplier bonus
            BEAR_MARKET_MULT: 2,      // Score multiplier in Bear Market mode
            BOSS_DEFEAT_BONUS: 5000,  // Fixed points for boss defeat
            CYCLE_BONUS: 2000         // Points per market cycle completed
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
            INTERMISSION_DURATION: 1.9,    // Between waves
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

        // --- UI LAYOUT ---
        UI: {
            // Safe zones (pixels from top)
            HUD_HEIGHT: 90,               // Top HUD area
            PERK_BAR_TOP: 100,            // Perk display position
            GAMEPLAY_START: 145,          // Where gameplay area begins (boss targetY)

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

        // --- POWERUP PHYSICS ---
        POWERUPS: {
            FALL_SPEED: 100,              // Pixels per second
            WOBBLE_AMPLITUDE: 35,         // Horizontal wobble range
            WOBBLE_SPEED: 3,              // Wobble oscillation speed
            AUTO_DELETE_Y: 1000           // Y position to auto-remove
        },

        // --- WAVES ---
        WAVES: {
            PER_CYCLE: 5,                 // Waves before boss appears
            ENEMY_FIRE_TIMER: 0.5         // Base timer for enemy fire phase
        },

        // --- HELPER FUNCTIONS ---

        /**
         * Calculate difficulty multiplier for current game state
         * @param {number} level - Current level (1-based)
         * @param {number} cycle - Current market cycle (1-based)
         * @returns {number} Difficulty multiplier (0 to MAX_DIFFICULTY)
         */
        calculateDifficulty(level, cycle) {
            const base = (level - 1) * this.DIFFICULTY.LEVEL_SCALE;
            const cycleBonus = (cycle - 1) * this.DIFFICULTY.CYCLE_SCALE;
            return Math.min(this.DIFFICULTY.MAX_DIFFICULTY, base + cycleBonus);
        },

        /**
         * Calculate grid speed for current difficulty
         * @param {number} difficulty - Current difficulty (0 to MAX_DIFFICULTY)
         * @param {boolean} isBearMarket - Whether bear market mode is active
         * @returns {number} Grid movement speed
         */
        calculateGridSpeed(difficulty, isBearMarket) {
            const base = this.GRID.SPEED_BASE + difficulty * this.GRID.SPEED_SCALE;
            return isBearMarket ? base * this.DIFFICULTY.BEAR_MARKET_MULT : base;
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
         * @returns {number} Score multiplier (1.0 to GRAZE_MULT_MAX)
         */
        getGrazeMultiplier(grazeMeter) {
            return 1 + (grazeMeter / this.SCORE.GRAZE_METER_DIVISOR);
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
        }
    };
})();
