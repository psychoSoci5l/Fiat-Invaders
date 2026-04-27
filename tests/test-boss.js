/**
 * Boss entity unit tests
 */
(function () {
    const Boss = window.Game.Boss;
    const Balance = window.Game.Balance;
    const BOSSES = window.Game.BOSSES;
    const THRESHOLDS = Balance.BOSS.PHASE_THRESHOLDS; // [0.66, 0.20]

    // --- Constructor & Entity inheritance ---
    _testRunner.suite('Boss constructor — FEDERAL_RESERVE', (assert) => {
        const boss = new Boss(480, 720, 'FEDERAL_RESERVE');
        assert(boss instanceof window.Game.Entity, 'extends Entity');
        assert(boss.bossType === 'FEDERAL_RESERVE', 'bossType set');
        assert(boss.name === 'THE FED', 'name from config');
        assert(boss.symbol === '$', 'symbol from config');
        assert(boss.color === '#00ff66', 'color from config');
        assert(boss.maxHp === 800, 'maxHp = 800');
        assert(boss.hp === 800, 'hp = 800');
        assert(boss.active === true, 'active = true');
        assert(boss.phase === 1, 'phase = 1');
        assert(boss.isEntering === true, 'isEntering = true (entrance)');
        assert(boss.phaseTransitioning === false, 'phaseTransitioning = false initially');
        assert(boss.targetY === 100, 'targetY = 100 (no safeAreaInsets)');
        assert(boss.width === 160, 'width = 160 (boss size)');
        assert(boss.height === 140, 'height = 140 (boss size)');
    });

    _testRunner.suite('Boss constructor — BCE', (assert) => {
        const boss = new Boss(480, 720, 'BCE');
        assert(boss.bossType === 'BCE', 'BCE bossType');
        assert(boss.name === 'BCE', 'BCE name');
        assert(boss.symbol === '€', 'BCE symbol');
        assert(boss.color === '#003399', 'BCE color');
    });

    _testRunner.suite('Boss constructor — BOJ', (assert) => {
        const boss = new Boss(480, 720, 'BOJ');
        assert(boss.bossType === 'BOJ', 'BOJ bossType');
        assert(boss.name === 'BOJ', 'BOJ name');
        assert(boss.symbol === '¥', 'BOJ symbol');
        assert(boss.color === '#bc002d', 'BOJ color');
    });

    _testRunner.suite('Boss constructor — default type', (assert) => {
        const boss = new Boss(480, 720);
        assert(boss.bossType === 'FEDERAL_RESERVE', 'default type is FEDERAL_RESERVE');
    });

    // --- BOSSES config integrity ---
    _testRunner.suite('BOSSES config exists', (assert) => {
        assert(BOSSES, 'Game.BOSSES exists');
        assert(BOSSES.FEDERAL_RESERVE, 'FEDERAL_RESERVE config');
        assert(BOSSES.BCE, 'BCE config');
        assert(BOSSES.BOJ, 'BOJ config');
        assert(Object.keys(BOSSES).length === 3, 'exactly 3 boss types');
    });

    // --- damage() and HP reduction ---
    _testRunner.suite('Boss damage — HP reduction', (assert) => {
        const boss = new Boss(480, 720);
        assert(boss.hp === 800, 'initial HP = 800');

        boss.damage(100);
        assert(boss.hp === 700, 'HP = 700 after 100 damage');
        assert(boss.hitTimer > 0, 'hitTimer set after damage');

        boss.damage(200);
        assert(boss.hp === 500, 'HP = 500 after 300 total damage');
    });

    // --- Phase transitions at correct thresholds ---
    _testRunner.suite('Boss phase transition P1→P2 at threshold', (assert) => {
        const boss = new Boss(480, 720);
        const p2Threshold = Math.floor(800 * THRESHOLDS[0]); // 528

        // Damage to just above threshold (529 HP = 66.125%)
        boss.damage(800 - p2Threshold - 1); // deal 271 damage → 529 HP
        assert(boss.phase === 1, 'phase still 1 at 529 HP (> 66%)');
        assert(boss.phaseTransitioning === false, 'no transition yet');

        // Cross threshold (528 HP = 66%)
        boss.damage(1);
        assert(boss.hp === 528, 'HP = 528 (66% exactly)');
        assert(boss.phase === 2, 'phase transitions to 2 at 66% HP');
        assert(boss.phaseTransitioning === true, 'phaseTransitioning = true');
        assert(boss.phaseTransitionTimer === 1.5, 'phaseTransitionTimer = 1.5s');
    });

    _testRunner.suite('Boss phase transition P2→P3 at threshold', (assert) => {
        const boss = new Boss(480, 720);
        const p2Threshold = Math.floor(800 * THRESHOLDS[0]); // 528
        const p3Threshold = Math.floor(800 * THRESHOLDS[1]); // 160

        // Push through P1→P2
        boss.damage(800 - p2Threshold); // 272 damage → 528 HP (triggers P2)
        assert(boss.phase === 2, 'phase 2 after crossing 66%');
        boss.phaseTransitioning = false; // simulate transition end

        // Damage to just above P3 threshold (161 HP > 20%)
        boss.damage(p2Threshold - p3Threshold - 1); // deal 367 → 161 HP
        assert(boss.phase === 2, 'phase still 2 at 161 HP (> 20%)');

        // Cross P3 threshold (160 HP = 20%)
        boss.damage(1);
        assert(boss.hp === 160, 'HP = 160 (20% exactly)');
        assert(boss.phase === 3, 'phase transitions to 3 at 20% HP');
        assert(boss.phaseTransitioning === true, 'phaseTransitioning = true on P3');
    });

    // --- Phase only transitions once per threshold ---
    _testRunner.suite('Boss phase no repeat transition', (assert) => {
        const boss = new Boss(480, 720);
        // Take HP to 529 (just above 66% threshold)
        boss.damage(271); // 800 - 271 = 529
        assert(boss.phase === 1, 'still phase 1 at 529 HP (66.125% > 66%)');

        // Cross P2 threshold (528 HP = 66%)
        boss.damage(1);
        assert(boss.phase === 2, 'phase 2 triggered at 528 HP');

        // More damage but HP still > P3 threshold — should NOT re-trigger P2
        boss.phaseTransitioning = false;
        boss.damage(200); // 328 HP (41%)
        assert(boss.phase === 2, 'phase stays 2 (not re-triggered)');
    });

    // --- Entrance sequence ---
    _testRunner.suite('Boss entrance sequence', (assert) => {
        const boss = new Boss(480, 720);
        assert(boss.isEntering === true, 'isEntering true initially');
        assert(boss.y === -160, 'starts offscreen at y = -160');
        assert(boss.targetY === 100, 'targetY = 100');

        // Update with dt=0.5: moves down 40px
        boss.update(0.5, null);
        assert(boss.y === -120, 'y = -120 after 0.5s (entrance speed 80)');
        assert(boss.isEntering === true, 'still entering (not yet at target)');

        // Update with dt=3.25: total = 3.75s → y = -160 + 300 = 140, past target
        boss.update(3.25, null);
        assert(boss.y >= boss.targetY, 'y reached targetY');

        // Next update: y >= targetY and isEntering still true → isEntering = false
        boss.update(0, null);
        assert(boss.isEntering === false, 'isEntering false after reaching target');
    });

    // --- Phase transition timer and invulnerability ---
    _testRunner.suite('Boss phase transition invulnerability', (assert) => {
        const boss = new Boss(480, 720);

        // Push to phase 2
        boss.damage(272);
        assert(boss.phaseTransitioning === true, 'transitioning after P1→P2');
        assert(boss.phaseTransitionTimer === 1.5, 'timer = 1.5s');

        // Update during transition: timer counts down
        boss.update(0.5, null);
        assert(boss.phaseTransitionTimer === 1.0, 'timer = 1.0s after 0.5s');
        assert(boss.phaseTransitioning === true, 'still transitioning');

        // Finish transition
        boss.update(1.0, null);
        assert(boss.phaseTransitionTimer <= 0, 'timer <= 0');
        assert(boss.phaseTransitioning === false, 'transition ended');
    });

    // --- Movement speed from Balance config ---
    _testRunner.suite('Boss movement speed per phase', (assert) => {
        const fed = new Boss(480, 720, 'FEDERAL_RESERVE');
        assert(fed.moveSpeed === 70, 'FED P1 speed = 70');

        const bce = new Boss(480, 720, 'BCE');
        assert(bce.moveSpeed === 35, 'BCE P1 speed = 35');

        const boj = new Boss(480, 720, 'BOJ');
        assert(boj.moveSpeed === 45, 'BOJ P1 speed = 45');

        // Phase change updates speed
        fed.damage(272); // P2 trigger
        assert(fed.moveSpeed === 130, 'FED P2 speed = 130 after transition');

        // Force P3
        fed.phaseTransitioning = false;
        fed.damage(368); // take HP from 528 to 160
        assert(fed.moveSpeed === 170, 'FED P3 speed = 170 after transition');
    });

    // --- Attack fallback (no BulletPatterns) ---
    _testRunner.suite('Boss attack fallback — FED', (assert) => {
        const boss = new Boss(480, 720, 'FEDERAL_RESERVE');
        // Skip entrance and fireTimer
        boss.y = boss.targetY;
        boss.isEntering = false;
        boss.fireTimer = 0;

        const bullets = boss.attack(null);
        assert(Array.isArray(bullets), 'attack returns array');
        assert(bullets.length === 5, 'FED fallback returns 5 bullets (i=-2..2)');
        bullets.forEach(b => {
            assert(typeof b.x === 'number', 'bullet.x is number');
            assert(typeof b.vy === 'number', 'bullet.vy is number');
            assert(b.color, 'bullet has color');
        });
    });

    _testRunner.suite('Boss attack fallback — BCE', (assert) => {
        const boss = new Boss(480, 720, 'BCE');
        boss.y = boss.targetY;
        boss.isEntering = false;
        boss.fireTimer = 0;

        const bullets = boss.attack(null);
        assert(Array.isArray(bullets), 'BCE attack returns array');
        assert(bullets.length === 7, 'BCE fallback returns 7 bullets (i=-3..3)');
    });

    _testRunner.suite('Boss attack fallback — BOJ', (assert) => {
        const boss = new Boss(480, 720, 'BOJ');
        boss.y = boss.targetY;
        boss.isEntering = false;
        boss.fireTimer = 0;

        const bullets = boss.attack(null);
        assert(Array.isArray(bullets), 'BOJ attack returns array');
        assert(bullets.length === 5, 'BOJ fallback returns 5 bullets (i=-2..2)');
    });

    // --- Attack returns null during entrance and transition ---
    _testRunner.suite('Boss attack blocked during entrance/transition', (assert) => {
        const boss = new Boss(480, 720, 'FEDERAL_RESERVE');

        // During entrance: update returns null
        const result1 = boss.update(1.0, null);
        assert(result1 === null, 'update returns null during entrance');

        // During phase transition: update returns null
        boss.y = boss.targetY;
        boss.isEntering = false;
        boss.phaseTransitioning = true;
        const result2 = boss.update(1.0, null);
        assert(result2 === null, 'update returns null during phase transition');
    });

    // --- Boss type-specific properties ---
    _testRunner.suite('Boss type-specific properties', (assert) => {
        // BCE has stars array
        const bce = new Boss(480, 720, 'BCE');
        assert(Array.isArray(bce.stars), 'BCE has stars array');
        assert(bce.stars.length === 12, 'BCE has 12 stars');

        // BOJ has specific properties
        const boj = new Boss(480, 720, 'BOJ');
        assert(typeof boj.wavePhase === 'number', 'BOJ wavePhase exists');
        assert(typeof boj.interventionCooldown === 'number', 'BOJ interventionCooldown');
        assert(boj.zenMode === true, 'BOJ zenMode = true (phase 1)');
        assert(typeof boj.bojInterventionTimer === 'number', 'BOJ intervention timer');
        assert(typeof boj.bojTelegraphTimer === 'number', 'BOJ telegraph timer');

        // FED has no special arrays
        const fed = new Boss(480, 720, 'FEDERAL_RESERVE');
        assert(typeof fed.angle === 'number', 'FED angle exists');
    });

    // --- printMoney guard ---
    _testRunner.suite('Boss printMoney guard', (assert) => {
        const boss = new Boss(480, 720, 'FEDERAL_RESERVE');
        // Ensure window.Game.enemies is undefined
        const prevEnemies = window.Game.enemies;
        delete window.Game.enemies;

        let threw = false;
        try {
            boss.printMoney();
        } catch (e) {
            threw = true;
        }
        assert(!threw, 'printMoney does not throw when G.enemies missing');

        // Restore
        if (prevEnemies !== undefined) window.Game.enemies = prevEnemies;
    });

    // --- Phase 3 BOJ zenMode becomes false ---
    _testRunner.suite('BOJ zenMode deactivates in phase 2+', (assert) => {
        const boj = new Boss(480, 720, 'BOJ');
        assert(boj.zenMode === true, 'BOJ zenMode = true in phase 1');

        // Trigger phase 2
        boj.damage(272);
        assert(boj.zenMode === false, 'BOJ zenMode = false after P2 transition');
    });
})();
