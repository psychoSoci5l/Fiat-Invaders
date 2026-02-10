window.Game = window.Game || {};

class Player extends window.Game.Entity {
    constructor(gameWidth, gameHeight) {
        const P = window.Game.Balance.PLAYER;
        super(gameWidth / 2, gameHeight - P.SPAWN_OFFSET_Y, 30, 30);
        this.gameWidth = gameWidth;
        this.gameHeight = gameHeight;

        // Defaults
        this.type = 'BTC';
        this.stats = window.Game.SHIPS['BTC'];

        // Legacy Weapon State (kept for backward compatibility during transition)
        this.weapon = 'NORMAL';
        this.weaponTimer = 0;
        this.cooldown = 0;

        // Legacy Ship Power-up State (kept for backward compatibility)
        this.shipPowerUp = null;
        this.shipPowerUpTimer = 0;

        // === WEAPON EVOLUTION SYSTEM v3.0 ===
        // Shot level (1-3): permanent until death (-1 per death)
        this.shotLevel = 1;

        // Modifiers (stackable, temp timer): rate/power/spread
        this.modifiers = {
            rate:   { level: 0, timer: 0 },
            power:  { level: 0, timer: 0 },
            spread: { level: 0, timer: 0 }
        };

        // Special (exclusive, temp): HOMING/PIERCE/LASER/MISSILE/SHIELD/SPEED
        this.special = null;
        this.specialTimer = 0;

        this.shieldActive = false;
        this.shieldTimer = 0;
        this.shieldCooldown = 0;

        // v4.0.2: ETH Smart Contract - consecutive hit tracking
        this.smartContractTarget = null;  // Enemy ID being hit consecutively
        this.smartContractTimer = 0;      // Time since last hit on same target
        this.smartContractStacks = 0;     // Number of consecutive hits

        // v4.0.2: Second Wind - brief invuln when shield expires
        this.secondWind = false;
        this.secondWindTimer = 0;

        this.beastMode = 0;
        this.hp = 1;  // 1-hit = 1-life system
        this.invulnTimer = 0;

        // HYPER GRAZE state
        this.hyperActive = false;
        this.hyperTimer = 0;
        this.hyperCooldown = 0;
        this.hyperAvailable = false; // True when meter is full and can activate

        // GODCHAIN MODE state
        this._godchainActive = false;

        // Visual effects
        this.animTime = 0;
        this.muzzleFlash = 0; // Timer for muzzle flash effect

        // Pre-allocated trail buffer (circular, no GC churn)
        this._trailBuffer = [];
        this._trailHead = 0;
        this._trailCount = 0;
        for (let i = 0; i < 6; i++) {
            this._trailBuffer.push({ x: 0, y: 0, age: 999 }); // Pre-allocate
        }
        this.trail = []; // Kept for compatibility with draw()

        this.hyperParticles = []; // Golden particles during HYPER
    }

    configure(type) {
        this.type = type;
        this.stats = window.Game.SHIPS[type];
        // 1-hit = 1-life system: ignore stats.hp and bonuses
        this.maxHp = 1;
        this.hp = 1;
        this.resetState();

        // Pre-cache colors for performance
        const CU = window.Game.ColorUtils;
        this._colorDark30 = CU.darken(this.stats.color, 0.3);
        this._colorLight50 = CU.lighten(this.stats.color, 0.5);
    }

    resetState() {
        this.x = this.gameWidth / 2;
        this.y = this.gameHeight - window.Game.Balance.PLAYER.RESET_Y_OFFSET; // Standard position above controls
        this.weapon = 'NORMAL';
        this.weaponTimer = 0;
        this.shipPowerUp = null;
        this.shipPowerUpTimer = 0;
        this.shieldActive = false;
        this.shieldCooldown = 0;
        this.invulnTimer = 0;

        // Reset trail buffer (reuse pre-allocated objects)
        this._trailHead = 0;
        this._trailCount = 0;
        for (let i = 0; i < 6; i++) {
            this._trailBuffer[i].age = 999; // Mark as expired
        }
        this.trail.length = 0;

        // HYPER reset
        this.hyperActive = false;
        this.hyperTimer = 0;
        this.hyperCooldown = 0;
        this.hyperAvailable = false;
        this.hyperParticles = [];

        // GODCHAIN reset
        this._godchainActive = false;

        // Weapon Evolution reset (soft reset - keep shotLevel on normal reset)
        // Note: applyDeathPenalty() handles death penalty separately
        this.modifiers = {
            rate:   { level: 0, timer: 0 },
            power:  { level: 0, timer: 0 },
            spread: { level: 0, timer: 0 }
        };
        this.special = null;
        this.specialTimer = 0;
    }

    /**
     * Full reset for new game (resets shot level too)
     */
    fullReset() {
        this.shotLevel = 1;
        this.resetState();
    }

    /**
     * Update weapon evolution state (modifiers and special timers)
     */
    updateWeaponState(dt) {
        const WE = window.Game.Balance.WEAPON_EVOLUTION;
        if (!WE) return; // Guard for missing config

        // Update modifier timers
        for (const modKey of ['rate', 'power', 'spread']) {
            const mod = this.modifiers[modKey];
            if (mod.timer > 0) {
                mod.timer -= dt;
                if (mod.timer <= 0) {
                    if (window.Game.Debug) window.Game.Debug.trackWeaponEvent('MODIFIER_EXPIRED', modKey.toUpperCase());
                    mod.level = 0;
                    mod.timer = 0;
                }
            }
        }

        // Update special timer
        if (this.special && this.specialTimer > 0) {
            this.specialTimer -= dt;
            if (this.specialTimer <= 0) {
                if (window.Game.Debug) window.Game.Debug.trackWeaponEvent('SPECIAL_EXPIRED', this.special);
                this.special = null;
                this.specialTimer = 0;
            }
        }
    }

    /**
     * Check if GODCHAIN conditions are met (all modifiers at max with active timers)
     */
    isGodchainActive() {
        // v4.6.1: Use GODCHAIN.REQUIREMENTS config (lowered from max levels)
        const req = window.Game.Balance?.GODCHAIN?.REQUIREMENTS || { RATE: 3, POWER: 3, SPREAD: 2 };
        return this.shotLevel >= 3 &&
               this.modifiers.rate.level >= req.RATE && this.modifiers.rate.timer > 0 &&
               this.modifiers.power.level >= req.POWER && this.modifiers.power.timer > 0 &&
               this.modifiers.spread.level >= req.SPREAD && this.modifiers.spread.timer > 0;
    }

    update(dt, blockFiring = false) {
        const input = window.Game.Input;
        const Balance = window.Game.Balance;
        const WE = Balance.WEAPON_EVOLUTION;

        // Speed calculation: check both legacy and new systems
        let speedMult = 1;
        if (this.shipPowerUp === 'SPEED') {
            speedMult = 1.5; // Legacy system
        } else if (this.special === 'SPEED' && WE) {
            speedMult = WE.SPEED_MULTIPLIER || 1.4; // New system
        }
        // GODCHAIN speed bonus
        if (this._godchainActive && Balance.GODCHAIN) {
            speedMult *= Balance.GODCHAIN.SPEED_BONUS;
        }
        const speed = this.stats.speed * this.getRunMod('speedMult', 1) * speedMult;

        // Animation timer for visual effects
        this.animTime += dt;
        if (this.muzzleFlash > 0) this.muzzleFlash -= dt;

        // Trail effect - pre-allocated circular buffer (no GC)
        // Check if we need a new trail point (use last written slot)
        const lastTrailIdx = (this._trailHead + 5) % 6;
        const lastTrail = this._trailBuffer[lastTrailIdx];
        if (this._trailCount === 0 || Math.abs(this.x - lastTrail.x) > 4) {
            // Reuse pre-allocated slot (circular overwrite)
            const slot = this._trailBuffer[this._trailHead];
            slot.x = this.x;
            slot.y = this.y;
            slot.age = 0;
            this._trailHead = (this._trailHead + 1) % 6;
            if (this._trailCount < 6) this._trailCount++;
        }

        // Age trail points in-place (no forEach closure)
        // Build trail array for draw() without .filter() allocation
        this.trail.length = 0; // Reuse existing array
        for (let i = 0; i < 6; i++) {
            const t = this._trailBuffer[i];
            t.age += dt;
            if (t.age < 0.18) { // v4.23.1: 0.12→0.18 longer afterimage visibility
                this.trail.push(t); // Push reference, not new object
            }
        }

        // Movement Physics (Inertia) - values from Balance config
        const accel = Balance.PLAYER.ACCELERATION;
        const friction = Balance.PLAYER.FRICTION;

        if (input.touch.joystickActive) {
            this.vx = input.touch.axisX * speed;
        }
        else if (input.touch.active) {
            // Legacy fallback for non-joystick touch
            const targetX = input.touch.xPct * this.gameWidth;
            const d = targetX - this.x;
            this.vx = d * Balance.PLAYER.TOUCH_SWIPE_MULT;
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
        const margin = Balance.PLAYER.BOUNDARY_MARGIN;
        this.x = Math.max(margin, Math.min(this.gameWidth - margin, this.x));

        // Bank angle for visual effect (optional extra juice)
        this.rotation = this.vx * 0.0005;

        // Timers
        if (this.shieldActive) {
            this.shieldTimer -= dt;
            if (this.shieldTimer <= 0) {
                this.shieldActive = false;
                if (window.Game.Audio) window.Game.Audio.play('shieldDeactivate');
                // v4.0.2: Second Wind perk - brief invuln when shield expires
                const rs = window.Game.RunState;
                if (rs && rs.flags && rs.flags.secondWind) {
                    this.secondWindTimer = Balance.PLAYER.SECOND_WIND_DURATION;
                    this.invulnTimer = Math.max(this.invulnTimer, Balance.PLAYER.SECOND_WIND_DURATION);
                }
            }
        }
        if (this.shieldCooldown > 0) this.shieldCooldown -= dt;
        if (this.secondWindTimer > 0) this.secondWindTimer -= dt;

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

        // v4.0.2: Smart Contract timer decay
        if (this.smartContractTimer > 0) {
            this.smartContractTimer -= dt;
            if (this.smartContractTimer <= 0) {
                this.smartContractStacks = 0;
                this.smartContractTarget = null;
            }
        }

        // Weapon Evolution timers
        this.updateWeaponState(dt);

        // GODCHAIN state detection
        const wasGodchain = this._godchainActive;
        this._godchainActive = this.isGodchainActive();
        if (this._godchainActive && !wasGodchain) {
            if (window.Game.Events) window.Game.Events.emit('GODCHAIN_ACTIVATED');
            if (window.Game.Audio) window.Game.Audio.play('godchainActivate');
            if (window.Game.Input) window.Game.Input.vibrate([80, 40, 80, 40, 80]);
            if (window.Game.Debug) window.Game.Debug.trackGodchainActivate();
        } else if (!this._godchainActive && wasGodchain) {
            if (window.Game.Events) window.Game.Events.emit('GODCHAIN_DEACTIVATED');
            if (window.Game.Debug) window.Game.Debug.trackGodchainDeactivate();
        }

        // HYPER mode timer (frozen during non-combat states)
        if (this.hyperActive && !this.hyperFrozen) {
            this.hyperTimer -= dt;

            // Warning sound when about to end
            const HYPER = Balance.HYPER;
            if (this.hyperTimer <= HYPER.WARNING_TIME && this.hyperTimer + dt > HYPER.WARNING_TIME) {
                if (window.Game.Audio) window.Game.Audio.play('hyperWarning');
            }

            // HYPER expired
            if (this.hyperTimer <= 0) {
                this.deactivateHyper();
            }

            // Update HYPER particles
            for (let i = this.hyperParticles.length - 1; i >= 0; i--) {
                const p = this.hyperParticles[i];
                p.life -= dt;
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.vy += 200 * dt; // gravity
                if (p.life <= 0) this.hyperParticles.splice(i, 1);
            }
        }

        // HYPER cooldown
        if (this.hyperCooldown > 0) this.hyperCooldown -= dt;

        // Action: Shield
        if ((input.isDown('ArrowDown') || input.isDown('KeyS') || input.touch.shield) && this.shieldCooldown <= 0 && !this.shieldActive) {
            this.activateShield();
        }

        // Action: Fire (blocked while enemies entering formation)
        // Check input for fire (Space, Touch, Up)
        const isShooting = input.isDown('Space') || input.touch.active || input.isDown('ArrowUp');
        if (isShooting && this.cooldown <= 0 && !blockFiring) {
            return this.fire(); // Returns array of bullets to spawn
        }
        return null; // No bullets 
    }

    activateShield() {
        this.shieldActive = true;
        this.shieldTimer = 2.0;
        const shieldCD = window.Game.Balance?.PLAYER?.SHIELD_COOLDOWN || 10.0;
        this.shieldCooldown = shieldCD * this.getRunMod('shieldCooldownMult', 1);
        window.Game.Audio.play('shield');
    }

    /**
     * v4.0.2: ETH Smart Contract - get damage multiplier for consecutive hits on same enemy
     * @param {Object} enemy - The enemy being hit
     * @returns {number} Damage multiplier (1.0 if not ETH, or 1.0 + stacks * bonus)
     */
    getSmartContractMult(enemy) {
        if (this.type !== 'ETH') return 1.0;
        const Balance = window.Game.Balance;
        const cfg = Balance && Balance.ETH_BONUS || { STACK_WINDOW: 0.5, DAMAGE_BONUS: 0.15 };

        const enemyId = enemy._uid || (enemy.x * 1000 + enemy.y); // Simple identity
        if (this.smartContractTarget === enemyId && this.smartContractTimer > 0) {
            this.smartContractStacks++;
        } else {
            this.smartContractStacks = 1;
            this.smartContractTarget = enemyId;
        }
        this.smartContractTimer = cfg.STACK_WINDOW;

        return 1.0 + (this.smartContractStacks - 1) * cfg.DAMAGE_BONUS;
    }

    // --- HYPER GRAZE SYSTEM ---

    /**
     * Check if HYPER can be activated (meter full, not on cooldown)
     */
    canActivateHyper(grazeMeter) {
        const HYPER = window.Game.Balance.HYPER;
        return grazeMeter >= HYPER.METER_THRESHOLD &&
               !this.hyperActive &&
               this.hyperCooldown <= 0;
    }

    /**
     * Activate HYPER mode - extreme risk/reward
     */
    activateHyper() {
        const HYPER = window.Game.Balance.HYPER;
        this.hyperActive = true;
        this.hyperTimer = HYPER.BASE_DURATION;
        this.hyperAvailable = false;

        // Play activation sound
        if (window.Game.Audio) window.Game.Audio.play('hyperActivate');

        // Heavy vibration
        if (window.Game.Input) window.Game.Input.vibrate([100, 50, 100]);

        // Emit event for main.js to handle (reset meter, etc.)
        if (window.Game.Events) {
            window.Game.Events.emit('HYPER_ACTIVATED');
        }

        // Analytics: Track HYPER activation
        if (window.Game.Debug) window.Game.Debug.trackHyperActivate();
    }

    /**
     * Deactivate HYPER mode (timer expired or cancelled)
     */
    deactivateHyper() {
        const HYPER = window.Game.Balance.HYPER;
        this.hyperActive = false;
        this.hyperTimer = 0;
        this.hyperCooldown = HYPER.COOLDOWN;
        this.hyperParticles = [];

        // Play deactivation sound
        if (window.Game.Audio) window.Game.Audio.play('hyperDeactivate');

        // Emit event
        if (window.Game.Events) {
            window.Game.Events.emit('HYPER_DEACTIVATED');
        }

        // Analytics: Track HYPER end
        if (window.Game.Debug) window.Game.Debug.trackHyperEnd();
    }

    /**
     * Extend HYPER timer (called on graze during HYPER)
     */
    extendHyper(duration) {
        if (!this.hyperActive) return;

        const HYPER = window.Game.Balance.HYPER;
        const ext = duration || HYPER.GRAZE_EXTENSION;
        this.hyperTimer = Math.min(
            this.hyperTimer + ext,
            HYPER.MAX_DURATION
        );

        // Spawn golden particles
        for (let i = 0; i < HYPER.PARTICLE_BURST; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 100 + Math.random() * 150;
            this.hyperParticles.push({
                x: this.x,
                y: this.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 100,
                life: 0.5 + Math.random() * 0.3,
                size: 3 + Math.random() * 4
            });
        }
    }

    /**
     * Get effective core hitbox size (larger during HYPER)
     */
    getCoreHitboxSize() {
        const baseSize = this.stats.coreHitboxSize || 6;
        if (this.hyperActive) {
            return baseSize * window.Game.Balance.HYPER.HITBOX_PENALTY;
        }
        return baseSize;
    }

    /**
     * Check if currently in HYPER mode
     */
    isHyperActive() {
        return this.hyperActive;
    }

    /**
     * Get HYPER timer remaining (for UI)
     */
    getHyperTimeRemaining() {
        return this.hyperTimer;
    }

    fire() {
        const Balance = window.Game.Balance;
        const WE = Balance.WEAPON_EVOLUTION;
        const bullets = [];
        const isHodl = Math.abs(this.vx) < 10;

        // Play Sound
        window.Game.Audio.play(isHodl ? 'hodl' : 'shoot');
        window.Game.Input.vibrate(Balance.PLAYER.FIRE_VIBRATION_MS);
        this.muzzleFlash = Balance.PLAYER.MUZZLE_FLASH_DURATION;

        // === NEW WEAPON EVOLUTION SYSTEM ===
        if (WE && this.shotLevel >= 1) {
            return this.fireEvolution(isHodl);
        }

        // === LEGACY SYSTEM FALLBACK ===
        const conf = window.Game.WEAPONS[this.weapon];

        // Fire rate: base from weapon, modified by RAPID ship power-up
        const rapidMult = (this.shipPowerUp === 'RAPID') ? 0.5 : 1;
        const baseRate = this.weapon === 'NORMAL' ? this.stats.fireRate : conf.rate;
        const rate = baseRate * rapidMult * this.getRunMod('fireRateMult', 1);
        this.cooldown = rate;

        // Bullet setup
        const color = conf.color;
        const bulletW = 5;
        const bulletH = 20;
        const bulletSpeed = 765;
        const weaponType = this.weapon;
        const spawnBullet = (x, y, vx, vy) => {
            const b = window.Game.Bullet.Pool.acquire(x, y, vx, vy, color, bulletW, bulletH, isHodl);
            b.weaponType = weaponType;
            const BP = Balance.BULLET_PIERCE;
            b.pierceHP = BP.BASE_HP + (isHodl ? BP.HODL_BONUS : 0);
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

    /**
     * New Weapon Evolution fire system
     * Shot patterns based on shotLevel (1-3), modifiers, and specials
     */
    fireEvolution(isHodl) {
        const Balance = window.Game.Balance;
        const WE = Balance.WEAPON_EVOLUTION;
        const bullets = [];

        // Calculate fire rate with RATE modifier
        let cooldown = this.stats.fireRate;
        if (this.modifiers.rate.level > 0) {
            const reduction = WE.RATE.COOLDOWN_REDUCTION[this.modifiers.rate.level - 1] || 0;
            cooldown *= (1 - reduction);
        }
        cooldown *= this.getRunMod('fireRateMult', 1);
        this.cooldown = cooldown;

        // Calculate damage multiplier for POWER modifier (stored on bullet)
        let damageMult = 1;
        if (this.modifiers.power.level > 0) {
            damageMult += WE.POWER.DAMAGE_BONUS[this.modifiers.power.level - 1] || 0;
        }

        // Calculate spread angle for SPREAD modifier
        let spreadAngle = 0;
        if (this.modifiers.spread.level > 0) {
            spreadAngle = (WE.SPREAD.ANGLE_BONUS[this.modifiers.spread.level - 1] || 0) * (Math.PI / 180);
        }

        // Bullet setup
        const color = this.stats.color;
        const bulletW = 5;
        const bulletH = 20;
        const bulletSpeed = 765;

        // Special-specific spawn function
        const spawnBullet = (offsetX, angleOffset) => {
            const angle = -Math.PI / 2 + angleOffset;
            const vx = Math.cos(angle) * bulletSpeed;
            const vy = Math.sin(angle) * bulletSpeed;

            let w = bulletW;
            let h = bulletH;
            let bSpeed = bulletSpeed;

            // Adjust for special types
            if (this.special === 'LASER') {
                w = 3;
                h = 30;
                bSpeed = bulletSpeed * 1.4;
            } else if (this.special === 'MISSILE') {
                w = 8;
                h = 16;
                bSpeed = bulletSpeed * 0.7;
            } else if (this.special === 'HOMING') {
                w = 8;
                h = 16;
                bSpeed = bulletSpeed * 0.6;
            }

            const finalVx = Math.cos(angle) * bSpeed;
            const finalVy = Math.sin(angle) * bSpeed;

            const b = window.Game.Bullet.Pool.acquire(
                this.x + offsetX,
                this.y - 25,
                finalVx,
                finalVy,
                color,
                w,
                h,
                isHodl
            );

            // Apply damage multiplier
            b.damageMult = damageMult;

            // Apply special properties
            b.special = this.special;

            if (this.special === 'PIERCE' || this.special === 'LASER') {
                b.penetration = true;
            }
            if (this.special === 'HOMING') {
                b.homing = true;
                b.homingSpeed = 4.0;
            }
            if (this.special === 'MISSILE') {
                b.isMissile = true;
                b.aoeRadius = 50; // Explosion radius on impact
            }

            // Bullet pierce HP
            const BP = Balance.BULLET_PIERCE;
            if (b.isMissile) {
                b.pierceHP = BP.MISSILE_HP;
            } else {
                b.pierceHP = BP.BASE_HP
                    + (this.modifiers.power.level * BP.POWER_BONUS)
                    + (isHodl ? BP.HODL_BONUS : 0);
            }

            b.weaponType = this.special || 'EVOLUTION';
            // v4.5: Flag for HYPER trail effect
            if (this.hyperActive) b._isHyper = true;
            // v4.6: Flag for GODCHAIN fire trail
            if (this._godchainActive) b._isGodchain = true;
            bullets.push(b);
        };

        // Shot patterns based on shotLevel (1-3)
        if (this.shotLevel === 1) {
            // Single center shot
            spawnBullet(0, 0);
        } else if (this.shotLevel === 2) {
            // Double shot
            spawnBullet(-6, -spreadAngle / 2);
            spawnBullet(+6, +spreadAngle / 2);
        } else {
            // Triple shot (shotLevel === 3)
            spawnBullet(-10, -spreadAngle);
            spawnBullet(0, 0);
            spawnBullet(+10, +spreadAngle);
        }

        return bullets;
    }

    draw(ctx) {
        if (this.invulnTimer > 0 && Math.floor(Date.now() / 100) % 2 === 0) return;

        const Balance = window.Game.Balance;
        const CU = window.Game.ColorUtils;

        // HYPER MODE AURA - Intense golden aura (overrides HODL visuals)
        if (this.hyperActive) {
            const HYPER = Balance.HYPER;
            const hyperPulse = Math.sin(this.animTime * HYPER.AURA_PULSE_SPEED) * 0.2 + 0.8;
            const hyperSize = HYPER.AURA_SIZE_BASE + Math.sin(this.animTime * 6) * HYPER.AURA_SIZE_PULSE;

            // Outer intense golden glow
            const _glowCfg = window.Game.Balance?.GLOW;
            const _useAdditiveAura = _glowCfg?.ENABLED && _glowCfg?.AURA?.ENABLED;
            if (_useAdditiveAura) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; }
            const hyperGradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, hyperSize);
            hyperGradient.addColorStop(0, CU.rgba(255, 215, 0, hyperPulse * 0.9));
            hyperGradient.addColorStop(0.3, CU.rgba(255, 180, 0, hyperPulse * 0.6));
            hyperGradient.addColorStop(0.6, CU.rgba(255, 140, 0, hyperPulse * 0.3));
            hyperGradient.addColorStop(1, 'transparent');
            ctx.fillStyle = hyperGradient;
            ctx.beginPath();
            ctx.arc(this.x, this.y, hyperSize, 0, Math.PI * 2);
            ctx.fill();
            if (_useAdditiveAura) { ctx.restore(); }

            // Inner blazing ring
            ctx.strokeStyle = CU.rgba(255, 255, 150, hyperPulse);
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(this.x, this.y, 35 + Math.sin(this.animTime * 12) * 4, 0, Math.PI * 2);
            ctx.stroke();

            // Timer ring (shows remaining time)
            const timeRatio = this.hyperTimer / HYPER.BASE_DURATION;
            const ringAngle = Math.PI * 2 * Math.min(1, timeRatio);
            ctx.strokeStyle = timeRatio < 0.3 ? '#ff4444' : '#FFD700';
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.arc(this.x, this.y, 50, -Math.PI / 2, -Math.PI / 2 + ringAngle);
            ctx.stroke();

            // Orbiting energy orbs (faster than HODL)
            for (let i = 0; i < 6; i++) {
                const angle = this.animTime * 5 + (Math.PI / 3) * i;
                const dist = 45 + Math.sin(this.animTime * 8 + i) * 6;
                const orbX = this.x + Math.cos(angle) * dist;
                const orbY = this.y + Math.sin(angle) * dist;

                ctx.fillStyle = CU.rgba(255, 255, 200, hyperPulse);
                ctx.beginPath();
                ctx.arc(orbX, orbY, 4 + Math.sin(this.animTime * 10 + i) * 2, 0, Math.PI * 2);
                ctx.fill();
            }

            // Draw HYPER particles
            for (const p of this.hyperParticles) {
                const alpha = p.life / 0.8;
                ctx.fillStyle = CU.rgba(255, 215, 0, alpha);
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
                ctx.fill();
            }

            // HYPER core hitbox indicator (always visible, larger)
            const coreR = this.getCoreHitboxSize();
            const corePulse = Math.sin(this.animTime * 20) * 0.3 + 0.7;

            ctx.save();
            ctx.translate(this.x, this.y);

            // Warning ring (larger hitbox!)
            ctx.strokeStyle = CU.rgba(255, 100, 100, corePulse * 0.6);
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, coreR + 6, 0, Math.PI * 2);
            ctx.stroke();

            // Core hitbox (red tint to show danger)
            ctx.fillStyle = CU.rgba(255, 200, 150, corePulse * 0.9);
            ctx.beginPath();
            ctx.arc(0, 0, coreR, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }

        // HODL MODE AURA - Golden glow when stationary (only if not in HYPER)
        const isHodl = Math.abs(this.vx) < 10;
        if (isHodl && !this.hyperActive) {
            const hodlPulse = Math.sin(this.animTime * 8) * 0.15 + 0.4;
            const hodlSize = 45 + Math.sin(this.animTime * 6) * 8;

            // Outer golden glow
            const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, hodlSize);
            gradient.addColorStop(0, CU.rgba(255, 215, 0, hodlPulse * 0.6));
            gradient.addColorStop(0.5, CU.rgba(255, 180, 0, hodlPulse * 0.3));
            gradient.addColorStop(1, 'transparent');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(this.x, this.y, hodlSize, 0, Math.PI * 2);
            ctx.fill();

            // Inner bright ring
            ctx.strokeStyle = CU.rgba(255, 255, 200, hodlPulse * 0.8);
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

                ctx.fillStyle = CU.rgba(255, 255, 150, hodlPulse);
                ctx.beginPath();
                ctx.arc(sparkX, sparkY, 2 + Math.sin(this.animTime * 8 + i) * 1, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Enhanced trail effect - multiple afterimages when moving fast
        // v4.23.1: lower threshold (80→50), higher alpha (0.25→0.4), additive mode
        if (this.trail.length > 0 && Math.abs(this.vx) > 50) {
            const _glowTrail = window.Game.Balance?.GLOW;
            const _additiveTrail = _glowTrail?.ENABLED && _glowTrail?.BULLET?.ENABLED;
            const trailCount = Math.min(this.trail.length, 4);
            for (let i = 0; i < trailCount; i++) {
                const t = this.trail[i];
                const alpha = 0.4 * (1 - i / trailCount) * (1 - t.age / 0.22);
                if (alpha <= 0) continue;

                // Afterimage silhouette — v4.23.1: additive
                ctx.save();
                if (_additiveTrail) ctx.globalCompositeOperation = 'lighter';
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

        // === ADDITIVE ENGINE GLOW v4.23 ===
        const _engineGlow = window.Game.Balance?.GLOW;
        if (_engineGlow?.ENABLED && _engineGlow?.ENGINE?.ENABLED) {
            const ec = _engineGlow.ENGINE;
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = CU.rgba(255, 140, 0, ec.ALPHA);
            ctx.beginPath();
            ctx.arc(0, 14, ec.RADIUS, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

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

        // v4.6: GODCHAIN ship color palette override
        const gc = this._godchainActive ? window.Game.Balance?.GODCHAIN : null;
        const gcColors = gc?.SHIP_COLORS;

        // Vector ship (Cuphead-ish) - cell-shaded two-tone
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#111';

        // Body - shadow side (left half)
        ctx.fillStyle = gcColors ? gcColors.BODY_DARK : this._colorDark30;
        ctx.beginPath();
        ctx.moveTo(0, -26);
        ctx.lineTo(-22, 12);
        ctx.lineTo(0, 12);
        ctx.closePath();
        ctx.fill();

        // Body - light side (right half)
        ctx.fillStyle = gcColors ? gcColors.BODY : this.stats.color;
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
        ctx.fillStyle = gcColors ? gcColors.NOSE : '#c47d3a'; // Shadow side
        ctx.beginPath();
        ctx.moveTo(0, -28);
        ctx.lineTo(-10, -6);
        ctx.lineTo(0, -6);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = gcColors ? gcColors.NOSE_LIGHT : '#f6b26b'; // Light side
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
        ctx.fillStyle = gcColors ? gcColors.FIN : '#2d8a91';
        ctx.beginPath();
        ctx.moveTo(-22, 8);
        ctx.lineTo(-34, 16);
        ctx.lineTo(-16, 18);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Right fin - light
        ctx.fillStyle = gcColors ? gcColors.FIN_LIGHT : '#4bc0c8';
        ctx.beginPath();
        ctx.moveTo(22, 8);
        ctx.lineTo(34, 16);
        ctx.lineTo(16, 18);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Rim lighting (right edge of body)
        ctx.strokeStyle = gcColors ? gcColors.BODY_LIGHT : this._colorLight50;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(4, -24);
        ctx.lineTo(22, 10);
        ctx.stroke();

        // Rim light on nose
        ctx.strokeStyle = gcColors ? gcColors.NOSE_LIGHT : '#ffd699';
        ctx.beginPath();
        ctx.moveTo(2, -26);
        ctx.lineTo(8, -8);
        ctx.stroke();

        // Window
        ctx.fillStyle = gcColors ? gcColors.WINDOW : '#9fe8ff';
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

        // v4.5: Evolved muzzle flash — scales with shot level, weapon color, modifiers
        if (this.muzzleFlash > 0) {
            const vfx = window.Game.Balance?.VFX || {};
            const flashAlpha = this.muzzleFlash / (Balance.PLAYER.MUZZLE_FLASH_DURATION || 0.08);
            const level = this.shotLevel || 1;
            const levelScale = 1 + (level - 1) * (vfx.MUZZLE_SCALE_PER_LEVEL || 0.4);

            // Modifier scaling
            let modScale = 1;
            if (this.modifiers?.power?.level > 0) modScale = vfx.MUZZLE_POWER_SCALE || 1.3;
            else if (this.modifiers?.rate?.level > 0) modScale = vfx.MUZZLE_RATE_SCALE || 0.6;

            const scale = levelScale * modScale;
            const flashSize = (10 + (1 - flashAlpha) * 8) * scale;

            // Weapon color for flash
            const wColor = this.stats?.color || '#E67E22';
            const CU = window.Game.ColorUtils;
            const lightColor = CU ? CU.lighten(wColor, 0.5) : '#fff';

            // Main flash glow (weapon-colored)
            ctx.fillStyle = CU.rgba(255, 255, 220, flashAlpha * 0.7);
            ctx.beginPath();
            ctx.arc(0, -30, flashSize, 0, Math.PI * 2);
            ctx.fill();

            // === ADDITIVE MUZZLE GLOW v4.23 ===
            const _muzzleGlow = window.Game.Balance?.GLOW;
            if (_muzzleGlow?.ENABLED && _muzzleGlow?.MUZZLE?.ENABLED) {
                const mc = _muzzleGlow.MUZZLE;
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                ctx.fillStyle = CU.rgba(255, 255, 220, flashAlpha * mc.ALPHA);
                ctx.beginPath();
                ctx.arc(0, -30, flashSize * mc.RADIUS_MULT, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            // Colored inner core
            const wParsed = CU.parseHex(wColor);
            ctx.fillStyle = CU.rgba(wParsed.r, wParsed.g, wParsed.b, flashAlpha * 0.5);
            ctx.beginPath();
            ctx.arc(0, -30, flashSize * 0.6, 0, Math.PI * 2);
            ctx.fill();

            // Flash lines (count scales with shot level)
            ctx.strokeStyle = CU.rgba(wParsed.r, wParsed.g, wParsed.b, flashAlpha * 0.9);
            ctx.lineWidth = 1.5 + level * 0.5;
            // Center line
            ctx.beginPath();
            ctx.moveTo(0, -28);
            ctx.lineTo(0, -42 - flashSize);
            ctx.stroke();
            // Side lines (level 2+)
            if (level >= 2) {
                ctx.beginPath();
                ctx.moveTo(-7 * scale, -28);
                ctx.lineTo(-12 * scale, -36 - flashSize * 0.5);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(7 * scale, -28);
                ctx.lineTo(12 * scale, -36 - flashSize * 0.5);
                ctx.stroke();
            }
            // Outer lines (level 3)
            if (level >= 3) {
                ctx.strokeStyle = CU.rgba(wParsed.r, wParsed.g, wParsed.b, flashAlpha * 0.6);
                ctx.beginPath();
                ctx.moveTo(-14 * scale, -26);
                ctx.lineTo(-18 * scale, -32 - flashSize * 0.3);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(14 * scale, -26);
                ctx.lineTo(18 * scale, -32 - flashSize * 0.3);
                ctx.stroke();
            }

            // Ring burst at level 3 (expanding ring)
            if (level >= (vfx.MUZZLE_RING_AT_LEVEL || 3) && flashAlpha > 0.7) {
                const ringExpand = (1 - flashAlpha) * 15;
                ctx.strokeStyle = CU.rgba(wParsed.r, wParsed.g, wParsed.b, flashAlpha * 0.4);
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(0, -30, flashSize + ringExpand, 0, Math.PI * 2);
                ctx.stroke();
            }
        }

        // Shield Overlay
        if (this.shieldActive) {
            ctx.beginPath();
            ctx.arc(0, 0, 35, 0, Math.PI * 2);
            ctx.strokeStyle = '#0aa';
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        // === DIEGETIC HUD v4.4 ===
        const diegeticConfig = window.Game.Balance?.DIEGETIC_HUD;
        if (diegeticConfig?.ENABLED) {
            this._drawDiegeticHUD(ctx, diegeticConfig);
        }

        // Core Hitbox Indicator - visible when projectiles are near
        // Check if any enemy bullets are within 60px
        const enemyBullets = window.enemyBullets || [];
        let dangerNear = false;
        for (let i = 0; i < enemyBullets.length; i++) {
            const eb = enemyBullets[i];
            const dx = eb.x - this.x;
            const dy = eb.y - this.y;
            if (dx * dx + dy * dy < Balance.PLAYER.DANGER_RANGE_SQ) { // 60px radius squared
                dangerNear = true;
                break;
            }
        }

        if (dangerNear && !this.hyperActive) { // HYPER has its own indicator
            const coreR = this.getCoreHitboxSize();
            const pulse = Math.sin(this.animTime * 15) * 0.3 + 0.7;

            // Outer glow ring
            ctx.strokeStyle = CU.rgba(255, 255, 255, pulse * 0.4);
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, coreR + 4, 0, Math.PI * 2);
            ctx.stroke();

            // Core hitbox circle (pulsing white)
            ctx.fillStyle = CU.rgba(255, 255, 255, pulse * 0.8);
            ctx.beginPath();
            ctx.arc(0, 0, coreR, 0, Math.PI * 2);
            ctx.fill();

            // Inner bright core
            ctx.fillStyle = CU.rgba(255, 255, 255, pulse);
            ctx.beginPath();
            ctx.arc(0, 0, coreR * 0.5, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    /**
     * v4.4: Diegetic HUD - ship-attached visual elements
     * Called from draw() in translated coordinate space (0,0 = ship center)
     */
    _drawDiegeticHUD(ctx, config) {
        const CU = window.Game.ColorUtils;
        // 1. LIFE PIPS (below ship)
        if (config.LIFE_PIPS?.ENABLED && typeof this._livesDisplay === 'number') {
            const lp = config.LIFE_PIPS;
            const totalLives = window.Game.Balance.PLAYER.START_LIVES;
            const startX = -(totalLives - 1) * lp.SPACING / 2;

            for (let i = 0; i < totalLives; i++) {
                const px = startX + i * lp.SPACING;
                const py = lp.Y_OFFSET;
                const isFull = i < this._livesDisplay;
                const isDanger = this._livesDisplay <= 1;

                ctx.beginPath();
                ctx.arc(px, py, lp.RADIUS, 0, Math.PI * 2);

                if (isFull) {
                    if (isDanger) {
                        // Red pulsing when danger
                        const pulse = Math.sin(this.animTime * 8) * 0.3 + 0.7;
                        ctx.fillStyle = CU.rgba(255, 68, 68, pulse);
                    } else {
                        ctx.fillStyle = CU.rgba(255, 255, 255, lp.FULL_ALPHA);
                    }
                    ctx.fill();
                } else {
                    ctx.fillStyle = CU.rgba(128, 128, 128, lp.EMPTY_ALPHA);
                    ctx.fill();
                }
            }
        }

        // 2. SHIELD COOLDOWN RING
        if (config.SHIELD_RING?.ENABLED) {
            const sr = config.SHIELD_RING;

            if (!this.shieldActive && this.shieldCooldown > 0) {
                // Cooldown: partial arc filling clockwise
                const maxCooldown = window.Game.Balance.PLAYER.SHIELD_COOLDOWN; // Shield cooldown from config
                const progress = 1 - (this.shieldCooldown / maxCooldown);
                const angle = Math.PI * 2 * Math.min(1, progress);

                ctx.strokeStyle = CU.rgba(0, 170, 170, sr.COOLDOWN_ALPHA);
                ctx.lineWidth = sr.LINE_WIDTH;
                ctx.beginPath();
                ctx.arc(0, 0, sr.RADIUS, -Math.PI / 2, -Math.PI / 2 + angle);
                ctx.stroke();
            } else if (!this.shieldActive && this.shieldCooldown <= 0) {
                // Ready: very faint full ring
                ctx.strokeStyle = CU.rgba(0, 170, 170, sr.READY_ALPHA);
                ctx.lineWidth = sr.LINE_WIDTH;
                ctx.beginPath();
                ctx.arc(0, 0, sr.RADIUS, 0, Math.PI * 2);
                ctx.stroke();
            }
        }

        // 3. WEAPON LEVEL PIPS (above ship)
        if (config.WEAPON_PIPS?.ENABLED && this._weaponState) {
            const wp = config.WEAPON_PIPS;
            const shotLevel = this._weaponState.shotLevel || 1;
            const maxLevel = 3;
            const startX = -(maxLevel - 1) * wp.SPACING / 2;

            // Check for special override
            if (this._weaponState.special && this._weaponState.specialTimer > 0) {
                // Show special icon with countdown arc instead of pips
                const SPECIAL_ICONS = { HOMING: '🎯', PIERCE: '🔥', LASER: '⚡', MISSILE: '🚀', SHIELD: '🛡️', SPEED: '💨' };
                const icon = SPECIAL_ICONS[this._weaponState.special] || '?';
                const timer = this._weaponState.specialTimer;
                const maxTimer = window.Game.Balance.WEAPON_EVOLUTION.SPECIAL_DURATION; // From config
                const ratio = Math.min(1, timer / maxTimer);

                // Countdown arc
                ctx.strokeStyle = CU.rgba(255, 215, 0, 0.6);
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(0, wp.Y_OFFSET, 10, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio);
                ctx.stroke();

                // Icon
                ctx.font = '10px monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = CU.rgba(255, 255, 255, 0.8);
                ctx.fillText(icon, 0, wp.Y_OFFSET);
            } else {
                // Normal: shot level triangles
                for (let i = 0; i < maxLevel; i++) {
                    const px = startX + i * wp.SPACING;
                    const py = wp.Y_OFFSET;
                    const isFull = i < shotLevel;
                    const s = wp.SIZE;

                    // Check modifier glow
                    let glowColor = null;
                    const mods = this._weaponState.modifiers;
                    if (mods?.rate?.level > 0 && i === 0) glowColor = 'rgba(0, 255, 255, 0.6)';
                    if (mods?.power?.level > 0 && i === 1) glowColor = 'rgba(255, 68, 68, 0.6)';
                    if (mods?.spread?.level > 0 && i === 2) glowColor = 'rgba(155, 89, 182, 0.6)';

                    ctx.beginPath();
                    ctx.moveTo(px, py - s);
                    ctx.lineTo(px - s * 0.7, py + s * 0.5);
                    ctx.lineTo(px + s * 0.7, py + s * 0.5);
                    ctx.closePath();

                    if (isFull) {
                        ctx.fillStyle = glowColor || CU.rgba(255, 255, 255, wp.FULL_ALPHA);
                        ctx.fill();
                        if (glowColor) {
                            // v4.11: Double-fill with color instead of shadowBlur (GPU-heavy)
                            ctx.globalAlpha = 0.4;
                            ctx.beginPath();
                            ctx.arc(px, py, wp.SIZE * 1.5, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.globalAlpha = 1;
                        }
                    } else {
                        ctx.fillStyle = CU.rgba(128, 128, 128, wp.EMPTY_ALPHA);
                        ctx.fill();
                    }
                }
            }
        }

        // 4a. GODCHAIN AURA (red/orange pulsing glow)
        if (this._godchainActive) {
            const gcCfg = window.Game.Balance?.GODCHAIN?.AURA;
            if (gcCfg) {
                const _glowCfgGC = window.Game.Balance?.GLOW;
                const _useAdditiveGC = _glowCfgGC?.ENABLED && _glowCfgGC?.AURA?.ENABLED;
                if (_useAdditiveGC) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; }
                const pulse = Math.sin(this.animTime * gcCfg.PULSE_SPEED) * 0.05 + gcCfg.ALPHA;
                const gradient = ctx.createRadialGradient(0, 0, gcCfg.INNER_RADIUS, 0, 0, gcCfg.OUTER_RADIUS);
                gradient.addColorStop(0, CU.rgba(255, 68, 0, pulse));
                gradient.addColorStop(0.5, CU.rgba(255, 100, 0, pulse * 0.6));
                gradient.addColorStop(1, 'transparent');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(0, 0, gcCfg.OUTER_RADIUS, 0, Math.PI * 2);
                ctx.fill();
                if (_useAdditiveGC) { ctx.restore(); }
            }
        }

        // 4. GRAZE PROXIMITY GLOW
        if (config.GRAZE_GLOW?.ENABLED && typeof this._grazePercent === 'number') {
            const gg = config.GRAZE_GLOW;
            const percent = this._grazePercent;

            if (percent >= gg.THRESHOLD) {
                const isHyperReady = percent >= 100;
                const ratio = (percent - gg.THRESHOLD) / (100 - gg.THRESHOLD);
                let alpha, color;

                if (isHyperReady) {
                    // Gold pulsing glow
                    alpha = gg.HYPER_READY_ALPHA + Math.sin(this.animTime * 6) * 0.05;
                    color = CU.rgba(255, 215, 0, alpha);
                } else {
                    // Pink/magenta glow
                    alpha = gg.MIN_ALPHA + ratio * (gg.MAX_ALPHA - gg.MIN_ALPHA);
                    color = CU.rgba(255, 105, 180, alpha);
                }

                const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, gg.RADIUS);
                gradient.addColorStop(0, color);
                gradient.addColorStop(1, 'transparent');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(0, 0, gg.RADIUS, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    takeDamage() {
        if (this.invulnTimer > 0 || this.shieldActive) return false;

        this.hp--;
        this.invulnTimer = window.Game.Balance.PLAYER.INVULN_DURATION;
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
        const Balance = window.Game.Balance;
        const PU = Balance.POWERUPS;

        const baseWeapons = ['WIDE', 'NARROW', 'FIRE'];
        const advWeapons = ['SPREAD', 'HOMING'];
        const eliteWeapons = ['LASER'];
        const shipTypes = ['SPEED', 'RAPID', 'SHIELD'];

        if (baseWeapons.includes(type)) {
            this.weapon = type;
            this.weaponTimer = PU.DURATION_WEAPON_BASE;
        } else if (advWeapons.includes(type)) {
            this.weapon = type;
            this.weaponTimer = PU.DURATION_WEAPON_ADV;
        } else if (eliteWeapons.includes(type)) {
            this.weapon = type;
            this.weaponTimer = PU.DURATION_WEAPON_ELITE;
        } else if (shipTypes.includes(type)) {
            if (type === 'SHIELD') {
                this.activateShield();
                this.shieldCooldown = 0;
                this.shieldTimer = PU.DURATION_SHIELD;
            } else if (type === 'SPEED') {
                this.shipPowerUp = type;
                this.shipPowerUpTimer = PU.DURATION_SPEED;
            } else if (type === 'RAPID') {
                this.shipPowerUp = type;
                this.shipPowerUpTimer = PU.DURATION_RAPID;
            }
        }
    }

    // === WEAPON EVOLUTION v3.0 METHODS ===

    /**
     * Apply a new-style power-up (UPGRADE, modifier, or special)
     * @param {string} type - Power-up type from POWERUP_TYPES
     */
    applyPowerUp(type) {
        const WE = window.Game.Balance.WEAPON_EVOLUTION;
        if (!WE) {
            // Fallback to legacy system
            this.upgrade(type);
            return;
        }

        const Audio = window.Game.Audio;

        // UPGRADE: permanent shot level increase
        if (type === 'UPGRADE') {
            if (this.shotLevel < WE.MAX_SHOT_LEVEL) {
                this.shotLevel++;
                if (Audio) Audio.play('levelUp');
                if (window.Game.Debug) window.Game.Debug.trackWeaponEvent('UPGRADE', 'SHOT_LV' + this.shotLevel);

                // Emit event for UI feedback
                if (window.Game.Events) {
                    window.Game.Events.emit('SHOT_LEVEL_UP', { level: this.shotLevel });
                }
            }
            return;
        }

        // Modifiers: RATE, POWER, SPREAD (stackable with timer refresh)
        if (type === 'RATE' || type === 'POWER' || type === 'SPREAD') {
            const modKey = type.toLowerCase();
            const modConfig = WE[type];
            const mod = this.modifiers[modKey];

            // Stack level (up to max), refresh timer
            mod.level = Math.min(modConfig.MAX_LEVEL, mod.level + 1);
            mod.timer = WE.MODIFIER_DURATION;
            if (window.Game.Debug) window.Game.Debug.trackWeaponEvent('MODIFIER', type + '_LV' + mod.level);

            if (Audio) Audio.play('coinPerk');

            // Emit event for UI
            if (window.Game.Events) {
                window.Game.Events.emit('MODIFIER_APPLIED', {
                    type: type,
                    level: mod.level,
                    timer: mod.timer
                });
            }
            return;
        }

        // Specials: HOMING, PIERCE, LASER, MISSILE, SHIELD, SPEED (exclusive, replace each other)
        const specials = ['HOMING', 'PIERCE', 'LASER', 'MISSILE', 'SHIELD', 'SPEED'];
        if (specials.includes(type)) {
            // SHIELD special = instant activation, not timed special
            if (type === 'SHIELD') {
                this.activateShield();
                this.shieldCooldown = 0;
                this.shieldTimer = 3.0; // Longer duration from power-up
                if (Audio) Audio.play('shield');
                return;
            }

            // Other specials: set as active special with timer
            this.special = type;
            this.specialTimer = WE.SPECIAL_DURATION;
            if (window.Game.Debug) window.Game.Debug.trackWeaponEvent('SPECIAL', type);

            if (Audio) Audio.play('powerUp');

            // Emit event for UI
            if (window.Game.Events) {
                window.Game.Events.emit('SPECIAL_APPLIED', {
                    type: type,
                    timer: this.specialTimer
                });
            }
            return;
        }

        // Unknown type - try legacy system
        this.upgrade(type);
    }

    /**
     * Apply death penalty: reduce levels in all categories
     * Called when player loses a life
     */
    applyDeathPenalty() {
        const WE = window.Game.Balance.WEAPON_EVOLUTION;
        if (!WE) return;

        const penalty = WE.DEATH_PENALTY || 1;

        // Shot level: min 1
        this.shotLevel = Math.max(1, this.shotLevel - penalty);

        // Modifiers: reduce level, clear timer if level becomes 0
        for (const modKey of ['rate', 'power', 'spread']) {
            const mod = this.modifiers[modKey];
            mod.level = Math.max(0, mod.level - penalty);
            if (mod.level === 0) {
                mod.timer = 0;
            }
        }

        // Special: lost completely on death
        this.special = null;
        this.specialTimer = 0;

        if (window.Game.Debug) window.Game.Debug.trackWeaponEvent('DEATH_PENALTY', 'SHOT_LV' + this.shotLevel);

        // Emit event for UI update
        if (window.Game.Events) {
            window.Game.Events.emit('DEATH_PENALTY_APPLIED', {
                shotLevel: this.shotLevel,
                modifiers: {
                    rate: this.modifiers.rate.level,
                    power: this.modifiers.power.level,
                    spread: this.modifiers.spread.level
                }
            });
        }
    }

    /**
     * Get current weapon state for HUD display
     * @returns {Object} Current weapon evolution state
     */
    getWeaponState() {
        return {
            shotLevel: this.shotLevel,
            modifiers: {
                rate: { level: this.modifiers.rate.level, timer: this.modifiers.rate.timer },
                power: { level: this.modifiers.power.level, timer: this.modifiers.power.timer },
                spread: { level: this.modifiers.spread.level, timer: this.modifiers.spread.timer }
            },
            special: this.special,
            specialTimer: this.specialTimer
        };
    }

}



window.Game.Player = Player;
