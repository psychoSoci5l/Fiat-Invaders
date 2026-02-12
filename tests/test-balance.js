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
})();
