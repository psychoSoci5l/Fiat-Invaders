// ArcadeModifierSystem Unit Test — Task 3
// Verifica pick, stack, non-stack exclusion, recalculate, max stacks, reset.

const assert = require('assert');
const path = require('path');

if (!global.window) global.window = { Game: {} };

// Mock RunState
window.Game.RunState = {
    arcadeModifiers: [],
    arcadeBonuses: {
        fireRateMult: 1.0, damageMult: 1.0, piercePlus: 0, speedMult: 1.0,
        enemyHpMult: 1.0, enemyBulletSpeedMult: 1.0, dropRateMult: 1.0,
        scoreMult: 1.0, grazeRadiusMult: 1.0, pityMult: 1.0, extraLives: 0,
        nanoShieldTimer: 0, nanoShieldCooldown: 0, lastStandAvailable: false,
        noShieldDrops: false, volatileRounds: false, chainLightning: false,
        critChance: 0, critMult: 3.0
    },
    arcadeModifierPicks: 0
};

// Mock ColorUtils (used by drawHUD, not needed here but referenced)
window.Game.ColorUtils = null;

require(path.join(__dirname, '../../../src/systems/ArcadeModifierSystem.js'));

const G = global.window.Game;
const modSys = G.ArcadeModifierSystem;

function suite(name, fn) {
    console.log(`  [ArcadeModifierSystem] ${name}`);
    fn(assert);
}

function resetState() {
    G.RunState.arcadeModifiers = [];
    G.RunState.arcadeBonuses = {
        fireRateMult: 1.0, damageMult: 1.0, piercePlus: 0, speedMult: 1.0,
        enemyHpMult: 1.0, enemyBulletSpeedMult: 1.0, dropRateMult: 1.0,
        scoreMult: 1.0, grazeRadiusMult: 1.0, pityMult: 1.0, extraLives: 0,
        nanoShieldTimer: 0, nanoShieldCooldown: 0, lastStandAvailable: false,
        noShieldDrops: false, volatileRounds: false, chainLightning: false,
        critChance: 0, critMult: 3.0
    };
    G.RunState.arcadeModifierPicks = 0;
}

suite('getRandomModifiers returns correct count', (a) => {
    resetState();
    const picks = modSys.getRandomModifiers(3);
    a(picks.length === 3, `expected 3 picks, got ${picks.length}`);
});

suite('getRandomModifiers guarantees OFFENSE + DEFENSE for count >= 3', (a) => {
    resetState();
    // Run many times to reduce randomness impact
    let hasOffense = false, hasDefense = false;
    for (let i = 0; i < 50; i++) {
        const picks = modSys.getRandomModifiers(3);
        if (picks.some(m => m.category === 'OFFENSE')) hasOffense = true;
        if (picks.some(m => m.category === 'DEFENSE')) hasDefense = true;
    }
    a(hasOffense, 'should include at least 1 OFFENSE in 50 trials');
    a(hasDefense, 'should include at least 1 DEFENSE in 50 trials');
});

suite('applyModifier appends id and recalculates bonuses', (a) => {
    resetState();
    modSys.applyModifier('OVERCLOCK');
    a(G.RunState.arcadeModifiers.includes('OVERCLOCK'), 'modifiers should include OVERCLOCK');
    a(Math.abs(G.RunState.arcadeBonuses.fireRateMult - 0.80) < 0.001, `fireRateMult should be 0.80, got ${G.RunState.arcadeBonuses.fireRateMult}`);
});

suite('stackable modifier reaches max stacks then excluded', (a) => {
    resetState();
    modSys.applyModifier('OVERCLOCK');
    modSys.applyModifier('OVERCLOCK');
    a(G.RunState.arcadeModifiers.length === 2, `should have 2 OVERCLOCK, got ${G.RunState.arcadeModifiers.length}`);
    a(Math.abs(G.RunState.arcadeBonuses.fireRateMult - 0.64) < 0.001, `fireRateMult should be 0.64 (0.8*0.8), got ${G.RunState.arcadeBonuses.fireRateMult}`);
    // Third application: should not be possible via getRandomModifiers
    const picks = modSys.getRandomModifiers(3);
    a(!picks.some(m => m.id === 'OVERCLOCK'), 'OVERCLOCK should be excluded at max stacks');
});

suite('non-stackable modifier excluded from subsequent pools', (a) => {
    resetState();
    modSys.applyModifier('VOLATILE_ROUNDS');
    a(G.RunState.arcadeModifiers.includes('VOLATILE_ROUNDS'));
    const picks = modSys.getRandomModifiers(3);
    a(!picks.some(m => m.id === 'VOLATILE_ROUNDS'), 'VOLATILE_ROUNDS should be excluded after pick');
});

suite('hasModifier and getModifierCount', (a) => {
    resetState();
    a(modSys.hasModifier('OVERCLOCK') === false);
    a(modSys.getModifierCount() === 0);
    modSys.applyModifier('OVERCLOCK');
    a(modSys.hasModifier('OVERCLOCK') === true);
    a(modSys.getModifierCount() === 1);
});

suite('getBonuses returns readonly snapshot', (a) => {
    resetState();
    modSys.applyModifier('DOUBLE_SCORE');
    const b = modSys.getBonuses();
    a(b.scoreMult === 2.0, `scoreMult should be 2.0, got ${b.scoreMult}`);
    a(b.enemyHpMult === 1.25, `enemyHpMult should be 1.25, got ${b.enemyHpMult}`);
    // Mutating returned object should not affect state (defensive copy)
    b.scoreMult = 99;
    a(G.RunState.arcadeBonuses.scoreMult === 2.0, 'mutation of snapshot should not affect state');
});

suite('reset clears all modifiers and bonuses', (a) => {
    resetState();
    modSys.applyModifier('OVERCLOCK');
    modSys.applyModifier('DOUBLE_SCORE');
    a(modSys.getModifierCount() > 0);
    modSys.reset();
    a(modSys.getModifierCount() === 0, `count should be 0 after reset, got ${modSys.getModifierCount()}`);
    a(G.RunState.arcadeBonuses.fireRateMult === 1.0, `fireRateMult should reset to 1.0`);
    a(G.RunState.arcadeBonuses.scoreMult === 1.0, `scoreMult should reset to 1.0`);
});

suite('multiple distinct modifiers apply correctly', (a) => {
    resetState();
    modSys.applyModifier('OVERCLOCK');
    modSys.applyModifier('CRITICAL_HIT');
    modSys.applyModifier('BULLET_TIME');
    a(Math.abs(G.RunState.arcadeBonuses.fireRateMult - 0.80) < 0.001);
    a(Math.abs(G.RunState.arcadeBonuses.critChance - 0.15) < 0.001);
    a(Math.abs(G.RunState.arcadeBonuses.enemyBulletSpeedMult - 0.80) < 0.001);
});

console.log('[PASS] ArcadeModifierSystem tests — all assertions passed');
