/**
 * RankSystem.js - Dynamic Difficulty Adjustment (v4.1.0)
 *
 * Adapts game difficulty to player skill in real-time.
 * Rank ranges from -1.0 (struggling) to +1.0 (dominating).
 * Neutral (0.0) = baseline difficulty.
 *
 * Signals:
 *   - Positive: kills/sec, grazes/sec push rank up
 *   - Negative: deaths push rank down
 *   - Convergence: rank slowly drifts toward 0 over time
 *
 * Effects:
 *   - Fire rate: 0.8x (rank -1) to 1.2x (rank +1)
 *   - Enemy count: 0.85x (rank -1) to 1.15x (rank +1)
 */

(function() {
    'use strict';

    const G = window.Game = window.Game || {};

    const RankSystem = {
        // Current rank value (-1.0 to +1.0)
        rank: 0.0,

        // Rolling window tracking
        _killTimes: [],      // Timestamps of recent kills
        _grazeTimes: [],     // Timestamps of recent grazes
        _windowSize: 30,     // Seconds of data to track
        _lastUpdate: 0,      // Last update timestamp

        // Config (read from Balance at runtime)
        _enabled: true,

        /**
         * Initialize or reset the rank system
         */
        init() {
            const cfg = G.Balance?.RANK;
            this._enabled = cfg ? cfg.ENABLED : true;
            this._windowSize = cfg?.WINDOW_SIZE || 30;
            this.rank = 0.0;
            this._killTimes = [];
            this._grazeTimes = [];
            this._lastUpdate = performance.now() / 1000;
        },

        /**
         * Update rank based on rolling window performance
         * Called every frame from main game loop
         * @param {number} dt - Delta time in seconds
         */
        update(dt) {
            if (!this._enabled) return;

            const now = performance.now() / 1000;
            const cfg = G.Balance?.RANK || {};
            const windowSize = cfg.WINDOW_SIZE || 30;
            const convergenceSpeed = cfg.CONVERGENCE_SPEED || 0.5;

            // Prune old data outside window (in-place compaction, no allocation)
            const cutoff = now - windowSize;
            this._killTimes = this._pruneOld(this._killTimes, cutoff);
            this._grazeTimes = this._pruneOld(this._grazeTimes, cutoff);

            // Calculate performance metrics
            const killsPerSec = this._killTimes.length / windowSize;
            const grazesPerSec = this._grazeTimes.length / windowSize;

            // Target rank based on performance
            // Baseline: ~1 kill/sec and ~0.5 grazes/sec = neutral
            const killSignal = (killsPerSec - 1.0) * 0.5;    // +0.5 per extra kill/sec
            const grazeSignal = (grazesPerSec - 0.5) * 0.3;   // +0.3 per extra graze/sec
            const targetRank = Math.max(-1, Math.min(1, killSignal + grazeSignal));

            // Converge toward target (not instant)
            const convergeDt = dt * convergenceSpeed;
            this.rank += (targetRank - this.rank) * Math.min(1, convergeDt);

            // Also converge toward 0 (regression to mean)
            this.rank *= (1 - dt * 0.05); // Very slow drift to neutral

            // Clamp
            this.rank = Math.max(-1, Math.min(1, this.rank));

            this._lastUpdate = now;
        },

        /**
         * Signal: player killed an enemy
         */
        onKill() {
            if (!this._enabled) return;
            this._killTimes.push(performance.now() / 1000);
        },

        /**
         * Signal: player grazed a bullet
         */
        onGraze() {
            if (!this._enabled) return;
            this._grazeTimes.push(performance.now() / 1000);
        },

        /**
         * Signal: player died - significant rank decrease
         */
        onDeath() {
            if (!this._enabled) return;
            const penalty = G.Balance?.RANK?.DEATH_PENALTY || 0.15;
            this.rank = Math.max(-1, this.rank - penalty);
            // Clear recent positive signals (death resets momentum)
            this._killTimes.length = 0;
            this._grazeTimes.length = 0;
        },

        /**
         * In-place prune: remove entries older than cutoff.
         * Returns same array (no allocation) when possible.
         */
        _pruneOld(arr, cutoff) {
            // Find first element that passes cutoff
            let start = 0;
            while (start < arr.length && arr[start] <= cutoff) start++;
            if (start === 0) return arr; // Nothing to prune
            if (start === arr.length) { arr.length = 0; return arr; }
            // Shift remaining entries to front (in-place)
            const remaining = arr.length - start;
            for (let i = 0; i < remaining; i++) arr[i] = arr[start + i];
            arr.length = remaining;
            return arr;
        },

        /**
         * Get fire rate multiplier based on current rank
         * Low rank = slower enemy fire, high rank = faster
         * @returns {number} Multiplier (0.8 to 1.2)
         */
        getFireRateMultiplier() {
            if (!this._enabled) return 1.0;
            const range = G.Balance?.RANK?.FIRE_RATE_RANGE || 0.20;
            return 1.0 + this.rank * range;
        },

        /**
         * Get enemy count multiplier based on current rank
         * Low rank = fewer enemies, high rank = more
         * @returns {number} Multiplier (0.85 to 1.15)
         */
        getEnemyCountMultiplier() {
            if (!this._enabled) return 1.0;
            const range = G.Balance?.RANK?.ENEMY_COUNT_RANGE || 0.15;
            return 1.0 + this.rank * range;
        },

        /**
         * Get rank label for debug display
         * @returns {string} Human-readable rank label
         */
        getRankLabel() {
            if (this.rank < -0.5) return 'EASY';
            if (this.rank < -0.15) return 'GENTLE';
            if (this.rank < 0.15) return 'NORMAL';
            if (this.rank < 0.5) return 'HARD';
            return 'BRUTAL';
        }
    };

    G.RankSystem = RankSystem;
})();
