// GameStateMachine.js — Centralized game state transitions
// v4.28.0: Decomposition Step 3

window.Game = window.Game || {};

(function() {
    const G = window.Game;

    const GameStateMachine = {
        _current: 'VIDEO',

        // Valid transition map — only listed transitions are allowed
        VALID_TRANSITIONS: {
            'VIDEO':            ['INTRO'],
            'INTRO':            ['HANGAR', 'SETTINGS', 'WARMUP'],
            'HANGAR':           ['PLAY', 'WARMUP', 'INTRO', 'STORY_SCREEN'],
            'STORY_SCREEN':     ['PLAY', 'WARMUP', 'INTERMISSION', 'INTRO'],
            'WARMUP':           ['PLAY', 'PAUSE', 'INTRO'],
            'PLAY':             ['PAUSE', 'INTERMISSION', 'GAMEOVER', 'STORY_SCREEN', 'CAMPAIGN_VICTORY'],
            'PAUSE':            ['PLAY', 'WARMUP', 'INTRO'],
            'INTERMISSION':     ['PLAY', 'STORY_SCREEN', 'PAUSE'],
            'GAMEOVER':         ['INTRO'],
            'CAMPAIGN_VICTORY': ['INTRO'],
            'SETTINGS':         ['INTRO']
        },

        get current() {
            return this._current;
        },

        /**
         * Transition to a new state.
         * Validates the transition and logs warnings for invalid ones.
         * @param {string} newState
         * @returns {boolean} true if transition succeeded
         */
        transition(newState) {
            // Self-transition: no-op (e.g. PLAY→PLAY during seamless wave transitions)
            if (newState === this._current) return true;
            const valid = this.VALID_TRANSITIONS[this._current];
            if (!valid || !valid.includes(newState)) {
                console.warn(`[GameState] Invalid transition: ${this._current} → ${newState}`);
                // Allow it anyway for backward compat (warn-only)
            }
            const prev = this._current;
            this._current = newState;
            if (G.Debug) G.Debug.log('STATE', `${prev} → ${newState}`);
            return true;
        },

        /**
         * Check if current state matches any of the given states.
         * @param {...string} states
         * @returns {boolean}
         */
        is(...states) {
            return states.includes(this._current);
        },

        /**
         * Force set state without validation (for init/reset).
         * @param {string} state
         */
        forceSet(state) {
            this._current = state;
        }
    };

    G.GameState = GameStateMachine;
})();
