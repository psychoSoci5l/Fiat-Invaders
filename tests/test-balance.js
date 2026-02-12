/**
 * BalanceConfig tests — verify critical values exist and are sane
 */
(function () {
    _testRunner.suite('BalanceConfig', (assert) => {
        const B = window.Game.Balance;
        assert(B, 'Balance config exists');

        // Core sections exist
        assert(B.PLAYER, 'PLAYER section exists');
        assert(B.DIFFICULTY, 'DIFFICULTY section exists');
        assert(B.BOSS, 'BOSS section exists');
        assert(B.WEAPON_EVOLUTION, 'WEAPON_EVOLUTION section exists');
        assert(B.ENEMY_BEHAVIOR, 'ENEMY_BEHAVIOR section exists');
        assert(B.SCORE, 'SCORE section exists');
        assert(B.PERK, 'PERK section exists');

        // Player defaults
        assert(B.PLAYER.START_LIVES >= 1, 'START_LIVES >= 1');
        assert(B.PLAYER.START_LIVES <= 5, 'START_LIVES <= 5');

        // Weapon evolution levels
        if (B.WEAPON_EVOLUTION && B.WEAPON_EVOLUTION.LEVELS) {
            const levels = B.WEAPON_EVOLUTION.LEVELS;
            assert(Object.keys(levels).length >= 5, 'At least 5 weapon levels');
            assert(levels[1], 'Weapon level 1 exists');
            assert(levels[1].bullets >= 1, 'Level 1 has >= 1 bullet');
        }

        // Boss HP formula
        if (B.calculateBossHP) {
            const hp1 = B.calculateBossHP(1, 1);
            const hp2 = B.calculateBossHP(5, 2);
            assert(hp1 > 0, 'Boss HP at level 1 > 0');
            assert(hp2 > hp1, 'Boss HP at level 5 cycle 2 > level 1 cycle 1');
            assert(hp1 < 100000, 'Boss HP at level 1 < 100000 (sanity)');
        }

        // Difficulty caps
        if (B.DIFFICULTY) {
            assert(B.DIFFICULTY.MAX !== undefined, 'DIFFICULTY.MAX defined');
            assert(B.DIFFICULTY.MAX <= 1, 'DIFFICULTY.MAX <= 1');
            assert(B.DIFFICULTY.MAX > 0, 'DIFFICULTY.MAX > 0');
        }

        // Score HODL multiplier
        assert(B.SCORE.HODL_MULT_ENEMY >= 1, 'HODL_MULT_ENEMY >= 1');
    });

    _testRunner.suite('ObjectPool', (assert) => {
        const Pool = window.Game.ObjectPool;
        assert(Pool, 'ObjectPool class exists');

        // Create pool with simple objects
        let created = 0;
        const pool = new Pool(() => {
            created++;
            return { id: created, _inPool: false, reset() {} };
        }, 3);

        assert(created === 3, 'Pre-populates 3 objects');

        // Acquire
        const obj1 = pool.acquire();
        assert(obj1, 'acquire returns object');
        assert(!obj1._inPool, 'acquired object not in pool');

        const obj2 = pool.acquire();
        assert(obj2 !== obj1, 'acquire returns different objects');

        // Release
        pool.release(obj1);
        assert(obj1._inPool, 'released object marked as in pool');

        // Re-acquire returns released object
        const obj3 = pool.acquire();
        assert(obj3 === obj1, 're-acquire returns released object');

        // Double release protection
        pool.release(obj2);
        pool.release(obj2); // should be no-op
        assert(pool.reserve.length <= 3, 'double release does not duplicate');
    });

    // --- Adaptive Power Calibration (v4.59) ---
    _testRunner.suite('AdaptivePowerCalibration', (assert) => {
        const B = window.Game.Balance;
        const APC = B.ADAPTIVE_POWER;
        assert(APC, 'ADAPTIVE_POWER config exists');
        assert(APC.ENABLED === true, 'APC enabled by default');
        assert(APC.WEIGHTS.WEAPON + APC.WEIGHTS.PERKS + APC.WEIGHTS.SPECIAL === 1.0, 'Weights sum to 1.0');

        // HP multiplier range
        assert(APC.HP_FLOOR === 0.85, 'HP floor is 0.85');
        assert(APC.HP_FLOOR + APC.HP_RANGE === 1.15, 'HP ceiling is 1.15');

        // Power score calculation for known inputs
        const W = APC.WEIGHTS;
        // Weakest: LV1, 0 perks, no special → score = 0
        const weakScore = W.WEAPON * 0 + W.PERKS * 0 + W.SPECIAL * 0;
        assert(weakScore === 0, 'Weakest player score = 0');
        const weakHP = APC.HP_FLOOR + weakScore * APC.HP_RANGE;
        assert(weakHP === 0.85, 'Weakest HP mult = 0.85');

        // Max: LV5, 8 stacks, special → score = 1.0
        const maxScore = W.WEAPON * 1 + W.PERKS * 1 + W.SPECIAL * 1;
        assert(maxScore === 1.0, 'Maxed player score = 1.0');
        const maxHP = APC.HP_FLOOR + maxScore * APC.HP_RANGE;
        assert(Math.abs(maxHP - 1.15) < 0.001, 'Maxed HP mult = 1.15');

        // Neutral: LV3, 2 perks, no special → ~0.35
        const neutralWeapon = (3 - 1) / 4; // 0.5
        const neutralPerk = 2 / 8;          // 0.25
        const neutralScore = W.WEAPON * neutralWeapon + W.PERKS * neutralPerk + W.SPECIAL * 0;
        assert(neutralScore > 0.3 && neutralScore < 0.4, 'Neutral score ~0.35 (got ' + neutralScore.toFixed(3) + ')');

        // Thresholds
        assert(APC.WEAK_THRESHOLD === 0.30, 'Weak threshold = 0.30');
        assert(APC.STRONG_THRESHOLD === 0.60, 'Strong threshold = 0.60');

        // Pity adjustments
        assert(APC.PITY_BONUS_WEAK < 0, 'Weak pity bonus is negative (easier)');
        assert(APC.PITY_PENALTY_STRONG > 0, 'Strong pity penalty is positive (harder)');

        // RunState.cyclePower default
        const RS = window.Game.RunState;
        assert(RS, 'RunState exists');
        assert(RS.cyclePower, 'cyclePower field exists');
        assert(RS.cyclePower.hpMult === 1.0, 'Default hpMult = 1.0');
        assert(RS.cyclePower.pityAdj === 0, 'Default pityAdj = 0');
        assert(RS.cyclePower.score === 0, 'Default score = 0');
    });
})();
