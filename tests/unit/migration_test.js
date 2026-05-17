// MigrationSystem tests — v1.0
// Tests: wrap/unwrap, migration chains, fallback, dynamic keys
// Run: node tests/unit/migration_test.js

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

    // ── Minimal Game namespace ─────────────────────────────────
    globalThis.window = { Game: { Balance: {} } };
    const G = window.Game;

    // ── Load MigrationSystem ────────────────────────────────────
    // Inline the essential logic for standalone testing
    // We test the actual file-loaded system via the game, this is the unit test

    let passed = 0, failed = 0;
    function assert(cond, msg) {
        if (cond) { passed++; }
        else { failed++; console.error('FAIL:', msg); }
    }

    // ── Before loading MigrationSystem, test that it's loadable ─
    // Since MigrationSystem depends on being loaded as a script tag,
    // we simulate the environment and test the core logic.

    // Simulate: read the file and eval in our mock context
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(path.join(__dirname, '../../src/utils/MigrationSystem.js'), 'utf8');
    eval(src);

    const MS = G.MigrationSystem;
    assert(!!MS, 'MigrationSystem should be defined on Game namespace');
    assert(typeof MS.get === 'function', 'MS.get should be a function');
    assert(typeof MS.set === 'function', 'MS.set should be a function');
    assert(typeof MS.remove === 'function', 'MS.remove should be a function');
    assert(typeof MS.getRaw === 'function', 'MS.getRaw should be a function');
    assert(typeof MS.has === 'function', 'MS.has should be a function');

    // ── Test 1: Set and get round-trip ────────────────────────
    {
        MS.set('fiat_lang', 'IT');
        const val = MS.get('fiat_lang');
        assert(val === 'IT', 'Set/Get round-trip: IT → ' + val);

        // Verify it's stored wrapped
        const raw = store.get('fiat_lang');
        const parsed = JSON.parse(raw);
        assert(parsed.v === 1, 'Stored with version 1');
        assert(parsed.d === 'IT', 'Stored data is "IT"');
    }

    // ── Test 2: Default values for missing keys ───────────────
    {
        const val = MS.get('fiat_highscore_story');
        assert(val === 0, 'Missing key returns default (0)');
    }

    // ── Test 3: Legacy (unwrapped) data migration ─────────────
    {
        // Simulate old format: plain string "1"
        store.set('fiat_music_muted', '1');
        const val = MS.get('fiat_music_muted');
        assert(val === '1', 'Legacy unwrapped string "1" → "' + val + '"');

        // Verify it was migrated to wrapped format
        const raw = store.get('fiat_music_muted');
        const parsed = JSON.parse(raw);
        assert(parsed.v === 1, 'Migrated to version 1');
        assert(parsed.d === '1', 'Data preserved as "1"');
    }

    // ── Test 4: Legacy JSON data (unwrapped object) ───────────
    {
        const oldData = JSON.stringify({ bestCycle: 5, bestLevel: 3, bestKills: 100 });
        store.set('fiat_arcade_records', oldData);
        const val = MS.get('fiat_arcade_records');
        assert(val.bestCycle === 5, 'Legacy arcade records: bestCycle=' + val.bestCycle);
        assert(val.bestLevel === 3, 'Legacy arcade records: bestLevel=' + val.bestLevel);

        // Verify wrapped
        const raw = store.get('fiat_arcade_records');
        const parsed = JSON.parse(raw);
        assert(parsed.v === 1, 'Migrated to v1');
    }

    // ── Test 5: CampaignState migration v0→v2 ─────────────────
    {
        // Old campaign data (v0 format, no storyProgress)
        const oldCampaign = JSON.stringify({
            enabled: true,
            bosses: { FEDERAL_RESERVE: { defeated: true, unlocked: true } },
            ngPlusLevel: 1,
            perksCarryover: [],
            stats: { totalDefeats: 1 },
            version: 1,
            timestamp: 123456789
        });
        store.set('fiat_campaign', oldCampaign);

        const val = MS.get('fiat_campaign');
        assert(val.enabled === true, 'Campaign: enabled preserved');
        assert(val.ngPlusLevel === 1, 'Campaign: ngPlusLevel preserved');
        assert(val.storyProgress !== undefined, 'Campaign: storyProgress added by v1→v2 migration');
        assert(val.storyProgress.PROLOGUE === false, 'Campaign: storyProgress.PROLOGUE default false');
    }

    // ── Test 6: Dynamic keys (raw passthrough) ─────────────────
    {
        store.set('fiat_daily_attempt_2026-05-17', '1715900000000');
        const val = MS.get('fiat_daily_attempt_2026-05-17');
        assert(val === '1715900000000', 'Dynamic key passthrough: ' + val);

        MS.set('fiat_hint_shield_save', '1');
        const hintVal = MS.get('fiat_hint_shield_save');
        assert(hintVal === '1', 'Hint dynamic key: ' + hintVal);
    }

    // ── Test 7: Remove ─────────────────────────────────────────
    {
        MS.set('fiat_nickname', 'Satoshi');
        assert(MS.get('fiat_nickname') === 'Satoshi', 'Set before remove');
        MS.remove('fiat_nickname');
        assert(MS.get('fiat_nickname') === 'Anonymous', 'After remove, returns default "Anonymous"');
    }

    // ── Test 8: has() check ────────────────────────────────────
    {
        MS.set('fiat_tilt_on', '1');
        assert(MS.has('fiat_tilt_on') === true, 'has() returns true for existing key');
        MS.remove('fiat_tilt_on');
        assert(MS.has('fiat_tilt_on') === false, 'has() returns false for removed key');
    }

    // ── Test 9: getRaw ─────────────────────────────────────────
    {
        MS.set('fiat_lang', 'EN');
        const raw = MS.getRaw('fiat_lang');
        assert(typeof raw === 'string', 'getRaw returns string');
        const parsed = JSON.parse(raw);
        assert(parsed.v === 1, 'getRaw returns wrapped format');
    }

    // ── Test 10: Corrupted data fallback ───────────────────────
    {
        // Set corrupted JSON
        store.set('fiat_control_mode', '{broken');
        const val = MS.get('fiat_control_mode');
        // JSON parse fails, raw string is treated as data, wrapped and returned
        assert(typeof val === 'string', 'Corrupted data: returns string, got ' + typeof val);
    }

    // ── Test 11: Number values ─────────────────────────────────
    {
        MS.set('fiat_maxcycle', 5);
        const val = MS.get('fiat_maxcycle');
        assert(val === 5, 'Number round-trip: ' + val);
    }

    // ── Test 12: migrateAll eager migration ────────────────────
    {
        store.clear();
        // Store some unwrapped legacy data
        store.set('fiat_sfx_muted', '1');
        store.set('fiat_highscore_story', '50000');

        MS.migrateAll();

        // Both should now be wrapped
        const raw1 = store.get('fiat_sfx_muted');
        const raw2 = store.get('fiat_highscore_story');
        assert(raw1.includes('"v":1'), 'migrateAll wraps sfx_muted');
        assert(raw2.includes('"v":1'), 'migrateAll wraps highscore_story');
    }

    // ── Test 13: resetAll ──────────────────────────────────────
    {
        MS.set('fiat_lang', 'IT');
        MS.set('fiat_music_muted', '1');
        MS.resetAll();

        assert(MS.get('fiat_lang') === 'EN', 'resetAll restores default lang');
        assert(MS.get('fiat_music_muted') === '0', 'resetAll restores default music_muted');
    }

    // ── Results ────────────────────────────────────────────────
    console.log('\n=== MigrationSystem Tests ===');
    console.log('Passed:', passed);
    console.log('Failed:', failed);
    console.log('Total:', passed + failed);

    if (failed > 0) process.exit(1);
    else console.log('\nAll MigrationSystem tests passed!');

})();
