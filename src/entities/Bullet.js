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
        // Optimized: no save/restore, no shadowBlur
        ctx.fillStyle = this.color;

        if (this.height > 20) {
            // Laser Beam Style
            ctx.fillRect(this.x - this.width / 2, this.y, this.width, this.height);
        } else {
            // Simple circle + triangle trail (no shadows)
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.width, 0, Math.PI * 2);
            ctx.fill();

            // Trail
            ctx.beginPath();
            ctx.moveTo(this.x - this.width / 2, this.y);
            ctx.lineTo(this.x, this.y - this.height);
            ctx.lineTo(this.x + this.width / 2, this.y);
            ctx.fill();
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
