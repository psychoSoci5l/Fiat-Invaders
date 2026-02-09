/**
 * ParticleSystem.js - Centralized particle management
 *
 * Extracted from main.js for better modularity.
 * Handles all particle creation, update, and rendering.
 */

(function() {
    'use strict';

    const G = window.Game = window.Game || {};

    // Configuration
    const MAX_PARTICLES = 180; // v4.5: Increased from 120 for richer VFX

    // Particle state
    let particles = [];
    let gameWidth = 0;
    let gameHeight = 0;

    /**
     * Initialize particle system with canvas dimensions
     * @param {number} width - Canvas width
     * @param {number} height - Canvas height
     */
    function init(width, height) {
        gameWidth = width;
        gameHeight = height;
        particles = [];
    }

    /**
     * Update dimensions (for resize handling)
     */
    function setDimensions(width, height) {
        gameWidth = width;
        gameHeight = height;
    }

    /**
     * Add a particle to the system
     * @param {Object} props - Particle properties
     * @returns {boolean} True if particle was added
     */
    function addParticle(props) {
        if (particles.length >= MAX_PARTICLES) return false;
        // Use pool to avoid GC churn
        const p = G.ParticlePool ? G.ParticlePool.acquire(props) : props;
        particles.push(p);
        return true;
    }

    /**
     * Release a particle back to the pool
     * @param {Object} p - Particle to release
     */
    function releaseParticle(p) {
        if (G.ParticlePool) G.ParticlePool.release(p);
    }

    /**
     * Create bullet collision spark — v4.5: contextual, colored, scaled
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {string} [color='#fff'] - Particle color (matches bullet)
     * @param {Object} [opts] - Options: { shotLevel, hasPower, isKill, isHyper }
     */
    function createBulletSpark(x, y, color = '#fff', opts = {}) {
        const vfx = G.Balance?.VFX || {};
        const baseCount = vfx.SPARK_COUNT_BASE || 4;
        const perLevel = vfx.SPARK_COUNT_PER_LEVEL || 2;
        const level = opts.shotLevel || 1;
        const targetCount = baseCount + (level - 1) * perLevel;
        const count = Math.min(targetCount, MAX_PARTICLES - particles.length);

        const sizeMult = opts.hasPower ? (vfx.SPARK_POWER_SCALE || 1.5) : 1;
        const lifetime = opts.isKill ? 0.30 : 0.18;

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 180 + 100;
            addParticle({
                x: x + (Math.random() - 0.5) * 6,
                y: y + (Math.random() - 0.5) * 6,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: lifetime, maxLife: lifetime,
                color: i < 2 ? '#fff' : color, // First 2 white, rest colored
                size: (Math.random() * 3 + 2) * sizeMult
            });
        }

        // Kill ring (expanding burst on kill)
        if (opts.isKill && (vfx.SPARK_KILL_RING !== false)) {
            addParticle({
                x: x, y: y, vx: 0, vy: 0,
                life: 0.15, maxLife: 0.15,
                color: color, size: 18,
                isRing: true
            });
        }

        // HYPER golden ring
        if (opts.isHyper && (vfx.SPARK_HYPER_RING !== false)) {
            addParticle({
                x: x, y: y, vx: 0, vy: 0,
                life: 0.20, maxLife: 0.20,
                color: '#FFD700', size: 22,
                isRing: true
            });
        }
    }

    /**
     * Create graze spark effect - particles flying toward player
     */
    function createGrazeSpark(bx, by, px, py, isCloseGraze = false) {
        const dx = px - bx;
        const dy = py - by;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const dirX = dx / dist;
        const dirY = dy / dist;

        // Close graze = more particles, bigger, golden color
        const count = isCloseGraze ? 5 : 3;
        const color = isCloseGraze ? '#ffd700' : '#ffffff';
        const sizeBase = isCloseGraze ? 3 : 2;

        for (let i = 0; i < count; i++) {
            addParticle({
                x: bx + (Math.random() - 0.5) * 6,
                y: by + (Math.random() - 0.5) * 6,
                vx: dirX * (150 + Math.random() * 100) + (Math.random() - 0.5) * 50,
                vy: dirY * (150 + Math.random() * 100) + (Math.random() - 0.5) * 50,
                life: 0.25 + Math.random() * 0.15,
                maxLife: 0.4,
                size: sizeBase + Math.random() * 2,
                color: color,
                type: 'graze'
            });
        }
    }

    /**
     * Create power-up pickup burst effect
     */
    function createPowerUpPickupEffect(x, y, color) {
        const available = MAX_PARTICLES - particles.length;
        if (available <= 0) return;

        // Expanding ring
        addParticle({
            x: x, y: y, vx: 0, vy: 0,
            life: 0.3, maxLife: 0.3,
            color: color, size: 20,
            isRing: true
        });

        // Star burst pattern
        const count = Math.min(8, available - 1);
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i;
            const speed = Math.random() * 150 + 100;
            addParticle({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.4,
                maxLife: 0.4,
                color: i % 2 === 0 ? color : '#fff',
                size: Math.random() * 5 + 3
            });
        }

        // Center flash
        addParticle({
            x: x, y: y, vx: 0, vy: 0,
            life: 0.15, maxLife: 0.15,
            color: '#fff', size: 15,
            isRing: true
        });
    }

    /**
     * Create muzzle flash particles — v4.5: scales with level/modifiers
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {string} color - Weapon color
     * @param {Object} [opts] - { shotLevel, hasPower, hasRate }
     */
    function createMuzzleFlashParticles(x, y, color, opts = {}) {
        const available = MAX_PARTICLES - particles.length;
        if (available <= 0) return;

        const vfx = G.Balance?.VFX || {};
        const level = opts.shotLevel || 1;
        const baseCount = 3 + level * 2; // 5/7/9 particles by level
        const count = Math.min(baseCount, available);

        const sizeMult = opts.hasPower ? (vfx.MUZZLE_POWER_SCALE || 1.3) : 1;
        const speedMult = opts.hasRate ? 1.4 : 1;

        // Upward sparks (following bullet direction)
        for (let i = 0; i < count; i++) {
            const spread = (Math.random() - 0.5) * (0.6 + level * 0.15);
            const speed = (Math.random() * 200 + 150) * speedMult;
            addParticle({
                x: x + (Math.random() - 0.5) * (6 + level * 2),
                y: y,
                vx: spread * speed,
                vy: -speed * 0.6,
                life: 0.12 + level * 0.02,
                maxLife: 0.18,
                color: i < 2 ? '#fff' : color,
                size: (Math.random() * 3 + 2) * sizeMult
            });
        }

        // Flash ring (always, size scales with level)
        if (available > count) {
            addParticle({
                x: x, y: y, vx: 0, vy: 0,
                life: 0.06 + level * 0.02, maxLife: 0.10,
                color: color, size: 6 + level * 3,
                isRing: true
            });
        }
    }

    /**
     * Create explosion with rings and varied particles
     */
    function createExplosion(x, y, color, count = 12) {
        const available = MAX_PARTICLES - particles.length;
        if (available <= 0) return;

        const actualCount = Math.min(count, Math.floor(available * 0.6));

        // Core explosion particles (varied sizes for depth)
        for (let i = 0; i < actualCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 280 + 80;
            const sizeVariant = i < actualCount / 3 ? 7 : (i < actualCount * 2/3 ? 5 : 3);
            addParticle({
                x: x + (Math.random() - 0.5) * 10,
                y: y + (Math.random() - 0.5) * 10,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.45, maxLife: 0.45,
                color: color,
                size: sizeVariant + Math.random() * 2
            });
        }

        // White spark highlights
        const highlightCount = Math.min(4, available - actualCount);
        for (let i = 0; i < highlightCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 120 + 60;
            addParticle({
                x: x, y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.25, maxLife: 0.25,
                color: '#fff',
                size: Math.random() * 4 + 2
            });
        }

        // Outer flash ring (colored, large)
        addParticle({
            x: x, y: y, vx: 0, vy: 0,
            life: 0.15, maxLife: 0.15,
            color: color, size: 25,
            isRing: true
        });

        // Inner flash ring (white, smaller, faster)
        addParticle({
            x: x, y: y, vx: 0, vy: 0,
            life: 0.1, maxLife: 0.1,
            color: '#fff', size: 12,
            isRing: true
        });
    }

    /**
     * Enhanced explosion for enemy deaths — v4.5: tier-differentiated
     * @param {number} x
     * @param {number} y
     * @param {string} color
     * @param {string} symbol
     * @param {string} [shape] - Enemy shape for debris style
     */
    function createEnemyDeathExplosion(x, y, color, symbol, shape) {
        const Balance = G.Balance;
        const vfx = Balance?.VFX || {};

        // Determine tier
        let tier = 'WEAK';
        if (Balance?.isStrongTier && Balance.isStrongTier(symbol)) tier = 'STRONG';
        else if (Balance?.isMediumTier && Balance.isMediumTier(symbol)) tier = 'MEDIUM';

        const tierConf = vfx['EXPLOSION_' + tier] || { particles: 8, ringCount: 1, duration: 0.35, debrisCount: 3 };

        // Core explosion (scaled by tier)
        createExplosion(x, y, color, tierConf.particles);

        const available = MAX_PARTICLES - particles.length;
        if (available <= 2) return;

        // Strong tier: white flash ring
        if (tierConf.flash) {
            addParticle({
                x: x, y: y, vx: 0, vy: 0,
                life: 0.12, maxLife: 0.12,
                color: '#fff', size: 30,
                isRing: true
            });
        }

        // Additional ring for strong tier (double ring)
        if (tierConf.ringCount >= 2) {
            addParticle({
                x: x, y: y, vx: 0, vy: 0,
                life: 0.20, maxLife: 0.20,
                color: color, size: 35,
                isRing: true
            });
        }

        // Flying currency symbols (2 for weak, 3 for medium/strong)
        const symbolCount = Math.min(tier === 'WEAK' ? 2 : 3, available - 2);
        for (let i = 0; i < symbolCount; i++) {
            const angle = (Math.PI * 2 / symbolCount) * i + Math.random() * 0.5;
            const speed = Math.random() * 150 + 100;
            addParticle({
                x: x, y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 50,
                life: tierConf.duration + 0.25,
                maxLife: tierConf.duration + 0.25,
                color: color,
                size: 16 + Math.random() * 6,
                symbol: symbol,
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 15
            });
        }

        // Shape-specific debris
        const debrisCount = Math.min(tierConf.debrisCount, available - symbolCount);
        const CU = G.ColorUtils;
        const debrisColor = CU ? CU.darken(color, 0.2) : color;

        for (let i = 0; i < debrisCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 220 + 100;
            // Debris size varies by shape
            let dSize = Math.random() * 5 + 3;
            if (shape === 'bar') dSize = Math.random() * 4 + 4;      // Chunky golden shards
            else if (shape === 'bill') dSize = Math.random() * 3 + 2; // Thin paper scraps
            else if (shape === 'card') dSize = Math.random() * 4 + 3; // Digital fragments

            addParticle({
                x: x + (Math.random() - 0.5) * 15,
                y: y + (Math.random() - 0.5) * 15,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: tierConf.duration,
                maxLife: tierConf.duration,
                color: i % 3 === 0 ? '#fff' : debrisColor,
                size: dSize
            });
        }

        // Shockwave ring (expanding semi-transparent)
        if (tier !== 'WEAK') {
            const shockSize = tier === 'STRONG' ? 40 : 28;
            addParticle({
                x: x, y: y, vx: 0, vy: 0,
                life: 0.25, maxLife: 0.25,
                color: color, size: shockSize,
                isRing: true
            });
        }
    }

    /**
     * EPIC Boss death explosion - massive with flying $ symbols
     */
    function createBossDeathExplosion(x, y) {
        // Multiple explosion waves
        createExplosion(x, y, '#ff0000', 20);
        createExplosion(x - 40, y - 30, '#f39c12', 12);
        createExplosion(x + 40, y - 30, '#f39c12', 12);
        createExplosion(x, y + 40, '#2ecc71', 10);

        const available = MAX_PARTICLES - particles.length;
        if (available <= 5) return;

        // Flying $ symbols in all directions
        const symbolCount = Math.min(8, Math.floor(available * 0.4));
        const symbols = ['$', '€', '¥', '£', '₣'];
        for (let i = 0; i < symbolCount; i++) {
            const angle = (Math.PI * 2 / symbolCount) * i + Math.random() * 0.3;
            const speed = Math.random() * 200 + 150;
            addParticle({
                x: x + (Math.random() - 0.5) * 40,
                y: y + (Math.random() - 0.5) * 40,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 80,
                life: 1.2,
                maxLife: 1.2,
                color: ['#2ecc71', '#f39c12', '#e74c3c', '#fff'][i % 4],
                size: 24 + Math.random() * 12,
                symbol: symbols[i % symbols.length],
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 20
            });
        }

        // Big flash rings
        addParticle({
            x: x, y: y, vx: 0, vy: 0,
            life: 0.4, maxLife: 0.4,
            color: '#fff', size: 60,
            isRing: true
        });
        addParticle({
            x: x, y: y, vx: 0, vy: 0,
            life: 0.3, maxLife: 0.3,
            color: '#ff0000', size: 80,
            isRing: true
        });
        addParticle({
            x: x, y: y, vx: 0, vy: 0,
            life: 0.5, maxLife: 0.5,
            color: '#f39c12', size: 100,
            isRing: true
        });

        // Extra debris
        const debrisCount = Math.min(10, available - symbolCount - 3);
        for (let i = 0; i < debrisCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 350 + 100;
            addParticle({
                x: x + (Math.random() - 0.5) * 60,
                y: y + (Math.random() - 0.5) * 60,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.6,
                maxLife: 0.6,
                color: ['#ff0000', '#f39c12', '#2ecc71', '#fff'][i % 4],
                size: Math.random() * 8 + 4
            });
        }
    }

    /**
     * Create score particles that home toward HUD
     */
    function createScoreParticles(x, y, color) {
        const count = Math.min(3, MAX_PARTICLES - particles.length);
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 100 + 50;
            addParticle({
                x: x, y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.2, maxLife: 1.2,
                color: color || '#FFD700',
                size: Math.random() * 4 + 2,
                target: { x: gameWidth / 2, y: 30 }
            });
        }
    }

    /**
     * Update all particles
     * @param {number} dt - Delta time in seconds
     */
    function update(dt) {
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];

            if (p.target) {
                // Homing Logic (Score Particles)
                const dx = p.target.x - p.x;
                const dy = p.target.y - p.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 30) {
                    releaseParticle(p);
                    particles.splice(i, 1);
                    continue;
                }

                // Steer towards target
                const accel = 1500 * dt / dist;
                p.vx += dx * accel;
                p.vy += dy * accel;
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.size = Math.max(1, p.size * 0.95);
            } else {
                // Standard Physics
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.life -= dt;
                // Rotate symbols, shrink regular particles
                if (p.symbol) {
                    p.rotation = (p.rotation || 0) + (p.rotSpeed || 5) * dt;
                } else {
                    p.size *= 0.92;
                }

                // Remove dead or offscreen particles
                if (p.life <= 0 || p.x < -50 || p.x > gameWidth + 50 || p.y > gameHeight + 50) {
                    releaseParticle(p);
                    particles.splice(i, 1);
                }
            }
        }
    }

    /**
     * Draw all particles
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    function draw(ctx) {
        const len = particles.length;
        if (len === 0) return;

        ctx.save();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#111';

        // === ADDITIVE RING GLOW v4.23 ===
        const _ringGlow = window.Game.Balance?.GLOW;
        const _useAdditiveRings = _ringGlow?.ENABLED && _ringGlow?.PARTICLES?.ENABLED;

        for (let i = 0; i < len; i++) {
            const p = particles[i];

            // Skip offscreen particles (culling)
            if (p.x < -20 || p.x > gameWidth + 20 || p.y < -20 || p.y > gameHeight + 20) continue;

            ctx.globalAlpha = p.life / p.maxLife;

            if (p.isRing) {
                // Expanding ring
                if (_useAdditiveRings) ctx.globalCompositeOperation = 'lighter';
                const expand = (1 - p.life / p.maxLife) * 35;
                ctx.strokeStyle = p.color;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size + expand, 0, Math.PI * 2);
                ctx.stroke();
                if (_useAdditiveRings) ctx.globalCompositeOperation = 'source-over';
                ctx.strokeStyle = '#111';
                ctx.lineWidth = 2;
            } else if (p.symbol) {
                // Symbol particle (flying currency symbols)
                ctx.fillStyle = p.color;
                ctx.strokeStyle = '#111';
                ctx.lineWidth = 2;
                ctx.font = window.Game.ColorUtils.font('bold', p.size, 'Arial');
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation || 0);
                ctx.strokeText(p.symbol, 0, 0);
                ctx.fillText(p.symbol, 0, 0);
                ctx.restore();
            } else {
                // Circle particles with outline
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
                if (p.size > 2) ctx.stroke();
            }
        }

        ctx.globalAlpha = 1;
        ctx.restore();
    }

    /**
     * Clear all particles (for level reset)
     */
    function clear() {
        particles.forEach(p => releaseParticle(p));
        particles = [];
    }

    /**
     * Get particle count
     */
    function getCount() {
        return particles.length;
    }

    // Export to namespace
    G.ParticleSystem = {
        init,
        setDimensions,
        addParticle,
        createBulletSpark,
        createGrazeSpark,
        createPowerUpPickupEffect,
        createMuzzleFlashParticles,
        createExplosion,
        createEnemyDeathExplosion,
        createBossDeathExplosion,
        createScoreParticles,
        update,
        draw,
        clear,
        getCount,
        MAX_PARTICLES
    };
})();
