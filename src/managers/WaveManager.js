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

        for (let r = 0; r < maxRows; r++) {
            for (let c = 0; c < cols; c++) {
                let spawn = false;
                if (pattern === 'RECT') spawn = true;
                else if (pattern === 'V_SHAPE' && Math.abs(c - cols / 2) < (rows - r) + 1) spawn = true;
                else if (pattern === 'COLUMNS' && c % 3 < 2) spawn = true; // More enemies in COLUMNS

                if (spawn) {
                    let typeIdx = Math.max(0, 3 - Math.floor(r / 2));
                    // Check bounds of FIAT_TYPES
                    if (typeIdx >= G.FIAT_TYPES.length) typeIdx = G.FIAT_TYPES.length - 1;

                    // Scale HP based on cycle (accessed from window.marketCycle or default 1)
                    const cycle = window.marketCycle || 1;
                    const baseType = G.FIAT_TYPES[typeIdx];
                    const scaledType = Object.assign({}, baseType, {
                        hp: baseType.hp * (10 + (cycle - 1) * 5) // 10 HP base, +5 per cycle
                    });
                    enemies.push(new G.Enemy(startX + c * spacing, startY + r * spacing, scaledType));
                }
            }
        }

        this.wave++;
        this.waveInProgress = false;
        return { enemies: enemies, pattern: pattern };
    }
};
