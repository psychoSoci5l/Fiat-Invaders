/**
 * MusicData.js — Kondo-inspired musical data (v7.10.0)
 *
 * Harmonic grammar: extended jazz voicings (maj9/m9/13/7alt), ii-V-I-VI
 * progressions, linear stepwise bass, harp-style arp cascades. Impressionist
 * color over game loops. Tempo relaxed (80-110 BPM) for gameplay, boss phases
 * escalate. Each section = 1 bar (16 sixteenth-note slots).
 *
 * Intensity layering (see AudioSystem.schedule):
 *   bass      >= 0   (always — anchor)
 *   pad       >= 10  (halo)
 *   arp       >= 20  (the harp — Kondo essence)
 *   melody    >= 50  (lyrical ambient layer)
 *   drums     >= 65  (combat)
 *   tempo×1.1 >= 85  (crush/boss)
 *
 * Entry formats:
 *   bass/melody/arp : { f: Hz, d: 16ths, v: 0-1, w?: waveform } | null
 *   drums           : { k, s, h, c } 0|1 flags | null
 *   pad             : { freqs: [Hz...], v: 0-1, w: waveform }
 */

window.Game = window.Game || {};

(function() {
    'use strict';

    const G = window.Game;

    // Note frequencies (12-TET, A4=440)
    const N = {
        C2: 65.41, Db2: 69.30, D2: 73.42, Eb2: 77.78, E2: 82.41, F2: 87.31,
        Gb2: 92.50, G2: 98.00, Ab2: 103.83, A2: 110.00, Bb2: 116.54, B2: 123.47,
        C3: 130.81, Db3: 138.59, D3: 146.83, Eb3: 155.56, E3: 164.81, F3: 174.61,
        Gb3: 185.00, G3: 196.00, Ab3: 207.65, A3: 220.00, Bb3: 233.08, B3: 246.94,
        C4: 261.63, Db4: 277.18, D4: 293.66, Eb4: 311.13, E4: 329.63, F4: 349.23,
        Gb4: 369.99, G4: 392.00, Ab4: 415.30, A4: 440.00, Bb4: 466.16, B4: 493.88,
        C5: 523.25, Db5: 554.37, D5: 587.33, Eb5: 622.25, E5: 659.25, F5: 698.46,
        Gb5: 739.99, G5: 783.99, Ab5: 830.61, A5: 880.00, Bb5: 932.33, B5: 987.77,
        C6: 1046.50, Db6: 1108.73, D6: 1174.66, Eb6: 1244.51, F6: 1396.91
    };

    // Helper: quickly build a 16-slot array from terse pairs [slotIndex, noteObj]
    // slots not listed are null (rest). `base` is the default waveform for the line.
    function fill16(pairs) {
        const arr = new Array(16).fill(null);
        for (const [i, obj] of pairs) arr[i] = obj;
        return arr;
    }

    // Bass: sustained tonic on beat 1, walking pickup on beat 3.5.
    function bassBar(root, pickup, vWave) {
        const w = vWave || 'triangle';
        return fill16([
            [0, {f:root, d:2, v:0.75, w}],
            [8, {f:root, d:1, v:0.55, w}],
            [14, {f:pickup, d:0.5, v:0.5, w}]
        ]);
    }

    // Harp arpeggio: 16 sixteenth-notes ascending then descending through the
    // chord voicing. `tones` is a list of frequencies low→high (5-6 notes).
    function harpBar(tones, vel) {
        // Build a 16-note serpentine: up through tones, peak, back down.
        const v = vel || 0.35;
        const seq = [];
        // ascending
        for (let i = 0; i < tones.length; i++) seq.push(tones[i]);
        // peak extra + descending (skip last to avoid repeat)
        for (let i = tones.length - 2; i >= 1; i--) seq.push(tones[i]);
        // pad to 16 with wrap
        while (seq.length < 16) seq.push(tones[seq.length % tones.length]);
        return seq.slice(0, 16).map((f, i) => ({
            f, d: 0.25, v: v * (0.85 + 0.15 * Math.sin(i * 0.6)), w: 'triangle'
        }));
    }

    // Pad voicing (sustained extended chord)
    function padOf(freqs, v, w) {
        return { freqs, v: v || 0.07, w: w || 'sine' };
    }

    // Sparse melody: single sustained note on beats 1 and 3 (Kondo-like "oohs").
    function melodyBar(note1, note2, vel) {
        const v = vel || 0.42;
        const arr = new Array(16).fill(null);
        if (note1) arr[0] = {f: note1, d: 3, v, w: 'sine'};
        if (note2) arr[8] = {f: note2, d: 3, v: v * 0.85, w: 'sine'};
        return arr;
    }

    // v7.12: Phrase-based melody. pairs: [slot, {f, d, v?}, ...]. Lets us write
    // real melodic lines with rhythm and contour instead of 2-note sustained oohs.
    function melodyPhrase(pairs, baseVel, wave) {
        const arr = new Array(16).fill(null);
        const v = baseVel || 0.40;
        const w = wave || 'sine';
        for (const [slot, note] of pairs) {
            if (slot < 0 || slot > 15) continue;
            arr[slot] = { f: note.f, d: note.d || 1, v: note.v || v, w: note.w || w };
        }
        return arr;
    }

    // Minimal drum pattern: light kick+hat, calm. "Combat" patterns in FILL.
    function drumsCalm() {
        return fill16([
            [0, {k:1, h:1}],
            [4, {h:1}],
            [8, {k:1, h:0.5}],
            [12, {h:1}]
        ]);
    }

    // v7.12: L1 driving pattern — proper backbeat (kick 1/3, snare 2/4, hat 8ths).
    // Not as full as drumsCombat (no fills), but establishes rhythm from the very
    // first bar so the opening has pathos instead of being ambient-relaxed.
    function drumsL1Drive() {
        return fill16([
            [0, {k:1, h:1}],
            [2, {h:0.7}],
            [4, {s:1, h:1}],
            [6, {h:0.7}],
            [8, {k:1, h:1}],
            [10, {h:0.7}],
            [12, {s:1, h:1}],
            [14, {h:0.7}]
        ]);
    }

    // Combat drums: proper backbeat
    function drumsCombat() {
        return fill16([
            [0, {k:1, h:1}],
            [2, {h:1}],
            [4, {s:1, h:1}],
            [6, {h:1}],
            [8, {k:1, h:1}],
            [10, {h:1}],
            [12, {s:1, h:1}],
            [14, {h:1}]
        ]);
    }

    // Crush drums: double-kick, crash on 1
    function drumsCrush(withCrash) {
        return fill16([
            [0, withCrash ? {k:1, h:1, c:1} : {k:1, h:1}],
            [2, {h:1}],
            [4, {s:1, h:1}],
            [6, {k:1, h:1}],
            [8, {k:1, h:1}],
            [10, {s:1, h:1}],
            [12, {s:1, h:1, k:1}],
            [14, {h:1, k:1}]
        ]);
    }

    G.MusicData = {

        // =====================================================================
        // LEVEL SONGS — each = ii-V-I-VI loop, 4 bars (A/B/C/D)
        // =====================================================================
        SONGS: {

            // -----------------------------------------------------------------
            // L1 — "Fountain of Fiat" (Ab major, 102 BPM) — v7.12 pathos rewrite.
            // Three melody variants per bar: `melody` (opening, <60 intensity,
            // sparse call), `melodyCombat` (60-80, phrased engagement), `melodyCrush`
            // (80+, driving descending lines). AudioSystem picks by intensity so
            // the music actually evolves with the fight instead of looping static.
            // Harmony: Bbm9 → Eb13 → Abmaj9 → F7b9 (ii-V-I-VI with tritone pull).
            // -----------------------------------------------------------------
            1: {
                name: 'Fountain of Fiat',
                key: 'Abmaj',
                bpm: 102,
                sections: {
                    // Bar A — Bbm9 (ii): Bb Db F Ab C — tension setup
                    A: {
                        bass: bassBar(N.Bb2, N.F2),
                        arp: harpBar([N.Bb3, N.Db4, N.F4, N.Ab4, N.C5, N.F5]),
                        // Opening: two-note call, leaves space for arp harp
                        melody: melodyPhrase([
                            [0, {f: N.Ab5, d: 3, v: 0.34}],
                            [8, {f: N.F5, d: 3, v: 0.30}]
                        ]),
                        // Combat: 5-note answering phrase, triangle for bite
                        melodyCombat: melodyPhrase([
                            [0,  {f: N.F5,  d: 1.5, v: 0.42}],
                            [2,  {f: N.Ab5, d: 1.5, v: 0.44}],
                            [4,  {f: N.C6,  d: 2,   v: 0.48}],
                            [8,  {f: N.Bb5, d: 1.5, v: 0.42}],
                            [10, {f: N.Ab5, d: 1.5, v: 0.40}],
                            [12, {f: N.F5,  d: 2,   v: 0.44}]
                        ], 0.42, 'triangle'),
                        // Crush: driving descending run, square for aggression
                        melodyCrush: melodyPhrase([
                            [0,  {f: N.C6,  d: 1, v: 0.55}],
                            [2,  {f: N.Bb5, d: 1, v: 0.50}],
                            [4,  {f: N.Ab5, d: 1, v: 0.50}],
                            [6,  {f: N.F5,  d: 1, v: 0.48}],
                            [8,  {f: N.Eb5, d: 1, v: 0.50}],
                            [10, {f: N.Db5, d: 1, v: 0.48}],
                            [12, {f: N.C5,  d: 1, v: 0.48}],
                            [14, {f: N.F5,  d: 1.5, v: 0.52}]
                        ], 0.50, 'square'),
                        drums: drumsL1Drive(),
                        pad: padOf([N.Db4, N.F4, N.Ab4, N.C5], 0.07, 'sine')
                    },
                    // Bar B — Eb13 (V): Eb G Bb Db C — dominant push
                    B: {
                        bass: bassBar(N.Eb2, N.Bb2),
                        arp: harpBar([N.Eb3, N.G3, N.Bb3, N.Db4, N.F4, N.C5]),
                        melody: melodyPhrase([
                            [0, {f: N.G5,  d: 3, v: 0.34}],
                            [8, {f: N.Bb5, d: 3, v: 0.32}]
                        ]),
                        melodyCombat: melodyPhrase([
                            [0,  {f: N.G5,  d: 1.5, v: 0.44}],
                            [2,  {f: N.Bb5, d: 1.5, v: 0.44}],
                            [4,  {f: N.Db6, d: 2,   v: 0.50}],
                            [8,  {f: N.C6,  d: 1.5, v: 0.44}],
                            [10, {f: N.Bb5, d: 1.5, v: 0.40}],
                            [12, {f: N.G5,  d: 2,   v: 0.42}]
                        ], 0.42, 'triangle'),
                        melodyCrush: melodyPhrase([
                            [0,  {f: N.Db6, d: 1, v: 0.55}],
                            [2,  {f: N.C6,  d: 1, v: 0.52}],
                            [4,  {f: N.Bb5, d: 1, v: 0.50}],
                            [6,  {f: N.G5,  d: 1, v: 0.48}],
                            [8,  {f: N.F5,  d: 1, v: 0.50}],
                            [10, {f: N.Eb5, d: 1, v: 0.50}],
                            [12, {f: N.Db5, d: 1, v: 0.48}],
                            [14, {f: N.G5,  d: 1.5, v: 0.54}]
                        ], 0.50, 'square'),
                        drums: drumsL1Drive(),
                        pad: padOf([N.G3, N.Bb3, N.Db4, N.C5], 0.07, 'sine')
                    },
                    // Bar C — Abmaj9 (I): Ab C Eb G Bb — resolution, lift
                    C: {
                        bass: bassBar(N.Ab2, N.Eb3),
                        arp: harpBar([N.Ab3, N.C4, N.Eb4, N.G4, N.Bb4, N.Eb5]),
                        melody: melodyPhrase([
                            [0, {f: N.C5, d: 3, v: 0.36}],
                            [8, {f: N.G5, d: 3, v: 0.34}]
                        ]),
                        melodyCombat: melodyPhrase([
                            [0,  {f: N.Ab5, d: 1.5, v: 0.44}],
                            [2,  {f: N.C6,  d: 1.5, v: 0.46}],
                            [4,  {f: N.Eb6, d: 2,   v: 0.52}],
                            [8,  {f: N.C6,  d: 1.5, v: 0.44}],
                            [10, {f: N.Bb5, d: 1.5, v: 0.40}],
                            [12, {f: N.Ab5, d: 2,   v: 0.44}]
                        ], 0.44, 'triangle'),
                        melodyCrush: melodyPhrase([
                            [0,  {f: N.Eb6, d: 1, v: 0.56}],
                            [2,  {f: N.C6,  d: 1, v: 0.52}],
                            [4,  {f: N.Bb5, d: 1, v: 0.50}],
                            [6,  {f: N.Ab5, d: 1, v: 0.50}],
                            [8,  {f: N.G5,  d: 1, v: 0.52}],
                            [10, {f: N.Eb5, d: 1, v: 0.50}],
                            [12, {f: N.C5,  d: 1, v: 0.48}],
                            [14, {f: N.Ab5, d: 1.5, v: 0.56}]
                        ], 0.52, 'square'),
                        drums: drumsL1Drive(),
                        pad: padOf([N.C4, N.Eb4, N.G4, N.Bb4], 0.08, 'sine')
                    },
                    // Bar D — F7b9 (VI7alt): F A Eb Gb — tritone pull back to ii
                    D: {
                        bass: bassBar(N.F2, N.Bb2),
                        arp: harpBar([N.F3, N.A3, N.Eb4, N.Gb4, N.A4, N.Eb5]),
                        melody: melodyPhrase([
                            [0, {f: N.A4,  d: 3, v: 0.34}],
                            [8, {f: N.Eb5, d: 3, v: 0.32}]
                        ]),
                        melodyCombat: melodyPhrase([
                            [0,  {f: N.A4,  d: 1.5, v: 0.42}],
                            [2,  {f: N.Gb5, d: 1.5, v: 0.44}],
                            [4,  {f: N.A5,  d: 2,   v: 0.48}],
                            [8,  {f: N.Gb5, d: 1.5, v: 0.42}],
                            [10, {f: N.Eb5, d: 1.5, v: 0.40}],
                            [12, {f: N.A4,  d: 2,   v: 0.44}]
                        ], 0.42, 'triangle'),
                        melodyCrush: melodyPhrase([
                            // Tension: chromatic descent into the next bar's Bbm9
                            [0,  {f: N.A5,  d: 1, v: 0.54}],
                            [2,  {f: N.Gb5, d: 1, v: 0.52}],
                            [4,  {f: N.F5,  d: 1, v: 0.50}],
                            [6,  {f: N.Eb5, d: 1, v: 0.50}],
                            [8,  {f: N.Db5, d: 1, v: 0.50}],
                            [10, {f: N.C5,  d: 1, v: 0.48}],
                            [12, {f: N.Bb4, d: 1, v: 0.46}],
                            [14, {f: N.A4,  d: 1.5, v: 0.50}]
                        ], 0.50, 'square'),
                        drums: drumsL1Drive(),
                        pad: padOf([N.A3, N.Eb4, N.Gb4], 0.07, 'sine')
                    }
                },
                structure: ['A','B','C','D','A','C','B','D']
            },

            // -----------------------------------------------------------------
            // L2 — "Liquidity Dream" (D dorian, 104 BPM) — v7.12 phase-aware.
            // Em9 → A13 → Dm11 → Bm7b5 (modal). Melancholic EU. Three melody
            // variants per bar: opening (sparse), combat (D dorian phrasing),
            // crush (driving descents with chromatic passing tones).
            // -----------------------------------------------------------------
            2: {
                name: 'Liquidity Dream',
                key: 'Ddor',
                bpm: 104,
                sections: {
                    // Em9 (ii of D): E G B D Gb
                    A: {
                        bass: bassBar(N.E2, N.B2),
                        arp: harpBar([N.E3, N.G3, N.B3, N.D4, N.Gb4, N.B4]),
                        melody: melodyPhrase([
                            [0, {f: N.G5, d: 3, v: 0.34}],
                            [8, {f: N.D5, d: 3, v: 0.30}]
                        ]),
                        melodyCombat: melodyPhrase([
                            [0,  {f: N.D5,  d: 1.5, v: 0.42}],
                            [2,  {f: N.G5,  d: 1.5, v: 0.44}],
                            [4,  {f: N.B5,  d: 2,   v: 0.48}],
                            [8,  {f: N.A5,  d: 1.5, v: 0.42}],
                            [10, {f: N.G5,  d: 1.5, v: 0.40}],
                            [12, {f: N.E5,  d: 2,   v: 0.44}]
                        ], 0.42, 'triangle'),
                        melodyCrush: melodyPhrase([
                            [0,  {f: N.B5,  d: 1, v: 0.54}],
                            [2,  {f: N.A5,  d: 1, v: 0.52}],
                            [4,  {f: N.G5,  d: 1, v: 0.50}],
                            [6,  {f: N.Gb5, d: 1, v: 0.48}],
                            [8,  {f: N.E5,  d: 1, v: 0.50}],
                            [10, {f: N.D5,  d: 1, v: 0.48}],
                            [12, {f: N.B4,  d: 1, v: 0.46}],
                            [14, {f: N.E5,  d: 1.5, v: 0.52}]
                        ], 0.50, 'square'),
                        drums: drumsL1Drive(),
                        pad: padOf([N.G3, N.B3, N.D4, N.Gb4], 0.07, 'sine')
                    },
                    // A13 (V): A Db E G Gb (13th)
                    B: {
                        bass: bassBar(N.A2, N.E3),
                        arp: harpBar([N.A3, N.Db4, N.E4, N.G4, N.B4, N.Gb5]),
                        melody: melodyPhrase([
                            [0, {f: N.E5, d: 3, v: 0.34}],
                            [8, {f: N.A5, d: 3, v: 0.32}]
                        ]),
                        melodyCombat: melodyPhrase([
                            [0,  {f: N.E5,  d: 1.5, v: 0.44}],
                            [2,  {f: N.G5,  d: 1.5, v: 0.44}],
                            [4,  {f: N.B5,  d: 2,   v: 0.50}],
                            [8,  {f: N.Gb5, d: 1.5, v: 0.42}],
                            [10, {f: N.E5,  d: 1.5, v: 0.40}],
                            [12, {f: N.Db5, d: 2,   v: 0.44}]
                        ], 0.44, 'triangle'),
                        melodyCrush: melodyPhrase([
                            [0,  {f: N.Db6, d: 1, v: 0.56}],
                            [2,  {f: N.B5,  d: 1, v: 0.52}],
                            [4,  {f: N.A5,  d: 1, v: 0.50}],
                            [6,  {f: N.G5,  d: 1, v: 0.48}],
                            [8,  {f: N.Gb5, d: 1, v: 0.50}],
                            [10, {f: N.E5,  d: 1, v: 0.48}],
                            [12, {f: N.Db5, d: 1, v: 0.46}],
                            [14, {f: N.A4,  d: 1.5, v: 0.52}]
                        ], 0.50, 'square'),
                        drums: drumsL1Drive(),
                        pad: padOf([N.Db4, N.E4, N.G4, N.Gb5], 0.07, 'sine')
                    },
                    // Dm11 (i): D F A C E G — modal home
                    C: {
                        bass: bassBar(N.D2, N.A2),
                        arp: harpBar([N.D3, N.F3, N.A3, N.C4, N.E4, N.G4]),
                        melody: melodyPhrase([
                            [0, {f: N.F5, d: 3, v: 0.36}],
                            [8, {f: N.A5, d: 3, v: 0.32}]
                        ]),
                        melodyCombat: melodyPhrase([
                            [0,  {f: N.A5,  d: 1.5, v: 0.46}],
                            [2,  {f: N.C6,  d: 1.5, v: 0.46}],
                            [4,  {f: N.E6,  d: 2,   v: 0.52}],
                            [8,  {f: N.C6,  d: 1.5, v: 0.44}],
                            [10, {f: N.A5,  d: 1.5, v: 0.40}],
                            [12, {f: N.F5,  d: 2,   v: 0.46}]
                        ], 0.44, 'triangle'),
                        melodyCrush: melodyPhrase([
                            [0,  {f: N.E6,  d: 1, v: 0.56}],
                            [2,  {f: N.D6,  d: 1, v: 0.52}],
                            [4,  {f: N.C6,  d: 1, v: 0.50}],
                            [6,  {f: N.A5,  d: 1, v: 0.50}],
                            [8,  {f: N.G5,  d: 1, v: 0.52}],
                            [10, {f: N.F5,  d: 1, v: 0.50}],
                            [12, {f: N.E5,  d: 1, v: 0.48}],
                            [14, {f: N.D5,  d: 1.5, v: 0.54}]
                        ], 0.52, 'square'),
                        drums: drumsL1Drive(),
                        pad: padOf([N.F3, N.A3, N.C4, N.E4], 0.08, 'sine')
                    },
                    // Bm7b5 (vi-half-dim): B D F A — pulls back to E
                    D: {
                        bass: bassBar(N.B2, N.E3),
                        arp: harpBar([N.B3, N.D4, N.F4, N.A4, N.D5, N.F5]),
                        melody: melodyPhrase([
                            [0, {f: N.D5, d: 3, v: 0.34}],
                            [8, {f: N.F5, d: 3, v: 0.32}]
                        ]),
                        melodyCombat: melodyPhrase([
                            [0,  {f: N.D5,  d: 1.5, v: 0.42}],
                            [2,  {f: N.F5,  d: 1.5, v: 0.44}],
                            [4,  {f: N.A5,  d: 2,   v: 0.48}],
                            [8,  {f: N.F5,  d: 1.5, v: 0.42}],
                            [10, {f: N.D5,  d: 1.5, v: 0.40}],
                            [12, {f: N.B4,  d: 2,   v: 0.42}]
                        ], 0.42, 'triangle'),
                        melodyCrush: melodyPhrase([
                            [0,  {f: N.A5,  d: 1, v: 0.54}],
                            [2,  {f: N.F5,  d: 1, v: 0.52}],
                            [4,  {f: N.E5,  d: 1, v: 0.50}],
                            [6,  {f: N.D5,  d: 1, v: 0.50}],
                            [8,  {f: N.C5,  d: 1, v: 0.50}],
                            [10, {f: N.B4,  d: 1, v: 0.48}],
                            [12, {f: N.A4,  d: 1, v: 0.46}],
                            [14, {f: N.E5,  d: 1.5, v: 0.52}]
                        ], 0.50, 'square'),
                        drums: drumsL1Drive(),
                        pad: padOf([N.D4, N.F4, N.A4], 0.07, 'sine')
                    }
                },
                structure: ['A','B','C','D','A','C','B','D']
            },

            // -----------------------------------------------------------------
            // L3 — "Eastern Protocol" (Fmaj pentatonic, 108 BPM) — v7.12.
            // Gm9 → C13sus → Fmaj9 → D7alt. Pentatonic over jazz harmony.
            // Combat variant: pentatonic runs (F pentatonic: F G A C D).
            // Crush variant: minor pentatonic descents with altered tension.
            // -----------------------------------------------------------------
            3: {
                name: 'Eastern Protocol',
                key: 'Fmaj',
                bpm: 108,
                sections: {
                    // Gm9 (ii): G Bb D F A
                    A: {
                        bass: bassBar(N.G2, N.D3),
                        arp: harpBar([N.G3, N.Bb3, N.D4, N.F4, N.A4, N.D5]),
                        melody: melodyPhrase([
                            [0, {f: N.F5, d: 3, v: 0.36}],
                            [8, {f: N.A5, d: 3, v: 0.32}]
                        ]),
                        melodyCombat: melodyPhrase([
                            [0,  {f: N.D5,  d: 1.5, v: 0.44}],
                            [2,  {f: N.F5,  d: 1.5, v: 0.44}],
                            [4,  {f: N.A5,  d: 2,   v: 0.50}],
                            [8,  {f: N.C6,  d: 1.5, v: 0.46}],
                            [10, {f: N.A5,  d: 1.5, v: 0.40}],
                            [12, {f: N.F5,  d: 2,   v: 0.44}]
                        ], 0.44, 'triangle'),
                        melodyCrush: melodyPhrase([
                            [0,  {f: N.D6,  d: 1, v: 0.56}],
                            [2,  {f: N.C6,  d: 1, v: 0.52}],
                            [4,  {f: N.Bb5, d: 1, v: 0.50}],
                            [6,  {f: N.A5,  d: 1, v: 0.50}],
                            [8,  {f: N.G5,  d: 1, v: 0.52}],
                            [10, {f: N.F5,  d: 1, v: 0.50}],
                            [12, {f: N.D5,  d: 1, v: 0.48}],
                            [14, {f: N.C5,  d: 1.5, v: 0.52}]
                        ], 0.52, 'square'),
                        drums: drumsL1Drive(),
                        pad: padOf([N.Bb3, N.D4, N.F4, N.A4], 0.07, 'sine')
                    },
                    // C13sus (V): C F Bb E A (suspended with 13)
                    B: {
                        bass: bassBar(N.C3, N.G3),
                        arp: harpBar([N.C4, N.F4, N.Bb4, N.D5, N.E5, N.A5]),
                        melody: melodyPhrase([
                            [0, {f: N.G5, d: 3, v: 0.36}],
                            [8, {f: N.C6, d: 3, v: 0.32}]
                        ]),
                        melodyCombat: melodyPhrase([
                            [0,  {f: N.G5,  d: 1.5, v: 0.44}],
                            [2,  {f: N.Bb5, d: 1.5, v: 0.46}],
                            [4,  {f: N.C6,  d: 2,   v: 0.50}],
                            [8,  {f: N.E5,  d: 1.5, v: 0.44}],
                            [10, {f: N.F5,  d: 1.5, v: 0.42}],
                            [12, {f: N.A5,  d: 2,   v: 0.46}]
                        ], 0.44, 'triangle'),
                        melodyCrush: melodyPhrase([
                            [0,  {f: N.E6,  d: 1, v: 0.56}],
                            [2,  {f: N.D6,  d: 1, v: 0.52}],
                            [4,  {f: N.C6,  d: 1, v: 0.52}],
                            [6,  {f: N.Bb5, d: 1, v: 0.50}],
                            [8,  {f: N.A5,  d: 1, v: 0.50}],
                            [10, {f: N.G5,  d: 1, v: 0.50}],
                            [12, {f: N.E5,  d: 1, v: 0.48}],
                            [14, {f: N.C5,  d: 1.5, v: 0.52}]
                        ], 0.52, 'square'),
                        drums: drumsL1Drive(),
                        pad: padOf([N.F4, N.Bb4, N.E5, N.A5], 0.07, 'sine')
                    },
                    // Fmaj9 (I): F A C E G
                    C: {
                        bass: bassBar(N.F2, N.C3),
                        arp: harpBar([N.F3, N.A3, N.C4, N.E4, N.G4, N.C5]),
                        melody: melodyPhrase([
                            [0, {f: N.A5, d: 3, v: 0.38}],
                            [8, {f: N.F5, d: 3, v: 0.34}]
                        ]),
                        melodyCombat: melodyPhrase([
                            [0,  {f: N.F5,  d: 1.5, v: 0.46}],
                            [2,  {f: N.A5,  d: 1.5, v: 0.46}],
                            [4,  {f: N.C6,  d: 2,   v: 0.52}],
                            [8,  {f: N.E6,  d: 1.5, v: 0.48}],
                            [10, {f: N.C6,  d: 1.5, v: 0.44}],
                            [12, {f: N.A5,  d: 2,   v: 0.46}]
                        ], 0.46, 'triangle'),
                        melodyCrush: melodyPhrase([
                            [0,  {f: N.F6,  d: 1, v: 0.58}],
                            [2,  {f: N.E6,  d: 1, v: 0.54}],
                            [4,  {f: N.D6,  d: 1, v: 0.52}],
                            [6,  {f: N.C6,  d: 1, v: 0.52}],
                            [8,  {f: N.A5,  d: 1, v: 0.52}],
                            [10, {f: N.G5,  d: 1, v: 0.50}],
                            [12, {f: N.F5,  d: 1, v: 0.50}],
                            [14, {f: N.C5,  d: 1.5, v: 0.54}]
                        ], 0.54, 'square'),
                        drums: drumsL1Drive(),
                        pad: padOf([N.A3, N.C4, N.E4, N.G4], 0.08, 'sine')
                    },
                    // D7alt (VI): D Gb C Eb (b9, altered) — tritone sub back to Gm
                    D: {
                        bass: bassBar(N.D2, N.G2),
                        arp: harpBar([N.D3, N.Gb3, N.C4, N.Eb4, N.Gb4, N.C5]),
                        melody: melodyPhrase([
                            [0, {f: N.Eb5, d: 3, v: 0.36}],
                            [8, {f: N.C5,  d: 3, v: 0.32}]
                        ]),
                        melodyCombat: melodyPhrase([
                            [0,  {f: N.Eb5, d: 1.5, v: 0.44}],
                            [2,  {f: N.Gb5, d: 1.5, v: 0.46}],
                            [4,  {f: N.A5,  d: 2,   v: 0.48}],
                            [8,  {f: N.Gb5, d: 1.5, v: 0.44}],
                            [10, {f: N.Eb5, d: 1.5, v: 0.40}],
                            [12, {f: N.Db5, d: 2,   v: 0.44}]
                        ], 0.44, 'triangle'),
                        melodyCrush: melodyPhrase([
                            // Altered tension descent into Gm9 resolution
                            [0,  {f: N.A5,  d: 1, v: 0.56}],
                            [2,  {f: N.Gb5, d: 1, v: 0.54}],
                            [4,  {f: N.F5,  d: 1, v: 0.52}],
                            [6,  {f: N.Eb5, d: 1, v: 0.50}],
                            [8,  {f: N.Db5, d: 1, v: 0.52}],
                            [10, {f: N.C5,  d: 1, v: 0.50}],
                            [12, {f: N.B4,  d: 1, v: 0.48}],
                            [14, {f: N.A4,  d: 1.5, v: 0.52}]
                        ], 0.52, 'square'),
                        drums: drumsL1Drive(),
                        pad: padOf([N.Gb3, N.C4, N.Eb4], 0.07, 'sine')
                    }
                },
                structure: ['A','B','C','D','A','C','B','D']
            },

            // L4 aliases L2 (arcade post-C3 cycling)
            // L5 aliases L3
        },

        // =====================================================================
        // BOSS — "Central Authority"
        // Minor-mode jazz with tritone substitutions. Three phases escalate
        // density, not aesthetic. Same Kondo harmonic DNA.
        // =====================================================================
        BOSS: {
            // Phase 1 — C minor, stately. Cm9 → F13 → Bbmaj9 → Abmaj7#11
            phase1: {
                name: 'Central Authority - I',
                bpm: 85,
                sections: {
                    A: {
                        bass: bassBar(N.C2, N.G2),
                        arp: harpBar([N.C3, N.Eb3, N.G3, N.Bb3, N.D4, N.G4]),
                        melody: melodyBar(N.Eb5, N.G5),
                        drums: drumsCalm(),
                        pad: padOf([N.Eb3, N.G3, N.Bb3, N.D4], 0.1, 'sawtooth')
                    },
                    B: {
                        bass: bassBar(N.F2, N.C3),
                        arp: harpBar([N.F3, N.A3, N.C4, N.Eb4, N.G4, N.D5]),
                        melody: melodyBar(N.A4, N.D5),
                        drums: drumsCalm(),
                        pad: padOf([N.A3, N.C4, N.Eb4, N.D5], 0.1, 'sawtooth')
                    },
                    C: {
                        bass: bassBar(N.Bb2, N.F3),
                        arp: harpBar([N.Bb3, N.D4, N.F4, N.A4, N.C5, N.F5]),
                        melody: melodyBar(N.D5, N.F5),
                        drums: drumsCalm(),
                        pad: padOf([N.D4, N.F4, N.A4, N.C5], 0.09, 'sawtooth')
                    },
                    D: {
                        bass: bassBar(N.Ab2, N.Eb3),
                        arp: harpBar([N.Ab3, N.C4, N.Eb4, N.G4, N.D5, N.G5]),
                        melody: melodyBar(N.C5, N.G5),
                        drums: drumsCalm(),
                        pad: padOf([N.C4, N.Eb4, N.G4, N.D5], 0.1, 'sawtooth')
                    }
                },
                structure: ['A','B','C','D','A','C','B','D']
            },

            // Phase 2 — F# minor (tritone from C), combat tempo
            phase2: {
                name: 'Central Authority - II',
                bpm: 110,
                sections: {
                    A: {
                        bass: bassBar(N.Gb2, N.Db3),
                        arp: harpBar([N.Gb3, N.A3, N.Db4, N.E4, N.Ab4, N.Db5]),
                        melody: melodyBar(N.A4, N.Db5),
                        drums: drumsCombat(),
                        pad: padOf([N.A3, N.Db4, N.E4, N.Ab4], 0.1, 'sawtooth')
                    },
                    B: {
                        bass: bassBar(N.B2, N.Gb3),
                        arp: harpBar([N.B3, N.D4, N.Gb4, N.A4, N.Db5, N.Gb5]),
                        melody: melodyBar(N.D5, N.Gb5),
                        drums: drumsCombat(),
                        pad: padOf([N.D4, N.Gb4, N.A4, N.Db5], 0.1, 'sawtooth')
                    },
                    C: {
                        bass: bassBar(N.E2, N.B2),
                        arp: harpBar([N.E3, N.G3, N.B3, N.D4, N.Gb4, N.B4]),
                        melody: melodyBar(N.G5, N.B4),
                        drums: drumsCombat(),
                        pad: padOf([N.G3, N.B3, N.D4, N.Gb4], 0.1, 'sawtooth')
                    },
                    D: {
                        bass: bassBar(N.D2, N.A2),
                        arp: harpBar([N.D3, N.F3, N.A3, N.C4, N.E4, N.A4]),
                        melody: melodyBar(N.F5, N.A4),
                        drums: drumsCombat(),
                        pad: padOf([N.F3, N.A3, N.C4, N.E4], 0.1, 'sawtooth')
                    }
                },
                structure: ['A','B','C','D','A','C','B','D']
            },

            // Phase 3 — C minor blitz, crush tempo + double kicks
            phase3: {
                name: 'Central Authority - III',
                bpm: 130,
                sections: {
                    A: {
                        bass: bassBar(N.C2, N.G2),
                        arp: harpBar([N.C3, N.Eb3, N.G3, N.Bb3, N.D4, N.G4], 0.45),
                        melody: melodyBar(N.Eb5, N.Bb5, 0.5),
                        drums: drumsCrush(true),
                        pad: padOf([N.Eb3, N.G3, N.Bb3, N.D4], 0.12, 'sawtooth')
                    },
                    B: {
                        bass: bassBar(N.Ab2, N.Eb3),
                        arp: harpBar([N.Ab3, N.C4, N.Eb4, N.G4, N.C5, N.Eb5], 0.45),
                        melody: melodyBar(N.C5, N.Eb5, 0.5),
                        drums: drumsCrush(false),
                        pad: padOf([N.C4, N.Eb4, N.G4, N.C5], 0.12, 'sawtooth')
                    },
                    C: {
                        bass: bassBar(N.F2, N.C3),
                        arp: harpBar([N.F3, N.Ab3, N.C4, N.Eb4, N.G4, N.C5], 0.45),
                        melody: melodyBar(N.Ab5, N.C6, 0.5),
                        drums: drumsCrush(false),
                        pad: padOf([N.Ab3, N.C4, N.Eb4, N.G4], 0.12, 'sawtooth')
                    },
                    D: {
                        bass: bassBar(N.G2, N.D3),
                        arp: harpBar([N.G3, N.B3, N.D4, N.F4, N.A4, N.D5], 0.45),
                        melody: melodyBar(N.B4, N.D5, 0.5),
                        drums: drumsCrush(true),
                        pad: padOf([N.B3, N.D4, N.F4, N.A4], 0.12, 'sawtooth')
                    }
                },
                structure: ['A','B','C','D','A','C','B','D']
            }
        },

        // =====================================================================
        // INTERMISSION — "Reflection" (Am9 → Fmaj9 → Cmaj9 → G6, 68 BPM)
        // Contemplative ambient for story screens. Drumless, melody-less.
        // Only bass + pad + soft arp at any intensity (arp gated internally).
        // =====================================================================
        INTERMISSION: {
            name: 'Reflection',
            key: 'Am',
            bpm: 68,
            sections: {
                // Am9 (i): A C E G B
                A: {
                    bass: bassBar(N.A2, N.E3),
                    arp: harpBar([N.A3, N.C4, N.E4, N.G4, N.B4, N.E5], 0.22),
                    melody: melodyBar(null, null),
                    drums: null,
                    pad: padOf([N.C4, N.E4, N.G4, N.B4], 0.11, 'sine')
                },
                // Fmaj9 (VI): F A C E G
                B: {
                    bass: bassBar(N.F2, N.C3),
                    arp: harpBar([N.F3, N.A3, N.C4, N.E4, N.G4, N.C5], 0.22),
                    melody: melodyBar(null, null),
                    drums: null,
                    pad: padOf([N.A3, N.C4, N.E4, N.G4], 0.11, 'sine')
                },
                // Cmaj9 (III): C E G B D — bittersweet lift
                C: {
                    bass: bassBar(N.C3, N.G2),
                    arp: harpBar([N.C4, N.E4, N.G4, N.B4, N.D5, N.G5], 0.22),
                    melody: melodyBar(null, null),
                    drums: null,
                    pad: padOf([N.E4, N.G4, N.B4, N.D5], 0.11, 'sine')
                },
                // G6 (VII): G B D E — pulls back to Am
                D: {
                    bass: bassBar(N.G2, N.D3),
                    arp: harpBar([N.G3, N.B3, N.D4, N.E4, N.G4, N.D5], 0.22),
                    melody: melodyBar(null, null),
                    drums: null,
                    pad: padOf([N.B3, N.D4, N.E4, N.G4], 0.11, 'sine')
                }
            },
            structure: ['A','B','C','D','A','B','C','D']
        },

        // =====================================================================
        // BEAR MARKET MODIFIER — applied live on top of any song
        // =====================================================================
        BEAR_MARKET: {
            pitchShift: -2,          // semitones down (darker)
            tempoMult: 1.05,         // slightly faster
            distortion: true,
            filterCutoff: 900,
            volumeBoost: 1.0
        }
    };

    // L4/L5 alias L2/L3 for arcade mode post-C3 cycling
    G.MusicData.SONGS[4] = G.MusicData.SONGS[2];
    G.MusicData.SONGS[5] = G.MusicData.SONGS[3];

})();
