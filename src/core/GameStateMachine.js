// GameStateMachine.js — Centralized game state transitions
// v7.0: Rewrite — invalid transitions are BLOCKED (not warn-only)

window.Game = window.Game || {};

(function () {
    const G = window.Game;

    const GameStateMachine = {
        _current: 'VIDEO',
        _listeners: [],
        _enterCallbacks: {},
        _exitCallbacks: {},

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

            // Fire exit callbacks for previous state
            this._fireCallbacks(this._exitCallbacks[prev], newState, prev);
            // Fire enter callbacks for new state
            this._fireCallbacks(this._enterCallbacks[newState], newState, prev);
            // Notify generic listeners
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
         * Internal: fire a list of callbacks safely.
         */
        _fireCallbacks(list, newState, prevState) {
            if (!list) return;
            for (let i = 0; i < list.length; i++) {
                try { list[i](newState, prevState); }
                catch (e) { console.error('[GameState] Callback error:', e); }
            }
        },

        /**
         * Register a callback fired when transitioning TO a specific state.
         * @param {string} state
         * @param {function(newState, prevState)} fn
         * @returns {function} unsubscribe function
         */
        onEnter(state, fn) {
            if (!this._enterCallbacks[state]) this._enterCallbacks[state] = [];
            this._enterCallbacks[state].push(fn);
            return () => this.offEnter(state, fn);
        },

        /**
         * Register a callback fired when transitioning FROM a specific state.
         * @param {string} state
         * @param {function(newState, prevState)} fn
         * @returns {function} unsubscribe function
         */
        onExit(state, fn) {
            if (!this._exitCallbacks[state]) this._exitCallbacks[state] = [];
            this._exitCallbacks[state].push(fn);
            return () => this.offExit(state, fn);
        },

        /**
         * Unregister an enter callback.
         */
        offEnter(state, fn) {
            const list = this._enterCallbacks[state];
            if (!list) return;
            const idx = list.indexOf(fn);
            if (idx >= 0) list.splice(idx, 1);
        },

        /**
         * Unregister an exit callback.
         */
        offExit(state, fn) {
            const list = this._exitCallbacks[state];
            if (!list) return;
            const idx = list.indexOf(fn);
            if (idx >= 0) list.splice(idx, 1);
        },

        /**
         * Register a listener for all state changes.
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
