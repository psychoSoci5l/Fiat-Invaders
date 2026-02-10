// Harmonic Conductor - Orchestrates enemy attacks to music beats
// Transforms random enemy fire into choreographed musical patterns
window.Game = window.Game || {};

window.Game.HarmonicConductor = {
    // State
    enabled: true,
    currentSequence: null,
    sequenceLength: 16,
    spiralAngle: 0,

    // v2.22.3: Generation counter to invalidate pending setTimeout callbacks
    generation: 0,

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

    // Pre-allocated reusable arrays (GC pressure fix)
    _tempActive: [],
    _tempTier: [],

    // Cached gradient for PANIC vignette (avoids per-frame allocation)
    _panicGrad: null,
    _panicGradKey: '',

    // Wave Intensity System (Ikeda Choreography)
    waveIntensity: {
        initialCount: 0,          // Enemies at wave start
        currentPhase: 'SETUP',    // SETUP, BUILD, PANIC
        fireRateMult: 1.0,        // Fire rate multiplier for current phase
        lastEnemyPaused: false,   // Has last enemy pause triggered?
        lastEnemyPauseTimer: 0    // Countdown for last enemy pause
    },

    // v4.17: Fire Budget System (BUG 7 fix — limits bullet density)
    _fireBudget: {
        available: 25,            // Current available bullets
        maxPerSecond: 25,         // Current max bullets per second
        lastRechargeTime: 0
    },

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
        // v2.22.3: Increment generation to invalidate pending setTimeout callbacks
        this.generation++;

        // v2.22.5: Track conductor reset
        if (window.Game.Debug) {
            window.Game.Debug.trackConductorReset(this.generation);
        }

        // Reset wave intensity
        this.waveIntensity = {
            initialCount: 0,
            currentPhase: 'SETUP',
            fireRateMult: 1.0,
            lastEnemyPaused: false,
            lastEnemyPauseTimer: 0
        };

        // v4.17: Reset fire budget to full
        this._recalcFireBudgetMax();
        this._fireBudget.available = this._fireBudget.maxPerSecond;
    },

    // Start a new wave with intensity tracking
    startWave(enemyCount) {
        this.waveIntensity.initialCount = enemyCount;
        this.waveIntensity.currentPhase = 'SETUP';
        this.waveIntensity.fireRateMult = 1.0;
        this.waveIntensity.lastEnemyPaused = false;
        this.waveIntensity.lastEnemyPauseTimer = 0;

        // v4.37: Grace period — no enemy fire at wave start
        const graceCfg = window.Game.Balance?.FIRE_BUDGET?.WAVE_GRACE_PERIOD;
        this._graceTimer = graceCfg || 0;

        // v4.17: Reset fire budget to full for new wave
        this._recalcFireBudgetMax();
        this._fireBudget.available = this._fireBudget.maxPerSecond;
    },

    // Get wave progress (0.0 to 1.0)
    getWaveProgress() {
        if (!this.enemies || this.waveIntensity.initialCount === 0) return 0;
        var remaining = 0;
        for (var i = 0, len = this.enemies.length; i < len; i++) {
            if (this.enemies[i] && this.enemies[i].active) remaining++;
        }
        return 1 - (remaining / this.waveIntensity.initialCount);
    },

    // Update intensity phase based on wave progress
    updateIntensityPhase() {
        const Balance = window.Game.Balance;
        const choreography = Balance?.CHOREOGRAPHY?.INTENSITY;
        if (!choreography) return;

        const progress = this.getWaveProgress();
        var remaining = 0;
        if (this.enemies) {
            for (var i = 0, len = this.enemies.length; i < len; i++) {
                if (this.enemies[i] && this.enemies[i].active) remaining++;
            }
        }

        // Determine phase
        let newPhase = 'SETUP';
        let fireRateMult = 1.0;

        if (progress >= choreography.PANIC_START) {
            newPhase = 'PANIC';
            fireRateMult = choreography.PANIC_RATE_MULT || 1.4;
        } else if (progress >= choreography.BUILD_END) {
            newPhase = 'BUILD_LATE';
            fireRateMult = 1.2;
        } else if (progress >= choreography.SETUP_END) {
            newPhase = 'BUILD';
            fireRateMult = 1.1;
        }

        // Apply global fire rate reduction (15% less bullets from normal enemies)
        const globalMult = choreography.FIRE_RATE_GLOBAL_MULT || 1.0;
        fireRateMult *= globalMult;

        // Log phase transitions (for debugging)
        if (newPhase !== this.waveIntensity.currentPhase) {
            this.waveIntensity.currentPhase = newPhase;
            // Visual feedback for phase change
            if (newPhase === 'PANIC') {
                this.beatPulseAlpha = 0.3; // Strong pulse on panic
            }
        }

        this.waveIntensity.fireRateMult = fireRateMult;

        // Last enemy handling
        if (remaining === 1 && !this.waveIntensity.lastEnemyPaused) {
            this.waveIntensity.lastEnemyPaused = true;
            this.waveIntensity.lastEnemyPauseTimer = choreography.LAST_ENEMY_PAUSE || 0.8;
        }
    },

    // Check if in last enemy pause (should not fire)
    isInLastEnemyPause() {
        return this.waveIntensity.lastEnemyPauseTimer > 0;
    },

    // Check if any enemies are still entering formation (should not fire)
    areEnemiesEntering() {
        if (!this.enemies || this.enemies.length === 0) return false;
        for (var i = 0, len = this.enemies.length; i < len; i++) {
            var e = this.enemies[i];
            if (e && e.active && e.isEntering) return true;
        }
        return false;
    },

    // Get last enemy score bonus
    getLastEnemyBonus() {
        const Balance = window.Game.Balance;
        const choreography = Balance?.CHOREOGRAPHY?.INTENSITY;
        return choreography?.LAST_ENEMY_BONUS || 2.0;
    },

    // Get current fire rate multiplier
    getFireRateMult() {
        return this.waveIntensity.fireRateMult;
    },

    // v4.17: Recalculate fire budget max from config + game state
    _recalcFireBudgetMax() {
        const cfg = window.Game.Balance?.FIRE_BUDGET;
        if (!cfg || !cfg.ENABLED) {
            this._fireBudget.maxPerSecond = 999; // No limit
            return;
        }

        const cycle = Math.min((window.marketCycle || 1), 3);
        const idx = cycle - 1;
        let max = cfg.BULLETS_PER_SECOND[idx] || 25;

        // Bear Market bonus
        if (window.isBearMarket) {
            max += cfg.BEAR_MARKET_BONUS || 0;
        }

        // PANIC phase bonus
        if (this.waveIntensity.currentPhase === 'PANIC') {
            max *= cfg.PANIC_MULTIPLIER || 1.3;
        }

        // Rank scaling (±15%)
        const rankSystem = window.Game.RankSystem;
        if (rankSystem) {
            const rank = rankSystem.rank || 0; // -1 to +1
            max *= (1 + rank * (cfg.RANK_SCALE || 0.15));
        }

        this._fireBudget.maxPerSecond = Math.round(max);
    },

    // v4.17: Check if fire budget allows spawning N bullets, consume if OK
    _consumeFireBudget(bulletCount) {
        const cfg = window.Game.Balance?.FIRE_BUDGET;
        if (!cfg || !cfg.ENABLED) return true; // No budget system = always allow

        if (this._fireBudget.available >= bulletCount) {
            this._fireBudget.available -= bulletCount;
            return true;
        }
        return false; // Not enough budget — skip command
    },

    setDifficulty(level, marketCycle, isBearMarket) {
        // Get pattern params from centralized Balance config
        const Balance = window.Game.Balance;
        this.difficultyParams = Balance.getPatternParams(marketCycle, isBearMarket);
    },

    setSequence(wavePattern, intensity, isBearMarket) {
        const Sequences = window.Game.HarmonicSequences;

        // Always ensure we have a valid sequence (never leave currentSequence null)
        this.currentSequence = Sequences?.getSequenceForPattern(wavePattern, intensity, isBearMarket)
            || Sequences?.DEFAULT_BASIC
            || [{ beat: 0, type: 'RANDOM_VOLLEY', count: 3 }]; // Hardcoded ultimate fallback

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
        var max = 15;
        for (var i = 0, len = this.currentSequence.length; i < len; i++) {
            if (this.currentSequence[i].beat > max) max = this.currentSequence[i].beat;
        }
        return max;
    },

    // Main update - called every frame with delta time
    update(dt) {
        this.updateTelegraphs(dt);

        // Update wave intensity phase
        this.updateIntensityPhase();

        // v4.17: Recharge fire budget
        this._recalcFireBudgetMax();
        const maxBPS = this._fireBudget.maxPerSecond;
        this._fireBudget.available += maxBPS * dt;
        // Cap at 1.5x max to prevent excessive accumulation
        const cap = maxBPS * 1.5;
        if (this._fireBudget.available > cap) {
            this._fireBudget.available = cap;
        }

        // Update last enemy pause timer
        if (this.waveIntensity.lastEnemyPauseTimer > 0) {
            this.waveIntensity.lastEnemyPauseTimer -= dt;
        }

        // v4.37: Grace period — suppress all firing at wave start
        if (this._graceTimer > 0) {
            this._graceTimer -= dt;
        }

        // Don't process beats if not enabled or no sequence
        if (!this.enabled || !this.currentSequence) return;
        if (!this.enemies || this.enemies.length === 0) return;

        // Skip firing during grace period
        if (this._graceTimer > 0) return;

        // Skip firing during last enemy pause (dramatic silence)
        if (this.isInLastEnemyPause()) return;

        // Skip firing while enemies are still entering formation
        if (this.areEnemiesEntering()) return;

        // Sync tempo from AudioSystem
        const audio = window.Game.Audio;
        if (audio) {
            this.tempo = audio.tempo || 0.2;
        }

        // Apply fire rate multiplier from intensity phase + rank system
        const rankMult = window.Game.RankSystem ? window.Game.RankSystem.getFireRateMultiplier() : 1.0;
        const effectiveTempo = this.tempo / (this.waveIntensity.fireRateMult * rankMult);

        // Advance beat timer
        this.beatTimer += dt;

        // Check if we've reached the next beat
        if (this.beatTimer >= effectiveTempo) {
            this.beatTimer -= effectiveTempo;
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

        // Execute commands for this beat (no .filter() allocation)
        var seq = this.currentSequence;
        for (var i = 0, len = seq.length; i < len; i++) {
            if (seq[i].beat === beatIndex) this.executeCommand(seq[i]);
        }
    },

    executeCommand(cmd) {
        // v4.17: Estimate bullet count and check fire budget before executing
        const estCount = this._estimateBulletCount(cmd);
        if (estCount > 0 && !this._consumeFireBudget(estCount)) {
            return; // Budget exhausted — skip this command
        }

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

    // v4.17: Estimate how many bullets a command will produce
    _estimateBulletCount(cmd) {
        switch (cmd.type) {
            case 'SYNC_FIRE': {
                const enemies = this.getEnemiesByTier(cmd.tier);
                return cmd.pattern === 'DOUBLE' ? enemies.length * 2 :
                       cmd.pattern === 'BURST' ? enemies.length * 3 :
                       enemies.length;
            }
            case 'SWEEP_LEFT':
            case 'SWEEP_RIGHT':
                return this.getEnemiesByTier(cmd.tier).length;
            case 'CASCADE_DOWN':
            case 'CASCADE_UP': {
                var count = 0;
                if (this.enemies) {
                    for (var i = 0; i < this.enemies.length; i++) {
                        if (this.enemies[i] && this.enemies[i].active) count++;
                    }
                }
                return count;
            }
            case 'PATTERN':
                return cmd.config?.count || this.difficultyParams.maxBullets || 12;
            case 'AIMED_VOLLEY':
                return Math.min(6, this.getEnemiesByTier(cmd.tier).length);
            case 'RANDOM_SINGLE':
                return 1;
            case 'RANDOM_VOLLEY':
                return cmd.count || 5;
            default:
                return 1;
        }
    },

    getEnemiesByTier(tierName) {
        const Sequences = window.Game.HarmonicSequences;
        if (!Sequences || !this.enemies) return this._tempTier;

        // Reuse pre-allocated array (callers must use immediately or .slice())
        var result = this._tempTier;
        result.length = 0;

        var tierIndices = (tierName !== 'ALL') ? Sequences.TIERS[tierName] : null;
        var types = window.Game.FIAT_TYPES || [];

        for (var i = 0, len = this.enemies.length; i < len; i++) {
            var e = this.enemies[i];
            if (!e || !e.active || e.hasSettled === false) continue;
            if (tierIndices) {
                var typeIdx = -1;
                for (var j = 0, tLen = types.length; j < tLen; j++) {
                    if (types[j].s === e.symbol) { typeIdx = j; break; }
                }
                if (tierIndices.indexOf(typeIdx) === -1) continue;
            }
            result.push(e);
        }
        return result;
    },

    // SYNC_FIRE: All enemies of tier fire together
    executeSyncFire(tierName, pattern) {
        const tierEnemies = this.getEnemiesByTier(tierName);
        if (tierEnemies.length === 0) return;

        // Add telegraph
        for (var i = 0; i < tierEnemies.length; i++) {
            this.addTelegraph(tierEnemies[i].x, tierEnemies[i].y, 'ring', this.difficultyParams.telegraphTime,
                pattern === 'BURST' ? '#ff6b6b' : '#4ecdc4');
        }

        // Fire after telegraph delay
        const enemies = tierEnemies.slice(); // Copy array (needed for setTimeout)
        const gen = this.generation; // v2.22.3: Capture generation
        setTimeout(() => {
            if (this.generation !== gen) return; // v2.22.3: Abort if reset occurred
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

        const gen = this.generation; // v2.22.3: Capture generation
        sorted.forEach((e, i) => {
            setTimeout(() => {
                if (this.generation !== gen) return; // v2.22.3: Abort if reset occurred
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
        for (var i = 0, len = this.enemies.length; i < len; i++) {
            var e = this.enemies[i];
            if (!e || !e.active) continue;
            var rowKey = Math.round(e.baseY / 75) * 75;
            if (!rows[rowKey]) rows[rowKey] = [];
            rows[rowKey].push(e);
        }

        const rowKeys = Object.keys(rows).map(Number);
        rowKeys.sort((a, b) => direction === 'down' ? a - b : b - a);

        const gen = this.generation; // v2.22.3: Capture generation
        rowKeys.forEach((rowY, i) => {
            const rowEnemies = rows[rowY].slice();

            setTimeout(() => {
                if (this.generation !== gen) return; // v2.22.3: Abort if reset occurred
                rowEnemies.forEach(e => {
                    if (e && e.active) this.addTelegraph(e.x, e.y, 'ring', delay, '#ff8c00');
                });
            }, i * delay * 500);

            setTimeout(() => {
                if (this.generation !== gen) return; // v2.22.3: Abort if reset occurred
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

        var cx = this.gameWidth / 2;
        var cy = 200;

        // Compute centroid without array allocation
        if (this.enemies) {
            var sumX = 0, sumY = 0, cnt = 0;
            for (var i = 0, len = this.enemies.length; i < len; i++) {
                var e = this.enemies[i];
                if (e && e.active) { sumX += e.x; sumY += e.y; cnt++; }
            }
            if (cnt > 0) { cx = sumX / cnt; cy = sumY / cnt; }
        }

        const scaledConfig = Object.assign({}, config);
        scaledConfig.gapSize = Math.max(this.difficultyParams.gapSize, scaledConfig.gapSize || 80);
        scaledConfig.count = Math.min(this.difficultyParams.maxBullets, scaledConfig.count || 12);
        scaledConfig.width = scaledConfig.width || this.gameWidth - 40;

        this.addTelegraph(cx, cy, 'pattern', 0.2, config.color || '#ff69b4');

        const gen = this.generation; // v2.22.3: Capture generation
        setTimeout(() => {
            if (this.generation !== gen) return; // v2.22.3: Abort if reset occurred
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
        const gen = this.generation; // v2.22.3: Capture generation
        setTimeout(() => {
            if (this.generation !== gen) return; // v2.22.3: Abort if reset occurred
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
        const gen = this.generation; // v2.22.3: Capture generation
        setTimeout(() => {
            if (this.generation !== gen) return; // v2.22.3: Abort if reset occurred
            if (e && e.active) this.fireEnemy(e, 'SINGLE');
        }, 100);
    },

    executeRandomVolley(count) {
        // Build active list without allocation (reuse _tempActive)
        var active = this._tempActive;
        active.length = 0;
        if (this.enemies) {
            for (var i = 0, len = this.enemies.length; i < len; i++) {
                if (this.enemies[i] && this.enemies[i].active) active.push(this.enemies[i]);
            }
        }
        if (active.length === 0) return;

        var numToFire = Math.min(count, active.length);
        // Must snapshot for setTimeout — allocate only what's needed
        var selected = [];
        for (var j = 0; j < numToFire && selected.length < numToFire; j++) {
            var e = active[Math.floor(Math.random() * active.length)];
            if (selected.indexOf(e) === -1) selected.push(e);
        }

        var gen = this.generation;
        for (var k = 0; k < selected.length; k++) {
            (function(enemy, delay, self) {
                setTimeout(function() {
                    if (self.generation !== gen) return;
                    if (enemy && enemy.active) {
                        self.addTelegraph(enemy.x, enemy.y, 'flash', 0.08, '#fff');
                        self.fireEnemy(enemy, 'SINGLE');
                    }
                }, delay);
            })(selected[k], k * 50, this);
        }
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
            // Fire 3 bullets with 120ms delay between each
            // Handle directly with setTimeout since we removed attemptFire()
            const gen = this.generation; // v2.22.3: Capture generation
            for (let i = 0; i < 3; i++) {
                setTimeout(() => {
                    if (this.generation !== gen) return; // v2.22.3: Abort if reset occurred
                    if (enemy?.active) {
                        const bd = enemy.buildBullet(this.player, bulletSpeed, 1);
                        if (bd) {
                            this.spawnBullets([bd]);
                            if (window.Game.Audio) window.Game.Audio.play('enemyShoot');
                        }
                    }
                }, i * 120);
            }
            return; // Early return - handled via setTimeout
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
        // Get telegraph config from Balance
        const Balance = window.Game.Balance;
        const telegraphConfig = Balance?.CHOREOGRAPHY?.TELEGRAPH || {};
        const baseOpacity = telegraphConfig.OPACITY || 0.35;

        // Beat pulse
        if (this.beatPulseAlpha > 0) {
            ctx.fillStyle = `rgba(255, 255, 255, ${this.beatPulseAlpha})`;
            ctx.fillRect(0, 0, this.gameWidth, this.gameHeight);
        }

        // Wave intensity phase indicator
        if (this.waveIntensity.currentPhase === 'PANIC') {
            // Subtle red vignette during panic phase (cached gradient)
            const key = this.gameWidth + '-' + this.gameHeight;
            if (key !== this._panicGradKey) {
                this._panicGrad = ctx.createRadialGradient(
                    this.gameWidth / 2, this.gameHeight / 2, this.gameHeight * 0.3,
                    this.gameWidth / 2, this.gameHeight / 2, this.gameHeight * 0.8
                );
                this._panicGrad.addColorStop(0, 'rgba(255, 0, 0, 0)');
                this._panicGrad.addColorStop(1, 'rgba(255, 0, 0, 0.1)');
                this._panicGradKey = key;
            }
            ctx.fillStyle = this._panicGrad;
            ctx.fillRect(0, 0, this.gameWidth, this.gameHeight);
        }

        this.telegraphs.forEach(tel => {
            const progress = 1 - (tel.timer / tel.maxTimer);
            const alpha = Math.min(baseOpacity, tel.timer * 5) * (baseOpacity / 0.35);

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
                case 'gap':
                    // Safe corridor indicator (Ikeda choreography - readable gaps)
                    const gapColor = telegraphConfig.GAP_COLOR || '#00FF00';
                    ctx.strokeStyle = gapColor;
                    ctx.lineWidth = 2;
                    ctx.setLineDash([3, 3]);
                    // Vertical safe zone lines
                    const gapWidth = tel.gapWidth || 60;
                    ctx.beginPath();
                    ctx.moveTo(tel.x - gapWidth / 2, tel.y);
                    ctx.lineTo(tel.x - gapWidth / 2, this.gameHeight);
                    ctx.moveTo(tel.x + gapWidth / 2, tel.y);
                    ctx.lineTo(tel.x + gapWidth / 2, this.gameHeight);
                    ctx.stroke();
                    ctx.setLineDash([]);
                    // Subtle fill
                    ctx.fillStyle = gapColor;
                    ctx.globalAlpha = alpha * 0.1;
                    ctx.fillRect(tel.x - gapWidth / 2, tel.y, gapWidth, this.gameHeight - tel.y);
                    break;
            }
            ctx.restore();
        });
    },

    // Add gap telegraph for wall patterns
    addGapTelegraph(x, y, gapWidth, duration) {
        const Balance = window.Game.Balance;
        const telegraphConfig = Balance?.CHOREOGRAPHY?.TELEGRAPH || {};
        if (!telegraphConfig.GAP_GLOW) return;

        this.telegraphs.push({
            x, y,
            style: 'gap',
            color: telegraphConfig.GAP_COLOR || '#00FF00',
            gapWidth: gapWidth,
            timer: duration,
            maxTimer: duration
        });
    }
};
