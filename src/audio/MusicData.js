/**
 * MusicData.js — Synthwave music data (v7.15.0)
 *
 * Complete rewrite: jazz → synthwave. Sawtooth/square waveforms, octave-jumping
 * bass lines, power chord arpeggios, pentatonic/minor melodic hooks. Higher
 * tempos (145-178 BPM) for arcade energy. i-VI-III-VII progression everywhere.
 *
 * Intensity layering (see AudioSystem.schedule):
 *   bass      >= 0   (always)
 *   pad       >= 10  (halo)
 *   arp       >= 20  (power chord sequence)
 *   melody    >= 35  (pentatonic hooks)
 *   drums     >= 45  (drive/combat)
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
        C6: 1046.50, Db6: 1108.73, D6: 1174.66, Eb6: 1244.51, F6: 1396.91,
        // v7.15: convenience aliases for sharp keys
        Cs3: 138.59, Cs4: 277.18, Cs5: 554.37, Cs6: 1108.73,
        Fs2: 92.50, Fs3: 185.00, Fs4: 369.99, Fs5: 739.99, Fs6: 1479.98,
        Gs3: 207.65, Gs4: 415.30, Gs5: 830.61
    };

    // Helper: quickly build a 16-slot array from terse pairs [slotIndex, noteObj]
    function fill16(pairs) {
        const arr = new Array(16).fill(null);
        for (const [i, obj] of pairs) arr[i] = obj;
        return arr;
    }

    // Synthwave bass: octave-jumping sawtooth 16th note pattern.
    // Cycles root → octave → root → octave across all 16 slots.
    function bassBar(root, _pickup, vWave) {
        const w = vWave || 'sawtooth';
        return fill16([
            [0,  {f:root,     d:0.5, v:0.75, w}],
            [1,  {f:root*2,   d:0.5, v:0.55, w}],
            [2,  {f:root,     d:0.5, v:0.65, w}],
            [3,  {f:root*2,   d:0.5, v:0.55, w}],
            [4,  {f:root,     d:0.5, v:0.75, w}],
            [5,  {f:root*2,   d:0.5, v:0.55, w}],
            [6,  {f:root,     d:0.5, v:0.65, w}],
            [7,  {f:root*2,   d:0.5, v:0.55, w}],
            [8,  {f:root,     d:0.5, v:0.75, w}],
            [9,  {f:root*2,   d:0.5, v:0.55, w}],
            [10, {f:root,     d:0.5, v:0.65, w}],
            [11, {f:root*2,   d:0.5, v:0.55, w}],
            [12, {f:root,     d:0.5, v:0.75, w}],
            [13, {f:root*2,   d:0.5, v:0.55, w}],
            [14, {f:root,     d:0.5, v:0.65, w}],
            [15, {f:root*2,   d:0.5, v:0.55, w}]
        ]);
    }

    // Synthwave power chord arpeggio: root-5th-octave-5th cycling square wave.
    function powerChordArp(root, fifth, octave, vel) {
        const v = vel || 0.30;
        const seq = [root, fifth, octave, fifth, root, fifth, octave, fifth];
        while (seq.length < 16) seq.push(seq[seq.length % seq.length]);
        return seq.slice(0, 16).map((f, i) => ({
            f, d: 0.25, v: v * (0.85 + 0.15 * Math.sin(i * 0.5)), w: 'square'
        }));
    }

    // Pad voicing (sustained power chord)
    function padOf(freqs, v, w) {
        return { freqs, v: v || 0.07, w: w || 'sawtooth' };
    }

    // Sparse melody: pentatonic hook notes with square/saw wave.
    function melodyBar(note1, note2, vel) {
        const v = vel || 0.42;
        const arr = new Array(16).fill(null);
        if (note1) arr[0] = {f: note1, d: 3, v, w: 'square'};
        if (note2) arr[8] = {f: note2, d: 3, v: v * 0.85, w: 'square'};
        return arr;
    }

    // Phrase-based melody for pentatonic/minor hooks.
    function melodyPhrase(pairs, baseVel, wave) {
        const arr = new Array(16).fill(null);
        const v = baseVel || 0.40;
        const w = wave || 'square';
        for (const [slot, note] of pairs) {
            if (slot < 0 || slot > 15) continue;
            arr[slot] = { f: note.f, d: note.d || 1, v: note.v || v, w: note.w || w };
        }
        return arr;
    }

    // Basic drum pattern: kick su 1&3, hi-hat 16th, nessuno snare (leggero).
    function drumsBasic() {
        return fill16([
            [0,  {k:1, h:1}],
            [1,  {h:1}],
            [2,  {h:1}],
            [3,  {h:1}],
            [4,  {h:1}],
            [5,  {h:1}],
            [6,  {h:1}],
            [7,  {h:1}],
            [8,  {k:1, h:1}],
            [9,  {h:1}],
            [10, {h:1}],
            [11, {h:1}],
            [12, {h:1}],
            [13, {h:1}],
            [14, {h:1}],
            [15, {h:1}]
        ]);
    }

    // Driving drum pattern: kick 4/4, hi-hat 16th, snare 2&4.
    function drumsDrive() {
        return fill16([
            [0,  {k:1, h:1}],
            [1,  {h:1}],
            [2,  {h:1}],
            [3,  {h:1}],
            [4,  {s:1, h:1}],
            [5,  {h:1}],
            [6,  {h:1}],
            [7,  {h:1}],
            [8,  {k:1, h:1}],
            [9,  {h:1}],
            [10, {h:1}],
            [11, {h:1}],
            [12, {s:1, h:1}],
            [13, {h:1}],
            [14, {h:1}],
            [15, {h:1}]
        ]);
    }

    // Combat drums: proper backbeat with accents.
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

    // Crush drums: double-kick, crash on 1.
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
        // LEVEL SONGS — Synthwave i-VI-III-VII progression, 4 bars (A/B/C/D)
        // =====================================================================
        SONGS: {

            // -----------------------------------------------------------------
            // L1 — "Digital Horizon" (F#min, 155 BPM)
            // Bright, energetic opener. F#m → D → A → E (i-VI-III-VII).
            // Bass: octave-jumping sawtooth. Arp: power chord square.
            // Melody: F# pentatonic hooks (F# A B C# E), square/saw wave.
            // -----------------------------------------------------------------
            1: {
                name: 'Digital Horizon',
                key: 'F#min',
                bpm: 155,
                sections: {
                    // F#m (i)
                    A: {
                        bass: bassBar(N.Fs2, N.Fs3),
                        arp: powerChordArp(N.Fs3, N.Cs4, N.Fs4),
                        melody: melodyPhrase([
                            [0,  {f: N.Cs5, d: 1, v: 0.40}],
                            [1,  {f: N.A4,  d: 1, v: 0.35}],
                            [2,  {f: N.B4,  d: 1, v: 0.38}],
                            [3,  {f: N.Cs5, d: 1, v: 0.40}],
                            [4,  {f: N.E5,  d: 2, v: 0.42}],
                            [6,  {f: N.Cs5, d: 1, v: 0.36}],
                            [7,  {f: N.A4,  d: 1, v: 0.34}],
                            [8,  {f: N.Fs5, d: 2, v: 0.42}],
                            [10, {f: N.E5,  d: 1, v: 0.38}],
                            [11, {f: N.Cs5, d: 1, v: 0.36}],
                            [12, {f: N.D5,  d: 1, v: 0.38}],
                            [13, {f: N.E5,  d: 1, v: 0.40}],
                            [14, {f: N.Cs5, d: 1, v: 0.36}],
                            [15, {f: N.A4,  d: 1, v: 0.34}]
                        ]),
                        melodyCombat: melodyPhrase([
                            [0,  {f: N.Fs5, d: 1, v: 0.50}],
                            [1,  {f: N.A5,  d: 1, v: 0.48}],
                            [2,  {f: N.B5,  d: 1, v: 0.50}],
                            [3,  {f: N.Cs6, d: 0.5, v: 0.52}],
                            [4,  {f: N.D5,  d: 1, v: 0.48}],
                            [5,  {f: N.Fs5, d: 1, v: 0.50}],
                            [6,  {f: N.A5,  d: 0.5, v: 0.52}],
                            [7,  {f: N.Gb5, d: 0.5, v: 0.48}],
                            [8,  {f: N.E5,  d: 1, v: 0.50}],
                            [9,  {f: N.Cs5, d: 1, v: 0.46}],
                            [10, {f: N.A4,  d: 1, v: 0.44}],
                            [11, {f: N.B4,  d: 1, v: 0.46}],
                            [12, {f: N.Cs5, d: 1, v: 0.48}],
                            [13, {f: N.E5,  d: 1, v: 0.50}],
                            [14, {f: N.Fs5, d: 1, v: 0.52}],
                            [15, {f: N.A5,  d: 1, v: 0.50}]
                        ], 0.48, 'square'),
                        melodyCrush: melodyPhrase([
                            [0,  {f: N.Cs6, d: 0.5, v: 0.55}],
                            [1,  {f: N.B5,  d: 0.5, v: 0.52}],
                            [2,  {f: N.A5,  d: 0.5, v: 0.50}],
                            [3,  {f: N.Fs5, d: 0.5, v: 0.48}],
                            [4,  {f: N.E5,  d: 0.5, v: 0.50}],
                            [5,  {f: N.Cs5, d: 0.5, v: 0.48}],
                            [6,  {f: N.B4,  d: 0.5, v: 0.46}],
                            [7,  {f: N.A4,  d: 0.5, v: 0.46}],
                            [8,  {f: N.Fs5, d: 0.5, v: 0.52}],
                            [9,  {f: N.A5,  d: 0.5, v: 0.50}],
                            [10, {f: N.B5,  d: 0.5, v: 0.50}],
                            [11, {f: N.Cs6, d: 0.5, v: 0.52}],
                            [12, {f: N.A5,  d: 0.5, v: 0.50}],
                            [13, {f: N.Fs5, d: 0.5, v: 0.48}],
                            [14, {f: N.E5,  d: 0.5, v: 0.48}],
                            [15, {f: N.Cs5, d: 0.5, v: 0.46}]
                        ], 0.52, 'sawtooth'),
                        drums: drumsDrive(),
                        pad: padOf([N.Fs3, N.A3, N.Cs4], 0.07, 'sawtooth')
                    },
                    // Dmaj (VI)
                    B: {
                        bass: bassBar(N.D2, N.D3),
                        arp: powerChordArp(N.D3, N.A3, N.D4),
                        melody: melodyPhrase([
                            [0,  {f: N.A4,  d: 1, v: 0.38}],
                            [1,  {f: N.D5,  d: 1, v: 0.40}],
                            [2,  {f: N.Fs5, d: 1, v: 0.42}],
                            [3,  {f: N.A5,  d: 1, v: 0.44}],
                            [4,  {f: N.D5,  d: 2, v: 0.40}],
                            [6,  {f: N.Fs5, d: 1, v: 0.42}],
                            [7,  {f: N.A5,  d: 1, v: 0.44}],
                            [8,  {f: N.Fs5, d: 2, v: 0.42}],
                            [10, {f: N.E5,  d: 1, v: 0.38}],
                            [11, {f: N.D5,  d: 1, v: 0.36}],
                            [12, {f: N.Cs5, d: 1, v: 0.38}],
                            [13, {f: N.D5,  d: 1, v: 0.40}],
                            [14, {f: N.A4,  d: 1, v: 0.36}],
                            [15, {f: N.Fs4, d: 1, v: 0.34}]
                        ]),
                        melodyCombat: melodyPhrase([
                            [0,  {f: N.D5,  d: 1, v: 0.42}],
                            [2,  {f: N.Fs5, d: 1, v: 0.44}],
                            [4,  {f: N.A5,  d: 1, v: 0.42}],
                            [6,  {f: N.Fs5, d: 1, v: 0.40}],
                            [8,  {f: N.D6,  d: 1, v: 0.44}],
                            [10, {f: N.A5,  d: 1, v: 0.42}],
                            [12, {f: N.Fs5, d: 1, v: 0.44}],
                            [14, {f: N.D5,  d: 1, v: 0.40}]
                        ], 0.42, 'square'),
                        melodyCrush: melodyPhrase([
                            [0,  {f: N.D6,  d: 0.5, v: 0.55}],
                            [1,  {f: N.A5,  d: 0.5, v: 0.52}],
                            [2,  {f: N.Fs5, d: 0.5, v: 0.50}],
                            [3,  {f: N.D5,  d: 0.5, v: 0.48}],
                            [4,  {f: N.A4,  d: 0.5, v: 0.50}],
                            [5,  {f: N.Fs4, d: 0.5, v: 0.48}],
                            [6,  {f: N.E4,  d: 0.5, v: 0.46}],
                            [7,  {f: N.D4,  d: 0.5, v: 0.44}],
                            [8,  {f: N.Fs5, d: 0.5, v: 0.52}],
                            [9,  {f: N.A5,  d: 0.5, v: 0.50}],
                            [10, {f: N.D6,  d: 0.5, v: 0.52}],
                            [11, {f: N.A5,  d: 0.5, v: 0.50}],
                            [12, {f: N.Fs5, d: 0.5, v: 0.48}],
                            [13, {f: N.D5,  d: 0.5, v: 0.46}],
                            [14, {f: N.A4,  d: 0.5, v: 0.44}],
                            [15, {f: N.Fs4, d: 0.5, v: 0.42}]
                        ], 0.52, 'sawtooth'),
                        drums: drumsDrive(),
                        pad: padOf([N.D3, N.Fs3, N.A3], 0.07, 'sawtooth')
                    },
                    // Amaj (III)
                    C: {
                        bass: bassBar(N.A2, N.A3),
                        arp: powerChordArp(N.A3, N.E4, N.A4),
                        melody: melodyPhrase([
                            [0,  {f: N.E5,  d: 1, v: 0.38}],
                            [1,  {f: N.Gs5, d: 1, v: 0.42}],
                            [2,  {f: N.A5,  d: 1, v: 0.44}],
                            [3,  {f: N.B5,  d: 1, v: 0.42}],
                            [4,  {f: N.Cs6, d: 2, v: 0.46}],
                            [6,  {f: N.A5,  d: 1, v: 0.42}],
                            [7,  {f: N.E5,  d: 1, v: 0.38}],
                            [8,  {f: N.A5,  d: 2, v: 0.44}],
                            [10, {f: N.Gs5, d: 1, v: 0.40}],
                            [11, {f: N.E5,  d: 1, v: 0.38}],
                            [12, {f: N.Cs5, d: 1, v: 0.36}],
                            [13, {f: N.D5,  d: 1, v: 0.38}],
                            [14, {f: N.E5,  d: 1, v: 0.40}],
                            [15, {f: N.Cs5, d: 1, v: 0.36}]
                        ]),
                        melodyCombat: melodyPhrase([
                            [0,  {f: N.A5,  d: 1, v: 0.50}],
                            [1,  {f: N.Cs6, d: 1, v: 0.52}],
                            [2,  {f: N.E6,  d: 0.5, v: 0.54}],
                            [3,  {f: N.D6,  d: 0.5, v: 0.50}],
                            [4,  {f: N.A5,  d: 1, v: 0.48}],
                            [5,  {f: N.E5,  d: 1, v: 0.44}],
                            [6,  {f: N.Fs5, d: 1, v: 0.46}],
                            [7,  {f: N.Gs5, d: 1, v: 0.48}],
                            [8,  {f: N.A5,  d: 1, v: 0.50}],
                            [9,  {f: N.Cs6, d: 1, v: 0.52}],
                            [10, {f: N.A5,  d: 1, v: 0.48}],
                            [11, {f: N.Fs5, d: 1, v: 0.46}],
                            [12, {f: N.E5,  d: 1, v: 0.44}],
                            [13, {f: N.Cs5, d: 1, v: 0.42}],
                            [14, {f: N.D5,  d: 1, v: 0.44}],
                            [15, {f: N.E5,  d: 1, v: 0.46}]
                        ], 0.50, 'square'),
                        melodyCrush: melodyPhrase([
                            [0,  {f: N.E6,  d: 0.5, v: 0.56}],
                            [1,  {f: N.Cs6, d: 0.5, v: 0.54}],
                            [2,  {f: N.A5,  d: 0.5, v: 0.52}],
                            [3,  {f: N.E5,  d: 0.5, v: 0.50}],
                            [4,  {f: N.Cs5, d: 0.5, v: 0.50}],
                            [5,  {f: N.A4,  d: 0.5, v: 0.48}],
                            [6,  {f: N.Gs4, d: 0.5, v: 0.46}],
                            [7,  {f: N.E4,  d: 0.5, v: 0.44}],
                            [8,  {f: N.A5,  d: 0.5, v: 0.54}],
                            [9,  {f: N.Cs6, d: 0.5, v: 0.52}],
                            [10, {f: N.E6,  d: 0.5, v: 0.54}],
                            [11, {f: N.Cs6, d: 0.5, v: 0.52}],
                            [12, {f: N.A5,  d: 0.5, v: 0.50}],
                            [13, {f: N.E5,  d: 0.5, v: 0.48}],
                            [14, {f: N.Cs5, d: 0.5, v: 0.46}],
                            [15, {f: N.A4,  d: 0.5, v: 0.44}]
                        ], 0.54, 'sawtooth'),
                        drums: drumsDrive(),
                        pad: padOf([N.A3, N.Cs4, N.E4], 0.08, 'sawtooth')
                    },
                    // Emaj (VII)
                    D: {
                        bass: bassBar(N.E2, N.E3),
                        arp: powerChordArp(N.E3, N.B3, N.E4),
                        melody: melodyPhrase([
                            [0,  {f: N.B4,  d: 1, v: 0.38}],
                            [1,  {f: N.E5,  d: 1, v: 0.42}],
                            [2,  {f: N.Gs5, d: 1, v: 0.44}],
                            [3,  {f: N.B5,  d: 1, v: 0.44}],
                            [4,  {f: N.E5,  d: 2, v: 0.40}],
                            [6,  {f: N.Gs5, d: 1, v: 0.42}],
                            [7,  {f: N.B5,  d: 1, v: 0.44}],
                            [8,  {f: N.E5,  d: 2, v: 0.42}],
                            [10, {f: N.D5,  d: 1, v: 0.38}],
                            [11, {f: N.Cs5, d: 1, v: 0.36}],
                            [12, {f: N.B4,  d: 1, v: 0.38}],
                            [13, {f: N.Gs4, d: 1, v: 0.36}],
                            [14, {f: N.B4,  d: 1, v: 0.38}],
                            [15, {f: N.E5,  d: 1, v: 0.40}]
                        ]),
                        melodyCombat: melodyPhrase([
                            [0,  {f: N.Gs5, d: 1, v: 0.48}],
                            [1,  {f: N.B5,  d: 1, v: 0.50}],
                            [2,  {f: N.E6,  d: 0.5, v: 0.52}],
                            [3,  {f: N.D6,  d: 0.5, v: 0.48}],
                            [4,  {f: N.B5,  d: 1, v: 0.50}],
                            [5,  {f: N.Gs5, d: 1, v: 0.48}],
                            [6,  {f: N.E5,  d: 1, v: 0.44}],
                            [7,  {f: N.Fs5, d: 1, v: 0.46}],
                            [8,  {f: N.Gs5, d: 1, v: 0.48}],
                            [9,  {f: N.B5,  d: 1, v: 0.50}],
                            [10, {f: N.E6,  d: 1, v: 0.52}],
                            [11, {f: N.B5,  d: 1, v: 0.48}],
                            [12, {f: N.Gs5, d: 1, v: 0.46}],
                            [13, {f: N.E5,  d: 1, v: 0.44}],
                            [14, {f: N.Fs5, d: 1, v: 0.46}],
                            [15, {f: N.Gs5, d: 1, v: 0.48}]
                        ], 0.48, 'square'),
                        melodyCrush: melodyPhrase([
                            [0,  {f: N.E6,  d: 0.5, v: 0.55}],
                            [1,  {f: N.B5,  d: 0.5, v: 0.52}],
                            [2,  {f: N.Gs5, d: 0.5, v: 0.50}],
                            [3,  {f: N.E5,  d: 0.5, v: 0.48}],
                            [4,  {f: N.B4,  d: 0.5, v: 0.48}],
                            [5,  {f: N.Gs4, d: 0.5, v: 0.46}],
                            [6,  {f: N.Fs4, d: 0.5, v: 0.44}],
                            [7,  {f: N.E4,  d: 0.5, v: 0.42}],
                            [8,  {f: N.Gs5, d: 0.5, v: 0.52}],
                            [9,  {f: N.B5,  d: 0.5, v: 0.50}],
                            [10, {f: N.E6,  d: 0.5, v: 0.52}],
                            [11, {f: N.B5,  d: 0.5, v: 0.50}],
                            [12, {f: N.Gs5, d: 0.5, v: 0.48}],
                            [13, {f: N.E5,  d: 0.5, v: 0.46}],
                            [14, {f: N.B4,  d: 0.5, v: 0.44}],
                            [15, {f: N.Gs4, d: 0.5, v: 0.42}]
                        ], 0.52, 'sawtooth'),
                        drums: drumsDrive(),
                        pad: padOf([N.E3, N.Gs3, N.B3], 0.07, 'sawtooth')
                    }
                },
                structure: ['A','B','C','D','A','C','B','D']
            },

            // -----------------------------------------------------------------
            // L2 — "Neon Night" (Dmin, 160 BPM)
            // Darker, more aggressive. Dm → Bb → F → C (i-VI-III-VII).
            // Melody: D pentatonic minor (D F G A C), sawtooth leads.
            // -----------------------------------------------------------------
            2: {
                name: 'Neon Night',
                key: 'Dmin',
                bpm: 160,
                sections: {
                    // Dm (i): D F A
                    A: {
                        bass: bassBar(N.D2, N.D3),
                        arp: powerChordArp(N.D3, N.A3, N.D4),
                        melody: melodyPhrase([
                            [0, {f: N.A4,  d: 2, v: 0.34}],
                            [4, {f: N.F4,  d: 1, v: 0.30}],
                            [8, {f: N.D5,  d: 2, v: 0.34}],
                            [12, {f: N.C5, d: 1, v: 0.30}]
                        ]),
                        melodyCombat: melodyPhrase([
                            [0,  {f: N.D5,  d: 1, v: 0.42}],
                            [2,  {f: N.F5,  d: 1, v: 0.44}],
                            [4,  {f: N.A5,  d: 1, v: 0.44}],
                            [6,  {f: N.F5,  d: 1, v: 0.40}],
                            [8,  {f: N.A5,  d: 1, v: 0.44}],
                            [10, {f: N.D6,  d: 1, v: 0.46}],
                            [12, {f: N.A5,  d: 1, v: 0.44}],
                            [14, {f: N.F5,  d: 1, v: 0.40}]
                        ], 0.44, 'sawtooth'),
                        melodyCrush: melodyPhrase([
                            [0,  {f: N.D6,  d: 0.5, v: 0.56}],
                            [1,  {f: N.A5,  d: 0.5, v: 0.54}],
                            [2,  {f: N.F5,  d: 0.5, v: 0.52}],
                            [3,  {f: N.D5,  d: 0.5, v: 0.50}],
                            [4,  {f: N.C5,  d: 0.5, v: 0.50}],
                            [5,  {f: N.A4,  d: 0.5, v: 0.48}],
                            [6,  {f: N.F4,  d: 0.5, v: 0.46}],
                            [7,  {f: N.D4,  d: 0.5, v: 0.44}],
                            [8,  {f: N.F5,  d: 0.5, v: 0.52}],
                            [9,  {f: N.A5,  d: 0.5, v: 0.50}],
                            [10, {f: N.D6,  d: 0.5, v: 0.52}],
                            [11, {f: N.A5,  d: 0.5, v: 0.50}],
                            [12, {f: N.F5,  d: 0.5, v: 0.48}],
                            [13, {f: N.D5,  d: 0.5, v: 0.46}],
                            [14, {f: N.C5,  d: 0.5, v: 0.46}],
                            [15, {f: N.A4,  d: 0.5, v: 0.44}]
                        ], 0.54, 'sawtooth'),
                        drums: drumsDrive(),
                        pad: padOf([N.D3, N.F3, N.A3], 0.07, 'sawtooth')
                    },
                    // Bb (VI): Bb D F
                    B: {
                        bass: bassBar(N.Bb2, N.Bb3),
                        arp: powerChordArp(N.Bb3, N.F4, N.Bb4),
                        melody: melodyPhrase([
                            [0, {f: N.F4,  d: 2, v: 0.34}],
                            [4, {f: N.D5,  d: 1, v: 0.30}],
                            [8, {f: N.Bb4, d: 2, v: 0.34}],
                            [12, {f: N.A4, d: 1, v: 0.30}]
                        ]),
                        melodyCombat: melodyPhrase([
                            [0,  {f: N.Bb4, d: 1, v: 0.42}],
                            [2,  {f: N.D5,  d: 1, v: 0.44}],
                            [4,  {f: N.F5,  d: 1, v: 0.42}],
                            [6,  {f: N.D5,  d: 1, v: 0.40}],
                            [8,  {f: N.Bb5, d: 1, v: 0.44}],
                            [10, {f: N.F5,  d: 1, v: 0.42}],
                            [12, {f: N.D5,  d: 1, v: 0.42}],
                            [14, {f: N.Bb4, d: 1, v: 0.38}]
                        ], 0.42, 'sawtooth'),
                        melodyCrush: melodyPhrase([
                            [0,  {f: N.Bb5, d: 0.5, v: 0.56}],
                            [1,  {f: N.F5,  d: 0.5, v: 0.54}],
                            [2,  {f: N.D5,  d: 0.5, v: 0.52}],
                            [3,  {f: N.Bb4, d: 0.5, v: 0.50}],
                            [4,  {f: N.F4,  d: 0.5, v: 0.48}],
                            [5,  {f: N.D4,  d: 0.5, v: 0.46}],
                            [6,  {f: N.C4,  d: 0.5, v: 0.44}],
                            [7,  {f: N.Bb3, d: 0.5, v: 0.42}],
                            [8,  {f: N.D5,  d: 0.5, v: 0.52}],
                            [9,  {f: N.F5,  d: 0.5, v: 0.50}],
                            [10, {f: N.Bb5, d: 0.5, v: 0.52}],
                            [11, {f: N.F5,  d: 0.5, v: 0.50}],
                            [12, {f: N.D5,  d: 0.5, v: 0.48}],
                            [13, {f: N.Bb4, d: 0.5, v: 0.46}],
                            [14, {f: N.F4,  d: 0.5, v: 0.44}],
                            [15, {f: N.D4,  d: 0.5, v: 0.42}]
                        ], 0.54, 'sawtooth'),
                        drums: drumsDrive(),
                        pad: padOf([N.Bb3, N.D4, N.F4], 0.07, 'sawtooth')
                    },
                    // F (III): F A C
                    C: {
                        bass: bassBar(N.F2, N.F3),
                        arp: powerChordArp(N.F3, N.C4, N.F4),
                        melody: melodyPhrase([
                            [0, {f: N.C5,  d: 2, v: 0.36}],
                            [4, {f: N.A4,  d: 1, v: 0.32}],
                            [8, {f: N.F5,  d: 2, v: 0.36}],
                            [12, {f: N.C5, d: 1, v: 0.32}]
                        ]),
                        melodyCombat: melodyPhrase([
                            [0,  {f: N.F5,  d: 1, v: 0.44}],
                            [2,  {f: N.A5,  d: 1, v: 0.46}],
                            [4,  {f: N.C6,  d: 1, v: 0.46}],
                            [6,  {f: N.A5,  d: 1, v: 0.42}],
                            [8,  {f: N.F5,  d: 1, v: 0.44}],
                            [10, {f: N.C5,  d: 1, v: 0.40}],
                            [12, {f: N.A4,  d: 1, v: 0.42}],
                            [14, {f: N.F4,  d: 1, v: 0.40}]
                        ], 0.44, 'sawtooth'),
                        melodyCrush: melodyPhrase([
                            [0,  {f: N.C6,  d: 0.5, v: 0.58}],
                            [1,  {f: N.A5,  d: 0.5, v: 0.56}],
                            [2,  {f: N.F5,  d: 0.5, v: 0.54}],
                            [3,  {f: N.C5,  d: 0.5, v: 0.52}],
                            [4,  {f: N.A4,  d: 0.5, v: 0.50}],
                            [5,  {f: N.F4,  d: 0.5, v: 0.48}],
                            [6,  {f: N.E4,  d: 0.5, v: 0.46}],
                            [7,  {f: N.C4,  d: 0.5, v: 0.44}],
                            [8,  {f: N.F5,  d: 0.5, v: 0.54}],
                            [9,  {f: N.A5,  d: 0.5, v: 0.52}],
                            [10, {f: N.C6,  d: 0.5, v: 0.54}],
                            [11, {f: N.A5,  d: 0.5, v: 0.52}],
                            [12, {f: N.F5,  d: 0.5, v: 0.50}],
                            [13, {f: N.C5,  d: 0.5, v: 0.48}],
                            [14, {f: N.A4,  d: 0.5, v: 0.46}],
                            [15, {f: N.F4,  d: 0.5, v: 0.44}]
                        ], 0.56, 'sawtooth'),
                        drums: drumsDrive(),
                        pad: padOf([N.F3, N.A3, N.C4], 0.08, 'sawtooth')
                    },
                    // C (VII): C E G
                    D: {
                        bass: bassBar(N.C2, N.C3),
                        arp: powerChordArp(N.C3, N.G3, N.C4),
                        melody: melodyPhrase([
                            [0, {f: N.G4,  d: 2, v: 0.34}],
                            [4, {f: N.E4,  d: 1, v: 0.30}],
                            [8, {f: N.C5,  d: 2, v: 0.34}],
                            [12, {f: N.G4, d: 1, v: 0.30}]
                        ]),
                        melodyCombat: melodyPhrase([
                            [0,  {f: N.E5,  d: 1, v: 0.42}],
                            [2,  {f: N.G5,  d: 1, v: 0.44}],
                            [4,  {f: N.C6,  d: 1, v: 0.44}],
                            [6,  {f: N.G5,  d: 1, v: 0.40}],
                            [8,  {f: N.E5,  d: 1, v: 0.42}],
                            [10, {f: N.C5,  d: 1, v: 0.40}],
                            [12, {f: N.G4,  d: 1, v: 0.40}],
                            [14, {f: N.E4,  d: 1, v: 0.38}]
                        ], 0.42, 'sawtooth'),
                        melodyCrush: melodyPhrase([
                            [0,  {f: N.C6,  d: 0.5, v: 0.56}],
                            [1,  {f: N.G5,  d: 0.5, v: 0.54}],
                            [2,  {f: N.E5,  d: 0.5, v: 0.52}],
                            [3,  {f: N.C5,  d: 0.5, v: 0.50}],
                            [4,  {f: N.G4,  d: 0.5, v: 0.48}],
                            [5,  {f: N.E4,  d: 0.5, v: 0.46}],
                            [6,  {f: N.D4,  d: 0.5, v: 0.44}],
                            [7,  {f: N.C4,  d: 0.5, v: 0.42}],
                            [8,  {f: N.E5,  d: 0.5, v: 0.52}],
                            [9,  {f: N.G5,  d: 0.5, v: 0.50}],
                            [10, {f: N.C6,  d: 0.5, v: 0.52}],
                            [11, {f: N.G5,  d: 0.5, v: 0.50}],
                            [12, {f: N.E5,  d: 0.5, v: 0.48}],
                            [13, {f: N.C5,  d: 0.5, v: 0.46}],
                            [14, {f: N.G4,  d: 0.5, v: 0.44}],
                            [15, {f: N.E4,  d: 0.5, v: 0.42}]
                        ], 0.54, 'sawtooth'),
                        drums: drumsDrive(),
                        pad: padOf([N.C3, N.E3, N.G3], 0.07, 'sawtooth')
                    }
                },
                structure: ['A','B','C','D','A','C','B','D']
            },

            // -----------------------------------------------------------------
            // L3 — "Cyber Storm" (Emin, 165 BPM)
            // Fastest level track. Em → C → G → D (i-VI-III-VII).
            // Melody: E pentatonic minor (E G A B D), aggressive sawtooth.
            // -----------------------------------------------------------------
            3: {
                name: 'Cyber Storm',
                key: 'Emin',
                bpm: 165,
                sections: {
                    // Em (i): E G B
                    A: {
                        bass: bassBar(N.E2, N.E3),
                        arp: powerChordArp(N.E3, N.B3, N.E4),
                        melody: melodyPhrase([
                            [0, {f: N.B4,  d: 2, v: 0.36}],
                            [4, {f: N.G4,  d: 1, v: 0.32}],
                            [8, {f: N.E5,  d: 2, v: 0.36}],
                            [12, {f: N.D5, d: 1, v: 0.32}]
                        ]),
                        melodyCombat: melodyPhrase([
                            [0,  {f: N.E5,  d: 1, v: 0.44}],
                            [2,  {f: N.G5,  d: 1, v: 0.46}],
                            [4,  {f: N.B5,  d: 1, v: 0.46}],
                            [6,  {f: N.G5,  d: 1, v: 0.42}],
                            [8,  {f: N.E6,  d: 1, v: 0.48}],
                            [10, {f: N.B5,  d: 1, v: 0.44}],
                            [12, {f: N.G5,  d: 1, v: 0.44}],
                            [14, {f: N.E5,  d: 1, v: 0.40}]
                        ], 0.46, 'sawtooth'),
                        melodyCrush: melodyPhrase([
                            [0,  {f: N.E6,  d: 0.5, v: 0.58}],
                            [1,  {f: N.B5,  d: 0.5, v: 0.56}],
                            [2,  {f: N.G5,  d: 0.5, v: 0.54}],
                            [3,  {f: N.E5,  d: 0.5, v: 0.52}],
                            [4,  {f: N.D5,  d: 0.5, v: 0.50}],
                            [5,  {f: N.B4,  d: 0.5, v: 0.48}],
                            [6,  {f: N.A4,  d: 0.5, v: 0.46}],
                            [7,  {f: N.G4,  d: 0.5, v: 0.44}],
                            [8,  {f: N.B5,  d: 0.5, v: 0.54}],
                            [9,  {f: N.D6,  d: 0.5, v: 0.52}],
                            [10, {f: N.E6,  d: 0.5, v: 0.54}],
                            [11, {f: N.D6,  d: 0.5, v: 0.52}],
                            [12, {f: N.B5,  d: 0.5, v: 0.50}],
                            [13, {f: N.G5,  d: 0.5, v: 0.48}],
                            [14, {f: N.E5,  d: 0.5, v: 0.46}],
                            [15, {f: N.D5,  d: 0.5, v: 0.44}]
                        ], 0.56, 'sawtooth'),
                        drums: drumsDrive(),
                        pad: padOf([N.E3, N.G3, N.B3], 0.07, 'sawtooth')
                    },
                    // C (VI): C E G
                    B: {
                        bass: bassBar(N.C2, N.C3),
                        arp: powerChordArp(N.C3, N.G3, N.C4),
                        melody: melodyPhrase([
                            [0, {f: N.G4,  d: 2, v: 0.36}],
                            [4, {f: N.E4,  d: 1, v: 0.32}],
                            [8, {f: N.C5,  d: 2, v: 0.36}],
                            [12, {f: N.B4, d: 1, v: 0.32}]
                        ]),
                        melodyCombat: melodyPhrase([
                            [0,  {f: N.C5,  d: 1, v: 0.44}],
                            [2,  {f: N.E5,  d: 1, v: 0.46}],
                            [4,  {f: N.G5,  d: 1, v: 0.46}],
                            [6,  {f: N.E5,  d: 1, v: 0.42}],
                            [8,  {f: N.C6,  d: 1, v: 0.48}],
                            [10, {f: N.G5,  d: 1, v: 0.44}],
                            [12, {f: N.E5,  d: 1, v: 0.44}],
                            [14, {f: N.C5,  d: 1, v: 0.40}]
                        ], 0.46, 'sawtooth'),
                        melodyCrush: melodyPhrase([
                            [0,  {f: N.C6,  d: 0.5, v: 0.58}],
                            [1,  {f: N.G5,  d: 0.5, v: 0.56}],
                            [2,  {f: N.E5,  d: 0.5, v: 0.54}],
                            [3,  {f: N.C5,  d: 0.5, v: 0.52}],
                            [4,  {f: N.G4,  d: 0.5, v: 0.50}],
                            [5,  {f: N.E4,  d: 0.5, v: 0.48}],
                            [6,  {f: N.D4,  d: 0.5, v: 0.46}],
                            [7,  {f: N.C4,  d: 0.5, v: 0.44}],
                            [8,  {f: N.E5,  d: 0.5, v: 0.54}],
                            [9,  {f: N.G5,  d: 0.5, v: 0.52}],
                            [10, {f: N.C6,  d: 0.5, v: 0.54}],
                            [11, {f: N.G5,  d: 0.5, v: 0.52}],
                            [12, {f: N.E5,  d: 0.5, v: 0.50}],
                            [13, {f: N.C5,  d: 0.5, v: 0.48}],
                            [14, {f: N.G4,  d: 0.5, v: 0.46}],
                            [15, {f: N.E4,  d: 0.5, v: 0.44}]
                        ], 0.56, 'sawtooth'),
                        drums: drumsDrive(),
                        pad: padOf([N.C3, N.E3, N.G3], 0.07, 'sawtooth')
                    },
                    // G (III): G B D
                    C: {
                        bass: bassBar(N.G2, N.G3),
                        arp: powerChordArp(N.G3, N.D4, N.G4),
                        melody: melodyPhrase([
                            [0, {f: N.D5,  d: 2, v: 0.38}],
                            [4, {f: N.B4,  d: 1, v: 0.34}],
                            [8, {f: N.G5,  d: 2, v: 0.38}],
                            [12, {f: N.D5, d: 1, v: 0.34}]
                        ]),
                        melodyCombat: melodyPhrase([
                            [0,  {f: N.G5,  d: 1, v: 0.46}],
                            [2,  {f: N.B5,  d: 1, v: 0.48}],
                            [4,  {f: N.D6,  d: 1, v: 0.48}],
                            [6,  {f: N.B5,  d: 1, v: 0.44}],
                            [8,  {f: N.G5,  d: 1, v: 0.46}],
                            [10, {f: N.D5,  d: 1, v: 0.42}],
                            [12, {f: N.B4,  d: 1, v: 0.44}],
                            [14, {f: N.G4,  d: 1, v: 0.40}]
                        ], 0.48, 'sawtooth'),
                        melodyCrush: melodyPhrase([
                            [0,  {f: N.D6,  d: 0.5, v: 0.60}],
                            [1,  {f: N.B5,  d: 0.5, v: 0.58}],
                            [2,  {f: N.G5,  d: 0.5, v: 0.56}],
                            [3,  {f: N.D5,  d: 0.5, v: 0.54}],
                            [4,  {f: N.B4,  d: 0.5, v: 0.52}],
                            [5,  {f: N.G4,  d: 0.5, v: 0.50}],
                            [6,  {f: N.Fs4, d: 0.5, v: 0.48}],
                            [7,  {f: N.D4,  d: 0.5, v: 0.46}],
                            [8,  {f: N.G5,  d: 0.5, v: 0.56}],
                            [9,  {f: N.B5,  d: 0.5, v: 0.54}],
                            [10, {f: N.D6,  d: 0.5, v: 0.56}],
                            [11, {f: N.B5,  d: 0.5, v: 0.54}],
                            [12, {f: N.G5,  d: 0.5, v: 0.52}],
                            [13, {f: N.D5,  d: 0.5, v: 0.50}],
                            [14, {f: N.B4,  d: 0.5, v: 0.48}],
                            [15, {f: N.G4,  d: 0.5, v: 0.46}]
                        ], 0.58, 'sawtooth'),
                        drums: drumsDrive(),
                        pad: padOf([N.G3, N.B3, N.D4], 0.08, 'sawtooth')
                    },
                    // D (VII): D F# A
                    D: {
                        bass: bassBar(N.D2, N.D3),
                        arp: powerChordArp(N.D3, N.A3, N.D4),
                        melody: melodyPhrase([
                            [0, {f: N.A4,  d: 2, v: 0.36}],
                            [4, {f: N.Fs4, d: 1, v: 0.32}],
                            [8, {f: N.D5,  d: 2, v: 0.36}],
                            [12, {f: N.A4, d: 1, v: 0.32}]
                        ]),
                        melodyCombat: melodyPhrase([
                            [0,  {f: N.Fs5, d: 1, v: 0.44}],
                            [2,  {f: N.A5,  d: 1, v: 0.46}],
                            [4,  {f: N.D6,  d: 1, v: 0.46}],
                            [6,  {f: N.A5,  d: 1, v: 0.42}],
                            [8,  {f: N.Fs5, d: 1, v: 0.44}],
                            [10, {f: N.D5,  d: 1, v: 0.40}],
                            [12, {f: N.A4,  d: 1, v: 0.42}],
                            [14, {f: N.Fs4, d: 1, v: 0.40}]
                        ], 0.44, 'sawtooth'),
                        melodyCrush: melodyPhrase([
                            [0,  {f: N.D6,  d: 0.5, v: 0.58}],
                            [1,  {f: N.A5,  d: 0.5, v: 0.56}],
                            [2,  {f: N.Fs5, d: 0.5, v: 0.54}],
                            [3,  {f: N.D5,  d: 0.5, v: 0.52}],
                            [4,  {f: N.A4,  d: 0.5, v: 0.50}],
                            [5,  {f: N.Fs4, d: 0.5, v: 0.48}],
                            [6,  {f: N.E4,  d: 0.5, v: 0.46}],
                            [7,  {f: N.D4,  d: 0.5, v: 0.44}],
                            [8,  {f: N.Fs5, d: 0.5, v: 0.54}],
                            [9,  {f: N.A5,  d: 0.5, v: 0.52}],
                            [10, {f: N.D6,  d: 0.5, v: 0.54}],
                            [11, {f: N.A5,  d: 0.5, v: 0.52}],
                            [12, {f: N.Fs5, d: 0.5, v: 0.50}],
                            [13, {f: N.D5,  d: 0.5, v: 0.48}],
                            [14, {f: N.A4,  d: 0.5, v: 0.46}],
                            [15, {f: N.Fs4, d: 0.5, v: 0.44}]
                        ], 0.56, 'sawtooth'),
                        drums: drumsDrive(),
                        pad: padOf([N.D3, N.Fs3, N.A3], 0.07, 'sawtooth')
                    }
                },
                structure: ['A','B','C','D','A','C','B','D']
            },

            // L4 aliases L2 (arcade post-C3 cycling)
            // L5 aliases L3
        },

        // =====================================================================
        // BOSS — "Central Authority"
        // Synthwave boss themes, three escalating phases.
        // i-VI-III-VII progression, tempo and density escalate.
        // =====================================================================
        BOSS: {
            // Phase 1 — Cmin, 145 BPM. Stately, ominous.
            phase1: {
                name: 'Central Authority - I',
                bpm: 145,
                sections: {
                    A: {
                        bass: bassBar(N.C2, N.C3),
                        arp: powerChordArp(N.C3, N.G3, N.C4),
                        melody: melodyBar(N.Eb4, N.G4, 0.42),
                        drums: drumsBasic(),
                        pad: padOf([N.C3, N.Eb3, N.G3], 0.1, 'sawtooth')
                    },
                    B: {
                        bass: bassBar(N.Ab2, N.Ab3),
                        arp: powerChordArp(N.Ab3, N.Eb4, N.Ab4),
                        melody: melodyBar(N.C5, N.Eb5, 0.42),
                        drums: drumsBasic(),
                        pad: padOf([N.Ab3, N.C4, N.Eb4], 0.1, 'sawtooth')
                    },
                    C: {
                        bass: bassBar(N.Eb2, N.Eb3),
                        arp: powerChordArp(N.Eb3, N.Bb3, N.Eb4),
                        melody: melodyBar(N.G4, N.Bb4, 0.42),
                        drums: drumsBasic(),
                        pad: padOf([N.Eb3, N.G3, N.Bb3], 0.09, 'sawtooth')
                    },
                    D: {
                        bass: bassBar(N.G2, N.G3),
                        arp: powerChordArp(N.G3, N.D4, N.G4),
                        melody: melodyBar(N.Bb4, N.D5, 0.42),
                        drums: drumsBasic(),
                        pad: padOf([N.G3, N.Bb3, N.D4], 0.1, 'sawtooth')
                    }
                },
                structure: ['A','B','C','D','A','C','B','D']
            },

            // Phase 2 — F#min, 160 BPM. Aggressive, driving.
            phase2: {
                name: 'Central Authority - II',
                bpm: 160,
                sections: {
                    A: {
                        bass: bassBar(N.Fs2, N.Fs3),
                        arp: powerChordArp(N.Fs3, N.Cs4, N.Fs4),
                        melody: melodyBar(N.A4, N.Cs5, 0.46),
                        drums: drumsCombat(),
                        pad: padOf([N.Fs3, N.A3, N.Cs4], 0.1, 'sawtooth')
                    },
                    B: {
                        bass: bassBar(N.D2, N.D3),
                        arp: powerChordArp(N.D3, N.A3, N.D4),
                        melody: melodyBar(N.Fs4, N.A4, 0.46),
                        drums: drumsCombat(),
                        pad: padOf([N.D3, N.Fs3, N.A3], 0.1, 'sawtooth')
                    },
                    C: {
                        bass: bassBar(N.A2, N.A3),
                        arp: powerChordArp(N.A3, N.E4, N.A4),
                        melody: melodyBar(N.Cs5, N.E5, 0.46),
                        drums: drumsCombat(),
                        pad: padOf([N.A3, N.Cs4, N.E4], 0.1, 'sawtooth')
                    },
                    D: {
                        bass: bassBar(N.E2, N.E3),
                        arp: powerChordArp(N.E3, N.B3, N.E4),
                        melody: melodyBar(N.Gs4, N.B4, 0.46),
                        drums: drumsCombat(),
                        pad: padOf([N.E3, N.Gs3, N.B3], 0.1, 'sawtooth')
                    }
                },
                structure: ['A','B','C','D','A','C','B','D']
            },

            // Phase 3 — Cmin, 178 BPM. Blitz, double kick.
            phase3: {
                name: 'Central Authority - III',
                bpm: 178,
                sections: {
                    A: {
                        bass: bassBar(N.C2, N.C3),
                        arp: powerChordArp(N.C3, N.G3, N.C4, 0.45),
                        melody: melodyBar(N.Eb5, N.G5, 0.52),
                        drums: drumsCrush(true),
                        pad: padOf([N.C3, N.Eb3, N.G3], 0.12, 'sawtooth')
                    },
                    B: {
                        bass: bassBar(N.Ab2, N.Ab3),
                        arp: powerChordArp(N.Ab3, N.Eb4, N.Ab4, 0.45),
                        melody: melodyBar(N.C5, N.Eb5, 0.52),
                        drums: drumsCrush(false),
                        pad: padOf([N.Ab3, N.C4, N.Eb4], 0.12, 'sawtooth')
                    },
                    C: {
                        bass: bassBar(N.Eb2, N.Eb3),
                        arp: powerChordArp(N.Eb3, N.Bb3, N.Eb4, 0.45),
                        melody: melodyBar(N.G5, N.Bb5, 0.52),
                        drums: drumsCrush(false),
                        pad: padOf([N.Eb3, N.G3, N.Bb3], 0.12, 'sawtooth')
                    },
                    D: {
                        bass: bassBar(N.G2, N.G3),
                        arp: powerChordArp(N.G3, N.D4, N.G4, 0.45),
                        melody: melodyBar(N.Bb4, N.D5, 0.52),
                        drums: drumsCrush(true),
                        pad: padOf([N.G3, N.Bb3, N.D4], 0.12, 'sawtooth')
                    }
                },
                structure: ['A','B','C','D','A','C','B','D']
            }
        },

        // =====================================================================
        // INTERMISSION — "Afterglow" (Amin, 90 BPM)
        // Ambient synthwave interlude. Drumless, melody-less.
        // Am → F → C → G (i-VI-III-VII). Slow pads + bass only.
        // =====================================================================
        INTERMISSION: {
            name: 'Afterglow',
            key: 'Amin',
            bpm: 90,
            sections: {
                // Am (i): A C E
                A: {
                    bass: bassBar(N.A2, N.A3, 'triangle'),
                    arp: powerChordArp(N.A3, N.E4, N.A4, 0.22),
                    melody: melodyBar(null, null),
                    drums: null,
                    pad: padOf([N.A3, N.C4, N.E4], 0.1, 'sine')
                },
                // F (VI): F A C
                B: {
                    bass: bassBar(N.F2, N.F3, 'triangle'),
                    arp: powerChordArp(N.F3, N.C4, N.F4, 0.22),
                    melody: melodyBar(null, null),
                    drums: null,
                    pad: padOf([N.F3, N.A3, N.C4], 0.1, 'sine')
                },
                // C (III): C E G
                C: {
                    bass: bassBar(N.C2, N.C3, 'triangle'),
                    arp: powerChordArp(N.C3, N.G3, N.C4, 0.22),
                    melody: melodyBar(null, null),
                    drums: null,
                    pad: padOf([N.C3, N.E3, N.G3], 0.1, 'sine')
                },
                // G (VII): G B D
                D: {
                    bass: bassBar(N.G2, N.G3, 'triangle'),
                    arp: powerChordArp(N.G3, N.D4, N.G4, 0.22),
                    melody: melodyBar(null, null),
                    drums: null,
                    pad: padOf([N.G3, N.B3, N.D4], 0.1, 'sine')
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
