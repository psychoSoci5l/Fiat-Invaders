// G.RNG — Seeded PRNG for Daily Seed Run (v6.10.0)
// mulberry32 with SHA-256 derived seed from UTC date string.
// When unseeded, value()/range()/pick() fall back to Math.random — non-daily code paths
// keep their existing entropy until the active mode opts in via setSeed/setDailySeed.
(function (G) {
    'use strict';

    let _state = 0 >>> 0;
    let _seeded = false;
    let _currentDate = null;
    let _currentMode = null;

    // mulberry32 — fast 32-bit PRNG, ~2^32 period, good distribution for game RNG
    function _next() {
        _state = (_state + 0x6D2B79F5) >>> 0;
        let t = _state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    async function _sha256Uint32(str) {
        const data = new TextEncoder().encode(str);
        const buf = await crypto.subtle.digest('SHA-256', data);
        const view = new DataView(buf);
        return view.getUint32(0, false) >>> 0;
    }

    // UTC YYYY-MM-DD for the given Date (defaults to now)
    function utcDateString(d) {
        d = d || new Date();
        const y = d.getUTCFullYear();
        const m = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    // Seed from a 32-bit integer
    function setSeed(seed32) {
        _state = (seed32 >>> 0);
        _seeded = true;
    }

    // Seed from today's UTC date (or supplied Date). Returns date string used.
    async function setDailySeed(date) {
        const dateStr = utcDateString(date);
        const seed = await _sha256Uint32(`fvc-daily:${dateStr}`);
        setSeed(seed);
        _currentDate = dateStr;
        _currentMode = `daily:${dateStr}`;
        return dateStr;
    }

    function clear() {
        _seeded = false;
        _currentDate = null;
        _currentMode = null;
    }

    function isSeeded() { return _seeded; }
    function getDate() { return _currentDate; }
    function getMode() { return _currentMode; }

    // Float in [0, 1) — falls back to Math.random when unseeded
    function value() {
        return _seeded ? _next() : Math.random();
    }

    // Float in [min, max)
    function range(min, max) {
        return min + value() * (max - min);
    }

    // Integer in [min, max] inclusive
    function int(min, max) {
        return Math.floor(value() * (max - min + 1)) + min;
    }

    // Random element of array
    function pick(arr) {
        if (!arr || arr.length === 0) return undefined;
        return arr[Math.floor(value() * arr.length)];
    }

    G.RNG = {
        setSeed,
        setDailySeed,
        clear,
        isSeeded,
        getDate,
        getMode,
        utcDateString,
        value,
        range,
        int,
        pick
    };
})(window.Game = window.Game || {});
