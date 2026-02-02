/**
 * TransitionManager.js - Screen transition effects
 *
 * Handles fade-to-black transitions between game states.
 * Extracted from main.js for modularity.
 */

(function() {
    'use strict';

    const G = window.Game = window.Game || {};

    // Screen dimensions (set via init)
    let gameWidth = 0;
    let gameHeight = 0;

    // Transition state
    let transitionAlpha = 0;
    let transitionDir = 0; // 0 = none, 1 = fading in (to black), -1 = fading out
    let transitionCallback = null;
    let transitionColor = '#000';

    /**
     * Initialize transition manager with canvas dimensions
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
     * Reset transition state
     */
    function reset() {
        transitionAlpha = 0;
        transitionDir = 0;
        transitionCallback = null;
        transitionColor = '#000';
    }

    /**
     * Start a screen transition
     * @param {Function} callback - Function to call at peak of transition
     * @param {string} color - Transition color (default black)
     */
    function start(callback, color = '#000') {
        transitionDir = 1; // Fade to black
        transitionCallback = callback;
        transitionColor = color;
    }

    /**
     * Update transition state
     * @param {number} dt - Delta time in seconds
     */
    function update(dt) {
        if (transitionDir === 0) return;

        const speed = 3; // Transition speed
        transitionAlpha += transitionDir * speed * dt;

        if (transitionDir === 1 && transitionAlpha >= 1) {
            // Fully black - execute callback and start fade out
            transitionAlpha = 1;
            if (transitionCallback) {
                transitionCallback();
                transitionCallback = null;
            }
            transitionDir = -1; // Start fading out
        } else if (transitionDir === -1 && transitionAlpha <= 0) {
            // Fully transparent - done
            transitionAlpha = 0;
            transitionDir = 0;
        }
    }

    /**
     * Draw transition overlay
     * @param {CanvasRenderingContext2D} ctx
     */
    function draw(ctx) {
        if (transitionAlpha <= 0) return;

        ctx.fillStyle = transitionColor;
        ctx.globalAlpha = transitionAlpha;
        ctx.fillRect(0, 0, gameWidth, gameHeight);
        ctx.globalAlpha = 1;

        // Add some flair during transition
        if (transitionAlpha > 0.3 && transitionAlpha < 0.95) {
            // Wipe line effect
            const wipePos = transitionDir === 1 ?
                transitionAlpha * gameHeight :
                (1 - transitionAlpha) * gameHeight;

            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 4;
            ctx.globalAlpha = 0.8;
            ctx.beginPath();
            ctx.moveTo(0, wipePos);
            ctx.lineTo(gameWidth, wipePos);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
    }

    /**
     * Start a fade-out from a specific alpha level (for dramatic effects)
     * @param {number} alpha - Starting alpha level (0-1)
     * @param {string} color - Transition color
     */
    function startFadeOut(alpha = 0.8, color = '#000') {
        transitionAlpha = alpha;
        transitionDir = -1; // Fade out
        transitionColor = color;
        transitionCallback = null;
    }

    /**
     * Check if transition is active
     */
    function isActive() {
        return transitionDir !== 0 || transitionAlpha > 0;
    }

    /**
     * Get current alpha value
     */
    function getAlpha() {
        return transitionAlpha;
    }

    // Export to namespace
    G.TransitionManager = {
        init,
        setDimensions,
        reset,
        start,
        startFadeOut,
        update,
        draw,
        isActive,
        getAlpha
    };
})();
