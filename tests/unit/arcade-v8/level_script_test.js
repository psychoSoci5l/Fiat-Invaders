// ArcadeLevelScript Unit Test — Task 5
// Verifica generazione SCRIPT da WAVE_DEFINITIONS, tick spawna, action intermission/boss, loop infinito.

const assert = require('assert');
const path = require('path');

// Provide window global before loading browser modules
if (!global.window) global.window = { Game: {} };

const _spawned = [];

window.Game.LevelScript = {
    spawnEnemy(lane, currency, pattern) {
        _spawned.push({ lane, currency, pattern });
    }
};

window.Game.Balance = {
    WAVE_DEFINITIONS: {
        WAVES: [
            {
                cycle: 1, wave: 1, name: 'Test1',
                phases: [
                    { count: 4, formation: 'RECT', currencies: ['¥'] },
                    { count: 3, formation: 'WALL', currencies: ['¥'] }
                ]
            },
            {
                cycle: 1, wave: 2, name: 'Test2',
                phases: [
                    { count: 5, formation: 'ARROW', currencies: ['$'] }
                ]
            },
            {
                cycle: 1, wave: 3, name: 'Test3',
                phases: [
                    { count: 6, formation: 'CHEVRON', currencies: ['€'] }
                ]
            },
            {
                cycle: 1, wave: 4, name: 'Test4',
                phases: [
                    { count: 2, formation: 'FORTRESS', currencies: ['£'] }
                ]
            },
            {
                cycle: 1, wave: 5, name: 'Test5',
                phases: [
                    { count: 3, formation: 'FINAL_FORM', currencies: ['Ⓒ'] }
                ]
            }
        ],
        CYCLE_COUNT_MULT: [1.0, 1.25, 1.45]
    },
    ARCADE: {
        ENEMY_COUNT_MULT: 1.15,
        POST_C3_DIFF_PER_CYCLE: 0.20,
        POST_C3_FORMATION_REMIX: 0.40,
        INTERMISSION_DURATION: 2.0,
        INTERMISSION_BOSS_DURATION: 4.0
    }
};

// Load module under test
require(path.join(__dirname, '../../../src/v8/ArcadeLevelScript.js'));

const G = global.window.Game;
const als = G.ArcadeLevelScript;

function suite(name, fn) {
    console.log(`  [ArcadeLevelScript] ${name}`);
    fn(assert);
}

function resetState() {
    _spawned.length = 0;
    if (als && typeof als.reset === 'function') als.reset();
}

suite('reset clears state', (assert) => {
    resetState();
    assert.strictEqual(als.getWave(), 1, 'wave defaults to 1');
    assert.strictEqual(als.getCycle(), 1, 'cycle defaults to 1');
    assert.strictEqual(als.isActive(), false, 'not active after reset');
});

suite('start generates script with monotonic at_s', (assert) => {
    resetState();
    als.start();
    assert.strictEqual(als.isActive(), true, 'active after start');
    // Script is internal; we test via tick behavior.
    // First tick(0) should spawn first phase burst (at_s: 0).
    const action = als.tick(0);
    assert.strictEqual(_spawned.length, Math.round(4 * 1.15), 'spawns first phase count scaled');
    assert.strictEqual(_spawned[0].currency, '¥', 'correct currency');
    assert.strictEqual(_spawned[0].pattern, 'DIVE', 'RECT maps to DIVE');
});

suite('tick spawns phased bursts and maps formations', (assert) => {
    resetState();
    als.start();
    // Wave 1 phase 1 already consumed by previous test if we don't reset — we did reset.
    als.tick(0); // phase 1
    // phase 2 at_s = 0 + 0.5 + 6.0 = 6.5 (PHASE_DURATION_S=6, BURST_STAGGER_S=0.5)
    _spawned.length = 0;
    const a2 = als.tick(6.5);
    // Should have spawned WALL → HOVER
    assert.strictEqual(_spawned.length, Math.round(3 * 1.15), 'phase 2 count');
    assert.strictEqual(_spawned[0].pattern, 'HOVER', 'WALL maps to HOVER');
});

suite('tick returns START_INTERMISSION between waves', (assert) => {
    resetState();
    als.start();
    // Advance through wave 1 (2 phases)
    // t = 0 (phase1 burst)
    // t = 6.5 (phase2 burst)
    // intermission marker at end of wave: after phase2, t += PHASE_DURATION (6) → 12.5, then START_INTERMISSION
    // So START_INTERMISSION at_s = 12.5
    als.tick(12.6);
    // The last action returned should be START_INTERMISSION
    // We need to capture it; tick returns only the LAST action.
    // But there may be SPAWN_BURST before. Let's step carefully.
    resetState();
    als.start();
    let lastAction = null;
    for (let t = 0; t <= 13; t += 0.1) {
        const a = als.tick(0.1);
        if (a && a.action) lastAction = a;
    }
    assert.ok(lastAction, 'got an action');
    assert.strictEqual(lastAction.action, 'START_INTERMISSION', 'intermission after wave 1');
    assert.strictEqual(lastAction.wave, 1, 'intermission for wave 1');
});

suite('tick returns SPAWN_BOSS after wave 5', (assert) => {
    resetState();
    als.start();
    // Wave 1: 2 phases -> intermission
    // Wave 2: 1 phase -> intermission
    // Wave 3: 1 phase -> intermission
    // Wave 4: 1 phase -> intermission
    // Wave 5: 1 phase -> boss gap -> SPAWN_BOSS
    // Rough total: each wave ~ (phases * (burst_stagger + phase_duration)) + wave_gap
    // Simplify: step through in 0.1 increments up to a safe upper bound.
    let bossAction = null;
    for (let t = 0; t <= 120; t += 0.1) {
        const a = als.tick(0.1);
        if (a && a.action === 'SPAWN_BOSS') {
            bossAction = a;
            break; // stop before next cycle overrides it
        }
    }
    assert.ok(bossAction, 'got SPAWN_BOSS before timeout');
    assert.strictEqual(bossAction.action, 'SPAWN_BOSS', 'boss spawn after wave 5');
    assert.strictEqual(bossAction.wave, 5, 'boss for wave 5');
});

suite('loops to next cycle after script exhaustion', (assert) => {
    resetState();
    als.start();
    // Fast-forward until the first script is exhausted and regenerates (cycle 2).
    let lastAction = null;
    let steps = 0;
    while (als.getCycle() === 1 && steps < 200) {
        const a = als.tick(1.0);
        if (a && a.action) lastAction = a;
        steps++;
    }
    assert.strictEqual(als.getCycle(), 2, 'advanced to cycle 2');
    assert.ok(lastAction, 'action after loop');
    assert.strictEqual(lastAction.action, 'START_WAVE', 'starts next cycle');
});

suite('post-C3 formation remix changes pattern', (assert) => {
    resetState();
    // Force high random to trigger remix
    const origRandom = Math.random;
    Math.random = () => 0.3; // below 0.40 threshold

    als.start();
    // Advance exactly 3 cycles (cycle 1 -> 4)
    for (let target = 2; target <= 4; target++) {
        let steps = 0;
        while (als.getCycle() < target && steps < 200) {
            als.tick(1.0);
            steps++;
        }
        assert.strictEqual(als.getCycle(), target, 'reached cycle ' + target);
    }

    assert.strictEqual(als.getCycle(), 4, 'cycle is 4');

    // Spawn first burst in cycle 4 and inspect pattern
    _spawned.length = 0;
    als.tick(0);
    const patterns = _spawned.map(s => s.pattern);
    // Original wave 1 phase 1 is RECT -> DIVE. With remix it should be something else.
    const hasRemix = patterns.some(p => p !== 'DIVE');
    assert.ok(hasRemix, 'at least one pattern remixed in C4');

    Math.random = origRandom;
});

suite('getWave reflects current wave', (assert) => {
    resetState();
    als.start();
    assert.strictEqual(als.getWave(), 1, 'initial wave 1');
    // After wave 1 intermission, wave should advance
    for (let t = 0; t <= 15; t += 0.1) {
        als.tick(0.1);
    }
    assert.strictEqual(als.getWave(), 2, 'advanced to wave 2');
});

suite('currentLevelName and hasNextLevel', (assert) => {
    resetState();
    als.start();
    assert.strictEqual(als.currentLevelName(), 'Arcade Cycle 1');
    assert.strictEqual(als.hasNextLevel(), true);
});

console.log('\nArcadeLevelScript tests: ' + (process.exitCode === 1 ? 'FAIL' : 'PASS'));
