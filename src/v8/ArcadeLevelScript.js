window.Game = window.Game || {};

/**
 * ArcadeLevelScript — V8 scroller for Arcade mode.
 *
 * Converts WAVE_DEFINITIONS.WAVES into a time-driven burst SCRIPT.
 * - 1 infinite level, bursts simulate the 15 waves.
 * - Phases mapped to V8 patterns (DIVE, SINE, SWOOP, HOVER).
 * - Intermission 2.0s (4.0s post-boss).
 * - Post-C3: diff +0.20/cycle, formation remix 40%.
 *
 * Depends on: G.LevelScript.spawnEnemy, G.Balance.WAVE_DEFINITIONS.WAVES
 */
(function () {
    'use strict';
    const G = window.Game;

    const B = G.Balance;
    const _waveDefs = B && B.WAVE_DEFINITIONS && B.WAVE_DEFINITIONS.WAVES;
    const _arcade = B && B.ARCADE;

    // --- Tunable pacing from BalanceConfig ---
    const _pacing = (_arcade && _arcade.V8_PACING) || {};
    const PHASE_DURATION_S = _pacing.PHASE_DURATION_S || 6.0;
    const WAVE_GAP_S       = _pacing.WAVE_GAP_S       || 2.0;
    const BOSS_GAP_S       = _pacing.BOSS_GAP_S       || 4.0;
    const BURST_STAGGER_S  = _pacing.BURST_STAGGER_S  || 0.5;
    const MAX_PER_BURST    = _pacing.MAX_PER_BURST    || 5;

    // --- State ---
    let _script = [];
    let _time = 0;
    let _index = 0;
    let _cycle = 1;
    let _isRunning = false;

    // --- Helpers ---

    function _formationToPattern(f) {
        switch (f) {
            case 'WALL': return 'HOVER';
            case 'ARROW':
            case 'PINCER':
            case 'FLANKING': return 'SWOOP';
            case 'CHEVRON':
            case 'VORTEX':
            case 'SPIRAL': return 'SINE';
            case 'RECT':
            case 'HURRICANE':
            case 'STAIRCASE':
            case 'STAIRCASE_REVERSE': return 'DIVE';
            case 'FORTRESS':
            case 'FINAL_FORM': return 'HOVER';
            default: return 'DIVE';
        }
    }

    function _pickCurrency(currencies, index) {
        if (!currencies || currencies.length === 0) return '$';
        return currencies[index % currencies.length];
    }

    function _distributeLanes(count) {
        const lanes = [];
        for (let i = 0; i < count; i++) {
            lanes.push((i + 1) / (count + 1));
        }
        return lanes;
    }

    /**
     * Generate a flat burst SCRIPT from wave definitions.
     * Each wave's phases are turned into staggered burst entries.
     */
    function _generateScript(cycle, diffMult) {
        if (!_waveDefs) return [];
        const script = [];
        let t = 0;

        const countMult = (_arcade && _arcade.ENEMY_COUNT_MULT) || 1.15;
        const remixChance = (_arcade && _arcade.POST_C3_FORMATION_REMIX) || 0.40;

        for (let w = 0; w < _waveDefs.length; w++) {
            const wave = _waveDefs[w];
            const phases = wave.phases || [];
            const isBossWave = ((w + 1) % 5 === 0);

            for (let p = 0; p < phases.length; p++) {
                const phase = phases[p];
                const baseCount = Math.round(phase.count * countMult * diffMult);
                // Post-C3 formation remix: 40% chance to swap pattern
                let formation = phase.formation;
                if (cycle > 3 && Math.random() < remixChance) {
                    const formations = ['RECT', 'WALL', 'ARROW', 'CHEVRON', 'PINCER', 'FORTRESS', 'VORTEX', 'HURRICANE'];
                    formation = formations[Math.floor(Math.random() * formations.length)];
                }

                const pattern = _formationToPattern(formation);
                const currencies = phase.currencies || ['$'];

                const bursts = Math.ceil(baseCount / MAX_PER_BURST);
                for (let b = 0; b < bursts; b++) {
                    const n = Math.min(MAX_PER_BURST, baseCount - b * MAX_PER_BURST);
                    const burstCurrencies = [];
                    for (let i = 0; i < n; i++) {
                        burstCurrencies.push(_pickCurrency(currencies, b * MAX_PER_BURST + i));
                    }
                    const lanes = _distributeLanes(n);

                    script.push({
                        at_s: t,
                        currencies: burstCurrencies,
                        lanes,
                        pattern,
                        _meta: { wave: w + 1, phase: p + 1, isBossWave }
                    });
                    t += BURST_STAGGER_S;
                }

                t += PHASE_DURATION_S;
            }

            // Wave intermission marker
            if (isBossWave) {
                script.push({ at_s: t, action: 'START_INTERMISSION', _meta: { wave: w + 1, isBossWave: true } });
                t += BOSS_GAP_S;
                script.push({ at_s: t, action: 'SPAWN_BOSS', _meta: { wave: w + 1 } });
                t += 2.0; // breathing room before next wave starts
            } else {
                script.push({ at_s: t, action: 'START_INTERMISSION', _meta: { wave: w + 1, isBossWave: false } });
                t += WAVE_GAP_S;
            }

            // Next wave start marker
            if (w + 1 < _waveDefs.length) {
                script.push({ at_s: t, action: 'START_WAVE', _meta: { wave: w + 2 } });
            }
        }

        return script;
    }

    // --- Public API ---

    G.ArcadeLevelScript = {
        reset() {
            _time = 0;
            _index = 0;
            _cycle = 1;
            _isRunning = false;
            _script = [];
        },

        start() {
            this.reset();
            _isRunning = true;
            _script = _generateScript(_cycle, 1.0);
        },

        /**
         * Main tick — process SCRIPT up to current time.
         * Returns action object for main.js or null.
         */
        tick(dt) {
            if (!_isRunning) return null;
            _time += dt;

            let action = null;
            while (_index < _script.length && _script[_index].at_s <= _time) {
                const entry = _script[_index++];
                if (entry.action) {
                    action = { action: entry.action, wave: entry._meta && entry._meta.wave };
                    continue;
                }

                // Spawn burst
                const ls = G.LevelScript;
                if (ls && typeof ls.spawnEnemy === 'function') {
                    for (let i = 0; i < entry.lanes.length; i++) {
                        ls.spawnEnemy(entry.lanes[i], entry.currencies[i], entry.pattern);
                    }
                }
            }

            // End-of-script → next cycle (defer regeneration if we just emitted an action)
            if (_index >= _script.length && !action) {
                _cycle++;
                const postC3Diff = (_arcade && _arcade.POST_C3_DIFF_PER_CYCLE) || 0.20;
                const diffMult = 1.0 + (_cycle > 3 ? (_cycle - 3) * postC3Diff : 0);
                // C2/C3 base mult
                const cycMult = (B && B.WAVE_DEFINITIONS && B.WAVE_DEFINITIONS.CYCLE_COUNT_MULT) || [1.0, 1.0, 1.0];
                const baseMult = cycMult[Math.min(_cycle - 1, 2)] || 1.0;
                _script = _generateScript(_cycle, baseMult * diffMult);
                _index = 0;
                _time = 0;
                action = { action: 'START_WAVE', wave: 1, cycle: _cycle };
            }

            return action;
        },

        isActive() {
            return _isRunning;
        },

        getWave() {
            // Derive current wave from SCRIPT metadata if possible
            if (_index > 0 && _index <= _script.length) {
                const prev = _script[_index - 1];
                if (prev._meta) return prev._meta.wave;
            }
            return 1;
        },

        getCycle() {
            return _cycle;
        },

        currentLevelNum() {
            return _cycle;
        },

        currentLevelName() {
            return 'Arcade Cycle ' + _cycle;
        },

        hasNextLevel() {
            return true; // infinite
        }
    };
})();
