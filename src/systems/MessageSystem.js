/**
 * MessageSystem.js v4.4 - 5-Channel Message System
 *
 * Channels:
 * 1. WAVE_STRIP   - Full-width transparent strip for wave/horde info
 * 2. ALERT        - Colored center box (danger=red, victory=gold) - unchanged
 * 3. MEME_WHISPER - Tiny italic canvas text, decorative flavor
 * 4. SHIP_STATUS  - Icon+text above player ship
 * 5. FLOATING_TEXT - Opt-in score numbers (managed externally, toggle only)
 *
 * All rendering is canvas-based (no DOM popups).
 */

(function() {
    'use strict';

    const G = window.Game = window.Game || {};

    // Screen dimensions (set via init)
    let gameWidth = 0;
    let gameHeight = 0;

    // Meme colors for whispers
    const MEME_COLORS = ['#00FFFF', '#FF00FF', '#00FF00', '#FFD700', '#FF6B6B', '#4ECDC4'];

    // === CHANNEL STATE ===

    // WAVE_STRIP: single active strip
    let waveStrip = null;
    // { primaryText, subtitleText, life, maxLife }

    // ALERT: danger + victory (same as before)
    let dangerMessages = [];
    let victoryMessages = [];

    // MEME_WHISPER: array of floating whispers
    let whispers = [];

    // SHIP_STATUS: array of status messages near player
    let shipStatuses = [];

    // WAVE_SWEEP: horizontal line sweep
    let waveSweepTimer = 0;
    let waveSweepDuration = 0.3;

    // Callbacks for effects
    let onShake = null;
    let onPlaySound = null;

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
        waveStrip = null;
        dangerMessages = [];
        victoryMessages = [];
        whispers = [];
        shipStatuses = [];
        waveSweepTimer = 0;
    }

    // ========================================
    // CHANNEL 1: WAVE_STRIP
    // ========================================

    /**
     * Show wave strip (replaces showWaveInfo + showGameInfo)
     * @param {string} primaryText - e.g. "CYCLE 1 • WAVE 3/5" or "HORDE 2"
     * @param {string} subtitleText - Optional flavor text
     */
    function showWaveStrip(primaryText, subtitleText = '') {
        const Balance = G.Balance;
        if (!Balance?.HUD_MESSAGES?.WAVE_STRIP) return;

        const config = Balance.HUD_MESSAGES.WAVE_STRIP_CONFIG || {};
        const duration = config.DURATION || 2.5;

        waveStrip = {
            primaryText: primaryText,
            subtitleText: subtitleText,
            life: duration,
            maxLife: duration
        };

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
     * Legacy compatibility: showGameInfo maps to showWaveStrip
     */
    function showGameInfo(text) {
        showWaveStrip(text);
    }

    // ========================================
    // CHANNEL 2: ALERT (danger + victory)
    // ========================================

    /**
     * Show danger alert (red, center, pulsing)
     */
    function showDanger(text, shakeIntensity = 20) {
        const Balance = G.Balance;
        if (!Balance?.HUD_MESSAGES?.ALERT_DANGER) return;
        dangerMessages = [{ text, life: 2.5, maxLife: 2.5 }];
        if (onShake && shakeIntensity > 0) onShake(shakeIntensity);
    }

    /**
     * Show victory alert (gold, center)
     */
    function showVictory(text) {
        const Balance = G.Balance;
        if (!Balance?.HUD_MESSAGES?.ALERT_VICTORY) return;
        victoryMessages = [{ text, life: 3.0, maxLife: 3.0 }];
    }

    // ========================================
    // CHANNEL 3: MEME_WHISPER
    // ========================================

    /**
     * Show a meme whisper (small italic drifting text)
     * Replaces showMemeFun / showMemePopup
     */
    function showMemeWhisper(text) {
        const Balance = G.Balance;
        if (!Balance?.HUD_MESSAGES?.MEME_WHISPER) return;

        const config = Balance.HUD_MESSAGES.MEME_WHISPER_CONFIG || {};
        const maxOnScreen = config.MAX_ON_SCREEN || 2;

        // Cap whispers on screen
        if (whispers.length >= maxOnScreen) {
            // Remove oldest
            whispers.shift();
        }

        const margin = 60;
        const spawnX = margin + Math.random() * (gameWidth - margin * 2);
        const spawnY = gameHeight * (config.SPAWN_Y_RATIO || 0.60);

        whispers.push({
            text: text,
            x: spawnX,
            y: spawnY,
            life: config.LIFETIME || 3.0,
            maxLife: config.LIFETIME || 3.0,
            color: MEME_COLORS[Math.floor(Math.random() * MEME_COLORS.length)],
            alpha: config.ALPHA || 0.45,
            driftSpeed: config.DRIFT_SPEED || 15
        });
    }

    /**
     * Legacy compatibility aliases
     */
    function showMemeFun(text, duration) { showMemeWhisper(text); }
    function showMemePopup(text, duration) { showMemeWhisper(text); }
    function showPowerUp(text) { showShipStatus(text); }

    // ========================================
    // CHANNEL 4: SHIP_STATUS
    // ========================================

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
     * Update all message timers
     */
    function update(dt) {
        // Wave strip
        if (waveStrip) {
            waveStrip.life -= dt;
            if (waveStrip.life <= 0) waveStrip = null;
        }

        // Wave sweep
        if (waveSweepTimer > 0) {
            waveSweepTimer -= dt;
            if (waveSweepTimer < 0) waveSweepTimer = 0;
        }

        // Danger
        for (let i = dangerMessages.length - 1; i >= 0; i--) {
            dangerMessages[i].life -= dt;
            if (dangerMessages[i].life <= 0) dangerMessages.splice(i, 1);
        }

        // Victory
        for (let i = victoryMessages.length - 1; i >= 0; i--) {
            victoryMessages[i].life -= dt;
            if (victoryMessages[i].life <= 0) victoryMessages.splice(i, 1);
        }

        // Whispers
        for (let i = whispers.length - 1; i >= 0; i--) {
            const w = whispers[i];
            w.life -= dt;
            w.y -= w.driftSpeed * dt; // Drift upward
            if (w.life <= 0) whispers.splice(i, 1);
        }

        // Ship status
        for (let i = shipStatuses.length - 1; i >= 0; i--) {
            shipStatuses[i].life -= dt;
            if (shipStatuses[i].life <= 0) shipStatuses.splice(i, 1);
        }
    }

    /**
     * Draw all message channels
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} totalTime - For animations
     * @param {Object} playerPos - {x, y} player position for SHIP_STATUS
     */
    function draw(ctx, totalTime = 0, playerPos = null) {
        const w = gameWidth || 600;
        const h = gameHeight || 800;
        const cx = w / 2;

        // --- WAVE_STRIP ---
        if (waveStrip) {
            const config = G.Balance?.HUD_MESSAGES?.WAVE_STRIP_CONFIG || {};
            const stripY = config.Y || 95;
            const stripH = config.HEIGHT || 28;
            const fontSize = config.FONT_SIZE || 14;
            const subSize = config.SUBTITLE_SIZE || 10;
            const bgAlpha = config.BG_ALPHA || 0.5;

            // Fade in/out
            const fadeIn = Math.min(1, (waveStrip.maxLife - waveStrip.life) / 0.3);
            const fadeOut = Math.min(1, waveStrip.life / 0.5);
            const alpha = Math.min(fadeIn, fadeOut);

            ctx.save();
            ctx.globalAlpha = alpha;

            // Transparent strip background (no border)
            ctx.fillStyle = `rgba(0, 0, 0, ${bgAlpha})`;
            ctx.fillRect(0, stripY - stripH / 2, w, stripH);

            // Primary text (white/gold)
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = `bold ${fontSize}px "Press Start 2P", monospace`;
            ctx.fillStyle = '#FFD700';

            let textY = stripY;
            if (waveStrip.subtitleText) {
                textY = stripY - 4;
            }
            ctx.fillText(waveStrip.primaryText, cx, textY);

            // Subtitle (lighter, smaller)
            if (waveStrip.subtitleText) {
                ctx.font = `${subSize}px "Press Start 2P", monospace`;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
                ctx.fillText(waveStrip.subtitleText, cx, stripY + 9);
            }

            ctx.restore();
        }

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

        // --- ALERT: DANGER ---
        dangerMessages.forEach(m => {
            const alpha = Math.min(1, m.life);
            const pulse = Math.sin(totalTime * 10) * 0.3 + 0.7;
            const y = h / 2 - 30;

            ctx.save();
            ctx.globalAlpha = alpha;

            const maxBoxWidth = w - 40;
            let fontSize = 28;
            ctx.font = `bold ${fontSize}px "Press Start 2P", monospace`;
            let textWidth = ctx.measureText(m.text).width || 300;

            while (textWidth + 60 > maxBoxWidth && fontSize > 14) {
                fontSize -= 2;
                ctx.font = `bold ${fontSize}px "Press Start 2P", monospace`;
                textWidth = ctx.measureText(m.text).width;
            }

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const boxWidth = Math.min(textWidth + 60, maxBoxWidth);
            const boxHeight = fontSize + 22;

            ctx.fillStyle = `rgba(80, 0, 0, ${0.9 * pulse})`;
            ctx.strokeStyle = '#FF0000';
            ctx.lineWidth = 4 + pulse * 2;
            ctx.fillRect(cx - boxWidth / 2, y - boxHeight / 2, boxWidth, boxHeight);
            ctx.strokeRect(cx - boxWidth / 2, y - boxHeight / 2, boxWidth, boxHeight);

            ctx.fillStyle = '#FF4444';
            ctx.shadowColor = '#FF0000';
            ctx.shadowBlur = 15;
            ctx.fillText(m.text, cx, y);
            ctx.restore();
        });

        // --- ALERT: VICTORY ---
        victoryMessages.forEach(m => {
            const alpha = Math.min(1, m.life);
            const scale = 1 + Math.sin(totalTime * 5) * 0.05;
            const y = h / 2;

            ctx.save();
            ctx.globalAlpha = alpha;

            const maxBoxWidth = w - 40;
            let fontSize = 32;
            ctx.font = `bold ${fontSize}px "Press Start 2P", monospace`;
            let textWidth = ctx.measureText(m.text).width || 300;

            while (textWidth + 60 > maxBoxWidth && fontSize > 16) {
                fontSize -= 2;
                ctx.font = `bold ${fontSize}px "Press Start 2P", monospace`;
                textWidth = ctx.measureText(m.text).width;
            }

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const boxWidth = Math.min(textWidth + 60, maxBoxWidth);
            const boxHeight = fontSize + 28;

            ctx.translate(cx, y);
            ctx.scale(scale, scale);

            ctx.fillStyle = 'rgba(50, 40, 0, 0.9)';
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 3;
            ctx.fillRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight);
            ctx.strokeRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight);

            ctx.fillStyle = '#FFD700';
            ctx.shadowColor = '#FFD700';
            ctx.shadowBlur = 20;
            ctx.fillText(m.text, 0, 0);
            ctx.restore();
        });

        // --- MEME_WHISPER ---
        whispers.forEach(w => {
            const lifeRatio = w.life / w.maxLife;
            const alpha = w.alpha * lifeRatio;

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.font = `italic ${G.Balance?.HUD_MESSAGES?.MEME_WHISPER_CONFIG?.FONT_SIZE || 13}px "Courier New", monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = w.color;
            ctx.fillText(w.text, w.x, w.y);
            ctx.restore();
        });

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
        return !!waveStrip || dangerMessages.length > 0 || victoryMessages.length > 0 ||
               whispers.length > 0 || shipStatuses.length > 0;
    }

    // Export to namespace
    G.MessageSystem = {
        init,
        setDimensions,
        reset,
        update,
        draw,
        // Channel 1: Wave Strip
        showWaveStrip,
        showWaveInfo,      // Legacy compat
        showGameInfo,      // Legacy compat
        // Channel 2: Alert
        showDanger,
        showVictory,
        // Channel 3: Meme Whisper
        showMemeWhisper,
        showMemeFun,       // Legacy compat
        showMemePopup,     // Legacy compat
        // Channel 4: Ship Status
        showShipStatus,
        showPowerUp,       // Legacy compat
        // State
        hasActiveMessages
    };
})();
