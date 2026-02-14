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
    const MAX_CANVAS_EFFECTS = 20; // v5.13: Cap for canvas-drawn effects

    // Particle state
    let particles = [];
    let gameWidth = 0;
    let gameHeight = 0;

    // v5.13: Canvas effects (lightning bolts, contagion lines, ripples)
    let canvasEffects = [];

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
     * v5.13: Add a canvas effect (lightning, contagion line, ripple)
     * @param {Object} effect - { type, timer, ... } — decremented in update
     */
    function addCanvasEffect(effect) {
        if (canvasEffects.length >= MAX_CANVAS_EFFECTS) return;
        canvasEffects.push(effect);
    }

    /**
     * Create bullet collision spark — v4.5: contextual, colored, scaled
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {string} [color='#fff'] - Particle color (matches bullet)
     * @param {Object} [opts] - Options: { weaponLevel, isKill, isHyper }
     */
    function createBulletSpark(x, y, color = '#fff', opts = {}) {
        const vfx = G.Balance?.VFX || {};
        const level = opts.weaponLevel ?? 1;
        const sizeMult = level >= 4 ? (vfx.SPARK_POWER_SCALE || 1.5) : 1;

        // Cancel: more particles, faster, longer lived
        const baseCount = opts.isCancel ? 8 : (opts.isKill ? 6 : (vfx.SPARK_COUNT_BASE || 4));
        const perLevel = vfx.SPARK_COUNT_PER_LEVEL || 2;
        const targetCount = opts.isCancel ? baseCount : baseCount + (level - 1) * perLevel;
        const count = Math.min(targetCount, MAX_PARTICLES - particles.length);
        const lifetime = opts.isKill ? 0.30 : (opts.isCancel ? 0.28 : 0.20);

        // Shrapnel particles — fast directional fragments, no rings/glow
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            // Varied speeds: some fast shrapnel, some slower embers
            const speedBase = opts.isCancel ? 200 : 160;
            const speedRange = opts.isCancel ? 250 : 200;
            const speed = Math.random() * speedRange + speedBase;
            const sz = (Math.random() * 3 + 1.5) * sizeMult;
            addParticle({
                x: x + (Math.random() - 0.5) * 4,
                y: y + (Math.random() - 0.5) * 4,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: lifetime * (0.6 + Math.random() * 0.4),
                maxLife: lifetime,
                color: i < 2 ? '#fff' : color,
                size: sz, baseSize: sz,
                explosionGrow: true,
                isSpark: true
            });
        }

        // Kill: extra fast outer shrapnel burst
        if (opts.isKill && (vfx.SPARK_KILL_RING !== false)) {
            const extra = Math.min(4, MAX_PARTICLES - particles.length);
            for (let i = 0; i < extra; i++) {
                const angle = (Math.PI * 2 / extra) * i + Math.random() * 0.4;
                const speed = 350 + Math.random() * 150;
                addParticle({
                    x: x, y: y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    life: 0.15, maxLife: 0.20,
                    color: '#fff',
                    size: 2.5, baseSize: 2.5,
                    explosionGrow: true,
                    isSpark: true
                });
            }
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
     * @param {Object} [opts] - { weaponLevel }
     */
    function createMuzzleFlashParticles(x, y, color, opts = {}) {
        const available = MAX_PARTICLES - particles.length;
        if (available <= 0) return;

        const vfx = G.Balance?.VFX || {};
        const level = opts.weaponLevel ?? 1;
        const isGodchain = opts.isGodchain || false;

        // Determine elemental tint
        const rs = G.RunState;
        let sparkColor = color;
        if (isGodchain) {
            sparkColor = '#ff6600';
        } else if (rs?.hasElectricPerk) {
            sparkColor = '#8844ff';
        } else if (rs?.hasLaserPerk) {
            sparkColor = '#00f0ff';
        } else if (rs?.hasFirePerk) {
            sparkColor = '#ff4400';
        }

        // Spark count: reduced (canvas flash carries visual weight)
        const sparkBase = vfx.MUZZLE_SPARK_BASE || 2;
        const sparkPerLvl = vfx.MUZZLE_SPARK_PER_LEVEL || 1;
        const sparkCount = Math.min(sparkBase + (level - 1) * sparkPerLvl, available);
        const spread = vfx.MUZZLE_SPARK_SPREAD || 0.3;
        const sizeMult = level >= 4 ? (vfx.MUZZLE_POWER_SCALE || 1.3) : 1;
        const speedMult = level >= 3 ? 1.2 : 1;

        // Actual cannon positions (must match Player._drawShipBody geometry)
        // x,y passed in is player.x, player.y - 25 (nose area)
        // We compute offsets relative to that anchor
        const muzzles = [];
        if (level <= 1) {
            // LV1: nose tip at (0, -28) → anchor is (0, -25) → dy = -3
            muzzles.push({ dx: 0, dy: -3 });
        } else if (level <= 3) {
            // LV2-3: gun pods — podX=13, podTop varies
            const podX = 13;
            const podTop = level >= 3 ? -28 : -22;
            // Anchor is player.y - 25, so dy = podTop - (-25) = podTop + 25
            muzzles.push({ dx: -podX, dy: podTop + 25 });
            muzzles.push({ dx: podX, dy: podTop + 25 });
        } else {
            // LV4+: pods(±15) + central barrel
            const podX = 15;
            const podTop = level >= 5 ? -32 : -30;
            const barrelTop = level >= 5 ? -40 : -36;
            muzzles.push({ dx: -podX, dy: podTop + 25 });
            muzzles.push({ dx: 0, dy: barrelTop + 25 });
            muzzles.push({ dx: podX, dy: podTop + 25 });
        }

        // Directional sparks per cannon
        for (const mp of muzzles) {
            for (let i = 0; i < sparkCount; i++) {
                if (particles.length >= MAX_PARTICLES) return;
                const angle = -Math.PI / 2 + (Math.random() - 0.5) * spread;
                const speed = (Math.random() * 180 + 120) * speedMult;
                addParticle({
                    x: x + mp.dx + (Math.random() - 0.5) * 4,
                    y: y + mp.dy,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    life: 0.10 + Math.random() * 0.04,
                    maxLife: 0.14,
                    color: i === 0 ? '#fff' : sparkColor,
                    size: (Math.random() * 2.5 + 1.5) * sizeMult
                });
            }

            // Tracer particle: fast, white, short-lived
            if (particles.length < MAX_PARTICLES) {
                const tracerSpeed = vfx.MUZZLE_TRACER_SPEED || 400;
                const tracerLife = vfx.MUZZLE_TRACER_LIFE || 0.10;
                const tracerSize = vfx.MUZZLE_TRACER_SIZE || 2.5;
                addParticle({
                    x: x + mp.dx,
                    y: y + mp.dy,
                    vx: (Math.random() - 0.5) * 15,
                    vy: -tracerSpeed,
                    life: tracerLife,
                    maxLife: tracerLife,
                    color: '#fff',
                    size: tracerSize,
                    isSpark: true
                });
            }
        }
    }

    /**
     * Create explosion with rings and varied particles
     */
    function createExplosion(x, y, color, count = 12) {
        const available = MAX_PARTICLES - particles.length;
        if (available <= 0) return;

        const actualCount = Math.min(count, Math.floor(available * 0.7));

        // Core shrapnel — fast fragments flying outward
        for (let i = 0; i < actualCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 300 + 100;
            // 3 size tiers: big chunks, medium, small sparks
            const sz = i < actualCount / 3 ? 6 + Math.random() * 2
                     : i < actualCount * 2/3 ? 4 + Math.random() * 2
                     : 2 + Math.random() * 2;
            addParticle({
                x: x + (Math.random() - 0.5) * 8,
                y: y + (Math.random() - 0.5) * 8,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.35 + Math.random() * 0.15,
                maxLife: 0.50,
                color: color,
                size: sz * 0.6, baseSize: sz,
                explosionGrow: true
            });
        }

        // White-hot sparks — fast, small, short-lived
        const sparkCount = Math.min(5, available - actualCount);
        for (let i = 0; i < sparkCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 400 + 200;
            addParticle({
                x: x, y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.12 + Math.random() * 0.10,
                maxLife: 0.22,
                color: '#fff',
                size: 2, baseSize: 2,
                explosionGrow: true,
                isSpark: true
            });
        }
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

        // Strong/Medium tier: extra fast shrapnel burst instead of rings
        if (tier !== 'WEAK') {
            const extraCount = tier === 'STRONG' ? 6 : 3;
            const burst = Math.min(extraCount, Math.floor(available * 0.3));
            for (let i = 0; i < burst; i++) {
                const angle = (Math.PI * 2 / burst) * i + Math.random() * 0.5;
                const speed = 350 + Math.random() * 200;
                addParticle({
                    x: x, y: y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    life: 0.18 + Math.random() * 0.08,
                    maxLife: 0.26,
                    color: i % 2 === 0 ? '#fff' : color,
                    size: 2.5, baseSize: 2.5,
                    explosionGrow: true,
                    isSpark: true
                });
            }
        }

        // Flying currency symbols (2 for weak, 3 for medium/strong)
        const availNow = MAX_PARTICLES - particles.length;
        const symbolCount = Math.min(tier === 'WEAK' ? 2 : 3, availNow - 2);
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

        // Shape-specific debris — fast directional chunks
        const debrisCount = Math.min(tierConf.debrisCount, MAX_PARTICLES - particles.length);
        const CU = G.ColorUtils;
        const debrisColor = CU ? CU.darken(color, 0.2) : color;

        for (let i = 0; i < debrisCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 250 + 120;
            let dSize = Math.random() * 5 + 3;
            if (shape === 'bar') dSize = Math.random() * 4 + 4;
            else if (shape === 'bill') dSize = Math.random() * 3 + 2;
            else if (shape === 'card') dSize = Math.random() * 4 + 3;

            addParticle({
                x: x + (Math.random() - 0.5) * 12,
                y: y + (Math.random() - 0.5) * 12,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: tierConf.duration * (0.7 + Math.random() * 0.3),
                maxLife: tierConf.duration,
                color: i % 3 === 0 ? '#fff' : debrisColor,
                size: dSize * 0.6, baseSize: dSize,
                explosionGrow: true
            });
        }
    }

    /**
     * EPIC Boss death explosion - massive with flying $ symbols
     */
    function createBossDeathExplosion(x, y) {
        // Multiple explosion waves
        createExplosion(x, y, '#ff2244', 20);
        createExplosion(x - 40, y - 30, '#ffaa00', 12);
        createExplosion(x + 40, y - 30, '#ffaa00', 12);
        createExplosion(x, y + 40, '#00ff66', 10);

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
                color: ['#00ff66', '#ffaa00', '#ff3344', '#fff'][i % 4],
                size: 24 + Math.random() * 12,
                symbol: symbols[i % symbols.length],
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 20
            });
        }

        // Massive shrapnel burst — replaces rings
        const burstAvail = MAX_PARTICLES - particles.length;
        const burstCount = Math.min(15, burstAvail);
        const burstColors = ['#ff2244', '#ffaa00', '#00ff66', '#fff'];
        for (let i = 0; i < burstCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 450 + 150;
            const sz = Math.random() * 6 + 3;
            addParticle({
                x: x + (Math.random() - 0.5) * 50,
                y: y + (Math.random() - 0.5) * 50,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.4 + Math.random() * 0.3,
                maxLife: 0.7,
                color: burstColors[i % 4],
                size: sz * 0.6, baseSize: sz,
                explosionGrow: true,
                isSpark: i < 5
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
     * v4.29: Forward-iterate with write-pointer compaction (1 pass O(n))
     * instead of backward-iterate + splice O(n) per removal
     * @param {number} dt - Delta time in seconds
     */
    function update(dt) {
        let writeIdx = 0;
        for (let readIdx = 0; readIdx < particles.length; readIdx++) {
            const p = particles[readIdx];
            let remove = false;

            if (p.target) {
                // Homing Logic (Score Particles)
                const dx = p.target.x - p.x;
                const dy = p.target.y - p.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 30) {
                    remove = true;
                } else {
                    // Steer towards target
                    const accel = 1500 * dt / dist;
                    p.vx += dx * accel;
                    p.vy += dy * accel;
                    p.x += p.vx * dt;
                    p.y += p.vy * dt;
                    p.size = Math.max(1, p.size * 0.95);
                }
            } else {
                // Standard Physics
                // v5.11: Gravity + wobble support
                if (p.gravity) p.vy += p.gravity * dt;
                if (p.wobbleAmp) {
                    p._wobbleT = (p._wobbleT || 0) + dt;
                    p.vx = Math.sin(p._wobbleT * (p.wobbleFreq || 3)) * p.wobbleAmp;
                }
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.life -= dt;
                // Rotate symbols; explosion particles grow then hold, others fade size gently
                if (p.symbol) {
                    p.rotation = (p.rotation || 0) + (p.rotSpeed || 5) * dt;
                } else if (p.explosionGrow) {
                    // Explosion lifecycle: quick expand (first 25% of life), then hold
                    const lifeRatio = 1 - (p.life / p.maxLife); // 0→1
                    if (lifeRatio < 0.25) {
                        // Expand phase: grow from 60% to 100% of target size
                        p.size = p.baseSize * (0.6 + lifeRatio * 1.6);
                    }
                    // After 25%: size stays at baseSize (alpha handles fade)
                } else {
                    p.size *= 0.97; // Gentler shrink for non-explosion particles
                }

                // Remove dead or offscreen particles
                if (p.life <= 0 || p.x < -50 || p.x > gameWidth + 50 || p.y > gameHeight + 50) {
                    remove = true;
                }
            }

            if (remove) {
                releaseParticle(p);
            } else {
                if (writeIdx !== readIdx) particles[writeIdx] = p;
                writeIdx++;
            }
        }
        particles.length = writeIdx;

        // v5.13: Update canvas effects
        let ceWrite = 0;
        for (let i = 0; i < canvasEffects.length; i++) {
            const ce = canvasEffects[i];
            ce.timer -= dt;
            if (ce.timer > 0) {
                if (ceWrite !== i) canvasEffects[ceWrite] = ce;
                ceWrite++;
            }
        }
        canvasEffects.length = ceWrite;
    }

    /**
     * Draw all particles
     * v4.30: Multi-pass rendering — standard particles first (source-over),
     * then additive particles (isGlow, isRing, isSpark) in one lighter pass.
     * Reduces ~40-60 composite switches per frame to 2.
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    function draw(ctx) {
        const len = particles.length;
        if (len === 0) return;

        ctx.save();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#111';

        const _ringGlow = window.Game.Balance?.GLOW;
        const _useAdditive = _ringGlow?.ENABLED && _ringGlow?.PARTICLES?.ENABLED;

        // === Pass 1: Standard particles (source-over) — circles, symbols ===
        for (let i = 0; i < len; i++) {
            const p = particles[i];
            if (p.isGlow || p.isRing || p.isSpark) continue; // Additive → Pass 2
            if (p.x < -20 || p.x > gameWidth + 20 || p.y < -20 || p.y > gameHeight + 20) continue;

            ctx.globalAlpha = p.life / p.maxLife;

            if (p.symbol) {
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
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
                if (p.size > 2) ctx.stroke();
            }
        }

        // === Pass 2: Additive particles (lighter) — rings, sparks, glow ===
        if (_useAdditive) ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 2;

        for (let i = 0; i < len; i++) {
            const p = particles[i];
            if (!p.isGlow && !p.isRing && !p.isSpark) continue; // Standard → Pass 1
            if (p.x < -20 || p.x > gameWidth + 20 || p.y < -20 || p.y > gameHeight + 20) continue;

            ctx.globalAlpha = p.life / p.maxLife;

            if (p.isGlow) {
                const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
                gradient.addColorStop(0, p.color);
                gradient.addColorStop(1, 'transparent');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            } else if (p.isRing) {
                const expand = (1 - p.life / p.maxLife) * 35;
                ctx.strokeStyle = p.color;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size + expand, 0, Math.PI * 2);
                ctx.stroke();
                ctx.strokeStyle = '#111';
                ctx.lineWidth = 2;
            } else {
                // isSpark
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
                if (p.size > 2) ctx.stroke();
            }
        }

        // === v5.13: Canvas effects (lightning, contagion lines, ripples) ===
        if (canvasEffects.length > 0) {
            if (!_useAdditive) ctx.globalCompositeOperation = 'lighter';
            for (let i = 0; i < canvasEffects.length; i++) {
                const ce = canvasEffects[i];
                const alpha = ce.timer / ce.maxTimer;
                ctx.globalAlpha = alpha;

                if (ce.type === 'lightning') {
                    // Core line
                    ctx.strokeStyle = ce.coreColor;
                    ctx.lineWidth = ce.coreWidth;
                    ctx.beginPath();
                    for (let s = 0; s < ce.segments.length; s++) {
                        const seg = ce.segments[s];
                        if (s === 0) ctx.moveTo(seg.x, seg.y);
                        else ctx.lineTo(seg.x, seg.y);
                    }
                    ctx.stroke();
                    // Glow line (wider, lower alpha)
                    ctx.globalAlpha = alpha * 0.5;
                    ctx.strokeStyle = ce.glowColor;
                    ctx.lineWidth = ce.glowWidth;
                    ctx.beginPath();
                    for (let s = 0; s < ce.segments.length; s++) {
                        const seg = ce.segments[s];
                        if (s === 0) ctx.moveTo(seg.x, seg.y);
                        else ctx.lineTo(seg.x, seg.y);
                    }
                    ctx.stroke();
                    // Branches
                    if (ce.branches) {
                        ctx.globalAlpha = alpha * 0.4;
                        ctx.strokeStyle = ce.branchColor;
                        ctx.lineWidth = 1;
                        for (let b = 0; b < ce.branches.length; b++) {
                            const br = ce.branches[b];
                            ctx.beginPath();
                            for (let s = 0; s < br.length; s++) {
                                if (s === 0) ctx.moveTo(br[s].x, br[s].y);
                                else ctx.lineTo(br[s].x, br[s].y);
                            }
                            ctx.stroke();
                        }
                    }
                } else if (ce.type === 'contagion_line') {
                    ctx.strokeStyle = ce.color;
                    ctx.lineWidth = ce.width || 2;
                    ctx.beginPath();
                    ctx.moveTo(ce.x1, ce.y1);
                    ctx.lineTo(ce.x2, ce.y2);
                    ctx.stroke();
                } else if (ce.type === 'ripple') {
                    const expand = (1 - alpha) * (ce.radius || 18);
                    ctx.strokeStyle = ce.color;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(ce.x, ce.y, 4 + expand, 0, Math.PI * 2);
                    ctx.stroke();
                }
            }
        }

        if (_useAdditive || canvasEffects.length > 0) ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        ctx.restore();
    }

    /**
     * Clear all particles (for level reset)
     */
    function clear() {
        particles.forEach(p => releaseParticle(p));
        particles = [];
        canvasEffects = [];
    }

    /**
     * Get particle count
     */
    function getCount() {
        return particles.length;
    }

    // v4.60: Fire impact burst (orange/red particles)
    function createFireImpact(x, y) {
        const count = G.Balance?.ELEMENTAL?.FIRE?.IMPACT_PARTICLES || 8;
        const colors = ['#ff4400', '#ff6600', '#ffaa00', '#ff2200'];
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 60 + Math.random() * 100;
            addParticle({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: colors[Math.floor(Math.random() * colors.length)],
                size: 2 + Math.random() * 3,
                life: 0.3 + Math.random() * 0.3,
                shape: 'circle',
                gravity: 100,
                fadeOut: true
            });
        }
    }

    // v4.60: Electric chain line (particles along chain path)
    function createElectricChain(x1, y1, x2, y2) {
        const steps = 5;
        const colors = ['#8844ff', '#bb88ff', '#ffffff'];
        for (let i = 0; i < steps; i++) {
            const t = i / steps;
            const px = x1 + (x2 - x1) * t + (Math.random() - 0.5) * 10;
            const py = y1 + (y2 - y1) * t + (Math.random() - 0.5) * 10;
            addParticle({
                x: px, y: py,
                vx: (Math.random() - 0.5) * 40,
                vy: (Math.random() - 0.5) * 40,
                color: colors[Math.floor(Math.random() * colors.length)],
                size: 1.5 + Math.random() * 2,
                life: 0.2 + Math.random() * 0.2,
                shape: 'circle',
                fadeOut: true
            });
        }
    }

    // v5.11: Weapon evolution upgrade burst (shockwave + radial sparks + central flash)
    function createWeaponUpgradeEffect(x, y, level) {
        const available = MAX_PARTICLES - particles.length;
        if (available <= 5) return;

        const intensity = Math.min(level, 3); // Scale effect with level

        // Shockwave ring (expanding white→cyan)
        addParticle({
            x, y,
            vx: 0, vy: 0,
            life: 0.4, maxLife: 0.4,
            color: '#00f0ff',
            size: 8, baseSize: 60 * intensity * 0.5,
            isRing: true,
            explosionGrow: true
        });

        // Radial energy sparks
        const sparkCount = Math.min(14, available - 2);
        const sparkColors = ['#00f0ff', '#ffffff', '#66ddff', '#aaeeff'];
        for (let i = 0; i < sparkCount; i++) {
            const angle = (Math.PI * 2 / sparkCount) * i + Math.random() * 0.3;
            const speed = 250 + Math.random() * 100 + intensity * 30;
            addParticle({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.4 + Math.random() * 0.15,
                maxLife: 0.55,
                color: sparkColors[i % sparkColors.length],
                size: 2 + Math.random() * 2,
                baseSize: 3 + intensity,
                isSpark: true,
                explosionGrow: true
            });
        }

        // Central flash glow
        addParticle({
            x, y,
            vx: 0, vy: 0,
            life: 0.2, maxLife: 0.2,
            color: '#ffffff',
            size: 20 + intensity * 8,
            isGlow: true
        });
    }

    // v5.11: Celebratory coin rain (symbols falling from top)
    function createCoinRain(canvasWidth, canvasHeight) {
        const cfg = G.Balance?.VFX?.BOSS_DEATH?.COIN_RAIN;
        if (!cfg || !cfg.ENABLED) return;

        const count = cfg.COUNT || 25;
        const spawnDuration = cfg.SPAWN_DURATION || 1.5;
        const symbols = cfg.SYMBOLS || ['$', '€', '¥', '£', '₿'];
        const colors = cfg.COLORS || ['#FFD700', '#ffaa00', '#00ff66', '#fff'];

        for (let i = 0; i < count; i++) {
            const delay = (i / count) * spawnDuration;
            setTimeout(() => {
                const available = MAX_PARTICLES - particles.length;
                if (available <= 0) return;
                const fallSpeed = (cfg.FALL_SPEED?.MIN || 60) + Math.random() * ((cfg.FALL_SPEED?.MAX || 120) - (cfg.FALL_SPEED?.MIN || 60));
                addParticle({
                    x: Math.random() * canvasWidth,
                    y: -20 - Math.random() * 40,
                    vx: 0,
                    vy: fallSpeed,
                    life: cfg.LIFE || 3.0,
                    maxLife: cfg.LIFE || 3.0,
                    color: colors[i % colors.length],
                    size: 18 + Math.random() * 8,
                    symbol: symbols[i % symbols.length],
                    rotation: Math.random() * Math.PI * 2,
                    rotSpeed: (Math.random() - 0.5) * 8,
                    wobbleAmp: cfg.WOBBLE?.AMOUNT || 30,
                    wobbleFreq: cfg.WOBBLE?.SPEED || 3,
                    _wobbleT: Math.random() * 6 // Random phase offset
                });
            }, delay * 1000);
        }
    }

    // v5.11: Evolution item trail particles (cyan glow sparks)
    function createEvolutionItemTrail(x, y) {
        const trailCount = G.Balance?.VFX?.BOSS_DEATH?.EVOLUTION_ITEM?.TRAIL_PARTICLES || 8;
        const available = MAX_PARTICLES - particles.length;
        const count = Math.min(trailCount, available);
        const color = G.Balance?.VFX?.BOSS_DEATH?.EVOLUTION_ITEM?.GLOW_COLOR || '#00f0ff';

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 20 + Math.random() * 40;
            addParticle({
                x: x + (Math.random() - 0.5) * 12,
                y: y + (Math.random() - 0.5) * 12,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.25 + Math.random() * 0.1,
                maxLife: 0.35,
                color: color,
                size: 2 + Math.random() * 2,
                isSpark: true
            });
        }
    }

    // v5.13: Napalm impact (ring + flame tongues + embers)
    function createNapalmImpact(x, y) {
        const cfg = G.Balance?.ELEMENTAL_VFX?.NAPALM;
        if (!cfg?.ENABLED) { createFireImpact(x, y); return; }

        // Expanding ring
        addParticle({
            x, y, vx: 0, vy: 0,
            life: cfg.RING_LIFE, maxLife: cfg.RING_LIFE,
            color: cfg.RING_COLOR,
            size: cfg.RING_SIZE, baseSize: cfg.RING_EXPAND,
            isRing: true, explosionGrow: true
        });

        // Flame tongues (fast directional sparks)
        const tongueColors = cfg.TONGUE_COLORS;
        for (let i = 0; i < cfg.TONGUE_COUNT; i++) {
            const angle = (Math.PI * 2 / cfg.TONGUE_COUNT) * i + Math.random() * 0.5;
            const speed = cfg.TONGUE_SPEED_MIN + Math.random() * (cfg.TONGUE_SPEED_MAX - cfg.TONGUE_SPEED_MIN);
            addParticle({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: cfg.TONGUE_LIFE, maxLife: cfg.TONGUE_LIFE,
                color: tongueColors[i % tongueColors.length],
                size: cfg.TONGUE_SIZE, baseSize: cfg.TONGUE_SIZE,
                isSpark: true, explosionGrow: true
            });
        }

        // Embers with gravity
        for (let i = 0; i < cfg.EMBER_COUNT; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = cfg.EMBER_SPEED + Math.random() * 30;
            addParticle({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 20,
                life: cfg.EMBER_LIFE, maxLife: cfg.EMBER_LIFE,
                color: tongueColors[Math.floor(Math.random() * tongueColors.length)],
                size: cfg.EMBER_SIZE,
                gravity: cfg.EMBER_GRAVITY
            });
        }
    }

    // v5.13: Lightning bolt (jagged line + branches + endpoint glow)
    function createLightningBolt(x1, y1, x2, y2) {
        const cfg = G.Balance?.ELEMENTAL_VFX?.LIGHTNING;
        if (!cfg?.ENABLED) { createElectricChain(x1, y1, x2, y2); return; }

        // Pre-calculate jagged segments
        const segments = [];
        const dx = x2 - x1, dy = y2 - y1;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const nx = -dy / len, ny = dx / len; // perpendicular normal
        for (let i = 0; i <= cfg.SEGMENTS; i++) {
            const t = i / cfg.SEGMENTS;
            const jitter = (i === 0 || i === cfg.SEGMENTS) ? 0 : (Math.random() - 0.5) * 2 * cfg.JITTER;
            segments.push({
                x: x1 + dx * t + nx * jitter,
                y: y1 + dy * t + ny * jitter
            });
        }

        // Branches
        const branches = [];
        for (let i = 1; i < segments.length - 1; i++) {
            if (Math.random() < cfg.BRANCH_CHANCE) {
                const branchSegs = [{ x: segments[i].x, y: segments[i].y }];
                const bAngle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 1.5;
                let bx = segments[i].x, by = segments[i].y;
                for (let s = 0; s < cfg.BRANCH_SEGMENTS; s++) {
                    bx += Math.cos(bAngle) * (cfg.BRANCH_LENGTH / cfg.BRANCH_SEGMENTS) + (Math.random() - 0.5) * 4;
                    by += Math.sin(bAngle) * (cfg.BRANCH_LENGTH / cfg.BRANCH_SEGMENTS) + (Math.random() - 0.5) * 4;
                    branchSegs.push({ x: bx, y: by });
                }
                branches.push(branchSegs);
            }
        }

        addCanvasEffect({
            type: 'lightning',
            timer: cfg.DURATION,
            maxTimer: cfg.DURATION,
            segments,
            branches,
            coreColor: cfg.CORE_COLOR,
            glowColor: cfg.GLOW_COLOR,
            branchColor: cfg.BRANCH_COLOR,
            coreWidth: cfg.CORE_WIDTH,
            glowWidth: cfg.GLOW_WIDTH
        });

        // Endpoint glow particle
        addParticle({
            x: x2, y: y2, vx: 0, vy: 0,
            life: cfg.DURATION, maxLife: cfg.DURATION,
            color: cfg.GLOW_COLOR,
            size: cfg.ENDPOINT_GLOW_SIZE,
            isGlow: true
        });
    }

    // v5.13: Laser beam impact sparks
    function createLaserBeamImpact(x, y, angle) {
        const cfg = G.Balance?.ELEMENTAL_VFX?.BEAM_IMPACT;
        if (!cfg) return;
        const perpAngle = (angle || 0) + Math.PI / 2;
        for (let i = 0; i < cfg.SPARK_COUNT; i++) {
            const spread = (i - (cfg.SPARK_COUNT - 1) / 2) * 0.6;
            const a = perpAngle + spread + (Math.random() - 0.5) * 0.3;
            addParticle({
                x, y,
                vx: Math.cos(a) * cfg.SPARK_SPEED,
                vy: Math.sin(a) * cfg.SPARK_SPEED,
                life: cfg.SPARK_LIFE, maxLife: cfg.SPARK_LIFE,
                color: cfg.SPARK_COLOR,
                size: cfg.SPARK_SIZE, baseSize: cfg.SPARK_SIZE,
                isSpark: true, explosionGrow: true
            });
        }
    }

    // v5.13: Laser pierce-through flash
    function createLaserPierceFlash(x, y) {
        const cfg = G.Balance?.ELEMENTAL_VFX?.BEAM_IMPACT;
        if (!cfg) return;
        addParticle({
            x, y, vx: 0, vy: 0,
            life: cfg.PIERCE_FLASH_LIFE, maxLife: cfg.PIERCE_FLASH_LIFE,
            color: cfg.PIERCE_FLASH_COLOR,
            size: cfg.PIERCE_FLASH_SIZE,
            isGlow: true
        });
    }

    // v5.13: Elemental pickup burst (ring + radial sparks + central glow)
    function createElementalPickupBurst(x, y, elementType) {
        const cfg = G.Balance?.ELEMENTAL_VFX?.PICKUP_SURGE;
        if (!cfg) { createPowerUpPickupEffect(x, y, '#bb44ff'); return; }
        const colorCfg = cfg.COLORS[elementType] || cfg.COLORS.FIRE;
        const hex = colorCfg.hex;

        // Expanding ring
        addParticle({
            x, y, vx: 0, vy: 0,
            life: 0.35, maxLife: 0.35,
            color: hex, size: 8, baseSize: 45,
            isRing: true, explosionGrow: true
        });

        // Radial sparks
        const count = Math.min(cfg.PARTICLE_COUNT, MAX_PARTICLES - particles.length - 2);
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i + Math.random() * 0.3;
            const speed = 140 + Math.random() * 80;
            addParticle({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.35, maxLife: 0.40,
                color: i % 3 === 0 ? '#ffffff' : hex,
                size: 2.5, baseSize: 3,
                isSpark: true, explosionGrow: true
            });
        }

        // Central glow
        addParticle({
            x, y, vx: 0, vy: 0,
            life: 0.25, maxLife: 0.25,
            color: hex, size: 22,
            isGlow: true
        });
    }

    // v5.13: GODCHAIN apotheosis burst (symbols + gold rings + glow)
    function createGodchainApotheosis(x, y) {
        const cfg = G.Balance?.ELEMENTAL_VFX?.GODCHAIN_APOTHEOSIS;
        if (!cfg) return;

        // Symbol particles outward
        const symbols = cfg.SYMBOLS;
        for (let i = 0; i < symbols.length; i++) {
            const angle = (Math.PI * 2 / symbols.length) * i - Math.PI / 2;
            addParticle({
                x, y,
                vx: Math.cos(angle) * cfg.SYMBOL_SPEED,
                vy: Math.sin(angle) * cfg.SYMBOL_SPEED,
                life: cfg.SYMBOL_LIFE, maxLife: cfg.SYMBOL_LIFE,
                color: cfg.RING_COLOR,
                size: cfg.SYMBOL_SIZE,
                symbol: symbols[i],
                rotation: 0, rotSpeed: 3
            });
        }

        // Gold rings
        for (let i = 0; i < cfg.RING_COUNT; i++) {
            addParticle({
                x, y, vx: 0, vy: 0,
                life: 0.4 + i * 0.1, maxLife: 0.5 + i * 0.1,
                color: cfg.RING_COLOR,
                size: 10 + i * 5, baseSize: 50 + i * 15,
                isRing: true, explosionGrow: true
            });
        }

        // Central glow
        addParticle({
            x, y, vx: 0, vy: 0,
            life: 0.3, maxLife: 0.3,
            color: cfg.GLOW_COLOR,
            size: cfg.GLOW_RADIUS,
            isGlow: true
        });
    }

    /**
     * v5.14: Score HUD Burst — particles explode from HUD score position
     * @param {string} tier - 'BIG' | 'MASSIVE' | 'LEGENDARY'
     */
    function createScoreHudBurst(tier) {
        const x = gameWidth / 2;
        const y = 25;
        const tierColors = {
            BIG: '#ffaa00',
            MASSIVE: '#ff6600',
            LEGENDARY: '#ff3300'
        };
        const color = tierColors[tier] || '#ffaa00';
        let count, speedBase, sizeBase;

        if (tier === 'LEGENDARY') {
            count = 10; speedBase = 200; sizeBase = 4;
        } else if (tier === 'MASSIVE') {
            count = 6; speedBase = 150; sizeBase = 3;
        } else {
            count = 3; speedBase = 100; sizeBase = 2.5;
        }

        const available = Math.min(count, MAX_PARTICLES - particles.length);
        for (let i = 0; i < available; i++) {
            const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.8;
            const speed = speedBase * (0.6 + Math.random() * 0.8);
            addParticle({
                x: x + (Math.random() - 0.5) * 40,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed + (Math.random() * 40),
                life: 0.4 + Math.random() * 0.3,
                maxLife: 0.7,
                color: color,
                size: sizeBase + Math.random() * 2,
                gravity: 120
            });
        }

        // Starburst ring for MASSIVE/LEGENDARY
        if (tier === 'MASSIVE' || tier === 'LEGENDARY') {
            const ringCount = tier === 'LEGENDARY' ? 8 : 4;
            const ringAvail = Math.min(ringCount, MAX_PARTICLES - particles.length);
            for (let i = 0; i < ringAvail; i++) {
                const angle = (i / ringCount) * Math.PI * 2;
                const speed = tier === 'LEGENDARY' ? 180 : 120;
                addParticle({
                    x: x, y: y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    life: 0.3 + Math.random() * 0.2,
                    maxLife: 0.5,
                    color: '#ffffff',
                    size: 1.5 + Math.random(),
                    gravity: 0
                });
            }
        }
    }

    // Export to namespace
    G.ParticleSystem = {
        init,
        setDimensions,
        addParticle,
        addCanvasEffect,
        createBulletSpark,
        createGrazeSpark,
        createPowerUpPickupEffect,
        createMuzzleFlashParticles,
        createExplosion,
        createEnemyDeathExplosion,
        createBossDeathExplosion,
        createScoreParticles,
        createScoreHudBurst,
        createFireImpact,
        createElectricChain,
        createNapalmImpact,
        createLightningBolt,
        createLaserBeamImpact,
        createLaserPierceFlash,
        createElementalPickupBurst,
        createGodchainApotheosis,
        createWeaponUpgradeEffect,
        createCoinRain,
        createEvolutionItemTrail,
        update,
        draw,
        clear,
        getCount,
        MAX_PARTICLES
    };
})();
