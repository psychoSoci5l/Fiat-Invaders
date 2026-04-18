// StatsTracker — cumulative player stats across runs (Phase 5.1 meta-progression)
// Persists to localStorage as a single JSON blob. Updated at key events:
//   - recordBossDefeat(bossType) on boss kill
//   - recordMiniBossDefeat() on mini-boss kill
//   - recordHyper() on HYPER activation
//   - recordGodchain() on GODCHAIN activation
//   - recordRunEnd({ mode, score, kills, playTimeSec, bestStreak, bestCombo, cycle, level })
//     on game over
(function () {
    window.Game = window.Game || {};
    const G = window.Game;

    const STORAGE_KEY = 'fiat_player_stats';
    const SCHEMA_VERSION = 1;

    function defaults() {
        return {
            schema: SCHEMA_VERSION,
            totalRuns: 0,
            totalKills: 0,
            totalDeaths: 0,
            totalPlayTime: 0, // seconds
            totalScore: 0,
            bossesDefeated: 0,
            miniBossesDefeated: 0,
            hyperActivations: 0,
            godchainActivations: 0,
            longestRunSec: 0,
            highestCombo: 0,
            bestStreakEver: 0,
            highestScoreRun: 0,
            byMode: {
                story: { runs: 0, kills: 0, score: 0, bossesDefeated: 0 },
                arcade: { runs: 0, kills: 0, score: 0, bossesDefeated: 0 }
            },
            firstPlayed: 0,
            lastPlayed: 0
        };
    }

    let _cache = null;

    function _load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return defaults();
            const parsed = JSON.parse(raw);
            if (!parsed || parsed.schema !== SCHEMA_VERSION) return defaults();
            // Merge with defaults to tolerate partial blobs
            const d = defaults();
            return Object.assign(d, parsed, {
                byMode: Object.assign(d.byMode, parsed.byMode || {})
            });
        } catch { return defaults(); }
    }

    function _save() {
        if (!_cache) return;
        _cache.lastPlayed = Date.now();
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(_cache)); }
        catch (e) { console.warn('[StatsTracker] save failed:', e); }
    }

    function init() {
        _cache = _load();
        if (!_cache.firstPlayed) _cache.firstPlayed = Date.now();
    }

    function get() {
        if (!_cache) init();
        return _cache;
    }

    function recordBossDefeat(bossType) {
        if (!_cache) init();
        _cache.bossesDefeated++;
        const mode = _currentModeKey();
        _cache.byMode[mode].bossesDefeated++;
        _save();
    }

    function recordMiniBossDefeat() {
        if (!_cache) init();
        _cache.miniBossesDefeated++;
        _save();
    }

    function recordHyper() {
        if (!_cache) init();
        _cache.hyperActivations++;
        // Don't save on hot events — batched into run end
    }

    function recordGodchain() {
        if (!_cache) init();
        _cache.godchainActivations++;
    }

    function _currentModeKey() {
        return (G.CampaignState && G.CampaignState.isEnabled()) ? 'story' : 'arcade';
    }

    function recordRunEnd(run) {
        if (!_cache) init();
        const r = run || {};
        _cache.totalRuns++;
        _cache.totalDeaths++;
        _cache.totalKills += (r.kills | 0);
        _cache.totalScore += (r.score | 0);
        _cache.totalPlayTime += Math.max(0, r.playTimeSec | 0);
        if ((r.playTimeSec | 0) > _cache.longestRunSec) _cache.longestRunSec = r.playTimeSec | 0;
        if ((r.bestCombo | 0) > _cache.highestCombo) _cache.highestCombo = r.bestCombo | 0;
        if ((r.bestStreak | 0) > _cache.bestStreakEver) _cache.bestStreakEver = r.bestStreak | 0;
        if ((r.score | 0) > _cache.highestScoreRun) _cache.highestScoreRun = r.score | 0;
        const mode = r.mode === 'story' ? 'story' : 'arcade';
        const m = _cache.byMode[mode];
        m.runs++;
        m.kills += (r.kills | 0);
        m.score += (r.score | 0);
        _save();
    }

    function reset() {
        _cache = defaults();
        _cache.firstPlayed = Date.now();
        _save();
    }

    function formatTime(sec) {
        sec = Math.max(0, sec | 0);
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = sec % 60;
        if (h > 0) return `${h}h ${m}m`;
        if (m > 0) return `${m}m ${s}s`;
        return `${s}s`;
    }

    G.StatsTracker = {
        init,
        get,
        recordBossDefeat,
        recordMiniBossDefeat,
        recordHyper,
        recordGodchain,
        recordRunEnd,
        reset,
        formatTime
    };
})();
