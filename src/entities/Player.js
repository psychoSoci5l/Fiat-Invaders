window.Game = window.Game || {};

class Player extends window.Game.Entity {
    constructor(gameWidth, gameHeight) {
        super(gameWidth / 2, gameHeight - 80, 30, 30);
        this.gameWidth = gameWidth;
        this.gameHeight = gameHeight;

        // Defaults
        this.type = 'BTC';
        this.stats = window.Game.SHIPS['BTC'];

        // State
        this.weapon = 'NORMAL';
        this.weaponTimer = 0;
        this.weaponLevel = 1;
        this.cooldown = 0;

        this.shieldActive = false;
        this.shieldTimer = 0;
        this.shieldCooldown = 0;

        this.beastMode = 0;
        this.hp = 3;
        this.invulnTimer = 0;
        this.rapidFireTimer = 0; // New Timer
    }

    configure(type) {
        this.type = type;
        this.stats = window.Game.SHIPS[type];
        this.maxHp = this.stats.hp || 3; // Store Max
        this.hp = this.maxHp;
        this.resetState();
    }

    resetState() {
        this.x = this.gameWidth / 2;
        this.y = this.gameHeight - 160; // Lifted for better visibility
        this.weapon = 'NORMAL';
        this.weaponLevel = 1;
        this.shieldActive = false;
        this.shieldCooldown = 0;
        this.invulnTimer = 0;
    }

    update(dt) {
        const input = window.Game.Input;
        const speed = this.stats.speed;

        // Movement Physics (Inertia)
        const accel = 2500;
        const friction = 0.92;

        if (input.touch.active) {
            // 1:1 Finger Tracking (Absolute Mapping)
            // Map 0-1 to GameWidth (plus margins maybe?)
            const targetX = input.touch.xPct * this.gameWidth;

            // Smoothly move towards finger (Lerp) for "tight" but not "teleporting" feel
            // Higher factor = more responsive (0.2 is smooth, 0.5 is snappy)
            const d = targetX - this.x;
            this.vx = d * 15; // Drive velocity by distance to target

            // We skip accel/friction simulation for touch to feel directly responsive
        }
        else if (input.isDown('ArrowRight') || input.isDown('KeyD')) {
            this.vx += accel * dt;
        } else if (input.isDown('ArrowLeft') || input.isDown('KeyA')) {
            this.vx -= accel * dt;
        }

        // Apply Friction (Only if not touching, or tweak above)
        if (!input.touch.active) this.vx *= friction;

        // Cap speed (optional, but good for control)
        if (this.vx > speed) this.vx = speed;
        if (this.vx < -speed) this.vx = -speed;

        // Apply velocity & Bounds
        this.x += this.vx * dt;
        this.x = Math.max(20, Math.min(this.gameWidth - 20, this.x));

        // Bank angle for visual effect (optional extra juice)
        this.rotation = this.vx * 0.0005;

        // Timers
        if (this.shieldActive) {
            this.shieldTimer -= dt;
            if (this.shieldTimer <= 0) this.shieldActive = false;
        }
        if (this.shieldCooldown > 0) this.shieldCooldown -= dt;

        if (this.weapon !== 'NORMAL') {
            this.weaponTimer -= dt;
            if (this.weaponTimer <= 0) {
                this.weapon = 'NORMAL';
                // Callback to UI could go here, but avoiding circular deps for now
            }
        }
        if (this.invulnTimer > 0) this.invulnTimer -= dt;
        if (this.rapidFireTimer > 0) this.rapidFireTimer -= dt; // Countdown
        this.cooldown -= dt;

        // Action: Shield
        if ((input.isDown('ArrowDown') || input.isDown('KeyS') || input.touch.shield) && this.shieldCooldown <= 0 && !this.shieldActive) {
            this.activateShield();
        }

        // Action: Fire
        // Check input for fire (Space, Touch, Up)
        const isShooting = input.isDown('Space') || input.touch.active || input.isDown('ArrowUp');
        if (isShooting && this.cooldown <= 0) {
            return this.fire(); // Returns array of bullets to spawn
        }
        return null; // No bullets 
    }

    activateShield() {
        this.shieldActive = true;
        this.shieldTimer = 2.0;
        this.shieldCooldown = 10.0;
        window.Game.Audio.play('shield');
    }

    fire() {
        const conf = window.Game.WEAPONS[this.weapon];
        const bullets = [];
        const isHodl = Math.abs(this.vx) < 10;

        // Play Sound
        window.Game.Audio.play(isHodl ? 'hodl' : 'shoot');
        window.Game.Input.vibrate(5); // Tiny haptic tick

        // Logic
        // Logic
        const color = conf.color;
        let rate = (this.weapon === 'RAPID' && this.weaponLevel > 1) ? conf.rate * 0.7 : ((this.weapon === 'NORMAL') ? this.stats.fireRate : conf.rate);

        // DEFI POWERUP OVERRIDE
        if (this.rapidFireTimer > 0) rate = 0.1;

        this.cooldown = rate;

        // Bullet Setup
        if (this.weapon === 'SPREAD') {
            // Center
            bullets.push(window.Game.Bullet.Pool.acquire(this.x, this.y - 25, 0, -800, color, 5, 20, isHodl));
            // Left
            bullets.push(window.Game.Bullet.Pool.acquire(this.x - 10, this.y - 20, -200, -700, color, 5, 20, isHodl));
            // Right
            bullets.push(window.Game.Bullet.Pool.acquire(this.x + 10, this.y - 20, 200, -700, color, 5, 20, isHodl));
        } else {
            // NORMAL, RAPID, LASER
            bullets.push(window.Game.Bullet.Pool.acquire(this.x, this.y - 25, 0, -800, color, 5, 20, isHodl));
        }

        return bullets;
    }

    draw(ctx) {
        if (this.invulnTimer > 0 && Math.floor(Date.now() / 100) % 2 === 0) return;

        ctx.save();
        ctx.translate(this.x, this.y);

        // Render Sprite (Prioritize 'player' asset)
        if (window.Game.assets && window.Game.assets.player) {
            ctx.drawImage(window.Game.assets.player, -35, -35, 70, 70);
        }

        // Shield Overlay
        if (this.shieldActive) {
            ctx.beginPath();
            ctx.arc(0, 0, 40, 0, Math.PI * 2);
            ctx.strokeStyle = '#3498db'; // Flat Blue
            ctx.lineWidth = 4;
            ctx.stroke();
        }

        ctx.restore();
    }

    takeDamage() {
        if (this.invulnTimer > 0 || this.shieldActive) return false;

        this.hp--;
        this.invulnTimer = 2.0;
        window.Game.Audio.play('hit');
        window.Game.Input.vibrate([50, 50, 50]); // heavy shake
        return true;
    }

    upgrade(type) {
        window.Game.Audio.play('coin'); // Reusing coin sound for now
        if (type === 'SHIELD') {
            this.activateShield();
            this.shieldCooldown = 0; // Reset CD if grabbed
        } else {
            this.weapon = type;
            this.weaponTimer = 10.0; // Lasts 10 seconds
            this.weaponLevel = 1;
        }
    }
}

window.Game.Player = Player;
