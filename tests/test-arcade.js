/**
 * ArcadeModifiers unit tests
 */
(function () {
    const AM = window.Game.ArcadeModifiers;
    const RS = window.Game.RunState;

    // Helper: grab a fresh baseline baseline of arcadeBonuses
    function baselineBonuses() {
        return {
            fireRateMult: 1.0, damageMult: 1.0, piercePlus: 0,
            speedMult: 1.0, enemyHpMult: 1.0, enemyBulletSpeedMult: 1.0,
            dropRateMult: 1.0, scoreMult: 1.0, grazeRadiusMult: 1.0,
            pityMult: 1.0, extraLives: 0, nanoShieldTimer: 0,
            nanoShieldCooldown: 0, lastStandAvailable: false,
            noShieldDrops: false, volatileRounds: false,
            chainLightning: false, critChance: 0, critMult: 3.0
        };
    }

    // Reset arcade state between tests
    function resetArcadeState() {
        RS.arcadeModifiers = [];
        RS.arcadeModifierPicks = 0;
        RS.arcadeBonuses = baselineBonuses();
    }

    // --- Namespace ---
    _testRunner.suite('ArcadeModifiers namespace', (assert) => {
        assert(AM, 'ArcadeModifiers exists');
        assert(typeof AM.getRandomModifiers === 'function', 'getRandomModifiers is function');
        assert(typeof AM.applyModifier === 'function', 'applyModifier is function');
        assert(typeof AM.recalculateBonuses === 'function', 'recalculateBonuses is function');
        assert(typeof AM.getModifierById === 'function', 'getModifierById is function');
        assert(typeof AM.getCategoryColor === 'function', 'getCategoryColor is function');
        assert(typeof AM.isArcadeMode === 'function', 'isArcadeMode is function');
        assert(Array.isArray(AM.MODIFIER_POOL), 'MODIFIER_POOL is array');
        assert(AM.CATEGORIES, 'CATEGORIES exists');
    });

    // --- Modifier pool integrity ---
    _testRunner.suite('ArcadeModifiers pool integrity', (assert) => {
        assert(AM.MODIFIER_POOL.length >= 13, 'at least 13 modifiers in pool');

        // Every modifier has required fields
        AM.MODIFIER_POOL.forEach(mod => {
            assert(typeof mod.id === 'string' && mod.id.length > 0, `${mod.id}: id is non-empty string`);
            assert(typeof mod.name === 'string' && mod.name.length > 0, `${mod.id}: name is non-empty string`);
            assert(typeof mod.icon === 'string', `${mod.id}: icon is string`);
            assert(mod.desc && mod.desc.EN, `${mod.id}: desc.EN exists`);
            assert(typeof mod.apply === 'function', `${mod.id}: apply is function`);
            assert(typeof mod.stackable === 'boolean', `${mod.id}: stackable is boolean`);
            if (mod.stackable) {
                assert(typeof mod.maxStacks === 'number' && mod.maxStacks > 0, `${mod.id}: maxStacks > 0`);
            }
        });

        // All modifier IDs are unique
        const ids = AM.MODIFIER_POOL.map(m => m.id);
        const uniqueIds = new Set(ids);
        assert(ids.length === uniqueIds.size, 'all modifier IDs are unique');

        // All three categories present in pool
        const cats = new Set(AM.MODIFIER_POOL.map(m => m.category));
        assert(cats.has('OFFENSE'), 'OFFENSE category present');
        assert(cats.has('DEFENSE'), 'DEFENSE category present');
        assert(cats.has('WILD'), 'WILD category present');
    });

    // --- Category coverage ---
    _testRunner.suite('ArcadeModifiers categories', (assert) => {
        const cats = AM.CATEGORIES;
        assert(cats.OFFENSE === 'OFFENSE', 'OFFENSE = OFFENSE');
        assert(cats.DEFENSE === 'DEFENSE', 'DEFENSE = DEFENSE');
        assert(cats.WILD === 'WILD', 'WILD = WILD');

        // Category colors
        assert(AM.CATEGORY_COLORS.OFFENSE === '#ff6b35', 'OFFENSE color');
        assert(AM.CATEGORY_COLORS.DEFENSE === '#00f0ff', 'DEFENSE color');
        assert(AM.CATEGORY_COLORS.WILD === '#ff2d95', 'WILD color');

        // getCategoryColor returns correct colors
        assert(AM.getCategoryColor('OFFENSE') === '#ff6b35', 'getCategoryColor(OFFENSE)');
        assert(AM.getCategoryColor('DEFENSE') === '#00f0ff', 'getCategoryColor(DEFENSE)');
        assert(AM.getCategoryColor('WILD') === '#ff2d95', 'getCategoryColor(WILD)');
        assert(AM.getCategoryColor('UNKNOWN') === '#ffffff', 'getCategoryColor(UNKNOWN) default');
    });

    // --- getModifierById ---
    _testRunner.suite('ArcadeModifiers getModifierById', (assert) => {
        const overclock = AM.getModifierById('OVERCLOCK');
        assert(overclock !== null, 'OVERCLOCK found');
        assert(overclock.name === 'Overclock', 'OVERCLOCK name is Overclock');
        assert(overclock.category === 'OFFENSE', 'OVERCLOCK category OFFENSE');
        assert(overclock.stackable === true, 'OVERCLOCK stackable');
        assert(overclock.maxStacks === 2, 'OVERCLOCK maxStacks 2');

        const nano = AM.getModifierById('NANO_SHIELD');
        assert(nano !== null, 'NANO_SHIELD found');
        assert(nano.stackable === false, 'NANO_SHIELD NOT stackable');

        const missing = AM.getModifierById('DOES_NOT_EXIST');
        assert(missing === null, 'unknown id returns null');
    });

    // --- getRandomModifiers: count ---
    _testRunner.suite('ArcadeModifiers getRandomModifiers count', (assert) => {
        // Test with empty current modifiers
        const picked = AM.getRandomModifiers(3, []);
        assert(picked.length === 3, 'getRandomModifiers(3, []) returns 3 modifiers');
        // All are unique (no duplicates)
        const ids = picked.map(m => m.id);
        const unique = new Set(ids);
        assert(ids.length === unique.size, 'all selected modifiers are distinct');

        // Edge: request 0
        const zero = AM.getRandomModifiers(0, []);
        assert(zero.length === 0, 'getRandomModifiers(0, []) returns empty');

        // Edge: request more than available (impossible since only ~15 but we should still get all)
        const many = AM.getRandomModifiers(999, []);
        assert(many.length === AM.MODIFIER_POOL.length, 'getRandomModifiers(999, []) returns all available');
    });

    // --- getRandomModifiers: category balance (count >= 3) ---
    _testRunner.suite('ArcadeModifiers getRandomModifiers category balance', (assert) => {
        // With count >= 3, we should get at least 1 OFFENSE and 1 DEFENSE
        // Run multiple times to account for randomness
        let allHaveOffense = true;
        let allHaveDefense = true;
        for (let i = 0; i < 20; i++) {
            const picked = AM.getRandomModifiers(3, []);
            const categories = picked.map(m => m.category);
            if (!categories.includes('OFFENSE')) allHaveOffense = false;
            if (!categories.includes('DEFENSE')) allHaveDefense = false;
        }
        assert(allHaveOffense, 'getRandomModifiers(3) always includes OFFENSE (20 runs)');
        assert(allHaveDefense, 'getRandomModifiers(3) always includes DEFENSE (20 runs)');

        // count = 2: no category guarantee, just returns 2 distinct
        for (let i = 0; i < 20; i++) {
            const picked = AM.getRandomModifiers(2, []);
            assert(picked.length === 2, 'getRandomModifiers(2) returns 2');
        }
    });

    // --- getRandomModifiers: stack limits ---
    _testRunner.suite('ArcadeModifiers getRandomModifiers stack limits', (assert) => {
        // OVERCLOCK has maxStacks=2 — after 2 picks, it should be excluded
        const with2Overclock = ['OVERCLOCK', 'OVERCLOCK'];
        const picked = AM.getRandomModifiers(10, with2Overclock);
        const hasOverclock = picked.some(m => m.id === 'OVERCLOCK');
        assert(!hasOverclock, 'OVERCLOCK excluded when already at maxStacks=2');

        // Non-stackable: after 1 pick, it should be excluded
        const withVolatile = ['VOLATILE_ROUNDS'];
        const picked2 = AM.getRandomModifiers(10, withVolatile);
        const hasVolatile = picked2.some(m => m.id === 'VOLATILE_ROUNDS');
        assert(!hasVolatile, 'VOLATILE_ROUNDS excluded (non-stackable, already owned)');
    });

    // --- recalculateBonuses: baseline ---
    _testRunner.suite('ArcadeModifiers recalculateBonuses baseline', (assert) => {
        resetArcadeState();
        AM.recalculateBonuses();
        const b = RS.arcadeBonuses;
        assert(b.fireRateMult === 1.0, 'fireRateMult = 1.0');
        assert(b.damageMult === 1.0, 'damageMult = 1.0');
        assert(b.piercePlus === 0, 'piercePlus = 0');
        assert(b.speedMult === 1.0, 'speedMult = 1.0');
        assert(b.enemyHpMult === 1.0, 'enemyHpMult = 1.0');
        assert(b.enemyBulletSpeedMult === 1.0, 'enemyBulletSpeedMult = 1.0');
        assert(b.dropRateMult === 1.0, 'dropRateMult = 1.0');
        assert(b.scoreMult === 1.0, 'scoreMult = 1.0');
        assert(b.grazeRadiusMult === 1.0, 'grazeRadiusMult = 1.0');
        assert(b.pityMult === 1.0, 'pityMult = 1.0');
        assert(b.extraLives === 0, 'extraLives = 0');
        assert(b.critChance === 0, 'critChance = 0');
        assert(b.critMult === 3.0, 'critMult = 3.0');
        assert(b.lastStandAvailable === false, 'lastStandAvailable = false');
        assert(b.noShieldDrops === false, 'noShieldDrops = false');
        assert(b.volatileRounds === false, 'volatileRounds = false');
        assert(b.chainLightning === false, 'chainLightning = false');
        resetArcadeState();
    });

    // --- applyModifier: single ---
    _testRunner.suite('ArcadeModifiers applyModifier single', (assert) => {
        resetArcadeState();

        AM.applyModifier('OVERCLOCK');
        assert(RS.arcadeModifiers.length === 1, 'arcadeModifiers has 1 entry');
        assert(RS.arcadeModifiers[0] === 'OVERCLOCK', 'first modifier is OVERCLOCK');
        assert(RS.arcadeModifierPicks === 1, 'modifierPicks incremented');
        assert(RS.arcadeBonuses.fireRateMult === 0.80, 'OVERCLOCK: fireRateMult = 0.80');

        resetArcadeState();
    });

    // --- Stacking: same modifier multiple times ---
    _testRunner.suite('ArcadeModifiers stacking', (assert) => {
        resetArcadeState();

        // Apply OVERCLOCK twice (maxStacks=2)
        AM.applyModifier('OVERCLOCK');
        AM.applyModifier('OVERCLOCK');
        assert(RS.arcadeModifiers.length === 2, '2 modifiers in list');
        assert(RS.arcadeBonuses.fireRateMult === 0.80 * 0.80, '2x OVERCLOCK: fireRateMult = 0.64');

        // Apply ARMOR_PIERCING twice (maxStacks=2)
        AM.applyModifier('ARMOR_PIERCING');
        AM.applyModifier('ARMOR_PIERCING');
        assert(RS.arcadeBonuses.piercePlus === 2, '2x ARMOR_PIERCING: piercePlus = 2');

        resetArcadeState();
    });

    // --- Stacking: EXTRA_LIFE ---
    _testRunner.suite('ArcadeModifiers EXTRA_LIFE stacking', (assert) => {
        resetArcadeState();

        for (let i = 0; i < 5; i++) {
            AM.applyModifier('EXTRA_LIFE');
        }
        assert(RS.arcadeBonuses.extraLives === 5, '5x EXTRA_LIFE: extraLives = 5');
        assert(RS.arcadeModifiers.length === 5, '5 modifiers in list');

        resetArcadeState();
    });

    // --- Non-stackable: applying again does nothing via UI but test the application ---
    _testRunner.suite('ArcadeModifiers non-stackable application', (assert) => {
        resetArcadeState();

        AM.applyModifier('VOLATILE_ROUNDS');
        assert(RS.arcadeBonuses.volatileRounds === true, 'VOLATILE_ROUNDS: volatileRounds = true');

        // Second apply (should work since applyModifier doesn't enforce — UI enforces via getRandomModifiers)
        // But verify the bonus value stays boolean true
        RS.arcadeModifiers.push('VOLATILE_ROUNDS');
        AM.recalculateBonuses();
        assert(RS.arcadeBonuses.volatileRounds === true, '2x VOLATILE_ROUNDS: still true (boolean)');

        resetArcadeState();
    });

    // --- recalculateBonuses: from-scratch reset ---
    _testRunner.suite('ArcadeModifiers recalculateBonuses from scratch', (assert) => {
        resetArcadeState();

        RS.arcadeModifiers = ['OVERCLOCK', 'OVERCLOCK', 'EXTRA_LIFE'];
        AM.recalculateBonuses();
        assert(Math.abs(RS.arcadeBonuses.fireRateMult - 0.64) < 0.001, 'recalc: 2x OVERCLOCK ~ 0.64');
        assert(RS.arcadeBonuses.extraLives === 1, 'recalc: 1x EXTRA_LIFE = 1');

        // Mutate bonuses directly, then recalc — should reset
        RS.arcadeBonuses.fireRateMult = 999;
        AM.recalculateBonuses();
        assert(Math.abs(RS.arcadeBonuses.fireRateMult - 0.64) < 0.001, 'recalc overwrites dirty state ~ 0.64');

        resetArcadeState();
    });

    // --- DOUBLE_SCORE enemy trade-off ---
    _testRunner.suite('ArcadeModifiers DOUBLE_SCORE trade-off', (assert) => {
        resetArcadeState();

        AM.applyModifier('DOUBLE_SCORE');
        assert(RS.arcadeBonuses.scoreMult === 2.0, 'DOUBLE_SCORE: scoreMult = 2.0');
        assert(RS.arcadeBonuses.enemyHpMult === 1.25, 'DOUBLE_SCORE: enemyHpMult = 1.25');

        resetArcadeState();
    });

    // --- JACKPOT trade-off ---
    _testRunner.suite('ArcadeModifiers JACKPOT trade-off', (assert) => {
        resetArcadeState();

        AM.applyModifier('JACKPOT');
        assert(RS.arcadeBonuses.pityMult === 0.50, 'JACKPOT: pityMult = 0.50');
        assert(RS.arcadeBonuses.grazeGainMult === 0.50, 'JACKPOT: grazeGainMult = 0.50');

        resetArcadeState();
    });

    // --- BERSERKER trade-off ---
    _testRunner.suite('ArcadeModifiers BERSERKER trade-off', (assert) => {
        resetArcadeState();

        AM.applyModifier('BERSERKER');
        assert(RS.arcadeBonuses.damageMult === 1.50, 'BERSERKER: damageMult = 1.50');
        assert(RS.arcadeBonuses.noShieldDrops === true, 'BERSERKER: noShieldDrops = true');

        resetArcadeState();
    });

    // --- BULLET_HELL trade-off ---
    _testRunner.suite('ArcadeModifiers BULLET_HELL trade-off', (assert) => {
        resetArcadeState();

        AM.applyModifier('BULLET_HELL');
        assert(RS.arcadeBonuses.enemyBulletSpeedMult === 1.40, 'BULLET_HELL: enemyBulletSpeedMult = 1.40');
        assert(RS.arcadeBonuses.dropRateMult === 1.60, 'BULLET_HELL: dropRateMult = 1.60');

        resetArcadeState();
    });

    // --- SPEED_DEMON ---
    _testRunner.suite('ArcadeModifiers SPEED_DEMON', (assert) => {
        resetArcadeState();

        AM.applyModifier('SPEED_DEMON');
        assert(RS.arcadeBonuses.speedMult === 1.25, 'SPEED_DEMON: speedMult = 1.25');

        resetArcadeState();
    });

    // --- CRITICAL_HIT stacking ---
    _testRunner.suite('ArcadeModifiers CRITICAL_HIT stacking', (assert) => {
        resetArcadeState();

        AM.applyModifier('CRITICAL_HIT');
        assert(RS.arcadeBonuses.critChance === 0.15, '1x CRITICAL_HIT: critChance = 0.15');

        AM.applyModifier('CRITICAL_HIT');
        assert(RS.arcadeBonuses.critChance === 0.30, '2x CRITICAL_HIT: critChance = 0.30 (capped)');

        resetArcadeState();
    });

    // --- CRITICAL_HIT: cap at 0.30 ---
    _testRunner.suite('ArcadeModifiers CRITICAL_HIT cap', (assert) => {
        resetArcadeState();

        // Force 3x via direct modifier list to test the Math.min cap
        RS.arcadeModifiers = ['CRITICAL_HIT', 'CRITICAL_HIT', 'CRITICAL_HIT'];
        AM.recalculateBonuses();
        assert(RS.arcadeBonuses.critChance === 0.30, '3x CRITICAL_HIT: critChance capped at 0.30');

        resetArcadeState();
    });

    // --- Mix of modifiers ---
    _testRunner.suite('ArcadeModifiers mixed application', (assert) => {
        resetArcadeState();

        AM.applyModifier('OVERCLOCK');
        AM.applyModifier('ARMOR_PIERCING');
        AM.applyModifier('DOUBLE_SCORE');
        AM.applyModifier('NANO_SHIELD');
        AM.applyModifier('EXTRA_LIFE');
        AM.applyModifier('EXTRA_LIFE');

        assert(RS.arcadeModifiers.length === 6, '6 modifiers applied');
        const b = RS.arcadeBonuses;
        assert(b.fireRateMult === 0.80, 'mixed: fireRateMult = 0.80');
        assert(b.piercePlus === 1, 'mixed: piercePlus = 1');
        assert(b.scoreMult === 2.0, 'mixed: scoreMult = 2.0');
        assert(b.extraLives === 2, 'mixed: extraLives = 2');
        assert(b.enemyHpMult === 1.25, 'mixed: enemyHpMult = 1.25');
        assert(typeof b.nanoShieldCooldown === 'number' && b.nanoShieldCooldown > 0, 'mixed: nanoShieldCooldown set');

        resetArcadeState();
    });

    // --- isArcadeMode ---
    _testRunner.suite('ArcadeModifiers isArcadeMode', (assert) => {
        // isArcadeMode returns true when CampaignState is not enabled
        // We can't reliably test this without CampaignState, but verify the function exists
        assert(typeof AM.isArcadeMode === 'function', 'isArcadeMode is function');
    });
})();
