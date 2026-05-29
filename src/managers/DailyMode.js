// G.DailyMode — Daily Seed Run state (v6.10.0)
// Runs on arcade rules but with a deterministic seed derived from the UTC date.
// One attempt per device per day, tracked in localStorage `fiat_daily_attempt_YYYY-MM-DD`.
(function (G) {
    'use strict';

    let _active = false;

    function today() {
        return G.RNG ? G.RNG.utcDateString() : new Date().toISOString().slice(0, 10);
    }

    function attemptKey(dateStr) {
        return `fiat_daily_attempt_${dateStr || today()}`;
    }

    function isActive() { return _active; }

    function setActive(v) { _active = !!v; }

    function isLockedToday() {
        try {
            return !!G.MigrationSystem.get(attemptKey());
        } catch (e) {
            return false;
        }
    }

    function markAttempt() {
        try {
            G.MigrationSystem.set(attemptKey(), String(Date.now()));
        } catch (e) {}
    }

    function clearAttempt(dateStr) {
        try {
            G.MigrationSystem.remove(attemptKey(dateStr));
        } catch (e) {}
    }

    // Milliseconds until next UTC midnight
    function msUntilReset() {
        const now = new Date();
        const next = new Date(Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate() + 1,
            0, 0, 0, 0
        ));
        return next.getTime() - now.getTime();
    }

    // "HH:MM:SS" formatted countdown until UTC reset
    function formatCountdown() {
        const ms = Math.max(0, msUntilReset());
        const s = Math.floor(ms / 1000);
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = s % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    }

    // leaderboard mode token, e.g. "daily:2026-04-17"
    function modeToken() {
        return `daily:${today()}`;
    }

    // ── Streak Tracking (Sprint 6 S1) ──────────────────────────────

    const STREAK_KEY = 'fiat_daily_streak';
    const LAST_KEY   = 'fiat_daily_last_played';

    /** Read current streak count from localStorage. */
    function getStreak() {
        try {
            const v = G.MigrationSystem.get(STREAK_KEY);
            return (v === null || v === undefined) ? 0 : parseInt(v, 10) || 0;
        } catch (e) {
            return 0;
        }
    }

    /** Return the last played date string (YYYY-MM-DD) or empty string. */
    function getLastPlayed() {
        try {
            return G.MigrationSystem.get(LAST_KEY) || '';
        } catch (e) {
            return '';
        }
    }

    /** Return true if lastPlayed is the calendar day before today. */
    function _isConsecutive(lastPlayed, todayStr) {
        if (!lastPlayed || !todayStr || lastPlayed === todayStr) return false;
        const last = new Date(lastPlayed + 'T00:00:00Z');
        const now  = new Date(todayStr + 'T00:00:00Z');
        const diffMs = now.getTime() - last.getTime();
        const diffDays = Math.round(diffMs / 86400000);
        return diffDays === 1;
    }

    /**
     * Update streak when a daily run is started.
     * - If already played today (lastPlayed === today): no change.
     * - If last played was yesterday: increment.
     * - Otherwise (gap > 1 day or never played): reset to 1.
     */
    function updateStreak() {
        const todayStr = today();
        const last = getLastPlayed();
        if (last === todayStr) return; // already counted today — streak unchanged
        let streak = getStreak();
        if (_isConsecutive(last, todayStr)) {
            streak += 1;
        } else {
            streak = 1;
        }
        try {
            G.MigrationSystem.set(STREAK_KEY, streak);
            G.MigrationSystem.set(LAST_KEY, todayStr);
        } catch (e) {}
    }

    /** Reset streak to 0 (testing / admin). */
    function resetStreak() {
        try {
            G.MigrationSystem.set(STREAK_KEY, 0);
            G.MigrationSystem.set(LAST_KEY, '');
        } catch (e) {}
    }

    // ── Challenge URL (Sprint 6 S4) ─────────────────────────────────

    /**
     * Generate a challenge URL for sharing a daily run.
     * Format: ?daily=YYYY-MM-DD&score=12345
     */
    function generateChallengeUrl(score) {
        const url = new URL(window.location.href);
        url.searchParams.set('daily', today());
        url.searchParams.set('score', Math.floor(score));
        url.hash = '';
        return url.toString();
    }

    /**
     * Parse challenge params from current URL.
     * Returns { date: 'YYYY-MM-DD', score: 12345 } or null.
     */
    function parseChallengeUrl() {
        try {
            const url = new URL(window.location.href);
            const date = url.searchParams.get('daily');
            const score = url.searchParams.get('score');
            if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
            if (!score || isNaN(parseInt(score, 10))) return null;
            return { date, score: parseInt(score, 10) };
        } catch (e) {
            return null;
        }
    }

    /** Clear challenge params from URL (after consuming). */
    function clearChallengeUrl() {
        try {
            const url = new URL(window.location.href);
            url.searchParams.delete('daily');
            url.searchParams.delete('score');
            window.history.replaceState({}, '', url.toString());
        } catch (e) {}
    }

    G.DailyMode = {
        isActive,
        setActive,
        isLockedToday,
        markAttempt,
        clearAttempt,
        today,
        msUntilReset,
        formatCountdown,
        modeToken,
        // Streak API
        getStreak,
        getLastPlayed,
        updateStreak,
        resetStreak,
        // Challenge URL
        generateChallengeUrl,
        parseChallengeUrl,
        clearChallengeUrl
    };
})(window.Game = window.Game || {});
