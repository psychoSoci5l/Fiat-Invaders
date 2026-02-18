window.Game = window.Game || {};

class Bullet extends window.Game.Entity {
    constructor(x, y, vx, vy, color, w, h, isHodl) {
        super(x, y, w, h);
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.isHodl = isHodl;
        this.penetration = false; // For Laser
        this.width = w; // Ensure explicit width set
        this.height = h;
        this.weaponType = 'NORMAL'; // Default weapon type
        this.age = 0; // Animation timer
        this.grazed = false; // Graze tracking
        this.shape = null; // Enemy shape for visual differentiation (coin/bill/bar/card)
        this.isBossBullet = false; // v5.10.3: Boss bullet tag for collision radius

        // === WEAPON EVOLUTION v3.0 properties ===
        this.damageMult = 1;      // From POWER modifier
        this.special = null;      // 'HOMING'|'PIERCE'|'MISSILE'|null
        this.isMissile = false;   // MISSILE special flag
        this.aoeRadius = 0;       // MISSILE explosion radius
        this.pierceHP = 1;        // Bullet pierce: survives N enemy-bullet hits
        this._pierceCount = 0;    // v5.0.8: enemies pierced counter

        // v4.60: Elemental perk flags
        this._elemFire = false;
        this._elemLaser = false;
        this._elemElectric = false;

        // v5.31: Energy Link pairing
        this._volleyId = 0;
        this._isLinkPair = false;
    }

    reset(x, y, vx, vy, color, w, h, isHodl) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.width = w;
        this.height = h;
        this.isHodl = isHodl;
        this.markedForDeletion = false;
        this.penetration = false;
        this.weaponType = 'NORMAL'; // Default, set by Player.fire()
        this.age = 0; // For animations
        this.grazed = false; // Graze tracking
        this.beatSynced = false; // Harmonic Conductor beat-synced bullet
        this.homing = false; // Homing missile tracking
        this.homingSpeed = 0; // Turn rate for homing
        this.shape = null; // Enemy shape for visual differentiation
        this.ownerColor = null; // v4.56: Enemy color for bullet core tint
        this.isBossBullet = false; // v5.10.3: Boss bullet tag for collision radius

        // === WEAPON EVOLUTION v3.0 reset ===
        this.damageMult = 1;
        this.special = null;
        this.isMissile = false;
        this.aoeRadius = 0;
        this.pierceHP = 1;
        this._pierceCount = 0;  // v5.0.8: enemies pierced counter

        // v4.60: Elemental reset
        this._elemFire = false;
        this._elemLaser = false;
        this._elemElectric = false;

        // v5.31: Energy Link reset
        this._volleyId = 0;
        this._isLinkPair = false;
    }

    update(dt, enemies, boss) {
        // Homing tracking logic (optimized: distanceSquared, no object allocation)
        if (this.homing) {
            // Find nearest target using distance squared (no sqrt per enemy)
            let nearestDistSq = Infinity;
            let targetX = 0;
            let targetY = 0;
            let hasTarget = false;

            // Check enemies (use distanceSquared for comparison)
            if (enemies && enemies.length > 0) {
                for (let i = 0, len = enemies.length; i < len; i++) {
                    const enemy = enemies[i];
                    if (enemy.markedForDeletion) continue;
                    const dx = enemy.x - this.x;
                    const dy = enemy.y - this.y;
                    // Only track targets ahead (above the bullet)
                    if (dy > 0) continue;
                    const distSq = dx * dx + dy * dy;
                    if (distSq < nearestDistSq) {
                        nearestDistSq = distSq;
                        targetX = enemy.x;
                        targetY = enemy.y;
                        hasTarget = true;
                    }
                }
            }

            // Check boss (prioritize if closer)
            if (boss && boss.active) {
                const bossCenterX = boss.x + boss.width * 0.5;
                const bossCenterY = boss.y + boss.height * 0.5;
                const dx = bossCenterX - this.x;
                const dy = bossCenterY - this.y;
                if (dy < 0) { // Boss is above
                    const distSq = dx * dx + dy * dy;
                    if (distSq < nearestDistSq) {
                        nearestDistSq = distSq;
                        targetX = bossCenterX;
                        targetY = bossCenterY;
                        hasTarget = true;
                    }
                }
            }

            if (hasTarget && nearestDistSq > 1) {
                // Only one sqrt call total (for actual direction)
                const dist = Math.sqrt(nearestDistSq);
                const dx = targetX - this.x;
                const dy = targetY - this.y;
                const baseSpeed = Math.abs(this.vy) || 200;
                const targetVx = (dx / dist) * baseSpeed;
                const targetVy = (dy / dist) * baseSpeed;

                // Gradual turn towards target
                const turnRate = this.homingSpeed * dt;
                this.vx += (targetVx - this.vx) * turnRate;
                this.vy += (targetVy - this.vy) * turnRate;

                // Normalize speed
                const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy) || 1;
                const targetSpeed = this.maxSpeed || 200; // Use maxSpeed if set, else default
                this.vx = (this.vx / speed) * targetSpeed;
                this.vy = (this.vy / speed) * targetSpeed;
            }
        }

        super.update(dt);
        this.age += dt; // Track age for animations
        // Bounds check (vertical + horizontal)
        // v4.0.1: Added horizontal bounds to prevent lateral bullets persisting indefinitely
        const gw = window.Game._gameWidth || 600;
        if (this.y < -50 || this.y > 850 || this.x < -100 || this.x > gw + 100) {
            this.markedForDeletion = true;
        }
    }

    // v4.22: Collision radius from centralized BULLET_CONFIG
    get collisionRadius() {
        const cfg = window.Game.Balance?.BULLET_CONFIG;
        if (!cfg) return (this.width || 4) * 0.5;  // fallback
        if (this.vy <= 0) { // Player bullet (goes up)
            if (this.special === 'MISSILE' || this.isMissile) return cfg.PLAYER_MISSILE.collisionRadius;
            if (this.special === 'PIERCE') return cfg.PLAYER_PIERCE.collisionRadius;
            if (this.special === 'HOMING' || this.homing) return cfg.PLAYER_HOMING.collisionRadius;
            return cfg.PLAYER_NORMAL.collisionRadius;
        }
        // v5.10.3: Boss bullets use larger BOSS_PATTERN collision radius
        if (this.isBossBullet && cfg.BOSS_PATTERN) return cfg.BOSS_PATTERN.collisionRadius;
        return cfg.ENEMY_DEFAULT.collisionRadius;  // Enemy bullet
    }

    draw(ctx) {
        const CU = window.Game.ColorUtils;
        const isEnemy = this.vy > 0; // Enemy bullets go down

        if (isEnemy) {
            // Enemy bullet: dispatch to shape-specific or default
            this.drawEnemyBullet(ctx);
        } else {
            // Player bullet - distinct style per weapon type
            ctx.strokeStyle = '#111';
            ctx.lineWidth = 2;
            const pulse = Math.sin(this.age * 20) * 0.15 + 1; // Subtle pulse

            // v4.5: POWER modifier outer glow (pulsing aura on any weapon)
            if (this.damageMult > 1) {
                const vfx = window.Game.Balance?.VFX || {};
                const glowAlpha = (vfx.TRAIL_POWER_GLOW || 0.25) * (0.5 + Math.sin(this.age * 12) * 0.5);
                ctx.fillStyle = CU.rgba(255, 200, 50, glowAlpha);
                ctx.beginPath();
                ctx.arc(this.x, this.y, 10 + this.damageMult * 4, 0, Math.PI * 2);
                ctx.fill();
            }

            // v4.5: HYPER mode golden trail overlay (sparkles along any weapon trail)
            if (this._isHyper) {
                const sparkAlpha = 0.4 + Math.sin(this.age * 18 + this.x * 0.1) * 0.2;
                ctx.fillStyle = CU.rgba(255, 215, 0, sparkAlpha);
                // Two trailing sparkles
                for (let i = 1; i <= 2; i++) {
                    const ty = this.y + i * 10;
                    const tx = this.x + Math.sin(this.age * 25 + i * 2) * 3;
                    ctx.beginPath();
                    ctx.arc(tx, ty, 2.5 - i * 0.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // v4.6: GODCHAIN fire trail (3 flickering fire tongues behind bullet)
            if (this._isGodchain) {
                const gcCfg = window.Game.Balance?.GODCHAIN?.FIRE_TRAIL;
                const tongueCount = gcCfg?.TONGUE_COUNT || 3;
                const tongueLen = gcCfg?.LENGTH || 12;
                const baseAlpha = gcCfg?.ALPHA || 0.7;
                const colors = gcCfg?.COLORS || ['#ff4400', '#ff6600', '#ffaa00'];
                ctx.globalAlpha = baseAlpha;
                for (let i = 0; i < tongueCount; i++) {
                    const offsetX = Math.sin(this.age * 30 + i * 2.1) * 3;
                    const tLen = tongueLen + Math.sin(this.age * 25 + i * 1.7) * 4;
                    const tW = 3 - i * 0.5;
                    ctx.fillStyle = colors[i % colors.length];
                    ctx.beginPath();
                    ctx.moveTo(this.x - tW + offsetX, this.y + 6);
                    ctx.quadraticCurveTo(this.x + offsetX, this.y + 6 + tLen, this.x + tW + offsetX, this.y + 6);
                    ctx.closePath();
                    ctx.fill();
                }
                ctx.globalAlpha = 1;
            }

            // v4.30: Glow moved to drawGlow() — batched in main.js additive pass

            // v5.3: Laser beam rendering (overrides everything when active)
            const beamCfg = window.Game.Balance?.ELEMENTAL?.LASER?.BEAM;
            if (this._elemLaser && !this.special && beamCfg?.ENABLED) {
                this._drawLaserBeam(ctx);
                // Fire/Electric overlays still draw on top of beam
                if (this._elemFire) this._drawFireTrail(ctx);
                if (this._elemElectric) this._drawElectricArc(ctx);
                return;
            }

            // Check for WEAPON EVOLUTION special first (overrides weaponType)
            if (this.special) {
                switch (this.special) {
                    case 'HOMING':
                        this.drawHomingBullet(ctx, pulse);
                        break;
                    case 'PIERCE':
                        this.drawPierceBullet(ctx, pulse);
                        break;
                    case 'MISSILE':
                        this.drawMissileBullet(ctx, pulse);
                        break;
                    default:
                        // Unknown special, use evolution default
                        this.drawEvolutionBullet(ctx, pulse);
                }
            } else {
                // Legacy weapon type system
                switch (this.weaponType) {
                    case 'WIDE':
                        this.drawWideBullet(ctx, pulse);
                        break;
                    case 'NARROW':
                        this.drawNarrowBullet(ctx, pulse);
                        break;
                    case 'FIRE':
                        this.drawFireBullet(ctx, pulse);
                        break;
                    case 'SPREAD':
                        this.drawSpreadBullet(ctx, pulse);
                        break;
                    case 'HOMING':
                        this.drawHomingBullet(ctx, pulse);
                        break;
                    case 'EVOLUTION':
                        this.drawEvolutionBullet(ctx, pulse);
                        break;
                    default: // NORMAL
                        this.drawNormalBullet(ctx, pulse);
                }
            }

            // v4.60: Elemental overlays on top
            if (this._elemFire || this._elemLaser || this._elemElectric) {
                this._drawElementalOverlays(ctx);
            }
        }
    }
    // ═══════════════════════════════════════════════════════════════════
    // GLOW: Additive radial glow for player bullets (v4.30 batch pass)
    // Called from main.js batched additive pass — ctx already in 'lighter'
    // ═══════════════════════════════════════════════════════════════════
    drawGlow(ctx) {
        if (this.vy > 0) return; // Enemy bullets: no glow
        const glowCfg = window.Game.Balance?.GLOW;
        if (!glowCfg?.ENABLED || !glowCfg?.BULLET?.ENABLED) return;

        // v5.3: Laser beam additive glow
        const beamCfg = window.Game.Balance?.ELEMENTAL?.LASER?.BEAM;
        if (this._elemLaser && !this.special && beamCfg?.ENABLED) {
            this._drawLaserBeamGlow(ctx);
            return;
        }

        const gc = glowCfg.BULLET;
        const glowAlpha = gc.ALPHA + Math.sin(this.age * gc.PULSE_SPEED) * gc.PULSE_AMOUNT;
        ctx.globalAlpha = glowAlpha;
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, gc.RADIUS);
        gradient.addColorStop(0, this.color || '#ff8c00');
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, gc.RADIUS, 0, Math.PI * 2);
        ctx.fill();
    }

    // ═══════════════════════════════════════════════════════════════════
    // v4.60: ELEMENTAL OVERLAYS — drawn on top of any player bullet
    // ═══════════════════════════════════════════════════════════════════
    _drawFireTrail(ctx) {
        const colors = ['#ff4400', '#ff6600', '#ffaa00'];
        ctx.globalAlpha = 0.65;
        for (let i = 0; i < 3; i++) {
            const ox = Math.sin(this.age * 28 + i * 2.1) * 3;
            const tLen = 10 + Math.sin(this.age * 22 + i * 1.7) * 4;
            const tW = 2.5 - i * 0.5;
            ctx.fillStyle = colors[i];
            ctx.beginPath();
            ctx.moveTo(this.x - tW + ox, this.y + 5);
            ctx.quadraticCurveTo(this.x + ox, this.y + 5 + tLen, this.x + tW + ox, this.y + 5);
            ctx.closePath();
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    _drawLaserGlow(ctx) {
        const cfg = window.Game.Balance?.ELEMENTAL?.LASER;
        const glowColor = cfg?.GLOW_COLOR || '#00f0ff';
        const tLen = cfg?.TRAIL_LENGTH || 18;
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = glowColor;
        ctx.beginPath();
        ctx.moveTo(this.x - 2, this.y);
        ctx.lineTo(this.x, this.y + tLen);
        ctx.lineTo(this.x + 2, this.y);
        ctx.closePath();
        ctx.fill();
        // Bright core line
        ctx.globalAlpha = 0.6;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - 3);
        ctx.lineTo(this.x, this.y + tLen * 0.6);
        ctx.stroke();
        ctx.globalAlpha = 1;
    }

    _drawElectricArc(ctx) {
        const cfg = window.Game.Balance?.ELEMENTAL?.ELECTRIC;
        const color = cfg?.ARC_COLOR || '#8844ff';
        const bright = cfg?.ARC_COLOR_BRIGHT || '#bb88ff';
        ctx.globalAlpha = 0.55;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        // 2 random arcs from bullet
        for (let i = 0; i < 2; i++) {
            const endX = this.x + (Math.random() - 0.5) * 16;
            const endY = this.y + (Math.random() - 0.5) * 16;
            const midX = (this.x + endX) / 2 + (Math.random() - 0.5) * 8;
            const midY = (this.y + endY) / 2 + (Math.random() - 0.5) * 8;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.quadraticCurveTo(midX, midY, endX, endY);
            ctx.stroke();
        }
        // Bright center point
        ctx.fillStyle = bright;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    _drawElementalOverlays(ctx) {
        if (this._elemFire) this._drawFireTrail(ctx);
        if (this._elemLaser) this._drawLaserGlow(ctx);
        if (this._elemElectric) this._drawElectricArc(ctx);
    }

    // ═══════════════════════════════════════════════════════════════════
    // v5.3: LASER BEAM — Gradius-style elongated beam bolt
    // Standard pass: core + mid body, direction-aligned
    // ═══════════════════════════════════════════════════════════════════
    _drawLaserBeam(ctx) {
        const cfg = window.Game.Balance?.ELEMENTAL?.LASER?.BEAM;
        if (!cfg) return;
        const CU = window.Game.ColorUtils;

        // Direction vector (normalized)
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy) || 1;
        const ndx = this.vx / speed;
        const ndy = this.vy / speed;

        // Head (bullet position) and tail
        const hx = this.x;
        const hy = this.y;
        // v5.20: Ramp-up (beam grows from 0 to full in 50ms)
        const ageFactor = Math.min(1, this.age / 0.05);
        const effectiveLength = cfg.LENGTH * ageFactor;
        let tx = hx - ndx * effectiveLength;
        let ty = hy - ndy * effectiveLength;
        // v5.20: Clamp tail — beam doesn't extend behind ship
        if (this._spawnY && ty > this._spawnY) {
            const ratio = (this._spawnY - hy) / (ty - hy);
            tx = hx + (tx - hx) * ratio;
            ty = this._spawnY;
        }

        // Shimmer: width pulses ±SHIMMER_AMOUNT
        const shimmer = 1 + Math.sin(this.age * cfg.SHIMMER_SPEED) * cfg.SHIMMER_AMOUNT;

        // POWER glow (if damageMult > 1)
        if (this.damageMult > 1) {
            const vfx = window.Game.Balance?.VFX || {};
            const glowAlpha = (vfx.TRAIL_POWER_GLOW || 0.25) * (0.5 + Math.sin(this.age * 12) * 0.5);
            ctx.fillStyle = CU.rgba(255, 200, 50, glowAlpha);
            ctx.beginPath();
            ctx.arc(hx, hy, 10 + this.damageMult * 4, 0, Math.PI * 2);
            ctx.fill();
        }

        // HYPER golden sparkles
        if (this._isHyper) {
            const sparkAlpha = 0.4 + Math.sin(this.age * 18 + this.x * 0.1) * 0.2;
            ctx.fillStyle = CU.rgba(255, 215, 0, sparkAlpha);
            for (let i = 1; i <= 2; i++) {
                const frac = i * 0.3;
                const sx = hx + (tx - hx) * frac + Math.sin(this.age * 25 + i * 2) * 3;
                const sy = hy + (ty - hy) * frac;
                ctx.beginPath();
                ctx.arc(sx, sy, 2.5 - i * 0.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // GODCHAIN fire trail along beam
        if (this._isGodchain) {
            const gcCfg = window.Game.Balance?.GODCHAIN?.FIRE_TRAIL;
            const tongueCount = gcCfg?.TONGUE_COUNT || 3;
            const tongueLen = gcCfg?.LENGTH || 12;
            const baseAlpha = gcCfg?.ALPHA || 0.7;
            const colors = gcCfg?.COLORS || ['#ff4400', '#ff6600', '#ffaa00'];
            ctx.globalAlpha = baseAlpha;
            for (let i = 0; i < tongueCount; i++) {
                const frac = 0.5 + i * 0.15;
                const bx = hx + (tx - hx) * frac;
                const by = hy + (ty - hy) * frac;
                const offsetX = Math.sin(this.age * 30 + i * 2.1) * 3;
                const tLen = tongueLen + Math.sin(this.age * 25 + i * 1.7) * 4;
                const tW = 3 - i * 0.5;
                ctx.fillStyle = colors[i % colors.length];
                ctx.beginPath();
                ctx.moveTo(bx - tW + offsetX, by + 3);
                ctx.quadraticCurveTo(bx + offsetX, by + 3 + tLen, bx + tW + offsetX, by + 3);
                ctx.closePath();
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        }

        // === Mid beam layer (#66ddff) ===
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#66ddff';
        ctx.lineWidth = cfg.MID_WIDTH * shimmer;
        ctx.globalAlpha = cfg.MID_ALPHA;
        ctx.beginPath();
        ctx.moveTo(hx, hy);
        ctx.lineTo(tx, ty);
        ctx.stroke();

        // === Core beam (white) ===
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = cfg.CORE_WIDTH * shimmer;
        ctx.globalAlpha = cfg.CORE_ALPHA;
        ctx.beginPath();
        ctx.moveTo(hx, hy);
        ctx.lineTo(tx, ty);
        ctx.stroke();

        // === Head glow (radial, bright white tip) ===
        ctx.globalAlpha = 0.9;
        const headR = cfg.HEAD_GLOW_RADIUS;
        const headGrad = ctx.createRadialGradient(hx, hy, 0, hx, hy, headR);
        headGrad.addColorStop(0, '#ffffff');
        headGrad.addColorStop(0.5, '#aaeeff');
        headGrad.addColorStop(1, 'rgba(0,240,255,0)');
        ctx.fillStyle = headGrad;
        ctx.beginPath();
        ctx.arc(hx, hy, headR, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 1;
        ctx.lineCap = 'butt';
    }

    // ═══════════════════════════════════════════════════════════════════
    // v5.3: LASER BEAM GLOW — Additive pass (outer glow layer)
    // Called from batched additive pass — ctx already in 'lighter'
    // ═══════════════════════════════════════════════════════════════════
    _drawLaserBeamGlow(ctx) {
        const cfg = window.Game.Balance?.ELEMENTAL?.LASER?.BEAM;
        if (!cfg) return;

        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy) || 1;
        const ndx = this.vx / speed;
        const ndy = this.vy / speed;

        const hx = this.x;
        const hy = this.y;
        // v5.20: Ramp-up + clamp (same as standard pass)
        const ageFactor = Math.min(1, this.age / 0.05);
        const effectiveLength = cfg.LENGTH * ageFactor;
        let tx = hx - ndx * effectiveLength;
        let ty = hy - ndy * effectiveLength;
        if (this._spawnY && ty > this._spawnY) {
            const ratio = (this._spawnY - hy) / (ty - hy);
            tx = hx + (tx - hx) * ratio;
            ty = this._spawnY;
        }

        const shimmer = 1 + Math.sin(this.age * cfg.SHIMMER_SPEED) * cfg.SHIMMER_AMOUNT;

        // Outer glow (#00f0ff, additive)
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = cfg.OUTER_WIDTH * shimmer;
        ctx.globalAlpha = cfg.OUTER_ALPHA;
        ctx.beginPath();
        ctx.moveTo(hx, hy);
        ctx.lineTo(tx, ty);
        ctx.stroke();

        // Head glow (additive bloom)
        ctx.globalAlpha = 0.35;
        const headR = cfg.HEAD_GLOW_RADIUS * 1.5;
        ctx.fillStyle = '#00f0ff';
        ctx.beginPath();
        ctx.arc(hx, hy, headR, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 1;
        ctx.lineCap = 'butt';
    }

    // ═══════════════════════════════════════════════════════════════════
    // NORMAL: BTC Orange Bolt - Clean iconic crypto projectile
    // ═══════════════════════════════════════════════════════════════════
    drawNormalBullet(ctx, pulse) {
        const w = this.width * 1.8;  // v5.9: 2.0→1.8 (wider base bullet)
        const h = this.height * 1.2; // v5.9: 1.3→1.2

        // Outer glow trail — v4.23.1: additive
        const _gc = window.Game.Balance?.GLOW;
        const _addTrail = _gc?.ENABLED && _gc?.BULLET?.ENABLED;
        if (_addTrail) ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = this.color;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.moveTo(this.x - w, this.y + 2);
        ctx.lineTo(this.x, this.y + h + 8);
        ctx.lineTo(this.x + w, this.y + 2);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
        if (_addTrail) ctx.globalCompositeOperation = 'source-over';

        // Main bolt body (elongated hexagon)
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - 8);           // Top point
        ctx.lineTo(this.x + w, this.y - 2);       // Upper right
        ctx.lineTo(this.x + w * 0.7, this.y + 6); // Lower right
        ctx.lineTo(this.x, this.y + h);           // Bottom point
        ctx.lineTo(this.x - w * 0.7, this.y + 6); // Lower left
        ctx.lineTo(this.x - w, this.y - 2);       // Upper left
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Inner bright core
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - 4);
        ctx.lineTo(this.x + w * 0.4, this.y);
        ctx.lineTo(this.x, this.y + 8);
        ctx.lineTo(this.x - w * 0.4, this.y);
        ctx.closePath();
        ctx.fill();

        // BTC symbol (small)
        ctx.fillStyle = '#111';
        ctx.font = 'bold 9px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('₿', this.x, this.y + 1);
    }

    // ═══════════════════════════════════════════════════════════════════
    // WIDE: Purple Energy Crescent - Ethereal wave projectile
    // ═══════════════════════════════════════════════════════════════════
    drawWideBullet(ctx, pulse) {
        const w = this.width * 3.2 * pulse;  // Scaled up for visibility
        const h = this.height * 1.0;

        // Outer ethereal glow
        ctx.fillStyle = '#bb44ff';
        ctx.globalAlpha = 0.25;
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, w + 6, h * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Energy trail (multiple fading segments) — v4.23.1: additive
        const _gc = window.Game.Balance?.GLOW;
        const _addTrail = _gc?.ENABLED && _gc?.BULLET?.ENABLED;
        if (_addTrail) ctx.globalCompositeOperation = 'lighter';
        for (let i = 3; i > 0; i--) {
            ctx.fillStyle = '#bb44ff';
            ctx.globalAlpha = 0.15 * i;
            ctx.beginPath();
            ctx.ellipse(this.x, this.y + (i * 6), w - i * 2, h * 0.3, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        if (_addTrail) ctx.globalCompositeOperation = 'source-over';

        // Main crescent body
        ctx.fillStyle = '#bb44ff';
        ctx.beginPath();
        ctx.moveTo(this.x - w, this.y + 4);       // Left wing
        ctx.quadraticCurveTo(this.x, this.y - h, this.x + w, this.y + 4); // Top arc
        ctx.quadraticCurveTo(this.x, this.y + 2, this.x - w, this.y + 4); // Bottom arc
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#8822cc';
        ctx.stroke();

        // Inner energy core
        ctx.fillStyle = '#dd88ff';
        ctx.beginPath();
        ctx.ellipse(this.x, this.y - 2, w * 0.5, h * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();

        // Bright center spark
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.x, this.y - 3, 2 * pulse, 0, Math.PI * 2);
        ctx.fill();
    }

    // ═══════════════════════════════════════════════════════════════════
    // NARROW: Blue Laser Needle - Focused precision beam
    // ═══════════════════════════════════════════════════════════════════
    drawNarrowBullet(ctx, pulse) {
        const w = this.width * 1.5;   // Scaled up for visibility
        const h = this.height * 1.8;

        // Outer laser glow
        ctx.fillStyle = '#2288ff';
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - 12);
        ctx.lineTo(this.x + w + 4, this.y + 4);
        ctx.lineTo(this.x, this.y + h + 6);
        ctx.lineTo(this.x - w - 4, this.y + 4);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;

        // Speed lines (motion blur effect) — v4.23.1: additive
        const _gc = window.Game.Balance?.GLOW;
        const _addTrail = _gc?.ENABLED && _gc?.BULLET?.ENABLED;
        if (_addTrail) ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = '#2288ff';
        ctx.globalAlpha = 0.4;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(this.x - 3, this.y + 8);
        ctx.lineTo(this.x - 3, this.y + h + 15);
        ctx.moveTo(this.x + 3, this.y + 8);
        ctx.lineTo(this.x + 3, this.y + h + 15);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.lineWidth = 2;
        if (_addTrail) ctx.globalCompositeOperation = 'source-over';

        // Main needle body
        ctx.fillStyle = '#2288ff';
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - 10);          // Sharp tip
        ctx.lineTo(this.x + w, this.y + 2);       // Right edge
        ctx.lineTo(this.x + w * 0.5, this.y + h); // Right tail
        ctx.lineTo(this.x - w * 0.5, this.y + h); // Left tail
        ctx.lineTo(this.x - w, this.y + 2);       // Left edge
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#114488';
        ctx.stroke();

        // Inner plasma core
        ctx.fillStyle = '#66bbff';
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - 6);
        ctx.lineTo(this.x + w * 0.3, this.y + 2);
        ctx.lineTo(this.x, this.y + h * 0.7);
        ctx.lineTo(this.x - w * 0.3, this.y + 2);
        ctx.closePath();
        ctx.fill();

        // Hot white tip
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - 8);
        ctx.lineTo(this.x + 2, this.y - 2);
        ctx.lineTo(this.x - 2, this.y - 2);
        ctx.closePath();
        ctx.fill();
    }

    // ═══════════════════════════════════════════════════════════════════
    // FIRE: Flaming Sphere - Burning penetrating projectile
    // ═══════════════════════════════════════════════════════════════════
    drawFireBullet(ctx, pulse) {
        const r = this.width * 2.0 * pulse;  // Scaled up for visibility
        const flicker = Math.sin(this.age * 30) * 2;

        // Fire trail (multiple flame tongues) — v4.23.1: additive
        const _gc = window.Game.Balance?.GLOW;
        const _addTrail = _gc?.ENABLED && _gc?.BULLET?.ENABLED;
        if (_addTrail) ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.6;
        for (let i = 0; i < 3; i++) {
            const offset = Math.sin(this.age * 25 + i * 2) * 3;
            const trailH = 12 + i * 4 + flicker;

            // Outer red
            ctx.fillStyle = '#cc2222';
            ctx.beginPath();
            ctx.moveTo(this.x - 4 + offset + i * 2 - 3, this.y + 4);
            ctx.quadraticCurveTo(
                this.x + offset + i * 2 - 3, this.y + trailH + 8,
                this.x + 4 + offset + i * 2 - 3, this.y + 4
            );
            ctx.closePath();
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        if (_addTrail) ctx.globalCompositeOperation = 'source-over';

        // Main fireball outer (dark red)
        ctx.fillStyle = '#cc2222';
        ctx.beginPath();
        ctx.arc(this.x, this.y, r + 3, 0, Math.PI * 2);
        ctx.fill();

        // Middle layer (orange)
        ctx.fillStyle = '#ff8800';
        ctx.beginPath();
        ctx.arc(this.x, this.y - 1, r + 1, 0, Math.PI * 2);
        ctx.fill();

        // Core (bright orange-yellow)
        ctx.fillStyle = '#ffaa00';
        ctx.beginPath();
        ctx.arc(this.x, this.y - 2, r - 1, 0, Math.PI * 2);
        ctx.fill();

        // Hot center (yellow-white)
        ctx.fillStyle = '#ffee88';
        ctx.beginPath();
        ctx.arc(this.x, this.y - 2, r * 0.4, 0, Math.PI * 2);
        ctx.fill();

        // Spark particles (small dots around the fireball)
        ctx.fillStyle = '#fff';
        for (let i = 0; i < 3; i++) {
            const angle = this.age * 10 + i * 2.1;
            const dist = r + 2 + Math.sin(this.age * 15 + i) * 2;
            const px = this.x + Math.cos(angle) * dist;
            const py = this.y + Math.sin(angle) * dist * 0.6;
            ctx.beginPath();
            ctx.arc(px, py, 1, 0, Math.PI * 2);
            ctx.fill();
        }

        // Bold outline
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, r + 1, 0, Math.PI * 2);
        ctx.stroke();
    }

    // ═══════════════════════════════════════════════════════════════════
    // SPREAD: Green Star Burst - 5-shot fan projectile
    // ═══════════════════════════════════════════════════════════════════
    drawSpreadBullet(ctx, pulse) {
        const r = this.width * 1.8 * pulse;
        const rotation = this.age * 8; // Spinning star

        // Outer glow
        ctx.fillStyle = '#00ff66';
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(this.x, this.y, r + 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Sparkle trail
        ctx.fillStyle = '#00ff66';
        ctx.globalAlpha = 0.5;
        for (let i = 1; i <= 3; i++) {
            const trailY = this.y + i * 6;
            const trailSize = r * (1 - i * 0.25);
            ctx.beginPath();
            ctx.arc(this.x, trailY, trailSize * 0.5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Main star body (5-point star)
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(rotation);

        ctx.fillStyle = '#00ff66';
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const outerAngle = (Math.PI * 2 / 5) * i - Math.PI / 2;
            const innerAngle = outerAngle + Math.PI / 5;
            const outerX = Math.cos(outerAngle) * r;
            const outerY = Math.sin(outerAngle) * r;
            const innerX = Math.cos(innerAngle) * (r * 0.4);
            const innerY = Math.sin(innerAngle) * (r * 0.4);
            if (i === 0) ctx.moveTo(outerX, outerY);
            else ctx.lineTo(outerX, outerY);
            ctx.lineTo(innerX, innerY);
        }
        ctx.closePath();
        ctx.fill();

        // Bold outline
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Inner bright core
        ctx.fillStyle = '#66ffaa';
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.35, 0, Math.PI * 2);
        ctx.fill();

        // White center spark
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.15, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // ═══════════════════════════════════════════════════════════════════
    // HOMING: Orange Missile - Tracking projectile with exhaust trail
    // ═══════════════════════════════════════════════════════════════════
    drawHomingBullet(ctx, pulse) {
        // v5.25: Orb tracker — sphere with trail, orbiting ring, crosshair
        const CU = window.Game.ColorUtils;
        const r = 7; // orb radius
        const t = this.age;

        ctx.save();
        ctx.translate(this.x, this.y);

        // Trail: 3 fading circles behind
        const angle = Math.atan2(this.vy, this.vx);
        const _gc = window.Game.Balance?.GLOW;
        const _addTrail = _gc?.ENABLED && _gc?.BULLET?.ENABLED;
        if (_addTrail) ctx.globalCompositeOperation = 'lighter';
        for (let i = 3; i >= 1; i--) {
            const dist = i * 7;
            const tx = -Math.cos(angle) * dist;
            const ty = -Math.sin(angle) * dist;
            const tr = r * (0.7 - i * 0.15);
            ctx.globalAlpha = 0.4 - i * 0.1;
            ctx.fillStyle = '#ff8800';
            ctx.beginPath();
            ctx.arc(tx, ty, tr, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        if (_addTrail) ctx.globalCompositeOperation = 'source-over';

        // Main orb: radial gradient (highlight → orange → dark)
        const grad = ctx.createRadialGradient(-2, -2, 1, 0, 0, r);
        grad.addColorStop(0, '#fff8e0');
        grad.addColorStop(0.35, '#ffaa00');
        grad.addColorStop(0.75, '#ff6600');
        grad.addColorStop(1, '#882200');
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Black outline
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Orbiting ring (tilted ellipse)
        const ringAngle = t * 5;
        ctx.save();
        ctx.rotate(ringAngle);
        ctx.scale(1, 0.4); // tilt
        ctx.beginPath();
        ctx.arc(0, 0, r + 4, 0, Math.PI * 2);
        ctx.strokeStyle = CU.rgba(255, 200, 80, 0.6);
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.restore();

        // Crosshair center (targeting reticle)
        const cp = 0.5 + 0.5 * Math.sin(t * 8); // pulsing
        ctx.strokeStyle = CU.rgba(255, 255, 255, 0.6 + cp * 0.4);
        ctx.lineWidth = 1;
        // Cross lines
        const cl = 3;
        ctx.beginPath();
        ctx.moveTo(-cl, 0); ctx.lineTo(cl, 0);
        ctx.moveTo(0, -cl); ctx.lineTo(0, cl);
        ctx.stroke();
        // Center dot
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(0, 0, 1.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // ═══════════════════════════════════════════════════════════════════
    // PIERCE: Flaming Red Arrow - Penetrating flame projectile
    // (WEAPON EVOLUTION v3.0 Special)
    // ═══════════════════════════════════════════════════════════════════
    drawPierceBullet(ctx, pulse) {
        const w = this.width * 2.0;
        const h = this.height * 1.4;
        const flicker = Math.sin(this.age * 30) * 2;

        // Intense flame trail (longer than FIRE) — v4.23.1: additive
        const _gc = window.Game.Balance?.GLOW;
        const _addTrail = _gc?.ENABLED && _gc?.BULLET?.ENABLED;
        if (_addTrail) ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.7;
        for (let i = 0; i < 5; i++) {
            const offset = Math.sin(this.age * 25 + i * 1.5) * 2;
            const trailH = 16 + i * 6 + flicker;
            const trailW = 3 - i * 0.4;

            // Outer red to yellow gradient
            const colors = ['#880000', '#cc2222', '#ff8800', '#ffaa00', '#ffee88'];
            ctx.fillStyle = colors[i];
            ctx.beginPath();
            ctx.moveTo(this.x - trailW + offset, this.y + 4);
            ctx.quadraticCurveTo(
                this.x + offset, this.y + trailH + 10,
                this.x + trailW + offset, this.y + 4
            );
            ctx.closePath();
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        if (_addTrail) ctx.globalCompositeOperation = 'source-over';

        // Outer glow
        ctx.fillStyle = '#ff3344';
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(this.x, this.y, w + 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Main arrow body (elongated diamond)
        ctx.fillStyle = '#ff3344';
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - h * 0.6);           // Sharp tip
        ctx.lineTo(this.x + w * 0.5, this.y - h * 0.1);
        ctx.lineTo(this.x + w * 0.3, this.y + h * 0.4);
        ctx.lineTo(this.x, this.y + h * 0.2);
        ctx.lineTo(this.x - w * 0.3, this.y + h * 0.4);
        ctx.lineTo(this.x - w * 0.5, this.y - h * 0.1);
        ctx.closePath();
        ctx.fill();

        // Bold outline
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Inner hot core
        ctx.fillStyle = '#ffaa00';
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - h * 0.4);
        ctx.lineTo(this.x + w * 0.2, this.y);
        ctx.lineTo(this.x, this.y + h * 0.15);
        ctx.lineTo(this.x - w * 0.2, this.y);
        ctx.closePath();
        ctx.fill();

        // White hot tip
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - h * 0.55);
        ctx.lineTo(this.x + 3, this.y - h * 0.3);
        ctx.lineTo(this.x - 3, this.y - h * 0.3);
        ctx.closePath();
        ctx.fill();
    }

    // ═══════════════════════════════════════════════════════════════════
    // MISSILE: Blue Warhead - AoE explosion on impact
    // (WEAPON EVOLUTION v3.0 Special)
    // ═══════════════════════════════════════════════════════════════════
    drawMissileBullet(ctx, pulse) {
        const w = this.width * 2.2;
        const h = this.height * 1.6;

        // Calculate missile rotation based on velocity
        const angle = Math.atan2(this.vy, this.vx) + Math.PI / 2;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(angle);

        // Exhaust trail (blue-white) — v4.23.1: additive
        const _gc = window.Game.Balance?.GLOW;
        const _addTrail = _gc?.ENABLED && _gc?.BULLET?.ENABLED;
        if (_addTrail) ctx.globalCompositeOperation = 'lighter';
        const flicker = Math.sin(this.age * 40) * 3;
        ctx.globalAlpha = 0.8;
        for (let i = 3; i > 0; i--) {
            const trailLen = 10 + i * 6 + flicker;
            const trailWidth = w * (0.25 + i * 0.08);
            const colors = ['#114488', '#2288ff', '#66bbff'];
            ctx.fillStyle = colors[i - 1];
            ctx.beginPath();
            ctx.moveTo(-trailWidth, h * 0.4);
            ctx.quadraticCurveTo(0, h * 0.4 + trailLen, trailWidth, h * 0.4);
            ctx.closePath();
            ctx.fill();
        }
        // White core of exhaust
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(-w * 0.1, h * 0.4);
        ctx.quadraticCurveTo(0, h * 0.4 + 8, w * 0.1, h * 0.4);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
        if (_addTrail) ctx.globalCompositeOperation = 'source-over';

        // Missile body (chunky warhead)
        ctx.fillStyle = '#2288ff';
        ctx.beginPath();
        ctx.moveTo(0, -h * 0.55);          // Nose
        ctx.lineTo(w * 0.5, -h * 0.15);    // Right shoulder
        ctx.lineTo(w * 0.5, h * 0.3);      // Right side
        ctx.lineTo(w * 0.3, h * 0.4);      // Right rear
        ctx.lineTo(-w * 0.3, h * 0.4);     // Left rear
        ctx.lineTo(-w * 0.5, h * 0.3);     // Left side
        ctx.lineTo(-w * 0.5, -h * 0.15);   // Left shoulder
        ctx.closePath();
        ctx.fill();

        // Bold outline
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Large fins (bigger than homing)
        ctx.fillStyle = '#114488';
        // Left fin
        ctx.beginPath();
        ctx.moveTo(-w * 0.5, h * 0.15);
        ctx.lineTo(-w * 0.9, h * 0.5);
        ctx.lineTo(-w * 0.5, h * 0.35);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Right fin
        ctx.beginPath();
        ctx.moveTo(w * 0.5, h * 0.15);
        ctx.lineTo(w * 0.9, h * 0.5);
        ctx.lineTo(w * 0.5, h * 0.35);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Warhead tip (brighter blue)
        ctx.fillStyle = '#44ccff';
        ctx.beginPath();
        ctx.moveTo(0, -h * 0.55);
        ctx.lineTo(w * 0.3, -h * 0.2);
        ctx.lineTo(-w * 0.3, -h * 0.2);
        ctx.closePath();
        ctx.fill();

        // White tip
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(0, -h * 0.5);
        ctx.lineTo(w * 0.12, -h * 0.3);
        ctx.lineTo(-w * 0.12, -h * 0.3);
        ctx.closePath();
        ctx.fill();

        // Explosive indicator (red band)
        ctx.fillStyle = '#ff3344';
        ctx.fillRect(-w * 0.45, h * 0.05, w * 0.9, h * 0.12);
        ctx.strokeRect(-w * 0.45, h * 0.05, w * 0.9, h * 0.12);

        ctx.restore();
    }

    // ═══════════════════════════════════════════════════════════════════
    // EVOLUTION: Default Orange Bolt for Weapon Evolution system
    // Clean BTC-themed projectile with power indicator
    // ═══════════════════════════════════════════════════════════════════
    drawEvolutionBullet(ctx, pulse) {
        const w = this.width * 1.8;  // v5.9: 2.0→1.8
        const h = this.height * 1.2; // v5.9: 1.3→1.2

        // Power indicator glow (based on damageMult)
        if (this.damageMult > 1) {
            const powerGlow = (this.damageMult - 1) * 0.5; // 0 to 0.375 for max power
            ctx.fillStyle = '#FFD700';
            ctx.globalAlpha = 0.2 + powerGlow;
            ctx.beginPath();
            ctx.arc(this.x, this.y, w + 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        // Outer glow trail — v4.23.1: additive
        const _gc = window.Game.Balance?.GLOW;
        const _addTrail = _gc?.ENABLED && _gc?.BULLET?.ENABLED;
        if (_addTrail) ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = this.color;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.moveTo(this.x - w, this.y + 2);
        ctx.lineTo(this.x, this.y + h + 8);
        ctx.lineTo(this.x + w, this.y + 2);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
        if (_addTrail) ctx.globalCompositeOperation = 'source-over';

        // Main bolt body (elongated hexagon)
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - 8);           // Top point
        ctx.lineTo(this.x + w, this.y - 2);       // Upper right
        ctx.lineTo(this.x + w * 0.7, this.y + 6); // Lower right
        ctx.lineTo(this.x, this.y + h);           // Bottom point
        ctx.lineTo(this.x - w * 0.7, this.y + 6); // Lower left
        ctx.lineTo(this.x - w, this.y - 2);       // Upper left
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Inner bright core (larger if powered up)
        const coreSize = this.damageMult > 1 ? 1.2 : 1;
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - 4 * coreSize);
        ctx.lineTo(this.x + w * 0.4 * coreSize, this.y);
        ctx.lineTo(this.x, this.y + 8 * coreSize);
        ctx.lineTo(this.x - w * 0.4 * coreSize, this.y);
        ctx.closePath();
        ctx.fill();

        // BTC symbol (small)
        ctx.fillStyle = '#111';
        ctx.font = 'bold 9px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('₿', this.x, this.y + 1);
    }

    // v4.17: Get hostile-tinted glow color (70% enemy color + 30% red)
    // v4.18: White bullets bypass mixing (avoid pink/salmon tint)
    getHostileGlowColor() {
        if (this.color === '#ffffff') return '#ffffff';
        const CU = window.Game.ColorUtils;
        if (!CU || !CU.parseColor) return this.color;
        // Parse the enemy color to RGB, mix with red
        const c = CU.parseColor(this.color);
        if (!c) return this.color;
        const r = Math.min(255, Math.round(c.r * 0.7 + 200 * 0.3));
        const g = Math.round(c.g * 0.7);
        const b = Math.round(c.b * 0.7);
        return CU.rgba(r, g, b, 1);
    }

    // ═══════════════════════════════════════════════════════════════════
    // ENEMY BULLET DISPATCHER
    // Routes to shape-specific method or default energy bolt
    // ═══════════════════════════════════════════════════════════════════
    drawEnemyBullet(ctx) {
        switch (this.shape) {
            case 'coin':
                this.drawCoinBullet(ctx);
                break;
            case 'bill':
                this.drawBillBullet(ctx);
                break;
            case 'bar':
                this.drawBarBullet(ctx);
                break;
            case 'card':
                this.drawCardBullet(ctx);
                break;
            default:
                this.drawEnemyBolt(ctx);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // COIN BULLET (¥ ₹ £): Spinning ellipse core, same glow as energy bolt
    // Keeps the same visibility, only changes the internal shape
    // ═══════════════════════════════════════════════════════════════════
    drawCoinBullet(ctx) {
        const beatBoost = this.beatSynced ? 1.5 : 1.0;
        const r = (this.width || 5) * 1.8;
        const pulse = Math.sin(this.age * 25) * 0.15 + 1;
        const glowColor = this.getHostileGlowColor(); // v4.17: hostile tint

        // Calculate direction for trail
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy) || 1;
        const dirX = this.vx / speed;
        const dirY = this.vy / speed;
        const perpX = -dirY;
        const perpY = dirX;
        const trailLen = Math.min(28, speed * 0.12);

        // === Trail (2 segments) — v4.17: reduced alpha ===
        ctx.fillStyle = glowColor;
        ctx.globalAlpha = 0.20;
        ctx.beginPath();
        const d1 = trailLen * 0.5;
        const w1 = r * 0.45;
        ctx.moveTo(this.x - dirX * d1 - perpX * w1, this.y - dirY * d1 - perpY * w1);
        ctx.lineTo(this.x - dirX * (d1 + 8), this.y - dirY * (d1 + 8));
        ctx.lineTo(this.x - dirX * d1 + perpX * w1, this.y - dirY * d1 + perpY * w1);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 0.08;
        ctx.beginPath();
        const w2 = r * 0.6;
        ctx.moveTo(this.x - dirX * trailLen - perpX * w2, this.y - dirY * trailLen - perpY * w2);
        ctx.lineTo(this.x - dirX * (trailLen + 8), this.y - dirY * (trailLen + 8));
        ctx.lineTo(this.x - dirX * trailLen + perpX * w2, this.y - dirY * trailLen + perpY * w2);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;

        // === Outer glow — v4.17: smaller radius, halved alpha, hostile tint ===
        ctx.fillStyle = glowColor;
        ctx.globalAlpha = 0.15 * pulse * beatBoost;
        ctx.beginPath();
        ctx.arc(this.x, this.y, r + 3 + (this.beatSynced ? 2 : 0), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // === v4.17: Dark hostile ring (was white — looked collectible) ===
        ctx.strokeStyle = Bullet._HOSTILE_RING;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(this.x, this.y, r + 2, 0, Math.PI * 2);
        ctx.stroke();

        // === Spinning ellipse core ===
        const rotation = this.age * 12;
        const ellipseWidth = Math.abs(Math.cos(rotation)) * r * 0.9 + r * 0.5;

        // Main coin body (ellipse) — v4.56: ownerColor tint
        ctx.fillStyle = this.ownerColor || this.color;
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, ellipseWidth * pulse, r * pulse, 0, 0, Math.PI * 2);
        ctx.fill();

        // v4.17: Dark contour (was white)
        ctx.strokeStyle = Bullet._HOSTILE_CONTOUR;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Inner ring (coin groove)
        ctx.strokeStyle = window.Game.ColorUtils.darken(this.ownerColor || this.color, 0.3);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, ellipseWidth * 0.6, r * 0.6, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Edge shine (metallic highlight)
        if (Math.cos(rotation) > 0.2) {
            ctx.fillStyle = '#fff';
            ctx.globalAlpha = Math.cos(rotation) * 0.6;
            ctx.beginPath();
            ctx.ellipse(this.x - ellipseWidth * 0.3, this.y - r * 0.2, ellipseWidth * 0.2, r * 0.3, -0.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        // Center bright spot (v4.56: tinted with enemy color)
        ctx.fillStyle = this.ownerColor || '#fff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, r * 0.2, 0, Math.PI * 2);
        ctx.fill();
    }

    // ═══════════════════════════════════════════════════════════════════
    // BILL BULLET (₽ € ₺ $): Folded paper V-shape, same glow as energy bolt
    // Keeps the same visibility, only changes the internal shape
    // ═══════════════════════════════════════════════════════════════════
    drawBillBullet(ctx) {
        const beatBoost = this.beatSynced ? 1.5 : 1.0;
        const r = (this.width || 5) * 1.8;
        const pulse = Math.sin(this.age * 25) * 0.15 + 1;
        const glowColor = this.getHostileGlowColor(); // v4.17: hostile tint

        // Calculate direction for trail
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy) || 1;
        const dirX = this.vx / speed;
        const dirY = this.vy / speed;
        const perpX = -dirY;
        const perpY = dirX;
        const trailLen = Math.min(28, speed * 0.12);

        // === Trail (2 segments) — v4.17: reduced alpha ===
        ctx.fillStyle = glowColor;
        ctx.globalAlpha = 0.20;
        ctx.beginPath();
        const d1 = trailLen * 0.5, w1 = r * 0.45;
        ctx.moveTo(this.x - dirX * d1 - perpX * w1, this.y - dirY * d1 - perpY * w1);
        ctx.lineTo(this.x - dirX * (d1 + 8), this.y - dirY * (d1 + 8));
        ctx.lineTo(this.x - dirX * d1 + perpX * w1, this.y - dirY * d1 + perpY * w1);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 0.08;
        ctx.beginPath();
        const w2 = r * 0.6;
        ctx.moveTo(this.x - dirX * trailLen - perpX * w2, this.y - dirY * trailLen - perpY * w2);
        ctx.lineTo(this.x - dirX * (trailLen + 8), this.y - dirY * (trailLen + 8));
        ctx.lineTo(this.x - dirX * trailLen + perpX * w2, this.y - dirY * trailLen + perpY * w2);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;

        // === Outer glow — v4.17: smaller, dimmer, hostile tint ===
        ctx.fillStyle = glowColor;
        ctx.globalAlpha = 0.15 * pulse * beatBoost;
        ctx.beginPath();
        ctx.arc(this.x, this.y, r + 3 + (this.beatSynced ? 2 : 0), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // === v4.17: Dark hostile ring (was white) ===
        ctx.strokeStyle = Bullet._HOSTILE_RING;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(this.x, this.y, r + 2, 0, Math.PI * 2);
        ctx.stroke();

        // === Folded paper airplane V-shape ===
        const flutter = Math.sin(this.age * 18) * 0.15;
        const angle = Math.atan2(this.vy, this.vx);

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(angle + Math.PI / 2);

        const w = r * 1.4 * pulse;
        const h = r * 1.6;

        // Paper body — v4.56: ownerColor tint
        ctx.fillStyle = this.ownerColor || this.color;
        ctx.beginPath();
        ctx.moveTo(0, -h * 0.6);
        ctx.lineTo(w * (1 + flutter), h * 0.3);
        ctx.lineTo(0, h * 0.1);
        ctx.lineTo(-w * (1 - flutter), h * 0.3);
        ctx.closePath();
        ctx.fill();

        // v4.17: Dark contour (was white)
        ctx.strokeStyle = Bullet._HOSTILE_CONTOUR;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Center fold line (paper crease)
        ctx.strokeStyle = window.Game.ColorUtils.darken(this.ownerColor || this.color, 0.3);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, -h * 0.5);
        ctx.lineTo(0, h * 0.2);
        ctx.stroke();

        // Highlight on one wing (3D paper effect)
        ctx.fillStyle = window.Game.ColorUtils.lighten(this.ownerColor || this.color, 0.4);
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.moveTo(0, -h * 0.5);
        ctx.lineTo(w * 0.5 * (1 + flutter), h * 0.1);
        ctx.lineTo(0, 0);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.restore();

        // Center bright spot (v4.56: tinted with enemy color)
        ctx.fillStyle = this.ownerColor || '#fff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, r * 0.15, 0, Math.PI * 2);
        ctx.fill();
    }

    // ═══════════════════════════════════════════════════════════════════
    // BAR BULLET (₣ 元): 3D gold ingot/trapezoid, same glow as energy bolt
    // Keeps the same visibility, only changes the internal shape
    // ═══════════════════════════════════════════════════════════════════
    drawBarBullet(ctx) {
        const beatBoost = this.beatSynced ? 1.5 : 1.0;
        const r = (this.width || 5) * 1.8;
        const pulse = Math.sin(this.age * 25) * 0.15 + 1;
        const glowColor = this.getHostileGlowColor(); // v4.17: hostile tint

        // Calculate direction for trail
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy) || 1;
        const dirX = this.vx / speed;
        const dirY = this.vy / speed;
        const perpX = -dirY;
        const perpY = dirX;
        const trailLen = Math.min(28, speed * 0.12);

        // === Trail (2 segments) — v4.17: reduced alpha ===
        ctx.fillStyle = glowColor;
        ctx.globalAlpha = 0.20;
        ctx.beginPath();
        const d1 = trailLen * 0.5, w1 = r * 0.45;
        ctx.moveTo(this.x - dirX * d1 - perpX * w1, this.y - dirY * d1 - perpY * w1);
        ctx.lineTo(this.x - dirX * (d1 + 8), this.y - dirY * (d1 + 8));
        ctx.lineTo(this.x - dirX * d1 + perpX * w1, this.y - dirY * d1 + perpY * w1);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 0.08;
        ctx.beginPath();
        const w2 = r * 0.6;
        ctx.moveTo(this.x - dirX * trailLen - perpX * w2, this.y - dirY * trailLen - perpY * w2);
        ctx.lineTo(this.x - dirX * (trailLen + 8), this.y - dirY * (trailLen + 8));
        ctx.lineTo(this.x - dirX * trailLen + perpX * w2, this.y - dirY * trailLen + perpY * w2);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;

        // === Outer glow — v4.17: smaller, dimmer, hostile tint ===
        ctx.fillStyle = glowColor;
        ctx.globalAlpha = 0.15 * pulse * beatBoost;
        ctx.beginPath();
        ctx.arc(this.x, this.y, r + 3 + (this.beatSynced ? 2 : 0), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // === v4.17: Dark hostile ring (was white) ===
        ctx.strokeStyle = Bullet._HOSTILE_RING;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(this.x, this.y, r + 2, 0, Math.PI * 2);
        ctx.stroke();

        // === DIFFERENT: 3D gold ingot (trapezoid) that tumbles ===
        const tumble = this.age * 8; // Tumble rotation
        const tiltX = Math.sin(tumble) * 0.3; // Side tilt
        const tiltY = Math.cos(tumble * 0.7) * 0.2; // Forward tilt

        ctx.save();
        ctx.translate(this.x, this.y);

        // Ingot dimensions
        // v4.0.4: Increased from 1.3/0.8 to 1.5/0.95 for better visibility
        const w = r * 1.5 * pulse;
        const h = r * 0.95;
        const topW = w * 0.6; // Top face is narrower (trapezoid)

        // Calculate 3D offset based on tumble
        const depthOffset = Math.sin(tumble) * 3;

        // Bottom face (darker, back) — v4.56: ownerColor tint
        ctx.fillStyle = window.Game.ColorUtils.darken(this.ownerColor || this.color, 0.4);
        ctx.beginPath();
        ctx.moveTo(-w + depthOffset, h * 0.3);
        ctx.lineTo(w + depthOffset, h * 0.3);
        ctx.lineTo(topW + depthOffset, -h * 0.5);
        ctx.lineTo(-topW + depthOffset, -h * 0.5);
        ctx.closePath();
        ctx.fill();

        // Main face (front) — v4.56: ownerColor tint
        ctx.fillStyle = this.ownerColor || this.color;
        ctx.beginPath();
        ctx.moveTo(-w, h * 0.4);           // Bottom left
        ctx.lineTo(w, h * 0.4);            // Bottom right
        ctx.lineTo(topW, -h * 0.4);        // Top right
        ctx.lineTo(-topW, -h * 0.4);       // Top left
        ctx.closePath();
        ctx.fill();

        // v4.17: Dark contour (was white)
        ctx.strokeStyle = Bullet._HOSTILE_CONTOUR;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Top face (lighter, shows during tumble)
        if (Math.cos(tumble) > 0) {
            ctx.fillStyle = window.Game.ColorUtils.lighten(this.ownerColor || this.color, 0.3);
            ctx.globalAlpha = Math.cos(tumble) * 0.8;
            ctx.beginPath();
            ctx.moveTo(-topW, -h * 0.4);
            ctx.lineTo(topW, -h * 0.4);
            ctx.lineTo(topW * 0.8, -h * 0.6);
            ctx.lineTo(-topW * 0.8, -h * 0.6);
            ctx.closePath();
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        // Metallic shine line
        ctx.strokeStyle = '#fff';
        ctx.globalAlpha = 0.7;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-topW * 0.5, -h * 0.3);
        ctx.lineTo(topW * 0.3, -h * 0.3);
        ctx.stroke();
        ctx.globalAlpha = 1;

        ctx.restore();

        // Center bright spot (v4.56: tinted with enemy color)
        ctx.fillStyle = this.ownerColor || '#fff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, r * 0.15, 0, Math.PI * 2);
        ctx.fill();
    }

    // ═══════════════════════════════════════════════════════════════════
    // CARD BULLET (Ⓒ CBDC): Digital chip/card, same glow as energy bolt
    // Keeps the same visibility, only changes the internal shape
    // ═══════════════════════════════════════════════════════════════════
    drawCardBullet(ctx) {
        const beatBoost = this.beatSynced ? 1.5 : 1.0;
        const r = (this.width || 5) * 1.8;
        const pulse = Math.sin(this.age * 25) * 0.15 + 1;
        const glowColor = this.getHostileGlowColor(); // v4.17: hostile tint

        // Calculate direction for trail
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy) || 1;
        const dirX = this.vx / speed;
        const dirY = this.vy / speed;
        const perpX = -dirY;
        const perpY = dirX;
        const trailLen = Math.min(28, speed * 0.12);

        // === Trail (2 segments) — v4.17: reduced alpha ===
        ctx.fillStyle = glowColor;
        ctx.globalAlpha = 0.20;
        ctx.beginPath();
        const d1 = trailLen * 0.5, w1 = r * 0.45;
        ctx.moveTo(this.x - dirX * d1 - perpX * w1, this.y - dirY * d1 - perpY * w1);
        ctx.lineTo(this.x - dirX * (d1 + 8), this.y - dirY * (d1 + 8));
        ctx.lineTo(this.x - dirX * d1 + perpX * w1, this.y - dirY * d1 + perpY * w1);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 0.08;
        ctx.beginPath();
        const w2 = r * 0.6;
        ctx.moveTo(this.x - dirX * trailLen - perpX * w2, this.y - dirY * trailLen - perpY * w2);
        ctx.lineTo(this.x - dirX * (trailLen + 8), this.y - dirY * (trailLen + 8));
        ctx.lineTo(this.x - dirX * trailLen + perpX * w2, this.y - dirY * trailLen + perpY * w2);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;

        // === Outer glow — v4.17: smaller, dimmer, hostile tint ===
        ctx.fillStyle = glowColor;
        ctx.globalAlpha = 0.15 * pulse * beatBoost;
        ctx.beginPath();
        ctx.arc(this.x, this.y, r + 3 + (this.beatSynced ? 2 : 0), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // === v4.17: Dark hostile ring (was white) ===
        ctx.strokeStyle = Bullet._HOSTILE_RING;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(this.x, this.y, r + 2, 0, Math.PI * 2);
        ctx.stroke();

        // === DIFFERENT: Digital card/chip rectangle ===
        const glitch = Math.random() < 0.08 ? (Math.random() - 0.5) * 4 : 0; // Occasional glitch offset

        ctx.save();
        ctx.translate(this.x + glitch, this.y);

        // Card dimensions (rectangle)
        // v4.0.4: Increased from 1.1/0.8 to 1.25/0.95 for better visibility
        const w = r * 1.25 * pulse;
        const h = r * 0.95 * pulse;

        // Main card body (rounded rectangle) — v4.56: ownerColor tint
        ctx.fillStyle = this.ownerColor || this.color;
        ctx.beginPath();
        const cornerR = 2;
        ctx.moveTo(-w + cornerR, -h);
        ctx.lineTo(w - cornerR, -h);
        ctx.quadraticCurveTo(w, -h, w, -h + cornerR);
        ctx.lineTo(w, h - cornerR);
        ctx.quadraticCurveTo(w, h, w - cornerR, h);
        ctx.lineTo(-w + cornerR, h);
        ctx.quadraticCurveTo(-w, h, -w, h - cornerR);
        ctx.lineTo(-w, -h + cornerR);
        ctx.quadraticCurveTo(-w, -h, -w + cornerR, -h);
        ctx.closePath();
        ctx.fill();

        // v4.17: Dark contour (was white)
        ctx.strokeStyle = Bullet._HOSTILE_CONTOUR;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Chip square (top-left corner)
        ctx.fillStyle = window.Game.ColorUtils.lighten(this.ownerColor || this.color, 0.4);
        ctx.fillRect(-w * 0.7, -h * 0.6, w * 0.5, h * 0.7);
        ctx.strokeStyle = window.Game.ColorUtils.darken(this.ownerColor || this.color, 0.3);
        ctx.lineWidth = 1;
        ctx.strokeRect(-w * 0.7, -h * 0.6, w * 0.5, h * 0.7);

        // Chip circuit lines
        ctx.strokeStyle = window.Game.ColorUtils.darken(this.ownerColor || this.color, 0.2);
        ctx.lineWidth = 1;
        ctx.beginPath();
        // Horizontal lines from chip
        ctx.moveTo(-w * 0.2, -h * 0.4);
        ctx.lineTo(w * 0.7, -h * 0.4);
        ctx.moveTo(-w * 0.2, -h * 0.1);
        ctx.lineTo(w * 0.5, -h * 0.1);
        ctx.moveTo(-w * 0.2, h * 0.2);
        ctx.lineTo(w * 0.6, h * 0.2);
        ctx.stroke();

        // Scanline effect (subtle horizontal lines)
        ctx.strokeStyle = Bullet._WHITE_15;
        ctx.lineWidth = 1;
        for (let i = -3; i <= 3; i++) {
            const lineY = i * h * 0.25;
            ctx.beginPath();
            ctx.moveTo(-w * 0.9, lineY);
            ctx.lineTo(w * 0.9, lineY);
            ctx.stroke();
        }

        ctx.restore();

        // Digital pulse at center (v4.56: tinted with enemy color)
        ctx.fillStyle = this.ownerColor || '#fff';
        ctx.globalAlpha = 0.5 + Math.sin(this.age * 40) * 0.3;
        ctx.beginPath();
        ctx.arc(this.x, this.y, r * 0.12, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    // ═══════════════════════════════════════════════════════════════════
    // ENEMY: High-contrast energy bolt (DEFAULT FALLBACK)
    // Readable even with many projectiles on screen
    // Beat-synced bullets from Harmonic Conductor have enhanced trails
    // ═══════════════════════════════════════════════════════════════════
    drawEnemyBolt(ctx) {
        const beatBoost = this.beatSynced ? 1.5 : 1.0;
        const r = (this.width || 5) * 1.8;
        const pulse = Math.sin(this.age * 25) * 0.15 + 1;
        const glowColor = this.getHostileGlowColor(); // v4.17: hostile tint

        // Calculate direction for oriented drawing
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy) || 1;
        const dirX = this.vx / speed;
        const dirY = this.vy / speed;
        const perpX = -dirY;
        const perpY = dirX;

        // Trail length based on speed
        const trailLen = Math.min(28, speed * 0.12);

        // v4.17: 2-segment trail with reduced alpha + hostile tint
        ctx.fillStyle = glowColor;
        ctx.globalAlpha = 0.20;
        ctx.beginPath();
        const d1 = trailLen * 0.5, w1 = r * 0.45;
        ctx.moveTo(this.x - dirX * d1 - perpX * w1, this.y - dirY * d1 - perpY * w1);
        ctx.lineTo(this.x - dirX * (d1 + 8), this.y - dirY * (d1 + 8));
        ctx.lineTo(this.x - dirX * d1 + perpX * w1, this.y - dirY * d1 + perpY * w1);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 0.08;
        ctx.beginPath();
        const w2 = r * 0.6;
        ctx.moveTo(this.x - dirX * trailLen - perpX * w2, this.y - dirY * trailLen - perpY * w2);
        ctx.lineTo(this.x - dirX * (trailLen + 8), this.y - dirY * (trailLen + 8));
        ctx.lineTo(this.x - dirX * trailLen + perpX * w2, this.y - dirY * trailLen + perpY * w2);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;

        // Outer glow — v4.17: smaller, dimmer, hostile tint
        ctx.fillStyle = glowColor;
        ctx.globalAlpha = 0.15 * pulse * beatBoost;
        ctx.beginPath();
        ctx.arc(this.x, this.y, r + 3 + (this.beatSynced ? 2 : 0), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // v4.17: Dark hostile ring (was white)
        ctx.strokeStyle = Bullet._HOSTILE_RING;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(this.x, this.y, r + 2, 0, Math.PI * 2);
        ctx.stroke();

        // Main bolt body + dark contour — v4.56: ownerColor tint
        ctx.fillStyle = this.ownerColor || this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, r * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = Bullet._HOSTILE_CONTOUR;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Core center (v4.56: tinted with enemy color)
        ctx.fillStyle = this.ownerColor || 'rgba(255,200,180,0.7)';
        ctx.globalAlpha = this.ownerColor ? 0.9 : 0.7;
        ctx.beginPath();
        ctx.arc(this.x, this.y, r * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }

}

// Static cached color strings (avoid per-frame allocation)
Bullet._WHITE_HALF = 'rgba(255,255,255,0.50)';
Bullet._WHITE_15 = 'rgba(255,255,255,0.15)';
Bullet._WHITE_90 = 'rgba(255,255,255,0.90)';
// v4.17: Hostile tint for enemy bullets (dark ring instead of white, reduces collectible look)
Bullet._HOSTILE_RING = 'rgba(80,20,20,0.35)';
Bullet._HOSTILE_CONTOUR = 'rgba(60,15,15,0.60)';

// Attach to namespace
window.Game.Bullet = Bullet;

// Static Pool - Needs ObjectPool to be loaded first!
// We rely on index.html ordering: ObjectPool.js loaded before Bullet.js
if (window.Game.ObjectPool) {
    window.Game.Bullet.Pool = new window.Game.ObjectPool(() => new Bullet(0, 0, 0, 0, '#fff', 0, 0, false), 50);
} else {
    console.error("ObjectPool not found! Bullet pooling disabled.");
}
