window.Game = window.Game || {};

// WaveManager is a singleton in logic, but we can define it as a class or object attached to Game
window.Game.WaveManager = {
    wave: 1,
    waveInProgress: false,
    intermissionTimer: 0,

    // Horde system (2 hordes per wave)
    currentHorde: 1,              // 1 or 2
    hordeTransitionTimer: 0,
    isHordeTransition: false,
    hordeSpawned: false,          // True if current horde was spawned (to distinguish from game start)

    // Dependencies injected usually, or accessed via Game.State
    init() {
        this.reset();
    },

    reset() {
        this.wave = 1;
        this.waveInProgress = false;
        this.intermissionTimer = 0;
        this.miniBossActive = false;
        // Reset horde state
        this.currentHorde = 1;
        this.hordeTransitionTimer = 0;
        this.isHordeTransition = false;
        this.hordeSpawned = false;
    },

    /**
     * Get waves per cycle from Balance config
     */
    getWavesPerCycle() {
        const Balance = window.Game.Balance;
        return Balance ? Balance.WAVES.PER_CYCLE : 5;
    },

    /**
     * Get hordes per wave from Balance config
     */
    getHordesPerWave() {
        const Balance = window.Game.Balance;
        return Balance?.WAVES?.HORDES_PER_WAVE || 2;
    },

    /**
     * Get horde transition duration from Balance config
     */
    getHordeTransitionDuration() {
        const Balance = window.Game.Balance;
        return Balance?.WAVES?.HORDE_TRANSITION_DURATION || 0.8;
    },

    /**
     * Start horde transition (between horde 1 and horde 2)
     */
    startHordeTransition() {
        this.isHordeTransition = true;
        this.hordeTransitionTimer = this.getHordeTransitionDuration();
    },

    /**
     * Complete horde transition and prepare for horde 2
     */
    completeHordeTransition() {
        this.isHordeTransition = false;
        this.currentHorde = 2;
    },

    update(dt, gameState, enemiesCount, bossActive) {
        // Return new state requests (e.g., GAME_STATE change) or null
        const G = window.Game;

        if (gameState === 'INTERMISSION') {
            this.intermissionTimer -= dt;
            if (this.intermissionTimer <= 0) {
                return { action: 'START_WAVE' };
            }
            return null;
        }

        // Handle horde transition timer
        if (this.isHordeTransition) {
            this.hordeTransitionTimer -= dt;
            if (this.hordeTransitionTimer <= 0) {
                this.completeHordeTransition();
                return { action: 'START_HORDE_2' };
            }
            return null;
        }

        // Don't spawn new waves during mini-boss fight
        if (!bossActive && !this.miniBossActive && enemiesCount === 0 && !this.waveInProgress && gameState === 'PLAY') {
            this.waveInProgress = true;

            // Check if we need to spawn horde 2 or move to next wave
            // IMPORTANT: Only transition to horde 2 if horde 1 was actually spawned and cleared
            // (not at game start when enemies=0 but horde was never spawned)
            if (this.currentHorde === 1 && this.hordeSpawned && this.getHordesPerWave() > 1) {
                // Horde 1 complete, transition to horde 2
                this.hordeSpawned = false; // Reset for horde 2
                return { action: 'START_HORDE_TRANSITION' };
            } else {
                // Either: game start, horde 2 complete, or single horde mode → go to intermission or boss
                this.currentHorde = 1; // Reset for next wave
                this.hordeSpawned = false;
                if (this.wave <= this.getWavesPerCycle()) return { action: 'START_INTERMISSION' };
                else return { action: 'SPAWN_BOSS' };
            }
        }

        return null;
    },

    spawnWave(gameWidth, hordeNumber = 1) {
        const G = window.Game;
        const Balance = G.Balance;
        const enemies = [];

        // Base pattern selection
        let pattern = 'RECT';
        if (this.wave === 2) pattern = 'V_SHAPE';
        if (this.wave === 3) pattern = 'COLUMNS';
        if (this.wave === 4) pattern = 'SINE_WAVE';
        if (this.wave >= 5) pattern = 'RECT';
        // Bear Market: Panic patterns from Wave 2
        if (window.isBearMarket && this.wave >= 2) pattern = 'SINE_WAVE';

        // Horde 2 pattern variant: shift pattern for variety
        if (hordeNumber === 2 && Balance?.WAVES?.HORDE_2_PATTERN_VARIANT) {
            const patternVariants = {
                'RECT': 'V_SHAPE',
                'V_SHAPE': 'COLUMNS',
                'COLUMNS': 'RECT',
                'SINE_WAVE': 'SINE_WAVE' // Keep sine wave intense
            };
            pattern = patternVariants[pattern] || pattern;
        }

        // Reduced grid with larger enemies (4 rows max, wider spacing)
        const rows = pattern === 'COLUMNS' ? 5 : (pattern === 'V_SHAPE' ? 5 : 4);
        const spacing = 75; // Wider spacing for larger enemies
        const cols = Math.floor((gameWidth - 40) / spacing); // Fewer columns
        const startX = (gameWidth - (cols * spacing)) / 2 + (spacing / 2);
        const safeOffset = window.safeAreaInsets?.top || 0;
        const startY = 150 + safeOffset; // Below HUD + safe area
        const maxY = 380;
        const maxRows = Math.min(rows, Math.floor((maxY - startY) / spacing) + 1);

        // SINE WAVE Setup: We spawn them in a line but Enemy.js handles the movement
        if (pattern === 'SINE_WAVE') {
            // Logic handled in Enemy.update
        }

        // Calculate tier boundaries for 1:2:3 ratio (strong:medium:weak)
        // Row 0 = STRONG, next ~33% = MEDIUM, rest = WEAK
        const strongRows = 1; // Always 1 row of strong enemies
        const mediumRows = Math.max(1, Math.floor((maxRows - 1) / 3)); // ~1/3 of remaining
        const weakRows = maxRows - strongRows - mediumRows; // Rest are weak

        for (let r = 0; r < maxRows; r++) {
            for (let c = 0; c < cols; c++) {
                let spawn = false;
                if (pattern === 'RECT') spawn = true;
                else if (pattern === 'V_SHAPE' && Math.abs(c - cols / 2) < (rows - r) + 1) spawn = true;
                else if (pattern === 'COLUMNS' && c % 3 < 2) spawn = true; // More enemies in COLUMNS

                if (spawn) {
                    // Tier distribution: 1:2:3 ratio (strong:medium:weak)
                    // FIAT_TYPES: 0-2 = WEAK, 3-6 = MEDIUM, 7-9 = STRONG
                    let typeIdx;
                    const waveOffset = (this.wave - 1) % 2; // Variety between waves

                    if (r < strongRows) {
                        // Front row(s): STRONG (indices 7-9)
                        typeIdx = 7 + (waveOffset % 3);
                    } else if (r < strongRows + mediumRows) {
                        // Middle rows: MEDIUM (indices 3-6)
                        typeIdx = 3 + ((r - strongRows + waveOffset) % 4);
                    } else {
                        // Back rows: WEAK (indices 0-2)
                        typeIdx = 0 + ((r - strongRows - mediumRows + waveOffset) % 3);
                    }

                    // Scale HP based on unified difficulty (via Balance config)
                    const cycle = window.marketCycle || 1;
                    const level = window.currentLevel || 1;
                    const Balance = window.Game.Balance;
                    const diff = Balance.calculateDifficulty(level, cycle);
                    const scaledHP = Balance.calculateEnemyHP(diff);
                    const baseType = G.FIAT_TYPES[typeIdx];
                    const scaledType = Object.assign({}, baseType, {
                        hp: baseType.hp * scaledHP
                    });
                    // Calculate target position
                    const targetX = startX + c * spacing;
                    const targetY = startY + r * spacing;

                    // Check if formation entry is enabled
                    const formationConfig = Balance?.FORMATION_ENTRY || {};
                    const entryEnabled = formationConfig.ENABLED !== false;
                    const spawnYOffset = formationConfig.SPAWN_Y_OFFSET || -80;
                    const staggerDelay = formationConfig.STAGGER_DELAY || 0.08;

                    // Spawn position: either off-screen (entry) or final position (no entry)
                    const spawnX = entryEnabled ? targetX : targetX;
                    const spawnY = entryEnabled ? spawnYOffset : targetY;

                    const enemy = new G.Enemy(spawnX, spawnY, scaledType);

                    // Set up formation entry if enabled
                    if (entryEnabled) {
                        enemy.isEntering = true;
                        enemy.targetX = targetX;
                        enemy.targetY = targetY;
                        enemy.baseY = targetY; // Set correct baseY for wave patterns later
                        // Stagger delay: row-major order with column variation
                        const enemyIndex = enemies.length;
                        enemy.entryDelay = enemyIndex * staggerDelay;
                        enemy.hasSettled = false;
                    } else {
                        enemy.isEntering = false;
                        enemy.hasSettled = true;
                    }

                    // Set special behaviors based on tier (with chance)
                    const behaviorChance = Math.min(0.5, 0.1 + cycle * 0.1); // 10-50% based on cycle

                    if (typeIdx <= 2) {
                        // WEAK tier: Kamikaze chance
                        enemy.isKamikaze = Math.random() < behaviorChance * 0.5; // Half the chance
                    } else if (typeIdx <= 6) {
                        // MEDIUM tier: Shield chance
                        enemy.hasShield = Math.random() < behaviorChance;
                        if (enemy.hasShield) enemy.activateShield();
                    } else {
                        // STRONG tier: Teleport chance
                        enemy.canTeleport = Math.random() < behaviorChance;
                    }

                    // Fibonacci-based initial fire delay
                    // Enemy 0: fires immediately, others staggered by 0.33s intervals
                    const enemyIndex = enemies.length;
                    if (enemyIndex === 0) {
                        enemy.fireTimer = 0; // First enemy fires immediately
                    } else {
                        // Stagger based on Fibonacci timing + small jitter
                        enemy.fireTimer = (enemyIndex * 0.15) + (Math.random() * 0.2);
                    }
                    enemies.push(enemy);
                }
            }
        }

        // Mark that a horde was spawned (for distinguishing from game start)
        this.hordeSpawned = true;

        // Only increment wave after horde 2 (or if single horde mode)
        const hordesPerWave = this.getHordesPerWave();
        if (hordeNumber >= hordesPerWave) {
            this.wave++;
        }
        this.waveInProgress = false;
        return { enemies: enemies, pattern: pattern, hordeNumber: hordeNumber };
    }
};
