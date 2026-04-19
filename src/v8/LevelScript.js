window.Game = window.Game || {};

/**
 * LevelScript v8 — Multi-level scripted spawn tables for Gradius-feel (burst-based).
 *
 * Bypasses WaveManager. Spawns enemies from the top of the screen at scripted
 * absolute timestamps. Triggers the v6 boss at BOSS_AT_S.
 *
 * Burst format: each entry has `lanes: [a,b,c]` (array of 0..1 lane positions).
 * Single-lane `lane: X` still works for back-compat.
 *
 * v7.2.0: LEVELS[] array. Use loadLevel(idx) to switch. hasNextLevel() gates
 * between LEVEL_END → intermission vs LEVEL_END → gameover (campaign done).
 *
 * Active only when G.Balance.V8_MODE.ENABLED === true.
 */
(function() {
    'use strict';
    const G = window.Game;

    // LEVEL 1 — FED / OPENING ACT. Existing burst-paced table from v7.0.1.
    const LEVEL_1_SCRIPT = [
        // 0-30s OPENING — 3-enemy V/line bursts ~every 4s, WEAK tier
        { at_s: 1.5,  currencies: '¥',              lanes: [0.2, 0.5, 0.8] },
        { at_s: 5.5,  currencies: ['₽','₹','¥'],    lanes: [0.15, 0.5, 0.85] },
        { at_s: 9.5,  currencies: '₹',              lanes: [0.3, 0.7],        pattern: 'SINE' },
        { at_s: 13.0, currencies: ['¥','₽','¥','₹'],lanes: [0.15, 0.4, 0.6, 0.85] },
        { at_s: 17.5, currencies: ['₹','₽','₹'],    lanes: [0.25, 0.5, 0.75], pattern: 'SINE' },
        { at_s: 21.5, currencies: '¥',              lanes: [0.1, 0.3, 0.5, 0.7, 0.9] },
        { at_s: 26.0, currencies: ['₽','₹','¥','₽'],lanes: [0.2, 0.4, 0.6, 0.8] },

        // 30-60s BUILDUP — MEDIUM tier, mix SINE+DIVE, 4-5/burst
        { at_s: 31.5, currencies: ['€','£','€'],    lanes: [0.25, 0.5, 0.75], pattern: 'SINE' },
        { at_s: 34.5, currencies: ['¥','₹','¥','₹'],lanes: [0.15, 0.4, 0.6, 0.85] },
        { at_s: 37.5, currencies: ['£','€','£'],    lanes: [0.3, 0.5, 0.7],   pattern: 'SINE' },
        { at_s: 40.5, currencies: ['₺','₣','₺','₣','₺'], lanes: [0.1, 0.3, 0.5, 0.7, 0.9] },
        { at_s: 44.0, currencies: ['€','£','€','£'],lanes: [0.2, 0.4, 0.6, 0.8], pattern: 'SINE' },
        { at_s: 47.5, currencies: '₽',              lanes: [0.15, 0.35, 0.55, 0.75, 0.95] },
        { at_s: 51.0, currencies: ['€','₣','£','€'],lanes: [0.25, 0.45, 0.65, 0.85], pattern: 'SINE' },
        { at_s: 54.5, currencies: ['₺','£','₺','£'],lanes: [0.1, 0.35, 0.6, 0.9] },
        { at_s: 58.0, currencies: ['€','£','₣','€','£'], lanes: [0.2, 0.35, 0.5, 0.65, 0.8], pattern: 'SINE' },

        // 60-90s — denser mix, HOVER compare
        { at_s: 62.0, currencies: ['£','€','£','€'],lanes: [0.15, 0.4, 0.6, 0.85] },
        { at_s: 65.0, currencies: '€',              lanes: [0.3, 0.5, 0.7],   pattern: 'HOVER' },
        { at_s: 67.5, currencies: ['₺','₣','₺','₣'],lanes: [0.2, 0.4, 0.6, 0.8], pattern: 'SINE' },
        { at_s: 70.5, currencies: ['£','€','£','€','£'], lanes: [0.1, 0.3, 0.5, 0.7, 0.9] },
        { at_s: 73.5, currencies: ['€','£'],        lanes: [0.35, 0.65],      pattern: 'HOVER' },
        { at_s: 76.0, currencies: ['₣','€','₣','€','₣'], lanes: [0.15, 0.35, 0.5, 0.65, 0.85], pattern: 'SINE' },
        { at_s: 79.0, currencies: '£',              lanes: [0.2, 0.4, 0.6, 0.8] },

        // 90-130s ESCALATION — STRONG tier arrives + SWOOP from sides
        { at_s: 82.0, currencies: ['$','元','$'],   lanes: [0.25, 0.5, 0.75] },
        { at_s: 85.0, currencies: ['Ⓒ','€','Ⓒ'],  lanes: [0.3, 0.5, 0.7],   pattern: 'HOVER' },
        { at_s: 88.0, currencies: '$',              lanes: [0.15, 0.4, 0.6, 0.85] },
        { at_s: 90.5, currencies: ['元','€','元','€'], lanes: [0.2, 0.4, 0.6, 0.8], pattern: 'SINE' },
        { at_s: 93.5, currencies: '$',              lanes: [0.1, 0.9],        pattern: 'SWOOP' },
        { at_s: 95.0, currencies: ['Ⓒ','$','Ⓒ','$'], lanes: [0.15, 0.4, 0.6, 0.85] },
        { at_s: 98.0, currencies: ['€','£','€'],    lanes: [0.3, 0.5, 0.7],   pattern: 'HOVER' },
        { at_s: 101.0, currencies: ['$','元','$','元','$'], lanes: [0.1, 0.3, 0.5, 0.7, 0.9] },
        { at_s: 104.5, currencies: 'Ⓒ',             lanes: [0.25, 0.45, 0.65, 0.85], pattern: 'SINE' },
        { at_s: 107.0, currencies: '元',            lanes: [0.15, 0.85],      pattern: 'SWOOP' },
        { at_s: 108.5, currencies: ['$','Ⓒ','$','Ⓒ'], lanes: [0.2, 0.4, 0.6, 0.8] },
        { at_s: 112.0, currencies: ['€','£'],       lanes: [0.35, 0.65],      pattern: 'HOVER' },
        { at_s: 114.5, currencies: ['$','元','$','元','$'], lanes: [0.1, 0.3, 0.5, 0.7, 0.9], pattern: 'SINE' },
        { at_s: 118.0, currencies: 'Ⓒ',             lanes: [0.2, 0.4, 0.6, 0.8] },
        { at_s: 121.0, currencies: ['$','元'],      lanes: [0.1, 0.9],        pattern: 'SWOOP' },
        { at_s: 123.0, currencies: ['元','Ⓒ','元','Ⓒ','元'], lanes: [0.15, 0.35, 0.5, 0.65, 0.85] },
        { at_s: 126.0, currencies: ['$','Ⓒ','$'],  lanes: [0.3, 0.5, 0.7],   pattern: 'HOVER' },
        { at_s: 129.0, currencies: '$',             lanes: [0.2, 0.4, 0.6, 0.8], pattern: 'SINE' },

        // 130-150s PEAK — max density wall, multi-pattern
        { at_s: 131.0, currencies: '$',             lanes: [0.1, 0.9],        pattern: 'SWOOP' },
        { at_s: 132.5, currencies: ['元','Ⓒ','元','Ⓒ','元'], lanes: [0.2, 0.35, 0.5, 0.65, 0.8] },
        { at_s: 135.0, currencies: ['$','元','$'], lanes: [0.25, 0.5, 0.75], pattern: 'HOVER' },
        { at_s: 137.0, currencies: 'Ⓒ',             lanes: [0.15, 0.35, 0.55, 0.75, 0.95], pattern: 'SINE' },
        { at_s: 139.5, currencies: ['元','$'],     lanes: [0.1, 0.9],         pattern: 'SWOOP' },
        { at_s: 141.0, currencies: ['$','元','Ⓒ','元','$'], lanes: [0.2, 0.35, 0.5, 0.65, 0.8] },
        { at_s: 143.5, currencies: ['元','Ⓒ'],     lanes: [0.35, 0.65],       pattern: 'HOVER' },
        { at_s: 145.5, currencies: '$',             lanes: [0.1, 0.3, 0.5, 0.7, 0.9], pattern: 'SINE' },
        { at_s: 148.0, currencies: ['元','$'],     lanes: [0.15, 0.85],       pattern: 'SWOOP' },

        // 150-168s CORRIDOR CRUSH SET-PIECE — wall relentless
        { at_s: 150.5, currencies: ['$','元','Ⓒ','元','$'], lanes: [0.15, 0.35, 0.5, 0.65, 0.85] },
        { at_s: 152.5, currencies: ['$','元'],     lanes: [0.1, 0.9],         pattern: 'SWOOP' },
        { at_s: 153.5, currencies: ['元','Ⓒ','元'],lanes: [0.25, 0.5, 0.75],  pattern: 'SINE' },
        { at_s: 155.5, currencies: ['$','元','$','元','$','元'], lanes: [0.1, 0.25, 0.4, 0.6, 0.75, 0.9] },
        { at_s: 158.0, currencies: ['Ⓒ','元','Ⓒ'], lanes: [0.3, 0.5, 0.7],   pattern: 'HOVER' },
        { at_s: 160.0, currencies: ['$','元','$'], lanes: [0.15, 0.85],       pattern: 'SWOOP' },
        { at_s: 161.5, currencies: ['元','$','元','$','元'], lanes: [0.2, 0.35, 0.5, 0.65, 0.8], pattern: 'SINE' },
        { at_s: 164.0, currencies: ['$','Ⓒ','$','Ⓒ','$'], lanes: [0.1, 0.3, 0.5, 0.7, 0.9] },
        { at_s: 166.5, currencies: ['元','$'],     lanes: [0.1, 0.9],         pattern: 'SWOOP' }
    ];

    const LEVEL_1_ANCHORS = [
        { at_s: 150, action: 'CRUSH_ENTER', speed: 1.8 },
        { at_s: 152, action: 'CRUSH_PEAK'  },
        { at_s: 168, action: 'CRUSH_EXIT'  }
    ];

    // LEVEL 2 — BCE / FRAGMENTATION ACT.
    // Higher pressure baseline: starts at MEDIUM tier, STRONG mix earlier, crush is faster+longer.
    // Player arrives with carry-over weapon level and perks; content is tuned for that.
    const LEVEL_2_SCRIPT = [
        // 0-25s OPENING — skip weak warmup, go straight to MEDIUM/SINE mix
        { at_s: 1.0,  currencies: ['€','£','€'],    lanes: [0.2, 0.5, 0.8] },
        { at_s: 4.0,  currencies: ['£','€','£','€'], lanes: [0.15, 0.4, 0.6, 0.85], pattern: 'SINE' },
        { at_s: 7.0,  currencies: ['₺','₣','₺'],    lanes: [0.25, 0.5, 0.75] },
        { at_s: 10.0, currencies: ['€','£','€','£','€'], lanes: [0.1, 0.3, 0.5, 0.7, 0.9], pattern: 'SINE' },
        { at_s: 13.5, currencies: '€',              lanes: [0.3, 0.5, 0.7],   pattern: 'HOVER' },
        { at_s: 16.5, currencies: ['£','₣','£','₣'],lanes: [0.15, 0.4, 0.6, 0.85] },
        { at_s: 20.0, currencies: ['€','£'],        lanes: [0.1, 0.9],        pattern: 'SWOOP' },
        { at_s: 22.5, currencies: ['£','€','£','€','£'], lanes: [0.1, 0.3, 0.5, 0.7, 0.9], pattern: 'SINE' },

        // 25-60s BUILDUP — STRONG tier enters early, swoop pressure
        { at_s: 26.0, currencies: ['$','元','$'],   lanes: [0.25, 0.5, 0.75] },
        { at_s: 29.0, currencies: ['Ⓒ','$','Ⓒ'],  lanes: [0.3, 0.5, 0.7],   pattern: 'HOVER' },
        { at_s: 32.0, currencies: ['€','£','€','£'],lanes: [0.15, 0.4, 0.6, 0.85], pattern: 'SINE' },
        { at_s: 35.0, currencies: '$',              lanes: [0.1, 0.9],        pattern: 'SWOOP' },
        { at_s: 36.5, currencies: ['$','元','$','元'], lanes: [0.2, 0.4, 0.6, 0.8] },
        { at_s: 39.5, currencies: ['€','£','€'],    lanes: [0.3, 0.5, 0.7],   pattern: 'HOVER' },
        { at_s: 42.0, currencies: ['$','元','$','元','$'], lanes: [0.1, 0.3, 0.5, 0.7, 0.9], pattern: 'SINE' },
        { at_s: 45.0, currencies: ['元','$'],       lanes: [0.1, 0.9],        pattern: 'SWOOP' },
        { at_s: 47.0, currencies: ['Ⓒ','$','Ⓒ','$'], lanes: [0.15, 0.4, 0.6, 0.85] },
        { at_s: 50.0, currencies: ['元','Ⓒ','元'], lanes: [0.3, 0.5, 0.7],   pattern: 'HOVER' },
        { at_s: 52.5, currencies: ['$','元','$','元','$'], lanes: [0.1, 0.3, 0.5, 0.7, 0.9] },
        { at_s: 55.5, currencies: ['元','$'],       lanes: [0.15, 0.85],      pattern: 'SWOOP' },
        { at_s: 57.5, currencies: 'Ⓒ',             lanes: [0.2, 0.4, 0.6, 0.8], pattern: 'SINE' },

        // 60-100s ESCALATION — relentless C2/C3 walls, overlapping bursts
        { at_s: 60.5, currencies: ['$','元','Ⓒ','元','$'], lanes: [0.15, 0.35, 0.5, 0.65, 0.85] },
        { at_s: 62.5, currencies: ['元','$'],       lanes: [0.1, 0.9],        pattern: 'SWOOP' },
        { at_s: 64.0, currencies: ['Ⓒ','元','Ⓒ'], lanes: [0.3, 0.5, 0.7],   pattern: 'HOVER' },
        { at_s: 66.5, currencies: ['$','元','$','元','$','元'], lanes: [0.1, 0.25, 0.4, 0.6, 0.75, 0.9] },
        { at_s: 69.0, currencies: ['元','Ⓒ','元','Ⓒ'], lanes: [0.2, 0.4, 0.6, 0.8], pattern: 'SINE' },
        { at_s: 71.5, currencies: ['$','元'],       lanes: [0.1, 0.9],        pattern: 'SWOOP' },
        { at_s: 73.0, currencies: ['$','Ⓒ','$','Ⓒ','$'], lanes: [0.15, 0.35, 0.5, 0.65, 0.85] },
        { at_s: 75.5, currencies: ['元','$','元'], lanes: [0.3, 0.5, 0.7],   pattern: 'HOVER' },
        { at_s: 78.0, currencies: ['$','元','Ⓒ','元','$'], lanes: [0.1, 0.3, 0.5, 0.7, 0.9], pattern: 'SINE' },
        { at_s: 80.5, currencies: ['元','$','元','$'], lanes: [0.1, 0.35, 0.65, 0.9], pattern: 'SWOOP' },
        { at_s: 82.5, currencies: ['Ⓒ','$','Ⓒ','$','Ⓒ'], lanes: [0.2, 0.35, 0.5, 0.65, 0.8] },
        { at_s: 85.0, currencies: ['元','Ⓒ'],     lanes: [0.35, 0.65],      pattern: 'HOVER' },
        { at_s: 87.0, currencies: '$',              lanes: [0.1, 0.3, 0.5, 0.7, 0.9], pattern: 'SINE' },
        { at_s: 90.0, currencies: ['$','元'],       lanes: [0.1, 0.9],        pattern: 'SWOOP' },
        { at_s: 91.5, currencies: ['元','Ⓒ','元','Ⓒ','元'], lanes: [0.15, 0.35, 0.5, 0.65, 0.85] },
        { at_s: 94.0, currencies: ['$','元','$'],  lanes: [0.3, 0.5, 0.7],   pattern: 'HOVER' },
        { at_s: 96.5, currencies: ['Ⓒ','元','Ⓒ','元'], lanes: [0.2, 0.4, 0.6, 0.8], pattern: 'SINE' },
        { at_s: 99.0, currencies: ['元','$'],       lanes: [0.1, 0.9],        pattern: 'SWOOP' },

        // 100-148s PEAK — sustained pressure, 2 swoops overlap, wide walls
        { at_s: 100.5, currencies: ['$','元','Ⓒ','元','$','Ⓒ'], lanes: [0.1, 0.25, 0.4, 0.6, 0.75, 0.9] },
        { at_s: 103.0, currencies: ['元','Ⓒ','元'], lanes: [0.3, 0.5, 0.7],   pattern: 'HOVER' },
        { at_s: 105.5, currencies: ['$','元','$','元','$'], lanes: [0.1, 0.3, 0.5, 0.7, 0.9], pattern: 'SINE' },
        { at_s: 108.0, currencies: ['$','元'],      lanes: [0.1, 0.9],        pattern: 'SWOOP' },
        { at_s: 109.0, currencies: ['元','$'],      lanes: [0.2, 0.8],        pattern: 'SWOOP' },
        { at_s: 111.0, currencies: ['Ⓒ','$','Ⓒ','$','Ⓒ'], lanes: [0.15, 0.35, 0.5, 0.65, 0.85] },
        { at_s: 113.5, currencies: ['元','Ⓒ'],     lanes: [0.35, 0.65],      pattern: 'HOVER' },
        { at_s: 116.0, currencies: ['$','元','Ⓒ','元','$'], lanes: [0.2, 0.35, 0.5, 0.65, 0.8], pattern: 'SINE' },
        { at_s: 118.5, currencies: ['元','$'],      lanes: [0.1, 0.9],        pattern: 'SWOOP' },
        { at_s: 120.0, currencies: ['$','元','$','元','$','元'], lanes: [0.1, 0.25, 0.4, 0.6, 0.75, 0.9] },
        { at_s: 122.5, currencies: ['Ⓒ','元','Ⓒ'], lanes: [0.3, 0.5, 0.7],   pattern: 'HOVER' },
        { at_s: 125.0, currencies: ['$','元','$','元','$'], lanes: [0.1, 0.3, 0.5, 0.7, 0.9], pattern: 'SINE' },
        { at_s: 127.5, currencies: ['元','$'],      lanes: [0.15, 0.85],      pattern: 'SWOOP' },
        { at_s: 129.0, currencies: ['$','Ⓒ','$','Ⓒ','$'], lanes: [0.1, 0.3, 0.5, 0.7, 0.9] },
        { at_s: 131.5, currencies: ['元','Ⓒ','元'], lanes: [0.3, 0.5, 0.7],   pattern: 'HOVER' },
        { at_s: 133.5, currencies: ['$','元','$','元','$'], lanes: [0.1, 0.3, 0.5, 0.7, 0.9], pattern: 'SINE' },
        { at_s: 136.0, currencies: ['$','元'],      lanes: [0.1, 0.9],        pattern: 'SWOOP' },
        { at_s: 137.5, currencies: ['Ⓒ','$','Ⓒ','$','Ⓒ','$'], lanes: [0.1, 0.25, 0.4, 0.6, 0.75, 0.9] },
        { at_s: 140.0, currencies: ['元','Ⓒ','元'], lanes: [0.3, 0.5, 0.7],   pattern: 'HOVER' },
        { at_s: 142.5, currencies: ['$','元','$','元','$'], lanes: [0.1, 0.3, 0.5, 0.7, 0.9] },
        { at_s: 145.0, currencies: ['元','$','元','$'], lanes: [0.1, 0.35, 0.65, 0.9], pattern: 'SWOOP' },
        { at_s: 147.0, currencies: ['$','Ⓒ','$'],  lanes: [0.25, 0.5, 0.75], pattern: 'HOVER' },

        // 148-168s CORRIDOR CRUSH — harder than level 1 (peak earlier, peak speed 2.2)
        { at_s: 148.5, currencies: ['$','元','Ⓒ','元','$','Ⓒ'], lanes: [0.1, 0.25, 0.4, 0.6, 0.75, 0.9] },
        { at_s: 150.0, currencies: ['元','$'],      lanes: [0.1, 0.9],        pattern: 'SWOOP' },
        { at_s: 151.0, currencies: ['$','元','$','元','$'], lanes: [0.15, 0.35, 0.5, 0.65, 0.85], pattern: 'SINE' },
        { at_s: 153.0, currencies: ['Ⓒ','元','Ⓒ','元'], lanes: [0.2, 0.4, 0.6, 0.8] },
        { at_s: 155.0, currencies: ['$','元','$'],  lanes: [0.3, 0.5, 0.7],   pattern: 'HOVER' },
        { at_s: 157.0, currencies: ['$','元'],      lanes: [0.1, 0.9],        pattern: 'SWOOP' },
        { at_s: 158.5, currencies: ['元','$','元','$','元','$'], lanes: [0.1, 0.25, 0.4, 0.6, 0.75, 0.9] },
        { at_s: 160.5, currencies: ['Ⓒ','元','Ⓒ'], lanes: [0.3, 0.5, 0.7],   pattern: 'HOVER' },
        { at_s: 162.5, currencies: ['$','元','$','元','$'], lanes: [0.15, 0.35, 0.5, 0.65, 0.85], pattern: 'SINE' },
        { at_s: 164.5, currencies: ['元','$','元','$'], lanes: [0.1, 0.35, 0.65, 0.9], pattern: 'SWOOP' },
        { at_s: 166.5, currencies: ['Ⓒ','$','Ⓒ','$','Ⓒ'], lanes: [0.1, 0.3, 0.5, 0.7, 0.9] }
    ];

    const LEVEL_2_ANCHORS = [
        { at_s: 148, action: 'CRUSH_ENTER', speed: 2.2 },
        { at_s: 150, action: 'CRUSH_PEAK'  },
        { at_s: 168, action: 'CRUSH_EXIT'  }
    ];

    const LEVELS = [
        {
            id: 1,
            name: 'FED',
            BOSS_TYPE: 'FEDERAL_RESERVE',
            BOSS_AT_S: 170,
            CRUSH_ENTER_S: 150,
            CRUSH_EXIT_S: 168,
            SCRIPT: LEVEL_1_SCRIPT,
            ANCHORS: LEVEL_1_ANCHORS
        },
        {
            id: 2,
            name: 'BCE',
            BOSS_TYPE: 'BCE',
            BOSS_AT_S: 170,
            CRUSH_ENTER_S: 148,
            CRUSH_EXIT_S: 168,
            SCRIPT: LEVEL_2_SCRIPT,
            ANCHORS: LEVEL_2_ANCHORS
        }
    ];

    G.LevelScript = {
        LEVELS,

        _levelIdx: 0,
        _idx: 0,
        _anchorIdx: 0,
        _elapsed: 0,
        _bossSpawned: false,
        _hcPrimed: false,
        _levelEndTimer: -1,
        _stats: null,

        get SCRIPT()   { return LEVELS[this._levelIdx].SCRIPT; },
        get ANCHORS()  { return LEVELS[this._levelIdx].ANCHORS; },
        get BOSS_AT_S(){ return LEVELS[this._levelIdx].BOSS_AT_S; },
        get BOSS_TYPE(){ return LEVELS[this._levelIdx].BOSS_TYPE; },
        get CRUSH_ENTER_S(){ return LEVELS[this._levelIdx].CRUSH_ENTER_S; },
        get CRUSH_EXIT_S() { return LEVELS[this._levelIdx].CRUSH_EXIT_S; },
        currentLevelNum()  { return this._levelIdx + 1; },
        currentLevelName() { return LEVELS[this._levelIdx].name; },
        hasNextLevel()     { return (this._levelIdx + 1) < LEVELS.length; },

        reset() {
            this._levelIdx = 0;
            this._resetLevelState();
            this._stats = {
                startedAt: 0,
                burstsFired: 0,
                spawned: 0,
                killed: 0,
                aliveSamples: 0,
                aliveSum: 0,
                aliveMax: 0,
                deadTimeSec: 0
            };
            if (G.Events && typeof G.Events.on === 'function') {
                if (this._killHook && typeof G.Events.off === 'function') {
                    G.Events.off('enemy_killed', this._killHook);
                }
                this._killHook = () => { if (this._stats) this._stats.killed++; };
                G.Events.on('enemy_killed', this._killHook);
            }
        },

        _resetLevelState() {
            this._idx = 0;
            this._anchorIdx = 0;
            this._elapsed = 0;
            this._bossSpawned = false;
            this._hcPrimed = false;
            this._levelEndTimer = -1;
        },

        // Switch to a specific level (0-indexed). Called on CONTINUE after intermission.
        loadLevel(idx) {
            if (idx < 0 || idx >= LEVELS.length) {
                if (G.Debug) G.Debug.log('V8', `loadLevel: invalid idx ${idx}, ignoring`);
                return false;
            }
            this._levelIdx = idx;
            this._resetLevelState();
            if (G.Debug) G.Debug.log('V8', `loadLevel: switched to level ${idx + 1} (${LEVELS[idx].name})`);
            return true;
        },

        _primeConductor() {
            if (this._hcPrimed) return;
            const hc = G.HarmonicConductor;
            if (!hc || !hc.setSequence) return;
            const level = window.currentLevel || 1;
            const cycle = window.marketCycle || 1;
            const intensity = (G.Audio && typeof G.Audio.intensity === 'number') ? G.Audio.intensity : 0.5;
            hc.setDifficulty(level, cycle, !!window.isBearMarket);
            hc.setSequence('SINE_WAVE', intensity, !!window.isBearMarket);
            let totalSpawns = 0;
            const script = this.SCRIPT;
            for (let i = 0; i < script.length; i++) {
                const e = script[i];
                totalSpawns += (e.lanes && e.lanes.length) ? e.lanes.length : 1;
            }
            hc.startWave(totalSpawns);
            this._hcPrimed = true;
            if (G.Debug) G.Debug.log('V8', `primed L${this.currentLevelNum()}: ${script.length} bursts / ${totalSpawns} spawns, boss @ t=${this.BOSS_AT_S}s`);
        },

        tick(dt) {
            const cfg = G.Balance && G.Balance.V8_MODE;
            if (!cfg || !cfg.ENABLED) return null;

            this._elapsed += dt;
            this._primeConductor();

            const arr = G.enemies || [];

            // Purge v8 enemies that fell below the screen (otherwise they stay in
            // the array invisibly firing — bullets appear but no enemies visible).
            const gh = G._gameHeight || 849;
            const cullY = gh + 120;
            for (let i = arr.length - 1; i >= 0; i--) {
                const e = arr[i];
                if (!e) continue;
                if (e._v8Fall && e.y > cullY) {
                    arr.splice(i, 1);
                }
            }

            const aliveNow = arr.length;
            if (this._stats) {
                this._stats.aliveSamples++;
                this._stats.aliveSum += aliveNow;
                if (aliveNow > this._stats.aliveMax) this._stats.aliveMax = aliveNow;
                if (aliveNow === 0 && !window.boss) this._stats.deadTimeSec += dt;
            }

            const script = this.SCRIPT;
            while (this._idx < script.length && script[this._idx].at_s <= this._elapsed) {
                this._spawnBurst(script[this._idx]);
                this._idx++;
            }

            const anchors = this.ANCHORS;
            while (this._anchorIdx < anchors.length && anchors[this._anchorIdx].at_s <= this._elapsed) {
                this._handleAnchor(anchors[this._anchorIdx]);
                this._anchorIdx++;
            }

            if (this._levelEndTimer >= 0) {
                this._levelEndTimer -= dt;
                if (this._levelEndTimer <= 0) {
                    this._levelEndTimer = -1;
                    if (G.Debug) G.Debug.log('V8', `LEVEL_END fired (L${this.currentLevelNum()})`);
                    return { action: 'LEVEL_END' };
                }
            }

            if (!this._bossSpawned && this._elapsed >= this.BOSS_AT_S) {
                this._bossSpawned = true;
                if (G.Debug) G.Debug.log('V8', `boss trigger L${this.currentLevelNum()} @ t=${this._elapsed.toFixed(1)}s (${this.BOSS_TYPE})`);
                return { action: 'SPAWN_BOSS' };
            }
            return null;
        },

        _handleAnchor(anchor) {
            const action = anchor.action;
            const se = G.ScrollEngine;
            const fx = G.EffectsRenderer;
            const audio = G.Audio;
            if (action === 'CRUSH_ENTER') {
                const target = anchor.speed || 1.8;
                if (se && se.setSpeedMultiplier) se.setSpeedMultiplier(target, 2.0);
                if (audio && audio.setDetune) audio.setDetune(-100, 2.0);
            } else if (action === 'CRUSH_PEAK') {
                if (fx && fx.applyShake) fx.applyShake(4.0);
                if (fx && fx.triggerDamageVignette) fx.triggerDamageVignette();
            } else if (action === 'CRUSH_EXIT') {
                if (fx && fx.applyShake) fx.applyShake(0);
                if (se && se.setSpeedMultiplier) se.setSpeedMultiplier(1.0, 1.5);
                if (audio && audio.setDetune) audio.setDetune(0, 1.5);
            }
            if (G.Debug) G.Debug.log('V8', `anchor ${action} @ t=${this._elapsed.toFixed(1)}s (L${this.currentLevelNum()})`);
        },

        scheduleLevelEnd(delay) {
            this._levelEndTimer = Math.max(0, delay || 0);
            if (G.Debug) G.Debug.log('V8', `level end scheduled in ${this._levelEndTimer.toFixed(1)}s (L${this.currentLevelNum()})`);
        },

        _spawnBurst(entry) {
            if (this._stats) this._stats.burstsFired++;
            const lanes = Array.isArray(entry.lanes) ? entry.lanes
                        : (typeof entry.lane === 'number' ? [entry.lane] : [0.5]);
            const currs = entry.currencies !== undefined ? entry.currencies : entry.currency;
            for (let i = 0; i < lanes.length; i++) {
                const lane = lanes[i];
                const currency = Array.isArray(currs) ? currs[i % currs.length] : (currs || '¥');
                this._spawn(lane, currency, entry.pattern);
            }
        },

        _spawn(lane, currencySymbol, pattern) {
            const Balance = G.Balance;
            if (!Balance) return;

            const currencyType = Balance.getCurrencyBySymbol(currencySymbol);
            if (!currencyType) return;

            const gw = G._gameWidth || 400;
            const spawnY = Balance.V8_MODE.SPAWN_Y_OFFSET || -80;
            const pat = pattern || 'DIVE';
            const patCfg = Balance.V8_MODE.PATTERNS || {};
            const defaultVy = Balance.V8_MODE.DEFAULT_ENEMY_VY;

            let spawnX;
            let swoopDir = 0;
            if (pat === 'SWOOP' && patCfg.SWOOP) {
                const m = patCfg.SWOOP.SIDE_MARGIN || 30;
                const fromLeft = (lane || 0.5) < 0.5;
                spawnX = fromLeft ? m : gw - m;
                swoopDir = fromLeft ? 1 : -1;
            } else {
                spawnX = Math.max(30, Math.min(gw - 30, (lane || 0.5) * gw));
            }

            const level = window.currentLevel || 1;
            const cycle = window.marketCycle || 1;
            const diff = Balance.calculateDifficulty(level, cycle);
            const scaledHP = Balance.calculateEnemyHP(diff, cycle);
            const scaledType = Object.assign({}, currencyType, {
                hp: currencyType.hp * scaledHP
            });

            const enemy = new G.Enemy(spawnX, spawnY, scaledType);
            enemy.isEntering = false;
            enemy.hasSettled = true;
            enemy._v8Fall = true;
            enemy.entryPattern = pat;
            enemy._v8SpawnX = spawnX;
            enemy._v8PatTimer = 0;
            enemy.fireTimer = 0.8 + Math.random() * 1.2;

            if (pat === 'HOVER' && patCfg.HOVER) {
                enemy.vy = patCfg.HOVER.APPROACH_VY || 60;
            } else if (pat === 'SWOOP' && patCfg.SWOOP) {
                enemy.vy = patCfg.SWOOP.APPROACH_VY || 50;
                enemy._v8SwoopDir = swoopDir;
            } else {
                enemy.vy = defaultVy;
            }

            const arr = G.enemies;
            if (arr) {
                arr.push(enemy);
                if (G.HarmonicConductor) G.HarmonicConductor.enemies = arr;
            }
            if (this._stats) this._stats.spawned++;
        }
    };
})();
