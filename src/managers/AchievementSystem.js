// AchievementSystem — milestone unlocks driven by StatsTracker (Phase 5.1)
// Definitions live here. Unlock checks run at run-end (after StatsTracker.recordRunEnd).
// Unlocked IDs persist in localStorage `fiat_achievements`.
(function () {
    window.Game = window.Game || {};
    const G = window.Game;

    const STORAGE_KEY = 'fiat_achievements';

    // Achievement definitions. `check(stats)` returns true when unlocked.
    // Names/descs use i18n keys; localized lookup at render time.
    const DEFINITIONS = [
        { id: 'FIRST_KILL',        icon: '⚔',  check: s => s.totalKills >= 1 },
        { id: 'CENTURION',         icon: '💯', check: s => s.totalKills >= 100 },
        { id: 'ANNIHILATOR',       icon: '💀', check: s => s.totalKills >= 1000 },
        { id: 'FIRST_BOSS',        icon: '🏆', check: s => s.bossesDefeated >= 1 },
        { id: 'BOSS_HUNTER',       icon: '👑', check: s => s.bossesDefeated >= 5 },
        { id: 'BOSS_LEGEND',       icon: '🌟', check: s => s.bossesDefeated >= 15 },
        { id: 'MINIBOSS_PURGE',    icon: '⚡', check: s => s.miniBossesDefeated >= 10 },
        { id: 'HYPER_RIDER',       icon: '🚀', check: s => s.hyperActivations >= 1 },
        { id: 'GODCHAIN_AWAKEN',   icon: '✨', check: s => s.godchainActivations >= 1 },
        { id: 'MARATHON',          icon: '⏱',  check: s => s.totalPlayTime >= 3600 },
        { id: 'CENTURY_RUNNER',    icon: '🎯', check: s => s.totalRuns >= 100 },
        { id: 'SCORE_100K',        icon: '🏅', check: s => s.highestScoreRun >= 100000 }
    ];

    let _unlocked = null; // Set<string>

    function _load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return new Set();
            const arr = JSON.parse(raw);
            return new Set(Array.isArray(arr) ? arr : []);
        } catch { return new Set(); }
    }

    function _save() {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...(_unlocked || [])])); }
        catch (e) { console.warn('[AchievementSystem] save failed:', e); }
    }

    function init() {
        _unlocked = _load();
    }

    function isUnlocked(id) {
        if (!_unlocked) init();
        return _unlocked.has(id);
    }

    function getDefinitions() {
        return DEFINITIONS;
    }

    // Returns array of newly-unlocked definition objects (so caller can notify)
    function checkAll() {
        if (!_unlocked) init();
        if (!G.StatsTracker) return [];
        const stats = G.StatsTracker.get();
        const newly = [];
        for (const def of DEFINITIONS) {
            if (_unlocked.has(def.id)) continue;
            try {
                if (def.check(stats)) {
                    _unlocked.add(def.id);
                    newly.push(def);
                }
            } catch (e) { /* defensive */ }
        }
        if (newly.length) {
            _save();
            // Notify listeners (UI can show toasts)
            if (G.Events) G.Events.emit('achievements:unlocked', newly);
        }
        return newly;
    }

    function reset() {
        _unlocked = new Set();
        _save();
    }

    function getUnlockedCount() {
        if (!_unlocked) init();
        return _unlocked.size;
    }

    function getTotalCount() {
        return DEFINITIONS.length;
    }

    G.AchievementSystem = {
        init,
        isUnlocked,
        getDefinitions,
        checkAll,
        reset,
        getUnlockedCount,
        getTotalCount
    };
})();
