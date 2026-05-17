/**
 * GlowManager.js - Centralized glow pass and screen shake management
 *
 * v7.13.0: Provides convenience wrappers for:
 *   A) Batched glow passes — auto save/restore with 'lighter' composite
 *   B) Directional screen shake with decay profiles
 *   C) Glow type enable/disable queries from BalanceConfig
 *
 * Integrates with the existing EffectsRenderer and DrawPipeline.
 */

(function() {
    'use strict';

    const G = window.Game = window.Game || {};

    /**
     * Execute a batched additive glow pass.
     * Wraps the callback in ctx.save() / 'lighter' / ctx.restore().
     * @param {CanvasRenderingContext2D} ctx
     * @param {function(CanvasRenderingContext2D):void} drawFn - Called with ctx in lighter mode
     */
    function executeGlowPass(ctx, drawFn) {
        if (!isGloballyEnabled()) return;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        try {
            drawFn(ctx);
        } finally {
            ctx.restore();
        }
    }

    /**
     * Check if glow effects are globally enabled
     * @returns {boolean}
     */
    function isGloballyEnabled() {
        return !!(G.Balance && G.Balance.GLOW && G.Balance.GLOW.ENABLED);
    }

    /**
     * Check if a specific glow type is enabled
     * @param {string} type - 'ENEMY', 'BULLET', 'PARTICLES', 'POWERUP', 'AURA'
     * @returns {boolean}
     */
    function isTypeEnabled(type) {
        if (!isGloballyEnabled()) return false;
        const cfg = G.Balance.GLOW[type];
        return !!(cfg && cfg.ENABLED);
    }

    /**
     * Apply screen shake with optional direction and decay profile.
     * Enhanced version of EffectsRenderer.applyShakeTransform.
     *
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} intensity - Shake magnitude in pixels
     * @param {Object} [opts]
     * @param {string} [opts.direction='radial'] - 'radial', 'horizontal', or 'vertical'
     * @param {string} [opts.profile='sharp'] - 'sharp' (×0.85/frame) or 'sustain' (×0.98/frame)
     *
     * Note: The profile affects how quickly shake decays in EffectsRenderer.update().
     * This function only applies the current frame's transform offset.
     */
    function applyShakeTransform(ctx, intensity, opts) {
        if (!intensity || intensity <= 0) return;

        const dir = (opts && opts.direction) || 'radial';
        let dx = 0, dy = 0;

        switch (dir) {
            case 'horizontal':
                dx = (Math.random() - 0.5) * intensity;
                break;
            case 'vertical':
                dy = (Math.random() - 0.5) * intensity;
                break;
            case 'radial':
            default:
                dx = (Math.random() - 0.5) * intensity;
                dy = (Math.random() - 0.5) * intensity;
                break;
        }

        ctx.translate(dx, dy);
    }

    /**
     * Calculate decay multiplier based on profile
     * @param {string} [profile='sharp']
     * @param {number} dt - Delta time in seconds
     * @returns {number} Multiplier to apply to shake value per frame
     */
    function getDecayMultiplier(profile, dt) {
        const p = profile || 'sharp';
        // ~60 updates/sec base, frame-rate independent
        if (p === 'sustain') return Math.pow(0.98, dt * 60);
        return Math.pow(0.85, dt * 60); // 'sharp' (default)
    }

    // Export
    G.GlowManager = {
        executeGlowPass,
        isGloballyEnabled,
        isTypeEnabled,
        applyShakeTransform,
        getDecayMultiplier
    };
})();
