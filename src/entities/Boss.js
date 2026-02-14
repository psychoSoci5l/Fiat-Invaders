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

    // v5.7: FED — The Corrupted Printer (massive All-Seeing Eye with money aura)
    drawFED(ctx) {
        const CU = window.Game.ColorUtils;
        const x = this.x, y = this.y, w = this.width, h = this.height;
        const cx = x + w / 2, cy = y + h / 2;
        const t = this.animTime;
        const isHit = this.hitTimer > 0;
        const p = this.phase;

        ctx.save();

        // Phase accent RGB: P1 neon green, P2 warning orange, P3 corruption red
        const acR = p === 3 ? 255 : (p === 2 ? 255 : 57);
        const acG = p === 3 ? 34 : (p === 2 ? 170 : 255);
        const acB = p === 3 ? 68 : (p === 2 ? 0 : 20);

        // === FLOATING $ ORBIT (background layer) ===
        ctx.globalCompositeOperation = 'lighter';
        ctx.font = CU.font('bold', 14, 'monospace');
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (let i = 0; i < 8; i++) {
            const orbA = t * (0.4 + i * 0.08) + i * Math.PI / 4;
            const orbR = 70 + Math.sin(t * 2 + i) * 10;
            const orbX = cx + Math.cos(orbA) * orbR;
            const orbY = cy + Math.sin(orbA) * orbR * 0.55;
            const orbAlpha = 0.12 + Math.sin(t * 3 + i * 1.5) * 0.06;
            ctx.fillStyle = CU.rgba(acR, acG, acB, orbAlpha);
            ctx.fillText('$', orbX, orbY);
        }
        ctx.globalCompositeOperation = 'source-over';

        // === OUTER AURA (layered radial glow) ===
        ctx.globalCompositeOperation = 'lighter';
        const auraPulse = 0.15 + Math.sin(t * 2.5) * 0.08 + p * 0.05;
        const aR = 85 + p * 10;
        const aGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, aR);
        aGrad.addColorStop(0, CU.rgba(acR, acG, acB, auraPulse * 0.6));
        aGrad.addColorStop(0.4, CU.rgba(acR, acG, acB, auraPulse * 0.25));
        aGrad.addColorStop(0.7, CU.rgba(acR, acG, acB, auraPulse * 0.08));
        aGrad.addColorStop(1, CU.rgba(acR, acG, acB, 0));
        ctx.fillStyle = aGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, aR, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';

        // === PYRAMID BODY (filled, gradient) ===
        const pyrH = 90, pyrW = 110;
        const pyrTop = cy - pyrH * 0.45;
        const pyrBot = cy + pyrH * 0.55;
        const pyrFlicker = p === 3 ? (Math.sin(t * 12) > -0.3 ? 1 : 0.3) : 1;

        // Pyramid fill — dark gradient with accent edge
        const pyrGrad = ctx.createLinearGradient(cx, pyrTop, cx, pyrBot);
        pyrGrad.addColorStop(0, isHit ? '#fff' : CU.rgba(0, 30 + p * 5, 10, 0.9 * pyrFlicker));
        pyrGrad.addColorStop(0.5, isHit ? '#fff' : CU.rgba(0, 15, 5, 0.8 * pyrFlicker));
        pyrGrad.addColorStop(1, isHit ? '#fff' : CU.rgba(0, 8, 2, 0.7 * pyrFlicker));
        ctx.fillStyle = pyrGrad;
        ctx.beginPath();
        ctx.moveTo(cx, pyrTop);
        ctx.lineTo(cx + pyrW / 2, pyrBot);
        ctx.lineTo(cx - pyrW / 2, pyrBot);
        ctx.closePath();
        ctx.fill();

        // Pyramid neon edge
        ctx.strokeStyle = CU.rgba(acR, acG, acB, 0.7 * pyrFlicker);
        ctx.lineWidth = 2;
        ctx.stroke();

        // Pyramid edge glow (additive)
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = CU.rgba(acR, acG, acB, 0.2 * pyrFlicker);
        ctx.lineWidth = 6;
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';

        // Inner tier line (pyramid segment)
        const tierY = pyrTop + pyrH * 0.35;
        const tierHalf = pyrW * 0.32;
        ctx.strokeStyle = CU.rgba(acR, acG, acB, 0.35);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx - tierHalf, tierY);
        ctx.lineTo(cx + tierHalf, tierY);
        ctx.stroke();

        // === SCAN LINES inside pyramid ===
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(cx, pyrTop + 3);
        ctx.lineTo(cx + pyrW / 2 - 3, pyrBot - 2);
        ctx.lineTo(cx - pyrW / 2 + 3, pyrBot - 2);
        ctx.closePath();
        ctx.clip();
        ctx.globalAlpha = p === 3 ? 0.12 : 0.06;
        ctx.fillStyle = CU.rgba(acR, acG, acB, 1);
        for (let sy = pyrTop; sy < pyrBot; sy += 4) {
            ctx.fillRect(cx - pyrW / 2, sy, pyrW, 1);
        }
        ctx.globalAlpha = 1;

        // Scrolling $ watermark inside pyramid
        ctx.globalAlpha = 0.05 + (p >= 2 ? 0.04 : 0);
        ctx.fillStyle = CU.rgba(acR, acG, acB, 1);
        ctx.font = CU.font('bold', 12, 'monospace');
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const scrollOff = (t * 25) % 24;
        for (let row = -1; row < pyrH / 18 + 1; row++) {
            for (let col = -2; col <= 2; col++) {
                ctx.fillText('$', cx + col * 22, pyrTop + 15 + row * 18 + scrollOff);
            }
        }
        ctx.globalAlpha = 1;
        ctx.restore();

        // === ALL-SEEING EYE (large, central) ===
        const eyeY = cy - 2;
        const eyeW = 28, eyeH = 16;

        // Eye glow halo (additive)
        ctx.globalCompositeOperation = 'lighter';
        const egR = 30 + Math.sin(t * 4) * 5 + this.eyeGlow * 15;
        const egGrad = ctx.createRadialGradient(cx, eyeY, 0, cx, eyeY, egR);
        egGrad.addColorStop(0, CU.rgba(acR, acG, acB, 0.5 + this.eyeGlow * 0.3));
        egGrad.addColorStop(0.5, CU.rgba(acR, acG, acB, 0.15));
        egGrad.addColorStop(1, CU.rgba(acR, acG, acB, 0));
        ctx.fillStyle = egGrad;
        ctx.beginPath();
        ctx.arc(cx, eyeY, egR, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';

        // Eye white (almond shape)
        ctx.fillStyle = p === 3 ? CU.rgba(57, 255, 20, 0.9) : CU.rgba(255, 255, 255, 0.95);
        ctx.beginPath();
        ctx.ellipse(cx, eyeY, eyeW, eyeH, 0, 0, Math.PI * 2);
        ctx.fill();

        // Eye iris ring
        ctx.strokeStyle = CU.rgba(acR, acG, acB, 0.6);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, eyeY, 10, 0, Math.PI * 2);
        ctx.stroke();

        // Eye iris fill
        const irisGrad = ctx.createRadialGradient(cx, eyeY, 2, cx, eyeY, 10);
        irisGrad.addColorStop(0, p === 3 ? '#39ff14' : CU.rgba(acR, acG, acB, 0.8));
        irisGrad.addColorStop(1, p === 3 ? '#1a8a0a' : CU.rgba(acR * 0.3, acG * 0.3, acB * 0.3, 0.6));
        ctx.fillStyle = irisGrad;
        ctx.beginPath();
        ctx.arc(cx, eyeY, 10, 0, Math.PI * 2);
        ctx.fill();

        // Pupil — tracks via animation
        let pupOX = 0, pupOY = 0;
        if (p >= 2) { pupOX = Math.sin(t * 3) * 4; pupOY = Math.cos(t * 2) * 2.5; }
        if (p === 3) { pupOX = Math.cos(t * 6) * 6; pupOY = Math.sin(t * 5) * 3.5; }
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(cx + pupOX, eyeY + pupOY, 4.5, 0, Math.PI * 2);
        ctx.fill();
        // Pupil highlight
        ctx.fillStyle = CU.rgba(255, 255, 255, 0.6);
        ctx.beginPath();
        ctx.arc(cx + pupOX - 1.5, eyeY + pupOY - 1.5, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // P3: pupil afterimage trail
        if (p === 3) {
            for (let i = 1; i <= 4; i++) {
                const tOX = Math.cos((t - i * 0.04) * 6) * 6;
                const tOY = Math.sin((t - i * 0.04) * 5) * 3.5;
                ctx.fillStyle = CU.rgba(57, 255, 20, 0.2 - i * 0.04);
                ctx.beginPath();
                ctx.arc(cx + tOX, eyeY + tOY, 4.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Eye outline (neon almond)
        ctx.strokeStyle = CU.rgba(acR, acG, acB, 0.8);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(cx, eyeY, eyeW, eyeH, 0, 0, Math.PI * 2);
        ctx.stroke();
        // Eye outline glow
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = CU.rgba(acR, acG, acB, 0.2);
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.ellipse(cx, eyeY, eyeW + 2, eyeH + 2, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';

        // === $ BELOW EYE ===
        ctx.fillStyle = CU.rgba(acR, acG, acB, 0.6);
        ctx.font = CU.font('bold', 18, 'monospace');
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', cx, eyeY + 30);

        // === "FEDERAL RESERVE" text (bottom of pyramid) ===
        ctx.fillStyle = CU.rgba(acR, acG, acB, 0.4);
        ctx.font = CU.font('bold', 9, 'monospace');
        ctx.fillText('FEDERAL RESERVE', cx, pyrBot - 8);

        // === GLITCH ARTIFACTS (P2+) ===
        if (p >= 2) {
            const glitchN = p === 3 ? 5 : 2;
            for (let i = 0; i < glitchN; i++) {
                const gy = pyrTop + 10 + ((t * 55 + i * 31) % (pyrH - 20));
                const gw = 20 + Math.sin(t * 9 + i * 2) * 12;
                const gx = cx + Math.sin(t * 7 + i * 2.3) * 20;
                ctx.fillStyle = CU.rgba(acR, acG, acB, 0.2);
                ctx.fillRect(gx - gw / 2, gy, gw, 2);
            }
        }

        // === P3: MATRIX RAIN $ (falling outside pyramid) ===
        if (p === 3) {
            ctx.globalAlpha = 0.35;
            ctx.fillStyle = '#39ff14';
            ctx.font = CU.font('bold', 11, 'monospace');
            for (let i = 0; i < 10; i++) {
                const rainX = cx - 65 + (i * 13);
                const rainY = pyrTop + ((t * 90 + i * 19) % (pyrH + 30)) - 15;
                ctx.fillText('$', rainX, rainY);
            }
            ctx.globalAlpha = 1;

            // Red corruption tint on pyramid
            ctx.fillStyle = CU.rgba(255, 0, 0, 0.07 + Math.sin(t * 6) * 0.04);
            ctx.beginPath();
            ctx.moveTo(cx, pyrTop);
            ctx.lineTo(cx + pyrW / 2, pyrBot);
            ctx.lineTo(cx - pyrW / 2, pyrBot);
            ctx.closePath();
            ctx.fill();
        }

        // === SIDE EMITTERS (P2+) ===
        if (p >= 2) {
            const emY = cy + 15;
            // Left
            ctx.fillStyle = CU.rgba(0, 15, 5, 0.85);
            ctx.beginPath();
            ctx.roundRect(x - 4, emY - 12, 10, 24, 2);
            ctx.fill();
            ctx.strokeStyle = CU.rgba(acR, acG, acB, 0.5);
            ctx.lineWidth = 1;
            ctx.stroke();
            // Right
            ctx.beginPath();
            ctx.roundRect(x + w - 6, emY - 12, 10, 24, 2);
            ctx.fill();
            ctx.stroke();
            // Emitter glow
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = CU.rgba(acR, acG, acB, 0.4 + Math.sin(t * 8) * 0.3);
            ctx.beginPath();
            ctx.arc(x + 1, emY + 4, 4, 0, Math.PI * 2);
            ctx.arc(x + w + 1, emY + 4, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
        }

        this.drawHPBar(ctx, x, y, w, 'THE FED');
        ctx.restore();
    }

    // v5.7: BCE — The Star Fortress (holographic EU star fortress)
    drawBCE(ctx) {
        const CU = window.Game.ColorUtils;
        const x = this.x, y = this.y, w = this.width, h = this.height;
        const cx = x + w / 2, cy = y + h / 2;
        const t = this.animTime;
        const isHit = this.hitTimer > 0;
        const p = this.phase;

        ctx.save();

        // EU blue RGB by phase
        const blR = 0, blG = p === 3 ? 17 : (p === 2 ? 26 : 51), blB = p === 3 ? 51 : (p === 2 ? 77 : 153);
        const gdR = 255, gdG = 221, gdB = 0; // gold
        const coreR = 55; // core radius

        // === OUTER AURA (additive) ===
        ctx.globalCompositeOperation = 'lighter';
        const auraSize = coreR + 25 + p * 8;
        const auraPulse = 0.1 + Math.sin(t * 2.5) * 0.06;
        const aGrad = ctx.createRadialGradient(cx, cy, coreR * 0.4, cx, cy, auraSize);
        aGrad.addColorStop(0, CU.rgba(blR, blG, blB, auraPulse));
        aGrad.addColorStop(0.5, CU.rgba(gdR, gdG, gdB, auraPulse * 0.3));
        aGrad.addColorStop(1, CU.rgba(gdR, gdG, gdB, 0));
        ctx.fillStyle = aGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, auraSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';

        // === ENERGY CONNECTIONS (nodes → center & node-to-node) ===
        for (let i = 0; i < 12; i++) {
            const star = this.stars[i];
            let dist = star.dist;
            if (p === 3) dist = star.dist + 20 + Math.sin(t * 4 + i) * 15;

            const nx = cx + Math.cos(star.angle) * dist;
            const ny = cy + Math.sin(star.angle) * dist * 0.6;

            // Line to center
            if (p < 3 || Math.sin(t * 3 + i) > -0.5) {
                ctx.strokeStyle = CU.rgba(gdR, gdG, gdB, p === 3 ? 0.1 : 0.2);
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.lineTo(nx, ny);
                ctx.stroke();
            }

            // Node-to-node ring (P1-P2 only)
            if (p < 3) {
                const next = this.stars[(i + 1) % 12];
                const nnx = cx + Math.cos(next.angle) * next.dist;
                const nny = cy + Math.sin(next.angle) * next.dist * 0.6;
                ctx.strokeStyle = CU.rgba(gdR, gdG, gdB, 0.12);
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.moveTo(nx, ny);
                ctx.lineTo(nnx, nny);
                ctx.stroke();
            }
        }

        // === SEGMENTED GOLDEN RING ===
        const segments = 12;
        const segGap = 0.06;
        for (let i = 0; i < segments; i++) {
            const segStart = (i / segments) * Math.PI * 2 + t * 0.2;
            const segEnd = segStart + (Math.PI * 2 / segments) - segGap;
            if (p === 3 && (i % 3 === Math.floor(t) % 3)) continue; // missing segments

            ctx.strokeStyle = isHit ? '#fff' : CU.rgba(gdR, gdG, gdB, 0.7);
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(cx, cy, coreR, segStart, segEnd);
            ctx.stroke();

            // Glow
            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = CU.rgba(gdR, gdG, gdB, 0.15);
            ctx.lineWidth = 8;
            ctx.beginPath();
            ctx.arc(cx, cy, coreR, segStart, segEnd);
            ctx.stroke();
            ctx.globalCompositeOperation = 'source-over';
        }

        // === INNER CORE (EU blue) ===
        const cGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR - 10);
        cGrad.addColorStop(0, isHit ? '#fff' : CU.rgba(blR, blG + 30, blB + 50, 0.9));
        cGrad.addColorStop(1, isHit ? '#fff' : CU.rgba(blR, blG, blB, 0.7));
        ctx.fillStyle = cGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, coreR - 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = CU.rgba(gdR, gdG, gdB, 0.3);
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // === ENERGY NODES (12 stars) ===
        for (let i = 0; i < 12; i++) {
            const star = this.stars[i];
            let dist = star.dist;
            let nAlpha = 0.9;
            if (p === 3) {
                dist = star.dist + 20 + Math.sin(t * 4 + i) * 15;
                nAlpha = 0.5 + Math.sin(t * 6 + i * 0.5) * 0.3;
            }

            const nx = cx + Math.cos(star.angle) * dist;
            const ny = cy + Math.sin(star.angle) * dist * 0.6;

            // Node glow (additive)
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = CU.rgba(gdR, gdG, gdB, nAlpha * 0.3);
            ctx.beginPath();
            ctx.arc(nx, ny, 8 + (p >= 2 ? Math.sin(t * 5 + i) * 3 : 0), 0, Math.PI * 2);
            ctx.fill();
            ctx.globalCompositeOperation = 'source-over';

            // Node star shape
            ctx.globalAlpha = nAlpha;
            ctx.fillStyle = '#ffdd00';
            ctx.beginPath();
            this.drawStar(ctx, nx, ny, 5, 6, 3);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        // === € HOLOGRAM ===
        // Glow
        ctx.globalCompositeOperation = 'lighter';
        const euroGlow = 15 + Math.sin(t * 4) * 5;
        ctx.fillStyle = CU.rgba(gdR, gdG, gdB, 0.15);
        ctx.beginPath();
        ctx.arc(cx, cy, euroGlow, 0, Math.PI * 2);
        ctx.fill();

        // P3: intense pulse
        if (p === 3) {
            const pulseR = 25 + Math.sin(t * 8) * 10;
            ctx.fillStyle = CU.rgba(gdR, gdG, gdB, 0.25);
            ctx.beginPath();
            ctx.arc(cx, cy, pulseR, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';

        // € text
        ctx.fillStyle = '#ffdd00';
        ctx.font = CU.font('bold', 36, 'Arial');
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = CU.rgba(0, 0, 0, 0.5);
        ctx.lineWidth = 2;
        ctx.strokeText('€', cx, cy);
        ctx.fillText('€', cx, cy);

        // === P3: CRACKS WITH LIGHT LEAKING ===
        if (p === 3) {
            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = CU.rgba(255, 200, 100, 0.4 + Math.sin(t * 10) * 0.2);
            ctx.lineWidth = 2;
            for (let i = 0; i < 5; i++) {
                const crA = (i / 5) * Math.PI * 2 + t * 0.3;
                ctx.beginPath();
                ctx.moveTo(cx + Math.cos(crA) * 12, cy + Math.sin(crA) * 12);
                ctx.lineTo(cx + Math.cos(crA) * 35, cy + Math.sin(crA) * 35);
                ctx.lineTo(cx + Math.cos(crA + 0.15) * 50, cy + Math.sin(crA + 0.15) * 50);
                ctx.stroke();
            }
            ctx.globalCompositeOperation = 'source-over';

            // Debris particles
            for (let i = 0; i < 3; i++) {
                const debA = t * 2 + i * Math.PI * 2 / 3;
                const debD = coreR + 15 + Math.sin(t * 5 + i) * 10;
                ctx.fillStyle = CU.rgba(gdR, gdG, gdB, 0.5);
                ctx.beginPath();
                ctx.arc(cx + Math.cos(debA) * debD, cy + Math.sin(debA) * debD * 0.7, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        this.drawHPBar(ctx, x, y, w, 'BCE');
        ctx.restore();
    }

    // v5.7: BOJ — The Golden Torii (floating torii gate → meltdown)
    drawBOJ(ctx) {
        const CU = window.Game.ColorUtils;
        const x = this.x, y = this.y, w = this.width, h = this.height;
        const cx = x + w / 2, cy = y + h / 2;
        const t = this.animTime;
        const isHit = this.hitTimer > 0;
        const p = this.phase;

        ctx.save();

        // Color channels
        const gdR = 255, gdG = 215, gdB = 0; // gold
        const rdR = p === 3 ? 107 : (p === 2 ? 139 : 188);
        const rdG = 0;
        const rdB = p === 3 ? 25 : (p === 2 ? 35 : 45);

        // === RISING SUN RAYS (additive) ===
        const rayCount = 16;
        const rayLen = 95 + p * 12;
        const raySpeed = p === 3 ? 0.6 : (p === 2 ? 0.4 : 0.15);

        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < rayCount; i++) {
            const angle = (i / rayCount) * Math.PI * 2 + t * raySpeed;
            const nextA = angle + Math.PI / rayCount * 0.7;
            const alpha = (i % 2 === 0 ? 0.12 : 0.06) + p * 0.03;
            ctx.fillStyle = i % 2 === 0
                ? CU.rgba(rdR, rdG, rdB, alpha)
                : CU.rgba(255, 255, 255, alpha * 0.5);
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(angle) * rayLen, cy + Math.sin(angle) * rayLen * 0.5);
            ctx.lineTo(cx + Math.cos(nextA) * rayLen, cy + Math.sin(nextA) * rayLen * 0.5);
            ctx.closePath();
            ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';

        // === GOLD AURA ===
        ctx.globalCompositeOperation = 'lighter';
        const aGrad = ctx.createRadialGradient(cx, cy, 20, cx, cy, w / 2 + 20);
        aGrad.addColorStop(0, CU.rgba(gdR, gdG, gdB, 0.1));
        aGrad.addColorStop(1, CU.rgba(gdR, gdG, gdB, 0));
        ctx.fillStyle = aGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, w / 2 + 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';

        // === TORII GATE STRUCTURE ===
        const pillarW = 10;
        const pillarH = 65;
        const pillarSpacing = 55;
        const kasagiY = cy - pillarH / 2 + 5;
        const nukiY = kasagiY + 18;
        const kasagiW = pillarSpacing * 2 + 30;
        const kasagiH = 8;
        const nukiH = 5;

        // P3: wave distortion
        const distort = p === 3 ? Math.sin(t * 6) * 3 : 0;

        // Gold fill (P3 flickers between gold and incandescent orange)
        const goldAlpha = isHit ? 1 : (p === 3 ? 0.7 + Math.sin(t * 4) * 0.2 : 0.9);
        const gfR = p === 3 ? 255 : gdR;
        const gfG = p === 3 ? 150 + Math.floor(Math.sin(t * 3) * 50) : gdG;
        const gfB = p === 3 ? 0 : gdB;
        const goldFill = isHit ? '#fff' : CU.rgba(gfR, gfG, gfB, goldAlpha);

        // Left pillar
        ctx.fillStyle = goldFill;
        ctx.fillRect(cx - pillarSpacing - pillarW / 2 + distort, kasagiY + kasagiH, pillarW, pillarH);
        // Right pillar
        ctx.fillRect(cx + pillarSpacing - pillarW / 2 - distort, kasagiY + kasagiH, pillarW, pillarH);

        // Kasagi (top crossbar — curved upward at ends)
        ctx.beginPath();
        ctx.moveTo(cx - kasagiW / 2, kasagiY + kasagiH);
        ctx.lineTo(cx - kasagiW / 2 - 5, kasagiY - 3);
        ctx.lineTo(cx + kasagiW / 2 + 5, kasagiY - 3);
        ctx.lineTo(cx + kasagiW / 2, kasagiY + kasagiH);
        ctx.closePath();
        ctx.fill();

        // Nuki (second crossbar)
        ctx.fillRect(cx - pillarSpacing + pillarW / 2, nukiY, pillarSpacing * 2 - pillarW, nukiH);

        // === NEON EDGE GLOW (additive) ===
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = CU.rgba(gdR, gdG, gdB, 0.35);
        ctx.lineWidth = 3;
        // Pillars
        ctx.strokeRect(cx - pillarSpacing - pillarW / 2 + distort, kasagiY + kasagiH, pillarW, pillarH);
        ctx.strokeRect(cx + pillarSpacing - pillarW / 2 - distort, kasagiY + kasagiH, pillarW, pillarH);
        // Kasagi
        ctx.beginPath();
        ctx.moveTo(cx - kasagiW / 2, kasagiY + kasagiH);
        ctx.lineTo(cx - kasagiW / 2 - 5, kasagiY - 3);
        ctx.lineTo(cx + kasagiW / 2 + 5, kasagiY - 3);
        ctx.lineTo(cx + kasagiW / 2, kasagiY + kasagiH);
        ctx.closePath();
        ctx.stroke();
        // Nuki
        ctx.strokeRect(cx - pillarSpacing + pillarW / 2, nukiY, pillarSpacing * 2 - pillarW, nukiH);
        ctx.globalCompositeOperation = 'source-over';

        // === ¥ SYMBOL (center below nuki) ===
        const yenY = nukiY + nukiH + 22;

        // Glow
        ctx.globalCompositeOperation = 'lighter';
        const yenGlow = 20 + Math.sin(t * (p === 3 ? 8 : 3)) * (p === 3 ? 10 : 5);
        ctx.fillStyle = CU.rgba(gdR, gdG, gdB, 0.15);
        ctx.beginPath();
        ctx.arc(cx, yenY, yenGlow, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';

        // ¥ text
        ctx.fillStyle = p === 3 ? '#fff' : CU.rgba(gdR, gdG, gdB, 1);
        ctx.font = CU.font('bold', 38, 'Arial');
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = CU.rgba(0, 0, 0, 0.5);
        ctx.lineWidth = 2;
        ctx.strokeText('¥', cx, yenY);
        ctx.fillText('¥', cx, yenY);

        // === P2+: YIELD CURVE EKG ===
        if (p >= 2) {
            ctx.strokeStyle = CU.rgba(rdR, rdG, rdB, 0.5 + Math.sin(t * 4) * 0.2);
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            const eW = pillarSpacing * 2 - 20;
            for (let i = 0; i <= 20; i++) {
                const tN = i / 20;
                const ex = cx - eW / 2 + tN * eW;
                const ey = cy + 28 - Math.sin(tN * Math.PI) * 10 - tN * 4 + Math.sin(t * 8 + tN * 10) * 2;
                if (i === 0) ctx.moveTo(ex, ey);
                else ctx.lineTo(ex, ey);
            }
            ctx.stroke();

            // INTERVENTION flash
            if (this.interventionCooldown > 0 || Math.floor(t * 3) % 5 === 0) {
                ctx.fillStyle = CU.rgba(255, 255, 0, 0.4 + Math.sin(t * 15) * 0.4);
                ctx.font = CU.font('bold', 12, 'monospace');
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('INTERVENTION!', cx, kasagiY - 15);
            }
        }

        // === P3: MELTDOWN EFFECTS ===
        if (p === 3) {
            // Incandescent overlay
            ctx.fillStyle = CU.rgba(255, 200, 100, 0.1 + Math.sin(t * 5) * 0.05);
            ctx.fillRect(x, y, w, h);

            // Heat haze lines above gate
            for (let i = 0; i < 5; i++) {
                const hazeY = kasagiY - 10 - i * 7 - (t * 25) % 12;
                ctx.strokeStyle = CU.rgba(255, 200, 100, 0.2 - i * 0.03);
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(cx - kasagiW / 2 + 10, hazeY);
                ctx.bezierCurveTo(
                    cx - 20, hazeY - 3 + Math.sin(t * 6 + i) * 2,
                    cx + 20, hazeY + 3 + Math.cos(t * 6 + i) * 2,
                    cx + kasagiW / 2 - 10, hazeY
                );
                ctx.stroke();
            }

            // Molten drips from crossbar
            for (let i = 0; i < 4; i++) {
                const dripX = cx - pillarSpacing + 20 + i * 25;
                const dripLen = 8 + ((t * 30 + i * 17) % 20);
                const dripAlpha = Math.max(0.1, 0.5 - (dripLen / 30));
                ctx.fillStyle = CU.rgba(gdR, gdG - 50, 0, dripAlpha);
                ctx.beginPath();
                ctx.ellipse(dripX, kasagiY + kasagiH + dripLen, 2, dripLen / 3, 0, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // === TELEGRAPH WARNING (intervention burst) ===
        if (this.bojTelegraphTarget && this.bojTelegraphTimer > 0) {
            const tProg = 1 - (this.bojTelegraphTimer / 0.4);
            const flashAlpha = 0.3 + tProg * 0.5 + Math.sin(t * 30) * 0.15;
            ctx.save();
            ctx.globalAlpha = flashAlpha;
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 2 + tProg * 2;
            ctx.setLineDash([8, 6]);
            ctx.beginPath();
            ctx.moveTo(cx, y + h);
            ctx.lineTo(this.bojTelegraphTarget.x, this.bojTelegraphTarget.y);
            ctx.stroke();
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

    // v5.7: Redesigned HP bar with glow, segments, monospace
    drawHPBar(ctx, x, y, w, name) {
        const CU = window.Game.ColorUtils;
        const hpPct = Math.max(0, this.hp / this.maxHp);
        const barW = w + 40;
        const barH = 10;
        const barX = x - 20;
        const barY = y - 28;
        const centerX = x + w / 2;
        const p = this.phase;

        // Phase fill RGB
        const fR = p === 3 ? 255 : (p === 2 ? 255 : 57);
        const fG = p === 3 ? 34 : (p === 2 ? 170 : 255);
        const fB = p === 3 ? 68 : (p === 2 ? 0 : 20);

        // Background
        ctx.fillStyle = CU.rgba(20, 0, 0, 0.8);
        ctx.beginPath();
        ctx.roundRect(barX, barY, barW, barH, 3);
        ctx.fill();

        // Phase threshold markers
        const thresh = window.Game.Balance?.BOSS?.PHASE_THRESHOLDS;
        if (thresh) {
            ctx.strokeStyle = CU.rgba(255, 255, 255, 0.12);
            ctx.lineWidth = 1;
            for (let i = 0; i < thresh.length; i++) {
                const mx = barX + barW * thresh[i];
                ctx.beginPath();
                ctx.moveTo(mx, barY);
                ctx.lineTo(mx, barY + barH);
                ctx.stroke();
            }
        }

        // HP fill with gradient
        if (hpPct > 0) {
            const fillW = barW * hpPct;
            const fGrad = ctx.createLinearGradient(barX, barY, barX + fillW, barY);
            fGrad.addColorStop(0, CU.rgba(fR, fG, fB, 0.9));
            fGrad.addColorStop(1, CU.rgba(fR, fG, fB, 0.7));
            ctx.fillStyle = fGrad;
            ctx.beginPath();
            ctx.roundRect(barX, barY, fillW, barH, 3);
            ctx.fill();

            // Glow on fill (additive)
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = CU.rgba(fR, fG, fB, 0.15);
            ctx.beginPath();
            ctx.roundRect(barX, barY - 2, fillW, barH + 4, 4);
            ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
        }

        // Border
        ctx.strokeStyle = CU.rgba(255, 255, 255, 0.4);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(barX, barY, barW, barH, 3);
        ctx.stroke();

        // Phase text
        ctx.fillStyle = CU.rgba(255, 255, 255, 0.7);
        ctx.font = CU.font('bold', 10, 'monospace');
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`PHASE ${p}`, centerX, barY - 7);

        // Boss name
        ctx.fillStyle = '#fff';
        ctx.font = CU.font('bold', 14, 'monospace');
        ctx.fillText(name, centerX, barY - 20);
    }

}

window.Game.Boss = Boss;
