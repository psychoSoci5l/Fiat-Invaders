window.Game = window.Game || {};

class Player extends window.Game.Entity {
    constructor(gameWidth, gameHeight) {
        const P = window.Game.Balance.PLAYER;
        super(gameWidth / 2, gameHeight - P.SPAWN_OFFSET_Y, 42, 42);
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

        // === WEAPON EVOLUTION v5.11 (3-Level Boss Evolution) ===
        // Weapon level (1-3): permanent for entire run (no death penalty)
        // HYPER adds +2 temporary levels (max effective LV5)
        this.weaponLevel = 1;

        // Special (exclusive, temp): HOMING/PIERCE/MISSILE
        this.special = null;
        this.specialTimer = 0;

        this.shieldActive = false;
        this.shieldTimer = 0;
        this.shieldCooldown = 0;
        this._shieldAnim = 0;       // v5.7: hexgrid animation timer
        this._shieldFade = 0;       // v5.7: deactivation fade (1→0)

        // v4.0.2: ETH Smart Contract - consecutive hit tracking
        this.smartContractTarget = null;  // Enemy ID being hit consecutively
        this.smartContractTimer = 0;      // Time since last hit on same target
        this.smartContractStacks = 0;     // Number of consecutive hits

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
        this.godchainTimer = 0;       // v4.48: temporary duration
        this._godchainPending = false; // v4.48: activation trigger
        this.godchainCooldown = 0;    // v5.15.1: cooldown after GODCHAIN ends

        // v5.20: Auto-cannon system (ship starts bare, cannon mounts automatically)
        this._cannonMounted = false;
        this._cannonMountTimer = 0; // countdown to auto-mount (set on game start)

        // Weapon deployment animation (v5.2)
        this._deploy = {
            active: false,
            timer: 0,
            duration: 0,
            fromLevel: 1,
            toLevel: 1,
            t: 0,
            _lockFired: false,
            _fromGeom: null,
            _toGeom: null,
            _isMounting: false  // v5.23: cannon mount via deploy system
        };
        // Geometry cache (used by _drawShipBody and _drawMuzzleFlash)
        this._geom = {
            podX: 0, podTop: 0, podW: 0,
            barrelTop: 0, barrelW: 0,
            bodyHalfW: 22, finExt: 0
        };

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

        // v5.13: Elemental VFX state
        this._elemPulse = { active: false, timer: 0, duration: 0, color: '', alpha: 0 };
        this._elemFrameCount = 0;
        this._electricArcs = [];
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
        this.godchainTimer = 0;
        this._godchainPending = false;
        this.godchainCooldown = 0;

        // Weapon deploy animation reset
        this._deploy.active = false;
        this._deploy._isMounting = false;

        // v5.13: Elemental VFX reset
        this._elemPulse.active = false;
        this._elemPulse.timer = 0;
        this._elemFrameCount = 0;
        this._electricArcs = [];

        // Weapon Evolution reset (soft reset - keep weaponLevel on normal reset)
        // Note: applyDeathPenalty() handles death penalty separately
        this.special = null;
        this.specialTimer = 0;
    }

    /**
     * Full reset for new game (resets weapon level too)
     */
    fullReset() {
        this.weaponLevel = 1;
        this._cannonMounted = false;
        this._cannonMountTimer = 1.5; // Auto-mount after 1.5s
        this.resetState();
    }

    /**
     * v5.20: Mount cannon on ship (auto-trigger or from powerup).
     * Triggers deploy VFX — flash, burst, aura.
     */
    mountCannon() {
        if (this._cannonMounted) return;
        this._cannonMountTimer = 0;

        // v5.23: Use full deploy animation system for cinematic cannon mount
        const cfg = window.Game.Balance?.VFX?.WEAPON_DEPLOY;
        if (!cfg || !cfg.ENABLED) {
            // No animation — instant mount
            this._cannonMounted = true;
            return;
        }

        const d = this._deploy;
        d.active = true;
        d.timer = 0;
        d.duration = cfg.DURATION;
        d.fromLevel = 0;
        d.toLevel = 1;
        d.t = 0;
        d._lockFired = false;
        d._isMounting = true;
        // Same geometry (level 1→1), the visual change is nose cannon appearing at lock-in
        d._fromGeom = this._computeGeomForLevel(1);
        d._toGeom = this._computeGeomForLevel(1);
        d.flashTimer = cfg.FLASH_DURATION || 0.2;
        d.brighten = true;
        d.auraPulse = 0;

        // Start SFX
        const Audio = window.Game.Audio;
        if (Audio) Audio.play('weaponDeploy');
        // Particle trail from top to ship
        const PS = window.Game.ParticleSystem;
        if (PS && PS.createCannonMountTrail) PS.createCannonMountTrail(this.x, this.y, this.gameWidth);
    }

    /**
     * v5.13: Trigger elemental pickup pulse on ship
     * @param {string} elementType - FIRE/LASER/ELECTRIC/GODCHAIN
     */
    triggerElementalPulse(elementType) {
        const cfg = window.Game.Balance?.ELEMENTAL_VFX?.PICKUP_SURGE;
        if (!cfg) return;
        const colorCfg = cfg.COLORS[elementType] || cfg.COLORS.FIRE;
        this._elemPulse.active = true;
        this._elemPulse.timer = cfg.SHIP_PULSE_DURATION;
        this._elemPulse.duration = cfg.SHIP_PULSE_DURATION;
        this._elemPulse.color = colorCfg.hex;
        this._elemPulse.alpha = 0.5;
    }

    /**
     * Update weapon evolution state (special timer only — modifiers removed in v4.47)
     */
    updateWeaponState(dt) {
        const WE = window.Game.Balance.WEAPON_EVOLUTION;
        if (!WE) return;

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
     * Check if GODCHAIN is active (timer-based)
     */
    isGodchainActive() {
        return this.godchainTimer > 0;
    }

    /**
     * v4.60: Activate GODCHAIN from elemental perk system
     */
    activateGodchain() {
        this._godchainPending = true;
    }

    update(dt, blockFiring = false) {
        const input = window.Game.Input;
        const Balance = window.Game.Balance;
        const WE = Balance.WEAPON_EVOLUTION;

        // Speed calculation: check both legacy and utility systems
        let speedMult = 1;
        if (this.shipPowerUp === 'SPEED') {
            speedMult = WE?.SPEED_MULTIPLIER || 1.4; // Utility system
        }
        // GODCHAIN speed bonus
        if (this._godchainActive && Balance.GODCHAIN) {
            speedMult *= Balance.GODCHAIN.SPEED_BONUS;
        }
        let speed = this.stats.speed * this.getRunMod('speedMult', 1) * speedMult;
        // Arcade modifier: player speed
        const _abSpeed = window.Game.RunState && window.Game.RunState.arcadeBonuses;
        if (_abSpeed && _abSpeed.speedMult !== 1.0) speed *= _abSpeed.speedMult;

        // Animation timer for visual effects
        this.animTime += dt;
        if (this.muzzleFlash > 0) this.muzzleFlash -= dt;

        // v5.13: Elemental pulse timer + frame counter
        this._elemFrameCount++;
        if (this._elemPulse.active) {
            this._elemPulse.timer -= dt;
            if (this._elemPulse.timer <= 0) this._elemPulse.active = false;
        }

        // v5.20: Auto-cannon mount timer
        if (this._cannonMountTimer > 0) {
            this._cannonMountTimer -= dt;
            if (this._cannonMountTimer <= 0) this.mountCannon();
        }

        // Weapon deployment animation tick
        if (this._deploy.active) this._updateDeploy(dt);
        // v5.20: Aura pulse decay (runs after deploy completes)
        if (this._deploy.auraPulse > 0) this._deploy.auraPulse -= dt;

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

        // v5.7: Update position for tap-on-ship shield detection
        if (window.Game.Input) window.Game.Input.updatePlayerPos(this.x, this.y);

        // Bank angle for visual effect (optional extra juice)
        this.rotation = this.vx * 0.0005;

        // Timers
        if (this.shieldActive) {
            this.shieldTimer -= dt;
            this._shieldAnim += dt;
            this._shieldFade = 1;
            if (this.shieldTimer <= 0) {
                this.shieldActive = false;
                this._shieldFade = 1; // start fade-out
                if (window.Game.Audio) window.Game.Audio.play('shieldDeactivate');
            }
        } else if (this._shieldFade > 0) {
            this._shieldFade -= dt * 3; // 0.33s fade-out
            this._shieldAnim += dt;
            if (this._shieldFade <= 0) this._shieldFade = 0;
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

        // v4.48: GODCHAIN activation — trigger when pending (v5.15.1: respect cooldown)
        if (this._godchainPending) {
            if (this.godchainCooldown <= 0) {
                const dur = window.Game.Balance?.GODCHAIN?.DURATION || 10;
                this.godchainTimer = dur;
            }
            this._godchainPending = false;
        }

        // GODCHAIN cooldown countdown
        if (this.godchainCooldown > 0) {
            this.godchainCooldown -= dt;
            if (this.godchainCooldown < 0) this.godchainCooldown = 0;
        }

        // GODCHAIN timer countdown
        if (this.godchainTimer > 0) {
            this.godchainTimer -= dt;
            if (this.godchainTimer <= 0) this.godchainTimer = 0;
        }

        // GODCHAIN state detection
        const wasGodchain = this._godchainActive;
        this._godchainActive = this.isGodchainActive();
        if (this._godchainActive && !wasGodchain) {
            if (window.Game.Events) window.Game.Events.emit('GODCHAIN_ACTIVATED');
            if (window.Game.Audio) window.Game.Audio.play('godchainActivate');
            if (window.Game.Input) window.Game.Input.vibrate([80, 40, 80, 40, 80]);
            if (window.Game.Debug) window.Game.Debug.trackGodchainActivate();
        } else if (!this._godchainActive && wasGodchain) {
            this.godchainCooldown = window.Game.Balance?.GODCHAIN?.COOLDOWN || 10;
            if (window.Game.Events) window.Game.Events.emit('GODCHAIN_DEACTIVATED');
            if (window.Game.Debug) window.Game.Debug.trackGodchainDeactivate();
        }

        // GODCHAIN particle sparks
        if (this._godchainActive && window.Game.ParticleSystem && Math.random() < 0.33) {
            const colors = ['#ff4400', '#ff6600', '#ffaa00'];
            window.Game.ParticleSystem.addParticle({
                x: this.x + (Math.random() - 0.5) * 30,
                y: this.y + (Math.random() - 0.5) * 30,
                vx: (Math.random() - 0.5) * 40,
                vy: -Math.random() * 60 - 20,
                life: 0.4, maxLife: 0.4,
                size: 2 + Math.random() * 2,
                color: colors[Math.floor(Math.random() * 3)]
            });
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
        this.shieldTimer = window.Game.Balance?.PLAYER?.SHIELD_DURATION || 5.0;
        const shieldCD = window.Game.Balance?.PLAYER?.SHIELD_COOLDOWN || 10.0;
        this.shieldCooldown = shieldCD;
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
        // Play Sound
        window.Game.Audio.play('shoot');
        window.Game.Input.vibrate(Balance.PLAYER.FIRE_VIBRATION_MS);
        this.muzzleFlash = Balance.PLAYER.MUZZLE_FLASH_DURATION;

        return this.fireEvolution();
    }

    /**
     * Weapon Evolution v4.47 fire system
     * Linear 5-level progression, HYPER adds +2 temporary levels
     */
    fireEvolution() {
        const Balance = window.Game.Balance;
        const WE = Balance.WEAPON_EVOLUTION;
        const bullets = [];

        // v5.11: Effective weapon level: base + HYPER boost (capped at 5)
        let effectiveLevel = this.weaponLevel;
        if (this.hyperActive) {
            effectiveLevel = Math.min(5, effectiveLevel + (WE.HYPER_LEVEL_BOOST || 2));
        }

        // Lookup level data from table
        const levelData = WE.LEVELS[effectiveLevel] || WE.LEVELS[1];

        // Calculate fire rate from level table
        let cooldown = this.stats.fireRate * levelData.cooldownMult;
        // Arcade modifier: fire rate
        const _ab = window.Game.RunState && window.Game.RunState.arcadeBonuses;
        if (_ab && _ab.fireRateMult !== 1.0) cooldown *= _ab.fireRateMult;
        this.cooldown = cooldown;

        // Damage multiplier from level table
        let damageMult = levelData.damageMult;
        // Arcade modifier: damage
        if (_ab && _ab.damageMult !== 1.0) damageMult *= _ab.damageMult;
        // Arcade modifier: critical hit
        if (_ab && _ab.critChance > 0 && Math.random() < _ab.critChance) damageMult *= _ab.critMult;

        // Spread angle from level table
        const spreadAngle = levelData.spreadDeg * (Math.PI / 180);

        // Bullet setup
        const color = this.stats.color;
        const bulletW = 7;
        const bulletH = 22;
        const bulletSpeed = 765;

        // Special-specific spawn function
        const spawnBullet = (offsetX, angleOffset) => {
            const angle = -Math.PI / 2 + angleOffset;

            let w = bulletW;
            let h = bulletH;
            let bSpeed = bulletSpeed;

            // Adjust for special types
            if (this.special === 'MISSILE') {
                w = 9;
                h = 18;
                bSpeed = bulletSpeed * 0.7;
            } else if (this.special === 'HOMING') {
                w = 9;
                h = 18;
                bSpeed = bulletSpeed * 0.6;
            }

            const finalVx = Math.cos(angle) * bSpeed;
            const finalVy = Math.sin(angle) * bSpeed;

            const b = window.Game.Bullet.Pool.acquire(
                this.x + offsetX,
                this.y - 33,
                finalVx,
                finalVy,
                color,
                w,
                h,
                false
            );

            // Apply damage multiplier
            b.damageMult = damageMult;
            // v4.48: Missile damage bonus (compensates reduced projectile count)
            if (this.special === 'MISSILE') {
                b.damageMult *= (WE.MISSILE_DAMAGE_BONUS || 2.0);
            }

            // Apply special properties
            b.special = this.special;

            if (this.special === 'PIERCE') {
                b.penetration = true;
            }
            if (this.special === 'HOMING') {
                b.homing = true;
                b.homingSpeed = 4.0;
            }
            if (this.special === 'MISSILE') {
                b.isMissile = true;
                b.aoeRadius = 50;
            }

            // Bullet pierce HP (scales with weapon level + Kinetic Rounds perk)
            const BP = Balance.BULLET_PIERCE;
            const pierceBonusHP = this.getRunMod('pierceBonusHP', 0);
            if (b.isMissile) {
                b.pierceHP = BP.MISSILE_HP + pierceBonusHP;
            } else {
                b.pierceHP = BP.BASE_HP
                    + Math.floor(effectiveLevel * (BP.LEVEL_BONUS || 0.5))
                    + pierceBonusHP;
            }

            // Arcade modifier: extra pierce
            if (_ab && _ab.piercePlus > 0) b.pierceHP += _ab.piercePlus;

            b.weaponType = this.special || 'EVOLUTION';
            b._spawnY = this.y; // v5.20: Clamp beam tail
            if (this.hyperActive) b._isHyper = true;
            if (this._godchainActive) b._isGodchain = true;

            // v4.60: Elemental perk flags on bullets
            const rs = window.Game.RunState;
            if (rs) {
                b._elemFire = rs.hasFirePerk;
                b._elemLaser = rs.hasLaserPerk;
                b._elemElectric = rs.hasElectricPerk;
                // Laser perk: +25% speed, +1 pierce
                if (rs.hasLaserPerk) {
                    const laserCfg = Balance.ELEMENTAL?.LASER;
                    b.vy *= (laserCfg?.SPEED_MULT || 1.25);
                    b.pierceHP += (laserCfg?.PIERCE_BONUS || 1);
                }
            }

            bullets.push(b);
        };

        // v4.48: Missile optimization — fewer projectiles, more damage
        let bulletCount = levelData.bullets;
        if (this.special === 'MISSILE' && WE.MISSILE_BULLET_DIVISOR) {
            bulletCount = Math.max(1, Math.floor(bulletCount / WE.MISSILE_BULLET_DIVISOR));
        }

        // v5.20: Beam positions match visual weapon level (not HYPER-boosted effectiveLevel)
        // DPS stays identical — fewer beams get proportional damage compensation
        const gm = this._geom;
        const visualBullets = (WE.LEVELS[this.weaponLevel] || WE.LEVELS[1]).bullets;
        const spawnCount = Math.min(bulletCount, visualBullets);

        if (spawnCount === 1) {
            spawnBullet(0, 0);
        } else if (spawnCount === 2) {
            const ox = gm.podX || 18;
            spawnBullet(-ox, -spreadAngle / 2);
            spawnBullet(+ox, +spreadAngle / 2);
        } else {
            // 3 bullets — side pods + central barrel
            const ox = gm.podX || 20;
            spawnBullet(-ox, -spreadAngle);
            spawnBullet(0, 0);
            spawnBullet(+ox, +spreadAngle);
        }

        // Compensate DPS when HYPER reduces visual beam count
        if (spawnCount < bulletCount) {
            const comp = bulletCount / spawnCount;
            for (const b of bullets) b.damageMult *= comp;
        }

        return bullets;
    }

    draw(ctx) {
        if (this.invulnTimer > 0 && Math.floor(Date.now() / 100) % 2 === 0) return;

        const Balance = window.Game.Balance;
        const CU = window.Game.ColorUtils;

        // HYPER MODE AURA - Intense golden aura
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
            ctx.arc(this.x, this.y, 58, -Math.PI / 2, -Math.PI / 2 + ringAngle);
            ctx.stroke();

            // Orbiting energy orbs
            for (let i = 0; i < 6; i++) {
                const angle = this.animTime * 5 + (Math.PI / 3) * i;
                const dist = 53 + Math.sin(this.animTime * 8 + i) * 6;
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

                // Simplified chevron shape
                ctx.fillStyle = this.stats.color;
                ctx.beginPath();
                ctx.moveTo(0, -28);
                ctx.lineTo(-18, -4);
                ctx.lineTo(-18, 12);
                ctx.lineTo(0, 8);
                ctx.lineTo(18, 12);
                ctx.lineTo(18, -4);
                ctx.closePath();
                ctx.fill();

                ctx.restore();
            }
        }

        ctx.save();
        ctx.translate(this.x, this.y);

        // Reactor flame (animated) - 4-layer cell-shaded style
        // v4.55: flame scales with weapon level
        const _flameLvl = this.weaponLevel ?? 1;
        const _flameMult = 1 + (_flameLvl - 1) * 0.12; // LV1=1.0, LV3=1.24, LV5=1.48
        const flameHeight = (20 + Math.sin(this.animTime * 12) * 8) * _flameMult;
        const flameWidth = (10 + Math.sin(this.animTime * 10) * 3) * _flameMult;
        const pulse = 1 + Math.sin(this.animTime * 8) * 0.1;

        // Outer glow (red, largest)
        ctx.fillStyle = '#cc3300';
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.moveTo(-flameWidth * 1.3 * pulse, 14);
        ctx.lineTo(0, 14 + flameHeight * 1.1);
        ctx.lineTo(flameWidth * 1.3 * pulse, 14);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;

        // Main flame (orange)
        ctx.fillStyle = '#ff6600';
        ctx.beginPath();
        ctx.moveTo(-flameWidth, 14);
        ctx.lineTo(0, 14 + flameHeight);
        ctx.lineTo(flameWidth, 14);
        ctx.closePath();
        ctx.fill();

        // Inner flame (yellow)
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath();
        ctx.moveTo(-flameWidth * 0.5, 14);
        ctx.lineTo(0, 14 + flameHeight * 0.65);
        ctx.lineTo(flameWidth * 0.5, 14);
        ctx.closePath();
        ctx.fill();

        // Hot core (white)
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(-flameWidth * 0.2, 14);
        ctx.lineTo(0, 14 + flameHeight * 0.3);
        ctx.lineTo(flameWidth * 0.2, 14);
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
            ctx.arc(0, 16, ec.RADIUS, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // v4.48: GODCHAIN FIRE_TRAIL — animated fire tongues behind ship
        if (this._godchainActive) {
            const ft = window.Game.Balance?.GODCHAIN?.FIRE_TRAIL;
            if (ft) {
                for (let i = 0; i < ft.TONGUE_COUNT; i++) {
                    const phase = this.animTime * 8 + i * 1.3;
                    const flickerX = Math.sin(phase) * 6;
                    const flickerLen = ft.LENGTH * (0.7 + Math.sin(phase * 1.5) * 0.3);
                    ctx.globalAlpha = ft.ALPHA * (0.6 + Math.sin(phase * 2) * 0.4);
                    ctx.fillStyle = ft.COLORS[i % ft.COLORS.length];
                    ctx.beginPath();
                    ctx.moveTo(flickerX - 3, 20);
                    ctx.lineTo(flickerX + 3, 20);
                    ctx.lineTo(flickerX, 20 + flickerLen);
                    ctx.closePath();
                    ctx.fill();
                }
                ctx.globalAlpha = 1;
            }
        }

        // Side thrusters (small flames on fins when moving)
        if (Math.abs(this.vx) > 50) {
            const sideFlameH = 8 + Math.sin(this.animTime * 15) * 3;
            ctx.fillStyle = '#ff8800';
            if (this.vx > 0) {
                // Moving right, left thruster fires
                ctx.beginPath();
                ctx.moveTo(-34, 18);
                ctx.lineTo(-38, 18 + sideFlameH);
                ctx.lineTo(-30, 18);
                ctx.closePath();
                ctx.fill();
            } else {
                // Moving left, right thruster fires
                ctx.beginPath();
                ctx.moveTo(34, 18);
                ctx.lineTo(38, 18 + sideFlameH);
                ctx.lineTo(30, 18);
                ctx.closePath();
                ctx.fill();
            }
        }

        // v5.13: Elemental aura (before ship body, behind it)
        this._drawElementalAura(ctx);

        // v4.55: Ship evolution — visual form scales with weaponLevel
        this._drawShipBody(ctx);

        // v5.20: Deploy flash overlay (white pulse on ship body)
        const _d = this._deploy;
        const _dcfg = window.Game.Balance?.VFX?.WEAPON_DEPLOY;
        if (_d.flashTimer > 0 && _dcfg) {
            const flashAlpha = (_dcfg.FLASH_ALPHA || 0.6) * (_d.flashTimer / (_dcfg.FLASH_DURATION || 0.2));
            ctx.fillStyle = CU.rgba(255, 255, 255, flashAlpha);
            ctx.beginPath();
            ctx.arc(0, 0, 40, 0, Math.PI * 2);
            ctx.fill();
        }
        // v5.20: Deploy brightening tint (additive white over ship)
        if (_d.active && _d.brighten && _dcfg) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = CU.rgba(255, 255, 255, _dcfg.BRIGHTEN_AMOUNT || 0.3);
            ctx.beginPath();
            ctx.arc(0, 0, 35, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // v5.13: Elemental pickup pulse (over ship body)
        this._drawElementalPulse(ctx);

        // v5.1: Directional muzzle flash (canvas V-flash)
        this._drawMuzzleFlash(ctx);

        // v5.7: Hexgrid Energy Shield
        if (this.shieldActive || this._shieldFade > 0) {
            this._drawHexShield(ctx);
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

        // v5.20: Post-deploy aura pulse (expanding ring, world coords)
        if (this._deploy.auraPulse > 0 && _dcfg) {
            const auraDur = _dcfg.AURA_PULSE_DURATION || 0.3;
            const auraP = 1 - (this._deploy.auraPulse / auraDur);
            const auraR = (_dcfg.AURA_PULSE_RADIUS || 50) * auraP;
            const auraAlpha = 0.6 * (1 - auraP);
            ctx.strokeStyle = CU.rgba(0, 240, 255, auraAlpha);
            ctx.lineWidth = 3 * (1 - auraP) + 1;
            ctx.beginPath();
            ctx.arc(0, 0, auraR, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();
    }

    /**
     * v5.10: Shield Fin Glow — cyan glow on fins indicating shield cooldown/ready
     * Called from _drawShipBody after fins are drawn, in translated coords
     */
    _drawShieldFinGlow(ctx, bodyHalfW, finExt, wingY, rearY) {
        const cfg = window.Game.Balance?.DIEGETIC_HUD?.SHIELD_FIN_GLOW;
        if (!cfg?.ENABLED) return;
        if (this.shieldActive) return; // hex shield visible, skip fin glow

        const CU = window.Game.ColorUtils;
        const maxCD = window.Game.Balance.PLAYER.SHIELD_COOLDOWN;
        const inCooldown = this.shieldCooldown > 0;
        const progress = inCooldown ? 1 - (this.shieldCooldown / maxCD) : 1;

        if (progress <= 0) return;

        let alpha;
        if (inCooldown) {
            alpha = cfg.COOLDOWN_ALPHA * progress;
        } else {
            const pulse = Math.sin(this.animTime * cfg.READY_PULSE_SPEED);
            alpha = cfg.READY_ALPHA + pulse * cfg.READY_PULSE_AMP;
        }

        const finOffset = finExt > 4 ? 2 : 0;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        // Ready glow spread — radial glow at fin tips
        if (!inCooldown && cfg.GLOW_SPREAD > 0) {
            const gs = cfg.GLOW_SPREAD;
            const tipLX = -40 - finExt;
            const tipRX = 40 + finExt;
            const tipY = rearY + finOffset;
            const glowAlpha = alpha * 0.5;
            const grad1 = ctx.createRadialGradient(tipLX, tipY, 0, tipLX, tipY, gs * 2);
            grad1.addColorStop(0, CU.rgba(0, 240, 255, glowAlpha));
            grad1.addColorStop(1, 'transparent');
            ctx.fillStyle = grad1;
            ctx.fillRect(tipLX - gs * 2, tipY - gs * 2, gs * 4, gs * 4);
            const grad2 = ctx.createRadialGradient(tipRX, tipY, 0, tipRX, tipY, gs * 2);
            grad2.addColorStop(0, CU.rgba(0, 240, 255, glowAlpha));
            grad2.addColorStop(1, 'transparent');
            ctx.fillStyle = grad2;
            ctx.fillRect(tipRX - gs * 2, tipY - gs * 2, gs * 4, gs * 4);
        }

        // Fin overlay triangles (same geometry as fins)
        ctx.fillStyle = CU.rgba(0, 240, 255, alpha);
        ctx.lineWidth = 0;

        // Left fin glow
        ctx.beginPath();
        ctx.moveTo(-bodyHalfW, wingY + 2);
        ctx.lineTo(-40 - finExt, rearY + finOffset);
        ctx.lineTo(-bodyHalfW + 6, rearY + 2);
        ctx.closePath();
        ctx.fill();

        // Right fin glow
        ctx.beginPath();
        ctx.moveTo(bodyHalfW, wingY + 2);
        ctx.lineTo(40 + finExt, rearY + finOffset);
        ctx.lineTo(bodyHalfW - 6, rearY + 2);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    /**
     * v5.13: Elemental aura — persistent glow + ambient particles per active perk
     * Called in translated coords (0,0 = ship center)
     */
    _drawElementalAura(ctx) {
        const auraCfg = window.Game.Balance?.ELEMENTAL_VFX?.SHIP_AURA;
        if (!auraCfg?.ENABLED) return;
        const glowEnabled = window.Game.Balance?.GLOW?.ENABLED;
        if (!glowEnabled) return;

        const rs = window.Game.RunState;
        if (!rs) return;
        const perkLvl = rs.perkLevel || 0;
        if (perkLvl <= 0) return;

        const CU = window.Game.ColorUtils;
        const PS = window.Game.ParticleSystem;
        let alphaMult = 1.0;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        // Fire aura (perkLevel >= 1)
        if (perkLvl >= 1) {
            const fc = auraCfg.FIRE;
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, fc.GLOW_RADIUS);
            grad.addColorStop(0, CU.rgba(fc.COLOR[0], fc.COLOR[1], fc.COLOR[2], fc.GLOW_ALPHA * alphaMult));
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, fc.GLOW_RADIUS, 0, Math.PI * 2);
            ctx.fill();
            // Emit ember particle (world coords)
            if (PS && this._elemFrameCount % fc.EMBER_INTERVAL === 0) {
                const angle = Math.random() * Math.PI * 2;
                PS.addParticle({
                    x: this.x + (Math.random() - 0.5) * 10,
                    y: this.y + 5,
                    vx: Math.cos(angle) * fc.EMBER_SPEED * 0.5,
                    vy: -fc.EMBER_SPEED + Math.random() * 10,
                    life: fc.EMBER_LIFE, maxLife: fc.EMBER_LIFE,
                    color: '#ff6600', size: fc.EMBER_SIZE,
                    gravity: -30
                });
            }
            alphaMult *= auraCfg.STACK_ALPHA_MULT;
        }

        // Laser aura (perkLevel >= 2)
        if (perkLvl >= 2) {
            const lc = auraCfg.LASER;
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, lc.GLOW_RADIUS);
            grad.addColorStop(0, CU.rgba(lc.COLOR[0], lc.COLOR[1], lc.COLOR[2], lc.GLOW_ALPHA * alphaMult));
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, lc.GLOW_RADIUS, 0, Math.PI * 2);
            ctx.fill();
            // Emit trail dot behind ship (world coords)
            if (PS && this._elemFrameCount % lc.TRAIL_INTERVAL === 0) {
                PS.addParticle({
                    x: this.x + (Math.random() - 0.5) * 4,
                    y: this.y + 18,
                    vx: (Math.random() - 0.5) * lc.TRAIL_SPEED,
                    vy: lc.TRAIL_SPEED,
                    life: lc.TRAIL_LIFE, maxLife: lc.TRAIL_LIFE,
                    color: '#00f0ff', size: lc.TRAIL_SIZE,
                    isSpark: true
                });
            }
            alphaMult *= auraCfg.STACK_ALPHA_MULT;
        }

        // Electric aura (perkLevel >= 3)
        if (perkLvl >= 3) {
            const ec = auraCfg.ELECTRIC;
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, ec.GLOW_RADIUS);
            grad.addColorStop(0, CU.rgba(ec.COLOR[0], ec.COLOR[1], ec.COLOR[2], ec.GLOW_ALPHA * alphaMult));
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, ec.GLOW_RADIUS, 0, Math.PI * 2);
            ctx.fill();
            // Mini arcs around ship (re-randomize every N frames)
            if (this._elemFrameCount % ec.ARC_INTERVAL === 0) {
                this._electricArcs = [];
                for (let a = 0; a < ec.ARC_COUNT; a++) {
                    const startAngle = Math.random() * Math.PI * 2;
                    const segs = [];
                    for (let s = 0; s <= ec.ARC_SEGMENTS; s++) {
                        const t = s / ec.ARC_SEGMENTS;
                        const r = ec.ARC_RADIUS + (Math.random() - 0.5) * ec.ARC_JITTER * 2;
                        const ang = startAngle + t * 1.2;
                        segs.push({ x: Math.cos(ang) * r, y: Math.sin(ang) * r });
                    }
                    this._electricArcs.push(segs);
                }
            }
            // Draw arcs
            ctx.strokeStyle = '#bb88ff';
            ctx.lineWidth = 1.5;
            ctx.globalAlpha = 0.6 * alphaMult;
            for (let a = 0; a < this._electricArcs.length; a++) {
                const segs = this._electricArcs[a];
                ctx.beginPath();
                for (let s = 0; s < segs.length; s++) {
                    if (s === 0) ctx.moveTo(segs[s].x, segs[s].y);
                    else ctx.lineTo(segs[s].x, segs[s].y);
                }
                ctx.stroke();
            }
        }

        ctx.restore();
    }

    /**
     * v5.13: Elemental pickup pulse — brief radial flash on perk collect
     * Called in translated coords (0,0 = ship center)
     */
    _drawElementalPulse(ctx) {
        if (!this._elemPulse.active) return;
        const t = this._elemPulse.timer / this._elemPulse.duration;
        if (t <= 0) return;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = t * this._elemPulse.alpha;
        const radius = 30 + (1 - t) * 25; // expand outward
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
        grad.addColorStop(0, this._elemPulse.color);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();
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

        // 2. SHIELD COOLDOWN / READY RING (v5.7: prominent ready indicator for tap-on-ship)
        if (config.SHIELD_RING?.ENABLED) {
            const sr = config.SHIELD_RING;

            if (!this.shieldActive && this.shieldCooldown > 0) {
                // Cooldown: partial arc filling clockwise
                const maxCooldown = window.Game.Balance.PLAYER.SHIELD_COOLDOWN;
                const progress = 1 - (this.shieldCooldown / maxCooldown);
                const angle = Math.PI * 2 * Math.min(1, progress);

                ctx.strokeStyle = CU.rgba(0, 240, 255, sr.COOLDOWN_ALPHA);
                ctx.lineWidth = sr.LINE_WIDTH;
                ctx.beginPath();
                ctx.arc(0, 0, sr.RADIUS, -Math.PI / 2, -Math.PI / 2 + angle);
                ctx.stroke();
            } else if (!this.shieldActive && this.shieldCooldown <= 0) {
                // READY: pulsing cyan ring + glow — clearly indicates "tap here for shield"
                const pulse = Math.sin(this.animTime * (sr.READY_PULSE_SPEED || 4));
                const alpha = sr.READY_ALPHA + pulse * (sr.READY_PULSE_AMP || 0.15);

                // Outer glow (additive)
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                const glowGrad = ctx.createRadialGradient(0, 0, sr.RADIUS - 4, 0, 0, sr.RADIUS + 10);
                glowGrad.addColorStop(0, CU.rgba(0, 240, 255, alpha * 0.4));
                glowGrad.addColorStop(1, 'transparent');
                ctx.fillStyle = glowGrad;
                ctx.beginPath();
                ctx.arc(0, 0, sr.RADIUS + 10, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();

                // Main ring
                ctx.strokeStyle = CU.rgba(0, 240, 255, alpha);
                ctx.lineWidth = sr.LINE_WIDTH;
                ctx.beginPath();
                ctx.arc(0, 0, sr.RADIUS, 0, Math.PI * 2);
                ctx.stroke();

                // Rotating dash accent (2 small arcs spinning around the ring)
                const rot = this.animTime * 2;
                ctx.strokeStyle = CU.rgba(0, 240, 255, alpha * 1.5);
                ctx.lineWidth = sr.LINE_WIDTH + 1;
                for (let i = 0; i < 2; i++) {
                    const a = rot + i * Math.PI;
                    ctx.beginPath();
                    ctx.arc(0, 0, sr.RADIUS, a, a + 0.4);
                    ctx.stroke();
                }
            }
        }

        // 3. WEAPON LEVEL PIPS — removed v4.55 (ship body now communicates weapon level visually)

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
        const eliteWeapons = [];
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
                this.shieldTimer = window.Game.Balance?.PLAYER?.SHIELD_DURATION || 5.0;
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
     * Apply a power-up (UPGRADE, special, or utility)
     * v4.47: Modifiers removed, linear weapon levels
     * @param {string} type - Power-up type
     */
    applyPowerUp(type) {
        const WE = window.Game.Balance.WEAPON_EVOLUTION;
        if (!WE) {
            this.upgrade(type);
            return;
        }

        const Audio = window.Game.Audio;

        // UPGRADE: permanent weapon level increase
        if (type === 'UPGRADE') {
            if (this.weaponLevel < WE.MAX_WEAPON_LEVEL) {
                const fromLevel = this.weaponLevel;
                this.weaponLevel++;
                this._startDeploy(fromLevel, this.weaponLevel);
                if (Audio) Audio.play('levelUp');
                if (window.Game.Debug) window.Game.Debug.trackWeaponEvent('UPGRADE', 'WPN_LV' + this.weaponLevel);

                if (window.Game.Events) {
                    window.Game.Events.emit('WEAPON_LEVEL_UP', { level: this.weaponLevel });
                }

                // v4.60: GODCHAIN no longer triggered by weapon level (now via elemental perks)
            } else {
                // Already max weapon level — no action
            }
            return;
        }

        // Specials: HOMING, PIERCE, MISSILE (exclusive weapon effects)
        const specials = ['HOMING', 'PIERCE', 'MISSILE'];
        if (specials.includes(type)) {
            this.special = type;
            this.specialTimer = WE.SPECIAL_DURATION;
            if (window.Game.Debug) window.Game.Debug.trackWeaponEvent('SPECIAL', type);
            if (Audio) Audio.play('powerUp');

            if (window.Game.Events) {
                window.Game.Events.emit('SPECIAL_APPLIED', { type: type, timer: this.specialTimer });
            }
            return;
        }

        // Utilities: SHIELD, SPEED (non-weapon effects)
        if (type === 'SHIELD') {
            this.activateShield();
            this.shieldCooldown = 0;
            this.shieldTimer = window.Game.Balance?.PLAYER?.SHIELD_DURATION || 5.0;
            if (Audio) Audio.play('shield');
            return;
        }

        if (type === 'SPEED') {
            this.shipPowerUp = 'SPEED';
            this.shipPowerUpTimer = WE.UTILITY_DURATION || 12;
            if (Audio) Audio.play('powerUp');
            return;
        }

        // Unknown type - try legacy system
        this.upgrade(type);
    }

    /**
     * v5.11: Collect Evolution Core from boss kill — cinematic weapon upgrade
     * Called when the evolution item reaches the player position.
     */
    collectEvolution() {
        const WE = window.Game.Balance.WEAPON_EVOLUTION;
        if (!WE) return;
        if (this.weaponLevel >= WE.MAX_WEAPON_LEVEL) return;

        const fromLevel = this.weaponLevel;
        this.weaponLevel++;
        this._startDeploy(fromLevel, this.weaponLevel);

        // Cinematic effects
        const deployCfg = window.Game.Balance?.VFX?.WEAPON_DEPLOY;
        if (deployCfg && deployCfg.HITSTOP) {
            if (window.Game.applyHitStop) window.Game.applyHitStop('WEAPON_UPGRADE', false);
            if (window.Game.triggerScreenFlash) window.Game.triggerScreenFlash('WEAPON_UPGRADE');
            if (window.Game.EffectsRenderer) {
                window.Game.EffectsRenderer.applyShake(deployCfg.UPGRADE_SHAKE || 10);
            }
        }

        // Particle burst
        if (window.Game.ParticleSystem) {
            window.Game.ParticleSystem.createWeaponUpgradeEffect(this.x, this.y, this.weaponLevel);
        }

        // Audio
        const Audio = window.Game.Audio;
        if (Audio) Audio.play('levelUp');

        // Debug tracking
        if (window.Game.Debug) window.Game.Debug.trackWeaponEvent('EVOLUTION', 'WPN_LV' + this.weaponLevel);
        if (window.Game.Events) {
            window.Game.Events.emit('WEAPON_LEVEL_UP', { level: this.weaponLevel });
        }
    }

    /**
     * Apply death penalty: reduce weapon level, clear special
     * Called when player loses a life
     */
    applyDeathPenalty() {
        const WE = window.Game.Balance.WEAPON_EVOLUTION;
        if (!WE) return;

        const penalty = WE.DEATH_PENALTY ?? 1;

        // Weapon level: min 1
        this.weaponLevel = Math.max(1, this.weaponLevel - penalty);

        // Cancel deploy animation
        this._deploy.active = false;

        // Special: lost completely on death
        this.special = null;
        this.specialTimer = 0;

        if (window.Game.Debug) window.Game.Debug.trackWeaponEvent('DEATH_PENALTY', 'WPN_LV' + this.weaponLevel);

        if (window.Game.Events) {
            window.Game.Events.emit('DEATH_PENALTY_APPLIED', {
                weaponLevel: this.weaponLevel
            });
        }
    }

    /**
     * v5.2: Compute target geometry for a given weapon level.
     * Returns object with podX, podTop, podW, barrelTop, barrelW, bodyHalfW.
     */
    _computeGeomForLevel(level) {
        const isGC = this._godchainActive;
        // v5.11: 3 base levels (LV1=base, LV2=pods+panels+fins, LV3=armor+barrel+thrusters)
        return {
            bodyHalfW: isGC ? 33 : (level >= 3 ? 31 : (level >= 2 ? 27 : 22)),
            podX:      level >= 3 ? 20 : (level >= 2 ? 18 : 16),
            podTop:    isGC ? -38 : (level >= 3 ? -38 : (level >= 2 ? -34 : -28)),
            podW:      isGC ? 6 : (level >= 3 ? 6 : (level >= 2 ? 5 : 4.5)),
            barrelTop: level >= 3 ? -48 : -44,
            barrelW:   isGC ? 4.5 : (level >= 3 ? 4.5 : 3.5),
            finExt:    isGC ? 10 : (level >= 3 ? 8 : (level >= 2 ? 4 : 0))
        };
    }

    /**
     * v5.2: Start weapon deployment animation.
     */
    _startDeploy(fromLevel, toLevel) {
        const cfg = window.Game.Balance?.VFX?.WEAPON_DEPLOY;
        if (!cfg || !cfg.ENABLED) return;

        const d = this._deploy;

        // v5.23: If overriding a cannon mount deploy, ensure cannon is mounted
        if (d.active && d._isMounting && !this._cannonMounted) {
            this._cannonMounted = true;
        }
        d._isMounting = false;

        // If already deploying, use current interpolated geom as "from"
        const fromGeom = d.active
            ? { bodyHalfW: this._geom.bodyHalfW, podX: this._geom.podX, podTop: this._geom.podTop, podW: this._geom.podW, barrelTop: this._geom.barrelTop, barrelW: this._geom.barrelW, finExt: this._geom.finExt }
            : this._computeGeomForLevel(fromLevel);

        // For components that don't exist at fromLevel, use hidden positions
        if (fromLevel < 2) {
            // Pods hidden inside body
            fromGeom.podX = 8;
            fromGeom.podTop = -14;
            fromGeom.podW = 3.5;
        }
        if (fromLevel < 3) {
            // v5.11: Barrel hidden at nose tip (appears at LV3)
            fromGeom.barrelTop = -36;
            fromGeom.barrelW = 2.5;
        }

        d.active = true;
        d.timer = 0;
        d.duration = cfg.DURATION;
        d.fromLevel = fromLevel;
        d.toLevel = toLevel;
        d.t = 0;
        d._lockFired = false;
        d._fromGeom = fromGeom;
        d._toGeom = this._computeGeomForLevel(toLevel);
        // v5.20: Cinematic deploy VFX state
        d.flashTimer = cfg.FLASH_DURATION || 0.2;
        d.brighten = true;
        d.auraPulse = 0; // will be set on completion

        // Play start SFX
        const Audio = window.Game.Audio;
        if (Audio) Audio.play('weaponDeploy');
    }

    /**
     * v5.2: Update weapon deployment animation (called from update()).
     */
    _updateDeploy(dt) {
        const d = this._deploy;
        const cfg = window.Game.Balance?.VFX?.WEAPON_DEPLOY;
        if (!cfg) { d.active = false; return; }

        d.timer += dt;
        let p = Math.min(1, d.timer / d.duration);

        // v5.20: Flash timer decay
        if (d.flashTimer > 0) d.flashTimer -= dt;

        // Ease-out-back (mechanical overshoot)
        const c1 = 1.70158, c3 = c1 + 1;
        d.t = 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);

        // Lerp geometry
        const from = d._fromGeom;
        const to = d._toGeom;
        const t = d.t;
        const g = this._geom;
        g.bodyHalfW = from.bodyHalfW + (to.bodyHalfW - from.bodyHalfW) * t;
        g.podX      = from.podX + (to.podX - from.podX) * t;
        g.podTop    = from.podTop + (to.podTop - from.podTop) * t;
        g.podW      = from.podW + (to.podW - from.podW) * t;
        g.barrelTop = from.barrelTop + (to.barrelTop - from.barrelTop) * t;
        g.barrelW   = from.barrelW + (to.barrelW - from.barrelW) * t;
        g.finExt    = from.finExt + (to.finExt - from.finExt) * t;

        // Lock-in event at LOCK_AT threshold
        if (p >= cfg.LOCK_AT && !d._lockFired) {
            d._lockFired = true;
            // v5.23: Cannon mount — set _cannonMounted at lock-in for cinematic reveal
            if (d._isMounting) {
                this._cannonMounted = true;
            }
            // Screen shake
            if (window.Game.EffectsRenderer) {
                window.Game.EffectsRenderer.applyShake(cfg.SHAKE_INTENSITY);
            }
            // Haptic
            if (window.Game.Input) window.Game.Input.vibrate(30);
            // Lock SFX
            const Audio = window.Game.Audio;
            if (Audio) Audio.play('weaponDeployLock');
            // v5.20: Energy burst particles at lock-in
            const PS = window.Game.ParticleSystem;
            if (PS && PS.createDeployBurst) {
                PS.createDeployBurst(this.x, this.y, d.toLevel);
            }
        }

        // Complete
        if (p >= 1) {
            d.active = false;
            d.brighten = false;
            d._isMounting = false; // v5.23: clear mount flag
            // v5.20: Post-deploy aura pulse
            d.auraPulse = cfg.AURA_PULSE_DURATION || 0.3;
            // Snap to final geometry
            g.bodyHalfW = to.bodyHalfW;
            g.podX = to.podX;
            g.podTop = to.podTop;
            g.podW = to.podW;
            g.barrelTop = to.barrelTop;
            g.barrelW = to.barrelW;
            g.finExt = to.finExt;
        }
    }

    /**
     * v5.11: Chevron ship body — metallic tech design with BTC cockpit path
     * LV1: base chevron. LV2: +pods+panels+fins. LV3: +armor+barrel+thrusters (MAX). GODCHAIN: energy form.
     */
    _drawShipBody(ctx) {
        const CU = window.Game.ColorUtils;
        const level = this.weaponLevel ?? 1;
        const t = this.animTime;
        const gc = this._godchainActive ? window.Game.Balance?.GODCHAIN : null;
        const gcColors = gc?.SHIP_COLORS;
        const isGC = this._godchainActive;

        // v5.2: Geometry from cache (animated during deploy, else snapped)
        if (!this._deploy.active) {
            const tgt = this._computeGeomForLevel(level);
            this._geom.bodyHalfW = tgt.bodyHalfW;
            this._geom.podX = tgt.podX;
            this._geom.podTop = tgt.podTop;
            this._geom.podW = tgt.podW;
            this._geom.barrelTop = tgt.barrelTop;
            this._geom.barrelW = tgt.barrelW;
            this._geom.finExt = tgt.finExt;
        }
        const g = this._geom;
        const bodyHalfW = g.bodyHalfW;
        const finExt = g.finExt;

        // Metallic tech palette
        const bodyDark  = gcColors ? gcColors.BODY_DARK : '#2a2040';
        const bodyLight = gcColors ? gcColors.BODY : '#6644aa';
        const noseDark  = gcColors ? gcColors.NOSE : '#4d3366';
        const noseLight = gcColors ? gcColors.NOSE_LIGHT : '#9966cc';
        const accentGlow = gcColors ? '#ff6600' : '#bb44ff';
        const finDark   = gcColors ? gcColors.FIN : '#1a4455';
        const finLight  = gcColors ? gcColors.FIN_LIGHT : '#2a6677';
        const outline   = '#1a1028';

        ctx.lineWidth = 3;
        ctx.strokeStyle = outline;

        // Chevron vertices (local coords, Y negative = up)
        const tipY = -36;
        const shoulderX = bodyHalfW * 0.45;
        const shoulderY = -16;
        const wingY = -6;
        const waistX = bodyHalfW - 2;
        const waistY = 8;
        const rearX = bodyHalfW + 2;
        const rearY = 16;
        const centerRearY = 10;

        // === 1. LV3+: ARMOR PLATES (behind body) ===
        if (level >= 3) {
            ctx.save();
            ctx.lineWidth = 2;
            ctx.strokeStyle = outline;
            ctx.fillStyle = bodyDark;
            ctx.globalAlpha = 0.85;
            // Left plate
            ctx.beginPath();
            ctx.moveTo(-bodyHalfW + 1, waistY - 2);
            ctx.lineTo(-bodyHalfW + 10, waistY - 2);
            ctx.lineTo(-bodyHalfW + 8, rearY - 2);
            ctx.lineTo(-bodyHalfW - 1, rearY - 2);
            ctx.closePath();
            ctx.fill(); ctx.stroke();
            // Right plate
            ctx.beginPath();
            ctx.moveTo(bodyHalfW - 1, waistY - 2);
            ctx.lineTo(bodyHalfW - 10, waistY - 2);
            ctx.lineTo(bodyHalfW - 8, rearY - 2);
            ctx.lineTo(bodyHalfW + 1, rearY - 2);
            ctx.closePath();
            ctx.fill(); ctx.stroke();
            ctx.restore();
        }

        // === 2. MAIN CHEVRON BODY (two-tone left/right) ===
        ctx.lineWidth = 3;
        ctx.strokeStyle = outline;

        // Left half (dark)
        ctx.fillStyle = bodyDark;
        ctx.beginPath();
        ctx.moveTo(0, tipY);
        ctx.lineTo(-shoulderX, shoulderY);
        ctx.lineTo(-bodyHalfW, wingY);
        ctx.lineTo(-waistX, waistY);
        ctx.lineTo(-rearX, rearY);
        ctx.lineTo(0, centerRearY);
        ctx.closePath();
        ctx.fill();

        // Right half (light)
        ctx.fillStyle = bodyLight;
        ctx.beginPath();
        ctx.moveTo(0, tipY);
        ctx.lineTo(shoulderX, shoulderY);
        ctx.lineTo(bodyHalfW, wingY);
        ctx.lineTo(waistX, waistY);
        ctx.lineTo(rearX, rearY);
        ctx.lineTo(0, centerRearY);
        ctx.closePath();
        ctx.fill();

        // Full chevron outline
        ctx.beginPath();
        ctx.moveTo(0, tipY);
        ctx.lineTo(-shoulderX, shoulderY);
        ctx.lineTo(-bodyHalfW, wingY);
        ctx.lineTo(-waistX, waistY);
        ctx.lineTo(-rearX, rearY);
        ctx.lineTo(0, centerRearY);
        ctx.lineTo(rearX, rearY);
        ctx.lineTo(waistX, waistY);
        ctx.lineTo(bodyHalfW, wingY);
        ctx.lineTo(shoulderX, shoulderY);
        ctx.closePath();
        ctx.stroke();

        // === 3. DORSAL SPINE (central violet line, always) ===
        ctx.save();
        ctx.strokeStyle = accentGlow;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = isGC ? 0.9 : 0.6;
        ctx.beginPath();
        ctx.moveTo(0, tipY + 6);
        ctx.lineTo(0, centerRearY - 2);
        ctx.stroke();
        ctx.restore();

        // === 4. PANEL LINES (LV2+) ===
        if (level >= 2) {
            ctx.save();
            ctx.strokeStyle = accentGlow;
            ctx.lineWidth = level >= 3 ? 2.5 : 2;
            ctx.globalAlpha = isGC ? 0.9 : 0.65;
            // Horizontal accent
            ctx.beginPath();
            ctx.moveTo(-bodyHalfW + 5, 0);
            ctx.lineTo(bodyHalfW - 5, 0);
            ctx.stroke();
            // LV3+: diagonal panel lines
            if (level >= 3) {
                ctx.lineWidth = 1.5;
                ctx.globalAlpha = isGC ? 0.7 : 0.4;
                ctx.beginPath();
                ctx.moveTo(-shoulderX - 2, shoulderY + 4);
                ctx.lineTo(-bodyHalfW + 4, wingY + 6);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(shoulderX + 2, shoulderY + 4);
                ctx.lineTo(bodyHalfW - 4, wingY + 6);
                ctx.stroke();
            }
            ctx.restore();
        }

        // === 5. NOSE CAP ACCENT (two-tone trianglino at tip) ===
        ctx.lineWidth = 2;
        ctx.strokeStyle = outline;
        ctx.fillStyle = noseDark;
        ctx.beginPath();
        ctx.moveTo(0, tipY);
        ctx.lineTo(-8, -20);
        ctx.lineTo(0, -20);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = noseLight;
        ctx.beginPath();
        ctx.moveTo(0, tipY);
        ctx.lineTo(0, -20);
        ctx.lineTo(8, -20);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(0, tipY);
        ctx.lineTo(-8, -20);
        ctx.lineTo(8, -20);
        ctx.closePath();
        ctx.stroke();

        // === 6. NOSE CANNON (LV1 only — splits to pods at LV2) ===
        // Show nose cannon only at LV1 when mounted.
        // During LV1→LV2 deploy: fade out nose cannon as pods appear.
        {
            const showNoseCannon = this._cannonMounted && level < 2;
            const deployFadeOut = this._deploy.active && this._deploy.fromLevel === 1 && this._deploy.toLevel >= 2;
            const noseAlpha = deployFadeOut ? Math.max(0, 1 - this._deploy.t) : 1;

            if (showNoseCannon || deployFadeOut) {
                ctx.globalAlpha = noseAlpha;
                const cTop = tipY - 8;
                const cBase = tipY;
                ctx.fillStyle = noseLight;
                ctx.strokeStyle = outline;
                ctx.lineWidth = 1.5;
                // Left rail
                ctx.beginPath();
                ctx.rect(-3.5, cTop, 2, cBase - cTop);
                ctx.fill(); ctx.stroke();
                // Right rail
                ctx.beginPath();
                ctx.rect(1.5, cTop, 2, cBase - cTop);
                ctx.fill(); ctx.stroke();
                // Muzzle brake
                ctx.fillStyle = noseDark;
                ctx.beginPath();
                ctx.rect(-4.5, cTop - 1, 9, 2.5);
                ctx.fill(); ctx.stroke();
                // Energy core
                const nbPulse = Math.sin(t * 8) * 0.3 + 0.7;
                ctx.fillStyle = accentGlow;
                ctx.globalAlpha = noseAlpha * nbPulse * 0.7;
                ctx.beginPath();
                ctx.arc(0, cTop + 2, 1.8, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
            } else if (!this._cannonMounted) {
                // Bare nose — subtle energy glow
                const nbPulse = Math.sin(t * 6) * 0.3 + 0.7;
                ctx.fillStyle = accentGlow;
                ctx.globalAlpha = nbPulse * 0.4;
                ctx.beginPath();
                ctx.arc(0, tipY + 3, 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
            }
            // LV2+: no nose cannon (it moved to pods)
        }

        // === 7. LV3+: CENTRAL BARREL (twin-rail heavy cannon from _geom.barrelTop) ===
        if (level >= 3 || (this._deploy.active && this._deploy.toLevel >= 3)) {
            const barrelTop = g.barrelTop;
            const barrelW = g.barrelW;
            ctx.fillStyle = noseLight;
            ctx.strokeStyle = outline;
            ctx.lineWidth = 2;
            // Twin-rail heavy barrel (wider rails + longer than LV1 nose cannon)
            const bLen = tipY - barrelTop; // ~12px
            ctx.beginPath();
            ctx.rect(-4, barrelTop, 3, bLen);
            ctx.fill(); ctx.stroke();
            ctx.beginPath();
            ctx.rect(1, barrelTop, 3, bLen);
            ctx.fill(); ctx.stroke();
            // Heavy muzzle brake (wider than LV1/pod versions)
            ctx.fillStyle = noseDark;
            ctx.beginPath();
            ctx.rect(-barrelW - 1, barrelTop - 2, (barrelW + 1) * 2, 3);
            ctx.fill(); ctx.stroke();

            // LV3+: pulsing energy core at barrel tip
            if (level >= 3) {
                const bPulse = Math.sin(t * 6) * 0.3 + 0.7;
                ctx.fillStyle = accentGlow;
                ctx.globalAlpha = bPulse * 0.8;
                ctx.beginPath();
                ctx.arc(0, barrelTop, 2.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
            }

            // GODCHAIN: energy core orb above barrel
            if (isGC) {
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                const corePulse = Math.sin(t * 8) * 0.4 + 0.6;
                ctx.fillStyle = CU.rgba(255, 100, 0, corePulse);
                ctx.beginPath();
                ctx.arc(0, barrelTop - 3, 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        // === 8. FINS (swept-back from bodyHalfW to ±40+finExt) ===
        ctx.lineWidth = 3;
        ctx.strokeStyle = outline;

        // Left fin
        ctx.fillStyle = finDark;
        ctx.beginPath();
        ctx.moveTo(-bodyHalfW, wingY + 2);
        ctx.lineTo(-40 - finExt, rearY + (finExt > 4 ? 2 : 0));
        ctx.lineTo(-bodyHalfW + 6, rearY + 2);
        ctx.closePath();
        ctx.fill(); ctx.stroke();

        // Right fin
        ctx.fillStyle = finLight;
        ctx.beginPath();
        ctx.moveTo(bodyHalfW, wingY + 2);
        ctx.lineTo(40 + finExt, rearY + (finExt > 4 ? 2 : 0));
        ctx.lineTo(bodyHalfW - 6, rearY + 2);
        ctx.closePath();
        ctx.fill(); ctx.stroke();

        // === 9. LV3+: FIN THRUSTERS (flames at fin tips) ===
        if (level >= 3) {
            const ftH = 6 + Math.sin(t * 14) * 3;
            ctx.fillStyle = '#ff8800';
            ctx.globalAlpha = 0.7;
            ctx.beginPath();
            ctx.moveTo(-36 - finExt, rearY + 1);
            ctx.lineTo(-40 - finExt, rearY + 1 + ftH);
            ctx.lineTo(-32 - finExt, rearY + 1);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(36 + finExt, rearY + 1);
            ctx.lineTo(40 + finExt, rearY + 1 + ftH);
            ctx.lineTo(32 + finExt, rearY + 1);
            ctx.closePath();
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        // GODCHAIN: wing energy trails from fin tips
        if (isGC) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const wePulse = Math.sin(t * 5) * 0.3 + 0.5;
            ctx.strokeStyle = CU.rgba(255, 100, 0, wePulse);
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-40 - finExt, rearY + 2);
            ctx.lineTo(-44 - finExt, rearY + 12 + Math.sin(t * 7) * 4);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(40 + finExt, rearY + 2);
            ctx.lineTo(44 + finExt, rearY + 12 + Math.sin(t * 7 + 1) * 4);
            ctx.stroke();
            ctx.restore();
        }

        // === 8b. SHIELD FIN GLOW (cooldown fill / ready pulse on fins) ===
        this._drawShieldFinGlow(ctx, bodyHalfW, finExt, wingY, rearY);

        // === 10. LV2+: GUN PODS (side cannons with mount brackets) ===
        if (level >= 2 || (this._deploy.active && this._deploy.toLevel >= 2)) {
            const podTop = g.podTop;
            const podX = g.podX;
            const podW = g.podW;
            const podBot = -12;

            // Mount brackets (struts connecting body to pods)
            ctx.fillStyle = bodyDark;
            ctx.strokeStyle = outline;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(-8, -14);
            ctx.lineTo(-podX + podW, -16);
            ctx.lineTo(-podX + podW, -12);
            ctx.closePath();
            ctx.fill(); ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(8, -14);
            ctx.lineTo(podX - podW, -16);
            ctx.lineTo(podX - podW, -12);
            ctx.closePath();
            ctx.fill(); ctx.stroke();

            ctx.lineWidth = 2;
            ctx.strokeStyle = outline;

            // Left pod housing (tapered body)
            ctx.fillStyle = noseDark;
            ctx.beginPath();
            ctx.moveTo(-podX - podW * 0.6, podTop + 4);
            ctx.lineTo(-podX - podW, podBot);
            ctx.lineTo(-podX + podW, podBot);
            ctx.lineTo(-podX + podW * 0.6, podTop + 4);
            ctx.closePath();
            ctx.fill(); ctx.stroke();
            // Left pod twin-rail barrel
            ctx.fillStyle = noseLight;
            ctx.beginPath();
            ctx.rect(-podX - 2.5, podTop - 2, 1.5, 6);
            ctx.fill(); ctx.stroke();
            ctx.beginPath();
            ctx.rect(-podX + 1, podTop - 2, 1.5, 6);
            ctx.fill(); ctx.stroke();
            // Left muzzle brake
            ctx.fillStyle = noseDark;
            ctx.beginPath();
            ctx.rect(-podX - 3.5, podTop - 3, 7, 2);
            ctx.fill(); ctx.stroke();

            // Right pod housing (tapered body)
            ctx.fillStyle = noseLight;
            ctx.beginPath();
            ctx.moveTo(podX - podW * 0.6, podTop + 4);
            ctx.lineTo(podX - podW, podBot);
            ctx.lineTo(podX + podW, podBot);
            ctx.lineTo(podX + podW * 0.6, podTop + 4);
            ctx.closePath();
            ctx.fill(); ctx.stroke();
            // Right pod twin-rail barrel
            ctx.fillStyle = noseLight;
            ctx.beginPath();
            ctx.rect(podX - 2.5, podTop - 2, 1.5, 6);
            ctx.fill(); ctx.stroke();
            ctx.beginPath();
            ctx.rect(podX + 1, podTop - 2, 1.5, 6);
            ctx.fill(); ctx.stroke();
            // Right muzzle brake
            ctx.fillStyle = noseDark;
            ctx.beginPath();
            ctx.rect(podX - 3.5, podTop - 3, 7, 2);
            ctx.fill(); ctx.stroke();

            // Glow tips at pod tops
            const tipR = level >= 3 ? 4.5 : 3.5;
            const tipAlpha = level >= 3 ? (Math.sin(t * 6) * 0.3 + 0.7) : 0.7;
            ctx.fillStyle = accentGlow;
            ctx.globalAlpha = tipAlpha;
            ctx.beginPath();
            ctx.arc(-podX, podTop, tipR, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(podX, podTop, tipR, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        // === 11. RIM LIGHTING (edge highlights) ===
        ctx.strokeStyle = gcColors ? gcColors.BODY_LIGHT : '#9977cc';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(3, tipY + 4);
        ctx.lineTo(bodyHalfW - 2, wingY);
        ctx.stroke();

        ctx.strokeStyle = noseLight;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.moveTo(2, tipY + 2);
        ctx.lineTo(6, -22);
        ctx.stroke();
        ctx.globalAlpha = 1;

        // === 12. BTC COCKPIT (path-drawn symbol) ===
        this._drawBtcSymbolPath(ctx, 0, -2, 0.9, isGC);

        // === 13. GODCHAIN ENERGY LINES + PERIMETER GLOW ===
        if (isGC) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const linePulse = Math.sin(t * 4) * 0.3 + 0.6;
            ctx.strokeStyle = CU.rgba(255, 80, 0, linePulse);
            ctx.lineWidth = 1.5;
            // Vertical circuit lines
            ctx.beginPath();
            ctx.moveTo(-10, -24);
            ctx.lineTo(-10, 6);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(10, -24);
            ctx.lineTo(10, 6);
            ctx.stroke();
            // Horizontal circuit lines
            ctx.beginPath();
            ctx.moveTo(-10, -12);
            ctx.lineTo(10, -12);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(-14, 4);
            ctx.lineTo(14, 4);
            ctx.stroke();
            // Perimeter glow (LV5+)
            if (level >= 5) {
                ctx.strokeStyle = CU.rgba(255, 100, 0, linePulse * 0.4);
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(0, tipY);
                ctx.lineTo(-shoulderX, shoulderY);
                ctx.lineTo(-bodyHalfW, wingY);
                ctx.lineTo(-waistX, waistY);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(0, tipY);
                ctx.lineTo(shoulderX, shoulderY);
                ctx.lineTo(bodyHalfW, wingY);
                ctx.lineTo(waistX, waistY);
                ctx.stroke();
            }
            ctx.restore();
        }
    }

    /**
     * v5.9: Draw BTC symbol as path strokes (not text) for crisp cockpit
     */
    _drawBtcSymbolPath(ctx, cx, cy, scale, isGodchain) {
        const CU = window.Game.ColorUtils;
        const s = scale;
        const color = isGodchain ? '#ff6600' : '#00f0ff';

        ctx.save();
        ctx.translate(cx, cy);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // BTC "B" shape: two vertical spines + two right bumps
        const drawBPath = () => {
            ctx.beginPath();
            // Left spine (vertical bar of B)
            ctx.moveTo(-3 * s, -7 * s);
            ctx.lineTo(-3 * s, 7 * s);
            // Top serif
            ctx.moveTo(-3 * s, -7 * s);
            ctx.lineTo(1 * s, -7 * s);
            // Upper bump
            ctx.quadraticCurveTo(6 * s, -7 * s, 6 * s, -3.5 * s);
            ctx.quadraticCurveTo(6 * s, 0, 1 * s, 0);
            // Middle bar
            ctx.lineTo(-3 * s, 0);
            // Lower bump (wider)
            ctx.moveTo(1 * s, 0);
            ctx.quadraticCurveTo(7 * s, 0, 7 * s, 3.5 * s);
            ctx.quadraticCurveTo(7 * s, 7 * s, 1 * s, 7 * s);
            // Bottom serif
            ctx.lineTo(-3 * s, 7 * s);
            // Vertical strike-throughs
            ctx.moveTo(-1 * s, -9 * s);
            ctx.lineTo(-1 * s, -6 * s);
            ctx.moveTo(2 * s, -9 * s);
            ctx.lineTo(2 * s, -6 * s);
            ctx.moveTo(-1 * s, 6 * s);
            ctx.lineTo(-1 * s, 9 * s);
            ctx.moveTo(2 * s, 6 * s);
            ctx.lineTo(2 * s, 9 * s);
            ctx.stroke();
        };

        // Outer glow layer
        ctx.lineWidth = 5 * s;
        ctx.strokeStyle = CU.rgba(
            isGodchain ? 255 : 0,
            isGodchain ? 100 : 240,
            isGodchain ? 0 : 255,
            0.3
        );
        drawBPath();

        // Inner bright layer
        ctx.lineWidth = 1.8 * s;
        ctx.strokeStyle = color;
        drawBPath();

        // Core white layer
        ctx.lineWidth = 0.8 * s;
        ctx.strokeStyle = '#ffffff';
        ctx.globalAlpha = 0.8;
        drawBPath();

        ctx.restore();
    }

    /**
     * v5.7: Hexgrid Energy Shield — honeycomb pattern with radial wave, glow layers
     */
    _drawHexShield(ctx) {
        const CU = window.Game.ColorUtils;
        const t = this._shieldAnim;
        const fade = this._shieldFade;
        const radius = 52;
        const hexSize = 11;
        const rows = 6;

        ctx.save();
        ctx.globalAlpha = fade;

        // Outer glow layer (additive)
        const prevComp = ctx.globalCompositeOperation;
        ctx.globalCompositeOperation = 'lighter';

        // Pulsing outer aura
        const auraPulse = 0.3 + Math.sin(t * 6) * 0.15;
        const auraR = radius + 8 + Math.sin(t * 4) * 3;
        const auraGrad = ctx.createRadialGradient(0, 0, radius * 0.5, 0, 0, auraR);
        auraGrad.addColorStop(0, CU.rgba(0, 240, 255, 0));
        auraGrad.addColorStop(0.6, CU.rgba(0, 240, 255, auraPulse * 0.3));
        auraGrad.addColorStop(1, CU.rgba(0, 240, 255, 0));
        ctx.beginPath();
        ctx.arc(0, 0, auraR, 0, Math.PI * 2);
        ctx.fillStyle = auraGrad;
        ctx.fill();

        // Hexagon grid
        const cos30 = Math.cos(Math.PI / 6);
        const hexW = hexSize * 2;
        const hexH = hexSize * cos30 * 2;
        const colStep = hexW * 0.75;
        const rowStep = hexH;

        // Radial wave: bright ring expanding outward
        const waveRadius = (t * 60) % (radius + 20);
        const waveWidth = 15;

        for (let col = -rows; col <= rows; col++) {
            for (let row = -rows; row <= rows; row++) {
                const cx = col * colStep;
                const cy = row * rowStep + (col % 2 !== 0 ? rowStep * 0.5 : 0);
                const dist = Math.sqrt(cx * cx + cy * cy);

                // Only draw hexagons within shield radius
                if (dist > radius + hexSize) continue;

                // Radial wave brightness
                const waveDist = Math.abs(dist - waveRadius);
                const waveBright = waveDist < waveWidth ? 1 - (waveDist / waveWidth) : 0;

                // Base alpha: edge hexagons dimmer, inner brighter
                const edgeFade = 1 - Math.max(0, (dist - radius + hexSize * 2) / (hexSize * 2));
                const baseAlpha = 0.15 + waveBright * 0.5;
                const alpha = baseAlpha * Math.min(1, edgeFade) * fade;

                if (alpha < 0.02) continue;

                // Draw hexagon
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const angle = (Math.PI / 3) * i + Math.PI / 6;
                    const hx = cx + hexSize * 0.85 * Math.cos(angle);
                    const hy = cy + hexSize * 0.85 * Math.sin(angle);
                    if (i === 0) ctx.moveTo(hx, hy);
                    else ctx.lineTo(hx, hy);
                }
                ctx.closePath();

                // Fill with wave-modulated cyan
                ctx.fillStyle = CU.rgba(0, 240, 255, alpha * 0.4);
                ctx.fill();
                ctx.strokeStyle = CU.rgba(0, 240, 255, alpha);
                ctx.lineWidth = waveBright > 0.3 ? 1.5 : 0.8;
                ctx.stroke();
            }
        }

        // Inner bright ring border
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.strokeStyle = CU.rgba(0, 240, 255, 0.4 * fade);
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Outer soft ring
        ctx.beginPath();
        ctx.arc(0, 0, radius + 4, 0, Math.PI * 2);
        ctx.strokeStyle = CU.rgba(0, 240, 255, 0.15 * fade);
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.globalCompositeOperation = prevComp;
        ctx.restore();
    }

    /**
     * v5.1: Directional muzzle flash — canvas V-flash at actual cannon positions
     * Geometry matches _drawShipBody barrel/pod coordinates per level.
     */
    _drawMuzzleFlash(ctx) {
        if (this.muzzleFlash <= 0) return;

        const Balance = window.Game.Balance;
        const mf = Balance.VFX?.MUZZLE_FLASH;
        if (!mf || !mf.ENABLED) return;

        const WE = Balance.WEAPON_EVOLUTION;
        const glowOn = Balance.GLOW?.ENABLED;

        // Effective weapon level (includes HYPER boost)
        let effectiveLevel = this.weaponLevel ?? 1;
        if (this.hyperActive) {
            effectiveLevel = Math.min(5, effectiveLevel + (WE.HYPER_LEVEL_BOOST || 2));
        }
        const isGC = this._godchainActive;

        // Alpha from timer (linear decay)
        const duration = Balance.PLAYER.MUZZLE_FLASH_DURATION || 0.08;
        const alpha = Math.min(1, this.muzzleFlash / duration);

        // Determine perk state and colors
        const rs = window.Game.RunState;
        let colors = mf.COLORS_BASE;
        let widthMult = 1;
        let heightMult = 1;
        let perkType = 'BASE';

        if (isGC) {
            colors = mf.COLORS_GODCHAIN;
            perkType = 'GODCHAIN';
        } else if (rs?.hasElectricPerk) {
            colors = mf.COLORS_ELECTRIC;
            perkType = 'ELECTRIC';
        } else if (rs?.hasLaserPerk) {
            colors = mf.COLORS_LASER;
            widthMult = mf.LASER_WIDTH_MULT;
            heightMult = mf.LASER_HEIGHT_MULT;
            perkType = 'LASER';
        } else if (rs?.hasFirePerk) {
            colors = mf.COLORS_FIRE;
            widthMult = mf.FIRE_WIDTH_MULT;
            perkType = 'FIRE';
        }

        // Size scales with weapon level
        const scale = 1 + (effectiveLevel - 1) * mf.LEVEL_SCALE;
        const hw = mf.BASE_WIDTH * scale * widthMult;   // half-width
        const h = mf.BASE_HEIGHT * scale * heightMult;  // height

        // Compute actual muzzle points from ship geometry (_geom for deploy animation)
        // {x, y} in local coords — y points up = more negative
        const gm = this._geom;
        // v5.11: Muzzle points mapped to 3-level system
        const muzzles = [];
        if (effectiveLevel <= 1) {
            // LV1: single shot from nose barrel tip
            muzzles.push({ x: 0, y: -40 });
        } else if (effectiveLevel === 2) {
            // LV2: dual from gun pod tops
            muzzles.push({ x: -gm.podX, y: gm.podTop });
            muzzles.push({ x: gm.podX, y: gm.podTop });
        } else {
            // LV3+: triple — side pods + central barrel
            muzzles.push({ x: -gm.podX, y: gm.podTop });
            muzzles.push({ x: 0, y: gm.barrelTop || -28 });
            muzzles.push({ x: gm.podX, y: gm.podTop });
        }

        ctx.save();
        if (glowOn) ctx.globalCompositeOperation = 'lighter';

        for (const mp of muzzles) {
            const fx = mp.x;
            const fy = mp.y;

            // 3 layers: outer → mid → inner (each smaller, brighter)
            for (let layer = 2; layer >= 0; layer--) {
                const layerScale = 1 - layer * 0.22; // 1.0, 0.78, 0.56
                const layerAlpha = alpha * (0.45 + layer * 0.25); // 0.45, 0.70, 0.95
                const lw = hw * layerScale;
                const lh = h * layerScale;

                ctx.globalAlpha = layerAlpha;
                ctx.fillStyle = colors[layer];
                ctx.beginPath();
                // Diamond/V shape pointing up
                ctx.moveTo(fx, fy - lh);              // top tip
                ctx.lineTo(fx - lw, fy - lh * 0.25);  // left waist
                ctx.lineTo(fx, fy);                    // bottom center (cannon mouth)
                ctx.lineTo(fx + lw, fy - lh * 0.25);  // right waist
                ctx.closePath();
                ctx.fill();
            }

            // Electric: side sparks (small lightning arcs)
            if (perkType === 'ELECTRIC') {
                const sparkCount = mf.ELECTRIC_SIDE_SPARKS;
                ctx.globalAlpha = alpha * 0.8;
                ctx.strokeStyle = colors[2];
                ctx.lineWidth = 1.5;
                for (let s = 0; s < sparkCount; s++) {
                    const side = s % 2 === 0 ? -1 : 1;
                    const sparkPhase = this.animTime * 20 + s * 2.5;
                    const sx = fx + side * (hw + 3 + Math.sin(sparkPhase) * 4);
                    const sy = fy - h * 0.5 + Math.cos(sparkPhase * 1.3) * 3;
                    ctx.beginPath();
                    ctx.moveTo(fx + side * hw * 0.5, fy - h * 0.3);
                    ctx.lineTo(sx, sy);
                    ctx.stroke();
                }
            }

            // GODCHAIN: oscillating fire tongues above each cannon
            if (perkType === 'GODCHAIN') {
                const tongueCount = mf.GODCHAIN_TONGUE_COUNT;
                const tongueColors = ['#ff4400', '#ff6600', '#ffaa00'];
                for (let t2 = 0; t2 < tongueCount; t2++) {
                    const phase = this.animTime * 12 + t2 * 2.1;
                    const tongueX = fx + Math.sin(phase) * (hw * 0.8);
                    const tongueH = h * (0.6 + Math.sin(phase * 1.5) * 0.25);
                    ctx.globalAlpha = alpha * (0.55 + Math.sin(phase * 2) * 0.3);
                    ctx.fillStyle = tongueColors[t2 % tongueColors.length];
                    ctx.beginPath();
                    ctx.moveTo(tongueX - 2.5, fy - h * 0.15);
                    ctx.lineTo(tongueX + 2.5, fy - h * 0.15);
                    ctx.lineTo(tongueX, fy - h * 0.15 - tongueH);
                    ctx.closePath();
                    ctx.fill();
                }
            }
        }

        ctx.restore();
    }

    /**
     * Get current weapon state for HUD display
     * @returns {Object} Current weapon evolution state
     */
    getWeaponState() {
        return {
            weaponLevel: this.weaponLevel,
            special: this.special,
            specialTimer: this.specialTimer
        };
    }

}



window.Game.Player = Player;
