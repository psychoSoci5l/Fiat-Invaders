/**
 * MathUtils.js - Consolidated math utilities for game physics
 *
 * Centralized module replacing duplicate distance/angle calculations across:
 * - main.js, Enemy.js, Bullet.js, Player.js, InputSystem.js, BulletPatterns.js
 */

(function() {
    'use strict';

    const G = window.Game = window.Game || {};

    /**
     * Calculate distance between two points
     * @param {number} x1 - First point X
     * @param {number} y1 - First point Y
     * @param {number} x2 - Second point X
     * @param {number} y2 - Second point Y
     * @returns {number} Distance
     */
    function distance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Calculate squared distance (avoids sqrt, useful for comparisons)
     * @param {number} x1 - First point X
     * @param {number} y1 - First point Y
     * @param {number} x2 - Second point X
     * @param {number} y2 - Second point Y
     * @returns {number} Squared distance
     */
    function distanceSquared(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return dx * dx + dy * dy;
    }

    /**
     * Get magnitude of a vector
     * @param {number} vx - X component
     * @param {number} vy - Y component
     * @returns {number} Magnitude
     */
    function magnitude(vx, vy) {
        return Math.sqrt(vx * vx + vy * vy);
    }

    /**
     * Normalize a vector to unit length
     * @param {number} dx - X component
     * @param {number} dy - Y component
     * @returns {{x: number, y: number, dist: number}} Unit vector and original distance
     */
    function normalize(dx, dy) {
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        return {
            x: dx / dist,
            y: dy / dist,
            dist: dist
        };
    }

    /**
     * Get direction vector from point A to point B
     * @param {number} x1 - Source X
     * @param {number} y1 - Source Y
     * @param {number} x2 - Target X
     * @param {number} y2 - Target Y
     * @returns {{x: number, y: number, dist: number}} Unit direction vector and distance
     */
    function direction(x1, y1, x2, y2) {
        return normalize(x2 - x1, y2 - y1);
    }

    /**
     * Calculate velocity vector towards a target
     * @param {number} x1 - Source X
     * @param {number} y1 - Source Y
     * @param {number} x2 - Target X
     * @param {number} y2 - Target Y
     * @param {number} speed - Desired speed
     * @returns {{vx: number, vy: number, dist: number}} Velocity vector and distance
     */
    function velocityTowards(x1, y1, x2, y2, speed) {
        const dir = direction(x1, y1, x2, y2);
        return {
            vx: dir.x * speed,
            vy: dir.y * speed,
            dist: dir.dist
        };
    }

    /**
     * Calculate angle from point A to point B
     * @param {number} x1 - Source X
     * @param {number} y1 - Source Y
     * @param {number} x2 - Target X
     * @param {number} y2 - Target Y
     * @returns {number} Angle in radians
     */
    function angleBetween(x1, y1, x2, y2) {
        return Math.atan2(y2 - y1, x2 - x1);
    }

    /**
     * Convert angle and speed to velocity vector
     * @param {number} angle - Angle in radians
     * @param {number} speed - Speed magnitude
     * @returns {{vx: number, vy: number}} Velocity components
     */
    function angleToVelocity(angle, speed) {
        return {
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed
        };
    }

    /**
     * Clamp a value between min and max
     * @param {number} value - Value to clamp
     * @param {number} min - Minimum bound
     * @param {number} max - Maximum bound
     * @returns {number} Clamped value
     */
    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    /**
     * Clamp a vector to a maximum magnitude
     * @param {number} vx - X component
     * @param {number} vy - Y component
     * @param {number} maxMag - Maximum magnitude
     * @returns {{vx: number, vy: number}} Clamped velocity
     */
    function clampMagnitude(vx, vy, maxMag) {
        const mag = Math.sqrt(vx * vx + vy * vy);
        if (mag <= maxMag || mag === 0) {
            return { vx, vy };
        }
        const scale = maxMag / mag;
        return {
            vx: vx * scale,
            vy: vy * scale
        };
    }

    /**
     * Clamp position to a circular radius (for joystick)
     * @param {number} dx - X offset from center
     * @param {number} dy - Y offset from center
     * @param {number} radius - Maximum radius
     * @returns {{x: number, y: number}} Clamped position
     */
    function clampToRadius(dx, dy, radius) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= radius) {
            return { x: dx, y: dy };
        }
        const scale = radius / dist;
        return {
            x: dx * scale,
            y: dy * scale
        };
    }

    /**
     * Check if two points are within a certain distance
     * @param {number} x1 - First point X
     * @param {number} y1 - First point Y
     * @param {number} x2 - Second point X
     * @param {number} y2 - Second point Y
     * @param {number} maxDist - Maximum distance
     * @returns {boolean} True if within distance
     */
    function isWithinDistance(x1, y1, x2, y2, maxDist) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return dx * dx + dy * dy <= maxDist * maxDist;
    }

    /**
     * Linear interpolation between two values
     * @param {number} a - Start value
     * @param {number} b - End value
     * @param {number} t - Interpolation factor (0-1)
     * @returns {number} Interpolated value
     */
    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    /**
     * Circular buffer for fixed-size collections with O(1) add
     * @param {number} capacity - Maximum number of items
     */
    class CircularBuffer {
        constructor(capacity) {
            this.capacity = capacity;
            this.buffer = new Array(capacity);
            this.head = 0;   // Next write position
            this.count = 0;  // Current active count
        }

        /**
         * Add an item (overwrites oldest if full)
         * @param {*} item - Item to add
         */
        add(item) {
            this.buffer[this.head] = item;
            this.head = (this.head + 1) % this.capacity;
            if (this.count < this.capacity) {
                this.count++;
            }
        }

        /**
         * Iterate over all active items
         * @param {Function} callback - fn(item, index) - return false to mark for removal
         */
        forEach(callback) {
            for (let i = 0; i < this.capacity; i++) {
                const item = this.buffer[i];
                if (item && item.active !== false) {
                    const keep = callback(item, i);
                    if (keep === false) {
                        this.buffer[i] = null;
                        this.count = Math.max(0, this.count - 1);
                    }
                }
            }
        }

        /**
         * Clear all items
         */
        clear() {
            this.buffer.fill(null);
            this.head = 0;
            this.count = 0;
        }

        get length() {
            return this.count;
        }
    }

    // Export to namespace
    G.MathUtils = {
        distance,
        distanceSquared,
        magnitude,
        normalize,
        direction,
        velocityTowards,
        angleBetween,
        angleToVelocity,
        clamp,
        clampMagnitude,
        clampToRadius,
        isWithinDistance,
        lerp,
        CircularBuffer
    };
})();
