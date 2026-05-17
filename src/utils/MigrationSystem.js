// MigrationSystem v1.0 — Centralized localStorage access with schema versioning
// Every localStorage key used by the game MUST be accessed through this system.
// Old (unwrapped) data is auto-detected, treated as v0, and migrated on read.
//
// Storage format: { v: <schemaVersion>, d: <actual data> }
// Keys with dynamic suffixes (daily, hints) use raw passthrough.

window.Game = window.Game || {};

(function () {
    'use strict';
    const G = window.Game;

    // ── Key Registry ───────────────────────────────────────────────
    // Every static localStorage key must be registered here.
    // `v` = current schema version. `d` = default value when key is missing.
    // `migrations` = optional array of migration functions [v0→v1, v1→v2, ...]

    const REGISTRY = {
        // -- Campaign & Progression --
        fiat_campaign:          { v: 2, d: null,
            migrations: [
                /* 0→1 */ (d) => d,  // v0 data is identical to v1 shape
                /* 1→2 */ (d) => { if (d && !d.storyProgress) d.storyProgress = { PROLOGUE: false, CHAPTER_1: false, CHAPTER_2: false, CHAPTER_3: false }; return d; }
            ]
        },
        fiat_achievements:      { v: 1, d: [] },
        fiat_stats:             { v: 1, d: null },  // StatsTracker manages its own schema internally
        fiat_player_stats:      { v: 1, d: null },
        fiat_maxcycle:          { v: 1, d: 1 },

        // -- Scores --
        fiat_highscore_story:   { v: 1, d: 0 },
        fiat_highscore_arcade:  { v: 1, d: 0 },
        fiat_arcade_records:    { v: 1, d: { bestCycle: 0, bestLevel: 0, bestKills: 0 } },

        // -- Settings --
        fiat_control_mode:      { v: 1, d: 'SWIPE' },
        fiat_joy_deadzone:      { v: 1, d: 0.3 },
        fiat_joy_sensitivity:   { v: 1, d: 1.0 },
        fiat_tilt_on:           { v: 1, d: '0' },
        fiat_music_muted:       { v: 1, d: '0' },
        fiat_sfx_muted:         { v: 1, d: '0' },
        fiat_lang:              { v: 1, d: 'EN' },
        fiat_nickname:          { v: 1, d: 'Anonymous' },
        fiat_selected_ship:     { v: 1, d: '0' },
        fiat_quality_tier:      { v: 1, d: 'AUTO' },

        // -- UI State --
        fiat_whatsnew_seen:     { v: 1, d: '' },
        fiat_completion_seen:   { v: 1, d: '0' },
        fiat_pwa_dismissed:     { v: 1, d: '0' },
        fiat_scores_reset_v2:   { v: 1, d: '0' },
        fiat_app_version:       { v: 1, d: '' },

        // -- Tutorial --
        fiat_tutorial_story_seen:  { v: 1, d: '0' },
        fiat_tutorial_arcade_seen: { v: 1, d: '0' },
        fiat_warmup_shown:      { v: 1, d: '0' },

        // -- Leaderboard --
        fiat_pending_score:     { v: 1, d: null },

        // -- Debug --
        fiat_session_log:       { v: 1, d: null },
        fiat_debug_session_log: { v: 1, d: null }
    };

    // Prefix-based dynamic keys (not individually registered)
    const DYNAMIC_PREFIXES = ['fiat_daily_attempt_', 'fiat_hint_', 'fiat_highscore_daily:'];

    function _isDynamic(key) {
        for (let i = 0; i < DYNAMIC_PREFIXES.length; i++) {
            if (key.indexOf(DYNAMIC_PREFIXES[i]) === 0) return true;
        }
        return false;
    }

    // ── Safe Wrappers ──────────────────────────────────────────────

    function _rawGet(key) {
        try { return localStorage.getItem(key); }
        catch { return null; }
    }

    function _rawSet(key, value) {
        try { localStorage.setItem(key, value); return true; }
        catch { return false; }
    }

    function _rawRemove(key) {
        try { localStorage.removeItem(key); return true; }
        catch { return false; }
    }

    // ── Logging ────────────────────────────────────────────────────

    function _log(msg) {
        if (G.DebugSystem && G.DebugSystem.log) {
            G.DebugSystem.log('[MigrationSystem] ' + msg);
        }
    }

    // ── Core API ───────────────────────────────────────────────────

    /**
     * Read a value from localStorage, migrating if necessary.
     * @param {string} key
     * @returns {*} The data portion (unwrapped), or the registered default if missing/corrupt.
     */
    function get(key) {
        // Dynamic keys: raw passthrough
        if (_isDynamic(key)) {
            return _rawGet(key);
        }

        const entry = REGISTRY[key];
        const raw = _rawGet(key);

        // Missing key → return default
        if (raw === null || raw === undefined) {
            return entry ? entry.d : null;
        }

        // Try to parse as wrapped format { v, d }
        let parsed;
        try { parsed = JSON.parse(raw); } catch (e) { parsed = null; }

        // Detect wrapped format: must be a plain object with numeric `v` and `d` present
        const isWrapped = parsed && typeof parsed === 'object' && !Array.isArray(parsed) &&
                          typeof parsed.v === 'number' && 'd' in parsed;

        let version, data;

        if (isWrapped) {
            version = parsed.v;
            data = parsed.d;
        } else {
            // Unwrapped (legacy) data → treat as v0
            version = 0;
            // Preserve raw string for primitives (e.g. "1" → JSON.parse → 1, but we want "1")
            if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
                data = parsed;  // Legacy JSON object
            } else {
                data = raw;  // Primitive or non-JSON → keep as string
            }
        }

        // Unknown key (not in registry) → return data as-is
        if (!entry) {
            return data;
        }

        // Apply migration chain + wrap if behind
        const targetV = entry.v;
        if (version < targetV) {
            if (entry.migrations) {
                for (let v = version; v < targetV; v++) {
                    const migrateFn = entry.migrations[v];
                    if (migrateFn) {
                        try {
                            data = migrateFn(data);
                            _log(`Migrated '${key}' v${v} → v${v + 1}`);
                        } catch (e) {
                            _log(`Migration FAILED for '${key}' v${v} → v${v + 1}: ${e.message}. Using default.`);
                            return entry.d;
                        }
                    }
                }
            }
            // Write wrapped data back (even if no migrations run)
            _writeWrapped(key, targetV, data);
        }

        return data;
    }

    /**
     * Write a value to localStorage with the current schema version stamp.
     * @param {string} key
     * @param {*} value — the unwrapped data
     */
    function set(key, value) {
        if (_isDynamic(key)) {
            return _rawSet(key, value);
        }

        const entry = REGISTRY[key];
        if (!entry) {
            // Unknown key — store raw (but warn)
            _log('WARNING: unregistered key "' + key + '" stored without versioning');
            return _rawSet(key, typeof value === 'string' ? value : JSON.stringify(value));
        }

        return _writeWrapped(key, entry.v, value);
    }

    /**
     * Remove a key from localStorage.
     */
    function remove(key) {
        return _rawRemove(key);
    }

    /**
     * Get raw string value (bypasses all wrapping/migration).
     * For consumers that need direct localStorage access (e.g., reading "1" / "0" flags).
     */
    function getRaw(key) {
        return _rawGet(key);
    }

    /**
     * Check if a key exists in localStorage.
     */
    function has(key) {
        return _rawGet(key) !== null;
    }

    // ── Internals ──────────────────────────────────────────────────

    function _writeWrapped(key, version, data) {
        const payload = JSON.stringify({ v: version, d: data });
        return _rawSet(key, payload);
    }

    // ── Maintenance ────────────────────────────────────────────────

    /**
     * Migrate all existing keys to the wrapped format eagerly.
     * Call once at startup (after DebugSystem is ready).
     * Safe to call multiple times — already-wrapped keys are skipped.
     */
    function migrateAll() {
        const keys = Object.keys(REGISTRY);
        let migrated = 0;
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            const raw = _rawGet(key);
            if (raw === null) continue;

            // Check if already wrapped
            try {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) &&
                    typeof parsed.v === 'number' && 'd' in parsed) {
                    continue; // Already wrapped
                }
            } catch (e) { /* not JSON, needs migration */ }

            // Trigger migration by reading
            get(key);
            migrated++;
        }
        if (migrated > 0) {
            _log('Eager migration complete: ' + migrated + ' key(s) upgraded to wrapped format');
        }
    }

    /**
     * Reset all registered keys to their defaults.
     * Destructive — confirm with user first.
     */
    function resetAll() {
        const keys = Object.keys(REGISTRY);
        for (let i = 0; i < keys.length; i++) {
            const entry = REGISTRY[keys[i]];
            if (entry.d !== null) {
                _writeWrapped(keys[i], entry.v, entry.d);
            } else {
                _rawRemove(keys[i]);
            }
        }
        // Also clear dynamic keys
        _clearDynamic();
        _log('All registered keys reset to defaults');
    }

    function _clearDynamic() {
        const prefixes = ['fiat_daily_attempt_', 'fiat_hint_'];
        try {
            const toRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (!k) continue;
                for (let j = 0; j < prefixes.length; j++) {
                    if (k.indexOf(prefixes[j]) === 0) { toRemove.push(k); break; }
                }
            }
            for (const k of toRemove) _rawRemove(k);
        } catch (e) { /* ignore */ }
    }

    // ── Export ─────────────────────────────────────────────────────
    G.MigrationSystem = {
        get,
        set,
        remove,
        getRaw,
        has,
        migrateAll,
        resetAll,
        REGISTRY,
        DYNAMIC_PREFIXES
    };

})();
