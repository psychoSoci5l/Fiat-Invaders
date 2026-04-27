/**
 * DrawPipeline.js - Centralized render layer pipeline
 *
 * v7.13.0: Replaces the monolithic draw() function in main.js
 * with a layered, extensible rendering pipeline.
 *
 * Each render step registers to a numbered layer. Layers execute
 * in ascending order. Per-layer composite operations (e.g. 'lighter'
 * for glow passes) are wrapped in automatic ctx.save/restore.
 *
 * Layers 0-25 execute INSIDE the screen-shake transform.
 * Layers 26-31 execute OUTSIDE shake (transition, debug overlays).
 */

(function() {
    'use strict';

    const G = window.Game = window.Game || {};

    // ── Layer Enum ──────────────────────────────────────────
    // Lower index = drawn first (bottom layer)
    const LAYER = {
        BACKGROUND:      0,
        SKY:             1,
        WEATHER:         2,
        TITLE_ANIM:      3,
        IMPACT_FLASH:    4,
        HYPER_OVERLAY:   5,
        GLOW_ENEMY:      6,
        ENTITY_ENEMY:    7,
        GLOW_BULLET:     8,
        BULLET:          9,
        ENERGY_LINK:    10,
        SCREEN_DIM:     11,
        HARMONIC:       12,
        ENEMY_BULLET:   13,
        DANGER_ZONE:    14,
        POWERUP:        15,
        PARTICLE:       16,
        EVOLUTION_ITEM: 17,
        FLOATING_TEXT:  18,
        PERK_ICON:      19,
        MESSAGE:        20,
        ARCADE_HUD:     21,
        BOSS_WARNING:   22,
        COUNTDOWN:      23,
        BEAR_MARKET:    24,
        EFFECTS:        25,

        // Outside shake transform:
        TRANSITION:     26,
        DEBUG:          27,
        V8_HUD:         28,
        DEBUG_HUD:      29,
        DEBUG_HITBOX:   30,
        DEBUG_PERF:     31
    };

    const _INSIDE_SHAKE_MAX = LAYER.EFFECTS;  // 25

    // ── Internal State ──────────────────────────────────────
    /** @type {Array<Array<{fn: Function, handle: string}>>} */
    let _layers = [];

    /** @type {Object<number, string|null>} */
    let _compositeOps = {};

    /** @type {Object<number, boolean>} */
    let _layerEnabled = {};

    /** @type {Object<string, {layer: number, fn: Function}>} */
    let _handles = {};

    let _handleCounter = 0;
    let _numLayers = 0;

    // ── Initialization ──────────────────────────────────────

    /**
     * Initialize the pipeline
     * @param {CanvasRenderingContext2D} ctx - The main canvas context
     */
    function init(ctx) {
        // Determine number of layers from enum
        _numLayers = 0;
        for (const key in LAYER) {
            if (LAYER.hasOwnProperty(key)) {
                const idx = LAYER[key];
                if (idx >= _numLayers) _numLayers = idx + 1;
            }
        }

        _layers = [];
        _compositeOps = {};
        _layerEnabled = {};
        _handles = {};
        _handleCounter = 0;

        for (let i = 0; i < _numLayers; i++) {
            _layers[i] = [];
            _compositeOps[i] = null;
            _layerEnabled[i] = true;
        }
    }

    /**
     * Remove all registrations and reset state
     */
    function reset() {
        init(null);
    }

    // ── Registration ────────────────────────────────────────

    /**
     * Register a draw callback at a specific layer
     * @param {number} layer - LAYER enum value
     * @param {function(CanvasRenderingContext2D, Object):void} fn - Callback receives (ctx, frameContext)
     * @param {number} [priority=0] - Higher = drawn first within layer
     * @returns {string} Registration handle (for unregister)
     */
    function register(layer, fn, priority) {
        if (layer < 0 || layer >= _numLayers) {
            console.warn('[DrawPipeline] Invalid layer:', layer);
            return '';
        }
        const handle = '_p' + (_handleCounter++);
        const entry = {
            fn: fn,
            priority: (priority != null) ? priority : 0,
            handle: handle
        };

        _layers[layer].push(entry);
        // Sort descending by priority (higher = drawn first)
        _layers[layer].sort(function(a, b) {
            return b.priority - a.priority;
        });

        _handles[handle] = { layer: layer, fn: fn };
        return handle;
    }

    /**
     * Unregister a callback by its handle
     * @param {string} handle
     */
    function unregister(handle) {
        const info = _handles[handle];
        if (!info) return;
        const arr = _layers[info.layer];
        for (let i = 0; i < arr.length; i++) {
            if (arr[i].handle === handle) {
                arr.splice(i, 1);
                break;
            }
        }
        delete _handles[handle];
    }

    // ── Layer Configuration ─────────────────────────────────

    /**
     * Set composite operation for a layer
     * @param {number} layer
     * @param {string|null} compositeOp - e.g. 'lighter', or null for source-over
     */
    function setLayerComposite(layer, compositeOp) {
        if (layer >= 0 && layer < _numLayers) {
            _compositeOps[layer] = compositeOp || null;
        }
    }

    /**
     * Enable or disable an entire layer
     * @param {number} layer
     * @param {boolean} enabled
     */
    function setLayerEnabled(layer, enabled) {
        if (layer >= 0 && layer < _numLayers) {
            _layerEnabled[layer] = enabled;
        }
    }

    /**
     * Check if a layer is enabled
     * @param {number} layer
     * @returns {boolean}
     */
    function isLayerEnabled(layer) {
        if (layer < 0 || layer >= _numLayers) return false;
        return _layerEnabled[layer] !== false;
    }

    // ── Core Draw Loop ──────────────────────────────────────

    /**
     * Execute the pipeline for one frame
     * @param {CanvasRenderingContext2D} ctx
     * @param {Object} fc - Frame context (game state, entities, module refs)
     *
     * Frame context should contain:
     *   { gameWidth, gameHeight, gameState, totalTime, level, isBearMarket,
     *     bossActive, player, enemies, bullets, enemyBullets, powerUps,
     *     lives, storyScreen, effectsRenderer, ... }
     */
    function draw(ctx, fc) {
        if (!fc) return;

        // ═══ EARLY RETURN STATES ════════════════════════════
        if (fc.gameState === 'VIDEO') {
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, fc.gameWidth, fc.gameHeight);
            _execLayer(LAYER.BACKGROUND, ctx, fc);
            return;
        }

        if (fc.gameState === 'STORY_SCREEN' && fc.storyScreen) {
            fc.storyScreen.draw(ctx, fc.gameWidth, fc.gameHeight);
            return;
        }

        // ═══ INSIDE SHAKE TRANSFORM ═════════════════════════
        ctx.save();
        if (fc.effectsRenderer) {
            fc.effectsRenderer.applyShakeTransform(ctx);
        }

        for (let layerIdx = LAYER.BACKGROUND; layerIdx <= _INSIDE_SHAKE_MAX; layerIdx++) {
            _execLayer(layerIdx, ctx, fc);
        }

        ctx.restore(); // End shake

        // ═══ OUTSIDE SHAKE TRANSFORM ════════════════════════
        for (let layerIdx = _INSIDE_SHAKE_MAX + 1; layerIdx < _numLayers; layerIdx++) {
            _execLayer(layerIdx, ctx, fc);
        }
    }

    /**
     * Execute all callbacks for a single layer
     * @param {number} layerIdx
     * @param {CanvasRenderingContext2D} ctx
     * @param {Object} fc
     */
    function _execLayer(layerIdx, ctx, fc) {
        if (!_layerEnabled[layerIdx]) return;

        const callbacks = _layers[layerIdx];
        if (!callbacks || callbacks.length === 0) return;

        const compositeOp = _compositeOps[layerIdx];
        let needsRestore = false;

        if (compositeOp) {
            ctx.save();
            ctx.globalCompositeOperation = compositeOp;
            needsRestore = true;
        }

        for (let i = 0; i < callbacks.length; i++) {
            callbacks[i].fn(ctx, fc);
        }

        if (needsRestore) {
            ctx.restore();
        }
    }

    // ── Export ──────────────────────────────────────────────
    G.DrawPipeline = {
        init: init,
        reset: reset,
        register: register,
        unregister: unregister,
        draw: draw,
        setLayerComposite: setLayerComposite,
        setLayerEnabled: setLayerEnabled,
        isLayerEnabled: isLayerEnabled,
        LAYER: LAYER
    };
})();
