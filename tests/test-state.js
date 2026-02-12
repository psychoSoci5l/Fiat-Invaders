/**
 * GameStateMachine & RunState tests
 */
(function () {
    _testRunner.suite('GameStateMachine', (assert) => {
        const GS = window.Game.GameState;
        assert(GS, 'GameState exists');

        // Save initial state
        const initial = GS.current;

        // forceSet
        GS.forceSet('VIDEO');
        assert(GS.current === 'VIDEO', 'forceSet to VIDEO');

        // Valid transition
        const ok = GS.transition('INTRO');
        assert(ok, 'VIDEO -> INTRO succeeds');
        assert(GS.current === 'INTRO', 'current is INTRO');

        // .is() helper
        assert(GS.is('INTRO'), 'is(INTRO) true');
        assert(!GS.is('PLAY'), 'is(PLAY) false');
        assert(GS.is('PLAY', 'INTRO'), 'is(PLAY, INTRO) true (multi)');

        // Self-transition (should be no-op, returns true)
        const self = GS.transition('INTRO');
        assert(self === true, 'self-transition returns true');

        // Valid chain
        GS.transition('WARMUP');
        GS.transition('PLAY');
        assert(GS.current === 'PLAY', 'chain to PLAY');

        GS.transition('PAUSE');
        assert(GS.current === 'PAUSE', 'PLAY -> PAUSE');

        GS.transition('PLAY');
        assert(GS.current === 'PLAY', 'PAUSE -> PLAY');

        GS.transition('GAMEOVER');
        assert(GS.current === 'GAMEOVER', 'PLAY -> GAMEOVER');

        GS.transition('INTRO');
        assert(GS.current === 'INTRO', 'GAMEOVER -> INTRO');

        // VALID_TRANSITIONS map exists for all states
        const states = Object.keys(GS.VALID_TRANSITIONS);
        assert(states.length >= 8, 'At least 8 states in transition map');
        states.forEach(s => {
            assert(Array.isArray(GS.VALID_TRANSITIONS[s]), `${s} has array of transitions`);
        });

        // Restore initial state
        GS.forceSet(initial);
    });

    _testRunner.suite('RunState', (assert) => {
        const RS = window.Game.RunState;
        assert(RS, 'RunState exists');

        // Reset produces clean state
        RS.reset();
        assert(RS.score === 0, 'score = 0 after reset');
        assert(RS.level === 1, 'level = 1 after reset');
        assert(RS.marketCycle === 1, 'marketCycle = 1 after reset');
        assert(RS.killCount === 0, 'killCount = 0 after reset');
        assert(RS.streak === 0, 'streak = 0 after reset');
        assert(RS.grazeCount === 0, 'grazeCount = 0 after reset');
        assert(RS.grazeMeter === 0, 'grazeMeter = 0 after reset');
        assert(Array.isArray(RS.perks), 'perks is array');
        assert(RS.perks.length === 0, 'perks empty after reset');
        assert(typeof RS.perkStacks === 'object', 'perkStacks is object');
        assert(typeof RS.modifiers === 'object', 'modifiers is object');

        // getMod
        assert(RS.getMod('scoreMult') === 1, 'getMod scoreMult = 1');
        assert(RS.getMod('nonexistent', 42) === 42, 'getMod fallback works');

        // Modifiers exist
        assert(RS.modifiers.fireRateMult === 1, 'fireRateMult = 1');
        assert(RS.modifiers.damageMult === 1, 'damageMult = 1');
        assert(RS.modifiers.speedMult === 1, 'speedMult = 1');

        // Fiat kill counter
        assert(RS.fiatKillCounter, 'fiatKillCounter exists');
        assert(RS.fiatKillCounter['$'] === 0, 'fiatKillCounter $ = 0');
        assert(RS.fiatKillCounter['€'] === 0, 'fiatKillCounter EUR = 0');

        // Mutate and reset
        RS.score = 9999;
        RS.perks.push('test');
        RS.reset();
        assert(RS.score === 0, 'score reset after mutation');
        assert(RS.perks.length === 0, 'perks reset after mutation');
    });
})();
