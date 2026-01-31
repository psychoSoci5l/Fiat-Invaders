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
    }

    update(dt) {
        super.update(dt);
        // Bounds check (vertical only for now)
        if (this.y < -50 || this.y > 850) {
            this.markedForDeletion = true;
        }
    }

    draw(ctx) {
        const isEnemy = this.vy > 0; // Enemy bullets go down

        if (isEnemy) {
            // Enemy bullet: Energy orb with glow
            const r = this.width || 5;
            const angle = Math.atan2(-this.vy, -this.vx);

            // Speed lines (3 lines trailing behind) - cell-shaded style
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.6;
            for (let i = 0; i < 3; i++) {
                const offset = (i - 1) * 4; // -4, 0, 4 perpendicular offset
                const perpX = Math.cos(angle + Math.PI/2) * offset;
                const perpY = Math.sin(angle + Math.PI/2) * offset;
                const startDist = 8 + i * 3;
                const endDist = 18 + i * 4;
                ctx.beginPath();
                ctx.moveTo(
                    this.x + Math.cos(angle) * startDist + perpX,
                    this.y + Math.sin(angle) * startDist + perpY
                );
                ctx.lineTo(
                    this.x + Math.cos(angle) * endDist + perpX,
                    this.y + Math.sin(angle) * endDist + perpY
                );
                ctx.stroke();
            }
            ctx.globalAlpha = 1;

            // Outer glow
            ctx.fillStyle = this.color;
            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, r + 4, 0, Math.PI * 2);
            ctx.fill();

            // Core with bold outline
            ctx.globalAlpha = 1;
            ctx.fillStyle = this.color;
            ctx.strokeStyle = '#111';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Inner bright center
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(this.x, this.y, r * 0.4, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Player bullet
            ctx.fillStyle = this.color;

            if (this.height > 20) {
                // Speed lines for laser - cell-shaded style
                ctx.strokeStyle = this.color;
                ctx.lineWidth = 2;
                ctx.globalAlpha = 0.4;
                for (let i = 0; i < 4; i++) {
                    const offsetX = (i - 1.5) * 6;
                    ctx.beginPath();
                    ctx.moveTo(this.x + offsetX, this.y + this.height + 5);
                    ctx.lineTo(this.x + offsetX, this.y + this.height + 15 + i * 2);
                    ctx.stroke();
                }
                ctx.globalAlpha = 1;

                // Laser Beam Style - bold cell-shaded outline
                ctx.strokeStyle = '#111';
                ctx.lineWidth = 2;
                ctx.fillRect(this.x - this.width / 2, this.y, this.width, this.height);
                ctx.strokeRect(this.x - this.width / 2, this.y, this.width, this.height);
            } else {
                // Speed lines behind bullet - cell-shaded style
                ctx.strokeStyle = this.color;
                ctx.lineWidth = 2;
                ctx.globalAlpha = 0.5;
                for (let i = 0; i < 3; i++) {
                    const offsetX = (i - 1) * 5; // -5, 0, 5
                    const startY = this.y + 12 + i * 2;
                    const endY = this.y + 22 + i * 3;
                    ctx.beginPath();
                    ctx.moveTo(this.x + offsetX, startY);
                    ctx.lineTo(this.x + offsetX, endY);
                    ctx.stroke();
                }
                ctx.globalAlpha = 1;

                // Bullet with upward trail - bold cell-shaded outline
                ctx.strokeStyle = '#111';
                ctx.lineWidth = 2;

                ctx.beginPath();
                ctx.arc(this.x, this.y, this.width, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                // Trail pointing up (behind the bullet)
                ctx.beginPath();
                ctx.moveTo(this.x - this.width * 0.6, this.y);
                ctx.lineTo(this.x, this.y + this.height);
                ctx.lineTo(this.x + this.width * 0.6, this.y);
                ctx.fill();
                ctx.stroke();
            }
        }
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
