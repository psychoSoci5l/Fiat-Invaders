// ArcadeMiniBossSystem Unit Test — Task 4
// Verifica threshold, cooldown, max per wave, HP scaling, bloc config.

const assert = require('assert');
const path = require('path');

if (!global.window) global.window = { Game: {} };

// Mock RunState
window.Game.RunState = {
    fiatKillCounter: { '$': 0, '€': 0, '¥': 0, '₽': 0, '₹': 0, '£': 0, '₣': 0, '₺': 0, '元': 0, 'Ⓒ': 0 },
    lastMiniBossSpawnTime: 0,
    miniBossThisWave: 0,
    perks: []
};

// Mock Balance
window.Game.Balance = {
    MINI_BOSS: {
        CURRENCY_BOSS_MAP: {
            '$': { threshold: 22 },
            '€': { threshold: 22 },
            '¥': { threshold: 18 },
            '₽': { threshold: 35 },
            'Ⓒ': { threshold: 24 }
        },
        COOLDOWN: 15.0,
        MAX_PER_WAVE: 2
    },
    ARCADE: {
        MINI_BOSS: {
            COOLDOWN: 10.0,
            MAX_PER_WAVE: 3,
            THRESHOLD_MULT: 0.65,
            HP_MULT: 0.50,
            HP_MULT_PER_BLOC: { USA: 1.0, EU: 1.0, ASIA: 1.0, EMERGING: 1.0 },
            FIRE_RATE_PER_BLOC: { USA: 1.0, EU: 1.0, ASIA: 1.0, EMERGING: 1.0 }
        },
        MINI_BOSS_PATTERNS: {
            BLOCS: {
                USA: ['$', 'C$', 'Ⓒ'],
                EU: ['€', '£', '₣', '₺'],
                ASIA: ['¥', '₩', '₹', '元'],
                EMERGING: ['₽', '₹', '₺']
            },
            USA: { hpMult: 1.0, fireRate: 1.0 },
            EU: { hpMult: 1.1, fireRate: 0.9 },
            ASIA: { hpMult: 0.9, fireRate: 1.1 },
            EMERGING: { hpMult: 1.2, fireRate: 0.8 }
        }
    },
    BOSS: { HP: { PERK_SCALE: 0.10 } },
    calculateBossHP: (level, cycle) => 500
};

// Mock ArcadeModifiers
window.Game.ArcadeModifiers = {
    isArcadeMode: () => true
};

// Mock MiniBossManager
let spawnCalls = [];
window.Game.MiniBossManager = {
    spawn: (symbol, color) => {
        spawnCalls.push({ symbol, color });
    },
    isActive: () => false
};

// Mock getTotalTime
let _mockTotalTime = 0;
window.Game.getTotalTime = () => _mockTotalTime;

// Mock Debug
window.Game.Debug = {
    log: () => {},
    trackMiniBossSpawn: () => {},
    _miniBossStartInfo: null
};

require(path.join(__dirname, '../../../src/systems/ArcadeMiniBossSystem.js'));

const G = global.window.Game;
const mbSys = G.ArcadeMiniBossSystem;

function suite(name, fn) {
    console.log(`  [ArcadeMiniBossSystem] ${name}`);
    fn(assert);
}

function resetState() {
    G.RunState.fiatKillCounter = { '$': 0, '€': 0, '¥': 0, '₽': 0, '₹': 0, '£': 0, '₣': 0, '₺': 0, '元': 0, 'Ⓒ': 0 };
    G.RunState.lastMiniBossSpawnTime = -100; // bypass cooldown
    G.RunState.miniBossThisWave = 0;
    G.RunState.perks = [];
    spawnCalls = [];
}

suite('onEnemyKilled increments counter for symbol', (a) => {
    resetState();
    mbSys.onEnemyKilled({ symbol: '$', isMinion: false });
    a(G.RunState.fiatKillCounter['$'] === 1, `counter should be 1, got ${G.RunState.fiatKillCounter['$']}`);
});

suite('threshold check spawns miniboss at correct Arcade threshold', (a) => {
    resetState();
    // Arcade threshold for $ = floor(22 * 0.65) = 14
    for (let i = 0; i < 13; i++) {
        mbSys.onEnemyKilled({ symbol: '$', isMinion: false });
    }
    a(spawnCalls.length === 0, 'should not spawn before threshold');
    mbSys.onEnemyKilled({ symbol: '$', isMinion: false });
    a(spawnCalls.length === 1, 'should spawn at threshold (14)');
    a(spawnCalls[0].symbol === '$', `spawned symbol should be $, got ${spawnCalls[0].symbol}`);
});

suite('cooldown prevents spawn within cooldown window', (a) => {
    resetState();
    _mockTotalTime = 0;
    // Spawn first miniboss
    for (let i = 0; i < 14; i++) mbSys.onEnemyKilled({ symbol: '$', isMinion: false });
    a(spawnCalls.length === 1);
    // Reset counter but simulate cooldown still active
    G.RunState.fiatKillCounter['$'] = 0;
    G.RunState.miniBossThisWave = 1;
    G.RunState.lastMiniBossSpawnTime = 5.0; // spawned at t=5
    // Try again at t=14 (9s later, cooldown is 10s)
    _mockTotalTime = 14.0;
    for (let i = 0; i < 14; i++) mbSys.onEnemyKilled({ symbol: '$', isMinion: false });
    a(spawnCalls.length === 1, 'should not spawn during cooldown');
    // Try again at t=15.1 (>10s later)
    _mockTotalTime = 15.1;
    for (let i = 0; i < 14; i++) mbSys.onEnemyKilled({ symbol: '$', isMinion: false });
    a(spawnCalls.length === 2, 'should spawn after cooldown');
});

suite('max per wave caps spawn', (a) => {
    resetState();
    G.RunState.miniBossThisWave = 3; // already at max
    for (let i = 0; i < 14; i++) mbSys.onEnemyKilled({ symbol: '$', isMinion: false });
    a(spawnCalls.length === 0, 'should not spawn when max per wave reached');
});

suite('minion kills do not count', (a) => {
    resetState();
    mbSys.onEnemyKilled({ symbol: '$', isMinion: true });
    a(G.RunState.fiatKillCounter['$'] === 0, 'minion kill should not increment counter');
});

suite('getMiniBossConfig returns correct bloc', (a) => {
    const cfg = mbSys.getMiniBossConfig('$');
    a(cfg.bloc === 'USA', `bloc should be USA, got ${cfg.bloc}`);
    a(cfg.hpMult === 1.0, `USA hpMult should be 1.0, got ${cfg.hpMult}`);
    a(cfg.fireRate === 1.0, `USA fireRate should be 1.0, got ${cfg.fireRate}`);

    const cfg2 = mbSys.getMiniBossConfig('€');
    a(cfg2.bloc === 'EU', `bloc should be EU, got ${cfg2.bloc}`);
    a(cfg2.hpMult === 1.1, `EU hpMult should be 1.1, got ${cfg2.hpMult}`);
});

suite('spawn resets counter for that currency', (a) => {
    resetState();
    for (let i = 0; i < 14; i++) mbSys.onEnemyKilled({ symbol: '$', isMinion: false });
    a(G.RunState.fiatKillCounter['$'] === 0, 'counter should reset after spawn');
});

suite('spawn increments miniBossThisWave and updates lastMiniBossSpawnTime', (a) => {
    resetState();
    for (let i = 0; i < 14; i++) mbSys.onEnemyKilled({ symbol: '$', isMinion: false });
    a(G.RunState.miniBossThisWave === 1, `miniBossThisWave should be 1, got ${G.RunState.miniBossThisWave}`);
    a(G.RunState.lastMiniBossSpawnTime > 0, 'lastMiniBossSpawnTime should be updated');
});

console.log('[PASS] ArcadeMiniBossSystem tests — all assertions passed');
