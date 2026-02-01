// Harmonic Conductor - Orchestrates enemy attacks to music beats
// Transforms random enemy fire into choreographed musical patterns
window.Game = window.Game || {};

window.Game.HarmonicConductor = {
    // State
    enabled: true,
    currentSequence: null,
    sequenceLength: 16,
    spiralAngle: 0,

    // Beat timing (self-managed, synced to audio tempo)
    beatTimer: 0,
    currentBeat: 0,
    tempo: 0.2, // Seconds per beat (synced from AudioSystem)

    // Cached references (set on init)
    enemies: null,
    player: null,
    gameWidth: 600,
    gameHeight: 800,

    // Difficulty scaling
    difficultyParams: {
        gapSize: 100,
        telegraphTime: 0.3,
        maxBullets: 12,
        complexity: 1
    },

    // Telegraph tracking for visual feedback
    telegraphs: [],

    // Beat pulse visual
    beatPulseAlpha: 0,

    init(enemies, player, gameWidth, gameHeight) {
        this.enemies = enemies;
        this.player = player;
        this.gameWidth = gameWidth;
        this.gameHeight = gameHeight;
        this.beatTimer = 0;
        this.currentBeat = 0;
        this.telegraphs = [];
        this.spiralAngle = 0;
    },

    reset() {
        this.currentSequence = null;
        this.beatTimer = 0;
        this.currentBeat = 0;
        this.telegraphs = [];
        this.spiralAngle = 0;
        this.beatPulseAlpha = 0;
    },

    setDifficulty(level, marketCycle, isBearMarket) {
        const base = (level - 1) * 0.08;
        const cycleBonus = (marketCycle - 1) * 0.20;
        const diff = Math.min(0.85, base + cycleBonus);

        if (level === 1) {
            this.difficultyParams = {
                gapSize: 100,
                telegraphTime: 0.3,
                maxBullets: 12,
                complexity: 1
            };
        } else if (level <= 3) {
            this.difficultyParams = {
                gapSize: 80,
                telegraphTime: 0.2,
                maxBullets: 25,
                complexity: 2
            };
        } else if (level <= 5) {
            this.difficultyParams = {
                gapSize: 65,
                telegraphTime: 0.15,
                maxBullets: 40,
                complexity: 3
            };
        } else {
            this.difficultyParams = {
                gapSize: 55,
                telegraphTime: 0.12,
                maxBullets: 60,
                complexity: 4
            };
        }

        if (isBearMarket) {
            this.difficultyParams.gapSize = Math.max(50, this.difficultyParams.gapSize - 10);
            this.difficultyParams.telegraphTime *= 0.8;
            this.difficultyParams.maxBullets = Math.min(80, this.difficultyParams.maxBullets * 1.3);
            this.difficultyParams.complexity = Math.min(5, this.difficultyParams.complexity + 1);
        }
    },

    setSequence(wavePattern, intensity, isBearMarket) {
        const Sequences = window.Game.HarmonicSequences;
        if (!Sequences) return;

        this.currentSequence = Sequences.getSequenceForPattern(wavePattern, intensity, isBearMarket);
        this.sequenceLength = this.getSequenceMaxBeat() + 1;
        this.currentBeat = 0;
        this.beatTimer = 0;
    },

    setBossSequence(phase) {
        const Sequences = window.Game.HarmonicSequences;
        if (!Sequences) return;

        this.currentSequence = Sequences.getBossSequence(phase);
        this.sequenceLength = 16;
    },

    getSequenceMaxBeat() {
        if (!this.currentSequence) return 15;
        let max = 15;
        this.currentSequence.forEach(cmd => {
            if (cmd.beat > max) max = cmd.beat;
        });
        return max;
    },

    // Main update - called every frame with delta time
    update(dt) {
        this.updateTelegraphs(dt);

        // Don't process beats if not enabled or no sequence
        if (!this.enabled || !this.currentSequence) return;
        if (!this.enemies || this.enemies.length === 0) return;

        // Sync tempo from AudioSystem
        const audio = window.Game.Audio;
        if (audio) {
            this.tempo = audio.tempo || 0.2;
        }

        // Advance beat timer
        this.beatTimer += dt;

        // Check if we've reached the next beat
        if (this.beatTimer >= this.tempo) {
            this.beatTimer -= this.tempo;
            this.processBeat(this.currentBeat);
            this.currentBeat = (this.currentBeat + 1) % this.sequenceLength;
        }

        // Advance spiral angle
        this.spiralAngle += dt * 1.5;
    },

    // Process a single beat
    processBeat(beatIndex) {
        // Visual beat pulse on kick beats
        if (beatIndex === 0 || beatIndex === 8) {
            this.beatPulseAlpha = 0.05;
        }

        // Find commands for this beat
        const commands = this.currentSequence.filter(cmd => cmd.beat === beatIndex);
        commands.forEach(cmd => this.executeCommand(cmd));
    },

    executeCommand(cmd) {
        switch (cmd.type) {
            case 'SYNC_FIRE':
                this.executeSyncFire(cmd.tier, cmd.pattern);
                break;
            case 'SWEEP_LEFT':
                this.executeSweep('left', cmd.tier, cmd.delay || 0.1);
                break;
            case 'SWEEP_RIGHT':
                this.executeSweep('right', cmd.tier, cmd.delay || 0.1);
                break;
            case 'CASCADE_DOWN':
                this.executeCascade('down', cmd.delay || 0.15);
                break;
            case 'CASCADE_UP':
                this.executeCascade('up', cmd.delay || 0.15);
                break;
            case 'PATTERN':
                this.executePattern(cmd.name, cmd.config || {});
                break;
            case 'AIMED_VOLLEY':
                this.executeAimedVolley(cmd.tier, cmd.spread || 0.4);
                break;
            case 'RANDOM_SINGLE':
                if (Math.random() < (cmd.chance || 0.3)) {
                    this.executeRandomSingle(cmd.tier);
                }
                break;
            case 'RANDOM_VOLLEY':
                this.executeRandomVolley(cmd.count || 5);
                break;
        }
    },

    getEnemiesByTier(tierName) {
        const Sequences = window.Game.HarmonicSequences;
        if (!Sequences || !this.enemies) return [];

        const activeEnemies = this.enemies.filter(e => e && e.active);
        if (tierName === 'ALL') return activeEnemies;

        const tierIndices = Sequences.TIERS[tierName];
        if (!tierIndices) return activeEnemies;

        return activeEnemies.filter(e => {
            const types = window.Game.FIAT_TYPES || [];
            const typeIdx = types.findIndex(t => t.s === e.symbol);
            return tierIndices.includes(typeIdx);
        });
    },

    // SYNC_FIRE: All enemies of tier fire together
    executeSyncFire(tierName, pattern) {
        const tierEnemies = this.getEnemiesByTier(tierName);
        if (tierEnemies.length === 0) return;

        // Add telegraph
        tierEnemies.forEach(e => {
            this.addTelegraph(e.x, e.y, 'ring', this.difficultyParams.telegraphTime,
                pattern === 'BURST' ? '#ff6b6b' : '#4ecdc4');
        });

        // Fire after telegraph delay
        const enemies = tierEnemies.slice(); // Copy array
        setTimeout(() => {
            enemies.forEach(e => {
                if (e && e.active) this.fireEnemy(e, pattern);
            });
        }, this.difficultyParams.telegraphTime * 1000);
    },

    // SWEEP: Sequential fire across enemies
    executeSweep(direction, tierName, delay) {
        const tierEnemies = this.getEnemiesByTier(tierName);
        if (tierEnemies.length === 0) return;

        const sorted = tierEnemies.slice().sort((a, b) =>
            direction === 'left' ? a.x - b.x : b.x - a.x
        );

        sorted.forEach((e, i) => {
            setTimeout(() => {
                if (e && e.active) {
                    this.addTelegraph(e.x, e.y, 'flash', 0.1, '#fff');
                    this.fireEnemy(e, 'SINGLE');
                }
            }, i * delay * 1000);
        });
    },

    // CASCADE: Row by row fire
    executeCascade(direction, delay) {
        if (!this.enemies || this.enemies.length === 0) return;

        const rows = {};
        this.enemies.forEach(e => {
            if (!e || !e.active) return;
            const rowKey = Math.round(e.baseY / 75) * 75;
            if (!rows[rowKey]) rows[rowKey] = [];
            rows[rowKey].push(e);
        });

        const rowKeys = Object.keys(rows).map(Number);
        rowKeys.sort((a, b) => direction === 'down' ? a - b : b - a);

        rowKeys.forEach((rowY, i) => {
            const rowEnemies = rows[rowY].slice();

            setTimeout(() => {
                this.addTelegraph(this.gameWidth / 2, rowY, 'fullbar', delay, '#ff8c00');
            }, i * delay * 500);

            setTimeout(() => {
                rowEnemies.forEach(e => {
                    if (e && e.active) this.fireEnemy(e, 'SINGLE');
                });
            }, (i + 1) * delay * 1000);
        });
    },

    // PATTERN: Use BulletPatterns.js
    executePattern(patternName, config) {
        const Patterns = window.Game.BulletPatterns;
        if (!Patterns || !Patterns[patternName]) return;

        let cx = this.gameWidth / 2;
        let cy = 200;

        const active = this.enemies ? this.enemies.filter(e => e && e.active) : [];
        if (active.length > 0) {
            cx = active.reduce((sum, e) => sum + e.x, 0) / active.length;
            cy = active.reduce((sum, e) => sum + e.y, 0) / active.length;
        }

        const scaledConfig = Object.assign({}, config);
        scaledConfig.gapSize = Math.max(this.difficultyParams.gapSize, scaledConfig.gapSize || 80);
        scaledConfig.count = Math.min(this.difficultyParams.maxBullets, scaledConfig.count || 12);
        scaledConfig.width = scaledConfig.width || this.gameWidth - 40;

        this.addTelegraph(cx, cy, 'pattern', 0.2, config.color || '#ff69b4');

        setTimeout(() => {
            let bullets = [];
            const px = this.player ? this.player.x : cx;
            const py = this.player ? this.player.y : cy + 200;

            if (patternName === 'curtain') {
                bullets = Patterns.curtain(cx, cy, px, scaledConfig);
            } else if (patternName === 'spiral') {
                bullets = Patterns.spiral(cx, cy, this.spiralAngle, scaledConfig);
            } else if (patternName === 'expandingRing') {
                bullets = Patterns.expandingRing(cx, cy, this.spiralAngle, scaledConfig);
            } else if (patternName === 'flower') {
                bullets = Patterns.flower(cx, cy, this.spiralAngle, scaledConfig);
            } else if (patternName === 'doubleHelix') {
                bullets = Patterns.doubleHelix(cx, cy, this.spiralAngle, scaledConfig);
            } else if (patternName === 'sineWave') {
                bullets = Patterns.sineWave(cx, cy, this.spiralAngle, scaledConfig);
            } else if (patternName === 'aimedBurst') {
                bullets = Patterns.aimedBurst(cx, cy, px, py, scaledConfig);
            }

            bullets = bullets.slice(0, this.difficultyParams.maxBullets);
            if (bullets.length > 0) {
                this.spawnBullets(bullets);
            }
        }, 200);
    },

    // AIMED_VOLLEY: Enemies fire at player
    executeAimedVolley(tierName, spread) {
        const tierEnemies = this.getEnemiesByTier(tierName);
        if (tierEnemies.length === 0) return;

        const shooters = tierEnemies.slice(0, 6);

        shooters.forEach(e => {
            this.addTelegraph(e.x, e.y, 'aimed', 0.25, '#ff4444');
        });

        const enemies = shooters.slice();
        setTimeout(() => {
            enemies.forEach(e => {
                if (e && e.active) this.fireEnemy(e, 'AIMED', spread);
            });
        }, 250);
    },

    executeRandomSingle(tierName) {
        const tierEnemies = this.getEnemiesByTier(tierName);
        if (tierEnemies.length === 0) return;

        const e = tierEnemies[Math.floor(Math.random() * tierEnemies.length)];
        if (!e || !e.active) return;

        this.addTelegraph(e.x, e.y, 'ring', 0.1, '#fff');
        setTimeout(() => {
            if (e && e.active) this.fireEnemy(e, 'SINGLE');
        }, 100);
    },

    executeRandomVolley(count) {
        const active = this.enemies ? this.enemies.filter(e => e && e.active) : [];
        if (active.length === 0) return;

        const selected = [];
        const numToFire = Math.min(count, active.length);

        for (let i = 0; i < numToFire && selected.length < numToFire; i++) {
            const e = active[Math.floor(Math.random() * active.length)];
            if (!selected.includes(e)) selected.push(e);
        }

        selected.forEach((e, i) => {
            setTimeout(() => {
                if (e && e.active) {
                    this.addTelegraph(e.x, e.y, 'flash', 0.08, '#fff');
                    this.fireEnemy(e, 'SINGLE');
                }
            }, i * 50);
        });
    },

    // Fire a single enemy
    fireEnemy(enemy, pattern, spread) {
        if (!enemy || !enemy.active) return;
        if (!this.player) return;

        const bulletSpeed = 150 + (this.difficultyParams.complexity * 15);
        let bulletData = null;

        if (pattern === 'DOUBLE') {
            const b1 = enemy.buildBullet(this.player, bulletSpeed, 1, -0.08);
            const b2 = enemy.buildBullet(this.player, bulletSpeed, 1, 0.08);
            bulletData = [b1, b2];
        } else if (pattern === 'BURST') {
            enemy.burstCount = 2;
            enemy.burstTimer = 0.12;
            bulletData = enemy.buildBullet(this.player, bulletSpeed, 1);
        } else if (pattern === 'AIMED') {
            const oldSpread = enemy.aimSpread;
            enemy.aimSpread = spread || 0.1;
            bulletData = enemy.buildBullet(this.player, bulletSpeed, 0.5);
            enemy.aimSpread = oldSpread;
        } else {
            bulletData = enemy.buildBullet(this.player, bulletSpeed, 1);
        }

        if (bulletData) {
            const bullets = Array.isArray(bulletData) ? bulletData : [bulletData];
            this.spawnBullets(bullets);
            if (window.Game.Audio) window.Game.Audio.play('enemyShoot');
        }
    },

    // Spawn bullets via event
    spawnBullets(bullets) {
        if (window.Game.Events) {
            window.Game.Events.emit('harmonic_bullets', { bullets: bullets });
        }
    },

    // Telegraph management
    addTelegraph(x, y, style, duration, color) {
        this.telegraphs.push({
            x, y, style, color: color || '#fff',
            timer: duration,
            maxTimer: duration
        });
    },

    updateTelegraphs(dt) {
        for (let i = this.telegraphs.length - 1; i >= 0; i--) {
            this.telegraphs[i].timer -= dt;
            if (this.telegraphs[i].timer <= 0) {
                this.telegraphs.splice(i, 1);
            }
        }
        if (this.beatPulseAlpha > 0) {
            this.beatPulseAlpha -= dt * 0.5;
        }
    },

    draw(ctx) {
        // Beat pulse
        if (this.beatPulseAlpha > 0) {
            ctx.fillStyle = `rgba(255, 255, 255, ${this.beatPulseAlpha})`;
            ctx.fillRect(0, 0, this.gameWidth, this.gameHeight);
        }

        this.telegraphs.forEach(tel => {
            const progress = 1 - (tel.timer / tel.maxTimer);
            const alpha = Math.min(1, tel.timer * 5);

            ctx.save();
            ctx.globalAlpha = alpha;

            switch (tel.style) {
                case 'ring':
                    ctx.strokeStyle = tel.color;
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.arc(tel.x, tel.y, 15 + progress * 15, 0, Math.PI * 2);
                    ctx.stroke();
                    break;
                case 'fullbar':
                    ctx.fillStyle = tel.color;
                    ctx.globalAlpha = alpha * 0.5;
                    ctx.fillRect(0, tel.y - 3, this.gameWidth, 6);
                    break;
                case 'flash':
                    ctx.fillStyle = '#fff';
                    ctx.beginPath();
                    ctx.arc(tel.x, tel.y, 20, 0, Math.PI * 2);
                    ctx.fill();
                    break;
                case 'aimed':
                    if (this.player) {
                        ctx.strokeStyle = tel.color;
                        ctx.lineWidth = 2;
                        ctx.setLineDash([5, 5]);
                        ctx.beginPath();
                        ctx.moveTo(tel.x, tel.y);
                        ctx.lineTo(this.player.x, this.player.y);
                        ctx.stroke();
                        ctx.setLineDash([]);
                    }
                    break;
                case 'pattern':
                    ctx.strokeStyle = tel.color;
                    ctx.lineWidth = 2;
                    for (let i = 0; i < 6; i++) {
                        const angle = (i / 6) * Math.PI * 2 + progress * Math.PI;
                        const r = 30 + progress * 20;
                        ctx.beginPath();
                        ctx.moveTo(tel.x, tel.y);
                        ctx.lineTo(tel.x + Math.cos(angle) * r, tel.y + Math.sin(angle) * r);
                        ctx.stroke();
                    }
                    break;
            }
            ctx.restore();
        });
    }
};
