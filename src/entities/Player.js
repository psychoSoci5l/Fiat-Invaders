window.Game = window.Game || {};

class Player extends window.Game.Entity {
    constructor(gameWidth, gameHeight) {
        const P = window.Game.Balance.PLAYER;
        super(gameWidth / 2, gameHeight - P.SPAWN_OFFSET_Y, 55, 55); // v5.28: 42→55 premium arsenal
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
        this._volleyCounter = 0;    // v5.31: Energy Link volley pairing

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
        // v5.27b: Inverted-V delta — wing tips are REARMOST and WIDEST
        // v5.28: Premium Arsenal — swept-back delta, cannonLen for nose barrel slide-out
        this._geom = {
            wingSpan: 40, shoulderW: 13,
            cannonExt: 0, barrelExt: 0, barrelW: 0,
            cannonLen: 0
        };

        // Visual effects
        this.animTime = 0;
        this.muzzleFlash = 0; // Timer for muzzle flash effect

        // Pre-allocated trail buffer (circular, no GC churn)
        this._trailBuffer = [];
        this._trailHead = 0;
        this._trailCount = 0;
        for (let i = 0; i < 6; i++) {
            this._trailBuffer.push({ x: 0, y: 0, age: 999, bank: 0 }); // Pre-allocate
        }
        this.trail = []; // Kept for compatibility with draw()

        this.hyperParticles = []; // Golden particles during HYPER
        this._hyperSpeedLines = []; // v5.31: Speed line VFX during HYPER

        // v5.13: Elemental VFX state
        this._elemPulse = { active: false, timer: 0, duration: 0, color: '', alpha: 0 };
        this._elemFrameCount = 0;
        this._electricArcs = [];

        // v5.30: Ship Flight Dynamics state (zero-alloc, all scalars)
        this._flight = {
            bankAngle: 0, hoverPhase: 0, hoverOffset: 0,
            thrustL: 1, thrustR: 1,
            scaleX: 1, scaleY: 1,
            prevVx: 0, vaporTimer: 0,
        };
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
        this._hyperSpeedLines = [];

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

        // v5.30: Flight dynamics reset
        if (this._flight) {
            const fl = this._flight;
            fl.bankAngle = 0; fl.hoverPhase = 0; fl.hoverOffset = 0;
            fl.thrustL = 1; fl.thrustR = 1;
            fl.scaleX = 1; fl.scaleY = 1;
            fl.prevVx = 0; fl.vaporTimer = 0;
        }

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
        // v5.28: Use ENERGY_SURGE mount duration (slower, more cinematic)
        const surge = cfg.ENERGY_SURGE;
        d.duration = surge?.DEPLOY_DURATION?.[0] ?? cfg.DURATION;
        d.fromLevel = 0;
        d.toLevel = 1;
        d.t = 0;
        d._lockFired = false;
        d._isMounting = true;
        // v5.28: cannonLen slides out from 0→10 during mount
        d._fromGeom = { ...this._computeGeomForLevel(1), cannonLen: 0 };
        d._toGeom = this._computeGeomForLevel(1);
        d.flashTimer = 0;       // No white flash for cannon mount
        d.brighten = false;     // No brighten for cannon mount
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
            slot.bank = this._flight ? this._flight.bankAngle : 0;
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
            // Relative drag: finger delta moves ship from anchor position
            if (input.touch.newDrag) {
                this._dragAnchorX = this.x;
                this._dragOriginX = input.touch.dragOriginX;
                input.touch.newDrag = false;
            }
            const scale = (this.gameWidth / window.innerWidth) * (input.touch.sensitivity || 1.0);
            const targetX = this._dragAnchorX + (input.touch.x - this._dragOriginX) * scale;
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

        // v5.30: Ship Flight Dynamics (banking, hover, thrust, vapor, squash/stretch)
        const _sfCfg = window.Game.Balance?.VFX?.SHIP_FLIGHT;
        if (_sfCfg?.ENABLED && this._flight) {
            const fl = this._flight;

            // --- Banking Tilt ---
            const _bk = _sfCfg.BANKING;
            if (_bk?.ENABLED) {
                const targetBank = Math.max(-1, Math.min(1, this.vx / _bk.VX_DIVISOR)) * _bk.MAX_ANGLE;
                const lerpRate = Math.abs(targetBank) > Math.abs(fl.bankAngle) ? _bk.LERP_SPEED : _bk.RETURN_SPEED;
                fl.bankAngle += (targetBank - fl.bankAngle) * Math.min(1, lerpRate * dt);
            } else {
                fl.bankAngle = 0;
            }
            this.rotation = fl.bankAngle;

            // --- Hover Bob ---
            const _hb = _sfCfg.HOVER_BOB;
            if (_hb?.ENABLED) {
                fl.hoverPhase += dt * _hb.FREQUENCY * Math.PI * 2;
                const dampen = Math.max(0, 1 - Math.abs(this.vx) * _hb.SPEED_DAMPEN);
                fl.hoverOffset = Math.sin(fl.hoverPhase) * _hb.AMPLITUDE * dampen;
            } else {
                fl.hoverOffset = 0;
            }

            // --- Asymmetric Thrust ---
            const _th = _sfCfg.THRUST;
            if (_th?.ENABLED) {
                let targetL = 1, targetR = 1;
                if (this.vx > _th.VX_THRESHOLD) {
                    // Banking right → left flame inner (boost), right outer (reduce)
                    targetL = _th.INNER_BOOST;
                    targetR = _th.OUTER_REDUCE;
                } else if (this.vx < -_th.VX_THRESHOLD) {
                    // Banking left → right flame inner (boost), left outer (reduce)
                    targetR = _th.INNER_BOOST;
                    targetL = _th.OUTER_REDUCE;
                }
                const thrustLerp = Math.min(1, _th.LERP_SPEED * dt);
                fl.thrustL += (targetL - fl.thrustL) * thrustLerp;
                fl.thrustR += (targetR - fl.thrustR) * thrustLerp;
            } else {
                fl.thrustL = 1; fl.thrustR = 1;
            }

            // --- Squash & Stretch ---
            const _ss = _sfCfg.SQUASH_STRETCH;
            if (_ss?.ENABLED) {
                const accelInst = Math.abs(this.vx - fl.prevVx) / Math.max(dt, 0.001);
                if (accelInst > _ss.ACCEL_THRESHOLD) {
                    fl.scaleX += (_ss.MAX_SQUASH_X - fl.scaleX) * Math.min(1, _ss.LERP_SPEED * dt);
                    fl.scaleY += (_ss.MAX_STRETCH_Y - fl.scaleY) * Math.min(1, _ss.LERP_SPEED * dt);
                } else {
                    fl.scaleX += (1 - fl.scaleX) * Math.min(1, _ss.RETURN_SPEED * dt);
                    fl.scaleY += (1 - fl.scaleY) * Math.min(1, _ss.RETURN_SPEED * dt);
                }
            } else {
                fl.scaleX = 1; fl.scaleY = 1;
            }

            // --- Wing Vapor Trails ---
            const _vt = _sfCfg.VAPOR_TRAILS;
            if (_vt?.ENABLED && Math.abs(this.vx) > _vt.VX_THRESHOLD) {
                const speedFactor = (Math.abs(this.vx) - _vt.VX_THRESHOLD) / 300;
                const spawnRate = Math.min(_vt.SPAWN_RATE_MAX, _vt.SPAWN_RATE_BASE + speedFactor * 0.06);
                fl.vaporTimer += dt;
                const PS = window.Game.ParticleSystem;
                if (fl.vaporTimer >= spawnRate && PS) {
                    fl.vaporTimer = 0;
                    const ws = this._geom.wingSpan;
                    const bankCos = Math.cos(fl.bankAngle);
                    const bankSin = Math.sin(fl.bankAngle);
                    // Wingtip positions (relative, rotated by bank)
                    const tips = [[-ws, 31], [ws, 31]];
                    let spawned = 0;
                    let color = _vt.COLOR;
                    if (this.hyperActive) color = _vt.COLOR_HYPER;
                    if (this._godchainActive) color = _vt.COLOR_GODCHAIN;
                    for (const [wx, wy] of tips) {
                        if (spawned >= _vt.MAX_PER_FRAME) break;
                        const rx = wx * bankCos - wy * bankSin;
                        const ry = wx * bankSin + wy * bankCos;
                        PS.addParticle({
                            x: this.x + rx,
                            y: this.y + ry + fl.hoverOffset,
                            vx: -this.vx * 0.15 + (Math.random() - 0.5) * _vt.DRIFT_SPEED,
                            vy: _vt.GRAVITY * (0.5 + Math.random() * 0.5),
                            size: _vt.PARTICLE_SIZE,
                            color: color,
                            life: _vt.PARTICLE_LIFE,
                            isSpark: true
                        });
                        spawned++;
                    }
                }
            } else {
                fl.vaporTimer = 0;
            }

            fl.prevVx = this.vx;
        } else {
            // Fallback: legacy minimal rotation
            this.rotation = this.vx * 0.0005;
        }

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

            // v5.31: Update HYPER speed lines
            const _slCfg = Balance?.VFX?.HYPER_AURA?.SPEED_LINES;
            if (_slCfg?.ENABLED !== false) {
                // Spawn new lines to maintain count
                while (this._hyperSpeedLines.length < (_slCfg?.COUNT ?? 8)) {
                    this._hyperSpeedLines.push({
                        x: this.x + (Math.random() - 0.5) * (_slCfg?.SPREAD ?? 30) * 2,
                        y: this.y - Math.random() * 40,
                        len: (_slCfg?.MIN_LENGTH ?? 15) + Math.random() * ((_slCfg?.MAX_LENGTH ?? 35) - (_slCfg?.MIN_LENGTH ?? 15)),
                        alpha: 0.3 + Math.random() * 0.4,
                    });
                }
                // Move lines downward
                const slSpeed = (_slCfg?.SPEED ?? 300) * dt;
                for (let i = this._hyperSpeedLines.length - 1; i >= 0; i--) {
                    const sl = this._hyperSpeedLines[i];
                    sl.y += slSpeed;
                    sl.alpha -= dt * 1.5;
                    if (sl.alpha <= 0 || sl.y > this.y + 80) {
                        // Respawn at top
                        sl.x = this.x + (Math.random() - 0.5) * (_slCfg?.SPREAD ?? 30) * 2;
                        sl.y = this.y - 20 - Math.random() * 20;
                        sl.alpha = 0.3 + Math.random() * 0.4;
                        sl.len = (_slCfg?.MIN_LENGTH ?? 15) + Math.random() * ((_slCfg?.MAX_LENGTH ?? 35) - (_slCfg?.MIN_LENGTH ?? 15));
                    }
                }
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
        this._hyperSpeedLines = [];

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

        // v5.31: Bullet banking — bullets tilt slightly in movement direction
        const _bankFollow = (this.special === 'HOMING' || this.special === 'MISSILE')
            ? 0 : (Balance?.VFX?.SHIP_FLIGHT?.BANKING?.BULLET_FOLLOW ?? 0);
        const _bankOffset = (this._flight?.bankAngle ?? 0) * _bankFollow;

        // Special-specific spawn function
        const spawnBullet = (offsetX, angleOffset) => {
            const angle = -Math.PI / 2 + angleOffset + _bankOffset;

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
                this.y - 36, // v5.28: scaled nose tip
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
            // v5.27b: cannon at 30% wing leading edge
            const ox = (gm.shoulderW ?? 6) + ((gm.wingSpan ?? 36) - (gm.shoulderW ?? 6)) * 0.30;
            spawnBullet(-ox, -spreadAngle / 2);
            spawnBullet(+ox, +spreadAngle / 2);
            // v5.31: Tag pair for energy link (no link for HOMING/MISSILE/PIERCE specials)
            const _linkCfg = Balance?.VFX?.ENERGY_LINK;
            if (_linkCfg?.ENABLED !== false && !this.special) {
                this._volleyCounter = (this._volleyCounter + 1) & 0x7FFFFFFF;
                bullets[bullets.length - 2]._volleyId = this._volleyCounter;
                bullets[bullets.length - 2]._isLinkPair = true;
                bullets[bullets.length - 1]._volleyId = this._volleyCounter;
                bullets[bullets.length - 1]._isLinkPair = true;
            }
        } else {
            // 3 bullets — wing cannons + central barrel
            const ox = (gm.shoulderW ?? 6) + ((gm.wingSpan ?? 36) - (gm.shoulderW ?? 6)) * 0.30;
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

        // v5.31: HYPER MODE — speed lines + body glow + timer bar (no circles)
        if (this.hyperActive) {
            const HYPER = Balance.HYPER;
            const _haCfg = Balance?.VFX?.HYPER_AURA;
            const hyperPulse = Math.sin(this.animTime * HYPER.AURA_PULSE_SPEED) * 0.2 + 0.8;
            const timeRatio = this.hyperTimer / HYPER.BASE_DURATION;

            // 1. Body glow — tight radial gradient on ship (not a big circle)
            if (_haCfg?.BODY_GLOW?.ENABLED !== false) {
                const glowR = _haCfg?.BODY_GLOW?.RADIUS ?? 35;
                const glowA = (_haCfg?.BODY_GLOW?.ALPHA ?? 0.25) * hyperPulse;
                const _glowCfg = Balance?.GLOW;
                const _additive = _glowCfg?.ENABLED && _glowCfg?.AURA?.ENABLED;
                if (_additive) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; }
                const bg = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, glowR);
                bg.addColorStop(0, CU.rgba(255, 215, 0, glowA));
                bg.addColorStop(0.6, CU.rgba(255, 180, 0, glowA * 0.4));
                bg.addColorStop(1, 'transparent');
                ctx.fillStyle = bg;
                ctx.beginPath();
                ctx.arc(this.x, this.y, glowR, 0, Math.PI * 2);
                ctx.fill();
                if (_additive) { ctx.restore(); }
            }

            // 2. Speed lines — vertical streaks flowing downward from ship
            if (_haCfg?.SPEED_LINES?.ENABLED !== false) {
                const slW = _haCfg?.SPEED_LINES?.WIDTH ?? 2;
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                for (const sl of this._hyperSpeedLines) {
                    ctx.strokeStyle = CU.rgba(255, 215, 0, sl.alpha * (_haCfg?.SPEED_LINES?.ALPHA ?? 0.7));
                    ctx.lineWidth = slW;
                    ctx.beginPath();
                    ctx.moveTo(sl.x, sl.y);
                    ctx.lineTo(sl.x, sl.y + sl.len);
                    ctx.stroke();
                }
                ctx.restore();
            }

            // 3. Timer bar — thin horizontal bar below ship
            if (_haCfg?.TIMER_BAR?.ENABLED !== false) {
                const tbW = _haCfg?.TIMER_BAR?.WIDTH ?? 40;
                const tbH = _haCfg?.TIMER_BAR?.HEIGHT ?? 3;
                const tbY = this.y + (_haCfg?.TIMER_BAR?.OFFSET_Y ?? 32);
                const warnRatio = _haCfg?.TIMER_BAR?.WARN_RATIO ?? 0.3;
                const fillW = tbW * Math.min(1, timeRatio);
                // Background
                ctx.fillStyle = CU.rgba(50, 40, 0, 0.5);
                ctx.fillRect(this.x - tbW / 2, tbY, tbW, tbH);
                // Fill
                ctx.fillStyle = timeRatio < warnRatio ? '#ff4444' : '#FFD700';
                ctx.fillRect(this.x - tbW / 2, tbY, fillW, tbH);
            }

            // Draw HYPER particles (gold sparks — kept from old system)
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
        // v5.28: reduced trail (threshold 50→100, alpha 0.4→0.2, max 3 images)
        if (this.trail.length > 0 && Math.abs(this.vx) > 100) {
            const _glowTrail = window.Game.Balance?.GLOW;
            const _additiveTrail = _glowTrail?.ENABLED && _glowTrail?.BULLET?.ENABLED;
            const trailCount = Math.min(this.trail.length, 3);
            for (let i = 0; i < trailCount; i++) {
                const t = this.trail[i];
                const alpha = 0.2 * (1 - i / trailCount) * (1 - t.age / 0.22);
                if (alpha <= 0) continue;

                // Afterimage silhouette — v4.23.1: additive, v5.30: banked
                ctx.save();
                if (_additiveTrail) ctx.globalCompositeOperation = 'lighter';
                ctx.globalAlpha = alpha;
                ctx.translate(t.x, t.y);
                if (t.bank) ctx.rotate(t.bank);

                // v5.28: Swept-back delta afterimage
                ctx.fillStyle = this.stats.color;
                ctx.beginPath();
                ctx.moveTo(0, -31);        // Nose
                ctx.lineTo(-10, -8);       // Shoulder
                ctx.lineTo(-33, 33);       // Wing tip (swept back!)
                ctx.lineTo(-5, 10);        // Inner tail
                ctx.lineTo(0, 3);          // Tail notch
                ctx.lineTo(5, 10);         // Inner tail
                ctx.lineTo(33, 33);        // Wing tip
                ctx.lineTo(10, -8);        // Shoulder
                ctx.closePath();
                ctx.fill();

                ctx.restore();
            }
        }

        ctx.save();
        // v5.30: Flight dynamics transform (translate → rotate → scale)
        const _fl = this._flight;
        const _flightOn = window.Game.Balance?.VFX?.SHIP_FLIGHT?.ENABLED && _fl;
        const _hoverY = _flightOn ? _fl.hoverOffset : 0;
        ctx.translate(this.x, this.y + _hoverY);
        if (_flightOn && _fl.bankAngle !== 0) ctx.rotate(_fl.bankAngle);
        if (_flightOn && (_fl.scaleX !== 1 || _fl.scaleY !== 1)) ctx.scale(_fl.scaleX, _fl.scaleY);

        // v5.28: Twin exhaust flames at inner tail edges (±7, +13)
        const _flameLvl = this.weaponLevel ?? 1;
        const _flameMult = 1 + (_flameLvl - 1) * 0.12;
        const _innerTailX = 7;
        const _innerTailBaseY = 13;
        const _baseFlameH = (16 + Math.sin(this.animTime * 12) * 6) * _flameMult;
        const flameWidth = (5 + Math.sin(this.animTime * 10) * 2) * _flameMult;
        const pulse = 1 + Math.sin(this.animTime * 8) * 0.1;

        // v5.30: Asymmetric thrust multipliers (inner-curve flame longer)
        const _thrL = _flightOn ? _fl.thrustL : 1;
        const _thrR = _flightOn ? _fl.thrustR : 1;

        // Twin exhaust at inner tail edges
        for (const side of [-1, 1]) {
            const nx = side * _innerTailX;
            const thrMult = side === -1 ? _thrL : _thrR;
            const flameHeight = _baseFlameH * thrMult;
            ctx.fillStyle = '#cc3300'; ctx.globalAlpha = 0.6;
            ctx.beginPath();
            ctx.moveTo(nx - flameWidth * 1.3 * pulse, _innerTailBaseY);
            ctx.lineTo(nx, _innerTailBaseY + flameHeight * 1.1);
            ctx.lineTo(nx + flameWidth * 1.3 * pulse, _innerTailBaseY);
            ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
            ctx.fillStyle = '#ff6600';
            ctx.beginPath();
            ctx.moveTo(nx - flameWidth, _innerTailBaseY);
            ctx.lineTo(nx, _innerTailBaseY + flameHeight);
            ctx.lineTo(nx + flameWidth, _innerTailBaseY);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#ffcc00';
            ctx.beginPath();
            ctx.moveTo(nx - flameWidth * 0.5, _innerTailBaseY);
            ctx.lineTo(nx, _innerTailBaseY + flameHeight * 0.65);
            ctx.lineTo(nx + flameWidth * 0.5, _innerTailBaseY);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.moveTo(nx - flameWidth * 0.2, _innerTailBaseY);
            ctx.lineTo(nx, _innerTailBaseY + flameHeight * 0.3);
            ctx.lineTo(nx + flameWidth * 0.2, _innerTailBaseY);
            ctx.closePath(); ctx.fill();
        }

        // GODCHAIN FIRE_TRAIL — from tail
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
                    ctx.moveTo(flickerX - 3, 18);
                    ctx.lineTo(flickerX + 3, 18);
                    ctx.lineTo(flickerX, 18 + flickerLen);
                    ctx.closePath(); ctx.fill();
                }
                ctx.globalAlpha = 1;
            }
        }

        // Wing tip thrusters when moving laterally
        if (Math.abs(this.vx) > 50) {
            const sideFlameH = 8 + Math.sin(this.animTime * 15) * 3;
            const _ws = this._geom.wingSpan;
            ctx.fillStyle = '#ff8800';
            if (this.vx > 0) {
                ctx.beginPath();
                ctx.moveTo(-_ws + 2, 36);
                ctx.lineTo(-_ws, 36 + sideFlameH);
                ctx.lineTo(-_ws + 6, 36);
                ctx.closePath(); ctx.fill();
            } else {
                ctx.beginPath();
                ctx.moveTo(_ws - 2, 36);
                ctx.lineTo(_ws, 36 + sideFlameH);
                ctx.lineTo(_ws - 6, 36);
                ctx.closePath(); ctx.fill();
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
            ctx.arc(0, 0, 52, 0, Math.PI * 2); // v5.28: 40→52
            ctx.fill();
        }
        // v5.20: Deploy brightening tint (additive white over ship)
        // v5.31: kill-switch via ENERGY_SURGE.BRIGHTEN_ENABLED
        if (_d.active && _d.brighten && _dcfg && (_dcfg.ENERGY_SURGE?.BRIGHTEN_ENABLED !== false)) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            // v5.28: Use per-transition brighten peak from ENERGY_SURGE
            const _surge = _dcfg.ENERGY_SURGE;
            const _transIdx = _d.toLevel >= 3 ? 2 : (_d.toLevel >= 2 ? 1 : 0);
            const _brightenAmt = _surge?.BRIGHTEN_PEAK?.[_transIdx] ?? (_dcfg.BRIGHTEN_AMOUNT || 0.3);
            ctx.fillStyle = CU.rgba(255, 255, 255, _brightenAmt);
            ctx.beginPath();
            ctx.arc(0, 0, 46, 0, Math.PI * 2); // v5.28: 35→46
            ctx.fill();
            ctx.restore();
        }

        // v5.13: Elemental pickup pulse (over ship body)
        this._drawElementalPulse(ctx);

        // v5.1: Directional muzzle flash (canvas V-flash)
        this._drawMuzzleFlash(ctx);

        // v5.31: Energy Skin Shield (conforms to ship body)
        if (this.shieldActive || this._shieldFade > 0) {
            this._drawEnergySkin(ctx);
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
    /**
     * v5.27b: Shield wing glow — cooldown fill / ready pulse on trailing edges.
     * Replaces old fin glow with wing trailing edge triangles.
     */
    _drawShieldWingGlow(ctx, g) {
        const cfg = window.Game.Balance?.DIEGETIC_HUD?.SHIELD_FIN_GLOW;
        if (!cfg?.ENABLED) return;
        if (this.shieldActive) return;

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

        // Inverted-V trailing edges: wingTip → innerTail → tail (v5.28: swept-back)
        const wingTipX = g.wingSpan;
        const wingTipY = 36;
        const innerTailX = 7;
        const innerTailY = 13;
        const tailY = 5;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        // Ready glow spread at wing tips
        if (!inCooldown && cfg.GLOW_SPREAD > 0) {
            const gs = cfg.GLOW_SPREAD;
            const glowAlpha = alpha * 0.5;
            for (const side of [-1, 1]) {
                const grad = ctx.createRadialGradient(side * wingTipX, wingTipY, 0, side * wingTipX, wingTipY, gs * 2);
                grad.addColorStop(0, CU.rgba(0, 240, 255, glowAlpha));
                grad.addColorStop(1, 'transparent');
                ctx.fillStyle = grad;
                ctx.fillRect(side * wingTipX - gs * 2, wingTipY - gs * 2, gs * 4, gs * 4);
            }
        }

        // v5.28: Full wing glow — leading edge (shoulder→wingTip) + trailing edge (wingTip→innerTail→tail)
        const shoulderX = g.shoulderW;
        const shoulderY2 = -10;

        ctx.fillStyle = CU.rgba(0, 240, 255, alpha);
        ctx.lineWidth = 0;
        // Left wing — full triangle (shoulder → wingTip → innerTail → tail)
        ctx.beginPath();
        ctx.moveTo(-shoulderX, shoulderY2);
        ctx.lineTo(-wingTipX, wingTipY);
        ctx.lineTo(-innerTailX, innerTailY);
        ctx.lineTo(0, tailY);
        ctx.closePath(); ctx.fill();
        // Right wing
        ctx.beginPath();
        ctx.moveTo(shoulderX, shoulderY2);
        ctx.lineTo(wingTipX, wingTipY);
        ctx.lineTo(innerTailX, innerTailY);
        ctx.lineTo(0, tailY);
        ctx.closePath(); ctx.fill();

        // Leading edge bright stroke
        ctx.strokeStyle = CU.rgba(0, 240, 255, alpha * 1.5);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-shoulderX, shoulderY2); ctx.lineTo(-wingTipX, wingTipY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(shoulderX, shoulderY2); ctx.lineTo(wingTipX, wingTipY);
        ctx.stroke();

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
     * v5.27b: Inverted-V delta — wing tips are rearmost+widest.
     */
    _computeGeomForLevel(level) {
        const isGC = this._godchainActive;
        // v5.28: Premium Arsenal — swept-back delta (narrower, more aggressive)
        return {
            wingSpan:    isGC ? 50 : (level >= 3 ? 46 : (level >= 2 ? 43 : 40)),
            shoulderW:   isGC ? 17 : (level >= 3 ? 16 : (level >= 2 ? 14 : 13)),
            cannonExt:   isGC ? 14 : (level >= 2 ? 10 : 0),
            barrelExt:   isGC ? 18 : (level >= 3 ? 16 : 0),
            barrelW:     isGC ? 6  : (level >= 3 ? 5  : 0),
            cannonLen:   isGC ? 10 : (level >= 3 ? 10 : (level <= 1 ? 10 : 0)),
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
        const g = this._geom;
        const fromGeom = d.active
            ? { wingSpan: g.wingSpan, shoulderW: g.shoulderW, cannonExt: g.cannonExt, barrelExt: g.barrelExt, barrelW: g.barrelW, cannonLen: g.cannonLen }
            : this._computeGeomForLevel(fromLevel);

        // For components that don't exist at fromLevel, use hidden positions
        if (fromLevel < 2) {
            fromGeom.cannonExt = 0;
        }
        if (fromLevel < 3) {
            fromGeom.barrelExt = 0;
            fromGeom.barrelW = 0;
        }
        // v5.28: LV1→LV2 retracts nose cannon
        if (fromLevel <= 1 && toLevel === 2) {
            fromGeom.cannonLen = fromGeom.cannonLen ?? 10;
        }

        // v5.28: Energy Surge — per-transition timing
        const surge = cfg.ENERGY_SURGE;
        const transIdx = toLevel >= 3 ? 2 : (toLevel >= 2 ? 1 : 0);

        d.active = true;
        d.timer = 0;
        d.duration = surge?.DEPLOY_DURATION?.[transIdx] ?? cfg.DURATION;
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

        // v5.28: Trigger slowmo for LV2+ transitions
        const slowDur = surge?.SLOWDOWN_DURATION?.[transIdx];
        const slowScale = surge?.SLOWDOWN_SCALE?.[transIdx];
        if (slowDur > 0 && slowScale < 1 && window.Game.EffectsRenderer) {
            window.Game.EffectsRenderer.setHitStop(slowDur, false, slowScale);
        }

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
        g.wingSpan    = from.wingSpan + (to.wingSpan - from.wingSpan) * t;
        g.shoulderW   = from.shoulderW + (to.shoulderW - from.shoulderW) * t;
        g.cannonExt   = from.cannonExt + (to.cannonExt - from.cannonExt) * t;
        g.barrelExt   = from.barrelExt + (to.barrelExt - from.barrelExt) * t;
        g.barrelW     = from.barrelW + (to.barrelW - from.barrelW) * t;
        g.cannonLen   = (from.cannonLen ?? 0) + ((to.cannonLen ?? 0) - (from.cannonLen ?? 0)) * t;

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
            g.wingSpan = to.wingSpan;
            g.shoulderW = to.shoulderW;
            g.cannonExt = to.cannonExt;
            g.barrelExt = to.barrelExt;
            g.barrelW = to.barrelW;
            g.cannonLen = to.cannonLen ?? 0;
        }
    }

    /**
     * v5.27b: Inverted-V delta ship. 8-vertex polygon.
     * Wing tips at Y=+20 are the REARMOST AND WIDEST points.
     * Tail notch at Y=+4 is shorter → creates ∧ silhouette.
     */
    _drawShipBody(ctx) {
        const CU = window.Game.ColorUtils;
        const level = this.weaponLevel ?? 1;
        const t = this.animTime;
        const gc = this._godchainActive ? window.Game.Balance?.GODCHAIN : null;
        const gcColors = gc?.SHIP_COLORS;
        const isGC = this._godchainActive;

        // Geometry from cache (animated during deploy, else snapped)
        if (!this._deploy.active) {
            const tgt = this._computeGeomForLevel(level);
            const gm = this._geom;
            gm.wingSpan = tgt.wingSpan; gm.shoulderW = tgt.shoulderW;
            gm.cannonExt = tgt.cannonExt; gm.barrelExt = tgt.barrelExt; gm.barrelW = tgt.barrelW;
            gm.cannonLen = tgt.cannonLen;
        }
        const g = this._geom;
        const ws = g.wingSpan;       // Wing tip half-X (36-46)
        const sw = g.shoulderW;      // Shoulder half-X (6-9)

        // Palette
        const bodyDark  = gcColors ? gcColors.BODY_DARK : '#2a2040';
        const bodyLight = gcColors ? gcColors.BODY : '#6644aa';
        const rs = window.Game.RunState;
        const cannonTint = !gcColors ? G.Balance?.ELEMENTAL?.CANNON_TINT : null;
        const elemTint = cannonTint && rs ? (
            rs.hasElectricPerk ? cannonTint.ELECTRIC :
            rs.hasLaserPerk ? cannonTint.LASER :
            rs.hasFirePerk ? cannonTint.FIRE : null
        ) : null;
        const noseDark  = gcColors ? gcColors.NOSE : (elemTint ? elemTint.DARK : '#4d3366');
        const noseLight = gcColors ? gcColors.NOSE_LIGHT : (elemTint ? elemTint.LIGHT : '#9966cc');
        const accentGlow = gcColors ? '#ff6600' : '#bb44ff';
        const outline   = '#1a1028';

        // Fixed Y coordinates — INVERTED V (∧) shape, v5.28: swept-back delta
        const tipY = -36;         // Nose tip (topmost)
        const shoulderY = -10;    // Shoulder level
        const wingTipY = 36;      // Wing tips: REARMOST AND WIDEST! (31→36 more swept back)
        const innerTailY = 13;    // Inner tail edges
        const tailY = 5;          // Center tail notch (shorter than wing tips!)

        // X positions
        const shoulderX = sw;       // (13-17)
        const wingTipX = ws;        // (47-60) WIDEST!
        const innerTailX = 7;       // Fixed narrow tail

        ctx.lineWidth = 3;
        ctx.strokeStyle = outline;

        // === 1. LV3+: ARMOR PLATES on wings ===
        if (level >= 3) {
            ctx.save();
            ctx.lineWidth = 2;
            ctx.strokeStyle = outline;
            ctx.fillStyle = bodyDark;
            ctx.globalAlpha = 0.85;
            // Points on wing leading edge at 35% and 65%
            const f1 = 0.35, f2 = 0.65;
            const px1 = sw + (ws - sw) * f1;
            const py1 = shoulderY + (wingTipY - shoulderY) * f1;
            const px2 = sw + (ws - sw) * f2;
            const py2 = shoulderY + (wingTipY - shoulderY) * f2;
            // Left plate
            ctx.beginPath();
            ctx.moveTo(-px1 + 2, py1); ctx.lineTo(-px2 + 1, py2);
            ctx.lineTo(-px2 + 7, py2 + 2); ctx.lineTo(-px1 + 5, py1 + 2);
            ctx.closePath(); ctx.fill(); ctx.stroke();
            // Right plate
            ctx.beginPath();
            ctx.moveTo(px1 - 2, py1); ctx.lineTo(px2 - 1, py2);
            ctx.lineTo(px2 - 7, py2 + 2); ctx.lineTo(px1 - 5, py1 + 2);
            ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.restore();
        }

        // === 2. MAIN BODY — 8-vertex inverted V (∧) ===
        ctx.lineWidth = 3;
        ctx.strokeStyle = outline;

        // Left half (dark)
        ctx.fillStyle = bodyDark;
        ctx.beginPath();
        ctx.moveTo(0, tipY);
        ctx.lineTo(-shoulderX, shoulderY);
        ctx.lineTo(-wingTipX, wingTipY);
        ctx.lineTo(-innerTailX, innerTailY);
        ctx.lineTo(0, tailY);
        ctx.closePath();
        ctx.fill();

        // Right half (light)
        ctx.fillStyle = bodyLight;
        ctx.beginPath();
        ctx.moveTo(0, tipY);
        ctx.lineTo(shoulderX, shoulderY);
        ctx.lineTo(wingTipX, wingTipY);
        ctx.lineTo(innerTailX, innerTailY);
        ctx.lineTo(0, tailY);
        ctx.closePath();
        ctx.fill();

        // Full outline
        ctx.beginPath();
        ctx.moveTo(0, tipY);
        ctx.lineTo(-shoulderX, shoulderY);
        ctx.lineTo(-wingTipX, wingTipY);
        ctx.lineTo(-innerTailX, innerTailY);
        ctx.lineTo(0, tailY);
        ctx.lineTo(innerTailX, innerTailY);
        ctx.lineTo(wingTipX, wingTipY);
        ctx.lineTo(shoulderX, shoulderY);
        ctx.closePath();
        ctx.stroke();

        // === 3. DORSAL SPINE ===
        ctx.save();
        ctx.strokeStyle = accentGlow;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = isGC ? 0.9 : 0.6;
        ctx.beginPath();
        ctx.moveTo(0, tipY + 6);
        ctx.lineTo(0, tailY - 1);
        ctx.stroke();
        ctx.restore();

        // === 4. PANEL LINES (LV2+) ===
        if (level >= 2) {
            ctx.save();
            ctx.strokeStyle = accentGlow;
            ctx.lineWidth = level >= 3 ? 2.5 : 2;
            ctx.globalAlpha = isGC ? 0.9 : 0.65;
            // Horizontal accent across body
            ctx.beginPath();
            ctx.moveTo(-sw + 1, shoulderY + 4);
            ctx.lineTo(sw - 1, shoulderY + 4);
            ctx.stroke();
            // LV3+: wing chord lines
            if (level >= 3) {
                ctx.lineWidth = 1.5;
                ctx.globalAlpha = isGC ? 0.7 : 0.4;
                const midX = (shoulderX + wingTipX) * 0.5;
                const midY = (shoulderY + wingTipY) * 0.5;
                ctx.beginPath();
                ctx.moveTo(-shoulderX - 2, shoulderY + 3);
                ctx.lineTo(-midX, midY);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(shoulderX + 2, shoulderY + 3);
                ctx.lineTo(midX, midY);
                ctx.stroke();
            }
            ctx.restore();
        }

        // === 5. NOSE ACCENT (two-tone triangle) ===
        ctx.lineWidth = 2;
        ctx.strokeStyle = outline;
        ctx.fillStyle = noseDark;
        ctx.beginPath();
        ctx.moveTo(0, tipY);
        ctx.lineTo(-shoulderX - 1, shoulderY + 2);
        ctx.lineTo(0, shoulderY + 2);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = noseLight;
        ctx.beginPath();
        ctx.moveTo(0, tipY);
        ctx.lineTo(0, shoulderY + 2);
        ctx.lineTo(shoulderX + 1, shoulderY + 2);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(0, tipY);
        ctx.lineTo(-shoulderX - 1, shoulderY + 2);
        ctx.lineTo(shoulderX + 1, shoulderY + 2);
        ctx.closePath();
        ctx.stroke();

        // === 6. NOSE CANNON (v5.28: cannonLen slide-out) ===
        {
            const cLen = g.cannonLen;
            const showNoseCannon = this._cannonMounted && cLen > 0 && (level < 2 || level >= 3);
            const deployFadeOut = this._deploy.active && this._deploy.fromLevel === 1 && this._deploy.toLevel === 2;
            const deployFadeIn = this._deploy.active && this._deploy.toLevel >= 3;
            const noseAlpha = deployFadeOut ? Math.max(0, 1 - this._deploy.t) :
                              (deployFadeIn ? Math.min(1, this._deploy.t) : 1);

            if ((showNoseCannon || deployFadeOut || deployFadeIn) && cLen > 0) {
                ctx.globalAlpha = noseAlpha;
                const cTop = tipY - cLen;
                // Twin rails
                ctx.fillStyle = noseLight;
                ctx.strokeStyle = outline;
                ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.rect(-4, cTop, 2.5, cLen); ctx.fill(); ctx.stroke();
                ctx.beginPath(); ctx.rect(1.5, cTop, 2.5, cLen); ctx.fill(); ctx.stroke();
                // Housing cap
                ctx.fillStyle = noseDark;
                ctx.beginPath(); ctx.rect(-5, cTop - 1.5, 10, 3); ctx.fill(); ctx.stroke();
                // Glow tip
                const nbPulse = Math.sin(t * 8) * 0.3 + 0.7;
                ctx.fillStyle = accentGlow;
                ctx.globalAlpha = noseAlpha * nbPulse * 0.8;
                ctx.beginPath(); ctx.arc(0, cTop, 2.2, 0, Math.PI * 2); ctx.fill();
                ctx.globalAlpha = 1;
            } else if (!this._cannonMounted) {
                // Pre-mount glow dot
                const nbPulse = Math.sin(t * 6) * 0.3 + 0.7;
                ctx.fillStyle = accentGlow;
                ctx.globalAlpha = nbPulse * 0.4;
                ctx.beginPath(); ctx.arc(0, tipY + 3, 2, 0, Math.PI * 2); ctx.fill();
                ctx.globalAlpha = 1;
            }
        }

        // === 7. LV3+: HEAVY CENTRAL BARREL (v5.28: triple-layer) ===
        if ((level >= 3 || (this._deploy.active && this._deploy.toLevel >= 3)) && g.barrelExt > 0) {
            const barrelTop = tipY - g.barrelExt;
            const bW = g.barrelW;
            // Dark base layer
            ctx.fillStyle = noseDark; ctx.strokeStyle = outline; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.rect(-bW, barrelTop, bW * 2, g.barrelExt); ctx.fill(); ctx.stroke();
            // Neon mid layer (inner rails)
            ctx.fillStyle = noseLight;
            ctx.beginPath(); ctx.rect(-3, barrelTop + 1, 2.5, g.barrelExt - 2); ctx.fill();
            ctx.beginPath(); ctx.rect(0.5, barrelTop + 1, 2.5, g.barrelExt - 2); ctx.fill();
            // Bright tip accent
            ctx.fillStyle = accentGlow; ctx.globalAlpha = 0.9;
            ctx.beginPath(); ctx.rect(-bW + 1, barrelTop, bW * 2 - 2, 2); ctx.fill();
            ctx.globalAlpha = 1;
            // Muzzle cap
            ctx.fillStyle = noseDark;
            ctx.beginPath(); ctx.rect(-bW - 2, barrelTop - 2, (bW + 2) * 2, 3); ctx.fill(); ctx.stroke();
            // Pulsing glow orb (r=3)
            if (level >= 3) {
                const bPulse = Math.sin(t * 6) * 0.3 + 0.7;
                ctx.fillStyle = accentGlow; ctx.globalAlpha = bPulse * 0.8;
                ctx.beginPath(); ctx.arc(0, barrelTop - 1, 3, 0, Math.PI * 2); ctx.fill();
                ctx.globalAlpha = 1;
            }
            if (isGC) {
                ctx.save(); ctx.globalCompositeOperation = 'lighter';
                const corePulse = Math.sin(t * 8) * 0.4 + 0.6;
                ctx.fillStyle = CU.rgba(255, 100, 0, corePulse);
                ctx.beginPath(); ctx.arc(0, barrelTop - 3, 6, 0, Math.PI * 2); ctx.fill();
                ctx.restore();
            }
        }

        // === 8. LV2+: WING CANNON PODS (v5.28: larger, energy lines, circuit) ===
        if ((level >= 2 || (this._deploy.active && this._deploy.toLevel >= 2)) && g.cannonExt > 0) {
            const cExt = g.cannonExt;
            const frac = 0.30;
            const cannonX = shoulderX + (wingTipX - shoulderX) * frac;
            const cannonBaseY = shoulderY + (wingTipY - shoulderY) * frac;
            const cannonTipY2 = cannonBaseY - cExt;

            ctx.lineWidth = 2; ctx.strokeStyle = outline;
            for (const side of [-1, 1]) {
                const cx = side * cannonX;
                // Elongated diamond housing
                ctx.fillStyle = side < 0 ? noseDark : noseLight;
                ctx.beginPath();
                ctx.moveTo(cx, cannonBaseY + 5);
                ctx.lineTo(cx - side * 4, cannonBaseY);
                ctx.lineTo(cx, cannonTipY2);
                ctx.lineTo(cx + side * 4, cannonBaseY);
                ctx.closePath(); ctx.fill(); ctx.stroke();
                // Twin rails
                ctx.fillStyle = noseLight;
                ctx.beginPath(); ctx.rect(cx - 3, cannonTipY2 - 2, 2, cExt); ctx.fill(); ctx.stroke();
                ctx.beginPath(); ctx.rect(cx + 1, cannonTipY2 - 2, 2, cExt); ctx.fill(); ctx.stroke();
                // Muzzle cap
                ctx.fillStyle = noseDark;
                ctx.beginPath(); ctx.rect(cx - 4, cannonTipY2 - 3, 8, 2.5); ctx.fill(); ctx.stroke();
            }

            // Glow orbs at tips
            const tipR = level >= 3 ? 5 : 4;
            const tipAlpha = level >= 3 ? (Math.sin(t * 6) * 0.3 + 0.7) : 0.7;
            ctx.fillStyle = accentGlow; ctx.globalAlpha = tipAlpha;
            ctx.beginPath(); ctx.arc(-cannonX, cannonTipY2 - 1, tipR, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(cannonX, cannonTipY2 - 1, tipR, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1;

            // LV2: Energy line between pods (subtle)
            if (level === 2 && !isGC) {
                ctx.save(); ctx.globalCompositeOperation = 'lighter';
                ctx.strokeStyle = CU.rgba(187, 68, 255, 0.15 + Math.sin(t * 4) * 0.1);
                ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(-cannonX, cannonTipY2); ctx.lineTo(cannonX, cannonTipY2); ctx.stroke();
                ctx.restore();
            }

            // LV3: Energy circuit lines from reactor (center) to all 3 cannons
            if (level >= 3) {
                ctx.save(); ctx.globalCompositeOperation = 'lighter';
                const circuitAlpha = 0.2 + Math.sin(t * 5) * 0.15;
                ctx.strokeStyle = CU.rgba(187, 68, 255, circuitAlpha);
                ctx.lineWidth = 1.5;
                // Center to wing pods
                ctx.beginPath(); ctx.moveTo(0, shoulderY); ctx.lineTo(-cannonX, cannonTipY2); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(0, shoulderY); ctx.lineTo(cannonX, cannonTipY2); ctx.stroke();
                // Center to central barrel
                if (g.barrelExt > 0) {
                    ctx.beginPath(); ctx.moveTo(0, shoulderY); ctx.lineTo(0, tipY - g.barrelExt); ctx.stroke();
                }
                ctx.restore();
            }
        }

        // === 9. SHIELD WING GLOW ===
        this._drawShieldWingGlow(ctx, g);

        // === 10. WING TIP ACCENTS ===
        {
            const wtPulse = Math.sin(t * 5) * 0.3 + 0.7;
            ctx.fillStyle = accentGlow;
            ctx.globalAlpha = wtPulse * (level >= 3 ? 0.8 : 0.5);
            ctx.beginPath(); ctx.arc(-wingTipX, wingTipY, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(wingTipX, wingTipY, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1;
        }

        // GODCHAIN: wing energy trails from wing tips
        if (isGC) {
            ctx.save(); ctx.globalCompositeOperation = 'lighter';
            const wePulse = Math.sin(t * 5) * 0.3 + 0.5;
            ctx.strokeStyle = CU.rgba(255, 100, 0, wePulse); ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-wingTipX, wingTipY + 2);
            ctx.lineTo(-wingTipX - 4, wingTipY + 14 + Math.sin(t * 7) * 4);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(wingTipX, wingTipY + 2);
            ctx.lineTo(wingTipX + 4, wingTipY + 14 + Math.sin(t * 7 + 1) * 4);
            ctx.stroke();
            ctx.restore();
        }

        // === RIM LIGHTING (right edge highlight) ===
        ctx.strokeStyle = gcColors ? gcColors.BODY_LIGHT : '#9977cc';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(3, tipY + 4);
        ctx.lineTo(shoulderX + 1, shoulderY);
        ctx.lineTo(wingTipX - 4, wingTipY - 2);
        ctx.stroke();
        ctx.strokeStyle = noseLight; ctx.lineWidth = 1; ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.moveTo(2, tipY + 2);
        ctx.lineTo(shoulderX, shoulderY + 2);
        ctx.stroke();
        ctx.globalAlpha = 1;

        // === BTC COCKPIT — direct ₿ symbol (reactive color per element) ===
        {
            const rs = window.Game.RunState;
            const canopyCfg = window.Game.Balance?.ELEMENTAL?.COCKPIT_CANOPY;
            let btcColor;
            if (isGC) {
                const hue = (t * 60) % 360;
                btcColor = `hsl(${hue}, 100%, 60%)`;
            } else if (rs?.hasElectricPerk) {
                btcColor = canopyCfg?.COLOR_ELECTRIC ?? '#aa77ff';
            } else if (rs?.hasLaserPerk) {
                btcColor = canopyCfg?.COLOR_LASER ?? '#00f0ff';
            } else if (rs?.hasFirePerk) {
                btcColor = canopyCfg?.COLOR_FIRE ?? '#ff6622';
            } else {
                btcColor = canopyCfg?.COLOR_DEFAULT ?? '#00f0ff';
            }
            this._drawBtcSymbolPath(ctx, 0, -12, 0.85, isGC, btcColor);
        }

        // === GODCHAIN ENERGY LINES ===
        if (isGC) {
            ctx.save(); ctx.globalCompositeOperation = 'lighter';
            const linePulse = Math.sin(t * 4) * 0.3 + 0.6;
            ctx.strokeStyle = CU.rgba(255, 80, 0, linePulse); ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(-sw, -20); ctx.lineTo(-sw, 2); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(sw, -20); ctx.lineTo(sw, 2); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-sw, shoulderY + 2); ctx.lineTo(sw, shoulderY + 2); ctx.stroke();
            // Wing leading edge energy
            ctx.strokeStyle = CU.rgba(255, 100, 0, linePulse * 0.4); ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(-shoulderX, shoulderY); ctx.lineTo(-wingTipX, wingTipY); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(shoulderX, shoulderY); ctx.lineTo(wingTipX, wingTipY); ctx.stroke();
            ctx.restore();
        }
    }

    /**
     * v5.9: Draw BTC symbol as path strokes (not text) for crisp cockpit
     */
    /**
     * v5.28: Cockpit canopy — transparent ellipse with reactive BTC symbol inside
     */
    _drawCockpitCanopy(ctx, isGC) {
        const CU = window.Game.ColorUtils;
        const cfg = window.Game.Balance?.ELEMENTAL?.COCKPIT_CANOPY;
        const rx = cfg?.RX ?? 12;
        const ry = cfg?.RY ?? 9;
        const cy = cfg?.CY ?? -12;
        const glassAlpha = cfg?.GLASS_ALPHA ?? 0.12;
        const btcScale = cfg?.BTC_SCALE ?? 0.7;
        const t = this.animTime;

        // Determine reactive color
        const rs = window.Game.RunState;
        let btcColor;
        if (isGC) {
            btcColor = null; // prismatic
        } else if (rs?.hasElectricPerk) {
            btcColor = cfg?.COLOR_ELECTRIC ?? '#aa77ff';
        } else if (rs?.hasLaserPerk) {
            btcColor = cfg?.COLOR_LASER ?? '#00f0ff';
        } else if (rs?.hasFirePerk) {
            btcColor = cfg?.COLOR_FIRE ?? '#ff6622';
        } else {
            btcColor = cfg?.COLOR_DEFAULT ?? '#00f0ff';
        }

        ctx.save();

        // 1. Glass ellipse (semi-transparent)
        ctx.fillStyle = CU.rgba(100, 160, 255, glassAlpha);
        ctx.beginPath();
        ctx.ellipse(0, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();

        // 2. Metallic border
        const noseLight = this._godchainActive
            ? (window.Game.Balance?.GODCHAIN?.SHIP_COLORS?.NOSE_LIGHT ?? '#ff8800')
            : '#9966cc';
        ctx.strokeStyle = noseLight;
        ctx.lineWidth = cfg?.BORDER_WIDTH ?? 1.5;
        ctx.stroke();

        // 3. Glass highlight (upper-left arc)
        ctx.beginPath();
        ctx.ellipse(-rx * 0.3, cy - ry * 0.3, rx * 0.5, ry * 0.4, -0.4, -Math.PI * 0.8, Math.PI * 0.1);
        ctx.strokeStyle = CU.rgba(255, 255, 255, 0.25);
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.restore();

        // 4. BTC symbol inside canopy
        if (isGC) {
            // Prismatic: rotate hue over time
            const hue = (t * 60) % 360;
            const prismaticColor = `hsl(${hue}, 100%, 60%)`;
            this._drawBtcSymbolPath(ctx, 0, cy, btcScale, true, prismaticColor);
        } else {
            this._drawBtcSymbolPath(ctx, 0, cy, btcScale, false, btcColor);
        }
    }

    _drawBtcSymbolPath(ctx, cx, cy, scale, isGodchain, colorOverride) {
        const CU = window.Game.ColorUtils;
        const s = scale;
        const color = colorOverride ?? (isGodchain ? '#ff6600' : '#00f0ff');

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
    /**
     * v5.31: Energy Skin — shield conforms to ship body outline
     * 4-layer glow (outer/mid/fill/core) + traveling sparks along perimeter.
     * Reuses _drawShipBody coordinates: tipY=-36, shoulderY=-10, wingTipY=36,
     * innerTailY=13, tailY=5, wingSpan/shoulderW from _geom, innerTailX=7.
     */
    _drawEnergySkin(ctx) {
        const CU = window.Game.ColorUtils;
        const cfg = window.Game.Balance?.VFX?.ENERGY_SKIN;
        if (cfg?.ENABLED === false) return;

        const t = this._shieldAnim;
        let fade = this._shieldFade;

        // Warning blink in last WARN_TIME seconds
        const WARN_TIME = cfg?.WARN_TIME ?? 1.5;
        if (this.shieldActive && this.shieldTimer > 0 && this.shieldTimer < WARN_TIME) {
            const urgency = 1 - (this.shieldTimer / WARN_TIME);
            const freq = 4 + urgency * 8;
            const blink = Math.max(0.05, 0.5 + 0.5 * Math.sin(t * freq * Math.PI * 2));
            fade *= blink;
        }

        const g = this._geom;
        const ws = g.wingSpan;
        const sw = g.shoulderW;

        // 8-vertex body path (same as _drawShipBody)
        const tipY = -36;
        const shoulderY = -10;
        const wingTipY = 36;
        const innerTailY = 13;
        const tailY = 5;
        const innerTailX = 7;

        // Build path as array for reuse
        const verts = [
            [0, tipY],                  // 0: nose tip
            [-sw, shoulderY],           // 1: left shoulder
            [-ws, wingTipY],            // 2: left wing tip
            [-innerTailX, innerTailY],  // 3: left inner tail
            [0, tailY],                 // 4: center tail
            [innerTailX, innerTailY],   // 5: right inner tail
            [ws, wingTipY],             // 6: right wing tip
            [sw, shoulderY],            // 7: right shoulder
        ];

        // Helper: trace the body path
        const tracePath = () => {
            ctx.beginPath();
            ctx.moveTo(verts[0][0], verts[0][1]);
            for (let i = 1; i < verts.length; i++) {
                ctx.lineTo(verts[i][0], verts[i][1]);
            }
            ctx.closePath();
        };

        ctx.save();
        ctx.globalAlpha = fade;
        ctx.globalCompositeOperation = 'lighter';

        // Pulsing alpha modulation
        const pulse = 0.85 + 0.15 * Math.sin(t * 6);

        // Layer 1: Outer glow stroke
        tracePath();
        ctx.strokeStyle = CU.rgba(0, 240, 255, 0.30 * pulse);
        ctx.lineWidth = cfg?.OUTER_STROKE ?? 8;
        ctx.lineJoin = 'round';
        ctx.stroke();

        // Layer 2: Mid stroke
        tracePath();
        ctx.strokeStyle = CU.rgba(0, 240, 255, 0.50 * pulse);
        ctx.lineWidth = cfg?.MID_STROKE ?? 4;
        ctx.stroke();

        // Layer 3: Semi-transparent fill
        tracePath();
        ctx.fillStyle = CU.rgba(0, 240, 255, cfg?.FILL_ALPHA ?? 0.08);
        ctx.fill();

        // Layer 4: Core bright stroke
        tracePath();
        ctx.strokeStyle = CU.rgba(0, 240, 255, 0.70 * pulse);
        ctx.lineWidth = cfg?.CORE_STROKE ?? 1.5;
        ctx.stroke();

        // Layer 5: Traveling sparks along perimeter
        const sparkCount = cfg?.SPARK_COUNT ?? 3;
        const sparkSpeed = cfg?.SPARK_SPEED ?? 1.2;
        const sparkR = cfg?.SPARK_RADIUS ?? 3;

        for (let s = 0; s < sparkCount; s++) {
            const frac = ((t * sparkSpeed + s / sparkCount) % 1 + 1) % 1;
            const pt = this._getPerimeterPoint(verts, frac);
            const sparkAlpha = 0.7 + 0.3 * Math.sin(t * 12 + s * 2.1);
            ctx.beginPath();
            ctx.arc(pt[0], pt[1], sparkR, 0, Math.PI * 2);
            ctx.fillStyle = CU.rgba(200, 255, 255, sparkAlpha);
            ctx.fill();
        }

        ctx.restore();
    }

    /**
     * Interpolate a point along the closed perimeter of the 8-vertex body.
     * frac: 0..1 maps to full loop.
     */
    _getPerimeterPoint(verts, frac) {
        const n = verts.length;
        // Compute segment lengths
        let totalLen = 0;
        const segLens = [];
        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            const dx = verts[j][0] - verts[i][0];
            const dy = verts[j][1] - verts[i][1];
            const len = Math.sqrt(dx * dx + dy * dy);
            segLens.push(len);
            totalLen += len;
        }
        let target = frac * totalLen;
        for (let i = 0; i < n; i++) {
            if (target <= segLens[i]) {
                const t = segLens[i] > 0 ? target / segLens[i] : 0;
                const j = (i + 1) % n;
                return [
                    verts[i][0] + (verts[j][0] - verts[i][0]) * t,
                    verts[i][1] + (verts[j][1] - verts[i][1]) * t
                ];
            }
            target -= segLens[i];
        }
        return [verts[0][0], verts[0][1]];
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
        // v5.27b: Muzzle points — inverted-V delta, cannons at 30% wing leading edge
        const muzzles = [];
        const CANNON_FRAC = 0.30;
        const _shoulderY = -10, _wingTipY = 36; // v5.28: swept-back
        if (effectiveLevel <= 1) {
            muzzles.push({ x: 0, y: -36 });
        } else if (effectiveLevel === 2) {
            const cx = gm.shoulderW + (gm.wingSpan - gm.shoulderW) * CANNON_FRAC;
            const cBaseY = _shoulderY + (_wingTipY - _shoulderY) * CANNON_FRAC;
            const cTipY = cBaseY - gm.cannonExt;
            muzzles.push({ x: -cx, y: cTipY });
            muzzles.push({ x: cx, y: cTipY });
        } else {
            const cx = gm.shoulderW + (gm.wingSpan - gm.shoulderW) * CANNON_FRAC;
            const cBaseY = _shoulderY + (_wingTipY - _shoulderY) * CANNON_FRAC;
            const cTipY = cBaseY - gm.cannonExt;
            muzzles.push({ x: -cx, y: cTipY });
            muzzles.push({ x: 0, y: -36 - gm.barrelExt }); // v5.28: -28→-36
            muzzles.push({ x: cx, y: cTipY });
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
