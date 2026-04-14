// GameStateMachine.js — Centralized game state transitions
// v7.0: Rewrite — invalid transitions are BLOCKED (not warn-only)

window.Game = window.Game || {};

(function () {
    const G = window.Game;

    const GameStateMachine = {
        _current: 'VIDEO',
        _listeners: [],

        // Valid transition map — only listed transitions are allowed
        VALID_TRANSITIONS: {
            'VIDEO':            ['INTRO'],
            'INTRO':            ['HANGAR', 'SETTINGS', 'WARMUP', 'STORY_SCREEN'],
            'HANGAR':           ['PLAY', 'WARMUP', 'INTRO', 'STORY_SCREEN'],
            'STORY_SCREEN':     ['PLAY', 'WARMUP', 'INTERMISSION', 'INTRO', 'CAMPAIGN_VICTORY'],
            'WARMUP':           ['PLAY', 'PAUSE', 'INTRO'],
            'PLAY':             ['PAUSE', 'INTERMISSION', 'GAMEOVER', 'STORY_SCREEN', 'CAMPAIGN_VICTORY'],
            'PAUSE':            ['PLAY', 'WARMUP', 'INTERMISSION', 'INTRO'],
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
         * BLOCKS invalid transitions and returns false.
         * @param {string} newState
         * @returns {boolean} true if transition succeeded
         */
        transition(newState) {
            // Self-transition: no-op
            if (newState === this._current) return true;

            const valid = this.VALID_TRANSITIONS[this._current];
            if (!valid || !valid.includes(newState)) {
                console.error(`[GameState] BLOCKED invalid transition: ${this._current} → ${newState}`);
                return false;
            }

            const prev = this._current;
            this._current = newState;
            if (G.Debug) G.Debug.log('STATE', `${prev} → ${newState}`);

            // Notify listeners
            for (let i = 0; i < this._listeners.length; i++) {
                try { this._listeners[i](newState, prev); }
                catch (e) { console.error('[GameState] Listener error:', e); }
            }

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
         * Force set state without validation (for init/reset ONLY).
         * @param {string} state
         */
        forceSet(state) {
            const prev = this._current;
            this._current = state;
            if (G.Debug) G.Debug.log('STATE', `FORCE ${prev} → ${state}`);
        },

        /**
         * Register a listener for state changes.
         * @param {function(newState, prevState)} fn
         * @returns {function} unsubscribe function
         */
        onChange(fn) {
            this._listeners.push(fn);
            return () => {
                const idx = this._listeners.indexOf(fn);
                if (idx >= 0) this._listeners.splice(idx, 1);
            };
        }
    };

    G.GameState = GameStateMachine;
})();
