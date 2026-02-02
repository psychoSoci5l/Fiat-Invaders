/**
 * MemeEngine.js - Unified Meme Selection & Display System
 *
 * Consolidates all meme logic:
 * - Random meme selection (general, Saylor, boss-specific)
 * - Enemy death memes
 * - Streak milestone memes
 * - Power-up feedback memes
 * - Popup queue management
 *
 * Uses Balance config for timing and probabilities.
 * Uses Constants.MEMES for meme pools.
 */

(function() {
    'use strict';

    const G = window.Game = window.Game || {};

    /**
     * Power-up pickup meme feedback
     * Complete mapping for all weapon and ship types
     */
    const POWERUP_MEMES = {
        // Weapon types
        WIDE: '🔱 SPREAD THE FUD',
        NARROW: '🎯 PRECISION STACKING',
        FIRE: '🔥 BURN THE BANKS',
        SPREAD: '💥 MAXIMUM DISRUPTION',
        HOMING: '🚀 SMART MONEY MISSILES',
        LASER: '⚡ LIGHTNING NETWORK',
        NORMAL: '💪 BACK TO BASICS',

        // Ship power-ups
        SPEED: '⚡ ZOOM ZOOM',
        RAPID: '🔫 UNLIMITED AMMO',
        SHIELD: '🛡️ HODL MODE'
    };

    class MemeEngine {
        constructor() {
            this.lastPopupTime = 0;
            this.currentPriority = 0;
            this.tickerSwapTimer = 0;
            this.isBossActive = false;
        }

        /**
         * Reset meme engine state (call on game start)
         */
        reset() {
            this.lastPopupTime = 0;
            this.currentPriority = 0;
            this.tickerSwapTimer = 0;
            this.isBossActive = false;
        }

        /**
         * Update timers (call each frame)
         * @param {number} dt - Delta time in seconds
         */
        update(dt) {
            this.tickerSwapTimer -= dt;
        }

        /**
         * Set boss active state (affects ticker rotation)
         * @param {boolean} active - Whether boss is active
         */
        setBossActive(active) {
            this.isBossActive = active;
            // Reset ticker timer when boss state changes
            this.tickerSwapTimer = 0;
        }

        // ========================================
        // MEME POOL SELECTION
        // ========================================

        /**
         * Get random meme from general pools (LOW + HIGH + SAYLOR chance)
         * @returns {string} Random meme text
         */
        getRandomMeme() {
            const MEMES = G.MEMES;
            if (!MEMES) return 'HODL';

            const Balance = G.Balance;
            const useSaylor = Math.random() < Balance.MEMES.SAYLOR_PROBABILITY;

            if (useSaylor && MEMES.SAYLOR && MEMES.SAYLOR.length > 0) {
                return MEMES.SAYLOR[Math.floor(Math.random() * MEMES.SAYLOR.length)];
            }

            // Combine LOW and HIGH pools
            const generalPool = [...(MEMES.LOW || []), ...(MEMES.HIGH || [])];
            if (generalPool.length === 0) return 'HODL';

            return generalPool[Math.floor(Math.random() * generalPool.length)];
        }

        /**
         * Get meme for enemy death celebration
         * @returns {string} Fiat death meme text
         */
        getEnemyDeathMeme() {
            const MEMES = G.MEMES;
            if (!MEMES || !MEMES.FIAT_DEATH || MEMES.FIAT_DEATH.length === 0) {
                return 'FIAT DESTROYED';
            }
            return MEMES.FIAT_DEATH[Math.floor(Math.random() * MEMES.FIAT_DEATH.length)];
        }

        /**
         * Get meme for boss fight ticker rotation
         * @param {string} bossType - Optional boss type for specific memes
         * @returns {string} Boss meme text
         */
        getBossMeme(bossType) {
            const MEMES = G.MEMES;
            if (!MEMES) return 'BOSS FIGHT';

            // Route to boss-specific pool if available
            let pool = null;

            switch (bossType) {
                case 'BCE':
                    pool = MEMES.BCE;
                    break;
                case 'BOJ':
                    pool = MEMES.BOJ;
                    break;
                case 'FEDERAL_RESERVE':
                default:
                    pool = MEMES.POWELL;
                    break;
            }

            if (pool && pool.length > 0) {
                return pool[Math.floor(Math.random() * pool.length)];
            }

            // Fallback to general boss memes
            if (MEMES.BOSS && MEMES.BOSS.length > 0) {
                return MEMES.BOSS[Math.floor(Math.random() * MEMES.BOSS.length)];
            }

            return 'INFLATION BOSS FIGHT';
        }

        /**
         * Get Powell-specific meme (for Federal Reserve boss)
         * @returns {string} Powell meme text
         */
        getPowellMeme() {
            const MEMES = G.MEMES;
            if (!MEMES || !MEMES.POWELL || MEMES.POWELL.length === 0) {
                return 'POWELL: MONEY PRINTER GO BRRR';
            }
            return MEMES.POWELL[Math.floor(Math.random() * MEMES.POWELL.length)];
        }

        /**
         * Get streak milestone meme if applicable
         * @param {number} streak - Current kill streak
         * @returns {Object|null} { at, text } or null if no milestone
         */
        getStreakMeme(streak) {
            const Balance = G.Balance;
            return Balance.getStreakMilestone(streak);
        }

        /**
         * Get power-up pickup feedback meme
         * @param {string} powerUpType - Power-up type (WIDE, SPEED, etc.)
         * @returns {string} Feedback meme text
         */
        getPowerUpMeme(powerUpType) {
            return POWERUP_MEMES[powerUpType] || `💫 ${powerUpType} ACTIVATED`;
        }

        // ========================================
        // TICKER MANAGEMENT
        // ========================================

        /**
         * Check if ticker should update and get new meme
         * @param {string} bossType - Current boss type or null
         * @returns {string|null} New meme text or null if no update needed
         */
        checkTickerUpdate(bossType) {
            if (this.tickerSwapTimer > 0) return null;

            const Balance = G.Balance;

            // Set next update interval based on boss state
            if (this.isBossActive) {
                this.tickerSwapTimer = Balance.MEMES.BOSS_TICKER_INTERVAL;
                return this.getBossMeme(bossType);
            } else {
                this.tickerSwapTimer = Balance.MEMES.TICKER_SWAP_INTERVAL;
                return this.getRandomMeme();
            }
        }

        // ========================================
        // POPUP MANAGEMENT
        // ========================================

        /**
         * Check if a popup can be shown based on priority and cooldown
         * @param {string} priorityType - Priority type (MEME, POWERUP, VICTORY, DANGER)
         * @returns {boolean} Whether popup can be shown
         */
        canShowPopup(priorityType) {
            const Balance = G.Balance;
            const now = Date.now();
            const priority = Balance.MEMES.POPUP_PRIORITY[priorityType] || 1;

            // Higher priority can interrupt, same or lower must wait for cooldown
            if (priority > this.currentPriority) {
                return true;
            }

            return now - this.lastPopupTime >= Balance.MEMES.POPUP_COOLDOWN;
        }

        /**
         * Mark popup as shown (call after displaying)
         * @param {string} priorityType - Priority type of shown popup
         */
        markPopupShown(priorityType) {
            const Balance = G.Balance;
            this.lastPopupTime = Date.now();
            this.currentPriority = Balance.MEMES.POPUP_PRIORITY[priorityType] || 1;

            // Reset priority after cooldown
            setTimeout(() => {
                this.currentPriority = 0;
            }, Balance.MEMES.POPUP_COOLDOWN);
        }

        /**
         * Get random color for meme popup
         * @returns {string} Hex color string
         */
        getRandomColor() {
            const colors = G.Balance.MEMES.COLORS;
            return colors[Math.floor(Math.random() * colors.length)];
        }

        /**
         * Get popup duration for type
         * @param {string} type - Popup type (default, powerup, danger)
         * @returns {number} Duration in milliseconds
         */
        getPopupDuration(type) {
            const Balance = G.Balance;
            switch (type) {
                case 'powerup':
                    return Balance.MEMES.POPUP_DURATION_POWERUP;
                case 'danger':
                    return Balance.MEMES.POPUP_DURATION_DANGER;
                default:
                    return Balance.MEMES.POPUP_DURATION_DEFAULT;
            }
        }
    }

    // Create singleton instance
    G.MemeEngine = new MemeEngine();

    // Also expose the class for testing
    G.MemeEngineClass = MemeEngine;

    // Expose POWERUP_MEMES for reference
    G.POWERUP_MEMES = POWERUP_MEMES;
})();
