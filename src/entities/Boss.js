window.Game = window.Game || {};

class Boss extends window.Game.Entity {
    constructor(gameWidth, gameHeight, bossType = 'FEDERAL_RESERVE') {
        // BIGGER: 160x140 instead of 80x80
        super(gameWidth / 2 - 80, -160, 160, 140);
        this.gameWidth = gameWidth;
        this.gameHeight = gameHeight;
        this.bossType = bossType;

        // Get boss config
        const config = window.Game.BOSSES[bossType] || window.Game.BOSSES.FEDERAL_RESERVE;
        this.config = config;
        this.name = config.name;
        this.symbol = config.symbol;
        this.color = config.color;
        this.accentColor = config.accentColor;
        this.darkColor = config.darkColor;

        this.maxHp = 800;
        this.hp = 800;
        this.active = true;

        // 3 PHASES: PHASE1 (100-66%), PHASE2 (66-33%), PHASE3 (33-0%)
        this.phase = 1;
        this.phaseTransitioning = false;
        this.phaseTransitionTimer = 0;

        const safeOffset = window.safeAreaInsets?.top || 0;
        this.targetY = 100 + safeOffset; // v4.41: Below HUD + HP bar clearance (was 65)
        this.dir = 1;

        // Movement speed from Balance config (phase 1 default)
        const Balance = window.Game.Balance;
        const speeds = Balance && Balance.BOSS.PHASE_SPEEDS[bossType];
        this.moveSpeed = speeds ? speeds[0] : 60;

        this.fireTimer = 0;
        this.printTimer = 0;
        this.hitTimer = 0;
        this.angle = 0;
        this.laserAngle = 0;
        this.animTime = 0;

        // Visual state
        this.eyeGlow = 0;
        this.shakeIntensity = 0;

        // BCE specific
        this.stars = [];
        for (let i = 0; i < 12; i++) {
            this.stars.push({ angle: (i / 12) * Math.PI * 2, dist: 85 });
        }
        this.trailBullets = []; // For debris trails

        // BOJ specific
        this.wavePhase = 0;
        this.interventionCooldown = 0;
        this.zenMode = true;
        // v4.0.2: BOJ Phase 3 telegraph system
        this.bojInterventionTimer = 0;
        this.bojTelegraphTimer = 0;
        this.bojTelegraphTarget = null; // {x, y} of player when telegraph started
    }

    damage(amount) {
        this.hp -= amount;
        this.hitTimer = 0.12;

        // Phase transitions — v4.16: read thresholds from Balance config (was hardcoded 0.66/0.33)
        const thresholds = window.Game.Balance?.BOSS?.PHASE_THRESHOLDS || [0.66, 0.33];
        const hpPct = this.hp / this.maxHp;
        if (hpPct <= thresholds[1] && this.phase < 3) {
            this.triggerPhaseTransition(3);
        } else if (hpPct <= thresholds[0] && this.phase < 2) {
            this.triggerPhaseTransition(2);
        }
    }

    triggerPhaseTransition(newPhase) {
        this.phase = newPhase;
        this.phaseTransitioning = true;

        // Track phase change for analytics
        if (window.Game.Debug) {
            window.Game.Debug.trackBossPhase(this.bossType, newPhase);
        }
        this.phaseTransitionTimer = 1.5;
        this.shakeIntensity = 15;
        this.eyeGlow = 1;

        // Update movement speed from Balance config
        const Balance = window.Game.Balance;
        if (Balance && Balance.BOSS.PHASE_SPEEDS[this.bossType]) {
            this.moveSpeed = Balance.BOSS.PHASE_SPEEDS[this.bossType][newPhase - 1];
        }

        // BOJ becomes aggressive in later phases
        if (this.bossType === 'BOJ' && newPhase >= 2) {
            this.zenMode = false;
        }

        if (window.Game.Audio) {
            window.Game.Audio.play('bossPhaseChange');
            window.Game.Audio.setBossPhase(newPhase);
        }

        // v4.20.0: Boss phase dialogue via meme popup (was DialogueUI at bottom)
        const phasePool = window.Game.DIALOGUES?.BOSS_PHASE?.[this.bossType]?.[newPhase];
        if (phasePool && phasePool.length > 0 && window.Game.MemeEngine) {
            const pick = phasePool[Math.floor(Math.random() * phasePool.length)];
            window.Game.MemeEngine.queueMeme('BOSS_SPAWN', pick.text, pick.speaker);
        }

        // Update Harmonic Conductor for new boss phase
        if (window.Game.HarmonicConductor) {
            window.Game.HarmonicConductor.setBossSequence(newPhase);
        }

        // Screen shake via global
        if (typeof shake !== 'undefined') shake = 30;

        // Hit stop and screen flash (Ikeda juice)
        if (window.Game.applyHitStop) {
            window.Game.applyHitStop('BOSS_PHASE', false); // Slowmo for dramatic effect
        }
        if (window.Game.triggerScreenFlash) {
            window.Game.triggerScreenFlash('BOSS_PHASE');
        }
        // Proximity Kill Meter: boss phase change fills meter
        if (window.Game.addProximityMeter) {
            const gain = window.Game.Balance?.PROXIMITY_KILL?.BOSS_PHASE_GAIN || 15;
            window.Game.addProximityMeter(gain);
        }
    }

    update(dt, player) {
        const Balance = window.Game.Balance;
        this.animTime += dt;
        if (this.hitTimer > 0) this.hitTimer -= dt;
        if (this.eyeGlow > 0) this.eyeGlow -= dt * 0.5;
        if (this.shakeIntensity > 0) this.shakeIntensity -= dt * 10;

        // BOJ intervention cooldown + telegraph timer
        if (this.interventionCooldown > 0) this.interventionCooldown -= dt;
        if (this.bojInterventionTimer > 0) this.bojInterventionTimer -= dt;
        if (this.bojTelegraphTimer > 0) this.bojTelegraphTimer -= dt;

        // Phase transition pause
        if (this.phaseTransitioning) {
            this.phaseTransitionTimer -= dt;
            if (this.phaseTransitionTimer <= 0) {
                this.phaseTransitioning = false;
            }
            // Shake during transition
            this.x += (Math.random() - 0.5) * this.shakeIntensity;
            this.y = this.targetY + (Math.random() - 0.5) * this.shakeIntensity;
            return null;
        }

        // Entrance Animation
        if (this.y < this.targetY) {
            this.y += (Balance.BOSS.ENTRANCE_SPEED || 80) * dt;
            return null;
        }

        // Movement based on boss type and phase
        this.updateMovement(dt);

        // Attack Logic
        this.fireTimer -= dt;
        if (this.fireTimer <= 0) {
            return this.attack(player);
        }
        return null;
    }

    updateMovement(dt) {
        if (this.bossType === 'BCE') {
            this.updateMovementBCE(dt);
        } else if (this.bossType === 'BOJ') {
            this.updateMovementBOJ(dt);
        } else {
            this.updateMovementFED(dt);
        }
    }

    updateMovementFED(dt) {
        const Balance = window.Game.Balance;
        const mv = Balance.BOSS.MOVEMENT.FEDERAL_RESERVE;
        if (this.phase === 1) {
            // Slow patrol
            const m = mv.P1.MARGIN;
            this.x += this.moveSpeed * this.dir * dt;
            if (this.x < m) {
                this.x = m;
                this.dir = 1;
            } else if (this.x + this.width > this.gameWidth - m) {
                this.x = this.gameWidth - m - this.width;
                this.dir = -1;
            }
        } else if (this.phase === 2) {
            // Faster, erratic movement (speed from Balance config)
            const m = mv.P2.MARGIN;
            this.x += this.moveSpeed * this.dir * dt;
            this.y = this.targetY + Math.sin(this.animTime * mv.P2.OSC_FREQ) * mv.P2.OSC_AMP;
            if (this.x < m) {
                this.x = m;
                this.dir = 1;
            } else if (this.x + this.width > this.gameWidth - m) {
                this.x = this.gameWidth - m - this.width;
                this.dir = -1;
            }
        } else {
            // Phase 3: RAGE - Erratic aggressive movement (speed from Balance config)
            const p3 = mv.P3;
            const baseX = this.gameWidth / 2 - this.width / 2;
            const patternX = Math.sin(this.animTime * p3.FREQ_X) * p3.AMP_X;
            const patternY = Math.sin(this.animTime * p3.FREQ_Y) * p3.AMP_Y;
            const targetX = baseX + patternX;
            this.x += (targetX - this.x) * p3.LERP * dt + (Math.random() - 0.5) * p3.JITTER;
            this.y = this.targetY + patternY + (Math.random() - 0.5) * 5;
            const bm = Balance.BOSS.BOUNDARY_MARGIN;
            this.x = Math.max(bm, Math.min(this.gameWidth - this.width - bm, this.x));

            // Spawn minions (rate from Balance config)
            this.printTimer -= dt;
            if (this.printTimer <= 0) {
                this.printMoney();
                const Balance = window.Game.Balance;
                this.printTimer = Balance ? Balance.BOSS.MINION_SPAWN_RATE.FEDERAL_RESERVE : 2.5;
            }
        }
    }

    updateMovementBCE(dt) {
        const Balance = window.Game.Balance;
        const mv = Balance.BOSS.MOVEMENT.BCE;
        // BCE: Slow, methodical, bureaucratic movement (speeds from Balance config)
        if (this.phase === 1) {
            // Very slow patrol - bureaucracy is slow
            const m = mv.P1.MARGIN;
            this.x += this.moveSpeed * this.dir * dt;
            if (this.x < m) {
                this.x = m;
                this.dir = 1;
            } else if (this.x + this.width > this.gameWidth - m) {
                this.x = this.gameWidth - m - this.width;
                this.dir = -1;
            }
        } else if (this.phase === 2) {
            // Still slow but with vertical oscillation
            const m = mv.P2.MARGIN;
            this.x += this.moveSpeed * this.dir * dt;
            this.y = this.targetY + Math.sin(this.animTime * mv.P2.OSC_FREQ) * mv.P2.OSC_AMP;
            if (this.x < m) {
                this.x = m;
                this.dir = 1;
            } else if (this.x + this.width > this.gameWidth - m) {
                this.x = this.gameWidth - m - this.width;
                this.dir = -1;
            }
        } else {
            // Phase 3: Fragmentation - faster, erratic
            const m = mv.P3.MARGIN;
            this.x += this.moveSpeed * this.dir * dt;
            this.y = this.targetY + Math.sin(this.animTime * mv.P3.SIN_FREQ) * mv.P3.SIN_AMP + Math.cos(this.animTime * mv.P3.COS_FREQ) * mv.P3.COS_AMP;
            if (this.x < m) {
                this.x = m;
                this.dir = 1;
            } else if (this.x + this.width > this.gameWidth - m) {
                this.x = this.gameWidth - m - this.width;
                this.dir = -1;
            }

            // Spawn euro minions (rate from Balance config)
            this.printTimer -= dt;
            if (this.printTimer <= 0) {
                this.printMoney();
                const Balance = window.Game.Balance;
                this.printTimer = Balance ? Balance.BOSS.MINION_SPAWN_RATE.BCE : 3.0;
            }
        }

        // Rotate stars
        for (let star of this.stars) {
            star.angle += dt * 0.5;
        }
    }

    updateMovementBOJ(dt) {
        const Balance = window.Game.Balance;
        const mv = Balance.BOSS.MOVEMENT.BOJ;
        // BOJ: Zen precision, then sudden interventions (speeds from Balance config)
        if (this.phase === 1) {
            // Smooth, zen-like movement
            const p1 = mv.P1;
            const centerX = this.gameWidth / 2 - this.width / 2;
            const offsetX = Math.sin(this.animTime * p1.OSC_FREQ) * p1.OSC_AMP;
            this.x += (centerX + offsetX - this.x) * p1.LERP * dt;
        } else if (this.phase === 2) {
            // Yield curve control - smooth waves
            const p2 = mv.P2;
            const wave = Math.sin(this.animTime * p2.WAVE_FREQ) * p2.WAVE_AMP;
            const targetX = this.gameWidth / 2 - this.width / 2 + wave;
            this.x += (targetX - this.x) * p2.LERP * dt;
            this.y = this.targetY + Math.sin(this.animTime * p2.VERT_FREQ) * p2.VERT_AMP;

            // Sudden intervention bursts
            if (this.interventionCooldown <= 0 && Math.random() < p2.INTERVENTION_CHANCE) {
                this.interventionCooldown = p2.INTERVENTION_COOLDOWN;
                // Quick dash to random position
                this.x = Math.random() * (this.gameWidth - this.width - 40) + 20;
            }
        } else {
            // Phase 3: Full intervention mode
            const p3 = mv.P3;

            // Unpredictable movements with sudden stops
            if (Math.floor(this.animTime * 2) % 3 === 0) {
                // Zen pause
                this.y = this.targetY;
            } else {
                // Aggressive movement
                const patternX = Math.sin(this.animTime * p3.FREQ_X) * p3.AMP_X;
                const patternY = Math.cos(this.animTime * p3.FREQ_Y) * p3.AMP_Y;
                const targetX = this.gameWidth / 2 - this.width / 2 + patternX;
                this.x += (targetX - this.x) * p3.LERP * dt;
                this.y = this.targetY + patternY;
            }

            const bm = Balance.BOSS.BOUNDARY_MARGIN;
            this.x = Math.max(bm, Math.min(this.gameWidth - this.width - bm, this.x));

            // Spawn yen minions (rate from Balance config)
            this.printTimer -= dt;
            if (this.printTimer <= 0) {
                this.printMoney();
                const Balance = window.Game.Balance;
                this.printTimer = Balance ? Balance.BOSS.MINION_SPAWN_RATE.BOJ : 2.0;
            }
        }
    }

    printMoney() {
        const G = window.Game;
        if (!G.enemies) return;

        // Use MINION_TYPE with boss-specific color
        const minionConfig = Object.assign({}, G.MINION_TYPE);

        // Color based on boss type
        if (this.bossType === 'BCE') {
            minionConfig.c = '#2288ff'; // Euro blue
            minionConfig.s = '€';
        } else if (this.bossType === 'BOJ') {
            minionConfig.c = '#ff3355'; // Yen red
            minionConfig.s = '¥';
        } else {
            minionConfig.c = '#00ff66'; // Dollar green
            minionConfig.s = '$';
        }

        // Scale minion HP with boss phase
        const mc = G.Balance.BOSS.MINION;
        minionConfig.hp = minionConfig.hp * (mc.HP_MULT_BASE + this.phase * mc.HP_MULT_PER_PHASE);

        // Spawn minions on both sides
        const minion1 = new G.Enemy(this.x - mc.SPAWN_OFFSET_X, this.y + mc.SPAWN_OFFSET_Y, minionConfig);
        const minion2 = new G.Enemy(this.x + this.width + mc.SPAWN_OFFSET_X, this.y + mc.SPAWN_OFFSET_Y, minionConfig);

        // Mark as minions for special behavior
        minion1.isMinion = true;
        minion2.isMinion = true;

        G.enemies.push(minion1);
        G.enemies.push(minion2);

        if (G.Audio) G.Audio.play('coinUI');
    }

    attack(player) {
        if (this.bossType === 'BCE') {
            return this.attackBCE(player);
        } else if (this.bossType === 'BOJ') {
            return this.attackBOJ(player);
        } else {
            return this.attackFED(player);
        }
    }

    attackFED(player) {
        const bullets = [];
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height;
        const Patterns = window.Game.BulletPatterns;
        const Colors = window.Game.PROJECTILE_COLORS || window.Game.BULLET_HELL_COLORS || {};
        const Balance = window.Game.Balance;
        const fireRates = Balance ? Balance.BOSS.FIRE_RATES.FEDERAL_RESERVE : [0.85, 0.38, 0.20];

        if (!Patterns) {
            this.fireTimer = fireRates[this.phase - 1];
            for (let i = -2; i <= 2; i++) {
                const angle = Math.PI / 2 + (i * 0.25);
                bullets.push({
                    x: cx, y: cy - 20,
                    vx: Math.cos(angle) * 180,
                    vy: Math.sin(angle) * 180,
                    color: '#00ff66', w: 10, h: 10
                });
            }
            return bullets;
        }

        // FED Signature: Aggressive printer - sineWave + expandingRing → spiral + homingMissiles → laserBeam + curtain + homing
        const atk = Balance.BOSS.ATTACKS.FEDERAL_RESERVE;
        if (this.phase === 1) {
            // Phase 1: 3-pattern rotation — ring, sineWave, aimedBurst (v5.0.4)
            this.fireTimer = fireRates[0];
            this.angle += atk.P1.ROTATION_SPEED;
            const p1Cycle = Math.floor(this.angle * 2) % 3;

            if (p1Cycle === 0) {
                const rp = atk.P1.RING;
                const ringBullets = Patterns.expandingRing(cx, cy - 20, this.angle, {
                    count: rp.count, speed: rp.speed, color: '#00ff66', size: rp.size, rotate: true
                });
                bullets.push(...ringBullets);
            } else if (p1Cycle === 1) {
                const sp = atk.P1.SINE;
                const waveBullets = Patterns.sineWave(cx, cy - 20, this.animTime, {
                    count: sp.count, width: sp.width, amplitude: sp.amplitude, speed: sp.speed, color: '#00cc55', size: 8
                });
                bullets.push(...waveBullets);
            } else if (player) {
                const bp = atk.P1.BURST;
                const burstBullets = Patterns.aimedBurst(cx, cy - 20, player.x, player.y, {
                    count: bp.count, speed: bp.speed, spread: bp.spread, color: '#00ff66', size: 10
                });
                bullets.push(...burstBullets);
            }
        } else if (this.phase === 2) {
            // Phase 2: Faster, complex patterns (spiral + HOMING MISSILES)
            this.fireTimer = fireRates[1];
            this.angle += atk.P2.ROTATION_SPEED;

            // Spiral arms
            const spiralBullets = Patterns.spiral(cx, cy - 20, this.angle, {
                arms: 3, speed: 180, color: '#ffaa00', size: 10
            });
            bullets.push(...spiralBullets);

            // Homing missiles every ~1.5 seconds
            if (Math.floor(this.animTime * 0.67) !== Math.floor((this.animTime - fireRates[1]) * 0.67) && player) {
                const hp = atk.P2.HOMING;
                const homingBullets = Patterns.homingMissiles(cx, cy - 30, player.x, player.y, {
                    count: hp.count, speed: hp.speed, color: '#ff3344', size: 12, homingStrength: hp.homingStrength, maxSpeed: hp.maxSpeed
                });
                bullets.push(...homingBullets);
            }

            // Occasional flower burst
            if (Math.floor(this.animTime * 0.4) !== Math.floor((this.animTime - fireRates[1]) * 0.4)) {
                const flowerBullets = Patterns.flower(cx, cy - 25, this.animTime, {
                    petals: 5, bulletsPerPetal: 2, speed: 160, color: '#ff8800', size: 9
                });
                bullets.push(...flowerBullets);
            }
        } else {
            // Phase 3: RAGE - LASER BEAM + curtain + homing
            this.fireTimer = fireRates[2];
            this.angle += atk.P3.ROTATION_SPEED;
            this.laserAngle += 0.08;

            // Laser beam sweep (FED signature attack!)
            if (Math.floor(this.animTime * 0.5) !== Math.floor((this.animTime - fireRates[2]) * 0.5) && player) {
                const lp = atk.P3.LASER;
                const laserBullets = Patterns.laserBeam(cx, cy - 20, player.x, player.y + 100, {
                    count: lp.count, speed: lp.speed, color: '#00ff66', size: 6, width: lp.width, gapSize: lp.gapSize
                });
                bullets.push(...laserBullets);
            }

            // Curtain with gap
            if (Math.floor(this.animTime * 0.8) !== Math.floor((this.animTime - fireRates[2]) * 0.8) && player) {
                const cp = atk.P3.CURTAIN;
                const curtainBullets = Patterns.curtain(cx, cy - 40, player.x, {
                    width: 420, count: cp.count, gapSize: cp.gapSize, speed: cp.speed, color: '#00ffff', size: 9
                });
                bullets.push(...curtainBullets);
            }

            // Aggressive homing missiles
            if (Math.floor(this.angle * 2) % 4 === 0 && player) {
                const hp3 = atk.P3.HOMING;
                const homingBullets = Patterns.homingMissiles(cx, cy - 20, player.x, player.y, {
                    count: hp3.count, speed: hp3.speed, color: '#ff2244', size: 11, homingStrength: hp3.homingStrength, maxSpeed: hp3.maxSpeed
                });
                bullets.push(...homingBullets);
            }

            // Double helix from cannons
            const helixBullets = Patterns.doubleHelix(this.x + 10, cy - 30, this.laserAngle, {
                speed: 190, color1: '#00ff66', color2: '#00ffff', size: 8
            });
            bullets.push(...helixBullets);

            const helixBullets2 = Patterns.doubleHelix(this.x + this.width - 10, cy - 30, this.laserAngle + Math.PI, {
                speed: 190, color1: '#00ffff', color2: '#00ff66', size: 8
            });
            bullets.push(...helixBullets2);
        }

        return bullets;
    }

    attackBCE(player) {
        const bullets = [];
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height;
        const Patterns = window.Game.BulletPatterns;
        const Balance = window.Game.Balance;
        const fireRates = Balance ? Balance.BOSS.FIRE_RATES.BCE : [1.40, 0.70, 0.35];

        if (!Patterns) {
            this.fireTimer = fireRates[this.phase - 1];
            for (let i = -3; i <= 3; i++) {
                bullets.push({
                    x: cx + i * 40, y: cy,
                    vx: 0, vy: 120,
                    color: '#003399', w: 12, h: 12
                });
            }
            return bullets;
        }

        // BCE Signature: Bureaucratic - curtain + rotatingBarrier → spiral + delayedExplosion → rotatingBarrier x2 + star attacks
        const atkBCE = Balance.BOSS.ATTACKS.BCE;
        if (this.phase === 1) {
            // Phase 1: BUREAUCRACY - 3-pattern rotation: curtain, flower, barrier constant (v5.0.4)
            this.fireTimer = fireRates[0];
            this.angle += atkBCE.P1.ROTATION_SPEED;

            // Alternating curtain / flower burst
            if (Math.floor(this.animTime * 0.5) !== Math.floor((this.animTime - fireRates[0]) * 0.5)) {
                const burstCycle = Math.floor(this.animTime * 0.5) % 2;
                if (burstCycle === 0) {
                    const cp = atkBCE.P1.CURTAIN;
                    const wallBullets = Patterns.curtain(cx, cy - 20, cx, {
                        width: 380, count: cp.count, gapSize: cp.gapSize, speed: cp.speed, color: '#003399', size: 12
                    });
                    bullets.push(...wallBullets);
                } else {
                    const fp = atkBCE.P1.FLOWER;
                    const flowerBullets = Patterns.flower(cx, cy - 25, this.animTime, {
                        petals: fp.petals, bulletsPerPetal: fp.bulletsPerPetal, speed: fp.speed, color: '#003399', size: 10
                    });
                    bullets.push(...flowerBullets);
                }
            }

            // Rotating barrier (BCE signature - find the gap!)
            const bp = atkBCE.P1.BARRIER;
            const barrierBullets = Patterns.rotatingBarrier(cx, cy - 40, this.animTime, {
                count: bp.count, radius: bp.radius, speed: bp.speed, color: '#003399', size: 10,
                gapAngle: bp.gapAngle, rotationSpeed: bp.rotationSpeed
            });
            bullets.push(...barrierBullets);

        } else if (this.phase === 2) {
            // Phase 2: NEGATIVE RATES - Spiral + DELAYED EXPLOSION (timed bombs)
            this.fireTimer = fireRates[1];
            this.angle += atkBCE.P2.ROTATION_SPEED;

            // Slow spiral with many arms
            const sp2 = atkBCE.P2.SPIRAL;
            const spiralBullets = Patterns.spiral(cx, cy - 20, this.angle, {
                arms: sp2.arms, speed: sp2.speed, color: '#003399', size: 10
            });
            bullets.push(...spiralBullets);

            // Delayed explosion bombs (BCE signature)
            if (Math.floor(this.animTime * 0.4) !== Math.floor((this.animTime - fireRates[1]) * 0.4)) {
                // Place explosion markers at strategic positions
                const bombPositions = [];
                if (player) {
                    // Bombs around player's predicted position
                    bombPositions.push(
                        { x: player.x - 60, y: player.y - 100 },
                        { x: player.x + 60, y: player.y - 100 },
                        { x: player.x, y: player.y - 150 }
                    );
                } else {
                    bombPositions.push(
                        { x: cx - 80, y: cy + 100 },
                        { x: cx + 80, y: cy + 100 }
                    );
                }
                const explosionBullets = Patterns.delayedExplosion(bombPositions, 0, {
                    bulletsPerExplosion: 6, speed: 120, color: '#ffdd00', size: 8
                });
                bullets.push(...explosionBullets);
            }

            // Stars shoot independently
            if (Math.floor(this.animTime * 0.6) !== Math.floor((this.animTime - fireRates[1]) * 0.6)) {
                for (let i = 0; i < 4; i++) {
                    const star = this.stars[i * 3];
                    const sx = cx + Math.cos(star.angle) * star.dist;
                    const sy = this.y + this.height / 2 + Math.sin(star.angle) * star.dist * 0.6;

                    if (player) {
                        const aimedBullets = Patterns.aimedBurst(sx, sy, player.x, player.y, {
                            count: 2, speed: 150, spread: 0.12, color: '#ffdd00', size: 9
                        });
                        bullets.push(...aimedBullets);
                    }
                }
            }

        } else {
            // Phase 3: FRAGMENTATION - Double rotating barriers + all stars attack independently
            this.fireTimer = fireRates[2];
            this.angle += atkBCE.P3.ROTATION_SPEED;

            // DOUBLE rotating barriers - v4.0.2: gaps aligned PI apart for guaranteed safe corridor
            const b1 = atkBCE.P3.BARRIER1;
            const barrier1GapAngle = this.animTime * b1.rotationSpeed; // Track barrier 1 gap position
            const barrier1 = Patterns.rotatingBarrier(cx, cy - 30, this.animTime, {
                count: b1.count, radius: b1.radius, speed: 70, color: '#003399', size: 9,
                gapAngle: Math.PI / 4, rotationSpeed: b1.rotationSpeed
            });
            bullets.push(...barrier1);

            // v4.0.2: Barrier 2 gap offset by PI from barrier 1 (opposite side = navigable corridor)
            const b2 = atkBCE.P3.BARRIER2;
            const barrier2 = Patterns.rotatingBarrier(cx, cy - 50, this.animTime + Math.PI, {
                count: b2.count || 16, radius: b2.radius || 90, speed: 55, color: '#001a4d', size: 10,
                gapAngle: Math.PI / 4, rotationSpeed: b2.rotationSpeed
            });
            bullets.push(...barrier2);

            // Curtain wall - v4.0.2: gap follows midpoint of barrier safe zones
            if (Math.floor(this.animTime * 0.6) !== Math.floor((this.animTime - fireRates[2]) * 0.6) && player) {
                // Calculate safe corridor from barrier gap positions
                const safeX = cx + Math.cos(barrier1GapAngle) * 75; // Midpoint of barrier gaps
                const gapTarget = Math.max(50, Math.min(this.gameWidth - 50, safeX));
                const wallBullets = Patterns.curtain(cx, cy - 20, gapTarget, {
                    width: 350, count: 12, gapSize: 65, speed: 120, color: '#003399', size: 9
                });
                bullets.push(...wallBullets);
            }

            // ALL 12 stars fire independently (fragmentation attack)
            if (Math.floor(this.animTime * 0.9) !== Math.floor((this.animTime - fireRates[2]) * 0.9)) {
                for (let i = 0; i < 12; i++) {
                    const star = this.stars[i];
                    const sx = cx + Math.cos(star.angle) * (star.dist + 20);
                    const sy = this.y + this.height / 2 + Math.sin(star.angle) * (star.dist + 20) * 0.6;

                    // Each star fires outward
                    const outAngle = star.angle + (Math.random() - 0.5) * 0.3;
                    bullets.push({
                        x: sx, y: sy,
                        vx: Math.cos(outAngle) * 130,
                        vy: Math.sin(outAngle) * 80 + 100,
                        color: '#ffdd00', w: 8, h: 8
                    });
                }
            }

            // Delayed explosions continue
            if (Math.floor(this.animTime * 0.5) !== Math.floor((this.animTime - fireRates[2]) * 0.5) && player) {
                const bombPositions = [
                    { x: player.x - 40, y: player.y - 80 },
                    { x: player.x + 40, y: player.y - 80 }
                ];
                const explosionBullets = Patterns.delayedExplosion(bombPositions, 0, {
                    bulletsPerExplosion: 8, speed: 140, color: '#ffdd00', size: 7
                });
                bullets.push(...explosionBullets);
            }
        }

        return bullets;
    }

    attackBOJ(player) {
        const bullets = [];
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height;
        const Patterns = window.Game.BulletPatterns;
        const Balance = window.Game.Balance;
        const fireRates = Balance ? Balance.BOSS.FIRE_RATES.BOJ : [0.75, 0.45, 0.18];

        if (!Patterns) {
            this.fireTimer = fireRates[this.phase - 1];
            for (let i = -2; i <= 2; i++) {
                const angle = Math.PI / 2 + Math.sin(this.animTime + i) * 0.3;
                bullets.push({
                    x: cx, y: cy,
                    vx: Math.cos(angle) * 150,
                    vy: Math.sin(angle) * 150,
                    color: '#bc002d', w: 10, h: 10
                });
            }
            return bullets;
        }

        // BOJ Signature: Zen precision - sineWave + zenGarden → screenWipe + aimedBurst → zenGarden x4 + rapid screenWipe
        const atkBOJ = Balance.BOSS.ATTACKS.BOJ;
        if (this.phase === 1) {
            // Phase 1: YIELD CURVE - 3-pattern rotation: sineWave, zenGarden, expandingRing (v5.0.4)
            this.fireTimer = fireRates[0];
            this.wavePhase += atkBOJ.P1.WAVE_PHASE_SPEED;
            const bojP1Cycle = Math.floor(this.animTime * 0.25) % 3;

            if (bojP1Cycle === 0) {
                // Precise sine wave
                const sp1 = atkBOJ.P1.SINE;
                const waveBullets = Patterns.sineWave(cx, cy - 20, this.wavePhase, {
                    count: sp1.count, width: sp1.width, amplitude: sp1.amplitude, speed: sp1.speed, color: '#bc002d', size: 10
                });
                bullets.push(...waveBullets);
            } else if (bojP1Cycle === 1) {
                // Zen garden spirals (BOJ signature - hypnotic)
                const zp1 = atkBOJ.P1.ZEN;
                const zenBullets = Patterns.zenGarden(cx, cy - 30, this.wavePhase, {
                    arms: zp1.arms, bulletsPerArm: zp1.bulletsPerArm, speed: zp1.speed, color1: '#bc002d', color2: '#ffffff', size: 9
                });
                bullets.push(...zenBullets);
            } else {
                // Concentric ring (zen ripple)
                const rp1 = atkBOJ.P1.RING;
                const ringBullets = Patterns.expandingRing(cx, cy - 20, this.wavePhase, {
                    count: rp1.count, speed: rp1.speed, color: '#bc002d', size: rp1.size, rotate: false
                });
                bullets.push(...ringBullets);
            }

        } else if (this.phase === 2) {
            // Phase 2: INTERVENTION - SCREEN WIPE + sudden aimedBurst
            this.wavePhase += atkBOJ.P2.WAVE_PHASE_SPEED;
            this.fireTimer = fireRates[1];

            // Screen wipe (BOJ signature - full-screen wall!)
            if (Math.floor(this.animTime * 0.35) !== Math.floor((this.animTime - fireRates[1]) * 0.35)) {
                const wp2 = atkBOJ.P2.WIPE;
                const gapPos = player ? player.x / this.gameWidth : 0.5;
                const wipeBullets = Patterns.screenWipe('horizontal', cy - 40, {
                    count: wp2.count, speed: wp2.speed, color: '#bc002d', size: 10,
                    screenWidth: this.gameWidth, gapPosition: gapPos, gapSize: wp2.gapSize
                });
                bullets.push(...wipeBullets);
            }

            // Sudden intervention bursts
            if (!this.zenMode && Math.floor(this.animTime * 2) % 5 === 0) {
                // INTERVENTION! Fast aimed burst
                if (player) {
                    const bp2 = atkBOJ.P2.BURST;
                    const burstBullets = Patterns.aimedBurst(cx, cy - 20, player.x, player.y, {
                        count: bp2.count, speed: bp2.speed, spread: bp2.spread, color: '#ffffff', size: 11
                    });
                    bullets.push(...burstBullets);
                }
            }

            // Zen garden continues but slower
            if (Math.floor(this.animTime * 0.6) !== Math.floor((this.animTime - fireRates[1]) * 0.6)) {
                const zenBullets = Patterns.zenGarden(cx, cy - 25, this.wavePhase, {
                    arms: 4, bulletsPerArm: 2, speed: 100, color1: '#bc002d', color2: '#ffffff', size: 8
                });
                bullets.push(...zenBullets);
            }

        } else {
            // Phase 3: FULL INTERVENTION - Zen garden x4 + rapid screen wipe + chaos
            this.fireTimer = fireRates[2];
            this.wavePhase += atkBOJ.P3.WAVE_PHASE_SPEED;
            this.angle += atkBOJ.P3.ANGLE_SPEED;

            // QUADRUPLE zen garden (hypnotic chaos!)
            const zp3 = atkBOJ.P3.ZEN;
            const zenBullets = Patterns.zenGarden(cx, cy - 30, this.wavePhase, {
                arms: zp3.arms, bulletsPerArm: zp3.bulletsPerArm, speed: zp3.speed, color1: '#bc002d', color2: '#ffffff', size: 9,
                spiralTightness: zp3.spiralTightness
            });
            bullets.push(...zenBullets);

            // Rapid screen wipes from alternating directions
            if (Math.floor(this.animTime * 0.5) !== Math.floor((this.animTime - fireRates[2]) * 0.5)) {
                const wipeDir = Math.floor(this.animTime * 2) % 2 === 0 ? 'horizontal' : 'vertical';
                const gapPos = player ?
                    (wipeDir === 'horizontal' ? player.x / this.gameWidth : player.y / this.gameHeight) :
                    0.5;

                const wp3 = atkBOJ.P3.WIPE;
                const wipeBullets = Patterns.screenWipe(wipeDir, wipeDir === 'horizontal' ? cy - 50 : cx - 50, {
                    count: wp3.count, speed: wp3.speed, color: '#bc002d', size: 9,
                    screenWidth: this.gameWidth, screenHeight: this.gameHeight,
                    gapPosition: gapPos, gapSize: wp3.gapSize,
                    moveDir: Math.floor(this.animTime) % 2 === 0 ? 1 : -1
                });
                bullets.push(...wipeBullets);
            }

            // Multi-directional waves
            const wv3 = atkBOJ.P3.WAVE;
            const wave1 = Patterns.sineWave(cx - 80, cy - 20, this.wavePhase, {
                count: wv3.count, width: wv3.width, amplitude: wv3.amplitude, speed: wv3.speed, color: '#bc002d', size: 8
            });
            bullets.push(...wave1);

            const wave2 = Patterns.sineWave(cx + 80, cy - 20, this.wavePhase + Math.PI, {
                count: wv3.count, width: wv3.width, amplitude: wv3.amplitude, speed: wv3.speed, color: '#ffffff', size: 8
            });
            bullets.push(...wave2);

            // v4.0.2: Cooldown-based intervention with telegraph (was random 8% per frame)
            const intervention = Balance ? Balance.BOSS.BOJ_INTERVENTION : { TELEGRAPH: 0.4, COOLDOWN: 2.5, COUNT: 5, SPEED: 240, SPREAD: 0.4 };
            if (this.bojTelegraphTarget && this.bojTelegraphTimer <= 0) {
                // Telegraph expired - FIRE!
                const burstBullets = Patterns.aimedBurst(cx, cy, this.bojTelegraphTarget.x, this.bojTelegraphTarget.y, {
                    count: intervention.COUNT, speed: intervention.SPEED, spread: intervention.SPREAD, color: '#ffffff', size: 12
                });
                bullets.push(...burstBullets);
                this.bojInterventionTimer = intervention.COOLDOWN;
                this.bojTelegraphTarget = null;
            } else if (!this.bojTelegraphTarget && this.bojInterventionTimer <= 0 && player) {
                // Start new telegraph phase
                this.bojTelegraphTimer = intervention.TELEGRAPH;
                this.bojTelegraphTarget = { x: player.x, y: player.y };
            }
        }

        return bullets;
    }

    draw(ctx) {
        if (this.bossType === 'BCE') {
            this.drawBCE(ctx);
        } else if (this.bossType === 'BOJ') {
            this.drawBOJ(ctx);
        } else {
            this.drawFED(ctx);
        }
    }

    drawFED(ctx) {
        const x = this.x;
        const y = this.y;
        const w = this.width;  // 160
        const h = this.height; // 140
        const cx = x + w / 2;
        const cy = y + h / 2;

        ctx.save();

        const isHit = this.hitTimer > 0;

        // MEGA-BILL Design - Giant banknote shape
        // Phase colors: Green → Cracked → Burning red
        const baseGreen = this.phase === 3 ? '#003311' : (this.phase === 2 ? '#005522' : '#00ff66');
        const accentColor = this.phase === 3 ? '#ff2244' : (this.phase === 2 ? '#ffaa00' : '#00cc55');

        // Aura (money printing energy)
        const auraPulse = Math.sin(this.animTime * 4) * 0.15 + 0.25;
        ctx.fillStyle = accentColor;
        ctx.globalAlpha = auraPulse * (0.3 + this.phase * 0.15);
        ctx.beginPath();
        ctx.ellipse(cx, cy, w / 2 + 25 + this.phase * 8, h / 2 + 15, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Main bill body (rectangular banknote)
        const billX = x + 5;
        const billY = y + 15;
        const billW = w - 10;
        const billH = h - 30;

        // Bill shadow/3D effect
        ctx.fillStyle = '#002208';
        ctx.beginPath();
        ctx.roundRect(billX + 4, billY + 4, billW, billH, 6);
        ctx.fill();

        // Bill main body
        ctx.fillStyle = isHit ? '#ffffff' : baseGreen;
        ctx.strokeStyle = '#002208';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(billX, billY, billW, billH, 6);
        ctx.fill();
        ctx.stroke();

        // Decorative border pattern (banknote style)
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.roundRect(billX + 8, billY + 8, billW - 16, billH - 16, 4);
        ctx.stroke();
        ctx.setLineDash([]);

        // Corner decorations (ornate bill corners)
        const cornerSize = 15;
        ctx.fillStyle = accentColor;
        ctx.globalAlpha = 0.6;
        // Top-left
        ctx.fillRect(billX + 4, billY + 4, cornerSize, 4);
        ctx.fillRect(billX + 4, billY + 4, 4, cornerSize);
        // Top-right
        ctx.fillRect(billX + billW - cornerSize - 4, billY + 4, cornerSize, 4);
        ctx.fillRect(billX + billW - 8, billY + 4, 4, cornerSize);
        // Bottom-left
        ctx.fillRect(billX + 4, billY + billH - 8, cornerSize, 4);
        ctx.fillRect(billX + 4, billY + billH - cornerSize - 4, 4, cornerSize);
        // Bottom-right
        ctx.fillRect(billX + billW - cornerSize - 4, billY + billH - 8, cornerSize, 4);
        ctx.fillRect(billX + billW - 8, billY + billH - cornerSize - 4, 4, cornerSize);
        ctx.globalAlpha = 1;

        // Central seal (with eyes!)
        const sealRadius = 28;
        const sealY = cy - 5;

        // Seal outer glow
        if (this.eyeGlow > 0 || this.phase === 3) {
            const CU = window.Game.ColorUtils;
            const glowAlpha = this.phase === 3 ? 0.4 + Math.sin(this.animTime * 8) * 0.3 : this.eyeGlow * 0.5;
            ctx.fillStyle = CU.rgba(255, 100, 100, glowAlpha);
            ctx.beginPath();
            ctx.arc(cx, sealY, sealRadius + 12, 0, Math.PI * 2);
            ctx.fill();
        }

        // Seal background
        ctx.fillStyle = '#002208';
        ctx.beginPath();
        ctx.arc(cx, sealY, sealRadius, 0, Math.PI * 2);
        ctx.fill();

        // Seal inner ring
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, sealY, sealRadius - 4, 0, Math.PI * 2);
        ctx.stroke();

        // EYES in the seal (creepy dollar watching you)
        const eyeSpacing = 12;
        const eyeSize = 8 + this.phase;
        const eyeY = sealY - 2;

        // Eye whites
        ctx.fillStyle = this.phase === 3 ? '#ffcccc' : '#fff';
        ctx.beginPath();
        ctx.ellipse(cx - eyeSpacing, eyeY, eyeSize, eyeSize * 0.8, 0, 0, Math.PI * 2);
        ctx.ellipse(cx + eyeSpacing, eyeY, eyeSize, eyeSize * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Pupils (tracking movement in phase 3)
        let pupilOffsetX = 0, pupilOffsetY = 0;
        if (this.phase >= 2) {
            pupilOffsetX = Math.sin(this.animTime * 3) * 2;
            pupilOffsetY = Math.cos(this.animTime * 2) * 1.5;
        }
        if (this.phase === 3) {
            pupilOffsetX = Math.cos(this.animTime * 6) * 3;
            pupilOffsetY = Math.sin(this.animTime * 6) * 2;
        }

        ctx.fillStyle = this.phase === 3 ? '#39ff14' : '#111';
        ctx.beginPath();
        ctx.arc(cx - eyeSpacing + pupilOffsetX, eyeY + pupilOffsetY, eyeSize * 0.5, 0, Math.PI * 2);
        ctx.arc(cx + eyeSpacing + pupilOffsetX, eyeY + pupilOffsetY, eyeSize * 0.5, 0, Math.PI * 2);
        ctx.fill();

        // $ symbol below eyes in seal
        ctx.fillStyle = accentColor;
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', cx, sealY + 14);

        // "FEDERAL RESERVE NOTE" text at top
        ctx.fillStyle = accentColor;
        ctx.font = 'bold 8px Arial';
        ctx.fillText('FEDERAL RESERVE NOTE', cx, billY + 16);

        // Phase 2: OVERPRINTED watermark effect
        if (this.phase >= 2) {
            ctx.globalAlpha = 0.2 + Math.sin(this.animTime * 2) * 0.1;
            ctx.fillStyle = '#ff8800';
            ctx.font = 'bold 12px Arial';
            ctx.save();
            ctx.translate(cx, cy + 20);
            ctx.rotate(-0.15);
            ctx.fillText('OVERPRINTED', 0, 0);
            ctx.restore();
            ctx.globalAlpha = 1;

            // Cracks at edges
            ctx.strokeStyle = '#003300';
            ctx.lineWidth = 1.5;
            ctx.globalAlpha = 0.6;
            // Left crack
            ctx.beginPath();
            ctx.moveTo(billX, billY + 30);
            ctx.lineTo(billX + 15, billY + 45);
            ctx.lineTo(billX + 8, billY + 60);
            ctx.stroke();
            // Right crack
            ctx.beginPath();
            ctx.moveTo(billX + billW, billY + billH - 40);
            ctx.lineTo(billX + billW - 12, billY + billH - 55);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }

        // Phase 3: Burning edges effect
        if (this.phase === 3) {
            // Flame particles at edges
            for (let i = 0; i < 6; i++) {
                const flameT = (this.animTime * 3 + i * 0.5) % 1;
                const flameX = billX + Math.random() * billW;
                const flameY = billY + billH - 5 - flameT * 15;
                const flameSize = 4 + Math.random() * 4;

                ctx.fillStyle = window.Game.ColorUtils.rgba(255, 100 + Math.floor(Math.random() * 100), 0, 0.7 - flameT * 0.5);
                ctx.beginPath();
                ctx.arc(flameX, flameY, flameSize, 0, Math.PI * 2);
                ctx.fill();
            }

            // Red inflation tint
            ctx.fillStyle = 'rgba(255, 0, 0, 0.15)';
            ctx.beginPath();
            ctx.roundRect(billX, billY, billW, billH, 6);
            ctx.fill();

            // Sparks
            ctx.strokeStyle = '#39ff14';
            ctx.lineWidth = 2;
            for (let i = 0; i < 3; i++) {
                const sparkAngle = this.animTime * 10 + i * Math.PI * 2 / 3;
                const sparkDist = 75 + Math.sin(this.animTime * 15 + i) * 10;
                const sparkX = cx + Math.cos(sparkAngle) * sparkDist;
                const sparkY = cy + Math.sin(sparkAngle) * sparkDist * 0.5;
                ctx.globalAlpha = 0.5 + Math.sin(this.animTime * 20 + i * 2) * 0.4;
                ctx.beginPath();
                ctx.moveTo(sparkX - 3, sparkY - 5);
                ctx.lineTo(sparkX + 1, sparkY);
                ctx.lineTo(sparkX - 1, sparkY + 2);
                ctx.lineTo(sparkX + 3, sparkY + 5);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
        }

        // Side cannons (Phase 2+)
        if (this.phase >= 2) {
            ctx.fillStyle = '#003311';
            ctx.strokeStyle = '#002208';
            ctx.lineWidth = 2;
            // Left cannon
            ctx.beginPath();
            ctx.roundRect(x - 8, cy - 15, 15, 30, 3);
            ctx.fill();
            ctx.stroke();
            // Right cannon
            ctx.beginPath();
            ctx.roundRect(x + w - 7, cy - 15, 15, 30, 3);
            ctx.fill();
            ctx.stroke();
            // Cannon glow
            ctx.fillStyle = accentColor;
            ctx.globalAlpha = 0.5 + Math.sin(this.animTime * 6) * 0.3;
            ctx.beginPath();
            ctx.arc(x - 1, cy + 10, 4, 0, Math.PI * 2);
            ctx.arc(x + w + 1, cy + 10, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        this.drawHPBar(ctx, x, y, w, 'THE FED');
        ctx.restore();
    }

    drawBCE(ctx) {
        const x = this.x;
        const y = this.y;
        const w = this.width;  // 160
        const h = this.height; // 140
        const cx = x + w / 2;
        const cy = y + h / 2;

        ctx.save();

        const isHit = this.hitTimer > 0;

        // MEGA-COIN Design - Giant Euro coin
        const baseBlue = this.phase === 3 ? '#001133' : (this.phase === 2 ? '#001a4d' : '#003399');
        const goldColor = '#ffdd00';
        const coinRadius = 60;

        // Phase 3: Fragmented - stars orbit erratically
        const starSpeedMult = this.phase === 3 ? 2.5 : (this.phase === 2 ? 1.5 : 1);

        // EU Stars orbiting (12 stars for EU flag)
        for (let i = 0; i < 12; i++) {
            const star = this.stars[i];
            let starDist = star.dist;
            let starAlpha = 0.9;

            // Phase 3: Stars detach and move outward
            if (this.phase === 3) {
                starDist = star.dist + 20 + Math.sin(this.animTime * 4 + i) * 15;
                starAlpha = 0.6 + Math.sin(this.animTime * 6 + i * 0.5) * 0.3;
            }

            const starX = cx + Math.cos(star.angle) * starDist;
            const starY = cy + Math.sin(star.angle) * starDist * 0.6;

            ctx.globalAlpha = starAlpha;
            ctx.fillStyle = goldColor;
            ctx.beginPath();
            this.drawStar(ctx, starX, starY, 5, 10, 5);
            ctx.fill();

            // Phase 2+: Stars pulse
            if (this.phase >= 2) {
                const pulseSize = 3 + Math.sin(this.animTime * 5 + i) * 2;
                ctx.globalAlpha = 0.3;
                ctx.beginPath();
                this.drawStar(ctx, starX, starY, 5, 10 + pulseSize, 5 + pulseSize / 2);
                ctx.fill();
            }
        }
        ctx.globalAlpha = 1;

        // Coin aura
        const auraPulse = Math.sin(this.animTime * 3) * 0.1 + 0.2;
        ctx.fillStyle = baseBlue;
        ctx.globalAlpha = auraPulse * (0.3 + this.phase * 0.15);
        ctx.beginPath();
        ctx.arc(cx, cy, coinRadius + 20 + this.phase * 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // 3D coin edge (shows thickness)
        const tiltAngle = this.phase >= 2 ? Math.sin(this.animTime * 1.5) * 0.15 : 0;
        const edgeWidth = 12 + (this.phase >= 2 ? Math.abs(Math.sin(this.animTime * 2)) * 8 : 0);

        // Coin edge (3D effect)
        ctx.fillStyle = '#997700';
        ctx.beginPath();
        ctx.ellipse(cx, cy + 8, coinRadius, coinRadius * 0.3, tiltAngle, 0, Math.PI * 2);
        ctx.fill();

        // Coin face - outer ring (gold/silver bi-metal style)
        ctx.fillStyle = isHit ? '#ffffff' : goldColor;
        ctx.strokeStyle = '#997700';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(cx, cy, coinRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Inner blue circle (EU blue)
        ctx.fillStyle = isHit ? '#ffffff' : baseBlue;
        ctx.beginPath();
        ctx.arc(cx, cy, coinRadius - 15, 0, Math.PI * 2);
        ctx.fill();

        // Decorative ridges around edge
        ctx.strokeStyle = '#cc9900';
        ctx.lineWidth = 1;
        for (let i = 0; i < 36; i++) {
            const angle = (i / 36) * Math.PI * 2;
            const innerR = coinRadius - 3;
            const outerR = coinRadius + 1;
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR);
            ctx.lineTo(cx + Math.cos(angle) * outerR, cy + Math.sin(angle) * outerR);
            ctx.stroke();
        }

        // Inner star circle pattern (6 mini stars)
        ctx.fillStyle = goldColor;
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
            const sx = cx + Math.cos(angle) * 28;
            const sy = cy + Math.sin(angle) * 28;
            ctx.globalAlpha = 0.7;
            ctx.beginPath();
            this.drawStar(ctx, sx, sy, 5, 6, 3);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Big Euro symbol in center
        ctx.fillStyle = goldColor;
        if (this.phase === 3) {
            // v4.11: Glow circle instead of GPU-expensive shadowBlur
            const glowR = 30 + Math.sin(this.animTime * 8) * 8;
            ctx.globalAlpha = 0.4;
            ctx.beginPath();
            ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
        ctx.font = 'bold 42px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('€', cx, cy);

        // "1 EURO" text
        ctx.fillStyle = goldColor;
        ctx.font = 'bold 10px Arial';
        ctx.fillText('1 EURO', cx, cy + coinRadius - 25);

        // Phase 2: Coin tilts showing thickness
        if (this.phase >= 2) {
            // Show coin edge more prominently
            ctx.strokeStyle = '#775500';
            ctx.lineWidth = 3;
            const edgeY = cy + coinRadius * 0.9;
            ctx.globalAlpha = 0.5;
            ctx.beginPath();
            ctx.ellipse(cx, edgeY, coinRadius * 0.8, 8, 0, 0, Math.PI);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }

        // Phase 3: Fragmentation cracks
        if (this.phase === 3) {
            ctx.strokeStyle = '#ff2244';
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.5 + Math.sin(this.animTime * 10) * 0.3;

            // Cracks radiating from center
            for (let i = 0; i < 4; i++) {
                const crackAngle = (i / 4) * Math.PI * 2 + this.animTime * 0.3;
                ctx.beginPath();
                ctx.moveTo(cx + Math.cos(crackAngle) * 15, cy + Math.sin(crackAngle) * 15);
                ctx.lineTo(cx + Math.cos(crackAngle) * 35, cy + Math.sin(crackAngle) * 35);
                ctx.lineTo(cx + Math.cos(crackAngle + 0.2) * 50, cy + Math.sin(crackAngle + 0.2) * 50);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;

            // Chip particles breaking off
            for (let i = 0; i < 3; i++) {
                const chipAngle = this.animTime * 2 + i * Math.PI * 2 / 3;
                const chipDist = coinRadius + 15 + Math.sin(this.animTime * 5 + i) * 10;
                const chipX = cx + Math.cos(chipAngle) * chipDist;
                const chipY = cy + Math.sin(chipAngle) * chipDist * 0.7;
                ctx.fillStyle = goldColor;
                ctx.globalAlpha = 0.6;
                ctx.beginPath();
                ctx.arc(chipX, chipY, 4 + Math.random() * 2, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        }

        this.drawHPBar(ctx, x, y, w, 'BCE');
        ctx.restore();
    }

    drawBOJ(ctx) {
        const x = this.x;
        const y = this.y;
        const w = this.width;  // 160
        const h = this.height; // 140
        const cx = x + w / 2;
        const cy = y + h / 2;

        ctx.save();

        const isHit = this.hitTimer > 0;

        // MEGA-BAR Design - Giant gold ingot with rising sun
        const baseRed = this.phase === 3 ? '#6b0019' : (this.phase === 2 ? '#8b0023' : '#bc002d');
        const goldColor = '#FFD700';
        const goldDark = '#B8860B';
        const goldLight = '#FFEC8B';

        // Rising sun rays (aura)
        const rayCount = 16;
        const rayAlpha = this.phase === 3 ? 0.5 : (this.phase === 2 ? 0.4 : 0.3);
        const raySpeed = this.phase === 3 ? 0.5 : 0.2;
        const rayLength = 100 + this.phase * 15;

        ctx.globalAlpha = rayAlpha;
        for (let i = 0; i < rayCount; i++) {
            const angle = (i / rayCount) * Math.PI * 2 + this.animTime * raySpeed;
            ctx.fillStyle = i % 2 === 0 ? baseRed : '#ffffff';
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(
                cx + Math.cos(angle) * rayLength,
                cy + Math.sin(angle) * rayLength * 0.5
            );
            ctx.lineTo(
                cx + Math.cos(angle + Math.PI / rayCount) * rayLength,
                cy + Math.sin(angle + Math.PI / rayCount) * rayLength * 0.5
            );
            ctx.closePath();
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Gold aura
        const auraPulse = Math.sin(this.animTime * 2) * 0.1 + 0.2;
        ctx.fillStyle = goldColor;
        ctx.globalAlpha = auraPulse * (0.2 + this.phase * 0.1);
        ctx.beginPath();
        ctx.ellipse(cx, cy, w / 2 + 25, h / 3 + 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Gold ingot shape (3D trapezoid)
        const barW = 140;
        const barH = 80;
        const barTopW = 100;
        const barX = cx - barW / 2;
        const barY = cy - barH / 2 + 10;

        // Bottom face (shadow)
        ctx.fillStyle = '#8B7500';
        ctx.beginPath();
        ctx.moveTo(barX, barY + barH);
        ctx.lineTo(barX + barW, barY + barH);
        ctx.lineTo(barX + barW - 10, barY + barH + 8);
        ctx.lineTo(barX + 10, barY + barH + 8);
        ctx.closePath();
        ctx.fill();

        // Right face (3D)
        ctx.fillStyle = goldDark;
        ctx.beginPath();
        ctx.moveTo(barX + barW, barY + 10);
        ctx.lineTo(barX + barW, barY + barH);
        ctx.lineTo(barX + barW - 10, barY + barH + 8);
        ctx.lineTo(barX + (barW + barTopW) / 2, barY);
        ctx.closePath();
        ctx.fill();

        // Top face (main gold surface)
        const gradient = ctx.createLinearGradient(barX, barY, barX + barW, barY + barH);
        gradient.addColorStop(0, goldLight);
        gradient.addColorStop(0.3, goldColor);
        gradient.addColorStop(0.7, goldColor);
        gradient.addColorStop(1, goldDark);

        ctx.fillStyle = isHit ? '#ffffff' : gradient;
        ctx.strokeStyle = goldDark;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(barX + (barW - barTopW) / 2, barY);
        ctx.lineTo(barX + (barW + barTopW) / 2, barY);
        ctx.lineTo(barX + barW, barY + barH);
        ctx.lineTo(barX, barY + barH);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Stamped text "GOLD" effect
        ctx.fillStyle = goldDark;
        ctx.globalAlpha = 0.4;
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('FINE GOLD', cx, barY + 20);
        ctx.fillText('999.9', cx, barY + barH - 12);
        ctx.globalAlpha = 1;

        // Engraved ¥ symbol in center
        ctx.fillStyle = goldDark;
        ctx.strokeStyle = goldLight;
        ctx.lineWidth = 2;
        if (this.phase === 3) {
            // v4.11: Glow circle instead of GPU-expensive shadowBlur
            const glowR = 30 + Math.sin(this.animTime * 8) * 8;
            ctx.fillStyle = '#ffffff';
            ctx.globalAlpha = 0.35;
            ctx.beginPath();
            ctx.arc(cx, cy + 10, glowR, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.fillStyle = goldDark;
        }
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // Shadow effect for engraving
        ctx.fillText('¥', cx + 2, cy + 12);
        ctx.fillStyle = goldLight;
        ctx.fillText('¥', cx, cy + 10);

        // Reflective shine effect (moving highlight)
        ctx.globalAlpha = 0.3 + Math.sin(this.animTime * 2) * 0.15;
        ctx.fillStyle = '#ffffff';
        const shineX = barX + 20 + ((this.animTime * 30) % (barW - 40));
        ctx.beginPath();
        ctx.ellipse(shineX, barY + barH / 3, 15, 8, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Phase 2: Yield curve overlay
        if (this.phase >= 2) {
            ctx.strokeStyle = baseRed;
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.6 + Math.sin(this.animTime * 4) * 0.3;

            // Yield curve line
            ctx.beginPath();
            ctx.moveTo(barX + 15, barY + barH - 20);
            for (let i = 0; i <= 10; i++) {
                const t = i / 10;
                const curveX = barX + 15 + t * (barW - 30);
                // Flat/inverted yield curve shape
                const curveY = barY + barH - 20 - Math.sin(t * Math.PI) * 15 - t * 5;
                ctx.lineTo(curveX, curveY);
            }
            ctx.stroke();
            ctx.globalAlpha = 1;

            // "INTERVENTION" flash text
            if (this.interventionCooldown > 0 || Math.floor(this.animTime * 3) % 5 === 0) {
                ctx.fillStyle = '#ff0';
                ctx.globalAlpha = 0.5 + Math.sin(this.animTime * 15) * 0.5;
                ctx.font = 'bold 11px Arial';
                ctx.fillText('INTERVENTION!', cx, barY - 15);
                ctx.globalAlpha = 1;
            }
        }

        // Phase 3: Incandescent bar with laser rays
        if (this.phase === 3) {
            // Incandescent glow
            ctx.fillStyle = 'rgba(255, 200, 100, 0.3)';
            ctx.beginPath();
            ctx.moveTo(barX + (barW - barTopW) / 2 - 5, barY - 5);
            ctx.lineTo(barX + (barW + barTopW) / 2 + 5, barY - 5);
            ctx.lineTo(barX + barW + 5, barY + barH + 5);
            ctx.lineTo(barX - 5, barY + barH + 5);
            ctx.closePath();
            ctx.fill();

            // Rising sun rays become dangerous lasers (visual hint)
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            for (let i = 0; i < 8; i++) {
                const laserAngle = (i / 8) * Math.PI * 2 + this.animTime * 0.8;
                const laserAlpha = 0.3 + Math.sin(this.animTime * 12 + i * 1.5) * 0.3;
                ctx.globalAlpha = laserAlpha;
                ctx.beginPath();
                ctx.moveTo(cx + Math.cos(laserAngle) * 50, cy + Math.sin(laserAngle) * 25);
                ctx.lineTo(cx + Math.cos(laserAngle) * 110, cy + Math.sin(laserAngle) * 55);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;

            // Heat waves
            for (let i = 0; i < 4; i++) {
                const waveY = barY - 10 - i * 8 - (this.animTime * 20) % 15;
                ctx.strokeStyle = window.Game.ColorUtils.rgba(255, 200, 100, 0.3 - i * 0.07);
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(barX + 20, waveY);
                ctx.bezierCurveTo(
                    barX + 50, waveY - 5,
                    barX + barW - 50, waveY + 5,
                    barX + barW - 20, waveY
                );
                ctx.stroke();
            }
        }

        // v4.0.2: Telegraph warning lines for intervention burst
        if (this.bojTelegraphTarget && this.bojTelegraphTimer > 0) {
            const tProg = 1 - (this.bojTelegraphTimer / 0.4); // 0→1 as telegraph completes
            const flashAlpha = 0.3 + tProg * 0.5 + Math.sin(this.animTime * 30) * 0.15;
            ctx.save();
            ctx.globalAlpha = flashAlpha;
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 2 + tProg * 2;
            ctx.setLineDash([8, 6]);
            // Draw warning line from boss center to target
            const bx = cx;
            const by = y + h;
            ctx.beginPath();
            ctx.moveTo(bx, by);
            ctx.lineTo(this.bojTelegraphTarget.x, this.bojTelegraphTarget.y);
            ctx.stroke();
            // Draw target crosshair
            const tx = this.bojTelegraphTarget.x;
            const ty = this.bojTelegraphTarget.y;
            const cr = 15 + tProg * 10;
            ctx.beginPath();
            ctx.arc(tx, ty, cr, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(tx - cr, ty);
            ctx.lineTo(tx + cr, ty);
            ctx.moveTo(tx, ty - cr);
            ctx.lineTo(tx, ty + cr);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        }

        this.drawHPBar(ctx, x, y, w, 'BOJ');
        ctx.restore();
    }

    drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
        let rot = Math.PI / 2 * 3;
        let x = cx;
        let y = cy;
        const step = Math.PI / spikes;

        ctx.moveTo(cx, cy - outerRadius);
        for (let i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outerRadius;
            y = cy + Math.sin(rot) * outerRadius;
            ctx.lineTo(x, y);
            rot += step;

            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            ctx.lineTo(x, y);
            rot += step;
        }
        ctx.lineTo(cx, cy - outerRadius);
    }

    drawHPBar(ctx, x, y, w, name) {
        const hpPct = Math.max(0, this.hp / this.maxHp);
        const barW = w + 40;
        const barH = 12;
        const barX = x - 20;
        const barY = y - 30;

        // Bar background
        ctx.fillStyle = '#330000';
        ctx.fillRect(barX, barY, barW, barH);

        // HP fill with phase colors
        const hpColor = this.phase === 3 ? '#ff0000' : (this.phase === 2 ? '#ffaa00' : this.accentColor || '#00ff66');
        ctx.fillStyle = hpColor;
        ctx.fillRect(barX, barY, barW * hpPct, barH);

        // Bar border
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(barX, barY, barW, barH);

        // Phase indicator
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        const cx = x + w / 2;
        ctx.fillText(`PHASE ${this.phase}`, cx, barY - 8);

        // Boss name
        ctx.font = 'bold 16px Arial';
        ctx.fillText(name, cx, barY - 22);
    }

}

window.Game.Boss = Boss;
