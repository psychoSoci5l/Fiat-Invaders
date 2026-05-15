/**
 * Miniboss Rework tests — S12.1 through S12.6
 * Tests cover: continuous-action flow, per-bloc movement, signature attacks,
 * perk drops, visual differentiation, and balance tuning.
 */
(function () {
    const G = window.Game;
    const Balance = G.Balance;

    // ─── S12.6: Balance Config ───────────────────────────────────────────────

    _testRunner.suite('S12.6 — MINI_BOSS balance config', (assert) => {
        const mb = Balance.ARCADE && Balance.ARCADE.MINI_BOSS;
        assert(mb, 'ARCADE.MINI_BOSS config exists');
        assert(mb.COOLDOWN === 12.0, 'COOLDOWN = 12.0s');
        assert(mb.MAX_PER_WAVE === 2, 'MAX_PER_WAVE = 2');
        assert(mb.HP_MULT === 0.40, 'HP_MULT = 0.40');
        assert(mb.THRESHOLD_MULT === 0.70, 'THRESHOLD_MULT = 0.70');
        assert(mb.BASE_FIRE_RATE === 1.0, 'BASE_FIRE_RATE = 1.0');
    });

    _testRunner.suite('S12.6 — Per-bloc HP and fire rate variance', (assert) => {
        const mb = Balance.ARCADE && Balance.ARCADE.MINI_BOSS;
        assert(mb.HP_MULT_PER_BLOC, 'HP_MULT_PER_BLOC exists');
        assert(mb.HP_MULT_PER_BLOC.USA === 1.05, 'USA HP mult = 1.05');
        assert(mb.HP_MULT_PER_BLOC.EU === 1.00, 'EU HP mult = 1.00');
        assert(mb.HP_MULT_PER_BLOC.ASIA === 0.95, 'ASIA HP mult = 0.95');
        assert(mb.HP_MULT_PER_BLOC.EMERGING === 0.90, 'EMERGING HP mult = 0.90');

        assert(mb.FIRE_RATE_PER_BLOC, 'FIRE_RATE_PER_BLOC exists');
        assert(mb.FIRE_RATE_PER_BLOC.USA === 0.90, 'USA fire rate = 0.90');
        assert(mb.FIRE_RATE_PER_BLOC.EU === 1.10, 'EU fire rate = 1.10');
        assert(mb.FIRE_RATE_PER_BLOC.ASIA === 0.80, 'ASIA fire rate = 0.80');
        assert(mb.FIRE_RATE_PER_BLOC.EMERGING === 1.20, 'EMERGING fire rate = 1.20');
    });

    // ─── S12.2 / S12.3: Movement & Attack Patterns ───────────────────────────

    _testRunner.suite('S12.2 — MINI_BOSS_PATTERNS config exists', (assert) => {
        const patterns = Balance.ARCADE && Balance.ARCADE.MINI_BOSS_PATTERNS;
        assert(patterns, 'ARCADE.MINI_BOSS_PATTERNS config exists');
        assert(patterns.BLOCS, 'BLOCS mapping exists');
        assert(patterns.USA, 'USA bloc config exists');
        assert(patterns.EU, 'EU bloc config exists');
        assert(patterns.ASIA, 'ASIA bloc config exists');
        assert(patterns.EMERGING, 'EMERGING bloc config exists');
    });

    _testRunner.suite('S12.2 — Currency-to-bloc mapping', (assert) => {
        const blocs = Balance.ARCADE.MINI_BOSS_PATTERNS.BLOCS;
        assert(blocs.USA.indexOf('$') !== -1, '$ maps to USA');
        assert(blocs.USA.indexOf('C$') !== -1, 'C$ maps to USA');
        assert(blocs.USA.indexOf('Ⓒ') !== -1, 'Ⓒ maps to USA');
        assert(blocs.EU.indexOf('€') !== -1, '€ maps to EU');
        assert(blocs.EU.indexOf('£') !== -1, '£ maps to EU');
        assert(blocs.ASIA.indexOf('¥') !== -1, '¥ maps to ASIA');
        assert(blocs.ASIA.indexOf('₩') !== -1, '₩ maps to ASIA');
        assert(blocs.EMERGING.indexOf('₽') !== -1, '₽ maps to EMERGING');
    });

    _testRunner.suite('S12.2 — Movement types are distinct', (assert) => {
        const p = Balance.ARCADE.MINI_BOSS_PATTERNS;
        assert(p.USA.movementType === 'PATROL', 'USA movement = PATROL');
        assert(p.EU.movementType === 'WEAVE', 'EU movement = WEAVE');
        assert(p.ASIA.movementType === 'DASH', 'ASIA movement = DASH');
        assert(p.EMERGING.movementType === 'ORBIT', 'EMERGING movement = ORBIT');

        // Verify all 4 are different
        var types = [p.USA.movementType, p.EU.movementType, p.ASIA.movementType, p.EMERGING.movementType];
        var unique = types.filter(function (v, i, a) { return a.indexOf(v) === i; });
        assert(unique.length === 4, 'All 4 movement types are distinct');
    });

    _testRunner.suite('S12.2 — Movement config values are data-driven', (assert) => {
        const p = Balance.ARCADE.MINI_BOSS_PATTERNS;

        // USA PATROL
        assert(typeof p.USA.speed === 'number', 'USA speed is number');
        assert(typeof p.USA.amplitude === 'number', 'USA amplitude is number');
        assert(p.USA.speed > 0, 'USA speed > 0');
        assert(p.USA.amplitude > 0, 'USA amplitude > 0');

        // EU WEAVE
        assert(typeof p.EU.ampX === 'number', 'EU ampX is number');
        assert(typeof p.EU.ampY === 'number', 'EU ampY is number');
        assert(p.EU.ampX > 0, 'EU ampX > 0');
        assert(p.EU.ampY > 0, 'EU ampY > 0');

        // ASIA DASH
        assert(typeof p.ASIA.dashSpeed === 'number', 'ASIA dashSpeed is number');
        assert(typeof p.ASIA.dashDistance === 'number', 'ASIA dashDistance is number');
        assert(p.ASIA.dashSpeed > 0, 'ASIA dashSpeed > 0');
        assert(p.ASIA.dashDistance > 0, 'ASIA dashDistance > 0');

        // EMERGING ORBIT
        assert(typeof p.EMERGING.radiusX === 'number', 'EMERGING radiusX is number');
        assert(typeof p.EMERGING.radiusY === 'number', 'EMERGING radiusY is number');
        assert(p.EMERGING.radiusX > 0, 'EMERGING radiusX > 0');
        assert(p.EMERGING.radiusY > 0, 'EMERGING radiusY > 0');
    });

    _testRunner.suite('S12.3 — Signature attacks config exists', (assert) => {
        const p = Balance.ARCADE.MINI_BOSS_PATTERNS;

        // Each bloc has attacks for all 3 phases
        ['USA', 'EU', 'ASIA', 'EMERGING'].forEach(function (bloc) {
            assert(p[bloc].attacks, bloc + ' has attacks config');
            assert(p[bloc].attacks.phase0, bloc + ' has phase0 attack');
            assert(p[bloc].attacks.phase1, bloc + ' has phase1 attack');
            assert(p[bloc].attacks.phase2, bloc + ' has phase2 attack');
        });
    });

    _testRunner.suite('S12.3 — Signature attacks are unique per bloc', (assert) => {
        const p = Balance.ARCADE.MINI_BOSS_PATTERNS;

        // Phase 2 (signature) attacks must all be different
        var sigTypes = [
            p.USA.attacks.phase2.type,
            p.EU.attacks.phase2.type,
            p.ASIA.attacks.phase2.type,
            p.EMERGING.attacks.phase2.type,
        ];
        var uniqueSig = sigTypes.filter(function (v, i, a) { return a.indexOf(v) === i; });
        assert(uniqueSig.length === 4, 'All 4 signature attacks are unique');

        // Verify specific signature types
        assert(p.USA.attacks.phase2.type === 'SWEEP_ARC', 'USA signature = SWEEP_ARC');
        assert(p.EU.attacks.phase2.type === 'ORBIT_DELAYED', 'EU signature = ORBIT_DELAYED');
        assert(p.ASIA.attacks.phase2.type === 'TEMPORARY_HOMING', 'ASIA signature = TEMPORARY_HOMING');
        assert(p.EMERGING.attacks.phase2.type === 'EXPANDING_RING', 'EMERGING signature = EXPANDING_RING');
    });

    _testRunner.suite('S12.3 — Attack config values are data-driven', (assert) => {
        const p = Balance.ARCADE.MINI_BOSS_PATTERNS;

        // USA RAPID_AIMED
        assert(p.USA.attacks.phase0.type === 'RAPID_AIMED', 'USA phase0 = RAPID_AIMED');
        assert(p.USA.attacks.phase0.count === 2, 'USA phase0 count = 2');
        assert(p.USA.attacks.phase0.interval === 0.15, 'USA phase0 interval = 0.15');

        // EU HORIZONTAL_WALL
        assert(p.EU.attacks.phase1.type === 'HORIZONTAL_WALL', 'EU phase1 = HORIZONTAL_WALL');
        assert(p.EU.attacks.phase1.count === 6, 'EU phase1 count = 6');

        // ASIA MULTI_SPEED
        assert(p.ASIA.attacks.phase1.type === 'MULTI_SPEED', 'ASIA phase1 = MULTI_SPEED');
        assert(Array.isArray(p.ASIA.attacks.phase1.speeds), 'ASIA phase1 speeds is array');
        assert(p.ASIA.attacks.phase1.speeds.length === 3, 'ASIA phase1 has 3 speeds');

        // EMERGING SHOTGUN
        assert(p.EMERGING.attacks.phase1.type === 'SHOTGUN', 'EMERGING phase1 = SHOTGUN');
        assert(p.EMERGING.attacks.phase1.count === 8, 'EMERGING phase1 count = 8');
    });

    // ─── S12.5: Visual Differentiation ────────────────────────────────────────

    _testRunner.suite('S12.5 — Visual config exists per bloc', (assert) => {
        const p = Balance.ARCADE.MINI_BOSS_PATTERNS;

        ['USA', 'EU', 'ASIA', 'EMERGING'].forEach(function (bloc) {
            assert(p[bloc].visual, bloc + ' has visual config');
            assert(p[bloc].visual.shape, bloc + ' has shape config');
            assert(p[bloc].visual.radius, bloc + ' has radius config');
            assert(p[bloc].visual.warningText, bloc + ' has warningText config');
            assert(p[bloc].visual.phaseDotStyle, bloc + ' has phaseDotStyle config');
        });
    });

    _testRunner.suite('S12.5 — Shapes are distinct per bloc', (assert) => {
        const p = Balance.ARCADE.MINI_BOSS_PATTERNS;
        var shapes = [p.USA.visual.shape, p.EU.visual.shape, p.ASIA.visual.shape, p.EMERGING.visual.shape];
        var uniqueShapes = shapes.filter(function (v, i, a) { return a.indexOf(v) === i; });
        assert(uniqueShapes.length === 4, 'All 4 shapes are distinct');

        assert(p.USA.visual.shape === 'HEAVY_HEX', 'USA shape = HEAVY_HEX');
        assert(p.EU.visual.shape === 'OCTAGON', 'EU shape = OCTAGON');
        assert(p.ASIA.visual.shape === 'DIAMOND', 'ASIA shape = DIAMOND');
        assert(p.EMERGING.visual.shape === 'JAGGED_HEX', 'EMERGING shape = JAGGED_HEX');
    });

    _testRunner.suite('S12.5 — VFX config per bloc', (assert) => {
        const p = Balance.ARCADE.MINI_BOSS_PATTERNS;

        assert(p.USA.visual.trailCount, 'USA has trail config');
        assert(p.EU.visual.starRing === true, 'EU has star ring');
        assert(p.ASIA.visual.flashOnDirectionChange === true, 'ASIA has flash on direction change');
        assert(p.EMERGING.visual.flickerAura === true, 'EMERGING has flicker aura');
    });

    _testRunner.suite('S12.5 — Warning texts are bloc-specific', (assert) => {
        const p = Balance.ARCADE.MINI_BOSS_PATTERNS;
        var warnings = [p.USA.visual.warningText, p.EU.visual.warningText, p.ASIA.visual.warningText, p.EMERGING.visual.warningText];
        var uniqueWarnings = warnings.filter(function (v, i, a) { return a.indexOf(v) === i; });
        assert(uniqueWarnings.length === 4, 'All 4 warning texts are unique');
    });

    // ─── S12.4: Perk Drops During Miniboss ────────────────────────────────────

    _testRunner.suite('S12.4 — MINI_BOSS_DROPS config exists', (assert) => {
        const drops = Balance.ARCADE && Balance.ARCADE.MINI_BOSS_DROPS;
        assert(drops, 'ARCADE.MINI_BOSS_DROPS config exists');
        assert(drops.ENABLED === true, 'MINI_BOSS_DROPS is enabled');
        assert(drops.DROP_CHANCE_PER_HIT === 0.08, 'DROP_CHANCE_PER_HIT = 0.08');
        assert(drops.PITY_HITS === 12, 'PITY_HITS = 12');
        assert(drops.MAX_DROPS_PER_FIGHT === 2, 'MAX_DROPS_PER_FIGHT = 2');
        assert(drops.DROP_COOLDOWN === 3.0, 'DROP_COOLDOWN = 3.0');
    });

    _testRunner.suite('S12.4 — Category weights sum to ~1.0', (assert) => {
        const weights = Balance.ARCADE.MINI_BOSS_DROPS.CATEGORY_WEIGHTS;
        var sum = weights.PERK + weights.SPECIAL + weights.UTILITY;
        assert(Math.abs(sum - 1.0) < 0.001, 'Category weights sum to ~1.0 (got ' + sum + ')');
        assert(weights.PERK === 0.50, 'PERK weight = 0.50');
        assert(weights.SPECIAL === 0.30, 'SPECIAL weight = 0.30');
        assert(weights.UTILITY === 0.20, 'UTILITY weight = 0.20');
    });

    _testRunner.suite('S12.4 — DropSystem has miniboss methods', (assert) => {
        const ds = G.DropSystem;
        assert(typeof ds.tryMinibossDrop === 'function', 'DropSystem has tryMinibossDrop method');
        assert(typeof ds.resetMinibossDrops === 'function', 'DropSystem has resetMinibossDrops method');
    });

    _testRunner.suite('S12.4 — tryMinibossDrop returns null outside Arcade', (assert) => {
        // Save original state
        var origIsArcade = G.ArcadeModifiers && G.ArcadeModifiers.isArcadeMode;

        // Force non-Arcade mode
        if (G.ArcadeModifiers) {
            G.ArcadeModifiers.isArcadeMode = function () { return false; };
        }

        var result = G.DropSystem.tryMinibossDrop(300, 150, 100);
        assert(result === null, 'tryMinibossDrop returns null outside Arcade mode');

        // Restore
        if (origIsArcade) {
            G.ArcadeModifiers.isArcadeMode = origIsArcade;
        }
    });

    _testRunner.suite('S12.4 — tryMinibossDrop respects max drops cap', (assert) => {
        // Save original state
        var origIsArcade = G.ArcadeModifiers && G.ArcadeModifiers.isArcadeMode;

        // Force Arcade mode
        if (G.ArcadeModifiers) {
            G.ArcadeModifiers.isArcadeMode = function () { return true; };
        }

        // Reset miniboss drops
        G.DropSystem.resetMinibossDrops();

        // Simulate hitting pity threshold repeatedly to force drops
        var drops = 0;
        for (var i = 0; i < 20; i++) {
            // Force pity by setting hits >= PITY_HITS
            G.DropSystem._minibossHitsSinceDrop = 12;
            // Bypass cooldown
            G.DropSystem._minibossLastDropTime = 0;
            var result = G.DropSystem.tryMinibossDrop(300, 150, i * 5);
            if (result) drops++;
        }

        assert(drops <= 2, 'Max 2 drops per fight (got ' + drops + ')');

        // Restore
        if (origIsArcade) {
            G.ArcadeModifiers.isArcadeMode = origIsArcade;
        }
    });

    _testRunner.suite('S12.4 — resetMinibossDrops clears tracking', (assert) => {
        G.DropSystem._minibossHitsSinceDrop = 5;
        G.DropSystem._minibossDropsThisFight = 1;
        G.DropSystem._minibossLastDropTime = 50;

        G.DropSystem.resetMinibossDrops();

        assert(G.DropSystem._minibossHitsSinceDrop === 0, 'hitsSinceDrop reset to 0');
        assert(G.DropSystem._minibossDropsThisFight === 0, 'dropsThisFight reset to 0');
        assert(G.DropSystem._minibossLastDropTime === 0, 'lastDropTime reset to 0');
    });

    // ─── S12.1: MiniBossManager API ──────────────────────────────────────────

    _testRunner.suite('S12.1 — MiniBossManager API', (assert) => {
        const mbm = G.MiniBossManager;
        assert(mbm, 'MiniBossManager exists');
        assert(typeof mbm.init === 'function', 'has init method');
        assert(typeof mbm.spawn === 'function', 'has spawn method');
        assert(typeof mbm.update === 'function', 'has update method');
        assert(typeof mbm.draw === 'function', 'has draw method');
        assert(typeof mbm.checkHit === 'function', 'has checkHit method');
        assert(typeof mbm.isActive === 'function', 'has isActive method');
        assert(typeof mbm.get === 'function', 'has get method');
        assert(typeof mbm.reset === 'function', 'has reset method');
    });

    _testRunner.suite('S12.1 — MiniBossManager starts inactive', (assert) => {
        G.MiniBossManager.reset();
        assert(G.MiniBossManager.isActive() === false, 'MiniBossManager is inactive after reset');
        assert(G.MiniBossManager.get() === null, 'MiniBossManager.get() returns null after reset');
    });

    // ─── Integration: config consistency ──────────────────────────────────────

    _testRunner.suite('S12 — Per-bloc HP/fire rate consistency between configs', (assert) => {
        const mb = Balance.ARCADE.MINI_BOSS;
        const p = Balance.ARCADE.MINI_BOSS_PATTERNS;

        ['USA', 'EU', 'ASIA', 'EMERGING'].forEach(function (bloc) {
            var hpFromPatterns = p[bloc].hpMult;
            var hpFromMiniBoss = mb.HP_MULT_PER_BLOC[bloc];
            assert(hpFromPatterns !== undefined, bloc + ' hpMult defined in patterns');
            assert(hpFromMiniBoss !== undefined, bloc + ' hpMult defined in MINI_BOSS');
            assert(hpFromPatterns === hpFromMiniBoss, bloc + ' HP mult consistent across configs (' + hpFromPatterns + ' vs ' + hpFromMiniBoss + ')');

            var frFromPatterns = p[bloc].fireRate;
            var frFromMiniBoss = mb.FIRE_RATE_PER_BLOC[bloc];
            assert(frFromPatterns !== undefined, bloc + ' fireRate defined in patterns');
            assert(frFromMiniBoss !== undefined, bloc + ' fireRate defined in MINI_BOSS');
            assert(frFromPatterns === frFromMiniBoss, bloc + ' fire rate consistent across configs (' + frFromPatterns + ' vs ' + frFromMiniBoss + ')');
        });
    });

    _testRunner.suite('S12 — All attack types are valid strings', (assert) => {
        const p = Balance.ARCADE.MINI_BOSS_PATTERNS;
        var validTypes = [
            'RAPID_AIMED', 'CONE', 'SWEEP_ARC',
            'ALTERNATE', 'HORIZONTAL_WALL', 'ORBIT_DELAYED',
            'FAST_AIMED', 'MULTI_SPEED', 'TEMPORARY_HOMING',
            'RANDOM_BURST', 'SHOTGUN', 'EXPANDING_RING',
        ];

        ['USA', 'EU', 'ASIA', 'EMERGING'].forEach(function (bloc) {
            ['phase0', 'phase1', 'phase2'].forEach(function (phase) {
                var type = p[bloc].attacks[phase].type;
                assert(validTypes.indexOf(type) !== -1, bloc + ' ' + phase + ' attack type "' + type + '" is valid');
            });
        });
    });
})();
