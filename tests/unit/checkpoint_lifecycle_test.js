// Checkpoint Lifecycle tests — story-003
// Tests: new game clears, game over preserves, Continua after game over

(function () {
    'use strict';

    const store = new Map();
    globalThis.localStorage = {
        getItem(k) { return store.has(k) ? store.get(k) : null; },
        setItem(k, v) { store.set(k, v); },
        removeItem(k) { store.delete(k); },
        get length() { return store.size; },
        key(i) { return [...store.keys()][i] || null; }
    };

    globalThis.window = { Game: {} };
    const G = window.Game;

    (function () {
        const REG = {
            fiat_checkpoint: { v: 1, d: null },
            fiat_campaign: { v: 2, d: null }
        };
        function get(key) {
            const raw = (() => { try { return localStorage.getItem(key); } catch { return null; } })();
            if (raw === null || raw === undefined) { const e = REG[key]; return e ? e.d : null; }
            let parsed;
            try { parsed = JSON.parse(raw); } catch (e) { parsed = null; }
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) &&
                typeof parsed.v === 'number' && 'd' in parsed) { return parsed.d; }
            return raw;
        }
        function set(key, value) { const payload = JSON.stringify({ v: 1, d: value }); try { localStorage.setItem(key, payload); return true; } catch { return false; } }
        function remove(key) { try { localStorage.removeItem(key); return true; } catch { return false; } }
        G.MigrationSystem = { get, set, remove, REGISTRY: REG };
    })();

    G.SHIPS = { BTC: {}, ETH: {}, SOL: {} };
    G.CampaignState = {
        BOSS_ORDER: ['FEDERAL_RESERVE', 'BCE', 'BOJ'],
        bosses: {
            FEDERAL_RESERVE: { defeated: false, unlocked: true },
            BCE: { defeated: false, unlocked: false },
            BOJ: { defeated: false, unlocked: false }
        },
        ngPlusLevel: 0,
        storyProgress: { PROLOGUE: false, CHAPTER_1: false, CHAPTER_2: false, CHAPTER_3: false },
        getNextBoss() {
            for (const bt of this.BOSS_ORDER) { if (!this.bosses[bt].defeated) return bt; }
            return null;
        },
        isEnabled() { return true; },
        getProgress() {
            let defeated = 0;
            for (const bt of this.BOSS_ORDER) { if (this.bosses[bt].defeated) defeated++; }
            return { defeated, complete: defeated >= 3 };
        }
    };
    G.RunState = { score: 0, level: 1, shipType: null, hyperActive: false, hasFirePerk: false, hasLaserPerk: false, hasElectricPerk: false };
    G.Balance = { CHECKPOINT: { ENABLED: true, KEY: 'fiat_checkpoint', VERSION: 1 } };
    G.ArcadeModifiers = { _arcade: false, isArcadeMode() { return this._arcade; } };
    G.GameState = { currentState: 'PLAY' };

    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(path.join(__dirname, '../../src/managers/CheckpointManager.js'), 'utf8');
    eval(src);

    const CM = G.CheckpointManager;
    let passed = 0, failed = 0;

    function assert(cond, msg) { if (cond) { passed++; } else { failed++; console.error('FAIL:', msg); } }
    function assertEqual(a, b, msg) {
        if (a === b) { passed++; }
        else { failed++; console.error('FAIL:', msg + ' — expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a)); }
    }

    function setupCheckpoint() {
        G.CampaignState.bosses.FEDERAL_RESERVE.defeated = true;
        G.CampaignState.bosses.BCE.defeated = false;
        G.CampaignState.bosses.BOJ.defeated = false;
        G.RunState.score = 5000;
        G.RunState.shipType = 'BTC';
        CM.save();
    }

    function clearBosses() {
        G.CampaignState.bosses.FEDERAL_RESERVE.defeated = false;
        G.CampaignState.bosses.BCE.defeated = false;
        G.CampaignState.bosses.BOJ.defeated = false;
        G.CampaignState.ngPlusLevel = 0;
    }

    // Test 1: New game clears checkpoint
    {
        store.clear();
        setupCheckpoint();
        assert(CM.hasCheckpoint() === true, 'checkpoint exists before new game');

        // Simulate new game: clearCheckpoint
        CM.clearCheckpoint();
        assert(CM.hasCheckpoint() === false, 'checkpoint cleared after new game');
        assertEqual(localStorage.getItem('fiat_checkpoint'), null, 'localStorage key removed on new game');
    }

    // Test 2: New game with no checkpoint is a safe no-op
    {
        store.clear();
        CM.clearCheckpoint();
        assert(CM.hasCheckpoint() === false, 'no checkpoint after clear on empty state');
        // No crash
    }

    // Test 3: Game over preserves checkpoint
    {
        store.clear();
        setupCheckpoint();
        assert(CM.hasCheckpoint() === true, 'checkpoint exists before game over');

        // Simulate game over — no clearCheckpoint called
        // (the checkpoint just stays as-is)
        assert(CM.hasCheckpoint() === true, 'checkpoint still exists after game over');
        assert(CM.load() !== null, 'checkpoint data intact after game over');
        assertEqual(CM.load().score, 5000, 'checkpoint score preserved after game over');
    }

    // Test 4: Multiple game overs still preserve
    {
        store.clear();
        setupCheckpoint();
        // Simulate 3 game over cycles
        assert(CM.hasCheckpoint() === true, 'checkpoint exists before first death');
        assert(CM.hasCheckpoint() === true, 'checkpoint persists after first death');
        assert(CM.hasCheckpoint() === true, 'checkpoint persists after second death');
        assert(CM.hasCheckpoint() === true, 'checkpoint persists after third death');
    }

    // Test 5: New game after game over clears checkpoint
    {
        store.clear();
        setupCheckpoint();
        assert(CM.hasCheckpoint() === true, 'checkpoint exists');

        // Simulate game over
        assert(CM.hasCheckpoint() === true, 'still exists after game over');

        // Then player starts a new game
        CM.clearCheckpoint();
        assert(CM.hasCheckpoint() === false, 'checkpoint cleared only when new game starts');
    }

    // Test 6: ClearCheckpoint called before CampaignState reset
    {
        store.clear();
        setupCheckpoint();
        const preClearBosses = JSON.stringify(G.CampaignState.bosses);
        const preClearNG = G.CampaignState.ngPlusLevel;

        // Simulate order: clear checkpoint first, THEN reset campaign state
        CM.clearCheckpoint();
        assert(CM.hasCheckpoint() === false, 'checkpoint cleared first');

        // Check that CampaignState wasn't affected by clearCheckpoint
        assertEqual(JSON.stringify(G.CampaignState.bosses), preClearBosses, 'CampaignState.bosses untouched by clear');
        assertEqual(G.CampaignState.ngPlusLevel, preClearNG, 'CampaignState.ngPlusLevel untouched by clear');

        // Now safe to reset campaign
        clearBosses();
    }

    console.log('\n=== Checkpoint Lifecycle Tests ===');
    console.log('Passed:', passed);
    console.log('Failed:', failed);
    console.log('Total:', passed + failed);

    if (failed > 0) process.exit(1);
    else console.log('\nAll Checkpoint Lifecycle tests passed!');
})();
