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
        withAlpha
    };
})();
