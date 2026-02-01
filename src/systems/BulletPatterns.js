// Bullet Hell Pattern System (Ikeda Style)
// Geometric, hypnotic patterns for boss attacks
window.Game = window.Game || {};

window.Game.BulletPatterns = {
    /**
     * Sine Wave Wall - Undulating curtain of bullets
     * @param {number} cx - Center X position
     * @param {number} cy - Center Y position
     * @param {number} time - Animation time for phase
     * @param {object} config - Pattern configuration
     * @returns {Array} Array of bullet data objects
     */
    sineWave(cx, cy, time, config = {}) {
        const bullets = [];
        const count = config.count || 12;
        const width = config.width || 400;
        const amplitude = config.amplitude || 30;
        const speed = config.speed || 180;
        const color = config.color || '#ff69b4'; // Pink
        const size = config.size || 8;

        for (let i = 0; i < count; i++) {
            const t = i / count;
            const x = cx - width / 2 + t * width;
            const yOffset = Math.sin(time * 3 + t * Math.PI * 4) * amplitude;

            bullets.push({
                x: x,
                y: cy + yOffset,
                vx: 0,
                vy: speed,
                color: color,
                w: size,
                h: size
            });
        }
        return bullets;
    },

    /**
     * Expanding Ring - Circle of bullets expanding outward
     * @param {number} cx - Center X position
     * @param {number} cy - Center Y position
     * @param {number} time - Animation time for rotation
     * @param {object} config - Pattern configuration
     * @returns {Array} Array of bullet data objects
     */
    expandingRing(cx, cy, time, config = {}) {
        const bullets = [];
        const count = config.count || 16;
        const speed = config.speed || 150;
        const color = config.color || '#00ffff'; // Cyan
        const size = config.size || 10;
        const rotationOffset = config.rotate ? time * 2 : 0;

        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2 + rotationOffset;
            bullets.push({
                x: cx,
                y: cy,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: color,
                w: size,
                h: size
            });
        }
        return bullets;
    },

    /**
     * Flower Pattern - Petal-shaped burst
     * @param {number} cx - Center X position
     * @param {number} cy - Center Y position
     * @param {number} time - Animation time
     * @param {object} config - Pattern configuration
     * @returns {Array} Array of bullet data objects
     */
    flower(cx, cy, time, config = {}) {
        const bullets = [];
        const petals = config.petals || 6;
        const bulletsPerPetal = config.bulletsPerPetal || 3;
        const speed = config.speed || 160;
        const color = config.color || '#ff00ff'; // Magenta
        const size = config.size || 8;
        const spreadAngle = config.spreadAngle || 0.15;

        for (let p = 0; p < petals; p++) {
            const baseAngle = (p / petals) * Math.PI * 2 + time;

            for (let b = 0; b < bulletsPerPetal; b++) {
                const angleOffset = (b - (bulletsPerPetal - 1) / 2) * spreadAngle;
                const angle = baseAngle + angleOffset;
                const speedMod = 1 - Math.abs(b - (bulletsPerPetal - 1) / 2) * 0.1;

                bullets.push({
                    x: cx,
                    y: cy,
                    vx: Math.cos(angle) * speed * speedMod,
                    vy: Math.sin(angle) * speed * speedMod,
                    color: color,
                    w: size,
                    h: size
                });
            }
        }
        return bullets;
    },

    /**
     * Spiral - Continuous rotating spiral arms
     * @param {number} cx - Center X position
     * @param {number} cy - Center Y position
     * @param {number} angle - Current rotation angle (increment externally)
     * @param {object} config - Pattern configuration
     * @returns {Array} Array of bullet data objects
     */
    spiral(cx, cy, angle, config = {}) {
        const bullets = [];
        const arms = config.arms || 2;
        const speed = config.speed || 200;
        const color = config.color || '#ffff00'; // Yellow
        const size = config.size || 10;

        for (let i = 0; i < arms; i++) {
            const armAngle = angle + (i / arms) * Math.PI * 2;
            bullets.push({
                x: cx,
                y: cy,
                vx: Math.cos(armAngle) * speed,
                vy: Math.sin(armAngle) * speed,
                color: color,
                w: size,
                h: size
            });
        }
        return bullets;
    },

    /**
     * Curtain with Gap - Wall of bullets with player-following gap
     * @param {number} cx - Center X position (unused, spans width)
     * @param {number} cy - Y position for curtain
     * @param {number} playerX - Player X position for gap
     * @param {object} config - Pattern configuration
     * @returns {Array} Array of bullet data objects
     */
    curtain(cx, cy, playerX, config = {}) {
        const bullets = [];
        const width = config.width || 500;
        const count = config.count || 20;
        const gapSize = config.gapSize || 80; // Gap width in pixels
        const speed = config.speed || 140;
        const color = config.color || '#ff69b4'; // Pink
        const size = config.size || 8;
        const startX = cx - width / 2;

        for (let i = 0; i < count; i++) {
            const x = startX + (i / (count - 1)) * width;

            // Create gap around player position
            const distFromPlayer = Math.abs(x - playerX);
            if (distFromPlayer < gapSize / 2) continue;

            bullets.push({
                x: x,
                y: cy,
                vx: 0,
                vy: speed,
                color: color,
                w: size,
                h: size
            });
        }
        return bullets;
    },

    /**
     * Double Helix - Two intertwined spirals
     * @param {number} cx - Center X position
     * @param {number} cy - Center Y position
     * @param {number} time - Animation time
     * @param {object} config - Pattern configuration
     * @returns {Array} Array of bullet data objects
     */
    doubleHelix(cx, cy, time, config = {}) {
        const bullets = [];
        const speed = config.speed || 180;
        const color1 = config.color1 || '#ff69b4'; // Pink
        const color2 = config.color2 || '#00ffff'; // Cyan
        const size = config.size || 9;
        const separation = config.separation || Math.PI; // Half rotation apart

        // First helix arm
        const angle1 = time * 3;
        bullets.push({
            x: cx,
            y: cy,
            vx: Math.cos(angle1) * speed,
            vy: Math.sin(angle1) * speed * 0.5 + speed * 0.5,
            color: color1,
            w: size,
            h: size
        });

        // Second helix arm (offset)
        const angle2 = time * 3 + separation;
        bullets.push({
            x: cx,
            y: cy,
            vx: Math.cos(angle2) * speed,
            vy: Math.sin(angle2) * speed * 0.5 + speed * 0.5,
            color: color2,
            w: size,
            h: size
        });

        return bullets;
    },

    /**
     * Aimed Burst - Bullets aimed at player with spread
     * @param {number} cx - Origin X
     * @param {number} cy - Origin Y
     * @param {number} playerX - Target X
     * @param {number} playerY - Target Y
     * @param {object} config - Pattern configuration
     * @returns {Array} Array of bullet data objects
     */
    aimedBurst(cx, cy, playerX, playerY, config = {}) {
        const bullets = [];
        const count = config.count || 5;
        const speed = config.speed || 220;
        const spread = config.spread || 0.4; // Radians
        const color = config.color || '#e74c3c'; // Red
        const size = config.size || 10;

        const dx = playerX - cx;
        const dy = playerY - cy;
        const baseAngle = Math.atan2(dy, dx);

        for (let i = 0; i < count; i++) {
            const angleOffset = (i - (count - 1) / 2) * (spread / (count - 1 || 1));
            const angle = baseAngle + angleOffset;

            bullets.push({
                x: cx,
                y: cy,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: color,
                w: size,
                h: size
            });
        }
        return bullets;
    }
};
