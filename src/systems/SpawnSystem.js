window.Game = window.Game || {};

/**
 * SpawnSystem — Unified spawn interface (Adapter/Facade pattern)
 *
 * Wraps WaveManager (Arcade) and LevelScript (V8 Campaign) behind a common API.
 * Does NOT replace direct access to WaveManager/LevelScript — it's an additional
 * abstraction layer for the game loop wiring in main.js.
 *
 * Usage:
 *   G.SpawnSystem.useWaveSpawnSystem()     // Arcade mode
 *   G.SpawnSystem.useScriptedSpawnSystem() // V8 Campaign mode
 *   const action = G.SpawnSystem.update(dt) // in game loop
 */
window.Game.SpawnSystem = {
    _active: null,

    // ── Internal wrappers ────────────────────────────────────────────

    /** Wraps WaveManager (Arcade streaming waves) */
    _waveSpawn: {
        _deps: null, // { gameState, enemies, bossActive } — set per frame

        update(dt) {
            const wm = window.Game.WaveManager;
            const d = this._deps;
            if (!wm || !d) return null;
            return wm.update(dt, d.gameState, d.enemies.length, d.bossActive);
        },
        isActive() {
            return window.Game.WaveManager && window.Game.WaveManager.waveInProgress;
        },
        getEnemyCount() {
            const wm = window.Game.WaveManager;
            return wm ? wm.streamingSpawnedCount : 0;
        },
        getWave() {
            const wm = window.Game.WaveManager;
            return wm ? wm.wave : 0;
        },
        reset() {
            const wm = window.Game.WaveManager;
            if (wm) wm.reset();
        }
    },

    /** Wraps LevelScript (V8 Campaign Gradius-style burst tables) */
    _scriptedSpawn: {
        update(dt) {
            const ls = window.Game.LevelScript;
            return ls ? ls.tick(dt) : null;
        },
        isActive() {
            const ls = window.Game.LevelScript;
            return ls && ls.currentLevelNum() > 0;
        },
        getEnemyCount() {
            return 0; // LevelScript doesn't track this directly — consumer uses enemies.length
        },
        getWave() {
            const ls = window.Game.LevelScript;
            return ls ? ls.currentLevelNum() : 0;
        },
        reset() {
            const ls = window.Game.LevelScript;
            if (ls) ls.loadLevel(0);
        }
    },

    // ── Public API ────────────────────────────────────────────────────

    /**
     * Main update — delegates to active spawn system.
     * Returns action object ({ action: 'SPAWN_PHASE' | 'SPAWN_BOSS' | ... }) or null.
     */
    update(dt) {
        return this._active ? this._active.update(dt) : null;
    },

    /** Whether the active spawn system is currently spawning */
    isActive() {
        return this._active ? this._active.isActive() : false;
    },

    /** Number of enemies spawned by the active system (approximate) */
    getEnemyCount() {
        return this._active ? this._active.getEnemyCount() : 0;
    },

    /** Current wave/level number */
    getWave() {
        return this._active ? this._active.getWave() : 0;
    },

    /** Reset the active spawn system */
    reset() {
        if (this._active) this._active.reset();
    },

    // ── Wiring ────────────────────────────────────────────────────────

    /**
     * Switch to Arcade mode (WaveManager-based streaming waves).
     * @param {string} gameState  - current GameStateMachine state
     * @param {Array}  enemies    - enemies array reference (for length check)
     * @param {boolean} bossActive - whether a boss is active or warning is pending
     */
    useWaveSpawnSystem(gameState, enemies, bossActive) {
        this._active = this._waveSpawn;
        this._waveSpawn._deps = { gameState, enemies, bossActive };
    },

    /** Switch to V8 Campaign mode (LevelScript-based burst tables) */
    useScriptedSpawnSystem() {
        this._active = this._scriptedSpawn;
    },

    /**
     * Update per-frame dependencies for the WaveSpawn wrapper.
     * Must be called before update() in Arcade mode (no-op in V8 mode).
     */
    setWaveDeps(gameState, enemies, bossActive) {
        this._waveSpawn._deps = { gameState, enemies, bossActive };
    }
};
