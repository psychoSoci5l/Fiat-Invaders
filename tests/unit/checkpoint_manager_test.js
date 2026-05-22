// CheckpointManager tests — story-001
// Tests: save, load, hasCheckpoint, clearCheckpoint, validation, arcade gate, boss gate
// Run: node tests/unit/checkpoint_manager_test.js

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
    globalThis.window = { Game: {} };
    const G = window.Game;

    // ── Minimal MigrationSystem (standalone) ─────────────────
    // We need just enough to test CheckpointManager's storage layer.
    // Inline the essential function logic.
    (function () {
        const REG = { fiat_checkpoint: { v: 1, d: null } };
        function get(key) {
            const raw = (() => {
                try { return localStorage.getItem(key); }
                catch { return null; }
            })();
            if (raw === null || raw === undefined) {
                const e = REG[key];
                return e ? e.d : null;
            }
            let parsed;
            try { parsed = JSON.parse(raw); } catch (e) { parsed = null; }
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) &&
                typeof parsed.v === 'number' && 'd' in parsed) {
                return parsed.d;
            }
            return raw;
        }
        function set(key, value) {
            const payload = JSON.stringify({ v: 1, d: value });
            try { localStorage.setItem(key, payload); return true; }
            catch { return false; }
        }
        function remove(key) {
            try { localStorage.removeItem(key); return true; }
            catch { return false; }
        }
        G.MigrationSystem = { get, set, remove };
    })();

    // ── Mock game objects ──────────────────────────────────────
    // Mock SHIPS that CheckpointManager uses for validation
    G.SHIPS = {
        BTC: { speed: 420, hp: 3 },
        ETH: { speed: 320, hp: 4 },
        SOL: { speed: 560, hp: 2 }
    };

    // Mock CampaignState
    G.CampaignState = {
        enabled: true,
        BOSS_ORDER: ['FEDERAL_RESERVE', 'BCE', 'BOJ'],
        bosses: {
            FEDERAL_RESERVE: { defeated: false, unlocked: true },
            BCE: { defeated: false, unlocked: false },
            BOJ: { defeated: false, unlocked: false }
        },
        ngPlusLevel: 0,
        storyProgress: {
            PROLOGUE: false,
            CHAPTER_1: false,
            CHAPTER_2: false,
            CHAPTER_3: false
        },
        isEnabled() { return this.enabled; },
        getNextBoss() {
            for (const bt of this.BOSS_ORDER) {
                if (!this.bosses[bt].defeated) return bt;
            }
            return null;
        },
        getProgress() {
            let defeated = 0;
            for (const bt of this.BOSS_ORDER) {
                if (this.bosses[bt].defeated) defeated++;
            }
            return { current: defeated + 1, total: 3, defeated, complete: defeated >= 3 };
        }
    };

    // Mock RunState
    G.RunState = {
        score: 0,
        level: 1,
        shipType: null,
        hyperActive: false,
        hasFirePerk: false,
        hasLaserPerk: false,
        hasElectricPerk: false,
        perkLevel: 0,
        lives: 3
    };

    // Mock Balance
    G.Balance = {
        CHECKPOINT: {
            ENABLED: true,
            KEY: 'fiat_checkpoint',
            VERSION: 1
        }
    };

    // Mock ArcadeModifiers
    G.ArcadeModifiers = {
        _arcade: false,
        isArcadeMode() { return this._arcade; }
    };

    // Mock GameState
    G.GameState = {
        currentState: 'PLAY'
    };

    // ── Load CheckpointManager ──────────────────────────────────
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(path.join(__dirname, '../../src/managers/CheckpointManager.js'), 'utf8');
    eval(src);

    const CM = G.CheckpointManager;
    let passed = 0, failed = 0;

    function assert(cond, msg) {
        if (cond) { passed++; }
        else { failed++; console.error('FAIL:', msg); }
    }

    function assertEqual(a, b, msg) {
        if (a === b) { passed++; }
        else { failed++; console.error('FAIL:', msg + ' — expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a)); }
    }

    function setupArcadeWithBosses() {
        G.CampaignState.bosses.FEDERAL_RESERVE.defeated = true;
        G.GameState.currentState = 'PLAY';
        G.ArcadeModifiers._arcade = false;
    }

    function resetBosses() {
        G.CampaignState.bosses.FEDERAL_RESERVE.defeated = false;
        G.CampaignState.bosses.BCE.defeated = false;
        G.CampaignState.bosses.BOJ.defeated = false;
    }

    // ── Test 1: Save serializes all required fields ────────────
    {
        store.clear();
        setupArcadeWithBosses();
        G.RunState.score = 5000;
        G.RunState.level = 3;
        G.RunState.shipType = 'BTC';
        G.RunState.hasFirePerk = true;
        G.RunState.hasLaserPerk = false;
        G.RunState.hasElectricPerk = true;

        const ok = CM.save();
        assert(ok === true, 'save returns true on success');

        const rawData = G.MigrationSystem.get('fiat_checkpoint');
        assert(rawData !== null, 'checkpoint data exists after save');
        assert(rawData.version === 1, 'saved version is 1');
        assert(typeof rawData.timestamp === 'number', 'timestamp is a number');
        assertEqual(rawData.shipType, 'BTC', 'shipType saved');
        assertEqual(rawData.nextBoss, 'BCE', 'nextBoss is BCE (after FED defeated)');
        assertEqual(rawData.levelNumber, 3, 'levelNumber saved');
        assertEqual(rawData.score, 5000, 'score saved');
        assert(rawData.perks.indexOf('fire') >= 0, 'fire perk in saved perks');
        assert(rawData.perks.indexOf('electric') >= 0, 'electric perk in saved perks');
        assert(rawData.perks.indexOf('laser') < 0, 'laser perk not in saved perks');
        assertEqual(rawData.perkOrder.length, 3, 'perkOrder has 3 entries');
        assert(typeof rawData.godchainActive === 'boolean', 'godchainActive is boolean');
        assert(typeof rawData.hyperActive === 'boolean', 'hyperActive is boolean');
        assert(typeof rawData.lives === 'number', 'lives is number');
        assert(typeof rawData.bossesDefeated === 'object', 'bossesDefeated saved');
        assert(typeof rawData.storyProgress === 'object', 'storyProgress saved');
        assertEqual(rawData.ngPlusLevel, 0, 'ngPlusLevel saved');
    }

    // ── Test 2: Load returns valid data for clean save ────────
    {
        store.clear();
        setupArcadeWithBosses();
        G.RunState.score = 2500;
        G.RunState.level = 2;
        G.RunState.shipType = 'ETH';
        CM.save();

        const loaded = CM.load();
        assert(loaded !== null, 'load returns data when checkpoint exists');
        assertEqual(loaded.shipType, 'ETH', 'loaded shipType matches');
        assertEqual(loaded.score, 2500, 'loaded score matches');
        assertEqual(loaded.levelNumber, 2, 'loaded levelNumber matches');
        assertEqual(loaded.nextBoss, 'BCE', 'loaded nextBoss matches');
    }

    // ── Test 3: Load returns null on corrupted data (invalid JSON) ───
    {
        store.clear();
        // Write corrupted raw data directly
        localStorage.setItem('fiat_checkpoint', '{NOT_JSON');
        const loaded = CM.load();
        assert(loaded === null, 'load returns null for corrupted JSON');
        // After failed load, checkpoint should be cleared
        assert(localStorage.getItem('fiat_checkpoint') === null, 'corrupted checkpoint was cleared');
    }

    // ── Test 4: Load returns null on wrong version ────────────
    {
        store.clear();
        // Write data with wrong version via MigrationSystem
        const badData = {
            version: 99,
            timestamp: Date.now(),
            shipType: 'BTC',
            nextBoss: 'FEDERAL_RESERVE',
            levelNumber: 1,
            weaponLevel: 1,
            perks: [],
            perkOrder: ['fire', 'laser', 'electric'],
            godchainActive: false,
            hyperActive: false,
            lives: 3,
            score: 0,
            specials: [],
            utilities: [],
            ngPlusLevel: 0,
            bossesDefeated: {},
            storyProgress: {}
        };
        G.MigrationSystem.set('fiat_checkpoint', badData);
        const loaded = CM.load();
        assert(loaded === null, 'load returns null for wrong version');
        assert(localStorage.getItem('fiat_checkpoint') === null, 'wrong-version checkpoint cleared');
    }

    // ── Test 5: Load returns null on unknown ship type ────────
    {
        store.clear();
        const badShipData = {
            version: 1,
            timestamp: Date.now(),
            shipType: 'DOGE_COIN',
            nextBoss: 'FEDERAL_RESERVE',
            levelNumber: 1,
            weaponLevel: 1,
            perks: [],
            perkOrder: ['fire', 'laser', 'electric'],
            godchainActive: false,
            hyperActive: false,
            lives: 3,
            score: 0,
            specials: [],
            utilities: [],
            ngPlusLevel: 0,
            bossesDefeated: {},
            storyProgress: {}
        };
        G.MigrationSystem.set('fiat_checkpoint', badShipData);
        const loaded = CM.load();
        assert(loaded === null, 'load returns null for unknown ship type');
    }

    // ── Test 6: Load returns null on invalid nextBoss ─────────
    {
        store.clear();
        const badBossData = {
            version: 1,
            timestamp: Date.now(),
            shipType: 'BTC',
            nextBoss: 'ZOMBIE_BANK',
            levelNumber: 1,
            weaponLevel: 1,
            perks: [],
            perkOrder: ['fire', 'laser', 'electric'],
            godchainActive: false,
            hyperActive: false,
            lives: 3,
            score: 0,
            specials: [],
            utilities: [],
            ngPlusLevel: 0,
            bossesDefeated: {},
            storyProgress: {}
        };
        G.MigrationSystem.set('fiat_checkpoint', badBossData);
        const loaded = CM.load();
        assert(loaded === null, 'load returns null for invalid boss type');
    }

    // ── Test 7: hasCheckpoint returns true/false correctly ────
    {
        store.clear();
        assert(CM.hasCheckpoint() === false, 'hasCheckpoint false when no checkpoint');

        setupArcadeWithBosses();
        CM.save();
        assert(CM.hasCheckpoint() === true, 'hasCheckpoint true after save');

        CM.clearCheckpoint();
        assert(CM.hasCheckpoint() === false, 'hasCheckpoint false after clear');
    }

    // ── Test 8: clearCheckpoint removes key ───────────────────
    {
        store.clear();
        setupArcadeWithBosses();
        CM.save();
        assert(CM.hasCheckpoint() === true, 'checkpoint exists before clear');

        CM.clearCheckpoint();
        assert(CM.hasCheckpoint() === false, 'checkpoint gone after clear');
        assert(localStorage.getItem('fiat_checkpoint') === null, 'localStorage key removed');
    }

    // ── Test 9: No save in arcade mode ────────────────────────
    {
        store.clear();
        setupArcadeWithBosses();
        G.ArcadeModifiers._arcade = true;
        G.GameState.currentState = 'ARCADE';

        const ok = CM.save();
        assert(ok === false, 'save returns false in arcade mode');
        assert(CM.hasCheckpoint() === false, 'no checkpoint saved in arcade mode');

        G.ArcadeModifiers._arcade = false;
        G.GameState.currentState = 'PLAY';
    }

    // ── Test 10: No save before first boss ────────────────────
    {
        store.clear();
        resetBosses();
        G.RunState.score = 100;
        G.RunState.level = 1;

        const ok = CM.save();
        assert(ok === false, 'save returns false before any boss defeated');
        assert(CM.hasCheckpoint() === false, 'no checkpoint saved before first boss');

        setupArcadeWithBosses(); // Cleanup: re-defeat FED
    }

    // ── Test 11: resumeFromCheckpoint restores state ──────────
    {
        store.clear();
        setupArcadeWithBosses();

        // Set up checkpoint data resembling mid-C2 state
        G.RunState.score = 12000;
        G.RunState.level = 7;
        G.RunState.shipType = 'SOL';
        G.RunState.hasFirePerk = true;
        G.RunState.hasLaserPerk = true;
        G.RunState.hasElectricPerk = false;
        G.RunState.perkLevel = 2;
        G.CampaignState.ngPlusLevel = 1;
        G.CampaignState.bosses.FEDERAL_RESERVE.defeated = true;
        G.CampaignState.bosses.BCE.defeated = true;
        G.CampaignState.storyProgress.PROLOGUE = true;
        G.CampaignState.storyProgress.CHAPTER_1 = true;

        CM.save();

        // Reset state to simulate fresh game
        G.RunState.score = 0;
        G.RunState.level = 1;
        G.RunState.shipType = null;
        G.RunState.hasFirePerk = false;
        G.RunState.hasLaserPerk = false;
        G.RunState.hasElectricPerk = false;
        G.RunState.perkLevel = 0;
        G.CampaignState.ngPlusLevel = 0;
        G.CampaignState.bosses.FEDERAL_RESERVE.defeated = false;
        G.CampaignState.bosses.BCE.defeated = false;
        G.CampaignState.storyProgress.PROLOGUE = false;
        G.CampaignState.storyProgress.CHAPTER_1 = false;

        const result = CM.resumeFromCheckpoint();
        assert(result !== null, 'resumeFromCheckpoint returns data');
        assertEqual(result.nextBoss, 'BOJ', 'next boss is BOJ');
        assertEqual(result.levelNumber, 7, 'level number restored');

        // Verify state restoration
        assertEqual(G.RunState.score, 12000, 'score restored');
        assertEqual(G.RunState.shipType, 'SOL', 'shipType restored');
        assert(G.RunState.hasFirePerk === true, 'fire perk restored');
        assert(G.RunState.hasLaserPerk === true, 'laser perk restored');
        assert(G.RunState.hasElectricPerk === false, 'electric perk not restored');

        assertEqual(G.CampaignState.ngPlusLevel, 1, 'ngPlusLevel restored');
        assert(G.CampaignState.bosses.FEDERAL_RESERVE.defeated === true, 'FED boss defeat restored');
        assert(G.CampaignState.bosses.BCE.defeated === true, 'BCE boss defeat restored');
        assert(G.CampaignState.storyProgress.PROLOGUE === true, 'story progress PROLOGUE restored');
        assert(G.CampaignState.storyProgress.CHAPTER_1 === true, 'story progress CHAPTER_1 restored');
    }

    // ── Test 12: Resume fails when checkpoint cleared ─────────
    {
        store.clear();
        const result = CM.resumeFromCheckpoint();
        assert(result === null, 'resumeFromCheckpoint returns null when no checkpoint');
    }

    // ── Test 13: Load returns null when key missing ───────────
    {
        store.clear();
        const loaded = CM.load();
        assert(loaded === null, 'load returns null when no stored data');
    }

    // ── Results ────────────────────────────────────────────────
    console.log('\n=== CheckpointManager Tests ===');
    console.log('Passed:', passed);
    console.log('Failed:', failed);
    console.log('Total:', passed + failed);

    if (failed > 0) process.exit(1);
    else console.log('\nAll CheckpointManager tests passed!');

})();
