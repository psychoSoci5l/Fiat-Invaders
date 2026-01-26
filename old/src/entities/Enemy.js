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
        this.fireTimer = Math.random() * 2 + 1; // Random start delay
    }

    attemptFire(dt, target) {
        this.fireTimer -= dt;
        if (this.fireTimer <= 0) {
            this.fireTimer = Math.random() * 3 + 2;

            // Aiming Logic
            let vx = 0;
            let vy = 300;

            if (target) {
                const dx = target.x - this.x;
                const dy = target.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 0) {
                    vx = (dx / dist) * 300;
                    vy = (dy / dist) * 300;
                }
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

        // Neon Glow
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;

        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; // Semi-transparent fill

        ctx.beginPath();
        switch (this.symbol) {
            case '¥': // Square
                ctx.rect(-15, -15, 30, 30);
                break;
            case '€': // Circle
                ctx.arc(0, 0, 15, 0, Math.PI * 2);
                break;
            case '£': // Diamond
                ctx.moveTo(0, -20);
                ctx.lineTo(15, 0);
                ctx.lineTo(0, 20);
                ctx.lineTo(-15, 0);
                ctx.closePath();
                break;
            case '$': // Hexagon
                for (let i = 0; i < 6; i++) {
                    const angle = (Math.PI / 3) * i;
                    const hx = Math.cos(angle) * 20;
                    const hy = Math.sin(angle) * 20;
                    if (i === 0) ctx.moveTo(hx, hy);
                    else ctx.lineTo(hx, hy);
                }
                ctx.closePath();
                break;
            default:
                ctx.rect(-15, -15, 30, 30);
        }
        ctx.fill();
        ctx.stroke();

        // Inner Symbol
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 0; // Crisp text
        ctx.font = 'bold 16px Courier New';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.symbol, 0, 0); // Symbol inside shape

        ctx.restore();
    }
}

window.Game.Enemy = Enemy;
