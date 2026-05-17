/**
 * CullingHelper.js - AABB off-screen culling utility
 *
 * Standardizes the repeated on-screen check pattern used throughout the
 * render pipeline. Supports configurable margins and optional position
 * accessor for non-standard entity layouts.
 *
 * Usage:
 *   if (G.CullingHelper.isOnScreen(e.x, e.y, 80)) { e.draw(ctx); }
 */

(function() {
    'use strict';

    const G = window.Game = window.Game || {};

    let gameWidth = 0;
    let gameHeight = 0;

    /**
     * Initialize with canvas dimensions
     * @param {number} width
     * @param {number} height
     */
    function init(width, height) {
        gameWidth = width;
        gameHeight = height;
    }

    /**
     * Update dimensions (for resize)
     * @param {number} width
     * @param {number} height
     */
    function setDimensions(width, height) {
        gameWidth = width;
        gameHeight = height;
    }

    /**
     * Check if a point is within visible canvas bounds plus margin
     * @param {number} x - Entity X position
     * @param {number} y - Entity Y position
     * @param {number} [margin=0] - Extra culling margin in pixels
     * @param {number} [w] - Canvas width (defaults to stored gameWidth)
     * @param {number} [h] - Canvas height (defaults to stored gameHeight)
     * @returns {boolean} true if entity should be rendered
     */
    function isOnScreen(x, y, margin, w, h) {
        if (margin == null) margin = 0;
        const gw = (w != null) ? w : gameWidth;
        const gh = (h != null) ? h : gameHeight;
        return x > -margin && x < gw + margin && y > -margin && y < gh + margin;
    }

    /**
     * Filter an array returning only visible entities (new copy)
     * @param {Array} arr - Entity array
     * @param {number} [margin=0] - Culling margin
     * @param {function(Object):{x:number, y:number}} [getPos] - Position accessor (default reads .x/.y)
     * @param {number} [w] - Canvas width
     * @param {number} [h] - Canvas height
     * @returns {Array} New array with only visible entities
     */
    function cullCopy(arr, margin, getPos, w, h) {
        if (!arr || arr.length === 0) return [];
        const get = getPos || _defaultGetPos;
        const result = [];
        const gw = (w != null) ? w : gameWidth;
        const gh = (h != null) ? h : gameHeight;
        for (let i = 0; i < arr.length; i++) {
            const e = arr[i];
            if (!e) continue;
            const pos = get(e);
            if (isOnScreen(pos.x, pos.y, margin, gw, gh)) {
                result.push(e);
            }
        }
        return result;
    }

    /**
     * Default position accessor: reads .x / .y
     */
    function _defaultGetPos(e) {
        return { x: e.x, y: e.y };
    }

    // Export
    G.CullingHelper = {
        init,
        setDimensions,
        isOnScreen,
        cullCopy
    };
})();
