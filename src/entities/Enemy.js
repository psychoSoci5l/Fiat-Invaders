window.Game = window.Game || {};

class Enemy extends window.Game.Entity {
    constructor(x, y, typeConf) {
        super(x, y, 50, 50); // Fixed size for now as per legacy spawn logic

        this.baseY = y;
        this.symbol = typeConf.s;
        this.color = typeConf.c;
        this.hp = typeConf.hp;
        this.scoreVal = typeConf.val;
        this.fireMin = typeConf.fireMin || 2.5;
        this.fireMax = typeConf.fireMax || 4.0;
        this.aimSpread = typeConf.aimSpread || 0.18;
        this.pattern = typeConf.pattern || 'SINGLE';
        this.burstCount = 0;
        this.burstTimer = 0;
        this.telegraphTimer = 0;
        this.telegraphLead = 0.12;

        this.active = true;
        this.fireTimer = Math.random() * 3 + 1.5; // Wider random start delay (1.5-4.5s)
    }

    attemptFire(dt, target, rateMult = 1, bulletSpeed = 300, aimSpreadMult = 1, allowFire = true) {
        this.fireTimer -= dt * rateMult;
        this.burstTimer -= dt * rateMult;
        if (this.telegraphTimer > 0) this.telegraphTimer -= dt;

        if (!allowFire) return null;

        // Handle queued burst shots
        if (this.pattern === 'BURST' && this.burstCount > 0 && this.burstTimer <= 0) {
            this.burstTimer = 0.12;
            this.burstCount--;
            return this.buildBullet(target, bulletSpeed, aimSpreadMult);
        }

        if (this.fireTimer <= 0) {
            this.fireTimer = this.fireMin + Math.random() * (this.fireMax - this.fireMin);
            if (this.pattern === 'BURST') this.telegraphLead = 0.16;
            else if (this.pattern === 'DOUBLE') this.telegraphLead = 0.13;
            else this.telegraphLead = 0.10;
            const jitter = (Math.random() * 0.04) - 0.02;
            this.telegraphTimer = Math.max(0.06, this.telegraphLead + jitter);
            if (this.pattern === 'BURST') {
                this.burstCount = 2;
                this.burstTimer = Math.max(0.04, 0.06 + ((Math.random() * 0.02) - 0.01));
            }
            if (window.Game && window.Game.Audio) window.Game.Audio.play('enemyTelegraph');

            if (this.pattern === 'DOUBLE') {
                const b1 = this.buildBullet(target, bulletSpeed, aimSpreadMult, -0.08);
                const b2 = this.buildBullet(target, bulletSpeed, aimSpreadMult, 0.08);
                return [b1, b2];
            }

            return this.buildBullet(target, bulletSpeed, aimSpreadMult);
        }
        return null;
    }

    buildBullet(target, bulletSpeed, aimSpreadMult, extraAngle = 0) {
        // Aiming Logic
        let vx = 0;
        let vy = bulletSpeed;

        if (target) {
            const dx = target.x - this.x;
            const dy = target.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            let angle = Math.atan2(dy, dx);
            const spread = this.aimSpread * aimSpreadMult;
            angle += (Math.random() * 2 - 1) * spread + extraAngle;
            vx = Math.cos(angle) * bulletSpeed;
            vy = Math.sin(angle) * bulletSpeed;
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

    update(dt, globalTime, wavePattern, gridSpeed, gridDir) {
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
        const x = this.x;
        const y = this.y;

        // Optimized: minimal save/restore, no shadowBlur
        // Body
        ctx.fillStyle = this.color;
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Feet (combined path)
        ctx.beginPath();
        ctx.rect(x - 14, y + 14, 10, 6);
        ctx.rect(x + 4, y + 14, 10, 6);
        ctx.fill();
        ctx.stroke();

        // Eyes - white
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(x - 6, y - 4, 4, 0, Math.PI * 2);
        ctx.arc(x + 6, y - 4, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Pupils
        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.arc(x - 6, y - 4, 2, 0, Math.PI * 2);
        ctx.arc(x + 6, y - 4, 2, 0, Math.PI * 2);
        ctx.fill();

        // Symbol
        ctx.font = 'bold 14px Courier New';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.symbol, x, y + 6);

        // Telegraph indicator (only when needed)
        if (this.telegraphTimer > 0) {
            const mult = (this.pattern === 'BURST') ? 5 : (this.pattern === 'DOUBLE' ? 5.5 : 6);
            ctx.globalAlpha = Math.min(1, this.telegraphTimer * mult);
            ctx.strokeStyle = (this.pattern === 'BURST') ? '#6aa9ff' : (this.pattern === 'DOUBLE' ? '#2ecc71' : '#ffffff');
            ctx.lineWidth = (this.pattern === 'BURST') ? 3 : 2;
            ctx.beginPath();
            ctx.arc(x, y, 28, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1; // Reset
        }
    }
}

window.Game.Enemy = Enemy;
