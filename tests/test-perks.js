/**
 * PerkManager unit tests
 */
(function () {
    const PM = window.Game.PerkManager;
    const RS = window.Game.RunState;
    const UPGRADES = window.Game.UPGRADES;

    // Track godchain activations
    let godchainCalls = 0;
    let lastEvents = [];

    function setupDeps(overrides) {
        const runState = overrides?.runState || RS;
        const mockPlayer = overrides?.player || {
            activateGodchain() { godchainCalls++; }
        };
        lastEvents = [];
        godchainCalls = 0;
        PM.init({
            getRunState: () => runState,
            getPlayer: () => mockPlayer,
            emitEvent: (name, data) => { lastEvents.push({ name, data }); }
        });
    }

    function resetRunState() {
        PM.reset();
        RS.reset();
        RS.perkLevel = 0;
        RS.perks = [];
        RS.perkStacks = {};
        RS.hasFirePerk = false;
        RS.hasLaserPerk = false;
        RS.hasElectricPerk = false;
    }

    // --- Namespace ---
    _testRunner.suite('PerkManager namespace', (assert) => {
        assert(PM, 'PerkManager exists');
        assert(typeof PM.init === 'function', 'init()');
        assert(typeof PM.getNextPerk === 'function', 'getNextPerk()');
        assert(typeof PM.applyNext === 'function', 'applyNext()');
        assert(typeof PM.reset === 'function', 'reset()');
        assert(typeof PM.getNextPerkColor === 'function', 'getNextPerkColor()');
        assert(typeof PM.canOfferPerk === 'function', 'canOfferPerk()');
        assert(typeof PM.getRecentPerks === 'function', 'getRecentPerks()');
        assert(PM.isActive() === false, 'isActive() returns false (v4.60+)');
    });

    // --- UPGRADES config integrity ---
    _testRunner.suite('UPGRADES config', (assert) => {
        assert(Array.isArray(UPGRADES), 'UPGRADES is array');
        assert(UPGRADES.length === 3, 'exactly 3 upgrades');
        assert(UPGRADES[0].id === 'fire_element', 'upgrade 0 = fire');
        assert(UPGRADES[1].id === 'laser_element', 'upgrade 1 = laser');
        assert(UPGRADES[2].id === 'electric_element', 'upgrade 2 = electric');
        assert(UPGRADES[0].order === 1, 'fire order = 1');
        assert(UPGRADES[1].order === 2, 'laser order = 2');
        assert(UPGRADES[2].order === 3, 'electric order = 3');
        UPGRADES.forEach(u => {
            assert(typeof u.apply === 'function', `${u.id}: apply() is function`);
        });
    });

    // --- getNextPerk sequence ---
    _testRunner.suite('PerkManager getNextPerk sequence', (assert) => {
        resetRunState();
        setupDeps();

        // PerkLevel 0 → Fire (order 1)
        RS.perkLevel = 0;
        const p1 = PM.getNextPerk();
        assert(p1 !== null, 'getNextPerk at level 0 returns perk');
        assert(p1.id === 'fire_element', 'first perk is Fire');

        // PerkLevel 1 → Laser (order 2)
        RS.perkLevel = 1;
        const p2 = PM.getNextPerk();
        assert(p2.id === 'laser_element', 'second perk is Laser');

        // PerkLevel 2 → Electric (order 3)
        RS.perkLevel = 2;
        const p3 = PM.getNextPerk();
        assert(p3.id === 'electric_element', 'third perk is Electric');

        // PerkLevel 3 → null (all collected)
        RS.perkLevel = 3;
        const p4 = PM.getNextPerk();
        assert(p4 === null, 'getNextPerk at level 3 returns null');

        resetRunState();
    });

    // --- getNextPerk returns null without deps ---
    _testRunner.suite('PerkManager getNextPerk without deps', (assert) => {
        PM.init({});
        const result = PM.getNextPerk();
        assert(result === null, 'getNextPerk returns null without getRunState dep');
    });

    // --- applyNext: Fire ---
    _testRunner.suite('PerkManager applyNext — Fire', (assert) => {
        resetRunState();
        setupDeps();

        const cd = PM.applyNext(0);
        assert(cd > 0, 'applyNext returns cooldown > 0');
        assert(RS.hasFirePerk === true, 'hasFirePerk = true');
        assert(RS.perkLevel === 1, 'perkLevel = 1 after Fire');
        assert(RS.perks.length === 1, 'perks has 1 entry');
        assert(RS.perks[0] === 'fire_element', 'perks[0] = fire_element');
        assert(RS.perkStacks.fire_element === 1, 'perkStacks.fire_element = 1');
        assert(godchainCalls === 0, 'GODCHAIN not triggered (only 1 perk)');

        resetRunState();
    });

    // --- applyNext: full evolution sequence ---
    _testRunner.suite('PerkManager applyNext — full sequence', (assert) => {
        resetRunState();
        setupDeps();

        // Fire
        PM.applyNext(0);
        assert(RS.perkLevel === 1, 'level 1 after Fire');
        assert(RS.hasFirePerk === true, 'hasFire');
        assert(RS.hasLaserPerk === false, 'no laser yet');

        // Laser
        PM.applyNext(0);
        assert(RS.perkLevel === 2, 'level 2 after Laser');
        assert(RS.hasLaserPerk === true, 'hasLaser');
        assert(RS.hasElectricPerk === false, 'no electric yet');

        // Electric (triggers GODCHAIN!)
        PM.applyNext(0);
        assert(RS.perkLevel === 3, 'level 3 after Electric');
        assert(RS.hasElectricPerk === true, 'hasElectric');
        assert(RS.perks.length === 3, '3 perks collected');
        assert(godchainCalls === 1, 'GODCHAIN triggered after perk 3');

        resetRunState();
    });

    // --- GODCHAIN re-trigger ---
    _testRunner.suite('PerkManager GODCHAIN re-trigger', (assert) => {
        resetRunState();
        setupDeps();

        // Collect all 3
        PM.applyNext(0); // Fire
        PM.applyNext(0); // Laser
        PM.applyNext(0); // Electric + GODCHAIN
        const before = godchainCalls;

        // Further calls re-trigger GODCHAIN
        PM.applyNext(0);
        assert(godchainCalls === before + 1, 'GODCHAIN re-triggered on 4th applyNext');
        assert(RS.perkLevel === 4, 'perkLevel keeps incrementing');

        PM.applyNext(0);
        assert(godchainCalls === before + 2, 'GODCHAIN re-triggered on 5th applyNext');
        assert(RS.perkLevel === 5, 'perkLevel = 5');

        resetRunState();
    });

    // --- applyNext respects cooldown ---
    _testRunner.suite('PerkManager applyNext respects cooldown', (assert) => {
        resetRunState();
        setupDeps();

        const cd = PM.applyNext(5); // Still in cooldown
        assert(cd === 0, 'applyNext returns 0 when perkCooldown > 0');
        assert(RS.perkLevel === 0, 'no perk applied (cooldown blocked)');

        resetRunState();
    });

    // --- canOfferPerk always true ---
    _testRunner.suite('PerkManager canOfferPerk', (assert) => {
        assert(PM.canOfferPerk() === true, 'canOfferPerk always true');
    });

    // --- reset ---
    _testRunner.suite('PerkManager reset', (assert) => {
        resetRunState();
        setupDeps();

        PM.applyNext(0);
        PM.applyNext(0);
        assert(PM.getRecentPerks().length === 2, '2 recent perks tracked');

        PM.reset();
        assert(PM.getRecentPerks().length === 0, 'recent perks cleared after reset');

        resetRunState();
    });

    // --- getNextPerkColor ---
    _testRunner.suite('PerkManager getNextPerkColor', (assert) => {
        resetRunState();

        // Level 0: Fire color
        RS.perkLevel = 0;
        setupDeps();
        assert(PM.getNextPerkColor() === '#ff4400', 'level 0 color = fire orange');

        // Level 1: Laser color
        RS.perkLevel = 1;
        setupDeps();
        assert(PM.getNextPerkColor() === '#00f0ff', 'level 1 color = laser cyan');

        // Level 2: Electric color
        RS.perkLevel = 2;
        setupDeps();
        assert(PM.getNextPerkColor() === '#8844ff', 'level 2 color = electric purple');

        // Level 3: GODCHAIN gold
        RS.perkLevel = 3;
        setupDeps();
        assert(PM.getNextPerkColor() === '#FFD700', 'level 3 color = GODCHAIN gold');

        // Level 4+: still GODCHAIN gold
        RS.perkLevel = 5;
        setupDeps();
        assert(PM.getNextPerkColor() === '#FFD700', 'level 5 color = GODCHAIN gold');

        resetRunState();
    });

    // --- getNextPerkColor without deps: defaults ---
    _testRunner.suite('PerkManager getNextPerkColor without deps', (assert) => {
        PM.init({});
        const color = PM.getNextPerkColor();
        assert(color === '#ff4400', 'default color (level 0, no runState) = fire orange');
    });

    // --- Elemental perk flags ---
    _testRunner.suite('PerkManager elemental flags', (assert) => {
        resetRunState();
        setupDeps();

        PM.applyNext(0); // Fire
        assert(RS.hasFirePerk === true, 'hasFirePerk');
        assert(RS.hasLaserPerk === false, '!hasLaserPerk');
        assert(RS.hasElectricPerk === false, '!hasElectricPerk');

        PM.applyNext(0); // Laser
        assert(RS.hasFirePerk === true, 'hasFirePerk (still)');
        assert(RS.hasLaserPerk === true, 'hasLaserPerk');
        assert(RS.hasElectricPerk === false, '!hasElectricPerk');

        PM.applyNext(0); // Electric
        assert(RS.hasFirePerk === true, 'hasFirePerk (still)');
        assert(RS.hasLaserPerk === true, 'hasLaserPerk (still)');
        assert(RS.hasElectricPerk === true, 'hasElectricPerk');

        resetRunState();
    });

    // --- Fixed evolution order (never varies) ---
    _testRunner.suite('PerkManager evolution order is fixed', (assert) => {
        resetRunState();
        setupDeps();

        // Run the sequence 10 times — must always be Fire → Laser → Electric
        for (let trial = 0; trial < 10; trial++) {
            resetRunState();
            setupDeps();
            const ids = [];
            ids.push(PM.getNextPerk().id);
            RS.perkLevel = 1;
            ids.push(PM.getNextPerk().id);
            RS.perkLevel = 2;
            ids.push(PM.getNextPerk().id);
            RS.perkLevel = 3;
            ids.push(PM.getNextPerk()); // null

            assert(ids[0] === 'fire_element', `trial ${trial}: first = Fire`);
            assert(ids[1] === 'laser_element', `trial ${trial}: second = Laser`);
            assert(ids[2] === 'electric_element', `trial ${trial}: third = Electric`);
            assert(ids[3] === null, `trial ${trial}: fourth = null`);
        }

        resetRunState();
    });
})();
