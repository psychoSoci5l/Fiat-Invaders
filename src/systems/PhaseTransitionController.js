/**
 * PhaseTransitionController.js — v7.15: Phase 1→2→3 background crossfade
 *
 * Manages the 8-12s alpha crossfade between visual phases during gameplay.
 * Exposes per-layer blend factors, midpoint legibility boosts, and pause/resume.
 */
(function() {
    'use strict';
    const G = window.Game = window.Game || {};

    const PHASE = { LEO: 1, UPPER_ATMOSPHERE: 2, DEEP_SPACE: 3 };

    // Default durations (config overrides from BalanceConfig)
    const P1P2_DURATION = 10;
    const P2P3_DURATION = 10;

    // Per-layer fade curves: each entry defines easing over [0,1] progress
    // layerIndex: 0=sky, 1=stars, 2=clouds, 3=hills, 4=streaks, 5=symbols
    const LAYER_CURVES = {
        // Sky: linear blend over full duration
        0: { type: 'linear' },
        // Stars: sigmoid — emerge slowly, accelerate mid, plateau
        1: { type: 'sigmoid', startAt: 0.25, endAt: 0.85 },
        // Clouds: linear body fade, rim lag handled externally
        2: { type: 'linear' },
        // Hills: linear, slightly faster
        3: { type: 'linear' },
        // NEAR streaks: linear
        4: { type: 'linear' },
        // Floating symbols: linear, slowest
        5: { type: 'linear' }
    };

    let _transitioning = false;
    let _fromPhase = 1;
    let _toPhase = 2;
    let _progress = 0;       // 0.0 → 1.0
    let _duration = 10;      // seconds
    let _paused = false;
    let _callbacks = [];
    let _currentPhase = 1;   // stable phase when not transitioning

    function computeDuration(from, to) {
        const cfg = G.Balance?.SKY?.PHASE_TRANSITION;
        if (from === 1 && to === 2) return cfg?.P1P2_DURATION ?? P1P2_DURATION;
        if (from === 2 && to === 3) return cfg?.P2P3_DURATION ?? P2P3_DURATION;
        return P1P2_DURATION;
    }

    /**
     * Sigmoid easing: smooth S-curve over [startAt, endAt] in progress space
     */
    function sigmoid(t, startAt, endAt) {
        if (t <= startAt) return 0;
        if (t >= endAt) return 1;
        const normalized = (t - startAt) / (endAt - startAt);
        return 1 / (1 + Math.exp(-6 * (normalized - 0.5)));
    }

    /**
     * Compute layer alpha at current progress
     * Returns blend factor 0.0 (old phase) to 1.0 (new phase)
     */
    function getLayerAlpha(layerIndex) {
        if (!_transitioning) return _toPhase === _currentPhase ? 1 : 0;
        const curve = LAYER_CURVES[layerIndex] || { type: 'linear' };
        if (curve.type === 'sigmoid') {
            return sigmoid(_progress, curve.startAt || 0.25, curve.endAt || 0.85);
        }
        return _progress; // linear
    }

    const PhaseTransitionController = {
        PHASE: PHASE,

        init() {
            _transitioning = false;
            _fromPhase = 1;
            _toPhase = 2;
            _progress = 0;
            _duration = 10;
            _paused = false;
            _callbacks = [];
            _currentPhase = 1;
        },

        /** Start a phase transition */
        startTransition(fromPhase, toPhase) {
            _fromPhase = fromPhase;
            _toPhase = toPhase;
            _progress = 0;
            _duration = computeDuration(fromPhase, toPhase);
            _transitioning = true;
            _paused = false;
        },

        /** Advance progress by dt seconds */
        update(dt) {
            if (!_transitioning || _paused) return;
            _progress += dt / _duration;
            if (_progress >= 1.0) {
                _progress = 1.0;
                _transitioning = false;
                _currentPhase = _toPhase;
                // Fire completion callbacks
                for (let i = 0; i < _callbacks.length; i++) {
                    _callbacks[i](_fromPhase, _toPhase);
                }
                _callbacks = [];
                // v7.17.0: Emit phase-change event for phase-aware UI theming
                if (G.Events) G.Events.emit('phase-change', { phase: _currentPhase });
            }
        },

        /** Pause transition (boss spawn edge case) */
        pause() {
            _paused = true;
        },

        /** Resume and fast-finish remaining ~2s */
        resume() {
            if (!_paused) return;
            _paused = false;
            // Fast-forward remaining to ~2s
            const remaining = (1.0 - _progress) * _duration;
            if (remaining > 2.0) {
                // Speed up: advance progress so only 2s remain
                const targetProgress = 1.0 - (2.0 / _duration);
                if (targetProgress > _progress) {
                    _progress = targetProgress;
                }
            }
        },

        isTransitioning() { return _transitioning && !_paused; },
        getProgress() { return _progress; },
        getFromPhase() { return _fromPhase; },
        getToPhase() { return _toPhase; },

        /** Current stable phase (updated when transition completes) */
        getCurrentPhase() { return _currentPhase; },

        /** Set current phase directly (no transition — for init/reset) */
        setCurrentPhase(phase) {
            _currentPhase = phase;
            _transitioning = false;
            _progress = 0;
        },

        /** Overall sky blend: 0 = old phase, 1 = new phase */
        getSkyBlendAlpha() {
            return getLayerAlpha(0);
        },

        /** Per-layer blend factor */
        getLayerAlpha: getLayerAlpha,

        /** Midpoint boost: peaks at 0.5 progress, 0 at edges. For ship highlight + enemy outline compensation */
        getMidpointBoost() {
            if (!_transitioning) return 0;
            // Triangle wave: 0→1→0 over progress 0→0.5→1
            if (_progress < 0.5) return _progress * 2;
            return (1.0 - _progress) * 2;
        },

        onTransitionComplete(callback) {
            if (typeof callback === 'function') {
                _callbacks.push(callback);
            }
        }
    };

    G.PhaseTransitionController = PhaseTransitionController;
})();
