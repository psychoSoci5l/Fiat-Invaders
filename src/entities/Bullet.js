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
            // Enemy bullet: Simplified - core with outline + inner dot
            const r = this.width || 5;

            // Core with bold outline (single arc, fill+stroke)
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
            ctx.arc(this.x, this.y, r * 0.35, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Player bullet - simplified
            ctx.fillStyle = this.color;
            ctx.strokeStyle = '#111';
            ctx.lineWidth = 2;

            if (this.height > 20) {
                // Laser Beam Style
                ctx.fillRect(this.x - this.width / 2, this.y, this.width, this.height);
                ctx.strokeRect(this.x - this.width / 2, this.y, this.width, this.height);
            } else {
                // Bullet with simple trail
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.width, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                // Simple trail (single triangle, no separate stroke)
                ctx.beginPath();
                ctx.moveTo(this.x - this.width * 0.5, this.y);
                ctx.lineTo(this.x, this.y + this.height);
                ctx.lineTo(this.x + this.width * 0.5, this.y);
                ctx.closePath();
                ctx.fill();
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
