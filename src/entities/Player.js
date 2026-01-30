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

        // Visual effects
        this.animTime = 0;
        this.muzzleFlash = 0; // Timer for muzzle flash effect
        this.trail = []; // Position history for trail effect
    }

    configure(type) {
        this.type = type;
        this.stats = window.Game.SHIPS[type];
        this.maxHp = (this.stats.hp || 3) + this.getRunMod('maxHpBonus', 0);
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
        const speed = this.stats.speed * this.getRunMod('speedMult', 1);

        // Animation timer for visual effects
        this.animTime += dt;
        if (this.muzzleFlash > 0) this.muzzleFlash -= dt;

        // Trail effect - store position history
        if (this.trail.length === 0 || Math.abs(this.x - this.trail[this.trail.length - 1].x) > 2) {
            this.trail.push({ x: this.x, y: this.y, age: 0 });
            if (this.trail.length > 8) this.trail.shift();
        }
        this.trail.forEach(t => t.age += dt);
        this.trail = this.trail.filter(t => t.age < 0.15);

        // Movement Physics (Inertia)
        const accel = 2500;
        const friction = 0.92;

        if (input.touch.joystickActive) {
            this.vx = input.touch.axisX * speed;
        }
        else if (input.touch.active) {
            // Legacy fallback for non-joystick touch
            const targetX = input.touch.xPct * this.gameWidth;
            const d = targetX - this.x;
            this.vx = d * 15;
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
        this.shieldCooldown = 10.0 * this.getRunMod('shieldCooldownMult', 1);
        window.Game.Audio.play('shield');
    }

    fire() {
        const conf = window.Game.WEAPONS[this.weapon];
        const bullets = [];
        const isHodl = Math.abs(this.vx) < 10;
        const flags = (window.Game.RunState && window.Game.RunState.flags) ? window.Game.RunState.flags : {};
        const isLaser = !!flags.laserBeam;
        const useTwin = !!flags.twinCannons;
        const useWide = !!flags.wideSpread;

        // Play Sound
        window.Game.Audio.play(isHodl ? 'hodl' : 'shoot');
        window.Game.Input.vibrate(5); // Tiny haptic tick
        this.muzzleFlash = 0.08; // Trigger muzzle flash effect

        // Logic
        const color = isLaser ? '#e74c3c' : conf.color;
        let baseRate = (this.weapon === 'RAPID' && this.weaponLevel > 1)
            ? conf.rate * 0.7
            : ((this.weapon === 'NORMAL') ? this.stats.fireRate : conf.rate);
        if (isLaser) baseRate = Math.max(baseRate, 0.35);
        const rate = baseRate * this.getRunMod('fireRateMult', 1) * this.getRunMod('tempFireRateMult', 1);

        this.cooldown = rate;

        // Bullet Setup
        const pierce = this.getRunFlag('pierce') || isLaser;
        const bulletW = isLaser ? 6 : 5;
        const bulletH = isLaser ? 40 : 20;
        const spawnBullet = (x, y, vx, vy) => {
            const b = window.Game.Bullet.Pool.acquire(x, y, vx, vy, color, bulletW, bulletH, isHodl);
            b.penetration = pierce;
            bullets.push(b);
        };

        if (this.weapon === 'SPREAD') {
            // Center
            spawnBullet(this.x, this.y - 25, 0, -800);
            // Left
            spawnBullet(this.x - 10, this.y - 20, -200, -700);
            // Right
            spawnBullet(this.x + 10, this.y - 20, 200, -700);
        } else {
            // NORMAL, RAPID, LASER
            spawnBullet(this.x, this.y - 25, 0, -900);
            if (useTwin) {
                spawnBullet(this.x + 10, this.y - 25, 0, -900);
            }
            if (useWide) {
                spawnBullet(this.x - 12, this.y - 20, -280, -700);
                spawnBullet(this.x + 12, this.y - 20, 280, -700);
            }
        }

        return bullets;
    }

    draw(ctx) {
        if (this.invulnTimer > 0 && Math.floor(Date.now() / 100) % 2 === 0) return;

        // Trail effect (draw before ship)
        if (this.trail.length > 1) {
            for (let i = 0; i < this.trail.length - 1; i++) {
                const t = this.trail[i];
                const alpha = (1 - t.age / 0.15) * 0.3;
                const size = 8 - i;
                ctx.fillStyle = `rgba(247, 147, 26, ${alpha})`;
                ctx.beginPath();
                ctx.arc(t.x, t.y + 10, Math.max(2, size), 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.save();
        ctx.translate(this.x, this.y);

        // Reactor flame (animated) - draw behind ship
        const flameHeight = 18 + Math.sin(this.animTime * 12) * 6;
        const flameWidth = 8 + Math.sin(this.animTime * 10) * 3;
        const flameGrad = ctx.createLinearGradient(0, 12, 0, 12 + flameHeight);
        flameGrad.addColorStop(0, '#fff');
        flameGrad.addColorStop(0.2, '#ffcc00');
        flameGrad.addColorStop(0.5, '#ff6600');
        flameGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = flameGrad;
        ctx.beginPath();
        ctx.moveTo(-flameWidth, 12);
        ctx.quadraticCurveTo(0, 12 + flameHeight * 1.3, flameWidth, 12);
        ctx.closePath();
        ctx.fill();

        // Side thrusters (small flames on fins when moving)
        if (Math.abs(this.vx) > 50) {
            const sideFlameH = 8 + Math.sin(this.animTime * 15) * 3;
            ctx.fillStyle = '#ff8800';
            if (this.vx > 0) {
                // Moving right, left thruster fires
                ctx.beginPath();
                ctx.moveTo(-28, 16);
                ctx.lineTo(-32, 16 + sideFlameH);
                ctx.lineTo(-24, 16);
                ctx.closePath();
                ctx.fill();
            } else {
                // Moving left, right thruster fires
                ctx.beginPath();
                ctx.moveTo(28, 16);
                ctx.lineTo(32, 16 + sideFlameH);
                ctx.lineTo(24, 16);
                ctx.closePath();
                ctx.fill();
            }
        }

        // Vector ship (Cuphead-ish)
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#111';
        ctx.fillStyle = this.stats.color;

        // Body
        ctx.beginPath();
        ctx.moveTo(0, -26);
        ctx.lineTo(-22, 12);
        ctx.lineTo(22, 12);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Nose cone
        ctx.fillStyle = '#f6b26b';
        ctx.beginPath();
        ctx.moveTo(0, -28);
        ctx.lineTo(-10, -6);
        ctx.lineTo(10, -6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Fins
        ctx.fillStyle = '#4bc0c8';
        ctx.beginPath();
        ctx.moveTo(-22, 8);
        ctx.lineTo(-34, 16);
        ctx.lineTo(-16, 18);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(22, 8);
        ctx.lineTo(34, 16);
        ctx.lineTo(16, 18);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Window
        ctx.fillStyle = '#9fe8ff';
        ctx.beginPath();
        ctx.arc(0, -8, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // BTC logo
        ctx.fillStyle = '#111';
        ctx.font = 'bold 14px Courier New';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('₿', 0, 6);

        // Muzzle flash effect
        if (this.muzzleFlash > 0) {
            const flashAlpha = this.muzzleFlash / 0.08;
            const flashSize = 12 + (1 - flashAlpha) * 8;
            ctx.fillStyle = `rgba(255, 255, 200, ${flashAlpha * 0.8})`;
            ctx.beginPath();
            ctx.arc(0, -30, flashSize, 0, Math.PI * 2);
            ctx.fill();
            // Flash lines
            ctx.strokeStyle = `rgba(255, 200, 100, ${flashAlpha})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, -28);
            ctx.lineTo(0, -45 - flashSize);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(-6, -28);
            ctx.lineTo(-10, -38 - flashSize * 0.5);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(6, -28);
            ctx.lineTo(10, -38 - flashSize * 0.5);
            ctx.stroke();
        }

        // Shield Overlay
        if (this.shieldActive) {
            ctx.beginPath();
            ctx.arc(0, 0, 35, 0, Math.PI * 2);
            ctx.strokeStyle = '#0aa';
            ctx.lineWidth = 3;
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

    getRunMod(key, fallback) {
        const rs = window.Game.RunState;
        if (rs && rs.getMod) return rs.getMod(key, fallback);
        return fallback;
    }

    getRunFlag(key) {
        const rs = window.Game.RunState;
        return !!(rs && rs.flags && rs.flags[key]);
    }

    upgrade(type) {
        window.Game.Audio.play('coin'); // Reusing coin sound for now
        if (type === 'SHIELD') {
            this.activateShield();
            this.shieldCooldown = 0; // Reset CD if grabbed
        } else {
            this.weapon = type;
            this.weaponTimer = 9.0; // Lasts 9 seconds
            this.weaponLevel = 1;
        }
    }
}

window.Game.Player = Player;
