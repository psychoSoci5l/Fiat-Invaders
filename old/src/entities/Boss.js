window.Game = window.Game || {};

class Boss extends window.Game.Entity {
    constructor(gameWidth, gameHeight) {
        super(gameWidth / 2 - 40, -100, 80, 80); // Start off-screen
        this.gameWidth = gameWidth;
        this.gameHeight = gameHeight;

        this.maxHp = 500;
        this.hp = 500;
        this.active = true;
        this.phase = 1;

        this.targetY = 100; // Drop to this Y
        this.dir = 1;
        this.moveSpeed = 80;

        this.fireTimer = 0;
        this.angle = 0; // For spiral attacks
    }

    update(dt, player) {
        // Entrance Interp
        if (this.y < this.targetY) {
            this.y += 100 * dt;
            return null;
        }

        // Horizontal Movement
        this.x += this.moveSpeed * this.dir * dt;
        if (this.x < 20 || this.x + this.width > this.gameWidth - 20) {
            this.dir *= -1;
        }

        // Determine Phase
        const hpPct = this.hp / this.maxHp;
        if (hpPct > 0.6) this.phase = 1;      // Money Printer
        else if (hpPct > 0.3) this.phase = 2; // Rate Hike
        else this.phase = 3;                  // Hyperinflation

        this.fireTimer -= dt;
        if (this.fireTimer <= 0) {
            return this.attack(player);
        }
        return null; // No fire this frame
    }

    attack(player) {
        const bullets = [];
        const G = window.Game;

        if (this.phase === 1) {
            // PHASE 1: MONEY PRINTER (Spray)
            this.fireTimer = 0.5;
            for (let i = -1; i <= 1; i++) {
                bullets.push({
                    x: this.x + this.width / 2,
                    y: this.y + this.height,
                    vx: i * 150,
                    vy: 300,
                    color: '#00ff00', // Money Green
                    w: 8, h: 20
                });
            }
        } else if (this.phase === 2) {
            // PHASE 2: RATE HIKE (Fast Laser)
            this.fireTimer = 1.0;
            bullets.push({
                x: this.x + this.width / 2,
                y: this.y + this.height,
                vx: 0,
                vy: 600, // FAST
                color: '#ff0000', // Red
                w: 12, h: 40
            });
            // Flanking shots
            bullets.push({ x: this.x, y: this.y + 40, vx: -50, vy: 400, color: '#ff0000', w: 6, h: 20 });
            bullets.push({ x: this.x + this.width, y: this.y + 40, vx: 50, vy: 400, color: '#ff0000', w: 6, h: 20 });
        } else {
            // PHASE 3: HYPERINFLATION (Spiral)
            this.fireTimer = 0.1; // Rapid fire
            this.angle += 0.3;
            bullets.push({
                x: this.x + this.width / 2,
                y: this.y + this.height / 2,
                vx: Math.cos(this.angle) * 300,
                vy: Math.sin(this.angle) * 300,
                color: '#FFD700', // Gold
                w: 10, h: 10
            });
            bullets.push({
                x: this.x + this.width / 2,
                y: this.y + this.height / 2,
                vx: Math.cos(this.angle + Math.PI) * 300,
                vy: Math.sin(this.angle + Math.PI) * 300,
                color: '#FFD700',
                w: 10, h: 10
            });
        }
        return bullets;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // Neon Glow depends on HP/Phase
        ctx.shadowBlur = 20;
        ctx.shadowColor = (this.phase === 3) ? '#FFD700' : (this.phase === 2 ? '#ff0000' : '#00ff00');
        ctx.strokeStyle = ctx.shadowColor;
        ctx.lineWidth = 3;
        ctx.fillStyle = 'rgba(0,0,0,0.8)';

        // THE CENTRAL BANK TEMPLE
        ctx.beginPath();
        // Roof (Pediment)
        ctx.moveTo(0, 20);
        ctx.lineTo(this.width / 2, 0);
        ctx.lineTo(this.width, 20);
        ctx.lineTo(0, 20);

        // Pillars
        ctx.rect(5, 20, 10, this.height - 25); // Left
        ctx.rect(this.width - 15, 20, 10, this.height - 25); // Right
        ctx.rect(this.width / 2 - 5, 20, 10, this.height - 25); // Center

        // Base
        ctx.rect(0, this.height - 5, this.width, 5);

        ctx.fill();
        ctx.stroke();

        // Label
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText(this.phase === 1 ? "FED" : (this.phase === 2 ? "HIKE" : "PANIC"), this.width / 2, 40);

        // HP Bar (Above)
        const hpPct = this.hp / this.maxHp;
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(0, -15, this.width, 5);
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(0, -15, this.width * hpPct, 5);

        ctx.restore();
    }
}

window.Game.Boss = Boss;
