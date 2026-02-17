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
        PIERCE: '🔥 PENETRATING POWER',
        NORMAL: '💪 BACK TO BASICS',

        // Ship power-ups
        SPEED: '⚡ ZOOM ZOOM',
        RAPID: '🔫 UNLIMITED AMMO',
        SHIELD: '🛡️ SHIELD UP'
    };

    // Event → tier mapping for queueMeme()
    const EVENT_TIER_MAP = {
        BOSS_DEFEATED:      'CRITICAL',
        MINI_BOSS_DEFEATED: 'CRITICAL',
        DEATH:              'CRITICAL',
        BOSS_SPAWN:         'HIGH',
        MINI_BOSS_SPAWN:    'HIGH',
        UPGRADE:            'HIGH',
        SPECIAL:            'HIGH',
        BOSS_TICKER:        'HIGH',
        MODIFIER:           'NORMAL',
        STREAK:             'NORMAL',
        GRAZE:              'NORMAL'
    };

    class MemeEngine {
        constructor() {
            this.lastPopupTime = 0;
            this.currentPriority = 0;
            this.tickerSwapTimer = 0;
            this.isBossActive = false;
            this._recentMemes = {}; // { context: string[] } — last N memes per context

            // v4.20.0: Priority queue for DOM popup
            this._queue = [];
            this._isShowing = false;
            this._currentItem = null;
            this._hideTimer = null;
            this._lastShowTime = 0;
            this._popup = null;
            this._emojiEl = null;
            this._textEl = null;

            // v5.4.0: Combat suppression
            this._waveStartedAt = 0;

            // v5.25: Status HUD (reuses meme-popup DOM for ship status during gameplay)
            this._statusActive = false;
            this._statusType = '';
            this._statusRemaining = 0;
            this._statusCountdown = false;
            this._statusBaseText = '';
        }

        /**
         * Reset meme engine state (call on game start)
         */
        reset() {
            this.lastPopupTime = 0;
            this.currentPriority = 0;
            this.tickerSwapTimer = 0;
            this.isBossActive = false;
            this._recentMemes = {};

            // v4.20.0: Clear popup queue and hide
            this._queue = [];
            this._isShowing = false;
            this._currentItem = null;
            this._lastShowTime = 0;
            this._waveStartedAt = 0;
            this._statusActive = false;
            this._statusType = '';
            this._statusRemaining = 0;
            this._statusCountdown = false;
            this._statusBaseText = '';
            if (this._hideTimer) {
                clearTimeout(this._hideTimer);
                this._hideTimer = null;
            }
            if (this._popup) {
                this._popup.className = '';
            }
        }

        /**
         * Update timers (call each frame)
         * @param {number} dt - Delta time in seconds
         */
        update(dt) {
            this.tickerSwapTimer -= dt;

            // v5.25: Status HUD countdown
            if (this._statusActive && this._statusRemaining > 0) {
                this._statusRemaining -= dt;
                if (this._statusCountdown && this._textEl) {
                    if (this._statusRemaining > 0) {
                        this._textEl.textContent = this._statusBaseText + ' ' + this._statusRemaining.toFixed(1) + 's';
                    }
                }
                if (this._statusRemaining <= 0) {
                    this.hideStatus();
                }
            }
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
        // DEDUPLICATION SYSTEM v4.6
        // ========================================

        /**
         * Pick a meme from pool avoiding recent picks for this context
         * @param {string[]} pool - Array of meme strings
         * @param {string} context - Context key for tracking (e.g., 'intermission', 'whisper')
         * @param {number} count - How many recent memes to track (default 8)
         * @returns {string} Deduplicated meme pick
         */
        _pickDeduplicated(pool, context, count = 8) {
            if (!pool || pool.length === 0) return 'HODL';

            if (!this._recentMemes[context]) {
                this._recentMemes[context] = [];
            }
            const recents = this._recentMemes[context];

            // Filter out recently used memes
            let available = pool.filter(m => !recents.includes(m));

            // If all filtered out, reset recents for this context
            if (available.length === 0) {
                this._recentMemes[context] = [];
                available = pool;
            }

            const pick = available[Math.floor(Math.random() * available.length)];

            // Track this pick
            recents.push(pick);
            if (recents.length > count) recents.shift();

            return pick;
        }

        /**
         * Get meme for intermission countdown (curated pool, deduplicated)
         * @returns {string} Intermission meme text
         */
        getIntermissionMeme() {
            const MEMES = G.MEMES;
            if (!MEMES || !MEMES.INTERMISSION || MEMES.INTERMISSION.length === 0) {
                return this.getRandomMeme();
            }
            return this._pickDeduplicated(MEMES.INTERMISSION, 'intermission');
        }

        /**
         * Get meme for whisper channel (LOW pool, deduplicated)
         * @returns {string} Whisper meme text
         */
        getWhisperMeme() {
            const MEMES = G.MEMES;
            if (!MEMES || !MEMES.LOW || MEMES.LOW.length === 0) return 'HODL';
            return this._pickDeduplicated(MEMES.LOW, 'whisper');
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
        // COMBAT SUPPRESSION v5.4.0
        // ========================================

        /**
         * Mark wave start time (call when a new wave begins)
         */
        setWaveStartTime() {
            this._waveStartedAt = Date.now();
        }

        /**
         * Check if memes should be suppressed (combat active, grace period expired)
         * @returns {boolean} true if memes should be dropped
         */
        isSuppressed() {
            const config = G.Balance?.MEME_POPUP;
            if (!config || !config.COMBAT_SUPPRESSION) return false;

            // Don't suppress outside PLAY state (INTERMISSION, INTRO, etc.)
            if (!G.GameState || !G.GameState.is('PLAY')) return false;

            // Grace period after wave start
            const elapsed = (Date.now() - this._waveStartedAt) / 1000;
            if (elapsed < (config.WAVE_GRACE_PERIOD || 2.0)) return false;

            // Combat active — suppress
            return true;
        }

        // ========================================
        // STATUS HUD v5.25 — Ship status in meme-popup area
        // ========================================

        /**
         * Show ship status in meme-popup area (replaces meme during gameplay)
         * @param {string} text - Status text (e.g. "HOMING", "FIRE PERK")
         * @param {string} icon - Icon/emoji prefix
         * @param {string} statusType - CSS class suffix (fire/laser/electric/homing/pierce/missile/shield/speed/upgrade/godchain)
         * @param {number} duration - Display duration in seconds
         * @param {boolean} countdown - If true, show remaining time countdown
         */
        showStatus(text, icon, statusType, duration, countdown) {
            if (!this._popup || !this._textEl) return;

            // Cancel any active meme
            if (this._isShowing) {
                if (this._hideTimer) { clearTimeout(this._hideTimer); this._hideTimer = null; }
                this._isShowing = false;
                this._currentItem = null;
                this._queue = [];
            }

            this._statusActive = true;
            this._statusType = statusType;
            this._statusRemaining = duration;
            this._statusCountdown = !!countdown;
            this._statusBaseText = text;

            this._emojiEl.textContent = icon;
            this._textEl.textContent = countdown ? text + ' ' + duration.toFixed(1) + 's' : text;

            this._popup.className = '';
            void this._popup.offsetWidth;
            this._popup.className = 'status-' + statusType + ' show';
        }

        /**
         * Hide active status display
         */
        hideStatus() {
            if (!this._statusActive) return;
            const cls = 'status-' + this._statusType;
            this._statusActive = false;
            this._statusType = '';
            this._statusRemaining = 0;
            this._statusCountdown = false;

            if (!this._popup) return;
            this._popup.className = cls + ' hide';
            setTimeout(() => {
                if (this._popup && !this._statusActive && !this._isShowing) {
                    this._popup.className = '';
                }
            }, 250);
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

        // ========================================
        // DOM POPUP SYSTEM v4.20.0
        // ========================================

        /**
         * Cache DOM references for popup. Call once after DOM is ready.
         */
        initDOM() {
            this._popup = document.getElementById('meme-popup');
            if (this._popup) {
                this._emojiEl = this._popup.querySelector('.meme-emoji');
                this._textEl = this._popup.querySelector('.meme-text');
            }
        }

        /**
         * Public API: queue a meme for display
         * @param {string} event - Event type (BOSS_DEFEATED, STREAK, GRAZE, etc.)
         * @param {string} text - Meme text to display
         * @param {string} emoji - Emoji prefix (optional)
         */
        queueMeme(event, text, emoji) {
            if (!this._popup || !text) return;

            const config = G.Balance?.MEME_POPUP;
            if (!config || !config.ENABLED) return;

            const tier = EVENT_TIER_MAP[event] || 'NORMAL';

            // v5.25: During PLAY, meme-popup is reserved for status HUD.
            // Redirect CRITICAL memes to message-strip, drop the rest.
            if (G.GameState && G.GameState.is('PLAY')) {
                if (tier === 'CRITICAL' && G.MessageSystem) {
                    // Boss defeated → victory strip, Death → danger strip
                    if (event === 'BOSS_DEFEATED' || event === 'MINI_BOSS_DEFEATED') {
                        G.MessageSystem.showVictory(text);
                    } else {
                        G.MessageSystem.showDanger(text);
                    }
                }
                return;
            }

            // v5.4.0: Suppress non-critical memes during combat (non-PLAY states like INTERMISSION)
            if (tier !== 'CRITICAL' && this.isSuppressed()) return;

            const priority = config.PRIORITIES[tier] || 1;
            const duration = config.DURATIONS[event] || 2000;

            const item = { event, text, emoji: emoji || '', tier, priority, duration };

            // CRITICAL interrupts immediately
            if (tier === 'CRITICAL' && this._isShowing) {
                this._interruptCurrent(item);
                return;
            }

            // Enforce cooldown for non-critical
            const now = Date.now();
            const cooldown = config.COOLDOWNS[tier] || 0;
            if (this._isShowing && (now - this._lastShowTime) < cooldown) {
                // Queue if room
                if (this._queue.length < config.MAX_QUEUE_SIZE) {
                    this._queue.push(item);
                }
                return;
            }

            if (this._isShowing) {
                // Queue it
                if (this._queue.length < config.MAX_QUEUE_SIZE) {
                    this._queue.push(item);
                }
                return;
            }

            this._showPopup(item);
        }

        /**
         * Process next item in queue (priority-sorted, FIFO within same priority)
         */
        _processQueue() {
            if (this._queue.length === 0) return;

            // Sort by priority descending (stable: FIFO within same priority)
            this._queue.sort((a, b) => b.priority - a.priority);

            const next = this._queue.shift();
            this._showPopup(next);
        }

        /**
         * Show a popup item
         * @param {Object} item - { text, emoji, tier, duration }
         */
        _showPopup(item) {
            if (!this._popup) return;

            this._isShowing = true;
            this._currentItem = item;
            this._lastShowTime = Date.now();

            // Set content
            this._textEl.textContent = item.text;
            this._emojiEl.textContent = item.emoji || '';

            // Set tier class
            this._popup.className = 'tier-' + item.tier.toLowerCase() + ' show';

            // Schedule hide
            this._hideTimer = setTimeout(() => {
                this._hidePopup();
            }, item.duration);
        }

        /**
         * Hide current popup with exit animation, then process queue
         */
        _hidePopup() {
            if (!this._popup) return;

            this._hideTimer = null;
            const tierClass = this._currentItem ? 'tier-' + this._currentItem.tier.toLowerCase() : '';

            this._popup.className = tierClass + ' hide';

            // After exit animation (250ms), clean up and process next
            setTimeout(() => {
                this._popup.className = '';
                this._isShowing = false;
                this._currentItem = null;
                this._processQueue();
            }, 250);
        }

        /**
         * Interrupt current popup for a higher-priority item
         * @param {Object} item - New item to show immediately
         */
        _interruptCurrent(item) {
            if (this._hideTimer) {
                clearTimeout(this._hideTimer);
                this._hideTimer = null;
            }

            // Force reset without animation
            this._popup.className = '';
            this._isShowing = false;
            this._currentItem = null;

            // Force reflow to restart animation
            void this._popup.offsetWidth;

            this._showPopup(item);
        }
    }

    // Create singleton instance
    G.MemeEngine = new MemeEngine();

    // Also expose the class for testing
    G.MemeEngineClass = MemeEngine;

    // Expose POWERUP_MEMES for reference
    G.POWERUP_MEMES = POWERUP_MEMES;
})();
