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
            return !!localStorage.getItem(attemptKey());
        } catch (e) {
            return false;
        }
    }

    function markAttempt() {
        try {
            localStorage.setItem(attemptKey(), String(Date.now()));
        } catch (e) {}
    }

    function clearAttempt(dateStr) {
        try {
            localStorage.removeItem(attemptKey(dateStr));
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

    G.DailyMode = {
        isActive,
        setActive,
        isLockedToday,
        markAttempt,
        clearAttempt,
        today,
        msUntilReset,
        formatCountdown,
        modeToken
    };
})(window.Game = window.Game || {});
