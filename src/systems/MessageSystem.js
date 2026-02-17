/**
 * MessageSystem.js v5.26.0 - Combat HUD Bar + Canvas Ship Status
 *
 * Channels:
 * 1. COMBAT HUD (DOM) - 48px top bar: transient messages + combat state fill bar
 * 2. SHIP_STATUS (canvas) - Icon+text above player ship
 * 3. WAVE_SWEEP (canvas)  - Horizontal line sweep on wave start
 *
 * Combat state: HYPER/GODCHAIN/HYPERGOD fill bar with countdown
 */

(function() {
    'use strict';

    const G = window.Game = window.Game || {};

    // Screen dimensions (set via init)
    let gameWidth = 0;
    let gameHeight = 0;

    // === DOM STRIP STATE ===
    let stripEl = null;
    let stripTextEl = null;
    let stripFillEl = null;
    let isStripShowing = false;
    let currentStripItem = null;
    let stripHideTimer = null;
    let lastStripShowTime = 0;
    let stripQueue = [];

    // === COMBAT STATE ===
    let _combatType = null;      // 'hyper' | 'godchain' | 'hypergod' | null
    let _combatInterrupted = false; // transient message is interrupting combat display

    // === CANVAS STATE ===

    // SHIP_STATUS: array of status messages near player
    let shipStatuses = [];

    // WAVE_SWEEP: horizontal line sweep
    let waveSweepTimer = 0;
    let waveSweepDuration = 0.3;

    // Callbacks for effects
    let onShake = null;
    let onPlaySound = null;

    // === CONFIG HELPER ===
    function getConfig() {
        return G.Balance?.MESSAGE_STRIP || {};
    }

    /**
     * Initialize message system
     */
    function init(width, height, callbacks = {}) {
        gameWidth = width;
        gameHeight = height;
        onShake = callbacks.onShake || null;
        onPlaySound = callbacks.onPlaySound || null;
        reset();
    }

    /**
     * Cache DOM refs for strip element
     */
    function initDOM() {
        stripEl = document.getElementById('message-strip');
        if (stripEl) {
            stripTextEl = stripEl.querySelector('.strip-text');
            stripFillEl = stripEl.querySelector('.strip-fill');
        }
    }

    /**
     * Update dimensions (for resize)
     */
    function setDimensions(width, height) {
        gameWidth = width;
        gameHeight = height;
    }

    /**
     * Reset all message state
     */
    function reset() {
        shipStatuses = [];
        waveSweepTimer = 0;
        stripQueue = [];
        if (stripHideTimer) {
            clearTimeout(stripHideTimer);
            stripHideTimer = null;
        }
        isStripShowing = false;
        currentStripItem = null;
        _combatType = null;
        _combatInterrupted = false;
        if (stripFillEl) stripFillEl.style.width = '0%';
        if (stripEl) {
            stripEl.className = '';
            stripEl.style.visibility = 'hidden';
            stripEl.style.opacity = '0';
        }
    }

    // ========================================
    // DOM MESSAGE STRIP
    // ========================================

    function _getTypePriority(type) {
        const cfg = getConfig();
        const priorities = cfg.PRIORITIES || { DANGER: 3, VICTORY: 3, WAVE: 2, INFO: 1 };
        return priorities[type.toUpperCase()] || 0;
    }

    function _getTypeDuration(type) {
        const cfg = getConfig();
        const durations = cfg.DURATIONS || { DANGER: 2500, VICTORY: 3000, WAVE: 2500, INFO: 2000 };
        return durations[type.toUpperCase()] || 2000;
    }

    function _queueStripMessage(text, type, opts = {}) {
        const cfg = getConfig();
        if (cfg.ENABLED === false) return;
        if (!stripEl || !stripTextEl) return;

        const priority = _getTypePriority(type);
        const duration = _getTypeDuration(type);
        const item = { text, type, priority, duration, opts };

        if (isStripShowing && currentStripItem) {
            if (priority > currentStripItem.priority) {
                // Higher priority: interrupt immediately
                _interruptStrip(item);
                return;
            }
            // Drop low-priority message if high-pri hasn't reached 60% of its duration
            if (cfg.DROP_LOW_PRIORITY && priority < currentStripItem.priority) {
                const elapsed = Date.now() - lastStripShowTime;
                if (elapsed < currentStripItem.duration * 0.6) {
                    return; // Drop silently
                }
            }
            // Same or lower priority: queue (replace same type in queue)
            const maxQueue = cfg.MAX_QUEUE_SIZE || 3;
            const sameIdx = stripQueue.findIndex(q => q.type === type);
            if (sameIdx >= 0) {
                stripQueue[sameIdx] = item;
            } else if (stripQueue.length < maxQueue) {
                stripQueue.push(item);
            }
            return;
        }

        // Cooldown check
        const cooldown = cfg.COOLDOWN || 300;
        const now = Date.now();
        if (now - lastStripShowTime < cooldown) {
            const maxQueue = cfg.MAX_QUEUE_SIZE || 3;
            if (stripQueue.length < maxQueue) {
                stripQueue.push(item);
            }
            // Schedule processing after cooldown
            setTimeout(() => _processStripQueue(), cooldown - (now - lastStripShowTime));
            return;
        }

        _showStrip(item);
    }

    function _showStrip(item) {
        if (!stripEl || !stripTextEl) return;

        // Combat state active: only high-priority (danger/victory, priority >= 3) can interrupt
        if (_combatType && item.priority < 3) {
            return; // skip — don't interrupt combat bar for wave/info/pickup
        }

        isStripShowing = true;
        currentStripItem = item;
        lastStripShowTime = Date.now();

        // If combat state active and high-priority interrupts, mark interrupted
        if (_combatType && item.priority >= 3) {
            _combatInterrupted = true;
        }

        // Hide fill bar during transient messages
        if (stripFillEl) stripFillEl.style.width = '0%';

        // Set text
        stripTextEl.textContent = item.text;

        // Reset className and force reflow
        stripEl.className = '';
        void stripEl.offsetWidth;

        // Apply type + show
        stripEl.className = 'type-' + item.type + ' show';

        // Screen shake for danger
        if (item.type === 'danger' && item.opts.shakeIntensity && onShake) {
            onShake(item.opts.shakeIntensity);
        }

        // Auto-hide
        if (stripHideTimer) clearTimeout(stripHideTimer);
        stripHideTimer = setTimeout(() => _hideStrip(), item.duration);
    }

    function _hideStrip() {
        if (!stripEl) return;

        const cfg = getConfig();
        const exitMs = cfg.EXIT_MS || 300;

        // Use pulse-fade for transient messages, standard exit otherwise
        const typeClass = currentStripItem ? 'type-' + currentStripItem.type : '';
        stripEl.className = typeClass + ' fade-out';

        stripHideTimer = setTimeout(() => {
            isStripShowing = false;
            currentStripItem = null;
            stripHideTimer = null;

            // If combat state still active, restore combat display instead of hiding
            if (_combatType) {
                _combatInterrupted = false;
                _applyCombatDisplay();
                return;
            }

            stripEl.className = '';
            stripEl.style.visibility = 'hidden';
            stripEl.style.opacity = '0';

            // Reset inline styles in case animation didn't clear
            stripEl.style.removeProperty('visibility');
            stripEl.style.removeProperty('opacity');

            // Process queue
            _processStripQueue();
        }, 500); // match stripPulseFade duration
    }

    function _interruptStrip(item) {
        if (stripHideTimer) {
            clearTimeout(stripHideTimer);
            stripHideTimer = null;
        }
        // Reset and show new immediately
        stripEl.className = '';
        void stripEl.offsetWidth;
        _showStrip(item);
    }

    function _processStripQueue() {
        if (stripQueue.length === 0) return;
        if (isStripShowing) return;

        // Sort by priority desc
        stripQueue.sort((a, b) => b.priority - a.priority);
        const next = stripQueue.shift();
        _showStrip(next);
    }

    // ========================================
    // PUBLIC API: WAVE STRIP (now DOM)
    // ========================================

    /**
     * Show wave strip
     * @param {string} primaryText - e.g. "CYCLE 1 • WAVE 3/5" or "HORDE 2"
     * @param {string} subtitleText - Optional flavor text
     */
    function showWaveStrip(primaryText, subtitleText = '') {
        const Balance = G.Balance;
        if (!Balance?.HUD_MESSAGES?.WAVE_STRIP) return;

        const combined = subtitleText ? primaryText + '  ' + subtitleText : primaryText;
        _queueStripMessage(combined, 'wave');

        // Trigger wave sweep effect
        const reactive = Balance.REACTIVE_HUD;
        if (reactive?.ENABLED && reactive?.WAVE_SWEEP?.ENABLED) {
            waveSweepDuration = reactive.WAVE_SWEEP.DURATION || 0.3;
            waveSweepTimer = waveSweepDuration;
        }
    }

    /**
     * Legacy compatibility: showWaveInfo maps to showWaveStrip
     */
    function showWaveInfo(cycleText, waveText, totalWaves, flavorText = '') {
        showWaveStrip(cycleText + ' \u2022 ' + waveText, flavorText);
    }

    /**
     * Legacy compatibility: showGameInfo maps to strip info
     */
    function showGameInfo(text) {
        _queueStripMessage(text, 'info');
    }

    // ========================================
    // PUBLIC API: ALERT (now DOM strip)
    // ========================================

    /**
     * Show danger alert (red strip, pulse, shake)
     */
    function showDanger(text, shakeIntensity = 20) {
        const Balance = G.Balance;
        if (!Balance?.HUD_MESSAGES?.ALERT_DANGER) return;
        _queueStripMessage(text, 'danger', { shakeIntensity });
    }

    /**
     * Show victory alert (gold strip)
     */
    function showVictory(text) {
        const Balance = G.Balance;
        if (!Balance?.HUD_MESSAGES?.ALERT_VICTORY) return;
        _queueStripMessage(text, 'victory');
    }

    // ========================================
    // PUBLIC API: PICKUP TOAST (v5.4.0)
    // ========================================

    /**
     * Show pickup feedback in message strip (power-up/perk/GODCHAIN)
     * @param {string} text - Pickup feedback text
     */
    function showPickup(text) {
        _queueStripMessage(text, 'pickup');
    }

    // ========================================
    // MEME_WHISPER: no-op (dead code since v4.20)
    // ========================================

    function showMemeWhisper() {}
    function showMemeFun() {}
    function showMemePopup() {}

    // ========================================
    // SHIP_STATUS (canvas, unchanged)
    // ========================================

    function showPowerUp(text) { showShipStatus(text); }

    /**
     * Show status message above player ship
     */
    function showShipStatus(text, icon = '') {
        const Balance = G.Balance;
        if (!Balance?.HUD_MESSAGES?.SHIP_STATUS) return;

        const config = Balance.HUD_MESSAGES.SHIP_STATUS_CONFIG || {};
        const duration = config.DURATION || 2.0;

        // Replace existing (only 1 at a time)
        shipStatuses = [{
            text: icon ? icon + ' ' + text : text,
            life: duration,
            maxLife: duration
        }];
    }

    // ========================================
    // UPDATE & DRAW
    // ========================================

    /**
     * Update timers (only canvas channels need per-frame update)
     */
    function update(dt) {
        // Wave sweep
        if (waveSweepTimer > 0) {
            waveSweepTimer -= dt;
            if (waveSweepTimer < 0) waveSweepTimer = 0;
        }

        // Ship status
        for (let i = shipStatuses.length - 1; i >= 0; i--) {
            shipStatuses[i].life -= dt;
            if (shipStatuses[i].life <= 0) shipStatuses.splice(i, 1);
        }
    }

    /**
     * Draw canvas channels only: WAVE_SWEEP + SHIP_STATUS
     */
    function draw(ctx, totalTime = 0, playerPos = null) {
        const w = gameWidth || 600;
        const h = gameHeight || 800;

        // --- WAVE SWEEP (reactive) ---
        if (waveSweepTimer > 0) {
            const progress = 1 - (waveSweepTimer / waveSweepDuration);
            const sweepY = progress * h;
            const sweepAlpha = G.Balance?.REACTIVE_HUD?.WAVE_SWEEP?.ALPHA || 0.3;

            ctx.save();
            ctx.globalAlpha = sweepAlpha * (1 - progress);
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, sweepY);
            ctx.lineTo(w, sweepY);
            ctx.stroke();
            ctx.restore();
        }

        // --- SHIP_STATUS (above player) ---
        if (playerPos) {
            shipStatuses.forEach(s => {
                const config = G.Balance?.HUD_MESSAGES?.SHIP_STATUS_CONFIG || {};
                const yOff = config.Y_OFFSET || -60;
                const fontSize = config.FONT_SIZE || 11;

                const fadeIn = Math.min(1, (s.maxLife - s.life) / 0.2);
                const fadeOut = Math.min(1, s.life / 0.3);
                const alpha = Math.min(fadeIn, fadeOut);
                // Float upward as it ages
                const floatY = (1 - s.life / s.maxLife) * -15;

                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.font = `bold ${fontSize}px "Press Start 2P", monospace`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                // Black outline for readability
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 3;
                ctx.strokeText(s.text, playerPos.x, playerPos.y + yOff + floatY);
                ctx.fillStyle = '#FFD700';
                ctx.fillText(s.text, playerPos.x, playerPos.y + yOff + floatY);
                ctx.restore();
            });
        }
    }

    /**
     * Check if any messages are active
     */
    function hasActiveMessages() {
        return isStripShowing || stripQueue.length > 0 || shipStatuses.length > 0;
    }

    // ========================================
    // COMBAT STATE API (v5.26)
    // ========================================

    /**
     * Internal: apply combat display to strip (used by setCombatState and after transient hide)
     */
    function _applyCombatDisplay() {
        if (!stripEl || !stripTextEl || !_combatType) return;
        stripEl.className = 'type-combat-' + _combatType + ' show';
        stripEl.style.visibility = 'visible';
        stripEl.style.opacity = '1';
    }

    /**
     * Set combat state — shows persistent fill bar with countdown
     * @param {string} type - 'hyper' | 'godchain' | 'hypergod'
     * @param {number} fillRatio - 0.0 to 1.0 (timeLeft / duration)
     * @param {string} label - Display text (e.g. "⚡ HYPER ×5 8.3s")
     */
    function setCombatState(type, fillRatio, label) {
        if (!stripEl || !stripTextEl) return;

        _combatType = type;
        _combatInterrupted = false;

        // If transient message with priority >= 3 is showing, don't overwrite it
        if (isStripShowing && currentStripItem && currentStripItem.priority >= 3) {
            _combatInterrupted = true;
            return;
        }

        // Cancel any active transient
        if (stripHideTimer) {
            clearTimeout(stripHideTimer);
            stripHideTimer = null;
        }
        isStripShowing = false;
        currentStripItem = null;

        // Show combat display
        stripTextEl.textContent = label;
        if (stripFillEl) stripFillEl.style.width = (fillRatio * 100) + '%';
        _applyCombatDisplay();
    }

    /**
     * Clear combat state — hide strip if no transient is pending
     */
    function clearCombatState() {
        _combatType = null;
        _combatInterrupted = false;
        if (stripFillEl) stripFillEl.style.width = '0%';

        // Only hide if no transient message is showing
        if (!isStripShowing && stripEl) {
            stripEl.className = '';
            stripEl.style.visibility = 'hidden';
            stripEl.style.opacity = '0';
        }
    }

    /**
     * Update combat display each frame (fill ratio + label)
     * @param {string} type - 'hyper' | 'godchain' | 'hypergod'
     * @param {number} fillRatio - 0.0 to 1.0
     * @param {string} label - Display text
     */
    function updateCombatDisplay(type, fillRatio, label) {
        if (!stripEl || !stripTextEl) return;

        // Type changed (e.g. hyper→hypergod) — re-set
        if (_combatType !== type) {
            setCombatState(type, fillRatio, label);
            return;
        }

        // If interrupted by transient, just wait
        if (_combatInterrupted) return;

        // If transient is showing (timer running), don't touch
        if (isStripShowing) return;

        // Update fill + text
        if (stripFillEl) stripFillEl.style.width = (fillRatio * 100) + '%';
        stripTextEl.textContent = label;
    }

    // Export to namespace
    G.MessageSystem = {
        init,
        initDOM,
        setDimensions,
        reset,
        update,
        draw,
        // DOM Strip
        showWaveStrip,
        showWaveInfo,      // Legacy compat
        showGameInfo,      // Legacy compat
        showDanger,
        showVictory,
        // Meme (no-op)
        showMemeWhisper,
        showMemeFun,
        showMemePopup,
        // Pickup toast (v5.4.0)
        showPickup,
        // Canvas: Ship Status
        showShipStatus,
        showPowerUp,       // Legacy compat
        // Combat state (v5.26)
        setCombatState,
        clearCombatState,
        updateCombatDisplay,
        // State
        hasActiveMessages
    };
})();
