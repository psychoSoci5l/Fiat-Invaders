/**
 * v7.20.3 — LevelScript multi-level schedule validation
 *
 * Verifies that each V8 level timeline is well-formed:
 * - Timestamps are monotonically increasing
 * - Each entry has required fields (currencies, lanes)
 * - Boss trigger is set at correct time
 * - CRUSH events are scheduled
 * - Archetype V8 schedule entries exist
 */
(function () {
    const G = window.Game;
    const Balance = G.Balance;
    const V8 = Balance && Balance.V8_MODE;

    // ── Suite 1 — Config structure ──────────────────────────────────────────
    _testRunner.suite('V8 Levels — Config', (assert) => {
        assert(V8, 'V8_MODE config exists');
        assert(V8.ENABLED, 'V8_MODE.ENABLED is true');
        assert(V8.LEVEL_DURATION_S === 180, 'LEVEL_DURATION_S === 180');
        assert(V8.BOSS_AT_S === 170, 'BOSS_AT_S === 170 (boss trigger timestamp)');
        assert(V8.SPAWN_Y_OFFSET <= 0, 'SPAWN_Y_OFFSET <= 0 (off-screen spawn)');
    });

    // ── Suite 2 — Level definitions ─────────────────────────────────────────
    _testRunner.suite('V8 Levels — Definitions', (assert) => {
        const LS = G.LevelScript;
        assert(LS, 'LevelScript exists');
        assert(typeof LS.loadLevel === 'function', 'loadLevel() is a function');
        assert(typeof LS.hasNextLevel === 'function', 'hasNextLevel() is a function');

        // TIER_TARGETS_BY_LEVEL: 3 levels with correct structure
        const tiers = LS._TIER_TARGETS_BY_LEVEL;
        assert(tiers && tiers.length === 3, 'TIER_TARGETS_BY_LEVEL has 3 levels');

        for (let i = 0; i < tiers.length; i++) {
            const t = tiers[i];
            assert(t.WEAK && t.WEAK.hp > 0 && t.WEAK.val > 0, 'L' + (i + 1) + ' WEAK has hp + val');
            assert(t.MEDIUM && t.MEDIUM.hp > 0 && t.MEDIUM.val > 0, 'L' + (i + 1) + ' MEDIUM has hp + val');
            assert(t.STRONG && t.STRONG.hp > 0 && t.STRONG.val > 0, 'L' + (i + 1) + ' STRONG has hp + val');
        }

        // HP progression: L1 < L2 < L3 per tier
        for (const tier of ['WEAK', 'MEDIUM', 'STRONG']) {
            assert(tiers[0][tier].hp < tiers[1][tier].hp, 'L1 < L2 ' + tier + '.hp');
            assert(tiers[1][tier].hp < tiers[2][tier].hp, 'L2 < L3 ' + tier + '.hp');
        }
    });

    // ── Suite 3 — Level scripts: timestamps ascending ───────────────────────
    _testRunner.suite('V8 Levels — Timeline', (assert) => {
        const LS = G.LevelScript;
        const scripts = [LS._LEVEL_1_SCRIPT, LS._LEVEL_2_SCRIPT, LS._LEVEL_3_SCRIPT];
        const names = ['Level 1 (FED)', 'Level 2 (BCE)', 'Level 3 (BOJ)'];

        for (let l = 0; l < scripts.length; l++) {
            const script = scripts[l];
            assert(script && Array.isArray(script), names[l] + ' script is array');
            assert(script.length >= 20, names[l] + ' has ' + script.length + ' entries (min 20)');

            let prevTime = -1;
            for (let i = 0; i < script.length; i++) {
                const entry = script[i];
                // Required fields
                assert(typeof entry.at_s === 'number', names[l] + '[' + i + '].at_s is number');
                assert(entry.currencies, names[l] + '[' + i + '].currencies exists');
                assert(entry.lanes || entry.lane, names[l] + '[' + i + '] has lanes or lane');

                // Timestamps ascending
                assert(entry.at_s >= prevTime, names[l] + '[' + i + '].at_s (' + entry.at_s + ') >= prev (' + prevTime + ')');
                prevTime = entry.at_s;

                // Within level duration
                assert(entry.at_s <= 180, names[l] + '[' + i + '].at_s (' + entry.at_s + ') <= 180');
            }
        }
    });

    // ── Suite 4 — CRUSH set-piece events ────────────────────────────────────
    _testRunner.suite('V8 Levels — CRUSH events', (assert) => {
        const LS = G.LevelScript;
        const scripts = [LS._LEVEL_1_SCRIPT, LS._LEVEL_2_SCRIPT, LS._LEVEL_3_SCRIPT];
        const names = ['Level 1 (FED)', 'Level 2 (BCE)', 'Level 3 (BOJ)'];

        for (let l = 0; l < scripts.length; l++) {
            const script = scripts[l];
            // Find the last timestamp group — should be in 160-170s range (CRUSH zone)
            const lastTime = script[script.length - 1].at_s;
            assert(lastTime >= 155 && lastTime <= 175,
                names[l] + ' last entry at_s (' + lastTime + ') in CRUSH zone (155-175s)');

            // Count entries in CRUSH zone (150-170s) — should have burst density
            const crushEntries = script.filter(e => e.at_s >= 150 && e.at_s <= 170);
            assert(crushEntries.length >= 3,
                names[l] + ' has ' + crushEntries.length + ' entries in CRUSH zone (≥3 expected)');
        }
    });

    // ── Suite 5 — Archetype V8 schedule ─────────────────────────────────────
    _testRunner.suite('V8 Levels — Archetype Schedule', (assert) => {
        const archCfg = Balance && Balance.ARCHETYPES;
        assert(archCfg, 'ARCHETYPES config exists');

        const sched = archCfg.V8_SCHEDULE;
        assert(sched, 'V8_SCHEDULE exists');
        assert(sched.HFT && sched.HFT.FROM_LEVEL >= 1 && Array.isArray(sched.HFT.AT),
            'HFT schedule: FROM_LEVEL + AT array');
        assert(sched.AUDITOR && sched.AUDITOR.FROM_LEVEL >= 1 && Array.isArray(sched.AUDITOR.AT),
            'AUDITOR schedule: FROM_LEVEL + AT array');
        assert(sched.PRINTER && sched.PRINTER.FROM_LEVEL >= 2 && Array.isArray(sched.PRINTER.AT),
            'PRINTER schedule: FROM_LEVEL ≥ 2 + AT array (cycle-gated)');

        // At least one entry per archetype in schedule
        assert(sched.HFT.AT.length >= 1, 'HFT has ≥1 schedule time');
        assert(sched.AUDITOR.AT.length >= 1, 'AUDITOR has ≥1 schedule time');
        assert(sched.PRINTER.AT.length >= 1, 'PRINTER has ≥1 schedule time');
    });

    // ── Suite 6 — Level tier definitions ────────────────────────────────────
    _testRunner.suite('V8 Levels — Tier Maps', (assert) => {
        const LS = G.LevelScript;
        const tierMaps = [LS._LEVEL_1_TIERS, LS._LEVEL_2_TIERS, LS._LEVEL_3_TIERS];
        const names = ['Level 1 (FED)', 'Level 2 (BCE)', 'Level 3 (BOJ)'];

        for (let l = 0; l < tierMaps.length; l++) {
            const map = tierMaps[l];
            assert(map && typeof map === 'object', names[l] + ' tier map exists');
            const keys = Object.keys(map);
            assert(keys.length >= 3, names[l] + ' has ≥3 currency entries');

            for (const [currency, tier] of Object.entries(map)) {
                assert(['WEAK', 'MEDIUM', 'STRONG'].includes(tier),
                    names[l] + ' ' + currency + ' → ' + tier + ' is valid');
            }
        }
    });
})();
