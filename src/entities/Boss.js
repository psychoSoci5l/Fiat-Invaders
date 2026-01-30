window.Game = window.Game || {};

class Boss extends window.Game.Entity {
    constructor(gameWidth, gameHeight) {
        super(gameWidth / 2 - 40, -100, 80, 80); // Start off-screen
        this.gameWidth = gameWidth;
        this.gameHeight = gameHeight;

        this.maxHp = 500;
        this.hp = 500;
        this.active = true;
        this.phaseState = 'NORMAL'; // 'NORMAL' | 'RAGE'

        this.targetY = 100; // Drop to this Y
        this.dir = 1;
        this.moveSpeed = 80;

        this.fireTimer = 0;
        this.printTimer = 0;
        this.hitTimer = 0;
        this.angle = 0;
    }

    damage(amount) {
        this.hp -= amount;
        this.hitTimer = 0.1; // Flash for 0.1s
    }

    update(dt, player) {
        // Visual Hit Timer logic
        if (this.hitTimer > 0) this.hitTimer -= dt;

        // 1. Entrance Animation (Drop down)
        if (this.y < this.targetY) {
            this.y += 100 * dt;
            // If we haven't reached target yet, don't attack or move laterally
            return null;
        }

        // 2. Phase Transition Trigger ( < 50% HP )
        const hpPct = this.hp / this.maxHp;
        if (hpPct < 0.5 && this.phaseState !== 'RAGE') {
            this.phaseState = 'RAGE';
            this.moveSpeed = 0; // Stop linear movement
            if (window.Game.Audio) window.Game.Audio.play('bossSpawn'); // Roar
        }

        // 3. Movement Logic
        if (this.phaseState === 'NORMAL') {
            // Patrol Left/Right
            this.x += this.moveSpeed * this.dir * dt;
            if (this.x < 20 || this.x + this.width > this.gameWidth - 20) {
                this.dir *= -1;
            }
        } else {
            // RAGE: Center & Shake
            const centerX = this.gameWidth / 2 - this.width / 2;
            const dx = centerX - this.x;
            this.x += dx * 2 * dt; // Lerp to center

            // Shake Effect
            this.y = this.targetY + (Math.random() - 0.5) * 5;
            this.x = this.x + (Math.random() - 0.5) * 5;

            // Money Printer (Spawn Minions)
            this.printTimer -= dt;
            if (this.printTimer <= 0) {
                this.printMoney();
                this.printTimer = 2.5; // Every 2.5s
            }
        }

        // 4. Attack Logic
        this.fireTimer -= dt;
        if (this.fireTimer <= 0) {
            return this.attack(player);
        }
        return null;
    }

    printMoney() {
        const G = window.Game;
        if (!G.enemies) return;

        // Spawn 2 Minions (Dollars)
        G.enemies.push(new G.Enemy(this.x - 30, this.y + 50, G.FIAT_TYPES[3]));
        G.enemies.push(new G.Enemy(this.x + this.width + 30, this.y + 50, G.FIAT_TYPES[3]));

        if (G.Audio) G.Audio.play('coin');
    }

    attack(player) {
        const bullets = [];

        if (this.phaseState === 'NORMAL') {
            // Standard Pattern: 2 Green Lasers
            this.fireTimer = 0.8;
            for (let i = -1; i <= 1; i += 2) {
                bullets.push({
                    x: this.x + this.width / 2 + (i * 40),
                    y: this.y + this.height,
                    vx: 0, vy: 300,
                    color: '#00ff00', w: 8, h: 20
                });
            }
        } else {
            // RAGE: Spiral Red Fire
            this.fireTimer = 0.15;
            this.angle += 0.4;
            bullets.push({
                x: this.x + this.width / 2,
                y: this.y + this.height / 2,
                vx: Math.cos(this.angle) * 400,
                vy: Math.sin(this.angle) * 400,
                color: '#ff0000',
                w: 12, h: 12
            });
            bullets.push({
                x: this.x + this.width / 2,
                y: this.y + this.height / 2,
                vx: Math.cos(this.angle + Math.PI) * 400,
                vy: Math.sin(this.angle + Math.PI) * 400,
                color: '#ff0000',
                w: 12, h: 12
            });
        }
        return bullets;
    }

    draw(ctx) {
        const x = this.x;
        const y = this.y;
        const w = this.width;
        const h = this.height;

        // Optimized: no shadowBlur
        // Vault body
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#111';
        ctx.fillStyle = (this.hitTimer > 0) ? '#f0f0f0' : '#6b6b6b';
        ctx.beginPath();
        ctx.rect(x, y + 10, w, h - 10);
        ctx.fill();
        ctx.stroke();

        // Face panel
        ctx.fillStyle = '#3a3a3a';
        ctx.beginPath();
        ctx.rect(x + 12, y + 20, w - 24, 36);
        ctx.fill();
        ctx.stroke();

        // Eyes - white
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(x + w / 2 - 12, y + 34, 5, 0, Math.PI * 2);
        ctx.arc(x + w / 2 + 12, y + 34, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Pupils
        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.arc(x + w / 2 - 12, y + 34, 2, 0, Math.PI * 2);
        ctx.arc(x + w / 2 + 12, y + 34, 2, 0, Math.PI * 2);
        ctx.fill();

        // Vault dial
        ctx.fillStyle = '#d9d9d9';
        ctx.beginPath();
        ctx.arc(x + w / 2, y + 64, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // HP Bar
        const hpPct = Math.max(0, this.hp / this.maxHp);
        ctx.fillStyle = '#550000';
        ctx.fillRect(x, y - 20, w, 8);
        ctx.fillStyle = (hpPct > 0.5) ? '#00ff00' : '#ff0000';
        ctx.fillRect(x, y - 20, w * hpPct, 8);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y - 20, w, 8);
    }
}

window.Game.Boss = Boss;
