window.Game = window.Game || {};

class Player extends window.Game.Entity {
    constructor(gameWidth, gameHeight) {
        super(gameWidth / 2, gameHeight - 80, 30, 30);
        this.gameWidth = gameWidth;
        this.gameHeight = gameHeight;

        // Defaults
        this.type = 'BTC';
        this.stats = window.Game.SHIPS['BTC'];

        // Weapon State (NORMAL, WIDE, NARROW, FIRE)
        this.weapon = 'NORMAL';
        this.weaponTimer = 0;
        this.cooldown = 0;

        // Ship Power-up State (SPEED, RAPID, SHIELD - mutually exclusive)
        this.shipPowerUp = null;
        this.shipPowerUpTimer = 0;

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

        // Pre-cache colors for performance
        this._colorDark30 = this.darkenColor(this.stats.color, 0.3);
        this._colorLight50 = this.lightenColor(this.stats.color, 0.5);
    }

    resetState() {
        this.x = this.gameWidth / 2;
        this.y = this.gameHeight - 160; // Lifted for better visibility
        this.weapon = 'NORMAL';
        this.weaponTimer = 0;
        this.shipPowerUp = null;
        this.shipPowerUpTimer = 0;
        this.shieldActive = false;
        this.shieldCooldown = 0;
        this.invulnTimer = 0;
    }

    update(dt) {
        const input = window.Game.Input;
        const shipPU = window.Game.SHIP_POWERUPS;
        const speedMult = (this.shipPowerUp === 'SPEED' && shipPU.SPEED) ? shipPU.SPEED.speedMult : 1;
        const speed = this.stats.speed * this.getRunMod('speedMult', 1) * speedMult;

        // Animation timer for visual effects
        this.animTime += dt;
        if (this.muzzleFlash > 0) this.muzzleFlash -= dt;

        // Trail effect - store position history
        // Store position for trail when moving
        if (this.trail.length === 0 || Math.abs(this.x - this.trail[this.trail.length - 1].x) > 4) {
            this.trail.push({ x: this.x, y: this.y, age: 0 });
            if (this.trail.length > 6) this.trail.shift();
        }
        this.trail.forEach(t => t.age += dt);
        this.trail = this.trail.filter(t => t.age < 0.12);

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
            if (this.shieldTimer <= 0) {
                this.shieldActive = false;
                if (window.Game.Audio) window.Game.Audio.play('shieldDeactivate'); // Natural expiration
            }
        }
        if (this.shieldCooldown > 0) this.shieldCooldown -= dt;

        // Weapon timer (WIDE, NARROW, FIRE revert to NORMAL)
        if (this.weapon !== 'NORMAL') {
            this.weaponTimer -= dt;
            if (this.weaponTimer <= 0) {
                this.weapon = 'NORMAL';
            }
        }
        // Ship power-up timer (SPEED, RAPID expire)
        if (this.shipPowerUp && this.shipPowerUp !== 'SHIELD') {
            this.shipPowerUpTimer -= dt;
            if (this.shipPowerUpTimer <= 0) {
                this.shipPowerUp = null;
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
        const shipPU = window.Game.SHIP_POWERUPS;
        const bullets = [];
        const isHodl = Math.abs(this.vx) < 10;

        // Play Sound
        window.Game.Audio.play(isHodl ? 'hodl' : 'shoot');
        window.Game.Input.vibrate(5);
        this.muzzleFlash = 0.08;

        // Fire rate: base from weapon, modified by RAPID ship power-up
        const rapidMult = (this.shipPowerUp === 'RAPID' && shipPU.RAPID) ? shipPU.RAPID.rateMult : 1;
        const baseRate = this.weapon === 'NORMAL' ? this.stats.fireRate : conf.rate;
        const rate = baseRate * rapidMult * this.getRunMod('fireRateMult', 1);
        this.cooldown = rate;

        // Bullet setup
        const color = conf.color;
        const bulletW = 5;
        const bulletH = 20;
        const bulletSpeed = 765; // Reduced 15% (was 900)
        const weaponType = this.weapon;
        const spawnBullet = (x, y, vx, vy) => {
            const b = window.Game.Bullet.Pool.acquire(x, y, vx, vy, color, bulletW, bulletH, isHodl);
            b.weaponType = weaponType;
            bullets.push(b);
        };

        // Weapon patterns (tighter spreads for better control)
        if (this.weapon === 'WIDE') {
            // Triple spread - tighter pattern
            const spread = conf.spread || 0.18;
            spawnBullet(this.x, this.y - 25, 0, -bulletSpeed);
            spawnBullet(this.x - 8, this.y - 22, -bulletSpeed * spread, -bulletSpeed * 0.92);
            spawnBullet(this.x + 8, this.y - 22, bulletSpeed * spread, -bulletSpeed * 0.92);
        } else if (this.weapon === 'NARROW') {
            // Triple focused - very tight pattern
            const spread = conf.spread || 0.08;
            spawnBullet(this.x, this.y - 25, 0, -bulletSpeed);
            spawnBullet(this.x - 4, this.y - 23, -bulletSpeed * spread, -bulletSpeed * 0.97);
            spawnBullet(this.x + 4, this.y - 23, bulletSpeed * spread, -bulletSpeed * 0.97);
        } else if (this.weapon === 'FIRE') {
            // Triple parallel (tighter spacing) - PENETRATING
            const spawnFireBullet = (x, y, vx, vy) => {
                const b = window.Game.Bullet.Pool.acquire(x, y, vx, vy, color, bulletW, bulletH, isHodl);
                b.penetration = true; // FIRE bullets pierce through enemies
                bullets.push(b);
            };
            spawnFireBullet(this.x, this.y - 25, 0, -bulletSpeed);
            spawnFireBullet(this.x - 10, this.y - 25, 0, -bulletSpeed);
            spawnFireBullet(this.x + 10, this.y - 25, 0, -bulletSpeed);
        } else if (this.weapon === 'SPREAD') {
            // 5-shot wide fan pattern
            const spread = conf.spread || 0.35;
            spawnBullet(this.x, this.y - 25, 0, -bulletSpeed); // Center
            spawnBullet(this.x - 6, this.y - 23, -bulletSpeed * spread * 0.5, -bulletSpeed * 0.95); // Inner left
            spawnBullet(this.x + 6, this.y - 23, bulletSpeed * spread * 0.5, -bulletSpeed * 0.95);  // Inner right
            spawnBullet(this.x - 12, this.y - 20, -bulletSpeed * spread, -bulletSpeed * 0.88);      // Outer left
            spawnBullet(this.x + 12, this.y - 20, bulletSpeed * spread, -bulletSpeed * 0.88);       // Outer right
        } else if (this.weapon === 'HOMING') {
            // Tracking missiles - spawn with homing flag
            const spawnHomingBullet = (x, y) => {
                const b = window.Game.Bullet.Pool.acquire(x, y, 0, -bulletSpeed * 0.6, color, 8, 16, isHodl);
                b.homing = true;
                b.homingSpeed = 4.0; // Turn rate
                b.weaponType = 'HOMING';
                bullets.push(b);
            };
            spawnHomingBullet(this.x - 10, this.y - 20);
            spawnHomingBullet(this.x + 10, this.y - 20);
        } else if (this.weapon === 'LASER') {
            // Rapid continuous beam - thin penetrating shots
            const spawnLaserBullet = (x, y) => {
                const b = window.Game.Bullet.Pool.acquire(x, y, 0, -bulletSpeed * 1.4, color, 3, 30, isHodl);
                b.penetration = true; // Laser pierces through enemies
                b.weaponType = 'LASER';
                bullets.push(b);
            };
            spawnLaserBullet(this.x, this.y - 25);
        } else {
            // NORMAL: twin shot (2 parallel bullets for stronger base attack)
            spawnBullet(this.x - 6, this.y - 25, 0, -bulletSpeed);
            spawnBullet(this.x + 6, this.y - 25, 0, -bulletSpeed);
        }

        return bullets;
    }

    draw(ctx) {
        if (this.invulnTimer > 0 && Math.floor(Date.now() / 100) % 2 === 0) return;

        // HODL MODE AURA - Golden glow when stationary (2x damage!)
        const isHodl = Math.abs(this.vx) < 10;
        if (isHodl) {
            const hodlPulse = Math.sin(this.animTime * 8) * 0.15 + 0.4;
            const hodlSize = 45 + Math.sin(this.animTime * 6) * 8;

            // Outer golden glow
            const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, hodlSize);
            gradient.addColorStop(0, `rgba(255, 215, 0, ${hodlPulse * 0.6})`);
            gradient.addColorStop(0.5, `rgba(255, 180, 0, ${hodlPulse * 0.3})`);
            gradient.addColorStop(1, 'transparent');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(this.x, this.y, hodlSize, 0, Math.PI * 2);
            ctx.fill();

            // Inner bright ring
            ctx.strokeStyle = `rgba(255, 255, 200, ${hodlPulse * 0.8})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, 30 + Math.sin(this.animTime * 10) * 3, 0, Math.PI * 2);
            ctx.stroke();

            // Orbiting sparkles
            for (let i = 0; i < 4; i++) {
                const angle = this.animTime * 3 + (Math.PI / 2) * i;
                const dist = 35 + Math.sin(this.animTime * 5 + i) * 5;
                const sparkX = this.x + Math.cos(angle) * dist;
                const sparkY = this.y + Math.sin(angle) * dist;

                ctx.fillStyle = `rgba(255, 255, 150, ${hodlPulse})`;
                ctx.beginPath();
                ctx.arc(sparkX, sparkY, 2 + Math.sin(this.animTime * 8 + i) * 1, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Enhanced trail effect - multiple afterimages when moving fast
        if (this.trail.length > 0 && Math.abs(this.vx) > 80) {
            const trailCount = Math.min(this.trail.length, 4);
            for (let i = 0; i < trailCount; i++) {
                const t = this.trail[i];
                const alpha = 0.25 * (1 - i / trailCount) * (1 - t.age / 0.15);
                if (alpha <= 0) continue;

                // Afterimage silhouette
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.translate(t.x, t.y);

                // Simplified ship shape
                ctx.fillStyle = this.stats.color;
                ctx.beginPath();
                ctx.moveTo(0, -20);
                ctx.lineTo(-15, 10);
                ctx.lineTo(15, 10);
                ctx.closePath();
                ctx.fill();

                ctx.restore();
            }
        }

        ctx.save();
        ctx.translate(this.x, this.y);

        // Reactor flame (animated) - 4-layer cell-shaded style
        const flameHeight = 20 + Math.sin(this.animTime * 12) * 8;
        const flameWidth = 10 + Math.sin(this.animTime * 10) * 3;
        const pulse = 1 + Math.sin(this.animTime * 8) * 0.1;

        // Outer glow (red, largest)
        ctx.fillStyle = '#cc3300';
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.moveTo(-flameWidth * 1.3 * pulse, 12);
        ctx.lineTo(0, 12 + flameHeight * 1.1);
        ctx.lineTo(flameWidth * 1.3 * pulse, 12);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;

        // Main flame (orange)
        ctx.fillStyle = '#ff6600';
        ctx.beginPath();
        ctx.moveTo(-flameWidth, 12);
        ctx.lineTo(0, 12 + flameHeight);
        ctx.lineTo(flameWidth, 12);
        ctx.closePath();
        ctx.fill();

        // Inner flame (yellow)
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath();
        ctx.moveTo(-flameWidth * 0.5, 12);
        ctx.lineTo(0, 12 + flameHeight * 0.65);
        ctx.lineTo(flameWidth * 0.5, 12);
        ctx.closePath();
        ctx.fill();

        // Hot core (white)
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(-flameWidth * 0.2, 12);
        ctx.lineTo(0, 12 + flameHeight * 0.3);
        ctx.lineTo(flameWidth * 0.2, 12);
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

        // Vector ship (Cuphead-ish) - cell-shaded two-tone
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#111';

        // Body - shadow side (left half)
        ctx.fillStyle = this._colorDark30;
        ctx.beginPath();
        ctx.moveTo(0, -26);
        ctx.lineTo(-22, 12);
        ctx.lineTo(0, 12);
        ctx.closePath();
        ctx.fill();

        // Body - light side (right half)
        ctx.fillStyle = this.stats.color;
        ctx.beginPath();
        ctx.moveTo(0, -26);
        ctx.lineTo(0, 12);
        ctx.lineTo(22, 12);
        ctx.closePath();
        ctx.fill();

        // Body outline
        ctx.beginPath();
        ctx.moveTo(0, -26);
        ctx.lineTo(-22, 12);
        ctx.lineTo(22, 12);
        ctx.closePath();
        ctx.stroke();

        // Nose cone - two-tone
        ctx.fillStyle = '#c47d3a'; // Shadow side
        ctx.beginPath();
        ctx.moveTo(0, -28);
        ctx.lineTo(-10, -6);
        ctx.lineTo(0, -6);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#f6b26b'; // Light side
        ctx.beginPath();
        ctx.moveTo(0, -28);
        ctx.lineTo(0, -6);
        ctx.lineTo(10, -6);
        ctx.closePath();
        ctx.fill();

        // Nose outline
        ctx.beginPath();
        ctx.moveTo(0, -28);
        ctx.lineTo(-10, -6);
        ctx.lineTo(10, -6);
        ctx.closePath();
        ctx.stroke();

        // Left fin - shadow (left fin is in shadow)
        ctx.fillStyle = '#2d8a91';
        ctx.beginPath();
        ctx.moveTo(-22, 8);
        ctx.lineTo(-34, 16);
        ctx.lineTo(-16, 18);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Right fin - light
        ctx.fillStyle = '#4bc0c8';
        ctx.beginPath();
        ctx.moveTo(22, 8);
        ctx.lineTo(34, 16);
        ctx.lineTo(16, 18);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Rim lighting (right edge of body)
        ctx.strokeStyle = this._colorLight50;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(4, -24);
        ctx.lineTo(22, 10);
        ctx.stroke();

        // Rim light on nose
        ctx.strokeStyle = '#ffd699';
        ctx.beginPath();
        ctx.moveTo(2, -26);
        ctx.lineTo(8, -8);
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

        // Core Hitbox Indicator (Ikeda Rule 1 - visible when danger near)
        // Check if any enemy bullets are within 60px
        const enemyBullets = window.enemyBullets || [];
        let dangerNear = false;
        for (let i = 0; i < enemyBullets.length; i++) {
            const eb = enemyBullets[i];
            const dx = eb.x - this.x;
            const dy = eb.y - this.y;
            if (dx * dx + dy * dy < 3600) { // 60px radius squared
                dangerNear = true;
                break;
            }
        }

        if (dangerNear) {
            const coreR = this.stats.coreHitboxSize || 6;
            const pulse = Math.sin(this.animTime * 15) * 0.3 + 0.7;

            // Outer glow ring
            ctx.strokeStyle = `rgba(255, 255, 255, ${pulse * 0.4})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, coreR + 4, 0, Math.PI * 2);
            ctx.stroke();

            // Core hitbox circle (pulsing white)
            ctx.fillStyle = `rgba(255, 255, 255, ${pulse * 0.8})`;
            ctx.beginPath();
            ctx.arc(0, 0, coreR, 0, Math.PI * 2);
            ctx.fill();

            // Inner bright core
            ctx.fillStyle = `rgba(255, 255, 255, ${pulse})`;
            ctx.beginPath();
            ctx.arc(0, 0, coreR * 0.5, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    takeDamage() {
        if (this.invulnTimer > 0 || this.shieldActive) return false;

        this.hp--;
        this.invulnTimer = 1.4; // Reduced 30% (was 2.0)
        window.Game.Audio.play('hitPlayer');
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
        window.Game.Audio.play('coinPerk');
        const weaponTypes = ['WIDE', 'NARROW', 'FIRE', 'SPREAD', 'HOMING', 'LASER'];
        const shipTypes = ['SPEED', 'RAPID', 'SHIELD'];

        if (weaponTypes.includes(type)) {
            // Weapon power-up (replaces current weapon)
            this.weapon = type;
            this.weaponTimer = 8.0;
        } else if (shipTypes.includes(type)) {
            // Ship power-up (replaces current ship power-up)
            if (type === 'SHIELD') {
                this.activateShield();
                this.shieldCooldown = 0;
                this.shipPowerUp = null; // Shield is instant, doesn't persist
            } else {
                this.shipPowerUp = type;
                this.shipPowerUpTimer = 8.0;
            }
        }
    }

    darkenColor(hex, amount) {
        const num = parseInt(hex.slice(1), 16);
        const r = Math.max(0, (num >> 16) - Math.floor(255 * amount));
        const g = Math.max(0, ((num >> 8) & 0x00FF) - Math.floor(255 * amount));
        const b = Math.max(0, (num & 0x0000FF) - Math.floor(255 * amount));
        return `rgb(${r},${g},${b})`;
    }

    lightenColor(hex, amount) {
        const num = parseInt(hex.slice(1), 16);
        const r = Math.min(255, (num >> 16) + Math.floor(255 * amount));
        const g = Math.min(255, ((num >> 8) & 0x00FF) + Math.floor(255 * amount));
        const b = Math.min(255, (num & 0x0000FF) + Math.floor(255 * amount));
        return `rgb(${r},${g},${b})`;
    }
}

window.Game.Player = Player;
