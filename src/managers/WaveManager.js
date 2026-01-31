window.Game = window.Game || {};

// WaveManager is a singleton in logic, but we can define it as a class or object attached to Game
window.Game.WaveManager = {
    wave: 1,
    waveInProgress: false,
    intermissionTimer: 0,
    wavesPerCycle: 5,

    // Dependencies injected usually, or accessed via Game.State
    init() {
        this.reset();
    },

    reset() {
        this.wave = 1;
        this.waveInProgress = false;
        this.intermissionTimer = 0;
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

        if (!bossActive && enemiesCount === 0 && !this.waveInProgress && gameState === 'PLAY') {
            this.waveInProgress = true;
            if (this.wave <= this.wavesPerCycle) return { action: 'START_INTERMISSION' };
            else return { action: 'SPAWN_BOSS' };
        }

        return null;
    },

    spawnWave(gameWidth) {
        const G = window.Game;
        const enemies = [];

        let pattern = 'RECT';
        if (this.wave === 2) pattern = 'V_SHAPE';
        if (this.wave === 3) pattern = 'COLUMNS';
        if (this.wave === 4) pattern = 'SINE_WAVE';
        if (this.wave >= 5) pattern = 'RECT';
        // Bear Market: Panic patterns from Wave 2
        if (window.isBearMarket && this.wave >= 2) pattern = 'SINE_WAVE';

        const rows = pattern === 'COLUMNS' ? 6 : (pattern === 'V_SHAPE' ? 6 : 5);
        const spacing = 60;
        const cols = Math.floor((gameWidth - 20) / spacing);
        const startX = (gameWidth - (cols * spacing)) / 2 + (spacing / 2);
        const startY = 140;
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

                    // Scale HP based on unified difficulty
                    const cycle = window.marketCycle || 1;
                    const level = window.currentLevel || 1;
                    const base = (level - 1) * 0.08;
                    const cycleBonus = (cycle - 1) * 0.20;
                    const diff = Math.min(0.85, base + cycleBonus);
                    const scaledHP = 10 + Math.floor(diff * 15);
                    const baseType = G.FIAT_TYPES[typeIdx];
                    const scaledType = Object.assign({}, baseType, {
                        hp: baseType.hp * scaledHP
                    });
                    const enemy = new G.Enemy(startX + c * spacing, startY + r * spacing, scaledType);

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

        this.wave++;
        this.waveInProgress = false;
        return { enemies: enemies, pattern: pattern };
    }
};
