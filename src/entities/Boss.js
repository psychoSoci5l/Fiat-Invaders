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

        this.targetY = 145; // Below safe zone (HUD + perk bar)
        this.dir = 1;
        this.moveSpeed = 60;

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
    }

    damage(amount) {
        this.hp -= amount;
        this.hitTimer = 0.12;

        // Phase transitions
        const hpPct = this.hp / this.maxHp;
        if (hpPct <= 0.33 && this.phase < 3) {
            this.triggerPhaseTransition(3);
        } else if (hpPct <= 0.66 && this.phase < 2) {
            this.triggerPhaseTransition(2);
        }
    }

    triggerPhaseTransition(newPhase) {
        this.phase = newPhase;
        this.phaseTransitioning = true;
        this.phaseTransitionTimer = 1.5;
        this.shakeIntensity = 15;
        this.eyeGlow = 1;

        // BOJ becomes aggressive in later phases
        if (this.bossType === 'BOJ' && newPhase >= 2) {
            this.zenMode = false;
        }

        if (window.Game.Audio) {
            window.Game.Audio.play('bossPhaseChange');
            window.Game.Audio.setBossPhase(newPhase);
        }

        // Story: Boss phase change dialogue
        if (window.Game.Story) {
            window.Game.Story.onBossPhaseChange(newPhase, this.bossType);
        }

        // Update Harmonic Conductor for new boss phase
        if (window.Game.HarmonicConductor) {
            window.Game.HarmonicConductor.setBossSequence(newPhase);
        }

        // Screen shake via global
        if (typeof shake !== 'undefined') shake = 30;
    }

    update(dt, player) {
        this.animTime += dt;
        if (this.hitTimer > 0) this.hitTimer -= dt;
        if (this.eyeGlow > 0) this.eyeGlow -= dt * 0.5;
        if (this.shakeIntensity > 0) this.shakeIntensity -= dt * 10;

        // BOJ intervention cooldown
        if (this.interventionCooldown > 0) this.interventionCooldown -= dt;

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
            this.y += 80 * dt;
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
        if (this.phase === 1) {
            // Slow patrol
            this.x += this.moveSpeed * this.dir * dt;
            if (this.x < 20 || this.x + this.width > this.gameWidth - 20) {
                this.dir *= -1;
            }
        } else if (this.phase === 2) {
            // Faster, erratic movement
            this.moveSpeed = 120;
            this.x += this.moveSpeed * this.dir * dt;
            this.y = this.targetY + Math.sin(this.animTime * 3) * 20;
            if (this.x < 20 || this.x + this.width > this.gameWidth - 20) {
                this.dir *= -1;
            }
        } else {
            // Phase 3: RAGE - Erratic aggressive movement
            this.moveSpeed = 180;
            const baseX = this.gameWidth / 2 - this.width / 2;
            const patternX = Math.sin(this.animTime * 2) * 150;
            const patternY = Math.sin(this.animTime * 4) * 30;
            const targetX = baseX + patternX;
            this.x += (targetX - this.x) * 3 * dt + (Math.random() - 0.5) * 8;
            this.y = this.targetY + patternY + (Math.random() - 0.5) * 5;
            this.x = Math.max(20, Math.min(this.gameWidth - this.width - 20, this.x));

            // Spawn minions
            this.printTimer -= dt;
            if (this.printTimer <= 0) {
                this.printMoney();
                this.printTimer = 2.5;
            }
        }
    }

    updateMovementBCE(dt) {
        // BCE: Slow, methodical, bureaucratic movement
        if (this.phase === 1) {
            // Very slow patrol - bureaucracy is slow
            this.moveSpeed = 40;
            this.x += this.moveSpeed * this.dir * dt;
            if (this.x < 40 || this.x + this.width > this.gameWidth - 40) {
                this.dir *= -1;
            }
        } else if (this.phase === 2) {
            // Still slow but with vertical oscillation
            this.moveSpeed = 60;
            this.x += this.moveSpeed * this.dir * dt;
            this.y = this.targetY + Math.sin(this.animTime * 1.5) * 15;
            if (this.x < 30 || this.x + this.width > this.gameWidth - 30) {
                this.dir *= -1;
            }
        } else {
            // Phase 3: Fragmentation - faster, erratic
            this.moveSpeed = 100;
            this.x += this.moveSpeed * this.dir * dt;
            this.y = this.targetY + Math.sin(this.animTime * 3) * 25 + Math.cos(this.animTime * 5) * 10;
            if (this.x < 20 || this.x + this.width > this.gameWidth - 20) {
                this.dir *= -1;
            }

            // Spawn euro minions
            this.printTimer -= dt;
            if (this.printTimer <= 0) {
                this.printMoney();
                this.printTimer = 3.0;
            }
        }

        // Rotate stars
        for (let star of this.stars) {
            star.angle += dt * 0.5;
        }
    }

    updateMovementBOJ(dt) {
        // BOJ: Zen precision, then sudden interventions
        if (this.phase === 1) {
            // Smooth, zen-like movement
            this.moveSpeed = 50;
            const centerX = this.gameWidth / 2 - this.width / 2;
            const offsetX = Math.sin(this.animTime * 0.8) * 100;
            this.x += (centerX + offsetX - this.x) * 2 * dt;
        } else if (this.phase === 2) {
            // Yield curve control - smooth waves
            this.moveSpeed = 80;
            const wave = Math.sin(this.animTime * 1.2) * 120;
            const targetX = this.gameWidth / 2 - this.width / 2 + wave;
            this.x += (targetX - this.x) * 3 * dt;
            this.y = this.targetY + Math.sin(this.animTime * 2) * 20;

            // Sudden intervention bursts
            if (this.interventionCooldown <= 0 && Math.random() < 0.01) {
                this.interventionCooldown = 3.0;
                // Quick dash to random position
                this.x = Math.random() * (this.gameWidth - this.width - 40) + 20;
            }
        } else {
            // Phase 3: Full intervention mode
            this.moveSpeed = 150;

            // Unpredictable movements with sudden stops
            if (Math.floor(this.animTime * 2) % 3 === 0) {
                // Zen pause
                this.y = this.targetY;
            } else {
                // Aggressive movement
                const patternX = Math.sin(this.animTime * 3) * 140;
                const patternY = Math.cos(this.animTime * 2) * 25;
                const targetX = this.gameWidth / 2 - this.width / 2 + patternX;
                this.x += (targetX - this.x) * 4 * dt;
                this.y = this.targetY + patternY;
            }

            this.x = Math.max(20, Math.min(this.gameWidth - this.width - 20, this.x));

            // Spawn yen minions
            this.printTimer -= dt;
            if (this.printTimer <= 0) {
                this.printMoney();
                this.printTimer = 2.0;
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
            minionConfig.c = '#3498db'; // Euro blue
            minionConfig.s = '€';
        } else if (this.bossType === 'BOJ') {
            minionConfig.c = '#e74c3c'; // Yen red
            minionConfig.s = '¥';
        } else {
            minionConfig.c = '#2ecc71'; // Dollar green
            minionConfig.s = '$';
        }

        // Scale minion HP with boss phase
        minionConfig.hp = minionConfig.hp * (5 + this.phase * 2);

        // Spawn minions on both sides
        const minion1 = new G.Enemy(this.x - 40, this.y + 80, minionConfig);
        const minion2 = new G.Enemy(this.x + this.width + 40, this.y + 80, minionConfig);

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
        const Colors = window.Game.BULLET_HELL_COLORS || {};

        if (!Patterns) {
            this.fireTimer = 1.0;
            for (let i = -2; i <= 2; i++) {
                const angle = Math.PI / 2 + (i * 0.25);
                bullets.push({
                    x: cx, y: cy - 20,
                    vx: Math.cos(angle) * 180,
                    vy: Math.sin(angle) * 180,
                    color: '#2ecc71', w: 10, h: 10
                });
            }
            return bullets;
        }

        if (this.phase === 1) {
            this.fireTimer = 0.8;
            this.angle += 0.15;
            if (Math.floor(this.angle * 2) % 2 === 0) {
                const ringBullets = Patterns.expandingRing(cx, cy - 20, this.angle, {
                    count: 12, speed: 140, color: Colors.CYAN || '#00ffff', size: 10, rotate: true
                });
                bullets.push(...ringBullets);
            } else {
                const waveBullets = Patterns.sineWave(cx, cy - 20, this.animTime, {
                    count: 10, width: 350, amplitude: 25, speed: 160, color: Colors.PINK || '#ff69b4', size: 8
                });
                bullets.push(...waveBullets);
            }
        } else if (this.phase === 2) {
            this.fireTimer = 0.35; // Balanced: was 0.18 (too fast)
            this.angle += 0.3;
            const spiralBullets = Patterns.spiral(cx, cy - 20, this.angle, {
                arms: 2, speed: 200, color: Colors.ORANGE || '#ff8c00', size: 10
            });
            bullets.push(...spiralBullets);

            if (Math.floor(this.animTime * 0.33) !== Math.floor((this.animTime - 0.35) * 0.33)) {
                const flowerBullets = Patterns.flower(cx, cy - 30, this.animTime, {
                    petals: 6, bulletsPerPetal: 3, speed: 180, color: Colors.MAGENTA || '#ff00ff', size: 9
                });
                bullets.push(...flowerBullets);
            }

            if (Math.floor(this.angle * 3) % 5 === 0 && player) {
                const aimedBullets = Patterns.aimedBurst(cx, cy, player.x, player.y, {
                    count: 3, speed: 250, spread: 0.3, color: '#e74c3c', size: 11
                });
                bullets.push(...aimedBullets);
            }
        } else {
            this.fireTimer = 0.2; // Balanced: was 0.1 (too fast)
            this.angle += 0.22;
            this.laserAngle += 0.06;

            const spiralColor = Math.floor(this.angle * 2) % 2 === 0 ?
                (Colors.YELLOW || '#ffff00') : (Colors.PINK || '#ff69b4');
            const spiralBullets = Patterns.spiral(cx, cy - 20, this.angle, {
                arms: 4, speed: 220, color: spiralColor, size: 10
            });
            bullets.push(...spiralBullets);

            if (Math.floor(this.animTime * 0.67) !== Math.floor((this.animTime - 0.2) * 0.67) && player) {
                const curtainBullets = Patterns.curtain(cx, cy - 40, player.x, {
                    width: 450, count: 18, gapSize: 70, speed: 180, color: Colors.CYAN || '#00ffff', size: 9
                });
                bullets.push(...curtainBullets);
            }

            const helixBullets = Patterns.doubleHelix(this.x + 20, cy - 30, this.laserAngle, {
                speed: 200, color1: Colors.PINK || '#ff69b4', color2: Colors.CYAN || '#00ffff', size: 8
            });
            bullets.push(...helixBullets);

            const helixBullets2 = Patterns.doubleHelix(this.x + this.width - 20, cy - 30, this.laserAngle + Math.PI, {
                speed: 200, color1: Colors.CYAN || '#00ffff', color2: Colors.PINK || '#ff69b4', size: 8
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

        if (!Patterns) {
            this.fireTimer = 1.2;
            for (let i = -3; i <= 3; i++) {
                bullets.push({
                    x: cx + i * 40, y: cy,
                    vx: 0, vy: 120,
                    color: '#003399', w: 12, h: 12
                });
            }
            return bullets;
        }

        if (this.phase === 1) {
            // BUREAUCRACY: Slow walls of bullets, dense but avoidable
            this.fireTimer = 1.2;
            this.angle += 0.1;

            // Horizontal curtain (wall)
            const wallBullets = Patterns.curtain(cx, cy - 20, cx, {
                width: 400, count: 12, gapSize: 80, speed: 100, color: '#003399', size: 12
            });
            bullets.push(...wallBullets);

        } else if (this.phase === 2) {
            // NEGATIVE RATES: Bullets that curve/attract
            this.fireTimer = 0.6;
            this.angle += 0.2;

            // Slow spiral with many arms
            const spiralBullets = Patterns.spiral(cx, cy - 20, this.angle, {
                arms: 6, speed: 110, color: '#003399', size: 10
            });
            bullets.push(...spiralBullets);

            // Stars shoot independently
            if (Math.floor(this.animTime * 0.5) !== Math.floor((this.animTime - 0.6) * 0.5)) {
                for (let i = 0; i < 4; i++) {
                    const star = this.stars[i * 3];
                    const sx = cx + Math.cos(star.angle) * star.dist;
                    const sy = this.y + this.height / 2 + Math.sin(star.angle) * star.dist * 0.5;

                    if (player) {
                        const aimedBullets = Patterns.aimedBurst(sx, sy, player.x, player.y, {
                            count: 2, speed: 160, spread: 0.15, color: '#ffcc00', size: 9
                        });
                        bullets.push(...aimedBullets);
                    }
                }
            }

        } else {
            // FRAGMENTATION: Everything at once, chaos
            this.fireTimer = 0.25;
            this.angle += 0.25;

            // Triple walls from different angles
            const wall1 = Patterns.curtain(cx, cy - 20, player ? player.x : cx, {
                width: 350, count: 10, gapSize: 60, speed: 130, color: '#003399', size: 10
            });
            bullets.push(...wall1);

            // Spiral chaos
            if (Math.floor(this.animTime * 2) % 3 === 0) {
                const spiralBullets = Patterns.spiral(cx, cy - 20, this.angle, {
                    arms: 8, speed: 150, color: '#ffcc00', size: 9
                });
                bullets.push(...spiralBullets);
            }

            // All stars fire
            if (Math.floor(this.animTime * 0.8) !== Math.floor((this.animTime - 0.25) * 0.8)) {
                for (let i = 0; i < 12; i++) {
                    const star = this.stars[i];
                    const sx = cx + Math.cos(star.angle) * star.dist;
                    const sy = this.y + this.height / 2 + Math.sin(star.angle) * star.dist * 0.5;
                    bullets.push({
                        x: sx, y: sy,
                        vx: Math.cos(star.angle + Math.PI / 2) * 140,
                        vy: 160,
                        color: '#ffcc00', w: 8, h: 8
                    });
                }
            }
        }

        return bullets;
    }

    attackBOJ(player) {
        const bullets = [];
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height;
        const Patterns = window.Game.BulletPatterns;

        if (!Patterns) {
            this.fireTimer = 0.8;
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

        if (this.phase === 1) {
            // YIELD CURVE: Beautiful sine waves, zen patterns
            this.fireTimer = 0.7;
            this.wavePhase += 0.15;

            // Precise sine wave
            const waveBullets = Patterns.sineWave(cx, cy - 20, this.wavePhase, {
                count: 14, width: 400, amplitude: 40, speed: 130, color: '#bc002d', size: 10
            });
            bullets.push(...waveBullets);

        } else if (this.phase === 2) {
            // INTERVENTION: Sudden fast bursts mixed with calm periods
            this.wavePhase += 0.2;

            if (this.zenMode || Math.floor(this.animTime * 2) % 4 < 2) {
                // Zen mode: slow waves
                this.fireTimer = 0.5;
                const waveBullets = Patterns.sineWave(cx, cy - 20, this.wavePhase, {
                    count: 12, width: 350, amplitude: 35, speed: 140, color: '#bc002d', size: 9
                });
                bullets.push(...waveBullets);
            } else {
                // INTERVENTION! Fast aimed burst
                this.fireTimer = 0.25; // Balanced: was 0.15
                if (player) {
                    const burstBullets = Patterns.aimedBurst(cx, cy - 20, player.x, player.y, {
                        count: 5, speed: 280, spread: 0.4, color: '#ffffff', size: 11
                    });
                    bullets.push(...burstBullets);
                }
            }

            // Occasional flower pattern
            if (Math.floor(this.animTime * 0.4) !== Math.floor((this.animTime - 0.5) * 0.4)) {
                const flowerBullets = Patterns.flower(cx, cy - 30, this.wavePhase, {
                    petals: 8, bulletsPerPetal: 2, speed: 120, color: '#bc002d', size: 8
                });
                bullets.push(...flowerBullets);
            }

        } else {
            // FULL INTERVENTION: Bouncing bullets, chaos
            this.fireTimer = 0.2; // Balanced: was 0.12
            this.wavePhase += 0.25;
            this.angle += 0.18;

            // Multi-directional waves
            const wave1 = Patterns.sineWave(cx - 100, cy - 20, this.wavePhase, {
                count: 8, width: 200, amplitude: 30, speed: 160, color: '#bc002d', size: 9
            });
            bullets.push(...wave1);

            const wave2 = Patterns.sineWave(cx + 100, cy - 20, this.wavePhase + Math.PI, {
                count: 8, width: 200, amplitude: 30, speed: 160, color: '#ffffff', size: 9
            });
            bullets.push(...wave2);

            // Rapid spiral
            const spiralBullets = Patterns.spiral(cx, cy - 20, this.angle, {
                arms: 3, speed: 200, color: '#bc002d', size: 10
            });
            bullets.push(...spiralBullets);

            // Random intervention bursts
            if (Math.random() < 0.1 && player) {
                const burstBullets = Patterns.aimedBurst(cx, cy, player.x, player.y, {
                    count: 7, speed: 300, spread: 0.5, color: '#ffffff', size: 12
                });
                bullets.push(...burstBullets);
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
        const w = this.width;
        const h = this.height;
        const cx = x + w / 2;

        ctx.save();

        const isHit = this.hitTimer > 0;
        const baseColor = this.phase === 3 ? '#4a1a1a' : (this.phase === 2 ? '#3d3d3d' : '#5a5a5a');
        const accentColor = this.phase === 3 ? '#ff0000' : (this.phase === 2 ? '#f39c12' : '#2ecc71');

        // Aura
        const auraPulse = Math.sin(this.animTime * 4) * 0.15 + 0.3;
        const auraSize = 20 + this.phase * 15;
        ctx.fillStyle = accentColor;
        ctx.globalAlpha = auraPulse * (this.phase * 0.3);
        ctx.beginPath();
        ctx.ellipse(cx, y + h / 2, w / 2 + auraSize, h / 2 + auraSize * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Main body
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 4;
        ctx.fillStyle = isHit ? '#ffffff' : this.darkenColor(baseColor, 0.25);
        ctx.beginPath();
        ctx.roundRect(x + 10, y + 30, (w - 20) / 2, h - 40, 8);
        ctx.fill();
        ctx.fillStyle = isHit ? '#ffffff' : baseColor;
        ctx.beginPath();
        ctx.roundRect(x + 10 + (w - 20) / 2, y + 30, (w - 20) / 2, h - 40, 8);
        ctx.fill();
        ctx.beginPath();
        ctx.roundRect(x + 10, y + 30, w - 20, h - 40, 8);
        ctx.stroke();

        // Printer top
        ctx.fillStyle = isHit ? '#ffffff' : '#333';
        ctx.beginPath();
        ctx.roundRect(x + 30, y + 5, w - 60, 35, 5);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#111';
        ctx.fillRect(x + 50, y + 15, w - 100, 8);

        // Money animation (Phase 2+)
        if (this.phase >= 2) {
            const moneyOffset = (this.animTime * 50) % 20;
            ctx.fillStyle = '#2ecc71';
            ctx.fillRect(x + 55, y + 12 + moneyOffset, 15, 6);
            ctx.fillRect(x + w - 70, y + 12 + (moneyOffset + 10) % 20, 15, 6);
        }

        // Face panel
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.roundRect(x + 25, y + 45, w - 50, 50, 5);
        ctx.fill();

        // Eyes
        const eyeSize = 12 + this.phase * 2;
        const eyeY = y + 65;
        const eyeSpacing = 25 + this.phase * 5;

        if (this.eyeGlow > 0 || this.phase === 3) {
            const glowAlpha = this.phase === 3 ? 0.5 + Math.sin(this.animTime * 10) * 0.3 : this.eyeGlow;
            ctx.fillStyle = `rgba(255, 0, 0, ${glowAlpha})`;
            ctx.beginPath();
            ctx.arc(cx - eyeSpacing, eyeY, eyeSize + 8, 0, Math.PI * 2);
            ctx.arc(cx + eyeSpacing, eyeY, eyeSize + 8, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.fillStyle = this.phase === 3 ? '#ffcccc' : '#fff';
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx - eyeSpacing, eyeY, eyeSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx + eyeSpacing, eyeY, eyeSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        let pupilOffsetX = 0, pupilOffsetY = 0;
        if (this.phase === 3) {
            pupilOffsetX = Math.cos(this.animTime * 5) * 4;
            pupilOffsetY = Math.sin(this.animTime * 5) * 4;
        }

        ctx.fillStyle = this.phase === 3 ? '#ff0000' : '#111';
        ctx.beginPath();
        ctx.arc(cx - eyeSpacing + pupilOffsetX, eyeY + pupilOffsetY, eyeSize * 0.5, 0, Math.PI * 2);
        ctx.arc(cx + eyeSpacing + pupilOffsetX, eyeY + pupilOffsetY, eyeSize * 0.5, 0, Math.PI * 2);
        ctx.fill();

        // Angry eyebrows (Phase 2+)
        if (this.phase >= 2) {
            ctx.strokeStyle = '#111';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(cx - eyeSpacing - eyeSize, eyeY - eyeSize - 5);
            ctx.lineTo(cx - eyeSpacing + eyeSize, eyeY - eyeSize + 3);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx + eyeSpacing + eyeSize, eyeY - eyeSize - 5);
            ctx.lineTo(cx + eyeSpacing - eyeSize, eyeY - eyeSize + 3);
            ctx.stroke();
        }

        // Vault dial
        ctx.fillStyle = '#c0c0c0';
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(cx, y + 110, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#888';
        ctx.beginPath();
        ctx.arc(cx, y + 110, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        const dialAngle = this.animTime * 2;
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx, y + 110);
        ctx.lineTo(cx + Math.cos(dialAngle) * 14, y + 110 + Math.sin(dialAngle) * 14);
        ctx.stroke();

        // Side cannons (Phase 2+)
        if (this.phase >= 2) {
            ctx.fillStyle = '#444';
            ctx.strokeStyle = '#111';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.roundRect(x - 5, y + 70, 20, 35, 3);
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            ctx.roundRect(x + w - 15, y + 70, 20, 35, 3);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = accentColor;
            ctx.beginPath();
            ctx.arc(x + 5, y + 100, 5, 0, Math.PI * 2);
            ctx.arc(x + w - 5, y + 100, 5, 0, Math.PI * 2);
            ctx.fill();
        }

        // $ Symbol
        ctx.fillStyle = accentColor;
        if (this.phase === 3) {
            ctx.shadowColor = '#ff0000';
            ctx.shadowBlur = 15 + Math.sin(this.animTime * 10) * 8;
        }
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', cx, y + 145);
        ctx.shadowBlur = 0;

        // Phase 3 sparks
        if (this.phase === 3) {
            ctx.strokeStyle = '#ff4444';
            ctx.lineWidth = 2;
            for (let i = 0; i < 4; i++) {
                const sparkAngle = this.animTime * 8 + i * Math.PI / 2;
                const sparkDist = 70 + Math.sin(this.animTime * 12 + i) * 15;
                const sparkX = cx + Math.cos(sparkAngle) * sparkDist;
                const sparkY = y + h / 2 + Math.sin(sparkAngle) * sparkDist * 0.5;
                ctx.globalAlpha = 0.6 + Math.sin(this.animTime * 15 + i * 2) * 0.4;
                ctx.beginPath();
                ctx.moveTo(sparkX - 4, sparkY - 6);
                ctx.lineTo(sparkX + 2, sparkY - 1);
                ctx.lineTo(sparkX - 2, sparkY + 1);
                ctx.lineTo(sparkX + 4, sparkY + 6);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
        }

        this.drawHPBar(ctx, x, y, w, 'THE FED');
        ctx.restore();
    }

    drawBCE(ctx) {
        const x = this.x;
        const y = this.y;
        const w = this.width;
        const h = this.height;
        const cx = x + w / 2;

        ctx.save();

        const isHit = this.hitTimer > 0;
        const baseColor = this.phase === 3 ? '#001a4d' : (this.phase === 2 ? '#002266' : '#003399');
        const accentColor = '#ffcc00';

        // EU Stars orbiting
        ctx.globalAlpha = 0.8;
        for (let i = 0; i < 12; i++) {
            const star = this.stars[i];
            const starX = cx + Math.cos(star.angle) * star.dist;
            const starY = y + h / 2 + Math.sin(star.angle) * star.dist * 0.5;

            ctx.fillStyle = accentColor;
            ctx.beginPath();
            this.drawStar(ctx, starX, starY, 5, 8, 4);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Aura
        const auraPulse = Math.sin(this.animTime * 3) * 0.15 + 0.25;
        ctx.fillStyle = baseColor;
        ctx.globalAlpha = auraPulse * (this.phase * 0.25);
        ctx.beginPath();
        ctx.ellipse(cx, y + h / 2, w / 2 + 25, h / 2 + 15, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Main body - Frankfurt tower shape
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 4;

        // Tower base
        ctx.fillStyle = isHit ? '#ffffff' : baseColor;
        ctx.beginPath();
        ctx.roundRect(x + 20, y + 40, w - 40, h - 50, 6);
        ctx.fill();
        ctx.stroke();

        // Tower top (narrower)
        ctx.fillStyle = isHit ? '#ffffff' : this.lightenColor(baseColor, 0.1);
        ctx.beginPath();
        ctx.roundRect(x + 40, y + 10, w - 80, 40, 4);
        ctx.fill();
        ctx.stroke();

        // Windows grid
        ctx.fillStyle = '#ffcc00';
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 4; col++) {
                const winX = x + 35 + col * 25;
                const winY = y + 55 + row * 22;
                ctx.globalAlpha = 0.6 + Math.sin(this.animTime * 2 + row + col) * 0.3;
                ctx.fillRect(winX, winY, 12, 10);
            }
        }
        ctx.globalAlpha = 1;

        // EU Circle emblem
        ctx.fillStyle = '#001a4d';
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, y + 25, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Mini stars in emblem
        ctx.fillStyle = accentColor;
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
            const sx = cx + Math.cos(angle) * 10;
            const sy = y + 25 + Math.sin(angle) * 10;
            ctx.beginPath();
            this.drawStar(ctx, sx, sy, 3, 4, 2);
            ctx.fill();
        }

        // Euro symbol
        ctx.fillStyle = accentColor;
        if (this.phase === 3) {
            ctx.shadowColor = accentColor;
            ctx.shadowBlur = 15;
        }
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('€', cx, y + h - 20);
        ctx.shadowBlur = 0;

        // Phase indicators
        if (this.phase >= 2) {
            // Side bureaucracy papers
            ctx.fillStyle = '#fff';
            ctx.globalAlpha = 0.7;
            const paperWave = Math.sin(this.animTime * 4) * 5;
            ctx.fillRect(x - 10, y + 60 + paperWave, 15, 20);
            ctx.fillRect(x + w - 5, y + 70 - paperWave, 15, 20);
            ctx.globalAlpha = 1;
        }

        if (this.phase === 3) {
            // Fragmentation cracks
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.5 + Math.sin(this.animTime * 8) * 0.3;
            ctx.beginPath();
            ctx.moveTo(cx - 30, y + 50);
            ctx.lineTo(cx - 10, y + 80);
            ctx.lineTo(cx + 20, y + 70);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx + 30, y + 55);
            ctx.lineTo(cx + 15, y + 90);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }

        this.drawHPBar(ctx, x, y, w, 'BCE');
        ctx.restore();
    }

    drawBOJ(ctx) {
        const x = this.x;
        const y = this.y;
        const w = this.width;
        const h = this.height;
        const cx = x + w / 2;

        ctx.save();

        const isHit = this.hitTimer > 0;
        const baseColor = this.phase === 3 ? '#6b0019' : (this.phase === 2 ? '#8b0023' : '#bc002d');

        // Rising sun rays
        ctx.globalAlpha = 0.3;
        const rayCount = 16;
        for (let i = 0; i < rayCount; i++) {
            const angle = (i / rayCount) * Math.PI * 2 + this.animTime * 0.2;
            ctx.fillStyle = i % 2 === 0 ? '#bc002d' : '#ffffff';
            ctx.beginPath();
            ctx.moveTo(cx, y + h / 2);
            ctx.lineTo(
                cx + Math.cos(angle) * 120,
                y + h / 2 + Math.sin(angle) * 60
            );
            ctx.lineTo(
                cx + Math.cos(angle + Math.PI / rayCount) * 120,
                y + h / 2 + Math.sin(angle + Math.PI / rayCount) * 60
            );
            ctx.closePath();
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Aura
        const auraPulse = Math.sin(this.animTime * 2) * 0.15 + 0.2;
        ctx.fillStyle = baseColor;
        ctx.globalAlpha = auraPulse * (this.phase * 0.3);
        ctx.beginPath();
        ctx.arc(cx, y + h / 2, w / 2 + 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Main body - Circular (sun motif)
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 4;

        // Outer circle
        ctx.fillStyle = isHit ? '#ffffff' : '#fff';
        ctx.beginPath();
        ctx.arc(cx, y + h / 2, 55, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Inner red circle
        ctx.fillStyle = isHit ? '#ffffff' : baseColor;
        ctx.beginPath();
        ctx.arc(cx, y + h / 2, 40, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Zen patterns
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.5;

        // Concentric circles (zen ripples)
        for (let i = 1; i <= 3; i++) {
            const rippleRadius = 15 + i * 8 + Math.sin(this.animTime * 3 + i) * 3;
            ctx.beginPath();
            ctx.arc(cx, y + h / 2, rippleRadius, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;

        // Yen symbol
        ctx.fillStyle = '#fff';
        if (this.phase === 3) {
            ctx.shadowColor = '#ffffff';
            ctx.shadowBlur = 15;
        }
        ctx.font = 'bold 36px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('¥', cx, y + h / 2);
        ctx.shadowBlur = 0;

        // Side elements - torii gate style
        ctx.fillStyle = baseColor;
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 3;

        // Left pillar
        ctx.fillRect(x + 5, y + 30, 12, h - 40);
        ctx.strokeRect(x + 5, y + 30, 12, h - 40);

        // Right pillar
        ctx.fillRect(x + w - 17, y + 30, 12, h - 40);
        ctx.strokeRect(x + w - 17, y + 30, 12, h - 40);

        // Top beam
        ctx.fillStyle = baseColor;
        ctx.beginPath();
        ctx.moveTo(x, y + 20);
        ctx.lineTo(x + w, y + 20);
        ctx.lineTo(x + w - 10, y + 35);
        ctx.lineTo(x + 10, y + 35);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Phase effects
        if (this.phase >= 2 && !this.zenMode) {
            // Intervention warning
            ctx.fillStyle = '#ff0';
            ctx.globalAlpha = 0.5 + Math.sin(this.animTime * 10) * 0.5;
            ctx.font = 'bold 10px Arial';
            ctx.fillText('INTERVENTION', cx, y + h + 10);
            ctx.globalAlpha = 1;
        }

        if (this.phase === 3) {
            // Energy waves
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            for (let i = 0; i < 3; i++) {
                const waveRadius = 60 + i * 15 + Math.sin(this.animTime * 5 + i * 2) * 10;
                ctx.globalAlpha = 0.3 - i * 0.1;
                ctx.beginPath();
                ctx.arc(cx, y + h / 2, waveRadius, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
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
        const hpColor = this.phase === 3 ? '#ff0000' : (this.phase === 2 ? '#f39c12' : this.accentColor || '#2ecc71');
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

    darkenColor(hex, amount) {
        if (hex.startsWith('rgb')) {
            const match = hex.match(/(\d+),\s*(\d+),\s*(\d+)/);
            if (match) {
                const r = Math.max(0, parseInt(match[1]) - Math.floor(255 * amount));
                const g = Math.max(0, parseInt(match[2]) - Math.floor(255 * amount));
                const b = Math.max(0, parseInt(match[3]) - Math.floor(255 * amount));
                return `rgb(${r},${g},${b})`;
            }
        }
        const num = parseInt(hex.slice(1), 16);
        const r = Math.max(0, (num >> 16) - Math.floor(255 * amount));
        const g = Math.max(0, ((num >> 8) & 0x00FF) - Math.floor(255 * amount));
        const b = Math.max(0, (num & 0x0000FF) - Math.floor(255 * amount));
        return `rgb(${r},${g},${b})`;
    }

    lightenColor(hex, amount) {
        if (hex.startsWith('rgb')) {
            const match = hex.match(/(\d+),\s*(\d+),\s*(\d+)/);
            if (match) {
                const r = Math.min(255, parseInt(match[1]) + Math.floor(255 * amount));
                const g = Math.min(255, parseInt(match[2]) + Math.floor(255 * amount));
                const b = Math.min(255, parseInt(match[3]) + Math.floor(255 * amount));
                return `rgb(${r},${g},${b})`;
            }
        }
        const num = parseInt(hex.slice(1), 16);
        const r = Math.min(255, (num >> 16) + Math.floor(255 * amount));
        const g = Math.min(255, ((num >> 8) & 0x00FF) + Math.floor(255 * amount));
        const b = Math.min(255, (num & 0x0000FF) + Math.floor(255 * amount));
        return `rgb(${r},${g},${b})`;
    }
}

window.Game.Boss = Boss;
