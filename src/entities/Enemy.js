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

        // v4.45: Enemy shield removed (non-intuitive, HP is the only defense now)

        this.canTeleport = false;     // Strong tier: can teleport
        this.teleportCooldown = 0;    // Time until next teleport
        this.teleportFlash = 0;       // Visual feedback

        this.isMinion = false;        // Boss minion type

        // Formation entry system
        this.isEntering = false;      // True while flying to position
        this.targetX = x;             // Final X position
        this.targetY = y;             // Final Y position
        this.entryDelay = 0;          // Staggered delay before starting entry
        this.entryProgress = 0;       // 0-1 progress of entry animation
        this.settleTimer = 0;         // Time to settle after reaching position
        this.hasSettled = false;      // True after settling complete (can fire)

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
            ownerColor: this.color  // v4.56: Tint bullet core with enemy color
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

        // FORMATION ENTRY - Handle entry animation before normal movement
        if (this.isEntering) {
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
    takeDamage(amount, elemType) {
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

        // Draw based on shape type
        if (this.isMinion) {
            this.drawMinion(ctx, x, y);
        } else if (this.shape === 'coin') {
            this.drawCoin(ctx, x, y);
        } else if (this.shape === 'bill') {
            this.drawBill(ctx, x, y);
        } else if (this.shape === 'bar') {
            this.drawBar(ctx, x, y);
        } else if (this.shape === 'card') {
            this.drawCard(ctx, x, y);
        } else {
            this.drawCoin(ctx, x, y); // fallback
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

    drawCoin(ctx, x, y) {
        const r = 23;

        // v4.56: Dark body fill
        ctx.fillStyle = this._bodyFill;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();

        // Inner ring (darker center)
        ctx.fillStyle = this._colorDark50;
        ctx.beginPath();
        ctx.arc(x, y, r * 0.65, 0, Math.PI * 2);
        ctx.fill();

        // Neon outline
        ctx.strokeStyle = this._colorBright;
        ctx.lineWidth = this._outlineWidth;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.stroke();

        // Inner ring neon stroke
        ctx.strokeStyle = this._colorDark30;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, r * 0.65, 0, Math.PI * 2);
        ctx.stroke();

        // Rim highlight (top arc, lighter)
        ctx.strokeStyle = this._colorLight50;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y, r - 2, -Math.PI * 0.6, Math.PI * 0.1);
        ctx.stroke();

        // Edge notches
        ctx.strokeStyle = this._colorBright;
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI * 2 / 6) * i;
            const x1 = x + Math.cos(angle) * (r - 3);
            const y1 = y + Math.sin(angle) * (r - 3);
            const x2 = x + Math.cos(angle) * r;
            const y2 = y + Math.sin(angle) * r;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }

        // Symbol with neon glow
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 6;
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.symbol, x, y);
        ctx.shadowBlur = 0;
    }

    drawBill(ctx, x, y) {
        const w = 44, h = 25;

        // v4.56: Dark body fill
        ctx.fillStyle = this._bodyFill;
        ctx.fillRect(x - w/2, y - h/2, w, h);

        // Neon outline
        ctx.strokeStyle = this._colorBright;
        ctx.lineWidth = this._outlineWidth;
        ctx.strokeRect(x - w/2, y - h/2, w, h);

        // Inner border (neon subtle)
        ctx.strokeStyle = this._colorDark30;
        ctx.lineWidth = 1;
        ctx.strokeRect(x - w/2 + 4, y - h/2 + 4, w - 8, h - 8);

        // Circuit-like decorative lines (top & bottom)
        ctx.strokeStyle = this._colorBright;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.moveTo(x - w/2 + 3, y - h/2 + 3);
        ctx.lineTo(x - w/2 + 12, y - h/2 + 3);
        ctx.moveTo(x + w/2 - 12, y - h/2 + 3);
        ctx.lineTo(x + w/2 - 3, y - h/2 + 3);
        ctx.moveTo(x - w/2 + 3, y + h/2 - 3);
        ctx.lineTo(x - w/2 + 12, y + h/2 - 3);
        ctx.moveTo(x + w/2 - 12, y + h/2 - 3);
        ctx.lineTo(x + w/2 - 3, y + h/2 - 3);
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Rim highlight (top edge)
        ctx.strokeStyle = this._colorLight50;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x - w/2 + 3, y - h/2);
        ctx.lineTo(x + w/2 - 3, y - h/2);
        ctx.stroke();

        // Symbol with neon glow
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 6;
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 17px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.symbol, x, y);
        ctx.shadowBlur = 0;
    }

    drawBar(ctx, x, y) {
        // v4.56: Dark body fill (trapezoid)
        ctx.fillStyle = this._bodyFill;
        ctx.beginPath();
        ctx.moveTo(x - 24, y + 12);
        ctx.lineTo(x - 17, y - 12);
        ctx.lineTo(x + 17, y - 12);
        ctx.lineTo(x + 24, y + 12);
        ctx.closePath();
        ctx.fill();

        // Neon outline
        ctx.strokeStyle = this._colorBright;
        ctx.lineWidth = this._outlineWidth;
        ctx.stroke();

        // Top face (lighter neon tint)
        ctx.fillStyle = this._colorDark30;
        ctx.beginPath();
        ctx.moveTo(x - 17, y - 12);
        ctx.lineTo(x - 12, y - 18);
        ctx.lineTo(x + 12, y - 18);
        ctx.lineTo(x + 17, y - 12);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = this._colorBright;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Shine line (neon color instead of white)
        ctx.strokeStyle = this._colorLight50;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.moveTo(x - 10, y - 16);
        ctx.lineTo(x + 10, y - 16);
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Symbol with neon glow (white, not black)
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 6;
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 17px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.symbol, x, y + 1);
        ctx.shadowBlur = 0;
    }

    drawCard(ctx, x, y) {
        const w = 40, h = 27;

        // v4.56: Dark body fill (rounded rect)
        ctx.fillStyle = this._bodyFill;
        this.roundRect(ctx, x - w/2, y - h/2, w, h, 5);
        ctx.fill();

        // Neon outline
        ctx.strokeStyle = this._colorBright;
        ctx.lineWidth = this._outlineWidth;
        this.roundRect(ctx, x - w/2, y - h/2, w, h, 5);
        ctx.stroke();

        // Chip (gold stays)
        ctx.fillStyle = '#ffcc00';
        ctx.fillRect(x - w/2 + 5, y - 6, 11, 11);
        ctx.strokeStyle = '#cc9900';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x - w/2 + 5, y - 6, 11, 11);
        ctx.strokeStyle = '#ddaa00';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x - w/2 + 7, y - 3);
        ctx.lineTo(x - w/2 + 14, y - 3);
        ctx.moveTo(x - w/2 + 7, y + 2);
        ctx.lineTo(x - w/2 + 14, y + 2);
        ctx.stroke();

        // Circuit traces (replace magnetic stripe)
        ctx.strokeStyle = this._colorBright;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.moveTo(x - w/2 + 3, y + h/2 - 5);
        ctx.lineTo(x - w/2 + 10, y + h/2 - 5);
        ctx.lineTo(x - w/2 + 13, y + h/2 - 3);
        ctx.lineTo(x + w/2 - 3, y + h/2 - 3);
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Rim highlight (top edge)
        ctx.strokeStyle = this._colorLight50;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x - w/2 + 6, y - h/2);
        ctx.lineTo(x + w/2 - 6, y - h/2);
        ctx.stroke();

        // Holographic shimmer (subtle pulse)
        const shimmer = Math.sin(Date.now() * 0.004 + x * 0.1) * 0.08 + 0.08;
        ctx.fillStyle = this._colorBright;
        ctx.globalAlpha = shimmer;
        this.roundRect(ctx, x - w/2 + 2, y - h/2 + 2, w - 4, h - 4, 3);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Symbol with neon glow
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 6;
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.symbol, x + 6, y - 2);
        ctx.shadowBlur = 0;
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
