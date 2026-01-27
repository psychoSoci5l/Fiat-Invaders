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
            // PROGRESSION: 5 Levels then Boss
            if (this.wave <= 5) return { action: 'START_INTERMISSION' };
            else return { action: 'SPAWN_BOSS' };
        }

        return null;
    },

    spawnWave(gameWidth) {
        const G = window.Game;
        const enemies = [];

        // STRICT PROGRESSION PATTERNS
        let pattern = 'RECT';
        if (this.wave === 1) pattern = 'RECT';
        else if (this.wave === 2) pattern = 'V_SHAPE';
        else if (this.wave === 3) pattern = 'COLUMNS';
        else if (this.wave === 4) pattern = 'PANIC';
        else if (this.wave === 5) pattern = 'RECT'; // "The Wall" - dense

        // Overrides
        if (window.isBearMarket) pattern = 'PANIC';

        // Configuration per Pattern
        let rows = 4;
        let spacing = 55;
        let startY = 80;

        if (pattern === 'RECT') { rows = 4; spacing = 55; }
        if (pattern === 'V_SHAPE') { rows = 5; spacing = 60; } // Wings
        if (pattern === 'COLUMNS') { rows = 6; spacing = 50; } // Tall columns
        if (pattern === 'PANIC') { rows = 4; spacing = 70; } // Sparse
        if (this.wave === 5) { rows = 6; spacing = 45; } // THE WALL (Dense)

        const cols = Math.floor((gameWidth - 20) / spacing);
        const startX = (gameWidth - (cols * spacing)) / 2 + (spacing / 2);

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                let spawn = false;

                if (pattern === 'RECT') spawn = true;
                else if (pattern === 'V_SHAPE') {
                    // V Shape logic: Row 0 is center, Row 4 is wide? Or inverse?
                    // Let's do Standard V (Bird): Center is lowest (highest row index), edges are highest (lowest row index)?
                    // Or simple Abs:
                    const center = Math.floor(cols / 2);
                    if (Math.abs(c - center) === r) spawn = true; // Thin V
                    // Let's do Filled V?
                    // if (Math.abs(c - center) <= r) spawn = true; // Triangle
                    // Let's stick to the previous "Seagull" logic which was roughly valid
                    if (Math.abs(c - center) < (rows - r)) spawn = true; // Inverted Pyramid?
                }
                else if (pattern === 'COLUMNS') {
                    if (c % 4 !== 0) spawn = true; // Gaps every 4
                }
                else if (pattern === 'PANIC') {
                    if (Math.random() > 0.4) spawn = true;
                }

                // FORCE THE WALL (Wave 5)
                if (this.wave === 5) spawn = true;

                if (spawn) {
                    let typeIdx = Math.floor(r / 2); // 0,0, 1,1, 2,2
                    if (typeIdx >= G.FIAT_TYPES.length) typeIdx = G.FIAT_TYPES.length - 1;

                    // Stronger enemies on Wave 5
                    if (this.wave === 5) typeIdx = Math.min(typeIdx + 1, G.FIAT_TYPES.length - 1);

                    let p = G.FIAT_TYPES[typeIdx];
                    enemies.push(new G.Enemy(startX + c * spacing, startY + r * spacing, p));
                }
            }
        }

        this.wave++;
        this.waveInProgress = false;
        this.lastSpawnCount = enemies.length;
        return { enemies: enemies, pattern: pattern };
    }
};
