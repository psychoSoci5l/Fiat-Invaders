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
        this.grazed = false; // Graze tracking (Ikeda Rule 3)
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
        this.grazed = false; // Graze tracking (Ikeda Rule 3)
    }

    update(dt) {
        super.update(dt);
        this.age += dt; // Track age for animations
        // Bounds check (vertical only for now)
        if (this.y < -50 || this.y > 850) {
            this.markedForDeletion = true;
        }
    }

    draw(ctx) {
        const isEnemy = this.vy > 0; // Enemy bullets go down

        if (isEnemy) {
            // Enemy bullet: Aggressive Energy Bolt
            this.drawEnemyBolt(ctx);
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
                default: // NORMAL
                    this.drawNormalBullet(ctx, pulse);
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
    // ENEMY: Aggressive Energy Bolt - Bullet Hell Style (Ikeda Rule 4)
    // High contrast, readable even with screen full of projectiles
    // ═══════════════════════════════════════════════════════════════════
    drawEnemyBolt(ctx) {
        const r = (this.width || 5) * 1.8;  // Larger for bullet hell visibility
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

        // Outer danger glow - LARGER (Ikeda Rule 4: bigger glow)
        ctx.fillStyle = this.color;
        ctx.globalAlpha = 0.3 * pulse;
        ctx.beginPath();
        ctx.arc(this.x, this.y, r + 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Secondary white ring (Ikeda Rule 4: white secondary ring)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(this.x, this.y, r + 3, 0, Math.PI * 2);
        ctx.stroke();

        // Main bolt body - circular for bullet hell style
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, r * pulse, 0, Math.PI * 2);
        ctx.fill();

        // White contour on bullet (Ikeda Rule 4)
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Inner colored ring
        ctx.fillStyle = this.lightenColorSimple(this.color, 0.3);
        ctx.beginPath();
        ctx.arc(this.x, this.y, r * 0.65, 0, Math.PI * 2);
        ctx.fill();

        // Bright white core center (Ikeda Rule 4)
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

    // Simple color lightening for enemy bullets (no hex parsing)
    lightenColorSimple(color, amount) {
        // Handle hex colors
        if (color.startsWith('#')) {
            const num = parseInt(color.slice(1), 16);
            const r = Math.min(255, (num >> 16) + Math.floor(255 * amount));
            const g = Math.min(255, ((num >> 8) & 0xFF) + Math.floor(255 * amount));
            const b = Math.min(255, (num & 0xFF) + Math.floor(255 * amount));
            return `rgb(${r},${g},${b})`;
        }
        return '#fff'; // Fallback
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
