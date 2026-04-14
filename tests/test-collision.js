/**
 * CollisionSystem tests
 */
(function () {
    _testRunner.suite('CollisionSystem basic', (assert) => {
        const CS = window.Game.CollisionSystem;
        assert(CS, 'CollisionSystem exists');
        assert(typeof CS.init === 'function', 'has init method');
        assert(typeof CS.buildGrids === 'function', 'has buildGrids method');
        assert(typeof CS.processEnemyBulletsVsPlayer === 'function', 'has processEnemyBulletsVsPlayer method');
        assert(typeof CS.processPlayerBulletVsBoss === 'function', 'has processPlayerBulletVsBoss method');
        assert(typeof CS.processBulletCancellation === 'function', 'has processBulletCancellation method');
        assert(typeof CS.processLinkBeamCancellation === 'function', 'has processLinkBeamCancellation method');
        assert(typeof CS._applyElementalOnKill === 'function', 'has _applyElementalOnKill method');
    });

    _testRunner.suite('CollisionSystem.init', (assert) => {
        const CS = window.Game.CollisionSystem;

        // Save original context
        const origCtx = CS._ctx;

        // init accepts a config object and stores it
        const mockCtx = {
            player: { x: 100, y: 200 },
            getBullets: function () { return []; },
            getEnemyBullets: function () { return []; },
            getEnemies: function () { return []; },
            getBoss: function () { return null; },
            getMiniBoss: function () { return null; },
            getState: function () { return 'PLAY'; },
            callbacks: {
                onPlayerHit: function () {},
                onGraze: function () {},
                onBossHit: function () {},
                onBossDeath: function () {},
                onEnemyHit: function () {},
                onEnemyKilled: function () {},
                onBulletCancel: function () {},
                onLinkBeamCancel: function () {},
                onShieldBulletDestroy: function () {},
                onPlayerHyperDeath: function () {}
            }
        };

        CS.init(mockCtx);
        assert(CS._ctx === mockCtx, 'init stores context object');
        assert(CS._ctx.player.x === 100, 'context player accessible');
        assert(typeof CS._ctx.getBullets === 'function', 'context getBullets accessible');
        assert(typeof CS._ctx.callbacks.onPlayerHit === 'function', 'context callbacks accessible');

        // Restore original context
        CS._ctx = origCtx;
    });

    _testRunner.suite('CollisionSystem.buildGrids', (assert) => {
        const CS = window.Game.CollisionSystem;
        const origCtx = CS._ctx;
        const origEnemyGrid = CS._enemyGrid;
        const origEbGrid = CS._ebGrid;

        // Mock enemies and enemy bullets
        var mockEnemies = [
            { x: 50, y: 50, isEntering: false, hasSettled: true },
            { x: 150, y: 100, isEntering: false, hasSettled: true },
            { x: 250, y: 50, isEntering: true, hasSettled: false }  // entering, should be skipped
        ];
        var mockEnemyBullets = [
            { x: 60, y: 60, markedForDeletion: false, collisionRadius: 4 },
            { x: 160, y: 110, markedForDeletion: false, collisionRadius: 4 },
            { x: 300, y: 300, markedForDeletion: true }  // marked, should be skipped
        ];

        var mockCtx = {
            player: { x: 200, y: 400 },
            getBullets: function () { return []; },
            getEnemyBullets: function () { return mockEnemyBullets; },
            getEnemies: function () { return mockEnemies; },
            getBoss: function () { return null; },
            getMiniBoss: function () { return null; },
            getState: function () { return 'PLAY'; },
            callbacks: {}
        };

        CS.init(mockCtx);

        // Reset grid flags
        CS._enemyGrid = null;
        CS._ebGrid = null;

        CS.buildGrids();

        // After buildGrids, grid flags should be set
        assert(CS._enemyGrid === true, 'enemy grid flag set after buildGrids');
        assert(CS._ebGrid === true, 'enemy bullet grid flag set after buildGrids');

        // Restore
        CS._ctx = origCtx;
        CS._enemyGrid = origEnemyGrid;
        CS._ebGrid = origEbGrid;
    });
})();
