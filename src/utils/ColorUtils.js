/**
 * ColorUtils.js - Consolidated color manipulation utilities
 *
 * Centralized module replacing duplicate color functions across:
 * - Enemy.js, Boss.js, Player.js, PowerUp.js, Bullet.js, main.js
 */

(function() {
    'use strict';

    const G = window.Game = window.Game || {};

    /**
     * Parse a hex color string to RGB components
     * @param {string} hex - Hex color string (e.g., '#ff0000' or 'ff0000')
     * @returns {{r: number, g: number, b: number}} RGB components (0-255)
     */
    function parseHex(hex) {
        const cleanHex = hex.replace('#', '');
        const num = parseInt(cleanHex, 16);
        return {
            r: (num >> 16) & 0xFF,
            g: (num >> 8) & 0xFF,
            b: num & 0xFF
        };
    }

    /**
     * Parse an rgb/rgba color string to components
     * @param {string} color - RGB color string (e.g., 'rgb(255,0,0)' or 'rgba(255,0,0,0.5)')
     * @returns {{r: number, g: number, b: number}|null} RGB components or null if invalid
     */
    function parseRgb(color) {
        const match = color.match(/(\d+),\s*(\d+),\s*(\d+)/);
        if (match) {
            return {
                r: parseInt(match[1], 10),
                g: parseInt(match[2], 10),
                b: parseInt(match[3], 10)
            };
        }
        return null;
    }

    /**
     * Parse any supported color format
     * @param {string} color - Hex or RGB color string
     * @returns {{r: number, g: number, b: number}} RGB components
     */
    function parseColor(color) {
        if (color.startsWith('rgb')) {
            return parseRgb(color) || { r: 255, g: 255, b: 255 };
        }
        if (color.startsWith('#') || /^[0-9a-f]{6}$/i.test(color)) {
            return parseHex(color);
        }
        return { r: 255, g: 255, b: 255 }; // Fallback to white
    }

    /**
     * Darken a color by a specified amount
     * @param {string} color - Hex or RGB color string
     * @param {number} amount - Amount to darken (0-1, where 1 = fully black)
     * @returns {string} RGB color string
     */
    function darken(color, amount) {
        const { r, g, b } = parseColor(color);
        const factor = Math.floor(255 * amount);
        return `rgb(${Math.max(0, r - factor)},${Math.max(0, g - factor)},${Math.max(0, b - factor)})`;
    }

    /**
     * Lighten a color by a specified amount
     * @param {string} color - Hex or RGB color string
     * @param {number} amount - Amount to lighten (0-1, where 1 = fully white)
     * @returns {string} RGB color string
     */
    function lighten(color, amount) {
        const { r, g, b } = parseColor(color);
        const factor = Math.floor(255 * amount);
        return `rgb(${Math.min(255, r + factor)},${Math.min(255, g + factor)},${Math.min(255, b + factor)})`;
    }

    /**
     * Lighten a hex color by percentage (returns hex)
     * Used by main.js for ship highlight color
     * @param {string} hex - Hex color string
     * @param {number} percent - Percentage to lighten (0-100)
     * @returns {string} Hex color string
     */
    function lightenPercent(hex, percent) {
        const { r, g, b } = parseHex(hex);
        const amt = Math.round(2.55 * percent);
        const R = Math.min(255, r + amt);
        const G = Math.min(255, g + amt);
        const B = Math.min(255, b + amt);
        return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
    }

    /**
     * Convert hex color to RGB string for use in template literals
     * @param {string} hex - Hex color string
     * @returns {string} Comma-separated RGB values (e.g., '255,0,0')
     */
    function hexToRgb(hex) {
        const { r, g, b } = parseHex(hex);
        return `${r},${g},${b}`;
    }

    /**
     * Convert hex color to RGBA string
     * @param {string} hex - Hex color string
     * @param {number} alpha - Alpha value (0-1)
     * @returns {string} RGBA color string
     */
    function hexToRgba(hex, alpha) {
        const { r, g, b } = parseHex(hex);
        return `rgba(${r},${g},${b},${alpha})`;
    }

    /**
     * Add alpha to a color (hex or rgb)
     * @param {string} color - Hex or RGB color string
     * @param {number} alpha - Alpha value (0-1)
     * @returns {string} RGBA color string
     */
    function withAlpha(color, alpha) {
        const { r, g, b } = parseColor(color);
        return `rgba(${r},${g},${b},${alpha})`;
    }

    // === RGBA CACHE SYSTEM (v4.11) ===
    // Pre-built rgba strings for common colors, discretized alpha (step 0.05 = 21 values)
    // Eliminates ~500+ string allocations per frame in draw() calls
    const _rgbaCache = {};
    const ALPHA_STEPS = 21; // 0.00, 0.05, 0.10, ..., 1.00

    function _discretizeAlpha(a) {
        return Math.round(Math.min(1, Math.max(0, a)) * 20) / 20;
    }

    function _ensureColorCache(key, r, g, b) {
        if (_rgbaCache[key]) return;
        const arr = new Array(ALPHA_STEPS);
        for (let i = 0; i < ALPHA_STEPS; i++) {
            const a = (i / 20).toFixed(2);
            arr[i] = 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
        }
        _rgbaCache[key] = arr;
    }

    /**
     * Get a cached rgba string with discretized alpha (step 0.05)
     * @param {number} r - Red (0-255)
     * @param {number} g - Green (0-255)
     * @param {number} b - Blue (0-255)
     * @param {number} alpha - Alpha (0-1), will be snapped to nearest 0.05
     * @returns {string} Cached rgba string
     */
    function rgba(r, g, b, alpha) {
        const key = r + ',' + g + ',' + b;
        _ensureColorCache(key, r, g, b);
        const idx = Math.round(Math.min(1, Math.max(0, alpha)) * 20);
        return _rgbaCache[key][idx];
    }

    // Pre-cache the most frequently used colors in draw() calls
    const PRECACHE_COLORS = [
        [255, 215, 0],   // gold
        [255, 200, 50],  // power glow
        [255, 255, 150], // hodl sparkle
        [255, 180, 0],   // dark gold
        [255, 140, 0],   // deeper gold
        [255, 255, 200], // light gold
        [255, 100, 100], // red warning
        [255, 200, 150], // core hitbox
        [255, 68, 68],   // danger red
        [255, 0, 0],     // pure red
        [255, 105, 180], // pink graze
        [255, 68, 0],    // godchain orange
        [255, 100, 0],   // godchain mid
        [255, 255, 255], // white
        [128, 128, 128], // grey
        [0, 170, 170],   // shield cyan
        [255, 255, 220], // flash white-yellow
        [0, 255, 255],   // modifier cyan
        [155, 89, 182],  // modifier purple
        [0, 0, 0],       // black
    ];
    for (const [r, g, b] of PRECACHE_COLORS) {
        _ensureColorCache(r + ',' + g + ',' + b, r, g, b);
    }

    // === FONT CACHE SYSTEM (v4.11) ===
    // Pre-built font strings to avoid template literal allocation per frame
    const _fontCache = {};

    /**
     * Get a cached font string
     * @param {string} weight - e.g. 'bold', 'italic bold', ''
     * @param {number} size - Font size in px (will be floored)
     * @param {string} family - Font family string
     * @returns {string} Cached font string
     */
    function font(weight, size, family) {
        const s = Math.floor(size);
        const key = weight + s + family;
        let cached = _fontCache[key];
        if (!cached) {
            cached = weight ? (weight + ' ' + s + 'px ' + family) : (s + 'px ' + family);
            _fontCache[key] = cached;
        }
        return cached;
    }

    // Export to namespace
    G.ColorUtils = {
        parseHex,
        parseRgb,
        parseColor,
        darken,
        lighten,
        lightenPercent,
        hexToRgb,
        hexToRgba,
        withAlpha,
        rgba,
        font
    };
})();
