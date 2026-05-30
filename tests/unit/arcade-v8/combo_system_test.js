// ArcadeComboSystem Unit Test — Task 2
// Verifica combo incremento, decay, graze extend, cap, reset on death, HUD snapshot.

const assert = require('assert');
const path = require('path');

// Provide window global before loading browser modules
if (!global.window) global.window = { Game: {} };

// Mock RunState
window.Game.RunState = {
    comboCount: 0,
    comboTimer: 0,
    comboMult: 1.0,
    bestCombo: 0,
    comboDecayAnim: 0
};

// Mock Balance config
window.Game.Balance = {
    ARCADE: {
        COMBO: {
            TIMEOUT: 3.0,
            GRAZE_EXTEND: 0.5,
            MULT_PER_COMBO: 0.05,
            MULT_CAP: 5.0,
            DECAY_ANIM: 0.5,
            COLORS: { WHITE: 10, YELLOW: 30, ORANGE: 50, RED: 999 }
        }
    }
};

// Load ArcadeComboSystem
require(path.join(__dirname, '../../../src/systems/ArcadeComboSystem.js'));

const G = global.window.Game;
const combo = G.ArcadeComboSystem;

function suite(name, fn) {
    console.log(`  [ArcadeComboSystem] ${name}`);
    fn(assert);
}

function resetState() {
    G.RunState.comboCount = 0;
    G.RunState.comboTimer = 0;
    G.RunState.comboMult = 1.0;
    G.RunState.bestCombo = 0;
    G.RunState.comboDecayAnim = 0;
}

suite('onEnemyKilled increments combo and resets timer', (a) => {
    resetState();
    combo.onEnemyKilled();
    a(G.RunState.comboCount === 1, `comboCount should be 1, got ${G.RunState.comboCount}`);
    a(G.RunState.comboTimer === 3.0, `comboTimer should be 3.0, got ${G.RunState.comboTimer}`);
    a(G.RunState.comboMult === 1.05, `comboMult should be 1.05, got ${G.RunState.comboMult}`);
    a(G.RunState.bestCombo === 1, `bestCombo should be 1, got ${G.RunState.bestCombo}`);
});

suite('comboMult caps at MULT_CAP', (a) => {
    resetState();
    // Simulate 100 kills
    for (let i = 0; i < 100; i++) combo.onEnemyKilled();
    a(G.RunState.comboMult === 5.0, `comboMult should be capped at 5.0, got ${G.RunState.comboMult}`);
    a(G.RunState.comboCount === 100, `comboCount should be 100, got ${G.RunState.comboCount}`);
});

suite('update decay resets combo after TIMEOUT', (a) => {
    resetState();
    combo.onEnemyKilled();
    a(G.RunState.comboCount === 1);
    combo.update(2.9); // timer still alive
    a(G.RunState.comboCount === 1);
    combo.update(0.2); // decay past timeout, decayAnim = 0.5 - 0.2 = 0.3
    a(G.RunState.comboCount === 0, `comboCount should be 0 after decay, got ${G.RunState.comboCount}`);
    a(G.RunState.comboMult === 1.0, `comboMult should reset to 1.0, got ${G.RunState.comboMult}`);
    a(Math.abs(G.RunState.comboDecayAnim - 0.3) < 0.001, `decayAnim should be ~0.3 after timeout, got ${G.RunState.comboDecayAnim}`);
});

suite('graze extends active combo timer', (a) => {
    resetState();
    combo.onEnemyKilled();
    combo.update(2.0); // timer now 1.0
    combo.onGraze();
    a(G.RunState.comboTimer === 1.5, `comboTimer should be 1.5 after graze extend, got ${G.RunState.comboTimer}`);
});

suite('graze does not extend when combo is expired', (a) => {
    resetState();
    combo.onGraze();
    a(G.RunState.comboTimer === 0, `comboTimer should remain 0, got ${G.RunState.comboTimer}`);
});

suite('onDeath resets combo but preserves bestCombo', (a) => {
    resetState();
    combo.onEnemyKilled();
    combo.onEnemyKilled();
    a(G.RunState.bestCombo === 2);
    combo.onDeath();
    a(G.RunState.comboCount === 0, `comboCount should be 0 after death, got ${G.RunState.comboCount}`);
    a(G.RunState.comboTimer === 0);
    a(G.RunState.comboMult === 1.0);
    a(G.RunState.bestCombo === 2, `bestCombo should persist (2), got ${G.RunState.bestCombo}`);
});

suite('decayAnim fades to zero', (a) => {
    resetState();
    combo.onEnemyKilled();
    combo.update(2.9); // timer still alive
    combo.update(0.2); // triggers decay start (decayAnim = 0.5 - 0.2 = 0.3)
    a(Math.abs(G.RunState.comboDecayAnim - 0.3) < 0.001, `decayAnim should be ~0.3 after trigger, got ${G.RunState.comboDecayAnim}`);
    combo.update(0.2);
    a(Math.abs(G.RunState.comboDecayAnim - 0.1) < 0.001, `decayAnim should be ~0.1, got ${G.RunState.comboDecayAnim}`);
    combo.update(0.2);
    a(G.RunState.comboDecayAnim === 0, `decayAnim should reach 0, got ${G.RunState.comboDecayAnim}`);
});

suite('update multiple kills then partial decay', (a) => {
    resetState();
    combo.onEnemyKilled(); // count=1, timer=3.0
    combo.update(1.0);   // timer=2.0
    combo.onEnemyKilled(); // count=2, timer=3.0, mult=1.10
    a(G.RunState.comboMult === 1.10);
    combo.update(3.1);   // timer decays past 0
    a(G.RunState.comboCount === 0);
    a(G.RunState.bestCombo === 2);
});

suite('drawHUD returns snapshot with correct values', (a) => {
    resetState();
    combo.onEnemyKilled();
    combo.onEnemyKilled();
    // Mock canvas context
    const ctx = {
        saveCalls: 0, restoreCalls: 0,
        save() { this.saveCalls++; },
        restore() { this.restoreCalls++; },
        strokeText() {}, fillText() {},
        beginPath() {}, arc() {}, moveTo() {}, lineTo() {}, closePath() {}, fill() {}
    };
    const snap = combo.drawHUD(ctx);
    a(ctx.saveCalls === 1, 'ctx.save should be called once');
    a(ctx.restoreCalls === 1, 'ctx.restore should be called once');
    a(snap.displayCombo === 2, `snap.displayCombo should be 2, got ${snap.displayCombo}`);
    a(snap.alpha === 1, `snap.alpha should be 1, got ${snap.alpha}`);
});

suite('drawHUD decay mode shows bestCombo with fading alpha', (a) => {
    resetState();
    combo.onEnemyKilled();
    combo.update(2.9); // timer still alive
    combo.update(0.2); // triggers decay, decayAnim = 0.3
    const ctx = { save() {}, restore() {}, strokeText() {}, fillText() {} };
    const snap = combo.drawHUD(ctx);
    a(snap && snap.displayCombo === 1, `displayCombo should be bestCombo (1), got ${snap && snap.displayCombo}`);
    a(snap && snap.alpha < 1, `alpha should be <1 during decay, got ${snap && snap.alpha}`);
});

console.log('[PASS] ArcadeComboSystem tests — all assertions passed');
