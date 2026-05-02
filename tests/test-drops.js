/**
 * DropSystem tests
 */
(function () {
    _testRunner.suite('DropSystem exists', (assert) => {
        const G = window.Game;
        assert(G.DropSystem, 'G.DropSystem exists');
        assert(typeof G.DropSystem.tryEnemyDrop === 'function', 'has tryEnemyDrop method');
        assert(typeof G.DropSystem.tryBossDrop === 'function', 'has tryBossDrop method');
        assert(typeof G.DropSystem.reset === 'function', 'has reset method');
        assert(typeof G.DropSystem.update === 'function', 'has update method');
        assert(typeof G.DropSystem.selectEvolutionDropType === 'function', 'has selectEvolutionDropType method');
        assert(typeof G.DropSystem.shouldSuppressDrop === 'function', 'has shouldSuppressDrop method');
        assert(typeof G.DropSystem.getPlayerPowerScore === 'function', 'has getPlayerPowerScore method');
        assert(typeof G.DropSystem.resetBossDrops === 'function', 'has resetBossDrops method');

        // Class should also be exposed for testing
        assert(G.DropSystemClass, 'G.DropSystemClass exposed');
    });

    _testRunner.suite('DropSystem pity timer', (assert) => {
        const G = window.Game;

        // Create a fresh instance to avoid polluting the singleton
        var ds = new G.DropSystemClass();
        ds.reset();

        assert(ds.killsSinceLastDrop === 0, 'killsSinceLastDrop starts at 0 after reset');
        assert(ds.totalKills === 0, 'totalKills starts at 0 after reset');

        // Simulate kills incrementing the counter
        // tryEnemyDrop increments killsSinceLastDrop each call
        // We need a minimal Balance mock for getDropChance
        var origGetDropChance = G.Balance.getDropChance;
        var origDrops = G.Balance.DROPS;
        var origDropScaling = G.Balance.DROP_SCALING;

        // Override to return 0 drop chance (no random drops, only pity)
        G.Balance.getDropChance = function () { return 0; };

        // Effective pity threshold: DROP_SCALING.PITY_BASE overrides DROPS.PITY_TIMER_KILLS (v5.15.1)
        var pityKills = G.Balance.DROP_SCALING ? G.Balance.DROP_SCALING.PITY_BASE : (G.Balance.DROPS.PITY_TIMER_KILLS || 30);

        // Simulate kills below pity threshold — should not drop
        for (var i = 0; i < pityKills - 1; i++) {
            ds.tryEnemyDrop('$', 100, 100, i * 10, null, false);
        }
        assert(ds.killsSinceLastDrop === pityKills - 1, 'killsSinceLastDrop tracks kills correctly');

        // Next kill should trigger pity drop
        var result = ds.tryEnemyDrop('$', 100, 100, (pityKills) * 10, null, false);
        // Pity should have triggered — killsSinceLastDrop resets to 0
        assert(ds.killsSinceLastDrop === 0, 'killsSinceLastDrop resets after pity drop');
        assert(result !== null, 'pity timer forces a drop');
        assert(result.x === 100, 'drop has correct x position');
        assert(result.y === 100, 'drop has correct y position');

        // Restore
        G.Balance.getDropChance = origGetDropChance;
    });

    _testRunner.suite('DropSystem suppression', (assert) => {
        const G = window.Game;
        var ds = new G.DropSystemClass();
        ds.reset();

        // shouldSuppressDrop returns false when ADAPTIVE_DROPS is disabled or not present
        var weakPlayer = { weaponLevel: 1, hasSpecial: false };
        var strongPlayer = { weaponLevel: 3, hasSpecial: true };

        // Pity drops are never suppressed
        var suppressed = ds.shouldSuppressDrop(strongPlayer, true);
        assert(suppressed === false, 'pity drops are never suppressed');

        // Weak player (power score 0) should not be suppressed
        var weakSuppressed = ds.shouldSuppressDrop(weakPlayer, false);
        assert(weakSuppressed === false, 'weak player (LV1, no special) is not suppressed');

        // Verify power score calculation
        if (G.Balance.ADAPTIVE_DROPS) {
            var weakScore = ds.getPlayerPowerScore(weakPlayer);
            assert(weakScore === 0, 'weak player power score is 0');

            var strongScore = ds.getPlayerPowerScore(strongPlayer);
            assert(strongScore > 0, 'strong player power score > 0');
        } else {
            assert(true, 'ADAPTIVE_DROPS not configured, suppression tests skipped');
        }
    });

    _testRunner.suite('DropSystem — MIN_DROP_INTERVAL config', (assert) => {
        const drops = window.Game.Balance && window.Game.Balance.DROPS;
        assert(drops, 'DROPS config exists');
        assert(drops.MIN_DROP_INTERVAL !== undefined, 'MIN_DROP_INTERVAL key exists');
        assert(drops.MIN_DROP_INTERVAL > 0, 'MIN_DROP_INTERVAL > 0 (positive interval)');
        assert(drops.MIN_DROP_INTERVAL <= 30, 'MIN_DROP_INTERVAL <= 30 (sanity: not hours)');
        assert(typeof drops.MIN_DROP_INTERVAL === 'number', 'MIN_DROP_INTERVAL is number');
    });
})();
