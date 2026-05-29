// Achievement System Unit Tests — Sprint 7 A1 + A2
// Node runner via tests/run-unit-tests.js

const assert = require('assert');
const path = require('path');

// Minimal browser shim for AchievementSystem
const STORAGE = {};
global.localStorage = {
    getItem: (k) => STORAGE[k] || null,
    setItem: (k, v) => { STORAGE[k] = String(v); },
    removeItem: (k) => { delete STORAGE[k]; }
};

// Provide window global before loading browser modules
if (!global.window) global.window = { Game: {} };

// Load MigrationSystem first (dependency)
require(path.join(__dirname, '../../src/utils/MigrationSystem.js'));

// Load AchievementSystem
require(path.join(__dirname, '../../src/managers/AchievementSystem.js'));

const G = global.window.Game;

function suite(name, fn) {
    console.log(`  [Achievement] ${name}`);
    fn(assert);
}

suite('Definitions count', (a) => {
    const defs = G.AchievementSystem.getDefinitions();
    a(defs.length >= 17, 'At least 17 definitions (12 original + 5 sprint7)');
    const ids = defs.map(d => d.id);
    a(ids.includes('DAILY_STREAK_3'), 'DAILY_STREAK_3 exists');
    a(ids.includes('DAILY_STREAK_7'), 'DAILY_STREAK_7 exists');
    a(ids.includes('DAILY_STREAK_30'), 'DAILY_STREAK_30 exists');
    a(ids.includes('SHARE_CHALLENGE'), 'SHARE_CHALLENGE exists');
    a(ids.includes('FIRST_DAILY_LEADERBOARD'), 'FIRST_DAILY_LEADERBOARD exists');
});

suite('Unlock one-off', (a) => {
    G.AchievementSystem.init();
    // Mock EventBus
    let emitted = null;
    G.Events = { emit: (name, payload) => { emitted = { name, payload }; } };

    a(!G.AchievementSystem.isUnlocked('SHARE_CHALLENGE'), 'SHARE_CHALLENGE starts locked');
    const ok = G.AchievementSystem.unlock('SHARE_CHALLENGE');
    a(ok === true, 'unlock returns true on first unlock');
    a(G.AchievementSystem.isUnlocked('SHARE_CHALLENGE'), 'isUnlocked true after unlock');
    a(emitted && emitted.name === 'achievements:unlocked', 'event emitted');
    a(emitted.payload.length === 1 && emitted.payload[0].id === 'SHARE_CHALLENGE', 'payload correct');

    const ok2 = G.AchievementSystem.unlock('SHARE_CHALLENGE');
    a(ok2 === false, 'unlock returns false on double unlock');
});

suite('Unlock nonexistent ID', (a) => {
    const ok = G.AchievementSystem.unlock('DOES_NOT_EXIST');
    a(ok === false, 'unlock returns false for unknown ID');
});

suite('Daily streak achievements via checkAll', (a) => {
    G.AchievementSystem.init();
    G.AchievementSystem.reset(); // clear previous unlocks

    // Mock StatsTracker
    G.StatsTracker = { get: () => ({
        totalKills: 0, bossesDefeated: 0, miniBossesDefeated: 0,
        hyperActivations: 0, godchainActivations: 0,
        totalPlayTime: 0, totalRuns: 0, highestScoreRun: 0
    }) };

    // Streak 2: none
    G.DailyMode = { getStreak: () => 2 };
    let newly = G.AchievementSystem.checkAll();
    a(newly.filter(d => d.id.startsWith('DAILY_STREAK')).length === 0, 'streak 2 unlocks nothing');

    // Streak 3: DAILY_STREAK_3
    G.DailyMode = { getStreak: () => 3 };
    newly = G.AchievementSystem.checkAll();
    a(newly.some(d => d.id === 'DAILY_STREAK_3'), 'streak 3 unlocks DAILY_STREAK_3');
    a(!newly.some(d => d.id === 'DAILY_STREAK_7'), 'streak 3 does NOT unlock DAILY_STREAK_7');

    // Streak 7: DAILY_STREAK_7 (3 already unlocked, so only 7)
    G.DailyMode = { getStreak: () => 7 };
    newly = G.AchievementSystem.checkAll();
    a(newly.some(d => d.id === 'DAILY_STREAK_7'), 'streak 7 unlocks DAILY_STREAK_7');

    // Streak 30: DAILY_STREAK_30
    G.DailyMode = { getStreak: () => 30 };
    newly = G.AchievementSystem.checkAll();
    a(newly.some(d => d.id === 'DAILY_STREAK_30'), 'streak 30 unlocks DAILY_STREAK_30');
});

suite('Total count after Sprint 7', (a) => {
    a(G.AchievementSystem.getTotalCount() >= 17, 'Total count >= 17');
});

console.log('[PASS] Achievement tests — all assertions passed');
