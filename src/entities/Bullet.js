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
        ctx.save();
        ctx.translate(this.x, this.y);

        const G = window.Game;
        const spriteDef = this.isHodl ? G.SPRITES.BULLET_PLAYER : G.SPRITES.BULLET_ENEMY;

        let img = null;
        if (G.images && spriteDef) {
            // Determine which sheet to use
            if (spriteDef.sheet === 'BOSS_BULLETS') img = G.images.BOSS_BULLETS;
            else if (spriteDef.sheet === 'ENEMIES') img = G.images.ENEMIES;
        }

        if (img && img.complete) {
            // Draw from Atlas
            // We draw the candle centered
            // The candle sprite is tall, we scale it to bullet dimensions
            const w = this.width || 10;
            const h = this.height || 20;

            ctx.drawImage(
                img,
                spriteDef.x, spriteDef.y, spriteDef.w, spriteDef.h, // Source from Atlas
                -w / 2, -h / 2, w, h // Dest
            );
        } else {
            // Fallback (Logic from before)
            ctx.shadowBlur = 10;
            ctx.shadowColor = this.color;
            ctx.fillStyle = this.color;

            if (this.height > 20) {
                ctx.fillRect(-this.width / 2, 0, this.width, this.height);
            } else {
                ctx.beginPath();
                ctx.arc(0, 0, this.width, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.restore();
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
