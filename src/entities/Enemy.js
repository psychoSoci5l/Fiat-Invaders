window.Game = window.Game || {};

class Enemy extends window.Game.Entity {
    constructor(x, y, typeConf) {
        super(x, y, 50, 50); // Fixed size for now as per legacy spawn logic

        this.baseY = y;
        this.symbol = typeConf.s;
        this.color = typeConf.c;
        this.hp = typeConf.hp;
        this.scoreVal = typeConf.val;

        this.active = true;
        this.fireTimer = Math.random() * 10 + 2; // AI FIX: Desynchronize start (2-12s)
    }

    attemptFire(dt, target) {
        this.fireTimer -= dt;
        if (this.fireTimer <= 0) {
            const D = window.Game.DIFFICULTY;
            // 1. ALWAYS Reset Timer
            this.fireTimer = Math.random() * D.FIRE_RATE_VAR + D.FIRE_RATE_BASE;

            // 2. Guard: If target invalid, just exit (but timer IS reset)
            if (!target || target.hp <= 0) return null;

            // 3. Aiming Logic
            let vx = 0;
            let vy = D.PROJ_SPEED;

            if (target) {
                const dx = target.x - this.x;
                const dy = target.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 0) {
                    vx = (dx / dist) * D.PROJ_SPEED;
                    vy = (dy / dist) * D.PROJ_SPEED;
                }
            } else {
                vy = D.PROJ_SPEED;
            }

            return {
                x: this.x,
                y: this.y + 25,
                vx: vx,
                vy: vy,
                color: '#fff',
                w: 6,
                h: 15
            };
        }
        return null;
    }

    update(dt, globalTime, wavePattern, gridSpeed, gridDir) {
        // SAFETY FIX: Ensure Game Global exists
        if (!window.Game) return;

        // Horizontal Grid Move
        this.x += gridSpeed * gridDir * dt;

        // Vertical / Pattern Move
        if (wavePattern === 'V_SHAPE') {
            this.y = this.baseY + Math.sin(globalTime * 3) * 20;
        } else if (wavePattern === 'SINE_WAVE') {
            // Complex snake motion
            this.y = this.baseY + Math.sin(globalTime * 4 + (this.x / 100)) * 40;
        } else if (wavePattern === 'COLUMNS') {
            this.y = this.baseY; // Static columns
        } else {
            this.y = this.baseY;
        }

        // Rotation (optional, for fun)
        if (wavePattern === 'SINE_WAVE') {
            this.rotation = Math.cos(globalTime * 4 + (this.x / 100)) * 0.2;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // No Neon Glow (Flat Design)
        // ctx.shadowBlur = 15; 
        // ctx.shadowColor = this.color;

        const G = window.Game;
        let spriteDef = null;

        // Map Symbol to Sprite Definition
        switch (this.symbol) {
            case '$': spriteDef = G.SPRITES.DOLLAR; break;
            case '€': spriteDef = G.SPRITES.EURO; break;
            case '£': spriteDef = G.SPRITES.POUND; break;
            case '¥': spriteDef = G.SPRITES.YEN; break;
            case '₿': spriteDef = G.SPRITES.BTC; break;
            case 'Ξ': spriteDef = G.SPRITES.ETH; break;
        }

        let img = null;
        if (G.images && spriteDef) {
            if (spriteDef.sheet === 'ENEMIES') img = G.images.ENEMIES;
        }

        if (img && img.complete) {
            // Draw Sprite
            const size = 50; // Standard size
            ctx.drawImage(
                img,
                spriteDef.x, spriteDef.y, spriteDef.w, spriteDef.h,
                -size / 2, -size / 2, size, size
            );
        } else {
            // Fallback Shape
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 2;
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.beginPath();
            ctx.rect(-15, -15, 30, 30);
            ctx.fill();
            ctx.stroke();

            // Text Fallback
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 16px Courier New';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.symbol, 0, 0);
        }

        ctx.restore();
    }
}

window.Game.Enemy = Enemy;
