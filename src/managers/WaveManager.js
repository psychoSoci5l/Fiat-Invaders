window.Game = window.Game || {};

// WaveManager is a singleton in logic, but we can define it as a class or object attached to Game
window.Game.WaveManager = {
    wave: 1,
    waveInProgress: false,
    intermissionTimer: 0,

    // Dependencies injected usually, or accessed via Game.State
    init() {
        this.reset();
    },

    reset() {
        this.wave = 1;
        this.waveInProgress = false;
        this.intermissionTimer = 0;
    },

    update(dt, gameState, enemies, bossActive) {
        // Return new state requests (e.g., GAME_STATE change) or null
        const G = window.Game;

        if (gameState === 'INTERMISSION') {
            this.intermissionTimer -= dt;
            if (this.intermissionTimer <= 0) {
                return { action: 'START_WAVE' };
            }
            return null;
        }

        // Count Real Enemies (Exclude Minions)
        const realEnemyCount = enemies ? enemies.filter(e => !e.isMinion).length : 0;

        if (!bossActive && realEnemyCount === 0 && !this.waveInProgress && gameState === 'PLAY') {
            this.waveInProgress = true;
            if (this.wave <= 3) return { action: 'START_INTERMISSION' };
            else return { action: 'SPAWN_BOSS' };
        }

        return null;
    },

    spawnWave(gameWidth) {
        const G = window.Game;
        const enemies = [];

        let pattern = 'RECT';
        if (this.wave === 2) pattern = (window.isBearMarket ? 'PANIC' : 'V_SHAPE');
        if (this.wave >= 3) pattern = (this.wave % 2 === 0) ? 'SINE_WAVE' : 'COLUMNS';
        if (this.wave >= 4) pattern = 'PANIC'; // Earlier Panic normally
        if (window.isBearMarket && this.wave >= 2) pattern = 'PANIC'; // CONSTANT PANIC in Bear Market

        const rows = pattern === 'COLUMNS' ? 7 : (pattern === 'V_SHAPE' ? 6 : 6); // UI FIX: 6 Rows (Clean density)
        const spacing = 50; // UI FIX: 50px (Visual gap)
        const cols = Math.floor((gameWidth - 20) / spacing);
        const startX = (gameWidth - (cols * spacing)) / 2 + (spacing / 2);

        // SINE WAVE Setup: We spawn them in a line but Enemy.js handles the movement
        if (pattern === 'SINE_WAVE') {
            // Logic handled in Enemy.update
        }

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                let spawn = false;
                if (pattern === 'RECT') spawn = true;
                else if (pattern === 'V_SHAPE' && Math.abs(c - cols / 2) < (rows - r) + 1) spawn = true;
                else if (pattern === 'COLUMNS' && c % 5 < 2) spawn = true;

                if (spawn) {
                    let typeIdx = Math.max(0, 3 - Math.floor(r / 2));
                    // Check bounds of FIAT_TYPES
                    if (typeIdx >= G.FIAT_TYPES.length) typeIdx = G.FIAT_TYPES.length - 1;

                    let p = G.FIAT_TYPES[typeIdx];
                    enemies.push(new G.Enemy(startX + c * spacing, 180 + r * spacing, p));
                }
            }
        }

        this.wave++;
        this.waveInProgress = false;
        this.lastSpawnCount = enemies.length; // Track for frenzy speed
        return { enemies: enemies, pattern: pattern };
    }
};
