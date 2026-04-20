window.Game = window.Game || {};

class Enemy extends window.Game.Entity {
    constructor(x, y, typeConf) {
        super(x, y, 58, 58); // v4.25: +20% size (was 48), cell-shaded scale-up

        this.baseY = y;
        this.symbol = typeConf.s;
        this.name = typeConf.name || '???';
        this.color = typeConf.c;
        this.hp = typeConf.hp;
        this.scoreVal = typeConf.val;
        this.fireMin = typeConf.fireMin || 2.5;
        this.fireMax = typeConf.fireMax || 4.0;
        this.aimSpread = typeConf.aimSpread || 0.18;
        this.pattern = typeConf.pattern || 'SINGLE';
        this.shape = typeConf.shape || 'coin';
        this.burstCount = 0;
        this.burstTimer = 0;
        this.telegraphTimer = 0;
        this.telegraphLead = window.Game.Balance.ENEMY_BEHAVIOR.TELEGRAPH_LEAD;

        this.maxHp = this.hp;
        this.active = true;
        this.fireTimer = 0; // Set by spawner for Fibonacci ramp-up
        this.hitFlash = 0; // Flash white when hit
        this._hitShakeTimer = 0; // Micro-shake timer
        this._hitShakeX = 0;     // Shake offset X
        this._hitShakeY = 0;     // Shake offset Y

        // v4.58: Damage deterioration state
        this._sparkTimer = 0;
        this._damageIntensity = 0;
        this._crackData = null;  // Generated once when damaged
        this._crackCount = 0;
        this._wasDamaged = false;
        this._outlineWidth = 2.5;
        this._bodyFill = this._colorDark40;

        // v5.15: Elemental tint state
        this._elemTint = null;
        this._elemTintTimer = 0;
        this._elemPersistent = false;
        this._elemType = null;

        // Special behaviors (set by spawner based on tier)
        this.isKamikaze = false;      // Weak tier: can dive at player
        this.kamikazeDiving = false;  // Currently diving
        this.kamikazeSpeed = window.Game.Balance.ENEMY_BEHAVIOR.KAMIKAZE_SPEED;

        this.canTeleport = false;     // Strong tier: can teleport
        this.teleportCooldown = 0;    // Time until next teleport
        this.teleportFlash = 0;       // Visual feedback

        this.isMinion = false;        // Boss minion type

        // v5.32: Elite variant state
        this.isElite = false;
        this.eliteType = null;       // 'ARMORED', 'EVADER', 'REFLECTOR'
        this._evaderCooldown = 0;
        this._evaderDashing = false;
        this._evaderDashVx = 0;
        this._evaderDashTimer = 0;
        this.reflectCharges = 0;
        this._reflectBroken = false;

        // v5.32: Behavior state
        this.behavior = null;        // 'FLANKER', 'BOMBER', 'HEALER', 'CHARGER'
        this._behaviorPhase = 'IDLE';
        this._behaviorTimer = 0;
        this._behaviorTimer2 = 0;
        this._flankerDir = 0;
        this._flankerFireTimer = 0;
        this._chargerOriginY = 0;
        this._chargerTargetY = 0;
        this._healerPulseTimer = 0;

        // Formation entry system
        this.isEntering = false;      // True while flying to position
        this.targetX = x;             // Final X position
        this.targetY = y;             // Final Y position
        this.entryDelay = 0;          // Staggered delay before starting entry
        this.entryProgress = 0;       // 0-1 progress of entry animation
        this.settleTimer = 0;         // Time to settle after reaching position
        this.hasSettled = false;      // True after settling complete (can fire)
        this.entryTimer = 0;          // v5.24: Safety timeout — force-complete entry after max time

        // Pre-cache colors for performance (avoid recalculating every frame)
        const CU = window.Game.ColorUtils;
        this._colorDark30 = CU.darken(this.color, 0.3);
        this._colorDark35 = CU.darken(this.color, 0.35);
        this._colorDark40 = CU.darken(this.color, 0.4);
        this._colorDark50 = CU.darken(this.color, 0.5);
        this._colorLight35 = CU.lighten(this.color, 0.35);
        this._colorLight40 = CU.lighten(this.color, 0.4);
        this._colorLight50 = CU.lighten(this.color, 0.5);
        this._colorBright = CU.lighten(this.color, 0.25); // v4.56: neon outline color

        // v7.9 Agents of the System — tier derivation from scoreVal (authoritative via typeConf)
        this._tier = this.scoreVal < 35 ? 'WEAK' : (this.scoreVal < 70 ? 'MEDIUM' : 'STRONG');
        // Per-enemy walk offset so walk cycles desync across the swarm
        this._walkOffset = Math.random() * 1000;

        // v7.9.5 Gravity Gate — random Y target for hover-stop + flip upright.
        // State machine: 'IDLE' → 'DWELL' (vy=0, upright) → 'LEAVING' (vy=EXIT_VY, flipped back).
        // v7.9.5b: only HOVER_CHANCE fraction of enemies hover-stop; rest descend through as before.
        const hg = window.Game.Balance?.HOVER_GATE;
        if (hg) {
            const gh = window.Game._gameHeight || 800;
            this._hoverY = gh * (hg.Y_MIN + Math.random() * (hg.Y_MAX - hg.Y_MIN));
            this._hoverEnabled = Math.random() < (hg.HOVER_CHANCE ?? 1.0);
        } else {
            this._hoverY = 9999; // Never trigger if config missing
            this._hoverEnabled = false;
        }
        this._hoverState = 'IDLE';      // IDLE | DWELL | LEAVING
        this._hoverTimer = 0;           // DWELL countdown
        this._uprightFlip = false;      // Render flag consumed by drawAgent + _drawChestMark
        this._fireSuppressed = false;   // v7.9.5b: true during DWELL grace window — skipped by HarmonicConductor
    }

    // Note: attemptFire() removed in v2.13.0 - all firing now handled by HarmonicConductor

    buildBullet(target, bulletSpeed, aimSpreadMult, extraAngle = 0) {
        // Arcade modifier: enemy bullet speed
        const _ab = window.Game.RunState && window.Game.RunState.arcadeBonuses;
        if (_ab && _ab.enemyBulletSpeedMult !== 1.0) bulletSpeed *= _ab.enemyBulletSpeedMult;

        // Aiming Logic
        let vx = 0;
        let vy = bulletSpeed;

        if (target) {
            const dx = target.x - this.x;
            const dy = target.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            let angle = Math.atan2(dy, dx);
            const spread = this.aimSpread * aimSpreadMult;
            angle += (Math.random() * 2 - 1) * spread + extraAngle;
            vx = Math.cos(angle) * bulletSpeed;
            vy = Math.sin(angle) * bulletSpeed;
        }

        // Get bullet size from Balance config based on shape
        const Balance = window.Game.Balance;
        const visualConfig = Balance?.BULLET_VISUALS?.[this.shape] || Balance?.BULLET_VISUALS?.DEFAULT || {};
        const size = visualConfig.size || { w: 4, h: 4 }; // v4.14: -40% bullet size (was 6×6)

        return {
            x: this.x,
            y: this.y + Balance.ENEMY_BEHAVIOR.BULLET_SPAWN_Y_OFFSET, // v4.25: Adjusted for 58px enemy
            vx: vx,
            vy: vy,
            color: '#ffffff', // v4.18: All enemy bullets white for visual clarity
            w: size.w,
            h: size.h,
            shape: this.shape,  // Pass enemy shape for visual differentiation
            ownerColor: this.color,  // v4.56: Tint bullet core with enemy color
            symbol: this.symbol  // v7.9.5: Currency glyph — bullet renders as this symbol
        };
    }

    update(dt, globalTime, wavePattern, gridSpeed, gridDir, playerX, playerY) {
        // Decrement hit flash
        const EB = window.Game.Balance.ENEMY_BEHAVIOR;
        const ff = EB.FLASH_FADE;
        if (this.hitFlash > 0) this.hitFlash -= dt * ff.HIT;
        if (this.teleportFlash > 0) this.teleportFlash -= dt * ff.TELEPORT;
        if (this.teleportCooldown > 0) this.teleportCooldown -= dt;

        // v5.15: Elemental tint decay
        if (this._elemTintTimer > 0) {
            this._elemTintTimer -= dt;
            if (this._elemTintTimer <= 0 && !this._elemPersistent) {
                this._elemTint = null;
            }
        }

        // v4.5: Hit shake decay
        if (this._hitShakeTimer > 0) {
            this._hitShakeTimer -= dt;
            const t = this._hitShakeTimer / 0.06;
            const intensity = (window.Game.Balance?.VFX?.HIT_SHAKE_INTENSITY || 2) * t;
            this._hitShakeX = (Math.random() - 0.5) * 2 * intensity;
            this._hitShakeY = (Math.random() - 0.5) * 2 * intensity;
        } else {
            this._hitShakeX = 0;
            this._hitShakeY = 0;
        }

        // v4.58: Neon spark emission when damaged
        const dmgCfg = window.Game.Balance?.VFX?.DAMAGE_VISUAL;
        if (dmgCfg?.ENABLED && dmgCfg.SPARKS?.ENABLED && this._damageIntensity > 0) {
            const spk = dmgCfg.SPARKS;
            const interval = spk.INTERVAL_SLOW + (spk.INTERVAL_FAST - spk.INTERVAL_SLOW) * this._damageIntensity;
            this._sparkTimer -= dt;
            if (this._sparkTimer <= 0) {
                this._sparkTimer = interval;
                if (window.Game.ParticleSystem) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = spk.SPEED_MIN + Math.random() * (spk.SPEED_MAX - spk.SPEED_MIN);
                    window.Game.ParticleSystem.addParticle({
                        x: this.x + (Math.random() - 0.5) * 20,
                        y: this.y + (Math.random() - 0.5) * 12,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed,
                        life: spk.LIFETIME,
                        maxLife: spk.LIFETIME,
                        color: this._colorBright,
                        size: spk.SIZE,
                        isSpark: true
                    });
                }
            }
        }

        // v8 fall-with-scroll: scripted enemies drop with a Gradius-style entry pattern.
        // Skips entry/grid/wave patterns; hit flash + sparks above still apply.
        if (this._v8Fall) {
            const cfg = window.Game.Balance && window.Game.Balance.V8_MODE && window.Game.Balance.V8_MODE.PATTERNS;
            const gw = window.Game._gameWidth || 400;
            const gh = window.Game._gameHeight || 800;
            const pat = this.entryPattern || 'DIVE';

            // v7.9.5 Gravity Gate — active for DIVE/SINE/SWOOP (not HOVER, which has its own dwell).
            // When enemy crosses its hover Y, enter DWELL: flip upright + halt vy, dwell timer begins.
            // After timer expires, enter LEAVING: flip back + vy = EXIT_VY (negative, upward).
            // v7.9.5b: HOVER_CHANCE gate + DWELL_FIRE_GRACE (no-fire window at DWELL start).
            const hgCfg = window.Game.Balance?.HOVER_GATE;
            const hoverGateActive = hgCfg?.ENABLED && pat !== 'HOVER' && this._hoverEnabled;
            if (hoverGateActive) {
                if (this._hoverState === 'IDLE' && this.y >= this._hoverY) {
                    this._hoverState = 'DWELL';
                    this._hoverTimer = hgCfg.DWELL_DURATION;
                    this._uprightFlip = true;
                    this.vy = 0;
                    // Start fire grace — enemy "settles" for a moment before opening fire
                    const grace = hgCfg.DWELL_FIRE_GRACE ?? 0;
                    if (grace > 0) {
                        this._fireSuppressed = true;
                        this._fireGraceTimer = grace;
                    }
                } else if (this._hoverState === 'DWELL') {
                    this._hoverTimer -= dt;
                    if (this._fireSuppressed) {
                        this._fireGraceTimer -= dt;
                        if (this._fireGraceTimer <= 0) this._fireSuppressed = false;
                    }
                    if (this._hoverTimer <= 0) {
                        this._hoverState = 'LEAVING';
                        this._uprightFlip = false;
                        this._fireSuppressed = false;
                        this.vy = hgCfg.EXIT_VY;
                    }
                }
            }

            if (this._hoverState === 'DWELL') {
                // Hold position — no x/y movement. Keep vy=0 so fire budget still works.
                return;
            }

            if (!cfg || !cfg.ENABLED || pat === 'DIVE') {
                const accel = (cfg && cfg.DIVE && cfg.DIVE.ACCEL) || 0;
                // v7.9.5: suppress accel during LEAVING so exit speed stays constant upward
                if (this._hoverState !== 'LEAVING') this.vy += accel * dt;
                this.y += this.vy * dt;
            } else if (pat === 'SINE') {
                this._v8PatTimer = (this._v8PatTimer || 0) + dt;
                this.y += this.vy * dt;
                const baseX = (this._v8SpawnX !== undefined) ? this._v8SpawnX : this.x;
                // v7.9.5: freeze sine X oscillation during LEAVING (straight-line exit)
                if (this._hoverState !== 'LEAVING') {
                    this.x = baseX + Math.sin(this._v8PatTimer * cfg.SINE.FREQ) * cfg.SINE.AMPLITUDE;
                }
                // clamp inside screen margins
                const margin = 20;
                if (this.x < margin) this.x = margin;
                else if (this.x > gw - margin) this.x = gw - margin;
            } else if (pat === 'HOVER') {
                const targetY = gh * cfg.HOVER.Y_TARGET_RATIO;
                if (this._v8PatPhase === undefined) this._v8PatPhase = 'APPROACH';
                if (this._v8PatPhase === 'APPROACH') {
                    this.y += this.vy * dt;
                    if (this.y >= targetY) {
                        this._v8PatPhase = 'DWELL';
                        this._v8PatTimer = cfg.HOVER.DWELL;
                    }
                } else if (this._v8PatPhase === 'DWELL') {
                    this._v8PatTimer -= dt;
                    if (this._v8PatTimer <= 0) {
                        this._v8PatPhase = 'LEAVE';
                        this.vy = cfg.HOVER.EXIT_VY;
                    }
                } else { // LEAVE
                    this.y += this.vy * dt;
                }
            } else if (pat === 'SWOOP') {
                this._v8PatTimer = (this._v8PatTimer || 0) + dt;
                this.y += this.vy * dt;
                // v7.9.5: freeze SWOOP X oscillation during LEAVING (straight-line exit)
                if (this._hoverState !== 'LEAVING') {
                    const baseX = (this._v8SpawnX !== undefined) ? this._v8SpawnX : this.x;
                    const dir = (this._v8SwoopDir !== undefined) ? this._v8SwoopDir : 1;
                    this.x = baseX + dir * Math.sin(this._v8PatTimer * cfg.SWOOP.CURVE_FREQ) * cfg.SWOOP.CURVE_AMP;
                }
                const m = cfg.SWOOP.SIDE_MARGIN || 30;
                if (this.x < m) this.x = m;
                else if (this.x > gw - m) this.x = gw - m;
            }
            return;
        }

        // FORMATION ENTRY - Handle entry animation before normal movement
        if (this.isEntering) {
            // v5.24: Safety timeout — force-complete entry after 4s to prevent stuck state
            this.entryTimer += dt;
            if (this.entryTimer > 4) {
                this.x = this.targetX;
                this.y = this.targetY;
                this.baseY = this.targetY;
                this.rotation = 0;
                this.isEntering = false;
                this.hasSettled = true;
                this.entryProgress = 1;
                return;
            }

            // Wait for entry delay
            if (this.entryDelay > 0) {
                this.entryDelay -= dt;
                return; // Don't move yet
            }

            const Balance = window.Game.Balance;
            const entryConfig = Balance?.FORMATION_ENTRY || {};
            const entrySpeed = entryConfig.ENTRY_SPEED || 350;
            const curveIntensity = entryConfig.CURVE_INTENSITY || 0.4;
            const settleTime = entryConfig.SETTLE_TIME || 0.3;

            // Calculate distance to target
            const dx = this.targetX - this.x;
            const dy = this.targetY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 5) {
                // Move towards target
                const moveAmount = entrySpeed * dt;
                const entryEB = EB.ENTRY;
                const t = 1 - (dist / entryEB.MAX_DISTANCE); // Progress factor
                const path = this.entryPath || 'SINE';

                let moveX, moveY;
                if (path === 'SWEEP') {
                    // Curve from side towards target with ease-in
                    const ease = t * t; // accelerate into position
                    const curveY = Math.sin(t * Math.PI) * 40;
                    const angle = Math.atan2(dy + curveY, dx);
                    moveX = Math.cos(angle) * moveAmount * (0.8 + ease * 0.4);
                    moveY = Math.sin(angle) * moveAmount * (0.8 + ease * 0.4);
                } else if (path === 'SPIRAL') {
                    // Spiral descent
                    const spiralAngle = t * Math.PI * 3;
                    const spiralR = (1 - t) * 60;
                    const spiralDx = dx + Math.cos(spiralAngle) * spiralR;
                    const spiralDy = dy + Math.sin(spiralAngle) * spiralR * 0.4;
                    const angle = Math.atan2(spiralDy, spiralDx);
                    moveX = Math.cos(angle) * moveAmount;
                    moveY = Math.sin(angle) * moveAmount;
                } else if (path === 'SPLIT') {
                    // Direct convergence with slight vertical wave
                    const wave = Math.sin(t * Math.PI * 2) * 20;
                    const angle = Math.atan2(dy + wave, dx);
                    moveX = Math.cos(angle) * moveAmount;
                    moveY = Math.sin(angle) * moveAmount;
                } else {
                    // SINE (default) — original behavior
                    const curveOffset = Math.sin(t * Math.PI) * curveIntensity * entryEB.CURVE_AMPLITUDE;
                    const adjustedDx = dx + curveOffset * (this.targetX > 300 ? -1 : 1);
                    const angle = Math.atan2(dy, adjustedDx);
                    moveX = Math.cos(angle) * moveAmount;
                    moveY = Math.sin(angle) * moveAmount;
                }

                this.x += moveX;
                this.y += moveY;

                // Update entry progress for visual feedback
                this.entryProgress = Math.min(1, t);

                // Slight rotation during entry
                this.rotation = Math.sin(t * Math.PI * 2) * entryEB.ROTATION_WOBBLE;
            } else {
                // Snap to target position
                this.x = this.targetX;
                this.y = this.targetY;
                this.baseY = this.targetY;
                this.rotation = 0;

                // Start settle timer
                if (this.settleTimer === 0) {
                    this.settleTimer = settleTime;
                }

                this.settleTimer -= dt;
                if (this.settleTimer <= 0) {
                    this.isEntering = false;
                    this.hasSettled = true;
                    this.entryProgress = 1;
                }
            }
            return; // Skip normal movement during entry
        }

        // KAMIKAZE DIVE - When diving, ignore normal movement
        if (this.kamikazeDiving && playerY !== undefined) {
            const dx = playerX - this.x;
            const dy = playerY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            this.x += (dx / dist) * this.kamikazeSpeed * dt;
            this.y += (dy / dist) * this.kamikazeSpeed * dt;
            this.rotation = Math.atan2(dy, dx) - Math.PI / 2;
            return; // Skip normal movement
        }

        // TELEPORT - Random chance when player is close
        if (this.canTeleport && this.teleportCooldown <= 0 && playerX !== undefined) {
            const dx = playerX - this.x;
            const dy = playerY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            // Teleport if player bullet might be coming (player below, within range)
            const tp = EB.TELEPORT;
            if (dist < tp.TRIGGER_RANGE && dy > 0 && Math.random() < tp.CHANCE) {
                this.doTeleport();
            }
        }

        // v5.32: EVADER DASH — dodge nearby player bullets
        if (this.isElite && this.eliteType === 'EVADER') {
            if (this._evaderCooldown > 0) this._evaderCooldown -= dt;
            if (this._evaderDashing) {
                this._evaderDashTimer -= dt;
                this.x += this._evaderDashVx * dt;
                // Clamp to screen
                const gw = window.Game._gameWidth || 600;
                this.x = Math.max(30, Math.min(gw - 30, this.x));
                if (this._evaderDashTimer <= 0) this._evaderDashing = false;
            } else if (this._evaderCooldown <= 0) {
                const evCfg = window.Game.Balance?.ELITE_VARIANTS?.EVADER;
                if (evCfg?.ENABLED) {
                    const pBullets = window.Game._playerBullets;
                    if (pBullets) {
                        const detectR = evCfg.DETECT_RADIUS;
                        const detectRSq = detectR * detectR;
                        for (let bi = 0; bi < pBullets.length; bi++) {
                            const pb = pBullets[bi];
                            if (!pb || pb.markedForDeletion) continue;
                            const bdx = pb.x - this.x;
                            const bdy = pb.y - this.y;
                            if (bdx * bdx + bdy * bdy < detectRSq && pb.vy < 0) {
                                // Dash sideways away from bullet
                                const dashDir = bdx > 0 ? -1 : 1;
                                this._evaderDashVx = dashDir * evCfg.DASH_SPEED;
                                this._evaderDashTimer = evCfg.DASH_DISTANCE / evCfg.DASH_SPEED;
                                this._evaderDashing = true;
                                this._evaderCooldown = evCfg.COOLDOWN;
                                break;
                            }
                        }
                    }
                }
            }
        }

        // v5.32: BEHAVIOR UPDATE — Flanker, Bomber, Healer, Charger
        const behCfg = window.Game.Balance?.ENEMY_BEHAVIORS;
        if (this.behavior && behCfg?.ENABLED) {
            if (this.behavior === 'FLANKER' && behCfg.FLANKER?.ENABLED) {
                if (this._behaviorPhase === 'RUN') {
                    this._behaviorTimer -= dt;
                    this.x += this._flankerDir * behCfg.FLANKER.ENTRY_SPEED * dt;
                    // Fire during run
                    this._flankerFireTimer -= dt;
                    if (this._flankerFireTimer <= 0 && playerY !== undefined) {
                        this._flankerFireTimer = behCfg.FLANKER.FIRE_INTERVAL;
                        if (window.Game.Events) {
                            const bulletSpeed = 150;
                            const bd = this.buildBullet({ x: playerX, y: playerY }, bulletSpeed, 1);
                            if (bd) window.Game.Events.emit('harmonic_bullets', { bullets: [bd] });
                        }
                    }
                    if (this._behaviorTimer <= 0) {
                        // Settle into formation
                        this._behaviorPhase = 'SETTLING';
                        this.isEntering = true;
                        this.entryDelay = 0;
                        this.entryProgress = 0;
                        this.hasSettled = false;
                        this.entryTimer = 0;
                    }
                    return; // Skip normal movement during flanker run
                }
            }

            if (this.behavior === 'BOMBER' && behCfg.BOMBER?.ENABLED) {
                this._behaviorTimer -= dt;
                if (this._behaviorTimer <= 0) {
                    this._behaviorTimer = behCfg.BOMBER.BOMB_COOLDOWN;
                    if (window.Game.Events) {
                        window.Game.Events.emit('bomber_drop', {
                            x: this.x, y: this.y + 29,
                            speed: behCfg.BOMBER.BOMB_SPEED,
                            zoneDuration: behCfg.BOMBER.ZONE_DURATION,
                            zoneRadius: behCfg.BOMBER.ZONE_RADIUS
                        });
                    }
                }
            }

            if (this.behavior === 'HEALER' && behCfg.HEALER?.ENABLED) {
                this._healerPulseTimer -= dt;
                if (this._healerPulseTimer <= 0) {
                    this._healerPulseTimer = behCfg.HEALER.PULSE_INTERVAL;
                    const healR = behCfg.HEALER.AURA_RADIUS;
                    const healRSq = healR * healR;
                    const healRate = behCfg.HEALER.HEAL_RATE;
                    const allEnemies = window.Game.enemies;
                    if (allEnemies) {
                        for (let hi = 0; hi < allEnemies.length; hi++) {
                            const he = allEnemies[hi];
                            if (!he || he === this || !he.active) continue;
                            const hdx = he.x - this.x;
                            const hdy = he.y - this.y;
                            if (hdx * hdx + hdy * hdy <= healRSq) {
                                he.hp = Math.min(he.maxHp, he.hp + he.maxHp * healRate);
                            }
                        }
                    }
                }
            }

            if (this.behavior === 'CHARGER' && behCfg.CHARGER?.ENABLED) {
                const chCfg = behCfg.CHARGER;
                if (this._behaviorPhase === 'IDLE') {
                    this._behaviorTimer -= dt;
                    if (this._behaviorTimer <= 0) {
                        this._behaviorPhase = 'WINDUP';
                        this._behaviorTimer = chCfg.WINDUP_TIME;
                        this._chargerOriginY = this.y;
                        this._chargerTargetY = this.y + chCfg.CHARGE_DISTANCE;
                    }
                } else if (this._behaviorPhase === 'WINDUP') {
                    this._behaviorTimer -= dt;
                    // Shake during windup
                    this._hitShakeX = (Math.random() - 0.5) * chCfg.WINDUP_SHAKE;
                    this._hitShakeY = (Math.random() - 0.5) * chCfg.WINDUP_SHAKE;
                    if (this._behaviorTimer <= 0) {
                        this._behaviorPhase = 'CHARGING';
                    }
                } else if (this._behaviorPhase === 'CHARGING') {
                    this.y += chCfg.CHARGE_SPEED * dt;
                    if (this.y >= this._chargerTargetY) {
                        this.y = this._chargerTargetY;
                        this._behaviorPhase = 'RETREATING';
                    }
                    return; // Skip normal movement during charge
                } else if (this._behaviorPhase === 'RETREATING') {
                    this.y -= chCfg.RETREAT_SPEED * dt;
                    if (this.y <= this._chargerOriginY) {
                        this.y = this._chargerOriginY;
                        this.baseY = this._chargerOriginY;
                        this._behaviorPhase = 'IDLE';
                        this._behaviorTimer = chCfg.CHARGE_INTERVAL;
                        this._hitShakeX = 0;
                        this._hitShakeY = 0;
                    }
                    return; // Skip normal movement during retreat
                }
            }
        }

        // Horizontal Grid Move
        this.x += gridSpeed * gridDir * dt;

        // Vertical / Pattern Move
        const wp = EB.WAVE_PATTERNS;
        if (wavePattern === 'V_SHAPE') {
            this.y = this.baseY + Math.sin(globalTime * wp.V_SHAPE.FREQUENCY) * wp.V_SHAPE.AMPLITUDE;
        } else if (wavePattern === 'SINE_WAVE') {
            // Complex snake motion
            this.y = this.baseY + Math.sin(globalTime * wp.SINE_WAVE.FREQUENCY + (this.x * wp.SINE_WAVE.PHASE_SCALE)) * wp.SINE_WAVE.AMPLITUDE;
        } else if (wavePattern === 'COLUMNS') {
            this.y = this.baseY; // Static columns
        } else {
            this.y = this.baseY;
        }

        // Rotation (optional, for fun)
        if (wavePattern === 'SINE_WAVE') {
            this.rotation = Math.cos(globalTime * wp.SINE_WAVE.FREQUENCY + (this.x * wp.SINE_WAVE.PHASE_SCALE)) * 0.2;
        }
    }

    // Trigger kamikaze dive towards player
    triggerKamikaze() {
        if (!this.isKamikaze || this.kamikazeDiving) return;
        this.kamikazeDiving = true;
        if (window.Game.Audio) window.Game.Audio.play('enemyTelegraph');
    }

    // Short-range teleport to dodge
    doTeleport() {
        const tp = window.Game.Balance.ENEMY_BEHAVIOR.TELEPORT;
        const offsetX = (Math.random() - 0.5) * tp.OFFSET_X;
        const offsetY = (Math.random() * tp.OFFSET_Y) - (tp.OFFSET_Y / 2);
        this.x += offsetX;
        this.y += offsetY;
        // v4.32: Clamp to safe bounds — responsive to actual screen size
        const gw = window.Game._gameWidth || 600;
        const gh = window.Game._gameHeight || 700;
        this.x = Math.max(tp.BOUNDS_X_MIN, Math.min(Math.min(tp.BOUNDS_X_MAX, gw - tp.BOUNDS_X_MIN), this.x));
        this.y = Math.max(tp.BOUNDS_Y_MIN, Math.min(Math.min(tp.BOUNDS_Y_MAX, gh * 0.65), this.y));
        this.teleportCooldown = tp.COOLDOWN_MIN + Math.random() * tp.COOLDOWN_RANDOM;
        this.teleportFlash = 1;
        if (window.Game.Audio) window.Game.Audio.play('grazeNearMiss');
    }

    // Take damage - returns true if enemy should die
    // v5.32: Returns 'reflect' string if Reflector absorbs the hit
    takeDamage(amount, elemType) {
        // v5.32: Reflector — absorb first hit, consume charge
        if (this.isElite && this.eliteType === 'REFLECTOR' && this.reflectCharges > 0) {
            this.reflectCharges--;
            this._reflectBroken = true;
            this.hitFlash = 1;
            if (window.Game.Audio) window.Game.Audio.play('grazeNearMiss');
            return 'reflect';
        }
        this.hp -= amount;
        this.hitFlash = 1;
        this._hitShakeTimer = window.Game.Balance?.VFX?.HIT_SHAKE_DURATION || 0.06;
        // v5.15: Elemental tint flash
        if (elemType) {
            const tintCfg = window.Game.Balance?.ELEMENTAL?.ENEMY_TINT;
            if (tintCfg?.ENABLED) {
                this._elemType = elemType;
                this._elemTint = tintCfg[elemType.toUpperCase()] || null;
                this._elemTintTimer = tintCfg.FLASH_DURATION || 0.15;
            }
        }
        return this.hp <= 0;
    }

    // v5.15: Persistent contagion tint for enemies surviving splash/chain
    applyContagionTint(elemType) {
        const tintCfg = window.Game.Balance?.ELEMENTAL?.ENEMY_TINT;
        if (!tintCfg?.ENABLED) return;
        this._elemType = elemType;
        this._elemTint = tintCfg[elemType.toUpperCase()] || null;
        this._elemPersistent = true;
    }

    draw(ctx) {
        // v4.5: Apply hit shake offset
        const x = this.x + Math.round(this._hitShakeX);
        const y = this.y + Math.round(this._hitShakeY);

        // v4.58: Compute damage intensity (0 = intact, 1 = near death)
        const dmgCfg = window.Game.Balance?.VFX?.DAMAGE_VISUAL;
        const hpRatio = this.maxHp > 0 ? this.hp / this.maxHp : 1;
        if (dmgCfg?.ENABLED && hpRatio <= (dmgCfg.THRESHOLD || 0.5) && hpRatio > 0) {
            this._damageIntensity = 1 - (hpRatio / dmgCfg.THRESHOLD);

            // Body darkening
            if (dmgCfg.BODY_DARKEN > 0) {
                const CU = window.Game.ColorUtils;
                this._bodyFill = CU.darken(this.color, 0.4 + dmgCfg.BODY_DARKEN * this._damageIntensity);
            }

            // Outline flicker
            if (dmgCfg.FLICKER?.ENABLED) {
                const fl = dmgCfg.FLICKER;
                const now = Date.now() * 0.001;
                let flicker = Math.sin(now * fl.SPEED * Math.PI * 2) * 0.5 + 0.5; // 0-1
                if (Math.random() < fl.GLITCH_CHANCE * this._damageIntensity) {
                    flicker *= fl.GLITCH_MULT;
                }
                const range = fl.MAX_WIDTH - fl.MIN_WIDTH;
                this._outlineWidth = fl.MIN_WIDTH + range * (0.5 + (flicker - 0.5) * this._damageIntensity);
            }

            // Generate cracks once
            if (!this._wasDamaged && dmgCfg.CRACKS?.ENABLED) {
                this._wasDamaged = true;
                this._generateCracks(dmgCfg.CRACKS);
            }

            // Update crack count based on intensity
            if (dmgCfg.CRACKS?.ENABLED) {
                const cc = dmgCfg.CRACKS;
                this._crackCount = Math.round(cc.COUNT_AT_THRESHOLD + (cc.COUNT_AT_DEATH - cc.COUNT_AT_THRESHOLD) * this._damageIntensity);
            }
        } else {
            this._damageIntensity = 0;
            this._outlineWidth = 2.5;
            this._bodyFill = this._colorDark40;
        }

        ctx.save();
        if (this.rotation) ctx.translate(x, y), ctx.rotate(this.rotation), ctx.translate(-x, -y);

        ctx.strokeStyle = this._colorBright;
        ctx.lineWidth = this._outlineWidth;

        // v7.9 Agents of the System — regional humanoid instead of shape + glyph
        if (this.isMinion) {
            this.drawMinion(ctx, x, y);
        } else {
            this.drawAgent(ctx, x, y);
        }

        // v4.58: Draw fracture lines on damaged enemies
        if (this._damageIntensity > 0 && this._crackData && dmgCfg?.CRACKS?.ENABLED) {
            this._drawCracks(ctx, x, y, dmgCfg.CRACKS);
        }

        // v5.15: Elemental tint overlay
        if (this._elemTint) {
            const tintCfg = window.Game.Balance?.ELEMENTAL?.ENEMY_TINT;
            const alpha = this._elemTintTimer > 0
                ? (tintCfg?.FLASH_ALPHA || 0.6)
                : (tintCfg?.PERSISTENT_ALPHA || 0.25);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = this._elemTint;
            ctx.beginPath();
            ctx.arc(x, y, 25, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        // v5.32: Elite variant visual overlays
        if (this.isElite) {
            const eliteCfg = window.Game.Balance?.ELITE_VARIANTS;
            if (this.eliteType === 'ARMORED' && eliteCfg?.ARMORED?.ENABLED) {
                // Metallic sheen sweep
                const sheenT = (Date.now() * 0.001) % 2;
                const sheenX = x - 25 + sheenT * 25;
                ctx.globalAlpha = eliteCfg.ARMORED.SHEEN_ALPHA;
                ctx.fillStyle = eliteCfg.ARMORED.SHEEN_COLOR;
                ctx.beginPath();
                ctx.moveTo(sheenX, y - 20);
                ctx.lineTo(sheenX + 8, y - 20);
                ctx.lineTo(sheenX + 4, y + 20);
                ctx.lineTo(sheenX - 4, y + 20);
                ctx.closePath();
                ctx.fill();
                // Shield icon
                ctx.globalAlpha = 0.6;
                ctx.strokeStyle = eliteCfg.ARMORED.SHEEN_COLOR;
                ctx.lineWidth = 1.5;
                const icoS = eliteCfg.ARMORED.ICON_SIZE;
                ctx.beginPath();
                ctx.moveTo(x, y - 28 - icoS);
                ctx.lineTo(x - icoS, y - 28);
                ctx.lineTo(x - icoS * 0.6, y - 28 + icoS);
                ctx.lineTo(x, y - 28 + icoS * 1.3);
                ctx.lineTo(x + icoS * 0.6, y - 28 + icoS);
                ctx.lineTo(x + icoS, y - 28);
                ctx.closePath();
                ctx.stroke();
                ctx.globalAlpha = 1;
            } else if (this.eliteType === 'EVADER' && eliteCfg?.EVADER?.ENABLED) {
                // Speed lines when dashing
                if (this._evaderDashing) {
                    const dir = this._evaderDashVx > 0 ? -1 : 1;
                    ctx.globalAlpha = eliteCfg.EVADER.LINE_ALPHA;
                    ctx.strokeStyle = '#00f0ff';
                    ctx.lineWidth = 1.5;
                    for (let li = 0; li < eliteCfg.EVADER.LINE_COUNT; li++) {
                        const ly = y - 10 + li * 10;
                        ctx.beginPath();
                        ctx.moveTo(x + dir * 20, ly);
                        ctx.lineTo(x + dir * 35, ly);
                        ctx.stroke();
                    }
                    ctx.globalAlpha = 1;
                }
            } else if (this.eliteType === 'REFLECTOR' && eliteCfg?.REFLECTOR?.ENABLED) {
                // Prismatic shimmer (active) or broken crack (depleted)
                if (this.reflectCharges > 0) {
                    const hue = (Date.now() * eliteCfg.REFLECTOR.SHIMMER_SPEED) % 360;
                    ctx.globalAlpha = eliteCfg.REFLECTOR.SHIMMER_ALPHA;
                    ctx.strokeStyle = `hsl(${hue}, 100%, 70%)`;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(x, y, 27, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.globalAlpha = 1;
                } else if (this._reflectBroken) {
                    ctx.globalAlpha = eliteCfg.REFLECTOR.BROKEN_ALPHA;
                    ctx.strokeStyle = '#888';
                    ctx.lineWidth = 1;
                    ctx.setLineDash([3, 3]);
                    ctx.beginPath();
                    ctx.arc(x, y, 27, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.setLineDash([]);
                    ctx.globalAlpha = 1;
                }
            }
        }

        // v5.32: Behavior visual indicators
        if (this.behavior) {
            const bCfg = window.Game.Balance?.ENEMY_BEHAVIORS;
            if (this.behavior === 'HEALER' && bCfg?.HEALER?.ENABLED) {
                // Green aura pulse
                const pulse = Math.sin(Date.now() * 0.004) * 0.5 + 0.5;
                ctx.globalAlpha = bCfg.HEALER.AURA_ALPHA * (0.5 + pulse * 0.5);
                ctx.strokeStyle = bCfg.HEALER.AURA_COLOR;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(x, y, bCfg.HEALER.AURA_RADIUS * (0.8 + pulse * 0.2), 0, Math.PI * 2);
                ctx.stroke();
                // Green cross icon
                ctx.globalAlpha = 0.7;
                ctx.strokeStyle = bCfg.HEALER.AURA_COLOR;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(x, y - 30);
                ctx.lineTo(x, y - 36);
                ctx.moveTo(x - 3, y - 33);
                ctx.lineTo(x + 3, y - 33);
                ctx.stroke();
                ctx.globalAlpha = 1;
            } else if (this.behavior === 'CHARGER' && bCfg?.CHARGER?.ENABLED) {
                if (this._behaviorPhase === 'WINDUP') {
                    ctx.globalAlpha = 0.5;
                    ctx.fillStyle = bCfg.CHARGER.FLASH_COLOR;
                    ctx.beginPath();
                    ctx.arc(x, y, 28, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.globalAlpha = 1;
                } else if (this._behaviorPhase === 'CHARGING') {
                    // Red trail
                    ctx.globalAlpha = 0.4;
                    for (let ti = 1; ti <= 3; ti++) {
                        ctx.fillStyle = bCfg.CHARGER.FLASH_COLOR;
                        ctx.beginPath();
                        ctx.arc(x, y - ti * 12, 18 - ti * 3, 0, Math.PI * 2);
                        ctx.fill();
                    }
                    ctx.globalAlpha = 1;
                }
            } else if (this.behavior === 'BOMBER' && bCfg?.BOMBER?.ENABLED) {
                // Small bomb icon
                ctx.globalAlpha = 0.6;
                ctx.fillStyle = bCfg.BOMBER.ZONE_COLOR;
                ctx.beginPath();
                ctx.arc(x, y - 30, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#ff8800';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x, y - 34);
                ctx.lineTo(x + 2, y - 38);
                ctx.stroke();
                ctx.globalAlpha = 1;
            } else if (this.behavior === 'FLANKER' && this._behaviorPhase === 'RUN') {
                // Direction chevron
                const dir = this._flankerDir;
                ctx.globalAlpha = 0.5;
                ctx.strokeStyle = '#ffaa00';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(x + dir * 25, y - 5);
                ctx.lineTo(x + dir * 30, y);
                ctx.lineTo(x + dir * 25, y + 5);
                ctx.stroke();
                ctx.globalAlpha = 1;
            }
        }

        ctx.restore();

        // Kamikaze dive indicator (red trailing flames)
        if (this.kamikazeDiving) {
            ctx.globalAlpha = 0.7;
            for (let i = 1; i <= 3; i++) {
                const trailX = x - Math.sin(this.rotation + Math.PI / 2) * i * 11;
                const trailY = y - Math.cos(this.rotation + Math.PI / 2) * i * 11;
                ctx.fillStyle = i === 1 ? '#ff6600' : (i === 2 ? '#ff3300' : '#cc0000');
                ctx.beginPath();
                ctx.arc(trailX, trailY, 11 - i * 2, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        }
    }

    // v4.56: Additive neon halo (called from batched glow pass in main.js)
    drawGlow(ctx) {
        const cfg = window.Game.Balance?.GLOW?.ENEMY;
        if (!cfg?.ENABLED) return;
        const x = this.x, y = this.y;
        const r = 25; // approximate enemy body radius

        // v4.58: Destabilize glow when damaged
        let pulseSpeed = cfg.PULSE_SPEED;
        let baseAlpha = cfg.ALPHA;
        let glowColor = this.color;
        if (this._damageIntensity > 0) {
            const dg = window.Game.Balance?.VFX?.DAMAGE_VISUAL?.GLOW;
            if (dg) {
                pulseSpeed *= 1 + (dg.PULSE_SPEED_MULT - 1) * this._damageIntensity;
                baseAlpha *= 1 - (1 - dg.ALPHA_MULT) * this._damageIntensity;
                // Shift toward white (desaturate)
                const CU = window.Game.ColorUtils;
                glowColor = CU.lighten(this.color, dg.DESATURATE * this._damageIntensity);
            }
        }

        const pulse = Math.sin(Date.now() * pulseSpeed * 0.001) * cfg.PULSE_AMOUNT;
        const alpha = baseAlpha + pulse;
        const CU = window.Game.ColorUtils;
        const grad = ctx.createRadialGradient(x, y, r * 0.4, x, y, r + cfg.RADIUS);
        grad.addColorStop(0, CU.withAlpha(glowColor, alpha));
        grad.addColorStop(1, CU.withAlpha(glowColor, 0));
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, r + cfg.RADIUS, 0, Math.PI * 2);
        ctx.fill();
    }

    // ================================================================
    // v7.9 AGENTS OF THE SYSTEM — procedural humanoid enemies
    // ================================================================
    // Each enemy is a person in service of the FIAT regime. Regional
    // family (USA/EU/ASIA) determines archetype; tier modulates scale
    // and accessories. Currency symbol = chest mark (brand, not label).
    // All sub-draws use coordinates local to the enemy center.
    //
    //   drawAgent        — dispatch by Game.CURRENCY_REGION[symbol]
    //   _drawOligarch    — USA: top hat + dark suit + tie (+ cigar STRONG)
    //   _drawBureaucrat  — EU:  bowler + briefcase + monocle
    //   _drawRonin       — ASIA: kabuto + menpo + mechanical armor
    //   _drawChestMark   — currency symbol as emblem (tie/monocle/mon)
    //
    // Bounding: approx ±24 per axis at base scale. Hitbox unchanged.
    // ================================================================

    drawAgent(ctx, x, y) {
        const agentCfg = window.Game.Balance?.ENEMY_AGENT;
        // Kill-switch — if disabled, fall back to minion silhouette so the game still renders
        if (agentCfg && agentCfg.ENABLED === false) {
            this.drawMinion(ctx, x, y);
            return;
        }
        const region = (window.Game.CURRENCY_REGION || {})[this.symbol] || 'USA';
        const tier = this._tier || 'MEDIUM';
        const tierScales = agentCfg?.TIER_SCALE;
        const scale = tierScales?.[tier] ?? (tier === 'WEAK' ? 0.90 : (tier === 'STRONG' ? 1.12 : 1.0));

        const now = performance.now();
        // Thruster flicker 80ms (replaces walk cycle — pilots no longer walk, vehicles fly)
        const thrusterPhase = (Math.floor((now + this._walkOffset) / 80)) & 1;
        // Pilot hover bob (subtle breathing motion inside cockpit)
        const bobY = Math.sin((now + this._walkOffset) * 0.004) * 0.8;

        ctx.save();
        ctx.translate(x, y);
        if (scale !== 1) ctx.scale(scale, scale);
        // FLIP Y — enemies descend head-first from space, thrusters on top push them toward player.
        // v7.9.5: when _uprightFlip is true (hover-gate DWELL), skip the flip → agent stands upright
        // with thrusters BELOW, suspending them against gravity.
        if (!this._uprightFlip) ctx.scale(1, -1);

        // Vehicle draws first (behind pilot bust)
        if (region === 'EU') {
            this._drawVehicleEU(ctx, tier, thrusterPhase);
        } else if (region === 'ASIA') {
            this._drawVehicleASIA(ctx, tier, thrusterPhase);
        } else {
            this._drawVehicleUSA(ctx, tier, thrusterPhase);
        }

        // Pilot bust (with subtle hover bob)
        ctx.save();
        ctx.translate(0, bobY);
        if (region === 'EU') {
            this._drawBureaucrat(ctx, tier);
        } else if (region === 'ASIA') {
            this._drawRonin(ctx, tier);
        } else {
            this._drawOligarch(ctx, tier);
        }
        this._drawChestMark(ctx, region, tier);
        ctx.restore();

        ctx.restore();
    }

    // ---------- USA: Oligarch (pilot bust) ----------
    // Base tycoon silhouette — hat + accessory dispatched via CURRENCY_VARIANT (v7.9.4).
    _drawOligarch(ctx, tier) {
        const variant = this._variant();
        const pal = this._paletteFor(variant.palette, 'USA');
        const shirt     = '#d9d0b8';
        const tieCol    = pal.tie       || '#8f1e1e';
        const tieDark   = pal.tieDark   || '#5a1010';
        const skin      = '#b8876a';
        const skinShade = '#8a5a3f';
        const outline   = '#050505';

        // Torso (jacket — bust cropped at cockpit line y=+6)
        ctx.fillStyle = pal.suit;
        ctx.strokeStyle = outline;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-12, 0); ctx.lineTo(12, 0);
        ctx.lineTo(10, 7); ctx.lineTo(-10, 7);
        ctx.closePath(); ctx.fill(); ctx.stroke();

        // Lapels
        ctx.fillStyle = pal.suitDark;
        ctx.beginPath();
        ctx.moveTo(-12, 0); ctx.lineTo(-3, 0); ctx.lineTo(-5, 6); ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(12, 0); ctx.lineTo(3, 0); ctx.lineTo(5, 6); ctx.closePath();
        ctx.fill();

        // Shirt V
        ctx.fillStyle = shirt;
        ctx.beginPath();
        ctx.moveTo(-3, 0); ctx.lineTo(3, 0); ctx.lineTo(0, 6);
        ctx.closePath(); ctx.fill();

        // Tie
        ctx.fillStyle = tieCol;
        ctx.strokeStyle = tieDark;
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(-2, 0); ctx.lineTo(2, 0);
        ctx.lineTo(2.4, 6); ctx.lineTo(-2.4, 6);
        ctx.closePath(); ctx.fill(); ctx.stroke();

        // Neck
        ctx.fillStyle = skinShade;
        ctx.fillRect(-3, -3, 6, 4);

        // Head
        ctx.fillStyle = skin;
        ctx.strokeStyle = outline;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(0, -9, 7.5, 8, 0, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();

        // Jaw shadow
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = skinShade;
        ctx.beginPath();
        ctx.ellipse(0, -5, 6, 2.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Eyes — cold dots
        ctx.fillStyle = outline;
        ctx.beginPath();
        ctx.arc(-2.8, -9, 1.1, 0, Math.PI * 2);
        ctx.arc( 2.8, -9, 1.1, 0, Math.PI * 2);
        ctx.fill();

        // Mouth — flat line
        ctx.strokeStyle = outline;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-2.2, -5); ctx.lineTo(2.2, -5);
        ctx.stroke();

        // Accessory (cigar / kerchief / cane / monocle) — STRONG always, MEDIUM gets non-cigar, WEAK bare
        if (tier === 'STRONG' || (tier === 'MEDIUM' && variant.acc !== 'cigar')) {
            this._drawAccessory(ctx, variant.acc, pal);
        }

        // Hat dispatch
        this._drawHat(ctx, variant.hat, pal);
    }

    // ---------- EU: Bureaucrat (pilot bust) ----------
    // Base office-worker silhouette — hat + accessory dispatched via CURRENCY_VARIANT (v7.9.4).
    _drawBureaucrat(ctx, tier) {
        const variant = this._variant();
        const pal = this._paletteFor(variant.palette, 'EU');
        const shirt     = '#d9d0b8';
        const tieCol    = pal.tie     || '#1f3a5f';
        const skin      = '#c0a080';
        const skinShade = '#8a6848';
        const outline   = '#050505';
        const pinCol    = '#c9a227';

        // Narrower torso (bust cropped at cockpit y=+6)
        ctx.fillStyle = pal.suit;
        ctx.strokeStyle = outline;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-9, -1); ctx.lineTo(9, -1);
        ctx.lineTo(7, 6); ctx.lineTo(-7, 6);
        ctx.closePath(); ctx.fill(); ctx.stroke();

        // Shirt strip
        ctx.fillStyle = shirt;
        ctx.fillRect(-3, -1, 6, 6);

        // Thin tie
        ctx.fillStyle = tieCol;
        ctx.strokeStyle = pal.suitDark;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(-1.5, -1); ctx.lineTo(1.5, -1);
        ctx.lineTo(1.7, 6); ctx.lineTo(-1.7, 6);
        ctx.closePath(); ctx.fill(); ctx.stroke();

        // Lapel pin
        ctx.fillStyle = pinCol;
        ctx.beginPath();
        ctx.arc(-4.5, 2, 1.2, 0, Math.PI * 2);
        ctx.fill();

        // Neck
        ctx.fillStyle = skinShade;
        ctx.fillRect(-2.5, -3, 5, 3);

        // Head
        ctx.fillStyle = skin;
        ctx.strokeStyle = outline;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(0, -9, 7, 7.5, 0, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();

        // Eyes (right one smaller — monocle space for £/€)
        ctx.fillStyle = outline;
        ctx.beginPath();
        ctx.arc(-2.6, -9, 1.0, 0, Math.PI * 2);
        ctx.arc( 2.6, -9, 0.8, 0, Math.PI * 2);
        ctx.fill();

        // Moustache
        ctx.fillRect(-2.5, -6, 5, 1);

        // Mouth — pressed line
        ctx.strokeStyle = outline;
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(-1.8, -4); ctx.lineTo(1.8, -4);
        ctx.stroke();

        // Accessory — STRONG always, MEDIUM always (EU is more "proper" — always carries something)
        if (tier !== 'WEAK') {
            this._drawAccessory(ctx, variant.acc, pal);
        }

        // Hat dispatch
        this._drawHat(ctx, variant.hat, pal);
    }

    // ---------- ASIA: Ronin (pilot bust, mechanical samurai) ----------
    // Base kabuto + armor — helmet + accessory dispatched via CURRENCY_VARIANT (v7.9.4).
    _drawRonin(ctx, tier) {
        const variant = this._variant();
        const pal = this._paletteFor(variant.palette, 'ASIA');
        const armor     = pal.suit;
        const armorDark = pal.suitDark;
        const armorEdge = pal.trim || '#c9a227';
        const jointCol  = '#a52234';
        const jointDark = '#5a1218';
        const skin      = '#b8906e';
        const outline   = '#050505';

        // Armor plate torso (cropped at y=+7)
        ctx.fillStyle = armor;
        ctx.strokeStyle = outline;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-12, -1); ctx.lineTo(12, -1);
        ctx.lineTo(13, 3); ctx.lineTo(11, 7);
        ctx.lineTo(-11, 7); ctx.lineTo(-13, 3);
        ctx.closePath(); ctx.fill(); ctx.stroke();

        // Gold trim top edge
        ctx.strokeStyle = armorEdge;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-12, -1); ctx.lineTo(12, -1);
        ctx.stroke();

        // Central seam
        ctx.strokeStyle = armorDark;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(0, 7);
        ctx.stroke();

        // Shoulder pauldrons
        ctx.fillStyle = armorDark;
        ctx.strokeStyle = outline;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-15, -1); ctx.lineTo(-10, -3);
        ctx.lineTo(-9, 3); ctx.lineTo(-14, 4);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(15, -1); ctx.lineTo(10, -3);
        ctx.lineTo(9, 3); ctx.lineTo(14, 4);
        ctx.closePath(); ctx.fill(); ctx.stroke();

        // Red lacquer joint dots
        ctx.fillStyle = jointCol;
        ctx.strokeStyle = jointDark;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.arc(-14, 1, 1.6, 0, Math.PI * 2);
        ctx.arc( 14, 1, 1.6, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();

        // Neck
        ctx.fillStyle = skin;
        ctx.fillRect(-2.5, -3, 5, 3);

        // Head
        ctx.fillStyle = skin;
        ctx.strokeStyle = outline;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(0, -9, 6.5, 7, 0, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();

        // Menpo (face guard)
        ctx.fillStyle = armorDark;
        ctx.strokeStyle = outline;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(-6, -7); ctx.lineTo(6, -7);
        ctx.lineTo(5, -2); ctx.lineTo(-5, -2);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = armorEdge;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(-5, -4.5); ctx.lineTo(5, -4.5);
        ctx.stroke();

        // Red glowing eye slits (only visible bit of face)
        ctx.fillStyle = jointCol;
        ctx.fillRect(-4, -10, 2.5, 1.2);
        ctx.fillRect(1.5, -10, 2.5, 1.2);

        // Accessory — STRONG always, MEDIUM sometimes (saber/tanto/fan/scroll visible in hand-space)
        if (tier !== 'WEAK') {
            this._drawAccessory(ctx, variant.acc, pal);
        }

        // Hat (kabuto) dispatch
        this._drawHat(ctx, variant.hat, pal, tier);
    }

    // ================================================================
    // v7.9.4 — PRIMITIVE VOCABULARY
    // Hat / accessory / palette primitives consumed by pilot archetypes.
    // All coords relative to head at (0,-9), torso at (0,0..+6). Flip Y applied globally.
    // ================================================================

    _variant() {
        return (window.Game.CURRENCY_VARIANT || {})[this.symbol] || { hat: 'tophat', acc: 'cigar', palette: 'forest' };
    }

    // Palette lookup: returns { suit, suitDark, tie?, tieDark?, trim? } for a named palette.
    // Region param used as fallback if palette name unknown.
    _paletteFor(name, region) {
        const palettes = {
            // USA
            forest:     { suit: '#1a3d2a', suitDark: '#0a1a10', tie: '#8f1e1e', tieDark: '#5a1010' },
            burgundy:   { suit: '#5a1a22', suitDark: '#2d0a11', tie: '#2a2f3a', tieDark: '#11141a' },
            tan:        { suit: '#7a5a3a', suitDark: '#3a2a18', tie: '#1f2a3a', tieDark: '#0e1420' },
            steelblue:  { suit: '#2a3a5a', suitDark: '#121a2e', tie: '#5a2a2a', tieDark: '#2a1010' },
            // EU
            charcoal:   { suit: '#3e4350', suitDark: '#252932', tie: '#1f3a5f' },
            navy:       { suit: '#1e2a52', suitDark: '#0a1024', tie: '#8f1e1e' },
            wine:       { suit: '#4a1a2e', suitDark: '#220a18', tie: '#c9a227' },
            olive:      { suit: '#4a4a22', suitDark: '#22220a', tie: '#c9a227' },
            // ASIA
            nightBlack: { suit: '#1a1a24', suitDark: '#0a0a10', trim: '#c9a227' },
            deepRed:    { suit: '#3a1218', suitDark: '#180609', trim: '#c9a227' },
            saffron:    { suit: '#a55a1a', suitDark: '#4a2508', trim: '#f2e7b8' },
            imperial:   { suit: '#2a1a4a', suitDark: '#120a22', trim: '#c9a227' }
        };
        const fallback = region === 'USA'  ? palettes.forest
                       : region === 'EU'   ? palettes.charcoal
                       : region === 'ASIA' ? palettes.nightBlack
                       : palettes.forest;
        return palettes[name] || fallback;
    }

    // ------- HAT PRIMITIVES -------
    // All hats sit on top of the head (centered at 0, -9). Coloring uses pal + this.color accent band.
    _drawHat(ctx, name, pal, tier) {
        const outline = '#050505';
        const band = this.color;
        const black = '#0a0a0a';
        switch (name) {
            case 'tophat': {
                // Tall cylinder with colored band (USA $)
                ctx.fillStyle = black; ctx.strokeStyle = outline; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.ellipse(0, -16, 11.5, 2.2, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                ctx.fillRect(-6.5, -24, 13, 9); ctx.strokeRect(-6.5, -24, 13, 9);
                ctx.fillStyle = band; ctx.fillRect(-6.5, -18, 13, 1.8);
                ctx.strokeStyle = outline; ctx.lineWidth = 0.4; ctx.strokeRect(-6.5, -18, 13, 1.8);
                break;
            }
            case 'stetson': {
                // Cowboy hat — curled brim + high crown (C$)
                ctx.fillStyle = '#4a2a12'; ctx.strokeStyle = outline; ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(-13, -15); ctx.quadraticCurveTo(-11, -17, -7, -17);
                ctx.lineTo(7, -17); ctx.quadraticCurveTo(11, -17, 13, -15);
                ctx.quadraticCurveTo(10, -14, 0, -14); ctx.quadraticCurveTo(-10, -14, -13, -15);
                ctx.closePath(); ctx.fill(); ctx.stroke();
                // Crown
                ctx.beginPath();
                ctx.moveTo(-6, -17); ctx.lineTo(-5, -23); ctx.quadraticCurveTo(0, -25, 5, -23);
                ctx.lineTo(6, -17); ctx.closePath(); ctx.fill(); ctx.stroke();
                // Band
                ctx.fillStyle = band; ctx.fillRect(-5.5, -18, 11, 1.4);
                break;
            }
            case 'cowboy': {
                // Wider flat brim Ⓒ (cad stand-in) — lighter tone
                ctx.fillStyle = '#6a4a22'; ctx.strokeStyle = outline; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.ellipse(0, -15.5, 13.5, 1.8, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(-5, -17); ctx.lineTo(-4, -22); ctx.quadraticCurveTo(0, -24, 4, -22);
                ctx.lineTo(5, -17); ctx.closePath(); ctx.fill(); ctx.stroke();
                ctx.fillStyle = band; ctx.fillRect(-4.5, -18, 9, 1.2);
                break;
            }
            case 'ushanka': {
                // Russian fur hat ₽ — flaps + star on front
                ctx.fillStyle = '#3a2820'; ctx.strokeStyle = outline; ctx.lineWidth = 1;
                // Main dome
                ctx.beginPath(); ctx.ellipse(0, -16, 9, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                // Side flaps
                ctx.beginPath();
                ctx.moveTo(-9, -15); ctx.lineTo(-11, -12); ctx.lineTo(-8, -11);
                ctx.moveTo( 9, -15); ctx.lineTo( 11, -12); ctx.lineTo( 8, -11);
                ctx.fill(); ctx.stroke();
                // Fur texture (lighter tufts)
                ctx.fillStyle = '#6a5040';
                for (let i = -7; i <= 7; i += 3) {
                    ctx.beginPath(); ctx.arc(i, -20, 1.4, 0, Math.PI * 2); ctx.fill();
                }
                // Red star emblem
                ctx.fillStyle = band;
                ctx.beginPath();
                ctx.arc(0, -16, 1.8, 0, Math.PI * 2);
                ctx.fill();
                break;
            }
            case 'bowler': {
                // EU bowler hat (€ default)
                ctx.fillStyle = black; ctx.strokeStyle = outline; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.ellipse(0, -15.5, 9.5, 1.8, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                ctx.beginPath(); ctx.arc(0, -16, 6.8, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
                ctx.fillStyle = band; ctx.fillRect(-6.5, -16.5, 13, 1.4);
                break;
            }
            case 'topBrit': {
                // British top hat £ — shorter + more rounded than tophat
                ctx.fillStyle = black; ctx.strokeStyle = outline; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.ellipse(0, -15.5, 10.5, 2, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                ctx.fillRect(-5.5, -22, 11, 7); ctx.strokeRect(-5.5, -22, 11, 7);
                ctx.fillStyle = band; ctx.fillRect(-5.5, -17.5, 11, 1.6);
                break;
            }
            case 'beret': {
                // French beret ₣ — round slanted disk with stem
                ctx.fillStyle = pal.suit === '#4a1a2e' ? '#7a2a3e' : '#3a1a22';
                ctx.strokeStyle = outline; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.ellipse(0, -15.5, 9, 2.5, -0.15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                // Slanted top bulk
                ctx.beginPath();
                ctx.moveTo(-8, -15.5); ctx.quadraticCurveTo(-5, -19, 4, -20);
                ctx.quadraticCurveTo(8, -19, 8, -15.5);
                ctx.closePath(); ctx.fill(); ctx.stroke();
                // Stem nub
                ctx.fillStyle = band;
                ctx.beginPath(); ctx.arc(4.5, -20, 0.9, 0, Math.PI * 2); ctx.fill();
                break;
            }
            case 'fez': {
                // Turkish fez ₺ — red truncated cone with tassel
                ctx.fillStyle = '#a52234'; ctx.strokeStyle = outline; ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(-6, -15); ctx.lineTo(-5, -23); ctx.lineTo(5, -23); ctx.lineTo(6, -15);
                ctx.closePath(); ctx.fill(); ctx.stroke();
                // Top disc
                ctx.beginPath(); ctx.ellipse(0, -23, 5, 1.2, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                // Tassel
                ctx.strokeStyle = band; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
                ctx.beginPath(); ctx.moveTo(3, -23); ctx.lineTo(6, -19); ctx.stroke();
                ctx.lineCap = 'butt';
                break;
            }
            case 'kabutoStd': {
                // Standard kabuto ¥ — helmet + horns (was original ASIA default)
                this._kabutoBase(ctx, pal, band, outline, false);
                if (tier === 'STRONG') this._kabutoCrest(ctx, pal, outline);
                break;
            }
            case 'kabutoWide': {
                // Wider kabuto ₩ — flatter brim, stout horns
                this._kabutoBase(ctx, pal, band, outline, true);
                if (tier === 'STRONG') this._kabutoCrest(ctx, pal, outline);
                break;
            }
            case 'kabutoDragon': {
                // Dragon crest kabuto 元 — always gets crest (chinese imperial vibe)
                this._kabutoBase(ctx, pal, band, outline, false);
                // Dragon scales (3 bumps on crown)
                ctx.fillStyle = pal.trim || '#c9a227'; ctx.strokeStyle = outline; ctx.lineWidth = 0.4;
                for (const dx of [-3, 0, 3]) {
                    ctx.beginPath(); ctx.arc(dx, -22, 1, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                }
                break;
            }
            case 'turban': {
                // Indian turban ₹ — wrapped layers + central gem
                ctx.fillStyle = pal.suit || '#a55a1a'; ctx.strokeStyle = outline; ctx.lineWidth = 1;
                // Base wrap
                ctx.beginPath(); ctx.ellipse(0, -15, 9, 3, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                // Mid wrap
                ctx.beginPath(); ctx.ellipse(0, -18, 8.5, 3, 0.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                // Top wrap
                ctx.beginPath(); ctx.ellipse(0, -21, 7, 2.5, -0.15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                // Central gem (red)
                ctx.fillStyle = '#a52234'; ctx.strokeStyle = pal.trim || '#f2e7b8'; ctx.lineWidth = 0.6;
                ctx.beginPath(); ctx.arc(0, -18, 1.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                // Accent feather
                ctx.strokeStyle = band; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
                ctx.beginPath(); ctx.moveTo(0, -21); ctx.quadraticCurveTo(4, -26, 6, -28); ctx.stroke();
                ctx.lineCap = 'butt';
                break;
            }
            default: {
                // Fallback tophat
                this._drawHat(ctx, 'tophat', pal, tier);
            }
        }
    }

    _kabutoBase(ctx, pal, band, outline, wide) {
        const w = wide ? 11 : 9;
        const brimW = wide ? 20 : 18;
        const brimX = wide ? -10 : -9;
        // Helmet body
        ctx.fillStyle = pal.suit; ctx.strokeStyle = outline; ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-w, -12); ctx.lineTo(-w + 1, -18);
        ctx.lineTo(0, -21); ctx.lineTo(w - 1, -18); ctx.lineTo(w, -12);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        // Gold brim
        ctx.fillStyle = pal.trim || '#c9a227';
        ctx.fillRect(brimX, -13, brimW, 1.5);
        ctx.strokeStyle = outline; ctx.lineWidth = 0.4;
        ctx.strokeRect(brimX, -13, brimW, 1.5);
        // Horns (kuwagata, accent-tinted)
        ctx.strokeStyle = band; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-6, -18); ctx.quadraticCurveTo(-12, -22, -9, -27);
        ctx.moveTo( 6, -18); ctx.quadraticCurveTo( 12, -22,  9, -27);
        ctx.stroke();
        ctx.strokeStyle = outline; ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(-6, -18); ctx.quadraticCurveTo(-12, -22, -9, -27);
        ctx.moveTo( 6, -18); ctx.quadraticCurveTo( 12, -22,  9, -27);
        ctx.stroke();
        ctx.lineCap = 'butt';
    }

    _kabutoCrest(ctx, pal, outline) {
        // Gold kuwagata vertical crest (STRONG tier)
        ctx.fillStyle = pal.trim || '#c9a227'; ctx.strokeStyle = outline; ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(0, -21); ctx.lineTo(-2, -26);
        ctx.lineTo(0, -29); ctx.lineTo(2, -26);
        ctx.closePath(); ctx.fill(); ctx.stroke();
    }

    // ------- ACCESSORY PRIMITIVES -------
    // Coords relative to head+torso. Accessories occupy mouth area, shoulder, or side pocket.
    _drawAccessory(ctx, name, pal) {
        const outline = '#050505';
        switch (name) {
            case 'cigar': {
                // Brown tube + orange ember + smoke puff
                ctx.fillStyle = '#3d2815'; ctx.fillRect(2.2, -5.8, 7, 1.8);
                ctx.strokeStyle = '#1a0f05'; ctx.lineWidth = 0.5; ctx.strokeRect(2.2, -5.8, 7, 1.8);
                ctx.fillStyle = '#ff7a2e';
                ctx.beginPath(); ctx.arc(9.5, -4.9, 1.2, 0, Math.PI * 2); ctx.fill();
                ctx.globalAlpha = 0.22; ctx.fillStyle = '#cccccc';
                ctx.beginPath(); ctx.arc(11, -7.5, 2, 0, Math.PI * 2); ctx.fill();
                ctx.globalAlpha = 1;
                break;
            }
            case 'kerchief': {
                // Red bandana around neck (Canadian cowboy)
                ctx.fillStyle = '#a52234'; ctx.strokeStyle = '#5a1218'; ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.moveTo(-5, -2); ctx.lineTo(5, -2);
                ctx.lineTo(6, 1); ctx.lineTo(0, 3); ctx.lineTo(-6, 1);
                ctx.closePath(); ctx.fill(); ctx.stroke();
                // Knot dot
                ctx.fillStyle = '#7a1520';
                ctx.beginPath(); ctx.arc(0, 0, 0.9, 0, Math.PI * 2); ctx.fill();
                break;
            }
            case 'cane': {
                // Diagonal dark cane with gold knob (in corner of frame)
                ctx.strokeStyle = '#3a2a18'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(10, -2); ctx.lineTo(14, 6);
                ctx.stroke();
                // Gold knob
                ctx.fillStyle = '#c9a227';
                ctx.beginPath(); ctx.arc(10, -2, 1.5, 0, Math.PI * 2); ctx.fill();
                ctx.lineCap = 'butt';
                break;
            }
            case 'monocle': {
                // Gold ring over right eye + short chain (also used by Oligarch ₽)
                ctx.strokeStyle = '#c9a227'; ctx.lineWidth = 0.9;
                ctx.beginPath(); ctx.arc(2.8, -9, 2.4, 0, Math.PI * 2); ctx.stroke();
                ctx.lineWidth = 0.4;
                ctx.beginPath();
                ctx.moveTo(5.2, -8.5); ctx.quadraticCurveTo(6.5, -4, 4, -1); ctx.stroke();
                break;
            }
            case 'pipe': {
                // Brown pipe in mouth + small smoke curl
                ctx.fillStyle = '#3a2010'; ctx.strokeStyle = outline; ctx.lineWidth = 0.5;
                // Bowl
                ctx.beginPath();
                ctx.moveTo(4, -5); ctx.lineTo(4, -7.5); ctx.lineTo(7, -7.5); ctx.lineTo(7.5, -4.5);
                ctx.closePath(); ctx.fill(); ctx.stroke();
                // Stem
                ctx.fillRect(1.5, -5.4, 3, 1.2);
                // Smoke
                ctx.globalAlpha = 0.25; ctx.fillStyle = '#bbbbbb';
                ctx.beginPath(); ctx.arc(6, -10, 1.8, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(8, -12, 1.2, 0, Math.PI * 2); ctx.fill();
                ctx.globalAlpha = 1;
                break;
            }
            case 'newspaper': {
                // Folded paper under arm (rectangle with lines)
                ctx.fillStyle = '#e8ddc0'; ctx.strokeStyle = outline; ctx.lineWidth = 0.5;
                ctx.fillRect(-13, 2, 5, 4); ctx.strokeRect(-13, 2, 5, 4);
                ctx.strokeStyle = '#4a4030'; ctx.lineWidth = 0.3;
                ctx.beginPath();
                ctx.moveTo(-12.5, 3.2); ctx.lineTo(-8.5, 3.2);
                ctx.moveTo(-12.5, 4.2); ctx.lineTo(-8.5, 4.2);
                ctx.moveTo(-12.5, 5.2); ctx.lineTo(-8.5, 5.2);
                ctx.stroke();
                break;
            }
            case 'baguette': {
                // Diagonal bread loaf crossing the shoulder
                ctx.fillStyle = '#c9954a'; ctx.strokeStyle = '#6a4a20'; ctx.lineWidth = 0.6;
                ctx.save();
                ctx.translate(7, -1); ctx.rotate(-0.5);
                ctx.fillRect(-7, -1.4, 14, 2.8);
                ctx.strokeRect(-7, -1.4, 14, 2.8);
                // Scoring lines
                ctx.strokeStyle = '#8a6030'; ctx.lineWidth = 0.4;
                for (const lx of [-4, -1, 2, 5]) {
                    ctx.beginPath(); ctx.moveTo(lx, -1); ctx.lineTo(lx + 0.8, 1); ctx.stroke();
                }
                ctx.restore();
                break;
            }
            case 'worrybeads': {
                // Tesbih — chain of small beads hanging from hand
                ctx.fillStyle = '#c9a227'; ctx.strokeStyle = outline; ctx.lineWidth = 0.3;
                for (let i = 0; i < 5; i++) {
                    const by = 1 + i * 1.3;
                    ctx.beginPath(); ctx.arc(11, by, 0.9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                }
                // Connecting line
                ctx.strokeStyle = '#8a6a18'; ctx.lineWidth = 0.4;
                ctx.beginPath(); ctx.moveTo(11, 0.5); ctx.lineTo(11, 7.5); ctx.stroke();
                break;
            }
            case 'tanto': {
                // Short dagger on hip (vertical)
                ctx.fillStyle = '#8a8a98'; ctx.strokeStyle = outline; ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.moveTo(10, -3); ctx.lineTo(12, -3); ctx.lineTo(12, 3); ctx.lineTo(11, 4); ctx.lineTo(10, 3);
                ctx.closePath(); ctx.fill(); ctx.stroke();
                // Hilt wrap
                ctx.fillStyle = '#1a1a24'; ctx.fillRect(9.5, -5, 3, 2);
                // Gold tsuba
                ctx.fillStyle = pal.trim || '#c9a227';
                ctx.fillRect(9, -3.3, 4, 0.7);
                break;
            }
            case 'fan': {
                // War fan (gunbai) — half-disc
                ctx.fillStyle = '#f2e7b8'; ctx.strokeStyle = outline; ctx.lineWidth = 0.6;
                ctx.beginPath();
                ctx.arc(12, 1, 4, Math.PI * 0.3, Math.PI * 1.3, false);
                ctx.lineTo(11, 4);
                ctx.closePath(); ctx.fill(); ctx.stroke();
                // Red center emblem
                ctx.fillStyle = '#a52234';
                ctx.beginPath(); ctx.arc(12.5, 1, 1.2, 0, Math.PI * 2); ctx.fill();
                // Handle
                ctx.strokeStyle = '#3a2010'; ctx.lineWidth = 1.2;
                ctx.beginPath(); ctx.moveTo(11, 4); ctx.lineTo(11.5, 7); ctx.stroke();
                break;
            }
            case 'saber': {
                // Curved tulwar blade across torso
                ctx.strokeStyle = '#c0c0cc'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(-11, 5); ctx.quadraticCurveTo(0, -2, 12, 3);
                ctx.stroke();
                // Gold hilt
                ctx.fillStyle = pal.trim || '#c9a227';
                ctx.beginPath(); ctx.arc(-11, 5, 1.4, 0, Math.PI * 2); ctx.fill();
                ctx.lineCap = 'butt';
                break;
            }
            case 'scroll': {
                // Rolled scroll with red seal (chinese bureaucracy 元)
                ctx.fillStyle = '#e8ddc0'; ctx.strokeStyle = outline; ctx.lineWidth = 0.5;
                // Roll body
                ctx.fillRect(-13, 1, 5, 3.5);
                ctx.strokeRect(-13, 1, 5, 3.5);
                // End caps (gold)
                ctx.fillStyle = pal.trim || '#c9a227';
                ctx.fillRect(-13.5, 0.5, 0.8, 4.5);
                ctx.fillRect(-8.2, 0.5, 0.8, 4.5);
                // Red seal dot
                ctx.fillStyle = '#a52234';
                ctx.beginPath(); ctx.arc(-10.5, 2.7, 0.9, 0, Math.PI * 2); ctx.fill();
                break;
            }
        }
    }

    // ---------- Chest Mark: currency symbol as emblem ----------
    // v7.9.3: tier-scaled size + STRONG-only gold glow for instant threat recognition.
    _drawChestMark(ctx, region, tier) {
        const sym = this.symbol || '';
        if (!sym) return;

        const isStrong = tier === 'STRONG';
        // Tier size multiplier: WEAK 0.85 / MEDIUM 1.0 / STRONG 1.35 (STRONG glyph dominates the chest)
        const sizeMul = tier === 'WEAK' ? 0.85 : (isStrong ? 1.35 : 1.0);
        // v7.9.5: counter-flip only when global Y is flipped. When upright (hover-gate DWELL),
        // text is already oriented correctly — no counter-flip needed.
        const cfy = this._uprightFlip ? 1 : -1;

        if (region === 'EU') {
            const ringR = 3.2 * sizeMul;
            const fontPx = (5 * sizeMul).toFixed(2);
            // Monocle ring
            ctx.strokeStyle = '#c9a227';
            ctx.lineWidth = isStrong ? 1.2 : 0.9;
            ctx.beginPath();
            ctx.arc(2.6, -9, ringR, 0, Math.PI * 2);
            ctx.stroke();
            // Chain to collar
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(5.5, -8.5);
            ctx.quadraticCurveTo(7, -4, 4, 0);
            ctx.stroke();
            // Symbol (counter-flip so glyph reads upright despite global Y-flip)
            ctx.save();
            ctx.translate(2.6, -9);
            ctx.scale(1, cfy);
            ctx.font = `bold ${fontPx}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            if (isStrong) {
                ctx.shadowColor = '#c9a227';
                ctx.shadowBlur = 4;
            }
            ctx.fillStyle = '#c9a227';
            ctx.fillText(sym, 0, 0);
            ctx.restore();
            return;
        }

        if (region === 'ASIA') {
            const discR = 3.8 * sizeMul;
            const fontPx = (6.5 * sizeMul).toFixed(2);
            // Mon — gold disc on breastplate
            ctx.fillStyle = '#c9a227';
            ctx.strokeStyle = '#050505';
            ctx.lineWidth = isStrong ? 1.1 : 0.8;
            ctx.beginPath();
            ctx.arc(0, 2.5, discR, 0, Math.PI * 2);
            ctx.fill(); ctx.stroke();
            // STRONG: gold halo around the mon
            if (isStrong) {
                ctx.strokeStyle = '#c9a227';
                ctx.globalAlpha = 0.45;
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                ctx.arc(0, 2.5, discR + 1.6, 0, Math.PI * 2);
                ctx.stroke();
                ctx.globalAlpha = 1;
            }
            // Counter-flip text
            ctx.save();
            ctx.translate(0, 2.5);
            ctx.scale(1, cfy);
            ctx.font = `bold ${fontPx}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#050505';
            ctx.fillText(sym, 0, 0);
            ctx.restore();
            return;
        }

        // USA: pale-gold glyph stamped on the red tie
        const fontPx = (7 * sizeMul).toFixed(2);
        ctx.save();
        ctx.translate(0, 3.5);
        ctx.scale(1, cfy);
        ctx.font = `bold ${fontPx}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = isStrong ? 2.2 : 1.6;
        ctx.strokeStyle = '#050505';
        ctx.strokeText(sym, 0, 0);
        if (isStrong) {
            ctx.shadowColor = '#f2e7b8';
            ctx.shadowBlur = 5;
        }
        ctx.fillStyle = '#f2e7b8';
        ctx.fillText(sym, 0, 0);
        ctx.restore();
    }

    // ================================================================
    // REGIONAL VEHICLES — contextualize pilots as airborne in space
    // Each vehicle draws BEFORE the pilot bust so the pilot sits inside.
    // thrusterPhase: 0/1 toggle from drawAgent for flame flicker.
    // Vehicle vertical footprint: approx y ∈ [+4 .. +22]. Hitbox unchanged.
    // ================================================================

    // USA — Stealth Wedge: delta-wing silhouette + twin orange thrusters.
    _drawVehicleUSA(ctx, tier, thrusterPhase) {
        const hull     = '#1a1d24';
        const hullDark = '#0a0c12';
        const accent   = this.color;
        const outline  = '#050505';

        // Delta wing (trapezoidal, wider than pilot, wraps under torso)
        ctx.fillStyle = hull;
        ctx.strokeStyle = outline;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-19, 8);
        ctx.lineTo(19, 8);
        ctx.lineTo(14, 20);
        ctx.lineTo(-14, 20);
        ctx.closePath();
        ctx.fill(); ctx.stroke();

        // Accent stripe (currency color) across the leading edge
        ctx.fillStyle = accent;
        ctx.globalAlpha = 0.75;
        ctx.fillRect(-19, 7.2, 38, 1.4);
        ctx.globalAlpha = 1;

        // Cockpit frame (where pilot torso meets hull)
        ctx.fillStyle = hullDark;
        ctx.fillRect(-10, 6.5, 20, 2);

        // Side panel lines (F-117 vibe)
        ctx.strokeStyle = hullDark;
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(-14, 12); ctx.lineTo(-6, 20);
        ctx.moveTo( 14, 12); ctx.lineTo( 6, 20);
        ctx.stroke();

        // Twin thrusters (orange flicker)
        const flameLen = thrusterPhase ? 6 : 4;
        const flameAlpha = thrusterPhase ? 0.95 : 0.75;
        // Nozzle housings
        ctx.fillStyle = hullDark;
        ctx.fillRect(-13, 19, 6, 3);
        ctx.fillRect(  7, 19, 6, 3);
        // Flames (additive-ish warm gradient via stacked rects)
        ctx.globalAlpha = flameAlpha;
        ctx.fillStyle = '#ff7a2e';
        ctx.fillRect(-12, 22, 4, flameLen);
        ctx.fillRect(  8, 22, 4, flameLen);
        ctx.fillStyle = '#ffd24a';
        ctx.fillRect(-11.5, 22, 3, flameLen - 2);
        ctx.fillRect(  8.5, 22, 3, flameLen - 2);
        ctx.globalAlpha = 1;
    }

    // EU — Diplomatic Shuttle: navy oval fuselage + portholes + tail fin + central flame.
    _drawVehicleEU(ctx, tier, thrusterPhase) {
        const hull     = '#1a2a52';
        const hullDark = '#0a1428';
        const trim     = '#c9a227';
        const accent   = this.color;
        const outline  = '#050505';

        // Fuselage (oval)
        ctx.fillStyle = hull;
        ctx.strokeStyle = outline;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(0, 13, 17, 8, 0, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();

        // Belly accent stripe (currency color)
        ctx.fillStyle = accent;
        ctx.globalAlpha = 0.7;
        ctx.fillRect(-14, 16, 28, 1.4);
        ctx.globalAlpha = 1;

        // Cockpit frame band
        ctx.fillStyle = hullDark;
        ctx.fillRect(-10, 6.5, 20, 2);

        // Portholes (3 circular windows along the belly)
        ctx.fillStyle = '#4a7cc9';
        ctx.strokeStyle = trim;
        ctx.lineWidth = 0.5;
        for (const px of [-9, 0, 9]) {
            ctx.beginPath();
            ctx.arc(px, 13, 1.6, 0, Math.PI * 2);
            ctx.fill(); ctx.stroke();
        }

        // Tail fin (gold, dorsal)
        ctx.fillStyle = trim;
        ctx.strokeStyle = outline;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(-2, 6); ctx.lineTo(2, 6);
        ctx.lineTo(1, 10); ctx.lineTo(-1, 10);
        ctx.closePath(); ctx.fill(); ctx.stroke();

        // Central blue-white flame
        const flameLen = thrusterPhase ? 7 : 5;
        const flameAlpha = thrusterPhase ? 0.95 : 0.8;
        ctx.fillStyle = hullDark;
        ctx.fillRect(-3, 20, 6, 2);
        ctx.globalAlpha = flameAlpha;
        ctx.fillStyle = '#5ab8ff';
        ctx.fillRect(-2.5, 21.5, 5, flameLen);
        ctx.fillStyle = '#e6f3ff';
        ctx.fillRect(-1.5, 21.5, 3, flameLen - 2);
        ctx.globalAlpha = 1;
    }

    // ASIA — Mech Quad-Drone: central cockpit + 4 red lacquer rotors in X.
    _drawVehicleASIA(ctx, tier, thrusterPhase) {
        const hull     = '#1a1a24';
        const hullDark = '#0a0a10';
        const trim     = '#c9a227';
        const rotorCol = '#a52234';
        const rotorDark = '#5a1218';
        const accent   = this.color;
        const outline  = '#050505';

        // X-arm struts (behind rotors)
        ctx.strokeStyle = hullDark;
        ctx.lineWidth = 2.6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-15, 18); ctx.lineTo(-3, 9);
        ctx.moveTo( 15, 18); ctx.lineTo( 3, 9);
        ctx.moveTo(-15, 22); ctx.lineTo(-3, 13);
        ctx.moveTo( 15, 22); ctx.lineTo( 3, 13);
        ctx.stroke();
        ctx.lineCap = 'butt';

        // Central cockpit pod (circular)
        ctx.fillStyle = hull;
        ctx.strokeStyle = outline;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(0, 13, 9, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();

        // Gold trim ring
        ctx.strokeStyle = trim;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.arc(0, 13, 9, 0, Math.PI * 2);
        ctx.stroke();

        // Cockpit frame where pilot torso meets pod
        ctx.fillStyle = hullDark;
        ctx.fillRect(-10, 6.5, 20, 2);

        // Central red eye (sensor)
        ctx.fillStyle = rotorCol;
        ctx.beginPath();
        ctx.arc(0, 15, 1.8, 0, Math.PI * 2);
        ctx.fill();

        // 4 rotors at arm tips (red lacquer disks, motion blur via alpha toggle)
        const rotorAlpha = thrusterPhase ? 0.55 : 0.9;
        const rotorPositions = [[-15, 18], [15, 18], [-15, 22], [15, 22]];
        for (const [rx, ry] of rotorPositions) {
            // Hub
            ctx.fillStyle = hullDark;
            ctx.beginPath();
            ctx.arc(rx, ry, 1.2, 0, Math.PI * 2);
            ctx.fill();
            // Blurred blades (ellipse, alpha flicker)
            ctx.globalAlpha = rotorAlpha;
            ctx.fillStyle = rotorCol;
            ctx.beginPath();
            ctx.ellipse(rx, ry, 4, 1.2, thrusterPhase ? 0 : Math.PI / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = rotorDark;
            ctx.lineWidth = 0.4;
            ctx.stroke();
            ctx.globalAlpha = 1;
        }

        // Currency accent dot on forehead of pod
        ctx.fillStyle = accent;
        ctx.fillRect(-1, 8.5, 2, 1.2);
    }


    drawMinion(ctx, x, y) {
        // Boss minions: slightly smaller than regular enemies
        const r = 22; // v4.25: 18→22 (+20% resize)
        const pulse = Math.sin(Date.now() * 0.01) * 0.15 + 1;

        // Flying animation - minions bob up and down
        const bobOffset = Math.sin(Date.now() * 0.005 + x * 0.1) * 5;
        y += bobOffset;

        // Danger glow (minions are aggressive)
        ctx.fillStyle = this.color;
        ctx.globalAlpha = 0.3 * pulse;
        ctx.beginPath();
        ctx.arc(x, y, r + 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Main body (small coin)
        ctx.fillStyle = this._colorDark35;
        ctx.beginPath();
        ctx.arc(x, y, r, Math.PI * 0.4, Math.PI * 1.4);
        ctx.lineTo(x, y);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(x, y, r, Math.PI * 1.4, Math.PI * 0.4);
        ctx.lineTo(x, y);
        ctx.closePath();
        ctx.fill();

        // Outline
        ctx.strokeStyle = this._colorDark50 || '#111';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.stroke();

        // Wing-like sparkles on sides (flying money effect)
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 0.7;
        const wingAngle = Date.now() * 0.02;
        for (let i = -1; i <= 1; i += 2) {
            const wingX = x + i * (r + 4);
            const wingY = y + Math.sin(wingAngle + i) * 4;
            ctx.beginPath();
            ctx.moveTo(wingX, wingY - 6);
            ctx.lineTo(wingX + i * 8, wingY);
            ctx.lineTo(wingX, wingY + 6);
            ctx.closePath();
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Symbol (smaller)
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 17px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.symbol, x, y);
    }

    // v4.58: Generate crack line data (called once when enemy becomes damaged)
    _generateCracks(cfg) {
        const count = cfg.COUNT_AT_DEATH; // Pre-generate max, draw subset
        this._crackData = [];
        const R = cfg.BODY_RADIUS;
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const len = cfg.LENGTH_MIN + Math.random() * (cfg.LENGTH_MAX - cfg.LENGTH_MIN);
            const startR = R * (0.2 + Math.random() * 0.3);
            const sx = Math.cos(angle) * startR;
            const sy = Math.sin(angle) * startR;
            // Jagged midpoint
            const midAngle = angle + (Math.random() - 0.5) * 0.8;
            const mx = sx + Math.cos(midAngle) * len * 0.5;
            const my = sy + Math.sin(midAngle) * len * 0.5;
            // End point
            const endAngle = midAngle + (Math.random() - 0.5) * 0.6;
            const ex = mx + Math.cos(endAngle) * len * 0.5;
            const ey = my + Math.sin(endAngle) * len * 0.5;
            this._crackData.push({ sx, sy, mx, my, ex, ey });
        }
    }

    // v4.58: Draw fracture lines on damaged enemy body
    _drawCracks(ctx, x, y, cfg) {
        const alpha = cfg.ALPHA_MIN + (cfg.ALPHA_MAX - cfg.ALPHA_MIN) * this._damageIntensity;
        const CU = window.Game.ColorUtils;
        ctx.strokeStyle = CU.withAlpha(this._colorBright, alpha);
        ctx.lineWidth = cfg.WIDTH;
        ctx.lineCap = 'round';
        const n = Math.min(this._crackCount, this._crackData.length);
        for (let i = 0; i < n; i++) {
            const c = this._crackData[i];
            ctx.beginPath();
            ctx.moveTo(x + c.sx, y + c.sy);
            ctx.lineTo(x + c.mx, y + c.my);
            ctx.lineTo(x + c.ex, y + c.ey);
            ctx.stroke();
        }
    }

    roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

}

window.Game.Enemy = Enemy;
