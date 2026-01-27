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

        // SAFETY FIX: Global Safety
        if (!window.Game) return null;

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

            // Shake Effect (Visual only, don't mutate active X/Y permanently to avoid drift)
            // Actually, for simplicity, we just jitter draw position or accept tiny drift.
            // Let's jitter in draw() to be safe? No, modifying x/y here is easier for collision.
            // We'll just reset Y to targetY + offset each frame.
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
            // SAFETY FIX: Guard Clause for Player
            if (!player || player.hp <= 0) return null;
            return this.attack(player);
        }
        return null;
    }

    printMoney() {
        const G = window.Game;
        // SAFETY FIX: Ensure enemies array exists
        if (G.enemies) {

            // Spawn 2 Minions (Dollars)
            const typeDollars = G.FIAT_TYPES[0]; // Assuming 0 is $, check config used in WaveManager but WaveManager uses hardcoded indices usually.
            // Actually WaveManager uses G.FIAT_TYPES[typeIdx]. let's assume index 0 or find '$'.
            // In this specific codebase, usually [0]=$ [1]=€ ... 
            // Let's safe pick index 0.

            // Left Minion
            const e1 = new G.Enemy(this.x - 30, this.y + 50, G.FIAT_TYPES[0]);
            e1.isMinion = true;
            G.enemies.push(e1);

            // Right Minion
            const e2 = new G.Enemy(this.x + this.width + 30, this.y + 50, G.FIAT_TYPES[0]);
            e2.isMinion = true;
            G.enemies.push(e2);

            if (G.Audio) G.Audio.play('coin');
        }
    }

    attack(player) {
        const bullets = [];
        const G = window.Game;

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
        ctx.save();
        ctx.translate(this.x, this.y);

        // Shadows
        // Optimize: Disable shadow if hit flashing
        if (this.hitTimer <= 0) {
            ctx.shadowBlur = 20;
            ctx.shadowColor = (this.phaseState === 'RAGE') ? '#ff0000' : '#00ff00';
        }

        // Render Asset using SPRITES
        const G = window.Game;
        const spriteDef = G.SPRITES ? G.SPRITES.BOSS : null;
        let img = null;
        if (spriteDef && G.images) {
            if (spriteDef.sheet === 'BOSS_BULLETS') img = G.images.BOSS_BULLETS;
        }

        if (img && img.complete) {
            ctx.drawImage(
                img,
                spriteDef.x, spriteDef.y, spriteDef.w, spriteDef.h,
                -10, -10, this.width + 20, this.height + 20
            );

            // Safe Hit Flash using Composite Operation (Crash proof)
            if (this.hitTimer > 0) {
                ctx.save();
                ctx.globalCompositeOperation = 'source-atop';
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(-10, -10, this.width + 20, this.height + 20);
                ctx.restore();
            }
        } else {
            // Fallback: Temple Graphics
            ctx.fillStyle = (this.hitTimer > 0) ? '#fff' : 'rgba(20, 20, 20, 0.9)';

            // Visual Filter for Rage Mode
            if (this.phaseState === 'RAGE' && this.hitTimer <= 0) {
                ctx.fillStyle = '#4a0000'; // Dark Red base
            }

            ctx.beginPath();
            ctx.moveTo(0, 20); ctx.lineTo(this.width / 2, 0); ctx.lineTo(this.width, 20); ctx.lineTo(0, 20); // Roof
            ctx.rect(5, 20, 10, this.height - 25); // Pillar L
            ctx.rect(this.width - 15, 20, 10, this.height - 25); // Pillar R
            ctx.rect(this.width / 2 - 5, 20, 10, this.height - 25); // Pillar C
            ctx.rect(0, this.height - 5, this.width, 5); // Base
            ctx.fill();

            // Text Label
            ctx.shadowBlur = 0;
            ctx.fillStyle = (this.hitTimer > 0) ? '#000' : '#fff';
            ctx.font = 'bold 12px Courier New';
            ctx.textAlign = 'center';
            ctx.fillText(this.phaseState === 'NORMAL' ? "FED" : "PANIC", this.width / 2, 40);
        }

        // HP Bar
        const hpPct = Math.max(0, this.hp / this.maxHp);
        ctx.fillStyle = '#550000';
        ctx.fillRect(0, -20, this.width, 8);
        ctx.fillStyle = (hpPct > 0.5) ? '#00ff00' : '#ff0000';
        ctx.fillRect(0, -20, this.width * hpPct, 8);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, -20, this.width, 8);

        ctx.restore();
    }
}

window.Game.Boss = Boss;
