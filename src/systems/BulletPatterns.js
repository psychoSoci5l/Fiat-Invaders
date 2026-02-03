// Projectile Pattern System
// Geometric patterns for boss attacks
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
    },

    // ========== BOSS-EXCLUSIVE PATTERNS (v2.18.0) ==========

    /**
     * Laser Beam - Horizontal continuous beam of bullets (FED Signature)
     * Creates a line of bullets that simulates a laser sweep
     * @param {number} cx - Origin X
     * @param {number} cy - Origin Y
     * @param {number} targetX - Target X position
     * @param {number} targetY - Target Y position
     * @param {object} config - Pattern configuration
     * @returns {Array} Array of bullet data objects
     */
    laserBeam(cx, cy, targetX, targetY, config = {}) {
        const bullets = [];
        const count = config.count || 20;
        const speed = config.speed || 300;
        const color = config.color || '#2ecc71'; // Dollar green
        const size = config.size || 6;
        const width = config.width || 400; // Beam width
        const gapSize = config.gapSize || 60; // Safe gap

        const dx = targetX - cx;
        const dy = targetY - cy;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const dirX = dx / dist;
        const dirY = dy / dist;

        // Perpendicular direction for beam spread
        const perpX = -dirY;
        const perpY = dirX;

        for (let i = 0; i < count; i++) {
            const t = (i / (count - 1)) - 0.5; // -0.5 to 0.5
            const offsetX = perpX * t * width;
            const offsetY = perpY * t * width;

            // Create gap around center (player position)
            if (Math.abs(t * width) < gapSize / 2) continue;

            bullets.push({
                x: cx + offsetX,
                y: cy + offsetY,
                vx: dirX * speed,
                vy: dirY * speed,
                color: color,
                w: size,
                h: size * 2 // Elongated for laser look
            });
        }
        return bullets;
    },

    /**
     * Homing Missiles - Tracking projectiles that curve toward player (FED Signature)
     * @param {number} cx - Origin X
     * @param {number} cy - Origin Y
     * @param {number} playerX - Target X
     * @param {number} playerY - Target Y
     * @param {object} config - Pattern configuration
     * @returns {Array} Array of bullet data objects with homing property
     */
    homingMissiles(cx, cy, playerX, playerY, config = {}) {
        const bullets = [];
        const count = config.count || 4;
        const speed = config.speed || 120;
        const color = config.color || '#e74c3c'; // Warning red
        const size = config.size || 12;
        const spreadAngle = config.spreadAngle || 0.8; // Initial spread

        for (let i = 0; i < count; i++) {
            // Spread missiles in an arc before they home in
            const angle = -spreadAngle / 2 + (i / (count - 1)) * spreadAngle + Math.PI / 2;

            bullets.push({
                x: cx,
                y: cy,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: color,
                w: size,
                h: size,
                isHoming: true,
                homingStrength: config.homingStrength || 2.5,
                targetX: playerX,
                targetY: playerY,
                maxSpeed: config.maxSpeed || 200
            });
        }
        return bullets;
    },

    /**
     * Rotating Barrier - Orbiting shield of bullets with gap (BCE Signature)
     * Creates a rotating ring that player must find the gap in
     * @param {number} cx - Center X
     * @param {number} cy - Center Y
     * @param {number} time - Animation time for rotation
     * @param {object} config - Pattern configuration
     * @returns {Array} Array of bullet data objects
     */
    rotatingBarrier(cx, cy, time, config = {}) {
        const bullets = [];
        const count = config.count || 24;
        const radius = config.radius || 80;
        const speed = config.speed || 60; // Slow outward expansion
        const color = config.color || '#003399'; // EU blue
        const size = config.size || 10;
        const gapAngle = config.gapAngle || Math.PI / 4; // 45 degree gap
        const rotationSpeed = config.rotationSpeed || 1.5;
        const gapPosition = (time * rotationSpeed) % (Math.PI * 2);

        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;

            // Create gap at rotating position
            const angleDiff = Math.abs(((angle - gapPosition + Math.PI) % (Math.PI * 2)) - Math.PI);
            if (angleDiff < gapAngle / 2) continue;

            const startX = cx + Math.cos(angle) * radius;
            const startY = cy + Math.sin(angle) * radius * 0.6; // Oval shape

            bullets.push({
                x: startX,
                y: startY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed * 0.6 + 40, // Slight downward drift
                color: color,
                w: size,
                h: size
            });
        }
        return bullets;
    },

    /**
     * Delayed Explosion - Timed bombs that expand into bullet rings (BCE Signature)
     * Places markers that explode after delay
     * @param {Array} positions - Array of {x, y} positions for bombs
     * @param {number} delay - Not used directly (handled by caller)
     * @param {object} config - Pattern configuration
     * @returns {Array} Array of bullet data objects
     */
    delayedExplosion(positions, delay, config = {}) {
        const bullets = [];
        const bulletsPerExplosion = config.bulletsPerExplosion || 8;
        const speed = config.speed || 140;
        const color = config.color || '#ffcc00'; // Gold warning
        const size = config.size || 8;

        for (const pos of positions) {
            // Create expanding ring at each position
            for (let i = 0; i < bulletsPerExplosion; i++) {
                const angle = (i / bulletsPerExplosion) * Math.PI * 2;
                bullets.push({
                    x: pos.x,
                    y: pos.y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    color: color,
                    w: size,
                    h: size
                });
            }
        }
        return bullets;
    },

    /**
     * Screen Wipe - Full-screen wall of bullets with safe gap (BOJ Signature)
     * Creates a horizontal or vertical wall that sweeps across
     * @param {string} direction - 'horizontal' or 'vertical'
     * @param {number} position - Starting Y (horizontal) or X (vertical)
     * @param {object} config - Pattern configuration
     * @returns {Array} Array of bullet data objects
     */
    screenWipe(direction, position, config = {}) {
        const bullets = [];
        const count = config.count || 30;
        const speed = config.speed || 100;
        const color = config.color || '#bc002d'; // Japan red
        const size = config.size || 10;
        const screenWidth = config.screenWidth || 500;
        const screenHeight = config.screenHeight || 800;
        const gapPosition = config.gapPosition || 0.5; // 0-1, position of gap
        const gapSize = config.gapSize || 80;

        if (direction === 'horizontal' || direction === 'down') {
            // Horizontal wall moving down
            for (let i = 0; i < count; i++) {
                const t = i / (count - 1);
                const x = t * screenWidth;

                // Create gap
                const gapCenter = gapPosition * screenWidth;
                if (Math.abs(x - gapCenter) < gapSize / 2) continue;

                bullets.push({
                    x: x,
                    y: position,
                    vx: 0,
                    vy: speed,
                    color: color,
                    w: size,
                    h: size
                });
            }
        } else {
            // Vertical wall moving sideways
            const moveDir = config.moveDir || 1; // 1 = right, -1 = left
            for (let i = 0; i < count; i++) {
                const t = i / (count - 1);
                const y = 150 + t * (screenHeight - 300); // Stay in play area

                // Create gap
                const gapCenter = 150 + gapPosition * (screenHeight - 300);
                if (Math.abs(y - gapCenter) < gapSize / 2) continue;

                bullets.push({
                    x: position,
                    y: y,
                    vx: speed * moveDir,
                    vy: 0,
                    color: color,
                    w: size,
                    h: size
                });
            }
        }
        return bullets;
    },

    /**
     * Zen Garden - Intertwined hypnotic spirals (BOJ Signature)
     * Creates multiple spiral arms that weave together
     * @param {number} cx - Center X
     * @param {number} cy - Center Y
     * @param {number} time - Animation time
     * @param {object} config - Pattern configuration
     * @returns {Array} Array of bullet data objects
     */
    zenGarden(cx, cy, time, config = {}) {
        const bullets = [];
        const arms = config.arms || 4;
        const bulletsPerArm = config.bulletsPerArm || 3;
        const speed = config.speed || 130;
        const color1 = config.color1 || '#bc002d'; // Japan red
        const color2 = config.color2 || '#ffffff'; // White
        const size = config.size || 9;
        const spiralTightness = config.spiralTightness || 0.15;

        for (let arm = 0; arm < arms; arm++) {
            const baseAngle = (arm / arms) * Math.PI * 2 + time * 1.5;
            const armColor = arm % 2 === 0 ? color1 : color2;

            for (let i = 0; i < bulletsPerArm; i++) {
                // Each bullet in arm has slightly different angle (spiral effect)
                const spiralOffset = i * spiralTightness;
                const angle = baseAngle + spiralOffset;
                const speedMod = 1 + i * 0.1; // Outer bullets slightly faster

                bullets.push({
                    x: cx,
                    y: cy,
                    vx: Math.cos(angle) * speed * speedMod,
                    vy: Math.sin(angle) * speed * speedMod * 0.7 + 50, // Bias downward
                    color: armColor,
                    w: size,
                    h: size
                });
            }
        }
        return bullets;
    }
};
