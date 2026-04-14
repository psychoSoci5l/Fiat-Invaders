/**
 * Score system and HYPER config tests
 */
(function () {
    _testRunner.suite('Score config', (assert) => {
        const Balance = window.Game.Balance;
        assert(Balance, 'Balance exists');
        assert(Balance.SCORE, 'Balance.SCORE exists');

        // Required keys
        assert(typeof Balance.SCORE.STREAK_TIMEOUT === 'number', 'STREAK_TIMEOUT is a number');
        assert(typeof Balance.SCORE.STREAK_MULT_MAX === 'number', 'STREAK_MULT_MAX is a number');
        assert(typeof Balance.SCORE.STREAK_MULT_PER_KILL === 'number', 'STREAK_MULT_PER_KILL is a number');
        assert(typeof Balance.SCORE.BEAR_MARKET_MULT === 'number', 'BEAR_MARKET_MULT is a number');

        // Sane values
        assert(Balance.SCORE.STREAK_TIMEOUT > 0, 'STREAK_TIMEOUT > 0');
        assert(Balance.SCORE.STREAK_MULT_MAX >= 1, 'STREAK_MULT_MAX >= 1');
        assert(Balance.SCORE.STREAK_MULT_PER_KILL > 0, 'STREAK_MULT_PER_KILL > 0');
        assert(Balance.SCORE.BEAR_MARKET_MULT >= 1, 'BEAR_MARKET_MULT >= 1');
    });

    _testRunner.suite('Score multipliers', (assert) => {
        const Balance = window.Game.Balance;

        // Bear market multiplier
        var bearMult = Balance.SCORE.BEAR_MARKET_MULT;
        assert(bearMult === 2, 'Bear market mult is 2x');

        // Streak multiplier calculation
        var perKill = Balance.SCORE.STREAK_MULT_PER_KILL;
        var maxMult = Balance.SCORE.STREAK_MULT_MAX;

        // After 1 kill: 1 + 0.1 = 1.1x
        var streak1 = 1 + (1 * perKill);
        assert(streak1 === 1.1, 'streak of 1 = 1.1x multiplier');

        // After 10 kills: 1 + 10 * 0.1 = 2.0x (should be capped at max)
        var streak10 = Math.min(1 + (10 * perKill), maxMult);
        assert(streak10 === maxMult, 'streak of 10 hits max multiplier cap');

        // After 20 kills: should still be capped
        var streak20 = Math.min(1 + (20 * perKill), maxMult);
        assert(streak20 === maxMult, 'streak of 20 still capped at max');

        // HYPER score multiplier
        var hyperMult = Balance.HYPER.SCORE_MULT;
        assert(hyperMult === 3.0, 'HYPER score mult is 3.0x');

        // Combined: bear market + max streak + HYPER
        var combined = bearMult * maxMult * hyperMult;
        assert(combined === 12.0, 'Bear(2) * MaxStreak(2) * HYPER(3) = 12x');
    });

    _testRunner.suite('HYPER config', (assert) => {
        const Balance = window.Game.Balance;
        assert(Balance.HYPER, 'Balance.HYPER exists');

        // Required keys
        assert(typeof Balance.HYPER.SCORE_MULT === 'number', 'SCORE_MULT exists and is number');
        assert(typeof Balance.HYPER.METER_THRESHOLD === 'number', 'METER_THRESHOLD exists and is number');
        assert(typeof Balance.HYPER.AUTO_ACTIVATE === 'boolean', 'AUTO_ACTIVATE exists and is boolean');

        // Specific values
        assert(Balance.HYPER.METER_THRESHOLD === 100, 'METER_THRESHOLD is 100');
        assert(Balance.HYPER.AUTO_ACTIVATE === true, 'AUTO_ACTIVATE is true');
        assert(Balance.HYPER.SCORE_MULT === 3.0, 'SCORE_MULT is 3.0');

        // Other HYPER config keys should exist
        assert(typeof Balance.HYPER.BASE_DURATION === 'number', 'BASE_DURATION exists');
        assert(typeof Balance.HYPER.HITBOX_PENALTY === 'number', 'HITBOX_PENALTY exists');
        assert(typeof Balance.HYPER.COOLDOWN === 'number', 'COOLDOWN exists');
        assert(Balance.HYPER.BASE_DURATION > 0, 'BASE_DURATION > 0');
        assert(Balance.HYPER.HITBOX_PENALTY > 1, 'HITBOX_PENALTY > 1 (increases risk)');
    });
})();
