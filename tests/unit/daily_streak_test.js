// DailyMode streak logic tests — Sprint 6 S1
// Tests: getStreak, updateStreak, resetStreak, consecutive detection
// Run: node tests/unit/daily_streak_test.js

(function () {
    'use strict';

    // ── Mock localStorage ──────────────────────────────────────
    const store = new Map();
    globalThis.localStorage = {
        getItem(k) { return store.has(k) ? store.get(k) : null; },
        setItem(k, v) { store.set(k, v); },
        removeItem(k) { store.delete(k); },
        get length() { return store.size; },
        key(i) { return [...store.keys()][i] || null; }
    };

    // ── Mock Game namespace ────────────────────────────────────
    globalThis.window = { Game: { Balance: {} } };
    const G = window.Game;

    // Minimal RNG mock (provides utcDateString)
    G.RNG = {
        utcDateString() {
            const now = new Date();
            return now.toISOString().slice(0, 10);
        }
    };

    let passed = 0, failed = 0;
    function assert(cond, msg) {
        if (cond) { passed++; }
        else { failed++; console.error('FAIL:', msg); }
    }

    // ── Load MigrationSystem ─────────────────────────────────
    const fs = require('fs');
    const path = require('path');
    const msSrc = fs.readFileSync(path.join(__dirname, '../../src/utils/MigrationSystem.js'), 'utf8');
    eval(msSrc);

    // ── Load DailyMode ─────────────────────────────────────────
    const dmSrc = fs.readFileSync(path.join(__dirname, '../../src/managers/DailyMode.js'), 'utf8');
    eval(dmSrc);

    const DM = G.DailyMode;
    assert(!!DM, 'DailyMode should be defined');
    assert(typeof DM.getStreak === 'function', 'getStreak should be a function');
    assert(typeof DM.updateStreak === 'function', 'updateStreak should be a function');
    assert(typeof DM.resetStreak === 'function', 'resetStreak should be a function');
    assert(typeof DM.getLastPlayed === 'function', 'getLastPlayed should be a function');

    // ── Test 1: Fresh user starts at streak 0 ──────────────────
    {
        const s = DM.getStreak();
        assert(s === 0, 'Fresh user streak should be 0, got ' + s);
        const last = DM.getLastPlayed();
        assert(last === '', 'Fresh user lastPlayed should be empty, got ' + last);
    }

    // ── Test 2: First daily play sets streak to 1 ──────────────
    {
        DM.updateStreak();
        const s = DM.getStreak();
        assert(s === 1, 'First play streak should be 1, got ' + s);
        const last = DM.getLastPlayed();
        const todayStr = DM.today();
        assert(last === todayStr, 'Last played should be today (' + todayStr + '), got ' + last);
    }

    // ── Test 3: Second play same day does not change streak ────
    {
        DM.updateStreak(); // already played today
        const s = DM.getStreak();
        assert(s === 1, 'Same-day second play streak should stay 1, got ' + s);
    }

    // ── Test 4: Consecutive day increments streak ─────────────
    {
        const todayStr = DM.today();
        const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        G.MigrationSystem.set('fiat_daily_last_played', yesterdayStr);
        G.MigrationSystem.set('fiat_daily_streak', 3);
        // Simulate "not played today" by clearing attempt key
        store.delete('fiat_daily_attempt_' + todayStr);
        DM.updateStreak();
        const s = DM.getStreak();
        assert(s === 4, 'Consecutive day should increment 3→4, got ' + s);
        const last = DM.getLastPlayed();
        assert(last === todayStr, 'Last played should update to today, got ' + last);
    }

    // ── Test 5: Gap >1 day resets streak to 1 ─────────────────
    {
        const todayStr = DM.today();
        const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);
        G.MigrationSystem.set('fiat_daily_last_played', twoDaysAgo);
        G.MigrationSystem.set('fiat_daily_streak', 5);
        store.delete('fiat_daily_attempt_' + todayStr);
        DM.updateStreak();
        const s = DM.getStreak();
        assert(s === 1, 'Gap >1 day should reset to 1, got ' + s);
    }

    // ── Test 6: resetStreak clears to 0 ────────────────────────
    {
        G.MigrationSystem.set('fiat_daily_streak', 7);
        DM.resetStreak();
        const s = DM.getStreak();
        assert(s === 0, 'After reset streak should be 0, got ' + s);
        const last = DM.getLastPlayed();
        assert(last === '', 'After reset lastPlayed should be empty, got ' + last);
    }

    // ── Test 7: markAttempt + updateStreak round-trip ──────────
    {
        DM.resetStreak();
        DM.markAttempt();
        DM.updateStreak();
        const s = DM.getStreak();
        assert(s === 1, 'markAttempt then updateStreak should yield 1, got ' + s);
        assert(DM.isLockedToday(), 'isLockedToday should be true after markAttempt');
    }

    // ── Summary ────────────────────────────────────────────────
    console.log(`DailyStreak tests: ${passed} passed, ${failed} failed`);
    if (failed > 0) process.exit(1);
})();
