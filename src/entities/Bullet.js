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

        // === WEAPON EVOLUTION v3.0 properties ===
        this.damageMult = 1;      // From POWER modifier
        this.special = null;      // 'HOMING'|'PIERCE'|'LASER'|'MISSILE'|null
        this.isMissile = false;   // MISSILE special flag
        this.aoeRadius = 0;       // MISSILE explosion radius
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

        // === WEAPON EVOLUTION v3.0 reset ===
        this.damageMult = 1;
        this.special = null;
        this.isMissile = false;
        this.aoeRadius = 0;
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

    draw(ctx) {
        const isEnemy = this.vy > 0; // Enemy bullets go down

        if (isEnemy) {
            // Enemy bullet: dispatch to shape-specific or default
            this.drawEnemyBullet(ctx);
        } else {
            // Player bullet - distinct style per weapon type
            ctx.strokeStyle = '#111';
            ctx.lineWidth = 2;
            const pulse = Math.sin(this.age * 20) * 0.15 + 1; // Subtle pulse

            // HODL bullets get golden glow effect (2x damage indicator)
            if (this.isHodl) {
                const hodlGlow = Math.sin(this.age * 15) * 0.2 + 0.5;
                ctx.fillStyle = `rgba(255, 215, 0, ${hodlGlow * 0.4})`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, 12 + pulse * 3, 0, Math.PI * 2);
                ctx.fill();

                // Golden sparkle trail
                ctx.fillStyle = `rgba(255, 255, 150, ${hodlGlow * 0.6})`;
                for (let i = 0; i < 2; i++) {
                    const trailY = this.y + 8 + i * 8;
                    const trailSize = 2 - i * 0.5;
                    ctx.beginPath();
                    ctx.arc(this.x + (Math.sin(this.age * 20 + i) * 3), trailY, trailSize, 0, Math.PI * 2);
                    ctx.fill();
                }
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
                    case 'LASER':
                        this.drawLaserBullet(ctx, pulse);
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
                    case 'LASER':
                        this.drawLaserBullet(ctx, pulse);
                        break;
                    case 'EVOLUTION':
                        this.drawEvolutionBullet(ctx, pulse);
                        break;
                    default: // NORMAL
                        this.drawNormalBullet(ctx, pulse);
                }
            }
        }
    }
    // ═══════════════════════════════════════════════════════════════════
    // NORMAL: BTC Orange Bolt - Clean iconic crypto projectile
    // ═══════════════════════════════════════════════════════════════════
    drawNormalBullet(ctx, pulse) {
        const w = this.width * 2.0;  // Scaled up for visibility
        const h = this.height * 1.3;

        // Outer glow trail
        ctx.fillStyle = this.color;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.moveTo(this.x - w, this.y + 2);
        ctx.lineTo(this.x, this.y + h + 8);
        ctx.lineTo(this.x + w, this.y + 2);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;

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
        ctx.font = 'bold 8px Arial';
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
        ctx.fillStyle = '#9b59b6';
        ctx.globalAlpha = 0.25;
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, w + 6, h * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Energy trail (multiple fading segments)
        for (let i = 3; i > 0; i--) {
            ctx.fillStyle = '#9b59b6';
            ctx.globalAlpha = 0.15 * i;
            ctx.beginPath();
            ctx.ellipse(this.x, this.y + (i * 6), w - i * 2, h * 0.3, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Main crescent body
        ctx.fillStyle = '#9b59b6';
        ctx.beginPath();
        ctx.moveTo(this.x - w, this.y + 4);       // Left wing
        ctx.quadraticCurveTo(this.x, this.y - h, this.x + w, this.y + 4); // Top arc
        ctx.quadraticCurveTo(this.x, this.y + 2, this.x - w, this.y + 4); // Bottom arc
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#6c3483';
        ctx.stroke();

        // Inner energy core
        ctx.fillStyle = '#d4a5ff';
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
        ctx.fillStyle = '#3498db';
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - 12);
        ctx.lineTo(this.x + w + 4, this.y + 4);
        ctx.lineTo(this.x, this.y + h + 6);
        ctx.lineTo(this.x - w - 4, this.y + 4);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;

        // Speed lines (motion blur effect)
        ctx.strokeStyle = '#3498db';
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

        // Main needle body
        ctx.fillStyle = '#3498db';
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - 10);          // Sharp tip
        ctx.lineTo(this.x + w, this.y + 2);       // Right edge
        ctx.lineTo(this.x + w * 0.5, this.y + h); // Right tail
        ctx.lineTo(this.x - w * 0.5, this.y + h); // Left tail
        ctx.lineTo(this.x - w, this.y + 2);       // Left edge
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#1a5276';
        ctx.stroke();

        // Inner plasma core
        ctx.fillStyle = '#85c1e9';
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

        // Fire trail (multiple flame tongues)
        ctx.globalAlpha = 0.6;
        for (let i = 0; i < 3; i++) {
            const offset = Math.sin(this.age * 25 + i * 2) * 3;
            const trailH = 12 + i * 4 + flicker;

            // Outer red
            ctx.fillStyle = '#c0392b';
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

        // Main fireball outer (dark red)
        ctx.fillStyle = '#c0392b';
        ctx.beginPath();
        ctx.arc(this.x, this.y, r + 3, 0, Math.PI * 2);
        ctx.fill();

        // Middle layer (orange)
        ctx.fillStyle = '#e67e22';
        ctx.beginPath();
        ctx.arc(this.x, this.y - 1, r + 1, 0, Math.PI * 2);
        ctx.fill();

        // Core (bright orange-yellow)
        ctx.fillStyle = '#f39c12';
        ctx.beginPath();
        ctx.arc(this.x, this.y - 2, r - 1, 0, Math.PI * 2);
        ctx.fill();

        // Hot center (yellow-white)
        ctx.fillStyle = '#f9e79f';
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
        ctx.fillStyle = '#2ecc71';
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(this.x, this.y, r + 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Sparkle trail
        ctx.fillStyle = '#2ecc71';
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

        ctx.fillStyle = '#2ecc71';
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
        ctx.fillStyle = '#82e0aa';
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
        const w = this.width * 2.0;
        const h = this.height * 1.5;

        // Calculate missile rotation based on velocity
        const angle = Math.atan2(this.vy, this.vx) + Math.PI / 2;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(angle);

        // Exhaust flame trail
        const flicker = Math.sin(this.age * 40) * 3;
        ctx.globalAlpha = 0.8;
        for (let i = 3; i > 0; i--) {
            const trailLen = 8 + i * 5 + flicker;
            const trailWidth = w * (0.3 + i * 0.1);
            ctx.fillStyle = i === 3 ? '#c0392b' : (i === 2 ? '#e67e22' : '#f39c12');
            ctx.beginPath();
            ctx.moveTo(-trailWidth, h * 0.4);
            ctx.quadraticCurveTo(0, h * 0.4 + trailLen, trailWidth, h * 0.4);
            ctx.closePath();
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Missile body (elongated diamond)
        ctx.fillStyle = '#e67e22';
        ctx.beginPath();
        ctx.moveTo(0, -h * 0.6);          // Nose
        ctx.lineTo(w * 0.5, 0);           // Right side
        ctx.lineTo(w * 0.4, h * 0.4);     // Right rear
        ctx.lineTo(-w * 0.4, h * 0.4);    // Left rear
        ctx.lineTo(-w * 0.5, 0);          // Left side
        ctx.closePath();
        ctx.fill();

        // Bold outline
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Fins (small triangles)
        ctx.fillStyle = '#d35400';
        // Left fin
        ctx.beginPath();
        ctx.moveTo(-w * 0.4, h * 0.2);
        ctx.lineTo(-w * 0.8, h * 0.5);
        ctx.lineTo(-w * 0.4, h * 0.4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Right fin
        ctx.beginPath();
        ctx.moveTo(w * 0.4, h * 0.2);
        ctx.lineTo(w * 0.8, h * 0.5);
        ctx.lineTo(w * 0.4, h * 0.4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Nose cone (brighter)
        ctx.fillStyle = '#f39c12';
        ctx.beginPath();
        ctx.moveTo(0, -h * 0.6);
        ctx.lineTo(w * 0.25, -h * 0.2);
        ctx.lineTo(-w * 0.25, -h * 0.2);
        ctx.closePath();
        ctx.fill();

        // White tip
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(0, -h * 0.55);
        ctx.lineTo(w * 0.1, -h * 0.35);
        ctx.lineTo(-w * 0.1, -h * 0.35);
        ctx.closePath();
        ctx.fill();

        // Target seeker (red dot)
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.arc(0, -h * 0.3, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // ═══════════════════════════════════════════════════════════════════
    // LASER: Cyan Energy Beam - Rapid continuous penetrating shot
    // ═══════════════════════════════════════════════════════════════════
    drawLaserBullet(ctx, pulse) {
        const w = this.width * 2.5;
        const h = this.height * 1.2;
        const flicker = Math.sin(this.age * 50) * 0.2 + 0.8;

        // Outer glow (wide, soft)
        ctx.fillStyle = '#00ffff';
        ctx.globalAlpha = 0.2 * flicker;
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, w + 8, h * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Electric trail (multiple segments)
        ctx.strokeStyle = '#00ffff';
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 1;
        for (let i = 1; i <= 4; i++) {
            const trailY = this.y + i * 8;
            const offset = Math.sin(this.age * 40 + i * 2) * 3;
            ctx.beginPath();
            ctx.moveTo(this.x + offset, trailY - 4);
            ctx.lineTo(this.x - offset, trailY + 4);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.lineWidth = 2;

        // Main beam body (elongated rectangle with pointed ends)
        ctx.fillStyle = '#00ffff';
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - h * 0.7);          // Top point
        ctx.lineTo(this.x + w * 0.4, this.y - h * 0.3); // Upper right
        ctx.lineTo(this.x + w * 0.3, this.y + h * 0.5); // Lower right
        ctx.lineTo(this.x, this.y + h * 0.3);           // Bottom point
        ctx.lineTo(this.x - w * 0.3, this.y + h * 0.5); // Lower left
        ctx.lineTo(this.x - w * 0.4, this.y - h * 0.3); // Upper left
        ctx.closePath();
        ctx.fill();

        // Bold outline
        ctx.strokeStyle = '#111';
        ctx.stroke();

        // Inner bright core (white-cyan gradient effect)
        ctx.fillStyle = '#80ffff';
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - h * 0.5);
        ctx.lineTo(this.x + w * 0.2, this.y);
        ctx.lineTo(this.x, this.y + h * 0.2);
        ctx.lineTo(this.x - w * 0.2, this.y);
        ctx.closePath();
        ctx.fill();

        // Hot white center
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = flicker;
        ctx.beginPath();
        ctx.ellipse(this.x, this.y - h * 0.2, w * 0.15, h * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Tip spark
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.x, this.y - h * 0.6, 2 * pulse, 0, Math.PI * 2);
        ctx.fill();
    }

    // ═══════════════════════════════════════════════════════════════════
    // PIERCE: Flaming Red Arrow - Penetrating flame projectile
    // (WEAPON EVOLUTION v3.0 Special)
    // ═══════════════════════════════════════════════════════════════════
    drawPierceBullet(ctx, pulse) {
        const w = this.width * 2.0;
        const h = this.height * 1.4;
        const flicker = Math.sin(this.age * 30) * 2;

        // Intense flame trail (longer than FIRE)
        ctx.globalAlpha = 0.7;
        for (let i = 0; i < 5; i++) {
            const offset = Math.sin(this.age * 25 + i * 1.5) * 2;
            const trailH = 16 + i * 6 + flicker;
            const trailW = 3 - i * 0.4;

            // Outer red to yellow gradient
            const colors = ['#8B0000', '#c0392b', '#e67e22', '#f39c12', '#f9e79f'];
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

        // Outer glow
        ctx.fillStyle = '#e74c3c';
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(this.x, this.y, w + 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Main arrow body (elongated diamond)
        ctx.fillStyle = '#e74c3c';
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
        ctx.fillStyle = '#f39c12';
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

        // Exhaust trail (blue-white)
        const flicker = Math.sin(this.age * 40) * 3;
        ctx.globalAlpha = 0.8;
        for (let i = 3; i > 0; i--) {
            const trailLen = 10 + i * 6 + flicker;
            const trailWidth = w * (0.25 + i * 0.08);
            const colors = ['#1a5276', '#3498db', '#85c1e9'];
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

        // Missile body (chunky warhead)
        ctx.fillStyle = '#3498db';
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
        ctx.fillStyle = '#1a5276';
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
        ctx.fillStyle = '#5dade2';
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
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(-w * 0.45, h * 0.05, w * 0.9, h * 0.12);
        ctx.strokeRect(-w * 0.45, h * 0.05, w * 0.9, h * 0.12);

        ctx.restore();
    }

    // ═══════════════════════════════════════════════════════════════════
    // EVOLUTION: Default Orange Bolt for Weapon Evolution system
    // Clean BTC-themed projectile with power indicator
    // ═══════════════════════════════════════════════════════════════════
    drawEvolutionBullet(ctx, pulse) {
        const w = this.width * 2.0;
        const h = this.height * 1.3;

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

        // Outer glow trail
        ctx.fillStyle = this.color;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.moveTo(this.x - w, this.y + 2);
        ctx.lineTo(this.x, this.y + h + 8);
        ctx.lineTo(this.x + w, this.y + 2);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;

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
        ctx.font = 'bold 8px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('₿', this.x, this.y + 1);
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

        // Calculate direction for trail
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy) || 1;
        const dirX = this.vx / speed;
        const dirY = this.vy / speed;
        const perpX = -dirY;
        const perpY = dirX;
        const trailLen = Math.min(28, speed * 0.12);

        // === SAME AS ENERGY BOLT: Trail ===
        for (let i = 4; i > 0; i--) {
            const segDist = (i / 4) * trailLen;
            const segAlpha = 0.12 * (5 - i);
            const segWidth = r * (0.25 + (i * 0.12));
            ctx.fillStyle = this.color;
            ctx.globalAlpha = segAlpha;
            ctx.beginPath();
            ctx.moveTo(this.x - dirX * segDist - perpX * segWidth, this.y - dirY * segDist - perpY * segWidth);
            ctx.lineTo(this.x - dirX * (segDist + 8), this.y - dirY * (segDist + 8));
            ctx.lineTo(this.x - dirX * segDist + perpX * segWidth, this.y - dirY * segDist + perpY * segWidth);
            ctx.closePath();
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // === SAME AS ENERGY BOLT: Outer glow ===
        ctx.fillStyle = this.color;
        ctx.globalAlpha = 0.3 * pulse * beatBoost;
        ctx.beginPath();
        ctx.arc(this.x, this.y, r + 6 + (this.beatSynced ? 3 : 0), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // === SAME AS ENERGY BOLT: White ring ===
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(this.x, this.y, r + 3, 0, Math.PI * 2);
        ctx.stroke();

        // === DIFFERENT: Spinning ellipse core instead of circle ===
        // v4.0.4: Increased from 0.8/0.4 to 0.9/0.5 for better visibility
        const rotation = this.age * 12; // Spin speed
        const ellipseWidth = Math.abs(Math.cos(rotation)) * r * 0.9 + r * 0.5;

        // Main coin body (ellipse)
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, ellipseWidth * pulse, r * pulse, 0, 0, Math.PI * 2);
        ctx.fill();

        // White contour
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Inner ring (coin groove)
        ctx.strokeStyle = window.Game.ColorUtils.darken(this.color, 0.3);
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

        // Center bright spot
        ctx.fillStyle = '#fff';
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

        // Calculate direction for trail
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy) || 1;
        const dirX = this.vx / speed;
        const dirY = this.vy / speed;
        const perpX = -dirY;
        const perpY = dirX;
        const trailLen = Math.min(28, speed * 0.12);

        // === SAME AS ENERGY BOLT: Trail ===
        for (let i = 4; i > 0; i--) {
            const segDist = (i / 4) * trailLen;
            const segAlpha = 0.12 * (5 - i);
            const segWidth = r * (0.25 + (i * 0.12));
            ctx.fillStyle = this.color;
            ctx.globalAlpha = segAlpha;
            ctx.beginPath();
            ctx.moveTo(this.x - dirX * segDist - perpX * segWidth, this.y - dirY * segDist - perpY * segWidth);
            ctx.lineTo(this.x - dirX * (segDist + 8), this.y - dirY * (segDist + 8));
            ctx.lineTo(this.x - dirX * segDist + perpX * segWidth, this.y - dirY * segDist + perpY * segWidth);
            ctx.closePath();
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // === SAME AS ENERGY BOLT: Outer glow ===
        ctx.fillStyle = this.color;
        ctx.globalAlpha = 0.3 * pulse * beatBoost;
        ctx.beginPath();
        ctx.arc(this.x, this.y, r + 6 + (this.beatSynced ? 3 : 0), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // === SAME AS ENERGY BOLT: White ring ===
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(this.x, this.y, r + 3, 0, Math.PI * 2);
        ctx.stroke();

        // === DIFFERENT: Folded paper airplane V-shape ===
        const flutter = Math.sin(this.age * 18) * 0.15; // Subtle flutter
        const angle = Math.atan2(this.vy, this.vx); // Direction of travel

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(angle + Math.PI / 2); // Point in direction of travel

        // Main paper body (V-shape / folded bill)
        // v4.0.4: Increased from 1.2/1.4 to 1.4/1.6 for better visibility
        const w = r * 1.4 * pulse;
        const h = r * 1.6;

        // Paper body
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(0, -h * 0.6);                          // Nose tip
        ctx.lineTo(w * (1 + flutter), h * 0.3);           // Right wing
        ctx.lineTo(0, h * 0.1);                           // Center notch
        ctx.lineTo(-w * (1 - flutter), h * 0.3);          // Left wing
        ctx.closePath();
        ctx.fill();

        // White contour
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Center fold line (paper crease)
        ctx.strokeStyle = window.Game.ColorUtils.darken(this.color, 0.3);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, -h * 0.5);
        ctx.lineTo(0, h * 0.2);
        ctx.stroke();

        // Highlight on one wing (3D paper effect)
        ctx.fillStyle = window.Game.ColorUtils.lighten(this.color, 0.4);
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.moveTo(0, -h * 0.5);
        ctx.lineTo(w * 0.5 * (1 + flutter), h * 0.1);
        ctx.lineTo(0, 0);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.restore();

        // Center bright spot
        ctx.fillStyle = '#fff';
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

        // Calculate direction for trail
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy) || 1;
        const dirX = this.vx / speed;
        const dirY = this.vy / speed;
        const perpX = -dirY;
        const perpY = dirX;
        const trailLen = Math.min(28, speed * 0.12);

        // === SAME AS ENERGY BOLT: Trail ===
        for (let i = 4; i > 0; i--) {
            const segDist = (i / 4) * trailLen;
            const segAlpha = 0.12 * (5 - i);
            const segWidth = r * (0.25 + (i * 0.12));
            ctx.fillStyle = this.color;
            ctx.globalAlpha = segAlpha;
            ctx.beginPath();
            ctx.moveTo(this.x - dirX * segDist - perpX * segWidth, this.y - dirY * segDist - perpY * segWidth);
            ctx.lineTo(this.x - dirX * (segDist + 8), this.y - dirY * (segDist + 8));
            ctx.lineTo(this.x - dirX * segDist + perpX * segWidth, this.y - dirY * segDist + perpY * segWidth);
            ctx.closePath();
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // === SAME AS ENERGY BOLT: Outer glow ===
        ctx.fillStyle = this.color;
        ctx.globalAlpha = 0.3 * pulse * beatBoost;
        ctx.beginPath();
        ctx.arc(this.x, this.y, r + 6 + (this.beatSynced ? 3 : 0), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // === SAME AS ENERGY BOLT: White ring ===
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(this.x, this.y, r + 3, 0, Math.PI * 2);
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

        // Bottom face (darker, back)
        ctx.fillStyle = window.Game.ColorUtils.darken(this.color, 0.4);
        ctx.beginPath();
        ctx.moveTo(-w + depthOffset, h * 0.3);
        ctx.lineTo(w + depthOffset, h * 0.3);
        ctx.lineTo(topW + depthOffset, -h * 0.5);
        ctx.lineTo(-topW + depthOffset, -h * 0.5);
        ctx.closePath();
        ctx.fill();

        // Main face (front)
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(-w, h * 0.4);           // Bottom left
        ctx.lineTo(w, h * 0.4);            // Bottom right
        ctx.lineTo(topW, -h * 0.4);        // Top right
        ctx.lineTo(-topW, -h * 0.4);       // Top left
        ctx.closePath();
        ctx.fill();

        // White contour
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Top face (lighter, shows during tumble)
        if (Math.cos(tumble) > 0) {
            ctx.fillStyle = window.Game.ColorUtils.lighten(this.color, 0.3);
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

        // Center bright spot
        ctx.fillStyle = '#fff';
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

        // Calculate direction for trail
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy) || 1;
        const dirX = this.vx / speed;
        const dirY = this.vy / speed;
        const perpX = -dirY;
        const perpY = dirX;
        const trailLen = Math.min(28, speed * 0.12);

        // === SAME AS ENERGY BOLT: Trail ===
        for (let i = 4; i > 0; i--) {
            const segDist = (i / 4) * trailLen;
            const segAlpha = 0.12 * (5 - i);
            const segWidth = r * (0.25 + (i * 0.12));
            ctx.fillStyle = this.color;
            ctx.globalAlpha = segAlpha;
            ctx.beginPath();
            ctx.moveTo(this.x - dirX * segDist - perpX * segWidth, this.y - dirY * segDist - perpY * segWidth);
            ctx.lineTo(this.x - dirX * (segDist + 8), this.y - dirY * (segDist + 8));
            ctx.lineTo(this.x - dirX * segDist + perpX * segWidth, this.y - dirY * segDist + perpY * segWidth);
            ctx.closePath();
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // === SAME AS ENERGY BOLT: Outer glow ===
        ctx.fillStyle = this.color;
        ctx.globalAlpha = 0.3 * pulse * beatBoost;
        ctx.beginPath();
        ctx.arc(this.x, this.y, r + 6 + (this.beatSynced ? 3 : 0), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // === SAME AS ENERGY BOLT: White ring ===
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(this.x, this.y, r + 3, 0, Math.PI * 2);
        ctx.stroke();

        // === DIFFERENT: Digital card/chip rectangle ===
        const glitch = Math.random() < 0.08 ? (Math.random() - 0.5) * 4 : 0; // Occasional glitch offset

        ctx.save();
        ctx.translate(this.x + glitch, this.y);

        // Card dimensions (rectangle)
        // v4.0.4: Increased from 1.1/0.8 to 1.25/0.95 for better visibility
        const w = r * 1.25 * pulse;
        const h = r * 0.95 * pulse;

        // Main card body (rounded rectangle)
        ctx.fillStyle = this.color;
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

        // White contour
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Chip square (top-left corner)
        ctx.fillStyle = window.Game.ColorUtils.lighten(this.color, 0.4);
        ctx.fillRect(-w * 0.7, -h * 0.6, w * 0.5, h * 0.7);
        ctx.strokeStyle = window.Game.ColorUtils.darken(this.color, 0.3);
        ctx.lineWidth = 1;
        ctx.strokeRect(-w * 0.7, -h * 0.6, w * 0.5, h * 0.7);

        // Chip circuit lines
        ctx.strokeStyle = window.Game.ColorUtils.darken(this.color, 0.2);
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
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        for (let i = -3; i <= 3; i++) {
            const lineY = i * h * 0.25;
            ctx.beginPath();
            ctx.moveTo(-w * 0.9, lineY);
            ctx.lineTo(w * 0.9, lineY);
            ctx.stroke();
        }

        ctx.restore();

        // Digital pulse at center
        ctx.fillStyle = '#fff';
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

        // Calculate direction for oriented drawing
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy) || 1;
        const dirX = this.vx / speed;
        const dirY = this.vy / speed;
        const perpX = -dirY;
        const perpY = dirX;

        // Trail length based on speed
        const trailLen = Math.min(28, speed * 0.12);

        // Multi-segment fading trail (4 segments for longer trail)
        for (let i = 4; i > 0; i--) {
            const segDist = (i / 4) * trailLen;
            const segAlpha = 0.12 * (5 - i);
            const segWidth = r * (0.25 + (i * 0.12));

            ctx.fillStyle = this.color;
            ctx.globalAlpha = segAlpha;
            ctx.beginPath();
            ctx.moveTo(
                this.x - dirX * segDist - perpX * segWidth,
                this.y - dirY * segDist - perpY * segWidth
            );
            ctx.lineTo(
                this.x - dirX * (segDist + 8),
                this.y - dirY * (segDist + 8)
            );
            ctx.lineTo(
                this.x - dirX * segDist + perpX * segWidth,
                this.y - dirY * segDist + perpY * segWidth
            );
            ctx.closePath();
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Outer danger glow
        // Beat-synced bullets have enhanced glow
        ctx.fillStyle = this.color;
        ctx.globalAlpha = 0.3 * pulse * beatBoost;
        ctx.beginPath();
        ctx.arc(this.x, this.y, r + 6 + (this.beatSynced ? 3 : 0), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Secondary white ring for visibility
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(this.x, this.y, r + 3, 0, Math.PI * 2);
        ctx.stroke();

        // Main bolt body
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, r * pulse, 0, Math.PI * 2);
        ctx.fill();

        // White contour
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Inner colored ring
        ctx.fillStyle = window.Game.ColorUtils.lighten(this.color, 0.3);
        ctx.beginPath();
        ctx.arc(this.x, this.y, r * 0.65, 0, Math.PI * 2);
        ctx.fill();

        // Bright white core center
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, r * 0.35, 0, Math.PI * 2);
        ctx.fill();

        // Inner core highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.beginPath();
        ctx.arc(this.x - r * 0.1, this.y - r * 0.1, r * 0.15, 0, Math.PI * 2);
        ctx.fill();
    }

}

// Attach to namespace
window.Game.Bullet = Bullet;

// Static Pool - Needs ObjectPool to be loaded first!
// We rely on index.html ordering: ObjectPool.js loaded before Bullet.js
if (window.Game.ObjectPool) {
    window.Game.Bullet.Pool = new window.Game.ObjectPool(() => new Bullet(0, 0, 0, 0, '#fff', 0, 0, false), 50);
} else {
    console.error("ObjectPool not found! Bullet pooling disabled.");
}
