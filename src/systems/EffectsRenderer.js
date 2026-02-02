/**
 * EffectsRenderer.js - Centralized screen effects rendering
 *
 * Handles visual juice effects: screen flash, shake, score pulse, overlays.
 * Extracted from main.js for modularity.
 */

(function() {
    'use strict';

    const G = window.Game = window.Game || {};

    // Screen dimensions (set via init)
    let gameWidth = 0;
    let gameHeight = 0;

    // Screen shake
    let shake = 0;

    // Impact flash (red)
    let flashRed = 0;

    // Screen flash system (JUICE)
    let screenFlashTimer = 0;
    let screenFlashColor = '#FFFFFF';
    let screenFlashOpacity = 0;
    let screenFlashMaxOpacity = 0;
    let screenFlashDuration = 0;

    // Score pulse system (JUICE)
    let scorePulseTimer = 0;
    let lastScorePulseThreshold = 0;

    // Hit stop system
    let hitStopTimer = 0;
    let hitStopFreeze = false;

    /**
     * Initialize effects system with canvas dimensions
     */
    function init(width, height) {
        gameWidth = width;
        gameHeight = height;
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
     * Reset all effect states
     */
    function reset() {
        shake = 0;
        flashRed = 0;
        screenFlashTimer = 0;
        screenFlashOpacity = 0;
        scorePulseTimer = 0;
        lastScorePulseThreshold = 0;
        hitStopTimer = 0;
        hitStopFreeze = false;
    }

    /**
     * Apply screen shake
     * @param {number} intensity - Shake intensity (pixels)
     */
    function applyShake(intensity) {
        shake = Math.max(shake, intensity);
    }

    /**
     * Apply impact flash (red overlay)
     * @param {number} intensity - Flash intensity (0-1)
     */
    function applyImpactFlash(intensity) {
        flashRed = Math.max(flashRed, intensity);
    }

    /**
     * Apply hit stop effect (micro-freeze for impact)
     * @param {string} type - Type from Balance.JUICE.HIT_STOP
     * @param {boolean} freeze - True for complete freeze, false for slowmo
     */
    function applyHitStop(type, freeze = true) {
        const Balance = G.Balance;
        const duration = Balance?.JUICE?.HIT_STOP?.[type] || 0.02;
        if (duration > hitStopTimer) {
            hitStopTimer = duration;
            hitStopFreeze = freeze;
        }
    }

    /**
     * Trigger screen flash effect
     * @param {string} type - Type from Balance.JUICE.FLASH
     */
    function triggerScreenFlash(type) {
        const Balance = G.Balance;
        const flash = Balance?.JUICE?.FLASH?.[type];
        if (!flash) return;

        screenFlashColor = flash.color;
        screenFlashMaxOpacity = flash.opacity;
        screenFlashDuration = flash.duration;
        screenFlashTimer = flash.duration;
        screenFlashOpacity = flash.opacity;
    }

    /**
     * Trigger score pulse effect based on score thresholds
     * @param {number} score - Current score
     */
    function checkScorePulse(score) {
        const Balance = G.Balance;
        const threshold = Balance?.JUICE?.SCORE_PULSE?.THRESHOLD || 10000;
        const newThreshold = Math.floor(score / threshold) * threshold;

        if (newThreshold > lastScorePulseThreshold && lastScorePulseThreshold > 0) {
            scorePulseTimer = Balance?.JUICE?.SCORE_PULSE?.DURATION || 0.25;
        }
        lastScorePulseThreshold = newThreshold;
    }

    /**
     * Directly trigger score pulse effect
     */
    function triggerScorePulse() {
        const Balance = G.Balance;
        scorePulseTimer = Balance?.JUICE?.SCORE_PULSE?.DURATION || 0.25;
    }

    /**
     * Set hit stop timer directly (for death sequences)
     * @param {number} duration - Duration in seconds
     * @param {boolean} freeze - True for freeze, false for slowmo
     */
    function setHitStop(duration, freeze = true) {
        hitStopTimer = duration;
        hitStopFreeze = freeze;
    }

    /**
     * Update effect timers
     * @param {number} dt - Delta time in seconds
     * @returns {Object} Modified dt values for hit stop
     */
    function update(dt) {
        // Screen shake decay
        if (shake > 0) shake -= 1;

        // Impact flash decay
        if (flashRed > 0) flashRed -= 0.02;

        // Screen flash decay
        if (screenFlashTimer > 0) {
            screenFlashTimer -= dt;
            screenFlashOpacity = screenFlashMaxOpacity * (screenFlashTimer / screenFlashDuration);
            if (screenFlashTimer < 0) {
                screenFlashTimer = 0;
                screenFlashOpacity = 0;
            }
        }

        // Score pulse decay
        if (scorePulseTimer > 0) {
            scorePulseTimer -= dt;
            if (scorePulseTimer < 0) scorePulseTimer = 0;
        }

        // Hit stop processing
        let modifiedDt = dt;
        if (hitStopTimer > 0) {
            hitStopTimer -= dt;
            if (hitStopFreeze) {
                modifiedDt = 0; // Complete freeze
            } else {
                modifiedDt *= 0.25; // Slowmo (25% speed)
            }
            if (hitStopTimer < 0) hitStopTimer = 0;
        }

        return { dt: modifiedDt, realDt: dt };
    }

    /**
     * Apply screen shake transform (call at start of draw)
     * @param {CanvasRenderingContext2D} ctx
     */
    function applyShakeTransform(ctx) {
        if (shake > 0) {
            const dx = (Math.random() - 0.5) * shake;
            const dy = (Math.random() - 0.5) * shake;
            ctx.translate(dx, dy);
        }
    }

    /**
     * Draw impact flash overlay
     * @param {CanvasRenderingContext2D} ctx
     */
    function drawImpactFlash(ctx) {
        if (flashRed > 0) {
            ctx.fillStyle = `rgba(255, 0, 0, ${flashRed})`;
            ctx.fillRect(-20, -20, gameWidth + 40, gameHeight + 40);
        }
    }

    /**
     * Draw screen flash overlay (JUICE)
     * @param {CanvasRenderingContext2D} ctx
     */
    function drawScreenFlash(ctx) {
        if (screenFlashOpacity > 0) {
            ctx.fillStyle = screenFlashColor;
            ctx.globalAlpha = screenFlashOpacity;
            ctx.fillRect(-20, -20, gameWidth + 40, gameHeight + 40);
            ctx.globalAlpha = 1;
        }
    }

    /**
     * Draw score pulse edge glow (JUICE)
     * @param {CanvasRenderingContext2D} ctx
     */
    function drawScorePulse(ctx) {
        if (scorePulseTimer <= 0) return;

        const Balance = G.Balance;
        const pulseConfig = Balance?.JUICE?.SCORE_PULSE || {};
        const maxDuration = pulseConfig.DURATION || 0.25;
        const progress = scorePulseTimer / maxDuration;
        const glowColor = pulseConfig.GLOW_COLOR || '#FFD700';

        // Create radial gradient for edge glow (reverse vignette)
        const gradient = ctx.createRadialGradient(
            gameWidth / 2, gameHeight / 2, Math.min(gameWidth, gameHeight) * 0.4,
            gameWidth / 2, gameHeight / 2, Math.max(gameWidth, gameHeight) * 0.8
        );
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, glowColor);

        ctx.globalAlpha = 0.4 * progress;
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, gameWidth, gameHeight);
        ctx.globalAlpha = 1;
    }

    /**
     * Draw mode overlay (HYPER golden tint)
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} totalTime - Total elapsed time for animation
     */
    function drawHyperOverlay(ctx, totalTime) {
        const hyperPulse = Math.sin(totalTime * 6) * 0.05 + 0.15;
        ctx.fillStyle = `rgba(255, 200, 0, ${hyperPulse})`;
        ctx.fillRect(-20, -20, gameWidth + 40, gameHeight + 40);
    }

    /**
     * Draw sacrifice mode overlay (white ethereal)
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} totalTime - Total elapsed time for animation
     */
    function drawSacrificeOverlay(ctx, totalTime) {
        const sacrificePulse = Math.sin(totalTime * 4) * 0.03 + 0.08;
        ctx.fillStyle = `rgba(255, 255, 255, ${sacrificePulse})`;
        ctx.fillRect(-20, -20, gameWidth + 40, gameHeight + 40);
    }

    /**
     * Draw vignette effect
     * @param {CanvasRenderingContext2D} ctx
     * @param {string} color - Vignette color (rgba format)
     * @param {number} intensity - Intensity 0-1
     */
    function drawVignette(ctx, color = 'rgba(0,0,0,0.6)', intensity = 1) {
        const gradient = ctx.createRadialGradient(
            gameWidth / 2, gameHeight / 2, 0,
            gameWidth / 2, gameHeight / 2, gameWidth * 0.7
        );
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        gradient.addColorStop(1, color);
        ctx.globalAlpha = intensity;
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, gameWidth, gameHeight);
        ctx.globalAlpha = 1;
    }

    // Getters for state inspection
    function getShake() { return shake; }
    function getHitStopTimer() { return hitStopTimer; }
    function isHitStopActive() { return hitStopTimer > 0; }

    // Export to namespace
    G.EffectsRenderer = {
        init,
        setDimensions,
        reset,
        update,
        // Triggers
        applyShake,
        applyImpactFlash,
        applyHitStop,
        setHitStop,
        triggerScreenFlash,
        triggerScorePulse,
        checkScorePulse,
        // Drawing
        applyShakeTransform,
        drawImpactFlash,
        drawScreenFlash,
        drawScorePulse,
        drawHyperOverlay,
        drawSacrificeOverlay,
        drawVignette,
        // State
        getShake,
        getHitStopTimer,
        isHitStopActive
    };

    // Also expose key functions globally for backward compatibility
    G.applyHitStop = applyHitStop;
    G.triggerScreenFlash = triggerScreenFlash;
})();
