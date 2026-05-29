// V8 Spawn Density Ramp Test — Sprint 8 S1
// Verifies _getSpawnDensityMult boundary values and curve logic.

const assert = require('assert');
const path = require('path');

// Provide window global before loading browser modules
if (!global.window) global.window = { Game: {} };

// Mock Balance config
window.Game.Balance = {
    V8_MODE: {
        ENABLED: true,
        BOSS_AT_S: 170,
        SPAWN_DENSITY_RAMP: {
            ENABLED: true,
            START: 0.75,
            END: 1.0,
            CURVE: 'quad',
            LEVEL_MULT: [1.0, 1.0, 1.0]
        }
    }
};

// Load LevelScript (requires G.Game to exist, which we set above)
require(path.join(__dirname, '../../src/v8/LevelScript.js'));

const G = global.window.Game;

function suite(name, fn) {
    console.log(`  [V8SpawnDensity] ${name}`);
    fn(assert);
}

suite('_getSpawnDensityMult at t=0', (a) => {
    G.LevelScript._elapsed = 0;
    G.LevelScript._levelIdx = 0;
    const m = G.LevelScript._getSpawnDensityMult();
    a(m === 0.75, `t=0 returns START=0.75 (got ${m})`);
});

suite('_getSpawnDensityMult at t=1 (boss)', (a) => {
    G.LevelScript._elapsed = 170;
    G.LevelScript._levelIdx = 0;
    const m = G.LevelScript._getSpawnDensityMult();
    a(m === 1.0, `t=1 returns END=1.0 (got ${m})`);
});

suite('_getSpawnDensityMult at midpoint (quad curve)', (a) => {
    G.LevelScript._elapsed = 85; // half of 170
    G.LevelScript._levelIdx = 0;
    const m = G.LevelScript._getSpawnDensityMult();
    const expected = 0.75 + (1.0 - 0.75) * 0.25; // t=0.5, quad => 0.25
    a(Math.abs(m - expected) < 0.001, `midpoint quad: expected ${expected.toFixed(4)}, got ${m.toFixed(4)}`);
});

suite('_getSpawnDensityMult disabled config', (a) => {
    const orig = window.Game.Balance.V8_MODE.SPAWN_DENSITY_RAMP.ENABLED;
    window.Game.Balance.V8_MODE.SPAWN_DENSITY_RAMP.ENABLED = false;
    G.LevelScript._elapsed = 0;
    const m = G.LevelScript._getSpawnDensityMult();
    window.Game.Balance.V8_MODE.SPAWN_DENSITY_RAMP.ENABLED = orig;
    a(m === 1.0, `disabled config returns 1.0 (got ${m})`);
});

suite('_getSpawnDensityMult level mult', (a) => {
    window.Game.Balance.V8_MODE.SPAWN_DENSITY_RAMP.LEVEL_MULT = [1.0, 1.1, 1.25];
    G.LevelScript._elapsed = 170;
    G.LevelScript._levelIdx = 1;
    const m = G.LevelScript._getSpawnDensityMult();
    window.Game.Balance.V8_MODE.SPAWN_DENSITY_RAMP.LEVEL_MULT = [1.0, 1.0, 1.0];
    a(m === 1.1, `L2 level mult 1.1 at boss (got ${m})`);
});

console.log('[PASS] V8 Spawn Density tests — all assertions passed');
