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

        // Pre-assign Image
        const G = window.Game;
        let key = 'dollar'; // Default
        switch (typeConf.s) {
            case '$': key = 'dollar'; break;
            case '€': key = 'euro'; break;
            case '£': key = 'pound'; break;
            case '¥': key = 'yen'; break;
            case '₿': key = 'btc'; break;
            case 'Ξ': key = 'eth'; break;
        }
        this.image = (G.images) ? G.images[key] : null;
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
        if (!this.image) return; // Se l'immagine non c'è, non disegnare nulla

        ctx.save();
        ctx.translate(this.x, this.y);

        // Pulisci stili residui
        ctx.shadowBlur = 0;
        ctx.lineWidth = 0;

        // DISEGNA SOLO L'IMMAGINE
        ctx.drawImage(this.image, -25, -25, 50, 50);
        ctx.restore();
    }
}

window.Game.Enemy = Enemy;
