/**
 * OffscreenCanvas.js - Reusable off-screen canvas cache
 *
 * Generalizes the pattern used by SkyRenderer for caching expensive
 * static or semi-static renders (sky gradients, hills, etc.).
 *
 * Each entry is keyed by name and has:
 *   - An off-screen <canvas> and its 2D context
 *   - A string key for dirty-checking (caller provides the current key)
 *   - Dimensions (recreated on resize)
 *
 * Usage:
 *   var cache = G.OffscreenCanvas;
 *   if (cache.isDirty('skyBg', level + '-' + bear)) {
 *     var c = cache.get('skyBg', w, h, { alpha: false });
 *     // ... draw into c.ctx ...
 *     cache.markClean('skyBg', level + '-' + bear);
 *   }
 *   cache.drawTo('skyBg', mainCtx);
 */

(function() {
    'use strict';

    const G = window.Game = window.Game || {};

    /**
     * Internal cache store
     * Structure: { [name]: { canvas, ctx, key, width, height } }
     */
    let _caches = {};

    /**
     * Global fallback dimensions (used when get() is called without explicit w/h)
     */
    let _gameWidth = 0;
    let _gameHeight = 0;

    /**
     * Initialize module with game dimensions
     */
    function init(width, height) {
        _gameWidth = width;
        _gameHeight = height;
    }

    /**
     * Update dimensions, resizing all cached canvases
     */
    function setDimensions(width, height) {
        _gameWidth = width;
        _gameHeight = height;
        for (const name in _caches) {
            if (_caches.hasOwnProperty(name)) {
                const entry = _caches[name];
                entry.width = width;
                entry.height = height;
                entry.canvas.width = width;
                entry.canvas.height = height;
                // Context settings are preserved after resize by spec
                entry.key = null; // Force redraw
            }
        }
    }

    /**
     * Get or create a named offscreen canvas
     * @param {string} name - Unique cache key
     * @param {number} [w] - Canvas width (defaults to stored gameWidth)
     * @param {number} [h] - Canvas height (defaults to stored gameHeight)
     * @param {Object} [opts] - { alpha: boolean } (default true)
     * @returns {{ canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D }}
     */
    function get(name, w, h, opts) {
        const width = (w != null) ? w : _gameWidth;
        const height = (h != null) ? h : _gameHeight;
        let entry = _caches[name];

        if (entry && entry.width === width && entry.height === height) {
            return { canvas: entry.canvas, ctx: entry.ctx };
        }

        // Create fresh canvas
        const alpha = opts && opts.alpha === false ? false : true;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { alpha: alpha });

        _caches[name] = {
            canvas: canvas,
            ctx: ctx,
            key: null,
            width: width,
            height: height
        };

        return { canvas: canvas, ctx: ctx };
    }

    /**
     * Check if a cache entry needs redrawing
     * @param {string} name
     * @param {string} currentKey - Current frame's comparison key
     * @returns {boolean} true if the cached version is stale
     */
    function isDirty(name, currentKey) {
        const entry = _caches[name];
        if (!entry) return true;
        return entry.key !== currentKey;
    }

    /**
     * Mark a cache entry as up-to-date with the given key
     * @param {string} name
     * @param {string} currentKey
     */
    function markClean(name, currentKey) {
        const entry = _caches[name];
        if (entry) {
            entry.key = currentKey;
        }
    }

    /**
     * Blit a cached canvas onto the target context
     * @param {string} name
     * @param {CanvasRenderingContext2D} targetCtx
     * @param {number} [dx=0]
     * @param {number} [dy=0]
     */
    function drawTo(name, targetCtx, dx, dy) {
        const entry = _caches[name];
        if (!entry) return;
        targetCtx.drawImage(entry.canvas, dx || 0, dy || 0);
    }

    /**
     * Invalidate a specific cache entry (forces redraw next frame)
     * @param {string} name
     */
    function invalidate(name) {
        const entry = _caches[name];
        if (entry) {
            entry.key = null;
        }
    }

    /**
     * Remove and dispose a cache entry
     * @param {string} name
     */
    function dispose(name) {
        delete _caches[name];
    }

    /**
     * Remove all cache entries
     */
    function reset() {
        _caches = {};
    }

    // Export
    G.OffscreenCanvas = {
        init,
        setDimensions,
        get,
        isDirty,
        markClean,
        drawTo,
        invalidate,
        dispose,
        reset
    };
})();
